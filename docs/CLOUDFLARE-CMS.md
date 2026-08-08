# Cloudflare Worker CMS

Worker `src/worker/index.js` render canonical public routes from static shells and
D1 content. Không có runtime dependency. `workers_dev = false`; production chỉ
được phục vụ qua custom domain đã cấu hình trong Cloudflare.

## Bindings và variables bắt buộc

- D1 binding `DB`, tên `truong-thinh-cms`; thay `database_id` placeholder trong
  `wrangler.toml` bằng ID database của môi trường deploy. `REPLACE_WITH_D1_DATABASE_ID`
  là blocker có chủ ý: không chạy deploy với placeholder này và không thay bằng
  ID suy đoán.
- R2 binding `MEDIA`, bucket private `truong-thinh-media`. Không public bucket;
  Worker chỉ trả `/media/:id` khi record đã `published` và có `approved_at`.
- Cloudflare dashboard variable `PUBLIC_ORIGIN`, ví dụ
  `https://example.com`. Không để trống ở production.
- Secret/variable `ADMIN_EMAILS`, CSV email được phép.
- Secret/variable `ACCESS_TEAM_DOMAIN`, issuer URL đầy đủ, ví dụ
  `https://team.cloudflareaccess.com`.
- Secret/variable `ACCESS_AUD`, Application Audience tag của Access.

`keep_vars = true` giữ dashboard variables khi chạy deploy; không khai báo biến
rỗng trong file để tránh ghi đè cấu hình production.

Migrations chạy theo thứ tự và không rewrite lịch sử đã deploy. Hiện có
`0001_cms.sql` tạo seed/schema, `0002_projects_products_identity.sql` cập nhật
idempotent identity VI/EN của `projects-products`, và `0003_menu_project_metadata.sql`
thêm `projects.menu_group`/`menu_order` tuỳ chọn cho full-menu slots cùng taxonomy
`project_categories.kind` (`project` hoặc `product`). Migration này seed sáu nhóm
công trình ở vị trí 101–106, giữ sáu nhóm sản phẩm ở vị trí 1–6 và chuyển các
project cũ sang nhóm công trình tương ứng. API công khai chỉ trả đúng kind; admin
tách `/api/admin/project-categories` và `/api/admin/product-categories`, từ chối
gán sai kind và trả `409` khi xoá nhóm đang được tham chiếu. Chạy toàn bộ migration
cho state mới hoặc chỉ migration còn thiếu cho state đã có `0001`.

## Access và write policy

Tạo Cloudflare Access application bao phủ `/admin/*` và `/api/admin/*`. Worker
không chỉ tin header email: mọi request admin kiểm tra
`Cf-Access-Jwt-Assertion` RS256 với JWKS
`https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`, issuer, audience,
expiry và email claim khớp header Access lẫn `ADMIN_EMAILS`.

POST/PUT/DELETE/PATCH yêu cầu `Origin` đúng `PUBLIC_ORIGIN`; request thiếu
Origin cũng bị từ chối. Đây là default CSRF policy, nên script CLI không phải
write client production. Mọi write thành công được ghi `audit_log`.

## Content/media contract

- `pages`: only fixed IDs `home`, `residential`, `commercial`,
  `projects-products`, `about`; JSON VI/EN fixed fields `hero`, `intro`,
  `sections`, `cta`, `seo`.
- `project_categories`: six seeded project groups (`residential`, `commercial`,
  `kiosk-posm-project`, `mobile-retail`, `signage-project`, `light-boxes`) use
  positions 101–106; product groups retain positions 1–6. Admin category
  resources enforce the matching `kind` and protect referenced rows from delete.
- `projects`: only `compact-gallery`, `editorial-case`, `process-film`; category
  IDs must have `kind=project`; optional
  `menu_group` is `residential`, `commercial` or `projects-products`, and
  `menu_order` is an integer from 1 to 999. Records remain out of the menu when
  the group is null.
- `products`: category IDs must have `kind=product`; seed toàn bộ
  `reference-audit/Products.txt`, grouped by six ordered categories; Kiosk & POSM
  is default.
- Không có raw HTML/WYSIWYG. Admin sends text fields; server validates shape.
- Content media accepts WebP with RIFF size, WEBP and VP8/VP8L/VP8X validation.
  SVG only allowed for logo after strict rejection of scripts, events, refs and
  embedded/external content. Uploads begin as draft.

## Canonical and crawler behavior

Public only: `/vi/…`, `/en/…`, and project detail paths. Root, source shell
paths, and former Vietnamese paths one-hop 308 to `/vi/…`, retaining query.
Worker emits canonical, `vi`/`en`/`x-default` hreflang, OG/Twitter/JSON-LD,
`robots.txt` and `sitemap.xml`. Sitemap lists only published page/project URLs.

## Local verification

```powershell
$state = Join-Path $env:TEMP "truong-thinh-worker-state"
npx wrangler d1 migrations apply truong-thinh-cms --local --persist-to $state
npx wrangler dev --local --port 8787 --persist-to $state
```

Use another terminal for `node tests/worker/worker-contract.cjs` and
`node tests/site/site.e2e.cjs` with `BASE_URL=http://127.0.0.1:8787`. Do not deploy
without owner approval and real D1/R2/Access values.
