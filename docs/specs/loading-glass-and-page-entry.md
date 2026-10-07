---
title: Skeleton chờ ảnh và Kính hiện ảnh
status: live
source: []
tests:
  - tests/site/image-loading-frame.e2e.mjs
  - tests/site/glass-surface.test.mjs
  - tests/site/advertising-photo-transitions.e2e.mjs
  - tests/site/advertising-reveal-offscreen.e2e.mjs
notion: https://app.notion.com/p/3e9332849a0e814995c2fbb2e5393803
updated: 2026-10-07
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

### R1. Skeleton card trên card đang tải

Card của masonry chính và related (cả card nhiều media) vào viewport mà media đang hiện chưa giải mã xong thì ngay lúc đó,
không chờ mốc thời gian, kể cả khi đang cuộn hay giữ thanh cuộn, khung media nhận đúng khung skeleton cuối masonry:
`span.advertising-grid__cta-frame[data-advertising-loading-skeleton="<media id>"]` (`aria-hidden`) gắn cuối
`.advertising-card-media`, phủ kín khung; card giữ kích thước cuối. Assignment bốc ngẫu nhiên lúc khung vào viewport
([skeleton R3](advertising-skeleton.md#r3-assignment-ngẫu-nhiên-và-giữ-màu)) và lưu theo media id tới khi trang ổn định
lại, nên card ra vào hay mount lại vẫn giữ màu. Khung hiện, chạy Flow và nhận WebGL context như khung batch
([skeleton R4](advertising-skeleton.md#r4-vào-viewport-và-vòng-lặp), [R5](advertising-skeleton.md#r5-webgl-context)).
Card mount sẵn ngoài viewport chưa có skeleton. Skeleton nằm trong khung media nên đi cùng card khi card đổi vị trí.

```gherkin
Given masonry Advertising trên điện thoại, ảnh tải chậm
When vuốt nhanh làm card mới vào viewport
Then ngay khi vào viewport mỗi card chưa có ảnh mang khung skeleton phủ kín khung media, card không đổi kích thước
And hai khung skeleton đang thấy không chảy cùng pha
```

### R2. Hiện ảnh qua Kính

Media của card đang mang skeleton (R1) giải mã xong khi card còn giao viewport thì runtime chờ `img.decode()` (video không
chờ), rồi chạy ba bước chồng nhau trong `0.6s`, dù ảnh về nhanh hay chậm (`revealCard`):

1. Kính phủ đều năm bậc (`createGlassSurface("even", 5)`, `data-glass-reveal`) gắn cuối khung media và hiện dần.
2. Dưới Kính, skeleton mờ đi và media hiện lên (`crossfadeLayers`, chỉ opacity).
3. Kính tan, media rõ nét.

Kính hiện, tan theo [Kính R6](glass-surface.md#r6-hiện-và-tan-bằng-opacity-từng-bậc); thời điểm và đường cong ở
[UI](#ui), cùng nhịp `0.6s` với primary khi ảnh có sẵn (R4). Trên điện thoại (cùng điều kiện `skeletonPhone` của
[skeleton R1](advertising-skeleton.md)), card đến lượt hiện khi đang vuốt thì giữ skeleton tới khi trang ngừng cuộn
`120ms` (`PHONE_REVEAL_SCROLL_IDLE_MS`) rồi mới chạy R2. Xong thì runtime hủy animation, gỡ Kính và skeleton khỏi DOM,
trả WebGL context về pool. Media chỉ đổi opacity, không đổi `transform`, nên hover zoom
([masonry R8](advertising-masonry.md#r8-card-và-ảnh-trong-card)) giữ nguyên sau đó.

```gherkin
Given một card đang hiện skeleton
When ảnh của card giải mã xong
Then Kính hiện dần trên skeleton, skeleton và ảnh crossfade dưới Kính, rồi Kính tan
And sau 0.6s card không còn node skeleton hay Kính, WebGL context đã về pool
```

### R3. Ảnh có sẵn

Card vào viewport khi media đã giải mã xong (cache, tải xong trước khi vào, hoặc vào lại sau khi ra hẳn viewport với
`intersectionRatio = 0`, kể cả card ảo hóa gắn lại) thì media hiện ngay ở opacity cuối: không skeleton, không Kính, không
crossfade, không chờ trang ngừng cuộn. Áp cho masonry chính và masonry related; primary theo R4.

```gherkin
Given ảnh của card đã có trong cache trình duyệt
When card vào viewport
Then ảnh hiện ngay ở frame đầu card giao viewport, không có skeleton, Kính hay crossfade
```

### R4. Mở ảnh tại chỗ

`renderPrimaryMedia` đổi ảnh ở chính khung `.advertising-photo-view__hero-frame`, khi mở từ masonry chính, related,
thumbnail hay Back, Forward; không ảnh bay từ card, không clone, không khóa cuộn. Khi `src` đổi, khung có
`aria-busy="true"` và runtime chờ `decode()`. Chrome báo cả ảnh trong cache là chưa `complete` ngay sau khi đổi `src`, nên
ảnh giải mã xong trong `100ms` tính là ảnh có sẵn:

- Ảnh có sẵn, không skeleton. Detail đang hiện một ảnh đã tải xong thì ảnh đó ở lại thành lớp tạm
  `.advertising-photo-view__outgoing` (thêm `__outgoing-background` khi có nền vùng dư) phía trên ảnh mới; Kính phủ lên,
  lớp tạm mờ đi để lộ ảnh mới, Kính tan. Mở từ masonry thì ảnh mới hiện từ khung trống (`data-advertising-photo-loading`
  ẩn ảnh cũ). Ba bước như R2, trong `0.6s` (`CACHED_PRIMARY_REVEAL_MS`).
- Quá `100ms`: gỡ lớp tạm, ẩn ảnh cũ, gắn skeleton của R1 (cùng hook và cách bốc assignment) phủ khung, trên ảnh và dưới
  nút ảnh; giải mã xong thì chạy ba bước như R2 nhưng theo nhịp `1.4s` (`MEDIA_REVEAL_MS`), ảnh và nền vùng dư cùng hiện.

Xong thì gỡ lớp tạm, Kính, skeleton và bỏ `aria-busy`. Media video ở primary không có skeleton hay Kính. Morph sang
viewer theo [detail R9](advertising-detail.md#r9-viewer).

```gherkin
Given primary đang xem ảnh A, ảnh B đã có trong cache
When bấm card related B
Then Kính phủ lên A, A mờ đi để lộ B dưới Kính, rồi Kính tan, cả ba bước xong trong 0.6s
And không có skeleton, không ảnh bay hay clone từ card
```

### R5. Skeleton thay vòng xoay

Advertising không có vệt sáng: vệt CSS của [tải ảnh R6](media-delivery.md#r6-vệt-sáng-chờ-ảnh-tĩnh) không áp trong
`[data-project-grid]` và `[data-advertising-photo-view]` (`style.css`); card và primary chờ ảnh bằng skeleton (R1, R4),
không spinner. Khung primary mang `aria-busy="true"` từ lúc đổi `src` tới khi ảnh giải mã xong hoặc lỗi. Card nhiều media
giữ status ẩn cho trình đọc màn hình theo [media-card R5](media-card.md#r5-chờ-tải-và-lỗi-media).

```gherkin
Given detail đang mở, primary đổi sang một ảnh chưa tải
When ảnh đang tải
Then khung primary có aria-busy="true" và skeleton, không có vòng tải nào trong masonry hay primary
```

### R6. Rời đi giữa chừng

- Card ra hẳn khỏi viewport (`intersectionRatio = 0`): đang chạy R2 thì hủy animation, gỡ Kính và skeleton ngay, lần vào
  sau chạy lại theo R1 hoặc R3. Skeleton chưa tới R2 thì ở lại trong khung và nhả WebGL
  context; ảnh tải xong khi card còn ngoài viewport thì skeleton gỡ không qua Kính.
  Card ra khỏi viewport khi đang chờ `decode()` của R2: decode xong thì media hiện ngay ở opacity cuối, không Kính
  (`tests/site/advertising-reveal-offscreen.e2e.mjs`).
- Card bị gỡ khỏi masonry hoặc related (ảo hóa, đổi filter, đổi tag, đóng detail): gỡ skeleton và Kính.
- Primary đổi sang ảnh khác trước khi R4 xong: lượt cũ dừng, gỡ skeleton, lớp tạm, Kính cũ, rồi lượt mới bắt đầu
  (`settlePrimaryReveal`). Về masonry (`restoreGridEntry`) hoặc runtime unmount: gỡ hết.

```gherkin
Given primary đang chờ ảnh A, khung có skeleton
When bấm card related B trước khi A giải mã xong
Then skeleton, lớp tạm và Kính của A bị gỡ, primary chỉ chạy R4 cho B
And khi B hiện xong, khung không còn aria-busy, skeleton hay Kính
```

### R7. Ảnh lỗi

Ảnh card lỗi: runtime hủy lượt chờ, gỡ skeleton, không chạy Kính; ảnh lỗi không hiện (`.advertising-tile img` giữ opacity
0). Card nhiều media đổi sang media khác theo media-card R5 trước khi tới bước này. Primary: `decode()` bị từ chối vì lỗi
thì gỡ skeleton, lớp tạm, Kính, bỏ `aria-busy` và `data-advertising-photo-loading` ngay.

```gherkin
Given một card đang hiện skeleton
When request ảnh của card lỗi
Then skeleton bị gỡ, không có Kính, card giữ nguyên kích thước
```

### R8. Giảm chuyển động

`prefers-reduced-motion: reduce`: skeleton vẫn gắn theo R1, R4 nhưng đứng yên ở frame tĩnh
([skeleton R7](advertising-skeleton.md#r7-reduced-motion-và-fallback)); ảnh thay skeleton ngay khi sẵn sàng (card: tải
xong; primary: giải mã xong), không Kính, không crossfade, không lớp tạm.

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
Given Galaxy A05s, masonry đầy card đang chờ ảnh
When vuốt nhanh từ đầu masonry tới footer
Then trace Chrome đạt gate điện thoại của skeleton R8
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| DOM hook | `.advertising-grid__cta-frame[data-advertising-loading-skeleton="<media id>"]` trong `.advertising-card-media` hoặc `.advertising-photo-view__hero-frame`; canvas `data-advertising-flow-batch="loading"` | Skeleton chờ ảnh (R1, R4); gỡ sau R2 hoặc khi rời đi, lỗi (R6, R7) |
| DOM hook | `.glass-surface[data-glass-shape="even"][data-glass-reveal]` | Kính năm bậc, chỉ có trong R2, R4; không có ở R3 |
| DOM hook | `.advertising-photo-view__outgoing`, `__outgoing-background` | Ảnh primary cũ và nền vùng dư cũ, chỉ có trong R4 khi ảnh có sẵn |
| DOM hook | `data-advertising-photo-loading`, `aria-busy` trên `.advertising-photo-view__hero-frame` | Ẩn ảnh cũ khi không có lớp tạm; primary đang chờ (R4, R5) |
| Runtime | `attachCardSkeleton`, `revealCard`, `hideCardMedia`, `dropCardSkeleton`, `attachLoadingSkeleton`, `detachLoadingSkeleton`, `crossfadeLayers`, `revealGlass`, `renderPrimaryMedia`, `settlePrimaryReveal`; hằng `CARD_REVEAL_MS`, `PHONE_REVEAL_SCROLL_IDLE_MS`, `MEDIA_REVEAL_MS`, `CACHED_PRIMARY_REVEAL_MS` (`catalog-runtime.mjs`, nội bộ) | R1–R8 |
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
| R1 | `image-loading-frame.e2e.mjs` (P9: skeleton phủ khung media ngay khi vào viewport, lệch tối đa 1px; card, CTA, footer, filter giữ hình học khi ảnh tải); `advertising-skeleton-flow.test.mjs` (pha liên tục, cùng preset lệch ít nhất 1/4 vòng) |
| R2 | `image-loading-frame.e2e.mjs` (P9: Kính năm bậc chỉ đổi opacity, xong trong `0.6s`, skeleton và Kính gỡ sau khi tải); `node tests/site/glass-surface.test.mjs` (năm bậc, mức Kính theo thời gian) |
| R3 | `image-loading-frame.e2e.mjs` (P9: card đã tải ra hẳn rồi vào lại viewport hiện ngay, không skeleton, không Kính) |
| R4 | `image-loading-frame.e2e.mjs` (P9: primary đang tải có skeleton, Kính năm bậc chỉ opacity); `CASE=m02b-grid-detail-no-clone-no-jump`, `morph-backdrop-lifecycle`; đường ảnh có sẵn `0.6s` chưa có test riêng |
| R5 | `image-loading-frame.e2e.mjs` (P9: `aria-busy` theo ảnh primary hiện tại); vắng vòng tải trong masonry, detail chưa có test |
| R6 | `image-loading-frame.e2e.mjs` (P9: đổi ảnh nhanh không để lại skeleton, Kính, `aria-busy` cũ; về masonry gỡ skeleton primary); `CASE=delayed-image-resize-latest-wins` |
| R7 | chưa có test |
| R8 | chưa có test |
| R9 | chưa có test; trace Chrome qua CDP trên A05s ([debug Android](../operations/android-real-device-debugging.md)) |

## Gate còn mở

- R9 chưa có trace A05s khi vuốt nhanh masonry đầy card đang chờ ảnh, nhiều Kính cùng chạy. Owner và máy PC.
- `image-loading-frame.e2e.mjs` mới chạy Chromium: WebKit chưa chạy; Safari trên iPhone thật chưa kiểm skeleton và Kính
  (WebKit trên cloud không vẽ `backdrop-filter`, [Kính R7](glass-surface.md#r7-hiệu-năng-và-trình-duyệt)). Main (WebKit),
  owner và máy PC (iPhone).
- R8 chưa có test tự động. Main.
- Owner chưa nghiệm thu skeleton chờ ảnh, Kính hiện, tan và mở ảnh tại chỗ trên demo (M02b vẫn NOT ACCEPTED). Owner.

## Chú thích thuật ngữ

- **Skeleton chờ ảnh**: khung skeleton cuối masonry dùng lại để giữ chỗ cho media đang tải.
- **Kính**: lớp glassmorphism; ở đây dạng phủ đều năm bậc, chỉ có trong lúc ảnh hiện.
- **Crossfade**: một lớp mờ đi trong lúc lớp khác hiện lên ở cùng chỗ.
- **Lớp tạm**: bản ảnh primary cũ nằm trên ảnh mới cho tới hết crossfade.
- **Lease pool**: nhóm WebGL context dùng chung, cho mượn và trả theo khung.
- **Preset Flow**: bộ bốn màu và điểm neo của skeleton.
- **Giải mã**: trình duyệt chuyển file ảnh thành điểm ảnh sẵn để vẽ (`decode()`).
- **Trace**: bản ghi hiệu năng từng frame của trình duyệt.
