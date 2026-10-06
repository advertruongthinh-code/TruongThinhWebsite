import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { ADVERTISING_CARDS } from "../../src/site/advertising-products/catalog.mjs";
import { ADVERTISING_TAG_REGISTRY } from "../../src/site/advertising-products/photo-tags.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";
const evidenceDirectory = path.join(root, ".tmp/orchestration/ad-sept-p2-20260920/suggestion-layout");
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".tooling/browsers");

const previousWindow = globalThis.window;
Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: {} });
let selectAdvertisingSuggestions;
try {
  ({ selectAdvertisingSuggestions } = await import("../../src/site/advertising-products/catalog-runtime.mjs"));
} finally {
  Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: previousWindow });
}

const directSlots = selectAdvertisingSuggestions({
  cards: ADVERTISING_CARDS,
  heroId: "kiosk-posm-01",
  activeTag: "use-sampling",
  tagRegistry: ADVERTISING_TAG_REGISTRY,
});
assert.equal(directSlots.length, 4, "D17 selection has four slots");
assert(directSlots.some(({ tag }) => tag.id === "use-sampling"), "D17 keeps an initial URL tag inside four stable slots");

function readSuggestions() {
  const rounded = (value) => Math.round(value * 10) / 10;
  const info = document.querySelector("[data-advertising-photo-info]")?.getBoundingClientRect();
  const body = document.querySelector("[data-advertising-photo-description]")?.getBoundingClientRect();
  const suggestion = document.querySelector("[data-advertising-photo-suggestion]")?.getBoundingClientRect();
  const links = document.querySelector(".advertising-photo-view__suggestion-links")?.getBoundingClientRect();
  const buttons = [...document.querySelectorAll("[data-advertising-suggestion-tag]")].map((button) => {
    const rect = button.getBoundingClientRect();
    return {
      id: button.dataset.advertisingSuggestionTag,
      index: button.dataset.advertisingSuggestionIndex,
      representative: button.dataset.advertisingSuggestionRepresentative,
      pressed: button.getAttribute("aria-pressed"),
      rect: [rect.x, rect.y, rect.width, rect.height].map(rounded),
    };
  });
  return {
    layout: document.querySelector("[data-advertising-photo-view]")?.dataset.advertisingPhotoLayout,
    span: document.querySelector("[data-advertising-photo-view]")?.dataset.advertisingPrimarySpan,
    inInfo: Boolean(document.querySelector("[data-advertising-photo-suggestion]")?.closest("[data-advertising-photo-info]")),
    inRelated: Boolean(document.querySelector("[data-advertising-photo-suggestion]")?.closest("[data-advertising-photo-related-grid]")),
    info: [info.x, info.y, info.width, info.height].map(rounded),
    body: [body.x, body.y, body.width, body.height].map(rounded),
    suggestion: [suggestion.x, suggestion.y, suggestion.width, suggestion.height].map(rounded),
    links: [links.x, links.y, links.width, links.height].map(rounded),
    buttons,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
}

function stableIdentity(state) {
  return state.buttons.map(({ id, index, representative, rect }) => ({ id, index, representative, rect }));
}

function assertContained(state, label) {
  const [infoX, infoY, infoWidth, infoHeight] = state.info;
  const [linksX, linksY, linksWidth] = state.links;
  assert.equal(state.buttons.length, 4, `${label}: needs exactly four buttons`);
  assert.equal(new Set(state.buttons.map(({ id }) => id)).size, 4, `${label}: duplicate tag IDs`);
  assert(Math.abs(linksX - infoX) <= 1 && Math.abs(linksWidth - infoWidth) <= 1, `${label}: links do not fill info width`);
  assert(state.suggestion[1] >= state.body[1] + state.body[3] - 1, `${label}: suggestion does not follow the description body`);
  assert(Math.abs(state.suggestion[0] - infoX) <= 1 && Math.abs(state.suggestion[2] - infoWidth) <= 1, `${label}: suggestion does not fill info width`);
  assert(state.buttons.every(({ rect: [x, y, width, height] }) => x >= infoX - 1 && y >= infoY - 1
    && x + width <= infoX + infoWidth + 1 && y + height <= infoY + infoHeight + 1), `${label}: button escapes description info`);
  assert(state.overflow <= 1, `${label}: horizontal overflow ${state.overflow}px`);
  assert.equal(state.inInfo, true, `${label}: split suggestion is outside primary info`);
  assert.equal(state.inRelated, false, `${label}: split suggestion remains in related grid`);
}

function assertFullSpan(state, label) {
  const [x, y, width, height] = state.suggestion;
  assert.equal(state.inRelated, true, `${label}: full-span suggestion is outside related grid`);
  assert.equal(state.inInfo, false, `${label}: full-span suggestion remains in primary info`);
  assert.equal(state.buttons.length, 4, `${label}: needs exactly four buttons`);
  assert(state.buttons.every(({ rect: [left, top, buttonWidth, buttonHeight] }) =>
    left >= x - 1 && top >= y - 1 && left + buttonWidth <= x + width + 1 && top + buttonHeight <= y + height + 1),
  `${label}: button escapes suggestion card`);
  assert(state.overflow <= 1, `${label}: horizontal overflow ${state.overflow}px`);
}

const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true });
try {
  await mkdir(evidenceDirectory, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1569, height: 912 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  for (const locale of ["vi", "en"]) {
    await page.setViewportSize({ width: 1569, height: 912 });
    await page.goto(`${baseUrl}/${locale}/advertising-products/?photo=kiosk-posm-07&tag=format-square`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.querySelectorAll("[data-advertising-suggestion-tag]").length === 4);
    const split = await page.evaluate(readSuggestions);
    assert.equal(split.layout, "split", `${locale}: fixture must exercise split primary`);
    assert.equal(split.span, "3", `${locale}: desktop primary must span three columns`);
    assertContained(split, `${locale} split desktop`);
    assert.equal(new Set(split.buttons.map(({ rect }) => rect[0])).size, 1, `${locale}: split needs one suggestion column`);
    assert.equal(new Set(split.buttons.map(({ rect }) => rect[1])).size, 4, `${locale}: split needs four suggestion rows`);
    await page.screenshot({ path: path.join(evidenceDirectory, `${locale}-1569x912.png`) });
    assert(split.buttons.filter(({ pressed }) => pressed === "true").length === 1, `${locale}: active URL tag is represented`);
    const alternate = split.buttons.find(({ pressed }) => pressed !== "true").id;
    await page.locator(`[data-advertising-suggestion-tag="${alternate}"]`).click();
    await page.waitForFunction((tag) => new URL(location.href).searchParams.get("tag") === tag, alternate);
    const toggled = await page.evaluate(readSuggestions);
    assert.deepEqual(stableIdentity(toggled), stableIdentity(split), `${locale}: split toggle changes slot geometry`);
    await page.locator(`[data-advertising-suggestion-tag="${alternate}"]`).click();
    await page.waitForFunction(() => !new URL(location.href).searchParams.has("tag"));
    assert.deepEqual(stableIdentity(await page.evaluate(readSuggestions)), stableIdentity(split), `${locale}: split off changes slot geometry`);

    await page.goto(`${baseUrl}/${locale}/advertising-products/?photo=kiosk-posm-03`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.querySelectorAll("[data-advertising-suggestion-tag]").length === 4);
    const secondDesktop = await page.evaluate(readSuggestions);
    assert.equal(secondDesktop.layout, "split", `${locale}: intrinsic ratio cannot change desktop mode`);
    assert.equal(secondDesktop.span, "3", `${locale}: second desktop primary must span three columns`);
    assertContained(secondDesktop, `${locale} second desktop`);
    assert.equal(new Set(secondDesktop.buttons.map(({ rect }) => rect[0])).size, 1, `${locale}: second desktop needs one suggestion column`);
    assert.equal(new Set(secondDesktop.buttons.map(({ rect }) => rect[1])).size, 4, `${locale}: second desktop needs four suggestion rows`);

    await page.setViewportSize({ width: 820, height: 1180 });
    await page.waitForFunction(() => innerWidth === 820
      && document.querySelectorAll("[data-advertising-suggestion-tag]").length === 4
      && document.querySelector("[data-advertising-photo-view]")?.dataset.advertisingPhotoLayout === "pinterest"
      && document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    const tablet = await page.evaluate(readSuggestions);
    assert.equal(tablet.span, "3", `${locale}: tablet primary must span three columns`);
    assertFullSpan(tablet, `${locale} tablet`);
    await page.screenshot({ path: path.join(evidenceDirectory, `${locale}-820x1180.png`) });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => innerWidth === 390
      && document.querySelectorAll("[data-advertising-suggestion-tag]").length === 4
      && document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    const narrow = await page.evaluate(readSuggestions);
    assert.equal(narrow.layout, "pinterest", `${locale}: phone primary must use full-span Pinterest mode`);
    assert.equal(narrow.span, "2", `${locale}: phone keeps span min(3, N)`);
    assertFullSpan(narrow, `${locale} full-span mobile`);
    assert(new Set(narrow.buttons.map(({ rect }) => rect[1])).size > 1, `${locale}: stacked mobile must wrap`);
    await page.screenshot({ path: path.join(evidenceDirectory, `${locale}-390x844.png`) });

    // Full-span stacks only in portrait; a landscape viewport always splits (detail spec R2).
    await page.setViewportSize({ width: 954, height: 1000 });
    await page.waitForFunction(() => document.querySelector("[data-advertising-photo-view]")?.dataset.advertisingPhotoLayout === "pinterest");
    await page.setViewportSize({ width: 1165, height: 910 });
    await page.waitForFunction(() => document.querySelector("[data-advertising-photo-view]")?.dataset.advertisingPhotoLayout === "split");
    const splitAfterResize = await page.evaluate(readSuggestions);
    assertContained(splitAfterResize, `${locale} full-span to split resize`);
  }
  assert.deepEqual(errors, [], "D17 layout emits no browser errors");
  await page.close();
} finally {
  await browser.close();
}
