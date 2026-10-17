#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const site = path.join(root, "src/site");
const manifestPath = path.join(site, "content/client-logos.json");
const logoDirectory = path.join(site, "assets/content/client-logos");
const projectDirectory = path.join(site, "assets/content/projects");
const sharedDirectory = path.join(site, "assets/content/shared");
const html = fs.readFileSync(path.join(site, "index.html"), "utf8");
const css = fs.readFileSync(path.join(site, "style.css"), "utf8");

assert.ok(fs.existsSync(manifestPath), "Missing client logo manifest");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
assert.equal(manifest.length, 12, "Client logo manifest must contain exactly 12 entries");
assert.equal(
  manifest.find((logo) => logo.id === "prudential")?.viewBox,
  "0 0 841.9 396",
  "Prudential manifest must match the replacement vector",
);
assert.equal(
  manifest.find((logo) => logo.id === "ttc-hospitality")?.viewBox,
  "0 0 3679.87 2826.35",
  "TTC Hospitality manifest must match the supplied vector",
);
assert.match(
  css,
  /\.client-logo-image\s*\{[^}]*width:\s*clamp\(8rem,\s*10\.5vw,\s*12rem\);[^}]*height:\s*clamp\(4rem,\s*5\.5vw,\s*6rem\);/s,
  "Client logos must use the approved larger responsive size",
);

const ids = new Set();
const sources = new Set();
for (const [index, logo] of manifest.entries()) {
  assert.match(logo.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `Invalid logo id at index ${index}`);
  assert.ok(logo.name, `Missing client name for ${logo.id}`);
  assert.equal(logo.order, index + 1, `Non-contiguous order for ${logo.id}`);
  assert.match(logo.src, /^\/assets\/content\/client-logos\/[a-z0-9-]+\.svg$/, `Invalid src for ${logo.id}`);
  assert.match(logo.viewBox, /^-?(?:\d+\.?\d*|\.\d+)(?:\s+-?(?:\d+\.?\d*|\.\d+)){3}$/, `Invalid viewBox for ${logo.id}`);
  assert.ok(!ids.has(logo.id), `Duplicate logo id: ${logo.id}`);
  assert.ok(!sources.has(logo.src), `Duplicate logo src: ${logo.src}`);
  ids.add(logo.id);
  sources.add(logo.src);

  const svgPath = path.join(site, logo.src.replace(/^\//, ""));
  assert.ok(fs.existsSync(svgPath), `Missing SVG: ${logo.src}`);
  const svg = fs.readFileSync(svgPath, "utf8");
  assert.match(svg, new RegExp(`<svg[^>]+viewBox=["']${logo.viewBox.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "i"), `viewBox mismatch: ${logo.id}`);
  assert.doesNotMatch(svg, /<(?:text|metadata|script|image|foreignObject|title|desc)\b/i, `Non-geometric element in ${logo.id}`);
  assert.doesNotMatch(svg, /\b(?:sodipodi|inkscape|corel|serif|adobe|xmp|dc):/i, `Editor metadata in ${logo.id}`);
  assert.doesNotMatch(svg, /\b(?:href|xlink:href)=["'](?:https?:|data:|\/\/)/i, `External or embedded reference in ${logo.id}`);
  assert.doesNotMatch(svg, /<style\b/i, `CSS classes must be inlined in ${logo.id}`);
}

const groupMatches = [...html.matchAll(/<div class="client-logo-marquee__group"([^>]*)>([\s\S]*?)<\/div>/g)];
assert.equal(groupMatches.length, 2, "Marquee must contain exactly two groups");
assert.doesNotMatch(groupMatches[0][1], /aria-hidden="true"/, "Primary logo group must remain accessible");
assert.match(groupMatches[1][1], /aria-hidden="true"/, "Clone logo group must be hidden from assistive technology");

const expectedSources = manifest.map((logo) => logo.src);
const expectedNames = manifest.map((logo) => logo.name);
for (const [groupIndex, group] of groupMatches.entries()) {
  const imageTags = [...group[2].matchAll(/<img\b[^>]*>/g)].map((match) => match[0]);
  assert.equal(imageTags.length, 12, `Group ${groupIndex + 1} must contain 12 logos`);
  assert.ok(imageTags.every((tag) => /\bloading="eager"/.test(tag)), `Group ${groupIndex + 1} must preload every moving logo`);
  assert.deepEqual(imageTags.map((tag) => tag.match(/\bsrc="([^"]+)"/)?.[1]), expectedSources, `Logo order differs in group ${groupIndex + 1}`);
  if (groupIndex === 0) {
    assert.deepEqual(imageTags.map((tag) => tag.match(/\balt="([^"]*)"/)?.[1]), expectedNames, "Primary logo names must match the manifest");
  } else {
    assert.ok(imageTags.every((tag) => /\balt=""/.test(tag)), "Clone logos must use empty alt text");
  }
}

assert.doesNotMatch(html, /client-logo-placeholder/, "Logo placeholders must be removed");
assert.ok(fs.existsSync(logoDirectory), "Missing public client logo directory");

// Biến thể responsive -480/-960 là build output của bản gốc, không phải asset riêng.
const filesWithExtension = (directory, extension) =>
  fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && path.extname(entry.name) === extension && !/-(?:480|960)\.[a-z]+$/.test(entry.name))
    .map((entry) => entry.name);

assert.equal(filesWithExtension(projectDirectory, ".webp").length, 73, "Expected 73 project WebP assets");
assert.equal(filesWithExtension(sharedDirectory, ".webp").length, 17, "Expected 17 shared WebP assets");

const legacyDirectory = path.join(site, "assets/site");
const legacyFiles = fs.existsSync(legacyDirectory)
  ? fs.readdirSync(legacyDirectory, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile())
  : [];
assert.equal(legacyFiles.length, 0, "Legacy public asset tree must contain no files");

const textExtensions = new Set([".html", ".css", ".js", ".cjs", ".mjs", ".md", ".json"]);
const currentRoots = [path.join(root, "src/site"), path.join(root, "tests"), path.join(root, "scripts")];
const pending = [...currentRoots];
const oldPublicPrefix = "/assets/" + "site/";
while (pending.length) {
  const current = pending.pop();
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const target = path.join(current, entry.name);
    if (entry.isDirectory()) pending.push(target);
    if (entry.isFile() && textExtensions.has(path.extname(entry.name))) {
      assert.ok(!fs.readFileSync(target, "utf8").includes(oldPublicPrefix), `Legacy asset URL remains in ${path.relative(root, target)}`);
    }
  }
}

console.log("Client logo asset contract passed");
