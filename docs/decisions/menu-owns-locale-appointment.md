---
title: Full menu sở hữu locale và appointment control
status: accepted
date: 2026-08-01
scope: historical project decision
supersedes: []
related_specs: []
related_reports: []
---

# Full menu sở hữu locale và appointment control

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

Full menu sở hữu locale và appointment control. Persistent header không render
locale toggle trùng. Mỗi shell expose đúng hai link
`[data-language-option]` trong `#site-menu`, cùng survey/Zalo CTA hiện có trong
`.menu-appointment`. Menu giữ bốn Trường Thịnh group theo grid 4/3/2/1 giống
reference và giữ GSAP open/close timing đã đo. Appointment ẩn ở tablet
`≤960px` và hiện lại thành mobile row full-width ở `≤578px`.

Bốn menu group expose 15 bilingual child route bằng taxonomy query string, không
dùng fragment; child type, spacing, underline và stagger khớp menu contract đã
đo. Calendar SVG dùng native `58.09×57.82` `viewBox`. Floating Zalo CTA dùng
geometry, hover inversion và scroll-window choreography của appointment bubble
reference, nhưng giữ owner URL placeholder và copy Trường Thịnh.

## Hệ quả

Decision historical này vẫn là một phần của accepted project context. Nếu
direction tương lai thay đổi nó, tạo descriptive decision record mới và link file
bị supersede.

## Lịch sử

2026-10-03 gộp và xóa `full-menu-children-and-cta`; bản gốc còn trong Git history.

## Chú thích thuật ngữ

- **Locale toggle**: control đổi giữa VI và EN.
- **Persistent header**: header giữ cố định hoặc tồn tại qua các section.
- **Appointment control**: CTA để đặt lịch hoặc gửi yêu cầu tư vấn.
- **Taxonomy query string**: query xác định category/subcategory.
- **Stagger**: độ trễ tuần tự giữa các item.
- **Grid**: hệ thống cột/hàng để sắp xếp layout.
