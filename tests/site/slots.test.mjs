// Slots of the standard pages (cms-plan part 2 K7, task E6): node --test tests/site/slots.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { PLACEHOLDER_IMAGES, PLACEHOLDER_TEXT, SLOT_ID, SLOT_PAGES, fillSlots, slotIds, slotValues, slotsOf } from "../../scripts/site/slots.mjs";
import { shapeErrors } from "../../src/cms/contract.mjs";
import { mediaRefs } from "../../src/cms/media-ref.mjs";
import { filesToRecords, snapshotToFiles } from "../../src/cms/projection.mjs";

const root = new URL("../../", import.meta.url);
const fixture = JSON.parse(readFileSync(new URL("tests/site/fixtures/slots.json", root), "utf8"));
const page = (id) => readFileSync(new URL(`src/site/${SLOT_PAGES[id]}`, root), "utf8");
const home = page("home");

test("every page in the fixture has unique slot keys of the form <section>.<name>", () => {
  for (const id of Object.keys(fixture)) {
    const ids = slotsOf(page(id)).map((slot) => slot.id);
    assert.ok(ids.length > 20, id);
    assert.equal(new Set(ids).size, ids.length, `${id}: duplicate data-slot`);
    for (const key of ids) assert.match(key, SLOT_ID);
  }
});

