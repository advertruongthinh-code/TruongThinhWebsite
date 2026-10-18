import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { ADVERTISING_CARDS } from "../../src/site/advertising-products/catalog.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const base = process.env.BASE_URL || "http://127.0.0.1:8792";
const output = process.env.SITE_MEDIA_OUTPUT_DIR;
assert(output, "SITE_MEDIA_OUTPUT_DIR must name a new M00a evidence directory");
const evidenceDir = path.resolve(output);
const preflight = JSON.parse(await readFile(path.join(evidenceDir, "preflight.json"), "utf8"));
const hash = (data) => createHash("sha256").update(data).digest("hex").toUpperCase();
const fileHash = async (relative) => hash(await readFile(path.join(root, relative)));
const runnerSha256Before = await fileHash("tests/site/site-media-card-playback.e2e.mjs");
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".tooling/browsers");
const { chromium } = await import("playwright");
const photoId = "signage-raised-letters-18";
const families = [
  { route: "advertising-products/", name: "advertising-parent", selector: "[data-advertising-card]" },
  { route: "advertising-products/?photo=signage-raised-letters-18", name: "advertising-related", selector: "[data-advertising-related-card]" },
  { route: "", name: "home-reel", selector: ".project-track > .project-card" },
  { route: "", name: "home-portal", selector: ".service-portal" },
  { route: "residential/", name: "residential-gallery", selector: ".detail-gallery__item" },
  { route: "residential/", name: "residential-editorial", selector: ".editorial-item, .detail-duo figure, .service-portal" },
  { route: "commercial/", name: "commercial-gallery", selector: ".detail-gallery__item" },
  { route: "commercial/", name: "commercial-editorial", selector: ".editorial-item, .detail-duo figure, .service-portal" },
  { route: "about/", name: "about-duo", selector: ".detail-duo figure" },
  { route: "about/", name: "about-text-exclusion", selector: ".about-timeline__item, .about-commitments" },
  { route: "", name: "home-logo-montage-exclusion", selector: ".client-logo-slot, .heritage-image" },
];
const results = [];
const url = (route) => new URL(route, `${base}/`).href;
const candidatePaths = {
  "catalog-runtime": ["src/site/advertising-products/catalog-runtime.mjs", ".site-output/advertising-products/catalog-runtime.mjs"],
  motion: ["src/site/motion.js", ".site-output/motion.js"],
  "photo-viewer": ["src/site/advertising-products/photo-viewer.mjs", ".site-output/advertising-products/photo-viewer.mjs"],
  "vi-advertising-html": ["src/site/advertising-products/index.html", ".site-output/vi/advertising-products/index.html"],
  "en-advertising-html": ["src/site/advertising-products/index.html", ".site-output/en/advertising-products/index.html"],
};

async function verifyCandidate() {
  assert.equal(preflight.head, process.env.SITE_MEDIA_EXPECTED_HEAD, "HEAD changed after preflight");
  assert.equal(preflight.runnerSha256Before, runnerSha256Before, "runner changed after preflight");
  for (const entry of preflight.files) {
    const [source, build] = candidatePaths[entry.name] || [];
    assert(source && build, `${entry.name} has no provenance path`);
    assert.equal(await fileHash(source), entry.sourceSha256, `${entry.name} source drift`);
    assert.equal(await fileHash(build), entry.buildSha256, `${entry.name} build drift`);
    const response = await fetch(entry.url);
    assert.equal(response.status, 200, `${entry.name} HTTP ${response.status}`);
    assert.equal(hash(Buffer.from(await response.arrayBuffer())), entry.servedSha256, `${entry.name} served drift`);
  }
}

function watch(page) {
  const issues = [];
  page.on("pageerror", (error) => issues.push({ kind: "pageerror", message: error.message }));
  page.on("requestfailed", (request) => {
    const local = new URL(request.url()).origin === new URL(base).origin;
    issues.push({ kind: local ? "requestfailed" : "externalRequestfailed", url: request.url(), message: request.failure()?.errorText });
  });
  page.on("response", (response) => {
    if (response.status() < 400) return;
    const local = new URL(response.url()).origin === new URL(base).origin;
    issues.push({ kind: local ? "response" : "externalResponse", url: response.url(), status: response.status() });
  });
  return issues;
}

