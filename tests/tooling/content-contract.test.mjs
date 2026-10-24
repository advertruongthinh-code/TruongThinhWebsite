// Bộ kiểm nội dung (docs/specs/content-independent-tests.md R2): mỗi luật có một dữ liệu hỏng làm đỏ đúng luật.
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

test("nội dung đúng luật không có lỗi, kể cả ảnh trang trí alt rỗng và đường dẫn ghép trong script", async () => {
  const html = `${VALID_IMG}<img data-src="${IMAGE}" width="40" height="30" alt="" />`
    + "<script>const path = `/assets/content/projects/${name}`;</script>";
  assert.deepEqual(await checkSiteContent(await site(html, `a { background: url("${IMAGE}"); }`)), []);
});

test("mỗi luật hỏng báo đúng file, ảnh và luật", async () => {
  const cases = [
    [`<img src="/assets/content/projects/missing.webp" alt="" />`, "", /index\.html: \/assets\/content\/projects\/missing\.webp: file không tồn tại/],
    ["", `a { background: url("/assets/content/projects/gone.webp"); }`, /style\.css: \/assets\/content\/projects\/gone\.webp: file không tồn tại/],
    [VALID_IMG.replace('width="40"', 'width="41"'), "", /sample\.webp: khai 41x30, pixel thật 40x30/],
    [VALID_IMG.replace(' alt="Phòng khách"', ""), "", /sample\.webp: thiếu alt/],
    [VALID_IMG.replace(' data-en-alt="Living room"', ""), "", /sample\.webp: alt VI có nhưng thiếu data-en-alt/],
  ];
  for (const [html, css, expected] of cases) {
    const errors = await checkSiteContent(await site(html, css));
    assert.equal(errors.length, 1, `${expected}: ${errors.join(" | ")}`);
    assert.match(errors[0], expected);
  }
});

test("hero: mảng slides khớp figure.hero-slide theo tên, độ rộng, thứ tự; data-slide liên tục", async () => {
  const figure = (index, width = 40, active = "") => `<figure class="hero-slide${active}" data-slide="${index}">
    <img data-src="${IMAGE}" width="${width}" height="30" alt="" /></figure>`;
  const page = (slides, figures) => `<script>const slides = ${slides};</script><div class="hero-slides">${figures}</div>`;
  const good = page('[["sample",40],["sample",40]]', figure(0, 40, " is-active") + figure(1));
  assert.deepEqual(await checkSiteContent(await site(good)), []);
  const cases = [
    [page('[["sample",40]]', figure(0) + figure(1)), /mảng slides \[sample 40\] khác figure\.hero-slide \[sample 40, sample 40\]/],
    [page('[["sample",40],["other",40]]', figure(0) + figure(1)), /khác figure\.hero-slide/],
    [page('[["sample",40],["sample",40]]', figure(0) + figure(2)), /hero-slide thứ 1 có data-slide="2"/],
  ];
  for (const [html, expected] of cases) {
    const errors = await checkSiteContent(await site(html));
    assert.equal(errors.length, 1, `${expected}: ${errors.join(" | ")}`);
    assert.match(errors[0], expected);
  }
});

test("báo mọi lỗi, không dừng ở lỗi đầu", async () => {
  const html = VALID_IMG.replace(' data-en-alt="Living room"', "") + `<img src="/assets/content/projects/missing.webp" alt="" />`;
  assert.equal((await checkSiteContent(await site(html))).length, 2);
});
