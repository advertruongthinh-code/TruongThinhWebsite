import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { ADVERTISING_CARDS } from "../../src/site/advertising-products/catalog.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outputDirectory = process.env.PHOTO_VIEW_OUTPUT_DIR
  ? path.resolve(root, process.env.PHOTO_VIEW_OUTPUT_DIR)
  : path.join(root, ".tmp/orchestration/advertising-browse-implementation-20260910/photo-view-e2e");
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";
const selectedEngines = (process.env.PHOTO_VIEW_ENGINES || "chromium,firefox,webkit")
  .split(",").map((value) => value.trim()).filter(Boolean);
const quick = process.env.PHOTO_VIEW_QUICK === "1";
const includeReducedMotionProbe = process.env.PHOTO_VIEW_INCLUDE_REDUCED_MOTION === "1";
const reducedMotionOnly = process.env.PHOTO_VIEW_REDUCED_MOTION_ONLY === "1";
const sweepOnly = process.env.PHOTO_VIEW_SWEEP_ONLY === "1";
const scrollbarRegressionOnly = process.env.PHOTO_VIEW_SCROLLBAR_REGRESSION === "1";
const oneColumnOnly = process.env.PHOTO_VIEW_ONE_COLUMN_REGRESSION === "1";
const p13GeometryOnly = process.env.PHOTO_VIEW_P13_GEOMETRY_ONLY === "1";
const p5LayoutOnly = process.env.PHOTO_VIEW_P5_LAYOUT_ONLY === "1";
const viewerControlsOnly = process.env.PHOTO_VIEW_CONTROLS_ONLY === "1";
const caseLimit = Number.parseInt(process.env.PHOTO_VIEW_CASE_LIMIT || (quick ? "1" : "0"), 10) || Number.POSITIVE_INFINITY;
const labelFilter = process.env.PHOTO_VIEW_LABEL_FILTER || "";
// CI chia ma trận viewport: PHOTO_VIEW_SHARD=k/n chạy viewport thứ k, k+n, ...; phần cuối chạy thêm reduced motion và sweep.
const [shardIndex, shardCount] = (process.env.PHOTO_VIEW_SHARD || "1/1").split("/").map(Number);
assert(shardIndex >= 1 && shardIndex <= shardCount, `Invalid PHOTO_VIEW_SHARD: ${process.env.PHOTO_VIEW_SHARD}`);
const lastShard = shardIndex === shardCount;

if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, ".tooling/browsers");
}

const { chromium, firefox, webkit } = await import("playwright");
const browserTypes = { chromium, firefox, webkit };
const fullViewports = [
  [320, 568], [360, 800], [390, 844], [430, 932], [568, 320], [667, 375], [844, 390],
  [768, 1024], [820, 1180], [1024, 768], [1280, 720], [1440, 900], [1920, 1080], [2560, 1440],
  [749, 900], [750, 900], [751, 900], [959, 900], [960, 900], [961, 900],
].map(([width, height]) => ({ width, height }));
const smokeViewports = [{ width: 390, height: 844 }, { width: 1440, height: 900 }];
const locales = ["vi", "en"];
const portrait = ADVERTISING_CARDS.find((card) => card.media.height > card.media.width);
const landscape = ADVERTISING_CARDS.find((card) => card.media.width > card.media.height);
const square = ADVERTISING_CARDS.find((card) => card.media.width === card.media.height);
assert(portrait && landscape && square, "Canonical catalog must include portrait, landscape, and square media");
const records = [
  { shape: "portrait", card: portrait },
  { shape: "landscape", card: landscape },
  { shape: "square", card: square },
];
const results = [];

function expectedPhotoGeometry(evidence) {
  const outer = evidence.clientWidth <= 750 ? 15 : evidence.clientWidth <= 1200 ? 25 : 35;
  const gap = evidence.clientWidth <= 960 ? 15 : evidence.clientWidth <= 1200 ? 25 : 35;
  const gridWidth = evidence.clientWidth - 2 * outer;
  const columns = evidence.relatedColumns;
  const cardWidth = (gridWidth - gap * (columns - 1)) / columns;
  // Detail spec R10: header luôn thu gọn, cao bằng hàng thu gọn cộng padding 10px hai đầu và viền 1px.
  const headerHeight = evidence.headerCollapsedRowHeight + 21;
  const top = headerHeight + outer + evidence.safeTop;
  const ratio = evidence.image.naturalWidth / evidence.image.naturalHeight;
  const span = Math.min(3, columns);
  const width = span * cardWidth + (span - 1) * gap;
  // Detail spec R2: pinterest khi primary chiếm hết cột và viewport dọc; còn lại split.
  const mode = span === columns && evidence.clientWidth <= evidence.windowHeight ? "pinterest" : "split";
  const imageZoneWidth = mode === "split"
    ? Math.max(1, span - 1) * cardWidth + Math.max(0, span - 2) * gap
    : width;
  const descriptionWidth = mode === "split" ? cardWidth : width;
  const available = evidence.windowHeight - top - evidence.safeBottom;
  // Split chừa gap, và related peek 50px khi primary chưa chiếm hết cột; pinterest vừa phần dưới header.
  const heightCap = mode === "split" ? available - gap - (span === columns ? 0 : 50) : available;
  // Chiều cao info của pinterest theo copy đã đo; R2 giới hạn ở 28% viewport.
  const descriptionCap = Math.min(evidence.windowHeight * 0.28 - gap, available - gap - 1);
  // Split: vùng ảnh cao theo media tới heightCap (primary-video-player R6); info cao bằng vùng ảnh, trừ khi nhãn cụm dài
  // làm sàn info cao hơn (runtime giữ sàn đó).
  const splitImageZoneHeight = Math.min(imageZoneWidth / ratio, heightCap);
  const descriptionHeight = mode === "split" ? Math.max(splitImageZoneHeight, evidence.infoFloor) : evidence.infoRect.height;
  const imageZoneHeight = mode === "split" ? splitImageZoneHeight
    : Math.min(width / ratio, available - descriptionHeight - gap);
  const height = mode === "split" ? descriptionHeight : imageZoneHeight + descriptionHeight + gap;
  const imageWidth = Math.min(imageZoneWidth, ratio * imageZoneHeight);
  const imageHeight = imageWidth / ratio;
  return { span, width, height, imageZoneWidth, imageZoneHeight, descriptionWidth, descriptionHeight,
    imageWidth, imageHeight, mode, top, headerHeight, heightCap, descriptionCap, gridWidth, cardWidth, gap, outer };
}

async function sha256(relativePath) {
  try {
    return createHash("sha256").update(await readFile(path.join(root, relativePath))).digest("hex");
  } catch {
    return null;
  }
}

const provenanceAtStart = {
  sourceCatalogRuntimeSha256: await sha256("src/site/advertising-products/catalog-runtime.mjs"),
  outputCatalogRuntimeSha256: await sha256(".site-output/advertising-products/catalog-runtime.mjs"),
  sourceStyleSha256: await sha256("src/site/style.css"),
  outputStyleSha256: await sha256(".site-output/style.css"),
};

function isLocalUrl(value) {
  try { return new URL(value).origin === new URL(baseUrl).origin; } catch { return false; }
}

function attachDiagnostics(page) {
  const issues = [];
  page.on("pageerror", (error) => issues.push({ kind: "pageerror", message: error.message }));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const location = message.location();
    if (isLocalUrl(location.url) || /advertising|photo viewer/i.test(message.text())) {
      issues.push({ kind: "console", message: message.text(), url: location.url });
    }
  });
  page.on("requestfailed", (request) => {
    // Chromium hủy các fetch ảnh lazy hoặc video bị thay thế (đổi srcset/variant/src, unmount); không phải lỗi tải.
    if (["image", "media"].includes(request.resourceType()) && request.failure()?.errorText === "net::ERR_ABORTED") return;
    if (isLocalUrl(request.url())) issues.push({ kind: "requestfailed", url: request.url(), error: request.failure()?.errorText || "unknown" });
  });
  page.on("response", (response) => {
    if (isLocalUrl(response.url()) && response.status() >= 400) issues.push({ kind: "response", url: response.url(), status: response.status() });
  });
  return issues;
}

function route(locale, card) {
  return `/${locale}/advertising-products/?photo=${encodeURIComponent(card.id)}`;
}

function screenshotName(value) {
  return value.replaceAll(/[^a-z0-9]+/gi, "-").replaceAll(/^-|-$/g, "").toLowerCase();
}

async function waitForPhoto(page) {
  await page.waitForFunction(() => {
    const image = document.querySelector("[data-advertising-photo-image]");
    const primary = document.querySelector("[data-advertising-photo-primary]");
    const photoView = document.querySelector("[data-advertising-photo-view]");
    const canvas = document.querySelector("[data-advertising-photo-canvas]");
    const info = document.querySelector("[data-advertising-photo-info]");
    const hero = document.querySelector("[data-advertising-photo-hero]");
    return Boolean(image && primary && image.complete && image.naturalWidth > 0 && primary.getBoundingClientRect().width > 0);
  });
}

async function settleGeometry(page, stage, settlements, { requireScrollStable = false } = {}) {
  const evidence = await page.evaluate(async (includeScroll) => {
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    const snapshot = () => {
      const image = document.querySelector("[data-advertising-photo-image]")?.getBoundingClientRect();
      const primary = document.querySelector("[data-advertising-photo-primary]")?.getBoundingClientRect();
      const header = document.querySelector("[data-site-header]")?.getBoundingClientRect();
      const related = [...document.querySelectorAll("[data-advertising-related-card]")]
        .filter((node) => !node.hidden && node.getBoundingClientRect().width > 0);
      return {
        image: image && { width: image.width, height: image.height, left: image.left, right: image.right },
        primary: primary && { width: primary.width, height: primary.height, left: primary.left, right: primary.right },
        header: header && { width: header.width, height: header.height, left: header.left, right: header.right },
        width: innerWidth,
        height: innerHeight,
        relatedCoordinates: related.map((node) => {
          const rect = node.getBoundingClientRect();
          return [rect.left, rect.top, rect.width, rect.height];
        }),
        movingRelated: related.filter((node) => node.getAnimations().some((animation) =>
          animation.playState === "running" && animation.transitionProperty === "transform")).length,
        fonts: document.fonts?.status,
        transitioning: document.body.classList.contains("is-transitioning"),
        ...(includeScroll ? { logicalScroll: window.TruongThinhMotion?.getLogicalScroll?.() ?? window.scrollY } : {}),
      };
    };
    let previous = "";
    let stableFrames = 0;
    const firstScroll = window.TruongThinhMotion?.getLogicalScroll?.() ?? window.scrollY;
    let last = null;
    for (let frameIndex = 1; frameIndex <= 180; frameIndex += 1) {
      await frame();
      last = snapshot();
      const ready = last.fonts !== "loading" && last.movingRelated === 0
        && Boolean(document.querySelector("[data-advertising-photo-image]")?.complete)
        && !document.body.classList.contains("is-transitioning");
      const signature = JSON.stringify(last);
      stableFrames = ready && signature === previous ? stableFrames + 1 : 1;
      previous = signature;
      if (ready && stableFrames >= 3) {
        return { converged: true, frameIndex, firstScroll, lastScroll: window.TruongThinhMotion?.getLogicalScroll?.() ?? window.scrollY, geometry: last };
      }
    }
    return { converged: false, frameIndex: 180, firstScroll, lastScroll: window.TruongThinhMotion?.getLogicalScroll?.() ?? window.scrollY, geometry: last };
  }, requireScrollStable);
  const record = { stage, ...evidence, scrollDelta: evidence.lastScroll - evidence.firstScroll };
  settlements?.push(record);
  assert(evidence.converged, `${stage}: layout geometry did not converge within 180 animation frames`);
  return record;
}

async function movePointerToScrollContent(page) {
  const point = await page.evaluate(() => {
    const container = document.querySelector("[data-scroll-container]");
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const candidates = [
      [innerWidth - 24, Math.min(innerHeight - 24, Math.max(96, rect.top + 160))],
      [innerWidth / 2, Math.min(innerHeight - 24, Math.max(96, rect.top + 160))],
      [Math.min(innerWidth - 24, Math.max(24, rect.left + rect.width / 2)), Math.min(innerHeight - 24, Math.max(96, rect.top + 240))],
    ];
    for (const [x, y] of candidates) {
      const hit = document.elementFromPoint(x, y);
      if (hit?.closest("[data-scroll-container]") === container
        && !hit.closest("[data-advertising-photo-info]")) return { x, y };
    }
    return null;
  });
  assert(point, "could not find a visible point inside data-scroll-container for wheel input");
  await page.mouse.move(point.x, point.y);
}

