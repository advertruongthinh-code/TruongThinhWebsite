---
title: Intent và capability map cho scrollbar và browser parity
type: cross-cutting
status: accepted
updated: 2026-09-30
intent_status: owner-confirmed
intent_confirmed: 2026-09-27
map_approved: 2026-09-27
feedback_intent_confirmed: 2026-09-27
feedback_map_status: accepted
feedback_map_approved: 2026-09-27
related_specs:
  - frontend-brand-shell-responsive-runtime.md
  - advertising-skeleton-flow.md
  - advertising-photo-browse.md
---

# Scrollbar và browser parity

Owner xác nhận intent và duyệt capability map ngày27/09/2026 sau interview.
Module contract chi tiết vẫn cần human gate. Tài liệu này
không cấp quyền sửa UI, resume recovery hoặc phát hành candidate.

## Intent đã xác nhận

1. Scrollbar giống Espacio Home Design theo evidence đã lưu. Shell và
   glassmorphism liền mạch; không giữ thanh cuộn thường trực làm lệch cảm nhận.
2. Skeleton card theo cùng hành vi cuộn/reveal của card thường trong grid.
   Cuộn qua một ngưỡng không tự reset batch hoặc phát lại hiệu ứng tải.
3. Chữ/icon trong nút giữ nội dung, cỡ và căn chỉnh đúng giữa các trình duyệt.
   Owner báo cùng nội dung nhưng căn chỉnh khác giữa iPhone và Android.
4. Bổ sung contract từng phần, bắt đầu scrollbar. Feedback mới mở đúng phần
   liên quan, có evidence và điều kiện kiểm lại; không suy full-site parity.
5. Kiểm thử Android thật bằng Chrome nối USB với máy Windows chạy Codex.
   Bằng chứng Android không thay kiểm chứng iPhone. Giữ nội dung/design khác;
   recovery, QA/release cũ và P11 tiếp tục paused.

Đối tượng là người dùng website public VI/EN. Lý do mở correction là scrollbar
phá cảm giác shell, skeleton chạy lại khi kéo từ đáy lên và nội dung nút lệch
giữa thiết bị. [Quan sát Android27/09](../verification/android-skeleton-observation-2026-09-27.md)
đã tái hiện thay frame skeleton khi visual height đổi và đối chiếu source
height/hash. Owner nghiệm thu visual scrollbar ngày27/09 bằng “scrollbar ổn”;
gate thiết bị/reference riêng chưa tự đóng. Nút chưa nghiệm thu, skeleton chưa sửa behavior;
không suy nguyên nhân mọi lần reset từ một phiên capture.

## Capability map đã duyệt

| Module id | Trách nhiệm | Phụ thuộc để nghiệm thu | Nguồn sở hữu |
| --- | --- | --- | --- |
| `android-usb-qa` | Kết nối Chrome trên Android thật; lưu metadata, DOM/CSS, lỗi và thao tác cuộn | — | [Hướng dẫn debug](../operations/android-real-device-debugging.md); không thay UI contract |
| `scrollbar-parity` | Chốt scrollbar/shell theo reference; geometry và tương tác tương ứng | `android-usb-qa` cho mobile gate | Delta của [brand shell](frontend-brand-shell-responsive-runtime.md), tham chiếu [Espacio](../reference/espacio/index.md) |
| `skeleton-card-lifecycle` | Giữ lifecycle/reveal khi cuộn như card thường; không reset batch do ngưỡng cuộn | `android-usb-qa` | Delta của [skeleton flow](advertising-skeleton-flow.md) và [photo/grid](advertising-photo-browse.md) |
| `button-content-parity` | Căn chỉnh chữ/icon trong nút trên browser mục tiêu | `android-usb-qa` | Delta của [brand shell](frontend-brand-shell-responsive-runtime.md) và visual authority hiện hữu |

Các dependency trên là gate kiểm chứng, không đề xuất dependency runtime mới.
Thứ tự soạn contract: `scrollbar-parity` trước, rồi hai correction còn lại.
Thiết lập Android chạy độc lập theo yêu cầu hướng dẫn debug của owner.
Mỗi module UI vẫn cần spec và plan được duyệt trước code. Không tạo lại spec
monolithic hoặc nhân bản design token; dùng delta tại nguồn đã sở hữu contract.

