---
title: Motion map theo web tham khảo, không nhập bundle production
status: accepted
date: 2026-07-30
scope: historical project decision
supersedes: []
related_specs: []
related_reports: []
---

# Motion map theo web tham khảo, không nhập bundle production

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

Motion map theo web tham khảo, không nhập bundle production. Dùng white fade
`.75s/1s`; full-menu dùng bốn background column, page scale `.9`,
timeline `1.15×` và reverse `2.25×`; line/media timing theo
`docs/impeccable/motion-map.md`. Public bundle của reference chỉ nằm trong
`research/reference-site/` để research, không được load bởi production website.

## Hệ quả

Decision historical này vẫn là một phần của accepted project context. Nếu
direction tương lai thay đổi nó, tạo descriptive decision record mới và link file
bị supersede.

## Chú thích thuật ngữ

- **Bundle**: file package đã gom của JavaScript/CSS/media.
- **White fade**: lớp trắng fade khi chuyển route hoặc menu.
- **Timeline**: trục thời gian của animation.
- **Production**: môi trường website đang phục vụ thật.
