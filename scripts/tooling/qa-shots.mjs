// Screenshot QA (evidence-qa-handoff step 5): one command shoots routes at every SWEEP_WIDTHS width and reports sideways overflow.
// node scripts/tooling/qa-shots.mjs <route...> [--widths 384,1440] [--out dir] [--full] [--label before]
// Needs a running site (pnpm dev, or BASE_URL). Files: <out>/<label>-<route slug>-<width>.png, default out .tmp/qa-shots.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { BASE_URL, SWEEP_WIDTHS, launchBrowser, openPage, settleTransitions, viewportAt } from "../../tests/site/harness.mjs";

const args = process.argv.slice(2);
const option = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const valued = new Set(["--widths", "--out", "--label"]);
const routes = args.filter((arg, i) => !arg.startsWith("--") && !valued.has(args[i - 1]));
if (!routes.length) {
  console.error("usage: node scripts/tooling/qa-shots.mjs <route...> [--widths 384,1440] [--out dir] [--full] [--label name]");
  process.exit(2);
}
const widths = option("--widths", SWEEP_WIDTHS.join(",")).split(",").map(Number);
const out = path.resolve(option("--out", ".tmp/qa-shots"));
const label = option("--label", "shot");
const full = args.includes("--full");
mkdirSync(out, { recursive: true });

const slug = (route) => route.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9]+/gi, "-") || "root";
const browser = await launchBrowser();
let overflowing = 0;
try {
  for (const route of routes) {
    for (const width of widths) {
      const { context, page } = await openPage(browser, viewportAt(width));
      await page.goto(new URL(route, BASE_URL).href, { waitUntil: "networkidle" });
      await settleTransitions(page);
      // Intro motion (hero reveal) runs as finite animations: wait for them, capped so a slow page still gets shot.
      await page.waitForFunction(() => !document.getAnimations().some((a) => a.playState === "running"
        && Number.isFinite(a.effect?.getComputedTiming().endTime)), null, { timeout: 10_000 }).catch(() => {});
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const file = path.join(out, `${label}-${slug(route)}-${width}.png`);
      await page.screenshot({ path: file, fullPage: full });
      if (overflow > 0) overflowing += 1;
      console.log(`${width}\t${overflow > 0 ? `OVERFLOW ${overflow}px` : "ok"}\t${file}`);
      await context.close();
    }
  }
} finally {
  await browser.close();
}
// Screenshots are evidence for the agent to look at; only sideways overflow fails the command.
process.exit(overflowing ? 1 : 0);
