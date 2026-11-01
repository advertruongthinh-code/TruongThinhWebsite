import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";
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
  // Rộng hơn 750px bốn cột (751-1023px ba cột); từ 750px trở xuống footer gọn: dọc hai cột (icon xếp dọc), ngang địa chỉ trên hai số.
  for (const [width, height] of [[320, 912], [390, 912], [750, 912], [751, 912], [768, 912], [1024, 912], [1201, 912], [1440, 912], [1569, 912], [568, 320], [667, 375], [844, 390], [1280, 632]]) {
    const small = width <= 750 || height <= 640;
    let expectedHeight;
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" });
    await page.route(/\.(?:avif|gif|jpe?g|jxl|mp4|png|webm|webp)(?:\?.*)?$/i, route => route.abort());
    for (const locale of ["vi", "en"]) {
      for (const route of [...routes, "advertising-products/?category=kiosk-posm&photo=kiosk-posm-06", ...detailRoutes]) {
        await page.goto(`${baseUrl}/${locale}/${route}`, { waitUntil: "domcontentloaded" });
        await page.waitForSelector(".footer-contact");
        // Route detail redirect về route Advertising canonical; chờ runtime state của nó.
        await page.waitForFunction(() => !location.pathname.includes("/advertising-products/")
          || document.body.classList.contains(/\/p\/[^/]+\/$/.test(location.pathname) ? "is-advertising-photo" : "is-advertising-browse"));
        await page.evaluate(() => document.fonts.ready);
        // Reduced motion vẫn cho mọi property transition 0.01ms, nên để thay đổi class settle.
        await page.waitForTimeout(100);
        const result = await page.evaluate(() => {
          const footer = document.querySelector(".site-footer");
          const rect = footer.getBoundingClientRect();
          const previous = footer.previousElementSibling?.getBoundingClientRect();
          const url = new URL(location.href);
          return {
            height: rect.height, width: rect.width,
            borderTop: getComputedStyle(footer).borderTopWidth,
            lockups: footer.querySelectorAll(".brand-lockup").length,
            weights: [".footer-hotline", ".footer-office"].map(s => getComputedStyle(footer.querySelector(s)).fontWeight),
            copyright: footer.querySelectorAll(".footer-bottom").length,
            topGap: previous ? rect.top - previous.bottom : null,
            marginTop: Number.parseFloat(getComputedStyle(footer).marginTop) || 0,
            // Masonry browse và detail đều kết thúc bằng batch CTA sát footer (CTA R9), nên đọc class của body.
            advertisingBrowse: document.body.classList.contains("is-advertising-browse"),
            bodyClass: document.body.className,
            children: [...footer.querySelector(".footer-contact").children].map(e => e.className),
            invitation: footer.querySelectorAll(".footer-intro, .site-invitation__link").length,
            address: footer.querySelector(".footer-address strong").textContent,
            phones: [...footer.querySelectorAll(".footer-hotline, .footer-office")].map(e => [e.getAttribute("href"), e.querySelector("strong").textContent]),
            overflow: document.documentElement.scrollWidth > innerWidth + 1,
            socials: [...footer.querySelectorAll(".footer-social[aria-label]")].map(e => e.dataset.footerSocial),
            socialSize: footer.querySelector(".footer-social").getBoundingClientRect().width,
            labelWidth: Math.max(...[...footer.querySelectorAll("span")].map(e => e.getBoundingClientRect().width)),
            icons: footer.querySelectorAll(".footer-icon[aria-hidden='true']").length,
            padding: ["Top", "Right", "Left"].map(side => Number.parseFloat(getComputedStyle(footer)[`padding${side}`])),
            fontSizes: [".footer-address", ".footer-hotline"].map(s => Number.parseFloat(getComputedStyle(footer.querySelector(s)).fontSize)),
            numbersDraggable: [".footer-hotline", ".footer-office"].map(s => getComputedStyle(footer.querySelector(s)).webkitUserDrag),
            contactLeft: footer.querySelector(".footer-address").getBoundingClientRect().left,
            socialsRight: footer.querySelector(".footer-socials").getBoundingClientRect().right,
          };
        });
        // Advertising browse bỏ gap trên footer: skeleton batch của nó lấp khoảng đó.
        const expectedTopGap = result.advertisingBrowse ? 0 : width <= 750 ? 48 : 64;
        expectedHeight ??= result.height;
        assert.ok(Math.abs(result.height - expectedHeight) < 1, JSON.stringify({ width, route, locale, result, expectedHeight }));
        // Viền trên tràn mép trang; không logo; hotline cùng độ đậm số bàn. Không chừa làn floating CTA:
        // lề phải bằng lề trái, màn thường đệm dọc từ 40px. Các cột giãn đều: biên trái tới địa chỉ bằng
        // biên phải sau mạng xã hội; địa chỉ cùng cỡ chữ hai số; kéo chuột bôi đen được số (link không kéo đi).
        // Cửa sổ thấp nằm ngang dùng icon 24px để footer không quá 38.2% viewport.
        assert.equal(result.width, width);
        assert.equal(result.borderTop, "1px");
        assert.equal(result.lockups, 0);
        assert.deepEqual(result.weights, ["500", "500"]);
        const [padTop, padRight, padLeft] = result.padding;
        assert.equal(padRight, padLeft, JSON.stringify({ width, route, result }));
        if (!small) assert.ok(padTop >= 40, JSON.stringify({ width, route, result }));
        assert.equal(result.fontSizes[0], result.fontSizes[1], JSON.stringify({ width, route, result }));
        assert.deepEqual(result.numbersDraggable, ["none", "none"]);
        assert.ok(Math.abs(result.contactLeft - (width - result.socialsRight)) <= 1, JSON.stringify({ width, route, result }));
        if (small) assert.ok(result.height <= height * 0.382, JSON.stringify({ width, height, route, result }));
        assert.ok(Math.abs(result.topGap - expectedTopGap) <= 1,
          JSON.stringify({ width, route, locale, result, expectedTopGap }));
        assert.equal(result.marginTop, expectedTopGap);
        assert.deepEqual(result.children, ["footer-address", "footer-hotline", "footer-office", "footer-socials"]);
        assert.deepEqual(result.phones, [["tel:+84949131050", "+84 949 131 050"], ["tel:+842753813753", "+84 275 381 3753"]]);
        assert.equal(result.invitation, 0);
        assert.deepEqual(result.socials, ["facebook", "tiktok", "youtube"]);
        assert.equal(result.socialSize, height <= 640 && width > height ? 24 : width <= 750 ? 28 : 36);
        assert.ok(result.labelWidth <= 1, "icons replace visible footer labels");
        assert.equal(result.icons, 3);
        assert.ok(result.address.includes("E16 Khu đô thị Hưng Phú"));
        assert.equal(result.copyright, 0);
        assert.equal(result.overflow, false, JSON.stringify({ width, route, locale }));
        // Cuối trang đã có nút Zalo của trang (lời mời, .detail-cta) nên floating CTA không hiện lại.
        // Bỏ qua Advertising: browse nối batch khi cuộn tới cuối, photo view có luật CTA riêng.
        const ctaShownAtEnd = !route.startsWith("advertising-products") && await page.evaluate(async () => {
          scrollTo(0, document.documentElement.scrollHeight);
          await new Promise(resolve => setTimeout(resolve, 300));
          const cta = document.querySelector(".floating-cta");
          return Boolean(cta?.classList.contains("show") && getComputedStyle(cta).visibility !== "hidden");
        });
        assert.equal(ctaShownAtEnd, false, JSON.stringify({ width, height, route, locale }));
        count++;
      }
    }
    // 404 vừa một màn hình: floating CTA ẩn khi footer lọt vào viewport nên không đè nội dung footer.
    for (const locale of ["vi", "en"]) {
      await page.goto(`${baseUrl}/${locale}/khong-co-trang-nay/`, { waitUntil: "load" });
      await page.waitForSelector(".footer-contact");
      await page.waitForTimeout(1200);
      const hits = await page.evaluate(() => {
        const cta = document.querySelector(".floating-cta");
        if (!cta?.classList.contains("show")) return [];
        const c = cta.getBoundingClientRect();
        return [...document.querySelectorAll(".site-footer :is(a, strong, p, svg)")]
          .filter(e => e.getClientRects().length)
          .map(e => e.getBoundingClientRect())
          .filter(r => c.left < r.right && r.left < c.right && c.top < r.bottom && r.top < c.bottom)
          .map(r => [r.left, r.top, r.right, r.bottom]);
      });
      assert.deepEqual(hits, [], JSON.stringify({ width, height, locale, route: "404" }));
    }
    console.log(JSON.stringify({ width, height, footerHeight: expectedHeight }));
    await page.close();
  }
  console.log(`Footer consistency: ${count} route/locale/viewport checks passed`);
  // Màn đầu trang chủ, Nhà ở, Kinh doanh: floating CTA hiện cùng nút dừng hero; hai nút không được chồng nhau.
  // Nút dừng chỉ có khi không reduced motion. Hai trang con dùng cùng CSS nên chỉ kiểm VI.
  for (const [width, height] of [[320, 568], [360, 800], [390, 844], [430, 932], [750, 912], [568, 320], [667, 375], [844, 390], [1024, 600], [1280, 632], [1440, 900]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    for (const path of ["vi/", "en/", "vi/residential/", "vi/commercial/"]) {
      await page.goto(`${baseUrl}/${path}`, { waitUntil: "load" });
      await page.waitForFunction(() => document.querySelector(".floating-cta.show")
        && document.querySelector("[data-motion-toggle]:not([hidden])")?.getClientRects().length);
      // Chờ CTA trượt vào xong (transform 1s).
      await page.waitForTimeout(1200);
      const rects = await page.evaluate(() => [".floating-cta", "[data-motion-toggle]"]
        .map(selector => document.querySelector(selector).getBoundingClientRect())
        .map(r => [r.left, r.top, r.right, r.bottom]));
      const [c, t] = rects;
      assert.ok(!(c[0] < t[2] && t[0] < c[2] && c[1] < t[3] && t[1] < c[3]),
        `floating CTA covers the hero motion toggle ${JSON.stringify({ width, height, path, rects })}`);
    }
    await page.close();
  }
  console.log("Hero motion toggle clear of floating CTA");
} finally {
  await browser.close();
}