async function wheelContent(page, deltaY, stage, settlements) {
  await movePointerToScrollContent(page);
  await page.mouse.wheel(0, deltaY);
  return settleGeometry(page, stage, settlements, { requireScrollStable: true });
}

async function wheelUntilExpandVisible(page, label, settlements) {
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    // Wheel về phía nút: trang smooth-scroll giữ scrollY native ở 0, nên click của locator
    // với scrollIntoView native sẽ dịch trang dưới Locomotive thay vì cuộn như người dùng.
    const offset = await page.evaluate(() => {
      const rect = document.querySelector("[data-advertising-photo-expand]")?.getBoundingClientRect();
      if (!rect) return null;
      if (rect.top >= 0 && rect.bottom <= innerHeight && rect.left >= 0 && rect.right <= innerWidth) return 0;
      return rect.top + rect.height / 2 - innerHeight / 2;
    });
    if (offset === 0) return;
    const deltaY = offset === null ? -500 : Math.max(-500, Math.min(500, offset));
    await wheelContent(page, deltaY, `${label}:expand-wheel-${attempt}`, settlements);
  }
  assert.fail(`${label}: expand button did not reach the viewport after 12 real content-wheel attempts`);
}

async function ensureParentMediaHydrated(page, label, settlements) {
  await page.waitForFunction(async () => {
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    let previous = "";
    let stableFrames = 0;
    for (let index = 0; index < 180; index += 1) {
      await frame();
      const nodes = [...document.querySelectorAll("[data-project-grid] [data-advertising-card]")];
      const animationsRunning = nodes.some((node) => node.getAnimations({ subtree: true })
        .some((animation) => animation.playState === "running" || animation.playState === "pending"));
      const signature = JSON.stringify(nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return [node.dataset.advertisingCard, node.clientWidth, style.width, style.transform, rect.left, rect.top, rect.width, rect.height];
      }));
      const ready = nodes.length > 0 && !animationsRunning && !document.body.classList.contains("is-transitioning");
      stableFrames = ready && signature === previous ? stableFrames + 1 : 1;
      previous = signature;
      if (stableFrames >= 3) return true;
    }
    return false;
  });
  const card = page.locator("[data-project-grid] [data-advertising-card]").first();
  await card.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll("[data-project-grid] [data-advertising-card] img")]
    .some((image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0));
  await settleGeometry(page, `${label}:parent-media-hydrated`, settlements, { requireScrollStable: true });
}

async function layoutEvidence(page) {
  return page.evaluate(() => {
    const serializeRect = (node) => node?.getBoundingClientRect().toJSON() || null;
    const image = document.querySelector("[data-advertising-photo-image]");
    const hero = document.querySelector("[data-advertising-photo-hero]");
    const frame = document.querySelector(".advertising-photo-view__hero-frame");
    const primary = document.querySelector("[data-advertising-photo-primary]");
    const photoView = document.querySelector("[data-advertising-photo-view]");
    const relatedGrid = document.querySelector("[data-advertising-photo-related-grid]");
    const canvas = document.querySelector("[data-advertising-photo-canvas]");
    const info = document.querySelector("[data-advertising-photo-info]");
    const header = document.querySelector("[data-site-header]");
    const suggestion = document.querySelector("[data-advertising-photo-suggestion]");
    const suggestionTitle = suggestion?.querySelector("[data-advertising-photo-related-title]");
    const suggestionLinks = suggestion?.querySelector(".advertising-photo-view__suggestion-links");
    const cta = [...document.querySelectorAll("[data-advertising-photo-cta]")]
      .filter((node) => !node.hidden && node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0);
    const primaryRect = primary?.getBoundingClientRect();
    const related = [...document.querySelectorAll("[data-advertising-related-card]")]
      .filter((node) => !node.hidden && node.getBoundingClientRect().width > 0)
      .map((node) => node.getBoundingClientRect());
    const relatedGridRect = relatedGrid?.getBoundingClientRect();
    const overlaps = related.filter((rect) => primaryRect && rect.left < primaryRect.right && rect.right > primaryRect.left && rect.top < primaryRect.bottom && rect.bottom > primaryRect.top);
    const relatedOutside = related.filter((rect) => relatedGridRect && (rect.left < relatedGridRect.left - 1 || rect.right > relatedGridRect.right + 1));
    const rect = image?.getBoundingClientRect();
    const infoStyle = info && getComputedStyle(info);
    const titleStyle = suggestionTitle && getComputedStyle(suggestionTitle);
    const linksStyle = suggestionLinks && getComputedStyle(suggestionLinks);
    const suggestionBanners = [...(suggestionLinks?.querySelectorAll(".advertising-photo-view__suggestion-link") || [])].map((link) => {
      const bannerImage = link.querySelector("img");
      const label = link.querySelector(".advertising-photo-view__suggestion-label");
      const linkStyle = getComputedStyle(link);
      const imageStyle = bannerImage && getComputedStyle(bannerImage);
      const labelStyle = label && getComputedStyle(label);
      return {
        rect: serializeRect(link),
        image: bannerImage ? {
          rect: serializeRect(bannerImage),
          naturalWidth: bannerImage.naturalWidth,
          naturalHeight: bannerImage.naturalHeight,
          objectFit: imageStyle.objectFit,
          opacity: Number.parseFloat(imageStyle.opacity),
          clientWidth: bannerImage.clientWidth,
          clientHeight: bannerImage.clientHeight,
        } : null,
        label: label ? {
          rect: serializeRect(label),
          fontSize: Number.parseFloat(labelStyle.fontSize),
          lineHeight: Number.parseFloat(labelStyle.lineHeight),
          fontWeight: labelStyle.fontWeight,
          color: labelStyle.color,
          backgroundImage: labelStyle.backgroundImage,
          textFillColor: labelStyle.webkitTextFillColor,
          clientWidth: label.clientWidth,
          clientHeight: label.clientHeight,
          scrollWidth: label.scrollWidth,
          scrollHeight: label.scrollHeight,
        } : null,
        tag: link.dataset.advertisingSuggestionTag,
        index: Number(link.dataset.advertisingSuggestionIndex),
        pressed: link.getAttribute("aria-pressed"),
        backgroundColor: linkStyle.backgroundColor,
        overflow: linkStyle.overflow,
      };
    });
    const relatedCards = [...document.querySelectorAll("[data-advertising-related-card]")]
      .filter((node) => !node.hidden && node.getBoundingClientRect().width > 0)
      .map((node) => {
        const relatedImage = node.querySelector("img");
        const imageStyle = relatedImage && getComputedStyle(relatedImage);
        return {
          id: node.dataset.advertisingRelatedCard,
          rect: serializeRect(node),
          image: relatedImage && relatedImage.complete && relatedImage.naturalWidth > 0 ? {
            rect: serializeRect(relatedImage),
            naturalWidth: relatedImage.naturalWidth,
            naturalHeight: relatedImage.naturalHeight,
            objectFit: imageStyle.objectFit,
          } : null,
        };
      });
    return {
      image: rect && image ? {
        rect: rect.toJSON(), width: rect.width, height: rect.height,
        naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight,
        objectFit: getComputedStyle(image).objectFit,
      } : null,
      primary: primaryRect ? { width: primaryRect.width, height: primaryRect.height } : null,
      primaryRect: serializeRect(primary),
      canvasRect: serializeRect(canvas),
      viewRect: serializeRect(photoView),
      infoRect: serializeRect(info),
      // Sàn info như measureInfo của runtime: các dòng ngoài mô tả cộng ba dòng mô tả (hoặc cả mô tả nếu ngắn hơn).
      infoFloor: info ? (() => {
        const controls = [...info.children].filter((node) => !node.matches("[data-advertising-photo-description-box]") && !node.hidden);
        const controlsHeight = controls.reduce((sum, node) => sum + node.offsetHeight
          + (Number.parseFloat(getComputedStyle(node).marginTop) || 0) + (Number.parseFloat(getComputedStyle(node).marginBottom) || 0), 0);
        const description = info.querySelector("[data-advertising-photo-description]");
        const lineHeight = Number.parseFloat(getComputedStyle(description).lineHeight) || 0;
        return Math.ceil(controlsHeight + Math.min(3 * lineHeight, description.offsetHeight)
          + controls.length * (Number.parseFloat(infoStyle.rowGap) || 0)) + 1;
      })() : 0,
      heroRect: serializeRect(hero),
      frameRect: serializeRect(frame),
      headerRect: serializeRect(header),
      relatedGridRect: serializeRect(relatedGrid),
      photoLayout: photoView?.dataset.advertisingPhotoLayout,
      primarySpan: Number(photoView?.dataset.advertisingPrimarySpan),
      relatedColumns: Number(relatedGrid?.dataset.advertisingRelatedColumns),
      primaryGap: primary ? Number.parseFloat(getComputedStyle(primary).gap) : null,
      clientWidth: document.documentElement.clientWidth,
      windowWidth: innerWidth,
      windowHeight: window.visualViewport?.height || innerHeight,
      headerCollapsedRowHeight: Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-collapsed-row-height")),
      safeTop: Number.parseFloat(getComputedStyle(photoView).getPropertyValue("--advertising-safe-top")) || 0,
      safeBottom: Number.parseFloat(getComputedStyle(photoView).getPropertyValue("--advertising-safe-bottom")) || 0,
      scrollY,
      logicalScroll: window.TruongThinhMotion?.getLogicalScroll?.() ?? scrollY,
      headerClasses: header?.className || "",
      info: info ? {
        clientHeight: info.clientHeight,
        scrollHeight: info.scrollHeight,
        scrollTop: info.scrollTop,
        overflowY: infoStyle.overflowY,
        // Số dòng mô tả đang thấy: chiều cao vùng cuộn chia line-height (chữ dài hơn thì cuộn bên trong).
        descriptionLines: (() => {
          const scroller = info.querySelector("[data-advertising-photo-description-scroll]");
          return scroller ? scroller.clientHeight / Number.parseFloat(getComputedStyle(scroller).lineHeight) : null;
        })(),
        tabIndex: info.tabIndex,
        role: info.getAttribute("role"),
      } : null,
      suggestion: suggestion && !suggestion.hidden ? {
        rect: serializeRect(suggestion),
        inInfo: Boolean(info?.contains(suggestion)),
        inRelatedGrid: Boolean(relatedGrid?.contains(suggestion)),
        title: suggestionTitle ? {
          rect: serializeRect(suggestionTitle),
          fontSize: Number.parseFloat(titleStyle.fontSize),
          lineHeight: Number.parseFloat(titleStyle.lineHeight),
          fontWeight: titleStyle.fontWeight,
        } : null,
        linksGap: suggestionLinks ? Number.parseFloat(linksStyle.rowGap) : null,
        linksMarginTop: suggestionLinks ? Number.parseFloat(linksStyle.marginTop) : null,
        banners: suggestionBanners,
      } : null,
      relatedCards,
      visibleCtas: cta.length,
      relatedOverlapCount: overlaps.length,
      relatedOutsideCount: relatedOutside.length,
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      scrollbarWidth: innerWidth - document.documentElement.clientWidth,
    };
  });
}

function closeTo(actual, expected, label, tolerance = 1) {
  assert(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance, `${label}: ${actual}px differs from expected ${expected}px`);
}

