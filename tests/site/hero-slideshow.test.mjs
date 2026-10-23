import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

// page-home R3, detail-pages R5: ba hero chạy cùng một code inline (motion.js chạy lại text đó khi route mềm), nên
// bỏ comment và mảng slides thì script head và script xáo sau .hero-slides của ba trang phải giống hệt.
test("home, residential and commercial share one hero slideshow script", async () => {
  const pages = ["index.html", "residential/index.html", "commercial/index.html"];
  const scripts = await Promise.all(pages.map(async (page) => {
    const html = await readFile(new URL(`../../src/site/${page}`, import.meta.url), "utf8");
    const head = html.match(/const slides = \[[\s\S]*?\]\];([\s\S]*?)<\/script>/)?.[1];
    const shuffle = html.match(/<div class="hero-slides"[\s\S]*?<\/div>\s*<script type="module">([\s\S]*?)<\/script>/)?.[1];
    assert.ok(head && shuffle, `${page}: thiếu script head hoặc script xáo`);
    return [head, shuffle].map((code) => code.replace(/^\s*\/\/.*$/gm, "").replace(/\s+/g, " "));
  }));
  assert.deepEqual(scripts[1], scripts[0], pages[1]);
  assert.deepEqual(scripts[2], scripts[0], pages[2]);
});
