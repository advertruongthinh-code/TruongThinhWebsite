"use strict";

const { test, expect } = require("playwright/test");

const routes = [
  "/vi/",
  "/vi/residential/",
  "/vi/commercial/",
  "/vi/advertising-products/",
  "/vi/about/",
];

for (const route of routes) {
  test(`${route} loads without browser errors`, async ({ page }) => {
    const errors = [];
    const failedRequests = [];

    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("requestfailed", (request) => {
      failedRequests.push(`${request.method()} ${request.url()}`);
    });

    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response, "navigation response").not.toBeNull();
    expect(response.ok(), `HTTP ${response.status()} for ${route}`).toBeTruthy();
    await expect(page.locator("h1")).toHaveCount(1);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow, "horizontal overflow").toBeFalsy();
    expect(errors, "console/page errors").toEqual([]);
    expect(failedRequests, "failed network requests").toEqual([]);
  });
}

test("reduced motion keeps content visible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/vi/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator("body")).not.toHaveCSS("visibility", "hidden");
});

test("locale navigation switches to English and survives reload", async ({ page }) => {
  await page.goto("/vi/", { waitUntil: "domcontentloaded" });
  await page.locator('[data-language-option="en"]').evaluate((link) => link.click());
  await page.waitForURL(/\/en\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/en\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("fail-open menu opens and closes without crashing the page", async ({ page }) => {
  await page.route(/\/motion\.js$/, (route) => route.abort());
  for (const route of ["/vi/", "/vi/advertising-products/"]) {
    await page.goto(route, { waitUntil: "load" });
    await expect(page.locator("html")).toHaveClass(/motion-fallback/);
    for (const close of [() => page.locator("[data-menu-close]").click(), () => page.keyboard.press("Escape")]) {
      await page.locator("[data-menu-open]").click();
      await expect(page.locator("#site-menu")).toHaveJSProperty("open", true);
      await close();
      await expect(page.locator("#site-menu")).toHaveJSProperty("open", false);
      await expect(page.locator("[data-menu-open]")).toBeFocused();
    }
  }
});

test("direct loads and reload play the route enter veil, then clear it", async ({ page }) => {
  await page.addInitScript(() => {
    new MutationObserver(() => {
      if (document.documentElement?.classList.contains("route-enter")) window.routeEnterSeen = true;
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ["class"] });
  });
  for (const load of [() => page.goto("/vi/advertising-products/", { waitUntil: "load" }), () => page.reload({ waitUntil: "load" })]) {
    await load();
    expect(await page.evaluate(() => window.routeEnterSeen === true), "load skipped the route enter").toBe(true);
    await expect(page.locator("html")).not.toHaveClass(/route-enter/);
    await expect(page.locator(".route-veil")).toHaveCSS("opacity", "0");
  }
});

test("scrolling the advertising grid still lets a photo push its own entry", async ({ page }) => {
  await page.addInitScript(() => {
    window.historyWrites = 0;
    for (const method of ["pushState", "replaceState"]) {
      const original = history[method];
      history[method] = function (...args) {
        window.historyWrites += 1;
        return original.apply(this, args);
      };
    }
  });
  await page.goto("/vi/advertising-products/", { waitUntil: "load" });
  await expect(page.locator("html")).not.toHaveClass(/route-enter/);
  await page.waitForTimeout(1_000);
  await page.mouse.move(400, 400);
  const before = await page.evaluate(() => window.historyWrites);
  const started = Date.now();
  for (let step = 0; step < 80; step += 1) {
    await page.mouse.wheel(0, 60);
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(400);
  const writes = await page.evaluate(() => window.historyWrites) - before;
  // Throttled scroll persistence writes about 3 times per second; Chrome's limit is 20 per second.
  expect(writes / ((Date.now() - started) / 1_000), "scroll history writes per second").toBeLessThan(5);
  const length = await page.evaluate(() => history.length);
  const photo = await page.evaluate(() => [...document.querySelectorAll("[data-advertising-card]")].find((card) => {
    const rect = card.getBoundingClientRect();
    return rect.top > 120 && rect.bottom < innerHeight;
  })?.dataset.advertisingCard);
  expect(photo, "a fully visible card").toBeTruthy();
  await page.locator(`[data-advertising-card="${photo}"] > a`).click();
  await expect(page).toHaveURL(new RegExp(`[?&]photo=${photo}`));
  expect(await page.evaluate(() => history.length)).toBe(length + 1);
  await page.goBack();
  await expect(page).toHaveURL(/\/vi\/advertising-products\/(\?(?!.*photo=).*)?$/);
});
