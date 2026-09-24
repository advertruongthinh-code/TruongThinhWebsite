# Phase A static motion inventory Espacio và Trường Thịnh

## 1. Kết quả

Scanner deterministic đã chạy trên archive cố định và closed-world first-party
source boundary. Phase A đạt các gate accounting: resource equations cân bằng,
content-variant scan bao phủ mọi successful variant, candidate equations cân bằng,
và <code>U=0</code>. CSV là candidate ledger authoritative; raw resource rows vẫn chỉ ở
<code>research/reference-site/archive/manifest.jsonl</code>.

## 2. Resource accounting

Archive snapshot captured between <code>2026-08-08T18:41:03.966Z</code> and <code>2026-08-08T20:01:00.091Z</code>. Đây là
fixed captured corpus, không phải current live Espacio.

| Equation | Value | Basis |
| --- | --- | --- |
| R_total | 6100 | manifest.jsonl raw rows |
| R_success | 6054 | status 2xx |
| R_failure | 46 | status non-2xx |
| R_unique_url | 5855 | normalized URL |
| R_duplicate_occurrence | 245 | R_total - R_unique_url |

Verified invariants: <code>R_total=6100</code>, <code>R_success=6054</code>, <code>R_failure=46</code>,
<code>R_unique_url=5855</code>, <code>R_duplicate_occurrence=245</code>.

## 3. Content-variant inventory

Identity: normalized URL + status + content hash + content type. Successful
variants: **5809**; duplicate occurrences remain represented only by
the manifest accounting. Every successful variant was read, hash/byte checked
against the manifest, then assigned one scan status:

| Scan status | Variants |
| --- | ---: |
| parsed textual content | 264 |
| binary/static exclusion | 5545 |
| parse-failure sentinel | 0 |
| **total classified successful variants** | **5809** |

Successful variants by content type:

| Content type | Variants |
| --- | ---: |
| application/font-woff | 5 |
| application/javascript | 2 |
| font/woff2 | 5 |
| image/jpeg | 5122 |
| image/png | 407 |
| image/webp | 6 |
| text/css | 2 |
| text/html | 257 |
| text/plain | 2 |
| text/xml | 1 |

No raw manifest row was copied into this report or CSV.

Embedded block scan coverage (document-relative offsets and line/column metadata
are retained in the candidate ledger):

| Boundary | HTML units | Embedded <code>&lt;style&gt;</code> blocks scanned | Inline <code>&lt;script&gt;</code> bodies scanned |
| --- | ---: | ---: | ---: |
| Espacio archive successful HTML variants | 257 | 2697 | 256 |
| Trường Thịnh closed-world HTML source files | 5 | 0 | 10 |
| **Total** | **262** | **2697** | **266** |

## 4. Candidate taxonomy

Candidate identity is stable: archive candidates use system + normalized resource
URL + content hash + signal kind + byte range; Trường Thịnh candidates use relative
source path + content hash + signal kind + byte range. Exact same-kind/same-range
signals are deduplicated; line and column are metadata only.

| Equation | Value | Meaning |
| --- | --- | --- |
| A | 28215 | A_M + A_I + A_X + A_F |
| A_M | 13232 | visible motion candidates |
| A_I | 14962 | non-visible interaction candidates |
| A_X | 21 | explicit exclusions, including vendor references |
| A_F | 0 | parse-failure sentinels |
| P | 13232 | statically classified motion-capable candidate; not runtime effect proof |
| U | 0 | unresolved motion candidate; Phase A gate requires zero |

The ledger contains **28215** unique stable candidate IDs.
<code>A_M=13232=P(13232)+U(0)</code>.
<code>P</code> means a statically classified motion-capable candidate, not proof of a
visible runtime effect. Phase B owns visible-effect confirmation.

## 5. Scanner boundary and classification rules

- Espacio input: archive manifest plus local files referenced by successful rows.
  HTML/CSS/JS/XML/plain text are parsed; image/font and other binary resources are
  scanned for integrity then explicitly excluded from text motion parsing.
- Trường Thịnh input: every <code>src/site/**/*.html</code>, <code>src/site/**/*.css</code>,
  <code>src/site/**/*.js</code>, and <code>src/worker/index.js</code>. Tests are evidence/harness,
  not production candidates.
