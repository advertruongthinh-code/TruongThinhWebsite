// Disk memo for buildLayoutCache: the build takes about 15 s per grid and repeats on every local qa:suite run, so the
// result is kept under node_modules/.cache, keyed by the cards, the filters and the sources that decide the layout.
// CI always builds fresh (a clean checkout has no memo anyway, and a stale hit there would hide a packer regression).
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildLayoutCache } from "../../src/site/masonry/packer.mjs";
import { projectRoot, siteRoot } from "./lib.mjs";

const masonryRoot = path.join(siteRoot, "masonry");
const SOURCES = ["packer.mjs", "replay.mjs", "layout.mjs", "random-order.mjs"];
const memoDir = path.join(projectRoot, "node_modules", ".cache", "layout-cache");

export const layoutCacheMemoKey = ({ cards, filters, datasetVersion }) => {
  const hash = createHash("sha256");
  for (const name of SOURCES) hash.update(readFileSync(path.join(masonryRoot, name)));
  hash.update(JSON.stringify({ cards, filters, datasetVersion }));
  return hash.digest("hex").slice(0, 32);
};

export function buildLayoutCacheMemo(args, { enabled = !process.env.CI, dir = memoDir } = {}) {
  if (!enabled) return buildLayoutCache(args);
  const file = path.join(dir, `${layoutCacheMemoKey(args)}.json`);
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    // No memo yet, or an unreadable one: build and rewrite it.
  }
  const cache = buildLayoutCache(args);
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, JSON.stringify(cache));
  return cache;
}
