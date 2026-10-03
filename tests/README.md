# Bộ browser smoke của Trường Thịnh

`site.e2e.cjs` chạy Chromium thật bằng Playwright, không cần test runner riêng.
Bộ test bao phủ public route ở nhiều viewport, tải image sau khi cuộn từng bước,
lỗi console/network, horizontal overflow và interaction chính. Static phase dùng
Node server của repository; không cài hoặc khởi động Wrangler.

## Chạy chuẩn

Scrollbar correction27/09 có focused gate riêng sau build và preview8792:

```powershell
$env:BASE_URL = "http://127.0.0.1:8792"
node tests/site/scrollbar-parity.e2e.mjs
```

Suite mặc định kiểm Chromium/Firefox/WebKit và installed Chrome/Edge; dùng
`SCROLLBAR_ENGINES` để chọn subset khi debug, không thay kết quả full matrix.
Suite kiểm desktop input/state, native/reduced/fail-open,
menu/viewer lock và VI/EN responsive matrix. `PLAYWRIGHT_BROWSERS_PATH` có thể
trỏ runtime pinned đã cài ở checkout khác. Engine emulation không thay Android
hoặc iPhone thật; contract và evidence nằm trong brand-shell spec. Native width/color
so với unstyled control cùng engine; property không hỗ trợ giữ giá trị rỗng,
không gọi headless appearance là nghiệm thu native indicator trên thiết bị thật.

Skeleton C06U đã được owner duyệt27/09: uniqueness theo logical deck12,
common assignment/reveal/phase giữ qua resize; không gom hai deck thành một
batch khi số DOM frame giảm. Continuation chạy functional matrix và probe
R4/R10, ghi source hashes/browser/channel/headed mode cùng raw result:

```powershell
$env:BASE_URL = "http://127.0.0.1:8792"
$env:PLAYWRIGHT_BROWSERS_PATH = "E:/TruongThinh-Website/.tooling/browsers"
$env:CONTINUATION_HEADED = "1"
$env:CONTINUATION_CHANNEL = "chrome"
node tests/site/advertising-continuation.e2e.mjs
```

Đo performance riêng, không chạy browser suite/capture khác đồng thời. R4 dùng
1569×912, tất cả DOM frames intersect và renderer running/WebGL; ghi full-rect
visibility riêng, kiểm paint/FPS từng renderer và long task5s. R10 profile
360×800 DPR3 chạy3×5s; đây là emulation, không thay A54 physical. Kiểm GPU
backend thực của browser, không ép browser flags hoặc đổi shader/resolution.
Default headless shell có thể dùng software backend; failure FPS giữ nguyên,
không gọi một probe hardware là PASS cho software backend. Gutter native được
ghi riêng: full-bleed glass so với root client width; giữ tolerance1px và zero
horizontal overflow. Firefox native-control window sống tới browser teardown
để tránh last-window context-close lỗi trước assertion.

Height-only lifecycle kiểm các common slots tại mỗi resize liền kề; removed
slot phải có old top ngoài new boundary. Không giả mọi tail slot tồn tại khi
CTA boundary đổi. Handoff quan sát outer frame và actual leased canvas;
input dùng bbox/scroll range, cấm DOM index/offset cố định cho random grid.
Scene qualification bounded8 fresh visits ghi mọi attempt trước input, không
retry runtime assertion; reverse quan sát sau actual scroll và fade window.
Current continuation vẫn FAIL tại first-DOM-frame `ready()` predicate;
[report correction](../docs/verification/mobile-skeleton-correction-2026-09-27.md)
giữ exact line/hash/raw và gate, không xem focused FPS/handoff là full PASS.

```powershell
pnpm dev
```

Terminal khác:

```powershell
$env:BASE_URL = "http://127.0.0.1:8787"
node tests/site/site.e2e.cjs
```

Luôn đặt `BASE_URL`: `pnpm dev` phục vụ cổng 8787, còn default trong code là
4173. Worker trust-boundary fixture chạy không cần Wrangler, D1, R2:
`pnpm qa:worker:security`. `qa:worker:static` và Worker contract đầy đủ thuộc
CMS phase; chỉ chạy sau owner gate mở CMS và Worker runtime được pin lại.

