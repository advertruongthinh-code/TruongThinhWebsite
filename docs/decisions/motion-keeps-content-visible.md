---
title: Motion nâng trải nghiệm, không giữ content làm con tin
status: accepted
date: 2026-07-30
scope: historical project decision
supersedes: []
related_specs: []
related_reports: []
---

# Motion nâng trải nghiệm, không giữ content làm con tin

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

Motion chỉ nâng trải nghiệm, không giữ content làm con tin. Desktop có smooth
scroll/GSAP; mobile dùng native scroll; reduced motion bỏ animation không thiết
yếu và luôn giữ content visible.

## Hệ quả

Decision historical này vẫn là một phần của accepted project context. Nếu
direction tương lai thay đổi nó, tạo descriptive decision record mới và link file
bị supersede.

## Chú thích thuật ngữ

- **Smooth scroll**: cuộn được điều khiển để chuyển động mượt hơn.
- **Animation**: chuyển động trình bày một state.
- **Reduced motion**: chế độ giảm animation theo preference người dùng.
- **Visible**: content vẫn nhìn thấy, không phụ thuộc animation hoàn tất.
