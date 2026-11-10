// Veil fully covering: text switches to bold immediately, the mark flips to CMYK; veil opening: text switches immediately, the mark flips to the destination page color; the logo cluster
// stays visible above the veil (docs/specs/logo-route-crossfade.md R1-R7).
// Run: pnpm dev, then BASE_URL=http://127.0.0.1:8787 node tests/site/logo-route-crossfade.e2e.mjs
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const origin = process.env.BASE_URL || "http://127.0.0.1:8787";
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });

// Records every frame: clip-path animation (old grow style, must always be 0) and inline fill tween on the mark path (must be 0), logo
// text color, new mark flip layer, veil opacity, logo cluster opacity, own opacity of mark, text, nav, hamburger.
const startRecorder = (selector) => {
  const t0 = performance.now();
  const header = document.querySelector("[data-site-header]");
  const veil = document.querySelector(".route-veil");
  const logo = document.querySelector("#header-logo");
  const parts = [...logo.querySelectorAll(".brand-lockup, .brand-lockup__mark, .brand-lockup__title, .brand-lockup__subtitle"),
    ...header.querySelectorAll(".desktop-nav, .menu-button")];
  const record = { markUnderFlip: 0, rises: 0, tweens: 0, texts: [], flips: [], veilClosed: undefined, veilOpening: undefined, logoMin: 1, partsBelowOne: 0 };
  const seen = new WeakSet();
  let root;
  const tick = () => {
    const now = Math.round(performance.now() - t0);
    const paths = [...document.querySelectorAll("#header-logo .brand-lockup__mark path")];
    paths.forEach((item) =>
      item.getAnimations().forEach((animation) => {
        if (seen.has(animation)) return;
        seen.add(animation);
        if ("clipPath" in animation.effect.getKeyframes()[0]) record.rises += 1;
      }));
    if (paths.some((item) => item.style.fill)) record.tweens += 1;
    const text = getComputedStyle(logo).color;
    if (text !== record.texts.at(-1)?.color) record.texts.push({ at: now, color: text });
    const nextRoot = document.querySelector("#header-logo .brand-lockup__mark-flip");
    // reverse() while the animation is still pending only changes playbackRate once it stops pending: read the direction at that moment.
    const last = record.flips.at(-1);
    const running = nextRoot === root && root?.lastElementChild.children[0].getAnimations()[0];
    if (last && last.rate === undefined && running && !running.pending) last.rate = running.playbackRate;
    if (nextRoot && nextRoot !== root) {
      const band = nextRoot.lastElementChild;
      record.flips.push({ at: now, front: band.children[0].dataset.fill, back: band.children[1].dataset.fill, rate: undefined });
    }
    root = nextRoot;
    // While the flip layer runs the original mark must be hidden; the destination page HTML mounted under the veil must not remove its hide style, otherwise
    // the original CMYK mark leaks a faint colored edge around the white face (owner 2026-11-09).
    if (root && getComputedStyle(logo.querySelector(".brand-lockup__mark")).visibility !== "hidden") record.markUnderFlip += 1;
    const opacity = Number(getComputedStyle(veil).opacity);
    record.logoMin = Math.min(record.logoMin, Number(getComputedStyle(logo).opacity));
    record.partsBelowOne += parts.filter((part) => Number(getComputedStyle(part).opacity) < 1).length;
    if (opacity === 1 && record.veilClosed === undefined) record.veilClosed = now;
    if (opacity < 1 && record.veilClosed !== undefined && record.veilOpening === undefined) record.veilOpening = now;
    if (now < 5000) requestAnimationFrame(tick);
  };
  tick();
  window.__logoRecord = record;
  document.querySelector(selector).click();
  record.click = Math.round(performance.now() - t0);
};
const readRecord = (page) => page.evaluate(() => ({
  ...window.__logoRecord,
  final: [...document.querySelector("[data-site-header]").classList].find((name) => name.startsWith("is-brand-")),
}));
const settle = (page) => page.waitForFunction(() =>
  !document.body.classList.contains("is-transitioning") && !document.documentElement.classList.contains("route-enter"));
const open = async (viewport, reducedMotion, route) => {
  const context = await browser.newContext({ viewport, reducedMotion });
  const page = await context.newPage();
  await page.goto(`${origin}${route}`, { waitUntil: "load" });
  await settle(page);
  await page.waitForTimeout(1500);
  return { context, page };
};
// Click via script so links in the menu (hidden on phone) also go through Barba like a real click.
const go = async (page, selector) => {
  await page.evaluate(startRecorder, selector);
  await page.waitForTimeout(400);
  await settle(page);
  await page.waitForTimeout(1200);
  return readRecord(page);
};

