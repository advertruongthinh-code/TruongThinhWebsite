import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { expandHero, readHeroSources } from "../../scripts/site/hero-slides.mjs";

// page-home R3, detail-pages R5: the three heroes run the same order script (motion.js reruns that text on soft route changes). The pages
// only hold markers; the build embeds src/site/hero-order-inline.js, so one copy exists and it sits right after .hero-slides.
const pages = [["index.html", "home"], ["residential/index.html", "residential"], ["commercial/index.html", "commercial"]];

test("home, residential and commercial source pages hold markers, not hand-written hero code", async () => {
  for (const [page, key] of pages) {
    const html = await readFile(new URL(`../../src/site/${page}`, import.meta.url), "utf8");
    assert.match(html, new RegExp(`<div class="hero-slides"[^>]*>\\s*<!-- hero-slides:${key} -->\\s*</div>\\s*<!-- hero-order -->`), page);
    assert.match(html, new RegExp(`/\\* hero-slides-data:${key} \\*/`), page);
    assert.doesNotMatch(html, /<script type="module">/, `${page}: hand-written order script`);
    assert.doesNotMatch(html, /<figure class="hero-slide/, `${page}: hand-written slide`);
  }
});

test("the three expanded pages embed the same order script right after .hero-slides", async () => {
  const { data, orderScript } = readHeroSources(new URL("../../src/site", import.meta.url).pathname);
  for (const [page] of pages) {
    const html = expandHero(await readFile(new URL(`../../src/site/${page}`, import.meta.url), "utf8"), data, orderScript);
    assert.ok(html.includes(`</div>\n          <script type="module">\n${orderScript}</script>`), page);
    assert.equal(html.split("dataset.heroFirst = first;").length, 2, `${page}: head script must keep dataset.heroFirst = first (CMS Worker)`);
  }
});
