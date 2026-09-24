# Verification và trạng thái parity

Nguồn này định tuyến evidence theo claim; không phải kết quả chạy test mới.
Report có ngày/hash chỉ chứng minh scope tại thời điểm ghi. Muốn claim runtime
hiện tại phải đối chiếu hash và chạy gate phù hợp. Archive là vị trí lưu bản gốc,
không tự có nghĩa mọi claim trong đó bị hủy.

## Trạng thái toàn site

[Checkpoint cleanup/release24/09](release-cleanup-2026-09-24.md): commit local
đã qua pre-commit; GitHub/Sites pre-push bị chặn, chưa phát hành version mới.

Full website và Espacio parity vẫn **NOT PASS**. [Canonical machine report](../reports/research-espacio-layout-motion-parity.md)
giữ fail/blocked/unmapped; [pilot](../reports/research-espacio-layout-motion-parity-pilot.md)
và [targeted](../reports/research-espacio-layout-motion-parity-targeted.md) là các
subset, không thay verdict toàn bộ. [Motion audit](../reports/research-espacio-motion-audit.md)
là ledger source/runtime; [baseline Espacio](../reference/espacio/index.md) là
reference có provenance, không là TT parity PASS.

Owner spot-check một photo view VI và một EN theo AD-BROWSE-R1 vẫn là human
acceptance đang mở. Flow này thay category carousel; docs hoặc focused tests
không tự đóng gate hoặc cấp quyền deploy.

## Evidence sở hữu contract hiện hành

