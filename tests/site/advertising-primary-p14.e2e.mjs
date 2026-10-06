import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { ADVERTISING_CARDS } from "../../src/site/advertising-products/catalog.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outputDirectory = process.env.AD_P14_OUTPUT_DIR
  ? path.resolve(root, process.env.AD_P14_OUTPUT_DIR)
  : path.join(root, ".tmp/orchestration/advertising-primary-p14-20260911");
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";
const baseOrigin = new URL(baseUrl).origin;
const artifactPrefix = process.env.AD_P14_ARTIFACT_PREFIX || "browser-proof";
const labelFilter = process.env.AD_P14_LABEL_FILTER || "";
const resultsPath = path.join(outputDirectory, `${artifactPrefix}-results.json`);
const reportPath = path.join(outputDirectory, `${artifactPrefix}-report.md`);

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(root, ".tooling/browsers");
const { chromium } = await import("playwright");

const cards = new Map(ADVERTISING_CARDS.map((card) => [card.id, card]));
for (const id of ["kiosk-posm-01", "kiosk-posm-03", "kiosk-posm-04", "kiosk-posm-06", "kiosk-posm-07", "kiosk-posm-09"]) {
  assert(cards.has(id), `Canonical catalog is missing ${id}`);
}

const widthSamples = [320, 390, 820, 1024, 1569, 1922, 2560];
const heights = new Map([[320, 568], [390, 844], [820, 1180], [1024, 768], [1569, 912], [1922, 912], [2560, 1440]]);
const sampleIds = ["kiosk-posm-03", "kiosk-posm-07", "kiosk-posm-06", "kiosk-posm-04", "kiosk-posm-09"];
const screenshotSamples = new Set([
  "core-en-kiosk-posm-03-320x568",
  "core-vi-kiosk-posm-07-820x1180-sparse",
  "sparse-related-vi-kiosk-posm-01-1569x912",
  "core-vi-kiosk-posm-09-1569x912",
  "core-en-kiosk-posm-06-1922x912",
  "core-vi-kiosk-posm-07-2560x1440",
  "text-200pct-en-kiosk-posm-07-390x844",
  "controls-en-kiosk-posm-03-320x568",
]);
const results = [];

