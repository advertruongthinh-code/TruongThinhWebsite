// AGENTS.md SSoT: the agent pre-tool guard blocks secret reads and history-destroying Git commands.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { verdict } from "../../scripts/tooling/pre-tool-guard.mjs";

const bash = (command) => verdict({ tool_name: "Bash", tool_input: { command } });

test("blocks secret reads and destructive Git commands", () => {
  for (const c of ["cat .env", "head -5 src/.env.local", "type .dev.vars", "Get-Content ops\\ad.keytab", "cat ~/.ssh/id_ed25519", "git push --force origin x", "git push -f", "git push --force-with-lease", "git reset --hard HEAD~1", "git commit --no-verify -m x"]) {
    assert.ok(bash(c), c);
  }
  assert.ok(verdict({ tool_name: "Read", tool_input: { file_path: "/repo/.env" } }));
});

test("allows ordinary work", () => {
  for (const c of ["cat .env.example", "pnpm qa:docs", "git push -u origin claude/x", "grep -rn environment src", "ls -a", "git reset --soft HEAD~1"]) {
    assert.equal(bash(c), null, c);
  }
  assert.equal(verdict({ tool_name: "Read", tool_input: { file_path: "docs/key-terms.md" } }), null);
  assert.equal(verdict(null), null);
});

test("answers each host in its own format", () => {
  const run = (payload) => spawnSync(process.execPath, ["scripts/tooling/pre-tool-guard.mjs"], { input: JSON.stringify(payload), encoding: "utf8" });
  const claude = run({ tool_name: "Bash", tool_input: { command: "cat .env" } });
  assert.equal(claude.status, 2);
  assert.match(claude.stderr, /Blocked/);
  assert.equal(run({ tool_name: "Bash", tool_input: { command: "ls" } }).status, 0);
  const agy = run({ toolCall: { args: { CommandLine: "git reset --hard" } } });
  assert.equal(JSON.parse(agy.stdout).decision, "deny");
});
