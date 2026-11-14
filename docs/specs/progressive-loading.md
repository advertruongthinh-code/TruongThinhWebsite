---
title: Ảnh JPEG XL progressive và thứ tự tải
status: live
source:
  - src/site/sw.js
  - src/site/media-lib/colors.mjs
tests:
  - tests/site/image-loading-frame.e2e.mjs
  - tests/site/image-reveal-complete.e2e.mjs
  - tests/site/image-upgrade.e2e.mjs
  - tests/site/image-format-fallback.e2e.mjs
  - tests/site/advertising-skeleton-slow-network.e2e.mjs
  - tests/site/first-load-parity.e2e.mjs
  - tests/site/image-delivery-measure.mjs
notion: https://app.notion.com/p/406332849a0e816ebc6af97487876c15
updated: 2026-11-13
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
- Ảnh primary và viewer Advertising luôn tải bản gốc, cả trên điện thoại (`masonry/runtime.mjs`, `masonry/detail-viewer.mjs`).
- Veil mở khi `mountPage` xong; trên Advertising gồm vendor, runtime, artifact và lần dựng catalog. Veil không chờ ảnh, font.
- `sharp` 0.35.5 của repo không encode được JXL. `cjxl`, `djxl` v0.11.1 (libjxl chính thức) chạy được trên cloud.
- Cùng SSIM với AVIF quality 55, JXL nặng hơn khoảng 50% (8 ảnh 1600px). Cùng dung lượng với AVIF, JXL progressive có SSIM so
  với ảnh gốc 0,93 đến 0,95, AVIF 0,95 đến 0,97 (3 ảnh). SSIM có thể thiên về AVIF.
- Bản cắt dở của JXL progressive (`djxl --allow_partial_files`): dưới 30 đến 50% số byte chưa ra hình; SSIM 0,9 so với bản
  đủ đạt ở khoảng 50 đến 70% số byte (3 ảnh).
- Chromium 153 bật cờ JXL, mạng 100 KB/s, ảnh 3072px 1,1 MB: thấy bản mờ lúc 4,2s, xong lúc 11,4s.
- A04s thật (Chrome 156, Android 14): JXL tĩnh, `<picture>` chọn JXL, JXL động 8 khung đều chạy. `ImageDecoder` với JXL động
  làm crash tab trên điện thoại và Chrome PC. Progressive qua Service Worker đếm byte (100 KB/s, file 240 KB, ngưỡng 180 KB): tin ngưỡng lúc 1,9s, `load` 2,7s, `decode()` xong 3,1 đến 3,6s; thấy bản mờ trước `load`, một request mỗi lần tải.

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
- Phone (`(hover: none) and (pointer: coarse)`) chỉ dùng WebP, trần cỡ 960, không tải bản gốc; PC dùng JXL, WebP khi trình duyệt không đọc được JXL (owner 2026-11-07). A04s giải mã 480 JXL 47ms, WebP 17ms; 960 là 87 so với 28ms. AVIF, WebP giữ trong repo làm nguồn encode và bản lưu (owner 2026-10-27); og:image, JSON-LD, sitemap ảnh giữ WebP.

Trung tâm vùng ưu tiên dùng giữa ảnh. Đặt tâm theo model Google Attention Center là việc sau, cần TensorFlow Lite.

```gherkin
Given ảnh 3072×2048 có AVIF quality 55 cỡ 1600 là 109 KB
When chạy build-image-variants
Then có <tên>-1600.jxl progressive không quá 109 KB, cùng các cỡ 240, 480, 960, 2048 và bản gốc
And chạy lại với --check thì exit 0
```

### R2. Ngưỡng chất lượng

