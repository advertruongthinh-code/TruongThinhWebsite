---
title: Kiểm chứng H00 history scroll và offscreen photo morph
type: verification
status: partial
updated: 2026-09-28
---

# H00 — local 8792 không tái hiện lỗi

[Delta 13](../specs/advertising-photo-morph-scroll.md#advertising-history-motion--accepted-2026-09-28)
và [plan H00–H03](../../tasks/plan.md#advertising-history-motion--plan-draft-2026-09-28)
đã được owner duyệt. H00 chạy đúng candidate local `8792`, HEAD
`e6cf065161cb19a8b59dd9efa8cda5d4af27fba1`, Chromium Playwright 1.63,
viewport `1543×884`, normal motion, EN và VI. Fixture dùng card
`signage-raised-letters-18` ban đầu dưới viewport, grid entry `Y0=0`, detail
entry `Y1=480`. Không sửa product source hoặc build.

Case `history-entry-scroll-offscreen-morph` PASS ở cả hai locale. Back trả grid
về `Y0`, Forward trả detail về `Y1`; mỗi frame clone được lấy mẫu giữ scroll
đúng entry. Ảnh clone đúng photo ID/source, đi giữa card offscreen và primary
`[data-advertising-photo-image]` hai chiều trong `400ms`, endpoint sai số
`≤1 CSS px`; không thêm history entry hoặc clone thứ hai. Seed, category, tag,
locale và focus giữ đúng; console/page error và network failure đều rỗng.

| Locale | Card dưới viewport khi bắt đầu | Frame clone giao viewport Forward/Back | Video |
| --- | ---: | ---: | --- |
| EN | top `2802px` | `14/3` | Ảnh bay qua viewport khoảng `2.0s` |
| VI | top `1588px` | `17/7` | Ảnh bay qua viewport khoảng `4.4s` |

Frame probe còn lưu computed paint của clone và ancestor: opacity dương,
visibility visible, display khác none tại pha giao viewport. Video Playwright
`6.24s` và contact sheets đã xem bằng Chromium; frame EN `010.png` và VI
`022.png` cho thấy chính ảnh signage ở giữa hành trình. Thời gian frame PNG
tính theo video, chưa đối chiếu chính xác với timestamp từng rAF trong JSON.
Đây là bằng chứng visual trên candidate `8792`, không là kết luận về tab gốc
`8790`.

Raw tại `.tmp/advertising-history-motion/H00-en-vi-video-20260928T054002442Z/`;
không ghi đè JSON/video qua các lần retry.
`cp3-transition-e2e-results.json`, `video/page@b337ff605b3079cf42c659f09eff3d98.webm`,
`contact-first.png`, `contact-last.png`, `video-frames/`, và
`h00-provenance.json` giữ kết quả, ảnh và SHA. Runner SHA-256
`671b7a7d83973247865c6e595db95953f8256949a4267e8442eedba5cc5b77ed`;
video SHA-256 `e9ce3a0ababec2d7e3cd890ab7c60e4e47a277d9f3cc32d6a01a78d874ac52b4`.
Runner SHA được ghi hậu kiểm lúc `05:42:58Z`; mtime file test
`05:39:39Z` trước khi run bắt đầu `05:40:02Z`, không có pre/post hash attestation
cho runner trong chính lần chạy này.
Catalog source/build/served cùng SHA `1642d4ba23159dc4ae266133bc5e1e9068fbf8c3f8b17bd3ca7f90d5413090e3`;
motion source/build/served cùng SHA `df68c1b99b18219ac998a3f95f8139ec5efd008eb6801c91d6f8e19e`.
Hai raw trước đó giữ riêng: một browser launch failure do executable path,
một PASS với oracle yếu hơn; không gắn nhãn product RED.

Giới hạn: mới kiểm card dưới viewport, desktop Chromium, EN/VI, `Y0=0/Y1=480`.
Chưa kiểm card trên viewport, mobile-width/native scroll, reduced motion,
media failure, rapid traversal hoặc full runner. Browser in-app không trả tab
gốc `8790`; recovery candidate ở port đó khác byte source, nên nguyên nhân
owner báo chưa xác minh. H00 không tạo named RED trên `8792`, vì vậy H01 sửa
source và H02–H03 chưa chạy. L06 landscape vẫn RED độc lập do hai lỗi viewer EN
sau touch và một CDN load failure.

Owner có thể mở preview VI đúng photo tại
`http://127.0.0.1:8792/vi/advertising-products/?category=signage-raised-letters&photo=signage-raised-letters-18`.
Để tạo history grid↔detail, mở route grid cùng category trước, chọn card `18`,
cuộn detail rồi dùng Back/Forward; mở trực tiếp URL photo không tạo grid entry.

## Chú thích thuật ngữ

- **Entry**: một mục trong lịch sử browser, giữ vị trí scroll riêng.
- **Clone**: ảnh tạm bay giữa card và primary trong chuyển cảnh.
- **Raw**: file kết quả gốc và video của một lần chạy, không ghi đè khi retry.
