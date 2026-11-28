// Editor preview parity (cms-editor R3 Gherkin, CMS plan E13): the preview pipeline of the browser (renderBlockPage, finishPage, localeHtml)
// gives the exact HTML the build wrote, for every News post and project of the repo, in both languages. Run after `pnpm prepare:site`.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { previewContext, renderPreview } from "../../src/cms/preview-data.mjs";
import { KINDS, pageHref } from "../../scripts/site/block-pages.mjs";
import { loadBlockContent } from "../../scripts/site/content-files.mjs";
import { siteRoot } from "../../scripts/site/lib.mjs";
import { contact, readPageSource } from "../../scripts/site/sync-site-menu.mjs";

const out = ".site-output";

test("the preview HTML equals the built HTML of every post and project", { skip: !existsSync(path.join(out, "index.html")) && "site not built" }, () => {
  const content = loadBlockContent(siteRoot);
  const headInline = `<script>\n${readFileSync(path.join(siteRoot, "head-inline.js"), "utf8")}</script>`;
  const finish = { hasFile: (url) => existsSync(path.join(out, url)), mediaOrigin: "", headInline };
  let compared = 0;
  for (const [type, kind, pages] of [["news", "news", content.news], ["project", "projects", content.projects]]) {
    const context = (page) => previewContext(content, contact, type, page);
    for (const page of pages) {
      const frame = readPageSource(`${KINDS[kind].frame(page)}/index.html`);
      for (const locale of page.noEn ? ["vi"] : ["vi", "en"]) {
        const built = readFileSync(path.join(out, pageHref(kind, locale, page), "index.html"), "utf8");
        assert.equal(renderPreview(type, frame, page, context(page), { locale, finish }), built, `${type} ${page.id} ${locale}`);
        compared += 1;
      }
    }
  }
  assert.ok(compared > 20, `${compared} pages compared`);
});

test("editor mode only adds data-block-index to block roots", { skip: !existsSync(path.join(out, "index.html")) && "site not built" }, () => {
  const content = loadBlockContent(siteRoot);
  const page = content.news[0];
  const frame = readPageSource(`${KINDS.news.frame(page)}/index.html`);
  const finish = { hasFile: () => false, mediaOrigin: "", headInline: "" };
  const plain = renderPreview("news", frame, page, previewContext(content, contact, "news", page), { finish });
  const marked = renderPreview("news", frame, page, previewContext(content, contact, "news", page, { editor: true }), { finish });
  assert.equal(marked.replace(/ data-block-index="\d+"/g, ""), plain);
  assert.equal((marked.match(/data-block-index="/g) ?? []).length, page.blocks.length);
});
