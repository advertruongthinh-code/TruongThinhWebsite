// Shared masonry yard (masonry-reuse step 7): the order in which cards are picked to be really built in one frame.
import assert from "node:assert/strict";
import { test } from "node:test";
import { pickMounts } from "../../src/site/masonry/host.mjs";

const distance = (id) => ({ a: 30, b: 10, c: 20, d: 5 })[id];

test("forced cards always mount, the rest by queue then distance up to the quota", () => {
  const picked = pickMounts({
    missing: ["a", "b", "c", "d"],
    mustMount: (id) => id === "a",
    distance,
    queued: (id) => id === "c",
    quota: () => 2,
  });
  assert.deepEqual([...picked], ["a", "c", "d"]);
});

test("a fast fling mounts only forced cards", () => {
  const picked = pickMounts({ missing: ["a", "b"], mustMount: (id) => id === "b", distance, fast: true, quota: () => 8 });
  assert.deepEqual([...picked], ["b"]);
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
