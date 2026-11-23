// Pure content modules (cms R7, cms-content R1): the admin Worker and the browser bundle the same validators and renderers
// as the build, so none of them may pull in a Node built-in.
import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const ENTRIES = [
  "scripts/site/blocks.mjs",
  "scripts/site/block-pages.mjs",
  "scripts/site/hero-slides.mjs",
  "scripts/site/media-src.mjs",
  "scripts/site/slots.mjs",
  "scripts/site/home-projects.mjs",
  "src/site/advertising-products/media-contract.mjs",
  "src/cms/layouts.mjs",
  "src/cms/media-ref.mjs",
  "src/cms/contract.mjs",
  "src/cms/projection.mjs",
  "src/cms/inline-marks.mjs",
  "src/cms/links.mjs",
];

for (const entry of ENTRIES) {
  test(`${entry} bundles for the browser without node: imports`, async () => {
    const { outputFiles } = await build({ entryPoints: [entry], bundle: true, write: false, platform: "browser", format: "esm", logLevel: "silent" });
    assert.ok(!outputFiles[0].text.includes("node:"), `${entry} pulls in a Node built-in`);
    // The Worker bundles the contract: the 733 KB Advertising card manifest must stay out (cms-plan A5).
    if (entry === "src/cms/contract.mjs") assert.ok(!outputFiles[0].text.includes("media-manifest"), "contract.mjs pulls in the card manifest");
  });
}
