---
title: Full-menu child và floating CTA theo reference đã đo
status: accepted
date: 2026-08-01
scope: historical project decision
supersedes: []
related_specs: []
related_reports: []
---

# Full-menu child và floating CTA theo reference đã đo

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

Bốn menu group expose 15 bilingual child route bằng taxonomy query string, không
dùng fragment. Child type, spacing, underline và stagger khớp menu contract đã
đo từ reference. Calendar SVG dùng native `58.09×57.82` `viewBox`. Floating Zalo
CTA dùng geometry, hover inversion và scroll-window choreography của appointment
bubble reference, nhưng giữ owner URL placeholder và copy Trường Thịnh.

## Hệ quả

Decision historical này vẫn là một phần của accepted project context. Nếu
direction tương lai thay đổi nó, tạo descriptive decision record mới và link file
bị supersede.

## Chú thích thuật ngữ

- **Full-menu**: menu toàn màn hình.
- **Taxonomy query string**: query dùng để xác định category/subcategory.
- **Stagger**: độ trễ tuần tự giữa các item.
- **ViewBox**: vùng tọa độ bên trong SVG.
- **Choreography**: phối hợp thứ tự và nhịp nhiều animation.
