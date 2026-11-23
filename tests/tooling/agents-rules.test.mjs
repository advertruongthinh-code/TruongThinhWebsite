// docs-system.md R11: AGENTS.md rules checked by qa:docs.
import assert from "node:assert/strict";
import { test } from "node:test";
import { blockLines, cardClaimErrors, cardId, cardLevel, parentIds, planErrors, tierFloor, tierLineErrors, cmsImportErrors, commentLanguageErrors, designLineErrors, diffLines, ownerLockErrors, emojiErrors, isImageMaster, isVietnameseProse, markdownNameErrors, pngOriginErrors, qaLineErrors, secretFileErrors, sameCardErrors, secretTextErrors, ssotPathErrors } from "../../scripts/docs/agents-rules.mjs";

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

test("every site image master has a PNG row; new masters need png and sha256", () => {
  const dir = "src/site/assets/content/projects/";
  const files = [`${dir}a.webp`, `${dir}a-480.webp`, `${dir}b.webp`, `${dir}c.jpg`, `${dir}a.avif`].filter(isImageMaster);
  assert.deepEqual(files, [`${dir}a.webp`, `${dir}b.webp`, `${dir}c.jpg`]);
  const sha = "a".repeat(64);
  const csv = `anh,png,sha256\nprojects/a,,\nprojects/b,source-assets/b.png,${sha}\n`;
  assert.deepEqual(pngOriginErrors(files, [], csv, "").map((e) => e.split(": ")[1].split(" ")[0]), ["projects/c"]);
  assert.equal(pngOriginErrors([`${dir}a.webp`, `${dir}b.webp`], [`${dir}b.webp`], csv, "").length, 0);
  assert.equal(pngOriginErrors([`${dir}a.webp`], [`${dir}a.webp`], csv, "").length, 1);
  assert.equal(pngOriginErrors([`${dir}a.webp`], [`${dir}a.webp`], csv, "PNG gốc: không có - logo vẽ tay").length, 0);
});

test("ADR and work-state files fail; specs pass", () => {
  assert.deepEqual(ssotPathErrors(["docs/decisions/x.md", "docs/STATE.md", "docs/specs/seo.md"]).length, 2);
});

test("secret files fail, .env.example and SQL migrations pass", () => {
  const files = [".env", "src/.env.local", ".dev.vars", "ops/ad.keytab", "k/id_ed25519", "c/server.pem", "data/site.sqlite", ".env.example", "src/db/migrations/0001.sql", "docs/key-terms.md"];
  assert.deepEqual(secretFileErrors(files).map((e) => e.split(": ")[1].split(" ")[0]), files.slice(0, 7));
});

test("token-shaped text fails, ordinary words pass", () => {
  // Built from parts so this test file holds no token.
  const files = {
    "a.mjs": "const k = 's" + "k-" + "A".repeat(24) + "';\n",
    "b.yml": "token: gh" + "p_" + "a".repeat(36) + "\n",
    "c.txt": "-----BEGIN OPENSSH " + "PRIVATE KEY-----\n",
    "d.css": ".kiosk-posm { --mask-ink-overflow: 1px; }\n",
  };
  assert.deepEqual(secretTextErrors(Object.keys(files), reader(files)).map((e) => e.split(": ")[1]), ["a.mjs:1", "b.yml:1", "c.txt:1"]);
  assert.ok(!secretTextErrors(["a.mjs"], reader(files))[0].includes("AAAA"));
});

test("application source needs a Design or Mức 0 line", () => {
  assert.equal(designLineErrors(["docs/specs/seo.md"], "").length, 0);
  assert.equal(designLineErrors(["src/search/index.mjs"], "").length, 1);
  assert.equal(designLineErrors(["src/site/a.js"], "Mức 0: <lý do>").length, 1);
  assert.equal(designLineErrors(["src/site/a.js"], "Mức 0: sửa lỗi chính tả").length, 0);
  assert.equal(designLineErrors(["src/worker/a.mjs"], "Design: https://app.notion.com/p/abc").length, 0);
});

