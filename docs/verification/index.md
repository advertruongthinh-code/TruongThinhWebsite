# Verification và trạng thái parity

Nguồn này định tuyến evidence theo claim; không phải kết quả chạy test mới.
Report có ngày/hash chỉ chứng minh scope tại thời điểm ghi. Muốn claim runtime
hiện tại phải đối chiếu hash và chạy gate phù hợp. Archive là vị trí lưu bản gốc,
không tự có nghĩa mọi claim trong đó bị hủy.

## Trạng thái toàn site

Sites version 2 đã deploy public ngày 25/09/2026 (`succeeded`): GitHub source
`0654dca`, Sites mirror `557da5a` chỉ gồm artifact `dist/`. Xem
[release static-only](release-cleanup-2026-09-24.md#release-static-only-25092026).

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
| Đồng bộ board Notion và kiểm nhất quán Advertising 03/10 | [Notion sync](advertising-notion-sync-2026-10-03.md) | Chỉ tóm tắt `Not started`/`In progress`; 13 card `Done` không chép chi tiết. UI probe desktop 929×861, không thay thế M02b hoặc full-site acceptance |
| M02b Advertising Claude PARTIAL / NOT ACCEPTED | [Checkpoint Claude 03/10](site-media-card-m02b-claude-checkpoint-2026-10-03.md) | Runtime `B1B3C8…`: Masonry instant-relayout fix, related seed `m02b-i`; related 4/6, landscape VI/EN `Y=3` FAIL chưa rõ gốc; full transitions 19/29 với fail đã biết/có sẵn; units58/59, qa:static PASS |
| M02b Advertising quota STOP, PAUSED / NOT ACCEPTED | [Checkpoint 03/10](site-media-card-m02b-checkpoint-2026-10-03.md), [Claude handoff](site-media-card-m02b-claude-handoff-2026-10-03.md) | Runtime `6D654C…`: original6 PASS, affected5/8, related3/6, layout47/static/build PASS, M02a10/11. Ba related và ba affected FAIL còn mở; lifecycle50/52 stale baseline đã xác minh, chưa sửa. MCP matrix TOOL BLOCKED; detector evidence OPEN, Samsung physical skipped/unverified, không là M02b/full-site GREEN |
| M02b Advertising PAUSED/dở dang lịch sử sau source patch | [Checkpoint lịch sử 30/09](site-media-card-m02b-checkpoint-2026-09-30.md) | Một named no-clone VI/EN PASS; timeout B chưa phân loại và bốn named chưa chạy tại thời điểm đó. Giữ immutable; diagnosis/runner và evidence mới ở checkpoint 03/10 không retag report cũ |
| M02b Advertising RED-only trước source patch | [RED baseline 30/09](site-media-card-m02b-red-pause-2026-09-30.md) | Bốn product RED, hai control PASS trên source M02a frozen; behavior M02b chưa sửa tại thời điểm này. Evidence lịch sử, không chuyển PASS sang source candidate hiện tại |
| Media-card Advertising M02a: primary, thumbnail, audio và direct detail | [Checkpoint M02a 30/09](site-media-card-m02a-checkpoint-2026-09-30.md) | Scoped engineering GREEN trên source đã khóa; focused11, viewer controls12, photo-layout15, affected pointer harness và A05s portrait đạt. Raw landscape strict fit RED được L04R native scroll/reachability làm rõ; P14-L04R focused37/37, không đóng multi-engine/Android/660 matrix. Owner visual, clip thật, iPhone/Safari và full-site còn mở |
| Media-card Advertising R6-R3: canvas cover và dải control grid/related | [Checkpoint R6-R3 28/09](site-media-card-r6-r3-checkpoint-2026-09-28.md) | Scoped browser R6 29/29, M01b 25/25, unit77/77, static/build/diffcheck; source/build/served layout/runtime/CSS khớp, seal118/118. Synthetic Chromium 320/390 VI/EN; native, clip public thật và full-site không thuộc checkpoint này |
| Layout mobile: overlap, copy/control100/200% và minimum readable geometry | [Layout28/09](mobile-layout-parity-2026-09-28.md) | L04H history126, matrix660, body210 và state/history3engines đạt trên cùng SHA; regressions9/9, unit57 đạt. A05s portrait16entry/48cycles đạt; [landscape](mobile-layout-parity-2026-09-28.md#l06-landscape-red) ghi16entry/48cycles, geometry132pairs/574nodes≤1px nhưng raw incomplete vì2EN viewer đóng sau touch và CDN load error. L06/L07, iPhone/reference/MCP/owner/full-site giữ mở |
| Advertising history scroll và offscreen photo morph | [H00 28/09](advertising-history-motion-2026-09-28.md) | Chromium EN/VI1543×884, grid Y0=0/detail Y1=480: geometry, computed paint và video cho thấy ảnh clone qua viewport hai chiều. Không tái hiện lỗi trên8792; tab gốc8790 khác candidate chưa xác minh, H01 source fix chưa mở, owner visual còn mở. Runner hash chỉ ghi posthoc, chưa chứng minh pre/post freeze |
| Mobile toolbar: stable geometry, visible controls và visibility | [Viewport27/09](mobile-viewport-stability-2026-09-27.md) | Final132 route/orientation geometry cases/3engines đạt;9 EN text-size failures giữ exit1; fallback/viewer/visibility/resize/focus đạt. Source/evidence review Required0; final USB A05s dọc/ngang14 entries×3cycles,0errors; V-C partial lưu, iPhone/A54/owner/MCP gates mở |
| Random phục hồi, visible skeleton và WebKit cleanup | [Correction27/09](mobile-skeleton-correction-2026-09-27.md) | Current C06U A/deck12 accepted;60unit/19random/6footer, lifecycle3engines/clean80, scrollbar405/smoke21/21 đạt; Android dọc/ngang1366common pairs0reset. Native GPU FPS/profile đạt; full continuation FAIL ready predicate/MCP blocked, C06/C07/device/owner mở; historical C05 RED/C05R GREEN giữ |
| Preview random, skeleton, landscape và WebKit | [Diagnostic27/09](mobile-preview-diagnostics-2026-09-27.md) |8792 dùng baseline trước random; Android footer↔grid tái hiện; landscape settled lỗi ở emulation; delta skeleton và plan/card đã duyệt; implementation đang mở, iPhone chưa kiểm |
| Scrollbar desktop overlay/native và Android thật | [Scrollbar27/09](scrollbar-parity-2026-09-27.md) |405 focused case + Android VI/EN/ngang đạt; owner visual scrollbar đã duyệt; smoke20/21 còn WebKit skeleton error; iPhone/reference drag live còn mở |
| Android thật: skeleton thay frame khi visual height đổi | [Owner recording27/09](android-skeleton-observation-2026-09-27.md) | Galaxy A05s/Chrome153, local candidate66 staged;652 samples/49 ảnh; chưa sửa UI, chưa kiểm Sites2/iPhone hoặc FPS |
| Catalog154, owner selection28 và5 ảnh ChatGPT | [Mapping/review24/09](../../source-assets/projects/advertising/owner-selection-20260924/README.md) |27 thêm,1 thay; COCO/decal còn lỗi chữ nhỏ; không5/5 rubric PASS |
| Full menu responsive | [MENU-R1](menu-reference-parity-2026-09-24.md) |28 geometry,10 flow,2 text zoom; không nghiệm thu thiết bị thật |
| History, footer, slideshow và logo correction | [P7.5](advertising-september-p7-5-2026-09-24.md) | Focused regression; full-site parity không đổi |
| AD-SEPT-2026-P7.3: primary vừa viewport dưới navbar, nav một hàng và suggestion qua resize | [Run 2026-09-23](advertising-september-p7-3-2026-09-23.md) | Focused technical gate đạt; owner visual và Galaxy A54 thật còn mở; full-site vẫn NOT PASS |
| AD-SEPT-2026-P7.1/P7.2: organic skeleton tail, conditional suggestion, hero/navbar regressions, Pinterest overlay và primary cao theo nội dung | [Run 2026-09-23](advertising-september-p7-1-p7-2-2026-09-23.md) | Focused technical gate đạt; owner visual và Galaxy A54 thật còn mở; full-site vẫn NOT PASS |
| AD-SEPT-2026-P2 đến P7: Flow, detail span, morph history, cột 4, masonry, footer/hover/portal, glass, hero one-shot, Pinterest primary, shared header | [Ledger P2–P7](advertising-september-2026-p2-p7.md) | Focused technical gate từng phase đạt; P3-T08 đóng 24/09; owner visual và Galaxy A54 thật còn mở; full-site vẫn NOT PASS |
| Feral Flow formulas, 12 preset, pins/bands và bundle provenance | [Measurement 2026-09-21](feral-flow-measurement-2026-09-21.md) | Clean-room input; không là giấy phép sao chép, pixel parity hoặc runtime PASS Trường Thịnh |
| Up next Advertising: scroll/morph/selection/spacing | [Run 2026-09-09](../archive/reports/verification-upnext-advertising-2026-09-09.md) | Archive; scoped gates tại ngày ghi |
| AD-BROWSE-R1, UI-FRAME-R4 và R6 | [Checkpoint R4/R6](advertising-grid-r4-2026-09-09.md#ad-browse-r1--ui-frame-r4-và-r6-2026-09-10) | Baseline detail/viewer/nhãn: G6 94/94, scrollbar 4/4, compatibility 14/14; không tự bao phủ policy v6 hoặc image-quality |
| AD-BROWSE-R1-P1.1 một cột | [Policy v6 và geometry](advertising-grid-r4-2026-09-09.md#ad-browse-r1-p11--policy-một-cột-2026-09-10) | Node 34/34, grid 30/30, G3 6/6, viewer 94/94; build cuối một cột 6/6 và scrollbar 4/4; owner spot-check còn mở |
| AD-BROWSE-R1-P1.2 | [Cân đáy, CTA và Back v7](advertising-grid-r4-2026-09-09.md#ad-browse-r1-p12--cân-đáy-cta-và-back-2026-09-10) | Node 38/38, 1.320 related cases; transitions 8/8, viewer 94/94, một cột browser 6/6; owner spot-check còn mở |
| Advertising Products scoped work log 31/08–09/09 | [Evidence turnkey](advertising-products-turnkey-evidence.md) | Lịch sử scoped current-hash; contract ở spec |
| Audit + Critique 115 ảnh Advertising | [Bảng điểm đầy đủ](advertising-images-audit-2026-09-09.md) | 70 giữ, 23 sửa, 16 thay, 6 nguồn chưa xác minh; chưa thay ảnh hoặc nghiệm thu GRID-R4 |
| Grid 109 media, spacing | [109 media](../archive/reports/verification-advertising-products-109-media-spacing-2026-09-01.md) | Scoped snapshot, khác rank-v2 và rank-v3 72 card |
| Grid media re-entry | [Replay](../archive/reports/verification-advertising-products-media-reentry-detail-visibility-2026-09-01.md) | Phần detail 7/7 được regression dưới bổ sung |
| Gallery visibility | [Regression ancestor/IMG](../archive/reports/verification-advertising-detail-gallery-visibility-2026-09-02.md) | Không chứng minh root grid hoặc toàn site |
| Sáu composition, 109 source | [Detail composition](../archive/reports/verification-advertising-detail-compositions-109-media-2026-09-02.md) | Evidence lịch sử; flow Advertising đã thay bằng photo view và compatibility |
| Progressive carousel | [Carousel](../archive/reports/verification-advertising-detail-horizontal-carousel-2026-09-02.md) | Evidence lịch sử Advertising; generic carousel vẫn giữ, không là proof photo view |
| Hero direct/F5 | [Hero text](../archive/reports/verification-advertising-hero-text-motion-2026-09-01.md) | Advertising; Commercial reduced-motion gap ngoài scope |
| Brand LOGO-R3 | [Ink gồm dấu, header và màu](brand-lockup-logo-r3-2026-09-10.md) | Revision hiện hành; xem trạng thái gate trong report, không là full-site parity |
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
status explicit; [archive mapping](../archive/mapping.json) giữ SHA256 và file
đã xóa. Không đổi byte của evidence để che lỗi.

## Chú thích thuật ngữ

- **Scoped**: chỉ áp dụng phạm vi được kiểm.
- **Supersession**: claim có nguồn thay thế rõ ràng.
- **Parity**: mức khớp với baseline reference.
- **Ledger**: bảng ghi kết quả hoặc nghĩa vụ kiểm chứng.
