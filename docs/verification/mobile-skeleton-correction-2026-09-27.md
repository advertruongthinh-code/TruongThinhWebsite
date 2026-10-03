# Correction random và skeleton mobile — 27/09/2026

**Verdict: C06U local functional đạt; full continuation và UI QA MCP chưa đạt,
owner/device gates còn mở.** Random và scrollbar giữ trên preview8792.
Owner đã duyệt logical deck12 và common persistence. Ba engine đạt lifecycle,
clean80 transitions và Android dọc/ngang không có common-card reset. C05 RED
và C05R GREEN giữ riêng; chưa tuyên bố browser parity hoặc iPhone PASS.

## Candidate và preservation

Checkout `C:/Users/halal/.codex/worktrees/mobile-ui-contract/TruongThinh-Website`,
branch `codex/mobile-ui-contract`, HEAD `e6cf065161cb19a8b59dd9efa8cda5d4af27fba1`.
Server8792 giữ process52248; source/build/served của9 JS/CSS assets đều khớp
SHA-256 và HTTP200 lúc14:39UTC. [Manifest đối chiếu](../../.tmp/mobile-skeleton-correction/evidence-summary.json)
giữ hash hiện hành trong phần C06U phía dưới. Snapshot C05 RED trước amendment có catalog
`f519eed9bf94cf687bdd81ae6c437b72432cef7c600e798b7fad4042414404fd`, renderer
`e300e3b6137db945016c1557e248efbef86971f37ed17c3a9b52ec76509986ee`;
motion `21f57d01a7a690624a011b7f9ad90ec23624532f5a42b4cc319bcf5955ef0393`.

`style.css`, `detail.css` và Advertising HTML giữ nguyên snapshot scrollbar.
Hash HTML `f3caf6f35e1bd9fae94ab726365392bc48666dab9872509df57f7b528912d446`
đã kiểm riêng vì preflight cũ ghi sai path VI; checkpoint B bổ sung đúng path.
Motion/detail carry bridge seed/history/locale và một dòng instant snapshot restore; không carry boot/loading,
media-progress, filter-session hoặc mobile Back correction từ recovery.

Primary và recovery status/HEAD bằng preflight; recovery giữ66 staged,0 unstaged.
Không stage/commit/push/deploy hoặc resume recovery/P11. Pause patch/hash cũ
được giữ trong manifest checkpoint. [Pointer checkpoint C05 RED](../../.tmp/mobile-skeleton-correction/C05-blocked-current.json)
trỏ snapshot bất biến; đây không phải checkpoint C GREEN.

Thay đổi source/test so với preflight: **2322 thêm,207 xóa**, tổng2529 LOC;
16 path source/test. Không tính Markdown, generated hoặc scrollbar có trước;
Firefox native-control fixture sửa riêng một dòng giữ window tới teardown.
Trong estimate1800–2800 LOC của plan. Main giữ implementation; một reviewer
gộp QA/audit/code review, requested `gpt-6-sol/ultra`, effective `unknown`.

## Thay đổi và regression

Random dùng frozen accepted spec recovery, hash
`aaec23c431f5f33bef8372f815a960e862db287b66ce4650278297c30eea3c0a`;
owning [random spec](../specs/advertising-organic-random.md) ghi provenance và
supersession. Không lấy primary spec thiếu6 dòng native fallback làm authority.

Catalog reconcile frame theo slot: geometry mới cập nhật bbox/tail/footer,
common slot giữ node/reveal; actual pool teardown vẫn cleanup. Renderer giữ
phase theo slot, chỉ allocate khi visible/eligible; phone coarse/touch tối đa2
kể cả width838px. Lost context giữ static fallback; restore tạo resources mới;
destroy idempotent và guard already-lost. Preset, shader,240×160 và entry600ms
giữ nguyên. Guard cleanup trước C05R chưa đủ đóng lỗi pressure.

Scroll persistence gộp200ms, đọc latest browse/logical scroll lúc flush;
không ghi trùng stationary state. Photo/filter/tag/navigation vẫn snapshot
đồng bộ. Pending timer hủy khi apply/pagehide/cleanup và trước normal anchor;
timer không ghi outgoing Advertising state vào route khác. Không flush cleanup
sau khi history index đã đổi.

