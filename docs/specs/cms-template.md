---
title: <tiêu đề CMS slice>
type: cms
status: draft
updated: YYYY-MM-DD
notion: <Notion URL hoặc none>
related_decisions: []
related_reports: []
---

# <Tiêu đề CMS slice>

## Kết quả và boundary

- Editorial outcome: <owner có thể publish gì>
- Public outcome: <visitor có thể render gì>
- Trong scope: <behavior hoàn chỉnh nhỏ nhất>
- Ngoài scope: <điều defer rõ ràng>

## Actor và lifecycle

<Owner/editor/reviewer role, authentication boundary và transition
draft/review/publish/unpublish.>

## Contract content có cấu trúc

<Field post, localized text, image/video media, alt text, poster và
`layoutKey` được allowlist. Reject raw HTML, arbitrary CSS và arbitrary
component code.>

## Interface

<Admin command, public read contract, input/output type, validation error,
authorization failure, idempotency và compatibility rule.>

## Media pipeline

<Upload validation, size/type limit, object naming, variant, poster handling,
orphan cleanup, retention và failure recovery.>

## Security và operations

<Session/auth, CSRF, rate limit, audit event, least privilege, logging, metric,
alerting và incident response.>

## Rendering và fallback

```text
structured post -> validated media -> allowlisted layoutKey
-> deterministic renderer -> static-safe fallback
```

<Xác định behavior khi CMS, media object, layout hoặc localization invalid.>

## Migration, rollback và verification

<Expand/compatibility step, rollback trigger, contract test, integration test,
browser check và evidence location.>

## Chú thích thuật ngữ

- **Editorial**: phần workflow để người phụ trách soạn và publish content.
- **Allowlist**: danh sách giá trị được phép.
- **Idempotency**: chạy lại cùng request không tạo kết quả trùng ngoài ý muốn.
- **Orphan cleanup**: dọn object không còn được content hợp lệ tham chiếu.
- **Fallback**: kết quả an toàn khi dữ liệu hoặc capability chính không dùng được.
