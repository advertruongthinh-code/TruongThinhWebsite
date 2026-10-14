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
    seed: window.TruongThinhAdvertising.getBrowseState().seed,
    gap: document.querySelector("footer.site-footer").getBoundingClientRect().top - document.querySelector("[data-advertising-grid-cta]").getBoundingClientRect().bottom,
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
  assert.notEqual(routed.seed, direct.seed, "a new route visit creates a fresh random seed");
  assert.ok(Math.abs(routed.gap - direct.gap) <= 1, "new-seed geometry preserves CTA-to-footer gap");
  const filters = await page.locator("[data-advertising-filter]").evaluateAll(nodes => nodes.map(node => node.dataset.advertisingFilter));
  const signatures = new Map();
  for (const category of [...filters, ...filters].filter(value => value !== "all")) {
    await page.locator(`[data-advertising-filter="${category}"]`).click();
    await page.waitForFunction(value => new URL(location.href).searchParams.get("category") === value, category);
    // Chờ khối CTA đứng yên giữa hai lần đọc thay cho 650ms cố định: runner bận còn đang chuyển khi đọc.
    await page.waitForFunction(() => {
      const cta = document.querySelector("[data-advertising-grid-cta]");
      const key = `${cta?.getBoundingClientRect().bottom}:${cta?.offsetHeight}:${document.querySelector("footer.site-footer")?.getBoundingClientRect().top}`;
      const settled = key === window.__ttCtaKey && !cta?.getAnimations().length &&
        [...document.querySelectorAll("[data-project-grid] .advertising-tile")].every((tile) => getComputedStyle(tile).transform === "none");
      window.__ttCtaKey = key;
      return settled;
    }, null, { polling: 150, timeout: 5_000 });
    const sample = await page.evaluate(read);
    assert(sample.hash, `${category}: geometry signature exists`);
    if (signatures.has(category)) assert.deepEqual(sample, signatures.get(category), `${category}: repeated filtering keeps coordinates and tail height`);
    else signatures.set(category, sample);
  }
  const beforeReload = await page.evaluate(read);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => window.TruongThinhAdvertising?.getAdapter?.());
  await page.waitForTimeout(1500);
  const reloaded = await page.evaluate(read);
  assert.notEqual(reloaded.seed, beforeReload.seed, "F5 reseeds the filtered pool");
  assert.equal(reloaded.height, beforeReload.height, "F5 preserves CTA typography/height");
  assert.equal(reloaded.footer, beforeReload.footer, "F5 preserves footer typography/height");
  assert.ok(Math.abs(reloaded.gap - beforeReload.gap) <= 1, "F5 preserves CTA-to-footer gap");
  assert.ok(reloaded.hash, "new-seed layout retains its geometry signature");
  console.log(`PASS route footer and deterministic geometry for ${signatures.size} filters`);
} finally { await browser.close(); }
