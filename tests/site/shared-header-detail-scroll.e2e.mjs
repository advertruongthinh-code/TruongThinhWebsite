import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";

// site-shell R3, Advertising detail (owner 2026-11-23): with a mouse the header scrolls away with the page and comes back
// by mouse at the top edge; on touch screens it stays stuck.
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium, devices } = await import("playwright");
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";
const detailPath = "/advertising-products/p/signage-raised-letters-33/";
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });

const headerState = page => page.locator("[data-site-header]").evaluate(node => ({
  hidden: node.classList.contains("is-hidden"),
  height: node.offsetHeight,
  top: node.getBoundingClientRect().top,
}));
const ready = page => page.waitForFunction(() => document.body.classList.contains("is-detail")
  && (document.documentElement.classList.contains("motion-ready")
    || document.documentElement.classList.contains("motion-fallback"))
  // Page entry pins the header and resets scroll; the catalog restores scroll when it mounts. Scroll only after both.
  && !document.documentElement.classList.contains("route-enter")
  && !document.querySelector("[data-site-header]").classList.contains("is-route-pinned")
  && (document.querySelector("[data-masonry-cta-skeleton]")?.dataset.masonryCtaReady ?? "true") === "true");

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await desktop.goto(`${baseUrl}${detailPath}`, { waitUntil: "domcontentloaded" });
  await ready(desktop);
  await desktop.mouse.move(700, 600);
  const setScroll = y => desktop.evaluate(target => window.TruongThinhMotion.setLogicalScroll(target), y);
  await setScroll(30);
  await desktop.waitForFunction(() => Math.abs(document.querySelector("[data-site-header]").getBoundingClientRect().top + 30) < 1.5);
  const partial = await headerState(desktop);
  assert(!partial.hidden, `desktop: header 30px away must not be is-hidden ${JSON.stringify(partial)}`);
  await setScroll(400);
  await desktop.waitForFunction(() => document.querySelector("[data-site-header]").classList.contains("is-hidden"));
  await desktop.mouse.move(700, 10);
  await desktop.waitForFunction(() => document.querySelector("[data-site-header]").getBoundingClientRect().top > -1);
  await desktop.mouse.move(700, 600);
  await desktop.waitForFunction(() => {
    const header = document.querySelector("[data-site-header]");
    return header.getBoundingClientRect().bottom <= 1;
  });
  await setScroll(300);
  await desktop.waitForTimeout(300);
  assert((await headerState(desktop)).hidden, "desktop: scrolling up mid-page must keep the header away");
  await setScroll(0);
  await desktop.waitForFunction(() => {
    const header = document.querySelector("[data-site-header]");
    return !header.classList.contains("is-hidden") && Math.abs(header.getBoundingClientRect().top) < 1;
  });
  await desktop.close();

  const context = await browser.newContext({ ...devices["Galaxy S9+"] });
  const phone = await context.newPage();
  await phone.goto(`${baseUrl}${detailPath}`, { waitUntil: "domcontentloaded" });
  await ready(phone);
  await phone.evaluate(() => window.scrollTo(0, 600));
  await phone.waitForTimeout(400);
  const stuck = await headerState(phone);
  assert(!stuck.hidden && Math.abs(stuck.top) < 1, `phone: header must stay stuck ${JSON.stringify(stuck)}`);
  await context.close();
} finally {
  await browser.close();
}

console.log("Shared header detail scroll: desktop scroll-away with hover reveal and phone stuck passed");
