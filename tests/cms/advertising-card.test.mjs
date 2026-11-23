// Advertising card in the CMS contract and projection (cms-plan part 2 K6, task E5): node --test tests/cms/advertising-card.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { deriveCard, fullErrors, shapeErrors } from "../../src/cms/contract.mjs";
import { snapshotToFiles } from "../../src/cms/projection.mjs";
import { ADVERTISING_CLUSTERS, ADVERTISING_PRODUCTS } from "../../src/site/advertising-products/taxonomy.mjs";

const cards = JSON.parse(readFileSync(new URL("../../src/site/content/advertising-cards.json", import.meta.url), "utf8"));
const card = structuredClone(cards[0]);
const legacySlugOf = (productId) => ADVERTISING_CLUSTERS.find(({ id }) => id === ADVERTISING_PRODUCTS.find((product) => product.id === productId).cluster).legacySlug;

test("deriveCard keeps a stored category and productKey, and derives them for a new card", () => {
  const stored = cards.find((item) => item.category !== legacySlugOf(item.productIds[0]));
  assert.ok(stored, "a seeded card sits outside its main product's cluster");
  assert.equal(deriveCard(stored).category, stored.category);
  const { category: _c, productKey: _p, ...fresh } = structuredClone(stored);
  const derived = deriveCard({ ...fresh, id: "cms-new" });
  assert.equal(derived.category, legacySlugOf(stored.productIds[0]));
  assert.equal(derived.productKey, `${derived.category}-product-cms-new`);
  assert.equal(derived.tagIds[0], `group-${derived.category}`);
  assert.equal(derived.tagIds.filter((tag) => tag.startsWith("group-")).length, 1);
});

test("deriveCard adds a framing tag from the cover ratio only when the card has none", () => {
  const withRatio = (width, height) => deriveCard({ ...card, tagIds: card.tagIds.filter((tag) => !tag.startsWith("format-")),
    coverMediaId: "m", mediaItems: [{ id: "m", width, height }] }).tagIds.filter((tag) => tag.startsWith("format-"));
  assert.deepEqual(withRatio(1000, 1500), ["format-portrait"]);
  assert.deepEqual(withRatio(1000, 1000), ["format-square"]);
  assert.deepEqual(withRatio(1500, 1000), ["format-landscape"]);
  const authored = cards.find((item) => item.tagIds.includes("format-square") && item.media.width / item.media.height > 1.1);
  assert.ok(authored.tagIds.includes("format-square") && deriveCard(authored).tagIds.includes("format-square"), "an authored framing tag stays");
  assert.ok(!deriveCard(authored).tagIds.includes("format-landscape"));
});

test("a card without a known main product is a shape error; empty tagIds is a missing error", async () => {
  const shape = await shapeErrors("advertising-card", { ...card, productIds: ["nope/nope"] });
  assert.ok(shape.some((error) => error.code === "card-product"), JSON.stringify(shape));
  assert.ok(!(await shapeErrors("advertising-card", card)).some((error) => error.code === "card-product"));
  const full = await fullErrors("advertising-card", { ...card, tagIds: [] });
  assert.ok(full.some((error) => error.level === "missing" && /needs tagIds/.test(error.message)), JSON.stringify(full));
  assert.ok(!(await fullErrors("advertising-card", card)).some((error) => /needs tagIds/.test(error.message)));
});

test("snapshotToFiles renumbers sourceOrder by position within each category and drops CMS placement fields", () => {
  const a = { ...structuredClone(card), id: "a", category: "x", sourceOrder: 7, media: { ...card.media, mediaId: "m1", crop: [0, 0, 1, 1] } };
  const b = { ...structuredClone(card), id: "b", category: "y", sourceOrder: 3 };
  const c = { ...structuredClone(card), id: "c", category: "x", sourceOrder: 0 };
  const records = { "advertising-card": [a, b, c], "home-projects": [{ ids: [] }], menu: [{ groups: [] }], contact: [{}] };
  const files = snapshotToFiles({ records });
  assert.deepEqual(files["advertising-cards.json"].map(({ id, sourceOrder }) => [id, sourceOrder]), [["a", 0], ["b", 0], ["c", 1]]);
  assert.equal(files["advertising-cards.json"][0].media.mediaId, undefined);
  assert.equal(files["advertising-cards.json"][0].media.crop, undefined);
});

test("deriveCard: a new cluster without legacySlug uses its slugEn; no tagIds stays empty", () => {
  const { category: _c, productKey: _p, ...fresh } = structuredClone(card);
  const products = [{ id: "new/one", cluster: "new" }];
  const clusters = [{ id: "new", slugEn: "new-cluster" }];
  assert.equal(deriveCard({ ...fresh, productIds: ["new/one"] }, { products, clusters }).category, "new-cluster");
  assert.deepEqual(deriveCard({ ...card, tagIds: [] }).tagIds, []);
});
