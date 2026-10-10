// Dựng design-system/components/bundle.css và preview component từ source site live (docs/specs/docs-system.md R5.3).
// Cách dùng: node scripts/docs/build-design-system.mjs [--check]
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const OUT = 'design-system';
const FONT = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,500&display=swap">';
// motion-fallback là trạng thái cuối không animation của site (motion.js); preview render đúng trạng thái đó.
const boot = (extra) => `<script>document.documentElement.lang = "vi"; document.documentElement.classList.add("motion-fallback", "motion-ready"${extra ? `, "${extra}"` : ''});</script>`;
// Wrapper có transform trở thành containing block của position: fixed, nên phần shell fixed nằm gọn trong frame.
const frame = (markup, { cls = '', bg = 'var(--paper)', height }) =>
  `<div style="position: relative; height: ${height}px; overflow: hidden; transform: translateZ(0); background: ${bg};">\n`
  + markup.replace(/class="([^"]*)"/, (_, c) => `class="${[c, cls].filter(Boolean).join(' ')}"`) + '\n</div>';

// start: regex cho opening tag; open: hiện dialog đúng như motion.js để lại (open, is-active); htmlClass: class phụ trên root; frames: mỗi state class một bản có frame;
// endStyle: giá trị cuối inline do motion.js đặt mà CSS không có fallback;
// boot: false bỏ motion-fallback ở chỗ nó sẽ ghi đè state class (header tone).
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
  { name: 'BannerCta', group: 'Page', height: 600, file: 'src/site/index.html', start: /<section class="legacy-closer/ },
  { name: 'Gallery', group: 'Page', height: 640, file: 'src/site/residential/index.html', start: /<section\s+class="detail-gallery/ },
  // Markup Advertising dựng lúc runtime; capture-design-system.mjs chụp snapshot vào scripts/docs/captures/.
  // pad: khoảng trống giữ phía trên element focus trong frame; size: độ rộng image variant.
  ...[['Filter', 240, 40], ['MediaCard', 420, 35, 480], ['Masonry', 900, 35, 480], ['Skeleton', 900, 200, 480], ['Primary', 760, 40],
    ['Suggestion', 400, 35, 480], ['Viewer', 900, 0]]
    .map(([name, height, pad, size]) => ({ name, group: 'Advertising', height, pad, size, file: `scripts/docs/captures/${name}.html`, capture: true })),
  // Kính là markup runtime (glass-surface.mjs); photo host và vị trí nửa chiều rộng được ghi ở đây.
  { name: 'Glass', group: 'Advertising', height: 300, file: 'src/site/advertising-products/glass-surface.mjs', start: /glass\.className = "glass-surface"/,
    markup: '<div style="position: relative; width: 384px; height: 256px; margin: 20px 35px; overflow: hidden;">\n'
      + '<img src="/assets/content/projects/advertising/signage-raised-letters/signage-raised-letters-26-owner-20260924.webp" alt="" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;">\n'
      + '<div style="position: absolute; inset: 0 0 0 50%;"><div class="glass-surface" data-glass-shape="even" aria-hidden="true">'
      + '<i class="glass-surface__step glass-surface__step--full"></i><i class="glass-surface__tint"></i><i class="glass-surface__grain"></i></div></div>\n</div>' },
  // Vệt chỉ hiện tới khi ảnh settle; preview không có script head nên khung và nút giữ trạng thái chờ.
  // src nháy đơn để localizeImages bỏ qua: khung vẫn khớp selector /assets/content/ mà ảnh không bao giờ hiện.
  { name: 'LoadSweep', group: 'Page', height: 520, file: 'src/site/style.css', start: /Khung ảnh nội dung chờ bằng vệt sáng/, htmlClass: 'media-gate',
    markup: '<div style="display: grid; gap: 20px; width: 316px; margin: 20px 35px;">\n'
      + '<figure class="detail-media" style="margin: 0;"><img src=\'/assets/content/shared/materials.webp\' width="1536" height="1024" alt=""></figure>\n'
      + '<div class="advertising-photo-view__suggestion-links">\n'
      + '<button type="button" class="advertising-photo-view__suggestion-link" aria-pressed="false"><span class="advertising-photo-view__suggestion-label"><span>Chữ nổi Mica</span></span></button>\n'
      + '<button type="button" class="advertising-photo-view__suggestion-link" aria-pressed="false"><span class="advertising-photo-view__suggestion-label"><span>Logo và chữ nổi tòa nhà</span></span></button>\n'
      + '<button type="button" class="advertising-photo-view__suggestion-link" aria-pressed="true"><span class="advertising-photo-view__suggestion-label"><span>Bảng vẫy Mica hút nổi</span></span></button>\n</div>\n</div>' },
];

// Trả về outer HTML của element có opening tag khớp `start`, cân bằng các tag lồng cùng tên.
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

// Ảnh site trỏ tới /assets/content/...; preview dùng biến thể WebP chép vào design-system/assets/Photos/:
// mặc định 960px, 480px cho component cỡ card.
function localizeImages(markup, size = 960) {
  return markup
    .replace(/\s+data-src="[^"]*"/g, '')
    .replace(/(src|poster)="\/assets\/content\/([^"]+?)(?:-(?:480|960))?\.(webp|avif|jpe?g|png)"/g, (whole, attr, path, ext) => {
      const source = [`${path}-${size}.webp`, `${path}.webp`, `${path}.${ext}`]
        .map((candidate) => `src/site/assets/content/${candidate}`).find(existsSync);
      if (!source) throw new Error(`không tìm thấy ảnh ${whole}`);
      const name = basename(source).replace(/-960(?=\.)/, '');
      photos.set(`${OUT}/assets/Photos/${name}`, source);
      return `${attr}="../../assets/Photos/${name}"`;
    });
}

// Capture bắt đầu bằng <!-- capture ... html="..." body="..." -->; preview khôi phục các root class đó,
// rồi cuộn frame tới element [data-ds-focus] sau khi layout ổn định, vì ancestor giữ page offset.
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
  // @font-face URL self-hosted không resolve được trên claude.ai; preview tải font từ Google thay thế.
  + readFileSync('src/site/style.css', 'utf8').replace(/^\/\* Plus Jakarta Sans variable tự host[^\n]*\n|^@font-face \{[^}]*\}\n+/gm, '') + '\n' + readFileSync('src/site/detail.css', 'utf8'));

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
