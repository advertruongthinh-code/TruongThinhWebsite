---
title: Phát hành tĩnh
status: live
source:
  - scripts/site/prepare-static-assets.mjs
  - scripts/site/non-public-source-assets.mjs
  - scripts/site/sanitize-client-logos.ps1
  - scripts/site/sync-brand-lockup.mjs
  - scripts/tooling/serve-static-parity.mjs
  - src/site/_headers
  - wrangler.static.toml
  - .github/workflows/ci.yml
tests:
  - tests/site/static-locales.test.mjs
  - tests/site/advertising-products-detail-routes.test.mjs
  - tests/site/advertising-products-static.test.mjs
  - tests/site/site-static-contract.cjs
  - tests/site/cross-browser.smoke.spec.cjs
  - tests/site/client-logo-assets-contract.cjs
  - tests/site/orphan-selectors.test.mjs
notion: https://app.notion.com/p/3ef332849a0e81f3ad86f1fd913afab7
updated: 2026-10-07
---

# Phát hành tĩnh

## Mục đích

Biến `src/site/` thành `.site-output/` tĩnh VI/EN, phục vụ local preview cổng 8787 và đẩy cùng output lên demo
Cloudflare khi owner đồng ý. Không cần D1, R2, Access hay CMS secret. Hành vi từng trang thuộc spec của capability đó;
spec này giữ build, preview, cache header, CI và deploy demo. CMS Worker nằm ngoài.

## Hành vi

### R1. Build `.site-output/` từ `src/site/`

`pnpm prepare:site` (`scripts/site/prepare-static-assets.mjs`, cũng chạy đầu `pnpm dev` và `pnpm deploy:demo`) dừng
nếu source hoặc output ra ngoài project. Thứ tự: đồng bộ brand lockup, preflight (R2), xóa `.site-output/`, chép
`src/site/`, vendor (R4), xóa asset không public (R3), artifact (R2),
trang tương thích (R7), xử lý HTML (R5, R6), 22 route locale (R5). Bước đầu `sync-brand-lockup.mjs` ghi vào source:
chép hình học `assets/brand/truong-thinh-lockup.svg` vào hai lockup inline của năm HTML trang; SVG gốc sai số `path`,
`text` thì build dừng.

```gherkin
Given src/site/ và node_modules đã cài
When chạy pnpm prepare:site
Then .site-output/ được tạo lại từ đầu chỉ từ src/site/ và vendor khai báo
```

### R2. Preflight masonry và catalog artifact

Trước khi xóa output cũ, build tạo artifact (`buildAdvertisingArtifact()`) và
chạy `compileAdvertisingLayout` ở 320, 390, 768, 1024, 1440, 1920, 2560 px với
filter `all` và sáu category. Filter có card mà layout báo `needs-media` hoặc
thiếu vị trí thì build dừng. Artifact chỉ nằm ở output:
`advertising-products/catalog-artifact.mjs`, export `ADVERTISING_CATALOG_ARTIFACT`.

```gherkin
Given một category có card nhưng layout ở 390 px thiếu vị trí
When chạy pnpm prepare:site
Then build dừng với lỗi "Advertising public grid preflight failed for <category> at 390px"
And .site-output/ của lần build trước vẫn còn nguyên
```

### R3. Loại asset không public

`scripts/site/non-public-source-assets.mjs` liệt kê 16 path trong `src/site/`
chỉ dùng cho build, test hoặc làm nguồn: module catalog, media contract, media
manifest, photo tags, `content/client-logos.json`, SVG lockup gốc, ảnh cover và
process cũ. Build xóa chúng khỏi output. WebP không còn tham chiếu thì xóa khỏi repo.

```gherkin
Given src/site/advertising-products/catalog.mjs nằm trong danh sách non-public
When build xong
Then .site-output/advertising-products/catalog.mjs không tồn tại
And .site-output/advertising-products/catalog-artifact.mjs tồn tại
```

### R4. Font và thư viện tự host

Build chép từ `node_modules` vào `/assets/vendor/`, version trong tên: Masonry
4.2.2, lazysizes 5.3.2, GSAP, SplitText 3.15.0, Locomotive Scroll 4.1.4, Barba
2.10.3, Swiper 14.2.0 (ESM, `swiper.css` ghép ba file) và Plus Jakarta Sans 5.3.0
(latin, latin-ext, vietnamese, normal và italic, kèm LICENSE). `@font-face` đầu
`style.css` dùng `font-display: swap`; năm HTML trang preload hai file normal
latin, vietnamese. HTML không trỏ Google Fonts, jsDelivr.