- Enumerated signals include CSS transition/animation/keyframes/reduced-motion,
  explicit inline motion hooks, GSAP, Barba, Locomotive, requestAnimationFrame,
  timers, observers, scroll state, DOM mutation and event/pointer/keyboard hooks.
  Generic selectors do not prove motion; they are <code>A_I</code> interaction candidates.
- Additional deterministic surface coverage includes CSS <code>@media</code>,
  scroll-snap and focus/focus-within selectors; JavaScript animation/timer cancel,
  media play/pause/autoplay, stylesheet mutation, direct style assignment and
  pointer/touch cancel; HTML inline style/on* attributes, stylesheet/script refs,
  audio/video/iframe, dialog and explicit scroll-container hooks. HTML documents
  additionally scan each embedded <code>&lt;style&gt;</code> body as CSS and each
  inline non-<code>src</code> <code>&lt;script&gt;</code> body as JS; external script
  tags remain resource references.
- Vendor libraries are <code>A_X</code> with an exact exclusion reason. Parse errors create
  one <code>A_F</code> sentinel instead of being silently dropped.

Trường Thịnh source files:

| Source | Bytes | SHA-256 | Candidates |
| --- | ---: | --- | ---: |
| [src/site/about/index.html](../../src/site/about/index.html) | 35892 | d828915a091f64895da42ee6dcda9809e391c3c005c665d5d69c9e47e16667ca | 93 |
| [src/site/commercial/index.html](../../src/site/commercial/index.html) | 35911 | 8f235707c12a36f5683644cd0118bf0ac6d78bfc3a764d203eb84471e371fe81 | 77 |
| [src/site/detail.css](../../src/site/detail.css) | 24000 | 50f1ba55879b15ace5f8c516129625033afaca113051704be5c3a60f8eebcbad | 45 |
| [src/site/detail.js](../../src/site/detail.js) | 16497 | 0e621b6964b45fb4a25a936257d9017689dce2e5f9bf8173944677844f1da2ce | 66 |
| [src/site/index.html](../../src/site/index.html) | 42325 | e46dcb59e72111e11f2a70e528f80cced7410b8f8d3b0c7f5c972c5726ed09b0 | 42 |
| [src/site/motion.js](../../src/site/motion.js) | 49124 | 0dbde2ddb94858b6f1a1fd7584ae621bc42fc5ff4bca2731a3acc76f9956e759 | 225 |
| `src/site/products.js` (path lịch sử, không còn trong source hiện hành) | 3573 | 40a3feb6db18409b4218f320396f43ebc029863902bb2e4d6d229cd262ff96ef | 17 |
| `src/site/projects-products/index.html` (path lịch sử, không còn trong source hiện hành) | 32637 | 27b33ad8d61782cc02c8fda0f07ddf91bd668d3a74e707d7c0cb8093fc8a73a3 | 72 |
| [src/site/residential/index.html](../../src/site/residential/index.html) | 39538 | f485776e58e1b99ccb260417a41af181e44a3931a6abd294e10a3ca9e6722c31 | 84 |
| [src/site/style.css](../../src/site/style.css) | 41113 | aa09fdb00c133b4f48cc609d5aac5fe7b956f1aff792fdefe49cf117566bcc66 | 112 |
| [src/worker/index.js](../../src/worker/index.js) | 41885 | cab28f76744f93c77f2245baff5374a2ab5c8f58fa072d148296b01a674bc898 | 5 |

## 6. Archive/live boundary

Archive numbers above describe the local capture only. Live Espacio observations
in the parity report are timestamped coverage of measured routes/viewports and
must not be read as whole-site exhaustiveness. The sitemap's legacy host is
provenance evidence, not proof that every archived URL is current live behavior.

## 7. Blockers and Phase B handoff

- Graphify primary structural query succeeded with fresh AST evidence; semantic
  extraction stayed pending and was not updated. A later worker sandbox attempt
  hit access denied while writing <code>.tooling/logs</code> and acquiring
  <code>.tooling/state/graphify/graphify.lock</code>; this is an attempt-local
  sandbox issue, not a general Graphify blocker. No lock or cache was changed by
  this Phase A worker. Serena remained active with <code>codex</code> context and
  ready language servers.
