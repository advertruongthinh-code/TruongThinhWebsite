# Static Release Specification

## Goal

Publish the existing bilingual website as soon as the quality gates pass. The
release must not depend on the future CMS.

## In scope

- Five public page types in Vietnamese and English.
- Canonical locale URLs, redirects, localized metadata, `robots.txt`, and
  `sitemap.xml` through the Cloudflare Worker.
- Static assets under `assets/site/`.
- An allowlist copy into ignored `.site-output/` so deploys cannot include
  project tooling, reports, reference research, or CMS admin files.
- Responsive and reduced-motion browser smoke coverage.
- Manual production deployment from GitHub Actions.

## Out of scope

- CMS editing, dynamic project publishing, authentication, D1, and R2.
- Production domain connection and owner data that has not been confirmed.
- UI redesign or new product features.

## Acceptance criteria

1. A clean clone installs with `pnpm install --frozen-lockfile`.
2. `pnpm qa:static` passes.
3. `pnpm qa:worker:security` passes without D1 or R2.
4. `pnpm qa:worker:static` passes against `pnpm dev`.
5. Chromium smoke passes in CI with no console, page, network, or overflow
   failure.
6. Deployment produces a reachable preview URL and does not require CMS
   bindings.
7. Zalo, address, founding year, and warranty claims remain unset until the
   owner confirms them.

## Release sequence

1. Merge a pull request after CI passes.
2. Run the manual `Deploy` workflow.
3. Verify VI/EN routes and CTAs on the preview URL.
4. Connect the production domain only after explicit owner approval.
