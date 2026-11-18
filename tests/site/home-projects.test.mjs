// Home page project strip (page-home R8): validates the id list and the built strip.
// Run after pnpm prepare:site: node --test tests/site/home-projects.test.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { validateHomeProjects } from "../../scripts/site/home-projects.mjs";

const read = async (file) => JSON.parse(await readFile(new URL(`../../src/site/content/${file}`, import.meta.url), "utf8"));
const ids = await read("home-projects.json");
const projects = new Map((await read("projects.json")).map((project) => [project.id, project]));

test("accepts the real list and rejects unknown, duplicate ids and counts outside 3-8", () => {
  assert.deepEqual(validateHomeProjects(ids, projects), []);
  assert.match(validateHomeProjects([...ids.slice(0, 2), "khong-co"], projects).join(), /home-projects\[2\]: unknown project khong-co/);
  assert.match(validateHomeProjects([ids[0], ids[1], ids[0]], projects).join(), /home-projects\[2\]: duplicate project/);
  assert.match(validateHomeProjects(ids.slice(0, 2), projects).join(), /need 3-8 project ids, got 2/);
  assert.match(validateHomeProjects("x", projects).join(), /need 3-8 project ids, got string/);
});

test("built home page links one card per id, in order, and a see-all line", async () => {
  for (const locale of ["vi", "en"]) {
    const html = await readFile(new URL(`../../.site-output/${locale}/index.html`, import.meta.url), "utf8");
    assert.doesNotMatch(html, /project-strip|project-reel/);
    const track = html.match(/<div class="blk-projects__track">[\s\S]*?<\/div>/)[0];
    const hrefs = [...track.matchAll(/<a class="project-card[^"]*" href="([^"]+)"/g)].map((match) => match[1]);
    assert.deepEqual(hrefs, ids.map((id) => `/${locale}/projects/${locale === "vi" ? projects.get(id).slugVi : projects.get(id).slugEn}/`), locale);
    assert.match(html, new RegExp(`class="blk-cta__link" href="/${locale}/projects/"`), locale);
  }
});
