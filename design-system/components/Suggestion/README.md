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
- Nút chưa bật giữ ảnh 5s như
  [slideshow hero](../../motion.md#suggestion-và-detail), ảnh không zoom, rồi ảnh mới đẩy ngang
  ảnh cũ trong `0.9s`; nút sau trễ nút trước `0.4s` thành sóng. Nút đang bật
  và reduced motion giữ ảnh tĩnh.
- Hover chuột hoặc focus bàn phím: lớp tối `0.4` lên `0.6` trong `250ms` như
  Pinterest, nhãn chạy [gạch chân](../../motion.md#motion-theo-bề-mặt-ui) như nav
  và portal; ảnh không zoom. Nút đang bật không tối thêm, không gạch chân.
- Ảnh nền chưa giải mã xong thì nút chưa bật hiện [Vệt sáng](../LoadSweep/README.md)
  phủ cả nút, nhãn vẫn đọc được.

Preview chụp tại một thời điểm của chuỗi ảnh nên ảnh nền có thể khác lần chụp
sau.

## Chú thích thuật ngữ

- **Tag**: nhãn phân loại sản phẩm trong một nhóm.
- **Cover crop**: cắt ảnh cho phủ kín khung.
