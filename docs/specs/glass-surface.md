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
duy nhất, có bốn cải tiến owner chọn. Giá trị nhìn thấy ở
[Design System](../../design-system/approved-designs.md#kính).

## Hành vi

### R1. Một component, hai dạng

Mọi bề mặt glass dùng cùng một component Kính, cùng markup, CSS và custom
property; không bề mặt nào tự viết `backdrop-filter`. Component có hai dạng:

| Dạng | Bề mặt |
| --- | --- |
| Cung | Kính cuối masonry Advertising, phủ batch skeleton dưới CTA |
| Phủ đều | Vùng dư quanh ảnh primary; card đang tải và primary đang mở ([R2, R4](loading-glass-and-page-entry.md)) |

Nền tối của viewer phóng to (`.advertising-photo-dialog::backdrop`) là lớp làm
tối để xem ảnh, không phải Kính, và giữ nguyên.

```gherkin
Given trang Advertising có kính cuối masonry, primary và card đang tải
When đọc CSS đang áp dụng của các lớp kính
Then mọi lớp kính thuộc component Kính, cùng bộ custom property
And không phần tử nào ngoài component Kính có backdrop-filter, trừ nền viewer
```

### R2. Dạng cung: nhòe tăng dần

Biên kính là một cung tròn, tâm ở giữa theo chiều ngang và nằm dưới batch.
Trong cung, kính nhòe tối đa. Từ cung đi ra ngoài (xa tâm), độ nhòe giảm dần
về 0 qua các bậc, mỗi bậc chồng mép lên bậc kế để mắt không thấy bậc hay đường
ranh giới. Không có vùng nào thấy ảnh nét và ảnh nhòe chồng lên nhau.

Mép ngoài của dải giảm nhòe dừng sao cho vẫn thấy rõ vài card skeleton phía
trên, và không bao giờ phủ ảnh thật. Tâm, bán kính và độ dày dải được chỉnh để
đạt điều này ở mọi cỡ cửa sổ; giá trị chốt trên bản chạy thử.

```gherkin
Given trang Advertising cuộn tới cuối masonry
When người xem nhìn vùng từ card skeleton nét tới vùng kính
Then độ nhòe tăng liên tục, không thấy đường ranh giới hay bóng ma hai lớp
And vài card skeleton phía trên còn nét, ảnh thật không bị phủ
```

### R3. Màu trắng theo cùng cung

Lớp phủ trắng của kính đi theo cùng các bậc cung với độ nhòe: ngoài cung không
có trắng, tới cung đạt tint, rồi vào trong tăng tới trắng tuyệt đối ở đáy
batch. Quy tắc đáy trắng tuyệt đối của
[Skeleton Flow](advertising-skeleton-flow.md#correction-r8-accepted--glass-blur-rộng-và-white-endpoint)
giữ nguyên.

```gherkin
Given kính dạng cung
When so đường đồng mức của độ nhòe và của màu trắng
Then hai đường trùng nhau trên cùng các cung đồng tâm
And từ đáy batch trở xuống mỗi kênh màu lệch trắng tối đa 1/255
```

### R4. Hạt nhiễu mịn

Kính có lớp hạt nhiễu đơn sắc tĩnh, độ đậm khoảng 2 đến 3%, để che sọc màu
(banding) ở dải trắng lớn và cho cảm giác kính mờ. Hạt nhiễu không chuyển động
và không có ở vùng trắng tuyệt đối (R3).

```gherkin
Given A05s mở cuối masonry
When chụp màn hình dải chuyển sang trắng
Then không thấy sọc màu
And vùng trắng tuyệt đối không có hạt nhiễu
```

### R5. Màu sau kính rực hơn

Kính tăng độ bão hòa của nội dung phía sau lên khoảng `1.5` (hiện `1.08`), độ
sáng giữ `1.04`, tint trắng alpha `0.12`. Giá trị chốt trên bản chạy thử.

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
`-webkit-backdrop-filter` cho Safari. Không có khúc xạ, viền sáng hay đổ bóng.

### R8. Giảm chuyển động

Kính dạng cung là bề mặt tĩnh, giữ nguyên khi giảm chuyển động. Kính hiện và
tan (R6) không chạy, theo R8 của [Skeleton chờ ảnh](loading-glass-and-page-entry.md).

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| DOM | `.glass-surface` với `data-glass-shape="arc"` hoặc `"even"` | Component Kính; `aria-hidden`, không nhận pointer |
| DOM | Các lớp bậc nhòe và lớp hạt nhiễu bên trong `.glass-surface` | Mỗi lớp một bậc; chỉ lớp bậc có `backdrop-filter` |
| CSS | `--glass-*` | Thay `--advertising-glass-*` và hai pseudo-element hiện tại trong `detail.css` |
| Runtime | `catalog-runtime.mjs` | Đặt tâm, bán kính, độ dày dải theo hình học batch, thay `--advertising-cta-skeleton-glass-start` |

## UI

[Kính trong Design System](../../design-system/approved-designs.md#kính).

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1–R6 | chưa có test |
| R7 | chưa có test; trace Chrome trên A05s qua CDP |
| R8 | chưa có test |

## Gate còn mở

- Dựng bản chạy thử từ code skeleton thật; owner chốt tâm, bán kính, dải,
  độ bão hòa, hạt nhiễu.
- PR code làm R1–R8 kèm test, cập nhật glass của
  [Skeleton Flow](advertising-skeleton-flow.md) R8–R10, glass vùng dư của
  [photo browse](advertising-photo-browse.md) P6.2, Design System và xóa mục
  Kính trong [Đã duyệt, chờ code](../../design-system/approved-designs.md).

## Chú thích thuật ngữ

- **Kính**: lớp glassmorphism làm nhòe và phủ trắng nội dung phía sau.
- **Bậc nhòe**: một lớp kính có một bán kính blur cố định.
- **Banding**: sọc màu thấy được trên dải chuyển màu mịn.
- **Tint**: lớp màu trắng bán trong suốt trên kính.
- **Batch skeleton**: nhóm card skeleton nối tiếp masonry ở cuối trang.
- **Long task**: tác vụ chiếm luồng chính của trình duyệt quá 50ms.