test("one PR per card: another open PR with the same card fails", () => {
  const body = "x\nCard: https://app.notion.com/p/41f332849a0e81db9d01c30d47251df6?pvs=4\n";
  assert.equal(cardId(body), "41f332849a0e81db9d01c30d47251df6");
  assert.equal(cardId("Card: chờ tạo"), null);
  const open = [{ number: 5, body }, { number: 7, body: "Card: https://www.notion.so/Name-41f332849a0e81db9d01c30d47251df6" }, { number: 8, body: "Card: chờ tạo" }];
  assert.deepEqual(sameCardErrors(5, body, open).map((e) => e.split(": ")[1].split(" ")[0]), ["#7"]);
  assert.equal(sameCardErrors(8, "Card: chờ tạo", open).length, 0);
});

test("card claim needs In progress (or Done) and an Agent", () => {
  const page = (status, agent) => ({ properties: { Status: { status: { name: status } }, Agent: { rich_text: agent ? [{ plain_text: agent }] : [] } } });
  assert.equal(cardClaimErrors(page("In progress", "Claude thread X")).length, 0);
  assert.equal(cardClaimErrors(page("Done", "Claude thread X")).length, 0);
  assert.equal(cardClaimErrors(page("Not started", "Claude thread X")).length, 1);
  assert.equal(cardClaimErrors(page("In progress", "")).length, 1);
});

test("owner lock: dropping or rewriting an owner-dated spec sentence or deleting an assertion needs the owner's words", () => {
  // The #1030 case: the phone-only rule from 2026-11-13 rewritten for every device.
  const spec = {
    file: "docs/specs/site-shell.md",
    removed: ["là nút vuông chỉ icon; Advertising browse ẩn nó. Nút về đầu trang `button.back-to-top` (owner 2026-11-13) chỉ có trên điện thoại. Footer giữ nguyên."],
    added: ["là nút vuông chỉ icon; Advertising browse ẩn nó. Nút về đầu trang `button.back-to-top` (owner 2026-11-13; mọi thiết bị từ 2026-11-22) ở trang có masonry. Footer giữ nguyên."],
  };
  const errors = ownerLockErrors([spec], "");
  assert.equal(errors.length, 1);
  assert.match(errors[0], /site-shell\.md.*owner 2026-11-13/);
  assert.deepEqual(ownerLockErrors([spec], "Owner đổi: https://claude.ai/code/project/x?thread=y"), []);
  assert.equal(ownerLockErrors([spec], "Owner đổi: <link>").length, 1, "a template placeholder is not the owner's words");
  // A sentence that only moved, or an untagged sentence that changed, passes.
  const moved = { file: "docs/specs/a.md", removed: ["Một câu (owner 2026-11-13) giữ nguyên.", "Câu cũ."], added: ["Câu mới.", "Một câu (owner 2026-11-13) giữ nguyên."] };
  assert.deepEqual(ownerLockErrors([moved], ""), []);
  // Tests: an assertion deleted with none added in the same file fails; rewritten assertions pass.
  const dropped = { file: "tests/site/back-to-top.e2e.mjs", removed: ['    assert(!result.shown, "PC never shows it");'], added: ["    // removed"] };
  assert.equal(ownerLockErrors([dropped], "").length, 1);
  const rewritten = { file: "tests/site/back-to-top.e2e.mjs", removed: ['    assert(!result.shown, "PC never shows it");'], added: ['      assert.equal(result.size, 0, "PC never shows it");'] };
  assert.deepEqual(ownerLockErrors([rewritten], ""), []);
  const reindented = { file: "tests/a.test.mjs", removed: ["  assert.equal(a, 1);"], added: ["      assert.equal(a, 1);"] };
  assert.deepEqual(ownerLockErrors([reindented], ""), []);
  // Files outside docs/specs and tests are not checked.
  assert.deepEqual(ownerLockErrors([{ file: "docs/operations/notion.md", removed: ["Một câu (owner 2026-11-13)."], added: [] }], ""), []);
});

test("unified diff with -U0 splits into removed and added lines", () => {
  const diff = ["diff --git a/x b/x", "--- a/x", "+++ b/x", "@@ -1 +1 @@", "-old line", "+new line", "+-- not a header"].join("\n");
  assert.deepEqual(diffLines(diff), { removed: ["old line"], added: ["new line", "-- not a header"] });
});

