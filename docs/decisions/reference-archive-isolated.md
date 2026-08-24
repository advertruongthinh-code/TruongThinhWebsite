---
title: Reference archive tách khỏi runtime
status: accepted
date: 2026-07-31
scope: historical project decision
supersedes: []
related_specs: []
related_reports: []
---

# Reference archive tách khỏi runtime

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

Reference archive tách khỏi runtime. HTML/source/media first-party được crawl
vào `research/reference-site/archive/` kèm manifest SHA-256 để research và tái
lập. Archive bị Graphify bỏ qua, không được load vào production website và không
thay thế quyền sử dụng content.

## Hệ quả

Decision historical này vẫn là một phần của accepted project context. Nếu
direction tương lai thay đổi nó, tạo descriptive decision record mới và link file
bị supersede.

## Chú thích thuật ngữ

- **Runtime**: code và asset dùng khi website chạy.
- **Archive**: bản lưu phục vụ research, không phải dependency production.
- **Manifest**: danh sách file cùng metadata/đ checksum.
- **First-party**: content đến từ chính website/source được nghiên cứu.
