# AGENTS.md

## Mission

Ship the bilingual VI/EN Truong Thinh static website quickly and safely. The
repository root is canonical. CMS, private admin, D1, R2, and dynamic project
publishing are a later phase and must not block the first public release.

This is a solo-developer repository. Prefer small reversible diffs, native
platform features, existing dependencies, and evidence-backed handoffs.

## Writing language

- Write every code comment in English.
- Write Markdown reports in Vietnamese. Reports include audits, QA results,
  handoffs, incident notes, and current-status logs.
- Write all other Markdown in English, including README files, specifications,
  ADRs, runbooks, and agent instructions.
- Existing Vietnamese canonical content is product copy, not a code comment.

## Static-first boundary

- Static pages must work without D1, R2, Cloudflare Access, or CMS secrets.
- Do not expand CMS or admin behavior unless the task explicitly targets the CMS
  phase.
- Preserve future CMS interfaces where cheap, but never add speculative
  abstraction to the static release.
- Do not deploy, connect a domain, or publish owner data without explicit user
  approval.

## Mandatory product contracts

Before changing visible copy, `data-en*`, alt/ARIA text, image paths, cards,
galleries, or filters, read `docs/CONTENT-MEDIA-GUIDE.md` completely.

Before changing layout, typography, header, menu, transitions, reveals,
galleries, montage, or motion, read `docs/REFERENCE-MOTION-AUDIT.md` completely.
Compare the edited component against the locally archived reference at the same
viewport and state. The reference is research only: never copy proprietary
source, media, logos, fonts, SVGs, or identifying URLs into production code.

## Brand and content constraints

- Voice: experienced, creative, credible, direct, and concise.
- Use blue and orange as accents, not full-page backgrounds.
- Balance more than 20 years of craft with modern design and production.
- Avoid generic real-estate grids and fake-luxury black-and-gold styling.
- Primary CTA: Zalo consultation or survey booking.
- Never invent Zalo URL, address, founding year, or warranty policy.
- Do not use recognizable faces. The only approved exception is
  `assets/site/expanded/legacy-team.webp`.
- Every content image requires Vietnamese `alt` and English `data-en-alt`.

## HTML and localization contract

- Use one `h1`; preserve `h2` then `h3` hierarchy.
- Vietnamese is source text. Put English on leaf nodes in `data-en`.
- Translate attributes with `data-en-alt`, `data-en-aria-label`, and
  `data-en-content`.
- Keep the process order: Khảo sát, Tư vấn, Sản xuất, Lắp đặt.
- Public navigation must not use fragments. Locale switching keeps query and
  reading position but removes fragments.
- Service links target `/residential/`, `/commercial/`, and
  `/projects-products/` through locale-aware routing.

## Skill routing

Read the complete `SKILL.md` for every selected skill before acting.

1. Use `graphify` first for architecture, file relationships, dependencies, and
   blast radius when `graphify-out/graph.json` exists.
2. Use `using-agent-skills` to select only task-relevant skills.
3. Use `frontend-ui-engineering` for UI implementation and accessibility.
4. Use GSAP skills only for the GSAP feature being changed.
5. Use `browser-testing-with-devtools` for runtime investigation.
6. Use `impeccable` only as a critique/polish layer, not scope expansion.
7. Use `imagegen` only when an asset must be generated or edited.
8. Use `ponytail` before handoff to remove unnecessary complexity.

For every code change, stop at the first sufficient option: no code, reuse,
standard library, platform feature, installed dependency, then smallest custom
diff. Never simplify away trust-boundary validation, data-loss prevention,
security, accessibility, acceptance criteria, or required tests.

## Graphify and Serena

Use the project-local Graphify executable:

```powershell
& ".\.tooling\python\Scripts\graphify.exe" query "specific question"
```

Do not use a global `graphify` command. PostToolUse marks the graph dirty only
when a real file fingerprint changes. The dispatcher coalesces updates and runs
one AST update before the next graph query or at Stop. Markdown/media changes
may require a semantic pass; report `semantic update required` instead of
claiming full freshness.

Use Graphify for structure and blast radius, then Serena for exact symbols,
references, diagnostics, and refactors. If create/delete/rename changes the
extension set, run:

```powershell
scripts/tooling/sync-serena-languages.ps1 -Apply
```

Complete the health check and reactivation before further symbolic work. Never
edit `languages` or `language_servers` manually. A Serena
`restart-required.json` blocks symbolic work until reconnection.

## Project-local tooling

- Do not install packages, skills, MCP servers, browser state, or config at user
  or global scope for this repository.
- The initial bootstrap uses pinned stable versions. Later update checks only
  report; they do not install without user approval.
- Do not edit managed hook blocks. Keep debounce, locks, and Stop loop guards.
  Hook failures must be logged and must never be reported as a pass.
- Project-portable skills live in `.agents/skills`; personas live in
  `.codex/agents`.
- Review personas are read-only, cite file/line or runtime evidence, do not edit,
  and do not call other personas.

## Browser QA and metric honesty

- Playwright is the repeatable regression gate. DevTools and Computer Use are
  supplementary investigation tools. A screenshot is not a test pass.
- Never infer Lighthouse, Core Web Vitals, accessibility, or performance
  numbers. State whether evidence comes from Playwright, DevTools, or static
  review.
- DevTools MCP uses an isolated profile unless the user explicitly requests a
  signed-in profile.
- Native GUI testing requires application logs and framework-specific
  automation; Playwright is not a native-GUI test framework.

Before website handoff:

1. Run `pnpm qa:static`.
2. Start `pnpm dev`, then run `pnpm qa:worker:static`.
3. Run the Playwright smoke suite; for UI releases, run the viewport matrix in
   `tests/README.md`.
4. Verify no console error, failed request, horizontal overflow, locale loss,
   focus regression, or reduced-motion hidden content.
5. Report exact commands, failures, owner TODOs, and graph freshness.

## Change and documentation rules

- Work only in the assigned scope. Preserve unrelated and concurrent edits.
- Do not use broad destructive Git/filesystem commands.
- Update `docs/ARCHITECTURE.md`, relevant specs, and an ADR when public routes,
  shared contracts, or architecture decisions change.
- Update the Vietnamese `docs/memory/CURRENT.md` with real status and blockers.
- Handoffs must list changed files, behavior, tests, results, owner TODOs, and
  any semantic graph work still required.

## ADHD response contract

Start with the next action or current state. Number sequential work, give one
concrete action at a time, use at most five items, state errors directly, and
omit unnecessary introductions and conclusions. Only a direct user request in
the current task may disable this format.
