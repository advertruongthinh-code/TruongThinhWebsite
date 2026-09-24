---
title: Advertising AD-SEPT-2026-P5 — continuous masonry và motion correction
type: verification
status: current
updated: 2026-09-22
scope: P5-T01–P5-T07
related_specs:
  - ../specs/advertising-photo-browse.md
  - ../specs/advertising-skeleton-flow.md
  - ../specs/advertising-photo-morph-scroll.md
---

# Advertising AD-SEPT-2026-P5 — continuous masonry và motion correction

## Kết luận

P5-T01–P5-T07 đạt technical gate trên local build. Parent và detail dùng cùng
quy tắc shortest-frontier theo source order; detail N4/span3 lấp cột 4 tại
`y = 0`, sau đó tiếp tục trong cùng coordinate space. Portal homepage,
Advertising grid/related và suggestion dùng chung media-hover `1.15`, `600ms
ease-out`. Skeleton vào viewport bằng opacity-only, không hover và chỉ fade tại
ranh giới global của batch. Backdrop photo morph xóa về nền trắng đúng mốc 25%
của foreground duration, tiếp tục zoom-blur và linger thêm `200ms` trong khi
scroll đã được trả tại foreground settle.

Không commit, push, deploy hoặc ship. P3-T08 vẫn mở: dev Flow UI còn dùng local
qua `?skeleton-dev=1`, chờ owner duyệt JSON rồi mới xóa vật lý trước ship. Full
`pnpm qa:site` và canonical Espacio parity vẫn `NOT PASS` ngoài scope P5.

## Nguyên nhân và cách sửa solver

Nhánh tail cũ ngừng ép shortest column khi số card còn lại nhỏ hơn hoặc bằng
`2 × columns`; đồng thời điểm `staggerViolations` được xếp trước `y`. Vì vậy
solver có thể chọn cột cao hơn, đổi source order hoặc rơi sang fallback đẩy cả
pool xuống dưới primary.

P5 chỉ xét card kế tiếp trong source order, lọc mọi placement hợp lệ về
frontier có `y` nhỏ nhất rồi tie-break theo cột trái. `continuousDetail` không
còn bị terminal photo-peek cũ ép ra khỏi branch alongside. Stagger trang trí có
thể dùng aligned fallback nhưng không được thắng continuity. Kết quả giữ danh
sách `diagnostics.placementOrder` để oracle replay đúng thứ tự allocator, trong
khi mảng placement vẫn xếp theo vị trí nhìn thấy để virtual window hoạt động.

Khi số card tăng, lỗi cũ không tái lập theo cùng code path: invariant source
order và minimum frontier chạy ở mọi depth, không chỉ phần đầu pool. Sweep hiện
hành phủ toàn bộ authored pool N4 và 1.392 hero/tag/photo-only case; operation
budget vẫn `300.000`. Data mới vẫn phải chạy lại sweep trước nghiệm thu. Nếu
không còn placement hợp lệ hoặc hết budget, solver fail rõ thay vì tự bỏ cột 4.

## Evidence

| Gate | Kết quả |
| --- | --- |
| `pnpm prepare:site` | PASS; copy source, sinh 6 detail page và embed copy VI/EN |
| Layout Node | 41/41 PASS; gồm product, photo geometry, one-column và 1.392 authored case |
| Photo browser geometry | 3/3 PASS trên 20 nhóm viewport; VI/EN, N1–N4, outer gap và overflow |
| Exact route `led-displays-lightboxes-01` | PASS tại `1569×912`; top/left/right gap đều `35px`, N4/span3, card đầu ở cột 4, overflow `0` |
| Shared hover | PASS VI/EN parent/detail, pointer, keyboard, touch và reduced motion |
| Skeleton unit/browser | PASS; WebGL contract, devtools parser, viewport entry và global boundary fade |
| Photo transitions | 18/18 PASS; grid, related, Back/Forward, rapid retarget, linger-scroll, viewer và skeleton isolation |
| Media virtualization | 15/15 PASS trên inventory hiện hành 115 ảnh; đợi đúng node unmount/remount, replay media và giải phóng WebGL context |
| Media entrance | 10/10 PASS; entrance thường/reduced-motion, Barba readiness VI/EN desktop/mobile và history remount |
| Static contract | PASS |
| Console/network exact route | Không có console error/warn; 37/37 request trả `200`; DevTools ghi một issue ảnh lazy thiếu dimension ngoài delta P5 |
| Source/output SHA-256 | PASS cho layout core, catalog runtime, detail CSS và shared style |
| Independent review | PASS; không còn finding Critical/Important, `git diff --check` sạch |

Capture cuối:
`.tmp/orchestration/p5-20260921-143135/exact-route-final-1569x912-v2.png`.
Transition evidence:
`.tmp/orchestration/p5-20260921-143135/transitions-final3/cp3-transition-e2e-results.json`.
Photo geometry evidence:
`.tmp/orchestration/p5-20260921-143135/photo-view-final2/latest.json`.

Source và `.site-output` khớp SHA-256 sau `prepare:site`:

| Path | SHA-256 |
| --- | --- |
| `src/site/advertising-products/layout-core.mjs` | `3F74364EF2DE210FEF60D7F96F9432B7B64016E429CDCBA42DF9CD561E7C5EC7` |
| `src/site/advertising-products/catalog-runtime.mjs` | `1BDE434764D2A9282E8FA2889CB10D1616E5A6C731D3818DA9441F99975F0944` |
| `src/site/advertising-products/skeleton-flow.mjs` | `B35F4F99DC8BAFB24ACC9D6FBCB6BBA7E3F62996EC296AB63701C12DDAD9BBDE` |
| `src/site/detail.css` | `C4FB3BB0431186E136DE1007A6C14ADA4BEF8A296389155F5ECBC9A4B6727A9E` |
| `src/site/style.css` | `7D5A9F99CEF76831CFD607DBC1C96B1CD4A39403AE206097DB8ED19524018040` |

## Human gate còn mở

Owner kiểm local preview cho continuous masonry, hover dùng chung, skeleton
global fade và white-erase/linger. Ba card Notion giữ `In progress` vì owner
visual gate và P3-T08 chưa đóng; technical gate P5 không tự cấp quyền ship.

## Chú thích thuật ngữ

- **Shortest frontier**: vị trí hợp lệ có mép trên nhỏ nhất trong grid.
- **Aligned fallback**: phase cho phép cạnh ảnh thẳng hàng khi stagger trang trí
  không tương thích với continuity.
- **White erase**: đoạn backdrop trong suốt để lộ nền trắng của hero frame.
- **Technical gate**: kiểm thử kỹ thuật trong phạm vi, chưa thay owner visual gate.
