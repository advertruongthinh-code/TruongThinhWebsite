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
  // Small windows (<=750px wide or <=640px tall) use the compact footer: two rows on narrow portrait, else one row.
  for (const [width, height] of [[320, 912], [390, 912], [750, 912], [751, 912], [768, 912], [1024, 912], [1440, 912], [1569, 912], [844, 390], [1280, 632]]) {
    const compact = width <= 750 || height <= 640;
    const twoRows = width <= 750 && width < height;
    let expectedHeight;
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" });
    await page.route(/\.(?:avif|gif|jpe?g|mp4|png|webm|webp)(?:\?.*)?$/i, route => route.abort());
    for (const locale of ["vi", "en"]) {
      for (const route of [...routes, "advertising-products/?category=kiosk-posm&photo=kiosk-posm-06", ...detailRoutes]) {
        await page.goto(`http://127.0.0.1:8787/${locale}/${route}`, { waitUntil: "domcontentloaded" });
        await page.waitForSelector(".footer-contact");
        // Detail routes redirect to the canonical Advertising route; wait for its runtime state.
        await page.waitForFunction(() => !location.pathname.includes("/advertising-products/")
          || document.body.classList.contains(location.search.includes("photo=") ? "is-advertising-photo" : "is-advertising-browse"));
        await page.evaluate(() => document.fonts.ready);
        const result = await page.evaluate(() => {
          const footer = document.querySelector(".site-footer");
          const rect = footer.getBoundingClientRect();
          const bottom = footer.querySelector(".footer-bottom").getBoundingClientRect();
          const previous = footer.previousElementSibling?.getBoundingClientRect();
          const url = new URL(location.href);
          return {
            height: rect.height, bottomHeight: bottom.height, trailing: rect.bottom - bottom.bottom,
            topGap: previous ? rect.top - previous.bottom : null,
            marginTop: Number.parseFloat(getComputedStyle(footer).marginTop) || 0,
            advertisingBrowse: url.pathname.endsWith("/advertising-products/") && !url.searchParams.has("photo"),
            children: [...footer.querySelector(".footer-contact").children].map(e => e.className),
            invitation: footer.querySelectorAll(".footer-intro, .site-invitation__link").length,
            address: footer.querySelector(".footer-address strong").textContent,
            copyright: footer.querySelector(".footer-bottom").textContent.trim(),
            overflow: document.documentElement.scrollWidth > innerWidth + 1,
            socials: [...footer.querySelectorAll(".footer-social[aria-label]")].map(e => e.dataset.footerSocial),
            socialSize: footer.querySelector(".footer-social").getBoundingClientRect().width,
            socialLabelWidth: footer.querySelector(".footer-socials > span").getBoundingClientRect().width,
          };
        });
        // Advertising browse drops the gap above the footer: its skeleton batch fills that space.
        const expectedTopGap = result.advertisingBrowse ? 0 : width <= 750 ? 48 : 64;
        expectedHeight ??= result.height;
        assert.ok(Math.abs(result.height - expectedHeight) < 1, JSON.stringify({ width, route, locale, result, expectedHeight }));
        if (!compact) assert.equal(result.bottomHeight, 72);
        if (twoRows) assert.equal(result.bottomHeight, 44);
        if (!compact || twoRows) assert.equal(result.trailing, 0);
        if (compact) assert.ok(result.height <= height * 0.382, JSON.stringify({ width, height, route, result }));
        assert.ok(Math.abs(result.topGap - expectedTopGap) <= 1,
          JSON.stringify({ width, route, locale, result, expectedTopGap }));
        assert.equal(result.marginTop, expectedTopGap);
        assert.deepEqual(result.children, ["footer-address", "footer-socials"]);
        assert.equal(result.invitation, 0);
        assert.deepEqual(result.socials, ["facebook", "tiktok", "youtube"]);
        assert.equal(result.socialSize, compact ? 24 : 30);
        assert.equal(result.socialLabelWidth <= 1, compact, "compact footer hides the social label visually");
        assert.ok(result.address.includes("E16 Khu đô thị Hưng Phú"));
        assert.equal(result.copyright, "© 2026 Trường Thịnh");
        assert.equal(result.overflow, false, JSON.stringify({ width, route, locale }));
        count++;
      }
    }
    console.log(JSON.stringify({ width, height, footerHeight: expectedHeight, compact, twoRows }));
    await page.close();
  }
  console.log(`Footer consistency: ${count} route/locale/viewport checks passed`);
} finally {
  await browser.close();
}
