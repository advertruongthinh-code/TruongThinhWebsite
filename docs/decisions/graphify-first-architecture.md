---
title: Graphify-first cho kiến trúc
status: accepted
date: 2026-07-30
scope: historical project decision
supersedes: []
related_specs: []
related_reports: []
---

# Graphify-first cho kiến trúc

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

Khi `graphify-out/graph.json` tồn tại, chạy Graphify query qua project-local
wrapper trước raw search cho câu hỏi architecture và file relationship; dùng
`rg` chỉ để xác nhận chi tiết có scope. Code change cần AST fresh; meaningful
non-media project content cần semantic re-extraction khi truy vấn quan hệ ngữ
nghĩa. Media bị loại theo project policy.

## Hệ quả

Decision historical này vẫn là một phần của accepted project context. Nếu
direction tương lai thay đổi nó, tạo descriptive decision record mới và link file
bị supersede.

## Chú thích thuật ngữ

- **Graphify-first**: dùng Graphify làm điểm query đầu tiên.
- **Raw search**: tìm trực tiếp bằng text/file search.
- **Fresh**: graph phản ánh source hiện tại.
- **Blast radius**: phạm vi ảnh hưởng của thay đổi.
