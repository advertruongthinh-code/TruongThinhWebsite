---
title: Ba mảng dịch vụ và lưới Sản phẩm quảng cáo
type: frontend
status: accepted
updated: 2026-09-10
notion: https://app.notion.com/p/3cc332849a0e817f9bcafba5e357c21c
related_decisions:
  - ../decisions/advertising-organic-masonry-espacio-spacing-media-distribution.md
  - ../decisions/pinterest-organic-advertising-product-masonry.md
  - ../decisions/deterministic-advertising-product-single-column-media-fit.md
  - ../decisions/selective-splittext-editorial-reveals.md
  - ../decisions/deterministic-advertising-product-masonry-outlayer.md
  - ../decisions/shared-advertising-product-detail-template.md
related_reports:
  - ../archive/reports/verification-advertising-detail-horizontal-carousel-2026-09-02.md
  - ../archive/reports/verification-advertising-detail-compositions-109-media-2026-09-02.md
  - ../archive/reports/verification-advertising-products-109-media-spacing-2026-09-01.md
  - ../archive/reports/verification-advertising-products-organic-masonry-2026-09-01.md
  - ../archive/reports/research-advertising-products-masonry-batching-2026-08-30.md
  - ../reports/research-espacio-motion-audit.md
  - ../archive/reports/research-espacio-project-detail-templates-2026-08-30.md
---

# Đặc tả ba mảng dịch vụ và Sản phẩm quảng cáo

**Contract kế tiếp đã duyệt:** [AD-BROWSE-R1](advertising-photo-browse.md),
ngày 2026-09-10, sở hữu detail từng ảnh, nhãn, history, viewer và CTA trong flow
Advertising. Owner đã duyệt delta một cột AD-BROWSE-R1-P1.1; source parent/related
dùng policy v6, giữ ảnh intrinsic. Sáu composition/rank-v3 bên dưới là baseline lịch sử;
flow mới dùng photo query và compatibility entry. Ngoài delta này, scope ba mảng
dịch vụ và taxonomy vẫn giữ.

**Delta lịch sử đã duyệt:** [GRID-R4](advertising-grid-span-organic.md) gom yêu
cầu grid span 1/2, bỏ fit/canvas và media đã chốt trong interview. Nội dung
rank-v3 bên dưới mô tả baseline cũ; không dùng max-5/single-column hay
proof cũ để nghiệm thu R4. R4 chỉ supersede phạm vi liệt kê sau owner approval.

## Mục tiêu

Website trình bày ba mảng ngang hàng:

1. Không gian Nhà ở là dịch vụ thiết kế và thi công trọn gói.
2. Không gian Kinh doanh là dịch vụ thiết kế và thi công trọn gói.
3. Sản phẩm quảng cáo là các sản phẩm lẻ, được gom thành sáu nhóm.

Thay đổi giữ visual language, header, footer, typography và route transition
hiện tại. Không mở rộng CMS, admin, deploy hoặc tạo một hệ thống Tin tức mới.

Refinement ngày `2026-08-31` chuẩn hóa bốn hành vi liên quan trên toàn bộ public
route `/vi/*` và `/en/*`: shuffle/morph khi lưới đổi tọa độ, scroll cùng contract
với Home, text selection theo Espacio và dependency readiness khi Barba đi vào
Advertising Products. `/admin` nằm ngoài phạm vi refinement này.

Delta single-column ngày `2026-08-31` là baseline đã triển khai: card rộng một
cột, rank-v2, ba frame ratio và closed-frontier batch. Phần layout/media-fit của
baseline này bị delta `2026-09-01` bên dưới thay thế; bounded virtualization,
position morph và ranh giới không triển khai CMS vẫn được giữ.

Delta Pinterest organic masonry ngày `2026-09-01` thay thế phần layout, ratio,
batch và media-fit của delta `2026-08-31`. Card vẫn rộng đúng một cột nhưng
chiều cao theo tỷ lệ tự nhiên của media hoặc `presentationCanvas` được khai báo
rõ trong dữ liệu. Lưới không còn ba frame ratio cố định, rank-v2, full batch
`12`, closed frontier hoặc terminal bottom bound. Card mới nối vào cột thấp
nhất; prefix đã append giữ nguyên tọa độ. `fitMode` không được build chọn ngẫu
nhiên hoặc seeded-random; chỉ tồn tại khi card có `presentationCanvas`. Delta
giữ bounded virtualization, lazy loading, position morph và sáu route taxonomy.

Delta đã được owner duyệt ngày `2026-09-01`, mở rộng riêng hai capability:

| Capability | Sở hữu | Phụ thuộc |
| --- | --- | --- |
| `advertising-grid-geometry` | Outer band và inter-card gap theo Espacio; content căn giữa tối đa `1500px`; `2–5` cột; shortest-column | Không |
| `advertising-grid-media` | Đúng `109` card với source ảnh độc lập, phân bổ sáu nhóm và đa dạng intrinsic ratio | `advertising-grid-geometry` |

Hai capability không thay hero, nav, template sáu trang con, CMS, Wrangler hoặc
deploy. Runtime current-hash đã triển khai cả hai capability với dataset
`2026-09-01.2`; baseline `72/20/16` chỉ còn là historical evidence.

Delta media replay và detail visibility được owner duyệt spec ngày
`2026-09-01`; owner duyệt plan cùng ngày. Root-grid media replay và detail
visibility đều đã đạt scoped current-hash evidence. Spot-check từng phát hiện
gallery đặt motion target trên wrapper và có thể giữ cả block ở `opacity: 0`;
delta ngày `2026-09-02` đã chuyển hook sang node ảnh, khóa fade một lần và
placeholder lỗi. Full Espacio parity vẫn `NOT PASS`:

| Capability | Sở hữu | Phụ thuộc |
| --- | --- | --- |
| `advertising-grid-media-reentry` | Replay media fade khi card đã rời hoàn toàn rồi tái vào viewport | Bounded virtualization và LazySizes hiện có |
| `advertising-detail-media-visibility` | Ảnh hero/gallery của sáu route chi tiết luôn đạt final visible state sau load | Shared detail template và motion bridge hiện có |

Hai capability không đổi position morph, Masonry geometry, gap, copy, asset,
hero, nav hoặc layout/motion editorial của route chi tiết.

Delta sáu composition trang chi tiết được owner duyệt spec và plan ngày
`2026-09-02`; implementation đã đạt scoped current-hash evidence:

| Capability | Sở hữu | Phụ thuộc |
| --- | --- | --- |
| `advertising-detail-compositions` | Sáu route dùng sáu chuỗi block khác nhau từ cùng shared component family | Shared detail template và block renderer |
| `advertising-detail-media-completeness` | Đưa đủ `109` ảnh vào đúng route nhóm, mỗi source đúng một lần kể cả hero | Media manifest `2026-09-01.2` và sáu composition |