const clamp = (min, value, max) => Math.min(max, Math.max(min, value));
const closeTo = (actual, expected, label, tolerance = 1.5) => {
  assert(Number.isFinite(actual), `${label}: ${actual} is not finite`);
  assert(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected}, got ${actual}`);
};
const overlaps = (a, b, tolerance = 1) => Boolean(a && b
  && a.left < b.right - tolerance && a.right > b.left + tolerance
  && a.top < b.bottom - tolerance && a.bottom > b.top + tolerance);
const contained = (inner, outer, tolerance = 1.5) => Boolean(inner && outer
  && inner.left >= outer.left - tolerance && inner.right <= outer.right + tolerance
  && inner.top >= outer.top - tolerance && inner.bottom <= outer.bottom + tolerance);

function route(locale, id, tag = null) {
  const query = new URLSearchParams({ photo: id });
  if (tag) query.set("tag", tag);
  return `/${locale}/advertising-products/?${query}`;
}

function safeName(value) {
  return value.replaceAll(/[^a-z0-9]+/gi, "-").replaceAll(/^-|-$/g, "").toLowerCase();
}

async function sha256(relativePath) {
  try {
    return createHash("sha256").update(await readFile(path.join(root, relativePath))).digest("hex");
  } catch {
    return null;
  }
}

function attachDiagnostics(page) {
  const issues = [];
  page.on("pageerror", (error) => issues.push({ kind: "pageerror", message: error.message }));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const location = message.location();
    if (!location.url || new URL(location.url, baseUrl).origin === baseOrigin) {
      issues.push({ kind: "console", message: message.text(), url: location.url });
    }
  });
  page.on("requestfailed", (request) => {
    if (new URL(request.url()).origin === baseOrigin || ["font", "stylesheet", "script"].includes(request.resourceType())) {
      issues.push({ kind: "requestfailed", url: request.url(), error: request.failure()?.errorText || "unknown" });
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && (new URL(response.url()).origin === baseOrigin
      || ["font", "stylesheet", "script"].includes(response.request().resourceType()))) {
      issues.push({ kind: "response", url: response.url(), status: response.status() });
    }
  });
  return issues;
}

async function settle(page) {
  await page.waitForFunction(() => {
    const image = document.querySelector("[data-advertising-photo-image]");
    const primary = document.querySelector("[data-advertising-photo-primary]");
    const relatedImages = [...document.querySelectorAll("[data-advertising-related-card] img")];
    return image?.complete && image.naturalWidth > 0 && primary?.getBoundingClientRect().width > 0
      && relatedImages.some((entry) => entry.complete && entry.naturalWidth > 0);
  }, null, { timeout: 12_000 });
  await page.evaluate(async () => {
    await document.fonts?.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.waitForFunction(() => {
    const plusJakartaFaces = [...document.fonts].filter((face) => face.family.replaceAll(/["']/g, "") === "Plus Jakarta Sans");
    return document.fonts.status === "loaded"
      && plusJakartaFaces.some((face) => face.status === "loaded")
      && document.fonts.check('500 16px "Plus Jakarta Sans"')
      && document.fonts.check('600 32px "Plus Jakarta Sans"')
      && document.documentElement.classList.contains("motion-ready");
  }, null, { timeout: 12_000 });
  await page.waitForFunction(() => {
    const header = document.querySelector("[data-site-header]");
    const logo = header?.querySelector("#header-logo");
    const toggle = header?.querySelector("#header-toggle-svg");
    if (!header || !logo || !toggle) return false;
    const closeTo = (actual, expected) => Math.abs(actual - expected) <= 0.0001;
    const transformSettled = (node) => {
      const transform = getComputedStyle(node).transform;
      if (transform === "none") return true;
      const matrix = new DOMMatrixReadOnly(transform);
      return closeTo(matrix.a, 1) && closeTo(matrix.b, 0) && closeTo(matrix.c, 0)
        && closeTo(matrix.d, 1) && closeTo(matrix.e, 0) && closeTo(matrix.f, 0);
    };
    const visibleAndSettled = (node) => {
      const rect = node.getBoundingClientRect();
      let current = node;
      while (current instanceof Element) {
        const style = getComputedStyle(current);
        if (style.display === "none" || style.visibility !== "visible"
          || Number.parseFloat(style.opacity) < 0.99 || !transformSettled(current)) return false;
        const gsap = Reflect.get(window, "gsap");
        if (gsap?.isTweening(current)) return false;
        if (current === header) break;
        current = current.parentElement;
      }
      return rect.width > 0 && rect.height > 0;
    };
    const targets = [logo, toggle];
    if (getComputedStyle(header.querySelector(".desktop-nav ul")).display !== "none"
      && getComputedStyle(header.querySelector(".desktop-nav")).visibility === "visible") {
      targets.push(...header.querySelectorAll("#header-menu-items > ul > li"));
    }
    if (!targets.every(visibleAndSettled)) return false;
    return true;
  }, null, { timeout: 8_000 });
  await page.waitForFunction(() => ![...document.querySelectorAll("[data-advertising-related-card]")]
    .some((node) => node.getAnimations().some((animation) => animation.playState === "running")), null, { timeout: 8_000 });
}

async function evidence(page) {
  return page.evaluate(() => {
    const box = (node) => node?.getBoundingClientRect().toJSON() || null;
    const styles = (node) => node && getComputedStyle(node);
    const view = document.querySelector("[data-advertising-photo-view]");
    const primary = document.querySelector("[data-advertising-photo-primary]");
    const hero = document.querySelector("[data-advertising-photo-hero]");
    const frame = document.querySelector(".advertising-photo-view__hero-frame");
    const foreground = document.querySelector("[data-advertising-photo-image]");
    const background = document.querySelector("[data-advertising-photo-background]");
    const info = document.querySelector("[data-advertising-photo-info]");
    const description = document.querySelector("[data-advertising-photo-description]");
    const descriptionPager = document.querySelector("[data-advertising-photo-description-pager]");
    const descriptionIndicator = document.querySelector("[data-advertising-photo-description-indicator]");
    const relatedGrid = document.querySelector("[data-advertising-photo-related-grid]");
    const suggestion = document.querySelector("[data-advertising-suggestion-card]");
    const cta = document.querySelector("[data-advertising-photo-cta]");
    const expand = document.querySelector("[data-advertising-photo-expand]");
    const dialog = document.querySelector("[data-advertising-photo-dialog]");
    const foregroundStyle = styles(foreground);
    const backgroundStyle = styles(background);
    const glass = frame?.querySelector(":scope > .glass-surface");
    const infoStyle = styles(info);
    const ctaStyle = styles(cta);
    const expandStyle = styles(expand);
    const descriptionStyle = styles(description);
    const desktopNav = document.querySelector(".desktop-nav");
    const desktopNavStyle = styles(desktopNav);
    const entryState = (node) => node ? {
      rect: box(node), opacity: Number.parseFloat(styles(node).opacity), transform: styles(node).transform,
      ancestors: [...function* ancestors() {
        let current = node.parentElement;
        while (current && current !== document.body) {
          yield { tag: current.tagName.toLowerCase(), id: current.id, className: current.className,
            opacity: Number.parseFloat(styles(current).opacity), transform: styles(current).transform };
          if (current.matches("[data-site-header]")) break;
          current = current.parentElement;
        }
      }()],
    } : null;
    const plusJakartaFaces = [...document.fonts]
      .filter((face) => face.family.replaceAll(/["']/g, "") === "Plus Jakarta Sans")
      .map((face) => ({ status: face.status, weight: face.weight, style: face.style }));
    const ctaLabel = cta?.querySelector("span:not([aria-hidden='true'])");
    const expandLabel = expand?.querySelector("span:not([aria-hidden='true'])");
    const iconFor = (control) => control?.querySelector("svg, [data-advertising-photo-control-icon], [aria-hidden='true']");
    const iconMetrics = (control) => {
      const icon = iconFor(control);
      const iconStyle = styles(icon);
      const iconRect = box(icon);
      return iconRect ? {
        rect: iconRect,
        contentWidth: iconRect.width - Number.parseFloat(iconStyle.paddingLeft) - Number.parseFloat(iconStyle.paddingRight),
        contentHeight: iconRect.height - Number.parseFloat(iconStyle.paddingTop) - Number.parseFloat(iconStyle.paddingBottom),
      } : null;
    };
    const related = [...document.querySelectorAll("[data-advertising-related-card]")]
      .filter((node) => !node.hidden && node.getBoundingClientRect().width > 0)
      .map((node) => {
        const image = node.querySelector("img");
        return {
          id: node.dataset.advertisingRelatedCard,
          rect: box(node),
          image: image?.complete && image.naturalWidth > 0 ? {
            rect: box(image), naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight,
          } : null,
        };
      });
    const flowSelectors = [
      "[data-advertising-photo-category]", "[data-advertising-photo-description-pager]",
      "[data-advertising-photo-description-indicator]", "[data-advertising-photo-cta]",
    ];
    const frameRect = frame?.getBoundingClientRect();
    const foregroundRect = foreground?.getBoundingClientRect();
    const visibleRelatedItems = [...(relatedGrid?.children || [])]
      .filter((node) => node.getBoundingClientRect().width > 0);
    const visibleInfoControls = [...(info?.children || [])].filter((node) => node !== descriptionPager
      && !node.hidden && styles(node).display !== "none");
    const infoGap = Number.parseFloat(infoStyle?.rowGap) || 0;
    const descriptionLineHeight = Number.parseFloat(descriptionStyle?.lineHeight) || 0;
    const infoMinimumHeight = Math.ceil(visibleInfoControls.reduce((sum, node) => {
      const style = styles(node);
      return sum + node.getBoundingClientRect().height
        + (Number.parseFloat(style.marginTop) || 0) + (Number.parseFloat(style.marginBottom) || 0);
    }, descriptionLineHeight + visibleInfoControls.length * infoGap)) + 1;
    const imageEdgePadding = Number.parseFloat(expandStyle?.getPropertyValue("--image-action-edge-padding")) || 0;
    const imageMinimumHeight = Math.ceil(Math.max(expand?.getBoundingClientRect().height || 0,
      2 * (Number.parseFloat(expandStyle?.lineHeight) || 0) + imageEdgePadding)
      + 2 * (Number.parseFloat(expandStyle?.bottom) || 0));
    return {
      url: location.href,
      viewport: {
        width: document.documentElement.clientWidth,
        windowWidth: innerWidth,
        height: window.visualViewport?.height || innerHeight,
        rootFontSize: Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
      },
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      readiness: {
        fontsStatus: document.fonts.status,
        plusJakartaFaces,
        body500: document.fonts.check('500 16px "Plus Jakarta Sans"'),
        title600: document.fonts.check('600 32px "Plus Jakarta Sans"'),
        motionReady: document.documentElement.classList.contains("motion-ready"),
        motionEnabled: document.documentElement.classList.contains("motion-enabled"),
        headerEntry: {
          logo: entryState(document.querySelector("#header-logo")),
          toggle: entryState(document.querySelector("#header-toggle-svg")),
          navItems: [...document.querySelectorAll("#header-menu-items > ul > li")].map(entryState),
        },
      },
      header: box(document.querySelector("[data-site-header]")),
      desktopNav: desktopNav ? {
        rect: box(desktopNav), display: desktopNavStyle.display, visibility: desktopNavStyle.visibility,
        inert: desktopNav.inert,
        opacity: Number.parseFloat(desktopNavStyle.opacity),
        visibleLinks: [...desktopNav.querySelectorAll("a")].filter((node) => node.getBoundingClientRect().width > 0).length,
        links: [...desktopNav.querySelectorAll("a")].map((node) => {
          const style = getComputedStyle(node);
          return {
            text: node.textContent.trim(), rect: box(node), color: style.color, opacity: Number.parseFloat(style.opacity),
            visibility: style.visibility, display: style.display, fontFamily: style.fontFamily, fontSize: style.fontSize,
          };
        }),
      } : null,
      view: box(view), primary: box(primary), hero: box(hero), frame: box(frame), info: box(info),
      contentRects: {
        category: box(document.querySelector("[data-advertising-photo-category]")),
        pager: box(descriptionPager), description: box(description),
        indicator: descriptionIndicator?.hidden ? null : box(descriptionIndicator),
      },
      minimum: { infoHeight: infoMinimumHeight, imageHeight: imageMinimumHeight, descriptionLineHeight },
      frameOverflow: styles(frame)?.overflow,
      glass: glass ? {
        display: getComputedStyle(glass).display,
        shape: glass.dataset.glassShape,
        tint: getComputedStyle(glass.querySelector(".glass-surface__tint")).backgroundColor,
        steps: [...glass.querySelectorAll(".glass-surface__step")].map((step) => getComputedStyle(step).backdropFilter),
      } : null,
      containOverflow: Boolean(frameRect && foregroundRect
        && (foregroundRect.width < frameRect.width - 1 || foregroundRect.height < frameRect.height - 1)),
      layout: view?.dataset.advertisingPhotoLayout || null,
      span: Number(view?.dataset.advertisingPrimarySpan),
      relatedColumns: Number(document.querySelector("[data-advertising-photo-related-grid]")?.dataset.advertisingRelatedColumns),
      safeTop: Number.parseFloat(styles(view)?.getPropertyValue("--advertising-safe-top")) || 0,
      safeBottom: Number.parseFloat(styles(view)?.getPropertyValue("--advertising-safe-bottom")) || 0,
      primaryGap: Number.parseFloat(styles(primary)?.gap),
      foreground: foreground ? {
        rect: box(foreground), currentSrc: foreground.currentSrc, naturalWidth: foreground.naturalWidth,
        naturalHeight: foreground.naturalHeight, widthAttribute: foreground.width, heightAttribute: foreground.height,
        objectFit: foregroundStyle.objectFit,
      } : null,
      background: background ? {
        rect: box(background), currentSrc: background.currentSrc, alt: background.getAttribute("alt"),
        ariaLabel: background.getAttribute("aria-label"), ariaHidden: background.getAttribute("aria-hidden"),
        title: background.getAttribute("title"), tabIndex: background.tabIndex,
        objectFit: backgroundStyle.objectFit, pointerEvents: backgroundStyle.pointerEvents,
        filter: backgroundStyle.filter, morph: background.hasAttribute("data-advertising-photo-morph"),
      } : null,
      infoState: info ? {
        clientHeight: info.clientHeight, scrollHeight: info.scrollHeight, scrollTop: info.scrollTop,
        overflowY: infoStyle.overflowY, role: info.getAttribute("role"), tabIndex: info.tabIndex,
        ariaLabel: info.getAttribute("aria-label"),
      } : null,
      typography: {
        body: Number.parseFloat(descriptionStyle?.fontSize),
      },
      copy: {
        titleCount: document.querySelectorAll("[data-advertising-photo-title]").length,
        description: description?.textContent?.trim() || "",
        tagCount: document.querySelectorAll("[data-advertising-photo-tags], [data-advertising-photo-tag]").length,
      },
      pager: descriptionPager ? {
        index: Number(descriptionPager.dataset.pageIndex), count: Number(descriptionPager.dataset.pageCount),
        touchAction: styles(descriptionPager).touchAction,
      } : null,
      indicator: descriptionIndicator ? {
        label: descriptionIndicator.getAttribute("aria-label"), text: descriptionIndicator.textContent.trim(),
      } : null,
      suggestion: suggestion ? {
        first: visibleRelatedItems[0] === suggestion,
        inInfo: Boolean(suggestion.closest("[data-advertising-photo-info]")),
        inRelated: Boolean(suggestion.closest("[data-advertising-photo-related-grid]")),
        rank: Number(suggestion.dataset.rank), sourceOrder: Number(suggestion.dataset.sourceOrder),
        rect: box(suggestion), scrollHeight: suggestion.scrollHeight, clientHeight: suggestion.clientHeight,
        buttons: [...suggestion.querySelectorAll("[data-advertising-suggestion-tag]")].map(box),
      } : null,
      flow: flowSelectors.map((selector) => ({
        selector,
        index: [...(info?.children || [])].indexOf(info?.querySelector(`:scope > ${selector}`)),
      })),
      ctaCount: document.querySelectorAll("[data-advertising-photo-cta]").length,
      cta: cta ? {
        tag: cta.tagName, rect: box(cta), href: cta.href, target: cta.target,
        rel: cta.rel, label: cta.textContent.trim(), labelRect: box(ctaLabel),
        labelOpacity: Number.parseFloat(styles(ctaLabel)?.opacity), icon: iconMetrics(cta),
        transitionDuration: ctaStyle.transitionDuration, inInfo: info?.contains(cta) || false,
      } : null,
      expand: expand ? {
        tag: expand.tagName, rect: box(expand), label: expand.textContent.trim(),
        labelRect: box(expandLabel), labelOpacity: Number.parseFloat(styles(expandLabel)?.opacity),
        icon: iconMetrics(expand), transitionDuration: expandStyle.transitionDuration,
      } : null,
      dialogOpen: Boolean(dialog?.open || (dialog && !dialog.hidden && dialog.getAttribute("aria-hidden") !== "true")),
      related,
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    };
  });
}

function assertCore(actual, { id, locale, tag = null, normalCopyFit = false, sparseTag = false, expectedRelatedCount = null } = {}) {
  const card = cards.get(id);
  const label = `${locale} ${id} ${actual.viewport.width}x${actual.viewport.height}`;
  const ratio = card.media.width / card.media.height;
  const gutter = actual.viewport.windowWidth <= 750 ? 15 : actual.viewport.windowWidth <= 1200 ? 25 : 35;
  const expectedSpan = Math.min(3, actual.relatedColumns);
  const expectedLayout = expectedSpan === actual.relatedColumns ? "pinterest" : "split";
  const viewportBottom = actual.viewport.height - actual.safeBottom;
  const requiredPeek = 50;
  const minimumPrimaryHeight = expectedLayout === "pinterest"
    ? actual.minimum.imageHeight + actual.primaryGap + actual.minimum.infoHeight
    : Math.max(actual.minimum.imageHeight, actual.minimum.infoHeight);
  const fitsViewport = minimumPrimaryHeight <= viewportBottom - actual.primary.top;
  const fitsInfoCap = actual.minimum.infoHeight + actual.primaryGap <= actual.viewport.height * 0.28;

  assert.equal(actual.readiness.fontsStatus, "loaded", `${label}: document fonts are not loaded`);
  assert(actual.readiness.plusJakartaFaces.some(({ status }) => status === "loaded"), `${label}: Plus Jakarta Sans face is not loaded`);
  assert(actual.readiness.body500 && actual.readiness.title600, `${label}: required Plus Jakarta Sans weights are unavailable`);
  assert.equal(actual.readiness.motionReady, true, `${label}: html.motion-ready is absent`);
  if (actual.viewport.windowWidth > 750) {
    assert(actual.desktopNav && actual.desktopNav.display !== "none" && actual.desktopNav.opacity > 0.99,
      `${label}: desktop navigation is not ready`);
    if (actual.viewport.windowWidth <= 960) {
      assert(actual.desktopNav.visibility === "hidden" && actual.desktopNav.inert,
        `${label}: links that do not fit must leave the header and keyboard order`);
    } else if (actual.viewport.windowWidth > 1200) {
      assert(actual.desktopNav.visibility === "visible" && actual.desktopNav.visibleLinks === 3,
        `${label}: wide desktop links must be visible`);
    }
  }
  assert.equal(actual.span, expectedSpan, `${label}: ratio ${ratio} requires span ${expectedSpan}, got ${actual.span}`);
  assert.equal(actual.layout, expectedLayout, `${label}: expected ${expectedLayout}, got ${actual.layout}`);
  closeTo(actual.primary.top - actual.header.bottom - actual.safeTop, gutter, `${label}: expanded-header gutter`, 2);
  assert(contained(actual.hero, actual.primary), `${label}: hero leaves primary bounds`);
  assert(contained(actual.info, actual.primary), `${label}: info leaves primary bounds`);
  assert(actual.hero.height >= actual.minimum.imageHeight - 1, `${label}: image zone is below its control floor`);
  assert(actual.info.height >= actual.minimum.infoHeight - 1, `${label}: info is below its readable floor`);
  assert(actual.contentRects.pager.height >= actual.minimum.descriptionLineHeight - 1,
    `${label}: description lacks one complete line`);
  for (const [name, rect] of Object.entries(actual.contentRects)) {
    if (name !== "description" && rect) assert(contained(rect, actual.info), `${label}: ${name} is clipped outside info`);
  }
  assert(actual.infoState.scrollHeight <= actual.infoState.clientHeight + 1,
    `${label}: info content is clipped`);
  if (fitsViewport) {
    assert(actual.primary.bottom <= viewportBottom + 1.5,
      `${label}: primary bottom ${actual.primary.bottom} exceeds viewport ${viewportBottom} despite fitting floors`);
  }
  if (expectedLayout === "pinterest") {
    if (fitsInfoCap) assert(actual.info.height + actual.primaryGap <= actual.viewport.height * 0.28 + 1.5,
      `${label}: description and gap exceed the viewport-based 28% cap despite fitting floors`);
    closeTo(actual.frame.height, actual.foreground.rect.height, `${label}: Pinterest image has vertical blur overflow`, 1.5);
  }
  assert.equal(actual.horizontalOverflow, 0, `${label}: horizontal overflow ${actual.horizontalOverflow}px`);
  assert(!overlaps(actual.hero, actual.info), `${label}: hero overlaps info`);
  for (const related of actual.related) assert(!overlaps(actual.primary, related.rect), `${label}: primary overlaps ${related.id}`);

  const below = actual.related
    .filter((entry) => entry.image && entry.image.rect.top >= actual.primary.bottom + gutter - 2)
    .map((entry) => ({
      id: entry.id,
      visiblePeek: Math.max(0, Math.min(entry.image.rect.bottom, viewportBottom) - entry.image.rect.top),
    }))
    .sort((a, b) => b.visiblePeek - a.visiblePeek);
  if (fitsViewport) assert(below.length > 0, `${label}: no real related image starts below primary with ${gutter}px gutter`);
  if (expectedLayout === "split" && fitsViewport) {
    assert(below[0].visiblePeek >= requiredPeek - 2,
      `${label}: real related image peek ${below[0].visiblePeek}px is below ${requiredPeek}px`);
  }

  assert(actual.foreground?.naturalWidth > 0 && actual.foreground?.naturalHeight > 0, `${label}: foreground is not hydrated`);
  assert.equal(actual.foreground.objectFit, "contain", `${label}: foreground must use object-fit contain`);
  closeTo(actual.foreground.naturalWidth / actual.foreground.naturalHeight,
    actual.foreground.widthAttribute / actual.foreground.heightAttribute, `${label}: foreground identity ratio`, 0.005);
  assert(actual.background, `${label}: decorative background is missing`);
  assert.equal(actual.background.currentSrc, actual.foreground.currentSrc, `${label}: background and foreground use different photos`);
  assert.equal(actual.background.alt, "", `${label}: background alt must be empty`);
  assert(!actual.background.ariaLabel && !actual.background.title, `${label}: background has an accessible name`);
  assert(actual.background.tabIndex < 0, `${label}: background is keyboard focusable`);
  assert.equal(actual.background.pointerEvents, "none", `${label}: background accepts pointer input`);
  assert.equal(actual.background.objectFit, "cover", `${label}: background must use object-fit cover`);
  // The photo carries the full step's blur so a tab-hover raster tile cannot split it; the Kính keeps tint and grain.
  assert.equal(actual.background.filter, "blur(100px) saturate(1.7) brightness(1.04)", `${label}: background does not carry the full Kính blur`);
  assert.equal(actual.glass?.shape, "even", `${label}: photo overflow is not the even Kính`);
  assert.equal(actual.glass.display, actual.containOverflow ? "block" : "none", `${label}: Kính does not follow contain overflow`);
  assert.deepEqual(actual.glass.steps, [], `${label}: photo Kính still has a backdrop blur step`);
  assert.equal(actual.glass.tint, "rgba(255, 255, 255, 0.12)", `${label}: photo overflow changed the Kính tint`);
  assert(!actual.background.morph, `${label}: background participates in morph`);
  assert(["hidden", "clip"].includes(actual.frameOverflow), `${label}: hero frame does not clip decorative background`);
  if (actual.containOverflow) {
    assert(actual.background.rect.left <= actual.frame.left + 2 && actual.background.rect.right >= actual.frame.right - 2
      && actual.background.rect.top <= actual.frame.top + 2 && actual.background.rect.bottom >= actual.frame.bottom - 2,
    `${label}: background does not cover hero frame`);
  }

  assert.deepEqual(actual.flow.map(({ index }) => index), [0, 1, 2, 3], `${label}: info flow is not category-pager-indicator-CTA`);
  assert.equal(actual.suggestion?.inInfo, expectedLayout === "split", `${label}: suggestion owner does not match primary span`);
  assert.equal(actual.suggestion?.inRelated, expectedLayout === "pinterest", `${label}: suggestion related-grid ownership is wrong`);
  assert.equal(actual.suggestion?.first, expectedLayout === "pinterest", `${label}: suggestion order does not match layout`);
  assert.deepEqual([actual.suggestion.rank, actual.suggestion.sourceOrder], [0, 0], `${label}: suggestion does not own rank/sourceOrder zero`);
  assert(actual.suggestion.scrollHeight <= actual.suggestion.clientHeight + 1, `${label}: suggestion content is clipped`);
  assert.equal(actual.suggestion.buttons.length, 4, `${label}: suggestion does not expose four buttons`);
  for (const button of actual.suggestion.buttons) assert(contained(button, actual.suggestion.rect), `${label}: suggestion button leaves its solver cell`);
  assert.equal(actual.copy.tagCount, 0, `${label}: redundant photo tag row is present`);
  assert.equal(actual.copy.titleCount, 0, `${label}: image title remains in detail`);
  assert(actual.infoState?.ariaLabel?.trim(), `${label}: photo information has no accessible region label`);
  closeTo(actual.typography.body, actual.viewport.rootFontSize, `${label}: body size follows root scale`, 0.1);
  const canonicalDescription = locale === "vi" ? card.descriptionVi : card.descriptionEn;
  assert(actual.copy.description && canonicalDescription.startsWith(actual.copy.description), `${label}: visible description page is not canonical copy`);
  assert(actual.pager?.count >= 1 && actual.pager.index >= 0 && actual.pager.index < actual.pager.count, `${label}: description pager state is invalid`);
  assert(actual.indicator?.label && actual.indicator.text, `${label}: description indicator is not accessible`);
  if (normalCopyFit) {
    assert(actual.infoState.scrollHeight <= actual.infoState.clientHeight + 2,
      `${label}: normal copy scrolls ${actual.infoState.scrollHeight - actual.infoState.clientHeight}px`);
  }
  if (sparseTag) {
    assert.equal(new URL(actual.url).searchParams.get("tag"), tag, `${label}: sparse tag was not retained`);
    if (expectedRelatedCount !== null) {
      assert.equal(actual.related.length, expectedRelatedCount, `${label}: sparse tag produced ${actual.related.length} related cards`);
    } else assert(actual.related.length > 0 && actual.related.length <= 5, `${label}: sparse tag produced ${actual.related.length} related cards`);
  }
  return { label, ratio, gutter, expectedSpan, expectedLayout, requiredPeek, bestBelow: below[0],
    minimumPrimaryHeight, fitsViewport, fitsInfoCap };
}

function assertControls(actual, locale) {
  const label = `${locale} controls ${actual.viewport.width}x${actual.viewport.height}`;
  assert.equal(actual.ctaCount, 1, `${label}: expected one CTA, got ${actual.ctaCount}`);
  assert.equal(actual.cta?.tag, "A", `${label}: CTA is not a native link`);
  assert.equal(actual.cta.href, "https://zalo.me/", `${label}: CTA href changed`);
  assert.equal(actual.cta.target, "_blank", `${label}: CTA target changed`);
  assert(actual.cta.rel.split(/\s+/).includes("noreferrer"), `${label}: CTA rel lacks noreferrer`);
  assert(actual.cta.label.includes(locale === "vi" ? "Trao đổi ý tưởng" : "Discuss an idea"), `${label}: CTA label changed`);
  assert(actual.expand.label.includes(locale === "vi" ? "Xem lớn hơn" : "View larger"), `${label}: expand label changed`);
  assert.equal(actual.cta.inInfo, true, `${label}: CTA is not inside the information column`);
  assert(contained(actual.cta.rect, actual.info), `${label}: CTA leaves the information column`);
  assert(actual.cta.rect.height >= 48, `${label}: CTA misses its minimum target height`);
  assert(actual.cta.labelRect.width > 0 && actual.cta.labelOpacity >= 0.99, `${label}: CTA label is not visible`);
  closeTo(actual.cta.icon.contentWidth, 20, `${label}: CTA glyph width`, 1);
  closeTo(actual.cta.icon.contentHeight, 20, `${label}: CTA glyph height`, 1);
  closeTo(actual.expand.rect.width, 48, `${label}: expand normal width`, 1);
  closeTo(actual.expand.rect.height, 48, `${label}: expand normal height`, 1);
  assert(contained(actual.expand.rect, actual.frame), `${label}: expand leaves hero frame`);
  closeTo((actual.expand.icon.rect.left + actual.expand.icon.rect.right) / 2, (actual.expand.rect.left + actual.expand.rect.right) / 2,
    `${label}: expand icon horizontal center`, 2);
  closeTo((actual.expand.icon.rect.top + actual.expand.icon.rect.bottom) / 2, (actual.expand.rect.top + actual.expand.rect.bottom) / 2,
    `${label}: expand icon vertical center`, 2);
  closeTo(actual.expand.icon.contentWidth, 20, `${label}: expand glyph width`, 1);
  closeTo(actual.expand.icon.contentHeight, 20, `${label}: expand glyph height`, 1);
  assert(actual.frame.right - actual.expand.rect.right >= 6 && actual.frame.right - actual.expand.rect.right <= 18,
    `${label}: expand is not anchored right`);
  assert(!overlaps(actual.cta.rect, actual.expand.rect), `${label}: CTA and expand collide across columns`);
}

async function focusByKeyboard(page, selector) {
  await page.bringToFront();
  if (selector === "[data-advertising-photo-cta]"
    && await page.evaluate(() => document.activeElement?.matches("[data-advertising-photo-expand]"))) {
    await page.keyboard.press("Shift+Tab");
    if (await page.evaluate((value) => document.activeElement?.matches(value), selector)) return;
  }
  await page.evaluate(() => document.activeElement?.blur());
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await page.keyboard.press("Tab");
    if (await page.evaluate((value) => document.activeElement?.matches(value), selector)) return;
  }
  throw new Error(`Keyboard focus did not reach ${selector}`);
}

async function assertExpandedControl(page, selector, otherSelector, mode, label) {
  const control = page.locator(selector);
  if (mode === "hover") await control.hover();
  else await focusByKeyboard(page, selector);
  if (!await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)) await page.waitForTimeout(350);
  const state = await page.evaluate(({ selector, otherSelector }) => {
    const node = document.querySelector(selector);
    const other = document.querySelector(otherSelector);
    const labelNode = node?.querySelector("span:not([aria-hidden='true'])");
    const labelRange = labelNode ? document.createRange() : null;
    if (labelNode && labelRange) labelRange.selectNodeContents(labelNode);
    const iconPath = node?.querySelector("svg path");
    return {
      control: node?.getBoundingClientRect().toJSON(), other: other?.getBoundingClientRect().toJSON(),
      label: labelRange?.getBoundingClientRect().toJSON(), opacity: Number.parseFloat(getComputedStyle(labelNode).opacity),
      icon: iconPath?.getBoundingClientRect().toJSON(),
    };
  }, { selector, otherSelector });
  assert(state.control.width > 48, `${label}: ${mode} label did not expand`);
  assert(state.label.width > 0 && state.opacity >= 0.9,
    `${label}: ${mode} label is not visible (width ${state.label.width}, opacity ${state.opacity})`);
  closeTo(state.label.left - state.control.left, state.control.right - state.icon.right,
    `${label}: ${mode} horizontal edge spacing`, 1);
  assert(!overlaps(state.control, state.other), `${label}: ${mode} label covers the other control`);
  return state;
}

async function activateWithoutViewer(page, context, action, externalRequests, label) {
  const cta = page.locator("[data-advertising-photo-cta]");
  const sourceUrl = page.url();
  const requestCount = externalRequests.length;
  if (action === "modified") {
    await page.evaluate(() => {
      window.__adP14ModifiedClick = null;
      window.addEventListener("click", (event) => {
        if (event.target.closest?.("[data-advertising-photo-cta]")) {
          window.__adP14ModifiedClick = {
            ctrlKey: event.ctrlKey, metaKey: event.metaKey, button: event.button,
            defaultPrevented: event.defaultPrevented,
          };
        }
      }, { once: true });
    });
    await cta.click({ modifiers: ["Control"] });
    await page.waitForTimeout(100);
    const event = await page.evaluate(() => window.__adP14ModifiedClick);
    assert.deepEqual(event, { ctrlKey: true, metaKey: false, button: 0, defaultPrevented: false },
      `${label}: modified click was intercepted`);
    for (const popup of context.pages().filter((entry) => entry !== page)) await popup.close().catch(() => {});
    assert.equal(page.url(), sourceUrl, `${label}: modified click changed source-page location`);
    const dialogOpen = await page.locator("[data-advertising-photo-dialog]").evaluate((node) => Boolean(node.open));
    assert.equal(dialogOpen, false, `${label}: modified click opened viewer`);
    return;
  }
  if (action === "keyboard") await focusByKeyboard(page, "[data-advertising-photo-cta]");
  const activate = action === "keyboard" ? () => page.keyboard.press("Enter")
    : action === "touch" ? () => cta.tap()
      : () => cta.click();
  const [popup] = await Promise.all([
    page.waitForEvent("popup", { timeout: 4_000 }),
    activate(),
  ]).catch((error) => {
    throw new Error(`${label}: ${action}: ${error.message}`);
  });
  await popup.close().catch(() => {});
  assert.equal(page.url(), sourceUrl, `${label}: ${action} changed source-page location`);
  assert(externalRequests.length > requestCount, `${label}: ${action} did not preserve native link navigation`);
  assert(externalRequests.slice(requestCount).every((url) => new URL(url).origin === "https://zalo.me"),
    `${label}: ${action} attempted unexpected external navigation`);
  const dialogOpen = await page.locator("[data-advertising-photo-dialog]").evaluate((node) => Boolean(node.open));
  assert.equal(dialogOpen, false, `${label}: ${action} opened viewer`);
  assert.equal(context.pages().filter((entry) => entry !== page && !entry.isClosed()).length, 0, `${label}: popup was left open`);
}

async function screenshot(page, label) {
  const file = path.join(outputDirectory, `${artifactPrefix}-${safeName(label)}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function wheelToHit(page, locator, label) {
  const viewport = page.viewportSize();
  await page.mouse.move(10, Math.max(120, viewport.height / 2));
  const inspect = () => locator.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const headerBottom = document.querySelector("[data-site-header]")?.getBoundingClientRect().bottom || 0;
    const top = Math.max(rect.top, headerBottom + 2);
    const bottom = Math.min(rect.bottom, innerHeight - 2);
    const x = rect.left + rect.width / 2;
    const y = (top + bottom) / 2;
    return { rect: rect.toJSON(), x, y, visible: bottom > top,
      hit: bottom > top && node.contains(document.elementFromPoint(x, y)) };
  });
  // Locomotive 4 counts each wheel event as one tick (about 43px on Linux Chromium), so far targets need many steps.
  for (let attempt = 0; attempt < 40; attempt += 1) {
    let state = await inspect();
    let stable = 0;
    for (let sample = 0; sample < 50 && stable < 3; sample += 1) {
      await page.waitForTimeout(80);
      const next = await inspect();
      stable = Math.abs(next.rect.top - state.rect.top) <= 0.25 ? stable + 1 : 0;
      state = next;
    }
    assert(stable >= 3, `${label}: target geometry did not settle after wheel`);
    if (state.visible) {
      assert(state.hit, `${label}: visible control is covered at its pointer target`);
      return state;
    }
    const direction = state.rect.top >= viewport.height ? 1 : -1;
    const distance = direction > 0 ? state.rect.top - viewport.height * 0.65
      : viewport.height * 0.35 - state.rect.bottom;
    const beforeTop = await page.locator("[data-advertising-photo-primary]").evaluate((node) => node.getBoundingClientRect().top);
    await page.mouse.wheel(0, direction * Math.min(300, Math.max(60, distance)));
    await page.waitForFunction((previous) => document.querySelector("[data-advertising-photo-primary]")?.getBoundingClientRect().top !== previous,
      beforeTop, { timeout: 4_000 })
      .catch(() => { throw new Error(`${label}: wheel stalled, target ${state.rect.top}-${state.rect.bottom}`); });
  }
  throw new Error(`${label}: real wheel did not reach target`);
}

