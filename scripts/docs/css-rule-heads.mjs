// Selector of the CSS rule enclosing each line (design-system.md R6.2): used for the component gate in check-docs.mjs.
// A line that opens its own rule (one-line rule, selector line) counts as itself; a selector line ending in a comma goes on to `{`;
// a rule body line walks back to the `{` opening the rule (skipping closed child blocks), and an at-rule also takes the enclosing rule.
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
    // Line in a multi-line selector list: walk down to the line with `{`.
    while (i < lines.length - 1 && /,\s*$/.test(lines[i]) && !lines[i].includes('{')) i += 1;
    let depth = 0;
    if (lines[i].includes('{')) {
      heads.add(selectorFrom(i));
      if (!/^\s*@/.test(lines[i])) continue;
      depth = 1;
      i -= 1;
    } else {
      // Rule body line (including the `}` closing the rule): belongs to the nearest open rule above.
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

// Changed lines in diff -U0: `+` per the new file, `-` per the base file (a deleted or renamed rule still counts).
export function changedLineNumbers(diff) {
  const added = [];
  const removed = [];
  for (const [, oldStart, oldCount, newStart, newCount] of diff.matchAll(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm)) {
    for (let n = 0; n < Number(oldCount ?? 1); n += 1) removed.push(Number(oldStart) + n);
    for (let n = 0; n < Number(newCount ?? 1); n += 1) added.push(Number(newStart) + n);
  }
  return { added, removed };
}