test("tier floor: CMS code or a long task is 3, site code is 1, docs and CI are 0", () => {
  const row = (file, added = 1) => ({ file, added, deleted: 0 });
  assert.equal(tierFloor([row("docs/a.md", 900), row("scripts/docs/x.mjs")]), 0);
  assert.equal(tierFloor([row("src/site/a.js")]), 1);
  assert.equal(tierFloor([row("src/search/a.mjs")]), 1);
  assert.equal(tierFloor([row("src/worker/a.mjs")]), 3);
  assert.equal(tierFloor([row("src/site/a.js", 400)]), 3);
  assert.equal(tierFloor([row("src/site/a.md", 900)]), 1, "Markdown is not LOC");
  assert.equal(tierFloor([row("src/site/a.js"), row("scripts/b.mjs")]), 3, "two zones");
  assert.equal(tierFloor([row("src/site/a.css", 100), row("design-system/components/bundle.css", 100),
    row("design-system/components/Viewer/preview.html")]), 1, "generated Design System files are not a zone");
  assert.equal(tierFloor([row("src/site/a.css"), row("design-system/components/Viewer/README.md")]), 3, "Design System Markdown stays a zone");
  assert.equal(tierFloor([row("src/site/a.css", 250), row("design-system/components/bundle.css", 250)]), 1, "generated files are not LOC");
  assert.equal(tierFloor([row("src/site/a.css"), row("design-system/tokens.json")]), 3, "hand-written Design System files stay a zone");
  assert.equal(tierFloor(Array.from({ length: 8 }, (_, i) => row(`tests/t${i}.mjs`))), 3);
  assert.equal(tierFloor([row("src/site/motion.js"), row("src/site/m.mjs")], ["src/site/motion.js", "src/site/m.mjs"]), 3, "two hot files");
});

test("tier line: missing or below the floor or the card's Plan level fails", () => {
  assert.deepEqual(tierLineErrors(0, "no line"), []);
  assert.equal(tierLineErrors(1, "no line").length, 1);
  assert.equal(tierLineErrors(0, "no line", 2).length, 1);
  assert.deepEqual(tierLineErrors(1, "Kiểm độc lập: tầng 2, vai 1-5, https://x"), []);
  assert.match(tierLineErrors(3, "Kiểm độc lập: tầng 1, vai 1")[0], /at least tầng 3/);
  assert.match(tierLineErrors(0, "Kiểm độc lập: tầng 0 - chỉ docs", 2)[0], /Plan level is 2/);
  assert.equal(cardLevel({ properties: { "Plan level": { select: { name: "3" } } } }), 3);
  assert.equal(cardLevel({ properties: { "Plan level": { select: null } } }), 0);
  assert.equal(cardLevel(null), 0);
});

test("card plan: needs a Plan heading with to-dos and an approval line with a link", () => {
  const block = (type, text, href = null) => ({ type, [type]: { rich_text: [{ plain_text: text, href }] } });
  const good = blockLines([
    block("paragraph", "Mục tiêu: x"),
    block("heading_2", "Plan"),
    block("to_do", "B1"),
    block("paragraph", "Plan đã duyệt: tin owner", "https://claude.ai/code/project/x?thread=y"),
  ]);
  assert.deepEqual(planErrors(good), []);
  assert.deepEqual(planErrors(blockLines([block("heading_2", "Plan"), block("to_do", "B1"), block("paragraph", "Plan đã duyệt: https://claude.ai/x")])), []);
  assert.equal(planErrors(blockLines([block("to_do", "B1"), block("heading_2", "Plan"), block("paragraph", "Plan đã duyệt: https://x")])).length, 1, "to-do before the heading");
  assert.equal(planErrors(blockLines([block("heading_2", "Plan"), block("to_do", "B1"), block("paragraph", "Plan đã duyệt: chờ")])).length, 1, "approval without link");
  assert.equal(planErrors([]).length, 2);
  assert.deepEqual(parentIds({ properties: { "Parent item": { relation: [{ id: "4213-3284" }] } } }), ["42133284"]);
  assert.deepEqual(parentIds({}), []);
});
