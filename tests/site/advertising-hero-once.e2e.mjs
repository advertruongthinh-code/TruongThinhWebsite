import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".tooling/browsers");

const { chromium } = await import("playwright");

function observeAdvertisingQueryTraffic(page) {
  const traffic = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!/^\/(?:vi|en)\/advertising-products\/$/.test(url.pathname)) return;
    if (!url.searchParams.has("category")) return;
    if (!["document", "fetch", "xhr"].includes(request.resourceType())) return;
    traffic.push({ resourceType: request.resourceType(), url: url.href });
  });
  return traffic;
}

async function waitForHeroSettled(page, { veilCleared = true } = {}) {
  await page.waitForFunction((veilCleared) => {
    const hero = document.querySelector(".detail-index-hero");
    const title = hero?.querySelector("[data-motion-hero-title]");
    const words = title ? [...title.querySelectorAll(".motion-word")] : [];
    // Direct-load veil chặn pointer input cho đến khi trang mount xong.
    if (veilCleared && document.documentElement.classList.contains("route-enter")) return false;
    if (!window.TruongThinhDetail?.mount || !window.gsap || words.length === 0) return false;
    const visible = words.every((word) => Number.parseFloat(getComputedStyle(word).opacity) >= 0.99);
    return visible && !window.gsap.isTweening(words);
  }, veilCleared);
}

async function installHeroOnceProbe(page) {
  await page.evaluate(() => {
    const originalContainer = document.querySelector('[data-barba="container"]');
    const originalHero = originalContainer?.querySelector(".detail-index-hero");
    if (!originalContainer || !originalHero || !window.TruongThinhDetail?.mount || !window.gsap) {
      throw new Error("Advertising hero probe cannot attach before the page runtime is ready");
    }

    const probe = {
      heroClassDrops: [],
      heroHiddenSets: 0,
      heroTransitionRuns: [],
      heroTweenCalls: 0,
      heroWordStaggers: [],
      mountCalls: 0,
      originalContainer,
      originalHero,
      originalTimeOrigin: performance.timeOrigin,
      queryCalls: [],
      wordOpacityDrops: 0,
    };
    const heroObserver = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type !== "attributes" || !(record.target instanceof Element)) continue;
        if (record.attributeName === "class") {
          const hadMotion = record.oldValue?.split(/\s+/).includes("is-motion-inview");
          if (hadMotion && !record.target.classList.contains("is-motion-inview")) {
            probe.heroClassDrops.push(record.target.className);
          }
        }
        if (record.attributeName === "style" && record.target.classList.contains("motion-word")) {
          if (Number.parseFloat(getComputedStyle(record.target).opacity) < 0.95) probe.wordOpacityDrops += 1;
        }
      }
    });
    heroObserver.observe(originalHero, {
      attributes: true,
      attributeFilter: ["class", "style"],
      attributeOldValue: true,
      subtree: true,
    });
    document.addEventListener("transitionrun", (event) => {
      if (event.target instanceof Element && event.target.closest(".detail-index-hero") && event.target.matches(
        "[data-motion-hero-kicker], [data-motion-hero-zoom], [data-motion-hero-wrapper-zoom], [data-motion-hero-media]",
      )) probe.heroTransitionRuns.push(event.propertyName);
    });
    const originalMount = window.TruongThinhDetail.mount;
    window.TruongThinhDetail.mount = function (...args) {
      const candidate = args[0] || document.querySelector('[data-barba="container"]');
      if (candidate?.dataset?.barbaNamespace === "advertising-products") probe.mountCalls += 1;
      return Reflect.apply(originalMount, this, args);
    };

    const targetsHero = (targets) => {
      const values = targets instanceof Element
        ? [targets]
        : typeof targets?.length === "number"
          ? [...targets]
          : [];
      return values.some((target) => target instanceof Element && Boolean(target.closest(".detail-index-hero")));
    };
    for (const method of ["to", "fromTo"]) {
      const original = window.gsap[method];
      window.gsap[method] = function (targets, ...args) {
        if (targetsHero(targets)) {
          probe.heroTweenCalls += 1;
          if ([...targets].some((target) => target.matches?.("[data-motion-hero-title] .motion-word"))) {
            probe.heroWordStaggers.push(args[0]?.stagger);
          }
        }
        return Reflect.apply(original, this, [targets, ...args]);
      };
    }
    const originalSet = window.gsap.set;
    window.gsap.set = function (targets, vars, ...args) {
      if (targetsHero(targets) && (vars?.opacity === 0 || vars?.autoAlpha === 0 || vars?.visibility === "hidden")) {
        probe.heroHiddenSets += 1;
      }
      return Reflect.apply(originalSet, this, [targets, vars, ...args]);
    };
    const recordQueryCall = (input, transport) => {
      const url = new URL(String(input), location.href);
      if (/^\/(?:vi|en)\/advertising-products\/$/.test(url.pathname) && url.searchParams.has("category")) {
        probe.queryCalls.push({ transport, url: url.href });
      }
    };
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...args) {
      recordQueryCall(url, "xhr");
      return Reflect.apply(originalOpen, this, [method, url, ...args]);
    };
    const originalFetch = window.fetch;
    window.fetch = function (input, ...args) {
      recordQueryCall(input instanceof Request ? input.url : input, "fetch");
      return Reflect.apply(originalFetch, this, [input, ...args]);
    };
    window.__ttHeroOnceProbe = probe;
  });
}

