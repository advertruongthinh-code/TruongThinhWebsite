import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(scriptPath), "..", "..");
const siteRoot = path.join(projectRoot, "src", "site");
const canonicalPath = path.join(siteRoot, "assets", "brand", "truong-thinh-lockup.svg");
const consumers = [
  "index.html",
  "residential/index.html",
  "commercial/index.html",
  "advertising-products/index.html",
  "about/index.html",
  "404.html",
];
const lockupPattern = /<svg class="brand-lockup" viewBox="[^\"]*" aria-hidden="true" data-parity-media>[\s\S]*?<\/svg>/g;
const subtitleEnglishCopy = "INTERIORS · ADVERTISING";

const canonical = await readFile(canonicalPath, "utf8");
const geometry = canonical.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)?.[1];
if (!geometry || (geometry.match(/<path\b/g) || []).length !== 4 || (geometry.match(/<text\b/g) || []).length !== 2) {
  throw new Error("Canonical lockup must contain exactly four paths and two text nodes.");
}
const consumerGeometry = geometry
  .replace(/\s+id="truong-thinh-(?:lockup|mark|title|subtitle)"/g, "")
  .replace(
    'class="brand-lockup__subtitle"',
    `class="brand-lockup__subtitle" data-en="${subtitleEnglishCopy}"`,
  );
if (!consumerGeometry.includes(`data-en="${subtitleEnglishCopy}"`)) {
  throw new Error("Canonical subtitle could not receive required English leaf copy.");
}

let synchronized = 0;
for (const relativePath of consumers) {
  const target = path.join(siteRoot, relativePath);
  const source = await readFile(target, "utf8");
  const matches = [...source.matchAll(lockupPattern)];
  if (matches.length !== 2 || matches.some((match) => !/class="brand-lockup__geometry"/.test(match[0]))) {
    throw new Error(`${relativePath} must contain exactly two recognizable inline brand lockups.`);
  }
  const next = source.replace(lockupPattern, (markup) =>
    markup.replace(/>[\s\S]*<\/svg>$/, `>\n${consumerGeometry}\n</svg>`),
  );
  if ((next.match(lockupPattern) || []).length !== 2) {
    throw new Error(`${relativePath} lockup replacement changed the consumer count.`);
  }
  if (next !== source) await writeFile(target, next, "utf8");
  synchronized += matches.length;
}

if (synchronized !== consumers.length * 2) {
  throw new Error(`Expected ${consumers.length * 2} inline lockups; synchronized ${synchronized}.`);
}

console.log(`[brand-lockup] synchronized ${synchronized} inline consumers from canonical SVG`);
