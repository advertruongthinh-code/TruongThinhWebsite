import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { advertisingFilterRank, compileAdvertisingProductLayout } from "../../src/site/advertising-products/layout-core.mjs";
import { createGlassSurface, playGlassReveal } from "../../src/site/advertising-products/glass-surface.mjs";
import { localeHtml } from "../../scripts/tooling/serve-static-parity.mjs";

test("malformed card URLs fall back without breaking catalog initialization", () => {
  const source = readFileSync(new URL("../../src/site/advertising-products/catalog-runtime.mjs", import.meta.url), "utf8");
  const start = source.indexOf("const ADVERTISING_CARD_PATH_PATTERN");
  const end = source.indexOf("const skeletonNativeContexts", start);
  const photoId = runInNewContext(`${source.slice(start, end)}; advertisingPhotoId`);
  assert.equal(photoId(new URL("https://site.test/vi/advertising-products/p/%E0/")), null);
  assert.equal(photoId(new URL("https://site.test/en/advertising-products/p/card-1/")), "card-1");
  assert.equal(photoId(new URL("https://site.test/vi/advertising-products/?photo=card-2")), "card-2");
});

test("cluster-only filters compile the matching cards", () => {
  const card = { id: "fixture-1", category: "fixture", rank: 0, sourceOrder: 0,
    productIds: ["product"], clusterIds: ["cluster"], media: { src: "/fixture.webp", width: 100, height: 100 } };
  const result = compileAdvertisingProductLayout({ cards: [card], categoryOrder: ["fixture"],
    filter: "cluster", columns: 1, layoutViewportWidth: 390 });
  assert.deepEqual(result.placements.map(({ card }) => card.id), [card.id]);
});

test("product rank takes precedence over a later matching cluster", () => {
  assert.equal(advertisingFilterRank({ productIds: ["p"], clusterIds: ["x", "y", "p"] }, "p"), 0);
  assert.equal(advertisingFilterRank({ productIds: ["x"], clusterIds: ["x", "p"] }, "p"), 1);
});

test("localization preserves authored attributes and literal replacement tokens", () => {
  const html = localeHtml('<html><img data-en-alt="English $&" alt="Vietnamese"><a data-en-href="/about/" href="/residential/">Link</a></html>', "en");
  assert.match(html, /data-en-alt="English \$&"/);
  assert.match(html, /data-vi-alt="Vietnamese"/);
  assert.match(html, /\salt="English \$&"/);
  assert.match(html, /data-en-href="\/about\/"/);
  assert.match(html, /\shref="\/en\/about\/"/);
});

test("all arc band layers become visible during reveal", (t) => {
  const element = () => ({ dataset: {}, style: { setProperty() {} }, children: [],
    className: "", setAttribute() {}, getContext: () => null,
    append(...nodes) { this.children.push(...nodes); },
    get classList() { return { contains: (name) => this.className.split(" ").includes(name) }; },
    animate: (frames) => frames,
  });
  const previousStyle = globalThis.getComputedStyle;
  globalThis.getComputedStyle = () => ({ opacity: "1" });
  t.after(() => { if (previousStyle === undefined) delete globalThis.getComputedStyle; else globalThis.getComputedStyle = previousStyle; });
  const previous = globalThis.document;
  globalThis.document = { createElement: element };
  t.after(() => { if (previous === undefined) delete globalThis.document; else globalThis.document = previous; });
  const glass = createGlassSurface("arc");
  const frames = playGlassReveal(glass, 1400);
  glass.children.forEach((layer, index) => {
    if (layer.classList.contains("glass-surface__step")) {
      assert(Math.max(...frames[index].map(({ opacity }) => opacity)) > 0.99, `layer ${index} must reveal`);
    }
  });
});
