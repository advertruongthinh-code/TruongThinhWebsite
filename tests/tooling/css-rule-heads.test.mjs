// Component gate design-system.md R6.2: selector of the rule enclosing a changed CSS line, including one-line rules, deleted and renamed rules.
import assert from "node:assert/strict";
import test from "node:test";
import { changedLineNumbers, cssRuleHeads } from "../../scripts/docs/css-rule-heads.mjs";

const css = [
  ".glass-surface {", //1
  "  color: red;", //2
  "}", //3
  '.glass-surface[data-glass-shape="arc"] > i { --glass-step-blur: 4.6px; }', //4
  ".a,", //5
  ".glass-surface > i {", //6
  "  opacity: 1;", //7
  "}", //8
  "@media (max-width: 960px) {", //9
  "  .glass-layer {", //10
  "    width: 1px;", //11
  "  }", //12
  "}", //13
];
const heads = (lines) => [...cssRuleHeads(css, lines)].join("\n");

test("dòng thân rule lấy selector rule bao", () => {
  assert.match(heads([2]), /^\.glass-surface \{$/);
  assert.match(heads([3]), /^\.glass-surface \{$/);
});

test("rule một dòng tính chính nó", () => {
  assert.match(heads([4]), /data-glass-shape="arc"/);
});

test("dòng selector (đổi tên) tính chính nó, danh sách nhiều dòng gộp lại", () => {
  assert.equal(heads([6]), ".a, .glass-surface > i {");
  assert.equal(heads([5]), ".a, .glass-surface > i {");
});

test("rule trong at-rule lấy rule gần nhất; dòng at-rule đi tiếp ra ngoài", () => {
  assert.equal(heads([11]).trim(), ".glass-layer {");
  assert.equal(heads([9]), "@media (max-width: 960px) {");
});

test("diff -U0 cho dòng xóa theo file base và dòng thêm theo file mới", () => {
  const diff = "@@ -6,3 +5,0 @@\n-x\n@@ -10 +9,2 @@\n";
  assert.deepEqual(changedLineNumbers(diff), { added: [9, 10], removed: [6, 7, 8, 10] });
});
