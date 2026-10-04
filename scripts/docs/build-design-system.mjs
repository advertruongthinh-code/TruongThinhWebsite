// Builds design-system/components/bundle.css and component previews from the live site source (docs/specs/docs-system.md R5.3).
// Usage: node scripts/docs/build-design-system.mjs [--check]
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const OUT = 'design-system';
const FONT = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,500&display=swap">';
// motion-fallback is the site's own no-animation final state (motion.js); previews render that state.
const boot = (extra) => `<script>document.documentElement.lang = "vi"; document.documentElement.classList.add("motion-fallback", "motion-ready"${extra ? `, "${extra}"` : ''});</script>`;
// A transformed wrapper becomes the containing block for position: fixed, so fixed shell parts stay inside their frame.
const frame = (markup, { cls = '', bg = 'var(--paper)', height }) =>
  `<div style="position: relative; height: ${height}px; overflow: hidden; transform: translateZ(0); background: ${bg};">\n`
  + markup.replace(/class="([^"]*)"/, (_, c) => `class="${[c, cls].filter(Boolean).join(' ')}"`) + '\n</div>';

// start: regex for the opening tag; open: show the dialog as motion.js leaves it (open, is-active); htmlClass: extra root class; frames: one framed copy per state class;
// endStyle: inline end values motion.js sets that have no CSS fallback;
// boot: false skips motion-fallback where it would override the state classes (header tone).
const COMPONENTS = [
  { name: 'Header', group: 'Shell', height: 420, file: 'src/site/index.html', start: /<header class="site-header"/, boot: false,
    frames: [{ cls: 'is-brand-inverse', bg: 'var(--ink)', height: 140 }, { cls: 'is-ink', height: 140 }, { cls: 'is-collapsed is-brand-color', height: 140 }] },
  { name: 'BrandLockup', group: 'Shell', height: 120, file: 'src/site/index.html', start: /<svg class="brand-lockup"/ },
  { name: 'FullMenu', group: 'Shell', height: 720, file: 'src/site/index.html', start: /<dialog class="site-menu"/, open: true, htmlClass: 'menu-open',
    endStyle: '.site-menu .menu-nav { opacity: 1; }' },
  { name: 'Footer', group: 'Shell', height: 560, file: 'src/site/index.html', start: /<div class="site-invitation/, also: /<footer class="site-footer"/ },
  { name: 'FloatingCta', group: 'Shell', height: 120, file: 'src/site/index.html', start: /<a\s+class="floating-cta"/,
    frames: [{ cls: 'show', height: 120 }] },
  { name: 'Hero', group: 'Page', height: 720, file: 'src/site/index.html', start: /<section\s+class="hero"/ },
  { name: 'ProjectReel', group: 'Page', height: 560, file: 'src/site/index.html', start: /<section\s+class="project-reel/ },
  { name: 'Gallery', group: 'Page', height: 640, file: 'src/site/residential/index.html', start: /<section\s+class="detail-gallery/ },
  // Advertising markup is built at runtime; capture-design-system.mjs snapshots it into scripts/docs/captures/.
  // pad: space kept above the focus element inside the frame; size: image variant width.
  ...[['Filter', 240, 40], ['MediaCard', 280, 35, 480], ['Masonry', 900, 35, 480], ['Skeleton', 900, 200, 480], ['Primary', 760, 40],
    ['Suggestion', 400, 35, 480], ['Viewer', 900, 0]]
    .map(([name, height, pad, size]) => ({ name, group: 'Advertising', height, pad, size, file: `scripts/docs/captures/${name}.html`, capture: true })),
  // The ring exists only while an image loads, so its host box is written here; the ring itself is runtime markup (catalog-runtime.mjs).
  { name: 'LoadRing', group: 'Advertising', height: 280, file: 'src/site/advertising-products/catalog-runtime.mjs', start: /photoLoadRing\.className = "media-load-ring"/,
    markup: '<div style="position: relative; width: 316px; height: 237px; margin: 20px 35px; background: var(--media-loading-surface);">\n<span class="media-load-ring" aria-hidden="true"></span>\n</div>' },
  // The bar shows only until a suggestion photo paints, so the buttons are written here without photos; the bar itself is detail.css.
  { name: 'LoadBar', group: 'Advertising', height: 280, file: 'src/site/detail.css', start: /Indeterminate bar painted along the bottom edge/,
    markup: '<div class="advertising-photo-view__suggestion-links" style="width: 316px; margin: 20px 35px;">\n'
      + '<button type="button" class="advertising-photo-view__suggestion-link" aria-pressed="false"><span class="advertising-photo-view__suggestion-label">Chữ nổi Mica</span></button>\n'
      + '<button type="button" class="advertising-photo-view__suggestion-link" aria-pressed="false"><span class="advertising-photo-view__suggestion-label">Logo và chữ nổi tòa nhà</span></button>\n'
      + '<button type="button" class="advertising-photo-view__suggestion-link" aria-pressed="true"><span class="advertising-photo-view__suggestion-label">Bảng vẫy Mica hút nổi</span></button>\n</div>' },
];

// Returns the outer HTML of the element whose opening tag matches `start`, balancing nested tags of the same name.
function extract(html, start) {
  const at = html.search(start);
  if (at < 0) throw new Error(`không tìm thấy ${start}`);
  const tag = html.slice(at + 1).match(/^[a-z0-9]+/)[0];
  const re = new RegExp(`<${tag}\\b|</${tag}>`, 'g');
  re.lastIndex = at;
  let depth = 0;
  for (let m; (m = re.exec(html));) {
    depth += m[0].startsWith('</') ? -1 : 1;
    if (!depth) return html.slice(at, re.lastIndex);
  }
  throw new Error(`thẻ ${tag} không đóng`);
}

const outputs = new Map();
const photos = new Map();

// Site images point at /assets/content/...; previews use a WebP variant copied under design-system/assets/Photos/:
// 960px by default, 480px for card-sized components.
function localizeImages(markup, size = 960) {
  return markup
    .replace(/\s+data-src="[^"]*"/g, '')
    .replace(/src="\/assets\/content\/([^"]+?)(?:-(?:480|960))?\.(webp|avif|jpe?g|png)"/g, (whole, path, ext) => {
      const source = [`${path}-${size}.webp`, `${path}.webp`, `${path}.${ext}`]
        .map((candidate) => `src/site/assets/content/${candidate}`).find(existsSync);
      if (!source) throw new Error(`không tìm thấy ảnh ${whole}`);
      const name = basename(source).replace(/-960(?=\.)/, '');
      photos.set(`${OUT}/assets/Photos/${name}`, source);
      return `src="../../assets/Photos/${name}"`;
    });
}

