# Quy trình

Nguồn: CSS `.editorial-strip`, `.editorial-item`, `.detail-process`, `.process-step`; spec [ba trang con R8, R9](../../../docs/specs/detail-pages.md#r8-dải-quy-trình-duo-portal-loại-hình).

Năm bước Khảo sát, Tư vấn, Sản xuất, Lắp đặt, Hậu mãi. Hai biến thể; preview đặt dải ảnh Residential trên
lưới bước About.

## Dải ảnh (Residential, Commercial)

- `section.editorial-strip.detail-process-editorial`: năm `editorial-item` một hàng, mỗi item ảnh tỷ lệ
  `2048 / 3072` cắt cao 208px, tiêu đề chữ hoa 700 (20px ở 1440, 16px ở 390), đoạn 16px/24.
- Số bước lớn màu `line` nằm sau chữ, góc phải dưới.
- Tiêu đề bước đầu màu `blue`, bước cuối `orange`, còn lại `ink`.
- Điện thoại: hàng cuộn ngang, item 280.8px.

## Lưới bước (About)

- `section.detail-process`: năm cột bằng nhau (274px ở 1440), viền `line`, cao 448px; điện thoại cuộn ngang
  cột 256px.
- Mỗi `process-step`: số `01`-`05` `label` trên, tiêu đề 33.76px 600 (28.8px ở 390) và đoạn `muted` ở đáy;
  đệm 24px (20px 16px ở 390). Màu tiêu đề như dải ảnh.

## Chú thích thuật ngữ

- **Editorial strip**: dải item ảnh và chữ xếp như trang tạp chí.
