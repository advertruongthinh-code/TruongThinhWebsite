---
title: No-LLM không đồng nghĩa docs vắng mặt
status: accepted
date: 2026-07-31
scope: historical project decision
supersedes:
  - graphify-ast-default.md
related_specs: []
related_reports: []
---

# No-LLM không đồng nghĩa docs vắng mặt

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

No-LLM không đồng nghĩa docs vắng mặt. Decision này supersede giới hạn
documentation code-only trước đây: code-only extraction tạo nền AST;
`graphify update .` có thể giữ heading/link Markdown bằng structural
extraction. Docs/ảnh vẫn chưa có semantic/vision relation nếu không chạy full
extraction với backend LLM.

## Hệ quả

Decision historical này vẫn là một phần của accepted project context. Nếu
direction tương lai thay đổi nó, tạo descriptive decision record mới và link file
bị supersede.

## Chú thích thuật ngữ

- **No-LLM**: workflow không gọi mô hình LLM.
- **Structural extraction**: trích xuất heading/link và cấu trúc file.
- **Semantic relation**: quan hệ dựa trên ý nghĩa, không chỉ text/path.
- **Backend LLM**: thành phần dùng LLM để phân tích content.
