# Checklist scrollbar parity

Nguồn requirement: [delta accepted27/09](../docs/specs/frontend-brand-shell-responsive-runtime.md#scrollbar-parity--2026-09-27).
[Plan](plan.md) sở hữu approach, scope, matrix và risk. Checklist này phục vụ
execution trong checkout riêng; không thay Notion priority/status.

## Gate đầu vào

- [x] Owner duyệt capability map: “Duyệt map như đề xuất”.
- [x] Owner duyệt delta scrollbar: “Duyệt delta scrollbar”.
- [x] Owner duyệt plan này: “Duyệt plan và card Notion”,27/09.
- [x] Owner cho phép tạo/link work item correction riêng cho estimate200–320 LOC;
  search/fetch parent/schema trước write, giữ recovery card paused.

## T01 — Desktop overlay giữ shell liền mạch

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

## T02 — Native và lock giữ hành vi cuộn

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

## Checkpoint A — sau T01/T02

- [x] Build/static/focused/menu đều đạt trên đúng correction preview.
- [x] Review boundary và actual LOC;318 source/test LOC, không hạ acceptance hoặc đổi scope ngầm.

## T03 — Kiểm browser và Android thật

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

[Evidence27/09](../docs/verification/scrollbar-parity-2026-09-27.md):405 focused case,
menu/build/static đạt; smoke20/21 giữ WebKit skeleton failure. Android native
VI/EN và orientation đã kiểm; visual landscape overlap, headful Firefox appearance,
iPhone/reference drag live giữ open; owner visual scrollbar đã được duyệt sau run.
Check T03 chỉ xác nhận đã kiểm
và ghi đúng scope/failure, không nghiệm thu các gate còn mở.

## T04 — Review và handoff

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

## Correction baseline và skeleton

[Plan bổ sung](plan.md#correction-baseline-và-skeleton--plan-chờ-duyệt) sở hữu
composition, exact source provenance, estimate/matrix và rollback. C00–C07
là phần mới của cùng initiative; T01–T04 và evidence scrollbar giữ nguyên.
Owner nghiệm thu visual scrollbar27/09; iPhone/reference riêng còn open.

[Correction evidence](../docs/verification/mobile-skeleton-correction-2026-09-27.md)
ghi random/Android functional và WebKit C05 RED. Checkbox matrix/acceptance
giữ mở khi chưa đủ gate; không dùng prototype thay source fix.

Current C06U A/deck12 đã duyệt và implementation có scoped evidence:
Android dọc/ngang1366common pairs0reset, clean80/lifecycle3engines/scrollbar405/
smoke21/21 đạt. Full continuation FAIL fresh reduced reload→no-preference;
bounded3 scenes0renderer trong khoảng1s, nguyên nhân resume chưa rõ. MCP UI QA
blocked; C06/C07 chưa hoàn tất. C02–C05 check theo focused proof, không thay
current whole-suite/human/device gates hoặc xóa lịch sử RED.

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

[Amendment C05R accepted](plan.md#amendment-c05r--accepted-2026-09-27) mở ngoại lệ
context reuse có giới hạn; owning delta và plan đã được owner duyệt27/09
bằng “Duyệt delta và plan C05R”. Prototype response-injection40 cycles không
sửa source. Implementation C05R mới có native ownership và lifecycle proof;
checkpoint C giữ preservation snapshot/raw; RED rollback pointer không đổi.

- [x] Named RED→GREEN và ledger chứng minh cả remount lẫn WebGL fix, không chỉ guard log.
- [x] Random/scrollbar/tail/glass hard gates vẫn đạt; main/reviewer kiểm patch,
  source/build/served provenance và preservation trước physical matrix.

### C06 — Matrix và Android Chrome thật

**Description:** focused matrix và real-device footer↔grid trên cùng candidate;
report sở hữu commands/device/hash/results/limitations, owning spec link evidence.
**Dependencies:** checkpoint C. **Scope:** M,4 paths theo plan, gồm existing
continuation runner để bổ sung desktop perf assertion; không runtime code mới.
Failure cần source fix quay về owning slice và retest đúng phần.

**Acceptance:**

- [ ] Unit/static/continuation/footer/random/lifecycle/scrollbar/menu/smoke thực chạy
  theo plan, engines/versions recorded; console/network/overflow/focus/reduced kiểm đủ.
- [x] Android native touch≥3 chu kỳ footer↔grid, toolbar expanded/collapsed,
  portrait/landscape: stable visible slot,≤2 live contexts, DOM/CSS/console/network/PNG.
- [x] Desktop R4 tại1569×912/CTA visible5s≥30fps, không loop long task>50ms;
  mobile R10 ba lượt5s median≥30fps/không>50ms/≤2live. Probe tách capture,
  API thiếu ghi open; iPhone/A54 physical/landscape chưa đạt giữ gate riêng.

R4/R10 check chỉ profile native Chrome GPU trong raw current run, không full
continuation PASS hoặc physical A54. Software-headless FPS failure còn giữ.
Current continuation timeout tại ready62 sau fresh reduced reload/no-preference;
MCP timeout chưa có inspection PASS. Acceptance matrix đầy đủ còn unchecked.

**Verification:** command block/matrix plan, Chrome DevTools local và Android guide;
`impeccable detect` sau UI complete, raw ignored evidence có hashes và linked report.

### C07 — Một review hợp nhất và handoff

**Description:** main kiểm claims của cùng agent Sol/ultra QA/audit/review;
ghi state/links/gates đúng source, đưa owner cùng preview8792 để spot-check.
**Dependencies:** C06. **Scope:** M,5 Markdown records theo plan.

**Acceptance:**

- [ ] Required findings xử lý và main kiểm diff/tests/provenance; actual LOC,
  requested/observed route và semantic pending được ghi đúng, không full parity claim.
- [x] Owning docs/STATE/indices/checklist và authorized card link đúng evidence;
  primary/recovery/checkpoint preserved, local links/glossary/diff-check đạt.
- [x] Local technical result và owner/iPhone/performance/reference gates phân biệt;
  recovery/P11 paused, không commit/push/deploy, landscape/nút chưa bị mở code.

Handoff này là checkpoint partial: source/fixture scoped review Required0,
nhưng full continuation fresh reduced resume chưa rõ nguyên nhân và MCP UI QA
blocked. Required/current matrix gate đầu tiên chưa check; owner/device gates
giữ riêng. Không ghi C07 complete hoặc full parity PASS.

**Verification:** DoD theo scope, main diff inspection, combined review packet,
source/status/checkpoint hashes, docs link check; owner visual spot-check là gate riêng.

<a id="mobile-viewport-stability--v00v05"></a>

## Mobile viewport stability — V00–V05

[Plan viewport](plan.md#mobile-viewport-stability--plan-chờ-duyệt) sở hữu approach,
ownership≤5 files/task, commands, matrix, estimate và rollback. Đây extension
cùng initiative đã duyệt; checklist C06/C07 cùng historical FAIL giữ nguyên.

### Gate viewport

- [x] Owner duyệt intent/map toàn website: “Duyệt map và thứ tự đề xuất”.
- [x] Owner duyệt delta viewport27/09: “Duyệt delta viewport”.
- [x] Owner duyệt plan V00–V05: “Duyệt plan và card viewport (đề xuất)”.
- [x] Owner cho phép tạo/link card Notion viewport riêng cho estimate600–900LOC;
  search/fetch schema/parent/project trước write.

### V00 — Baseline và oracle viewport

**Description:** tạo focused runner3 engines và Android recorder opt-in;
capture immutable baseline trước source fix, chứng minh failure đúng behavior.
**Dependencies:** plan/tracking gate. **Scope:** M,3 files theo plan;35–50 phút.

**Acceptance:**

- [x] Contract probe captured layout/visible pairs fail vì dynamic geometry/refit
  trên baseline; true layout resize vẫn reflow. Không gọi fixture là native toolbar.
- [x] Native local baseline có layout/visible metrics, bbox, console/network/HTTP,
  source/device/version và timestamp PNG; unknown/missing physical gate ghi riêng.
- [x] Snapshot/status/hash exact owned paths giữ random/scrollbar/skeleton và
  C06U/C05R/pause pointers nguyên vẹn; new paths chưa overwrite unrelated file.

**Verification:** runner `--phase baseline`, USB recorder `--phase baseline` theo
command plan; main kiểm named RED và raw, ghi baseline lỗi riêng không suppress.

### V01 — Shared layout metrics

**Description:** shared CSS stable height và một inert measurement probe;
optional metrics getter trên scroll bridge hiện hữu, reuse RAF/lifecycle.
**Dependencies:** V00. **Scope:** M,4 files theo plan;40–60 phút.

**Acceptance:**

- [x] CSS/JS layout metrics cùng resolved CSS px; toolbar không đổi layout basis,
  true height/width/rotation đổi vẫn resolve mới; fallback hữu hạn, không polling.
- [ ] Bridge get/set/lock/unlock vẫn tương thích; đúng một probe/listener owner qua
  mount/soft route/locale/BFCache, native zoom/keyboard và visibility vẫn hoạt động.
- [x] Shared template geometry/focus/native/reduced/fail-open đạt focused shell
  checks; không đổi scroll mode, breakpoint/content hoặc accepted footer tokens.

**Verification:** build/static và shell portion viewport runner; computed CSS/JS,
desktop height-only resize, mount/return cleanup; main diff inspection.

V01 technical metrics/fallback/singleton/native pinch đã có proof. AC thứ hai
giữ open vì chưa có native keyboard và physical iPhone/A54 evidence; fixture
focus/visible rect không đóng gate này.

### Checkpoint V-A — sau V00/V01

- [x] Named baseline RED giữ raw; shell GREEN trên đúng build/source/served hashes.
- [ ] Main kiểm provider/fallback/provenance, snapshot V-A và boundary trước V02.

V-A không lưu source snapshot riêng tại thời điểm slice: đây deviation của
plan, không dựng lại lịch sử. Baseline/V-B/final exact bytes giữ rollback;
named RED/shell GREEN và provenance vẫn còn.

### V02 — Advertising geometry ổn định

**Description:** related packing/key, morph viewport snapshot và CTA tail dùng
stable basis; visible-only vẫn cập nhật window/cleanup mà không re-pack.
**Dependencies:** V-A. **Scope:** M,4 files theo plan;35–50 phút.

**Acceptance:**

- [x] Cùng stable metrics/content giữ card/ảnh/description/related/CTA bbox≤1px,
  layout key/pagination; toolbar không cancel/replay morph hoặc script scroll.
- [x] True layout resize/font/text zoom reflow đúng; filter/photo/tag/history/seed,
  common skeleton node/deck/preset/reveal/context≤2 và actual visibility giữ.
- [x] Khoảng CTA–footer giữ giá trị hiện hành, sai lệch≤1 CSS px; final stable
  viewport và shared top-gap48/64px đạt; amendment
  footer oracle chỉ phần delta supersede, giữ mọi assertion ngoài scope.

**Verification:** build/static/unit + Advertising portion viewport runner,
random/footer/lifecycle focused regression trên cùng candidate; no full continuation.

### V03 — Viewer stable image stage

**Description:** fit/cover/pan theo stable stage; backdrop/controls phản ánh
visible rect/safe area, phân biệt toolbar event với true geometry invalidation.
**Dependencies:** V02. **Scope:** M,4 files theo plan;35–50 phút.

**Acceptance:**

- [x] Toolbar-only giữ fitted image bbox/scale/pan/state, không cancel opening/
  closing hoặc reset zoom; true layout resize reconcile đúng orientation.
- [ ] Close/zoom/reset controls trong visible rect, focus/keyboard/native zoom vẫn
  tiếp cận; backdrop phủ đủ vùng nhìn, không che control bằng toolbar/safe area.
- [x] Existing zoom/wheel/drag/open-close/focus/scroll-lock và cleanup giữ behavior;
  pinch mới, morph/blur timing và history animation chưa sửa trong slice này.

**Verification:** build/static, viewer portion viewport runner, overlay lock/focus,
resize interruption và physical trace; missing hardware gate không check thay.

V03 controls/fit/animation đạt fixture và USB A05s, native page pinch được ghi;
AC controls giữ open cho safe-area/native keyboard/iPhone/A54 chưa kiểm.

### Checkpoint V-B — sau V02/V03

- [x] Focused geometry/regressions GREEN, main kiểm source/build/served cùng build.
- [x] Snapshot V-B giữ owned hunks và proof; failures ngoài scope không bị xóa.

### V04 — Matrix và native toolbar

**Description:** chạy22 entrypoints VI/EN,3 engines dọc/ngang và state matrix;
thu Android thật và iPhone khi có device, report kết quả đúng scope.
**Dependencies:** V-B. **Scope:** M,5 files theo plan;60–90 phút chưa tính waiting.

**Acceptance:**

- [x]22 entrypoints/state matrix thực chạy; true resize,200% text zoom, reduced/fallback,
  history/locale/focus/cleanup đạt hoặc named failure, không suppress errors/skip engines.
- [ ] Android native≥3 toolbar cycles mỗi chiều dọc/ngang theo plan, direct/reload
  cả toolbar states; DOM/CSS/events/network/PNG chứng minh≤1px trên exact candidate.
- [x] Report tách A05s/A54/iPhone/fixture, recorded sources/versions/hash/limits;
  Safari/iPhone/A54 physical còn thiếu giữ open, không suy full-site PASS.

**Verification:** final viewport runner/USB recorder và regression command block
plan một lần; MCP blocked ghi riêng. `impeccable detect` sau UI hoàn tất; links/raw manifest.

V04 final132 geometry cases đạt,9 named EN text-size failures giữ exit1.
USB A05s dọc/ngang14 entries×3 actual cycles mỗi chiều đạt≤1px,0errors;
portrait2318samples gồm raw incomplete giữ13 valid cycles và capture tiếp2EN
states. AC native/direct/reload giữ open: Chrome tự mở toolbar sau navigation,
chưa chứng minh document khởi tạo collapsed; iPhone/A54 còn missing.

### V05 — Review và handoff viewport

**Description:** cùng reviewer Sol/ultra gộp QA/audit/code review; main kiểm
findings/evidence, cập nhật owning docs/STATE/tracking, handoff local8792.
**Dependencies:** V04. **Scope:** M,5 Markdown paths theo plan;20–30 phút.

**Acceptance:**

- [x] Required findings giải quyết, main verify diff/provenance/actual LOC và DoD;
  requested Sol/ultra, effective unknown nếu không có metadata, không reviewer mới.
- [x] Owning spec/STATE/index/checklists/authorized card khớp evidence, local links/
  glossary/diff-check đạt, checkpoint/recovery/unrelated changes giữ nguyên.
- [x] Handoff nêu local proof và physical/owner gates còn mở; không tự check missing
  gate, resume recovery/P11/full continuation hoặc commit/push/deploy.

**Verification:** main diff inspection, combined review packet, source/status/hash,
`git diff --check`, local link/anchor check, DoD phù hợp; owner/device acceptance riêng.

### Checkpoint V-C — sau V04/V05

- [x] Immutable final snapshot/proofs và đúng scope review/technical acceptance.
- [x] Physical/owner gates chưa đạt vẫn open; next module phải có delta/plan riêng.

V05/V-C là scoped technical handoff partial, không check các AC còn missing
ở V01/V03/V04. [Report viewport](../docs/verification/mobile-viewport-stability-2026-09-27.md)
giữ exact snapshot/pointers, Required0 source/evidence review,605LOC và named
gates. Recovery/P11/full continuation/deploy giữ paused; layout delta mới
cần owner duyệt spec và plan trước code.


<a id="site-mobile-layout-parity--l00l07"></a>

## Site mobile layout parity — L00–L07

[Plan layout](plan.md#site-mobile-layout-parity--plan-chờ-duyệt) giữ architecture,
ownership≤5 files/task, commands, matrix660cases, estimate và rollback.
Đây extension cùng initiative đã duyệt; giữ nguyên incomplete tasks/history
C/V và plan recovery. Plan/card đã duyệt28/09; L00 bắt đầu baseline.

### Gate layout

- [x] Owner duyệt intent/map toàn website và thứ tự viewport→layout→viewer→history→glass.
- [x] Owner duyệt delta layout28/09 bằng “Duyệt delta layout (đề xuất)”.
- [x] Owner duyệt plan L00–L07 bằng “Duyệt plan và card layout (đề xuất)”.
- [x] Owner cho tạo/dùng lại card riêng “Layout mobile toàn website — browser parity”
  cho estimate550–850LOC; search/fetch schema/project trước write.

### L00 — Baseline và oracle layout

**Description:** lưu pre-layout source/status/hash/proofs và viết focused
runner tái hiện actual overlap/paint clipping/text overflow; không source fix.
**Dependencies:** plan/card gate. **Scope:** M,3files theo plan;35–50phút.

**Acceptance:**

- [ ] Exact candidate provenance/source/served, old V-C/C06U/pause và primary/
  recovery được preserve; baseline raw/snapshot immutable riêng, không retag history.
- [ ] Named RED VI/EN Advertising low landscape và9 EN200% failures tái hiện
  trên3engines, actual offending node/rect/paint captured; timeouts không làm RED oracle.
- [ ] Runner ghi route/destination/font/layout/visible/state/version/error/PNG,
  normal/reduced/fallback readiness có predicate và deadline; không disable motion
  hay inject runtime/CSS fix để tạo pass.

**Verification:** build từ source, baseline layout runner; paired stable samples/
screenshots và immutable manifest; main kiểm RED với raw source/copy thật.

### L01 — Hero Advertising trên màn hình thấp

**Description:** sửa responsible CSS/DOM geometry để header/title/filter không
chồng nhau; hero chứa đủ nội dung theo stable layout basis.
**Dependencies:** L00. **Scope:** M,≤5files theo plan;40–55phút.

**Acceptance:**

- [ ] VI/EN Advertising All/6categories sau settle, scroll đầu trang:
  header/title/filter không giao/che paint tại5viewport×100/200%text size.
- [ ] Toolbar-only geometry≤1px; actual orientation/width resize vẫn reflow;
  baseline portrait/desktop composition đã đạt giữ đúng accepted contract.
- [ ] Copy/brand/filter accessibility, grid entry, random/deck/common/reveal/
  context≤2/scrollbar và CTA/footer48/64 không đổi; không motion/glass/pinch mới.

**Verification:** layout runner advertising3engines, viewport advertising/visibility,
build/static và random/footer focused; reference same viewport/owner gate riêng.

### L02 — Residential và Commercial text size

**Description:** sửa responsible responsive fit/wrap/spacing, để full VI/EN
copy vẫn đọc được tại200%; không thay chữ hoặc ép font nhỏ che failure.
**Dependencies:** L01. **Scope:** M,≤5files theo plan;25–40phút.

**Acceptance:**

- [ ] Sáu inherited EN200% failures của Residential/Commercial GREEN3engines;
  document overflow≤1px và toàn title/body/control paint trong component phù hợp.
- [ ] Portrait/landscape VI/EN100/200% không initial overlap/cut/mask chữ;
  text tăng thực đo32px root, semantic reading order/brand copy giữ.
- [ ] True reflow và locale/route return/focus giữ behavior; default desktop
  typography/motion/copy/media không đổi ngoài measured responsive geometry.

**Verification:** scoped layout runner residential-commercial, viewport states
affected routes và build/static; main paired pre/post PNG/rect/source inspection.

### Checkpoint L-A — sau L00–L02

- [ ] Baseline RED và Advertising/Residential/Commercial GREEN trên3engines,
  required static/viewport/random/footer assertions giữ, same candidate hashes.
- [ ] Main kiểm snapshot source/owned hunks/raw, peer findings và preservation;
  thiếu owner/reference/device giữ open, không nghiệm thu từ screenshot đơn.

### L03 — Home, About và shared heading

**Description:** kiểm toàn route Home/About, sửa evidence-backed responsive
geometry/overflow; shared CSS chỉ thay nơi responsible.
**Dependencies:** L-A. **Scope:** M,≤5files theo plan;25–40phút.

**Acceptance:**

- [ ] Ba inherited EN About200% failures GREEN3engines; Home/About VI/EN
  toàn copy/controls tiếp cận, document overflow≤1px trên5viewports/text sizes.
- [ ] Hero/header/content/heading/body/footer không initial overlap hoặc clipping
  paint; new failure phải RED trước fix, không giả định Home lỗi giống About.
- [ ] Shared stable metrics/token/desktop composition/menu/footer/copy/media giữ;
  sibling Advertising/Residential/Commercial không regression vì shared CSS.

**Verification:** scoped layout runner home-about3engines, affected state cases,
build/static và checkpoint L-A geometry subset sau shared edit.

### L04 — Layout qua các state tương tác

**Description:** kiểm và sửa CSS geometry khi filter/photo/tag/related/menu/
viewer/route history/locale đổi state; không đổi animation intent.
**Dependencies:** L03. **Scope:** M,≤5files theo plan;30–45phút.

**Acceptance:**

- [ ] Advertising All/6category/photo/tag/related/viewer và10shared routes VI/EN
  menu open/closed/direct/reload/locale/Back/Forward không overlap/cut/overflow.
- [ ] Native/reduced/shell-unavailable, true breakpoint680/750/980/981 và
  actual orientation resize giữ focus, scroll/context và visible controls.
- [ ] Random/history/common/deck/context≤2, stable viewer fit/pan/cleanup,
  scrollbar/CTA/footer giữ; runtime fix ngoài listed geometry ownership quay plan
  amendment trước edit, không âm thầm mở gesture/history/glass module.

**Verification:** layout runner states, viewport viewer/fallback/visibility,
menu focus and geometry; console/page/network assertions không suppress.

### L05 — Matrix và regression cuối

**Description:** chạy660 layout cases cùng state subset và bounded regressions
trên exact candidate, phân biệt runtime/fixture/reference/hardware evidence.
**Dependencies:** L04. **Scope:** M,5files theo plan;45–65phút.

**Acceptance:**

- [x]22entrypoints×5viewports×100/200%text×3engines thực chạy660cases;
  URL đích/route states/font/predicate/version/provenance recorded,
  document overflow≤1px và initial overlap/paint clipping không còn.
- [x] All9 inherited EN text-size failures GREEN; viewport/random/footer/
  lifecycle/scrollbar/menu/unit/static/smoke required checks giữ trên candidate
  tương ứng; failures giữ named, không skip/suppress hoặc dừng matrix sớm.
- [ ] Report và owning contract ghi actual scope/LOC/hash/errors/limits;
  Impeccable findings owned/baseline tách rõ; missing MCP/reference/owner/physical
  không được check thay bằng engine PASS.

**Verification:** final commands trong plan một lần, targeted rerun khi source
finding/new change; no expensive continuation/Espacio/recovery/P11.

### Checkpoint L-B — sau L03–L05

- [x] Matrix/state/regression đủ proof cùng candidate,9 named failures resolved;
  nếu còn owned overlap/overflow thì acceptance open và quay owning slice.
- [x] Snapshot/source/build/served/raw hashes và main diff inspection giữ;
  source freeze trước native capture, không retag evidence candidate cũ.

### L06 — Layout trên Android thật

Tiến độ28/09: portrait A05s đạt16entry/48toolbar cycles,216layout observations,
629common geometry pairs≤1px,0fault/provenance; summary
`.tmp/mobile-layout-parity/l06-portrait-green-summary.json`. Recorder oracle
RED→GREEN giữ raw riêng,4/4 guard probes đạt. Portrait scoped GREEN; chưa L07/L-C.
Owner đã xoay ngang và recorder ghi đủ16entry/48actual cycles,216layout
observations;132toolbar pairs/574common node pairs≤1px,0geometry fault.
Landscape raw **incomplete**:2EN `viewer-after-touch` đóng viewer và jsDelivr
Locomotive Scroll `net::ERR_CONNECTION_CLOSED`. Summary
`.tmp/mobile-layout-parity/l06-landscape-red-summary-2026-09-28T04-59-43-211Z.json`;
[evidence](../docs/verification/mobile-layout-parity-2026-09-28.md#l06-landscape-red).
Không check L06/L07/L-C; cần phân loại gesture target và network trước capture
bổ sung, giữ raw RED bất biến.

**Description:** thêm observation header/title/filter/text bounds vào recorder
hiện hữu, ghi native orientations/toolbar/zoom/controls cùng candidate.
**Dependencies:** L-B. **Scope:** M,5files theo plan;45–70phút chưa tính waiting.

**Acceptance:**

- [ ] ADB/forward/package/UA/task-tab identity guarded;10canonical routes VI/EN
  và Advertising state subset dọc/ngang,≥3actual toolbar cycles mỗi state;
  geometry≤1px và không initial overlap/paint clipping, console/network/PNG đầy đủ.
- [ ] Actual rotation/page zoom/offset/pan/visible controls/native touch có log,
  direct/reload toolbar before/after measured; hidden/timeout raw incomplete giữ,
  capture thiếu riêng cùng hash, không gọi auto-expanded document là collapsed-init.
- [ ] Model/version/source/runner hashes và coverage recorded; owner đã đính
  chính target Android A05s28/09. iPhone Safari/safe-area/native accessibility/keyboard cần evidence
  thiết bị thật; thiếu giữ physical gate open, không suy full-site PASS.

**Verification:** opt-in USB recorder `--routes` tường minh, raw metrics/DOM/CSS/
console/network/PNG; actual device nếu có, owner rotation khi tool không làm được.

### L07 — Review và handoff layout

**Description:** cùng reviewer Sol/ultra gộp QA/audit/review; main kiểm findings,
proofs/docs/preservation trước cập nhật authorized tracking và preview handoff.
**Dependencies:** L06. **Scope:** M,5Markdownfiles theo plan;20–30phút.

**Acceptance:**

- [ ] Required findings resolved và main kiểm source/diff/actual LOC/candidate
  proof/DoD; requested/effective route recorded, không reviewer/persona mới.
- [ ] Owning docs/STATE/map/checklist/card đúng evidence, links/anchors/glossary/
  diff-check đạt; primary/recovery/old snapshots/pause pointers không đổi.
- [ ] Handoff tách local scoped technical result/owner/physical/MCP/reference/
  full-site gates; recovery/P11/full continuation paused, không commit/push/deploy
  hoặc tự mở viewer/history/glass trước spec/plan riêng.

**Verification:** combined review + main exact source/status/hash/raw inspection,
authorized Notion fetch verification sau Git updates, owner visual riêng.

### Checkpoint L-C — sau L06/L07

- [ ] Immutable source/test/docs +proof manifest và riêng layout-current pointer;
  main verify bytes/hash và required review scope, không overwrite old pointers.
- [ ] Local result và gate còn missing ghi đúng; new module giữ owner spec/plan
  gate, không gọi scoped660cases/A05s PASS là full browser/site parity.

### L04R — minimum chữ/control Advertising đã duyệt28/09

- [ ] L04R1: minimum CTA/info/pager/image-controls sửa named200% RED; optional
  pure API giữ default, unit compatibility và short portrait/landscape đạt.
- [ ] L04R2:100/200% VI/EN3engines đọc đủ pages, không clipping/overflow;
  giữ random/common/deck/context≤2, footer48/64, toolbar geometry và query/focus.
- [ ] Final660/state/regressions, L-B, A05sUSB, L07review/L-C tiếp tục theo plan;
  iPhone/reference/MCP/owner còn missing không được check thay.

### L04H — About Back/Forward, plan đã duyệt

- [x] Owner duyệt [delta L04H](../docs/specs/frontend-brand-shell-responsive-runtime.md#l04h-about-route-history--draft-2026-09-28)
  bằng “Duyệt delta L04H”; immutable WebKit RED và shell map đã lưu.
- [x] Owner duyệt [plan L04H](plan.md#l04h-about-route-history--plan-draft-2026-09-28)
  bằng “Duyệt plan L04H” trước khi sửa `src/site/motion.js`.
- [x] L04H0: xác nhận raw shell map/source/served hash, giữ named WebKit RED
  `l04h-red-stage-2026-09-28T00-47-52-020Z` riêng; không retag lịch sử.
- [x] L04H1: focused VI/EN × bốn biên hai chiều × portrait/landscape ×
  3engines click→Back→Forward; fresh history baseline, one native
  navigation/entry và stable destination qua self-reload window. Full run
  126 records gồm30 soft/query controls đạt,0fault/provenance.
- [x] L04H2: guard click trước Barba push, build và focused GREEN; control
  Home→Residential/Residential→Commercial vẫn soft Barba, query/photo history
  và source/served proof.
- [x] L04H3: owner mở lại28/09, preflight SHA khớp; matrix660/660 tái sử dụng,
  body210/210 rerun hoàn chỉnh,24 Advertising state combinations và30history/
  30breakpoints trên3engines đạt,0fault/provenance; regressions9/9 và unit57 đạt.
  Manifest `l04h-resume-body210-summary.json`, `l04h-resume-state-summary.json`
  giữ raw/SHA. Ba raw cũ vẫn **incomplete**, không retag. L06 A05s/L07 còn mở.
  Recovery/P11 vẫn paused; không commit/push/deploy.

### H00–H03 — Advertising history motion, plan đã duyệt

- [x] Owner duyệt [delta 13](../docs/specs/advertising-photo-morph-scroll.md#advertising-history-motion--accepted-2026-09-28)
  ngày 28/09 bằng “duyệt”: scroll riêng mỗi entry, morph đúng card/primary
  hai chiều kể cả offscreen, không tự cuộn thêm; giữ `400ms`.
- [x] Owner duyệt [plan H00–H03](plan.md#advertising-history-motion--plan-draft-2026-09-28)
  ngày 28/09 bằng “duyệt”; điều phối L06 source freeze trước H00/build, không nhập RED viewer/CDN
  vào history gate.
- [x] H00 đã chạy named case trên candidate `8792`; source/build/served hash,
  frame/paint/video, scroll/photo-ID/rect/console/network nằm trong thư mục
  timestamp mới. [Report H00](../docs/verification/advertising-history-motion-2026-09-28.md)
  ghi EN/VI desktop PASS, không có product RED; dừng source fix.
- [ ] H00 named RED để mở H01: chưa đạt trên `8792`; tab owner `8790` khác
  source và chưa quan sát được. Không gắn PASS của candidate thành lỗi đã hết.
- [ ] H01: cần rescope oracle theo supersession M02b 30/09; H00 vẫn là
  evidence lịch sử. Contract đã bỏ card grid/related↔primary morph, kể cả
  detail A→B qua related và Back/Forward; `400ms` cho clone này không còn là
  yêu cầu. Giữ scroll/media từng entry và primary↔enlarged viewer morph. M02b
  có phần history/scroll, hiện được owner mở lại nhưng chưa nghiệm thu; không
  gọi H01 done.
- [ ] H02–H03: clear `CASE` và hai `PHOTO_TRANSITIONS_P13_*` flags trước full
  19-case runner; VI/EN desktop/mobile-width, seed/category/tag/locale,
  Back/Forward/reduced/slow/rapid và detail↔detail. Chạy return-P74,
  random-browse nếu seed branch đổi, footer-P75 nếu adapter/limit đổi;
  diff/review/docs/checkpoint, owner visual còn mở; giữ L06/L07 RED và
  recovery `8790` unverified.

### M00–M09 — media-card toàn website, plan đã duyệt

- **Scope thực thi tạm thời, owner xác nhận 03/10:** Chỉ tiếp tục M02b trên
  `advertising-products` và route con. M03–M05 Home/Residential/Commercial/
  About cùng M08–M09 QA/closure toàn website PAUSED đến khi owner chỉ đạo mở
  lại; giữ nguyên spec/plan và checkbox chưa hoàn tất. M06/M07 chưa mở;
  M06a toàn gói vẫn phụ thuộc M03–M05. Xong gói M02b lưu checkpoint rồi dừng.
  Main theo dõi quota chung 5 giờ: dưới 10% còn lại thì wrap-up và tạo
  Claude AI handoff. Notion card live update pending vì connector không
  callable; không coi xác minh lịch sử ngày 30/09 là trạng thái live.
- [x] Owner duyệt [spec media-card toàn website](../docs/specs/site-media-card-playback.md)
  ngày 28/09; vùng A40% và fallback không autoplay đã chốt sau prototype.
  Byte budget/preload margin và các edge case còn chờ clip thật, trace/case.
- [x] Owner duyệt [plan M00–M09](plan.md#site-media-card-playback--plan-draft-2026-09-28)
  ngày 28/09 bằng “duyệt”; điều phối source freeze L06/L07 và giữ
  H00 no-reproduction, L06 EN landscape viewer/CDN RED độc lập.
- [x] M00a: local `8792` runtime source/build/served và HTML build/served SHA
  khớp trước/sau; focused Chromium có 5 named RED: 3 thiếu source media/video,
  2 sai behavior grid-morph/marker và viewer image-local pinch. History
  Back/Forward Y0=2086/Y1=480 PASS với pointer click, khác H00 Y0=0 PASS.
  Raw cuối `.tmp/site-media-card/m00a-20260928T090819334Z/` giữ inventory
  VI/EN, runner SHA trước/sau và 0 fixture fault; raw Y0 sai do test click
  tự cuộn, raw fixture và first launch error giữ riêng.
  Home reel, Res/Com gallery và About duo chưa có identity/đích detail: gate
  mapping trước M03–M05, không tự loại hoặc tạo route.
- [ ] M00b: visual prototype A/B desktop/mobile tại
  `.tmp/site-media-card/m00b-20260928T093653721Z/M00b-review.md`
  đã ghi 0/1/nhiều tâm giả lập, navbar thực và raw geometry trên local `8792`.
  Owner duyệt A ngày 28/09: dải giữa 40% phần viewport dưới navbar thực,
  không autoplay khi không có tâm ứng viên trong vùng; visual gate M06 đã đóng.
  Mẫu synthetic MP4/H.264+AAC, GIF input chuyển MP4, WebP poster và trace
  Chromium desktop/mobile ở [raw M00b](../.tmp/site-media-card/m00b-media-20260928T094733503Z/M00b-media-review.md)
  kèm [đính chính số byte](../.tmp/site-media-card/m00b-media-amend-20260928T095524377Z/M00b-media-amend.md):
  byte browser thực nhận chưa biết.
  Chưa có clip thật/Safari-iPhone physical để khóa chất lượng, byte budget hoặc
  preload margin; M00b media gate còn mở, không gọi product quality PASS.
- [x] M01a: media metadata parent/related data-only RED→GREEN 4/4;
  affected 43/43, source/build/HTTP ổn định theo [raw M01a](../.tmp/site-media-card/m01a-20260928T101601454Z/summary.json)
  (seal SHA-256 `6239E8C4C7D57655F86E5D7E31BAB891ECF29814F9BAC414ED87C696344FBB0D`).
  `qa:static` từng PASS ở output tương tác nhưng thiếu log bất biến.
  Artifact legacy projection bỏ riêng
  `mediaItems`/`coverMediaId` có SHA-256
  `B24E62FA345BADDCA3847C9847475136D4B5AD8F4B6F618CCD81ABE7B218B6A6`
  khớp hash quan sát trước M01a, nhưng bytes artifact cũ không lưu để so trực
  tiếp; giữ image-only public/seed/filter.
  [Content guide](../docs/design/content.md#danh-sách-media-trên-card-advertising)
  đã cập nhật; DOM RED M00a là baseline trước M01b.
- [x] M01b: card swipe/click, indicator 1/2–6/≥7, mute/loading,
  media-error và rapid retap scoped GREEN bằng fixture đúng tỷ lệ. [Raw R5](../.tmp/site-media-card/m01b-r5-final-20260928T120806861Z/summary.json):
  focused 19/19, affected 54/54, static/build/diffcheck PASS; QA độc lập xác
  nhận runtime source/build/served SHA-256
  `D3174207A543538C98D7234EA678A1B624142C1EE457C4145CD0A9538638DD43`,
  CSS SHA-256 `8EFE23014D7FD9FFAAF840D2A42A1DCF9F115E8FDEED37C6A0D610FA534C73C2`.
- [x] M01c: validator số nguyên dương/tỷ lệ hữu tỷ chính xác cho item, poster
  và fallback hiện trên card; fixture ảnh/video/poster synthetic 3:2, reject
  mismatch, không crop/tolerance; 154 image-only không đổi. Validator SHA-256
  `79B66FC04F804A9384B4514C906B49D118625A82744143244EEFC93E4DABAD01`;
  bằng chứng scoped chung ở [raw R5](../.tmp/site-media-card/m01b-r5-final-20260928T120806861Z/summary.json).
- [x] M01d geometry: grid/related lấy tỷ lệ khung ban đầu theo `coverMediaId`;
  154 legacy hash/order/count giữ nguyên, normal/slow/error và đổi slide giữ
  rect `≤1 CSS px`. [Raw M01d](../.tmp/site-media-card/m01d-seal-20260928T123953988Z/manifest.json):
  browser 25/25, affected 70/70, static/build PASS; layout-core
  source/build/served SHA-256
  `0131259EC6EFEE3DBD0E63B6FBE8CAB1FBC5FF68DEA139132B9EF3BC07B87398`.
  Primary active media vẫn thuộc M02a; related pointer không nằm trong GREEN này.
- [x] R6-R3 related/grid pointer và dải control: [checkpoint](../docs/verification/site-media-card-r6-r3-checkpoint-2026-09-28.md)
  nối [solver raw](../.tmp/site-media-card/r6-r3-seal-20260928T135917233Z/manifest.json)
  với [UI raw](../.tmp/site-media-card/r6-r3-ui-final-20260928T141154930Z/summary.json).
  Independent review Required0; R6 29/29, M01b 25/25, unit77/77,
  static/build/diffcheck PASS, source/build/served layout/runtime/CSS khớp,
  seal118/118. Canvas cover và dải 44px cho 2+ media; singleton/154 giữ nguyên.
  Scope synthetic Chromium, chưa native/Safari/clip public/full-site.
- [x] M02a scoped engineering Advertising sau M01d và R6-R3: RED-only runner SHA-256
  `C335C3EE577833E6B44391F4AF6990DA79F5AF30AEC811265865524931010F3B`
  đã chuẩn bị tại [raw](../.tmp/site-media-card/m02a-red-prep-20260928T133515253Z/manifest.json),
  nay có [checkpoint 30/09](../docs/verification/site-media-card-m02a-checkpoint-2026-09-30.md):
  focused11/11, viewer controls12/12, photo-layout15/15, static/build và
  review Required0. Pointer harness trên cùng source đạt R6 29/29, numeric EN
  1/1 và VI 1/1 ba lần; A05s portrait6/6. Đây là nghiệm thu kỹ thuật scoped,
  không là owner visual, feature toàn site hoặc release.
- [x] P14 Advertising low-height oracle: raw strict-fit RED tại A05s
  `838×331` vượt viewport `51.96 CSS px`, nhưng [L04R native follow-up](../docs/verification/site-media-card-m02a-checkpoint-2026-09-30.md)
  chứng minh scroll/CTA/related tiếp cận được trên cùng SHA. [P14-L04R
  correction](../docs/verification/site-media-card-m02a-checkpoint-2026-09-30.md)
  focused `37/37`, reviewer Required0: nonfit cuộn và pointer thật, fit giữ
  strict cap/bottom; hai raw RED baseline giữ lịch sử. P14 không đóng toàn bộ
  L04R multi-engine/Android/660 matrix. D18 stale oracle, L06 touch-close,
  clip thật, iPhone/Safari và owner visual vẫn mở.
- [ ] M02b PAUSED / NOT ACCEPTED theo quota STOP remaining6%; [checkpoint](../docs/verification/site-media-card-m02b-checkpoint-2026-10-03.md)
  trên runtime `6D654C…` ghi related simulation 3/6 PASS. Desktop VI activation,
  desktop EN remount và landscape VI first-paint Y còn FAIL. Main đã kiểm current
  original6 PASS, affected5/8, layout47/static/build PASS; source review/acceptance
  còn mở. M02a10/11, EN grid-video activation FAIL chưa phân loại. Lifecycle50/52
  stale baseline đã xác minh, future correction tách một file. MCP browser matrix
  TOOL BLOCKED, detector evidence OPEN. Chỉ wrap-up checkpoint/handoff; không QA thêm.
  Sau gói này lưu
  checkpoint rồi tạm dừng:
  [RED-only checkpoint](../docs/verification/site-media-card-m02b-red-pause-2026-09-30.md)
  có bốn product RED (grid/Forward clone, marker thiếu, Forward `Y=0` thay vì
  `480`) và hai control PASS (direct/reload cover, viewer morph). Source behavior
  chưa sửa tại thời điểm RED. [Checkpoint PAUSED lịch sử](../docs/verification/site-media-card-m02b-checkpoint-2026-09-30.md)
  giữ source candidate dirty và QA một phần: một named no-clone VI/EN PASS,
  marker timeout trước assertion B chưa phân loại; bốn named còn lại chưa chạy.
  Affected QA, source review và native QA chưa chạy ở checkpoint cũ. Hiện
  [diagnosis clean](../.tmp/site-media-card/m02b-marker-diagnosis-20260930T080232930Z/probe-wheel-clean-v2.json)
  xác nhận timeout do fixture native scroll/Locomotive; runner reachability
  đã sửa, [sáu named cũ](../.tmp/site-media-card/m02b-six-final-20260930T083739504Z/)
  PASS trước extension. Owner xác nhận marker latest closed chung main/related:
  A→B đánh dấu A; Back A đánh dấu B; Forward B đánh dấu A. Related RED→GREEN,
  scroll riêng từng entry ở mọi grid `≤1 CSS px`, không extra entry/autoscroll,
  hidden DOM cleanup, affected QA và review còn phải hoàn tất; chưa nhận GREEN.
  Debug simulated browser desktop/điện thoại dọc/ngang trước; Samsung A05/A05s
  thật skipped/unverified theo owner, iPhone còn mở. Simulation không đóng
  physical gate. Gói này
  làm no-grid-detail-morph/marker/history RED→GREEN; **cùng
  gói đổi behavior** cập nhật `advertising-photo-browse.md`,
  `advertising-photo-morph-scroll.md` và
  `frontend-brand-shell-responsive-runtime.md` supersession, giữ viewer morph/R9 wheel
  và entry-scroll; direct detail/locale/media identity có case.
- [ ] M03a: Home reel media-state VI/EN; rail snap/route giữ nguyên.
- [ ] M03b: Home portal eligible VI/EN; portal phi-media giữ tĩnh.
- [ ] M04a: Residential gallery/editorial/duo VI/EN; drag/ARIA/geometry GREEN.
- [ ] M04b: Commercial tương ứng; ảnh minh họa không thành media-card.
- [ ] M05: About duo eligibility và inventory đủ họ; logo/montage/chữ không player.
- [ ] M06a: theo visual A40% đã duyệt, zone + solver soft placement 0/1/nhiều ứng viên,
  không đổi order/seed/filler/geometry; dừng nếu contract không giữ được.
- [ ] M06b: một cover-video player, random không lặp, hover/manual/scroll
  arbitration, timestamp/reduced motion GREEN.
- [ ] M06c: poster/metadata/initial bytes trace, pause frame và offscreen/
  BFCache/slow/error cleanup, terminal UI khi mọi asset lỗi; byte budget có số đo.
- [ ] M07a: replay bounded L06 EN landscape touch-close, CDN lỗi riêng;
  không nhận viewer PASS bằng portrait page pinch.
- [ ] M07b: enlarged viewer two-finger pinch/pan trên Android thật; viewer
  open-close morph/focus/lock/reduced motion giữ nguyên.
- [ ] M08a: cross-site VI/EN desktop/browser matrix, affected regressions,
  console/network và source/build/served SHA.
- [ ] M08b: native Android dọc/ngang, iPhone nếu có, combined review và
  owner visual; thiếu gate thì không gọi full-site PASS.
- [ ] M09: xác minh M02b supersession, link/status/content và handoff/DoD;
  không retag H00/L06 hoặc rerun body210 khi hash/blast radius không đòi.

## Advertising random grid và tải ảnh — checklist

Nhập từ Codex; chờ owner duyệt [plan](plan.md#advertising-random-grid-và-tải-ảnh--plan-chờ-duyệt-2026-09-25).

Trạng thái: owner duyệt 2026-10-03, xem [quyết định owner](plan.md#advertising-random-grid-và-tải-ảnh--plan-chờ-duyệt-2026-09-25).

### P0 — Cô lập checkout và chụp baseline

**Mô tả:** sau plan approval, tạo branch/worktree riêng từ HEAD `main` đã xác
nhận lúc chạy; chỉ copy spec/map/plan/docs thuộc task. Đo Sites version hiện
hành trước mọi source change.

**Acceptance:**

- [ ] Main checkout và dirty/untracked work ngoài task còn nguyên.
- [ ] Branch là `codex/advertising-random-media`; worktree chỉ chứa file task
      sau selective transfer.
- [ ] Có 120 cold runs: 6 route đại diện × 2 locale × 2 viewport × 5 lượt;
      ghi LCP, request start, decode/reveal, bytes, kích thước, CLS, lỗi và
      cohort ID. Warm cache ghi riêng.
- [ ] Report ghi Sites version/SHA, Slow 4G/CPU 4x, thời gian chạy và sample
      bị loại; không dùng phép đo thăm dò đơn làm baseline.

**Verification:** kiểm git status ở main/worktree; browser Network/Performance
xác nhận ảnh mẫu có transfer bytes `>0`; đối chiếu đủ 120 tổ hợp.
**Dependencies:** plan approval. **Files likely:** report dưới
`docs/verification/` và verification index. **Estimate:** 75–120 phút.

### P1 — Khóa RED cho thứ tự, history và pool mở rộng

**Mô tả:** khóa test trước source cho All, sáu filter, related category/tag,
seed/history, solver hard/soft gate và catalog tăng.

**Acceptance:**

- [ ] Direct load/F5 lấy seed mới; filter, locale và Back/Forward giữ seed,
      kể cả khi browser dựng lại document; URL contract không đổi.
- [ ] Mỗi pool giữ đúng membership/ID đúng một lần; canonical `sourceOrder`,
      rank, tags, caption/alt VI/EN không bị ghi lại.
- [ ] Nút All và sáu filter giữ nguyên thứ tự/vị trí; grid route ngoài Advertising
      không bị random.
- [ ] Fixture `0/1/2/3/10/100`, ảnh đứng/ngang/vuông và ratio cực đoan kiểm
      geometry, operation budget và hard-safe fallback.

**Verification:** test mới RED đúng trên behavior cũ và invariant cũ GREEN;
chạy:
`node --test tests/site/advertising-products-layout.test.mjs tests/site/advertising-products-lifecycle.test.mjs tests/site/advertising-skeleton-flow.test.mjs`.
**Dependencies:** P0. **Files likely:** ba test trên và
`tests/site/advertising-products-random-order.test.mjs`. **Estimate:** 50–80 phút.

### P2 — Triển khai presentation order, seed và solver fallback

**Mô tả:** nối thứ tự trình bày với layout mà không shuffle phá canonical
rank; gắn seed vào history entry và locale handoff dùng một lần.

**Acceptance:**

- [ ] Pool có nhiều hơn một nghiệm hard-safe tạo được ít nhất hai hoán vị qua
      nhiều seed; trong cùng lượt mỗi pool dùng lại đúng thứ tự.
- [ ] Back/Forward, locale full navigation và document reconstruction phục hồi
      seed entry; reload/direct navigation bắt đầu seed mới.
- [ ] Search không vượt `300.000` operations; nếu soft target không đạt, trả
      layout hợp lệ cùng diagnostic, không `search-exhausted`.

**Verification:** P1 GREEN; oracle sweep width
`320/390/768/1024/1440/1920/2560`, pool `1/10/100`, history và resize.
**Dependencies:** P1. **Files likely:** `layout-core.mjs`,
`catalog-runtime.mjs`, helper nếu cần và tối đa hai test. **Estimate:** 90–150 phút.

### P3 — Random batch skeleton và nhịp slideshow

**Mô tả:** random phân bố band cao/vuông/thấp theo seed trên frontier hiện có;
giữ tập suggestion theo tag và đổi ảnh mỗi 3 giây.

**Acceptance:**

- [ ] Batch tiếp nối đáy card thật; band đổi giữa seed khi có nhiều nghiệm;
      không đổi scrollHeight, hit testing, CTA–footer gap hoặc final viewport.
- [ ] CTA–footer gap giữ trong `1 CSS px`; khoảng batch–card không vượt một
      inter-card gap ngoài sai số `1 CSS px`.
- [ ] Suggestion giữ sample random tối đa 9 ảnh/tag; đổi mỗi `3 s`, crossfade
      `1,6 s`, không auto-zoom, tôn trọng pause/visibility/selection/reduced motion.
- [ ] Cùng lượt filter/history round-trip phục hồi batch state; membership,
      ảnh thật và CTA không đổi.

**Verification:** P1/P2 GREEN; unit/browser matrix VI/EN mobile/desktop,
reduced motion, CTA/footer và 3-second tick.
**Dependencies:** P2. **Files likely:** `skeleton-flow.mjs`,
`catalog-runtime.mjs`, `suggestion-slideshow.mjs`, tối đa hai test.
**Estimate:** 50–90 phút.

#### Checkpoint A — Advertising

- [ ] P1–P3 focused tests và static/layout checks đạt.
- [ ] Main kiểm diff; report score/fallback cho pool đồng dạng và khó.

### P4 — Chẩn đoán bottleneck delivery

**Mô tả:** phân rã baseline thành discovery/priority, queue/transfer,
decode/reveal. Đây là bước read-only, chưa đổi source hoặc media.

**Acceptance:**

- [ ] Có root cause theo route/viewport/cohort; giải thích biến thiên random
      bằng ID, dimensions và bytes.
- [ ] Quyết định nhánh tối thiểu được số đo hỗ trợ: discovery/priority,
      transfer bytes hay decode/reveal; ghi nhánh loại trừ và lý do.
- [ ] Nếu bytes chi phối, đề xuất đúng media cohort cần responsive derivative;
      nếu không, giữ nguyên pool media.

**Verification:** Network waterfall cold/warm cùng điều kiện và report root
cause. **Dependencies:** P0. **Files:** chỉ report evidence, không source.
**Estimate:** 30–60 phút.

### P5 — Triển khai tối ưu delivery đã đo

**Mô tả:** triển khai đúng nhánh P4 đã xác định; không thêm derivative nếu
waterfall không cho thấy transfer bytes là nút thắt.

**Acceptance:**

- [ ] Candidate cải thiện phần bottleneck đo được, không tải mọi ảnh trước
      viewport và không tạo request trùng.
- [ ] Nếu cần derivative, giữ provenance/identity/dimensions/alt và tạo theo
      batch nhỏ; không đưa source-only asset vào `.site-output/`.
- [ ] Không làm LCP tăng ngoài gate; giữ caching, lazy loading, decode và
      intrinsic ratio.

**Verification:** focused media/static tests, cold/warm local Network waterfall
và so đúng cohort/bytes với P0. **Dependencies:** P4. **Files likely:** tối đa
5 source/test/doc paths cho mỗi slice; derivative chia batch riêng.
**Estimate:** 45–90 phút, chưa tính derivative batch.

### P6 — Feasibility gate cho byte progress

**Mô tả:** thử cùng một request với một hero và một card lazy; kiểm tra byte
stream, encoding, cache/decode và so với native path.

**Acceptance:**

- [ ] Không request lần hai, không trì hoãn hero/LCP ngoài gate, không buffer
      ảnh ngoài viewport.
- [ ] Determinate chỉ khi stream bytes và Content-Length cùng đơn vị; thiếu/lệch
      header, encoded response hoặc body không đọc được thành indeterminate.
- [ ] Abort/reload cleanup stream, listener và object URL; không hiện số %.
- [ ] Nếu byte thật và speed gate không thể cùng đạt, dừng P6–P8 và trình owner
      số đo/tradeoff; không thay bằng progress giả.

**Verification:** isolated browser probe/test trên throttled network; ghi
request count, time-to-decode, LCP, bytes và cleanup.
**Dependencies:** P5. **Files likely:** isolated probe/test; chưa rollout
production source. **Estimate:** 45–90 phút.

#### Checkpoint B — Delivery go/no-go

- [ ] P4 xác định bottleneck; P5 có candidate so sánh được.
- [ ] P6 pass hoặc dừng, chuyển quyết định cho owner.

### P7 — Tạo frame và progress state dùng chung

**Mô tả:** sau P5 pass, thêm thành phần dùng chung nhỏ nhất cho reserved frame,
determinate/indeterminate ring, cache, ready và error.

**Acceptance:**

- [ ] Frame lấy dimensions/aspect ratio thật trước request; cache-ready không
      lóe; ready chỉ sau decode; error giữ tỷ lệ/alt.
- [ ] Cung tròn phản ánh bytes, không có số; trạng thái unknown dùng chuyển
      động indeterminate; reduced motion không quay liên tục; có `aria-busy`.
- [ ] Không thêm dependency, WebGL, service worker, endpoint hoặc global loader
      gây hàng đợi chung.

**Verification:** component tests known/unknown/mismatch/cache/error/abort;
accessibility tree và reduced-motion browser check.
**Dependencies:** P6 pass. **Files likely:** shared loader/state, CSS và test
mới. **Estimate:** 60–120 phút.

### P8 — Nối frame vào ảnh tĩnh toàn website

**Mô tả:** nối với global motion/media reveal và page detail/service; logo,
icon, background trang trí và batch skeleton CTA giữ ngoại lệ spec.

**Acceptance:**

- [ ] Home, residential, commercial, about, gallery và hero dành chỗ trước
      request; không CLS do placeholder.
- [ ] Alt, request priority/lazy, VI/EN, direct/Barba/Back lifecycle không đổi;
      no-script vẫn xem ảnh được.
- [ ] Không request ảnh trùng; ảnh cache không hiện loading state giả.

**Verification:** HTML/media contract; Playwright/DevTools theo route, locale,
viewport, slow network và failure.
**Dependencies:** P7. **Files likely:** `motion.js`, `detail.js`, shared
module/CSS và một test (tối đa 5 file). **Estimate:** 75–120 phút.

### P9 — Nối frame vào Advertising động

**Mô tả:** nối component đã qua gate vào card, related, suggestion và photo
viewer; giữ LazySizes/virtualization và priority hiện hành.

**Acceptance:**

- [ ] Parent/detail/related/viewer hiện đúng loading state; thay hero hoặc rapid
      scroll không gắn state ảnh cũ sang ảnh mới.
- [ ] Lazy window giữ bounded requests; viewer close/error và history giữ
      lifecycle hiện tại.
- [ ] Grid random, CTA/footer và filter không đổi geometry khi tải ảnh.

**Verification:** Advertising layout/media/lifecycle và viewer E2E; request
count, slow network, keyboard/touch, reduced motion.
**Dependencies:** P3 và P8. **Files likely:** `catalog-runtime.mjs`,
`photo-viewer.mjs` và focused tests (tối đa 5 file). **Estimate:** 75–120 phút.

### P10 — Tích hợp, review và preview độc lập

**Mô tả:** chạy project quality gates, review source cuối và gọi subagent mới
để preview local candidate bằng Chrome/Playwright.

**Acceptance:**

- [ ] Unit/static/build GREEN; docs index/STATE/specs khớp source/hash.
- [ ] Main chạy `code-review-and-quality` và `ponytail-review`; không còn
      finding quan trọng.
- [ ] Subagent `web-performance-auditor` dùng model yêu cầu `gpt-6-sol`,
      effort `ultra`; preview read-only VI/EN, mobile/desktop, home/service,
      Advertising All/filter/detail, Back/locale, CTA/footer, console/network/CLS.
- [ ] Main kiểm từng finding; owner xem local preview trước Sites release.

**Verification:** `pnpm prepare:site`, `pnpm qa:static`, focused test commands
trong spec, local `pnpm dev`, Playwright và Chrome DevTools MCP. Ghi model/
effort thực tế từ dispatch result hoặc `unknown`.
**Dependencies:** P3–P9. **Files:** evidence/docs và finding chuyển về task sở
hữu, không dùng QA để mở rộng refactor. **Estimate:** 90–150 phút.

#### Checkpoint C — Local preview

- [ ] Source, review và preview đạt; owner approve candidate.
- [ ] Sites version rollback trước release đã được xác nhận.

### P11 — Push source và đo Sites candidate

**Mô tả:** phát hành theo gate Sites sau owner release approval; GitHub giữ
source/tests/scripts/docs, Sites chỉ nhận static artifact.

**Acceptance:**

- [ ] Ponytail review chạy trước commit/push; staged diff chỉ gồm task paths.
- [ ] Release evidence ghi GitHub SHA, mirror SHA, archive checksum và Sites version.
- [ ] Sites tree/archive chỉ có `dist/` và `.openai/hosting.json`.
- [ ] Candidate đạt 120 cold runs cùng baseline và threshold của spec; nếu trượt,
      rollback version cũ và lưu evidence.

**Verification:** Git diff/commit/push gates, archive tree/checksum, Sites
deployment confirmation và Network/Performance matrix sau deploy.
**Dependencies:** P10 và owner release approval. **Estimate:** 60–120 phút,
chưa tính propagation hoặc sửa phát sinh.

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
