# ADR 0001: Release the Static Website Before the CMS

- Status: Accepted
- Date: 2026-08-08

## Context

The repository contains public static pages and a partially prepared CMS stack.
Requiring D1, R2, Access, and CMS data would delay the first public release and
increase the failure surface.

## Decision

Deploy the bilingual public website with Cloudflare static assets and a small
Worker routing layer. The Worker must serve all canonical static routes without
CMS bindings. Dynamic project pages and admin publishing return unavailable or
not-found behavior until the CMS phase is intentionally activated.

Deployment assets are copied from an explicit allowlist into ignored
`.site-output/`. Wrangler never uses the repository root as its asset directory.

GitHub remains the source of truth. Pull requests run repeatable contracts and a
Chromium browser smoke. Production deployment is initially manual.

## Consequences

- The website can go live before CMS infrastructure exists.
- Static files remain the rollback path and public fallback.
- CMS code remains dormant and may be simplified or revalidated later.
- Owners must publish content changes through source control during this phase.