function assertLayout(evidence, label, { initialDirect = false } = {}) {
  assert(evidence.image && evidence.image.width > 0 && evidence.image.height > 0, `${label}: hero image is not visible`);
  const expected = expectedPhotoGeometry(evidence);
  const renderedRatio = evidence.image.width / evidence.image.height;
  const intrinsicRatio = evidence.image.naturalWidth / evidence.image.naturalHeight;
  assert(Math.abs(renderedRatio - intrinsicRatio) < 0.02, `${label}: hero ratio ${renderedRatio} differs from intrinsic ${intrinsicRatio}`);
  assert.equal(evidence.image.objectFit, "contain", `${label}: hero media is not contained`);
  assert.equal(evidence.photoLayout, expected.mode, `${label}: mode differs from detail spec R2`);
  assert.equal(evidence.primarySpan, expected.span, `${label}: span differs from the span-three contract`);
  closeTo(evidence.primaryRect.width, expected.width, `${label}: primary width`);
  closeTo(evidence.primaryRect.height, expected.height, `${label}: primary height`);
  closeTo(evidence.heroRect.width, expected.imageZoneWidth, `${label}: image zone width`);
  closeTo(evidence.heroRect.height, expected.imageZoneHeight, `${label}: image zone height`);
  closeTo(evidence.infoRect.width, expected.descriptionWidth, `${label}: description width`);
  closeTo(evidence.infoRect.height, expected.descriptionHeight, `${label}: description height`);
  closeTo(evidence.frameRect.width, expected.imageZoneWidth, `${label}: image frame width`);
  closeTo(evidence.frameRect.height, expected.imageZoneHeight, `${label}: image frame height`);
  closeTo(evidence.primaryGap, expected.gap, `${label}: primary image-description gap`, 0.1);
  if (evidence.infoFloor <= expected.heightCap) assert(expected.height <= expected.heightCap + 0.01, `${label}: independent geometry exceeds height cap despite fitting floors`);
  // Detail spec R2: vượt cap 28% chỉ khi ba dòng description cùng group và CTA không vừa.
  if (expected.mode === "pinterest" && expected.descriptionHeight > expected.descriptionCap + 1) {
    assert(evidence.info?.descriptionLines < 3.5, `${label}: info exceeds 28% of the viewport with more than three description lines`);
  }
  // Detail spec R3: info không tự cuộn; chữ dài cuộn trong vùng mô tả.
  assert(!["auto", "scroll"].includes(evidence.info?.overflowY), `${label}: description has its own scrollbar`);
  assert.equal(evidence.info?.tabIndex, 0, `${label}: description region is not keyboard focusable`);
  assert.equal(evidence.info?.role, "region", `${label}: description region role is absent`);
  assert.equal(evidence.relatedOverlapCount, 0, `${label}: related item overlaps primary`);
  assert.equal(evidence.visibleCtas, 1, `${label}: expected one visible detail CTA`);
  assert(evidence.horizontalOverflow <= 1, `${label}: horizontal overflow ${evidence.horizontalOverflow}px`);
  if (expected.mode === "pinterest") {
    assert(evidence.infoRect.top >= evidence.heroRect.bottom + expected.gap - 1, `${label}: pinterest description does not follow the responsive gap`);
  } else {
    assert(evidence.infoRect.left >= evidence.heroRect.right + expected.gap - 1, `${label}: split description does not follow the responsive gap`);
  }
  if (initialDirect) {
    assert(Math.abs(evidence.scrollY) <= 1 && Math.abs(evidence.logicalScroll) <= 1, `${label}: direct load is not at the logical top`);
    closeTo(evidence.headerRect.height, expected.headerHeight, `${label}: collapsed header shell height`);
    closeTo(evidence.primaryRect.top, expected.top, `${label}: primary visible top`);
    assert(evidence.primaryRect.bottom <= expected.top + Math.max(expected.heightCap, evidence.infoFloor) + 1, `${label}: primary frame exceeds visible viewport cap`);
    assert(evidence.frameRect.top >= -1 && evidence.frameRect.bottom <= evidence.windowHeight + 1, `${label}: media frame does not fit the initial viewport`);
  }
  return expected;
}

function assertP5SharedOuterGap(evidence, label) {
  const vertical = evidence.primaryRect.top - evidence.headerRect.bottom;
  const left = evidence.viewRect.left;
  const right = evidence.clientWidth - evidence.viewRect.right;
  closeTo(left, vertical, `${label}: left outer gap matches the navbar-to-primary gap`);
  closeTo(right, vertical, `${label}: right outer gap matches the navbar-to-primary gap`);
}

function assertP5ContinuousSideColumn(evidence, label) {
  const related = evidence.relatedCards;
  assert(related.length >= 2, `${label}: fixture needs at least two real related cards`);
  const [head, next] = related;
  closeTo(head.rect.left, evidence.primaryRect.right + evidence.primaryGap, `${label}: first related card starts in column four`);
  closeTo(head.rect.top, evidence.primaryRect.top, `${label}: first related card shares the primary top`);
  closeTo(next.rect.left, head.rect.left, `${label}: next related card stays in column four`);
  closeTo(next.rect.top, head.rect.bottom + evidence.primaryGap, `${label}: next related card fills the side-column cavity`);
  assert(next.rect.top < evidence.primaryRect.bottom - 1, `${label}: next related card starts inside the side-column cavity`);
}

function assertSuggestionAndRelated(evidence, label, expected, { textScale = 1 } = {}) {
  assert(evidence.suggestion?.rect, `${label}: suggestion group is not visible`);
  assert(evidence.suggestion.inInfo, `${label}: suggestion group is outside photo information`);
  assert(!evidence.suggestion.inRelatedGrid, `${label}: suggestion group is incorrectly in the related grid`);
  assert(evidence.suggestion.rect.width <= evidence.infoRect.width + 1, `${label}: suggestion group exceeds information width`);
  closeTo(evidence.suggestion.title.fontSize, 14 * textScale, `${label}: suggestion title size`, 0.1);
  closeTo(evidence.suggestion.title.lineHeight, 18.9 * textScale, `${label}: suggestion title line-height`, 0.1);
  assert.equal(evidence.suggestion.title.fontWeight, "700", `${label}: suggestion title weight`);
  closeTo(evidence.suggestion.linksGap, 8, `${label}: suggestion banner gap`, 0.1);
  closeTo(evidence.suggestion.linksMarginTop, 8, `${label}: suggestion title-banner gap`, 0.1);
  assert.equal(evidence.suggestion.banners.length, 4, `${label}: detail spec R5 fills four suggestion slots for this photo`);
  assert.equal(new Set(evidence.suggestion.banners.map((banner) => Math.round(banner.rect.left))).size, 1,
    `${label}: suggestion slots do not use one full-width column`);
  assert.equal(new Set(evidence.suggestion.banners.map((banner) => Math.round(banner.rect.top))).size, 4,
    `${label}: suggestion slots do not use four rows`);
  for (const [index, banner] of evidence.suggestion.banners.entries()) {
    assert.equal(banner.index, index, `${label}: suggestion order is not stable`);
    assert(banner.tag, `${label}: suggestion ${index + 1} has no tag identity`);
    closeTo(banner.rect.width, evidence.suggestion.rect.width, `${label}: suggestion banner ${index + 1} fills information width`);
    assert(banner.rect.width <= evidence.infoRect.width + 1, `${label}: suggestion banner ${index + 1} exceeds information width`);
    assert(banner.rect.height >= 64, `${label}: suggestion banner ${index + 1} is below its 64px compact minimum`);
    assert(banner.rect.height >= 44, `${label}: suggestion banner ${index + 1} misses the 44px target`);
    assert(banner.image?.naturalWidth > 0 && banner.image?.naturalHeight > 0, `${label}: suggestion banner ${index + 1} image is not hydrated`);
    assert(banner.label, `${label}: suggestion banner ${index + 1} has no readable label`);
    assert.equal(banner.overflow, "hidden", `${label}: suggestion banner ${index + 1} does not clip its animated image`);
    assert(banner.image.clientWidth > 0 && banner.image.clientWidth <= banner.rect.width,
      `${label}: suggestion banner ${index + 1} image base width escapes its frame`);
    assert(banner.image.clientHeight > 0 && banner.image.clientHeight <= banner.rect.height,
      `${label}: suggestion banner ${index + 1} image base height escapes its frame`);
    assert.equal(banner.image.objectFit, "cover", `${label}: suggestion banner ${index + 1} does not use accepted cover crop`);
    closeTo(banner.label.fontSize, 16 * textScale, `${label}: suggestion banner ${index + 1} label size`, 0.1);
    closeTo(banner.label.lineHeight, 24 * textScale, `${label}: suggestion banner ${index + 1} label line-height`, 0.1);
    assert.equal(banner.label.fontWeight, "700", `${label}: suggestion banner ${index + 1} label weight`);
    if (banner.pressed === "true") {
      assert.equal(banner.backgroundColor, "rgb(255, 255, 255)", `${label}: active suggestion does not expose its white surface`);
      assert(banner.image.opacity <= 0.01, `${label}: active suggestion full-frame image still covers its white surface`);
      assert.notEqual(banner.label.backgroundImage, "none", `${label}: active suggestion label has no image mask`);
      assert(banner.label.textFillColor === "rgba(0, 0, 0, 0)" || banner.label.color === "rgba(0, 0, 0, 0)",
        `${label}: active suggestion label is not transparent for image masking`);
    }
    assert(banner.label.rect.left >= banner.rect.left && banner.label.rect.right <= banner.rect.right,
      `${label}: suggestion banner ${index + 1} label exceeds its target`);
    assert(banner.label.rect.top >= banner.rect.top && banner.label.rect.bottom <= banner.rect.bottom,
      `${label}: suggestion banner ${index + 1} label is vertically clipped`);
    assert(banner.label.scrollWidth <= banner.label.clientWidth + 1 && banner.label.scrollHeight <= banner.label.clientHeight + 1,
      `${label}: suggestion banner ${index + 1} label content is clipped`);
  }
  const hydrated = evidence.relatedCards.filter((card) => card.image);
  assert(hydrated.length > 0, `${label}: no real related media hydrated`);
  for (const card of hydrated) {
    closeTo(card.rect.width, expected.cardWidth, `${label}: related ${card.id} one-column width`);
    assert.equal(card.image.objectFit, "contain", `${label}: related ${card.id} media is cropped`);
    const renderedRatio = card.image.rect.width / card.image.rect.height;
    const intrinsicRatio = card.image.naturalWidth / card.image.naturalHeight;
    assert(Math.abs(renderedRatio - intrinsicRatio) < 0.02, `${label}: related ${card.id} does not show full intrinsic media`);
  }
}

async function assertDescriptionKeyboardScroll(page, label) {
  const info = page.locator("[data-advertising-photo-info]");
  await page.locator("[data-advertising-photo-description]").evaluate((node) => {
    node.textContent = node.textContent.repeat(30);
  });
  await info.focus();
  const pageScroll = () => window.TruongThinhMotion?.getLogicalScroll?.() ?? window.scrollY;
  const initialPageScroll = await page.evaluate(pageScroll);
  const before = await info.evaluate((node) => ({ clientHeight: node.clientHeight, scrollHeight: node.scrollHeight, scrollTop: node.scrollTop }));
  assert(before.scrollHeight > before.clientHeight + 1, `${label}: description fixture does not exercise capped overflow`);
  await page.keyboard.press("End");
  await page.waitForFunction(() => {
    const node = document.querySelector("[data-advertising-photo-info]");
    return node && node.scrollTop > 0 && node.scrollTop + node.clientHeight >= node.scrollHeight - 1;
  });
  closeTo(await page.evaluate(pageScroll), initialPageScroll, `${label}: End must scroll only the description`, 2);
  await page.keyboard.press("Home");
  await page.waitForFunction(() => document.querySelector("[data-advertising-photo-info]")?.scrollTop === 0);
  closeTo(await page.evaluate(pageScroll), initialPageScroll, `${label}: Home must scroll only the description`, 2);
  await info.hover();
  await page.mouse.wheel(0, 220);
  await page.waitForFunction(() => document.querySelector("[data-advertising-photo-info]")?.scrollTop > 0);
  closeTo(await page.evaluate(pageScroll), initialPageScroll, `${label}: wheel must scroll only the description`, 2);
}

