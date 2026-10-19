---
title: Masonry Advertising
status: live
source:
  - src/site/advertising-products/index.html
  - src/site/advertising-products/catalog.mjs
  - src/site/advertising-products/catalog-runtime.mjs
  - src/site/advertising-products/layout-core.mjs
  - src/site/advertising-products/layout-worker.mjs
  - src/site/advertising-products/random-order.mjs
  - src/site/advertising-products/media-contract.mjs
  - src/site/advertising-products/media-manifest.mjs
  - src/site/advertising-products/photo-tags.mjs
tests:
  - tests/site/advertising-products-layout.test.mjs
  - tests/site/advertising-products-lifecycle.test.mjs
  - tests/site/advertising-products-media.test.mjs
  - tests/site/advertising-products-random-order.test.mjs
  - tests/site/advertising-products-static.test.mjs
  - tests/site/advertising-one-column.test.mjs
  - tests/site/advertising-random-browse.e2e.mjs
  - tests/site/advertising-hero-once.e2e.mjs
  - tests/site/advertising-no-titles.e2e.mjs
  - tests/site/advertising-card-interactions.e2e.mjs
  - tests/site/advertising-route-footer-p75.e2e.mjs
  - tests/site/site.e2e.cjs
notion: https://app.notion.com/p/3e6332849a0e81508d66ca0b3cfebf18
updated: 2026-10-19
---

# Masonry Advertising

## Mục đích

Trang `/vi/advertising-products/` và `/en/advertising-products/` cho khách quét toàn bộ ảnh sản phẩm quảng cáo theo
sáu cụm, trong một masonry so le có thứ tự ngẫu nhiên theo lượt duyệt. Spec này sở hữu trang, catalog, filter, thứ tự,
hình học, ảo hóa và card. Batch skeleton cuối masonry ở [skeleton](advertising-skeleton.md); detail (trang card `p/<id>`) ở
[detail](advertising-detail.md); header, menu, footer, veil ở [shell](site-shell.md).

## Hành vi

### R1. Trang và cấu trúc

