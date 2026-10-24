---
title: Evidence browser QA tương tác
status: accepted
date: 2026-08-09
scope: website verification
supersedes: []
related_specs:
  - ../specs/_template.md
related_reports: []
---

# Evidence browser QA tương tác

## Context

Static contract và automated browser suite không chứng minh page usable trong
interactive session thật. Visual, focus, DOM, accessibility và network regression
cần các evidence surface khác nhau.

## Decision

UI change và website release dùng các nhóm evidence sau trên cùng live local
web server:

1. Current static contract chạy `pnpm qa:static`; `pnpm qa:worker:security` khi
   Worker source bị tác động. Worker contract đầy đủ chỉ được thêm lại khi owner
   mở CMS phase.
2. Playwright chạy route, viewport, interaction, locale, reduced-motion,
   console, network và overflow check có thể lặp lại.
3. Computer Use chỉ dùng khi trigger khớp `AGENTS.md` rule 5: task thật sự cần
   thao tác Windows UI theo human path và tool chuyên biệt không đủ; nêu lý do
   trước khi dùng. Không bắt buộc cho mọi UI change.
4. Playwright inspect DOM, computed style, accessibility tree, console,
   network và screenshot của cùng route (Chrome DevTools MCP đã gỡ 2026-10-19).

Layer bắt buộc (1, 2, 4) unavailable hoặc interaction fail thì QA bị block. Screenshot, static
review hoặc một automated assertion đơn lẻ không phải release pass. Browser
profile phải isolated; không inspect cookie, token hoặc private session.

## Hệ quả

- Playwright vẫn là regression gate.
- Static contract tạo evidence contract trước runtime; Worker contract dormant
  không bị trình bày như current gate.
- Chrome DevTools cung cấp runtime evidence bắt buộc; Computer Use là evidence
  có điều kiện theo `AGENTS.md` rule 5.
- Report phải nêu tool và exact observation cho mỗi result.

## Lịch sử

2026-10-03: Computer Use đổi từ bắt buộc sang có điều kiện theo `AGENTS.md`
rule 5. Xóa `layered-browser-qa` (đã supersede); bản gốc còn trong Git history.

## Chú thích thuật ngữ

- **Interactive session**: phiên người dùng có click, focus, scroll và chuyển route.
- **Evidence surface**: lớp/tool tạo ra một loại bằng chứng cụ thể.
- **Regression gate**: cổng kiểm tra để phát hiện behavior cũ bị hỏng.
- **Human path**: chuỗi thao tác UI giống cách người dùng thực hiện trực tiếp.
