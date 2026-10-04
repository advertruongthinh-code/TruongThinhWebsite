---
title: Kính dùng chung cho mọi bề mặt glass
status: planned
tests: []
notion: none
updated: 2026-10-04
---

# Kính dùng chung cho mọi bề mặt glass

## Mục đích

Owner thấy vùng chuyển từ nét sang nhòe ở kính cuối masonry Advertising còn
ranh giới (04/10). Kính hiện tại là một lớp blur 28px đủ mạnh từ mép trên, chỉ
mờ dần độ trong suốt, nên vùng chuyển là ảnh nét và ảnh nhòe chồng nhau
(`src/site/detail.css`). Spec này thay mọi bề mặt glass bằng một component Kính
duy nhất, có bốn cải tiến owner chọn. Owner chốt số ngày 04/10 trên bản chạy
thử [Kính Trường Thịnh](https://claude.ai/artifact/3cmMiPqYxMMq9LAWCHwujH)
(phiên bản 3 mở sẵn số đã chốt). Giá trị nhìn thấy ở
[Design System](../../design-system/approved-designs.md#kính).

## Hành vi

### R1. Một component, hai dạng

Mọi bề mặt glass dùng cùng một component Kính, cùng markup, CSS và custom
property; không bề mặt nào tự viết `backdrop-filter`. Component có hai dạng:

| Dạng | Bề mặt |
| --- | --- |
| Cung | Kính cuối masonry Advertising, nền cho cụm CTA trên batch skeleton |
| Phủ đều | Vùng dư quanh ảnh primary; card đang tải và primary đang mở ([R2, R4](loading-glass-and-page-entry.md)) |

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
| Đỉnh cung, giao của cung với trục giữa | mép trên tiêu đề + `0.70` × chiều cao cụm CTA |
| Bán kính | `2.7` × bề rộng viewport |
| Dải giảm nhòe, đo từ cung ra ngoài | `1.40` × chiều cao cụm CTA |

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
hạt hòa trộn `overlay`, nên vùng trắng tuyệt đối (R3) giữ nguyên trắng. Hạt
nhiễu không chuyển động; một hạt bằng một pixel thiết bị.

```gherkin
Given A05s mở cuối masonry
When chụp màn hình dải chuyển sang trắng
Then không thấy sọc màu
And vùng trắng tuyệt đối không có hạt nhiễu
```

### R5. Màu sau kính rực hơn

Kính tăng độ bão hòa của nội dung phía sau lên `1.7` (hiện `1.08`), độ sáng
`1.04`, tint trắng alpha `0.12`. `saturate()` và `brightness()` nhân dồn qua
các bậc, nên mỗi bậc nhận căn bậc năm của giá trị tổng và độ rực tăng cùng độ
nhòe.

### R6. Hiện và tan bằng opacity từng bậc

Khi kính dạng phủ đều hiện hoặc tan (card đang tải, primary), các bậc nhòe hiện
lần lượt từ nhẹ tới mạnh và tan theo chiều ngược lại, chỉ bằng `opacity`. Không
animate bán kính blur mỗi frame, theo nguyên tắc của
[Motion](../../design-system/motion.md#nguyên-tắc). Thời gian và đường cong
giữ như [Card đang tải](../../design-system/approved-designs.md#card-đang-tải).

```gherkin
Given card đang tải có ảnh vừa giải mã
When kính hiện rồi tan
Then chỉ opacity của các bậc đổi theo thời gian, backdrop-filter không đổi
```

### R7. Hiệu năng và trình duyệt

Đạt gate điện thoại của [Skeleton chờ ảnh](loading-glass-and-page-entry.md)
R9 trên A05s, cả khi cuộn tới kính dạng cung và khi nhiều card cùng hiện kính:
median tối thiểu `30fps`, không long task trên `50ms`. Nếu số bậc làm rơi gate,
PR code báo owner kèm số đo trước khi đổi số bậc. Có tiền tố
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
| DOM | Các lớp bậc nhòe, lớp tint và lớp hạt nhiễu bên trong `.glass-surface` | Mỗi lớp một bậc; chỉ lớp bậc có `backdrop-filter` |
| CSS | `--glass-*` | Thay `--advertising-glass-*` và hai pseudo-element hiện tại trong `detail.css` |
| Runtime | `catalog-runtime.mjs` | Đặt tâm, bán kính, dải theo cụm CTA và hình học batch, thay `--advertising-cta-skeleton-glass-start` |

## UI

[Kính trong Design System](../../design-system/approved-designs.md#kính).

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1–R6 | chưa có test |
| R7 | chưa có test; trace Chrome trên A05s qua CDP |
| R8 | chưa có test |

## Gate còn mở

- PR code làm R1–R8 kèm test, cập nhật glass của
  [Skeleton Flow](advertising-skeleton-flow.md) R8–R10, glass vùng dư của
  [photo browse](advertising-photo-browse.md) P6.2, Design System và xóa mục
  Kính trong [Đã duyệt, chờ code](../../design-system/approved-designs.md).

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