Owner duyệt [delta scrollbar](frontend-brand-shell-responsive-runtime.md#scrollbar-parity--2026-09-27)
ngày27/09: “Duyệt delta scrollbar”. [Plan scrollbar](../../tasks/plan.md) và
[checklist](../../tasks/todo.md) đã được duyệt cùng card riêng27/09. Không mở lại spec gate;
skeleton lifecycle và plan/card C00–C07 đã duyệt27/09; delta/plan nút vẫn cần gate riêng.

## Reference và giới hạn

[Foundations Espacio](../reference/espacio/foundations.md) và
[components](../reference/espacio/components.md) giữ source/measurement đã lưu.
Số10px trong foundations là scrollbar native của Trường Thịnh ở snapshot cũ,
không phải width target của Espacio. [Bổ sung scrollbar27/09](../reference/espacio/components.md#bổ-sung-scrollbar--2026-09-27)
giữ CSS/source hash và phép đo idle/scroll/hover; drag/release live còn open.
Không tự suy idle timeout hoặc gọi source-derived state là live PASS.

Contract scrollbar chi tiết phải dẫn exact artifact/source hash cho từng state
đã chốt: idle, scrolling, hover/drag, menu/viewer lock, native/mobile và reduced
motion. Tái dùng artifact còn phù hợp; chỉ đo bổ sung state thiếu hoặc stale.
Reference behavior khác theo scroll mode phải được ghi riêng, không áp toàn bộ
desktop lên điện thoại. Không copy source, media, font hoặc logo reference.

## Quality bar và gate

Giữ [QA/handoff rule](../operations/agent-rule-evidence-qa-handoff.md),
accepted module contracts và test assertions hiện hữu. Không hạ gate để pass.
Không thêm performance budget hoặc gọi Android physical PASS từ emulation.

| Gate | Điều kiện |
| --- | --- |
| Intent | Owner đã xác nhận5 yêu cầu phía trên; Chrome/Android/USB đã xác định |
| Map | Owner đã duyệt boundary và dependency ngày27/09/2026: “Duyệt map như đề xuất” |
| Spec/plan | Từng delta có state, oracle, test và ownership; owner duyệt trước code |
| Runtime | Cùng route/locale/state, có browser/device version và source/version; desktop/browser matrix cùng Android thật; iPhone chưa kiểm thì ghi open |
| Handoff | Contract link evidence đúng scope; không biến focused PASS thành full-site/release/P11 PASS |

Android USB và Chrome/CDP/MCP đã kết nối được ngày27/09/2026; DOM read,
screenshot, menu/touch-swipe và owner manual recording đã verified tại
[hướng dẫn debug](../operations/android-real-device-debugging.md).
Owner yêu cầu kiểm local trước; sau phát hành mới debug bản Sites. Kết nối
thành công không là nghiệm thu UI hoặc permission resume recovery/P11.

## Ranh giới recovery

[Card đang giữ checkpoint](https://app.notion.com/p/3e6332849a0e81508d66ca0b3cfebf18)
vẫn paused theo owner. Checkout recovery tại `.tmp/advertising-random-media`
giữ checkpoint66 staged paths; source commit/push/deploy candidate chưa có.
Draft amendment Git gate cũ chưa được duyệt. Map mới không resume hoặc sửa
checkpoint đó. Sites public vẫn version2 tại lần đọc native27/09/2026.

<a id="feedback-preview--intent-xác-nhận-map-bổ-sung-chờ-duyệt"></a>

## Feedback preview — intent và map bổ sung đã duyệt

Owner xác nhận restate ngày27/09: “Xác nhận intent này”. Feedback cụ thể là
**hành vi random trên preview mất**, không phải owner yêu cầu bỏ contract.
Scrollbar visual được chấp nhận. [Chẩn đoán preview](../verification/mobile-preview-diagnostics-2026-09-27.md)
và [capture footer↔grid8792](../verification/android-skeleton-observation-2026-09-27.md#bổ-sung-preview8792--footergrid)
là input correction, không approval code hoặc release.

Intent bổ sung đã xác nhận:

1. Người xem website VI/EN nhận cùng một bản local giữ random grid đã duyệt
   và scrollbar vừa đạt; preview correction không quay về runtime trước random.
2. Skeleton theo card thường khi cuộn, không remount/reveal lại do toolbar hoặc
   ngưỡng scroll trong lúc slot còn trong viewport. Tách Flow animation/pause
   và entry hợp lệ khỏi việc dựng lại node do geometry.
3. Title/filter/header không đè nhau trên landscape; WebKit không còn context
   pressure hoặc loseContext lỗi. Bằng chứng Android không thay iPhone thật.
4. Bổ sung contract từng phần, giữ media, preset, taxonomy, copy và design đã
   chấp nhận; một agent Sol/ultra gộp QA/audit/code review, effective unknown.
5. Recovery release/P11 tiếp tục paused; đợt này chưa commit/push/deploy.
   Button-content parity vẫn giữ trong map cũ, chưa mở implementation.

Owner duyệt boundary/dependency và thứ tự bên dưới ngày27/09:
“Duyệt map bổ sung”. Approval này cho soạn module spec, chưa cho code.

| Module id | Trách nhiệm correction | Phụ thuộc/gate | Nguồn sở hữu |
| --- | --- | --- | --- |
| `preview-contract-preservation` | Chọn snapshot preview chứa random đã có cùng scrollbar; lưu provenance và kiểm không rơi contract khi tích hợp | Contract `advertising-organic-random` đã accepted và `scrollbar-parity`; giữ recovery immutable | Contract random tại primary/recovery `docs/specs/advertising-organic-random.md`; report preview ghi exact checkout/hash |
| `skeleton-card-lifecycle` | Mở rộng module hiện hữu: slot/reveal/Flow ổn định khi toolbar/scroll thay viewport; allocation/cleanup WebGL không gây error | `preview-contract-preservation`, `android-usb-qa`; WebKit matrix và iPhone gate riêng | Delta tại [skeleton flow](advertising-skeleton-flow.md) và [photo/grid](advertising-photo-browse.md) |
| `advertising-landscape-layout` | Hero/title/filter/header hợp lệ trên viewport thấp sau settle, VI/EN và xoay máy | `preview-contract-preservation`, `android-usb-qa`; layout/reveal contract hiện hành | Delta tại [brand shell](frontend-brand-shell-responsive-runtime.md) và [photo/grid](advertising-photo-browse.md) |

Thứ tự: chốt baseline preview → skeleton lifecycle/WebGL → landscape → focused
matrix và physical checks trên cùng candidate. Dependency là gate verify;
không thêm package/runtime layer hoặc cyclic dependency. Không đổi module id
scrollbar/button/Android đã accepted. Owner duyệt [delta skeleton lifecycle](advertising-skeleton-flow.md#correction-mobile-lifecycle--accepted-2026-09-27)
ngày27/09 bằng “Duyệt delta skeleton”. [Plan baseline/skeleton](../../tasks/plan.md#correction-baseline-và-skeleton--plan-chờ-duyệt)
đã duyệt cùng [card correction](https://app.notion.com/p/3e8332849a0e8121bd20e1f62a275bb7); spec/plan landscape và nút chưa mở implementation.

[Contract random accepted](advertising-organic-random.md) được carry từ frozen recovery
vào checkout correction trong C00; provenance/hash giữ tại owning spec. Tích hợp
runtime candidate phải ghi các gate còn mở; không coi
HEAD hoặc “preview lên được” là bằng chứng đã giữ behavior random.
Không copy toàn dirty tree, sửa checkpoint recovery hoặc resume QA/P11 cũ.

<a id="feedback-viewer-và-mobile-toàn-website--map-chờ-duyệt"></a>

## Feedback viewer và mobile toàn website — map đã duyệt

Owner xác nhận intent ngày27/09/2026 bằng “Xác nhận intent này”; chọn
“Giữ card/bố cục ổn định (đề xuất)” khi toolbar hiện/ẩn và Safari trên iPhone.
Owner mở rộng kiểm layout/mobile từ Advertising sang **mọi trang website**.
Owner duyệt map và thứ tự phía dưới bằng “Duyệt map và thứ tự đề xuất”.
Approval mở soạn delta theo thứ tự, chưa approval spec, plan hoặc runtime mới.

[Acceptance A54](../verification/mobile-skeleton-correction-2026-09-27.md#owner-acceptance-a54--2026-09-27)
đóng riêng triệu chứng skeleton reload footer↔grid theo xác nhận owner.
Log USB A05s không đổi identity; A54 FPS, iPhone physical và full continuation
failure vẫn có gate riêng. Giữ random, scrollbar và common skeleton lifecycle
đã được chấp nhận; không overwrite checkpoint C06U partial.

Intent mới:

1. Toàn website VI/EN trên Safari/iPhone và Chrome/A05s, cả dọc/ngang:
   header/title/filter và nội dung không chồng nhau; card/bố cục giữ kích thước
   khi toolbar hiện/ẩn, chỉ vùng nhìn thay đổi. Xoay máy/đổi chiều rộng thật
   vẫn thích ứng; native browser controls, page zoom và accessibility giữ dùng được.
2. Viewer ảnh Advertising hỗ trợ pinch zoom ảnh và pan khi phóng lớn;
   mở/đóng morph ảnh đồng thời chuyển nền rõ↔blur.
3. Trong detail, lingering zoom-blur bắt đầu gần cuối crossfade và có đoạn
   chạy chồng. Morph và zoom-blur phải chạy cả browser Back/Forward.
4. Glass Advertising chỉ mở rộng zone rõ→blur; giữ nguyên chuyển
   trong suốt→trắng đục. Paragraph mô tả detail căn justified.
5. Kiểm local8792; iPhone chỉ kết luận physical PASS sau evidence thiết bị thật.
   Recovery/P11 paused, chưa commit/push/deploy. QA/audit/code review dùng một
   agent requested `gpt-6-sol`/`ultra`, observed effective unknown.

| Module id | Trách nhiệm | Phụ thuộc/gate | Nguồn sở hữu contract và runtime |
| --- | --- | --- | --- |
| `mobile-viewport-stability` | Phân biệt toolbar/visual viewport thay height với reflow thật; giữ geometry card và bố cục trên toàn website, vẫn tiếp cận được controls | Baseline random/scrollbar/skeleton accepted; `android-usb-qa`, Safari/iPhone physical gate | Delta [brand shell](frontend-brand-shell-responsive-runtime.md); shared `style.css`/`motion.js`, geometry trong `catalog-runtime.mjs` và viewer hiện hữu |
| `site-mobile-layout-parity` | Kiểm/sửa layout VI/EN dọc/ngang trên mọi route; không chồng header/title/filter, không mất nội dung hoặc overflow ngang | `mobile-viewport-stability`; shared shell và route contracts đã accepted | Delta [brand shell](frontend-brand-shell-responsive-runtime.md), [route/content](frontend-route-and-content.md), [photo/grid](advertising-photo-browse.md); shared CSS/template/source từng route khi evidence cần |
| `advertising-viewer-gestures-motion` | Pinch/pan ảnh trong viewer; morph ảnh và clear↔blur khi mở/đóng, interruption/cleanup/focus | `mobile-viewport-stability`, `site-mobile-layout-parity` | Delta [photo browse](advertising-photo-browse.md); `photo-viewer.mjs`, `detail.css` |
| `advertising-history-motion` | Crossfade/lingering có overlap; morph và zoom-blur đối xứng trên Back/Forward, giữ entry/scroll/random context | `mobile-viewport-stability`, `site-mobile-layout-parity`; history contract accepted | Delta [photo browse](advertising-photo-browse.md), [photo morph](advertising-photo-morph-scroll.md), [motion](../design/motion.md); `catalog-runtime.mjs` và adapter shared hiện hữu |
| `advertising-glass-typography` | Blur zone rộng hơn mà không đổi opacity-to-white; paragraph mô tả justified, pagination vẫn đúng | `mobile-viewport-stability`, `site-mobile-layout-parity`; glass/preset/media accepted | Delta [skeleton flow](advertising-skeleton-flow.md), [photo browse](advertising-photo-browse.md); `detail.css` và description pagination hiện hữu |

Theo [spec media-card đã duyệt](site-media-card-playback.md), supersession M02b
ngày 2026-09-30 thay phần morph card grid/related↔primary của intent và hàng
`advertising-history-motion` phía trên. Click, Back/Forward và chuyển giữa
hai detail không tạo clone card↔primary. Scroll và media active vẫn theo từng
history entry; chỉ morph
primary↔enlarged viewer được giữ. Đây là supersession của contract, không là
bằng chứng runtime hoặc nghiệm thu browser parity.

`site-mobile-layout-parity` nhận phần landscape từ module
`advertising-landscape-layout` đã có trong map trước và mở rộng phạm vi toàn
website; ID cũ cùng approval/evidence lịch sử được giữ. Spec/plan landscape
chưa được duyệt trước đây nên không có implementation gate cũ để kế thừa.
`button-content-parity` vẫn giữ trong map gốc; không tự mở redesign mọi nút.

Thứ tự soạn/duyệt contract: viewport → layout toàn website → viewer → history
motion → glass/paragraph. Hai module motion và glass có thể kiểm độc lập sau
layout ổn định; dependency là thứ tự/gate, không đề xuất runtime layer mới.
Dùng delta tại các nguồn chuẩn hiện hữu; không tạo monolithic spec mới.

Phạm vi22 entrypoint VI/EN:10 canonical Home, Residential, Commercial,
Advertising, About và12 compatibility Advertising slug. Slug chuyển sang
parent với category theo AD-BROWSE-R1 và
[route contract](frontend-route-and-content.md). Trong Advertising còn có
filter/photo/tag/viewer states; menu/footer dùng chung cũng phải kiểm.
Legacy redirects chỉ kiểm đích canonical; CMS/admin/Worker dormant nằm ngoài scope.

Baseline discovery: [landscape diagnostics](../verification/mobile-preview-diagnostics-2026-09-27.md#landscape-lỗi-layout-sau-khi-animation-đã-settle)
đã có bbox overlap. Source viewer chỉ giữ một pointer drag, chưa có pinch pair;
backdrop CSS cố định `blur(4px)` và animate opacity. Advertising geometry đọc
`visualViewport.height`; đây vị trí cần đo thêm, chưa kết luận mọi resize trên
website cùng nguyên nhân. Browser Forward không chạy motion là feedback owner,
chưa có trace mới chứng minh caller gây lỗi.

Map gate đã đạt ngày27/09/2026: boundary/dependency và thứ tự phía trên được
owner duyệt trước delta đầu tiên. Mỗi delta vẫn cần state/oracle/evidence, owner duyệt spec và
plan trước code. Android capture và WebKit desktop không thay iPhone thật;
không gọi kiểm một route hoặc focused engine PASS là toàn website PASS.

Delta đầu tiên: [mobile viewport stability — accepted](frontend-brand-shell-responsive-runtime.md#mobile-viewport-stability--draft-2026-09-27).
Owner duyệt bằng “Duyệt delta viewport”; [plan V00–V05](../../tasks/plan.md#mobile-viewport-stability--plan-chờ-duyệt)
đã được duyệt cùng [card viewport riêng](https://app.notion.com/p/3e8332849a0e81bdadc4e49d0ca95495)
bằng “Duyệt plan và card viewport (đề xuất)”. Chỉ V00–V05 local8792 được mở;
các module layout/viewer/history/glass vẫn cần delta/plan riêng.

[Delta layout toàn website — accepted](frontend-brand-shell-responsive-runtime.md#site-mobile-layout-parity--draft-2026-09-28)
đã nhận landscape overlap và named200% EN text-size failures từ viewport QA.
Owner duyệt ngày28/09/2026 bằng “Duyệt delta layout (đề xuất)”.
[Plan L00–L07](../../tasks/plan.md#site-mobile-layout-parity--plan-chờ-duyệt)
đã duyệt cùng [card layout](https://app.notion.com/p/3e8332849a0e81f18301f28c1091a9c3)
bằng “Duyệt plan và card layout (đề xuất)”. Chỉ L00–L07 local8792 được mở.

Owner đính chính Android là A05s khi duyệt delta/plan L04R ngày28/09 bằng
“duyệt, và máy điện thoại là A05s.” Nhãn A54 trong intent trước đó được thay
cho initiative viewport/layout hiện tại; không retag raw USB SM-A057F hoặc
đóng historical release A54 FPS gate. iPhone Safari physical vẫn cần evidence.

## Chú thích thuật ngữ

- **Intent**: mục tiêu owner đã xác nhận; khác approval của spec/plan.
- **Capability map**: boundary, dependency và thứ tự soạn contract từng module.
- **Physical device**: browser chạy trên điện thoại thật.
- **CDP**: giao thức debug Chrome để đọc runtime và thu bằng chứng.
- **Oracle**: nguồn hoặc predicate dùng để quyết định trạng thái đúng.
- **Open**: chưa đủ evidence để nghiệm thu, không tự là product failure.
