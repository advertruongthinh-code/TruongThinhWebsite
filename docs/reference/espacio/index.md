---
title: Baseline tham chiếu Espacio
type: reference-baseline
status: candidate-composite-baseline
snapshot_id: ESPACIO-R1-20260902
snapshot_cutoff: 2026-09-02
---

# Baseline tham chiếu Espacio

Đây là candidate baseline tổng hợp cho R1, định danh corpus evidence đã kiểm.
Owner đã duyệt migration docs, chưa có quyết định riêng khóa chính xác ID/cutoff
này thành baseline revision. Espacio vẫn là định hướng 1:1 đã chốt; candidate
không thay accepted target hoặc tự theo dõi live. Nó không phải ảnh chụp đồng
thời và không tự theo dõi website live. Corpus gồm archive crawl ngày
`2026-08-08`, các phép đo live ngày `2026-08-27` và `2026-08-30`, cùng lượt
kiểm tra đủ 45 route ngày `2026-09-02`. Mỗi observation giữ ngày, route,
viewport, method, unit, source section và status riêng trong
[measurement index](evidence.md).

## Identity và provenance

| Trường | Giá trị | Giới hạn diễn giải |
| --- | --- | --- |
| Snapshot ID | `ESPACIO-R1-20260902` | ID corpus tổng hợp đề xuất; chưa là owner-locked baseline revision |
| Archive capture | `2026-08-08`, `Asia/Bangkok` | Cố định local archive; không chứng minh current live cho mọi URL |
| Live navbar/typography | `2026-08-27` | Chrome DevTools/Playwright theo matrix riêng của từng report |
| Live project cards/templates | `2026-08-30` | DevTools tại `/en/projects`, sáu route đại diện và archive parse |
| Route closure | `2026-09-02` | Kiểm tra đủ 45 project route; chỉ xác nhận structure/template family |
| Raw provenance | `research/reference-site/archive/` và `research/reference-site/runtime-evidence/` | Research/raw lifecycle; không phải production source |
| Canonical parity status | `NOT PASS` | Giữ theo machine report; baseline không nâng verdict |

Bundle live và archive được đối chiếu byte-for-byte tại các report có nêu hash:
JS `91f971d6f6a2f9829660f9422789ed6fb311fa915040820d16dd192ecf6b064c`, CSS
`b3cb9abf01889550121da4ebd11513ec4d7cc746f4a2672ba3d76871451c1296`. Đây là
provenance của corpus và source đọc được tại thời điểm đo; không phải lời
khẳng định website chưa đổi sau cutoff.

## Cách đọc và authority

Ba lớp phải được giữ riêng:

1. **Espacio measured**: observation từ live/archive, có measurement ID trong
   [evidence](evidence.md). Đây là reference, không phải target bắt buộc.
2. **Trường Thịnh accepted**: contract đã owner duyệt trong spec/decision,
   được dẫn link và gắn nhãn `accepted`.
3. **Trường Thịnh observed**: geometry, runtime hoặc gap thấy trong local
   report, gắn nhãn `observed`, `not measured` hoặc `blocked`; không tự biến
   thành accepted design.

`docs/reports/research-espacio-layout-motion-parity.md` vẫn là machine sink và
nguồn canonical cho parity status. Hai report `-pilot` và `-targeted` là subset
lịch sử; `pass` trong subset không đóng coverage. `research-espacio-motion-audit.md`
và bốn CSV motion vẫn do generator/runner sở hữu. Không move, rename, sửa
format hoặc archive các sink trong slice baseline này.

## Điều hướng

| File | Nội dung |
| --- | --- |
| [evidence.md](evidence.md) | Measurement register, report section, artifact, status và blocker |
| [foundations.md](foundations.md) | Viewport, breakpoint, geometry, spacing và typography |
| [components.md](components.md) | Header/menu, hero, card/grid, block và source ownership |
| [motion.md](motion.md) | Route/menu/scroll/hero/hover/filter contracts và coverage |
| [templates.md](templates.md) | Espacio `proyecto` family, variants, block frequency và geometry |

## Source register cố định

