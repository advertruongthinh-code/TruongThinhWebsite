---
title: Worker CMS và locale URL là canonical
status: accepted
date: 2026-07-31
scope: historical project decision
supersedes:
  - root-canonical.md
  - vietnamese-source-english-leaf-attributes.md
related_specs: []
related_reports: []
---

# Worker CMS và locale URL là canonical

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

Worker CMS và locale URL là canonical. Decision này supersede root và locale
decision trước ở phần route/i18n: public chỉ dùng `/vi/…` và `/en/…`;
Worker SSR locale/head từ D1, còn HTML shell giữ leaf `data-en` cho
structure/motion. Root, source shell và Vietnamese legacy path one-hop 308 sang
`/vi/…`.

## Hệ quả

Decision historical này vẫn là một phần của accepted project context. Nếu
direction tương lai thay đổi nó, tạo descriptive decision record mới và link file
bị supersede.

## Chú thích thuật ngữ

- **Locale-prefixed**: URL có prefix locale như `/vi/` hoặc `/en/`.
- **Head**: phần metadata của HTML như title, canonical và hreflang.
- **One-hop redirect**: redirect chỉ qua một lần chuyển tiếp.
- **Legacy path**: path cũ vẫn được nhận để chuyển về route canonical.