async function assertNonfitReachability(page, context, externalRequests, test, initial) {
  const relatedId = initial.related.at(-1).id;
  const geometry = () => page.evaluate((id) => {
    const position = (selector) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      return rect?.toJSON() || null;
    };
    return {
      primary: position("[data-advertising-photo-primary]"),
      hero: position("[data-advertising-photo-hero]"),
      info: position("[data-advertising-photo-info]"),
      indicator: position("[data-advertising-photo-description-indicator]"),
      cta: position("[data-advertising-photo-cta]"),
      related: (() => {
        const rect = [...document.querySelectorAll("[data-advertising-related-card]")]
          .find((node) => node.dataset.advertisingRelatedCard === id)?.getBoundingClientRect();
        return rect?.toJSON() || null;
      })(),
      pageHeight: document.scrollingElement.scrollHeight,
    };
  }, relatedId);
  const before = await geometry();
  assert(before.pageHeight > initial.viewport.height, `${test.label}: nonfit content has no document scroll`);
  assertControls(initial, test.locale);
  const expand = await wheelToHit(page, page.locator("[data-advertising-photo-expand]"), `${test.label}: expand`);
  await page.mouse.click(expand.x, expand.y);
  await page.waitForFunction(() => Boolean(document.querySelector("[data-advertising-photo-dialog]")?.open));
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector("[data-advertising-photo-dialog]")?.open);

  const indicator = await wheelToHit(page, page.locator("[data-advertising-photo-description-indicator]"), `${test.label}: indicator`);
  await page.locator("[data-advertising-photo-description-pager]").focus();
  for (let index = 1; index < initial.pager.count; index += 1) await page.keyboard.press("ArrowRight");
  const finalPage = await page.locator("[data-advertising-photo-description-pager]").evaluate((node) => ({
    index: Number(node.dataset.pageIndex), count: Number(node.dataset.pageCount),
    text: node.querySelector("[data-advertising-photo-description]")?.textContent.trim() || "",
  }));
  assert.equal(finalPage.index, finalPage.count - 1, `${test.label}: final description page is unreachable`);
  const canonical = cards.get(test.id)[test.locale === "vi" ? "descriptionVi" : "descriptionEn"];
  assert(finalPage.text && canonical.endsWith(finalPage.text), `${test.label}: final description text is incomplete`);

  const cta = await wheelToHit(page, page.locator("[data-advertising-photo-cta]"), `${test.label}: CTA`);
  await activateWithoutViewer(page, context, "pointer", externalRequests, test.label);
  const related = await wheelToHit(page, page.locator(`[data-advertising-related-card="${relatedId}"]`), `${test.label}: related`);
  const after = await geometry();
  closeTo(after.primary.width, before.primary.width, `${test.label}: primary width changed during scroll`, 1);
  closeTo(after.primary.height, before.primary.height, `${test.label}: primary height changed during scroll`, 1);
  for (const name of ["primary", "hero", "info", "indicator", "cta", "related"]) {
    for (const edge of ["top", "bottom", "left", "right"]) {
      const relativeBefore = before[name][edge] - before.primary[edge];
      const relativeAfter = after[name][edge] - after.primary[edge];
      closeTo(relativeAfter, relativeBefore, `${test.label}: ${name} ${edge} moved relative to primary during scroll`, 1);
    }
  }
  assert.equal(after.pageHeight, before.pageHeight, `${test.label}: page height changed during scroll`);
  return { indicator, finalPage, cta, related, before, after };
}

