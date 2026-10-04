---
title: Ba mảng dịch vụ và masonry Sản phẩm quảng cáo
type: frontend
status: accepted
updated: 2026-09-10
notion: https://app.notion.com/p/3cc332849a0e817f9bcafba5e357c21c
related_decisions:
  - ../decisions/advertising-organic-masonry-espacio-spacing-media-distribution.md
  - ../decisions/selective-splittext-editorial-reveals.md
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
cầu masonry span 1/2, bỏ fit/canvas và media đã chốt trong interview. Nội dung
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

Delta không đổi parent masonry kiểu Pinterest, taxonomy, `109` source asset, header,
footer, route transition, CMS, Wrangler hoặc deploy.

Delta carousel ngang trang chi tiết được owner duyệt spec/plan ngày
`2026-09-02`; implementation đã đạt scoped current-hash evidence:

| Capability | Sở hữu | Phụ thuộc |
| --- | --- | --- |
| `advertising-detail-horizontal-carousel` | Nâng cấp mọi block `gallery` trong sáu composition thành carousel ngang kiểu Espacio, giữ caption và hỗ trợ progressive fallback | Shared detail renderer, Swiper `14.2.0` và media lifecycle hiện có |
| `advertising-detail-gallery-box-integrity` | Loại bỏ vùng nền rỗng do masonry item bị stretch; reserve geometry đúng khi ảnh lazy-load, lỗi hoặc dependency chưa sẵn sàng | Carousel geometry và placeholder hiện có |

Delta chỉ tác động sáu route con Advertising Products. Parent masonry kiểu Pinterest,
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