async function runEndHomeSequence(page) {
  await page.keyboard.press("End");
  await page.waitForFunction(() => {
    const logicalY = window.TruongThinhMotion?.getLogicalScroll?.() ?? window.scrollY;
    return logicalY > Math.min(400, document.documentElement.scrollHeight - innerHeight - 2);
  });
  await page.keyboard.press("Home");
  await page.waitForFunction(() => (window.TruongThinhMotion?.getLogicalScroll?.() ?? window.scrollY) <= 2);
}

async function readProbe(page) {
  return page.evaluate(() => {
    const probe = window.__ttHeroOnceProbe;
    const container = document.querySelector('[data-barba="container"]');
    const hero = container?.querySelector(".detail-index-hero");
    return {
      activeFilter: document.querySelector('[data-advertising-filter][aria-current="true"]')?.dataset.advertisingFilter || null,
      containerIdentityStable: container === probe.originalContainer,
      heroIdentityStable: hero === probe.originalHero,
      heroClassDrops: probe.heroClassDrops,
      heroHiddenSets: probe.heroHiddenSets,
      heroTransitionRuns: probe.heroTransitionRuns,
      heroTweenCalls: probe.heroTweenCalls,
      heroWordStaggers: probe.heroWordStaggers,
      midMotionLocaleRebuild: probe.midMotionLocaleRebuild,
      mountCalls: probe.mountCalls,
      queryCalls: probe.queryCalls,
      search: location.search,
      timeOrigin: performance.timeOrigin,
      sameDocument: performance.timeOrigin === probe.originalTimeOrigin,
      wordOpacityDrops: probe.wordOpacityDrops,
    };
  });
}

async function runDelayedAdapterCase(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const queryTraffic = observeAdvertisingQueryTraffic(page);
  let releaseCatalog;
  const catalogGate = new Promise((resolve) => { releaseCatalog = resolve; });
  let interceptedCatalogRequests = 0;
  await page.route("**/advertising-products/catalog-runtime.mjs", async (route) => {
    interceptedCatalogRequests += 1;
    await catalogGate;
    await route.continue();
  });

  try {
    await page.goto(`${baseUrl}/vi/advertising-products/`, { waitUntil: "domcontentloaded" });
    // Catalog bị giữ làm direct-load veil luôn bật, nên scroll bị khóa và chỉ
    // kích hoạt kiểu bàn phím mới tới được filter trước khi adapter sẵn sàng.
    await waitForHeroSettled(page, { veilCleared: false });
    assert.equal(interceptedCatalogRequests, 1, "fixture did not hold the first catalog-runtime import");
    assert.equal(await page.evaluate(() => Boolean(window.TruongThinhAdvertising?.getAdapter?.())), false,
      "fixture released the Advertising adapter before the pre-ready click");
    await installHeroOnceProbe(page);

    await page.locator('[data-advertising-filter="displays-booths"]').dispatchEvent("click");
    await page.locator('[data-advertising-filter="printing-decals"]').dispatchEvent("click");
    const queryStarted = await page.evaluate(() => window.__ttHeroOnceProbe.queryCalls.length > 0);
    if (queryStarted) {
      await page.waitForFunction(() => {
        const probe = window.__ttHeroOnceProbe;
        return probe?.mountCalls > 0
          || document.querySelector('[data-barba="container"]') !== probe?.originalContainer;
      });
    }
    releaseCatalog();
    await page.waitForFunction(() => window.TruongThinhAdvertising?.getAdapter?.());
    await page.waitForFunction(() => document.querySelector('[data-advertising-filter="printing-decals"]')?.getAttribute("aria-current") === "true");

    return {
      interceptedCatalogRequests,
      probe: await readProbe(page),
      queryTraffic,
    };
  } finally {
    releaseCatalog?.();
    await page.close();
  }
}

