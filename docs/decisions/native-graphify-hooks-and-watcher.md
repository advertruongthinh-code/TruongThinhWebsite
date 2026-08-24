---
title: Dùng Graphify Git hook và watcher native
status: accepted
date: 2026-08-09
scope: project tooling
supersedes:
  - single-hook-dispatcher.md
  - dirty-fingerprint-graphify.md
related_specs: []
related_reports: []
---

# Dùng Graphify Git hook và watcher native

## Context

Codex lifecycle dispatcher custom đã duplicate Graphify freshness behavior,
cần hook trust review sau mỗi configuration change và couple Serena/Impeccable
work không liên quan vào mọi Codex session.

## Decision

Remove `.codex/hooks.json` và dispatcher của project. Install Graphify skill
và CLI ở user scope, dùng `graphify hook install` cho managed `post-commit` và
`post-checkout` hook, rồi chạy `graphify watch <project-root>` qua một
PowerShell wrapper dùng chung. VS Code gọi wrapper đó như background task
`Graphify: Watch`; user terminal gọi trực tiếp cùng file.

Query wrapper hiện có vẫn là freshness boundary fallback khi watcher không chạy.
Không cần Codex lifecycle hook.

Rule module không lặp refresh command sau mỗi edit: normal task chỉ query wrapper;
setup/repair nằm ở scripts map và runbook.

## Hệ quả

- Codex không còn hiển thị project lifecycle-hook trust warning.
- Git commit, branch switch và watcher tùy chọn dùng upstream Graphify behavior thay
  vì project dispatcher.
- Serena synchronization và Impeccable check là explicit operation, không phải
  hidden lifecycle side effect.
- Semantic update của non-media document vẫn explicit. Media bị loại theo project
  policy.

## Chú thích thuật ngữ

- **Native**: capability do tool chính cung cấp, không phải wrapper custom.
- **Dispatcher**: thành phần phân phối event/request.
- **Watcher**: tiến trình theo dõi file để trigger update.
- **Side effect**: thay đổi phát sinh ngoài kết quả chính của command.
