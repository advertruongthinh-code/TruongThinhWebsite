import assert from "node:assert/strict";
import test from "node:test";
import { createSession, draftKey, listDrafts, wireData } from "../../src/cms/draft-session.mjs";

const memory = (limit = Infinity) => {
  const map = new Map();
  return {
    get length() { return map.size; },
    key: (index) => [...map.keys()][index],
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => { if (value.length > limit) throw Object.assign(new Error("full"), { name: "QuotaExceededError" }); map.set(key, value); },
    removeItem: (key) => map.delete(key),
  };
};
const page = (extra = {}) => ({ id: "bai", layout: "news-2-5", title: { vi: "Bài", en: "Post" }, cover: { mediaId: "m0", crop: [0, 0, 10, 10], src: "/a.webp", width: 10, height: 10 }, blocks: [], ...extra });
const record = (data, version = 4) => ({ type: "news", id: "bai", status: "published", version, pending: 0, data, updatedAt: "2026-11-28T01:00:00Z", updatedBy: "owner@x.vn", variants: [], media: {} });
// A fake admin API: get answers `got`, save answers the next of `saves`.
const fake = (got, ...saves) => {
  const calls = [];
  const call = async (command, args) => {
    calls.push([command, args]);
    if (command === "get") return { status: 200, error: null, data: structuredClone(got.current) };
    const next = saves.shift();
    return next.error ? { status: next.status, error: next.error, data: next.body ?? {} } : { status: next.status, error: null, data: next.body };
  };
  return { call, calls };
};
const open = async (api, storage = memory()) => {
  const session = createSession({ call: api.call, storage });
  await session.open("news", "bai");
  return { session, storage };
};

test("typing in one field is one undo step and one change; another field is another", async () => {
  const api = fake({ current: record(page()) });
  const { session } = await open(api);
  let clock = 0;
  const timed = createSession({ call: api.call, storage: memory(), now: () => clock });
  await timed.open("news", "bai");
  for (const text of ["a", "ab", "abc"]) { clock += 100; timed.mutate((s) => { s.data.title.vi = text; }, { group: "title.vi" }); }
  assert.equal(timed.state.changes, 1);
  timed.mutate((s) => { s.data.title.en = "x"; }, { group: "title.en" });
  assert.equal(timed.state.changes, 2);
  timed.undo();
  assert.equal(timed.state.data.title.en, "Post");
  timed.undo();
  assert.equal(timed.state.data.title.vi, "Bài");
  assert.equal(timed.state.changes, 0);
  assert.equal(session.canUndo(), false);
});

test("a change is a draft on this machine, shown again on reopen, and gone after Bỏ nháp", async () => {
  const api = fake({ current: record(page()) });
  const { session, storage } = await open(api);
  session.mutate((s) => { s.data.title.vi = "Mới"; });
  assert.deepEqual(JSON.parse(storage.getItem(draftKey("news", "bai"))).baseVersion, 4);
  const again = createSession({ call: api.call, storage });
  await again.open("news", "bai");
  assert.equal(again.state.data.title.vi, "Mới");
  assert.equal(again.state.changes, 1);
  assert.deepEqual(listDrafts(storage), [{ type: "news", id: "bai", name: "Mới", changes: 1 }]);
  again.discard();
  assert.deepEqual(listDrafts(storage), []);
});

test("a draft older than the record opens the 409 dialog at once (R8)", async () => {
  const api = fake({ current: record(page({ title: { vi: "Của owner", en: "Owner" } }), 5) });
  const storage = memory();
  storage.setItem(draftKey("news", "bai"), JSON.stringify({ baseVersion: 4, data: page({ title: { vi: "Của tôi", en: "Mine" } }), changes: 2 }));
  const { session } = await open(api, storage);
  assert.equal(session.state.conflict.current.updatedBy, "owner@x.vn");
  assert.equal(session.state.conflict.current.version, 5);
  assert.equal(session.state.data.title.vi, "Của tôi");
});

test("save: each row of the R8 table; the draft stays unless the save went through", async () => {
  const cases = [
    [{ status: 200, body: { version: 5, status: "published", missing: [], pending: 0 } }, "saved", "Đã lưu. Đang đưa lên staging.", false],
    [{ status: 200, body: { version: 5, status: "published", missing: [], pending: 3 } }, "saved", "Đã lưu. Đang xử lý 3 media, xong sẽ tự lên staging.", false],
    [{ status: 200, body: { version: 5, status: "draft", missing: ["a", "b"], pending: 0 } }, "draft", "Đã lưu nháp. Còn thiếu 2 mục.", false],
    [{ status: 400, error: "shape", body: { errors: [{ message: "x" }] } }, "invalid", "Chưa lưu được: có chỗ chưa hợp lệ.", true],
    [{ status: 400, error: "missing", body: { missing: [{ message: "x" }] } }, "invalid", "Chưa lưu được: còn thiếu 1 mục.", true],
    [{ status: 409, error: "slug" }, "slug", "Link này đã có bài khác dùng.", true],
    [{ status: 403, error: "forbidden" }, "forbidden", "Tài khoản không có quyền này.", true],
    [{ status: 429, error: "unavailable" }, "retry", "Chưa lưu được, nháp vẫn ở máy này. Thử lại sau.", true],
    [{ status: 503, error: "unavailable" }, "retry", "Chưa lưu được, nháp vẫn ở máy này. Thử lại sau.", true],
    [{ status: 0, error: "offline" }, "retry", "Chưa lưu được, nháp vẫn ở máy này. Thử lại sau.", true],
  ];
  for (const [answer, kind, message, kept] of cases) {
    const api = fake({ current: record(page()) }, answer);
    const { session, storage } = await open(api);
    session.mutate((s) => { s.data.title.vi = "Mới"; });
    const result = await session.save();
    assert.equal(result.kind, kind, JSON.stringify(answer));
    assert.equal(result.message, message);
    assert.equal(storage.getItem(draftKey("news", "bai")) !== null, kept, JSON.stringify(answer));
  }
});

