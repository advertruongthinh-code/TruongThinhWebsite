// Chụp markup Advertising dựng lúc runtime vào scripts/docs/captures/ cho build-design-system.mjs (docs/specs/docs-system.md R5.3).
// Cách dùng: pnpm dev, rồi node scripts/docs/capture-design-system.mjs [baseUrl]; PLAYWRIGHT_EXECUTABLE_PATH ghi đè browser.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
// Do pnpm dev (prepare:site) dựng, script này vốn đã cần nó.
import { ADVERTISING_CATALOG_ARTIFACT } from '../../.site-output/advertising-products/catalog-artifact.mjs';

const BASE = process.argv[2] || 'http://127.0.0.1:8787';
const OUT = 'scripts/docs/captures';
const GRID = '/vi/advertising-products/';
const PHOTO = '/vi/advertising-products/?category=signage-raised-letters&photo=signage-raised-letters-26';
const CLIP = '/__design_system__/clip.mp4';
// Các card trong viewport đầu của grid có seed, để media của chúng tải xong; hiện 1 item, 3 item, 11 item và một video cover
// cộng một ảnh (docs/specs/media-card.md).
const MEDIA_CARDS = ['signage-raised-letters-10', 'kiosk-posm-26', 'signage-raised-letters-33', 'signage-raised-letters-17'];

// Catalog live chỉ có card một ảnh, nên MediaCard lặp ảnh của chính mỗi card làm item phụ, như fixture e2e.
function mediaCardArtifact() {
  const artifact = structuredClone(ADVERTISING_CATALOG_ARTIFACT);
  const [, dots, counter, video] = MEDIA_CARDS.map((id) => artifact.cards.find((card) => card.id === id));
  for (const [card, count, cover] of [[dots, 3, 0], [counter, 11, 6], [video, 2, 0]]) {
    card.mediaItems = Array.from({ length: count }, (_, i) => ({ ...card.mediaItems[0], id: `${card.id}-ds-${i + 1}` }));
    card.coverMediaId = card.mediaItems[cover].id;
  }
  const { src, width, height } = video.media;
  Object.assign(video.mediaItems[0], { kind: 'video', src: CLIP, posterSrc: src, posterWidth: width, posterHeight: height, durationSeconds: 15, hasAudio: true });
  return artifact;
}

// Mỗi capture: route, element giữ lại, setup tùy chọn; cards giữ các grid card đó trong một hàng; artifact thay catalog;
// focus đánh dấu child mà frame preview cuộn tới (mặc định: chính element).
const CAPTURES = [
  { name: 'Filter', route: GRID, select: '.project-filters' },
  { name: 'MediaCard', route: GRID, select: '[data-project-grid]', cards: MEDIA_CARDS, artifact: mediaCardArtifact },
  { name: 'Masonry', route: GRID, select: '[data-project-grid]' },
  { name: 'Skeleton', route: GRID, select: '.project-index', focus: '[data-advertising-cta-frame]',
    setup: (page) => page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)) },
  { name: 'Primary', route: PHOTO, select: '.advertising-photo-view__primary' },
  { name: 'Suggestion', route: PHOTO, select: '.advertising-photo-view__suggestion' },
  { name: 'Viewer', route: PHOTO, select: '.advertising-photo-dialog', setup: (page) => page.click('.advertising-photo-view__expand') },
];

// Chạy trong page: element cộng một bản sao nông của từng ancestor, để descendant selector vẫn khớp.
function snapshot({ select, cards, focus }) {
  const target = document.querySelector(select);
  if (!target) throw new Error(`missing ${select}`);
  (focus ? target.querySelector(focus) : target).setAttribute('data-ds-focus', '');
  let node = target.cloneNode(true);
  // LazySizes giữ URL thật trong data-src đến khi card gần viewport.
  node.querySelectorAll('img[data-src]').forEach((img) => img.setAttribute('src', img.dataset.src));
  if (cards) {
    // Grid card được đặt absolute; xếp các card giữ lại thẳng hàng từ gốc với grid gap.
    const kept = cards.map((id) => {
      const card = node.querySelector(`[data-advertising-card="${id}"]`);
      if (!card) throw new Error(`missing card ${id}`);
      return card;
    });
    const gap = parseFloat(node.style.getPropertyValue('--advertising-gap'));
    let left = 0;
    for (const card of kept) {
      Object.assign(card.style, { top: '0px', left: `${left}px` });
      left += parseFloat(card.style.width) + gap;
    }
    node.replaceChildren(...kept);
    node.style.height = `${Math.max(...kept.map((card) => parseFloat(card.style.height)))}px`;
  }
  for (let parent = target.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
    const shell = parent.cloneNode(false);
    shell.removeAttribute('hidden');
    shell.appendChild(node);
    node = shell;
  }
  return { html: node.outerHTML, htmlClass: document.documentElement.className, bodyClass: document.body.className };
}

// Thuộc tính lazy và responsive sẽ trỏ preview về site; build-design-system.mjs viết lại src và poster.
// Video chỉ giữ poster, để clip fixture không lọt vào design-system/.
const clean = (html) => html
  .replace(/<source\b[^>]*>/g, '')
  .replace(/(<video\b[^>]*?)\ssrc="[^"]*"/g, '$1')
  .replace(/\s(?:srcset|sizes|data-srcset|data-sizes|loading)="[^"]*"/g, '')
  .replace(/\sclass="([^"]*)"/g, (_, c) => ` class="${c.split(/\s+/).filter((name) => !/^(lazy\w*|ls-is-cached)$/.test(name)).join(' ')}"`)
  .replace(/\s(?:data-advertising-flow-(?:batch|phase|anchor-permutation))="[^"]*"/g, '')
  // Grain của Kính là blob URL, mất cùng page.
  .replace(/--glass-grain(?:-white)?: url\(blob:[^)]*\);\s?/g, '');

const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
mkdirSync(OUT, { recursive: true });
for (const capture of CAPTURES) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  if (capture.artifact) {
    await page.addInitScript((artifact) => { window.__TT_ADVERTISING_ARTIFACT__ = artifact; }, capture.artifact());
    await page.route(`**${CLIP}`, (route) => route.fulfill({ path: 'tests/site/fixtures/site-media-card-clip-audio.mp4', contentType: 'video/mp4' }));
  }
  // Visit seed cố định giữ thứ tự card ổn định giữa các lần capture.
  await page.addInitScript(() => sessionStorage.setItem('tt-advertising-visit-seed-handoff-v1', JSON.stringify({
    version: 1, url: location.href.split('#')[0], seed: 'design-system', expiresAt: Date.now() + 60000 })));
  await page.goto(BASE + capture.route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  if (capture.setup) { await capture.setup(page); await page.waitForTimeout(2500); }
  const { select, cards, focus } = capture;
  const shot = await page.evaluate(snapshot, { select, cards, focus });
  writeFileSync(`${OUT}/${capture.name}.html`,
    `<!-- capture route="${capture.route}" html="${shot.htmlClass}" body="${shot.bodyClass}" -->\n${clean(shot.html)}\n`);
  await page.close();
}
await browser.close();
console.log(`captured ${CAPTURES.length} components into ${OUT}`);
