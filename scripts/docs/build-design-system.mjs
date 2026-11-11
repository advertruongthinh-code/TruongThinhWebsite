// Builds design-system/components/bundle.css and the component previews from the live site source (docs/specs/design-system.md R3).
// Usage: node scripts/docs/build-design-system.mjs [--check]
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { renderProjectReel } from '../site/project-reel.mjs';
import { renderBlocks } from '../site/blocks.mjs';
import { renderNewsListPage } from '../site/block-pages.mjs';

const OUT = 'design-system';
// Links in the preview do not navigate: claude.ai stops the live preview when the frame leaves the page (spec design-system R3.5).
const HEAD = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,500&display=swap">\n'
  + '<script>addEventListener("click", (event) => { if (event.target.closest("a[href]")) event.preventDefault(); }, true);</script>';
// motion-fallback is the site's final no-animation state (motion.js); the preview renders exactly that state.
const boot = (extra) => `<script>document.documentElement.lang = "vi"; document.documentElement.classList.add("motion-fallback", "motion-ready"${extra ? `, "${extra}"` : ''});</script>`;
// A wrapper with a transform becomes the containing block of position: fixed, so the fixed shell parts stay inside the frame.
const frame = (markup, { cls = '', bg = 'var(--paper)', height }) =>
  `<div style="position: relative; height: ${height}px; overflow: hidden; transform: translateZ(0); background: ${bg};">\n`
  + markup.replace(/class="([^"]*)"/, (_, c) => `class="${[c, cls].filter(Boolean).join(' ')}"`) + '\n</div>';