test("409 version: the draft survives; Giữ bản của tôi saves again on the new version", async () => {
  const api = fake({ current: record(page()) },
    { status: 409, error: "version", body: { current: { version: 5, data: page(), updatedBy: "owner@x.vn", updatedAt: "2026-11-28T02:00:00Z" } } },
    { status: 200, body: { version: 6, status: "published", missing: [], pending: 0 } });
  const { session, storage } = await open(api);
  session.mutate((s) => { s.data.title.vi = "Của nhân viên"; });
  assert.equal((await session.save()).kind, "conflict");
  assert.equal(session.state.conflict.current.updatedBy, "owner@x.vn");
  assert.notEqual(storage.getItem(draftKey("news", "bai")), null);
  const kept = await session.resolve("keep");
  assert.equal(kept.kind, "saved");
  assert.equal(api.calls.filter(([command]) => command === "save").at(-1)[1].body.version, 5);
  assert.equal(storage.getItem(draftKey("news", "bai")), null);
});

test("a full storage says so and keeps the change in memory", async () => {
  const api = fake({ current: record(page()) });
  const { session } = await open(api, memory(10));
  session.mutate((s) => { s.data.title.vi = "Mới"; });
  assert.equal(session.state.storageFull, true);
  assert.equal(session.state.data.title.vi, "Mới");
});

test("the save body keeps only mediaId and crop of a placement, and seeded ones as they are", () => {
  const data = page({ blocks: [{ id: "a", type: "media-single", position: "wide", image: { mediaId: "m1", crop: [0, 0, 3, 2], src: "/v/k/m1.webp", width: 3, height: 2, altVi: "a", altEn: "b" } },
    { id: "b", type: "media-single", position: "wide", image: { mediaId: "m2", legacySrc: "/assets/content/x.webp", src: "/assets/content/x.webp", width: 3, height: 2, altVi: "a", altEn: "b" } }] });
  const wire = wireData("news", data);
  assert.deepEqual(wire.blocks[0].image, { mediaId: "m1", crop: [0, 0, 3, 2] });
  assert.equal(wire.blocks[1].image.legacySrc, "/assets/content/x.webp");
  assert.deepEqual(wire.cover, { mediaId: "m0", crop: [0, 0, 10, 10] });
});

test("a media list the layout cannot hold blocks the save instead of losing media", async () => {
  const api = fake({ current: record(page()) });
  const { session } = await open(api);
  const item = (n) => ({ image: { mediaId: `m${n}`, crop: [0, 0, 1200, 800] } });
  session.setMedia(Array.from({ length: 6 }, (_, n) => item(n)));
  assert.equal(session.fit(), "over-max");
  assert.equal((await session.save()).kind, "fit");
  session.setMedia(Array.from({ length: 6 }, (_, n) => item(n)), "news-6-11");
  assert.equal(session.fit(), null);
  assert.equal(session.state.data.layout, "news-6-11");
});

test("edits typed while a save is in flight stay as a new draft on the saved version", async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const calls = [];
  const call = async (command) => {
    calls.push(command);
    if (command === "get") return { status: 200, error: null, data: structuredClone(record(page(), calls.includes("save") ? 5 : 4)) };
    await gate;
    return { status: 200, error: null, data: { version: 5, status: "published", missing: [], pending: 0 } };
  };
  const storage = memory();
  const session = createSession({ call, storage });
  await session.open("news", "bai");
  session.mutate((s) => { s.data.title.vi = "Một"; });
  const saving = session.save();
  session.mutate((s) => { s.data.title.vi = "Hai"; }); // typed while the request is out
  release();
  assert.equal((await saving).kind, "saved");
  assert.equal(session.state.data.title.vi, "Hai");
  assert.equal(session.state.changes, 1);
  assert.equal(session.state.baseVersion, 5);
  assert.equal(JSON.parse(storage.getItem(draftKey("news", "bai"))).data.title.vi, "Hai");
});

test("an edit that throws leaves the data, the change count and the undo stack as they were", async () => {
  const api = fake({ current: record(page()) });
  const { session } = await open(api);
  assert.throws(() => session.mutate((s) => { s.data.title.vi = "x"; throw new Error("boom"); }), /boom/);
  assert.equal(session.state.data.title.vi, "Bài");
  assert.equal(session.state.changes, 0);
  assert.equal(session.canUndo(), false);
});

test("a media record picked in the library comes back with the draft", async () => {
  const api = fake({ current: record(page()) });
  const { session, storage } = await open(api);
  session.addMediaRecord({ id: "m9", width: 100, height: 80, altVi: "a", altEn: "a" });
  session.mutate((s) => { s.data.cover = { mediaId: "m9" }; });
  const again = createSession({ call: api.call, storage });
  await again.open("news", "bai");
  assert.equal(again.state.mediaById.get("m9").width, 100);
});

test("on a legacy page a media change blocks the save until a layout takes it", async () => {
  const legacy = page({ layout: "legacy", blocks: [{ id: "a", type: "media-single", position: "wide", image: { mediaId: "m1", crop: [0, 0, 10, 10] } }] });
  const api = fake({ current: record(legacy) });
  const { session } = await open(api);
  assert.equal(session.fit(), null);
  session.setMedia([]);
  assert.ok(session.fit(), "the blocks still hold the removed media");
  assert.equal((await session.save()).kind, "fit");
});
