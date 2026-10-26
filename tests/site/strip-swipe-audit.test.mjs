import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { test } from "node:test";

const source = readFileSync(new URL("../../src/site/advertising-products/catalog-runtime.mjs", import.meta.url), "utf8");
const start = source.indexOf("function trackStripSwipe(");
const end = source.indexOf("function syncJustViewedMarker(", start);
const trackSwipe = runInNewContext(`${source.slice(start, end)}; trackStripSwipe`);

test("a short horizontal swipe without pointermove advances once", () => {
  const handlers = new Map();
  const releases = [];
  trackSwipe({ addEventListener: (type, handler) => handlers.set(type, handler) }, {
    width: () => 300, canStep: () => true, drag() {}, release: (step) => releases.push(step),
  });
  const down = { isPrimary: true, pointerId: 1, clientX: 100, clientY: 100, timeStamp: 0 };
  handlers.get("pointerdown")(down);
  handlers.get("pointerup")({ ...down, clientX: 80, timeStamp: 100 });
  assert.deepEqual(releases, [1]);
  handlers.get("pointerdown")(down);
  handlers.get("pointerup")({ ...down, clientX: 105, timeStamp: 100 });
  assert.deepEqual(releases, [1], "a tap must not advance");
  handlers.get("pointerdown")(down);
  handlers.get("pointermove")({ ...down, clientY: 130, timeStamp: 30 });
  handlers.get("pointerup")({ ...down, clientX: 80, clientY: 140, timeStamp: 100 });
  assert.deepEqual(releases, [1], "vertical scrolling must not advance");
});
