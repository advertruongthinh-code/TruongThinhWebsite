// Client logo type (cms-plan part 2 K9, E8): seed media are SVG sized from the viewBox; SVG media only go into logos.
import assert from "node:assert/strict";
import test from "node:test";
import { fullErrors, shapeErrors } from "../../src/cms/contract.mjs";
import { materialize } from "../../src/cms/media-ref.mjs";
import { filesToRecords, recordsToSnapshot, snapshotToFiles } from "../../src/cms/projection.mjs";
import { repoFiles } from "./seed.mjs";

const records = filesToRecords(repoFiles());
const mediaById = new Map(records.filter(({ type }) => type === "media").map(({ id, data }) => [id, data]));
const logos = records.filter(({ type }) => type === "client-logo");
const codes = async (type, data) => (await shapeErrors(type, data, { mediaById })).map(({ code }) => code);

test("seed: 12 logos in order, each on an SVG repo media sized from its viewBox and named by the logo", () => {
  assert.equal(logos.length, 12);
  assert.deepEqual(logos.map(({ position }) => position), [...logos.keys()]);
  const bcj = logos[0].data;
  assert.deepEqual(Object.keys(bcj).toSorted(), ["id", "mediaId", "name", "src", "viewBox"]);
  assert.deepEqual(mediaById.get(bcj.mediaId), { ...mediaById.get(bcj.mediaId), mime: "image/svg+xml", source: "repo", path: bcj.src, width: 50, height: 30, viewBox: "0 0 49.86 29.51", altVi: "BCJ", altEn: "BCJ" });
});

test("snapshot: client-logos.json has order from position and media-origin srcs for R2 logos", () => {
  const snapshot = recordsToSnapshot(records);
  snapshot.records["client-logo"] = [snapshot.records["client-logo"][1], { ...snapshot.records["client-logo"][0], src: "/v/k/bcj.svg" }];
  assert.deepEqual(snapshotToFiles(snapshot, { mediaOrigin: "https://media.example" })["client-logos.json"].map(({ id, src, order }) => [id, src, order]),
    [["beinco", "/assets/content/client-logos/beinco.svg", 1], ["bcj", "https://media.example/v/k/bcj.svg", 2]]);
});

test("contract: SVG only in logos, a logo only on SVG, no crop, name required", async () => {
  const logo = logos[0].data;
  const photo = [...mediaById.values()].find(({ mime }) => mime === "image/webp");
  assert.deepEqual(await codes("client-logo", logo), []);
  assert.deepEqual(await fullErrors("client-logo", logo), []);
  assert.deepEqual(await codes("client-logo", { ...logo, mediaId: photo.id }), ["media-kind"]);
  const slide = records.find(({ type }) => type === "hero-slide").data;
  assert.deepEqual(await codes("hero-slide", { ...slide, legacySrc: undefined, mediaId: logo.mediaId }), ["media-kind"]);
  assert.deepEqual(await codes("client-logo", { ...logo, crop: [0, 0, 1, 1] }), ["crop"]);
  assert.deepEqual(await codes("client-logo", { ...logo, name: 1 }), ["logo-name"]);
  assert.deepEqual((await fullErrors("client-logo", { ...logo, name: " " })).map(({ level }) => level), ["missing"]);
});

test("materialize: a logo gets src and viewBox from its media, adds no crop or alt", async () => {
  const logo = logos[0].data;
  const repo = await materialize("client-logo", { ...logo, src: "/x.svg", viewBox: "0 0 1 1", crop: [0, 0, 1, 1] }, mediaById);
  assert.deepEqual(repo.data, { ...logo, crop: [0, 0, 1, 1] });
  const uploaded = new Map([[logo.mediaId, { ...mediaById.get(logo.mediaId), source: "r2", hash: "abc" }]]);
  const r2 = await materialize("client-logo", logo, uploaded);
  assert.match(r2.data.src, /^\/v\/[0-9a-f]{32}\/bcj\.svg$/);
  assert.deepEqual(Object.keys(r2.data).toSorted(), ["id", "mediaId", "name", "src", "viewBox"]);
});
