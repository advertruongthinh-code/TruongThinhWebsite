# Thanh tải

Thanh chạy dọc cạnh dưới nút [Suggestion](../Suggestion/README.md) "Có thể
bạn thích" khi ảnh nền của nút chưa tải xong; thay vòng xoay theo lựa chọn của
owner ngày 2026-10-04
([spec tải ảnh](../../../docs/specs/image-loading-progress.md)). Style ở
`src/site/detail.css`, không có markup riêng.

## Hành vi

- Vẽ bằng `background-image` SVG cao 2px, rộng đủ nút, nằm dưới ảnh: ảnh tải
  xong thì phủ lên thanh, và runtime thêm `.is-media-settled` để gỡ thanh.
- Rãnh trắng alpha 0.18; đoạn sáng trắng alpha 0.72 rộng 30% chạy từ trái sang
  phải, mỗi vòng `1.2s` tuyến tính.
- Nút đang bật (`aria-pressed="true"`) nền trắng, không có thanh.
- Reduced motion: đoạn sáng đứng yên ở mép trái.

Preview dựng nút không có ảnh để thấy thanh; nút thứ ba ở trạng thái bật.

## Chú thích thuật ngữ

- **Indeterminate**: báo đang tải mà không biết còn bao lâu.
- **Rãnh**: phần nền mờ của thanh, đoạn sáng chạy trên đó.
