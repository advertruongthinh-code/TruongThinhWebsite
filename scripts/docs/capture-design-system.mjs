// Captures runtime-built Advertising markup into scripts/docs/captures/ for build-design-system.mjs (docs/specs/docs-system.md R5.3).
// Usage: pnpm dev, then node scripts/docs/capture-design-system.mjs [baseUrl]; PLAYWRIGHT_EXECUTABLE_PATH overrides the browser.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
// Built by pnpm dev (prepare:site), which this script already needs.
import { ADVERTISING_CATALOG_ARTIFACT } from '../../.site-output/advertising-products/catalog-artifact.mjs';

const BASE = process.argv[2] || 'http://127.0.0.1:8787';
const OUT = 'scripts/docs/captures';
const GRID = '/vi/advertising-products/';
const PHOTO = '/vi/advertising-products/?category=signage-raised-letters&photo=signage-raised-letters-26';
const CLIP = '/__design_system__/clip.mp4';
// Cards in the first viewport of the seeded grid, so their media load; shown as 1 item, 3 items, 11 items and a video cover
// plus one image (docs/specs/site-media-card-playback.md).
const MEDIA_CARDS = ['signage-raised-letters-24', 'led-displays-lightboxes-02', 'kiosk-posm-12', 'print-decals-08'];

// The live catalog has single-image cards only, so MediaCard repeats each card's own image as extra items, as the e2e fixtures do.
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

// Each capture: route, element to keep, optional setup; cards keeps those grid cards in one row; artifact replaces the catalog;
// focus marks the child the preview frame scrolls to (default: the element).
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

// Runs in the page: the element plus a shallow copy of each ancestor, so descendant selectors still match.
function snapshot({ select, cards, focus }) {
  const target = document.querySelector(select);
  if (!target) throw new Error(`missing ${select}`);
  (focus ? target.querySelector(focus) : target).setAttribute('data-ds-focus', '');
  let node = target.cloneNode(true);
  // LazySizes keeps the real URL in data-src until the card nears the viewport.
  node.querySelectorAll('img[data-src]').forEach((img) => img.setAttribute('src', img.dataset.src));
  if (cards) {
    // Grid cards are absolutely placed; line the kept ones up from the origin with the grid gap.
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

// Lazy and responsive attributes would point the preview back at the site; build-design-system.mjs rewrites src and poster.
// A video keeps only its poster, so the fixture clip stays out of design-system/.
const clean = (html) => html
  .replace(/<source\b[^>]*>/g, '')
  .replace(/(<video\b[^>]*?)\ssrc="[^"]*"/g, '$1')
  .replace(/\s(?:srcset|sizes|data-srcset|data-sizes|loading)="[^"]*"/g, '')
  .replace(/\sclass="([^"]*)"/g, (_, c) => ` class="${c.split(/\s+/).filter((name) => !/^(lazy\w*|ls-is-cached)$/.test(name)).join(' ')}"`)
  .replace(/\s(?:data-advertising-flow-(?:batch|phase|anchor-permutation))="[^"]*"/g, '')
  // The Kính grain is a blob URL that dies with the page.
  .replace(/--glass-grain: url\(blob:[^)]*\);\s?/g, '');

const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
mkdirSync(OUT, { recursive: true });
for (const capture of CAPTURES) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  if (capture.artifact) {
    await page.addInitScript((artifact) => { window.__TT_ADVERTISING_ARTIFACT__ = artifact; }, capture.artifact());
    await page.route(`**${CLIP}`, (route) => route.fulfill({ path: 'tests/site/fixtures/site-media-card-clip-audio.mp4', contentType: 'video/mp4' }));
  }
  // A fixed visit seed keeps card order stable between captures.
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
console.log(`đã chụp ${CAPTURES.length} component vào ${OUT}`);
