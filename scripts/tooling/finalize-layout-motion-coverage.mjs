import { createWriteStream } from 'node:fs';
import { access, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha, csvParse, csvEscape } from './layout-motion-io.mjs';
import { approvedExclusions, excludedWithReason, exclusionForOrigin, exclusionPolicyErrors, isExcludedRuntimeRow, notRunOwnerApprovedExclusion } from './layout-motion-parity-exclusions.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const reports = path.join(root, 'docs', 'reports');
const paths = {
  obligations: path.join(reports, 'research-espacio-layout-motion-obligations.csv'),
  runtime: path.join(reports, 'research-espacio-layout-motion-runtime.csv'),
  candidates: path.join(reports, 'research-espacio-motion-candidates.csv'),
  candidateMap: path.join(reports, 'research-espacio-motion-candidate-map.csv'),
  coverage: path.join(reports, 'research-espacio-layout-motion-coverage.csv'),
  report: path.join(reports, 'research-espacio-layout-motion-parity.md'),
  computerUse: path.join(root, 'research', 'reference-site', 'runtime-evidence', 'layout-motion-parity', 'computer-use-review.json'),
};
const obligationColumns = ['obligation_id', 'category', 'local_url', 'live_url', 'template', 'viewport', 'device_mode', 'preference', 'state_scenario', 'local_selector', 'live_selector', 'local_action_selector', 'live_action_selector', 'local_cleanup_selector', 'live_cleanup_selector', 'local_pseudo', 'live_pseudo', 'action_protocol', 'sample_timings', 'geometry_threshold_px', 'timing_threshold_frames', 'contract_fingerprint', 'applicability', 'exclusion_original_obligation_id', 'exclusion_reason', 'blocker', 'mapping_confidence', 'initial_status'];
const coverageColumns = ['candidate_id', 'source_kind', 'source_anchor', 'obligation_id', 'mapping_id', 'mapping_kind', 'status', 'blocker', 'contract_fingerprint', 'artifact_refs'];
function contractFingerprint(row) { const values = obligationColumns.filter((key) => !['obligation_id', 'contract_fingerprint', 'blocker', 'initial_status', 'exclusion_original_obligation_id', 'exclusion_reason'].includes(key)).map((key) => row[key] ?? ''); if (row.applicability === excludedWithReason) values.push('owner-approved-exclusion', row.exclusion_original_obligation_id ?? '', row.exclusion_reason ?? ''); return `contract:${sha(values.join('|'))}`; }
function safeArtifact(relative) { const resolved = path.resolve(root, relative); if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error(`Artifact outside workspace: ${relative}`); return resolved; }
function mappingDescriptor(row) { try { const value = JSON.parse(row.runtime_discovered_mapping || ''); return value && !Array.isArray(value) && typeof value.artifact === 'string' && Number.isInteger(value.count) && value.count >= 0 && /^[a-f0-9]{64}$/i.test(value.sha256 || '') ? value : null; } catch { return null; } }
function isStaticBlockerWithoutArtifact(row, obligation) { return row.status === 'blocked' && obligation?.applicability === 'blocked' && !String(row.artifact_refs || '').trim() && !mappingDescriptor(row); }
function phaseABase(candidates, candidateMap) { const map = new Map(candidateMap.map((row) => [row.candidate_id, row])); const rows = candidates.filter((row) => row.classification === 'A_M').map((row) => { const prior = map.get(row.candidate_id); if (!prior) throw new Error(`Missing Phase-A candidate map: ${row.candidate_id}`); const target = prior.source_target_signature || 'no-static-target'; const group = prior.motion_group_id || prior.equivalence_group_key || 'no-semantic-group'; return { candidate_id: row.candidate_id, source_kind: `phase-a:${row.system}:${row.motion_kind}; target=${target}; group=${group}`, source_anchor: row.source_anchor, obligation_id: '', mapping_id: `blocker-${sha(`${row.candidate_id}|${group}|${target}`).slice(0, 24)}`, mapping_kind: 'blocker', status: 'blocked', blocker: `missing exact pair contract: system=${row.system}; motion_kind=${row.motion_kind}; source_anchor=${row.source_anchor}; static_target=${target}; semantic_group=${group}; prior_status=${prior.mapping_status}; local/live target/action runtime binding required`, contract_fingerprint: '', artifact_refs: '' }; }); if (rows.length !== 13232 || new Set(rows.map((row) => row.candidate_id)).size !== rows.length) throw new Error(`Phase-A invariant failed: ${rows.length}`); return rows; }
function validateRuntimeSet(obligations, runtime) { const obligationById = new Map(obligations.map((row) => [row.obligation_id, row])); if (obligationById.size !== obligations.length) throw new Error('Duplicate obligation ID'); const seen = new Set(); const errors = []; const runnerHashes = new Set(); const schemaHashes = new Set(); for (const row of runtime) { if (!row.obligation_id || seen.has(row.obligation_id)) errors.push(`duplicate runtime ID ${row.obligation_id}`); seen.add(row.obligation_id); const obligation = obligationById.get(row.obligation_id); if (!obligation) errors.push(`runtime ID outside obligations ${row.obligation_id}`); else if (row.contract_fingerprint !== obligation.contract_fingerprint || row.contract_fingerprint !== contractFingerprint(obligation)) errors.push(`contract mismatch ${row.obligation_id}`); if (!['pass', 'fail', 'blocked', excludedWithReason].includes(row.status)) errors.push(`invalid runtime status ${row.obligation_id}`); if (row.status === excludedWithReason && !isExcludedRuntimeRow(row, obligation)) errors.push(`invalid owner-approved excluded runtime ${row.obligation_id}`); if (row.status !== excludedWithReason && obligation?.applicability === excludedWithReason) errors.push(`excluded obligation was measured ${row.obligation_id}`); if (!row.runner_hash || !row.schema_hash) errors.push(`blank runner/schema hash ${row.obligation_id}`); else { runnerHashes.add(row.runner_hash); schemaHashes.add(row.schema_hash); } if (!Number.isFinite(Date.parse(row.timestamp || ''))) errors.push(`invalid timestamp ${row.obligation_id}`); if (['pass', 'fail'].includes(row.status) && (!row.dom_fingerprint_local || !row.dom_fingerprint_live)) errors.push(`blank measured DOM fingerprint ${row.obligation_id}`); }
  if (runnerHashes.size !== 1) errors.push(`mixed runner hashes: ${runnerHashes.size}`); if (schemaHashes.size !== 1) errors.push(`mixed schema hashes: ${schemaHashes.size}`); for (const id of obligationById.keys()) if (!seen.has(id)) errors.push(`missing runtime ID ${id}`); return { ok: errors.length === 0, errors, obligationById };
}
function hasConnectionRefused(row) { return /ERR_CONNECTION_REFUSED/i.test([row.blocker, row.expected_live, row.actual_local, row.style_delta].join('\n')); }
function finalGate(runtime, coverage, integrityErrors, computerUse) { const summary = Array.isArray(coverage) ? coverageSummaryFromRows(coverage) : coverage; const refused = runtime.filter(hasConnectionRefused); const nonPassRuntime = runtime.filter((row) => !['pass', excludedWithReason].includes(row.status)); const computerUseVerified = computerUse?.verified === true; return { ok: !integrityErrors.length && !refused.length && !nonPassRuntime.length && summary.nonPass === 0 && computerUseVerified, refused: refused.length, runtime_non_pass: nonPassRuntime.length, excluded: runtime.filter((row) => row.status === excludedWithReason).length, coverage_non_pass: summary.nonPass, integrity_errors: integrityErrors.length, computer_use_verified: computerUseVerified };
}
async function readComputerUseEvidence() {
  try {
    const content = await readFile(paths.computerUse, 'utf8'); const evidence = JSON.parse(content); const observations = Array.isArray(evidence.observations) ? evidence.observations : [];
    if (evidence.schema_version !== 1 || evidence.tool !== 'computer-use' || evidence.owner_approved !== true || evidence.status !== 'pass' || !observations.length) return { verified: false, status: evidence.status || 'invalid', blocker: 'Computer Use evidence schema, approval, status hoặc observations không hợp lệ.' };
    for (const observation of observations) {
      if (!observation.route || !observation.viewport || !observation.state || !['pass', 'fail'].includes(observation.result) || observation.result !== 'pass') return { verified: false, status: 'invalid', blocker: 'Computer Use observation thiếu route, viewport, state hoặc có kết quả non-pass.' };
      if (!observation.artifact?.path || !/^[a-f0-9]{64}$/i.test(observation.artifact.sha256 || '')) return { verified: false, status: 'invalid', blocker: 'Computer Use observation thiếu artifact path hoặc SHA-256.' };
      const artifact = await readFile(safeArtifact(observation.artifact.path)); if (sha(artifact) !== observation.artifact.sha256) return { verified: false, status: 'invalid', blocker: `Computer Use artifact hash mismatch: ${observation.artifact.path}` };
    }
    return { verified: true, status: 'pass', blocker: '', evidence_path: path.relative(root, paths.computerUse).replaceAll('\\', '/'), observations: observations.length };
  } catch (error) { return { verified: false, status: 'not-run', blocker: error.code === 'ENOENT' ? 'Computer Use chưa chạy; dừng để owner duyệt trước khi thực hiện.' : `Computer Use evidence invalid: ${error.message}` }; }
}
async function validateRuntimeArtifacts(row, obligation) {
  const refs = String(row.artifact_refs || '').split('|').filter(Boolean); const descriptor = mappingDescriptor(row);
  if (row.status === excludedWithReason && isExcludedRuntimeRow(row, obligation)) return { mappings: [], refs: [] };
  if (isStaticBlockerWithoutArtifact(row, obligation)) return { mappings: [], refs: [] };
  if (row.status === 'blocked' && row.pixel_comparison === 'not-run-applicability-blocked') return { mappings: [], refs: [] };
  if (!refs.length) throw new Error(`Missing artifact refs: ${row.obligation_id}`); await Promise.all(refs.map((reference) => access(safeArtifact(reference))));
  if (row.status === 'blocked' && !descriptor) { const blocked = refs.find((reference) => /\/run\d+-blocked\.json$/.test(reference)); if (!blocked) throw new Error(`Missing runtime blocker artifact: ${row.obligation_id}`); return { mappings: [], refs: [blocked] }; }
  const pairwise = refs.find((reference) => reference.endsWith('/pairwise.json')); const mapping = refs.find((reference) => reference.endsWith('/runtime-mapping.json'));
  if (!pairwise || !mapping || !descriptor || descriptor.artifact !== mapping) throw new Error(`Missing compact pairwise/mapping refs: ${row.obligation_id}`); const content = await readFile(safeArtifact(mapping), 'utf8'); const parsed = JSON.parse(content); if (sha(content) !== descriptor.sha256 || !Array.isArray(parsed.mappings) || parsed.mappings.length !== descriptor.count) throw new Error(`Invalid runtime mapping descriptor: ${row.obligation_id}`); return { mappings: parsed.mappings, refs: [mapping, pairwise] };
}
async function writeChunk(stream, chunk) { if (!stream.write(chunk)) await new Promise((resolve, reject) => { const onDrain = () => { stream.off('error', onError); resolve(); }; const onError = (error) => { stream.off('drain', onDrain); reject(error); }; stream.once('drain', onDrain); stream.once('error', onError); }); }
async function* coverageRows(baseRows, runtime, obligationById) { const baseIds = new Set(); for (const row of baseRows) { if (!row.candidate_id || baseIds.has(row.candidate_id)) throw new Error(`Duplicate base coverage candidate: ${row.candidate_id}`); baseIds.add(row.candidate_id); yield row; } for (const result of runtime) { const artifact = await validateRuntimeArtifacts(result, obligationById.get(result.obligation_id)); const mappingIds = new Set(); for (const item of artifact.mappings) { if (!item.candidate_id || baseIds.has(item.candidate_id) || mappingIds.has(item.candidate_id)) throw new Error(`Duplicate runtime coverage candidate: ${item.candidate_id}`); mappingIds.add(item.candidate_id); yield { candidate_id: item.candidate_id, source_kind: 'runtime-layout', source_anchor: item.source_anchor, obligation_id: item.mapping_kind === 'obligation' ? result.obligation_id : '', mapping_id: item.mapping_id, mapping_kind: item.mapping_kind, status: item.mapping_kind === 'blocker' ? 'blocked' : result.status, blocker: item.blocker || result.blocker, contract_fingerprint: result.contract_fingerprint, artifact_refs: compactArtifactRefs(artifact.refs) }; } } }
function coverageBlockerClass(row) { const match = String(row.blocker || '').match(/system=([^;]+); motion_kind=([^;]+)/); return match ? `phase-a/${match[1]}/${match[2]}` : `${row.source_kind || 'unknown'}/${row.mapping_kind || 'unknown'}`; }
function coverageSummary() { return { rows: 0, nonPass: 0, blockerClasses: new Map() }; }
function addCoverageSummary(summary, row) { summary.rows += 1; if (row.status !== 'pass' || row.mapping_kind === 'blocker') { summary.nonPass += 1; const key = coverageBlockerClass(row); summary.blockerClasses.set(key, (summary.blockerClasses.get(key) || 0) + 1); } }
function coverageSummaryFromRows(rows) { const summary = coverageSummary(); for (const row of rows) addCoverageSummary(summary, row); return summary; }
async function streamCoverageSummary(rows, write) { const summary = coverageSummary(); for await (const row of rows) { addCoverageSummary(summary, row); await write(row); } return summary; }
async function streamCoverageCsvAtomic(file, baseRows, runtime, obligationById) { const temporary = `${file}.tmp`; const stream = createWriteStream(temporary, { encoding: 'utf8' }); try { await writeChunk(stream, `${coverageColumns.join(',')}\n`); const summary = await streamCoverageSummary(coverageRows(baseRows, runtime, obligationById), (row) => writeChunk(stream, `${coverageColumns.map((column) => csvEscape(row[column])).join(',')}\n`)); await new Promise((resolve, reject) => { stream.once('error', reject); stream.end(resolve); }); await rename(temporary, file); return summary; } catch (error) { stream.destroy(); await unlink(temporary).catch(() => {}); throw error; } }
function mdCell(value) { return String(value ?? '-').replaceAll('|', '\\|').replace(/[\r\n]+/g, ' ').trim() || '-'; }
function primaryArtifact(row) { const refs = String(row.artifact_refs || '').split('|').filter(Boolean); return refs.find((reference) => reference.endsWith('/pairwise.json')) || refs.find((reference) => /\/run\d+-blocked\.json$/.test(reference)) || refs[0] || '-'; }
function runtimeSection(rows, category) { const body = rows.filter((row) => row.category === category).map((row) => `| ${[row.local_url, row.viewport, row.preference, row.state_scenario, row.status, row.geometry_delta_px || '-', row.timing_delta_frames || '-', primaryArtifact(row)].map(mdCell).join(' | ')} |`).join('\n'); return body || '| - | - | - | - | blocked | - | - | - |'; }
function sideSummary(raw) { try { const parsed = JSON.parse(raw || '{}'); const run = parsed.runs?.[0]; if (!run?.phases) return mdCell(raw).slice(0, 500); const phases = Object.entries(run.phases).filter(([, phase]) => phase).map(([name, phase]) => { const targets = Array.isArray(phase.targets) ? phase.targets : []; const values = targets.map((target) => { const rect = target.rect || {}; return `[${rect.x ?? '-'},${rect.y ?? '-'},${rect.width ?? '-'},${rect.height ?? '-'}; opacity=${target.opacity ?? target.style?.opacity ?? '-'}; transform=${target.style?.transform ?? '-'}]`; }); return `${name}{count=${phase.target_count ?? targets.length};${values.join(',')}}`; }); return `run${run.run || 1} ${phases.join(' ')}`; } catch { return mdCell(raw).slice(0, 500); } }
function coverageGapTable(coverage) { const summary = Array.isArray(coverage) ? coverageSummaryFromRows(coverage) : coverage; const body = [...summary.blockerClasses.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).map(([key, count]) => `| ${mdCell(key)} | ${count} |`).join('\n'); return `| Blocker class | Count |\n| --- | ---: |\n${body || '| - | 0 |'}`; }
function finalReport(runtime, coverage, integrityErrors, computerUse) {
  const summary = Array.isArray(coverage) ? coverageSummaryFromRows(coverage) : coverage; const gate = finalGate(runtime, summary, integrityErrors, computerUse);
  const exclusions = runtime.filter((row) => row.status === excludedWithReason);
  const measured = runtime.filter((row) => row.pixel_comparison !== 'not-run-applicability-blocked' && row.status !== excludedWithReason);
  const count = (status) => measured.filter((row) => row.status === status).length;
  const applicabilityBlocked = runtime.filter((row) => row.pixel_comparison === 'not-run-applicability-blocked').length;
  const table = (category) => `| Local route | Viewport | Preference | State | Status | Geometry delta | Timing delta | Artifacts |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n${runtimeSection(runtime, category)}`;
  const fails = runtime.filter((row) => row.status === 'fail').map((row) => `- ${mdCell(row.obligation_id)}: expected live=${sideSummary(row.expected_live)}; actual local=${sideSummary(row.actual_local)}; delta geometry=${mdCell(row.geometry_delta_px)}px; delta timing=${mdCell(row.timing_delta_frames)} frame; style=${mdCell(row.style_delta)}; pixel=${mdCell(row.pixel_delta)}; likely local source=${mdCell(row.likely_local_source)}; artifact=${mdCell(primaryArtifact(row))}`).join('\n') || '- Không có fail runtime.';

  return `# Pairwise layout và motion parity

## Kết luận

- Canonical acceptance: \`Layout-and-motion parity 1:1; content and media pixels excluded, geometry retained.\`
- Parity gate: **${gate.ok ? 'PASS' : 'NOT PASS'}**.
- Runtime: ${runtime.length} obligations; ${measured.length} measured; ${count('pass')} pass; ${count('fail')} fail; ${count('blocked')} runtime blocked; ${applicabilityBlocked} applicability blocked; ${exclusions.length} excluded-with-reason, not run and not pass.
- Coverage: ${summary.rows} candidate mappings; ${gate.coverage_non_pass} non-pass; ${gate.integrity_errors} integrity errors; ${gate.refused} connection-refused.
- Computer Use human path: ${gate.computer_use_verified ? `PASS; ${computerUse.observations} observations; evidence=${computerUse.evidence_path}` : `BLOCKED; ${computerUse?.blocker || 'evidence chưa hợp lệ'}`}.
- Không tuyên bố 1:1 khi còn bất kỳ fail, blocked, mapping invalid hoặc evidence bắt buộc chưa chạy.

## Phương pháp và ngưỡng

- Playwright dùng Chrome headless cho local và Espacio live trong hai context có cùng viewport, screen, DPR 1, color scheme light, locale en-US, timezone Asia/Bangkok và reduced-motion preference theo contract.
- Runner chờ \`document.fonts.ready\` và bốn frame geometry/style ổn định trước trigger; mỗi interaction chạy hai lần sau reset sạch.
- Mỗi motion capture before, start, mid, end, cleanup và cancel khi contract yêu cầu; lưu timestamp, frame, event order, easing, cleanup, screenshot, pixel diff và pairwise JSON.
- Geometry pass khi delta tối đa 0,5 px. Timing pass khi delta tối đa 1 frame; easing, state order và cleanup phải khớp chính xác.
- Screenshot mask nội dung chữ và pixel bên trong media bằng post-process PNG, không đổi DOM hoặc computed style; bounding box, crop, overlay, opacity và stacking vẫn được đo.
- Source local, code live và archive crawl chỉ dùng để lập inventory, selector, trigger và ownership; không thay runtime evidence.
- DevTools evidence hiện có: \`research/reference-site/runtime-evidence/layout-motion-parity/devtools-local-navbar-1440.json\`, \`devtools-live-navbar-1440.json\` và \`devtools-health-1440.json\`.
- Computer Use chỉ được chạy sau khi owner duyệt riêng. Trạng thái hiện tại: ${gate.computer_use_verified ? 'đã có evidence hợp lệ' : 'chưa chạy hoặc evidence chưa hợp lệ'}.

## Ngoại lệ typography đã duyệt

- Không đổi font website Trường Thịnh để sao chép font Espacio.
- Vietnamese giữ nguyên word spacing và line spacing đã được owner duyệt.
- English vẫn phải khớp typography geometry của Espacio, trừ font family.
- Ngoại lệ typography không nới ngưỡng layout, scale, alignment, motion hoặc interaction.

## Layout parity

${table('layout')}

## Motion parity

${table('motion')}

## Navbar parity

${table('navbar')}

## Hover/focus parity

${table('hover-focus')}

## Missing coverage

- Runtime rows: ${runtime.length}; coverage rows: ${summary.rows}.
- Runtime non-pass: ${gate.runtime_non_pass}; coverage non-pass: ${gate.coverage_non_pass}; connection refused: ${gate.refused}; integrity errors: ${gate.integrity_errors}; Computer Use verified: ${gate.computer_use_verified}.
- Coverage ledger: \`docs/reports/research-espacio-layout-motion-coverage.csv\`; obligations: \`docs/reports/research-espacio-layout-motion-obligations.csv\`; runtime results: \`docs/reports/research-espacio-layout-motion-runtime.csv\`.
- ${gate.ok ? '1:1 chỉ đạt khi toàn bộ runtime và coverage đều có evidence đầy đủ.' : '1:1 chưa đạt vì còn fail, blocked, mapping invalid, Computer Use chưa chạy hoặc ERR_CONNECTION_REFUSED.'}

## Owner-approved exclusions

${exclusions.map((row) => `- ${mdCell(row.obligation_id)}: ${mdCell(row.exclusion_reason)}`).join('\n') || '- Không có owner-approved exclusion.'}

${coverageGapTable(summary)}

### Fail detail

${fails}

## Chú thích thuật ngữ

- **Pairwise**: so sánh local và live cùng state.
- **Blocked**: thiếu evidence bắt buộc.
- **Excluded with reason**: owner-approved, không chạy comparator và không là pass.
- **DPR**: tỷ lệ pixel thiết bị dùng khi render.
- **Contract fingerprint**: hash của target, action, timing và môi trường đo.
`;
}
async function finalize() {
  const [obligations, runtime, candidates, candidateMap] = await Promise.all([paths.obligations, paths.runtime, paths.candidates, paths.candidateMap].map(async (file) => csvParse(await readFile(file, 'utf8')))); const policyErrors = exclusionPolicyErrors(obligations); if (policyErrors.length) throw new Error(policyErrors.join('; ')); const validation = validateRuntimeSet(obligations, runtime); if (!validation.ok) throw new Error(validation.errors.join('; '));
  const baseRows = phaseABase(candidates, candidateMap); let coverage = coverageSummary(); const integrityErrors = [];
  try { coverage = await streamCoverageCsvAtomic(paths.coverage, baseRows, runtime, validation.obligationById); } catch (error) { integrityErrors.push(error.message); }
  const computerUse = await readComputerUseEvidence(); const gate = finalGate(runtime, coverage, integrityErrors, computerUse);
  await writeFile(paths.report, finalReport(runtime, coverage, integrityErrors, computerUse), 'utf8'); console.log(JSON.stringify({ obligations: obligations.length, runtime: runtime.length, coverage: coverage.rows, gate, computerUse, integrityErrors }, null, 2)); if (!gate.ok) process.exitCode = 1;
}
function compactArtifactRefs(refs) { return refs.filter((reference) => reference.endsWith('/runtime-mapping.json') || reference.endsWith('/pairwise.json')).join('|'); }
async function selfTest() { const obligation = { obligation_id: 'lmp-x', category: 'layout', local_url: '/vi/', live_url: 'https://live', template: 'home', viewport: '390x844', device_mode: 'touch', preference: 'no-preference', state_scenario: 'top', local_selector: 'header', live_selector: 'header', local_pseudo: '', live_pseudo: '', action_protocol: 'load', sample_timings: 'before', geometry_threshold_px: '0.5', timing_threshold_frames: '1', applicability: 'applicable', blocker: '', mapping_confidence: 'explicit-selector-pair', initial_status: 'blocked' }; obligation.contract_fingerprint = contractFingerprint(obligation); const runtime = { obligation_id: 'lmp-x', category: 'layout', local_url: '/vi/', viewport: '390x844', preference: 'no-preference', state_scenario: 'top', expected_live: '{"runs":[{"run":1,"phases":{"before":{"target_count":1,"targets":[{"rect":{"x":0,"y":0,"width":10,"height":20},"opacity":"1","style":{"transform":"none"}}]}}}]}', actual_local: '{"runs":[{"run":1,"phases":{"before":{"target_count":1,"targets":[{"rect":{"x":1,"y":0,"width":10,"height":20},"opacity":"1","style":{"transform":"none"}}]}}}]}', artifact_refs: 'x/a.png|x/pairwise.json', contract_fingerprint: obligation.contract_fingerprint, status: 'pass', runner_hash: 'runner-a', schema_hash: 'schema-a', timestamp: '2026-08-22T00:00:00.000Z', dom_fingerprint_local: 'local-dom', dom_fingerprint_live: 'live-dom' }; const secondObligation = { ...obligation, obligation_id: 'lmp-y', state_scenario: 'top-second' }; secondObligation.contract_fingerprint = contractFingerprint(secondObligation); const secondRuntime = { ...runtime, obligation_id: secondObligation.obligation_id, contract_fingerprint: secondObligation.contract_fingerprint }; const computerUsePass = { verified: true, status: 'pass', blocker: '', evidence_path: 'computer-use-review.json', observations: 1 }; const computerUseBlocked = { verified: false, status: 'not-run', blocker: 'Computer Use chưa chạy; dừng để owner duyệt trước khi thực hiện.' }; const syntheticMappings = 100000; let bytes = 0; let maxChunk = 0; const sink = { write(chunk) { bytes += chunk.length; maxChunk = Math.max(maxChunk, chunk.length); return true; } }; sink.write(`${coverageColumns.join(',')}\n`); for (let index = 0; index < syntheticMappings; index += 1) { const row = { candidate_id: `layout-${index}`, source_kind: 'runtime-layout', source_anchor: `node-${index}`, obligation_id: '', mapping_id: `blocker-${index}`, mapping_kind: 'blocker', status: 'blocked', blocker: 'unmapped', contract_fingerprint: '', artifact_refs: 'mapping.json|pairwise.json' }; sink.write(`${coverageColumns.map((column) => csvEscape(row[column])).join(',')}\n`); } const refused = { ...runtime, status: 'blocked', blocker: 'net::ERR_CONNECTION_REFUSED' }; const report = finalReport([runtime], [], [], computerUseBlocked); const tests = [validateRuntimeSet([obligation], [runtime]).ok, !validateRuntimeSet([obligation], [{ ...runtime, contract_fingerprint: 'bad' }]).ok, !validateRuntimeSet([obligation], [{ ...runtime, timestamp: 'invalid' }]).ok, !validateRuntimeSet([obligation], [{ ...runtime, dom_fingerprint_local: '' }]).ok, !validateRuntimeSet([obligation, secondObligation], [runtime, { ...secondRuntime, runner_hash: 'runner-b' }]).ok, bytes > 1000000 && maxChunk < 4096, !finalGate([refused], [], [], computerUsePass).ok, finalGate([runtime], [], [], computerUsePass).ok, !finalGate([runtime], [], [], computerUseBlocked).ok, phaseABase.toString().includes('13232'), report.includes('## Phương pháp và ngưỡng'), report.includes('## Ngoại lệ typography đã duyệt'), report.includes('Computer Use chưa chạy'), report.includes('x/pairwise.json') && !report.includes('x/a.png\\|x/pairwise.json'), sideSummary(runtime.expected_live).includes('before{count=1;[0,0,10,20'), coverageGapTable([{ status: 'blocked', mapping_kind: 'blocker', blocker: 'system=local; motion_kind=css-transition; source_anchor=x', source_kind: 'phase-a' }]).includes('phase-a/local/css-transition'), compactArtifactRefs(['x/a.png', 'x/runtime-mapping.json', 'x/pairwise.json']) === 'x/runtime-mapping.json|x/pairwise.json']; if (!tests.every(Boolean)) throw new Error(`Finalizer self-test failed: ${tests.filter(Boolean).length}/${tests.length}`); console.log(JSON.stringify({ passed: tests.length, synthetic_mappings: syntheticMappings, bytes, max_chunk: maxChunk, checks: ['runtime-contract-set', 'uniform-runner-schema-hash', 'timestamp-and-dom-fingerprint', 'streaming-bounded-chunks', 'connection-refused-fail-closed', 'computer-use-fail-closed-gate', 'standalone-report', 'markdown-table-artifact', 'compact-side-summary', 'coverage-gap-groups', 'compact-artifact-refs'] })); }
async function streamingCoverageSelfTest() { const syntheticMappings = 100001; let written = 0; let peakBuffered = 0; let buffered = 0; let maxChunk = 0; async function* rows() { for (let index = 0; index < syntheticMappings; index += 1) { buffered += 1; peakBuffered = Math.max(peakBuffered, buffered); yield { candidate_id: `layout-${index}`, source_kind: 'runtime-layout', source_anchor: `node-${index}`, obligation_id: '', mapping_id: `blocker-${index}`, mapping_kind: 'blocker', status: 'blocked', blocker: 'unmapped', contract_fingerprint: '', artifact_refs: '' }; } } const summary = await streamCoverageSummary(rows(), async (row) => { maxChunk = Math.max(maxChunk, `${coverageColumns.map((column) => csvEscape(row[column])).join(',')}\n`.length); written += 1; buffered -= 1; }); if (written !== syntheticMappings || peakBuffered !== 1 || summary.rows !== syntheticMappings || summary.nonPass !== syntheticMappings || maxChunk >= 4096) throw new Error('Streaming coverage self-test failed'); console.log(JSON.stringify({ passed: 5, synthetic_mappings: syntheticMappings, checks: ['streaming-no-array-collection', 'bounded-row-buffer', 'summary-total', 'summary-non-pass', 'bounded-output-chunk'] })); }
function excludedWithReasonSelfTest() {
  const obligations = approvedExclusions.map((approved, index) => { const row = { obligation_id: approved.obligation_id, category: 'navbar', local_url: '/en/', live_url: 'https://espaciohomedesign.com/en', template: 'home', viewport: '390x844', device_mode: 'touch', preference: 'no-preference', state_scenario: `menu-open-${index}`, local_selector: '#site-menu', live_selector: '#full-menu-nav', local_action_selector: '#header-menu-toggle', live_action_selector: '#header-menu-toggle', local_cleanup_selector: '[data-menu-close]', live_cleanup_selector: '#full-menu-close', local_pseudo: '', live_pseudo: '', action_protocol: 'load;press;next-rAF-start;mid;end;press-close;cleanup', sample_timings: 'before,next-rAF-start,mid,end,cleanup;rAF;resets=2', geometry_threshold_px: '0.5', timing_threshold_frames: '1', applicability: excludedWithReason, exclusion_original_obligation_id: approved.obligation_id, exclusion_reason: approved.reason, blocker: '', mapping_confidence: 'explicit-selector-pair', initial_status: 'blocked' }; row.contract_fingerprint = contractFingerprint(row); return row; }); const runtime = obligations.map((obligation) => ({ obligation_id: obligation.obligation_id, contract_fingerprint: obligation.contract_fingerprint, runner_hash: 'runner', schema_hash: 'schema', timestamp: '2026-08-22T00:00:00.000Z', status: excludedWithReason, category: obligation.category, local_url: obligation.local_url, live_url: obligation.live_url, viewport: obligation.viewport, device_mode: obligation.device_mode, preference: obligation.preference, state_scenario: obligation.state_scenario, expected_live: '', actual_local: '', geometry_delta_px: '', timing_delta_frames: '', style_delta: '', pixel_delta: '', event_order_match: false, easing_match: false, cleanup_match: false, dom_fingerprint_local: '', dom_fingerprint_live: '', pixel_comparison: notRunOwnerApprovedExclusion, exclusion_reason: obligation.exclusion_reason, likely_local_source: '', blocker: 'owner-approved-exclusion', artifact_refs: '', runtime_discovered_mapping: '[]' })); const computerUse = { verified: true }; const valid = validateRuntimeSet(obligations, runtime); const blankReason = validateRuntimeSet(obligations, runtime.map((row, index) => index ? row : { ...row, exclusion_reason: '' })); const wrongMarker = validateRuntimeSet(obligations, runtime.map((row, index) => index ? row : { ...row, pixel_comparison: 'measured' })); const unapproved = { ...obligations[0], obligation_id: 'lmp-unapproved', exclusion_original_obligation_id: 'lmp-unapproved' }; unapproved.contract_fingerprint = contractFingerprint(unapproved); if (!valid.ok || !finalGate(runtime, [], [], computerUse).ok || blankReason.ok || wrongMarker.ok || !exclusionForOrigin(obligations[0].obligation_id) || exclusionPolicyErrors([unapproved, obligations[1]]).length === 0) throw new Error('Excluded-with-reason self-test failed'); console.log(JSON.stringify({ passed: 6, checks: ['excluded-runtime-integrity', 'excluded-final-gate', 'blank-reason-fail-closed', 'marker-fail-closed', 'exact-id-policy', 'unused-allowlist-fail-closed'] }));
}
if (process.argv.includes('--self-test-static-blocker')) {
  const obligation = { applicability: 'blocked' };
  const runtime = { status: 'blocked', artifact_refs: '', runtime_discovered_mapping: '[]' };
  if (!isStaticBlockerWithoutArtifact(runtime, obligation)) throw new Error('Static blocker regression test failed');
  console.log('Static blocker regression test passed');
} else if (process.argv.includes('--self-test-placeholder-descriptor')) {
  const runtime = { runtime_discovered_mapping: '{"artifact":"runtime-mapping.json","count":0,"sha256":""}' };
  if (mappingDescriptor(runtime) !== null) throw new Error('Placeholder descriptor regression test failed');
  console.log('Placeholder descriptor regression test passed');
} else if (process.argv.includes('--self-test-write-backpressure')) {
  const { Writable } = await import('node:stream');
  const stream = new Writable({ highWaterMark: 1, write(_chunk, _encoding, callback) { setImmediate(callback); } });
  for (let index = 0; index < 20; index += 1) await writeChunk(stream, 'x');
  if (stream.listenerCount('error') !== 0) throw new Error(`Backpressure listener regression test failed: ${stream.listenerCount('error')}`);
  stream.end();
  console.log('Backpressure listener regression test passed');
} else if (process.argv.includes('--self-test')) selfTest().then(streamingCoverageSelfTest).then(excludedWithReasonSelfTest).catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; }); else finalize().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
