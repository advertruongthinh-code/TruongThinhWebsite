---
title: Demo tĩnh chạy trên Cloudflare Workers static assets
status: accepted
date: 2026-10-03
scope: static website release
supersedes:
  - https://github.com/advertruongthinh-code/TruongThinhWebsite/blob/f7795ffa3b416af8187738d5f9445b48558fada7/docs/decisions/sites-artifact-only-release-mirror.md
related_specs:
  - ../specs/static-release.md
related_reports: []
---

# Demo tĩnh chạy trên Cloudflare Workers static assets

## Bối cảnh

Owner không còn gói ChatGPT Sites, nên bản demo trên `chatgpt.site` không còn
là đường phát hành. [Decision khóa Wrangler](wrangler-deferred-until-cms.md)
yêu cầu mọi lựa chọn static hosting khác phải được quyết định riêng. Workers
static assets miễn phí trên gói Free, cho dùng thương mại, và cùng provider với
hướng CMS trong [goal](../goal.md). Owner đồng ý chuyển ngày 2026-10-03.

## Quyết định

1. Demo tĩnh deploy bằng Worker chỉ có asset (assets-only), cấu hình tại
   `wrangler.static.toml`: không `main`, không binding, `directory` là
   `.site-output`, tên Worker `truong-thinh-demo`, URL `workers.dev`.
2. `pnpm deploy:demo` build `.site-output/` rồi deploy. `pnpm demo:wrangler`
   gọi Wrangler bản pin trong `tooling-versions.json` qua `pnpm dlx`, chỉ dùng
   cho login, dry-run và rollback của demo. Wrangler không vào dependency hay
   lockfile.
3. Deploy chạy tay trên máy owner, đăng nhập bằng `wrangler login` vào tài
   khoản Cloudflare của owner. Không có CI deploy, không API token hay secret
   trong repository, CI hoặc chat.
4. Mỗi lần deploy cần owner đồng ý rõ ràng. Agent chỉ chạy `--dry-run`.
5. CMS vẫn khóa: `wrangler.toml`, `src/worker/` và Worker contract test giữ
   dormant. Không dùng `wrangler.toml` cho demo.

## Hệ quả

- Build tĩnh đã có sẵn 22 HTML VI/EN nên không cần Worker script; route
  `/vi/`, `/en/` và trang con phục vụ trực tiếp từ asset.
- Rollback bằng `wrangler rollback` hoặc chọn deployment cũ trong Cloudflare
  dashboard. Sites version cũ không còn là rollback path.
- Domain riêng và audience vẫn cần owner gate riêng.
- Khi mở CMS phase, migration Wrangler xử lý việc thay hoặc gộp Worker demo.

## Chú thích thuật ngữ

- **Assets-only Worker**: Worker chỉ phục vụ file tĩnh, không chạy code riêng.
- **Binding**: cấu hình nối Worker với D1, R2 hoặc resource khác.
- **workers.dev**: subdomain miễn phí Cloudflare cấp cho Worker.
- **Dry run**: chạy kiểm cấu hình và gói upload mà không deploy.
- **Rollback**: quay về deployment đã biết.