async function runReadyLoopCase(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const queryTraffic = observeAdvertisingQueryTraffic(page);
  try {
    await page.goto(`${baseUrl}/vi/advertising-products/`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.TruongThinhAdvertising?.getAdapter?.());
    await waitForHeroSettled(page);
    await installHeroOnceProbe(page);
    await runEndHomeSequence(page);

    for (let index = 0; index < 10; index += 1) {
      const filter = index % 2 === 0 ? "displays-booths" : "all";
      await page.locator(`[data-advertising-filter="${filter}"]`).click();
      await page.waitForFunction((expected) => (
        document.querySelector(`[data-advertising-filter="${expected}"]`)?.getAttribute("aria-current") === "true"
      ), filter);
    }

    return {
      probe: await readProbe(page),
      queryTraffic,
    };
  } finally {
    await page.close();
  }
}

async function runRouteEntryCase(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const queryTraffic = observeAdvertisingQueryTraffic(page);
  try {
    await page.goto(`${baseUrl}/vi/`, { waitUntil: "networkidle" });
    await page.locator('.site-header a[href="/vi/advertising-products/"]').click();
    await page.waitForURL(`${baseUrl}/vi/advertising-products/`);
    await page.waitForFunction(() => window.TruongThinhAdvertising?.getAdapter?.());
    await waitForHeroSettled(page);
    await installHeroOnceProbe(page);
    await runEndHomeSequence(page);

    for (const filter of ["displays-booths", "all", "signage", "all"]) {
      await page.locator(`[data-advertising-filter="${filter}"]`).click();
      await page.waitForFunction((expected) => (
        document.querySelector(`[data-advertising-filter="${expected}"]`)?.getAttribute("aria-current") === "true"
      ), filter);
    }

    return { probe: await readProbe(page), queryTraffic };
  } finally {
    await page.close();
  }
}

async function runRouteReturnCase(browser, locale) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(`${baseUrl}/${locale}/advertising-products/`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.TruongThinhAdvertising?.getAdapter?.());
    await waitForHeroSettled(page);
    await installHeroOnceProbe(page);
    await page.locator(`.site-header a[href="/${locale}/residential/"]`).click();
    await page.waitForURL(`${baseUrl}/${locale}/residential/`);
    await page.waitForFunction(() => (
      document.querySelector('[data-barba="container"]')?.dataset.barbaNamespace === "residential"
      && !document.body.classList.contains("is-transitioning")
    ));
    await page.locator(`.site-header a[href="/${locale}/advertising-products/"]`).click();
    await page.waitForURL(`${baseUrl}/${locale}/advertising-products/`);
    await page.waitForFunction(() => window.TruongThinhAdvertising?.getAdapter?.());
    await waitForHeroSettled(page);
    await page.locator('[data-advertising-filter="displays-booths"]').click();
    await page.waitForFunction(() => (
      document.querySelector('[data-advertising-filter="displays-booths"]')?.getAttribute("aria-current") === "true"
    ));
    return await readProbe(page);
  } finally {
    await page.close();
  }
}

