import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { ROUTES, localeHtml } from "../../scripts/tooling/serve-static-parity.mjs";

test("static hosting gets the same localized HTML as the preview server", async () => {
  assert.equal(ROUTES.size, 22);
  for (const [route, source] of ROUTES) {
    const locale = route.startsWith("/en/") ? "en" : "vi";
    const original = await readFile(new URL(`../../.site-output/${source}`, import.meta.url), "utf8");
    const deployed = await readFile(new URL(`../../.site-output${route}index.html`, import.meta.url), "utf8");
    assert.equal(deployed, localeHtml(original, locale), route);
    assert.match(deployed, new RegExp(`<html[^>]*lang="${locale}"`), route);
  }
});
