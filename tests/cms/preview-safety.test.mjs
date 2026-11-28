// Editor preview safety (cms-editor R3, CMS plan E13): a draft string never reaches the preview HTML raw. Every string of a post and a
// project is replaced in turn by markup; the draft must either fail shapeErrors (the preview then keeps the old HTML) or be escaped.
import assert from "node:assert/strict";
import test from "node:test";
import { shapeErrors } from "../../src/cms/contract.mjs";
import { previewContext, renderPreview, unsafeFields, viewData } from "../../src/cms/preview-data.mjs";
import { KINDS } from "../../scripts/site/block-pages.mjs";
import { loadBlockContent } from "../../scripts/site/content-files.mjs";
import { siteRoot } from "../../scripts/site/lib.mjs";
import { contact, readPageSource } from "../../scripts/site/sync-site-menu.mjs";
import { seed } from "./seed.mjs";

const PAYLOAD = '"><img src=x onerror=PWN>';

function* leaves(node, path = []) {
  if (typeof node === "string") yield path;
  else if (node && typeof node === "object") for (const [key, value] of Object.entries(node)) yield* leaves(value, [...path, key]);
}

test("no string of a draft reaches the preview HTML as markup", async () => {
  const content = loadBlockContent(siteRoot);
  const { ctx, find } = seed();
  const finish = { hasFile: () => false, mediaOrigin: "", headInline: "" };
  let rendered = 0;
  for (const [type, kind, pages] of [["news", "news", content.news], ["project", "projects", content.projects]]) {
    for (const { id } of pages.slice(0, 3)) {
      const page = find(type, id);
      for (const path of leaves(page)) {
        const draft = structuredClone(page);
        path.slice(0, -1).reduce((node, key) => node[key], draft)[path.at(-1)] = PAYLOAD;
        let html;
        try {
          const view = await viewData(type, draft, ctx.mediaById);
          if (unsafeFields(view).length || (await shapeErrors(type, view, { id: page.id, mediaById: ctx.mediaById })).length) continue; // the editor keeps the old preview
          const frame = readPageSource(`${KINDS[kind].frame(view)}/index.html`);
          html = renderPreview(type, frame, view, previewContext(content, contact, type, view), { finish });
        } catch {
          continue; // the build cannot render it at all: nothing reaches the iframe
        }
        rendered += 1;
        assert.ok(!html.includes(PAYLOAD), `${type} ${page.id} ${path.join(".")} reaches the HTML raw`);
      }
    }
  }
  assert.ok(rendered > 100, `${rendered} drafts rendered`);
});
