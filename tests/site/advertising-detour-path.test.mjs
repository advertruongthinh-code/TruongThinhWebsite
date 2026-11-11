import assert from "node:assert/strict";
import { test } from "node:test";
import { planAroundPinned, planDetourPath, segmentCrossesBox } from "../../src/site/masonry/detour-path.mjs";

// Fixed fixture: primary 3 columns at 1569px, one-column cards.
const zone = { width: 1140, height: 640 };
const size = { width: 370, height: 300 };
const besideTop = { x: 1155, y: 0 };
const besideLow = { x: 1155, y: 700 };
const belowLeft = { x: 0, y: 655 };
const belowMid = { x: 385, y: 990 };
const box = { minX: -size.width, maxX: zone.width, minY: -size.height, maxY: zone.height };

const inside = (point) => point.x > box.minX && point.x < box.maxX && point.y > box.minY && point.y < box.maxY;
const samples = (a, b) => Array.from({ length: 51 }, (_, i) => ({ x: a.x + (b.x - a.x) * i / 50, y: a.y + (b.y - a.y) * i / 50 }));

test("column beside primary down to below primary passes through the corner (old x, new y)", () => {
  const plan = planDetourPath({ from: besideTop, to: belowLeft, size, zone });
  assert.deepEqual(plan.corner, { x: besideTop.x, y: belowLeft.y });
});

test("below primary up to the column beside primary passes through the corner (new x, old y)", () => {
  const plan = planDetourPath({ from: belowMid, to: besideTop, size, zone });
  assert.deepEqual(plan.corner, { x: besideTop.x, y: belowMid.y });
});

test("same side column or same below position goes straight", () => {
  assert.equal(planDetourPath({ from: besideTop, to: besideLow, size, zone }), null);
  assert.equal(planDetourPath({ from: belowLeft, to: belowMid, size, zone }), null);
});

test("a straight line that does not cross the forbidden zone goes straight even on a different side", () => {
  // Column 4 is already below the primary's bottom: the leftward segment does not enter the box.
  assert.equal(planDetourPath({ from: { x: 1155, y: 1000 }, to: belowLeft, size, zone }), null);
});

test("no zone goes straight", () => {
  assert.equal(planDetourPath({ from: besideTop, to: belowLeft, size, zone: null }), null);
});

test("both segments of every detour lie outside the forbidden zone", () => {
  const pairs = [[besideTop, belowLeft], [belowLeft, besideTop], [besideTop, belowMid], [belowMid, besideTop],
    [{ x: 1155, y: 300 }, { x: 0, y: 655 }]];
  for (const [from, to] of pairs) {
    const plan = planDetourPath({ from, to, size, zone });
    assert.ok(plan, `${JSON.stringify(from)} -> ${JSON.stringify(to)} needs a detour`);
    for (const point of [...samples(from, plan.corner), ...samples(plan.corner, to)]) {
      assert.equal(inside(point), false, `${JSON.stringify(point)} lies inside the forbidden zone`);
    }
  }
});

test("cornerOffset follows the length ratio of the two segments", () => {
  const plan = planDetourPath({ from: besideTop, to: belowLeft, size, zone });
  const first = belowLeft.y - besideTop.y;
  const second = besideTop.x - belowLeft.x;
  assert.ok(Math.abs(plan.cornerOffset - first / (first + second)) < 1e-9);
});

test("segmentCrossesBox: touching the edge does not count, passing through does", () => {
  const unit = { minX: 0, maxX: 10, minY: 0, maxY: 10 };
  assert.equal(segmentCrossesBox({ x: 10, y: -5 }, { x: 10, y: 15 }, unit), false);
  assert.equal(segmentCrossesBox({ x: -5, y: 0 }, { x: 15, y: 0 }, unit), false);
  assert.equal(segmentCrossesBox({ x: -5, y: 5 }, { x: 15, y: 5 }, unit), true);
  assert.equal(segmentCrossesBox({ x: -5, y: -5 }, { x: 15, y: 15 }, unit), true);
  assert.equal(segmentCrossesBox({ x: 11, y: 0 }, { x: 20, y: 20 }, unit), false);
});

test("a start point inside the forbidden zone or from === to returns null, no throw", () => {
  assert.equal(planDetourPath({ from: { x: 400, y: 200 }, to: belowMid, size, zone }), null);
  assert.equal(planDetourPath({ from: besideTop, to: besideTop, size, zone }), null);
});

test("forbidden zone with an offset origin (suggestion pinned below primary): corner computed in grid coordinates", () => {
  const origin = { x: 0, y: 500 };
  const suggestion = { width: 170, height: 260 };
  const card = { width: 170, height: 200 };
  const beside = { x: 186, y: 500 };
  const below = { x: 0, y: 776 };
  const plan = planDetourPath({ from: beside, to: below, size: card, zone: suggestion, origin });
  assert.deepEqual(plan.corner, { x: beside.x, y: below.y });
  assert.equal(planDetourPath({ from: below, to: { x: 0, y: 1000 }, size: card, zone: suggestion, origin }), null);
});

// One rule set for every pinned item (masonry-reuse step 6): related cards and the CTA batch frame both call planAroundPinned.
test("pinned items: a start point inside primary and then inside suggestion moves below both; detour around the first box it crosses", () => {
  const primary = { x: 0, y: 0, width: 356, height: 500 };
  const suggestion = { x: 0, y: 516, width: 170, height: 260 };
  const card = { width: 170, height: 200 };
  // Primary grows over the old spot: starting below primary lands in suggestion, so move further below suggestion.
  const pushed = planAroundPinned({ from: { x: 0, y: 300 }, to: { x: 0, y: 1200 }, size: card, pinned: [primary, suggestion], gap: 16 });
  assert.deepEqual(pushed.from, { x: 0, y: 792 });
  assert.equal(pushed.plan, null);
  // From beside primary down to below suggestion: detour around primary first (list order).
  const around = planAroundPinned({ from: { x: 372, y: 0 }, to: { x: 0, y: 792 }, size: card, pinned: [primary, suggestion], gap: 16 });
  assert.deepEqual(around.plan.corner, { x: 372, y: 792 });
  // No pinned items: go straight.
  assert.equal(planAroundPinned({ from: { x: 372, y: 0 }, to: { x: 0, y: 792 }, size: card, pinned: [] }).plan, null);
});
