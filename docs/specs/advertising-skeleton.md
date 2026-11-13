---
title: Skeleton cuối masonry Advertising
status: live
source:
  - src/site/masonry/skeleton-flow.mjs
  - src/site/masonry/skeleton-flow-worker.mjs
  - scripts/site/image-palette.mjs
tests:
  - tests/site/advertising-skeleton-flow.test.mjs
  - tests/site/advertising-skeleton-lifecycle.e2e.mjs
  - tests/site/advertising-skeleton-slow-network.e2e.mjs
  - tests/site/advertising-continuation.e2e.mjs
  - tests/site/media-colors.test.mjs
  - tests/site/advertising-primary-flow-colors.e2e.mjs
notion: https://app.notion.com/p/3e6332849a0e81508d66ca0b3cfebf18
updated: 2026-11-12
---

# Skeleton cuối masonry Advertising

## Mục đích

Batch skeleton nối tiếp [masonry](advertising-masonry.md) từ đáy card thật tới footer, mặt là Flow WebGL với 12
preset, làm nền cho CTA cuối trang. Spec sở hữu hình học batch, preset, assignment, vòng đời và WebGL context. Card
PC chờ ảnh bằng khung Flow trong 4 màu của ảnh, điện thoại bằng lớp màu ([tải theo nấc R9](progressive-loading.md#r9-card-chờ-ảnh-bằng-flow-hoặc-lớp-màu)). Vị trí chữ CTA ở
[CTA giữa viewport](advertising-cta-center-parallax.md), kính ở [Kính](glass-surface.md).

## Hành vi

### R1. Batch nối tiếp masonry

Khung `.masonry-grid__cta-frame[data-masonry-cta-frame]` nằm trong `[data-masonry-cta-skeleton]`
(`aria-hidden`), không focus, không hover, không viền. Khung bắt đầu một khoảng giữa dưới card thật của cột (dưới card
hai cột thì ở cả hai cột, [masonry R5](advertising-masonry.md#r5-hình-học-masonry)). Khung theo cùng luật span với card
thật (`canSpanTwoColumns`, `spanSlots` ở `masonry/layout.mjs`): band có w/h từ tỷ lệ vàng trở lên trải hai cột kề nhau
khi lưới từ 3 cột và lỗ không quá nửa cột, không có chỗ thì chọn band khác; không để lỗ
([masonry R5](advertising-masonry.md#r5-hình-học-masonry)): hai đáy chênh nhau thì khung một cột cuối của cột ngắn hơn
(trong batch) kéo dài đúng phần chênh, đáy là card thật hay khung hai cột thì khung hai cột chỉ đặt khi hai đáy bằng nhau.
Masonry không còn lỗ, nên batch không có khung lấp lỗ. Hai trang lưới chính (Sản phẩm quảng cáo và Công trình) đặt `data-skeleton-ratios="landscape:0.72 square:1 portrait:1.32 wide:0.5"` nên có khung ngang `wide` trải hai cột từ lưới 3 cột; batch cuối related ở detail (`spanSkeleton: false`) bỏ mọi band trải hai cột. Band mặc định (w/h tối đa 1.39) đều giữ một cột. Trang đổi band và số khung bằng attribute trên batch: `data-skeleton-ratios="landscape:0.72 square:1 wide:0.5"`
(id:cao/rộng), `data-skeleton-count` (tối đa N khung, cột có thể dừng trước đáy batch; mặc định lấp tới đáy), tỷ lệ dưới `0.1` bị bỏ. Card tạm chờ dựng phủ đúng khung card thật kể cả card hai cột (card cao đúng bằng media, [media-card R2](media-card.md#r2-canvas-và-hàng-pill-trong-media)). Batch kết thúc ở đáy CTA, ngay trên footer; chiều cao đuôi theo [CTA R2](advertising-cta-center-parallax.md#r2-batch-skeleton-dưới-cta-co-giãn).
Khung đặt vào cột có đáy thấp nhất trước, cao bằng bề rộng khung nhân một band; mặc định ba band ngang `0.72`, vuông
`1`, đứng `1.32`; khung không chừa chỗ tên vì tên nằm trong media ở mọi lưới, kể cả trang Công trình. Một cột không có hai khung liền cùng band; cùng độ sâu ưu tiên band khác. Runtime thử tối đa 8 phương án theo
seed lượt duyệt, chọn phương án có ít nhất 2 band trong 4 khung đầu và không quá 3 khung liền cùng band trong 12 khung
đầu. Khung cuối mỗi cột kéo tới đáy batch (khung hai cột chỉ kéo khi là khung cuối của cả hai cột); phần còn lại ngắn
hơn `0.25` bề rộng card thì gộp vào khung phía trên. Slot
là thứ tự khung nối tiếp masonry (`0`, `1`, ...), không phải ô cột và độ sâu: đổi số cột thì khung thứ k vẫn là item
k của cùng lưới, nên resize trượt cả card và khung như một masonry (owner 10/10). Band gắn với slot, dựng lại giữ band
cũ, trừ khi cột mới đặt slot ngay dưới khung cùng band. Batch có ở masonry và ở cuối related của detail ([CTA R9](advertising-cta-center-parallax.md#r9-cta-cuối-related-ở-detail)).

```gherkin
Given masonry kết thúc ở bất kỳ độ cao nào, 2 tới 4 cột
When runtime dựng batch
Then khung đầu mỗi cột cách card thật một khoảng giữa, đáy khung cuối mỗi cột trùng đáy batch
And không khung nào để lỗ phía trên nó, kể cả khung hai cột; batch của related không có khung hai cột
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
Given module masonry/skeleton-flow.mjs đã nạp
When đọc SKELETON_FLOW_PRESETS
Then có đúng 12 id khác nhau, field scale 100, mọi preset bị freeze
```

### R3. Assignment ngẫu nhiên và giữ màu

Mọi khung Flow (batch, skeleton chờ ảnh primary và card PC) bốc assignment lúc khung vào vùng nhìn thấy lần đầu trong
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

Flow chờ ảnh của primary và card PC lấy màu từ chính ảnh đang chờ: bốn màu của preset bốc được thay bằng bốn màu
nổi bật của ảnh đó, sắp từ sáng tới tối như preset; field, anchor, chiều chảy, pha, tốc độ vẫn bốc như trên. Lúc build,
`build-image-variants.mjs` trích bốn màu bằng k-means (k = 4, khởi đầu k-means++ seed cố định) trên bản thu 64px và ghi vào `MEDIA_COLORS` cùng màu chủ
đạo của card ([loading-glass R1](loading-glass-and-page-entry.md#r1-card-đang-tải-chờ-dưới-flow)); `--check` báo ảnh thiếu.
Media không có bốn màu (video không poster, ảnh mới chưa build) dùng màu preset. Batch dưới CTA giữ 12 preset.
Contract dữ liệu: `MEDIA_COLORS[tên file WebP không đuôi] = [màu chủ đạo card, 4 màu Flow]`, chỉ build ghi.
Màu chủ đạo là tâm bin đông nhất của histogram RGB 16x16x16 trên điểm ảnh **cỡ gốc** của WebP (không phải bản 64px; `sharp` `stats()` bỏ qua `resize`); bốn màu Flow lấy từ bản thu 64px (`resize(64)`).
Hai bước nằm trong `image-palette.mjs`, không phụ thuộc `sharp` hay API Node: `dominant(pixels, channels)` khớp `stats().dominant` từng bin và từng ca hòa
(test so với `sharp`), `palette(pixels)` cho bốn màu, `mediaColors({ full, thumb, channels })` gộp thành năm màu hex. Build gọi `mediaColors` với điểm ảnh từ `sharp`;
CMS gọi cùng hàm trên WebP đã lưu (không dùng PNG hay JXL), điểm ảnh từ `canvas` (`channels: 4`). Số của CMS chỉ khớp build đến mức bản 64px do `canvas` thu giống `sharp` (Lanczos3);
màu chủ đạo phải lấy từ điểm ảnh cỡ gốc mới khớp. Thêm ảnh: chép
WebP vào thư mục Advertising rồi chạy build. Thay ảnh cùng tên: xóa variant cũ của ảnh đó (`-240` tới `-2048`, `.avif`,
`.jxl`) rồi chạy build; build tính lại màu mỗi khi dựng lại variant của ảnh.

```gherkin
Given trang detail mở media có bốn màu trong MEDIA_COLORS
When primary chờ ảnh và Flow hiện
Then bốn màu uniform của Flow là bốn màu của chính media đó, sắp từ sáng tới tối
And khung batch dưới CTA vẫn mang màu của một trong 12 preset
```

### R4. Vào viewport và vòng lặp

Khung batch giao vùng nhìn thấy (visual viewport) hiện bằng fade opacity `0.6s` `ease-out` (`--dur-hover`), không Kính (owner 2026-11-12, bỏ
reveal Kính cùng lúc với ảnh card và primary, [Kính R6](glass-surface.md#r6-không-hiện-hay-tan)). Khung chờ ảnh của card PC và primary cũng hiện
bằng fade `0.6s`, vào lúc đang cuộn (`SKELETON_SCROLL_ENTRY_MS`) thì hiện ngay; ảnh lộ qua kính mờ ([skeleton chờ ảnh R2](loading-glass-and-page-entry.md#r2-lộ-ảnh-khi-tải-xong)).
Flow chạy ngay từ đầu lúc hiện, kể cả khi đang cuộn hay giữ thanh cuộn. Fade chỉ chạy lần đầu khung vào
vùng nhìn thấy; rời hẳn rồi vào lại thì khung hiện ngay như card ảnh đã tải (owner thấy hiện lại dưới Kính cung trông như các bậc nhòe mất, PC, 07/10). Flow chỉ chạy khi khung đang thấy, tab hiện, body không có `menu-open` hay
`motion-paused`, không reduced motion. Tab ẩn hoặc `motion-paused`: dừng, giữ trạng thái đã hiện; hiện lại chạy tiếp từ pha cũ. `pagehide` có `persisted`: dừng
renderer, `pageshow` có `persisted` chạy tiếp; `pagehide` không `persisted`: hủy mọi context của document.

```gherkin
Given khung đã hiện xong và Flow đang chạy
When cuộn khung ra hẳn vùng nhìn thấy rồi vào lại
Then khung hiện ngay, không trống, fade không chạy lại

Given khung đã hiện xong và Flow đang chạy
When ẩn tab rồi hiện lại hai lần
Then fade không chạy lại, Flow tiếp tục từ pha lúc dừng
```

### R5. WebGL context

Mỗi vùng vẽ mọi khung của nó bằng một canvas WebGL chung (một context), con cuối của vùng: batch trong `.masonry-grid__cta-skeleton`,
khung chờ ảnh của card PC trong `[data-project-grid]` và `[data-detail-related-grid]`, khung chờ ảnh của primary PC trong `.detail-view__hero-frame`
(`sharedFlowContainer`, `sharedSkeletonFlows` theo vùng, tối đa 4 context). Batch giữ vùng riêng vì trong detail batch nằm ngoài lưới related; vùng card giữ canvas là con cuối dù masonry gắn card sau nó
(runtime gắn lại canvas mỗi lần mount khung). 7-8 context riêng làm GPU phone quá tải, một context ở nửa độ phân giải đạt gate.
Trên PC, lớp của lưới chính được tạo ngay lúc mount (kèm một lần vẽ khởi động để GPU biên dịch shader), không đợi card đầu tiên chờ ảnh: tạo lúc đó làm rớt khung trong 3 giây đầu (PC owner 2026-11-12, 1% low 42 so với 83 của main). Nơi có `KHR_parallel_shader_compile`, lớp chỉ đọc `LINK_STATUS` khi driver báo link xong, ở một frame sau; tới lúc đó canvas trong suốt và khung giữ ảnh tĩnh (đọc ngay sau `linkProgram` chặn luồng chính 27ms trên PC owner, lượt đo 2 của 3b.2). Khung trên canvas chung không có trần số khung: mọi khung đang thấy đều vẽ (bỏ `SKELETON_SHARED_BUDGET` 24, owner 2026-11-12); không có WebGL thì
khung card giữ frame tĩnh, không mở context riêng cho từng card. Canvas cao gấp đôi viewport, cuộn cùng
nội dung và chỉ dời khi viewport ra khỏi nó; độ phân giải bằng nửa CSS px trên mọi máy. Mỗi frame canvas xóa trong
suốt rồi vẽ từng khung đang chạy bằng viewport và scissor tại vị trí của khung, với preset, pha và chiều riêng; khung
chưa vào entry không vẽ, khung đang entry hay đang lộ ảnh vẽ với alpha bằng opacity của khung nhân opacity của mặt (R4). Canvas nằm trên khung; canvas batch nằm dưới Kính, CTA, canvas card nằm trên cả card, canvas primary trên ảnh và dưới nút ảnh ([skeleton chờ ảnh R2](loading-glass-and-page-entry.md#r2-lộ-ảnh-khi-tải-xong)).
Lộ ảnh: runtime gọi `reveal(tiny, duration, { box, cover })` của khung với bản ảnh rộng 20px (`ImageBitmap` lật dọc cho WebGL), canvas tải nó lên
texture unit 1 rồi trong `duration` vẽ khung bằng nhánh kính mờ của chính shader Flow: 45% đầu (`FROST_SHARE`) `uFrost` tăng `0 → 1` (B-spline bậc ba từ bốn mẫu bilinear,
mờ tròn không lộ ô của bản 20px, owner chọn kiểu B 2026-11-13; màn trắng `14%`, sạn mịn `4.5%` từ texture nhiễu một texel mỗi pixel canvas), phần còn lại alpha của khung giảm `1 → 0`, cả hai theo `smoothstep`.
`box` là chỗ ảnh nằm trong khung (primary `contain`), ngoài `box` bản ảnh phủ `cover` theo `cover` như nền mờ. Không thêm program hay blur, nên GPU không biên dịch gì lúc lộ.
Xong thì resolve; khung dừng giữa chừng thì xóa texture và resolve. Không có context hoặc shader chưa link thì trả `null` và runtime crossfade. Dưới canvas mỗi khung vẫn hiện frame tĩnh là một khung hình Flow của chính assignment ở pha hiện tại,
nên khi canvas chưa vẽ, dừng hay mất context thì khung không trống và lúc chuyển sang chạy không nhảy. Mất context:
xóa danh sách vẽ, hiện frame tĩnh; khôi phục thì dựng lại và chạy tiếp các khung đang chạy.

Renderer riêng và worker dưới đây từng vẽ skeleton chờ ảnh của primary; từ 3b.2 (owner 2026-11-12) primary vẽ trên canvas chung nên không khung nào
còn dùng chúng (dọn ở bước sau): trình duyệt không có worker dùng renderer riêng mỗi khung, tối đa 12 renderer;
PC dùng chung một context trong worker (đoạn dưới); ngân sách `SKELETON_CONTEXT_BUDGET` 12 chỉ tính khung có renderer riêng. Khung đang thấy
giữ renderer đã có; còn chỗ thì cấp cho khung gần đầu viewport trước (top rồi left). Khung chưa có renderer hiện frame
tĩnh của preset. Nhả renderer trước khi cấp mới nên xoay máy không vượt ngân sách. Renderer vẽ trong một module worker
chung của document qua `OffscreenCanvas`: rAF của worker không chờ main thread, nên khi vuốt nhanh main
thread bận masonry (rAF còn khoảng 12fps trên A04s) Flow vẫn chạy theo tần số màn hình. Worker tự tạo context, compile
program và noise; nhả renderer thì worker trả context (`loseContext`), main thay canvas đã transfer bằng canvas tĩnh
mới ở pha đã lưu. Chrome chỉ giữ 4 context WebGL sống trong mỗi dedicated worker (tạo context thứ 5 thì context cũ nhất bị thu hồi mà
main thread không được báo), nên trên PC worker có đúng một
context WebGL: mỗi khung vẽ một lượt vào context đó rồi chuyển hình sang canvas của khung bằng `bitmaprenderer`
(`data-masonry-flow-context="shared"`), mất context của worker thì dựng lại và chạy tiếp. Điện thoại (A04s, cùng giới hạn 4)
giữ context riêng mỗi khung nhưng xếp tối đa 4 khung mỗi worker, nên 12 khung chạy trên 3 worker; context chung trên A04s
làm fps SurfaceFlinger tụt dưới 60 và khoảng giữa hai lần vẽ p95 vượt `33ms` nên không dùng. Pha trên main tính theo thời gian chạy. Trình duyệt không có `OffscreenCanvas`, `Worker` hay tạo
worker lỗi thì về renderer main thread: ngân sách 12 context tính cả context đang dùng và đang rảnh, context giữ theo
document và dùng lại (trả lease thì xóa buffer, texture, listener, RAF đúng một lần, giữ canvas, context và program đã
compile; compile mất khoảng 60ms trên phone), lease mới bắt đầu ở pha đã lưu, context mới tạo ở task trước task dựng
renderer. Mất context: hiện frame tĩnh, khôi phục thì dựng lại và chạy tiếp nếu trước đó đang chạy. `destroy()` gọi
nhiều lần vẫn an toàn và không gọi `loseContext` trên context đã mất. Mỗi renderer dựng trong một task riêng sau frame
(R8) và không chờ cuộn dừng, nhưng chờ card masonry trượt `0.4s` xong (đổi filter, resize) để dựng renderer không
làm trễ nhịp trượt. Cuộn mượt thắng: loại máy nào trace cho thấy dựng renderer giữa lúc cuộn gây task trên 50ms thì
hoãn dựng tới khi cuộn dừng, vẫn hiện frame tĩnh. Điện thoại (pointer coarse, có touch hoặc `clientWidth <= 750`) hoãn
như vậy cho khung batch; khung chờ ảnh dựng ngay cả lúc đang vuốt. "Cuộn dừng" là sau `scrollend` cộng `120ms`; trình duyệt
không có `scrollend` thì `120ms` sau scroll event cuối. Scroll không kèm `scrollend` (layout, mở detail nhảy về đầu
trang) coi là đã dừng sau `500ms` không có scroll event.

```gherkin
Given điện thoại 838px ngang
When cuộn qua batch, đổi filter và xoay máy nhiều lần
Then batch chỉ dùng một context, tổng không lúc nào quá 12, không lỗi "too many active WebGL contexts" hay lose context hai lần
```

### R6. CTA, Kính và footer trên batch

CTA `section.detail-cta[data-masonry-grid-cta]` đặt tại `--masonry-cta-top` (đáy masonry cộng một khoảng
giữa), cao `--masonry-cta-tail-height`; chân chữ, cỡ tiêu đề, parallax theo
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
(trên 60fps), mọi khung trong viewport đều chạy. Batch đạt gate nhờ một canvas chung nửa độ phân giải (R5); điện thoại không có khung chờ ảnh (lớp màu,
[tải theo nấc R9](progressive-loading.md#r9-card-chờ-ảnh-bằng-flow-hoặc-lớp-màu)). Không hạ preset, noise hay số khung chạy để đạt gate.
Mọi renderer trong một thread dùng chung một noise texture. Ảnh tĩnh render CPU tối đa `8ms` mỗi task; khung còn lại nhận
assignment ở task sau và chưa vào entry trước đó. Đồng bộ chạy trong rAF (chung task với frame cuộn và layout
masonry) không render ảnh tĩnh nào mà chuyển hết sang task sau. Task sau chạy trong idle sau frame, ngân sách là phần
rảnh còn lại (tối đa `8ms`, luôn ít nhất một khung mỗi lượt). Khung card trên PC chỉ nhận ảnh tĩnh trong lượt idle đó, tới lúc ấy card giữ màu chủ đạo của ảnh: vẽ chúng trong task hoãn của batch CTA làm task đó dài gấp đôi (19ms so với 10ms) và rớt khung lúc lộ ảnh hàng loạt trên PC owner (3b.2 lượt 4).

```gherkin
Given Chrome có GPU, cửa sổ 1569×912, batch đầy viewport
When đo 5 giây sau warm-up
Then mỗi renderer từ 30fps trở lên, không long task trên 50ms
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| DOM hook | `[data-masonry-cta-skeleton]` (`data-masonry-cta-ready`, `-columns`, `-signature`) | Hộp batch; test đọc trạng thái |
| DOM hook | `[data-masonry-cta-frame]` với `data-masonry-cta-slot`, `-column` (cột trái), `-span`, `-depth`, `-ratio-band`, `data-masonry-flow-state`; canvas `data-masonry-flow-backend` | Khung (R1, R3); trạng thái renderer, backend WebGL hay tĩnh (R4, R5) |
| Class | `is-entry-ready`, `is-looping` trên khung | Đã hiện; Flow đang chạy (R4) |
| CSS | `--masonry-cta-top`, `--masonry-cta-tail-height`, `--masonry-cta-frame-opacity` | Runtime ghi, CSS đặt CTA và khung |
| Hàm public | `SKELETON_FLOW_PRESETS`, `drawSkeletonFlowAssignment`, `createSkeletonFlowFrameLayout`, `createSkeletonFlowRenderer` (`speedScale`), `renderSkeletonFlowPixels`, `skeletonFlowStill`, `staticBackground`, `advanceSkeletonFlowPhase`, `createSharedSkeletonFlowLayer` (`masonry/skeleton-flow.mjs`) | Thuần trừ renderer, layer chung và `skeletonFlowStill`; `masonry/runtime.mjs` gọi |
| Runtime | `skeletonNativeContexts`, `mountSkeletonRenderer`, `releaseSkeletonRenderer`, `renderCtaSkeleton` (`masonry/runtime.mjs`) | Lease pool, dựng batch (R1, R3, R5) |

## UI

[Skeleton](../../design-system/components/Skeleton/README.md), [Kính](../../design-system/components/Glass/README.md),
[motion skeleton tiếp nối](../../design-system/motion.md#skeleton-tiếp-nối).

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1 | `node --test tests/site/advertising-skeleton-flow.test.mjs` (frontier thấp nhất, band giữ qua dựng lại, đáy batch, nối dưới card hai cột, band ngang trải hai cột, 200 seed x 3 và 4 cột x đáy ngẫu nhiên không lỗ và không lặp band, related không khung hai cột, số khung cấu hình); `advertising-products-layout.test.mjs` (card tạm của card hai cột); `advertising-continuation.e2e.mjs` |
| R2 | `advertising-skeleton-flow.test.mjs` (12 preset, soften 0, fallback tĩnh không RAF) |
| R3 | `advertising-skeleton-flow.test.mjs` (bốc assignment, tránh preset kề, pha lệch, tốc độ trong 10%; mỗi preset đủ 4 màu, field, finish; hai chuỗi random cho vị trí mảng màu khác nhau; màu ảnh chỉ thay colors, field và finish giữ của preset nguồn); `advertising-skeleton-lifecycle.e2e.mjs` (chỉ đổi chiều cao, slot chung, giữ assignment); `media-colors.test.mjs` (k-means 4 màu trên ảnh tổng hợp, sắp sáng tới tối, chạy lại ra y hệt; `dominant` khớp `sharp` ở mọi biên bin và ca hòa; `mediaColors` ra đúng `MEDIA_COLORS` của ba ảnh trong repo); `advertising-primary-flow-colors.e2e.mjs` (primary dùng 4 màu của media, batch giữ preset) |
| R4 | `advertising-skeleton-lifecycle.e2e.mjs`; `advertising-skeleton-slow-network.e2e.mjs` (vuốt nhanh trên PC: khung và canvas hiện không fade); `advertising-continuation.e2e.mjs` (filter, reload, detail, Back/Forward; lần vào đầu tiên: mờ dần `0.6s`, không Kính, cả khi cung ngoài hay đang giao viewport); `advertising-related-cta.e2e.mjs` (F5 detail: Kính reveal gỡ khi cung vào view) |
| R5 | `advertising-skeleton-flow.test.mjs` (mất, khôi phục, destroy, lease; frame tĩnh theo preset và pha); `advertising-skeleton-lifecycle.e2e.mjs` (ngân sách điện thoại, ngang 838px); `advertising-skeleton-slow-network.e2e.mjs` (PC cao 1920x1400: card chờ ảnh đều chạy trên context chung; mở detail từ masonry đã cuộn: Flow chạy, card related tải xong hiện mà không cần cuộn); `frost-glass-smooth.e2e.mjs` (kính mờ lúc đậm nhất không có gãy khúc ở tâm điểm ảnh của bản 20px) |
| R6 | `advertising-continuation.e2e.mjs` (`footer-top-gap` 0, đáy batch); `glass-surface.e2e.mjs` |
| R7 | `advertising-continuation.e2e.mjs` (Flow tĩnh khi giảm chuyển động) |
| R8 | `advertising-continuation.e2e.mjs` (desktop 1569×912, cần Chrome có GPU); điện thoại chưa có test, đo bằng trace Chrome qua CDP ([debug Android](../operations/android-real-device-debugging.md)) |

## Gate còn mở

- R8 mới đo khi card related còn Flow; chưa đo lại với skeleton của primary trên phone. Máy PC.
- Safari trên iPhone thật chưa kiểm batch (thanh địa chỉ, bfcache, context). Owner và máy PC.
- `advertising-continuation.e2e.mjs` chỉ PASS gate fps R4 trên Chrome có GPU; Chromium headless cloud (WebGL phần mềm) đo
  khoảng 9fps và gần như không chạy rAF của worker, nên test này ở `manual`, chạy trên PC.
- Owner chưa xem Flow và 12 preset trên demo. Feral Flow chỉ là tham khảo, không có gate cảm nhận. Owner.

## Chú thích thuật ngữ

- **Batch**: tập khung skeleton nối tiếp masonry tới footer trong một lần dựng.
- **Slot**: thứ tự khung nối tiếp masonry, khóa để giữ band và assignment.
- **Assignment**: preset, hoán vị anchor, pha, chiều chảy và tốc độ lệch của một khung.
- **Trạng thái trang**: một lần masonry ổn định sau tải trang, đổi filter, mở hoặc đóng detail, Back/Forward.
- **Lease**: quyền dùng tạm một WebGL context; context thuộc document, không thuộc khung.
- **Flow**: hiệu ứng gradient chảy vẽ bằng WebGL.
- **Worker**: thread chạy JavaScript tách khỏi main thread của trang.
- **OffscreenCanvas**: canvas mà worker vẽ trực tiếp sau khi trang chuyển quyền điều khiển (`transferControlToOffscreen`).
