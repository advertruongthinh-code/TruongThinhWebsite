#!/usr/bin/env node

import { cp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(scriptPath), "..", "..");
const sourceRoot = path.join(projectRoot, "src", "site");
const outputRoot = path.join(projectRoot, ".site-output");

if (path.dirname(outputRoot) !== projectRoot || path.dirname(sourceRoot) !== path.join(projectRoot, "src")) {
  throw new Error("Static source or output escaped the project root.");
}

await rm(outputRoot, { recursive: true, force: true });
await cp(sourceRoot, outputRoot, { recursive: true });

const decodeHtmlText = (value) =>
  value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, "\u00a0")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

const escapeAttribute = (value) =>
  value.replace(/[&"<>]/g, (character) =>
    ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[
      character
    ],
  );

const embedVietnameseText = (html, filePath) => {
  const voidElements = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
  ]);
  const stack = [];
  const insertions = [];
  let candidates = 0;
  let covered = 0;
  const tagPattern = /<!--[\s\S]*?-->|<![^>]*>|<\/?[a-z][^>]*>/gi;
  let match;
  while ((match = tagPattern.exec(html))) {
    const token = match[0];
    if (token.startsWith("<!--") || token.startsWith("<!")) continue;
    const closing = /^<\//.test(token);
    const name = token.match(/^<\/?([a-z][\w:-]*)/i)?.[1].toLowerCase();
    if (!name) continue;
    if (closing) {
      const index = stack.findLastIndex((entry) => entry.name === name);
      if (index < 0) continue;
      const [entry] = stack.splice(index, 1);
      if (!entry.needsVietnamese) continue;
      const content = html.slice(entry.contentStart, match.index);
      const vietnamese = decodeHtmlText(content).replace(/\s+/g, " ").trim();
      insertions.push({
        at: entry.tagEnd - 1,
        value: ` data-vi="${escapeAttribute(vietnamese)}"`,
      });
      covered += 1;
      continue;
    }
    const hasEnglish = /\bdata-en=(?:"[^"]*"|'[^']*')/i.test(token);
    const hasVietnamese = /\bdata-vi=(?:"[^"]*"|'[^']*')/i.test(token);
    if (hasEnglish) {
      candidates += 1;
      if (hasVietnamese) covered += 1;
    }
    if (!/\/$/.test(token.slice(0, -1).trim()) && !voidElements.has(name)) {
      stack.push({
        contentStart: tagPattern.lastIndex,
        name,
        needsVietnamese: hasEnglish && !hasVietnamese,
        tagEnd: tagPattern.lastIndex,
      });
    }
  }
  if (covered !== candidates) {
    throw new Error(
      `${filePath}: embedded ${covered} Vietnamese values for ${candidates} English text values.`,
    );
  }
  let output = html;
  insertions
    .sort((left, right) => right.at - left.at)
    .forEach(({ at, value }) => {
      output = `${output.slice(0, at)}${value}${output.slice(at)}`;
    });
  return output;
};

const localizeHtmlOutput = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return localizeHtmlOutput(target);
      if (!entry.isFile() || path.extname(entry.name) !== ".html") return;
      const html = await readFile(target, "utf8");
      await writeFile(target, embedVietnameseText(html, target), "utf8");
    }),
  );
};

await localizeHtmlOutput(outputRoot);

console.log("[prepare-site] copied src/site and embedded bilingual runtime text");
