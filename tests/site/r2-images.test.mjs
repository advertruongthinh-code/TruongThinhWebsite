// R2 images on the site (cms-plan part 2 K4, task E3): node --test tests/site/r2-images.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { absoluteSrc, hasFile, siblingSrc, variantImageErrors, variantKeyOf } from "../../scripts/site/media-src.mjs";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const fixture = path.join(projectRoot, "tests/site/fixtures/r2-content");
const variants = JSON.parse(readFileSync(path.join(fixture, "variants.json"), "utf8"));
const ORIGIN = "https://media.test";
const KEY = "a1".repeat(16);
const COVER = `${ORIGIN}/v/${KEY}/m-cover.webp`;

test("variantKeyOf, absoluteSrc and siblingSrc for repo and R2 src", () => {
  assert.equal(variantKeyOf(COVER), KEY);
  assert.equal(variantKeyOf("/assets/content/projects/a.webp"), null);
  assert.equal(variantKeyOf(`http://media.test/v/${KEY}/m.webp`), null);
  assert.equal(variantKeyOf(`${ORIGIN}/v/${KEY.slice(1)}/m.webp`), null);
  assert.equal(absoluteSrc(COVER, "https://truongthinhads.vn"), COVER);
  assert.equal(absoluteSrc("/assets/content/a.webp", "https://truongthinhads.vn"), "https://truongthinhads.vn/assets/content/a.webp");
  assert.equal(siblingSrc(COVER, "-480", "webp"), `${ORIGIN}/v/${KEY}/m-cover-480.webp`);
  assert.equal(siblingSrc("/assets/content/a.webp", "", "jxl"), "/assets/content/a.jxl");
});

test("which variant files exist comes from the manifest, not the disk", () => {
  const disk = () => assert.fail("an R2 url must not read the disk");
  assert.equal(hasFile(siblingSrc(COVER, "-960", "jxl"), variants, disk), true);
  assert.equal(hasFile(siblingSrc(COVER, "-1600", "jxl"), variants, disk), false, "the cover is 1536 wide");
  // A narrow R2 image has no -240 file: only what the manifest lists.
  const narrow = { [KEY]: { files: [{ name: "m-cover.webp" }, { name: "m-cover.jxl" }] } };
  assert.equal(hasFile(siblingSrc(COVER, "-240", "webp"), narrow, disk), false);
  assert.throws(() => hasFile(`${ORIGIN}/v/${"e5".repeat(16)}/x.jxl`, variants, disk), /no manifest for key e5e5/);
  assert.equal(hasFile("/assets/content/a.jxl", variants, () => true), true);
});

test("an R2 image is checked against its manifest and the build media origin", () => {
  const image = { src: COVER, width: 1536, height: 1024 };
  const options = { variants, mediaOrigin: ORIGIN };
  assert.deepEqual(variantImageErrors(image, "at", options), []);
  assert.match(variantImageErrors(image, "at", { variants, mediaOrigin: "https://other.test" })[0], /origin must be the build media origin/);
  assert.match(variantImageErrors({ ...image, width: 10 }, "at", options)[0], /width\/height must be 1536x1024/);
  assert.match(variantImageErrors({ ...image, src: `${ORIGIN}/v/${"e5".repeat(16)}/m.webp` }, "at", options)[0], /no manifest for key e5e5/);
  const noJxl = { [KEY]: { ...variants[KEY], files: variants[KEY].files.filter(({ name }) => !name.endsWith(".jxl")) } };
  assert.ok(variantImageErrors(image, "at", { variants: noJxl, mediaOrigin: ORIGIN }).some((error) => /has no \.jxl/.test(error)));
  const noColors = { [KEY]: { ...variants[KEY], colors: undefined } };
  assert.ok(variantImageErrors(image, "at", { variants: noColors, mediaOrigin: ORIGIN }).some((error) => /needs 6 colors/.test(error)));
});

const build = (contentDir, outputDir) => spawnSync(process.execPath, ["scripts/site/prepare-static-assets.mjs"], {
  cwd: projectRoot, encoding: "utf8", env: { ...process.env, TT_CONTENT_DIR: contentDir, TT_SITE_OUT: outputDir, CMS_MEDIA_ORIGIN: ORIGIN },
});
const filesUnder = (dir) => readdirSync(dir, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => path.join(entry.parentPath, entry.name));

test("a snapshot with R2 images builds full pictures, media og:image, preconnect and colors", { timeout: 180_000 }, (t) => {
  const output = mkdtempSync(path.join(projectRoot, ".site-output-r2-"));
  t.after(() => rmSync(output, { recursive: true, force: true }));
  const result = build(fixture, output);
  assert.equal(result.status, 0, result.stderr);
  const news = JSON.parse(readFileSync(path.join(fixture, "news.json"), "utf8"))[0];
  const page = readFileSync(path.join(output, "news", news.slugVi, "index.html"), "utf8");
  // The block image's srcset lists exactly the manifest's files under the image width.
  const block = "b2".repeat(16);
  const has = (name) => variants[block].files.some((file) => file.name === name);
  const url = (suffix, ext) => `${ORIGIN}/v/${block}/m-block${suffix}.${ext}`;
  const webp = [240, 480, 960].filter((width) => has(`m-block-${width}.webp`)).map((width) => `${url(`-${width}`, "webp")} ${width}w`);
  const jxl = [240, 480, 960, 1600, 2048].filter((width) => has(`m-block-${width}.jxl`)).map((width) => `${url(`-${width}`, "jxl")} ${width}w`);
  assert.ok(page.includes(`<img srcset="${[...webp, `${url("", "webp")} 1536w`].join(", ")}"`), "WebP srcset from the manifest");
  assert.ok(page.includes(`<source type="image/jxl" srcset="${[...jxl, `${url("", "jxl")} 1536w`].join(", ")}"`), "JXL srcset from the manifest");
  assert.ok(page.includes(`<meta property="og:image" content="${COVER}" />`));
  assert.ok(page.includes(`<link rel="preconnect" href="${ORIGIN}" />`));
  assert.ok(readFileSync(path.join(output, "index.html"), "utf8").includes(`["${ORIGIN}/v/${"c3".repeat(16)}/m-hero", 3072]`), "hero preload data carries the media URL");
  for (const file of filesUnder(output).filter((name) => /\.(html|xml|json|mjs)$/.test(name))) {
    assert.ok(!readFileSync(file, "utf8").includes("truongthinhads.vnhttps://"), `${file}: public origin glued to a media URL`);
  }
  assert.ok(readFileSync(path.join(output, "media-lib/colors.mjs"), "utf8").includes(`"${"d4".repeat(16)}":["#102030"`), "colors.mjs has the fixture key");
  assert.deepEqual(JSON.parse(readFileSync(path.join(output, "assets/content/jxl-thresholds.json"), "utf8"))[`v/${KEY}/m-cover.jxl`], { 960: 50000 });
});

test("a missing manifest stops the build and names the key", { timeout: 60_000 }, () => {
  const dir = mkdtempSync(path.join(tmpdir(), "r2-content-"));
  cpSync(fixture, dir, { recursive: true });
  const hero = "c3".repeat(16);
  const { [hero]: _removed, ...rest } = variants;
  writeFileSync(path.join(dir, "variants.json"), JSON.stringify(rest));
  const output = mkdtempSync(path.join(projectRoot, ".site-output-r2-"));
  const result = build(dir, output);
  rmSync(dir, { recursive: true, force: true });
  rmSync(output, { recursive: true, force: true });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, new RegExp(`no manifest for key ${hero}`));
});
