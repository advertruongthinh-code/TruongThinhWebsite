# Tài liệu Trường Thịnh

Bắt đầu bằng [STATE](STATE.md), sau đó chọn nguồn theo việc cần làm.
Git giữ accepted engineering knowledge; [Notion](operations/notion.md) giữ
planning/status. Không cần đọc toàn bộ reports để tìm contract hiện hành.

## Tìm theo công việc

| Công việc | Nguồn bắt đầu | Nội dung |
| --- | --- | --- |
| Mục tiêu và phase dự án | [Goal](goal.md) | Static (đang ở) và CMS (chưa mở), nguyên tắc stack free/phí thấp |
| Hiểu hệ thống/deploy | [Architecture](architecture/index.md) | Runtime static, source ownership, ranh giới CMS |
| Sửa frontend | [Frontend](frontend/index.md) | Route, shell, gallery/masonry/detail và test |
| Sửa backend/admin/data | [Backend](backend/index.md) | Dormant/dev/planned, API/data/trust boundary |
| Thiết kế và reuse UI | [Design System](../design-system/README.md) | Token, component, motion, content, ảnh Advertising; [authority map](#authority-map) |
| Nguồn tham khảo thiết kế | [Nguồn tham khảo](../design-system/README.md#nguồn-tham-khảo) | Site tham khảo và báo cáo khảo sát cũ trong Git |
| Brief ảnh theo sản phẩm khách hàng | [BEINCO, Betrimex, Dừa Cửu Long](reference/advertising-client-products.md) | Sản phẩm, bao bì, nguồn xác minh và giới hạn áp dụng vào ảnh |
| Kiểm acceptance | [Verification](verification/index.md) | Current evidence, supersession và parity NOT PASS |
| Dùng tool/agent | [AGENTS](../AGENTS.md), [Operations](operations/TOOLING.md) | Scope, workflow, command và recovery |
| Đặt tên trong docs | [Tên gọi chuẩn](terminology.md) | masonry, grid, card, detail, viewer và tên không dùng |
| Hiểu quyết định | [Decisions](decisions/index.md) | Accepted/superseded; không suy status từ tuổi file |
| Truy nguyên report cũ | [Archive](archive/index.md) | Original bytes, mapping và giới hạn lịch sử |

## Nguồn chuẩn và artifact của Impeccable

[PRODUCT.md](../PRODUCT.md) sở hữu product truth. Visual truth ở
[design-system/](../design-system/README.md) (token kiểm drift với CSS `:root`);
[DESIGN.md](../DESIGN.md) và [.impeccable/design.json](../.impeccable/design.json)
được sinh từ đó cho Impeccable, không sửa tay. Surface brief ở
`.impeccable/surfaces/` giữ chiến lược riêng route. Reuse contract (DOM hook,
lifecycle) nằm trong spec sở hữu.

## Contract hiện hành

- [Intent scrollbar và browser parity](specs/mobile-browser-parity-capability-map.md):
  intent/map và [delta scrollbar](specs/frontend-brand-shell-responsive-runtime.md#scrollbar-parity--2026-09-27)
  cùng [plan/card](../tasks/archive/plan.md) đã duyệt27/09;
  [verification scrollbar](verification/scrollbar-parity-2026-09-27.md) giữ scoped result và gate còn mở.
  [Debug Android thật](operations/android-real-device-debugging.md)
  giữ Chrome/USB và interaction PASS; [owner recording](verification/android-skeleton-observation-2026-09-27.md)
  đã ghi nhận thay frame skeleton khi visual height đổi, gồm capture footer↔grid8792.
  Owner nghiệm thu visual scrollbar; [chẩn đoán preview](verification/mobile-preview-diagnostics-2026-09-27.md)
  giữ lỗi baseline random/landscape/WebKit. [Map bổ sung](specs/mobile-browser-parity-capability-map.md#feedback-preview--intent-và-map-bổ-sung-đã-duyệt)
  đã duyệt; [delta skeleton lifecycle](specs/advertising-skeleton-flow.md#correction-mobile-lifecycle--accepted-2026-09-27)
  đã duyệt bằng “Duyệt delta skeleton”; [plan correction](../tasks/plan.md#correction-baseline-và-skeleton--accepted-2026-09-27)
  và [card correction](https://app.notion.com/p/3e8332849a0e8121bd20e1f62a275bb7) đã duyệt27/09.
  [Correction evidence](verification/mobile-skeleton-correction-2026-09-27.md)
  giữ random/Android functional và lịch sử C05 WebKit RED; [amendment C05R](../tasks/plan.md#amendment-c05r--accepted-2026-09-27)
  cùng delta ownership đã duyệt. Owner duyệt A logical deck12/C06U; current
  Android dọc/ngang1366common pairs không reset, lifecycle/clean80/smoke21/21 đạt.
  Full continuation còn FAIL tại first-DOM-frame ready predicate; MCP UI QA
  blocked. C06/C07 chưa nghiệm thu; checkpoint partial giữ nguyên các gate.
  Kiểm local trước,
  rồi mới debug Sites sau phát hành.
- [Photo/masonry Advertising](specs/advertising-photo-browse.md): layout, history,
  primary, suggestion và catalog154 ảnh. [Capability map](specs/advertising-september-2026-capability-map.md)
  dẫn các correction; không áp checkpoint cũ thay delta mới. Đợt random masonry và
  tải ảnh có [map đã duyệt](specs/advertising-random-grid-and-image-loading-capability-map.md)
  cùng ba spec đã duyệt; [plan triển khai](../tasks/plan.md#advertising-random-grid-và-tải-ảnh--plan-duyệt-2026-10-03)
  đã duyệt, phần lớn đã code; việc còn mở ở [STATE](STATE.md).
- [Media-card toàn website](specs/site-media-card-playback.md): spec đã duyệt
  28/09 cho các họ VI/EN; [plan M00–M09](../tasks/plan.md#media-card-toàn-website--plan-đã-duyệt-2026-09-28)
  đã duyệt, M03–M09 tạm dừng tới khi có ảnh và video thật. Supersession masonry-detail morph chỉ xảy ra khi triển khai;
  viewer morph và history-scroll giữ contract hiện hành. [Đồng bộ Notion và
  kiểm nhất quán Advertising 03/10](verification/advertising-notion-sync-2026-10-03.md)
  chỉ tóm tắt card đang làm; chi tiết Done không được chép.
  [Skeleton chờ ảnh, mở ảnh tại chỗ, màn trắng vào trang](specs/loading-glass-and-page-entry.md):
  owner chốt 04/10; veil khi tải trực tiếp (R6) đã code, phần còn lại chờ code
  và thay vòng xoay Advertising khi triển khai.
  [Kính dùng chung](specs/glass-surface.md): đã code 04/10 cho kính cuối
  masonry và kính vùng dư primary; còn đo trên A05s.
  [CTA giữa viewport, cỡ tiêu đề, footer cửa sổ nhỏ và parallax](specs/advertising-cta-center-parallax.md):
  đã code; thay khoảng CTA–footer cố định, còn chạy thanh địa chỉ trên A05s.
  [Viewer zoom hai ngón và chạm đúp](specs/advertising-viewer-touch-zoom.md):
  đã code, [plan](../tasks/viewer-touch-zoom-plan.md) còn bước A05s; thay ba mức zoom cố định.
- [Menu mở](specs/full-menu-reference-parity.md), [brand shell](specs/frontend-brand-shell-responsive-runtime.md)
  và [Design System](../design-system/README.md): shell và visual authority.
- [Static release](specs/static-release.md): build/hosting;
  [changelog](../CHANGELOG.md) ghi thay đổi phát hành.
- [STATE](STATE.md) giữ active work, blocker và next action;
  [verification index](verification/index.md) giữ evidence có ngày/scope.
- [Cây project](../README.md#cây-thư-mục-và-trạng-thái) là bản đồ ownership.
  Không lặp bản đồ thứ hai hoặc dùng nhãn Git cũ để quyết định xóa file.

## Quy tắc duy trì

Living-docs gate ở [AGENTS.md](../AGENTS.md#state-và-living-docs); supersession
ở [mục dưới](#supersession).

Active docs tổ chức theo domain; độ sâu bổ sung chỉ dùng cho
archive, không tạo folder theo từng ngày/task. Root Impeccable artifacts giữ
nguyên path tool đọc. `docs/reports/` là compatibility cho machine report/CSV;
không là nơi mặc định ghi tài liệu hướng dẫn mới. Original archive không sửa
để làm đẹp; [mapping](archive/mapping.json) giải path trước/sau.

Các link tới `.tmp/`, `research/reference-site/`, CSV generated và ảnh nguồn
trong `source-assets/` là evidence local, không nằm trong gói website. Một số
artifact nguồn không commit; bản clone dùng kết luận có scope trong verification,
không coi thiếu raw artifact là evidence đã kiểm lại hoặc tự tạo lại chúng.

## Authority map

| Contract | Nguồn chuẩn |
| --- | --- |
| Product, user, claim, owner fact, khách hàng, danh mục | [PRODUCT.md](../PRODUCT.md) |
| Token, visual role, component, motion | [Design System](../design-system/README.md), [Motion](../design-system/motion.md) |
| Câu chuyện thương hiệu, logo: tỷ lệ, màu, motion, state | [Brand guideline](../design-system/brand.md) |
| Giọng văn, copy hero, mạch route, crop ảnh | [Content và media](../design-system/content.md) |
| Node lá VI/EN, motion hook, file ảnh, loading, alt | [Route và content](specs/frontend-route-and-content.md#edit-content-và-media), [chuẩn file ảnh](specs/static-image-delivery.md#chuẩn-file-ảnh) |
| Hướng ảnh sáu nhóm Advertising | [Ảnh Advertising](../design-system/advertising-images.md) |
| Chấm ảnh Audit/Critique | [QA ảnh Advertising](operations/agent-rule-evidence-qa-handoff.md#chấm-ảnh-advertising) |
| Nguồn tham khảo thiết kế | [Nguồn tham khảo](../design-system/README.md#nguồn-tham-khảo); không tự thành target |
| Route, lifecycle, reuse contract | [Route và content](specs/frontend-route-and-content.md#reuse-contract) |
| Masonry, catalog, renderer Advertising | [GRID-R4](specs/advertising-grid-span-organic.md), [Advertising](specs/advertising-products-turnkey-services.md) |
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
