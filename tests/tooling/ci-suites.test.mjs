// Manifest bộ test CI (docs/specs/ci-test-suites.md R1, R3).
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import test from "node:test";
import { manifest, select } from "../../scripts/ci/suites.mjs";

const all = Object.keys(manifest.suites).filter((id) => manifest.suites[id].tests.length);
const commands = Object.values(manifest.suites).flatMap((suite) => suite.tests);

test("mọi file e2e thuộc đúng một chỗ: bộ, manual hoặc pending", () => {
  const files = readdirSync("tests/site").filter((f) => /\.(e2e|spec)\.c?m?js$/.test(f)).map((f) => `tests/site/${f}`);
  for (const file of files) {
    // site.e2e.cjs chia theo mode nên được nằm ở nhiều bộ, mỗi mode một lần.
    const inSuites = commands.filter((cmd) => cmd.includes(file)).length;
    const places = (inSuites ? 1 : 0) + (file in manifest.manual) + manifest.pending.includes(file);
    assert.equal(places, 1, `${file}: ${places} chỗ`);
    if (!file.endsWith("site.e2e.cjs")) assert.ok(inSuites <= 1, `${file} nằm ở ${inSuites} lệnh`);
  }
  const modes = commands.map((cmd) => cmd.match(/TT_E2E_\w+_ONLY/)?.[0]).filter(Boolean);
  assert.equal(new Set(modes).size, modes.length, "mode site.e2e.cjs bị lặp");
});

test("chọn bộ theo file PR sửa", () => {
  assert.deepEqual(select(["docs/STATE.md", "README.md"]), []);
  assert.deepEqual(select(["AGENTS.md"]), ["fast"]);
  assert.deepEqual(select(["src/site/style.css"]), all);
  // home, detail-pages chưa có test (việc 6) nên chỉ media bảo vệ hai trang này.
  assert.deepEqual(select(["src/site/index.html"]), ["fast", "media"]);
  assert.deepEqual(select(["src/site/residential/index.html"]), ["fast", "media"]);
  assert.deepEqual(select(["src/site/advertising-products/skeleton-flow.mjs"]), ["fast", "adv-grid"]);
  assert.deepEqual(select(["tests/site/not-found-routes.e2e.mjs"]), ["fast", "route"]);
  assert.deepEqual(select(["src/site/new-page/index.html"]), all);
  assert.deepEqual(select(["docs/STATE.md"], "push"), all);
});
