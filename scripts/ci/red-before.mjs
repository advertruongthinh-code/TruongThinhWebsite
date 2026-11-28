// Red-before check (docs/specs/ci-test-suites.md R13): a PR that changes src/site/ and adds or changes browser tests must have
// at least one of those test files fail against main's src/site/. A test never seen red proves nothing.
// node scripts/ci/red-before.mjs [--base <ref>]   (CI: --base HEAD^1; local default origin/main)
import { execFileSync, spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { manifest, withPreview } from "./suites.mjs";

export const EXEMPT = /^Test đỏ trước: không áp dụng - [^<\s]/m;
// Per-file cap: a long red file (detail-view runs 11+ min) must not use the whole 12-min job before the next file runs.
export const FILE_TIMEOUT_MS = 4 * 60_000;

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
    // One red file is enough (owner 2026-11-23): stop there, so a long suite after it cannot run the job past its timeout.
    results = await withPreview(async (baseUrl) => {
      const ran = [];
      for (const file of work.tests) {
        console.log(`\n[red-before] ${file}`);
        const run = spawnSync(process.execPath, [file], { stdio: "inherit", timeout: FILE_TIMEOUT_MS, env: { ...process.env, BASE_URL: baseUrl } });
        // A timeout proves nothing either way: note it and try the next file.
        ran.push({ file, status: run.error?.code === "ETIMEDOUT" ? "timeout" : run.status });
        if (ran.at(-1).status !== 0 && ran.at(-1).status !== "timeout") break;
      }
      return ran;
    });
  } finally {
    git("restore", "--source=HEAD", "--worktree", "--", "src/site");
  }
  summary(["| Test on main's src/site/ | Result |", "| --- | --- |", ...results.map((r) => `| \`${r.file}\` | ${r.status === "timeout" ? "timeout" : r.status === 0 ? "green" : "red"} |`)].join("\n"));
  if (!results.some((r) => r.status !== 0 && r.status !== "timeout")) {
    console.error("red-before: no changed test failed on main's src/site/ within its time cap, so none proves this change; write a test that fails without it (Prove-It)");
    process.exit(1);
  }
}
