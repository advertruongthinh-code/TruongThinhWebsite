---
title: Skeleton chờ ảnh và kính mờ hiện ảnh
status: live
source: []
tests:
  - tests/site/image-loading-frame.e2e.mjs
  - tests/site/advertising-skeleton-slow-network.e2e.mjs
  - tests/site/advertising-photo-transitions.e2e.mjs
  - tests/site/advertising-reveal-offscreen.e2e.mjs
  - tests/site/advertising-remount-no-cache.e2e.mjs
  - tests/site/advertising-fast-fling.e2e.mjs
  - tests/site/advertising-detached-cards.e2e.mjs
  - tests/site/advertising-media-edge.e2e.mjs
notion: https://app.notion.com/p/3e9332849a0e814995c2fbb2e5393803
updated: 2026-11-12
---

# Skeleton chờ ảnh và kính mờ hiện ảnh

## Mục đích

Khách không thấy vùng trắng khi ảnh Advertising chưa tải: ảnh card ở masonry và related phải chờ tải thì chờ dưới Flow (PC) hoặc lớp màu (điện thoại) rồi lộ
trong `0.6s` qua kính mờ của chính ảnh (PC), ảnh card đã có sẵn hiện ngay không motion; primary đang chờ mang skeleton cuối masonry
và lộ cùng kiểu, đổi ảnh tại chính khung của nó. Không dùng [Kính](glass-surface.md) khi lộ ảnh (owner 2026-11-12). Renderer, preset,
kính mờ, WebGL context ở [skeleton](advertising-skeleton.md); card ở
[masonry](advertising-masonry.md), primary ở [detail](advertising-detail.md); veil khi vào thẳng trang ở
[shell R7](site-shell.md#r7-veil-khi-tải-trực-tiếp-fallback-và-bfcache).

## Hành vi

### R1. Card đang tải chờ dưới Flow

PC: card của masonry chính và related (cả card nhiều media) vào viewport mà media đang hiện chưa tải xong thì ngay lúc đó,
không chờ mốc thời gian, kể cả khi đang cuộn hay giữ thanh cuộn, `attachCardSkeleton` gắn vào `.card-media` một khung skeleton
(`attachLoadingSkeleton`, cùng hàm với primary): khung Flow mang 4 màu của media (`MEDIA_COLORS[1..4]`, thiếu thì màu preset), bốc assignment theo
[skeleton R3](advertising-skeleton.md#r3-assignment-ngẫu-nhiên-và-giữ-màu) với khóa `grid:<id>` hoặc `related:<id>`, vẽ trên canvas Flow chung
của lưới ([skeleton R5](advertising-skeleton.md#r5-webgl-context)); khung hiện `0.6s`, vào viewport trong lúc cuộn thì hiện ngay
([tải theo nấc R9](progressive-loading.md#r9-card-chờ-ảnh-bằng-flow-hoặc-lớp-màu)). Media ẩn (`opacity: 0`, không filter, không `scale`, không thở) tới R2;
card mang `data-masonry-media-loading` (nhãn Vừa xem chỉ hiện chữ). Khung không nhận tap (`pointer-events: none`), nút trên card vẫn bấm được.
Ảnh đã tải phủ đúng khung (`height: 100%`, khung đã đúng tỷ lệ gốc nên chỉ giãn dưới 0,5px), không theo tỷ lệ pixel làm tròn của file đang tải, nên đáy
card không lộ một hàng pixel màu chủ đạo. Lớp chặn thứ hai: khung vẽ vòng `1px` màu giấy (`box-shadow: inset`, trên nền, dưới
media), nên chỗ media hụt khung dưới một pixel vì layer composite lệch subpixel hay mép khử răng cưa chỉ lộ màu giấy.
Khung media (`.card-media`) mang inline `background-color` là màu chủ đạo của ảnh bìa, nên trước khi khung Flow hiện vẫn có màu thay vì ô trắng.
Không đặt Kính thường trực trên card: Kính `backdrop-filter` ba bậc trên 15 đến 18 card làm kéo thanh cuộn tụt còn 14 FPS (2026-10-31). Card mount
sẵn ngoài viewport chưa chờ.

Điện thoại (`skeletonPhone`, owner 2026-11-12) không Flow, không Kính: card chờ ảnh nhận `data-media-wait="colors"` và lớp màu đổi qua 4 màu chủ đạo của ảnh
([tải theo nấc R9](progressive-loading.md#r9-card-chờ-ảnh-bằng-flow-hoặc-lớp-màu)); media ẩn (`opacity: 0`, không filter, không `scale`) tới khi tải xong; card mount sẵn ngoài viewport không chờ.

```gherkin
Given masonry Advertising trên PC 1440px, ảnh tải chậm
When kéo thanh cuộn làm card mới vào viewport
Then ngay khi vào viewport mỗi card chưa tải xong có khung Flow đang chạy trong 4 màu của ảnh, ảnh ẩn và không mờ, card không đổi kích thước

Given masonry Advertising trên điện thoại, ảnh tải chậm
When vuốt nhanh làm card mới vào viewport
Then card chưa tải xong có lớp màu, không Kính, canvas Flow hay khung skeleton
```

### R2. Lộ ảnh khi tải xong

Ảnh tải xong và `img.decode()` xong ([tải theo nấc R3](progressive-loading.md#r3-ảnh-chỉ-hiện-khi-tải-xong); video không
chờ decode), khi card còn giao viewport thì `revealCard` làm bản sao ảnh rộng 20px (`frostCopy`: `createImageBitmap`, `FROST_COPY_WIDTH`), hiện media
ngay dưới khung đục, ẩn khung DOM và giao cho canvas Flow chung của lưới (`reveal()` của
[skeleton R5](advertising-skeleton.md#r5-webgl-context)) trong `0.6s` (`CARD_REVEAL_MS`): 45% đầu Flow hóa kính mờ của chính ảnh
(bản 20px phóng bậc ba B-spline tự mờ tròn, không lộ ô, màn trắng mỏng, sạn mịn), phần còn lại kính mờ tan ra ảnh nét (owner chọn kiểu 10 "Kính mờ rẻ", 2026-11-12, sạn mịn hơn mẫu).
Không Kính, không blur filter: shader Flow có sẵn nhánh kính mờ nên GPU không biên dịch gì mới lúc lộ (Kính làm Skia biên dịch shader
40 đến 106ms giữa lượt lộ hàng loạt trên PC owner, 3b.2 lượt 5 đến 7). Xong thì gỡ khung và `data-masonry-media-loading`. Không làm được bản sao,
canvas chưa sẵn (context mất, shader chưa link) hay khung chưa vào (`is-entry-ready`) thì `playReveal` chỉ crossfade khung sang media
(media hiện `0.13s` tới `0.39s` `cubic-bezier(0.65, 0, 0.35, 1)`). Bị gỡ giữa chừng thì hủy lượt lộ, gỡ khung và hiện media ngay. Card chưa có khung
chỉ crossfade media. Canvas của lưới card vẽ trên cả card (mỗi card là một stacking context vì `contain: layout`, nền `.card-media` đục nên canvas
không thể nằm dưới): lúc chờ và lúc lộ, pill chỉ số và nhãn vừa xem nằm dưới Flow.

Trên điện thoại (cùng điều kiện `skeletonPhone` của [skeleton R1](advertising-skeleton.md)) không có khung: `revealCard` cho media hiện
`opacity 0 → 1` trong `0.45s` (`GHOST_FADE_MS`, `GHOST_FADE_EASING`) trên lớp màu, xong gỡ lớp màu (`clearColorWait`), không gọi `playReveal`; bị gỡ giữa chừng thì hủy animation và hiện media ngay.
Card đến lượt hiện khi đang vuốt thì giữ lớp màu tới khi trang ngừng cuộn `120ms` (`PHONE_REVEAL_SCROLL_IDLE_MS`). Media chỉ đổi opacity, không đổi
`transform`, nên hover zoom ([masonry R8](advertising-masonry.md#r8-card-và-ảnh-trong-card)) giữ nguyên sau đó.

```gherkin
Given 8 card PC đang chờ dưới Flow
When ảnh của cả 8 tải xong cùng lúc
Then mỗi ảnh lộ qua kính mờ của chính nó trong 0.6s, không card nào có Kính, rồi không card nào còn khung Flow hay data-masonry-media-loading
```

### R3. Ảnh có sẵn

Card vào viewport khi media đã giải mã xong (cache, tải xong trước khi vào, hoặc vào lại sau khi ra hẳn viewport với
`intersectionRatio = 0`, kể cả card ảo hóa gắn lại) thì media hiện ngay ở opacity cuối: không skeleton, không Kính, không
crossfade, không chờ trang ngừng cuộn. Card vừa gỡ còn trong hàng chờ ([masonry R7](advertising-masonry.md#r7-ảo-hóa-và-bàn-phím))
thì gắn lại đúng node cũ: ảnh còn giải mã nên không trống frame, không motion. Card ngoài hàng chờ tạo `img` mới; ảnh lấy từ
cache vẫn phải giải mã nên khung được trống lúc giải mã (một tới ba frame) rồi hiện thẳng opacity cuối. Ảnh không về trong `150ms`
(`REMOUNT_CACHE_WAIT_MS`: cache tắt hoặc bị xóa nên phải tải lại) thì chờ như R1 và lộ qua R2, không để
khung trắng tới khi tải xong. Áp cho masonry chính và masonry related;
primary theo R4. Card thay chỗ một card tạm của lượt vuốt nhanh theo [R10](#r10-card-tạm-khi-vuốt-nhanh).

```gherkin
Given ảnh của card đã có trong cache trình duyệt
When card vào viewport
Then ảnh hiện ngay ở frame đầu card giao viewport, không có skeleton, Kính hay crossfade
```

### R4. Mở ảnh tại chỗ

`renderPrimaryMedia` đổi ảnh ở chính khung `.detail-view__hero-frame`, khi mở từ masonry chính, related,
thumbnail hay Back, Forward; không ảnh bay từ card, không clone, không khóa cuộn. Primary chạy cùng một chuỗi dù ảnh có
sẵn hay chưa, để người xem không phân biệt được hai trường hợp:

1. Khi `src` đổi, ảnh và nền vùng dư cũ ẩn ngay (`data-detail-loading`), skeleton cuối masonry (cùng hook và cách
   bốc assignment, [skeleton](advertising-skeleton.md)) phủ khung, trên ảnh và dưới nút ảnh; khung có `aria-busy="true"`; runtime chờ `decode()`.
2. Giải mã xong thì lộ như card ở R2: skeleton của primary vẽ trên canvas Flow chung của chính khung (canvas là con cuối của
   `.detail-view__hero-frame`, `z-index: 2`), ảnh và nền vùng dư hiện ngay dưới khung, Flow hóa kính mờ rồi tan trong `0.6s`. Kính mờ đặt bản
   20px (sao từ ảnh nền 240px đã giải mã, không sao từ ảnh lớn vì giải mã lại JXL trên luồng chính 59ms, đo lượt 8) đúng chỗ ảnh nằm `contain` trong khung, vùng dư phủ `cover` như nền mờ (`scale(1.12)`). Khung chưa vào, canvas chưa sẵn hoặc không
   làm được bản sao thì crossfade. Ảnh có sẵn chỉ làm skeleton đứng ngắn hơn, có khi không tới một frame.

Không có lớp tạm giữ ảnh cũ, không Kính. Xong thì gỡ skeleton và bỏ `aria-busy`. Media video ở primary
không có skeleton. Morph sang viewer theo [detail R9](advertising-detail.md#r9-viewer).

Điện thoại (cảm ứng, mọi chiều xoay) chạy chuỗi riêng (owner 2026-11-12): không skeleton Flow, không kính mờ. Khung primary nhận
`data-media-wait="colors"` (lớp màu 4 màu của ảnh, như card), ảnh và nền vùng dư ẩn; `decode()` xong thì ảnh và nền hiện `opacity 0 → 1`
trong `0.45s` trên lớp màu rồi `settlePrimaryReveal` gỡ lớp màu và `aria-busy`. Giảm chuyển động: settle ngay. Bước 1 và 2 ở trên là chuỗi của PC.

```gherkin
Given primary đang xem ảnh A, ảnh B đã có trong cache
When bấm card related B
Then A và nền của A ẩn ngay, skeleton phủ khung, Flow hóa kính mờ của B rồi tan ra B, không Kính
And chuỗi và nhịp từng lớp giống hệt khi B tải chậm, không ảnh bay hay clone từ card

Given PC mở detail, ảnh primary tải chậm
When ảnh giải mã xong, rồi bấm related, rồi Back
Then PC lộ qua kính mờ của ảnh trong 0.6s, không Kính

Given điện thoại mở detail, ảnh primary tải chậm
When ảnh giải mã xong
Then khung có lớp màu đổi qua 4 màu của ảnh, không skeleton Flow, rồi ảnh hiện trong 0.45s và lớp màu bị gỡ
```

### R5. Skeleton thay vòng xoay

Advertising không có vệt sáng: vệt CSS của [tải ảnh R6](media-delivery.md#r6-vệt-sáng-chờ-ảnh-tĩnh) không áp trong
`[data-project-grid]` và `[data-detail-view]` (`style.css`), và script head không gắn `.media-frame` cho ảnh trong
viewer "Xem lớn hơn" (`[data-detail-dialog]`) nên viewer không có vệt sáng lẫn fade-in 0,45s mỗi lần mở; card chờ ảnh
bằng khung Flow hoặc lớp màu (R1), primary bằng skeleton (R4), không spinner. Khung primary mang `aria-busy="true"` từ lúc đổi `src` tới khi ảnh giải mã xong hoặc lỗi. Card nhiều media
giữ status ẩn cho trình đọc màn hình theo [media-card R5](media-card.md#r5-chờ-tải-và-lỗi-media).

```gherkin
Given detail đang mở, primary đổi sang một ảnh chưa tải
When ảnh đang tải
Then khung primary có aria-busy="true" và skeleton, không có vệt sáng nào trong masonry hay primary
And mở viewer thì không có vệt sáng hay fade-in chờ ảnh trong viewer, kể cả khi viewer đang là video
```

### R6. Rời đi giữa chừng

- Card ra hẳn khỏi viewport (`intersectionRatio = 0`): đang chờ hoặc chạy R2 thì hủy animation, gỡ khung Flow (hoặc lớp màu) ngay, lần vào sau chạy
  lại theo R1 hoặc R3. Ảnh tải xong khi card còn ngoài viewport thì hiện không qua R2.
  Card ra khỏi viewport khi đang chờ `decode()` của R2: decode xong thì media hiện ngay ở opacity cuối
  (`tests/site/advertising-reveal-offscreen.e2e.mjs`).
- Card bị gỡ khỏi masonry hoặc related (ảo hóa, đổi filter, đổi tag, đóng detail): gỡ khung Flow; `img` chưa tải
  xong bỏ `src`, `srcset` để trình duyệt hủy request (`img` tách khỏi DOM vẫn tải tiếp, kéo thanh cuộn khi tắt cache dồn
  hàng trăm request cũ trước ảnh đang thấy).
- Primary đổi sang ảnh khác trước khi R4 xong: lượt cũ dừng, gỡ skeleton cũ, rồi lượt mới bắt đầu
  (`settlePrimaryReveal`). Về masonry (`restoreGridEntry`) hoặc runtime unmount: gỡ hết.

```gherkin
Given primary đang chờ ảnh A, khung có skeleton
When bấm card related B trước khi A giải mã xong
Then skeleton của A bị gỡ, primary chỉ chạy R4 cho B
And khi B hiện xong, khung không còn aria-busy hay skeleton
```

### R7. Ảnh lỗi

Ảnh card lỗi: runtime hủy lượt chờ, gỡ khung Flow (hoặc lớp màu), không chạy R2; ảnh lỗi không hiện (`.masonry-card img` giữ opacity
0), khung hiện dấu báo lỗi theo [media-card R5](media-card.md#r5-chờ-tải-và-lỗi-media). Card nhiều media đổi sang media
khác theo media-card R5 trước khi tới bước này. Primary: `decode()` bị từ chối vì lỗi thì gỡ skeleton,
bỏ `aria-busy` và `data-detail-loading` ngay, rồi hiện cùng dấu báo lỗi.

```gherkin
Given ảnh của một card đang chờ dưới Flow
When request ảnh của card lỗi
Then khung Flow bị gỡ, card giữ nguyên kích thước và hiện dấu báo lỗi
```

### R8. Giảm chuyển động

`prefers-reduced-motion: reduce`: card PC vẫn có khung theo R1 nhưng Flow đứng yên ở frame tĩnh, tải xong thì ảnh hiện ngay không qua R2; skeleton primary đứng yên
ở frame tĩnh ([skeleton R7](advertising-skeleton.md#r7-reduced-motion-và-fallback)), ảnh thay skeleton ngay khi giải mã
xong, không kính mờ, không crossfade.

```gherkin
Given trình duyệt bật giảm chuyển động, ảnh tải chậm
When card và primary chờ ảnh rồi ảnh tải xong
Then skeleton của card và primary không chuyển động, ảnh hiện ngay, không có kính mờ hay crossfade
```

### R9. Ngân sách hiệu năng

Masonry đang tải phải đạt gate điện thoại của [skeleton R8](advertising-skeleton.md#r8-hiệu-năng) khi vuốt nhanh có
nhiều card cùng chạy R2. Không hạ độ phân giải, frame rate hay chất lượng preset để đạt gate. Cách làm nào làm rơi gate thì
PR code báo owner kèm số đo trước khi đổi (Kính thường trực trên card bị thay bằng blur ảnh vì lý do này, 2026-10-31). PC: số đo và gate của
Flow rồi kính mờ ở [tải theo nấc R9](progressive-loading.md#r9-card-chờ-ảnh-bằng-flow-hoặc-lớp-màu).

```gherkin
Given phone Android, masonry đầy card đang chờ ảnh
When vuốt nhanh từ đầu masonry tới footer
Then trace Chrome đạt gate điện thoại của skeleton R8
```

### R10. Card tạm khi vuốt nhanh

Áp cho masonry chính và related ([masonry R7](advertising-masonry.md#r7-ảo-hóa-và-bàn-phím)). Mỗi frame chỉ dựng card thật
trong ngân sách đo trên máy đó: `quota = max(1, floor(budget / cost))`, `cost` là trung bình trượt chi phí một card đo bằng khoảng frame dôi
ra sau lần dựng (gồm style, layout, paint, không chỉ phần JS), `budget` là một phần ba nhịp frame nền (kẹp `8` tới `34ms`); giao viewport trước, gần giữa màn hình trước
(`mountQuota`, `createMountBudget`); trần cứng `8` card mỗi frame (số đo trượt chậm theo máy, trần giữ frame đầu sau khi
dừng vuốt không dựng dồn), và một frame chỉ dựng một lần dù renderWindow chạy hai lần. Card cần dựng mà chưa tới lượt có card tạm: khối đúng vị trí và kích thước card, nền
là màu chủ đạo của ảnh bìa, thở `media-breathe` `2s` (điện thoại: lớp màu 4 màu của ảnh bìa như R1, cùng pha `--wait-phase`, không thở), `aria-hidden`, không link, ảnh hay observer, nằm trong lớp riêng đầu
grid dưới mọi card. Vuốt trên một viewport mỗi `100ms`, hoặc nhảy xa quá hai viewport, thì chỉ gắn card tạm; hết vuốt thì
dựng dần mỗi frame (`requestAnimationFrame`). Mọi card tạm thở chung pha (`animation-delay` âm theo giờ chung); trên điện thoại card tạm và card chờ dùng chung pha màu (`colorsPhase`) nên không nhảy màu.

Card tạm lên card thật: ảnh đã có hiện dần từ màu chủ đạo, opacity `0 → 1` trong `0.45s` `cubic-bezier(0.16, 1, 0.3, 1)`
(cùng nhịp ảnh trang tĩnh), chỉ opacity, xong gỡ card tạm; ảnh chưa xong thì theo R1 và card tạm gỡ ở frame kế (card thật với nền media đục đã phủ kín nó); card tạm
ngoài viewport gỡ không motion. Giảm chuyển động (R8): card tạm không thở, ảnh có sẵn hiện thẳng.

```gherkin
Given masonry All trên phone, CPU chậm 4 lần, ảnh đã có trong cache
When vuốt cực nhanh qua 20 viewport trong 1 giây rồi dừng
Then mỗi frame viewport được card thật hoặc card tạm phủ, mỗi frame dựng vài card thật
And card tạm lên card thật thì ảnh hiện dần trong 0.45s, card chỉ bị gỡ khi ra xa hơn hai viewport
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| DOM hook | `.masonry-grid__cta-frame[data-masonry-loading-skeleton="<media id>"]` trong `.detail-view__hero-frame` | Skeleton chờ ảnh của primary (R4); gỡ sau khi ảnh hiện hoặc khi rời đi, lỗi (R6, R7) |
| DOM hook | `.masonry-grid__cta-frame[data-masonry-loading-skeleton="grid:<id>"]` (hoặc `related:<id>`) trong `.card-media`, `data-masonry-flow-state` | Khung Flow chờ ảnh của card PC (R1); gỡ sau R2, khi rời đi hoặc lỗi (R6, R7) |
| DOM hook | `.masonry-grid__cta-shared-flow` trong `.detail-view__hero-frame` | Canvas Flow chung của primary, vẽ skeleton và kính mờ (R4) |
| DOM hook | `data-masonry-media-loading` trên card | Card PC đang chờ dưới Flow (R1, nhãn Vừa xem chỉ hiện chữ); gỡ lúc lộ (R2), rời đi hoặc lỗi (R6, R7) |
| DOM hook | `data-detail-loading`, `aria-busy` trên `.detail-view__hero-frame` | Ẩn ảnh và nền vùng dư cũ ngay khi đổi `src`; primary đang chờ (R4, R5) |
| Runtime | `attachCardSkeleton` (gắn khung Flow), `revealCard`, `hideCardMedia`, `dropCardSkeleton`, `attachLoadingSkeleton`, `detachLoadingSkeleton`, `crossfadeLayers`, `playReveal`, `frostCopy`, `renderPrimaryMedia`, `playPrimaryReveal`, `settlePrimaryReveal`; hằng `CARD_REVEAL_MS`, `FROST_COPY_WIDTH`, `PHONE_REVEAL_SCROLL_IDLE_MS`, `MEDIA_REVEAL_MS` (`masonry/runtime.mjs`, nội bộ) | R1–R8 |
| Hàm public | `createSharedSkeletonFlowLayer` (`attach(...).reveal(tiny, duration, { box, cover })`), `createSkeletonFlowRenderer`, `staticBackground` (`masonry/skeleton-flow.mjs`) | Canvas chung vẽ Flow và kính mờ; renderer dùng lại nguyên |
| Card | `figure.advertisingPendingMediaId()` | Media id đang chờ hoặc `null`; runtime hỏi trước khi gắn skeleton |

Spec không sở hữu file: code nằm trong `masonry/runtime.mjs` ([masonry](advertising-masonry.md)), `masonry/skeleton-flow.mjs`
([skeleton](advertising-skeleton.md)), `detail.css`
([trang con](detail-pages.md)), `style.css` ([shell](site-shell.md)); sửa hành vi ở đó thì cập nhật cả spec này.

## UI

[Skeleton](../../design-system/components/Skeleton/README.md),
[Primary](../../design-system/components/Primary/README.md),
[motion ảnh trong card](../../design-system/motion.md#ảnh-trong-card),
[motion primary](../../design-system/motion.md#suggestion-và-detail).

## Kiểm tra

E2E cần `pnpm dev`, `BASE_URL`; `CASE=<tên>` chạy một ca của `advertising-photo-transitions.e2e.mjs`.

| R | Test hoặc command |
| --- | --- |
| R1 | `image-loading-frame.e2e.mjs` (P9: ảnh card đang tải ẩn dưới khung Flow, không mờ, không thở; card, CTA, footer, filter giữ hình học khi ảnh tải); `advertising-skeleton-slow-network.e2e.mjs` (lúc tải trang card đầu chờ dưới Flow đang chạy, ảnh ẩn, không animate vào; một canvas chung trong lưới, không canvas mỗi card; kéo thanh cuộn không card trống); `advertising-skeleton-flow.test.mjs` (pha liên tục, cùng preset lệch ít nhất 1/4 vòng); `advertising-media-edge.e2e.mjs` (khung Flow phủ đúng khung media, ảnh đã tải phủ đúng khung ở 1920 và 390) |
| R2 | `image-loading-frame.e2e.mjs` (P9: khung gỡ sau khi tải, ảnh kết thúc `filter: none`, card không Kính, card PC làm bản sao kính mờ, phone không); `advertising-skeleton-slow-network.e2e.mjs` (lộ hàng loạt không Kính, có bản sao 20px tải lên WebGL, sau đó không còn khung, ảnh kẹt dưới opacity 1); `image-reveal-complete.e2e.mjs` (card chỉ lộ khi ảnh tải xong); `TT_E2E_ADVERTISING_MEDIA_ENTRANCE_ONLY` (ảnh hiện `0.13s` tới `0.39s`) |
| R3 | `image-loading-frame.e2e.mjs` (P9: card đã tải ra hẳn rồi vào lại viewport hiện ngay, không skeleton, không blur), `TT_E2E_ADVERTISING_MEDIA_ENTRANCE_ONLY` (card ảo hóa gắn lại); `advertising-remount-no-cache.e2e.mjs` (tắt cache, mạng chậm, cuộn nhảy: không card trắng quá `400ms`) |
| R4 | `image-loading-frame.e2e.mjs` (P9: primary đang tải có skeleton, PC lộ qua kính mờ không Kính, phone lớp màu); `CASE=m02b-grid-detail-no-clone-no-jump`, `morph-backdrop-lifecycle` |
| R5 | `image-loading-frame.e2e.mjs` (P9: `aria-busy` theo ảnh primary hiện tại); vắng vệt sáng trong masonry, detail chưa có test; `advertising-products-static.test.mjs` (viewer không nhận `.media-frame`); `site-media-card-m02a.e2e.mjs` (`viewerMediaGate`: viewer ảnh và video không có vệt sáng, fade-in) |
| R6 | `image-loading-frame.e2e.mjs` (P9: đổi ảnh nhanh không để lại skeleton, `aria-busy` cũ; về masonry gỡ skeleton primary); `CASE=delayed-image-resize-latest-wins`; `advertising-remount-no-cache.e2e.mjs` (card bị gỡ không còn `img` đang tải) |
| R7 | chưa có test |
| R8 | `advertising-skeleton-slow-network.e2e.mjs` (giảm chuyển động: card chờ dưới khung Flow đứng yên, không ảnh mờ); còn lại chưa có test |
| R9 | chưa có test; trace Chrome qua CDP trên phone Android ([debug Android](../operations/android-real-device-debugging.md)) |

## Gate còn mở

- R9 PC: đo lại kéo thanh cuộn và lượt lộ hàng loạt trên bản Flow rồi kính mờ (gate ở [tải theo nấc R9](progressive-loading.md#r9-card-chờ-ảnh-bằng-flow-hoặc-lớp-màu)). Máy PC.
- `image-loading-frame.e2e.mjs` mới chạy Chromium: WebKit chưa chạy; Safari trên iPhone thật chưa kiểm skeleton. Main (WebKit),
  owner và máy PC (iPhone).
- R8 chưa có test tự động. Main.
- Owner chưa nghiệm thu kính mờ trên card PC và primary, mở ảnh tại chỗ trên demo. Owner.

## Chú thích thuật ngữ

- **Skeleton chờ ảnh**: khung skeleton cuối masonry dùng lại để giữ chỗ cho media đang tải.
- **Kính**: lớp glassmorphism `backdrop-filter`; lộ ảnh không còn dùng.
- **Kính mờ**: Flow chuyển thành bản ảnh 20px phóng bậc ba B-spline, màn trắng mỏng và sạn mịn, vẽ trên canvas Flow, rồi tan ra ảnh nét.
- **Blur**: làm mờ chính ảnh bằng `filter`, rẻ hơn `backdrop-filter` vì không đọc lại nền mỗi frame; card không còn dùng.
- **Crossfade**: một lớp mờ đi trong lúc lớp khác hiện lên ở cùng chỗ.
- **Lớp tạm**: bản ảnh primary cũ nằm trên ảnh mới cho tới hết crossfade.
- **Lease pool**: nhóm WebGL context dùng chung, cho mượn và trả theo khung.
- **Preset Flow**: bộ bốn màu và điểm neo của skeleton.
- **Giải mã**: trình duyệt chuyển file ảnh thành điểm ảnh sẵn để vẽ (`decode()`).
- **Trace**: bản ghi hiệu năng từng frame của trình duyệt.
- **Subpixel**: phần lẻ dưới một pixel thiết bị của tọa độ hoặc kích thước.
- **Layer composite**: lớp GPU trình duyệt vẽ riêng rồi ghép; có thể đặt lệch subpixel so với khung.
