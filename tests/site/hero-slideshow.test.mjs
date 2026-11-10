import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

// page-home R3, detail-pages R5: the three heroes run the same inline code (motion.js reruns that text on soft route changes), so
// with comments and the slides array stripped, the head script and the shuffle script after .hero-slides must be identical across the three pages.
test("home, residential and commercial share one hero slideshow script", async () => {
  const pages = ["index.html", "residential/index.html", "commercial/index.html"];
  const scripts = await Promise.all(pages.map(async (page) => {
    const html = await readFile(new URL(`../../src/site/${page}`, import.meta.url), "utf8");
    const head = html.match(/const slides = \[[\s\S]*?\]\];([\s\S]*?)<\/script>/)?.[1];
    const shuffle = html.match(/<div class="hero-slides"[\s\S]*?<\/div>\s*<script type="module">([\s\S]*?)<\/script>/)?.[1];
    assert.ok(head && shuffle, `${page}: missing head script or shuffle script`);
    return [head, shuffle].map((code) => code.replace(/^\s*\/\/.*$/gm, "").replace(/\s+/g, " "));
  }));
  assert.deepEqual(scripts[1], scripts[0], pages[1]);
  assert.deepEqual(scripts[2], scripts[0], pages[2]);
});
