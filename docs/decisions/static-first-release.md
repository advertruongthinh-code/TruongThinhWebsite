---
title: Phát hành static website trước CMS
status: superseded
date: 2026-08-08
scope: release
supersedes: []
related_specs:
  - ../specs/frontend-static-release.md
related_reports: []
superseded_by: wrangler-deferred-until-cms.md
---

# Phát hành static website trước CMS

- Status: Superseded bởi
  [`wrangler-deferred-until-cms.md`](wrangler-deferred-until-cms.md)
- Date: 2026-08-08

## Context

Repository chứa public static page và CMS stack đã chuẩn bị một phần. Nếu yêu
cầu D1, R2, Access và CMS data ngay, public release đầu tiên sẽ chậm hơn và
failure surface sẽ lớn hơn.

## Decision

Deploy bilingual public website bằng Cloudflare static asset và Worker routing
layer nhỏ. Worker phải serve mọi canonical static route mà không cần CMS binding.
Dynamic project page và admin publishing trả unavailable hoặc not-found behavior
cho tới khi CMS phase được activate có chủ đích.

Deployment asset được copy từ explicit allowlist vào `.site-output/` bị ignore.
Wrangler không bao giờ dùng repository root làm asset directory.

GitHub vẫn là source of truth. Pull request chạy repeatable contract và Chromium
browser smoke. Production deployment ban đầu là manual.

## Hệ quả

- Website có thể live trước khi CMS infrastructure tồn tại.
- Static file vẫn là rollback path và public fallback.
- CMS code vẫn dormant và có thể được simplify hoặc revalidate sau.
- Trong phase này owner phải publish content change qua source control.

## Chú thích thuật ngữ

- **Failure surface**: các điểm có thể phát sinh lỗi trong một workflow.
- **Binding**: cấu hình nối Worker với resource.
- **Infrastructure**: hệ thống hỗ trợ việc chạy và deploy.
- **Source control**: Git history/repository dùng để quản lý thay đổi.
