---
title: Skeleton cuối masonry Advertising
status: live
source:
  - src/site/advertising-products/skeleton-flow.mjs
  - src/site/advertising-products/skeleton-flow-worker.mjs
tests:
  - tests/site/advertising-skeleton-flow.test.mjs
  - tests/site/advertising-skeleton-lifecycle.e2e.mjs
  - tests/site/advertising-skeleton-slow-network.e2e.mjs
  - tests/site/advertising-continuation.e2e.mjs
notion: https://app.notion.com/p/3e6332849a0e81508d66ca0b3cfebf18
updated: 2026-10-26
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
đầu. Khung cuối mỗi cột kéo tới đáy batch; phần còn lại ngắn hơn `0.25` bề rộng card thì gộp vào khung phía trên. Slot
là thứ tự khung nối tiếp masonry (`0`, `1`, ...), không phải ô cột và độ sâu: đổi số cột thì khung thứ k vẫn là item
k của cùng lưới, nên resize trượt cả card và khung như một masonry (owner 10/10). Band gắn với slot, dựng lại giữ band
cũ, trừ khi cột mới đặt slot ngay dưới khung cùng band. Batch chỉ có khi masonry đang hiện, không có khi mở detail.

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

Skeleton chờ ảnh của card vào viewport trong `250ms` sau một scroll event làm đổi vị trí cuộn (PC: `site:scroll` của
Locomotive; điện thoại: `scroll`) hiện ngay: khung không fade `0.6s`, canvas Flow không fade `300ms` (ảnh tĩnh dưới canvas
là một khung hình cùng pha nên không nhảy). Vuốt nhanh (khoảng 7.500 px/s) để card trong viewport khoảng `270ms`, ngắn hơn
hai fade cộng lại, nên trước đó người xem chỉ thấy ảnh tĩnh `48×32` mờ dần hiện, không thấy Flow (owner thấy trên PC,
2026-10-26; đo Chromium cloud: Flow thấy rõ 7% thời gian card chờ ảnh, sau sửa 66%). Card vào lúc trang đứng yên (tải
trang, đổi filter) giữ hai fade. Scroll event ở vị trí không đổi (lúc tải trang) không tính.

```gherkin
Given PC, ảnh card tải chậm
When vuốt nhanh làm card mới vào viewport
Then khung skeleton của card hiện ngay ở opacity cuối và canvas Flow đã dựng hiện ngay, không transition opacity

Given khung đã hiện xong và Flow đang chạy
When cuộn khung ra hẳn vùng nhìn thấy rồi vào lại
Then khung hiện ngay, không trống, reveal Kính không chạy lại

Given khung đã hiện xong và Flow đang chạy
When ẩn tab rồi hiện lại hai lần
Then reveal Kính không chạy lại, Flow tiếp tục từ pha lúc dừng
```

### R5. WebGL context

Mọi khung của batch vẽ bằng một canvas WebGL chung (một context) nằm trong `.advertising-grid__cta-skeleton`:
7-8 context riêng làm GPU A05s cũ quá tải (p5 45.5fps, GPU process bận 46%), một context ở nửa độ phân giải đạt gate
(p5 90fps, 0.3-0.8% frame chậm đứng yên, 13.9%; vòng 20, owner chọn 10/10). Canvas cao gấp đôi viewport, cuộn cùng
nội dung và chỉ dời khi viewport ra khỏi nó; độ phân giải bằng nửa CSS px trên mọi máy. Mỗi frame canvas xóa trong
suốt rồi vẽ từng khung đang chạy bằng viewport và scissor tại vị trí của khung, với preset, pha và chiều riêng; khung
chưa vào entry không vẽ, khung đang entry vẽ với alpha theo opacity của reveal Kính (R4). Canvas nằm trên khung và
dưới Kính, CTA. Dưới canvas mỗi khung vẫn hiện frame tĩnh là một khung hình Flow của chính assignment ở pha hiện tại,
nên khi canvas chưa vẽ, dừng hay mất context thì khung không trống và lúc chuyển sang chạy không nhảy. Mất context:
xóa danh sách vẽ, hiện frame tĩnh; khôi phục thì dựng lại và chạy tiếp các khung đang chạy.

