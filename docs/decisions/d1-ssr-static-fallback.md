---
title: D1 SSR luôn ưu tiên hơn shell fallback
status: accepted
date: 2026-07-31
scope: historical project decision
supersedes: []
related_specs: []
related_reports: []
---

# D1 SSR luôn ưu tiên hơn shell fallback

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

D1 SSR luôn ưu tiên hơn shell fallback. Shell chỉ fallback cho cấu trúc static;
Worker decode entity và áp D1 CMS/SEO sau cùng; `motion.js` không overwrite
canonical SSR. Public identity của CMS page `projects-products` là **Sản phẩm Quảng cáo** /
**Advertising products**; migration forward-only `0004` cập nhật state đã có mà không đổi
internal CMS key.

## Hệ quả

Decision historical này vẫn là một phần của accepted project context. Nếu
direction tương lai thay đổi nó, tạo descriptive decision record mới và link file
bị supersede.

## Chú thích thuật ngữ

- **SSR**: server-side rendering, Worker render response trước browser.
- **Shell fallback**: markup tĩnh dùng khi dữ liệu dynamic chưa có.
- **Forward-only migration**: migration chỉ tiến về schema mới, không tự rollback.
- **Entity**: object hoặc record được decode từ dữ liệu request.
