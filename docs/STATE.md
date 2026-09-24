# Trạng thái hiện tại

- Updated: 2026-09-24
- Phase: public website static-first VI/EN. Source tại `src/site/`, build tại
  `.site-output/`; CMS/admin/D1/R2/Worker chưa activate.
- Active work: hoàn tất ranh giới GitHub/source/test và Sites/artifact theo
  [quyết định release mirror](decisions/sites-artifact-only-release-mirror.md).
  GitHub đã nhận source `9b50e32`. Mirror đang staged, chưa commit/push/save/deploy;
  285 file `dist/` khớp từng byte với build từ source đó, không chứa test/tooling.
  Sites xác nhận vẫn version 1. Plugin Sites mất thư mục local trong lúc tiếp tục
  task; script phát hành chính thức hiện không có. [Checkpoint](verification/release-cleanup-2026-09-24.md).
- Website hiện hành: catalog154 ảnh, dataset2026-09-24.1; đợt owner selection
  thêm27 và thay mobile-retail-05 bằng COCO BREEZE. Năm ảnh ChatGPT nằm trong28
  lựa chọn cuối. [Mapping/evidence](../source-assets/projects/advertising/owner-selection-20260924/README.md).
- UI contract: [photo/grid](specs/advertising-photo-browse.md),
  [capability map](specs/advertising-september-2026-capability-map.md),
  [menu mở](specs/full-menu-reference-parity.md), [DESIGN](../DESIGN.md).
  Full-span vừa viewport dưới navbar; gợi ý conditional; Back giữ entry,
  navbar về All; skeleton/CTA/footer theo P7.5.
- Verification mới: build/static, media/layout/lifecycle/skeleton37/37, Chromium smoke7/7,
  menu28 geometry +10 flow +2 text zoom, full-span VI/EN ngang/dọc/954px đạt.
  Dependency audit không có advisory. Đây là focused evidence, không full-site PASS.
- Verified limitations: full-site/Espacio parity còn NOT PASS; Galaxy A54 thật,
  owner visual các đợt cũ chưa đóng. Editor skeleton tạm đã gỡ khỏi public
  source trước ship; preset hiện hành giữ nguyên.
  COCO/decal còn lỗi chữ nhỏ theo review độc lập; giữ exact bản owner duyệt.
  [Evidence index](verification/index.md) giữ ngày và scope từng run.
- Hard boundary: user đã cho phép GitHub/Sites cho snapshot hiện tại; không
  suy ra quyền activate CMS, đổi audience/domain hoặc publish ảnh chưa duyệt.
  Giữ nguồn ảnh, archive, unrelated work và không bypass Git review hooks.
  [Backup ảnh Sites version 1](../source-assets/site-backups/live-v1-20260924/README.md)
  giữ 54 ảnh từ source commit đã phát hành, kèm SHA-256 trước deploy.
- Knowledge: [docs index](index.md), [cây project](../README.md#cây-thư-mục-và-trạng-thái).
  Git giữ contract/evidence; Notion giữ planning/status. [Backlog hiện hành](https://app.notion.com/p/3e5332849a0e8183b448fea095f9588f)
  gom việc còn mở; 12 card cũ vào Trash, 13 card Done giữ làm lịch sử.
- Tooling: Graphify AST fresh tại query; 258 semantic file pending khi tiếp tục release.
  Không chạy semantic extraction. Serena đã activate đúng project.
- Lịch sử checkpoint được bảo toàn tại
  [STATE trước cleanup](archive/snapshots/state-before-release-2026-09-24.md).
  Đọc như snapshot lịch sử, không áp status cũ lên hiện trạng.
- Next repo action: khôi phục plugin Sites, hoàn tất Git gate cho mirror và
  phát hành snapshot website `9b50e32` bằng workflow Sites chính thức.
  Owner đã cho phép commit/push/deploy ngày 2026-09-24; giữ audience public.
  Hero route-return VI/EN đã qua regression, filter không replay. Ảnh nguồn và WebP có
  [provenance](../source-assets/projects/advertising/portal-20260924/README.md).

## Chú thích thuật ngữ

- **Snapshot**: trạng thái source cố định để phát hành.
- **Focused evidence**: kết quả chỉ chứng minh phạm vi đã chạy.
- **Dormant**: source có nhưng chưa dùng trong runtime public.

