---
title: Brand lockup typeset R4
type: frontend
status: accepted
updated: 2026-09-20
notion: https://app.notion.com/p/3e0332849a0e8147a613d929612f5bd3
related_decisions: []
related_reports:
  - ../verification/brand-lockup-logo-r3-2026-09-10.md
---

# Brand lockup typeset R4

## 1. Vấn đề và kết quả

### Vấn đề

Runtime hiện tại có tỷ lệ chiều cao thân chữ subtitle/title khoảng `17/37 =
45,9%`. Owner muốn subtitle lớn hơn, gap nhỏ hơn nhưng giữ footprint và toàn bộ
quy luật `4Y`.

### Kết quả mong muốn

Subtitle đạt `61,8%` chiều cao thân title, hai dòng bằng chiều ngang thị giác,
dấu tiếng Việt không clip và khối chữ vẫn cao `4Y`.

| Trong scope | Ngoài scope |
| --- | --- |
| Font size, tracking, baseline/gap, SVG canonical và consumer VI/EN | Đổi mark, font family, weight, copy, footprint hoặc logo motion |

## 2. Constraint và câu hỏi mở

- Đo tỷ lệ thân chữ không tính dấu; bounding box layout và clip phải tính đủ dấu.
- Khối title + gap + subtitle cao `4Y`; padding trên/dưới mark bằng `Y`.
- Khoảng ngang mark–chữ bằng `Y`.
- Hai dòng cân mép trong tolerance `0,5 CSS px`; không scale ngang glyph.
- Tỷ lệ thân chữ mục tiêu `0,618 ± 0,005` sau `document.fonts.ready`.

## 3. User workflow và acceptance

```gherkin
Given logo VI hoặc EN đã tải font
When hiển thị ở header, sticky header hoặc menu trên mọi viewport hỗ trợ
Then subtitle có thân chữ bằng 61,8% title và hai dòng cân chiều ngang
And mọi dấu hiển thị trọn trong khối 4Y
```

## 4. System và implementation boundary

`DESIGN.md` là nguồn geometry chuẩn. Canonical SVG và inline consumers phải dùng
cùng thông số; runtime motion không thay đổi. Text metrics dùng Canvas ở font-size
lớn rồi chiếu qua SVG CTM như gate R3.

## 5. Hướng dẫn implementation

```text
Build: pnpm prepare:site
Test: focused brand-lockup checks trong pnpm qa:site
Verify: pnpm qa:static và runtime stress VI/EN
```

Điều chỉnh subtitle size trước, sau đó tracking để cân rộng và baseline để giảm
gap. Không dùng `spacingAndGlyphs`, transform scale-x hoặc clip-path che dấu.

## 6. Thuộc tính chất lượng

| Attribute | Requirement | Evidence |
| --- | --- | --- |
| Accessibility | Tên thương hiệu và link semantics không đổi | a11y tree |
| Performance | Không thêm font hoặc runtime measurement production | source review |
| Security | N/A | review |
| Maintainability | Một canonical geometry đồng bộ mọi consumer | hash/runtime matrix |

## 7. Kế hoạch verification

| Level | Scenario | Method | Evidence kỳ vọng |
| --- | --- | --- | --- |
| Geometry | Ratio, `4Y`, `Y`, width, gap | Canvas/SVG metrics | trong tolerance |
| Stress | Font blocked/late, 320–2560px, zoom 200% | browser matrix | không clip/overlap |
| Motion | expanded/sticky/menu/reduced | focused runtime | endpoint và motion giữ nguyên |
| Human | VI/EN preview | owner spot-check | cụm chữ cân, gap gọn |

## 8. Delivery, migration và rollback

Thin slice cập nhật canonical SVG và một consumer test trước khi đồng bộ toàn bộ.
Rollback về exact SVG hash R3 nếu geometry hoặc dấu không đạt.

## 9. Reference và history

- [Brand lockup canonical](../../DESIGN.md#brand-lockup--nguồn-chuẩn)
- [Evidence R3](../verification/brand-lockup-logo-r3-2026-09-10.md)

| Date | Change | Reason |
| --- | --- | --- |
| 2026-09-20 | Initial draft R4 | Owner chốt tỷ lệ thân chữ 61,8% và gap nhỏ hơn |
| 2026-09-20 | Owner accepted | Owner duyệt toàn bộ năm module spec |
| 2026-09-20 | Implemented, owner visual open | VI/EN typeset riêng cùng đạt 0,618, 4Y/Y; focused runtime 21/21 đạt |
| 2026-09-20 | Correction R5 accepted | VI giữ nguyên; EN dùng cùng character size/line gap với VI, title cùng width VI và subtitle nén tracking để cùng width title |

## 10. Correction R5 — EN kế thừa metric VI

- Không thay geometry, font-size, tracking, baseline hoặc copy của logo VI.
- Title ở locale EN vẫn là `TRƯỜNG THỊNH` và phải dùng đúng geometry VI, gồm
  `textLength="390.63185"`; bỏ override cỡ hoặc transform riêng theo locale.
- Subtitle EN `INTERIORS · ADVERTISING` dùng cùng font-size, line gap và chiều
  cao character của subtitle VI. Vì copy dài hơn, cho phép SVG phân bổ khoảng
  cách ký tự sát hơn để vẫn cùng chiều ngang title; không scale glyph.
- Mọi ink bounds vẫn tính đủ dấu của title; header/menu và font late/blocked
  không clip hoặc thay footprint.

Acceptance R5: VI source và runtime hash geometry không đổi; EN title rect trùng
VI trong tolerance `0,5px`; EN subtitle có cùng font-size/baseline gap với VI,
cùng width title và không dùng locale transform/scale-x.

## Chú thích thuật ngữ

- **Thân chữ**: phần chiều cao glyph không tính dấu tiếng Việt.
- **Ink bounds**: hộp bao phần pixel/chữ thực sự được vẽ.
- **CTM**: ma trận biến đổi hiện hành của SVG.
