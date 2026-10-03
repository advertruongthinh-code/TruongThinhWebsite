---
title: Kiểm chứng scrollbar theo Espacio
type: verification
updated: 2026-09-27
module_id: scrollbar-parity
status: scoped-verified
---

# Scrollbar theo Espacio —27/09/2026

Implementation đạt focused scrollbar matrix **405 case**, build/static và menu
regression. Android Chrome thật đạt native scroll VI/EN, menu lock và xoay ngang.
Smoke tổng **20/21**, còn failure WebGL của skeleton trên WebKit; không gọi toàn
bộ cross-browser hoặc full-site parity là PASS. T04 đã approve scoped implementation;
owner đã nghiệm thu visual scrollbar27/09 bằng “scrollbar ổn”. Visual landscape overlap,
Firefox native appearance có cửa sổ, iPhone thật và reference drag live còn mở.

Nguồn acceptance: [delta đã duyệt](../specs/frontend-brand-shell-responsive-runtime.md#scrollbar-parity--2026-09-27),
[plan/checklist](../../tasks/plan.md), [reference có provenance](../reference/espacio/components.md#bổ-sung-scrollbar--2026-09-27).
Owner duyệt plan và [card riêng](https://app.notion.com/p/3e8332849a0e812c9695d39f0861010e)
ngày27/09. Gate này chỉ cho correction local; recovery/P11/release cũ tiếp tục paused.

## Source và thay đổi

Checkout `C:/Users/halal/.codex/worktrees/mobile-ui-contract/TruongThinh-Website`,
branch `codex/mobile-ui-contract`, HEAD `e6cf065161cb19a8b59dd9efa8cda5d4af27fba1`.
Preview `http://127.0.0.1:8792`; điện thoại dùng `http://localhost:8792` qua USB reverse.
Không commit/push/deploy trong scope này. Build chỉ từ source correction, không
edit `.site-output/`, vendor, dependency, skeleton hoặc nội dung nút.

| File | Thay đổi |
| --- | --- |
| `src/site/style.css` | Gỡ document wildcard ép scrollbar thin/track trắng12px; giữ menu hover/rail suppression; overlay z-index1001 giúp thumb chạm được trên glass header |
| `src/site/motion.js` | Đồng bộ vendor tablet breakpoint981 với shell; adapter instance pinned4.1.4 sửa keyboard settle, queued wheel/drag stop, clamp pixel cuối và cleanup; giữ native mobile |
| `tests/site/scrollbar-parity.e2e.mjs` | Input thật, lock/lifecycle/fallback và matrix; native width/color so với unstyled control cùng engine |
| `tests/README.md` | Command, engine/channel và giới hạn phép đo native |

Actual source/test viết tay **318 LOC thay đổi**:114 dòng thêm/xóa source,
204 dòng test mới; nằm trong estimate200–320. Markdown không tính LOC này.
Contract ownership cập nhật brand-shell spec và DESIGN; STATE/index trỏ report,
không tạo design token hoặc controller mới.

SHA-256 source = generated build = HTTP served8792, đã đối chiếu09:23 UTC:

```text
motion.js  f0c5f596611db28c9ce936ff9ae6fe6e34c33d35a8f2135ec2e5459703bbaf65
style.css  671dd694936430f47fafc56d072cf324241315a119c3428bf0cbecf5b291497f
test       b67a7e71f9c514f8d1365948d6056696a50b2b04f945c134a3613a83e37d5b6a
```

Runtime Playwright1.63.0 từ lockfile; browser runtime pinned tại
`E:/TruongThinh-Website/.tooling/browsers`. Không đổi package/lockfile hoặc browser flags
của người dùng. Fixture dependency-failure chỉ abort request Locomotive của test.

## Kết quả có thể lặp lại

```powershell
pnpm prepare:site
$env:BASE_URL = 'http://127.0.0.1:8792'
$env:PLAYWRIGHT_BROWSERS_PATH = 'E:/TruongThinh-Website/.tooling/browsers'
pnpm qa:static
node tests/site/scrollbar-parity.e2e.mjs
node tests/site/menu-reference-parity.e2e.mjs
pnpm qa:cross-browser
```

| Gate | Kết quả | Phạm vi |
| --- | --- | --- |
| Build/static | PASS | `prepare:site`, `qa:static` trên source/hash trên |
| Chromium153.0.8010.12 |113/113 |100 route/locale/width +13 state/input; no uncaught/HTTP/console error |
| Firefox155.0 |113/113 | Cùng matrix;394 context-lost warnings từ skeleton, không phải console-clean |
| WebKit26.6 |113/113 | Cùng scrollbar matrix;302 context-limit +302 loseContext errors từ skeleton; không đóng smoke error gate |
| Installed Chrome154.0.8037.57 |33/33 |20 route/locale/390–1440 +13 state/input; no uncaught/HTTP/console error |
| Installed Edge154.0.4258.37 |33/33 | Cùng installed-channel subset; không suy rộng toàn bộ viewport matrix của engine |
| Menu regression | PASS |28 geometry +10 route/touch/landscape flow +2 text zoom |
| Cross-browser smoke |20 PASS,1 FAIL | WebKit Advertising có12 WebGL console errors; test giữ assertion và exit1 |
| Impeccable detect |20 findings |1 font warning,19 color/type advisories trên source hiện hữu; không nằm trong scrollbar diff; không auto-repair sidecar |

Focused test chờ font ready/controller settle; không inject CSS/class hoặc
scroll state để tạo PASS. Desktop idle/hover giữ gutter0, track11px, thumb7px,
radius10px, black/opacity0.5; hover scale1.45, bbox shell/header/nav sai lệch≤1px.
Wheel, PageDown/Home/End, drag hai đầu, lock khi drag đang chạy, viewer980↔981,
route/history/locale và native/reduced/fail-open đều có assertion riêng.
Năm route VI/EN dùng320/390/768/959/980/981/1024/1199/1440/1569px trên ba engine.

Firefox headless có `scrollbar-width:none` ngay trên bare HTML; headful bare
control có `auto`. WebKit không expose `scrollbar-color`; `getPropertyValue`
trả rỗng cho cả control và website. So với control cùng runtime kiểm author
override, không chứng minh appearance native indicator của mọi OS/browser.
Headful Firefox input probe chưa đạt nên physical appearance gate giữ mở.

## Regression và failure đã phân loại

Baseline HEAD có root scrollbar ink/white/`thin`; assertion native mặc định sai.
Keyboard PageDown thiếu `startScrollTs`, giữ `has-scroll-scrolling`; thumb đầu
trang bị header che; vendor default tablet1024 làm controller thiếu tại981.
Các failure này đã quan sát trước fix; source pinned4.1.4 giải thích boundary.
[Source upstream](https://github.com/locomotivemtl/locomotive-scroll/blob/4.1.4/src/scripts/Smooth.js)
là cơ sở adapter, không là live Espacio runtime oracle.

Regression kéo tới pixel cuối được kiểm độc lập trên Firefox155,1440×900,
input mouse thật ở `y=899`: pre-edge motion `08f2212e…` thiếu10.0035px so với
limit9000; current `f0c5f596…` còn0.00245px, đạt tolerance1px. Kéo về `y=0`
cả hai đạt≤0.136px. Baseline chỉ thay HTTP motion body, không thay DOM/CSS.
Proof queued callback dùng chính vendor callback/method và adapter source:
baseline delta200→300 sau stop; patched giữ200 và không start scrolling.
Đây là source-boundary proof bổ trợ, không thay runtime/device acceptance.

WebKit smoke failure ở `advertising-products/skeleton-flow.mjs:406` đã tái hiện
ba cặp baseline/current trên browser fresh với cùng12 errors/cặp; baseline
chỉ thay HTTP motion/style bằng HEAD. Bản comparison đầu pin revision trung gian
`1f6b46d1…`/`9f9ccc82…`; [comparison final-source](../../.tmp/scrollbar-parity/review/final-boundary-comparison.json)
pin đúng `f0c5f596…`/`671dd694…` và tái hiện cùng12 errors ở3 baseline/3 current.
Source skeleton không thay trong diff. Suy luận có evidence: lỗi này tồn tại
trước correction scrollbar; không phải lý do hạ console gate hoặc sửa skeleton
khi chưa có spec/plan module đó.

## Android thật và DevTools

Galaxy A05s SM-A057F, Android15/API35, Chrome153.0.8010.52, CDP1.3;
ADB serial `R7AX70J584N`, target local3336 ở thời điểm capture. Chỉ thêm reverse8792
và attach qua forward9223; giữ mapping8790. Không sửa scale/font/OS flags.

Portrait VI/EN **12 state** đạt: hai chiều native swipe, mở/đóng menu, swipe khi
menu mở giữ background position và focus quay lại. DPR2.625, visual scale1,
CSS viewport411×782; custom bar0, smoothfalse, container transform rỗng,
root width/color`auto`, track transparent, overflow0. Device fetch CSS/runtime
SHA khớp source ở cả locale;84 network response metadata, no failure/console.
Tap/close chờ state animation settle; assertion sớm500ms trước đó là probe
timing sai, không là menu bug. Không thay animation để làm test xanh.

Owner xoay máy vật lý; landscape EN **2 state** ghi09:24:32–09:24:34 UTC:
838×331→838×387 khi toolbar thu, scrollY0→68.571; native mode/geometry/scale
giữ đúng, source hash khớp,4 responses200 và console rỗng. Lượt MCP tương tác
VI trước đó ghi portrait height782→838, y0→248→0→248. Screenshot tách lượt
timing; không báo FPS hoặc skeleton PASS từ những capture này.

Ảnh landscape cho thấy title/filter và fixed header chồng vùng hiển thị;
[confirm DOM/ảnh](../../.tmp/scrollbar-parity/android/landscape-confirm-evidence.json)
giữ h1 y−62.26/height198, filter y−2.46/height157.20, header y0/height85.39
tại scrollY68.57. Native scrollbar gate đạt, visual landscape **chưa đạt**;
chưa phân loại nguyên nhân hoặc baseline của layout này. Không sửa hero/filter
ngoài scrollbar scope. Ảnh desktop idle và Android idle bắt intro/reveal còn
chạy; chúng là scoped snapshot, không là stable visual hoặc owner acceptance.

Desktop Chrome DevTools MCP cô lập cùng `/vi/about/`: PageDown y900, một bar,
gutter0, opacity settle0; DOM/computed geometry, AX tree, console rỗng và
19 requests đã đọc. Screenshot trả inline do MCP từ chối filePath ngoài root
cấu hình; cặp screenshot desktop/Android raw riêng đã inspect. iPhone thật
chưa có evidence; WebKit engine không thay nghiệm thu Safari trên iPhone.

## Raw evidence local và handoff

Raw/cache ở `.tmp/scrollbar-parity/`, không stage/commit. Link dùng cùng checkout:

- [405 states](../../.tmp/scrollbar-parity/results.json), SHA-256
  `9cf1bd45d558c0c139adc400e610e663990a7e2343961f8b8159f75b22e9c051`;
  [source/count/diagnostics](../../.tmp/scrollbar-parity/final-facts.json).
- [Drag trước](../../.tmp/scrollbar-parity/review/firefox-reachable-edge-pre-edge.json)
  / [sau](../../.tmp/scrollbar-parity/review/firefox-reachable-edge-current.json),
  [source-boundary proof](../../.tmp/scrollbar-parity/review/adapter-boundary-proof.json).
- [Baseline WebKit comparison](../../.tmp/scrollbar-parity/review/boundary-comparison.json);
  diagnostics từng engine/channel và smoke trace giữ error gốc.
- [Android portrait](../../.tmp/scrollbar-parity/android/portrait-evidence.json),
  SHA `7a176393f557808cef58f361ba028f7a7e706eafce77d13a1b0930b209ac6a96`;
  [landscape](../../.tmp/scrollbar-parity/android/landscape-evidence.json),
  SHA `79f66eecb478581e3cc229bb87dbbeb1190219b9c5cd7b838351c575115d0ade`.
- [Desktop idle](../../.tmp/scrollbar-parity/desktop-idle.png) /
  [hover](../../.tmp/scrollbar-parity/desktop-hover.png),
  [Android EN menu](../../.tmp/scrollbar-parity/android/android-en-menu.png) và
  [landscape](../../.tmp/scrollbar-parity/android/android-landscape.png).

Một agent gộp QA/audit/code review: requested **gpt-6-sol/ultra**, effective
**unknown**. Main sở hữu source, kiểm diff/provenance và final acceptance;
review **approve scoped scrollbar implementation**, không còn Required finding.
Packet đã review có SHA `b0e0cd9eaa64c3b9679edeb1f7b11308440dcfc2499fc756408b176e6331234b`;
17 file manifest và `git apply --reverse --check` đạt, không mutate source.
Hai finding docs stale approval đã sửa ở docs index và historical recorder handoff.
Source/test giữ hash trên; sau review chỉ cập nhật closing metadata/checklist/docs.
Không spawn reviewer khác. [Checklist](../../tasks/todo.md) đóng execution T01–T04,
không tự đóng iPhone, Firefox headful hoặc reference drag live. Owner sau đó
đã duyệt visual scrollbar; [diagnostic feedback mới](mobile-preview-diagnostics-2026-09-27.md)
giữ riêng lỗi random baseline, skeleton footer↔grid và landscape/WebGL.

Root checkout HEAD/status không đổi so với baseline; recovery vẫn66 staged,
0 unstaged/untracked. Checkpoint patch SHA
`F4F78B5997D1A7045553A032FA6A27A6DA4930FE0A8B3D3AADC6B808796169C5`,
manifest SHA `C29326F4A07AA1FAC95C40756E77BAF9A2A1BEA89F55EE2C73145668099F01C0`
đã kiểm lại. Preview8790 chỉ phục vụ output recovery cũ; không rebuild/resume QA.
Giữ preview8792 và provenance cho correction tiếp theo; bản hiện tại thiếu
candidate random. Notion giữ In progress cho device/reference gate còn mở;
contract/evidence ở Git local, chưa push. Scrollbar đã được owner chấp nhận.

## Chú thích thuật ngữ

- **Focused gate**: kiểm module đang thay đổi, không nghiệm thu toàn site.
- **Unstyled control**: document mặc định cùng browser, để tách author CSS khỏi OS/headless default.
- **Instance adapter**: guard/sửa tại instance dependency đã pin, không tạo controller mới.
- **Source-boundary proof**: kiểm callback/method source trong fixture xác định, không thay browser runtime.
- **Physical evidence**: phép đo trên điện thoại thật; engine emulation không tương đương.
