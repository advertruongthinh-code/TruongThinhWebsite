import assert from "node:assert/strict";
import path from "node:path";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true });
const base = process.env.BASE_URL || "http://127.0.0.1:8787";
try {
  for (const width of [1567, 920]) {
    const page = await browser.newPage({ viewport: { width, height: 910 } });
    await page.addInitScript(() => {
      window.motionEvents = [];
      const animate = Element.prototype.animate;
      Element.prototype.animate = function (...args) {
        const kind = this.matches("[data-advertising-photo-morph]") ? "morph"
          : this.matches("[data-advertising-photo-background]") ? "backdrop" : null;
        const result = animate.apply(this, args);
        if (kind) {
          window.motionEvents.push({ kind, phase: "start", at: performance.now() });
          result.addEventListener("finish", () => window.motionEvents.push({ kind, phase: "finish", at: performance.now() }));
        }
        return result;
      };
    });
    for (const via of ["back", "navbar", "navbar-related"]) {
      await page.goto(`${base}/vi/advertising-products/?category=office-signs-wayfinding`, { waitUntil: "networkidle" });
      await page.waitForFunction(() => window.TruongThinhAdvertising?.getAdapter?.());
      await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(1150));
      await page.waitForTimeout(500);
      const read = () => ({
        y: window.TruongThinhMotion.getLogicalScroll(), url: location.href,
        batch: [...document.querySelectorAll("[data-advertising-flow-preset]")].map(x => x.dataset.advertisingFlowPreset),
      });
      const before = await page.evaluate(read);
      const rect = await page.evaluate(() => [...document.querySelectorAll("[data-advertising-card] > a")]
        .map(x => ({ ...x.getBoundingClientRect().toJSON(), id: x.parentElement.dataset.advertisingCard })).find(r => r.top > 110 && r.top < innerHeight - 100));
      assert(rect, "visible grid card is available");
      await page.mouse.click(rect.x + rect.width / 2, Math.min(rect.bottom - 10, rect.top + 100));
      await page.waitForTimeout(1000);
      const events = await page.evaluate(() => window.motionEvents);
      const settled = events.find(e => e.kind === "morph" && e.phase === "finish");
      const backdrop = events.find(e => e.kind === "backdrop" && e.phase === "start");
      assert(settled && backdrop && backdrop.at >= settled.at, JSON.stringify(events));
      const clip = await page.locator('.advertising-photo-view__suggestion-link[aria-pressed="false"]').first()
        .evaluate(el => ({ clip: getComputedStyle(el).backgroundClip, border: getComputedStyle(el).borderTopColor }));
      assert.equal(clip.clip, "padding-box");
      assert.equal(clip.border, "rgba(0, 0, 0, 0)");
      let returnId = rect.id;
      if (via === "navbar-related") {
        const related = page.locator("[data-advertising-related-card] > a").first();
        returnId = await related.evaluate(el => el.parentElement.dataset.advertisingRelatedCard);
        await related.scrollIntoViewIfNeeded();
        await related.click();
        await page.waitForTimeout(900);
      }
      if (via === "back") await page.goBack();
      else await page.evaluate(() => document.querySelector('.desktop-nav a[href*="advertising-products"]').click());
      await page.waitForTimeout(900);
      const after = await page.evaluate(read);
      if (via === "back") {
        assert.equal(after.url, before.url);
        assert(Math.abs(after.y - before.y) <= 1, `${width}/${via}: ${before.y} -> ${after.y}`);
        assert.deepEqual(after.batch, before.batch);
      } else {
        assert.equal(new URL(after.url).search, "");
        const returned = await page.locator(`[data-advertising-card="${returnId}"]`).boundingBox();
        assert(returned);
        const targetTop = via === "navbar-related" ? Math.max(0, (910 - returned.height) / 2) : rect.top;
        assert(Math.abs(returned.y - targetTop) <= 2, `${width}/${via}: ${returned.y} != ${targetTop}`);
      }
      console.log(`PASS ${width}/${via}: restored target, scroll, border, sequential backdrop`);
    }
    await page.close();
  }
  for (const width of [1567, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 910 } });
    let previous;
    for (let run = 0; run < 2; run++) {
      await page.goto(`${base}/vi/advertising-products/`, { waitUntil: "networkidle" });
      await page.waitForFunction(() => window.TruongThinhAdvertising?.getAdapter?.());
      await page.waitForTimeout(1600);
      await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(document.documentElement.scrollHeight));
      await page.waitForTimeout(700);
      const geometry = await page.evaluate(() => {
        const copy = document.querySelector("[data-advertising-grid-ta], [data-advertising-grid-cta] .detail-cta__copy").getBoundingClientRect();
        const footer = document.querySelector("footer").getBoundingClientRect();
        const skeleton = document.querySelector(".advertising-grid__cta-skeleton").getBoundingClientRect();
        const section = document.querySelector(".project-index:has(.advertising-grid__cta-skeleton)");
        const glass = getComputedStyle(section, "::before");
        return { copy: copy.toJSON(), footer: footer.toJSON(), edge: skeleton.bottom,
          overlap: section.getBoundingClientRect().top + parseFloat(glass.top) + parseFloat(glass.height) - skeleton.bottom };
      });
      assert(geometry.copy.top >= 0 && geometry.copy.bottom < geometry.footer.top, JSON.stringify(geometry));
      assert(geometry.footer.bottom <= 911 && geometry.footer.top >= 0, JSON.stringify(geometry));
      assert(geometry.overlap >= 1.9, "white cover overlaps the clipped skeleton edge");
      if (previous) assert(Math.abs(previous.copy.top - geometry.copy.top) <= 1, "CTA stays fixed across random batches");
      previous = geometry;
      const png = await page.screenshot();
      const pixels = await page.evaluate(async ({ data, edge }) => {
        const bitmap = await createImageBitmap(await (await fetch(data)).blob());
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const ctx = canvas.getContext("2d"); ctx.drawImage(bitmap, 0, 0);
        return [0.1, 0.35, 0.65, 0.9].flatMap(fraction => [-1, 0, 1].map(offset =>
          [...ctx.getImageData(Math.floor(bitmap.width * fraction), Math.floor(edge) + offset, 1, 1).data].slice(0, 3)));
      }, { data: `data:image/png;base64,${png.toString("base64")}`, edge: geometry.edge });
      assert(pixels.every(rgb => rgb.every(channel => channel >= 253)), JSON.stringify(pixels));
    }
    console.log(`PASS ${width}: CTA/footer fit, stable reload position, white skeleton edge`);
    await page.close();
  }
} finally {
  await browser.close();
}
