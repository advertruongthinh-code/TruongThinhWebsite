---
title: Kính dùng chung cho mọi bề mặt glass
status: live
source:
  - src/site/advertising-products/glass-surface.mjs
tests:
  - tests/site/glass-surface.test.mjs
  - tests/site/glass-surface.e2e.mjs
notion: none
updated: 2026-10-04
---

# Kính dùng chung cho mọi bề mặt glass

## Mục đích

Mọi bề mặt glass của trang Advertising dùng một component Kính: nhòe tăng dần
thật qua năm bậc, màu trắng theo cùng hình, hạt nhiễu mịn và màu sau kính rực
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
tối để xem ảnh, không phải Kính, và giữ nguyên.

```gherkin
Given trang Advertising có kính cuối masonry, primary và card đang tải
When đọc CSS đang áp dụng của các lớp kính
Then mọi lớp kính thuộc component Kính, cùng bộ custom property
And không phần tử nào ngoài component Kính có backdrop-filter, trừ nền viewer
```

### R2. Dạng cung: nền cho cụm CTA, nhòe tăng dần

Kính dạng cung chỉ làm nền cho cụm CTA (tiêu đề và nút "Trao đổi ý tưởng") để
chữ dễ đọc trên skeleton đang chuyển động. Card skeleton phía trên cụm vẫn nét
và thấy chuyển động (owner, 04/10).

Biên kính là một cung tròn, tâm ở giữa theo chiều ngang và nằm dưới batch.
Trong cung, kính nhòe tối đa `28px`. Từ cung đi ra ngoài (xa tâm), độ nhòe giảm
về 0 qua năm bậc `28`, `16`, `9`, `4.5`, `2px`; mỗi bậc chồng mép lên bậc kế để
mắt không thấy bậc hay đường ranh giới. Không có vùng nào thấy ảnh nét và ảnh
nhòe chồng lên nhau. Các lớp blur xếp chồng thì cộng dồn (đo trên Chromium: hai
lớp `6px` bằng một lớp `8.5px`), nên mỗi bậc chỉ thêm phần tăng
`sqrt(L² - L_trước²)`.

Số đo ở vị trí cuộn cuối trang, khi parallax của CTA bằng 0. Cụm CTA tính từ
mép trên tiêu đề tới đáy nút.

| Giá trị | Chốt 04/10 |
| --- | --- |
| Đỉnh cung, giao của cung với trục giữa | mép trên tiêu đề + `0.50` × chiều cao cụm CTA |
| Bán kính | `4.0` × bề rộng viewport |
| Dải giảm nhòe, đo từ cung ra ngoài | `1.20` × chiều cao cụm CTA |

Hai giới hạn tự động: dải hẹp lại nếu mép ngoài lên quá đáy cột ảnh thật cao
nhất, nên Kính không bao giờ phủ ảnh thật; bán kính tăng lên nếu cần, để cung
cách hai góc đáy batch ít nhất `0.25` bề rộng card và hai góc đó vẫn trắng
tuyệt đối (R3).

```gherkin
Given trang Advertising cuộn tới cuối masonry
When người xem nhìn từ card skeleton phía trên xuống cụm CTA
Then card skeleton phía trên cụm còn nét và chuyển động
And độ nhòe tăng liên tục tới tối đa ở cung, không thấy ranh giới hay bóng ma hai lớp
And ảnh thật không bị phủ
```

### R3. Màu trắng theo cùng cung

