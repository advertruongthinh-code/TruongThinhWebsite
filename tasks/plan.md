---
title: Kế hoạch đang mở
type: implementation-plan
status: accepted
updated: 2026-10-06
module_id: scrollbar-parity
spec_approved: 2026-09-27
plan_approved: 2026-09-27
correction_plan_status: accepted
correction_plan_approved: 2026-09-27
correction_card: https://app.notion.com/p/3e8332849a0e8121bd20e1f62a275bb7
correction_spec_approved: 2026-09-27
correction_module_ids: [preview-contract-preservation, skeleton-card-lifecycle]
correction_checkpoint_c: blocked-webkit-context-pressure
correction_amendment_status: accepted
correction_amendment_approved: 2026-09-27
viewport_module_id: mobile-viewport-stability
viewport_spec_approved: 2026-09-27
viewport_plan_status: accepted
viewport_plan_approved: 2026-09-27
viewport_card: https://app.notion.com/p/3e8332849a0e81bdadc4e49d0ca95495
layout_module_id: site-mobile-layout-parity
layout_spec_approved: 2026-09-28
layout_plan_status: accepted
layout_plan_approved: 2026-09-28
layout_tracking_status: authorized
layout_card: https://app.notion.com/p/3e8332849a0e81f18301f28c1091a9c3
---

# Kế hoạch đang mở

