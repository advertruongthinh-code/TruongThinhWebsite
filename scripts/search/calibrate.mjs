// pnpm search:calibrate: scores tests/search/fixtures/queries.json against the real index (spec advertising-search R11).
// Anchors come from one seeded half of the queries, the threshold from the best F1 on the other half. The config is
// written only when every query type reaches top 5 in at least 80% of its queries, overall P@5 is at least 0.8 and P@5 is
// not below the current config's (a passing but weaker fit must not replace a better live one).
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { buildAdvertisingArtifact } from "../../src/site/advertising-products/catalog.mjs";
import { cardMedia, embedRest, IMAGE_BATCH, mediaInput, queryText, TEXT_BATCH } from "../../src/search/embed-input.mjs";
import { decodeIndex, unit } from "../../src/search/index-format.mjs";
import { keywordScores, modelQuery } from "../../src/search/keywords.mjs";
import { keywordOnly, rankSearch } from "../../src/search/rank.mjs";
import { scoreInput } from "../../src/search/score.mjs";

export const SEED = 20261117;
const GATE = { top5: 0.8, p5: 0.8 };
const KINDS = ["text-text", "text-image", "image-text", "image-image"];
// [-1, 1] maps cosine x to (x + 1) / 2 without clamping, so raw cosines can be read back from scoreInput.
const RAW = Object.fromEntries(KINDS.map((k) => [k, [-1, 1]]));

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function quantile(values, p) {
  const s = [...values].sort((x, y) => x - y);
  if (!s.length) return NaN;
  const at = (s.length - 1) * p;
  const lo = Math.floor(at);
  return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (at - lo);
}

// A crop of 60-80% of each side at a random position, sent as the client would: JPEG, long side 768.
async function crop(file, random) {
  const { default: sharp } = await import("sharp");
  const { width, height } = await sharp(file).metadata();
  const f = 0.6 + 0.2 * random();
  const [w, h] = [Math.round(width * f), Math.round(height * f)];
  const region = { left: Math.floor((width - w) * random()), top: Math.floor((height - h) * random()), width: w, height: h };
  const jpeg = await sharp(file).extract(region).resize({ width: 768, height: 768, fit: "inside" }).jpeg({ quality: 85 }).toBuffer();
  return jpeg.toString("base64");
}

// Queries become model inputs: one text input (if any) then one per image, each with its own expected card set.
export async function buildInputs(queries, artifact, readCrop) {
  const cards = new Map(artifact.cards.map((c) => [c.id, c]));
  const resolve = (refs) => new Set(refs.flatMap((r) => (cards.has(r) ? [r] : artifact.cards.filter((c) => [c.productIds, ...cardMedia(c).map((m) => m.productIds ?? [])].some((ids) => ids?.includes(r))).map((c) => c.id))));
  const random = rng(SEED);
  const out = [];
  for (const q of queries) {
    const parts = q.type === "mixed" ? q.expect : [q.expect];
    const inputs = [];
    if (q.text) inputs.push({ kind: "text", model: queryText(modelQuery(q.text, localeOf(q), artifact)) });
    for (const ref of q.images ?? []) {
      const [id, n = 0] = ref.split("#");
      const media = cardMedia(cards.get(id))[Number(n)];
      inputs.push({ kind: "image", model: mediaInput({}, await readCrop(`src/site${media.posterSrc ?? media.src}`, random)) });
    }
    inputs.forEach((input, i) => (input.expect = resolve(parts[q.type === "mixed" ? i : 0])));
    out.push({ ...q, inputs, expectAll: resolve(parts.flat()), parts: parts.map(resolve) });
  }
  return out;
}

// Embeds every input once; vectors are cached by input hash so a rerun costs no model calls.
async function embedAll(queries, embed, cachePath) {
  const cache = JSON.parse(await readFile(cachePath, "utf8").catch(() => "{}"));
  const key = (model) => createHash("sha256").update(JSON.stringify(model)).digest("hex");
  const all = queries.flatMap((q) => q.inputs);
  for (const [kind, size] of [["text", TEXT_BATCH], ["image", IMAGE_BATCH]]) {
    const todo = [...new Map(all.filter((i) => i.kind === kind && !cache[key(i.model)]).map((i) => [key(i.model), i.model]))];
    for (let n = 0; n < todo.length; n += size) {
      const chunk = todo.slice(n, n + size);
      (await embed(chunk.map(([, model]) => model))).forEach((vec, i) => (cache[chunk[i][0]] = vec));
    }
  }
  await writeFile(cachePath, JSON.stringify(cache));
  for (const input of all) input.vec = unit(cache[key(input.model)]);
}

