---
title: Live bản tĩnh trước, CMS sau
status: accepted
date: 2026-08-08
scope: historical project decision
supersedes: []
related_specs: []
related_reports: []
---

# Live bản tĩnh trước, CMS sau

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

Static page hoạt động không cần D1, R2, Access hoặc CMS secret. GitHub là source
of truth; pull request chạy contract và Chromium smoke; production deploy ban đầu
là manual workflow. Static file là fallback/rollback. CMS chỉ được activate sau
khi bản tĩnh live ổn định và owner duyệt publishing workflow.

## Hệ quả

Decision historical này vẫn là một phần của accepted project context. Nếu
direction tương lai thay đổi nó, tạo descriptive decision record mới và link file
bị supersede.

## Chú thích thuật ngữ

- **Source of truth**: nguồn chuẩn để đối chiếu và review.
- **Smoke**: kiểm tra nhanh đường đi quan trọng.
- **Publishing workflow**: quy trình soạn và đưa content lên public.
- **Rollback**: quay về output trước đó khi release mới fail.