async function runLocaleDuringHeroCase(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(`${baseUrl}/vi/advertising-products/`, { waitUntil: "domcontentloaded" });
    await page.locator("[data-menu-open]").click();
    await page.waitForFunction(() => {
      const words = [...document.querySelectorAll(".detail-index-hero [data-motion-hero-title] .motion-word")];
      return words.length > 0 && window.gsap?.isTweening(words);
    });
    await page.evaluate(() => {
      const words = [...document.querySelectorAll(".detail-index-hero [data-motion-hero-title] .motion-word")];
      window.gsap.getTweensOf(words).forEach((tween) => tween.timeScale(0.1));
    });
    await installHeroOnceProbe(page);
    await page.evaluate(() => {
      const original = window.TruongThinhDetail.revertSplitText;
      window.TruongThinhDetail.revertSplitText = function (...args) {
        const words = [...document.querySelectorAll(".detail-index-hero [data-motion-hero-title] .motion-word")];
        window.__ttHeroOnceProbe.midMotionLocaleRebuild = window.gsap.isTweening(words);
        return Reflect.apply(original, this, args);
      };
    });
    await page.locator('#site-menu [data-language-option="en"]').click();
    await page.waitForURL(`${baseUrl}/en/advertising-products/`);
    await waitForHeroSettled(page);
    return await readProbe(page);
  } finally {
    await page.close();
  }
}