async function runPageCase(browser, test) {
  if (labelFilter && !test.label.includes(labelFilter)) return;
  const started = Date.now();
  const context = await browser.newContext({
    viewport: test.viewport,
    locale: test.locale === "vi" ? "vi-VN" : "en-US",
    reducedMotion: test.reducedMotion ? "reduce" : "no-preference",
    hasTouch: Boolean(test.hasTouch),
  });
  const externalRequests = [];
  await context.route("**/*", async (requestRoute) => {
    const request = requestRoute.request();
    const url = request.url();
    if (new URL(url).origin !== baseOrigin && request.isNavigationRequest() && request.resourceType() === "document") {
      externalRequests.push(url);
      await requestRoute.abort("blockedbyclient");
    } else await requestRoute.continue();
  });
  const page = await context.newPage();
  const diagnostics = attachDiagnostics(page);
  let stage = "navigate";
  let observed = null;
  let beforeText = null;
  try {
    await page.goto(new URL(route(test.locale, test.id, test.tag), baseUrl).href, { waitUntil: "domcontentloaded" });
    stage = "settle";
    await settle(page);
    if (test.textScale) {
      stage = "text-200pct";
      beforeText = await evidence(page);
      await page.evaluate((scale) => {
        const root = document.documentElement;
        root.style.fontSize = `${Number.parseFloat(getComputedStyle(root).fontSize) * scale}px`;
        dispatchEvent(new Event("resize"));
      }, test.textScale);
      await settle(page);
    }
    stage = "core";
    observed = await evidence(page);
    const expected = assertCore(observed, test);
    if (beforeText) {
      closeTo(observed.typography.body / beforeText.typography.body, test.textScale,
        `${test.label}: already-loaded body scale`, 0.03);
      assert.equal(observed.viewport.width, beforeText.viewport.width, `${test.label}: text resize changed viewport width`);
      assert.equal(observed.viewport.height, beforeText.viewport.height, `${test.label}: text resize changed viewport height`);
      if (test.verifyTextAllocation !== false) {
        assert(observed.pager.count >= beforeText.pager.count,
          `${test.label}: scaled text reduced description pages (${beforeText.pager.count} to ${observed.pager.count})`);
        assert(observed.infoState.scrollHeight <= observed.infoState.clientHeight + 2,
          `${test.label}: scaled description introduced an inner scroller`);
      }
      observed.textBefore = beforeText;
    }
    if (!expected.fitsViewport || (expected.expectedLayout === "pinterest" && !expected.fitsInfoCap)) {
      stage = "nonfit-reachability";
      observed.nonfit = await assertNonfitReachability(page, context, externalRequests, test, observed);
    }
    if (test.controls || test.touchOnly) {
      stage = "controls-normal";
      assertControls(observed, test.locale);
    }
    if (test.controls) {
      stage = "controls-hover-focus";
      const hoverExpand = await assertExpandedControl(page, "[data-advertising-photo-expand]", "[data-advertising-photo-cta]", "hover", test.label);
      await page.mouse.move(0, 0);
      const focusExpand = await assertExpandedControl(page, "[data-advertising-photo-expand]", "[data-advertising-photo-cta]", "focus", test.label);
      stage = "controls-activation";
      await activateWithoutViewer(page, context, "keyboard", externalRequests, test.label);
      await activateWithoutViewer(page, context, "pointer", externalRequests, test.label);
      await activateWithoutViewer(page, context, "modified", externalRequests, test.label);
      observed.controls = { hoverExpand, focusExpand, externalRequests: [...externalRequests] };
    }
    if (test.touchOnly) {
      stage = "controls-touch";
      await activateWithoutViewer(page, context, "touch", externalRequests, test.label);
      observed.touch = { externalRequests: [...externalRequests] };
    }
    if (test.textScale) {
      stage = "text-reaches-end";
      const pager = page.locator("[data-advertising-photo-description-pager]");
      await pager.focus();
      for (let index = 1; index < observed.pager.count; index += 1) await page.keyboard.press("ArrowRight");
      const end = await page.evaluate(() => {
        const pagerNode = document.querySelector("[data-advertising-photo-description-pager]");
        const info = document.querySelector("[data-advertising-photo-info]");
        return {
          index: Number(pagerNode?.dataset.pageIndex), count: Number(pagerNode?.dataset.pageCount),
          infoScrollTop: info?.scrollTop || 0,
        };
      });
      assert.equal(end.index, end.count - 1, `${test.label}: final description page is unreachable`);
      assert.equal(end.infoScrollTop, 0, `${test.label}: description pager scrolled its container`);
      observed.textEnd = end;
    }
    if (test.reducedMotion) {
      stage = "reduced-motion";
      assert.equal(observed.reducedMotion, true, `${test.label}: reduced motion media query is false`);
      assert.equal(observed.readiness.motionEnabled, false, `${test.label}: reduced motion enabled GSAP motion`);
      const durations = `${observed.cta.transitionDuration},${observed.expand.transitionDuration}`
        .split(",").map((value) => Number.parseFloat(value) || 0);
      assert(durations.every((value) => value <= 0.00001), `${test.label}: controls retain transition duration ${durations}`);
    }
    stage = "diagnostics";
    assert.deepEqual(diagnostics, [], `${test.label}: local runtime diagnostics ${JSON.stringify(diagnostics)}`);
    const screenshotPath = screenshotSamples.has(test.label) ? await screenshot(page, test.label) : null;
    results.push({ label: test.label, status: "passed", durationMs: Date.now() - started, stage, test, expected, observed, diagnostics, screenshot: screenshotPath });
  } catch (error) {
    const screenshotPath = screenshotSamples.has(test.label)
      ? await screenshot(page, `${test.label}-failed`).catch(() => null)
      : null;
    results.push({
      label: test.label, status: "failed", durationMs: Date.now() - started, stage, test, observed, diagnostics,
      error: error instanceof Error ? error.message : String(error), screenshot: screenshotPath,
    });
  } finally {
    await context.close();
  }
}

