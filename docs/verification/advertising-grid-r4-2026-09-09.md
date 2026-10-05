# Verification GRID-R4

## Phạm vi và trạng thái

Các checkpoint GRID-R4 bên dưới giữ evidence theo từng revision sau LOGO-R2.
Trạng thái UI hiện tại nằm ở mục AD-BROWSE-R1 — UI-FRAME-R4 và R6 cuối file;
không dùng trạng thái chưa nghiệm thu của checkpoint cũ thay kết quả mới.
Nguồn chuẩn GRID-R4 là
[spec R4](../specs/advertising-masonry.md),
[visual B1](../design/patterns.md#advertising-masonry-geometry)
và [rubric ảnh](../design/advertising-image-quality.md).
Chất lượng toàn pool và website vẫn chưa được nghiệm thu toàn bộ.
Run local: `.tmp/orchestration/grid-r4-20260909-execution/`.
Baseline Git `a8ba94ec1dadd84990b0b33f7e590f2cf76c71b1`; giữ dirty worktree
và 13 bản sao source/test tại `baseline/` trong run.

## P0: metadata và triage

Worker đọc ảnh theo sáu contact sheet, xem full resolution sáu mẫu. Main
kiểm độc lập dimensions và SHA256 của toàn bộ 109 file: không lệch manifest,
không trùng ID/hash. Count 24/16/22/13/18/16, đủ 12 product key mỗi nhóm.

- `p0/inventory.json`: SHA256
  `0a44cef9411a0ea995cd77d12b2514ea68b045ce7bd99827663514479ac2e2fc`.
- `p0/visual-decisions.json`: SHA256
  `f1346b379040bf3760dcb50ff69c92ceb962459c83993f5326a5925e982f04a0`.
- Triage: 40 candidate giữ, 15 cần thay, 54 cần xem thêm. 103 ảnh chưa có
  kiểm full resolution. Đây không phải điểm Audit/Critique hoặc R4-5 PASS.

## Sửa metadata trước migration

109 source ID đều khai báo `imagegen:2026-09-01:*`; không có bằng chứng chúng
là ảnh công trình Trường Thịnh đã thực hiện. Đổi alt trong manifest thành
“ảnh minh họa AI” / “AI-generated illustration”, giữ title/path/pixel/source ID.

| Check | Kết quả | Evidence trong run |
| --- | --- | --- |
| Media và detail-route Node tests | 11/11 PASS | `metadata-tests.log` |
| `pnpm prepare:site` | PASS | `metadata-build.log` |
| `pnpm qa:static` | PASS | `metadata-static.log` |
| In-app browser Advertising VI | DOM có alt minh họa AI; bản grid rank-v3 | Kiểm trực tiếp tab local ngày 2026-09-09 |

P1–P3 là migration đồng bộ; các kết quả trên chỉ chứng minh bản metadata trước
migration, không được dùng làm proof cho source mới. Preview giữ last verified
output đến khi producer, solver và runtime tương thích.

## P1: data contract

Main đọc diff producer/validator và chạy lại media suite: 15/15 PASS.
Kiểm độc lập 109 ID/category/product key/source order/title/dimensions/source ID
và alt AI với P0: PASS. Literal span lưu một lần: Auto 28, một cột 33, hai cột
48; đối chiếu assignment artifact không lệch. Dataset `2026-09-09.1`;
settings explicit, invalid threshold và legacy fields bị reject. Gate đủ
12 product key vẫn giữ; count baseline không còn là trần pool.

Evidence trong run: `p1/focused-media.test.log`,
`p1/layout-span-assignments.json`, `p1/advertising-catalog-artifact.json`.
P1 được main nghiệm thu trong scope dữ liệu. Algorithm/runtime R4 còn lại
thuộc P2/P3; không build public output ở checkpoint P1.

## Quyết định B1 và bước còn lại

Kiểm độc lập cho thấy no-hole tuyệt đối yêu cầu hai predecessor của span 2 có
cùng đáy, mâu thuẫn stagger giữa hai item khác nhau. Owner đã duyệt bổ sung B1
để trộn span 1/2; thông số chỉ đặt tại visual contract được liên kết ở trên.
P2 phải dùng oracle độc lập với compiler để kiểm B1 và các gate còn lại.

Oracle trong run tại `p2-oracle.mjs`; fixtures `oracle-tests.mjs` đọc shape
placement thật, tính bounds từ pixel nguồn, không import compiler. Main đọc
logic và chạy `node --test .tmp/orchestration/grid-r4-20260909-execution/oracle-tests.mjs`:
11/11 PASS. Bao gồm B1 đúng/vượt giới hạn, hole span 1, same-item exemption,
ratio/bounds, overlap, visual order, stagger, ba mức giống nhau và ABABAB.
Kết quả này chứng minh bộ đo trên fixtures, chưa chứng minh pool public.
SHA256 oracle `033a3280902f356633a228397aa9907002cd1f6640baa7a9339b44df18e683f1`;
tests `159f86c1f54b3018203e959d7d7c625f68bea8a7d9e6d0ba7847c341819157df`.

Yêu cầu ChatGPT Images 2.5 đã ghi tại rubric cùng nguồn OpenAI xác nhận
availability trên Codex. Dùng image tool tích hợp khi tới P4; field chọn model
không có, effective model chỉ ghi khi tool trả metadata. Chưa tạo ảnh mới.
P1 data contract đã nghiệm thu; P2–P6 chưa nghiệm thu. Full website/Espacio vẫn
NOT PASS; các owner spot-check độc lập vẫn mở.

## Checkpoint tích hợp P2/P3

Main chạy lại `node --test tests/site/advertising-products-layout.test.mjs tests/site/advertising-products-media.test.mjs tests/site/advertising-products-lifecycle.test.mjs`: 23/23 PASS. Matrix All và sáu filter tại bảy width chính cùng 27 boundary width không nuốt failure; oracle độc lập kiểm geometry. Fixture khả thi 3.000 card được oracle kiểm trước benchmark: solver 141.6 ms, 59.994 operations. Đây là benchmark fixture, không phải đo 3.000 ảnh trong browser.

`pnpm prepare:site` và `pnpm qa:static`: PASS trên source recovery. Preview GRID-R4 đã build; in-app browser kiểm 390px và 1440px, ảnh natural ratio, span 1/2, không có layout error hoặc console error tại spot-check. Screenshot trong run: `p3-main/mobile-390.png`, `p3-main/desktop-1440.png`. Chưa thay pool ảnh. Review độc lập và focused lifecycle/browser đầy đủ còn mở; chưa đóng P2/P3 hoặc R4.

[Audit 115 ảnh](advertising-images-audit-2026-09-09.md) thay kết quả triage P0 cho quyết định media. Owner cho phép sửa ảnh cũ và bổ sung ảnh thiếu đúng mô tả canonical. Đã tạo candidate sửa biển số nhà `office-signs-wayfinding-01`; chưa tích hợp hoặc nghiệm thu ảnh mới.

## Checkpoint sau review và P4 batch 1

Dataset `2026-09-09.2` tích hợp ba ảnh v2 theo
[image audit](advertising-images-audit-2026-09-09.md#p4-batch-1--đã-tích-hợp-ngày-2026-09-09).
Detail layout resolve sourceId từ ID record ổn định trong manifest, không còn
dựng mã provenance theo ngày generation cũ.

Hai finding độc lập của Sol/high đã sửa và re-review addressed: anti-brick
không prune prefix còn có thể sửa bằng item tương lai, leaf sai phải backtrack;
runtime giữ geometry hợp lệ của `needs-media`, vẫn rethrow lỗi compiler thật.
Main chạy layout/media/lifecycle trên pool mới: **24/24 PASS**, 2.685 giây;
fixture 3.000 card có oracle độc lập, solver 130.7 ms, 60.025/300.000 operations.
`pnpm prepare:site` và `pnpm qa:static` PASS. Website preview đã dùng R4 và v2.

P5 adapter đã đổi test sang artifact v4, natural ratio, settings và oracle R4.
Browser launch lỗi do thiếu `PLAYWRIGHT_BROWSERS_PATH`; Chromium project đã có
tại `.tooling/browsers`, launch được khi dùng đúng environment/wrapper.
Sau đó review phát hiện test áp oracle toàn layout lên virtual DOM subset:
xóa item đổi nearest-edge pair và tạo false brick. Sol kiểm full 109 placements
tại 499/500/501/734px đều không violation. Gate đúng kiểm oracle trên full layout
và giữ DOM-vs-layout assertion cho từng item mounted.
Log tại `.tmp/orchestration/grid-r4-20260909-execution/p5-adapter/`;
không diễn giải exit của PowerShell wrapper thành test PASS.
In-app browser vẫn truy cập được; biển số nhà v2 tải đúng 1672×941 trên trang con.
Main đã đọc durable final reports: GRID **30/30 PASS**, 102.016 giây,
`p5-adapter/grid-final.json` (13:24:31Z); virtualization 3.000 card **1/1 PASS**,
9.868 giây, `p5-adapter/virtual-3k-final.json` (13:25:15Z).
3K dùng fixture all-span-1 đã chứng minh khả thi bằng oracle; mixed Auto/1/2
được kiểm riêng trên actual pool và solver/media tests. Không dùng fixture
synthetic chưa chứng minh khả thi để kết luận solver sai khi hết search budget.
Main kiểm source adapter và reports, Sol/high review integration PASS.
Hai signage v2 cũng đã tải đúng 1536×1024 trong gallery sau thao tác slide.
Chưa nghiệm thu toàn pool ảnh, toàn bộ lifecycle P5 hoặc full website/Espacio.

## AD-BROWSE-R1 — data và Auto, 2026-09-10

Owner duyệt spec và plan AD-BROWSE-R1-P1; contract mới ở
[photo browse](../specs/advertising-detail.md). Evidence GRID-R4 ở trên là
lịch sử, không thay browser gate của revision mới.

Main đối chiếu 109 record/file với baseline: ID, source ID, URL, dimensions,
category, title, source order, literal span và SHA-256 giữ nguyên. Registry mới
có 82 tag VI/EN, gồm tag dùng thử chung hai nhóm; không nhập thư viện 50 ảnh
nguồn vào public trong slice này. History/related đạt fixture gate; detail,
browser history/morph và compatibility chưa nghiệm thu tại checkpoint này.

Auto v5 đưa cả span 1/2 vào search, giữ literal span và dùng cùng geometry oracle.
Thêm reservation bằng initial column bottoms, không tạo solver thứ hai. Main
phát hiện regression ở nhóm LED ba cột: 18 ảnh, 151.014 operations và 50.400 lần
loại leaf. Finalization trước đó chờ cạnh đã đặt, nên thử nhiều hoán vị phía sau
dù ảnh còn lại không thể sửa rhythm. Sửa bằng lower bound của cạnh sớm nhất
trong remaining set; rollback đồng bộ khi backtrack. Giữ nguyên ngưỡng G1,
operation budget và kiểm prefix còn khả năng sửa.

`node --test tests/site/advertising-products-layout.test.mjs`: **11/11 PASS**,
tổng 1.769 ms, ma trận 985 ms; trước sửa cùng ma trận mất 103.219 ms. Case LED
735/959/961 px còn 278/288/278 operations, giữ coordinate hash tương ứng
`cd1f9284`, `5b52938e`, `4663c118`. Fixture khả thi 3.000 card: oracle 227,8 ms,
solver 161,5 ms, 60.000 operations. Thời gian là số đo trên máy hiện tại;
regression test dùng operation count và oracle thay ngưỡng thời gian dễ nhiễu.

Independent Terra review kiểm proof trên bản sao tracker và rollback; scoped
LED test **1/1 PASS**. Hai giả thuyết counterexample ban đầu đã được thực nghiệm
bác bỏ hoặc làm rõ trong review, không còn finding trên snapshot này.
Run/checkpoint: `.tmp/orchestration/advertising-browse-implementation-20260910/`.

SHA-256 tại checkpoint Auto:

- `layout-core.mjs`: `79ad89aebe6541c7bd973b2bc6135eccf08263d41c4cdfc4c68409be387efafb`.
- Layout test: `8168a5c2f8e5e16530577ea1e9dd64c30ea2f100a6c14f38db099d9ad519ca6d`.
- Oracle: `c6fc4d691871d87f8e9374a3f0a198bf400cc5710c06b4459b39d18f9acdbadc`.

## AD-BROWSE-R1 — UI-FRAME-R4 và R6, 2026-09-10

Main đã kiểm source, generated output, review độc lập và các artifact dưới đây.
[Photo browse](../specs/advertising-detail.md) giữ contract hiện hành;
[Pinterest reference](../reference/pinterest-photo-view.md) giữ DOM/CSS và thao tác
trên năm pin trong trình duyệt Codex đã đăng nhập. Bố cục split/stacked là cách
áp dụng của Trường Thịnh; không suy Pinterest chọn layout chỉ từ tỷ lệ ảnh.

Detail có ảnh nguyên tỷ lệ, mô tả, nhãn và một CTA trong Advertising flow.
Viewer phủ cửa sổ, fit → cover → 2×cover, giới hạn plus/minus, reset ở mức tối
đa và cụm nút dọc 48 px. Motion mở/đóng 300/250 ms là giá trị implementation;
zoom/reset 200 ms đối chiếu được reference. Reduced motion bỏ animation.
Khối gợi ý tối đa năm nhãn có slot ổn định theo ảnh; click dùng replace-state,
giữ hero và lọc related. Chỉ ảnh nền banner dùng cover, ảnh sản phẩm không crop.

Ba lỗi runtime phát hiện trong QA đã sửa ở adapter hiện hữu: ResizeObserver
không được hủy morph mới khi geometry không đổi; đổi cửa sổ 960→961 phải chạy
scheduler dù kích thước primary chưa đổi; CSS media query phải quyết định chế
độ desktop trong khi kích thước thực và gutter lấy theo content width. Gutter
chỉ override tại photo view, giữ token 15/25/35 và các phần frontend đã khóa.

Run: `.tmp/orchestration/advertising-browse-implementation-20260910/`.
SHA-256 source và output catalog runtime khớp:
`5a57aa0f8bcbc3f3f3b75b72f370b69df559908e4f5def2f0fb7ad44d000e9fa`.
Viewer: `72e72d74cf94a1f02ab6772fcf3fde56146acdfaa868f577c48ea1aff10a81e2`.
Build producer: `bf998c5eb6195250594347b9d8d20e7fb63c5189576b92c19ddc7816d2395f0e`.

| Gate | Kết quả | Evidence và giới hạn |
| --- | --- | --- |
| Layout/media/lifecycle/static/legacy Node suites | 32/32 PASS | Full pool và sáu filter; ma trận Auto 974 ms; fixture 3.000 card 60.000 operations. Chưa là policy một cột |
| Build và static | PASS | `pnpm prepare:site`, `pnpm qa:static`; local static server self-test 11/11 |
| G3 motion và R6 nhãn | 6/6 PASS | `cp3-transition-e2e-results.json`; source/output hash độc lập. Click B rồi Back giữa morph, ảnh chậm/resize, dependency lỗi, locale và banner replace-state |
| G6 viewer/responsive | 94/94 PASS | `photo-view-e2e/r4-full-matrix-4-final/latest.json`, 2026-09-10T01:58:19Z; Chromium 19 viewport × VI/EN × dọc/ngang, Firefox/WebKit smoke, reduced motion và resize sweep 76 mốc từ 320 đến 2560 px |
| Scrollbar hiện hữu | 4/4 PASS | `photo-view-e2e/r4-scrollbar-visible-final-v4/latest.json`; VI/EN × dọc/ngang, 11 mốc quanh 750/960/1200 px. Thanh cuộn 10 px ở dải 741–970; không overlap, vượt container hoặc tràn ngang |
| Chrome DevTools thực | PASS trong scope đo | `native-scrollbar-devtools.json`; 751, 961, 1201 px đều không overlap/vượt container. Trước sửa tại 751 px, card vượt container 20 px |
| Viewer edge cases | 4/4 PASS | `viewer-r4-edge-cases.json`; lỗi ảnh, pointer cancel, resize lúc đóng, zoom/reset/đóng nhanh; viewer hash không đổi |
| Browser history | 5/5 PASS tại checkpoint trước R4 | `e2e-frame-r3-history-semantic/latest.json`; source history không đổi, G3/R6 và G6 mới kiểm lại tương tác bị tác động |
| Sáu URL compatibility | 14/14 PASS | `compatibility-final.json`: 12 slug/locale có JavaScript và hai locale không JavaScript; không chọn hero ngẫu nhiên |

Compatibility HTML có title/description đúng locale, canonical parent, fallback
link và meta refresh trong noscript. JavaScript dùng location.replace về parent
với category của slug, giữ query không thuộc routing, loại photo/tag/category cũ.
Browser không JavaScript vào fallback tĩnh; không claim dynamic filtering ở chế
độ đó. Giữ sáu output path, detail template/config lịch sử và generic carousel;
không sửa Worker/provider. Node route test chạy generated script trong VM để
bắt lỗi cú pháp và kiểm same-origin, locale, query lặp/encoded.

Lượt G6 cũ 93/94 tìm ra lỗi resize thật; lượt 94/94 trên `0ce23085…` vẫn thiếu
thanh cuộn mặc định bị runner ẩn. Scrollbar lane 0/4 đã tái hiện lỗi native,
sau đó 4/4 trên source cuối. Giữ mọi run cũ; không dùng retry hoặc sửa harness
để bỏ assertion. Native IAB đã kiểm banner/tag giữ hero và cập nhật URL.

Các lệnh tái hiện nằm tại [tests guide](../../tests/README.md). Main kiểm lại
32 Node tests, static contracts, hashes và diff sau build cuối. Browser matrix
là viewport/device emulation, không phải kiểm trên mọi thiết bị vật lý. Không
claim full-site/Espacio parity PASS hoặc đóng owner spot-check VI/EN.

Tại checkpoint R4/R6, policy vẫn Auto v5. Phép thử khả thi một cột 42/42,
deterministic và max 3.662 operations khi đó chỉ dùng seeded proxy; không
chứng minh related runtime với hero/tag/banner thật. Không dùng các kết quả
Auto trên đây để nghiệm thu G1 mới bên dưới.

## AD-BROWSE-R1-P1.1 — policy một cột, 2026-09-10

Owner đã duyệt plan gồm bỏ Auto/1/2 và yêu cầu làm song song delta logo tính
dấu. Run: `.tmp/orchestration/advertising-one-column-logo-20260910/`.

Public catalog, runtime parent/related và build preflight dùng cùng
`compileAdvertisingProductLayout` trong shared core. Policy v6 đặt span 1 nội
bộ, bỏ ảnh hưởng của lựa chọn legacy và threshold tới geometry/hash. Producer
không phát `layoutSpan`; artifact dataset `2026-09-10.1` có `settings: {}`.
Generic kernel và fixture Auto giữ tương thích/lịch sử. Không đổi solver,
oracle, budget hoặc intrinsic metadata.

Main đối chiếu 109/109 manifest row với baseline: khác đúng field span bị bỏ;
ID/path/source/order/title/dimensions giữ nguyên. Media suite 17/17 PASS.
Layout 11/11, static 1/1 và lifecycle 1/1 PASS. Source assertion lifecycle
được cập nhật sang tên public compiler mới; không sửa runtime để né lỗi test.

`advertising-one-column.test.mjs` đạt 3/3: All/sáu nhóm qua 20 width, 1.320 tổ
hợp hero/tag authored ở 390/820/1440 và ma trận related quanh breakpoint.
Oracle độc lập giữ stagger ≥0,25W gồm terminal, anti-brick, ratio, no overlap,
deterministic và budget ≤300.000. Hero reservation 600px/banner 440px trong
Node matrix là geometry input kiểm khả thi; số đo DOM thuộc browser gate.
Review độc lập không phát hiện finding actionable; main đã kiểm report/diff.

Build và các gate focused của revision v6 đã PASS. Main đọc JSON, kiểm diff,
source/output hash và native UI trước nghiệm thu kỹ thuật P1.1. Các gate ở
section R4/R6 phía trên vẫn là baseline v5, không thay proof mới dưới đây.

| Gate v6 | Kết quả | Artifact trong run hiện hành |
| --- | --- | --- |
| Node layout/media/static/lifecycle/one-column/compatibility | 34/34 PASS | Sáu suite hiện hữu; static và compatibility chạy lại sau build cuối |
| Build/static | PASS | `pnpm prepare:site`, `pnpm qa:static`; asset và mười inline logo đồng bộ |
| G3/R6 transitions và nhãn | 6/6 PASS | `g3/cp3-transition-e2e-results.json` |
| Grid responsive và fixture 3.000 ảnh | 30/30 và 1/1 PASS | `grid/latest.json`, `three-k/latest.json` |
| Sáu URL compatibility | 14/14 PASS | `compatibility/latest.json` |
| Viewer/responsive | 94/94 PASS | `browser-viewer-full/latest.json`; Chromium 19 viewport × VI/EN × ảnh dọc/ngang, Firefox/WebKit smoke, reduced motion và resize sweep |
| Scrollbar trên build cuối | 4/4 PASS | `browser-scrollbar-build2/latest.json` |
| Một cột trên build cuối | 6/6 PASS | `browser-one-column-build2-final/latest.json`; VI/EN × 390/820/1440px, related → navbar → parent |

Browser oracle tính W độc lập từ chiều rộng container, số cột và computed gap;
so với inline/client/computed/visual width, không lấy card đầu làm chuẩn. Chờ
return motion ổn định để không trộn tọa độ layout và rect đang transform.
Các run trước khi sửa điều kiện chờ được giữ lại; không nới gate hình học.
Pool size lấy từ DOM/aria-setsize. Mọi ảnh một cột, tỷ lệ intrinsic; chỉ banner
nhãn được crop. Một cột của ảnh không có nghĩa toàn grid chỉ còn một cột.

G6 94/94 chạy trên build có CSS `279ee827…`; sau đó chỉ sửa geometry/tracking
logo và dịch chuyển subtitle EN, giữ height header và toàn bộ grid/viewer.
Build cuối kiểm lại one-column, scrollbar, native detail và logo. Catalog
runtime source/output của cả hai build cùng SHA-256:
`79e4fb4985db7fd4f5f3dd7893f05ab4c08cc1c14c070e9b01ee112a3340b936`.
Style source/output cuối cùng:
`88cdba9847eb6c4999b94e1cffce2e3307a3e2ed2d6dc3b1fe98746fcb0e79bf`.
Shared layout core:
`5dd34faeadc4b0b2e1a4785c81864170c63007c59ae3d4575b15fd1bd52c580f`.

Native Chrome tại 1440px: hero 501.375 × 668.5px đúng tỷ lệ 1086/1448,
related width 316.25px, overflow 0; console không error/warn, document/script/
stylesheet/font được kiểm đều HTTP 200. IAB kiểm Xem lớn hơn → zoom tới giới
hạn → reset 100% → đóng về detail. Preview VI đã mở cho owner.
Đây là emulation và native browser, không claim mọi thiết bị vật lý hoặc
full-site/Espacio parity PASS. Owner spot-check VI/EN vẫn còn mở.

### Feedback owner sau preview v6

Owner yêu cầu cân đáy các cột và CTA nối tiếp grid, fade trước phần chữ có
motion. Main đã tái hiện EN 1440px: cột thứ hai vắng card trong viewport đoạn
cuối; CTA hiện có ba phần tử `<i>` trong section riêng. Đây là finding ngoài
điều kiện PASS một cột đã kiểm; cần bổ sung acceptance độ đầy ở đáy. Owner
đã xác nhận ngưỡng mới là 0,20 chiều cao vùng ảnh lớn nhất liền kề, không gồm
caption, và skeleton rỗng nằm trong chính grid rồi fade trước chữ CTA có
motion. Tại checkpoint v6 chưa đổi thuật toán/CTA; implementation mới ở P1.2 bên dưới.

Owner bổ sung yêu cầu nút vuông, expand gọn thành icon rồi mở nhãn khi hover,
hover feedback cho cụm zoom/đóng, icon reset đồng bộ và đường về danh sách
dễ nhận biết trong detail. Owner đã chọn control quay lại chỉ hiện icon,
hover mở chữ, tại cùng card. Các yêu cầu này được ghi trong R1/R2 của spec, không phải evidence
runtime mới và không tự thay CTA/gallery toàn website.

## AD-BROWSE-R1-P1.2 — Cân đáy, CTA và Back 2026-09-10

Owner duyệt plan P1.2 và cho phép related giảm số cột khi cần. Technical gate
focused PASS; owner spot-check và các phần còn lại của card vẫn mở. Source
`advertising-grid-v7` giữ 109 ảnh và parent 2–4 cột; related thử giảm tới một
cột sau search-exhausted. Ngưỡng 0,20 tính theo ảnh lớn nhất liền kề, không
caption; spread đáy ảnh thật dùng cùng tọa độ, không trừ seed. Mọi lượt thử
chia tổng budget 300.000. Heuristic có giới hạn, không chứng minh tối ưu toàn
cục hoặc số cột lớn nhất khả thi.

CTA gồm ba frame trang trí mỗi cột nối từ frontier ảnh thật, fade dọc trước
chữ. Frame không là catalog item/focus target và không dựng lại khi chỉ cuộn.
Control vuông 48px, hover/focus mở nhãn; Back chỉ hiện detail, B → A → grid,
URL trực tiếp fallback grid. Navbar giữ điều hướng về ảnh hiện tại.

Artifacts trong `.tmp/orchestration/advertising-p12-20260910/`:

| Gate | Kết quả | Lệnh hoặc artifact |
| --- | --- | --- |
| Build/static | PASS | `pnpm prepare:site`; `pnpm qa:static` |
| Geometry/oracle | 18/18 PASS | `node --test tests/site/advertising-one-column.test.mjs tests/site/advertising-products-layout.test.mjs`; parent 20 width × All/sáu nhóm; 1.320 hero/tag/width, determinism; fixture 3.000 card 60.000 operations |
| Media/lifecycle/static/compatibility | 20/20 PASS | `node --test tests/site/advertising-products-media.test.mjs tests/site/advertising-products-lifecycle.test.mjs tests/site/advertising-products-static.test.mjs tests/site/advertising-products-detail-routes.test.mjs` |
| Tích hợp motion/CTA/Back | 8/8 PASS | `node tests/site/advertising-photo-transitions.e2e.mjs`; `main-transitions-final/cp3-transition-e2e-results.json` |
| Viewer/zoom/responsive | 94/94 PASS | `node tests/site/advertising-photo-view.e2e.mjs`; `main-viewer-final/latest.json` |
| Một cột trên browser | 6/6 PASS | `PHOTO_VIEW_ONE_COLUMN_REGRESSION=1`; `main-one-column-browser/latest.json` |

Viewer matrix gồm Chromium 19 viewport từ 320 đến 2560px, VI/EN, ảnh dọc/ngang;
Firefox/WebKit smoke, reduced motion và resize sweep. CTA kiểm VI/EN tại
320/390/820/1440, filter/resize/restore, node identity khi cuộn, một CTA và
overflow. Không gọi đây là kiểm mọi thiết bị vật lý.

Independent reviewer requested `gpt-6-astra/high`, effective `unknown`:
kernel/adaptive APPROVED sau khi sửa raw-tail oracle; negative fixture bắt
spread 975px vượt 180,68px. Fixture sparse ba ảnh ở 820px với banner 440px
giảm từ ba xuống hai cột; banner DOM thực tế được đo lại nên số cột có thể khác.
Square-only pool giảm một cột. Finding nhỏ CTA dựng lại DOM khi cuộn đã sửa
bằng geometry hash và được re-review APPROVED. Main đọc diff so baseline P1.2,
kiểm kết quả JSON, hash và browser riêng; không kế thừa PASS từ worker.

Source/output SHA-256 khớp:

- Kernel: `fd0350874c82a3e81a3043a2ed8dd7af5d2984ffa8c07c83514a29de2c00591a`.
- Runtime: `e0eedc8e674bb8913c4aa15380580add2929070e7c18e844edd685ebf0341c53`.
- CSS detail: `ed22eba7fd853be58b879cc0409dbc71a1df8b9b0c3855677fbb00c51b9d5981`.

HTML qua bước bilingual build nên không yêu cầu byte-equal source/output;
prepare/static/compatibility xác minh output. Chi tiết tại
`final-source-hashes.json`, delta source tại `final-source-delta.patch`.

IAB đã thử mở viewer, zoom tới max (nút tăng disabled, reset xuất hiện), reset,
đóng và Back về parent; Back ẩn trên parent. Chrome DevTools context riêng kiểm
DOM/computed/a11y và screenshot: viewport thực 820×949, overflow 0; Back vuông,
related adaptive một cột giữ tỷ lệ ảnh. Script/CSS/fetch được kiểm đều HTTP200,
console không error/warn. Tool DevTools không cho ghi file vào workspace này,
nên evidence lớp này trả inline trong task; không gọi lỗi lưu file là lỗi UI.
Impeccable detect exit0; warning width transition thuộc motion nhãn đã duyệt,
không coi detector là accessibility hoặc toàn-site PASS.

Docs contract được đồng bộ tại spec, DESIGN, patterns, motion, frontend,
surface brief, STATE và chính card Notion. Worker/admin/media/logo/global shell
không đổi trong P1.2. Graphify semantic pending ở preflight225; không extraction.
Full `qa:site` và canonical Espacio parity vẫn NOT PASS, ngoài focused gate này.
Không commit/push/deploy; card giữ In progress chờ owner spot-check.

## Sau preview P1.2 — icon và chẩn đoán ban đầu 2026-09-10

Đây là fix nhỏ và observation riêng, không đóng các yêu cầu layout/motion mới.
Owner yêu cầu nghiên cứu lại kích thước khối ảnh/mô tả và grid Pinterest trên
dải cửa sổ responsive của Trường Thịnh. Discovery giữ trong card hiện tại;
chưa chốt công thức chiều rộng/chiều cao mới hoặc dùng gate P1.2 để nghiệm thu.

### Icon expand

IAB trên kiosk-posm-07, viewport 1329×912: nút 48×48px có border 1px,
SVG 48px căn phải làm tâm icon lệch trái 1px. Path đối xứng trong viewBox.
Đổi SVG thành 46×46px với padding 12px: vùng vẽ vẫn 22×22px, tâm x/y
sai lệch 0px. Không đổi hit target, glyph, border, hover width hoặc duration.
Selector dùng chung với Back hiện hữu; việc bỏ Back thuộc delta đang discovery.

`prepare:site`, `qa:static` PASS. Case hiện hữu
`square-controls-hover-and-return` PASS 1/1 trên build sau fix: compact48,
hover148, reduced motion0s, viewer/return lifecycle không regression.
Artifact: `.tmp/orchestration/advertising-p13-discovery-20260910/icon-controls/`.
Source/output `detail.css` tại checkpoint chỉ sửa icon cùng SHA-256
`466738aec9fda834c48c027135c1ad76813116f09692426339ab900f73c7b491`.

### Click và motion — chưa có verdict nguyên nhân duy nhất

Chrome DevTools context riêng, VI1440×900, CPU1× và không throttle network:

- Parent → kiosk-posm-01: trace ghi INP88ms, input2ms, processing25ms,
  presentation61ms, CLS0. Có forced reflow ở `layoutRelated`,
  `renderRelatedWindow` và shared scroll/header; chưa định lượng đóng góp
  nhân quả từng hàm bằng thí nghiệm đối chứng.
- Related kiosk-posm-01 → kiosk-posm-07: một lượt observer ghi interaction176ms,
  long task57ms, khoảng frame lớn nhất94,3ms. Hai mẫu trước morph có hero
  visibility visible; mẫu65,2ms mới có clone và hero hidden; clone kết thúc
  ở mẫu559,9ms. Đây là điểm cần xử lý vì có thể gây nhảy trước chuyển động.
- Source `renderPhoto` gọi `layoutRelated` đồng bộ, trong requestAnimationFrame
  và trước morph; `runPhotoMorph` chỉ ẩn target sau khi tạo clone. Đây là
  code đã đọc, không là bằng chứng solver chiếm toàn bộ thời gian khựng.

Trace/observer trả inline trong task, không lưu raw trace từ DevTools vì
workspace export chưa được hỗ trợ. Một lượt không đại diện p95, mọi máy hoặc
mọi ảnh. Chưa sửa performance hoặc thay motion timings trong fix icon này.

Graphify AST fresh, semantic pending225; Serena context codex/project/LSP ready.
Không extraction, không full canonical parity, không commit/push/deploy.

### Khung hero không có dải nền tối — 2026-09-11

Owner yêu cầu ảnh scale giữ tỷ lệ, hiện trọn và không có dải đen hai bên.
Chrome tại 1569×912, kiosk-posm-07: figure rộng 549,75px, ảnh/frame rộng 513px,
cùng cao 684px. Nền figure `rgb(43, 44, 43)` lộ 18,375px mỗi bên;
ảnh intrinsic 1086×1448 đã giữ đúng tỷ lệ 3:4, không phải lỗi file ảnh.

Chuyển loading surface từ figure sang frame ôm sát ảnh; figure transparent.
Giữ width/height auto, object-fit contain và giới hạn chiều cao hiện hữu.
Contract R2 bổ sung rõ phần dư của figure không tạo dải nền đen.

Chrome DevTools kiểm kiosk-posm-07 tại 320×568, 390×844, 820×1180,
844×390, 1569×912 và 2560×1440: tỷ lệ sai khác tối đa 0,000029 do làm tròn
CSS subpixel; frame dư ngang tối đa 0,016px, không dư dọc, nền figure
transparent và không tràn ngang. Screenshot native 1569×912 xác nhận hết
dải tối. Một lượt mở viewer cùng viewport có 59 mẫu opening/open,
tỷ lệ 0,749999876–0,750000112; không kéo méo ảnh trong mẫu motion này.

`pnpm prepare:site` và `pnpm qa:static` PASS sau fix. Source/output
`detail.css` cùng SHA-256
`5d44cf668721b7be1d2f5ce758d4e0f843373e7d832f8cdaa953c7a7aea769f0`.
Số đo lưu tại
`.tmp/orchestration/advertising-p13-discovery-20260910/hero-bars-check.json`.
Đây là kiểm tra riêng correction nền khung và ratio, không nghiệm thu
mọi ảnh/thiết bị vật lý hoặc responsive parity Pinterest. Không đổi các mức
zoom/pan đã duyệt; discovery layout/motion tiếp tục trong card hiện tại.

### Navbar detail bị ghim hiện — 2026-09-11

Chẩn đoán read-only bằng Chrome DevTools, desktop1569×912, CPU/network
không throttle. So sánh `/vi/advertising-products/?category=kiosk-posm&photo=kiosk-posm-04`
với `/vi/residential/` trong hai context test riêng. Chuỗi thao tác native:
đầu trang, PageDown hai lần, PageUp một lần, Control+Home; đọc sau khi settle.
Desktop dùng Locomotive nên `window.scrollY` vẫn0; logical scroll được đối
chiếu bằng top của scroll container, không coi scrollY0 là đã ở đầu trang.

| Trạng thái | Advertising detail | Residential |
| --- | --- | --- |
| Đầu trang, containerTop0 | Header cao102,515625px, y0 | Cao102,515625px, y0 |
| Xuống1824px | `is-collapsed is-hidden`; cao81,390625px, y0 | Cùng hai class; cao81,390625px, y−81,390625 |
| Lên còn912px | Hết `is-hidden`, vẫn collapsed; cao81,390625px, y0 | Cùng trạng thái và geometry |
| Về đầu trang | Hết collapsed; cao102,515625px, y0 | Cùng trạng thái và geometry |

Cơ chế khác biệt đã xác định: `src/site/detail.css:2185` đặt
`body.is-advertising-photo .site-header { transform: translateY(0) !important; }`.
Shared controller trong `motion.js` vẫn phát đúng class ẩn; override chặn
transform ẩn. Trong mẫu này, thu/phóng chiều cao đã khớp; không quy toàn bộ
hành vi collapse/expand thành lỗi của controller chung.

Source/output CSS cùng SHA-256
`5d44cf668721b7be1d2f5ce758d4e0f843373e7d832f8cdaa953c7a7aea769f0`;
source/output `motion.js` cùng
`31df973bab4f5d1a80a2e87a727d5c772b184d2e6edea1e5ec61cd0e5544addf`.
Owner đã chọn dùng hành vi chung đầy đủ: mở ở đầu trang, thu/ẩn khi cuộn
xuống theo ngưỡng hiện hành, hiện lại dạng gọn khi cuộn lên và mở đầy đủ khi
về đầu. Quyết định thay yêu cầu R2 cũ giữ navbar detail luôn nhìn thấy.
Intent P1.3 ghi correction này; chưa sửa source trong lượt interview.
Chưa kiểm touch/pen, pointer force-show, menu, mọi breakpoint hoặc các lượt
chuyển photo/history. Không dùng phép so sánh này làm full parity PASS.

### Tính thử geometry cho draft P1.3 — 2026-09-11

Đây là nghiên cứu để review spec, không là acceptance của UI mới. Các
thông số chia vùng/span/ratio vẫn là đề xuất trong card Advertising.

- Chrome DevTools, page local `kiosk-posm-04`, desktop emulation, DPR1;
  đọc sau font ready và chờ 1.150ms cho shell settle. Logical scroll0,
  header y0 ở cả bảy mẫu. Viewport window320/390/844/820 có scrollbar10px;
  dùng clientWidth310/380/834/810 để tính grid. Các mẫu1024/1329/2560
  có clientWidth bằng window width.
- Hnav expanded:72,59375px tại window320×740 và390×844;
  132,78125px tại844×390 và820×1180;85,390625px tại1024×768;
  102,515625px tại1329×912 và2560×1440. Header này là input live,
  không dùng Hnav collapse hoặc đo frame giữa transition.
- Dùng109 intrinsic dimensions từ catalog, công thức đề xuất và bảy mẫu
  trên:763 tổ hợp không có primary vượt trần chiều cao hoặc vùng ảnh/mô tả
  âm; các span1/2/3/4 đều xuất hiện. Không chạy related solver hoặc đo chữ.
  Raw input, hàm tính, ví dụ và giới hạn ở
  `.tmp/orchestration/advertising-p13/geometry-spec-preflight-20260911.json`.
- CSS nguồn giữ SHA-256
  `5d44cf668721b7be1d2f5ce758d4e0f843373e7d832f8cdaa953c7a7aea769f0`;
  kernel giữ
  `fd0350874c82a3e81a3043a2ed8dd7af5d2984ffa8c07c83514a29de2c00591a`;
  runtime giữ
  `e0eedc8e674bb8913c4aa15380580add2929070e7c18e844edd685ebf0341c53`.
  Chưa sửa source, chưa kiểm safe area khác0, mô tả dài, browser zoom,
  perceived motion hoặc mọi thiết bị. Tab local đã trả1569×912, logical top.

## P1.3 checkpoint A — Geometry và gợi ý, 2026-09-11

Owner đã duyệt spec và implementation plan T1–T9 trong card Advertising.
T1–T2 đã tích hợp; các gate này không nghiệm thu T3–T9 hoặc toàn website.

- Pure geometry/layout: 19/19 PASS, gồm 763 mẫu công thức độc lập; related
  8/8 PASS với 1.320 tổ hợp, giữ oracle ảnh thật v7 và budget300.000.
- Build `pnpm prepare:site`, `pnpm qa:static`: PASS.
- Chromium geometry: 10/10 PASS trên1569×912,390×844,844×390,
  ảnh đứng/ngang/vuông và resize qua ba dạng cửa sổ. Viewer quick1/1 PASS.
  Mô tả dài cuộn riêng bằng End/Home; ảnh giữ ratio và không tràn primary.
- Main đọc code/helper/test, đối chiếu hash và kiểm Chrome DevTools tại
  desktop1569×912 và mobile390×844: frame ôm ảnh, nền trong suốt;
  heading/label16/24px700, banner103px, gap8px; không có console error.
- Gate resize lần đầu đọc header giữa transition; test đã thêm header vào
  convergence snapshot. Không đổi công thức hoặc tolerance để qua gate.

Run: `.tmp/orchestration/advertising-p13-20260911/`.
Evidence `checkpoint-a/latest.json` SHA256
`3003a036160e39c052f3535afd3370f8af80242241c4cfcacfa67db5bfa0727d`;
viewer `checkpoint-a-default/latest.json` SHA256
`a4bcdbf90a47baa551bab45ddfd3a181eb833f113e9a176ace90ce97797d47e5`.
Snapshot `checkpoint-a-source/` giữ runtime SHA256
`15fb2f0f5b19d0a08143e5742afe470458bfa63c12541c5012c6976c05f2608d`,
kernel `116b6ace8da936886ee8ff0f61663758443a6fc08658d7e8aa8fd25f84b0514b`,
CSS `aa437cb4057d92fc12a4c10f667c69fdfbacae94cf0f77f8ad373b2e0c4f1fe1`.
Runtime output tại checkpoint khớp source; đây là checkpoint trước motion T3/T4.

## P1.3 checkpoint B — Chuyển vị trí và mở ảnh, 2026-09-11

T3/T4 đã tích hợp và được Astra review độc lập. Related dùng chung Masonry,
media observer và fade600ms với parent; đổi geometry dùng400ms ease, remount
scroll giữ tọa độ cache ngay. Morph giữ một clone, dùng rect đang thấy khi
interruption và hoàn tất target media trước khi bỏ clone. Adapter logical
scroll dùng public `setScroll` của Locomotive4.1.4 để tránh defer một frame.

- Focused motion4/4 và full transitions9/9 PASS; history, identity, rapid
  input, resize, delayed image, dependency fail-open, locale và DOM bounds.
- Chrome1329×912, warm20 lượt mỗi luồng: p95 feedback parent→photo22,8ms,
  related→photo13,2ms, photo→parent30,0ms. Callback đồng bộ lớn nhất26,2ms;
  không callback hoặc LongTask trên50ms. Đây không là field INP.
- Baseline cũ chỉ đo scheduling envelope, chưa có probe callback; không dùng
  trường raw `handlerTaskMs` cũ để kết luận handler trước/sau.
- Main mở rộng geometry gate: mô tả dài End/Home/wheel chỉ cuộn vùng mô tả;
  clip cohort khi resize giữ8px cho focus ring. Kết quả10/10, review độc lập
  đã kiểm; touch mới được review source, chưa là kiểm thiết bị thật.

Evidence trong `.tmp/orchestration/advertising-p13-20260911/`:
`motion-final/cp3-transition-e2e-results.json`,
`motion-final-timing/evidence/p13-t4-baseline.json`,
`motion-final-full-rerun/cp3-transition-e2e-results.json`,
`description-green-final/latest.json`. Báo cáo protocol ở `motion-test-report.md`.
Full transitions giữ runtime SHA256
`7f2bec99ee4b6cfc5131d4c8a63a4bf5460372810d48b80dca50ba109939e3fd`,
motion `4108f8d3971ab8e9a57036498fc36085f14ce4475b23413e4183d3b195de5d0e`,
CSS `b38132c4846bd1307f4f0d12af02b21e2fb6672703364a616b4452213ed779f4`.
Sau fix cuộn/clip, geometry10/10 giữ runtime
`39a2730fe0bf625884f01227dc8496394278d1477db72fea9afccb486cc2f073`,
CSS `8f89fade75bf503d20e7f266ac3ee547a889cf181a9fbe9e94d2fbaada007785`.
Không dùng checkpoint B thay kiểm tích hợp cuối T5–T9 hoặc full-site PASS.

## P1.3 checkpoint C và nghiệm thu kỹ thuật, 2026-09-11

T1–T9 đã triển khai theo spec/plan owner duyệt. Technical acceptance P1.3
được tổng hợp từ các checkpoint và các lượt kiểm lại đúng phạm vi ảnh hưởng;
không có một lượt toàn website mới. Owner spot-check VI/EN còn mở.

CTA nằm trong continuation sau đáy ảnh thật; frame đậm hơn và chữ giữ line
reveal1,9s/stagger0,1s. Navbar parent re-click về top giữ query/history;
photo bỏ Back và underline, dùng chung collapse/hide/reveal. Control vuông,
zoom/focus và history giữ contract. Mô tả dài cuộn riêng, ảnh giữ ratio;
cụm “Có thể bạn thích”/“You might like” giữ16/24px700, banner103px.

| Gate | Kết quả và giới hạn |
| --- | --- |
| Node và static | 47/47; `pnpm prepare:site`, `pnpm qa:static`, diff-check PASS. Giữ oracle v7 và tổng budget300.000. |
| Geometry và chữ lớn | 16/16: ảnh đứng/ngang/vuông, resize, mô tả dài End/Home/wheel, chữ200% bằng CSS tại320×568/568×320/1329×912. Không gọi đây là browser zoom thật. |
| Grid và scrollbar | Một cột6/6, scrollbar6/6; sweep liên tục76 cửa sổ320–2560 PASS. Oracle tách content width khỏi window width của media query header và chờ related motion kết thúc. |
| Transition/CTA/control | 9/9: stuffing, identity, rapid/Back, delayed image, dependency fallback, locale, tags, CTA và control/history. Không đổi viewer math để qua gate. |
| Viewer ba engine | Run đầu141/146; năm case lỗi được giữ nguyên evidence, kiểm lại theo phân loại bên dưới và đều PASS. Không ghi đè thành một report146/146. |
| Navbar | Focused15/15 trước correction header; run tích hợp sau đó14/15, riêng fixture vuốt mobile đã sửa precondition và kiểm lại2 lượt1/1. Header19/19 thường và 19/19 với scrollbar10px. |

Phân loại và correction đã kiểm:

- Hai touch case390px bị link menu đã đóng nhận tap; pointer-events override
  nay chỉ áp dụng khi menu `[open]`. Hai lượt viewer tương ứng2/2 PASS.
- Sweep đọc trạng thái giữa transform400ms; probe thấy overlap tạm thời
  ở frame1–10, hết trước frame15. Oracle nay chờ cả tọa độ related và
  transform, không đổi geometry/animation duration hoặc giảm tolerance.
- Firefox lock và WebKit convergence không tái hiện qua ba probe riêng mỗi
  engine. Test bổ sung settle sau F5 và readiness evidence; retest mỗi engine
  1/1. Chưa đủ evidence khẳng định nguyên nhân của hai failure cũ; không sửa
  production viewer theo suy đoán.
- Native navigation fallback từng đọc body khi tài liệu đang thay; test chờ
  body trước đọc class. Fixture vuốt100ms từng fling về top khi đang kiểm
  trạng thái giữa trang; đổi sang swipe600ms, chờ native inertia, giữ nguyên
  điều kiện hide/reveal/scroll. Hai lượt retest mobile đều1/1.
- Header751–767 dùng track brand hẹp sai breakpoint; nay chuyển đúng750.
  Dải961–1200 dùng track theo nội dung VI/EN và spacer co giãn tối đa
  44,4609375px. Tại320 với client310, dịch riêng glyph menu2,5px cho
  clearance24,25px; button65px vẫn nằm trọn viewport. SVG, logo, font và
  chiều cao header giữ nguyên. Footer wrap ở chữ200% để không tràn ngang.

Main kiểm Chrome DevTools và ảnh trong `final-ui/`: portrait desktop,
landscape EN, portrait mobile và gợi ý; CTA ở
`transitions-final/cta-overlay-desktop.png`. Review độc lập Astra đã kiểm
runtime/motion, fallback, oracle và các correction header. Đây là emulation
Chromium/Firefox/WebKit và native touch qua CDP; chưa kiểm thiết bị vật lý,
browser toolbar zoom hoặc safe-area phần cứng khác0. Không gọi là Pinterest
1:1 trên mọi thiết bị hoặc field INP. Protocol warm p95 giữ tại checkpoint B.

Run root `.tmp/orchestration/advertising-p13-20260911/` giữ raw reports:
`transitions-final`, `geometry-textzoom-complete`, `one-column-final`,
`scrollbar-current`, `sweep-settled`, `viewer-final`, `touch-expand-final`,
`firefox-lock-retest`, `webkit-geometry-retest`, `navbar-final-6`,
`navbar-t8-final`, `navbar-touch-current`, `navbar-touch-repeat`,
`header-band-320-final` và `header-band-320-scrollbar-final`.
`final-provenance.json` giữ source/output/test/report hashes và ranh giới
revision; `navbar-report.md` giữ before/after header và native probe. Hai header matrix
chạy tại4173 bằng `serve-static-parity.mjs --port 4173`, root `.site-output`,
sau build cuối. Provenance dựa trên command/log và hash filesystem sau run;
report header không nhúng response-byte hash. Main kiểm trực tiếp8787, gồm
320/client310 với clearance24,25px và primary bottom552px trong viewport568px.

Final runtime SHA256
`03080c23c3f1ca67b96fc17a77063d1b3814fc23ba4e8b376332a2f773fdd1bb`,
kernel `116b6ace8da936886ee8ff0f61663758443a6fc08658d7e8aa8fd25f84b0514b`,
motion `5d03d5bd487346213c1a0add2afde93d49014d2032499f215dd2e0d973b9aa0c`,
detail CSS `f827cd12a57c6545a8103d19ce35afe1bba246d288efb0eb245fa8505a6f3fce`,
shell CSS `23a9e431dfaf389b97da5bc8a3b70afcc890567302b555909adf75a58ad8f676`.
Các asset này byte-identical với output. HTML source
`83da661cd4ee3885c24c08ffce384114cbf3cc67f68775ccb6ae7c8cc654a3b7`
khác output do build thêm `data-vi`; đã đối chiếu normalization chỉ loại
annotation đó và whitespace, không coi HTML là byte-identical.

Card giữ In progress: owner preview, logo R3, thư viện/mapping ảnh, biển đường
V6 và CTA toàn site còn phạm vi riêng. Không commit/push/deploy, semantic
extraction hoặc canonical parity. Full-site verdict vẫn NOT PASS.

## Correction shuffle và trạng thái viewer — 2026-09-11

Owner báo click related làm thumbnail còn chồng lên hero, đôi lúc phải reload.
Đã tái hiện trong tab Codex ở EN kiosk-posm-03 sang02: clone đã hết nhưng
card02 vẫn hiện vì link đang focus được giữ dù không còn placement. Đây là
lỗi retention của cohort, không phải morph clone bị kẹt. Runtime nay chỉ giữ
focus/anchor thuộc layout hiện tại; focus của card bị loại chuyển sang region
mô tả với preventScroll, card cũ ẩn rồi được loại sau settle. Không đổi solver,
duration, media hay bố cục P1.3.

Owner chọn nút trắng sang xám khi hover. Close/zoom/reset giữ48px vuông,
icon1,5px; phân biệt hover/active/disabled/focus theo R4 spec. Logic zoom và
reset không đổi. Main đã xem trực tiếp viewer max và đóng lại trong Codex;
log error/warn rỗng, ảnh thừa0 và morph clone0 sau chuyển ảnh.

Evidence tại `.tmp/orchestration/advertising-related-shuffle-20260911/`:

- `red/`: native click tái hiện card02 còn tồn tại; `green/`:4 tình huống
  EN1569, VI1922, keyboard390, reduced390 đều không còn card thừa, clone0 và
  focus ở detail. Test dùng click/Enter thật để bắt lỗi mà element.click bỏ sót.
- `controls-red/`: disabled icon không phân biệt; `controls-green-final/`:
  PASS màu thường/hover/pressed, min/max disabled không hover, reset và close,
  square hit target và focus ring. `viewer-quick/latest.json`: Chromium2/2.
- `transitions/`:9/10, continuity Back fail; probe cũ so rect trước yêu cầu
  history.back với rect khi popstate xử lý, có thể cách một frame đang chạy.
  Probe nay lấy rect ở đầu handlePopState; giữ tolerance2px, không sửa motion.
  `handoff-entry/` PASS. Probe popstate listener thử trước đó không nhận event
  vì handler hiện hữu stopImmediatePropagation; đã bỏ probe đó.
- `final/`:10/11; chỉ CTA line-entry fail. `cta-recheck/`:1/1 PASS khi kiểm
  riêng, không thay source CTA hoặc nới assertion. Không gộp hai run thành
  một lượt11/11. Chưa kết luận nguyên nhân CTA không ổn định từ lượt này.
- `pnpm prepare:site`, `pnpm qa:static`, Impeccable detect và kiểm whitespace
  diff scoped PASS. Main review xác nhận sửa retention tại đúng related
  window, không thêm dependency hoặc thay semantics history/zoom. Không phải
  full-site/canonical PASS.

SHA256 source/output runtime cùng
`409f00c7aefb42555f1db629a2bbc6af9fbe1c4de7d465d4f885e174396383fa`;
detail CSS cùng
`da72ba2eee2e01606ef0cb2981aab34cc4c4a3572295d5d58160c6b5f46e6406`.
Test transitions
`7554cb5605c96eef4e37723fdd6e6f4210a7466161baa04cd8932bc88089cc3f`.
Snapshot trước sửa cùng thư mục evidence giữ diff của đúng correction.

Owner tiếp tục yêu cầu primary cố định span3 cho ảnh ngang/span2 cho ảnh
dọc, mô tả linh hoạt và nền cover blur sau ảnh fit. Delta mới được tách sang
[card detail 3/2 cột](https://app.notion.com/p/3d7332849a0e81dcaf93ee8955892b26)
theo yêu cầu owner; chưa dùng yêu cầu đó sửa kernel hoặc xóa gate P1.3.

## Khảo sát khoảng navbar và chiều cao tự nhiên — 2026-09-11

Owner thay quyết định: giữ nguyên navbar hiện hành, chiều cao primary linh
hoạt nhưng cả khối phải vừa viewport ở top và lộ một phần ảnh thật bên dưới.
Đây là yêu cầu cho delta tiếp theo, chưa phải kết quả triển khai.

Đọc live bằng tab Codex tại VI kiosk-posm-04, viewport1569×912, scrollY0:
header bottom102,515625; primary top118,515625 nên gap16px; primary
bottom896, height777,484375; ảnh ở hàng dưới primary bắt đầu y931 nên chưa
lọt viewport. Vùng mô tả clientWidth722, clientHeight291, scrollHeight309;
title/paragraph rộng512px do max-width32rem. Không suy số đo này thành mọi
ratio/locale hoặc trạng thái cuộn.

Impeccable layout assessment: ảnh là nhóm chính, mô tả hỗ trợ, related mở
đường duyệt tiếp. Đề xuất dùng một interCardGap hiện hữu để phân biệt navbar
với canvas; đọc content theo chiều rộng thật trước khi phân bổ chiều cao.
Khoảng15/25/35px được kiểm từ advertisingSpacing và decision spacing;
không nhầm override Advertising15px với narrow gutter20px toàn site.
Mechanical scan layout cho `src/site/detail.css` và
`src/site/advertising-products/catalog-runtime.mjs` trả `[]`, exit0; không phải
proof rằng bố cục hiện tại đã đạt yêu cầu mới.

Spec draft trong [card mới](https://app.notion.com/p/3d7332849a0e81dcaf93ee8955892b26)
đề xuất dải ảnh bên dưới48–96px, theo8% chiều cao
viewport, ngoài gutter. Các số này là lựa chọn thiết kế đang chờ duyệt;
không phải thông số đo từ Pinterest hoặc nghiệm thu implementation.
Chưa sửa source, build hoặc chạy lại UI test trong lượt khảo sát này.

Owner yêu cầu kiểm card cũ trước khi Done và tách interview sang card mới.
Đã đối chiếu evidence P1.3/correction, LOGO-R3 và audit media: card cũ còn
owner preview, biển đường V6 cần sửa, mapping ảnh mới và CTA toàn site.
Giữ In progress; việc tách draft không tự hoàn thành các phạm vi này.

## P1.4 — detail3/2, mô tả và CTA trong ảnh — 2026-09-11

Owner yêu cầu bắt đầu thực thi sau khi chốt intent tại
[card detail3/2](https://app.notion.com/p/3d7332849a0e81dcaf93ee8955892b26).
Contract là delta P1.4 trong [photo browse](../specs/advertising-detail.md#r2-hình-học-primary).
Source đổi ở `layout-core.mjs` (chỉ geometry primary), `catalog-runtime.mjs`,
`advertising-products/index.html` và `detail.css`; không đổi navbar/controller,
packing kernel v7, media, font delivery hoặc CTA grid. Code giữ worktree cũ;
không commit/push/deploy.

Ngang>1,10 dùng3 cột, đứng/vuông dùng2; thiếu chỗ thì clamp/stack. Chiều cao
đo từ ảnh và chữ, giữ trọn primary và dải ảnh dưới viewport. Foreground contain,
nền duplicate cover+blur; title2rem/600, nội dung một luồng gap12px. Một CTA
được chuyển vào dưới trái ảnh, expand dưới phải; giữ native link và VI/EN.

Review Astra/high phát hiện và main sửa ba gap: sparse một ảnh chỉ nằm bên
cạnh; gợi ý N1 nằm cuối toàn grid; đổi cỡ chữ cùng viewport giữ cache cũ.
Candidate thiếu actual peek nay thử giảm N trong cùng budget. N1 đặt gợi ý
sau ảnh thật đầu và giữ gutter quanh reservation; không tạo media giả. Cache
và observer nhận thay đổi typography. Re-review:3/3 ADDRESSED, scoped spec
PASS, quality APPROVE; effective route unknown. Main đã kiểm diff so với
snapshot trước task và hash, không lấy toàn bộ dirty HEAD diff làm scope.

Evidence local ở `.tmp/orchestration/advertising-primary-p14-20260911/`:

| Kiểm | Lệnh hoặc artifact | Kết quả/phạm vi |
| --- | --- | --- |
| Build/static | `pnpm prepare:site`, `pnpm qa:static` | PASS; output static được build lại |
| Node | `node --test tests/site/advertising-one-column.test.mjs tests/site/advertising-products-layout.test.mjs tests/site/advertising-products-lifecycle.test.mjs tests/site/advertising-products-static.test.mjs tests/site/advertising-photo-layout.test.mjs` |30/30; `node-final.log`; gồm109 ảnh, mọi hero/tag, v7 và geometry measured |
| P1.4 browser | `node tests/site/advertising-primary-p14.e2e.mjs` |29/29 Chromium; VI/EN,320–2560, ratio/sparse/CTA/resize/text200/reduced; `browser-proof-results.json` |
| Continuous resize | `PHOTO_VIEW_SWEEP_ONLY=1`, `PHOTO_VIEW_ENGINES=chromium`, `node tests/site/advertising-photo-view.e2e.mjs` |1 suite PASS,76 cửa sổ; `sweep/latest.json` |
| Viewer quick | `PHOTO_VIEW_QUICK=1`, `PHOTO_VIEW_ENGINES=chromium,firefox,webkit`, cùng runner |3/3, caseLimit1; `viewer-final/latest.json`; không phải toàn matrix ba engine |
| Transition | `node tests/site/advertising-photo-transitions.e2e.mjs` |`transitions-final/`:10/11; CTA grid line-entry fail. `CASE=grid-cta-skeleton-flow` retest1/1 PASS trong `transitions-cta-retest/`; không gọi thành một lượt11/11 |

Các runner dùng output directory riêng theo tên artifact trên. RED geometry9/9
và browser0/27 đã lưu trước build. Main phát hiện runner browser ban đầu chặn
mọi tài nguyên ngoài origin, nên lượt29/29 đó chỉ chứng minh fallback. Runner
đã sửa chỉ chặn navigation liên hệ ra ngoài, cho phép font/CSS/script hiện hữu;
lượt normal29/29 xác nhận Plus Jakarta Sans đã load và motion-ready. Snapshot
cuối còn chờ opacity, transform và tween của logo/nav/menu kết thúc; main đã
xem lại desktop và mobile với header hiện đầy đủ. Không dùng ảnh chụp fallback
hoặc nav đang entry làm nghiệm thu visual cuối.

DevTools local riêng: main xem ngang VI kiosk03 và đứng EN kiosk09 tại1569×912.
EN kiosk09 primary top137,515625, height636,09375, info client/scroll cùng636px;
font Plus Jakarta Sans đã load. Network font/CSS/script/document trả200,
console error/warn rỗng. A11y tree có một link Discuss an idea và nút View larger,
không có ảnh nền trang trí; đây là kiểm scoped, không claim audit WCAG toàn site.
Đã xem các screenshot mobile/desktop/sparse/text200 và mở preview VI/EN trong
Codex; open tool trả queued, owner spot-check vẫn mở.

Impeccable detect HTML/CSS exit0, có advisory thay vì sạch toàn file:
width animation là contract control250ms; title2rem/control0,75rem và màu
white/gray đã ghi trong DESIGN. Full-bleed frame không cần text padding;
copy là overlay control có inset. Các cảnh báo typography/marquee/palette
ngoài delta và source-only contrast không được coi là runtime finding mới.
Default src được bổ sung cho nền, không còn broken-image warning ở markup.

SHA256 source/output runtime cùng
`1e52a1711772e01cbcef9919ba3e8b760c5efec78c1c64cb04aff942bd7930a3`;
geometry cùng`f68d02cf7821dea9182fda6b1876546790ac668c2060175071aa65c3a09d7f01`;
CSS cùng`8380401a0cf0d9695b26d38e12e8780d5dc97ac039c0087499447d342accd01a`.
HTML source`deb5a12ec677d2db5cf56b52909e434e6afd6fd6672b295e9828ad8cdd13b6dd`;
HTML output có data-vi do build, không yêu cầu raw hash bằng source.
Provenance đầy đủ trong browser-proof JSON và source-hashes JSON.

Giới hạn còn lại: owner kiểm preview; ca CTA grid trong suite tổng còn không
ổn định như baseline, chưa kết luận nguyên nhân; full-site/canonical vẫn
NOT PASS. Card mới giữ In progress chờ owner nghiệm thu; card cũ giữ scope
logo/media/global CTA riêng. Graphify AST fresh,225 semantic pending; không
extraction. Serena ready; không thêm dependency hoặc suppression để đổi
diagnostics Node/JSDoc hiện hữu của `.mjs` thành một gate mới.

## Bỏ tag row detail — 2026-09-11

Owner yêu cầu bỏ hàng nhãn dưới mô tả vì trùng gợi ý. HTML/runtime/CSS đã
gỡ hàng này; metadata, tag URL, gợi ý và nút bỏ bộ lọc đang chọn vẫn giữ.
Contract cập nhật trong photo browse, DESIGN và patterns; không đổi geometry,
viewer hoặc motion để thực hiện correction này.

Artifact `.tmp/orchestration/advertising-tags-removal-20260911/`:

- `pnpm prepare:site` và `pnpm qa:static`: PASS.
- P1.4 browser filter1569×912: 7/7 PASS. Không phải một lượt29case mới.
- `related-suggestions-replace-state`: 1/1 PASS; gợi ý, history và locale.
- `p13-position-stuffing-and-remount`: chưa PASS toàn case. Fixture dùng nhãn
  sampling chỉ có3 ảnh, không đủ chứng minh travel; đã chuyển sang deep link
  `format-portrait` còn được hỗ trợ. Run `stuffing-deeplink` qua tag stuffing
  và cached remount, sau đó FAIL tại `filter-interruption-resize`, assertion
  giữ vị trí ở thời điểm input. Chưa kết luận là regression hay timing của
  phép đo; không giảm assertion hoặc đổi verdict thành PASS.
- DevTools route VI office05: tag row0, suggestion5, vùng mô tả không overflow.

Runtime source/output của run cùng SHA256
`4333185b61f2e32dd73943405bc3e889aa4c6947aea7fb784afbc6bfa2a8a8fa`.
Ngưỡng1,8, logo/hero typeset và skeleton/CTA mới còn trong discovery ở
[card hợp nhất](https://app.notion.com/p/3d8332849a0e8177ba63d3b965242c90);
không dùng evidence trước đó để claim đã triển khai những delta này.

## D8-A — bỏ tên ảnh, checkpoint ngày 2026-09-13

Owner đã yêu cầu bỏ title/caption ở mọi grid Advertising và tiêu đề lớn của
ảnh detail; giữ mô tả, tag và thông tin thay thế cho ảnh. Contract hiện hành
ở [D8](../specs/advertising-detail.md#r3-info-nhóm-mô-tả-cta). Đây là phần riêng,
chưa bao gồm chuyển gợi ý vào mô tả hoặc toggle filter.

Source hiện không render caption ở parent, related hoặc noscript; detail
không còn node title. Region có accessible label VI/EN. Compiler product
không dành chiều cao cho caption; artifact dùng `advertising-grid-v9`,
metric `advertising-caption-v2`. Runtime/compiler/CSS source và output khớp
hash; build vẫn sở hữu output, không edit `.site-output` trực tiếp.

Run: `.tmp/orchestration/advertising-resume-r5-20260913/`. RED browser bắt
được 17 caption trước patch; RED unit bắt reservation caption. Focused unit
và browser VI/EN tại390/1440px đã GREEN. `pnpm prepare:site` và main
`pnpm qa:static` PASS. Code review Astra/high phát hiện consumer P1.4 và motion
còn đòi title/caption cũ; worker đã sửa. Review lại scoped test patch APPROVED,
main kiểm hash và assertion. Related kiểm count>0, caption0, tile cao bằng ảnh,
không cho kiểm rỗng PASS. Patch từ exact before snapshots:
`41ee0eee40553f90e932855e0650219ad96519285278bc1abee416f33e8c3996`.

P1.4 run mới generated00:27:36Z đạt20/29: sáu ca dùng oracle span1,35 cũ,
một ca settle timeout và hai ca body text200% không tăng kích thước. Không
sửa các rule ngoài title chỉ để làm xanh suite. Run lưu riêng tại
`d8-a-test-repair-p14-current.json`/`.md`; harness ban đầu ghi vào thư mục
P1.4 mặc định trước khi được chép sang R5. Không coi file mặc định ghi mới
là bằng chứng run29/29 lịch sử. Full QA và T02 vẫn chưa đạt.

Grid probe dừng sau30 case:27PASS,734/735/736 fail do oracle cột cũ yêu cầu2
khi compiler trả3. Media probe đạt6/10: image entrance/reduced-motion VI/EN
qua assertion; bốn readiness Barba còn `transitioning:true`. Không sửa
runtime hoặc bỏ gate để làm xanh; xem `d8-a-test-repair-report.md` và
`d8-a-test-repair-media-latest.json` trong run R5. Các verdict này không được
gộp thành full grid/media PASS.

Main DevTools kiểm độc lập route VI kiosk-posm-03 tại929×861: caption0,
title node không còn, category/mô tả/region label còn; không tràn ngang,
console error/warn0,37 request đều200. Screenshot được xem inline; công cụ
không cho lưu vào path run nên không có file screenshot/probe để dẫn link.
Browser evidence này không thay sweep mọi viewport hoặc full-site QA.

Giới hạn: static Advertising tổng hợp vẫn dừng ở valid related390px,
`search-exhausted`, budget300000; đây là T02 chưa giải quyết. Hai fixture
đồng tỷ lệ vẫn fail khi probe bỏ reservation gợi ý. Main đã hỏi owner về
ngoại lệ so le và chưa nới rule. T03/T04, D8-B và public integration còn mở.
Ledger `d8-title.patch` được tái dựng từ thao tác đã áp dụng, **không phải
Git diff**. Không có bản sao đầy đủ trước edit của HTML/CSS vốn đã dirty;
không suy claim kiểm toàn delta từ hash prefix hoặc ledger.

## D9 — Ưu tiên so le10% 2026-09-13

Owner thay strict20% bằng ưu tiên10%, cho phép hàng thẳng sau khi thử nhánh
ưu tiên. Spec [D9](../specs/advertising-masonry.md#r6-đặt-card-và-chuyển-vị-trí) sở hữu
correction, áp parent/related. Source v10, metric caption-v2; code review
độc lập PASS/APPROVED, không có finding Critical/Important. Đây là verdict
code trong slice D9, không là nghiệm thu toàn T02.

Patch thật từ baseline đầy đủ:
`.tmp/orchestration/advertising-stagger-r6-20260913/d9-stagger.patch`, SHA256
`7C5B27CBD65F89E1450617D3DA3E08CAC61210D2938D31DF8AE00BEB972C89D4`.
Main kiểm diff/hash, source và output cùng SHA256
`217CB4CA4B82B52F8B1CFF2ECFEDDBC1A005C0C7582F11CF104937C2412865E5`.
`pnpm prepare:site` PASS; main chạy5 test D9 PASS, gồm exactly10%, dưới
ngưỡng, fallback vẫn từ chối overlap, deterministic và budget nhỏ. Pool
thật109 ảnh ở820px chọn preferred với1.250 operations, không dùng fallback.

Main DevTools mô phỏng820×1180: VI kiosk06/tag format-square giữ3 cột,
primary trong viewport, lộ ảnh thật dưới,24 card trong cửa sổ render đều
unique, không overlap/tràn ngang/console error. Đây là số card đã render
do virtual window, không phải claim chỉ có24 ảnh trong pool. Screenshot
đã xem inline; DOM evidence lưu trong `main-browser.json` tại run R6.

EN mobile04/tag use-sampling cùng viewport còn lỗi mount: related0,
console search-exhausted, nên browser gate tổng chưa đạt. Probe reservation
579px tại810/820px tái hiện cả v9 và v10, xem
`browser-reservation-provenance.json`; không phải regression D9. Giá trị579px
đo từ khối gợi ý route VI square, dùng làm probe tương ứng, không khẳng định
đã đo trực tiếp node gợi ý EN sau mount thất bại.

Suite rộng: layout13/14 do oracle734px cũ; one-column9/10, gồm1.320 case
authored đạt nhưng case751px/use-sampling còn tail failure. Static related
390px vẫn hết budget, đã tái hiện baseline. Không sửa các gate tail/peek
hoặc tăng budget để báo PASS. T02/T03/D8-B và card vẫn In progress.

## D8-B và T02 — R7 trước correction span3, 2026-09-13

R7 chuyển gợi ý vào info: button ảnh tự wrap, một `aria-pressed`, active
URL tag luôn có nút tắt, bỏ reset và suggestion reservation khỏi related.
Giữ body16px bình thường,32px khi root200%; category giữ0,8rem. Overlay
0,62 và viền trạng thái nằm trong button, không bị vùng scroll cắt.

Compiler thử ảnh cạnh primary trước; khi search-exhausted và còn cột cạnh,
thử dải ảnh thật dưới primary. Giữ N, intrinsic, tail/peek; hai arrangements
và các phase D9 dùng tổng300.000. Không thêm spacer/card hoặc sửa layout-core
v10. Trường hợp chỉ có một arrangement vẫn được toàn budget300.000.

Exact patches tại `.tmp/orchestration/advertising-resume-r7-20260913/`:

- `r7-final-source-cumulative.patch`: SHA256
  `A4571FD60C1026ED609917F1903ACEE6D465EA1E927E3A5A7EACFABEEA61255A`.
- `t02-related-fallback.patch`: SHA256
  `0E5D42AD0019B9C6BC6B74B6E608250A2C65A721148E8B082E8508954C88A4ED`.
- `review-minors.patch`: SHA256
  `420C840DF6B0CEE50EB292D02A7BD03DF845DFE6FBF818131B2C8C7AB383D333`.

Source/output runtime `24012E2546894DED276A02A0BC6061FC5F392EF23CD4AF2DD04841D1FB39F557`,
CSS `0898072ABFB36E641DA6B83ECC12D4F3EB137C9A31EEF129BAE8F589F790DD60`.
Code review độc lập Astra/high PASS/APPROVED; effective unknown. Hai minor
aggregate diagnostic budget và native history E2E đã đóng. Main kiểm exact
delta; hai consumer P14/transitions chỉ có ledger trước sửa, không có full
baseline R7. Không dùng provenance hạn chế đó để nhận toàn diff cũ.

Static, prepare, qa:static và focused suggestion E2E PASS; one-column11/11
bao gồm1.320 combos. Main sửa oracle734px theo D1 và thêm mốc±1, layout14/14
PASS; exact2-line patch được review độc lập. E2E kiểm native grid→photo→related,
toggle và Back/Forward với URL/browse state/pressed DOM, text200% scroll đủ.

Main native Chromium emulation: EN mobile04/use-sampling820×1180 đã mount3
ảnh thật, primary bottom698,78, ảnh dưới top713,78, info không overflow;
VI office03/tag08 tại1440×1000 giữ4 cột/span3, primary bottom885, ảnh thật
top920/lộ80px; VI kiosk09 tại390×844 giữ2 cột, primary bottom761,47, ảnh
top776,47/lộ67,53px. Không overlap/tràn ngang, toggle click/Enter giữ photo.
VI square820×1180 mount24 card trong virtual window, unique, info không
overflow.320×568 vẫn mount/fit nhưng mô tả cần scroll; không gọi normal-copy
fit ở cửa sổ này. Screenshot đã xem inline; browser tool không cho ghi file
vào workspace nên không tuyên bố đã lưu screenshot. Đây là evidence R7
trước D10, không nghiệm thu geometry span3 mới, T03/T04 hoặc toàn card.

## D10–D13, CTA và ba ảnh đã duyệt — 2026-09-13

Phạm vi correction owner: span3 mọi layout, clamp min(3,N); lộ50px ảnh thật
dưới primary; năm dòng gợi ý ổn định và active slideshow; ngoại lệ cân đuôi
pool2 để dùng cột4; ưu tiên C1–C5 skeleton/CTA và tích hợp đúng ba ảnh đã duyệt.
Không là nghiệm thu toàn card, canonical parity hoặc toàn transition T04.

### Revision và review

- Core v12: `B890119DC823A35CB95454F51FB551D06EE3AFAA4947C06B2B126AE46F45099D`.
- Runtime: `CB85585CC405F66E0010E140720CFC7241D542A560DAE2FEA4B3EE167914F380`.
- CSS: `8A41EB6B494BE196DF49E35C2AF91EC9B5B1560CE322E9BC5EE3FE2CC909132E`.
- HTML Advertising: `C8136C19C1669831158702F66434EDBD9273EE60E133F0BD272AC7983375A190`.

Main xác minh source/output runtime/core/CSS khớp sau `pnpm prepare:site`.
Reviewer CODE Astra/high (effective unknown) duyệt R8, R9 closure, T06/T07
và D13; không dùng CODE verdict thay review ảnh hoặc UI. R9 hai Important
đã sửa: initial active tag sau top5 và reduced-motion đổi khi đang chạy.
Patch/checkpoint riêng giữ ở `.tmp/orchestration/advertising-span3-r8-20260913/`,
`advertising-suggestions-r9-20260913/` và `advertising-cta-r10-20260913/`.
Main kiểm diff đúng baseline trước mỗi slice; không dùng whole-tree diff làm
provenance riêng vì worktree chứa nhiều source untracked và thay đổi lịch sử.

### Kiểm kỹ thuật và browser

`pnpm qa:static`, `node tests/site/advertising-products-static.test.mjs` đạt
trên v12. Unit photo-layout10/10, one-column12/12 gồm1.320 trường hợp,
products-layout14/14 đạt. P13 Chromium16/16 gồm chữ200% đạt ở R8 trước D13;
không gọi đây là full browser matrix sau mọi thay đổi.

Main native Chromium đo square820×1180 N3/span3 và1922×912 N4/span3:
primary vừa, hàng ảnh dưới lộ đúng50px; năm hàng gợi ý, một active, không
chồng lấn hoặc tràn ngang. D13 case kiosk-posm-01/tag product-02 tại1922×912:
ảnh02 ở x1362,25/y137,52 (cột4); ảnh14 ở x211/y862, lộ50px; hai ID riêng,
không overlap, console không có error/warn. Ngoại lệ chỉ miễn terminal-fill
khi có đúng hai ảnh thực ở bố cục bất đối xứng đã duyệt.

CTA cuối grid desktop1440×1000 hiện hai dòng chủ đích, font64,8px, cao338,69px;
grid kết thúc sau CTA35,31px, marquee sau CTA70,31px. Mobile390×844 không
tràn ngang; chữ được wrap, khoảng sau CTA tới marquee35,16px. Đã bỏ eyebrow,
process và footer invitation, giữ marquee/contact. Hero/CTA dấu VI đã xem
native ở trạng thái hoàn tất; không tuyên bố đo đầy đủ ink mọi font fallback.
Navbar detail idle scaleX0, native hover tiến tới scaleX1 với transition0,3s.

Impeccable type scan đã chạy:53 advisory font-size của toàn detail.css dùng
chung, một cảnh báo font Plus Jakarta Sans và một tight-leading. Giữ font
đã duyệt; các dòng typography route khác ngoài scope, không gọi toàn scan sạch.
Main chạy `node tests/site/advertising-continuation.e2e.mjs` trên v12, exit0:
VI/EN desktop1440×1000/mobile390×844, hai chu kỳ tối đa8giây, drift không
quá4px, chiều cao grid ổn định, filter/offscreen/reduced trực tiếp và20 lượt
public mount/unmount. Test sửa selector không tồn tại và oracle gap/navbar
trước run cuối; claim PASS trước đó bị hủy. Final test SHA256
`D596B51B81CA4F1076D5CBB28AC938DCD76B9E2995DD410BCBB4AED84F90D7A5`.
Main cũng chạy `node tests/site/advertising-suggestion-motion.e2e.mjs`, exit0
trên v12. Tab visibility dùng mô phỏng event trong focused test; không gọi
đó là thử tab hệ điều hành thực hoặc toàn bộ Barba transition suite.

### Ba ảnh được nhập theo duyệt owner

User yêu cầu tích hợp ngay các ảnh đã duyệt, thay điều kiện chờ UI checkpoint
trong kế hoạch T12 cũ cho đúng lô này. Main kiểm HTTP200/byte/SHA ba asset
phục vụ khớp exact WebP đã qua review độc lập và owner approval:

| ID | WebP SHA256 | Bytes |
| --- | --- | --- |
| kiosk-posm-07 | `ad4bbd950c1051d0dba23260d4bde6769e3de261545a9aa8e043d2dfbb404cb8` | 168750 |
| print-decals-02 | `b50b61f47fb75cdeb2517e4b8a3eb42a02e10287aaac828e039034b5fbd89177` | 90194 |
| mobile-retail-05 | `36be8f5f1689075d6abb571b0220d1d1fa4e379d38e6dd814a75c39a6cb8ab3d` | 131532 |

Cả ba1536×1024, giữ ID/URL/product/use; sampling đổi format-portrait sang
format-landscape, mô tả VI/EN viết theo ảnh, không thêm title/caption.
Media17/17 và static đạt; main thấy mô tả EN sampling cùng ảnh mới trong
detail. Source `media-manifest.mjs`, `photo-tags.mjs` và ba WebP là phạm vi
integration. Baseline rollback ở run R5 `media/baseline-pre-public-integration/`;
acceptance/owner-approval lịch sử không bị viết lại. Ảnh chưa duyệt giữ pending.

## Chú thích thuật ngữ

- **Triage**: phân loại ban đầu để định hướng kiểm sâu, không là nghiệm thu ảnh.
- **Oracle**: bộ kiểm hình học độc lập với thuật toán tạo layout.
- **Predecessor**: card ngay trước card đang xét trong cùng cột.
- **Cover**: phóng ảnh phủ khung; banner nhãn và nền trang trí hero P1.4 được crop, foreground giữ contain.
- **Emulation**: trình duyệt mô phỏng kích thước và đặc tính thiết bị.
