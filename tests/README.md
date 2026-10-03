# Bộ browser smoke của Trường Thịnh

`site.e2e.cjs` chạy Chromium thật bằng Playwright, không cần test runner riêng. Bộ test
bao phủ 5 route ở 5 viewport, kiểm tra tải image sau khi cuộn từng bước, lỗi
console/network, horizontal overflow và interaction chính. `worker-contract.cjs` kiểm
tra Worker raw SSR 10 locale route, redirect 308, sitemap/robots và security
reject của admin/upload.

## Gate regression trước release

Sau `pnpm prepare:site`, giữ `pnpm dev` tại cổng 8787 và chạy
`pnpm qa:release-regressions`. Lệnh này chạy tuần tự các kiểm tra độc lập:

| Suite | Contract bảo vệ |
| --- | --- |
| `static-locales.test.mjs` | HTML VI/EN build khớp locale transform của preview |
| `advertising-full-span-p72.e2e.mjs` | Primary full-span vừa phần viewport dưới navbar, đúng ratio và vùng blur |
| `advertising-no-titles.e2e.mjs` | Không tái xuất hiện caption/title ảnh đã bỏ |
| `advertising-suggestion-conditional.e2e.mjs` | Resize split/full-span giữ node, focus và vị trí gợi ý |
| `advertising-suggestion-info.e2e.mjs` | Tag, bàn phím, history và phân trang mô tả khi text zoom |
| `shared-header-bottom-p7-1.e2e.mjs` | Navbar không tự expand ở cuối trang trên VI/EN |
| `shared-header-single-line.e2e.mjs` | Ẩn mục navbar khi không vừa một hàng thực tế |

Các suite này có consumer release và assertion hành vi riêng; không xóa chỉ vì
trước đây chưa có lệnh tổng hợp. Gate hẹp không thay full-site parity.

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
$state = Join-Path $env:TEMP "truong-thinh-worker-state"
node node_modules/wrangler/bin/wrangler.js d1 migrations apply truong-thinh-cms --local --persist-to $state
node node_modules/wrangler/bin/wrangler.js dev --local --port 8787 --persist-to $state
```

Trong terminal khác:

```powershell
$env:BASE_URL = "http://127.0.0.1:8787"
node tests/worker/worker-contract.cjs
node tests/site/site.e2e.cjs
```

Static release có thể chạy Worker trust-boundary fixture mà không cần D1:

```powershell
node tests/worker/worker-contract.cjs --security-only
```

Worker contract mặc định cũng kiểm tra CMS catalog đã seed, vì vậy nó thuộc CMS
phase được defer.

Mặc định Worker contract dùng `http://127.0.0.1:8787`. Có thể đổi server:

```bash
BASE_URL=http://127.0.0.1:8080 node tests/site/site.e2e.cjs
```

PowerShell:

```powershell
$env:BASE_URL = "http://127.0.0.1:8080"
node tests/site/site.e2e.cjs
```

## Chạy bằng runtime project-local

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/tooling/run-playwright.ps1 -Suite full
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/tooling/run-playwright.ps1 -Suite smoke
```

Không chạy `npx` với package chưa khóa. Playwright và ba browser engine dùng
đúng version trong `package.json`/lockfile và `.tooling/browsers`. Smoke artifact
mặc định ghi vào `%TEMP%/truong-thinh-playwright-smoke` để không kích hoạt
Wrangler asset watcher trong lúc test.

## Kết quả

- Report mới nhất: `tests/site/reports/latest.json`
- Ảnh chụp khi fail: `tests/site/reports/failures/`
- Exit code `0` khi toàn bộ check đạt; `1` nếu có bất kỳ failure nào.

## Release evidence

Playwright là regression layer có thể lặp lại. Mọi UI change và website
release cần live interaction trên server local và inspection cùng route bằng
Chrome DevTools MCP. Computer Use chỉ bắt buộc khi task cần Windows UI theo
human path và tool chuyên biệt không đủ, theo
[rule QA hiện hành](../docs/operations/agent-rule-evidence-qa-handoff.md#qa-uirelease).
Ghi route, viewport, visible result,
console/network finding, accessibility tree result và screenshot evidence trong
dated verification report. Thiếu evidence layer bắt buộc thì QA/release bị
block; Android CDP hoặc Playwright không thay gate Chrome DevTools MCP.

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
- **Seeded catalog**: dữ liệu catalog được nạp trước cho test.
- **Regression layer**: lớp test lặp lại để phát hiện thay đổi làm hỏng behavior.
- **Viewport**: vùng browser đang hiển thị.
