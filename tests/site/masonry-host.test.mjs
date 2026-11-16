// Shared masonry yard (masonry-reuse step 7): the order in which cards are picked to be really built in one frame.
import assert from "node:assert/strict";
import { test } from "node:test";
import { pickMounts } from "../../src/site/masonry/host.mjs";

const distance = (id) => ({ a: 30, b: 10, c: 20, d: 5 })[id];

test("forced cards, then cards meeting the viewport, then queued, then by distance, up to the quota", () => {
  const picked = pickMounts({
    missing: ["a", "b", "c", "d"],
    mustMount: (id) => id === "a",
    meets: (id) => id === "b",
    distance,
    queued: (id) => id === "c",
    quota: () => 2,
  });
  assert.deepEqual([...picked], ["a", "b", "c"]);
});

test("queued cards off screen never take the quota from cards meeting the viewport", () => {
  const picked = pickMounts({ missing: ["q1", "q2", "v1"], meets: (id) => id === "v1", distance: () => 1, queued: (id) => id.startsWith("q"), quota: () => 1 });
  assert.deepEqual([...picked], ["v1"]);
});

test("fast mode (more cards meeting the viewport missing than the quota, or a jump) mounts only those, nearest the center first", () => {
  const meets = (id) => id !== "a";
  assert.deepEqual([...pickMounts({ missing: ["a", "b", "c", "d"], meets, distance, quota: () => 2 })], ["d", "b"]);
  assert.deepEqual([...pickMounts({ missing: ["a", "b"], meets, distance, jump: true, quota: () => 8 })], ["b"], "a jump builds no zone card");
  assert.deepEqual([...pickMounts({ missing: ["a", "b"], meets, distance, quota: () => 8 })], ["b", "a"], "otherwise the zone follows");
});

test("mount shows ghosts for cards not allowed, reattaches queued cards and release queues the rest", async () => {
  const { parseHTML } = await import("linkedom");
  const { document } = parseHTML("<div id=root></div>");
  Object.assign(globalThis, { document, requestAnimationFrame: () => 1, cancelAnimationFrame: () => {} });
  const { createMasonryHost } = await import("../../src/site/masonry/host.mjs");
  const created = [];
  const host = createMasonryHost(document.getElementById("root"), {
    create: ({ card }) => {
      created.push(card.id);
      return Object.assign(document.createElement("figure"), { id: card.id });
    },
    detach: (id, node, queue) => {
      node.remove();
      queue?.put(id, node);
    },
    waitColors: () => ["#111111", "#222222", "#333333", "#444444"],
  });
  const place = (id, y) => ({ card: { id }, x: 0, y, pixelWidth: 10, pixelHeight: 10 });
  const placements = [place("a", 0), place("b", 20), place("c", 40)];
  const fresh = host.mount(placements, { allowed: new Set(["a", "b"]) });
  assert.deepEqual(fresh.map(([node]) => node.id), ["a", "b"]);
  assert.ok(host.ghosts.has("c"), "a card past the quota keeps a ghost");
  host.release(new Set(["b"]));
  assert.deepEqual([...host.rendered.keys()], ["b"]);
  assert.ok(host.detached.has("a"), "a released card waits in the queue");
  host.mount(placements);
  assert.deepEqual(created, ["a", "b", "c"], "the queued card is reattached, not created again");
  assert.equal(host.ghosts.has("c"), false, "the mounted card takes its ghost");
  host.release(new Set(), { queue: false });
  assert.equal(host.detached.has("b"), false, "a scope change does not queue");
});
