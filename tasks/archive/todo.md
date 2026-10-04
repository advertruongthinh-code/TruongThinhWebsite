# Lưu trữ checklist

Batch đã xong hoặc thuộc giai đoạn cũ, tách từ [checklist đang mở](../todo.md). Chuyển nguyên văn ngày 2026-10-04 để file đang mở ngắn lại; chỉ đổi cấp heading và đường dẫn tương đối cho đúng vị trí mới. Đây là lịch sử, không phải nguồn cho việc mới.

## Checklist scrollbar parity

Nguồn requirement: [delta accepted27/09](../../docs/specs/frontend-brand-shell-responsive-runtime.md#scrollbar-parity--2026-09-27).
[Plan](plan.md) sở hữu approach, scope, matrix và risk. Checklist này phục vụ
execution trong checkout riêng; không thay Notion priority/status.

### Gate đầu vào

- [x] Owner duyệt capability map: “Duyệt map như đề xuất”.
- [x] Owner duyệt delta scrollbar: “Duyệt delta scrollbar”.
- [x] Owner duyệt plan này: “Duyệt plan và card Notion”,27/09.
- [x] Owner cho phép tạo/link work item correction riêng cho estimate200–320 LOC;
  search/fetch parent/schema trước write, giữ recovery card paused.

### T01 — Desktop overlay giữ shell liền mạch

**Description:** sửa root scrollbar style ở shared shell; reuse Locomotive và
logical-scroll bridge. Ưu tiên CSS, chỉ sửa runtime khi failure yêu cầu.
**Dependencies:** gate đầu vào. **Scope:** S/M, tối đa3 files.
**Files:** `src/site/style.css`, `src/site/motion.js` nếu cần,
`tests/site/scrollbar-parity.e2e.mjs`.

**Acceptance:**

- [x] Idle/scroll/hover/drag geometry/state đạt spec; đúng một custom bar,
  thumb theo logical scroll, settle không giữ stale visibility.
- [x] Shell/header/nav bbox không lệch quá1 CSS px do visibility; overlay
  không reserve gutter, che hit target hoặc thêm white track thường trực.
- [x] Focused test có assertion sai trên baseline trước fix, đạt sau fix;
  không sửa vendor/library hoặc inject state để tạo PASS.

**Verification:** `pnpm prepare:site`, preview8792 đúng source/hash,
`pnpm qa:static`, `node tests/site/scrollbar-parity.e2e.mjs` theo BASE_URL plan;
Chrome DevTools mouse/keyboard/computed-state trên desktop.

### T02 — Native và lock giữ hành vi cuộn

**Description:** hoàn thiện scope document style; kiểm mobile/fallback,
reduced-motion và handoff qua breakpoint/overlay với controller hiện hữu.
**Dependencies:** T01. **Scope:** M, tối đa4 files.
**Files:** cùng source/test T01 và `tests/README.md` để focused command có consumer.

**Acceptance:**

- [x] Mobile/reduced/fail-open không có desktop custom bar hoặc transform-scroll;
  native keyboard/touch dùng được, classic OS scrollbar không bị fake-hide.
- [x] 980↔981, route return và locale giữ một controller/coordinate system;
  menu/viewer khóa background, đóng giữ scroll, menu overflow/focus vẫn dùng được.
- [x] Rail/horizontal/menu styles và content đã accepted không đổi; không sửa
  skeleton, button copy, ảnh hoặc architecture để làm scrollbar pass.

**Verification:** build/static + focused state matrix; menu regression
`node tests/site/menu-reference-parity.e2e.mjs`; diff inspection.

### Checkpoint A — sau T01/T02

- [x] Build/static/focused/menu đều đạt trên đúng correction preview.
- [x] Review boundary và actual LOC;318 source/test LOC, không hạ acceptance hoặc đổi scope ngầm.

### T03 — Kiểm browser và Android thật

**Description:** thu evidence của accepted matrix với browser/channel và
source provenance; Android local trước, Sites sau release riêng.
**Dependencies:** checkpoint A. **Scope:** M, tối đa3 files.
**Files:** focused test nếu cần sửa coverage, scoped verification mới,
`docs/operations/android-real-device-debugging.md` nếu setup facts đổi.

**Acceptance:**

- [x] Browser matrix/VI/EN/route-state đạt hoặc ghi exact failure/open;
  Chrome/Edge channel, Firefox/WebKit và iPhone evidence không bị gọi thay nhau.
- [x] Android A05s thật kiểm correct source8792 qua USB: hai chiều cuộn,
  toolbar, menu và orientation; không override scale hoặc đổi browser flags.
- [x] Evidence có DOM/CSS, input sequence, console/network, ảnh/timestamp,
  browser/device/source hash; timing tách screenshot, iPhone thiếu vẫn open.

**Verification:** `pnpm qa:cross-browser`, focused matrix, Chrome DevTools và
CDP Android thật; raw local linked từ verification report, không commit cache.

[Evidence27/09](../../docs/verification/scrollbar-parity-2026-09-27.md):405 focused case,
menu/build/static đạt; smoke20/21 giữ WebKit skeleton failure. Android native
VI/EN và orientation đã kiểm; visual landscape overlap, headful Firefox appearance,
iPhone/reference drag live giữ open; owner visual scrollbar đã được duyệt sau run.
Check T03 chỉ xác nhận đã kiểm
và ghi đúng scope/failure, không nghiệm thu các gate còn mở.

### T04 — Review và handoff

**Description:** một agent Sol/ultra gộp QA/audit/code review đọc diff/evidence;
main kiểm chứng findings, cập nhật contract/status đúng scope.
**Dependencies:** T03. **Scope:** M, tối đa4 files.
**Files:** brand-shell spec, STATE, verification index, DESIGN khi visual ownership
cần đổi; report T03 là evidence để link, không nhân bản token.

**Acceptance:**

- [x] Một review hợp nhất đã kiểm và findings được giải quyết; requested
  Sol/ultra, effective unknown nếu không có metadata, không spawn reviewer khác.
- [x] Contract/evidence/STATE và authorized Notion item đồng bộ; local links,
  glossary, diff scope và recovery pause hash được kiểm.
- [x] Scoped result nêu những gate còn open; không commit/push/deploy hoặc
  đóng owner visual/full-site/iPhone gate chỉ từ focused tests.

**Verification:** Definition of Done phù hợp, `git diff --check`, local
link/anchor check, impeccable detect scope UI, main diff inspection và preservation check.

Reviewer approve scoped scrollbar implementation, không còn Required finding;
main đã verify packet/hash/raw. T01–T04 technical execution hoàn tất; card riêng
giữ In progress cho iPhone/reference và open gates trong report; owner visual scrollbar
đã đạt27/09. Recovery/P11
vẫn paused, chưa commit/push/deploy. Semantic extraction không chạy.

## Correction baseline và skeleton — phần đã xong

### Gate correction

- [x] Owner duyệt map bổ sung: “Duyệt map bổ sung”.
- [x] Owner duyệt delta lifecycle: “Duyệt delta skeleton”,27/09.
- [x] Owner duyệt plan C00–C0727/09: “Duyệt plan và card Notion”.
- [x] Owner cho phép [card correction](https://app.notion.com/p/3e8332849a0e8121bd20e1f62a275bb7);
  search/fetch schema, tạo và fetch verify hoàn tất.

### C00 — Mang owning random contract vào baseline

**Description:** carry spec accepted từ recovery frozen; đổi link routing/provenance
về map correction, ghi exact original hash. Photo/motion/DESIGN dẫn supersession
random đã accepted; không copy requirement của media/loading hoặc task tree cũ.
**Dependencies:** hai gate correction đã đạt27/09. **Scope:** M,5 Markdown paths theo plan.

**Acceptance:**

- [x] Requirement text/Back fallback clarification khớp frozen spec; các thay đổi
  link/provenance không bỏ pool/history/locale/batch/slideshow hoặc hard gate.
- [x] Supersede đúng reload/order/3s/rhythm; giữ geometry/motion/media/scrollbar
  đã accepted, lifecycle delta chỉ bổ sung phần reset lỗi.
- [x] Preflight inventory/snapshot/hash managed và primary/recovery được lưu;
  recovery66 staged/checkpoint unchanged, không stage/reset/copy whole tree.

**Verification:** semantic diff requirement text, local links/glossary, `git diff --check`,
hash/status trước/sau; source/build không đổi ở C00.

### C01 — Regression random và oracle có nghĩa

**Description:** adapt/reuse đúng random tests từ frozen candidate; bỏ dependency
ngoài scope. Không copy media-specific assertions hoặc coi import error là RED.
**Dependencies:** C00. **Scope:** M,5 test paths theo plan.

**Acceptance:**

- [x] RED behavior có tên trên managed baseline: presentation order/permutation,
  new-visit seed và history/locale/batch persistence; có artifact/source hash.
- [x] Unit độc lập kiểm membership, true ratio, frontier/gap/budget và20 seed;
  giữ fixture0/1/2/3/nhiều,1/10/100 records/extreme ratios; controlled-clock
  slideshow3000ms/fade1600ms/pause behavior, không chỉ source regex.
- [x] Static oracle chỉ cập nhật phần superseded; no-JS/preset/glass/cleanup,
  keyboard/media/taxonomy và assertions ngoài scope vẫn giữ.

**Verification:** unit/static nhóm C01 trong command block plan; ghi expected RED
trước C02 và lỗi ngoài scope riêng, không đổi assertion chỉ để xanh.

### C02 — Core random hoạt động cùng scrollbar

**Description:** selective random hunks trong5 source files của plan; giữ đường
LazySizes/images đang chạy và CSS/controller scrollbar đã nghiệm thu.
**Dependencies:** C01. **Scope:** M,5 source paths.

**Acceptance:**

- [x] Direct/F5 nhận seed mới; All/sáu filter/related/tag đủ pool đúng một lần,
  geometry hard-safe; assignment/band theo seed/slot và frontier real grid.
- [x] Same-seed context ổn định, fallback score/search bounded được ghi;
  slideshow3000ms/fade1600ms và pool9 giữ accepted contract.
- [x] Build/static/core-random unit GREEN trên8792 có source/build/served hash;
  bridge assertion thuộc C03 nếu còn named RED giữ nguyên tới checkpoint B,
  không skip; không import/media/progress/session/back-to-top ngoài allowlist.

**Verification:** `pnpm prepare:site`, `pnpm qa:static`, toàn nhóm unit plan;
ghi exact core GREEN/bridge RED tới C03, không gọi toàn suite PASS;
direct/filter/related local probe và import/consumer diff inspection.

### C03 — Seed history/locale và footer oracle

**Description:** bridge soft navigation/history snapshot trước Barba ở motion/detail;
browser regression dùng input thật và sửa oracle P7.5 theo governing random.
**Dependencies:** C02. **Scope:** M,4 paths theo plan.

**Acceptance:**

- [x] Back/Forward reconstruct document và soft/full locale giữ seed entry;
  handoff/marker đúng URL, dùng một lần; direct/F5/stale/wrong URL không reuse.
- [x] Footer test sửa cả direct→routed visit mới và F5 hash oracle; giữ same-seed
  round-trip/geometry, gap≤1px/final viewport/P7.4 copy/membership/frontier;
  seed mới không đòi cùng absolute hash/tọa độ.
- [x] Accepted scrollbar hunks còn nguyên; native/no-JS/fallback/menu/route
  return không regress, HTML script order detail trước motion được đối chiếu.

**Verification:** build/static, unit nhóm plan, `node tests/site/advertising-random-browse.e2e.mjs`,
`node tests/site/advertising-route-footer-p75.e2e.mjs`; record fault injection
riêng khi ép fallback, không patch click handler hoặc browser history để PASS.

### Checkpoint B — sau C00–C03

- [x] Random+scrollbar chạy trên cùng candidate/hash; build/static/unit/random
  browser/footer đạt; combined reviewer và main kiểm selective composition.
- [x] Known skeleton height/WebGL RED còn được ghi riêng; snapshot B có exact
  paths/hash phục hồi random+scrollbar trước fix, recovery checkpoint unchanged.

### C04 — Visible skeleton giữ node và reveal

**Description:** reconcile common slot tại `renderCtaSkeleton` thay destroy/rebuild
do geometry/hash; cập nhật tail/footer/glass vẫn đầy đủ. Reuse renderer.phase.
**Dependencies:** checkpoint B. **Scope:** M,≤4 source/test paths theo plan.

**Acceptance:**

- [x] Height-only/scroll/footer-CTA RO không thay common visible frame, assignment,
  reveal đang chạy/đã xong hoặc reset phase; RED trên B, GREEN sau patch.
- [x] Full exit/reentry arm một entry600ms; width/columns/orientation reconcile
  common slot, thêm/bỏ slot cần; không freeze geometry hoặc mount observer lại để PASS.
- [x] Same-context pause/reduced/overlay khác actual teardown/new pool/history;
  frontier/ratio/coverage/gap/glass/endpoint và existing Flow chất lượng giữ nguyên.

**Verification:** build/static/unit; lifecycle browser test trên Chromium/Firefox/WebKit;
continuation/footer tests và DevTools computed DOM trên cùng candidate.

### C05 — WebGL allocation và cleanup ổn định

**Description:** eligible/visible allocation, phase-preserving resource handoff
và guarded destroy/restore ở ownership catalog/renderer; không thêm pool layer.
**Dependencies:** C04. **Scope:** M,≤4 paths theo plan.

**Acceptance:**

- [x] Phone portrait/landscape kể cả838px và canvas transition có≤2 LIVE context;
  hidden/reduced/detail có0 running; desktop không allocate offscreen toàn batch.
- [x] destroy idempotent/already-lost guard; lost fallback đầy đủ, restored resources
  hợp lệ; outer frame/reveal/assignment/phase giữ khi canvas resource đổi.
- [x] Ledger allocation/release/loss/generation20 remount/filter/resize không tăng
  settled live count; không context pressure/INVALID_OPERATION/uncaught mới.

**Verification:** unit lost/restore/double destroy; lifecycle browser test/ledger
3 engines, cross-browser smoke cùng build; không lọc console hoặc giả context cap.

### Checkpoint C — sau C04/C05

**Hiện trạng27/09: checkpoint C focused GREEN, main/combined review Required0.**
Unit60/60, random19 cases/footer6, lifecycle3 engines20/20 và clean80 transitions
zero-error đạt. Android native BFCache/hidden đạt trên final build. Lịch sử
C05 RED giữ riêng, không bị xóa. Acceptance matrix C06 chưa chạy xong;
không suy focused C05R proof thành C06/C07 hoặc browser parity PASS.

[Amendment C05R accepted](../plan.md#amendment-c05r--accepted-2026-09-27) mở ngoại lệ
context reuse có giới hạn; owning delta và plan đã được owner duyệt27/09
bằng “Duyệt delta và plan C05R”. Prototype response-injection40 cycles không
sửa source. Implementation C05R mới có native ownership và lifecycle proof;
checkpoint C giữ preservation snapshot/raw; RED rollback pointer không đổi.

- [x] Named RED→GREEN và ledger chứng minh cả remount lẫn WebGL fix, không chỉ guard log.
- [x] Random/scrollbar/tail/glass hard gates vẫn đạt; main/reviewer kiểm patch,
  source/build/served provenance và preservation trước physical matrix.

## Lịch sử checklist Codex

Checklist Codex của checkout chính, nhập ngày 2026-10-03.

- [x] Task 19: Khóa regression RED cho ancestor opacity, one-shot fade và media
  error theo [plan](plan.md#task-19-khóa-regression-red-cho-gallery-ancestor-và-media-error).
- [x] Task 20: Sửa shared gallery markup và scoped media-error lifecycle theo
  [plan](plan.md#task-20-sửa-shared-gallery-media-lifecycle).
- [x] Checkpoint 8: Focused tests green và boundary không lan sang trang cha hoặc
  route dịch vụ.
- [x] Task 21: Chạy runtime QA, review và đồng bộ live evidence theo
  [plan](plan.md#task-21-runtime-qa-review-và-live-evidence).
- [ ] Human acceptance: owner spot-check một route VI và một route EN.

### Sáu composition và đủ `109` media

- [x] Task 22: Khóa RED cho sáu composition và media partition theo
  [plan](plan.md#task-22-khóa-red-cho-sáu-composition-và-media-partition).
- [x] Task 23: Triển khai sáu config cùng shared block renderer theo
  [plan](plan.md#task-23-triển-khai-config-và-shared-block-renderer).
- [x] Task 24: Hoàn thiện responsive composition và focused browser regression
  theo [plan](plan.md#task-24-hoàn-thiện-responsive-composition-và-browser-regression).
- [x] Checkpoint 9: Shared family, media partition và route boundary green.
- [x] Task 25: Chạy three-way QA, review và đồng bộ live evidence theo
  [plan](plan.md#task-25-three-way-qa-review-và-live-evidence).
- [x] Human gate: owner duyệt plan trước Task 22.

### Carousel ngang cho mọi block gallery

- [x] Human gate spec: owner duyệt delta carousel và ngoại lệ ảnh siêu rộng.
- [x] Human gate plan: owner duyệt Task 26–29 trước source edit.
- [x] Task 26: Khóa RED cho carousel, fallback và box integrity theo
  [plan](plan.md#task-26-khóa-regression-red-cho-carousel-fallback-và-box-integrity).
- [x] Task 27: Pin Swiper và chuyển shared gallery sang progressive markup theo
  [plan](plan.md#task-27-pin-swiper-và-chuyển-gallery-sang-progressive-carousel-markup).
- [x] Task 28: Triển khai scoped lifecycle, geometry và interaction theo
  [plan](plan.md#task-28-triển-khai-scoped-lifecycle-responsive-geometry-và-interaction).
- [x] Checkpoint 10: Sáu route VI/EN, fallback và route boundary green.
- [x] Task 29: Three-way QA, review và live evidence theo
  [plan](plan.md#task-29-three-way-qa-review-và-đồng-bộ-live-evidence).
- [ ] Human acceptance: owner spot-check một route VI và một route EN.

## Chú thích thuật ngữ

- **Baseline**: source trước fix, dùng để chứng minh regression assertion.
- **Consumer**: command/document hoặc flow thật sự dùng test đó.
- **Channel**: bản browser cụ thể được chạy, ngoài tên engine.
- **Handoff**: bàn giao implementation, evidence và gate còn mở.
- **Stable stage**: vùng layout ảnh giữ kích thước khi browser toolbar đổi vùng nhìn.
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
