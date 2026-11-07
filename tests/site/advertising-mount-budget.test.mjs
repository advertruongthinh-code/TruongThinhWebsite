// Ngân sách dựng card theo frame (advertising-masonry R7): quota theo chi phí đo, vuốt cực nhanh chỉ giữ chỗ.
import assert from "node:assert/strict";
import { test } from "node:test";
import { breathePhase, createMountBudget } from "../../src/site/advertising-products/mount-budget.mjs";

const clock = () => {
  const state = { now: 1000 };
  return { state, read: () => state.now };
};

test("a slow scroll is not fast, a viewport per 100ms is", () => {
  const { state, read } = clock();
  const budget = createMountBudget(read);
  assert.equal(budget.begin(0, 700), false, "first sample has no speed");
  state.now += 16;
  assert.equal(budget.begin(60, 700), false, "3750 px/s is below 7000 px/s");
  state.now += 16;
  assert.equal(budget.begin(300, 700), true, "15000 px/s is above one viewport per 100ms");
  state.now += 500;
  assert.equal(budget.begin(300, 700), false, "no movement after a pause");
  state.now += 2000;
  assert.equal(budget.begin(300 + 700 * 3, 700), true, "a jump over two viewports is fast even after a long pause");
  state.now += 2000;
  assert.equal(budget.begin(300 + 700 * 3 + 700, 700), false, "a slow move after a pause is not");
});

test("quota follows the measured card cost and frame interval", () => {
  const { state, read } = clock();
  const budget = createMountBudget(read);
  assert.equal(budget.quota(), 1, "default cost 3ms in a 60Hz frame (5.5ms budget)");
  for (let index = 0; index < 30; index += 1) budget.record(10, 5);
  assert.ok(budget.quota() > 5, "cheap cards (0.5ms) fit many per frame");
  for (let index = 0; index < 60; index += 1) budget.record(1, 25);
  assert.equal(budget.quota(), 1, "expensive cards (25ms) still mount one per frame");
  budget.record(0, 100);
  assert.equal(budget.quota(), 1, "recording zero cards changes nothing");
  state.now += 16;
});

test("a long frame interval is clamped so a slow render does not widen its own budget", () => {
  const { state, read } = clock();
  const budget = createMountBudget(read);
  budget.begin(0, 700);
  for (let index = 0; index < 40; index += 1) {
    state.now += 90;
    budget.begin(0, 700);
  }
  for (let index = 0; index < 60; index += 1) budget.record(1, 3);
  assert.ok(budget.quota() <= 4, "34ms cap gives at most an 11ms budget");
});

test("breathing phase is shared by absolute time", () => {
  assert.equal(breathePhase(4000), "0ms");
  assert.equal(breathePhase(4300), "-300ms");
  assert.equal(breathePhase(5300), "-1300ms", "same phase as 3300ms: shifted by one period");
});
