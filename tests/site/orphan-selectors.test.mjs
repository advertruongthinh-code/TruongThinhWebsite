// Fails when a src/site CSS selector or JS query names a class or data-* attribute
// that no markup, generator or script produces. Run: node --test tests/site/orphan-selectors.test.mjs
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const repo = path.resolve(import.meta.dirname, "../..");
const ALLOWED = new Set([
  // Created at runtime by vendor libraries (Locomotive Scroll, Swiper).
  "c-scrollbar", "swiper-pagination", "swiper-pagination-bullet", "swiper-pagination-bullet-active",
  // Unused Swiper carousel kept by the owner for a Residential/Commercial redesign (docs/specs/detail-pages.md, Gate).
  "advertising-detail__carousel", "advertising-detail__carousel-track", "advertising-detail__carousel-slide",
  "advertising-detail__carousel-pagination", "data-advertising-carousel", "data-advertising-carousel-viewport",
  "data-advertising-carousel-pagination",
]);

const read = (dir, filter) => readdirSync(path.join(repo, dir), { recursive: true })
  .filter((file) => filter.test(file) && !file.startsWith("assets"))
  .map((file) => ({ file: path.join(dir, file), text: readFileSync(path.join(repo, dir, file), "utf8") }));
const site = read("src/site", /\.(css|html|js|mjs|json)$/);
const generators = read("scripts/site", /\.mjs$/);

const SELECTOR_CALL = /\b(?:querySelector(?:All)?|closest|matches)\(\s*(["'`])((?:(?!\1)[^\\]|\\.)*)\1/g;
const namesIn = (selector) => [
  ...[...selector.replace(/\[[^\]]*\]|"[^"]*"|'[^']*'/g, "").matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]),
  ...[...selector.matchAll(/\[\s*(data-[\w-]+)/g)].map((m) => m[1]),
];

const uses = site.flatMap(({ file, text }) => file.endsWith(".css")
  ? [...text.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{};]+)\{/g)]
    .filter((m) => !m[1].trim().startsWith("@"))
    .flatMap((m) => namesIn(m[1]).map((name) => ({ name, file })))
  : [...text.matchAll(SELECTOR_CALL)].flatMap((m) => namesIn(m[2]).map((name) => ({ name, file }))));

// Producers: everything except CSS, with selector queries and classList.contains removed.
const producers = [...site.filter(({ file }) => !file.endsWith(".css")), ...generators]
  .map(({ text }) => text.replace(SELECTOR_CALL, "").replace(/classList\.contains\([^)]*\)/g, ""))
  .join("\n");
const produced = (name) => {
  if (new RegExp(`(?<![\\w-])${name}(?![\\w-])`).test(producers)) return true;
  if (!name.startsWith("data-")) return false;
  const key = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  return new RegExp(`dataset(?:\\.${key}\\b|\\[["']${key}["']\\])`).test(producers);
};

test("every src/site selector has a producer", () => {
  const orphans = [...new Set(uses
    .filter(({ name }) => !ALLOWED.has(name) && !produced(name))
    .map(({ file, name }) => `${file}: ${name}`))].sort();
  assert.deepEqual(orphans, [], "Selectors with no HTML/JS producer; delete them or, if truly dynamic, add to ALLOWED:\n" + orphans.join("\n"));
});

test("ALLOWED has no stale entries", () => {
  const used = new Set(uses.map(({ name }) => name));
  assert.deepEqual([...ALLOWED].filter((name) => !used.has(name) || produced(name)), []);
});
