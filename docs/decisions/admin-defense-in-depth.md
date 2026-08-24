---
title: Defense in depth cho admin
status: accepted
date: 2026-07-31
scope: historical project decision
supersedes: []
related_specs: []
related_reports: []
---

# Defense in depth cho admin

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

Admin được bảo vệ theo defense in depth. Ngoài lớp Access, Worker còn verify
RS256 JWT/JWKS, issuer, audience, expiry, email allowlist và same-origin write.
D1 content có schema cố định; R2 private chỉ phát media đã publish/approve.

## Hệ quả

Decision historical này vẫn là một phần của accepted project context. Nếu
direction tương lai thay đổi nó, tạo descriptive decision record mới và link file
bị supersede.

## Chú thích thuật ngữ

- **Defense in depth**: nhiều lớp bảo vệ độc lập để một lớp fail không làm mất
  toàn bộ boundary.
- **JWT/JWKS**: token và key set dùng để xác thực request.
- **Allowlist**: danh sách giá trị hoặc identity được phép.
- **Same-origin**: request phải đến từ origin hợp lệ của website.