async function advertisingReady(page, route = "advertising-products/") {
  await page.goto(url(route), { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.TruongThinhAdvertising?.getAdapter?.()), undefined, { timeout: 12_000 });
  // Veil vào trang còn nhận hit test tới khi gỡ; chạm và elementFromPoint chỉ đo khi veil đã gỡ.
  await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter")
    && !document.body.classList.contains("is-transitioning"));
}

async function settledHistory(page, expectedPhoto) {
  await page.waitForFunction((photo) => {
    const browse = window.TruongThinhAdvertising?.getBrowseState?.();
    const actualPhoto = (new URL(location.href).pathname.match(/\/p\/([^/]+)\/$/)?.[1] ?? null);
    const y = window.TruongThinhMotion?.getLogicalScroll?.() ?? scrollY;
    const entryY = photo ? browse?.detail?.scrollY : browse?.grid?.scrollY;
    return actualPhoto === photo && (browse?.photo || null) === photo
      && !document.querySelector("[data-advertising-photo-morph]")
      && Number.isFinite(entryY) && Math.abs(entryY - y) <= 1;
  }, expectedPhoto, { timeout: 8_000 });
  return page.evaluate(async (photo) => {
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    const sample = () => {
      const browse = window.TruongThinhAdvertising.getBrowseState();
      const y = window.TruongThinhMotion?.getLogicalScroll?.() ?? scrollY;
      return { url: location.href, length: history.length, y, photo: browse.photo || null,
        seed: browse.seed, category: browse.category, tag: browse.tag,
        entryY: photo ? browse.detail.scrollY : browse.grid.scrollY,
        primaryId: document.querySelector("[data-advertising-photo-image]")?.dataset.advertisingPhotoId || null };
    };
    let previous = sample(), stable = 0;
    for (let attempt = 0; attempt < 50; attempt++) {
      await frame();
      const current = sample();
      stable = Math.abs(current.y - previous.y) <= 1 && Math.abs(current.entryY - previous.entryY) <= 1
        && current.url === previous.url ? stable + 1 : 0;
      if (stable >= 4) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const delayed = sample();
        if (Math.abs(delayed.y - current.y) <= 1 && Math.abs(delayed.entryY - current.entryY) <= 1
          && delayed.url === current.url) return { ...delayed, stableY: current.y, delayedY: delayed.y };
        previous = delayed;
        stable = 0;
        continue;
      }
      previous = current;
    }
    throw new Error("history scroll did not settle over five frames");
  }, expectedPhoto);
}

async function historyGeometry(page, cardId, offsets = [0]) {
  return page.evaluate(async ({ id, delays }) => {
    const start = performance.now();
    const sample = (targetMs) => {
      const card = document.querySelector(`[data-advertising-card="${id}"]`);
      const rect = card?.getBoundingClientRect();
      const scroller = document.scrollingElement;
      const browse = window.TruongThinhAdvertising?.getBrowseState?.();
      return { targetMs, elapsedMs: Math.round(performance.now() - start), url: location.href,
        windowY: scrollY, documentY: scroller?.scrollTop ?? null,
        logicalY: window.TruongThinhMotion?.getLogicalScroll?.() ?? null,
        historyState: history.state, gridEntryY: browse?.grid?.scrollY ?? null,
        detailEntryY: browse?.detail?.scrollY ?? null,
        viewportHeight: innerHeight, scrollHeight: scroller?.scrollHeight ?? null,
        maxDocumentY: scroller ? scroller.scrollHeight - innerHeight : null,
        cardRect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null };
    };
    const frames = [];
    for (const targetMs of delays) {
      const waitMs = targetMs - (performance.now() - start);
      if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
      frames.push(sample(targetMs));
    }
    return frames;
  }, { id: cardId, delays: offsets });
}

