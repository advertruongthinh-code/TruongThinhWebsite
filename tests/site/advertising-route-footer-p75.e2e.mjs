import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true });
const base = process.env.BASE_URL || "http://127.0.0.1:8787";
try {
  const page = await browser.newPage({ viewport: { width: 1567, height: 910 } });
  const read = () => ({
    height: document.querySelector("[data-advertising-grid-cta]")?.offsetHeight,
    hash: document.querySelector(".advertising-grid__cta-skeleton")?.dataset.advertisingCtaSignature,
    footer: document.querySelector("footer.site-footer")?.offsetHeight,
  });
  await page.goto(`${base}/vi/advertising-products/`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.TruongThinhAdvertising?.getAdapter?.());
  await page.waitForTimeout(1500);
  const direct = await page.evaluate(read);
  await page.goto(`${base}/vi/`, { waitUntil: "networkidle" });
  await page.locator('.desktop-nav a[href*="advertising-products"]').click();
  await page.waitForFunction(() => window.TruongThinhAdvertising?.getAdapter?.());
  await page.waitForTimeout(2000);
  const routed = await page.evaluate(read);
  console.log({ direct, routed });
  assert.equal(routed.height, direct.height, "route entry must measure the new container footer");
  assert.equal(routed.hash, direct.hash, "route entry must preserve grid and skeleton geometry");
  const filters = await page.locator("[data-advertising-filter]").evaluateAll(nodes => nodes.map(node => node.dataset.advertisingFilter));
  const signatures = new Map();
  for (const category of [...filters, ...filters].filter(value => value !== "all")) {
    await page.locator(`[data-advertising-filter="${category}"]`).click();
    await page.waitForFunction(value => new URL(location.href).searchParams.get("category") === value, category);
    await page.waitForTimeout(650);
    const sample = await page.evaluate(read);
    assert(sample.hash, `${category}: geometry signature exists`);
    if (signatures.has(category)) assert.deepEqual(sample, signatures.get(category), `${category}: repeated filtering keeps coordinates and tail height`);
    else signatures.set(category, sample);
  }
  const beforeReload = await page.evaluate(read);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => window.TruongThinhAdvertising?.getAdapter?.());
  await page.waitForTimeout(1500);
  assert.deepEqual(await page.evaluate(read), beforeReload, "filtered reload preserves geometry");
  console.log(`PASS route footer and deterministic geometry for ${signatures.size} filters`);
} finally { await browser.close(); }
