import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const origin = process.env.BASE_URL || "http://127.0.0.1:8787";
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });

// Site shell R7: on a direct load the veil hides the header until it uncovers; the intro ends in the scroll state.
const sample = page => page.evaluate(() => {
  const header = document.querySelector("[data-site-header]");
  const logo = header?.querySelector(".brand");
  const veil = document.querySelector(".route-veil");
  // Before the render-blocking stylesheet applies nothing paints, so only styled frames count.
  if (!logo || !veil || getComputedStyle(veil).position !== "fixed") return null;
  const rect = logo.getBoundingClientRect();
  const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
  return {
    entering: document.documentElement.classList.contains("route-enter"),
    veilOpacity: Number(getComputedStyle(veil).opacity),
    headerOnTop: Boolean(hit?.closest("[data-site-header]")),
    collapsed: header.classList.contains("is-collapsed"),
    logoTransform: getComputedStyle(header.querySelector("#header-logo")).transform,
  };
});

const cases = [
  { route: "/vi/advertising-products/", viewport: { width: 1440, height: 900 }, scrollY: 0, collapsed: false },
  { route: "/vi/residential/", viewport: { width: 390, height: 844 }, scrollY: 1500, collapsed: true },
];

try {
  for (const { route, viewport, scrollY, collapsed } of cases) {
    const page = await browser.newPage({ viewport });
    try {
      await page.goto(`${origin}${route}`);
      await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
      // The locale fallback key feeds the direct mount scroll, standing in for a restored mid-page reload.
      await page.evaluate(([key, y]) => sessionStorage.setItem(key, String(y)), [`tt-locale-scroll:${route}`, scrollY]);
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false, latency: 300, downloadThroughput: 400_000, uploadThroughput: 200_000,
      });
      await page.reload({ waitUntil: "commit" });
      let covered = 0;
      for (;;) {
        const state = await sample(page).catch(() => null);
        if (state?.entering && state.veilOpacity < 0.99) break;
        if (state && !state.entering) break;
        if (state?.entering) {
          covered += 1;
          assert.equal(state.headerOnTop, false, `${route}: header must stay under the opaque veil: ${JSON.stringify(state)}`);
        }
        await page.waitForTimeout(50);
      }
      assert(covered > 0, `${route}: the covered phase was never sampled`);
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
      await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"), null, { timeout: 15_000 });
      await page.waitForTimeout(2600);
      const settled = await sample(page);
      assert.equal(settled.headerOnTop, true, `${route}: header shows after uncover`);
      assert.equal(settled.collapsed, collapsed, `${route}: header collapse follows scroll ${scrollY}`);
      assert(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/.test(settled.logoTransform), `${route}: intro must finish: ${settled.logoTransform}`);
    } finally {
      await page.close();
    }
  }
  console.log("route-veil-header: ok");
} finally {
  await browser.close();
}
