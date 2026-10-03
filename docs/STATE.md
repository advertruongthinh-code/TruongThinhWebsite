# Trạng thái hiện tại

- Updated: 2026-10-03
- Phase: public website static-first VI/EN. Source tại `src/site/`, build tại
  `.site-output/`; CMS/admin/D1/R2/Worker chưa activate.
- Active work: demo chuyển từ ChatGPT Sites (owner hết gói) sang Cloudflare
  Workers static assets theo [decision demo](decisions/cloudflare-workers-static-demo.md).
  Đã deploy 2026-10-03, [evidence](specs/frontend-static-release.md#phát-hành-demo-cloudflare--owner-đồng-ý-03102026).
  Release Sites cũ: [checkpoint](verification/release-cleanup-2026-09-24.md).
- Active execution scope: M02b media-card Advertising (`advertising-products`
  và route con `?photo=` VI/EN), restore từ tag `archive/mobile-ui-contract-20261003`
  vào worktree Claude. PAUSED / NOT ACCEPTED theo
  [checkpoint 03/10](verification/site-media-card-m02b-checkpoint-2026-10-03.md)
  và [handoff](verification/site-media-card-m02b-claude-handoff-2026-10-03.md):
  [checkpoint Claude 03/10](verification/site-media-card-m02b-claude-checkpoint-2026-10-03.md):
  related 4/6 PASS sau fix Masonry và seed fixture; landscape VI/EN `Y=3` còn
  FAIL, chưa rõ gốc. M03–M09 PAUSED đến khi owner mở lại.
- [Capability map masonry Advertising và tải ảnh](specs/advertising-random-grid-and-image-loading-capability-map.md)
  cùng ba module spec đã được owner duyệt; runtime chưa sửa. Bước tiếp là
  [plan/task list riêng](../tasks/plan.md#advertising-random-grid-và-tải-ảnh--plan-chờ-duyệt-2026-09-25) chờ owner
  duyệt; plan Advertising cũ và các human acceptance mở được giữ nguyên.
- Website hiện hành: catalog154 ảnh, dataset2026-09-24.1; đợt owner selection
  thêm27 và thay mobile-retail-05 bằng COCO BREEZE. Năm ảnh ChatGPT nằm trong28
  lựa chọn cuối. [Mapping/evidence](../source-assets/projects/advertising/owner-selection-20260924/README.md).
- UI contract: [photo/masonry](specs/advertising-photo-browse.md),
  [capability map](specs/advertising-september-2026-capability-map.md),
  [menu mở](specs/full-menu-reference-parity.md), [DESIGN](../DESIGN.md).
  Full-span vừa viewport dưới navbar; gợi ý conditional; Back giữ entry,
  navbar về All; skeleton/CTA/footer theo P7.5.
- Verification mới: build/static, media/layout/lifecycle/skeleton37/37, Chromium smoke7/7,
  menu28 geometry +10 flow +2 text zoom, full-span VI/EN ngang/dọc/954px đạt.
  Dependency audit không có advisory. Đây là focused evidence, không full-site PASS.
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
- Claude skill: 55 skill vendor tại `.claude/skills` từ pin, cloud thread dùng được
  ([decision](decisions/claude-skills-vendored-from-pins.md)). Máy local còn bước gỡ
  link `~/.claude/skills` rồi bootstrap theo [TOOLING](operations/TOOLING.md#claude-code-skill-trong-repo).
- STATE trước cleanup: Git `da2f13a` (`docs/archive/snapshots/state-before-release-2026-09-24.md`,
  đã xóa khỏi tree). Đọc như snapshot lịch sử, không áp status cũ lên hiện trạng.
- Next repo action: owner duyệt plan/task list cho random masonry và image loading;
  owner kiểm nhận giao diện trên
  [demo workers.dev](https://truong-thinh-demo.truong-thinh-project-tooling.workers.dev/vi/);
  phát hành lại theo [các bước](specs/frontend-static-release.md#phát-hành-demo-cloudflare--owner-đồng-ý-03102026); full-site/Espacio parity vẫn là gate riêng. Hero route-return VI/EN đã qua
  regression, filter không replay. Ảnh nguồn và WebP có
  [provenance](../source-assets/projects/advertising/portal-20260924/README.md).

## Chú thích thuật ngữ

- **Snapshot**: trạng thái source cố định để phát hành.
- **Focused evidence**: kết quả chỉ chứng minh phạm vi đã chạy.
- **Dormant**: source có nhưng chưa dùng trong runtime public.