Lúc build, mỗi bản gốc JXL có ngưỡng byte cho từng cỡ mà khung lớn có thể đang hiện trước khi lên bản gốc (960, 1600, 2048, cỡ
nào có file): số byte đầu nhỏ nhất mà bản gốc tải dở, thu về rộng bằng cỡ đó, có SSIM so với bản gốc đủ không thấp hơn SSIM của
chính file cỡ đó (độ chói, cửa sổ 8×8). Từ ngưỡng đó bản dở đã nét bằng hoặc hơn bản đang hiện, nên đổi sang không làm ảnh mờ đi
(owner duyệt plan 2026-11-12). Script dò bằng `djxl --allow_partial_files`, ghi `assets/content/jxl-thresholds.json`
(`{ "<path gốc>.jxl": { "960": bytes, "1600": bytes, "2048": bytes } }`), tính lại khi một biến thể của ảnh được build lại;
`--check` báo ảnh thiếu ngưỡng. Đo 2026-11-13 trên 596 ảnh: trung vị 62% cỡ file, 80% số ngưỡng nằm trong 54-70%.

```gherkin
Given <tên>.jxl rộng 3072 có <tên>-1600.jxl
When build tính ngưỡng
Then jxl-thresholds.json có "<tên>.jxl" với "1600" không quá cỡ file
And giải mã đúng số byte đó, thu về rộng 1600, cho SSIM so với bản gốc không thấp hơn <tên>-1600.jxl
```

### R3. Ảnh chỉ hiện khi tải xong