// A capture starts with <!-- capture ... html="..." body="..." -->; the preview restores those root classes,
// then scrolls its frame to the [data-ds-focus] element once layout settles, since ancestors keep the page offsets.
function fromCapture(c, html) {
  const [, head, body] = html.match(/^<!-- capture (.*?) -->\n([\s\S]*)$/);
  const attr = (key) => head.match(new RegExp(`${key}="([^"]*)"`))[1];
  const bodyClasses = attr('body').split(/\s+/).filter(Boolean).map((n) => JSON.stringify(n)).join(', ');
  c.bootScript = `<script>document.documentElement.lang = "vi"; document.documentElement.className = ${JSON.stringify(attr('html'))};
const ready = (fn) => (document.readyState === "loading" ? addEventListener("DOMContentLoaded", fn) : fn());
ready(() => document.body.classList.add(${bodyClasses}));
addEventListener("load", () => requestAnimationFrame(() => {
  const inner = document.querySelector("[data-ds-frame]"), focus = inner.querySelector("[data-ds-focus]");
  inner.style.marginTop = -Math.max(0, focus.getBoundingClientRect().top - inner.getBoundingClientRect().top - ${c.pad}) + "px";
}));</script>`;
  return frame(`<div data-ds-frame>\n${body.trim()}\n</div>`, { height: c.height });
}

for (const c of COMPONENTS) {
  const html = readFileSync(c.file, 'utf8');
  if (c.capture) {
    const markup = localizeImages(fromCapture(c, html), c.size);
    outputs.set(`${OUT}/components/${c.name}/preview.html`,
      `<!-- @dsCard group="${c.group}" height=${c.height} -->\n<!-- GENERATED by scripts/docs/build-design-system.mjs from ${c.file}; do not edit. -->\n${FONT}\n${c.bootScript}\n${markup}\n`);
    continue;
  }
  if (!c.start.test(html)) throw new Error(`không tìm thấy ${c.start} trong ${c.file}`);
  let markup = c.markup ?? extract(html, c.start) + (c.also ? '\n' + extract(html, c.also) : '');
  if (c.open) markup = markup.replace(/^<dialog class="([^"]*)"/, '<dialog open class="$1 is-active"');
  markup = localizeImages(markup);
  if (c.frames) markup = c.frames.map((f) => frame(markup, f)).join('\n');
  outputs.set(`${OUT}/components/${c.name}/preview.html`,
    `<!-- @dsCard group="${c.group}" height=${c.height} -->\n<!-- GENERATED by scripts/docs/build-design-system.mjs from ${c.file}; do not edit. -->\n${FONT}\n${c.boot === false ? '' : boot(c.htmlClass) + '\n'}${c.endStyle ? `<style>${c.endStyle}</style>\n` : ''}${markup}\n`);
}

outputs.set(`${OUT}/components/bundle.css`,
  '/* GENERATED by scripts/docs/build-design-system.mjs from src/site/style.css and src/site/detail.css; do not edit. */\n'
  // Self-hosted @font-face URLs do not resolve on claude.ai; previews load the font from Google instead.
  + readFileSync('src/site/style.css', 'utf8').replace(/^\/\* Self-hosted[^\n]*\n|^@font-face \{[^}]*\}\n+/gm, '') + '\n' + readFileSync('src/site/detail.css', 'utf8'));

const check = process.argv.includes('--check');
const stale = [];
for (const [path, text] of outputs) {
  if (check) { if (!existsSync(path) || readFileSync(path, 'utf8') !== text) stale.push(path); continue; }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}
for (const [path, source] of photos) {
  if (check) { if (!existsSync(path) || !readFileSync(path).equals(readFileSync(source))) stale.push(path); continue; }
  mkdirSync(dirname(path), { recursive: true });
  copyFileSync(source, path);
}
if (stale.length) {
  console.error(`design-system lệch source: ${stale.join(', ')}; chạy node scripts/docs/build-design-system.mjs`);
  process.exit(1);
}
console.log(`design-system ${check ? 'khớp' : 'đã sinh'}: ${outputs.size + photos.size} file`);
