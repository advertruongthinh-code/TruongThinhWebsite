// CI test suite manifest (docs/specs/ci-test-suites.md R1, R3).
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { manifest, select, timingTable } from "../../scripts/ci/suites.mjs";

const all = Object.keys(manifest.suites).filter((id) => manifest.suites[id].tests.length);
const commands = Object.values(manifest.suites).flatMap((suite) => suite.tests);

test("every e2e file belongs in exactly one place: suite, manual or pending", () => {
  const files = readdirSync("tests/site").filter((f) => /\.(e2e|spec)\.c?m?js$/.test(f)).map((f) => `tests/site/${f}`);
  const site = "tests/site/site.e2e.cjs";
  for (const file of files.filter((f) => f !== site)) {
    // Shards of the same file (`*_SHARD=k/n`) count as one command.
    const inSuites = new Set(commands.filter((cmd) => cmd.includes(file)).map((cmd) => cmd.replace(/\w+_SHARD=\S+ /, ""))).size;
    const places = (inSuites ? 1 : 0) + (file in manifest.manual) + manifest.pending.includes(file);
    assert.equal(places, 1, `${file}: ${places} places`);
    assert.ok(inSuites <= 1, `${file} is in ${inSuites} commands`);
  }
  // site.e2e.cjs splits by mode: each mode in the source appears exactly once in a suite, manual or pending command.
  const entries = [...commands, ...Object.keys(manifest.manual), ...manifest.pending];
  for (const mode of new Set(readFileSync(site, "utf8").match(/TT_E2E_\w+_ONLY/g))) {
    const count = entries.filter((entry) => entry.match(/TT_E2E_\w+_ONLY/)?.[0] === mode).length;
    assert.equal(count, 1, `${mode}: ${count} places`);
  }
});

test("select suites by the files a PR changes", () => {
  assert.deepEqual(select(["docs/STATE.md", "README.md"]), []);
  assert.deepEqual(select(["AGENTS.md"]), ["fast"]);
  assert.deepEqual(select(["src/site/style.css"]), all);
  // The shared footer and the media frame also guard the home and detail pages.
  assert.deepEqual(select(["src/site/index.html"]), ["fast", "footer", "home", "media"]);
  assert.deepEqual(select(["src/site/residential/index.html"]), ["fast", "footer", "detail-pages", "entry", "media"]);
  assert.deepEqual(select(["src/site/masonry/skeleton-flow.mjs"]), ["fast", "adv-load", "masonry-hosts"]);
  assert.deepEqual(select(["tests/site/not-found-routes.e2e.mjs"]), ["fast", "route"]);
  assert.deepEqual(select(["src/site/new-page/index.html"]), all);
  // Main: a merge with only docs runs no suite; a merge with code runs them all.
  assert.deepEqual(select(["docs/STATE.md"], "push"), []);
  assert.deepEqual(select(["docs/STATE.md", "AGENTS.md"], "workflow_dispatch"), all);
});

test("the job summary timing table has one row per command", () => {
  const table = timingTable([{ suite: "home", cmd: "node a.mjs", seconds: 12, status: 0 }, { suite: "home", cmd: "node b.mjs", seconds: 3, status: 1 }]);
  assert.deepEqual(table.split("\n").slice(2), ["| home | 12 | PASS | `node a.mjs` |", "| home | 3 | FAIL | `node b.mjs` |"]);
});
