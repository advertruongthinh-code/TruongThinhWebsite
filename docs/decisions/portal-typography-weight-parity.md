---
title: Typography portal theo trọng lượng Espacio
status: accepted
date: 2026-08-24
scope: Home portal typography
tags:
  - ui
  - typography
  - espacio-parity
supersedes: []
related_specs: []
related_reports:
  - ../reports/research-espacio-layout-motion-parity.md
---

# Typography portal theo trọng lượng Espacio

## Context

Sáu portal Home dùng cùng Plus Jakarta Sans nhưng ba portal dịch vụ từng trộn
`450` cho dòng phụ, `650` cho dòng chính, trong khi ba portal năng lực dùng
`500`. Reference Espacio dùng face `silka-medium` cho title và
`silka-semibold` cho subtitle. Giá trị computed `100` trên reference là metadata
của named face, không phải trọng lượng cần sao chép theo số.

## Decision

Mọi title trong `#dich-vu` và `#nang-luc` dùng Plus Jakarta Sans `500`; mọi
subtitle giữ `600`. Không đổi font family, font size, line height, spacing, copy,
image hoặc motion.

## Alternative đã cân nhắc

| Alternative | Lợi ích | Lý do reject |
| --- | --- | --- |
| Sao chép computed weight `100` | Khớp con số runtime của reference | Sai ngữ nghĩa vì Espacio dùng named font face |
| Giữ title `450/650` | Duy trì tương phản cũ | Sáu portal không thống nhất và không khớp medium title của reference |

## Hệ quả

### Tích cực

- Sáu portal có cùng hierarchy: title `500`, subtitle `600`.
- Phạm vi thay đổi chỉ còn hai override `font-weight` của portal dịch vụ.

### Tiêu cực hoặc cost đã chấp nhận

- Plus Jakarta Sans chỉ là equivalent local của Silka, không phải cùng font file.

## Evidence

- Chrome DevTools đo live Espacio ngày 2026-08-24: title dùng
  `silka-medium`, subtitle dùng `silka-semibold`.
- `tests/site/site.e2e.cjs` xác nhận title `500`, subtitle `600` và không có
  horizontal overflow tại 320, 768, 1024 và 1440 px: `4/4` pass.
- Static site contract và worker static contract đều pass; DevTools runtime
  không có console error; Computer Use spot-check sáu portal không thấy lệch
  hierarchy.

## Follow-up

- Rerun affected subset của parity runner với current source hash trước khi cập
  nhật report parity tổng.

## Chú thích thuật ngữ

- **Named font face**: tên font riêng ánh xạ trực tiếp tới một file font.
- **Equivalent local**: lựa chọn font hoặc weight gần nhất đang có trong project.
- **Hierarchy**: thứ bậc thị giác giữa title và subtitle.
- **Horizontal overflow**: nội dung làm document rộng hơn viewport.
