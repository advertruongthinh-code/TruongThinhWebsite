---
title: Caveman ultra và rule module
status: accepted
date: 2026-08-09
scope: agent context
supersedes: []
related_specs: []
related_decisions:
  - global-agent-stack-project-portability.md
related_reports: []
---

# Caveman ultra và rule module

## Context

`AGENTS.md` đã gom nhiều rule bền vững, khó scan và có project exception tắt
Caveman. Notion nay giữ mutable planning; Git vẫn cần một context snapshot ngắn
để agent bắt đầu task khi card/app chưa sẵn.

## Decision

- Bật `caveman` ultra cùng `i-have-adhd`, `ponytail` ultra. Nén prose, không bỏ nghĩa; safety/clarity vẫn ưu tiên.
- Giữ `AGENTS.md` là index. Rule theo trigger dùng prefix `agent-rule-` trực tiếp dưới `docs/operations/`; link là bắt buộc.
- Giữ `docs/STATE.md` mỏng: current phase, boundary, canonical link, verified blocker, next repo action. Không copy Notion board/work log/evidence.
- Hook, watcher, wrapper, MCP launcher sở hữu mechanics. Rule chỉ giữ trigger, boundary, fallback; không lặp manual command sau mỗi edit.
- Đặt scripts map ở `docs/operations/agent-rule-scripts.md`; `AGENTS.md` chỉ giữ entrypoint hằng ngày.

## Hệ quả

- Agent đọc ít context hơn nhưng vẫn có rule đúng task.
- Automation active không tạo manual checklist trùng; manual action chỉ là fallback khi tool báo không active hoặc blocked.
- `STATE.md` không stale khi update cùng evidence thay đổi; fact conflict phải verify.
- Notion vẫn là planning layer; Git giữ accepted knowledge, evidence, context bootstrap.

## Chú thích thuật ngữ

- **Rule module**: file rule theo chủ đề, nạp theo trigger task.
- **Context bootstrap**: context tối thiểu để bắt đầu task.
- **Automation**: hook, watcher, wrapper hoặc launcher tự chạy mechanics.
- **Mutable planning**: trạng thái kế hoạch thay đổi thường xuyên.
