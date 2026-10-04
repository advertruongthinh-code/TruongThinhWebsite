---
title: Kiểm chứng mobile viewport ổn định
type: verification
status: partial
updated: 2026-09-28
notion: https://app.notion.com/p/3e8332849a0e81bdadc4e49d0ca95495
---

# Mobile viewport stability — local8792

Owner duyệt [spec viewport](../specs/frontend-brand-shell-responsive-runtime.md#mobile-viewport-stability--draft-2026-09-27)
và [plan V00–V05](../../tasks/plan.md#mobile-viewport-stability--plan-chờ-duyệt)
bằng “Duyệt plan và card viewport (đề xuất)”. Scope này không mở release,
recovery/P11 hoặc implementation layout/viewer gesture/history/glass kế tiếp.

Runtime đã tách layout height ổn định khỏi vùng nhìn thực. Geometry Advertising
và fit ảnh viewer giữ nguyên khi toolbar đổi; controls và visibility vẫn cập
nhật. Final runner198 records:132 route/orientation geometry cases đạt,
9 named text-size failures,0 console/network errors;5 source/served hashes
khớp. USB final A05s dọc/ngang đạt14 entries×3 actual toolbar cycles mỗi chiều.
Task bắt đầu27/09 và tiếp tục
qua28/09 giờ Bangkok; raw timestamps UTC được giữ. Không là full-site PASS.
Text-size failures, iPhone/A54 physical và MCP UI layer giữ gate riêng.

## Candidate và thay đổi

Checkout `C:/Users/halal/.codex/worktrees/mobile-ui-contract/TruongThinh-Website`,
branch `codex/mobile-ui-contract`, HEAD `e6cf065161cb19a8b59dd9efa8cda5d4af27fba1`.
Preview source-backed8792 reuse; build bằng `pnpm prepare:site`, không edit
`.site-output/`. Baseline trước viewport tại
`.tmp/mobile-viewport-stability/baseline-2026-09-27T16-07-21-527Z/manifest.json`.

| Owned runtime | SHA-256 prefix final | Behavior |
| --- | --- | --- |
| `src/site/motion.js` | `9813e965d76c` | Optional metrics getter, reuse một inert probe document; logical scroll API giữ nguyên |
| `src/site/style.css` | `8fb42c843dde` | Mobile100svh, desktop100vh tại981; native CSS resolve, không timer/cache |
| `src/site/detail.css` | `647d6af4a92d` | Stable image stage; close/zoom/reset theo visible edges và safe area |
| `src/site/advertising-products/catalog-runtime.mjs` | `b783aed82f37` | Packing/CTA/morph dùng stable height; virtualization/lease theo actual visible rect; fallback probe khi shell không boot |
| `src/site/advertising-products/photo-viewer.mjs` | `25e288591d87` | Visible-only giữ fit/zoom/pan/animation; true geometry resize vẫn refit |

Frozen source/test packet tại
`.tmp/mobile-viewport-stability/V-C-source-2026-09-27T16-48-56-199Z/` gồm
manifest, exact bytes và diff against viewport baseline. Source118 added/27
deleted; hai test mới300+160 lines, tổng605 changed LOC viết tay, trong
estimate600–900. Không tính Markdown/generated hoặc random carry2529LOC.

## Named RED và focused proof

| Scenario | Evidence raw dưới `.tmp/mobile-viewport-stability/` | Kết quả và giới hạn |
| --- | --- | --- |
| Dynamic photo height trước sửa | `baseline-2026-09-27T16-09-24-987Z` | RED3 engines: primary690→562.4px khi visible height844→650 |
| Native toolbar baseline | `android-baseline-2026-09-27T16-11-58-364Z` | A05s dọc: visible782.476↔838.476; primary694.881→721.5px;92 samples,0 errors |
| Shared getter/true resize | `final-2026-09-27T16-14-08-420Z` | GREEN3 engines; stable basis844, actual height resize650 vẫn reflow |
| Viewer animation | `baseline-2026-09-27T16-16-27-011Z`, `final-2026-09-27T16-19-03-963Z` | RED→GREEN3 engines: giữ opening/closing animation, zoom transform và controls |
| Actual visible lease | `baseline-2026-09-27T16-31-45-652Z`, `final-2026-09-27T16-33-43-470Z`, `final-2026-09-27T16-37-19-652Z` | Chromium RED lease ngoài vùng nhìn→GREEN; Firefox/WebKit GREEN sau predicate chờ reveal settle. Các run800ms paused được giữ, không gọi timing failure là cùng nguyên nhân |
| Shell-unavailable fallback | `baseline-2026-09-27T16-40-09-412Z`, `final-2026-09-27T16-47-54-275Z` | RED3 primary690→562.4px→GREEN3; intentional script unavailable, không suppress console/network |
| Geometry matrix trước fallback amendment | `final-2026-09-27T16-38-56-661Z` |153 samples,0 failures;132 route/orientation cases; source provenance của run này khác final ở provider fallback |
| State/text size matrix | `final-2026-09-27T16-45-06-628Z` |42 samples;9 named text-size failures,0 console/network issues; không hủy test sau route failure đầu |
| Final defaultall | `final-2026-09-27T16-47-54-266Z` |198 records,132 geometry cases đạt; fallback/viewer/visibility/true resize/reduced/focus/breakpoint đạt;9 text-size failures giữ exit1,5 source/served và runner hash khớp frozen packet |
| Android endpoint guard | `android-negative-endpoint.json` | Unbound port bị từ chối trước navigation/input; positive guard kiểm serial/forward/package/Android UA |

Fixture thay browser boundary metrics, không inject CSS/runtime fix để đạt
geometry. `setViewportSize` dùng cho true resize. Text-size fixture đổi root
font16→32px, không là Safari/Android native accessibility setting. Viewer
fixture kiểm visible scale/offset, chưa là custom pinch gesture của module sau.

22 entrypoint là10 canonical shared route VI/EN +12 compatibility category
slug, được generator redirect sang parent category theo AD-BROWSE-R1.
Runner ghi URL vào và đích, không gọi chúng là12 independent detail templates.
Photo/tag/related/history/locale behaviors còn được covered bởi random suite.

## Android thật và điều kiện nghiệm thu

ADB serial `R7AX70J584N`, model `SM-A057F`/Galaxy A05s, Android15,
Chrome153.0.8010.52. Đây không là Galaxy A54. Mapping USB9223 trỏ đúng
`chrome_devtools_remote`; reverse8792 giữ nguyên. Chỉ thao tác một task tab
`http://localhost:8792/`; không Sites hoặc tab khác.

V03 portrait raw `android-final-2026-09-27T16-20-02-465Z` và
`android-final-2026-09-27T16-24-31-685Z`:1154 samples,14 route/state entries,
3 actual toolbar cycles mỗi entry,0 console/network errors. Settled document
bbox lệch≤1px, visible782.476↔838.476. Run đầu status incomplete vì predicate
chờ compatibility URL; samples năm shared template hợp lệ được giữ.

Sau visibility correction, landscape raw
`android-final-2026-09-27T16-38-17-417Z`:1868 samples,14 entries,
3 actual toolbar cycles mỗi entry,0 console/network errors. Direct/reload
samples được ghi nhưng một số requested collapsed không có delta thật;
không nghiệm thu state chỉ từ tên label. Final recorder bổ sung retry gesture,
guard provenance và opt-in native pinch.

Final exact candidate landscape tại `android-final-2026-09-27T16-47-54-045Z`:
2226 samples/1992 events,14 entries mỗi entry3 actual toolbar cycles,
visible331.429↔387.429, settled bbox lệch≤1px,0 console/network errors.
Native pinch VI/EN đạt scale≈2, offsetLeft209.524/offsetTop83.048; layout
838×331.423 giữ nguyên, hai looping frames vẫn giao visible rect. Direct/reload
bắt đầu thật từ cả hai toolbar states; Chrome tự mở toolbar sau navigation
(387.429→331.429), không nghiệm thu document khởi tạo với toolbar thu gọn.
Final portrait cùng source/runner tại `android-final-2026-09-27T16-59-37-014Z`
và `android-final-2026-09-27T17-09-09-344Z`:2318 samples/2230 events,
14 entries mỗi entry3 actual cycles, visible782.476↔838.476, settled bbox
lệch≤1px,0 console/network errors. Native pinch VI/EN scale≈2 giữ layout
411×782.476 và hai looping frames trong actual visible rect. Tổng hợp tại
`android-portrait-final-analysis.json`; source/served và recorder hash khớp.
Run đầu giữ status incomplete: sau13 entries đủ cycles, tab chuyển hidden
trước expanded-direct navigation EN kiosk-posm rồi CDP timeout. Main xác minh
ADB/device/reverse và local HTTP200, đưa đúng Chrome task lên foreground,
reapply riêng reverse8792 và ghi tiếp hai EN Advertising states; raw cũ không
bị sửa thành observed. Không kết luận nguyên nhân network từ sự kiện hidden.

Viewer body lock có thể giữ browser toolbar cùng state dù đã native swipe;
không gọi đó là toolbar delta. Browser có thể mở toolbar khi navigation.
Không force-hide toolbar, đổi device setting hay override viewport để làm PASS.
Native page pinch chỉ nghiệm thu khi trace có actual scale/offset thay đổi.

## Regression và named gates

Build/static đạt; bốn unit entrypoint38 tests đạt, không skip. Final random19
và footerP75 six filters đạt sau fallback amendment. Skeleton
lifecycle3 engines đạt sau visibility correction.
Menu28 geometry/10flows/2text-size cases, scrollbar405 states/5 engines và
cross-browser smoke21/21 đạt tại candidate trước fallback amendment. Không
biến evidence hash cũ thành final build PASS; final focused runner kiểm5 hashes.

`impeccable detect` chạy5 runtime files:2 warnings và84 advisories;86 finding
lines đều đã có trong baseline,0 finding ở owned new lines. Không đổi font,
palette hoặc thêm ignore để che baseline findings.

Text-size200% tại390px còn overflow EN Residential2–30px, Commercial17–47px,
About140px theo engine; cả3 engines giữ named failures. Đây layout module kế
tiếp, không được bỏ assertion hoặc sửa typography ngoài plan viewport. Landscape
header/title/filter overlap và owner visual vẫn chưa được nghiệm thu.

iPhone Safari/A54 candidate physical chưa có evidence. WebKit desktop không
thay iPhone. Browser không hỗ trợ stable viewport units giữ compatibility
gate riêng. Website không có form input public để tái hiện software keyboard;
fixture visible rect và keyboard focus không thay native keyboard evidence.
MCP UI navigate layer còn blocked, existing full continuation FAIL giữ riêng;
không chạy lại expensive recovery/parity/P11 theo plan này.

## Checkpoint và rollback

Baseline và V-B exact bytes preserved; V-A có hash/RED/GREEN proof nhưng chưa
lưu một source snapshot riêng đúng thời điểm, không dựng lại lịch sử như
checkpoint đã chạy. Final V-C tại
`.tmp/mobile-viewport-stability/V-C-2026-09-27T17-11-06-921Z/` lưu source/test/docs và proof manifest;
pointer riêng `V-C-current.json`, không overwrite skeleton/pause pointers.
Primary status85 entries và recovery66 staged entries khớp baseline; ba pause
pointer hashes không đổi, ghi tại `preservation-final.json`. Rollback chỉ owned viewport hunks
và hai test mới, rebuild từ source; không reset về HEAD trước random.

Một reviewer gộp QA/audit/code review requested `gpt-6-sol`/`ultra`, effective
unknown. Frozen V-C-source và bounded evidence/docs/draft review Required0;
main kiểm seven source/test hashes và raw geometry/error/provenance.
Ba finding V-B đã resolved: fixture delta,
actual visible lease và recorder endpoint guard. Patch review chứa607 lines
do marker newline hai file mới; V-C final patch bỏ hai marker dư, actual
source/test605 lines như bảng trên. Main kiểm diff/hash/links trước update card;
không suy review planning hoặc code review thành owner/hardware acceptance.
Final link check214 refs:212 valid tại checkout,0 broken reference mới;
hai source-asset review refs cũ
trong photo-browse chỉ có ở primary checkout, không do viewport tạo ra.
Không sửa link hoặc copy dữ liệu ảnh ngoài scope để làm sạch gate.

Chạy lại cloud Chromium 04/10/2026 đạt; kết quả và gate còn mở tại
[layout parity](mobile-layout-parity-2026-09-28.md#chạy-lại-trên-cloud-04102026).

## Chú thích thuật ngữ

- **Stable basis**: kích thước layout không thay theo toolbar browser.
- **Visible rect**: vùng nhìn thực, gồm offset/scale native.
- **Lease**: một renderer dùng native WebGL context trong budget hiện hữu.
- **Named failure**: failure có route/oracle/evidence, vẫn được giữ mở.
- **Exact candidate**: source và served hashes đã đối chiếu tại run.
