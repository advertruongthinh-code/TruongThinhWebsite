// Docs gate (docs/specs/docs-system.md R4): link, line budget, ownership của spec và sync code-spec.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, matchesGlob } from 'node:path';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });
// Evidence thô dưới source-assets/ và research/ nằm trên PC của owner theo thiết kế (docs/index.md).
const LOCAL_EVIDENCE = /^(source-assets|research)\//;
const files = git('ls-files', '*.md').split('\n').filter(Boolean);
const errors = [];
const anchorCache = new Map();

// GitHub heading slug: chữ thường, bỏ dấu câu, space thành hyphen, đánh số khi trùng.
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
        if (!ignored(target) && !LOCAL_EVIDENCE.test(target)) errors.push(`${where}: broken link ${raw}`);
        continue;
      }
      if (hash && target.endsWith('.md') && statSync(target).isFile() && !anchors(target).has(hash.toLowerCase())) {
        errors.push(`${where}: missing anchor ${raw}`);
      }
    }
  });
}

// Giới hạn số dòng (docs/specs/docs-system.md R4, R9).
const BUDGET = { 'docs/STATE.md': 50, 'docs/index.md': 80 };
for (const file of files) {
  const max = file.startsWith('docs/specs/') ? 300 : BUDGET[file];
  // Không đếm chuỗi rỗng sau newline cuối file.
  const lines = max && readFileSync(file, 'utf8').replace(/\n$/, '').split('\n').length;
  if (lines > max) errors.push(`${file}: ${lines} lines, over the ${max} limit`);
}

// Ngân sách byte cho file agent nạp theo trigger (docs/specs/docs-system.md R9): dòng dài không lách được giới hạn dòng.
const BYTE_BUDGET = [
  [/^AGENTS\.md$/, 15000],
  [/^docs\/operations\/agent-rule-ad-images\.md$/, 16000],
  [/^docs\/operations\/agent-rule-/, 8000],
  [/^docs\/reference\//, 24000],
];
for (const file of files) {
  const max = BYTE_BUDGET.find(([re]) => re.test(file))?.[1];
  const bytes = max && statSync(file).size;
  if (bytes > max) errors.push(`${file}: ${bytes} bytes, over the ${max} limit`);
}

// Spec sở hữu file source qua glob `source:` trong frontmatter.
const specs = files
  .filter((f) => f.startsWith('docs/specs/') && !f.endsWith('_template.md'))
  .map((file) => {
    const block = readFileSync(file, 'utf8').match(/^source:\n((?:\s+- .+\n)+)/m);
    return { file, globs: block ? block[1].split('\n').filter(Boolean).map((l) => l.replace(/^\s+- /, '').trim()) : [] };
  })
  .filter((s) => s.globs.length);
const owners = (path) => specs.filter((s) => s.globs.some((g) => matchesGlob(path, g)));

// Mọi file không phải media trong src/site/ thuộc về một spec.
const MEDIA = /\.(avif|webp|jpe?g|png|gif|svg|mp4|webm|woff2?|ico)$/i;
const unowned = git('ls-files', 'src/site').split('\n').filter((f) => f && !MEDIA.test(f) && !owners(f).length);
if (unowned.length) errors.push(`ownership: ${unowned.length} files in src/site/ not owned by any spec: ${unowned.join(', ')}`);

// Sync chạy trên pull request: CI đặt DOCS_BASE là base commit và PR_NUMBER là số PR.
// Mô tả PR đọc qua API lúc chạy, không lấy từ event: re-run sau khi sửa mô tả đọc bản mới.
// Chạy local không có PR_NUMBER thì đọc PR_BODY.
if (process.env.DOCS_BASE) {
  const { PR_NUMBER, GITHUB_API_URL, GITHUB_REPOSITORY, GH_TOKEN } = process.env;
  const res = PR_NUMBER && await fetch(`${GITHUB_API_URL}/repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}`, { headers: { authorization: `Bearer ${GH_TOKEN}` } });
  if (res && !res.ok) throw new Error(`sync: cannot read PR body, HTTP ${res.status}`);
  const body = res ? (await res.json()).body ?? '' : process.env.PR_BODY ?? '';
  const changed = git('diff', '--name-only', `${process.env.DOCS_BASE}...HEAD`).split('\n').filter(Boolean);
  const waived = /^Spec: không đổi - \S/m.test(body);
  for (const spec of specs) {
    const touched = changed.filter((f) => f !== spec.file && owners(f).includes(spec));
    if (touched.length && !changed.includes(spec.file) && !waived) {
      errors.push(`sync: ${touched.join(', ')} changed but ${spec.file} did not; update the spec or add this line, alone and unformatted, to the PR body: Spec: không đổi - <lý do>`);
    }
  }
}

// Design drift (R5.2): mỗi custom property trong khối :root trên cùng của style.css có token cùng tên và cùng giá trị.
const tokens = JSON.parse(readFileSync('design-system/tokens.json', 'utf8'));
const tokenValues = new Map(Object.values(tokens).flatMap((family) => family?.tokens ?? [])
  .map((t) => [t.name, typeof t.value === 'string' ? t.value : Object.values(t.value)[0]]));
const rootVars = new Map([...readFileSync('src/site/style.css', 'utf8').match(/^:root \{\n([\s\S]*?)\n\}/m)[1]
  .matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]));
for (const [name, raw] of rootVars) {
  if (name in (tokens.meta?.cssOnly ?? {})) continue;
  const value = raw.replace(/^var\(--([\w-]+)\)$/, (whole, ref) => rootVars.get(ref) ?? whole);
  if (!tokenValues.has(name)) errors.push(`design drift: --${name} in :root of src/site/style.css has no token in design-system/tokens.json`);
  else if (tokenValues.get(name) !== value) errors.push(`design drift: --${name} is ${value} in CSS but the token says ${tokenValues.get(name)}`);
}

// File generated: preview, bundle.css và ảnh khớp source site (R5.3); DESIGN.md và sidecar khớp design-system/ (R6).
for (const script of ['build-design-system.mjs', 'build-design-md.mjs']) {
  try {
    execFileSync(process.execPath, [`scripts/docs/${script}`, '--check'], { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    errors.push(error.stderr.trim());
  }
}

// Markup Advertising đã capture (R5.3): mọi class trong preview vẫn còn trong source site (CSS, runtime, HTML, generator scripts/site), nếu không thì capture lại.
const siteText = git('ls-files', 'src/site', 'scripts/site').split('\n').filter((f) => /\.(css|m?js|html)$/.test(f)).map((f) => readFileSync(f, 'utf8')).join('\n');
for (const preview of git('ls-files', 'design-system/components/*/preview.html').split('\n').filter(Boolean)) {
  const classes = new Set([...readFileSync(preview, 'utf8').matchAll(/\sclass="([^"]*)"/g)].flatMap(([, list]) => list.split(/\s+/)).filter(Boolean));
  const gone = [...classes].filter((name) => !new RegExp(`(^|[^\\w-])${name.replace(/[^\w-]/g, '\\$&')}($|[^\\w-])`).test(siteText));
  if (gone.length) errors.push(`design-system: ${preview} uses classes no longer in src/site (${gone.join(', ')}); run node scripts/docs/capture-design-system.mjs then build-design-system.mjs`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`qa:docs FAIL: ${errors.length} errors`);
  process.exit(1);
}
console.log(`qa:docs PASS: ${files.length} Markdown files`);
