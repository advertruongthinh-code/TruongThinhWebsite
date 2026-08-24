---
title: Header route-first, không dùng fragment navigation
status: accepted
date: 2026-07-30
scope: historical project decision
supersedes: []
related_specs: []
related_reports: []
---

# Header route-first, không dùng fragment navigation

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

Header route-first, không dùng fragment navigation; full-menu chỉ dẫn tới
canonical route. Public anchor không chứa fragment; locale switch giữ query và
vị trí đọc nhưng loại fragment. BFCache vẫn dọn route veil, dialog và page scale
trong `pageshow.persisted`.

## Hệ quả

Decision historical này vẫn là một phần của accepted project context. Nếu
direction tương lai thay đổi nó, tạo descriptive decision record mới và link file
bị supersede.

## Chú thích thuật ngữ

- **Route-first**: ưu tiên chuyển tới route độc lập thay vì scroll tới fragment.
- **Anchor**: link/điểm điều hướng trong document.
- **BFCache**: cache của browser cho Back/Forward.
