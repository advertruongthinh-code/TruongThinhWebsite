# Trạng thái hiện tại

- Updated: 2026-10-05
- Phase: public website static-first VI/EN. Source tại `src/site/`, build tại
  `.site-output/`; CMS/admin/D1/R2/Worker chưa activate.
- Active work: demo chuyển từ ChatGPT Sites (owner hết gói) sang Cloudflare
  Workers static assets theo [decision demo](decisions/cloudflare-workers-static-demo.md).
  Deploy gần nhất 2026-10-05 `40e5f11` (Worker `5cd90669`), [cách phát hành](specs/static-release.md#r11-phát-hành-demo-cloudflare).
- Đại tu docs: [spec đã duyệt](specs/docs-system.md), [plan T1–T21](../tasks/docs-overhaul-plan.md),
  [card](https://app.notion.com/p/3ef332849a0e81f3ad86f1fd913afab7). `pnpm qa:docs` (link,
  anchor, giới hạn dòng, sync spec, design-drift, preview sinh) chạy trên PR; T3–T6 tạo
  `design-system/` (token, README, motion, content, ảnh Advertising, 17 component: shell
  và trang sinh từ HTML/CSS, Advertising chụp từ runtime); chỉ mô tả Trường Thịnh, Espacio
  chỉ ghi ở nguồn tham khảo. T7: `DESIGN.md`
  và sidecar Impeccable sinh từ `design-system/`, không sửa tay. T8: đã publish lên
  [claude.ai](https://claude.ai/artifact/HJ1a9QvMREYAFACZzQBQ88); owner duyệt bản 20 (checkpoint 2).
  T9: owner duyệt pilot [static-release](specs/static-release.md) và template.
  T10: [shell](specs/site-shell.md) thay hai spec shell, menu và bốn verification cũ.
  T11: [trang chủ](specs/page-home.md) thay spec landing. T12: [trang con](specs/detail-pages.md)
  thay spec route. T13: [masonry](specs/advertising-masonry.md) và [skeleton](specs/advertising-skeleton.md)
  thay bảy spec Advertising cũ. T14: [detail Advertising](specs/advertising-detail.md) thay spec
  photo browse, morph và hai capability map. T15: [tải ảnh](specs/media-delivery.md) và
  [card nhiều media](specs/media-card.md) thay ba spec ảnh, media và map cuối. T16: [CMS](specs/cms.md)
  dormant thay spec CMS và backend; `qa:docs` fail khi file `src/site/` chưa có spec. T16b: spec skeleton
  chờ ảnh và CTA cuối trang sang format mới, hết spec format cũ; owner duyệt checkpoint 3.
  T17: xóa verification, archive, reports, frontend (gate còn mở chuyển vào spec),
  [architecture](architecture.md) thành một file.
- Code lệch thiết kế (owner chọn sửa code 05/10): intro header chạy dưới veil, header không ẩn
  trong 1,25 màn hình cuối trang, menu About như bốn trang kia, hover ảnh trang con dùng primitive
  chung, scroll cue trượt chữ, Back/Forward Advertising về đúng Y; test cũ đã sửa theo thiết kế
  ([card](https://app.notion.com/p/3f0332849a0e81daa6d4dd730b393d47)).
- Cách làm việc: cloud first từ 2026-10-03; mọi việc (feature, test, QA, debug)
  chạy trong cloud thread trên GitHub, mỗi task một branch ngắn và PR vào `main`.
  Remote Control trên PC chỉ khi cần A05s/iPhone thật. Owner mở CDN Playwright
  ngày 04/10; font và vendor tự host nên cloud chạy Chromium, Firefox và WebKit
  trực tiếp ([TOOLING](operations/TOOLING.md#browser-qa-trên-cloud)).
- Active execution scope: toàn bộ task trang `advertising-products` và route con
  `?photo=` VI/EN, gồm phần còn lại của M02b và convert media; owner giao và
  duyệt P0–P11 ngày 2026-10-03 ([quyết định](../tasks/plan.md#advertising-random-grid-và-tải-ảnh--plan-duyệt-2026-10-03),
  [tải ảnh](specs/media-delivery.md)).
  M02b đã lên `main`, vẫn NOT ACCEPTED: các FAIL cloud là lỗi test, đã sửa.
  Landscape `Y=3` chỉ có trên emulator, A05s thật `Y=0` (giả lập và xoay vật lý).
  Firefox/WebKit trên PC 2026-10-04 không có lỗi mới;
  iPhone chưa kiểm vì chưa kết nối. M03–M09 ngoài Advertising vẫn PAUSED,
  trừ pinch viewer (M07b): đã lên `main` theo [spec](specs/advertising-viewer-touch-zoom.md), A05s dọc đạt 05/10.
  History H01–H02 rescope xong trên cloud; viewer không còn đóng khi vuốt từ nền
  (L06), chờ replay A05s ([evidence](specs/advertising-detail.md#gate-còn-mở)).
- Tải ảnh: P1–P3 (grid ngẫu nhiên) đã có trong source, test cloud PASS trừ phần
  WebKit; thứ tự filter có test, solver 350/350 lượt hard-safe
  ([evidence 04/10](specs/advertising-masonry.md#gate-còn-mở)). P0 baseline đo demo bằng `tests/site/image-delivery-measure.mjs` trên PC;
  variant AVIF/WebP đã nối vào HTML tĩnh và Advertising runtime
  ([pipeline](specs/media-delivery.md#r1-biến-thể-ảnh-nội-dung)).
  P6–P9 xong: owner chọn vòng xoay chờ, không byte progress; ảnh tĩnh dùng vòng
  CSS ([spec](specs/media-delivery.md#r6-vòng-tải-ảnh-tĩnh)). Advertising dùng skeleton chờ
  ảnh trên card và primary, primary đổi ảnh tại chỗ bằng crossfade
  ([spec](specs/loading-glass-and-page-entry.md)); veil vào thẳng trang chỉ fallback
  khi motion.js lỗi hoặc tại `DOMContentLoaded` ([shell R7](specs/site-shell.md#r7-veil-khi-tải-trực-tiếp-fallback-và-bfcache)); ảnh vừa tải hiện dưới Kính
  năm bậc rồi kính tan. CTA cuối masonry đã code 04/10: chân chữ dòng cuối tiêu
  đề nằm giữa viewport, có parallax; footer gọn ở cửa sổ nhỏ; footer mọi trang
  còn ba icon Facebook, TikTok, YouTube ([spec](specs/advertising-cta-center-parallax.md)).
  Chờ owner xem trên demo; thanh địa chỉ A05s thật chưa chạy.
  P8–P9 có e2e `image-loading-frame` 23 ca PASS trên cloud; còn mở: cache hit
  của vòng tĩnh (home lóe tối đa 2 frame chưa xác nhận) ([evidence](specs/media-delivery.md#gate-còn-mở)).
- Website hiện hành: catalog154 ảnh, dataset2026-09-24.1; đợt owner selection
  thêm27 và thay mobile-retail-05 bằng COCO BREEZE. Năm ảnh ChatGPT nằm trong28
  lựa chọn cuối. [Mapping/evidence](../source-assets/projects/advertising/owner-selection-20260924/README.md).
- UI contract: [masonry](specs/advertising-masonry.md), [detail](specs/advertising-detail.md),
  [tải ảnh](specs/media-delivery.md), [card nhiều media](specs/media-card.md),
  [shell](specs/site-shell.md), [Design System](../design-system/README.md).
  Full-span vừa viewport dưới navbar; suggestion conditional; Back giữ entry,
  navbar từ ảnh về nhóm đã chọn (ảnh vào thẳng về All); skeleton/CTA/footer theo P7.5.
- Verification mới: build/static, media/layout/lifecycle/skeleton37/37, Chromium smoke7/7,
  menu28 geometry +10 flow +2 text zoom, full-span VI/EN ngang/dọc/954px đạt.
  Dependency audit không có advisory. Đây là focused evidence, không full-site PASS.
  Layout mobile L00–L07 xong 05/10: 660 ca ba engine cùng commit và A05s dọc,
  ngang 0 lỗi; iPhone, A54, owner còn mở ([gate shell](specs/site-shell.md#gate-còn-mở)).
  QA/audit 04/10 các PR #13–#29, #39 trên Chromium cloud: gate đỏ là test chưa
  biết AVIF hoặc race, đã sửa; About hết tải ảnh hero hai lần. Vòng tải đã
  dừng khi ảnh xong. Còn mở: hai finding nhỏ ở "Gate còn mở" của
  [tải ảnh](specs/media-delivery.md#gate-còn-mở).
- Verified limitations: full-site/Espacio parity còn NOT PASS
  ([gate](specs/static-release.md#gate-còn-mở)); Galaxy A54 performance thật,
  owner visual các đợt cũ chưa đóng. Editor skeleton tạm đã gỡ khỏi public
  source trước ship; preset hiện hành giữ nguyên.
  COCO/decal còn lỗi chữ nhỏ theo review độc lập; giữ exact bản owner duyệt.
  Evidence từng run nằm trong PR và Git history.
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
  rule global ở `~/.claude/CLAUDE.md`. Đổi script thì dán lại vào environment.
- Claude skill: một nguồn, năm plugin pin ở user scope (cloud `cloud-setup.sh`,
  local `local-setup.ps1`); repo không vendor skill
  ([decision](decisions/claude-skills-from-pinned-plugins.md)). Local verify 04/10:
  5 OK, `ponytail:ponytail`, `agent-skills:spec` hiện.
- STATE trước cleanup: Git `da2f13a` (`docs/archive/snapshots/state-before-release-2026-09-24.md`,
  đã xóa khỏi tree). Đọc như snapshot lịch sử, không áp status cũ lên hiện trạng.
- Next repo action: P11 đạt trên demo 2026-10-04 sau khi tự host font, thư viện
  và cache (Worker `7ee4aaa9`): bytes, ảnh đầu và LCP không route nào vượt baseline
  ([kết quả](specs/media-delivery.md#r7-đo-tốc-độ-và-ngân-sách)).
  LCP residential mobile còn hai mode do reveal SplitText ở hero title
  ([gate](specs/static-release.md#gate-còn-mở)).
  M02b owner chưa đạt 04/10: lỗi Back (cuộn ghi history quá dày) và màn trắng
  khi vào thẳng trang đã sửa; skeleton chờ ảnh, mở ảnh tại chỗ và kính hiện,
  tan trên ảnh vừa tải đã code, còn trace A05s (R9); [Kính dùng chung](specs/glass-surface.md)
  đã code 04/10; kính cung đạt A05s với ba bậc; vào thẳng ảnh vẫn rơi gate long task (task
  dài nhất `310ms` còn `~68ms` sau PR #107, #111; `motion.js` hết task dài; Layout
  đầu trang bỏ menu đóng và masonry (cloud `~107ms` xuống `~35ms`), A05s chưa đo lại, [gate](specs/glass-surface.md#gate-còn-mở));
  iPhone chưa kiểm. Owner kiểm nhận giao diện trên
  [demo workers.dev](https://truong-thinh-demo.truong-thinh-project-tooling.workers.dev/vi/);
  phát hành lại theo [các bước](specs/static-release.md#r11-phát-hành-demo-cloudflare); full-site/Espacio parity vẫn là gate riêng. Hero route-return VI/EN đã qua
  regression, filter không replay. Ảnh nguồn và WebP có
  [provenance](../source-assets/projects/advertising/portal-20260924/README.md).

## Chú thích thuật ngữ

- **Snapshot**: trạng thái source cố định để phát hành.
- **Focused evidence**: kết quả chỉ chứng minh phạm vi đã chạy.
- **Dormant**: source có nhưng chưa dùng trong runtime public.
