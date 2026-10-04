# Vòng tải

Vòng xoay báo ảnh primary Advertising đang tải. Runtime `catalog-runtime.mjs`
thêm `span.media-load-ring` vào khung ảnh và gỡ khi ảnh tải xong hoặc lỗi;
style ở `src/site/style.css`.

## Hành vi

- Tròn 1.75rem, viền 2px trắng alpha 0.18, cạnh trên alpha 0.72; căn giữa
  khung, không nhận pointer, `aria-hidden`; khung có `aria-busy` khi đang tải.
- Xoay một vòng mỗi `0.9s` tuyến tính; reduced motion đứng yên.
- Đặt trên nền tối `media-loading-surface`.

Vòng chỉ tồn tại khi ảnh đang tải, nên preview dựng khung chứa tay; class và
style vẫn của website.

Đã duyệt, chờ code: skeleton thay vòng này ở primary
([Mở ảnh tại chỗ](../../approved-designs.md#mở-ảnh-tại-chỗ)).

## Chú thích thuật ngữ

- **Primary**: ảnh đang được xem chi tiết.
