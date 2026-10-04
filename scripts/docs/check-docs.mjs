// Docs gate (docs/specs/docs-system.md R4): broken internal links and line budgets.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });
// Legacy history leaves the tree in plan T17/T20; tasks/plan.md and todo.md belong to another thread.
const LEGACY = /^(docs\/archive\/|docs\/verification\/|tasks\/archive\/|tasks\/(plan|todo)\.md$)/;
// Raw evidence under source-assets/ and research/ stays on the owner's PC by design (docs/index.md).
const LOCAL_EVIDENCE = /^(source-assets|research)\//;
const files = git('ls-files', '*.md').split('\n').filter((f) => f && !LEGACY.test(f));
const errors = [];
const anchorCache = new Map();

// GitHub heading slug: lowercase, drop punctuation, spaces to hyphens, number duplicates.
function anchors(file) {
  if (!anchorCache.has(file)) {
    const seen = new Map();
    const set = new Set();
    let fence = false;
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      if (/^\s*(```|~~~)/.test(line)) fence = !fence;
      const m = !fence && line.match(/^#{1,6}\s+(.*?)\s*#*\s*$/);
      if (!m) continue;
      const base = m[1].toLowerCase().replace(/<[^>]*>/g, '').replace(/[^\p{L}\p{M}\p{N}\- _]/gu, '').replace(/ /g, '-');
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      set.add(n ? `${base}-${n}` : base);
    }
    anchorCache.set(file, set);
  }
  return anchorCache.get(file);
}

const ignored = (path) => {
  try { git('check-ignore', '-q', path); return true; } catch { return false; }
};

for (const file of files) {
  let fence = false;
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (fence) return;
    for (const [, raw] of line.replace(/`[^`]*`/g, '').matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      if (/^(https?:|mailto:|tel:|data:)/.test(raw)) continue;
      const [path, hash] = decodeURIComponent(raw).split('#');
      const target = path ? join(dirname(file), path) : file;
      const where = `${file}:${i + 1}`;
      if (!existsSync(target)) {
        if (!ignored(target) && !LOCAL_EVIDENCE.test(target)) errors.push(`${where}: link gãy ${raw}`);
        continue;
      }
      if (hash && target.endsWith('.md') && statSync(target).isFile() && !anchors(target).has(hash.toLowerCase())) {
        errors.push(`${where}: anchor không tồn tại ${raw}`);
      }
    }
  });
}

// Budgets apply to new-format specs only until the migration (tasks/docs-overhaul-plan.md T19).
for (const file of files.filter((f) => f.startsWith('docs/specs/'))) {
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n').length;
  if (/^status:\s*(live|planned|dormant)\s*$/m.test(text) && lines > 300) {
    errors.push(`${file}: ${lines} dòng, vượt giới hạn 300 của spec`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`qa:docs FAIL: ${errors.length} lỗi`);
  process.exit(1);
}
console.log(`qa:docs PASS: ${files.length} file Markdown`);