async function openDialog(page, { touch = false, label, settlements } = {}) {
  const expand = page.locator("[data-advertising-photo-expand]");
  await assertVisible(expand, "expand button");
  // Style baseline trước khi mở không được bắt class route transition đang giữa chừng.
  await page.waitForFunction(() => !document.body.classList.contains("is-transitioning"));
  if (!touch && label) await wheelUntilExpandVisible(page, label, settlements);
  const beforeUrl = page.url();
  const baseline = await page.evaluate((touch) => {
    // Màn cảm ứng mở viewer bằng một tap trên primary photo (viewer touch R7).
    const button = touch ? document.querySelector("[data-advertising-photo-image]").parentElement
      : document.querySelector("[data-advertising-photo-expand]");
    window.__ttPhotoViewerBeforeOpen = undefined;
    const scrollStyle = () => ({
      bodyClass: document.body.className,
      bodyInlineOverflow: document.body.style.overflow,
      htmlInlineOverflow: document.documentElement.style.overflow,
      bodyComputedOverflow: getComputedStyle(document.body).overflow,
      htmlComputedOverflow: getComputedStyle(document.documentElement).overflow,
    });
    window.__ttPhotoViewerOverflowBeforeOpen = scrollStyle();
    window.__ttPhotoViewerOpenMotion = { states: [], animations: [] };
    const dialog = document.querySelector("[data-advertising-photo-dialog]");
    const observer = new MutationObserver(() => {
      window.__ttPhotoViewerOpenMotion.states.push(dialog?.dataset.advertisingViewerState || null);
    });
    observer.observe(dialog, { attributes: true, attributeFilter: ["data-advertising-viewer-state"] });
    // Tap mở ở pointerup: lấy mẫu motion sau khi dialog đã mở.
    const onOpen = () => {
      if (dialog.open) return;
      window.__ttPhotoViewerBeforeOpen = window.TruongThinhMotion?.getLogicalScroll?.() ?? window.scrollY;
      requestAnimationFrame(() => {
        if (!dialog.open) return;
        button.removeEventListener(touch ? "pointerup" : "click", onOpen, { capture: true });
        window.__ttPhotoViewerOpenMotion.animations = document.querySelector("[data-advertising-photo-expanded-image]")?.getAnimations()
          .map((animation) => ({ duration: animation.effect?.getTiming().duration, easing: animation.effect?.getTiming().easing })) || [];
      });
    };
    button?.addEventListener(touch ? "pointerup" : "click", onOpen, { capture: true });
    return window.__ttPhotoViewerOverflowBeforeOpen;
  }, touch);
  if (touch) {
    const box = await page.locator("[data-advertising-photo-image]").boundingBox();
    assert(box, "touch primary photo has no bounding box");
    await page.evaluate((rect) => {
      const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      window.__ttTouchExpandProbe = { rect, scrollY, logical: window.TruongThinhMotion?.getLogicalScroll?.(), hit: hit?.outerHTML?.slice(0,200) };
    }, box);
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  } else {
    await expand.click();
  }
  const dialog = page.locator("[data-advertising-photo-dialog]");
  await page.waitForFunction(() => document.querySelector("[data-advertising-photo-dialog]")?.open === true);
  await page.waitForFunction(() => document.querySelector("[data-advertising-photo-dialog]")?.dataset.advertisingViewerState === "open");
  assert.equal(page.url(), beforeUrl, "opening dialog changed URL");
  const scrollBeforeLock = await page.evaluate(() => window.__ttPhotoViewerBeforeOpen);
  assert(Number.isFinite(scrollBeforeLock), "did not capture logical scroll before viewer handler");
  return { dialog, expand, beforeUrl, scrollBeforeLock, baseline };
}

async function observeCloseMotion(page) {
  await page.evaluate(() => {
    const dialog = document.querySelector("[data-advertising-photo-dialog]");
    window.__ttPhotoViewerCloseMotion = { states: [], animations: [] };
    const observer = new MutationObserver(() => {
      window.__ttPhotoViewerCloseMotion.states.push(dialog?.dataset.advertisingViewerState || null);
    });
    observer.observe(dialog, { attributes: true, attributeFilter: ["data-advertising-viewer-state"] });
    const captureAnimation = () => requestAnimationFrame(() => {
      window.__ttPhotoViewerCloseMotion.animations = document.querySelector("[data-advertising-photo-expanded-image]")?.getAnimations()
        .map((animation) => ({ duration: animation.effect?.getTiming().duration, easing: animation.effect?.getTiming().easing })) || [];
    });
    document.addEventListener("keydown", captureAnimation, { capture: true, once: true });
    document.addEventListener("click", captureAnimation, { capture: true, once: true });
  });
}

async function assertViewerMotion(page, { phase, reducedMotion, label }) {
  if (reducedMotion) {
    const evidence = await page.evaluate((requestedPhase) => window[requestedPhase === "open" ? "__ttPhotoViewerOpenMotion" : "__ttPhotoViewerCloseMotion"], phase);
    assert(!evidence.states.includes(phase === "open" ? "opening" : "closing"), `${label}: reduced motion entered ${phase} animation state`);
    return;
  }
  const expectedDuration = phase === "open" ? 300 : 250;
  const expectedState = phase === "open" ? "opening" : "closing";
  await page.waitForFunction((state) => window.__ttPhotoViewerOpenMotion?.states?.includes(state) || window.__ttPhotoViewerCloseMotion?.states?.includes(state), expectedState);
  await page.waitForFunction((requestedPhase) => (window[requestedPhase === "open" ? "__ttPhotoViewerOpenMotion" : "__ttPhotoViewerCloseMotion"]?.animations?.length || 0) > 0, phase);
  const evidence = await page.evaluate((requestedPhase) => window[requestedPhase === "open" ? "__ttPhotoViewerOpenMotion" : "__ttPhotoViewerCloseMotion"], phase);
  assert(evidence.states.includes(expectedState), `${label}: observer did not see ${expectedState}`);
  assert(evidence.animations.some((animation) => animation.duration === expectedDuration && animation.easing === "cubic-bezier(0.55, 0, 0, 1)"), `${label}: ${phase} WAAPI timing is not ${expectedDuration}ms cubic-bezier(.55,0,0,1): ${JSON.stringify(evidence.animations)}`);
}

async function assertVisible(locator, label) {
  await locator.waitFor({ state: "visible" });
  const box = await locator.boundingBox();
  assert(box && box.width > 0 && box.height > 0, `${label} is not visible`);
}

