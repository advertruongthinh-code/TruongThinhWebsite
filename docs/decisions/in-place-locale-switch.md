---
title: Chuyển locale tại chỗ và replay section đang xem
status: accepted
date: 2026-08-21
scope: public website
supersedes:
  - stable-shell-locale-transition.md
related_specs: []
related_reports: []
---

# Chuyển locale tại chỗ và replay section đang xem

## Decision

Locale control trong full-menu không chạy route transition, không fetch document
khác và không reload trang. Sau khi menu hoàn tất close motion, runtime:

1. Giữ nguyên DOM container và vị trí scroll chính xác.
2. Đồng bộ Barba history state hiện tại rồi đổi prefix `/vi/` hoặc `/en/` bằng
   `history.replaceState()`; giữ query, bỏ fragment và không tạo thêm history
   entry.
3. Dịch text cùng accessible attribute từ dữ liệu song ngữ đã có trong DOM.
4. Chọn section có diện tích hiển thị trong viewport lớn nhất; chỉ restart motion
   của section đó. Section không có motion target là no-op, không báo replay giả.
5. `prefers-reduced-motion: reduce` đổi locale và final state ngay, không tạo
   entrance motion mới.

Build static nhúng giá trị tiếng Việt `data-vi` cạnh `data-en` để direct load URL
tiếng Anh vẫn đổi ngược sang tiếng Việt mà không cần request. Font, word spacing,
line-height, navbar và thiết kế motion hiện hữu không đổi.

## Hệ quả

- Copy hoặc refresh URL sau khi đổi locale vẫn mở đúng locale.
- Nút Back không dừng ở một entry chỉ khác locale.
- Internal link trong shell được đồng bộ prefix locale ngay trên document hiện
  tại.
- Worker render cả hai locale của field CMS vào DOM. CMS tương lai phải giữ
  contract này; không được thêm fetch lúc bấm locale.

## Chú thích thuật ngữ

- **Locale**: ngôn ngữ và biến thể nội dung của route.
- **History entry**: một mốc URL trong lịch sử Back/Forward của browser.
- **No-op**: thao tác kết thúc mà không đổi visual state vì không có target.
- **Replay**: reset rồi chạy lại motion từ trạng thái đầu.
