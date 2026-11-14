// Width sweep (ci-test-suites R12): every page type opens at every SWEEP_WIDTHS width, VI and EN, with nothing past the
// screen edge. Catches layout that only breaks between the two QA screenshot sizes (tablet, wide PC). Pages come from data.
import process from "node:process";
import { fileURLToPath } from "node:url";
import { loadBlockContent, pageHref } from "../../scripts/site/block-pages.mjs";
import { BASE_URL, SWEEP_WIDTHS, launchBrowser, openPage, viewportAt } from "./harness.mjs";

const { projects, news } = loadBlockContent(fileURLToPath(new URL("../../src/site/", import.meta.url)));
const routes = ["vi", "en"].flatMap((locale) => [
  `/${locale}/`,
  `/${locale}/about/`,
  `/${locale}/residential/`,
  `/${locale}/commercial/`,
  `/${locale}/advertising-products/`,
  `/${locale}/news/`,
  pageHref("news", locale, news[0]),
  pageHref("projects", locale, projects[0]),
]);

// Elements that stick out past the left or right screen edge. html clips sideways overflow, so the page never scrolls; the
// content is cut instead. A component that clips its own overflow (track, carousel, marquee) owns that and is skipped, as are
// fixed layers (menu, overlays) and elements nobody can see.
function sideways() {
  const edge = document.documentElement.clientWidth;
  const page = new Set([document.documentElement, document.body, document.querySelector("main")]);
  const clipsOwn = (element) => {
    for (let node = element.parentElement; node && !page.has(node); node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.position === "fixed" || style.overflowX !== "visible") return true;
    }
    return false;
  };
  const hits = [];
  for (const element of document.body.querySelectorAll("*")) {
    const style = getComputedStyle(element);
    if (style.position === "fixed" || style.visibility === "hidden" || style.display === "none") continue;
    const box = element.getBoundingClientRect();
    if (!box.width || !box.height || (box.left >= -1 && box.right <= edge + 1) || clipsOwn(element)) continue;
    hits.push(`${element.tagName.toLowerCase()}${element.className && typeof element.className === "string" ? `.${element.className.trim().split(/\s+/)[0]}` : ""} [${Math.round(box.left)}, ${Math.round(box.right)}]`);
    if (hits.length === 5) break;
  }
  return hits;
}

const browser = await launchBrowser();
const failures = [];
try {
  for (const width of SWEEP_WIDTHS) {
    const { context, page } = await openPage(browser, viewportAt(width), { reducedMotion: "reduce" });
    try {
      for (const route of routes) {
        const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: "load" });
        if (!response?.ok()) {
          failures.push(`${width}px ${route}: HTTP ${response?.status()}`);
          continue;
        }
        const out = await page.evaluate(sideways);
        if (out.length) failures.push(`${width}px ${route}: past the screen edge: ${out.join(", ")}`);
      }
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`layout-sweep e2e PASS: ${routes.length} routes x ${SWEEP_WIDTHS.length} widths, nothing past the screen edge`);
