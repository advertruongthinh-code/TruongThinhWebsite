# Repository Structure Cleanup Checklist

## Phase 0: Safety

- [x] Create `codex/project-structure` locally.
- [x] Re-run Graphify fixtures and quick doctor.
- [x] Commit the completed Graphify wrapper change set locally (`04910e0`).
- [x] Confirm no push occurred.

## Phase 1: Production source

- [x] Move public static source to `src/site/`.
- [x] Preserve `.site-output` paths and hashes (55 files, 15,804,007 bytes).
- [x] Move Worker to `src/worker/`.
- [x] Move dormant admin to `src/admin/`.
- [x] Move migrations to `src/db/migrations/`.

## Phase 2: Tests and utilities

- [x] Split tests into `tests/site`, `tests/worker`, and `tests/tooling`.
- [x] Move the staging script to `scripts/site/`.
- [x] Move the crawler to `scripts/reference/`.
- [x] Keep `scripts/tooling/` and trusted hook commands unchanged.
- [x] Pass Checkpoint A runtime equivalence (static, Worker runtime, Chromium 7/7).

## Phase 3: Documentation and research

- [ ] Classify docs into product, engineering, operations, decisions, reports.
- [ ] Update mandatory AGENTS/README paths.
- [ ] Move reference research to `research/reference-site/` with manifest proof.
- [ ] Update ignore and language-sync mappings.
- [ ] Confirm research remains outside deploy output.

## Phase 4: Purge and finish

- [ ] Obtain explicit approval for destructive cleanup.
- [ ] Remove obsolete quarantine and old Graphify backup.
- [ ] Keep required runtimes, browsers, Python, Serena cache, and reference data.
- [ ] Refresh Serena and Graphify once after all moves.
- [ ] Regenerate the tooling install manifest.
- [ ] Run full QA, MCP doctor, link check, and Git inventory.
- [ ] Update final README tree and Vietnamese handoff/current report.
- [ ] Do not push without explicit owner instruction.
