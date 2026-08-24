---
title: Đặc tả static release
type: frontend
status: accepted
updated: 2026-08-09
notion: none
related_decisions:
  - ../decisions/static-first-release.md
related_reports: []
---

# Đặc tả static release

## Mục tiêu

Publish website bilingual hiện có ngay khi quality gate pass. Release không được
phụ thuộc CMS tương lai.

## Trong scope

- Năm page type public bằng tiếng Việt và tiếng Anh.
- Canonical locale URL, redirect, localized metadata, `robots.txt` và
  `sitemap.xml` qua Cloudflare Worker.
- Static asset web-ready trong `assets/content/`; file nguồn tái biên tập nằm
  ngoài public build tree tại `source-assets/`.
- Copy theo allowlist vào `.site-output/` bị ignore để deploy không chứa project
  tooling, report, reference research hoặc CMS admin file.
- Browser smoke coverage cho responsive và reduced motion.
- Production deployment thủ công từ GitHub Actions.

## Ngoài scope

- CMS editing, dynamic project publishing, authentication, D1 và R2.
- Production domain connection và owner data chưa được confirm.
- UI redesign hoặc product feature mới.

## Acceptance criteria

1. Clone sạch install được bằng `pnpm install --frozen-lockfile`.
2. `pnpm qa:static` pass.
3. `pnpm qa:worker:security` pass không cần D1 hoặc R2.
4. `pnpm qa:worker:static` pass khi chạy cùng `pnpm dev`.
5. Chromium smoke pass trong CI, không có console, page, network hoặc overflow
   failure.
6. Deployment tạo preview URL truy cập được và không cần CMS binding.
7. Zalo, address, founding year và warranty claim vẫn unset cho tới khi owner
   confirm.

## Trình tự release

1. Merge pull request sau khi CI pass.
2. Chạy workflow thủ công `Deploy`.
3. Verify route và CTA VI/EN trên preview URL.
4. Chỉ connect production domain sau explicit owner approval.

## Chú thích thuật ngữ

- **Static release**: lần phát hành dựa trên asset tĩnh, không cần CMS runtime.
- **Quality gate**: kiểm tra bắt buộc phải pass trước release.
- **Smoke test**: kiểm tra nhanh các đường đi và behavior quan trọng.
- **Preview URL**: URL tạm để kiểm tra output trước production.
- **Binding**: cấu hình kết nối Worker tới resource như D1 hoặc R2.
