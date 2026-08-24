import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const reports = path.join(root, 'docs', 'reports');
const evidenceRoot = path.join(root, 'research', 'reference-site', 'runtime-evidence');
const obligationsPath = path.join(reports, 'research-espacio-motion-obligations.csv');
const runtimePath = path.join(reports, 'research-espacio-motion-runtime.csv');
const runtimeColumns=['obligation_id','contract_fingerprint','motion_group_id','system','exact_url_or_route','template','locale','viewport','orientation','input_device_state','preference','lifecycle','candidate_count','candidate_member_ids','representative_candidate_id','source_fingerprint','applicability','applicability_blocker','scenario_id','motion_family','target_selector','action_protocol','sample_timings','obligation_type','browser','os','dpr','zoom','cache_network_state','fixture_data_identity','source_page_hash','runner_hash','schema_hash','timestamp','stable_anchor_member_ids','artifact_refs','before_measured_values','start_measured_values','mid_measured_values','end_measured_values','console_network_summary','status','blocker','duration_ms'];
const auditPath = path.join(reports, 'research-espacio-motion-audit.md');
const liveAllowlist = new Set(['https://espaciohomedesign.com/en', 'https://espaciohomedesign.com/en/kitchens', 'https://espaciohomedesign.com/en/interior-design', 'https://espaciohomedesign.com/en/projects', 'https://espaciohomedesign.com/en/services', 'https://espaciohomedesign.com/en/showrooms', 'https://espaciohomedesign.com/en/news/80-anniversary', 'https://espaciohomedesign.com/en/cocinart']);
const args = new Map(process.argv.slice(2).map((arg, index, list) => arg.startsWith('--') ? [arg.slice(2), list[index + 1] && !list[index + 1].startsWith('--') ? list[index + 1] : 'true'] : []));
function sha(value) { return createHash('sha256').update(value).digest('hex'); }
const runnerHash = sha(await readFile(fileURLToPath(import.meta.url)));
const schemaHash = sha(runtimeColumns.join('|'));
function contractFingerprintV2(row) {
  return `contract:${sha([
    row.motion_group_id, row.system, row.exact_url_or_route, row.template, row.locale, row.viewport, row.orientation,
    row.preference, row.lifecycle, row.scenario_id, row.target_selector, row.action_protocol,
    row.sample_timings, row.obligation_type, row.source_fingerprint,
  ].join('|'))}`;
}
function measuredEventCountV2(actionProtocol) {
  if (actionProtocol === 'none') return 0;
  if (!actionProtocol || /[;,|]/.test(actionProtocol)) return Number.NaN;
  return 1;
}
function assertContractV2(row) {
  if (!row.contract_fingerprint || row.contract_fingerprint !== contractFingerprintV2(row)) throw new Error(`Invalid obligation contract: ${row.obligation_id}`);
  if (row.obligation_type === 'runtime-scenario' && measuredEventCountV2(row.action_protocol) !== 1) throw new Error(`Non-atomic action protocol: ${row.obligation_id}`);
}
async function pageFingerprintV2(page) {
  const value = await page.evaluate(() => `${location.href}\n${document.documentElement.outerHTML}`);
  return `dom:${sha(value)}`;
}
function csvParse(text) { const rows=[]; let row=[],field='',quoted=false; for(let i=0;i<text.length;i+=1){const ch=text[i],n=text[i+1]; if(quoted){if(ch==='"'&&n==='"'){field+='"';i+=1}else if(ch==='"')quoted=false;else field+=ch;continue} if(ch==='"'){quoted=true;continue} if(ch===','){row.push(field);field='';continue} if(ch==='\n'){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';continue} field+=ch} if(field||row.length){row.push(field.replace(/\r$/,''));rows.push(row)} const [head,...body]=rows.filter(r=>r.length&&r.some(Boolean)); return body.map(r=>Object.fromEntries(head.map((key,i)=>[key,r[i]??'']))); }
function esc(value) { const text=String(value??''); return /[",\n\r]/.test(text) ? `"${text.replaceAll('"','""')}"` : text; }
function csv(columns, rows) { return `${columns.join(',')}\n${rows.map(row=>columns.map(key=>esc(row[key])).join(',')).join('\n')}\n`; }
function viewport(text) { const [width,height]=text.split('x').map(Number); return { width, height }; }
function toLocal(base, route) { return `${base.replace(/\/$/, '')}${route}`; }
function safeName(id) { return id.replace(/[^a-z0-9-]/gi, '_'); }
async function raf(page) { await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function measure(page) { return page.evaluate(() => { const active=document.activeElement; const body=document.body; const root=document.documentElement; const rect=body?.getBoundingClientRect(); return { url:location.href, readyState:document.readyState, fonts:document.fonts?.status ?? 'unsupported', bodyClass:body?.className ?? '', scrollY:window.scrollY, active:active?.id || active?.getAttribute?.('data-motion-id') || active?.tagName || '', body:{x:rect?.x??0,y:rect?.y??0,width:rect?.width??0,height:rect?.height??0}, animations:document.getAnimations().map(a=>({name:a.animationName||'',playState:a.playState,currentTime:a.currentTime})).slice(0,20), aria:body?.getAttribute('aria-hidden') ?? '' }; }); }
async function sample(page, filename) { await page.screenshot({ path: filename, fullPage: false }); return measure(page); }
async function runOne(browser, obligation, base, runId) {
  const timestamp = new Date().toISOString(); const local=obligation.system==='truong-thinh';
  const exactUrl=local ? toLocal(base, obligation.exact_url_or_route) : obligation.exact_url_or_route;
  if (!local && !liveAllowlist.has(exactUrl)) throw new Error(`Live URL outside allowlist: ${exactUrl}`);
  const dir=path.join(evidenceRoot, safeName(obligation.obligation_id)); await mkdir(dir,{recursive:true});
  const context=await browser.newContext({ viewport:viewport(obligation.viewport), deviceScaleFactor:1, reducedMotion:obligation.preference==='reduce'?'reduce':'no-preference', locale:obligation.locale==='vi'?'vi-VN':'en-US', colorScheme:'light' });
  const page=await context.newPage(); const consoleMessages=[]; const network=[];
  page.on('console', message=>consoleMessages.push(`${message.type()}:${message.text()}`)); page.on('requestfailed', request=>network.push(`failed:${request.method()} ${request.url()} ${request.failure()?.errorText??''}`)); page.on('response', response=>{if(response.status()>=400)network.push(`${response.status()}:${response.request().method()} ${response.url()}`)});
  const started=Date.now(); let status='blocked'; let blocker=''; let frames={};
  try {
    await page.goto(exactUrl,{waitUntil:'domcontentloaded',timeout:30000}); await raf(page);
    const prefix=path.join(dir, `${safeName(obligation.obligation_id)}-run${runId}`);
    frames.before=await sample(page,`${prefix}-before.png`);
    if (obligation.input_device_state.includes('scroll')) await page.mouse.wheel(0,420); else { await page.keyboard.press('Tab'); }
    frames.start=await sample(page,`${prefix}-start.png`); await page.waitForTimeout(125); frames.mid=await sample(page,`${prefix}-mid.png`); await page.waitForTimeout(250); frames.end=await sample(page,`${prefix}-end.png`);
    const anchor=frames.end.active || 'body';
    const changed=JSON.stringify(frames.before)!==JSON.stringify(frames.end);
    if (local && changed && frames.before.fonts==='loaded' && frames.end.readyState==='complete') status='confirmed';
    else blocker=local ? 'No deterministic visible state delta for representative static group under required generic state edge; source-byte candidate cannot be bound to a stable runtime member without an explicit fixture.' : 'Live snapshot observed only; archive static candidate member cannot be safely bound to current open-world DOM/module/CSS identity.';
    return { exactUrl, timestamp, durationMs:Date.now()-started, frames, status, blocker, anchor, consoleMessages, network, dir };
  } catch (error) { blocker=`${local?'Local':'Live'} runtime blocked: ${error.message}`; return { exactUrl,timestamp,durationMs:Date.now()-started,frames,status,blocker,anchor:'',consoleMessages,network,dir }; }
  finally { await context.close(); }
}
async function obsoleteGenericRunner(){
  const rows=csvParse(await readFile(obligationsPath,'utf8')); const pilot=Number(args.get('pilot')||0); const system=args.get('system')||'all'; const base=args.get('base-url')||'http://127.0.0.1:8787';
  let selected=rows.filter(row=>system==='all'||row.system===system); if(pilot){ if(system==='all'){ const local=selected.filter(row=>row.system==='truong-thinh'); const live=selected.filter(row=>row.system==='espacio-archive'); const localCount=Math.ceil(pilot/2); selected=[...local.slice(0,localCount),...live.slice(0,pilot-localCount)]; } else selected=selected.slice(0,pilot); } if(!selected.length) throw new Error('No obligations selected');
  const { chromium }=await import('playwright'); let browser; try { browser=await chromium.launch({channel:'chrome',headless:true}); } catch (error) { throw new Error(`System Chrome launch required fallback failed: ${error.message}`); }
  const output=[]; try { for(const obligation of selected){ const first=await runOne(browser,obligation,base,1); const second=await runOne(browser,obligation,base,2); const finalStatus=first.status==='confirmed'&&second.status==='confirmed'?'confirmed':'blocked'; const blocker=finalStatus==='blocked'?[first.blocker,second.blocker].filter(Boolean).join(' | '):''; const artifact={ obligation, first, second, finalStatus, blocker }; const artifactPath=path.join(first.dir,`${safeName(obligation.obligation_id)}.json`); await writeFile(artifactPath,JSON.stringify(artifact,null,2)); output.push({ ...obligation, browser:'Chrome via Playwright', os:process.platform, dpr:'1', zoom:'100%', cache_network_state:'fresh-context; default-network', fixture_data_identity:obligation.representative_candidate_id, source_page_hash:sha(JSON.stringify(obligation)), timestamp:first.timestamp, stable_anchor_member_ids:first.anchor, artifact_refs:path.relative(root,artifactPath).replaceAll('\\','/'), before_measured_values:JSON.stringify(first.frames.before??{}), start_measured_values:JSON.stringify(first.frames.start??{}), mid_measured_values:JSON.stringify(first.frames.mid??{}), end_measured_values:JSON.stringify(first.frames.end??{}), console_network_summary:`console=${first.consoleMessages.length}/${second.consoleMessages.length}; network=${first.network.length}/${second.network.length}`, status:finalStatus, blocker }); }
  } finally { await browser.close(); }
  const columns=runtimeColumns;
  const existing=await readFile(runtimePath,'utf8').then(csvParse).catch(()=>[]); const replacement=new Map(existing.map(row=>[row.obligation_id,row])); for(const row of output) replacement.set(row.obligation_id,row); const all=[...replacement.values()].sort((a,b)=>a.obligation_id.localeCompare(b.obligation_id)); await writeFile(runtimePath,csv(columns,all));
  const counts=Object.fromEntries(['confirmed','blocked','inferred','not_measured'].map(key=>[key,all.filter(row=>row.status===key).length])); console.log(JSON.stringify({selected:selected.length, completed:output.length, runtimeRows:all.length, ...counts, medianDurationMs:'available in per-artifact JSON'},null,2));
}
async function pilotAction(page,row){const target=page.locator(row.target_selector).first();if(!await target.count())throw new Error(`Target missing: ${row.target_selector}`);const p=row.action_protocol;if(p.includes('hover'))return target.hover();if(p.includes('wheel'))return page.mouse.wheel(0,420);if(p.includes('mouse.move'))return page.mouse.move(100,350);if(p.includes('drag')){const b=await target.boundingBox();if(!b)throw new Error('Drag target has no box');await page.mouse.move(b.x+b.width*.75,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width*.25,b.y+b.height/2,{steps:5});return page.mouse.up()}if(p.includes('click')||p.includes('press'))return target.click();await target.focus();return page.keyboard.press('Tab')}
async function pilotState(page,selector){return page.evaluate(s=>{const e=document.querySelector(s)||document.body,c=getComputedStyle(e),r=e.getBoundingClientRect();return{exists:!!document.querySelector(s),rect:[r.x,r.y,r.width,r.height],transform:c.transform,opacity:c.opacity,color:c.color,background:c.backgroundColor,classes:e.className||'',aria:[...e.attributes].filter(a=>a.name.startsWith('aria-')).map(a=>[a.name,a.value]),focus:document.activeElement?.id||document.activeElement?.tagName,scrollY,animations:document.getAnimations().map(a=>[a.animationName,a.playState,a.currentTime]).slice(0,12)}} ,selector)}
async function pilotProbe(browser,row,base){const local=row.system==='truong-thinh',url=local?`${base.replace(/\/$/,'')}${row.exact_url_or_route}`:row.exact_url_or_route;if(!local&&!liveAllowlist.has(url))throw new Error(`Live URL outside allowlist: ${url}`);const dir=path.join(evidenceRoot,row.obligation_id);await mkdir(dir,{recursive:true});const runs=[],durations=[];for(let n=1;n<3;n++){const ctx=await browser.newContext({viewport:viewport(row.viewport),reducedMotion:row.preference==='reduce'?'reduce':'no-preference',locale:row.locale==='vi'?'vi-VN':'en-US'}),page=await ctx.newPage(),con=[],net=[];page.on('console',m=>con.push(`${m.type()}:${m.text()}`));page.on('response',r=>{if(r.status()>=400)net.push(`${r.status()}:${r.url()}`)});try{const began=Date.now();await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});await raf(page);const cap=async label=>{await page.screenshot({path:path.join(dir,`run${n}-${label}.png`),fullPage:false});return pilotState(page,row.target_selector)};const before=await cap('before');await pilotAction(page,row);const start=await cap('start');await page.waitForTimeout(125);const mid=await cap('mid');await page.waitForTimeout(250);const end=await cap('end');durations.push(Date.now()-began);runs.push({before,start,mid,end,console:con,network:net,url})}catch(e){runs.push({error:e.message,console:con,network:net,url})}finally{await ctx.close()}if(!local)await new Promise(r=>setTimeout(r,350))}const ok=runs.every(r=>!r.error&&r.before.exists)&&runs[0].end.transform===runs[1].end.transform;const artifact=path.join(dir,`${row.obligation_id}.json`);await writeFile(artifact,JSON.stringify({row,runs},null,2));return{...row,browser:'Chrome via Playwright',os:process.platform,dpr:'1',zoom:'100%',cache_network_state:'fresh context; default network',fixture_data_identity:row.scenario_id,source_page_hash:sha(JSON.stringify(row)),timestamp:new Date().toISOString(),stable_anchor_member_ids:row.target_selector,artifact_refs:path.relative(root,artifact).replaceAll('\\','/'),before_measured_values:JSON.stringify(runs[0].before??{}),start_measured_values:JSON.stringify(runs[0].start??{}),mid_measured_values:JSON.stringify(runs[0].mid??{}),end_measured_values:JSON.stringify(runs[0].end??{}),console_network_summary:`console=${runs.flatMap(r=>r.console||[]).length};network=${runs.flatMap(r=>r.network||[]).length}`,status:ok?'confirmed':'blocked',blocker:ok?'':runs.map(r=>r.error||`repeat target contract failed: ${row.target_selector}`).join(' | '),duration_ms:durations.reduce((a,b)=>a+b,0)/Math.max(1,durations.length)}}
async function pilot(){const base=args.get('base-url')||'http://127.0.0.1:8787',all=csvParse(await readFile(obligationsPath,'utf8')),scenarios=['header-collapse','nav-underline','hero-continuous','gallery-drag','route-lifecycle'];const locals=scenarios.map(s=>all.find(r=>r.system==='truong-thinh'&&r.scenario_id===s&&r.locale==='vi'&&r.preference==='no-preference')).filter(Boolean);const lives=[['https://espaciohomedesign.com/en','no-preference','390x844'],['https://espaciohomedesign.com/en','reduce','390x844'],['https://espaciohomedesign.com/en/kitchens','no-preference','1440x900'],['https://espaciohomedesign.com/en/kitchens','reduce','1440x900'],['https://espaciohomedesign.com/en/projects','no-preference','768x900']].map(([u,p,v])=>all.find(r=>r.system==='espacio-live'&&r.exact_url_or_route===u&&r.preference===p&&r.viewport===v)).filter(Boolean);const selected=[...locals,...lives];if(selected.length!==10)throw new Error('Pilot selection incomplete');if(args.has('list')){console.log(JSON.stringify(selected.map(r=>({id:r.obligation_id,system:r.system,scenario:r.scenario_id})),null,2));return}const{chromium}=await import('playwright');const browser=await chromium.launch({channel:'chrome',headless:true});let out;try{out=[];for(const row of selected)out.push(await pilotProbe(browser,row,base))}finally{await browser.close()}await writeFile(runtimePath,`${runtimeColumns.join(',')}\n${out.map(r=>runtimeColumns.map(k=>esc(r[k])).join(',')).join('\n')}\n`);const med=x=>{x=x.sort((a,b)=>a-b);return x[Math.floor(x.length/2)]};console.log(JSON.stringify({rows:out.map(r=>({id:r.obligation_id,status:r.status,artifact:r.artifact_refs})),medianLocalMs:med(out.filter(r=>r.system==='truong-thinh').map(r=>r.duration_ms)),medianLiveMs:med(out.filter(r=>r.system==='espacio-live').map(r=>r.duration_ms)),runnerHash:sha(await readFile(fileURLToPath(import.meta.url)))},null,2))}
function visibleSelectorCandidates(selectorList) {
  return selectorList.split(',').map((value) => value.trim()).filter(Boolean);
}

async function resolveTargetV2(page, row) {
  const candidates = row.scenario_id === 'live-snapshot'
    ? ['#header-menu-toggle', '#pideCitaBubble', '.coolLink', 'button', 'a', '.img-content', 'footer a']
    : row.scenario_id?.startsWith('route-')
    ? ['[data-site-header]']
    : row.scenario_id === 'projects-filter'
    ? ['[data-project-filter]:not([aria-pressed="true"])', '[data-project-filter]']
    : ['nav-underline-hover', 'nav-underline-focus'].includes(row.scenario_id)
    ? ['.desktop-nav a:not([aria-current="page"])', ...visibleSelectorCandidates(row.target_selector)]
    : visibleSelectorCandidates(row.target_selector);
  for (const selector of candidates) {
    const locator = page.locator(selector);
    for (let index = 0; index < await locator.count(); index += 1) {
      const target = locator.nth(index);
      if (!await target.isVisible().catch(() => false)) {
        if (['menu-open', 'menu-close', 'menu-link', 'menu-locale'].includes(row.scenario_id)) return { locator: target, selector, index };
        continue;
      }
      const hit = await target.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const x = Math.min(innerWidth - 1, Math.max(0, rect.left + rect.width / 2));
        const y = Math.min(innerHeight - 1, Math.max(0, rect.top + rect.height / 2));
        const top = document.elementFromPoint(x, y);
        return Boolean(top && (top === element || element.contains(top)));
      }).catch(() => false);
      if (hit || row.scenario_id !== 'live-snapshot') return { locator: target, selector, index };
    }
  }
  throw new Error(`No visible target: ${row.target_selector}`);
}

async function stateV2(page, target) {
  const targetState = await target.locator.evaluate((element) => {
    const style = (pseudo = null) => {
      const value = getComputedStyle(element, pseudo);
      return {
        opacity: value.opacity,
        transform: value.transform,
        transition: value.transition,
        animation: value.animation,
        height: value.height,
        width: value.width,
        color: value.color,
        backgroundColor: value.backgroundColor,
        visibility: value.visibility,
        display: value.display,
      };
    };
    const rect = element.getBoundingClientRect();
    return {
      tag: element.tagName,
      id: element.id,
      classes: String(element.className || ''),
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      attributes: [...element.attributes].filter((attribute) => attribute.name.startsWith('aria-') || attribute.name === 'open').map((attribute) => [attribute.name, attribute.value]),
      focused: document.activeElement === element,
      scrollLeft: element.scrollLeft,
      scrollTop: element.scrollTop,
      style: style(),
      before: style('::before'),
      after: style('::after'),
      animations: element.getAnimations({ subtree: true }).map((animation) => ({
        name: animation.animationName || '',
        currentTime: Number(animation.currentTime || 0),
        playState: animation.playState,
      })),
      descendants: [...element.querySelectorAll('img,svg,.portal-shade,.portal-copy,.story-link__media,.project-card__media')].slice(0, 8).map((child) => {
        const childStyle = getComputedStyle(child);
        return { tag: child.tagName, classes: String(child.className || ''), opacity: childStyle.opacity, transform: childStyle.transform, color: childStyle.color, backgroundColor: childStyle.backgroundColor };
      }),
    };
  });
  const pageState = await page.evaluate(() => {
    const header = document.querySelector('[data-site-header]');
    const media = [...document.querySelectorAll('video,audio')].map((element) => ({
      currentTime: element.currentTime,
      paused: element.paused,
      ended: element.ended,
      readyState: element.readyState,
    }));
    return {
      url: location.href,
      path: location.pathname,
      scrollY: window.scrollY,
      scrollX: window.scrollX,
      active: document.activeElement?.id || document.activeElement?.getAttribute?.('data-menu-open') || document.activeElement?.tagName || '',
      bodyClasses: document.body.className,
      rootClasses: document.documentElement.className,
      header: header ? {
        exists: true,
        classes: header.className,
        top: header.getBoundingClientRect().top,
        identity: header.getAttribute('data-site-header') ?? 'present',
      } : { exists: false },
      animations: document.getAnimations().map((animation) => ({
        name: animation.animationName || '',
        currentTime: Number(animation.currentTime || 0),
        playState: animation.playState,
      })),
      media,
      bfcachePageshowCount: Number(window.__motionAuditBfcachePageshowCount || 0),
      scrollers: [...document.querySelectorAll('[data-gallery-track],.project-track')].map((element) => ({ selector: element.hasAttribute('data-gallery-track') ? 'gallery' : 'project', scrollLeft: element.scrollLeft, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth })),
    };
  });
  return { target: targetState, page: pageState };
}

async function captureV2(page, target, filename) {
  await page.screenshot({ path: filename, fullPage: false });
  return stateV2(page, target);
}

async function routeSoftLinkV2(page, row) {
  const desktop = page.locator('[data-site-header] .desktop-nav a:not([aria-current="page"])').first();
  if (await desktop.isVisible().catch(() => false)) return desktop;
  const mobile = page.locator(`#site-menu a[href^="/${row.locale}/"]:not([href="/${row.locale}/"])`).first();
  if (await mobile.isVisible().catch(() => false)) return mobile;
  throw new Error('No visible non-current route link');
}

async function prepareActionV2(page, row, target) {
  if (row.scenario_id === 'header-collapse') {
    await page.mouse.move(20, Math.max(200, viewport(row.viewport).height - 20));
  } else if (row.scenario_id === 'header-show') {
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(100);
  } else if (row.scenario_id === 'pointer-threshold') {
    await page.mouse.move(40, 500);
  } else if (['menu-close', 'menu-link', 'menu-locale'].includes(row.scenario_id)) {
    await page.locator('[data-menu-open]').click();
    await page.locator('#site-menu').waitFor({ state: 'visible' });
  } else if (row.scenario_id === 'route-soft') {
    const desktop = page.locator('[data-site-header] .desktop-nav a:not([aria-current="page"])').first();
    if (!await desktop.isVisible().catch(() => false)) {
      await page.locator('[data-menu-open]').click();
      await page.locator('#site-menu').waitFor({ state: 'visible' });
    }
    await routeSoftLinkV2(page, row);
  } else if (['route-history', 'route-bfcache'].includes(row.scenario_id)) {
    await page.goto(toLocal(new URL(page.url()).origin, `/${row.locale}/residential/`), { waitUntil: 'domcontentloaded' });
  } else if (row.scenario_id === 'gallery-cancel') {
    await target.locator.scrollIntoViewIfNeeded();
    const box = await target.locator.boundingBox();
    if (!box) throw new Error('Drag target has no box');
    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.5, { steps: 3 });
    const active = await target.locator.evaluate((element) => element.classList.contains('is-dragging'));
    if (!active) throw new Error('Pointercancel precondition did not create active drag state');
  } else if (row.scenario_id === 'focus-order') {
    await page.locator('body').focus();
  }
}

async function startActionV2(page, row, target) {
  switch (row.scenario_id) {
    case 'header-intro':
    case 'hero-finite':
    case 'media':
      break;
    case 'header-tone':
      await page.mouse.wheel(0, 120);
      break;
    case 'header-collapse':
      await page.mouse.wheel(0, 420);
      break;
    case 'header-hide':
      await page.mouse.wheel(0, 800);
      break;
    case 'header-show':
      await page.mouse.wheel(0, -600);
      break;
    case 'pointer-threshold':
      await page.mouse.move(40, 100);
      break;
    case 'nav-underline-hover':
    case 'live-snapshot':
    case 'portal':
    case 'story':
    case 'project':
      await target.locator.hover();
      break;
    case 'nav-underline-focus':
      await target.locator.focus();
      break;
    case 'toggle-hover':
      await target.locator.hover();
      break;
    case 'toggle-focus':
      await target.locator.focus();
      break;
    case 'toggle-press':
      await page.locator('[data-menu-open]').click();
      break;
    case 'menu-open':
      await page.locator('[data-menu-open]').click();
      await page.locator('#site-menu').waitFor({ state: 'visible' });
      break;
    case 'menu-close':
      await page.keyboard.press('Escape');
      break;
    case 'menu-link': {
      const links = page.locator(`#site-menu a[href^="/${row.locale}/"]`);
      const index = await links.evaluateAll((elements) => elements.findIndex((element) => new URL(element.href).pathname !== location.pathname));
      if (index < 0) throw new Error('No non-current menu route link');
      await links.nth(index).click();
      await page.waitForLoadState('domcontentloaded');
      break;
    }
    case 'menu-locale': {
      const destinationLocale = row.locale === 'vi' ? 'en' : 'vi';
      await page.locator(`#site-menu [data-language-option][href*="/${destinationLocale}/"]`).first().click();
      await page.waitForLoadState('domcontentloaded');
      break;
    }
    case 'gallery-controls':
      await target.locator.scrollIntoViewIfNeeded();
      await target.locator.click();
      break;
    case 'gallery-drag': {
      await target.locator.scrollIntoViewIfNeeded();
      const box = await target.locator.boundingBox();
      if (!box) throw new Error('Drag target has no box');
      await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5, { steps: 12 });
      await page.mouse.up();
      break;
    }
    case 'gallery-cancel': {
      const box = await target.locator.boundingBox();
      if (!box) throw new Error('Drag target has no box');
      await target.locator.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse', clientX: box.x + box.width * 0.65, clientY: box.y + box.height * 0.5 });
      break;
    }
    case 'gallery-touch': {
      await target.locator.scrollIntoViewIfNeeded();
      const box = await target.locator.boundingBox();
      if (!box) throw new Error('Touch target has no box');
      await page.touchscreen.tap(box.x + box.width * 0.5, box.y + box.height * 0.5);
      break;
    }
    case 'route-direct': {
      await page.goto(toLocal(new URL(page.url()).origin, `/${row.locale}/residential/`), { waitUntil: 'domcontentloaded' });
      break;
    }
    case 'route-soft': {
      const link = await routeSoftLinkV2(page, row);
      await link.click();
      await page.waitForLoadState('domcontentloaded');
      break;
    }
    case 'route-history':
    case 'route-bfcache':
      await page.goBack({ waitUntil: 'domcontentloaded' });
      break;
    case 'route-fail-open': {
      await page.evaluate((locale) => { const anchor = document.createElement('a'); anchor.href = `/${locale}/__motion-audit-missing__/`; anchor.textContent = 'audit'; document.body.append(anchor); anchor.click(); }, row.locale);
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      break;
    }
    case 'hero-continuous':
      break;
    case 'projects-filter':
      await target.locator.scrollIntoViewIfNeeded();
      await target.locator.click();
      break;
    case 'focus-order':
      await page.keyboard.press('Tab');
      break;
    default:
      throw new Error(`Pilot has no concrete action for ${row.scenario_id}`);
  }
}

