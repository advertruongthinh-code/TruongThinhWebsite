// Fails when the global rule block drifts between bootstrap.ps1 and cloud-setup.sh,
// or when doctor.ps1 rule checks stop matching that block.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const block = (text, end) => {
  const start = text.indexOf("## Global agent stack");
  return text.slice(start, text.indexOf(end, start)).trim();
};

const bootstrap = block(read("scripts/tooling/bootstrap.ps1"), "<!-- codex:global-stack:end -->");
const cloud = block(read("scripts/tooling/cloud-setup.sh"), "\nEOF");
const doctor = read("scripts/tooling/doctor.ps1");

test("bootstrap.ps1 and cloud-setup.sh write the same global rules", () => {
  assert.ok(bootstrap.length > 100);
  assert.equal(cloud, bootstrap);
});

test("doctor.ps1 rule checks match the global rules", () => {
  const checks = [...doctor.matchAll(/\$entry\.text -(not)?match '([^']+)'/g)];
  assert.ok(checks.length > 5);
  for (const [, not, pattern] of checks) {
    // PowerShell -match is case-insensitive.
    const found = new RegExp(pattern, "i").test(bootstrap);
    assert.equal(found, Boolean(not), `doctor.ps1 pattern ${not ? "missing" : "forbidden"}: ${pattern}`);
  }
});
