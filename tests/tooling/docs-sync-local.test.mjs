import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

function fixture(t, extraEnv = {}) {
  const temporary = fileURLToPath(new URL("../../.tmp/", import.meta.url));
  mkdirSync(temporary, { recursive: true });
  const root = mkdtempSync(join(temporary, "tt-docs-sync-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: root });
  git("init", "-q");
  for (const directory of ["design-system", "src/site", "scripts/docs", "docs/specs"]) mkdirSync(join(root, directory), { recursive: true });
  writeFileSync(join(root, "design-system/tokens.json"), "{}");
  writeFileSync(join(root, "src/site/style.css"), ":root {\n\n}\n");
  writeFileSync(join(root, "src/site/detail.css"), "");
  writeFileSync(join(root, "docs/specs/shell.md"), "---\nsource:\n  - src/site/**\n---\n\n# Shell\n");
  for (const script of ["build-design-system.mjs", "build-design-md.mjs"]) writeFileSync(join(root, "scripts/docs", script), "");
  git("add", ".");
  git("commit", "-qm", "base");
  git("update-ref", "refs/remotes/origin/main", "HEAD");

  const env = { ...process.env, CI: "", PR_BODY: "", ...extraEnv };
  delete env.DOCS_BASE;
  delete env.PR_NUMBER;
  const run = () => spawnSync(process.execPath, [fileURLToPath(new URL("../../scripts/docs/check-docs.mjs", import.meta.url))], { cwd: root, encoding: "utf8", env });

  return { root, git, run };
}

// docs-system.md R4: a local run checks sync against origin/main, and a waiver line in a commit message counts.
test("local docs gate checks spec sync against origin/main and reads the waiver from commit messages", (t) => {
  const { root, git, run } = fixture(t);
  writeFileSync(join(root, "src/site/detail.css"), "a {}\n");
  git("commit", "-qam", "change detail.css");
  const red = run();
  assert.equal(red.status, 1);
  assert.match(red.stderr, /sync: src\/site\/detail\.css changed but docs\/specs\/shell\.md did not/);

  git("commit", "-q", "--allow-empty", "-m", "Waive\n\nSpec: không đổi - chỉ đổi màu, hành vi giữ nguyên");
  const green = run();
  assert.equal(green.status, 0, green.stderr);
});

// docs-system.md R4 card check: a PR run needs a `Card: <Notion link>` line in the PR body or a commit message.
test("PR docs gate requires a Card line linking the Notion card", (t) => {
  const { git, run } = fixture(t, { PR_BODY: "no card here" });
  const red = run();
  assert.equal(red.status, 1);
  assert.match(red.stderr, /card: the PR description or a commit message/);
  git("commit", "-q", "--allow-empty", "-m", "Card\n\nCard: https://app.notion.com/p/418332849a0e81959339c4aa4591f5cd");
  const green = run();
  assert.equal(green.status, 0, green.stderr);
});

// notion.md rule 8: when Notion is unreachable, `Card: chờ tạo` passes and the coordinator backfills.
test("PR docs gate accepts Card: chờ tạo", (t) => {
  const { run } = fixture(t, { PR_BODY: "Card: chờ tạo\nTên: x; Status: In progress" });
  const result = run();
  assert.equal(result.status, 0, result.stderr);
});
