// first-load-parity R2: mở trực tiếp chạy motion chữ hero giống chuyển mềm, không lộ chữ trước motion.
// progressive-loading R4: veil chờ font, không chờ ảnh hero.
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve(".tooling/browsers");
const { chromium } = await import("playwright");
const origin = process.env.BASE_URL || "http://127.0.0.1:8787";
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });

// Ghi mỗi frame: opacity veil và opacity thật (nhân cả cây cha) của từ đầu, từ cuối, hoặc cả title khi chưa tách từ.
const recorder = () => {
  const frames = (window.__heroFrames = []);
  const visible = (node) => {
    let opacity = 1;
    for (let item = node; item?.nodeType === 1; item = item.parentElement) opacity *= Number(getComputedStyle(item).opacity);
    return opacity;
  };
  const tick = () => {
    const veil = document.querySelector(".route-veil");
    // Barba chèn container mới sau container cũ: title cuối là của trang đích.
    const title = [...document.querySelectorAll(
      "main .hero .hero-content > :is(h1, p.hero-title):not(.hero-kicker)",
    )].at(-1);
    if (veil && title && getComputedStyle(veil).position === "fixed") {
      const words = [...title.querySelectorAll(".motion-word, .hero-word")];
      frames.push({
        t: performance.now() - (window.__heroStart ?? 0),
        page: title.closest("[data-barba=container]")?.dataset.barbaNamespace,
        veil: Number(getComputedStyle(veil).opacity),
        first: visible(words[0] ?? title),
        last: visible(words.at(-1) ?? title),
        split: words.length > 0,
      });
    }
    if (frames.length < 1200) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const summarize = (recorded) => {
  const frames = recorded.filter((f) => f.page === recorded.at(-1)?.page);
  // Veil bắt đầu mở: frame đầu veil dưới 0,98 sau khi đã che đủ. Delay intro đếm từ mốc này (first-load-parity R2).
  const covered = frames.findIndex((f) => f.veil >= 0.98);
  const reveal = frames.find((f, i) => i > covered && f.veil < 0.98);
  const fading = (key) => frames.find((f) => f.split && f[key] > 0.02 && f[key] < 0.98);
  // Chữ lộ trước motion: veil đã mở một phần mà chữ đứng đủ trước khi từ đầu bắt đầu fade.
  const start = fading("first");
  const end = fading("last");
  const flash = frames.filter((f) => f.veil < 0.95 && f.first > 0.5 && (!start || f.t < start.t)).length;
  return {
    reveal: reveal?.t,
    fadeStart: start?.t,
    lag: start && reveal ? start.t - reveal.t : undefined,
    // Khoảng stagger từ từ đầu tới từ cuối bắt đầu fade; ít nhiễu hơn đo lúc fade xong.
    span: start && end ? end.t - start.t : undefined,
    split: frames.some((f) => f.split),
    flash,
  };
};

const record = async (viewport, route, from) => {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(recorder);
  const page = await context.newPage();
  try {
    if (from) {
      await page.goto(`${origin}${from}`);
      await page.waitForFunction(() => !document.documentElement.classList.contains("route-enter"));
      await page.waitForTimeout(3000);
      await page.evaluate((href) => {
        window.__heroFrames.length = 0;
        window.__heroStart = performance.now();
        document.querySelector(`a[href="${href}"]`).click();
      }, route);
    } else {
      await page.goto(`${origin}${route}`);
    }
    await page.waitForFunction(() => document.querySelector("main .hero")?.closest("[data-barba=container]") && window.__heroFrames.length > 400, null, { timeout: 30_000 });
    return summarize(await page.evaluate(() => window.__heroFrames));
  } finally {
    await context.close();
  }
};

// progressive-loading R4: veil mở khi mount và font xong, không chờ ảnh hero.
const recordDelayed = async (viewport, route, pattern, delay) => {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(recorder);
  await context.route(pattern, async (request) => {
    await new Promise((resolve) => setTimeout(resolve, delay));
    await request.continue().catch(() => {});
  });
  const page = await context.newPage();
  try {
    await page.goto(`${origin}${route}`, { waitUntil: "commit" });
    await page.waitForFunction(() => window.__heroFrames?.length > 400, null, { timeout: 30_000 });
    return summarize(await page.evaluate(() => window.__heroFrames));
  } finally {
    await context.close();
  }
};

const cases = [
  { route: "/vi/", from: "/vi/about/" },
  { route: "/vi/residential/", from: "/vi/" },
  { route: "/vi/commercial/", from: "/vi/" },
  { route: "/vi/about/", from: "/vi/" },
  { route: "/vi/advertising-products/", from: "/vi/" },
];
const viewports = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];

const failures = [];
try {
  for (const viewport of viewports) {
    for (const { route, from } of cases) {
      const where = `${route} @${viewport.width}`;
      const direct = await record(viewport, route);
      const soft = await record(viewport, route, from);
      console.log(where, JSON.stringify({ direct, soft }));
      // About giữ title không split ở cả hai đường, không có motion chữ để so.
      if (!direct.split && !soft.split) continue;
      if (direct.flash) failures.push(`${where}: chữ hiện đủ ${direct.flash} frame trước motion khi mở trực tiếp`);
      if (direct.lag === undefined || direct.lag < 0) failures.push(`${where}: từ đầu fade trước khi veil mở (lag ${direct.lag})`);
      // Ngưỡng 100ms: Chromium headless trên cloud có frame dài 80-120ms đúng lúc từ đầu bắt đầu fade ở cả hai đường.
      if (direct.lag !== undefined && soft.lag !== undefined && Math.abs(direct.lag - soft.lag) > 100) {
        failures.push(`${where}: độ trễ sau veil ${Math.round(direct.lag)}ms khác chuyển mềm ${Math.round(soft.lag)}ms`);
      }
      if (direct.span === undefined || soft.span === undefined || Math.abs(direct.span - soft.span) > 100) {
        failures.push(`${where}: stagger ${direct.span}ms khác chuyển mềm ${soft.span}ms`);
      }
    }
  }
  const desktop = viewports[0];
  const lateFont = await recordDelayed(desktop, "/vi/residential/", "**/*.woff2", 1000);
  console.log("late font", JSON.stringify(lateFont));
  if (!(lateFont.reveal >= 1000)) failures.push(`font trễ 1s: veil mở lúc ${lateFont.reveal}ms, trước khi font về`);
  const lateHero = await recordDelayed(desktop, "/vi/residential/", "**/assets/content/**", 3000);
  console.log("late hero", JSON.stringify(lateHero));
  if (!(lateHero.reveal < 3000)) failures.push(`ảnh hero trễ 3s: veil mở lúc ${lateHero.reveal}ms, đang chờ ảnh`);
} finally {
  await browser.close();
}
assert.deepEqual(failures, [], `first-load parity failures:\n${failures.join("\n")}`);
console.log("first-load-parity: PASS");
