---
title: Kính dùng chung cho mọi bề mặt glass
status: live
source:
  - src/site/advertising-products/glass-surface.mjs
tests:
  - tests/site/glass-surface.test.mjs
  - tests/site/advertising-audit.test.mjs
  - tests/site/glass-surface.e2e.mjs
notion: none
updated: 2026-10-24
---

# Kính dùng chung cho mọi bề mặt glass

## Mục đích

Mọi bề mặt glass của trang Advertising dùng một component Kính: nhòe tăng dần
thật qua nhiều bậc, màu trắng theo cùng hình, hạt nhiễu mịn và màu sau kính rực
hơn, để vùng chuyển từ nét sang nhòe không còn ranh giới. Số do owner chốt trên
bản chạy thử [Kính Trường Thịnh](https://claude.ai/artifact/3cmMiPqYxMMq9LAWCHwujH)
(phiên bản 4). Giá trị nhìn thấy ở
[Design System](../../design-system/components/Glass/README.md).

## Hành vi

### R1. Một component, hai dạng

Mọi bề mặt glass dùng cùng một component Kính, cùng markup và CSS; không bề
mặt nào tự viết `backdrop-filter`. Component có hai dạng:

| Dạng | Bề mặt |
| --- | --- |
| Cung | Kính cuối masonry Advertising, nền cho cụm CTA trên batch skeleton |
| Phủ đều | Vùng dư quanh ảnh primary khi ảnh contain còn chỗ trống; card đang tải và primary đang mở, chỉ trong lúc ảnh hiện ([R2, R4](loading-glass-and-page-entry.md)) |

Nền tối của viewer phóng to (`.advertising-photo-dialog::backdrop`) là lớp làm
tối để xem ảnh, không phải component Kính ([detail R9](advertising-detail.md#r9-viewer)).

```gherkin
Given trang Advertising có kính cuối masonry, primary và card đang tải
When đọc CSS đang áp dụng của các lớp kính
Then mọi lớp kính thuộc component Kính, cùng bộ custom property
And không phần tử nào ngoài component Kính có backdrop-filter
```

### R2. Dạng cung: nền cho cụm CTA, nhòe tăng dần

Kính dạng cung chỉ làm nền cho cụm CTA (tiêu đề và nút "Trao đổi ý tưởng") để
chữ dễ đọc trên skeleton đang chuyển động. Card skeleton phía trên cụm vẫn nét
và thấy chuyển động (owner, 04/10).

Biên kính là một cung tròn, tâm ở giữa theo chiều ngang và nằm dưới batch.
Độ nhòe tăng liên tục từ mép dải vào tâm, không có đoạn phẳng (owner, 06/10):
tại cung nhòe `28px`, vào trong tăng tiếp tới trần `100px` ở vòng trắng tuyệt
đối (R3), qua một bậc trong cung trên PC, phone ẩn bậc này. Mức của bậc thứ n trong N
là `28 + 72 × n / N px`. Số lớp cố định theo loại máy, không đo fps (owner 10/10): PC 5 lớp (lõi, 1 bậc
trong lên thẳng `100px`, 3 bậc band; owner 10/10); phone (`pointer: coarse` hoặc có touch) 2 lớp: lõi `28px` như PC và bậc band trong cùng (owner 10/10).
Bậc trong (81-88% frame chậm, vòng 26)
hay bậc band thứ hai (30% frame chậm, p5 `45fps`, vòng 29) đều rơi gate. Lúc cuộn và lúc dừng máy dùng cùng số lớp, không thay bằng ảnh nhòe dựng sẵn (owner
10/10). Từ cung đi ra ngoài (xa tâm), độ nhòe giảm
về 0 qua ba bậc `28`, `12`, `4.5px` (owner chọn ba bậc thay năm ngày 05/10 để
vuốt trên phone Android đạt gate R7); mỗi bậc chồng mép lên bậc kế để mắt không thấy bậc
hay đường ranh giới. Các lớp blur xếp chồng thì cộng dồn (đo trên Chromium: hai
lớp `6px` bằng một lớp `8.5px`), nên mỗi bậc chỉ thêm phần tăng
`sqrt(L² - L_trước²)`.

Số đo ở vị trí cuộn cuối trang, khi parallax của CTA bằng 0. Cụm CTA tính từ
mép trên tiêu đề tới đáy nút. Các lớp kính chạy quá đáy batch `2px` để không lộ mép khi làm tròn
subpixel; footer xếp trên kính nên đường kẻ trên cùng của footer luôn hiện.

| Giá trị | Chốt 06/10 (owner) |
| --- | --- |
| Đỉnh cung, giao của cung với trục giữa | mép trên tiêu đề - `0.15` × chiều cao cụm CTA (trên tiêu đề, để chữ nằm trong lõi; owner 10/10); phone giữ `+0.35` (đỉnh cao hơn làm A05s cũ vuốt 7-9% frame chậm, vòng 34) |
| Bán kính | `3.5` × bề rộng viewport |
| Dải giảm nhòe, đo từ cung ra ngoài | `1.75` × chiều cao cụm CTA |
| Vùng trắng tuyệt đối | `0.35` × bề rộng card |
| Trần nhòe, đạt ở vòng trắng tuyệt đối | `100px` |

Ba giới hạn tự động: dải hẹp lại nếu mép ngoài lên quá đáy cột ảnh thật cao
nhất, nên Kính không bao giờ phủ ảnh thật; đỉnh cung dời lên nếu cần để cách đáy
batch ít nhất hai lần vùng trắng tuyệt đối; bán kính tăng lên nếu cần, để cung
cách hai góc đáy batch ít nhất một vùng trắng tuyệt đối và hai góc đó vẫn trắng
tuyệt đối (R3).

```gherkin
Given trang Advertising cuộn tới cuối masonry
When người xem nhìn từ card skeleton phía trên xuống cụm CTA
Then card skeleton phía trên cụm còn nét và chuyển động
And độ nhòe tăng liên tục qua cung tới trần 100px ở vòng trắng tuyệt đối, không thấy ranh giới hay bóng ma hai lớp
And khi bật chuyển động, mép card dưới lõi cung nhòe như khi giảm chuyển động
And ảnh thật không bị phủ
```

### R3. Màu trắng theo cùng cung

Lớp phủ trắng của kính đi theo cùng các cung đồng tâm với độ nhòe: ở mép ngoài
dải không có trắng, tới cung đạt tint `0.55` (owner 10/10, trước `0.35`), vào trong tăng tới trắng tuyệt
đối ở vòng tròn đi qua hai góc đáy batch. Hai đoạn chuyển dùng smoothstep để
không gãy ở cung. Quy tắc đáy trắng tuyệt đối của
[skeleton R6](advertising-skeleton.md#r6-cta-kính-và-footer-trên-batch)
giữ nguyên.

```gherkin
Given kính dạng cung
When so đường đồng mức của độ nhòe và của màu trắng
Then hai đường trùng nhau trên cùng các cung đồng tâm
And từ đáy batch trở xuống mỗi kênh màu lệch trắng tối đa 1/255
```

### R4. Hạt nhiễu mịn

Kính có lớp hạt nhiễu đơn sắc tĩnh, độ đậm `3%` (độ lệch lớn nhất trên tông
giữa), để che sọc màu (banding) ở dải trắng lớn và cho cảm giác kính mờ. Lớp
hạt hòa trộn `overlay` và ở dạng cung mờ dần về 0 tới vòng trắng tuyệt đối, nên
vùng trắng tuyệt đối (R3) giữ nguyên trắng. Hạt nhiễu không chuyển động; một
hạt bằng một pixel thiết bị.

Dạng cung dùng cùng nhiễu ở dạng hạt trắng, hòa trộn thường, opacity `0.12`:
trên kính sáng nó làm sáng `0.12 × nhiễu × (1 - nền)`, đúng bằng overlay, và
tint bớt `0.06` trắng trung bình của hạt nên màu trung bình giữ đúng R3. Lý do:
khi trang cuộn bằng chuyển động, Chromium bỏ nhòe của các bậc nằm dưới một lớp
có hòa trộn, nên mép card skeleton lộ nét trong cung (owner thấy trên demo, 06/10).

```gherkin
Given phone Android mở cuối masonry
When chụp màn hình dải chuyển sang trắng
Then không thấy sọc màu
And vùng trắng tuyệt đối không có hạt nhiễu
```

### R5. Màu sau kính rực hơn

Kính tăng độ bão hòa của nội dung phía sau lên `1.7`, độ sáng
`1.04`, tint trắng alpha `0.12`. `saturate()` và `brightness()` nhân dồn qua
các bậc, nên mỗi bậc của dạng phủ đều (ba bậc) nhận căn bậc ba của giá trị tổng và độ rực tăng cùng độ
nhòe. Dạng cung chỉ blur, bão hòa và độ sáng bằng `1` (owner 10/10, trước
`1.55`, `1.05`): lõi chồng các bậc viền trong dải chuyển tại cung nên màu tăng
hai lần thành gờ đậm dọc cung; tint của nó theo R3.

### R6. Hiện và tan bằng opacity từng bậc

Ảnh card mỗi lần hiện và primary đang mở của
[Skeleton chờ ảnh](loading-glass-and-page-entry.md) (R2 đến R4) hiện rồi tan kính
dạng phủ đều đủ ba bậc, mức `16`, `57`, `100px` (owner chọn 2026-10-24, thay năm bậc). Các bậc nhòe hiện lần lượt từ nhẹ tới mạnh và tan theo
chiều ngược lại, chỉ bằng `opacity`; tint và hạt nhiễu theo cùng mức, nên kính
bắt đầu và kết thúc không nhòe, không tint. Không animate bán kính blur mỗi
frame, theo nguyên tắc của [Motion](../../design-system/motion.md#nguyên-tắc).
Thời gian và đường cong theo bảng
[Hiện và tan trên ảnh vừa tải](../../design-system/components/Glass/README.md#hiện-và-tan-trên-ảnh-vừa-tải).
Xong thì runtime gỡ kính khỏi DOM.

```gherkin
Given card đang tải có ảnh vừa giải mã
When kính hiện rồi tan
Then chỉ opacity của các bậc đổi theo thời gian, backdrop-filter không đổi
```

### R7. Hiệu năng và trình duyệt

Gate điện thoại của [Skeleton chờ ảnh](loading-glass-and-page-entry.md) R9
trên phone Android, cả khi cuộn tới kính dạng cung và khi nhiều card cùng hiện kính:
gate [phone Android trên 60fps](../decisions/phone-frame-budget.md) (trên `60fps`). Nếu số bậc làm rơi gate,
báo owner kèm số đo trước khi đổi số bậc (05/10: năm bậc rơi gate, owner chọn ba
bậc cho dạng cung). Số lớp theo loại máy (R2); trần
`100px` của ảnh nền primary chưa đo trên phone Android. Kính hiện/tan trên primary detail: ngày 10/10 năm bậc
`backdrop-filter` phủ cả hero rơi gate pha mở (A05s cũ p5 `30-45fps`, 22-39% frame chậm), nên primary từng dùng Kính
nhòe dựng sẵn trên canvas. Owner bỏ đường đó (2026-10-24): primary dùng chung Kính ba bậc `backdrop-filter` của card
([R4 mở ảnh tại chỗ](loading-glass-and-page-entry.md#r4-mở-ảnh-tại-chỗ)), điện thoại chạy đúng như PC (owner 11/10).
Ba bậc phủ cả hero chưa đo trên phone Android; dưới gate thì dừng, báo owner kèm số đo, không tự quay về Kính dựng sẵn.
Kính hiện/tan trên card cùng ba bậc. Có tiền tố
`-webkit-backdrop-filter` cho Safari; WebKit trên cloud không vẽ
`backdrop-filter`, nên Safari kiểm trên iPhone thật. Không có khúc xạ, viền
sáng hay đổ bóng.

Kính hiện/tan (R6) không được nằm trong DOM cùng lúc Kính cung giao viewport: chỉ
một Kính hiện/tan, kể cả ở xa cung, cũng làm Chrome bỏ blur các bậc dải và bậc
trong cung, còn lại lõi, cho tới 1-2 frame sau khi nó bị gỡ. Số bậc trong cung
không liên quan; PC RTX 3090 giữ 5 bậc suốt (đo trên Chrome của owner, 07/10).
Cách giữ: [skeleton](advertising-skeleton.md) gỡ mọi Kính hiện/tan khi cung vào
viewport, khung dưới cung chỉ crossfade; owner xác nhận hết lỗi 10/10.

### R8. Giảm chuyển động

Kính dạng cung là bề mặt tĩnh, giữ nguyên khi giảm chuyển động. Kính hiện và
tan (R6) không chạy, theo R8 của [Skeleton chờ ảnh](loading-glass-and-page-entry.md).

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| DOM | `.glass-surface` với `data-glass-shape="arc"` hoặc `"even"` | Component Kính; `aria-hidden`, không nhận pointer; không có opacity, mask hay filter để các bậc còn thấy trang phía sau |
| DOM | `i.glass-surface__step`, rồi `i.glass-surface__tint`, `i.glass-surface__grain` | Dạng cung: một bậc `glass-surface__step--full` làm lõi trong cung (ở đó các bậc đều đủ), rồi một bậc `glass-surface__step--inner` tăng nhòe vào trong (phone ẩn bậc này bằng `hidden`), rồi ba bậc chỉ phủ dải; lõi chuyển sang ba bậc qua `48px` bên trong cung nên không thấy đường nối: nửa ngoài lõi hiện dần khi các bậc còn đủ, nửa trong các bậc tắt dần khi lõi đã đủ, nên trang nét không lọt qua chỗ cả hai cùng mờ dần (owner thấy ở mép màn hình, 05/10); dạng phủ đều đứng yên một bậc `glass-surface__step--full` (nhìn như ba bậc chồng, nhẹ hơn); kính phủ đều quanh primary không có bậc, chỉ tint và hạt nhiễu, còn ảnh nền primary tự mang `filter: blur(100px) saturate(1.7) brightness(1.04)` vì Chrome chụp backdrop theo từng raster tile khi chụp thumbnail lúc rê chuột lên tab, kẹp blur ở mép tile và để lại đường nối tới lần repaint đầy đủ (owner thấy 06/10); bề mặt hiện/tan (R6) ba bậc, có `data-glass-reveal`. Chỉ lớp bậc có `backdrop-filter`; mọi lớp `z-index: 1`, riêng kính hiện/tan trên primary `2` để phủ ảnh và skeleton, dưới nút ảnh |
| CSS | `detail.css`, mục Kính | Phần tăng blur từng bậc (`--glass-step-blur`, đếm bằng `nth-last-child` để lõi đứng trước không làm lệch): ba bậc `16.07`, `54.84`, `82.07px` (mức `16.07`, `57.14`, `100px`), dạng cung `4.5`, `11.12`, `25.3px`, bậc trong cung do runtime đặt inline; `--glass-saturate`, `--glass-brightness` (tổng, cho bậc đủ) và `--glass-step-saturate`, `--glass-step-brightness` (mỗi bậc) trên `.glass-surface` là `1.7`, `1.04`, `1.1935`, `1.0132`, dạng cung cả bốn bằng `1`; `.glass-surface__step--full` là `blur(var(--glass-full-blur))` với tổng đó, `100px`, riêng lõi dạng cung `28px` để các bậc trong cung tăng tiếp tới trần (R2); tint, hạt nhiễu `overlay` opacity `0.06`; dạng cung hạt trắng `--glass-grain-white` hòa trộn thường opacity `0.12` (R4) |
| CSS | `--glass-grain`, `--glass-grain-size` trên từng `.glass-surface` | Hai ảnh hạt nhiễu 160×160 cùng nhiễu, xám cho overlay và trắng theo alpha cho dạng cung (`--glass-grain-white`), sinh một lần bằng canvas, một hạt một pixel thiết bị; đặt trên kính, không trên `html`, để ảnh tới muộn chỉ tính lại style của kính |
| Runtime | `glass-surface.mjs` | `createGlassSurface(shape, steps)` (mặc định cung 3, phủ đều 1); `arcGlassGeometry()` tính đỉnh, bán kính, dải và ba giới hạn; `layoutArcGlass()` đặt hộp và mask của lõi, bậc trong cung, các bậc và màu trắng; mỗi hộp bậc chạy quá mask một sigma của mức blur (rộng hơn không đổi pixel nào quá 3/255, mà mỗi hàng thêm là một hàng phải blur mỗi frame); số lớp theo loại máy (R2): PC 1 bậc trong cung và 3 bậc band, phone lõi và 1 bậc band; `glassRevealLevel(t)` mức kính theo thời gian, `playGlassReveal(glass, duration)` animate opacity từng lớp (R6) |
| Runtime | `catalog-runtime.mjs` | Gắn kính cung vào `.project-index`, đo cụm CTA và batch mỗi lần dựng skeleton; gắn kính phủ đều sau nền primary, CSS bật theo `data-advertising-photo-glass`; gắn kính hiện/tan cuối khung media card hoặc khung primary trong lúc ảnh hiện |

## UI

[Kính trong Design System](../../design-system/components/Glass/README.md).

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1–R5 | `node tests/site/glass-surface.test.mjs` (CSS, hình học); `node tests/site/glass-surface.e2e.mjs` (Chromium, `BASE_URL`) |
| R6 | `glass-surface.test.mjs` (mức kính theo thời gian); `image-loading-frame.e2e.mjs` (P9: ba bậc, chỉ opacity đổi, gỡ sau khi xong; primary phone khớp PC) |
| R7 | đo qua CDP trên phone Android thật (05/10); script đo chưa vào repo |
| R8 | `glass-surface.e2e.mjs`, ca giảm chuyển động |

## Gate còn mở

- Safari trên iPhone thật chưa kiểm.

## Chú thích thuật ngữ

- **Kính**: lớp glassmorphism làm nhòe và phủ trắng nội dung phía sau.
- **Bậc nhòe**: một lớp kính có một bán kính blur cố định.
- **Cụm CTA**: tiêu đề "Dấu ấn tiếp theo" và nút "Trao đổi ý tưởng" cuối masonry.
- **Banding**: sọc màu thấy được trên dải chuyển màu mịn.
- **Tint**: lớp màu trắng bán trong suốt trên kính.
- **Smoothstep**: đường chuyển mềm, dốc bằng 0 ở hai đầu.
- **Overlay**: chế độ hòa trộn giữ nguyên trắng và đen tuyệt đối.
- **Batch skeleton**: nhóm card skeleton nối tiếp masonry ở cuối trang.
- **Long task**: tác vụ chiếm luồng chính của trình duyệt quá 50ms.
- **Subpixel**: phần lẻ dưới một pixel khi trình duyệt làm tròn vị trí.
- **Raster tile**: ô ảnh trình duyệt vẽ riêng rồi ghép thành trang.
