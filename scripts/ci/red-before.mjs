// Red-before check (docs/specs/ci-test-suites.md R13): a PR that changes src/site/ and adds or changes browser tests must have
// at least one of those test files fail against main's src/site/. A test never seen red proves nothing.
// node scripts/ci/red-before.mjs [--base <ref>]   (CI: --base HEAD^1; local default origin/main)
import { execFileSync, spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { manifest, withPreview } from "./suites.mjs";

export const EXEMPT = /^Test đỏ trước: không áp dụng - [^<\s]/m;

// Which test files must be seen red, or why the check does not apply.
export function plan(changed, body = "") {
  // Tests run by hand on real hardware (manifest `manual`, `pending`) cannot run here.
  const tests = changed.filter((file) => /^tests\/site\/[^/]+\.(e2e|test)\.mjs$/.test(file) && !(file in manifest.manual) && !manifest.pending.includes(file));
  if (!changed.some((file) => file.startsWith("src/site/"))) return { skip: "no src/site/ change" };
  if (!tests.length) return { skip: "no added or changed test in tests/site/" };
  if (EXEMPT.test(body)) return { skip: "PR has the line `Test đỏ trước: không áp dụng - <lý do>`" };
  return { tests };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const ref = args.includes("--base") ? args[args.indexOf("--base") + 1] : "origin/main";
  const git = (...rest) => execFileSync("git", rest, { encoding: "utf8" }).trim();
  const base = git("merge-base", ref, "HEAD");
  const summary = (text) => {
    console.log(text);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
  };
  const work = plan(git("diff", "--name-only", "--diff-filter=AM", `${base}...HEAD`).split("\n").filter(Boolean), process.env.PR_BODY);
  if (work.skip) {
    summary(`red-before: skipped, ${work.skip}`);
    process.exit(0);
  }
  if (git("status", "--porcelain", "--", "src/site")) {
    console.error("red-before: commit or stash src/site/ first; the check swaps it for main's copy");
    process.exit(1);
  }
  // Main's src/site/ with this PR's tests: restore without overlay also removes files main does not have.
  git("restore", `--source=${base}`, "--worktree", "--", "src/site");
  let results;
  try {
    results = await withPreview(async (baseUrl) => work.tests.map((file) => {
      console.log(`\n[red-before] ${file}`);
      return { file, status: spawnSync(process.execPath, [file], { stdio: "inherit", env: { ...process.env, BASE_URL: baseUrl } }).status };
    }));
  } finally {
    git("restore", "--source=HEAD", "--worktree", "--", "src/site");
  }
  summary(["| Test on main's src/site/ | Result |", "| --- | --- |", ...results.map((r) => `| \`${r.file}\` | ${r.status === 0 ? "green" : "red"} |`)].join("\n"));
  if (results.every((r) => r.status === 0)) {
    console.error("red-before: every changed test passes on main's src/site/, so none proves this change; write a test that fails without it (Prove-It)");
    process.exit(1);
  }
}
