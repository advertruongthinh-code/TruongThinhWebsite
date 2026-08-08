# Implementation Plan: Repository Structure Cleanup

## Overview

Reorganize the repository so production source, tests, utilities, agent tooling,
documentation, research, and generated state are visibly separate. Preserve all
public URLs and generated `.site-output` paths. Do not deploy or push during the
migration.

The current root mixes public HTML/CSS/JS, Cloudflare runtime code, future CMS
files, tests, utilities, and documentation. The migration should happen now,
before the first public release, because the source-path contract is still local
and the deployment already uses `.site-output` as an isolation boundary.

## Assumptions

1. Public routes and asset URLs must not change.
2. `.site-output` remains the only directory deployed as static assets.
3. The dormant CMS/admin code remains available but must not block the static
   release.
4. Project-local agent tooling remains portable across clones.
5. No GitHub push occurs without explicit owner approval.

## Target tree

```text
.
├─ src/
│  ├─ site/                       # public static source; output shape is unchanged
│  │  ├─ index.html
│  │  ├─ residential/index.html
│  │  ├─ commercial/index.html
│  │  ├─ projects-products/index.html
│  │  ├─ about/index.html
│  │  ├─ style.css
│  │  ├─ motion.js
│  │  ├─ detail.css
│  │  ├─ detail.js
│  │  ├─ products.js
│  │  └─ assets/site/
│  ├─ worker/index.js             # Cloudflare runtime
│  ├─ admin/                      # dormant future CMS shell
│  └─ db/migrations/              # dormant future CMS schema
├─ tests/
│  ├─ site/                       # source, E2E, and cross-browser contracts
│  ├─ worker/                     # Worker static and CMS contracts
│  ├─ tooling/                    # Serena, Graphify, and hook fixtures
│  └─ README.md
├─ scripts/
│  ├─ site/prepare-static-assets.mjs
│  ├─ reference/archive-reference.mjs
│  └─ tooling/                    # project-local agent/MCP lifecycle
├─ docs/
│  ├─ product/                    # content, motion, route, and release specs
│  ├─ engineering/                # architecture and Cloudflare/CMS design
│  ├─ operations/                 # admin and tooling runbooks
│  ├─ decisions/                  # ADRs and the decision log
│  └─ reports/                    # current state, audit, handoff, reference audit
├─ research/reference-site/       # tracked index plus ignored local archive
├─ tasks/                         # active migration plan and checklist
├─ .agents/                       # portable skills; discovery path, keep at root
├─ .codex/                        # Codex config/hooks/personas, keep at root
├─ .serena/                       # Serena project config, keep at root
├─ .github/                       # CI/CD, keep at root
├─ .tooling/                      # ignored local runtimes/state/backups
├─ graphify-out/                  # ignored Graphify output; required conventional path
├─ .site-output/                 # ignored deploy artifact
├─ AGENTS.md
├─ CLAUDE.md
├─ PRODUCT.md                     # canonical tool input, keep at root
├─ README.md
├─ package.json
├─ pnpm-lock.yaml
├─ pnpm-workspace.yaml
├─ playwright.config.cjs
├─ wrangler.toml
├─ tooling-versions.json
└─ tooling-install-manifest.json
```

## Architecture decisions

- Use one `src/` tree, not `apps/`, packages, or a monorepo. There is one
  deployable product.
- Keep static source files flat inside `src/site/`. This preserves output URLs
  and avoids rewriting every HTML asset reference.
- Make `scripts/site/prepare-static-assets.mjs` copy the complete `src/site/`
  tree to `.site-output/`. The source directory itself becomes the public-file
  allowlist.
- Keep `scripts/tooling/` in place. Codex hooks and project-local bootstrap use
  this path, and moving it creates risk without improving the visible boundary.
- Keep conventional/discovery files at root: agent directories, GitHub config,
  package manager files, Playwright, Wrangler, Graphify output, and product
  context.
- Treat ignored runtime state as local cache, not repository structure. Document
  it and clean only proven-rebuildable or obsolete state.

## Dependency order

```text
Safety checkpoint
    └─ Static source path contract
         ├─ Worker/admin/database paths
         └─ Test layout
              └─ Utility script layout
                   └─ Documentation and research links
                        └─ Generated-state purge and final verification
```

## Tasks

### Task 0: Freeze the Graphify wrapper work

**Description:** Preserve the currently verified Graphify boundary changes
before any path migration. Work on a `codex/project-structure` branch and keep
all commits local.

**Acceptance criteria:**

- [ ] Current Graphify tests and quick doctor pass.
- [ ] The Graphify change set is committed locally with a clean worktree.
- [ ] No branch or commit is pushed.

**Verification:**

- [ ] `tests/tooling/graphify-freshness-fixtures.ps1`
- [ ] `tests/tooling/hook-fixtures.ps1`
- [ ] `scripts/tooling/doctor.ps1 -Quick`

