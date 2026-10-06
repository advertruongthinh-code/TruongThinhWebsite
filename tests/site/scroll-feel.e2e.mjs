import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

// docs/specs/scroll-feel.md R1, R3, R4, R5.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8787";

if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, ".tooling/browsers");
}

const { chromium } = await import("playwright");
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
const settle = (page) => page.waitForFunction(() => document.documentElement.classList.contains("motion-ready"));

const pages = {
  home: "",
  residential: "residential/",
  commercial: "commercial/",
  about: "about/",
  advertising: "advertising-products/",
  category: "advertising-products/?category=kiosk-posm",
};
const parallax = {
  home: [".hero-slides:-2", ".project-track:4"],
  residential: [".hero-slides:-2"],
  commercial: [".hero-slides:-2"],
  about: [".about-hero__media:-2"],
  advertising: [],
  category: [],
};

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const travel = {};
  for (const [name, route] of Object.entries(pages)) {
    await page.goto(`${baseUrl}/vi/${route}`, { waitUntil: "load" });
    await settle(page);
    await page.waitForTimeout(1500);

    // R4: chỉ media hero (và rail trang chủ) mang speed của Locomotive.
    const speeds = await page.evaluate(() => [...document.querySelectorAll("[data-scroll-speed]")]
      .map((node) => `.${node.classList[0]}:${node.dataset.scrollSpeed}`).sort());
    assert.deepEqual(speeds, [...parallax[name]].sort(), `${name}: parallax targets follow R4`);

    // R3: media hero vẫn phủ hero khi nó trôi.
    const hero = await page.evaluate(() => document.querySelector(".hero")?.getBoundingClientRect().height || 0);
    for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
      await page.evaluate((y) => window.TruongThinhMotion.setLogicalScroll(y), Math.round(hero * fraction));
      await page.waitForTimeout(120);
      const gap = await page.evaluate(() => {
        const box = document.querySelector(".hero")?.getBoundingClientRect();
        const media = document.querySelector(".hero [data-scroll-speed]")?.getBoundingClientRect();
        if (!box || !media) return 0;
        const top = Math.max(box.top, 0);
        const bottom = Math.min(box.bottom, innerHeight);
        if (bottom <= top) return 0;
        return Math.max(media.top - top, bottom - media.bottom, 0);
      });
      assert.ok(gap <= 1, `${name}: hero media shows an edge at ${fraction} of the hero (${gap}px)`);
    }

    // R1: cùng wheel input đi cùng khoảng cách trên mọi trang.
    await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(0));
    await page.waitForTimeout(300);
    await page.mouse.move(720, 450);
    for (let tick = 0; tick < 3; tick += 1) {
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(1800);
    travel[name] = await page.evaluate(() => window.TruongThinhMotion.getLogicalScroll());

    // R1: cuộn dài (vào masonry Advertising) lướt mượt, không có frame nhảy vượt các frame lân cận.
    await page.evaluate(() => window.TruongThinhMotion.setLogicalScroll(0));
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      window.scrollFeelY = [];
      const sample = () => {
        window.scrollFeelY.push(window.TruongThinhMotion.getLogicalScroll());
        if (!window.scrollFeelY.done) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    for (let tick = 0; tick < 40; tick += 1) {
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(500);
    const skips = await page.evaluate(() => {
      const ys = window.scrollFeelY;
      ys.done = true;
      const steps = ys.slice(1).map((y, index) => y - ys[index]);
      return steps.filter((step, index) => index > 0 && index < steps.length - 1 && step > 2
        && step > 1.3 * steps[index - 1] && step > 1.3 * steps[index + 1]).length;
    });
    assert.equal(skips, 0, `${name}: ${skips} frames skip ahead while scrolling`);
  }
  for (const [name, distance] of Object.entries(travel)) {
    assert.ok(Math.abs(distance - travel.home) <= 1, `${name}: wheel travel ${distance} matches home ${travel.home}`);
  }
  await page.close();

  // R5: khối Giữ nghề theo CTA banner Espacio ở mọi width.
  const expected = (width) => ({
    height: width > 1200 ? 600 : width > 960 ? 500 : 400,
    gutter: width > 1200 ? Math.max(35, (width - 1500) / 2) : width > 750 ? 25 : 15,
    below: width > 960 ? 90 : width > 578 ? 60 : 30,
  });
  for (const locale of ["vi", "en"]) {
    for (const width of [320, 375, 390, 414, 600, 768, 980, 1024, 1280, 1440, 1920]) {
      const view = await browser.newPage({ viewport: { width, height: 900 } });
      await view.goto(`${baseUrl}/${locale}/`, { waitUntil: "load" });
      await settle(view);
      await view.evaluate(() => document.fonts.ready);
      const block = await view.evaluate(() => {
        const section = document.querySelector(".legacy-closer");
        const box = section.getBoundingClientRect();
        const copy = section.querySelector(".legacy-copy").getBoundingClientRect();
        const title = section.querySelector("h2");
        const titleBox = title.getBoundingClientRect();
        const link = section.querySelector(".legacy-link");
        const label = link?.querySelector(".portal-subtitle")?.getBoundingClientRect();
        const next = section.nextElementSibling.getBoundingClientRect();
        return {
          height: box.height,
          left: box.left,
          right: document.documentElement.clientWidth - box.right,
          below: next.top - box.bottom,
          fontSize: parseFloat(getComputedStyle(title).fontSize),
          fits: titleBox.top >= copy.top - 1 && titleBox.bottom <= copy.bottom + 1
            && [title, ...title.querySelectorAll(".line-mask")].every((node) => node.scrollWidth <= node.clientWidth + 1),
          href: link?.getAttribute("href"),
          linkGap: label ? label.top - titleBox.bottom : null,
        };
      });
      const target = expected(width);
      const label = `${locale} ${width}px`;
      assert.ok(Math.abs(block.height - target.height) <= 1, `${label}: block height ${block.height}`);
      assert.ok(Math.abs(block.left - target.gutter) <= 1 && Math.abs(block.right - target.gutter) <= 1,
        `${label}: gutters ${block.left}/${block.right}`);
      assert.ok(Math.abs(block.below - target.below) <= 1, `${label}: space below ${block.below}`);
      assert.ok(block.fontSize >= 24 && block.fontSize <= 64, `${label}: title size ${block.fontSize}`);
      assert.ok(block.fits, `${label}: title fits the copy box`);
      assert.equal(block.href, `/${locale}/about/`, `${label}: link goes to About`);
      assert.ok(block.linkGap >= 15 && block.linkGap <= 24, `${label}: link sits under the title (${block.linkGap}px)`);
      await view.close();
    }
  }
} finally {
  await browser.close();
}