async function assertDialogFit(page, label, touch = false) {
  await page.waitForFunction(() => {
    const image = document.querySelector("[data-advertising-photo-expanded-image]");
    return Boolean(image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
  });
  const evidence = await page.evaluate(() => {
    const viewport = document.querySelector("[data-advertising-photo-viewport]")?.getBoundingClientRect();
    const imageNode = document.querySelector("[data-advertising-photo-expanded-image]");
    const image = imageNode?.getBoundingClientRect();
    const dialog = document.querySelector("[data-advertising-photo-dialog]");
    const controls = [...document.querySelectorAll("[data-advertising-photo-close], [data-advertising-photo-zoom-reset], [data-advertising-photo-zoom-in], [data-advertising-photo-zoom-out]")]
      .map((node) => ({ reset: node.matches("[data-advertising-photo-zoom-reset]"), disabled: node.disabled, hidden: node.hidden, focusVisible: node.matches(":focus-visible"), rect: node.getBoundingClientRect().toJSON() }));
    const ratio = image ? image.width / image.height : null;
    const naturalRatio = imageNode ? imageNode.naturalWidth / imageNode.naturalHeight : null;
    const dialogStyle = dialog ? getComputedStyle(dialog) : null;
    const padding = dialogStyle ? {
      top: parseFloat(dialogStyle.paddingTop) || 0,
      right: parseFloat(dialogStyle.paddingRight) || 0,
      bottom: parseFloat(dialogStyle.paddingBottom) || 0,
      left: parseFloat(dialogStyle.paddingLeft) || 0,
    } : null;
    const output = document.querySelector("[data-advertising-photo-zoom-status]");
    const outputRect = output?.getBoundingClientRect();
    return { viewport, image, controls, ratio, naturalRatio, naturalWidth: imageNode?.naturalWidth, open: dialog?.open === true, innerWidth, innerHeight, padding, output: outputRect?.toJSON(), outputPosition: output ? getComputedStyle(output).position : null };
  });
  assert(evidence.open && evidence.viewport && evidence.image, `${label}: dialog is not ready`);
  assert(evidence.image.left >= evidence.viewport.left - 1 && evidence.image.right <= evidence.viewport.right + 1 && evidence.image.top >= evidence.viewport.top - 1 && evidence.image.bottom <= evidence.viewport.bottom + 1, `${label}: fitted image is outside a viewport edge`);
  assert(Math.abs(evidence.ratio - evidence.naturalRatio) < 0.02, `${label}: fitted image lost intrinsic ratio (rendered ${evidence.ratio}, intrinsic ${evidence.naturalRatio})`);
  if (evidence.innerWidth <= 750 && evidence.naturalRatio >= 1) {
    const availableWidth = Math.max(1, evidence.viewport.width - evidence.padding.left - evidence.padding.right);
    const availableHeight = Math.max(1, evidence.viewport.height - Math.max(80, evidence.padding.top + 64) - Math.max(80, evidence.padding.bottom + 64));
    const maximumFittedWidth = Math.min(evidence.naturalWidth, availableWidth, availableHeight * evidence.naturalRatio);
    assert(evidence.viewport.width >= evidence.innerWidth - 32, `${label}: mobile dialog viewport is too narrow (${evidence.viewport.width}px of ${evidence.innerWidth}px)`);
    assert(Math.abs(evidence.image.width - maximumFittedWidth) <= 2, `${label}: landscape fit ignores available geometry (${evidence.image.width}px of ${maximumFittedWidth}px)`);
  }
  const resetControl = evidence.controls.find((control) => control.reset);
  assert(resetControl && !resetControl.hidden && resetControl.disabled, `${label}: reset control must remain visible and disabled at Fit`);
  for (const control of evidence.controls) {
    if (control.hidden) continue;
    // Viewer touch R8: nút ẩn khỏi mắt trên màn cảm ứng, trừ nút đang có focus bàn phím.
    if (touch && !control.focusVisible) {
      assert(control.rect.width <= 1 && control.rect.height <= 1, `${label}: control is visible on touch`);
      continue;
    }
    // Nút viewer vuông 36px (primary-video-player R7, owner 2026-10-24).
    assert(Math.abs(control.rect.width - 36) <= 1 && Math.abs(control.rect.height - 36) <= 1, `${label}: control is not 36px`);
    assert(control.rect.left >= -1 && control.rect.top >= -1 && control.rect.right <= evidence.innerWidth + 1 && control.rect.bottom <= evidence.innerHeight + 1, `${label}: control is outside browser viewport`);
  }
  assert(evidence.output && evidence.output.width <= 1 && evidence.output.height <= 1 && evidence.outputPosition === "absolute", `${label}: zoom output is not screen-reader-only (${JSON.stringify({ output: evidence.output, outputPosition: evidence.outputPosition })})`);
}

async function assertViewerLock(page, expectedScroll, baseline, label, settlements) {
  const locked = await page.evaluate(() => ({
    logical: window.TruongThinhMotion?.getLogicalScroll?.() ?? window.scrollY,
    bodyOverflow: getComputedStyle(document.body).overflow,
    htmlOverflow: getComputedStyle(document.documentElement).overflow,
  }));
  assert(Math.abs(locked.logical - expectedScroll) <= 2, `${label}: viewer lock changed logical scroll before input (${expectedScroll}px to ${locked.logical}px)`);
  assert(locked.bodyOverflow === "hidden" || locked.htmlOverflow === "hidden", `${label}: viewer did not lock document scroll`);
  const boundaryWheel = await page.evaluate(() => document.querySelector("[data-advertising-photo-zoom-in]")?.disabled ? -500 : 500);
  await page.mouse.wheel(0, boundaryWheel);
  await settleGeometry(page, `${label}:lock-wheel`, settlements, { requireScrollStable: true });
  const afterWheel = await page.evaluate(() => window.TruongThinhMotion?.getLogicalScroll?.() ?? window.scrollY);
  assert(Math.abs(afterWheel - expectedScroll) <= 2, `${label}: logical scroll moved while viewer was locked`);
}

async function transformEvidence(page) {
  return page.evaluate(() => {
    const image = document.querySelector("[data-advertising-photo-expanded-image]");
    const viewport = document.querySelector("[data-advertising-photo-viewport]");
    const matrix = new DOMMatrixReadOnly(getComputedStyle(image).transform);
    const scale = Number.parseInt(document.querySelector("[data-advertising-photo-zoom-status]")?.textContent || "100", 10) / 100;
    return {
      translateX: matrix.m41,
      translateY: matrix.m42,
      scale,
      limitX: Math.max(0, (image.clientWidth * scale - viewport.clientWidth) / 2),
      limitY: Math.max(0, (image.clientHeight * scale - viewport.clientHeight) / 2),
    };
  });
}

async function zoomState(page) {
  return page.evaluate(() => {
    const image = document.querySelector("[data-advertising-photo-expanded-image]");
    const viewport = document.querySelector("[data-advertising-photo-viewport]");
    const matrix = new DOMMatrixReadOnly(getComputedStyle(image).transform);
    const cover = Math.max(viewport.clientWidth / image.clientWidth, viewport.clientHeight / image.clientHeight);
    return {
      scale: matrix.a,
      cover,
      plusDisabled: document.querySelector("[data-advertising-photo-zoom-in]").disabled,
      minusDisabled: document.querySelector("[data-advertising-photo-zoom-out]").disabled,
      resetHidden: document.querySelector("[data-advertising-photo-zoom-reset]").hidden,
      resetDisabled: document.querySelector("[data-advertising-photo-zoom-reset]").disabled,
      status: document.querySelector("[data-advertising-photo-zoom-status]")?.textContent,
    };
  });
}

async function wheelZoomAroundAnchor(page, { deltaY, label }) {
  const anchor = await page.evaluate((wheelDelta) => {
    const image = document.querySelector("[data-advertising-photo-expanded-image]");
    const viewport = document.querySelector("[data-advertising-photo-viewport]");
    const viewportRect = viewport.getBoundingClientRect();
    const matrix = new DOMMatrixReadOnly(getComputedStyle(image).transform);
    const cover = Math.max(viewport.clientWidth / image.clientWidth, viewport.clientHeight / image.clientHeight);
    const currentLevel = matrix.a < cover - 0.02 ? 0 : matrix.a < cover * 2 - 0.03 ? 1 : 2;
    const nextLevel = Math.max(0, Math.min(2, currentLevel + (wheelDelta < 0 ? 1 : -1)));
    const nextScale = nextLevel === 0 ? 1 : cover * (nextLevel === 2 ? 2 : 1);
    const limitX = Math.max(0, (image.clientWidth * nextScale - viewport.clientWidth) / 2);
    const limitY = Math.max(0, (image.clientHeight * nextScale - viewport.clientHeight) / 2);
    const centerX = viewportRect.left + viewportRect.width / 2;
    const centerY = viewportRect.top + viewportRect.height / 2;
    const denominator = Math.max(0.001, Math.abs(nextScale / matrix.a - 1));
    const xOffset = limitX > 2 ? Math.min(image.clientWidth * matrix.a * 0.12, limitX / denominator * 0.5) : 0;
    const yOffset = !xOffset && limitY > 2 ? Math.min(image.clientHeight * matrix.a * 0.12, limitY / denominator * 0.5) : 0;
    // Playwright gửi tọa độ mouse nguyên, khớp PointerEvent.clientX/Y của browser.
    const clientX = Math.round(centerX + xOffset);
    const clientY = Math.round(centerY + yOffset);
    const localX = (clientX - centerX - matrix.m41) / matrix.a;
    const localY = (clientY - centerY - matrix.m42) / matrix.a;
    const desiredPanX = clientX - centerX - nextScale * localX;
    const desiredPanY = clientY - centerY - nextScale * localY;
    return {
      clientX,
      clientY,
      localX,
      localY,
      anchorUnclamped: Math.abs(desiredPanX) <= limitX + 0.01 && Math.abs(desiredPanY) <= limitY + 0.01,
      pageScroll: window.TruongThinhMotion?.getLogicalScroll?.() ?? window.scrollY,
      status: document.querySelector("[data-advertising-photo-zoom-status]")?.textContent,
    };
  }, deltaY);
  await page.mouse.move(anchor.clientX, anchor.clientY);
  await page.mouse.wheel(0, deltaY);
  // Firefox có thể resolve mouse.wheel trước khi event tới nơi, nên chờ zoom mà nó khởi động kết thúc.
  await page.waitForFunction((status) => document.querySelector("[data-advertising-photo-zoom-status]")?.textContent !== status
    && document.querySelector("[data-advertising-photo-dialog]")?.dataset.advertisingViewerState === "open", anchor.status);
  const after = await page.evaluate(({ clientX, clientY, localX, localY }) => {
    const image = document.querySelector("[data-advertising-photo-expanded-image]");
    const viewport = document.querySelector("[data-advertising-photo-viewport]");
    const viewportRect = viewport.getBoundingClientRect();
    const matrix = new DOMMatrixReadOnly(getComputedStyle(image).transform);
    const centerX = viewportRect.left + viewportRect.width / 2;
    const centerY = viewportRect.top + viewportRect.height / 2;
    return {
      driftX: centerX + matrix.m41 + matrix.a * localX - clientX,
      driftY: centerY + matrix.m42 + matrix.a * localY - clientY,
      pageScroll: window.TruongThinhMotion?.getLogicalScroll?.() ?? window.scrollY,
    };
  }, anchor);
  if (anchor.anchorUnclamped) {
    assert(Math.abs(after.driftX) <= 1 && Math.abs(after.driftY) <= 1,
      `${label}: wheel zoom moved unclamped cursor anchor by ${after.driftX}px, ${after.driftY}px`);
  }
  assert(Math.abs(after.pageScroll - anchor.pageScroll) <= 1, `${label}: wheel zoom changed page scroll`);
  return anchor;
}

async function middleClickReset(page, point, label) {
  const beforeScroll = await page.evaluate(() => window.TruongThinhMotion?.getLogicalScroll?.() ?? window.scrollY);
  await page.mouse.move(point.clientX, point.clientY);
  await page.mouse.down({ button: "middle" });
  await page.mouse.up({ button: "middle" });
  await page.waitForFunction(() => document.querySelector("[data-advertising-photo-dialog]")?.dataset.advertisingViewerState === "open");
  const state = await zoomState(page);
  assert(Math.abs(state.scale - 1) < 0.02 && state.minusDisabled && !state.plusDisabled && !state.resetHidden && state.resetDisabled,
    `${label}: middle-click did not reset Fit controls`);
  assert.equal(state.status, "100%", `${label}: middle-click did not sync zoom status`);
  const after = await page.evaluate(() => ({
    open: document.querySelector("[data-advertising-photo-dialog]")?.open === true,
    scroll: window.TruongThinhMotion?.getLogicalScroll?.() ?? window.scrollY,
  }));
  assert(after.open, `${label}: middle-click closed the dialog`);
  assert(Math.abs(after.scroll - beforeScroll) <= 1, `${label}: middle-click changed page scroll`);
}

// Màn cảm ứng giữ nút viewer chỉ cho screen reader (viewer touch R8): bấm chúng như assistive tech.
const press = (locator, touch) => (touch ? locator.evaluate((node) => node.click()) : locator.click());

async function clickZoom(page, selector, { reducedMotion, label, touch }) {
  await page.evaluate((target) => {
    const button = document.querySelector(target);
    const dialog = document.querySelector("[data-advertising-photo-dialog]");
    window.__ttPhotoViewerZoomMotion = { states: [], animations: [] };
    const observer = new MutationObserver(() => window.__ttPhotoViewerZoomMotion.states.push(dialog?.dataset.advertisingViewerState || null));
    observer.observe(dialog, { attributes: true, attributeFilter: ["data-advertising-viewer-state"] });
    button?.addEventListener("click", () => requestAnimationFrame(() => {
      window.__ttPhotoViewerZoomMotion.animations = document.querySelector("[data-advertising-photo-expanded-image]")?.getAnimations()
        .map((animation) => ({ duration: animation.effect?.getTiming().duration, easing: animation.effect?.getTiming().easing })) || [];
    }), { capture: true, once: true });
  }, selector);
  await press(page.locator(selector), touch);
  await page.waitForFunction(() => document.querySelector("[data-advertising-photo-dialog]")?.dataset.advertisingViewerState === "open");
  const motion = await page.evaluate(() => window.__ttPhotoViewerZoomMotion);
  if (!reducedMotion) {
    assert(motion.states.includes("zooming"), `${label}: observer did not see zooming`);
    assert(motion.animations.some((animation) => animation.duration === 200 && animation.easing === "ease-in-out"), `${label}: zoom animation is not 200ms ease-in-out`);
  }
}

async function exerciseDialog(page, options) {
  options.setStage?.("open");
  const { dialog, expand, beforeUrl, scrollBeforeLock, baseline } = await openDialog(page, options);
  const reducedMotion = options.reducedMotion === "reduce";
  options.setStage?.("open-motion");
  await assertViewerMotion(page, { phase: "open", reducedMotion, label: options.label });
  options.setStage?.("fit");
  await assertDialogFit(page, options.label, options.touch);
  options.setStage?.("lock");
  await assertViewerLock(page, scrollBeforeLock, baseline, options.label, options.settlements);
  const close = page.locator("[data-advertising-photo-close]");
  const zoomIn = page.locator("[data-advertising-photo-zoom-in]");
  const zoomOut = page.locator("[data-advertising-photo-zoom-out]");
  const zoomReset = page.locator("[data-advertising-photo-zoom-reset]");
  const viewport = page.locator("[data-advertising-photo-viewport]");
  const expanded = page.locator("[data-advertising-photo-expanded-image]");
  await assertVisible(close, "close button");
  await assertVisible(zoomReset, "zoom-reset button");
  await assertVisible(zoomIn, "zoom-in button");
  await assertVisible(zoomOut, "zoom-out button");
  let level = await zoomState(page);
  assert(level.minusDisabled && !level.plusDisabled && !level.resetHidden && level.resetDisabled, `${options.label}: fit controls are incorrect`);
  options.setStage?.("zoom-cover");
  await clickZoom(page, "[data-advertising-photo-zoom-in]", { reducedMotion, label: options.label, touch: options.touch });
  level = await zoomState(page);
  assert(Math.abs(level.scale - level.cover) < 0.02 && !level.minusDisabled && !level.plusDisabled && !level.resetHidden && !level.resetDisabled, `${options.label}: first plus is not cover`);
  options.setStage?.("zoom-max-pan");
  await clickZoom(page, "[data-advertising-photo-zoom-in]", { reducedMotion, label: options.label, touch: options.touch });
  level = await zoomState(page);
  assert(Math.abs(level.scale - level.cover * 2) < 0.03 && level.plusDisabled && !level.resetHidden && !level.resetDisabled, `${options.label}: second plus is not two-times cover max`);
  const beforePan = await transformEvidence(page);
  const viewportBox = await viewport.boundingBox();
  assert(viewportBox, "dialog viewport has no bounding box");
  const moveX = beforePan.limitX > 0.5 ? 24 : 0;
  const moveY = beforePan.limitY > 0.5 ? 16 : 0;
  assert(moveX || moveY, `${options.label}: two-times cover image has no pannable axis`);
  await page.mouse.move(viewportBox.x + viewportBox.width / 2, viewportBox.y + viewportBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(viewportBox.x + viewportBox.width / 2 + moveX, viewportBox.y + viewportBox.height / 2 + moveY);
  await page.mouse.up();
  await page.waitForFunction((start) => {
    const image = document.querySelector("[data-advertising-photo-expanded-image]");
    const matrix = image && new DOMMatrixReadOnly(getComputedStyle(image).transform);
    return matrix && (Math.abs(matrix.m41 - start.translateX) > 0.5 || Math.abs(matrix.m42 - start.translateY) > 0.5);
  }, beforePan);
  const afterPan = await transformEvidence(page);
  assert(Math.abs(afterPan.translateX) <= afterPan.limitX + 1 && Math.abs(afterPan.translateY) <= afterPan.limitY + 1, `${options.label}: pan escaped clamp bounds`);
  await assertViewerLock(page, scrollBeforeLock, baseline, `${options.label} after zoom/pan`, options.settlements);
  assert.equal(page.url(), beforeUrl, `${options.label}: zoom/pan changed URL`);
  options.setStage?.("reset");
  await press(zoomReset, options.touch);
  await page.waitForFunction(() => document.querySelector("[data-advertising-photo-dialog]")?.dataset.advertisingViewerState === "open");
  level = await zoomState(page);
  assert(Math.abs(level.scale - 1) < 0.02 && level.minusDisabled && !level.resetHidden && level.resetDisabled, `${options.label}: reset did not return to fit`);
  options.setStage?.("zoom-out-sequence");
  await clickZoom(page, "[data-advertising-photo-zoom-in]", { reducedMotion, label: options.label, touch: options.touch });
  await clickZoom(page, "[data-advertising-photo-zoom-in]", { reducedMotion, label: options.label, touch: options.touch });
  await clickZoom(page, "[data-advertising-photo-zoom-out]", { reducedMotion, label: options.label, touch: options.touch });
  level = await zoomState(page);
  assert(Math.abs(level.scale - level.cover) < 0.02 && !level.minusDisabled && !level.resetHidden && !level.resetDisabled, `${options.label}: minus did not return max to cover`);
  await clickZoom(page, "[data-advertising-photo-zoom-out]", { reducedMotion, label: options.label, touch: options.touch });
  level = await zoomState(page);
  assert(Math.abs(level.scale - 1) < 0.02 && level.minusDisabled && !level.resetHidden && level.resetDisabled,
    `${options.label}: second minus did not return cover to fit`);
  options.setStage?.("wheel-anchor");
  let anchor = await wheelZoomAroundAnchor(page, { deltaY: -120, label: options.label });
  level = await zoomState(page);
  assert(Math.abs(level.scale - level.cover) < 0.02 && !level.minusDisabled && !level.plusDisabled && !level.resetHidden && !level.resetDisabled,
    `${options.label}: wheel up did not reach Cover with synced controls`);
  assert.equal(level.status, `${Math.round(level.scale * 100)}%`, `${options.label}: wheel zoom status is stale`);
  if (reducedMotion) {
    assert.equal(await expanded.evaluate((node) => node.getAnimations().length), 0, `${options.label}: reduced-motion wheel zoom animated`);
  }
  await wheelZoomAroundAnchor(page, { deltaY: 120, label: options.label });
  level = await zoomState(page);
  assert(Math.abs(level.scale - 1) < 0.02 && level.minusDisabled && !level.plusDisabled && !level.resetHidden && level.resetDisabled,
    `${options.label}: wheel down did not return to Fit with synced controls`);
  anchor = await wheelZoomAroundAnchor(page, { deltaY: -120, label: options.label });
  options.setStage?.("middle-reset");
  await middleClickReset(page, anchor, options.label);
  options.setStage?.("keyboard-zoom");
  await zoomIn.focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector("[data-advertising-photo-dialog]")?.dataset.advertisingViewerState === "open");
  await zoomIn.focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector("[data-advertising-photo-dialog]")?.dataset.advertisingViewerState === "open");
  level = await zoomState(page);
  assert(Math.abs(level.scale - level.cover * 2) < 0.03 && level.plusDisabled && !level.resetHidden && !level.resetDisabled,
    `${options.label}: keyboard activation did not reach two-times Cover`);
  await zoomOut.focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector("[data-advertising-photo-dialog]")?.dataset.advertisingViewerState === "open");
  await zoomOut.focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector("[data-advertising-photo-dialog]")?.dataset.advertisingViewerState === "open");
  level = await zoomState(page);
  assert(Math.abs(level.scale - 1) < 0.02 && level.minusDisabled && !level.resetHidden && level.resetDisabled,
    `${options.label}: keyboard activation did not return to Fit`);
  options.setStage?.("rapid-wheel");
  await page.mouse.move(anchor.clientX, anchor.clientY);
  await page.mouse.wheel(0, -120);
  await page.mouse.wheel(0, -120);
  await page.mouse.wheel(0, 120);
  await page.mouse.wheel(0, -120);
  await page.waitForFunction(() => document.querySelector("[data-advertising-photo-dialog]")?.dataset.advertisingViewerState === "open");
  level = await zoomState(page);
  assert(Number.isFinite(level.scale) && Math.abs(level.scale - level.cover * 2) < 0.03 && level.plusDisabled && !level.resetHidden && !level.resetDisabled,
    `${options.label}: rapid wheel input did not settle at the shared max state`);
  if (options.resize) {
    options.setStage?.("resize-while-zoomed");
    const originalViewport = page.viewportSize();
    const resizedViewport = originalViewport.width < 700 ? { width: 820, height: 1180 } : { width: 390, height: 844 };
    await page.setViewportSize(resizedViewport);
    await page.waitForFunction((expectedWidth) => {
      const image = document.querySelector("[data-advertising-photo-expanded-image]");
      const viewportNode = document.querySelector("[data-advertising-photo-viewport]");
      const matrix = image && new DOMMatrixReadOnly(getComputedStyle(image).transform);
      const cover = image && viewportNode ? Math.max(viewportNode.clientWidth / image.clientWidth, viewportNode.clientHeight / image.clientHeight) : 0;
      return innerWidth === expectedWidth
        && document.querySelector("[data-advertising-photo-dialog]")?.dataset.advertisingViewerState === "open"
        && matrix && Math.abs(matrix.a - cover * 2) < 0.03;
    }, resizedViewport.width);
    level = await zoomState(page);
    assert(Number.isFinite(level.scale) && Math.abs(level.scale - level.cover * 2) < 0.03 && level.plusDisabled && !level.resetHidden && !level.resetDisabled,
      `${options.label}: resize lost the shared max zoom state ${JSON.stringify(level)}`);
    await page.setViewportSize(originalViewport);
    await page.waitForFunction((expectedWidth) => {
      const image = document.querySelector("[data-advertising-photo-expanded-image]");
      const viewportNode = document.querySelector("[data-advertising-photo-viewport]");
      const matrix = image && new DOMMatrixReadOnly(getComputedStyle(image).transform);
      const cover = image && viewportNode ? Math.max(viewportNode.clientWidth / image.clientWidth, viewportNode.clientHeight / image.clientHeight) : 0;
      return innerWidth === expectedWidth
        && document.querySelector("[data-advertising-photo-dialog]")?.dataset.advertisingViewerState === "open"
        && matrix && Math.abs(matrix.a - cover * 2) < 0.03;
    }, originalViewport.width);
  }
  await middleClickReset(page, anchor, `${options.label} after rapid input`);
  if (options.keyboard) {
    options.setStage?.("focus-trap");
    await close.focus();
    await page.keyboard.press("Shift+Tab");
    const trapped = await dialog.evaluate((node) => node.contains(document.activeElement));
    assert(trapped, `${options.label}: Shift+Tab escaped dialog`);
  }
  options.setStage?.("close");
  await observeCloseMotion(page);
  if (options.closeWithButton) await press(close, options.touch);
  else await page.keyboard.press("Escape");
  await assertViewerMotion(page, { phase: "close", reducedMotion, label: options.label });
  await page.waitForFunction(() => document.querySelector("[data-advertising-photo-dialog]")?.open === false);
  assert.equal(page.url(), beforeUrl, `${options.label}: Escape changed photo URL`);
  await page.waitForFunction(() => document.activeElement === document.querySelector("[data-advertising-photo-expand]"));
  assert.equal(await expand.count(), 1, `${options.label}: focus target was removed after close`);
  const restored = await page.evaluate(() => ({
    logical: window.TruongThinhMotion?.getLogicalScroll?.() ?? window.scrollY,
    bodyClass: document.body.className,
    bodyInlineOverflow: document.body.style.overflow,
    htmlInlineOverflow: document.documentElement.style.overflow,
    bodyOverflow: getComputedStyle(document.body).overflow,
    htmlOverflow: getComputedStyle(document.documentElement).overflow,
    bodyComputedOverflow: getComputedStyle(document.body).overflow,
    htmlComputedOverflow: getComputedStyle(document.documentElement).overflow,
  }));
  assert(Math.abs(restored.logical - scrollBeforeLock) <= 2, `${options.label}: logical scroll restoration differs by more than 2px`);
  assert.deepEqual({
    bodyClass: restored.bodyClass,
    bodyInlineOverflow: restored.bodyInlineOverflow,
    htmlInlineOverflow: restored.htmlInlineOverflow,
    bodyComputedOverflow: restored.bodyComputedOverflow,
    htmlComputedOverflow: restored.htmlComputedOverflow,
  }, baseline, `${options.label}: viewer did not restore pre-open scroll styling`);
  await wheelContent(page, 80, `${options.label}:post-close-wheel`, options.settlements);
  const afterCloseWheel = await page.evaluate(() => window.TruongThinhMotion?.getLogicalScroll?.() ?? window.scrollY);
  assert(Math.abs(afterCloseWheel - scrollBeforeLock) > 2, `${options.label}: logical scroll did not respond to wheel after close`);
}

