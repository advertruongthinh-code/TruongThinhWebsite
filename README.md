# Truong Thinh Website

Bilingual VI/EN static-first website for Truong Thinh Interior and Advertising.
The repository root is the canonical site. The immediate goal is a reliable
public website; CMS, private admin, D1, and R2 are deferred to a later phase.

GitHub repository: [advertruongthinh-code/TruongThinhWebsite](https://github.com/advertruongthinh-code/TruongThinhWebsite)

## Quick start

Requirements: Node.js 22+ and Corepack.

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://127.0.0.1:8787/vi/`. A small allowlist copy step creates the ignored
`.site-output/` deployment directory. HTML, CSS, JavaScript, and media are
served as Cloudflare static assets; the Worker adds
canonical locale routes, redirects, localized metadata, `robots.txt`, and the
sitemap.

## Current scope

- `/vi/` and `/en/`: home.
- `/vi/residential/` and `/en/residential/`: residential interiors.
- `/vi/commercial/` and `/en/commercial/`: commercial interiors.
- `/vi/projects-products/` and `/en/projects-products/`: projects and products.
- `/vi/about/` and `/en/about/`: company profile.
- Static pages work without D1, R2, Access, or CMS secrets.
- Dynamic `/projects/:slug/`, admin, and publishing workflows belong to the CMS
  phase and are not part of the first release gate.

The public copy still needs owner-confirmed Zalo, address, founding year, and
warranty information. Do not invent these values.

## Commands

```powershell
pnpm qa:static
pnpm dev
pnpm qa:worker:static
pnpm qa:cross-browser
pnpm deploy
```

`prepare:site` copies only public files into `.site-output`; it excludes tooling,
reports, reference archives, CMS admin files, and repository metadata.
`qa:static` checks source contracts without starting a server.
`qa:worker:static` expects Wrangler at `http://127.0.0.1:8787` and checks both
locales, redirects, canonical URLs, the sitemap, and the CMS-disabled fallback.
See [tests/README.md](tests/README.md) for the full browser matrix.

## Deployment

GitHub is the source of truth. Pull requests run the static and browser smoke
gates. Production deployment is manual through GitHub Actions until the first
stable release:

1. Configure repository secrets `CLOUDFLARE_API_TOKEN` and
   `CLOUDFLARE_ACCOUNT_ID`.
2. Run the `Deploy` workflow from GitHub Actions.
3. Verify the generated `workers.dev` URL before connecting the production
   domain.

No global package, skill, MCP, or runtime installation is required by the
repository.

## Project layout

```text
.
├─ src/site/                 # canonical static source; copied unchanged to .site-output
│  ├─ index.html
│  ├─ residential/index.html
│  ├─ commercial/index.html
│  ├─ projects-products/index.html
│  ├─ about/index.html
│  ├─ assets/site/           # public media
│  ├─ style.css              # shared tokens and layout
│  ├─ motion.js              # locale, navigation, and shared motion
│  ├─ detail.css
│  ├─ detail.js
│  └─ products.js
├─ src/worker/index.js       # static routing now; CMS-ready code is dormant
├─ src/admin/                # dormant private CMS shell
├─ src/db/migrations/        # dormant CMS schema and seed drafts
├─ tests/                    # source, Worker, and browser contracts
├─ docs/                     # specs, decisions, reports, and CMS roadmap
├─ scripts/                  # project automation and reference crawler
└─ reference-audit/          # ignored local research archive
```

Before editing copy or media, read
[docs/product/CONTENT-MEDIA-GUIDE.md](docs/product/CONTENT-MEDIA-GUIDE.md). Before editing
layout or motion, read
[docs/reports/REFERENCE-MOTION-AUDIT.md](docs/reports/REFERENCE-MOTION-AUDIT.md).

## Reference research

The crawler is deliberately generic and requires an explicit origin:

```powershell
node scripts/reference/archive-reference.mjs --origin <url>
```

Generated source and media are stored under
`reference-audit/web-reference/archive/`, ignored by Git, and must never be
loaded by the production website. Do not commit proprietary source, media,
logos, or identifying reference-site URLs.

## CMS phase

The future CMS may activate the existing Worker API, D1 migrations, R2 media,
and Access-protected admin shell. It must not block or destabilize the static
release. See [docs/engineering/CMS-ROADMAP.md](docs/engineering/CMS-ROADMAP.md).

## Agent instructions

- Shared rules: [AGENTS.md](AGENTS.md).
- Claude Code imports the same rules through [CLAUDE.md](CLAUDE.md).
- Codex project skills are pinned in `.agents/skills`; project launchers and
  hooks are documented in [docs/operations/TOOLING.md](docs/operations/TOOLING.md).