async function runResizeOrientation(browser) {
  const label = "resize-orientation-vi-kiosk-posm-06";
  if (labelFilter && !label.includes(labelFilter)) return;
  const sizes = [{ width: 390, height: 844 }, { width: 1569, height: 912 }, { width: 844, height: 390 }, { width: 390, height: 844 }];
  const context = await browser.newContext({ viewport: sizes[0], locale: "vi-VN" });
  const page = await context.newPage();
  const diagnostics = attachDiagnostics(page);
  const observations = [];
  const started = Date.now();
  let stage = "navigate";
  try {
    await page.goto(new URL(route("vi", "kiosk-posm-06"), baseUrl).href, { waitUntil: "domcontentloaded" });
    await settle(page);
    for (const viewport of sizes) {
      stage = `${viewport.width}x${viewport.height}`;
      await page.setViewportSize(viewport);
      await page.evaluate(() => scrollTo(0, 0));
      await settle(page);
      const observed = await evidence(page);
      const expected = assertCore(observed, { id: "kiosk-posm-06", locale: "vi" });
      observations.push({ viewport, expected, observed });
    }
    assert.equal(observations[0].observed.layout, observations[3].observed.layout, `${label}: returning to portrait viewport changed layout`);
    assert.equal(observations[0].observed.span, observations[3].observed.span, `${label}: returning to portrait viewport changed span`);
    assert.deepEqual(diagnostics, [], `${label}: local runtime diagnostics ${JSON.stringify(diagnostics)}`);
    results.push({ label, status: "passed", durationMs: Date.now() - started, stage, sizes, observations, diagnostics });
  } catch (error) {
    const screenshotPath = null;
    results.push({ label, status: "failed", durationMs: Date.now() - started, stage, sizes, observations, diagnostics, error: error instanceof Error ? error.message : String(error), screenshot: screenshotPath });
  } finally {
    await context.close();
  }
}