## Gate regression trước release

Sau `pnpm prepare:site`, giữ `pnpm dev` tại 8787 và chạy
`pnpm qa:release-regressions` (tuần tự):

| Suite | Contract bảo vệ |
| --- | --- |
| `static-locales.test.mjs` | HTML VI/EN build khớp locale transform của preview |
| `advertising-full-span-p72.e2e.mjs` | Primary full-span vừa viewport dưới navbar, đúng ratio và vùng blur |
| `advertising-no-titles.e2e.mjs` | Không tái xuất hiện caption/title ảnh đã bỏ |
| `advertising-suggestion-conditional.e2e.mjs` | Resize split/full-span giữ node, focus, vị trí gợi ý |
| `advertising-suggestion-info.e2e.mjs` | Tag, bàn phím, history, phân trang mô tả khi text zoom |
| `shared-header-bottom-p7-1.e2e.mjs` | Navbar không tự expand ở cuối trang VI/EN |
| `shared-header-single-line.e2e.mjs` | Ẩn mục navbar khi không vừa một hàng |

Các suite có consumer release; không xóa. Gate hẹp không thay full-site parity.

## Gate tập trung Sản phẩm quảng cáo

Giữ `pnpm dev`; mỗi gate chạy trong terminal mới, đặt `BASE_URL` và chỉ bật
một flag `*_ONLY` để tránh chọn nhầm gate.

| Flag | Lệnh | Kiểm |
| --- | --- | --- |
| `TT_E2E_ADVERTISING_GRID_ONLY=1` | `pnpm qa:site` | Margin/gap `15/25/35px`, trần `1500px`, `2–4` cột, breakpoint `-1/0/+1px`, geometry oracle, overflow |
| `TT_E2E_ADVERTISING_MEDIA_ONLY=1` | `pnpm qa:site` | Số card theo `expectedCounts` trong suite, DOM bounded, lazy request theo virtual window, remount/focus |
| `TT_E2E_ADVERTISING_MEDIA_ENTRANCE_ONLY=1` | `pnpm qa:site` | Image-only `0.6s ease-out`, không replay khi remount, reduced motion, route enter Home/Back/Forward |
| `TT_E2E_ADVERTISING_3K_ONLY=1` | `pnpm qa:site` | Fixture natural ratio, explicit canvas, virtual window `2800–2820` |
| `TT_E2E_ADVERTISING_PROOF_ONLY=1` | `pnpm qa:site` | No-op scroll counter layout, filter morph, cohort union, pending-scroll catch-up |
| `TT_E2E_ADVERTISING_COMPATIBILITY_ONLY=1` | `node tests/site/site.e2e.cjs` | Sáu slug VI/EN, query cũ, fallback không JavaScript |
| `TT_E2E_P13_NAVBAR_ONLY=1` (+ `TT_E2E_P13_CASE`) | `node tests/site/site.e2e.cjs` | Re-click top, full menu, detail về parent, collapse/hide/reveal |
| `PHOTO_VIEW_P13_GEOMETRY_ONLY=1` | `node tests/site/advertising-photo-view.e2e.mjs` | Khối detail, vùng gợi ý, mô tả dài, chữ 200% bằng CSS |
| `PHOTO_VIEW_SCROLLBAR_REGRESSION=1` | `node tests/site/advertising-photo-view.e2e.mjs` | Thanh cuộn thật quanh 750/960/1200 px, related không overlap |
| `PHOTO_VIEW_ONE_COLUMN_REGRESSION=1` | `node tests/site/advertising-photo-view.e2e.mjs` | Policy một cột, natural ratio, không lựa chọn Auto/1/2 |
| `PHOTO_TRANSITIONS_P13_GATE=1` | `node tests/site/advertising-photo-transitions.e2e.mjs` | Chỉ position/morph/timing |

