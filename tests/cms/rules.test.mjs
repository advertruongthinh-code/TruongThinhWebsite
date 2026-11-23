// Cross-record rules of the CMS (cms-plan part 2 K10, E10): each rule passes once and fails once; the repo data passes all.
import assert from "node:assert/strict";
import test from "node:test";
import { altDuplicate, crossErrors, mayShare, missingRatioClasses, poolEntry, poolLoss } from "../../src/cms/rules.mjs";
import { fullErrors } from "../../src/cms/contract.mjs";
import { mediaRefs } from "../../src/cms/media-ref.mjs";
import { seed } from "./seed.mjs";

const codes = (errors) => errors.map(({ code, level }) => `${code} ${level}`);
const photo = (id, extra = {}) => [id, { id, kind: "image", source: "r2", width: 1200, height: 800, mime: "image/webp", ...extra }];
const mediaById = new Map([photo("anh-a"), photo("anh-b"), photo("placeholder-ngang", { source: "repo", path: "/assets/content/shared/placeholder-ngang.webp" })]);
const news = (blocks) => ({ id: "bai", blocks });
const single = (mediaId) => ({ type: "media-single", position: "wide", image: { mediaId } });

test("media-reuse: a photo of another news, project or standard page is missing; placeholders and non-page users are fine", () => {
  const usage = new Map([["anh-a", [{ type: "project", id: "nha-pho" }]], ["anh-b", [{ type: "hero-slide", id: "slide-1" }]], ["placeholder-ngang", [{ type: "news", id: "khac" }]]]);
  assert.deepEqual(codes(crossErrors("news", "bai", news([single("anh-a")]), { mediaById, usage })), ["media-reuse missing"]);
  assert.deepEqual(crossErrors("news", "bai", news([single("placeholder-ngang")]), { mediaById, usage }), []);
  assert.deepEqual(codes(crossErrors("news", "bai", news([single("anh-b")]), { mediaById, usage })), ["media-reuse missing"], "a news photo stays on its page");
  assert.deepEqual(crossErrors("page-copy", "home", { id: "home", slots: { "hero.image": { mediaId: "anh-b" } } }, { mediaById, usage }), [], "a standard page may share a hero slide photo");
  // A standard page may not reuse another standard page's photo, and a hero slide may not take a project photo.
  const pages = new Map([["anh-b", [{ type: "page-copy", id: "residential" }]]]);
  assert.deepEqual(codes(crossErrors("page-copy", "home", { id: "home", slots: { "hero.image": { mediaId: "anh-b" } } }, { mediaById, usage: pages })), ["media-reuse missing"]);
  assert.deepEqual(codes(crossErrors("hero-slide", "slide-2", { id: "slide-2", mediaId: "anh-a" }, { mediaById, usage })), ["media-reuse missing"]);
  assert.equal(mayShare("other", "page"), true);
  assert.equal(mayShare("page", "page"), false);
});

const card = (id, ratio, keys, productIds = ["kiosk"]) => ({ id, clusters: productIds, ratio, keys: new Set(keys) });

test("pool-dup: a card may not reuse the src or sourceId of another published card", () => {
  const data = { id: "moi", productIds: [], media: { src: "/v/a.webp", width: 2, height: 3 }, mediaItems: [{ src: "/v/a.webp", sourceId: "s-1" }] };
  assert.deepEqual(codes(crossErrors("advertising-card", "moi", data, { pool: [card("cu", 1, ["s-1"])] })), ["pool-dup missing"]);
  assert.deepEqual(crossErrors("advertising-card", "moi", data, { pool: [card("cu", 1, ["s-2"]), card("moi", 1, ["s-1"])] }), []);
});

