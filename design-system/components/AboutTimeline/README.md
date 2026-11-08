# Dòng thời gian About

Nguồn: CSS `.about-timeline`, `.about-commitments`; spec [ba trang con R9](../../../docs/specs/detail-pages.md#r9-about-dòng-thời-gian-quy-trình-cam-kết).

Hai khối của About: dòng thời gian "Hơn 20 năm trước" tới "Hôm nay", rồi ba cam kết.

## Dòng thời gian

- Trục dọc 1px màu `line` ở giữa; mốc là chấm tròn trên trục (mốc đầu `blue`, mốc cuối `orange-accent`).
- Mốc chữ lớn 500 (64.8px/61.56 ở 1440, 53.6px ở 390) nằm sát trái trục; đoạn kể bên phải, câu mở in đậm.
- Đệm `96px 0 32px` ở 1440, `48px 0 32px` ở 390. Nửa trái để trống có chủ đích.

## Cam kết

- `section.about-commitments`: ba cột bằng nhau có viền `line` (456.7px ở 1440), một cột ở 390.
- Mỗi cam kết: số `label`, tiêu đề 43.2px 600 line-height 1 (44.8px ở 390), mô tả `muted`.
- Màu tiêu đề: `blue`, `ink`, `orange` theo thứ tự.

## Chú thích thuật ngữ

- **Mốc**: một thời điểm trên dòng thời gian.
