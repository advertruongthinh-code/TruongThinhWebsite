// Rail công trình trang chủ (page-home R8): validate dữ liệu và markup sinh ra.
// Chạy sau pnpm prepare:site: node --test tests/site/project-reel.test.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { renderProjectReel } from "../../scripts/site/project-reel.mjs";

const siteRoot = fileURLToPath(new URL("../../src/site/", import.meta.url));
const items = JSON.parse(await readFile(new URL("../../src/site/content/project-reel.json", import.meta.url), "utf8"));
const invalid = (mutate) => {
  const copy = structuredClone(items);
  mutate(copy);
  return renderProjectReel(copy, siteRoot);
};

test("rejects missing fields, missing images, wrong size, duplicate id and count outside 3-6", async () => {
  await assert.rejects(invalid((copy) => delete copy[0].captionEn), /project-reel\[0\]: missing captionEn/);
  await assert.rejects(invalid((copy) => { copy[1].altVi = " "; }), /project-reel\[1\]: missing altVi/);
  await assert.rejects(invalid((copy) => { copy[2].src = "/assets/content/projects/khong-co.webp"; }), /image not found/);
  await assert.rejects(invalid((copy) => { copy[2].src = "/assets/content/../index.webp"; }), /src must be/);
  await assert.rejects(invalid((copy) => { copy[0].width = 1000; }), /width\/height must be 1122x1402/);
  await assert.rejects(invalid((copy) => { copy[3].id = copy[0].id; }), /duplicate id cnc-cabinet-parts/);
  await assert.rejects(invalid((copy) => { copy[3].order = copy[0].order; }), /duplicate order 1/);
  await assert.rejects(invalid((copy) => { copy[0].variant = "tall"; }), /variant must be high, mid, low/);
  await assert.rejects(invalid((copy) => copy.splice(2)), /need 3-6 items, got 2/);
  await assert.rejects(invalid((copy) => copy.push({ ...copy[0], id: "seventh", order: 7 })), /need 3-6 items, got 7/);
});

test("renders cards in order with escaped VI/EN text", async () => {
  const shuffled = structuredClone(items).reverse();
  shuffled[0].captionVi = "A & <b>";
  const html = await renderProjectReel(shuffled, siteRoot);
  assert.equal(html.match(/<figure class="project-card project-card--(?:high|mid|low)">/g).length, items.length);
  assert.ok(html.indexOf("workshop-wide-x2.webp") < html.indexOf("home-commercial-fnb-v2.webp"));
  assert.match(html, /<figcaption data-en="Commercial \/ Shophouse café">A &amp; &lt;b&gt;<\/figcaption>/);
});

test("built home page has one card, image, alt pair and caption pair per data item", async () => {
  for (const route of ["vi", "en"]) {
    const html = await readFile(new URL(`../../.site-output/${route}/index.html`, import.meta.url), "utf8");
    const track = html.match(/<div\s+class="project-track"[\s\S]*?<\/div>/)[0];
    assert.doesNotMatch(html, /project-reel-cards/);
    assert.equal(track.match(/<figure class="project-card /g).length, items.length, route);
    for (const item of items) {
      const caption = route === "en" ? item.captionEn : item.captionVi;
      assert.ok(track.includes(`src="${item.src}" width="${item.width}" height="${item.height}"`), `${route} ${item.id} image`);
      assert.ok(track.includes(`data-en-alt="${item.altEn}"`), `${route} ${item.id} alt`);
      assert.ok(track.includes(`>${caption}</figcaption>`), `${route} ${item.id} caption`);
    }
  }
});