async function assertFocusVisibleAfterResize(page, label) {
  // Đặt nút gần đỉnh để layout sau resize có thể đẩy nó ra ngoài màn hình.
  await page.evaluate(() => {
    const motion = window.TruongThinhMotion;
    motion.setLogicalScroll(motion.getLogicalScroll() + document.querySelector("[data-advertising-photo-expand]").getBoundingClientRect().top - 90);
  });
  await openDialog(page);
  const original = page.viewportSize();
  const resized = original.width < 700 ? { width: original.height, height: original.width } : { width: 390, height: 844 };
  await page.setViewportSize(resized);
  await page.waitForFunction((width) => innerWidth === width, resized.width);
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => document.querySelector("[data-advertising-photo-dialog]")?.open === false);
  const target = await page.evaluate(() => {
    const button = document.querySelector("[data-advertising-photo-expand]");
    const { top, bottom } = button.getBoundingClientRect();
    return { focused: document.activeElement === button, top, bottom, height: innerHeight };
  });
  assert(target.focused && target.top >= 0 && target.bottom <= target.height,
    `${label}: Escape after resize focused an off-screen expand button ${JSON.stringify(target)}`);
}

async function runCase(browserName, browser, locale, record, viewport, { smoke = false, touch = false, reducedMotion = "no-preference" } = {}) {
  const label = `${browserName} ${locale} ${record.shape} ${viewport.width}x${viewport.height}`;
  let stage = "create-context";
  const settlements = [];
  const started = Date.now();
  const context = await browser.newContext({ viewport, locale: locale === "vi" ? "vi-VN" : "en-US", hasTouch: touch, isMobile: touch, reducedMotion });
  const page = await context.newPage();
  const diagnostics = attachDiagnostics(page);
  try {
    stage = "initial:navigate";
    await page.goto(new URL(route(locale, record.card), baseUrl).href, { waitUntil: "domcontentloaded" });
    await waitForPhoto(page);
    if (viewerControlsOnly) {
      stage = "viewer:controls-only:geometry";
      await settleGeometry(page, stage, settlements, { requireScrollStable: true });
      stage = "viewer:controls-only";
      await exerciseDialog(page, { label, touch, keyboard: true, closeWithButton: false, reducedMotion, resize: true, settlements, setStage: (step) => { stage = `viewer:${step}`; } });
      stage = "viewer:resize-focus";
      await assertFocusVisibleAfterResize(page, label);
      assert.deepEqual(diagnostics, [], `${label}: local runtime diagnostics ${JSON.stringify(diagnostics)}`);
      results.push({ label, status: "passed", durationMs: Date.now() - started, viewport, locale, shape: record.shape, browser: browserName, reducedMotion, stage, settlements, diagnostics });
      return;
    }
    stage = "initial:geometry";
    await settleGeometry(page, stage, settlements);
    assertLayout(await layoutEvidence(page), label, { initialDirect: true });
    if (smoke) {
      stage = "initial:reload";
      await page.reload({ waitUntil: "domcontentloaded" });
      await waitForPhoto(page);
      stage = "reload:geometry";
      await settleGeometry(page, stage, settlements, { requireScrollStable: true });
    }
    stage = "viewer:exercise";
    await exerciseDialog(page, { label, touch, keyboard: smoke, closeWithButton: smoke && record.shape === "landscape", reducedMotion, settlements, setStage: (step) => { stage = `viewer:${step}`; } });
    if (smoke) {
      stage = "resize:open";
      await wheelUntilExpandVisible(page, label, settlements);
      await openDialog(page);
      const resized = viewport.width < 700 ? { width: 1440, height: 900 } : { width: 390, height: 844 };
      await page.setViewportSize(resized);
      await page.waitForFunction((expectedWidth) => document.querySelector("[data-advertising-photo-dialog]")?.open === true && innerWidth === expectedWidth, resized.width);
      stage = `resize:${resized.width}x${resized.height}`;
      await settleGeometry(page, stage, settlements);
      await assertDialogFit(page, `${label} live resize`, touch);
      await page.keyboard.press("Escape");
    }
    stage = "diagnostics";
    assert.deepEqual(diagnostics, [], `${label}: local runtime diagnostics ${JSON.stringify(diagnostics)}`);
    results.push({ label, status: "passed", durationMs: Date.now() - started, viewport, locale, shape: record.shape, browser: browserName, reducedMotion, stage, settlements, diagnostics });
  } catch (error) {
    const file = path.join(outputDirectory, `${screenshotName(label)}.png`);
    try { await page.screenshot({ path: file, fullPage: false }); } catch {}
    results.push({ label, status: "failed", durationMs: Date.now() - started, viewport, locale, shape: record.shape, browser: browserName, reducedMotion, stage, settlements, error: error instanceof Error ? error.message : String(error), diagnostics, screenshot: file });
    console.error(JSON.stringify({ label, stage, error: error instanceof Error ? error.message : String(error), touch: await page.evaluate(() => window.__ttTouchExpandProbe) }));
  } finally {
    await context.close();
  }
}

