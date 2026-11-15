// docs-system.md R11: AGENTS.md rules checked by qa:docs.
import assert from "node:assert/strict";
import { test } from "node:test";
import { cmsImportErrors, commentLanguageErrors, emojiErrors, isVietnameseProse, markdownNameErrors, qaLineErrors } from "../../scripts/docs/agents-rules.mjs";

const reader = (files) => (file) => files[file];

test("emoji in any text file fails, plain symbols pass", () => {
  const files = { "docs/a.md": "ok -> done\n", "src/site/x.js": "const a = 1;\nconst b = '\u{1F680}';\n" };
  assert.deepEqual(emojiErrors(Object.keys(files), reader(files)).map((e) => e.split(": ")[1]), ["src/site/x.js:2"]);
});

test("Vietnamese prose comments fail, English comments quoting UI copy pass", () => {
  assert.equal(isVietnameseProse("Dormant đến khi owner kích hoạt phase CMS."), true);
  assert.equal(isVietnameseProse('The "Xem lớn hơn" viewer loads its own original.'), false);
  assert.equal(isVietnameseProse("Small connecting words (và, là, trong, từng) are half size on PC, phone keeps uniform size."), false);
  const files = {
    "wrangler.toml": "# Dormant đến khi owner kích hoạt phase CMS.\nname = \"x\"\n",
    // Built from parts so this file does not hold the comment markers it tests.
    "src/site/a.js": [
      "/" + "/ Tạm thời bỏ qua khi chưa có ảnh",
      'const x = 1; /' + '/ keep "Tất cả" first',
      "/" + "* Khối này chỉ chạy",
      "   khi có dữ liệu thật *" + "/",
    ].join("\n"),
    "src/site/b.mjs": "const u = 'https://chạy.vn/ không có ở đây';\n",
  };
  const lines = commentLanguageErrors(Object.keys(files), reader(files)).map((e) => e.split(": ")[1]);
  assert.deepEqual(lines, ["wrangler.toml:1", "src/site/a.js:1", "src/site/a.js:3", "src/site/a.js:4"]);
});

test("src/site importing CMS code fails", () => {
  const files = {
    "src/site/a.mjs": "import { x } from '../worker/api.mjs';\nimport y from './ok.mjs';\n",
    "src/site/b.html": '<script type="module" src="/src/admin/editor.js"></script>',
    "src/worker/c.mjs": "import x from '../site/a.mjs';\n",
  };
  assert.equal(cmsImportErrors(Object.keys(files), reader(files)).length, 2);
});

test("new Markdown files need a descriptive lowercase slug", () => {
  const added = ["docs/specs/media-card.md", "docs/F1-xe.md", "docs/specs/r4-gate.md", "docs/report-2026-11-15.md", "docs/Notes.md", "x/README.md", "docs/specs/_template.md"];
  assert.deepEqual(markdownNameErrors(added).map((e) => e.split(": ")[1]), ["docs/F1-xe.md", "docs/specs/r4-gate.md", "docs/report-2026-11-15.md", "docs/Notes.md"]);
});

test("a PR changing src/site needs a filled Ảnh QA line", () => {
  assert.equal(qaLineErrors(["docs/a.md"], "").length, 0);
  assert.equal(qaLineErrors(["src/site/style.css"], "Ảnh QA (UI): <ảnh đủ dải>").length, 1);
  assert.equal(qaLineErrors(["src/site/style.css"], "Kiểm: ok").length, 1);
  assert.equal(qaLineErrors(["src/site/style.css"], "Ảnh QA (UI): 384 và 1440 https://claude.ai/artifact/x").length, 0);
  assert.equal(qaLineErrors(["src/site/content/news.json"], "Ảnh QA (UI): không đổi UI - chỉ đổi chữ").length, 0);
});