- Runtime is out of scope here. Phase B must measure candidate visibility/effect,
  interaction transitions, route/menu timelines, reduced-motion behavior, and
  representative live route coverage with fresh runtime evidence.
- Phase B must preserve archive/live distinction and report failures as environment
  blockers when a server or browser connection dies; do not label that a product
  failure without a product observation.

Reproduce:

~~~powershell
node scripts/tooling/inventory-motion-audit.mjs
~~~

Outputs: [candidate ledger](research-espacio-motion-candidates.csv), this report,
and no archive mutation.

## Chú thích thuật ngữ

- **Resource occurrence**: một raw manifest row.
- **Content variant**: cùng normalized URL, status, hash và content type.
- **Candidate**: một deterministic static motion or interaction signal.
- **A_X**: explicit exclusion with a recorded reason.
- **A_F**: parse-failure sentinel.
- **P/U**: <code>P</code> is a statically classified motion-capable candidate,
  not runtime effect proof; <code>U</code> is unresolved static motion state and
  Phase A requires <code>U=0</code>.

<!-- motion-audit-phase-b:start -->
## Phase B applicability and obligation matrix

Generated from Phase A ledger hash `8c837a8e78f4819b320015068c0d6a0458d7e8172b27a71feee00047ae36b8ea`. Generator verifies `A_M=13232`, `A_I=14962`, `A_X=21`, `A_F=0`, 28,215 unique candidate IDs, and writes exactly one map row per `A_M` candidate.

- Candidate map có **44** target-specific runtime candidate, **315** local
  binding-blocker candidate và **12.873** archive binding-blocker candidate;
  tổng đúng **13.232** `A_M`. Invariant xác nhận 0 target signature trống, 0
  dangling obligation reference và local blocker `candidate_count=315`.
- Local runtime: **616** atomic obligation. Nav tách hover/focus; toggle tách
  hover/focus/press; menu và header tách từng state; gallery tách
  `drag`/`cancel`/`touch`; route tách `direct`/`soft`/`history`/`bfcache`/
  `fail-open`.
- Blocker rows: **34** local static binding, **1.400** archive static binding và
  **80** Espacio live snapshot. Live snapshot không có target/action giả và không
  được tính là motion hoặc reduced-motion confirmation.
- Exact `C=2130`. Candidate mapping dùng source target signature; không map mọi
  transition trong `style.css` thành nav underline.
- Mỗi obligation có contract fingerprint bind target, action, timing, scenario,
  route, template, locale, viewport, preference, lifecycle và source. Runtime
  capture DOM fingerprint ngay sau navigation, trước target resolution; 0 local
  runtime row thiếu DOM provenance. Resume yêu cầu contract + DOM + runner/schema.

CSV outputs: [candidate map](research-espacio-motion-candidate-map.csv) and [obligations](research-espacio-motion-obligations.csv).
<!-- motion-audit-phase-b:end -->

<!-- motion-audit-runtime:start -->
## Phase C-E runtime, Computer Use và closure

### Kết quả matrix

Full V2 run đã ghi đủ **2.130/2.130** obligation, unique ID khớp 1:1 với
matrix, không có row thiếu/thừa, không có `inferred` hoặc `not_measured`, và mọi
artifact ref đều tồn tại và parse được. Fresh review giữ semantic acceptance vì
`header-collapse`, mobile `route-soft`, `focus-order` và `pointer-threshold` còn
gộp setup với measured action; V3 đang tách bốn protocol này:

| System/lane | Confirmed | Blocked | Total |
| --- | ---: | ---: | ---: |
| Trường Thịnh runtime | 429 | 187 | 616 |
| Trường Thịnh static binding | 0 | 34 | 34 |
| Espacio live snapshot, allowlist 8 URL | 0 | 80 | 80 |
| Espacio archive static binding | 0 | 1400 | 1400 |
| **Tổng** | **429** | **1701** | **2130** |

Runtime blocker theo scenario: `gallery-touch=20`; `header-collapse=4`;
`header-hide=20`; `header-show=20`; `header-tone=4`; `media=20`;
`projects-filter=20`; `route-bfcache=20`; `route-fail-open=20`;
`route-history=20`; `toggle-hover=19`. `blocked` không đồng nghĩa product defect.
34 local static blocker row đại diện đúng **315 candidate**.