async function waitForP13Media(page) {
  await page.waitForFunction(() => {
    const banners = [...document.querySelectorAll(".advertising-photo-view__suggestion-link img")];
    const related = [...document.querySelectorAll("[data-advertising-related-card] img")];
    return banners.length > 0
      && banners.every((image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0)
      && related.some((image) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
  });
}

async function runP13GeometryCase(browser, record, viewport, { textZoom = 1, locale = "vi" } = {}) {
  const browserName = "chromium";
  const label = `${browserName} ${locale} p13-geometry ${record.shape} ${viewport.width}x${viewport.height}${textZoom > 1 ? " text-200pct" : ""}`;
  const context = await browser.newContext({ viewport, locale: "vi-VN" });
  const page = await context.newPage();
  const diagnostics = attachDiagnostics(page);
  const settlements = [];
  const started = Date.now();
  let stage = "p13:navigate";
  try {
    await page.goto(new URL(route(locale, record.card), baseUrl).href, { waitUntil: "domcontentloaded" });
    await waitForPhoto(page);
    await waitForP13Media(page);
    if (textZoom > 1) {
      await page.evaluate((scale) => {
        const size = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
        document.documentElement.style.fontSize = `${size * scale}px`;
        window.dispatchEvent(new Event("resize"));
      }, textZoom);
    }
    stage = "p13:geometry";
    await settleGeometry(page, stage, settlements, { requireScrollStable: true });
    const evidence = await layoutEvidence(page);
    const expected = assertLayout(evidence, label, { initialDirect: true });
    assertSuggestionAndRelated(evidence, label, expected, { textScale: textZoom });
    if (textZoom > 1) assert(evidence.infoRect.height > 0, `${label}: text zoom removed description region`);
    if (record.shape === "portrait") {
      stage = "p13:description-keyboard-scroll";
      await assertDescriptionKeyboardScroll(page, label);
    }
    stage = "p13:diagnostics";
    assert.deepEqual(diagnostics, [], `${label}: local runtime diagnostics ${JSON.stringify(diagnostics)}`);
    results.push({
      label, status: "passed", durationMs: Date.now() - started, browser: browserName,
      locale, shape: record.shape, viewport, stage, settlements, diagnostics, expected, evidence,
    });
  } catch (error) {
    const file = path.join(outputDirectory, `${screenshotName(label)}.png`);
    try { await page.screenshot({ path: file, fullPage: false }); } catch {}
    results.push({
      label, status: "failed", durationMs: Date.now() - started, browser: browserName,
      locale, shape: record.shape, viewport, stage, settlements,
      error: error instanceof Error ? error.message : String(error), diagnostics, screenshot: file,
    });
  } finally {
    await context.close();
  }
}

async function runP13ResizeCase(browser) {
  const record = records.find(({ shape }) => shape === "square");
  const sizes = [{ width: 390, height: 844 }, { width: 1569, height: 912 }, { width: 844, height: 390 }, { width: 390, height: 844 }];
  const label = "chromium vi p13-geometry square resize-mobile-desktop-landscape-mobile";
  const context = await browser.newContext({ viewport: sizes[0], locale: "vi-VN" });
  const page = await context.newPage();
  const diagnostics = attachDiagnostics(page);
  const settlements = [];
  const observations = [];
  const started = Date.now();
  let stage = "p13-resize:navigate";
  try {
    await page.goto(new URL(route("vi", record.card), baseUrl).href, { waitUntil: "domcontentloaded" });
    await waitForPhoto(page);
    await waitForP13Media(page);
    for (const viewport of sizes) {
      stage = `p13-resize:${viewport.width}x${viewport.height}`;
      await page.setViewportSize(viewport);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForFunction(({ width, height }) => document.documentElement.clientWidth <= width && innerHeight === height, viewport);
      await settleGeometry(page, stage, settlements, { requireScrollStable: true });
      const evidence = await layoutEvidence(page);
      const expected = assertLayout(evidence, `${label} ${viewport.width}x${viewport.height}`, { initialDirect: true });
      assertSuggestionAndRelated(evidence, `${label} ${viewport.width}x${viewport.height}`, expected);
      observations.push({ viewport, expected, evidence });
    }
    stage = "p13-resize:diagnostics";
    assert.deepEqual(diagnostics, [], `${label}: local runtime diagnostics ${JSON.stringify(diagnostics)}`);
    results.push({ label, status: "passed", durationMs: Date.now() - started, browser: "chromium", locale: "vi", shape: record.shape, stage, sizes, observations, settlements, diagnostics });
  } catch (error) {
    const file = path.join(outputDirectory, `${screenshotName(label)}.png`);
    try { await page.screenshot({ path: file, fullPage: false }); } catch {}
    results.push({ label, status: "failed", durationMs: Date.now() - started, browser: "chromium", locale: "vi", shape: record.shape, stage, sizes, observations, settlements, error: error instanceof Error ? error.message : String(error), diagnostics, screenshot: file });
  } finally {
    await context.close();
  }
}

async function runP13GeometryGate(browser) {
  const viewports = [{ width: 1569, height: 912 }, { width: 390, height: 844 }, { width: 844, height: 390 }];
  for (const viewport of viewports) {
    for (const record of records) await runP13GeometryCase(browser, record, viewport);
  }
  await runP13ResizeCase(browser);
  for (const locale of locales) {
    for (const viewport of [{ width: 320, height: 568 }, { width: 568, height: 320 }, { width: 1329, height: 912 }]) {
      await runP13GeometryCase(browser, records[0], viewport, { textZoom: 2, locale });
    }
  }
}

async function runP5LayoutGate(browser) {
  const card = ADVERTISING_CARDS.find((candidate) => candidate.id === "led-displays-lightboxes-01");
  assert(card, "P5 exact route requires led-displays-lightboxes-01");
  for (const [locale, viewport, tag] of [
    ["vi", { width: 1569, height: 912 }, "use-sampling"],
    ["en", { width: 820, height: 1180 }, null],
    ["vi", { width: 1920, height: 1080 }, null],
  ]) {
    const label = `chromium ${locale} p5-layout ${viewport.width}x${viewport.height}`;
    const context = await browser.newContext({ viewport, locale: locale === "vi" ? "vi-VN" : "en-US" });
    const page = await context.newPage();
    const diagnostics = attachDiagnostics(page);
    try {
      const url = new URL(route(locale, card), baseUrl);
      if (tag) url.searchParams.set("tag", tag);
      await page.goto(url.href, { waitUntil: "domcontentloaded" });
      await waitForPhoto(page);
      await waitForP13Media(page);
      await settleGeometry(page, `${label}:geometry`, [], { requireScrollStable: true });
      const evidence = await layoutEvidence(page);
      assertLayout(evidence, label, { initialDirect: true });
      assertP5SharedOuterGap(evidence, label);
      if (viewport.width === 1569) assertP5ContinuousSideColumn(evidence, label);
      assert.deepEqual(diagnostics, [], `${label}: local runtime diagnostics ${JSON.stringify(diagnostics)}`);
      results.push({ label, status: "passed", browser: "chromium", locale, viewport, diagnostics, evidence });
    } catch (error) {
      results.push({ label, status: "failed", browser: "chromium", locale, viewport, error: error instanceof Error ? error.message : String(error), diagnostics });
    } finally {
      await context.close();
    }
  }
}

async function runResizeSweep(browser) {
  const browserName = "chromium";
  const locale = "vi";
  const record = records[0];
  const widths = Array.from({ length: 71 }, (_, index) => 320 + index * 32).filter((width) => width <= 2560);
  [749, 750, 751, 959, 960, 961, 2560].forEach((width) => { if (!widths.includes(width)) widths.push(width); });
  widths.sort((left, right) => left - right);
  const context = await browser.newContext({ viewport: { width: 320, height: 844 }, locale: "vi-VN" });
  const page = await context.newPage();
  const diagnostics = attachDiagnostics(page);
  const settlements = [];
  let stage = "sweep:navigate";
  const label = "chromium vi portrait continuous-resize-320-2560";
  const started = Date.now();
  try {
    await page.goto(new URL(route(locale, record.card), baseUrl).href, { waitUntil: "domcontentloaded" });
    await waitForPhoto(page);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForFunction((expectedWidth) => innerWidth === expectedWidth && Boolean(document.querySelector("[data-advertising-photo-image]")?.complete), width);
      stage = `sweep:resize:${width}x900`;
      await settleGeometry(page, stage, settlements);
      assertLayout(await layoutEvidence(page), `${label} ${width}px`, { shape: record.shape, viewportWidth: width });
      assert(page.url().includes(`/p/${encodeURIComponent(record.card.id)}/`), `${label} ${width}px: selected photo changed during resize`);
    }
    assert.deepEqual(diagnostics, [], `${label}: local runtime diagnostics ${JSON.stringify(diagnostics)}`);
    results.push({ label, status: "passed", durationMs: Date.now() - started, browser: browserName, locale, shape: record.shape, widths, stage, settlements, diagnostics });
  } catch (error) {
    const file = path.join(outputDirectory, `${screenshotName(label)}.png`);
    try { await page.screenshot({ path: file, fullPage: false }); } catch {}
    results.push({ label, status: "failed", durationMs: Date.now() - started, browser: browserName, locale, shape: record.shape, widths, stage, settlements, error: error instanceof Error ? error.message : String(error), diagnostics, screenshot: file });
  } finally {
    await context.close();
  }
}

async function runScrollbarRegression(browser) {
  const browserName = "chromium";
  const widths = [741, 750, 751, 760, 950, 960, 961, 970, 1190, 1200, 1210];
  for (const locale of locales) {
    for (const record of records) {
      const context = await browser.newContext({ viewport: { width: widths[0], height: 600 }, locale: locale === "vi" ? "vi-VN" : "en-US" });
      const page = await context.newPage();
      const diagnostics = attachDiagnostics(page);
      const settlements = [];
      const observations = [];
      const label = `${browserName} ${locale} ${record.shape} scrollbar-visible-resize`;
      const started = Date.now();
      let stage = "scrollbar:navigate";
      try {
        await page.goto(new URL(route(locale, record.card), baseUrl).href, { waitUntil: "domcontentloaded" });
        await waitForPhoto(page);
        for (const width of widths) {
          await page.setViewportSize({ width, height: 600 });
          await page.waitForFunction((expectedWidth) => innerWidth === expectedWidth && Boolean(document.querySelector("[data-advertising-photo-image]")?.complete), width);
          stage = `scrollbar:resize:${width}x600`;
          await settleGeometry(page, stage, settlements);
          const evidence = await layoutEvidence(page);
          if (width <= 970) {
            assert(evidence.scrollbarWidth > 0, `${label} ${width}px: scrollbar is absent (inner ${width}px, client ${width - evidence.scrollbarWidth}px)`);
          }
          observations.push({ width, scrollbarWidth: evidence.scrollbarWidth, relatedOverlapCount: evidence.relatedOverlapCount, relatedOutsideCount: evidence.relatedOutsideCount, horizontalOverflow: evidence.horizontalOverflow });
          assertLayout(evidence, `${label} ${width}px`, { shape: record.shape, viewportWidth: width });
          assert.equal(evidence.relatedOutsideCount, 0, `${label} ${width}px: related card exceeds its container`);
          assert(page.url().includes(`/p/${encodeURIComponent(record.card.id)}/`), `${label} ${width}px: selected photo changed during resize`);
        }
        assert.deepEqual(diagnostics, [], `${label}: local runtime diagnostics ${JSON.stringify(diagnostics)}`);
        results.push({ label, status: "passed", durationMs: Date.now() - started, browser: browserName, locale, shape: record.shape, widths, stage, settlements, diagnostics, observations });
      } catch (error) {
        const file = path.join(outputDirectory, `${screenshotName(label)}.png`);
        try { await page.screenshot({ path: file, fullPage: false }); } catch {}
        results.push({ label, status: "failed", durationMs: Date.now() - started, browser: browserName, locale, shape: record.shape, widths, stage, settlements, error: error instanceof Error ? error.message : String(error), diagnostics, observations, screenshot: file });
      } finally {
        await context.close();
      }
    }
  }
}

async function oneColumnGridEvidence(page, { gridSelector, cardSelector }) {
  return page.evaluate(({ gridSelector: requestedGrid, cardSelector: requestedCards }) => {
    const grid = document.querySelector(requestedGrid);
    const rendered = grid ? [...grid.querySelectorAll(requestedCards)]
      .filter((node) => !node.hidden && node.getBoundingClientRect().width > 0) : [];
    const nodes = rendered.filter((node) => {
      const image = node.querySelector("img");
      return Boolean(image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
    });
    return {
      grid: grid?.getBoundingClientRect().toJSON() || null,
      gridClientWidth: grid?.clientWidth || 0,
      renderedNodeCount: rendered.length,
      gap: grid ? Number.parseFloat(getComputedStyle(grid).getPropertyValue(requestedGrid === "[data-project-grid]" ? "--advertising-gap" : "--advertising-photo-gap")) || 0 : null,
      viewportWidth: innerWidth,
      poolSetSizes: [...new Set(rendered.map((node) => node.getAttribute("aria-setsize")).filter(Boolean))],
      cards: nodes.map((node) => {
        const image = node.querySelector("img");
        const rect = node.getBoundingClientRect();
        const imageRect = image?.getBoundingClientRect();
        return {
          id: node.dataset.advertisingCard || node.dataset.advertisingRelatedCard || node.dataset.advertisingSuggestionTag || "suggestion",
          inlineWidth: Number.parseFloat(node.style.width) || 0,
          cssWidth: node.clientWidth,
          computedWidth: Number.parseFloat(getComputedStyle(node).width) || 0,
          rect: rect.toJSON(),
          span: node.dataset.advertisingSpan || null,
          setSize: node.getAttribute("aria-setsize"),
          image: image && imageRect ? {
            width: imageRect.width,
            height: imageRect.height,
            naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight,
          } : null,
        };
      }),
    };
  }, { gridSelector, cardSelector });
}

function publicColumnsForWidth(viewportWidth) {
  const outer = viewportWidth <= 750 ? 15 : viewportWidth <= 1200 ? 25 : 35;
  const gridWidth = viewportWidth - 2 * outer;
  return Math.min(4, Math.max(2, Math.floor(gridWidth / 235)));
}

function assertOneColumnGrid(evidence, label, { parent = false, related = false } = {}) {
  assert(evidence.grid, `${label}: grid is absent`);
  assert(evidence.cards.length > 0, `${label}: no visible or hydrated cards`);
  const columns = related && evidence.viewportWidth > 960 ? 4 : publicColumnsForWidth(evidence.viewportWidth);
  assert(evidence.gap >= 0, `${label}: grid gap is not measurable`);
  const expectedWidth = (evidence.gridClientWidth - evidence.gap * (columns - 1)) / columns;
  assert(expectedWidth > 0, `${label}: independently derived W is invalid`);
  const widths = evidence.cards.map((card) => card.inlineWidth);
  assert(widths.every((width) => width > 0), `${label}: a rendered card has no placement width`);
  for (const card of evidence.cards) {
    assert(Math.abs(card.inlineWidth - expectedWidth) <= 1, `${label}: ${card.id} placement width ${card.inlineWidth}px differs from independent W ${expectedWidth}px`);
    assert(Math.abs(card.cssWidth - expectedWidth) <= 1, `${label}: ${card.id} CSS render width ${card.cssWidth}px differs from independent W ${expectedWidth}px`);
    assert(Math.abs(card.computedWidth - expectedWidth) <= 1, `${label}: ${card.id} computed width ${card.computedWidth}px differs from independent W ${expectedWidth}px`);
    assert(Math.abs(card.rect.width - expectedWidth) <= 1, `${label}: ${card.id} visual width ${card.rect.width}px differs from independent W ${expectedWidth}px after return motion settled`);
    if (parent) assert.equal(card.span, "1", `${label}: ${card.id} exposes non-one span ${card.span}`);
    if (!card.image) continue;
    assert(card.image.naturalWidth > 0 && card.image.naturalHeight > 0, `${label}: ${card.id} media is not hydrated`);
    const renderedRatio = card.image.width / card.image.height;
    const naturalRatio = card.image.naturalWidth / card.image.naturalHeight;
    assert(Math.abs(renderedRatio - naturalRatio) < 0.02, `${label}: ${card.id} media ratio differs from intrinsic ratio`);
  }
  const setSizes = evidence.poolSetSizes;
  if (parent) assert.equal(setSizes.length, 1, `${label}: hydrated cards disagree on pool count ${JSON.stringify(setSizes)}`);
  return { columnWidth: expectedWidth, columns, gap: evidence.gap, visibleNodeCount: evidence.cards.length, renderedNodeCount: evidence.renderedNodeCount, poolCount: parent ? Number(setSizes[0]) : null };
}

async function assertNoPublicSpanControls(page, label) {
  const controls = await page.evaluate(() => [...document.querySelectorAll("button, select, input, [contenteditable=true]")]
    .filter((node) => !node.hidden && node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0)
    .map((node) => ({
      tag: node.tagName.toLowerCase(),
      text: (node.innerText || node.value || "").trim(),
      attributes: [...node.attributes].map((attribute) => `${attribute.name}=${attribute.value}`).join(" "),
    }))
    .filter((node) => /(?:layoutspan|layout-span|advertising.*(?:span|layout)|\b(?:auto|1\s*(?:cột|column)|2\s*(?:cột|column))\b)/i.test(`${node.text} ${node.attributes}`)));
  assert.equal(controls.length, 0, `${label}: public span control remains ${JSON.stringify(controls)}`);
}

async function runOneColumnRegression(browser) {
  const browserName = "chromium";
  const record = records[0];
  const viewports = [{ width: 390, height: 844 }, { width: 820, height: 1180 }, { width: 1440, height: 900 }];
  for (const locale of locales) {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport, locale: locale === "vi" ? "vi-VN" : "en-US" });
      const page = await context.newPage();
      const diagnostics = attachDiagnostics(page);
      const settlements = [];
      const label = `${browserName} ${locale} one-column ${viewport.width}x${viewport.height}`;
      const started = Date.now();
      let stage = "one-column:navigate-detail";
      try {
        await page.goto(new URL(route(locale, record.card), baseUrl).href, { waitUntil: "domcontentloaded" });
        await waitForPhoto(page);
        await page.waitForFunction(() => document.querySelectorAll("[data-advertising-related-card]").length > 0);
        await settleGeometry(page, "one-column:related", settlements);
        const related = assertOneColumnGrid(
          await oneColumnGridEvidence(page, { gridSelector: "[data-advertising-photo-related-grid]", cardSelector: "[data-advertising-related-card]" }),
          `${label}: related`,
          { related: true },
        );
        stage = "one-column:navbar-return";
        const desktopNavbar = page.locator(`header .desktop-nav a[href="/${locale}/advertising-products/"]`);
        if (await desktopNavbar.isVisible()) {
          await desktopNavbar.click();
        } else {
          await page.locator("[data-menu-open]").click();
          await page.locator(`.menu-group__title[href="/${locale}/advertising-products/"]`).click();
        }
        await page.waitForFunction(() => !/\/p\/[^/]+\/$/.test(location.pathname) && document.querySelector("[data-advertising-photo-view]")?.hidden === true);
        await page.waitForFunction(() => document.querySelectorAll("[data-project-grid] [data-advertising-card]").length > 0);
        await ensureParentMediaHydrated(page, label, settlements);
        await settleGeometry(page, "one-column:parent", settlements);
        const parent = assertOneColumnGrid(
          await oneColumnGridEvidence(page, { gridSelector: "[data-project-grid]", cardSelector: "[data-advertising-card]" }),
          `${label}: parent`,
          { parent: true },
        );
        await assertNoPublicSpanControls(page, label);
        assert.deepEqual(diagnostics, [], `${label}: local runtime diagnostics ${JSON.stringify(diagnostics)}`);
        results.push({ label, status: "passed", durationMs: Date.now() - started, browser: browserName, locale, viewport, stage: "diagnostics", settlements, diagnostics, parent, related });
      } catch (error) {
        const file = path.join(outputDirectory, `${screenshotName(label)}.png`);
        try { await page.screenshot({ path: file, fullPage: false }); } catch {}
        results.push({ label, status: "failed", durationMs: Date.now() - started, browser: browserName, locale, viewport, stage, settlements, error: error instanceof Error ? error.message : String(error), diagnostics, screenshot: file });
      } finally {
        await context.close();
      }
    }
  }
}