// start: regex for the opening tag; open: shows the dialog exactly as motion.js leaves it (open, is-active); htmlClass: extra class on the root; frames: one framed copy per state class;
// endStyle: final inline values set by motion.js that the CSS has no fallback for;
// boot: false drops motion-fallback where it would override a state class (header tone).
const BLOCKS_PREVIEW = 'scripts/docs/blocks-preview.json';
const blocksPreview = JSON.parse(readFileSync(BLOCKS_PREVIEW, 'utf8'));
const blocksPreviewContext = { projects: new Map(blocksPreview.projects.map((p) => [p.id, p])), news: new Map(blocksPreview.news.map((p) => [p.id, p])) };
const COMPONENTS = [
  { name: 'Header', group: 'Shell', height: 420, file: 'src/site/index.html', start: /<header class="site-header"/, boot: false,
    frames: [{ cls: 'is-brand-inverse', bg: 'var(--ink)', height: 140 }, { cls: 'is-ink', height: 140 }, { cls: 'is-collapsed is-surface is-ink is-brand-color', height: 140 }] },
  { name: 'BrandLockup', group: 'Shell', height: 120, file: 'src/site/index.html', start: /<svg class="brand-lockup"/ },
  { name: 'FullMenu', group: 'Shell', height: 720, file: 'src/site/index.html', start: /<dialog class="site-menu"/, open: true, htmlClass: 'menu-open',
    endStyle: '.site-menu .menu-nav { opacity: 1; }' },
  { name: 'Footer', group: 'Shell', height: 560, file: 'src/site/index.html', start: /<div class="site-invitation/, also: [/<footer class="site-footer"/] },
  { name: 'FloatingCta', group: 'Shell', height: 120, file: 'src/site/index.html', start: /<a\s+class="floating-cta"/,
    frames: [{ cls: 'show', height: 120 }] },
  { name: 'Hero', group: 'Page', height: 720, file: 'src/site/index.html', start: /<section\s+class="hero"/ },
  { name: 'ProjectReel', group: 'Page', height: 560, file: 'src/site/index.html', start: /<section\s+class="project-reel/ },
  { name: 'BannerCta', group: 'Page', height: 600, file: 'src/site/index.html', start: /<section class="legacy-closer/ },
  // also: add other blocks, from the same file or [file, regex].
  { name: 'Portal', group: 'Page', height: 720, file: 'src/site/residential/index.html', start: /<section\s+class="portal-stage/ },
  { name: 'Marquee', group: 'Page', height: 520, file: 'src/site/residential/index.html', start: /<section\s+class="capability-marquee/,
    also: [['src/site/index.html', /<section\s+class="capability-marquee capability-marquee--clients/]] },
  { name: 'DetailBlocks', group: 'Page', height: 1400, file: 'src/site/residential/index.html', start: /<section\s+class="detail-lead/,
    also: [/<section\s+class="detail-heading/, /<section\s+class="detail-duo/] },
  // Project and News blocks (layout-library R1): rendered from the fixed blocks-preview.json, independent of site content.
  // The block hero is viewport-tall; the preview pins it to 720px so it does not follow the card height.
  { name: 'Blocks', group: 'Page', height: 4800, file: BLOCKS_PREVIEW, start: /"blocks"/, endStyle: '.blk-hero { height: 720px; }',
    markup: `<main id="noi-dung">\n${renderBlocks(blocksPreview.page, blocksPreviewContext)}\n</main>` },
  // News list page (news R2) is built on the About page frame like the build; the preview takes the <main> part.
  { name: 'NewsList', group: 'Page', height: 1250, file: BLOCKS_PREVIEW, start: /"news"/,
    markup: extract(renderNewsListPage(readFileSync('src/site/about/index.html', 'utf8'), { path: '/news/', base: '/news/', number: 1, count: 2,
      years: ['2026'], posts: blocksPreview.news }), /<main id="noi-dung"/) },
  { name: 'Process', group: 'Page', height: 1100, file: 'src/site/residential/index.html', start: /<section\s+class="editorial-strip detail-process-editorial/,
    also: [['src/site/about/index.html', /<section\s+class="detail-process/]] },
  { name: 'AboutTimeline', group: 'Page', height: 1300, file: 'src/site/about/index.html', start: /<section\s+class="about-timeline/,
    also: [/<section\s+class="about-commitments/] },
  // The 404 page has its own CSS in the page's own <style>; the preview copies that block along with the section.
  { name: 'NotFound', group: 'Page', height: 520, file: 'src/site/404.html', start: /<section class="not-found"/,
    before: (html) => html.match(/<style>[\s\S]*?<\/style>/)[0] },
  // Markup built at runtime (Advertising, Gallery dot strip); capture-design-system.mjs saves a snapshot into scripts/docs/captures/.
  // pad: space kept above the focus element in the frame; size: width of the image variant.
  ...[['Gallery', 1100, 0, 960, 'Page'], ['Filter', 240, 40], ['MediaCard', 580, 35, 480], ['Masonry', 900, 35, 480], ['Skeleton', 900, 200, 480],
    ['Primary', 760, 40], ['Glass', 760, 40], ['Suggestion', 400, 35, 480], ['Viewer', 900, 0]]
    .map(([name, height, pad, size, group = 'Advertising']) => ({ name, group, height, pad, size, file: `scripts/docs/captures/${name}.html`, capture: true })),
  // The sweep shows until the image settles; the preview has no head script, so the frame and button stay in the waiting state.
  // src uses single quotes so localizeImages skips it: the frame still matches the /assets/content/ selector but the image never shows.
  { name: 'LoadSweep', group: 'Page', height: 520, file: 'src/site/style.css', start: /The content image frame waits with a light streak/, htmlClass: 'media-gate',
    markup: '<div style="display: grid; gap: 20px; width: 316px; margin: 20px 35px;">\n'
      + '<figure class="detail-media" style="margin: 0;"><img src=\'/assets/content/shared/materials.webp\' width="1536" height="1024" alt=""></figure>\n'
      + '<div class="detail-view__suggestion-links">\n'
      + '<button type="button" class="detail-view__suggestion-link" aria-pressed="false"><span class="detail-view__suggestion-label"><span>Chữ nổi Mica</span></span></button>\n'
      + '<button type="button" class="detail-view__suggestion-link" aria-pressed="false"><span class="detail-view__suggestion-label"><span>Logo và chữ nổi tòa nhà</span></span></button>\n'
      + '<button type="button" class="detail-view__suggestion-link" aria-pressed="true"><span class="detail-view__suggestion-label"><span>Bảng vẫy Mica hút nổi</span></span></button>\n</div>\n</div>' },
];

// Returns the outer HTML of the element whose opening tag matches `start`, balancing nested tags of the same name.
function extract(html, start) {
  const at = html.search(start);
  if (at < 0) throw new Error(`not found: ${start}`);
  const tag = html.slice(at + 1).match(/^[a-z0-9]+/)[0];
  const re = new RegExp(`<${tag}\\b|</${tag}>`, 'g');
  re.lastIndex = at;
  let depth = 0;
  for (let m; (m = re.exec(html));) {
    depth += m[0].startsWith('</') ? -1 : 1;
    if (!depth) return html.slice(at, re.lastIndex);
  }
  throw new Error(`unclosed tag ${tag}`);
}

const outputs = new Map();
const photos = new Map();

// Site images point to /assets/content/...; the preview uses WebP variants copied into design-system/preview-media/:
// 960px by default, 480px for card-sized components. The folder sits outside assets/ so it does not show in the Assets tab on claude.ai.
function localizeImages(markup, size = 960) {
  return markup
    .replace(/\s+data-src="[^"]*"/g, '')
    .replace(/(src|poster)="\/assets\/content\/([^"]+?)(?:-(?:240|480|960|1600|2048))?\.(webp|avif|jxl|jpe?g|png|svg)"/g, (whole, attr, path, ext) => {
      const source = [`${path}-${size}.webp`, `${path}.webp`, `${path}.${ext}`]
        .map((candidate) => `src/site/assets/content/${candidate}`).find(existsSync);
      if (!source) throw new Error(`image not found: ${whole}`);
      const name = basename(source).replace(/-960(?=\.)/, '');
      photos.set(`${OUT}/preview-media/${name}`, source);
      return `${attr}="../../preview-media/${name}"`;
    });
}

// A capture starts with <!-- capture ... html="..." body="..." -->; the preview restores those root classes,
// then scrolls the frame to the [data-ds-focus] element once layout settles, because an ancestor holds the page offset.
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

// The project card rail is generated at build time from content/project-reel.json (page-home R8); the preview inserts it as built, and the build already validated it.
const projectReelCards = renderProjectReel(JSON.parse(readFileSync('src/site/content/project-reel.json', 'utf8')));

for (const c of COMPONENTS) {
  const html = readFileSync(c.file, 'utf8').replace('<!-- project-reel-cards -->', () => projectReelCards);
  if (c.capture) {
    const markup = localizeImages(fromCapture(c, html), c.size);
    // Captures keep fixed px of the 1440 viewport (capture-design-system.mjs); width=1440 makes claude.ai render at that size and scale down, without cropping edges.
    outputs.set(`${OUT}/components/${c.name}/preview.html`,
      `<!-- @dsCard group="${c.group}" height=${c.height} width=1440 -->\n<!-- GENERATED by scripts/docs/build-design-system.mjs from ${c.file}; do not edit. -->\n${HEAD}\n${c.bootScript}\n${markup}\n`);
    continue;
  }
  if (!c.start.test(html)) throw new Error(`${c.start} not found in ${c.file}`);
  let markup = c.markup ?? [extract(html, c.start), ...(c.also ?? []).map((a) => (Array.isArray(a) ? extract(readFileSync(a[0], 'utf8'), a[1]) : extract(html, a)))].join('\n');
  if (c.before) markup = c.before(html) + '\n' + markup;
  if (c.open) markup = markup.replace(/^<dialog class="([^"]*)"/, '<dialog open class="$1 is-active"');
  // The preview does not run page scripts: drop inline scripts; keep only the active hero slide, which gets src so its image shows (page-home R3).
  markup = markup.replace(/\s*<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/\s*<figure class="hero-slide" [^>]*>[\s\S]*?<\/figure>/g, '')
    .replace(/(class="hero-slide is-active"[^>]*>\s*<img\s+)data-src=/, '$1src=');
  markup = localizeImages(markup);
  if (c.frames) markup = c.frames.map((f) => frame(markup, f)).join('\n');
  outputs.set(`${OUT}/components/${c.name}/preview.html`,
    `<!-- @dsCard group="${c.group}" height=${c.height} -->\n<!-- GENERATED by scripts/docs/build-design-system.mjs from ${c.file}; do not edit. -->\n${HEAD}\n${c.boot === false ? '' : boot(c.htmlClass) + '\n'}${c.endStyle ? `<style>${c.endStyle}</style>\n` : ''}${markup}\n`);
}

// On the site, the Glass grain is a canvas noise turned into a blob URL at runtime (masonry/glass-surface.mjs); the preview uses an equivalent SVG noise:
// opaque gray for the overlay, alpha-based white for the arc.
const noise = (matrix) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E`
  + `%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='${matrix}'/%3E`
  + `%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;
const GRAIN = `\n.glass-surface { --glass-grain: ${noise('0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 0 1')}; `
  + `--glass-grain-white: ${noise('0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0')}; }\n`;
// The site loads the Swiper CSS at runtime (the same three files prepare-static-assets.mjs concatenates); the Gallery preview needs it for the dot strip.
const SWIPER_CSS = ['node_modules/swiper/swiper.css', 'node_modules/swiper/modules/pagination.css', 'node_modules/swiper/modules/a11y.css'];
outputs.set(`${OUT}/components/bundle.css`,
  '/* GENERATED by scripts/docs/build-design-system.mjs from src/site/style.css, src/site/detail.css and Swiper CSS; do not edit. */\n'
  // Self-hosted @font-face URLs cannot resolve on claude.ai; the preview loads the font from Google instead.
  + readFileSync('src/site/style.css', 'utf8').replace(/^\/\* Plus Jakarta Sans variable tự host[^\n]*\n|^@font-face \{[^}]*\}\n+/gm, '') + '\n' + readFileSync('src/site/detail.css', 'utf8')
  + SWIPER_CSS.map((file) => '\n' + readFileSync(file, 'utf8')).join('') + GRAIN);

// Without bundle.js claude.ai forces every preview static: no scripts, no image loading. The site has no component JS, so the bundle is empty.
outputs.set(`${OUT}/components/bundle.js`,
  '/* @ds-bundle: {"format":4,"namespace":"TruongThinh","components":[]} */\n/* GENERATED by scripts/docs/build-design-system.mjs; do not edit. */\nwindow.TruongThinh = {};\n');

const check = process.argv.includes('--check');
const MEDIA = `${OUT}/preview-media`;
// Stale files in preview-media (images no preview uses anymore) are deleted on build and reported as stale under --check.
const extra = existsSync(MEDIA) ? readdirSync(MEDIA).map((n) => `${MEDIA}/${n}`).filter((p) => !photos.has(p)) : [];
if (!check) rmSync(MEDIA, { recursive: true, force: true });
const stale = check ? extra : [];
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
  console.error(`design-system out of sync with source: ${stale.join(', ')}; run node scripts/docs/build-design-system.mjs`);
  process.exit(1);
}
console.log(`design-system ${check ? 'matches' : 'generated'}: ${outputs.size + photos.size} files`);