Delta không đổi parent Pinterest grid, taxonomy, `109` source asset, header,
footer, route transition, CMS, Wrangler hoặc deploy.

Delta carousel ngang trang chi tiết được owner duyệt spec/plan ngày
`2026-09-02`; implementation đã đạt scoped current-hash evidence:

| Capability | Sở hữu | Phụ thuộc |
| --- | --- | --- |
| `advertising-detail-horizontal-carousel` | Nâng cấp mọi block `gallery` trong sáu composition thành carousel ngang kiểu Espacio, giữ caption và hỗ trợ progressive fallback | Shared detail renderer, Swiper `14.2.0` và media lifecycle hiện có |
| `advertising-detail-gallery-box-integrity` | Loại bỏ vùng nền rỗng do grid item bị stretch; reserve geometry đúng khi ảnh lazy-load, lỗi hoặc dependency chưa sẵn sàng | Carousel geometry và placeholder hiện có |

Delta chỉ tác động sáu route con Advertising Products. Parent Pinterest grid,
block `single`/`double`/`banner`, taxonomy, copy, `109` source asset, header,
footer, CMS, Wrangler và deploy không đổi.

## Route và taxonomy

Parent route giữ nguyên:

- `/vi/residential/` và `/en/residential/`;
- `/vi/commercial/` và `/en/commercial/`;
- `/vi/advertising-products/` và `/en/advertising-products/`.

Sáu route nhóm Sản phẩm quảng cáo:

| Slug | Tiếng Việt | English |
| --- | --- | --- |
| `kiosk-posm` | Kiosk & POSM | Kiosks & POSM |
| `mobile-retail` | Xe bán hàng | Mobile retail |
| `signage-raised-letters` | Bảng hiệu & chữ nổi | Signage & raised letters |
| `office-signs-wayfinding` | Bảng tên, biển văn phòng & chỉ dẫn | Nameplates, office signs & wayfinding |
| `led-displays-lightboxes` | LED, màn hình & hộp đèn | LED, displays & light boxes |
| `print-decals` | In nhanh, ấn phẩm & decal | Quick print, collateral & decals |

Public path dùng `/{locale}/advertising-products/{slug}/`. Cả sáu route dùng
một shared component family và một data manifest. Mỗi route có một composition
config riêng; không tạo sáu bản CSS, JavaScript hoặc HTML template độc lập.

## Nội dung dịch vụ trọn gói

Không gian Nhà ở và Không gian Kinh doanh vẫn là dịch vụ thiết kế và thi công
trọn gói, đều dùng đúng bốn giai đoạn:

1. Khảo sát
2. Tư vấn
3. Sản xuất
4. Lắp đặt và bàn giao

Hai trang dùng cùng cấu trúc editorial process hiện có ở Home nhưng dùng hai bộ
ảnh khác nhau. “Thiết kế và thi công showroom, cửa hàng” chỉ xuất hiện trong
Không gian Kinh doanh.

Home bỏ process bốn bước và thay bằng một block editorial ba mục dẫn tới ba
mảng hiện có. Block chỉ là điểm vào nội dung dịch vụ/sản phẩm, không tạo content
model hoặc route Tin tức mới.

## SplitText editorial contract

