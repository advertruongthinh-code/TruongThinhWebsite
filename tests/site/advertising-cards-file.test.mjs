// Advertising cards read from the content files (cms-plan part 2 K6, task E5): node --test tests/site/advertising-cards-file.test.mjs
// catalog.mjs reads the files when it loads, so every run with another TT_CONTENT_DIR is its own process.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { ADVERTISING_MEDIA_MANIFEST, MERGED_CARD_REDIRECTS } from "../../src/site/advertising-products/media-manifest.mjs";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const content = path.join(projectRoot, "src/site/content");
const ORIGIN = "https://media.test";
const KEY = "a7".repeat(16);

test("media-manifest.mjs gives back the two content files, deeply frozen", () => {
  assert.equal(JSON.stringify(ADVERTISING_MEDIA_MANIFEST), JSON.stringify(JSON.parse(readFileSync(path.join(content, "advertising-cards.json"), "utf8"))));
  assert.deepEqual(MERGED_CARD_REDIRECTS, JSON.parse(readFileSync(path.join(content, "advertising-merged.json"), "utf8")));
  assert.ok(Object.isFrozen(ADVERTISING_MEDIA_MANIFEST[0].mediaItems[0]));
});

test("the CMS contract and browser code do not load the card data modules", () => {
  const files = (dir, keep) => readdirSync(path.join(projectRoot, dir), { recursive: true }).filter(keep).map((name) => path.join(projectRoot, dir, name));
  const hits = (list, pattern) => list.filter((file) => pattern.test(readFileSync(file, "utf8")));
  assert.deepEqual(hits(files("src/cms", (name) => name.endsWith(".mjs")), /from "(\.\/|\.\.\/\.\.\/src\/site\/advertising-products\/)catalog\.mjs"/), []);
  assert.deepEqual(hits(files("src/site", (name) => name.endsWith(".js") || name.endsWith("runtime.mjs")), /media-manifest|catalog\.mjs/), []);
});

// A minimal CMS card: a copy of the first card of its category with one R2 image, appended to that category.
function contentWithNewCard(edit = (card) => card) {
  const dir = mkdtempSync(path.join(tmpdir(), "ad-cards-"));
  cpSync(content, dir, { recursive: true });
  const cards = JSON.parse(readFileSync(path.join(dir, "advertising-cards.json"), "utf8"));
  const base = cards[0];
  const media = { id: "cms-card-1", kind: "image", src: `${ORIGIN}/v/${KEY}/m.webp`, width: base.media.width, height: base.media.height, altVi: "Ảnh thử CMS", altEn: "CMS test photo" };
  const card = edit({ ...structuredClone(base), id: "cms-card-1", titleVi: "Card thử CMS", titleEn: "CMS test card",
    sourceOrder: cards.filter(({ category }) => category === base.category).length,
    media: { src: media.src, width: media.width, height: media.height, altVi: media.altVi, altEn: media.altEn },
    coverMediaId: media.id, mediaItems: [media], mediaDescriptions: undefined });
  writeFileSync(path.join(dir, "advertising-cards.json"), JSON.stringify([...cards, card]));
  const files = ["m.webp", "m.jxl", ...[240, 480, 960].flatMap((width) => [`m-${width}.webp`, `m-${width}.jxl`])].map((name) => ({ name, bytes: 1000 }));
  writeFileSync(path.join(dir, "variants.json"), JSON.stringify({ [KEY]: { key: KEY, width: media.width, height: media.height, files, colors: Array(6).fill("#202020") } }));
  return { dir, product: card.productIds?.[0] };
}
const env = (dir, out) => ({ ...process.env, TT_CONTENT_DIR: dir, TT_SITE_OUT: out, CMS_MEDIA_ORIGIN: ORIGIN });
const chipCount = (dir, product) => Number(execFileSync(process.execPath, ["--input-type=module", "-e",
  `const { ADVERTISING_PRODUCT_CHIPS } = await import("./src/site/advertising-products/catalog.mjs"); console.log(ADVERTISING_PRODUCT_CHIPS.find(({ filter }) => filter === ${JSON.stringify(product)})?.count ?? -1);`],
{ cwd: projectRoot, env: env(dir ?? "", ""), encoding: "utf8" }));

test("a card added to the file gets its page and counts in its product chip", { timeout: 300_000 }, (t) => {
  const { dir, product } = contentWithNewCard();
  const out = mkdtempSync(path.join(projectRoot, ".site-output-r2-"));
  t.after(() => { rmSync(dir, { recursive: true, force: true }); rmSync(out, { recursive: true, force: true }); });
  assert.equal(chipCount(dir, product), chipCount(null, product) + 1);
  const result = spawnSync(process.execPath, ["scripts/site/prepare-static-assets.mjs"], { cwd: projectRoot, env: env(dir, out), encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const page = readFileSync(path.join(out, "advertising-products/p/cms-card-1/index.html"), "utf8");
  assert.ok(page.includes("Card thử CMS"));
  assert.ok(existsSync(path.join(out, "en/advertising-products/p/cms-card-1/index.html")));
});

test("a card without titleVi stops the build naming the card", { timeout: 120_000 }, (t) => {
  const { dir } = contentWithNewCard(({ titleVi: _, ...card }) => card);
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", 'await import("./src/site/advertising-products/catalog.mjs");'], { cwd: projectRoot, env: env(dir, ""), encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /cms-card-1/);
});
