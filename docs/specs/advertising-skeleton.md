---
title: Skeleton cuối masonry Advertising
status: live
source:
  - src/site/advertising-products/skeleton-flow.mjs
tests:
  - tests/site/advertising-skeleton-flow.test.mjs
  - tests/site/advertising-skeleton-lifecycle.e2e.mjs
  - tests/site/advertising-continuation.e2e.mjs
notion: https://app.notion.com/p/3e6332849a0e81508d66ca0b3cfebf18
updated: 2026-10-10
---

# Skeleton cuối masonry Advertising

## Mục đích

Batch skeleton nối tiếp [masonry](advertising-masonry.md) từ đáy card thật tới footer, mặt là Flow WebGL với 12
preset, làm nền cho CTA cuối trang. Spec sở hữu hình học batch, preset, assignment, vòng đời và WebGL context; cùng
renderer phủ ảnh đang tải ([skeleton chờ ảnh](loading-glass-and-page-entry.md)). Vị trí chữ CTA ở
[CTA giữa viewport](advertising-cta-center-parallax.md), kính ở [Kính](glass-surface.md).

## Hành vi

### R1. Batch nối tiếp masonry

Khung `.advertising-grid__cta-frame[data-advertising-cta-frame]` nằm trong `[data-advertising-cta-skeleton]`
(`aria-hidden`), không focus, không hover, không viền. Mỗi khung rộng một cột, bắt đầu một khoảng giữa dưới card thật
của cột; batch kết thúc ở đáy CTA, ngay trên footer; chiều cao đuôi theo [CTA R2](advertising-cta-center-parallax.md#r2-batch-skeleton-dưới-cta-co-giãn).
Khung đặt vào cột có đáy thấp nhất trước, cao bằng bề rộng card nhân một trong ba band: ngang `0.72`, vuông `1`, đứng
`1.32`. Một cột không có hai khung liền cùng band; cùng độ sâu ưu tiên band khác. Runtime thử tối đa 8 phương án theo
seed lượt duyệt, chọn phương án có ít nhất 2 band trong 4 khung đầu và không quá 3 khung liền cùng band trong 12 khung
đầu. Khung cuối mỗi cột kéo tới đáy batch; phần còn lại ngắn hơn `0.25` bề rộng card thì gộp vào khung phía trên. Band
gắn với slot (`cột:độ sâu`), dựng lại giữ band cũ. Batch chỉ có khi masonry đang hiện, không có khi mở detail.

```gherkin
Given masonry kết thúc ở bất kỳ độ cao nào, 2 tới 4 cột
When runtime dựng batch
Then khung đầu mỗi cột cách card thật một khoảng giữa, đáy khung cuối mỗi cột trùng đáy batch
And không khung nào thấp hơn 0.25 bề rộng card, không hai khung liền cùng band trong một cột
```

### R2. Flow và 12 preset

Mỗi khung có một canvas WebGL 240×160 phủ tràn 8% mỗi phía: gradient bốn màu chảy, xoáy chậm, có noise mịn. Source giữ
đúng 12 preset: `iridescent-cloud`, `opal`, `lagoon`, `emerald`, `solar-flare`, `orchid`, `peach-glow`,
`electric-tide`, `sunset`, `mint-ice`, `midnight-bloom`, `rose-gold`; field scale 100, soften 0 cho mọi preset.
`SKELETON_FLOW_PRESETS` dựng và freeze một lần khi nạp module từ hằng trong source, không parse lúc chạy. Pha
tăng `hướng × speed / 100 × 1.2 × min(dt, 0.05s)`. Không có WebGL: khung hiện gradient tĩnh của chính preset
(`staticBackground`), không vẽ khung CPU, không vòng lặp.

```gherkin
Given module skeleton-flow.mjs đã nạp
When đọc SKELETON_FLOW_PRESETS
Then có đúng 12 id khác nhau, field scale 100, mọi preset bị freeze
```

### R3. Assignment ngẫu nhiên và giữ màu

Mọi khung Flow (batch và skeleton chờ ảnh của card, primary) bốc assignment lúc khung vào vùng nhìn thấy lần đầu trong
một trạng thái trang: preset ngẫu nhiên trong 12, một hoán vị anchor trong 24, chiều chảy ngẫu nhiên, pha liên tục ngẫu
nhiên trên cả vòng (không chia mức cố định) và tốc độ lệch ngẫu nhiên tối đa 10% quanh `speed` của preset. Khi bốc, tránh
preset của khung kề đang có assignment (trên, dưới cùng cột, hoặc chồng chiều dọc ở cột bên cạnh); hết preset để tránh
thì được trùng, nhưng pha phải lệch ít nhất một phần tư vòng so với khung kề cùng preset. Trạng thái trang mới (tải trang,
đổi filter, mở hoặc đóng detail, Back/Forward) bỏ mọi assignment và bốc lại. Trong một trạng thái trang, khung giữ
assignment khi ra vào viewport, mount lại hay đổi bề rộng, chiều cao cửa sổ: batch theo slot, skeleton chờ ảnh theo
media id. Đổi kích thước chỉ bỏ slot nằm ngoài đáy batch mới; slot quay lại nhận lại assignment cũ.

```gherkin
Given batch đang hiện trên điện thoại dọc
When thanh địa chỉ thu, mở làm chiều cao vùng nhìn thấy đổi qua lại
Then mọi khung đang thấy giữ node, assignment và không chạy lại hiệu ứng vào
```

### R4. Vào viewport và vòng lặp

Khung giao vùng nhìn thấy (visual viewport) hiện bằng reveal Kính `0.6s` giống card ảnh
([Kính trên ảnh vừa tải](loading-glass-and-page-entry.md), owner 06/10): lớp dưới là khung trống, lớp hiện lên là
Flow. Khi Kính cung đang giao viewport, khung chỉ crossfade, không Kính reveal; cung vừa vào viewport thì gỡ mọi Kính reveal
đang chạy trong grid: bất kỳ Kính reveal nào còn trong DOM làm Chrome bỏ blur các bậc của cung (đo trên PC owner, 07/10). Flow chạy ngay từ đầu lúc hiện, kể cả khi đang cuộn hay giữ thanh cuộn. Reveal chỉ chạy lần đầu khung vào
vùng nhìn thấy; rời hẳn rồi vào lại thì khung hiện ngay như card ảnh đã tải, vì reveal chạy lại dưới Kính cung trông như
các bậc nhòe mất rồi hiện lại khi cuộn lên xuống ở CTA (owner thấy trên PC, 07/10). Flow chỉ chạy khi khung đang thấy, tab hiện, body không có `menu-open` hay
`motion-paused`, không reduced motion. Tab ẩn hoặc `motion-paused`: dừng, giữ trạng thái đã hiện; hiện lại chạy tiếp từ pha cũ. `pagehide` có `persisted`: dừng
renderer, `pageshow` có `persisted` chạy tiếp; `pagehide` không `persisted`: hủy mọi context của document.

```gherkin
Given khung đã hiện xong và Flow đang chạy
When cuộn khung ra hẳn vùng nhìn thấy rồi vào lại
Then khung hiện ngay, không trống, reveal Kính không chạy lại

Given khung đã hiện xong và Flow đang chạy
When ẩn tab rồi hiện lại hai lần
Then reveal Kính không chạy lại, Flow tiếp tục từ pha lúc dừng
```

### R5. WebGL context

Ngân sách context tính cả context đang dùng và đang rảnh, chung cho batch và skeleton chờ ảnh: điện thoại (pointer
coarse, có touch hoặc `clientWidth <= 750`) 2, máy khác 12. Khung đang thấy giữ context đã có; còn chỗ thì cấp cho khung
gần đầu viewport trước (top rồi left). Khung không có context hiện frame tĩnh của preset. Nhả context trước khi cấp mới
nên xoay máy không vượt ngân sách. Context giữ theo document và dùng lại: trả lease thì xóa program, buffer, texture,
listener, RAF đúng một lần, giữ canvas và context; lease mới bắt đầu ở pha đã lưu. Mất context: hiện frame tĩnh, khôi
phục thì dựng lại và chạy tiếp nếu trước đó đang chạy. `destroy()` gọi nhiều lần vẫn an toàn và không gọi
`loseContext` trên context đã mất. Mỗi renderer dựng trong một task riêng sau frame, context mới tạo ở task trước đó
(R8) và không chờ cuộn dừng, nhưng chờ card masonry trượt `0.4s` xong (đổi filter, resize) để dựng renderer không
làm trễ nhịp trượt. Trong lúc chờ context, khung hiện frame tĩnh là một khung hình Flow của chính assignment ở pha
hiện tại, nên lúc chuyển sang chạy không nhảy. Cuộn mượt thắng: loại máy nào trace cho thấy dựng renderer giữa lúc cuộn
gây task trên 50ms thì hoãn dựng tới khi cuộn dừng, vẫn hiện frame tĩnh đó. Điện thoại hoãn như vậy (A05s, 10/10):
"cuộn dừng" là sau `scrollend` cộng `120ms`; trình duyệt không có `scrollend` thì `120ms` sau scroll event cuối.

```gherkin
Given điện thoại 838px ngang
When cuộn qua batch, đổi filter và xoay máy nhiều lần
Then không lúc nào quá 2 context, không lỗi "too many active WebGL contexts" hay lose context hai lần
```

### R6. CTA, Kính và footer trên batch

CTA `section.detail-cta[data-advertising-grid-cta]` đặt tại `--advertising-cta-top` (đáy masonry cộng một khoảng
giữa), cao `--advertising-cta-tail-height`; chân chữ, cỡ tiêu đề, parallax theo
[CTA giữa viewport](advertising-cta-center-parallax.md). Kính dạng cung đặt theo đáy batch, đáy card thật, bề rộng card
và cụm CTA (`arcGlassGeometry`): card phía trên vẫn nét, nhòe tăng vào cụm CTA, đáy batch trắng tuyệt đối
([Kính R2–R3](glass-surface.md#r2-dạng-cung-nền-cho-cụm-cta-nhòe-tăng-dần)). Khi duyệt masonry footer không có khoảng
phía trên, floating CTA ẩn ([shell R10](site-shell.md#r10-floating-cta-và-footer)).

```gherkin
Given trang Advertising ở bất kỳ filter nào
When cuộn tới cuối trang
Then batch kết thúc ngay trên footer, đáy batch trắng, CTA đọc được trên kính
```

### R7. Reduced motion và fallback

`prefers-reduced-motion: reduce`: khung hiện ngay không transition, canvas đứng yên ở pha hiện tại, không vòng lặp; đổi
cài đặt giữa chừng thì áp dụng ngay. Không WebGL hoặc hết ngân sách context: frame tĩnh (R2, R5). Không JavaScript:
không có batch.

```gherkin
Given prefers-reduced-motion: reduce
When cuộn tới batch
Then mọi khung hiện ngay ở opacity cuối, không khung nào có is-looping
```

### R8. Hiệu năng

Desktop 1569×912: khi mọi khung giao viewport và mọi renderer đang chạy, đo 5s sau warm-up, mỗi renderer đạt ít nhất
30fps, vòng lặp không có long task trên 50ms. Điện thoại: gate [A05s trên 60fps](../decisions/a05s-frame-budget.md)
(trên 60fps), tối đa 2 context đang chạy. Không hạ độ phân giải, preset, noise hay số renderer để đạt gate.

```gherkin
Given Chrome có GPU, cửa sổ 1569×912, batch đầy viewport
When đo 5 giây sau warm-up
Then mỗi renderer từ 30fps trở lên, không long task trên 50ms
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| DOM hook | `[data-advertising-cta-skeleton]` (`data-advertising-cta-ready`, `-columns`, `-signature`) | Hộp batch; test đọc trạng thái |
| DOM hook | `[data-advertising-cta-frame]` với `data-advertising-cta-slot`, `-column`, `-depth`, `-ratio-band`, `data-advertising-flow-state`; canvas `data-advertising-flow-backend` | Khung (R1, R3); trạng thái renderer, backend WebGL hay tĩnh (R4, R5) |
| Class | `is-entry-ready`, `is-looping` trên khung | Đã hiện; Flow đang chạy (R4) |
| CSS | `--advertising-cta-top`, `--advertising-cta-tail-height`, `--advertising-cta-frame-opacity` | Runtime ghi, CSS đặt CTA và khung |
| Hàm public | `SKELETON_FLOW_PRESETS`, `drawSkeletonFlowAssignment`, `createSkeletonFlowFrameLayout`, `createSkeletonFlowRenderer` (`speedScale`), `renderSkeletonFlowPixels`, `skeletonFlowStill`, `staticBackground`, `advanceSkeletonFlowPhase` (`skeleton-flow.mjs`) | Thuần trừ renderer và `skeletonFlowStill`; `catalog-runtime.mjs` gọi |
| Runtime | `skeletonNativeContexts`, `mountSkeletonRenderer`, `releaseSkeletonRenderer`, `renderCtaSkeleton` (`catalog-runtime.mjs`) | Lease pool, dựng batch (R1, R3, R5) |

## UI

[Skeleton](../../design-system/components/Skeleton/README.md), [Kính](../../design-system/components/Glass/README.md),
[motion skeleton tiếp nối](../../design-system/motion.md#skeleton-tiếp-nối).

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1 | `node --test tests/site/advertising-skeleton-flow.test.mjs` (frontier thấp nhất, band giữ qua dựng lại, đáy batch); `advertising-continuation.e2e.mjs` |
| R2 | `advertising-skeleton-flow.test.mjs` (12 preset, soften 0, fallback tĩnh không RAF) |
| R3 | `advertising-skeleton-flow.test.mjs` (bốc assignment, tránh preset kề, pha lệch, tốc độ trong 10%); `advertising-skeleton-lifecycle.e2e.mjs` (chỉ đổi chiều cao, slot chung, giữ assignment) |
| R4 | `advertising-skeleton-lifecycle.e2e.mjs`; `advertising-continuation.e2e.mjs` (filter, reload, detail, Back/Forward) |
| R5 | `advertising-skeleton-flow.test.mjs` (mất, khôi phục, destroy, lease; frame tĩnh theo preset và pha); `advertising-skeleton-lifecycle.e2e.mjs` (ngân sách điện thoại, ngang 838px) |
| R6 | `advertising-continuation.e2e.mjs` (`footer-top-gap` 0, đáy batch); `glass-surface.e2e.mjs` |
| R7 | `advertising-continuation.e2e.mjs` (Flow tĩnh khi giảm chuyển động) |
| R8 | `advertising-continuation.e2e.mjs` (desktop 1569×912, cần Chrome có GPU); điện thoại chưa có test, đo bằng trace Chrome qua CDP ([debug Android](../operations/android-real-device-debugging.md)) |

## Gate còn mở

- R8 trên A05s: trace trong PR #153 không có task trên `50ms` ở trang ảnh, trang Advertising ngang main. Trang ảnh
  còn khoảng 9% frame trên `33ms` (main khoảng 1%) khi Kính hiện ảnh related; owner xem trên demo. Máy PC.
- Safari trên iPhone thật chưa kiểm batch (thanh địa chỉ, bfcache, context). Owner và máy PC.
- `advertising-continuation.e2e.mjs` FAIL ở `ready()`: sau reload có reduced motion rồi tắt, khung DOM đầu không có
  `is-looping` trong 30s; chưa rõ nguyên nhân. Cloud chỉ có WebGL phần mềm (khoảng 14fps) nên R8 desktop cần Chrome có
  GPU. Main và máy PC.
- `advertising-skeleton-lifecycle.e2e.mjs` FAIL (Chromium cloud 05/10, chạy riêng): ở 390×788 slot `1:4` top 14573,3
  bị gỡ dù đáy batch mới 14574,5; code gỡ đúng R1 (khung cao 1,2px dưới `0.25` bề rộng card), assertion "removed tail
  slots must lie beyond the new boundary" chưa tính luật này. Main sửa assertion.
- Owner chưa xem Flow và 12 preset trên demo. Feral Flow chỉ là tham khảo, không có gate cảm nhận 95–99%
  ([đo Feral](https://github.com/advertruongthinh-code/TruongThinhWebsite/blob/a3428aaff2cf1ff2f8f5a4f6804404e23ccd349b/docs/verification/feral-flow-measurement-2026-09-21.md)). Owner.

## Chú thích thuật ngữ

- **Batch**: tập khung skeleton nối tiếp masonry tới footer trong một lần dựng.
- **Slot**: vị trí khung theo cột và độ sâu, khóa để giữ band và assignment.
- **Assignment**: preset, hoán vị anchor, pha, chiều chảy và tốc độ lệch của một khung.
- **Trạng thái trang**: một lần masonry ổn định sau tải trang, đổi filter, mở hoặc đóng detail, Back/Forward.
- **Lease**: quyền dùng tạm một WebGL context; context thuộc document, không thuộc khung.
- **Flow**: hiệu ứng gradient chảy vẽ bằng WebGL.
