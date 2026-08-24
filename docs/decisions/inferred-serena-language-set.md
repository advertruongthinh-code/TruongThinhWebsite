---
title: Serena language set được suy ra, không sửa tay
status: accepted
date: 2026-08-08
scope: historical project decision
supersedes: []
related_specs: []
related_reports: []
---

# Serena language set được suy ra, không sửa tay

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

Serena language set được suy ra, không sửa tay. MCP launcher/watcher xử lý normal
sync bằng mapping đã kiểm tra với enum/schema của Serena, giữ key YAML khác và
thêm/bỏ backend khi file đầu/cuối của loại đó xuất hiện. `-Apply`, health-check,
MCP re-activation chỉ là repair fallback khi tool báo blocked; loại không rõ hoặc
unsupported chỉ được report.

## Hệ quả

Decision historical này vẫn là một phần của accepted project context. Nếu
direction tương lai thay đổi nó, tạo descriptive decision record mới và link file
bị supersede.

## Chú thích thuật ngữ

- **Language set**: tập ngôn ngữ/backend mà Serena cần để phân tích file.
- **Enum/schema**: tập giá trị và cấu trúc dữ liệu được định nghĩa.
- **Backend**: language server hoặc thành phần xử lý cho một loại file.
- **Health-check**: kiểm tra tool còn hoạt động đúng.
- **Repair fallback**: action thủ công chỉ dùng sau khi automation báo blocked.