Các review target đã được đo riêng: nav hover `8/8 confirmed`, nav focus `8/8`;
gallery cancel `20/20` với precondition active drag và post-cancel cleanup;
toggle focus `20/20`, press `20/20`, hover `1/20`. Preference split local:
`no-preference` có `211 confirmed / 97 blocked`; `reduce` có
`218 confirmed / 90 blocked`. Không có live motion-confirmed row.
Computer Use representative proof bên dưới chỉ bổ sung một desktop human-input
path, không thay đổi trạng thái atomic row ở viewport/preference khác.

### Browser QA độc lập

`pnpm qa:site` với `BASE_URL=http://127.0.0.1:8787` chạy bằng system Chrome:
**81/94 pass, 13 fail**. Cả 25 smoke route/viewport row và 5 local reduced-motion
row tại `390x844` pass. Motion-related failures cần giữ:

- about hero và about parallax media bị jump khi physical wheel;
- delayed-detail filter tại `1440x900` inert hoặc duplicated;
- runtime-claim locale fail-open timeout;
- home mask/project-hover contract còn render portal subtitle.

Các failure còn lại là 5 header-route expectation về about topic URL và 3 SSR
CMS hydration overwrite. Report máy: `tests/site/reports/latest.json`.

### Computer Use representative path

Chrome tại `http://127.0.0.1:8787/vi/` đã được thao tác trực tiếp:

1. Menu mở bằng click và đóng bằng Escape sau transition.
2. Từ đầu trang, scroll xuống làm navbar đổi sang tone scrolled/collapse; scroll
   sâu hơn làm navbar ẩn; scroll ngược lên làm navbar hiện lại; về top khôi phục
   overlay state.
3. Motion toggle đổi accessible label từ `Tạm dừng chuyển động` sang
   `Tiếp tục chuyển động`, rồi đổi lại khi resume.

Evidence: [Computer Use local human path](../../research/reference-site/runtime-evidence/computer-use-local-human-path.json).
Screenshot được render trong task conversation, không được xuất thành file; lane
này không claim focus-return vì Chrome báo focus ở address bar sau Escape.

### DevTools representative measurements

- Local `/vi/`, `1440x900`: header cao `102.515625px`; nav underline `::after`
  chuyển scaleX `0 → 1` trong `0.3s cubic-bezier(0.4,0,0,1)`; hai marquee
  animation đang `running`.
- Console local: `0` error/warning/issue. Network: `28/28` request thành công.
- Performance trace local: LCP `1414ms`, TTFB `18ms`, render delay `1396ms`,
  CLS `0.00`. DevTools chạy trace thành công nhưng từ chối ghi trace file ngoài
  MCP workspace, nên các số này là observation trong task, không có raw trace ref.

### Bổ sung card dự án Espacio ngày 2026-08-30

Phép đo bổ sung dùng Chrome DevTools trong profile cô lập tại
`https://espaciohomedesign.com/en/projects`, viewport `1440x900`. Phạm vi chỉ
gồm card của lưới dự án, lazy-load, hover và đổi filter; không thay đổi matrix
V2 hoặc nâng báo cáo tổng thể thành PASS.

Source live và bản cào ngày 2026-08-08 khớp byte-for-byte:

| Resource | Bytes | SHA-256 | Kết quả |
| --- | ---: | --- | --- |
| `/en/projects` | 133413 | `ab163fce947bdbcf9ee800fbc88bf8dcf7ab49bcbed3f748fa19d63b0f3e4ac5` | exact |
| `/js/main.min.js?v=0.021` | 345871 | `91f971d6f6a2f9829660f9422789ed6fb311fa915040820d16dd192ecf6b064c` | exact |
| `/css/main.min.css?v=0.021` | 88212 | `b3cb9abf01889550121da4ebd11513ec4d7cc746f4a2672ba3d76871451c1296` | exact |
| `/js/vendor/masonry/masonry.pkgd.min.js` | 24103 | `367d6afdfc741fb48d2d9310e47c3924b693459a74c882c0fc545ec5ed7d55d2` | exact |

