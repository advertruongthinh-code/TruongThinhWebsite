---
title: CMS Worker, admin và D1
status: dormant
source:
  - src/worker/**
  - src/db/migrations/**
  - wrangler.toml
tests:
  - tests/worker/worker-contract.cjs
  - tests/worker/worker-static-contract.cjs
  - tests/worker/advertising-detail-route.test.mjs
notion: https://app.notion.com/p/3e8332849a0e816eb46ece5834b67178
updated: 2026-11-01
---

# CMS Worker, admin và D1

## Mục đích

Phase CMS để owner tự đăng nội dung VI/EN (chữ, ảnh, video) qua layout đã duyệt; website tĩnh luôn là fallback và
đường rollback. Spec mô tả code dormant đang có: Worker route, SEO, API, admin, schema D1, upload R2. Chưa phần nào
chạy trên demo; phát hành chính thức trên `truongthinhads.vn` cần xong phase này (owner 2026-10-18). Build và demo thuộc [phát hành tĩnh](static-release.md#r12-ranh-giới-với-cms-dormant). Mở phase theo [điều kiện](#điều-kiện-mở-cms-phase) trong "Gate còn mở". AI agent của CMS dùng [Stack AI và media](../operations/TOOLING.md#stack-ai-và-media) (owner 2026-10-18).

## Hành vi

### R1. Cấu hình Worker dormant

`wrangler.toml` khai Worker `truong-thinh-website`, `main = "src/worker/index.js"`, binding `ASSETS` trỏ `.site-output`
(`force-trailing-slash`, `404-page`), `run_worker_first` cho `/`, `/vi/*`, `/en/*`, path legacy, `/api/*`, `/media/*`,
`/robots.txt`, `/sitemap.xml` (không có `/admin/*`). Không khai binding D1 (`DB`), R2 (`MEDIA`) hay biến, nên Worker
theo file này luôn đi nhánh không có `DB`. Không script nào trong `package.json` trỏ tới file (demo dùng `wrangler.static.toml`). Build chỉ chép `src/site/`, nên `.site-output/` không có `src/admin/`. Chạy local: `pnpm cms:dev` (`scripts/cms/dev-local.mjs`) chạy `prepare:site`, dựng admin vào `.site-output/admin/` ([editor R9](cms-editor.md#r9-chạy-local-và-ci)), áp migration lên D1 local rồi `wrangler dev` cổng 8788 theo `scripts/cms/wrangler.local.toml` (D1 `DB`, R2 `MEDIA` giả lập trong `.wrangler/`, biến `CMS_LOCAL_ADMIN_EMAIL`), `--setup-only` dừng sau migration; file đó không deploy, `prepare:site` xóa output nên bản demo không chứa admin.

```gherkin
Given wrangler.toml hiện tại
When đọc khai báo binding và biến
Then chỉ có binding ASSETS, không có DB, MEDIA hay vars
And không script nào trong package.json trỏ tới wrangler.toml
```

### R2. Redirect, route locale, robots và sitemap

`handleRequest()` xét theo thứ tự: host `admin.*` thì `/` 308 sang `/admin/`; `/admin*`, `/api/admin*` trên host không phải
`admin.*` hay loopback trả 404 (CMS ở `admin.truongthinhads.vn`, web ở www); redirect, `/robots.txt`, `/sitemap.xml`, `/api/`, `/media/`, `/admin` (308 sang
`/admin/`), `/admin/*` (trả thẳng `ASSETS`, Worker không kiểm quyền), route locale, còn lại `ASSETS`. `routeRedirect()`
trả 308, giữ query: `/`, `/index.html` sang `/vi/`; `LEGACY_ROUTES` (`/nha-o`, `/kinh-doanh`, `/quang-cao`,
`/gioi-thieu`) và `SOURCE_ROUTE_REDIRECTS` (path không locale, `projects-products` ở mọi locale) sang trang tương ứng;
`/<locale>/<path>/index.html` sang `/<locale>/<path>/`; `/vi`, `/en` thêm `/`. `parseLocaleRoute()` nhận trang chủ,
bốn trang con, sáu trang tương thích `advertising-products/<slug>/` (`ADVERTISING_DETAIL_SLUGS`) và
`projects/<slug>/`; path thiếu `/` cuối được 308 về `canonicalRoutePath()`. `/robots.txt` chặn `/admin/`,
`/api/admin/`, ghi URL sitemap. `/sitemap.xml` không có `DB`: năm trang nhân hai locale và 12 trang tương thích; có
`DB`: trang có dòng `pages` published, 12 trang tương thích, mọi project published. Hai file cache 300 giây; lỗi 503.

```gherkin
Given Worker chạy với ASSETS
When request /quang-cao/?keep=1
Then status 308 tới /vi/advertising-products/?keep=1
And /vi/about trả 308 tới /vi/about/; /sitemap.xml không có DB liệt kê 22 URL
```

### R3. Render trang locale và nội dung D1

`renderRoute()` lấy HTML tĩnh qua `ASSETS` (trang tương thích dùng `advertising-products/<slug>/index.html`) rồi
`HTMLRewriter`: đặt `lang`, `data-route-locale`; bản EN thay chữ `data-en` và `alt`, `aria-label`, `content` từ
`data-en-*`, giữ bản Việt ở `data-vi-*`; link nội bộ đổi prefix locale trừ `[data-language-option]`; `<head>` thêm
canonical, `hreflang` vi, en, `x-default` (trỏ bản vi), Open Graph, Twitter card, JSON-LD `Organization`. Origin lấy
từ `PUBLIC_ORIGIN`, không có thì từ request; header `Content-Language`, `Vary: Accept-Language`. Không có `DB`: SEO
dùng `DEFAULT_SEO`, trang project trả 404.

Có `DB` (trừ trang tương thích, không bao giờ đọc D1): `publishedPage()` đọc dòng `pages` `published` theo
`CMS_PAGE_IDS` (`advertising-products` là `projects-products`); không có dòng hoặc thiếu nội dung locale thì 404, D1
lỗi thì 503. `<title>`, meta description lấy `seo` của locale; phần tử `[data-cms="<path>"]` nhận chữ ở path đó, chỉ
dạng text. HTML tĩnh chỉ có `data-cms="hero.kicker"` ở residential, commercial, advertising-products, about
([hook](detail-pages.md#r4-nội-dung-vien-và-hook)). `/<locale>/projects/<slug>/` dùng `publishedProject()` (slug
kebab-case, project `published` thuộc category `kind = 'project'`), khung `advertising-products/index.html`, cùng quy
tắc 404, 503. Field `template` không đổi cách render. Bốn trang editor và Sản phẩm Quảng cáo có nội dung editor đã lưu
thì Worker áp trước pipeline này, chỗ editor sửa thắng `data-cms` và SEO ([editor R10](cms-editor.md#r10-worker-áp-nội-dung-đã-lưu)).

```gherkin
Given Worker không có binding DB
When request /en/about/
Then status 200, Content-Language en, html lang="en", canonical <origin>/en/about/, x-default trỏ <origin>/vi/about/
And khi có DB: /vi/commercial/ lấy title, hero.kicker từ D1; D1 lỗi trả 503; không có dòng published trả 404
And /en/advertising-products/print-decals/ không gọi DB
```

### R4. API public

- `GET /api/public/projects`: `{ categories, items }`. Category `kind = 'project'` theo `position`. Item là project
  `published` có `menu_group` thuộc `residential`, `commercial`, `projects-products`, sắp theo group, `menu_order`
  (trống xếp cuối), slug; cần tên VI và EN (từ `name`, `title`, `hero.title` hoặc `hero.qualifier`), thiếu thì bỏ.
- `GET /api/public/projects/<slug>`: dòng project published dạng JSON; slug sai dạng hoặc không có thì 404; không có
  `DB` hoặc D1 lỗi thì 500 (`CmsUnavailableError` không được bắt).
- `GET /api/public/products`: category `kind = 'product'` và product `published` theo category, `position`.
- Không có `DB`: hai API danh sách trả mảng rỗng. Path `/api/` khác: 404 JSON. Lỗi không bắt ở mọi route: 500
  `{"error":"Internal Server Error"}`.

```gherkin
Given D1 trả năm project, chỉ hai có group hợp lệ và đủ tên VI, EN
When GET /api/public/projects
Then items chỉ gồm hai project đó, sắp theo menu_order rồi slug
And GET /api/public/projects/abc khi không có DB trả 500
```

### R5. Xác thực admin

Mọi `/api/admin/*` qua `requireAdmin()`: `Cf-Access-Jwt-Assertion` là JWT RS256 có `kid`, base64url chuẩn; `iss` bằng
`ACCESS_TEAM_DOMAIN` (https, đuôi `.cloudflareaccess.com`, path `/`); `aud` thuộc `ACCESS_AUD`; `exp` chưa qua, `nbf`
không quá 60 giây tới; chữ ký khớp key từ `<team>/cdn-cgi/access/certs` (cache 1 giờ); `email` trùng
`Cf-Access-Authenticated-User-Email` và nằm trong `ADMIN_EMAILS`, không phân biệt hoa thường. Sai điều nào: 403.
Request ghi (POST, PUT, DELETE, PATCH) còn cần `Origin` bằng origin của chính request (không dùng `PUBLIC_ORIGIN`, vì CMS ở subdomain khác), không thì 403. Ngoại lệ local: `CMS_LOCAL_ADMIN_EMAIL` có giá trị và host request là `127.0.0.1`, `localhost`, `[::1]` hoặc `admin.localhost` thì email đó là admin, không cần JWT; host khác vẫn qua Access dù biến bị đặt.

```gherkin
Given env có ACCESS_TEAM_DOMAIN, ACCESS_AUD, ADMIN_EMAILS
When gọi /api/admin/* với token thiếu, giả chữ ký, hết hạn, sai issuer, sai audience hoặc sai email
Then mọi endpoint trả 403
And POST /api/admin/media với token đúng nhưng Origin lạ trả 403
```

### R6. CRUD nội dung và audit

`/api/admin/<resource>[/<id>]`, resource `pages`, `projects`, `products`, `project-categories`, `product-categories`,
`settings`: GET trả mọi dòng (cả nháp); POST, PUT validate rồi upsert theo id (201 hoặc 200, `{ item }`); DELETE xóa
(204), thiếu id 400; method khác 405. Body phải `application/json`; lỗi validate 400. Id khớp
`^[a-z0-9][a-z0-9-]{0,79}$`; `status` chỉ `draft` hoặc `published`.

- page: id thuộc năm id CMS; VI và EN đều có `hero.kicker`, `qualifier`, `title`, `motto`, `intro`, `cta.label`,
  `seo.title`, `seo.description` (chữ không rỗng, tối đa 5000 ký tự) và mảng `sections` (phần tử không kiểm); field
  khác được lưu nguyên.
- project: slug kebab-case, `template` thuộc `compact-gallery`, `editorial-case`, `process-film`, category
  `kind = 'project'`, `menu_group` tùy chọn trong ba group, `menu_order` 1 đến 999.
- product: `position` nguyên dương, category `kind = 'product'`, tên VI và EN. setting: `value` là object JSON.
- category: `position` 1 đến 9999, nhãn VI, EN, `cover_path` bắt đầu bằng `/`; xóa category sai loại 400, không có
  404, đang được project hoặc product dùng 409.

Mỗi lần ghi thêm một dòng `audit_log` (email, hành động `upsert`, `delete`, `upload`, `approve`, resource, id, chi
tiết); `GET /api/admin/audit-log` trả 200 dòng mới nhất.

```gherkin
Given admin đã xác thực và còn product thuộc category kiosk-posm
When DELETE /api/admin/product-categories/kiosk-posm
Then status 409 với lỗi "Category is in use." và category không bị xóa
```

### R7. Upload và phát media

`POST /api/admin/media` (multipart): file tối đa 10 MB (`content-length` lớn hơn trả 413, file lớn hơn 400); `kind` là
`logo`, khác đi là `image`. Chỉ nhận WebP đúng cấu trúc RIFF (một chunk VP8 hoặc VP8L; VP8X chỉ kèm ICCP, EXIF, XMP)
khai `image/webp`, hoặc với `logo` là SVG UTF-8 khai `image/svg+xml`, tối đa 256 KB, qua `isSafeSvg()` (cho namespace SVG chuẩn, không script,
`foreignObject`, `iframe`, `object`, `embed`, `image`, `use`, `a`, animation, `on*`, `style`, `href`, `url(`, URL
`http`, `javascript:`, `data:`, `@import`, doctype, entity). Đạt thì ghi R2 `MEDIA` tại `media/<uuid>.webp|svg`, thêm dòng `media` `draft` với alt VI,
EN (được trống), trả 201. `PUT /api/admin/media/<id>` đặt `status`, `approved_at`, `approved_by` theo `approved`, không
kiểm id tồn tại. `GET`, `HEAD /media/<id>` chỉ phát media `published` đã duyệt, `Cache-Control: public, max-age=0,
must-revalidate`, ETag; SVG thêm CSP `default-src 'none'; style-src 'unsafe-inline'; sandbox`, `nosniff`; còn lại 404/405. File tải lên chính là file public: không giữ gốc riêng,
không sinh biến thể, không nhận AVIF, PNG, JPEG, video.

```gherkin
Given admin đã xác thực
When upload "not a WebP" khai image/webp, WebP VP8X rỗng hoặc SVG logo có <script>
Then status 400 và không ghi object nào vào MEDIA
And upload một WebP hợp lệ trả 201 và ghi đúng một object
```

### R8. Giao diện admin

`/admin/` là [editor placeholder](cms-editor.md); form cũ ở `src/admin/forms.html` (tiếng Việt, `noindex, nofollow`, `admin.css` riêng) và module `admin.js`: nút sáu resource,
danh sách bản ghi, form theo resource gửi POST (mới) hoặc PUT (đã có) rồi tải lại. Xoá hỏi `confirm`, ẩn với page;
page chỉ chọn trong năm id, không tạo mới. Nội dung VI, EN nhập theo field; `sections` mỗi dòng `tiêu đề | nội dung`,
chỉ chữ. Project chọn template, category, nhóm và thứ tự menu; product nhập tên VI, EN và media ID. Form media nhận
WebP hoặc logo SVG kèm alt VI, EN; mỗi media có nút "Xuất bản + duyệt" hoặc "Ẩn". Không form nào có trường span.

```gherkin
Given admin mở /admin/forms.html sau khi qua Access
When chọn Trang, chọn home, sửa SEO title tiếng Việt rồi bấm Lưu
Then admin gửi PUT /api/admin/pages/home với nội dung VI và EN
And trạng thái hiện "Đã lưu." rồi danh sách tải lại
```

### R9. Schema D1 và migration

Năm file SQL forward-only trong `src/db/migrations/`, không có migration lùi; `wrangler.toml` chưa khai D1 nên chưa có
lệnh áp. `0001_cms.sql`: bảng `pages`, `project_categories`, `projects`, `products`, `settings`, `media`, `audit_log`;
CHECK cho `status`, `template`, `content_type` (`image/webp`, `image/svg+xml`), `kind` media, `json_valid` cột JSON;
bốn index; seed sáu category sản phẩm, năm page `published`, 36 product. `0003`: thêm `kind` (`project`, `product`,
mặc định `product`), `updated_at` cho category, `menu_group`, `menu_order` cho project, index menu; seed sáu category
project (`position` 101 đến 106); chuyển project đang gắn category sản phẩm sang category project gần nhất. `0002` và
`0004` đổi chữ hero, SEO của page `projects-products`; tên public cuối là "Sản phẩm Quảng cáo" / "Advertising products".
`0005`: bảng `page_edits` cho nội dung editor đã lưu ([editor R10](cms-editor.md#r10-worker-áp-nội-dung-đã-lưu)).

```gherkin
Given D1 trống
When áp lần lượt 0001 đến 0004
Then page projects-products có hero qualifier "Sản phẩm" và title "Quảng cáo"
And GET /api/public/products trả 36 product và sáu category theo position
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Binding | `ASSETS`, `DB` (D1), `MEDIA` (R2) | `ASSETS` khai trong `wrangler.toml`; `DB`, `MEDIA` chưa khai |
| Biến | `PUBLIC_ORIGIN`, `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, `ADMIN_EMAILS` | Origin canonical, sitemap, kiểm `Origin`; xác thực admin (R5); chưa đặt ở đâu trong repo |
| Header | `Cf-Access-Jwt-Assertion`, `Cf-Access-Authenticated-User-Email`, `Origin` | Đầu vào R5 |
| DOM hook | `[data-cms]`, `[data-language-option]` | Path nội dung D1; link đổi ngôn ngữ giữ prefix (R3) |
| Endpoint | `/api/public/*`, `/api/admin/*`, `/media/<id>` | R4, R6, R7 |
| Hằng | `SOURCE_ROUTES`, `CMS_PAGE_IDS`, `ADVERTISING_DETAIL_SLUGS`, `PROJECT_TEMPLATES`, `MAX_UPLOAD_BYTES` | Trong `src/worker/index.js` |
| Command | `pnpm qa:worker:security`, `pnpm qa:worker:static`, `pnpm qa:worker` | Security fixture chạy CI; hai lệnh sau cần Worker chạy ở `BASE_URL` |

## UI

Admin dùng `admin.css` riêng, không thuộc Design System và không đưa token admin vào route public
([Design System](../../design-system/README.md#dont)). Trang public do Worker render giữ UI của spec từng trang.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1 | chưa có test; đọc `wrangler.toml`, `package.json`; local: `node scripts/cms/dev-local.mjs --setup-only` |
| R2 | `tests/worker/worker-static-contract.cjs` (cần Worker chạy); `tests/site/advertising-products-detail-routes.test.mjs` kiểm sáu slug |
| R3 | `node tests/worker/advertising-detail-route.test.mjs`; `pnpm qa:worker:security` (thiếu page published trả 404); `worker-static-contract.cjs`; ca D1 `/en/about/` của "SSR CMS survives hydration" trong `site.e2e.cjs` chỉ chạy với `TT_E2E_D1=1` và `BASE_URL` là Worker có D1 seed (bản tĩnh kiểm chữ tĩnh giữ nguyên) |
| R4 | phần public `tests/worker/worker-contract.cjs` (menu feed, catalog; cần Worker chạy) |
| R5 | `pnpm qa:worker:security` (CI), gồm ca đăng nhập dev trên host public và loopback |
| R6 | chưa có test |
| R7 | `pnpm qa:worker:security` (upload, logo canonical, SVG GET/HEAD và CSP) |
| R8 | chưa có test |
| R9 | phần public `tests/worker/worker-contract.cjs` (category, 36 product; cần D1 thật) |

## Gate còn mở

Không activate Worker, nối Wrangler cho CMS, deploy, tạo hay đọc secret, đổi domain khi owner chưa mở phase
([khóa Wrangler](../decisions/wrangler-deferred-until-cms.md)). Mỗi slice giữ route tĩnh đọc được khi CMS không chạy;
không page builder đa dụng, không multi-tenant, không thay source tĩnh.

### Điều kiện mở CMS phase

Owner đóng, theo thứ tự: (1) bản tĩnh ổn định trên demo, owner xác nhận đường rollback; (2) owner chốt vai trò biên tập,
quy trình review và publish, domain production; (3) kiểm lại tài liệu chính thức về provider, D1, R2, Access, region,
retention, backup, giới hạn, chi phí; (4) có decision được duyệt cho provider và storage, schema, ranh giới bảo mật;
(5) owner mở implementation slice rõ ràng; Wrangler chỉ activate trong slice đó: pin lại, phục hồi CI và deploy, Worker
contract đạt trên runtime thật. Sau đó agent làm từng slice, owner duyệt gate: Discovery (vai trò, workflow, ràng buộc
provider, rollback; gate quyết định owner và tài liệu chính thức), Contract (nội dung VI/EN, media kind, alt, poster,
trạng thái publish, allowlist `layoutKey`, ít preset nhất; gate cập nhật spec này), Storage (một post type, một luồng
media; gate migration có snapshot, backup, retention, đường lùi), Publishing (draft, review, publish, unpublish,
audit, idempotent, xử lý lỗi; gate test contract, security, integration), Public projection (renderer deterministic,
fallback tĩnh; gate mẫu parity, browser, accessibility, diễn tập rollback; giữ nội dung tĩnh tới khi đạt).

### Quyết định owner chưa chốt

- Provider, storage, region, backup, chi phí: Workers, D1, R2 chỉ là hướng ưu tiên ([goal](../goal.md#nguyên-tắc-hạ-tầng)).
- [CẦN LÀM RÕ: team domain Access, audience, email admin, domain production cho `PUBLIC_ORIGIN`; kiểm `Origin` có đủ
  thay CSRF token không; rate limit ở Worker hay Cloudflare?]
- [CẦN LÀM RÕ: `src/admin/` không có trong `.site-output/`, `/admin/*` không chạy Worker trước; admin phục vụ từ đâu,
  Access bảo vệ path nào?] Agent đề xuất ở slice Contract.
- [CẦN LÀM RÕ: vai trò biên tập (không có bước duyệt, owner 2026-10-31); `template` có là `layoutKey` không, preset nào launch
  trước; giới hạn cỡ, loại file và danh sách cỡ biến thể media?]
- [CẦN LÀM RÕ: khi có `DB`, trang trả 404, 503 như R3 (theo [D1 SSR ưu tiên](../decisions/d1-ssr-static-fallback.md))
  hay phục vụ bản tĩnh như invariant fallback dưới?]

### Code chưa đạt invariant đã duyệt (agent sửa khi owner mở slice)

- Fallback: dữ liệu invalid, thiếu, chưa publish hoặc D1 không có không được phá trang public; code trả 404, 503 ở
  route trang (R3) và 500 ở `/api/public/projects/<slug>` (R4).
- Media gốc (owner 2026-10-03): giữ gốc ở storage private, public chỉ dùng biến thể cùng chuẩn site tĩnh
  ([tải ảnh R1](media-delivery.md#r1-biến-thể-ảnh-nội-dung)): ảnh AVIF kèm WebP các cỡ chuẩn, video AV1/WebM kèm MP4
  H.264 và poster; media cần alt. Code lưu nguyên WebP, SVG làm bản public, alt được trống, không có video (R7).
- Nội dung có cấu trúc: định danh post, trạng thái publish, media có thứ tự, kind ảnh hoặc video, alt, poster,
  `layoutKey` allowlist do contract frontend sở hữu; từ chối raw HTML, CSS, code component; contract render public có
  trước editor, registry preset nhỏ, media tách khỏi metadata. Code lưu nguyên `sections` và field lạ, render chỉ
  text, `template` không đổi render.
- Lệnh admin có kiểu (create, update, submit, publish, unpublish, upload media) và read contract public, mỗi lệnh định
  nghĩa validation, xác thực, phân quyền, conflict, rate limit, lỗi storage; publish idempotent, dọn orphan, lỗi quan
  sát được; editor và layout public dùng được bằng bàn phím. Code chỉ upsert, xóa chung, đặt `status` thẳng, có audit
  log, không rate limit, xóa bản ghi không xóa object R2.
- Masonry Advertising khi CRUD (card Notion của spec): thêm, sửa, xóa ảnh, tag, phân loại mà masonry, filter, related,
  skeleton giữ contract tĩnh; adapter snapshot CMS có version; filter, menu, taxonomy sinh từ dữ liệu; xử lý card đang
  mở bị xóa, nhóm rỗng, invalidation cache; form ảnh không có trường span
  ([masonry R5](advertising-masonry.md#r5-hình-học-masonry)). Code: masonry đọc `catalog.mjs`, không đọc D1; D1 không
  có tag; category sản phẩm seed (`signage-3d`, `office-wayfinding`, `led-lighting`, `print-marketing`,
  `brand-showroom`) khác category Advertising tĩnh. Owner duyệt capability map và spec CRUD trước code.
- SEO media ([media-seo](media-seo.md), owner 2026-10-18): nhân viên chỉ nhập tên, mô tả card và alt VI/EN từng media
  (bắt buộc, không trùng trong card, CMS điền sẵn gợi ý được); hệ thống tự sinh trang card, canonical, og:image, JSON-LD,
  image sitemap (Worker `/sitemap.xml` trỏ `sitemap-advertising.xml`) và tên file upload theo tên sản phẩm.
- [Slot project trong menu](../decisions/optional-cms-project-slots.md) chỉ áp dụng khi dựng lại `data-menu-projects`;
  `src/site/` chưa có slot nên menu feed R4 chưa có consumer.
- Seed và test lệch source: cover category seed trỏ `/assets/site/...` không có trong `src/site/`; phần public
  `worker-contract.cjs` chờ `data-cms="hero.qualifier"`, `hero.title` ở advertising-products và kicker commercial khác
  cả HTML tĩnh lẫn seed (suy luận: `pnpm qa:worker` sẽ fail; chưa chạy vì cần runtime Wrangler).
- Test cần có: contract nội dung và `layoutKey`; upload (loại, cỡ, kind, poster, alt, orphan); integration draft,
  review, publish, unpublish, fallback; security (xác thực, CSRF, phân quyền, rate limit, audit); regression CRUD
  end-to-end trên All, filter, related, batch; browser cho editor và từng preset. Hiện chỉ fixture R5, R7 chạy CI.

## Chú thích thuật ngữ

- **Worker**: code Cloudflare chạy ở biên, xử lý route, API và render.
- **D1, R2**: database SQL và object storage của Cloudflare, ứng viên cho CMS, chưa chọn chính thức.
- **Access**: lớp đăng nhập Cloudflare đặt trước admin, cấp JWT (token có chữ ký) cho request.
- **Upsert**: ghi mới hoặc cập nhật nếu id đã có.
- **Allowlist**: tập giá trị được phép, như template hay email admin.
- **Slice**: phần việc nhỏ owner mở riêng, có gate duyệt.
- **Orphan**: object media không còn bản ghi nào dùng.
- **Idempotent**: chạy lại cùng thao tác không tạo tác dụng trùng.
