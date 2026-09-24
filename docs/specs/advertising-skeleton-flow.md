---
title: Skeleton Flow với preset dịu ngẫu nhiên
type: frontend
status: accepted
updated: 2026-09-22
notion: https://app.notion.com/p/3e0332849a0e811dbac1e7bb09ea28be
related_decisions: []
related_reports:
  - ../verification/feral-flow-measurement-2026-09-21.md
---

# Skeleton Flow với preset dịu ngẫu nhiên

## 1. Vấn đề và kết quả

### Vấn đề

Skeleton CTA hiện có animation nhưng sau `1,2s` chỉ dịch khoảng `0,6px` và
gradient gần như không đổi, nên nhìn như đứng yên.

### User và context

Người xem cần cảm nhận phần tiếp nối grid còn sống và có chiều sâu trong lúc
cuộn, nhưng motion không được tranh chú ý với ảnh sản phẩm.

### Kết quả mong muốn

Khung dùng Flow gradient chuyển động rõ như nguyên lý quan sát tại FeralUI,
kết hợp lơ lửng X/Y; mỗi lần load chọn ngẫu nhiên từ `6–8` preset dịu đã lưu.

| Trong scope | Ngoài scope |
| --- | --- |
| Renderer Canvas 2D riêng, preset, random ổn định, viewport lifecycle, reduced motion | Sao chép bundle FeralUI, video, dependency renderer mới, redesign CTA |

## 2. Constraint và câu hỏi mở

- Preset chỉ được chọn trong tập source-controlled đã duyệt.
- Random một lần khi mount; cùng card không đổi preset khi cuộn ra/vào viewport.
- Canvas chỉ chạy khi visible, tab hiện và không bật reduced motion.
- Test dùng seeded random; production không phụ thuộc seed test.
- Preset cụ thể sẽ được owner spot-check ở preview; không mở palette toàn site.

## 3. User workflow và acceptance

```gherkin
Given user tải Advertising Products với motion bình thường
When skeleton CTA đi vào viewport
Then trường màu chuyển động rõ trong 0,5–1 giây và card lơ lửng nhẹ theo X/Y
And preset giữ nguyên tới khi trang được reload
```

```gherkin
Given reduced motion hoặc skeleton ra khỏi viewport
When lifecycle đồng bộ
Then renderer dừng và nội dung vẫn hiển thị đầy đủ
```

## 4. System và implementation boundary

Renderer thuộc runtime Advertising hiện hành, gắn vào
`[data-advertising-cta-frame]`. Mỗi frame dùng canvas nội bộ độ phân giải thấp,
blend bốn điểm màu, distortion và swirl; CSS sở hữu chuyển động lơ lửng card.
Không tạo WebGL hoặc worker trong slice này.

## 5. Hướng dẫn implementation

```text
Build: pnpm prepare:site
Test: node tests/site/advertising-continuation.e2e.mjs
Verify: pnpm qa:static và Chrome DevTools performance/visibility probe
```

Preset có shape `{ id, colors[4], scale, distortion, swirl, speed }`. Runtime
chọn preset bằng injectable random function, dùng `IntersectionObserver`,
`visibilitychange` và media query hiện hành để start/stop một vòng RAF duy nhất
cho mỗi canvas đang hoạt động.

## 6. Thuộc tính chất lượng

| Attribute | Requirement | Evidence |
| --- | --- | --- |
| Accessibility | Reduced motion hiển thị frame tĩnh; không đổi semantics | media emulation |
| Performance | Không render offscreen/tab ẩn; không tạo video hoặc dependency | RAF/lifecycle probe |
| Security | Không fetch hoặc eval code ngoài | source review |
| Maintainability | Preset data tách khỏi renderer, randomness có thể seed | unit test |

## 7. Kế hoạch verification

| Level | Scenario | Method | Evidence kỳ vọng |
| --- | --- | --- | --- |
| Unit | Preset và seeded selection | Node test | deterministic, chỉ giá trị hợp lệ |
| Runtime | Pixel thay đổi trong `0,5–1s` | canvas sampling | khác biệt rõ, không static |
| Lifecycle | visible/offscreen/hidden/reduced | E2E | start/stop đúng, không leak |
| Visual | 6–8 preset dịu | owner preview | không tranh ảnh sản phẩm |

