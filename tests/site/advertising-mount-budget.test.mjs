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
  const budget = createMountBudget(read, (callback) => callback());
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

test("a second call in the same frame keeps the previous verdict and the old sample", () => {
  const { state, read } = clock();
  const budget = createMountBudget(read, (callback) => callback());
  budget.begin(0, 700);
  state.now += 16;
  assert.equal(budget.begin(300, 700), true);
  state.now += 1;
  assert.equal(budget.begin(300, 700), true, "no movement in 1ms must not read as a stop");
  state.now += 15;
  assert.equal(budget.begin(600, 700), true, "the distance is still measured from the first call of the frame");
});

test("a repeat call without movement keeps a fast swipe fast for a moment, then lets go", () => {
  const { state, read } = clock();
  const budget = createMountBudget(read, (callback) => callback());
  budget.begin(0, 700);
  state.now += 16;
  assert.equal(budget.begin(300, 700), true);
  state.now += 16;
  assert.equal(budget.begin(300, 700), true, "the ghost frame runs before the scroll of its frame");
  state.now += 60;
  assert.equal(budget.begin(300, 700), true, "still within the hold time of the last move");
  state.now += 100;
  assert.equal(budget.begin(300, 700), false, "standing still long enough ends the fast verdict");
});

test("only one mount per frame: a second look in the same frame gets no quota", () => {
  const { read } = clock();
  const frames = [];
  const budget = createMountBudget(read, (callback) => frames.push(callback));
  assert.ok(budget.quota() >= 1);
  budget.record(3, 3);
  budget.record(2, 2);
  assert.equal(frames.length, 1, "one reset per frame however many records");
  assert.equal(budget.quota(), 0, "same frame, budget already spent");
  frames.shift()();
  assert.ok(budget.quota() >= 1, "next frame has its budget again");
});

test("quota follows the measured card cost and frame interval", () => {
  const { state, read } = clock();
  const pending = [];
  const budget = createMountBudget(read, (callback) => pending.push(callback));
  const nextFrame = () => pending.splice(0).forEach((callback) => callback());
  assert.equal(budget.quota(), 1, "default cost 3ms in a 60Hz frame (5.5ms budget)");
  for (let index = 0; index < 30; index += 1) { budget.record(10, 5); nextFrame(); }
  assert.ok(budget.quota() > 5, "cheap cards (0.5ms) fit many per frame");
  for (let index = 0; index < 60; index += 1) { budget.record(10, 0.1); nextFrame(); }
  assert.equal(budget.quota(), 8, "a hard ceiling of 8 per frame even when the measured cost is tiny");
  for (let index = 0; index < 60; index += 1) { budget.record(1, 25); nextFrame(); }
  assert.equal(budget.quota(), 1, "expensive cards (25ms) still mount one per frame");
  budget.record(0, 100); nextFrame();
  assert.equal(budget.quota(), 1, "recording zero cards changes nothing");
  state.now += 16;
});

test("a long frame interval is clamped so a slow render does not widen its own budget", () => {
  const { state, read } = clock();
  const budget = createMountBudget(read, (callback) => callback());
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
