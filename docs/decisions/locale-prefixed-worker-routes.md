---
title: Worker CMS và locale URL là canonical
status: accepted
date: 2026-07-31
scope: historical project decision
supersedes: []
related_specs: []
related_reports: []
---

# Worker CMS và locale URL là canonical

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

Worker CMS và locale URL là canonical. Decision này chỉ thay phần route của
decision trước: public chỉ dùng `/vi/…` và `/en/…`;
Worker SSR locale/head từ D1, còn HTML shell giữ leaf `data-en` cho
structure/motion. Root, source shell và Vietnamese legacy path one-hop 308 sang
`/vi/…`.

## Hệ quả

Build tĩnh đã ghi route `/vi/…`, `/en/…`
([phát hành tĩnh](../specs/static-release.md#r5-văn-bản-song-ngữ-và-route-locale)); SSR, head
từ D1 và redirect 308 thuộc Worker dormant, chỉ hiệu lực khi CMS phase mở.
Contract leaf attribute vẫn do [VI source, EN qua data attribute](vietnamese-source-english-leaf-attributes.md)
sở hữu. Bản `root-canonical` cũ đã xóa ngày 2026-10-03; còn trong Git history.

## Chú thích thuật ngữ

- **Locale-prefixed**: URL có prefix locale như `/vi/` hoặc `/en/`.
- **Head**: phần metadata của HTML như title, canonical và hreflang.
- **One-hop redirect**: redirect chỉ qua một lần chuyển tiếp.
- **Legacy path**: path cũ vẫn được nhận để chuyển về route canonical.
