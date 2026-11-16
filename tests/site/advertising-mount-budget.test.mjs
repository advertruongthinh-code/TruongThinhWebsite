// Per-frame card mount budget (advertising-masonry R7, loading-glass R10): quota by measured cost, ramp after a jump or pause, build zone by speed.
import assert from "node:assert/strict";
import { test } from "node:test";
import { clearColorWait, colorsPhase, createDetachedCards, createMountBudget, detachedCapacity, setColorWait } from "../../src/site/masonry/mount-budget.mjs";

const clock = () => {
  const state = { now: 1000 };
  return { state, read: () => state.now };
};

test("only a jump over two viewports is a jump; speed is tracked, not thresholded", () => {
  const { state, read } = clock();
  const budget = createMountBudget(read, (callback) => callback());
  assert.equal(budget.begin(0, 700), false, "first sample has no speed");
  state.now += 16;
  assert.equal(budget.begin(300, 700), false, "a fast swipe is not a jump: fast mode is decided by required cards against the quota (pickMounts)");
  assert.ok(budget.speed() > 0, "speed follows the steps (smoothed)");
  state.now += 2000;
  assert.equal(budget.begin(300 + 700 * 3, 700), true, "a jump over two viewports even after a long pause");
  state.now += 2000;
  assert.equal(budget.begin(300 + 700 * 3 + 700, 700), false, "a slow move after a pause is not");
});

test("a second call in the same frame keeps the previous verdict and the old sample", () => {
  const { state, read } = clock();
  const budget = createMountBudget(read, (callback) => callback());
  budget.begin(0, 700);
  state.now += 16;
  assert.equal(budget.begin(1600, 700), true);
  state.now += 1;
  assert.equal(budget.begin(1600, 700), true, "no movement in 1ms must not read as a stop");
});

test("the ramp after a jump or a pause doubles per mounting frame up to the measured quota", () => {
  const { state, read } = clock();
  const pending = [];
  const budget = createMountBudget(read, (callback) => pending.push(callback));
  // `jsMs` per card created; the frame stretches by `interval` beyond its base.
  const frame = (count, jsMs, interval, y = 0) => {
    budget.begin(y, 700);
    const quota = budget.quota();
    if (count) budget.record(Math.min(count, quota), jsMs * Math.min(count, quota));
    pending.splice(0).forEach((callback) => callback());
    state.now += interval;
    return quota;
  };
  for (let index = 0; index < 30; index += 1) frame(0, 0, 16.7);
  for (let index = 0; index < 60; index += 1) frame(20, 0.05, 16.7);
  const steady = budget.quota();
  assert.ok(steady > 8, `cheap cards fit more than the old fixed ceiling of 8, ${steady}`);
  frame(0, 0, 16.7, 700 * 3);
  assert.deepEqual([frame(40, 0.05, 16.7, 700 * 3), frame(40, 0.05, 16.7, 700 * 3), frame(40, 0.05, 16.7, 700 * 3)], [2, 4, 8], "after a jump the quota ramps 2, 4, 8");
  for (let index = 0; index < 10; index += 1) frame(40, 0.05, 16.7, 700 * 3);
  assert.ok(budget.quota() >= steady - 2, "the ramp ends at the measured quota");
  state.now += 400;
  assert.equal(frame(40, 0.05, 16.7, 700 * 3), 2, "a pause from 100ms restarts the ramp (the cost may be stale)");
});

test("reattached cards do not lower the measured cost", () => {
  const { state, read } = clock();
  const pending = [];
  const budget = createMountBudget(read, (callback) => pending.push(callback));
  const frame = (count, fresh, interval) => {
    budget.begin(0, 700);
    if (count) budget.record(count, 0.2, fresh);
    pending.splice(0).forEach((callback) => callback());
    state.now += interval;
  };
  for (let index = 0; index < 30; index += 1) frame(0, 0, 16.7);
  for (let index = 0; index < 60; index += 1) frame(2, 2, 16.7 + 8);
  const quota = budget.quota();
  for (let index = 0; index < 60; index += 1) frame(10, 0, 16.7 + 1);
  assert.equal(budget.quota(), quota, "frames that only reattach queued cards leave the cost of a new card unchanged");
});

