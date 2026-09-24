---
title: Global agent stack với project policy portable
status: superseded
date: 2026-08-09
scope: agent tooling
supersedes:
  - project-scoped-tooling.md
  - graphify-ast-default.md
  - fallback-before-removing-skills.md
related_specs: []
related_reports:
  - ../archive/reports/verification-2026-08-09-agent-workspace-bootstrap.md
superseded_by: codex-native-agent-skills-workflow.md
---

# Global agent stack với project policy portable

## Context

Vendoring reusable agent package trong mỗi repository làm lặp update, nhúng
runtime path phụ thuộc machine và tạo Codex lifecycle-hook trust warning. Clone
mới vẫn cần project behavior deterministic.

## Decision

Cài Serena, Graphify, Chrome DevTools MCP, Agent Skills, i-have-adhd, Caveman,
Impeccable, Ponytail và Sol Advisor ở user scope từ version hoặc commit được pin
trong `tooling-versions.json`. Giữ Playwright, Wrangler, browser engine,
`.serena/project.yml`, `.graphifyignore`, Graphify Git hook/watcher,
Serena language synchronization, wrapper, test và policy trong project.

Global rule bật i-have-adhd, Caveman full và Ponytail ultra. Project policy
Caveman `ultra` nằm ở [decision kế tiếp](caveman-ultra-agent-rules.md). Codex
lifecycle hook bị tắt toàn cục.
Graphify và Serena là MCP server bắt buộc, được launch cho từng task; mọi main
agent và subagent dùng Graphify trước, Serena sau. Graphify bao phủ meaningful
non-media project content; generated, vendor, runtime và media file bị loại.

Mọi semantic task, gồm Graphify semantic extraction và content synthesis, dùng
`gpt-5.6-luna` với reasoning `max`. Semantic worker phải pin rõ cả hai giá trị.
Agent verify claim và decision bằng local evidence hoặc primary official source,
đánh dấu inference và không nâng unsupported guess thành fact.

Bootstrap theo nguyên tắc backup-first, pinned, idempotent và update chỉ
notify-only. Sol Advisor native adapter cần exact user-scope confirmation token
riêng của plugin nên bootstrap không được âm thầm install.

## Hệ quả

- Codex Desktop dùng lại một global stack mà không tạo project hook trust prompt.
- Clone mang đủ pin và automation để tái tạo stack dự kiến bằng
  `pnpm tooling:bootstrap`.
- Project exception review được trong Git và chỉ override global default ở
  repository này.
- Global package upgrade là chủ động; update checker không mutate machine.
- Phải reload Codex hoặc mở task mới sau khi đổi global MCP, plugin hoặc native
  agent.

## Chú thích thuật ngữ

- **Vendoring**: đưa dependency vào repository thay vì dùng source ngoài.
- **Portable**: có thể tái lập trên machine/workspace khác.
- **Deterministic**: cùng input cho kết quả có thể dự đoán.
- **Idempotent**: chạy lại không tạo side effect trùng ngoài ý muốn.
- **Notify-only**: chỉ báo update, không tự ghi hoặc cài thay đổi.