async function runFailedAdapterFallbackCase(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.route("**/advertising-products/catalog-runtime.mjs", (route) => route.abort("failed"));
  try {
    await page.goto(`${baseUrl}/vi/advertising-products/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => (
      document.querySelector('[data-barba-namespace="advertising-products"]')?.dataset.advertisingFallback === "failed"
    ));
    const fallbackRequest = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return url.pathname === "/vi/advertising-products/standee-ke-trung-bay/"
        && ["document", "fetch", "xhr"].includes(request.resourceType());
    });
    await page.locator('[data-advertising-filter="displays-booths"]').click({ noWaitAfter: true });
    const request = await fallbackRequest;
    return { resourceType: request.resourceType(), url: request.url() };
  } finally {
    await page.close();
  }
}

async function runPendingAdapterFailureCase(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const queryTraffic = observeAdvertisingQueryTraffic(page);
  let rejectCatalog;
  const catalogGate = new Promise((resolve) => { rejectCatalog = resolve; });
  await page.route("**/advertising-products/catalog-runtime.mjs", async (route) => {
    await catalogGate;
    await route.abort("failed");
  });
  try {
    await page.goto(`${baseUrl}/vi/advertising-products/`, { waitUntil: "domcontentloaded" });
    await waitForHeroSettled(page, { veilCleared: false });
    await page.locator('[data-advertising-filter="displays-booths"]').dispatchEvent("click");
    const trafficBeforeReject = [...queryTraffic];
    const fallbackRequest = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return request.resourceType() === "document"
        && url.pathname === "/vi/advertising-products/standee-ke-trung-bay/";
    });
    rejectCatalog();
    const request = await fallbackRequest;
    return {
      request: { resourceType: request.resourceType(), url: request.url() },
      trafficBeforeReject,
    };
  } finally {
    rejectCatalog?.();
    await page.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  const delayed = await runDelayedAdapterCase(browser);
  const ready = await runReadyLoopCase(browser);
  const routeEntry = await runRouteEntryCase(browser);
  const routeReturn = await runRouteReturnCase(browser, "vi");
  const englishRouteReturn = await runRouteReturnCase(browser, "en");
  const localeDuringHero = await runLocaleDuringHeroCase(browser);
  const fallback = await runFailedAdapterFallbackCase(browser);
  const pendingFailure = await runPendingAdapterFailureCase(browser);
  console.log(JSON.stringify({ delayed, englishRouteReturn, fallback, localeDuringHero, pendingFailure, ready, routeEntry, routeReturn }, null, 2));

  assert.deepEqual(delayed.queryTraffic, [],
    "pre-adapter plain filter click escaped to Barba/document query navigation");
  assert.equal(delayed.probe.containerIdentityStable, true,
    "pre-adapter filter click replaced the Advertising container");
  assert.equal(delayed.probe.heroIdentityStable, true,
    "pre-adapter filter click replaced the Advertising hero");
  assert.equal(delayed.probe.mountCalls, 0,
    "pre-adapter filter click remounted Advertising detail motion");
  assert.equal(delayed.probe.heroTweenCalls, 0,
    "pre-adapter filter click replayed Advertising hero motion");
  assert.deepEqual(delayed.probe.heroClassDrops, [], "pre-adapter filter click restarted hero CSS motion");
  assert.equal(delayed.probe.wordOpacityDrops, 0, "pre-adapter filter click faded hero words again");
  assert.equal(delayed.probe.activeFilter, "printing-decals",
    "latest queued pre-adapter filter intent was not activated after catalog ready");
  // Rail trỏ tới trang cụm (taxonomy R4), nên fallback anchor mở thẳng trang đó.
  assert.equal(new URL(fallback.url).pathname, "/vi/advertising-products/standee-ke-trung-bay/",
    "failed adapter kept the synchronous filter queue locked instead of restoring anchor fallback");
  assert.deepEqual(pendingFailure.trafficBeforeReject, [],
    "pending filter escaped before the delayed catalog import rejected");
  assert.equal(new URL(pendingFailure.request.url).pathname, "/vi/advertising-products/standee-ke-trung-bay/",
    "rejected catalog import swallowed the pending filter destination");

  assert.deepEqual(ready.queryTraffic, [], "ready filter loop performed document/XHR query navigation");
  assert.equal(ready.probe.containerIdentityStable, true, "ready filter loop replaced the Advertising container");
  assert.equal(ready.probe.heroIdentityStable, true, "ready filter loop replaced the Advertising hero");
  assert.equal(ready.probe.mountCalls, 0, "ready filter loop remounted Advertising detail motion");
  assert.equal(ready.probe.heroTweenCalls, 0, "ready filter loop replayed Advertising hero motion");
  assert.deepEqual(ready.probe.heroClassDrops, [], "ready filter loop restarted hero CSS motion");
  assert.equal(ready.probe.wordOpacityDrops, 0, "ready filter loop faded hero words again");
  assert.equal(ready.probe.activeFilter, "all", "ready filter loop did not complete all ten activations");

  assert.deepEqual(routeEntry.queryTraffic, [], "route-entry filter loop performed document/XHR query navigation");
  assert.equal(routeEntry.probe.containerIdentityStable, true, "route-entry filter loop replaced the Advertising container");
  assert.equal(routeEntry.probe.heroIdentityStable, true, "route-entry filter loop replaced the Advertising hero");
  assert.equal(routeEntry.probe.mountCalls, 0, "route-entry filter loop remounted Advertising detail motion");
  assert.equal(routeEntry.probe.heroTweenCalls, 0, "route-entry filter loop replayed Advertising hero motion");
  assert.deepEqual(routeEntry.probe.heroClassDrops, [], "route-entry filter loop restarted hero CSS motion");
  assert.equal(routeEntry.probe.wordOpacityDrops, 0, "route-entry filter loop faded hero words again");

  assert.equal(routeReturn.sameDocument, true, "route-return fixture created a new document");
  assert.equal(routeReturn.activeFilter, "displays-booths", "route-return filter did not activate");
  assert.equal(englishRouteReturn.sameDocument, true, "English route-return fixture created a new document");
  assert.equal(englishRouteReturn.activeFilter, "displays-booths", "English route-return filter did not activate");

  for (const result of [routeReturn, englishRouteReturn]) {
    assert.deepEqual(result.heroWordStaggers, [0.2], "route return must reveal words once; filter must not replay them");
  }

  assert.equal(localeDuringHero.sameDocument, true, "locale switch during hero motion created a new document");
  assert.equal(localeDuringHero.midMotionLocaleRebuild, true, "locale fixture rebuilt after the hero tween ended");
  assert.equal(localeDuringHero.heroTweenCalls, 0, "locale switch created a second Advertising hero tween");
  assert.equal(localeDuringHero.heroHiddenSets, 0, "locale switch hid Advertising hero text during rebuild");
  assert.deepEqual(localeDuringHero.heroClassDrops, [], "locale switch restarted hero CSS motion classes");
  assert.deepEqual(localeDuringHero.heroTransitionRuns, [], "locale switch restarted hero CSS transitions");

  console.log("[advertising-hero-once] delayed-adapter queue and ten ready filter activations passed");
} finally {
  await browser.close();
}
