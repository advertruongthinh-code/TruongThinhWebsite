---
title: CMS project slot là optional trên static menu baseline
status: accepted
date: 2026-08-01
scope: historical project decision
supersedes: []
related_specs: []
related_reports: []
---

# CMS project slot là optional trên static menu baseline

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

CMS project slot là optional trên static menu baseline. Bốn menu group giữ copy
Trường Thịnh dễ đọc trong mọi shell. Group 01–03 expose `data-menu-projects` slot;
metadata D1 `menu_group` và optional `menu_order` chỉ replace group có published
record hợp lệ. `motion.js` sort theo order rồi slug và emit link canonical
`/{locale}/projects/{slug}/`; API error, metadata thiếu hoặc localized name thiếu
thì giữ static slot. Group 04 giữ social URL inert cho tới khi owner cung cấp fact.

## Hệ quả

Ghi chú 2026-10-03: `src/site` hiện không còn `data-menu-projects` slot hay
code fetch project trong `motion.js`; decision chỉ áp dụng khi CMS phase mở lại
và slot được dựng lại.

Decision historical này vẫn là một phần của accepted project context. Nếu
direction tương lai thay đổi nó, tạo descriptive decision record mới và link file
bị supersede.

## Chú thích thuật ngữ

- **Baseline**: trạng thái nền hoạt động khi chưa có dữ liệu CMS.
- **Slot**: vị trí dành cho content có thể được thay thế.
- **Inert**: có markup nhưng chưa kích hoạt action.
- **Canonical link**: link tới URL chuẩn của resource.
