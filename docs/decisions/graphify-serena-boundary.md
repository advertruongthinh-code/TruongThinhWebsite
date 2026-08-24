---
title: Graphify và Serena có ranh giới bổ sung
status: accepted
date: 2026-08-08
scope: historical project decision
supersedes: []
related_specs: []
related_reports: []
---

# Graphify và Serena có ranh giới bổ sung

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

Graphify xử lý architecture, dependency và blast radius; Serena theo sau cho
symbol/reference và refactor. Code graph phải fresh trước query; Serena symbolic
work phải dừng khi language set đổi mà MCP chưa re-activate.

## Hệ quả

Decision historical này vẫn là một phần của accepted project context. Nếu
direction tương lai thay đổi nó, tạo descriptive decision record mới và link file
bị supersede.

## Chú thích thuật ngữ

- **Boundary**: ranh giới trách nhiệm của tool.
- **Symbolic work**: thao tác dựa trên symbol và ngữ nghĩa code.
- **Re-activate**: khởi động lại MCP/project context sau khi cấu hình đổi.
- **Refactor**: đổi cấu trúc mà vẫn giữ behavior cần thiết.
