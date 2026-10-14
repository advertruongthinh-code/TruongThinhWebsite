// Manifest bộ test CI (docs/specs/ci-test-suites.md R1, R3).
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { manifest, select } from "../../scripts/ci/suites.mjs";

const all = Object.keys(manifest.suites).filter((id) => manifest.suites[id].tests.length);
const commands = Object.values(manifest.suites).flatMap((suite) => suite.tests);

test("mọi file e2e thuộc đúng một chỗ: bộ, manual hoặc pending", () => {
  const files = readdirSync("tests/site").filter((f) => /\.(e2e|spec)\.c?m?js$/.test(f)).map((f) => `tests/site/${f}`);
  const site = "tests/site/site.e2e.cjs";
  for (const file of files.filter((f) => f !== site)) {
    // Shard của cùng một file (`*_SHARD=k/n`) tính là một lệnh.
    const inSuites = new Set(commands.filter((cmd) => cmd.includes(file)).map((cmd) => cmd.replace(/\w+_SHARD=\S+ /, ""))).size;
    const places = (inSuites ? 1 : 0) + (file in manifest.manual) + manifest.pending.includes(file);
    assert.equal(places, 1, `${file}: ${places} chỗ`);
    assert.ok(inSuites <= 1, `${file} nằm ở ${inSuites} lệnh`);
  }
  // site.e2e.cjs chia theo mode: mỗi mode trong source nằm đúng một lần ở lệnh của bộ, manual hoặc pending.
  const entries = [...commands, ...Object.keys(manifest.manual), ...manifest.pending];
  for (const mode of new Set(readFileSync(site, "utf8").match(/TT_E2E_\w+_ONLY/g))) {
    const count = entries.filter((entry) => entry.match(/TT_E2E_\w+_ONLY/)?.[0] === mode).length;
    assert.equal(count, 1, `${mode}: ${count} chỗ`);
  }
});

test("chọn bộ theo file PR sửa", () => {
  assert.deepEqual(select(["docs/STATE.md", "README.md"]), []);
  assert.deepEqual(select(["AGENTS.md"]), ["fast"]);
  assert.deepEqual(select(["src/site/style.css"]), all);
  // Footer chung mọi trang và khung ảnh của media cũng bảo vệ trang chủ, trang detail.
  assert.deepEqual(select(["src/site/index.html"]), ["fast", "footer", "home", "media"]);
  assert.deepEqual(select(["src/site/residential/index.html"]), ["fast", "footer", "detail-pages", "entry", "media"]);
  assert.deepEqual(select(["src/site/advertising-products/skeleton-flow.mjs"]), ["fast", "adv-load"]);
  assert.deepEqual(select(["tests/site/not-found-routes.e2e.mjs"]), ["fast", "route"]);
  assert.deepEqual(select(["src/site/new-page/index.html"]), all);
  assert.deepEqual(select(["docs/STATE.md"], "push"), all);
});
