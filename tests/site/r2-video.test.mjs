// R2 video in a media-single block (cms-plan part 2 K5, task E4): node --test tests/site/r2-video.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

const siteRoot = fileURLToPath(new URL("../../src/site/", import.meta.url));
const fixture = fileURLToPath(new URL("./fixtures/r2-content", import.meta.url));

test("the fixture page renders its R2 video with absolute src and poster", async () => {
  process.env.TT_CONTENT_DIR = fixture;
  process.env.CMS_MEDIA_ORIGIN = "https://media.test";
  try {
    const { loadBlockContent, fileImageCheck } = await import("../../scripts/site/content-files.mjs");
    const { renderBlocks, validateBlockPage } = await import("../../scripts/site/blocks.mjs");
    const { news, projects } = loadBlockContent(siteRoot);
    const page = news.find(({ blocks }) => blocks.some((block) => block.video?.hlsSrc));
    const ctx = { projects: new Map(projects.map((item) => [item.id, item])), news: new Map(news.map((item) => [item.id, item])), clusters: [], projectTypes: [], contact: null };
    const html = renderBlocks(page, ctx);
    const key = "e5".repeat(16);
    assert.match(html, new RegExp(`<video src="https://media\\.test/v/${key}/960\\.mp4" poster="https://media\\.test/v/${"f6".repeat(16)}/m-poster\\.webp" width="1920" height="1080"`));
    const errors = await validateBlockPage(page, { checkImage: fileImageCheck(siteRoot), projects: ctx.projects, news: ctx.news, en: "optional" });
    assert.ok(!errors.some((error) => error.includes(".video")), errors.join("\n"));
  } finally {
    delete process.env.TT_CONTENT_DIR;
    delete process.env.CMS_MEDIA_ORIGIN;
  }
});