test("an idle pass learns the card cost from the next two frames and leaves the frame clock alone", () => {
  const { state, read } = clock();
  const pending = [];
  const budget = createMountBudget(read, (callback) => pending.push(callback));
  const runFrame = (ms) => {
    state.now += ms;
    pending.splice(0).forEach((callback) => callback());
  };
  for (let index = 0; index < 30; index += 1) {
    budget.begin(0, 700);
    runFrame(16.7);
  }
  assert.equal(budget.quota(), 1, "default cost 3ms");
  for (let index = 0; index < 20; index += 1) {
    budget.record(1, 0.3, 1, { idle: true });
    runFrame(5);
    runFrame(16.7 + 0.3);
    runFrame(16.7);
  }
  // Scrolling resumes after the pause: the ramp restarts, then with short frames reaches the cost learned while idle (cheap cards lowered it,
  // and the idle gaps did not stretch the frame clock).
  for (let index = 0; index < 4; index += 1) {
    budget.begin(0, 700);
    const quota = budget.quota();
    budget.record(quota, 0.3 * quota);
    runFrame(16.7 + 0.3 * quota);
  }
  budget.begin(0, 700);
  assert.ok(budget.quota() >= 5, `the idle gaps did not stretch the frame clock, quota ${budget.quota()}`);
});

test("one long frame at most doubles the cost of a card", () => {
  const { state, read } = clock();
  const pending = [];
  const budget = createMountBudget(read, (callback) => pending.push(callback));
  for (let index = 0; index < 40; index += 1) {
    budget.begin(0, 700);
    if (index > 10) budget.record(4, 0.4);
    pending.splice(0).forEach((callback) => callback());
    state.now += 16.7;
  }
  const quota = budget.quota();
  budget.begin(0, 700);
  budget.record(1, 0.1);
  pending.splice(0).forEach((callback) => callback());
  state.now += 90;
  budget.begin(0, 700);
  assert.ok(budget.quota() >= Math.floor(quota / 2), `a single 90ms frame (image decode, GC) does not collapse the quota, ${quota} -> ${budget.quota()}`);
});

test("the ramp opens only while the cost per card of each frame stays near the known cost", () => {
  const { state, read } = clock();
  const pending = [];
  const budget = createMountBudget(read, (callback) => pending.push(callback));
  const frame = (interval) => {
    budget.begin(0, 700);
    const quota = budget.quota();
    budget.record(quota, 0.1 * quota);
    pending.splice(0).forEach((callback) => callback());
    state.now += interval;
    return quota;
  };
  // Cheap cost learned at rest (idle bracket), then cards that really stretch the frame (a slow phone).
  for (let index = 0; index < 5; index += 1) {
    budget.record(1, 0.1, 1, { idle: true });
    state.now += 5;
    pending.splice(0).forEach((callback) => callback());
    state.now += 16.8;
    pending.splice(0).forEach((callback) => callback());
  }
  state.now += 500;
  const quotas = [frame(60), frame(60), frame(60), frame(60)];
  assert.ok(quotas.every((quota) => quota <= 2), `long frames keep the ramp at its start, ${quotas}`);
});

