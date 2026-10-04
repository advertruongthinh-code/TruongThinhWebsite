---
title: Kiểm chứng layout mobile toàn website
type: verification
status: in-progress
updated: 2026-10-04
notion: https://app.notion.com/p/3e8332849a0e81f18301f28c1091a9c3
---

# Layout mobile — local8792

Owner duyệt [delta layout](../specs/frontend-brand-shell-responsive-runtime.md#site-mobile-layout-parity--draft-2026-09-28)
và [plan L00–L07](../../tasks/plan.md#site-mobile-layout-parity--plan-chờ-duyệt)
bằng “Duyệt plan và card layout (đề xuất)”. Main thực hiện tuần tự; cùng agent
QA/audit/code review requested Sol/ultra, effective unknown. Không mở recovery,
P11, commit/push/deploy, viewer gesture/history/glass hoặc full canonical.

## L00 baseline và oracle

Checkout `C:/Users/halal/.codex/worktrees/mobile-ui-contract/TruongThinh-Website`,
branch `codex/mobile-ui-contract`, HEAD `e6cf065161cb19a8b59dd9efa8cda5d4af27fba1`.
Baseline immutable trước runtime/test edit:
`.tmp/mobile-layout-parity/baseline-2026-09-27T17-33-12-479Z/manifest.json`,
20path cùng primary/recovery status và pause pointers. V-C/C06U/C05R giữ nguyên.
Runtime5 source/served khớp baseline viewport. Node24.19, Playwright1.63.

Named RED, không import hoặc timeout thay product failure:

| Raw run UTC27/09 | Scope | Kết quả |
| --- | --- | --- |
| `baseline-2026-09-27T17-35-33-774Z` | Advertising VI/EN,5viewport×2text×3engine |60records/60FAIL;12rail-only false positives được phát hiện bằng ảnh |
| `baseline-2026-09-27T17-39-55-799Z` | Residential/Commercial VI/EN |120records/54FAIL;200% nowrap title tràn/cắt;9 EN overflow cũ vẫn tồn tại trong module viewport |
| `baseline-2026-09-27T17-41-22-463Z` | Home/About VI/EN |120records/71FAIL;Home200% chữ dài,About200% overflow;About kicker opacity0/translateX(-60px) được chẩn đoán riêng |
| `baseline-2026-09-27T17-41-48-293Z` | Advertising,oracle rail corrected |60records/48FAIL;12portrait100% hợp lệ;landscape overlap thật và200% text còn RED |
| `baseline-2026-09-27T17-49-59-163Z` | Advertising,final L00 glyph/ancestor/inset/paint oracle |60records/48FAIL,3engines; không unknown clip |

Raw dưới `.tmp/mobile-layout-parity/`; timestamp UTC khác ngày Bangkok là hợp lệ.
Oracle đầu chưa đo toàn paint; không dùng số FAIL đầu làm denominator nghiệm thu.
Các lần sửa oracle giữ raw cũ, không retag. Runner ghi SHA source/served/runner,
entry/destination,scroll/font/metrics và PNG failure. Text fixture16→32px không
thay native accessibility setting. Rail accepted có thể cuộn ngang; từng nút
phải fit/reach đầy đủ sau khi cuộn, không exempt heading thành scroller.
Runner kiểm glyph Range qua ancestor overflow/inset clip, opacity/reveal,
header↔title↔filter và document overflow. Mask/clip không hiểu phải named unknown.

`.tmp/mobile-layout-parity/diagnostic-paint.json` và `about-settled-320x568.png`
đo sau6s:About title visible,kicker opacity0;About không có SplitText trong document,
nhánh init hero kicker của detail.js phụ thuộc SplitText. Không phải settle sớm.
L03 giữ copy và sửa fail-open tại CSS ownership nếu đủ; chưa đổi runtime/controller.

## L01 — Advertising

Intrinsic rows≤980px theo [implementation contract](../specs/frontend-brand-shell-responsive-runtime.md#l01-implementation--2026-09-28).
`final-2026-09-27T17-53-27-294Z`:60records/0FAIL trên Chromium/Firefox/WebKit,
5viewport×VI/EN×100/200%; source5/served hashes khớp. Initial overlap/text
clipping và reachable rail assertions GREEN. Không là all-route/device acceptance.

## L02 — Residential/Commercial và provenance

`final-2026-09-27T17-56-34-583Z` và
`final-2026-09-27T18-03-00-112Z` giữ120records/12FAIL: EN200% ở320/390px,
document overflow2–52px, cả3engines. Hero glyph clipping đã hết. Paragraph
production thực nằm trong `.detail-process-editorial .editorial-item`; selector
`.process-step p` của component cũ không tác động. Chẩn đoán Range chỉ ra
“tolerances” tại390px có right392.219px, không ancestor clip. Fix tiếp trỏ đúng
editorial paragraph; chưa coi kết quả đang chạy là GREEN.

`final-2026-09-27T18-01-56-203Z` ghi60/0FAIL Advertising nhưng runtime CSS được
rebuild khi run chưa kết thúc: **mixed candidate, không dùng nghiệm thu**.
Runner mới kiểm lại source/served khi kết thúc và giữ `provenanceFaults`/exit1
nếu source đổi. Raw cũ không sửa hoặc retag. L01 no-JS scale1 và rail ancestor
review amendments đang được kiểm lại trên source freeze.

## Checkpoint L-A — scoped technical GREEN

Sau correction đúng selector, `final-2026-09-27T18-09-36-212Z` đạt120/120
Residential/Commercial; `final-2026-09-27T18-10-39-381Z` đạt60/60 Advertising.
Cả3engines không overlap/hero glyph clipping/document overflow; cả hai run
`provenanceFaults:[]`, runner SHA `bc266c37`, detail.css `3080871f`; bốn runtime
asset còn lại giữ hash baseline. No-JS base scale1/rail ancestor Required2 đã
resolved, combined scoped source review Required0. L03/L04 còn kiểm shared
body paint, category/photo/menu/fallback và full matrix; không suy hero proof
thành all-body acceptance.

Trên frozen candidate này: `pnpm qa:static` exit0; bốn unit entrypoints
layout/lifecycle/random/skeleton **41/41** pass; random browser19cases exit0;
footer runner6filters exit0, direct/routed gap64px. Viewport fallback
`final-2026-09-27T18-11-34-540Z`3engines/0fail. Historical C05R/C06U random JSON
giữ immutable copies; generated current random JSON được refresh bởi run mới.
Primary85/recovery66 status khớp baseline. Checkpoint pointer riêng
`.tmp/mobile-layout-parity/L-A-current.json`; snapshot/proof hashes ghi manifest,
không thay V-C/C06U/pause pointers. Main kiểm source hunks và oracle thật.

DevTools existing page4 đọc-only evaluate cũng timeout180s; `list_pages` hoạt
động nhưng không có DOM/UI candidate proof. Không tiếp tục retry blind.

## L03/L04 — Home/About và body paint

`final-2026-09-27T18-18-55` giữ120records/33FAIL; oracle chỉ ra Home200%
glyph bị mask dùng pixel measurement cũ, About200% long word tràn ngang.
`diagnostic-2026-09-27T18-24-55` giữ40Chromium records/20FAIL: About flow
còn bị rule `top:46%/49%` có specificity cao hơn. Sửa scoped top:auto,
wrap đúng source và mask dùng max(measured px,0.28em), không ép cỡ chữ.
`final-2026-09-27T18-28-31-748Z` đạt120/120 hero cases/3engines, hai đầu
source/served không đổi. Đây candidate trước các body corrections sau.

Body diagnostic53 observations tại EN390px/200%/reduced phát hiện2 lần cùng
legacy closer cắt glyph442px: rule height400px sau override flow thắng cascade.
Fix specificity scoped Home và height:auto; min-height400px toàn band≤980
giữ baseline. Portal detail dùng intrinsic height và fluid mask; About timeline
dùng minmax(0,1fr). Diagnostic sau correction không còn hai lỗi legacy;
không dùng scoped hero GREEN làm bằng chứng toàn body.

L04 prototype `diagnostic-2026-09-27T18-37-57-944Z` ghi94observations/28FAIL
trên hai route EN390px/200% normal. Phân loại: About direct HTML không tải
SplitText nên detail.js không tạo fade/up/media observer; một phần Home còn
đang chạy reveal khi oracle đo; scroll cue cố ý ẩn sau scrollY200; Tab từ
last dialog stop có thể đi vào browser chrome. Giữ raw RED, không retag.
About HTML reuse local GSAP3.15/SplitText3.15 đã có ở Residential/Commercial,
bỏ CSS kicker override để giữ reveal. Runner kiểm finite CSS/GSAP motion,
phân biệt cue state và background-focus leak với native browser chrome.
Current correction còn chờ exact candidate state/body proof.

Home `diagnostic-2026-09-27T18-52-32-831Z` đạt48observations ở EN390px/200%,
normal body/menu; oracle sau đó được siết lại terminal opacity và control
paint/count. Không coi raw này là full strict final. Prototype rộng
`diagnostic-2026-09-27T18-54-21-057Z` dừng có `interrupted.json`/PNG, chưa có
full DOM results; output cuối219observations/9FAIL qua bốn route VI normal.
Không retag interrupted run thành GREEN hoặc dùng denominator nghiệm thu.

Strict body `diagnostic-2026-09-27T18-59-16-590Z` ghi116observations/9FAIL
VI Residential/Commercial390px/100%. Generated `motion-line-mask` bị
SplitText đặt inline overflow:hidden; clip-path có ink allowance vẫn bị
overflow box cắt. Scoped≤980px override overflow:visible!important và giữ
fluid clip-path/reveal. Retest `diagnostic-2026-09-27T19-03-35-235Z` đạt116/116,
provenanceFaults rỗng. Đây9 body observations mới, khác9 inherited EN200%.

Local reference hồi phục bằng manifest URL→immutable archive bytes, không
đổi archive/server/source: `reference-2026-09-27T18-53-45-158Z` tải đúng
CSS/JS/font tại390×844 và838×387, hash từng response khớp manifest08/08.
Hai Vimeo resources thiếu mỗi viewport; còn live/reference video gate,
không claim full motion parity. Temporary read-only server8793 đã dừng.
V-C17source copies/217referenced proofs kiểm hash hiện tại đều khớp.

### L04 interaction prototype

`diagnostic-2026-09-27T19-03-45-237Z` ghi161observations/26FAIL,
provenanceFaults rỗng. Mười hai observation đo label expand collapsed và
description indicator1/1 như copy đang hiện, trái accepted state; hai menu
Escape timeout có native Tab đi ra browser chrome và document.hasFocus=false.
Runner giới hạn exemption đúng collapsed label/indicator một trang, vẫn kiểm
expanded label/icon/name/hit và reacquire owned page trước Escape.

Mười history timeout có direct/reload/locale đạt rồi Back chờ locale cũ.
Locale runtime dùng replaceState; oracle mới navigate bằng menu sang route C
rồi Back về localized B′ và Forward C, giữ query/history/document guard.
Hai failure thật là Advertising981/982×390 header/title/filter overlap;
CSS intrinsic rows mở đến1024px. Các corrections này còn chờ frozen retest.

Home→About probe ở390px và1400px đều hard reload. Source xác định baseline
menu child count6/4 khác nhau làm syncDocumentState fail-open sang hardNavigate;
chưa có runtime stack của nhánh đó. About dependency pair sửa direct/native
reveal sau fallback; không claim soft entry đã được sửa hoặc mở router scope.

`diagnostic-2026-09-27T19-25-05-591Z` kết thúc253observations/23FAIL,
provenanceFaults rỗng. Label/indicator exemptions đã đúng; Escape vẫn timeout
và200% lộ geometry thật: CTA tail74px/heading375.23px, pager32.06px/line44.80px.
Một EN first-grid reach gặp detached virtual card; runner dùng persistent grid
coordinate trước chọn card, không force click hoặc sửa runtime windowing.

Trusted Escape probe `menu-escape-2026-09-27T19-28-19-340Z` chứng minh focusTRUE,
photo kiosk37→null/menu vẫnOPEN, keydown sau runtime defaultPreventedTRUE.
Catalog photo handler chặn native menu cancel; L04 preservation ownership đã
ghi trước edit. Probe `menu-escape-2026-09-27T19-33-05-851Z` sau guard: menuCLOSED,
photo/URL giữ, focus menu-button. Chưa full engines/state acceptance. Expanded
label giữ48/156px tại root16, width/height tăng theo chữ và wrap khi focus/hover;
không giảm font hoặc miễn label đang hiện. Geometry CTA/pager chờ delta L04R.

Body run `final-2026-09-27T19-34-28-143Z` bị dừng có streaming DOM/PNG và
interrupted manifest:320records/7FAIL, chưa full result. Caption rail trước chỉ
scroll nearest; glyph còn ngoài viewport tại sáu observation, cần explicit
rail reach/centering. Không coi cả7faults là fixture-only khi chưa phân loại hết.
Run tiếp `diagnostic-2026-09-27T19-38-32-057Z` có87records/0FAIL nhưng runner bị sửa
giữa run; **invalid candidate**, manifest giữ lý do và owned PID stop, không
nghiệm thu. Frozen focused retest mới đang chạy; raw cũ không retag.

### L04 frozen corrections và L04R approval

`diagnostic-2026-09-27T19-40-30-028Z`: Advertising100%390 VI/EN179/179
observations đạt, provenanceFaults rỗng; gồm pages/label/menu/viewer/photo Escape
và query preservation. `diagnostic-2026-09-27T19-43-52-054Z`: EN Residential
390/200% body/menu/caption228/228 trên3engines đạt sau wrap caption. History
`diagnostic-2026-09-27T19-20-58-415Z`70/70 là proof trước những edits tiếp theo,
không thay final current-hash regression.

Owner duyệt delta/plan L04R28/09 và đính chính thiết bị thành A05s. Pure minimum
description/image-zone geometry và measured runtime floors triển khai trong
ownership L04R1. `.tmp/mobile-layout-parity/l04r-unit-red.txt` giữ named RED;
`l04r-unit-green.txt`38/38 đạt default compatibility, floors, ratio, related pool
và geometry reservation. Chưa dùng unit proof thay UI/device acceptance.

Static About dependency assertion đã nhận local GSAP/SplitText pair, vẫn giữ
full script ordering. RED được copy tại `static-about-order-red-2026-09-27T19-52.json`
SHA256 `ce80783bbd1dde4ef80a74e570df0315a4ffd80603a975bf0bfcb1f959f1391e`;
`pnpm qa:static` sau amendment L03 đạt. Advertising200% frozen retest đang chạy.

L04R first frozen retest `diagnostic-2026-09-27T19-59-15-543Z` dừng252records/
10FAIL, streaming DOM/PNG/interrupted reason giữ nguyên. VI Chromium200% đạt;
EN related-card click từ scrolltop chờ card bị virtualize ngoài vùng nhìn.
Firefox200% suggestion `Catalogue` glyph vượt card172.5px khoảng3.25px;
label bổ sung min-width0/overflow-wrap:anywhere, không giảm font. Focus-visible
probe chuyển sang native Tab/Shift+Tab trước expanded control measurement.
Không coi các failures chưa phân loại là fixture-only hoặc retag raw thành GREEN.

Combined source review Required2: unnecessary one-page indicator reservation
và CTA heading resize chưa invalidate hash. Đã sửa trong ownership L04R1:
shared full-source natural measurement, chỉ reserve indicator khi cần nhiều page;
heading ResizeObserver invalidate CTA để recompute tại cùng viewport/footer.
Unit regression57/57 đạt sau sửa. Runner thêm complete word/page preservation,
indicator necessity, isolated CTA font reflow cùng viewport/footer và provenance
cho layout-core/catalog source/generated served artifact. Frozen retest đang chạy.

`diagnostic-2026-09-27T20-06-30-598Z` hoàn tất530records/8FAIL, provenanceFaults
rỗng: Chromium0, Firefox1 empty-related oracle, WebKit6 suggestion vertical clips
và1 empty-related oracle. Source xác định tag `product-print-decals-product-10`
chỉ có `print-decals-10`; runtime đúng khi related pool rỗng. Runner kiểm rõ
empty state, rồi toggle pressed tag off trước related-photo flow; không skip
copy/control hoặc force render card không tồn tại.

WebKit probe `suggestion-height-probe-red.json` trên cùng print-decals-05/390/200%:
direct820px/scrollHeight820, grid click580px/scrollHeight820. Natural inner links
cần704px và heading/gaps116px. Suy luận từ source/probe: inner typography
reflow sau phép đo khi view vừa hiện; chưa có browser-layout internal trace.
Existing ResizeObserver quan sát inner links,
unobserve node cũ; chỉ invalidate khi visible suggestion undersized>1px, dùng
layout pipeline hiện hành. `suggestion-height-probe.json` sau sửa direct và grid
click đều820/820; unit57/57 đạt, full frozen retest còn pending.

Impeccable detect exit0:101 findings; cùng101 keys/snippets ở immutable L00
baseline, không có finding mới theo key/snippet. Brand font/palette/motion giữ
accepted scope; warning low-contrast của file About ở static detector chưa là
computed contrast evidence, không gọi toàn bộ visual/contrast PASS.

Frozen `final-2026-09-27T20-19-18-540Z` đạt630/630 observations Advertising
390×844/200% VI/EN trên Chromium/Firefox/WebKit; provenanceFaults rỗng và
console/page/network/HTTP assertions đạt. Gồm CTA sameviewport/footer text
reflow, full body/description words/pages/indicator, unique-tag empty state,
related photo, expanded label, viewer/menu Escape/query/focus và Back/Forward.
Combined actual source review Required0 tại catalog99a5e2ba/layout2cec7d27/
CSSef48e2e3/runner75787a9c. Đây portrait200 scoped proof;100%/landscape và
final660/regression/native còn pending, không dùng làm full-site/device PASS.

## Gate và phạm vi đang mở

Portrait100 frozen `final-portrait100-2026-09-27T20-27-20-551Z` đạt514/514,
provenanceFaults rỗng trước correction dưới đây. Landscape run
`final-landscape-2026-09-27T20-27-20-540Z` dừng sau named RED: isolated CTA
text reflow glyph vượt CTA top2.09px; menu200% glyph34px vượt line-box22.4px;
expanded action focus center55.59px bị header85.39px che. Streaming raw/PNG
giữ nguyên, không retag GREEN. L03 line-height floor giữ default22.4px;
L04 action scroll margin theo shared header row/gutter; L04R CTA top floor
gồm authored ink allowance. Probe3engines×2font đạt6/6 tại
`landscape-floor-probe.json`, menu clipping0/action hitTRUE. Mask ink token
do motion đặt trên descendant mask, main/reviewer đã kiểm source và lấy đúng
nodes; focused probe trước correction token không thay final frozen proof.

Hai current matrix/landscape run khởi động ngắn đã stop trước descendant-token
correction, manifest interrupted giữ riêng. Current source phải chạy lại sau
source review; không dùng incomplete raw cho candidate acceptance.

Combined oracle review phát hiện selector rail dùng `button` trong khi actual
filters là anchors. `final-matrix-frozen-2026-09-27T20-40-04-821Z` dừng180records/
0faults và `final-landscape-frozen-2026-09-27T20-40-14-991Z` dừng474records/0faults;
các số này không thay full candidate proof. Runner correction `a13523d5` kiểm7
actual controls và nonempty glyphs sau mỗi reach. Focused Chromium320/200%
VI/EN đạt14controls, `rail-probe.json`; same-source CTA/menu/action probe sau
descendant token correction đạt6/6. Current source và runner review Required0;
final matrix/body đang chạy lại, product source không đổi vì oracle finding.

Static-only entrypoint return trước report writer: `tests/site/reports/latest.json`
và bản copy tên `static-l04r-final-2026-09-27T20-20.json` vẫn là older RED,
không là proof static GREEN mới. Current `pnpm qa:static` exit0 có actual stdout
và metadata/hash tại `static-current-2026-09-28.txt/.json`. Giữ older raw không
retag; acceptance dùng current command proof này.

Independent regression wrapper `regressions-2026-09-27T20-41-52-298Z` giữ product
source/served hash hai đầu, provenanceFaults rỗng. Random19/footer6/lifecycle3
engines/scrollbar405states5browser/menu28geometry+10flow+2text zoom và viewport
full189samples đạt. Smoke invocation đầu dùng đường dẫn CLI không có trong pnpm
node_modules, exit1 MODULE_NOT_FOUND trước browser; raw giữ setup failure,
không product RED. Correct package command `pnpm qa:cross-browser` đạt21/21,
actual stdout/exit/hash tại `smoke-current-2026-09-28.txt/.json`, cùng freeze interval.
Không gọi wrapper6/7 thành7/7 hoặc sửa old result; final regression proof gồm
six successful entries và independent smoke correction.

Body/state chia thành3 independent engine runs để giảm wall time, giữ cùng
runner/hash và đủ7modes×10canonical×3engines=210combinations. Combined body run
khởi động trước partition giữ interrupted manifest/raw, không final proof.
Final acceptance cần union3 complete runs với source/served/catalog/HTML/runner
guards; không gọi từng engine selection là toàn bộ state suite.

Frozen matrix `final-matrix-complete-2026-09-27T20-50-47-117Z` đạt660/660,
220cases mỗi engine Chromium/Firefox/WebKit. Main kiểm660unique keys đúng
22entrypoints×5viewports×100/200%, source/served/catalog/5HTML/runner guards
hai đầu và provenanceFaults rỗng. Từng actual filter rail kiểm đủ7controls,
nonempty glyphs sau reach. Không initial header/title/filter overlap, document
overflow hoặc named glyph clipping. Đây engine matrix PASS, chưa physical
iPhone/owner/reference/MCP/full-site. Body210combinations và Advertising/history
interactions current đang chạy, L-B chưa tạo trước đủ required proof.

Body current giữ named RED riêng: HomeVI/EN text200-landscape trên3engines
đo portal khi finite GSAP tween còn delay. `portal-delay-probe.json` tái hiện
VI/WebKit: y2551 tại100/200ms delay.3/progress0/inactive; y3679 tại0–400ms
delay.6/progress0/inactive. Transform66.192px và glyph vượt quiet mask;
sau motion transform−3.3096px/glyph fit. Tại y3679/2400ms progress0.93947
vẫn active;3200ms tween đã bị remove, không có mẫu ghi trực tiếp progress1.
Source motion initializer là y`2em`, observer duration1.9s/delay0/.3/.6s.
[GSAP isActive](https://gsap.com/docs/v3/GSAP/Tween/isActive%28%29/) xác nhận
tween chờ delay chưa active; [endTime](https://gsap.com/docs/v3/GSAP/Tween/endTime%28%29/)
dùng clock parent. Reviewer/main đối chiếu source và runtime, không sửa product
CSS/motion/typography để xử lý phép đo sớm.

No-js current có timeout Playwright `scrollIntoViewIfNeeded` sau focus rail.
`no-js-rail-probe-immediate.json` tái hiện immediate action timeout3.5s;
native focus scroll y12000→9578→9114, box sau đó đứng y486.078px; action
Playwright gọi muộn đạt và native instant center đạt y163.078px. Nguyên nhân
internal timeout còn unknown; correction chỉ dùng native instant scroll cho
input no-js, giữ focus/rail reach/glyph/paint/clipping assertions.

Tracked runner a13523d5 giữ nguyên trong các run còn live. Immutable candidate
`.tmp/mobile-layout-parity/layout-readiness-candidate.mjs` b9647b3c chỉ đổi3
exact hunks: finite scheduled tween; ancestor paused/zero/infinite exclusions;
no-js native instant rail reach. Reviewer xác minh exact bytes/diff và relative
catalog import cùng source. Candidate chạy độc lập để retest toàn HomeVI/EN
text200-landscape×3engines và no-js10canonical×3engines; chưa promote vào
tracked runner trước khi các original guard kết thúc. Raw FAIL không retag;
acceptance cần composed evidence với product/source equality và runner
supersession rõ, không gọi210combinations cùng một runner mới đạt.

L01–L07 chưa nghiệm thu. Final phải đủ660ca+state subset theo plan, giữ9 inherited
EN200% failures đến khi exact final proof GREEN. Random/scrollbar/skeleton/context≤2,
viewport/CTA/footer48–64 và primary/recovery/pause được kiểm độc lập.

### L03H — Home-origin reveal dependency correction

History fixture v3 sau khi chờ đúng Barba destination/transition cho thấy
Firefox 4 true fault ở navigate/Forward Home→Residential VI/EN; các context
race cũ không còn. Raw `final-history-settlement-2026-09-27T21-46-53-628Z`
giữ RED, không retag. Observation `hero-dependency-probe-red.json` ghi ở0/1/4s:
DOMContentLoaded đã phát, namespace Residential settled, GSAP3.13.0 nhưng
`SplitText=undefined`, kicker opacity0/translateX−60px và không mutation.
Home HTML là entrypoint duy nhất còn GSAP CDN3.13 thiếu SplitText; `detail.js`
chỉ mount GSAP reveal khi có cả hai dependency. Đây là root cause đo được của
trường hợp Home-origin này, không phải missed ready event; hard navigation khác
không được quy nguyên nhân cho script mismatch khi chưa đo.

Amendment L03H reuse đúng cặp local GSAP3.15/SplitText3.15 trên Home trước
Locomotive/Barba/detail/motion, cùng thứ tự với About. Static guard Home có
named RED `static-home-pair-red.txt` exit1 (dependency order), sau update guard
`static-home-pair-green.txt` exit0; guard còn cấm old CDN và cặp local trùng.
Current source hash đã đổi so với matrix660/body-composed210 cũ; các proof đó
là historical candidate, không đại diện L03H candidate. History3engine, body,
matrix và regressions trên candidate mới đang chờ test; chưa đóng L-B/USB.

Lần probe đầu sau edit nhưng trước `pnpm prepare:site` (`hero-dependency-probe-green.json`)
vẫn nhận HTML cũ từ output, GSAP3.13/SplitText thiếu; đây là **stale served**,
không là regression sau build hay GREEN. Đã ngắt run Firefox history chưa build
và giữ raw incomplete riêng. Sau build, `home-output-proof.json` xác minh
`src/site/index.html` SHA514517e3; generated và served VI cùng SHA c1d6e693,
EN cùng SHA542bb793, HTTP200/cặp local đúng một lần/CDN cũ vắng. Generated
HTML khác source theo bước embed locale; do đó so generated↔served exact bytes,
không áp sai source↔served HTML equality. `hero-dependency-probe-postbuild.json`
ghi GSAP3.15/SplitText function, kicker được mount và opacity1/transform none
ở1 giây. Firefox history v3 postbuild đạt70/70 records, 0 fault và
provenanceFaults rỗng tại `l03h-postbuild-ff-history-2026-09-27T22-14-19-868Z`;
bao gồm bốn case navigate/Forward Home→Residential trước đó RED. Chromium/
WebKit history và current matrix đang chạy, chưa tuyên full gate PASS.

Tracked layout runner đã promote nguyên bytes immutable candidate v3 sau các
focused probe portal495/495, no-js1283/1283 và Firefox history70/70. Fixture
chờ tween finite đang delay, no-js font status/rail native instant, history
đợi Barba destination settled; không đổi product behavior. Detector comparable
`style.css`/`detail.css`/About101→101 findings,0 key/snippet mới;
Home target riêng30 findings chưa có same-target baseline, không gọi0 new.

Current L03H matrix `l03h-final-matrix-2026-09-27T22-17-01-263Z` đạt
660/660, 220/engine,0 fault và provenanceFaults rỗng. Probe riêng
`home-origin-routes.json` đạt24/24 Home→Residential/Commercial/About/
Advertising × VI/EN ×3 engine; đủ cặp GSAP3.15/SplitText, Residential/
Commercial/About kicker paint,0 console/page/HTTP fault, source và served
VI/EN giữ nguyên hai đầu. `pnpm qa:static` postbuild exit0,
unit layout38/38 + random/skeleton lifecycle19/19, `git diff --check` sạch.
Full body3engine vẫn chạy, chưa gộp verdict.
Sau khi xác định L04H cần đổi `motion.js`, ba body run đã dừng có kiểm soát
để không tốn thêm một full pass trên source sắp supersede. Immutable raw và
SHA tại `l03h-body-interruption.json`: Chromium1714, Firefox1457,
WebKit1510 observations,0 fault trong phần đã chạy; cả ba **incomplete**,
không là body PASS/current L-B. Nếu delta/plan L04H được duyệt và source đổi,
body chạy lại trên exact candidate mới.

WebKit history current `l03h-postbuild-cw-history-2026-09-27T22-22-44-592Z`
giữ 141 records/2 failures, Chromium0; About/VI `page.evaluate` mất context
và Advertising/VI có hai script request canceled. Không miễn trừ vì các state
đã qua: timeline `webkit-about-timeline-v3.json` ghi tại navigate-complete
EN Residential `timeOrigin=1790549124373`, Barba current/history=Residential,
state index1 [About,Residential], running=false. Trước Back500ms URL vẫn
Residential nhưng `timeOrigin=1790549132449`, Barba history đã reset index0
[Residential], chứng minh document mới tự tải cùng URL. Back/Forward sau đó
có thể kết thúc About thay vì Residential. Đây là product history RED, không
chỉ fixture readiness; canceled scripts xảy ra khi document bị thay.

Read-only DOM probe `persistent-shell-map.json` so10 direct source route
(5 canonical ×VI/EN) với5 destination cùng locale. Header/floating CTA match;
chỉ About↔Home/Residential/Commercial/Advertising mismatch tại
`#site-menu/DIV[1]/NAV[1]/DIV[2]/DIV[2]`: About4 children, route khác6.
Các cặp route không qua About match. Source `syncElementTree` trả false khi
child count khác, `beforeEnter` fallback sau khi Barba đã push URL rồi
`hardNavigate` dùng `location.assign`; chuỗi này giải thích duplicate entry.
Owner duyệt L04H delta ngày28/09 bằng “Duyệt delta L04H”; plan hẹp chờ
duyệt riêng trước khi sửa `motion.js`. History vẫn RED, chưa có runtime fix.

DevTools `list_pages` trả được; `new_page` isolatedContext mobile-layout-parity
timeout180s, nên UI MCP vẫn chưa có DOM/console/network/PNG cho candidate này.
Không retry mù hoặc dùng Playwright thay PASS của layer này.
Local reference archive bytes/font/CSS đã capture qua manifest mapping; Vimeo
thiếu và capture không chứng minh reference motion/live freshness PASS.
Live Espacio web fetch timeout; existing measured reference giữ historical scope.

Owner đính chính target hiện tại là Chrome/A05s28/09. A05s SM-A057F/iPhone physical, native
keyboard/document-init collapsed,owner/reference/MCP và old full-continuation
FAIL vẫn giữ gate riêng. Symptom skeleton reload được owner xác nhận ở correction
trước dưới nhãn A54; correction model A05s không retag raw hoặc đóng historical
release A54 performance gate. Không coi symptom acceptance là toàn website/FPS.

<a id="l04h-about-history-evidence"></a>

### L04H — About history RED→GREEN trên ba engine

Owner duyệt delta rồi plan L04H ngày28/09; cùng reviewer Sol/ultra rà plan
Required0/Optional0. Test H1 thêm oracle click native, một main-frame document
navigation, `timeOrigin` đổi, đúng một history entry, ổn định qua cửa sổ
self-reload10giây rồi Back/Forward đúng URL/namespace. Các cặp Home→Residential
và Residential→Commercial có control soft Barba riêng. Không đổi global
`hardNavigate` hoặc photo/tag history.

RED hiện hành `l04h-red-stage-2026-09-28T00-47-52-020Z`: WebKit About→Home
VI390×844,1record/1failure, source/served `motion.js` SHA
`9813e965d76c3ab9c7a191dd5608ea03c3a4537722aa9f9bf40a5964a479d0d9`,
runner `443c135be55121a7e4328d0243ddbfc33d5b7518de6478a1f8b2cb8bbf09ba49`,
raw `results.json` SHA
`83845e562085e6dc0702101e8a4794727edf3be347b732315658b4f70a5df727`.
Failure ở stage stable: URL đã đến Home nhưng `timeOrigin` vẫn là document
About, tức click trước hết là Barba soft route. Lần RED đầu `l04h-red-*`
dừng do locator Home chỉ ở menu brand; đó là lỗi test, không dùng làm product
evidence. `l04h-red-v2/v3` lưu các tín hiệu reload bổ sung, giữ immutable.

Guard hẹp trong `shouldPreventBarba` đã cho WebKit representative About→Home
GREEN `l04h-green-smoke-2026-09-28T00-49-09-824Z`:1/1, provenance0.
Control Chromium `l04h-controls-chromium-v2-2026-09-28T00-57-04-132Z`
đạt10/10; Firefox/WebKit `l04h-controls-fw-2026-09-28T00-59-17-773Z`
đạt20/20, provenance0. Các cặp compatible giữ cùng `timeOrigin` và query
About→Advertising giữ `category=kiosk-posm`. First Chromium control run lỗi
locator query do chọn href canonical thay vì link category thực, không dùng làm
product finding. Full `l04h-full-about-2026-09-28T01-02-44-730Z` đạt126/126,
0failure/0provenance: từng Chromium/Firefox/WebKit có32 boundary cases,8 Barba
controls và2 query representatives. Runner SHA
`05703eaf5e3d596350780dd9549790c436269c27020365d4a51245812b55c45e`,
source/served `motion.js` cùng SHA
`df68c1b99b18219ac998a3f95f8139ec5efd008eb6801c91d6f8f94d37f8e19e`,
raw `results.json` SHA
`fcc74bee810d084f39a8d669c58f7c05a01269a2e8a53411a7de420daeda19f8`.
Đây là L04H history GREEN trong Playwright trên current candidate. L05 matrix
`l04h-matrix-2026-09-28T01-33-56-786Z` đạt660/660 (220 mỗi engine),0fault/
provenance, cùng runner/source/served SHA với history run; raw `results.json`
SHA `90ee0c6c6dd360e6061a1c8471e17572e38d5b089c0ce275961b4a4b47bfd11a`.
Body210 first sequential attempt `l04h-body-*` dừng có kiểm soát sau5
Chromium combinations,0fault trong phần đã ghi; raw này **incomplete** và
không gộp acceptance. Theo yêu cầu owner tạm dừng28/09, ba shard cùng candidate
đã nhận Ctrl+C và dừng; không shard nào có `results.json`, nên không gộp thành
body PASS. Raw `observations.jsonl` riêng:

- Chromium `l04h-body-chromium-2026-09-28T02-04-48-025Z`:2832 dòng,
  47 direct starts, SHA `45c8ff35fb4b5950bd23662f0b075f93888867c511ab17890b6cfa605820d5b1`.
- Firefox `l04h-body-firefox-2026-09-28T02-04-48-058Z`:2735 dòng,
  45 direct starts, SHA `e36f8428a8bcba0dfd5086b8aa0e2cb56440bd87f5af1a35da1f700f57b5bdec`.
- WebKit `l04h-body-webkit-2026-09-28T02-04-48-028Z`:2846 dòng,
  48 direct starts, SHA `f5039f6fe33f517cc3425b4f4046cdde23aca8d4462c69131a2fd3692f8ec974`.

Không có dòng fault trong các phần raw đã ghi; số direct starts không phải số
combination hoàn tất. Manifest local tại
`.tmp/mobile-layout-parity/l04h-pause-checkpoint-2026-09-28.json` ghi branch,
HEAD, source/served/runner SHA, kết quả accepted và raw partial. L04H3 và L-B
chưa đạt: cần rerun đủ70 combinations mỗi engine, state subset và affected
regressions trên exact candidate, sau đó mới kiểm A05s thật/L07. iPhone Safari
physical vẫn mở; không gọi layout toàn website PASS. Recovery/P11 vẫn paused;
không commit/push/deploy.

### L04H tiếp tục từ checkpoint — 28/09/2026

Owner mở lại ở hội thoại mới và yêu cầu kiểm SHA trước body210. Preflight
`l04h-resume-preflight-2026-09-28.json` lúc03:13:16 UTC xác nhận đúng checkout,
branch `codex/mobile-ui-contract`, HEAD `e6cf065161cb19a8b59dd9efa8cda5d4af27fba1`.
Source/served8assets,5HTML,catalog và runner khớp hai proof history126/matrix660;
raw SHA của hai proof và ba shard interrupted cũng khớp,0fault. Không rebuild
hoặc đổi runtime/runner. History126 và matrix660 được tái sử dụng đúng candidate.

Rerun mới dùng `BASE_URL=http://127.0.0.1:8792`, mỗi `LAYOUT_ENGINES` lần lượt
`chromium`, `firefox`, `webkit`, command
`node tests/site/mobile-layout-parity.e2e.mjs --scope body --phase l04h-resume-body-<engine>`.
Không đặt route/mode filter: mỗi shard phải hoàn tất7modes×10canonical=70,
union đủ210. Raw cũ không bị sửa hoặc gộp như completed proof. State dùng
`--scope interactions --phase l04h-resume-interactions`, cả3engines và đủ
390/838×16/32; runner giữ source/served/catalog/HTML/SHA hai đầu.

Regression dùng wrapper local `run-l04h-resume-regressions.mjs`, tái sử dụng
wrapper cũ nhưng sửa đường dẫn CLI smoke thành `node_modules/playwright/cli.js`
đã xác nhận có trên máy; thêm static và unit. Random-order unit17 chạy riêng,
kết hợp unit40 thành57. Mọi output mới có timestamp, không ghi đè proof cũ.
Regression `l04h-resume-regressions-2026-09-28T03-15-10-188Z` hoàn tất9/9 nhóm,
0provenance: static,unit40,random19,footer6,lifecycle3engines,scrollbar405state/
5browser,menu28geometry+10flow+2text-zoom,smoke21 và viewport189samples.
`l04h-resume-random-unit.txt` bổ sung17unit, tổng57/57. Main kiểm exit code và
SHA từng stdout trong wrapper manifest.

Body210 hoàn tất lúc03:47 UTC:70/70 combinations mỗi Chromium153.0.8010.12,
Firefox155.0 và WebKit26.6; tổng210 unique engine/mode/route keys,0fault và
0provenance. Mỗi run có `results.json` hoàn chỉnh, source8assets/5HTML/catalog/
runner khớp matrix660; main đối chiếu70 direct records và đủ7modes×10routes,
không dùng số starts từ raw interrupted để nghiệm thu. Records lần lượt
3699/3697/3699; số này là observation, không phải combinations.

Manifest tổng hợp `l04h-resume-body210-summary.json` giữ SHA results/raw:

- Chromium `l04h-resume-body-chromium-2026-09-28T03-13-27-399Z/results.json`:
  `f644b0a73a85ca2a28198fc981ff8723d84b9b0d500a7e1e3dd48879a94caebb`.
- Firefox `l04h-resume-body-firefox-2026-09-28T03-13-37-567Z/results.json`:
  `4b7d3eae31e2e6e645d06af6e24af80aba57bde6ac953ada30859cd5757fcaeb`.
- WebKit `l04h-resume-body-webkit-2026-09-28T03-13-47-736Z/results.json`:
  `931139e4306b524be8b13a6d83c69dff99da1878e33d1860b6dc59cbde1f8840`.

State/history `l04h-resume-interactions-2026-09-28T03-15-20-637Z` hoàn tất2466
observations,0fault/0provenance. Main kiểm mỗi engine đủ8 Advertising combinations
(VI/EN×390/838×16/32),10 canonical history routes và10 breakpoint widths;
tổng24 combinations,30 route-history và30 breakpoint checks. Results SHA
`4c31161814965859ce29bdd375b7f8236f082c78381af664726259d1b0c9758e`, raw SHA
`a64624a1a817fab9e1f6599bc5760011c5412f5d630c25665556949d0fbe60ea`;
`l04h-resume-state-summary.json` giữ coverage và source/runner identity.

L04H3 software proof đạt: matrix660 exact unique keys, body210, state/history
và regressions cùng candidate. Main kiểm current source/served8assets,5HTML và
runner lần cuối trước L-B; primary85/recovery66 Git status giữ đúng baseline.
Checkpoint `L-B-2026-09-28T04-00-10-016Z` lưu28files/25proofs, manifest SHA
`b30c6c5ba60efb5a956efcdcf33606758c5a0d094c941a6879c04ffe59419c80`;
pointer `.tmp/mobile-layout-parity/L-B-current.json`. Snapshot kiểm hash bản
copy, old immutable V-C/C06U và pause pointers giữ nguyên. Physical L06 và
combined handoff L07 tiếp tục là gates riêng. Source/test product changed LOC
trong phiên resume bằng0; chỉ cập nhật evidence/status và wrapper QA local.
Contract geometry/history không đổi, nên owning spec không cần delta mới.

MCP phiên mới mở được isolated page About VI; read-only DOM/computed style,
a11y và screenshot tại emulation390×844 có fonts loaded, document overflow0,
heading hiện đủ. Có warning `GSAP target [object NodeList] not found.`;20 network
requests được liệt kê đều HTTP200. Đây scoped observation, không đóng MCP toàn
website. File export của MCP bị workspace-root guard từ chối; không sửa guard.
Graphify wrapper tại checkout hai lần báo `Files changed during the Graphify
update; retry freshness before querying.`; structural freshness chưa xác nhận
trong phiên này, semantic vẫn pending và không chạy extraction. Serena đã
activate đúng managed checkout. Không thay runtime/runner trong phiên resume;
physical/reference/MCP/owner/full-site gates không bị đóng bằng software PASS.

### L06 — A05s portrait và sửa oracle recorder

Native RED `android-l04h-resume-portrait-2026-09-28T04-01-10-393Z` chạy đủ16
entries VI/EN,2182samples và244layout observations. Cả16entry đạt3actual toolbar
cycles, hai compatibility entry có pinch scale2 với visual offset thực; runtime/
network/provenance faults đều0. Raw giữ status **incomplete**, exit1:79 observations
lỗi, gồm51 scroll-cue paint và28 reached-filter trong4photo/tag entries.

Main đối chiếu raw với source: `buildScrollCueTimeline` giữ delay3s/repeat vô
hạn, có phase opacity0; recorder cũ chốt sau hai sample ổn định trước phase chữ
đọc được. CSS `body.is-advertising-photo .detail-index-hero { display:none }`
ẩn grid/filter đúng photo mode; recorder cũ vẫn reach cả7filter mỗi photo entry.
Đây hai lỗi oracle được chứng minh, không đổi runtime để tạo PASS.

Recorder chỉ sửa readiness: chờ scroll cue đọc được tối đa10s rồi vẫn ghi fault
nếu còn ẩn; photo mode assert đủ7grid filters có width0 và lưu exclusion action.
Clipping/hidden copy khác, viewer/toolbar, runtime và provenance gates giữ nguyên.
Probe dùng chính `recordLayout` của recorder: bản L-B chốt lỗi sau2samples,
bản sửa chờ readable phase; permanent cue opacity, clipping và hidden title vẫn
bị ghi fault/PNG. `.tmp/mobile-layout-parity/l06-oracle-regression.json` đạt4/4;
recorder SHA `59e3e34dd825157d5ee456261f30b297d758100d333785d9be69927008629da4`.
`node --check` và `git diff --check` đạt. Main review diff so L-B +10/−3 dòng:
bounded polling, permanent opacity vẫn fault, không bỏ clipping/identity guard,
không dependency mới. Đây review recorder hẹp, không thay combined L07.

GREEN `android-l06-portrait-oracle-2026-09-28T04-16-44-790Z` kết thúc04:31:50UTC,
exit0/status observed:16entry,2171samples,216layout observations,48actual toolbar
cycles,0layout/runtime/network/provenance faults. Main đối chiếu132toolbar pairs/
629common node pairs: vị trí và kích thước không lệch quá1px; cả hai compatibility
entry pinch2× có offset/pan thực. Tám viewer observations kiểm đủ4controls;
4photo/tag entries lưu7inactive filters mỗi entry. Mọi sample portrait-primary,
foreground; source/site,8served assets và recorder SHA giữ nguyên hai đầu.
Main đối chiếu product source với snapshot L-B, không đổi candidate.

`.tmp/mobile-layout-parity/l06-portrait-green-summary.json` giữ coverage, geometry
và SHA4raw files. Metadata SHA
`5fccd8ec03ee1c69057c6ebd758e8fddaf3c7ce03a69c473741edde81bd65f7a`, layout SHA
`0266ff84e8362ee27294fc473aa71891ce600ed949e003b44561e61ee4025379`.
`l06-portrait-red-summary.json` giữ raw RED immutable riêng. L-B/body210/state/
matrix giữ nguyên; recorder QA đổi sau checkpoint. Portrait scoped đạt; L06
toàn gate tại checkpoint portrait còn chờ owner xoay A05s ngang. Chưa L07/L-C,
iPhone/reference/owner/full-site gates vẫn mở; không đổi phone settings.

<a id="l06-landscape-red"></a>

### L06 — A05s landscape RED, giữ raw riêng

Owner xoay A05s thật sang `ROTATION_90`; Chrome153 foreground trên task tab
`3336` tại local8792. ADB forward9223/reverse8792, package/UA và đúng16route
từ portrait metadata được kiểm trước capture. Source14files,8served assets và
recorder SHA `59e3e34dd825157d5ee456261f30b297d758100d333785d9be69927008629da4`
khớp portrait ở cả hai đầu; provenance faults rỗng. Graphify query trả AST fresh,
semantic files vẫn pending; không chạy extraction.

Raw `android-l06-landscape-2026-09-28T04-46-48-677Z` kết thúc04:58:00UTC,
exit1/status **incomplete**. Đã ghi16entry,2248samples đều `landscape-primary`
và foreground,216layout observations,48/48actual toolbar cycles,2pinch2× với
visual offset thực và observation sau pan,4photo/tag state giữ7/7grid filters
inactive. Trên
132actual toolbar pairs có574common node pairs cùng URL/scale và visual height
delta>10px; left/top/width/height lệch tối đa1px,0geometry fault. Đây chỉ là
geometry scoped pass, không là L06 PASS.

Hai `viewer-after-touch` EN photo và EN photo+tag mất cả4controls: viewer
`open` trước swipe, sang `closing` ngay touch-up đầu lúc04:56:30.396Z và
04:57:55.803Z, rồi `closed` trong khoảng0.3giây. Hai state VI tương ứng giữ
viewer mở; `viewer-open` của cả4route có đủ4controls. PNG cuối xác nhận viewer
đã đóng, không chỉ oracle đếm sai. Recorder swipe x≈461 CSS px bắt đầu ngay sau
zoom click; source viewer đóng khi pointerdown trên dialog/viewport. Gesture
chạm backdrop trong lúc zoom là **giả thuyết**, chưa có event target để xác nhận.
Runtime có `Network.loadingFailed` cho Locomotive Scroll từ jsDelivr
`net::ERR_CONNECTION_CLOSED` lúc04:53:12.095Z và console resource error;
không miễn trừ thành PASS. Raw giữ nguyên, không sửa recorder/runtime hay rerun.

**Phân loại M07a 2026-10-04 (cloud Chromium):** giả thuyết backdrop đúng.
Replay cùng gesture (zoom-in rồi swipe x=`0.55w`, y `0.8h→0.25h`) tại `838×331`
touch: `pointerdown` rơi vào `.advertising-photo-dialog__viewport` khi state
`zooming` (ảnh còn kích thước fit), viewer đóng ở cả VI và EN; chờ `400ms` hoặc
`915×412` thì chạm vào ảnh, viewer giữ mở. Khác biệt EN/VI trên A05s là timing,
không phải locale. Sửa `photo-viewer.mjs`: đóng bằng `click` khi lần nhấn cũng
bắt đầu trên nền, swipe không sinh click. Ca runner
`viewer-backdrop-swipe-stays-open` RED→GREEN
([evidence](advertising-history-motion-2026-09-28.md#h01h02-rescope-và-chạy-cloud-2026-10-04)).
CDN jsDelivr lỗi là network riêng, không đổi. Chưa replay trên A05s nên L06
landscape chưa đóng.

Summary `.tmp/mobile-layout-parity/l06-landscape-red-summary-2026-09-28T04-59-43-211Z.json`
SHA `ab4e91c7f83f1b8d0f5f56156a84785129d7885a8740edf468b5153744935c72`.
Raw metadata SHA `70d6f78d894437b2fe906bbfb99b38068d7bfa652b99585f74a45422d026f4c6`,
samples `7ad34214b32a6dc7377373218e4d2c7bb91e4d93a2e1a37aab15eb8b4cda2c17`,
layout `927fcc76eed445d798dcc00e2bb3e2625da393cf3077d1ef638af31c8d9b1d58`,
events `bcf1e17808c77098e034ee4e0116a500b1b6daf62feaa5f13cd910c78fca0ec0`.
Portrait GREEN và landscape RED là hai proof độc lập cùng candidate. L06/L07/
L-C còn mở; cần phân loại gesture target và CDN failure trước capture bổ sung.
Không tự đóng iPhone/reference/MCP/owner/full-site gate hoặc resume recovery/P11.

## Chạy lại trên cloud 04/10/2026

Branch `claude/project-thread-qivb2u` trên `main` `4af1e31` (sau AVIF, vòng
tải, M02b). Chromium 141 headless, preview `8792`. Cloud chặn
`cdn.jsdelivr.net`: shim test-only ngoài repo trả Barba/Locomotive từ npm
tarball cùng version, SRI khớp; font Google qua proxy. Firefox/WebKit và thiết
bị thật không chạy trên cloud.

Named RED lượt đầu và cách xử lý:

| Phát hiện | Loại | Xử lý |
| --- | --- | --- |
| Nút `Xem lớn hơn` 838×387/200%: Shift+Tab focus khi nút nằm dưới header, browser không cuộn vì coi là đã thấy | Sản phẩm | `html` `scroll-padding-top` = header row + gutter + `0.5rem`; bỏ `scroll-margin` riêng của section/footer, `.project-index`, image action |
| Badge `Vừa xem` card related 390/200%: dòng hai vượt media 97px | Sản phẩm | padding badge `1rem` → `0.5rem` |
| Nút âm thanh `hidden` (ảnh không video) bị tính là copy zero width | Oracle | runner miễn `[data-advertising-photo-audio-toggle][hidden]` |
| Ảnh srcset bị hủy `ERR_ABORTED` khi resize | Oracle | runner bỏ qua image `ERR_ABORTED` |
| Scrollbar: wheel 500 chỉ cuộn 43px trên Linux (Locomotive `0.4×` ngoài Windows) | Test | gửi 3 notch |
| Scrollbar: About↔route khác là native navigation (L04H), `body` tạm null | Test | predicate null-safe + chờ ready |
| Menu: style media query trễ 1–2 frame sau resize headless | Test | chờ 100ms trước đo |

Kết quả cuối trên cùng source:

| Suite | Kết quả |
| --- | --- |
| Unit `node --test tests/site/*.test.mjs`, `pnpm qa:static` | 120/120, đạt |
| Layout `--scope all` (matrix 220, body/state, Advertising interaction) | `ws3-final-2026-10-04T08-39-42-235Z` 4688 records, 0 fault, provenance sạch |
| Viewport | `ws3-final-2026-10-04T09-35-40-081Z` 63 samples, 0 failure |
| Scrollbar, menu, footer | 113 state; 28+10+2; 192 check |
| C06 continuation | 10 viewport boundary đạt; dừng ở cảnh R4 1569×912 chờ mọi CTA frame `running/webgl` (timeout 30s), software GPU |

Home/About 200% overflow và L04R1 minimum control 200% không còn RED trên
Chromium. Gate còn mở cho đợt PC: Firefox/WebKit cùng 660 matrix và state,
C06 R4/R10 FPS trên GPU thật, A05s USB (L06 landscape, V04 toolbar
direct/reload), iPhone/A54, owner visual.

## Ba engine sau khi tự host asset 04/10/2026

Từ `bfad7ed` (#53) font và vendor tự host, nên Firefox chạy trên cloud không
cần preload; kết quả Firefox cloud lỗi CA trước đó bị thay. Bằng chứng L04R1–R2:

| Engine | Nơi | Suite | Kết quả |
| --- | --- | --- | --- |
| Chromium 153 | Cloud | Layout `--scope all` | `cloud-l04r-chromium-final-2026-10-04T15-42-59-501Z` trên `0c9f98c`: 4705 records, 0 fault, provenance sạch, runner `dcea1504` |
| Firefox 155 | PC | Layout `--scope all` | `pc-l04r-firefox-final-2026-10-04T15-20-31-388Z` trên `9c8f344`: 4707 records, 0 fault, provenance sạch, runner `dcea1504` |
| WebKit 26.6 | PC | Layout `--scope all` | `pc-l04r-webkit-selfhost-2026-10-04T14-23-45-603Z` trên `bfad7ed`: 4711 records, 0 fault, provenance sạch |
| Chromium, WebKit | Cloud | Viewport | `cloud-selfhost-2026-10-04T15-20-12-504Z` trên `bfad7ed`: 126 samples, 0 failure |
| Firefox 155 | PC | Viewport | `pc-firefox-selfhost-2026-10-04T15-17-48-411Z` trên `bfad7ed`: 63 samples, 0 failure |

Lần Firefox đầu trên `bfad7ed` có 1 fault (no-JS `/en/` `838x387` chữ 200%): 6
ảnh srcset bị thay thế báo `NS_BINDING_ABORTED`, còn oracle chỉ bỏ qua mã
Chromium `net::ERR_ABORTED`. `9c8f344` cho oracle nhận cả hai mã; repro cloud
53/0.

Test footer (`footer-consistency.e2e.mjs`, Chromium) fail ở 320px VI/EN Quảng cáo
cả trước #53: khi JS bật và catalog chưa tải, Chromium vẽ text thô của
`noscript` vì rule `display: contents`, trang rộng 378px. `0c9f98c` chỉ áp rule
trong `@media (scripting: none)`; footer 48/64 đạt 192/192. Firefox và WebKit
luôn ẩn `noscript` khi JS bật nên số liệu `bfad7ed` của hai engine vẫn đúng.
Unit 120/120, `qa:release-regressions` 7/7, random browse 19 ca đạt.

Còn L04R3 (final 660, A05s USB, iPhone, L07 review/L-C), L06, V04.

## Chú thích thuật ngữ

- **Oracle**: tiêu chí tự động quyết định kết quả test.
- **Paint**: nội dung thực được vẽ, khác với khung DOM.
- **Rail**: component cho phép cuộn ngang đã được duyệt.
- **Named RED**: lỗi có location/cause/measurement cụ thể trước sửa.
- **Physical evidence**: bằng chứng từ thiết bị thật.
- **Shim**: đoạn code test-only thay một dependency mạng bằng bản cục bộ.
- **SRI**: Subresource Integrity, hash bắt buộc của script tải từ CDN.
- **Provenance**: dấu vết chứng minh run đo đúng source, runner và output đã nêu.
- **Tự host**: phục vụ font và script từ chính origin của site thay vì CDN.
