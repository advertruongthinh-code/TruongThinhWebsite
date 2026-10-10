// Kiểm tra scroll history của related card: case PC emulator cộng touch Android thật qua adb input.
// Dùng: node tests/site/related-scroll-device.mjs [--skip-emulator] [--skip-device]
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.env.PLAYWRIGHT_BROWSERS_PATH ||= "E:/TruongThinh-Website/.tooling/browsers";
const { chromium } = await import("playwright");
const args = process.argv.slice(2);
const port = 8792;
const cdp = "http://127.0.0.1:9222";
const cards = ["16", "first"];
const adb = process.env.ANDROID_ADB || "E:/TruongThinh-Website/.tooling/android/platform-tools/adb.exe";
const base = `http://127.0.0.1:${port}`;
const out = path.join(root, ".tmp/site-media-card", `related-scroll-${new Date().toISOString().replace(/[-:.]/g, "")}`);
mkdirSync(out, { recursive: true });
const A = "signage-raised-letters-06";
const rows = [];
const log = (message) => console.log(`[related-scroll] ${message}`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function runEmulator() {
  const dir = path.join(out, "emulator");
  log("emulator: m02b-related-history-just-viewed-and-scroll");
  try {
    execFileSync(process.execPath, ["tests/site/advertising-photo-transitions.e2e.mjs"], { cwd: root, stdio: "ignore",
      env: { ...process.env, BASE_URL: base, CASE: "m02b-related-history-just-viewed-and-scroll", PHOTO_TRANSITIONS_OUTPUT_DIR: dir } });
  } catch { /* Lỗi được đọc từ file kết quả bên dưới. */ }
  const results = JSON.parse(readFileSync(path.join(dir, "cp3-transition-e2e-results.json"), "utf8"));
  for (const item of results.results) {
    const evidence = Array.isArray(item.evidence) ? item.evidence.find((entry) => entry.profile) : null;
    rows.push({ target: "emulator", profile: `${item.viewport.width}x${item.viewport.height}`, locale: evidence?.locale || "",
      card: evidence?.nextId?.slice(-2) || "", status: item.status, detail: item.status === "PASS" ? "" : `${item.stage}: ${String(item.error).split("\n")[0].slice(0, 90)}` });
  }
}

const adbRun = (serial, ...rest) => execFileSync(adb, ["-s", serial, ...rest], { encoding: "utf8" }).trim();

async function runDevice() {
  const serial = execFileSync(adb, ["devices"], { encoding: "utf8" }).split("\n").slice(1).map((line) => line.trim().split(/\s+/)).find(([, state]) => state === "device")?.[0];
  if (!serial) { rows.push({ target: "device", status: "SKIP", detail: "no adb device" }); return; }
  const model = adbRun(serial, "shell", "getprop", "ro.product.model");
  if (!adbRun(serial, "forward", "--list").includes("localabstract:chrome_devtools_remote")) adbRun(serial, "forward", "tcp:" + new URL(cdp).port, "localabstract:chrome_devtools_remote");
  if (!adbRun(serial, "reverse", "--list").includes(`tcp:${port} tcp:${port}`)) adbRun(serial, "reverse", `tcp:${port}`, `tcp:${port}`);
  const browser = await chromium.connectOverCDP(cdp);
  const page = browser.contexts()[0]?.pages()[0] || await browser.contexts()[0].newPage();
  if (args.includes("--rotate")) {
    // Khóa landscape thật, khôi phục cài đặt rotation đã lưu khi thoát.
    const setting = (name, value) => adbRun(serial, "shell", "settings", value === undefined ? "get" : "put", "system", name, ...(value === undefined ? [] : [value]));
    const saved = ["accelerometer_rotation", "user_rotation"].map((name) => [name, setting(name)]);
    process.on("exit", () => saved.forEach(([name, value]) => setting(name, value)));
    process.on("SIGINT", () => process.exit(130));
    setting("accelerometer_rotation", "0");
    setting("user_rotation", "1");
    while (!(await page.evaluate(() => innerWidth > innerHeight))) await sleep(250);
  }
  const orientation = await page.evaluate(() => (innerWidth > innerHeight ? "landscape" : "portrait"));
  log(`device ${model} (${serial}) ${orientation}; screen stays awake only while unlocked`);

  // Map CSS px sang touchscreen px bằng một tap hiệu chỉnh trên overlay full-viewport tạm.
  const [screenW, screenH] = adbRun(serial, "shell", "wm", "size").match(/(\d+)x(\d+)/).slice(1).map(Number);
  const [touchW, touchH] = orientation === "landscape" ? [Math.max(screenW, screenH), Math.min(screenW, screenH)] : [Math.min(screenW, screenH), Math.max(screenW, screenH)];
  await page.goto(`http://localhost:${port}/vi/advertising-products/?category=signage-raised-letters&photo=${A}`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    const overlay = Object.assign(document.createElement("div"), { id: "tt-calibrate" });
    overlay.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:transparent;touch-action:none";
    overlay.addEventListener("pointerdown", (event) => { event.preventDefault(); window.__ttCalibrate = { x: event.clientX, y: event.clientY }; });
    document.body.append(overlay);
  });
  const probe = [Math.round(touchW / 2), Math.round(touchH / 2)];
  adbRun(serial, "shell", "input", "tap", String(probe[0]), String(probe[1]));
  await page.waitForFunction(() => window.__ttCalibrate, null, { timeout: 10_000 });
  const { x, y, dpr } = await page.evaluate(() => ({ ...window.__ttCalibrate, dpr: devicePixelRatio }));
  await page.evaluate(() => document.getElementById("tt-calibrate").remove());
  const toTouch = (cssX, cssY) => [Math.round(probe[0] + (cssX - x) * dpr), Math.round(probe[1] + (cssY - y) * dpr)];

  for (const locale of ["vi", "en"]) for (const card of cards) {
    await page.goto(`http://localhost:${port}/${locale}/advertising-products/?category=signage-raised-letters&photo=${A}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("[data-advertising-related-card]"), null, { timeout: 60_000 });
    await sleep(1200);
    const target = await page.evaluate(async (wanted) => {
      const motion = window.TruongThinhMotion;
      const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const find = () => wanted === "first" ? document.querySelector("[data-advertising-related-card]") : document.querySelector(`[data-advertising-related-card="signage-raised-letters-${wanted}"]`);
      const max = document.documentElement.scrollHeight - innerHeight;
      for (let y = 0; !find() && y <= max; y += innerHeight / 2) { motion.setLogicalScroll(y); await frame(); }
      const node = find();
      if (!node) return null;
      const header = document.querySelector("header").getBoundingClientRect().bottom;
      motion.setLogicalScroll(motion.getLogicalScroll() + node.getBoundingClientRect().top - header - 20);
      await frame();
      const rect = node.querySelector("a").getBoundingClientRect();
      const start = new URL(location.href).searchParams.get("photo");
      const rec = window.__ttRelated = { start, frames: [], taps: [] };
      document.addEventListener("pointerdown", (event) => rec.taps.push({ type: event.pointerType, trusted: event.isTrusted }), true);
      const sample = () => {
        const photo = new URL(location.href).searchParams.get("photo");
        if (photo !== start) rec.frames.push({ photo, y: motion.getLogicalScroll(), nativeY: scrollY });
        if (rec.frames.length < 60) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
      return { id: node.dataset.advertisingRelatedCard, x: rect.left + 20, y: Math.max(rect.top + 20, header + 20), fromY: scrollY };
    }, card);
    const row = { target: `device ${model}`, profile: orientation, locale, card: target?.id.slice(-2) || card };
    if (!target) { rows.push({ ...row, status: "SKIP", detail: "card not in related list" }); continue; }
    adbRun(serial, "shell", "input", "tap", ...toTouch(target.x, target.y).map(String));
    try {
      await page.waitForFunction(() => window.__ttRelated.frames.length >= 60, null, { timeout: 15_000 });
    } catch {
      rows.push({ ...row, status: "FAIL", detail: "no navigation after tap" });
      continue;
    }
    const rec = await page.evaluate(() => window.__ttRelated);
    const worst = Math.max(...rec.frames.map((frame) => Math.max(Math.abs(frame.y), Math.abs(frame.nativeY))));
    const touch = rec.taps.every((tap) => tap.type === "touch" && tap.trusted);
    rows.push({ ...row, status: worst <= 1 && touch ? "PASS" : "FAIL", detail: `maxY=${worst} frames=${rec.frames.length} touch=${touch}` });
  }
}

const up = () => fetch(`${base}/vi/advertising-products/`).then((r) => r.ok, () => false);
const preview = (await up()) ? null : spawn(process.execPath, ["scripts/tooling/serve-static-parity.mjs", "--port", String(port)], { cwd: root });
if (preview) { execFileSync(process.execPath, ["scripts/site/prepare-static-assets.mjs"], { cwd: root }); while (!(await up())) await sleep(250); }
if (!args.includes("--skip-emulator")) runEmulator();
if (!args.includes("--skip-device")) await runDevice();
preview?.kill();
writeFileSync(path.join(out, "summary.json"), JSON.stringify(rows, null, 2));
console.table(rows);
log(`raw: ${path.relative(root, out)}`);
process.exit(rows.some((row) => row.status === "FAIL") ? 1 : 0);
