---
title: Quản trị Git–Notion
status: accepted
date: 2026-08-09
scope: documentation and agent workflow
supersedes: []
related_specs:
  - ../specs/docs-system.md
related_reports: []
---

# Quản trị Git–Notion

## Context

Solo dev làm việc qua nhiều thread agent. Owner cần một backlog quét nhanh,
còn kiến thức đã chấp nhận phải review được bằng diff và đi cùng repository.

## Decision

- Git nhánh `main` là nguồn chuẩn: spec trong `docs/specs/`, ADR trong
  `docs/decisions/`, `docs/STATE.md`, `PRODUCT.md`, `design-system/`. Evidence
  của mỗi thay đổi nằm trong mô tả PR.
- Board Tasks trên Notion là backlog chung của owner, điều phối và mọi worker.
  Card chỉ giữ tên, status, thứ tự, mục tiêu một dòng, việc còn mở, link spec
  và PR; không spec nháp, evidence hay checklist.
- Worker cập nhật card ở ba mốc: nhận việc, mở PR, merge. Cập nhật Git trước
  rồi mới tới card; chỉ Done khi PR đã merge hoặc evidence trong repository đã
  kiểm.
- Tạo card và đổi status cho việc owner đã giao không cần hỏi lại; xóa, gộp,
  đổi tên card cần owner duyệt.
- Git và Notion lệch nhau thì `main` thắng.

## Hệ quả

- Clone sạch đủ kiến thức để làm việc khi Notion không truy cập được.
- Owner quét backlog trên Notion; chi tiết luôn nằm ở link spec và PR.
- Rule vận hành: [Notion và Git](../operations/notion.md#rule),
  [AGENTS.md](../../AGENTS.md#notion-trong-workflow).

## Lịch sử

Bản 2026-08-09 để Notion giữ draft, discovery, knowledge note và yêu cầu Notion
Spec có status Approved kèm field `Git spec` trước khi lên plan.
[Hệ thống tài liệu](documentation-system.md) thu Notion về backlog card; bản gốc
còn trong Git history.

## Chú thích thuật ngữ

- **Backlog**: danh sách việc chờ làm, sắp theo ưu tiên.
- **Điều phối**: agent giao việc cho worker.
- **Worker**: agent nhận một việc cụ thể (thread hoặc subagent).
- **Evidence**: bằng chứng verify được từ repository, test, tool.
