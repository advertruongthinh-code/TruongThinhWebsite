---
title: Migration hệ thống tài liệu
date: 2026-08-09
category: verification
related_specs:
  - ../specs/frontend-landing-page-foundation.md
  - ../specs/cms-content-publishing.md
related_decisions:
  - ../decisions/git-notion-governance.md
---

# Migration hệ thống tài liệu

## Mục đích

Kiểm chứng việc chuyển hệ thống docs sang mô hình gọn, dùng descriptive slug,
tách frontend/CMS, giữ khu vực Impeccable tối thiểu, loại bỏ tài liệu
provider/admin chưa cần ở static-first phase và dọn thư mục rỗng.

## Phương pháp

- Kiểm tra local Markdown links trong `AGENTS.md`, `README.md`, `CLAUDE.md`,
  `docs/` và `tests/` bằng PowerShell read-only audit.
- Tìm mã tài liệu cũ và các legacy path bằng `rg`.
- Xác nhận reports chỉ tổ chức theo category, không chia thư mục theo năm; di
  chuyển report và kiểm tra lại local links cùng frontmatter paths.
- Đọc `impeccable/SKILL.md`, chạy context loader cho `src/site/index.html` và
  xác nhận các input skill thực sự đọc.
- Xác nhận không còn rule hoặc link tới visual workbench cũ.
- Chạy `git diff --check`.
- Chạy script tương đương của `pnpm qa:static` và
  `pnpm qa:worker:static` bằng Node trực tiếp vì máy không có lệnh `pnpm`.
- Chạy Playwright cross-browser trên Worker local.
- Chạy Chrome DevTools MCP trên cùng route để đọc snapshot, DOM/a11y, console,
  network, screenshot và mở/đóng menu.
- Thử Computer Use trên cửa sổ browser thật; connector lỗi trước khi lấy state.
- Chạy Graphify qua wrapper project-local sau khi thay đổi docs.

## Kết quả

| Phát hiện | Bằng chứng | Độ tin cậy |
| --- | --- | --- |
| Local Markdown links không còn target thiếu | `Markdown local-link audit: PASS` | cao |
| Input Impeccable được xác nhận | `PRODUCT.md`; `DESIGN.md` chưa có; không có surface brief phù hợp; không có platform native | cao |
| Thư mục docs rỗng đã được dọn | `docs/memory/`, `docs/impeccable/surface-briefs/`, `reports/2026/incidents/`, `reports/2026/security/` đã xóa | cao |
| Reports không còn chia theo thư mục năm | Tên file dùng prefix category trực tiếp dưới `docs/reports/`; năm report đã được bỏ và local links/frontmatter đã kiểm tra lại | cao |
| Rule visual workbench cũ đã loại bỏ | `rg` không còn kết quả trong docs/rules/scripts | cao |
| Whitespace diff hợp lệ | `git diff --check` pass | cao |
| Static contracts không đổi | `[site-e2e] static contracts passed` | cao |
| Worker static routes không đổi | `[worker-static-contract] static routes, locales, redirects, and sitemap passed` | cao |
| Playwright browser smoke pass | `21/21` Chromium/Firefox/WebKit tests passed | cao |
| Chrome DevTools runtime pass | `/vi/` HTTP `200`, 26 requests `200`, console error/warn rỗng; menu mở/đóng và focus quay về nút mở menu | cao |
| Computer Use chưa có bằng chứng | Ba lần lấy state trả `node_repl exec context not found` | cao |
| Full site E2E chưa hoàn tất | Chạm timeout 5 phút và tạo failure screenshots; không gọi là pass | cao |
| Graph structural query nhận diện cấu trúc mới | Wrapper query trả về spec, Impeccable, Notion, decisions, reports | cao |
| Graph semantic index chưa fresh | Wrapper cảnh báo semantic update cho docs/media; AST vẫn fresh | cao |
| Notion chưa được cập nhật | Không có thao tác ghi Notion trong lượt docs-only này | cao |

## Kết luận

Docs đã được dọn theo contract mới. Static source, Worker, CMS runtime, database,
upload API, domain và deployment không bị thay đổi. Provider CMS vẫn được để mở
trong boundary spec. Release QA chưa đạt final pass vì Computer Use chưa tạo được
bằng chứng và full site E2E còn timeout; hai việc này không do thay đổi Markdown.

## Việc tiếp theo

- Khi có work item Notion đúng project, gắn link tới
  `docs/specs/frontend-landing-page-foundation.md`.
- Chỉ tạo `.impeccable/surfaces/<slug>.md` khi một surface thực sự cần visual
  direction riêng.
- Chạy semantic Graphify update khi cần truy vấn quan hệ ngữ nghĩa của docs/media.
- Khi bắt đầu CMS, tạo decision record cho provider, storage, auth và lifecycle.
- Khi Computer Use connector hoạt động, lặp lại human path và cập nhật report.
- Điều tra các failure screenshots của full site E2E trước khi gọi release pass.

## Bổ sung 2026-08-09: Vietnamese-first và Notion

- Dịch 76 project-owned Markdown file sang Vietnamese-first; giữ command, path,
  route, API/model name, identifier, frontmatter key và code block; mọi file có
  `## Chú thích thuật ngữ` ở cuối.
- Cập nhật `AGENTS.md` để mọi Markdown viết tiếng Việt, đồng thời giữ Git là
  source of truth cho accepted knowledge và Notion là mutable planning layer.
- Tạo Project, Docs Hub, workspace mapping và NOW Task trong workspace Notion;
  các record liên kết với nhau qua Projects → Docs/Tasks.
- Không chuyển accepted spec, decision, report hoặc implementation evidence ra
  khỏi Git. Workspace seed như `Website Redesign` và `Brand Guidelines` không
  được mutate.
- Graphify AST vẫn fresh; semantic update cho docs/media vẫn pending vì chưa có
  explicit request build semantic index.

## Chú thích thuật ngữ

- **Descriptive slug**: tên file mô tả nội dung, không dùng mã số tài liệu.
- **Static-first**: phát hành website tĩnh trước khi kích hoạt CMS.
- **Visual direction**: hướng thẩm mỹ được chọn cho một route hoặc surface.
