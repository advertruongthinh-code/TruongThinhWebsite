// brand.md Motion: the mark changes color by flipping each strip around a vertical axis through the strip, parallel to the triangle's left edge;
// white to CMYK cyan first, CMYK to white runs the same sequence in reverse so black goes first; only transform and opacity so the GPU runs it;
// reversing mid-flip rewinds from where it stopped (owner 2026-11-09).
// Collapse and expand: logo, navbar and background run together at 0.3s expo.out, the mark flips right at the start. Collapse: background, border and text change
// immediately, then the background shrinks with the logo. Expand: white background and bold text hold and grow with the logo, switching only after 0.3s; no fade (owner 2026-11-09).
// Run: pnpm dev, then BASE_URL=http://127.0.0.1:8787 node tests/site/brand-mark-flip.e2e.mjs
import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const base = process.env.BASE_URL || "http://127.0.0.1:8787";
// DOM: black, yellow, magenta, cyan.
const cmyk = ["rgb(43, 42, 41)", "rgb(255, 237, 0)", "rgb(229, 9, 127)", "rgb(0, 160, 227)"];
const white = cmyk.map(() => "rgb(255, 255, 255)");
// Records when the header changes collapse state and when the flip layer is inserted, by performance.now().
const watchPhases = () => {
  const header = document.querySelector("[data-site-header]");
  const logo = document.querySelector("#header-logo");
  const phases = { collapse: [], flip: [], lead: [], late: [], surface: [] };
  // Background and border are drawn on ::before so they shrink in step with the FLIP.
  const readSurface = () => ({
    background: getComputedStyle(header, "::before").backgroundColor,
    border: getComputedStyle(header, "::before").borderBottomStyle === "none" ? "none" : getComputedStyle(header, "::before").borderBottomColor,
    text: getComputedStyle(header.querySelector(".menu-button")).color,
  });
  let collapsed = header.classList.contains("is-collapsed");
  new MutationObserver(() => {
    if (header.classList.contains("is-collapsed") === collapsed) return;
    collapsed = !collapsed;
    phases.collapse.push(performance.now());
    // Sample mid-beat 1, measured inside the page to avoid Playwright latency skew.
    setTimeout(() => phases.lead.push({
      ...readSurface(),
      flip: Boolean(document.querySelector(".brand-lockup__mark-flip")),
      // Background shrinks with the logo: ::before is still longer by some px mid-beat.
      shift: Number.parseFloat(getComputedStyle(header).getPropertyValue("--header-surface-shift")) || 0,
      fills: [...document.querySelectorAll("#header-logo .brand-lockup__mark path")].map((item) => getComputedStyle(item).fill),
    }), 40);
    // Near the end of the 0.3s beat: gap above the logo and below the logo to the bottom of the background (including the 1px border).
    setTimeout(() => {
      const box = header.getBoundingClientRect();
      const logoBox = logo.getBoundingClientRect();
      const before = getComputedStyle(header, "::before");
      const bottom = box.bottom - Number.parseFloat(before.bottom) + new DOMMatrixReadOnly(before.transform).m42;
      phases.late.push({ ...readSurface(), gaps: [logoBox.top - box.top, bottom - logoBox.bottom] });
    }, 200);
  }).observe(header, { attributes: true, attributeFilter: ["class"] });
  new MutationObserver((records) => {
    if (records.some((record) => [...record.addedNodes].some((node) => node.classList?.contains("brand-lockup__mark-flip")))) {
      phases.flip.push(performance.now());
      phases.surface.push(readSurface());
    }
  }).observe(logo, { childList: true });
  window.__phases = phases;
};
// Collapse and expand: the flip starts immediately, in the same frame the header changes class and background (owner 2026-11-09).
const flipLead = () => {
  const { collapse, flip } = window.__phases;
  return flip.at(-1) - collapse.at(-1);
};

