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
  await expect(page.locator("[data-project-grid] > noscript")).toBeHidden();
});
