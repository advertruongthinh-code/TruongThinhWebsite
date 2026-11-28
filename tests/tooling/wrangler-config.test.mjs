// Wrangler configs (docs/specs/cms-data.md R4): no preview URLs; the admin Worker runs only for /api/* and has one Cron.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");

test("preview URLs are off for every Worker", () => {
  assert.match(read("wrangler.toml"), /^preview_urls = false$/m);
  assert.equal(read("wrangler.static.toml").match(/^preview_urls = false$/gm)?.length, 2);
});

// --env="" picks the top-level (staging) config of wrangler.static.toml (docs/specs/static-release.md R11).
test("deploy scripts keep their environment flags", () => {
  const { scripts } = JSON.parse(read("package.json"));
  assert.ok(scripts["deploy:demo"].endsWith('--env=""'), scripts["deploy:demo"]);
  assert.ok(scripts["release:site"].endsWith("--env production"), scripts["release:site"]);
});

// The live site builds from the repo with no marker until part 2 adds publishing (docs/specs/cms-data.md R6).
test("the snapshot and the deploy marker run only for the staging target", () => {
  const workflow = read(".github/workflows/deploy-demo.yml");
  assert.match(workflow, /CMS_SNAPSHOT_URL: \$\{\{ inputs\.target == 'staging' && vars\.CMS_SNAPSHOT_URL \|\| '' \}\}/);
  assert.match(workflow, /- id: snapshot\n\s+if: env\.CMS_SNAPSHOT_URL != ''/);
  assert.match(workflow, /- if: inputs\.target == 'staging' && steps\.snapshot\.outputs\.skip != 'true'\n(?:\s+.*\n)+?\s+run: node scripts\/cms\/write-deploy-marker\.mjs/);
});

test("the admin Worker runs first only for the API and has one Cron", () => {
  const admin = read("wrangler.toml");
  assert.match(admin, /^run_worker_first = \["\/api\/\*"\]$/m);
  assert.match(admin, /^crons = \["\* \* \* \* \*"\]$/m);
});

test("the admin Worker serves only its custom domain, not workers.dev", () => {
  const admin = read("wrangler.toml");
  assert.match(admin, /^workers_dev = false$/m);
  assert.match(admin, /^pattern = "cms\.truongthinhads\.vn"\ncustom_domain = true$/m);
});

// force-trailing-slash serves /admin/status.html at /admin/status/, so a "./x.js" there resolves to /admin/status/x.js (503).
test("admin sub-pages load scripts and links by absolute /admin/ paths", () => {
  assert.match(read("wrangler.toml"), /^html_handling = "force-trailing-slash"$/m);
  for (const page of ["status", "records"]) {
    const html = read(`src/admin/${page}.html`);
    assert.doesNotMatch(html, /(?:src|href)="(?!\/|https?:|#|data:)/, `${page}.html`);
    assert.match(html, new RegExp(`<script type="module" src="/admin/${page}\\.js"></script>`), `${page}.html`);
  }
});
