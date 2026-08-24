---
title: Tooling chỉ ở project scope và update là notify-only
status: superseded
date: 2026-08-08
scope: historical project decision
supersedes: []
related_specs: []
related_reports: []
---

# Tooling chỉ ở project scope và update là notify-only

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

Tooling chỉ ở project scope và update là notify-only. `.tooling/python`, portable
runtime ở `.tooling/runtimes`, Node package có lockfile, skill ở
`.agents/skills`, persona ở `.codex/agents`. Bootstrap đầu pin stable;
các lần sau không tự nâng cấp.

## Hệ quả

Decision này đã bị supersede vào 2026-08-09 bởi
[`global-agent-stack-project-portability.md`](global-agent-stack-project-portability.md).
Repository hiện giữ pin, policy, wrapper, watcher và browser QA; reusable agent
package được install ở user scope.

## Chú thích thuật ngữ

- **Project scope**: chỉ áp dụng trong repository.
- **Notify-only**: chỉ báo update, không tự mutate machine.
- **Lockfile**: file khóa version dependency.
- **Persona**: role/config mô phỏng một agent chuyên biệt.
