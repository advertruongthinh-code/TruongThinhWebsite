#!/usr/bin/env node

import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(scriptPath), "..");
const outputRoot = path.join(projectRoot, ".site-output");
const publicEntries = [
  "index.html",
  "style.css",
  "motion.js",
  "detail.css",
  "detail.js",
  "products.js",
  "residential",
  "commercial",
  "projects-products",
  "about",
  "assets",
];

if (path.dirname(outputRoot) !== projectRoot) {
  throw new Error("Static output escaped the project root.");
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

for (const entry of publicEntries) {
  await cp(path.join(projectRoot, entry), path.join(outputRoot, entry), {
    recursive: true,
  });
}

console.log(`[prepare-site] copied ${publicEntries.length} entries to .site-output`);