test("assign-slots --check matches the fixture", () => {
  const result = spawnSync(process.execPath, ["scripts/cms/assign-slots.mjs", "--check"], { cwd: new URL(root).pathname, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});

const html = `<header><p data-slot="head.body" data-en="Out">Ngoài</p></header>
<main>
  <section id="a"><h2 data-slot="a.title"><span data-en="Spaces for">Không gian để</span> <i data-en="living">sống</i></h2>
  <p data-slot="a.label" class="kicker" data-en="ABOUT">GIỚI THIỆU</p>
  <img data-slot="a.image-1" src="/assets/content/x.webp" width="300" height="200" alt="Ảnh" data-en-alt="Photo" />
  <img data-slot="a.image-2" src="/assets/content/y.webp" width="200" height="300" alt="" /></section>
</main>`;

test("slotValues reads text with marks and images; the same values leave the HTML byte for byte", () => {
  const values = slotValues(html);
  assert.deepEqual(values["a.title"], { vi: "Không gian để *sống*", en: "Spaces for *living*" });
  assert.deepEqual(values["a.image-1"], { src: "/assets/content/x.webp", width: 300, height: 200, altVi: "Ảnh", altEn: "Photo" });
  assert.equal(values["head.body"], undefined, "outside <main> is not a slot");
  assert.equal(fillSlots(html, { slots: values }), html);
  assert.equal(fillSlots(html, undefined), html);
  assert.equal(fillSlots(html, { slots: {} }), html);
  assert.equal(fillSlots(home, { slots: slotValues(home) }), home);
});

test("fillSlots writes text, marked text and images, and never touches outside <main>", () => {
  const out = fillSlots(html, { slots: {
    "a.label": { vi: "VỀ <CHÚNG TÔI>", en: "" },
    "a.title": { vi: "Nhà để *ở*", en: "A home to *live*" },
    "a.image-1": { mediaId: "m", src: "https://media.test/v/ab/m.webp", width: 1600, height: 900, altVi: "Mới", altEn: "New" },
    "head.body": { vi: "X", en: "X" },
  } });
  assert.match(out, /<p data-slot="a.label" class="kicker" data-en="VỀ &lt;CHÚNG TÔI&gt;">VỀ &lt;CHÚNG TÔI&gt;<\/p>/, "empty EN takes VI");
  assert.match(out, /<h2 data-slot="a.title">.*<em[^>]*>ở<\/em><\/h2>/s);
  assert.doesNotMatch(out.match(/<h2[^>]*>/)[0], /data-en/);
  assert.match(out, /<img data-slot="a.image-1" src="https:\/\/media.test\/v\/ab\/m.webp" width="1600" height="900" alt="Mới" data-en-alt="New" \/>/);
  assert.ok(out.startsWith(html.slice(0, html.indexOf("<main>"))), "the header is unchanged");
});

test("empty slots show placeholder text cut to the source length and the placeholder of the frame direction", () => {
  const out = fillSlots(html, { slots: { "a.label": { vi: "", en: "" }, "a.image-1": { mediaId: "" }, "a.image-2": {} } });
  const label = out.match(/<p data-slot="a.label"[^>]*>([^<]*)</)[1];
  assert.ok(PLACEHOLDER_TEXT.startsWith(label) && label.length <= "GIỚI THIỆU".length + 6, label);
  assert.match(out, new RegExp(`data-slot="a.image-1" src="${PLACEHOLDER_IMAGES.landscape.src}" width="3072" height="2048" alt=""`));
  assert.match(out, new RegExp(`data-slot="a.image-2" src="${PLACEHOLDER_IMAGES.portrait.src}" width="2048" height="3072" alt=""`));
});

test("a record key the page does not have is reported, not written; a slot left out of the record keeps the page's content", () => {
  const warnings = [];
  assert.equal(fillSlots(html, { slots: { ...slotValues(html), "gone.title": { vi: "X", en: "X" } } }, { warn: (message) => warnings.push(message) }), html);
  assert.deepEqual(warnings, ["page-copy slot gone.title is not on the page"]);
  assert.equal(fillSlots(html, { slots: { "a.label": { vi: "GIỚI THIỆU", en: "ABOUT" } } }), html);
});

test("page-copy contract: fixed ids, known slots, marks by slot kind; image slots are media placements", async () => {
  const [title] = Object.keys(fixture.home).length ? fixture.home.filter((slot) => slot.marks === "title") : [];
  const small = fixture.home.find((slot) => slot.marks === "small");
  const image = fixture.home.find((slot) => slot.kind === "media");
  const codes = async (data) => (await shapeErrors("page-copy", data, { id: data.id })).map((error) => error.code ?? error.message);
  assert.deepEqual(await codes({ id: "home", slots: { [title.id]: { vi: "Một *hai*", en: "One *two*" } } }), []);
  assert.deepEqual(await codes({ id: "shop", slots: {} }), ["page-id"]);
  assert.deepEqual(await codes({ id: "home", slots: { "nope.title": { vi: "A", en: "A" } } }), ["slot-unknown"]);
  assert.ok((await codes({ id: "home", slots: { [small.id]: { vi: "Một *hai*", en: "One *two*" } } })).includes("mark-not-allowed"));
  const slot = { mediaId: "m", crop: [0, 0, 10, 10] };
  assert.deepEqual(mediaRefs("page-copy", { id: "home", slots: { [image.id]: slot, [title.id]: { vi: "A", en: "A" } } }), [slot]);
});

test("page-copy goes from files to records and back to page-copy.json keyed by page", () => {
  const slots = slotValues(home);
  const records = filesToRecords({ "page-copy.json": { home: { slots } } }).filter(({ type }) => type === "page-copy");
  assert.deepEqual(records.map(({ id }) => id), ["home"]);
  const image = Object.values(records[0].data.slots).find((slot) => slot.src);
  assert.equal(image.legacySrc, image.src, "seeded image slots keep their file");
  const files = snapshotToFiles({ records: { "page-copy": [records[0].data], "home-projects": [{ ids: [] }], menu: [{ featuredProjects: [] }], contact: [{}] } });
  assert.deepEqual(Object.keys(files["page-copy.json"]), ["home"]);
  assert.equal(files["page-copy.json"].home.slots["dich-vu.title"].vi, slots["dich-vu.title"].vi);
});

test("the build fills the home page from page-copy.json of the content dir", { timeout: 300_000 }, (t) => {
  const projectRoot = new URL(root).pathname;
  const dir = mkdtempSync(path.join(tmpdir(), "page-copy-"));
  const out = mkdtempSync(path.join(projectRoot, ".site-output-r2-"));
  t.after(() => { rmSync(dir, { recursive: true, force: true }); rmSync(out, { recursive: true, force: true }); });
  cpSync(path.join(projectRoot, "src/site/content"), dir, { recursive: true });
  writeFileSync(path.join(dir, "page-copy.json"), JSON.stringify({ home: { slots: { "dich-vu.title": { vi: "Mảng thử nghiệm", en: "Test areas" } } }, residential: { slots: { "tong-quan.body": { vi: "Đoạn thử nghiệm", en: "Test paragraph" } } } }));
  const result = spawnSync(process.execPath, ["scripts/site/prepare-static-assets.mjs"], { cwd: projectRoot, env: { ...process.env, TT_CONTENT_DIR: dir, TT_SITE_OUT: out }, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  // The build keeps short last words together with a no-break space, so the text is matched with \s.
  assert.match(readFileSync(path.join(out, "index.html"), "utf8"), /data-slot="dich-vu.title"[^>]*>\s*Mảng thử\snghiệm\s*</);
  assert.match(readFileSync(path.join(out, "en/index.html"), "utf8"), /data-slot="dich-vu.title"[^>]*>\s*Test\sareas\s*</);
  // The menu pages are written on their own path in the build, so one of them is checked too.
  assert.match(readFileSync(path.join(out, "residential/index.html"), "utf8"), /data-slot="tong-quan.body"[^>]*>\s*Đoạn thử\snghiệm\s*</);
});

test("noscript, build-generated regions and data-cta blocks give no slots", () => {
  const region = (open, close) => `${open}<p data-en="Inside">Bên trong</p><img src="/assets/content/projects/x.webp" width="4" height="3" alt="x" />${close}`;
  const html = `<main><section id="mau">
    <h2 data-en="Kept">Giữ lại</h2>
    ${region("<noscript>", "</noscript>")}
    ${region('<div class="hero-slides">', "</div>")}
    ${region('<div class="client-logos">', "</div>")}
    ${region('<div class="supplier-logos">', "</div>")}
    ${region('<div class="cta" data-cta="">', "</div>")}
  </section></main>`;
  assert.deepEqual(slotIds(html).map(({ id }) => id), ["mau.title"]);
});
