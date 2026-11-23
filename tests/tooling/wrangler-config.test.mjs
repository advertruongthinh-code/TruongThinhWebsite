// Wrangler configs (docs/specs/cms-data.md R4): no preview URLs; the admin Worker runs only for /api/* and has one Cron.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");

test("preview URLs are off for every Worker", () => {
  assert.match(read("wrangler.toml"), /^preview_urls = false$/m);
  assert.equal(read("wrangler.static.toml").match(/^preview_urls = false$/gm)?.length, 2);
});

test("the admin Worker runs first only for the API and has one Cron", () => {
  const admin = read("wrangler.toml");
  assert.match(admin, /^run_worker_first = \["\/api\/\*"\]$/m);
  assert.match(admin, /^crons = \["\* \* \* \* \*"\]$/m);
});

test("the admin Worker serves only its custom domain, not workers.dev", () => {
  const admin = read("wrangler.toml");
  assert.match(admin, /^workers_dev = false$/m);
  assert.match(admin, /^pattern = "admin\.truongthinhads\.vn"\ncustom_domain = true$/m);
});
