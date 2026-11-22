// The CTA block is the last section of main, right above the footer (owner 2026-11-22): home, Residential, Commercial, the
// projects index and every project page. node --test tests/site/cta-last.test.mjs (after pnpm prepare:site).
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { loadBlockContent } from "../../scripts/site/block-pages.mjs";

const CTA = /^<section\b[^>]*\bclass="[^"]*\b(legacy-closer|detail-cta|blk-contact)\b/;
const lastSection = (html) => {
  const main = html.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? "";
  return [...main.matchAll(/<section\b[^>]*>/g)].at(-1)?.[0] ?? "";
};

test("the CTA block closes main on every page that has one", async () => {
  const { projects } = loadBlockContent(fileURLToPath(new URL("../../src/site/", import.meta.url)));
  const files = ["index.html", "residential/index.html", "commercial/index.html", "projects/index.html", ...projects.map((project) => `projects/${project.id}/index.html`)];
  for (const file of files) {
    const html = await readFile(new URL(`../../.site-output/${file}`, import.meta.url), "utf8");
    assert.match(lastSection(html), CTA, `${file}: the last section of main must be the CTA`);
  }
});
