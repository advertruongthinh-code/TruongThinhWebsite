---
title: Masonry Advertising
status: live
source:
  - src/site/advertising-products/index.html
  - src/site/advertising-products/catalog.mjs
  - src/site/masonry/runtime.mjs
  - src/site/masonry/layout.mjs
  - src/site/masonry/layout-worker.mjs
  - src/site/masonry/random-order.mjs
  - src/site/masonry/packer.mjs
  - src/site/masonry/replay.mjs
  - scripts/site/layout-cache-preload.mjs
  - src/site/advertising-products/media-contract.mjs
  - src/site/advertising-products/media-manifest.mjs
  - src/site/advertising-products/photo-tags.mjs
tests:
  - tests/site/advertising-products-layout.test.mjs
  - tests/site/advertising-products-lifecycle.test.mjs
  - tests/site/advertising-fast-fling.e2e.mjs
  - tests/site/advertising-detached-cards.e2e.mjs
  - tests/site/advertising-products-media.test.mjs
  - tests/site/advertising-products-random-order.test.mjs
  - tests/site/advertising-products-static.test.mjs
  - tests/site/advertising-one-column.test.mjs
  - tests/site/advertising-random-browse.e2e.mjs
  - tests/site/advertising-hero-once.e2e.mjs
  - tests/site/advertising-no-titles.e2e.mjs
  - tests/site/advertising-card-interactions.e2e.mjs
  - tests/site/advertising-route-footer-p75.e2e.mjs
  - tests/site/advertising-resize-card-width.e2e.mjs
  - tests/site/site.e2e.cjs
notion: https://app.notion.com/p/3e6332849a0e81508d66ca0b3cfebf18
updated: 2026-11-10
---

# Masonry Advertising

## Mục đích

Trang `/vi/advertising-products/` và `/en/advertising-products/` cho khách quét toàn bộ ảnh sản phẩm quảng cáo theo
sáu cụm, trong một masonry so le có thứ tự ngẫu nhiên theo lượt duyệt. Spec này sở hữu trang, catalog, filter, thứ tự, hình học, ảo hóa và card. Batch skeleton cuối masonry ở [skeleton](advertising-skeleton.md); detail (trang card `p/<id>`) ở
[detail](advertising-detail.md); header, menu, footer, veil ở [shell](site-shell.md). Phần chung với related và trang Công trình (sân, reveal, item) ở [masonry dùng chung](masonry.md).

## Hành vi

### R1. Trang và cấu trúc