test("pool-min: a cluster may not lose a ratio class it had; a pool already short does not block", async () => {
  const clusters = [{ id: "kiosk" }];
  const full = [card("p", 0.6, []), card("s", 1, []), card("l", 1.5, [])];
  assert.deepEqual(missingRatioClasses([0.6, 1, 1.5]), []);
  assert.deepEqual(poolLoss(full, "p", null, clusters), ["kiosk missing portrait ratio", "kiosk missing extreme ratio"]);
  assert.deepEqual(poolLoss(full, "s", null, clusters), ["kiosk missing near-square ratio"]);
  assert.deepEqual(poolLoss(full, "p", card("p", 0.5, []), clusters), []);
  assert.deepEqual(poolLoss(full.slice(1), "s", null, clusters), ["kiosk missing near-square ratio"]);
  assert.deepEqual(poolLoss([card("s", 1, [])], "x", null, clusters), []);
  // On save the card's new ratio replaces its stored one (cluster from its main product's taxonomy entry).
  const product = (await import("../../src/site/advertising-products/taxonomy.mjs")).ADVERTISING_PRODUCTS[0];
  const stored = [card("p", 0.6, [], [product.cluster]), card("s", 1, [], [product.cluster]), card("l", 1.5, [], [product.cluster])];
  const resaved = { id: "p", productIds: [product.id], media: { width: 1, height: 1 } };
  assert.deepEqual(codes(crossErrors("advertising-card", "p", resaved, { pool: stored })), ["pool-min missing", "pool-min missing"]);
  assert.deepEqual(crossErrors("advertising-card", "p", { ...resaved, media: { width: 1, height: 2 } }, { pool: stored }), []);
  assert.deepEqual(poolEntry({ id: "c", productIds: ["unknown"], media: { width: 3, height: 2, src: "a", sourceId: "b" } }), { id: "c", clusters: [], ratio: 1.5, keys: new Set(["a", "b"]) });
});

test("alt-dup: two media of one card with the same alt are missing; the same media twice is one media", () => {
  const item = (id, altVi, altEn = `${altVi} en`) => ({ mediaId: id, altVi, altEn });
  const project = (media) => ({ id: "p", card: { media } });
  assert.deepEqual(codes(crossErrors("project", "p", project([item("a", "Bếp"), item("b", "Bếp", "Other")]))), ["alt-dup missing"]);
  assert.deepEqual(crossErrors("project", "p", project([item("a", "Bếp"), item("a", "Bếp")])), []);
  assert.equal(altDuplicate("c", [{ id: "x", altVi: "a", altEn: "b" }, { id: "y", altVi: "c", altEn: "b" }]), 'c media x and y share alt "b"');
  // The build message of an Advertising card is the same text, so fullErrors lists it once, with its code.
  const ad = { id: "c", mediaItems: [{ id: "x", altVi: "a", altEn: "b" }, { id: "y", altVi: "c", altEn: "b" }] };
  assert.deepEqual(codes(crossErrors("advertising-card", "c", ad)), ["alt-dup missing"]);
});

test("link-target: a page link to a record or key that does not exist is missing, in text and in the menu", () => {
  const text = (vi) => ({ id: "bai", blocks: [{ type: "paragraph", text: { vi, en: vi } }] });
  const ctx = { projects: new Map([["nha-pho", { id: "nha-pho" }]]), news: new Map() };
  assert.deepEqual(crossErrors("news", "bai", text("Xem [nhà](page:project/nha-pho) và [web](https://example.com)."), ctx), []);
  assert.deepEqual(codes(crossErrors("news", "bai", text("Xem [nhà](page:project/da-xoa)."), ctx)), ["link-target missing"]);
  assert.deepEqual(crossErrors("news", "bai", text("Gọi [Zalo](contact:zalo)."), ctx), [], "an empty contact channel renders disabled, not checked here");
  const group = (link) => ({ title: { vi: "a", en: "a" }, link, items: [] });
  const menu = (link) => ({ groups: [group(link), ...Array.from({ length: 5 }, () => group("page:home"))] });
  assert.deepEqual(crossErrors("menu", "main", menu("page:news"), ctx), []);
  assert.deepEqual(codes(crossErrors("menu", "main", menu("page:news/da-xoa"), ctx)), ["link-target missing"]);
});

test("the repo data passes every cross-record rule (seed must save as published)", async () => {
  const { records, ctx } = seed();
  const usage = new Map();
  for (const { type, id, data } of records.filter((record) => record.type !== "media")) {
    for (const ref of mediaRefs(type, data).filter((each) => typeof each.mediaId === "string")) usage.set(ref.mediaId, [...(usage.get(ref.mediaId) ?? []), { type, id }]);
  }
  const pool = records.filter(({ type }) => type === "advertising-card").map(({ data }) => poolEntry(data));
  for (const { type, id, data } of records.filter((record) => record.type !== "media")) {
    assert.deepEqual(crossErrors(type, id, data, { ...ctx, usage, pool }), [], `${type} ${id}`);
    assert.deepEqual((await fullErrors(type, data, { ...ctx, id, usage, pool })).filter(({ code }) => code), [], `${type} ${id}`);
  }
});
