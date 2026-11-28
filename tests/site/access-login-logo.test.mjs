import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { accessLoginLogo } from "../../scripts/site/access-login-logo.mjs";

test("access login logo is a static four-color mark that turns white on dark OS", async () => {
  const lockup = await readFile(new URL("../../src/site/assets/brand/truong-thinh-lockup.svg", import.meta.url), "utf8");
  const logo = accessLoginLogo(lockup);
  for (const color of ["#2b2a29", "#ffed00", "#e5097f", "#00a0e3"]) assert.ok(logo.includes(`fill="${color}"`), color);
  assert.match(logo, /^<svg [^>]*viewBox="0 25\.4515 177\.444 153\.667"/);
  assert.doesNotMatch(logo, /var\(|currentColor|data-lang|truong-thinh-title|animation|<script/);
  assert.match(logo, /prefers-color-scheme:dark\)\{path\{fill:#fff\}/);
  const built = await readFile(new URL("../../.site-output/assets/brand/truong-thinh-mark-color.svg", import.meta.url), "utf8").catch(() => logo);
  assert.equal(built, logo);
});
