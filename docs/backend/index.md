---
title: Backend, Worker và CMS boundary Trường Thịnh
type: backend
status: living
updated: 2026-09-09
related_specs:
  - ../specs/cms-content-publishing.md
related_decisions:
  - ../decisions/wrangler-deferred-until-cms.md
  - ../decisions/static-before-cms.md
---

# Backend, Worker và CMS boundary

Backend hiện là scaffold dormant/dev. Public static route không đọc D1, R2,
Access hoặc CMS secret. `src/worker/index.js`, `src/admin/` và migrations giữ
contract tương lai để không làm mất đường nâng cấp; chúng không thuộc static
release gate.

## Trạng thái theo phase

| Phần | Trạng thái | Quyền sở hữu hiện tại |
| --- | --- | --- |
| Static public render | Current | `src/site/` + `scripts/site/prepare-static-assets.mjs` + `.site-output/` |
| Worker route/SEO/API | Dormant | `src/worker/index.js`; chỉ activate khi CMS phase có owner gate |
| Admin UI | Dev/dormant | `src/admin/index.html`, `admin.css`, `admin.js`; không public asset |
| Schema/seed | Draft/dev | `src/db/migrations/`; chưa là production provider decision |
| CMS publishing | Planned | structured content, allowlisted layout, selected provider/storage, Access-protected write |

## Current static boundary

Static source chứa route HTML, local/generated media, bilingual leaf content và
shared CSS/JS. Generator tạo output deterministic trước preview/deploy. Dữ liệu
CMS không được dùng để quyết định public static route; static output là fallback
và rollback path nếu CMS phase sau này gặp sự cố.

## Worker scaffold

`src/worker/index.js` hiện giữ các boundary sau:

- `handleRequest()` xử lý redirect canonical, robots/sitemap, `/api/`, `/media/`,
  `/admin/` và locale route.
- `parseLocaleRoute()` phân biệt page route, sáu Advertising detail route và
  CMS target `/{locale}/projects/:slug/`.
- `renderRoute()` lấy static asset trước; project detail chỉ đọc khi có `env.DB`.
  Advertising detail hiện đọc generated static HTML, không đọc D1.
- Public project/product list API trả structured `{ categories, items }` khi
  data sẵn sàng; public project list không có DB thì trả rỗng.
- HTML `/{locale}/projects/:slug/` qua `renderRoute()` trả `404` khi không có
  DB/project; catch `CmsUnavailableError` từ D1 read để trả `503`.
- API `/api/public/projects/:slug` qua `publicProject()` gọi
  `publishedProject()` trực tiếp. Với slug hợp lệ, thiếu DB hoặc D1 read lỗi sẽ throw
  `CmsUnavailableError`, nhưng `handleApi()` chưa có catch tương ứng: status
  response ở boundary này là source gap/unverified, không được hứa `404/503`.
  Các behavior trên thuộc dormant Worker, không phải current static runtime.

`src/worker/index.js` cũng giữ `SOURCE_ROUTES`,
`ADVERTISING_DETAIL_SLUGS`, legacy/source redirects, sitemap và locale/head
logic. Không chuyển các route này thành CMS current route khi chưa có accepted
implementation slice.

## Admin và trust boundary

`src/admin/admin.js` là editor shell cho pages, projects, products, categories,
settings và media. UI helper (`element`, `field`, `request`, state/editor)
không phải public design-system component.

Worker admin API yêu cầu:

1. Access JWT hợp lệ với issuer/audience/time và signature.
2. Email trong JWT trùng `Cf-Access-Authenticated-User-Email`.
3. Email nằm trong `ADMIN_EMAILS` allowlist.
4. Write request có allowed origin; resource/media input tiếp tục phải qua
   validation, size/type và category-kind boundary.

Không ghi token, email owner hoặc provider secret vào static source/documentation.
Cloudflare Access, D1 region, R2 retention, backup, cost và provider vẫn là
unknown cho tới khi CMS discovery/official-doc revalidation hoàn tất.

## Planned public projection

CMS contract tương lai đi theo luồng:

```text
structured draft -> validate localized content/media/layoutKey
-> authenticated publish -> deterministic public renderer
-> static fallback khi data invalid, missing hoặc unavailable
```

`layoutKey` phải là allowlist do frontend contract sở hữu; raw HTML, arbitrary
CSS và arbitrary component code bị reject. Public static route phải tiếp tục
hoạt động trong CMS incident. Chi tiết invariant nằm trong
[CMS publishing spec](../specs/cms-content-publishing.md), không lặp lại ở đây.

## Verification và commands

Static phase:

```powershell
pnpm qa:static
pnpm qa:worker:security
```

`qa:worker:security` chỉ chạy khi Worker/security fixture là scope cần kiểm.
`pnpm qa:worker:static` và `pnpm qa:worker` là CMS release gate; không chạy
Wrangler hoặc deploy trong static phase. Source/test consumer gồm
`tests/worker/worker-static-contract.cjs`, `tests/worker/worker-contract.cjs`,
`tests/worker/advertising-detail-route.test.mjs` và `tests/site/site-static-contract.cjs`.

## Fallback và rollout boundary

- Build/static failure dừng tại generator; không phát hành output chưa kiểm.
- D1/R2/Access unavailable không được làm static release phụ thuộc provider.
- CMS publish lỗi phải giữ published/static fallback, không expose admin state.
- Rollback CMS là quay về static release đã biết; provider/schema migration cần
  decision riêng trước implementation.

Theo [decision Wrangler](../decisions/wrangler-deferred-until-cms.md), không cài
hoặc activate Wrangler chỉ để kiểm tra tài liệu. Đây là docs contract, không phải
claim production deployment.

## Chú thích thuật ngữ

- **Worker**: edge handler tương lai xử lý route, API và SSR boundary.
- **D1/R2**: candidate structured database/object storage của CMS; chưa được chọn cho phase hiện tại.
- **Trust boundary**: nơi authentication, authorization và validation bắt buộc.
- **Allowlist**: tập giá trị được phép, như `layoutKey` hoặc email admin.
- **Projection**: lớp render structured content thành public output.
- **Rollback path**: đường quay về release/static output đã biết.