## 8. Delivery, migration và rollback

Thin slice là một canvas Flow trên một frame với lifecycle đầy đủ. Sau đó reuse
cho các frame còn lại. Rollback về lớp gradient CSS hiện tại nếu renderer vượt
performance budget hoặc gây lỗi lifecycle.

## 9. Reference và history

- [Motion design system](../design/motion.md)
- [FeralUI Gradient Builder](https://feralui.dev/gradients) chỉ là evidence hành vi,
  không phải nguồn code hoặc media.

| Date | Change | Reason |
| --- | --- | --- |
| 2026-09-20 | Initial draft | Owner chọn 6–8 preset dịu và renderer bằng code |
| 2026-09-20 | Owner accepted | Owner duyệt toàn bộ năm module spec |
| 2026-09-20 | Implemented, owner visual open | Tám preset Canvas2D, visible-only, reduced-motion và remount/resize lifecycle đạt |
| 2026-09-20 | Correction R2 accepted | Palette vẫn ngẫu nhiên theo frame; Scale/Distortion/Swirl/Speed chuyển thành một cấu hình FIELD dùng chung và tăng biên độ float X/Y |
| 2026-09-21 | Correction R3 accepted | Bỏ dải năng lực Advertising; CTA trở thành một composition vừa vùng viewport dưới header, skeleton chỉ chiếm dải trên và footer bắt đầu ở flow kế tiếp |

## 10. Correction R2 — FIELD chung và float rõ hơn

- Tám preset chỉ sở hữu palette; không được mang Scale, Distortion, Swirl hoặc
  Speed riêng. Mọi skeleton trong cùng page load dùng đúng một cấu hình FIELD
  source-controlled. Giá trị khởi điểm được phép hiệu chỉnh trong implementation,
  nhưng một frame không được tự lệch cấu hình so với frame khác.
- Renderer phải tạo chuyển động Flow có biến dạng và xoáy thấy được trong
  `0,5–1 giây`, không chỉ dịch ảnh nền tuyến tính. Không sao chép bundle Feral.
- Tăng quãng trôi X/Y của toàn frame so với baseline `3px`, vẫn giữ tốc độ chậm,
  không làm card chạm/đè card lân cận hoặc gây layout shift. Hover/focus được
  phép tăng nhẹ biên độ nhưng không thay đổi geometry của grid.
- Reduced motion hiển thị frame tĩnh; offscreen và tab ẩn vẫn dừng RAF.

Acceptance R2: unit test chứng minh mọi preset dùng cùng FIELD; browser sampling
chứng minh pixel field đổi rõ; computed transform chứng minh float lớn hơn
baseline nhưng frame không overlap ở desktop/mobile VI/EN.

## 11. Correction R3 — CTA một viewport và tỷ lệ 38,2/61,8

R3 thay nhịp continuation cũ sau khi owner bỏ toàn bộ dải “Năng lực công trình
quảng cáo” trên Advertising. Khi user cuộn tới CTA, toàn bộ CTA phải vừa vùng
nhìn còn lại bên dưới header đã thu gọn; footer bắt đầu ngay sau composition và
không cần xuất hiện trong cùng viewport.

- CTA dùng chiều cao `100svh` trừ chiều cao thực của header collapsed. Không tạo
  `min-height` lớn hơn viewport và không dùng JS để snap hoặc cưỡng bức scroll.
- Dải skeleton tiếp nối grid chỉ được đi vào khoảng `38,2%` phía trên CTA. Phần
  chữ và negative space sở hữu khoảng `61,8%` còn lại; copy nằm trong vùng này,
  không bị skeleton che thành nền toàn màn hình.
- Desktop/tablet giữ tối đa ba lớp frame khi geometry cần, nhưng cắt tại đáy dải
  skeleton. Màn hình hẹp hoặc thấp được giảm số/lớp và dùng dải tối đa `28%` để
  giữ headline, CTA link và vùng bấm nguyên kích thước.
- Footer giữ component và nội dung chung hiện hành; không đưa footer vào CTA và
  không thêm card giả vào semantics/grid sản phẩm.
- Reduced motion, palette, FIELD, random-per-load và visible-only lifecycle của
  R2 giữ nguyên.

Acceptance R3: browser matrix VI/EN tại desktop, mobile và mobile thấp chứng
minh CTA top nằm dưới header, CTA bottom không vượt viewport khi canh section,
copy không clip/overlap, skeleton không vượt tỷ lệ đã khóa, footer bắt đầu sau
CTA và không có overflow ngang.

## 12. Correction R4 accepted — WebGL và 12 preset Feral Flow

Owner duyệt R4 ngày `2026-09-21`. R4 thay R2 về renderer, preset, FIELD chung
và random lifecycle; giữ reduced motion, pause offscreen/tab ẩn và composition
CTA của R3 ở phần không bị D20 thay.

### Renderer và fidelity

- Viết lại clean-room bằng WebGL từ hành vi và công thức đã đo trên
  [FeralUI Gradient Builder](https://feralui.dev/gradients). Không chép bundle
  minified, không gọi code/runtime Feral và không gắn nhãn implementation này
  là mã MIT của Feral.
- Renderer giữ cùng không gian live `240×160`, linear upscale, bốn anchor,
  hai pass distortion, swirl, inverse-distance RGB blend, noise overlay và
  soften. Mục tiêu là control parity đầy đủ và motion/composition parity cảm
  nhận `95–99%`; không cam kết byte-for-byte pixel parity.
- Công thức baseline: phase bắt đầu `20,75`; mỗi frame tăng
  `(speed/100) × 1,2 × min(0,05, deltaSeconds)`; scale factor là
  `0,4 + 1,2 × scale/100`; swirl xoay quanh tâm tối đa
  `-3 × swirl/100 × radius`. Live blend dùng trọng số
  `balanceWeight / (distance^4 + 0,0001)` trên sRGB.
- Ring mặc định lấy từ anchor ở phase baseline. Sau khi kéo, ring đứng yên còn
  field tiếp tục drift nhẹ quanh neo. Balance mặc định là `25/50/75`.
- Nguồn phép đo, bundle URL/hash, exact formula, pins/bands và mức chắc chắn của
  từng giá trị nằm tại
  [evidence Feral Flow](../verification/feral-flow-measurement-2026-09-21.md).
  `95–99%` là perceptual target cần screenshot oracle và owner preview, không là
  kết quả đã đo hoặc claim pixel parity.
- WebGL context loss hoặc platform không hỗ trợ WebGL phải trả frame tĩnh dùng
  được; không để skeleton trắng, lỗi console lặp hoặc chặn phần còn lại của page.

### Preset source-controlled

Mỗi preset source config có schema duy nhất:
`id`, `colors[4]`, `anchors[4]{x,y}`, `bands[3]`,
`field{scale,distortion,swirl,speed}` và `finish{soften,noise}`. Tọa độ anchor
chuẩn hóa `0..1`; band chuẩn hóa, tăng nghiêm ngặt trong `0..1`. Parser từ chối
thiếu/thừa phần tử, giá trị ngoài range, band không tăng hoặc màu không hợp lệ.
JSON export của dev UI dùng trực tiếp schema này và phải được cùng parser nạp
lại trước khi chuyển thành source config.

Feral không lưu pins/bands riêng theo preset. Cấu hình ban đầu serialize explicit
anchor group `P46`, `P48`, `P50` hoặc `P52` từ bảng pins exact trong evidence;
bands là `B25-50-75`. Owner có thể tune từng preset bằng dev UI rồi export.
`Soften` mặc định `0` cho cả 12 preset.

| Preset | Palette | Scale / Distortion / Swirl / Speed | Soften / Noise | Anchors / bands |
| --- | --- | --- | --- | --- |
| Iridescent cloud | `EAF4FC`, `1E50A2`, `F09199`, `895B8A` | `50 / 60 / 10 / 30` | `0 / 6` | `P50 / B25-50-75` |
| Opal | `F6F9FF`, `9BE0E8`, `C4B5F7`, `F8B8D9` | `52 / 46 / 8 / 24` | `0 / 5` | `P52 / B25-50-75` |
| Lagoon | `EAFBF7`, `5CE3E6`, `0F9CC2`, `274A78` | `52 / 44 / 6 / 26` | `0 / 5` | `P52 / B25-50-75` |
| Emerald | `F0FBEF`, `8FE3B0`, `22C79A`, `0B5F51` | `50 / 44 / 6 / 26` | `0 / 5` | `P50 / B25-50-75` |
| Solar flare | `FFF6DE`, `FFC24B`, `F4664D`, `8A2E5E` | `50 / 52 / 10 / 28` | `0 / 6` | `P50 / B25-50-75` |
| Orchid | `FBEFFB`, `E794C9`, `9678CE`, `4A3894` | `48 / 46 / 9 / 26` | `0 / 5` | `P48 / B25-50-75` |
| Peach glow | `FFF3EC`, `FFC9A3`, `F08A8C`, `B65E8C` | `50 / 48 / 8 / 28` | `0 / 5` | `P50 / B25-50-75` |
| Electric tide | `DFFBFF`, `6FD8F2`, `4C5BE0`, `2A2450` | `50 / 60 / 14 / 32` | `0 / 6` | `P50 / B25-50-75` |
| Sunset | `FFE9C4`, `FFAE3F`, `F0574D`, `5D2A66` | `46 / 70 / 16 / 34` | `0 / 6` | `P46 / B25-50-75` |
| Mint ice | `F2FDF9`, `A8F0DC`, `52CBB0`, `147A5F` | `50 / 55 / 10 / 30` | `0 / 6` | `P50 / B25-50-75` |
| Midnight bloom | `12142E`, `4C3894`, `B387E8`, `F6C6E2` | `46 / 78 / 22 / 36` | `0 / 8` | `P46 / B25-50-75` |
| Rose gold | `FFF4E8`, `FBC9AC`, `E79BA7`, `8E5A74` | `52 / 50 / 8 / 26` | `0 / 6` | `P52 / B25-50-75` |

### Random và card motion

- Mỗi skeleton tự chọn ngẫu nhiên một preset trong 12 preset khi state page ổn
  định. Reload, đổi filter, mở/đóng detail và native Back/Forward random lại.
  Resize giữ nguyên preset. Không random giữa frame đầu/cuối của cùng transition.
- Skeleton không có viền. Reveal khi viewport chạm tới và hover/focus reuse
  media-card component của grid; dev UI không được tạo motion card riêng.
- Chỉ frame visible, tab hiện và motion bình thường mới advance time. Reduced
  motion, offscreen và tab ẩn giữ frame tĩnh; unmount/remount không leak WebGL
  context, RAF, observer hoặc listener.

### Quality bar và verification

- Unit kiểm đủ 12 preset, range, formula constants, seeded selection và rule
  random/resize. Shader test kiểm output hữu hạn và không alpha rỗng.
- Browser capture cùng preset tại các mốc `0`, `0,6`, `1,2s` để so composition,
  drift và biến dạng với reference; owner duyệt visual, không dùng pixel exact.
- Tại `1569×912` với toàn bộ skeleton CTA visible, renderer giữ tối thiểu
  `30fps`, không tạo long task trên `50ms` do loop trong probe `5s`. Ngoài
  viewport, tab ẩn và reduced motion không tiếp tục tăng phase.
- Test context loss/fallback, resize, filter/detail/history, VI/EN và mount/unmount
  lặp. Static gate chứng minh không thêm dependency hoặc remote runtime.

Dev UI tạm thời thuộc spec riêng
[advertising-skeleton-flow-devtools.md](advertising-skeleton-flow-devtools.md)
và phải qua removal gate trước ship.

## 13. Correction R5 accepted — batch đa dạng và viewport replay — 2026-09-21

Owner duyệt R5 ngày `2026-09-21`. Một batch là toàn bộ skeleton frame được tạo
cho một Advertising state ổn định; hiện có tối đa `4 cột × 3 depth = 12` frame.

- Mỗi batch shuffle đủ 12 preset và cấp không hoàn lại. Vì vậy hai frame trong
  cùng batch không được dùng cùng preset source. Resize giữ nguyên assignment;
  reload, đổi filter, mở/đóng detail và native Back/Forward tạo batch mới.
- Mọi frame luôn nhận một hoán vị bốn anchor, không phụ thuộc palette có trùng
  màu hay không. Mười hai frame lấy các permutation không lặp từ 24 khả năng.
- Mỗi frame có phase xuất phát khác nhau. Chiều Flow dương/âm được phân bổ gần
  cân bằng rồi shuffle để một batch không tình cờ chuyển động cùng hướng.
- Viewport-entry phải reuse cùng contract của card ảnh grid: rời hoàn toàn thì
  arm lại; mỗi lần đi vào viewport chạy opacity và transform `600ms` với easing
  hiện hành cùng stagger theo vị trí. WebGL loop chỉ bắt đầu sau khi entry motion
  khởi động. Reduced motion hiện ngay, không replay và giữ Flow tĩnh.

Acceptance R5: unit chứng minh preset, permutation và phase không lặp trong batch
12 frame; direction chênh tối đa một; resize giữ nguyên và các lifecycle trigger
random lại. Browser test cuộn ra/vào hai lần phải thấy cùng entry endpoint/timing
như card grid, không đổi geometry, không leak observer/RAF và reduced motion tĩnh.

## 14. Correction R6 accepted — opacity-only entry, global boundary fade

R6 supersede phần transform entry và hover/focus của R4–R5. Skeleton vẫn giữ
WebGL Flow, batch assignment và viewport lifecycle đã chốt.

- Viewport-entry phải dùng chính contract media reveal của card ảnh grid: frame
  giữ nguyên geometry và `transform`; chỉ opacity chuyển từ `0` tới opacity đích
  trong `600ms ease-out`. Không dùng `translateY`, scale hoặc motion card riêng.
- Stagger được phép đổi thời điểm bắt đầu nhưng không được đổi duration/easing.
  WebGL loop chỉ chạy sau khi opacity reveal đã arm; rời hoàn toàn viewport thì
  arm lại giống card thật. Reduced motion hiện endpoint tức thì và giữ Flow tĩnh.
- Skeleton không có hover hoặc focus motion. Pointer đi qua không đổi transform,
  tốc độ, biên độ, màu, filter, opacity hoặc geometry; frame vẫn không vào focus
  order và không nhận pointer events.
- Bỏ mask/fade riêng trên từng frame. Cả batch dùng một mask trong global space,
  phủ qua container skeleton và chỉ chuyển dần về trắng tại ranh giới cuối của
  batch với vùng thở CTA. Hai frame có cùng tọa độ dọc phải có cùng alpha mask,
  không phụ thuộc height hoặc local coordinate của từng card.
- Mask global không che copy CTA, không tạo đường seam theo cột và không làm
  thay đổi kích thước, hit testing hoặc WebGL assignment của frame.

Acceptance R6: capture hai frame khác cột tại cùng `y` có alpha fade bằng nhau;
fade chỉ xuất hiện trong band ranh giới batch-to-white và không lặp bên trong
từng frame. Computed style và frame sampling chứng minh entry opacity-only khớp
card thật, hover không đổi pixel/transform và reduced motion không animate.

## 15. Correction R7 accepted — persistent entry, diverse geometry và CTA global field

**Module id:** `skeleton-cta-field`. **Phụ thuộc:** `shared-footer-boundary`.
**Status:** accepted; owner duyệt R7 ngày `2026-09-22`. Implementation chờ duyệt
plan `AD-SEPT-2026-P6`.

### Page visibility và viewport entry

- Opacity entry chỉ chạy khi frame đi từ ngoài viewport vào viewport. Khi cửa
  sổ hoặc tab bị ẩn, WebGL Flow dừng nhưng trạng thái reveal đã đạt phải được
  giữ. Khi page visible/focus lại, renderer tiếp tục từ phase hiện có; không xóa
  `is-entry-ready`, không replay opacity và không random lại batch.
- Rời hoàn toàn viewport vẫn arm lại entrance như card ảnh thật. Resize chỉ tính
  lại geometry; preset, anchor permutation, phase/direction assignment và
  reveal state của slot còn tồn tại được giữ.
- Reduced motion luôn hiện endpoint tĩnh. Unmount, filter, mở/đóng detail và
  history remount vẫn cleanup observer, timer, RAF và WebGL context.

### Geometry đa dạng

- Skeleton luôn rộng đúng một grid column; không có span 2. Chiều cao dùng ba
  band tỷ lệ ngang, vuông và đứng lấy từ geometry/media ratio hợp lệ của card
  thật trong batch hiện hành.
- Cùng một cột không được có hai depth liên tiếp cùng band; hai frame kề nhau
  cùng hàng ưu tiên khác band. Assignment deterministic với cùng geometry và
  giữ nguyên qua resize; không đổi card count hoặc packing ảnh thật.
- Frame bị cap tại footer boundary phải giữ chiều cao dương hữu ích; không tạo
  lát mỏng dưới `0.25 × cardWidth`. Slot không đủ chỗ được bỏ thay vì ép ratio.

### Global fade, blur và CTA spacing

- Skeleton field có thể đi xuyên toàn section CTA nhưng dừng trước khoảng thở
  shared của footer. Footer không thuộc canvas, mask hoặc blur surface.
- Một mask alpha và một gradient blur dùng cùng global coordinate space trên
  toàn batch. Fade band tối thiểu `max(96px, 0.5 × cardWidth)` và không vượt
  `45%` khoảng từ card thật cuối tới footer boundary; không reset theo card/cột.
- Tại bbox của headline và link CTA, skeleton vẫn nhìn thấy rất mờ với alpha
  mục tiêu `0.08–0.15`; không tạo hình chữ nhật trắng hoặc seam. Blur tăng đơn
  điệu vào vùng CTA, không blur chính text, footer hoặc hit target.
- Khoảng dọc giữa bbox headline “Dấu ấn…” và link “Trao đổi ý tưởng” dùng đúng
  một responsive inter-card gap: `15px` đến `960px`, `25px` tại
  `961–1200px`, `35px` trên `1200px`. Copy, alignment và typography giữ nguyên.

### Acceptance, commands và boundaries

- Browser test: đưa skeleton vào viewport một lần, blur tab/focus lại ít nhất
  hai chu kỳ và chứng minh opacity/entry counter không đổi trong khi Flow phase
  pause/resume. Sau khi cuộn hẳn ra/vào, entry chạy lại đúng một lần.
- Geometry test phủ 2–4 cột, sparse/full pool, VI/EN, filter, resize và chứng
  minh đủ ba ratio band khi không gian cho phép, không lặp kề, không overlap,
  overflow hoặc frame quá mỏng.
- Global-space capture đo cùng alpha/blur tại cùng `y` giữa các cột, CTA alpha
  trong band mục tiêu, footer sạch và gap headline→link đúng tolerance `1px`.
- Chạy `pnpm prepare:site`, focused skeleton/unit/browser tests,
  `node tests/site/footer-consistency.e2e.mjs`, `pnpm qa:static` và Impeccable
  detector. Owner duyệt local preview; focused PASS không là full-site PASS.
- Không đổi 12 preset, FIELD/FINISH, CTA copy, navbar, image inventory hoặc dev
  Flow UI. P3-T08 vẫn là removal gate riêng trước ship.

## Correction R8 accepted — glass blur rộng và white endpoint

**Status:** accepted; owner xác nhận intent và cho phép Codex tự duyệt spec,
plan, task ngày `2026-09-22`. Correction này thay riêng bullet global blur/fade
của R7; preset, geometry, entry lifecycle và CTA spacing giữ nguyên.

- Dùng một global glass surface trong coordinate space của toàn skeleton batch;
  không blur từng frame. Mốc tham chiếu là điểm bắt đầu vùng headline CTA theo
  composition token hiện hành. Blur nhắm tới `ctaHeadlineTop - cardWidth` và
  clamp tại đáy grid ảnh thật để không phủ mờ card thật; `cardWidth` là chiều
  cao tham chiếu của card vuông một cột.
- Glass dùng `backdrop-filter` với blur tối thiểu `24px`, có WebKit prefix và
  gradient mask tăng dần; text CTA, hit target và footer không nằm trong lớp
  backdrop-filter.
- Global alpha fade nhắm tới `ctaHeadlineTop - 0.5 × cardWidth`. Khi target này
  bị clamp cùng mốc blur ở viewport thấp, fade phải lùi xuống tối thiểu `1px`
  và tối đa `48px` theo phần khoảng còn lại để blur luôn xuất hiện trước fade.
  Mask giảm đơn điệu và đạt alpha `0` tại `skeletonBoundaryBottom`.
- Từ `skeletonBoundaryBottom` trở xuống nền phải là `#fff` tuyệt đối: không còn
  pixel skeleton, ghost, fallout, seam hoặc lớp gradient bán trong suốt. White
  endpoint giữ qua resize, filter, locale và reduced motion.
- Browser acceptance đọc computed custom properties, `backdrop-filter`, global
  mask và chụp pixel band tại các cột; endpoint sai khác trắng tối đa `1/255`
  mỗi kênh khi không có text/element foreground.

## Correction R9 accepted — shared glass surface với photo overflow

**Status:** accepted; owner xác nhận ngày `2026-09-22`. Correction này giữ toàn
bộ global coordinate space, fade endpoint, preset, FIELD/FINISH và entry motion
của R8; chỉ chuẩn hóa visual surface để tái dùng.

- Skeleton boundary và primary photo overflow dùng một token contract:
  `blur(28px) saturate(1.08) brightness(1.04)` cùng tint trắng alpha `0.12`.
- Glass của skeleton trải ngang tới hai mép viewport; frame skeleton, ảnh thật,
  CTA và outer grid giữ nguyên geometry. Không tạo horizontal overflow. Photo
  overflow vẫn chỉ phủ hero frame theo contract riêng.
- Skeleton tiếp tục dùng mask gradient toàn batch và white endpoint của R8.
  Primary photo dùng glass đồng nhất trên toàn vùng dư, không dùng mask tăng dần
  hoặc thay cường độ blur theo khoảng cách từ mép ảnh.
- Source image và WebGL canvas không tự sở hữu CSS blur của glass. Shared
  pseudo-element là lớp duy nhất sở hữu `backdrop-filter`, có WebKit prefix,
  không nhận pointer event và không che CTA/control.
- Acceptance khóa computed token ở cả hai consumer, xác nhận skeleton vẫn global
  và photo source có `filter: none`. Không mở rộng sang dialog backdrop, WebGL
  `soften` hoặc blur không thuộc hai consumer này.

## Correction R10 accepted — mobile tail, Scale 100 và unified glass

**Module id:** `skeleton-cta-field`. **Plan:** `AD-SEPT-2026-P7`.
**Status:** accepted; owner xác nhận ngày `2026-09-22`. R10 supersede contract
Scale `46–52` và CTA tự chiếm một viewport của các revision trước.

### Preset và chất lượng Flow

- Giữ đủ 12 palette Feral và toàn bộ `Distortion`, `Swirl`, `Speed`, `Soften`,
  `Noise`; riêng `Field.scale` của cả 12 preset bằng `100`.
- Tạo anchor P100 từ công thức pin Feral đã lưu trong evidence, freeze cùng
  preset. Batch vẫn shuffle đủ 12 preset, luôn hoán vị bốn anchor và cho phép
  đảo chiều; số frame đang render chỉ lấy prefix không trùng của pool này.
- Giữ renderer `240×160`, shader, noise, speed, entry opacity `600ms` và màu.
  Không hạ resolution, frame rate, noise hoặc chất lượng motion để đạt budget.
- Resize giữ assignment của slot còn tồn tại. Reload, đổi filter, vào/ra photo
  và native history tạo batch mới theo lifecycle hiện hành.

### Solver tail và mobile budget

- Solver nhận `visualViewport.height`, chiều cao footer thật, shared footer gap,
  CTA minimum và card minimum. Tại cuối trang, toàn bộ skeleton còn lại, CTA và
  footer phải nhìn trọn trong một viewport; không có section tail thứ hai.
- Tại Galaxy A54 profile `360×800`, chỉ tạo `1–2` canvas sống. Solver được phép
  giảm còn một card, tăng chiều cao card bằng ba ratio band đã có và để card cuối
  hấp thụ phần dư. Không tạo sliver thấp hơn `0,25 × cardWidth`.
- CTA là điểm nhìn chính; skeleton chỉ làm atmospheric support. Footer vẫn là
  shared component, đầy đủ copy/hit target và nằm ngoài canvas, mask, filter.
- Desktop dùng cùng budget solver, được phép nhiều frame hơn khi vẫn giữ toàn bộ
  tail trong viewport và đạt performance gate. Không hardcode số depth theo cột.

### Một Glassmorphism surface trong global space

- Opacity fade và blur không còn là hai component độc lập. Một full-bleed
  Glassmorphism surface sở hữu cả translucent white background và
  `backdrop-filter`; surface phủ từ mép trái tới mép phải viewport nhưng không
  đổi width/hit testing của grid.
- Trình tự dọc bắt buộc: nội dung clear; blur/tint tăng trước; lớp trắng tăng sau;
  endpoint tại đáy lưới là `#fff` hoàn toàn. Chuyển tiếp phải mịn, không seam theo
  cột, ghost, fallout hoặc skeleton mờ bên dưới endpoint.
- CTA và footer nằm trên/ngoài surface nên luôn rõ, không bị blur. Skeleton không
  có hover/focus motion và không dùng local mask.

### Performance, lifecycle và acceptance

- Profile tự động: Chrome Android/A54, `360×800`, touch, ba lượt probe `5s` sau
  warm-up; median tối thiểu `30fps`, không long task trên `50ms`, tối đa hai
  WebGL context đang chạy. CPU throttle nếu dùng phải ghi rõ trong evidence.
- Hidden tab, photo detail và reduced motion có `0` renderer đang chạy. Focus lại
  tab không replay entry đã hoàn tất. Hai mươi remount không để detached canvas,
  observer, RAF hoặc timer.
- Unit khóa 12 Field/Finish, Scale 100, anchor P100 frozen và batch uniqueness.
  Browser khóa N1/N2 resize persistence, one-viewport tail, full-bleed glass,
  blur-before-white và endpoint `rgb(255,255,255)` sai số tối đa một.
- `?skeleton-dev=1` vẫn là dev-only surface và phải bị xóa vật lý trước ship theo
  removal gate P3-T08; correction này không biến nó thành production UI.

## Correction P7.1 — organic continuation và paint overflow

**Module id:** `skeleton-cta-field`. **Plan:** `AD-SEPT-2026-P7.1`.
**Status:** accepted; thay quy tắc frame cùng hàng và giới hạn số DOM card ở R11.

- Skeleton đặt tiếp trên frontier của từng cột masonry card thật, theo shortest
  column và source-order tie-break; không khởi đầu bằng một hàng ngang.
- Số DOM card được chọn đủ phủ vùng glass theo boundary thật. Mobile giữ tối đa
  hai WebGL context sống bằng lifecycle/virtualization; không giới hạn toàn bộ
  DOM card còn hai hoặc giảm chất lượng preset và motion.
- Grid logical bottom kết thúc sớm để final viewport chứa trọn CTA và footer.
  Card có thể paint vượt boundary tối đa một gap, nhưng không đổi document height
  hoặc hit testing. Global Glassmorphism R10 giữ token, full bleed, trình tự blur
  trước white và endpoint `#fff`.
- Verification và ngoại lệ thiết bị thật được ghi trong
  [P7.1 correction](advertising-september-2026-p7-1-correction.md); dev UI
  `?skeleton-dev=1` vẫn chờ removal gate P3-T08 trước ship.

## Chú thích thuật ngữ

- **Flow field**: trường màu bị biến dạng liên tục theo thời gian.
- **Seeded random**: random có seed để kiểm thử lặp lại được.
- **RAF**: `requestAnimationFrame`, nhịp vẽ theo frame trình duyệt.
- **Negative space**: vùng trống có chủ đích giúp typography và hành động chính
  giữ trọng tâm thị giác.
- **Shader**: chương trình nhỏ chạy trên GPU để tính màu mỗi pixel.
- **Global space**: hệ tọa độ chung của container, không reset theo từng frame.
