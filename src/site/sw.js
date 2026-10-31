// Bỏ hiện ảnh theo ngưỡng (owner 2026-10-31: ảnh chỉ hiện khi tải xong): site không còn đăng ký Service Worker.
// Bản này chỉ gỡ Service Worker đã cài ở máy khách từ trước; header no-cache nên tab nhận ngay lần kiểm cập nhật sau.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.registration.unregister()));