Manifest provenance nằm tại
[`manifest.jsonl`](../../research/reference-site/archive/manifest.jsonl), dòng
142, 6047, 6089 và 6090. HTML bản cào khai báo Masonry bằng
`itemSelector: ".masonry-item"`, `columnWidth: ".grid-sizer"`,
`gutter: ".gutter-sizer"` và `percentPosition: true` tại
[`en/projects/index.html`](../../research/reference-site/archive/site/en/projects/index.html),
dòng 463–470.

Kết quả code live, code bản cào và runtime thống nhất:

- Ảnh card không có motion gắn trực tiếp với việc vào hoặc rời viewport.
  LazySizes đổi ảnh từ `opacity: 0` sang `opacity: 1` bằng
  `transition: opacity 0.6s ease-out`; ảnh được nạp sớm trước khi chạm viewport.
  Sau khi card rời viewport rồi quay lại, ảnh giữ `opacity: 1` và không replay.
- Hover phóng `.img-content` từ `scale(1)` lên `scale(1.15)` trong
  `0.6s ease-out`. Gạch chân card đổi `scaleX(0)` sang `scaleX(1)` trong
  `0.3s cubic-bezier(0.4, 0, 0, 1)`.
- `initProyectos()` ẩn card không khớp bằng `display: none`, hiện card khớp bằng
  `display: block`, rồi gọi `msnry.layout()`. Card bị loại biến mất ngay, không
  có exit fade. Card còn lại morph sang vị trí mới bằng `transform` trong
  `0.4s ease`, delay `0ms`, không stagger; container đổi chiều cao ngay.
- Khi quay về `View all`, card được hiện lại và Masonry morph từ vị trí cũ sang
  vị trí mới bằng cùng contract `0.4s ease`. Phép đo đại diện ghi card Ivory đổi
  `top: 352.969px` thành `top: 0px`, hoàn tất và dọn inline transform sau khoảng
  `420ms`.
- Source Espacio không có nhánh `prefers-reduced-motion` cho contract này. Đây
  là hành vi tham chiếu, không phải lý do bỏ reduced-motion fallback ở Trường
  Thịnh.

Vì vậy, cụm từ “copy 1:1 motion card Espacio” chỉ bao gồm lazy-load fade, hover
zoom, gạch chân hover và Masonry position morph khi filter. Motion khi card vào
hoặc rời viewport là phần mở rộng có chủ đích, không phải parity 1:1. Dòng
“Không có live motion-confirmed row” phía trên vẫn mô tả matrix V2 lịch sử;
phép đo bổ sung này là evidence hẹp, độc lập với ledger đó.

### Integrity và khả năng tái lập

- Runtime CSV SHA-256:
  `10ac7de957db81720cb1390138ed59c2131e42bbb3327074d84e9cf562b70521`.
- Phase A ledger SHA-256:
  `8c837a8e78f4819b320015068c0d6a0458d7e8172b27a71feee00047ae36b8ea`.
- Obligations SHA-256:
  `8715cbead2caf3bd75309e072fc081a94fe1a53520ef33ef29131deeba603a14`.
- Candidate map SHA-256:
  `49766b357d59e25846f4b701b56194cf36fb99fdac6779816f4e81a48330e465`.
- Runner SHA-256 tại full-run completion:
  `c3a24ad3c510aeafbd992f5f39bd96cdbcb27cc00a939f82015f8eb0a3dfb320`.
- Schema hash:
  `5f7c4ace1529d0bcb4e9fd37c9d8a9ee6194647f5bae36406876101ff2c32e4b`.

V2 outputs under atomic repair: [runtime ledger](research-espacio-motion-runtime.csv),
[obligations](research-espacio-motion-obligations.csv), [candidate map](research-espacio-motion-candidate-map.csv),
artifact tree `research/reference-site/runtime-evidence/`. Arithmetic accounting
closed; semantic closure chờ V3 rerun, acceptance-ready không đạt vì còn blocker.
<!-- motion-audit-runtime:end -->

## Chú thích thuật ngữ

- **Masonry**: thuật toán xếp card nhiều cột theo chiều cao còn trống.
- **Lazy-load**: nạp media khi media tiến gần vùng người dùng đang xem.
- **Morph**: chuyển động giữ liên tục vị trí khi layout đổi.
- **Reduced motion**: chế độ giảm chuyển động theo preference của hệ điều hành.
- **Viewport**: vùng nội dung đang nhìn thấy trong cửa sổ trình duyệt.
