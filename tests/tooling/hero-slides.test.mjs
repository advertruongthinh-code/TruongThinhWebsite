// Hero slide data (page-home R3, detail-pages R5): one rule per validator branch, and the generated markup keeps the contract the CMS Worker relies on.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import { expandHero, validateHeroSlides } from "../../scripts/site/hero-slides.mjs";

const SRC = "/assets/content/projects/sample.webp";
const slide = { id: "sample", src: SRC, width: 40, height: 30, altVi: "", altEn: "", focal: { x: 14, y: 50 }, phoneMove: { kind: "zoom-out" } };
const dataOf = (...slides) => ({ home: slides, residential: [slide], commercial: [slide] });

async function root() {
  const dir = mkdtempSync(path.join(tmpdir(), "hero-slides-"));
  mkdirSync(path.join(dir, "assets/content/projects"), { recursive: true });
  await sharp({ create: { width: 40, height: 30, channels: 3, background: "#888" } }).webp().toFile(path.join(dir, SRC));
  return dir;
}

test("valid data passes, including a decorative slide with empty alt and a horizontal pan", async () => {
  const pan = { ...slide, id: "pan", phoneMove: { kind: "pan", from: { x: 0, y: 50 }, to: { x: 100, y: 50 } } };
  await validateHeroSlides(dataOf(slide, pan), await root());
});

test("each broken rule reports its slide and rule", async () => {
  const dir = await root();
  const cases = [
    [{ ...slide, id: "Bad@Id" }, /id must be kebab-case/],
    [{ ...slide, altVi: "Phòng khách" }, /altVi and altEn must both be empty or both set/],
    [{ ...slide, focal: { x: 120, y: 50 } }, /focal x and y must be 0-100/],
    [{ ...slide, phoneMove: { kind: "spin" } }, /phoneMove\.kind must be zoom-out or pan/],
    [{ ...slide, phoneMove: { kind: "pan", from: { x: 0, y: 0 }, to: { x: 10, y: 10 } } }, /pan must be horizontal or vertical/],
    [{ ...slide, width: 41 }, /width\/height must be 40x30/],
  ];
  for (const [bad, expected] of cases) {
    await assert.rejects(validateHeroSlides(dataOf(bad), dir), expected);
  }
  await assert.rejects(validateHeroSlides(dataOf(slide, slide), dir), /duplicate id sample/);
});

test("expandHero writes the figures, the head array and the order script the CMS Worker expects", () => {
  const page = '<script>const slides = /* hero-slides-data:home */;</script><div class="hero-slides"><!-- hero-slides:home --></div><!-- hero-order -->';
  const second = { ...slide, id: "two", src: "/assets/content/projects/two.webp", altVi: "Hai", altEn: "Two" };
  const html = expandHero(page, dataOf(slide, second), "run();\n");
  assert.match(html, /const slides = \[\["sample", 40\], \["two", 40\]\];/);
  assert.match(html, /<figure class="hero-slide is-active" data-slide="0" data-hero-move="zoom-out" style="--hero-focal-x: 14%; --hero-focal-y: 50%">/);
  assert.match(html, /<figure class="hero-slide" data-slide="1" /);
  assert.match(html, /alt="Hai" data-en-alt="Two"/);
  assert.doesNotMatch(html.split("two.webp")[0], /data-en-alt/);
  assert.match(html, /<\/div><script type="module">\nrun\(\);\n<\/script>$/);
});