async function runP7PinterestContract(browser, locale) {
  const label = `p7-pinterest-${locale}-360x800`;
  if (labelFilter && !label.includes(labelFilter)) return;
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, hasTouch: true,
    locale: locale === "vi" ? "vi-VN" : "en-US" });
  const page = await context.newPage();
  const diagnostics = attachDiagnostics(page);
  const started = Date.now();
  let stage = "navigate";
  try {
    await page.goto(new URL(route(locale, "kiosk-posm-09"), baseUrl).href, { waitUntil: "domcontentloaded" });
    await settle(page);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "32px";
      dispatchEvent(new Event("resize"));
    });
    await settle(page);

    stage = "geometry";
    const initial = await page.evaluate(() => {
      const rect = (selector) => document.querySelector(selector)?.getBoundingClientRect().toJSON() || null;
      const view = document.querySelector("[data-advertising-photo-view]");
      const primary = document.querySelector("[data-advertising-photo-primary]");
      const frame = document.querySelector(".advertising-photo-view__hero-frame");
      const image = document.querySelector("[data-advertising-photo-image]");
      const info = document.querySelector("[data-advertising-photo-info]");
      const pager = document.querySelector("[data-advertising-photo-description-pager]");
      const indicator = document.querySelector("[data-advertising-photo-description-indicator]");
      const relatedGrid = document.querySelector("[data-advertising-photo-related-grid]");
      const suggestion = document.querySelector("[data-advertising-suggestion-card]");
      const frameRect = frame?.getBoundingClientRect();
      const imageRect = image?.getBoundingClientRect();
      const glass = frame?.querySelector(":scope > .glass-surface");
      const items = [...(relatedGrid?.children || [])].filter((node) => node.getBoundingClientRect().width > 0);
      return {
        viewportHeight: visualViewport?.height || innerHeight,
        columns: Number(relatedGrid?.dataset.advertisingRelatedColumns),
        span: Number(view?.dataset.advertisingPrimarySpan),
        layout: view?.dataset.advertisingPhotoLayout,
        primary: rect("[data-advertising-photo-primary]"), hero: rect("[data-advertising-photo-hero]"),
        info: rect("[data-advertising-photo-info]"), gap: Number.parseFloat(getComputedStyle(primary).gap) || 0,
        infoOverflowY: getComputedStyle(info).overflowY, infoOverscroll: getComputedStyle(info).overscrollBehaviorY,
        infoScrollTop: info?.scrollTop || 0, infoScrollHeight: info?.scrollHeight || 0, infoClientHeight: info?.clientHeight || 0,
        pager: pager ? { index: Number(pager.dataset.pageIndex), count: Number(pager.dataset.pageCount),
          touchAction: getComputedStyle(pager).touchAction } : null,
        indicator: indicator ? { label: indicator.getAttribute("aria-label"), text: indicator.textContent.trim() } : null,
        containOverflow: Boolean(frameRect && imageRect && (imageRect.width < frameRect.width - 1 || imageRect.height < frameRect.height - 1)),
        glassActive: Boolean(glass && getComputedStyle(glass).display !== "none"),
        suggestion: suggestion ? { first: items[0] === suggestion,
          inInfo: Boolean(suggestion.closest("[data-advertising-photo-info]")),
          inRelated: Boolean(suggestion.closest("[data-advertising-photo-related-grid]")),
          rank: Number(suggestion.dataset.rank),
          sourceOrder: Number(suggestion.dataset.sourceOrder), ariaHidden: suggestion.getAttribute("aria-hidden"),
          rect: suggestion.getBoundingClientRect().toJSON(), scrollHeight: suggestion.scrollHeight,
          clientHeight: suggestion.clientHeight,
          buttons: [...suggestion.querySelectorAll("[data-advertising-suggestion-tag]")]
            .map((node) => node.getBoundingClientRect().toJSON()) } : null,
        hasBack: Boolean(document.querySelector("[data-advertising-photo-back]")),
        viewerTouchAction: getComputedStyle(document.querySelector("[data-advertising-photo-viewport]")).touchAction,
      };
    });
    assert.equal(initial.span, initial.columns, `${label}: fixture must exercise full-span mode`);
    assert.equal(initial.layout, "pinterest", `${label}: full span did not select Pinterest mode`);
    assert(initial.primary.bottom <= initial.viewportHeight + 1.5, `${label}: primary extends below viewport`);
    assert(initial.info.height + initial.gap <= initial.viewportHeight * 0.28 + 1.5,
      `${label}: description and gap exceed the viewport-based 28% cap`);
    closeTo(initial.hero.height + initial.gap + initial.info.height, initial.primary.height, `${label}: primary vertical allocation`, 2);
    assert(!["auto", "scroll"].includes(initial.infoOverflowY), `${label}: description retains inner scroll`);
    assert.notEqual(initial.infoOverscroll, "contain", `${label}: description traps document scroll`);
    assert(initial.pager?.count >= 2 && initial.pager.index === 0, `${label}: overflow copy was not paginated`);
    assert.equal(initial.pager.touchAction, "pan-y", `${label}: pager blocks vertical touch scroll`);
    assert(initial.indicator?.label && initial.indicator.text, `${label}: page indicator is not accessible`);
    assert.equal(initial.glassActive, initial.containOverflow, `${label}: zoom-glass does not follow contain overflow`);
    assert.equal(initial.suggestion?.inInfo, initial.layout === "split", `${label}: suggestion owner does not match primary span`);
    assert.equal(initial.suggestion?.inRelated, initial.layout === "pinterest", `${label}: suggestion related-grid ownership is wrong`);
    assert.equal(initial.suggestion?.first, initial.layout === "pinterest", `${label}: suggestion order does not match layout`);
    assert.deepEqual([initial.suggestion.rank, initial.suggestion.sourceOrder], [0, 0], `${label}: suggestion is not rank/sourceOrder zero`);
    assert.notEqual(initial.suggestion.ariaHidden, "true", `${label}: first suggestion is hidden from accessibility tree`);
    assert(initial.suggestion.scrollHeight <= initial.suggestion.clientHeight + 1, `${label}: suggestion content is clipped`);
    assert.equal(initial.suggestion.buttons.length, 4, `${label}: suggestion does not expose four buttons`);
    for (const button of initial.suggestion.buttons) assert(contained(button, initial.suggestion.rect), `${label}: suggestion button leaves its solver cell`);
    assert.equal(initial.hasBack, false, `${label}: dedicated Back control returned`);
    assert.equal(initial.viewerTouchAction, "none", `${label}: fullscreen viewer lost exclusive pan/zoom gestures`);

    const pager = page.locator("[data-advertising-photo-description-pager]");
    const pageIndex = () => pager.evaluate((node) => Number(node.dataset.pageIndex));
    const resetPager = async () => {
      await pager.focus();
      for (let index = 0; index < initial.pager.count; index += 1) await page.keyboard.press("ArrowLeft");
      await page.waitForFunction(() => document.querySelector("[data-advertising-photo-description-pager]")?.dataset.pageIndex === "0");
    };
    const expectAdvance = async (action, actionLabel) => {
      await resetPager();
      await action();
      await page.waitForFunction(() => Number(document.querySelector("[data-advertising-photo-description-pager]")?.dataset.pageIndex) > 0);
      assert((await pageIndex()) > 0, `${label}: ${actionLabel} did not advance pager`);
    };

    stage = "pager-input";
    await expectAdvance(async () => page.keyboard.press("ArrowRight"), "ArrowRight");
    await expectAdvance(async () => {
      const box = await pager.boundingBox();
      await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 5 });
      await page.mouse.up();
    }, "mouse drag");
    await expectAdvance(async () => {
      await pager.hover();
      await page.mouse.wheel(180, 0);
    }, "trackpad delta-x");
    await expectAdvance(async () => pager.dispatchEvent("pointerdown", { pointerId: 7, pointerType: "touch", clientX: 300, clientY: 100, bubbles: true })
      .then(() => pager.dispatchEvent("pointermove", { pointerId: 7, pointerType: "touch", clientX: 80, clientY: 104, bubbles: true }))
      .then(() => pager.dispatchEvent("pointerup", { pointerId: 7, pointerType: "touch", clientX: 80, clientY: 104, bubbles: true })), "touch swipe");
    await resetPager();
    await pager.dispatchEvent("pointerdown", { pointerId: 8, pointerType: "touch", clientX: 300, clientY: 100, bubbles: true });
    await pager.dispatchEvent("pointermove", { pointerId: 8, pointerType: "touch", clientX: 80, clientY: 104, bubbles: true });
    await pager.dispatchEvent("pointercancel", { pointerId: 8, pointerType: "touch", clientX: 80, clientY: 104, bubbles: true });
    assert.equal(await pageIndex(), 0, `${label}: pointercancel changed the description page`);

    stage = "vertical-scroll";
    for (const selector of ["[data-advertising-photo-hero]", "[data-advertising-photo-info]", "[data-advertising-suggestion-card]"]) {
      await page.evaluate(() => scrollTo(0, 0));
      await page.locator(selector).hover();
      const beforeScroll = await page.evaluate(() => scrollY);
      await page.mouse.wheel(0, 320);
      await page.waitForFunction((before) => scrollY > before, beforeScroll);
      assert((await page.evaluate(() => scrollY)) > beforeScroll, `${label}: ${selector} trapped vertical page scroll`);
    }
    assert.deepEqual(diagnostics, [], `${label}: local runtime diagnostics ${JSON.stringify(diagnostics)}`);
    results.push({ label, status: "passed", durationMs: Date.now() - started, stage, observed: initial, diagnostics });
  } catch (error) {
    results.push({ label, status: "failed", durationMs: Date.now() - started, stage, diagnostics,
      error: error instanceof Error ? error.message : String(error) });
  } finally {
    await context.close();
  }
}