async function inventory(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const issues = watch(page);
  const rows = [];
  try {
    for (const locale of ["vi", "en"]) {
      for (const route of [...new Set(families.map((item) => item.route))]) {
        await page.goto(url(`${locale}/${route}`), { waitUntil: "domcontentloaded" });
        if (route.startsWith("advertising-products/")) {
          await page.waitForFunction(() => Boolean(window.TruongThinhAdvertising?.getAdapter?.()), undefined, { timeout: 12_000 });
          if (route.includes("photo=")) await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-view]")?.hidden);
        }
        for (const family of families.filter((item) => item.route === route)) {
          const evidence = await page.evaluate((selector) => {
            const nodes = [...document.querySelectorAll(selector)];
            return { count: nodes.length, linked: nodes.filter((node) => Boolean(node.closest("a[href]") || node.querySelector("a[href]"))).length,
              withIdentity: nodes.filter((node) => Boolean(node.dataset.advertisingCard || node.dataset.advertisingRelatedCard || node.dataset.mediaCardId)).length,
              videos: nodes.reduce((sum, node) => sum + node.querySelectorAll("video").length, 0),
              samples: nodes.slice(0, 2).map((node) => ({ tag: node.tagName, className: node.className,
                href: (node.closest("a[href]") || node.querySelector("a[href]"))?.getAttribute("href") || null })) };
          }, family.selector);
          rows.push({ locale, family: family.name, route, selector: family.selector, ...evidence });
        }
      }
    }
  } finally { await context.close(); }
  return { rows, issues };
}

async function runCase(browser, name, execute, options = {}) {
  const context = await browser.newContext({ viewport: options.viewport || { width: 1440, height: 900 },
    hasTouch: Boolean(options.touch), isMobile: Boolean(options.touch) });
  const page = await context.newPage();
  const issues = watch(page);
  try {
    const value = await execute(page, context);
    const fixtureFault = issues.some((issue) => issue.kind === "pageerror" || issue.kind === "response"
      || (issue.kind === "requestfailed" && !/ERR_ABORTED/.test(issue.message || "")));
    results.push({ name, ...value, status: fixtureFault ? "ENVIRONMENT_OR_FIXTURE_FAILURE" : value.status,
      ...(fixtureFault && { candidateStatus: value.status }), issues });
  } catch (error) {
    results.push({ name, status: "ENVIRONMENT_OR_FIXTURE_FAILURE", error: String(error?.stack || error), issues });
    await page.screenshot({ path: path.join(evidenceDir, `${name}.png`) }).catch(() => {});
  } finally { await context.close(); }
}