// Pause every animation of the flip layer at `at` ms, then read each strip's state.
const readFlip = (at) => {
  const root = document.querySelector("#header-logo .brand-lockup__mark-flip");
  if (!root) return null;
  const bands = [...root.children];
  bands.forEach((band) => band.querySelectorAll(":scope > span").forEach((face) => face.getAnimations().forEach((animation) => {
    animation.pause();
    animation.currentTime = at;
  })));
  const turned = (face) => Math.abs(new DOMMatrixReadOnly(getComputedStyle(face).transform).m11 - 1) > 1e-7;
  return {
    front: bands.map((band) => band.children[0].dataset.fill),
    back: bands.map((band) => band.children[1].dataset.fill),
    frontTurned: bands.map((band) => turned(band.children[0])),
    backShown: bands.map((band) => Number(getComputedStyle(band.children[1]).opacity) > 0),
    backTurned: bands.map((band) => turned(band.children[1])),
    props: [...root.querySelectorAll("span")].flatMap((face) => face.getAnimations())
      .flatMap((animation) => animation.effect.getKeyframes().flatMap((frame) => Object.keys(frame)))
      .filter((key) => !["offset", "easing", "composite", "computedOffset"].includes(key)),
    markHidden: getComputedStyle(document.querySelector("#header-logo .brand-lockup__mark")).visibility === "hidden",
  };
};
// Each strip's axis is computed independently from its path: midpoint of the strip's foot segment, converted to px in the flip layer's frame.
const readAxes = () => {
  const mark = document.querySelector("#header-logo .brand-lockup__mark");
  const box = mark.getBBox();
  const root = document.querySelector("#header-logo .brand-lockup__mark-flip");
  const width = root.offsetWidth;
  const height = root.offsetHeight;
  return [...mark.querySelectorAll("path")].map((item, index) => {
    const length = item.getTotalLength();
    const points = Array.from({ length: 401 }, (_, step) => item.getPointAtLength((length * step) / 400));
    const foot = Math.max(...points.map((point) => point.y));
    const xs = points.filter((point) => foot - point.y < 0.5).map((point) => point.x);
    const axis = [((Math.min(...xs) + Math.max(...xs)) / 2 - box.x) / box.width * width, (foot - box.y) / box.height * height];
    const face = root.children[index].children[0];
    const origin = getComputedStyle(face).transformOrigin.split(" ").map(Number.parseFloat);
    const perspective = getComputedStyle(root.children[index]).perspectiveOrigin.split(" ").map(Number.parseFloat);
    return { axis, origin, perspective };
  });
};