Lớp phủ trắng của kính đi theo cùng các cung đồng tâm với độ nhòe: ở mép ngoài
dải không có trắng, tới cung đạt tint `0.12`, vào trong tăng tới trắng tuyệt
đối ở vòng tròn đi qua hai góc đáy batch. Hai đoạn chuyển dùng smoothstep để
không gãy ở cung. Quy tắc đáy trắng tuyệt đối của
[Skeleton Flow](advertising-skeleton-flow.md#correction-r8-accepted--glass-blur-rộng-và-white-endpoint)
giữ nguyên.

```gherkin
Given kính dạng cung
When so đường đồng mức của độ nhòe và của màu trắng
Then hai đường trùng nhau trên cùng các cung đồng tâm
And từ đáy batch trở xuống mỗi kênh màu lệch trắng tối đa 1/255
```

### R4. Hạt nhiễu mịn

Kính có lớp hạt nhiễu đơn sắc tĩnh, độ đậm `4%` (độ lệch lớn nhất trên tông
giữa), để che sọc màu (banding) ở dải trắng lớn và cho cảm giác kính mờ. Lớp
hạt hòa trộn `overlay` và ở dạng cung mờ dần về 0 tới vòng trắng tuyệt đối, nên
vùng trắng tuyệt đối (R3) giữ nguyên trắng. Hạt nhiễu không chuyển động; một
hạt bằng một pixel thiết bị.

```gherkin
Given A05s mở cuối masonry
When chụp màn hình dải chuyển sang trắng
Then không thấy sọc màu
And vùng trắng tuyệt đối không có hạt nhiễu
```

### R5. Màu sau kính rực hơn

Kính tăng độ bão hòa của nội dung phía sau lên `1.7`, độ sáng
`1.04`, tint trắng alpha `0.12`. `saturate()` và `brightness()` nhân dồn qua
các bậc, nên mỗi bậc nhận căn bậc năm của giá trị tổng và độ rực tăng cùng độ
nhòe.

### R6. Hiện và tan bằng opacity từng bậc

Card đang tải và primary đang mở của
[Skeleton chờ ảnh](loading-glass-and-page-entry.md) (R2, R4) hiện rồi tan kính
dạng phủ đều đủ năm bậc. Các bậc nhòe hiện lần lượt từ nhẹ tới mạnh và tan theo
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
trên A05s, cả khi cuộn tới kính dạng cung và khi nhiều card cùng hiện kính:
median tối thiểu `30fps`, không long task trên `50ms`. Nếu số bậc làm rơi gate,
báo owner kèm số đo trước khi đổi số bậc. Có tiền tố
`-webkit-backdrop-filter` cho Safari; WebKit trên cloud không vẽ
`backdrop-filter`, nên Safari kiểm trên iPhone thật. Không có khúc xạ, viền
sáng hay đổ bóng.

### R8. Giảm chuyển động

Kính dạng cung là bề mặt tĩnh, giữ nguyên khi giảm chuyển động. Kính hiện và
tan (R6) không chạy, theo R8 của [Skeleton chờ ảnh](loading-glass-and-page-entry.md).

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| DOM | `.glass-surface` với `data-glass-shape="arc"` hoặc `"even"` | Component Kính; `aria-hidden`, không nhận pointer; không có opacity, mask hay filter để các bậc còn thấy trang phía sau |
| DOM | `i.glass-surface__step`, rồi `i.glass-surface__tint`, `i.glass-surface__grain` | Dạng cung năm bậc; dạng phủ đều đứng yên một bậc `glass-surface__step--full` (nhìn như năm bậc chồng, nhẹ hơn); bề mặt hiện/tan (R6) năm bậc, có `data-glass-reveal`. Chỉ lớp bậc có `backdrop-filter`; mọi lớp `z-index: 1`, riêng kính hiện/tan trên primary `2` để phủ ảnh và skeleton, dưới nút ảnh |
| CSS | `detail.css`, mục Kính | Phần tăng blur từng bậc (`--glass-step-blur`), `saturate(1.112)`, `brightness(1.0079)`; `.glass-surface__step--full` là `blur(28px) saturate(1.7) brightness(1.04)`; tint, hạt nhiễu `overlay` opacity `0.08` |
| CSS | `--glass-grain`, `--glass-grain-size` trên `html` | Ảnh hạt nhiễu 160×160 sinh một lần bằng canvas, một hạt một pixel thiết bị |
| Runtime | `glass-surface.mjs` | `createGlassSurface(shape, steps)` (mặc định cung 5, phủ đều 1); `arcGlassGeometry()` tính đỉnh, bán kính, dải và hai giới hạn; `layoutArcGlass()` đặt mask và màu trắng; `glassRevealLevel(t)` mức kính theo thời gian, `playGlassReveal(glass, duration)` animate opacity từng lớp (R6) |
| Runtime | `catalog-runtime.mjs` | Gắn kính cung vào `.project-index`, đo cụm CTA và batch mỗi lần dựng skeleton; gắn kính phủ đều sau nền primary, CSS bật theo `data-advertising-photo-glass`; gắn kính hiện/tan cuối khung media card hoặc khung primary trong lúc ảnh hiện |

## UI

[Kính trong Design System](../../design-system/components/Glass/README.md).

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1–R5 | `node tests/site/glass-surface.test.mjs` (CSS, hình học); `node tests/site/glass-surface.e2e.mjs` (Chromium, `BASE_URL`) |
| R6 | `glass-surface.test.mjs` (mức kính theo thời gian); `image-loading-frame.e2e.mjs` (P9: năm bậc, chỉ opacity đổi, gỡ sau khi xong) |
| R7 | trace Chrome trên A05s qua CDP, chưa chạy |
| R8 | `glass-surface.e2e.mjs`, ca giảm chuyển động |

## Gate còn mở

- R7 trên A05s thật: chưa đo median fps và long task khi cuộn tới kính cung
  và khi mở primary có kính. Đo tương đối trên cloud 04/10 (Chromium vẽ bằng
  CPU, chậm CPU ×4, 390×844 DPR3, cuộn qua lại ở cuối masonry): `main` 55fps,
  kính cung năm bậc 21–59fps (hai mode), cùng kính một bậc 60fps. Năm bậc là
  phần nặng. Vào thẳng ảnh có kính phủ đều (1329×912, cùng cloud): số khung
  trong 460ms đầu khi related xếp chỗ là `main` 22, Kính 17, Kính bỏ hạt nhiễu
  22; hạt nhiễu `overlay` là phần nặng. Số cloud không thay A05s.
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
