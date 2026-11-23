import assert from "node:assert/strict";
import test from "node:test";
import { filesToRecords, recordsToSnapshot, snapshotId, snapshotToFiles } from "../../src/cms/projection.mjs";
import { FILE_NAMES, repoFiles } from "./seed.mjs";

const SEED_FIELDS = ["mediaId", "crop", "legacySrc"];
const strip = (value) => JSON.parse(JSON.stringify(value, (key, field) => (SEED_FIELDS.includes(key) ? undefined : field)));
const project = (files) => snapshotToFiles(recordsToSnapshot(filesToRecords(files)));

test("repo files survive files -> records -> snapshot -> files (A5 round trip)", () => {
  const files = repoFiles();
  const projected = project(files);
  for (const name of FILE_NAMES) assert.deepEqual(strip(projected[name]), files[name], name);
  assert.deepEqual(strip(projected["advertising-cards.json"]), files.cards);
  assert.deepEqual(projected["redirects.json"], []);
  assert.deepEqual(project({ ...projected, cards: projected["advertising-cards.json"] }), projected, "projection is stable on its own output");
});

test("every placement gets a media id; card crops, alt reuse and decorative slides keep legacySrc", () => {
  const records = filesToRecords(repoFiles());
  const media = new Map(records.filter(({ type }) => type === "media").map(({ id, data }) => [id, data]));
  assert.ok([...media.keys()].every((id) => /^[a-z0-9][a-z0-9-]{0,79}$/.test(id)));
  const projectRecord = records.find(({ type }) => type === "project").data;
  assert.ok(projectRecord.card.media.every((ref) => ref.legacySrc === ref.src && ref.crop === undefined && media.has(ref.mediaId)));
  assert.deepEqual(projectRecord.cover.crop, [0, 0, media.get(projectRecord.cover.mediaId).width, media.get(projectRecord.cover.mediaId).height]);
  const homeSlide = records.find(({ type, data }) => type === "hero-slide" && data.page === "home").data;
  assert.equal(homeSlide.legacySrc, homeSlide.src);
  assert.ok(media.get(homeSlide.mediaId).altVi);
});

test("snapshotToFiles drops gone project ids, prefixes R2 srcs and requires single records", () => {
  const records = filesToRecords(repoFiles());
  const snapshot = recordsToSnapshot(records.filter(({ type, id }) => !(type === "project" && id === "can-ho-go-soi")));
  snapshot.records.news[0].cover.src = "/v/0123456789abcdef0123456789abcdef/x.webp";
  const files = snapshotToFiles(snapshot, { mediaOrigin: "https://media.example" });
  assert.ok(!files["home-projects.json"].includes("can-ho-go-soi"));
  assert.ok(!files["menu.json"].featuredProjects.includes("can-ho-go-soi"));
  assert.equal(files["news.json"][0].cover.src, "https://media.example/v/0123456789abcdef0123456789abcdef/x.webp");
  delete snapshot.records.menu;
  assert.throws(() => snapshotToFiles(snapshot), /snapshot: missing menu/);
});

test("snapshotId ignores takenAt", async () => {
  const text = (at) => JSON.stringify({ schema: 1, takenAt: at, records: {} });
  assert.match(await snapshotId(text("2026-11-22T10:00:00.000Z")), /^[0-9a-f]{64}$/);
  assert.equal(await snapshotId(text("2026-11-22T10:00:00.000Z")), await snapshotId(text("2026-11-23T00:00:00.000Z")));
});
