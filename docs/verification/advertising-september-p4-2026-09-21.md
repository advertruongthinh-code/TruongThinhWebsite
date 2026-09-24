---
title: Advertising AD-SEPT-2026-P4 — correction Flow, cột 4 và morph backdrop
type: verification
status: current
updated: 2026-09-21
scope: P4-T01–P4-T05
related_specs:
  - ../specs/advertising-skeleton-flow.md
  - ../specs/advertising-photo-browse.md
  - ../specs/advertising-photo-morph-scroll.md
---

# Advertising AD-SEPT-2026-P4 — correction Flow, cột 4 và morph backdrop

## Kết luận

P4-T01–P4-T05 đạt technical gate trên local build. Skeleton dùng batch không
lặp preset, hoán vị anchor, phase riêng và hướng được shuffle theo cặp đối
nghịch; viewport-entry replay cùng contract `600ms ease-out` của card grid.
Detail N4/span3 luôn ghim ảnh related đầu tại cột 4, còn các ảnh sau nằm dưới
primary. Backdrop zoom-blur chỉ chạy trong lifecycle của photo morph tương ứng.

Không commit, push hoặc deploy. P3-T08 vẫn mở: dev UI chỉ dùng local qua
`?skeleton-dev=1`, chờ owner duyệt JSON rồi mới xóa trước ship. Full
`pnpm qa:site` và canonical Espacio parity vẫn `NOT PASS` ngoài scope P4.

## Nguyên nhân và correction

1. Allocator cũ chọn riêng từng skeleton và cùng clock; các frame có thể trùng
   preset hoặc cùng điểm xuất phát. P4 cấp preset không hoàn lại, permutation và
   phase riêng; direction theo cặp đối nghịch đã shuffle. Assignment gắn với slot
   để resize N4→N3→N4 giữ các slot chung, còn lifecycle mới reset toàn batch.
2. Solver N4/span3 có thể bỏ nhánh cạnh primary khi terminal gate không đạt rồi
   chuyển cả pool xuống dưới. P4 ghim ảnh related đầu ở cột 4 trước khi solver
   xếp phần còn lại dưới primary. Hash geometry gồm đầy đủ media và kích thước
   card ghim; diagnostics ghi đúng `pinned-head-below-primary`.
3. Backdrop từng animate ngay khi render detail, kể cả direct load hoặc không có
   morph hợp lệ. P4 chỉ tạo backdrop animation sau khi morph thật được tạo và
   dùng chung cancel, finish, retarget, duration cùng owner lifecycle.

## Evidence

| Gate | Kết quả |
| --- | --- |
| `pnpm prepare:site` | PASS; source được copy, 6 detail page được sinh, copy VI/EN được embed |
| `pnpm qa:static` | PASS |
| Skeleton unit | PASS; 12 preset, 12 permutation, phase riêng, direction gần cân bằng và không khóa alternating |
| Skeleton browser | PASS; VI/EN, desktop/mobile, reload/filter/detail/history, N4→N3→N4, replay hai lần, reduced motion, 20 remount và detached RAF |
| Skeleton performance | PASS; probe 5 giây giữ `>=30fps`, không long task renderer `>50ms` |
| Related layout | 15/15 PASS; 1.392 authored case và sweep R10 trên 429 pool N4 khác rỗng, trong budget `300.000` |
| Exact URL `kiosk-posm-30 + use-sampling` | PASS tại `1569×912`; ảnh đầu `left=3`, `y=0`, ba ảnh còn lại dưới primary, overflow `0`, console error `0` |
| Morph backdrop | PASS; direct/reduced tĩnh, grid/related/Back/Forward/rapid retarget cùng lifecycle `300/400ms` |
| Source/output SHA-256 | PASS cho `catalog-runtime.mjs`, `skeleton-flow.mjs` và `detail.css` sau build |
| Impeccable detect | Exit `0`; chỉ còn finding `transition: width` có trước ở stylesheet chung, không thuộc delta P4 |
| Independent review | Không còn finding Important hoặc Minor; Ponytail: `Lean already` |

Probe review riêng xác nhận direction không còn mẫu xen kẽ cố định, mọi prefix
chênh tối đa một. Khi giảm chiều cao pinned media, `coordinateHash` đổi từ
`8ca745d1` sang `113a98b4`; cache geometry không còn bỏ sót thay đổi card ghim.

Source và `.site-output` khớp SHA-256 sau `prepare:site`:

| Path | SHA-256 |
| --- | --- |
| `src/site/advertising-products/catalog-runtime.mjs` | `DED60834EA5986CBC57C73B8640960AC799D4FFB0BCDC55CC08B3AE7A8F5CB8A` |
| `src/site/advertising-products/skeleton-flow.mjs` | `7A5F166CA772693659B7239784820FB276BDA5446373CD43FED7380ED0A15454` |
| `src/site/detail.css` | `100218D0C0DCD38865CC3D6D58674599D5914ADBD2C89EF4D950441E5389100B` |

Ba card Notion `skeleton-flow`, `photo-morph-scroll` và detail Advertising đã
được cập nhật technical gate P4 cùng link Git canonical; trạng thái vẫn
`In progress` theo human gate hiện hành.

## Khả năng tái lập khi số card tăng

Chỉ tăng số card không làm cột 4 trống trở lại: invariant ghim ảnh đầu chạy trước
solver, còn card dư chỉ vào phần dưới primary. Sweep hiện hành bao phủ toàn bộ
pool authored khác rỗng. Solver phần đuôi vẫn giữ budget `300.000`; nếu data
tương lai vượt feasibility hoặc budget thì runtime fail rõ thay vì âm thầm bỏ
cột 4. Dataset mới vẫn phải chạy lại sweep R10 trước nghiệm thu.

## Human gate còn mở

Owner reload exact URL và kiểm motion skeleton, cột 4 cùng morph backdrop trên
preview local. Card Notion vẫn `In progress` vì owner visual gate và P3-T08 chưa
đóng; technical gate P4 không tự cấp quyền ship.

## Chú thích thuật ngữ

- **Batch**: tập skeleton assignment của một Advertising state ổn định.
- **Prefix**: phần đầu của chuỗi assignment đang được một viewport sử dụng.
- **Pinned card**: card được đặt trước solver để giữ invariant cột 4.
- **Owner lifecycle**: cùng đối tượng sở hữu start, cancel và finish của motion.
- **Technical gate**: kiểm thử kỹ thuật trong phạm vi, chưa thay owner visual gate.
