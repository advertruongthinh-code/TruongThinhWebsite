export const excludedWithReason = 'excluded-with-reason';
export const notRunOwnerApprovedExclusion = 'not-run-owner-approved-exclusion';

export const approvedExclusions = Object.freeze([
  Object.freeze({
    obligation_id: 'lmp-966f75efd609ac6f168f8516',
    reason: 'owner-approved brand exception; header logo content differs while overlay geometry/timing/event/easing/cleanup match',
  }),
  Object.freeze({
    obligation_id: 'lmp-d4984d0a620282c08b8fb9b4',
    reason: 'owner-approved locale/content/typography exception; local Vietnamese and live Spanish are intentionally non-equivalent',
  }),
]);

const approvedById = new Map(approvedExclusions.map((entry) => [entry.obligation_id, entry]));

export function exclusionForOrigin(obligationId) {
  return approvedById.get(obligationId) ?? null;
}

export function isApprovedExclusion(obligation) {
  const approved = exclusionForOrigin(obligation?.obligation_id);
  return Boolean(
    approved
      && obligation?.applicability === excludedWithReason
      && obligation?.exclusion_original_obligation_id === approved.obligation_id
      && obligation?.exclusion_reason === approved.reason,
  );
}

export function exclusionPolicyErrors(obligations) {
  const errors = [];
  const rows = Array.isArray(obligations) ? obligations : [];
  const byId = new Map();
  const approvedIds = new Set();
  for (const approved of approvedExclusions) {
    if (!approved.obligation_id || !String(approved.reason || '').trim()) errors.push(`invalid approved exclusion ${approved.obligation_id || 'blank'}`);
    if (approvedIds.has(approved.obligation_id)) errors.push(`duplicate approved exclusion ${approved.obligation_id}`);
    approvedIds.add(approved.obligation_id);
  }
  for (const row of rows) {
    const id = row?.obligation_id;
    if (!id) { if (row?.applicability === excludedWithReason) errors.push('blank owner-approved exclusion obligation ID'); continue; }
    const matches = byId.get(id) ?? [];
    matches.push(row);
    byId.set(id, matches);
    if (!['applicable', 'blocked', excludedWithReason].includes(row.applicability)) {
      errors.push(`unknown applicability ${id}`);
    }
    if (row.applicability === excludedWithReason && !isApprovedExclusion(row)) {
      errors.push(`invalid owner-approved exclusion ${id}`);
    }
    if (row.applicability !== excludedWithReason && (row.exclusion_original_obligation_id || row.exclusion_reason)) {
      errors.push(`unexpected exclusion metadata ${id}`);
    }
  }
  for (const approved of approvedExclusions) {
    const matches = byId.get(approved.obligation_id) ?? [];
    if (matches.length !== 1 || !isApprovedExclusion(matches[0])) {
      errors.push(`missing or unused owner-approved exclusion ${approved.obligation_id}`);
    }
  }
  return errors;
}

export function isExcludedRuntimeRow(row, obligation) {
  return Boolean(
    isApprovedExclusion(obligation)
      && row?.status === excludedWithReason
      && row?.pixel_comparison === notRunOwnerApprovedExclusion
      && row?.exclusion_reason === obligation.exclusion_reason
      && !String(row?.artifact_refs || '').trim()
      && String(row?.runtime_discovered_mapping || '[]') === '[]'
      && !String(row?.expected_live || '').trim()
      && !String(row?.actual_local || '').trim()
      && !String(row?.geometry_delta_px || '').trim()
      && !String(row?.timing_delta_frames || '').trim()
      && !String(row?.style_delta || '').trim()
      && !String(row?.pixel_delta || '').trim()
      && !String(row?.dom_fingerprint_local || '').trim()
      && !String(row?.dom_fingerprint_live || '').trim(),
  );
}