async function runP7SuggestionCellContract(browser, locale) {
  const label = `p7-suggestion-${locale}-1005x900`;
  if (labelFilter && !label.includes(labelFilter)) return;
  const context = await browser.newContext({ viewport: { width: 1005, height: 900 },
    locale: locale === "vi" ? "vi-VN" : "en-US" });
  const page = await context.newPage();
  const diagnostics = attachDiagnostics(page);
  const started = Date.now();
  let stage = "navigate";
  try {
    await page.goto(new URL(route(locale, "kiosk-posm-09"), baseUrl).href, { waitUntil: "domcontentloaded" });
    await settle(page);
    stage = "suggestion-cell";
    const state = await page.evaluate(() => {
      const suggestion = document.querySelector("[data-advertising-suggestion-card]");
      const relatedGrid = document.querySelector("[data-advertising-photo-related-grid]");
      const rect = suggestion?.getBoundingClientRect().toJSON();
      const items = [...(relatedGrid?.children || [])].filter((node) => node.getBoundingClientRect().width > 0);
      return suggestion ? {
        first: items[0] === suggestion, rect, scrollHeight: suggestion.scrollHeight,
        inInfo: Boolean(suggestion.closest("[data-advertising-photo-info]")),
        inRelated: Boolean(suggestion.closest("[data-advertising-photo-related-grid]")),
        clientHeight: suggestion.clientHeight,
        buttons: [...suggestion.querySelectorAll("[data-advertising-suggestion-tag]")]
          .map((node) => node.getBoundingClientRect().toJSON()),
      } : null;
    });
    assert.equal(state?.inInfo, true, `${label}: split suggestion is outside primary info`);
    assert.equal(state?.inRelated, false, `${label}: split suggestion remains in related grid`);
    assert.equal(state?.first, false, `${label}: split suggestion incorrectly owns first related-grid cell`);
    assert(state.scrollHeight <= state.clientHeight + 1, `${label}: suggestion content is clipped`);
    assert.equal(state.buttons.length, 4, `${label}: suggestion does not expose four buttons`);
    for (const button of state.buttons) assert(contained(button, state.rect), `${label}: suggestion button leaves its solver cell`);
    assert.deepEqual(diagnostics, [], `${label}: local runtime diagnostics ${JSON.stringify(diagnostics)}`);
    results.push({ label, status: "passed", durationMs: Date.now() - started, stage, observed: state, diagnostics });
  } catch (error) {
    results.push({ label, status: "failed", durationMs: Date.now() - started, stage, diagnostics,
      error: error instanceof Error ? error.message : String(error) });
  } finally {
    await context.close();
  }
}

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });

