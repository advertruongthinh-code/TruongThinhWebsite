// The masonry scripts read motion values from masonry/motion-tokens.mjs; each value with a CSS token must equal the :root token in style.css.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { DUR, EASE } from "../../src/site/masonry/motion-tokens.mjs";

const masonryDir = new URL("../../src/site/masonry/", import.meta.url);
const css = readFileSync(new URL("../../src/site/style.css", import.meta.url), "utf8");
const root = css.slice(css.indexOf(":root"), css.indexOf("}", css.indexOf(":root")));
const token = (name) => root.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].replace(/\s+/g, "");

// EASE.push has no CSS token (the horizontal push is only used from script), so it is not compared.
const EASE_TOKENS = { standard: "ease", expoOut: "ease-expo-out", card: "ease-card", viewer: "ease-viewer" };
const DUR_TOKENS = { quick: "dur-quick", base: "dur-base", card: "dur-card", fade: "dur-fade", hover: "dur-hover" };

test("each EASE value equals its CSS token", () => {
  for (const [key, name] of Object.entries(EASE_TOKENS)) {
    assert.ok(token(name), `--${name} exists in :root`);
    assert.equal(EASE[key].replace(/\s+/g, ""), token(name), `EASE.${key} equals --${name}`);
  }
});

test("each DUR value equals its CSS token in milliseconds", () => {
  for (const [key, name] of Object.entries(DUR_TOKENS)) {
    assert.equal(`${DUR[key]}ms`, token(name), `DUR.${key} equals --${name}`);
  }
});

test("masonry scripts do not retype an easing that motion-tokens.mjs owns", () => {
  const files = readdirSync(masonryDir).filter((name) => name.endsWith(".mjs") && name !== "motion-tokens.mjs");
  for (const file of files) {
    const source = readFileSync(new URL(file, masonryDir), "utf8");
    for (const [key, value] of Object.entries(EASE)) {
      assert.ok(!source.replace(/\s+/g, "").includes(value.replace(/\s+/g, "")), `${file} uses EASE.${key} instead of its literal`);
    }
  }
});