`src/site/advertising-products/index.html` là bản VI; bản EN sinh lúc build
([phát hành tĩnh R5](static-release.md#r5-văn-bản-song-ngữ-và-route-locale)). Head, veil, header, menu, footer thuộc
shell ([R7](site-shell.md#r7-veil-khi-tải-trực-tiếp-fallback-và-bfcache), [R10](site-shell.md#r10-floating-cta-và-footer)).
Title "Sản phẩm Quảng cáo — Trường Thịnh" / "Advertising products — Trường Thịnh"; mục Advertising trên navbar có
`aria-current="page"`. `body.detail-page[data-detail-hero-profile="words-06"]`, container
`data-barba-namespace="advertising-products"`. `main#noi-dung` gồm: hero `.detail-index-hero#top` (kicker "Sản phẩm
quảng cáo", `h1` hai dòng "để thương hiệu / luôn trong tầm mắt", EN "Keep your brand / always in sight", rail filter
R3, scroll cue cách đáy như [Hero](../../design-system/components/Hero/README.md); trên 1024px dòng 2 neo mép phải
khung); `section.project-index#du-an` chứa `[data-project-grid]`, khung batch
`[data-advertising-cta-skeleton]` và CTA `section.detail-cta[data-advertising-grid-cta]` ("Dấu ấn tiếp theo / dành cho
thương hiệu của bạn", link Zalo "Trao đổi ý tưởng"); `section[data-advertising-photo-view][hidden]` là detail. Khi
duyệt masonry (không có `photo`), `body` có `is-advertising-browse`: floating CTA ẩn, footer không có khoảng phía trên.

```gherkin
Given /en/advertising-products/ tải trực tiếp
When trang dựng xong
Then title là "Advertising products — Trường Thịnh", h1 là "Keep your brand / always in sight"
And body có is-advertising-browse, floating CTA không hiện
```

### R2. Catalog và artifact

Dữ liệu tĩnh trong `catalog.mjs`, `media-manifest.mjs`, `photo-tags.mjs`, `taxonomy.mjs`; `media-contract.mjs` kiểm. Rail
và filter chạy theo sáu cụm ([phân loại R1](advertising-taxonomy.md#r1-ba-tầng-phân-loại)): `ADVERTISING_CATEGORIES` có `slug` là id cụm, nhãn rail; sáu
nhóm cũ (`kiosk-posm`...) chỉ còn trong manifest và `ADVERTISING_LEGACY_CATEGORIES` cho trang tương thích. Mỗi card có `id`,
`category` (cụm của sản phẩm chính), `clusterIds` (cụm của từng sản phẩm), `sourceOrder` (đếm lại trong cụm), `productKey`, `productIds` ([phân loại R2](advertising-taxonomy.md#r2-dữ-liệu-phân-loại-sửa-được)),
tên và mô tả VI/EN, `tagIds`, `media` (`src`, `sourceId`, `width`, `height`, alt VI/EN, `source`, `sha256`, `provenance`),
`mediaItems`, `coverMediaId`, `rank`. Pool bị từ chối khi: trùng `id`, `src` hoặc `sourceId`; thiếu chữ VI/EN, provenance
hay kích thước dương; tag hoặc sản phẩm không có; dữ liệu phân loại sai (phân loại R2); cụm thiếu một trong bốn loại tỷ lệ
w/h: đứng `< 0.9`, gần vuông `0.9–1.1`, ngang `> 1.1`, cực `<= 0.625` hoặc `>= 1.6`. Card không còn nhận
`presentationCanvas`, `fitMode`, `mediaCandidates`; ảnh giữ tỷ lệ gốc. Alt VI/EN là tên card; alt và mô tả không gắn nhãn
AI, nguồn gốc ảnh chỉ ghi ở `provenance` (không hiển thị). `rank` xếp round-robin theo thứ tự cụm, trong cụm theo
`sourceOrder`. `buildAdvertisingArtifact()` trả `datasetVersion`, `layoutAlgorithmVersion`, `settings`, `tagRegistry` (có tag nhóm `product`),
`categories`, `clusters`, `products`, `pages`, `cards` (kèm `related`, [taxonomy R7](advertising-taxonomy.md#r7-related-có-thể-bạn-thích)); build ghi artifact và chạy preflight ([phát hành tĩnh R2](static-release.md#r2-preflight-masonry-và-catalog-artifact)).
Sáu URL nhóm cũ chuyển tới trang cụm mới ([R7](static-release.md#r7-sáu-trang-tương-thích-advertising)).

```gherkin
Given một card mới trùng media.sourceId với card đã có
When chạy node --test tests/site/advertising-products-media.test.mjs
Then validator từ chối pool và nêu id trùng
```

### R3. Filter

Rail `.project-filters` (`role="group"`) có bảy link `[data-advertising-filter]`: `all` ("Tất cả" / "All", về URL gốc)
rồi sáu cụm theo thứ tự `taxonomy.mjs` (build sinh vào HTML, `href` là trang cụm theo slug locale); mục đang chọn có `aria-current="true"`. Cụm lấy card có ít nhất một sản phẩm
thuộc cụm, xếp theo hạng ([taxonomy R1](advertising-taxonomy.md#r1-ba-tầng-phân-loại)). `?category=` nhận id cụm, slug VI/EN, slug nhóm cũ (cùng kết quả) hoặc id sản phẩm (mọi card gắn sản phẩm đó); runtime ghi slug cụm theo locale; lạ thì về All. Không có `?category=` thì filter theo path trang cụm, sản phẩm ([taxonomy R4](advertising-taxonomy.md#r4-url-và-trang-index)); đổi filter ghi path trang của filter đó theo slug locale (đổi `document.title` và kicker), sản phẩm chưa có trang ghi path trang cụm kèm `?category=` ([taxonomy R5](advertising-taxonomy.md#r5-ngưỡng-chip-và-trang-mỏng)).
Click chính không phím bổ trợ: không tải document, không request, không cuộn bằng code; URL đổi bằng `replaceState`
(không thêm history entry); card đổi vị trí theo R6; container, hero, thứ tự và vị trí bảy nút giữ nguyên. Click có
phím bổ trợ hoặc chuột giữa đi theo trình duyệt. Click trước khi runtime sẵn sàng (chỉ gặp khi không có veil
[shell R7](site-shell.md#r7-veil-khi-tải-trực-tiếp-fallback-và-bfcache), tức reduced motion) được giữ lại, phát lại
đúng một lần khi mount xong; mount lỗi thì tải hẳn URL của filter cuối. Đổi ngôn ngữ chỉ đổi chữ, `href`, ARIA.
Rail hẹp cuộn ngang; focus bàn phím vào nút thì rail cuộn để nút hiện trọn. Bấm rail: kicker đổi chữ và hàng chip vừa hiện chạy entrance có sẵn ([Motion](../../design-system/motion.md#kicker-và-hàng-chip-khi-đổi-filter)).
Navbar hoặc tiêu đề menu Advertising: đang ở All không có `photo` thì cuộn về 0
([shell R6](site-shell.md#r6-route-mềm-và-click-trong-shell)); ở một nhóm thì thêm history entry về All; ở detail thì về
nhóm đã chọn trước khi mở ảnh ([detail R10](advertising-detail.md#r10-navbar-và-escape-trên-detail)).

```gherkin
Given /vi/advertising-products/ ở All, runtime đã sẵn sàng
When bấm "Kiosk & POSM" rồi "Tất cả" mười vòng
Then không có request document hay XHR, hero không chạy lại, history.length không đổi
And mỗi lần bấm, aria-current nằm trên đúng một nút
```

### R4. Thứ tự ngẫu nhiên theo lượt duyệt

Mỗi lượt duyệt có một seed (`createAdvertisingSeed`). Pool của mỗi filter được xáo Fisher-Yates bằng seed với scope
`grid:<filter>` rồi xếp ổn định theo hạng (`advertisingFilterRank`, taxonomy R1), nên về lại một filter trong cùng lượt cho lại đúng thứ tự cũ. Khi pool có ít nhất 2 ảnh cao (h/w
`>= 1.15`) và 2 ảnh thấp (`<= 0.9`), solver organic có thể đổi thứ tự trình bày để 12 card đầu có cả hai loại, không
quá 4 ảnh cùng loại liền nhau; không cải thiện được thì giữ thứ tự seed và ghi lý do. Seed mới khi F5, mở URL trực tiếp,
vào trang bằng link hoặc route mềm mới. Seed giữ khi đổi filter, mở và đóng detail, Back/Forward (seed nằm trong history
state, kể cả khi Back lúc route mềm đang chạy làm trình duyệt tải hẳn trang), đổi ngôn ngữ (route mềm giữ document; tải
hẳn dùng handoff `sessionStorage` một lần, hết hạn sau 30s, chỉ nhận khi `navigate` đúng URL đích).

```gherkin
Given lượt duyệt đang ở "In nhanh & decal"
When mở một card, Back, chuyển EN rồi F5
Then trước F5 thứ tự card không đổi; sau F5 seed mới, pool giữ đúng nhóm và đủ card
```

### R5. Hình học masonry

Bề rộng tính từ `documentElement.clientWidth` (không gồm thanh cuộn). Lề ngoài 15/25/35px khi viewport `<= 750`,
`<= 1200`, lớn hơn; khoảng giữa card 15/25/35px khi `<= 960`, `<= 1200`, lớn hơn. Masonry rộng bằng viewport trừ hai lề,
không có bề rộng tối đa. Số cột `C = min(4, max(2, floor((W + G) / (220 + G))))` với `W` bề rộng masonry, `G` khoảng
giữa. Mọi card rộng đúng một cột; cao bằng ảnh theo tỷ lệ gốc, không caption (card nhiều media thêm dải control 44px
theo [media-card](media-card.md#r2-canvas-và-dải-điều-khiển)). Không spacer, không giãn khoảng giữa, không crop để giả so le.

```gherkin
Given viewport 768px, masonry đang ở All
When đo card
Then có 3 cột, lề 25px, khoảng giữa 15px, mỗi card rộng đúng một cột
```

### R6. Đặt card và chuyển vị trí

Card đi theo thứ tự trình bày R4; mỗi card vào cột có đáy thấp nhất (hòa thì cột trái), top bằng đáy cột cộng khoảng
giữa, card đầu mỗi cột ở top 0. Pha ưu tiên đòi: mép dưới ảnh gần nhất ở hai cột kề lệch ít nhất 10% chiều cao ảnh cao
hơn; mép ảnh và mép card không lặp nhịp gạch (lượng tử lệch theo `0.125 × bề rộng card`, cấm `ABABAB` và ba mức giống
nhau liền nhau). Hết nửa ngân sách 300.000 phép thử thì pha dự phòng cho phép thẳng hàng, không bao giờ chồng card.
Cùng dataset, filter, bề rộng và thứ tự cho cùng tọa độ (`coordinateHash`). Lỗi đầu vào (`invalid-input`) hoặc hết
ngân sách ở cả hai pha (`search-exhausted`) làm masonry báo `data-advertising-layout-status="failed"`; pool không đủ
nhóm tỷ lệ chỉ ghi chẩn đoán `needs-media`. Đổi filter hoặc bề rộng: card bị loại ẩn ngay, card còn lại và card mới đi
từ vị trí cũ tới vị trí mới bằng `masonry-layout` ([motion](../../design-system/motion.md#vị-trí-card-masonry)); lần
dựng đầu card đi từ đầu cột. Card và khung skeleton ([R1](advertising-skeleton.md#r1-batch-nối-tiếp-masonry)) trượt,
co giãn từ chỗ, cỡ cũ; CTA, Kính trượt cùng nhịp `0.4s ease`: cả trang là một masonry (owner 10/10); đang kéo cạnh cửa sổ thì đặt thẳng. Chỉ đổi chiều cao cửa sổ thì không đặt lại card. Cuộn trong lúc chuyển vị trí được gộp
thành một lần cập nhật khi chuyển xong. `site:layout` chỉ phát khi chiều cao trang đổi
([scroll-feel R1](scroll-feel.md#r1-một-chuẩn-cuộn-cho-mọi-trang)); thay card theo cửa sổ ảo mà giữ chiều cao thì không phát.

```gherkin
Given masonry 4 cột ở 1440px
When bấm "LED, màn hình & hộp đèn" rồi đổi cửa sổ còn 1000px trong lúc card đang trượt
Then filter mới thắng, không còn card ở tọa độ cũ, không có hai card chồng nhau
```

### R7. Ảo hóa và bàn phím

Masonry có `role="list"`; mỗi card `role="listitem"` với `aria-posinset`, `aria-setsize` theo toàn pool. Chỉ card giao
vùng nhìn thấy cộng một chiều cao vùng nhìn thấy mỗi phía được mount, cộng card đang giữ focus và card vừa mở detail.
Tổng chiều cao, tọa độ và metadata giữ cho cả pool. Tab hoặc Shift+Tab sang card chưa mount thì mount card đó theo thứ
tự rồi chuyển focus. Mount, gỡ card khi cuộn không làm Locomotive tính lại ([cảm giác cuộn R1](scroll-feel.md#r1-một-chuẩn-cuộn-cho-mọi-trang)). Đóng menu trả focus về card đang theo dõi. Vào thẳng detail thì masonry ẩn từ trước Layout đầu (`body.is-advertising-photo` do script đầu `<body>` gắn) và chưa tính tọa độ; về masonry mới tính.

```gherkin
Given masonry All 254 card, đang ở đầu trang
When nhấn Tab liên tục qua từng card
Then focus đi theo aria-posinset tăng dần, không nhảy qua card chưa mount
```

### R8. Card và ảnh trong card

Card là `figure.advertising-tile[data-advertising-card]` chứa một link tới trang card `p/<id>/` ([media-seo](media-seo.md#r1-mỗi-card-có-trang-riêng)); không tên,
không caption, alt theo ngôn ngữ. Ảnh dùng LazySizes (`data-src`, `data-srcset` từ biến thể của
[tải ảnh](media-delivery.md#r3-runtime-advertising-chọn-biến-thể), `data-sizes` ghi bằng bề rộng card từ solver, không `auto` để khỏi đo từng ảnh). Card vào vùng nhìn
thấy khi ảnh chưa giải mã thì mang skeleton chờ ảnh, ảnh về thì hiện dưới Kính nhịp `0.6s`; ảnh đã có (cache, tải trước,
vào lại sau `intersectionRatio = 0`) thì hiện ngay, không motion ([loading glass R1–R3](loading-glass-and-page-entry.md)). Hover chuột và focus bàn phím cùng phản hồi zoom ảnh, khung
không dịch ([hover dùng chung](page-home.md#r6-hover-ảnh-dùng-chung)). Click chính mở detail tại chỗ (history push,
[detail](advertising-detail.md#r1-url-và-vào-detail)); đóng detail đánh dấu "Vừa xem" / "Just viewed" trên card vừa xem.

```gherkin
Given card đã hiện ảnh
When cuộn tới khi card ra hẳn khỏi viewport rồi cuộn lại
Then ảnh hiện ngay, không skeleton, không Kính; khung card không đổi kích thước
```

### R9. Hero một lần

Hero chạy theo profile `words-06`: chữ `h1` hiện theo từ sau 0,6s (1s mỗi từ, stagger 0,2s), kicker sau 0,9s, tính từ
lúc mount. Mỗi container chạy hero đúng một lần: tải trực tiếp hoặc route mềm mới có hero; đổi filter, cuộn, resize,
ẩn hiện tab, mount lại cùng container không chạy lại. Cách tách chữ và reveal chung:
[trang dịch vụ R5–R6](detail-pages.md#r5-hero-và-vào-trang).

```gherkin
Given trang vừa vào bằng navbar, hero đã chạy xong
When cuộn End, Home, bấm một filter rồi ẩn và hiện lại tab
Then hero không chạy lại, container giữ nguyên
```

### R10. Phụ thuộc, lỗi và không JavaScript

`detail.js` nạp tuần tự GSAP 3.15.0, SplitText 3.15.0 (tùy chọn: thiếu thì chỉ cảnh báo), Masonry 4.2.2, LazySizes
5.3.2 (bắt buộc), mỗi file chờ tối đa 4s, script có sẵn mà lỗi thì nạp lại một lần, rồi import `catalog-runtime.mjs`.
Runtime kiểm artifact (`layoutAlgorithmVersion` bằng `advertising-grid-v14`, nhóm không rỗng, card hợp lệ), cần Masonry.
Tải trực tiếp mà lỗi: masonry bị dọn và ẩn, container có `data-advertising-fallback="failed"`, html có
`motion-fallback`; nếu khách đã bấm filter thì tải hẳn URL filter đó. Route mềm mà lỗi: tải hẳn URL đích. Không
JavaScript: `<noscript>` hiện sáu card nhóm dẫn tới sáu URL cũ; có JavaScript thì `<noscript>` không bao giờ hiện thành
chữ thô (CSS chỉ áp trong `@media (scripting: none)`).

```gherkin
Given Masonry 4.2.2 không tải được khi vào thẳng /vi/advertising-products/
When hết thời gian chờ
Then masonry ẩn, container có data-advertising-fallback="failed", không còn markup thô
```

### R11. Cuối masonry

Dưới card thật cuối là batch skeleton ([skeleton R1](advertising-skeleton.md#r1-batch-nối-tiếp-masonry)), CTA và
[Kính](glass-surface.md) dạng cung; chữ CTA, parallax, footer theo [CTA giữa viewport](advertising-cta-center-parallax.md).
Masonry chỉ cung cấp đáy từng cột, bề rộng card, khoảng giữa, hash tọa độ; mở detail gỡ batch, đóng thì dựng lại.
Renderer Flow mount cả khi đang cuộn, trừ loại máy bị hoãn theo [skeleton R5](advertising-skeleton.md#r5-webgl-context).

```gherkin
Given masonry đã dựng ở bất kỳ filter nào
When đọc chiều cao [data-project-grid]
Then bằng đáy CTA, batch bắt đầu một khoảng giữa dưới card thật mỗi cột
```

### R12. Reduced motion

`prefers-reduced-motion: reduce`: card đặt thẳng vào tọa độ mới, ảnh hiện ngay, không zoom hover (focus vẫn có viền),
skeleton chờ ảnh đứng yên, hero hiện trạng thái cuối. Bật giữa chừng thì áp dụng ở lần cập nhật kế tiếp.

```gherkin
Given prefers-reduced-motion: reduce
When đổi filter
Then card ở tọa độ mới ngay khung hình kế tiếp, không có transition
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| DOM hook | `[data-project-grid]`, `[data-advertising-card]`, `[data-advertising-filter]`, `body.is-advertising-browse` | Masonry, card, filter, chế độ duyệt (R1, R3, R7, R8); test đọc |
| DOM hook | `data-advertising-layout-status`, `-layout-error`, `-layout-diagnostic` trên masonry; `data-advertising-fallback="failed"` trên container | Kết quả compile (R6); lỗi mount (R10) |
| Data | `ADVERTISING_CATEGORIES`, `ADVERTISING_CARDS`, `ADVERTISING_DATASET_VERSION` (`catalog.mjs`) | Catalog (R2) |
| Data | `.site-output/advertising-products/catalog-artifact.mjs` (`ADVERTISING_CATALOG_ARTIFACT`) | Build sinh, runtime import; test có thể đặt `window.__TT_ADVERTISING_ARTIFACT__` |
| Hàm public | `compileAdvertisingProductLayout`, `columnsForWidth`, `advertisingSpacing`, `getVirtualWindow` (`layout-core.mjs`); `createAdvertisingSeed`, `shuffleWithSeed` (`random-order.mjs`) | Hình học thuần, không đọc DOM (R5–R7); compile lần đầu khi mount và solver related khi mở detail chạy trong Worker `layout-worker.mjs`, lỗi thì compile đồng bộ ([phone Android](../decisions/phone-frame-budget.md)); seed và xáo (R4) |
| Hàm public | `mountAdvertisingCatalog(container, {signal, scroll, softNavigation})` | `detail.js` gọi; trả cleanup |
| Hàm public | `window.TruongThinhAdvertising`: `mount`, `unmount`, `getAdapter`, `navigateQuery`, `handlePopState`, `canHandlePopState`, `getBrowseState`, `getCurrentHref`, `navigatePhoto`, `replaceTag`, `captureDetail` | `motion.js` gọi cho navbar, popstate (R3) |
| Storage | history state `advertisingBrowse`; `sessionStorage` `tt-advertising-visit-seed-handoff-v1` | Seed, filter, vị trí theo entry; handoff ngôn ngữ (R4) |
| Event | `site:layout` | Phát cho shell khi chiều cao trang đổi (R6) |

## UI

[Masonry](../../design-system/components/Masonry/README.md), [Filter](../../design-system/components/Filter/README.md),
[Media card](../../design-system/components/MediaCard/README.md), [Hero](../../design-system/components/Hero/README.md),
[motion Advertising](../../design-system/motion.md#advertising), [ảnh Advertising](../../design-system/advertising-images.md).

## Kiểm tra

Unit `node --test <file>`; E2E cần `pnpm dev`, `BASE_URL`; `TT_E2E_ADVERTISING_*_ONLY=1` chạy một phần `site.e2e.cjs`.

| R | Test hoặc command |
| --- | --- |
| R1 | `advertising-products-static.test.mjs` (markup, noscript, CTA); `advertising-no-titles.e2e.mjs` |
| R2 | `advertising-products-media.test.mjs` (pool, provenance); `advertising-products-layout.test.mjs` (rank); `pnpm prepare:site` (preflight) |
| R3 | `advertising-random-browse.e2e.mjs` (thứ tự, vị trí nút, EN, slug cũ và mới); `advertising-products-media.test.mjs` (cụm, sản phẩm, slug); `advertising-hero-once.e2e.mjs` (click trước runtime, mười vòng); `TT_E2E_ADVERTISING_RAPID_FILTER_ONLY`, `_HISTORY_ONLY` |
| R4 | `advertising-products-random-order.test.mjs` (seed, history, handoff, reload); `advertising-random-browse.e2e.mjs`; `advertising-route-footer-p75.e2e.mjs` (route mới, F5) |
| R5 | `advertising-products-layout.test.mjs` (cột, lề, khoảng giữa mọi filter ở 320–2560px); `advertising-products-static.test.mjs` (CSS) |
| R6 | `advertising-one-column.test.mjs` (so le 10%, dự phòng); `advertising-products-layout.test.mjs` (hash, nhịp gạch, organic); `node tests/site/advertising-solver-report.mjs`; `TT_E2E_ADVERTISING_GRID_ONLY` |
| R7 | `advertising-products-layout.test.mjs` (`getVirtualWindow`, 3.000 card); `TT_E2E_ADVERTISING_KEYBOARD_ONLY`, `_3K_ONLY` |
| R8 | `advertising-card-interactions.e2e.mjs`; `advertising-no-titles.e2e.mjs`; `TT_E2E_ADVERTISING_MEDIA_ENTRANCE_ONLY` |
| R9 | `advertising-hero-once.e2e.mjs`; `TT_E2E_ADVERTISING_HERO_ONLY` |
| R10 | `advertising-products-lifecycle.test.mjs` (phụ thuộc tùy chọn, bắt buộc); `TT_E2E_ADVERTISING_DIRECT_FAILURE_ONLY` |
| R11 | `advertising-route-footer-p75.e2e.mjs`; xem [skeleton](advertising-skeleton.md#kiểm-tra) |
| R12 | `advertising-card-interactions.e2e.mjs` (ca giảm chuyển động); chưa có test reduced motion cho đổi filter |

## Gate còn mở

- Owner xem masonry trên demo: thứ tự ngẫu nhiên, nhịp cao thấp, so le, filter; VI/EN, desktop và điện thoại. Owner.
- `advertising-random-browse.e2e.mjs`: Chromium và WebKit cloud PASS (22 case, 3/3 lượt). WebKit headless Linux vẽ `backdrop-filter` của Kính bằng phần mềm nên rAF dừng
  sau Back (kẹt 14/40; tắt `backdrop-filter` 0/16); ca test tắt nó ở WebKit, CI `adv-browse` chạy WebKit. Safari iPhone thật chưa kiểm ([glass R7](glass-surface.md#r7-hiệu-năng-và-trình-duyệt)).
- `advertising-hero-once.e2e.mjs` FAIL (Chromium cloud 05/10, chạy riêng): ca click trước runtime giữ import
  `catalog-runtime.mjs` khi không reduced motion nên veil R7 chặn click tới hết 30s. Main sửa ca test theo R3.
- Thư viện ảnh: ảnh cần sửa, thay, chưa xác minh nguồn theo [audit](https://github.com/advertruongthinh-code/TruongThinhWebsite/blob/a3428aaff2cf1ff2f8f5a4f6804404e23ccd349b/docs/verification/advertising-images-audit-2026-09-09.md); V6
  sai tỷ lệ, COCO và decal lỗi chữ nhỏ; ảnh mới chỉ vào catalog khi owner duyệt đúng file và hash; báo cáo HTML 10–20/09
  (93 ảnh, 69 cụm, ngoài Git) chờ owner xem. Owner.
- Không chặn phát hành. Card nhiều media: runtime hỗ trợ nhưng catalog chưa có card nào; M03–M09 tạm dừng tới khi owner gửi ảnh và video gom
  theo từng sản phẩm ([media-card](media-card.md#gate-còn-mở)). Owner.

## Chú thích thuật ngữ

- **Lượt duyệt**: chuỗi thao tác dùng chung một seed; F5 hoặc mở URL trực tiếp bắt đầu lượt mới.
- **Seed**: chuỗi khởi tạo để thứ tự ngẫu nhiên lặp lại được trong lượt duyệt.
- **Pool**: tập card hợp lệ của filter đang chọn.
- **Nhịp gạch**: mép ảnh hai cột kề lặp hai mức xen kẽ như hàng gạch xây.
- **Ảo hóa**: chỉ mount card gần vùng nhìn thấy, giữ tọa độ của cả pool.
- **Handoff**: dữ liệu trao từ trang cũ sang trang mới qua `sessionStorage`.
