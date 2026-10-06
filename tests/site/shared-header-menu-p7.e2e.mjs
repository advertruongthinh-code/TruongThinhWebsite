import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";
const widths = [390, 768, 1024, 1440, 1922];
const locales = ["vi", "en"];
const expectedCopy = {
  vi: "Gọi Zalo tư vấn",
  en: "Talk to us on Zalo",
};
const headerHeights = width => width <= 750
  ? { top: 72.59375, collapsed: 70.640625 }
  : width <= 960
    ? { top: 85.390625, collapsed: 81.390625 }
    : width <= 1200
      ? { top: 85.390625, collapsed: 81.390625 }
      : { top: 102.515625, collapsed: 81.390625 };

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");

function rectDelta(left, right) {
  if (!left || !right) return Number.POSITIVE_INFINITY;
  return Math.max(...["x", "y", "width", "height"].map(key => Math.abs(left[key] - right[key])));
}

async function settle(page) {
  await page.waitForFunction(() => document.documentElement.classList.contains("motion-ready")
    || document.documentElement.classList.contains("motion-fallback"), null, { timeout: 12_000 });
  await page.evaluate(async () => {
    await document.fonts?.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function openMenu(page) {
  await page.locator("[data-menu-open]").click();
  await page.waitForFunction(() => {
    const dialog = document.querySelector("#site-menu");
    // Shell R4: focus chuyển sang nút close khi trạng thái open đã chốt; transition reduced-motion
    // vẫn cần frame cuối của chúng, mà software rendering chậm làm trễ.
    return dialog?.open && dialog.classList.contains("is-active")
      && document.activeElement?.matches("[data-menu-close]")
      && dialog.getAnimations({ subtree: true }).every(animation => animation.playState === "finished");
  });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function box(page, selector) {
  const bounds = await page.locator(selector).boundingBox();
  return bounds && {
    ...bounds,
    left: bounds.x,
    top: bounds.y,
    right: bounds.x + bounds.width,
    bottom: bounds.y + bounds.height,
  };
}

async function navMetrics(page) {
  return page.locator("[data-site-header] .desktop-nav a").evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      x: rect.x,
      width: rect.width,
      typography: [style.fontFamily, style.fontSize, style.fontWeight,
        style.letterSpacing, style.lineHeight],
    };
  }));
}

async function visible(page, selector) {
  return page.locator(selector).evaluate(node => {
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden"
      && Number.parseFloat(style.opacity) > 0.99 && rect.width > 0 && rect.height > 0;
  });
}

async function focusOrder(page) {
  return page.locator("#site-menu .menu-head").evaluate(head => [...head.querySelectorAll("a[href], button")]
    .filter(node => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden"
        && Number.parseFloat(style.opacity) > 0.99 && rect.width > 0 && rect.height > 0;
    })
    .map(node => {
      if (node.matches(".menu-brand")) return "brand";
      if (node.matches('[data-language-option="vi"]')) return "language-vi";
      if (node.matches('[data-language-option="en"]')) return "language-en";
      if (node.matches(".menu-appointment")) return "cta";
      if (node.matches("[data-menu-close]")) return "close";
      return "unknown";
    }));
}

async function keyboardFocusOrder(page, count) {
  await page.locator("#site-menu .menu-brand").focus();
  const order = [];
  for (let index = 0; index < count; index += 1) {
    order.push(await page.evaluate(() => {
      const node = document.activeElement;
      if (node?.matches(".menu-brand")) return "brand";
      if (node?.matches('[data-language-option="vi"]')) return "language-vi";
      if (node?.matches('[data-language-option="en"]')) return "language-en";
      if (node?.matches(".menu-appointment")) return "cta";
      if (node?.matches("[data-menu-close]")) return "close";
      return "unknown";
    }));
    if (index + 1 < count) await page.keyboard.press("Tab");
  }
  return order;
}

function record(failures, label, check) {
  try {
    check();
  } catch (error) {
    failures.push(`${label}: ${error.message}`);
  }
}

