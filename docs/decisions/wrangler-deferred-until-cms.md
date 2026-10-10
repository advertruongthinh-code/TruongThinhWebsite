---
title: Khóa Wrangler đến phase CMS
status: accepted
date: 2026-09-01
scope: release tooling
supersedes: []
related_specs:
  - ../specs/static-release.md
related_reports: []
---

# Khóa Wrangler đến phase CMS

## Context

Static website hiện tại không cần Cloudflare Worker để phát triển, kiểm thử giao
diện hoặc tạo `.site-output/`. Giữ Wrangler trong active workflow làm tăng runtime
surface và có thể khởi động nhầm Worker trước khi CMS được chốt.

## Decision

Static trước, CMS sau: public site chạy không cần D1, R2, Access hoặc CMS
secret. GitHub là source of truth; static output là fallback và rollback path.
CMS chỉ activate sau khi bản tĩnh live ổn định và owner duyệt publishing
workflow. Cơ chế phát hành static hiện hành nằm ở
[demo Cloudflare Workers static assets](cloudflare-workers-static-demo.md).

Trong static phase:

- `pnpm dev` dùng static Node server của repository tại
  `scripts/tooling/serve-static-parity.mjs`;
- Wrangler không là dependency; chỉ `pnpm deploy:demo` gọi Wrangler pin qua `pnpm dlx`, từ
  workflow `Deploy demo` ([demo](cloudflare-workers-static-demo.md));
- Workflow đó chỉ deploy static assets; chưa activate CMS hoặc đọc secret CMS;
- `src/worker/`, `wrangler.toml` và Worker contract test được giữ dormant để
  không mất thiết kế CMS đã có.

Wrangler chỉ được cài và nối lại vào command, CI hoặc deployment sau khi owner
explicit activate CMS phase và duyệt spec cùng implementation plan tương ứng.
Một lựa chọn static hosting khác, nếu có, phải được quyết định riêng và không tự
động mở lại Wrangler.
Ngày 2026-10-03, [demo trên Workers static assets](cloudflare-workers-static-demo.md)
là quyết định riêng đó: chỉ `pnpm deploy:demo` gọi Wrangler, không mở CMS.

## Hệ quả

- Local preview và static browser QA không phụ thuộc Cloudflare runtime.
- Ngoài demo static, không có production hoặc CMS deployment command đang active.
- Worker route, redirect, SSR, D1, R2 và Access contract không thuộc static gate
  hiện tại.
- CMS phase có thể phục hồi Wrangler bằng một migration có kiểm chứng thay vì
  dựng lại Worker source từ đầu.

## Điều kiện mở khóa

1. Owner xác nhận bắt đầu CMS phase.
2. Live spec xác định Worker route, binding, local persistence và deployment.
3. Owner duyệt implementation plan.
4. Wrangler được pin lại, CI/deploy được phục hồi và Worker contract pass trên
   runtime thật.

## Lịch sử

2026-10-03 gộp và xóa `static-before-cms`, `static-first-release`; bỏ quy tắc cũ
"PR smoke và manual deploy". Bản gốc còn trong Git history. 2026-10-10 sửa câu "không có deploy workflow" cho khớp workflow `Deploy demo`.

## Chú thích thuật ngữ

- **Dormant**: source được giữ lại nhưng không nằm trong workflow đang chạy.
- **Runtime surface**: tập dependency và tiến trình có thể được kích hoạt.
- **Binding**: cấu hình nối Worker với D1, R2 hoặc resource khác.
- **Rollback path**: đường quay về output trước khi release mới fail.
- **Explicit activate**: owner ra quyết định rõ ràng để mở một phase đã khóa.
