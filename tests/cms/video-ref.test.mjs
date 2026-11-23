// R2 video rungs (cms-plan part 2 K5, task E4): node --test tests/cms/video-ref.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { resolveVideoRungs, videoRung } from "../../scripts/site/media-src.mjs";

const KEY = "e5".repeat(16);
const DIR = `https://media.test/v/${KEY}/`;
const variants = { [KEY]: { kind: "video", rungs: [240, 480, 960, 1920], hasAudio: true } };

test("videoRung: largest rung not above the limit, else the smallest", () => {
  assert.equal(videoRung([240, 480, 960, 1920], 960), 960);
  assert.equal(videoRung([240, 480], 960), 480);
  assert.equal(videoRung([1920], 480), 1920);
});

test("resolveVideoRungs overrides src and cardSrc from the manifest, not what the client sent", () => {
  const card = { kind: "video", hlsSrc: `${DIR}master.m3u8`, src: "https://evil.test/x.mp4", cardSrc: "/x.mp4", posterSrc: `${DIR}p.webp`, width: 1920, height: 1080 };
  const block = { video: { hlsSrc: `${DIR}master.m3u8`, poster: `${DIR}p.webp`, width: 640, height: 360 } };
  resolveVideoRungs({ cards: [{ mediaItems: [card] }], news: [{ blocks: [block] }] }, variants);
  assert.equal(card.src, `${DIR}960.mp4`);
  assert.equal(card.cardSrc, `${DIR}480.mp4`);
  assert.equal(card.hasAudio, true);
  assert.equal(block.video.src, `${DIR}480.mp4`, "640 wide: the 480 rung");
  assert.equal(block.video.cardSrc, undefined, "a block video has no card file");
});

test("a video or its R2 poster without a manifest stops the build naming the key; repo videos are left alone", () => {
  assert.throws(() => resolveVideoRungs([{ hlsSrc: `${DIR}master.m3u8`, width: 10 }], {}), new RegExp(`no video manifest for key ${KEY}`));
  const poster = `https://media.test/v/${"99".repeat(16)}/p.webp`;
  assert.throws(() => resolveVideoRungs([{ hlsSrc: `${DIR}master.m3u8`, poster, width: 10 }], variants), /no manifest for key 9999/);
  const repo = { hlsSrc: "/assets/content/videos/a/master.m3u8", src: "/assets/content/videos/a/960.mp4", width: 1920 };
  resolveVideoRungs([repo], {});
  assert.equal(repo.src, "/assets/content/videos/a/960.mp4");
});
