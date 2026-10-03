---
title: Photo morph ổn định khi cuộn viewport
type: frontend
status: accepted
updated: 2026-09-30
notion: https://app.notion.com/p/3e0332849a0e8178a964de1dd951db71
related_decisions: []
related_reports: []
---

# Photo morph ổn định khi cuộn viewport

## Phạm vi sau M02b

[M02b](site-media-card-playback.md) supersede toàn bộ yêu cầu clone, morph,
backdrop animation và scroll lease giữa masonry/related card với primary detail,
bao gồm click, Back/Forward và chuyển detail A↔detail B. Các correction R2–R5
và nhịp 300/400ms trước đây chỉ còn là lịch sử, không là gate runtime.
Điều hướng đổi view trực tiếp, giữ đúng photo/media, focus và entry scroll;
không kéo viewport để lộ card ngoài màn hình. Nền primary giữ tĩnh và chỉ
đổi source khi primary media đổi. Morph primary↔viewer vẫn theo
[photo browse](advertising-photo-browse.md) và không bị M02b thay thế.

## Lịch sử quyết định đã bị supersede

| Ngày | Quyết định lịch sử | Trạng thái |
| --- | --- | --- |
| 2026-09-20 | Đổi clone fixed sang document coordinates; khóa wheel/touch/key trong morph | Superseded bởi M02b |
| 2026-09-21 | R3 phát lại clone khi Back/Forward, R4 nền chạy cùng clone, R5 erase/blur/linger | Superseded bởi M02b |
| 2026-09-28 | Delta history yêu cầu clone hai chiều cả card ngoài viewport | Chỉ giữ entry scroll và photo/media identity bên dưới |

<a id="advertising-history-motion--accepted-2026-09-28"></a>

## Delta browser history và vị trí cuộn còn hiệu lực

Gọi T0 là masonry với logical scroll Y0, T1 là detail cùng photo ID với
logical scroll Y1. Trước khi rời mỗi entry, lưu scroll và media đang active.
Back tới T0 phục hồi Y0 và media masonry; Forward tới T1 phục hồi Y1 và
media primary. Cùng viewport, sai lệch sau settle tối đa 1 CSS px cho từng
entry kể cả Y0 khác Y1, không hiện frame ở scroll của entry kia. Nếu viewport
đổi thật, dùng anchor/offset tương đối theo contract hiện hữu. Restore không
thêm history entry, không thêm URL media param và không tự cuộn tới card.

Card trong/ngoài viewport hoặc bị virtualization không làm thay photo/media ID,
không sinh clone và không giữ input/scroll lock. Direct load hoặc reload URL
photo bắt đầu bằng cover. Reduced motion vẫn giữ cùng state và focus.

| Ca nghiệm thu focused | Bằng chứng bắt buộc |
| --- | --- |
| Grid T0/Y0 → detail T1/Y1 → Back → Forward, Y0 khác Y1, VI/EN | Đúng URL, photo/media, scroll mỗi entry lệch tối đa 1 CSS px, không thêm entry hoặc frame nhảy |
| Card trong viewport, ngoài phía trên/dưới; desktop smooth và mobile native scroll | Không clone card↔detail hoặc cuộn bổ sung; đúng card/media khi virtualized/remount |
| Back/Forward nhanh, ảnh tải chậm/lỗi, reduced motion; detail A↔detail B | Đúng entry cuối, không clone/backdrop lease còn sót, không lỗi console/network mới |

Chạy focused RED/GREEN trên cùng candidate local, ghi source/build/served hash
và kiểm visual tại cùng viewport. Khảo sát tab lỗi cũ 8790 không thay bằng
bằng chứng của candidate 8792.

## Chú thích thuật ngữ

- **Entry scroll**: vị trí cuộn được lưu riêng cho một mục trong browser history.
- **Logical scroll**: vị trí cuộn do runtime sử dụng sau khi quy đổi smooth/native.
- **Morph viewer**: chuyển tiếp riêng giữa ảnh primary và dialog phóng to.