const white = "rgb(255, 255, 255)";
const ink = "rgb(47, 47, 47)";
const cyan = "rgb(0, 160, 227)";
// On the veil (owner 2026-11-09): at click, text and mark keep their color; when the veil fully covers, text switches to bold immediately and a white mark
// flips to CMYK; when the veil starts opening, text switches immediately to the destination tone and the mark flips to the destination color. No color tween.
const scenarios = [
  { name: "home to residential", from: "/vi/", link: 'a[href="/vi/residential/"]', texts: [white, ink, white], flip: { front: white, back: cyan, rate: 1 }, final: "is-brand-inverse" },
  { name: "home to advertising", from: "/vi/", link: 'a[href="/vi/advertising-products/"]', texts: [white, ink], flip: { front: white, back: cyan, rate: 1 }, final: "is-brand-color" },
  { name: "advertising to home", from: "/vi/advertising-products/", link: 'a[href="/vi/"]', texts: [ink, white], flip: { front: white, back: cyan, rate: -1 }, final: "is-brand-inverse" },
];
// One frame: the GSAP callback at full veil coverage may run before or after the recorder's read within the same frame.
const frame = 40;

try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 412, height: 915 }]) {
    for (const scenario of scenarios) {
      const label = `${viewport.width}px ${scenario.name}`;
      const { context, page } = await open(viewport, "no-preference", scenario.from);
      const record = await go(page, scenario.link);
      const dump = JSON.stringify(record);
      assert.equal(record.rises, 0, `${label}: no rising bands during the route ${dump}`);
      assert.equal(record.tweens, 0, `${label}: mark never tweens its fill ${dump}`);
      assert.equal(record.markUnderFlip, 0, `${label}: original mark stays hidden under the flip layer ${dump}`);
      assert.equal(record.final, scenario.final, `${label}: final mark colour`);
      // Text switches immediately, no tween: only these exact colors, no intermediate color.
      assert.deepEqual(record.texts.map(({ color }) => color), scenario.texts, `${label}: text switches without a tween ${dump}`);
      const toInk = record.texts.find(({ color }) => color === ink);
      if (scenario.texts[0] !== ink) assert.ok(toInk.at >= record.veilClosed - frame, `${label}: text turns ink once the veil covers ${dump}`);
      const toDestination = record.texts.find(({ color }, index) => index && color !== ink);
      if (toDestination) {
        assert.ok(toDestination.at >= record.veilClosed && toDestination.at <= record.veilOpening, `${label}: text turns to the destination tone as the veil starts to open ${dump}`);
      }
      // Veil stays fully covering at least 1s (owner 2026-11-09) even if the destination page loads instantly, so the navbar does not flicker.
      assert.ok(record.veilOpening - record.veilClosed >= 1000 - frame, `${label}: veil stays covered for the minimum hold ${dump}`);
      // The mark flips (no tween) from full veil coverage or from veil opening start, not from the click.
      assert.ok(record.flips.length >= 1, `${label}: mark flips ${dump}`);
      const { at, ...flip } = record.flips[0];
      assert.deepEqual(flip, scenario.flip, `${label}: first flip ${dump}`);
      assert.ok(at >= record.veilClosed - frame, `${label}: first flip waits for the full veil ${dump}`);
      // R7: the logo cluster is always visible above the veil; mark, text, nav, hamburger have no opacity of their own.
      assert.equal(record.logoMin, 1, `${label}: logo never fades ${dump}`);
      assert.equal(record.partsBelowOne, 0, `${label}: mark, text, nav, hamburger keep their own opacity`);
      console.log(`PASS ${label}: text switches on the full veil, mark flips, no colour tween`);
      await context.close();
    }
  }

  // R5: click a link while the mark is mid-flip (scroll just changed color); at click the mark is unchanged so the running flip continues.
  {
    const { context, page } = await open({ width: 1440, height: 900 }, "no-preference", "/vi/");
    await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(400));
    await page.waitForFunction(() => document.querySelector("#header-logo .brand-lockup__mark-flip"));
    const state = await page.evaluate(() => {
      const root = document.querySelector("#header-logo .brand-lockup__mark-flip");
      document.querySelector('a[href="/vi/residential/"]').click();
      const after = document.querySelector("#header-logo .brand-lockup__mark-flip");
      return {
        same: after === root,
        running: Boolean(after?.getAnimations({ subtree: true }).some((animation) => animation.playState === "running")),
        tweening: [...document.querySelectorAll("#header-logo .brand-lockup__mark path")].some((item) => item.style.fill),
      };
    });
    assert.deepEqual(state, { same: true, running: true, tweening: false }, "mid-flip: the running flip keeps going at the click");
    await settle(page);
    console.log("PASS mid-flip click: flip keeps running, no colour tween");
    await context.close();
  }

  // R6: reduced motion switches immediately, no color tween, no grow.
  {
    const { context, page } = await open({ width: 412, height: 915 }, "reduce", "/vi/");
    const record = await go(page, 'a[href="/vi/residential/"]');
    assert.deepEqual({ rises: record.rises, tweens: record.tweens, final: record.final }, { rises: 0, tweens: 0, final: "is-brand-inverse" }, "reduced motion");
    assert.equal(record.logoMin, 1, "reduced motion: logo never fades");
    console.log("PASS reduced motion: colour changes at once, logo stays");
    await context.close();
  }
} finally {
  await browser.close();
}
