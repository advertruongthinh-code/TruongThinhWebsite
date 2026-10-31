---
title: Skeleton chờ ảnh và Kính hiện ảnh
status: live
source: []
tests:
  - tests/site/image-loading-frame.e2e.mjs
  - tests/site/glass-surface.test.mjs
  - tests/site/advertising-photo-transitions.e2e.mjs
  - tests/site/advertising-reveal-offscreen.e2e.mjs
  - tests/site/advertising-remount-no-cache.e2e.mjs
notion: https://app.notion.com/p/3e9332849a0e814995c2fbb2e5393803
updated: 2026-10-27
---

# Skeleton chờ ảnh và Kính hiện ảnh

## Mục đích

Khách không thấy vùng trắng khi ảnh Advertising chưa tải: card ở masonry, related và ảnh primary đang chờ mang skeleton
cuối masonry; ảnh card phải chờ tải hiện qua Kính phủ đều nhịp `0.6s`, ảnh card đã có sẵn hiện ngay không motion; primary
đổi ảnh tại chính khung của nó. Renderer, preset,
WebGL context ở [skeleton](advertising-skeleton.md); cách Kính hiện, tan ở [Kính](glass-surface.md); card ở
[masonry](advertising-masonry.md), primary ở [detail](advertising-detail.md); veil khi vào thẳng trang ở
[shell R7](site-shell.md#r7-veil-khi-tải-trực-tiếp-fallback-và-bfcache).

## Hành vi

### R1. Kính trên card đang tải

Card của masonry chính và related (cả card nhiều media) vào viewport mà media đang hiện chưa đủ ngưỡng thì ngay lúc đó,
không chờ mốc thời gian, kể cả khi đang cuộn hay giữ thanh cuộn, khung media nhận Kính phủ đều ba bậc ở mức đủ
(`createGlassSurface("even", 3)`, `data-glass-reveal`), không fade vào; dưới Kính media hiện ở opacity cuối để trình duyệt
vẽ dần ([tải theo nấc R9](progressive-loading.md#r9-kính-mờ-thay-skeleton-flow-trên-card-chờ-ảnh), owner 2026-10-27).
Card không còn khung skeleton, Flow hay WebGL context; skeleton Flow chỉ còn ở batch cuối masonry
([skeleton](advertising-skeleton.md)). Card mount sẵn ngoài viewport chưa có Kính. Kính cung CTA đang giao viewport thì
card không nhận Kính, media ẩn tới khi giải mã xong rồi crossfade `0.6s`.

```gherkin
Given masonry Advertising trên điện thoại, ảnh tải chậm
When vuốt nhanh làm card mới vào viewport
Then ngay khi vào viewport mỗi card chưa có ảnh mang Kính ba bậc, card không đổi kích thước
And card không có canvas Flow hay khung skeleton
```

### R2. Kính tan khi ảnh đủ ngưỡng

Service Worker báo đủ ngưỡng ([tải theo nấc R3](progressive-loading.md#r3-hiện-ảnh-khi-đủ-ngưỡng)), hoặc không có tin thì
`img.decode()` xong (video không chờ), khi card còn giao viewport thì runtime chạy nửa tan của reveal Kính `0.6s`
(`revealCard`, tua tới `GLASS_REVEAL_PEAK`) rồi gỡ Kính. Card không có Kính (cung đang thấy, R1) chỉ crossfade media.
Cung vào viewport giữa chừng thì Kính bị gỡ ngay ([skeleton R4](advertising-skeleton.md)).

Kính tan theo [Kính R6](glass-surface.md#r6-hiện-và-tan-bằng-opacity-từng-bậc); thời điểm và đường cong ở
[UI](#ui). Trên điện thoại (cùng điều kiện `skeletonPhone` của [skeleton R1](advertising-skeleton.md)), card đến lượt
tan khi đang vuốt thì giữ Kính tới khi trang ngừng cuộn `120ms` (`PHONE_REVEAL_SCROLL_IDLE_MS`). Media chỉ đổi opacity,
không đổi `transform`, nên hover zoom ([masonry R8](advertising-masonry.md#r8-card-và-ảnh-trong-card)) giữ nguyên sau đó.

```gherkin
Given một card đang mang Kính
When ảnh của card đủ ngưỡng hoặc giải mã xong
Then Kính tan trong phần còn lại của nhịp 0.6s rồi bị gỡ khỏi DOM, ảnh không fade lại
```

### R3. Ảnh có sẵn

Card vào viewport khi media đã giải mã xong (cache, tải xong trước khi vào, hoặc vào lại sau khi ra hẳn viewport với
`intersectionRatio = 0`, kể cả card ảo hóa gắn lại) thì media hiện ngay ở opacity cuối: không skeleton, không Kính, không
crossfade, không chờ trang ngừng cuộn. Card ảo hóa gắn lại tạo `img` mới; ảnh lấy từ cache vẫn phải giải mã nên khung
được trống lúc giải mã (đo 2026-10-14: một tới ba frame) rồi hiện thẳng opacity cuối. Ảnh không về trong `150ms`
(`REMOUNT_CACHE_WAIT_MS`: cache tắt hoặc bị xóa nên phải tải lại) thì card mang skeleton như R1 và hiện qua R2, không để
khung trắng tới khi tải xong (owner kéo thanh cuộn khi tắt cache, 2026-10-27). Áp cho masonry chính và masonry related;
primary theo R4.

```gherkin
Given ảnh của card đã có trong cache trình duyệt
When card vào viewport
Then ảnh hiện ngay ở frame đầu card giao viewport, không có skeleton, Kính hay crossfade
```

### R4. Mở ảnh tại chỗ

`renderPrimaryMedia` đổi ảnh ở chính khung `.advertising-photo-view__hero-frame`, khi mở từ masonry chính, related,
thumbnail hay Back, Forward; không ảnh bay từ card, không clone, không khóa cuộn. Primary chạy đúng motion của card tải
chậm (R1, R2), dù ảnh có sẵn hay chưa, để người xem không phân biệt được hai trường hợp (owner 2026-10-24):

1. Khi `src` đổi, ảnh và nền vùng dư cũ ẩn ngay (`data-advertising-photo-loading`), skeleton của R1 (cùng hook và cách
   bốc assignment) phủ khung, trên ảnh và dưới nút ảnh; khung có `aria-busy="true"`; runtime chờ `decode()`.
2. Giải mã xong thì chạy ba bước của R2 với chung code card (`revealGlass`, `crossfadeLayers`, `playGlassReveal`,
   `CARD_REVEAL_MS`): Kính ba bậc hiện trên skeleton; dưới Kính skeleton mờ đi, ảnh và nền vùng dư hiện lên; Kính tan.
   Ảnh có sẵn chỉ làm skeleton đứng ngắn hơn, có khi không tới một frame.

Không có lớp tạm giữ ảnh cũ và không có Kính vẽ sẵn. Xong thì gỡ Kính, skeleton và bỏ `aria-busy`. Media video ở primary
không có skeleton hay Kính. Morph sang viewer theo [detail R9](advertising-detail.md#r9-viewer).

Điện thoại (cảm ứng, mọi chiều xoay) chạy đúng R4 như PC, ở mọi đường mở (owner 11/10). Không có nhánh motion riêng cho
phone.

```gherkin
Given primary đang xem ảnh A, ảnh B đã có trong cache
When bấm card related B
Then A và nền của A ẩn ngay, skeleton phủ khung, Kính hiện trên skeleton, B hiện dưới Kính, rồi Kính tan
And chuỗi và nhịp từng lớp giống hệt khi B tải chậm và giống card tải chậm, không ảnh bay hay clone từ card

Given điện thoại và PC mở cùng detail, ảnh primary tải chậm
When ảnh giải mã xong, rồi bấm related, rồi Back
Then hai máy chạy cùng chuỗi Kính ba bậc, cùng thời lượng, chỉ opacity, nền vùng dư crossfade cùng ảnh
```

### R5. Skeleton thay vòng xoay

Advertising không có vệt sáng: vệt CSS của [tải ảnh R6](media-delivery.md#r6-vệt-sáng-chờ-ảnh-tĩnh) không áp trong
`[data-project-grid]` và `[data-advertising-photo-view]` (`style.css`), và script head không gắn `.media-frame` cho ảnh trong
viewer "Xem lớn hơn" (`[data-advertising-photo-dialog]`) nên viewer không có vệt sáng lẫn fade-in 0,45s mỗi lần mở; card và
primary chờ ảnh bằng skeleton (R1, R4), không spinner. Khung primary mang `aria-busy="true"` từ lúc đổi `src` tới khi ảnh giải mã xong hoặc lỗi. Card nhiều media
giữ status ẩn cho trình đọc màn hình theo [media-card R5](media-card.md#r5-chờ-tải-và-lỗi-media).

```gherkin
Given detail đang mở, primary đổi sang một ảnh chưa tải
When ảnh đang tải
Then khung primary có aria-busy="true" và skeleton, không có vệt sáng nào trong masonry hay primary
And mở viewer thì không có vệt sáng hay fade-in chờ ảnh trong viewer, kể cả khi viewer đang là video
```

### R6. Rời đi giữa chừng

- Card ra hẳn khỏi viewport (`intersectionRatio = 0`): đang chạy R2 thì hủy animation, gỡ Kính và skeleton ngay, lần vào
  sau chạy lại theo R1 hoặc R3. Skeleton chưa tới R2 thì ở lại trong khung và nhả WebGL
  context; ảnh tải xong khi card còn ngoài viewport thì skeleton gỡ không qua Kính.
  Card ra khỏi viewport khi đang chờ `decode()` của R2: decode xong thì media hiện ngay ở opacity cuối, không Kính
  (`tests/site/advertising-reveal-offscreen.e2e.mjs`).
- Card bị gỡ khỏi masonry hoặc related (ảo hóa, đổi filter, đổi tag, đóng detail): gỡ skeleton và Kính; `img` chưa tải
  xong bỏ `src`, `srcset` để trình duyệt hủy request (`img` tách khỏi DOM vẫn tải tiếp, kéo thanh cuộn khi tắt cache dồn
  hàng trăm request cũ trước ảnh đang thấy).
- Primary đổi sang ảnh khác trước khi R4 xong: lượt cũ dừng, gỡ skeleton, Kính cũ, rồi lượt mới bắt đầu
  (`settlePrimaryReveal`). Về masonry (`restoreGridEntry`) hoặc runtime unmount: gỡ hết.

```gherkin
Given primary đang chờ ảnh A, khung có skeleton
When bấm card related B trước khi A giải mã xong
Then skeleton và Kính của A bị gỡ, primary chỉ chạy R4 cho B
And khi B hiện xong, khung không còn aria-busy, skeleton hay Kính
```

### R7. Ảnh lỗi

Ảnh card lỗi: runtime hủy lượt chờ, gỡ skeleton, không chạy Kính; ảnh lỗi không hiện (`.advertising-tile img` giữ opacity
0), khung hiện dấu báo lỗi theo [media-card R5](media-card.md#r5-chờ-tải-và-lỗi-media). Card nhiều media đổi sang media
khác theo media-card R5 trước khi tới bước này. Primary: `decode()` bị từ chối vì lỗi thì gỡ skeleton, Kính,
bỏ `aria-busy` và `data-advertising-photo-loading` ngay, rồi hiện cùng dấu báo lỗi.

```gherkin
Given một card đang hiện skeleton
When request ảnh của card lỗi
Then skeleton bị gỡ, không có Kính, card giữ nguyên kích thước và hiện dấu báo lỗi
```

### R8. Giảm chuyển động

`prefers-reduced-motion: reduce`: skeleton vẫn gắn theo R1, R4 nhưng đứng yên ở frame tĩnh
([skeleton R7](advertising-skeleton.md#r7-reduced-motion-và-fallback)); ảnh thay skeleton ngay khi sẵn sàng (card: tải
xong; primary: giải mã xong), không Kính, không crossfade.

```gherkin
Given trình duyệt bật giảm chuyển động, ảnh tải chậm
When card và primary chờ ảnh rồi ảnh tải xong
Then skeleton không chuyển động, ảnh thay skeleton ngay, không có Kính hay crossfade
```

### R9. Ngân sách hiệu năng

Masonry đang tải phải đạt gate điện thoại của [skeleton R8](advertising-skeleton.md#r8-hiệu-năng) khi vuốt nhanh có
nhiều card cùng chạy R2. Không hạ độ phân giải, frame rate hay chất lượng preset để đạt gate. Nếu Kính làm rơi gate, PR
code báo owner kèm số đo trước khi đổi cách làm.

```gherkin
Given phone Android, masonry đầy card đang chờ ảnh
When vuốt nhanh từ đầu masonry tới footer
Then trace Chrome đạt gate điện thoại của skeleton R8
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| DOM hook | `.advertising-grid__cta-frame[data-advertising-loading-skeleton="<media id>"]` trong `.advertising-card-media` hoặc `.advertising-photo-view__hero-frame`; canvas `data-advertising-flow-batch="loading"` | Skeleton chờ ảnh (R1, R4); gỡ sau R2 hoặc khi rời đi, lỗi (R6, R7) |
| DOM hook | `.glass-surface[data-glass-shape="even"][data-glass-reveal]` | Kính ba bậc, chỉ có trong R2, R4; không có ở R3 |
| DOM hook | `data-advertising-photo-loading`, `aria-busy` trên `.advertising-photo-view__hero-frame` | Ẩn ảnh và nền vùng dư cũ ngay khi đổi `src`; primary đang chờ (R4, R5) |
| Runtime | `attachCardSkeleton`, `revealCard`, `hideCardMedia`, `dropCardSkeleton`, `attachLoadingSkeleton`, `detachLoadingSkeleton`, `crossfadeLayers`, `revealGlass`, `renderPrimaryMedia`, `playPrimaryReveal`, `settlePrimaryReveal`; hằng `CARD_REVEAL_MS`, `PHONE_REVEAL_SCROLL_IDLE_MS`, `MEDIA_REVEAL_MS` (`catalog-runtime.mjs`, nội bộ) | R1–R8 |
| Hàm public | `createGlassSurface`, `playGlassReveal`, `glassRevealLevel` (`glass-surface.mjs`); `createSkeletonFlowRenderer`, `staticBackground` (`skeleton-flow.mjs`) | Kính và renderer dùng lại nguyên |
| Card | `figure.advertisingPendingMediaId()` | Media id đang chờ hoặc `null`; runtime hỏi trước khi gắn skeleton |

Spec không sở hữu file: code nằm trong `catalog-runtime.mjs` ([masonry](advertising-masonry.md)), `skeleton-flow.mjs`
([skeleton](advertising-skeleton.md)), `glass-surface.mjs` ([Kính](glass-surface.md)), `detail.css`
([trang con](detail-pages.md)), `style.css` ([shell](site-shell.md)); sửa hành vi ở đó thì cập nhật cả spec này.

## UI

[Skeleton](../../design-system/components/Skeleton/README.md),
[Kính hiện và tan trên ảnh vừa tải](../../design-system/components/Glass/README.md#hiện-và-tan-trên-ảnh-vừa-tải) (ba bước,
thời điểm, đường cong), [Primary](../../design-system/components/Primary/README.md),
[motion ảnh trong card](../../design-system/motion.md#ảnh-trong-card),
[motion primary](../../design-system/motion.md#suggestion-và-detail).

## Kiểm tra

E2E cần `pnpm dev`, `BASE_URL`; `CASE=<tên>` chạy một ca của `advertising-photo-transitions.e2e.mjs`.

| R | Test hoặc command |
| --- | --- |
| R1 | `image-loading-frame.e2e.mjs` (P9: skeleton phủ khung media ngay khi vào viewport, lệch tối đa 1px; card, CTA, footer, filter giữ hình học khi ảnh tải); `advertising-skeleton-slow-network.e2e.mjs` (lúc tải trang skeleton card đầu giữ một node, hiện dần một lần); `advertising-skeleton-flow.test.mjs` (pha liên tục, cùng preset lệch ít nhất 1/4 vòng) |
| R2 | `image-loading-frame.e2e.mjs` (P9: Kính ba bậc chỉ đổi opacity, xong trong `0.6s`, skeleton và Kính gỡ sau khi tải); `node tests/site/glass-surface.test.mjs` (ba bậc, mức Kính theo thời gian) |
| R3 | `image-loading-frame.e2e.mjs` (P9: card đã tải ra hẳn rồi vào lại viewport hiện ngay, không skeleton, không Kính), `TT_E2E_ADVERTISING_MEDIA_ENTRANCE_ONLY` (card ảo hóa gắn lại); `advertising-remount-no-cache.e2e.mjs` (tắt cache, mạng chậm, cuộn nhảy: không card trắng quá `400ms`) |
| R4 | `image-loading-frame.e2e.mjs` (P9: primary đang tải có skeleton, Kính ba bậc chỉ opacity, phone khớp PC); `glass-surface.e2e.mjs` (ghi từng frame khi related tải chậm và Back có sẵn: skeleton trước Kính, ảnh không đậm hơn Kính lúc Kính tăng; nhịp từng lớp giống nhau giữa lần mở, related, Back và card tải chậm); `CASE=m02b-grid-detail-no-clone-no-jump`, `morph-backdrop-lifecycle` |
| R5 | `image-loading-frame.e2e.mjs` (P9: `aria-busy` theo ảnh primary hiện tại); vắng vệt sáng trong masonry, detail chưa có test; `advertising-products-static.test.mjs` (viewer không nhận `.media-frame`); `site-media-card-m02a.e2e.mjs` (`viewerMediaGate`: viewer ảnh và video không có vệt sáng, fade-in) |
| R6 | `image-loading-frame.e2e.mjs` (P9: đổi ảnh nhanh không để lại skeleton, Kính, `aria-busy` cũ; về masonry gỡ skeleton primary); `CASE=delayed-image-resize-latest-wins`; `advertising-remount-no-cache.e2e.mjs` (card bị gỡ không còn `img` đang tải) |
| R7 | chưa có test |
| R8 | chưa có test |
| R9 | chưa có test; trace Chrome qua CDP trên A05s cũ ([debug Android](../operations/android-real-device-debugging.md)) |

## Gate còn mở

- R9 trên SM-A047F (18/10, mạng giả 400ms/64KB/s, vuốt nhanh tới footer, 3 lượt): SurfaceFlinger trung bình 71 đến 73fps,
  p5 45,5, frame trên `33ms` 0 đến 0,5%; main thread rAF khoảng 30fps, long task trên `50ms` 2 đến 7 (dài nhất 61ms).
  Viewport chỉ có tối đa 1 Kính nên ca nhiều Kính cùng chạy chưa phủ. Máy PC.
- `image-loading-frame.e2e.mjs` mới chạy Chromium: WebKit chưa chạy; Safari trên iPhone thật chưa kiểm skeleton và Kính
  (WebKit trên cloud không vẽ `backdrop-filter`, [Kính R7](glass-surface.md#r7-hiệu-năng-và-trình-duyệt)). Main (WebKit),
  owner và máy PC (iPhone).
- R8 chưa có test tự động. Main.
- Owner chưa nghiệm thu skeleton chờ ảnh, Kính hiện, tan và mở ảnh tại chỗ trên demo (M02b vẫn NOT ACCEPTED). Owner.

## Chú thích thuật ngữ

- **Skeleton chờ ảnh**: khung skeleton cuối masonry dùng lại để giữ chỗ cho media đang tải.
- **Kính**: lớp glassmorphism; ở đây dạng phủ đều ba bậc, chỉ có trong lúc ảnh hiện.
- **Crossfade**: một lớp mờ đi trong lúc lớp khác hiện lên ở cùng chỗ.
- **Lớp tạm**: bản ảnh primary cũ nằm trên ảnh mới cho tới hết crossfade.
- **Lease pool**: nhóm WebGL context dùng chung, cho mượn và trả theo khung.
- **Preset Flow**: bộ bốn màu và điểm neo của skeleton.
- **Giải mã**: trình duyệt chuyển file ảnh thành điểm ảnh sẵn để vẽ (`decode()`).
- **Trace**: bản ghi hiệu năng từng frame của trình duyệt.
