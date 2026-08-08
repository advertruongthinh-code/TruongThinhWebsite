# Admin guide

The CMS is a small, Access-gated editor for the canonical VI/EN website. Open
`/admin/` after signing in through Cloudflare Access. The public site remains
static-first: a missing or invalid CMS record must leave the existing shell and
menu fallback usable.

## Before editing

Apply the current D1 migrations and confirm the Worker has `DB`, `MEDIA`,
`PUBLIC_ORIGIN`, `ADMIN_EMAILS`, `ACCESS_TEAM_DOMAIN`, and `ACCESS_AUD` configured.
Do not enter Zalo URLs, addresses, founding years, warranty terms, or other
owner facts until they are supplied and approved.

## Resource order

Use the resources in this order when adding a new offering:

1. **Nhóm công trình** (`/api/admin/project-categories`) — project taxonomy.
2. **Nhóm sản phẩm** (`/api/admin/product-categories`) — product taxonomy.
3. **Công trình** (`/api/admin/projects`) or **Sản phẩm**
   (`/api/admin/products`) — records that reference the matching category kind.
4. **Media** — upload approved WebP images or strictly safe SVG logos, then
   publish and approve them before attaching them to content.

The six seeded project categories use positions 101–106:
`residential`, `commercial`, `kiosk-posm-project`, `mobile-retail`,
`signage-project`, and `light-boxes`. The six product categories keep positions
1–6. Project and product categories are separate resources; assigning a project
to a product category (or the reverse) is rejected.

## Editing content

- **Pages** have fixed IDs (`home`, `residential`, `commercial`,
  `projects-products`, `about`); edit their VI and English fields in pairs.
- **Projects** require a valid slug, template, project category, status, and
  localized content. `menu_group` and `menu_order` are optional. A published
  project appears in the full menu only when its group is valid and both VI/EN
  names resolve.
- **Products** require a product category, position, status, and VI/EN names.
- **Settings** accept JSON objects only. Do not put HTML in settings or content
  fields.

The full-menu groups are `residential`, `commercial`, and
`projects-products`. Menu order is an integer from 1 to 999; lower values sort
first, then slug. Missing metadata or incomplete localization keeps the static
menu options in place.

## Safety and deletion

Writes require a same-origin `Origin` header and are recorded in `audit_log`.
The server validates all identifiers, localized fields, statuses, category kinds,
menu metadata, media bytes, and SVG content. A category referenced by a project
or product cannot be deleted; the API returns HTTP `409`. Use the error message
to find and reassign or remove dependent records first.

## Local verification

```powershell
$state = Join-Path $env:TEMP "truong-thinh-worker-state"
npx wrangler d1 migrations apply truong-thinh-cms --local --persist-to $state
npx wrangler dev --local --port 8787 --persist-to $state
```

In another terminal:

```powershell
$env:BASE_URL = "http://127.0.0.1:8787"
node tests/worker/worker-contract.cjs
node tests/site/site.e2e.cjs
```

Check the browser report at `tests/site/reports/latest.json`. A handoff should name
the changed resource, migration state, publish/approval state, test commands,
and any owner-supplied fact that is still blocked.