[SplitText editorial](../design/motion.md#splittext-editorial) là nguồn chuẩn
cho target, sequence và reduced motion. Dependency/lifecycle ở spec này.

## Public scroll và text selection

Mọi public route `/vi/*` và `/en/*`, gồm Home, Residential, Commercial,
Advertising Products và các trang con, dùng cùng scroll contract của Home:

- desktop từ `981px`, khi không bật reduced motion, dùng một Locomotive Scroll
  lifecycle với `lerp: 0.085`, `multiplier: 0.9` và cùng cơ chế mount/unmount;
- từ `980px` trở xuống dùng native scroll; route con không tự tạo scroll engine
  hoặc thay wheel, touch hay momentum;
- module theo route chỉ phát `site:layout` khi geometry hoặc virtual-window
  membership thật sự đổi. Scroll frame không đổi batch, tập card mount hoặc tọa
  độ phải đi qua fast path: không `reloadItems()`, không `Masonry.layout()` và
  không phát `site:layout`;
- khi scroll vượt biên virtual window, một frame chỉ được commit một lần thay đổi
  membership và một layout tương ứng; không tạo vòng lặp qua lại giữa
  `site:scroll` và `site:layout`.

Đổi filter không được gọi programmatic scroll và không sao chép hành vi tự cuộn
về `#layoutMasonry` của Espacio. Nếu document mới ngắn hơn vị trí hiện tại,
browser/Locomotive được clamp về `min(previousY, newMaxScroll)`; ngoài clamp bắt
buộc này, sai số layout settle không quá `1px`.

Text selection theo computed behavior của Espacio:

- heading, body copy, caption, navigation, menu, filter và button label giữ
  `user-select: auto` theo browser;
- chỉ `html.has-scroll-dragging` tạm dùng `user-select: none` trong lúc người
  dùng kéo smooth-scroll; bỏ class phải khôi phục selection ngay;
- ảnh, draggable media và decorative sprite được phép dùng `user-select: none`;
- `pointer-events` và trạng thái đóng/mở control không được dùng để suy ra policy
  selection.

## Data contract card

Mỗi card có dữ liệu canonical:

```js
{
  id: "stable-id",
  category: "kiosk-posm",
  rank: 0,
  presentationCanvas: null,
  fitMode: null,
  media: {
    sourceId: "unique-original-source-id",
    src: "/assets/content/projects/example.webp",
    width: 1536,
    height: 1024,
    altVi: "Mô tả tiếng Việt",
    altEn: "English description"
  },
  titleVi: "Tên sản phẩm",
  titleEn: "Product name"
}
```

Invariant:

- catalog có đúng `109` card, phân bổ theo canonical category order:
  `kiosk-posm: 24`, `mobile-retail: 16`, `signage-raised-letters: 22`,
  `office-signs-wayfinding: 13`, `led-displays-lightboxes: 18` và
  `print-decals: 16`;
- `id`, `media.src` và `media.sourceId` đều unique trên toàn bộ catalog. Một ảnh
  gốc được crop, blur, xoay, reframe hoặc export thành file khác vẫn có cùng
  `sourceId` và không được tính là ảnh mới;
- mỗi nhóm giữ đủ `12` product label hiện có ít nhất một lần. Card bổ sung được
  lặp product type nhưng phải có stable id, caption và media source riêng;
- ratio kiểm tra từ `media.width / media.height`, không từ crop hoặc
  `presentationCanvas`. Mỗi nhóm có ít nhất một ảnh thuộc từng coverage class:
  portrait `< 0.9`, near-square `0.9–1.1`, landscape `> 1.1` và extreme
  `<= 0.625` hoặc `>= 1.6`; extreme được phép đồng thời thuộc portrait hoặc
  landscape. Đây là coverage gate, không phải chu kỳ ratio để ép thứ tự card;
- mọi card luôn rộng đúng một cột; field `span`, `data-span` và khả năng
  `span: 2` không còn thuộc data, DOM hoặc runtime contract;
- card mặc định không có frame ratio riêng. `naturalRatio = media.width /
  media.height`; media height reserve và rendered height phải được tính trực
  tiếp từ hai intrinsic dimension này, kể cả ảnh ngang, vuông, đứng hoặc rất
  dài;
- `presentationCanvas` mặc định là `null`. Khi được khai báo, object chỉ chứa
  intrinsic `width` và `height` dương; outer media box theo ratio của canvas,
  không theo taxonomy. Cùng dữ liệu phải luôn tạo cùng canvas;
- `fitMode` mặc định là `null` và chỉ hợp lệ khi `presentationCanvas` khác
  `null`. Các giá trị giữ lại là `auto-cover`, `fit-x-blur`, `fit-y-blur`;
  runtime không tự chọn mode và build không dùng hash, random, thời gian,
  network, trạng thái ảnh hoặc DOM để gán mode;
- khi card có nhiều media candidate, nếu có `presentationCanvas` thì build ưu
  tiên candidate có sai số `abs(log(sourceRatio / canvasRatio))` nhỏ nhất; tie
  dùng source media order rồi stable media id. Nếu không có canvas, canonical
  media đầu tiên hợp lệ giữ tỷ lệ tự nhiên;
- rank cũ, gồm rank của card từng rộng hai cột, không được giữ. Build tạo lại
  rank bằng scheduler `advertising-rank-v3`; `rank` là zero-based integer theo
  compiled sequence, liên tục từ `0`; runtime chỉ đọc artifact đã tạo;
- filter từng category bắt buộc giữ source order nội bộ. Filter `all` bắt buộc
  round-robin sáu category theo canonical category order, chỉ lấy FIFO head và
  không được đảo source order bên trong category. Không gom hoặc xoay batch theo
  ratio;
- sort runtime dùng `rank`, sau đó `id`; runtime không tự đổi rank,
  `presentationCanvas` hoặc `fitMode`;
- validator từ chối intrinsic dimension/canvas không dương, `fitMode` mồ côi,
  duplicate stable id, duplicate `media.src`, duplicate `media.sourceId`, sai số
  lượng nhóm hoặc rank không liên tục; không được ẩn card hay thêm filler để làm
  đáy bằng nhau.

## Layout, append và virtualization

Visual geometry: [Advertising grid](../design/patterns.md#advertising-grid-geometry).

Layout compiler tạo placement deterministic theo `datasetVersion`, filter,
intrinsic media/canvas dimensions và số cột. Scheduler `advertising-rank-v3`
chỉ tạo sequence; packer duyệt sequence theo thứ tự và đặt từng card vào cột có
`columnBottom` thấp nhất, tie chọn column index nhỏ nhất. Card top bằng bottom
hiện tại của cột; sau card dùng đúng responsive `interCardGap`.

Transport page hoặc append batch được phép có số card tùy ý và không cần khép
hàng. Một append commit card shell trong một frame nhưng mỗi card vẫn được pack
độc lập. Card mới tiếp tục từ column bottoms hiện có; tọa độ prefix đã commit
không đổi. Ragged bottom được chấp nhận ở mọi batch, không có closed frontier,
terminal batch, filler hoặc bottom-delta gate. “Không lỗ trắng” chỉ cấm khoảng
trống bên trong một cột ngoài gutter/caption rhythm có chủ đích; nó không bắt
các đáy cột nằm trên một đường ngang.

Cùng dataset, filter, layout viewport và append boundary phải tạo cùng rank,
column index, coordinate hash và total height qua mọi lần build. Resize hoặc đổi
filter được phép tạo layout mới và đi qua position morph; append không được
repack prefix.

Caption visual contract: [Advertising caption](../../DESIGN.md#advertising-caption).

Ảnh lazy-load độc lập trong box đã reserve natural ratio hoặc canvas ratio từ dữ
liệu, không chờ decode mới biết chiều cao. Virtual window chỉ mount card trong
viewport cộng overscan; metadata, intrinsic dimensions, placement cache và tổng
chiều cao vẫn được giữ. Khi đang xem item `2800–2820`, card trước vùng overscan
không cần còn trong DOM. Card đang giữ keyboard focus không được unmount.

## Đặt ảnh trong khung card

Card không có `presentationCanvas` render trực tiếp theo natural ratio; khi đó
`fitMode` phải là `null`, không có crop hoặc backplate. Ba mode dưới đây chỉ là
output tĩnh được data author khai báo cùng canvas, không phải control công khai:

- `auto-cover`: ảnh foreground tự crop để phủ kín khung;
- `fit-x-blur`: foreground vừa chiều ngang và căn giữa; phần trống trên/dưới
  dùng cùng ảnh phóng lớn, crop phủ kín và blur làm backplate;
- `fit-y-blur`: foreground vừa chiều dọc và căn giữa; phần thừa hai bên bị crop;
  nếu còn vùng trống ngang thì backplate cùng ảnh phải phủ kín và blur.

Không mode nào được để vùng đen, vùng trong suốt hoặc dải màu phẳng quanh ảnh
sau khi media đã decode. Backplate là decorative, `aria-hidden`, dùng cùng URL
asset với foreground và chỉ tồn tại trong card đang nằm trong bounded virtual
window. Foreground duy nhất sở hữu alt VI/EN. Lazy-load, replayable media entrance
và reserve `presentationCanvas` ratio áp dụng cho cả composition; việc thêm
backplate không được tải một file ảnh thứ hai hoặc mount media ngoài virtual
window.

CMS phase sau mới được thêm các field/controls: chọn fit theo trục X/Y, auto
crop, zoom, pan, rotation và bật/tắt blurred backplate. Delta này không tạo
schema, migration, admin UI hoặc public editor cho các field đó.

## Motion

[Advertising motion](../design/motion.md#advertising-motion) sở hữu position
morph, media replay và detail visibility. Spec giữ dependency/data/QA và chỉ ref.

### Position morph

Xem [Position morph](../design/motion.md#position-morph).

### Media entrance và interaction

Xem [Media entrance và interaction](../design/motion.md#media-entrance-và-interaction).

### Visibility media trên sáu route chi tiết

Xem [Detail visibility](../design/motion.md#visibility-media-trên-sáu-route-chi-tiết).

## Dependency và lifecycle

- Pin GSAP core `3.15.0` và SplitText `3.15.0`; pin URL/version và SRI, không
  dùng URL floating `latest`.
- Pin `masonry-layout@4.2.2`, đúng packaged version đã đo trên Espacio.
- Pin `lazysizes@5.3.2`; version embedded của Espacio chưa quan sát được nên
  parity dựa behavior đã đo, không gán version thiếu evidence.
- Direct load, Barba entry, Back/Forward và locale navigation phải dùng cùng một
  dependency-readiness contract. Catalog không được phụ thuộc việc browser đã
  từng hard-load Advertising Products để có `window.Masonry`, SplitText, GSAP
  hoặc LazySizes trong global scope.
- Trước khi reveal Advertising Products, route lifecycle phải await vendor/runtime
  readiness hoặc thực hiện hard-navigation fallback tới đúng URL. Guard thiếu
  dependency không được silent no-op. Failure phải có diagnostic và không được
  để destination ở trạng thái nửa mount.
- Với JavaScript đang bật, `<noscript>` không được xuất hiện thành raw markup
  trong live DOM sau Barba parse. No-JS fallback chỉ phục vụ direct document
  navigation khi scripting thật sự tắt.
- Thay `splitWords()`, `splitLines()`, character splitter cũ và custom card FLIP;
  không để hai implementation chạy song song.
- SplitText line target dùng `autoSplit: true` và tạo tween trong `onSplit()`.
  Tween active giữ `totalTime` qua auto-resplit; chỉ completed hoặc reduced motion
  được final ngay. Bridge `detail.js` phải revert trước locale swap/Barba unmount,
  sau translate chờ font rồi rebuild đúng một lần.

## Template chi tiết và media

Audit live ngày `2026-09-02` xác nhận cả `45/45` trang con Espacio dùng
`namespace="common"`, `data-barba-id="proyecto"`; trong cùng template family có
`38` chuỗi block khác nhau, `39` hero ảnh và `6` hero video. Trường Thịnh học
composition từ sáu route hero ảnh, không copy source hoặc asset:

| Slug Trường Thịnh | Số ảnh | Route Espacio tham chiếu | Nhịp composition bắt buộc |
| --- | ---: | --- | --- |
| `kiosk-posm` | `24` | `pollenca-project` | Long-form chapter; facts xen ảnh đơn, ảnh đôi và gallery |
| `mobile-retail` | `16` | `ponent` | Ba nhịp gallery xen paragraph và một cặp ảnh |
| `signage-raised-letters` | `22` | `can-molteni` | Gallery, ảnh đơn, ảnh đôi và banner full-width |
| `office-signs-wayfinding` | `13` | `lonja-de-mar-project` | Facts, gallery, ảnh đơn/đôi và paragraph chia cột |
| `led-displays-lightboxes` | `18` | `espalmador-project` | Nhịp cân bằng giữa gallery, ảnh đơn và ảnh đôi |
| `print-decals` | `16` | `pantry-project` | Bố cục gọn, facts trước gallery sản phẩm |

Sequence dưới đây là contract của primary editorial content; action/CTA chung
được render sau sequence:

| Slug | Block sequence |
| --- | --- |
| `kiosk-posm` | `hero > titular > paragraph > facts > single > paragraph > double > titular > single > paragraph > gallery > titular > single > paragraph > double > titular > single > paragraph > double > paragraph > single` |
| `mobile-retail` | `hero > titular > paragraph > gallery > facts > paragraph > gallery > paragraph > double > paragraph > gallery` |
| `signage-raised-letters` | `hero > titular > paragraph > gallery > facts > paragraph > single > paragraph > double > paragraph > single > paragraph > titular > banner` |
| `office-signs-wayfinding` | `hero > titular > paragraph > gallery > facts > single > paragraph > double > paragraph > gallery > columns > single` |
| `led-displays-lightboxes` | `hero > titular > paragraph > gallery > facts > paragraph > single > paragraph > double > paragraph` |
| `print-decals` | `hero > titular > paragraph > facts > gallery > paragraph` |

`single`, `double` và `banner` nhận đúng `1`, `2` và `1` media. Các block
`gallery` chia toàn bộ media còn lại theo config tường minh; mỗi gallery có ít
nhất `2` item. Config không được thêm block để hấp thụ media dư ngoài sequence
đã duyệt. Số carousel theo sáu route lần lượt là `1/3/1/2/1/1`, khớp chính xác
số block `gallery` trong sequence; không gom thành đúng một carousel mỗi route.

Visual/interaction contract: [Advertising carousel](../design/patterns.md#advertising-carousel-visual).

Implementation dùng `swiper@14.2.0`, là bản npm mới nhất đã kiểm tra ngày
`2026-09-02`. Chỉ bundle module cần thiết cho horizontal slide, mousewheel,
pagination và accessibility; không bundle navigation, autoplay, loop, effect
hoặc virtual module. Vendor asset chỉ được hydrate khi trang hiện tại có
carousel; direct load, Barba enter, Back/Forward và locale swap dùng cùng một
readiness promise. Mỗi instance phải `destroy` khi unmount; retry dependency
không được nhân script hoặc carousel instance.

Sáu composition dùng chung hero, titular, paragraph, facts, gallery, ảnh đơn,
ảnh đôi, banner, action và media lifecycle component. Config của từng route
khai báo `layoutKey`, `heroSourceId` và danh sách section gồm `kind` cùng
`sourceIds`. Build không suy ra hoặc random composition từ tỷ lệ ảnh.

Mỗi category config phải partition đúng toàn bộ record cùng category trong
media manifest: hero tính trong tổng, mỗi `sourceId` xuất hiện đúng một lần,
không thiếu, không lặp, không tham chiếu ảnh category khác. Body đi theo nhịp
editorial thay vì tạo `12` section cứng; danh mục và caption vẫn trình bày đủ
`12` product label của nhóm.

Runtime chỉ nhận media production dạng WebP trong không gian màu sRGB, đã loại
metadata nhúng và ghi đúng kích thước pixel thật. Pool grid có đúng `109` ảnh gốc
độc lập theo phân bổ trong data contract; mỗi card dùng một ảnh khác nhau. Ảnh
không có logo/chữ giả, watermark hoặc khuôn mặt nhận diện. Sáu trang con chỉ
được dùng pool `109`, không mở gallery asset riêng. Hero dùng `fetchpriority="high"`;
mọi media dưới fold dùng lazy loading và async decode. Tối đa `24` media/route
nên trang chi tiết không dùng virtualization; geometry được reserve trước load
và media giữ one-shot fade hiện có.
Hai process Nhà ở/Kinh doanh dùng bộ ảnh khác nhau; được phép giữ một phần ảnh
process Home cũ.

## Command, cấu trúc và code style

```text
Prepare: pnpm prepare:site
Dev: pnpm dev
Static: pnpm qa:static
Static runtime: pnpm dev
Browser: pnpm qa:site
Focused logic: node --test tests/site/advertising-products-layout.test.mjs tests/site/advertising-products-lifecycle.test.mjs
```

Ownership giữ ở lớp nhỏ nhất:

- `src/site/motion.js`: public route và scroll lifecycle;
- `src/site/detail.js`: route-detail bridge và dependency readiness;
- `src/site/advertising-products/catalog-runtime.mjs`: virtual window, Masonry
  mount, filter và position morph;
- `src/site/advertising-products/catalog.mjs`: deterministic layout/data;
- `scripts/site/prepare-static-assets.mjs`: vendor Swiper browser asset đã pin;
- `src/site/advertising-products/detail-template.html`: progressive carousel
  markup dùng chung cho sáu route;
- `src/site/style.css`, `src/site/detail.css`: selection và visual state;
- `tests/site/`: static, unit/lifecycle và browser regression.

JavaScript dùng stable card id, named state và một lifecycle owner; không thêm
engine motion thứ hai hoặc global mutable flag không có cleanup. CSS dùng class
semantic; không encode filter/category bằng `nth-child`. Code comment viết bằng
English, product copy và project Markdown viết bằng tiếng Việt.

## Kiểm thử

- Static contract kiểm tra sáu slug, VI/EN, link filter/card, shared detail
  template và đúng SplitText target/exclusion trên ba parent route.
- Detail composition contract kiểm tra sáu `layoutKey` khác nhau, đúng reference
  mapping, đúng thứ tự block và chỉ dùng component từ shared family.
- Media completeness contract kiểm tra union hero/body bằng đúng `109`
  `sourceId`; count từng route là `24/16/22/13/18/16`, không thiếu, không lặp,
  không cross-category và đủ `12` product label.
- Carousel contract kiểm tra số instance theo sáu route là `1/3/1/2/1/1`, mỗi
  instance có ít nhất `2` slide, tổng partition vẫn đúng `109` source và không
  còn static gallery-grid renderer.
- Dependency contract pin `swiper@14.2.0`, chỉ phát browser asset cần thiết,
  mount đúng một instance/carousel và destroy sạch qua direct, Barba,
  Back/Forward cùng locale lifecycle. Khi asset bị chặn, native horizontal
  scroll vẫn hiện đủ ảnh/caption và không có raw markup hoặc trang trắng.
- Unit contract từ chối mọi field/value `span`, xác nhận mọi placement rộng một
  cột, natural/canvas ratio, optional explicit `fitMode`, rank-v3,
  category-order, shortest-column stable tie và coordinate hash. Matrix số
  lượng category tùy ý phải gồm `0`, `1`, `11`, `12`, `13`, `23`, `24`, `25`
  và synthetic `3.000` card; synthetic giữ đúng item `2800–2820`, DOM bounded
  và immutable prefix khi append.
- Catalog contract xác nhận đúng `109` card; category count đúng
  `24/16/22/13/18/16`; `id`, `media.src` và `media.sourceId` đều unique; đủ `12`
  label mỗi nhóm; mọi nhóm đạt bốn ratio coverage class. Contact sheet theo nhóm
  phải được review thủ công để bắt crop hoặc near-duplicate không thể chứng minh
  chỉ bằng filename/hash.
- Browser matrix tại `320`, `390`, `679`, `750`, `751`, `829`, `830`, `849`,
  `850`, `960`, `961`, `1200`, `1201`, `1440`, `1570`, `1920`, `2560px` đo
  số cột, equal column width, outer/effective margin, gap ngang/dọc và content
  cap `1500px`; không được vượt `5` cột và overflow ngang bằng `0`. Các ngưỡng
  quanh mỗi lần tăng cột phải có probe
  `-1/0/+1px` để chứng minh công thức, không hard-code riêng sáu điểm chuẩn.
- Filter, resize và layout invalidation độc lập phải dùng một Outlayer transform
  transition `0.4s`, delay `0ms`, không stagger; initial layout, remount và
  unchanged coordinate không animate.
- Build lặp lại trên cùng input phải tạo byte/hash rank, intrinsic/canvas ratio,
  optional `fitMode`, column assignment và coordinate giống nhau. Reload,
  locale swap và filter round-trip không được đổi data contract; runtime/build
  không được chứa đường random hoặc seeded-random để chọn frame hay fit mode.
- Browser probe tại mọi số cột xác nhận card width khớp bảng chuẩn, mọi card top
  nối đúng cached bottom của cột thấp nhất, không overlap/filler/interior hole.
  Ragged bottom được phép và không có assertion cân đáy.
- Screenshot/computed-style probe tại `320`, `390`, `640`, `960`, `1200`,
  `1440px` kiểm tra riêng image-to-caption `10px`, caption weight, line-height,
  visual cap-height, Vietnamese diacritics, caption-to-next-media gutter và
  horizontal gap. Sai số cap-height tối đa `1` device pixel; không được clip dấu.
- Fixture natural-ratio phải gồm landscape, square, portrait và ảnh rất dài;
  rendered media ratio khớp intrinsic ratio, không crop và không backplate. Mỗi
  explicit fit mode có fixture canvas khác source ratio với outer strip đã biết
  alpha `255` và luma lớn hơn `32`. Sau decode, pixel probe trong outer `10%`
  của frame phải có alpha `255`, không bằng fallback color và luma lớn hơn `8`;
  DOM có backplate chỉ khi mode yêu cầu. Backplate decorative, foreground alt
  đúng, không download byte lần hai cho cùng URL và DOM vẫn trong virtualization
  bound.
- Filter round-trip phải quan sát được shuffle/morph khi geometry đổi, kể cả khi
  old/new virtual window không có chung card id. Trong transition, motion cohort
  vẫn bounded; sau settle không có overlap hoặc khoảng trống nội cột ngoài
  gutter. Filter không làm trang tự cuộn.
- Native scroll dừng trong cửa sổ morph phải được ghi pending; sau `400ms` chỉ
  chạy một catch-up tại vị trí mới nhất, DOM vẫn bounded và card remount instant.
- Continuous scroll trên Home và Advertising Products phải dùng cùng engine.
  Khi không vượt virtual-window frontier, Advertising ghi `0` lần
  `Masonry.layout()` và `0` lần phát `site:layout`; khi vượt frontier, mỗi thay
  đổi membership chỉ tạo một layout.
- Computed `user-select` được kiểm tra trên heading, body, caption, nav, menu,
  filter và button label ở route đại diện VI/EN. Tất cả là `auto` ở trạng thái
  thường, chuyển `none` chỉ khi `html.has-scroll-dragging`, rồi trở lại `auto`.
- Direct load, Barba navigation, Back/Forward, locale swap, keyboard/focus,
  lazy-image replay, reduced motion, console và network đều sạch.
- Runtime probe trên fresh VI và EN route phải bắt được media opacity trung gian
  lớn hơn `0` và nhỏ hơn `1` trong transition `0.6s ease-out` ở lần vào đầu tiên.
  Sau khi card đạt `intersectionRatio = 0`, lần vào thứ hai và thứ ba đều phải
  phát transition mới, kể cả khi ảnh cache hoặc card được virtual remount. Card
  shell và caption luôn `opacity: 1`; không được replay nếu card chưa rời hoàn
  toàn. Reduced motion phải hiện media ở final state ngay và không phát
  transition.
- Static và browser regression duyệt đủ sáu slug ở VI/EN. Mỗi route phải pass cả
  direct load và Barba navigation với hero/gallery `currentSrc` không rỗng,
  `complete = true`, `naturalWidth > 0`, computed opacity của cả media lẫn mọi
  ancestor bằng `1`, và motion target nằm trên node ảnh chứ không nằm trên
  wrapper. Probe phải bắt được opacity trung gian trong `0.6s ease-out`, sau đó
  xác nhận rời/tái vào viewport không replay trên route chi tiết.
- Browser matrix tại `390x844` và `1440x900` phải chứng minh cả sáu composition
  khác nhau về thứ tự block, mọi media xuất hiện đúng một lần, không overflow,
  không collapse khi lazy load và CTA cuối trang vẫn truy cập được bằng bàn phím.
- Cùng browser matrix đo carousel outer band `15/35px`, media max-height
  `75vw/50vw`, gap `10/20px`, intrinsic slide ratio và next-slide peek cho slide
  thường. Ít nhất một ảnh `2:1` phải chứng minh cap usable width, giảm chiều cao
  theo ratio, không crop/stretch/backplate/box rỗng và không bắt buộc peek.
  Caption nằm ngoài media viewport, không clip dấu; browser page không có
  overflow ngang.
- Interaction probe phải click dot, drag/touch và wheel theo trục ngang; active
  slide đổi trong `500ms`, không tự chạy, không wrap item cuối về item đầu và
  không render arrow. Reduced motion settle tức thì.
- Regression cho hai finding owner chỉ ra phải chứng minh media đã load có
  `complete = true`, `naturalWidth > 0`; wrapper không cao hơn tổng media,
  caption và control rail. Không còn nền rỗng hàng trăm pixel do item cùng hàng
  bị grid stretch.
- Browser regression mô phỏng ít nhất một gallery image lỗi: box không collapse,
  placeholder trung tính nhìn thấy, không còn ancestor `opacity: 0`, không có
  unhandled console error và các block sau giữ nguyên vị trí.
- Regression bắt buộc gồm fresh Home → Advertising Products, Advertising
  Products → Home → Advertising Products, desktop/mobile và network chậm. Sau
  route enter phải có `.advertising-grid`, card runtime đã mount, dependency sẵn
  sàng và không có text bắt đầu bằng literal `<figure`.

## Evidence và trạng thái implementation

### Kiểm chứng backlog theo contract hiện hành

[Run 2026-09-09](../verification/upnext-advertising-2026-09-09.md) đối chiếu các
thẻ Up next với rank-v3 và 109 media hiện hành. Nó ghi focused runtime evidence,
coverage còn thiếu và review; không thay historical report hoặc full parity verdict.

### Root-grid và detail visibility đã triển khai scoped current-hash

Root grid hiện dùng một `IntersectionObserver` theo catalog lifecycle. Stable
card id chỉ được re-arm khi `intersectionRatio === 0`; lần vào kế tiếp replay
composition fade `0 → 1` trong `0.6s ease-out`, kể cả cached image và virtual
remount. Partial visibility không restart, exit không có motion, reduced motion
hiện tức thì. Observer được unobserve trước remove và disconnect khi cleanup;
keyboard virtual placement đi cùng media lifecycle.

Shared detail template đặt `data-motion-media` trên hero `img`; generator đặt
hook trên mọi body-media `img`, không đặt trên `figure`. Wrapper giữ geometry,
nền `#e9e6df` và opacity `1`; ảnh tải thành công fade một lần, ảnh lỗi giữ
placeholder, reduced motion theo shared fallback hiện có.

Regression mới kiểm tra motion target, opacity toàn bộ ancestor, intermediate
opacity, không replay sau re-entry, media error và mobile overflow. Current-hash
đạt detail static Node `1/1`, `prepare:site`, `qa:static` và focused Advertising
media browser `10/10`. In-app Browser xác nhận wrapper final opacity `1`, ảnh
intermediate rồi final `1`, network media thật và runtime log sạch. Impeccable
detector chạy degraded vì thiếu HTML parser/Puppeteer, chỉ trả warning font đã
được owner chốt. Xem
[verification gallery detail](../archive/reports/verification-advertising-detail-gallery-visibility-2026-09-02.md).

### Carousel ngang trang chi tiết đã triển khai scoped current-hash

Owner duyệt spec/plan ngày `2026-09-02`. Mọi block `gallery` hiện dùng shared
progressive carousel; sáu route giữ đúng `1/3/1/2/1/1` instance và partition
đủ `109` media. Runtime pin `swiper@14.2.0`, chỉ phát core, Mousewheel,
Pagination và A11y; khi dependency bị chặn, cùng markup vẫn dùng được bằng
native horizontal scroll-snap.

Focused static/lifecycle contracts, `prepare:site`, `qa:static`, carousel
browser `8/8` và detail/media `10/10` đều pass. Bảy viewport khóa outer band
`15/25/35px`, gap `10/20px`, max-height `75/50vw`, intrinsic ratio,
next-slide peek, extreme-wide cap và overflow `0`. DevTools route có ba
carousel xác nhận pagination khớp snap points, asset `200` và console sạch;
human path VI đổi slide bằng dot và locale menu chuyển sang EN giữ caption cùng
controls. Xem [verification carousel ngang](../archive/reports/verification-advertising-detail-horizontal-carousel-2026-09-02.md).

### Sáu composition và media completeness đã triển khai scoped current-hash

Owner duyệt spec/plan ngày `2026-09-02`. Catalog hiện có sáu `layoutKey` cùng
exact sequence đã duyệt; build validator fail closed khi thiếu, lặp hoặc
cross-category source. Shared renderer sinh đúng `24/16/22/13/18/16` media,
union `109`, hero/body không lặp và mỗi route giữ đủ `12` product label.

Focused Node đạt `11/11`; related Advertising/Worker Node đạt `15/15`;
`prepare:site`, `qa:static` và Advertising media browser lane đạt `10/10`.
Browser lane bao phủ sáu slug VI/EN ở desktop, đủ sáu slug EN ở mobile,
direct/Barba/history, lazy load, one-shot fade và error placeholder. Mobile
matrix đã bắt và sửa cascade desktop `span 5` làm một media height `0`; rerun
không còn zero-size media hoặc horizontal overflow. Xem
[verification sáu composition](../archive/reports/verification-advertising-detail-compositions-109-media-2026-09-02.md).

### Delta `109` ảnh và spacing Espacio đã triển khai scoped current-hash

Owner duyệt spec, ADR và plan ngày `2026-09-01`. Source hiện build dataset
`2026-09-01.2`, artifact `advertising-rank-v3` gồm đúng `109` card/source độc
lập, phân bổ `24/16/22/13/18/16`, đủ ratio coverage từng nhóm. Geometry dùng
outer `15/25/35px`, gap `15/25/35px`, content cap `1500px`, `2–5` cột và
shortest-column tie-left.

Scoped current-hash đạt Node/media contracts, `qa:static`, grid `44/44`, media
`6/6`, default Advertising `28/28`, keyboard virtualization `1/1`, locale
lifecycle `1/1` và probe `3.000` card `1/1`. DevTools tại `390px` xác nhận biên
`15px`, gap `15px`, hai cột và `26` DOM node; tại `1920px` xác nhận effective
outer `210px`, gap `35px`, năm cột, cap `1500px` và `40` DOM node. Cả hai không
overflow, raw HTML hoặc console warning/error; aria set size là `109`.

Static phase chưa tạo responsive derivative (`srcset/sizes`); DevTools local
ghi LCP `153ms`, CLS `0.00` nhưng Image Delivery ước tính còn `3.1MB` byte có
thể tiết kiệm ở viewport `1920px`. Derivative được hoãn tới CMS phase và phải
review lại trước public release. Xem
[verification `109` media và spacing](../archive/reports/verification-advertising-products-109-media-spacing-2026-09-01.md).

### Baseline Pinterest organic masonry đã triển khai scoped current-hash

Owner từng duyệt baseline ngày `2026-09-01`: natural/canvas ratio, free card height,
single-column shortest-column placement, append không closed frontier, fixed
`20px` outer margin, `16px` gap và không random `fitMode`. Chrome DevTools đo
live Pinterest ở `320/390/768/1024/1440/1920px`; số cột tương ứng
`2/2/3/4/5/8`, card width khớp bảng chuẩn và source/rendered ratio không đổi.

Source hiện build artifact `advertising-rank-v3` 72 card và runtime dùng shared
pure layout core, shortest-column, bounded geometry cache và placement virtual
window. Scoped current-hash đạt Node `4/4`, static PASS, Advertising default
`28/28`, grid `43/43` và probe 3.000 card `1/1`. DevTools xác nhận filter morph
`0.4s`, active-filter no-op, one-shot foreground/backplate entrance, outer/gap
và DOM bounded. Xem
[verification organic masonry](../archive/reports/verification-advertising-products-organic-masonry-2026-09-01.md).
Baseline `72/20/16` này không phải evidence đạt delta `109` đã được duyệt.

Full suite vẫn `NOT PASS` và một lần chạy không hoàn tất sau các failure ngoài
boundary organic; scoped result không phải release hoặc full-suite clearance.
Mọi evidence dưới đây từ `Baseline delta single-column` trở đi là lịch sử trước
organic delta và không mô tả runtime rank-v3 hiện tại.

### Baseline delta single-column ngày 2026-08-31

Source builder hiện tạo rank-v2, artifact layout và fit mode deterministic;
runtime load artifact output, không compile source catalog. Acceptance browser
current-hash vẫn cần chạy lại sau `prepare:site` vì output directory đang lock.
Owner duyệt spec ngày `2026-08-31`, gồm closed frontier tuyệt đối cho mọi
non-terminal batch và terminal batch có `maxBottomDelta` không vượt outer height
của một card `3:4`.
Đo live Espacio ngày `2026-08-31` ghi caption gap `10px`, weight `700`, mobile
`10.5/15.68px` với cap-height `8px`, desktop `12/17.92px` với cap-height
`9px`. Caption dùng gap `10px`, weight `700` và không padding đáy. Đây là
contract source; browser render vẫn là evidence bắt buộc trước acceptance.

Feasibility check lịch sử cho contract rank-v2 dùng ratio units `9/12/16`: full batch
`12` card cùng ratio đóng frontier ở cả `2/3/4` cột, đạt `9/9`. Property probe
deterministic với `30.000` terminal layout tùy ý xác nhận shortest-column luôn
giữ bottom delta không vượt một tallest-card unit. Contract này đã bị organic
rank-v3 supersede; không còn là acceptance của implementation hiện tại.

### Baseline audit trước refinement ngày 2026-08-31

Baseline trước source patch đã ghi các finding sau; phần này là lịch sử chẩn
đoán, không mô tả runtime current-hash sau patch:

- hard-load Home rồi đi bằng Barba tới Advertising Products tái hiện ở
  `1440×900` và `390×844`: `window.Masonry` là `undefined`, grid chỉ còn
  `<noscript>`, không có `.advertising-tile` và raw `<figure ...>` hiện thành
  chữ. Hard-load Advertising Products trước rồi quay Home và trở lại thì chạy
  đúng vì vendor globals còn sống; đây là nguyên nhân của tính không ổn định;
- source owner đã xác định: Barba chỉ sync document state, body script của route
  đích không execute; catalog dynamic import chạy nhưng silent-return khi thiếu
  Masonry trước khi `grid.replaceChildren()`;
- direct Advertising Products đang gọi render/Masonry layout và phát
  `site:layout` trên các scroll frame dù virtual membership không đổi. Số đếm
  phụ thuộc thời lượng probe, nhưng Home cùng engine ghi `0`; source xác nhận chưa
  có no-op fast path;
- filter từ một category về `all` có thể thay toàn bộ mounted cohort; incoming
  card được đặt ngay tại target, nên không có transform nhìn thấy dù test cũ tìm
  được một shared-card morph ở trường hợp khác;
- text role public hiện vẫn là `user-select: auto`; ngoại lệ hiện tại chỉ là
  scroll-drag từ Locomotive, image và decorative number. Phần selection đã gần
  đạt contract, nhưng chưa có regression test.

Evidence focused bên dưới là lịch sử của implementation trước refinement,
không được dùng để kết luận delta single-column hoặc source patch cuối đã pass.

Current worktree dựa trên Git `a8ba94ec1dadd84990b0b33f7e590f2cf76c71b1`
và chỉ được dùng làm evidence cho các contract đo dưới đây, không là claim full
Espacio parity. Ngày `2026-08-31`, focused browser matrix tại local preview
`127.0.0.1:8787` đạt `17/17`: `320`, `390`, `679`, `750`, `751`, `829`,
`830`, `849`, `850`, `960`, `961`, `1200`, `1201`, `1440`, `1570`, `1920`,
`2560px`. Matrix đo outer/max-width, horizontal gap token, overflow và prefix
deterministic sau filter round-trip.

Probe browser cùng runtime với `3.000` card synthetic đạt `1/1` tại vùng index
`2800`: chỉ `28` card ở virtual window, `tt-0000` đã unmount, spacer giữ deep
scroll, không overlap/overflow; filter round-trip và resize giữ window bounded.
Node layout/lifecycle/static/detail-route suites đều pass; `pnpm prepare:site`
pass. Focused default Advertising subset dùng chung helper với default gate đạt
`6/7`: SSR VI/EN, filter position morph, reduced-motion instant, native-scroll
catch-up và delayed-detail `1440px` pass; delayed-detail `320px` còn navigation
race `Execution context was destroyed` ngoài phạm vi ba finding này.
Lifecycle locale/SplitText/focus đạt `1/1`: VI→EN→VI giữ editorial text/ARIA,
resize/font rebuild không nhân wrapper, catalog remount dùng locale mới và filter
đổi focus an toàn không để card rơi tại `(0,0)`. Probe click trực tiếp language
menu, không `goto`; line reveal đang chạy không snap khi resize/font. Hidden legacy
catalog block và detail fallback filter listener đã gỡ; không còn consumer
selector/taxonomy legacy trong Advertising source/test/runtime.

DevTools current runtime xác nhận target filter chưa mount trước khi lọc, sau đó
morph `33` frame từ khoảng `15.9ms` tới `392.4ms`, duration `0.4s`, delay `0s`,
không đảo chiều hoặc snap. Tại `679px`, native scrollbar `10px` cho
`innerWidth/clientWidth = 679/669px`, lưới và wrapper đều có biên `15/15px`, gap
`15px`, overflow ngang `0`. Console sạch; `24` request đều `200/304`.

Default `pnpm qa:site` trước reviewer-fix ghi `96/143`; còn failure ngoài scope.
Không suy ra full-suite green từ focused subset `6/7`. Impeccable detector chạy
trên runtime và CSS trả `[]`; không có detector finding trong hai target này.

## Ranh giới

- Luôn làm: source dưới `src/site`, test dưới `tests`, cập nhật docs canonical.
- Chỉ thêm đúng các dependency/version đã chấp nhận trong spec này; dependency
  khác cần owner duyệt.
- Không sửa `.site-output` trực tiếp; đây là generated output.
- Không triển khai CMS/admin, không deploy, không copy source hoặc asset Espacio.
- Không thêm control zoom/pan/rotate/blur hoặc persistence CMS trong delta
  Pinterest organic masonry static.
- Delta `109` lịch sử không đổi sáu trang con. Delta composition `2026-09-02`
  được phép đổi shared detail renderer và sáu config, nhưng không đổi parent
  grid, taxonomy hoặc tạo pool gallery riêng.
- Delta carousel được phép thêm `swiper@14.2.0`, vendor asset, progressive
  carousel markup, scoped detail CSS/runtime và regression tương ứng; không được
  dùng Swiper cho parent Pinterest grid, Residential hoặc Commercial trong task
  này.

## Chú thích thuật ngữ

- **Data manifest**: file dữ liệu chung mô tả sáu nhóm và card.
- **Composition**: thứ tự và tổ hợp block tạo nhịp trình bày riêng cho một route.
- **Partition**: chia toàn bộ media thành các slot không thiếu và không lặp.
- **Outer margin**: khoảng từ cạnh viewport/container tới biên ngoài lưới.
- **Effective outer**: khoảng nhìn thấy sau khi content cap được căn giữa; có thể
  lớn hơn outer band trên viewport rộng.
- **Inter-card gap**: khoảng ngang giữa card và khoảng dọc sau mỗi card.
- **Source ID**: danh tính của ảnh gốc; mọi crop hoặc biến thể trình bày từ cùng
  ảnh gốc phải giữ cùng source ID.
- **Natural ratio**: tỷ lệ `media.width / media.height` lấy từ intrinsic media
  dimensions và dùng trực tiếp để reserve/render chiều cao.
- **Presentation canvas**: khung tùy chọn được data author khai báo; chỉ khi có
  canvas mới được dùng `fitMode` khác natural render.
- **Shortest-column**: đặt card kế tiếp vào cột có đáy thấp nhất, tie chọn cột
  bên trái hơn.
- **Ragged bottom**: các cột kết thúc ở độ cao khác nhau; là kết quả hợp lệ của
  organic masonry, không phải lỗ trắng nội bộ.
- **Outlayer**: engine transition vị trí được packaged trong Masonry.
- **SplitText**: plugin GSAP chia text thành line, word hoặc character để animate.
- **Overscan**: vùng render thêm quanh viewport để cuộn không thấy card bật trễ.
- **Coordinate hash**: dấu kiểm tra tạo từ tọa độ layout để phát hiện kết quả
  không deterministic.
- **Visual cap-height**: chiều cao rendered của chữ hoa không tính dấu tiếng
  Việt, đo bằng glyph chuẩn như `H` ở cùng DPR.
- **Backplate**: lớp ảnh trang trí phía sau foreground, được phóng lớn và blur để
  lấp vùng trống của khung.
- **Responsive derivative**: biến thể ảnh nhỏ hơn để browser chọn theo viewport
  qua `srcset` và `sizes`.
- **Next-slide peek**: một phần slide kế tiếp còn nhìn thấy ở mép carousel để báo
  cho người dùng biết có nội dung ngang tiếp theo.
- **Progressive fallback**: giao diện cơ bản vẫn dùng được khi thư viện tăng
  cường chưa tải hoặc bị lỗi.
- **Wrapper stretch**: grid item bị kéo cao theo hàng dù nội dung ảnh ngắn hơn,
  tạo vùng nền rỗng không mang thông tin.
- **CMS deferral**: việc đã biết nhưng chủ động chuyển sang CMS phase, có ghi rõ
  boundary và điều kiện xem lại.
