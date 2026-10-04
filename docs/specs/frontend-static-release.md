---
title: Đặc tả static release
type: frontend
status: accepted
updated: 2026-10-03
notion: none
related_decisions:
  - ../decisions/wrangler-deferred-until-cms.md
  - ../decisions/head-office-address-confirmed.md
  - ../decisions/cloudflare-workers-static-demo.md
related_reports: []
---

# Đặc tả static release

## Mục tiêu

Giữ website bilingual hiện có chạy và kiểm thử được bằng static runtime độc lập.
Phát triển và QA static không phụ thuộc CMS, Cloudflare Worker hoặc Wrangler;
chỉ bước deploy demo gọi Wrangler.

## Trong scope

- Năm page type public bằng tiếng Việt và tiếng Anh.
- Canonical locale page và localized content cho local preview bằng static Node
  server của repository.
- Static asset web-ready trong `assets/content/`; file nguồn tái biên tập nằm
  ngoài public build tree tại `source-assets/`.
- Build `.site-output/` từ `src/site/`, loại module, manifest, SVG và media
  chỉ dùng tại source hoặc không có public consumer trước khi đóng gói.
- Browser smoke coverage cho responsive và reduced motion.
- CI chạy static contract và browser smoke mà không khởi động Worker.

## Ngoài scope

- CMS editing, dynamic project publishing, authentication, D1 và R2.
- Production domain connection và owner data chưa được confirm.
- Worker route, redirect, SSR, D1/R2 binding và production deployment.
- UI redesign hoặc product feature mới.

## Acceptance criteria

1. Clone sạch install được bằng `pnpm install --frozen-lockfile`.
2. `pnpm qa:static` pass.
3. `pnpm qa:worker:security` pass không cần D1 hoặc R2.
4. `pnpm dev` chỉ chạy static Node server và phục vụ các route VI/EN đã khai báo.
5. Chromium smoke pass trong CI, không có console, page, network hoặc overflow
   failure.
6. Package và CI không cài Wrangler; chỉ `pnpm deploy:demo` gọi bản pin qua
   `pnpm dlx`. Không có CI deploy hoặc workflow CMS deploy.
7. Zalo, founding year và warranty claim vẫn unset cho tới khi owner confirm;
   address dùng owner fact đã accepted.

## Trình tự release

1. Chạy `pnpm dev` và verify route, CTA VI/EN trên local preview.
2. Merge pull request sau khi CI pass.
3. Owner đồng ý, rồi deploy demo theo mục dưới. Không tạo workflow deploy tự
   động khi CMS chưa activate.
4. Đổi hosting, domain hoặc mở CMS deployment cần decision và owner gate riêng.

## Phát hành demo Cloudflare — owner đồng ý 03/10/2026

Owner không còn dùng ChatGPT Sites; demo chuyển sang Workers static assets theo
[quyết định demo Cloudflare](../decisions/cloudflare-workers-static-demo.md).
Build dùng chung `ROUTES` và `localeHtml` với local server để tạo22 HTML VI/EN,
nên static hosting không cần server rewrite. `wrangler.static.toml` chỉ khai báo
asset `.site-output/`; không Worker script, không binding. `wrangler.toml` vẫn là
cấu hình CMS dormant.

Owner làm một lần trên máy local:

1. Tạo tài khoản Cloudflare miễn phí tại `dash.cloudflare.com/sign-up` và xác
   nhận email.
2. Trong repository: `pnpm install --frozen-lockfile`, rồi
   `pnpm demo:wrangler login`. Trình duyệt mở trang Cloudflare, bấm Allow.
   Không cần tạo API token; không dán token hay mật khẩu vào chat.
3. `pnpm deploy:demo --dry-run` để kiểm cấu hình mà không upload.

Mỗi lần phát hành:

1. Checkout commit GitHub đã qua CI, chạy `pnpm qa:static`.
2. `pnpm deploy:demo`. Lần đầu Wrangler hỏi tên subdomain `workers.dev`; URL demo
   là `https://truong-thinh-demo.<subdomain>.workers.dev/vi/`.
3. Mở `/vi/` và `/en/`, kiểm route chính; ghi commit GitHub, Worker version ID
   và URL vào evidence release.

Lần deploy đầu 2026-10-03: source `src/site/` của `ffd7a2e`, Worker version
`035423fd-b05b-4024-b44f-b3dcbf2d8239`, URL
`https://truong-thinh-demo.truong-thinh-project-tooling.workers.dev/vi/`; `/vi/`,
`/en/`, trang con và asset trả 200, path sai trả 404.

Deploy 2026-10-04 (owner yêu cầu trong thread M02b): `main` `9478ed8`, có
PR #26, Worker version `d6ad9a03-1108-4276-ab63-84aabdaad521`. 10 route chính
VI/EN trả 200, ảnh nội dung bọc `<picture>` có nguồn AVIF, `.avif` trả
`Content-Type: image/avif`; A05s thật mở `/vi/` không ảnh hỏng, không lỗi JS.
Asset hiện trả `Cache-Control: max-age=0, must-revalidate`.

