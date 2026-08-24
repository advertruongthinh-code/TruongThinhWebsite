---
title: Graphify dùng wrapper freshness với boundary cố định
status: accepted
date: 2026-08-08
scope: historical project decision
supersedes: []
related_specs: []
related_reports: []
---

# Graphify dùng wrapper freshness với boundary cố định

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

`scripts/tooling/invoke-graphify.ps1` là interface canonical cho
`query`/`path`/`explain`; wrapper gọi executable global đã pin và giữ dirty
fingerprint, lock, coalesced AST update ở project. AST update fail thì query bị
dừng. Semantic state của meaningful non-media content được suy ra từ incremental
API và Graphify manifest chính thức, chỉ cảnh báo và không tự gọi LLM/API.
Official Git hook và watcher xử lý code; semantic update do skill thực hiện
tường minh.

## Hệ quả

Decision historical này vẫn là một phần của accepted project context. Nếu
direction tương lai thay đổi nó, tạo descriptive decision record mới và link file
bị supersede.

## Chú thích thuật ngữ

- **Wrapper**: lớp interface chuẩn hóa cách gọi executable.
- **Freshness boundary**: điểm gate ngăn query dùng graph stale.
- **Coalesced update**: nhiều yêu cầu gần nhau được gộp thành một update.
- **Manifest**: file ghi trạng thái và danh sách artifact đã xử lý.
