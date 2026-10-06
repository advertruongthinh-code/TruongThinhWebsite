import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve('.tooling/browsers');
const { chromium, firefox, webkit } = await import('playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:8792';
await mkdir('.tmp/scrollbar-parity',{recursive:true});
const results = [];
let activePage;
const near = (a, b, label) => assert.ok(Math.abs(a - b) <= 1, `${label}: ${a} != ${b}`);
const measure = page => page.evaluate(() => {
  const root = document.documentElement;
  const track = document.querySelector('.c-scrollbar');
  const thumb = track?.firstElementChild;
  const box = e => { const r = e?.getBoundingClientRect(); return r && { x:r.x, y:r.y, w:r.width, h:r.height }; };
  const css = (e, pseudo) => e && getComputedStyle(e, pseudo);
  return { y:window.TruongThinhMotion.getLogicalScroll(), nativeY:scrollY,
    smooth:root.classList.contains('has-scroll-smooth'), count:document.querySelectorAll('.c-scrollbar').length,
    gutter:innerWidth-root.clientWidth, width:innerWidth, overflow:root.scrollWidth-root.clientWidth,
    rootScrollbar:css(root).scrollbarWidth, rootColor:css(root).getPropertyValue('scrollbar-color'),
    nativeTrack:css(root,'::-webkit-scrollbar-track').backgroundColor,
    nativeWidth:css(root,'::-webkit-scrollbar').width,
    rootStyle:root.getAttribute('style'),
    track:box(track), thumb:box(thumb), opacity:track && Number(css(track).opacity),
    trackWidth:track && css(track).width, thumbWidth:thumb && css(thumb).width,
    radius:thumb && css(thumb).borderRadius, thumbColor:thumb && css(thumb).backgroundColor,
    thumbOpacity:thumb && Number(css(thumb).opacity),
    header:box(document.querySelector('.site-header')), shell:box(document.querySelector('main')),
    nav:box(document.querySelector('#header-menu-items')),
    transform:document.querySelector('[data-scroll-container]').style.transform,
    classes:root.className };
});
const ready = async page => {
  await page.waitForFunction(()=>document.fonts.status==='loaded');
  await page.waitForFunction(() => window.TruongThinhMotion && document.documentElement.classList.contains('motion-ready'));
};
const engines = {chromium,firefox,webkit,chrome:chromium,msedge:chromium};
for (const engine of (process.env.SCROLLBAR_ENGINES||Object.keys(engines).join(',')).split(',')) {
const type=engines[engine];
const channel=['chrome','msedge'].includes(engine)?engine:undefined;
const browser = await type.launch({ headless:true, channel, ignoreDefaultArgs:['--hide-scrollbars'] });
// So với document native không style của chính browser, gồm cả mặc định headless.
const control=await browser.newPage({viewport:{width:390,height:844}});
await control.setContent('<!doctype html><html><body><p style="height:3000px">Native control</p></body></html>');
const nativeDefault=await control.evaluate(()=>({width:getComputedStyle(document.documentElement).scrollbarWidth,color:getComputedStyle(document.documentElement).getPropertyValue('scrollbar-color')}));
// Giữ cửa sổ control native sống đến khi browser teardown (bug context-close cửa sổ cuối của Firefox).
const record = (name,m) => results.push({engine,version:browser.version(),case:name,...m});
try {
  const page = await browser.newPage({ viewport:{width:1440,height:900} });
  await page.bringToFront();
  activePage=page;
  const errors=[],messages=[],network=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',m=>{if(['error','warning'].includes(m.type())) messages.push({type:m.type(),text:m.text()});});
  page.on('response',r=>{if(r.status()>=400) network.push({url:r.url(),status:r.status()});});
  await page.setViewportSize({width:1440,height:900});
  await page.goto(`${base}/vi/about/`); await ready(page);
  await page.mouse.move(600,300);
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.c-scrollbar')).opacity) === 0);
  const idle = await measure(page); record('desktop idle',idle);
  assert.equal(idle.count,1); assert.equal(idle.gutter,0);
  near(Number.parseFloat(idle.trackWidth),11,'track width');
  near(Number.parseFloat(idle.thumbWidth),7,'thumb width');
  assert.equal(idle.radius,'10px'); assert.equal(idle.thumbColor,'rgb(0, 0, 0)');
  assert.equal(idle.thumbOpacity,.5);
  await page.mouse.move(1437,200);
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.c-scrollbar')).opacity) === 1);
  const hover = await measure(page); record('desktop hover',hover);
  near(hover.track.w,15.95,'hover scale');
  for (const selector of ['header','shell','nav']) {
    near(hover[selector].x,idle[selector].x,`${selector} x`);
    near(hover[selector].w,idle[selector].w,`${selector} width`);
  }
  await page.mouse.move(600,300);
  // Locomotive dịch một bước cố định mỗi wheel event (0.4x ngoài Windows), nên gửi vài nấc.
  for (let notch=0;notch<3;notch++) await page.mouse.wheel(0,500);
  await page.waitForFunction(() => window.TruongThinhMotion.getLogicalScroll()>100);
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.c-scrollbar')).opacity) === 0);
  record('wheel settle',await measure(page));
  const beforeKey=(await measure(page)).y;
  await page.keyboard.press('PageDown');
  await page.waitForFunction(before => window.TruongThinhMotion.getLogicalScroll()>before+100,beforeKey);
  await page.waitForFunction(() => !document.documentElement.classList.contains('has-scroll-scrolling'),null,{timeout:5000});
  record('keyboard settle',await measure(page));
  await page.keyboard.press('Home');
  await page.waitForFunction(() => window.TruongThinhMotion.getLogicalScroll()<1);
  await page.waitForFunction(() => !document.documentElement.classList.contains('has-scroll-scrolling'));
  const thumb = await page.locator('.c-scrollbar_thumb').boundingBox();
  await page.mouse.move(thumb.x+thumb.width/2,thumb.y+thumb.height/2);
  await page.mouse.down();
  await page.waitForFunction(() => document.documentElement.classList.contains('has-scroll-dragging'));
  await page.mouse.move(1437,899,{steps:12});
  await page.waitForFunction(() => window.TruongThinhMotion.getLogicalScroll()>1000);
  record('drag',await measure(page));
  const dragLimit=await page.locator('[data-scroll-container]').evaluate(e=>e.offsetHeight-innerHeight);
  await page.waitForFunction(limit=>Math.abs(window.TruongThinhMotion.getLogicalScroll()-limit)<=1,dragLimit);
  await page.mouse.move(1437,0,{steps:12});
  await page.waitForFunction(()=>window.TruongThinhMotion.getLogicalScroll()<=1);
  record('drag endpoints',await measure(page));
  await page.mouse.up(); await page.mouse.move(600,300);
  await page.keyboard.press('End');
  await page.waitForFunction(() => !document.documentElement.classList.contains('has-scroll-scrolling'));
  const bottom = await measure(page);
  const limit = await page.locator('[data-scroll-container]').evaluate(e => e.offsetHeight-innerHeight);
  near(bottom.y,limit,'bottom clamp');
  record('bottom',bottom);
  await page.keyboard.press('Home');
  await page.waitForFunction(() => window.TruongThinhMotion.getLogicalScroll()<1);
  await page.waitForFunction(() => !document.documentElement.classList.contains('has-scroll-scrolling'));
  const topThumb = await page.locator('.c-scrollbar_thumb').boundingBox();
  await page.mouse.move(topThumb.x+3,topThumb.y+10); await page.mouse.down();
  await page.mouse.move(1436,300);
  await page.locator('[data-menu-open]').focus(); await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('#site-menu').open);
  const locked = await measure(page);
  await page.mouse.move(1436,750,{steps:8}); await page.mouse.wheel(0,600);
  await page.setViewportSize({width:1441,height:900});
  await page.waitForTimeout(200);
  near((await measure(page)).y,locked.y,'active drag interrupted by menu');
  await page.mouse.up(); await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('#site-menu').open);
  near((await measure(page)).y,locked.y,'menu restores scroll');
  assert.ok(await page.locator('[data-menu-open]').evaluate(e => e===document.activeElement),'menu restores focus');
  record('menu lock/release',await measure(page));
  await page.setViewportSize({width:1440,height:900});
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(() => !document.documentElement.classList.contains('has-scroll-smooth'));
  const native = await measure(page); record('native mobile',native);
  assert.equal(native.count,0); assert.equal(native.transform,'');
  assert.equal(native.rootScrollbar,nativeDefault.width,'native width matches unstyled browser control');
  assert.equal(native.rootColor,nativeDefault.color,'native colors match unstyled browser control');
  if (engine!=='firefox') assert.notEqual(native.nativeTrack,'rgb(255, 255, 255)','no app-owned white document track');
  for(const mode of ['reduced','dependency-failure']) {
    const fallback=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:mode==='reduced'?'reduce':'no-preference'});
    if(mode==='dependency-failure') await fallback.route('**/locomotive-scroll@4.1.4/dist/locomotive-scroll.min.js',request=>request.abort());
    await fallback.goto(`${base}/vi/about/`); await ready(fallback);
    const m=await measure(fallback); assert.equal(m.count,0); assert.equal(m.smooth,false); assert.equal(m.transform,'');
    assert.equal(m.rootScrollbar,nativeDefault.width);
    await fallback.keyboard.press('End'); await fallback.waitForFunction(()=>scrollY>100);
    record(mode,await measure(fallback)); await fallback.close();
  }
  await page.setViewportSize({width:1440,height:900});
  await page.goto(`${base}/vi/advertising-products/?category=kiosk-posm&photo=kiosk-posm-09`); await ready(page);
  await page.locator('[data-advertising-photo-expand]').click();
  await page.waitForFunction(()=>document.querySelector('[data-advertising-photo-dialog]').open);
  const viewerY=(await measure(page)).y;
  await page.mouse.wheel(0,800); await page.keyboard.press('PageDown'); await page.waitForTimeout(200);
  near((await measure(page)).y,viewerY,'viewer blocks background input');
  await page.setViewportSize({width:980,height:900});
  await page.waitForFunction(()=>!document.documentElement.classList.contains('has-scroll-smooth'));
  await page.setViewportSize({width:981,height:900});
  await page.waitForFunction(()=>document.documentElement.classList.contains('has-scroll-smooth'));
  const resizedLock=(await measure(page)).y;
  await page.keyboard.press('PageDown'); await page.waitForTimeout(200);
  near((await measure(page)).y,resizedLock,'resize keeps viewer lock');
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.querySelector('[data-advertising-photo-dialog]').open);
  record('viewer lock/breakpoint/release',await measure(page));
  await page.mouse.move(600,300); await page.keyboard.press('PageDown');
  await page.waitForFunction(()=>!document.documentElement.classList.contains('has-scroll-scrolling'));
  await page.setViewportSize({width:1440,height:900});
  await page.goto(`${base}/vi/about/`); await ready(page);
  await page.locator('[data-site-header] a[href="/vi/residential/"]').click();
  // Biên About là navigation native (L04H), nên body có thể null trong chốc lát.
  await page.waitForFunction(()=>location.pathname==='/vi/residential/'&&document.body&&!document.body.classList.contains('is-transitioning')); await ready(page);
  assert.equal((await measure(page)).count,1,'soft route owns one scrollbar');
  await page.goBack();
  await page.waitForFunction(()=>location.pathname==='/vi/about/'&&document.body&&!document.body.classList.contains('is-transitioning')); await ready(page);
  assert.equal((await measure(page)).count,1,'history return owns one scrollbar');
  await page.locator('[data-menu-open]').click();
  await page.locator('[data-language-option="en"]').click();
  await page.waitForFunction(()=>document.documentElement.lang==='en'&&!document.body.classList.contains('is-transitioning'));
  assert.equal((await measure(page)).count,1,'locale owns one scrollbar');
  record('soft navigation/history/locale',await measure(page));
  for (const locale of ['vi','en']) {
    for (const route of ['', 'residential/','commercial/','advertising-products/','about/']) {
      await page.goto(`${base}/${locale}/${route}`); await ready(page);
      for (const width of (channel?[390,1440]:[320,390,768,959,980,981,1024,1199,1440,1569])) {
        await page.setViewportSize({width,height:900});
        await page.waitForFunction(smooth => document.documentElement.classList.contains('has-scroll-smooth')===smooth,width>=981);
        await page.waitForTimeout(350);
        await page.waitForFunction(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1);
        const m=await measure(page);
        assert.equal(m.count,width>=981?1:0,`${locale}/${route}/${width} controller count`);
        assert.ok(m.overflow<=1,`${locale}/${route}/${width} horizontal overflow`);
        if(width>=981) assert.equal(m.gutter,0);
        else {assert.equal(m.rootScrollbar,nativeDefault.width); assert.equal(m.transform,'');}
        record(`${locale}/${route}/${width}`,m);
      }
    }
  }
  assert.deepEqual(errors,[],'uncaught runtime errors');
  assert.deepEqual(network,[],'HTTP errors');
  await writeFile(`.tmp/scrollbar-parity/${engine}-diagnostics.json`,JSON.stringify({engine,version:browser.version(),errors,messages,network},null,2));
  await page.close();
  console.log(`PASS: ${engine} ${browser.version()}`);
} catch (error) {
  console.error(engine,error.message,activePage && await measure(activePage).catch(e=>e.message));
  throw error;
} finally {
  await mkdir('.tmp/scrollbar-parity',{recursive:true});
  await writeFile('.tmp/scrollbar-parity/results.json',JSON.stringify(results,null,2));
  await browser.close();
}
}
console.log(`PASS: ${results.length} scrollbar states`);
