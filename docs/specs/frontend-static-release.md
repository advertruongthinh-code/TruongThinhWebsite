---
title: Đặc tả static release
type: frontend
status: accepted
updated: 2026-09-24
notion: none
related_decisions:
  - ../decisions/wrangler-deferred-until-cms.md
  - ../decisions/head-office-address-confirmed.md
  - ../decisions/sites-artifact-only-release-mirror.md
related_reports: []
---

# Đặc tả static release

## Mục tiêu

Giữ website bilingual hiện có chạy và kiểm thử được bằng static runtime độc lập.
Static phase không phụ thuộc CMS, Cloudflare Worker hoặc Wrangler.

## Trong scope

- Năm page type public bằng tiếng Việt và tiếng Anh.
- Canonical locale page và localized content cho local preview bằng static Node
  server của repository.
- Static asset web-ready trong `assets/content/`; file nguồn tái biên tập nằm
  ngoài public build tree tại `source-assets/`.
- Build `.site-output/` từ `src/site/`, loại module, manifest, SVG và media
  chỉ dùng tại source hoặc không có public consumer trước khi đóng gói.
- Browser smoke coverage cho responsive và reduced motion.
- CI chạy static contract và browser smoke mà không khởi động Worker.

## Ngoài scope

- CMS editing, dynamic project publishing, authentication, D1 và R2.
- Production domain connection và owner data chưa được confirm.
- Worker route, redirect, SSR, D1/R2 binding và production deployment.
- UI redesign hoặc product feature mới.

## Acceptance criteria

1. Clone sạch install được bằng `pnpm install --frozen-lockfile`.
2. `pnpm qa:static` pass.
3. `pnpm qa:worker:security` pass không cần D1 hoặc R2.
4. `pnpm dev` chỉ chạy static Node server và phục vụ các route VI/EN đã khai báo.
5. Chromium smoke pass trong CI, không có console, page, network hoặc overflow
   failure.
6. Current package và CI không cài hoặc gọi Wrangler; chưa có workflow CMS deploy.
7. Zalo, founding year và warranty claim vẫn unset cho tới khi owner confirm;
   address dùng owner fact đã accepted.

## Trình tự release

1. Chạy `pnpm dev` và verify route, CTA VI/EN trên local preview.
2. Merge pull request sau khi CI pass.
3. Chưa tạo workflow Cloudflare deploy khi CMS chưa activate.
4. Chỉ chọn static hosting hoặc mở CMS deployment bằng decision và owner gate
   riêng.

## Phát hành Sites — owner yêu cầu 24/09/2026

Owner đã cho phép phát hành snapshot hiện tại lên Sites hiện có và push GitHub
bằng CLI, sau khi dọn project/docs. Đây là static hosting, không mở CMS hoặc
Cloudflare deployment. Giữ audience public hiện tại.

Build dùng chung `ROUTES` và `localeHtml` với local server để tạo22 HTML VI/EN,
không phụ thuộc server rewrite khi chạy trên static hosting. GitHub giữ source,
test, scripts và docs đầy đủ. `tests/site/advertising-primary-p14.e2e.mjs` là
test trong GitHub, không phải file của website public.

Với mỗi release, build `.site-output/` từ một commit GitHub xác định. Source Git
nội bộ của Sites là mirror chỉ có `dist/` (bản sao chính xác của
`.site-output/`) và `.openai/hosting.json` trỏ tới `dist/` ở cây mới nhất;
commit mới nối tiếp lịch sử Sites hiện có, không viết lại lịch sử. Archive gửi
Sites cũng chỉ chứa hai path đó. Manifest trong GitHub tiếp tục trỏ tới
`.site-output/` cho local build. Ghi ánh xạ commit GitHub, commit Sites, checksum
archive và Sites version vào evidence release; kiểm tra cây mirror/archive trước
khi save version. Test và tooling vẫn chịu Git/QA gate, nhưng không đóng gói
vào Sites. Chi tiết lý do tại [quyết định Sites](../decisions/sites-artifact-only-release-mirror.md).

Changelog ghi thay đổi và known limitations; focused PASS không đổi verdict
full-site parity. Rollback dùng saved Sites version trước của cùng project.

Phân loại website, test, CMS và dữ liệu local theo [cây ownership](../../README.md#cây-thư-mục-và-trạng-thái).
Build chỉ lấy `src/site/` và vendor khai báo; không đặt test trong source website
hoặc dùng repository root làm static directory.

## Chú thích thuật ngữ

- **Static release**: lần phát hành dựa trên asset tĩnh, không cần CMS runtime.
- **Quality gate**: kiểm tra bắt buộc phải pass trước release.
- **Smoke test**: kiểm tra nhanh các đường đi và behavior quan trọng.
- **Local preview**: website phục vụ trên máy phát triển để kiểm tra output.
- **Binding**: cấu hình kết nối Worker tới resource như D1 hoặc R2.
- **Release mirror**: source Git Sites chỉ giữ build tĩnh và manifest của lần phát hành.