Rollback: `pnpm demo:wrangler rollback --config wrangler.static.toml`
hoặc chọn deployment cũ trong Cloudflare dashboard. Changelog ghi thay đổi và
known limitations; focused PASS không đổi verdict full-site parity.

Phân loại website, test, CMS và dữ liệu local theo [cây ownership](../../README.md#cây-thư-mục-và-trạng-thái).
Build chỉ lấy `src/site/` và vendor khai báo; không đặt test trong source website
hoặc dùng repository root làm static directory.

## Tự host font, thư viện và cache (chờ owner duyệt)

Mục đích: đường render đầu không chờ origin bên thứ ba. P11 đo LCP text trên
residential và commercial phụ thuộc Google Fonts và jsDelivr
([kết quả](static-image-delivery.md#pipeline-biến-thể-đã-triển-khai-2026-10-04)).
Asset có version trong tên được cache dài; HTML và code app vẫn revalidate.

### R1. Font tự host

Plus Jakarta Sans variable (wght 200–800, normal và italic) lấy từ npm
`@fontsource-variable/plus-jakarta-sans@5.3.0` (OFL, kèm LICENSE), build chép
subset latin, latin-ext, vietnamese vào `/assets/vendor/plus-jakarta-sans-5.3.0/`;
bỏ cyrillic-ext. `@font-face` nằm đầu `style.css`, giữ tên family
`Plus Jakarta Sans`, `font-display: swap`, `unicode-range` theo package. HTML
preload hai file normal latin và vietnamese.

```gherkin
Given build từ src/site/
When mở bất kỳ route VI/EN nào với cache trống
Then không có request tới fonts.googleapis.com hoặc fonts.gstatic.com
And chữ hiển thị bằng Plus Jakarta Sans, đủ dấu tiếng Việt
```

### R2. Thư viện CDN tự host

Locomotive Scroll `4.1.4` (JS và CSS) và `@barba/core` `2.10.3` cài từ npm, build
chép vào `/assets/vendor/` giống gsap. HTML trỏ path local, bỏ `integrity` và
`crossorigin` vì cùng origin. Giữ nguyên version và thứ tự `defer`, không đổi
behavior.

```gherkin
Given build từ src/site/
When mở route bất kỳ
Then không có request tới cdn.jsdelivr.net
And chuyển trang Barba và smooth scroll desktop chạy như trước
```

### R3. Cache header

`src/site/_headers` (Workers static assets đọc file này, không phục vụ ra ngoài):

| Path | `Cache-Control` | Lý do |
| --- | --- | --- |
| `/assets/vendor/*` | `public, max-age=31536000, immutable` | Tên có version |
| `/assets/content/*`, `/assets/brand/*` | `public, max-age=86400, stale-while-revalidate=604800` | Tên không có hash; ảnh thay cùng tên lộ ra trong một ngày |
| HTML, `style.css`, `motion.js`, `detail.*`, `*.mjs` | Mặc định Cloudflare `max-age=0, must-revalidate` + ETag | Đổi mỗi deploy, tên không có version |

```gherkin
Given demo đã deploy bản có _headers
When request /assets/vendor/gsap-3.15.0.min.js
Then Cache-Control là public, max-age=31536000, immutable
When request /vi/
Then Cache-Control vẫn là max-age=0, must-revalidate
```

### Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1, R2 | `pnpm qa:site` (static contract không còn host ngoài), Network trên local preview |
| R3 | `wrangler dev --config wrangler.static.toml` rồi đọc header |
| Gate LCP | Đo demo cùng cohort P11 sau deploy (cần owner đồng ý) |

Cloud không truy cập được `workers.dev` (proxy trả 403), nên số đo demo chạy
trên PC hoặc sau khi owner thêm host vào network của environment.

## Chú thích thuật ngữ

- **Static release**: lần phát hành dựa trên asset tĩnh, không cần CMS runtime.
- **Quality gate**: kiểm tra bắt buộc phải pass trước release.
- **Smoke test**: kiểm tra nhanh các đường đi và behavior quan trọng.
- **Local preview**: website phục vụ trên máy phát triển để kiểm tra output.
- **Binding**: cấu hình kết nối Worker tới resource như D1 hoặc R2.
- **Workers static assets**: Cloudflare phục vụ file tĩnh từ Worker, không cần code.
- **Worker version ID**: mã Cloudflare cấp cho mỗi lần deploy, dùng để rollback.
- **Preload**: thẻ báo browser tải sớm file cần cho lần vẽ đầu.
- **Immutable**: browser dùng lại bản cache, không hỏi lại server khi còn hạn.
- **LCP**: thời điểm phần tử lớn nhất trong khung nhìn đầu được vẽ.
