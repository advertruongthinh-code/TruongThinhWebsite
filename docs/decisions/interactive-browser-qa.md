---
title: Evidence browser QA tương tác
status: accepted
date: 2026-08-09
scope: website verification
supersedes: layered-browser-qa.md
related_specs:
  - ../specs/frontend-template.md
related_reports: []
---

# Evidence browser QA tương tác

## Context

Static contract và automated browser suite không chứng minh page usable trong
interactive session thật. Visual, focus, DOM, accessibility và network regression
cần các evidence surface khác nhau.

## Decision

Mọi UI change và website release dùng bốn nhóm evidence trên cùng live local web
server:

1. Static/Worker contract chạy `pnpm qa:static` và
   `pnpm qa:worker:static`.
2. Playwright chạy route, viewport, interaction, locale, reduced-motion,
   console, network và overflow check có thể lặp lại.
3. Computer Use thực hiện một human path trong isolated test window và verify
   visible state, focus, menu, locale, CTA và touch-sized interaction.
4. Chrome DevTools MCP inspect DOM, computed style, accessibility tree, console,
   network và screenshot của cùng route.

Layer unavailable hoặc interaction fail thì QA bị block. Screenshot, static
review hoặc một automated assertion đơn lẻ không phải release pass. Browser
profile phải isolated; không inspect cookie, token hoặc private session.

## Hệ quả

- Playwright vẫn là regression gate.
- Static/Worker contract tạo evidence contract trước runtime.
- Computer Use và Chrome DevTools cung cấp runtime evidence bắt buộc, không phải
  investigation tùy chọn.
- Report phải nêu tool và exact observation cho mỗi result.

## Chú thích thuật ngữ

- **Interactive session**: phiên người dùng có click, focus, scroll và chuyển route.
- **Evidence surface**: lớp/tool tạo ra một loại bằng chứng cụ thể.
- **Regression gate**: cổng kiểm tra để phát hiện behavior cũ bị hỏng.
- **Touch-sized**: kích thước control đủ dùng trên màn hình cảm ứng.
