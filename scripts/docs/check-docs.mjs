// Docs gate (docs/specs/docs-system.md R4): links, line budget, spec ownership and code-spec sync.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, matchesGlob } from 'node:path';
import { changedLineNumbers, cssRuleHeads } from './css-rule-heads.mjs';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });
// Raw evidence under source-assets/ and research/ lives on the owner's PC by design (docs/index.md).
const LOCAL_EVIDENCE = /^(source-assets|research)\//;
const files = git('ls-files', '*.md').split('\n').filter(Boolean);
const errors = [];
const anchorCache = new Map();

// GitHub heading slug: lowercase, strip punctuation, spaces to hyphens, number duplicates.
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
      let decoded;
      try { decoded = decodeURIComponent(raw); } catch {
        errors.push(`${file}:${i + 1}: malformed link ${raw}`);
        continue;
      }
      const [path, hash] = decoded.split('#');
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

// Line limits (docs/specs/docs-system.md R4, R9).
const BUDGET = { 'docs/STATE.md': 50, 'docs/index.md': 80 };
for (const file of files) {
  const max = file.startsWith('docs/specs/') ? 300 : BUDGET[file];
  // Do not count the empty string after the file's final newline.
  const lines = max && readFileSync(file, 'utf8').replace(/\n$/, '').split('\n').length;
  if (lines > max) errors.push(`${file}: ${lines} lines, over the ${max} limit`);
}