Chỉ giữ plan còn việc mở. Plan scrollbar, tinh gọn docs, inventory living docs và lịch sử plan Codex đã chuyển sang [lưu trữ](https://github.com/advertruongthinh-code/TruongThinhWebsite/blob/17227133f487cbaf15101efddcae87179327faeb/tasks/archive/plan.md) (Git history).

## Skeleton chờ ảnh, mở ảnh tại chỗ, vào thẳng trang — plan chờ duyệt 2026-10-04

Spec owner đã duyệt: [Skeleton chờ ảnh và màn trắng khi vào trang](../docs/specs/loading-glass-and-page-entry.md)
(PR #65). Kính thuộc [Kính dùng chung](../docs/specs/glass-surface.md), thread
"Code component Kính" làm; M02b chỉ gắn vào, không viết `backdrop-filter`.
Hành vi F5 có veil đã lên main ở PR #66.

### Mặc định M02b chọn

1. R7: bỏ mốc 2.5s. Tám script trang đều `defer`, luôn chạy xong trước
   `DOMContentLoaded`, nên fallback ngay tại `DOMContentLoaded` nếu motion.js
   chưa nhận trang (lỗi hoặc thoát sớm). Không cần thời gian chờ thêm; mạng chậm
   thì veil giữ trắng tới khi script tải xong. Điền mục `CẦN LÀM RÕ` của spec.
2. R1: trần context WebGL điện thoại 2, desktop 8 như bản chạy thử; chốt lại
   theo số đo. Đã chốt desktop 12: skeleton cuối masonry một mình cần 8 đến 10
   context ở 1280 đến 2560px.
3. Preset skeleton theo media id (`fnv1a32(mediaId) % 12`), nên card remount
   giữ màu.
4. R4 ảnh có sẵn: ảnh cũ nằm trong một lớp tạm ngay trong khung primary để
   crossfade, gỡ khi xong; không có ảnh bay từ card. Code hiện tại không có
   clone hay FLIP từ card sang primary; chuyển động "bay" owner thấy có thể là
   related masonry xếp lại `0.4s` (suy luận), phần này giữ nguyên.
5. Hai PR. PR1: skeleton, crossfade, bỏ vòng xoay, boot; ba bước chạy với chỗ
   gắn kính để trống. PR2: gắn kính khi component Kính lên `main`. Không
   deploy riêng: deploy demo gộp một lần khi các thread code xong (owner
   04/10), coordinator báo owner.

### Task

| # | Việc | R | Ước lượng |
| --- | --- | --- | --- |
| T1 | Tách helper dựng frame, surface, canvas từ `renderCtaSkeleton`; card masonry và related có ảnh chưa `complete` gắn skeleton vào khung media; dùng chung lease pool, cho chạy cả khi đang mở detail | R1, R3, R8 | 2 giờ |
| T2 | Ba bước hiện ảnh bằng Web Animations theo bảng [Kính](../design-system/components/Glass/README.md#hiện-và-tan-trên-ảnh-vừa-tải); gỡ skeleton, kính và trả context khi xong | R2 | 1 giờ |
| T3 | Skeleton thay `.media-load-ring`, spinner card nhiều ảnh và vòng `::after`; primary mở tại chỗ, ảnh có sẵn crossfade `0.6s`; giữ `aria-busy` và morph sang viewer | R4, R5 | 2 giờ |
| T4 | Đổi điều kiện fallback trong năm head script; sửa test đang dựa vào mốc 2.5s | R6, R7 | 1 giờ |
| T5 | E2E: ảnh chậm thì có skeleton, điện thoại tối đa 2 context, ảnh cache không skeleton, node gỡ sau reveal, primary chưa tải có skeleton, motion.js chậm 4s veil giữ rồi mở, motion.js lỗi veil gỡ; sửa test vòng xoay cũ; cập nhật Design System và spec theo mục Gate còn mở | R1–R8 | 2 giờ |
| T6 | Đo R9 trên A05s qua phiên PC: trace vuốt nhanh, median từ `30fps`, không long task trên `50ms`, tối đa 2 context; WebKit trên cloud | R9 | 1 giờ |
| T7 | PR2: gắn kính dạng phủ đều vào ba bước (đã code); đo lại R9 cùng T6 | R2, R4 | 1 giờ |

Tổng khoảng 10 giờ agent, khoảng 600 dòng code và test viết tay.

### Rủi ro và rollback

- Nhiều skeleton cùng crossfade khi vuốt nhanh có thể rơi gate R9; khi đó báo
  owner kèm số đo trước khi đổi cách làm, theo spec.
- Test cũ khóa vòng xoay và mốc 2.5s phải đổi cùng PR, không bỏ test.
- Mỗi PR revert độc lập; PR1 không đụng Kính.

<a id="correction-baseline-và-skeleton--plan-chờ-duyệt"></a>

## Correction baseline và skeleton — accepted 2026-09-27

**Spec gate đạt:** owner duyệt [delta lifecycle](../docs/specs/advertising-skeleton-flow.md#correction-mobile-lifecycle--accepted-2026-09-27)
ngày27/09 bằng “Duyệt delta skeleton”. **Plan/tracking gate đạt:** owner duyệt
“Duyệt plan và card Notion”27/09. [Card correction](https://app.notion.com/p/3e8332849a0e8121bd20e1f62a275bb7)
đã tạo và fetch verify; trạng thái In progress.
Phần này mở rộng cùng [map correction đã duyệt](../docs/specs/mobile-browser-parity-capability-map.md#feedback-preview--intent-và-map-bổ-sung-đã-duyệt),
không thay plan/checklist scrollbar hoặc plan recovery đang paused.

### Kết quả, execution route và boundary

Một preview8792 chứa random đã duyệt, scrollbar đã nghiệm thu và skeleton
không remount/replay khi slot còn visible qua footer↔grid/toolbar. WebGL
allocation, context loss/restore và cleanup đạt delta, giữ Flow/glass/tail.
Landscape layout và button-content cần delta/plan riêng; chỉ kiểm không
regress và ghi failure hiện hữu, không sửa title/filter/header trong plan này.
Không resume recovery/P11, commit/push/deploy hoặc chạy canonical parity cũ.

Scope rõ; rủi ro chính là hunk random trộn media/navigation và lifecycle GPU.
Main thực thi tuần tự, giữ intent/architecture/diff/provenance/acceptance.
Dùng lại **một agent Sol/ultra** gộp QA/audit/code review, read-only; requested
`gpt-6-sol`/`ultra`, observed effective `unknown`. Không thêm worker, persona,
dependency, controller, renderer pool abstraction hoặc semantic extraction.

### Baseline composition đã khảo sát

Reuse managed checkout hiện hữu; primary và recovery chỉ đọc. [Diagnostic](../docs/verification/mobile-preview-diagnostics-2026-09-27.md)
chứng minh catalog8792/source/served còn ở HEAD trước random; source scrollbar
đã sửa riêng. Vì vậy không dùng HEAD làm snapshot integration hoặc copy cả
66 staged paths. Recovery catalog nhập cả `media-progress`, filter-session,
boot/loading và mobile Back correction: **chỉ lấy random hunks**.

| Ownership | Carry/reconcile | Loại khỏi carry |
| --- | --- | --- |
| `layout-core.mjs`, `random-order.mjs` | Presentation order, organic score/fallback, seeded shuffle; giữ validator, budget300000 và solver hard gates | Không đổi catalog/media/schema |
| `catalog-runtime.mjs` | Seed/history/locale handoff; grid/related order/cache; ratio/assignment theo slot và real frontier | `loadMediaImage`, media classes/priority, filter-session/storage, mobile Back guard, boot/network-wait |
| `skeleton-flow.mjs` | Seeded band layout/diagnostics; reuse `phase`, `start/stop/destroy` đã có | Không copy whole renderer hoặc đổi240×160/preset/shader/noise/speed |
| `suggestion-slideshow.mjs` | Seeded deck helper nếu cần và timer3000ms; crossfade1600ms giữ nguyên | Shared media-progress import/load/cancel/request pipeline |
| `motion.js`, `detail.js` | Startup history snapshot trước Barba; softNavigation forwarding; hard-history fallback marker đúng URL/trigger khi cần | Boot veil/network timers, back-to-top guard, dependency timeout changes; giữ accepted scrollbar hunks |

`index.html`, `photo-viewer.mjs`, `detail.css`, `style.css`, build/media scripts
và các route khác giữ snapshot trước slice. Random không buộc nhập media-progress;
no-JS fallback/LazySizes hiện hữu vẫn dùng được. Nếu assertion cho thấy cần
scope ngoài bảng, dừng tại checkpoint, cập nhật plan trước mở rộng.

Canonical random cho carry là frozen
`E:/TruongThinh-Website/.tmp/advertising-random-media/docs/specs/advertising-organic-random.md`,
SHA-256 `aaec23c431f5f33bef8372f815a960e862db287b66ce4650278297c30eea3c0a`.
Primary spec hash `e8cdd99486fc8a5fd3253e0e23d7f803e856c5b9075a221b895f7d317bf214b4`
thiếu6 dòng native Back/Forward fallback marker đã có trong owning recovery
spec accepted; không lấy bản primary thiếu clarification đó làm authority.
C00 carry requirement text vào owning spec managed; chỉ điều chỉnh provenance
và link routing về map correction, ghi original hash và semantic diff không
đổi yêu cầu. Không copy static-image-delivery/image-loading-progress spec/runtime
hoặc task tree cũ để tạo baseline random. Các module đó vẫn thuộc recovery paused.

### Task và dependency

[Checklist correction](todo.md#correction-baseline-và-skeleton) ghi description,
acceptance và commands. Mỗi slice tối đa5 path sở hữu; plan/todo là execution
records cập nhật thường xuyên, không thêm scope runtime.

| Task | Outcome/paths | Dependency | Ước lượng |
| --- | --- | --- | --- |
| C00 | Random contract và supersession đúng scope: `docs/specs/advertising-organic-random.md`, `advertising-photo-browse.md`, `mobile-browser-parity-capability-map.md`, `docs/design/motion.md`, `DESIGN.md` | Plan + card được duyệt |15–25 phút; Markdown |
| C01 | RED regression và oracle baseline: `tests/site/advertising-products-random-order.test.mjs`, `advertising-products-layout.test.mjs`, `advertising-products-lifecycle.test.mjs`, `advertising-skeleton-flow.test.mjs`, `advertising-products-static.test.mjs` | C00 |25–45 phút |
| C02 | Core random chạy local: `src/site/advertising-products/{layout-core.mjs,random-order.mjs,catalog-runtime.mjs,skeleton-flow.mjs,suggestion-slideshow.mjs}` | C01 |35–60 phút |
| C03 | Seed qua history/locale đúng và footer oracle hợp contract: `src/site/motion.js`, `src/site/detail.js`, `tests/site/advertising-random-browse.e2e.mjs`, `tests/site/advertising-route-footer-p75.e2e.mjs` | C02 |35–60 phút |
| C04 | Visible slot giữ node/reveal/phase, geometry vẫn cập nhật: catalog runtime, skeleton renderer nếu cần, `tests/site/advertising-skeleton-lifecycle.e2e.mjs`, skeleton unit | Checkpoint B |40–70 phút |
| C05 | Allocation/cleanup/context restore không error/leak: catalog runtime, skeleton renderer, lifecycle browser test và skeleton unit | C04 |35–65 phút |
| C06 | Cùng candidate qua focused matrix + Android; `tests/site/advertising-continuation.e2e.mjs` desktop perf assertion, `tests/README.md`, `docs/verification/mobile-skeleton-correction-2026-09-27.md`, skeleton spec evidence link | Checkpoint C |75–125 phút |
| C07 | Review/handoff và owner preview: `docs/STATE.md`, `docs/index.md`, `docs/verification/index.md`, `tasks/plan.md`, `tasks/todo.md` | C06 |15–25 phút |

Thứ tự C00→C01→C02→C03, checkpoint B; C04→C05, checkpoint C; C06→C07.
Exact paths chung của C04/C05:
`src/site/advertising-products/catalog-runtime.mjs`,
`src/site/advertising-products/skeleton-flow.mjs`,
`tests/site/advertising-skeleton-lifecycle.e2e.mjs`,
`tests/site/advertising-skeleton-flow.test.mjs`.
C02 core-random unit/static đạt; bridge assertion ở motion/detail nếu còn
named RED được giữ tới C03. Không skip assertion; toàn nhóm GREEN tại checkpoint B.
Không parallel mutate các file chung. Tổng **5–8,5 giờ agent work** cho local
implementation/QA khi USB/browser sẵn, chưa tính thời gian chờ owner/iPhone/A54.
Ước lượng **1800–2800 LOC source/test** tính cả carry/adapt random đã viết;
correction lifecycle/test mới khoảng400–800 LOC trong tổng đó, không là hạn
mức để bỏ case. Recount hunk sau C03; scope/LOC khác đáng kể thì ghi và replan.

Task ≥200 LOC có [card đúng scope](https://app.notion.com/p/3e8332849a0e8121bd20e1f62a275bb7)
**“Random grid và skeleton mobile — browser parity”**, owner cho phép27/09; `search` rồi `fetch`
parent/schema trước write. Không repurpose card scrollbar hoặc update card
recovery. Card chỉ giữ module/spec/plan/checklist links, estimate, status/gate
và next action; Git sở hữu accepted contract/evidence.

### Commands, oracle và physical QA

Tất cả command implementation chạy trong managed checkout, sau plan/card gate.
Không chạy build/test trong recovery. Đặt environment trước cả build và test:

```powershell
$env:BASE_URL = 'http://127.0.0.1:8792'
$env:PLAYWRIGHT_BROWSERS_PATH = 'E:/TruongThinh-Website/.tooling/browsers'
pnpm prepare:site
pnpm qa:static
node --test tests/site/advertising-products-random-order.test.mjs tests/site/advertising-products-layout.test.mjs tests/site/advertising-products-lifecycle.test.mjs tests/site/advertising-skeleton-flow.test.mjs tests/site/advertising-products-media.test.mjs tests/site/advertising-products-static.test.mjs
node tests/site/advertising-random-browse.e2e.mjs
node tests/site/advertising-skeleton-lifecycle.e2e.mjs
node tests/site/advertising-continuation.e2e.mjs
node tests/site/advertising-route-footer-p75.e2e.mjs
node tests/site/scrollbar-parity.e2e.mjs
node tests/site/menu-reference-parity.e2e.mjs
pnpm qa:cross-browser
```

Hai browser test mới theo standalone Playwright pattern hiện hữu, `BASE_URL`
bắt buộc8792; lifecycle test chạy Chromium/Firefox/WebKit, browser thiếu thì
FAIL/open, không bỏ assertion. Reuse oracle grid và renderer hiện hữu, không
copy e2e helper/media-progress từ recovery chỉ để chạy test.

Random RED dùng permutation/membership/seed/pool/geometry oracle thực; module
import error hoặc regex-only không thay failure behavior. C01/C03 phân biệt
direct/reload với reconstructed Back và soft/full locale. Không monkeypatch
click listener để tạo PASS. Slideshow cadence có controlled-clock behavior
proof: không advance trước3000ms, next image/crossfade1600ms ở tick hợp lệ;
giữ hidden/reduced/active-tag pause trên native decode seam, không chỉ regex.
Full-navigation branch có thể được kích qua
test-only request failure; ghi rõ injection, native device dùng flow thật.
Test footer P7.5 sửa cả `routed.hash === direct.hash` khi route mang visit mới
và reload deep equality. Yêu cầu hash/geometry giống qua **seed mới F5** đã bị random
supersede; giữ same-seed/filter round-trip, CTA→footer gap≤1px, final viewport,
membership/frontier/ratio/glass và no-JS. P7.4 đo CTA copy ở đáy viewport sai số≤1px
vẫn giữ nguyên. Không đơn thuần xóa failure assertion.

C04 RED bắt height-only/RO/scroll với slot còn visible: identity, opacity1→0,
entry đang chạy và phase; full exit/reentry đúng một lần; width/columns giữ
common slot. Pause cùng context khác teardown/new pool. C05 ledger allocation,
release/loss/generation và live count trong transition/20 remount; mobile
portrait/landscape tối đa2 LIVE contexts, hidden/reduced/detail0 running.
Forced context loss/restore kiểm static fallback và resources mới, không
thay outer frame/reveal/assignment. Không hardcode browser context limit.

C06 kiểm All/sáu filter/detail/tag/VI/EN/Back/locale/reload, responsive/reduced,
keyboard/focus/menu/viewer, overflow, console/network và existing glass/tail
oracle. Playwright và Chrome DevTools trên local route là evidence layer
riêng; impeccable detect sau UI complete, không polish ngoài scope.
Perf desktop R4 tại1569×912, toàn bộ skeleton CTA visible, probe5s sau warm-up:
≥30fps và không long task do loop>50ms; ngoài viewport/tab ẩn/reduced không
tăng phase. Runner continuation hiện chỉ ghi `desktopPerformanceDiagnostic`;
C06 bổ sung assertion trên đúng profile/scene, không coi diagnostic là PASS.
Perf mobile R10 A54 profile360×800 ba lượt5s sau warm-up, median≥30fps,
không long task>50ms và≤2 live context. Hai probe tách khỏi screenshot/trace;
API long-task thiếu thì ghi coverage open, không gọi zero-task PASS.
A05s functional không thay A54 physical gate.

Android dùng [Chrome/USB native](../docs/operations/android-real-device-debugging.md):
verify current target/device trước input, giữ mapping8790/9223 và chỉ dùng8792.
Native touch footer↔grid ít nhất3 chu kỳ, toolbar expanded/collapsed, portrait
và landscape; capture identities/computed CSS, console/network/PNG và source
hash. Không override font/density/scale, giả viewport hoặc cài browser flag.
Nếu cần xoay thiết bị để đo thật, hỏi owner một thao tác; không gọi emulation
là physical. iPhone thật cùng scenario còn open nếu chưa có thiết bị; WebKit
PASS không tự đóng gate iPhone. Landscape title overlap hiện hữu ghi riêng,
không che/sửa hoặc gọi visual landscape PASS trong skeleton scope.

### Checkpoint, preservation và rollback

Preflight sau gate: lưu exact file inventory/diff/source hashes và immutable
managed snapshot trong ignored `.tmp/mobile-skeleton-correction/`; verify port8792
đang thuộc task trước rebuild, reuse server hiện hữu. Archive source/runtime
và tests mới/untracked theo exact manifest, không stage/reset toàn checkout.
Mỗi checkpoint có source/build/served/hash và test command/result.

**Checkpoint B sau C01–C03:** random baseline+scrollbar cùng candidate đã
kiểm; unit/static/random browser/footer đạt. Skeleton height/WebGL failure
vẫn là RED có tên và artifact, không bị hòa thành baseline PASS. Lưu snapshot
B trước lifecycle fix để regression/rollback giữ random+scrollbar.
**Checkpoint C sau C04–C05:** lifecycle+WebGL GREEN, leak/context ledger và
geometry/glass không regress; chuyển sang matrix/physical. Main kiểm diff và
reviewer cùng agent kiểm hai checkpoint; checkpoint không mở lại approval đã đạt.

Recompute recovery status66 staged/0 unstaged/0 untracked và pause patch/manifest
hash trước/sau; primary HEAD/status unchanged. CSS scrollbar hash
`671dd694936430f47fafc56d072cf324241315a119c3428bf0cbecf5b291497f`
giữ nguyên; motion baseline
`f0c5f596611db28c9ce936ff9ae6fe6e34c33d35a8f2135ec2e5459703bbaf65`
chỉ thêm bridge hunks có diff riêng. Không chỉnh generated output để pass.

Rollback bằng exact per-slice patch và restore newly created paths theo
manifest vào managed checkout, preview rebuild từ source; không quay về
HEAD trước random. Giữ snapshot B, accepted scrollbar, raw evidence và toàn
bộ recovery checkpoint. Nếu thiếu snapshot/source/device/reference bắt buộc,
ghi gate open/blocked theo đúng scope, không giảm bar hoặc suppress console.

C07 chỉ handoff khi reviewer Required findings đã xử lý và main verify;
owner xem cùng preview random+scrollbar+skeleton. Device/performance/reference,
landscape, button-content, full-site/P11/release là gate riêng. Contract này
không cấp permission commit/push/deploy.

<a id="amendment-c05r--draft-chờ-owner"></a>
### Amendment C05R — accepted 2026-09-27

**Owner duyệt27/09/2026 bằng “Duyệt delta và plan C05R”. Runtime C05R được mở.** C05 hiện RED dù phone live≤2;
[report correction](../docs/verification/mobile-skeleton-correction-2026-09-27.md)
giữ clean20/20 WebKit counterexample và40-cycle feasibility reuse. Đây là
amendment cho `skeleton-card-lifecycle`, không thêm module/map mới.

Plan accepted phía trên ghi “Không thêm ... renderer pool abstraction”.
Không sửa wording cũ để coi approval trước đã bao gồm cache. Owner đã duyệt
ngoại lệ hẹp: document cache native canvas/context trong hai module hiện hữu;
không new controller/framework/dependency. [Delta ownership accepted](../docs/specs/advertising-skeleton-flow.md#amendment-context-reuse--accepted-2026-09-27)
ghi native resource ownership, lease release, optional interface compatibility,
lost/restore, unmount/document/BFCache và quality bar giữ nguyên.

| Task | Ownership và kết quả | Dependency/verification |
| --- | --- | --- |
| C05R1 | `skeleton-flow.mjs`, skeleton unit: renderer cleanup idempotent; handoff release không lose native context; default destroy vẫn dispose; fresh resources/phase | Owner duyệt delta + plan; named RED→GREEN với fake GL generation/resources/RAF/listeners, no already-lost call |
| C05R2 | `catalog-runtime.mjs`, lifecycle browser test: cache/lease bounded theo eligible demand, phone leased+idle≤2; giữ common outer frame, assignment, phase; filter/controller cleanup trả lease, document dispose có ownership rõ | C05R1;20 valid transitions + clean console run, plateau allocation, navigation/BFCache/loss/reduced/hidden và pending persistence |
| C05R3 | Cùng4 source/test paths: main/combined reviewer kiểm constraints, source/build/served; checkpoint C GREEN trước C06 | Chromium/Firefox/WebKit, current unit/static/random/footer; không suppress warnings/forceGC/giảm presets hoặc quality |

Estimate thêm **150–300 LOC source/test,90–150 phút** implementation và focused
QA; C06 vẫn75–125 phút, C07 vẫn15–25 phút; chưa tính owner/iPhone/A54 waiting.
Chọn main implement tuần tự, cùng một reviewer Sol/ultra (effective unknown).
Không parallel mutate chung paths; card correction hiện hành tiếp tục In progress.

Rollback theo [checkpoint C05 RED](../.tmp/mobile-skeleton-correction/C05-blocked-current.json)
giữ random/scrollbar/reconciliation, không về HEAD trước random. Các test
feasibility chỉ HTTP-response injection trong profile cô lập, không là source
implementation hoặc owner acceptance. Physical Android/landscape và WebKit
gate cũ không được tự đóng khi cache prototype xanh. Owner preview cuối vẫn
giữ; không resume recovery/P11 hoặc commit/push/deploy.

<a id="amendment-c06u--draft-2026-09-27"></a>

### Amendment C06U — accepted 2026-09-27

**Status: accepted A và plan.** Owner reply ngày27/09:
“Duyệt A và plan C06U (đề xuất)”. C06 overflow
counterexample giữ tại [report](../docs/verification/mobile-skeleton-correction-2026-09-27.md#c06-counterexample-và-gate-còn-mở).
Owner đã mở gate để thay oracle thành uniqueness trong mỗi logical deck12.
[Delta logical batch accepted](../docs/specs/advertising-skeleton-flow.md#amendment-logical-batch-khi-resize--accepted-2026-09-27)
giữ common assignment; lựa chọn uniqueness toàn bộ tập hiện hành không được duyệt.

| Task | Ownership và kết quả | Proof |
| --- | --- | --- |
| C06U1 | `catalog-runtime.mjs`: gắn immutable logical batch identity vào assignment/canvas metadata; giữ allocator unused-deck và fresh-filter reset, không đổi common preset hoặc native cache | Counterexample13→10: common identity/assignment/phase/reveal giữ; deck identity đúng và mỗi deck không trùng preset/anchor/starting phase |
| C06U2 | `advertising-continuation.e2e.mjs`: oracle uniqueness theo deck đã duyệt, fresh pool change, N4/N3 round-trip; R4 toàn bộ frames intersect và running, fully-visible count diagnostic | Giữ raw RED cũ, không bỏ shader/motion/resolution/fps/context assertions; frame paint delta từng renderer,5s≥30fps/long task≤50ms; mobile3×5s median≥30fps |
| C06U3 | C06/C07 docs, cùng combined reviewer Sol/ultra | Build/unit/static, random/footer/lifecycle/clean và matrix cùng source; Android native same-build dọc/ngang; external gates riêng, checkpoint không overwrite C05R GREEN/RED |

Estimate thêm **60–120 LOC source/test,30–45 phút**, chưa tính physical
rotation/owner/iPhone/A54 waiting. Main mutate tuần tự, một reviewer gộp
QA/audit/code review; requested Sol/ultra, effective unknown. Rollback có
checkpoint C05R và C06 partial riêng; không xóa counterexample hoặc sửa deck
quality để đạt test. Recovery/P11 paused; không commit/push/deploy.

Execution checkpoint27/09: deck identity/common persistence và focused
matrix/Android đã có [current evidence](../docs/verification/mobile-skeleton-correction-2026-09-27.md#c06u-logical-deck-current-build-và-gates).
Source/test2529 LOC so preflight gồm carry/adapt và QA, trong tổng plan1800–2800;
C06 còn full continuation fresh reduced resume failure và MCP inspection blocked.
Không coi C06U scoped implementation là toàn C06/C07 đạt. Main dừng thêm fix
sau ba full corrective runs chưa đạt theo AGENTS; next phải chẩn đoán resume
state trước sửa, giữ owner/device/landscape/nút gates và recovery/P11 pause.

<a id="mobile-viewport-stability--plan-chờ-duyệt"></a>

## Mobile viewport stability — plan accepted 2026-09-27

Owner duyệt [delta viewport](../docs/specs/frontend-brand-shell-responsive-runtime.md#mobile-viewport-stability--draft-2026-09-27)
ngày27/09 bằng “Duyệt delta viewport”. Đây phần tiếp theo của cùng
[map browser parity đã duyệt](../docs/specs/mobile-browser-parity-capability-map.md#feedback-viewer-và-mobile-toàn-website--map-chờ-duyệt).
V00–V05 chỉ thực thi sau owner duyệt plan và tracking gate. Checklist tại
[todo.md](todo.md#mobile-viewport-stability--v00v05). Các checklist C06/C07,
full continuation FAIL và checkpoint cũ giữ nguyên; không gộp thành PASS.
Owner đã mở cả hai gate bằng “Duyệt plan và card viewport (đề xuất)”.
[Card viewport](https://app.notion.com/p/3e8332849a0e81bdadc4e49d0ca95495)
đã search/fetch schema, tạo và fetch verify đúng Tasks/Project, In progress.

### Kết quả, ownership và giới hạn

Khi browser toolbar đổi vùng nhìn, kích thước và tọa độ document của nội dung
giữ ổn định≤1 CSS px theo delta; visibility, scroll bounds và controls vẫn
theo vùng nhìn thực. Layout viewport thật, rotation và typography đổi vẫn
reflow. Scope22 route VI/EN và các state Advertising/menu/viewer.

Implementation tại `C:/Users/halal/.codex/worktrees/mobile-ui-contract/TruongThinh-Website`,
branch `codex/mobile-ui-contract`, HEAD `e6cf065161cb19a8b59dd9efa8cda5d4af27fba1`.
Reuse preview8792 đang chạy;8790 và checkout recovery không thay đổi. Main là
source owner; một agent hiện hữu gộp QA/audit/code review requested
`gpt-6-sol`/`ultra`, effective unknown. Không parallel mutate chung source.

Ambiguity thấp sau delta đã duyệt; risk trung bình vì shared shell, scroll
lock và geometry dùng chung. Chọn main implement tuần tự, mỗi slice có
oracle/baseline và rollback riêng. Không thêm framework/dependency/controller.
Landscape/title/filter layout, pinch mới, viewer morph/blur, history timing,
glass zone và justified theo các module kế tiếp; không sửa chúng trong V00–V05.

### Source evidence và lựa chọn implementation

Graphify query đã chạy trước source inspection: AST fresh,214 semantic files
pending; không semantic extraction. Serena tại managed checkout, context
`codex`, LSP ready; các source dưới đã đọc trực tiếp, không suy từ graph.

| Source hiện tại | Implication cho slice |
| --- | --- |
| `motion.js:530–596`, `detail.js:281` | Reuse RAF coalesce và `window.TruongThinhMotion`; detail đã truyền object này qua `scroll` vào catalog, catalog truyền tiếp viewer |
| `catalog-runtime.mjs:1069–1106,1678,2242–2244,2628–2642` | Morph snapshot, CTA tail và related packing/key đang đọc dynamic visible height; sửa persistent geometry tại các caller này |
| `photo-viewer.mjs:44–66`, resize/RO cuối module | Fit/cover/pan đang dựa trên viewport element; phân biệt stable fit geometry với actual visible control area, không cancel morph vì toolbar |
| `detail.css:2164–2165`, `style.css:931` | Dialog dùng `100dvh`; shared hero đã dùng `100svh`. Giữ backdrop phủ vùng nhìn nhưng image layout basis ổn định |
| `tests/site/advertising-skeleton-lifecycle.e2e.mjs`, `playwright.config.cjs` | Reuse standalone3-engine pattern; không đổi smoke config hoặc coi `setViewportSize` là native toolbar |

Approach cụ thể: shared CSS token layout height dùng `100svh`, fallback
`100vh` hữu hạn; desktop vẫn resolve theo cửa sổ thật. Một probe CSS inert
trong document khi JS cần số px; không parse literal unit, không polling hoặc
minimum trôi qua swipe. Reuse bridge hiện hữu với getter metrics bổ sung:
layout width/height đã resolve và visible rect/scale hiện tại. Caller chỉ đổi
persistent layout khi stable metrics/typography/content đổi; visible-only
resize vẫn cập nhật visibility/controls. Không tạo event bus/cache theo route.

Getter là optional và backward-compatible: không đổi get/set/lock/unlock
logical scroll; có guard/fail-open cho caller thiếu bridge và native fallback.
V01 kiểm thứ tự mount/direct/soft route/BFCache để không carry geometry sai
orientation hoặc duplicate probe/listener. Nếu fallback thiếu stable units
không đủ evidence, ghi gate riêng; không gọi đã hỗ trợ mọi browser cũ.

Viewer dùng stable image stage cho fit/cover/pan, backdrop và controls dùng
visible rect/safe area. Toolbar không refit/recenter/reset zoom hay cancel
animation; true layout resize vẫn fit/reconcile. Keyboard/native page zoom
không làm shrink toàn website; không khóa page zoom hoặc force-hide toolbar.
Native visibility và coordinate conversion phải kiểm tại actual scale/offset.

### Tasks, dependencies và checkpoints

| Task | Slice và files có thể sửa | Dependency; estimate |
| --- | --- | --- |
| V00 | Baseline và regression oracle: mới `tests/site/mobile-viewport-stability.e2e.mjs`, mới `tests/site/mobile-viewport-android-record.mjs`, `tests/README.md`;3 files | Owner plan/tracking;35–50 phút |
| V01 | Shared metrics và shell: `src/site/motion.js`, `src/site/style.css`, viewport E2E, owning brand-shell spec;4 files | V00;40–60 phút |
| V02 | Advertising packing/CTA: `src/site/advertising-products/catalog-runtime.mjs`, viewport E2E, `advertising-route-footer-p75.e2e.mjs` nếu height oracle cần amendment, brand-shell spec;4 files | Checkpoint V-A;35–50 phút |
| V03 | Viewer stable geometry: `src/site/advertising-products/photo-viewer.mjs`, `src/site/detail.css`, viewport E2E, brand-shell spec;4 files | V02;35–50 phút |
| V04 | Matrix/physical evidence: hai viewport test/recorder files, `tests/README.md`, mới `docs/verification/mobile-viewport-stability-2026-09-27.md`, Android guide nếu setup facts đổi;5 files | Checkpoint V-B;60–90 phút, chưa tính waiting thiết bị |
| V05 | Review/handoff: brand-shell spec, `docs/STATE.md`, verification index, `tasks/plan.md`, `tasks/todo.md`;5 files | V04;20–30 phút |

Mỗi task có tối đa3 acceptance criteria trong checklist. Checkpoint V-A sau
V00/V01, V-B sau V02/V03, V-C sau V04/V05: build/focused proof + main kiểm
diff/provenance/boundary, xử lý finding trước slice tiếp. Physical gate thiếu
không ngăn lưu partial checkpoint, nhưng không đóng acceptance chưa kiểm.

Estimate **600–900 LOC source/test viết tay**, **225–330 phút** implementation,
focused QA và review; Markdown/generated và owner/device waiting không tính.
Đây estimate, không cho phép giảm acceptance khi vượt. Đạt ngưỡng200LOC:
đề xuất tạo/link một card Notion **“Mobile viewport ổn định — toàn website”**,
parent/project phải search/fetch trước write sau owner cho phép. Card chỉ giữ
module/link/estimate/status/gates; không copy contract hoặc chuyển recovery
paused sang In progress. Card skeleton cũ giữ scope/evidence riêng.

### Oracle và matrix

V00 lưu source/build/served hashes, diff/status và before-fix metrics; recorder
thu native touch, layout/visual sizes/scale/offset, DOM/CSS document bbox,
common skeleton IDs, console/page/network/HTTP errors và PNG có timestamp.
Toolbar samples chỉ so khi fonts/media/reveal settle, cùng state/layout metrics;
ghi riêng scroll/sticky/native clamp, không bỏ mọi bbox thay đổi.

Focused E2E dùng captured metric pairs ở browser boundary cho contract probe:
layout cố định, visible rect đổi phải giữ geometry/key và update controls.
Đây fixture, không native toolbar evidence; không inject CSS/runtime fix để
PASS. Baseline assertion phải fail vì repacking/refit thực, không import/timeout.
`setViewportSize` là resize thật: kiểm reflow height-only và width/rotation,
không dùng nó để đòi height bất biến. Giữ console/network assertions đầy đủ.

| Layer | Coverage bắt buộc và giới hạn kết luận |
| --- | --- |
| Chrome/Firefox/WebKit |22 entrypoint:10 canonical Home/Residential/Commercial/Advertising/About VI/EN và12 compatibility slug chuyển sang Advertising category, theo AD-BROWSE-R1;390×844 và844×390; real height resize390×650, breakpoint980↔981. Ghi cả URL vào/đích, geometry/overflow/focus/lifecycle; không thay physical toolbar |
| State | Advertising All/6 filter/photo/tag/related/viewer; menu open/closed, native/reduced/fail-open, locale/Back/Forward/direct/reload/BFCache; text zoom200%, native pinch và keyboard focus |
| Android Chrome thật | Ít nhất3 toolbar cycles mỗi chiều dọc/ngang trên trang dài, detail/viewer,5 shared templates và một canonical detail template; VI/EN. Direct/reload ở toolbar mở và thu gọn. Record exact model/OS/Chrome/hash; thiếu cycle/toolbar delta thực không PASS |
| Safari/iPhone thật | Cùng native scenario, notch/safe area/controls/keyboard/pinch; thiếu device/evidence giữ physical open. WebKit desktop không nghiệm thu iPhone |
| Preservation | Same-seed random/context, common skeleton node/deck/preset/reveal/context≤2, scrollbar; khoảng CTA–footer giữ giá trị hiện hành, sai lệch≤1 CSS px, shared top-gap48/64px giữ nguyên. Existing full continuation FAIL giữ riêng |

ADB đang thấy A05s `SM-A057F`, không tự gọi A54. V04 kiểm device trước capture;
A05s proof chỉ nghiệm thu A05s. A54 owner confirmation skeleton cũ không thay
candidate viewport A54 proof. iPhone/A54 hardware access là external gate,
không ép owner chờ khi có thể hoàn thành local implementation/proof.

### Commands và evidence paths

Chạy sau approval trong managed checkout; preview8792 reuse process hiện tại,
không tự kill/start trùng. Server chỉ start theo entrypoint hiện hữu nếu thiếu.

```powershell
pnpm prepare:site
pnpm qa:static
$env:BASE_URL = 'http://127.0.0.1:8792'
$env:PLAYWRIGHT_BROWSERS_PATH = 'E:/TruongThinh-Website/.tooling/browsers'
node tests/site/mobile-viewport-stability.e2e.mjs
node --test tests/site/advertising-photo-layout.test.mjs tests/site/advertising-products-layout.test.mjs tests/site/advertising-products-lifecycle.test.mjs tests/site/advertising-skeleton-flow.test.mjs
node tests/site/advertising-random-browse.e2e.mjs
node tests/site/advertising-route-footer-p75.e2e.mjs
node tests/site/advertising-skeleton-lifecycle.e2e.mjs
node tests/site/scrollbar-parity.e2e.mjs
node tests/site/menu-reference-parity.e2e.mjs
pnpm qa:cross-browser
```

Focused runner hỗ trợ `--phase baseline` và `--phase final`, ghi vào directory
timestamp mới dưới `.tmp/mobile-viewport-stability/`; baseline expected RED
không bị sửa thành pass. Android recorder chạy opt-in:

```powershell
node tests/site/mobile-viewport-android-record.mjs --cdp http://127.0.0.1:9223 --base-url http://localhost:8792 --phase baseline
node tests/site/mobile-viewport-android-record.mjs --cdp http://127.0.0.1:9223 --base-url http://localhost:8792 --phase final
```

Recorder xác minh đúng tab local/device trước thao tác, reuse USB mappings,
chỉ navigate task tab. Native swipes đủ cycles; orientation thực hoặc thao tác
owner nếu CDP không đổi được device thật. Không coi JS `scrollTo` là toolbar
gesture. Missing target/device là error có lý do, không chọn tab Sites/khác.
Raw ignored, report Git giữ immutable manifest/hash/source provenance và
results/limitations; timing probes tách screenshot overhead.

Không rerun suite rộng lặp lại khi không có edit/failure mới; checkpoint chạy
focused phần vừa sửa, matrix cuối chạy regressions một lần. Không chạy lại
expensive full continuation/Espacio/recovery/P11 theo plan này. DevTools MCP
navigate đang blocked: ghi layer riêng, Android CDP/Playwright không thay MCP PASS.
`impeccable detect` sau UI hoàn tất theo scope; không cài lifecycle hooks.

### Rollback và acceptance

V00 tạo snapshot timestamp và manifest exact owned paths tại
`.tmp/mobile-viewport-stability/`; snapshots baseline/V-A/V-B/V-C riêng,
không overwrite C06U/C05R/C05 RED hoặc raw cũ. Rollback chỉ viewport hunks và
new files theo manifest; rebuild preview từ source. Không reset về HEAD trước
random hoặc copy recovery dirty tree. Mỗi rollback verify random/scrollbar/
skeleton preservation trên cùng build.

V05 main kiểm combined findings, actual LOC/source/build/served, local links,
glossary và diff scope; update owning docs trước authorized Notion status.
Không check PASS khi required evidence thiếu. Handoff có thể local technical
complete với iPhone/A54 physical open; owner visual/all-site acceptance vẫn
là gate riêng. Plan approval chỉ mở V00–V05 local8792, không commit/push/deploy,
resume recovery/P11 hoặc mở các module kế tiếp trước spec/plan của chúng.

Review plan27/09: một agent gộp Sol/ultra, effective unknown, Required0 trong
V00–V05. Main đã đối chiếu slice limits, acceptance, bridge callers, matrix,
estimate và preservation:186 local links/anchors hợp lệ,5 runtime hashes và
3 immutable pointers không đổi. Đây review planning, không runtime QA hoặc
owner approval. Owner đã duyệt plan/tracking bằng reply được ghi đầu section;
approval chỉ mở V00–V05 local8792.

### Execution viewport —28/09/2026

Source/runtime V01–V03 đã triển khai, V00 giữ named RED; actual605 source/test
changed LOC, trong estimate600–900. [Report viewport](../docs/verification/mobile-viewport-stability-2026-09-27.md)
giữ final132 geometry cases/3engines đạt,9 named text-size failures vẫn exit1,
source review Required0 và exact source/served hashes. USB A05s final dọc/ngang
đạt14 entries×3 actual cycles mỗi chiều,0 console/network errors; missing
A54/iPhone/MCP/owner không được check thay. Portrait raw đầu incomplete do
navigation timeout sau tab hidden;13 cycles được giữ, hai EN states ghi tiếp
trên cùng candidate, không rerun toàn matrix hoặc retag raw.
V-A có hash và focused proof, chưa có snapshot source riêng đúng thời điểm;
baseline/V-B/final packet giữ rollback bytes, không dựng lại lịch sử checkpoint.
Source freeze trong native capture; final V-C partial tại
`.tmp/mobile-viewport-stability/V-C-2026-09-27T17-11-06-921Z/` giữ exact bytes/raw hashes
sau main verify. V04/V05 acceptance chưa là toàn website/release PASS.

Module kế tiếp đã có [delta layout toàn website — accepted](../docs/specs/frontend-brand-shell-responsive-runtime.md#site-mobile-layout-parity--draft-2026-09-28)
theo map/intent owner duyệt. Owner đã duyệt delta28/09 bằng “Duyệt delta layout
(đề xuất)”; plan/tracking bên dưới đã được duyệt trước sửa source.
Recovery/P11 và deploy vẫn paused.

<a id="site-mobile-layout-parity--plan-chờ-duyệt"></a>

## Site mobile layout parity — plan đã duyệt

Module `site-mobile-layout-parity` thuộc cùng initiative/map browser parity.
Owner duyệt [delta layout](../docs/specs/frontend-brand-shell-responsive-runtime.md#site-mobile-layout-parity--draft-2026-09-28)
ngày28/09/2026 bằng “Duyệt delta layout (đề xuất)”. Owner đã duyệt
**plan L00–L07 và card layout** bằng “Duyệt plan và card layout (đề xuất)”.
Chỉ L00–L07 local8792 được mở; card riêng
[Layout mobile toàn website](https://app.notion.com/p/3e8332849a0e81f18301f28c1091a9c3)
đã tạo/fetch verified, Status In progress. Anchor proposal giữ cho links cũ.
Append section này giữ nguyên các task/gate scrollbar, C00–C07 và V00–V05;
không thay plan recovery hoặc đóng AC còn thiếu của viewport.

### Outcome và architecture

22 entrypoint VI/EN gồm10 canonical shared route +12 compatibility category
slug về parent Advertising. Initial state sau fonts/media/reveal settle phải
không chồng header/title/filter hoặc che chữ/control; document overflow≤1 CSS px,
đọc đủ copy tại100% và200% text size. Toolbar giữ stable geometry≤1px; xoay
máy/true resize vẫn reflow. Sticky header cover sau actual scroll được phân
biệt bằng scroll/state, không là initial overlap.

Ưu tiên CSS intrinsic layout, wrap và spacing theo stable layout basis hiện
hữu; chừa vùng header thực, để hero tăng chiều cao khi nội dung cần. Giữ
composition mặc định nơi đang đạt; responsive adjustment chỉ tại measured
failure. Không ép font nhỏ xuống để vô hiệu text-size200%, không hide/cut
copy, không thêm whole-document overflow-hidden để che tràn. Source hiện
có `.detail-index-hero` viewport-height, wrapper21rem, filter absolute/bottom15vh;
Residential/Commercial có nowrap, About font tối thiểu theo rem. Đây là
source candidates; L00 phải đo actual offending node, không coi cả site
cùng nguyên nhân hoặc sửa toàn typography trước baseline.

Main xử lý tuần tự vì shared CSS và runner dùng chung; một agent hiện hữu
`/root/qa_audit_review` gộp QA/audit/code review requested
`gpt-6-sol`/`ultra`, effective unknown nếu host không trả metadata.
Không tạo worker/persona khác. Main giữ requirement, architecture, diff/proof
inspection, docs và acceptance. Không thêm dependency/controller/event bus.

### Baseline, bảo toàn và tracking

V-C viewport `.tmp/mobile-viewport-stability/V-C-2026-09-27T17-11-06-921Z/`
giữ17 exact files/217 proofs, manifest SHA
`667850083bf5433efa1028604bff51b85c82405450ad5bfae3078594b06e195f`.
Source5/served đã khớp; Android A05s dọc/ngang14 entries×3 cycles mỗi chiều,
132 geometry cases đạt trên3engines. V-C là partial:9 named EN text-size
failures, A54/iPhone/MCP/owner, native keyboard/init-collapsed và full
continuation vẫn mở. L00 lưu baseline mới trên exact candidate này; không
retag V-C, C06U, C05R, C05 RED hoặc các pause pointers.

Giữ random seed/history/common slot/deck12/preset/reveal/context≤2, accepted
scrollbar, viewer fit/zoom/controls/cleanup và stable layout token. Giữ copy,
media, brand lockup, route/locale/filter/photo/tag context, target columns/
spacing/ratio/frontier, CTA–footer và shared gap48/64. Không mở pinch viewer,
morph/blur, Back/Forward timing, glass zone hoặc justified paragraph của các
module sau. Primary/recovery read-only; local8792, không commit/push/deploy
hoặc resume recovery/P11/full canonical.

Estimate **550–850 source/test changed LOC**, không tính Markdown/generated;
**265–395 phút**, chưa tính chờ hardware/owner/MCP. Task≥200LOC cần owner
cho tạo/dùng lại card Notion riêng **“Layout mobile toàn website — browser parity”**
trước implementation; search/fetch schema/project trước create/update.
Checklist chi tiết tại [L00–L07](todo.md#site-mobile-layout-parity--l00l07);
Notion giữ tracking summary, Git giữ contract/evidence. Không dùng card
viewport để nghiệm thu toàn layout; không sửa card recovery.

### Task graph, ownership và estimate

| Task | Slice và files tối đa | Dependency | Phút |
| --- | --- | --- | --- |
| L00 | Baseline + focused layout runner: `tests/site/mobile-layout-parity.e2e.mjs`, `tests/README.md`, `docs/verification/mobile-layout-parity-2026-09-28.md`; ignored manifest/raw | Plan/card gate |35–50|
| L01 | Advertising initial hero/title/filter fit: `src/site/detail.css`, Advertising `index.html` chỉ khi DOM evidence cần, new layout runner, owning shell/photo spec;≤5 files | L00 named RED |40–55|
| L02 | Residential/Commercial text-size fit: `detail.css`, hai page `index.html` nếu cần, new runner, owning shell spec;≤5 | L01 |25–40|
| L03 | Home/About và shared heading geometry: `style.css`, `detail.css`, Home/About `index.html` nếu cần, new runner;≤5 | Checkpoint L-A |25–40|
| L04 | Layout ở filter/photo/tag/menu/viewer/history/locale: new runner, `detail.css`, `advertising-products/catalog-runtime.mjs` chỉ guard Escape bảo toàn, owning shell/photo spec;≤5 | L03 |30–45|
| L05 | Final matrix/regression: new runner, report, tests README, owning shell spec, `docs/verification/index.md`;≤5 | L04 |45–65|
| L06 | Android native layout observation: existing `mobile-viewport-android-record.mjs`, report, Android guide, owning shell spec, tests README;≤5 | Checkpoint L-B |45–70|
| L07 | Combined review/handoff: `docs/STATE.md`, owning shell spec, capability map, `tasks/plan.md`, `tasks/todo.md`;≤5; authorized Notion summary | L06 |20–30|

Amendment preservation L03 ngày28/09: Home HTML không cần đổi; dùng slot thứ5
cho `tests/site/site.e2e.cjs` để assertion dependency order nhận About local
GSAP/SplitText pair đã reuse. Giữ kiểm thứ tự đầy đủ, không bỏ assertion;
static RED ở About trước update phải được lưu riêng.

L03H correction sau body/history proof ngày28/09: Home→Residential trên Firefox
giữ `gsap=3.13.0`, `SplitText=undefined` sau route settle 4 giây dù
DOMContentLoaded đã phát; hero kicker opacity0 và không có mutation. Home là
entrypoint duy nhất còn nạp GSAP CDN3.13 mà thiếu SplitText, khiến nhánh mount
reveal trong `detail.js` không chạy sau soft navigation. Trong ownership L03,
reuse cặp local GSAP3.15→SplitText3.15 ở `src/site/index.html`, trước
Locomotive/Barba/detail.js như About; cập nhật assertion dependency order trong
`tests/site/site.e2e.cjs`. Chỉ hai file source/test này trong correction, không
đổi motion timing/controller hoặc thiết kế. Giữ named RED, kiểm Home direct và
Home→Residential/Commercial qua Back/Forward, 3 engine, VI/EN; retest final
body/history/current source guards trước checkpoint L-B. Owning spec/report
cập nhật trong cùng task. Amendment này thay câu “Home HTML không cần đổi”
ở trên sau khi có evidence mới, không hồi tố proof cũ thành PASS.

L03 correction tại landscape200%: shared `.menu-option` glyph34px vượt fixed
line-box22.4px ở native focus/scroll. Dùng ownership `style.css` hiện hữu để
tăng line-height theo chữ khi cần; giữ default22.4px. Không thêm file/controller.
L04 `detail.css` giữ image-action focus scroll margin dưới actual header,
không exempt hit test hoặc thay viewer gesture. L04R1 CTA minimum bao gồm
authored mask ink overflow của descendant masks khi heading translateY âm.
Named RED/interrupt và focused proof giữ trong report; retest current source.

Amendment preservation L04 ngày28/09: thay ownership `style.css` chưa dùng trong
slice này bằng `catalog-runtime.mjs` chỉ để photo Escape không chặn modal menu.
Raw trusted key/focus tại `menu-escape-2026-09-27T19-28-19-340Z` chứng minh
photo bị đóng còn menu mở. Đây sửa behavior menu/query đã accepted, không đổi
history timing hoặc thêm controller; không ghi owner đã duyệt exception mới.
Regression phải khóa menu Escape/query/focus, viewer Escape và photo Escape
khi không có modal. Geometry CTA/pager không thuộc amendment nhỏ này.

No task source touch vượt5files. Nếu baseline chỉ ra need runtime geometry/text
split change thay vì CSS/HTML, quay lại plan amendment trước edit ngoài
ownership; không âm thầm thêm motion/controller fix. Behavior đã accepted
chỉ thay tại failure thuộc delta này. Source findings quay lại owning slice,
retest affected scope; không lặp broad matrix khi không có thay đổi/concern mới.

### Verification matrix và oracle

L00 runner reuse pattern launch/diagnostics/hash/route readiness của viewport
runner hiện hữu; giữ test viewport độc lập làm regression, không nâng cấp
framework hoặc export/import entrypoint tự chạy. Flags dự kiến
`--phase baseline|final`, `--scope advertising|residential-commercial|home-about|states|matrix|all`.
Baseline và final ghi timestamp riêng dưới `.tmp/mobile-layout-parity/`;
runner/source/served/device/version luôn recorded. L00 trước code đo baseline
RED vì actual overlap/paint clipping/overflow, không import/timeout lỗi.

Matrix chính:22 entrypoints ×5 viewports ×2 text sizes ×3 engines =660 cases:
portrait320×568/390×844, landscape838×331/838×387/844×390. Từng case record
entry/destination, actual fonts/layout/visible metrics, root font16/32px,
document/logical scroll coordinates, title/header/filter/content/control
rects và overflow. Root-font fixture không thay native accessibility setting.
Chờ animation/fonts/media settle bằng predicate và hai mẫu geometry ổn định;
giữ deadline có named failure, không disable motion trong normal path.
Kiểm viewport edges, range/text line bounds và clipping paint/mask; bbox
không giao nhưng ảnh chụp còn che chữ vẫn FAIL.

State subset là10 canonical routes VI/EN, native/no-preference, reduced và
shell-unavailable fail-open; direct/reload/locale/Back/Forward, menu Enter/Escape/
focus restore, breakpoint680/750/980/981 ở hai phía. Advertising kiểm
All/6category/photo/tag/related/viewer controls và first-grid/card/footer;
không tuyên bố mọi animation parity từ layout check. Native toolbar fixture
và actual width/height resize dùng regression viewport; mọi current named
EN200% failures phải GREEN, không bỏ assert/engine/route hoặc dừng ở failure đầu.

Expected endpoint/runtime console/page/network/HTTP errors giữ assertions.
Deliberately unavailable dependency có label riêng; không broad suppress
errors hoặc tạo fallback bằng CSS inject. Chạy static/build và focused unit/
random/footer/lifecycle/scrollbar/menu/smoke sau source sửa, có source hash
mỗi run. True runtime dependencies chưa đổi thì không Worker/CMS gate.
`impeccable detect` sau visible UI complete; report owned findings và baseline
findings riêng, không thêm ignore/font/palette để che gate.

UI reference: trước mỗi changed layout state, đối chiếu accepted Trường Thịnh
baseline và local Espacio reference cùng viewport theo Product/UI rule.
Reference media/source chỉ research, không copy. Nếu thiếu required reference
hoặc DevTools MCP UI evidence, ghi named gate open; Playwright/CDP không thay
reference/owner/MCP PASS. Không chạy expensive full Espacio/recovery suite.

### Checkpoints và native device proof

Checkpoint L-A sau L00–L02: Advertising và Residential/Commercial GREEN trên
3engines, baseline RED + unaffected viewport/random/footer proof, exact
source snapshot/manifest và main diff inspection. Owner spot-check có thể
bổ sung tại same local8792; missing owner gate không tự check.

Checkpoint L-B sau L03–L05:660case matrix và state subset thực chạy,
all9 inherited text-size failures resolved hoặc explicit current failure
giữ local acceptance open; source/build/served hashes khớp, regressions
đúng changed scope và immutable raw. Nếu chưa đạt, sửa owning slice trước USB.

L06 recorder chỉ thêm observation/oracles header/title/filter/text clipping/
layout metrics; giữ ADB serial/forward/package/UA/task-tab guards và native
gesture semantics. Đúng device foreground, sample hidden/timeout giữ incomplete;
đưa đúng Chrome task lên foreground/rebind8792 rồi capture thiếu nếu cần,
không sửa status raw cũ. Không đổi phone settings để tạo PASS.

A05s đang cắm USB:10 canonical route VI/EN + Advertising category/photo/tag/
viewer state subset, dọc/ngang,≥3 actual toolbar cycles mỗi tested state,
true orientation reflow, native page zoom/offset/pan và actual visible controls.
22 compatibility entrypoint destinations đã có engine matrix; native kiểm
đại diện redirect cùng canonical, ghi chính xác coverage. Chỉ marker
expanded/collapsed có actual height delta mới được count. Direct/reload từ
cả hai toolbar states ghi before/after; Chrome auto-expand sau navigation
giữ document-init collapsed gate riêng. Viewport không có public form nên
native keyboard gate ghi missing thay vì fake bằng focus fixture.

A05s Chrome và iPhone Safari cần physical evidence dọc/ngang, toolbar, safe
area, zoom/controls trước device acceptance. Owner đính chính A05s28/09; WebKit
desktop không là iPhone. Khi thiếu hardware, lưu checkpoint technical partial
và owner TODO cụ thể; không chờ vô hạn hoặc suy full-site PASS. Gesture/rotation
tự thao tác nếu chuyên biệt tool hỗ trợ; chỉ hỏi owner phần tool không làm được.

Checkpoint L-C sau L06–L07: snapshot source/test/docs và proof hashes/pointers,
primary/recovery/pause verification, combined review Required0 do main kiểm;
owner/device/reference/MCP/full-site gates không bị đóng bằng scoped suite.

### Commands sau approval

Chỉ dùng managed checkout và preview8792 đang chạy. Source tại `src/site/`,
generated `.site-output/` không edit. Chưa chạy commands này ở phase plan.

```powershell
pnpm prepare:site
pnpm qa:static
$env:BASE_URL = 'http://127.0.0.1:8792'
$env:PLAYWRIGHT_BROWSERS_PATH = 'E:/TruongThinh-Website/.tooling/browsers'
node tests/site/mobile-layout-parity.e2e.mjs --phase baseline
node tests/site/mobile-layout-parity.e2e.mjs --phase final
node tests/site/mobile-viewport-stability.e2e.mjs --phase final
node --test tests/site/advertising-photo-layout.test.mjs tests/site/advertising-products-layout.test.mjs tests/site/advertising-products-lifecycle.test.mjs tests/site/advertising-skeleton-flow.test.mjs
node tests/site/advertising-random-browse.e2e.mjs
node tests/site/advertising-route-footer-p75.e2e.mjs
node tests/site/advertising-skeleton-lifecycle.e2e.mjs
node tests/site/scrollbar-parity.e2e.mjs
node tests/site/menu-reference-parity.e2e.mjs
pnpm qa:cross-browser
node tests/site/mobile-viewport-android-record.mjs --phase final --native-pinch
```

Recorder default chỉ VI subset; L06 truyền `--routes` tường minh để đủ VI/EN/
state theo plan, reuse đúng USB port9223/reverse8792. Snapshot baseline phải
lưu trước L01; named RED không sửa thành GREEN. QA cuối một matrix/regression
run cho candidate; khi code đổi vì finding, rerun affected portion rồi final
source/served guards, không retag old raw như cùng candidate.

### Docs impact, rollback và gates

Owning shell spec giữ accepted layout/integration; photo/grid spec chỉ update
delta geometry tác động, không thay random/motion/glass contract. DESIGN/
surface sidecar chỉ update nếu visual token/state authority thực thay;
nếu cần, tách docs-only amendment≤5files sau owning slice. Rule này không cấp
quyền `impeccable init/document` hoặc copy reference. Report28/09 chỉ tạo
sau có implementation evidence, không claim runtime mới từ plan review.

Rollback dùng exact pre-layout baseline owned hunks/file bytes và rebuild;
không reset về HEAD trước random/viewport hoặc restore whole dirty tree.
Snapshots layout riêng, không overwrite V-C/C06U/pause. Trước handoff: actual
LOC/requested/effective route/Graphify semantic pending, local links/anchors/
glossary/diff-check, source/served + raw hashes và unrelated statuses phải
main verify. Accepted spec chưa thay viewport source, plan approval chưa
cho commit/push/deploy; owner duyệt plan và tracking mới mở L00–L07.

Open gates hiện có: iPhone physical, owner visual, reference/MCP UI,
native keyboard/init-collapsed, existing continuation failure. Không dùng
layout plan để diagnose/fix old full continuation hoặc deploy. Ngày28/09
Graphify query báo AST fresh,215semantic files pending; Serena managed checkout
context codex, LSP ready. Không chạy semantic extraction.

Review plan28/09: cùng reviewer gộp requested Sol/ultra, effective unknown,
Required0. Main đối chiếu spec/AC/ownership≤5files/task, dependency/checkpoints,
estimate265–395phút và660cases+states;132local links/anchors đạt. Bảy frozen
source/test hashes, old V-C/pause pointers và primary/recovery không đổi.
Đây review planning, không runtime QA hoặc owner plan approval; plan/card
đã được owner duyệt bằng reply ghi đầu section. Không coi review plan là runtime
acceptance; implementation L00 bắt đầu với baseline immutable riêng.

<a id="l04r-readable-content-floor--plan-draft-2026-09-28"></a>

## Amendment L04R — minimum chữ/control Advertising — đã duyệt

Phụ thuộc L04 named RED và [delta L04R](../docs/specs/frontend-brand-shell-responsive-runtime.md#l04r-readable-content-floor--draft-2026-09-28).
Owner đã duyệt delta và plan L04R ngày28/09 bằng “duyệt, và máy điện thoại là A05s.”
Nhãn draft anchor giữ cho links cũ; device target hiện tại là Chrome/A05s và
Safari/iPhone, không thêm A54 gate vào layout initiative. Historical release
A54 FPS gate giữ scope cũ riêng. Combined draft review Required0, requested
Sol/ultra/effective unknown; không coi planning review là runtime acceptance.
Estimate ban đầu100–180 source/test changed LOC,50–80phút; named WebKit
grid→photo proof820px needed/580px measured và empty-tag oracle cần thêm
inner-content ResizeObserver correction cùng regression/source guards. Estimate
cập nhật210–250LOC, thêm20–30phút; ownership/controller/dependency không đổi.
Dùng card layout
hiện hành đã authorized, không tạo card/controller/dependency mới.

| Task | Responsibility và≤5files | Verify |
| --- | --- | --- |
| L04R1 | `catalog-runtime.mjs`, `layout-core.mjs`, `advertising-photo-layout.test.mjs`, `advertising-products-layout.test.mjs`, layout runner: đo minimum CTA và info/pager, optional pure geometry floor giữ default; minimum vượt cap chỉ khi chữ/control không fit | named CTA/pager RED→GREEN; unit default+200%/short cases; caller/source diff |
| L04R2 | layout runner, `detail.css` chỉ nếu measured glyph cần, owning shell/photo spec, report: đủ paginated copy,100/200%, dọc/ngang/reduced/fallback; không sửa nguyên nhân bằng font shrink/hidden text | exact source/served/provenance; random/footer/lifecycle/viewport/menu/viewer/scrollbar affected gates |

Sau hai slice, tiếp L05 final660/state regressions và checkpoint L-B, L06USB,
L07combined review/checkpoint/card. Không đóng missing iPhone/MCP/reference/
owner gates hoặc resume recovery/P11. Không commit/push/deploy. Provider API
compatibility và footer48/64/random/common/deck/context≤2 phải main verify;
review vẫn cùng agent requested Sol/ultra, effective unknown. Nếu measurement
cần vượt files/LOC/scope này, báo evidence trước, không âm thầm đổi architecture.

<a id="l04h-about-route-history--plan-draft-2026-09-28"></a>

## Amendment L04H — history qua About — plan đã duyệt

Owner duyệt [delta L04H](../docs/specs/frontend-brand-shell-responsive-runtime.md#l04h-about-route-history--draft-2026-09-28)
ngày28/09 bằng “Duyệt delta L04H”. Owner duyệt plan cùng ngày bằng “Duyệt plan
L04H”; local implementation được mở. Dùng lại card
layout đã được owner cho phép; không tạo card hoặc module mới. Raw RED và
`persistent-shell-map.json` tại `.tmp/mobile-layout-parity/` giữ nguyên:
About↔bốn canonical route mismatch hai chiều VI/EN; WebKit chuyển About→
Residential đã push đích rồi hard reload cùng URL, Back/Forward sai đích.
Body run3engine dở dang vẫn incomplete, không gọi L-B.

**Quyết định:** chặn Barba ở `shouldPreventBarba` cho click link same-origin
VI/EN qua biên About↔Home/Residential/Commercial/Advertising. Trình duyệt
native xử lý click đã settle trước khi Barba push history; mỗi click có đúng
một destination. Dùng path route hiện có, không thêm router/dependency hoặc
sửa `hardNavigate` global. Giữ điều kiện external/download/target/language,
các cặp shell tương thích, query Advertising, photo/tag popstate và motion
timing. Programmatic `barba.go`/entry lịch sử cũ qua mismatch, nếu phát hiện,
ghi RED và soạn delta mới trước khi mở handler ngoài click.

| Task | Ownership và dependencies | Acceptance và verification | Estimate |
| --- | --- | --- | --- |
| L04H0 | Read-only baseline: report layout, immutable raw và `persistent-shell-map.json`; phụ thuộc delta accepted | Xác nhận đúng 8 directed boundaries mỗi locale, current source/served hash và RED WebKit; không retag raw cũ | 10–15 phút |
| L04H1 | `tests/site/mobile-layout-parity.e2e.mjs`, report; phụ thuộc H0 | Thêm focused click→Back→Forward About↔bốn route, VI/EN, portrait390×844/landscape838×387, 3 engines. Mỗi directed pair dùng page/history baseline mới; assert click tạo một main-frame navigation tới đích, `timeOrigin` đổi, `history.length` tăng đúng1 và URL/namespace ổn qua cửa sổ self-reload đã đo trước Back. Back/Forward assert exact URL/namespace/document; console/network strict. Current candidate phải RED trên WebKit, không false GREEN do early settle | 45–60 phút |
| L04H2 | `src/site/motion.js`, focused runner, owning shell spec, report; phụ thuộc H1 | Guard nhỏ trong `shouldPreventBarba`; cùng oracle H1 RED→GREEN, exactly-one destination/native history. Control Home→Residential và Residential→Commercial VI/EN: URL/namespace đúng, `timeOrigin` giữ nguyên qua soft Barba, motion-ready/history đúng; guard quá rộng phải FAIL. Kiểm representative About→Advertising query hợp lệ và existing Advertising photo/tag history. `pnpm prepare:site` + source/served hash | 40–55 phút |
| L04H3 | Focused runner, report, `tasks/todo.md`, `docs/STATE.md`; phụ thuộc H2 | Recheck same candidate: 660 layout matrix + đủ210 body combinations (7 modes × 10 canonical × 3 engines), state subset và affected static/unit/random19/footer6/lifecycle/scrollbar405/viewport/menu/smoke; failures ghi riêng. Ba body run cũ incomplete phải chạy lại cùng hash. L-B chỉ khi đầy đủ; tiếp L06 Android A05s, L07 cùng reviewer Sol/ultra | 45–65 phút kiểm focus, thêm 30–40 phút body |

Checkpoint H1–H2: một named RED trước source edit, GREEN cùng scenario sau
build, review diff hẹp và source/served checksum. Checkpoint H3/L-B: matrix,
state/body, regressions và raw manifest cùng candidate; nếu source đổi do
finding thì rerun affected portion trước snapshot. Mỗi slice tối đa bốn file,
source/test estimate40–110 LOC; tổng khoảng170–235 phút gồm body. Rollback
chỉ bỏ guard L04H và focused test hunks rồi rebuild; giữ mọi edit random,
viewport, layout, recovery và user work khác. Không commit/push/deploy.
Physical Safari/iPhone, MCP UI, owner visual và full Espacio vẫn là gate riêng.
Docs impact: owning shell spec/STATE/report/task status cập nhật theo evidence;
Notion chỉ phản ánh status sau Git. Requested reviewer Sol/ultra, effective
model/effort ghi theo tool nếu có, nếu không ghi unknown.
Read-only combined plan review ngày28/09: cùng một reviewer requested Sol/ultra,
observed effective unknown, Required0/Optional0 sau khi sửa oracle native
history, control soft Barba và đủ210 body combinations. Đây là review plan,
không là runtime PASS. Owner plan gate được ghi ở đầu amendment.

<a id="advertising-history-motion--plan-draft-2026-09-28"></a>

## Advertising history motion — plan đã duyệt 2026-09-28

[Delta 13](../docs/specs/advertising-photo-morph-scroll.md#advertising-history-motion--accepted-2026-09-28)
đã được owner duyệt ngày 28/09. Owner duyệt plan H00–H03 cùng ngày bằng
“duyệt”; chỉ mở execution theo từng bước, bắt đầu H00 named RED. Chỉ module
`advertising-history-motion`, candidate local `8792`.
Tab báo lỗi `8790` là recovery khác source và in-app Browser chưa trả tab gốc;
nguyên nhân visual trên tab đó chưa xác minh. L06 A05s landscape vẫn RED vì
hai viewer EN đóng sau touch và một CDN load lỗi; L06/L07 chưa đóng. Điều phối
source freeze với QA trước H00/build; plan approval không thay layout/viewer gate.

| Task | Ownership, phụ thuộc, thời gian | Acceptance và verification |
| --- | --- | --- |
| H00 — named RED | `tests/site/advertising-photo-transitions.e2e.mjs`, raw `.tmp/advertising-history-motion/`; phụ thuộc plan duyệt; 20–30 phút | Ghi HEAD, source/build/served SHA và URL/viewport/reduced-motion. Trên `8792`, tạo case `history-entry-scroll-offscreen-morph`: grid `T0/Y0` → photo `T1/Y1` (`Y0 ≠ Y1`) → Back → Forward; lấy frame đầu/giữa/cuối, scroll mỗi entry, card/primary rect, clone photo ID, history length, console/network. Named RED phải tái hiện sai scroll hoặc morph; nếu không RED, dừng sửa, bàn giao result cho owner, không suy `8790` có cùng nguyên nhân. |
| H01 — sửa hẹp | `src/site/advertising-products/catalog-runtime.mjs`, focused runner; chỉ thêm `src/site/motion.js` nếu trace chứng minh adapter scroll là owner; phụ thuộc H00 RED; 45–70 phút | Tái dùng `createAdvertisingBrowseHistoryController`, `runPhotoMorph` và logical scroll hiện có. Lưu scroll entry rời đi, restore entry đến trước phép đo đích/morph; không thêm history entry/frame sai scroll/scroll để lộ card. Đúng photo ID và rect card ở trên/dưới viewport kể cả virtualized/unloaded, primary `[data-advertising-photo-image]`; hai chiều `400ms`, endpoint `≤1 CSS px`; reduced motion và media lỗi chuyển tĩnh, cleanup clone/hidden/lease. Cùng case RED→GREEN sau `pnpm prepare:site`, source/build/served SHA khớp. |
| H02 — affected matrix | focused runner, `tests/site/advertising-products-lifecycle.test.mjs` chỉ nếu cần oracle, raw proof; phụ thuộc H01; 45–65 phút | VI/EN × desktop smooth/mobile-width `390×844` với runtime native scroll × card visible/above/below × Back/Forward với `Y0 ≠ Y1`; kiểm first/mid/last frame, không jump/identity swap/extra scroll. Assert cùng entry seed/category/tag/locale/focus giữ contract; rapid Back/Forward, slow/broken image, reduced motion và accepted detail↔detail regression; URL/history, console/network sạch. Focused runner hiện Chromium-only, không thay physical/3-engine gate. Chạy full 18 case hiện có + H00 case = 19 unique names, 0 FAIL; manifest phải ghi names/count, không nhận one-case PASS. Chạy thêm `node tests/site/advertising-return-p74.e2e.mjs` vì sửa history scroll. Chạy `node tests/site/advertising-random-browse.e2e.mjs` nếu seed branch bị ảnh hưởng; `node tests/site/advertising-route-footer-p75.e2e.mjs` nếu adapter/limit đổi. Không chạy lại body210 khi product source/runner/served hash và blast radius không đòi. |
| H03 — review/checkpoint | owning morph spec, `docs/STATE.md`, `tasks/todo.md`, dated verification report khi có runtime evidence; phụ thuộc H02; 25–35 phút | Main kiểm diff/DoD/provenance và review required findings, capture visual cùng viewport trên `8792`, owner visual còn gate riêng. Report tách local result với tab recovery `8790` unverified, L06 RED, iPhone/physical và full-site parity chưa đạt. Chỉ cập nhật owning docs/status theo evidence, giữ QA raw và mọi work khác. Không commit/push/deploy. |

H00 đã thực thi trên `8792`: case EN/VI desktop `1543×884`, card dưới viewport,
`Y0=0/Y1=480` PASS với frame, paint và video; xem [report H00](../docs/verification/advertising-history-motion-2026-09-28.md).
Không có named product RED trên candidate này, nên H01–H03 **chưa chạy** và
không sửa source. Tab owner `8790` chưa quan sát được; không suy lỗi đã hết.
H00 test thực tế `+209/−4` LOC vượt estimate module `100–180`; trước
implementation mở rộng áp dụng tracking gate ở cuối plan, chưa tạo card.

**Supersession M02b 2026-09-30:** H00 và bảng H01–H03 ở trên là kế hoạch,
evidence lịch sử. Contract media-card M02b đã duyệt bỏ clone/morph từ card
grid hoặc related sang primary, kể cả chuyển detail A→B qua related và
Back/Forward; chỉ giữ morph primary↔enlarged viewer cùng scroll/media theo
từng history entry. H01/H02 chưa thực thi như gói riêng và oracle `400ms`
card↔primary cần rescope khi owner mở lại, không dùng để bắt M02b tái tạo
morph đã bỏ. M02b có phần xử lý history/scroll, hiện được owner mở lại nhưng
chưa nghiệm thu; H01 checkbox vẫn mở.

Mỗi lần chạy H00/H01/H02 đặt `$stage='H00-red'`,
`$stage='H01-green'`, `$stage='H02-full'` tương ứng rồi chạy:
`$stamp=(Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssfffZ')`;
`$out=".tmp/advertising-history-motion/$stage-$stamp"`;
`if (Test-Path -LiteralPath $out) { throw 'Evidence directory exists' }`;
`$env:PHOTO_TRANSITIONS_OUTPUT_DIR=$out`. Retry lấy stamp mới, không ghi đè RED/GREEN.
Đặt `$env:PLAYWRIGHT_BROWSERS_PATH='E:/TruongThinh-Website/.tooling/browsers'`
(Playwright `1.63.0`, pinned Chromium revision `1243` đã có),
`$env:BASE_URL='http://127.0.0.1:8792'` và xóa hai cờ lọc bằng
`$env:PHOTO_TRANSITIONS_P13_BASELINE=''`;
`$env:PHOTO_TRANSITIONS_P13_GATE=''`. H00/H01 đặt
`$env:CASE='history-entry-scroll-offscreen-morph'`; H02 **xóa lọc** bằng
`$env:CASE=''`. Mỗi stage chạy `node tests/site/advertising-photo-transitions.e2e.mjs`;
H02 thêm `node --test tests/site/advertising-products-lifecycle.test.mjs` và
`pnpm qa:static`. Kiểm JSON `results` đúng số tên trước khi gọi full PASS.
H03 chạy `git diff --check` và kiểm link/anchor owning docs cùng raw manifest.

Checkpoint H00: snapshot/hash source, runner, output trước sửa; giữ RED immutable.
Checkpoint H01–H02: GREEN cùng named case, build/hash và affected regressions;
nếu source/runner đổi do finding, chạy lại phần chịu ảnh hưởng. Rollback chỉ
revert đúng H01/H02 hunks sau khi so snapshot, rebuild và giữ raw RED/GREEN,
không reset checkout hoặc đụng L06/recovery. Estimate `100–180` LOC source/test
viết tay, tổng `135–200` phút; nếu đo thực tế cần `≥200` LOC hoặc mở module,
đề xuất owner tạo/link Notion card **Advertising history scroll và offscreen
photo morph** (scope chỉ H00–H03) trước implementation mở rộng. Không tự tạo
card. Requested Sol/xhigh; observed effective model/effort unknown.

<a id="site-media-card-playback--plan-draft-2026-09-28"></a>

## Media card toàn website — plan đã duyệt 2026-09-28

[Spec đã duyệt](../docs/specs/site-media-card-playback.md) sở hữu hành vi;
[card discovery](https://app.notion.com/p/3e9332849a0e814995c2fbb2e5393803)
giữ phỏng vấn. Owner duyệt plan ngày 28/09; M00a diagnostic được mở, các gói
sau cần checkpoint theo dependency. Không rollout chỉ
Advertising: M01/M02 là lát kiểm đường đi dữ liệu trước khi nối mọi họ VI/EN;
chỉ nghiệm thu feature khi M03–M09 và owner visual đạt. Source public chỉ ở
`src/site/`; tái dùng runtime/solver/history/gallery hiện hành. Không tạo
framework carousel/solver mới, không đổi ordering, filler, seed hay geometry để
ép vùng autoplay. Morph grid↔detail sẽ bị bỏ có chọn lọc; morph primary↔viewer,
per-entry scroll và modal layering vẫn giữ. L06 EN landscape viewer touch-close
và CDN failure là RED độc lập, không nhập thành GREEN của media feature.

**Giới hạn thực thi tạm thời — owner 2026-09-30:** Tập trung
`advertising-products` và các route con; tạm dừng việc trên Home, Residential,
Commercial, About. M03–M05 và QA/closure toàn website M08–M09 ở trạng thái
PAUSED, không phải hoàn tất hay bị loại khỏi spec/plan M00–M09 đã duyệt.
M02a đã đạt scoped engineering GREEN theo
[checkpoint](../docs/verification/site-media-card-m02a-checkpoint-2026-09-30.md).
Owner đã mở lại M02b từ
[RED-only checkpoint](../docs/verification/site-media-card-m02b-red-pause-2026-09-30.md);
ngày 30/09 đã lưu
[checkpoint PAUSED dở dang](../docs/verification/site-media-card-m02b-checkpoint-2026-09-30.md),
rồi ngày 03/10 tiếp tục riêng M02b để hoàn tất gói và tạm dừng ở checkpoint mới.
M06/M07 chưa mở. M06a trong plan còn
phụ thuộc M03–M05: nếu
làm lát Advertising trước, lưu checkpoint riêng, không gọi M06a toàn gói GREEN.
Chỉ owner mới mở lại việc trên các trang khác hoặc gate full-site. Checkpoint
R6-R3 ngày 28/09 vẫn là evidence lịch sử; M02b source candidate còn dirty.
[Sáu named cũ](../.tmp/site-media-card/m02b-six-final-20260930T083739504Z/)
đã PASS trên candidate trước extension; related RED→GREEN, affected QA và
review của gói marker mở rộng chưa hoàn tất, chưa gọi M02b GREEN.

**RESUMED và gate phiên 2026-10-03:** Owner xác nhận gói marker/history
main và related dưới đây; giữ scope Advertising và `?photo=` detail con.
Execution PAUSED / NOT ACCEPTED theo quota STOP remaining6%; [checkpoint](../docs/verification/site-media-card-m02b-checkpoint-2026-10-03.md)
khóa runtime `6D654C…`: related simulation 3/6 PASS, desktop VI activation,
desktop EN remount và landscape VI first-paint Y còn FAIL. Main đã kiểm current
original6 PASS, affected5/8, layout47/static/build PASS; independent source
review/acceptance còn mở. M02a10/11, EN grid-video activation FAIL chưa phân loại.
Lifecycle50/52 stale baseline đã xác minh, future correction tách một file;
MCP browser matrix TOOL BLOCKED, detector evidence OPEN. Chỉ checkpoint/handoff
wrap-up được mở, không chạy thêm production/QA/automation trong phiên này.
Debug simulated browser trên desktop, điện thoại dọc/ngang trước. Owner
bỏ qua Samsung A05/A05s physical trong phiên này: gate skipped/unverified;
iPhone còn mở, simulation không là evidence thiết bị thật. Main theo dõi
quota chung 5 giờ; nếu còn dưới 10% thì wrap-up, khóa checkpoint và tạo
Claude AI handoff có commands/hash/evidence/việc còn lại. Notion không
callable trong phiên này, card giữ cập nhật live pending; không chặn repo
work hoặc dùng snapshot card ngày 30/09 làm current verification.
Owner chốt ngày 28/09: mọi item ảnh/video và poster trong một media-card cùng
tỷ lệ chính xác; indicator 1 item không hiện, 2–6 chấm, từ 7 hiện số. M01c
kiểm contract và fixture hợp lệ; M01d sau đó chứng minh khung grid/related theo
cover cho **canvas media** trước primary M02a; tổng card đa media có thêm dải
điều khiển 44px theo override R6-R3 dưới đây. M03–M05 áp dụng cùng quy tắc tỷ
lệ cho từng họ card.
M01b có thể review patch hành vi R3 trên fixture chẩn đoán hiện tại, nhưng
fixture ảnh/video sai tỷ lệ không thể đóng M01b cuối cùng. M01c bắt đầu sau
review hành vi đó; chỉ khi M01c GREEN với fixture đúng tỷ lệ mới nghiệm thu
M01b. M01d chờ cả M01c GREEN và M01b nghiệm thu cuối, tránh vòng phụ thuộc.

**Gate đầu vào:** điều phối source freeze với L06/L07 và snapshot dirty work,
HEAD, source/build/HTTP served, runner và media sample SHA trên managed checkout
`8792`; không dùng recovery `8790`. Mỗi lần ghi raw tạo
`.tmp/site-media-card/<stage>-<UTC timestamp>` và fail nếu path đã tồn tại;
giữ RED và GREEN immutable. Trước source, viết named focused RED phản ánh đúng
spec; fixture/media/network lỗi ghi riêng, không hạ oracle để ép RED. Prototype
vẽ vùng focus vô hình lên screenshot/video desktop + mobile theo center và
header thực, thử các viewport làm nhiều/không card đủ điều kiện. **Owner đã duyệt
visual A ngày 28/09: dải giữa 40% phần viewport dưới navbar, không autoplay khi
không có tâm ứng viên trong vùng**; M06 dùng contract này, vẫn phải chứng minh
soft solver và scheduler. Không suy hành vi runtime từ prototype.
Thử một clip có audio và một GIF đầu vào chuyển MP4/H.264 + WebP poster,
không lưu GIF public; kiểm Safari/Chrome mục tiêu, quality, size, startup,
`preload`/byte range bằng trace. M00b đã có [mẫu synthetic và trace Chromium](../.tmp/site-media-card/m00b-media-20260928T094733503Z/M00b-media-review.md)
desktop/mobile cùng [đính chính số byte](../.tmp/site-media-card/m00b-media-amend-20260928T095524377Z/M00b-media-amend.md):
byte browser thực nhận chưa biết. Clip thật, Safari/iPhone physical và
quality/byte budget vẫn mở. Chỉ khóa
lề/budget tải sau evidence trên clip thật, không cam kết browser chỉ tải đúng hint.

| Gói thực thi | Ownership tối đa 5 file viết tay; phụ thuộc; estimate | Acceptance và test/checkpoint |
| --- | --- | --- |
| M00a — freeze, inventory, RED | Focused runner `tests/site/site-media-card-playback.e2e.mjs`, dated raw manifest; plan duyệt; 60–90 phút | Snapshot dirty work, source/build/served/runner SHA `8792`; inventory mọi họ VI/EN và named RED cho card media, playback, history, viewer local pinch. Fixture/network lỗi tách product RED; không source fix. |
| M00b — prototype, sample | Owning spec, focused runner M00a, dated visual/trace evidence; M00a; 60–90 phút | Overlay focus dưới header trên desktop/mobile, nhiều/không candidate và soft fallback; clip có audio + GIF đầu vào chuyển MP4/H.264, WebP poster, không lưu GIF public. Owner duyệt vùng/fallback trước M06; byte/preload budget theo trace, không suy từ hint. |
| M01a — Advertising media data | `src/site/advertising-products/media-manifest.mjs`, `catalog.mjs`, focused runner M00a; M00a/M00b; 55–80 phút | RED→GREEN media ID/order/poster/duration/audio trên một card parent và related; image-only catalog cũ, seed/filter giữ nguyên. |
| M01b — Advertising card interaction | `src/site/advertising-products/catalog-runtime.mjs`, `src/site/detail.css`, `tests/site/site-media-card-m01b.e2e.mjs`; M01a; 60–90 phút | Review patch hành vi R3/affected regressions bằng fixture cũ chỉ là checkpoint chẩn đoán: swipe/click, indicator 1/2–6/≥7, mute/loading, R2a lỗi media và rapid retap phải đúng. **Chưa đóng M01b** cho tới khi M01c thay fixture đúng tỷ lệ, validator GREEN và chạy lại focused behavior trên candidate cùng source/served SHA. |
| M01c — tỷ lệ media và fixture hợp lệ | `src/site/advertising-products/media-contract.mjs`, `catalog-runtime.mjs` nếu fallback cần sửa, `tests/site/site-media-card-contract.test.mjs`, `tests/site/site-media-card-m01b.e2e.mjs`; sau M01b behavior patch review, không cần M01b final; 65–95 phút | Named RED→GREEN: `width`/`height` số nguyên dương, mọi item cùng tỷ lệ hữu tỷ rút gọn; video/poster intrinsic và mọi fallback **hiện trên card** cùng tỷ lệ, kể cả `record.media` nếu được render. Reject mismatch, không crop/tolerance; legacy khác tỷ lệ chỉ được giữ làm metadata không render. Thay fixture bằng ảnh/video/poster synthetic cùng tỷ lệ, kiểm normal/slow/error fallback; giữ 154 card image-only data/hash. Unit + focused M01b browser, source/build/served SHA; kết quả hợp lệ là gate đóng M01b cuối cùng. |
| M01d — canvas grid/related theo cover | `src/site/advertising-products/layout-core.mjs`, `catalog-runtime.mjs`, `tests/site/advertising-products-layout.test.mjs`, `tests/site/advertising-grid-oracle.mjs`, focused runner M00a; M01c GREEN và M01b final; 70–105 phút | Named RED→GREEN với fixture hợp lệ: ảnh/video trong `mediaItems[]` và poster video cùng tỷ lệ 16:9, `record.media` 1:1 chỉ là metadata legacy, không render fallback trên card; **canvas media** grid/related lấy tỷ lệ cover từ đầu. Evidence M01d scoped giữ rect canvas/khung cũ qua slide/slow/error `≤1 CSS px`; R6-R3 sau đó dành dải dưới canvas làm tổng card cao hơn, không hồi tố M01d thành pointer GREEN. Layout accessor fallback `record.media` chỉ khi không có danh sách media, không sửa legacy, 154 image-only giữ geometry/hash/seed/order/no-filler. Primary media active/hình học thuộc M02a. |
| R6-R3 — dải điều khiển dưới canvas | `src/site/advertising-products/catalog-runtime.mjs`, `src/site/advertising-products/layout-core.mjs`, `src/site/detail.css`, `tests/site/site-media-card-r6.e2e.mjs`, `tests/site/advertising-products-layout.test.mjs`; sau M01d; 80–110 phút | Từ [R6 pointer RED](../.tmp/site-media-card/m01d-r6-pointer-red-20260928T123921250Z/manifest.json), named RED→GREEN pointer thật grid/related: canvas đúng cover ratio, solver tính trước thêm dải 44px cho 2+ media; 2–6 chấm nhìn thấy ~8px, một hàng với hit box 20×44, ≥7 count và prev/next ≥44×44 trong dải; duration/playback ở canvas, không chồng dải/card kế. Singleton/154 legacy không dải; slide/slow/error giữ rect `≤1 CSS px`, seed/order/no-filler và hash legacy. Cách overlay/chỉ ép một hàng trong khung cũ đã bị override, không gọi M01d geometry cũ là lỗi hồi tố. Chạy M01b suite như affected regression; source/build/served SHA và independent review trước M02a. Owner đã cho phép override từ tham chiếu, không thêm gate duyệt. |
| M02a — primary và thumbnail | `src/site/advertising-products/index.html`, `catalog-runtime.mjs`, `src/site/detail.css`, focused runner M00a, `docs/design/content.md`; M01d geometry và R6-R3 GREEN/review; 60–90 phút | Active media mở đúng primary/thumbnail, âm thanh có unmute, VI/EN copy đúng; direct detail/media identity có focused GREEN. |
| M02b — bỏ grid-detail morph, marker/history | Checkpoint RED: `tests/site/advertising-photo-transitions.e2e.mjs` (1 file). Checkpoint đổi behavior và docs cùng lúc: `src/site/advertising-products/catalog-runtime.mjs`, `src/site/detail.css`, `docs/specs/advertising-photo-browse.md`, `docs/specs/advertising-photo-morph-scroll.md`, `docs/specs/frontend-brand-shell-responsive-runtime.md` (5 files); sau M02a; 80–110 phút | Supersede chính xác đoạn grid↔detail morph trong **cả ba accepted docs** ở cùng checkpoint đổi behavior, gồm assertion shell hiện tại về morph dưới header; không đổi thứ tự modal/header/veil còn hiệu lực. RED→GREEN no-clone/no-jump, đúng một `Vừa xem`/`Just viewed`, Back/Forward Y0/Y1, locale/media identity. Giữ viewer open-close morph/R9 wheel và entry-scroll; kiểm docs diff trước checkpoint. Không thêm owner gate: spec media-card đã duyệt chỉ bỏ grid↔detail morph. |
| M03a — Home reel | `src/site/index.html`, `src/site/style.css`, `src/site/motion.js`, focused runner M00a; M01b final; 50–75 phút | Reel có identity/detail dùng media-state, desktop/mobile rail snap và route giữ nguyên; VI/EN focused GREEN. |
| M03b — Home portal | `src/site/index.html`, `src/site/style.css`, focused runner M00a, `docs/design/patterns.md`; M03a; 50–75 phút | Portal đủ điều kiện mở đúng media/detail, portal phi-media giữ tĩnh; hover/touch và no layout jump GREEN. |
| M04a — Residential | `src/site/residential/index.html`, `src/site/detail.js`, `src/site/detail.css`, focused runner M00a; M03b; 55–85 phút | Gallery/editorial/duo có identity đúng media/detail; drag/prev/next, alt/ARIA, section geometry VI/EN GREEN. |
| M04b — Commercial | `src/site/commercial/index.html`, `src/site/detail.js`, `src/site/detail.css`, focused runner M00a; M04a; 55–85 phút | Cùng contract trên Commercial, ảnh minh họa không thành media-card; route và geometry VI/EN GREEN. |
| M05 — About và scope closure | `src/site/about/index.html`, `src/site/detail.js`, `src/site/detail.css`, focused runner M00a, `docs/design/patterns.md`; M04b; 70–110 phút | About duo kiểm eligibility; logo/montage/chữ không có player. Đối chiếu inventory tất cả họ VI/EN, không bỏ gallery/portal âm thầm. |
| M06a — zone + solver | `src/site/advertising-products/layout-core.mjs`, `catalog-runtime.mjs`, focused runner M00a, một unit test; M02b–M05 + visual A40% M00b đã được owner duyệt; 60–80 phút | Center/zone đã duyệt chọn soft placement, không đổi order/seed/filler/geometry; không có ứng viên thì không autoplay; named GREEN trên viewport 0/1/nhiều ứng viên. Nếu solver không giữ contract, dừng và trình owner. |
| M06b — một player, arbitration | `src/site/motion.js`, `src/site/advertising-products/catalog-runtime.mjs`, focused runner M00a, một unit test; M06a; 75–100 phút | Cover video duy nhất; random không lặp chu kỳ, hover thắng focus, manual pause/play và scroll không race; timestamp trong viewport/reduced motion GREEN. |
| M06c — preload + cleanup | `src/site/advertising-products/catalog-runtime.mjs`, `media-manifest.mjs`, focused runner M00a, dated network report; M06b; 60–80 phút | Poster/metadata/initial bytes trace; pause giữ frame, offscreen/BFCache cleanup; slow/error fallback và byte budget đo được, không claim tải đúng hint. |
| M07a — phân loại L06 viewer RED | `tests/site/mobile-viewport-android-record.mjs`, `tests/site/advertising-photo-view.e2e.mjs`, dated raw report; M02b; 40–60 phút | Replay bounded EN landscape touch-close, target/phase/console/network; CDN lỗi riêng, không đổi status L06 hoặc dùng portrait page pinch làm viewer PASS. |
| M07b — viewer image-local pinch | `src/site/advertising-products/photo-viewer.mjs`, `src/site/detail.css`, `tests/site/advertising-photo-view.e2e.mjs`, focused runner M00a; M07a/M06c; 80–110 phút | Hai pointer pinch/pan enlarged image RED→GREEN trên native Android; viewer morph/focus/lock/reduced motion giữ nguyên, page pinch không thay oracle. |
| M08a — desktop/browser matrix | Focused runner M00a, `tests/site/site.e2e.cjs`, `tests/site/advertising-photo-transitions.e2e.mjs`, dated report; M01–M07; 60–90 phút | Mỗi họ VI/EN × image/video/slow/error, scroll/history/hover/keyboard/reduced; affected solver/route/menu/footer, console/network và source/build/served SHA. |
| M08b — native + combined review | `tests/site/mobile-viewport-android-record.mjs`, focused runner M00a, dated report, `tasks/todo.md`; M08a; 60–90 phút | Android dọc/ngang; iPhone physical nếu có, nếu thiếu gate mở. Main kiểm exact combined diff, one-player, owner visual; không gọi full-site PASS khi thiếu device/UI gate. |
| M09 — links và handoff | `docs/STATE.md`, `docs/verification/index.md`, `docs/design/content.md`, `docs/design/motion.md`, `tasks/todo.md`; M08b; 60–100 phút | Chỉ xác minh supersession đã ghi ở M02b, sửa link/status/content theo diff thật; dated evidence, rollback/checkpoint và DoD. Không retag H00/L06 raw cũ hoặc dời thay đổi contract tới gói này. |

**Gói sửa harness M02b phụ thuộc diagnosis (tối đa 1 file test):** Chỉ
`tests/site/advertising-photo-transitions.e2e.mjs`, tách khỏi năm file
source/spec M02b và gói docs closure. Runner gốc SHA-256
`126235861405A1036A8C16C92886DD1FB7F94E4656B1C40DB2B91B8B386F74EA`;
case marker B timeout trước assertion ở VI/EN, raw cũ giữ bất biến.
[Diagnosis preflight](../.tmp/site-media-card/m02b-marker-diagnosis-20260930T080232930Z/preflight.json)
SHA-256 `88974E7AEE3EEACA7C975D0703199FD77E8E06CE070CF4C810C1AAFEE8D7878D`
khóa source/build/runner trước chẩn đoán. [Phép đo clean cuối](../.tmp/site-media-card/m02b-marker-diagnosis-20260930T080232930Z/probe-wheel-clean-v2.json)
đã xác nhận card B ở ngoài viewport vì native
`scrollIntoView` không tương ứng vị trí logical/transform của desktop
Locomotive. Runner đã dùng `ensurePhoto(B, { scrollIntoView: false, focus: false })`
rồi cuộn qua API logical scroll và chờ card thực sự ổn định trong viewport
trước click thật.
Không `force click`, không bỏ hoặc nới assertion marker/locale,
history, media identity hay no-clone. Runtime/CSS SHA của candidate giữ
nguyên; chạy lại named marker VI/EN và affected M02b cases sau patch, khóa
runner mới cùng source/build/served/raw SHA. Nếu lỗi còn, báo RED/unknown;
không gọi M02b GREEN từ riêng sửa harness.

**Gói marker M02b theo clarification owner 30/09 (tối đa 3 file):**
`src/site/advertising-products/catalog-runtime.mjs`,
`tests/site/advertising-photo-transitions.e2e.mjs` và
`docs/specs/site-media-card-playback.md`; phụ thuộc runner marker được sửa
reachability, SHA-256
`7BC8D53AB75152CD07B8FEC2C569868734893A05634F9D13D3A486BDC108D4DE`,
và có [baseline marker VI/EN](../.tmp/site-media-card/m02b-marker-runner-fix-20260930T083153963Z/marker-after/cp3-transition-e2e-results.json)
trên runtime SHA
`889034B97C2D673EC0385A369050361572FED511E165797D610102E60EBC5B5E`.
Owner xác nhận trong `?photo=` detail con, marker của card vừa đóng gần nhất
được chia sẻ giữa main Advertising grid và related grid: A→B đánh dấu A trong
related của B; B→C chuyển dấu sang B. Back/Forward giữ quy tắc latest closed,
mỗi grid **đang nhìn thấy** có tối đa một card nhận marker, không tự cuộn để
tìm card. Kiểm VI/EN ở main và related, virtualization/remount qua history
không tạo card hay scroll thêm, reload xóa dấu. Chạy một named related RED
trước sửa runtime: related A tại `YA` → detail B
tại `YB` → Back A khôi phục `YA` → Forward B khôi phục `YB`, `YA ≠ YB`,
sai số cuộn `≤1 CSS px`, không extra history entry/autoscroll. Back về A
đánh dấu B trong related A; Forward về B đánh dấu A trong related B; mọi
traversal tuân latest closed. Sau sửa, chạy cả sáu named cũ và named related
mới cùng affected regressions. Giữ toàn bộ assertion cũ;
nếu hidden DOM giữ marker trùng thì chủ động cleanup state/DOM, không nới
assertion để che lỗi. Tái dùng CSS/copy và module memory hiện có, không thêm
storage, token hay behavior trang khác. Sửa cùng spec sở hữu contract,
chạy affected history/no-clone/viewer/direct regressions với
source/build/served/runner SHA rồi independent review; một case PASS của
runner trước extension không chứng minh gói này GREEN. M06/M07 và full-site
vẫn PAUSED.

**Gói docs closure phụ thuộc M02b (tối đa 4 file):**
`docs/design/motion.md`, `docs/specs/advertising-final-polish-and-media.md`,
`docs/specs/mobile-browser-parity-capability-map.md` và
`docs/design/content.md`. Chỉ ghi supersession grid↔detail morph cùng nhãn
`Vừa xem` / `Just viewed` theo spec media-card đã duyệt; giữ viewer morph và
history scroll từng entry. Gói này tách khỏi năm file behavior/spec M02b để
không vượt ownership; không gọi runtime GREEN trước test/review, không thực thi
M09 hoặc đóng gate toàn website.

**Checkpoint M02b PAUSED/dở dang lịch sử (tối đa 5 file):**
`docs/verification/site-media-card-m02b-checkpoint-2026-09-30.md`,
`docs/verification/index.md`, `docs/STATE.md`, `tasks/plan.md` và
`tasks/todo.md`. Báo cáo chỉ khóa state, hash và QA một phần; không tự nhận
GREEN hay review. Sau khi M02b được nghiệm thu, gói status riêng chỉ sửa
`docs/specs/site-media-card-playback.md`: đối chiếu các câu “chưa triển khai”
với M02a scoped evidence và M02b chỉ khi được nghiệm thu; giữ feature toàn
website In progress, không đổi contract đã duyệt. Không dùng hai gói này để
thực thi M09 hoặc M06/M07.

Mỗi gói behavior viết named RED trước source, GREEN và affected regressions sau
source; raw riêng, source/build/served SHA và diffcheck tại checkpoint. Checkpoint
sau M02b: một đường card→primary→Back/Forward chạy trên media mẫu và hai
accepted docs đồng bộ ngay với behavior;
sau M05: inventory họ VI/EN đủ và no layout regression; sau M07: scheduler,
viewer và native touch evidence tách biệt; sau M09: owner visual và DoD.
Nếu **gói** cần >5 file viết tay hoặc >120 phút vì blast radius mới, chia gói
trước edit và ghi dependency/checkpoint mới; không kéo estimate một gói qua
ngưỡng rồi gọi nó là milestone.
Ước lượng kỹ thuật `20–31 giờ` qua các phiên, gồm M01c/M01d nếu cần; authoring media thật và thiết bị
iPhone không có ETA đáng tin, ghi gate riêng. Tracking ≥200 LOC dùng card
discovery đã có; worker Notion sở hữu cập nhật card, plan này không tự ghi.

**Commands sau khi plan được duyệt:**
`$env:BASE_URL='http://127.0.0.1:8792'`;
`$env:PLAYWRIGHT_BROWSERS_PATH='E:/TruongThinh-Website/.tooling/browsers'`;
trước focused runner tạo thư mục raw UTC mới có `preflight.json` của chính
candidate, đặt `$env:SITE_MEDIA_OUTPUT_DIR` tới thư mục đó và
`$env:SITE_MEDIA_EXPECTED_HEAD=(git rev-parse HEAD)`;
`node tests/site/site-media-card-playback.e2e.mjs` sau M00a tạo runner;
`node --test tests/site/advertising-products-layout.test.mjs tests/site/advertising-products-lifecycle.test.mjs`;
`node tests/site/advertising-photo-transitions.e2e.mjs` sau M02 sửa oracle;
`node tests/site/advertising-photo-view.e2e.mjs` khi M07 ảnh hưởng viewer;
`pnpm qa:static`. Sau source change mới chạy `pnpm prepare:site`, đối chiếu
source/build/HTTP SHA cùng runner/manifest và chọn affected regressions theo
diff. `pnpm qa:site`/body210 **không tự rerun** nếu blast radius và hash không
đòi; nếu chạy, ghi case names/count và raw riêng. `git diff --check` và local
link/anchor là docs gate. Rollback chỉ hunk thuộc task sau snapshot/hash,
rebuild và giữ raw RED/GREEN; không reset checkout, đổi phone settings,
commit/push/deploy hoặc mở recovery/P11 trong plan này.

## Advertising random grid và tải ảnh — plan duyệt 2026-10-03

Nhập từ `tasks/advertising-random-media/plan.md` của Codex ngày 2026-10-03; checklist ở [todo](todo.md#advertising-random-grid-và-tải-ảnh--checklist).

**Trạng thái:** owner duyệt ngày `2026-10-03` trong thread "M02b dở dang và
plan", cùng lệnh giao toàn bộ task Advertising và convert media. Capability map
và ba spec đã được duyệt ngày `2026-09-25`.

**Quyết định owner 2026-10-03 (thay phần tương ứng bên dưới):**

- Convert media sang định dạng hiện đại là yêu cầu trực tiếp: AVIF kèm WebP
  dự phòng, ba cỡ theo màn hình; video dùng AV1/WebM kèm MP4 H.264. Vẫn đo
  trước/sau để làm bằng chứng, không còn là điều kiện mở derivative.
- Nguồn convert là PNG gốc trên PC owner (154/154 ảnh Advertising, 27/65 ảnh
  khác); script chạy trên PC qua Remote Control, chỉ đầu ra vào Git. 38 ảnh
  không có gốc giữ WebP hiện tại làm cỡ lớn nhất.
- Đo trên demo Cloudflare Workers thay Sites; mỗi lần deploy vẫn hỏi owner.
  Làm trên cloud, branch ngắn và PR vào `main` thay worktree
  `codex/advertising-random-media`; reviewer là Claude, không dùng `gpt-6-sol`.
- Gate cần Firefox/WebKit, A05s hoặc iPhone để mở, gom chạy một lần trên PC ở
  cuối. Drift landscape `Y=3` ghi là giới hạn emulator, test giữ FAIL, kiểm lại
  trên A05s.
**Ngày lập:** `2026-09-25`.
**Ước lượng:** khoảng `12–22 giờ` làm việc chủ động, chưa tính derivative phát
sinh, thời gian chờ owner và Sites; khoảng `250–500 LOC` source/test, cần chốt
sau baseline.

### Mục tiêu

Triển khai ba module đã duyệt: vị trí card Advertising random nhưng ổn định
trong lượt duyệt; solver và batch skeleton tự thích ứng khi catalog tăng; tốc
độ ảnh toàn site được đo trước/sau; ảnh có khung đúng tỷ lệ và vòng tải byte
thật không có số. Giữ hard contract về ảnh, ID, geometry, filter, CTA, footer,
VI/EN và history. Random chỉ áp dụng grid Advertising; grid route khác và
CMS/upload UI không thuộc scope.

### Spec chuẩn

- [Capability map](../docs/specs/advertising-random-grid-and-image-loading-capability-map.md)
- [Grid Advertising và solver](../docs/specs/advertising-organic-random.md)
- [Tốc độ tải ảnh](../docs/specs/static-image-delivery.md)
- [Khung chờ và vòng tải ảnh](../docs/specs/image-loading-progress.md)
- Release boundary: [Sites chỉ nhận artifact tĩnh](../docs/decisions/sites-artifact-only-release-mirror.md)

### Quyết định kiến trúc

1. Catalog giữ `sourceOrder`, rank và identity canonical. Thứ tự trình bày/seed
   là state riêng; solver nhận thứ tự này mà không sửa catalog, URL hay taxonomy.
2. `catalog-runtime.mjs` giữ seed/history và related pools; `layout-core.mjs`
   giữ hard geometry cùng soft score. Nếu search nhịp nhìn cạn, fallback hữu
   hạn vẫn trả layout hợp lệ trong ngân sách `300.000` operations.
3. `skeleton-flow.mjs` đổi thứ tự band theo seed nhưng dùng frontier của card
   thật; `suggestion-slideshow.mjs` giữ random sample tối đa 9 ảnh/tag và đổi
   ảnh mỗi `3 s`, fade giữ `1,6 s`.
4. Đo trên Sites version hiện tại trước khi chọn cách tăng tốc. Chỉ tạo image
   derivative nếu byte ảnh là nút thắt đã đo; chỉ đổi discovery/priority nếu
   waterfall cho thấy request bắt đầu trễ. Không tải mọi ảnh trước viewport.
5. Vòng tải dùng cùng request với ảnh. Feasibility spike trên một hero và một
   ảnh lazy đi trước; nếu byte thật, time-to-decode và LCP không cùng đạt gate,
   dừng rollout progress và trình owner số đo/tradeoff.
6. Checkout `main` hiện có dirty paths ngoài task. Sau khi plan được duyệt,
   cô lập source work trong branch/worktree
   `codex/advertising-random-media`. Chỉ chuyển spec/map/docs/plan của task này.

### Thứ tự và phụ thuộc

```text
P0 worktree + baseline Sites
  ├── P1 RED tests → P2 order/history/solver → P3 batch skeleton/slideshow
  └── P4 chẩn đoán delivery → P5 tối ưu delivery → P6 progress feasibility
                                               └── P7 progress core → P8 static images
                                                                    └── P9 Advertising media
P3 + P4–P9 → P10 QA, code review và preview độc lập
           → owner duyệt preview/release → P11 Sites candidate + đo
```

Các source slice chạy tuần tự vì cùng dùng `catalog-runtime.mjs` và
`motion.js`. Không giao hai writer cùng file. P5 là go/no-go đã nằm trong
spec: nếu không đạt, dừng P6–P8 và trình owner chọn hướng.

### Task list

Checklist chi tiết, acceptance, verification và estimate nằm trong
[todo.md](todo.md#advertising-random-grid-và-tải-ảnh--checklist). Checkpoint:

- **A — grid:** P1–P3 pass; membership/ID, seed/history, solver hard gate,
  batch frontier và CTA/footer đều đạt.
- **B — delivery:** P4 xác định bottleneck; P5 có candidate so sánh được; P6
  pass hoặc dừng tại go/no-go để owner quyết định.
- **C — preview:** P7–P9 pass toàn website; P10 gồm QA độc lập do Claude
  review (owner 2026-10-03, không dùng `gpt-6-sol`). Main kiểm diff và finding.
- **D — release:** sau local preview, code review, Ponytail review và owner
  duyệt deploy demo Cloudflare Workers theo
  [decision](../docs/decisions/cloudflare-workers-static-demo.md); đo lại cùng
  ma trận sau deploy.

### Quality gate chung

- Unit hiện hành:
  `node --test tests/site/advertising-products-layout.test.mjs tests/site/advertising-skeleton-flow.test.mjs tests/site/advertising-products-media.test.mjs tests/site/advertising-products-lifecycle.test.mjs`.
- Build/static: `pnpm prepare:site` rồi `pnpm qa:static`.
- UI: `pnpm dev`; Playwright và Chrome DevTools MCP kiểm VI/EN, mobile/desktop,
  direct load/F5, filter/tag, Back/Forward/locale, keyboard, reduced motion,
  network, overflow và CTA/footer. Sau UI implementation chạy `impeccable detect`
  theo rule frontend; không chạy ở phase plan/spec.
- Performance: 5 lượt cold cho mỗi tổ hợp 6 route × 2 locale × 2 viewport
  (`390×844`, `1440×900`) = `120` lượt trước và 120 lượt cho candidate.
  Giữ Slow 4G/CPU 4x, xác nhận ảnh có transfer bytes; so cohort cùng ID/kích
  thước hoặc tầng bytes, đồng thời báo median không phân tầng.
- Acceptance theo static-image-delivery spec: Advertising ảnh đầu sẵn sàng
  nhanh hơn ít nhất `10%`; route baseline trên `3 s` nhanh hơn ít nhất `10%`;
  route khác không chậm hơn ngoài nhiễu; LCP không tăng quá `5%` ngoài nhiễu;
  CLS `≤0,1` và không tăng vì reserved frame.
- Sau implement: main chạy `code-review-and-quality` và `ponytail-review`;
  subagent preview read-only, báo route/viewport, bằng chứng và finding. Ghi
  model/effort yêu cầu và giá trị thực tế; nếu tool không xác nhận, ghi
  `unknown`.

### Rủi ro và rollback

| Rủi ro | Tác động | Giảm thiểu/rollback |
| --- | --- | --- |
| Random làm đổi grid | ID, history hoặc CTA/footer lệch | Tách presentation order khỏi canonical; oracle hard độc lập; rollback solver/state |
| Pool mới làm solver hết search | Layout lỗi hoặc treo | Bounded search, hard-safe fallback, sweep pool 1/10/100, diagnostic |
| Fetch stream làm ảnh/LCP chậm | Tệ hơn ảnh native | P5 đo hero/lazy; dừng progress rollout nếu không đạt |
| Candidate Sites trượt hiệu năng | Public version chậm hơn | Owner gate; lưu version cũ; đo cùng điều kiện; rollback |
| Dirty worktree khác bị lẫn | Commit/push ngoài scope | Worktree cô lập; selective transfer; exact diff; không stage hàng loạt |

### Việc cần owner xử lý trước implementation

- Ước lượng `250–500 LOC` vượt ngưỡng Notion `200 LOC`. Trước source task
  đầu, link task vào card liên quan trong backlog Notion hoặc owner cho phép tạo
  card; không tự tạo/cập nhật card khi chưa có quyền và connector phù hợp.
- Deploy candidate lên demo Cloudflare cần owner duyệt từng lần sau khi local
  preview/code review đạt (thay Sites từ 2026-10-03).

## Cảm giác cuộn chung theo trang chủ — plan chờ duyệt 2026-10-06

Spec owner đã duyệt 2026-10-06: [Cảm giác cuộn chung](../docs/specs/scroll-feel.md)
([card](https://app.notion.com/p/3f0332849a0e8153bb2edbde0c76b6ed)). Checklist ở
[todo](todo.md#cảm-giác-cuộn-chung--s1s5). Ước lượng khoảng `250` đến `350 LOC`, chưa tính khối "Giữ nghề" theo Espacio.

Quyết định:

- Parallax tái dùng Locomotive `data-scroll-speed="-2"` như hero trang chủ; không thư viện, không speed mới.
- Hero About tái dùng cách hero trang chủ giữ ảnh không lộ mép (ảnh phóng sẵn trong khung); đo lại ở mọi cỡ từ 981px (R3).
- Độ mượt (R2) chỉ đo được trên PC thật: script trace chạy được cả cloud (mốc tương đối) lẫn PC (gate); PC
  chạy qua Remote Control, owner chỉ cần cho phép phiên.
- Nguyên nhân khựng chọn từ trace, không đoán: ứng viên là gắn và gỡ card khi cuộn, `backdrop-filter` của Kính
  trên nội dung đang trượt, decode ảnh.

Thứ tự: S1 → S2 → checkpoint A → S3 → S4 → checkpoint B → S5. S1, S2 một PR; S3, S4 một PR; mỗi PR sửa spec
sở hữu file trong cùng PR.

| Bước | Việc | File | Cỡ |
| --- | --- | --- | --- |
| S1 | E2e chuẩn cuộn và parallax: đường trượt 11 trang bằng trang chủ (R1), bản đồ `data-scroll-speed` theo R4, không lộ mép ở 5 vị trí cuộn mỗi section (R3); đỏ trước S2 | `tests/site/scroll-feel.e2e.mjs`, `package.json` | S |
| S2 | Parallax theo R4: thêm cho hero About, bỏ ba ảnh About | `motion.js`, `detail.css`, HTML About | S |
| S3 | Script trace: lăn chuột đều toàn trang, ghi task trên `50ms` và tỉ lệ frame rớt cho trang chủ, Advertising, lọc nhóm, detail ảnh | `scripts/qa/scroll-trace.mjs`, `package.json` | S |
| S4 | Chạy S3 trên PC, sửa nguyên nhân lớn nhất, đo lại tới khi đạt R2 | Theo trace, trong `src/site/advertising-products/`, `detail.css` | M |
| S5 | Chuyển quy tắc vào `motion.md`, xóa mục approved-designs, spec `live`, publish lại Design System, card Done | `design-system/`, `docs/specs/` | S |

Checkpoint A: `pnpm qa:docs`, S1 xanh, test Advertising và trang con hiện có không đỏ; owner xem parallax trên
bản local hoặc demo khi owner cho deploy.
Checkpoint B: trace PC đạt R2; owner cuộn thử Advertising trên PC và xác nhận.

Rủi ro:

| Rủi ro | Mức | Cách xử lý |
| --- | --- | --- |
| Hero About lộ mép hoặc đổi crop | Thấp | So ảnh chụp trước và sau ở 1280, 1440, 1920; giữ `object-position` |
| Nguyên nhân khựng nằm trong Kính hoặc masonry thread khác đang sửa | Trung bình | Báo điều phối, sửa qua thread sở hữu nếu trùng |
| PC không sẵn sàng để trace | Trung bình | S1 đến S3 làm trước trên cloud; S4 chờ phiên Remote Control |

## Chú thích thuật ngữ

- **Source owner**: người chịu trách nhiệm sửa source trong task.
- **Tracking gate**: owner cho phép tạo hoặc link work item trước implementation.
- **Fail-open**: native scrolling vẫn dùng được khi smooth dependency không chạy.
- **Predicate**: điều kiện đo được để chờ hoặc kiểm state, thay vì thời gian đoán.
- **Scoped technical work**: phần implementation có scope/evidence rõ; không là release hoặc nghiệm thu mọi thiết bị.
- **Stable metrics**: kích thước layout không đổi theo browser toolbar, khác vùng nhìn thực.
- **Contract probe**: fixture kiểm giao diện metrics và behavior; không thay thao tác native trên điện thoại.
- **Seed**: giá trị chọn thứ tự random, được dùng lại khi phục hồi lượt duyệt.
- **Soft score**: điểm nhịp cao–thấp/so le; có thể nới để giữ hard contract.
- **Cold run**: lượt tải không dùng body ảnh trong cache browser.
- **Candidate**: build đã qua local QA, chờ owner duyệt phát hành/đo Sites.
- **Tracked**: file Git đang quản lý, xóa vẫn khôi phục được từ history.
- **Untracked**: file Git chưa quản lý, xóa là mất.
- **Supersede**: quyết định mới thay quyết định cũ.
- **Ledger**: một file tổng hợp nhiều lần kiểm theo thứ tự.
- **Trim**: cắt phần thừa trong file, giữ contract.
- **Mapping**: đường dẫn trước và sau được đề xuất.
- **Sink**: path script đọc/ghi, cần compatibility.
- **SHA256**: dấu kiểm byte để chứng minh bảo toàn.
- **Synthesis**: tổng hợp facts có nguồn, không thay evidence gốc.
- **Pure layout core**: module thuật toán không đọc DOM, network hoặc trạng thái
- **Artifact**: data build-time được runtime public đọc, không phải source CMS.
- **Shortest-column**: đặt card kế tiếp vào cột có đáy thấp nhất.
- **Immutable prefix**: card đã append giữ nguyên thứ tự và tọa độ khi nối data.
- **Fail-closed**: dừng rõ ràng khi version/schema sai thay vì render nửa đúng.
- **Reserved brick**: vùng primary tham gia cùng coordinate space như một item đã
- **Media lane**: ownership theo một category để các batch ảnh không xung đột.
- **Source ID**: danh tính ảnh gốc; crop/export lại cùng source không thành ảnh mới.
- **Contact sheet**: bảng thumbnail dùng để review uniqueness và composition.
- **Composition config**: dữ liệu xác định block order và media của một route.
- **Media partition**: chia toàn bộ source thành các slot không thiếu và không lặp.
- **RED**: regression test thất bại vì behavior mới chưa được triển khai.
- **Go/no-go**: điểm quyết định có tiếp tục rollout theo số đo hay dừng.
- **Reserved frame**: khung ảnh dành đúng tỷ lệ trước khi tải.
- **Selective transfer**: chỉ chuyển file task đã sở hữu sang worktree mới.
- **Ancestor opacity**: opacity của phần tử cha có thể làm ảnh con vô hình dù ảnh
- **Composition**: thứ tự và tổ hợp block tạo nhịp riêng cho một route.
