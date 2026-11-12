// Content checks (docs/specs/content-independent-tests.md R2): each rule has one broken fixture that fails exactly that rule.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import { checkSiteContent } from "../../scripts/ci/content-contract.mjs";

const IMAGE = "/assets/content/projects/sample.webp";
const VALID_IMG = `<img src="${IMAGE}" width="40" height="30" alt="Phòng khách" data-en-alt="Living room" />`;

async function site(html, css = "") {
  const root = mkdtempSync(path.join(tmpdir(), "content-contract-"));
  mkdirSync(path.join(root, "assets/content/projects"), { recursive: true });
  await sharp({ create: { width: 40, height: 30, channels: 3, background: "#888" } }).webp().toFile(path.join(root, IMAGE));
  writeFileSync(path.join(root, "index.html"), html);
  writeFileSync(path.join(root, "style.css"), css);
  return root;
}

test("valid content has no errors, including decorative images with empty alt and paths concatenated in scripts", async () => {
  const html = `${VALID_IMG}<img data-src="${IMAGE}" width="40" height="30" alt="" />`
    + "<script>const path = `/assets/content/projects/${name}`;</script>";
  assert.deepEqual(await checkSiteContent(await site(html, `a { background: url("${IMAGE}"); }`)), []);
});

test("each broken rule reports the right file, image and rule", async () => {
  const cases = [
    [`<img src="/assets/content/projects/missing.webp" alt="" />`, "", /index\.html: \/assets\/content\/projects\/missing\.webp: file does not exist/],
    ["", `a { background: url("/assets/content/projects/gone.webp"); }`, /style\.css: \/assets\/content\/projects\/gone\.webp: file does not exist/],
    [VALID_IMG.replace('width="40"', 'width="41"'), "", /sample\.webp: declared 41x30, actual pixels 40x30/],
    [VALID_IMG.replace(' alt="Phòng khách"', ""), "", /sample\.webp: missing alt/],
    [VALID_IMG.replace(' data-en-alt="Living room"', ""), "", /sample\.webp: VI alt present but data-en-alt missing/],
  ];
  for (const [html, css, expected] of cases) {
    const errors = await checkSiteContent(await site(html, css));
    assert.equal(errors.length, 1, `${expected}: ${errors.join(" | ")}`);
    assert.match(errors[0], expected);
  }
});

test("hero-slides.json is validated with the site content", async () => {
  const slide = { id: "sample", src: IMAGE, width: 40, height: 30, altVi: "", altEn: "", focal: { x: 50, y: 50 }, phoneMove: { kind: "zoom-out" } };
  const withHero = async (data) => {
    const root = await site("");
    mkdirSync(path.join(root, "content"));
    writeFileSync(path.join(root, "content/hero-slides.json"), JSON.stringify(data));
    return root;
  };
  assert.deepEqual(await checkSiteContent(await withHero({ home: [slide], residential: [slide], commercial: [slide] })), []);
  const [error] = await checkSiteContent(await withHero({ home: [{ ...slide, width: 41 }], residential: [slide], commercial: [slide] }));
  assert.match(error, /hero-slides\.home\[0\]: width\/height must be 40x30/);
});

test("reports every error, not just the first", async () => {
  const html = VALID_IMG.replace(' data-en-alt="Living room"', "") + `<img src="/assets/content/projects/missing.webp" alt="" />`;
  assert.equal((await checkSiteContent(await site(html))).length, 2);
});