// Byte budget for files an agent loads on trigger (docs/specs/docs-system.md R9): long lines cannot evade the line limit.
const BYTE_BUDGET = [
  [/^AGENTS\.md$/, 15000],
  [/^docs\/operations\/agent-rule-ad-images\.md$/, 24000],
  [/^docs\/operations\/agent-rule-model-routing\.md$/, 16000],
  [/^docs\/operations\/agent-rule-/, 8000],
  [/^docs\/reference\//, 24000],
];
for (const file of files) {
  const max = BYTE_BUDGET.find(([re]) => re.test(file))?.[1];
  const bytes = max && statSync(file).size;
  if (bytes > max) errors.push(`${file}: ${bytes} bytes, over the ${max} limit`);
}

// A spec owns source files through the `source:` globs in its frontmatter.
const specs = files
  .filter((f) => f.startsWith('docs/specs/') && !f.endsWith('_template.md'))
  .map((file) => {
    const block = readFileSync(file, 'utf8').match(/^source:\n((?:\s+- .+\n)+)/m);
    return { file, globs: block ? block[1].split('\n').filter(Boolean).map((l) => l.replace(/^\s+- /, '').trim()) : [] };
  })
  .filter((s) => s.globs.length);
const owners = (path) => specs.filter((s) => s.globs.some((g) => matchesGlob(path, g)));

// Every non-media file in src/site/ belongs to a spec.
const MEDIA = /\.(avif|jxl|webp|jpe?g|png|gif|svg|mp4|webm|woff2?|ico)$/i;
const unowned = git('ls-files', 'src/site').split('\n').filter((f) => f && !MEDIA.test(f) && !owners(f).length);
if (unowned.length) errors.push(`ownership: ${unowned.length} files in src/site/ not owned by any spec: ${unowned.join(', ')}`);

// Sync runs on pull requests: CI sets DOCS_BASE to the base commit and PR_NUMBER to the PR number (empty DOCS_BASE skips sync).
// A local run without DOCS_BASE checks against origin/main, so the gap shows before the push, not as a red PR.
// The PR description is read through the API at run time, not from the event: a re-run after editing the description reads the new text.
// A local run without PR_NUMBER reads PR_BODY.
const originMain = () => { try { return git('rev-parse', '--verify', '-q', 'origin/main').trim(); } catch { return ''; } };
const docsBase = process.env.DOCS_BASE ?? (process.env.CI ? '' : originMain());
if (docsBase) {
  const { PR_NUMBER, GITHUB_API_URL, GITHUB_REPOSITORY, GH_TOKEN } = process.env;
  const res = PR_NUMBER && await fetch(`${GITHUB_API_URL}/repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}`, { headers: { authorization: `Bearer ${GH_TOKEN}` } });
  if (res && !res.ok) throw new Error(`sync: cannot read PR body, HTTP ${res.status}`);
  const prBody = res ? (await res.json()).body ?? '' : process.env.PR_BODY ?? '';
  const base = `${docsBase}...HEAD`;
  const mergeBase = git('merge-base', docsBase, 'HEAD').trim();
  // Waiver lines count in the PR description or in any commit message on the branch: the local run reads commit
  // messages before the PR exists, and a rewritten description cannot drop them.
  const body = `${prBody}\n${git('log', '--format=%B', `${mergeBase}..HEAD`)}`;
  const changed = git('diff', '--name-only', base).split('\n').filter(Boolean);
  const waived = /^Spec: không đổi - (?!<)\S/m.test(body);
  for (const spec of specs) {
    const touched = changed.filter((f) => f !== spec.file && owners(f).includes(spec));
    if (touched.length && !changed.includes(spec.file) && !waived) {
      errors.push(`sync: ${touched.join(', ')} changed but ${spec.file} did not; update the spec or add this line, alone and unformatted, to a commit message on this branch or the PR body: Spec: không đổi - <lý do>`);
    }
  }
  // Component gate (design-system.md R6): the first `Nguồn:` line of a component README lists files and CSS selectors; a PR that changes
  // them without editing that README needs a `Design System: không đổi - <lý do>` line in the PR description or a commit message.
  // The selector of the rule enclosing each changed CSS line, both added lines (new file) and removed lines (base file): removing or renaming a rule
  // also changes the selector.
  const ruleHeads = new Map();
  for (const file of changed.filter((f) => /^src\/site\/.*\.css$/.test(f))) {
    const { added, removed } = changedLineNumbers(git('diff', '-U0', base, '--', file));
    const before = removed.length ? git('show', `${mergeBase}:${file}`).split('\n') : [];
    const after = existsSync(file) ? readFileSync(file, 'utf8').split('\n') : [];
    ruleHeads.set(file, [...cssRuleHeads(after, added), ...cssRuleHeads(before, removed)].join('\n'));
  }
  const dsWaived = /^Design System: không đổi - (?!<)\S/m.test(body);
  for (const readme of git('ls-files', 'design-system/components/*/README.md').split('\n').filter(Boolean)) {
    const line = readFileSync(readme, 'utf8').match(/^Nguồn: (.*)$/m)?.[1] ?? '';
    const refs = [...line.matchAll(/`([^`]+)`/g)].map(([, ref]) => ref);
    const files = refs.filter((ref) => /^(src|scripts)\//.test(ref));
    const selectors = refs.filter((ref) => ref.startsWith('.'));
    const hit = [
      ...files.filter((f) => changed.includes(f)),
      ...selectors.filter((sel) => [...ruleHeads.values()].some((heads) => new RegExp(`${sel.replace(/[.]/g, '\\.')}(?![\\w-])`).test(heads))),
    ];
    if (hit.length && !changed.includes(readme) && !dsWaived) {
      errors.push(`design-system sync: ${hit.join(', ')} changed but ${readme} did not; update it or add this line, alone and unformatted, to a commit message on this branch or the PR body: Design System: không đổi - <lý do>`);
    }
  }
}

// Design drift (design-system.md R1.2): every custom property in the top :root block of style.css has a token with the same name and value.
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

// Typography (design-system.md R1.2): every function expression in a type token's "CSS thật:" appears verbatim in the site CSS.
const siteCss = ['src/site/style.css', 'src/site/detail.css'].map((f) => readFileSync(f, 'utf8')).join('\n').replace(/\s+/g, ' ');
// Balanced-parenthesis function expression starting at position i (min, max, clamp, calc, var).
const balanced = (text, i) => {
  let depth = 0;
  for (let j = text.indexOf('(', i); j < text.length; j += 1) {
    if (text[j] === '(') depth += 1;
    if (text[j] === ')' && --depth === 0) return text.slice(i, j + 1);
  }
  return text.slice(i);
};
for (const style of (tokens.type?.groups ?? []).flatMap((group) => group.styles)) {
  const real = style.usage?.split('CSS thật:')[1];
  if (!real) continue;
  for (const m of real.matchAll(/(?<![\w-])(?:clamp|min|max|calc|var)\(/g)) {
    const expr = balanced(real, m.index).replace(/\s+/g, ' ');
    if (!siteCss.includes(expr)) errors.push(`design drift: type token ${style.name} says CSS thật ${expr}, not found in src/site/style.css or detail.css`);
  }
}

// Generated files: preview, bundle.css and images match the site source (design-system.md R3); DESIGN.md and sidecar match design-system/ (R4).
for (const script of ['build-design-system.mjs', 'build-design-md.mjs']) {
  try {
    execFileSync(process.execPath, [`scripts/docs/${script}`, '--check'], { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    errors.push(error.stderr.trim());
  }
}

// Captured Advertising markup (design-system.md R3): every class in the preview still exists in the site source (CSS, runtime, HTML, scripts/site generators), otherwise recapture.
const siteText = git('ls-files', 'src/site', 'scripts/site').split('\n').filter((f) => /\.(css|m?js|html)$/.test(f)).map((f) => readFileSync(f, 'utf8')).join('\n');
for (const preview of git('ls-files', 'design-system/components/*/preview.html').split('\n').filter(Boolean)) {
  const classes = new Set([...readFileSync(preview, 'utf8').matchAll(/\sclass="([^"]*)"/g)].flatMap(([, list]) => list.split(/\s+/)).filter(Boolean));
  // swiper-* classes are built at run time by the vendor Swiper (Gallery), not in the site source.
  const gone = [...classes].filter((name) => !name.startsWith('swiper-') && !new RegExp(`(^|[^\\w-])${name.replace(/[^\w-]/g, '\\$&')}($|[^\\w-])`).test(siteText));
  if (gone.length) errors.push(`design-system: ${preview} uses classes no longer in src/site (${gone.join(', ')}); run node scripts/docs/capture-design-system.mjs then build-design-system.mjs`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`qa:docs FAIL: ${errors.length} errors`);
  process.exit(1);
}
console.log(`qa:docs PASS: ${files.length} Markdown files`);
