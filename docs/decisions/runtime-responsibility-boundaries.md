---
title: Repository boundary theo runtime responsibility
status: accepted
date: 2026-08-08
scope: historical project decision
supersedes: []
related_specs: []
related_reports: []
---

# Repository boundary theo runtime responsibility

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

Repository boundary đi theo runtime responsibility. Production source nằm trong
`src/`; test được nhóm theo subsystem; deploy/reference utility tách khỏi stable
`scripts/tooling/` trust boundary; system document phân theo purpose; reference
research cô lập trong `research/`. Conventional discovery/config file vẫn ở root,
và `.site-output` giữ public URL shape.

## Hệ quả

Decision historical này vẫn là một phần của accepted project context. Nếu
direction tương lai thay đổi nó, tạo descriptive decision record mới và link file
bị supersede.

## Chú thích thuật ngữ

- **Runtime responsibility**: phần hệ thống chịu trách nhiệm khi chạy.
- **Subsystem**: phân hệ có boundary riêng.
- **Trust boundary**: ranh giới cần kiểm soát input/permission.
- **URL shape**: cấu trúc path public mà visitor nhìn thấy.