Ảnh chỉ hiện khi đã tải xong toàn bộ file và `decode()` xong, ở mọi trang và mọi trình duyệt (owner 2026-10-31: "ảnh chỉ
xuất hiện khi đủ chất lượng như lúc trước khi làm jxl"). Bản đầu (2026-10-27) cho hiện từ ngưỡng SSIM 0,90 (R2) nhờ Service
Worker đếm byte; owner thấy chưa đủ chất lượng nên bỏ. Riêng bản gốc ở R10 hiện từ ngưỡng R2 (2026-11-13): ngưỡng so với bản
đang hiện nên ảnh không mờ đi.

- Trang tĩnh: vệt sáng của [tải ảnh R6](media-delivery.md#r6-vệt-sáng-chờ-ảnh-tĩnh) che tới `load` và `decode()`.
- Advertising: card giữ khung Flow (điện thoại: lớp màu 4 màu chủ đạo) tới khi ảnh tải xong (R9), primary lộ qua kính mờ lúc `decode()` xong (điện thoại: ảnh hiện `0.45s` trên lớp màu)
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
- Chọn biến thể chỉ ở `responsivePictures` (build) và `media-lib/responsive-image.mjs` (runtime); đổi đuôi sang `.jxl`, thang cỡ khai
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
- Lúc file ảnh về đủ không chậm hơn quá 5%; byte ảnh trước lúc nâng bản gốc (R10) không tăng (cùng dung lượng với AVIF).
- Veil tan theo gate [mở trực tiếp R3](first-load-parity.md#r3-phần-nhẹ-hiện-trước-phần-nặng-không-chặn) (dưới 1s).
- CLS tối đa 0,1; 0 request ảnh trùng URL; không frame nào thấy ảnh tải dở của card (R9: ảnh ẩn dưới khung Flow hoặc lớp màu).
- LCP không tăng quá 5%.

```gherkin
Given demo vừa deploy bản có spec này
When chạy image-delivery-measure.mjs --runs 5 trên bản cũ và bản mới
Then summary.json đạt mọi ngân sách ở trên, kể cả lượt --warm
```

### R9. Card chờ ảnh bằng Flow hoặc lớp màu

PC (owner 2026-11-12, đo ở DRY 3b.1): card masonry chính và related vào viewport khi ảnh chưa tải xong thì ảnh ẩn dưới một khung [skeleton](advertising-skeleton.md) Flow (`[data-masonry-loading-skeleton]` trong `.card-media`) mang 4 màu của chính ảnh (`MEDIA_COLORS[1..4]`; thiếu thì màu preset), vẽ trên canvas Flow chung của lưới ([skeleton R5](advertising-skeleton.md#r5-webgl-context)). Khung tô màu chủ đạo của ảnh (`MEDIA_COLORS`, `dominant` trong `image-palette.mjs`, khớp `sharp` `stats().dominant`) nằm dưới khung Flow nên ảnh chưa có byte không thành ô trắng (A04s 400 kbit/s: ô trắng 2 đến 4s; owner chọn 2026-10-31 11:09). Tải và `decode()` xong (R3) thì lộ ảnh như primary: canvas Flow hóa kính mờ của chính ảnh rồi tan ra ảnh nét trong `0.6s`, rồi gỡ khung, không Kính ([skeleton chờ ảnh R1, R2](loading-glass-and-page-entry.md#r1-card-đang-tải-chờ-dưới-flow)). Owner chọn kiểu 10 "Kính mờ rẻ" (2026-11-12) sau khi đo: Kính lộ ảnh làm Skia biên dịch shader lần đầu dùng, một khung GPU 47 đến 106ms giữa lượt lộ hàng loạt trên PC owner kể cả khi chỉ 2 Kính cùng lúc; crossfade không Kính thì khớp main (3b.2 lượt 5 đến 7). Không còn ảnh mờ hay thở trên card.

Lịch sử số đo: bản đầu đặt Kính ba bậc (`backdrop-filter`) thường trực trên 15 đến 18 card đang chờ; owner kéo thanh cuộn cực đoan (tắt cache, 3G) thấy FPS không hơn Flow (2026-10-31 09:59). Trace 1920px: Kính thường trực 14 đến 15 FPS, blur 41; A04s 400 kbit/s: Kính 8,6 đến 10,6, blur 74 đến 82. Owner chọn blur trên ảnh (2026-10-31). PC owner (RTX 3090, 1920x1080, 3G, tắt cache, trung vị 3 lượt, 2026-11-12): kéo thanh cuộn blur 83,3 FPS (1% low 80,0), Flow rồi crossfade 83,4 (80,6), Flow rồi Kính 83,7 (80,0), không long task; cả ba chạm trần nhịp khung và Kính chỉ chạy 3 đến 5 lần mỗi lượt, nên chưa tách được chi phí GPU và chưa đo máy yếu hơn. Gate PC (áp cho bản kính mờ): cùng kịch bản kéo thanh cuộn không dưới 81,3 FPS, 1% low không dưới 78, không long task trên 50ms; lượt lộ hàng loạt (Fast 4G, tắt cache, 3 giây đầu) không thấp hơn bản blur quá 2 FPS.

- Điện thoại (`skeletonPhone`, owner 2026-11-12) không Flow, không Kính: card chờ ảnh (chính, related, card tạm) và primary chờ bằng lớp màu phẳng đổi qua 4 màu chủ đạo (`MEDIA_COLORS[1..4]`,
  `2s` mỗi màu, chu kỳ `8s`; lớp trên chỉ đổi opacity, lớp dưới đổi màu từng bước lúc bị phủ; `[data-media-wait="colors"]` trong `detail.css`); ảnh ẩn tới khi `decode()` xong rồi hiện `0.45s` `cubic-bezier(0.16, 1, 0.3, 1)` trên lớp màu, xong gỡ lớp.
  Thiếu đủ 5 màu thì lớp đứng yên ở màu chủ đạo. Giữ luật chờ ngừng cuộn `120ms` (`PHONE_REVEAL_SCROLL_IDLE_MS`). A04s 400 kbit/s (2026-11-12, trung vị 3 lượt, SurfaceFlinger `ChromeChildSurface`, so với blur trước #864): fling lưới 71,3 so với 70,9 FPS, related 71,8 so với 71,1, detail lạnh 76,0 so với 75,9; 1% low 32 đến 37 so với 30 đến 33. rAF trong trang 40 đến 50 và 1% low khoảng 30 ở cả hai bản là nợ có từ trước.
- Ảnh có sẵn ([skeleton chờ ảnh R3](loading-glass-and-page-entry.md#r3-ảnh-có-sẵn)) không có khung Flow. Card ra khỏi viewport khi chưa lộ thì gỡ khung; vào lại khi ảnh đã tải xong thì hiện thẳng.
- Primary trên PC giữ [skeleton chờ ảnh R4](loading-glass-and-page-entry.md#r4-mở-ảnh-tại-chỗ); trên điện thoại chờ bằng lớp màu như trên.

```gherkin
Given masonry Advertising trên PC 1440px, tắt cache, mạng chậm
When card mới vào viewport khi ảnh chưa tải
Then ảnh ẩn, không blur, dưới khung Flow đang chạy trong 4 màu của ảnh; mọi card chờ dùng một canvas chung của lưới
And khi tải xong ảnh lộ qua kính mờ của chính nó trong 0.6s, không card nào có Kính, rồi khung bị gỡ
```

### R10. Lên bản gốc sau khi hiện

Ảnh khung lớn (rộng từ 640px, hoặc rộng hay cao từ 60% viewport: hero, ảnh lớn detail) đã hiện ở bản vừa khung (R3) và đang trong
màn hình thì tải tiếp bản gốc (4K khi có), ở mọi trang (owner chọn 14:01, thay "mọi ảnh" lúc 10:45). Card và ô nhỏ giữ
bản vừa khung: mọi item masonry (`[data-masonry-item]`: card lưới, card related, card gợi ý, ở mọi trang có masonry): card 4K làm A04s tụt 72 xuống 39-47 FPS, decode 4K giữ main 120-160ms trên PC (card related: PC owner đứng 200-480ms, 2026-11-09). Bản gốc JXL tải bằng
`fetch` và đếm byte: số byte đã về đạt ngưỡng R2 của cỡ đang hiện thì phần đã về (blob) thay bản đang hiện, thêm một lần ở nửa
đường còn lại, rồi bản đủ (cũng là blob, nên bản gốc chỉ request một lần dù header cache thế nào). Lần nào cũng `decode()` xong mới
đổi `<source>` JXL hoặc `src`. Không có ngưỡng (WebP, cỡ không có) thì tải cả file bằng `Image` như trước. Viewer mở trên bản
đủ của primary nếu đã có; không thì mở trên bản đang hiện và tự tải bản gốc, không qua bước này. Phone không lên bản gốc (R1).

- Chỉ chạy khi trang ngừng cuộn `250ms`, sau `load`, khi không ảnh nào trong màn hình còn đang tải (lưới dưới detail đang mở,
  `content-visibility: hidden`, không tính); mỗi lượt một ảnh. Decode xong lúc trang đã cuộn lại thì chờ rảnh rồi mới đổi.
- Đang chạy reveal hoặc ảnh đang ẩn (slide hero chưa tới lượt) thì để lượt sau; ảnh có `filter` (nền mờ primary) không lên.
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
| Data | `assets/content/jxl-thresholds.json` | `{ "<gốc>.jxl": { cỡ: bytes } }` (R2), build ghi, `head-inline.js` đọc khi lên bản gốc (R10) |
| File | `/sw.js` | Chỉ tự gỡ Service Worker cũ (R3); `_headers` đặt `Cache-Control: no-cache` |
| Tool | `cjxl`, `djxl` v0.11.1 ghim trong `tooling-versions.json` | Encode, tính ngưỡng |

Code nằm trong file của spec khác: `motion.js` ([shell](site-shell.md)), `prepare-static-assets.mjs`, `_headers`
([phát hành tĩnh](static-release.md)), `build-image-variants.mjs`, `media-lib/responsive-image.mjs` ([tải ảnh](media-delivery.md)),
`masonry/runtime.mjs`, `masonry/detail-viewer.mjs` ([masonry](advertising-masonry.md), [viewer](advertising-viewer-touch-zoom.md)).
Khi cài, sửa các spec sở hữu trong cùng PR và chuyển spec này sang `live`.

## UI

[Vệt sáng](../../design-system/components/LoadSweep/README.md),
[Skeleton](../../design-system/components/Skeleton/README.md),
[Kính](../../design-system/components/Glass/README.md). Card PC chờ ảnh đổi từ blur
sang khung Flow rồi kính mờ lúc lộ (R9, 2026-11-12); README Kính, MediaCard, Primary, Skeleton và Motion ghi lại cùng PR.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1 | `node scripts/site/build-image-variants.mjs --check`; so dung lượng JXL với AVIF cùng cỡ (chưa có test) |
| R2 | `node scripts/site/build-image-variants.mjs --check` (thiếu ngưỡng thì exit 1); kiểm ngẫu nhiên bằng `djxl --allow_partial_files` |
| R3 | `image-reveal-complete.e2e.mjs` (proxy chậm, không đăng ký Service Worker, hero settle sau `load`, một request; card chỉ lộ từ khung Flow khi ảnh tải xong; viewer đổi sang bản gốc khi tải xong, một request) |
| R4 | `first-load-parity.e2e.mjs`: font trễ 1s thì veil mở sau khi font về, ảnh hero trễ 3s thì veil không chờ |
| R5, R6 | Waterfall trong `image-delivery-measure.mjs` (chưa có test) |
| R7 | Review diff: không có đường hiện ảnh thứ hai |
| R8 | `image-delivery-measure.mjs` trên demo; A04s qua máy PC |
| R9 | `advertising-skeleton-slow-network.e2e.mjs` (tắt cache, kéo thanh cuộn, mọi card chờ chạy Flow trên một canvas của lưới, không ảnh mờ, card chờ ảnh có màu chủ đạo, lộ hàng loạt không Kính, có bản sao kính mờ), `glass-surface.e2e.mjs`, `image-loading-frame.e2e.mjs` P9, `image-reveal-complete.e2e.mjs` |
| R10 | `image-upgrade.e2e.mjs` (hero và ảnh lớn detail lên bản gốc, card masonry giữ bản vừa khung, không đổi khi đang cuộn, một request; mạng chậm thì hiện bản dở trước rồi bản đủ) |

## Gate còn mở

- A05s và iPhone 16 chưa đo JXL ([trang thử](https://claude.ai/artifact/5L61tBABqqQG3F3KKbh77k)). Owner.
- R8 còn hụt, có sẵn từ trước JXL: veil tan quá 1s ở Slow 4G. Ảnh đầu ở Advertising sát ngưỡng 5% (lab +2 đến +5,7%, A04s +5,2%), các route khác nhanh hơn hoặc ngang. Main.
- Chrome 155 bật JXL mặc định mới thấy ở nguồn thứ cấp; Samsung Internet chưa rõ. Main.
- Ảnh chưa có PNG gốc encode lại từ WebP: owner xem lại chất lượng trên demo. Owner.

## Chú thích thuật ngữ

- **JPEG XL (JXL)**: định dạng ảnh mới, hỗ trợ tải progressive và ảnh động.
- **Progressive**: file xếp dữ liệu để trình duyệt vẽ được bản mờ trước rồi nét dần khi tải thêm.
- **Ngưỡng chất lượng**: số byte đầu của bản gốc đủ để bản vẽ dở nét bằng bản đang hiện (R2).
- **Service Worker**: script chạy giữa trang và mạng; bản cũ đếm byte ảnh JXL, bản hiện nay chỉ tự gỡ (R10 đếm byte bằng `fetch`).
- **SSIM**: chỉ số giống nhau về cấu trúc giữa hai ảnh, 1 là giống hệt.
- **Tầng tải**: nhóm tài nguyên của trang cùng mức ưu tiên; tầng sau không giành băng thông của tầng trước.
- **Veil**: lớp trắng phủ trang lúc tải hoặc chuyển trang.
- **Waterfall**: biểu đồ thời điểm bắt đầu, kết thúc của từng request.
- **DPR**: `devicePixelRatio`, số pixel thật trên một pixel CSS.
- **Cohort**: tập ảnh hoặc card giống nhau giữa các lượt đo để so công bằng.
