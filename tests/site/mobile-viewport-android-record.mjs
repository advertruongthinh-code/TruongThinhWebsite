import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const option = (name, fallback) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback;
const endpoint = option("--cdp", "http://127.0.0.1:9223");
const base = option("--base-url", "http://localhost:8792");
const phase = option("--phase", "final");
const layoutOracles = process.argv.includes("--layout-oracles"), layoutSamples = [];
assert.match(base, /^http:\/\/(localhost|127\.0\.0\.1):8792$/);
const dir = `.tmp/mobile-viewport-stability/android-${phase}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
await mkdir(dir, { recursive: true });
const adb = process.env.ANDROID_ADB || "E:/TruongThinh-Website/.tooling/android/platform-tools/adb.exe";
const devices = execFileSync(adb, ["devices", "-l"], { encoding: "utf8" });
const connected = devices.split(/\r?\n/).filter(line => /^\S+\s+device\s/.test(line));
assert.equal(connected.length, 1, "exactly one authorized Android device");
const serial = connected[0].split(/\s/)[0];
assert.match(endpoint, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
const port = new URL(endpoint).port;
const forwards = execFileSync(adb, ["forward", "--list"], { encoding: "utf8" });
const binding = `${serial} tcp:${port} localabstract:chrome_devtools_remote`;
assert.ok(forwards.split(/\r?\n/).some(line => line.trim() === binding), "CDP port must forward to the selected Android Chrome socket");
const version = await fetch(`${endpoint}/json/version`).then(response => response.json());
assert.equal(version["Android-Package"], "com.android.chrome", "Android Chrome endpoint required");
assert.match(version["User-Agent"], /Android/, "Android UA required before navigation/input");
const targets = await fetch(`${endpoint}/json/list`).then(response => response.json());
const taskTabs = targets.filter(target => target.type === "page" && target.url.startsWith(`${base}/`));
assert.equal(taskTabs.length, 1, "exactly one local task tab, never select Sites/other tab");
const ws = new WebSocket(taskTabs[0].webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener("open", resolve, { once: true }); ws.addEventListener("error", reject, { once: true }); });
let sequence = 0;
const pending = new Map(), events = [], samples = [], actions = [];
ws.addEventListener("message", event => {
  const message = JSON.parse(event.data), request = pending.get(message.id);
  if (request) {
    clearTimeout(request.timeout); pending.delete(message.id);
    message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
  } else if (/^(Runtime\.(consoleAPICalled|exceptionThrown)|Log\.entryAdded|Network\.(responseReceived|loadingFailed))$/.test(message.method)) {
    const data = message.params;
    events.push({ utc: new Date().toISOString(), method: message.method,
      type: data.type || data.entry?.level, text: data.args?.map(arg => arg.value ?? arg.description).join(" ") || data.exceptionDetails?.exception?.description || data.entry?.text,
      url: data.response?.url || data.entry?.url, status: data.response?.status, error: data.errorText, canceled: data.canceled });
  }
});
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence, timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
  pending.set(id, { resolve, reject, timeout }); ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async expression => {
  const response = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
};
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function layoutObservation(selectedFilter = null, viewerStage = null) {
  const box = e => e.getBoundingClientRect().toJSON(), viewport = visualViewport;
  const selectors = '#site-menu[open] .menu-nav a,main h1,main h2,main h3,main p,main a,main button,main figcaption,.site-footer p,.site-footer a';
  const exclusions=[];
  const subjects = [...document.querySelectorAll(selectedFilter ? `[data-advertising-filter="${selectedFilter}"]` : selectors)].filter(e => {
    if(e.matches('.scroll-cue.is-hidden')&&scrollY>200){exclusions.push({node:e.className,reason:'accepted scroll cue hidden after scrollY200'});return false;}
    const r = box(e); return r.width > 0 && r.height > 0 && r.bottom > viewport.offsetTop && r.top < viewport.offsetTop+viewport.height && !e.closest('.sr-only');
  });
  const faults = [], text = [];
  if(document.documentElement.scrollWidth-document.documentElement.clientWidth > 1) faults.push('document horizontal overflow');
  const ports = e => {
    const list = [], paint = [];
    for(let a=e;a&&a!==document.body;a=a.parentElement) {
      const s = getComputedStyle(a), r = box(a), node = a.id || a.className;
      paint.push({node, opacity:Number(s.opacity), visibility:s.visibility});
      const x=['hidden','clip','auto','scroll'].includes(s.overflowX), y=['hidden','clip','auto','scroll'].includes(s.overflowY);
      if(x||y) list.push({node,box:r,x,y,rail:a.matches('.editorial-strip,.project-track,.detail-gallery__track,.project-filters,.advertising-detail__carousel')&&s.overflowX==='auto'});
      if(s.clipPath!=='none') {
        const tokens=s.clipPath.match(/^inset\(([^)]+)\)$/)?.[1].trim().split(/\s+/);
        if(tokens&&tokens.length<=4&&tokens.every(t=>/^-?[\d.]+(px|%)$/.test(t)||t==='0')) {
          const v=tokens.length===1?Array(4).fill(tokens[0]):tokens.length===2?[tokens[0],tokens[1],tokens[0],tokens[1]]:tokens.length===3?[...tokens,tokens[1]]:tokens;
          const value=(t,size)=>parseFloat(t)*(t.endsWith('%')?size/100:1);
          list.push({node,box:{left:r.left+value(v[3],r.width),right:r.right-value(v[1],r.width),top:r.top+value(v[0],r.height),bottom:r.bottom-value(v[2],r.height)},x:true,y:true});
        } else faults.push(`unknown clip ${node}: ${s.clipPath}`);
      }
      if(s.maskImage!=='none') faults.push(`unknown mask ${node}: ${s.maskImage}`);
    }
    return {list,paint};
  };
  for(const e of subjects) {
    const walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT), glyphs=[];
    while(walker.nextNode()) {
      const parent=walker.currentNode.parentElement;
      if(!walker.currentNode.textContent.trim()||parent.closest('.sr-only'))continue;
      const label=parent.closest('.advertising-photo-view__image-action > span');
      if(label&&!label.parentElement.matches(':focus-visible'))continue;
      const range=document.createRange();range.selectNodeContents(walker.currentNode);
      const clipping=ports(parent);
      for(const r of range.getClientRects()) {
        if(!r.width||!r.height||r.bottom<=viewport.offsetTop||r.top>=viewport.offsetTop+viewport.height||r.right<=viewport.offsetLeft||r.left>=viewport.offsetLeft+viewport.width)continue;
        const acceptedRailWindow=clipping.list.some(p=>p.rail&&(r.left<p.box.left-1||r.right>p.box.right+1));
        glyphs.push({text:walker.currentNode.textContent.trim(),box:r.toJSON(),acceptedRailWindow:acceptedRailWindow&&!selectedFilter,...clipping});
        for(const port of clipping.list) {
          if(port.x&&(!port.rail||selectedFilter)&&(r.left<port.box.left-1||r.right>port.box.right+1)||port.y&&(r.top<port.box.top-1||r.bottom>port.box.bottom+1)) faults.push(`glyph clipped ${e.id||e.className} by ${port.node}`);
        }
        if(clipping.paint.some(p=>p.opacity<.999||p.visibility!=='visible'))faults.push(`glyph paint hidden ${e.id||e.className}`);
      }
    }
    text.push({node:e.id||e.className,box:box(e),glyphs});
  }
  const header=document.querySelector('[data-site-header]'), title=document.querySelector('.hero h1'), filters=document.querySelector('.hero .project-filters');
  if(scrollY<=1&&viewport.scale===1&&header)for(const e of [title,filters].filter(Boolean)) {
    const a=box(header),b=box(e);
    if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)faults.push(`header overlap ${e.className}`);
  }
  const dialog=document.querySelector('#advertising-photo-dialog');
  const viewerButtons=[...document.querySelectorAll('#advertising-photo-dialog button')];
  if(viewerStage&&(!dialog?.open||dialog.dataset.advertisingViewerState!=='open'||viewerButtons.length!==4))faults.push('viewer must be open with four controls');
  const controls=(dialog?.open?viewerButtons:[]).map(e=> {
    const r=box(e), hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
    const name=e.getAttribute('aria-label')||e.textContent.trim();
    const id=['close','zoom-reset','zoom-in','zoom-out'].find(id=>e.hasAttribute(`data-advertising-photo-${id}`));
    const expectedDisabled=viewerStage==='fit'&&['zoom-reset','zoom-out'].includes(id);
    const inside=r.left>=viewport.offsetLeft-1&&r.right<=viewport.offsetLeft+viewport.width+1&&r.top>=viewport.offsetTop-1&&r.bottom<=viewport.offsetTop+viewport.height+1;
    const svg=e.querySelector('svg'),paint=[];for(let a=svg||e;a&&a!==document.body;a=a.parentElement){const s=getComputedStyle(a);paint.push({node:a.className.baseVal??a.className,opacity:Number(s.opacity),visibility:s.visibility});}
    if(!id||!name||!inside||!svg||e.hidden||e.disabled!==expectedDisabled||paint.some(p=>p.opacity<.999||p.visibility!=='visible')||!e.disabled&&!(hit===e||e.contains(hit)))faults.push(`viewer control inaccessible ${name}`);
    return {id,name,box:r,inside,disabled:e.disabled,expectedDisabled,disabledReason:expectedDisabled?'accepted zoom out/reset at fit':null,paint,hit:hit===e||e.contains(hit)};
  });
  if(dialog?.open&&new Set(controls.map(c=>c.id)).size!==4)faults.push('four distinct viewer controls required');
  const inView=e=>e instanceof Element&&subjects.some(s=>e.contains(s)||s.contains(e)&&e.textContent.trim())&&box(e).bottom>viewport.offsetTop&&box(e).top<viewport.offsetTop+viewport.height;
  const busy=document.getAnimations().some(a=>a.playState==='running'&&a.effect?.getTiming().iterations!==Infinity&&inView(a.effect?.target))||Boolean(window.gsap?.globalTimeline.getChildren(true,true,false).some(t=> {
    for(let p=t;p;p=p.parent)if(p.repeat?.()===-1||p.paused?.()||p.timeScale?.()===0)return false;
    return t.targets().some(inView)&&(t.isActive()||t.parent&&t.totalProgress()<1&&t.parent.time()<t.endTime());
  }));
  if(selectedFilter&&!text.some(t=>t.glyphs.length))faults.push(`reached filter has no visible glyphs: ${selectedFilter}`);
  return {url:location.href,hidden:document.hidden,y:scrollY,scale:viewport.scale,visual:{left:viewport.offsetLeft,top:viewport.offsetTop,width:viewport.width,height:viewport.height},selectedFilter,metrics:window.TruongThinhMotion?.getViewportMetrics?.(),header:header&&box(header),title:title&&box(title),filters:filters&&box(filters),text,controls,exclusions,busy,faults:[...new Set(faults)]};
}
const recordLayout = async (label, selectedFilter = null) => {
  if(!layoutOracles)return;
  let before;
  for(let attempt=0;attempt<60;attempt++) {
    const viewerStage=label.endsWith('-viewer-open')?'fit':label.endsWith('-viewer-after-touch')?'one-zoom':null;
    const data=await evaluate(`(${layoutObservation.toString()})(${JSON.stringify(selectedFilter)},${JSON.stringify(viewerStage)})`);
    assert.equal(data.hidden,false,'Chrome foreground during layout observation');
    // The repeating cue has a three-second hidden delay; observe its readable phase.
    const waitingForCue=data.faults.some(f=>f.startsWith('glyph paint hidden scroll-cue'))&&attempt<50;
    if(!data.busy&&!waitingForCue&&before===JSON.stringify(data)) {
      layoutSamples.push({label,settleAttempts:attempt,...data});
      if(data.faults.length)await shot(`layout-fault-${layoutSamples.length}`);
      return;
    }
    before=JSON.stringify(data);await pause(200);
  }
  throw Error(`${label}: native layout did not settle within12s`);
};
const sample = async label => {
  const data = await evaluate(`(() => {
    const ids=window.__ttViewportRecordingIds ||= new WeakMap();
    const subjects=[...document.querySelectorAll('.hero,.advertising-photo-view__primary,[data-advertising-photo-image],[data-advertising-photo-description-page],[data-advertising-photo-related-grid],[data-advertising-cta-skeleton],[data-advertising-grid-cta],.site-footer,[data-advertising-cta-frame]')];
    return {utc:new Date().toISOString(),url:location.href,hidden:document.hidden,fonts:document.fonts.status,
      width:document.documentElement.clientWidth,height:innerHeight,y:scrollY,documentHeight:document.documentElement.scrollHeight,
      visual:{width:visualViewport.width,height:visualViewport.height,top:visualViewport.offsetTop,left:visualViewport.offsetLeft,scale:visualViewport.scale},
      layout:window.TruongThinhMotion?.getViewportMetrics?.(),orientation:screen.orientation?.type,
      dialog:{open:!!document.querySelector('#advertising-photo-dialog')?.open,state:document.querySelector('#advertising-photo-dialog')?.dataset.advertisingViewerState},
      nodes:subjects.filter(e=>e.getBoundingClientRect().width>0).map(e=>{if(!ids.has(e))ids.set(e,(window.__ttViewportRecordingNext=(window.__ttViewportRecordingNext||0)+1));const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{id:ids.get(e),key:e.dataset.advertisingCtaSlot||e.dataset.advertisingPhotoId||e.className,left:r.left,top:r.top+scrollY,width:r.width,height:r.height,display:s.display,transform:s.transform,position:s.position,preset:e.querySelector('canvas')?.dataset.advertisingFlowPreset,reveal:e.className};}),
      controls:[...document.querySelectorAll('#advertising-photo-dialog button')].filter(e=>!e.disabled&&!e.hidden).map(e=>{const r=e.getBoundingClientRect();return{left:r.left,top:r.top,width:r.width,height:r.height}})
    };
  })()`);
  samples.push({ label, ...data }); return data;
};
const shot = async label => {
  const utc = new Date().toISOString(), result = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(`${dir}/${label}.png`, Buffer.from(result.data, "base64")); actions.push({ kind: "screenshot", label, utc });
};
const swipe = async direction => {
  const start = await sample(`before-${direction}`), x = Math.round(start.visual.width * .55);
  const from = start.visual.height * (direction === "up" ? .8 : .25), to = start.visual.height * (direction === "up" ? .25 : .8);
  await call("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: from, id: 1 }] });
  for (let frame = 1; frame <= 9; frame++) {
    await call("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: from + (to - from) * frame / 9, id: 1 }] });
    await sample(`touch-${direction}-${frame}`); await pause(22);
  }
  await call("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await pause(850); actions.push({ kind: "native-touch", direction, utc: new Date().toISOString() });
  return sample(`after-${direction}`);
};
const routes = option("--routes", "vi/,vi/residential/,vi/commercial/,vi/about/,vi/advertising-products/,vi/advertising-products/kiosk-posm/,vi/advertising-products/?category=kiosk-posm&photo=kiosk-posm-37").split(",");
const navigate = async (route, reload = false) => {
  const result = await call(reload ? "Page.reload" : "Page.navigate", reload ? { ignoreCache: true } : { url: `${base}/${route}` });
  assert.ok(!result.errorText, result.errorText);
  const alias = route.match(/^(vi|en)\/advertising-products\/(kiosk-posm|mobile-retail|signage-raised-letters|office-signs-wayfinding|led-displays-lightboxes|print-decals)\/$/);
  const destination = alias ? `${base}/${alias[1]}/advertising-products/?category=${alias[2]}` : `${base}/${route}`;
  for (let attempt = 0; attempt < 75; attempt++) {
    const frame = (await call("Page.getFrameTree")).frameTree.frame;
    if ((alias || !result.loaderId || frame.loaderId === result.loaderId)
      && await evaluate(`location.href===${JSON.stringify(destination)} && document.readyState==='complete' && document.fonts.status==='loaded' && document.documentElement.classList.contains('motion-ready')`)) return;
    await pause(200);
  }
  throw new Error(`${route}: page/fonts ready`);
};
const metadata = { phase, browser: version.Browser, package: version["Android-Package"], device: connected[0], serial, os: execFileSync(adb, ["-s", serial, "shell", "getprop", "ro.build.version.release"], { encoding: "utf8" }).trim(), target: taskTabs[0].id, assets: {}, routes, actions };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const guardedFiles = ['style.css','detail.css','motion.js','detail.js','advertising-products/catalog-runtime.mjs','advertising-products/layout-core.mjs','advertising-products/catalog-artifact.mjs','advertising-products/photo-viewer.mjs'];
const sourceFiles = ['index.html','about/index.html','residential/index.html','commercial/index.html','advertising-products/index.html','advertising-products/catalog.mjs'];
try {
  metadata.runnerSha256 = createHash("sha256").update(await readFile(new URL(import.meta.url))).digest("hex");
  metadata.binding = binding; metadata.userAgent = version["User-Agent"];
  for (const domain of ["Page", "Runtime", "Network", "Log"]) await call(`${domain}.enable`);
  metadata.sourceHashes = {};
  for (const file of guardedFiles) {
    const response = await fetch(`http://127.0.0.1:8792/${file}`);
    assert.equal(response.status, 200, file);
    metadata.assets[file] = hash(Buffer.from(await response.arrayBuffer()));
    const source=`${file.endsWith('catalog-artifact.mjs')?'.site-output':'src/site'}/${file}`;
    metadata.sourceHashes[source]=hash(await readFile(source));
    assert.equal(metadata.assets[file],metadata.sourceHashes[source],`${file}: source/served bytes`);
  }
  for(const file of sourceFiles)metadata.sourceHashes[`src/site/${file}`]=hash(await readFile(`src/site/${file}`));
  for (let routeIndex = 0; routeIndex < routes.length; routeIndex++) {
    const route = routes[routeIndex]; assert.match(route, /^(vi|en)\//);
    await navigate(route);
    await pause(1600);
    const initial = await sample(`${route}-initial`); assert.equal(initial.hidden, false, "Chrome foreground");
    await recordLayout(`${route}-initial`);
    // A navigation can leave Chrome's first gesture pending; require real toolbar deltas.
    let validCycles = 0;
    for (let cycle = 0; cycle < 3; cycle++) {
      let collapsed = await swipe("up");
      for (let retry = 0; retry < 3 && collapsed.visual.height <= initial.visual.height + 10; retry++) collapsed = await swipe("up");
      await shot(`${routeIndex}-${cycle}-collapsed`);
      await recordLayout(`${route}-${cycle}-collapsed`);
      const expanded = await swipe("down"); await shot(`${routeIndex}-${cycle}-expanded`);
      await recordLayout(`${route}-${cycle}-expanded`);
      if (collapsed.visual.height - expanded.visual.height > 10) validCycles++;
    }
    actions.push({ kind: "native-toolbar-cycles", route, validCycles, requiredCycles: 3 });
    if(layoutOracles) {
      const filterState=await evaluate("({photo:document.body.classList.contains('is-advertising-photo'),filters:[...document.querySelectorAll('[data-advertising-filter]')].map(e=>({id:e.dataset.advertisingFilter,hidden:e.getBoundingClientRect().width===0}))})");
      if(filterState.photo) {
        assert.ok(filterState.filters.length===7&&filterState.filters.every(e=>e.hidden),'photo mode keeps the seven grid filters inactive');
        actions.push({kind:'inactive-photo-filters',route,filters:filterState.filters});
      }
      const filters=filterState.photo?[]:filterState.filters.map(e=>e.id);
      if(filters.length)assert.deepEqual([...filters].sort(),['all','kiosk-posm','mobile-retail','signage-raised-letters','office-signs-wayfinding','led-displays-lightboxes','print-decals'].sort(),'All and six known category filters on Android');
      for(const filter of filters) {
        await evaluate(`(() => {const e=document.querySelector('[data-advertising-filter="${filter}"]');e.focus();e.scrollIntoView({behavior:'instant',block:'center',inline:'center'});})()`);
        await recordLayout(`${route}-reached-filter-${filter}`,filter);
      }
    }
    for (const toolbar of ["expanded", "collapsed"]) for (const entry of ["reload", "direct"]) {
      let before = await swipe(toolbar === "expanded" ? "down" : "up");
      for (let retry = 0; toolbar === "collapsed" && retry < 3 && before.visual.height <= initial.visual.height + 10; retry++) before = await swipe("up");
      before = await sample(`${route}-${toolbar}-${entry}-before`);
      await navigate(route, entry === "reload"); await pause(1600);
      const after = await sample(`${route}-${toolbar}-${entry}-after`);
      await recordLayout(`${route}-${toolbar}-${entry}-after`);
      actions.push({ kind: "navigation-toolbar-state", route, toolbar, entry, before: before.visual, after: after.visual });
    }
    if (process.argv.includes("--native-pinch") && /advertising-products\/kiosk-posm\/$/.test(route)) {
      await evaluate("(() => {const frame=document.querySelector('[data-advertising-cta-frame]');window.TruongThinhMotion.setLogicalScroll(frame.getBoundingClientRect().top+scrollY-100)})()");
      await pause(1500);
      const before = await sample(`${route}-native-pinch-before`);
      await call("Input.synthesizePinchGesture", { x: before.visual.width * .5, y: before.visual.height * .5, scaleFactor: 2, gestureSourceType: "touch" });
      await pause(1500); const after = await sample(`${route}-native-pinch-after`); await shot(`${routeIndex}-native-pinch`);
      await recordLayout(`${route}-native-pinch-after`);
      await swipe("up"); await swipe("down");
      await recordLayout(`${route}-native-pinch-after-pan`);
      actions.push({ kind: "native-pinch", route, before: before.visual, after: after.visual });
      await call("Input.synthesizePinchGesture", { x: before.visual.width * .5, y: before.visual.height * .5, scaleFactor: 1 / after.visual.scale, gestureSourceType: "touch" });
      await pause(700); await sample(`${route}-native-pinch-reset`);
    }
    if (route.includes("photo=")) {
      await evaluate("document.querySelector('[data-advertising-photo-expand]').click()"); await pause(600);
      await sample("viewer-open"); await shot("viewer-open");
      await recordLayout(`${route}-viewer-open`);
      await evaluate("document.querySelector('[data-advertising-photo-zoom-in]').click()"); await sample("viewer-zoom");
      await swipe("up"); await swipe("down"); await shot("viewer-after-touch");
      await recordLayout(`${route}-viewer-after-touch`);
      await evaluate("document.querySelector('[data-advertising-photo-close]').click()"); await pause(500);
      assert.equal(await evaluate("document.querySelector('#advertising-photo-dialog').open"),false,'viewer closes on Android');
    }
  }
  metadata.status = "observed";
  if(layoutOracles) {
    metadata.layoutFaults=layoutSamples.filter(s=>s.faults.length).map(s=>({label:s.label,faults:s.faults}));
    const missingCycles=actions.filter(a=>a.kind==='native-toolbar-cycles'&&a.validCycles!==a.requiredCycles);
    metadata.runtimeFaults=events.filter(e=>e.method==='Runtime.exceptionThrown'||e.type==='error'||e.status>=400||e.method==='Network.loadingFailed');
    assert.deepEqual(metadata.layoutFaults,[], 'native layout assertions');
    assert.deepEqual(missingCycles,[], 'three actual toolbar cycles for every route');
    assert.deepEqual(metadata.runtimeFaults,[], 'Android console/network assertions');
  }
} catch (error) { metadata.status = "incomplete"; metadata.error = error.message; process.exitCode = 1; }
finally {
  metadata.provenanceFaults=[];
  try {
    if(hash(await readFile(new URL(import.meta.url)))!==metadata.runnerSha256)metadata.provenanceFaults.push('recorder changed during capture');
    for(const [file,expected] of Object.entries(metadata.sourceHashes||{}))if(hash(await readFile(file))!==expected)metadata.provenanceFaults.push(`source changed: ${file}`);
    for(const [file,expected] of Object.entries(metadata.assets)) {
      const response=await fetch(`http://127.0.0.1:8792/${file}`);
      if(response.status!==200||hash(Buffer.from(await response.arrayBuffer()))!==expected)metadata.provenanceFaults.push(`served changed: ${file}`);
    }
    if(metadata.provenanceFaults.length){metadata.status='incomplete';process.exitCode=1;}
  } catch(error){metadata.provenanceFaults.push(error.message);metadata.status='incomplete';process.exitCode=1;}
  metadata.ended = new Date().toISOString(); metadata.samples = samples.length;
  await writeFile(`${dir}/samples.json`, JSON.stringify(samples, null, 2));
  await writeFile(`${dir}/events.json`, JSON.stringify(events, null, 2));
  if(layoutOracles)await writeFile(`${dir}/layout.json`,JSON.stringify(layoutSamples,null,2));
  await writeFile(`${dir}/metadata.json`, JSON.stringify(metadata, null, 2));
  ws.close(); console.log(JSON.stringify({ dir, status: metadata.status, error: metadata.error, device: metadata.device, samples: samples.length, events: events.length }));
}
