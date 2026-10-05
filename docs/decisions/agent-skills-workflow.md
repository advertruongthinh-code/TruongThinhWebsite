---
title: Agent Skills dùng chung cho mọi host agent
status: accepted
date: 2026-09-01
scope: agent tooling
supersedes: []
related_specs: []
related_reports:
  - https://github.com/advertruongthinh-code/TruongThinhWebsite/blob/a3428aaff2cf1ff2f8f5a4f6804404e23ccd349b/docs/archive/reports/verification-2026-08-09-agent-workspace-bootstrap.md
---

# Agent Skills dùng chung cho mọi host agent

## Context

Claude Code và Codex cần cùng một bộ skill và cùng project policy, quality gate,
verification portable theo Git. Router plugin riêng làm trùng orchestration của
host, thêm cache, adapter và installer không cần thiết.

## Decision

1. Pin canonical ở [`tooling-versions.json`](../../tooling-versions.json).
   Skill đến từ plugin pin ở user scope theo
   [decision plugin pin](claude-skills-from-pinned-plugins.md). Runtime (Serena, Graphify, Chrome DevTools
   MCP, Impeccable CLI, jq) cài ở user scope.
2. Không router riêng, không model pin chung, không host lifecycle hook. Quy trình
   chạy skill, human gate và vai trò main/worker/reviewer nằm ở
   [`AGENTS.md`](../../AGENTS.md#agent-skills-lifecycle).
3. Bootstrap backup-first, pinned, idempotent; update chỉ notify-only. Đổi
   catalog thì mở session mới để host nạp lại.

## Phương án đã loại

| Phương án | Lý do loại |
| --- | --- |
| Router plugin riêng | Trùng orchestration của host, tăng tooling surface. |
| Agent Skills plugin thứ hai | Trùng skill đang pin. |
| Luôn solo | Bỏ worker/reviewer khi task và risk phù hợp. |

## Hệ quả

- Claude Code và Codex dùng chung một stack, cùng policy project.
- Clone mới tái lập stack bằng pin và `pnpm tooling:bootstrap`; cloud dùng
  `scripts/tooling/cloud-setup.sh`.

## Lịch sử

2026-10-03: đổi tên từ `codex-native-agent-skills-workflow.md`, viết lại trung
lập host; bỏ model pin và tham chiếu Superpowers đã retired. Gộp và xóa
`global-agent-stack-project-portability`, `project-scoped-tooling`,
`fallback-before-removing-skills`. Bản gốc còn trong Git history. Gộp với
vendor skill vào `.claude/skills` (PR #3) cùng ngày.

## Chú thích thuật ngữ

- **Host agent**: công cụ agent chạy task, ví dụ Claude Code hoặc Codex.
- **Human gate**: điểm dừng bắt buộc để owner duyệt artifact.
- **Persona**: reviewer chuyên biệt, không phải coordinator.
- **Direct user-global installation**: skill quản lý trực tiếp ở user scope, không qua plugin.
- **Vendoring**: copy dependency vào repository thay vì dùng source ngoài.
- **Notify-only**: chỉ báo update, không tự cài thay đổi.
