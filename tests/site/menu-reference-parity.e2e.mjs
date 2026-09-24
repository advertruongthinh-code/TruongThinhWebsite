import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve('.tooling/browsers');
const { chromium } = await import('playwright');
const browser = await chromium.launch({ headless: true });
const base = process.env.BASE_URL || 'http://127.0.0.1:8787';
const widths = [320, 360, 390, 578, 579, 750, 768, 960, 961, 1024, 1200, 1201, 1567, 1920];
const results = [];
const near = (a, b, label) => assert.ok(Math.abs(a - b) <= 1, `${label}: ${a} != ${b}`);
try {
  for (const locale of ['vi', 'en']) {
    const page = await browser.newPage({ viewport: { width: 1567, height: 910 }, reducedMotion: 'reduce' });
    await page.goto(`${base}/${locale}/`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => document.documentElement.classList.contains('motion-ready') || document.documentElement.classList.contains('motion-fallback'));
    const closedBefore = await page.locator('.site-header').boundingBox();
    await page.locator('[data-menu-open]').click();
    await page.locator('#site-menu[open].is-active').waitFor();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 910 });
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      const m = await page.evaluate(() => {
        const box = s => { const e = document.querySelector(s), r = e.getBoundingClientRect(); return { x:r.x, y:r.y, w:r.width, h:r.height, right:r.right, bottom:r.bottom }; };
        const h = document.querySelector('.menu-head'), nav = document.querySelector('.menu-nav');
        return { head:box('.menu-head'), logo:box('.menu-brand .brand-lockup'), close:box('.menu-close'), cta:box('.menu-appointment'), lang:box('.menu-language'),
          title: getComputedStyle(document.querySelector('.menu-group__title')).fontSize,
          columns:getComputedStyle(nav).gridTemplateColumns.split(' ').length,
          overflow:h.scrollWidth > h.clientWidth + 1 || nav.scrollWidth > nav.clientWidth + 1,
          navBottom:nav.getBoundingClientRect().bottom,
          label:getComputedStyle(document.querySelector('.menu-appointment span')).display,
          ctaDisplay:getComputedStyle(document.querySelector('.menu-appointment')).display };
      });
      const gutter = width > 1200 ? 35 : 25;
      near(m.head.w, width, `${locale}/${width} full width`);
      near(m.head.h, width <= 578 ? 226.96875 : width <= 1200 ? 109.578125 : 137.515625, `${locale}/${width} head height`);
      near(m.logo.h, width > 1200 ? 67.515625 : 59.578125, 'logo height');
      near(m.logo.x, gutter, 'logo left'); near(m.logo.y, gutter, 'logo top');
      near(m.close.right, width - gutter + 10, 'close right');
      assert.equal(m.columns, width <= 578 ? 1 : width <= 960 ? 2 : width <= 1200 ? 3 : 4);
      assert.equal(m.title, '28.8px'); assert.equal(m.overflow, false, `${locale}/${width} overflow`);
      assert.ok(m.navBottom <= 911, 'menu scroll area inside viewport');
      if (width <= 578) { assert.notEqual(m.label, 'none'); assert.ok(m.cta.y > m.lang.y + m.lang.h - 1); }
      else if (width <= 960) assert.equal(m.ctaDisplay, 'none');
      else assert.ok(m.close.x - m.cta.right > 30, 'CTA has separate space before close');
      results.push({ locale, width, ...m });
    }
    await page.setViewportSize({ width:1567, height:910 });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#site-menu').open);
    const closedAfter = await page.locator('.site-header').boundingBox();
    near(closedAfter.height, closedBefore.height, 'closed navbar preserved');
    await page.setViewportSize({ width:390, height:844 });
    await page.locator('[data-menu-open]').click();
    await page.addStyleTag({ content:'html { font-size:200% !important; }' });
    assert.ok(await page.locator('.menu-head').evaluate(e => e.scrollWidth <= e.clientWidth + 1), '200% text header has no overflow');
    assert.ok(await page.locator('.menu-nav').evaluate(e => e.scrollWidth <= e.clientWidth + 1), '200% text groups have no overflow');
    await page.close();
  }
  for (const locale of ['vi', 'en']) {
    const page = await browser.newPage({ viewport:{ width:390, height:844 }, hasTouch:true });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    for (const route of ['', 'residential/', 'commercial/', 'advertising-products/', 'about/']) {
      await page.goto(`${base}/${locale}/${route}`);
      await page.waitForFunction(() => document.documentElement.classList.contains('motion-ready') || document.documentElement.classList.contains('motion-fallback'));
      await page.locator('[data-menu-open]').click();
      await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.menu-brand')).opacity) > .99 && Number(getComputedStyle(document.querySelector('.menu-nav')).opacity) > .99);
      await page.keyboard.press('Tab');
      assert.ok(await page.locator('#site-menu').evaluate(e => e.contains(document.activeElement)), 'focus stays in dialog');
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:180, y:720 }] });
      for (let y=680; y>=300; y-=40) await cdp.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[{ x:180, y }] });
      await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
      await page.waitForFunction(() => document.querySelector('.menu-nav').scrollTop > 0);
      near(await page.evaluate(() => scrollY), 0, 'touch does not scroll background');
      await page.setViewportSize({ width:844, height:390 });
      assert.ok(await page.locator('#site-menu').evaluate(e => e.open), 'resize keeps dialog open');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('#site-menu').open);
      await page.setViewportSize({ width:390, height:844 });
      await cdp.detach();
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  await mkdir('.tmp/menu-r1', { recursive:true });
  await writeFile('.tmp/menu-r1/geometry.json', JSON.stringify(results, null, 2));
  console.log(`PASS: ${results.length} geometry cases, 10 route/touch/landscape flows, 2 text-zoom cases`);
} finally { await browser.close(); }