| Source | Section dùng trong baseline | Vai trò |
| --- | --- | --- |
| [parity inventory](../../archive/reports/research-espacio-parity-inventory.md) | §2, §3, §4, §4.1, §5, §6, §6.1, §8, §9 | Route, component, geometry, interaction và limitation; có cả TT observed |
| [layout-motion parity](../../reports/research-espacio-layout-motion-parity.md) | `Layout parity`, `Motion parity`, `Navbar parity`, `Hover/focus parity`, `Missing coverage` | Canonical contract, coverage `864`, blocker và `NOT PASS` |
| [pilot](../../reports/research-espacio-layout-motion-parity-pilot.md) | `Runtime summary`, `Owner-approved exclusions`, `Missing coverage` | 7/7 measured pass trong subset, 2 excluded, coverage blocked |
| [targeted](../../reports/research-espacio-layout-motion-parity-targeted.md) | `Layout parity`, `Motion parity`, `Navbar parity`, `Hover/focus parity`, `Runtime summary`, `Fail detail` | Subset cũ có 3 pass, 4 fail, 1 blocked; không dùng thay canonical |
| [motion audit](../../reports/research-espacio-motion-audit.md) | §2–§7, `Phase B applicability`, `Phase C-E runtime`, `Bổ sung card dự án` | Resource/candidate ledger và runtime obligation; machine-owned |
| [navbar runtime](../../archive/reports/research-espacio-navbar-runtime-2026-08-27.md) | §1–§9 | Shared navbar live measurement ngày 2026-08-27 |
| [typography/hero](../../archive/reports/research-espacio-typography-hero-route-motion-2026-08-27.md) | `Phạm vi và ánh xạ`, `Kết quả typography reference`, `Hero và scroll cue`, `Evidence local current source` | Typography, hero và route veil ngày 2026-08-27 |
| [project templates](../../archive/reports/research-espacio-project-detail-templates-2026-08-30.md) | `Kết luận`, `Phương pháp`, `Cấu trúc chung`, `Kiểm chứng live`, `Giới hạn` | 45 route, template family và variants ngày 2026-08-30/09-02 |
| [motion map gốc](../../archive/guides/motion-map.md) | `Ánh xạ shell`, `Chuyển route`, `Header`, `Full-menu`, `Motion của content`, `Reduced motion` | Historical mixed map; chỉ dùng khi entry gắn rõ Espacio source-derived hoặc TT accepted |

## Status và giới hạn bắt buộc

| Status | Nghĩa trong baseline |
| --- | --- |
| `measured` | Có observation trực tiếp, ghi đủ provenance trong evidence register |
| `source-derived` | Đọc từ bundle/archive/source đã khóa; chưa phải runtime observation mới |
| `accepted` | Owner đã duyệt contract Trường Thịnh; không phải Espacio measurement |
| `observed` | Thấy trong local runtime/source; không phải target hoặc acceptance |
| `inferred` | Suy luận có giới hạn; không dùng làm fact tương đương measured |
| `not measured` | Scope đã biết nhưng chưa có observation tương ứng |
| `blocked` | Có lane bắt buộc nhưng thiếu target/protocol/runtime hoặc môi trường |
| `excluded-with-reason` | Owner-approved exclusion; không phải pass |

Coverage pairwise có `864` scoped candidate; mỗi candidate chưa map vẫn là
blocker. Motion audit V2 có `429`
confirmed và `1.701` blocked trên `2.130` obligation, trong đó live Espacio
không có row motion-confirmed. Navbar có `555/556` predicate đạt nhưng một
probe inconclusive và `39` sitemap URL trả `404`. Các giới hạn này là một phần
của baseline, không được rút gọn thành PASS khi synthesis.

## Chú thích thuật ngữ

- **Baseline composite**: baseline tổng hợp từ nhiều đợt capture có provenance riêng.
- **Machine sink**: path cố định do generator hoặc runner đọc/ghi.
- **Reference**: nguồn để đối chiếu, không tự là target implementation.
- **Source-derived**: fact đọc từ source/archive, chưa phải phép đo runtime mới.
- **Coverage**: phần obligation/candidate đã có phép đo hợp lệ.
- **Cutoff**: mốc cuối của corpus được phép dùng trong baseline này.
