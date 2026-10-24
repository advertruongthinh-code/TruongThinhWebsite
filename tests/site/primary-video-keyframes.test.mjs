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

test("site videos keep a keyframe at least every 0.5s", () => {
  for (const file of videos) {
    const times = keyframeTimes(readFileSync(path.join(assets, file)));
    const widest = Math.max(...times.slice(1).map((time, index) => time - times[index]));
    assert(widest <= 0.5 + 1e-6, `${file}: keyframe gap ${widest.toFixed(3)}s over ${times.length - 1} keyframes`);
  }
});
