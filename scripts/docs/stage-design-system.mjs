// Stage design-system/ thành file table Design System của claude.ai dưới .tmp/design-system-publish/project/ (docs/specs/docs-system.md R7).
// Ảnh preview publish thành file thường ở preview-media/; link rời design-system/ trỏ về GitHub.
// Cách dùng: node scripts/docs/stage-design-system.mjs, rồi publish bằng Artifact tool như design-system/README.md hướng dẫn.
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';

const SRC = 'design-system';
const OUT = '.tmp/design-system-publish';
const REPO = 'https://github.com/advertruongthinh-code/TruongThinhWebsite/blob/main';

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  // posix.join để rel luôn dùng '/' trên Windows; fs của Node nhận được cả hai dấu.
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
    // Chép nguyên byte: ảnh WebP hỏng nếu đọc qua utf8.
    copyFileSync(path, out);
  }
  if (rel !== 'design-system.json') staged.push(`project/${rel}`);
}
console.log(JSON.stringify({ root: OUT, file_path: 'project/design-system.json', files: Object.fromEntries(staged.map((p) => [p, p])) }, null, 2));
