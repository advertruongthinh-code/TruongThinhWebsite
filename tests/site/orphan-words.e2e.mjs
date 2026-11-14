// hero-typography R7: no text block inside <main> ends on a line holding a single word, and no page scrolls sideways
// because of the tied words. One page per template, VI and EN, 384 to 1920.
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const origin = process.env.BASE_URL || "http://127.0.0.1:8787";
const widths = (process.env.ORPHAN_WIDTHS || "384,390,768,1024,1280,1440,1920").split(",").map(Number);
const routes = [
  "/vi/", "/en/",
  "/vi/residential/", "/en/residential/",
  "/vi/commercial/", "/en/commercial/",
  "/vi/about/", "/en/about/",
  "/vi/advertising-products/", "/en/advertising-products/",
  "/vi/projects/", "/en/projects/",
  "/vi/projects/nha-pho-japandi-san-vuon-truoc/", "/en/projects/japandi-townhouse-front-garden/",
  "/vi/projects/can-ho-2pn-be-am/", "/en/projects/warm-beige-two-bedroom-apartment/",
  "/vi/news/", "/en/news/",
  "/en/news/planning-a-built-in-wardrobe/",
];

// Groups words by their nearest block ancestor; a word's line is where its last fragment sits, so a hyphenated word
// split across two lines counts on the line that holds its end.
const scan = () => {
  const main = document.querySelector("main") || document.body;
  const groups = new Map();
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.data.trim()) continue;
    let block = node.parentElement;
    while (block && block !== main && ["inline", "contents"].includes(getComputedStyle(block).display)) block = block.parentElement;
    if (!block || block.closest(".sr-only, [aria-hidden=true], script, style, noscript")) continue;
    if (!groups.has(block)) groups.set(block, []);
    groups.get(block).push(node);
  }
  const found = [];
  const tooWide = [];
  for (const [block, nodes] of groups) {
    if (block.getBoundingClientRect().width < 2 || getComputedStyle(block).visibility === "hidden") continue;
    const words = [];
    for (const node of nodes) for (const match of node.data.matchAll(/[^\s ]+/g)) {
      if (!/[\p{L}\p{N}]/u.test(match[0])) continue;
      const range = document.createRange();
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      const rect = [...range.getClientRects()].filter((item) => item.width > 0).at(-1);
      if (rect) words.push({ word: match[0], top: rect.top, height: rect.height });
    }
    if (words.length < 2) continue;
    const lines = [];
    for (const word of words) {
      const line = lines.find((item) => Math.abs(item.top - word.top) < Math.max(item.height, word.height) / 2);
      if (line) line.words.push(word.word);
      else lines.push({ top: word.top, height: word.height, words: [word.word] });
    }
    lines.sort((a, b) => a.top - b.top);
    if (lines.length < 2 || lines.at(-1).words.length > 1) continue;
    // Two words wider than the column cannot share a line at this type size: a layout limit, reported apart.
    const probe = document.createElement("span");
    probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap";
    probe.textContent = words.slice(-2).map((item) => item.word).join(" ");
    block.append(probe);
    const fits = probe.getBoundingClientRect().width <= block.clientWidth;
    probe.remove();
    const label = `${block.tagName.toLowerCase()}.${[...block.classList].join(".")} "${block.textContent.replace(/\s+/g, " ").trim().slice(0, 60)}"`;
    (fits ? found : tooWide).push(label);
  }
  return { found, tooWide, overflow: document.documentElement.scrollWidth - window.innerWidth };
};

const browser = await chromium.launch();
const failures = [];
const limits = [];
try {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(origin + route, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      const { found, tooWide, overflow } = await page.evaluate(scan);
      for (const item of found) failures.push(`${width} ${route}: one word on the last line of ${item}`);
      for (const item of tooWide) limits.push(`${width} ${route}: ${item}`);
      if (overflow > 1) failures.push(`${width} ${route}: page scrolls sideways by ${overflow}px`);
    }
  }
} finally {
  await browser.close();
}
assert.deepEqual(failures, [], failures.join("\n"));
if (limits.length) console.log(`orphan-words: last two words wider than the column (type size, not wrapping):\n${limits.join("\n")}`);
console.log(`orphan-words: PASS (${routes.length} routes x ${widths.length} widths)`);
