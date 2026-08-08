#!/usr/bin/env node

import { cp, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(scriptPath), "..");
const sourceRoot = path.join(projectRoot, "src", "site");
const outputRoot = path.join(projectRoot, ".site-output");

if (path.dirname(outputRoot) !== projectRoot || path.dirname(sourceRoot) !== path.join(projectRoot, "src")) {
  throw new Error("Static source or output escaped the project root.");
}

await rm(outputRoot, { recursive: true, force: true });
await cp(sourceRoot, outputRoot, { recursive: true });

console.log("[prepare-site] copied src/site to .site-output");
