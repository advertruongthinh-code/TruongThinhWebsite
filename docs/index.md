# Tài liệu Trường Thịnh

Bắt đầu bằng [STATE](STATE.md), sau đó chọn nguồn theo việc cần làm.
Git giữ accepted engineering knowledge; [Notion](operations/notion.md) giữ
planning/status. Report và verification cũ đã rời cây thư mục; Git history giữ
bản gốc.

## Tìm theo công việc

| Công việc | Nguồn bắt đầu | Nội dung |
| --- | --- | --- |
| Mục tiêu và phase dự án | [Goal](goal.md) | Static (đang ở) và CMS (chưa mở), nguyên tắc stack free/phí thấp |
| Hiểu hệ thống/deploy | [Architecture](architecture.md) | Runtime static, source ownership, ranh giới CMS |
| Sửa frontend | [Capability map](specs/docs-system.md#r2-capability-map-và-spec-sống) | Spec từng phần website: route, shell, masonry, detail và test |
| Sửa Worker/admin/D1 | [CMS](specs/cms.md) | Code dormant, API, trust boundary, gate mở CMS |
| Thiết kế và reuse UI | [Design System](../design-system/README.md) | Token, component, motion, content, ảnh Advertising; [authority map](#authority-map) |
| Nguồn tham khảo thiết kế | [Nguồn tham khảo](../design-system/README.md#nguồn-tham-khảo) | Site tham khảo và báo cáo khảo sát cũ trong Git |
| Brief ảnh theo sản phẩm khách hàng | [BEINCO, Betrimex, Dừa Cửu Long](reference/advertising-client-products.md) | Sản phẩm, bao bì, nguồn xác minh và giới hạn áp dụng vào ảnh |
| Kiểm acceptance | Mục "Gate còn mở" của từng spec | Gate NOT PASS còn mở; evidence mỗi thay đổi nằm trong PR |
| Dùng tool/agent | [AGENTS](../AGENTS.md), [Operations](operations/TOOLING.md) | Scope, workflow, command và recovery |
| Đặt tên trong docs | [Tên gọi chuẩn](terminology.md) | masonry, grid, card, detail, viewer và tên không dùng |
| Hiểu quyết định | [Decisions](decisions/index.md) | Accepted/superseded; không suy status từ tuổi file |
| Truy nguyên report cũ | `git log -- docs/verification docs/archive docs/reports` | Bản gốc trong Git history, đọc bằng `git show <commit>:<path>` |

## Nguồn chuẩn và artifact của Impeccable

[PRODUCT.md](../PRODUCT.md) sở hữu product truth. Visual truth ở
[design-system/](../design-system/README.md) (token kiểm drift với CSS `:root`);
[DESIGN.md](../DESIGN.md) và [.impeccable/design.json](../.impeccable/design.json)
được sinh từ đó cho Impeccable, không sửa tay. Surface brief ở
`.impeccable/surfaces/` giữ chiến lược riêng route. Reuse contract (DOM hook,
lifecycle) nằm trong spec sở hữu.

## Contract hiện hành

- [Masonry Advertising](specs/advertising-masonry.md): trang, catalog, filter, thứ tự ngẫu nhiên,
  hình học, ảo hóa và card; [batch skeleton](specs/advertising-skeleton.md) nối tiếp masonry tới
  footer. Gate còn mở (A05s, iPhone, continuation FAIL) ở từng spec.
  Scrollbar, viewport, layout mobile ở [shell website](specs/site-shell.md#gate-còn-mở).
  [Debug Android thật](operations/android-real-device-debugging.md) giữ Chrome/USB.
- [Detail Advertising](specs/advertising-detail.md): `?photo=`, primary, suggestion, related,
  viewer, history và vị trí cuộn. Đợt random masonry và
  tải ảnh nằm ở masonry, detail và [tải ảnh](specs/media-delivery.md); [plan triển khai](../tasks/plan.md#advertising-random-grid-và-tải-ảnh--plan-duyệt-2026-10-03)
  đã duyệt, phần lớn đã code; việc còn mở ở [STATE](STATE.md).
- [Card nhiều media](specs/media-card.md): runtime Advertising, hướng owner duyệt
  28/09 cho các họ VI/EN; [plan M00–M09](../tasks/plan.md#media-card-toàn-website--plan-đã-duyệt-2026-09-28)
  đã duyệt, M03–M09 tạm dừng tới khi có ảnh và video thật. Supersession masonry-detail morph chỉ xảy ra khi triển khai;
  viewer morph và history-scroll giữ contract hiện hành.
  [Skeleton chờ ảnh và Kính hiện ảnh](specs/loading-glass-and-page-entry.md): đã code, thay
  vòng xoay ở Advertising; owner chưa nghiệm thu trên demo. Veil vào thẳng trang ở shell R7.
  [Kính dùng chung](specs/glass-surface.md): đã code 04/10 cho kính cuối
  masonry và kính vùng dư primary; còn đo trên A05s.
  [CTA giữa viewport, cỡ tiêu đề, footer cửa sổ nhỏ và parallax](specs/advertising-cta-center-parallax.md):
  đã code; thay khoảng CTA–footer cố định, còn chạy thanh địa chỉ trên A05s.
  [Viewer zoom hai ngón và chạm đúp](specs/advertising-viewer-touch-zoom.md):
  đã code, A05s dọc đạt; thay ba mức zoom cố định.
- [Shell website](specs/site-shell.md), [Trang chủ](specs/page-home.md),
  [Residential, Commercial, About](specs/detail-pages.md) và
  [Design System](../design-system/README.md): shell, các trang và visual authority.
- [Static release](specs/static-release.md): build/hosting;
  [changelog](../CHANGELOG.md) ghi thay đổi phát hành.
- [STATE](STATE.md) giữ active work, blocker và next action; evidence có
  ngày và scope nằm trong mô tả PR.
- [Cây project](../README.md#cây-thư-mục-và-trạng-thái) là bản đồ ownership.
  Không lặp bản đồ thứ hai hoặc dùng nhãn Git cũ để quyết định xóa file.

## Quy tắc duy trì

Living-docs gate ở [AGENTS.md](../AGENTS.md#state-và-living-docs); supersession
ở [mục dưới](#supersession).

Active docs tổ chức theo domain, không tạo folder theo từng ngày/task. Root
Impeccable artifacts giữ nguyên path tool đọc. Machine report và CSV của tooling
layout-motion parity ghi vào `.tmp/reports/`.

Các link tới `.tmp/`, `research/reference-site/`, CSV generated và ảnh nguồn
trong `source-assets/` là evidence local, không nằm trong gói website. Một số
artifact nguồn không commit; bản clone dùng kết luận có scope trong spec và PR,
không coi thiếu raw artifact là evidence đã kiểm lại hoặc tự tạo lại chúng.

## Authority map

| Contract | Nguồn chuẩn |
| --- | --- |
| Product, user, claim, owner fact, khách hàng, danh mục | [PRODUCT.md](../PRODUCT.md) |
| Token, visual role, component, motion | [Design System](../design-system/README.md), [Motion](../design-system/motion.md) |
| Câu chuyện thương hiệu, logo: tỷ lệ, màu, motion, state | [Brand guideline](../design-system/brand.md) |
| Giọng văn, copy hero, mạch route, crop ảnh | [Content và media](../design-system/content.md) |
| Node lá VI/EN, motion hook, file ảnh, loading, alt | [Ba trang con](specs/detail-pages.md#r4-nội-dung-vien-và-hook), [chuẩn file ảnh](specs/media-delivery.md#r5-chuẩn-file-ảnh) |
| Hướng ảnh sáu nhóm Advertising | [Ảnh Advertising](../design-system/advertising-images.md) |
| Chấm ảnh Audit/Critique | [QA ảnh Advertising](operations/agent-rule-evidence-qa-handoff.md#chấm-ảnh-advertising) |
| Nguồn tham khảo thiết kế | [Nguồn tham khảo](../design-system/README.md#nguồn-tham-khảo); không tự thành target |
| Route, lifecycle, reuse contract | [Shell](specs/site-shell.md), [ba trang con](specs/detail-pages.md#r6-reveal-parallax-đổi-ngôn-ngữ-và-vòng-đời) |
| Masonry, catalog, renderer Advertising | [Masonry](specs/advertising-masonry.md), [skeleton](specs/advertising-skeleton.md) |
| Implementation đang chạy | `src/site/`, `scripts/`, `tests/` |

Source chỉ cho thấy implementation hiện tại; owner hoặc spec đã duyệt mới nâng
nó thành target. Spec và operations chỉ link contract ngoài domain, không giữ
bản sao thông số.

## Supersession

Khi decision đã duyệt đổi:

1. Tạo hoặc cập nhật decision mới.
2. Link decision cũ bằng `supersedes`/`superseded_by`, hoặc xóa file cũ khi
   owner duyệt gộp (Git history giữ provenance).
3. Cập nhật tài liệu sở hữu contract trong cùng PR.
4. Ghi migration, rollback, evidence; sửa mọi link trong cùng PR.

Source đổi mà target đã duyệt chưa đổi: ghi phần lệch, không tự sửa yêu cầu
thiết kế.

## Chú thích thuật ngữ

- **Contract**: yêu cầu hoặc giao diện có hiệu lực.
- **Authority**: nguồn chuẩn khi có nhiều bản ghi.
- **Living docs**: tài liệu được cập nhật cùng hệ thống.
- **Provenance**: nguồn gốc và phương pháp tạo evidence.
