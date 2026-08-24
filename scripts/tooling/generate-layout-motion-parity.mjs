import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { excludedWithReason, exclusionForOrigin, exclusionPolicyErrors } from './layout-motion-parity-exclusions.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const reports = path.join(root, 'docs', 'reports');
const candidatePath = path.join(reports, 'research-espacio-motion-candidates.csv');
const candidateMapPath = path.join(reports, 'research-espacio-motion-candidate-map.csv');
const obligationsPath = path.join(reports, 'research-espacio-layout-motion-obligations.csv');
const coveragePath = path.join(reports, 'research-espacio-layout-motion-coverage.csv');
const reportPath = path.join(reports, 'research-espacio-layout-motion-parity.md');
const canonicalViewports = ['320x844', '390x844', '768x900', '1024x900', '1440x900'];
const breakpointWidths = [360, 578, 680, 750, 960, 980, 981, 1024, 1200];
const columns = ['obligation_id', 'category', 'local_url', 'live_url', 'template', 'viewport', 'device_mode', 'preference', 'state_scenario', 'local_selector', 'live_selector', 'local_action_selector', 'live_action_selector', 'local_cleanup_selector', 'live_cleanup_selector', 'local_pseudo', 'live_pseudo', 'action_protocol', 'sample_timings', 'geometry_threshold_px', 'timing_threshold_frames', 'contract_fingerprint', 'applicability', 'exclusion_original_obligation_id', 'exclusion_reason', 'blocker', 'mapping_confidence', 'initial_status'];
const coverageColumns = ['candidate_id', 'source_kind', 'source_anchor', 'obligation_id', 'mapping_id', 'mapping_kind', 'status', 'blocker', 'contract_fingerprint', 'artifact_refs'];
const sha = (value) => createHash('sha256').update(value).digest('hex');
const csvEscape = (value) => { const text = String(value ?? ''); return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; };
const csvWrite = (head, rows) => `${head.join(',')}\n${rows.map((row) => head.map((key) => csvEscape(row[key])).join(',')).join('\n')}\n`;
function csvParse(text) {
  const rows = []; let row = []; let field = ''; let quoted = false;
  for (let i = 0; i < text.length; i += 1) { const char = text[i]; const next = text[i + 1]; if (quoted) { if (char === '"' && next === '"') { field += '"'; i += 1; } else if (char === '"') quoted = false; else field += char; } else if (char === '"') quoted = true; else if (char === ',') { row.push(field); field = ''; } else if (char === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; } else field += char; }
  if (field || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  const [head, ...body] = rows.filter((item) => item.some(Boolean)); return body.map((item) => Object.fromEntries(head.map((key, index) => [key, item[index] ?? ''])));
}
function contract(row) { const values = columns.filter((key) => !['obligation_id', 'contract_fingerprint', 'initial_status', 'blocker', 'exclusion_original_obligation_id', 'exclusion_reason'].includes(key)).map((key) => row[key] ?? ''); if (row.applicability === excludedWithReason) values.push('owner-approved-exclusion', row.exclusion_original_obligation_id ?? '', row.exclusion_reason ?? ''); return `contract:${sha(values.join('|'))}`; }
function obligation(input) { const row = { local_pseudo: '', live_pseudo: '', geometry_threshold_px: '0.5', timing_threshold_frames: '1', sample_timings: 'before,next-rAF-start,mid,end,cleanup;rAF;resets=2', applicability: 'applicable', exclusion_original_obligation_id: '', exclusion_reason: '', blocker: '', mapping_confidence: 'explicit-selector-pair', initial_status: 'blocked', ...input }; row.local_action_selector ||= row.local_selector; row.live_action_selector ||= row.live_selector; row.local_cleanup_selector ||= row.local_action_selector; row.live_cleanup_selector ||= row.live_action_selector; row.contract_fingerprint = contract(row); const originalId = `lmp-${sha(row.contract_fingerprint).slice(0, 24)}`; const exclusion = exclusionForOrigin(originalId); if (exclusion) { row.applicability = excludedWithReason; row.exclusion_original_obligation_id = originalId; row.exclusion_reason = exclusion.reason; row.contract_fingerprint = contract(row); row.obligation_id = originalId; } else row.obligation_id = originalId; return row; }
const routes = [
  ['/en/', 'https://espaciohomedesign.com/en', 'home'],
  ['/en/residential/', 'https://espaciohomedesign.com/en/interior-design', 'residential-interior-design'],
  ['/en/commercial/', 'https://espaciohomedesign.com/en/services', 'commercial-services'],
  ['/en/advertising-products/', 'https://espaciohomedesign.com/en/projects', 'advertising-products-projects'],
  ['/en/about/', 'https://espaciohomedesign.com/en/about-us', 'about-about-us'],
];
const selectorPairs = { header: ['[data-site-header]', 'header'], nav: ['#header-menu-items', '#header-menu-items'], menu: ['#site-menu', '#full-menu-nav'], main: ['main', 'main'], hero: ['#top', 'main'], sections: ['main section', 'main section'], gallery: ['[data-gallery-track]', '.swiper'], filter: ['[data-project-filter]', '[data-filter]'], footer: ['footer', 'footer'], body: ['body', 'body'] };
function deviceModes(viewport) { return Number(viewport.split('x')[0]) < 768 ? ['touch'] : ['mouse', 'touch']; }
function menuStateSpecs() {
  const protocol = 'load;press;next-rAF-start;mid;end;press-close;cleanup';
  const rows = [
    ['navbar', 'menu-open-overlay', 'menu', protocol, '#site-menu', '#full-menu-nav'],
    ['motion', 'menu-open-wrapper', 'menu', protocol, '.menu-nav', '#full-menu-wrapper'],
    ['motion', 'menu-open-brand', 'menu', protocol, '.menu-brand', '#full-menu-header-logo'],
    ['motion', 'menu-open-appointment', 'menu', protocol, '.menu-appointment', '#full-menu-cita > .full-menu-option'],
    ['motion', 'menu-open-close', 'menu', protocol, '.menu-close__icon', '#full-menu-close-svg'],
  ];
  for (let index = 1; index <= 4; index += 1) rows.push(['motion', `menu-open-shutter-${index}`, 'menu', protocol, `.menu-shutters > i:nth-child(${index})`, `#full-menu-bg > div:nth-child(${index})`]);
  const localOptionCounts = [3, 4, 4, 4];
  const liveOptionCounts = [5, 7, 5, 4];
  for (let group = 1; group <= 4; group += 1) {
    rows.push(['motion', `menu-open-group-${group}`, 'menu', protocol, `.menu-nav > .menu-group:nth-child(${group})`, `#full-menu-wrapper > .full-menu-group:nth-child(${group})`]);
    const optionCount = Math.min(localOptionCounts[group - 1], liveOptionCounts[group - 1]);
    for (let option = 1; option <= optionCount; option += 1) {
      rows.push(['motion', `menu-open-option-${group}-${option}`, 'menu', protocol, `.menu-nav > .menu-group:nth-child(${group}) .menu-option:nth-child(${option})`, `#full-menu-wrapper > .full-menu-group:nth-child(${group}) nav > .full-menu-option:nth-child(${option})`]);
    }
  }
  const liveLanguageIds = ['#changeLangES', '#changeLangEN'];
  for (let index = 1; index <= 2; index += 1) rows.push(['motion', `menu-open-language-option-${index}`, 'menu', protocol, `.menu-language > [data-language-option]:nth-child(${index})`, liveLanguageIds[index - 1]]);
  return rows;
}
function stateSpecs(template) {
  const rows = [['layout', 'top-header', 'header', 'load;capture-top;full-page'], ['layout', 'full-page-layout', 'body', 'load;capture-top;full-page'], ['navbar', 'nav-top', 'nav', 'load;capture-top'], ...menuStateSpecs(), ['motion', 'header-scroll', 'header', 'load;scroll:420;next-rAF-start;mid;end;scroll:0;cleanup'], ['layout', 'main-sections', 'sections', 'load;capture-top;full-page'], ['layout', 'footer-layout', 'footer', 'load;capture-top;full-page'], ['motion', 'route-transition', 'body', 'direct-navigate;next-rAF-start;mid;end;cleanup'], ['motion', 'route-history', 'body', 'history-back;next-rAF-start;mid;end;cleanup'], ['motion', 'route-bfcache', 'body', 'history-back;pageshow;next-rAF-start;mid;end;cleanup'], ['motion', 'route-fail-open', 'body', 'click-missing-route;next-rAF-start;mid;end;cleanup'], ['motion', 'locale-transition', 'body', 'click-locale;next-rAF-start;mid;end;cleanup'], ['motion', 'continuous-loop', 'body', 'read-animation-clock;next-rAF-start;mid;end;cleanup'], ['layout', 'responsive-transition', 'body', 'resize;capture-top;full-page']];
  if (template === 'home') rows.push(['layout', 'hero-layout', 'hero', 'load;capture-top;full-page'], ['hover-focus', 'nav-hover', 'nav', 'load;hover;next-rAF-start;mid;end;unhover;cleanup'], ['hover-focus', 'nav-focus', 'nav', 'load;focus;next-rAF-start;mid;end;blur;cleanup']);
  if (template.includes('residential') || template.includes('commercial')) rows.push(['layout', 'gallery-layout', 'gallery', 'load;capture-top;full-page'], ['motion', 'gallery-interrupt-cancel', 'gallery', 'load;drag;next-rAF-start;mid;pointercancel;cleanup']);
  if (template.includes('projects')) rows.push(['layout', 'filter-layout', 'filter', 'load;capture-top;full-page'], ['motion', 'filter-press', 'filter', 'load;press;next-rAF-start;mid;end;cleanup']);
  return rows;
}
function isPilot(row) { return row.local_url === '/en/' && ((row.viewport === '390x844' && row.device_mode === 'touch' && ((['top-header', 'nav-top', 'menu-open-language-option-1'].includes(row.state_scenario) && row.preference === 'no-preference') || row.state_scenario === 'menu-open-overlay')) || (row.viewport === '1440x900' && row.device_mode === 'mouse' && (row.state_scenario === 'top-header' || ((row.state_scenario === 'nav-hover' || row.state_scenario === 'nav-focus') && row.preference === 'no-preference')))); }
function seedObligations() {
  const rows = [];
  for (const [local_url, live_url, template] of routes) for (const viewport of canonicalViewports) for (const preference of ['no-preference', 'reduce']) for (const device_mode of deviceModes(viewport)) for (const [category, state_scenario, pairName, action_protocol, localOverride = '', liveOverride = '', explicitBlocker = ''] of stateSpecs(template)) {
    const width = Number(viewport.split('x')[0]); const desktopNav = width >= 768; const navInteraction = state_scenario === 'nav-hover' || state_scenario === 'nav-focus'; const touchPress = state_scenario === 'nav-hover' && device_mode === 'touch'; const effectiveScenario = touchPress ? 'nav-touch-press' : state_scenario; const effectiveProtocol = touchPress ? 'load;press;next-rAF-start;mid;end;press-close;cleanup' : action_protocol;
    const pair = localOverride && liveOverride ? [localOverride, liveOverride] : state_scenario === 'nav-top' && !desktopNav ? selectorPairs.header : navInteraction ? desktopNav ? ['#header-menu-items li:first-child > a', '#header-menu-items li:first-child > a'] : ['#header-menu-toggle', '#header-menu-toggle'] : selectorPairs[pairName]; const [local_selector, live_selector] = pair; const runtimeBinding = ['main-sections', 'gallery-layout', 'gallery-interrupt-cancel', 'filter-layout', 'filter-press'].includes(state_scenario); const unsupported = runtimeBinding || ['route-transition', 'route-history', 'route-bfcache', 'route-fail-open', 'locale-transition', 'continuous-loop', 'responsive-transition'].includes(state_scenario); const menuInteraction = state_scenario.startsWith('menu-open-') || touchPress; rows.push(obligation({ category, local_url, live_url, template, viewport, device_mode, preference, state_scenario: effectiveScenario, local_selector, live_selector, local_action_selector: menuInteraction ? '#header-menu-toggle' : local_selector, live_action_selector: menuInteraction ? '#header-menu-toggle' : live_selector, local_cleanup_selector: menuInteraction ? '[data-menu-close]' : local_selector, live_cleanup_selector: menuInteraction ? '#full-menu-close' : live_selector, local_pseudo: navInteraction && desktopNav && !touchPress ? '::after' : '', live_pseudo: navInteraction && desktopNav && !touchPress ? '::before' : '', action_protocol: effectiveProtocol, applicability: unsupported || explicitBlocker ? 'blocked' : 'applicable', blocker: explicitBlocker || (runtimeBinding ? 'runtime-selector-pair-item-binding-required' : unsupported ? 'runtime-template-correspondence-or-safe-action-not-yet-bound' : ''), mapping_confidence: runtimeBinding ? 'runtime-selector-pair-required' : 'explicit-selector-pair' }));
  }
  for (const width of breakpointWidths) for (const edge of [-1, 0, 1]) for (const preference of ['no-preference', 'reduce']) for (const device_mode of deviceModes(`${width + edge}x900`)) rows.push(obligation({ category: 'layout', local_url: '/en/', live_url: 'https://espaciohomedesign.com/en', template: 'home-breakpoint-edge', viewport: `${width + edge}x900`, device_mode, preference, state_scenario: `breakpoint-${width}-${edge}`, local_selector: 'body', live_selector: 'body', action_protocol: 'load;capture-top;full-page', mapping_confidence: 'explicit-selector-pair' }));
  return rows.sort((a, b) => a.obligation_id.localeCompare(b.obligation_id));
}
async function selfTest() {
  const rows = seedObligations(); const changed = { ...rows[0], viewport: '391x844' }; changed.contract_fingerprint = contract(changed);
  const everyRoute = routes.every(([local_url]) => canonicalViewports.every((viewport) => ['no-preference', 'reduce'].every((preference) => rows.some((row) => row.local_url === local_url && row.viewport === viewport && row.preference === preference))));
  const everyBreakpoint = breakpointWidths.every((width) => [-1, 0, 1].every((edge) => ['no-preference', 'reduce'].every((preference) => rows.some((row) => row.viewport === `${width + edge}x900` && row.preference === preference))));
  const blankExcluded = { ...rows.find((row) => row.applicability === excludedWithReason), obligation_id: '' };
  const candidates = csvParse(await readFile(candidatePath, 'utf8')).filter((row) => row.classification === 'A_M'); const mapped = csvParse(await readFile(candidateMapPath, 'utf8')); const targetSpecific = mapped.filter((row) => row.mapping_status === 'mapped-target-specific-runtime'); const pilot = rows.filter(isPilot); const menuContracts = rows.filter((row) => row.state_scenario.startsWith('menu-open-')); const focusContracts = rows.filter((row) => row.state_scenario === 'nav-focus'); const approvedExclusionIds = new Set(['lmp-966f75efd609ac6f168f8516', 'lmp-d4984d0a620282c08b8fb9b4']); const exclusions = rows.filter((row) => row.applicability === excludedWithReason); const requiredMenuStates = ['menu-open-overlay', 'menu-open-shutter-1', 'menu-open-shutter-2', 'menu-open-shutter-3', 'menu-open-shutter-4', 'menu-open-wrapper', 'menu-open-brand', 'menu-open-appointment', 'menu-open-close', 'menu-open-group-1', 'menu-open-option-1-1', 'menu-open-language-option-1']; const tests = [rows[0].contract_fingerprint !== changed.contract_fingerprint, everyRoute, everyBreakpoint, rows.every((row) => row.initial_status === 'blocked'), rows.some((row) => row.state_scenario === 'full-page-layout'), rows.some((row) => row.state_scenario === 'gallery-interrupt-cancel'), pilot.length === 9, candidates.length === 13232, new Set(mapped.map((row) => row.candidate_id)).size === 13232, targetSpecific.length === 44, !rows.some((row) => row.template === 'phase-a-target-specific'), requiredMenuStates.every((state) => rows.some((row) => row.state_scenario === state)), menuContracts.length > 0 && menuContracts.every((row) => row.local_action_selector === '#header-menu-toggle' && row.live_action_selector === '#header-menu-toggle' && row.local_cleanup_selector === '[data-menu-close]' && row.live_cleanup_selector === '#full-menu-close' && row.action_protocol.includes('press-close')), !rows.some((row) => /missing-local-menu/.test(row.blocker)), rows.filter((row) => row.state_scenario === 'menu-open-language-option-1').every((row) => row.live_selector === '#changeLangES'), rows.some((row) => row.state_scenario === 'nav-touch-press' && row.applicability === 'applicable'), rows.filter((row) => row.state_scenario === 'nav-top' && row.viewport === '390x844').every((row) => row.local_selector === '[data-site-header]' && row.live_selector === 'header'), !rows.some((row) => ['modal', 'carousel'].includes(row.state_scenario)), focusContracts.length > 0 && focusContracts.filter((row) => Number(row.viewport.split('x')[0]) >= 768).every((row) => row.local_pseudo === '::after' && row.live_pseudo === '::before'), exclusions.length === approvedExclusionIds.size && exclusions.every((row) => approvedExclusionIds.has(row.obligation_id) && row.exclusion_original_obligation_id === row.obligation_id && String(row.exclusion_reason || '').trim()), exclusionPolicyErrors(rows).length === 0];
  tests.push(exclusionPolicyErrors([...rows, blankExcluded]).length > 0); if (!tests.every(Boolean)) throw new Error(`Generator self-test failed: ${tests.filter(Boolean).length}/${tests.length}`); console.log(JSON.stringify({ passed: tests.length, base_obligations: rows.length, target_specific_obligations: 0, obligations: rows.length, pilot_obligations: pilot.length, phase_a_candidates: candidates.length, target_specific_candidates: targetSpecific.length, obligation_hash: sha(csvWrite(columns, rows)) }));
}
function localeContractSelfTest() {
  if (!routes.every(([local]) => local.startsWith('/en/'))) throw new Error('Comparator routes must use matching English locale');
}
function breakpointBindingSelfTest() {
  const rows = seedObligations().filter((row) => row.state_scenario.startsWith('breakpoint-'));
  if (!rows.length || rows.some((row) => row.mapping_confidence !== 'explicit-selector-pair')) throw new Error('Breakpoint body contracts require explicit 1:1 selector binding');
}
function menuSemanticSelfTest() {
  const rows = seedObligations();
  const close = rows.find((row) => row.state_scenario === 'menu-open-close');
  if (rows.some((row) => row.state_scenario === 'menu-open-language') || !rows.some((row) => row.state_scenario === 'menu-open-language-option-1') || rows.some((row) => row.state_scenario === 'menu-open-language-option-3') || rows.filter((row) => row.state_scenario === 'menu-open-language-option-2').some((row) => row.live_selector !== '#changeLangEN') || close?.local_selector !== '.menu-close__icon' || close?.live_selector !== '#full-menu-close-svg') throw new Error('Menu obligations must bind actual atomic GSAP targets');
}
async function main() {
  if (process.argv.includes('--self-test')) { localeContractSelfTest(); breakpointBindingSelfTest(); menuSemanticSelfTest(); return selfTest(); }
  const candidates = csvParse(await readFile(candidatePath, 'utf8')).filter((row) => row.classification === 'A_M'); const priorMap = new Map(csvParse(await readFile(candidateMapPath, 'utf8')).map((row) => [row.candidate_id, row]));
  const ids = new Set(candidates.map((row) => row.candidate_id));
  if (candidates.length !== 13232 || ids.size !== candidates.length) throw new Error(`A_M invariant failed: rows=${candidates.length};unique=${ids.size}`);
  const obligations = seedObligations(); const exclusionErrors = exclusionPolicyErrors(obligations); if (exclusionErrors.length) throw new Error(`Owner-approved exclusion policy failed: ${exclusionErrors.join('|')}`); const coverage = candidates.map((row) => { const mapped = priorMap.get(row.candidate_id); if (!mapped) throw new Error(`Phase A map missing candidate ${row.candidate_id}`); const target = mapped.source_target_signature || 'no-static-target'; const group = mapped.motion_group_id || mapped.equivalence_group_key || 'no-semantic-group'; return { candidate_id: row.candidate_id, source_kind: `phase-a:${row.system}:${row.motion_kind}; target=${target}; group=${group}`, source_anchor: row.source_anchor, obligation_id: '', mapping_id: `blocker-${sha(`${row.candidate_id}|${group}|${target}`).slice(0, 24)}`, mapping_kind: 'blocker', status: 'blocked', blocker: `missing exact pair contract: system=${row.system}; motion_kind=${row.motion_kind}; source_anchor=${row.source_anchor}; static_target=${target}; semantic_group=${group}; prior_status=${mapped.mapping_status}; local/live target/action runtime binding required`, contract_fingerprint: '', artifact_refs: 'docs/reports/research-espacio-layout-motion-parity.md' }; });
  await writeFile(obligationsPath, csvWrite(columns, obligations)); await writeFile(coveragePath, csvWrite(coverageColumns, coverage));
  const obligationHash = sha(await readFile(obligationsPath)); const coverageHash = sha(await readFile(coveragePath));
  const report = `# Pairwise layout và motion parity

## Layout parity

- Matrix: ${obligations.length} comparison contracts; 5 configured route pairs; 5 canonical viewports; 2 preferences; mouse/touch theo viewport.
- Full-page \`body\` và selector-pair header/nav/menu/main/hero/sections/gallery/filter/footer có contract riêng. Unmatched visible boxes là blocker per-side.

## Motion parity

- Runtime đo trigger, event order, duration, easing, frame state, cleanup và interrupt/cancel. Motion V3 chỉ là historical local-only evidence, không phải parity.

## Navbar parity

- Contract gồm top, menu-open, scroll; 390 và 1440 thuộc pilot. Pseudo hover local \`::after\`, live \`::before\` nằm trong fingerprint.

## Hover/focus parity

- Mouse hover/focus có contract riêng. Hover touch là blocker, không thực thi giả.

## Missing coverage

- ${coverage.length} A_M candidates map đúng một blocker có system, motion kind, source anchor và missing runtime pair binding.
- Project detail là blocker cụ thể: chưa có local slug đã biết và runtime template correspondence chưa verify.
- 1:1 chưa đạt khi còn bất cứ \`fail\` hoặc \`blocked\`.

## Chú thích thuật ngữ

- **Pairwise**: so sánh local và live cùng state.
- **Blocked**: thiếu điều kiện bắt buộc, không được claim parity.
- **Contract fingerprint**: hash điều kiện comparison.
`;
  await writeFile(reportPath, report); console.log(JSON.stringify({ obligations: obligations.length, coverage: coverage.length, obligationHash, coverageHash, pilot_obligations: obligations.filter(isPilot).length }, null, 2));
}
main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
