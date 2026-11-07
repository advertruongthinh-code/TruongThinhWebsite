// Hàng chờ card vừa gỡ (advertising-masonry R7, loading-glass R3): cuộn qua rồi quay lại thì gắn lại đúng node cũ, ảnh hiện
// ngay không trống frame, không motion; vượt sức chứa theo RAM máy thì card cũ nhất bị hủy; card video không vào hàng chờ
// (nguồn video chỉ gắn khi tạo card, gắn lại node cũ sẽ chỉ còn poster).
// Chạy: pnpm dev, rồi BASE_URL=http://127.0.0.1:8787 node tests/site/advertising-detached-cards.e2e.mjs
import assert from "node:assert/strict";
import path from "node:path";
import { ADVERTISING_CATALOG_ARTIFACT } from "../../.site-output/advertising-products/catalog-artifact.mjs";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:8787";
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const CAPACITY = 8;
const fixturePrefix = "/__detached_cards__/";
// Cứ ba card thì một card thành card video (clip và poster lấy từ fixture media-card).
function videoArtifact() {
  const artifact = structuredClone(ADVERTISING_CATALOG_ARTIFACT);
  artifact.cards.forEach((card, index) => {
    if (index % 3) return;
    const shared = { ...card.mediaItems[0], width: 640, height: 360, source: "fixture", provenance: "Synthetic test-only fixture." };
    card.mediaItems = [{
      ...shared, id: `${card.id}-video`, kind: "video", src: `${fixturePrefix}clip.mp4`, cardSrc: `${fixturePrefix}clip.mp4`,
      sourceId: "detached:test-only:clip", sha256: "853e4939e6a4627cc7777665283b2affab189132243974a4777f5a955338e827",
      posterSrc: `${fixturePrefix}poster.webp`, posterWidth: 640, posterHeight: 360, durationSeconds: 3, hasAudio: true,
    }];
    card.coverMediaId = card.mediaItems[0].id;
  });
  return { artifact, videoIds: new Set(artifact.cards.filter((_, index) => index % 3 === 0).map((card) => card.id)) };
}
async function scenario(label, fixture) {
  const context = await browser.newContext({ viewport: { width: 384, height: 724 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  // deviceMemory 2 GB tương ứng sức chứa 8 card.
  await page.addInitScript(() => Object.defineProperty(navigator, "deviceMemory", { value: 2, configurable: true }));
  if (fixture) {
    await page.route(`**${fixturePrefix}*`, (route) => route.fulfill({
      path: path.resolve(`tests/site/fixtures/site-media-card-${route.request().url().endsWith(".mp4") ? "clip-audio.mp4" : "poster.webp"}`),
    }));
    await page.addInitScript((artifact) => { window.__TT_ADVERTISING_ARTIFACT__ = artifact; }, fixture.artifact);
  }
  await page.goto(`${base}/vi/advertising-products/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.classList.contains("motion-ready"));
  await page.waitForTimeout(1500);
  const viewport = await page.evaluate(() => innerHeight);
  const scrollTo = (top) => page.evaluate((y) => window.TruongThinhMotion.setLogicalScroll(y), top);
  // Cuộn chậm (dưới ngưỡng vuốt nhanh) để card được dựng và gỡ theo đường thường; probe soi mọi frame.
  const glide = (from, to, seconds) => page.evaluate(([a, b, ms]) => new Promise((resolve) => {
    const begin = performance.now();
    const frame = (now) => {
      const progress = Math.min(1, (now - begin) / ms);
      window.TruongThinhMotion.setLogicalScroll(a + (b - a) * progress);
      if (progress < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  }), [from, to, seconds * 1000]);
  await page.evaluate(() => {
    const probe = { violations: [], watching: false, reused: new Set() };
    window.__probe = probe;
    const tick = () => {
      if (probe.watching) {
        for (const node of document.querySelectorAll("[data-project-grid] [data-advertising-card]")) {
          if (!node.__marked) continue;
          const rect = node.getBoundingClientRect();
          if (rect.bottom <= 0 || rect.top >= innerHeight) continue;
          probe.reused.add(node.dataset.advertisingCard);
          const image = [...node.querySelectorAll(".advertising-tile__foreground")].find((layer) => !layer.hidden);
          const blank = !image?.classList.contains("is-advertising-media-ready") || Number.parseFloat(getComputedStyle(image).opacity) < 0.999;
          const moving = node.getAnimations({ subtree: true }).some((animation) => animation.playState === "running");
          if (blank || moving) probe.violations.push({ id: node.dataset.advertisingCard, blank, moving });
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  const base0 = viewport * 4;
  await scrollTo(base0);
  await page.waitForTimeout(3000);
  const marked = await page.evaluate(() => {
    const ids = [];
    for (const node of document.querySelectorAll("[data-project-grid] [data-advertising-card]")) {
      node.__marked = true;
      ids.push(node.dataset.advertisingCard);
    }
    return ids;
  });
  assert.ok(marked.length > CAPACITY, `more cards mounted than the queue holds, ${marked.length}`);

  // Đi xuống 3 viewport: các card đánh dấu nằm phía trên ra ngoài vùng trễ nên bị gỡ, nhiều hơn sức chứa; hàng chờ giữ CAPACITY
  // card gỡ gần nhất, các card cũ hơn bị hủy.
  await page.evaluate(() => {
    window.__probe.released = new Set();
    new MutationObserver((records) => records.forEach(({ removedNodes }) => removedNodes.forEach((node) => {
      if (node.__marked && !node.isConnected) window.__probe.released.add(node.dataset.advertisingCard);
    }))).observe(document.querySelector("[data-project-grid]"), { childList: true });
  });
  await glide(base0, base0 + 3 * viewport, 2);
  await page.waitForTimeout(1500);
  const released = await page.evaluate(() => window.__probe.released.size);
  assert.ok(released > CAPACITY, `more marked cards were released than the queue holds, ${released}`);

  // Quay lại cùng nhịp chậm: card trong hàng chờ gắn lại đúng node, ảnh hiện ngay, không animation.
  await page.evaluate(() => { window.__probe.watching = true; });
  await glide(base0 + 3 * viewport, base0, 2);
  await page.waitForTimeout(1500);
  await page.evaluate(() => { window.__probe.watching = false; });
  const result = await page.evaluate((videoIds) => ({
    same: [...document.querySelectorAll("[data-project-grid] [data-advertising-card]")].filter((node) => node.__marked && window.__probe.released.has(node.dataset.advertisingCard)).map((node) => node.dataset.advertisingCard),
    violations: window.__probe.violations.slice(0, 5),
    releasedVideo: [...window.__probe.released].filter((id) => videoIds.includes(id)).length,
  }), fixture ? [...fixture.videoIds] : []);
  assert.ok(result.same.length > 0, `${label}: cards returning from the queue are the very same nodes`);
  assert.ok(result.same.length <= CAPACITY, `${label}: no more than ${CAPACITY} cards come back as the same node, got ${result.same.length}`);
  assert.ok(result.same.length < released, `${label}: cards past the queue capacity were destroyed, ${result.same.length} of ${released} came back`);
  assert.deepEqual(result.violations, [], `${label}: a reattached card shows its image at once, without blank frame or motion`);
  if (fixture) {
    assert.ok(result.releasedVideo > 0, `${label}: some video cards were released, ${result.releasedVideo}`);
    assert.deepEqual(result.same.filter((id) => fixture.videoIds.has(id)), [], `${label}: a video card never comes back as the same node`);
  }
  await context.close();
  console.log(`advertising detached cards (${label}): ${result.same.length} of ${marked.length} cards came back as the same node (queue ${CAPACITY}, ${released} released)`);
}
try {
  await scenario("images", null);
  await scenario("video cards", videoArtifact());
} finally {
  await browser.close();
}