| Command/evidence | Kết quả | Giới hạn |
| --- | --- | --- |
| C01 unit RED trên preflight |40 tests:17 pass,23 fail; existing presentation/history behavior fail | Không là import-only RED; một số file dừng tại assertion đầu |
| Cadence RED trên exact preflight slideshow | Tick3000 chưa advance | Runtime cũ5000ms; controlled-clock/native decode seam |
| `node --test` sáu file theo plan |60/60 PASS,0 skip | [Log final](../../.tmp/mobile-skeleton-correction/c05-final-unit.log) |
| `pnpm prepare:site`, `pnpm qa:static` | PASS | [Build](../../.tmp/mobile-skeleton-correction/c05-native-entry-build.log), [static](../../.tmp/mobile-skeleton-correction/c05-final-static.log) |
| `node tests/site/advertising-random-browse.e2e.mjs` |13 cases PASS,errors0 tại C05 | [Log lịch sử](../../.tmp/mobile-skeleton-correction/c05-native-entry-green.log); thêm early-Back Chromium/WebKit; current19 cases ghi tại C06U |
| `node tests/site/advertising-route-footer-p75.e2e.mjs` |6 filters PASS | [Log](../../.tmp/mobile-skeleton-correction/c05-final-footer.log); same-entry round-trip, F5 mới seed; CTA589/footer222/gap64 không bị bỏ oracle |
| Height-only regression trên B | RED: visible node thay | [Log](../../.tmp/mobile-skeleton-correction/c04-red.log) |
| C04/C05 height/loss/restore/20cycles Chromium/Firefox | Focused runs đạt trước coalesce | Không thay final candidate matrix; WebKit vẫn RED |
| Final WebKit20 valid filter/resize cycles | RED:5 cặp context pressure/already-lost | [Log](../../.tmp/mobile-skeleton-correction/c05-final-valid-top-webkit.log), [ledger](../../.tmp/mobile-skeleton-correction/lifecycle-final-valid-top/webkit-ledger.json), [errors](../../.tmp/mobile-skeleton-correction/lifecycle-final-valid-top/results.json); applied category được assert20/20 |

Native locale case cũ không chứng minh document mới; đã supersede bằng
blocking `motion.js` trong cả hai document, click menu/lang thật:2 main-document
requests, `timeOrigin` đổi, seed giữ và handoff tiêu thụ. Fault injection được
ghi riêng; không patch click handler để tạo navigation. B proof bổ sung giữ
footer height qua F5. Pending-scroll photo case quan sát native scroll event
trước click4,2ms, nhỏ hơn200ms persistence window; snapshot đồng bộ và Back
phục hồi scroll sai số≤2px. Marker scroll/click chỉ quan sát, không thay handler.

### History khi Back giữa transition

