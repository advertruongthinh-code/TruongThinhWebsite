// Captures runtime-built Advertising markup into scripts/docs/captures/ for build-design-system.mjs (docs/specs/docs-system.md R5.3).
// Usage: pnpm dev, then node scripts/docs/capture-design-system.mjs [baseUrl]; PLAYWRIGHT_EXECUTABLE_PATH overrides the browser.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://127.0.0.1:8787';
const OUT = 'scripts/docs/captures';
const GRID = '/vi/advertising-products/';
const PHOTO = '/vi/advertising-products/?category=signage-raised-letters&photo=signage-raised-letters-26';

// Each capture: route, element to keep, optional setup; first keeps one grid card; focus marks the child the preview frame scrolls to (default: the element).
const CAPTURES = [
  { name: 'Filter', route: GRID, select: '.project-filters' },
  { name: 'MediaCard', route: GRID, select: '[data-project-grid]', first: true },
  { name: 'Masonry', route: GRID, select: '[data-project-grid]' },
  { name: 'Skeleton', route: GRID, select: '.project-index', focus: '[data-advertising-cta-frame]',
    setup: (page) => page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)) },
  { name: 'Primary', route: PHOTO, select: '.advertising-photo-view__primary' },
  { name: 'Suggestion', route: PHOTO, select: '.advertising-photo-view__suggestion' },
  { name: 'Viewer', route: PHOTO, select: '.advertising-photo-dialog', setup: (page) => page.click('.advertising-photo-view__expand') },
];

// Runs in the page: the element plus a shallow copy of each ancestor, so descendant selectors still match.
function snapshot({ select, first, focus }) {
  const target = document.querySelector(select);
  if (!target) throw new Error(`missing ${select}`);
  (focus ? target.querySelector(focus) : target).setAttribute('data-ds-focus', '');
  let node = target.cloneNode(true);
  // LazySizes keeps the real URL in data-src until the card nears the viewport.
  node.querySelectorAll('img[data-src]').forEach((img) => img.setAttribute('src', img.dataset.src));
  if (first) {
    // Grid cards are absolutely placed; keep the first one at the origin.
    const [card, ...rest] = node.querySelectorAll('[data-advertising-card]');
    rest.forEach((el) => el.remove());
    node.querySelectorAll('[data-advertising-cta-skeleton]').forEach((el) => el.remove());
    Object.assign(card.style, { top: '0px', left: '0px' });
    node.style.height = card.style.height;
  }
  for (let parent = target.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
    const shell = parent.cloneNode(false);
    shell.removeAttribute('hidden');
    shell.appendChild(node);
    node = shell;
  }
  return { html: node.outerHTML, htmlClass: document.documentElement.className, bodyClass: document.body.className };
}

// Lazy and responsive attributes would point the preview back at the site; build-design-system.mjs rewrites src.
const clean = (html) => html
  .replace(/<source\b[^>]*>/g, '')
  .replace(/\s(?:srcset|sizes|data-srcset|data-sizes|loading)="[^"]*"/g, '')
  .replace(/\sclass="([^"]*)"/g, (_, c) => ` class="${c.split(/\s+/).filter((name) => !/^(lazy\w*|ls-is-cached)$/.test(name)).join(' ')}"`)
  .replace(/\s(?:data-advertising-flow-(?:batch|phase|anchor-permutation))="[^"]*"/g, '');

const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
mkdirSync(OUT, { recursive: true });
for (const capture of CAPTURES) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  // A fixed visit seed keeps card order stable between captures.
  await page.addInitScript(() => sessionStorage.setItem('tt-advertising-visit-seed-handoff-v1', JSON.stringify({
    version: 1, url: location.href.split('#')[0], seed: 'design-system', expiresAt: Date.now() + 60000 })));
  await page.goto(BASE + capture.route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  if (capture.setup) { await capture.setup(page); await page.waitForTimeout(2500); }
  const { select, first, focus } = capture;
  const shot = await page.evaluate(snapshot, { select, first, focus });
  writeFileSync(`${OUT}/${capture.name}.html`,
    `<!-- capture route="${capture.route}" html="${shot.htmlClass}" body="${shot.bodyClass}" -->\n${clean(shot.html)}\n`);
  await page.close();
}
await browser.close();
console.log(`đã chụp ${CAPTURES.length} component vào ${OUT}`);