**Dependencies:** None.

**Estimated scope:** Small Git checkpoint; no source moves.

### Task 1: Establish `src/site` as the static-source boundary

**Description:** Move the public HTML, shared CSS/JS, route directories, and
`assets/site` into `src/site/`. Update the staging script to copy that tree to
`.site-output` without changing output paths.

**Acceptance criteria:**

- [ ] `.site-output` has the same relative file paths and file hashes as before
  for unchanged source files.
- [ ] No public HTML, CSS, JS, or content media remains at repository root.
- [ ] No tooling, reports, research, admin, or repository metadata enters
  `.site-output`.

**Verification:**

- [ ] Compare pre/post `.site-output` path and SHA-256 manifests.
- [ ] `pnpm prepare:site`
- [ ] `pnpm qa:static`

**Dependencies:** Task 0.

**Files likely touched:** Public source paths, `scripts/prepare-static-assets.mjs`,
source-contract path constants, `package.json`.

**Estimated scope:** Medium logic change plus mechanical moves.

### Task 2: Separate Worker, dormant admin, and database source

**Description:** Move Cloudflare runtime code to `src/worker`, the dormant admin
shell to `src/admin`, and migrations to `src/db/migrations`. Update Wrangler and
Worker contract imports only; do not activate CMS bindings.

**Acceptance criteria:**

- [ ] Wrangler loads `src/worker/index.js`.
- [ ] Static Worker behavior and all legacy/canonical redirects are unchanged.
- [ ] Admin and migrations are clearly marked as future-CMS source and remain
  excluded from `.site-output`.

**Verification:**

- [ ] `pnpm qa:worker:static`
- [ ] `pnpm qa:worker`
- [ ] Confirm `wrangler.toml` has no new D1/R2 binding.

**Dependencies:** Task 1.

**Files likely touched:** `worker/index.js`, `admin/`, `migrations/`,
`wrangler.toml`, Worker test imports.

**Estimated scope:** Medium, split into two commits if CMS-path references exceed
five logic files.

### Task 3: Partition tests by subsystem

**Description:** Move site tests under `tests/site/`, Worker tests under
`tests/worker/`, and leave tooling fixtures under `tests/tooling/`. Update only
the package, Playwright, CI, and manifest paths that execute them.

**Acceptance criteria:**

- [ ] Each test file belongs to exactly one subsystem.
- [ ] Package scripts retain their existing names and behavior.
- [ ] CI runs the same gates and uploads failure evidence from the same logical
  output.

**Verification:**

- [ ] `pnpm qa:static`
- [ ] `pnpm qa:worker:static`
- [ ] `pnpm qa:cross-browser -- --project=chromium`
- [ ] Parse both GitHub workflow YAML files.

**Dependencies:** Tasks 1 and 2.

**Files likely touched:** Test path moves, `package.json`,
`playwright.config.cjs`, `.github/workflows/ci.yml`, install manifest writer.

**Estimated scope:** Medium mechanical migration.

### Checkpoint A: Runtime equivalence

- [ ] `.site-output` path/hash comparison passes.
- [ ] Static source and Worker contracts pass.
- [ ] Chromium smoke passes on all canonical routes.
- [ ] `git diff --check` passes.

### Task 4: Partition utility scripts without moving agent tooling

**Description:** Move the site staging utility to `scripts/site/` and the
reference crawler to `scripts/reference/`. Keep `scripts/tooling/` unchanged so
trusted Codex hooks and bootstrap paths remain stable.

**Acceptance criteria:**

- [ ] Package scripts and documented commands use the new utility paths.
- [ ] The crawler default output remains inside the research area.
- [ ] `.codex/hooks.json` and its template retain the existing trusted
  project-local dispatcher path.

**Verification:**

- [ ] `pnpm prepare:site`
- [ ] Crawler `--help` and existing crawler test pass without network access.
- [ ] Full hook fixture passes.

**Dependencies:** Checkpoint A.

**Files likely touched:** Two script moves, `package.json`, crawler tests/docs.

**Estimated scope:** Small.

### Task 5: Reclassify system documentation

**Description:** Move the existing documents into product, engineering,
operations, decisions, and reports. Update links in small category batches;
do not rewrite content merely because a file moved.

**Acceptance criteria:**

- [ ] Every canonical document has one category and one path.
- [ ] `AGENTS.md` mandatory product/reference links resolve.
- [ ] Reports remain Vietnamese; other new Markdown remains English.
- [ ] No duplicate `CURRENT`, decision log, handoff, or audit copy remains.

**Verification:**

- [ ] Run a repository-local Markdown link/path checker.
- [ ] `rg` finds no old canonical doc path except migration history.
- [ ] Graphify and Serena see the renamed files after one sync/update.

