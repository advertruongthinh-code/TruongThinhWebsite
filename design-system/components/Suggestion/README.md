# Suggestion "Có thể bạn thích"

Danh sách tối đa bốn nút gợi ý nhóm sản phẩm cùng loại, nằm trong cột mô tả
của [Primary](../Primary/README.md). Runtime `catalog-runtime.mjs`
(`selectAdvertisingSuggestions`) chọn tag, `suggestion-slideshow.mjs` chạy
chuỗi ảnh nền.

## Hành vi

- Mỗi nút một dòng, nền là ảnh cover crop của tag kèm lớp tối, nhãn chữ trắng
  đậm căn giữa, đủ chữ.
- Bấm để lọc ảnh liên quan theo tag; chỉ một tag bật, bấm lại để tắt. Trạng
  thái bật dùng `aria-pressed`, khác hover và focus; thứ tự nút không đổi khi
  bật hoặc tắt.
- Nút chưa bật chạy chuỗi ảnh mỗi 3s; zoom chỉ khi hover. Nút đang bật và
  reduced motion giữ ảnh tĩnh.
- Ảnh nền chưa tải xong thì cạnh dưới nút hiện [Thanh tải](../LoadBar/README.md),
  không dùng vòng xoay.

Preview chụp tại một thời điểm của chuỗi ảnh nên ảnh nền có thể khác lần chụp
sau.

## Chú thích thuật ngữ

- **Tag**: nhãn phân loại sản phẩm trong một nhóm.
- **Cover crop**: cắt ảnh cho phủ kín khung.