await mkdir(outputDirectory, { recursive: true });
for (const browserName of selectedEngines) {
  const browserType = browserTypes[browserName];
  assert(browserType, `Unsupported PHOTO_VIEW_ENGINES value: ${browserName}`);
  const browser = await browserType.launch({
    headless: true,
    ...(browserName === "chromium" && scrollbarRegressionOnly ? { ignoreDefaultArgs: ["--hide-scrollbars"] } : {}),
  });
  const viewports = (browserName === "chromium" ? fullViewports : smokeViewports)
    .filter((_, index) => index % shardCount === shardIndex - 1);
  console.log(`CHECKPOINT ${browserName}: ${viewports.length} viewport groups`);
  if (p13GeometryOnly) {
    if (browserName === "chromium") await runP13GeometryGate(browser);
    await browser.close();
    continue;
  }
  if (p5LayoutOnly) {
    if (browserName === "chromium") await runP5LayoutGate(browser);
    await browser.close();
    continue;
  }
  for (const viewport of viewports) {
    for (const locale of locales) {
      for (const record of records) {
        const caseLabel = `${browserName} ${locale} ${record.shape} ${viewport.width}x${viewport.height}`;
        if (labelFilter && !caseLabel.includes(labelFilter)) continue;
        if (reducedMotionOnly || sweepOnly || scrollbarRegressionOnly || oneColumnOnly) continue;
        await runCase(browserName, browser, locale, record, viewport, {
          smoke: viewport.width === 390 || viewport.width === 1440,
          touch: browserName === "chromium" && viewport.width === 390 && record.shape === "portrait",
        });
        if (results.length >= caseLimit) break;
      }
      if (results.length >= caseLimit) break;
    }
    if (results.length >= caseLimit) break;
    console.log(`CHECKPOINT ${browserName}: completed ${viewport.width}x${viewport.height}`);
  }
  if (browserName === "chromium" && lastShard && !quick && !sweepOnly && !scrollbarRegressionOnly && !oneColumnOnly && (!labelFilter || includeReducedMotionProbe || reducedMotionOnly)) {
    await runCase(browserName, browser, "vi", records[0], { width: 390, height: 844 }, { smoke: true, reducedMotion: "reduce" });
  }
  if (browserName === "chromium" && lastShard && !quick && !scrollbarRegressionOnly && !oneColumnOnly && (!labelFilter || sweepOnly)) {
    await runResizeSweep(browser);
  }
  if (browserName === "chromium" && scrollbarRegressionOnly) await runScrollbarRegression(browser);
  if (browserName === "chromium" && oneColumnOnly) await runOneColumnRegression(browser);
  await browser.close();
}

const report = {
  name: "advertising-photo-view-e2e",
  generatedAt: new Date().toISOString(),
  baseUrl,
  requestedEngines: selectedEngines,
  caseLimit: Number.isFinite(caseLimit) ? caseLimit : null,
  labelFilter: labelFilter || null,
  p13GeometryOnly,
  p5LayoutOnly,
  viewerControlsOnly,
  catalogRecords: records.map(({ shape, card }) => ({ shape, id: card.id, width: card.media.width, height: card.media.height })),
  catalogRecordCountObservedFromSource: ADVERTISING_CARDS.length,
  provenanceAtStart,
  provenanceAtEnd: {
    sourceCatalogRuntimeSha256: await sha256("src/site/advertising-products/catalog-runtime.mjs"),
    outputCatalogRuntimeSha256: await sha256(".site-output/advertising-products/catalog-runtime.mjs"),
    sourceStyleSha256: await sha256("src/site/style.css"),
    outputStyleSha256: await sha256(".site-output/style.css"),
  },
  viewports: { chromium: fullViewports, smoke: smokeViewports },
  passed: results.filter((result) => result.status === "passed").length,
  failed: results.filter((result) => result.status === "failed").length,
  results,
};
await writeFile(path.join(outputDirectory, "latest.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ passed: report.passed, failed: report.failed, artifact: path.join(outputDirectory, "latest.json") }));
if (report.failed) process.exitCode = 1;
