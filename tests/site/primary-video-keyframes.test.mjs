// Video site có keyframe tối đa mỗi 0,5s để lệnh tua chỉ giải mã ít frame (primary-video-player R3).
// CI không có ffprobe nên đọc bảng stss (sample đồng bộ) và stts (thời lượng sample) thẳng từ file MP4.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const assets = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src/site/assets");
const videos = readdirSync(assets, { recursive: true }).filter((file) => file.endsWith(".mp4"));

const boxes = (buffer, start, end) => {
  const list = [];
  for (let at = start; at + 8 <= end;) {
    let size = buffer.readUInt32BE(at);
    let header = 8;
    if (size === 1) [size, header] = [Number(buffer.readBigUInt64BE(at + 8)), 16];
    else if (size === 0) size = end - at;
    list.push({ type: buffer.toString("latin1", at + 4, at + 8), start: at + header, end: at + size });
    at += size;
  }
  return list;
};
const child = (buffer, box, ...types) => types.reduce((parent, type) =>
  parent && boxes(buffer, parent.start, parent.end).find((entry) => entry.type === type), box);

// Thời điểm (giây) của từng keyframe trong track video, thêm điểm cuối clip để clip chỉ một keyframe cũng bị bắt.
function keyframeTimes(buffer) {
  const moov = boxes(buffer, 0, buffer.length).find((box) => box.type === "moov");
  const track = boxes(buffer, moov.start, moov.end).filter((box) => box.type === "trak").find((trak) => {
    const hdlr = child(buffer, trak, "mdia", "hdlr");
    return buffer.toString("latin1", hdlr.start + 8, hdlr.start + 12) === "vide";
  });
  const mdhd = child(buffer, track, "mdia", "mdhd");
  const timescale = buffer.readUInt32BE(mdhd.start + (buffer[mdhd.start] === 1 ? 20 : 12));
  const stbl = child(buffer, track, "mdia", "minf", "stbl");
  const stts = child(buffer, stbl, "stts");
  if (!buffer.readUInt32BE(stts.start + 4)) return fragmentKeyframeTimes(buffer, moov, track, timescale);
  const starts = [];
  let time = 0;
  for (let entry = 0; entry < buffer.readUInt32BE(stts.start + 4); entry += 1) {
    const [count, delta] = [buffer.readUInt32BE(stts.start + 8 + entry * 8), buffer.readUInt32BE(stts.start + 12 + entry * 8)];
    for (let sample = 0; sample < count; sample += 1, time += delta) starts.push(time / timescale);
  }
  const stss = child(buffer, stbl, "stss");
  // Không có stss thì mọi sample đều là keyframe.
  const keys = stss ? Array.from({ length: buffer.readUInt32BE(stss.start + 4) },
    (_, index) => starts[buffer.readUInt32BE(stss.start + 8 + index * 4) - 1]) : starts;
  return [...keys, time / timescale];
}

// fMP4 của thang HLS (video-delivery R1): sample nằm trong từng moof, keyframe là sample tắt cờ non-sync (0x10000).
function fragmentKeyframeTimes(buffer, moov, track, timescale) {
  const tkhd = child(buffer, track, "tkhd");
  const trackId = buffer.readUInt32BE(tkhd.start + (buffer[tkhd.start] === 1 ? 20 : 12));
  const trex = boxes(buffer, child(buffer, moov, "mvex").start, child(buffer, moov, "mvex").end)
    .find((box) => box.type === "trex" && buffer.readUInt32BE(box.start + 4) === trackId);
  const keys = [];
  let time = 0;
  for (const moof of boxes(buffer, 0, buffer.length).filter((box) => box.type === "moof")) {
    const traf = boxes(buffer, moof.start, moof.end)
      .find((box) => box.type === "traf" && buffer.readUInt32BE(child(buffer, box, "tfhd").start + 4) === trackId);
    if (!traf) continue;
    // Trường tùy chọn đọc tuần tự theo cờ; thiếu thì lấy mặc định của tfhd rồi trex.
    let at;
    const read = (present) => { if (!present) return undefined; at += 4; return buffer.readUInt32BE(at - 4); };
    const tfhd = child(buffer, traf, "tfhd");
    const tfhdFlags = buffer.readUInt32BE(tfhd.start) & 0xffffff;
    at = tfhd.start + 8 + (tfhdFlags & 1 ? 8 : 0) + (tfhdFlags & 2 ? 4 : 0);
    const duration = read(tfhdFlags & 8) ?? buffer.readUInt32BE(trex.start + 12);
    read(tfhdFlags & 0x10);
    const flags = read(tfhdFlags & 0x20) ?? buffer.readUInt32BE(trex.start + 20);
    const tfdt = child(buffer, traf, "tfdt");
    time = buffer[tfdt.start] === 1 ? Number(buffer.readBigUInt64BE(tfdt.start + 4)) : buffer.readUInt32BE(tfdt.start + 4);
    for (const trun of boxes(buffer, traf.start, traf.end).filter((box) => box.type === "trun")) {
      const trunFlags = buffer.readUInt32BE(trun.start) & 0xffffff;
      at = trun.start + 8;
      read(trunFlags & 1);
      const firstFlags = read(trunFlags & 4);
      for (let sample = 0; sample < buffer.readUInt32BE(trun.start + 4); sample += 1) {
        const sampleDuration = read(trunFlags & 0x100) ?? duration;
        read(trunFlags & 0x200);
        const sampleFlags = read(trunFlags & 0x400) ?? (sample === 0 && firstFlags !== undefined ? firstFlags : flags);
        read(trunFlags & 0x800);
        if (!(sampleFlags & 0x10000)) keys.push(time / timescale);
        time += sampleDuration;
      }
    }
  }
  return [...keys, time / timescale];
}

test("site videos keep a keyframe at least every 0.5s", () => {
  for (const file of videos) {
    const times = keyframeTimes(readFileSync(path.join(assets, file)));
    const widest = Math.max(...times.slice(1).map((time, index) => time - times[index]));
    assert(widest <= 0.5 + 1e-6, `${file}: keyframe gap ${widest.toFixed(3)}s over ${times.length - 1} keyframes`);
  }
});
