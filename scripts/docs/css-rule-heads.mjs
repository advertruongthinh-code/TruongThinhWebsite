// Selector của rule CSS bao mỗi dòng (design-system.md R6.2): dùng cho gate component trong check-docs.mjs.
// Dòng tự mở rule (rule một dòng, dòng selector) tính chính nó; dòng selector cuối bằng dấu phẩy đi tới `{`;
// dòng thân rule đi ngược tới `{` mở rule (bỏ qua khối con đã đóng), at-rule thì lấy thêm rule bao ngoài.
export function cssRuleHeads(lines, lineNumbers) {
  const heads = new Set();
  const selectorFrom = (i) => {
    let k = i;
    while (k > 0 && /,\s*$/.test(lines[k - 1])) k -= 1;
    return lines.slice(k, i + 1).join(' ');
  };
  for (const n of lineNumbers) {
    let i = Math.min(n, lines.length) - 1;
    if (i < 0) continue;
    // Dòng trong danh sách selector nhiều dòng: đi xuống tới dòng có `{`.
    while (i < lines.length - 1 && /,\s*$/.test(lines[i]) && !lines[i].includes('{')) i += 1;
    let depth = 0;
    if (lines[i].includes('{')) {
      heads.add(selectorFrom(i));
      if (!/^\s*@/.test(lines[i])) continue;
      depth = 1;
      i -= 1;
    } else {
      // Dòng thân rule (kể cả `}` đóng rule): thuộc rule mở gần nhất phía trên.
      i -= 1;
    }
    for (; i >= 0; i -= 1) {
      depth += (lines[i].match(/\}/g) ?? []).length - (lines[i].match(/\{/g) ?? []).length;
      if (lines[i].includes('{') && depth < 0) {
        heads.add(selectorFrom(i));
        depth += 1;
        if (!/^\s*@/.test(lines[i])) break;
      }
    }
  }
  return heads;
}

// Dòng đổi trong diff -U0: `+` theo file mới, `-` theo file base (rule bị xóa hoặc đổi tên vẫn tính).
export function changedLineNumbers(diff) {
  const added = [];
  const removed = [];
  for (const [, oldStart, oldCount, newStart, newCount] of diff.matchAll(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm)) {
    for (let n = 0; n < Number(oldCount ?? 1); n += 1) removed.push(Number(oldStart) + n);
    for (let n = 0; n < Number(newCount ?? 1); n += 1) added.push(Number(newStart) + n);
  }
  return { added, removed };
}

