// The harness input and motion helpers (ci-test-suites R12) tell real behavior apart: a mouse drag does not scroll a plain
// overflow row while a touch swipe does, and trackMotion scores a snap as 1 and a CSS transition well below it.
import assert from "node:assert/strict";
import test from "node:test";
import { launchBrowser, mouseDrag, openPage, touchSwipe, trackMotion, VIEWPORTS } from "./harness.mjs";

const ROW = `<div id="row" style="display:flex;gap:8px;width:300px;overflow-x:auto;white-space:nowrap">
  ${Array.from({ length: 20 }, (_, i) => `<button style="flex:none;width:80px;height:40px">${i}</button>`).join("")}</div>
  <div id="box" style="width:100px;height:40px;background:#000;transition:width 600ms ease"></div>`;

test("mouseDrag and touchSwipe: only touch scrolls a plain overflow row", async () => {
  const browser = await launchBrowser();
  try {
    for (const [viewport, swipe, scrolls] of [[VIEWPORTS.desktop, mouseDrag, false], [VIEWPORTS.phone, touchSwipe, true]]) {
      const { context, page } = await openPage(browser, viewport);
      await page.setContent(ROW);
      await swipe(page, { x: 250, y: 20 }, { x: 50, y: 20 });
      const left = await page.$eval("#row", (row) => row.scrollLeft);
      assert.equal(left > 50, scrolls, `${swipe.name}: scrollLeft ${left}`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
});

test("trackMotion: a snap scores 1, a transition stays at most 0.5", async () => {
  const browser = await launchBrowser();
  try {
    const { context, page } = await openPage(browser, VIEWPORTS.desktop);
    await page.setContent(ROW);
    const morph = await trackMotion(page, "#box", () => page.$eval("#box", (box) => { box.style.width = "400px"; }), 900);
    assert.ok(morph.total >= 299 && morph.jump <= 0.5, `morph ${JSON.stringify({ total: morph.total, jump: morph.jump })}`);
    const snap = await trackMotion(page, "#box", () => page.$eval("#box", (box) => { box.style.transition = "none"; box.style.width = "100px"; }), 300);
    assert.equal(snap.jump, 1);
    await context.close();
  } finally {
    await browser.close();
  }
});
