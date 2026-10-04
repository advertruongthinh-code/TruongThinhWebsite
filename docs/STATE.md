# Trạng thái hiện tại

- Updated: 2026-10-04
- Phase: public website static-first VI/EN. Source tại `src/site/`, build tại
  `.site-output/`; CMS/admin/D1/R2/Worker chưa activate.
- Active work: demo chuyển từ ChatGPT Sites (owner hết gói) sang Cloudflare
  Workers static assets theo [decision demo](decisions/cloudflare-workers-static-demo.md).
  Deploy gần nhất 2026-10-04 `9478ed8`, [evidence](specs/frontend-static-release.md#phát-hành-demo-cloudflare--owner-đồng-ý-03102026).
  Release Sites cũ: [checkpoint](verification/release-cleanup-2026-09-24.md).
- Đại tu docs: [spec đã duyệt](specs/docs-system.md), [plan T1–T21](../tasks/docs-overhaul-plan.md),
  [card](https://app.notion.com/p/3ef332849a0e81f3ad86f1fd913afab7). `pnpm qa:docs` (link,
  anchor, giới hạn dòng, sync spec, design-drift, preview sinh) chạy trên PR; T3–T6 tạo
  `design-system/` (token, README, motion, content, ảnh Advertising, 17 component: shell
  và trang sinh từ HTML/CSS, Advertising chụp từ runtime); chỉ mô tả Trường Thịnh, Espacio
  chỉ ghi ở nguồn tham khảo. T7: `DESIGN.md`
  và sidecar Impeccable sinh từ `design-system/`, không sửa tay. T8: đã publish lên
  [claude.ai](https://claude.ai/artifact/HJ1a9QvMREYAFACZzQBQ88); chờ owner duyệt (checkpoint 2).
- Cách làm việc: cloud first từ 2026-10-03; mọi việc (feature, test, QA, debug)
  chạy trong cloud thread trên GitHub, mỗi task một branch ngắn và PR vào `main`.
  Remote Control trên PC chỉ khi cần A05s/iPhone thật. Owner mở CDN Playwright
  và `cdn.jsdelivr.net` ngày 04/10: cloud chạy Chromium và WebKit với Barba/
  Locomotive thật. Firefox không tin CA proxy cloud, chạy qua preload
  `tests/site/support/firefox-cloud-ca.mjs` ([TOOLING](operations/TOOLING.md#browser-qa-trên-cloud)).
- Active execution scope: toàn bộ task trang `advertising-products` và route con
  `?photo=` VI/EN, gồm phần còn lại của M02b và convert media; owner giao và
  duyệt P0–P11 ngày 2026-10-03 ([quyết định](../tasks/plan.md#advertising-random-grid-và-tải-ảnh--plan-duyệt-2026-10-03),
  [capability map](specs/advertising-random-grid-and-image-loading-capability-map.md)).
  M02b đã lên `main`, vẫn NOT ACCEPTED: các FAIL cloud là lỗi test, đã sửa;
  [checkpoint Claude 03/10](verification/site-media-card-m02b-claude-checkpoint-2026-10-03.md#chạy-lại-trên-cloud-03102026).
  Landscape `Y=3` chỉ có trên emulator, A05s thật `Y=0` (giả lập và xoay vật lý).
  Firefox/WebKit trên PC 2026-10-04 không có lỗi mới
  ([kết quả](verification/site-media-card-m02b-claude-checkpoint-2026-10-03.md#firefox-và-webkit-trên-pc-2026-10-04));
  iPhone chưa kiểm vì chưa kết nối. M03–M09 ngoài Advertising vẫn PAUSED.
  History H01–H02 rescope xong trên cloud; viewer không còn đóng khi vuốt từ nền
  (L06), chờ replay A05s ([evidence](verification/advertising-history-motion-2026-09-28.md#h01h02-rescope-và-chạy-cloud-2026-10-04)).
- Tải ảnh: P1–P3 (grid ngẫu nhiên) đã có trong source, test cloud PASS trừ phần
  WebKit; thứ tự filter có test, solver 350/350 lượt hard-safe
  ([evidence 04/10](verification/advertising-random-grid-p0-p10-2026-10-04.md)). P0 baseline đo demo bằng `tests/site/image-delivery-measure.mjs` trên PC;
  variant AVIF/WebP đã nối vào HTML tĩnh và Advertising runtime
  ([pipeline](specs/static-image-delivery.md#pipeline-biến-thể-đã-triển-khai-2026-10-04)). [Ảnh không còn gốc](verification/media-originals-2026-10-03.md).
  P6–P9 xong: owner chọn vòng xoay chờ, không byte progress; ảnh tĩnh dùng vòng
  CSS, Advertising dùng vòng runtime ([spec](specs/image-loading-progress.md)).
  Owner đổi Advertising sang skeleton chờ ảnh, mở ảnh tại chỗ và màn trắng khi
  vào thẳng trang ngày 04/10 ([spec planned](specs/loading-glass-and-page-entry.md));
  thread M02b làm code. CTA cuối masonry đổi sang giữa viewport có parallax,
  footer gọn chỉ ở cửa sổ nhỏ và điện thoại
  ([spec planned](specs/advertising-cta-center-parallax.md)), chờ owner duyệt.
  P8–P9 có e2e `image-loading-frame` 23 ca PASS trên cloud; còn mở: cache hit
  của vòng tĩnh (home lóe tối đa 2 frame chưa xác nhận) ([evidence](verification/advertising-random-grid-p0-p10-2026-10-04.md#p8p9-khung-chờ-và-vòng-tải)).
- Website hiện hành: catalog154 ảnh, dataset2026-09-24.1; đợt owner selection
  thêm27 và thay mobile-retail-05 bằng COCO BREEZE. Năm ảnh ChatGPT nằm trong28
  lựa chọn cuối. [Mapping/evidence](../source-assets/projects/advertising/owner-selection-20260924/README.md).
- UI contract: [photo/masonry](specs/advertising-photo-browse.md),
  [capability map](specs/advertising-september-2026-capability-map.md),
  [menu mở](specs/full-menu-reference-parity.md), [Design System](../design-system/README.md).
  Full-span vừa viewport dưới navbar; suggestion conditional; Back giữ entry,
  navbar về All; skeleton/CTA/footer theo P7.5.
- Verification mới: build/static, media/layout/lifecycle/skeleton37/37, Chromium smoke7/7,
  menu28 geometry +10 flow +2 text zoom, full-span VI/EN ngang/dọc/954px đạt.
  Dependency audit không có advisory. Đây là focused evidence, không full-site PASS.
  QA/audit 04/10 các PR #13–#29, #39 trên Chromium cloud: gate đỏ là test chưa
  biết AVIF hoặc race, đã sửa; About hết tải ảnh hero hai lần. Vòng tải đã
  dừng khi ảnh xong. Còn mở: hai finding nhỏ ở "Gate còn mở" của
  [tải ảnh](specs/static-image-delivery.md#gate-còn-mở).
- Verified limitations: full-site/Espacio parity còn NOT PASS; Galaxy A54 performance thật,
  owner visual các đợt cũ chưa đóng. Editor skeleton tạm đã gỡ khỏi public
  source trước ship; preset hiện hành giữ nguyên.
  COCO/decal còn lỗi chữ nhỏ theo review độc lập; giữ exact bản owner duyệt.
  [Evidence index](verification/index.md) giữ ngày và scope từng run.
- Hard boundary: owner đồng ý chuyển demo sang Workers; mỗi lần deploy vẫn cần
  owner đồng ý. Không suy ra quyền activate CMS, đổi audience/domain hoặc publish
  ảnh chưa duyệt.
  Giữ nguồn ảnh, archive, unrelated work và không bypass Git review hooks.
  [Backup ảnh Sites version 1](../source-assets/site-backups/live-v1-20260924/README.md)
  giữ 54 ảnh từ source commit đã phát hành, kèm SHA-256 trước deploy.
- Knowledge: [docs index](index.md), [cây project](../README.md#cây-thư-mục-và-trạng-thái).
  Git giữ contract/evidence; Notion giữ planning/status. [Backlog hiện hành](https://app.notion.com/p/3e5332849a0e8183b448fea095f9588f)
  gom việc còn mở.
- Tooling: chuyển sang Claude Code ngày 2026-10-03; Claude Code và Codex dùng
  chung global stack, xem [TOOLING](operations/TOOLING.md). Graphify semantic
  files còn pending; không chạy semantic extraction khi chưa có yêu cầu.
  Cloud stack: `scripts/tooling/cloud-setup.sh` cho environment `Default`
  ([TOOLING](operations/TOOLING.md#claude-code-cloud-environment)). Verify
  04/10: không lifecycle hook, 6 plugin `@skills-dir` loaded, 7 MCP connected,
  rule global ở `~/.claude/CLAUDE.md`. `.claude/settings.json` chỉ giữ permission
  rule cho preload Firefox. Đổi script thì dán lại vào environment.
- Claude skill: một nguồn, năm plugin pin ở user scope (cloud `cloud-setup.sh`,
  local `local-setup.ps1`); repo không vendor skill
  ([decision](decisions/claude-skills-from-pinned-plugins.md)). Local verify 04/10:
  5 OK, `ponytail:ponytail`, `agent-skills:spec` hiện.
- STATE trước cleanup: Git `da2f13a` (`docs/archive/snapshots/state-before-release-2026-09-24.md`,
  đã xóa khỏi tree). Đọc như snapshot lịch sử, không áp status cũ lên hiện trạng.
- Next repo action: P11 đạt trên demo 2026-10-04 sau khi tự host font, thư viện
  và cache (Worker `7ee4aaa9`): bytes, ảnh đầu và LCP không route nào vượt baseline
  ([kết quả](specs/static-image-delivery.md#pipeline-biến-thể-đã-triển-khai-2026-10-04)).
  LCP residential mobile còn hai mode do reveal SplitText ở hero title
  ([gate](specs/frontend-static-release.md#gate-còn-mở)).
  M02b chờ owner kiểm nhận và iPhone; owner kiểm nhận giao diện trên
  [demo workers.dev](https://truong-thinh-demo.truong-thinh-project-tooling.workers.dev/vi/);
  phát hành lại theo [các bước](specs/frontend-static-release.md#phát-hành-demo-cloudflare--owner-đồng-ý-03102026); full-site/Espacio parity vẫn là gate riêng. Hero route-return VI/EN đã qua
  regression, filter không replay. Ảnh nguồn và WebP có
  [provenance](../source-assets/projects/advertising/portal-20260924/README.md).

## Chú thích thuật ngữ

- **Snapshot**: trạng thái source cố định để phát hành.
- **Focused evidence**: kết quả chỉ chứng minh phạm vi đã chạy.
- **Dormant**: source có nhưng chưa dùng trong runtime public.
