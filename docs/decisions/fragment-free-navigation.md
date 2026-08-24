---
title: Public navigation không dùng fragment
status: accepted
date: 2026-08-01
scope: historical project decision
supersedes: []
related_specs: []
related_reports: []
---

# Public navigation không dùng fragment

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

Public navigation không dùng fragment. Section CTA, footer chapter link, fragment
scroll/focus runtime và hash persistence test đã được remove. SVG
`url(#...)` clip-path reference vẫn giữ vì đó là local graphic resource, không
phải navigation.

## Hệ quả

Decision historical này vẫn là một phần của accepted project context. Nếu
direction tương lai thay đổi nó, tạo descriptive decision record mới và link file
bị supersede.

## Chú thích thuật ngữ

- **Fragment**: phần `#hash` trong URL trỏ tới vị trí trong document.
- **Runtime**: behavior khi page đang chạy trong browser.
- **Persistence**: việc giữ lại state qua reload hoặc navigation.
