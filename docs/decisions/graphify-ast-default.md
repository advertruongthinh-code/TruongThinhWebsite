---
title: Graphify code-only là graph mặc định
status: superseded
date: 2026-07-31
scope: historical project decision
supersedes: []
related_specs: []
related_reports: []
---

# Graphify code-only là graph mặc định

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

Graphify code-only là graph mặc định, tạo bằng
`graphify extract . --code-only --out .` và update bằng
`graphify update .`. Codex PreToolUse, Git post-commit/post-checkout và merge
driver do Graphify CLI quản lý. Docs/ảnh chỉ vào graph khi chủ project chủ động
chạy full semantic extraction.

## Hệ quả

Decision này đã bị supersede vào 2026-08-09 bởi
[`global-agent-stack-project-portability.md`](global-agent-stack-project-portability.md).
Graph hiện bao gồm meaningful non-media project content; Codex lifecycle hook
vẫn bị tắt.

## Chú thích thuật ngữ

- **Code-only**: chỉ phân tích code, chưa xử lý content có ý nghĩa.
- **AST**: cây cú pháp trừu tượng của source.
- **Semantic extraction**: trích xuất ý nghĩa từ tài liệu hoặc source.
- **Superseded**: decision cũ đã được thay bằng decision mới.