[Regression RED](../../.tmp/mobile-skeleton-correction/c05-early-back-red.log)
đổi seed khi Back trước khi Home settle. [Barba2.10.3 source](https://github.com/barbajs/barba/blob/v2.10.3/packages/core/src/core.ts#L278)
gọi native force khi transition đang chạy. Existing exact-URL fallback bridge
được dùng ở popstate tới Advertising; không thay query-only handler hoặc route khác.

Chromium đạt trước; WebKit còn RED do [write trace](../../.tmp/mobile-skeleton-correction/history-route-write-trace.json):
native destination index0 có marker, nhưng `pagehide` gọi catalog persistence
qua Barba index1/Home, ghi đè marker/state. Callback giờ giữ nguyên native
snapshot có fallback marker. Hai engine đạt seed, document mới, marker dùng
một lần và F5 reseed trong13-case run; không broaden marker sang `reload`.

[Supplement trước pagehide fix](../../.tmp/mobile-skeleton-correction/history-route-supplement-before-startup-trace.json)
giữ resting Chromium restore83px thay vì80px; WebKit resting80px.
[Scroll trace](../../.tmp/mobile-skeleton-correction/pending-route-scroll-trace.json)
hai engine đạt80px, nhưng không phủ định clean counterexample3px. Nguyên nhân
drift lúc đó chưa xác định; counterexample vẫn giữ. C05R xác định restore tại
`motion.mountPage` dùng default `auto`, gặp CSS `smooth`; một dòng `{instant:true}`
đã sửa. [Paired one-call proof](../../.tmp/mobile-skeleton-correction/review/resting-back-mount-only-2026-09-27T12-59-26-244Z/results.json)
giữ3/3 control RED83px và3/3 fixture GREEN80px. Production19-case run thêm
ba resting cases mỗi engine Chromium/WebKit, đều giữ seed và offset≤2px;
không sửa hai initialization/cleanup calls khác để mở rộng patch.

## Android thật: footer ↔ grid

Galaxy A05s SM-A057F, Android15/API35, Chrome153.0.8010.52; USB ADB authorized,
target3336 Chrome local8792 foreground. Scale1,DPR2.625; không override
font/density/viewport, không browser flags. Native CDP touch swipe; DOM/CSS
IDs dùng WeakMap trong isolated world, console/network và9 PNG mỗi lượt.
Không dùng capture này để tuyên bố FPS hoặc thay A54 performance gate.

| Orientation/capture | Scenario | Observation |
| --- | --- | --- |
| [Dọc11:14:54UTC](../../.tmp/mobile-skeleton-correction/android-2026-09-27T11-14-54-010Z/analysis.json) |450 samples;3 chu kỳ tới footer thật; visual height782.48↔838.48 và intermediate |909 consecutive common-visible pairs;0 identity/opacity reset;144 requests,0 failed/HTTP/console error |
| [Ngang11:26:03UTC](../../.tmp/mobile-skeleton-correction/android-2026-09-27T11-26-03-016Z/analysis.json) |740 samples;3 chu kỳ tới footer thật; width838,height331↔387 và intermediate |443 common-visible pairs;0 reset;145 requests,0 failed/HTTP/console error |

Analysis predicate: cùng slot visible ở hai sample liên tiếp; đổi node ID hoặc
opacity≥0.999→<0.95 ghi reset. Đây là sampled evidence, không bảo đảm mọi frame
giữa samples. Slot có thể thêm/bỏ do tail geometry; full exit/reentry hợp lệ
khác visible reset. Các lượt này dùng candidate trước coalesce/anchor guard;
hash served từng lượt ở `metadata.json`, không gọi là final C06 same-build PASS.
Lượt ngang11:18 chưa tới footer đã bị loại khỏi acceptance, raw vẫn giữ.

## WebKit: quota đã sửa, pressure chưa sửa

Ledger giữ strong canvas/gl tự tạo pressure: probe40 contexts isolated
about:blank cho24 cặp errors; WeakRef/no-retention cùng probe không lỗi.
Ledger đã đổi WeakRef factory ngoài activation và bỏ temporary pins. Tuy nhiên
clean website không instrumentation cũng tái hiện: không được quy toàn lỗi
cho recorder hoặc gọi cleanup PASS từ live count2.

Sau coalesce, [clean strict run](../../.tmp/mobile-skeleton-correction/review/c05-clean-webkit-strict-2026-09-27T11-35-05-690Z/results.json)
có20/20 category đúng, quota/pageerror/network0 nhưng4 cặp tooMany/alreadyLost.
Run thứ hai18/20 category giữ invalid. Candidate catalog `db4e59ac…`; guard
pending navigation được thêm sau đó. Final ledger48 allocations,47 losses,
1 restore,live2 vẫn4 cặp errors; không lọc warning khỏi assertion.

[Comparison destroy-boundary](../../.tmp/mobile-skeleton-correction/review/c05-destroy-boundary-2026-09-27T11-38-14-022Z/results.json)
cùng input actual-top+2RAF, mỗi run20/20 category:
control0 error, backing store0 sau destroy còn4 cặp, backing0+cancel animation
còn6 cặp. LIVE240×160 không đổi. Hai cleanup nhỏ không đạt; control xanh không
phủ định counterexample trước đó. Timing/GC dependence là **inference**;
chưa chứng minh closure cụ thể giữ resource.

[Lượt cuối trên candidate f519eed9…](../../.tmp/mobile-skeleton-correction/c05-final-settled-webkit.log)
đạt height/identity/loss/restore/20cycles; [ledger](../../.tmp/mobile-skeleton-correction/lifecycle-final-settled/webkit-ledger.json)
ghi49 allocations,48 losses,1 restore,live/peak2 vàerrors0. Đây là bounded
GREEN, không phủ định clean counterexamples hoặc chứng minh nguyên nhân
pressure đã được sửa. Run trước dừng do fixture đo opacity0.984559→1 trong
entry reveal, mọi identity giữ: [raw](../../.tmp/mobile-skeleton-correction/lifecycle-final-history/webkit-height.json).
Fixture hiện chờ visible frames opacity1 trước resize; giữ nguyên exact
identity/opacity assertions, không gọi sự tăng opacity này là replay/reset.

Stress oracle thêm assertion category thực sự áp dụng. [Run thiếu stable-top](../../.tmp/mobile-skeleton-correction/c05-final-valid-webkit.log)
bị loại vì click chưa đổi category; không coi đó là20 valid transitions.
Fixture giờ chờ scrollY0 thật và2RAF trước input. Lượt cuối trên cùng f519eed9…
đạt20/20 applied categories nhưng ghi5 cặp context pressure/already-lost;
49 allocations/48 losses/1 restore/live2/peak2. Quality gate vẫn RED;
không dùng live2 hoặc một lượt bounded GREEN để nghiệm thu.

[Khronos extension](https://registry.khronos.org/webgl/extensions/WEBGL_lose_context/)
quy định already-lost là INVALID_OPERATION. [WebKit issue218305](https://bugs.webkit.org/show_bug.cgi?id=218305)
ghi cùng cặp lỗi; đối chiếu upstream hỗ trợ hypothesis engine retention,
không là proof binary WebKit26.6 hoặc lý do miễn quality gate.

### Feasibility context reuse — không phải source fix

[Prototype cô lập](../../.tmp/mobile-skeleton-correction/reuse-prototype-2026-09-27T11-46-18-366Z/results.json)
HTTP-response injection trên catalog `fbce6422…` và renderer `e300e3b6…`:
hai fresh WebKit26.6 contexts ×20 category/filter/resize cycles; **mỗi lượt
chỉ2 allocations,0 console/pageerror**, mọi live canvas240×160. Delete GL
program/buffer/texture/listener/RAF khi handoff, giữ native canvas/context để
reinitialize assignment kế tiếp. Không sửa source/build/server/Android.

Prototype đầu timeout không đạt; run thứ hai có đầy đủ20/20+20/20. Raw helpers
và injected text được giữ. Đây chỉ chứng minh hướng reuse khả thi cho filter/
resize; chưa kiểm document lifetime teardown, navigation, hidden, forced loss,
performance hay physical device với implementation này.

Plan gốc cấm renderer pool. Owner duyệt [amendment C05R](../../tasks/plan.md#amendment-c05r--accepted-2026-09-27)
và [delta ownership](../specs/advertising-skeleton-flow.md#amendment-context-reuse--accepted-2026-09-27)
ngày27/09 bằng “Duyệt delta và plan C05R”. Ngoại lệ chỉ document cache trong
hai module hiện hữu; không controller/framework/dependency mới.

## C05R: implementation và native lifetime

Tại checkpoint C05R, source/build/served đều khớp: catalog `f25b08cb945264ef191b741aae3acb303b0ec0d8e8643558d61941c3235cff33`,
renderer `f1f97554e11b91c6d19cf7a6e5305e46cc3ac5905f97d7870561d0c9fca7fa42`,
motion `f43f6f04245b3d97b1ac0a2e72e4cea08c2707a378e8eaff7b668becc111e247`.
C05R thêm226/xóa23=249 LOC trong bốn source/test paths; restore fix riêng
thêm một dòng và sáu browser regression cases. Quality bar/presets/resolution
và CSS scrollbar/detail/HTML frozen giữ nguyên.

Catalog giữ native canvas/context theo document; frame lease sở hữu resources
và saved phase. Handoff xóa program/buffer/texture/listeners/RAF đúng một lần,
giữ context; `destroy()` default vẫn fully dispose. Cache phone leased+idle≤2;
idle lost được quarantine, restore mới được checkout. Controller/filter cleanup
trả lease; nonpersisted document exit dispose, persisted BFCache park/resume.

| Proof snapshot C05R | Kết quả |
| --- | --- |
| [Unit60](../../.tmp/mobile-skeleton-correction/c05r-final-build-unit.log), [static](../../.tmp/mobile-skeleton-correction/c05r-final-build-static.log), [build](../../.tmp/mobile-skeleton-correction/c05r-resting-build.log) | PASS; unit0 skip; handoff RED→GREEN, default/idempotent destroy/resources/listeners/RAF |
| [Lifecycle3 engines](../../.tmp/mobile-skeleton-correction/c05r-final-lifecycle.log), [WebKit ledger](../../.tmp/mobile-skeleton-correction/lifecycle-reuse-final/webkit-ledger.json), [native events](../../.tmp/mobile-skeleton-correction/lifecycle-reuse-final/webkit-native-events.json) |20/20 valid mỗi engine; allocation/peak2, forced loss2/restore2; idle quarantine, menu/reduced, common slot, soft remount và native teardown đạt; nonpersisted dispose delta2 |
| [Clean4 fresh contexts](../../.tmp/mobile-skeleton-correction/c05r-clean-strict-2026-09-27T13-05-01-250Z/results.json) | Chromium/Firefox/WebKit/WebKit80/80 actual categories;0 console/page/network/HTTP errors; Chromium có4 GPU ReadPixels warnings trong raw, không pressure/already-lost; không GL handles/prototype patch/injection; served hashes stable |
| [Random19](../../.tmp/mobile-skeleton-correction/c05r-random-final-ready.log), [results snapshot](../../.tmp/mobile-skeleton-correction/C-C05R-2026-09-27T13-15-44-883Z/evidence/.tmp/mobile-skeleton-correction/random-browser/results.json), [footer6](../../.tmp/mobile-skeleton-correction/c05r-final-footer.log) | Resting Back80→80 sáu cases; early native fallback, photo/pending scroll, locale/F5 và seed giữ đúng; footer hard gate giữ |
| [Android native lifetime](../../.tmp/mobile-skeleton-correction/android-native-2026-09-27T13-07-33-813Z/results.json) | Galaxy A05s Chrome153; real `pagehide/pageshow.persisted=true`, cùng timeOrigin/seed/parked phase+paint; hidden tab0 phase/paint advance; native allocations2;0 errors; final source/served hashes khớp |

Native observer phải đăng ký sau khi runtime tạo context và bind lifetime
handlers. Init observer trước app có microtask checkpoint trước handler tiếp
theo, đọc trạng thái trước park/dispose; raw failures giữ, không là runtime
counterexample cuối. Unload console có thể không chuyển tới host; browser test
lưu diagnostic scalar vào sessionStorage riêng, không ghi app history/state.
Không dùng synthetic event để đóng BFCache gate. Android dùng task-owned local
tab qua browser CDP `Target.createTarget`, đóng tab đó và activate lại3336;
không browser flags/font/density/viewport overrides. `/json/new` không dùng
được trên device; Chrome đã được mở lại, ADB/CDP authorized giữ nguyên.

Main kiểm diff/interface/consumer và source/build/served; combined reviewer
Required0, requested Sol/ultra/effective unknown. [Pointer checkpoint C](../../.tmp/mobile-skeleton-correction/C-current.json)
giữ snapshot exact owned source/docs/tests và raw proofs; [RED rollback pointer](../../.tmp/mobile-skeleton-correction/C05-blocked-current.json)
vẫn bất biến. Primary/recovery và pause hashes khớp preflight; không stage/deploy.

<a id="c06-counterexample-và-gate-còn-mở"></a>

## C06U: logical deck, current build và gates

Current catalog/source/build/served `d43490752a08d284bd62d09861f0e24cfc4e8b62e3dd0fefcfe1bb3dc9f8fcb6`;
renderer `f1f97554…`, motion `f43f6f04…`, CSS `671dd694…` giữ C05R.
Owner duyệt [delta A](../specs/advertising-skeleton-flow.md#amendment-logical-batch-khi-resize--accepted-2026-09-27)
và [plan C06U](../../tasks/plan.md#amendment-c06u--accepted-2026-09-27)
bằng “Duyệt A và plan C06U (đề xuất)”. Mỗi assignment/canvas giữ immutable
deck identity; không đổi preset của common slot hoặc shuffle lại vì resize.

Historical cursor từng tạo deck mới khi active≤12, filter không reset pool:
[RED10 unique/12](../../.tmp/mobile-skeleton-correction/c06-slot-red.log).
Allocator hiện preclaim common, reserve cached returning slots, lấy assignment
chưa dùng và reset pool khi actual filter đổi. [Overflow RED](../../.tmp/mobile-skeleton-correction/review/preset-overflow-2026-09-27T13-40-09-846Z/results.json)
ở candidate94db, seed `mujv8ol4-a76dh04jrtm`,13→10 có hai common slots cùng
`electric-tide`, cho thấy uniqueness mọi tập≤12 mâu thuẫn với persistence.
Owner chọn uniqueness trong từng deck; cross-deck duplicate được phép.
[Production GREEN độc lập](../../.tmp/mobile-skeleton-correction/review/c06u-overflow-2026-09-27T14-20-28-543Z/results.json),
SHA `dc80a680071711b07a1e9a86e9637e53cea12da78fdd1e7a843d6724d7ac8300`:
13→11→13, mọi common identity/assignment/deck giữ, round-trip exact; mỗi deck
unique≤12, full-deck direction cân bằng; actual kiosk click tạo pool mới.
Đây một qualifying seed, không thay unit20 seeds hoặc toàn matrix.

| Current d434 proof | Kết quả/phạm vi |
| --- | --- |
| [Build](../../.tmp/mobile-skeleton-correction/c06u-build.log), [unit](../../.tmp/mobile-skeleton-correction/c06u-unit.log), [static](../../.tmp/mobile-skeleton-correction/c06u-static.log) | PASS;60/60,0skip |
| [Random](../../.tmp/mobile-skeleton-correction/c06u-random.log), [current JSON](../../.tmp/mobile-skeleton-correction/random-browser/results.json), [footer](../../.tmp/mobile-skeleton-correction/c06u-footer.log) |19 cases/6 filters PASS; seed/history/native fallback/resting Back/footer hard gates giữ |
| [Lifecycle](../../.tmp/mobile-skeleton-correction/c06u-lifecycle-qualified.log), [results](../../.tmp/mobile-skeleton-correction/lifecycle-c06u-qualified/results.json) | Chromium153.0.8010.12/Firefox155/WebKit26.6 PASS,20 valid cycles mỗi engine, allocations plateau2; height/orientation/common/loss/native lifetime assertions giữ |
| [Clean four contexts](../../.tmp/mobile-skeleton-correction/c05r-clean-strict-2026-09-27T14-14-23-093Z/results.json) |80/80 actual filter transitions;0 console/page/network/HTTP errors,0 context pressure/already-lost; served hashes stable |
| [Scrollbar](../../.tmp/mobile-skeleton-correction/c06u-scrollbar.log) |405 states PASS: Chromium153/Firefox155/WebKit26.6/Chrome154.0.8037.57/Edge154.0.4258.37 |
| [Smoke](../../.tmp/mobile-skeleton-correction/c06u-cross-browser.log), [menu isolated](../../.tmp/mobile-skeleton-correction/c06u-menu-isolated.log) |21/21 smoke; WebKit advertising error đã hết. Menu28 geometry/10flows/2textzoom PASS, exact reference dimensions/tolerance giữ |
| [Android portrait](../../.tmp/mobile-skeleton-correction/android-2026-09-27T14-08-47-330Z/analysis.json), [landscape](../../.tmp/mobile-skeleton-correction/android-2026-09-27T14-00-06-002Z/analysis.json) | Galaxy A05s Android15/Chrome153.0.8010.52, source d434;3footer↔grid cycles mỗi chiều;471/780samples,872/494common pairs,0resets;145requests mỗi chiều,0console/network/HTTP errors |

Hai Android captures giữ metadata/assets hash, isolated DOM/CSS identities,
native-touch actions, events và9 PNG mỗi chiều. Visual viewport portrait
782.48↔838.48 và landscape331.43↔387.43 cho thấy toolbar thực đổi height.
Main đã xem09-settled PNG cả hai chiều; shell/glass/footer không có white gutter
trong captures. Đây functional/screenshot evidence, không FPS hoặc hero-landscape
visual acceptance. Source d434 không đổi sau capture.

### Fixture corrections và raw failures

Mask oracle theo radial CSS frozen và same-pool photo Back/Forward giữ batch
theo accepted P7.4; raw `c06-continuation.log`, `c06-continuation-r8.log` giữ.
R4 đo mọi DOM frame cùng intersect/running, không đòi mọi rect nằm hoàn toàn
trong viewport; không thay R10 remaining-tail/CTA/footer oracle. Glass full-bleed
so với root client width; native classic gutter được ghi riêng, tolerance1px
và zero overflow giữ. Firefox native-control window sống tới browser teardown
để tránh last-window removeBrowserContext lỗi trước assertion.

[Height counterexample](../../.tmp/mobile-skeleton-correction/height-geometry-2026-09-27T14-10-27-075Z/results.json)
xác nhận removed slot0:2 có old top14302.8≥new boundary14282.64, đúng tail
membership; fixture cũ đòi mọi old slot tồn tại là sai. Current fixture kiểm
EVERY removed slot ngoài boundary, EVERY common node/assignment/deck giữ,
visible opacity premise settled và real-grid coordinate hash giữ nguyên khi
height-only; CTA boundary đổi được ghi riêng, không bỏ reset oracle.

Handoff observer theo outer frame childList/backend, đọc leased canvas hiện hành;
observer trên static placeholder cũ không nhận canvas replacement. [Geometry3 seeds](../../.tmp/mobile-skeleton-correction/c06-handoff-geometry.json)
xác nhận +500/+650 và DOM index2/4 không bảo đảm renderer exit trong random grid:
có run tại+650 hai old leases vẫn visible, bottoms29.875/35.89, card thứ năm
static đúng contract. Current fixture dùng actual bbox, reachable scroll và
fresh none→webgl; giữ fade0.1–0.9, reduced≥.99/0animations, context≤2 và
reverse oncefade1 sau actual scroll/bbox+2RAF+340ms. Scene qualification tối đa8
fresh visits, ghi mọi geometry trước input; không sửa seed hoặc retry assertion
failure. [Ba qualified handoffs](../../.tmp/mobile-skeleton-correction/handoff-qualified-2026-09-27T14-38-35-623Z.json)
PASS; [scene premise RED](../../.tmp/mobile-skeleton-correction/c06-handoff-qualified.json)
vẫn giữ. Coverage chỉ các scene đủ premise, không mọi random seed.

[Menu raw failure](../../.tmp/mobile-skeleton-correction/c06u-menu.log) đo head254.91
thay226.97 tại320px khi suites chạy cùng lúc. [Settle probe](../../.tmp/mobile-skeleton-correction/c06-menu-settle.json)
và isolated full suite đạt exact226.97; nguyên nhân failure đầu chưa xác định.
Không sửa CSS/test constants hoặc nới tolerance; raw failure không bị xóa.

### Performance và gate còn mở

[Software-headless RED](../../.tmp/mobile-skeleton-correction/continuation-2026-09-27T13-47-21-640Z/results.json)
giữ R4 mỗi renderer14.42fps; CDP SystemInfo xác nhận SwiftShader/SwANGLE.
Native Chrome154 headed dùng ANGLE/NVIDIA RTX3090 D3D11, không ép flags,
giảm resolution, shader hoặc số renderer. [Native run trước fixture cuối](../../.tmp/mobile-skeleton-correction/continuation-2026-09-27T14-26-56-750Z/results.json)
R4 tất cả11renderer85.006fps và R10 profile median84.961fps,0 measured long
task, mobile2contexts; overall FAIL tại old second-handoff premise, không retag PASS.
[Continuation với fixture cuối](../../.tmp/mobile-skeleton-correction/continuation-2026-09-27T14-39-00-829Z/results.json)
Chrome154.0.8037.57 headed,11renderer R4 đều85.088fps; R10 ba lượt
85.038/84.934/84.956fps, median84.956, long-task API có và0 measured task,
mobile2contexts. Handoff down/midfade-reduced/reverse đạt, oncefade1; scene1attempt.
Overall **FAIL** sau fresh reduced reload rồi no-preference tại
`ready():62`, caller1112: predicate bắt first DOM frame có `is-looping` timeout30s.
Giả định first static nhưng hai renderer khác vẫn chạy đã được kiểm bằng
[bounded3 native scenes](../../.tmp/mobile-skeleton-correction/review/ready-first-frame-2026-09-27T14-44-57-178Z/results.json),
SHA `e492e1952ee54d17a6d2d6dbd2e1f7f7aa9e5ee49127afb7755175ba83f647e4`.
Không tái hiện hypothesis đó: cả3 fresh reduced reload→no-preference→center
có0 looping/backend WebGL trong khoảng1.02s, first visible opacity giảm về0;
normal initial có2 looping. Errors0, hashes stable. Probe ngắn chưa correlate
body hidden/startup/overlay gates hoặc toàn30s; nguyên nhân resume chưa rõ,
không được gọi đây chỉ là fixture defect hoặc runtime đã sửa. Main dừng sửa
sau ba full corrective runs chưa đạt theo AGENTS; giữ raw failure và mở gate
chẩn đoán fresh reduced resume. Không nới threshold hoặc gọi partial performance PASS
thành full continuation PASS. R10 là360×800/DPR3 emulation trên desktop GPU,
không thay Galaxy A54 thật hoặc FPS A05s physical.

Chrome DevTools MCP list_pages hoạt động; navigate task-owned page3 timeout10000ms,
vẫn about:blank. Fresh isolated new_page attempt không trả kết quả và exec cell
đã terminate; outcome external unknown. UI QA MCP layer **blocked**, không dùng
Android CDP/Playwright để gọi layer đó PASS hoặc retry mù. Computer Use không
được kích hoạt vì không có human-path Windows UI cần riêng.

Main/combined source-test review Required0 scoped; reverse snapshot finding đã
xử lý bằng actual-state/settle guard. Full continuation failure vẫn là gate
chưa xử lý; scoped review không đóng C06/C07 hoặc UI QA. Final docs review
Required0 trong8 owning records;222 local links/anchors và glossary đã kiểm.
Android raw samples có tối đa2 WebGL/running mỗi orientation. Card Notion
đã update/fetch verify3 đoạn progress, vẫn In progress. Current partial pointer
`.tmp/mobile-skeleton-correction/C06-current.json` giữ source/docs/tests và
proof copies với SHA-256; previous C05R/C05 RED pointers không overwrite,
primary/recovery/pause hashes bằng preflight. [Impeccable detect](../../.tmp/mobile-skeleton-correction/c06-impeccable-detect.log)
có10 advisory trong design accepted; không đổi font/spacing/marquee ngoài scope.
iPhone physical, A54 performance, owner visual/reference toàn scope và landscape
title/filter/header overlap/button content còn mở; landscape/nút cần delta/plan riêng trước code.
Recovery/P11 paused; chưa commit/push/deploy hoặc full-site/Espacio PASS.

## Owner acceptance A54 — 2026-09-27

Owner xác nhận trên preview local8792: “xác nhận trên A54 đã hết lỗi batch
skeleton card reload khi cuộn footer <-> gird.” Acceptance này đóng riêng
triệu chứng skeleton reload trong thao tác footer↔grid trên A54 theo báo cáo
của owner. Không có trace A54 mới hoặc browser/OS version kèm xác nhận này;
không suy thành nghiệm thu FPS, mọi orientation, iPhone hoặc toàn website.

Raw USB/CDP trước đó vẫn là Galaxy A05s `SM-A057F`, Android15/Chrome153;
không đổi identity thành A54. Source candidate vẫn là catalog d434, không
sửa runtime để ghi acceptance. Checkpoint C06U partial và raw full continuation
failure phía trên giữ nguyên; focused acceptance không đóng C06/C07 toàn gate.

Owner yêu cầu discovery riêng cho ổn định viewport/layout mobile toàn website
Safari/iPhone và Chrome/A54, cùng feedback viewer/motion/glass/paragraph
Advertising. [Map mở rộng](../specs/mobile-browser-parity-capability-map.md#feedback-viewer-và-mobile-toàn-website--map-chờ-duyệt)
giữ intent, boundary và gate mới; recovery/P11 tiếp tục paused.

## Chú thích thuật ngữ

- **Common visible slot**: cùng slot còn giao viewport trong các mẫu liên tiếp.
- **Lease**: quyền dùng tạm một context; quyền sở hữu native resource tách khỏi card.
- **Feasibility**: chứng minh hướng làm khả thi, chưa đạt toàn acceptance.
- **Coalesce**: gộp nhiều scroll updates thành một lần lưu latest snapshot.
- **Inference**: suy luận từ evidence, chưa là nguyên nhân đã chứng minh.
