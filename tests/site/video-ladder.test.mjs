// Thang chất lượng HLS commit trong assets (video-delivery R1, R2): thứ tự bậc, segment 2 s, byte range khớp file và
// bitrate khai báo tính từ byte thật. CI không có ffmpeg nên kiểm file do scripts/site/build-video-ladder.mjs sinh ra.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const assets = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src/site/assets");
const masters = readdirSync(assets, { recursive: true }).filter((file) => path.basename(file) === "master.m3u8");

test("video ladders list 960 first then ascending tiers, with bitrates from real segment bytes", () => {
  assert.ok(masters.length, "at least one ladder is committed");
  for (const master of masters) {
    const variants = [...readFileSync(path.join(assets, master), "utf8").matchAll(/#EXT-X-STREAM-INF:(.+)\n(\d+)\.m3u8/g)]
      .map(([, attributes, width]) => ({ width: Number(width), ...Object.fromEntries(attributes.match(/[A-Z-]+=("[^"]*"|[^,]*)/g)
        .map((pair) => pair.split(/=(.*)/s).slice(0, 2))) }));
    const widths = variants.map(({ width }) => width);
    const top = widths.includes(960) ? 960 : Math.max(...widths);
    assert.deepEqual(widths, [top, ...widths.filter((width) => width !== top).sort((a, b) => a - b)], `${master}: tier order`);
    for (const variant of variants) {
      const label = `${master} ${variant.width}`;
      const playlist = readFileSync(path.join(assets, path.dirname(master), `${variant.width}.m3u8`), "utf8");
      const init = playlist.match(/#EXT-X-MAP:URI="(\d+)\.mp4",BYTERANGE="(\d+)@0"/);
      const segments = [...playlist.matchAll(/#EXTINF:([\d.]+),\s*#EXT-X-BYTERANGE:(\d+)@(\d+)\s*(\S+)/g)]
        .map(([, seconds, length, offset, uri]) => ({ seconds: Number(seconds), length: Number(length), offset: Number(offset), uri }));
      assert.ok(init && Number(init[1]) === variant.width && variant.RESOLUTION.startsWith(`${variant.width}x`), `${label}: tier file and width`);
      assert.match(variant.CODECS, /^"avc1\.64/, `${label}: H.264 High`);
      segments.forEach(({ seconds, offset, uri }, index) => {
        assert.ok(index === segments.length - 1 ? seconds < 2.05 : Math.abs(seconds - 2) < 0.05, `${label}: segment ${index} is 2 s`);
        assert.equal(offset, index ? segments[index - 1].offset + segments[index - 1].length : Number(init[2]), `${label}: segment ${index} follows the last`);
        assert.equal(uri, `${variant.width}.mp4`, `${label}: one file per tier`);
      });
      const last = segments.at(-1);
      assert.equal(last.offset + last.length, statSync(path.join(assets, path.dirname(master), `${variant.width}.mp4`)).size, `${label}: playlist covers the file`);
      const peak = Math.ceil(Math.max(...segments.map(({ seconds, length }) => length * 8 / seconds)));
      const average = Math.ceil(segments.reduce((sum, { length }) => sum + length * 8, 0) / segments.reduce((sum, { seconds }) => sum + seconds, 0));
      assert.deepEqual([Number(variant.BANDWIDTH), Number(variant["AVERAGE-BANDWIDTH"])], [peak, average], `${label}: bitrates from segment bytes`);
    }
  }
});