**Dependencies:** Task 4.

**Files likely touched:** `docs/**`, `AGENTS.md`, `README.md`, `PRODUCT.md`,
test documentation.

**Estimated scope:** Three small path-only commits: product/engineering,
operations/decisions, then reports.

### Task 6: Move reference research under `research/`

**Description:** Move the tracked reference index and ignored local archive to
`research/reference-site/`. Preserve the 438 MB archive in place by same-volume
move and verify it with a file-count/size/hash manifest; do not recrawl.

**Acceptance criteria:**

- [ ] Reference research is outside production source and deploy output.
- [ ] Archive file count, total bytes, and sampled/full manifest hashes match.
- [ ] Crawler, ignore rules, Serena exclusions, Graphify exclusions, and docs use
  the new path.

**Verification:**

- [ ] Run the crawler's offline tests.
- [ ] Compare archive manifests before and after the move.
- [ ] `pnpm prepare:site` proves no research file is staged.

**Dependencies:** Task 5.

**Files likely touched:** Research directory, crawler defaults, ignore maps,
reference reports and runbooks.

**Estimated scope:** Medium due to local data verification, small tracked diff.

### Task 7: Purge obsolete local state with explicit retention rules

**Description:** Remove only data that is obsolete or reproducible after all
source migrations are committed and verified. Do not delete project runtimes,
browsers, the Python environment, Serena language-server cache, or the reference
archive.

**Acceptance criteria:**

- [ ] Delete the verified obsolete quarantine (`~618 MB`).
- [ ] Delete old Graphify rebuild backup (`~16 MB`) after graph health passes.
- [ ] Keep the original pre-install backup and newest bootstrap backup until the
  first successful deployment.
- [ ] Rebuildable `.site-output`, `.wrangler`, and test results may be cleared;
  they regenerate successfully.

**Verification:**

- [ ] Resolve and print every deletion target before deletion.
- [ ] Confirm all targets remain inside `.tooling/` or known artifact paths.
- [ ] Run bootstrap/doctor smoke after cleanup.

**Dependencies:** Tasks 0-6 and explicit owner approval for deletion.

**Estimated scope:** Small, destructive and therefore separately approved.

### Task 8: Update agent/tooling path contracts and finish

**Description:** Update Graphify ignores, Serena exclusions, documentation,
install checksums, and the canonical tree. Run the full verification matrix and
leave no compatibility shim or old empty directory.

**Acceptance criteria:**

- [ ] README shows the final tree and explains source versus generated state.
- [ ] No tracked file references an obsolete path.
- [ ] Serena reports the expected language set with no restart marker.
- [ ] Graphify AST is fresh; semantic pending is reported honestly.
- [ ] Git contains no ignored archive/runtime file and no empty compatibility
  directory.

**Verification:**

- [ ] All package QA scripts pass.
- [ ] Tooling unit and hook fixtures pass.
- [ ] `scripts/tooling/doctor.ps1 -Mcp` passes.
- [ ] `git status --ignored`, `git diff --check`, and tracked-file inventory are
  reviewed.

**Dependencies:** Tasks 1-7.

**Estimated scope:** Medium verification/handoff.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Source moves change deployed URLs | High | Keep the exact `src/site` output shape and compare path/hash manifests. |
| Tests pass against old root files | High | Remove old paths in the same commit and make tests read only `src/site`. |
| Codex hooks become untrusted or missing | High | Do not move `scripts/tooling`; run full hook fixtures after every config batch. |
| Documentation links silently break | Medium | Move by category, use a link/path checker, and search for old paths. |
| Reference archive is lost or recopied slowly | High | Same-volume move with manifest verification; no deletion or recrawl. |
| Cleanup removes required local runtimes | High | Restrict purge to reviewed explicit paths; keep Python, browsers, runtimes, and Serena cache. |
| Reorganization delays first release | Medium | Complete runtime Tasks 1-3 first; stop after Checkpoint A if release work must resume. |

## Ponytail audit constraints

- `yagni:` Do not create `apps/`, packages, a monorepo, or a build framework.
  One `src/` tree and the existing staging script are sufficient.
- `shrink:` Copy the complete `src/site/` tree instead of maintaining a second
  public-file allowlist.
- `delete:` Remove obsolete quarantine and Graphify backup only after the safety
  commit and verification.
- `native:` Keep standard root configuration and discovery paths instead of
  wrapping package manager, Wrangler, Playwright, GitHub, or agent config.

Potential local reduction: approximately 634 MB of obsolete quarantine/backups,
zero new runtime dependencies.

## Approval gate

Implementation starts only after owner review. The recommended execution scope
is Tasks 0-3 through Checkpoint A first. Do not begin the destructive Task 7 or
push any commit without a separate explicit instruction.
