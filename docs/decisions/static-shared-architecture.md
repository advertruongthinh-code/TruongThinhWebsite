---
title: Static architecture dùng chung
status: accepted
date: 2026-07-30
scope: historical project decision
supersedes: []
related_specs: []
related_reports: []
---

# Static architecture dùng chung

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

Các route tĩnh dùng chung `style.css`, `motion.js`, `detail.css` và
`detail.js`. Lý do là hosting đơn giản cho solo developer, không cần
bundler hoặc component framework.

## Hệ quả

Decision historical này vẫn là một phần của accepted project context. Nếu
direction tương lai thay đổi nó, tạo descriptive decision record mới và link file
bị supersede.

## Chú thích thuật ngữ

- **Shared architecture**: cấu trúc dùng chung giữa nhiều route.
- **Bundler**: tool gom và tối ưu module/resource.
- **Component framework**: framework tổ chức UI thành component.
