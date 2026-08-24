---
title: Quản trị Git–Notion
status: accepted
date: 2026-08-09
scope: documentation and agent workflow
supersedes: []
related_specs: []
related_reports: []
---

# Quản trị Git–Notion

- Status: Accepted
- Date: 2026-08-09

## Context

Project cần workflow nhẹ, bền vững cho solo developer dùng nhiều AI client.
Mutable planning phải dễ dùng trong Notion; accepted technical knowledge phải
reviewable và portable cùng Git repository. Draft, NOW/Kanban state, priority,
blocker, discovery note và knowledge note cần được khai thác trong Notion mà
không biến Notion thành implementation truth chưa review. Reusable agent
tooling được quản trị riêng trong
[`global-agent-stack-project-portability.md`](global-agent-stack-project-portability.md).

## Decision

Notion sở hữu draft, work item, plan, task, priority, status, NOW/Kanban,
blocker, next action, discovery note, knowledge note và research synthesis.
Git sở hữu accepted spec trong `docs/specs/`, decision record trong
`docs/decisions/`, durable evidence trong `docs/reports/` và trạng thái
canonical trong `docs/STATE.md`. `PRODUCT.md` và `DESIGN.md` là product/
visual-system truth khi đã được xác nhận.

Notion page phải link tới Git document liên quan. Notion Spec phải có status
**Approved** và field `Git spec` trỏ tới descriptive Git specification canonical
trước khi bắt đầu implementation planning. Sau verification, cập nhật Git
document/evidence trước rồi mới cập nhật Notion. Chỉ mark Done từ repository
evidence đã verify. Không giữ accepted spec, ADR, report hoặc implementation
evidence chỉ trong Notion.

Dùng `using-agent-skills` cho mọi planned hoặc implementation slice. Dùng
Notion skill liên quan khi connector available và công việc cần Notion context
hoặc verified status update:

- `notion-research-documentation` cho search, fetch, synthesis và citation.
- `notion-knowledge-capture` cho decision, how-to và knowledge summary.
- `notion-spec-to-implementation` chỉ cho Spec đã Approved và có Git spec.

Sol Advisor source, state, runtime và generated adapter là user-global. Generated
adapter chỉ được tạo qua complete preview của Sol Advisor cùng hai exact
user-scope confirmation token.

## Hệ quả

- Clone sạch giữ accepted engineering knowledge mà không phụ thuộc Notion
  availability.
- Notion hữu ích cho daily prioritization, discovery và knowledge capture mà
  không trở thành unreviewed source của implementation truth.
- Mỗi project có thể dùng relation `Projects` → `Docs`/`Tasks`; field mutable
  thiếu trong schema dùng chung được ghi trong page content, không phá schema.
- Sol Advisor vẫn optional và không thể âm thầm tạo global role adapter.
- Repository giữ pin, bootstrap automation và project exception mà không vendor
  reusable agent payload.

## Evidence

- `docs/operations/notion.md`
- `docs/operations/sol-advisor.md`
- `scripts/tooling/install-sol-advisor.ps1`
- `scripts/tooling/doctor.ps1 -Quick` vào 2026-08-08

## Follow-up

- Reload Codex và hoàn tất user-scope adapter setup sau khi review exact preview.
- Tạo descriptive specification đầu tiên sau khi Notion proposal được approve
  hoặc owner explicit authorize Git-only slice.
- Duy trì một Notion project record, Docs hub và NOW task liên kết với repository
  evidence; không tự động đánh dấu Done khi chưa có verification.

## Chú thích thuật ngữ

- **Mutable planning**: kế hoạch có thể đổi nhanh theo priority và blocker.
- **Portable**: clone hoặc workspace mới có thể khôi phục workflow từ Git.
- **Reviewable**: có thể review bằng diff và evidence trong repository.
- **Canonical**: bản ghi chuẩn được ưu tiên khi có nhiều bản.
- **Connector**: kết nối cho phép agent đọc/ghi workspace Notion.
- **Citation**: liên kết hoặc dẫn chứng để truy nguyên nguồn.
