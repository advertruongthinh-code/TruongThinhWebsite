import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const reportDir = path.join(root, 'docs', 'reports');
const candidatesPath = path.join(reportDir, 'research-espacio-motion-candidates.csv');
const mapPath = path.join(reportDir, 'research-espacio-motion-candidate-map.csv');
const obligationsPath = path.join(reportDir, 'research-espacio-motion-obligations.csv');
const auditPath = path.join(reportDir, 'research-espacio-motion-audit.md');
const viewports = ['320x844', '390x844', '768x900', '1024x900', '1440x900'];
const preferences = ['no-preference', 'reduce'];
function probe(scenario_id, motion_family, route, template, target_selector, action_protocol, viewport_rule = 'all', lifecycle = 'load+state+reset') {
  return { scenario_id, motion_family, route, template, target_selector, action_protocol, viewport_rule, lifecycle, locales: ['vi', 'en'], preferences, sample_timings: 'before,0ms,125ms,375ms;repeat=2' };
}
function measuredEventCount(actionProtocol) {
  if (actionProtocol === 'none') return 0;
  if (!actionProtocol || /[;,|]/.test(actionProtocol)) return Number.NaN;
  return 1;
}
// Every action_protocol is one externally observable action. Setup belongs to lifecycle.
const LOCAL_PROBES = [
  probe('header-intro', 'header-intro', '/vi/', 'home', '[data-site-header]', 'load', 'all', 'load+two-raf+state+reset'),
  probe('header-tone', 'header-tone', '/vi/', 'home', '[data-site-header]', 'wheel:120'),
  probe('header-collapse', 'header-collapse', '/vi/', 'home', '[data-site-header]', 'wheel:420', 'all', 'load+precondition:pointer-bottom+state+reset'),
  probe('header-hide', 'header-hide', '/vi/', 'home', '[data-site-header]', 'wheel:800'),
  probe('header-show', 'header-show', '/vi/', 'home', '[data-site-header]', 'wheel:-600', 'all', 'load+precondition:wheel-800+state+reset'),
  probe('pointer-threshold', 'header-pointer-threshold', '/vi/', 'home', '[data-site-header]', 'mouse.move:screenY350', 'all', 'load+precondition:pointer-screenY500+state+cleanup:pointer-screenY500+reset'),
  probe('nav-underline-hover', 'nav-underline', '/vi/', 'home', '.desktop-nav a', 'hover', 'desktop'),
  probe('nav-underline-focus', 'nav-underline', '/vi/', 'home', '.desktop-nav a', 'focus', 'desktop'),
  probe('toggle-hover', 'toggle', '/vi/', 'home', '#header-menu-toggle', 'hover'),
  probe('toggle-focus', 'toggle', '/vi/', 'home', '#header-menu-toggle', 'focus'),
  probe('toggle-press', 'toggle', '/vi/', 'home', '#header-menu-toggle', 'press'),
  probe('menu-open', 'menu-open', '/vi/', 'home', '#site-menu', 'click-menu-toggle'),
  probe('menu-close', 'menu-close', '/vi/', 'home', '#site-menu', 'Escape', 'all', 'load+precondition:menu-open+state+reset'),
  probe('menu-link', 'menu-link', '/vi/', 'home', '#site-menu a[href]', 'click-first-noncurrent-link', 'all', 'load+precondition:menu-open+state+reset'),
  probe('menu-locale', 'menu-locale', '/vi/', 'home', '#site-menu [data-language-option]', 'click-opposite-locale', 'all', 'load+precondition:menu-open+state+reset'),
  probe('hero-finite', 'hero-finite-reduced', '/vi/', 'home', '#top', 'load', 'all', 'load+raf-samples+state+reset'),
  probe('hero-continuous', 'hero-continuous', '/vi/', 'home', '.marquee-line', 'read-animation-clock'),
  probe('portal', 'portal', '/vi/', 'home', '.service-portal', 'hover'),
  probe('story', 'story', '/vi/', 'home', '.story-link', 'hover'),
  probe('project', 'project', '/vi/', 'home', '.project-card', 'hover'),
  probe('gallery-controls', 'gallery-controls', '/vi/commercial/', 'commercial-detail', '[data-gallery-next]', 'press-next'),
  probe('gallery-drag', 'gallery-drag', '/vi/commercial/', 'commercial-detail', '[data-gallery-track]', 'mouse-drag'),
  probe('gallery-cancel', 'gallery-cancel', '/vi/commercial/', 'commercial-detail', '[data-gallery-track]', 'pointercancel', 'all', 'load+precondition:active-drag+state+cleanup'),
  probe('gallery-touch', 'gallery-touch-ignored', '/vi/commercial/', 'commercial-detail', '[data-gallery-track]', 'touch-tap'),
  probe('projects-filter', 'projects-filter-tile', '/vi/advertising-products/', 'advertising-products', '[data-project-filter]', 'press-filter'),
  probe('route-direct', 'route-direct', '/vi/', 'home', '.route-veil', 'direct-navigate'),
  probe('route-soft', 'route-soft', '/vi/', 'home', '.route-veil', 'click-route', 'all', 'load+precondition:mobile-menu-open-if-needed+state+reset'),
  probe('route-history', 'route-history', '/vi/', 'home', '.route-veil', 'history-back', 'all', 'load+precondition:direct-navigate+state+reset'),
  probe('route-bfcache', 'route-bfcache', '/vi/', 'home', '.route-veil', 'history-back', 'all', 'load+precondition:direct-navigate+pageshow+state+reset'),
  probe('route-fail-open', 'route-fail-open', '/vi/', 'home', '.route-veil', 'click-missing-route'),
  probe('media', 'media-autoplay', '/vi/', 'home', 'video, iframe', 'read-media-state'),
  probe('focus-order', 'focus-order', '/vi/', 'home', '[data-site-header]', 'Tab', 'all', 'load+precondition:focus-body+state+reset'),
];
const probeIds = new Set(LOCAL_PROBES.map((item) => item.scenario_id));
const liveUrls = new Set([
  'https://espaciohomedesign.com/en',
  'https://espaciohomedesign.com/en/kitchens',
  'https://espaciohomedesign.com/en/interior-design',
  'https://espaciohomedesign.com/en/projects',
  'https://espaciohomedesign.com/en/services',
  'https://espaciohomedesign.com/en/showrooms',
  'https://espaciohomedesign.com/en/news/80-anniversary',
  'https://espaciohomedesign.com/en/cocinart',
]);

