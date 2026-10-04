import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const engines = await import("playwright");
const base = process.env.BASE_URL || "http://127.0.0.1:8792";
const output = ".tmp/mobile-skeleton-correction/lifecycle-" + (process.env.LIFECYCLE_TAG || "candidate");
await fs.mkdir(output, { recursive: true });
const results = [];
for (const engine of (process.env.LIFECYCLE_ENGINES || "chromium,firefox,webkit").split(",")) {
  const browser = await engines[engine].launch({ headless: true });
  const errors = [];
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await context.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      const records = [], canvases = new WeakMap();
      const weakRecord = (canvasRef, contextRef) => {
        const record = { generation: 1, phase: null };
        Object.defineProperties(record, {
          canvas: { get: () => canvasRef.deref() },
          gl: { get: () => contextRef.deref() },
        });
        return record;
      };
      window.__flowLedger = { records, peak: 0, allocations: 0, losses: 0, restores: 0, nativeDisposals: 0 };
      HTMLCanvasElement.prototype.getContext = function(type, ...args) {
        const gl = getContext.call(this, type, ...args);
        if (!gl || !/^(webgl|experimental-webgl)$/.test(type) || canvases.has(this)) return gl;
        const record = weakRecord(new WeakRef(this), new WeakRef(gl));
        canvases.set(this, record); records.push(record);
        window.__flowLedger.allocations++;
        const getExtension = gl.getExtension.bind(gl);
        const extensions = new WeakMap();
        gl.getExtension = name => {
          const extension = getExtension(name);
          if (name !== "WEBGL_lose_context" || !extension) return extension;
          if (!extensions.has(extension)) extensions.set(extension, {
            loseContext() { window.__flowLedger.nativeDisposals++; return extension.loseContext(); },
            restoreContext() { return extension.restoreContext(); },
          });
          return extensions.get(extension);
        };
        const location = gl.getUniformLocation.bind(gl), timeLocations = new Set();
        gl.getUniformLocation = (program, name) => {
          const result = location(program, name); if(name === "uTime") timeLocations.add(result); return result;
        };
        const uniform = gl.uniform1f.bind(gl);
        gl.uniform1f = (target, value) => { if(timeLocations.has(target)) record.phase = value; return uniform(target, value); };
        this.addEventListener("webglcontextlost", () => window.__flowLedger.losses++);
        this.addEventListener("webglcontextrestored", () => { record.generation++; window.__flowLedger.restores++; });
        window.__flowLedger.peak = Math.max(window.__flowLedger.peak, records.filter(entry => entry.gl && !entry.gl.isContextLost()).length);
        return gl;
      };
      window.__observeFlowNativeEvents = () => {
      for (const kind of ["pagehide", "pageshow"]) window.addEventListener(kind, event => {
        const persisted = event.persisted;
        queueMicrotask(() => {
          const observation = {
          kind, persisted, timeOrigin: performance.timeOrigin,
          allocations: window.__flowLedger.allocations,
          nativeDisposals: window.__flowLedger.nativeDisposals,
          running: document.querySelectorAll('[data-advertising-flow-state="running"]').length,
          phases: records.map(record => record.phase),
          };
          const key = "qa-flow-native-observations";
          const saved = JSON.parse(sessionStorage.getItem(key) || "[]");
          saved.push(observation); sessionStorage.setItem(key, JSON.stringify(saved.slice(-20)));
          console.debug("FLOW_NATIVE_EVENT " + JSON.stringify(observation));
        });
      });
      };
    });

  const page = await context.newPage();
  const nativeEvents = [];
  page.on("console", msg => {
    if (msg.text().startsWith("FLOW_NATIVE_EVENT ")) nativeEvents.push(JSON.parse(msg.text().slice(18)));
  });
  page.on("console", msg => { if (msg.type() === "error" || /too many.*webgl|INVALID_OPERATION/i.test(msg.text())) errors.push(msg.text()); });
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.goto(base + "/vi/advertising-products/", { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.querySelector("[data-advertising-cta-skeleton]")?.dataset.advertisingCtaReady === "true");
    await page.locator("[data-advertising-cta-frame]").first().evaluate(node => {
      const target = window.scrollY + node.getBoundingClientRect().top - 120;
      if (!window.TruongThinhMotion?.setLogicalScroll?.(target)) window.scrollTo(0, target);
    });
    await page.waitForFunction(() => {
      const visible = [...document.querySelectorAll("[data-advertising-cta-frame]")].filter(node => {
        const rect = node.getBoundingClientRect(); return rect.top >= 0 && rect.bottom < innerHeight - 60;
      });
      return visible.length && visible.every(node => getComputedStyle(node).opacity === "1");
    });
    const heightState = () => page.evaluate(() => {
      const skeleton = document.querySelector("[data-advertising-cta-skeleton]");
      const frames = [...document.querySelectorAll("[data-advertising-cta-frame]")];
      const samples = frames.map(node => {
        const rect = node.getBoundingClientRect(), canvas = node.querySelector("canvas");
        return { slot: node.dataset.advertisingCtaSlot, top: Number.parseFloat(node.style.top),
          visible: rect.bottom > 0 && rect.top < innerHeight, opacity: getComputedStyle(node).opacity,
          same: window.__lifecycleFrames?.get(node.dataset.advertisingCtaSlot) === node,
          assignment: [node.dataset.advertisingCtaRatioBand, canvas.dataset.advertisingFlowBatch,
            canvas.dataset.advertisingFlowPreset, canvas.dataset.advertisingFlowAnchorPermutation,
            canvas.dataset.advertisingFlowPhase, canvas.dataset.advertisingFlowDirection] };
      });
      window.__lifecycleFrames = new Map(frames.map(node => [node.dataset.advertisingCtaSlot, node]));
      return { width: document.documentElement.clientWidth, height: innerHeight,
        coordinateHash: skeleton.dataset.advertisingCtaSignature.split(":")[0],
        boundary: Number.parseFloat(skeleton.style.height),
        samples };
    });
    let previousHeight = await heightState();
    const changed = [];
    for (const height of [788, 844, 788, 844, 788]) {
      await page.setViewportSize({ width: 390, height }); await page.waitForTimeout(120);
      const current = await heightState();
      const common = current.samples.filter(sample => previousHeight.samples.some(old => old.slot === sample.slot));
      const removed = previousHeight.samples.filter(old => !current.samples.some(sample => old.slot === sample.slot));
      changed.push({ before: previousHeight, after: current, common, removed });
      await fs.writeFile(output + "/" + engine + "-height.json", JSON.stringify(changed, null, 2));
      assert.equal(current.width, previousHeight.width, "height-only probe retains layout width");
      assert.equal(current.coordinateHash, previousHeight.coordinateHash, "height-only probe retains real grid geometry");
      assert.ok(removed.every(sample => sample.top >= current.boundary), "removed tail slots must lie beyond the new boundary");
      assert.ok(common.length && common.every(sample => sample.same), "every common-needed slot keeps its node");
      const visiblePairs = common.filter(sample => sample.visible
        && previousHeight.samples.find(old => old.slot === sample.slot).visible);
      assert.ok(visiblePairs.length, "height-only probe has common visible pairs");
      for (const sample of common) {
        const old = previousHeight.samples.find(entry => entry.slot === sample.slot);
        assert.deepEqual(sample.assignment, old.assignment, "common slot assignment and deck remain stable");
        if (sample.visible && old.visible) assert.equal(sample.opacity, old.opacity, "common visible slot must not replay entry");
      }
      previousHeight = current;
    }
    const ledger = () => page.evaluate(() => ({
      allocations: window.__flowLedger.allocations, peak: window.__flowLedger.peak,
      losses: window.__flowLedger.losses, restores: window.__flowLedger.restores,
      live: window.__flowLedger.records.filter(entry => entry.gl && !entry.gl.isContextLost()).length,
      running: document.querySelectorAll('[data-advertising-flow-state="running"]').length,
      phase: window.__flowLedger.records.filter(entry => entry.gl && !entry.gl.isContextLost()).map(entry => entry.phase),
    }));
    const portraitLedger = await ledger();
    assert.ok(portraitLedger.live <= 2 && portraitLedger.peak <= 2, "phone budget applies during allocation transitions");
    await page.evaluate(() => window.__observeFlowNativeEvents());
    // Width/orientation changes keep common slots; extra slots still follow geometry.
    await page.setViewportSize({ width: 838, height: 390 }); await page.waitForTimeout(800);
    const orientation = await page.evaluate(() => [...document.querySelectorAll("[data-advertising-cta-frame]")].map(node => ({
      slot: node.dataset.advertisingCtaSlot, common: window.__lifecycleFrames.has(node.dataset.advertisingCtaSlot),
      same: window.__lifecycleFrames.get(node.dataset.advertisingCtaSlot) === node,
    })));
    assert.ok(orientation.filter(frame => frame.common).every(frame => frame.same), "orientation preserves common outer slots");
    assert.ok((await ledger()).peak <= 2, "838px phone landscape still uses at most two contexts");
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(500);
    await page.locator("[data-advertising-cta-frame]").first().evaluate(node => window.scrollTo(0, window.scrollY + node.getBoundingClientRect().top - 120));
    await page.waitForTimeout(700);
    await page.waitForFunction(() => window.__flowLedger.records.some(entry => entry.gl && !entry.gl.isContextLost()
      && Number(getComputedStyle(entry.canvas.closest("[data-advertising-cta-frame]")).opacity) >= 0.999));
    await page.evaluate(() => {
      const record = window.__flowLedger.records.find(entry => entry.gl && !entry.gl.isContextLost()
        && Number(getComputedStyle(entry.canvas.closest("[data-advertising-cta-frame]")).opacity) >= 0.999);
      window.__lossRecord = record;
      window.__lossOuter = record.canvas.closest("[data-advertising-cta-frame]");
      window.__lossSlot = window.__lossOuter.dataset.advertisingCtaSlot;
      window.__lossPhase = record.phase;
      const extension = record.gl.getExtension("WEBGL_lose_context");
      if (!extension) throw Error("WEBGL_lose_context unavailable");
      window.__lossExtension = extension; extension.loseContext();
    });
    await page.waitForFunction(() => window.__lossRecord.gl.isContextLost()
      && window.__lossRecord.canvas.dataset.advertisingFlowBackend === "fallback");
    const lostState = await page.evaluate(() => ({
      background: window.__lossRecord.canvas.style.backgroundImage,
      same: window.__lossOuter === document.querySelector('[data-advertising-cta-slot="' + window.__lossSlot + '"]'),
      opacity: Number(getComputedStyle(window.__lossOuter).opacity),
    }));
    await fs.writeFile(output + "/" + engine + "-loss.json", JSON.stringify(lostState, null, 2));
    assert.ok(lostState.background && lostState.same && lostState.opacity >= 0.999, "loss keeps filled fallback and revealed outer frame");
    await page.waitForTimeout(200);
    await page.evaluate(() => window.__lossExtension.restoreContext());
    await page.waitForFunction(() => !window.__lossRecord.gl.isContextLost()
      && window.__lossRecord.canvas.dataset.advertisingFlowBackend === "webgl");
    assert.equal(await page.evaluate(() => window.__lossOuter === document.querySelector('[data-advertising-cta-slot="' + window.__lossSlot + '"]')), true);
    assert.ok(await page.evaluate(() => window.__lossRecord.generation >= 2), "restored resource generation is new");
    // Separate full exit from toolbar/RO reconciliation; reveal must arm only after true exit.
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => document.querySelectorAll("[data-advertising-cta-frame].is-entry-ready").length), 0);
    await page.locator("[data-advertising-cta-frame]").first().evaluate(node => window.scrollTo(0, window.scrollY + node.getBoundingClientRect().top - 120));
    await page.waitForTimeout(800);
    assert.ok(await page.evaluate(() => document.querySelectorAll("[data-advertising-cta-frame].is-entry-ready").length) > 0);
    await page.emulateMedia({ reducedMotion: "reduce" }); await page.waitForTimeout(250);
    assert.equal((await ledger()).running, 0, "reduced motion has zero running Flow");
    await page.emulateMedia({ reducedMotion: "no-preference" }); await page.waitForTimeout(800);
    // Lost idle contexts occupy budget until their native restoration event.
    await page.evaluate(() => window.scrollTo({top:0,behavior:"instant"}));
    await page.waitForFunction(() => window.__flowLedger.records.every(record => !record.canvas?.isConnected));
    await page.evaluate(() => {
      const record = window.__flowLedger.records.find(record => record.gl && !record.gl.isContextLost());
      window.__idleLossRecord = record;
      window.__idleLossExtension = record.gl.getExtension("WEBGL_lose_context");
      window.__idleLossExtension.loseContext();
    });
    await page.waitForFunction(() => window.__idleLossRecord.gl.isContextLost());
    await page.locator("[data-advertising-cta-frame]").first().evaluate(node => window.scrollTo(0, window.scrollY + node.getBoundingClientRect().top - 120));
    await page.waitForTimeout(750);
    assert.equal((await ledger()).allocations, 2, "lost idle context stays quarantined without allocating a replacement");
    assert.equal(await page.evaluate(() => window.__idleLossRecord.canvas.isConnected), false);
    await page.evaluate(() => window.__idleLossExtension.restoreContext());
    await page.waitForFunction(() => !window.__idleLossRecord.gl.isContextLost());
    await page.waitForTimeout(350);
    assert.equal((await ledger()).allocations, 2, "restored idle canvas becomes reusable without a new context");
    await page.locator("[data-menu-open]").evaluate(node => node.focus({preventScroll:true}));
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.body.classList.contains("menu-open"));
    const parkedMenu = await ledger();
    assert.equal(parkedMenu.running, 0, "menu overlay parks all loops");
    await page.waitForTimeout(350);
    assert.deepEqual((await ledger()).phase, parkedMenu.phase, "parked menu phases do not advance");
    await page.locator("[data-menu-close]").click();
    await page.waitForFunction(() => !document.body.classList.contains("menu-open"));
    await page.waitForTimeout(500);
    const settled = await ledger();
    await page.evaluate(() => {
      delete window.__lifecycleFrames; delete window.__lifecycleInitial;
      delete window.__lossRecord; delete window.__lossOuter; delete window.__lossExtension;
      delete window.__idleLossRecord; delete window.__idleLossExtension;
    });
    const cycles = [];
    for (let cycle = 0; cycle < 20; cycle++) {
      // Real route/filter inputs, plus viewport geometry changes; no controller remount override.
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.waitForFunction(() => window.scrollY === 0);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const category = cycle % 2 ? "all" : "kiosk-posm";
      await page.locator('[data-advertising-filter="' + category + '"]').click();
      await page.waitForTimeout(550);
      await page.setViewportSize({ width: 390, height: cycle % 2 ? 844 : 788 });
      await page.locator("[data-advertising-cta-frame]").first().evaluate(node => window.scrollTo(0, window.scrollY + node.getBoundingClientRect().top - 120));
      await page.waitForTimeout(750);
      const sample = await ledger();
      const appliedCategory = await page.evaluate(() => window.TruongThinhAdvertising.getBrowseState().category);
      cycles.push({ cycle, category, appliedCategory, ...sample });
      assert.equal(appliedCategory, category, "each stress cycle must apply the requested filter");
      assert.ok(sample.live <= 2 && sample.peak <= 2, "twenty filter/resize cycles never increase phone context budget");
    }
    const finalLedger = await ledger();
    assert.ok(finalLedger.live <= settled.live, "settled live contexts do not accumulate");
    assert.ok(finalLedger.allocations <= 2, "phone native allocations plateau at two leased or idle contexts");
    // Barba route exit disposes leases, while the document-owned cache survives.
    const softEntry = await page.evaluate(() => ({seed:window.TruongThinhAdvertising.getBrowseState().seed,timeOrigin:performance.timeOrigin}));
    await page.evaluate(() => window.scrollTo({top:0,behavior:"instant"}));
    await page.waitForFunction(() => scrollY === 0 && document.querySelector('#header-logo').getBoundingClientRect().top >= 0);
    await page.locator('#header-logo').click();
    await page.waitForFunction(() => document.querySelector('[data-barba="container"]')?.dataset.barbaNamespace === "home"
      && location.pathname === "/vi/" && !window.barba.transitions.isRunning);
    assert.equal((await ledger()).running, 0, "non-catalog route has no running Flow");
    await page.goBack({waitUntil:"domcontentloaded"});
    await page.waitForFunction(() => window.TruongThinhAdvertising?.getAdapter?.()
      && document.querySelector('[data-advertising-cta-skeleton]')?.dataset.advertisingCtaReady === "true");
    assert.equal(await page.evaluate(() => performance.timeOrigin), softEntry.timeOrigin, "Barba return uses the same document cache");
    assert.equal(await page.evaluate(() => window.TruongThinhAdvertising.getBrowseState().seed), softEntry.seed);
    assert.equal((await ledger()).allocations, 2, "controller remount reuses the two native contexts");
    await fs.writeFile(output + "/" + engine + "-ledger.json", JSON.stringify({ portraitLedger, orientation, settled, cycles, finalLedger }, null, 2));


    await page.screenshot({ path: output + "/" + engine + ".png" });
    results.push({ engine, version: browser.version(), heightOnly: changed, errors });
    assert.deepEqual(errors, [], "no renderer/runtime error");
    const entry = await page.evaluate(() => ({seed:window.TruongThinhAdvertising.getBrowseState().seed, timeOrigin:performance.timeOrigin,nativeDisposals:window.__flowLedger.nativeDisposals}));
    await page.goto(base + "/vi/", {waitUntil:"networkidle"});
    await page.goBack({waitUntil:"domcontentloaded"});
    await page.waitForFunction(() => window.TruongThinhAdvertising?.getAdapter?.()
      && document.querySelector('[data-advertising-cta-skeleton]')?.dataset.advertisingCtaReady === "true");
    const returned = await page.evaluate(() => ({seed:window.TruongThinhAdvertising.getBrowseState().seed, timeOrigin:performance.timeOrigin}));
    nativeEvents.push(...await page.evaluate(() => JSON.parse(sessionStorage.getItem("qa-flow-native-observations") || "[]")));
    await fs.writeFile(output + "/" + engine + "-native-events.json", JSON.stringify({entry,returned,nativeEvents},null,2));
    assert.equal(returned.seed, entry.seed, "native route exit and Back preserve the random entry");
    const hide = nativeEvents.find(event => event.kind === "pagehide" && event.timeOrigin === entry.timeOrigin);
    assert.ok(hide, "native pagehide event was observed");
    if (hide.persisted) {
      assert.equal(hide.running, 0, "BFCache parks all renderer loops");
      assert.equal(hide.nativeDisposals, entry.nativeDisposals, "BFCache retains native contexts");
      const shown = nativeEvents.find(event => event.kind === "pageshow" && event.persisted && event.timeOrigin === entry.timeOrigin);
      assert.ok(shown, "BFCache resumes the same document through a native pageshow");
      assert.deepEqual(shown.phases, hide.phases, "BFCache retains the parked phase before the next paint");
      assert.equal(returned.timeOrigin, entry.timeOrigin);
    } else {
      assert.equal(hide.nativeDisposals - entry.nativeDisposals, 2, "uncached document exit disposes both native contexts once");
      assert.notEqual(returned.timeOrigin, entry.timeOrigin, "uncached Back reconstructs the document");
    }
    await fs.writeFile(output + "/" + engine + "-native-events.json", JSON.stringify({entry,returned,nativeEvents},null,2));
    assert.deepEqual(errors, [], "native lifecycle introduces no runtime errors");
  } finally {
    await fs.writeFile(output + "/results.json", JSON.stringify(results.concat([{ engine, errors }]), null, 2));
    await browser.close();
  }
}
console.log("PASS skeleton lifecycle " + results.length + " engines");
