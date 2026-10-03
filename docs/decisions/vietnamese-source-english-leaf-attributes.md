---
title: VI source, EN qua data attribute
status: accepted
date: 2026-07-30
scope: historical project decision
supersedes: []
related_specs: []
related_reports: []
---

# VI source, EN qua data attribute

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

VI là source text; English dùng `data-en`, `data-en-alt`,
`data-en-aria-label` và `data-en-content`. Locale lưu ở
`tt-lang`. `data-en` phải nằm trên leaf node để không phá markup.

## Hệ quả

Decision này còn hiệu lực trong static phase: `src/site` dùng leaf `data-en`
và `motion.js` lưu locale ở `tt-lang`. [Locale-prefixed Worker routes](locale-prefixed-worker-routes.md)
chỉ thay phần route/URL cho CMS phase, không thay contract attribute này.

## Chú thích thuật ngữ

- **Source text**: text gốc mà hệ thống dùng làm nguồn.
- **Leaf attribute**: attribute trên node cuối chứa nội dung.
- **Markup**: cấu trúc HTML và element con.
- **Locale**: ngôn ngữ/khu vực hiển thị.
