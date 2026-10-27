---
title: Tải theo nấc và thứ tự ưu tiên
status: planned
source: []
tests:
  - tests/site/image-loading-frame.e2e.mjs
  - tests/site/first-load-parity.e2e.mjs
  - tests/site/image-delivery-measure.mjs
notion: https://app.notion.com/p/406332849a0e816ebc6af97487876c15
updated: 2026-10-27
---

# Tải theo nấc và thứ tự ưu tiên

## Mục đích

Ảnh hiện nhanh ở nấc nhẹ rồi nét dần tới bản gốc; trang tải theo tầng, veil trắng và vệt sáng kết thúc đúng lúc; HTML,
CSS, font, JavaScript, media có một thứ tự ưu tiên chung (owner 2026-10-27). Spec này thêm lớp trên
[tải ảnh](media-delivery.md), [veil của shell R7](site-shell.md#r7-veil-khi-tải-trực-tiếp-fallback-và-bfcache),
[mở trực tiếp](first-load-parity.md) và [skeleton chờ ảnh](loading-glass-and-page-entry.md); không thêm motion mới.

## Hiện trạng đã đo

- 307 trên 497 ảnh nội dung rộng khoảng 3072px (chưa phải 4K 3840px). Thang biến thể là 240, 480, 960 rồi tới bản gốc.
- AVIF trung bình trên 24 ảnh lớn: cỡ 960 là 58 KB, 1600 là 120 KB, 2048 là 176 KB, gốc là 325 KB (cỡ 1600 và 2048 encode thử
  ở effort 4; repo dùng effort 6 nên file thật có thể nhỏ hơn).
- Ảnh primary và viewer Advertising luôn tải bản gốc, cả trên điện thoại (`catalog-runtime.mjs`, `photo-viewer.mjs`).
- Mở trực tiếp: veil mở khi `mountPage` xong. `TruongThinhDetail.mount` trả `catalogReady`, nên trên Advertising veil chờ
  vendor, runtime, artifact và lần dựng catalog. Veil không chờ ảnh hero, không chờ `document.fonts.ready`.
- Gzip: `style.css` 17 KB, `detail.css` 21 KB, `motion.js` 31 KB, `detail.js` 8 KB, `catalog-runtime.mjs` 65 KB.
- Code nâng ảnh "tải bản tách rời, `decode()` rồi mới đổi, ưu tiên gần tâm viewport, tối đa 2 ảnh" đã có trong
  `image-tier.js` (commit `de9ec90`, PR #559), gỡ ở PR #585 ngày 26/10. Owner thấy ảnh không tốt lên dần (2026-10-27): mạng
  thường thì tải thẳng bản đủ nét, không có bậc nhẹ; mạng chậm thì chỉ nâng khi đo được hai lần liên tiếp từ 4 Mbps, ngoài ra
  nâng thử một ảnh mỗi 3s lúc trang đứng yên, nên mạng chậm suốt thì ảnh gần như giữ bậc nhẹ.
- Ảnh 3072×2048 giải mã chiếm khoảng 25 MB RAM (3072 × 2048 × 4 byte, tính toán, chưa đo trên máy).

## Hành vi

### R1. Ba nấc ảnh

Mỗi ảnh nội dung có tối đa ba nấc:

| Nấc | File | Khi nào |
| --- | --- | --- |
| 1. Nhanh | Cỡ nhỏ nhất trong 240, 480, 960 đủ nhu cầu hiển thị, tối đa 960 | Luôn tải đầu tiên |
| 2. Đủ nét | Cỡ trong 1600, 2048, gốc vừa đủ nhu cầu hiển thị | Chỉ khi nhu cầu lớn hơn file nấc 1 |
| 3. Gốc | Bản gốc (3072px hiện nay, 3840px khi có ảnh nguồn) | Chỉ khi mở viewer hoặc phóng to |

Nhu cầu hiển thị là bề rộng sau crop nhân `devicePixelRatio`, đo như
[tải ảnh R2](media-delivery.md#r2-html-tĩnh-chọn-biến-thể). Khung nhỏ (card masonry thường, thumbnail, nút suggestion) dừng ở
nấc 1. Khung lớn (hero, ảnh full-bleed, card full-span, primary) lên nấc 2. Chỉ một ảnh tại một thời điểm lên nấc 3, nên điện
thoại không phải giữ nhiều ảnh gốc 25 MB trong RAM.

`build-image-variants.mjs` sinh thêm cỡ 1600 và 2048 ở AVIF. WebP vẫn dừng ở 960 cộng bản gốc làm fallback.
Owner muốn chuyển sang JPEG XL nếu chạy được trên web và điện thoại (A04s, A05s, iPhone 16), sau này dùng làm ảnh động
(2026-10-27). Đo trên 8 ảnh 1600px: ở cùng SSIM với AVIF quality 55, JXL nặng hơn khoảng 50% (1309 KB so với 872 KB);
SSIM có thể thiên về AVIF, chưa đo bằng thước khác. Chrome bật JXL mặc định từ bản 155 (nguồn thứ cấp), Safari có từ 17
(theo nguồn thứ cấp là không có ảnh động và không có progressive). A04s thật (Chrome 156, Android 14, máy PC 2026-10-27):
JXL tĩnh chạy (`<img>`, `createImageBitmap`, `<picture>` chọn nguồn JXL); JXL động 8 khung chạy đúng trong `<img>`, đồng bộ với
WebP và GIF động. Không dùng `ImageDecoder` với JXL động: tab crash trên cả điện thoại và Chrome PC. [CẦN LÀM RÕ: A05s và
iPhone 16 chưa có kết quả; giữ AVIF hay thêm JXL chốt sau khi đủ ba máy.] Owner.

```gherkin
Given /vi/residential/ ở 390×844 DPR 3, Slow 4G, cache trống
When ảnh hero và gallery tải xong, trang đứng yên
Then ảnh hero tải một file nấc 1 (cỡ 960) rồi đúng một file nấc 2 (cỡ 1600)
And ảnh gallery khung nhỏ chỉ tải một file nấc 1
And không ảnh nào tải bản gốc khi chưa mở viewer
```

### R2. Nấc 1 và lúc vệt sáng kết thúc

HTML tĩnh và runtime Advertising chọn nấc 1 bằng chính cơ chế `srcset`, `sizes` hiện có, chỉ giới hạn `sizes` để file chọn
không vượt 960. Primary Advertising bỏ cách gán thẳng bản gốc, dùng `srcset` như card.

Vệt sáng ([tải ảnh R6](media-delivery.md#r6-vệt-sáng-chờ-ảnh-tĩnh)) và skeleton, Kính
([skeleton chờ ảnh R1, R2, R4](loading-glass-and-page-entry.md)) kết thúc khi nấc 1 đã `load` và `decode()` xong, như hiện
nay. Nấc 2, nấc 3 không làm vệt sáng, skeleton hay Kính hiện lại.

```gherkin
Given ảnh nấc 1 của /vi/about/ bị trễ 1,5s
When nấc 1 load và decode xong
Then khung nhận is-media-settled, vệt gỡ, ảnh fade lên như tải ảnh R6
And khi nấc 2 thay vào sau đó, khung không có lại vệt, không đổi kích thước, không lóe nền
```

### R3. Nâng nấc ở nền

Nấc 2 bắt đầu khi trang vào tầng 3 (R4). Việc nâng dùng lại lõi của `image-tier.js` (R7), bỏ phần đo mạng:

1. Hàng đợi gồm ảnh cần nấc 2 trong viewport và trong một viewport quanh đó (`IntersectionObserver`, `rootMargin: 100% 0px`).
   Ảnh gần tâm viewport đi trước. Tối đa 2 ảnh cùng tải, `fetchpriority="low"`.
2. Tải bản tách rời khỏi DOM với `srcset` và `sizes` của nấc 2, chờ `decode()`, rồi mới ghi `sizes` (hoặc `src` với ảnh
   không có `srcset`) lên ảnh thật. Trình duyệt dùng lại file vừa tải, nên ảnh thật không request lần hai.
3. Đang cuộn thì tạm dừng lấy ảnh mới vào hàng; trang ngừng cuộn `120ms` mới tiếp tục (cùng ngưỡng
   `PHONE_REVEAL_SCROLL_IDLE_MS`). Ảnh nấc 1 mới vào viewport luôn đi trước nấc 2.
4. Nâng lỗi: giữ nấc 1, không gắn `.is-media-error`, không thử lại trong trang đó.
5. Nấc 3: mở viewer hiện ngay file đang có (nấc 1 hoặc 2, đã có trong cache), rồi nâng lên bản gốc theo bước 2. Phóng to
   trong viewer trước khi bản gốc về thì vẫn phóng được trên file đang có.

Điều kiện bắt buộc khi dùng lại lõi `image-tier.js`, rút từ review 2026-10-27 (dòng theo commit `de9ec90`):

- Lưu `src`, `srcset` của ảnh và `<source>` trước `await decode()`; sau đó ảnh đã đổi nguồn hoặc rời DOM thì bỏ, không ghi
  (L102-113 ghi đè: primary đang đổi sang ảnh B sẽ bị trả về bản gốc của ảnh A).
- Nhu cầu hiển thị dùng chung công thức crop của script `<head>` (`index.html` dòng 52), không dùng
  `getBoundingClientRect().width` (L103: khung dọc 461×720 cần 1080px chỉ nhận 461px).
- Không bao giờ hạ: bỏ qua khi file đang hiện đã đủ nhu cầu hoặc là bản gốc (cùng điều kiện `index.html` dòng 54).
- Chỉ đưa vào hàng ảnh đã `complete` và có `naturalWidth`; ảnh chưa tải nghe `load` rồi mới vào (L97-98, L88).
- Rời trang (Barba) hoặc card bị gỡ thì hủy bản tách rời đang tải để trả chỗ; card dựng lại do ảo hóa vào hàng ngay lúc
  tạo (`createPhotoMedia`, `renderPrimaryMedia`).
- `sizes` luôn là px đã tính, không để `auto` ở bản tách rời, để bản tách rời và ảnh thật chọn cùng URL.
- Tính khoảng cách tới tâm một lần mỗi lượt chọn; bỏ `retries`, `force`, `probeWaiting`.

Không có nhánh theo tốc độ mạng hay Save-Data (owner bỏ tải ảnh theo mạng ngày 26/10). Nâng nấc chạy theo thời gian ở mọi
mạng: mạng thường cũng qua nấc 1 trước, mạng chậm vẫn nâng, chỉ chậm hơn. Đây là khác biệt chính với PR #559.

```gherkin
Given /vi/ ở 1440×900 DPR 2, hero cần 2880px
When nấc 1 của mọi ảnh trong viewport đã settled và intro hero xong
Then hero tải bản nấc 2 tách rời với fetchpriority low, decode xong mới thay
And không lúc nào có quá 2 request nấc 2 cùng chạy
And mỗi URL ảnh chỉ request một lần

Given /vi/residential/ ở 390×844 DPR 3, mạng giữ Slow 4G suốt lượt xem
When trang đứng yên tới khi hàng đợi nấc 2 trống
Then mọi ảnh khung lớn trong viewport đã thay sang nấc 2, không ảnh nào kẹt ở nấc 1 vì mạng chậm

Given detail Advertising đang mở, primary ở nấc 2
When bấm "Xem lớn hơn"
Then viewer hiện ngay ảnh primary đang có, rồi thay bằng bản gốc khi decode xong, không vệt, không skeleton
```

### R4. Tầng tải trang và lúc veil mở

Mở trực tiếp và chuyển trang mềm dùng cùng một bộ tầng. Trang detail view (`?photo=`, `/p/<id>`) không có veil, chỉ áp
tầng 2, tầng 3 cho media.

| Tầng | Gồm | Kết thúc khi |
| --- | --- | --- |
| 0. Khung | HTML, hai CSS, hai font preload, script `<head>` | Lần vẽ đầu, veil trắng phủ |
| 1. Mở veil | JavaScript `defer`, font; Advertising thêm vendor, runtime, artifact và khung masonry. Ảnh hero nấc 1 bắt đầu tải ở tầng này nhưng veil không chờ nó | Veil bắt đầu mở (luật dưới) |
| 2. Nội dung đầu | Ảnh nấc 1 trong viewport, motion chữ hero, rail và chip, card trong cửa sổ ảo hóa đầu | Mọi ảnh trong viewport settled (load hoặc lỗi) và intro hero xong |
| 3. Nền | Ảnh ngoài viewport (lazy), slide hero sau, video, module Swiper, `catalog-detail`, nấc 2 | Không có mốc kết thúc |

Mọi lần vào trang (mở trực tiếp và chuyển mềm) đều có veil như hiện nay (owner 2026-10-27). Veil bắt đầu mở khi đủ thứ cần
thiết: `mountPage` xong (shell, chữ hero, khung có kích thước; Advertising gồm khung masonry) và `document.fonts.ready` đã
xong. Veil không chờ ảnh nào, kể cả hero: ảnh chưa xong thì khung chạy vệt sáng hoặc skeleton sau khi veil mở (R2).

Không có mốc thời gian: mạng chậm thì veil giữ tới khi đủ hai điều kiện trên, đúng luật
[shell R7](site-shell.md#r7-veil-khi-tải-trực-tiếp-fallback-và-bfcache). Font lỗi vẫn làm `fonts.ready` xong nên không treo
veil. Delay intro hero vẫn đếm từ lúc veil bắt đầu mở
([mở trực tiếp R2](first-load-parity.md#r2-motion-chữ-hero-khi-mở-trực-tiếp-giống-chuyển-mềm)). Reduced motion, fallback,
bfcache giữ như shell R7.

```gherkin
Given /vi/residential/ mở bằng link, ảnh hero bị trễ 3s, font về trước khi mount xong
When ghi hình từ lúc điều hướng
Then veil bắt đầu mở ngay khi mount xong, hero còn vệt sáng, chữ hero chạy motion như chuyển mềm

Given font bị trễ 1s, mount xong ở 400ms
When ghi hình từ lúc điều hướng
Then veil bắt đầu mở khi font về, chữ hero không đổi font sau khi veil mở
```

### R5. Thứ tự ưu tiên tài nguyên

Tài nguyên tầng trên không chờ tầng dưới; tầng dưới không giành băng thông của tầng trên.

| Thứ tự | Tài nguyên | Cách giữ ưu tiên |
| --- | --- | --- |
| 1 | HTML, `style.css`, `detail.css` | Render-blocking như hiện nay; không thêm CSS chặn render |
| 2 | Hai font normal latin, vietnamese | `preload` như [phát hành tĩnh R4](static-release.md#r4-font-và-thư-viện-tự-host), `font-display: swap` |
| 3 | Ảnh hero nấc 1 | `fetchpriority="high"`, không lazy ([tải ảnh R4](media-delivery.md#r4-thứ-tự-ưu-tiên-tải)) |
| 4 | JavaScript `defer`; Advertising: vendor, runtime, artifact | `defer`, `modulepreload` như hiện nay; không thêm script chặn parse |
| 5 | Ảnh nấc 1 khác trong viewport | Lazy native hoặc LazySizes trong cửa sổ ảo hóa; ưu tiên mặc định của trình duyệt |
| 6 | Ảnh ngoài viewport, slide hero sau, video, Swiper, `catalog-detail` | Lazy, `data-src`, import khi cần như hiện nay |
| 7 | Nấc 2, nấc 3 | Chỉ ở tầng 3, `fetchpriority="low"`, tối đa 2 (R3) |

Không preload ảnh ngoài ngoại lệ hero trang chủ đã có ([tải ảnh R4](media-delivery.md#r4-thứ-tự-ưu-tiên-tải)). Không đẩy
ảnh trong viewport lên trước JavaScript tầng 1: lần thử khởi động runtime sớm (card "Tăng tốc hiện 8 card đầu") làm 8 card đủ
ảnh chậm hơn vì tranh băng thông với vendor JS.

```gherkin
Given /vi/advertising-products/ mở với cache trống, Slow 4G
When đọc waterfall tới lúc 8 card đầu có ảnh
Then không request nấc 2 nào bắt đầu trước khi ảnh nấc 1 cuối cùng trong viewport settled
And font và CSS bắt đầu trước mọi ảnh, vendor JS và artifact bắt đầu trước ảnh card
```

### R6. Thứ tự trong một tầng

- Ảnh trong tầng 2: trình duyệt tự xếp theo `loading`, `fetchpriority` và vị trí. Code không tự xếp hàng ảnh nấc 1.
- Nấc 2: hàng đợi R3, gần tâm viewport trước, tối đa 2.
- Slideshow hero trang chủ: slide 1 ở tầng 1, các slide sau giữ `data-src` tới tầng 3
  ([trang chủ R3](page-home.md#r3-hero-slideshow-và-nút-dừng)). Slide sau lên nấc 2 khi tới lượt hiện, không nâng trước.
- Video theo [video thích ứng](video-delivery.md), xếp ở tầng 3, không chen trước ảnh nấc 1 trong viewport.

```gherkin
Given /vi/ ở 1440px, hero đang ở slide 1
When trang vào tầng 3
Then chỉ slide 1 được nâng nấc 2; slide 2 chỉ tải nấc 1 khi tới lượt hydrate
```

### R7. Dùng lại code, không phân mảnh

- Một module nâng nấc dùng chung cho HTML tĩnh, card, primary, viewer Advertising, phục hồi lõi `image-tier.js` (hàng đợi,
  bản tách rời, decode rồi đổi), bỏ phần đo mạng và chọn bậc theo mạng. Advertising import cùng hàm, không viết bản thứ hai.
- Một điều kiện mở veil trong `mountPage` dùng cho cả hai đường (`playRouteEnter` khi mở trực tiếp và route mềm), không
  viết luật riêng cho từng trang.
- Chọn biến thể chỉ ở hai chỗ hiện có: `responsivePictures` (build) và `responsive-image.mjs` (runtime); thang cỡ khai một
  lần mỗi nơi, giống nhau.
- Vệt sáng, skeleton, Kính, dấu báo lỗi giữ nguyên code; spec này chỉ đổi lúc chúng được gọi.
- Đo bằng `image-delivery-measure.mjs` và các mốc của [mở trực tiếp R1](first-load-parity.md#r1-đo-nền-trước-khi-đổi),
  không viết script đo mới.

```gherkin
Given code đã cài spec này
When tìm nơi gọi decode() rồi đổi nguồn ảnh
Then chỉ có một hàm nâng nấc, được import từ trang tĩnh và từ catalog-runtime, photo-viewer
```

### R8. Đo và ngân sách

Đo trên demo theo [tải ảnh R7](media-delivery.md#r7-đo-tốc-độ-và-ngân-sách), so với bản `main` trước thay đổi, cùng
cohort, 5 lượt, cả `390×844` DPR 3 và `1440×900`:

- Ảnh đầu trong viewport sẵn sàng (nấc 1) ở route có khung lớn: nhanh hơn ít nhất 30% trên điện thoại (agent đề xuất, owner
  giao chốt 2026-10-27; byte giảm từ 325 KB xuống 58 KB nên 30% còn dư cho thời gian JS và mạng).
- Veil tan theo gate [mở trực tiếp R3](first-load-parity.md#r3-phần-nhẹ-hiện-trước-phần-nặng-không-chặn) (dưới 1s).
- Thời gian tới ảnh kế sau cuộn không chậm hơn quá 5%; byte ảnh trên điện thoại không tăng.
- CLS tối đa 0,1; 0 request ảnh trùng URL; không frame nào thấy vệt sáng hiện lại sau nấc 1.
- LCP không tăng quá 5%. Nấc 2 thay ảnh hero có thể làm Chrome ghi thêm một mốc LCP (suy luận); đo để biết.

```gherkin
Given demo vừa deploy bản có spec này
When chạy image-delivery-measure.mjs --runs 5 trên bản cũ và bản mới
Then summary.json đạt mọi ngân sách ở trên, kể cả lượt --warm
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| File | `<tên>-1600.avif`, `<tên>-2048.avif` cạnh `<tên>.webp` | Biến thể nấc 2 (R1), `build-image-variants.mjs` ghi, `--check` kiểm |
| Module | Module nâng nấc dùng chung (tên chốt trong plan) | Hàng đợi và đổi nguồn của R3, R7 |
| Promise | Điều kiện mở veil trong `mountPage` (`motion.js`) | R4, cả mở trực tiếp và route mềm |
| Hằng | Tối đa 2 ảnh nâng, `120ms` cuộn yên | R3 |

Code nằm trong file của spec khác: `motion.js` ([shell](site-shell.md)), `prepare-static-assets.mjs`
([phát hành tĩnh](static-release.md)), `build-image-variants.mjs`, `responsive-image.mjs` ([tải ảnh](media-delivery.md)),
`catalog-runtime.mjs`, `photo-viewer.mjs` ([masonry](advertising-masonry.md), [viewer](advertising-viewer-touch-zoom.md)).
Khi cài, sửa các spec sở hữu trong cùng PR và chuyển spec này sang `live`.

## UI

Không đổi giao diện chờ: [Vệt sáng](../../design-system/components/LoadSweep/README.md),
[Skeleton](../../design-system/components/Skeleton/README.md),
[Kính hiện và tan](../../design-system/components/Glass/README.md#hiện-và-tan-trên-ảnh-vừa-tải). Khi cài, README Vệt sáng thêm
lại dòng "nâng nấc không hiện lại vệt sáng, skeleton" (đã có ở PR #561, gỡ cùng PR #585); việc này cần owner duyệt và gõ
`republish`.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1 | `node scripts/site/build-image-variants.mjs --check`; e2e mới cho số file mỗi ảnh theo viewport (chưa có test) |
| R2 | `image-loading-frame.e2e.mjs` (vệt kết thúc ở nấc 1); thêm ca nấc 2 không hiện lại vệt (chưa có test) |
| R3 | e2e mới, phục hồi từ `image-adaptive.e2e.mjs` (commit `de9ec90`), bỏ phần mạng (chưa có test) |
| R4 | `first-load-parity.e2e.mjs`, thêm ca hero trễ 300ms và 3s (chưa có test) |
| R5, R6 | Waterfall trong `image-delivery-measure.mjs` (chưa có test) |
| R7 | Review diff: một hàm nâng nấc, không có bản sao |
| R8 | `image-delivery-measure.mjs` trên demo |

## Gate còn mở

- JPEG XL ở R1: A04s đạt; còn A05s và iPhone 16 (owner, [trang thử](https://claude.ai/artifact/5L61tBABqqQG3F3KKbh77k)).
- WebKit chưa kiểm: `<picture>` tách rời có chọn `<source type="image/avif">` không, và bản tách rời có dùng chung request với
  ảnh thật không (đếm `performance.getEntriesByName`). Main, Playwright WebKit.
- Safari iPhone thật chưa kiểm AVIF nhiều cỡ và việc đổi nấc. Owner, máy PC.
- RAM khi nâng nhiều ảnh nấc 2 trên A04s chưa đo. Main, máy PC.

## Chú thích thuật ngữ

- **Nấc**: mức chất lượng của một ảnh; nấc sau thay nấc trước khi đã giải mã xong.
- **Nhu cầu hiển thị**: số pixel thật ảnh chiếm trên màn hình, bằng bề rộng CSS sau crop nhân DPR.
- **Tầng tải**: nhóm tài nguyên của trang cùng mức ưu tiên; tầng sau không giành băng thông của tầng trước.
- **Veil**: lớp trắng phủ trang lúc tải hoặc chuyển trang.
- **Bản tách rời**: phần tử ảnh không gắn vào trang, dùng để tải và giải mã trước khi đổi ảnh thật.
- **Waterfall**: biểu đồ thời điểm bắt đầu, kết thúc của từng request.
- **DPR**: `devicePixelRatio`, số pixel thật trên một pixel CSS.
- **Cohort**: tập ảnh hoặc card giống nhau giữa các lượt đo để so công bằng.
