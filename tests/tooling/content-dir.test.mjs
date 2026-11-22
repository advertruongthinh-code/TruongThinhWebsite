// TT_CONTENT_DIR (cms R6, plan A4): the build reads content files from the snapshot directory, and from the repo when it is empty.
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { contentDirOf, loadBlockContent } from "../../scripts/site/content-files.mjs";
import { siteRoot } from "../../scripts/site/lib.mjs";

const withDir = (value, run) => {
  const before = process.env.TT_CONTENT_DIR;
  process.env.TT_CONTENT_DIR = value;
  try { return run(); } finally { if (before === undefined) delete process.env.TT_CONTENT_DIR; else process.env.TT_CONTENT_DIR = before; }
};

test("an empty TT_CONTENT_DIR means the repo content directory", () => {
  assert.equal(withDir("", () => contentDirOf("/x")), path.join("/x", "content"));
});

test("loadBlockContent reads the directory TT_CONTENT_DIR names", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "content-dir-"));
  cpSync(path.join(siteRoot, "content"), dir, { recursive: true });
  const file = path.join(dir, "news.json");
  const news = JSON.parse(readFileSync(file, "utf8"));
  news[0].title.vi = "Tiêu đề mới từ bản chụp";
  writeFileSync(file, JSON.stringify(news));
  assert.equal(withDir(dir, () => loadBlockContent(siteRoot)).news[0].title.vi, "Tiêu đề mới từ bản chụp");
  assert.notEqual(withDir("", () => loadBlockContent(siteRoot)).news[0].title.vi, "Tiêu đề mới từ bản chụp");
});
