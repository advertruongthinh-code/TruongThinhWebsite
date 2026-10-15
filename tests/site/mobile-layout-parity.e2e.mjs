import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { ADVERTISING_CARDS, ADVERTISING_CATEGORIES } from "../../src/site/advertising-products/catalog.mjs";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= "E:/TruongThinh-Website/.tooling/browsers";
const engines = await import("playwright");
const option = (name, fallback) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback;
const phase = option("--phase", "final"), scope = option("--scope", "all");
assert.ok(["all", "matrix", "states", "body", "interactions", "advertising-states", "history", "about-history", "advertising", "residential-commercial", "home-about"].includes(scope), "known layout scope");
assert.ok(!process.env.LAYOUT_INTERACTION_WIDTH||[390,838].includes(Number(process.env.LAYOUT_INTERACTION_WIDTH)),"known interaction width");
assert.ok(!process.env.LAYOUT_INTERACTION_FONT||[16,32].includes(Number(process.env.LAYOUT_INTERACTION_FONT)),"known interaction font");
const base = process.env.BASE_URL || "http://127.0.0.1:8792";
const dir = `.tmp/mobile-layout-parity/${phase}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
await fs.mkdir(dir, { recursive: true });
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const runnerSha256 = hash(await fs.readFile(new URL(import.meta.url)));
const sourceCatalogSha256 = hash(await fs.readFile("src/site/advertising-products/catalog.mjs"));
const assets = {};
// Mọi script/style được serve, sao từ src/site, cộng artifact generated, và chính Git candidate.
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const candidate = () => ({ head: git("rev-parse", "HEAD"), dirty: git("status", "--porcelain", "--", "src/site") });
const startCandidate = candidate();
assert.equal(startCandidate.dirty, "", "src/site must be committed before a layout run");
const servedFiles = (await fs.readdir("src/site", { recursive: true })).map(f => f.replaceAll("\\", "/"))
  .filter(f => /\.(css|js|mjs)$/.test(f) && existsSync(`.site-output/${f}`)).concat("advertising-products/catalog-artifact.mjs");
for (const file of servedFiles) {
  const response = await fetch(`${base}/${file}`);
  assets[file] = { source: hash(await fs.readFile(`${file.endsWith('catalog-artifact.mjs')?'.site-output':'src/site'}/${file}`)), served: hash(Buffer.from(await response.arrayBuffer())), status: response.status };
  assert.equal(response.status, 200); assert.equal(assets[file].source, assets[file].served, file);
}
const sourceHTML={};
for(const file of ['index.html','about/index.html','residential/index.html','commercial/index.html','advertising-products/index.html'])sourceHTML[file]=hash(await fs.readFile(`src/site/${file}`));
const slugs = ["kiosk-posm", "mobile-retail", "signage-raised-letters", "office-signs-wayfinding", "led-displays-lightboxes", "print-decals"];
const allRoutes = ["vi", "en"].flatMap(locale => ["", "residential/", "commercial/", "about/", "advertising-products/", ...slugs.map(s => `advertising-products/${s}/`)].map(route => `/${locale}/${route}`));
const routes = scope === "advertising" ? ["/vi/advertising-products/", "/en/advertising-products/"] : scope === "residential-commercial" ? allRoutes.filter(r => /\/(residential|commercial)\/$/.test(r)) : scope === "home-about" ? allRoutes.filter(r => /^\/(vi|en)\/(about\/)?$/.test(r)) : allRoutes;
const viewports = [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 838, height: 331 }, { width: 838, height: 387 }, { width: 844, height: 390 }];
const results = [];
// Resize và đổi route chọn lại candidate srcset; browser hủy request ảnh bị thay
// (Chromium báo net::ERR_ABORTED, Firefox NS_BINDING_ABORTED).
const supersededImage=request=>request.resourceType()==='image'&&['net::ERR_ABORTED','NS_BINDING_ABORTED'].includes(request.failure()?.errorText);
async function saveRecord(record){results.push(record);await fs.appendFile(dir+'/observations.jsonl',JSON.stringify(record)+'\n');}
async function textFixture(context,size){await context.addInitScript(size=>document.addEventListener('DOMContentLoaded',()=>document.documentElement.style.fontSize=`${size}px`,{once:true}),size);}
function measure(options = {}) {
  const logical = window.TruongThinhMotion?.getLogicalScroll?.() ?? scrollY;
  const rect = e => { const r=e.getBoundingClientRect();return {left:r.left,top:r.top+logical,right:r.right,bottom:r.bottom+logical,width:r.width,height:r.height}; };
  const subject = selector => {const e=document.querySelector(selector);return e && rect(e);};
  const chain = element => {
    const ports=[],paint=[],unknown=[];
    for(let a=element;a&&a!==document.body;a=a.parentElement) {
      const s=getComputedStyle(a),b=rect(a),node=a.id||a.className;
      const languageDim=a.matches('.menu-language [data-language-option]')&&a.dataset.languageOption!==document.documentElement.lang&&!a.matches('.is-active,:hover,:focus-visible');
      paint.push({node,opacity:Number(s.opacity),minimum:languageDim?0.449:0.999,visibility:s.visibility});
      const x=["hidden","clip","auto","scroll"].includes(s.overflowX),y=["hidden","clip","auto","scroll"].includes(s.overflowY);
      if(x||y)ports.push({node,box:b,x,y,rail:a.matches(".editorial-strip,.detail-process,.project-track,.detail-gallery__track,.project-filters,.advertising-detail__carousel")&&s.overflowX==="auto"});
      if(s.clipPath!=="none") {
        const tokens=s.clipPath.match(/^inset\(([^)]+)\)$/)?.[1].trim().split(/\s+/);
        if(tokens&&tokens.length<=4&&tokens.every(t=>/^-?[\d.]+(px|%)$/.test(t)||t==="0")) {
          const v=tokens.length===1?Array(4).fill(tokens[0]):tokens.length===2?[tokens[0],tokens[1],tokens[0],tokens[1]]:tokens.length===3?[...tokens,tokens[1]]:tokens;
          const value=(t,size)=>parseFloat(t)*(t.endsWith("%")?size/100:1);
          ports.push({node,box:{left:b.left+value(v[3],b.width),right:b.right-value(v[1],b.width),top:b.top+value(v[0],b.height),bottom:b.bottom-value(v[2],b.height)},x:true,y:true});
        } else unknown.push({node,clip:s.clipPath});
      }
      if(s.maskImage!=="none")unknown.push({node,mask:s.maskImage});
    }
    return {ports,paint,unknown};
  };
  const texts = [...document.querySelectorAll(options.selector || ".hero h1, .hero-kicker, .project-filters")].filter((e,index)=> {
    const r=e.getBoundingClientRect();
    return (options.index===undefined||index===options.index)&&r.width>0 && !e.closest('.sr-only') && !(options.viewportOnly&&e.matches('.scroll-cue.is-hidden')&&logical>200) && (!options.viewportOnly || r.bottom>0&&r.top<innerHeight);
  }).map(e => {
    const walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT),bounds=[],paint=[],exclusions=[];
    while(walker.nextNode()) {
      if(!walker.currentNode.textContent.trim())continue;
      if(walker.currentNode.parentElement.closest('.sr-only'))continue;
      const label=walker.currentNode.parentElement.closest('.advertising-photo-view__image-action > span');
      if(label&&!label.parentElement.matches(':focus-visible')&&!(matchMedia('(hover: hover)').matches&&label.parentElement.matches(':hover'))) {
        exclusions.push({text:walker.currentNode.textContent.trim(),reason:'accepted collapsed image action label; icon checked separately'});continue;
      }
      const range=document.createRange();range.selectNodeContents(walker.currentNode);
      const clips=chain(walker.currentNode.parentElement);
      const ranges=[...range.getClientRects()].filter(r=>r.width>0&&r.height>0&&(!options.viewportOnly||r.bottom>0&&r.top<innerHeight));
      if(ranges.length)paint.push(...clips.paint);
      for(const r of ranges)bounds.push({left:r.left,right:r.right,top:r.top+logical,bottom:r.bottom+logical,ports:clips.ports,unknown:clips.unknown,control:walker.currentNode.parentElement.closest('[data-advertising-filter]')?.dataset.advertisingFilter});
    }
    const style=getComputedStyle(e);
    return {selector:e.id||e.className,text:e.textContent.trim(),box:rect(e),bounds,paint,exclusions,scrollRail:options.viewportOnly&&options.index===undefined?bounds.some(r=>r.ports.some(p=>p.rail)):e.matches(".project-filters")&&style.overflowX==="auto"&&e.scrollWidth>e.clientWidth};
  });
  return { url:location.href, y:logical, rootFont:parseFloat(getComputedStyle(document.documentElement).fontSize), width:document.documentElement.clientWidth,
    overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth, metrics:window.TruongThinhMotion?.getViewportMetrics?.(),
    header:subject("[data-site-header]"), hero:subject(".hero"), title:subject(".hero h1"), filters:subject(".hero .project-filters"),texts,
    paintFloor:0.999 };
}
function faultsFor(measured) {
  const faults=[];
  if(measured.overflow>1)faults.push(`document overflow ${measured.overflow}px`);
  if(Math.abs(measured.y)<=1) {
    if(intersection(measured.header,measured.title)>1)faults.push("initial header/title overlap");
    if(intersection(measured.title,measured.filters)>1)faults.push("initial title/filter overlap");
    if(intersection(measured.header,measured.filters)>1)faults.push("initial header/filter overlap");
  }
  for(const text of measured.texts) {
    if(text.paint.some(p=>p.opacity<(p.minimum??0.999)||p.visibility!=="visible"))faults.push(`text paint hidden: ${text.selector}`);
    for(const r of text.bounds) {
      if(!text.scrollRail&&(r.left < -1 || r.right>measured.width+1))faults.push(`text outside document: ${text.selector}`);
      for(const clip of r.ports) {
        if(!text.scrollRail&&clip.x&&(r.left<clip.box.left-1||r.right>clip.box.right+1))faults.push(`text clipped horizontally by ${clip.node}: ${text.selector}`);
        if(clip.y&&(r.top<clip.box.top-1||r.bottom>clip.box.bottom+1))faults.push(`text clipped vertically by ${clip.node}: ${text.selector}`);
      }
      for(const clip of r.unknown)faults.push(`paint clip unproven: ${clip.node} ${clip.clip||clip.mask}`);
    }
  }
  return faults;
}
const intersection = (a,b) => a&&b ? Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)) : 0;
async function ready(page, options = {}) {
  // Direct load phủ trang bằng route veil đục cho đến khi phase enter gỡ route-enter.
  if(!options.noScript)await page.waitForFunction(() => (document.documentElement.classList.contains("motion-ready")||document.documentElement.classList.contains("motion-fallback"))&&!document.documentElement.classList.contains("route-enter"));
  if(options.noScript) {
    let loaded=false;
    for(let attempt=0;attempt<60;attempt++) {
      if(await page.evaluate(()=>document.fonts.status==='loaded')){loaded=true;break;}
      await page.waitForTimeout(200);
    }
    assert.ok(loaded,'no-js fonts loaded within12s');
  } else await page.evaluate(() => document.fonts.ready);
  let before=await page.evaluate(measure,options);
  for (let i=0;i<60;i++) { await page.waitForTimeout(200); const after=await page.evaluate(measure,options);
    const visible=after.texts.every(t=>t.paint.every(p=>p.opacity>=(p.minimum??0.999)&&p.visibility==="visible"));
    const active=await page.evaluate(options => {
      const subjects=[...document.querySelectorAll(options.selector||'.hero h1,.hero-kicker,.project-filters')];
      const inView=e=>e instanceof Element&&e.getBoundingClientRect().bottom>0&&e.getBoundingClientRect().top<innerHeight
        &&subjects.some(s=>e.contains(s)||s.contains(e)&&e.textContent.trim());
      return document.getAnimations().some(a=>a.playState==='running'&&a.effect?.getTiming().iterations!==Infinity&&inView(a.effect?.target))
        || Boolean(window.gsap?.globalTimeline.getChildren(true,true,false).some(t=> {
          for(let parent=t;parent;parent=parent.parent)if(parent.repeat?.()===-1||parent.paused?.()||parent.timeScale?.()===0)return false;
          return t.targets().some(inView)&&(t.isActive()||t.parent&&t.totalProgress()<1&&t.parent.time()<t.endTime());
        }));
    },options);
    if (!active&&JSON.stringify(after)===JSON.stringify(before)&&(visible||i>=20)) return after;
    before=after;
  }
  throw new Error(`layout/text did not settle: ${JSON.stringify({y:before.y,texts:before.texts.map(t=>({node:t.selector,box:t.box}))})}`);
}
const bodySelector="main h1,main h2,main h3,main p,main a,main button,main figcaption,.portal-copy,.heritage-row,.site-footer p,.site-footer a";
const canonicalRoutes=allRoutes.filter(r=>!slugs.some(s=>r.endsWith(`/${s}/`)));
const versions={};
async function recordState(page, engine, label, options = {}) {
  const measured=await ready(page,options),faults=faultsFor(measured);
  if(page.layoutTextSize!==undefined&&measured.rootFont!==page.layoutTextSize)faults.push(`root text fixture changed: expected ${page.layoutTextSize}, actual ${measured.rootFont}`);
  const record={kind:"state",engine,label,route:new URL(page.url()).pathname,viewport:page.viewportSize(),measured,faults:[...new Set(faults)]};
  await saveRecord(record);
  if(faults.length)await page.screenshot({path:path.join(dir,`${engine}-state-${results.length}.png`)});
  return record;
}
async function checkBody(page,engine,label,options={}) {
  const inventory=await page.locator(bodySelector).evaluateAll(nodes=>nodes.map(e=>({text:e.textContent.trim(),node:e.id||e.className,width:e.getBoundingClientRect().width,srOnly:Boolean(e.closest('.sr-only')),explicitHidden:Boolean(e.closest('[hidden]')),
    inactivePhoto:Boolean(e.closest('.advertising-photo-view')&&!document.body.classList.contains('is-advertising-photo')),
    inactiveGrid:Boolean(e.closest('.detail-index-hero,.project-index,.detail-cta[data-advertising-grid-cta],.detail-process')&&document.body.classList.contains('is-advertising-photo')),
    singlePageIndicator:e.matches('[data-advertising-photo-description-indicator]')&&e.hidden&&Number(e.closest('[data-advertising-photo-info]')?.querySelector('[data-advertising-photo-description-pager]')?.dataset.pageCount)===1,
    silentMediaAudio:e.matches('[data-advertising-photo-audio-toggle]')&&e.hidden,
    scrollCueState:e.matches('.scroll-cue.is-hidden')?'accepted cue hidden after scrollY200':null})));
  const missing=inventory.filter(e=>e.text&&!e.width&&!e.srOnly&&!e.inactivePhoto&&!e.inactiveGrid&&!e.singlePageIndicator&&!e.silentMediaAudio);
  await saveRecord({kind:'inventory',engine,label,inventory,faults:missing.map(e=>`active copy has zero width: ${e.node} ${e.text.slice(0,60)}`)});
  const positions=await page.locator(bodySelector).evaluateAll(nodes=> {
    const y=window.TruongThinhMotion?.getLogicalScroll?.()??scrollY;
    return nodes.filter(e=>e.textContent.trim()&&!e.closest('.sr-only')&&e.getBoundingClientRect().width>0)
      .flatMap(e=>{const r=e.getBoundingClientRect(),steps=Math.max(1,Math.ceil(r.height/Math.max(1,innerHeight-150)));return Array.from({length:steps},(_,i)=>({node:e.id||e.className,y:Math.max(0,r.top+y-100+i*(innerHeight-150))}));})
      .filter((e,i,a)=>i===a.findIndex(other=>Math.abs(other.y-e.y)<100));
  });
  assert.ok(positions.length,"body semantic copy must be present");
  for(const position of positions) {
    await page.evaluate(y=>window.scrollTo({top:y,behavior:"instant"}),position.y);
    await recordState(page,engine,`${label}: body ${position.node}@${position.y.toFixed(1)}`,{...options,selector:bodySelector,viewportOnly:true});
  }
  for(let index=0;index<await page.locator(bodySelector).count();index++) {
    const node=page.locator(bodySelector).nth(index);
    const rail=await node.evaluate(e=>e.getBoundingClientRect().width>0&&Boolean(e.closest('.editorial-strip,.detail-process,.project-track,.detail-gallery__track,.project-filters,.advertising-detail__carousel')));
    if(!rail)continue;
    await node.evaluate(e=>(e.closest('a,button,[tabindex]')||e).focus());
    if(options.noScript)await node.evaluate(e=>e.scrollIntoView({behavior:'instant',block:'center',inline:'center'}));
    else await node.scrollIntoViewIfNeeded();
    await node.evaluate(e=>{const rail=e.closest('.editorial-strip,.detail-process,.project-track,.detail-gallery__track,.project-filters,.advertising-detail__carousel'),box=e.getBoundingClientRect(),r=rail.getBoundingClientRect();rail.scrollLeft+=box.left-r.left-(rail.clientWidth-box.width)/2;});
    await recordState(page,engine,`${label}: reached rail item ${index}`,{...options,selector:bodySelector,index,viewportOnly:true});
  }
}
async function checkMenu(page,engine,label) {
  const state=()=>page.evaluate(()=>{const b=window.TruongThinhAdvertising?.getBrowseState();return{href:location.href,photo:b&&{category:b.category,photo:b.photo,tag:b.tag,seed:b.seed},length:history.length};});
  const before=await state();
  const opener=page.locator('[data-menu-open]');await opener.focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('#site-menu')?.open&&Number(getComputedStyle(document.querySelector('.menu-nav')).opacity)>.99);
  const selector="#site-menu .menu-nav a";
  const nav=page.locator('.menu-nav');
  assert.ok(await nav.locator('a').count()>=16,'menu must contain its full route inventory');
  for(let index=0;index<await nav.locator('a').count();index++) {
    const item=nav.locator('a').nth(index);assert.ok(await item.isVisible(),`required menu link ${index} present`);
    await item.focus();await item.scrollIntoViewIfNeeded();
    await recordState(page,engine,`${label}: menu reached ${index}`,{selector,index,viewportOnly:true});
  }
  await checkControls(page,engine,`${label}: menu head`,'#site-menu .menu-head a,#site-menu .menu-head button');
  await nav.locator('a').last().focus();
  // Native modal traversal có thể ghé browser chrome giữa điểm dừng cuối và đầu.
  await page.keyboard.press('Tab');
  const boundary=await page.evaluate(()=>({tag:document.activeElement.tagName,node:document.activeElement.className,hasFocus:document.hasFocus(),inside:document.querySelector('#site-menu').contains(document.activeElement)}));
  await saveRecord({kind:'focus',engine,label,boundary,faults:boundary.tag==='BODY'||boundary.inside?[]:['Tab reached background DOM']});
  await page.keyboard.press('Tab');assert.equal(await page.locator('#site-menu').evaluate(e=>e.contains(document.activeElement)),true,"Tab returns to modal after browser chrome");
  if(!await page.evaluate(()=>document.hasFocus()))await page.bringToFront();
  assert.equal(await page.evaluate(()=>document.hasFocus()&&document.querySelector('#site-menu').contains(document.activeElement)),true,'owned page and modal receive Escape input');
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#site-menu').open);
  assert.equal(await opener.evaluate(e=>e===document.activeElement),true,"Escape restores opener focus");
  assert.deepEqual(await state(),before,'menu Escape preserves underlying route/photo/history');
}
async function checkControls(page,engine,label,selector,expected=selector.includes('menu-head')?5:4) {
  const count=await page.locator(selector).count();assert.equal(count,expected,'required control count');
  for(let index=0;index<await page.locator(selector).count();index++) {
    const node=page.locator(selector).nth(index);
    const tabletCTA=await node.evaluate(e=>e.matches('.menu-appointment')&&innerWidth>578&&innerWidth<=960);
    if(tabletCTA&&!await node.isVisible()){await saveRecord({kind:'control',engine,label,index,reason:'accepted tablet appointment hidden at579..960',faults:[]});continue;}
    assert.ok(await node.isVisible(),`required control ${index} visible`);
    if(await node.isDisabled()){await saveRecord({kind:'control',engine,label,index,reason:'zoom bound disabled',faults:[]});continue;}
    await node.focus();await node.scrollIntoViewIfNeeded();
    await ready(page,{selector,index,viewportOnly:true});
    const data=await node.evaluate(e=> {
      const r=e.getBoundingClientRect(),name=e.getAttribute('aria-label')||e.textContent.trim()||e.querySelector('img')?.alt;
      const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
      const paint=[];for(let a=e.querySelector('svg')||e;a&&a!==document.body;a=a.parentElement){const s=getComputedStyle(a);paint.push({node:a.className.baseVal??a.className,opacity:Number(s.opacity),visibility:s.visibility});}
      return {name,box:r.toJSON(),paint,focused:document.activeElement===e,hit:hit===e||e.contains(hit),inside:r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1};
    });
    await saveRecord({kind:'control',engine,label,index,data,faults:[!data.name&&'control lacks accessible name',!data.focused&&'control cannot focus',!data.hit&&'control center occluded',!data.inside&&'control outside visible viewport',data.paint.some(p=>p.opacity<0.999||p.visibility!=='visible')&&'control icon/ancestor paint hidden'].filter(Boolean)});
    await recordState(page,engine,`${label}: glyph ${index}`,{selector,index,viewportOnly:true});
  }
}
async function checkDescriptionPages(page,engine,label) {
  const pager=page.locator('[data-advertising-photo-description-pager]'),count=Number(await pager.getAttribute('data-page-count'));
  assert.ok(count>=1&&count<500,'finite nonempty description pages');
  await pager.focus();await pager.scrollIntoViewIfNeeded();
  await page.keyboard.press('ArrowLeft');
  while(Number(await pager.getAttribute('data-page-index'))>0)await page.keyboard.press('ArrowLeft');
  const pages=[];
  for(let index=0;index<count;index++) {
    assert.equal(Number(await pager.getAttribute('data-page-index')),index,'description page keyboard reachability');
    pages.push(await page.locator('[data-advertising-photo-description]').textContent());
    await recordState(page,engine,`${label}: description ${index+1}/${count}`,{selector:'[data-advertising-photo-description],[data-advertising-photo-description-indicator]',viewportOnly:true});
    if(index<count-1)await page.keyboard.press('ArrowRight');
  }
  const state=await page.evaluate(()=>({photo:window.TruongThinhAdvertising.getBrowseState().photo,locale:document.documentElement.lang,indicatorHidden:document.querySelector('[data-advertising-photo-description-indicator]').hidden}));
  const card=ADVERTISING_CARDS.find(card=>card.id===state.photo),expected=state.locale==='en'?card.descriptionEn:card.descriptionVi;
  assert.equal(pages.join(' ').replace(/\s+/g,' ').trim(),expected.replace(/\s+/g,' ').trim(),'all description words preserved across pages');
  assert.equal(state.indicatorHidden,count===1,'indicator appears only for multiple pages');
  await saveRecord({kind:'description-pages',engine,label,count,pages,source:expected,faults:pages.some(p=>!p.trim())?['empty description page']:[]});
}
async function checkCtaReflow(page,engine,label) {
  const heading=page.locator('[data-advertising-grid-cta] h2'),before=await page.evaluate(()=>({width:innerWidth,height:innerHeight,footer:document.querySelector('.site-footer').offsetHeight}));
  const original=await heading.evaluate(e=>e.style.fontSize);
  try {
    // Cô lập text/font reflow khỏi thay đổi footer và viewport; runtime refit heading theo CTA.
    await heading.evaluate(e=>e.style.fontSize=`${parseFloat(getComputedStyle(e).fontSize)*1.5}px`);
    await page.locator('[data-advertising-grid-cta]').scrollIntoViewIfNeeded();await ready(page);
    await recordState(page,engine,`${label}: CTA text reflow`,{selector:'[data-advertising-grid-cta] h2,[data-advertising-grid-cta] a',viewportOnly:true});
    assert.deepEqual(await page.evaluate(()=>({width:innerWidth,height:innerHeight,footer:document.querySelector('.site-footer').offsetHeight})),before,'CTA floor updates without viewport/footer resize');
    const fit=await page.evaluate(()=>{const cta=document.querySelector('[data-advertising-grid-cta]').getBoundingClientRect(),copy=document.querySelector('[data-advertising-grid-cta] .detail-cta__copy').getBoundingClientRect();return{top:copy.top,bottom:copy.bottom,ctaTop:cta.top,limit:cta.bottom};});
    assert.ok(fit.top>=fit.ctaTop-1&&fit.bottom<=fit.limit+1,'reflowed CTA copy fits inside the CTA');
  } finally {await heading.evaluate((e,value)=>e.style.fontSize=value,original);await ready(page);await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));}
}
async function waitForDestination(page,href) {
  const namespace=new URL(href).pathname.split('/')[2]||'home';
  assert.ok(['home','about','residential','commercial','advertising-products'].includes(namespace),'known history destination');
  const settled=({href,namespace})=> {
    const containers=[...document.querySelectorAll('[data-barba="container"]')];
    return location.href===href&&document.readyState==='complete'&&containers.length===1
      &&containers[0].dataset.barbaNamespace===namespace&&!window.barba?.transitions?.isRunning;
  };
  await page.waitForFunction(settled,{href,namespace},{timeout:12000,polling:100});
  await page.waitForLoadState('networkidle',{timeout:12000});
  await page.waitForFunction(settled,{href,namespace},{timeout:12000,polling:100});
}
async function runAboutHistory(browser,engine) {
  const documentSnapshot=async page=> {
    for(let attempt=0;attempt<4;attempt++)try {
      return await page.evaluate(()=>({length:history.length,timeOrigin:performance.timeOrigin}));
    }catch(error){
      if(!/Execution context was destroyed/.test(error.message)||attempt===3)throw error;
      await page.waitForLoadState('domcontentloaded',{timeout:12000});
    }
  };
  const canonical=["", "residential/", "commercial/", "advertising-products/"];
  const pairs=[...canonical.flatMap(route=>[["about/",route],[route,"about/"]])];
  const cases=["vi","en"].flatMap(locale=>[
    {width:390,height:844},{width:838,height:387}
  ].flatMap(viewport=>pairs.map(([from,to])=>({locale,viewport,from,to}))));
  const limit=process.env.LAYOUT_ABOUT_LIMIT===undefined?cases.length:Number(process.env.LAYOUT_ABOUT_LIMIT);
  assert.ok(Number.isInteger(limit)&&limit>=0&&limit<=cases.length,"known about-history limit");
  for(const {locale,viewport,from,to} of cases.slice(0,limit)) {
    const source=`/${locale}/${from}`,destination=`/${locale}/${to}`;
    const label=`About history ${source} -> ${destination} ${viewport.width}x${viewport.height}`;
    const context=await browser.newContext({viewport,hasTouch:true});
    const page=await context.newPage(),issues=[],navigation=[];
    let stage='direct';
    page.on('pageerror',error=>issues.push(error.message));
    page.on('console',message=>{if(message.type()==='error')issues.push(message.text());});
    page.on('requestfailed',request=>{if(!supersededImage(request))issues.push(`${request.url()}: ${request.failure()?.errorText}`);});
    page.on('response',response=>{if(response.status()>=400)issues.push(`${response.url()}: HTTP ${response.status()}`);});
    page.on('request',request=>{if(request.isNavigationRequest()&&request.frame()===page.mainFrame())navigation.push(request.url());});
    try {
      await page.goto(base+source,{waitUntil:'networkidle'});await ready(page);
      const before=await documentSnapshot(page);
      navigation.length=0;issues.length=0;
      stage='click';
      await page.locator('[data-menu-open]').click();
      await page.waitForFunction(()=>document.querySelector('#site-menu').open);
      await page.locator(`#site-menu a[href="${destination}"]`).first().click();
      await page.waitForURL(url=>url.pathname===destination,{timeout:15000});
      await waitForDestination(page,base+destination);
      const after=await documentSnapshot(page);
      stage='stable';
      await page.waitForTimeout(10000);
      await waitForDestination(page,base+destination);
      const stable=await documentSnapshot(page);
      assert.equal(after.timeOrigin,before.timeOrigin,'About route keeps Barba document');
      assert.deepEqual(navigation,[],'About route has no main-frame navigation');
      assert.equal(stable.timeOrigin,after.timeOrigin,'destination document does not self-reload');
      assert.equal(stable.length,before.length+1,'click creates one history entry');
      stage='Back';
      await page.goBack();await waitForDestination(page,base+source);
      stage='Forward';
      await page.goForward();await waitForDestination(page,base+destination);
      assert.deepEqual(issues,[],'no console/page/network error');
      await saveRecord({kind:'about-history',engine,label,source,destination,viewport,before,after,stable,navigation:[...navigation],faults:[]});
    }catch(error){
      await saveRecord({kind:'about-history',engine,label,source,destination,viewport,stage,navigation:[...navigation],error:error.message,issues:[...issues]});
    }finally{await context.close();}
  }
  if(limit!==0&&limit!==cases.length)return;
  for(const locale of ["vi","en"])for(const viewport of [{width:390,height:844},{width:838,height:387}])for(const [from,to] of [["","residential/"],["residential/","commercial/"]]) {
    const source=`/${locale}/${from}`,destination=`/${locale}/${to}`;
    const label=`Soft Barba ${source} -> ${destination} ${viewport.width}x${viewport.height}`;
    const context=await browser.newContext({viewport,hasTouch:true});
    const page=await context.newPage(),navigation=[],issues=[];
    page.on('request',request=>{if(request.isNavigationRequest()&&request.frame()===page.mainFrame())navigation.push(request.url());});
    page.on('pageerror',error=>issues.push(error.message));
    page.on('console',message=>{if(message.type()==='error')issues.push(message.text());});
    page.on('requestfailed',request=>{if(!supersededImage(request))issues.push(`${request.url()}: ${request.failure()?.errorText}`);});
    page.on('response',response=>{if(response.status()>=400)issues.push(`${response.url()}: HTTP ${response.status()}`);});
    try {
      await page.goto(base+source,{waitUntil:'networkidle'});await ready(page);
      const before=await documentSnapshot(page);navigation.length=0;issues.length=0;
      await page.locator('[data-menu-open]').click();
      await page.waitForFunction(()=>document.querySelector('#site-menu').open);
      await page.locator(`#site-menu a[href="${destination}"]`).first().click();
      await waitForDestination(page,base+destination);
      const after=await documentSnapshot(page);
      assert.equal(after.timeOrigin,before.timeOrigin,'compatible route keeps Barba document');
      assert.equal(after.length,before.length+1,'soft route creates one history entry');
      assert.deepEqual(navigation,[],'compatible route has no main-frame navigation');
      await page.goBack();await waitForDestination(page,base+source);
      await page.goForward();await waitForDestination(page,base+destination);
      assert.deepEqual(issues,[],'no console/page/network error');
      await saveRecord({kind:'barba-control',engine,label,source,destination,viewport,before,after,faults:[]});
    }catch(error){await saveRecord({kind:'barba-control',engine,label,source,destination,viewport,navigation:[...navigation],error:error.message,issues:[...issues]});}
    finally{await context.close();}
  }
  for(const locale of ["vi","en"]) {
    const source=`/${locale}/about/`,destination=`/${locale}/advertising-products/?category=kiosk-posm`;
    const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
    const page=await context.newPage();
    try {
      await page.goto(base+source,{waitUntil:'networkidle'});await ready(page);
      const before=await documentSnapshot(page);
      await page.locator('[data-menu-open]').click();
      await page.waitForFunction(()=>document.querySelector('#site-menu').open);
      await page.locator(`#site-menu a[href="${destination}"]`).first().click();
      // Menu còn slug nhóm cũ; runtime đổi URL sang slug cụm theo locale (taxonomy R4).
      await waitForDestination(page,`${base}/${locale}/advertising-products/?category=${locale==='en'?'displays-booths':'standee-ke-trung-bay'}`);
      const after=await documentSnapshot(page);
      assert.notEqual(after.timeOrigin,before.timeOrigin,'About query route uses native navigation');
      assert.equal(after.length,before.length+1,'query route creates one history entry');
      assert.equal(await page.evaluate(()=>window.TruongThinhAdvertising?.getBrowseState?.().category),'displays-booths','query category preserved');
      await saveRecord({kind:'about-query',engine,source,destination,before,after,faults:[]});
    }catch(error){await saveRecord({kind:'about-query',engine,source,destination,error:error.message});}
    finally{await context.close();}
  }
}
async function runStates(browser,engine) {
  if(!['interactions','advertising-states','history'].includes(scope))for(const mode of (process.env.LAYOUT_STATE_MODES||"native,text200,native-landscape,text200-landscape,reduced,fallback,no-js").split(',')) {
    const noScript=mode==="no-js",viewport=mode==="reduced"||noScript||mode.endsWith('landscape')?{width:838,height:387}:{width:390,height:844};
    const context=await browser.newContext({viewport,hasTouch:true,reducedMotion:mode==="reduced"?"reduce":"no-preference",javaScriptEnabled:!noScript});
    const textSize=mode.startsWith('native')?16:32;await textFixture(context,textSize);
    if(mode==="fallback")await context.route('**/motion.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:'/* Deliberately unavailable shell dependency. */'}));
    const page=await context.newPage(),issues=[];
    page.layoutTextSize=textSize;
    page.on('pageerror',e=>issues.push(e.message));page.on('console',m=>{if(m.type()==='error')issues.push(m.text());});
    page.on('requestfailed',r=>{if(!supersededImage(r))issues.push(`${r.url()}: ${r.failure()?.errorText}`);});page.on('response',r=>{if(r.status()>=400)issues.push(`${r.url()}: HTTP ${r.status()}`);});
    for(const route of (process.env.LAYOUT_STATE_ROUTES?.split(',')||canonicalRoutes)) {
      try {
        await page.goto(base+route,{waitUntil:'networkidle'});
        await page.evaluate(size=>document.documentElement.style.fontSize=`${size}px`,mode.startsWith('native')?16:32);
        await recordState(page,engine,`${mode}: direct ${route}`,{noScript});
        if(mode==='fallback')assert.equal(await page.evaluate(()=>typeof window.TruongThinhMotion),'undefined','actual absent bridge');
        await checkBody(page,engine,`${mode} ${route}`,{noScript});
        if(mode.startsWith('native')||mode.startsWith('text200'))await checkMenu(page,engine,`${mode} ${route}`);
        if(issues.length)throw Error(issues.join('\n'));
      }catch(e){await saveRecord({kind:'state',engine,label:`${mode} ${route}`,error:e.message,issues:[...issues]});}
      issues.length=0;
      console.log(JSON.stringify({progress:'body/state',engine,mode,route,records:results.length,failures:results.filter(r=>r.error||r.faults?.length).length}));
    }
    await context.close();
  }
  if(scope==='body')return;
  if(scope!=='history')for(const viewport of [{width:390,height:844},{width:838,height:387}].filter(v=>!process.env.LAYOUT_INTERACTION_WIDTH||v.width===Number(process.env.LAYOUT_INTERACTION_WIDTH)))for(const textSize of [16,32].filter(s=>!process.env.LAYOUT_INTERACTION_FONT||s===Number(process.env.LAYOUT_INTERACTION_FONT))) {
  const context=await browser.newContext({viewport,hasTouch:true});await textFixture(context,textSize);
  const page=await context.newPage(),issues=[];page.layoutTextSize=textSize;
  page.on('pageerror',e=>issues.push(e.message));page.on('console',m=>{if(m.type()==='error')issues.push(m.text());});
  page.on('requestfailed',r=>{if(!supersededImage(r))issues.push(`${r.url()}: ${r.failure()?.errorText}`);});page.on('response',r=>{if(r.status()>=400)issues.push(`${r.url()}: HTTP ${r.status()}`);});
  for(const locale of ['vi','en']) {
    try {
      await page.goto(`${base}/${locale}/advertising-products/`,{waitUntil:'networkidle'});await page.evaluate(size=>document.documentElement.style.fontSize=`${size}px`,textSize);await ready(page);
      await checkCtaReflow(page,engine,`${locale}: ${textSize}px`);
      for(const category of ['all',...ADVERTISING_CATEGORIES.map(({slug})=>slug)]) {
        await page.locator(`[data-advertising-filter="${category}"]`).click();
        await page.waitForFunction(category=>window.TruongThinhAdvertising?.getBrowseState().category===category,category);
        await recordState(page,engine,`${locale}: category ${category}`);
        await page.evaluate(()=>window.scrollTo({top:document.querySelector('[data-project-grid]').getBoundingClientRect().top+scrollY,behavior:'instant'}));
        await recordState(page,engine,`${locale}: category ${category} first grid`,{selector:bodySelector,viewportOnly:true});
        await page.locator('.site-footer').scrollIntoViewIfNeeded();
        await recordState(page,engine,`${locale}: category ${category} footer`,{selector:bodySelector,viewportOnly:true});
      }
      await page.evaluate(()=>window.scrollTo({top:document.querySelector('[data-project-grid]').getBoundingClientRect().top+scrollY,behavior:'instant'}));await ready(page);
      await page.locator('[data-advertising-card] a').first().focus();
      await page.locator('[data-advertising-card] a').first().click();
      await page.waitForFunction(()=>Boolean(window.TruongThinhAdvertising?.getBrowseState().photo));
      await recordState(page,engine,`${locale}: photo`,{selector:bodySelector,viewportOnly:true});
      await checkBody(page,engine,`${locale}: active first photo body`);
      await checkDescriptionPages(page,engine,`${locale}: first photo`);
      await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await ready(page);
      await page.locator('[data-advertising-suggestion-tag]').first().click();await page.waitForFunction(()=>Boolean(window.TruongThinhAdvertising.getBrowseState().tag));
      await recordState(page,engine,`${locale}: tag`,{selector:bodySelector,viewportOnly:true});
      await checkBody(page,engine,`${locale}: active tag body`);
      await checkDescriptionPages(page,engine,`${locale}: tag photo`);
      await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await ready(page);
      const tagged=await page.evaluate(()=>window.TruongThinhAdvertising.getBrowseState());
      const tagPool=ADVERTISING_CARDS.filter(card=>card.id!==tagged.photo&&card.tagIds?.includes(tagged.tag));
      if(!tagPool.length) {
        assert.equal(await page.locator('[data-advertising-related-card]:visible').count(),0,'unique-photo tag has no related photos');
        await saveRecord({kind:'empty-tag',engine,label:`${locale}: unique tag`,photo:tagged.photo,tag:tagged.tag,expected:[],faults:[]});
        await page.locator('[data-advertising-suggestion-tag][aria-pressed="true"]').click();
        await page.waitForFunction(()=>window.TruongThinhAdvertising.getBrowseState().tag===null);
        await recordState(page,engine,`${locale}: clear unique tag`,{selector:bodySelector,viewportOnly:true});
      }
      const priorPhoto=await page.evaluate(()=>window.TruongThinhAdvertising.getBrowseState().photo);
      await page.evaluate(()=>{const grid=document.querySelector('[data-advertising-photo-related-grid]'),primary=document.querySelector('[data-advertising-photo-primary]');window.scrollTo({top:grid.getBoundingClientRect().top+scrollY+primary.offsetHeight,behavior:'instant'});});await ready(page);
      await page.locator('[data-advertising-related-card] > a').first().click();
      await page.waitForFunction(prior=>window.TruongThinhAdvertising.getBrowseState().photo!==prior,priorPhoto);
      await recordState(page,engine,`${locale}: related photo`,{selector:bodySelector,viewportOnly:true});
      const detailURL=page.url();
      await checkBody(page,engine,`${locale}: active related photo body`);
      await checkDescriptionPages(page,engine,`${locale}: related photo`);
      await page.locator('[data-advertising-photo-expand]').focus();
      await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
      await checkControls(page,engine,`${locale}: expand focused label`,'[data-advertising-photo-expand]',1);
      assert.equal(await page.locator('[data-advertising-photo-expand]').evaluate(e=>e.matches(':focus-visible')),true,'expand label receives keyboard focus');
      await page.locator('[data-advertising-photo-expand]').click();
      await page.waitForFunction(()=>document.querySelector('#advertising-photo-dialog').dataset.advertisingViewerState==='open');
      await checkControls(page,engine,`${locale}: viewer`,'#advertising-photo-dialog button');
      const viewerURL=page.url();await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#advertising-photo-dialog').open);assert.equal(page.url(),viewerURL,'viewer Escape preserves photo URL');
      await page.goBack();await page.waitForFunction(prior=>window.TruongThinhAdvertising.getBrowseState().photo===prior,priorPhoto);
      await recordState(page,engine,`${locale}: Back prior photo`,{selector:bodySelector,viewportOnly:true});await page.goForward();await page.waitForFunction(()=>Boolean(window.TruongThinhAdvertising.getBrowseState().photo));
      assert.equal(page.url(),detailURL,'Forward restores detail URL');await recordState(page,engine,`${locale}: Forward photo`,{selector:bodySelector,viewportOnly:true});
      await page.reload({waitUntil:'networkidle'});await recordState(page,engine,`${locale}: photo reload`,{selector:bodySelector,viewportOnly:true});
      await checkMenu(page,engine,`${locale}: photo menu`);
      const query=new URL(page.url()).search;
      await page.locator('[data-menu-open]').click();await page.waitForFunction(()=>document.querySelector('#site-menu').open);
      await page.locator(`#site-menu [data-language-option="${locale==='vi'?'en':'vi'}"]`).click();
      await page.waitForURL(url=>url.pathname.startsWith(locale==='vi'?'/en/':'/vi/'));assert.equal(new URL(page.url()).search,query,'photo locale preserves category/photo/tag query');await recordState(page,engine,`${locale}: photo locale`,{selector:bodySelector,viewportOnly:true});
      await page.locator('[data-menu-open]').click();await page.waitForFunction(()=>document.querySelector('#site-menu').open);
      await page.locator(`#site-menu .menu-group__title[href="/${locale==='vi'?'en':'vi'}/advertising-products/"]`).click();
      await page.waitForFunction(()=>!window.TruongThinhAdvertising.getBrowseState().photo);
      await recordState(page,engine,`${locale}: return grid`,{selector:bodySelector,viewportOnly:true});
      const gridURL=page.url();await page.evaluate(()=>window.scrollTo({top:document.querySelector('[data-project-grid]').getBoundingClientRect().top+scrollY,behavior:'instant'}));await ready(page);
      await page.locator('[data-advertising-card] a').first().focus();await page.locator('[data-advertising-card] a').first().click();await page.waitForFunction(()=>Boolean(window.TruongThinhAdvertising.getBrowseState().photo));
      await page.keyboard.press('Escape');await page.waitForFunction(()=>!window.TruongThinhAdvertising.getBrowseState().photo);assert.equal(page.url(),gridURL,'photo Escape returns preceding grid');
      if(issues.length)throw Error(issues.join('\n'));
    }catch(e){await saveRecord({kind:'state',engine,label:`${locale}: advertising interaction`,error:e.message,issues:[...issues],measured:await page.evaluate(measure)});await page.screenshot({path:path.join(dir,`${engine}-${locale}-interaction-error-${results.length}.png`)});}
    issues.length=0;
    console.log(JSON.stringify({progress:'Advertising interaction',engine,locale,viewport,textSize,records:results.length,failures:results.filter(r=>r.error||r.faults?.length).length}));
  }
  await context.close();
  }
  if(scope==='advertising-states')return;
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true}),page=await context.newPage();
  const issues=[];page.on('pageerror',e=>issues.push(e.message));page.on('console',m=>{if(m.type()==='error')issues.push(m.text());});
  page.on('requestfailed',r=>{if(!supersededImage(r))issues.push(`${r.url()}: ${r.failure()?.errorText}`);});page.on('response',r=>{if(r.status()>=400)issues.push(`${r.url()}: HTTP ${r.status()}`);});
  for(const route of canonicalRoutes) {
    try {
      await page.goto(base+route,{waitUntil:'networkidle'});await recordState(page,engine,`history direct ${route}`);
      await page.reload({waitUntil:'networkidle'});await recordState(page,engine,`history reload ${route}`);
      const original=new URL(page.url()),historyBefore=await page.evaluate(()=>({length:history.length,timeOrigin:performance.timeOrigin,index:window.barba?.history?.current?.index??window.barba?.history?.i??null}));
      await page.locator('[data-menu-open]').click();await page.waitForFunction(()=>document.querySelector('#site-menu').open);
      const locale=route.startsWith('/vi/')?'en':'vi';await page.locator(`#site-menu [data-language-option="${locale}"]`).click();
      await page.waitForURL(url=>url.pathname===route.replace(/^\/(vi|en)\//,`/${locale}/`));await recordState(page,engine,`history locale ${route}`);
      assert.equal(new URL(page.url()).search,original.search,'locale preserves search');assert.equal(new URL(page.url()).hash,'','locale clears hash');assert.equal(await page.evaluate(()=>document.documentElement.lang),locale,'DOM locale updates');
      assert.deepEqual(await page.evaluate(()=>({length:history.length,timeOrigin:performance.timeOrigin,index:window.barba?.history?.current?.index??window.barba?.history?.i??null})),historyBefore,'locale replaces current history entry in same document');
      await page.waitForFunction(()=>!document.querySelector('#site-menu').open);
      const localized=page.url(),destination=`/${locale}/${route.includes('/residential/')?'commercial':'residential'}/`;
      await page.locator('[data-menu-open]').click();await page.waitForFunction(()=>document.querySelector('#site-menu').open);
      await page.locator(`#site-menu .menu-nav a[href="${destination}"]`).first().click();await page.waitForURL(url=>url.pathname===destination);await waitForDestination(page,new URL(destination,base).href);await recordState(page,engine,`history navigate ${route}`);
      await page.goBack();await page.waitForURL(localized);await waitForDestination(page,localized);await recordState(page,engine,`history Back ${route}`);
      await page.goForward();await page.waitForURL(url=>url.pathname===destination);await waitForDestination(page,new URL(destination,base).href);await recordState(page,engine,`history Forward ${route}`);
      if(issues.length)throw Error(issues.join('\n'));
    }catch(e){await saveRecord({kind:'state',engine,label:`history ${route}`,error:e.message});}
    issues.length=0;
  }
  for(const width of [679,680,681,749,750,751,979,980,981,982]) {
    try {
    await page.setViewportSize({width,height:390});await page.goto(`${base}/en/advertising-products/`,{waitUntil:'networkidle'});
    await recordState(page,engine,`breakpoint ${width}`);
    if(issues.length)throw Error(issues.join('\n'));
    }catch(e){await saveRecord({kind:'state',engine,label:`breakpoint ${width}`,error:e.message});}
    issues.length=0;
  }
  await context.close();
}
async function checkFilterRail(page) {
  const rail=page.locator(".hero .project-filters"),failures=[];
  if(!await rail.count()||!await rail.evaluate(e=>getComputedStyle(e).overflowX==="auto"))return failures;
  const original=await rail.evaluate(e=>e.scrollLeft);
  const controls=rail.locator('[data-advertising-filter]');
  assert.equal(await controls.count(),7,'All and six category controls exist in the filter rail');
  for(const control of await controls.all()) {
    const id=await control.getAttribute("data-advertising-filter");
    await control.evaluate(e=>{const rail=e.parentElement;rail.scrollLeft=e.offsetLeft-(rail.clientWidth-e.offsetWidth)/2;});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const measured=await page.evaluate(measure),text=measured.texts.find(t=>t.selector==="project-filters");
    const bounds=text?.bounds.filter(r=>r.control===id)||[];
    assert.ok(bounds.length>0,`filter ${id} has measured glyphs after rail reach`);
    failures.push(...faultsFor({...measured,header:null,title:null,filters:null,texts:[{...text,scrollRail:false,bounds}]}));
  }
  await rail.evaluate((e,left)=>e.scrollLeft=left,original);
  return failures;
}
for (const engine of (process.env.LAYOUT_ENGINES || "chromium,firefox,webkit").split(",")) {
  const browser=await engines[engine].launch({headless:true});
  versions[engine]=browser.version();
  const context=await browser.newContext({hasTouch:true});const page=await context.newPage();const issues=[];
  page.on("pageerror",e=>issues.push(e.message));page.on("console",m=>{if(m.type()==="error")issues.push(m.text());});
  page.on('requestfailed',r=>{if(!supersededImage(r))issues.push(`${r.url()}: ${r.failure()?.errorText}`);});
  page.on("response",r=>{if(r.status()>=400)issues.push(`${r.url()}: HTTP ${r.status()}`);});
  if(!['states','body','interactions','advertising-states','history','about-history'].includes(scope))for (const viewport of viewports) for (const route of routes) {
    await page.setViewportSize(viewport);
    // Route product redirect trong trang, và Firefox khi đó resolve goto bằng null; giữ document response đầu tiên.
    try { const [response]=await Promise.all([page.waitForResponse(r=>r.url()===base+route&&r.request().isNavigationRequest()),page.goto(base+route,{waitUntil:"networkidle"})]);assert.equal(response.status(),200);await ready(page);
      for (const textSize of [100,200]) {
        await page.evaluate(size=>document.documentElement.style.fontSize=`${size/100*16}px`,textSize);
        const measured=await ready(page), faults=faultsFor(measured);
        if(measured.rootFont!==textSize/100*16)faults.push("text-size fixture was not applied");
        faults.push(...await checkFilterRail(page));
        if(issues.length)faults.push(...issues);
        const record={engine,route,viewport,textSize,measured,faults:[...new Set(faults)]};await saveRecord(record);
        if(faults.length)await page.screenshot({path:path.join(dir,`${engine}-${route.replaceAll("/","-")}-${viewport.width}x${viewport.height}-${textSize}.png`)});
      }
    } catch(error) {await saveRecord({engine,route,viewport,error:error.message,issues:[...issues]});}
    issues.length=0;
  }
  await context.close();
  if(['all','states','body','interactions','advertising-states','history'].includes(scope))await runStates(browser,engine);
  if(scope==='about-history')await runAboutHistory(browser,engine);
  await browser.close();
}
const provenanceFaults=[];
for(const [file,expected] of Object.entries(assets)) {
  const response=await fetch(`${base}/${file}`);
  if(hash(await fs.readFile(`${file.endsWith('catalog-artifact.mjs')?'.site-output':'src/site'}/${file}`))!==expected.source||response.status!==200||hash(Buffer.from(await response.arrayBuffer()))!==expected.served)provenanceFaults.push(`source/served changed during run: ${file}`);
}
if(hash(await fs.readFile("src/site/advertising-products/catalog.mjs"))!==sourceCatalogSha256)provenanceFaults.push('catalog source changed during run');
if(hash(await fs.readFile(new URL(import.meta.url)))!==runnerSha256)provenanceFaults.push('runner changed during run');
if(JSON.stringify(candidate())!==JSON.stringify(startCandidate))provenanceFaults.push('Git candidate changed during run');
for(const [file,expected] of Object.entries(sourceHTML))if(hash(await fs.readFile(`src/site/${file}`))!==expected)provenanceFaults.push(`HTML changed during run: ${file}`);
if(!['states','body','interactions','advertising-states','history','about-history'].includes(scope)) {
  const expected=(process.env.LAYOUT_ENGINES||'chromium,firefox,webkit').split(',').length*routes.length*viewports.length*2;
  const actual=results.filter(r=>!r.kind&&r.textSize).length;
  if(actual!==expected)provenanceFaults.push(`matrix coverage incomplete: expected ${expected}, actual ${actual}`);
}
await fs.writeFile(dir+"/results.json",JSON.stringify({phase,scope,candidate:startCandidate,selection:{engines:process.env.LAYOUT_ENGINES||'chromium,firefox,webkit',stateModes:process.env.LAYOUT_STATE_MODES||'native,text200,native-landscape,text200-landscape,reduced,fallback,no-js',stateRoutes:process.env.LAYOUT_STATE_ROUTES||canonicalRoutes,interactionWidth:process.env.LAYOUT_INTERACTION_WIDTH||'390,838',interactionFont:process.env.LAYOUT_INTERACTION_FONT||'16,32'},runnerSha256,sourceCatalogSha256,assets,sourceHTML,versions,provenanceFaults,results},null,2));
const failures=results.filter(r=>r.error||r.faults?.length);
console.log(JSON.stringify({dir,records:results.length,failures:failures.length,provenanceFaults,byEngine:Object.fromEntries(["chromium","firefox","webkit"].map(e=>[e,failures.filter(r=>r.engine===e).length]))}));
if(failures.length||provenanceFaults.length)process.exitCode=1;
