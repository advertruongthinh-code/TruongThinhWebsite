---
title: Tải ảnh nội dung
status: live
source:
  - src/site/advertising-products/responsive-image.mjs
  - scripts/site/build-image-variants.mjs
tests:
  - tests/site/image-loading-frame.e2e.mjs
  - tests/site/image-delivery-measure.mjs
notion: https://app.notion.com/p/3e6332849a0e81508d66ca0b3cfebf18
updated: 2026-10-05
---

# Tải ảnh nội dung

## Mục đích

Ảnh dưới `/assets/content/` tới khách đúng cỡ và sớm trên mọi route VI/EN: script sinh biến thể AVIF, WebP; HTML tĩnh
và runtime Advertising chọn biến thể; khung ảnh tĩnh có vòng tải tới khi ảnh xong; một script đo tốc độ trên demo.
Bọc `<picture>` lúc build, font, thư viện, cache header thuộc [phát hành tĩnh](static-release.md); skeleton chờ ảnh
Advertising ở [loading glass](loading-glass-and-page-entry.md); card nhiều ảnh và video ở [media-card](media-card.md).

## Hành vi

### R1. Biến thể ảnh nội dung

`build-image-variants.mjs` (sharp) đi qua mọi WebP dưới `src/site/assets/content/`, bỏ file `-480.webp`, `-960.webp`
và path trong `nonPublicSourceAssets`. Cạnh mỗi `<tên>.webp` nó ghi `<tên>.avif` cùng cỡ và `<tên>-480`, `<tên>-960` ở
cả `.avif`, `.webp`; cỡ không nhỏ hơn bề rộng gốc thì bỏ. AVIF quality 55, WebP 78, effort 6. File đã có thì giữ;
`--force` ghi lại. `--originals map.json` sinh từ PNG gốc khi cùng tỷ lệ với WebP (lệch dưới 0,005), không thì từ
WebP; ảnh không còn gốc giữ WebP hiện tại làm cỡ lớn nhất (owner,
[danh sách](https://github.com/advertruongthinh-code/TruongThinhWebsite/blob/a3428aaff2cf1ff2f8f5a4f6804404e23ccd349b/docs/verification/media-originals-2026-10-03.md)). `--check` chỉ liệt kê biến thể thiếu và exit 1; CI chạy
([phát hành tĩnh R10](static-release.md#r10-gate-ci)). Biến thể commit cùng ảnh trong `src/site/`.

```gherkin
Given src/site/assets/content/shared/a.webp rộng 1536px và b.webp rộng 800px, chưa có biến thể
When chạy node scripts/site/build-image-variants.mjs
Then cạnh a.webp có a.avif, a-480.avif, a-480.webp, a-960.avif, a-960.webp
And cạnh b.webp chỉ có b.avif, b-480.avif, b-480.webp
And chạy lại với --check thì exit 0
```

### R2. HTML tĩnh chọn biến thể

Build bọc `<img>` nội dung trong `<picture>` ([phát hành tĩnh R6](static-release.md#r6-ảnh-nội-dung-bọc-)). Khi có
`width` và cỡ 480, 960 đủ hai định dạng: `<source type="image/avif">` và `<img>` (WebP) cùng mang `srcset` gồm các cỡ
đó cộng bản gốc theo `width`; `sizes` giữ giá trị tác giả, không có thì ảnh `loading="lazy"` nhận `auto, 100vw` (trình
duyệt dùng bề rộng đã layout), ảnh khác `100vw`. Thiếu `width` hoặc không có cỡ nhỏ hơn thì `<source>` chỉ có
`<tên>.avif`. `src` WebP gốc giữ làm fallback và làm hook cho vòng tải (R6). Slide hero trang chủ ở `data-src` nhận
`data-srcset`; `hydrateDeferredHeroImages` (`motion.js`) chép sang `srcset` trên `<source>` và `<img>` rồi gán `src`
([trang chủ R3](page-home.md#r3-hero-slideshow-và-nút-dừng)). `picture { display: contents }` nên không thêm box;
selector nhắm ảnh viết thêm `X > picture > img`.

```gherkin
Given <img src="/assets/content/projects/storefront.webp" width="1536" loading="lazy"> trong HTML nguồn
When build xong
Then source AVIF có srcset storefront-480.avif 480w, storefront-960.avif 960w, storefront.avif 1536w, sizes "auto, 100vw"
And trình duyệt hỗ trợ AVIF tải đúng một file cho ảnh đó, không tải WebP
```

### R3. Runtime Advertising chọn biến thể

`responsive-image.mjs` probe AVIF một lần khi module nạp (ảnh AVIF 1×1 dạng data URI); ảnh tạo trước khi probe xong
giữ WebP. `responsiveSrcset(src, width)` chỉ nhận WebP dưới `/assets/content/` có `width`, trả các cỡ 480, 960 nhỏ hơn
`width` cộng bản gốc, theo định dạng đã probe; `responsiveSource(src)` đổi đuôi sang `.avif` khi probe đạt. Module không
kiểm file tồn tại, dựa vào `--check` của R1. HTML Advertising mang `data-advertising-*` nên build không bọc (R2).

| Nơi | Cách tải |
| --- | --- |
| Card masonry, related (`createPhotoMedia`) | LazySizes `data-src`, `data-srcset`, `data-sizes="auto"`, trong cửa sổ ảo hóa ([masonry R7](advertising-masonry.md#r7-ảo-hóa-và-bàn-phím)) |
| Nút suggestion | native lazy, `srcset`, `sizes="auto, 50vw"`; ảnh kế của slideshow eager, `sizes` ghim bằng bề rộng nút |
| Item khác trên card nhiều media | native lazy, `sizes="auto, 50vw"` ([media-card R5](media-card.md#r5-chờ-tải-và-lỗi-media)) |
| Thumbnail primary | lazy, `sizes="auto, 25vw"`; video dùng poster |
| Ảnh primary | `responsiveSource`, eager, `fetchPriority="high"`, không `srcset`; nền vùng dư cùng URL |
| Viewer | `responsiveSource` gán lúc mở, `fetchPriority="high"` |

```gherkin
Given trình duyệt hỗ trợ AVIF và probe đã xong
When mở detail kiosk-posm-07 rồi bấm "Xem lớn hơn"
Then ảnh primary và ảnh viewer cùng một URL .avif cỡ gốc
And card masonry dùng data-srcset AVIF 480w, 960w và bản gốc
```

### R4. Thứ tự ưu tiên tải

Ảnh đầu hero của trang chủ, Residential, Commercial, About có `fetchpriority="high"`, không lazy; ba slide sau của
trang chủ ở `data-src`. Ảnh nội dung khác `loading="lazy"`; logo khách hàng `eager`, không vòng
([trang chủ R9](page-home.md#r9-closer-và-marquee-khách-hàng)). Không preload ảnh: `<link rel="preload">` chỉ dành
cho hai file font ([phát hành tĩnh R4](static-release.md#r4-font-và-thư-viện-tự-host)), vì preload cạnh `<picture>`
làm tải ảnh hai lần. Mọi `<img>` nội dung có `width`, `height` (trừ nền primary Advertising) nên khung giữ chỗ trước khi
tải. Advertising chỉ tải ảnh card trong cửa sổ ảo hóa; primary eager, ưu tiên cao.

```gherkin
Given /vi/residential/ tải với cache trống, ảnh bị trễ 1,5s
When đọc DOM và request ảnh tới khi cuộn hết trang
Then ảnh hero có fetchpriority="high", mọi ảnh khác lazy, đúng như HTML build
And không URL ảnh nào bị request hai lần
```

### R5. Chuẩn file ảnh

`src/site/assets/content/` có `client-logos/` (SVG đã làm sạch), `projects/` (dự án, gallery; Advertising trong
`projects/advertising/<nhóm>/`) và `shared/` (dùng chung); `source-assets/` ở gốc repo giữ file nguồn, không vào build. Tên chữ
thường, ASCII, kebab-case, mô tả dự án và góc chụp. WebP sRGB, đã xóa EXIF, GPS; `width`, `height` trong HTML bằng
pixel thật. Alt VI và `data-en-alt` cho ảnh nội dung; ảnh trang trí `alt=""`. Ngân sách là mức xem lại, không phải gate:

| Slot | Cỡ nguồn | WebP mục tiêu | Xem lại khi |
| --- | --- | --- | --- |
| Hero, full-bleed, CTA | `1536×1024` hoặc `1920×1280` | 180–300 KB | trên 350 KB |
| Gallery, dự án, card | `1536×1024` | 90–220 KB | trên 275 KB |
| Ảnh render tối đa 384px | `768×512` | 40–100 KB | trên 130 KB |

Thêm hoặc thay ảnh: chạy R1; sửa HTML, hoặc `media-manifest.mjs` với Advertising
([masonry R2](advertising-masonry.md#r2-catalog-và-artifact)); xem crop ở năm viewport
([crop](../../design-system/content.md#crop-và-con-người)); chạy `pnpm qa:static`, `pnpm qa:site`; chỉ xóa file cũ khi
không route nào dùng. Thay ảnh, crop hoặc giảm chất lượng thấy được cần owner duyệt. Phase tĩnh không có upload: thêm
ảnh là sửa source, build và phát hành lại.

```gherkin
Given ảnh WebP mới 1536×1024 sRGB, tên kebab-case, đã chạy build-image-variants
When thêm vào HTML với width="1536" height="1024" và alt VI, data-en-alt
Then khung ảnh đúng tỷ lệ trước khi tải, build bọc <picture> có biến thể, CI --check đạt
```

### R6. Vòng tải ảnh tĩnh

Khối cuối `style.css`: phần tử có con trực tiếp `img[src^="/assets/content/"]`, hoặc `picture > img` như vậy, được vẽ
vòng SVG 1,75rem ở giữa làm `background-image`, nằm dưới ảnh: rãnh trắng alpha 0,18, cung một phần tư trắng alpha 0,72
quay 0,9s bằng SMIL. Chỉ CSS nên vòng có ngay khi stylesheet áp dụng, trước script, không trễ hay chặn request. Không áp
trong `[data-project-grid]`, `[data-advertising-photo-view]` (Advertising dùng skeleton,
[loading glass R5](loading-glass-and-page-entry.md#r5-skeleton-thay-vòng-xoay)), `.client-logo-marquee`, và khi khung có
`.is-media-settled`. IIFE đầu `motion.js` nghe `load`, `error` ở capture phase và quét `img[src]` đã `complete` lúc
script chạy, thêm `.is-media-settled` lên cha của ảnh, và lên khung ngoài khi cha là `<picture>`: vòng gỡ khi ảnh xong
hoặc lỗi, để SMIL thôi vẽ lại. Ảnh lỗi vẫn giữ khung theo `width`, `height` (suy luận, chưa có test). Ảnh `data-src`
chưa có `src` nên chưa có vòng. Vòng là nền của khung nên không nhận focus hay pointer. Không số, không phần trăm,
không `aria-busy` (owner bỏ tiến trình theo byte). Reduced motion: cung đứng yên. Không JavaScript hoặc `motion.js` lỗi:
vòng không được gỡ, vẫn quay dưới ảnh đã tải (suy luận). Không có trễ nên ảnh từ cache chưa vẽ ở frame đầu có thể lóe
vòng (gate). Thanh tải nút suggestion thuộc
[detail R6](advertising-detail.md#r6-slideshow-suggestion) và dùng chung `.is-media-settled`.

```gherkin
Given ảnh /assets/content/ của /vi/about/ bị trễ 1,5s, viewport 390px
When trang vẽ trước khi ảnh về
Then mỗi khung ảnh đang hiện đã đúng kích thước cuối và có vòng ở giữa
And khi ảnh tải xong, khung có is-media-settled, không còn vòng, kích thước lệch tối đa 1px, CLS dưới 0,1
```

### R7. Đo tốc độ và ngân sách

`node tests/site/image-delivery-measure.mjs --base <url> --runs N [--warm] [--only <route>] [--detail <id>]`: Chromium
qua Playwright; sáu route (trang chủ, Residential, Commercial, About, Advertising, `?photo=`) × VI/EN × `390×844`
(mobile, DPR 3) và `1440×900`; Slow 4G của DevTools (RTT 562,5ms, 1,6 Mbps × 0,9), CPU chậm 4 lần; mặc định mọi lượt
tắt cache qua CDP, `--warm` chạy một lượt cold rồi N lượt dùng cache. Mỗi lượt chờ `load` thêm 1,5s, cuộn một viewport
rồi ghi LCP và phần tử LCP, CLS, thời điểm ảnh đầu trong viewport sẵn sàng, thời gian tới ảnh kế sau cuộn, số request và
byte ảnh, 8 card Advertising đầu (cohort). Lượt cold không có byte truyền bị đếm `excluded`; lượt treo hay lỗi ghi `failure` rồi chạy tiếp. Kết quả ở
`.tmp/image-delivery/<thời điểm>/`: `runs.json` và `summary.json` (median). Đo trên demo sau deploy (mỗi lần deploy cần
owner đồng ý), không dùng preview local vì không nén và `no-store`
([phát hành tĩnh R8](static-release.md#r8-preview-local-cổng-8787)).

Ngân sách (owner duyệt cùng spec tải ảnh 25/09 và plan 03/10): Advertising median ảnh đầu sẵn sàng nhanh hơn baseline
ít nhất 10%; route có baseline trên 3s nhanh hơn ít nhất 10%; route khác không chậm hơn ngoài nhiễu; LCP không tăng quá
5% ngoài nhiễu; CLS tối đa 0,1, không tăng vì khung ảnh. So cùng cohort hoặc theo tầng byte, kèm median không phân tầng.

```gherkin
Given demo vừa deploy theo phát hành tĩnh R11
When chạy image-delivery-measure.mjs --base <demo> --runs 5
Then summary.json có median LCP, ảnh đầu, ảnh sau cuộn, CLS, byte ảnh cho mỗi route × locale × viewport
And so với baseline cùng cohort, không mục nào vượt ngân sách
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Command | `node scripts/site/build-image-variants.mjs [--originals map.json] [--force] [--check]` | Sinh, kiểm biến thể (R1) |
| File | `<tên>.avif`, `<tên>-480.avif\|webp`, `<tên>-960.avif\|webp` cạnh `<tên>.webp` | R1 ghi; build, runtime đọc theo tên |
| Hàm public | `responsiveSource(src)`, `responsiveSrcset(src, width)` (`responsive-image.mjs`) | `catalog-runtime.mjs`, `photo-viewer.mjs` import (R3) |
| Hàm build | `responsivePictures(html)` (`prepare-static-assets.mjs`) | Bọc `<picture>`, thêm `srcset`, `sizes` (R2) |
| Attribute | `data-srcset` trên `<source>`, `<img>` slide hero | Build ghi, `motion.js` chép khi hydrate (R2) |
| Class | `.is-media-settled` | `motion.js` ghi; vòng (R6) và thanh suggestion đọc |
| Data | `nonPublicSourceAssets` (`non-public-source-assets.mjs`) | Path bỏ qua khi sinh biến thể (R1) |
| Command | `node tests/site/image-delivery-measure.mjs --base --runs --warm --only --detail --out` | Đo (R7); output `.tmp/image-delivery/` |

Code tải ảnh nằm trong file của spec khác: `prepare-static-assets.mjs` ([phát hành tĩnh](static-release.md)), `style.css`,
`motion.js` ([shell](site-shell.md)), `catalog-runtime.mjs` ([masonry](advertising-masonry.md)), `photo-viewer.mjs`
([viewer chạm](advertising-viewer-touch-zoom.md)), `suggestion-slideshow.mjs` ([detail](advertising-detail.md)); sửa hành vi
tải ảnh ở đó thì cập nhật cả spec này.

## UI

Vòng tải là một trong các chi tiết tròn được phép ([Shapes](../../design-system/README.md#shapes)); Design System chưa có
component riêng cho vòng. Khung tối như hero dùng token `media-loading-surface` làm nền chờ dưới vòng trắng. Liên quan:
[Thanh tải](../../design-system/components/LoadBar/README.md), [Skeleton](../../design-system/components/Skeleton/README.md),
[ảnh trong card](../../design-system/motion.md#ảnh-trong-card), [Content và media](../../design-system/content.md).

## Kiểm tra

E2E cần `pnpm dev`, `BASE_URL=http://127.0.0.1:8787`.

| R | Test hoặc command |
| --- | --- |
| R1 | `node scripts/site/build-image-variants.mjs --check` (CI) |
| R2 | `image-loading-frame.e2e.mjs` (thuộc tính HTML, không request trùng); `site.e2e.cjs` chặn ảnh theo mọi biến thể; giá trị `sizes` chưa có test |
| R3 | chưa có test riêng; `site-media-card-m02a.e2e.mjs` quy biến thể về WebP gốc khi đếm request |
| R4 | `image-loading-frame.e2e.mjs` (alt, `loading`, `fetchpriority` khớp HTML; 0 request trùng) |
| R5 | `--check` của R1; sRGB, EXIF, pixel thật, ngân sách chưa có test |
| R6 | `image-loading-frame.e2e.mjs` (16 ca khung và vòng, no-script, Barba và Back); reduced motion, cache hit chưa có test |
| R7 | Chính script, chạy tay trên demo |

## Gate còn mở

Gate thiết bị theo card [kiểm thiết bị](https://app.notion.com/p/3ef332849a0e8100bbd1e62ad5229067).

- Cache hit: tải lại trang chủ, ảnh lazy `home-residential-kitchen` ở mép màn hình chưa xong trong 2 frame; vòng không có
  trễ nên có thể lóe, chưa xác nhận vòng có hiện (cùng gate ở [trang chủ](page-home.md#gate-còn-mở)). Main đo.
- Vòng trắng trên khung không có nền tối (rail công trình trang chủ, editorial, duo; `.detail-media` nền xám nhạt) gần
  như không thấy trên nền trắng (suy luận từ CSS, chưa chụp); vòng lộ ngoài ảnh ở `.editorial-item` theo
  [trang con](detail-pages.md#gate-còn-mở). Main chụp; owner chọn màu vòng hoặc nền khung.
- Số lần Paint khi trang đứng yên (audit 04/10: 509 so với 311 khi bỏ vòng, 2s, `/vi/residential/` 1440px) chưa đo lại
  sau `.is-media-settled`; test chỉ kiểm vòng đã gỡ. Main.
- Ảnh tĩnh lỗi tải chưa có ca test (khung giữ tỷ lệ, alt). Main.
- Probe AVIF bất đồng bộ: deep link `?photo=` có thể tải primary WebP rồi viewer tải lại AVIF (suy luận). Main kiểm
  network; Thread code sửa nếu đúng.
- `[data-advertising-photo-background]` trong `advertising-products/index.html` không có `loading`, luôn tải
  `advertising-print-decals-cover.webp` dù detail ẩn, rồi runtime thay bằng AVIF. Thread code.
- Lần đo demo sau tự host font chỉ có 390px VI, 3 lượt mỗi route (residential 7), không lượt warm; owner cho rút gọn
  04/10. Advertising chưa có baseline nên mục ảnh đầu Advertising nhanh hơn 10% chưa so được. Script chưa thu long task
  như phương pháp đo đã duyệt.
  [CẦN LÀM RÕ: ma trận rút gọn đủ để coi ngân sách R7 đạt, hay chạy đủ 1440px, EN, `?photo=`, 5 lượt?] Owner.
- [CẦN LÀM RÕ: chuẩn file ảnh đã duyệt ghi thư mục phẳng theo loại, không thư mục con theo dự án; Advertising nằm trong
  `projects/advertising/<nhóm>/`. Giữ thư mục con theo nhóm làm chuẩn?] Owner.
- LCP residential mobile hai mode do SplitText ở hero: gate ở [phát hành tĩnh](static-release.md#gate-còn-mở).
- Safari iPhone thật chưa kiểm `<picture>` AVIF, biến thể và vòng tải; WebKit desktop không thay. Owner, máy PC.

## Chú thích thuật ngữ

- **Biến thể**: bản cùng nội dung của một ảnh ở định dạng hoặc bề rộng khác, sinh từ một nguồn.
- **AVIF**: định dạng ảnh nén tốt hơn WebP ở cùng chất lượng; trình duyệt không hỗ trợ dùng WebP.
- **Probe**: phép thử nhỏ lúc chạy để biết trình duyệt giải mã được AVIF hay không.
- **`srcset`, `sizes`**: danh sách biến thể theo bề rộng và bề rộng hiển thị dự kiến để trình duyệt chọn file.
- **SMIL**: cú pháp animation khai báo trong SVG; vẫn vẽ lại khi bị ảnh che.
- **Cold, warm**: lượt tải không dùng và có dùng cache trình duyệt.
- **Cohort**: tập card đầu của một lượt đo Advertising, dùng so cùng ảnh giữa các lượt.
- **LCP**: thời điểm phần tử lớn nhất trong khung nhìn đầu được vẽ.
- **CLS**: tổng dịch chuyển layout ngoài ý muốn khi trang tải.