const browser = await chromium.launch({ headless: true });
const failures = [];
try {
  for (const locale of locales) {
    for (const width of widths) {
      const height = width <= 390 ? 844 : 912;
      const page = await browser.newPage({
        viewport: { width, height },
        reducedMotion: "reduce",
      });
      await page.route(/\.(?:avif|gif|jpe?g|mp4|png|webm|webp)(?:\?.*)?$/i, route => route.abort());

      try {
        await page.goto(`${baseUrl}/${locale}/`, { waitUntil: "domcontentloaded" });
        await settle(page);
        const transparent = {
          header: await box(page, "[data-site-header]"),
          logo: await box(page, "[data-site-header] .brand"),
          hamburger: await box(page, "[data-site-header] [data-menu-open]"),
        };
        const topNav = width > 750 ? await navMetrics(page) : null;

        await page.locator("[data-site-header]").evaluate(header => {
          header.style.transition = "none";
          header.classList.add("is-collapsed", "is-ink", "forceShow");
        });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
        const white = {
          header: await box(page, "[data-site-header]"),
          logo: await box(page, "[data-site-header] .brand"),
          hamburger: await box(page, "[data-site-header] [data-menu-open]"),
        };
        const whiteNav = topNav ? await navMetrics(page) : null;
        record(failures, `${locale}/${width} header heights`, () => {
          const expected = headerHeights(width);
          assert(Math.abs(transparent.header.height - expected.top) <= 0.2,
            `top=${transparent.header.height}px expected=${expected.top}px`);
          assert(Math.abs(white.header.height - expected.collapsed) <= 0.2,
            `collapsed=${white.header.height}px expected=${expected.collapsed}px`);
        });
        if (topNav) record(failures, `${locale}/${width} nav horizontal geometry`, () => {
          assert.equal(topNav.length, whiteNav.length);
          for (let index = 0; index < topNav.length; index += 1) {
            assert(Math.abs(topNav[index].x - whiteNav[index].x) <= 1,
              `link ${index} left drift ${whiteNav[index].x - topNav[index].x}px`);
            assert(Math.abs(topNav[index].width - whiteNav[index].width) <= 1,
              `link ${index} width drift ${whiteNav[index].width - topNav[index].width}px`);
            assert.deepEqual(topNav[index].typography, whiteNav[index].typography,
              `link ${index} typography changed`);
          }
        });

        await page.locator("[data-site-header]").evaluate(header => {
          header.classList.remove("is-collapsed", "is-ink", "forceShow");
        });
        await openMenu(page);
        const menuLogo = await box(page, "#site-menu .menu-brand");
        const close = await box(page, "#site-menu [data-menu-close]");
        const homeCta = await box(page, "#site-menu .menu-appointment");
        const homeCtaVisible = await visible(page, "#site-menu .menu-appointment");
        const shouldShowCta = width <= 578 || width >= 961;
        const expectedFocusOrder = ["brand", "language-vi", "language-en",
          ...(shouldShowCta ? ["cta"] : []), "close"];
        const domFocusOrder = await focusOrder(page);
        const tabFocusOrder = await keyboardFocusOrder(page, expectedFocusOrder.length);

        // Thiết kế menu đầy đủ: head có gutter riêng 25px (35px trên 1200px), không phải của header.
        const menuGutter = width > 1200 ? 35 : 25;
        record(failures, `${locale}/${width} menu logo`, () =>
          assert(Math.abs(menuLogo.x - menuGutter) <= 1 && Math.abs(menuLogo.y - menuGutter) <= 1,
            `logo at ${menuLogo.x},${menuLogo.y} expected ${menuGutter},${menuGutter}`));
        record(failures, `${locale}/${width} menu CTA visibility`, () =>
          assert.equal(homeCtaVisible, shouldShowCta));
        record(failures, `${locale}/${width} menu focus DOM order`, () =>
          assert.deepEqual(domFocusOrder, expectedFocusOrder));
        record(failures, `${locale}/${width} menu keyboard focus order`, () =>
          assert.deepEqual(tabFocusOrder, expectedFocusOrder));
        record(failures, `${locale}/${width} close right gutter`, () => {
          assert(close, "missing close bbox");
          assert(Math.abs(width - close.right - (menuGutter - 10)) <= 1,
            `close=${width - close.right}px expected=${menuGutter - 10}px`);
        });
        // Mobile đặt CTA ở hàng riêng dưới locale; head rộng hơn giữ nó bên trái close.
        if (width >= 961) {
          record(failures, `${locale}/${width} CTA before close`, () => {
            assert(homeCta && close, "missing CTA or close bbox");
            assert(homeCta.right <= close.left + 1,
              `CTA right=${homeCta.right}px overlaps/passes close left=${close.left}px`);
          });
        }

        const resizeWidth = new Map([[390, 768], [768, 1024], [1024, 1440], [1440, 1922], [1922, 390]]).get(width);
        await page.setViewportSize({ width: resizeWidth, height });
        // Headless Chromium có thể áp style media query mới sau resize một hai frame.
        await page.waitForTimeout(100);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const resizedOpen = await page.locator("#site-menu").evaluate(dialog => dialog.open && dialog.classList.contains("is-active"));
        const resizedLogo = await box(page, "#site-menu .menu-brand");
        const resizedClose = await box(page, "#site-menu [data-menu-close]");
        const resizedGutter = resizeWidth > 1200 ? 35 : 25;
        const resizedOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
        record(failures, `${locale}/${width}->${resizeWidth} open resize shell`, () => {
          assert.equal(resizedOpen, true, "menu closed during resize");
          assert(Math.abs(resizedLogo.x - resizedGutter) <= 1 && Math.abs(resizedLogo.y - resizedGutter) <= 1,
            `logo at ${resizedLogo.x},${resizedLogo.y} expected ${resizedGutter},${resizedGutter}`);
          assert(Math.abs(resizeWidth - resizedClose.right - (resizedGutter - 10)) <= 1,
            `close=${resizeWidth - resizedClose.right}px expected=${resizedGutter - 10}px`);
          assert.equal(resizedOverflow, false, "resize introduced horizontal overflow");
        });
        await page.setViewportSize({ width, height });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await page.keyboard.press("Escape");
        await page.waitForFunction(() => !document.querySelector("#site-menu")?.open);
        const escapeFocusReturned = await page.evaluate(() => document.activeElement?.matches("[data-menu-open]"));
        const reducedMotionActive = await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
        record(failures, `${locale}/${width} Escape focus return`, () =>
          assert.equal(escapeFocusReturned, true));
        record(failures, `${locale}/${width} reduced-motion active`, () =>
          assert.equal(reducedMotionActive, true));

        await openMenu(page);
        await page.keyboard.press("Escape");
        await page.waitForFunction(() => !document.querySelector("#site-menu")?.open);

        await page.goto(`${baseUrl}/${locale}/advertising-products/`, { waitUntil: "domcontentloaded" });
        await settle(page);
        const detailInk = {
          logo: await box(page, "[data-site-header] .brand"),
          hamburger: await box(page, "[data-site-header] [data-menu-open]"),
        };
        record(failures, `${locale}/${width} Advertising logo`, () =>
          assert(rectDelta(transparent.logo, detailInk.logo) <= 1,
            `bbox drift ${rectDelta(transparent.logo, detailInk.logo)}px`));
        record(failures, `${locale}/${width} Advertising hamburger`, () =>
          assert(rectDelta(transparent.hamburger, detailInk.hamburger) <= 1,
            `bbox drift ${rectDelta(transparent.hamburger, detailInk.hamburger)}px`));

        await openMenu(page);
        const advertisingCta = page.locator("#site-menu .menu-appointment");
        const advertisingVisible = await visible(page, "#site-menu .menu-appointment");
        const advertisingCopy = (await advertisingCta.textContent()).trim();
        const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
        record(failures, `${locale}/${width} Advertising CTA visibility`, () =>
          assert.equal(advertisingVisible, shouldShowCta));
        record(failures, `${locale}/${width} Advertising CTA copy`, () =>
          assert.equal(advertisingCopy, expectedCopy[locale]));
        record(failures, `${locale}/${width} horizontal overflow`, () =>
          assert.equal(hasHorizontalOverflow, false));
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}

assert.equal(failures.length, 0, `Shared header/menu P7 failures (${failures.length}):\n${failures.join("\n")}`);
console.log(`Shared header/menu P7: ${locales.length * widths.length} locale/viewport cells passed`);
