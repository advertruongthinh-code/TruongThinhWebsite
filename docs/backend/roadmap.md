---
title: Lộ trình backend và CMS
type: roadmap
status: planned
updated: 2026-09-09
related_specs:
  - ../specs/cms-content-publishing.md
related_docs:
  - index.md
  - roadmap.md
  - ../decisions/wrangler-deferred-until-cms.md
---

# Lộ trình backend và CMS

CMS bị hoãn tới khi static website live, ổn định và có rollback path đã biết.
Roadmap này mô tả điều kiện và thứ tự cần kiểm; không cấp quyền implement,
chọn provider hoặc activate Wrangler.

## Trạng thái hiện tại

- Public static route là delivery hiện tại; không phụ thuộc D1, R2, Access hoặc
  CMS secret.
- `src/worker/index.js`, `src/admin/` và `src/db/migrations/` là dormant/dev
  scaffold. `docs/backend/roadmap.md` giữ historical phase boundary.
- `/{locale}/projects/:slug/` là CMS target; sáu Advertising detail route hiện
  là generated static `/{locale}/advertising-products/{slug}/`.
- Provider, database, object storage, retention, backup, region và cost chưa
  được revalidate cho implementation.

## Điều kiện mở CMS phase

1. Static release đã live và rollback path được owner xác nhận.
2. Owner chốt editorial role, review/publish workflow và production domain.
3. Official documentation được kiểm lại cho provider, D1/R2, Access, region,
   retention, backup, limits và cost.
4. Có accepted decision cho provider/storage, schema và security boundary.
5. Owner mở explicit implementation slice; Wrangler chỉ activate trong slice đó.

## Thin slices dự kiến

| Slice | Kết quả phải có | Gate |
| --- | --- | --- |
| Discovery | role, workflow, provider constraints, rollback | owner decision + official evidence |
| Contract | localized content, media kind/alt/poster, publication state, allowlisted `layoutKey` | accepted CMS/frontend spec update |
| Storage | one post type, one media flow, selected provider boundary | migration/backup/retention proof |
| Publishing | draft/review/publish/unpublish, audit, idempotency, failure handling | contract/security/integration tests |
| Public projection | deterministic renderer + static fallback | parity sample, browser/accessibility evidence, rollback rehearsal |

Không bắt đầu page builder đa dụng, multi-tenant permission hoặc static source
replacement. Mỗi slice phải giữ public static route đọc được khi CMS unavailable.

## Failure và rollback contract

- Invalid localized content, media hoặc `layoutKey`: reject ở write boundary.
- Missing/unpublished/unavailable data: public renderer dùng safe fallback; không
  lộ admin state.
- D1/R2/provider failure: observable error, không xoá static output; rollback về
  static release trước.
- Schema/provider migration: snapshot, backup, reversible path và accepted
  decision trước khi chạy.

Chi tiết validation, authentication, CSRF, authorization, rate-limit, audit và
media orphan cleanup thuộc [CMS publishing spec](../specs/cms-content-publishing.md).

## Verification commands khi được mở

Các command dưới đây là checklist tương lai, chỉ chạy sau owner gate và live
spec tương ứng:

```powershell
pnpm qa:worker:static
pnpm qa:worker
pnpm qa:site
```

Hiện tại có thể chạy `pnpm qa:static` cho static source. Không gọi checklist
tương lai là evidence production hoặc deploy.

## Chú thích thuật ngữ

- **CMS phase**: phase dynamic bắt đầu sau static release boundary.
- **Editorial workflow**: chuỗi draft, review và publish do owner chốt.
- **Allowlisted layoutKey**: mã layout được frontend cho phép, không phải arbitrary component code.
- **Safe fallback**: output public ổn định khi dữ liệu dynamic lỗi hoặc thiếu.
- **Rollback rehearsal**: kiểm chứng đường quay về release trước bằng evidence có thể lặp lại.
