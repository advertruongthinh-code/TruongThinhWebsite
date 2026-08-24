---
title: Browser QA phân tầng
status: superseded
date: 2026-08-08
scope: historical project decision
superseded_by: interactive-browser-qa.md
related_specs: []
related_reports: []
---

# Browser QA phân tầng

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision trước đây

Browser QA chạy trên Chromium, Firefox và WebKit. Chrome DevTools và Computer
Use là investigation layer bổ sung. Screenshot hoặc static review không phải test
pass.

## Hệ quả

Record này được giữ để làm history. Requirement hiện tại nằm trong
[interactive-browser-qa.md](interactive-browser-qa.md).

## Chú thích thuật ngữ

- **Layer**: lớp evidence hoặc tool độc lập trong QA.
- **Supplementary**: bổ sung, không phải điều kiện chính.
- **Test pass**: kết quả test đạt yêu cầu.
