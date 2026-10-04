import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { ADVERTISING_CARDS } from "../../src/site/advertising-products/catalog.mjs";
import { ADVERTISING_TAG_REGISTRY } from "../../src/site/advertising-products/photo-tags.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".tooling/browsers");

const { chromium } = await import("playwright");
const heroId = "kiosk-posm-07";
const activeTag = "format-square";
const detailCss = await readFile(path.join(root, "src/site/detail.css"), "utf8");
const previousWindow = globalThis.window;
Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: {} });
let selectAdvertisingSuggestions;
try {
  ({ selectAdvertisingSuggestions } = await import("../../src/site/advertising-products/catalog-runtime.mjs"));
} finally {
  Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: previousWindow });
}
const delayedActiveSlots = selectAdvertisingSuggestions({
  cards: ADVERTISING_CARDS,
  heroId: "kiosk-posm-01",
  activeTag: "use-sampling",
  tagRegistry: ADVERTISING_TAG_REGISTRY,
});

function hasSharedMediaTiming({ duration, easing, property = "opacity, transform" }) {
  const properties = property.split(",").map((value) => value.trim());
  const durations = duration.split(",").map((value) => value.trim());
  const easings = easing.split(",").map((value) => value.trim());
  const index = properties.indexOf("transform");
  return index >= 0
    && durations[index % durations.length] === "0.6s"
    && easings[index % easings.length] === "ease-out";
}

assert.equal(delayedActiveSlots.length, 4, "initial D17 selection remains four slots");
assert(delayedActiveSlots.some(({ tag }) => tag.id === "use-sampling"), "initial D17 slots include an active tag that normally ranks after four candidates");

function snapshotSuggestions() {
  return [...document.querySelectorAll("[data-advertising-suggestion-tag]")].map((link) => {
    const rect = link.getBoundingClientRect();
    const owner = link.parentElement.getBoundingClientRect();
    return {
      tag: link.dataset.advertisingSuggestionTag,
      index: link.dataset.advertisingSuggestionIndex,
      representative: link.dataset.advertisingSuggestionRepresentative,
      pressed: link.getAttribute("aria-pressed"),
      rect: [rect.x - owner.x, rect.y - owner.y, rect.width, rect.height].map((value) => Math.round(value * 10) / 10),
      photos: [...link.querySelectorAll("[data-advertising-suggestion-image-layer]")]
        .map((image) => ({ layer: image.dataset.advertisingSuggestionImageLayer, photo: image.dataset.advertisingSuggestionPhoto })),
    };
  });
}

