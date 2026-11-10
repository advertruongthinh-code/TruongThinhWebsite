// Stage design-system/ as claude.ai Design System file table under .tmp/design-system-publish/project/ (docs/specs/design-system.md R5).
// Preview images are published as plain files in preview-media/; links leaving design-system/ point to GitHub.
// Usage: node scripts/docs/stage-design-system.mjs, then publish with the Artifact tool as design-system/README.md instructs.
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';

const SRC = 'design-system';
const OUT = '.tmp/design-system-publish';
const REPO = 'https://github.com/advertruongthinh-code/TruongThinhWebsite/blob/main';

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  // posix.join so rel always uses '/' on Windows; Node's fs accepts both separators.
  const path = posix.join(dir, name);
  return statSync(path).isDirectory() ? walk(path) : [path];
});

rmSync(OUT, { recursive: true, force: true });
const staged = [];
for (const path of walk(SRC)) {
  const rel = posix.relative(SRC, path);
  const out = join(OUT, 'project', rel);
  mkdirSync(dirname(out), { recursive: true });
  if (rel.endsWith('.md')) {
    writeFileSync(out, readFileSync(path, 'utf8').replace(/\]\((?!https?:|#)([^)#]+)(#[^)]*)?\)/g, (whole, link, hash = '') => {
      const target = posix.normalize(posix.join(SRC, posix.dirname(rel), link));
      return target.startsWith(`${SRC}/`) ? whole : `](${REPO}/${target}${hash})`;
    }));
  } else {
    // Copy raw bytes: WebP images break if read as utf8.
    copyFileSync(path, out);
  }
  if (rel !== 'design-system.json') staged.push(`project/${rel}`);
}
console.log(JSON.stringify({ root: OUT, file_path: 'project/design-system.json', files: Object.fromEntries(staged.map((p) => [p, p])) }, null, 2));