const localeOf = (q) => (q.type === "en" ? "en" : "vi");
const scoresOf = (input, index, anchors) => scoreInput(input.vec, input.kind, index, anchors);

// lo = 5th percentile of wrong pairs, hi = 95th percentile of right pairs, per query kind and target.
export function fitAnchors(queries, index) {
  const pairs = Object.fromEntries(KINDS.map((k) => [k, { right: [], wrong: [] }]));
  for (const input of queries.flatMap((q) => q.inputs)) {
    for (const [id, t, m] of scoresOf(input, index, RAW)) {
      const side = input.expect.has(id) ? "right" : "wrong";
      pairs[`${input.kind}-text`][side].push(2 * t - 1);
      pairs[`${input.kind}-image`][side].push(2 * m - 1);
    }
  }
  return Object.fromEntries(KINDS.map((k) => [k, [quantile(pairs[k].wrong, 0.05), quantile(pairs[k].right, 0.95)].map((x) => Math.round(x * 1000) / 1000)]));
}

export function evaluate(queries, { index, artifact, config }) {
  const catalogOrder = artifact.cards.map((c) => c.id);
  const productOf = (id) => artifact.cards.find((c) => c.id === id)?.productIds[0];
  return queries.map((q) => {
    const keyword = q.text ? keywordScores(q.text, localeOf(q), artifact) : new Map();
    const inputs = q.inputs.map((input) => ({ kind: input.kind, scores: scoresOf(input, index, config.anchors) }));
    const { ids } = rankSearch({ inputs, keyword, config, catalogOrder, productOf });
    const top = ids.slice(0, 5);
    const kwIds = (min) => keywordOnly(keyword, catalogOrder, { keywordMin: min });
    return {
      id: q.id, type: q.type, text: q.text, ids, top,
      hit: q.parts.every((set) => top.some((id) => set.has(id))),
      p5: top.length ? top.filter((id) => q.expectAll.has(id)).length / top.length : 0,
      keyword: q.text && q.type !== "mixed" ? [0.4, 0.6].map((min) => ({ min, ids: kwIds(min), right: kwIds(min).filter((id) => q.expectAll.has(id)).length })) : null,
    };
  });
}

export function summarize(results) {
  const mean = (list) => (list.length ? list.reduce((x, y) => x + y, 0) / list.length : 0);
  const types = [...new Set(results.map((r) => r.type))];
  const byType = Object.fromEntries(types.map((t) => {
    const list = results.filter((r) => r.type === t);
    return [t, { n: list.length, top5: mean(list.map((r) => +r.hit)), p5: mean(list.map((r) => r.p5)) }];
  }));
  const p5 = mean(results.map((r) => r.p5));
  return { byType, p5, pass: Object.values(byType).every((t) => t.top5 >= GATE.top5) && p5 >= GATE.p5 };
}

export const accepts = (before, after) => after.pass && after.p5 >= before.p5;

// Micro F1 of "card passes the threshold" against "card is expected", over the held-out half.
export function fitThreshold(queries, ctx) {
  let best = { threshold: ctx.config.threshold, f1: -1 };
  for (let t = 20; t <= 80; t++) {
    const config = { ...ctx.config, threshold: t / 100 };
    let [tp, fp, fn] = [0, 0, 0];
    for (const [r, q] of evaluate(queries, { ...ctx, config }).map((r, i) => [r, queries[i]])) {
      const right = r.ids.filter((id) => q.expectAll.has(id)).length;
      tp += right;
      fp += r.ids.length - right;
      fn += q.expectAll.size - right;
    }
    const f1 = tp ? (2 * tp) / (2 * tp + fp + fn) : 0;
    if (f1 > best.f1) best = { threshold: t / 100, f1: Math.round(f1 * 1000) / 1000 };
  }
  return best;
}

const pct = (x) => `${Math.round(x * 100)}%`;
const fixed = (x) => x.toFixed(3).replace(".", ",");

