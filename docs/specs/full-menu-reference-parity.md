---
title: Menu mở — đối chiếu Espacio
type: frontend
status: accepted
updated: 2026-09-24
notion: none
related_decisions: []
related_reports:
  - ../verification/menu-reference-parity-2026-09-24.md
---

# Menu mở — đối chiếu Espacio

## Mục tiêu và phạm vi

Owner đã xác nhận ngày 2026-09-24: phần đầu menu và tất cả nhóm liên kết
theo bố cục Espacio ở cùng viewport. Giữ logo, tỷ lệ logo, font hiện có,
nội dung VI/EN, bốn nhóm, CTA Zalo và các route của Trường Thịnh.
Không thay navbar khi menu đóng, gallery, footer hoặc motion ngoài menu.

## Đo trực tiếp ngày 2026-09-24

Nguồn: https://espaciohomedesign.com/en/projects, menu đang mở, Chromium
trong Codex. Đơn vị CSS px. Đây là phép đo viewport giả lập, không phải
bằng chứng thiết bị vật lý.

| Viewport | Cao đầu menu | Logo cao; vị trí x/y | Bố cục nhóm | CTA |
| --- | --- | --- | --- | --- |
| 1567×910 | 137,516 | 67,516; 35/35 | 4 cột | Có chữ, vùng riêng trước X |
| 1200×910 | 109,578 | 59,578; 25/25 | 3 cột | Có chữ |
| 1024×910 | 109,578 | 59,578; 25/25 | 3 cột | Có chữ |
| 768×910 | 109,578 | 59,578; 25/25 | 2 cột | Ẩn như reference |
| 390×844 | 226,969 | 59,578; 25/25 | 1 cột | Hàng riêng, có chữ |

Desktop 1567: ngôn ngữ reference x590,297, CTA x1057,141, nút X x1492.
Local đang có đầu menu rộng1557 thay vì1567, ngôn ngữ x630,781,
CTA x1305,328, nút X x1472. Logo local đã đúng chiều cao67,516.

Nhóm reference: số thứ tự12,8/17,92px; tiêu đề28,8/40,32px;
link con13,6/19,04px trong dòng22,4px. Khoảng số→tiêu đề15px,
tiêu đề→danh sách30px, dòng liên kết cách nhau15px.
Local tiêu đề đang24px và dòng liên kết chỉ cao19,04px.

## Contract sửa

1. Đầu menu phủ đủ bề ngang, không mất thêm bề rộng scrollbar. Các vùng
   logo/ngôn ngữ/CTA/X phân bổ theo reference; logo giữ tỷ lệ riêng nên
   không bắt chiều rộng bằng logo Espacio. Hai locale không tạo cột giả.
2. Chiều cao logo và lề theo từng band reference; logo không ép biến dạng.
   CTA không dính X. Mobile giữ chữ CTA trên hàng riêng; tablet ẩn CTA ở
   band tương ứng reference, các đường liên hệ hiện hữu vẫn giữ nguyên.
3. Nhóm chuyển 4/3/2/1 cột theo breakpoint reference xác minh khi triển khai.
   Nhịp số, tiêu đề, link và divider khớp mẫu; chiều cao theo nội dung thật,
   không thêm mục hay hàng giả để bù cho tám nhóm của Espacio.
4. Giữ font Trường Thịnh; chữ Việt/Anh dài được xuống dòng tự nhiên,
   không clip, co glyph hoặc chồng cột. Sai số geometry tương ứng tối đa1px
   ở các điểm đo; chiều rộng chữ và chiều cao phát sinh do wrap là ngoại lệ
   có ghi nhận vì font, số mục và nội dung khác reference.
5. Giữ dialog/focus/Escape, scroll lock và vị trí trang sau đóng menu.
   Resize khi mở không mất mục, không khóa cuộn menu hoặc cuộn nền.

## Source, style và lệnh

- CSS menu chung: `src/site/style.css`; chỉ sửa selector menu.
- Kiểm tra markup menu trong các HTML `src/site/` và lifecycle trong
  `src/site/motion.js`; không thêm component hoặc dependency mới chỉ để sửa geometry.
- Theo CSS hiện có, ví dụ `.menu-group__title { line-height: 1.4; }`;
  comment source bằng English, không đổi logo SVG path hoặc nội dung.
- Build: `pnpm prepare:site`; static gate: `pnpm qa:static`.
- Focused responsive test đặt trong `tests/site/`; đo desktop/mobile VI/EN,
  trước và sau resize, menu mở/đóng. Không chạy full parity ngoài phạm vi.

## Kiểm chứng trước nghiệm thu

- Width320,360,390,578,579,750,768,960,961,1024,1200,1201,1567 và1920;
  thêm landscape844×390 và text zoom200% để kiểm overflow.
- Đối chiếu live reference cùng viewport, kiểm thêm hai phía breakpoint.
- Năm route cấp cao VI/EN reuse cùng menu; kiểm focus, Escape, touch scroll,
  reduced motion, mở/đóng sau chuyển route, không đổi navbar đóng.
- Chụp desktop/mobile, kiểm Impeccable detect sau sửa; báo riêng giới hạn
  thiết bị vật lý và mọi sai biệt có chủ đích. Không suy ra full-site PASS.

## Trạng thái

Owner đã duyệt đặc tả và plan ngày 2026-09-24. Đã sửa CSS menu chung.
Focused checks đạt; [evidence](../verification/menu-reference-parity-2026-09-24.md).
Contract liên kết với
`docs/specs/frontend-brand-shell-responsive-runtime.md`; plan ở `tasks/plan.md`.
Chữ hai locale căn theo cạnh vùng ngôn ngữ; CTA căn giữa vùng riêng nên
tọa độ trái khác reference theo chiều rộng copy. Logo chỉ khớp chiều cao và
vị trí, không ép chiều rộng. Menu-group thêm15px cuối danh sách như khoảng
cuối option của reference. Nội dung dài được wrap; không coi wrap là lỗi parity.

## Chú thích thuật ngữ

- **Viewport**: vùng nội dung trình duyệt.
- **Band**: khoảng chiều rộng dùng cùng bố cục responsive.
- **Geometry**: kích thước và vị trí phần tử.
- **Wrap**: chữ tự xuống dòng.

