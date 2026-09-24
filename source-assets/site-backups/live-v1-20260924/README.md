# Backup ảnh site version 1

Backup bản đang phát hành ngày 24/09/2026, trước khi cập nhật site.

- Site: https://truong-thinh-noi-that.potato240794.chatgpt.site
- Source commit: `85adc08077b75faf47249eb2a2a68ad9422deb3b`.
- Có 54 ảnh trích xuất từ đúng source commit của Sites version 1, giữ nguyên đường dẫn trong `assets/`.
- Tải trực tiếp từ site trả HTTP 403; chưa đối chiếu byte với HTTP runtime. Sites xác nhận version 1 gắn với commit trên.
- `manifest.json` lưu URL, dung lượng, SHA-256 và kết quả so với source từng ảnh.
- `source-v1.tar` giữ toàn bộ source của version 1 để phục hồi hoặc tra cứu.
- Đây là backup local; không tự đưa ảnh này trở lại catalog hoặc deploy.

## Chú thích thuật ngữ

- **SHA-256**: mã kiểm tra nội dung file, dùng xác minh bản sao không đổi.
- **Source commit**: phiên bản Git gắn với bản site đã phát hành.
