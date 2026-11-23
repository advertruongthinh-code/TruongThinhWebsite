// Click: text tweens to bold and the mark flips to CMYK; destination mount: text tweens and the mark flips to the destination page color; no minimum
// covered time; the logo cluster stays visible above the veil (docs/specs/logo-route-crossfade.md R1-R7).
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
// Espacio timing (owner 2026-11-15): leaving a white header, text tweens to bold and the mark flips to CMYK at the click; when the destination page mounts
// (veil still covering) text tweens to the destination tone and the mark flips to the destination color; no minimum covered time.
// texts: the colors the text settles on, in order (tween frames in between are allowed).
const scenarios = [
  { name: "home to residential", from: "/", link: 'a[href="/residential/"]', texts: [white, ink, white], flip: { front: white, back: cyan, rate: 1 }, final: "is-brand-inverse" },
  { name: "home to advertising", from: "/", link: 'a[href="/advertising-products/"]', texts: [white, ink], flip: { front: white, back: cyan, rate: 1 }, final: "is-brand-color" },
  { name: "advertising to home", from: "/advertising-products/", link: 'a[href="/"]', texts: [ink, white], flip: { front: white, back: cyan, rate: -1 }, final: "is-brand-inverse" },
  { name: "advertising to projects", from: "/advertising-products/", link: 'a[href="/projects/"]', texts: [ink], flip: null, final: "is-brand-color" },
];
// One frame: the GSAP callback may run before or after the recorder's read within the same frame.
const frame = 40;
// Text tween: 0.3s expo.out, so a color reached counts from its first frame; the tween toward it starts one frame earlier.
const settledColors = (texts) => texts.map(({ color }) => color).filter((color) => color === white || color === ink)
  .filter((color, index, list) => color !== list[index - 1]);

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
      assert.deepEqual(settledColors(record.texts), scenario.texts, `${label}: text settles on these colors ${dump}`);
      // R1: leaving a white header, the text starts turning bold at the click and is bold before the veil fully covers.
      if (scenario.texts[0] === white) {
        assert.ok(record.texts[1].at <= record.click + 2 * frame, `${label}: text starts turning bold at the click ${dump}`);
        const inkAt = record.texts.find(({ color }) => color === ink).at;
        assert.ok(inkAt <= record.veilClosed + frame, `${label}: text is bold before the veil covers ${dump}`);
      }
      // R2: the text turns to the destination tone once the destination mounts under the covering veil, before the veil opens.
      const lastInk = record.texts.findLastIndex(({ color }) => color === ink);
      if (scenario.texts.at(-1) === white) {
        const towardWhite = record.texts[lastInk + 1];
        assert.ok(towardWhite.at >= record.veilClosed - frame && towardWhite.at <= record.veilOpening + frame, `${label}: text turns to the destination tone under the veil ${dump}`);
      }
      // No minimum covered time (owner 2026-11-15): the veil opens soon after the destination mounts.
      if (scenario.texts.at(-1) === white) {
        assert.ok(record.veilOpening - record.texts[lastInk + 1].at < 400, `${label}: the veil opens right after the destination mounts ${dump}`);
      }
      if (scenario.flip) {
        assert.ok(record.flips.length >= 1, `${label}: mark flips ${dump}`);
        const { at, ...flip } = record.flips[0];
        assert.deepEqual(flip, scenario.flip, `${label}: first flip ${dump}`);
        // Leaving a white header the CMYK flip starts at the click; entering from a CMYK mark it starts at destination mount.
        if (scenario.texts[0] === white) assert.ok(at <= record.click + 2 * frame, `${label}: CMYK flip starts at the click ${dump}`);
        else assert.ok(at >= record.veilClosed - frame && at <= record.veilOpening + frame, `${label}: flip starts at destination mount ${dump}`);
      } else {
        assert.equal(record.flips.length, 0, `${label}: white hero to white hero keeps the CMYK mark ${dump}`);
      }
      // R7: the logo cluster is always visible above the veil; mark, text, nav, hamburger have no opacity of their own.
      assert.equal(record.logoMin, 1, `${label}: logo never fades ${dump}`);
      assert.equal(record.partsBelowOne, 0, `${label}: mark, text, nav, hamburger keep their own opacity`);
      console.log(`PASS ${label}: Espacio header timing, mark flips, no fill tween`);
      await context.close();
    }
  }

  // R5: click a link while the mark is mid-flip (scroll just changed color); at click the mark is unchanged so the running flip continues.
  {
    const { context, page } = await open({ width: 1440, height: 900 }, "no-preference", "/");
    await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(400));
    await page.waitForFunction(() => document.querySelector("#header-logo .brand-lockup__mark-flip"));
    const state = await page.evaluate(() => {
      const root = document.querySelector("#header-logo .brand-lockup__mark-flip");
      document.querySelector('a[href="/residential/"]').click();
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
    const { context, page } = await open({ width: 412, height: 915 }, "reduce", "/");
    const record = await go(page, 'a[href="/residential/"]');
    assert.deepEqual({ rises: record.rises, tweens: record.tweens, final: record.final }, { rises: 0, tweens: 0, final: "is-brand-inverse" }, "reduced motion");
    assert.equal(record.logoMin, 1, "reduced motion: logo never fades");
    console.log("PASS reduced motion: colour changes at once, logo stays");
    await context.close();
  }
} finally {
  await browser.close();
}
