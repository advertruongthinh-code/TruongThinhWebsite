---
title: Chỉ bỏ skill global/project khi còn fallback rõ ràng
status: superseded
date: 2026-08-08
scope: historical project decision
supersedes: []
related_specs: []
related_reports: []
---

# Chỉ bỏ skill global/project khi còn fallback rõ ràng

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

Chỉ bỏ skill global/project khi vẫn còn fallback rõ ràng. `i-have-adhd` đầy đủ
đã có ở user scope nên project không vendoring hoặc inject lại tại SessionStart;
contract ngắn trong `AGENTS.md` vẫn always-on. Ponytail global chưa có tại thời
điểm decision, vì vậy sáu skill Ponytail tiếp tục nằm trong project để clone trên
máy khác không mất function.

## Hệ quả

Decision này đã bị supersede vào 2026-08-09 bởi
[`global-agent-stack-project-portability.md`](global-agent-stack-project-portability.md).
Mọi reusable skill hiện có source user-global đã pin và clone-time bootstrap
contract.

## Chú thích thuật ngữ

- **Fallback**: nhánh xử lý thay thế khi capability chính không có.
- **Vendoring**: copy dependency vào repository thay vì dùng source ngoài.
- **Always-on**: luôn được áp dụng trong session.
- **Clone-time bootstrap**: khôi phục dependency và tooling khi clone project.
