import assert from "node:assert/strict";
import { test } from "node:test";
import { planDetourPath, segmentCrossesBox } from "../../src/site/advertising-products/detour-path.mjs";

// Fixture cố định: primary 3 cột ở 1569px, card một cột.
const zone = { width: 1140, height: 640 };
const size = { width: 370, height: 300 };
const besideTop = { x: 1155, y: 0 };
const besideLow = { x: 1155, y: 700 };
const belowLeft = { x: 0, y: 655 };
const belowMid = { x: 385, y: 990 };
const box = { minX: -size.width, maxX: zone.width, minY: -size.height, maxY: zone.height };

const inside = (point) => point.x > box.minX && point.x < box.maxX && point.y > box.minY && point.y < box.maxY;
const samples = (a, b) => Array.from({ length: 51 }, (_, i) => ({ x: a.x + (b.x - a.x) * i / 50, y: a.y + (b.y - a.y) * i / 50 }));

test("cột cạnh primary xuống dưới primary đi qua góc (x cũ, y mới)", () => {
  const plan = planDetourPath({ from: besideTop, to: belowLeft, size, zone });
  assert.deepEqual(plan.corner, { x: besideTop.x, y: belowLeft.y });
});

test("dưới primary lên cột cạnh primary đi qua góc (x mới, y cũ)", () => {
  const plan = planDetourPath({ from: belowMid, to: besideTop, size, zone });
  assert.deepEqual(plan.corner, { x: besideTop.x, y: belowMid.y });
});

test("cùng bên cạnh hoặc cùng phía dưới thì đi thẳng", () => {
  assert.equal(planDetourPath({ from: besideTop, to: besideLow, size, zone }), null);
  assert.equal(planDetourPath({ from: belowLeft, to: belowMid, size, zone }), null);
});

test("đường thẳng không cắt vùng cấm thì đi thẳng dù khác phía", () => {
  // Cột 4 đã ở dưới đáy primary: đoạn sang trái không đi vào hộp.
  assert.equal(planDetourPath({ from: { x: 1155, y: 1000 }, to: belowLeft, size, zone }), null);
});

test("không có zone thì đi thẳng", () => {
  assert.equal(planDetourPath({ from: besideTop, to: belowLeft, size, zone: null }), null);
});

test("hai đoạn của mọi đường vòng nằm ngoài vùng cấm", () => {
  const pairs = [[besideTop, belowLeft], [belowLeft, besideTop], [besideTop, belowMid], [belowMid, besideTop],
    [{ x: 1155, y: 300 }, { x: 0, y: 655 }]];
  for (const [from, to] of pairs) {
    const plan = planDetourPath({ from, to, size, zone });
    assert.ok(plan, `${JSON.stringify(from)} -> ${JSON.stringify(to)} cần đi vòng`);
    for (const point of [...samples(from, plan.corner), ...samples(plan.corner, to)]) {
      assert.equal(inside(point), false, `${JSON.stringify(point)} nằm trong vùng cấm`);
    }
  }
});

test("cornerOffset theo tỷ lệ độ dài hai đoạn", () => {
  const plan = planDetourPath({ from: besideTop, to: belowLeft, size, zone });
  const first = belowLeft.y - besideTop.y;
  const second = besideTop.x - belowLeft.x;
  assert.ok(Math.abs(plan.cornerOffset - first / (first + second)) < 1e-9);
});

test("segmentCrossesBox: chạm mép không tính, đi xuyên thì tính", () => {
  const unit = { minX: 0, maxX: 10, minY: 0, maxY: 10 };
  assert.equal(segmentCrossesBox({ x: 10, y: -5 }, { x: 10, y: 15 }, unit), false);
  assert.equal(segmentCrossesBox({ x: -5, y: 0 }, { x: 15, y: 0 }, unit), false);
  assert.equal(segmentCrossesBox({ x: -5, y: 5 }, { x: 15, y: 5 }, unit), true);
  assert.equal(segmentCrossesBox({ x: -5, y: -5 }, { x: 15, y: 15 }, unit), true);
  assert.equal(segmentCrossesBox({ x: 11, y: 0 }, { x: 20, y: 20 }, unit), false);
});

test("điểm đầu trong vùng cấm hoặc from === to thì trả null, không ném lỗi", () => {
  assert.equal(planDetourPath({ from: { x: 400, y: 200 }, to: belowMid, size, zone }), null);
  assert.equal(planDetourPath({ from: besideTop, to: besideTop, size, zone }), null);
});