function sha(value) { return createHash('sha256').update(value).digest('hex'); }
function slug(value) { return value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase(); }
function csvParse(text) {
  const rows = []; let row = []; let field = ''; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]; const next = text[i + 1];
    if (quoted) { if (ch === '"' && next === '"') { field += '"'; i += 1; } else if (ch === '"') quoted = false; else field += ch; continue; }
    if (ch === '"') { quoted = true; continue; }
    if (ch === ',') { row.push(field); field = ''; continue; }
    if (ch === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; continue; }
    field += ch;
  }
  if (field || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  const [header, ...body] = rows.filter((r) => r.length && r.some(Boolean));
  return body.map((r) => Object.fromEntries(header.map((name, index) => [name, r[index] ?? ''])));
}
function csvEscape(value) { const text = String(value ?? ''); return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
function csvWrite(columns, rows) { return `${columns.join(',')}\n${rows.map((row) => columns.map((key) => csvEscape(row[key])).join(',')).join('\n')}\n`; }
function sourceHash(candidate) {
  const parts = candidate.identity_basis.split('|');
  return parts.find((part) => /^[a-f0-9]{64}$/i.test(part)) ?? sha(candidate.identity_basis);
}
function localRoute(candidate) {
  const text = `${candidate.resource}|${candidate.source_anchor}`;
  if (text.includes('residential/')) return { route: '/vi/residential/', template: 'residential-detail', locale: 'vi' };
  if (text.includes('commercial/')) return { route: '/vi/commercial/', template: 'commercial-detail', locale: 'vi' };
  if (text.includes('advertising-products/')) return { route: '/vi/advertising-products/', template: 'advertising-products', locale: 'vi' };
  if (text.includes('about/')) return { route: '/vi/about/', template: 'about', locale: 'vi' };
  if (text.includes('detail.')) return { route: '/vi/projects/:slug/', template: 'project-detail', locale: 'vi' };
  return { route: '/vi/', template: 'home', locale: 'vi' };
}
function archiveCategory(candidate) {
  const resource = candidate.resource.toLowerCase();
  if (resource.includes('/css/')) return 'shared-stylesheet';
  if (resource.includes('/js/')) return 'shared-script';
  if (resource.includes('/api.')) return 'api-payload';
  if (resource.includes('/en/')) return `archive-route-${slug(resource.split('/en/')[1].split(/[?#]/)[0] || 'home')}`;
  return 'archive-resource';
}
function staticSignature(candidate, template) {
  const anchor = candidate.source_anchor.replace(/:L\d+(?::\d+)?$/, '');
  return sha([candidate.motion_kind, candidate.reason, candidate.resource, sourceHash(candidate), template, anchor].join('|'));
}
function groupKey(candidate) {
  const local = candidate.system === 'truong-thinh';
  const location = local ? localRoute(candidate) : { template: archiveCategory(candidate) };
  const target = sourceTargetSignature(candidate);
  const sourceIdentity = target || (local ? `${candidate.resource}|${sourceHash(candidate)}` : `${candidate.content_variant_id}|${sourceHash(candidate)}|${staticSignature(candidate, location.template)}`);
  return [candidate.system, candidate.motion_kind, sourceIdentity, location.template].join('|');
}
function groupFor(candidate) { return `mg-${sha(groupKey(candidate)).slice(0, 24)}`; }
function sourceLine(candidate) { return Number(candidate.source_anchor.match(/:L(\d+)/)?.[1] ?? 0); }
function sourceTargetSignature(candidate) {
  const resource = candidate.resource.replaceAll('\\', '/');
  const signature = (target) => `${target}:${sourceHash(candidate).slice(0, 16)}`;
  if (resource.endsWith('motion.js')) {
    if (candidate.motion_kind.includes('scroll')) return signature('js-target:site-header');
    if (candidate.motion_kind === 'barba') return signature('js-target:route-veil');
    if (candidate.motion_kind === 'media-playback') return signature('js-target:media');
  }
  if (resource.endsWith('detail.js')) return signature(candidate.motion_kind.includes('scroll') ? 'js-target:gallery-track' : 'js-target:gallery-next');
  if (resource.endsWith('products.js')) return signature('js-target:project-filter');
  if (!resource.endsWith('style.css')) return '';
  const line = sourceLine(candidate);
  const target = line >= 267 && line <= 330 ? 'desktop-nav' : line >= 160 && line <= 260 ? 'site-header' : line >= 946 && line <= 990 ? 'motion-toggle' : line >= 1108 && line <= 1300 ? 'service-portal' : line >= 1387 && line <= 1420 ? 'story-link' : line >= 1440 && line <= 1520 ? 'project-card' : line >= 1599 && line <= 1630 ? 'marquee-line' : '';
  return target ? signature(`css-target:${target}`) : '';
}
function probesFor(candidate) {
  const resource = candidate.resource.replaceAll('\\', '/'); const kind = candidate.motion_kind;
  if (resource.endsWith('motion.js') && kind.includes('scroll')) return ['header-collapse'];
  if (resource.endsWith('motion.js') && kind === 'barba') return ['route-soft'];
  if (resource.endsWith('motion.js') && kind === 'media-playback') return ['media'];
  if (resource.endsWith('style.css')) {
    const target = sourceTargetSignature(candidate).split(':')[1];
    if (target === 'desktop-nav') return ['nav-underline-hover', 'nav-underline-focus'];
    if (target === 'site-header') return ['header-collapse'];
    if (target === 'motion-toggle') return ['toggle-hover', 'toggle-focus', 'toggle-press'];
    if (target === 'service-portal') return ['portal'];
    if (target === 'story-link') return ['story'];
    if (target === 'project-card') return ['project'];
    if (target === 'marquee-line' && kind === 'css-animation') return ['hero-continuous'];
  }
  if (resource.endsWith('detail.js') && kind.includes('scroll')) return ['gallery-drag', 'gallery-cancel'];
  if (resource.endsWith('detail.js')) return ['gallery-controls'];
  if (resource.endsWith('products.js')) return ['projects-filter'];
  // A file-wide inline hook does not prove a hero/home runtime target.
  if (resource.endsWith('index.html') && kind === 'inline-motion-hook') return [];
  return [];
}
function groupSpec(candidates) {
  const representative = candidates.slice().sort((a, b) => a.candidate_id.localeCompare(b.candidate_id))[0];
  const system = representative.system;
  const local = system === 'truong-thinh';
  const location = local ? localRoute(representative) : { route: 'https://espaciohomedesign.com/en', template: 'espacio-live-home-snapshot', locale: 'en' };
  return { system, representative, location, group: groupFor(representative) };
}
function contractFingerprint(row) {
  return `contract:${sha([
    row.motion_group_id, row.system, row.exact_url_or_route, row.template, row.locale, row.viewport, row.orientation,
    row.preference, row.lifecycle, row.scenario_id, row.target_selector, row.action_protocol,
    row.sample_timings, row.obligation_type, row.source_fingerprint,
  ].join('|'))}`;
}
function withContract(row) {
  const contract_fingerprint = contractFingerprint(row);
  return { ...row, contract_fingerprint, obligation_id: `obl-${sha(contract_fingerprint).slice(0, 24)}` };
}
function stableGroupProof(members, representative) {
  const hashes = [...new Set(members.map(sourceHash))].sort();
  return {
    source_hashes: hashes.join('|'),
    html_hook_signature: staticSignature(representative, representative.system === 'truong-thinh' ? localRoute(representative).template : archiveCategory(representative)),
    loaded_module_signature: `static-unverified:${sha(`${representative.resource}|${sourceHash(representative)}`).slice(0, 24)}`,
    relevant_css_signature: staticSignature(representative, representative.system === 'truong-thinh' ? localRoute(representative).template : archiveCategory(representative)),
    equivalence_status: 'not-claimed',
  };
}
async function replacePhaseBSection(text, section) {
  const start = '<!-- motion-audit-phase-b:start -->'; const end = '<!-- motion-audit-phase-b:end -->';
  const block = `${start}\n${section}\n${end}`;
  const expression = new RegExp(`${start}[\\s\\S]*?${end}`, 'm');
  return expression.test(text) ? text.replace(expression, block) : `${text.trimEnd()}\n\n${block}\n`;
}
function selfTest() {
  const hash = 'a'.repeat(64);
  const cssA = { system: 'truong-thinh', resource: 'src/site/style.css', source_anchor: 'src/site/style.css:L280', motion_kind: 'css-transition', reason: 'test', identity_basis: `fixture|${hash}` };
  const cssB = { ...cssA, source_anchor: 'src/site/style.css:L300' };
  const inline = { ...cssA, resource: 'src/site/index.html', source_anchor: 'src/site/index.html:L42', motion_kind: 'inline-motion-hook' };
  const script = { ...cssA, resource: 'src/site/motion.js', source_anchor: 'src/site/motion.js:L12', motion_kind: 'barba' };
  const results = [
    sourceTargetSignature(cssA) === sourceTargetSignature(cssB),
    groupFor(cssA) === groupFor(cssB),
    probesFor(inline).length === 0,
    sourceTargetSignature(script).startsWith('js-target:route-veil:'),
    LOCAL_PROBES.every((item) => measuredEventCount(item.action_protocol) === 1),
    ['wheel:420', 'click-route', 'Tab', 'mouse.move:screenY350'].every((protocol) => measuredEventCount(protocol) === 1),
    LOCAL_PROBES.find((item) => item.scenario_id === 'header-collapse').lifecycle.includes('precondition:pointer-bottom'),
    LOCAL_PROBES.find((item) => item.scenario_id === 'route-soft').lifecycle.includes('precondition:mobile-menu-open-if-needed'),
    LOCAL_PROBES.find((item) => item.scenario_id === 'focus-order').lifecycle.includes('precondition:focus-body'),
    LOCAL_PROBES.find((item) => item.scenario_id === 'pointer-threshold').lifecycle.includes('cleanup:pointer-screenY500'),
  ];
  if (!results.every(Boolean)) throw new Error(`Generator self-test failed: ${results.filter(Boolean).length}/${results.length}`);
  console.log(JSON.stringify({ passed: results.length, total: results.length }));
}

async function main() {
  const input = await readFile(candidatesPath, 'utf8');
  const candidates = csvParse(input);
  const measured = candidates.filter((row) => row.classification === 'A_M');
  const totals = Object.fromEntries(['A_M', 'A_I', 'A_X', 'A_F'].map((key) => [key, candidates.filter((row) => row.classification === key).length]));
  const candidateIds = new Set(candidates.map((row) => row.candidate_id));
  if (candidates.length !== 28215 || candidateIds.size !== 28215 || totals.A_M !== 13232 || totals.A_I !== 14962 || totals.A_X !== 21 || totals.A_F !== 0) throw new Error(`Phase A candidate invariant failed: ${JSON.stringify({ rows: candidates.length, unique: candidateIds.size, ...totals })}`);
  const sortedIds = (values) => [...new Set(values)].sort();
  const grouped = new Map();
  for (const candidate of measured) { const group = groupFor(candidate); const members = grouped.get(group) ?? []; members.push(candidate); grouped.set(group, members); }
  const groupMembers = new Map([...grouped].map(([group, members]) => [group, sortedIds(members.map((member) => member.candidate_id))]));
  if ([...groupMembers.values()].reduce((sum, members) => sum + members.length, 0) !== measured.length) throw new Error('Candidate group member accounting failed');
  for (const members of grouped.values()) {
    const signatures = new Set(members.map(sourceTargetSignature).filter(Boolean));
    if (signatures.size > 1) throw new Error(`Non-empty source target signature group collision: ${[...signatures].join('|')}`);
  }

  const candidateProbes = new Map(measured.map((candidate) => [candidate.candidate_id, candidate.system === 'truong-thinh' ? probesFor(candidate) : []]));
  for (const [candidateId, scenarioIds] of candidateProbes) if (scenarioIds.some((id) => !probeIds.has(id))) throw new Error(`Unknown probe reference from ${candidateId}: ${scenarioIds.join('|')}`);
  const scenarioCandidateIds = new Map(LOCAL_PROBES.map((item) => [item.scenario_id, new Set()]));
  for (const [candidateId, scenarioIds] of candidateProbes) for (const scenarioId of scenarioIds) scenarioCandidateIds.get(scenarioId).add(candidateId);

  const obligations = [];
  const scenarioObligations = new Map();
  for (const item of LOCAL_PROBES) {
    const memberIds = sortedIds(scenarioCandidateIds.get(item.scenario_id));
    for (const locale of item.locales) for (const viewport of viewports.filter((value) => item.viewport_rule === 'all' || Number(value.split('x')[0]) >= 1024)) for (const preference of item.preferences) {
      const exact_url_or_route = locale === 'en' ? item.route.replace('/vi/', '/en/') : item.route;
      const row = withContract({ motion_group_id: `probe-${item.scenario_id}`, system: 'truong-thinh', exact_url_or_route, template: item.template, locale, viewport, orientation: 'portrait', input_device_state: item.action_protocol, preference, lifecycle: item.lifecycle, candidate_count: memberIds.length, candidate_member_ids: memberIds.join('|'), representative_candidate_id: memberIds[0] ?? '', source_fingerprint: memberIds.length ? `candidate-set:${sha(memberIds.join('|'))}` : 'runtime-DOM-required', applicability: 'applicable-local', applicability_blocker: '', scenario_id: item.scenario_id, motion_family: item.motion_family, target_selector: item.target_selector, action_protocol: item.action_protocol, sample_timings: item.sample_timings, obligation_type: 'runtime-scenario' });
      obligations.push(row); const list = scenarioObligations.get(item.scenario_id) ?? []; list.push(row.obligation_id); scenarioObligations.set(item.scenario_id, list);
    }
  }

  const groupObligations = new Map();
  for (const [group, members] of [...grouped].sort(([left], [right]) => left.localeCompare(right))) {
    const representative = members.slice().sort((left, right) => left.candidate_id.localeCompare(right.candidate_id))[0];
    const scenarios = candidateProbes.get(representative.candidate_id);
    if (members.some((member) => candidateProbes.get(member.candidate_id).join('|') !== scenarios.join('|'))) throw new Error(`Divergent probe contract inside group ${group}`);
    if (scenarios.length) continue;
    const memberIds = groupMembers.get(group); const local = representative.system === 'truong-thinh';
    const location = local ? localRoute(representative) : { route: 'https://espaciohomedesign.com/en', template: archiveCategory(representative), locale: 'en' };
    const row = withContract({ motion_group_id: group, system: representative.system, exact_url_or_route: location.route, template: location.template, locale: location.locale, viewport: 'n/a', orientation: 'n/a', input_device_state: 'not-applicable', preference: 'not-applicable', lifecycle: 'static-binding-blocker', candidate_count: memberIds.length, candidate_member_ids: memberIds.join('|'), representative_candidate_id: representative.candidate_id, source_fingerprint: stableGroupProof(members, representative).source_hashes, applicability: local ? 'local-static-binding-blocker' : 'archive-static-binding-blocker', applicability_blocker: local ? 'No curated target-specific probe matches this local source target signature.' : 'Archive static candidate cannot be bound to a current authorized live DOM/module/CSS member without matching source hash, hook signature, module signature, CSS signature, and representative trace.', scenario_id: '', motion_family: representative.motion_kind, target_selector: '', action_protocol: 'none', sample_timings: 'none', obligation_type: 'static-binding-blocker' });
    obligations.push(row); groupObligations.set(group, [row.obligation_id]);
  }
  for (const url of [...liveUrls].sort()) for (const viewport of viewports) for (const preference of preferences) {
    const route = new URL(url).pathname;
    obligations.push(withContract({ motion_group_id: `live-${sha(url).slice(0, 16)}`, system: 'espacio-live', exact_url_or_route: url, template: `live-${slug(route || 'home')}`, locale: 'en', viewport, orientation: 'portrait', input_device_state: 'not-applicable', preference, lifecycle: 'not-run: header snapshot only', candidate_count: 0, candidate_member_ids: '', representative_candidate_id: '', source_fingerprint: 'not-applicable:no route-specific live DOM/CSS/module fingerprint captured', applicability: 'live-snapshot-blocker', applicability_blocker: 'Previous observation was a header snapshot only; it is not target-specific motion or reduced-motion evidence.', scenario_id: 'live-snapshot-only', motion_family: 'unbound-live-snapshot', target_selector: '', action_protocol: 'none', sample_timings: 'none', obligation_type: 'live-snapshot-blocker' }));
  }

  const obligationIds = new Set(obligations.map((row) => row.obligation_id));
  if (obligationIds.size !== obligations.length) throw new Error('Generated obligation uniqueness invariant failed');
  if (obligations.some((row) => row.contract_fingerprint !== contractFingerprint(row))) throw new Error('Generated contract fingerprint invariant failed');
  if (LOCAL_PROBES.some((item) => measuredEventCount(item.action_protocol) !== 1)) throw new Error('Atomic action protocol invariant failed');

  const mapRows = measured.slice().sort((left, right) => left.candidate_id.localeCompare(right.candidate_id)).map((candidate) => {
    const group = groupFor(candidate); const members = grouped.get(group); const scenarios = candidateProbes.get(candidate.candidate_id);
    const ids = scenarios.length ? scenarios.flatMap((scenarioId) => scenarioObligations.get(scenarioId) ?? []) : groupObligations.get(group) ?? [];
    if (!ids.length || ids.some((id) => !obligationIds.has(id))) throw new Error(`Dangling candidate obligation reference: ${candidate.candidate_id}`);
    const memberIds = groupMembers.get(group); const local = candidate.system === 'truong-thinh';
    return { candidate_id: candidate.candidate_id, system: candidate.system, motion_kind: candidate.motion_kind, source_anchor: candidate.source_anchor, source_hash: sourceHash(candidate), source_target_signature: sourceTargetSignature(candidate), equivalence_group_key: groupKey(candidate), motion_group_id: scenarios.length ? `probe-${scenarios.join('+')}` : group, representative_obligation_id: ids[0], obligation_ids: ids.join('|'), mapping_status: scenarios.length ? 'mapped-target-specific-runtime' : (local ? 'local-binding-blocker' : 'archive-binding-blocker'), applicability: scenarios.length ? 'applicable-local' : (local ? 'local-static-binding-blocker' : 'archive-static-binding-blocker'), applicability_blocker: scenarios.length ? '' : (local ? 'No curated target-specific probe matches this local source target signature.' : 'Archive static binding blocker; no matching current live member proof.'), represented_candidate_count: memberIds.length, represented_candidate_ids: memberIds.join('|'), proof_artifact: '', ...stableGroupProof(members, candidate) };
  });
  if (mapRows.length !== measured.length || new Set(mapRows.map((row) => row.candidate_id)).size !== measured.length) throw new Error('Candidate map coverage invariant failed');
  const mappedWithoutTargetSignature = mapRows.filter((row) => row.mapping_status === 'mapped-target-specific-runtime' && !row.source_target_signature).length;
  if (mappedWithoutTargetSignature) throw new Error(`Mapped runtime candidates require a non-empty source target signature: ${mappedWithoutTargetSignature}`);
  const mappedByObligation = new Map(obligations.map((row) => [row.obligation_id, new Set()]));
  for (const row of mapRows) for (const id of row.obligation_ids.split('|')) mappedByObligation.get(id)?.add(row.candidate_id);
  for (const obligation of obligations) {
    const expected = obligation.candidate_member_ids ? obligation.candidate_member_ids.split('|') : [];
    const actual = sortedIds(mappedByObligation.get(obligation.obligation_id));
    if (expected.join('|') !== actual.join('|') || Number(obligation.candidate_count) !== expected.length) throw new Error(`Candidate/member accounting failed for ${obligation.obligation_id}`);
  }
  for (const row of mapRows) {
    const members = row.represented_candidate_ids.split('|');
    if (Number(row.represented_candidate_count) !== members.length || !members.includes(row.candidate_id)) throw new Error(`Map member accounting failed for ${row.candidate_id}`);
  }

  const mapColumns = ['candidate_id','system','motion_kind','source_anchor','source_hash','source_target_signature','equivalence_group_key','motion_group_id','representative_obligation_id','obligation_ids','mapping_status','applicability','applicability_blocker','represented_candidate_count','represented_candidate_ids','proof_artifact','source_hashes','html_hook_signature','loaded_module_signature','relevant_css_signature','equivalence_status'];
  const obligationColumns = ['obligation_id','contract_fingerprint','motion_group_id','system','exact_url_or_route','template','locale','viewport','orientation','input_device_state','preference','lifecycle','candidate_count','candidate_member_ids','representative_candidate_id','source_fingerprint','applicability','applicability_blocker','scenario_id','motion_family','target_selector','action_protocol','sample_timings','obligation_type'];
  await writeFile(mapPath, csvWrite(mapColumns, mapRows));
  await writeFile(obligationsPath, csvWrite(obligationColumns, obligations.sort((left, right) => left.obligation_id.localeCompare(right.obligation_id))));
  const localStaticCandidates = mapRows.filter((row) => row.system === 'truong-thinh' && row.mapping_status === 'local-binding-blocker').length;
  console.log(JSON.stringify({ candidateLedgerHash: sha(input), candidateMapHash: sha(await readFile(mapPath)), obligationsHash: sha(await readFile(obligationsPath)), a_m: mapRows.length, groups: grouped.size, obligations: obligations.length, mappedWithoutTargetSignature, localRuntimeObligations: obligations.filter((row) => row.system === 'truong-thinh' && row.obligation_type === 'runtime-scenario').length, localStaticBindingBlockers: obligations.filter((row) => row.system === 'truong-thinh' && row.obligation_type === 'static-binding-blocker').length, localStaticCandidates, archiveBindingBlockers: obligations.filter((row) => row.system === 'espacio-archive').length, liveSnapshotBlockers: obligations.filter((row) => row.system === 'espacio-live' && row.obligation_type === 'live-snapshot-blocker').length }, null, 2));
}

if (process.argv.includes('--self-test')) selfTest();
else main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