try {
  for (const [reducedMotion, width, height] of [["no-preference", 390, 844], ["no-preference", 1440, 900], ["reduce", 390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
    const page = await context.newPage();
    const label = `${width}px ${reducedMotion}`;
    await page.goto(`${base}/vi/`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.evaluate(watchPhases);
    await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(400));
    await page.waitForFunction(() => document.querySelector("[data-site-header]").classList.contains("is-brand-color"));
    if (reducedMotion === "reduce") {
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const state = await page.evaluate(() => ({
        flip: Boolean(document.querySelector(".brand-lockup__mark-flip")),
        fills: [...document.querySelectorAll("#header-logo .brand-lockup__mark path")].map((item) => getComputedStyle(item).fill),
      }));
      assert.deepEqual(state, { flip: false, fills: cmyk }, `${label}: colour changes at once`);
      console.log(`PASS ${label}: no flip`);
      await context.close();
      continue;
    }
    // Start of the beat: white background, border and bold text change in the same frame the header collapses, mark flips immediately, no fade.
    await page.waitForFunction(() => window.__phases.lead.length);
    const lead = await page.evaluate(() => window.__phases.lead[0]);
    assert.equal(lead.flip, true, `${label}: mark flips while logo and navbar move`);
    assert.deepEqual([lead.background, lead.border, lead.text], ["rgb(255, 255, 255)", "rgb(211, 211, 211)", "rgb(47, 47, 47)"], `${label}: surface and text switch as the header beat starts`);
    assert.ok(lead.shift > 0, `${label}: background shrinks with the logo and navbar ${JSON.stringify(lead)}`);
    const collapseLead = await page.evaluate(flipLead);
    assert.ok(collapseLead >= -1 && collapseLead < 20, `${label}: flip starts with the collapse (${collapseLead.toFixed(0)}ms)`);
    assert.deepEqual(await page.evaluate(() => window.__phases.surface.at(-1)), { background: "rgb(255, 255, 255)", border: "rgb(211, 211, 211)", text: "rgb(47, 47, 47)" }, `${label}: background, border and text switch at once with the flip`);
    const axes = await page.evaluate(readAxes);
    axes.forEach(({ axis, origin, perspective }, index) => {
      [origin, perspective].forEach((value) => assert.ok(Math.hypot(value[0] - axis[0], value[1] - axis[1]) < 0.75,
        `${label}: band ${index} turns on the axis through its foot midpoint ${JSON.stringify({ axis, origin, perspective })}`));
    });
    assert.ok(new Set(axes.map(({ origin }) => origin[0].toFixed(1))).size === 4, `${label}: every band has its own axis`);

    const start = await page.evaluate(readFlip, 0);
    assert.deepEqual(start.front, white, `${label}: white face shows first`);
    assert.deepEqual(start.back, cmyk, `${label}: CMYK face comes in`);
    assert.ok(start.markHidden, `${label}: inline mark hides while the flip layer runs`);
    // Strip face shading (owner 2026-11-09): one shadow layer per face, darkest when the face turns edge-on, opacity only.
    const shades = await page.evaluate(() => [...document.querySelectorAll("#header-logo .brand-lockup__mark-flip > span > span > span")]
      .map((layer) => layer.getAnimations()[0]?.effect.getKeyframes().map((frame) => frame.opacity)));
    assert.deepEqual(shades, Array.from({ length: 4 }, () => [["0", "0.5"], ["0.5", "0"]]).flat(), `${label}: every face darkens as it turns edge-on`);
    assert.deepEqual([...new Set(start.props)].sort(), ["opacity", "transform"], `${label}: only compositor properties animate`);
    // Cyan flips at 0ms, magenta 80ms, yellow 160ms, black 240ms.
    const early = await page.evaluate(readFlip, 150);
    assert.deepEqual(early.frontTurned, [false, false, true, true], `${label}: cyan and magenta turn first ${JSON.stringify(early)}`);
    const done = await page.evaluate(readFlip, 700);
    assert.deepEqual(done.backShown, [true, true, true, true], `${label}: every CMYK face shows by 0.7s`);
    await page.evaluate(() => document.querySelectorAll("#header-logo .brand-lockup__mark-flip span")
      .forEach((face) => face.getAnimations().forEach((animation) => animation.finish())));
    await page.waitForFunction(() => !document.querySelector(".brand-lockup__mark-flip"));
    const after = await page.evaluate(() => ({
      hidden: getComputedStyle(document.querySelector("#header-logo .brand-lockup__mark")).visibility,
      fills: [...document.querySelectorAll("#header-logo .brand-lockup__mark path")].map((item) => getComputedStyle(item).fill),
    }));
    assert.deepEqual(after, { hidden: "visible", fills: cmyk }, `${label}: flip layer leaves the CMYK mark`);

    // Return direction: flip sequence runs in reverse, black first; then reversing mid-flip rewinds to CMYK.
    await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(0));
    await page.waitForFunction(() => document.querySelector("#header-logo .brand-lockup__mark-flip"));
    const expandLead = await page.evaluate(flipLead);
    // Expand (owner 2026-11-09): mark flips immediately; white background, border and bold text hold and grow with the logo, navbar 0.3s, only at the end of the beat
    // does it switch once to the transparent background and white text, no fade.
    await page.waitForFunction(() => window.__phases.lead.length >= 2);
    const expandSample = await page.evaluate(() => window.__phases.lead.at(-1));
    assert.deepEqual([expandSample.background, expandSample.text], ["rgb(255, 255, 255)", "rgb(47, 47, 47)"], `${label}: white background and ink text hold while the header grows`);
    assert.ok(expandLead >= -1 && expandLead < 20, `${label}: flip back to white starts with the expand (${expandLead.toFixed(0)}ms)`);
    assert.deepEqual(await page.evaluate(() => window.__phases.surface.at(-1)), { background: "rgb(255, 255, 255)", border: "rgb(211, 211, 211)", text: "rgb(47, 47, 47)" }, `${label}: surface still white when the flip back starts`);
    // CMYK to white is the white to CMYK sequence run in reverse from the end: same faces, every animation rate -1, black leaves first.
    const back = await page.evaluate(async () => {
      const root = document.querySelector("#header-logo .brand-lockup__mark-flip");
      // reverse() while the animation is pending only changes playbackRate once the animation is ready; on a busy machine an early read gives rate 1.
      await Promise.all([...root.querySelectorAll("span")].flatMap((face) => face.getAnimations()).map((animation) => animation.ready));
      return {
        faces: [...root.children].map((band) => [band.children[0].dataset.fill, band.children[1].dataset.fill]),
        rates: [...new Set([...root.querySelectorAll("span")].flatMap((face) => face.getAnimations()).map((animation) => animation.playbackRate))],
      };
    });
    assert.deepEqual(back, { faces: white.map((color, index) => [color, cmyk[index]]), rates: [-1] }, `${label}: CMYK to white plays the same flip backwards`);
    // Reversing mid-flip (owner 2026-11-09): rewind immediately from where it stopped, same flip layer, no new sequence built.
    await page.evaluate(() => { window.__flipRoot = document.querySelector("#header-logo .brand-lockup__mark-flip"); });
    await page.waitForTimeout(150);
    await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(400));
    await page.waitForFunction(() => document.querySelector("[data-site-header]").classList.contains("is-brand-color"));
    await page.waitForTimeout(30);
    const rewinding = await page.evaluate(() => {
      const root = document.querySelector("#header-logo .brand-lockup__mark-flip");
      const animations = [...(root?.querySelectorAll("span") || [])].flatMap((face) => face.getAnimations());
      return {
        same: root === window.__flipRoot,
        paused: animations.some((animation) => animation.playState === "paused"),
        rates: [...new Set(animations.map((animation) => animation.playbackRate))],
      };
    });
    assert.deepEqual(rewinding, { same: true, paused: false, rates: [1] }, `${label}: the running flip rewinds to CMYK from where it is`);
    await page.waitForFunction(() => !document.querySelector(".brand-lockup__mark-flip"), null, { timeout: 1000 });
    const final = await page.evaluate(() => ({
      flips: window.__phases.flip.length,
      fills: [...document.querySelectorAll("#header-logo .brand-lockup__mark path")].map((item) => getComputedStyle(item).fill),
    }));
    assert.deepEqual(final.fills, cmyk, `${label}: reversal settles on CMYK`);
    assert.equal(final.flips, 2, `${label}: rewinding builds no second flip layer`);

    // Reversing right after collapse: the flip just started rewinds back to white, no new sequence built.
    await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(0));
    await page.waitForFunction(() => document.querySelector("#header-logo .brand-lockup__mark-flip"));
    await page.waitForFunction(() => !document.querySelector(".brand-lockup__mark-flip"), null, { timeout: 2000 });
    // Largest background size (owner 2026-11-09): the largest logo is equidistant from the top and bottom edges of the background, off by at most the 1px border.
    const late = await page.evaluate(() => window.__phases.late.at(-1));
    assert.equal(late.background, "rgb(255, 255, 255)", `${label}: background still white near the end of the expand`);
    assert.ok(Math.abs(late.gaps[0] - late.gaps[1]) <= 1.5, `${label}: largest logo sits evenly between the background edges ${JSON.stringify(late.gaps)}`);
    const expanded = await page.evaluate(() => {
      const header = document.querySelector("[data-site-header]");
      return [getComputedStyle(header, "::before").backgroundColor, getComputedStyle(header.querySelector(".menu-button")).color];
    });
    assert.deepEqual(expanded, ["rgba(0, 0, 0, 0)", "rgb(255, 255, 255)"], `${label}: background clears and text turns white once the 0.3s beat ends`);
    const flipsBefore = await page.evaluate(() => window.__phases.flip.length);
    await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(400));
    await page.waitForTimeout(40);
    await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(0));
    await page.waitForTimeout(800);
    const cancelled = await page.evaluate(() => ({
      flips: window.__phases.flip.length,
      fills: [...document.querySelectorAll("#header-logo .brand-lockup__mark path")].map((item) => getComputedStyle(item).fill),
    }));
    assert.deepEqual(cancelled, { flips: flipsBefore + 1, fills: white }, `${label}: turning back right after collapsing rewinds the one flip home`);
    // Returning to white, black flips first: 150ms after the reverse run (mark 680 - 150), black and yellow have left the CMYK face, cyan has not.
    await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(400));
    await page.waitForFunction(() => document.querySelector("#header-logo .brand-lockup__mark-flip"));
    await page.waitForFunction(() => !document.querySelector(".brand-lockup__mark-flip"), null, { timeout: 2000 });
    await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(0));
    await page.waitForFunction(() => document.querySelector("#header-logo .brand-lockup__mark-flip"));
    const leaving = await page.evaluate(readFlip, 530);
    assert.deepEqual(leaving.backTurned, [true, true, false, false], `${label}: black leaves CMYK first on the way to white ${JSON.stringify(leaving)}`);
    console.log(`PASS ${label}: per-band axes, cyan first to CMYK, black first to white, compositor only, interrupted flip rewinds`);
    await context.close();
  }
} finally {
  await browser.close();
}