test("the build zone is the same on both sides, grows with speed, is capped by the queue and never under one viewport", () => {
  const { state, read } = clock();
  const budget = createMountBudget(read, (callback) => callback());
  assert.equal(budget.zone({ viewportHeight: 700, cardsPerViewport: 6, capacity: 48 }), 700, "at rest one viewport");
  for (let index = 0; index <= 20; index += 1) {
    budget.begin(index * 500, 700);
    state.now += 16;
  }
  const fast = budget.zone({ viewportHeight: 700, cardsPerViewport: 6, capacity: 48, step: 0 });
  assert.ok(fast > 700, `a fast swipe widens the zone, ${fast}`);
  assert.ok(fast <= 700 * 24 / 6, "the speed term is at most half the queue per side");
  assert.equal(budget.zone({ viewportHeight: 700, cardsPerViewport: 6, capacity: 48, step: 500 }), fast + 500, "the last step adds on top, as the page moves one more step after the pass");
  assert.equal(budget.zone({ viewportHeight: 700, cardsPerViewport: 6, capacity: 8, step: 0 }), 700, "half a small queue is under one viewport: the floor wins");
  assert.ok(budget.zone({ viewportHeight: 700, cardsPerViewport: 6, capacity: 48, step: 1500 }) >= 1500, "never narrower than the last scroll step");
  assert.ok(budget.zone({ viewportHeight: 700, cardsPerViewport: 20, capacity: 8, step: 1260 }) >= 1260, "the queue cap does not clip the scroll step");
  state.now += 500;
  assert.equal(budget.zone({ viewportHeight: 700, cardsPerViewport: 6, capacity: 48 }), 700, "at rest after the fling (only idle passes) the zone is one viewport again");
  assert.ok(budget.zone({ viewportHeight: 700, cardsPerViewport: 6, capacity: 48, step: 1400 }) >= 1400, "a step the window measured counts even after a frame longer than the pause threshold");
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

test("quota follows the card cost measured from the frame interval, not only the JS part", () => {
  const { state, read } = clock();
  const pending = [];
  const budget = createMountBudget(read, (callback) => pending.push(callback));
  // One frame: evaluate the window, mount `count` cards costing `jsMs` of JS; the next frame arrives after `interval` ms (including style, layout, paint).
  const frame = (count, jsMs, interval) => {
    budget.begin(0, 700);
    if (count) budget.record(count, jsMs);
    pending.splice(0).forEach((callback) => callback());
    state.now += interval;
  };
  assert.equal(budget.quota(), 1, "default cost 3ms in a 60Hz frame (5.5ms budget)");
  for (let index = 0; index < 30; index += 1) frame(0, 0, 16.7);
  for (let index = 0; index < 30; index += 1) frame(10, 5, 16.7 + 5);
  assert.ok(budget.quota() > 5, "cheap cards (0.5ms each, frame barely longer) fit many per frame");
  for (let index = 0; index < 60; index += 1) frame(10, 1, 16.7 + 1);
  assert.ok(budget.quota() > 8, "no fixed ceiling when the measured cost is tiny");
  // A04s: JS is only 0.5ms per card but 8 cards stretch the frame by 32ms; the real cost is 4ms per card.
  for (let index = 0; index < 60; index += 1) frame(8, 4, 16.7 + 32);
  assert.equal(budget.quota(), 1, "cards whose style and layout stretch the frame mount one per frame");
  for (let index = 0; index < 60; index += 1) frame(0, 0, 16.7);
  assert.equal(budget.quota(), 1, "idle frames refresh the base interval, not the card cost");
  frame(0, 0, 500);
  assert.equal(budget.quota(), 1, "a long pause is ignored");
});

test("the base frame interval is clamped so a slow render does not widen its own budget", () => {
  const { state, read } = clock();
  const budget = createMountBudget(read, (callback) => callback());
  budget.begin(0, 700);
  for (let index = 0; index < 40; index += 1) {
    state.now += 90;
    budget.begin(0, 700);
  }
  assert.ok(budget.quota() <= 4, "34ms cap gives at most an 11ms budget with the 3ms default cost");
});

test("color wait phase is shared by absolute time, 8s cycle", () => {
  assert.equal(colorsPhase(16000), "0ms");
  assert.equal(colorsPhase(16300), "-300ms");
  assert.equal(colorsPhase(25300), "-1300ms", "same phase as 17300ms: shifted by one period");
});

test("a color wait is set and cleared on any node", () => {
  const values = new Map();
  const node = { dataset: {}, style: { setProperty: (name, value) => values.set(name, value), removeProperty: (name) => values.delete(name) } };
  setColorWait(node, ["#111111", "#222222", "#333333", "#444444"]);
  assert.equal(node.dataset.mediaWait, "colors");
  assert.deepEqual([1, 2, 3, 4].map((index) => values.get(`--wait-${index}`)), ["#111111", "#222222", "#333333", "#444444"]);
  assert.match(values.get("--wait-phase"), /^-?\d+(\.\d+)?ms$/);
  clearColorWait(node);
  assert.equal(node.dataset.mediaWait, undefined);
  assert.equal(values.size, 0, "all wait variables are removed");
});

test("detached capacity follows device memory, 4 GB when unknown", () => {
  assert.equal(detachedCapacity(0.5), 8);
  assert.equal(detachedCapacity(2), 8);
  assert.equal(detachedCapacity(4), 24);
  assert.equal(detachedCapacity(8), 48);
  assert.equal(detachedCapacity(undefined), 24);
  assert.equal(detachedCapacity(Number.NaN), 24);
});

test("the detached queue returns the same node and drops the oldest over capacity", () => {
  const queue = createDetachedCards(2);
  const [a, b, c] = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(queue.put("a", a), []);
  assert.deepEqual(queue.put("b", b), []);
  assert.equal(queue.has("a"), true);
  assert.deepEqual(queue.put("c", c), [a], "oldest is evicted");
  assert.equal(queue.take("a"), null);
  assert.equal(queue.take("b"), b, "the very same node comes back");
  assert.equal(queue.take("b"), null, "taking removes it");
  assert.deepEqual(queue.put("c", c), [], "putting again refreshes, no eviction");
  assert.equal(queue.size, 1);
  queue.clear();
  assert.equal(queue.size, 0);
});