[SplitText editorial](../../design-system/motion.md#text) là nguồn chuẩn
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

Visual geometry: [Hình học masonry](advertising-grid-span-organic.md#hình-học-masonry-grid-r4-visual).

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

[Advertising motion](../../design-system/motion.md#advertising) sở hữu position
morph, media replay và detail visibility. Spec giữ dependency/data/QA và chỉ ref.

### Position morph

Xem [Position morph](../../design-system/motion.md#vị-trí-card-masonry).

### Media entrance và interaction

Xem [Media entrance và interaction](../../design-system/motion.md#ảnh-trong-card).

### Visibility media trên sáu route chi tiết

Xem [Detail visibility](../../design-system/motion.md#ảnh-trên-sáu-trang-detail).

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

Visual/interaction contract: [Carousel visual](#carousel-visual).

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
metadata nhúng và ghi đúng kích thước pixel thật. Pool masonry có đúng `109` ảnh gốc
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
  bị masonry stretch.
- Browser regression mô phỏng ít nhất một gallery image lỗi: box không collapse,
  placeholder trung tính nhìn thấy, không còn ancestor `opacity: 0`, không có
  unhandled console error và các block sau giữ nguyên vị trí.
- Regression bắt buộc gồm fresh Home → Advertising Products, Advertising
  Products → Home → Advertising Products, desktop/mobile và network chậm. Sau
  route enter phải có `.advertising-grid`, card runtime đã mount, dependency sẵn
  sàng và không có text bắt đầu bằng literal `<figure`.

## Evidence và trạng thái implementation

Work log evidence scoped current-hash (root masonry, carousel, sáu composition,
delta `109`, organic masonry và baseline 2026-08-31) đã chuyển sang
[evidence Advertising Products](../verification/advertising-products-turnkey-evidence.md).
Full suite vẫn `NOT PASS`; scoped result không là release clearance.

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
  masonry, taxonomy hoặc tạo pool gallery riêng.
- Delta carousel được phép thêm `swiper@14.2.0`, vendor asset, progressive
  carousel markup, scoped detail CSS/runtime và regression tương ứng; không được
  dùng Swiper cho parent masonry kiểu Pinterest, Residential hoặc Commercial trong task
  này.

## Carousel visual

Accepted visual/interaction contract; [dependency và renderer](#template-chi-tiết-và-media) vẫn do spec sở hữu.

Đây là contract carousel lịch sử; detail mới ở trên supersede entrypoint
Advertising khi compatibility đã được triển khai. Generic gallery ngoài
Advertising giữ behavior riêng.

Mọi block `gallery` dùng cùng carousel ngang, không giữ grid media cũ hoặc tạo
hai renderer song song. Contract trình bày:

- carousel breakout khỏi content cap `1500px` nhưng giữ outer band theo Espacio:
  `35px` trên desktop, `25px` từ `751–1200px`, `15px` đến `750px`;
- media viewport có chiều cao tối đa `50vw` trên desktop và `75vw` đến `750px`;
  chiều rộng từng slide lấy từ intrinsic ratio của ảnh, không kéo giãn, crop
  hoặc thêm backplate;
- slide thường giữ chiều cao tối đa và phải để lộ slide kế tiếp khi chưa ở item
  cuối. Nếu intrinsic ratio làm slide rộng hơn usable carousel width, slide đó
  được cap bằng toàn bộ usable width, giảm chiều cao theo đúng tỷ lệ tự nhiên và
  không bắt buộc để lộ slide kế; wrapper cùng control rail bám chiều cao media
  thực tế để không tạo box rỗng;
- slide gap `20px` từ `600px`, `10px` dưới `600px`;
- caption VI/EN nằm dưới từng ảnh, không overlay, không clip dấu và chỉ ẩn khi
  record không có caption; dots đặt thành một control rail riêng bên dưới;
- slide và thay đổi chiều cao wrapper chuyển trong `500ms`; hỗ trợ drag, touch,
  wheel ngang với
  `forceToAxis`, clickable dots và grab cursor; không autoplay, loop, arrow hoặc
  keyboard trap;
- reduced motion đưa slide cùng chiều cao wrapper tới vị trí mới tức thì; không
  thêm entrance hoặc exit motion cho wrapper carousel;
- trước khi Swiper sẵn sàng hoặc khi dependency lỗi, markup vẫn là native
  horizontal scroll có scroll snap, đủ caption và truy cập được mọi media.

## Runtime API

API và lifecycle đang chạy của catalog, layout và renderer Advertising.

### Layout core

**Status:** current pure runtime API, observed implementation và validation
contract trong source/test. Accepted geometry target phải đến từ spec/decision,
không suy ra từ source.

**Source:** [`layout-core.mjs`](../../src/site/advertising-products/layout-core.mjs);
consumers `catalog-runtime.mjs`, layout/lifecycle tests.

**Input/output API:**

| API | Input | Output |
| --- | --- | --- |
| `advertisingSpacing(width)` | viewport width hữu hạn, dương | `{ outer, interCardGap }` |
| `columnsForWidth(width)` | viewport width hữu hạn, dương | số cột trong giới hạn |
| `validateAdvertisingCards(cards, options)` | cards, `categoryOrder`, cờ rank/non-empty | cards gốc hoặc throw |
| `compileAdvertisingLayout(options)` | `layoutViewportWidth`, `filter`, `cards`, `categoryOrder`, `datasetVersion`, `columns` tuỳ chọn | geometry, placements, total height, `coordinateHash` deterministic |
| `getVirtualWindow(layout, options)` | layout, `scrollTop`, `viewportHeight`, `overscan` | `{ items, totalHeight }` |

Validator reject input không phải array/rỗng khi được yêu cầu, ID sai/trùng,
category không biết, source order trùng, kích thước media/canvas sai,
`span`/fixed `ratio` không hỗ trợ, fit mode sai và rank không liên tục/không
canonical. Core throw khi viewport/columns/filter/virtual-window input sai.

**Ví dụ:** `catalog-runtime.mjs` gọi `compileAdvertisingLayout({
layoutViewportWidth, filter, cards, categoryOrder, datasetVersion })`, rồi gọi
`getVirtualWindow(geometry, { scrollTop, viewportHeight: innerHeight, overscan:
innerHeight })`.

Ví dụ chạy với data canonical hiện có, không tự tạo card hoặc generated artifact:

```powershell
node --input-type=module -e "import { ADVERTISING_CARDS, ADVERTISING_CATEGORIES, compileAdvertisingLayout } from './src/site/advertising-products/catalog.mjs'; import { validateAdvertisingCards } from './src/site/advertising-products/layout-core.mjs'; const categoryOrder=ADVERTISING_CATEGORIES.map(({slug})=>slug); validateAdvertisingCards(ADVERTISING_CARDS,{categoryOrder,requireRanks:true}); const layout=compileAdvertisingLayout({layoutViewportWidth:1280,filter:'all'}); console.log({categories:categoryOrder.length,cards:ADVERTISING_CARDS.length,placements:layout.placements.length,columns:layout.columns,totalPixelHeight:layout.totalPixelHeight,coordinateHash:layout.coordinateHash});"
```

Lệnh này kiểm tra import, validator và wrapper compile bằng data source hiện có;
giá trị `coordinateHash` do runtime tính, không ghi cứng vào guide.

**A11y/responsive:** core không đọc DOM; runtime thêm list semantics,
`aria-posinset`, `aria-setsize`, keyboard frontier recovery và cột responsive.
Reduced motion chỉ ảnh hưởng transition runtime, không đổi geometry deterministic.

**Customization boundary:** caller có thể chọn filter/viewport và columns tuỳ chọn
cho scenario đã kiểm chứng; không bypass validator, đổi placement order hoặc
invent rule geometry riêng route.

### Catalog runtime

**Status:** current static catalog runtime; source/data contract là observed,
không tự nhận accepted chỉ vì có test.

**Source/consumer:** [`catalog-runtime.mjs`](../../src/site/advertising-products/catalog-runtime.mjs)
được `detail.js` import và điều phối; browser focused functions gồm
`runAdvertisingGridFocusedChecks`, `runAdvertisingKeyboardVirtualizationCheck`,
`runAdvertisingMediaFocusedChecks` và `runAdvertisingLocaleLifecycleChecks`.

**Input:** Barba container `[data-barba-namespace="advertising-products"]` tuỳ
chọn và `{ signal }`; `catalog-artifact.mjs` generated; filter
`[data-advertising-filter]`; masonry `[data-project-grid]`.

**Output/lifecycle:** `mountAdvertisingCatalog(container?, { signal }?)` là hàm
async và trả `Promise<cleanup function>`. Hàm validate artifact version,
category/card, mount filter/masonry, lazy media, virtualization và listener.
`unmountAdvertisingCatalog()` gọi cleanup active; browser bridge là
`window.TruongThinhAdvertising = { mount, unmount }`.

**Trạng thái:** filter query all/category; full/virtual window; media
pending/loaded/revealed; dependency ready/failure; VI/EN; direct load,
Barba/history remount, resize, scroll và abort cleanup.

**Errors/fallback:** mount reject khi artifact version, category/card data hoặc
Masonry không hợp lệ. Markup card static/no-script còn đó cho tới khi mount hợp
lệ thay thế. Media replay được arm lại sau khi rời viewport; cleanup idempotent
và xoá observer/listener/timer do runtime sở hữu.

**A11y/i18n/responsive:** filter `aria-current`, card link/alt/caption generated
theo leaf data, list item semantics, DOM bounded và keyboard Tab recovery qua
virtual frontier. Reduced motion reveal media ngay và bỏ Masonry transition.

**Ví dụ:** `detail.js` chờ `ensureAdvertisingDependencies()`, import module rồi
return `mountAdvertisingCatalog(container, { signal: abort.signal })`; caller lưu
Promise nhận được vào `state.catalogReady`.

**Customization boundary:** đổi taxonomy/media qua `catalog.mjs` và
`media-manifest.mjs`; không sửa generated artifact, card list trong runtime HTML
hoặc bypass pure layout core.

### Renderer detail build-time

**Status:** current internal renderer; không phải component library hoặc runtime API.

**Source:** `renderDetailComposition(category, products)` trong
[`prepare-static-assets.mjs`](../../scripts/site/prepare-static-assets.mjs),
template [`detail-template.html`](../../src/site/advertising-products/detail-template.html),
data `catalog.mjs`.

**Input/output:** category detail layout, source ID, copy category song ngữ và
product list đi vào; composition `<main>` dùng chung và
`/{locale}/advertising-products/{slug}/index.html` generated đi ra. Block hợp lệ
gồm `titular`, `paragraph`, `facts`, `gallery`, `single`, `double`, `columns`,
`banner`; sáu route variant là data/layout, không phải sáu renderer.

**Ví dụ:** generator lặp `ADVERTISING_CATEGORIES`, resolve hero/source ID, render
product rồi thay `{{composition}}` trong template dùng chung.

**Errors/fallback:** thiếu hero hoặc section media không resolve thì throw; layout
kind sai bị catalog validation reject. Không có runtime empty renderer; build phải
fail trước khi output được chấp nhận. Generated `.site-output/` không phải edit
target.

**A11y/i18n:** renderer tạo title/statement/alt/caption song ngữ, semantic
product list, `aria-label`/`data-en-aria-label`, kích thước intrinsic và lazy
media. Reduced motion do detail runtime xử lý sau render.

**Customization boundary:** sửa data/layout schema trong catalog/spec sở hữu;
không thêm template copy riêng route hoặc block HTML/CSS tuỳ ý.

Ví dụ block gallery có thật trong `ADVERTISING_DETAIL_LAYOUTS`, dùng đúng schema
và source ID hiện có:

```js
{
  kind: "gallery",
  sourceIds: [
    "imagegen:2026-09-01:kiosk-posm:06",
    "imagegen:2026-09-01:kiosk-posm:07",
    "imagegen:2026-09-01:kiosk-posm:08",
    "imagegen:2026-09-01:kiosk-posm:09",
    "imagegen:2026-09-01:kiosk-posm:10",
    "imagegen:2026-09-01:kiosk-posm:11",
    "imagegen:2026-09-01:kiosk-posm:12",
    "imagegen:2026-09-01:kiosk-posm:13",
    "imagegen:2026-09-01:kiosk-posm:14",
    "imagegen:2026-09-01:kiosk-posm:15",
    "imagegen:2026-09-01:kiosk-posm:16",
    "imagegen:2026-09-01:kiosk-posm:17",
  ],
}
```

Để thêm hoặc đổi gallery, sửa block tương ứng trong
`src/site/advertising-products/catalog.mjs`, giữ mỗi source ID thuộc đúng slug
và partition pool đúng một lần. Không chép block thành layout thứ hai và không
sửa `.site-output/`. Kiểm tra contract bằng
`node --input-type=module -e "import { ADVERTISING_DETAIL_LAYOUTS } from './src/site/advertising-products/catalog.mjs'; console.log(ADVERTISING_DETAIL_LAYOUTS['kiosk-posm'].sections.find(({kind})=>kind==='gallery'));"`
và test tập trung trong `tests/site/advertising-products-static.test.mjs` hoặc
`tests/site/site.e2e.cjs` theo consumer bị chạm.

### Carousel detail (dormant)

**Status:** dormant; Advertising detail đã thay entrypoint carousel cũ.
Owner yêu cầu ngày 24/09/2026 giữ source để thiết kế lại carousel cho Residential
và Commercial. Hướng mới có thể khác Espacio; chưa activate hoặc đổi UI trong
release này. Runtime chỉ tải Swiper khi có markup carousel tương ứng.

**Source/DOM:** renderer tạo `[data-advertising-carousel]`,
`[data-advertising-carousel-viewport]`, `[data-advertising-carousel-track]`,
`[data-advertising-carousel-pagination]` và
`data-advertising-carousel-state="native"`. `detail.js` tải Swiper 14.2.0
module Mousewheel/Pagination/A11y qua local vendor path đã pin.

**Output/states:** state đổi native → enhanced sau khi module sẵn sàng;
`autoHeight`, `slidesPerView: auto`, drag cursor, axis-aware wheel, pagination và
watchOverflow. Failure reset/giữ native state. Reduced motion dùng speed `0`;
normal motion dùng transition hiện có trong source.

**A11y/i18n/cleanup:** Swiper A11y được bật; label carousel có attribute VI và EN;
ảnh giữ alt pair và không native image drag. Detail unmount destroy mọi carousel
và abort listener của page.

**Customization boundary:** data chọn block/source list; runtime sở hữu
enhancement và fallback. Không gộp API này với `[data-gallery]` generic hoặc bỏ
qua native state khi vendor module lỗi.

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
- **Wrapper stretch**: masonry item bị kéo cao theo hàng dù nội dung ảnh ngắn hơn,
  tạo vùng nền rỗng không mang thông tin.
- **CMS deferral**: việc đã biết nhưng chủ động chuyển sang CMS phase, có ghi rõ
  boundary và điều kiện xem lại.
- **Pure core**: hàm chỉ phụ thuộc input, không đọc DOM hoặc global runtime.
- **Virtual frontier**: ranh giới item chưa mount nhưng vẫn phải đi qua bằng keyboard.
- **Progressive enhancement**: native behavior chạy trước, enhancement chỉ thêm khi sẵn sàng.