async function endActionV2(page, row) {
  if (['nav-underline-hover', 'live-snapshot', 'portal', 'story', 'project'].includes(row.scenario_id)) {
    await page.mouse.move(1, Math.max(1, viewport(row.viewport).height - 1));
  } else if (['nav-underline-focus', 'toggle-focus'].includes(row.scenario_id)) {
    await page.locator('body').focus();
  } else if (row.scenario_id === 'pointer-threshold') {
    await page.mouse.move(40, 500);
  } else if (row.scenario_id === 'gallery-cancel') {
    await page.mouse.up();
    const clean = await page.locator(row.target_selector).first().evaluate((element) => !element.classList.contains('is-dragging') && !element.hasPointerCapture?.(1));
    if (!clean) throw new Error('Pointercancel cleanup left active drag state');
  }
}

function animationClock(state) {
  return Math.max(0, ...state.target.animations.map((animation) => animation.currentTime), ...state.page.animations.map((animation) => animation.currentTime));
}

function matrixScaleX(transform) {
  if (!transform || transform === 'none') return 1;
  const match = transform.match(/^matrix\(([-+\d.eE]+),/);
  return match ? Number(match[1]) : Number.NaN;
}

function visualSignature(state) {
  return JSON.stringify({ classes: state.target.classes, style: state.target.style, before: state.target.before, after: state.target.after, descendants: state.target.descendants });
}

function attributeValue(state, name) {
  return state.target.attributes.find(([attribute]) => attribute === name)?.[1] ?? '';
}

function validateV2(row, run) {
  if (run.error) return { pass: false, reason: run.error };
  const { before, start, mid, end } = run;
  if (!before?.target || !end?.target) return { pass: false, reason: 'Missing measured state' };
  switch (row.scenario_id) {
    case 'header-intro':
    case 'hero-finite': {
      const clockDelta = animationClock(end) - animationClock(before);
      const changed = visualSignature(before) !== visualSignature(start) || visualSignature(before) !== visualSignature(mid) || clockDelta > 0;
      const reduced = end.page.bodyClasses.includes('motion-paused') || clockDelta < 2;
      const pass = row.preference === 'reduce' ? reduced : changed;
      return { pass, reason: pass ? `finite-clock-delta-${clockDelta}` : 'Finite intro state neither advanced nor honored reduced motion' };
    }
    case 'header-tone': {
      const pass = end.page.scrollY >= before.page.scrollY + 100 && end.page.header.classes.includes('is-ink');
      return { pass, reason: pass ? 'header-tone-ink' : 'Header tone/scroll threshold missing' };
    }
    case 'header-collapse': {
      const pass = !before.page.header.classes.includes('is-collapsed')
        && end.page.header.classes.includes('is-collapsed')
        && end.page.scrollY > before.page.scrollY + 100;
      return { pass, reason: pass ? 'collapsed-after-scroll' : 'Header collapse state or scroll delta missing' };
    }
    case 'header-hide': {
      const hidden = start.page.header.classes.includes('is-hidden') || mid.page.header.classes.includes('is-hidden');
      return { pass: hidden, reason: hidden ? 'header-hidden-after-wheel' : 'Header hide state missing' };
    }
    case 'header-show': {
      const preparedHidden = before.page.header.classes.includes('is-hidden');
      const shown = !start.page.header.classes.includes('is-hidden') && !end.page.header.classes.includes('is-hidden');
      return { pass: preparedHidden && shown, reason: preparedHidden && shown ? 'header-shown-after-wheel' : 'Header show precondition/state missing' };
    }
    case 'pointer-threshold': {
      const forced = start.page.header.classes.includes('forceShow') || mid.page.header.classes.includes('forceShow');
      const released = !end.page.header.classes.includes('forceShow');
      return { pass: forced && released, reason: forced && released ? 'pointer-threshold-350' : 'forceShow threshold states missing' };
    }
    case 'nav-underline-hover':
    case 'nav-underline-focus': {
      const beforeScale = matrixScaleX(before.target.after.transform);
      const peakScale = Math.max(matrixScaleX(start.target.after.transform), matrixScaleX(mid.target.after.transform));
      const height = Number.parseFloat(start.target.after.height);
      const pass = Number.isFinite(peakScale) && peakScale > beforeScale + 0.05 && Math.abs(height - 3) <= 0.5;
      return { pass, reason: pass ? `underline-scale-${peakScale}` : 'Pseudo-element scale/3px underline delta missing' };
    }
    case 'toggle-hover': {
      const changed = visualSignature(before) !== visualSignature(start) || visualSignature(before) !== visualSignature(mid);
      return { pass: changed, reason: changed ? 'toggle-hover-visual-delta' : 'Toggle hover produced no measured visual delta' };
    }
    case 'toggle-focus': {
      const pass = start.target.focused;
      return { pass, reason: pass ? 'toggle-focused' : 'Toggle focus state missing' };
    }
    case 'toggle-press': {
      const expanded = attributeValue(start, 'aria-expanded') === 'true' && start.page.bodyClasses.includes('menu-open');
      return { pass: expanded, reason: expanded ? 'toggle-pressed-open' : 'Toggle press state missing' };
    }
    case 'menu-open': {
      const opened = start.page.bodyClasses.includes('menu-open') && attributeValue(start, 'open') === '';
      return { pass: opened, reason: opened ? 'menu-opened' : 'Menu open state missing' };
    }
    case 'menu-close': {
      const opened = before.page.bodyClasses.includes('menu-open');
      const closed = !start.page.bodyClasses.includes('menu-open') && !end.page.bodyClasses.includes('menu-open');
      return { pass: opened && closed, reason: opened && closed ? 'menu-closed' : 'Menu close precondition/state missing' };
    }
    case 'menu-link': {
      const pass = before.page.bodyClasses.includes('menu-open') && start.page.path !== before.page.path;
      return { pass, reason: pass ? `${before.page.path}|${end.page.path}` : 'Menu link did not produce route change' };
    }
    case 'menu-locale': {
      const destinationLocale = row.locale === 'vi' ? 'en' : 'vi';
      const pass = before.page.bodyClasses.includes('menu-open') && start.page.path.startsWith(`/${destinationLocale}/`);
      return { pass, reason: pass ? `${before.page.path}|${end.page.path}` : 'Menu locale did not produce locale route' };
    }
    case 'hero-continuous': {
      const a = animationClock(before), b = animationClock(mid), c = animationClock(end);
      const pass = row.preference === 'reduce' ? c - a < 2 : b > a && c >= b;
      return { pass, reason: pass ? `animation-clock-${a}-${c}` : 'Animation clock did not match motion preference' };
    }
    case 'portal':
    case 'story':
    case 'project': {
      const changed = visualSignature(before) !== visualSignature(start) || visualSignature(before) !== visualSignature(mid);
      return { pass: changed, reason: changed ? 'hover-visual-delta' : 'Hover produced no measured visual delta' };
    }
    case 'gallery-controls': {
      const a = before.page.scrollers.find((item) => item.selector === 'gallery')?.scrollLeft ?? 0;
      const b = end.page.scrollers.find((item) => item.selector === 'gallery')?.scrollLeft ?? 0;
      const pass = Math.abs(b - a) >= 2;
      return { pass, reason: pass ? `gallery-control-delta-${b - a}` : 'Gallery control produced no scroll delta' };
    }
    case 'gallery-drag': {
      const delta = end.target.scrollLeft - before.target.scrollLeft;
      const pass = Math.abs(delta) >= 2;
      return { pass, reason: pass ? `scrollLeft-delta-${delta}` : 'Physical drag produced no horizontal scroll delta' };
    }
    case 'gallery-cancel': {
      const activeBefore = before.target.classes.includes('is-dragging');
      const clearedAfter = !start.target.classes.includes('is-dragging') && !mid.target.classes.includes('is-dragging') && !end.target.classes.includes('is-dragging');
      return { pass: activeBefore && clearedAfter, reason: activeBefore && clearedAfter ? 'pointercancel-active-drag-cleared' : 'Pointercancel lacked active-drag precondition or cleanup' };
    }
    case 'gallery-touch': {
      const pass = !end.target.classes.includes('is-dragging') && Math.abs(end.target.scrollLeft - before.target.scrollLeft) < 2;
      return { pass, reason: pass ? 'touch-ignored-by-pointer-handler' : 'Touch tap unexpectedly changed gallery drag state' };
    }
    case 'route-direct':
    case 'route-soft': {
      const pass = end.page.path !== before.page.path && before.page.header.exists && end.page.header.exists;
      return { pass, reason: pass ? `${before.page.path}|${end.page.path}` : 'Physical route change/header persistence missing' };
    }
    case 'route-history': {
      const pass = end.page.path === before.page.path && before.page.header.exists && end.page.header.exists;
      return { pass, reason: pass ? `history-returned-${end.page.path}` : 'History back did not restore original route shell' };
    }
    case 'route-bfcache': {
      const pass = end.page.path === before.page.path && end.page.bfcachePageshowCount > before.page.bfcachePageshowCount;
      return { pass, reason: pass ? 'bfcache-pageshow-persisted' : 'BFCache pageshow persisted event was not observed' };
    }
    case 'route-fail-open': {
      return { pass: false, reason: 'Missing-route fallback has no isolated deterministic fixture; retained as executed-runtime blocker.' };
    }
    case 'projects-filter': {
      const pass = attributeValue(end, 'aria-pressed') === 'true';
      return { pass, reason: pass ? 'filter-pressed' : 'Project filter pressed state missing' };
    }
    case 'media': {
      const pass = before.page.media.length > 0
        ? before.page.media.every((item) => Number.isFinite(item.currentTime) && item.readyState >= 0)
        : before.target.rect.width > 0 && before.target.rect.height > 0;
      return { pass, reason: pass ? 'media-state-observed' : 'Media element state unavailable' };
    }
    case 'focus-order': {
      const pass = Boolean(before.page.active && start.page.active && before.page.active !== start.page.active);
      return { pass, reason: pass ? `${before.page.active}|${start.page.active}` : 'Single Tab did not advance focus' };
    }
    case 'live-snapshot': {
      const pass = before.target.rect.width > 0 && before.target.rect.height > 0 && new URL(end.page.url).origin === 'https://espaciohomedesign.com';
      return { pass, reason: pass ? 'read-only-visible-target-snapshot' : 'Live visible target or allowed origin missing' };
    }
    default:
      return { pass: false, reason: `No validator for ${row.scenario_id}` };
  }
}

function repeatAgreementV2(row, runs) {
  const verdicts = runs.map((run) => validateV2(row, run));
  const sameOutcome = verdicts.every((verdict) => verdict.pass === verdicts[0].pass);
  if (!sameOutcome) return { pass: false, reason: `Repeat disagreement: ${verdicts.map((verdict) => verdict.pass).join('/')}`, verdicts };
  return { pass: verdicts.every((verdict) => verdict.pass), reason: verdicts.map((verdict) => verdict.reason).join(' | '), verdicts };
}

async function probeV2(browser, row, base) {
  assertContractV2(row);
  const local = row.system === 'truong-thinh';
  const url = local ? toLocal(base, row.exact_url_or_route) : row.exact_url_or_route;
  if (!local && !liveAllowlist.has(url)) throw new Error(`Live URL outside allowlist: ${url}`);
  const dir = path.join(evidenceRoot, safeName(row.obligation_id));
  await mkdir(dir, { recursive: true });
  const runs = [];
  for (let runNumber = 1; runNumber <= 2; runNumber += 1) {
    const context = await browser.newContext({
      viewport: viewport(row.viewport),
      deviceScaleFactor: 1,
      reducedMotion: row.preference === 'reduce' ? 'reduce' : 'no-preference',
      locale: row.locale === 'vi' ? 'vi-VN' : 'en-US',
      colorScheme: 'light',
    });
    const page = await context.newPage();
    await page.addInitScript(() => window.addEventListener('pageshow', (event) => { if (event.persisted) window.__motionAuditBfcachePageshowCount = Number(window.__motionAuditBfcachePageshowCount || 0) + 1; }));
    const consoleMessages = [];
    const network = [];
    page.on('console', (message) => consoleMessages.push(`${message.type()}:${message.text()}`));
    page.on('requestfailed', (request) => network.push(`failed:${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`));
    page.on('response', (response) => { if (response.status() >= 400) network.push(`${response.status()}:${response.url()}`); });
    const started = Date.now();
    let sourcePageHash = '';
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      sourcePageHash = await pageFingerprintV2(page);
      await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
      if (!local) await page.waitForTimeout(1500);
      if (row.scenario_id === 'projects-filter') await page.waitForTimeout(2500);
      await raf(page);
      const target = await resolveTargetV2(page, row);
      const prefix = path.join(dir, `run${runNumber}`);
      await prepareActionV2(page, row, target);
      const before = await captureV2(page, target, `${prefix}-before.png`);
      await startActionV2(page, row, target);
      const start = await captureV2(page, target, `${prefix}-start.png`);
      await page.waitForTimeout(125);
      const mid = await captureV2(page, target, `${prefix}-mid.png`);
      await page.waitForTimeout(row.scenario_id === 'header-collapse' ? 1000 : 250);
      await endActionV2(page, row);
      const end = await captureV2(page, target, `${prefix}-end.png`);
      runs.push({ before, start, mid, end, sourcePageHash, target: { selector: target.selector, index: target.index }, console: consoleMessages, network, url, durationMs: Date.now() - started });
    } catch (error) {
      runs.push({ error: error.message, sourcePageHash, console: consoleMessages, network, url, durationMs: Date.now() - started });
    } finally {
      await context.close();
    }
    if (!local) await new Promise((resolve) => setTimeout(resolve, 350));
  }
  const agreement = repeatAgreementV2(row, runs);
  const artifactPath = path.join(dir, `${safeName(row.obligation_id)}.json`);
  await writeFile(artifactPath, JSON.stringify({ obligation: row, runs, agreement }, null, 2));
  const first = runs[0];
  return {
    ...row,
    browser: 'Chrome via Playwright', os: process.platform, dpr: '1', zoom: '100%',
    cache_network_state: 'fresh context; default network', fixture_data_identity: row.scenario_id,
    source_page_hash: first.sourcePageHash || '', runner_hash: runnerHash, schema_hash: schemaHash, timestamp: new Date().toISOString(),
    stable_anchor_member_ids: first.target ? `${first.target.selector}[${first.target.index}]` : '',
    artifact_refs: path.relative(root, artifactPath).replaceAll('\\', '/'),
    before_measured_values: JSON.stringify(first.before ?? {}), start_measured_values: JSON.stringify(first.start ?? {}),
    mid_measured_values: JSON.stringify(first.mid ?? {}), end_measured_values: JSON.stringify(first.end ?? {}),
    console_network_summary: `console=${runs.flatMap((run) => run.console || []).length};network=${runs.flatMap((run) => run.network || []).length}`,
    status: agreement.pass ? 'confirmed' : 'blocked', blocker: agreement.pass ? '' : agreement.reason,
    duration_ms: runs.reduce((sum, run) => sum + run.durationMs, 0) / runs.length,
  };
}