| Claim cần truy nguyên | Report | Giới hạn |
| --- | --- | --- |
| Catalog154, owner selection28 và5 ảnh ChatGPT | [Mapping/review24/09](../../source-assets/projects/advertising/owner-selection-20260924/README.md) |27 thêm,1 thay; COCO/decal còn lỗi chữ nhỏ; không5/5 rubric PASS |
| Full menu responsive | [MENU-R1](menu-reference-parity-2026-09-24.md) |28 geometry,10 flow,2 text zoom; không nghiệm thu thiết bị thật |
| History, footer, slideshow và logo correction | [P7.5](advertising-september-p7-5-2026-09-24.md) | Focused regression; full-site parity không đổi |
| Glass boundary, suggestion border và scroll restore | [P7.4](advertising-september-p7-4-2026-09-23.md) | P7.5 tiếp tục case route/footer |
| AD-SEPT-2026-P7.3: primary vừa viewport dưới navbar, nav một hàng và suggestion qua resize | [Run 2026-09-23](advertising-september-p7-3-2026-09-23.md) | Focused technical gate đạt; owner visual, Galaxy A54 thật và P3-T08 còn mở; full-site vẫn NOT PASS |
| AD-SEPT-2026-P7.1/P7.2: organic skeleton tail, conditional suggestion, hero/navbar regressions, Pinterest overlay và primary cao theo nội dung | [Run 2026-09-23](advertising-september-p7-1-p7-2-2026-09-23.md) | Focused technical gate đạt; owner visual, Galaxy A54 thật và P3-T08 còn mở; full-site vẫn NOT PASS |
| AD-SEPT-2026-P7: hero one-shot, mobile tail/Glassmorphism, Pinterest primary/pager, suggestion-first và shared header | [Run 2026-09-23](advertising-september-p7-2026-09-23.md) | Focused functional gate đạt; performance 30fps trên Galaxy A54 thật và owner visual gate còn mở; full-site vẫn NOT PASS |
| AD-SEPT-2026-P6/P6.1/P6.2: footer boundary, shared hover, portal type-fit, skeleton CTA glass field và photo overflow shared glass | [Run 2026-09-22](advertising-september-p6-2026-09-22.md) | P6, P6.1 và P6.2 focused technical gate đạt; photo Back P6.1 đã bị P6.2 supersede; P3-T08 và owner visual gate còn mở |
| AD-SEPT-2026-P5: continuous masonry, shared hover, skeleton global fade và backdrop white erase | [Run 2026-09-21](advertising-september-p5-2026-09-21.md) | P5-T01–P5-T07 technical gate đạt; P3-T08 và owner visual gate còn mở |
| AD-SEPT-2026-P4: batch Flow, viewport replay, N4/span3 cột 4 và morph backdrop | [Run 2026-09-21](advertising-september-p4-2026-09-21.md) | P4-T01–P4-T05 technical gate đạt; P3-T08 và owner visual gate còn mở |
| AD-SEPT-2026-P3: WebGL 12 preset, detail span3, viewer, history, CTA và nav canonical | [Run 2026-09-21](advertising-september-p3-2026-09-21.md) | P3-T01–P3-T07 technical gate đạt; P3-T08 tune/removal và owner visual gate còn mở |
| Feral Flow formulas, 12 preset, pins/bands và bundle provenance | [Measurement 2026-09-21](feral-flow-measurement-2026-09-21.md) | Clean-room input; không là giấy phép sao chép, pixel parity hoặc runtime PASS Trường Thịnh |
| AD-SEPT-2026-P2: Flow, detail span2, morph history, CTA một viewport và logo R5 | [Run 2026-09-21](advertising-september-p2-2026-09-21.md) | Scoped technical gate đạt; owner visual gate và media selection còn mở |
| Up next Advertising: scroll/morph/selection/spacing | [Run 2026-09-09](upnext-advertising-2026-09-09.md) | Scoped gates; xem acceptance và giới hạn trong report |
| AD-BROWSE-R1, UI-FRAME-R4 và R6 | [Checkpoint R4/R6](advertising-grid-r4-2026-09-09.md#ad-browse-r1--ui-frame-r4-và-r6-2026-09-10) | Baseline detail/viewer/nhãn: G6 94/94, scrollbar 4/4, compatibility 14/14; không tự bao phủ policy v6 hoặc image-quality |
| AD-BROWSE-R1-P1.1 một cột | [Policy v6 và geometry](advertising-grid-r4-2026-09-09.md#ad-browse-r1-p11--policy-một-cột-2026-09-10) | Node 34/34, grid 30/30, G3 6/6, viewer 94/94; build cuối một cột 6/6 và scrollbar 4/4; owner spot-check còn mở |
| AD-BROWSE-R1-P1.2 | [Cân đáy, CTA và Back v7](advertising-grid-r4-2026-09-09.md#ad-browse-r1-p12--cân-đáy-cta-và-back-2026-09-10) | Node 38/38, 1.320 related cases; transitions 8/8, viewer 94/94, một cột browser 6/6; owner spot-check còn mở |
| Audit + Critique 115 ảnh Advertising | [Bảng điểm đầy đủ](advertising-images-audit-2026-09-09.md) | 70 giữ, 23 sửa, 16 thay, 6 nguồn chưa xác minh; chưa thay ảnh hoặc nghiệm thu GRID-R4 |
| Grid 109 media, spacing | [109 media](../archive/reports/verification-advertising-products-109-media-spacing-2026-09-01.md) | Scoped snapshot, khác rank-v2 và rank-v3 72 card |
| Grid media re-entry | [Replay](../archive/reports/verification-advertising-products-media-reentry-detail-visibility-2026-09-01.md) | Phần detail 7/7 được regression dưới bổ sung |
| Gallery visibility | [Regression ancestor/IMG](../archive/reports/verification-advertising-detail-gallery-visibility-2026-09-02.md) | Không chứng minh root grid hoặc toàn site |
| Sáu composition, 109 source | [Detail composition](../archive/reports/verification-advertising-detail-compositions-109-media-2026-09-02.md) | Evidence lịch sử; flow Advertising đã thay bằng photo view và compatibility |
| Progressive carousel | [Carousel](../archive/reports/verification-advertising-detail-horizontal-carousel-2026-09-02.md) | Evidence lịch sử Advertising; generic carousel vẫn giữ, không là proof photo view |
| Hero direct/F5 | [Hero text](../archive/reports/verification-advertising-hero-text-motion-2026-09-01.md) | Advertising; Commercial reduced-motion gap ngoài scope |
| Brand LOGO-R3 | [Ink gồm dấu, header và màu](brand-lockup-logo-r3-2026-09-10.md) | Revision hiện hành; xem trạng thái gate trong report, không là full-site parity |
| Brand LOGO-R2 | [Lockup trước delta tính dấu](brand-lockup-logo-r2-2026-09-09.md) | Evidence lịch sử, được LOGO-R3 thay cho behavior hiện tại |
| Agent tooling | [Major upgrade](../archive/reports/verification-pnpm-impeccable-major-2026-09-08.md), [Superpowers](../archive/reports/verification-superpowers-codex-2026-09-08.md) | Version/fixtures tại ngày ghi, không website release |
| Docs migration R1 | [Verification living docs](living-docs-2026-09-09.md) | Links/schema/preservation/reuse; không runtime UI |

## Supersession rõ ràng

| Evidence cũ | Nguồn thay cho current behavior |
| --- | --- |
| Current-hash/single-column 2026-08-31, nghiên cứu batching 2026-08-30 | Accepted [organic spacing/media ADR](../decisions/advertising-organic-masonry-espacio-spacing-media-distribution.md) và report 109 media |
| Organic 72 card, outer 20/gap 16 | Report 109 media và [Advertising spec](../specs/advertising-products-turnkey-services.md) |
| One-shot entrance không replay remount | Report re-entry; detail visibility dùng report regression 2026-09-02 |
| Sáu category detail composition và Advertising carousel | [AD-BROWSE-R1](../specs/advertising-photo-browse.md) và [UI/compatibility proof](advertising-grid-r4-2026-09-09.md#ad-browse-r1--ui-frame-r4-và-r6-2026-09-10); giữ report gốc, không áp kết quả cũ cho photo view |
| Browser/project/bootstrap snapshot tháng 7–8 | Historical; tra current scope trong STATE, tooling runbook và report mới tương ứng |

Không tự bỏ accepted ADR vì cũ. [Decision index](../decisions/index.md) giữ
status explicit; [archive index](../archive/index.md) giữ toàn bộ bản gốc và
mapping SHA256. Known historical broken paths được ghi tại report migration;
không đổi byte của evidence để che lỗi.

## Chú thích thuật ngữ

- **Scoped**: chỉ áp dụng phạm vi được kiểm.
- **Supersession**: claim có nguồn thay thế rõ ràng.
- **Parity**: mức khớp với baseline reference.
- **Ledger**: bảng ghi kết quả hoặc nghĩa vụ kiểm chứng.