Mode `RAPID_FILTER`, `LOCALE_LIFECYCLE`, `HISTORY`, `SELECTION`, `DEFAULT`,
`REDUCED` giữ regression motion, pending scroll, focus, lifecycle.
`CAROUSEL_ONLY` là alias compatibility cũ. Photo-view gate thường thêm
`PHOTO_VIEW_ENGINES=chromium`; mỗi run dùng `PHOTO_VIEW_OUTPUT_DIR` hoặc
`PHOTO_TRANSITIONS_OUTPUT_DIR` riêng dưới `.tmp/`. Node unit:
`node --test tests/site/advertising-photo-layout.test.mjs` và
`tests/site/advertising-one-column.test.mjs`.

Không flag, transition suite kiểm identity/morph, Back giữa animation, ảnh
chậm, dependency lỗi; viewer suite kiểm ba engine, viewport 320–2560, fit/
cover, pan, focus, reduced motion. Đây là browser emulation, không phải phần
cứng thật. Diễn giải kết quả theo
[photo browse spec](../docs/specs/advertising-photo-browse.md).

## Chạy bằng runtime project-local

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/tooling/run-playwright.ps1 -Suite full
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/tooling/run-playwright.ps1 -Suite smoke
```

Không chạy `npx` với package chưa khóa. Playwright và ba browser engine dùng
version trong lockfile và `.tooling/browsers`. Smoke artifact ghi vào
`%TEMP%/truong-thinh-playwright-smoke`.

## Kết quả

- Report mới nhất: `tests/site/reports/latest.json`; ảnh fail: `tests/site/reports/failures/`.
- Exit code `0` khi mọi check đạt; `1` nếu có failure.

## Release evidence

Playwright là regression layer lặp lại được. UI change và website release còn
cần Playwright live interaction và Chrome DevTools MCP cùng route theo
[evidence rule](../docs/operations/agent-rule-evidence-qa-handoff.md). Computer
Use chỉ dùng khi trigger AGENTS.md rule 5 khớp (cần Windows UI theo human path
mà tool chuyên biệt không đủ). Ghi route, viewport, kết quả, console/network,
accessibility tree, screenshot trong verification report có ngày. Layer bắt
buộc không chạy được thì release blocked, không pass.

## Mobile viewport stability

[Plan V00–V05](../tasks/plan.md#mobile-viewport-stability--plan-chờ-duyệt) đã duyệt;
focused runner3 engines dùng boundary fixture visible metrics, không giả native
toolbar. `setViewportSize` kiểm resize layout thật. Raw timestamp mới tại
`.tmp/mobile-viewport-stability/`; giữ named RED và source/served hashes.

```powershell
$env:BASE_URL = 'http://127.0.0.1:8792'
$env:PLAYWRIGHT_BROWSERS_PATH = 'E:/TruongThinh-Website/.tooling/browsers'
node tests/site/mobile-viewport-stability.e2e.mjs --phase baseline
node tests/site/mobile-viewport-stability.e2e.mjs --phase final
```

Các slice dùng `--scope shell`, `advertising`, `viewer`, `visibility`, `fallback`,
`states` hoặc `matrix` để kiểm
đúng phần vừa sửa; acceptance cuối dùng default `all`. `VIEWPORT_ENGINES`
có thể chọn engine lúc chẩn đoán, nhưng final chạy cả Chromium/Firefox/WebKit.

Recorder Android opt-in, kiểm serial ADB, forward binding, Android-Package và
Android UA trước navigation/input; chỉ attach một tab local8792 và một device authorized:

```powershell
node tests/site/mobile-viewport-android-record.mjs --cdp http://127.0.0.1:9223 --base-url http://localhost:8792 --phase baseline
node tests/site/mobile-viewport-android-record.mjs --cdp http://127.0.0.1:9223 --base-url http://localhost:8792 --phase final
```

`--routes` nhận entrypoint VI/EN phân cách dấu phẩy, bỏ leading slash;
default ghi5 shared templates, một compatibility slug và photo/viewer. Slug
được chờ tại đích category, không coi là canonical detail template. Giữ Chrome
foreground; ba native swipe cycles mỗi route, DOM/CSS/events/network/PNG.
Recorder ghi metrics trước/sau direct và reload từ cả toolbar states; browser
có thể tự mở toolbar khi navigation, phải kiểm raw trước khi nghiệm thu.
Status `observed` chỉ là capture hoàn tất, không tự là geometry PASS.
`--native-pinch` thêm page pinch native2× tại compatibility kiosk-posm VI/EN,
ghi actual scale/offset và visible renderer; không là custom pinch viewer mới.
Text-size runner đổi root font16→32px; không thay accessibility setting thật.
Orientation/model/version thực được lưu; không gọi A05s là A54 hoặc WebKit
là iPhone. Không đổi device settings, Sites, viewport flags hoặc CSS để tạo PASS.

## Layout mobile toàn website

Runner `tests/site/mobile-layout-parity.e2e.mjs` theo [plan L00–L07](../tasks/plan.md#site-mobile-layout-parity--plan-chờ-duyệt).
Ghi source/served/runner SHA, entry/destination, font/layout/visible metrics,
header/title/filter và glyph/ancestor paint clips, console/network/PNG failure.
Rail filter accepted phải đưa từng nút vào vùng nhìn đủ chữ; heading không exempt.
`--scope matrix` chạy22entrypoint×5viewport×2text size×3engine=660ca;
`body` kiểm từng nội dung/rail/control ở10 canonical route trong native,
text200, native-landscape, text200-landscape, reduced, fallback và no-js.
`advertising-states` kiểm All/6category/photo/tag/related/full description
pages/empty tag/viewer/menu/query/focus; `history` kiểm direct/reload/locale
và Back/Forward/breakpoint. `all` chạy các nhóm cùng nhau. `advertising`,
`residential-commercial`, `home-about`, `states`, `interactions` là focused scope.
`LAYOUT_ENGINES`, `LAYOUT_STATE_MODES`, `LAYOUT_STATE_ROUTES`,
`LAYOUT_INTERACTION_WIDTH=390|838`, `LAYOUT_INTERACTION_FONT=16|32` chọn subset;
result phải ghi selection, không gọi subset là full matrix.
Rootfont16→32px là fixture,
không thay setting accessibility/native pinch. [Evidence](../docs/verification/mobile-layout-parity-2026-09-28.md)
giữ named baseline RED và gate thiết bị thật/reference/MCP còn thiếu.

Timestamp directory giữ streaming `observations.jsonl`, final `results.json`,
failure PNG và phiên bản browser. Runner/catalog source SHA và8 source/served
asset hashes kiểm hai đầu; catalog artifact generated so với `.site-output/`,
không yêu cầu public catalog source. Fonts/finite motion và hai geometry samples
phải settle; assert glyph/ancestor overflow/mask/paint, không miễn aria-hidden
SplitText. Chỉ collapsed image-action label và one-page indicator đúng accepted
state được tách; expanded label/icon/name/focus/hit vẫn kiểm. Description pages
phải ghép lại đủ source words. CTA font reflow giữ viewport/footer để kiểm floor.
Interrupted/source-changed run giữ riêng, không retag GREEN hoặc dùng thay
Android/iPhone physical evidence.

```powershell
$env:BASE_URL = 'http://127.0.0.1:8792'
$env:PLAYWRIGHT_BROWSERS_PATH = 'E:/TruongThinh-Website/.tooling/browsers'
node tests/site/mobile-layout-parity.e2e.mjs --phase baseline --scope advertising
node tests/site/mobile-layout-parity.e2e.mjs --phase final --scope all
```

## Chú thích thuật ngữ

- **Smoke suite**: nhóm test nhanh cho đường đi và behavior chính.
- **Trust boundary fixture**: fixture kiểm tra ranh giới input/quyền.
- **Regression layer**: lớp test lặp lại để phát hiện thay đổi làm hỏng behavior.
- **Viewport**: vùng browser đang hiển thị.
- **Env flag**: biến môi trường chọn gate test hẹp.