async function fingerprintRowV2(browser, row, base) {
  assertContractV2(row);
  const context = await browser.newContext({ viewport: viewport(row.viewport), deviceScaleFactor: 1, reducedMotion: row.preference === 'reduce' ? 'reduce' : 'no-preference', locale: row.locale === 'vi' ? 'vi-VN' : 'en-US', colorScheme: 'light' });
  try {
    const page = await context.newPage();
    const url = row.system === 'truong-thinh' ? toLocal(base, row.exact_url_or_route) : row.exact_url_or_route;
    if (row.system !== 'truong-thinh' && !liveAllowlist.has(url)) throw new Error(`Live URL outside allowlist: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    return await pageFingerprintV2(page);
  } catch { return ''; } finally { await context.close().catch(() => {}); }
}

async function pilotSelectionV2() {
  const all = csvParse(await readFile(obligationsPath, 'utf8'));
  const scenarios = ['header-collapse', 'nav-underline-hover', 'hero-continuous', 'gallery-drag', 'gallery-cancel', 'gallery-touch', 'route-direct', 'route-soft', 'route-history', 'route-bfcache'];
  const locals = scenarios.map((scenario) => all.find((row) => row.system === 'truong-thinh' && row.scenario_id === scenario && row.locale === 'vi' && row.preference === 'no-preference'));
  const selected = locals.filter(Boolean);
  if (selected.length !== 10) throw new Error(`Pilot selection incomplete: ${selected.length}/10`);
  return selected;
}

function staticBlockerRowV2(row, artifactRef, timestamp) {
  return {
    ...row,
    browser: 'not-applicable', os: process.platform, dpr: 'not-applicable', zoom: 'not-applicable',
    cache_network_state: 'not-applicable', fixture_data_identity: row.representative_candidate_id,
    source_page_hash: row.source_fingerprint || 'not-applicable:static-binding-blocker', runner_hash: runnerHash, schema_hash: schemaHash, timestamp,
    stable_anchor_member_ids: row.representative_candidate_id, artifact_refs: artifactRef,
    before_measured_values: '{}', start_measured_values: '{}', mid_measured_values: '{}', end_measured_values: '{}',
    console_network_summary: 'not-applicable', status: 'blocked',
    blocker: row.applicability_blocker || 'Static archive signal has no authorized runtime binding.', duration_ms: '0',
  };
}

async function runPoolV2(rows, concurrency, worker, onProgress) {
  const output = new Array(rows.length);
  let next = 0;
  let completed = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, rows.length) }, async () => {
    while (true) {
      const index = next;
      next += 1;
      if (index >= rows.length) return;
      output[index] = await worker(rows[index]);
      if (output[index]?.blocker?.includes('ERR_CONNECTION_REFUSED')) throw new Error(`Infrastructure unavailable at ${rows[index].obligation_id}`);
      completed += 1;
      if (completed % 10 === 0 || completed === rows.length) await onProgress(completed, output.filter(Boolean));
    }
  }));
  return output;
}

async function runFullV2() {
  const base = args.get('base-url') || 'http://127.0.0.1:8787';
  const obligations = csvParse(await readFile(obligationsPath, 'utf8'));
  const local = obligations.filter((row) => row.system === 'truong-thinh' && row.obligation_type === 'runtime-scenario');
  const live = obligations.filter((row) => row.system === 'espacio-live' && row.obligation_type === 'runtime-scenario');
  const staticRows = obligations.filter((row) => ['static-binding-blocker', 'live-snapshot-blocker'].includes(row.obligation_type));
  if (!local.length || staticRows.length + local.length + live.length !== obligations.length) throw new Error(`Full matrix mismatch: total=${obligations.length};local=${local.length};live-runtime=${live.length};blockers=${staticRows.length}`);
  const timestamp = new Date().toISOString();
  const staticArtifactPath = path.join(evidenceRoot, 'static-binding-blockers.json');
  await mkdir(evidenceRoot, { recursive: true });
  await writeFile(staticArtifactPath, JSON.stringify({ timestamp, count: staticRows.length, obligations: staticRows.map((row) => ({ obligation_id: row.obligation_id, representative_candidate_id: row.representative_candidate_id, blocker: row.applicability_blocker })) }, null, 2));
  const staticArtifactRef = path.relative(root, staticArtifactPath).replaceAll('\\', '/');
  const blocked = staticRows.map((row) => staticBlockerRowV2(row, staticArtifactRef, timestamp));
  const existing = args.has('resume') ? await readFile(runtimePath, 'utf8').then(csvParse).catch(() => []) : [];
  const currentById = new Map(obligations.map((row) => [row.obligation_id, row]));
  const reusable = new Map(existing.filter((row) => {
    const current = currentById.get(row.obligation_id);
    return current
      && ['truong-thinh', 'espacio-live'].includes(row.system)
      && ['confirmed', 'blocked'].includes(row.status)
      && !row.blocker.includes('ERR_CONNECTION_REFUSED')
      && row.runner_hash === runnerHash && row.schema_hash === schemaHash
      && row.contract_fingerprint === current.contract_fingerprint
      && current.contract_fingerprint === contractFingerprintV2(current)
      && row.source_page_hash.startsWith('dom:');
  }).map((row) => [row.obligation_id, row]));
  let pendingLocal = local.filter((row) => !reusable.has(row.obligation_id));
  let pendingLive = live.filter((row) => !reusable.has(row.obligation_id));
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  if (args.has('resume') && reusable.size) {
    const reusableRows = [...local, ...live].filter((row) => reusable.has(row.obligation_id));
    const fingerprints = await runPoolV2(reusableRows, 1, (row) => fingerprintRowV2(browser, row, base), async () => {});
    for (let index = 0; index < reusableRows.length; index += 1) {
      if (fingerprints[index] !== reusable.get(reusableRows[index].obligation_id)?.source_page_hash) reusable.delete(reusableRows[index].obligation_id);
    }
    pendingLocal = local.filter((row) => !reusable.has(row.obligation_id));
    pendingLive = live.filter((row) => !reusable.has(row.obligation_id));
  }
  let localOutput = [];
  let liveOutput = [];
  const checkpoint = async (phase, completed, partial) => {
    const localRows = local.map((row) => reusable.get(row.obligation_id)).filter(Boolean);
    const liveRows = live.map((row) => reusable.get(row.obligation_id)).filter(Boolean);
    const rows = phase === 'local' ? [...blocked, ...localRows, ...partial] : [...blocked, ...localOutput, ...liveRows, ...partial];
    await writeFile(runtimePath, csv(runtimeColumns, rows));
    console.log(JSON.stringify({ phase, completed, pending: phase === 'local' ? pendingLocal.length : pendingLive.length, total: phase === 'local' ? local.length : live.length, reused: phase === 'local' ? localRows.length : liveRows.length, confirmed: partial.filter((row) => row.status === 'confirmed').length, blocked: partial.filter((row) => row.status === 'blocked').length }));
  };
  try {
    const measuredLocal = await runPoolV2(pendingLocal, 1, (row) => probeV2(browser, row, base), (completed, partial) => checkpoint('local', completed, partial));
    localOutput = local.map((row) => reusable.get(row.obligation_id) || measuredLocal.find((measured) => measured.obligation_id === row.obligation_id));
    const measuredLive = await runPoolV2(pendingLive, 1, (row) => probeV2(browser, row, base), (completed, partial) => checkpoint('live', completed, partial));
    liveOutput = live.map((row) => reusable.get(row.obligation_id) || measuredLive.find((measured) => measured.obligation_id === row.obligation_id));
  } finally {
    await browser.close();
  }
  const output = [...blocked, ...localOutput, ...liveOutput].sort((a, b) => a.obligation_id.localeCompare(b.obligation_id));
  await writeFile(runtimePath, csv(runtimeColumns, output));
  const counts = Object.fromEntries(['confirmed', 'blocked'].map((status) => [status, output.filter((row) => row.status === status).length]));
  console.log(JSON.stringify({ complete: true, rows: output.length, local: localOutput.length, live: liveOutput.length, static: blocked.length, ...counts, runtimeHash: sha(await readFile(runtimePath)), runnerHash: sha(await readFile(fileURLToPath(import.meta.url))) }, null, 2));
}

async function runSampleAllV2() {
  const base = args.get('base-url') || 'http://127.0.0.1:8787';
  const obligations = csvParse(await readFile(obligationsPath, 'utf8'));
  const selected = [];
  const requested = args.get('sample-scenarios')?.split(',').filter(Boolean);
  const scenarios = requested || [...new Set(obligations.filter((row) => row.system === 'truong-thinh' && row.scenario_id).map((row) => row.scenario_id))];
  for (const scenario of scenarios) {
    for (const preference of ['no-preference', 'reduce']) {
      const row = obligations.find((candidate) => candidate.system === 'truong-thinh' && candidate.scenario_id === scenario && candidate.preference === preference);
      if (row) selected.push(row);
    }
  }
  if (selected.length !== scenarios.length * 2) throw new Error(`Sample matrix mismatch: ${selected.length}/${scenarios.length * 2}`);
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  let output;
  try {
    output = await runPoolV2(selected, 3, (row) => probeV2(browser, row, base), async (completed, partial) => {
      console.log(JSON.stringify({ phase: 'sample-all', completed, total: selected.length, confirmed: partial.filter((row) => row.status === 'confirmed').length, blocked: partial.filter((row) => row.status === 'blocked').length }));
    });
  } finally {
    await browser.close();
  }
  await writeFile(runtimePath, csv(runtimeColumns, output));
  console.log(JSON.stringify({ sampleComplete: true, rows: output.map((row) => ({ scenario: row.scenario_id, preference: row.preference, status: row.status, blocker: row.blocker })) }, null, 2));
}

async function invalidateStaleV2() {
  const obligations = csvParse(await readFile(obligationsPath, 'utf8'));
  const timestamp = new Date().toISOString();
  const current = args.has('preserve-current') ? await readFile(runtimePath, 'utf8').then(csvParse).catch(() => []) : [];
  const currentById = new Map(obligations.map((row) => [row.obligation_id, row]));
  const preserved = new Map(current.filter((row) => {
    const obligation = currentById.get(row.obligation_id);
    return obligation
      && row.runner_hash === runnerHash && row.schema_hash === schemaHash
      && row.contract_fingerprint === obligation.contract_fingerprint
      && obligation.contract_fingerprint === contractFingerprintV2(obligation)
      && ['confirmed', 'blocked'].includes(row.status)
      && row.source_page_hash.startsWith('dom:');
  }).map((row) => [row.obligation_id, row]));
  const artifactPath = path.join(evidenceRoot, 'static-binding-blockers.json');
  await mkdir(evidenceRoot, { recursive: true });
  const staticRows = obligations.filter((row) => row.obligation_type !== 'runtime-scenario');
  await writeFile(artifactPath, JSON.stringify({ timestamp, count: staticRows.length, reason: 'Legacy runtime rows invalidated after schema/protocol/provenance repair.', obligations: staticRows.map((row) => ({ obligation_id: row.obligation_id, obligation_type: row.obligation_type, blocker: row.applicability_blocker })) }, null, 2));
  const artifactRef = path.relative(root, artifactPath).replaceAll('\\', '/');
  const output = obligations.map((row) => preserved.get(row.obligation_id) || (row.obligation_type !== 'runtime-scenario' ? staticBlockerRowV2(row, artifactRef, timestamp) : ({
    ...row, browser: 'not-measured', os: process.platform, dpr: 'not-measured', zoom: 'not-measured', cache_network_state: 'not-measured', fixture_data_identity: row.scenario_id,
    source_page_hash: 'not-measured:runtime DOM fingerprint unavailable after audit repair', runner_hash: runnerHash, schema_hash: schemaHash, timestamp, stable_anchor_member_ids: '', artifact_refs: '',
    before_measured_values: '{}', start_measured_values: '{}', mid_measured_values: '{}', end_measured_values: '{}', console_network_summary: 'not-measured', status: 'blocked',
    blocker: 'Invalidated: legacy runtime result predates atomic protocol, target-specific mapping, and DOM provenance requirements.', duration_ms: '0',
  })));
  await writeFile(runtimePath, csv(runtimeColumns, output.sort((a, b) => a.obligation_id.localeCompare(b.obligation_id))));
  console.log(JSON.stringify({ invalidated: true, rows: output.length, preserved: preserved.size, runtimeBlocked: output.filter((row) => row.obligation_type === 'runtime-scenario' && row.status === 'blocked').length, staticBlocked: staticRows.length, runtimeHash: sha(await readFile(runtimePath)), runnerHash, schemaHash }, null, 2));
}

function selfTestV2() {
  const base = { target: { rect: { width: 10, height: 10 }, after: { transform: 'matrix(0, 0, 0, 1, 0, 0)', height: '3px' }, animations: [], scrollLeft: 0 }, page: { url: 'http://127.0.0.1/vi/', path: '/vi/', scrollY: 0, header: { exists: true, classes: 'site-header' }, animations: [] } };
  const cases = [
    ['header-collapse', { ...base, page: { ...base.page, scrollY: 420, header: { exists: true, classes: 'site-header is-collapsed' } } }, true],
    ['header-collapse', base, false],
    ['nav-underline-hover', { ...base, target: { ...base.target, after: { transform: 'matrix(1, 0, 0, 1, 0, 0)', height: '3px' } } }, true],
    ['nav-underline-focus', { ...base, target: { ...base.target, after: { transform: 'matrix(1, 0, 0, 1, 0, 0)', height: '3px' } } }, true],
    ['nav-underline-hover', base, false],
    ['hero-continuous', { ...base, target: { ...base.target, animations: [{ currentTime: 30 }] } }, true],
    ['hero-continuous', base, false],
    ['gallery-drag', { ...base, target: { ...base.target, scrollLeft: 20 } }, true],
    ['gallery-drag', base, false],
    ['route-soft', { ...base, page: { ...base.page, path: '/vi/residential/' } }, true],
    ['route-soft', base, false],
    ['route-fail-open', base, false],
  ];
  const results = cases.map(([scenario, end, expected]) => validateV2({ scenario_id: scenario, preference: 'no-preference' }, { before: base, start: end, mid: end, end }).pass === expected);
  const dragging = { ...base, target: { ...base.target, classes: 'is-dragging' } };
  const cleared = { ...base, target: { ...base.target, classes: '' } };
  results.push(validateV2({ scenario_id: 'gallery-cancel', preference: 'no-preference' }, { before: dragging, start: cleared, mid: cleared, end: cleared }).pass);
  results.push(!validateV2({ scenario_id: 'gallery-cancel', preference: 'no-preference' }, { before: cleared, start: cleared, mid: cleared, end: cleared }).pass);
  const contractBase = { motion_group_id: 'probe-nav-underline-hover', system: 'truong-thinh', exact_url_or_route: '/vi/', template: 'home', locale: 'vi', viewport: '1440x900', orientation: 'portrait', preference: 'no-preference', lifecycle: 'load+state+reset', scenario_id: 'nav-underline-hover', target_selector: '.desktop-nav a', action_protocol: 'hover', sample_timings: 'before,0ms,125ms,375ms;repeat=2', obligation_type: 'runtime-scenario', source_fingerprint: 'candidate-set:test' };
  const changedTarget = { ...contractBase, target_selector: '.desktop-nav a:focus-visible' };
  results.push(contractFingerprintV2(contractBase) !== contractFingerprintV2(changedTarget));
  results.push((() => { try { assertContractV2({ ...contractBase, contract_fingerprint: contractFingerprintV2(contractBase) }); return true; } catch { return false; } })());
  results.push((() => { try { assertContractV2({ ...contractBase, contract_fingerprint: contractFingerprintV2(changedTarget) }); return false; } catch { return true; } })());
  results.push(['wheel:420', 'click-route', 'Tab', 'mouse.move:screenY350'].every((protocol) => measuredEventCountV2(protocol) === 1));
  results.push(measuredEventCountV2('Tab;Tab') !== 1);
  if (!results.every(Boolean)) throw new Error(`Self-test failed: ${results.filter(Boolean).length}/${results.length}`);
  console.log(JSON.stringify({ passed: results.length, total: results.length }));
}

async function runCliV2() {
  if (args.has('self-test')) return selfTestV2();
  if (args.has('invalidate-stale')) return invalidateStaleV2();
  if (args.has('sample-all')) return runSampleAllV2();
  if (args.has('full')) return runFullV2();
  const selected = await pilotSelectionV2();
  if (args.has('list')) {
    console.log(JSON.stringify(selected.map((row) => ({ id: row.obligation_id, system: row.system, scenario: row.scenario_id, selector: row.target_selector })), null, 2));
    return;
  }
  if (args.get('pilot') !== '10') throw new Error('Use --self-test, --list, --pilot 10, or --full');
  const base = args.get('base-url') || 'http://127.0.0.1:8787';
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const output = [];
  try {
    for (const row of selected) output.push(await probeV2(browser, row, base));
  } finally {
    await browser.close();
  }
  await writeFile(runtimePath, csv(runtimeColumns, output));
  const durations = (system) => output.filter((row) => row.system === system).map((row) => row.duration_ms).sort((a, b) => a - b);
  const median = (values) => values[Math.floor(values.length / 2)];
  console.log(JSON.stringify({
    rows: output.map((row) => ({ id: row.obligation_id, status: row.status, blocker: row.blocker, artifact: row.artifact_refs })),
    medianLocalMs: median(durations('truong-thinh')), medianLiveMs: median(durations('espacio-live')),
    runnerHash: sha(await readFile(fileURLToPath(import.meta.url))),
  }, null, 2));
}

runCliV2().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
