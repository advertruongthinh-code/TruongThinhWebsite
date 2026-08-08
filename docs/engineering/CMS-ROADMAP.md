# CMS Roadmap

## Status

Deferred until the static website is live and stable. This document is a phase
boundary, not an implementation request.

## Existing scaffold

- `src/worker/index.js`: dormant D1/R2/admin interfaces and validation.
- `src/db/migrations/`: draft schema and seed data.
- `src/admin/`: private administration shell excluded from public static assets.
- `docs/engineering/CLOUDFLARE-CMS.md`: earlier design notes that require revalidation.

## Phase entry criteria

- The static release is live and has a known rollback path.
- The owner confirms the editorial roles and publishing workflow.
- D1/R2 region, retention, backup, and cost assumptions are revalidated against
  current official documentation.
- Cloudflare Access and production domain decisions are explicit.

## Planned outcomes

- Draft and publish bilingual pages, projects, and products.
- Store structured metadata in D1 and approved media in R2.
- Keep public static routes available during CMS incidents.
- Record audit events and restrict all admin writes to authenticated owners.

## Non-goals

- A general-purpose page builder.
- Multi-tenant permissions.
- Replacing the static source files before the CMS proves reliable.
