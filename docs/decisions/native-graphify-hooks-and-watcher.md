---
title: Graphify và Serena dùng hook, watcher native và wrapper freshness
status: accepted
date: 2026-08-09
scope: project tooling
supersedes: []
related_specs: []
related_reports: []
---

# Graphify và Serena dùng hook, watcher native và wrapper freshness

## Context

Lifecycle dispatcher custom của project đã duplicate Graphify freshness
behavior, cần hook trust review sau mỗi configuration change và couple
Serena/Impeccable work không liên quan vào mọi agent session.

## Decision

1. Không dùng host lifecycle hook hay project dispatcher. Graphify skill và CLI
   cài ở user scope. Trên Windows, `graphify hook install` quản lý `post-commit`
   và `post-checkout`; `graphify watch <project-root>` chạy qua một PowerShell
   wrapper dùng chung (VS Code task `Graphify: Watch` hoặc user terminal).
2. Graphify-first: khi `graphify-out/graph.json` tồn tại, câu hỏi architecture,
   dependency, blast radius đi qua Graphify trước raw search; `rg` chỉ xác nhận
   chi tiết có scope. Serena theo sau cho symbol, reference, diagnostics,
   refactor.
3. `scripts/tooling/invoke-graphify.ps1` là interface canonical cho
   `query`/`path`/`explain`: gọi executable global đã pin, giữ lock và AST
   update có coalesce ở project; AST update fail thì query dừng (fail closed).
   Linux/cloud không có PowerShell: dùng `scripts/tooling/invoke-graphify.sh`
   hoặc MCP `graphify`.
4. Khi `Graphify: Watch` đang chạy và đã xử lý save gần nhất, dùng
   `-SkipAstRefresh`. Switch không chứng minh freshness, không build graph
   thiếu; graph thiếu hoặc nghi stale thì chạy default.
5. Structural extraction giữ heading/link Markdown, không cần LLM. Semantic
   update của meaningful non-media content luôn explicit qua skill; wrapper chỉ
   cảnh báo, không tự gọi LLM/API. Media bị loại theo project policy.
6. Serena language set được suy ra từ extension thật của project, không sửa tay.
   Launcher/watcher sync bình thường; `-Apply`, health-check, MCP re-activation
   chỉ là repair fallback khi tool báo blocked. Language set đổi mà MCP chưa
   re-activate thì dừng symbolic work.

Rule module không lặp refresh command sau mỗi edit: normal task chỉ query
wrapper; setup/repair nằm ở scripts map và runbook.

## Hệ quả

- Host agent không hiển thị project lifecycle-hook trust warning.
- Git commit, branch switch và watcher dùng upstream Graphify behavior.
- Serena synchronization và Impeccable check là explicit operation, không phải
  hidden side effect.

## Lịch sử

2026-10-03 gộp và xóa: `graphify-first-architecture`, `graphify-serena-boundary`,
`graphify-wrapper-freshness`, `graphify-watcher-query-existing-graph`,
`inferred-serena-language-set`, `structural-document-extraction`,
`graphify-ast-default`, `dirty-fingerprint-graphify`, `single-hook-dispatcher`.
Bản gốc còn trong Git history.

## Chú thích thuật ngữ

- **Native**: capability do tool chính cung cấp, không phải wrapper custom.
- **Dispatcher**: thành phần phân phối event/request.
- **Watcher**: tiến trình theo dõi file để trigger update.
- **Fail closed**: dừng khi không chứng minh được điều kiện an toàn.
- **Coalesce**: gộp nhiều request gần nhau thành một lần update.
- **Structural extraction**: trích xuất heading/link và cấu trúc file.
- **Language set**: tập language server Serena cần để phân tích file.
- **Side effect**: thay đổi phát sinh ngoài kết quả chính của command.