const browser = await chromium.launch({ headless: true });
try {
  for (const locale of ["vi", "en"]) {
    const portalPage = await browser.newPage({ viewport: { width: 1569, height: 912 } });
    await portalPage.goto(`${baseUrl}/${locale}/`, { waitUntil: "networkidle" });
    const portal = portalPage.locator(".service-portal").first();
    await portal.scrollIntoViewIfNeeded();
    const overlay = () => portal.locator(".portal-shade").evaluate((shade) => getComputedStyle(shade).backgroundColor);
    const normal = await overlay();
    assert.equal(normal, "rgba(0, 0, 0, 0.4)", `${locale}: portal matches the measured Pinterest overlay`);
    await portal.hover();
    assert.equal(await overlay(), normal, `${locale}: portal hover keeps overlay darkness`);
    await portal.focus();
    assert.equal(await overlay(), normal, `${locale}: portal focus keeps overlay darkness`);
    await portalPage.close();
  }
  const page = await browser.newPage({ viewport: { width: 820, height: 1180 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") pageErrors.push(message.text());
  });
  await page.goto(`${baseUrl}/vi/advertising-products/?photo=${heroId}&tag=${activeTag}`, { waitUntil: "networkidle" });
  await page.locator(`[data-advertising-suggestion-tag="${activeTag}"]`).scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelectorAll("[data-advertising-suggestion-tag]").length === 4);
  const initial = await page.evaluate(snapshotSuggestions);
  assert.equal(initial.length, 4, "D17 renders four fixed suggestion buttons");
  assert.equal(new Set(initial.map((item) => item.tag)).size, 4, "D17 does not duplicate suggestion tag IDs");
  assert.equal(initial.filter((item) => item.pressed === "true").length, 1, "D12 has one active suggestion");
  const active = initial.find((item) => item.tag === activeTag);
  assert(active, "initial URL tag is represented");
  assert.equal(active.pressed, "true", "initial URL tag is pressed");
  assert.equal(active.photos.length, 1, "active suggestion keeps one inert representative layer");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction((tag) => !document.querySelector(`[data-advertising-suggestion-tag="${tag}"] [data-advertising-suggestion-image-layer="next"]`), activeTag);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  assert.equal(await page.locator(`[data-advertising-suggestion-tag="${activeTag}"] [data-advertising-suggestion-image-layer="next"]`).count(), 0,
    "active suggestion does not start a hidden slideshow");

  const alternate = initial.find((item) => item.tag !== activeTag)?.tag;
  assert(alternate, "fixture has an alternate suggestion");
  const activeLink = page.locator(`[data-advertising-suggestion-tag="${activeTag}"]`);
  const inactiveLink = page.locator(`[data-advertising-suggestion-tag="${alternate}"]`);
  const inactiveOverlay = () => inactiveLink.evaluate((link) => getComputedStyle(link, "::after").backgroundColor);
  const inactiveNormal = await inactiveOverlay();
  assert.equal(inactiveNormal, "rgba(0, 0, 0, 0.4)", "inactive suggestion matches the portal and Pinterest overlay");
  assert.equal(await inactiveLink.evaluate((link) => getComputedStyle(link).borderColor), "rgba(0, 0, 0, 0)",
    "image-backed inactive suggestion has no visible black border");
  const activeStyle = await activeLink.evaluate((link) => {
    const style = getComputedStyle(link);
    const label = getComputedStyle(link.querySelector(".advertising-photo-view__suggestion-label"));
    return {
      background: style.backgroundColor,
      borderColor: style.borderColor,
      borderWidth: style.borderWidth,
      labelColor: label.color,
    };
  });
  assert.deepEqual(activeStyle, {
    background: "rgb(255, 255, 255)",
    borderColor: "rgb(32, 33, 32)",
    borderWidth: "1px",
    labelColor: "rgb(32, 33, 32)",
  }, "active suggestion is white with black text and border");
  const ring = (link) => link.evaluate((node) => {
    const style = getComputedStyle(node);
    return { image: style.backgroundImage, position: style.backgroundPosition, size: style.backgroundSize };
  });
  const inactiveRing = await ring(inactiveLink);
  assert.match(inactiveRing.image, /animateTransform/, "inactive suggestion paints the spinning loading ring behind its photo");
  assert.deepEqual([inactiveRing.position, inactiveRing.size], ["right 2px top 2px", "12px"],
    "suggestion ring stays in the label padding corner");
  assert.equal((await ring(activeLink)).image, "none", "active suggestion has no loading ring behind its hidden photo");
  await activeLink.hover();
  await page.waitForTimeout(650);
  const activeHoverMedia = await activeLink.evaluate((link) => [...link.querySelectorAll(".advertising-card-media__image")].map((image) => {
    const style = getComputedStyle(image);
    return { transform: style.transform, duration: style.transitionDuration, easing: style.transitionTimingFunction, property: style.transitionProperty };
  }));
  assert.equal(activeHoverMedia.length, 1, "active hover keeps one inert representative layer");
  assert(activeHoverMedia.every(({ transform }) => transform === "none"),
    "active suggestion hover keeps media transform inert");
  await page.mouse.move(0, 0);
  await activeLink.focus();
  await page.waitForTimeout(650);
  const activeFocusMedia = await activeLink.evaluate((link) => [...link.querySelectorAll(".advertising-card-media__image")].map((image) => {
    const style = getComputedStyle(image);
    return { transform: style.transform, duration: style.transitionDuration, easing: style.transitionTimingFunction };
  }));
  assert(activeFocusMedia.every(({ transform }) => transform === "none"),
    "active suggestion keyboard focus keeps media transform inert");
  await page.locator(`[data-advertising-suggestion-tag="${alternate}"]`).hover();
  await page.waitForTimeout(650);
  assert.equal(await inactiveOverlay(), inactiveNormal, "inactive suggestion hover keeps overlay darkness");
  assert.equal(await inactiveLink.evaluate((link) => getComputedStyle(link).borderColor), "rgba(0, 0, 0, 0)",
    "image-backed inactive suggestion hover has no visible black border");
  const hoverStyle = await page.locator(`[data-advertising-suggestion-tag="${alternate}"]`).evaluate((link) => ({
    filter: getComputedStyle(link, "::after").filter,
    shadow: getComputedStyle(link, "::after").boxShadow,
    media: {
      transform: getComputedStyle(link.querySelector(".advertising-card-media__image")).transform,
      duration: getComputedStyle(link.querySelector(".advertising-card-media__image")).transitionDuration,
      easing: getComputedStyle(link.querySelector(".advertising-card-media__image")).transitionTimingFunction,
      property: getComputedStyle(link.querySelector(".advertising-card-media__image")).transitionProperty,
    },
  }));
  assert.equal(hoverStyle.filter, "none", "hover keeps the same inactive overlay darkness");
  assert.match(hoverStyle.media.transform, /matrix\(1\.15, 0, 0, 1\.15/, "suggestion hover reuses the shared media zoom");
  assert(hasSharedMediaTiming(hoverStyle.media), "suggestion hover exposes the shared 600ms ease-out media contract");
  const relatedLink = page.locator("[data-advertising-related-card] > a").first();
  await relatedLink.focus();
  await page.waitForTimeout(650);
  const relatedMedia = await relatedLink.evaluate((link) => {
    const style = getComputedStyle(link.querySelector(".advertising-card-media__image"));
    return { transform: style.transform, duration: style.transitionDuration, easing: style.transitionTimingFunction, property: style.transitionProperty };
  });
  assert.equal(relatedMedia.transform, hoverStyle.media.transform, "suggestion and grid card media share the same zoom endpoint");
  assert(hasSharedMediaTiming(relatedMedia) && hasSharedMediaTiming(hoverStyle.media),
    "suggestion and grid card media share the 600ms ease-out transform contract");
  await page.locator(`[data-advertising-suggestion-tag="${alternate}"]`).focus();
  await page.waitForTimeout(650);
  assert.match(
    await page.locator(`[data-advertising-suggestion-tag="${alternate}"] .advertising-card-media__image`).evaluate((image) => getComputedStyle(image).transform),
    /matrix\(1\.15, 0, 0, 1\.15/,
    "suggestion keyboard focus reuses the shared media zoom",
  );
  assert.match(detailCss, /suggestion-link:focus-visible \{[\s\S]*?outline: 2px solid var\(--ink\);/, "focus has a dedicated ring");
  assert.doesNotMatch(detailCss, /aria-pressed="true"[^}]*background-clip:\s*text/s,
    "active suggestion text is not image-masked");
  await page.locator(`[data-advertising-suggestion-tag="${alternate}"]`).click();
  await page.waitForFunction((tag) => new URL(location.href).searchParams.get("tag") === tag, alternate);
  const changed = await page.evaluate(snapshotSuggestions);
  assert.deepEqual(
    changed.map(({ tag, index, representative, rect }) => ({ tag, index, representative, rect })),
    initial.map(({ tag, index, representative, rect }) => ({ tag, index, representative, rect })),
    "tag activation keeps IDs, order, representatives, and rectangles stable",
  );
  assert.equal(changed.filter((item) => item.pressed === "true")[0]?.tag, alternate, "alternate is only active suggestion");

  await page.locator(`[data-advertising-suggestion-tag="${alternate}"]`).press("Enter");
  await page.waitForFunction(() => !new URL(location.href).searchParams.has("tag"));
  const cleared = await page.evaluate(snapshotSuggestions);
  assert.deepEqual(
    cleared.map(({ tag, index, representative, rect }) => ({ tag, index, representative, rect })),
    initial.map(({ tag, index, representative, rect }) => ({ tag, index, representative, rect })),
    "toggle-off retains all fixed slots",
  );
  assert.equal(cleared.filter((item) => item.pressed === "true").length, 0, "toggle-off clears pressed state");
  assert(cleared.every((item) => item.photos.length >= 1 && item.photos.length <= 2
    && item.photos.every(photo => ADVERTISING_CARDS.find(card => card.id === photo.photo)?.tagIds.includes(item.tag))),
  "off state shows only images belonging to the suggestion, with at most two crossfade layers");

  await page.setViewportSize({ width: 390, height: 568 });
  const offscreenTag = initial.at(-1).tag;
  await page.evaluate(() => {
    document.querySelector("[data-advertising-photo-suggestion]").style.marginTop = "1000px";
    document.querySelector("[data-advertising-photo-info]").scrollTop = 0;
  });
  await page.waitForFunction((tag) => {
    const info = document.querySelector("[data-advertising-photo-info]").getBoundingClientRect();
    const button = document.querySelector(`[data-advertising-suggestion-tag="${tag}"]`).getBoundingClientRect();
    return button.top >= info.bottom;
  }, offscreenTag);
  await page.evaluate((tag) => document.querySelector(`[data-advertising-suggestion-tag="${tag}"]`).click(), offscreenTag);
  await page.waitForFunction((tag) => new URL(location.href).searchParams.get("tag") === tag, offscreenTag);
  await page.waitForTimeout(200);
  assert.equal(await page.locator(`[data-advertising-suggestion-tag="${offscreenTag}"] [data-advertising-suggestion-image-layer="next"]`).count(), 0, "offscreen active row has no hidden slideshow");
  await page.locator(`[data-advertising-suggestion-tag="${offscreenTag}"]`).scrollIntoViewIfNeeded();
  assert.equal(await page.locator(`[data-advertising-suggestion-tag="${offscreenTag}"] [data-advertising-suggestion-image-layer="next"]`).count(), 0, "onscreen active row stays static");

  await page.evaluate(() => window.TruongThinhAdvertising.unmount());
  await page.waitForTimeout(6_000);
  const cleaned = await page.evaluate(() => ({
    nextLayers: document.querySelectorAll('[data-advertising-suggestion-image-layer="next"]').length,
    animations: [...document.querySelectorAll("[data-advertising-suggestion-image-layer]")]
      .flatMap((image) => image.getAnimations()).length,
  }));
  assert.deepEqual(cleaned, { nextLayers: 0, animations: 0 }, "unmount removes D12 animation work");
  assert.deepEqual(pageErrors, [], "D12 motion emits no runtime errors");
  await page.close();

  const reduced = await browser.newPage({ viewport: { width: 820, height: 1180 }, reducedMotion: "reduce" });
  await reduced.goto(`${baseUrl}/en/advertising-products/?photo=${heroId}&tag=${activeTag}`, { waitUntil: "networkidle" });
  await reduced.locator(`[data-advertising-suggestion-tag="${activeTag}"]`).scrollIntoViewIfNeeded();
  await reduced.waitForFunction(() => document.querySelectorAll("[data-advertising-suggestion-tag]").length === 4);
  const reducedState = await reduced.evaluate(snapshotSuggestions);
  assert(reducedState.every((item) => item.photos.length === 1), "reduced motion has no second image layer");
  assert(reducedState.every((item) => item.photos[0].photo === item.representative), "reduced motion keeps representatives static");
  const reducedAlternate = reducedState.find((item) => item.tag !== activeTag).tag;
  await reduced.locator(`[data-advertising-suggestion-tag="${reducedAlternate}"]`).hover();
  const reducedMedia = await reduced.locator(`[data-advertising-suggestion-tag="${reducedAlternate}"] .advertising-card-media__image`).evaluate((image) => {
    const style = getComputedStyle(image);
    return { transform: style.transform, duration: style.transitionDuration };
  });
  assert.equal(reducedMedia.transform, "none", "reduced motion removes the shared media zoom");
  assert.equal(reducedMedia.duration, "0s", "reduced motion leaves no suggestion media transition");
  const reducedRing = await reduced.locator(`[data-advertising-suggestion-tag="${reducedAlternate}"]`)
    .evaluate((link) => getComputedStyle(link).backgroundImage);
  assert.match(reducedRing, /svg/, "reduced motion keeps the suggestion loading ring");
  assert.doesNotMatch(reducedRing, /animateTransform/, "reduced motion suggestion ring does not spin");
  await reduced.close();

  const direct = await browser.newPage({ viewport: { width: 820, height: 1180 } });
  await direct.goto(`${baseUrl}/vi/advertising-products/?photo=kiosk-posm-01&tag=use-sampling`, { waitUntil: "networkidle" });
  await direct.waitForSelector('[data-advertising-suggestion-tag="use-sampling"][aria-pressed="true"]');
  assert.equal(await direct.locator("[data-advertising-suggestion-tag]").count(), 4, "direct URL keeps four fixed D17 slots");
  await direct.close();
} finally {
  await browser.close();
}