```gherkin
Given build từ src/site/
When mở bất kỳ route VI/EN nào với cache trống
Then không có request tới fonts.googleapis.com, fonts.gstatic.com hoặc cdn.jsdelivr.net
And chữ hiển thị bằng Plus Jakarta Sans tự host, đủ dấu tiếng Việt
```

### R5. Văn bản song ngữ và route locale

Mọi HTML output: phần tử có `data-en` mà chưa có `data-vi` được thêm `data-vi`
từ chữ của chính nó; đếm lệch thì build dừng và nêu file. Rồi build ghi 22
route trong `ROUTES` (năm trang và sáu trang tương thích, VI và EN) bằng
`localeHtml(html, locale)`: đặt `lang`, `data-route-locale`; bản EN thay chữ
`data-en` và `alt`, `aria-label`, `content` từ `data-en-*`, giữ bản Việt ở
`data-vi-*`; link nội bộ đổi sang `/<locale>/...`, trừ `[data-language-option]`.
Preview (R8) dùng cùng hàm nên host tĩnh không cần rewrite.

```gherkin
Given output đã build
When so .site-output/en/about/index.html với localeHtml(.site-output/about/index.html, "en")
Then hai chuỗi bằng nhau
And thẻ html có lang="en" và data-route-locale="en"
```

### R6. Ảnh nội dung bọc `<picture>`

