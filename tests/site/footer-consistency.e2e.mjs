import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const routes = ["", "about/", "residential/", "commercial/", "advertising-products/"];
const detailRoutes = [
  "kiosk-posm",
  "mobile-retail",
  "signage-raised-letters",
  "office-signs-wayfinding",
  "led-displays-lightboxes",
  "print-decals",
].map(slug => `advertising-products/${slug}/`);
const sources = routes.map(route => fs.readFileSync(path.join("src/site", route, "index.html"), "utf8"));
const footerSource = sources.map(source => source.match(/<footer\b[\s\S]*?<\/footer>/)[0]
  .replace(/\s+/g, " ")
  .replace(/>\s+</g, "><")
  .trim());
assert.ok(footerSource.every(footer => footer === footerSource[0]), "Shared footer markup must match");
for (const route of detailRoutes) {
  const generated = fs.readFileSync(path.join(".site-output", route, "index.html"), "utf8");
  assert.match(generated, /data-advertising-compatibility-route/,
    `${route}: generated output is not the compatibility redirect shell`);
  assert.match(generated, /location\.replace\(target\.href\)/,
    `${route}: generated output does not resolve to the canonical parent route`);
  assert.doesNotMatch(generated, /<footer\b/i,
    `${route}: compatibility redirect must not fork the canonical footer markup`);
}
const browser = await chromium.launch({ headless: true });
try {
  let count = 0;
  for (const width of [320, 390, 750, 751, 768, 1024, 1440, 1569]) {
    const expectedTopGap = width <= 750 ? 48 : 64;
    let expectedHeight;
    const page = await browser.newPage({ viewport: { width, height: 912 }, reducedMotion: "reduce" });
    await page.route(/\.(?:avif|gif|jpe?g|mp4|png|webm|webp)(?:\?.*)?$/i, route => route.abort());
    for (const locale of ["vi", "en"]) {
      for (const route of [...routes, "advertising-products/?category=kiosk-posm&photo=kiosk-posm-06", ...detailRoutes]) {
        await page.goto(`http://127.0.0.1:8787/${locale}/${route}`, { waitUntil: "domcontentloaded" });
        await page.waitForSelector(".footer-contact");
        await page.evaluate(() => document.fonts.ready);
        const result = await page.evaluate(() => {
          const footer = document.querySelector(".site-footer");
          const rect = footer.getBoundingClientRect();
          const bottom = footer.querySelector(".footer-bottom").getBoundingClientRect();
          const previous = footer.previousElementSibling?.getBoundingClientRect();
          return {
            height: rect.height, bottomHeight: bottom.height, trailing: rect.bottom - bottom.bottom,
            topGap: previous ? rect.top - previous.bottom : null,
            marginTop: Number.parseFloat(getComputedStyle(footer).marginTop) || 0,
            children: [...footer.querySelector(".footer-contact").children].map(e => e.className),
            invitation: footer.querySelectorAll(".footer-intro, .site-invitation__link").length,
            address: footer.querySelector(".footer-address strong").textContent,
            copyright: footer.querySelector(".footer-bottom").textContent.trim(),
            overflow: document.documentElement.scrollWidth > innerWidth + 1,
            socials: footer.querySelectorAll(".footer-social[aria-label]").length,
          };
        });
        expectedHeight ??= result.height;
        assert.ok(Math.abs(result.height - expectedHeight) < 1, JSON.stringify({ width, route, locale, result, expectedHeight }));
        assert.equal(result.bottomHeight, 72);
        assert.equal(result.trailing, 0);
        assert.ok(Math.abs(result.topGap - expectedTopGap) <= 1,
          JSON.stringify({ width, route, locale, result, expectedTopGap }));
        assert.equal(result.marginTop, expectedTopGap);
        assert.deepEqual(result.children, ["footer-address", "footer-socials"]);
        assert.equal(result.invitation, 0);
        assert.equal(result.socials, 4);
        assert.ok(result.address.includes("E16 Khu đô thị Hưng Phú"));
        assert.equal(result.copyright, "© 2026 Trường Thịnh");
        assert.equal(result.overflow, false, JSON.stringify({ width, route, locale }));
        count++;
      }
    }
    console.log(JSON.stringify({ width, footerHeight: expectedHeight, copyrightHeight: 72, expectedTopGap }));
    await page.close();
  }
  console.log(`Footer consistency: ${count} route/locale/viewport checks passed`);
} finally {
  await browser.close();
}