Runtime cũng chạy trang Công trình ([projects R2](projects.md#r2-trang-toàn-bộ-công-trình)) với mount `artifact`, `viewer: false`. `src/site/advertising-products/index.html` là bản VI; bản EN sinh lúc build
([phát hành tĩnh R5](static-release.md#r5-văn-bản-song-ngữ-và-route-locale)). Head, veil, header, menu, footer thuộc
shell ([R7](site-shell.md#r7-veil-khi-tải-trực-tiếp-fallback-và-bfcache), [R10](site-shell.md#r10-floating-cta-và-footer)).
Title "Sản phẩm Quảng cáo — Trường Thịnh" / "Advertising products — Trường Thịnh"; mục Advertising trên navbar có
`aria-current="page"`. `body.detail-page[data-detail-hero-profile="words-06"]`, container
`data-barba-namespace="advertising-products"`. `main#noi-dung` gồm: hero `.detail-index-hero#top` (kicker "Sản phẩm tiêu biểu" / "Our featured products",
`h1` hai dòng "để thương hiệu / luôn trong tầm mắt" / "Keep your brand / always in sight", dòng 2 đậm 700 nghiêng ([chữ hero R1](hero-typography.md#r1-xuống-dòng-theo-chốt-của-owner)), rail filter
R3, scroll cue cách đáy như [Hero](../../design-system/components/Hero/README.md); trên 1024px dòng 2 neo mép phải
khung); `section.project-index#du-an` chứa `[data-project-grid]`, khung batch
`[data-masonry-cta-skeleton]` và CTA `section.detail-cta[data-masonry-grid-cta]` ("Dấu ấn tiếp theo / dành cho
thương hiệu của bạn", link Zalo "Trao đổi ý tưởng"); `section[data-detail-view][hidden]` là detail. Khi
duyệt masonry (không có `photo`), `body` có `is-masonry-browse`: floating CTA ẩn, footer không có khoảng phía trên.

```gherkin
Given /en/advertising-products/ tải trực tiếp
When trang dựng xong
Then title là "Advertising products — Trường Thịnh", h1 là "Keep your brand / always in sight"
And body có is-masonry-browse, floating CTA không hiện
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

Rail `.project-filters` (`role="group"`) có bảy link `[data-masonry-filter]`: `all` ("Tất cả" / "All", về URL gốc)
rồi sáu cụm theo thứ tự `taxonomy.mjs` (build sinh vào HTML, `href` là trang cụm theo slug locale); mục đang chọn có `aria-current="true"`. Cụm lấy card có ít nhất một sản phẩm
thuộc cụm, xếp theo hạng ([taxonomy R1](advertising-taxonomy.md#r1-ba-tầng-phân-loại)). `?category=` nhận id cụm, slug VI/EN, slug nhóm cũ (cùng kết quả) hoặc id sản phẩm (mọi card gắn sản phẩm đó); runtime ghi slug cụm theo locale; lạ thì về All. Không có `?category=` thì filter theo path trang cụm, sản phẩm ([taxonomy R4](advertising-taxonomy.md#r4-url-và-trang-index)); đổi filter ghi path trang của filter đó theo slug locale (đổi `document.title` và kicker), sản phẩm chưa có trang ghi path trang cụm kèm `?category=` ([taxonomy R5](advertising-taxonomy.md#r5-ngưỡng-10-card)).
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

Mỗi lượt duyệt có một seed (`createBrowseSeed`). Lưới chính: seed chọn một trong 8 tới 32 biến thể tính sẵn của filter (`variantIndex(seed, số biến thể)`, R6), cùng seed và filter cho cùng biến thể ở mọi dải bề rộng, nên về lại một filter trong cùng lượt cho lại đúng thứ tự cũ; build xếp hạng biến thể ưu tiên 12 card đầu có cả ảnh cao (h/w
`>= 1.15`) và thấp (`<= 0.9`). Không có cache (R6): pool xáo Fisher-Yates bằng seed với scope `grid:<filter>` rồi xếp ổn định theo hạng (`filterRank`, taxonomy R1). Related giữ solver organic: 12 card đầu có cả hai loại, không
quá 4 ảnh cùng loại liền nhau; không cải thiện được thì giữ thứ tự seed và ghi lý do. Seed mới khi F5, mở URL trực tiếp,
vào trang bằng link hoặc route mềm mới. Seed giữ khi đổi filter, mở và đóng detail, Back/Forward (seed nằm trong history
state, kể cả khi Back lúc route mềm đang chạy làm trình duyệt tải hẳn trang), đổi ngôn ngữ (tải lại trang như F5, dùng handoff
`sessionStorage` một lần, hết hạn sau 30s, chỉ nhận khi `navigate` đúng URL đích).

```gherkin
Given lượt duyệt đang ở "In nhanh & decal"
When mở một card, Back, chuyển EN rồi F5
Then trước F5 thứ tự card không đổi; sau F5 seed mới, pool giữ đúng nhóm và đủ card
```

### R5. Hình học masonry

Bề rộng tính từ `documentElement.clientWidth` (không gồm thanh cuộn). Lề ngoài 15/25/35px khi viewport `<= 750`,
`<= 1200`, lớn hơn; khoảng giữa card 15/25/35px khi `<= 960`, `<= 1200`, lớn hơn. Masonry rộng bằng viewport trừ hai lề, không có bề rộng tối đa. Số cột `C = min(4, max(2, floor((W + G) / (220 + G))))` với `W` bề rộng masonry, `G` khoảng giữa.
Card rộng một cột (trừ card hai cột dưới), cao bằng ảnh theo tỷ lệ gốc, mọi UI của card (tên, chấm hoặc bộ đếm) nằm trong ảnh nên card cao đúng bằng ảnh ở mọi masonry ([media-card R2](media-card.md#r2-canvas-và-hàng-pill-trong-media)). Không spacer, không giãn khoảng giữa, không crop để giả so le; chỉ cắt khép mép dưới card hai cột như đoạn sau.
Card hai cột (owner 2026-11-09, chỉ lưới chính trang Quảng cáo và Công trình): ảnh bìa (`layoutMedia`) ngang có `w/h >= 1.618` (`isWideMedia`: `w × 1000 >= h × 1618`, không phép chia nên không lệch do làm tròn) rộng hai cột cộng một khoảng giữa khi `C >= 3`; `C = 2` (điện thoại), ảnh dưới tỷ lệ vàng, khối gợi ý và mọi card của related masonry luôn một cột, `layoutSpan` cũ không có tác dụng.
Lưới chính trang Quảng cáo và Công trình (owner 2026-11-10, `masonry-grid-v17`): card đặt theo bố cục tính sẵn (R6), giữa lưới không có khoảng trống nào ngoài khoảng giữa; mọi ảnh bìa từ tỷ lệ vàng rộng hai cột khi `C >= 3`. Phần chênh dưới card hai cột khép bằng cách cắt tối đa 3 card một cột cuối của cột dài hơn, mỗi card thấp đi cùng tỷ lệ (cắt đều trên dưới, `mediaBleed`), không quá `5%` media, chỉ thấp đi; không xếp được thì đổi chỗ vài card gần, rồi cắt, rồi riêng card đó về một cột. Bố cục lưu theo 5 dải (`LAYOUT_BANDS`: `2:15`, `3:15`, `3:25`, `4:25`, `4:35` là số cột và khoảng giữa); một bố cục đúng cho cả dải vì đáy cột bậc nhất theo bề rộng card, build kiểm ở hai đầu dải. Card bị cắt: khung media thấp đi đúng phần cắt, ảnh và video phủ khung (`object-fit: cover`, cắt đều trên dưới), mọi media của card nhiều media cắt cùng mức; hàng pill và tên card nằm trong khung đã cắt, card tạm và blur lúc tải dùng đúng khung đã cắt (`mediaBleed` trên placement). Related masonry (owner 2026-11-10, O5) dùng bộ tìm kiếm (`compileMasonryLayout`): mọi card một cột, đúng tỷ lệ gốc, không cắt, theo thứ tự vào cột thấp nhất (hòa thì cột trái), không lỗ; `layout.holes` luôn rỗng. Phase CMS: giao diện upload media cho card có bleeding indicator báo mức card có thể bị cắt tối đa (`min(0.25 × khoảng giữa, 5%)` chiều cao media ở từng bề rộng).

```gherkin
Given viewport 768px, masonry đang ở All
When đo card
Then có 3 cột, lề 25px, khoảng giữa 15px; card ảnh bìa từ tỷ lệ vàng rộng hai cột trên hai cột bằng đáy, card khác rộng một cột
And giữa lưới không có khoảng trống nào ngoài khoảng giữa, card bị cắt khép mép thấp đi không quá 5% media
And ở 390px (2 cột) mọi card rộng một cột
```

### R6. Đặt card và chuyển vị trí

Lưới chính: build (`buildLayoutCache`, `packer.mjs`) thử 128 thứ tự gốc mỗi filter (seed `layout:<datasetVersion>`), xếp trên 5 dải, giữ 8 tới 32 biến thể ít card hai cột bị hạ và ít mép dưới thẳng hàng nhất (so le là điểm chấm, không phải luật cứng); card một cột không vượt hạng, card hai cột được lệch qua ranh giới hạng. Máy người xem chỉ đặt lại (`replayLayout`, một vòng O(n), không tìm kiếm, không Worker). Cache lệch chữ ký pool (`poolSignature`), tải lỗi hoặc quá 4s: cả lưới một cột theo thứ tự seed, vào cột thấp nhất (`stackLayout`, không lỗ), console ghi `[masonry] layout cache miss` một lần mỗi filter và dải (chỉ khi artifact khai báo cache; artifact không khai báo cache dùng `stackLayout` im lặng; cache đang tải chỉ `console.debug`). Bấm filter hoặc kéo sang dải khác khi cache chưa về: giữ bố cục cũ tới khi cache về rồi đặt card một lần, chip vừa bấm mang `aria-busy="true"` (hiện như `aria-current`) trong lúc chờ; bấm lại filter đang chọn, Back/Forward hay mở card huỷ lượt bấm đang chờ. Lưới đã vẽ `stackLayout` vì thiếu cache (file về sau 4s, Back/Forward lúc file chưa về) đặt lại một lần khi file về (file về lúc đang mở card thì lưới ẩn chưa đo, đo khi đóng card). File cache sai `version` coi như lỗi.
Related: card đi theo thứ tự R4; mỗi card vào cột có đáy thấp nhất (hòa thì cột trái), top bằng đáy cột cộng khoảng
giữa, card đầu mỗi cột ở top 0; card hai cột phủ thêm cột kề theo R5. Pha ưu tiên đòi: mép dưới ảnh gần nhất ở hai cột kề lệch ít nhất 10% chiều cao ảnh cao
hơn; mép ảnh và mép card không lặp nhịp gạch (lượng tử lệch theo `0.125 × bề rộng card`, cấm `ABABAB` và ba mức giống
nhau liền nhau). Hết nửa ngân sách 300.000 phép thử thì pha dự phòng cho phép thẳng hàng, không bao giờ chồng card.
Cùng dataset, filter, bề rộng và thứ tự cho cùng tọa độ (`coordinateHash`). Lỗi đầu vào (`invalid-input`) hoặc hết
ngân sách ở cả hai pha (`search-exhausted`) làm masonry báo `data-masonry-layout-status="failed"`; pool không đủ
nhóm tỷ lệ chỉ ghi chẩn đoán `needs-media`. Đổi filter hoặc bề rộng: card bị loại ẩn ngay, card còn lại và card mới đi
từ vị trí cũ tới vị trí mới bằng `masonry-layout` ([motion](../../design-system/motion.md#vị-trí-card-masonry)); lần
dựng đầu card đi từ đầu cột. Card và khung skeleton ([R1](advertising-skeleton.md#r1-batch-nối-tiếp-masonry)) trượt,
co giãn từ chỗ, cỡ cũ; card ẩn giữa lúc trượt khi lộ lại lấy bề rộng cột mới; CTA, Kính trượt cùng nhịp `0.4s ease`: cả trang là một masonry (owner 10/10); đang kéo cạnh cửa sổ thì đặt thẳng. Chỉ đổi chiều cao cửa sổ thì không đặt lại card. Cuộn trong lúc chuyển vị trí được gộp
thành một lần cập nhật khi chuyển xong. `site:layout` chỉ phát khi chiều cao trang đổi
([scroll-feel R1](scroll-feel.md#r1-một-chuẩn-cuộn-cho-mọi-trang)); thay card theo cửa sổ ảo mà giữ chiều cao thì không phát.

```gherkin
Given masonry 4 cột ở 1440px
When bấm "LED, màn hình & hộp đèn" rồi đổi cửa sổ còn 1000px trong lúc card đang trượt
Then filter mới thắng, không còn card ở tọa độ cũ, không có hai card chồng nhau
```

### R7. Ảo hóa và bàn phím

Masonry có `role="list"`; mỗi card `role="listitem"` với `aria-posinset`, `aria-setsize` theo toàn pool. Chỉ card giao vùng nhìn thấy cộng một chiều cao vùng nhìn thấy mỗi phía được dựng, cộng card đang giữ focus và card vừa mở detail; card đã dựng chỉ bị gỡ khi ra xa hơn hai chiều cao vùng nhìn thấy (vùng trễ, nên vuốt qua lại không dựng lại liên tục). Motion layout dựng và gỡ theo vùng dựng. Tổng chiều cao, tọa độ và metadata giữ cho cả pool; áp cho masonry chính và related, hai instance của cùng một [sân masonry](masonry.md#r4-sân-masonry). Tab hoặc Shift+Tab sang card chưa mount thì mount card đó theo thứ tự rồi chuyển focus. Mount, gỡ card khi cuộn không làm Locomotive tính lại ([cảm giác cuộn R1](scroll-feel.md#r1-một-chuẩn-cuộn-cho-mọi-trang)). Đóng menu trả focus về card đang theo dõi. Vào thẳng detail thì masonry ẩn từ trước Layout đầu (`body.is-detail` do script đầu `<body>` gắn) và chưa tính tọa độ; về masonry mới tính. Card dựng theo ngân sách frame, card chưa tới lượt có card tạm màu chủ đạo ([loading glass R10](loading-glass-and-page-entry.md#r10-card-tạm-khi-vuốt-nhanh)). Card vừa gỡ mà ảnh đã hiện vào hàng chờ LRU theo RAM máy (`navigator.deviceMemory`: tới 2 GB 8 card, 4 GB 24, từ 8 GB 48; thiếu thì coi như 4), quay lại cửa sổ thì gắn lại đúng node ([loading glass R3](loading-glass-and-page-entry.md#r3-ảnh-có-sẵn)); đổi filter, tag, ngôn ngữ, layout hoặc đóng masonry thì bỏ cả hàng chờ.

```gherkin
Given masonry All 285 card (tính từ catalog), đang ở đầu trang
When nhấn Tab liên tục qua từng card
Then focus đi theo aria-posinset tăng dần, không nhảy qua card chưa mount
```

### R8. Card và ảnh trong card

Card là `figure.masonry-card[data-masonry-card]` chứa một link tới trang card `p/<id>/` ([media-seo](media-seo.md#r1-mỗi-card-có-trang-riêng)); không caption chiếm chỗ: tên card
(`figcaption.masonry-card__title`, `aria-hidden`) nằm trên trái trong ảnh, chuột thật hiện khi hover, cảm ứng không hiện ([media-card R3](media-card.md#r3-đổi-media-trên-card)), alt theo ngôn ngữ. Ảnh dùng LazySizes (`data-src`, `data-srcset` từ biến thể của
[tải ảnh](media-delivery.md#r3-runtime-advertising-chọn-biến-thể), `data-sizes` ghi bằng bề rộng card từ solver, không `auto` để khỏi đo từng ảnh). Card vào vùng nhìn
thấy khi ảnh chưa giải mã thì ảnh hiện mờ trên nền màu chủ đạo, ảnh về thì nét lại trong `0.6s`; ảnh đã có (cache, tải trước,
vào lại sau `intersectionRatio = 0`) thì hiện ngay, không motion ([loading glass R1–R3](loading-glass-and-page-entry.md)). Hover chuột và focus bàn phím không zoom ảnh; hover chuột hiện lớp tối Pinterest và tên card cùng lúc, làm mờ "Vừa xem" ([media-card R3](media-card.md#r3-đổi-media-trên-card)),
focus có viền; card nhiều media có mũi tên khi hover ([media-card R3](media-card.md#r3-đổi-media-trên-card)). Click chính mở detail tại chỗ (history push,
[detail](advertising-detail.md#r1-url-và-vào-detail)); đóng detail đánh dấu "Vừa xem" / "Just viewed" trên card vừa xem (lớp đen `0.7` phủ canvas, owner 2026-10-26).

```gherkin
Given card đã hiện ảnh
When cuộn tới khi card ra hẳn khỏi viewport rồi cuộn lại
Then ảnh hiện ngay, không mờ, không Kính; khung card không đổi kích thước
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
5.3.2 (bắt buộc), mỗi file chờ tối đa 4s, script có sẵn mà lỗi thì nạp lại một lần, rồi import `masonry/runtime.mjs`.
Runtime kiểm artifact (`layoutAlgorithmVersion` bằng `masonry-grid-v17`, nhóm không rỗng, card hợp lệ), cần Masonry.
Tải trực tiếp mà lỗi: masonry bị dọn và ẩn, container có `data-masonry-fallback="failed"`, html có
`motion-fallback`; nếu khách đã bấm filter thì tải hẳn URL filter đó. Route mềm mà lỗi: tải hẳn URL đích. Không
JavaScript: `<noscript>` hiện sáu card nhóm dẫn tới sáu URL cũ; có JavaScript thì `<noscript>` không bao giờ hiện thành
chữ thô (CSS chỉ áp trong `@media (scripting: none)`).

```gherkin
Given Masonry 4.2.2 không tải được khi vào thẳng /vi/advertising-products/
When hết thời gian chờ
Then masonry ẩn, container có data-masonry-fallback="failed", không còn markup thô
```

### R11. Cuối masonry

Dưới card thật cuối là batch skeleton ([skeleton R1](advertising-skeleton.md#r1-batch-nối-tiếp-masonry)), CTA và
[Kính](glass-surface.md) dạng cung; chữ CTA, parallax, footer theo [CTA giữa viewport](advertising-cta-center-parallax.md).
Masonry chỉ cung cấp đáy từng cột, bề rộng card, khoảng giữa, hash tọa độ; mở detail chuyển batch sang cuối related ([CTA R9](advertising-cta-center-parallax.md#r9-cta-cuối-related-ở-detail)), đóng thì dựng lại ở grid.
Renderer Flow mount cả khi đang cuộn, trừ loại máy bị hoãn theo [skeleton R5](advertising-skeleton.md#r5-webgl-context).

```gherkin
Given masonry đã dựng ở bất kỳ filter nào
When đọc chiều cao [data-project-grid]
Then bằng đáy CTA, batch bắt đầu một khoảng giữa dưới card thật mỗi cột
```

### R12. Reduced motion

`prefers-reduced-motion: reduce`: card đặt thẳng vào tọa độ mới, ảnh chờ tải mờ rồi nét ngay khi
tải xong, hero hiện trạng thái cuối. Bật giữa chừng thì áp dụng ở lần cập nhật kế tiếp.

```gherkin
Given prefers-reduced-motion: reduce
When đổi filter
Then card ở tọa độ mới ngay khung hình kế tiếp, không có transition
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| DOM hook | `[data-project-grid]`, `[data-masonry-card]`, `[data-masonry-filter]`, `body.is-masonry-browse` | Masonry, card, filter, chế độ duyệt (R1, R3, R7, R8); test đọc |
| DOM hook | `data-masonry-layout-status`, `-layout-error`, `-layout-diagnostic` trên masonry; `data-masonry-fallback="failed"` trên container | Kết quả compile (R6); lỗi mount (R10) |
| Data | `ADVERTISING_CATEGORIES`, `ADVERTISING_CARDS`, `ADVERTISING_DATASET_VERSION` (`catalog.mjs`) | Catalog (R2) |
| Data | `.site-output/advertising-products/catalog-artifact.mjs` (`ADVERTISING_CATALOG_ARTIFACT`) | Build sinh, runtime import; card ở output không kèm `descriptionVi/En` và `related`: hai trường này nằm ở `catalog-detail.mjs` (theo id), tải ngay khi ảnh 8 card đầu xong, tối đa 6 s (vào thẳng URL photo: `detail.js` tải cùng artifact) và `showPhoto` chờ nếu chưa xong; test, CMS có thể đặt `window.__TT_ADVERTISING_ARTIFACT__` (đủ trường thì bỏ qua file detail; thiếu thì gắn từng trường còn thiếu, card CMS đã sửa giữ mô tả mới). Artifact mang `layoutCacheFilterUrl`, `layoutCacheBandUrl` tới cache bố cục (R6): `layout-cache/<dải>/<filter>.mjs` tải trước card đầu: script inline trong `<head>` mỗi trang lưới (build sinh, ngưỡng dải lấy từ `LAYOUT_BANDS`; trang card `/p/` và trang Công trình không có) chèn `modulepreload` ngay khi trình duyệt đọc head, `preloadMasonry` dùng chung lượt import đó, `layout-cache/<dải>.mjs` (mọi filter của dải) tải cùng lúc file detail; trang Công trình nhúng `layouts` trong artifact |
| Hàm public | `compileMasonryLayout`, `columnsForWidth`, `masonrySpacing`, `getVirtualWindow`, `isWideMedia` (`masonry/layout.mjs`); `createBrowseSeed`, `shuffleWithSeed` (`masonry/random-order.mjs`) | Hình học thuần, không đọc DOM (R5–R7); `buildLayoutCache`, `LAYOUT_BANDS` (`masonry/packer.mjs`, chỉ build gọi, trang public không tải) và `replayLayout`, `stackLayout`, `bandKey`, `poolSignature` (`masonry/replay.mjs`) cho lưới chính; solver related khi mở detail chạy trong Worker `masonry/layout-worker.mjs` (mở lúc tải trước detail, trang card mở lúc preload; mỗi lần dùng mở sẵn Worker kế tiếp, mở detail không chờ tải lại module; trang Công trình không mở), lỗi thì compile đồng bộ ([phone Android](../decisions/phone-frame-budget.md)); seed và xáo (R4) |
| Hàm public | `mountMasonry(container, {signal, scroll, softNavigation, artifact, viewer})` | `detail.js` gọi; trả cleanup |
| Hàm public | `window.TruongThinhMasonry`: `mount`, `unmount`, `getAdapter`, `navigateQuery`, `handlePopState`, `canHandlePopState`, `getBrowseState`, `getCurrentHref`, `navigatePhoto`, `replaceTag`, `captureDetail` | `motion.js` gọi cho navbar, popstate (R3) |
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
| R5 | `advertising-products-layout.test.mjs` (cột, lề, khoảng giữa mọi filter ở 320–2560px; biên 1.618, solver related một cột, card tạm hai cột); `advertising-one-column.test.mjs` (dựng lại luật một cột của solver và related); `advertising-skeleton-flow.test.mjs` (batch dưới card hai cột); `advertising-products-static.test.mjs` (CSS) |
| R6 | `advertising-one-column.test.mjs` (so le 10%, dự phòng); `advertising-products-layout.test.mjs` (hash, nhịp gạch, organic); `node tests/site/advertising-solver-report.mjs`; `TT_E2E_ADVERTISING_GRID_ONLY`; `advertising-layout-cache-pending.e2e.mjs` (bấm filter khi cache đang tải: chờ rồi đặt một lần; bấm lại filter đang chọn, mở card huỷ lượt chờ); `advertising-layout-cache-preload.e2e.mjs`, `advertising-products-static.test.mjs` (preload từ head: một request, trước khi `detail.js` xong; script khớp `bandKey`); `masonry-layout-cache.e2e.mjs` (`verifyLayout` trên hình học DOM ở 384–1920px, card ngang, thứ tự file cache, chặn cache, resize, chip chờ, cache về lúc mở card); `masonry-packer.test.mjs` (so le), `layout-cache-memo.test.mjs` |
| R7 | `advertising-products-layout.test.mjs` (`getVirtualWindow`, 3.000 card); `TT_E2E_ADVERTISING_KEYBOARD_ONLY`, `_3K_ONLY` |
| R8 | `advertising-card-interactions.e2e.mjs`; `advertising-no-titles.e2e.mjs`; `TT_E2E_ADVERTISING_MEDIA_ENTRANCE_ONLY` |
| R9 | `advertising-hero-once.e2e.mjs`; `TT_E2E_ADVERTISING_HERO_ONLY` |
| R10 | `advertising-products-lifecycle.test.mjs` (phụ thuộc tùy chọn, bắt buộc); `TT_E2E_ADVERTISING_DIRECT_FAILURE_ONLY` |
| R11 | `advertising-route-footer-p75.e2e.mjs`; xem [skeleton](advertising-skeleton.md#kiểm-tra) |
| R12 | `advertising-card-interactions.e2e.mjs` (ca giảm chuyển động); chưa có test reduced motion cho đổi filter |

## Gate còn mở

- Owner xem masonry trên demo: thứ tự ngẫu nhiên, nhịp cao thấp, so le, filter, card hai cột ở lưới chính; VI/EN, desktop và điện thoại. Owner.
- WebKit headless Linux vẽ `backdrop-filter` của Kính bằng phần mềm nên rAF dừng sau Back; `advertising-random-browse.e2e.mjs`
  tắt nó ở WebKit, CI `adv-browse` chạy WebKit. Safari iPhone thật chưa kiểm ([glass R7](glass-surface.md#r7-hiệu-năng-và-trình-duyệt)).
- Thư viện ảnh: V6 sai tỷ lệ, COCO và decal lỗi chữ nhỏ; ảnh mới chỉ vào catalog khi owner duyệt đúng file và hash ([QA ảnh](../operations/agent-rule-ad-images.md)). Owner.
- Không chặn phát hành. Card nhiều media: runtime hỗ trợ nhưng catalog chưa có card nào; M03–M09 tạm dừng tới khi owner gửi ảnh và video gom
  theo từng sản phẩm ([media-card](media-card.md#gate-còn-mở)). Owner.

## Chú thích thuật ngữ

- **Lượt duyệt**: chuỗi thao tác dùng chung một seed; F5 hoặc mở URL trực tiếp bắt đầu lượt mới.
- **Seed**: chuỗi khởi tạo để thứ tự ngẫu nhiên lặp lại được trong lượt duyệt.
- **Pool**: tập card hợp lệ của filter đang chọn.
- **Nhịp gạch**: mép ảnh hai cột kề lặp hai mức xen kẽ như hàng gạch xây.
- **Ảo hóa**: chỉ mount card gần vùng nhìn thấy, giữ tọa độ của cả pool.
- **Handoff**: dữ liệu trao từ trang cũ sang trang mới qua `sessionStorage`.