for (const locale of ["vi", "en"]) {
  await runP7PinterestContract(browser, locale);
  await runP7SuggestionCellContract(browser, locale);
}

for (const [localeIndex, locale] of ["vi", "en"].entries()) {
  for (const [widthIndex, width] of widthSamples.entries()) {
    const sparse = locale === "vi" && width === 820;
    const id = sparse ? "kiosk-posm-07" : sampleIds[(widthIndex + localeIndex * 2) % sampleIds.length];
    await runPageCase(browser, {
      label: `core-${locale}-${id}-${width}x${heights.get(width)}${sparse ? "-sparse" : ""}`,
      locale, id, viewport: { width, height: heights.get(width) },
      tag: sparse ? "use-sampling" : null, sparseTag: sparse,
      normalCopyFit: width === 1569 || width === 1922,
    });
  }
}

for (const width of [1569, 1922]) {
  for (const id of ["kiosk-posm-03", "kiosk-posm-04", "kiosk-posm-07", "kiosk-posm-09"]) {
    await runPageCase(browser, {
      label: `desktop-copy-${id}-${width}x912`, locale: width === 1569 ? "vi" : "en", id,
      viewport: { width, height: 912 }, normalCopyFit: true,
    });
  }
}

await runPageCase(browser, {
  label: "controls-en-kiosk-posm-03-320x568", locale: "en", id: "kiosk-posm-03",
  viewport: { width: 320, height: 568 }, controls: true,
});
await runPageCase(browser, {
  label: "sparse-related-vi-kiosk-posm-01-1569x912", locale: "vi", id: "kiosk-posm-01",
  viewport: { width: 1569, height: 912 }, tag: "product-kiosk-posm-product-01",
  sparseTag: true, normalCopyFit: true,
});
await runPageCase(browser, {
  label: "touch-vi-kiosk-posm-07-390x844", locale: "vi", id: "kiosk-posm-07",
  viewport: { width: 390, height: 844 }, touchOnly: true, hasTouch: true,
});
await runPageCase(browser, {
  label: "text-200pct-en-kiosk-posm-07-390x844", locale: "en", id: "kiosk-posm-07",
  viewport: { width: 390, height: 844 }, textScale: 2,
});
await runPageCase(browser, {
  label: "very-short-vi-kiosk-posm-09-1024x420", locale: "vi", id: "kiosk-posm-09",
  viewport: { width: 1024, height: 420 }, textScale: 2, verifyTextAllocation: false,
});
await runPageCase(browser, {
  label: "landscape-vi-kiosk-posm-09-838x331", locale: "vi", id: "kiosk-posm-09",
  viewport: { width: 838, height: 331 },
});
await runPageCase(browser, {
  label: "landscape-en-kiosk-posm-06-844x390", locale: "en", id: "kiosk-posm-06",
  viewport: { width: 844, height: 390 },
});
await runPageCase(browser, {
  label: "fit-controls-vi-kiosk-posm-09-390x844", locale: "vi", id: "kiosk-posm-09",
  viewport: { width: 390, height: 844 }, controls: true,
});
await runPageCase(browser, {
  label: "fit-controls-en-kiosk-posm-09-1440x900", locale: "en", id: "kiosk-posm-09",
  viewport: { width: 1440, height: 900 }, controls: true,
});
await runPageCase(browser, {
  label: "reduced-motion-vi-kiosk-posm-04-820x1180", locale: "vi", id: "kiosk-posm-04",
  viewport: { width: 820, height: 1180 }, reducedMotion: true,
});
await runResizeOrientation(browser);
await browser.close();

const generatedAt = new Date().toISOString();
const provenance = {};
for (const relativePath of [
  "src/site/advertising-products/index.html", ".site-output/advertising-products/index.html",
  "src/site/advertising-products/catalog-runtime.mjs", ".site-output/advertising-products/catalog-runtime.mjs",
  "src/site/advertising-products/layout-core.mjs", ".site-output/advertising-products/layout-core.mjs",
  "src/site/detail.css", ".site-output/detail.css",
]) provenance[relativePath] = await sha256(relativePath);

const machine = {
  name: "AD-PRIMARY-P1.4 focused browser proof",
  generatedAt,
  baseUrl,
  browser: "chromium",
  requestedRoute: "gpt-6-sol/xhigh",
  effectiveRoute: "unknown",
  widthSamples,
  catalogCount: ADVERTISING_CARDS.length,
  provenance,
  passed: results.filter(({ status }) => status === "passed").length,
  failed: results.filter(({ status }) => status === "failed").length,
  results,
};
await writeFile(resultsPath, `${JSON.stringify(machine, null, 2)}\n`);

const failures = results.filter(({ status }) => status === "failed");
const markdown = [
  "# Browser proof AD-PRIMARY-P1.4",
  "",
  `- Generated: ${generatedAt}`,
  `- Base URL: \`${baseUrl}\``,
  `- Result: ${machine.passed} passed, ${machine.failed} failed`,
  `- Route: requested \`gpt-6-sol/xhigh\`; effective \`unknown\``,
  `- Machine evidence: \`${path.relative(root, resultsPath).replaceAll("\\", "/")}\``,
  "",
  "## Failures",
  "",
  ...(failures.length ? failures.map((result) => `- \`${result.label}\` at \`${result.stage}\`: ${result.error}`) : ["- None."]),
  "",
  "## Scope",
  "",
  "Focused P1.4 geometry, real-photo peek, decorative blur, copy fit, CTA native behavior, resize, text 200%, and reduced motion. This is not a full-site pass.",
  "",
  "## Chú thích thuật ngữ",
  "",
  "- Machine evidence: dữ liệu JSON có thể kiểm tra tự động.",
  "- Peek: phần ảnh thật bên dưới primary còn nhìn thấy.",
  "",
].join("\n");
await writeFile(reportPath, markdown);
console.log(JSON.stringify({ passed: machine.passed, failed: machine.failed, resultsPath, reportPath }));
if (machine.failed) process.exitCode = 1;
