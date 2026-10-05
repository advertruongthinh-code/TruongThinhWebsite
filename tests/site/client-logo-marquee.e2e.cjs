#!/usr/bin/env node
"use strict";

const path = require("node:path");
const os = require("node:os");
const { chromium } = require("playwright");

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";
const pagePath = process.env.PAGE_PATH || "/vi/";
const viewports = [320, 390, 768, 1024, 1440].map((width) => ({
  width,
  height: width < 768 ? 844 : 900,
}));

const assert = require("node:assert");

async function inspectMarquee(page, viewport) {
  await page.goto(`${baseUrl}${pagePath}`, { waitUntil: "networkidle" });
  await page.locator(".capability-marquee--clients").scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready);

  const result = await page.evaluate(async () => {
    const track = document.querySelector(".client-logo-marquee__track");
    const groups = [...track.querySelectorAll(".client-logo-marquee__group")];
    const slots = [...track.querySelectorAll(".client-logo-slot")];
    const animation = track.getAnimations()[0];
    const duration = Number(animation?.effect.getTiming().duration || 0);
    const phases = [];

    for (const progress of [0, 0.25, 0.5, 0.75, 0.999]) {
      animation.currentTime = duration * progress;
      await new Promise(requestAnimationFrame);
      const groupRects = groups.map((group) => group.getBoundingClientRect());
      phases.push({
        progress,
        seam: groupRects[1].left - groupRects[0].right,
        coversViewport:
          Math.min(...groupRects.map((rect) => rect.left)) <= 0.5 &&
          Math.max(...groupRects.map((rect) => rect.right)) >= window.innerWidth - 0.5,
      });
    }

    animation.currentTime = 0;
    await new Promise(requestAnimationFrame);
    const groupRects = groups.map((group) => group.getBoundingClientRect());
    const centers = slots.map((slot) => {
      const rect = slot.getBoundingClientRect();
      return rect.left + rect.width / 2;
    });
    const centerGaps = centers.slice(1).map((center, index) => center - centers[index]);

    return {
      groupCount: groups.length,
      slotsPerGroup: groups.map((group) => group.querySelectorAll(".client-logo-slot").length),
      groupWidthDelta: Math.abs(groupRects[0].width - groupRects[1].width),
      centerGapDelta: Math.max(...centerGaps) - Math.min(...centerGaps),
      animationName: getComputedStyle(track).animationName,
      animationDuration: getComputedStyle(track).animationDuration,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      phases,
    };
  });

  assert(result.groupCount === 2, `${viewport.width}: expected two groups`);
  assert(result.slotsPerGroup.every((count) => count === 12), `${viewport.width}: expected twelve slots per group`);
  assert(result.groupWidthDelta <= 0.5, `${viewport.width}: group widths differ by ${result.groupWidthDelta}px`);
  assert(result.centerGapDelta <= 0.5, `${viewport.width}: center gaps differ by ${result.centerGapDelta}px`);
  assert(result.animationName === "client-logo-marquee", `${viewport.width}: wrong animation name`);
  assert(result.animationDuration === "25s", `${viewport.width}: wrong animation duration`);
  assert(result.overflow <= 0.5, `${viewport.width}: horizontal overflow is ${result.overflow}px`);
  assert(result.phases.every((phase) => Math.abs(phase.seam) <= 0.5), `${viewport.width}: visible seam detected`);
  assert(result.phases.every((phase) => phase.coversViewport), `${viewport.width}: blank viewport interval detected`);

  return result;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const consoleProblems = [];
  const failedRequests = [];
  const results = [];

  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport, reducedMotion: "no-preference" });
      const page = await context.newPage();
      page.on("console", (message) => {
        if (["error", "warning"].includes(message.type())) consoleProblems.push(message.text());
      });
      page.on("requestfailed", (request) => failedRequests.push(request.url()));
      results.push({ viewport, ...(await inspectMarquee(page, viewport)) });
      if (viewport.width === 1440) {
        await page.locator(".capability-marquee--clients").screenshot({
          path: path.join(os.tmpdir(), "truong-thinh-client-logo-marquee-1440.png"),
        });
      }
      await context.close();
    }

    const reducedContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    const reducedPage = await reducedContext.newPage();
    await reducedPage.goto(`${baseUrl}${pagePath}`, { waitUntil: "networkidle" });
    const reduced = await reducedPage.locator(".client-logo-marquee__track").evaluate((track) => ({
      animationName: getComputedStyle(track).animationName,
      transform: getComputedStyle(track).transform,
    }));
    assert(reduced.animationName === "none", "reduced motion must disable the loop");
    assert(reduced.transform === "none", "reduced motion must keep the first group in place");
    await reducedContext.close();

    assert(consoleProblems.length === 0, `console problems: ${consoleProblems.join(" | ")}`);
    assert(failedRequests.length === 0, `failed requests: ${failedRequests.join(" | ")}`);
    console.log(JSON.stringify({ status: "passed", results, reduced }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
