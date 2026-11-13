import assert from "node:assert/strict";
import test from "node:test";
import { createMediaQueue } from "../../src/site/media-lib/media-queue.mjs";

// A loader whose files finish only when the test says so.
function manualLoader() {
  const pending = new Map();
  const started = [];
  const load = (url) => new Promise((resolve, reject) => {
    started.push(url);
    pending.set(url, { resolve, reject });
  });
  const end = async (url, ok = true) => {
    const { resolve, reject } = pending.get(url);
    pending.delete(url);
    ok ? resolve() : reject(new Error(url));
    await new Promise((done) => setImmediate(done));
  };
  return { load, started, end };
}

test("media queue caps shared downloads and starts the nearest first", async () => {
  const loader = manualLoader();
  const queue = createMediaQueue({ limit: 2, load: loader.load });
  ["far", "near", "mid"].forEach((url, index) => queue.load(url, { rank: [3, 1, 2][index] }));
  assert.deepEqual(loader.started, ["far", "near"], "first two requests start at once, the third waits");
  queue.load("closest", { rank: 0 });
  await loader.end("far");
  assert.deepEqual(loader.started, ["far", "near", "closest"], "a freed slot goes to the nearest waiting file");
  assert.equal(queue.running(), 2);
});

test("the media being viewed takes its own slot past the cap and the latest view goes first", async () => {
  const loader = manualLoader();
  const queue = createMediaQueue({ limit: 1, load: loader.load });
  queue.load("a", { rank: 1 });
  queue.load("b", { rank: 1 });
  queue.load("view-1", { current: true });
  assert.deepEqual(loader.started, ["a", "view-1"], "viewed media starts while the shared slot is busy");
  queue.load("view-2", { current: true });
  queue.load("view-3", { current: true });
  assert.equal(queue.running(), 2, "at most cap + 1 downloads run");
  await loader.end("view-1");
  assert.deepEqual(loader.started.at(-1), "view-3", "the latest viewed media takes the freed viewing slot");
});

test("started downloads are never restarted, a repeat request shares the promise, a failure can be asked again", async () => {
  const loader = manualLoader();
  const queue = createMediaQueue({ limit: 4, load: loader.load });
  const first = queue.load("x");
  assert.equal(queue.load("x", { current: true }), first);
  assert.deepEqual(loader.started, ["x"]);
  await loader.end("x", false);
  await assert.rejects(first);
  queue.load("x");
  assert.deepEqual(loader.started, ["x", "x"]);
  await loader.end("x");
  assert.equal(queue.loaded("x"), true);
});
