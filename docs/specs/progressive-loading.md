---
title: Ảnh JPEG XL progressive và thứ tự tải
status: planned
source:
  - src/site/sw.js
  - src/site/advertising-products/media-colors.mjs
tests:
  - tests/site/image-loading-frame.e2e.mjs
  - tests/site/image-reveal-complete.e2e.mjs
  - tests/site/image-upgrade.e2e.mjs
  - tests/site/image-format-fallback.e2e.mjs
  - tests/site/advertising-skeleton-slow-network.e2e.mjs
  - tests/site/first-load-parity.e2e.mjs
  - tests/site/image-delivery-measure.mjs
notion: https://app.notion.com/p/406332849a0e816ebc6af97487876c15
updated: 2026-10-31
---

# Ảnh JPEG XL progressive và thứ tự tải

## Mục đích

Mọi ảnh trên site dùng JPEG XL (JXL) progressive và chỉ hiện khi đã tải xong toàn bộ file, như trước khi có JXL (owner
2026-10-31, thay cách hiện từ ngưỡng chất lượng ngày 2026-10-27). Trang tải theo tầng, veil mở khi đủ thứ cần thiết, HTML, CSS, font, JavaScript,
media có một thứ tự ưu tiên chung. Spec này thay phần định dạng và lúc hiện ảnh của [tải ảnh](media-delivery.md) và
[skeleton chờ ảnh](loading-glass-and-page-entry.md), thêm lớp trên [veil của shell R7](site-shell.md#r7-veil-khi-tải-trực-tiếp-fallback-và-bfcache) và [mở trực tiếp](first-load-parity.md).

## Hiện trạng đã đo

- 307 trên 497 ảnh nội dung rộng khoảng 3072px. Thang biến thể là 240, 480, 960 rồi bản gốc, ở AVIF và WebP.
- AVIF trung bình trên 24 ảnh lớn: cỡ 960 là 58 KB, 1600 là 120 KB, 2048 là 176 KB, gốc là 325 KB.
- Ảnh primary và viewer Advertising luôn tải bản gốc, cả trên điện thoại (`catalog-runtime.mjs`, `photo-viewer.mjs`).
- Veil mở khi `mountPage` xong; trên Advertising gồm vendor, runtime, artifact và lần dựng catalog. Veil không chờ ảnh, font.
- `sharp` 0.35.5 của repo không encode được JXL. `cjxl`, `djxl` v0.11.1 (libjxl chính thức) chạy được trên cloud.
- Cùng SSIM với AVIF quality 55, JXL nặng hơn khoảng 50% (8 ảnh 1600px). Cùng dung lượng với AVIF, JXL progressive có SSIM so
  với ảnh gốc 0,93 đến 0,95, AVIF 0,95 đến 0,97 (3 ảnh). SSIM có thể thiên về AVIF.
- Bản cắt dở của JXL progressive (`djxl --allow_partial_files`): dưới 30 đến 50% số byte chưa ra hình; SSIM 0,9 so với bản
  đủ đạt ở khoảng 50 đến 70% số byte (3 ảnh).
- Chromium 153 bật cờ JXL, mạng 100 KB/s, ảnh 3072px 1,1 MB: thấy bản mờ lúc 4,2s, xong lúc 11,4s.
- A04s thật (Chrome 156, Android 14): JXL tĩnh, `<picture>` chọn JXL, JXL động 8 khung đều chạy. `ImageDecoder` với JXL động
  làm crash tab trên điện thoại và Chrome PC. Progressive qua Service Worker đếm byte (100 KB/s, file 240 KB, ngưỡng 180 KB):
  tin ngưỡng lúc 1,9s, `load` 2,7s, `decode()` xong 3,1 đến 3,6s; thấy bản mờ trước `load`, một request mỗi lần tải.

## Hành vi

### R1. Định dạng và biến thể

Mọi ảnh dưới `/assets/content/` (ảnh tĩnh, ảnh động ngắn, poster video) là JXL progressive (owner 2026-10-27). Google Images
và Discover chưa index JXL (John Mueller, 2026-10-15), nên HTML tĩnh bọc `<picture>`: `<source>` JXL, `<img>` giữ WebP; trình
duyệt đọc được JXL chỉ tải JXL (owner chọn 2026-10-31). Logo khách hàng SVG giữ nguyên. Video có tiếng và clip dài vẫn là HLS ([video](video-delivery.md)).

- Cỡ: 240, 480, 960, 1600, 2048 và bản gốc (3072px hiện nay, 3840px khi có ảnh nguồn); cỡ không nhỏ hơn bản gốc thì bỏ.
- Encode: `cjxl -p --group_order=1` (vùng giữa ảnh tới trước), effort 7. Mỗi file chọn `distance` sao cho dung lượng không
  vượt AVIF quality 55 cùng cỡ (owner chọn giữ dung lượng).
- Nguồn: PNG gốc khi có (`--originals`), không thì WebP hiện tại; ảnh từ WebP chịu thêm một lần mất chất lượng.
- `build-image-variants.mjs` thêm bước JXL, ghim `cjxl`, `djxl` trong `tooling-versions.json` (env `CJXL`, `DJXL` hoặc PATH),
  `--check` kiểm đủ file và ngưỡng (R2). `--jobs N` chạy N ảnh song song; ngưỡng ghi sau mỗi ảnh nên lần chạy dài bị ngắt
  chạy lại tiếp được. Cỡ 1600, 2048 chưa có AVIF trong repo: AVIF quality 55 encode tạm trong bộ nhớ làm đích dung lượng.
- Mọi trình duyệt phải tải được ảnh (owner 2026-10-31, thay quyết định chỉ JXL ngày 2026-10-27): runtime Advertising dò
  ảnh JXL 1x1 trước lần dựng đầu; không giải mã được (Firefox, Chrome dưới 155) thì dùng WebP 240, 480, 960 và bản gốc.
- AVIF, WebP giữ trong repo làm nguồn encode và bản lưu (owner 2026-10-27); og:image, JSON-LD, sitemap ảnh giữ WebP.

Trung tâm vùng ưu tiên dùng giữa ảnh. Đặt tâm theo model Google Attention Center là việc sau, cần TensorFlow Lite.

```gherkin
Given ảnh 3072×2048 có AVIF quality 55 cỡ 1600 là 109 KB
When chạy build-image-variants
Then có <tên>-1600.jxl progressive không quá 109 KB, cùng các cỡ 240, 480, 960, 2048 và bản gốc
And chạy lại với --check thì exit 0
```

### R2. Ngưỡng chất lượng

Lúc build, mỗi file JXL có `thresholdBytes`: số byte đầu nhỏ nhất mà bản cắt dở giải mã ra SSIM từ 0,90 trở lên so với chính
file đó giải mã đủ (độ chói, cửa sổ 8×8, như lần đo). Script dò bằng `djxl --allow_partial_files` và ghi
`assets/content/jxl-thresholds.json` (`{ "<path>": bytes }`). Không đạt ngưỡng trước khi hết file thì ngưỡng là cỡ file.
Từ 2026-10-31 site không dùng ngưỡng (R3); build vẫn ghi file để quay lại được mà không phải encode lại.

```gherkin
Given <tên>-1600.jxl 108 KB
When build tính ngưỡng
Then jxl-thresholds.json có path đó với số byte giữa 30% và 100% cỡ file
And giải mã đúng số byte đó cho SSIM từ 0,90 trở lên so với bản đủ
```

### R3. Ảnh chỉ hiện khi tải xong

Ảnh chỉ hiện khi đã tải xong toàn bộ file và `decode()` xong, ở mọi trang và mọi trình duyệt (owner 2026-10-31: "ảnh chỉ
xuất hiện khi đủ chất lượng như lúc trước khi làm jxl"). Bản đầu (2026-10-27) cho hiện từ ngưỡng SSIM 0,90 (R2) nhờ Service
Worker đếm byte; owner thấy chưa đủ chất lượng nên bỏ.

- Trang tĩnh: vệt sáng của [tải ảnh R6](media-delivery.md#r6-vệt-sáng-chờ-ảnh-tĩnh) che tới `load` và `decode()`.
- Advertising: card giữ blur tới khi ảnh tải xong (R9), primary chạy Kính lúc `decode()` xong
  ([skeleton chờ ảnh R2, R4](loading-glass-and-page-entry.md)).
- Viewer: mở trên ảnh primary đang có (cùng media, cỡ nhỏ hơn, đã tải xong), tải bản gốc riêng, `load` xong mới đổi.
- Site không đăng ký Service Worker. `/sw.js` chỉ còn tự gỡ bản đã cài ở máy khách từ trước (`_headers` `no-cache`).
- Đã settle thì không có vệt, skeleton hay Kính lần nữa cho ảnh đó. Ảnh lỗi theo [tải ảnh R8](media-delivery.md#r8-dấu-báo-lỗi-tải-media).

```gherkin
Given ảnh hero /vi/residential/ tải chậm
When file còn đang về
Then khung chỉ thấy vệt sáng; khung nhận is-media-settled sau load và decode
And server nhận đúng một request cho file đó

Given viewer mở trên ảnh primary cỡ 1600, bản gốc đang tải
When bản gốc chưa về đủ
Then viewer vẫn hiện ảnh 1600, chỉ đổi sang bản gốc khi load xong
```

### R4. Tầng tải trang và lúc veil mở

Mở trực tiếp và chuyển trang mềm dùng cùng một bộ tầng. Trang detail view (`?photo=`, `/p/<id>`) không có veil.

| Tầng | Gồm | Kết thúc khi |
| --- | --- | --- |
| 0. Khung | HTML, hai CSS, hai font preload, script `<head>` | Lần vẽ đầu, veil trắng phủ |
| 1. Mở veil | JavaScript `defer`, font; Advertising thêm vendor, runtime, artifact, khung masonry. Ảnh hero bắt đầu tải nhưng veil không chờ | Veil bắt đầu mở |
| 2. Nội dung đầu | Ảnh trong viewport, motion chữ hero, rail và chip, card trong cửa sổ ảo hóa đầu | Mọi ảnh trong viewport settled và intro hero xong |
| 3. Nền | Ảnh ngoài viewport (lazy), slide hero sau, video, Swiper, `catalog-detail` | Không có mốc |

Mọi lần vào trang đều có veil (owner 2026-10-27). Veil bắt đầu mở khi `mountPage` xong (shell, chữ hero, khung có kích thước;
Advertising gồm khung masonry) và `document.fonts.ready` xong; không chờ ảnh nào. Không có mốc thời gian, đúng
[shell R7](site-shell.md#r7-veil-khi-tải-trực-tiếp-fallback-và-bfcache); font lỗi vẫn làm `fonts.ready` xong. Delay intro hero
đếm từ lúc veil bắt đầu mở ([mở trực tiếp R2](first-load-parity.md#r2-motion-chữ-hero-khi-mở-trực-tiếp-giống-chuyển-mềm)).

```gherkin
Given /vi/residential/ mở bằng link, ảnh hero bị trễ 3s, font về trước khi mount xong
When ghi hình từ lúc điều hướng
Then veil bắt đầu mở ngay khi mount xong, hero còn vệt sáng, chữ hero chạy motion như chuyển mềm

Given font bị trễ 1s, mount xong ở 400ms
When ghi hình từ lúc điều hướng
Then veil bắt đầu mở khi font về, chữ hero không đổi font sau khi veil mở
```

### R5. Thứ tự ưu tiên tài nguyên

| Thứ tự | Tài nguyên | Cách giữ ưu tiên |
| --- | --- | --- |
| 1 | HTML, `style.css`, `detail.css` | Render-blocking như hiện nay; không thêm CSS chặn render |
| 2 | Hai font normal latin, vietnamese | `preload` ([phát hành tĩnh R4](static-release.md#r4-font-và-thư-viện-tự-host)), `font-display: swap` |
| 3 | Ảnh hero | `fetchpriority="high"`, không lazy ([tải ảnh R4](media-delivery.md#r4-thứ-tự-ưu-tiên-tải)) |
| 4 | JavaScript `defer`; Advertising: vendor, runtime, artifact | `defer`, `modulepreload` như hiện nay |
| 5 | Ảnh khác trong viewport | Lazy native hoặc LazySizes trong cửa sổ ảo hóa |
| 6 | Ảnh ngoài viewport, slide hero sau, video, Swiper, `catalog-detail` | Lazy, `data-src`, import khi cần |
| 7 | Bản gốc cho viewer | Chỉ khi mở viewer |

Không preload ảnh ngoài ngoại lệ hero trang chủ đã có. Không đẩy ảnh trong viewport lên trước JavaScript tầng 1: lần thử
khởi động runtime sớm (card "Tăng tốc hiện 8 card đầu") làm 8 card đủ ảnh chậm hơn vì tranh băng thông với vendor JS.

```gherkin
Given /vi/advertising-products/ mở với cache trống, Slow 4G
When đọc waterfall tới lúc 8 card đầu có ảnh
Then font và CSS bắt đầu trước mọi ảnh, vendor JS và artifact bắt đầu trước ảnh card
```

### R6. Thứ tự trong một tầng

- Ảnh trong một tầng: trình duyệt tự xếp theo `loading`, `fetchpriority`, vị trí; code không tự xếp hàng ảnh.
- Slideshow hero trang chủ: slide 1 ở tầng 1, các slide sau giữ `data-src` tới tầng 3
  ([trang chủ R3](page-home.md#r3-hero-slideshow-và-nút-dừng)).
- Video theo [video thích ứng](video-delivery.md), ở tầng 3, không chen trước ảnh trong viewport.

```gherkin
Given /vi/ ở 1440px, hero đang ở slide 1
When trang vào tầng 3
Then slide 2 chỉ tải khi tới lượt hydrate, không tải trước
```

### R7. Dùng lại code, không phân mảnh

- Không có module nâng nấc riêng (`image-tier.js` không dùng lại vì mỗi ảnh chỉ tải một file).
- Hiện ảnh đi qua đường settle sẵn có: `settle()` của script `<head>` cho trang tĩnh, `revealCard`, `playPrimaryReveal` cho
  Advertising; không viết đường hiện ảnh thứ hai.
- Một điều kiện mở veil trong `mountPage`, dùng cho mở trực tiếp và route mềm.
- Chọn biến thể chỉ ở `responsivePictures` (build) và `responsive-image.mjs` (runtime); đổi đuôi sang `.jxl`, thang cỡ khai
  một lần mỗi nơi. Bước JXL nằm trong `build-image-variants.mjs`, không thêm script build mới.
- Vệt sáng, skeleton, Kính, dấu báo lỗi giữ nguyên code. Đo bằng `image-delivery-measure.mjs`, thêm mốc "ảnh hiện".

```gherkin
Given code đã cài spec này
When tìm nơi gỡ vệt sáng hoặc chạy Kính khi ảnh sẵn sàng
Then chỉ có các hàm settle sẵn có, được gọi từ load và decode
```

### R8. Đo và ngân sách

Đo trên demo theo [tải ảnh R7](media-delivery.md#r7-đo-tốc-độ-và-ngân-sách), so với bản `main` trước thay đổi, cùng cohort,
5 lượt, `390×844` DPR 3 và `1440×900`, trên Chrome có JXL; thêm A04s thật qua máy PC:

- Lúc ảnh đầu trong viewport hiện ở route có khung lớn không chậm hơn quá 5% so với AVIF trước đây (mục tiêu nhanh hơn
  30% dựa trên hiện từ ngưỡng, bỏ cùng R3 ngày 2026-10-31).
- Lúc file ảnh về đủ không chậm hơn quá 5%; byte ảnh không tăng (cùng dung lượng với AVIF).
- Veil tan theo gate [mở trực tiếp R3](first-load-parity.md#r3-phần-nhẹ-hiện-trước-phần-nặng-không-chặn) (dưới 1s).
- CLS tối đa 0,1; 0 request ảnh trùng URL; không frame nào thấy ảnh tải dở ngoài blur của card (R9).
- LCP không tăng quá 5%.

```gherkin
Given demo vừa deploy bản có spec này
When chạy image-delivery-measure.mjs --runs 5 trên bản cũ và bản mới
Then summary.json đạt mọi ngân sách ở trên, kể cả lượt --warm
```

### R9. Ảnh tự mờ thay skeleton Flow trên card chờ ảnh

Card masonry chính và related đang chờ ảnh không dùng skeleton Flow (owner 2026-10-27 16:06). Vào viewport khi ảnh chưa tải
xong thì ảnh hiện ngay ở opacity cuối dưới `filter: blur(24px)` của chính nó (không animate vào); trình duyệt vẽ dần các
lượt JXL qua lớp mờ. Khung tô màu chủ đạo của ảnh (`MEDIA_COLORS`, `sharp` `stats().dominant`) nên ảnh chưa có byte không
thành ô trắng (A04s 400 kbit/s: ô trắng 2 đến 4s; owner chọn 2026-10-31 11:09). Tải và `decode()` xong (R3) thì blur tan
về 0 trong `0.6s` rồi gỡ ([skeleton chờ ảnh R1, R2](loading-glass-and-page-entry.md#r1-ảnh-card-đang-tải-tự-mờ)).

Bản đầu dùng Kính ba bậc (`backdrop-filter`) trên ảnh; owner kéo thanh cuộn cực đoan (tắt cache, 3G) thấy FPS không hơn
Flow (2026-10-31 09:59). Trace 1920px: có Kính 14 đến 15 FPS, blur trên ảnh 41 (JXL hay WebP như nhau); A04s 400 kbit/s: có Kính 8,6 đến 10,6, blur trên ảnh 74 đến 82.

- Ảnh có sẵn ([skeleton chờ ảnh R3](loading-glass-and-page-entry.md#r3-ảnh-có-sẵn)) không mờ. Card ra khỏi viewport khi
  blur chưa tan thì gỡ blur; vào lại khi ảnh đã tải xong thì hiện thẳng.
- Điện thoại giữ luật chờ trang ngừng cuộn `120ms` trước khi tan (`PHONE_REVEAL_SCROLL_IDLE_MS`).
- Card không còn Kính, khung skeleton, Flow hay WebGL context; skeleton Flow chỉ còn ở batch cuối masonry
  ([skeleton](advertising-skeleton.md)). Đã gỡ bản giảm tải tạm của PR #618.
- Primary giữ [skeleton chờ ảnh R4](loading-glass-and-page-entry.md#r4-mở-ảnh-tại-chỗ).

```gherkin
Given masonry Advertising trên PC, tắt cache, mạng chậm
When kéo thanh cuộn nhanh làm card mới vào viewport
Then ảnh của card hiện mờ ngay, card không có Kính, canvas Flow hay khung skeleton
And ảnh được vẽ dần dưới blur; khi tải xong blur tan rồi bị gỡ
```

### R10. Lên bản gốc sau khi hiện

Ảnh đã hiện ở bản vừa khung (R3) và đang trong màn hình thì tải tiếp bản gốc (4K khi có), ở mọi trang và mọi vị trí
(owner chọn 2026-10-31 10:45). Bản gốc tải riêng bằng `Image`, `decode()` xong mới đổi `srcset` của ảnh, hoặc của
`<source>` JXL khi trình duyệt đang dùng JXL; không cho bản gốc vẽ dần đè lên vì lúc đầu nó mờ hơn bản đang hiện.

- Chỉ chạy khi trang ngừng cuộn `250ms`, sau `load`, khi không ảnh nào trong màn hình còn đang tải; mỗi lượt một ảnh.
  Decode xong lúc trang đã cuộn lại thì chờ rảnh rồi mới đổi.
- Card còn blur (R9), đang chạy reveal hoặc ảnh đang ẩn (slide hero chưa tới lượt) thì để lượt sau; ảnh có `filter` từ
  stylesheet (nền mờ primary) không lên.
- Ảnh đã là bản gốc, đã ra khỏi màn hình hoặc bị gỡ thì bỏ. Code ở script `<head>` (`head-inline.js`), một chỗ cho mọi trang.

```gherkin
Given /vi/residential/ ở 1440px, hero đã hiện bản 1600
When trang đứng yên
Then hero đổi sang bản gốc sau khi bản gốc tải và decode xong, bản gốc chỉ được request một lần
And lúc trang đang cuộn không ảnh nào đổi sang bản gốc
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| File | `<tên>.jxl`, `<tên>-240\|480\|960\|1600\|2048.jxl` | Biến thể (R1), `build-image-variants.mjs` ghi |
| Data | `assets/content/jxl-thresholds.json` | `{ path: thresholdBytes }` (R2), build ghi, site chưa đọc |
| File | `/sw.js` | Chỉ tự gỡ Service Worker cũ (R3); `_headers` đặt `Cache-Control: no-cache` |
| Tool | `cjxl`, `djxl` v0.11.1 ghim trong `tooling-versions.json` | Encode, tính ngưỡng |

Code nằm trong file của spec khác: `motion.js` ([shell](site-shell.md)), `prepare-static-assets.mjs`, `_headers`
([phát hành tĩnh](static-release.md)), `build-image-variants.mjs`, `responsive-image.mjs` ([tải ảnh](media-delivery.md)),
`catalog-runtime.mjs`, `photo-viewer.mjs` ([masonry](advertising-masonry.md), [viewer](advertising-viewer-touch-zoom.md)).
Khi cài, sửa các spec sở hữu trong cùng PR và chuyển spec này sang `live`.

## UI

Không đổi hình vệt sáng, skeleton, Kính: [Vệt sáng](../../design-system/components/LoadSweep/README.md),
[Skeleton](../../design-system/components/Skeleton/README.md),
[Kính hiện và tan](../../design-system/components/Glass/README.md#hiện-và-tan-trên-ảnh-vừa-tải). Card chờ ảnh đổi từ Kính
sang blur trên ảnh (R9); README Kính và MediaCard ghi lại điều này khi cài, cần owner duyệt và gõ `republish`.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1 | `node scripts/site/build-image-variants.mjs --check`; so dung lượng JXL với AVIF cùng cỡ (chưa có test) |
| R2 | Kiểm ngẫu nhiên ngưỡng bằng `djxl --allow_partial_files` (chưa có test) |
| R3 | `image-reveal-complete.e2e.mjs` (proxy chậm, không đăng ký Service Worker, hero settle sau `load`, một request; blur card chỉ tan khi ảnh tải xong; viewer đổi sang bản gốc khi tải xong, một request) |
| R4 | `first-load-parity.e2e.mjs`: font trễ 1s thì veil mở sau khi font về, ảnh hero trễ 3s thì veil không chờ |
| R5, R6 | Waterfall trong `image-delivery-measure.mjs` (chưa có test) |
| R7 | Review diff: không có đường hiện ảnh thứ hai |
| R8 | `image-delivery-measure.mjs` trên demo; A04s qua máy PC |
| R9 | `advertising-skeleton-slow-network.e2e.mjs` (tắt cache, kéo thanh cuộn, hơn 12 card mờ, card chờ ảnh có màu chủ đạo, không card nào có Kính), `glass-surface.e2e.mjs`, `image-loading-frame.e2e.mjs` P9, `image-reveal-complete.e2e.mjs` |
| R10 | `image-upgrade.e2e.mjs` (hero và card trong màn hình lên bản gốc, card ngoài màn hình giữ bản vừa khung, không đổi khi đang cuộn, một request) |

## Gate còn mở

- A05s và iPhone 16 chưa có kết quả JXL ([trang thử](https://claude.ai/artifact/5L61tBABqqQG3F3KKbh77k)). Owner.
- Chrome 155 bật JXL mặc định mới thấy ở nguồn thứ cấp; Samsung Internet chưa rõ. Main.
- Ảnh chưa có PNG gốc encode lại từ WebP: owner xem lại chất lượng trên demo. Owner.

## Chú thích thuật ngữ

- **JPEG XL (JXL)**: định dạng ảnh mới, hỗ trợ tải progressive và ảnh động.
- **Progressive**: file xếp dữ liệu để trình duyệt vẽ được bản mờ trước rồi nét dần khi tải thêm.
- **Ngưỡng chất lượng**: số byte đầu file đủ để bản vẽ dở đạt SSIM 0,90 so với bản đủ; build còn tính, site không dùng.
- **Service Worker**: script chạy giữa trang và mạng; bản cũ đếm byte ảnh JXL, bản hiện nay chỉ tự gỡ.
- **SSIM**: chỉ số giống nhau về cấu trúc giữa hai ảnh, 1 là giống hệt.
- **Tầng tải**: nhóm tài nguyên của trang cùng mức ưu tiên; tầng sau không giành băng thông của tầng trước.
- **Veil**: lớp trắng phủ trang lúc tải hoặc chuyển trang.
- **Waterfall**: biểu đồ thời điểm bắt đầu, kết thúc của từng request.
- **DPR**: `devicePixelRatio`, số pixel thật trên một pixel CSS.
- **Cohort**: tập ảnh hoặc card giống nhau giữa các lượt đo để so công bằng.
