import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { ADVERTISING_CARDS, ADVERTISING_CATEGORIES } from "../../src/site/advertising-products/catalog.mjs";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium, webkit } = await import("playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:8792";
const output = ".tmp/mobile-skeleton-correction/random-browser";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [], errors = [];
const ready = async page => {
  await page.waitForFunction(() => window.TruongThinhAdvertising?.getAdapter?.() && window.TruongThinhAdvertising.getBrowseState().seed);
  await page.waitForFunction(() => document.querySelector("[data-advertising-cta-skeleton]")?.dataset.advertisingCtaReady === "true");
};
const read = page => page.evaluate(() => ({
  browse: window.TruongThinhAdvertising.getBrowseState(),
  ids: [...document.querySelectorAll("[data-advertising-card]")].map(node => node.dataset.advertisingCard),
  positions: [...document.querySelectorAll("[data-advertising-card]")].map(node => [node.dataset.advertisingCard, node.style.left, node.style.top]),
  hash: document.querySelector("[data-advertising-cta-skeleton]")?.dataset.advertisingCtaSignature,
}));
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  page.on("console", msg => { if(msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(base + "/vi/advertising-products/", { waitUntil: "networkidle" });
  await ready(page);
  const direct = await read(page);
  assert.ok(direct.ids.length);
  const originalPositions = direct.positions;
  for (const category of ADVERTISING_CATEGORIES) {
    await page.locator('[data-advertising-filter="' + category.slug + '"]').click();
    await page.waitForFunction(category => window.TruongThinhAdvertising.getBrowseState().category === category, category.slug);
    await page.waitForTimeout(700);
    const sample = await read(page);
    assert.equal(sample.browse.seed, direct.browse.seed);
    assert.ok(sample.ids.every(id => ADVERTISING_CARDS.find(card => card.id === id)?.category === category.slug));
    assert.equal(new Set(sample.ids).size, sample.ids.length);
    results.push({ case: "filter", category: category.slug, seed: sample.browse.seed, rendered: sample.ids.length });
  }
  await page.locator('[data-advertising-filter="all"]').click();
  await page.waitForTimeout(750);
  assert.deepEqual((await read(page)).positions, originalPositions, "filter round trip preserves the entry layout");
  const hero = (await read(page)).ids[0];
  await page.locator('[data-advertising-card="' + hero + '"] a').click();
  await page.waitForFunction(() => Boolean(window.TruongThinhAdvertising.getBrowseState().photo));
  assert.equal((await read(page)).browse.seed, direct.browse.seed);
  await page.goBack();
  await page.waitForFunction(() => window.TruongThinhAdvertising.getBrowseState().photo === null);
  assert.equal((await read(page)).browse.seed, direct.browse.seed);
  results.push({ case: "photo-back", hero, seed: direct.browse.seed });
  await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-morph]")
    && getComputedStyle(document.body).overflow !== "hidden");
  const pendingTarget = await page.evaluate(() => {
    window.__pendingBrowseScrollTime = null;
    window.addEventListener("scroll", () => { window.__pendingBrowseScrollTime = performance.now(); }, { once: true });
    window.scrollTo(0, 900);
    const link = [...document.querySelectorAll('[data-advertising-card] a')].find(node => {
      const r = node.getBoundingClientRect(); return r.top >= 10 && r.top < innerHeight - 100;
    });
    if (!link) throw Error("visible link required for pending-scroll navigation");
    window.__pendingBrowseClick = null;
    link.addEventListener("click", () => { window.__pendingBrowseClick = { elapsed: performance.now() - window.__pendingBrowseScrollTime, scrollEventObserved: window.__pendingBrowseScrollTime !== null, y: scrollY }; }, { once: true, capture: true });
    const r = link.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + Math.min(40, r.height / 2) };
  });
  await page.waitForFunction(() => window.__pendingBrowseScrollTime !== null);
  await page.mouse.click(pendingTarget.x, pendingTarget.y);
  await page.waitForFunction(() => Boolean(window.TruongThinhAdvertising.getBrowseState().photo));
  const pendingClick = await page.evaluate(() => window.__pendingBrowseClick);
  assert.equal(pendingClick.scrollEventObserved, true, "native scroll event precedes photo navigation");
  assert.ok(pendingClick.elapsed < 200, "photo navigation occurs while scroll persistence is pending");
  assert.ok(Math.abs((await read(page)).browse.grid.scrollY - pendingClick.y) <= 2, "photo captures the latest scroll synchronously");
  await page.goBack();
  await page.waitForFunction(y => !window.TruongThinhAdvertising.getBrowseState().photo
    && !document.querySelector("[data-advertising-photo-morph]") && Math.abs(scrollY - y) <= 2, pendingClick.y);
  results.push({ case: "pending-scroll-photo-back", ...pendingClick });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-morph]")
    && getComputedStyle(document.documentElement).overflow !== "hidden"
    && getComputedStyle(document.body).overflow !== "hidden");
  await page.keyboard.press("Control+Home");
  await page.waitForFunction(() => scrollY <= 1);
  await page.waitForFunction(() => document.querySelector("[data-menu-open]").getBoundingClientRect().top >= 0);
  await page.locator("[data-menu-open]").click();
  await page.locator('[data-language-option="en"]').first().click();
  await page.waitForFunction(() => document.documentElement.lang === "en");
  await ready(page);
  assert.equal((await read(page)).browse.seed, direct.browse.seed, "soft locale retains the current visit");
  results.push({ case: "soft-locale", seed: direct.browse.seed });
  const beforeReload = await read(page);
  await page.reload({ waitUntil: "networkidle" }); await ready(page);
  assert.notEqual((await read(page)).browse.seed, beforeReload.browse.seed);
  results.push({ case: "reload", seed: (await read(page)).browse.seed });
  // Blocking the shell script exercises the real HTML native-language fallback.
  const nativePage = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  let blockedMotion = 0, nativeRequests = 0;
  nativePage.on("request", request => { if (request.isNavigationRequest() && request.frame() === nativePage.mainFrame()) nativeRequests++; });
  await nativePage.route("**/motion.js", route => { blockedMotion++; return route.abort("failed"); });
  await nativePage.goto(base + "/en/advertising-products/", { waitUntil: "networkidle" }); await ready(nativePage);
  await nativePage.waitForFunction(() => window.__ttMotionBoot?.fallback === true);
  const seedBeforeFallback = (await read(nativePage)).browse.seed;
  const originBefore = await nativePage.evaluate(() => performance.timeOrigin);
  const requestsBefore = nativeRequests;
  await nativePage.locator("[data-menu-open]").click();
  await nativePage.locator('[data-language-option="vi"]').click();
  await nativePage.waitForURL("**/vi/advertising-products/**"); await ready(nativePage);
  assert.ok(blockedMotion >= 2, "injection blocks the shell in both documents");
  assert.ok(nativeRequests > requestsBefore, "locale click makes a main document request");
  assert.notEqual(await nativePage.evaluate(() => performance.timeOrigin), originBefore, "native locale constructs a new document");
  assert.equal((await read(nativePage)).browse.seed, seedBeforeFallback, "full locale consumes one-time handoff");
  assert.equal(await nativePage.evaluate(() => sessionStorage.getItem("tt-advertising-visit-seed-handoff-v1")), null);
  results.push({ case: "native-locale", injection: "abort motion.js in both documents", blockedMotion, nativeRequests, seed: seedBeforeFallback });
  await nativePage.close();
  for (const engine of [chromium, webkit]) {
    const earlyBrowser = engine === chromium ? browser : await engine.launch({ headless: true });
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const restingPage = await earlyBrowser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
        restingPage.on("console", msg => {if(msg.type() === "error") errors.push(msg.text());});
        restingPage.on("pageerror", error => errors.push(error.message));
        try {
          await restingPage.goto(base + "/vi/advertising-products/", {waitUntil:"networkidle"}); await ready(restingPage);
          const restingSeed = (await read(restingPage)).browse.seed;
          const restingOrigin = await restingPage.evaluate(() => performance.timeOrigin);
          const point = await restingPage.evaluate(() => {
            scrollTo({top:80,behavior:"instant"});
            const node = document.querySelector("#header-logo"), rect = node.getBoundingClientRect();
            node.addEventListener("click", () => {window.__restingRouteScroll = scrollY;}, {once:true,capture:true});
            return {x:rect.left+rect.width/2,y:rect.top+rect.height/2};
          });
          await restingPage.mouse.click(point.x,point.y);
          const scroll = await restingPage.evaluate(() => window.__restingRouteScroll);
          assert.equal(scroll,80,"resting route fixture starts at the exact native offset");
          await restingPage.waitForFunction(() => document.querySelector('[data-barba="container"]')?.dataset.barbaNamespace === "home"
            && location.pathname === "/vi/" && !window.barba.transitions.isRunning);
          await restingPage.goBack(); await ready(restingPage);
          await restingPage.waitForFunction(() => !window.barba.transitions.isRunning);
          await restingPage.waitForTimeout(1200);
          const restored = await restingPage.evaluate(() => ({y:scrollY,timeOrigin:performance.timeOrigin}));
          assert.equal(restored.timeOrigin,restingOrigin,"resting Back exercises the Barba soft remount");
          assert.equal((await read(restingPage)).browse.seed,restingSeed);
          assert.ok(Math.abs(restored.y-scroll)<=2,"resting Back stays within the two-pixel precision contract");
          results.push({case:"resting-route-back",engine:engine.name(),attempt,scroll,restored:restored.y,seed:restingSeed});
        } finally {await restingPage.close();}
      }
      const earlyPage = await earlyBrowser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      earlyPage.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
      earlyPage.on("pageerror", error => errors.push(error.message));
      await earlyPage.goto(base + "/vi/advertising-products/", { waitUntil: "networkidle" }); await ready(earlyPage);
      const earlySeed = (await read(earlyPage)).browse.seed;
      const earlyOrigin = await earlyPage.evaluate(() => performance.timeOrigin);
      await earlyPage.locator("#header-logo").click();
      await earlyPage.waitForFunction(() => location.pathname === "/vi/" && window.barba.transitions.isRunning);
      await earlyPage.goBack();
      await earlyPage.waitForFunction(origin => performance.timeOrigin !== origin, earlyOrigin);
      await ready(earlyPage);
      assert.equal((await read(earlyPage)).browse.seed, earlySeed, "Back during route transition restores the original entry seed");
      assert.notEqual(await earlyPage.evaluate(() => performance.timeOrigin), earlyOrigin, "early Back exercises Barba native fallback");
      assert.equal(await earlyPage.evaluate(() => history.state?.ttAdvertisingHistoryFallback), undefined, "startup consumes the exact-URL fallback marker");
      await earlyPage.reload({ waitUntil: "networkidle" }); await ready(earlyPage);
      assert.notEqual((await read(earlyPage)).browse.seed, earlySeed, "early-Back marker does not retain the seed on reload");
      results.push({ case: "early-route-back", engine: engine.name(), seed: earlySeed, nativeFallback: true, reloadReseeds: true });
      await earlyPage.close();
    } finally { if (earlyBrowser !== browser) await earlyBrowser.close(); }
  }
  await page.goto(base + "/en/advertising-products/", { waitUntil: "networkidle" }); await ready(page);
  assert.notEqual((await read(page)).browse.seed, seedBeforeFallback, "ordinary direct URL starts a new visit");
  // Expected fetch failure above is recorded separately; never hide WebGL errors.
  const unexpected = errors.filter(error => !error.includes("net::ERR_FAILED"));
  assert.deepEqual(unexpected, [], "no runtime/renderer errors");
  await page.screenshot({ path: output + "/random-grid.png", fullPage: false });
  console.log("PASS random browser: " + results.length + " cases");
} finally {
  await fs.writeFile(output + "/results.json", JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