`<img>` có `src` hoặc `data-src` là WebP dưới `/assets/content/` được bọc
`<picture>` với source AVIF khi có `.avif` cùng tên. Có biến thể 480, 960 nhỏ
hơn `width` thì thêm `srcset` (hoặc `data-srcset`) và `sizes`. Ảnh đã có
`srcset`, có attribute `data-advertising-*` hoặc thiếu AVIF giữ nguyên. Pipeline
biến thể thuộc [tải ảnh R1](media-delivery.md#r1-biến-thể-ảnh-nội-dung).

```gherkin
Given <img src="/assets/content/a.webp" width="1600"> có a.avif, a-480.*, a-960.* cạnh nó
When build
Then ảnh nằm trong <picture> có source AVIF với srcset 480w, 960w, 1600w
And <img data-advertising-photo-background> giữ nguyên, không bọc
```

### R7. Sáu trang tương thích Advertising

Mỗi category trong `ADVERTISING_CATEGORIES` có `advertising-products/<slug>/index.html`
cùng bản VI, EN: tiêu đề, mô tả, `<main data-advertising-compatibility-route>`
với một link, canonical `../`, không ảnh hay carousel. Script đầu trang gọi
`location.replace` tới `/<locale>/advertising-products/`: bỏ `category`, `photo`,
`tag` cũ, đặt `category=<slug>`, giữ query khác; locale theo path, không khớp thì
theo `lang`. Không JavaScript thì `<noscript>` refresh về `../?category=<slug>`.

```gherkin
Given URL /en/advertising-products/print-decals/?utm=a&photo=x&tag=y
When trang tương thích chạy script
Then trình duyệt thay URL bằng /en/advertising-products/?utm=a&category=print-decals
And không thêm history entry
```

### R8. Preview local cổng 8787

`pnpm dev` chạy build rồi `serve-static-parity.mjs --port 8787` (host `127.0.0.1`,
root `.site-output`). Path trong `ROUTES` dựng bằng `localeHtml` mỗi request, kèm
`Content-Language`; path khác phục vụ file dưới root, còn path kết thúc bằng `/`
(kể cả `/`), không phải file hoặc ra ngoài root trả 404. Mọi response có
`Cache-Control: no-store`, hỗ trợ `Range`; không nén, không áp `_headers`, nên
số đo tốc độ local không thay số đo demo.

```gherkin
Given pnpm dev đang chạy
When request http://127.0.0.1:8787/en/about/
Then status 200, Content-Language là en, Cache-Control là no-store
And request http://127.0.0.1:8787/ trả 404
```

### R9. Cache header

`src/site/_headers` vào output; Workers static assets đọc, không phục vụ file này.

| Path | `Cache-Control` | Lý do |
| --- | --- | --- |
| `/assets/vendor/*` | `public, max-age=31536000, immutable` | Tên có version |
| `/assets/content/*`, `/assets/brand/*` | `public, max-age=86400, stale-while-revalidate=604800` | Tên không có hash; ảnh thay cùng tên lộ ra trong một ngày |
| HTML, CSS, JS app, `*.mjs` | Mặc định Cloudflare (`max-age=0, must-revalidate`, ETag) | Đổi mỗi deploy, tên không có version |

```gherkin
Given demo đã deploy bản có _headers
When request /assets/vendor/gsap-3.15.0.min.js
Then Cache-Control là public, max-age=31536000, immutable
And /vi/ vẫn trả Cache-Control max-age=0, must-revalidate
```

### R10. Gate CI

Job `static-release` (`.github/workflows/ci.yml`, mọi pull request và push vào `main`): `pnpm install
--frozen-lockfile`, `pnpm qa:static`, `tests/tooling/global-rules-sync.test.mjs`, `build-image-variants.mjs --check`,
`pnpm qa:worker:security`, `pnpm dev` rồi mọi `tests/site/*.test.mjs` (gồm `orphan-selectors.test.mjs`: class, `data-*` trong selector CSS hoặc query JS của `src/site/`
phải có HTML, JS hay script build sinh ra; ngoại lệ ghi lý do trong `ALLOWED`), rồi Chromium smoke
`cross-browser.smoke.spec.cjs` (năm route VI không lỗi console, request, tràn ngang; reduced motion; đổi EN; veil; history).
`pnpm qa:release-regressions` chạy tay ([danh sách](../../tests/README.md#gate-regression-trước-release)).

```gherkin
Given pull request đổi src/site/
When CI chạy job static-release
Then job fail nếu static contract, kiểm biến thể ảnh, security fixture Worker, unit test site hoặc Chromium smoke fail
And không bước nào gọi Wrangler hoặc deploy
```

### R11. Phát hành demo Cloudflare

`wrangler.static.toml`: Worker chỉ có asset `truong-thinh-demo`, `workers_dev`,
`[assets] directory = ".site-output"`, không `main`, không binding. `pnpm deploy:demo`
build rồi `pnpm demo:wrangler deploy --config wrangler.static.toml`; `demo:wrangler`
gọi `wrangler@4.124.0` qua `pnpm dlx`, không vào lockfile. Mỗi lần deploy cần owner
đồng ý rõ ([quyết định](../decisions/cloudflare-workers-static-demo.md)); agent chỉ
chạy `--dry-run`. Owner login một lần (`pnpm demo:wrangler login`); mỗi lần phát
hành: checkout commit đã qua CI, `pnpm qa:static`, `pnpm deploy:demo`, mở `/vi/`,
`/en/`, ghi commit, Worker version ID, URL vào PR hoặc handoff. Rollback:
`pnpm demo:wrangler rollback --config wrangler.static.toml` hoặc dashboard.
Demo: <https://truong-thinh-demo.truong-thinh-project-tooling.workers.dev/vi/>.

```gherkin
Given owner đã đồng ý rõ cho lần phát hành này và đã login Wrangler
When owner chạy pnpm deploy:demo từ commit đã qua CI
Then .site-output/ được build lại và upload lên Worker truong-thinh-demo
And khi chưa có đồng ý đó, agent chỉ chạy pnpm deploy:demo --dry-run
```

### R12. Ranh giới với CMS dormant

`wrangler.toml` (Worker `truong-thinh-website`, `main = "src/worker/index.js"`,
binding `ASSETS`) dormant, không script nào trong `package.json` dùng. Build chỉ
chép `src/site/`, không lấy `src/worker/`, `src/admin/`, `src/db/`. CI chỉ chạy
`pnpm qa:worker:security` (import Worker trong Node, env giả). Redirect `/` sang
`/vi/`, sitemap, redirect `projects-products` chỉ có ở Worker CMS. Mở CMS theo
[khóa Wrangler](../decisions/wrangler-deferred-until-cms.md), [spec CMS](cms.md).

```gherkin
Given phase tĩnh
When chạy bất kỳ script nào trong package.json trừ deploy:demo và demo:wrangler
Then không lệnh nào khởi động Wrangler hoặc đọc wrangler.toml
And .site-output/ không chứa file từ src/worker/, src/admin/ hoặc src/db/
```

### R13. Công cụ asset chạy tay

`build-image-variants.mjs` sinh biến thể theo [tải ảnh R1](media-delivery.md#r1-biến-thể-ảnh-nội-dung),
bỏ qua danh sách R3; `--check` liệt kê biến thể thiếu, exit 1. `sanitize-client-logos.ps1` (PowerShell, máy owner) lọc
12 logo SVG từ `_temp/`, chỉ giữ hình học, ghi vào `assets/content/client-logos/`.

```gherkin
Given thêm một WebP nội dung mới mà chưa sinh biến thể
When CI chạy build-image-variants.mjs --check
Then job fail và liệt kê file biến thể còn thiếu
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Command | `pnpm prepare:site`, `pnpm dev`, `pnpm deploy:demo`, `pnpm demo:wrangler` | Build, preview, deploy và rollback demo |
| Hàm public | `ROUTES`, `localeHtml(html, locale)` | Export từ `serve-static-parity.mjs`; build, preview, test dùng chung |
| Data | `nonPublicSourceAssets` | Path không public (R3), export từ `non-public-source-assets.mjs` |
| Data | `catalog-artifact.mjs` | Build sinh trong output, runtime Advertising import |
| Input | `ADVERTISING_CATEGORIES`, `buildAdvertisingArtifact`, `compileAdvertisingLayout` | Từ `src/site/advertising-products/catalog.mjs`, spec masonry sở hữu |
| DOM hook | `[data-advertising-compatibility-route]` | `main` của trang tương thích |
| Attribute | `data-en`, `data-vi`, `data-en-*`, `data-vi-*`, `data-route-locale` | Build và runtime đổi ngôn ngữ |

## UI

Không có UI riêng; giao diện trang thuộc spec capability và [Design System](../../design-system/README.md).

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1 | `pnpm prepare:site`; loại template và đồng bộ lockup chưa có test riêng |
| R2 | `tests/site/advertising-products-static.test.mjs` |
| R3 | chưa có test |
| R4 | `pnpm qa:static` (không host ngoài, thứ tự vendor); preload, subset font chưa có test |
| R5 | `tests/site/static-locales.test.mjs` |
| R6 | chưa có test |
| R7 | `tests/site/advertising-products-detail-routes.test.mjs` |
| R8 | `node scripts/tooling/serve-static-parity.mjs --self-test` |
| R9 | chưa có test; kiểm tay `curl -I` trên demo sau deploy |
| R10 | `.github/workflows/ci.yml`, `tests/site/cross-browser.smoke.spec.cjs`, `tests/site/orphan-selectors.test.mjs` |
| R11 | chưa có test; `pnpm deploy:demo --dry-run` |
| R12 | `pnpm qa:worker:security`; test R7 kiểm sáu slug trong route Worker |
| R13 | `build-image-variants.mjs --check` trong CI; `pnpm qa:client-assets` |

## Gate còn mở

Owner chốt 2026-10-06: A05s là máy Android đo chuẩn, bỏ gate Galaxy A54; Safari iPhone thật là việc theo dõi sau
phát hành, không chặn, WebKit desktop là sàn; Feral Flow chỉ là tham khảo. Mục iPhone trong spec khác thuộc nhóm này.

- LCP residential mobile hai mode: JS về trước khi hero title vẽ thì SplitText, GSAP trong `src/site/detail.js` đẩy LCP
  tới cuối animation (4,2 đến 5,5 s, 3/7 lượt), nếu không khoảng 3,25 s. Sửa cần spec motion reveal riêng; owner quyết.
- Output còn HTML chưa qua locale ở `/`, `/residential/`, `/commercial/`, `/advertising-products/`, `/about/`; preview
  trả 404 cho `/`, demo có thể phục vụ chúng (suy luận từ cấu hình, chưa đo). [CẦN LÀM RÕ: `/` của demo chuyển về
  `/vi/`, trả 404 hay giữ?]
- [Quyết định demo](../decisions/cloudflare-workers-static-demo.md) ghi Wrangler pin trong `tooling-versions.json`;
  code pin `wrangler@4.124.0` trong script `demo:wrangler`. Owner chọn sửa ADR hay chuyển pin.

## Chú thích thuật ngữ

- **Static release**: phát hành bằng asset tĩnh, không cần CMS runtime.
- **Preflight**: kiểm dữ liệu trước khi build ghi hoặc xóa output.
- **Artifact**: file build sinh ra, không sửa tay, không nằm trong source.
- **Vendor**: thư viện bên thứ ba chép vào output, phục vụ cùng origin.
- **Trang tương thích**: URL category Advertising cũ, chỉ chuyển hướng về masonry.
- **Local preview**: server Node phục vụ `.site-output/` trên máy để kiểm.
- **Workers static assets**: Cloudflare phục vụ file tĩnh từ Worker, không cần code.
- **LCP**: thời điểm phần tử lớn nhất trong khung nhìn đầu được vẽ.
- **Dormant**: source có nhưng chưa chạy trong runtime public.
