// Nightly CI card (ci-test-suites R13): the card line names the red suites and the run; a green run reads "xanh lại".
import assert from "node:assert/strict";
import { test } from "node:test";
import { redSuites, runLine } from "../../scripts/ci/nightly-card.mjs";

test("red suites skip the aggregate and deploy jobs", () => {
  const jobs = [
    { name: "select", conclusion: "success" },
    { name: "header", conclusion: "failure" },
    { name: "adv-grid", conclusion: "failure" },
    { name: "media-card", conclusion: "cancelled" },
    { name: "static-release", conclusion: "failure" },
    { name: "fast", conclusion: "success" },
  ];
  assert.deepEqual(redSuites(jobs), ["adv-grid", "header"]);
});

test("one line per run", () => {
  const runUrl = "https://github.com/o/r/actions/runs/1";
  assert.equal(runLine({ date: "2026-11-23", failed: ["adv-grid", "header"], runUrl }), `2026-11-23: đỏ 2 suite (adv-grid, header) - ${runUrl}`);
  assert.equal(runLine({ date: "2026-11-23", failed: [], runUrl }), `2026-11-23: xanh lại - ${runUrl}`);
});