await verifyCandidate();
const browser = await chromium.launch({ headless: true });
try {
  const familyInventory = await inventory(browser);
  await writeFile(path.join(evidenceDir, "inventory.json"), JSON.stringify(familyInventory, null, 2), { flag: "wx" });

  await runCase(browser, "card-carousel-capability", async (page) => {
    await advertisingReady(page, "vi/advertising-products/");
    await page.waitForFunction(() => document.querySelectorAll("[data-advertising-card]").length > 0);
    const card = await page.locator("[data-advertising-card]").first().evaluate((node) => ({ id: node.dataset.advertisingCard,
      mediaElements: node.querySelectorAll("img,video").length, videoElements: node.querySelectorAll("video").length }));
    const dataShape = { count: ADVERTISING_CARDS.length, listMedia: ADVERTISING_CARDS.filter((record) =>
      Object.values(record).some((value) => Array.isArray(value) && value.length > 1 && value.every((item) => item && typeof item === "object" && (item.src || item.url)))).length };
    return { status: dataShape.listMedia ? "NEEDS_BEHAVIOR_TEST" : "RED_SOURCE_ABSENT", card, dataShape,
      expectation: "At least one card can switch between two ordered media without opening detail" };
  });

  await runCase(browser, "active-media-opens-primary", async (page, context) => {
    await advertisingReady(page, "vi/advertising-products/");
    await page.waitForFunction(() => document.querySelectorAll("[data-advertising-card]").length > 0);
    const card = page.locator("[data-advertising-card] > a").first();
    await card.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => { const image = document.querySelector("[data-advertising-card] img");
      return image?.complete && image.naturalWidth > 0; });
    const before = await card.locator("img,video").first().evaluate((node) => ({ src: node.currentSrc || node.src, id: node.dataset.advertisingPhotoId || null }));
    const box = await card.boundingBox();
    assert(box && box.width > 20, "card fixture has no geometry");
    const y = box.y + box.height / 2, startX = box.x + box.width * 0.8, endX = box.x + box.width * 0.2;
    const target = await page.evaluate(({ x, y }) => {
      const hit = document.elementFromPoint(x, y)?.closest("[data-advertising-card]");
      window.__siteMediaSwipeEvents = { start: 0, move: 0, end: 0, ids: [] };
      for (const [type, key] of [["touchstart", "start"], ["touchmove", "move"], ["touchend", "end"]]) {
        document.addEventListener(type, (event) => {
          const id = event.target.closest?.("[data-advertising-card]")?.dataset.advertisingCard;
          if (!id) return;
          window.__siteMediaSwipeEvents[key]++;
          window.__siteMediaSwipeEvents.ids.push(id);
        }, { capture: true });
      }
      return hit?.dataset.advertisingCard || null;
    }, { x: startX, y });
    const cardId = await card.getAttribute("href");
    assert(target && cardId?.includes(`/p/${target}/`), "swipe fixture start point missed selected card");
    const client = await context.newCDPSession(page);
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: startX, y, id: 1 }] });
    await page.waitForTimeout(30);
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: endX, y, id: 1 }] });
    await page.waitForTimeout(30);
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    const delivery = await page.evaluate(() => window.__siteMediaSwipeEvents);
    assert(delivery?.start >= 1 && delivery.move >= 1 && delivery.end >= 1
      && delivery.ids.every((id) => id === target), `card swipe was not delivered: ${JSON.stringify({ target, delivery })}`);
    const after = await card.locator("img,video").first().evaluate((node) => ({ src: node.currentSrc || node.src, id: node.dataset.advertisingPhotoId || null }));
    if (after.src === before.src && after.id === before.id) return { status: "RED_SOURCE_ABSENT", before, after,
      target, delivery, expectation: "Card swipe selects second media; body click opens primary at that media" };
    await card.click();
    await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-view]")?.hidden);
    const primary = await page.locator("[data-advertising-photo-image]").evaluate((node) => ({ src: node.currentSrc || node.src,
      id: node.dataset.advertisingPhotoId || null }));
    return { status: primary.src === after.src ? "PASS_BASELINE" : "RED_BEHAVIOR", before, after, primary, target, delivery };
  }, { touch: true, viewport: { width: 390, height: 844 } });

  await runCase(browser, "no-grid-morph-and-last-viewed-marker", async (page) => {
    await advertisingReady(page, "vi/advertising-products/?category=signage-raised-letters");
    await page.evaluate((id) => window.TruongThinhAdvertising.getAdapter().ensurePhoto(id), photoId);
    const card = page.locator(`[data-advertising-card="${photoId}"] > a`);
    await card.scrollIntoViewIfNeeded();
    await page.waitForFunction((id) => { const image = document.querySelector(`[data-advertising-card="${id}"] img`);
      return image?.complete && image.naturalWidth > 0; }, photoId);
    await page.evaluate(() => { window.__siteMediaMorphCount = 0; const observer = new MutationObserver((records) => {
      for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1
        && (node.matches?.("[data-advertising-photo-morph]") || node.querySelector?.("[data-advertising-photo-morph]"))) window.__siteMediaMorphCount++;
    }); observer.observe(document.body, { childList: true, subtree: true }); });
    const before = await settledHistory(page, null);
    await card.click();
    await page.waitForFunction((id) => document.querySelector("[data-advertising-photo-view]")?.dataset.advertisingPhotoId === id, photoId);
    const detail = await settledHistory(page, photoId);
    await page.goBack();
    const back = await settledHistory(page, null);
    const after = await page.evaluate((id) => ({ morphCount: window.__siteMediaMorphCount,
      cardFound: Boolean(document.querySelector(`[data-advertising-card="${id}"]`)),
      marker: document.querySelector(`[data-advertising-card="${id}"]`)?.textContent?.trim() || "" }), photoId);
    const hasMarker = after.marker.includes("Vừa xem") || after.marker.includes("Just viewed");
    assert(after.cardFound, "marker fixture card is missing after settled Back");
    return { status: after.morphCount === 0 && hasMarker ? "PASS_BASELINE" : "RED_BEHAVIOR",
      before, detail, back, after, hasMarker, expectation: "No grid-detail clone; last closed detail marks exactly its card" };
  });

  await runCase(browser, "history-entry-scroll-and-photo-identity", async (page) => {
    await advertisingReady(page, "vi/advertising-products/?category=signage-raised-letters");
    await page.evaluate((id) => window.TruongThinhAdvertising.getAdapter().ensurePhoto(id), photoId);
    const card = page.locator(`[data-advertising-card="${photoId}"] > a`);
    await card.scrollIntoViewIfNeeded();
    await page.waitForFunction((id) => { const image = document.querySelector(`[data-advertising-card="${id}"] img`);
      return image?.complete && image.naturalWidth > 0; }, photoId);
    await card.scrollIntoViewIfNeeded();
    const grid = await settledHistory(page, null);
    const gridGeometry = await historyGeometry(page, photoId);
    const clickPoint = await card.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
      const hit = document.elementFromPoint(x, y);
      return { x, y, visible: x >= 0 && x < innerWidth && y >= 0 && y < innerHeight,
        hit: hit === node || node.contains(hit) };
    });
    assert(clickPoint.visible && clickPoint.hit, `history fixture card is not pointer-clickable: ${JSON.stringify(clickPoint)}`);
    await page.mouse.click(clickPoint.x, clickPoint.y);
    await page.waitForFunction((id) => document.querySelector("[data-advertising-photo-view]")?.dataset.advertisingPhotoId === id, photoId);
    await settledHistory(page, photoId);
    const requestedY1 = grid.y <= 600 ? 1200 : 480;
    await page.evaluate((y) => window.TruongThinhMotion.setLogicalScroll(y), requestedY1);
    const detail = await settledHistory(page, photoId);
    const detailGeometry = await historyGeometry(page, photoId);
    assert(Math.abs(grid.y - detail.y) > 100,
      `history fixture needs distinct Y0 and Y1: ${grid.y}, ${detail.y}`);
    await page.goBack();
    const backTimeline = await historyGeometry(page, photoId, [0, 400, 1000, 2000]);
    const back = await settledHistory(page, null);
    await page.goForward();
    const forward = await settledHistory(page, photoId);
    const checks = {
      gridEntryY0: Math.abs(back.y - grid.y) <= 1 && Math.abs(back.entryY - grid.entryY) <= 1,
      detailEntryY1: Math.abs(forward.y - detail.y) <= 1 && Math.abs(forward.entryY - detail.entryY) <= 1,
      photoIdentity: detail.primaryId === photoId && forward.primaryId === photoId
        && forward.photo === photoId && back.photo === null,
      localeCategorySeedTag: [grid, detail, back, forward].every((item) =>
        new URL(item.url).pathname === "/vi/advertising-products/"
        && item.category === "signage" && item.seed === grid.seed && item.tag === grid.tag),
      oneHistoryEntry: detail.length === grid.length + 1 && back.length === detail.length && forward.length === detail.length,
    };
    return { status: Object.values(checks).every(Boolean) ? "PASS_BASELINE" : "RED_BEHAVIOR",
      grid, gridGeometry, clickPoint, requestedY1, detail, detailGeometry, backTimeline, back, forward, checks,
      expectation: "Each history entry restores its own scroll and photo identity" };
  });

  await runCase(browser, "focus-hover-one-cover-video", async (page) => {
    await advertisingReady(page, "vi/advertising-products/");
    const videoCount = await page.locator("[data-advertising-card] video").count();
    if (!videoCount) return { status: "RED_SOURCE_ABSENT", videoCount,
      expectation: "Eligible cover videos permit one player, focus schedule and hover override" };
    return { status: "NEEDS_BEHAVIOR_TEST", videoCount };
  });

  await runCase(browser, "viewer-two-finger-image-pinch", async (page, context) => {
    await advertisingReady(page, `vi/advertising-products/?photo=${photoId}`);
    await page.waitForFunction(() => document.querySelector("[data-advertising-photo-image]")?.naturalWidth > 0);
    // Màn cảm ứng ẩn nút expand khỏi mắt, chạm ảnh primary mở viewer (viewer touch R7, R8).
    await page.locator("[data-advertising-photo-image]").tap();
    await page.waitForFunction(() => document.querySelector("[data-advertising-photo-dialog]")?.dataset.advertisingViewerState === "open");
    const image = page.locator("[data-advertising-photo-expanded-image]");
    const box = await image.boundingBox();
    assert(box && box.width > 80 && box.height > 80, "expanded image fixture has no geometry");
    const scale = () => image.evaluate((node) => ({ imageScale: new DOMMatrixReadOnly(getComputedStyle(node).transform).a,
      pageScale: visualViewport?.scale || 1, dialogOpen: Boolean(node.closest("dialog")?.open) }));
    const before = await scale();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    const hit = await page.evaluate(({ x, y }) => {
      const target = document.elementFromPoint(x, y);
      const image = document.querySelector("[data-advertising-photo-expanded-image]");
      window.__siteMediaPinchEvents = { starts: 0, twoFingerStarts: 0 };
      document.addEventListener("touchstart", (event) => {
        window.__siteMediaPinchEvents.starts++;
        if (event.touches.length >= 2) window.__siteMediaPinchEvents.twoFingerStarts++;
      }, { capture: true });
      return { imageHit: target === image || image?.contains(target), tag: target?.tagName || null };
    }, { x, y });
    assert(hit.imageHit, `pinch fixture did not hit enlarged image: ${JSON.stringify(hit)}`);
    const client = await context.newCDPSession(page);
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x - 20, y, id: 1 }, { x: x + 20, y, id: 2 }] });
    await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x - 70, y, id: 1 }, { x: x + 70, y, id: 2 }] });
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(250);
    const after = await scale();
    const delivery = await page.evaluate(() => window.__siteMediaPinchEvents);
    assert(delivery?.twoFingerStarts >= 1, `synthetic two-finger touch was not delivered: ${JSON.stringify(delivery)}`);
    const localPinch = after.dialogOpen && after.imageScale > before.imageScale * 1.1 && Math.abs(after.pageScale - before.pageScale) < 0.02;
    return { status: localPinch ? "PASS_BASELINE" : "RED_BEHAVIOR", before, after, hit, delivery,
      expectation: "Two fingers enlarge the image inside the open viewer without page zoom" };
  }, { touch: true, viewport: { width: 390, height: 844 } });
} finally { await browser.close(); }

const runnerSha256After = await fileHash("tests/site/site-media-card-playback.e2e.mjs");
const inventoryFaults = (JSON.parse(await readFile(path.join(evidenceDir, "inventory.json"), "utf8")).issues || [])
  .filter((issue) => issue.kind === "pageerror" || issue.kind === "response"
    || (issue.kind === "requestfailed" && !/ERR_ABORTED/.test(issue.message || ""))).length;
const report = { generatedAt: new Date().toISOString(), head: preflight.head, base,
  runnerSha256Before, runnerSha256After, runnerStable: runnerSha256Before === runnerSha256After,
  productRed: results.filter((item) => item.status?.startsWith("RED_")).length,
  fixtureFailures: results.filter((item) => item.status === "ENVIRONMENT_OR_FIXTURE_FAILURE").length + inventoryFaults,
  inventoryFaults, results };
await writeFile(path.join(evidenceDir, "run.json"), JSON.stringify(report, null, 2), { flag: "wx" });
for (const result of results) console.log(`${result.name}: ${result.status}`);
process.exitCode = report.productRed || report.fixtureFailures || !report.runnerStable ? 1 : 0;