Skeleton chờ ảnh trong media card và primary: trình duyệt không có worker dùng renderer riêng mỗi khung, tối đa 12 renderer;
PC dùng chung một context trong worker (đoạn dưới), tối đa 24 khung chạy; điện thoại dùng context riêng mỗi khung, xếp 4 khung mỗi
worker (tối đa 12 khung, 3 worker). Khung đang thấy
giữ renderer đã có; còn chỗ thì cấp cho khung gần đầu viewport trước (top rồi left). Khung chưa có renderer hiện frame
tĩnh của preset. Nhả renderer trước khi cấp mới nên xoay máy không vượt ngân sách. Renderer vẽ trong một module worker
chung của document qua `OffscreenCanvas` (owner 19/10): rAF của worker không chờ main thread, nên khi vuốt nhanh main
thread bận masonry (rAF còn khoảng 12fps trên A04s) Flow vẫn chạy theo tần số màn hình. Worker tự tạo context, compile
program và noise; nhả renderer thì worker trả context (`loseContext`), main thay canvas đã transfer bằng canvas tĩnh
mới ở pha đã lưu. Chrome chỉ giữ 4 context WebGL sống trong mỗi dedicated worker (đo 26/10 trên RTX 3090, Chrome 155:
tạo context thứ 5 thì context cũ nhất bị thu hồi mà main thread không được báo), nên trên PC worker có đúng một
context WebGL: mỗi khung vẽ một lượt vào context đó rồi chuyển hình sang canvas của khung bằng `bitmaprenderer`
(`data-advertising-flow-context="shared"`), mất context của worker thì dựng lại và chạy tiếp. Điện thoại (A04s, cùng giới hạn 4)
giữ context riêng mỗi khung nhưng xếp tối đa 4 khung mỗi worker, nên 12 khung chạy trên 3 worker; context chung trên A04s
làm fps SurfaceFlinger tụt dưới 60 và khoảng giữa hai lần vẽ p95 vượt `33ms` (đo 26/10) nên không dùng. Pha trên main tính theo thời gian chạy. Trình duyệt không có `OffscreenCanvas`, `Worker` hay tạo
worker lỗi thì về renderer main thread: ngân sách 12 context tính cả context đang dùng và đang rảnh, context giữ theo
document và dùng lại (trả lease thì xóa buffer, texture, listener, RAF đúng một lần, giữ canvas, context và program đã
compile; compile mất khoảng 60ms trên A05s cũ), lease mới bắt đầu ở pha đã lưu, context mới tạo ở task trước task dựng
renderer. Mất context: hiện frame tĩnh, khôi phục thì dựng lại và chạy tiếp nếu trước đó đang chạy. `destroy()` gọi
nhiều lần vẫn an toàn và không gọi `loseContext` trên context đã mất. Mỗi renderer dựng trong một task riêng sau frame
(R8) và không chờ cuộn dừng, nhưng chờ card masonry trượt `0.4s` xong (đổi filter, resize) để dựng renderer không
làm trễ nhịp trượt. Cuộn mượt thắng: loại máy nào trace cho thấy dựng renderer giữa lúc cuộn gây task trên 50ms thì
hoãn dựng tới khi cuộn dừng, vẫn hiện frame tĩnh. Điện thoại (pointer coarse, có touch hoặc `clientWidth <= 750`) hoãn
như vậy cho khung batch (A05s cũ, 10/10); khung chờ ảnh trong card dựng ngay cả lúc đang vuốt, với profile phone ở R8
(owner 18/10). "Cuộn dừng" là sau `scrollend` cộng `120ms`; trình duyệt
không có `scrollend` thì `120ms` sau scroll event cuối. Scroll không kèm `scrollend` (layout, mở detail nhảy về đầu
trang) coi là đã dừng sau `500ms` không có scroll event.

