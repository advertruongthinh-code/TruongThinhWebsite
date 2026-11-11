// Capture the Advertising markup built at runtime into scripts/docs/captures/ for build-design-system.mjs (docs/specs/design-system.md R3).
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
// MediaCard takes the first four cards of the grid with a fixed seed (the virtual grid keeps only cards near the viewport), then turns them
// into 1 item, 3 items, 11 items and a video cover plus one image (docs/specs/media-card.md).
// The live catalog only has single-image cards, so MediaCard repeats each card's own image as the extra items, like the e2e fixture.
function mediaCardArtifact(ids) {
  const artifact = structuredClone(ADVERTISING_CATALOG_ARTIFACT);
  const [, dots, counter, video] = ids.map((id) => artifact.cards.find((card) => card.id === id));
  for (const [card, count, cover] of [[dots, 3, 0], [counter, 11, 6], [video, 2, 0]]) {
    card.mediaItems = Array.from({ length: count }, (_, i) => ({ ...card.mediaItems[0], id: `${card.id}-ds-${i + 1}` }));
    card.coverMediaId = card.mediaItems[cover].id;
  }
  const { src, width, height } = video.media;
  Object.assign(video.mediaItems[0], { kind: 'video', src: CLIP, posterSrc: src, posterWidth: width, posterHeight: height, durationSeconds: 15, hasAudio: true });
  return artifact;
}

// Each capture: route, element to keep, optional setup; cards keeps those grid cards in one row; artifact replaces the catalog;
// focus marks the child the preview frame scrolls to (default: the element itself).
const CAPTURES = [
  { name: 'Filter', route: GRID, select: '.project-filters' },
  { name: 'MediaCard', route: GRID, select: '[data-project-grid]', firstRow: 4, artifact: mediaCardArtifact },
  { name: 'Masonry', route: GRID, select: '[data-project-grid]' },
  { name: 'Skeleton', route: GRID, select: '.masonry-section', focus: '[data-masonry-cta-frame]',
    setup: (page) => page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)) },
  { name: 'Primary', route: PHOTO, select: '.detail-view__primary' },
  { name: 'Suggestion', route: PHOTO, select: '.detail-view__suggestion' },
  { name: 'Viewer', route: PHOTO, select: '.detail-dialog', setup: (page) => page.click('.detail-view__expand') },
  // Glass on the main detail-page image frame; the runtime grain is a blob URL so the build assigns a substitute grain (spec design-system R3.9).
  { name: 'Glass', route: PHOTO, select: '.detail-view__hero-frame' },
  // The gallery dot strip is built by detail.js when the block enters the frame.
  { name: 'Gallery', route: '/vi/residential/', select: '.detail-gallery',
    setup: (page) => page.locator('.detail-gallery').scrollIntoViewIfNeeded() },
];

// Runs in the page: the element plus a shallow copy of each ancestor, so descendant selectors still match.
function snapshot({ select, cards, focus }) {
  const target = document.querySelector(select);
  if (!target) throw new Error(`missing ${select}`);
  (focus ? target.querySelector(focus) : target).setAttribute('data-ds-focus', '');
  let node = target.cloneNode(true);
  // LazySizes keeps the real URL in data-src until the card is near the viewport.
  node.querySelectorAll('img[data-src]').forEach((img) => img.setAttribute('src', img.dataset.src));
  if (cards) {
    // Grid cards are absolutely positioned; line the kept cards up straight from the origin with the grid gap.
    const kept = cards.map((id) => {
      const card = node.querySelector(`[data-masonry-card="${id}"]`);
      if (!card) throw new Error(`missing card ${id}`);
      return card;
    });
    const gap = parseFloat(node.style.getPropertyValue('--masonry-gap'));
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

// Lazy and responsive attributes would point the preview at the site; build-design-system.mjs rewrites src and poster.
// Videos keep only the poster, so the fixture clip does not leak into design-system/.
const clean = (html) => html
  // The primary image switches to an absolute URL when moving to the original; keep the site path so the build copies the WebP.
  .replaceAll(BASE, '')
  .replace(/<source\b[^>]*>/g, '')
  .replace(/(<video\b[^>]*?)\ssrc="[^"]*"/g, '$1')
  .replace(/\s(?:srcset|sizes|data-srcset|data-sizes|loading)="[^"]*"/g, '')
  .replace(/\sclass="([^"]*)"/g, (_, c) => ` class="${c.split(/\s+/).filter((name) => !/^(lazy\w*|ls-is-cached)$/.test(name)).join(' ')}"`)
  .replace(/\s(?:data-masonry-flow-(?:batch|phase|anchor-permutation))="[^"]*"/g, '')
  // The Kính grain is a blob URL, lost together with the page.
  .replace(/--glass-grain(?:-white)?: url\(blob:[^)]*\);\s?/g, '');

const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
mkdirSync(OUT, { recursive: true });
const openPage = async (route) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  // A fixed visit seed keeps the card order stable between captures.
  await page.addInitScript(() => sessionStorage.setItem('tt-advertising-visit-seed-handoff-v1', JSON.stringify({
    version: 1, url: location.href.split('#')[0], seed: 'design-system', expiresAt: Date.now() + 60000 })));
  return page;
};
for (const capture of CAPTURES) {
  if (capture.firstRow) {
    const probe = await openPage();
    await probe.goto(BASE + capture.route, { waitUntil: 'networkidle' });
    capture.cards = await probe.evaluate((n) => [...document.querySelectorAll('[data-masonry-card]')]
      .map((el) => ({ id: el.dataset.masonryCard, top: parseFloat(el.style.top), left: parseFloat(el.style.left) }))
      .sort((a, b) => a.top - b.top || a.left - b.left).slice(0, n).sort((a, b) => a.left - b.left).map((c) => c.id), capture.firstRow);
    await probe.close();
  }
  const page = await openPage();
  if (capture.artifact) {
    await page.addInitScript((artifact) => { window.__TT_ADVERTISING_ARTIFACT__ = artifact; }, capture.artifact(capture.cards));
    await page.route(`**${CLIP}`, (route) => route.fulfill({ path: 'tests/site/fixtures/site-media-card-clip-audio.mp4', contentType: 'video/mp4' }));
  }
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
