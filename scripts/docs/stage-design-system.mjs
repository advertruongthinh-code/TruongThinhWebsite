// Stages design-system/ as the claude.ai Design System file table under .tmp/design-system-publish/project/ (docs/specs/docs-system.md R7).
// Photos are artifact uploads: previews point at /_blob/<id> from design-system.json; links leaving design-system/ point at GitHub.
// Usage: node scripts/docs/stage-design-system.mjs, then publish with the Artifact tool as design-system/README.md says.
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';

const SRC = 'design-system';
const OUT = '.tmp/design-system-publish';
const REPO = 'https://github.com/advertruongthinh-code/TruongThinhWebsite/blob/main';
const index = JSON.parse(readFileSync(`${SRC}/design-system.json`, 'utf8'));
const photos = index.assetGroups.Photos?.files ?? {};
const missing = [];

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? walk(path) : [path];
});

rmSync(OUT, { recursive: true, force: true });
const staged = [];
for (const path of walk(SRC)) {
  const rel = posix.relative(SRC, path);
  if (rel.startsWith('assets/Photos/') && rel.endsWith('.webp')) {
    const record = photos[posix.basename(rel)];
    // A new or regenerated photo needs a fresh upload before publishing.
    if (!record || record.size !== statSync(path).size) missing.push(path);
    continue;
  }
  let text = readFileSync(path, 'utf8');
  if (rel.endsWith('preview.html')) {
    text = text.replace(/\.\.\/\.\.\/assets\/Photos\/([^"')\s]+)/g, (whole, name) => (photos[name] ? `/_blob/${photos[name].blob}` : (missing.push(name), whole)));
  } else if (rel.endsWith('.md')) {
    text = text.replace(/\]\((?!https?:|#)([^)#]+)(#[^)]*)?\)/g, (whole, link, hash = '') => {
      const target = posix.normalize(posix.join(SRC, posix.dirname(rel), link));
      return target.startsWith(`${SRC}/`) ? whole : `](${REPO}/${target}${hash})`;
    });
  }
  const out = join(OUT, 'project', rel);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, text);
  if (rel !== 'design-system.json') staged.push(`project/${rel}`);
}
if (missing.length) {
  console.error(`Ảnh chưa upload hoặc đã đổi (upload rồi ghi id vào ${SRC}/design-system.json): ${missing.join(', ')}`);
  process.exit(1);
}
console.log(JSON.stringify({ root: OUT, file_path: 'project/design-system.json', files: Object.fromEntries(staged.map((p) => [p, p])) }, null, 2));