export function report({ before, after, held, config, f1, results }) {
  const table = (s) => ["| Loại | Số câu | Top 5 | P@5 |", "| --- | --- | --- | --- |",
    ...Object.entries(s.byType).map(([t, v]) => `| ${t} | ${v.n} | ${pct(v.top5)} | ${fixed(v.p5)} |`), `| chung | ${Object.values(s.byType).reduce((x, v) => x + v.n, 0)} | | ${fixed(s.p5)} |`].join("\n");
  const misses = results.filter((r) => !r.hit).map((r) => `- ${r.id} (${r.type}) "${r.text ?? ""}": top 5 = ${r.top.join(", ") || "rỗng"}`);
  const kwRows = [...new Set(results.map((r) => r.type))].flatMap((t) => {
    const list = results.filter((r) => r.type === t && r.keyword);
    if (!list.length) return [];
    return [`| ${t} | ${list.length} | ${[0, 1].map((i) => {
      const all = list.map((r) => r.keyword[i]);
      const n = all.reduce((x, k) => x + k.ids.length, 0);
      return `${fixed(n ? all.reduce((x, k) => x + k.right, 0) / n : 0)} (${Math.round(n / list.length)} card/câu)`;
    }).join(" | ")} |`];
  });
  const widest = results.filter((r) => r.keyword).sort((a, b) => b.keyword[0].ids.length - a.keyword[0].ids.length).slice(0, 8)
    .map((r) => `- "${r.text}": ${r.keyword[0].ids.length} card ở 0,4 (đúng ${r.keyword[0].right}), ${r.keyword[1].ids.length} card ở 0,6 (đúng ${r.keyword[1].right})`);
  return [
    "# Báo cáo search:calibrate", "",
    `Cổng: ${!after.pass ? "CHƯA ĐẠT, không đổi score-config.json" : accepts(before, after) ? "ĐẠT, đã ghi score-config.json" : "ĐẠT nhưng P@5 thấp hơn config cũ, không đổi score-config.json"}.`, "",
    "## Config cũ", "", table(before), "",
    "## Config mới (cả bộ)", "", table(after), "",
    "## Config mới (nửa giữ lại, không dùng để chọn mốc)", "", table(held), "",
    `Ngưỡng ${fixed(config.threshold)} (F1 ${fixed(f1)} trên nửa giữ lại). Mốc:`, "",
    ...Object.entries(config.anchors).map(([k, [lo, hi]]) => `- ${k}: lo ${fixed(lo)}, hi ${fixed(hi)}`), "",
    "## Câu trượt top 5", "", ...(misses.length ? misses : ["- không có"]), "",
    "## Lớp từ khóa riêng (keywordOnly)", "", "| Loại | Số câu | Đúng ở 0,4 | Đúng ở 0,6 |", "| --- | --- | --- | --- |", ...kwRows, "",
    ...widest, "",
    "Hạn chế: ảnh thử cắt từ chính ảnh card nên dễ hơn ảnh khách chụp.", "",
  ].join("\n");
}

export async function run({
  env = process.env, fetch = globalThis.fetch, indexDir = ".site-output/search", readCrop = crop,
  out = ".tmp/search-calibrate", configPath = "src/search/score-config.json",
} = {}) {
  const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account } = env;
  const meta = JSON.parse(await readFile(`${indexDir}/advertising-index.json`, "utf8"));
  if (meta.status !== "ok") throw new Error("index unavailable: run pnpm search:index first");
  const bin = await readFile(`${indexDir}/advertising-index.bin`);
  const index = decodeIndex(meta, bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
  const artifact = buildAdvertisingArtifact();
  const fixture = JSON.parse(await readFile("tests/search/fixtures/queries.json", "utf8"));
  const queries = await buildInputs(fixture, artifact, readCrop);
  await mkdir(out, { recursive: true });
  await embedAll(queries, (inputs) => {
    if (!token || !account) throw new Error("missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID");
    return embedRest({ fetch, token, account, signal: AbortSignal.timeout(60_000) }, inputs);
  }, `${out}/vectors.json`);

  const random = rng(SEED + 1);
  const shuffled = queries.map((q) => [random(), q]).sort((a, b) => a[0] - b[0]).map(([, q]) => q);
  const [fitHalf, heldHalf] = [shuffled.filter((_, i) => i % 2 === 0), shuffled.filter((_, i) => i % 2 === 1)];
  const current = JSON.parse(await readFile(configPath, "utf8"));
  const ctx = { index, artifact };
  const before = summarize(evaluate(queries, { ...ctx, config: current }));
  const anchored = { ...current, anchors: fitAnchors(fitHalf, index) };
  const { threshold, f1 } = fitThreshold(heldHalf, { ...ctx, config: anchored });
  const config = { ...anchored, threshold };
  const results = evaluate(queries, { ...ctx, config });
  const after = summarize(results);
  const held = summarize(evaluate(heldHalf, { ...ctx, config }));
  const text = report({ before, after, held, config, f1, results });
  await writeFile(`${out}/report.md`, text);
  if (accepts(before, after)) await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
  console.log(text);
  return { after, config };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await run();
