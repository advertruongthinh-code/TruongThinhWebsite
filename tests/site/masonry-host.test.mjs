// Sân masonry dùng chung (masonry-reuse bước 7): thứ tự chọn card dựng thật trong một frame.
import assert from "node:assert/strict";
import { test } from "node:test";
import { pickMounts } from "../../src/site/advertising-products/masonry-host.mjs";

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