```gherkin
Given điện thoại 838px ngang
When cuộn qua batch, đổi filter và xoay máy nhiều lần
Then batch chỉ dùng một context, tổng không lúc nào quá 12, không lỗi "too many active WebGL contexts" hay lose context hai lần
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
30fps, vòng lặp không có long task trên 50ms. Điện thoại: gate [phone Android trên 60fps](../decisions/phone-frame-budget.md)
(trên 60fps), mọi khung trong viewport đều chạy (owner 10/10). Batch đạt gate nhờ một canvas chung nửa độ phân
giải (R5). Khung chờ ảnh trong card trên điện thoại chạy cả lúc vuốt nên dùng renderer `120x80`, vẽ mọi frame của
worker, giữ preset, màu, anchor, chiều chảy và tốc độ (owner 18/10, 19/10); ngoài điểm đó không hạ preset, noise hay số
khung chạy để đạt gate. Gate mượt khung card khi vuốt nhanh trên A04s: khoảng giữa hai lần vẽ của mỗi renderer p95
dưới `33ms` (đo 19/10: p50 `11-12ms`, p95 `18-24ms`, fps SurfaceFlinger `69-71`).
Mọi renderer trong một thread dùng chung một noise texture. Ảnh tĩnh render CPU tối đa `8ms` mỗi task; khung còn lại nhận
assignment ở task sau và chưa vào entry trước đó. Đồng bộ chạy trong rAF (chung task với frame cuộn và layout
masonry) không render ảnh tĩnh nào mà chuyển hết sang task sau. Task sau chạy trong idle sau frame, ngân sách là phần
rảnh còn lại (tối đa `8ms`, luôn ít nhất một khung mỗi lượt).

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
| Hàm public | `SKELETON_FLOW_PRESETS`, `drawSkeletonFlowAssignment`, `createSkeletonFlowFrameLayout`, `createSkeletonFlowRenderer` (`speedScale`), `renderSkeletonFlowPixels`, `skeletonFlowStill`, `staticBackground`, `advanceSkeletonFlowPhase`, `createSharedSkeletonFlowLayer` (`skeleton-flow.mjs`) | Thuần trừ renderer, layer chung và `skeletonFlowStill`; `catalog-runtime.mjs` gọi |
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
| R4 | `advertising-skeleton-lifecycle.e2e.mjs`; `advertising-skeleton-slow-network.e2e.mjs` (vuốt nhanh trên PC: khung và canvas hiện không fade); `advertising-continuation.e2e.mjs` (filter, reload, detail, Back/Forward; lần vào đầu tiên: Kính reveal `0.6s` rồi gỡ khi cung ngoài viewport, chỉ crossfade khi cung đang giao viewport) |
| R5 | `advertising-skeleton-flow.test.mjs` (mất, khôi phục, destroy, lease; frame tĩnh theo preset và pha); `advertising-skeleton-lifecycle.e2e.mjs` (ngân sách điện thoại, ngang 838px); `advertising-skeleton-slow-network.e2e.mjs` (PC cao 1920x1400: card chờ ảnh đều chạy trên context chung; mở detail từ masonry đã cuộn: Flow chạy, card related tải xong hiện mà không cần cuộn) |
| R6 | `advertising-continuation.e2e.mjs` (`footer-top-gap` 0, đáy batch); `glass-surface.e2e.mjs` |
| R7 | `advertising-continuation.e2e.mjs` (Flow tĩnh khi giảm chuyển động) |
| R8 | `advertising-continuation.e2e.mjs` (desktop 1569×912, cần Chrome có GPU); điện thoại chưa có test, đo bằng trace Chrome qua CDP ([debug Android](../operations/android-real-device-debugging.md)) |

## Gate còn mở

- R8 trên SM-A047F (18/10, 3 lượt vuốt xuống related): frame trên `33ms` 0 đến 0,5% (A05s cũ khoảng 9%), SurfaceFlinger
  p5 90,9fps, 0 long task trên `50ms`: PASS. Owner xem trên demo.
- Safari trên iPhone thật chưa kiểm batch (thanh địa chỉ, bfcache, context). Owner và máy PC.
- `advertising-continuation.e2e.mjs` chỉ PASS gate fps R4 trên Chrome có GPU: cloud (WebGL phần mềm, Chromium headless) đo
  khoảng 9fps và có long task vượt `50ms`, nên hai assert đó FAIL ngoài PC. Các assert còn lại PASS ở cloud (18/10).
  Chromium headless gần như không chạy rAF của worker, nên đo nhịp vẽ khung card phải dùng trình duyệt có màn hình (19/10).
- Owner chưa xem Flow và 12 preset trên demo. Feral Flow chỉ là tham khảo, không có gate cảm nhận 95–99%
  ([đo Feral](https://github.com/advertruongthinh-code/TruongThinhWebsite/blob/a3428aaff2cf1ff2f8f5a4f6804404e23ccd349b/docs/verification/feral-flow-measurement-2026-09-21.md)). Owner.

- Điện thoại (R5): đo 26/10 trên A04s, Chrome 156, vuốt nhanh masonry với ảnh bị giữ, bản main trước khi sửa: 12 khung
  báo `running` nhưng chỉ 4 chuyển động thật (worker tạo 78 context, mất 74, còn 4 sống); bản context chung chạy đủ khung
  nhưng trượt gate fps R8. Bản 4 khung mỗi worker chưa đo trên A04s: cần số khung chuyển động thật và gate R8. Owner và máy phone.

## Chú thích thuật ngữ

- **Batch**: tập khung skeleton nối tiếp masonry tới footer trong một lần dựng.
- **Slot**: thứ tự khung nối tiếp masonry, khóa để giữ band và assignment.
- **Assignment**: preset, hoán vị anchor, pha, chiều chảy và tốc độ lệch của một khung.
- **Trạng thái trang**: một lần masonry ổn định sau tải trang, đổi filter, mở hoặc đóng detail, Back/Forward.
- **Lease**: quyền dùng tạm một WebGL context; context thuộc document, không thuộc khung.
- **Flow**: hiệu ứng gradient chảy vẽ bằng WebGL.
- **Worker**: thread chạy JavaScript tách khỏi main thread của trang.
- **OffscreenCanvas**: canvas mà worker vẽ trực tiếp sau khi trang chuyển quyền điều khiển (`transferControlToOffscreen`).
