---
title: Graphify update theo dirty fingerprint và được coalesce
status: superseded
date: 2026-08-08
scope: historical project decision
supersedes:
  - graphify-first-architecture.md
  - graphify-ast-default.md
related_specs: []
related_reports: []
superseded_by: native-graphify-hooks-and-watcher.md
---

# Graphify update theo dirty fingerprint và được coalesce

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

Graphify update theo dirty fingerprint và được coalesce. `PostToolUse` không
update graph; nó chỉ so fingerprint của corpus và đánh dấu dirty khi file thực sự
đổi. Pre-query và `Stop` recheck freshness cả trước lẫn sau khi lấy lock, nên
các dispatcher đồng thời dùng chung một update. Bash chỉ đọc, không chạy Serena
sync hoặc Graphify update. Graphify luôn được gọi qua executable project-local,
không phụ thuộc global `PATH`. Decision này supersede behavior update theo
từng change trước đó nhưng giữ yêu cầu graph phải fresh trước query.

## Hệ quả

Decision này đã bị supersede bởi `native-graphify-hooks-and-watcher.md`; nội dung
vẫn được giữ để giải thích lịch sử project context.

## Chú thích thuật ngữ

- **Dirty fingerprint**: dấu vân tay cho biết corpus đã thay đổi.
- **Coalesce**: gộp nhiều request gần nhau thành một lần update.
- **Freshness**: mức graph phản ánh đúng source hiện tại.
- **Dispatcher**: thành phần phân phối request tới workflow phù hợp.
