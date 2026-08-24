---
title: Process là invariant
status: accepted
date: 2026-07-30
scope: historical project decision
supersedes: []
related_specs: []
related_reports: []
---

# Process là invariant

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

Process là invariant:
**Khảo sát → Tư vấn → Sản xuất → Lắp đặt**. Đây là câu chuyện năng lực và là
acceptance check, không đổi theo route.

## Hệ quả

Decision historical này vẫn là một phần của accepted project context. Nếu
direction tương lai thay đổi nó, tạo descriptive decision record mới và link file
bị supersede.

## Chú thích thuật ngữ

- **Process invariant**: thứ tự quy trình phải giữ nguyên ở mọi route.
- **Acceptance check**: kiểm tra dùng để quyết định kết quả có đạt không.
- **Route**: URL hoặc context public cụ thể.
