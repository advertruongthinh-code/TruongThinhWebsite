---
title: CMS editor placeholder
status: planned
source:
  - src/admin/**
  - scripts/cms/**
tests:
  - tests/admin/cms-core.test.mjs
  - tests/admin/editor.e2e.mjs
  - tests/admin/content.test.mjs
  - tests/admin/content-api.test.mjs
  - tests/admin/content-worker.e2e.mjs
notion: https://app.notion.com/p/40a332849a0e81308d7aed22eac0a4f7
updated: 2026-11-01
---

# CMS editor placeholder

## Mục đích

Giao diện `/admin/` để nhân viên và owner sửa nội dung ngay trên bản xem trước của trang thật: mỗi chữ, ảnh, danh
sách ảnh là một placeholder đặt đúng vị trí trên trang; xem trước theo cỡ cửa sổ và thiết bị trước khi lưu. Spec sở
hữu giao diện admin, overlay biên tập, script dựng admin và đường lưu, áp nội dung editor (R8, R10); Worker, xác thực,
R2 ở [CMS](cms.md); nội dung và layout từng trang thuộc spec trang đó. Ý định owner (2026-10-31): nhân viên dùng nhiều
nhất, chỉ trên máy tính, lưu là lên web, không có bước duyệt; mọi trang hiện có; News ngoài phạm vi vì site chưa có.

Trạng thái (2026-11-01): slice 1 (R1 đến R5, R9, lưới R6), slice 2 (R6, R7) và slice 3 (lưu D1 ở R8, R10) chạy local
qua `pnpm cms:dev`. CMS vẫn dormant: không deploy, không có trên demo; mở cho nhân viên dùng thật theo Gate còn mở.

## Hành vi

### R1. Dashboard Dockview trên máy tính

`/admin/` là một trang tiếng Việt, `noindex`, chỉ bố cục từ 1024px (hẹp hơn hiện "Mở CMS trên máy tính, cửa sổ rộng từ
1024px."). Thân trang là một dock `createDockview()` của [Dockview](https://dockview.dev) (`dockview` 8.8.0, MIT, bản
JavaScript không framework, theme `themeLight`; owner chọn 2026-10-31): mỗi vùng là một panel có tab, kéo thả, tách
nhóm, đóng và mở lại từ menu "Bảng". Panel: Trang (cây trang), Xem trước, Thuộc tính (placeholder đang chọn), Media
(R6), Nháp (R8). Bố cục mặc định: Trang trái 260px, Xem trước giữa, Thuộc tính phải 360px, Media và Nháp là tab dưới
Thuộc tính. Bố cục lưu bằng `toJSON()` vào `localStorage` `tt-cms-layout` sau mỗi `onDidLayoutChange`, mở lại bằng
`fromJSON()`; mục "Bố cục mặc định" trong menu Bảng đặt lại. Thanh trên có nhóm và tên trang, trạng thái nháp (R8),
nút Hoàn tác, Xuất JSON, Bảng, Lưu. Cây trang đọc `pages.json` (R9) có ô tìm bỏ dấu: Trang (Trang chủ, Nhà ở, Kinh
doanh, Giới thiệu, 404), Sản phẩm Quảng cáo (trang gốc và 6 trang cụm), Trang sản phẩm (25), Trang card (285). Mở lại
editor thì mở trang dùng lần cuối (`tt-cms-page`), lần đầu là Trang chủ. Admin dùng `editor.css` riêng và CSS của
Dockview, không dùng token Design System và không chèn gì vào route public ([CMS UI](cms.md#ui)).

```gherkin
Given mở /admin/ trên cửa sổ 1440px lần đầu
When chưa chọn gì
Then dock có 5 panel theo bố cục mặc định, Xem trước tải Trang chủ, Thuộc tính ghi "Bấm một chỗ trên trang để sửa"
And kéo tab Media sang trái rồi tải lại trang thì Media vẫn ở bên trái
```

### R2. Xem trước theo cỡ cửa sổ và thiết bị

Khung xem trước là `iframe` cùng origin. Bốn trang sửa được tải bản xem trước `/admin/preview/<locale>/<page>.html`
(R3), trang Sản phẩm Quảng cáo (gốc, cụm, sản phẩm, card) tải `advertising.html?path=<route>` (R7), trang 404 tải
route thật, chỉ xem. Thanh cỡ có preset Máy tính 1440, Laptop 1280, Tablet 768, Điện thoại 390,
A04s 384 (máy đo chuẩn của repo) và ô bề rộng tự do 320 đến 2560. Khung lớn hơn panel thì thu nhỏ bằng `transform:
scale` (ghi cỡ và phần trăm), đổi cỡ panel không tải lại. Đổi bề rộng thì tải lại iframe: runtime site (Locomotive,
breakpoint, tách chữ) chỉ dựng đúng lúc tải trang, đổi cỡ tại chỗ khi đang cuộn có thể để trang trắng; placeholder đang
chọn được cuộn lại sau khi tải. Nút "Tiếng Việt"/"English" đổi bản xem trước theo locale; "Chế độ sửa"/"Chế độ xem"
bật tắt overlay (chế độ xem tương tác như khách: menu, kéo gallery, video; link chuyển trang bị chặn kèm thông báo vì
iframe rời bản xem trước là mất nháp và overlay); "Tải lại" đặt lại `src` về bản xem trước; "Mở tab mới" mở route thật.

```gherkin
Given đang sửa Nhà ở ở cỡ 1440
When chọn preset A04s 384
Then iframe rộng 384px và tải lại, chữ đang sửa vẫn là chữ mới chưa lưu, chữ hero xuống dòng như trên phone thật
```

### R3. Overlay nhận diện placeholder

`scripts/cms/build-admin.mjs` ghi bản xem trước từ HTML đã build (qua `localeHtml()` như static server) và thêm
`<script src="/admin/cms-core.js" data-cms-boot="<page>">` đồng bộ cuối `<body>`, chạy trước script defer và module của
site. Chỉ khi nằm trong iframe `data-cms-preview` của editor, `cms-core.js` gắn khóa, áp nháp (R8), giữ instance
Locomotive để cuộn tới chỗ đang sửa, rồi nạp `overlay.js`, `overlay.css`. Khóa gắn vào `data-cms-key` theo thứ tự nguồn
trong `<main>`: `t<n>` cho chữ, `i<n>` cho ảnh, thêm `title` và `description`; editor đọc lại bản xem trước bằng
`DOMParser` và gắn cùng hàm nên ra cùng khóa. Overlay vẽ viền khi rê chuột, viền đậm khi chọn; nhấn là chọn, nhấn đúp
vào chữ là sửa tại chỗ (`contentEditable="plaintext-only"`, Enter hoặc Esc kết thúc, phím gõ không lan ra site).
Chế độ sửa chặn link, kéo gallery và chuyển trang của site.

| Loại | Nhận diện | Sửa được |
| --- | --- | --- |
| Chữ | phần tử có `data-en` ([node lá VI/EN](detail-pages.md#r4-nội-dung-vien-và-hook)) hoặc phần tử lá có chữ; `title`, `meta[name=description]` | VI, EN, không nhận HTML |
| Ảnh | `img` (kể cả trong `picture`, `data-src` lazy) | file từ thư viện (R5), alt VI, alt EN |
| Danh sách | container trong bảng R4 | thêm, xóa, sắp lại item |

Sửa chữ gộp lại dòng đã tách (`TruongThinhDetail.revertSplitText()`), đổi chữ rồi tách lại sau 250ms. Sửa ảnh và danh
sách tải lại iframe. Bản sao `aria-hidden` của marquee không có khóa, được dựng lại từ nhóm đứng trước. Header, menu,
footer, floating CTA nằm ngoài `<main>` nên không chọn được (shell dùng chung mọi trang, có spec riêng).

```gherkin
Given iframe đã tải Giới thiệu và overlay đã chèn
When nhấn dòng "Vững niềm tin." của h1
Then dòng đó có viền chọn, Thuộc tính hiện "Tiêu đề chính · #top", ô VI "Vững niềm tin.", ô EN "Earned trust."
And rê lên logo header thì không có viền và không chọn được
```

### R4. Danh sách của từng trang

Bảng danh sách là `LISTS` trong `src/admin/cms-core.js`, một dòng một container; overlay chỉ cho thêm, xóa, sắp lại ở
các container này. Ảnh ngoài bảng (cặp ảnh `.detail-duo`, cụm portal ba mục, năm bước quy trình) chỉ đổi ảnh và chữ
([ba trang con R4](detail-pages.md#r4-nội-dung-vien-và-hook)).

| Trang | Container | Item | Nhãn |
| --- | --- | --- | --- |
| Trang chủ | `.hero-slides` | `.hero-slide` | Ảnh hero (xáo, chỉ thêm, xóa) |
| Trang chủ | `.project-track` | `.project-card` | Rail công trình |
| Trang chủ | `.client-logo-marquee__group` (bản không `aria-hidden`) | `.client-logo-slot` | Logo khách hàng |
| Nhà ở, Kinh doanh | `.hero-slides` | `.hero-slide` | Ảnh hero (xáo, chỉ thêm, xóa) |
| Nhà ở, Kinh doanh | `.detail-gallery__slides` | `.detail-gallery__item` | Gallery công trình |
| Giới thiệu | `.about-timeline` | `.about-timeline__item` | Dòng thời gian |
| Giới thiệu | `.about-commitments` | `.about-commitment` | Cam kết |
| Sản phẩm Quảng cáo | lưới masonry, trang card | card | sửa card (R7), không thêm, xóa card |

Chọn một placeholder trong danh sách thì Thuộc tính ghi "Thuộc ... · mục x/y" và nút "Mở danh sách": mỗi dòng có ảnh
nhỏ, nhãn (ưu tiên chữ trong tiêu đề của item), nút lên, xuống, xóa, kéo thả để sắp. "Thêm mục" clone item cuối với
khóa con `<khóa>@<id mới>`, chữ và ảnh trống (viền đỏ, ảnh "Chọn ảnh"), rồi mở Media để chọn ảnh nếu item có ảnh. Xóa
mục bỏ luôn sửa đổi bên trong mục đó. Hero được script module của trang xáo mỗi lần tải ([page-home R3](page-home.md#r3-hero-slideshow-và-nút-dừng)),
nên danh sách hero (`data-cms-shuffled`) không có nút sắp xếp, chỉ thêm và xóa.

```gherkin
Given đang sửa Nhà ở, chọn một ảnh trong gallery rồi bấm "Mở danh sách"
When bấm "Thêm mục" rồi chọn một ảnh trong Media
Then gallery có thêm một figure cuối với ảnh đã chọn, caption trống được viền đỏ nhắc nhập VI và EN
And kéo figure mới lên đầu thì thứ tự trong bản nháp đổi theo
```

### R5. Thư viện media

`build-admin.mjs` quét `.site-output/assets/content/**` (`.webp`, `.svg`, `.png`, `.jpg`), bỏ biến thể cỡ (`-240`,
`-480`, `-960`, `-1600`, `-2048`), ghi `.site-output/admin/media-index.json`: `src`, `width`, `height` (đọc bằng
`sharp`), `folder`, `thumb` (bản `-240.webp` nếu có), alt VI/EN khi tìm được trong catalog Advertising,
`project-reel.json` hoặc thẻ `img` của bốn trang. Bấm "Đổi ảnh" (hoặc "Thêm mục") bật chế độ chọn: panel Media hiện dải
"Bấm một ảnh bên dưới để đặt vào chỗ đang chọn"; bấm ảnh là ghi ảnh, cỡ và alt có sẵn vào nháp, tải lại preview. Áp ảnh
bỏ `<source>`, `srcset`, `sizes` (ảnh mới chưa có biến thể), ghi `data-src` nếu ảnh lazy, không thì `src`. Tải ảnh từ
máy chưa có: thư viện chỉ gồm media thật đang dùng trên demo (owner 2026-10-31).

```gherkin
Given media-index.json đã sinh
When mở Media và gõ "cnc"
Then chỉ hiện ảnh có "cnc" trong tên file hoặc alt, mỗi ảnh ghi tên file, cỡ khi rê chuột
```

### R6. Panel Media: quản lý toàn bộ media

Panel Media là trang quản lý media (owner 2026-10-31): lưới mọi media trong `media-index.json`, ô tìm theo tên file và
alt, lọc theo thư mục và theo nơi dùng (Mọi media, Đang dùng, Chưa dùng); mỗi ô ghi số chỗ dùng. Nơi dùng tính trong
editor: ảnh của bốn trang (bản gốc trừ mục đã xóa, cộng mục mới, src theo nháp hoặc bản đã lưu) và media của card (R7).
Bấm một media mở chi tiết đầu panel: ảnh lớn, cỡ gốc, thư mục, biến thể có sẵn (`variants` do `build-admin.mjs` ghi, như
`jxl`, `240 webp`), alt VI/EN với nút "Ghi alt vào n chỗ dùng (nháp)" (mỗi trang một mốc hoàn tác), nơi dùng dạng link
mở đúng trang và chọn đúng placeholder hoặc card. Kéo một ô thả vào Xem trước (`application/x-tt-media`): thả vào danh
sách R4 là thêm mục với ảnh đó, vào ảnh lẻ là đổi ảnh, vào card là thêm media. Tải lên, đổi tên, xóa file: nút mờ kèm
"cần kho media R2 thật" ([CMS gate](cms.md#gate-còn-mở)).

```gherkin
Given panel Media mở, lọc "Chưa dùng"
When chọn một ảnh rồi kéo thả vào gallery #cong-trinh trong Xem trước
Then gallery có thêm figure với ảnh đó, lọc "Đang dùng" có ảnh đó, chi tiết ghi nơi dùng "Nhà ở · Gallery công trình"
```

### R7. Card Sản phẩm Quảng cáo

Trang gốc, cụm, sản phẩm và trang card `p/<id>` dùng một bản xem trước `advertising.html?path=<route>`: script đầu
`<head>` đổi URL sang route thật (`history.replaceState`, runtime định tuyến theo path); `cms-core.js` (boot
`advertising`) gán `window.__TT_ADVERTISING_ARTIFACT__` là Promise catalog đã vá, hook có sẵn của `loadArtifact` trong
`catalog-runtime.mjs`. `patchCatalog` nạp `catalog-artifact.mjs`, `layout-core.mjs` (không nạp `catalog-detail.mjs`:
runtime gắn lười từng trường còn thiếu, card sửa nhận `related`), áp sửa đổi: `clusterIds`, `tagIds` theo sản phẩm mới,
`media` là ảnh bìa; đổi sản phẩm chính sang cụm khác thì card nhận `sourceOrder` cuối cụm mới và hạng xếp lại bằng
`scheduleAdvertisingRank`. Overlay chọn card trên lưới, gợi ý, hoặc ảnh chính của trang chi tiết; chế độ xem cho bấm
link `p/` vì runtime mở chi tiết tại chỗ. Thuộc tính sửa: tên, mô tả VI/EN (rời ô thì tải lại), sản phẩm (thêm theo cụm
của taxonomy, bỏ, đặt sản phẩm chính; cụm theo sản phẩm chính), media (thêm từ thư viện, xóa, lên xuống, ảnh bìa, alt
VI/EN), "Khôi phục card gốc". Nháp chung `advertising`: `cards: { id: { titleVi, titleEn, descriptionVi, descriptionEn,
productIds, mediaItems, coverMediaId } }`, giống gốc thì bỏ. Giữ theo build: tag khung hình, số đếm chip.

```gherkin
Given đang sửa card signage-raised-letters-01 trên masonry
When xóa media cover và chọn media còn lại làm cover
Then card trên preview đổi ảnh, bản nháp ghi mediaItems mới, cover mới
```

### R8. Bản nháp, lưu và xuất

Sửa đổi ghi vào nháp `{ page, base, anchors, text: { key: { vi, en } }, image: { key: { src, width, height, altVi, altEn
} }, list: { listKey: [id] }, clone: { idMới: idGốc }, cards }`. Bản đang sửa là nháp trên máy nếu có, không thì bản đã
lưu (`GET /api/admin/content/<page>` lúc mở editor, cache `tt-cms-saved:<page>` cho bản xem trước); `base` là
`updatedAt` bản đã lưu nó dựa vào (hoàn tác giữ `base` hiện tại), `anchors` là dấu chỗ gốc (R10) của khóa lúc bắt đầu
sửa. Nháp chỉ nằm trong `localStorage` `tt-cms-draft:<page>` khi khác bản đã lưu; mở trang mà dấu khác trang hiện tại
(trang đổi bản build) thì bỏ sửa đổi ở khóa đó và báo. GET lỗi (khác 404, 501) thì khóa Lưu trang đó. Bản xem trước áp
nháp lúc parse, trước runtime site, nên motion giữ nguyên. Thanh trên ghi "Không có thay đổi", "Đã lưu <giờ>" hoặc "Chưa
lưu · n thay đổi". Panel Nháp: thay đổi chưa lưu (Bỏ là về bản đã lưu), giờ và người lưu gần nhất, cảnh báo bản đã lưu
đổi sau lúc bắt đầu sửa và sửa đổi lệch, "Bỏ toàn bộ nháp", trang khác có nháp. Hoàn tác theo từng thao tác, gõ liên tục
một ô gộp một mốc. Lưu chặn khi còn ô trống ("Còn n ô trống": chữ thiếu VI hoặc EN, ảnh trống, card thiếu trường), rồi
gửi `PUT` `{ edits, baseUpdatedAt, anchors }`: 200 bỏ nháp; 409 (người khác vừa lưu) hỏi ghi đè; 400 hiện lỗi; 501, 404
"Chưa nối lưu trữ, nháp vẫn ở máy này."; lỗi khác "(mã n)" hoặc "(mất kết nối)". Xuất JSON tải `tt-cms-<page>.json`.
Không có bước duyệt: lưu thành công là lên web (owner 2026-10-31).

```gherkin
Given pnpm cms:dev đang chạy, đã sửa h1 Nhà ở
When bấm Lưu
Then thanh trên ghi "Đã lưu", /vi/residential/ và /en/residential/ hiện h1 mới; PUT dựa bản cũ trả 409
```

### R9. Chạy local và CI

`pnpm cms:dev` ([CMS R1](cms.md#r1-cấu-hình-worker-dormant)) chạy `prepare:site` rồi `node scripts/cms/build-admin.mjs`:
chép `src/admin/` và Dockview (`vendor/`), ghi 10 bản xem trước, `pages.json`, `media-index.json` vào
`.site-output/admin/`, rồi Worker local mở `http://127.0.0.1:8788/admin/`. `pnpm dev` và demo không dựng admin vì
`prepare:site` xóa output: route public không đổi. Bộ `fast` chạy `tests/admin/cms-core.test.mjs` (Playwright
`page.setContent`: khóa giống nhau giữa DOM thật và `DOMParser`, áp chữ, ảnh, danh sách, bản sao marquee) và
`build-admin.mjs` rồi `tests/admin/editor.e2e.mjs` trên preview tĩnh (mở `/admin/index.html` vì static server không có
index thư mục): Nhà ở (sửa h1, đổi A04s, thêm mục gallery, tải lại, Lưu), Media (lọc, kéo thả, alt), card (R7).

```gherkin
Given pnpm cms:dev đang chạy
When GET /admin/, /admin/media-index.json, /admin/preview/vi/home/
Then 200; GET /vi/ không có cms-core.js
```

### R10. Worker áp nội dung đã lưu

`0005_page_edits.sql`: bảng `page_edits` (`page` là `home`, `residential`, `commercial`, `about` hoặc `advertising`;
`edits_json`, `anchors_json`, `updated_at`, `updated_by`); áp migration trước khi deploy Worker đọc bảng. `GET
/api/admin/content/<page>` (admin, [CMS R5](cms.md#r5-xác-thực-admin)) trả `{ edits, stale, updatedAt, updatedBy }`.
`PUT` (body tối đa 512 KB, nháp 256 KB UTF-8) kiểm nháp bằng `validateEdits` của `src/worker/content.mjs` (khóa đúng
mẫu, chữ đủ VI/EN và không có mã HTML dạng `&amp;`, ảnh chỉ trong `/assets/content/`, sản phẩm card có trong taxonomy,
ảnh bìa thuộc media), ghi có điều kiện theo `baseUpdatedAt` (khác thì 409 kèm người, giờ lưu), ghi `audit_log`
`content.save` (khóa, bản trước; lỗi audit chỉ ghi log). Dấu chỗ gốc (`anchorOf` của `cms-core.js`: chữ VI gộp khoảng
trắng, đường dẫn ảnh, số mục danh sách) tính trên HTML nguồn lúc lưu; 400 khi khóa không có trên trang, dấu editor gửi
khác dấu nguồn, hoặc mục mới còn ô trống; card phải có trang tĩnh `p/<id>`.

Phục vụ bốn trang `/vi|en/`: dòng `page_edits` có sửa đổi thì Worker parse HTML nguồn bằng `linkedom`, chạy `stamp`,
`apply` của `cms-core.js`, bỏ sửa đổi có dấu không khớp nguồn hiện tại (khóa lệch, GET trả trong `stale`), xóa thuộc
tính `data-cms-*` của editor, rồi pipeline locale và SEO của [CMS R3](cms.md#r3-render-trang-locale-và-nội-dung-d1) chạy
tiếp. Chỗ editor đã sửa thắng field CMS cũ (bỏ `data-cms` ở đó; title, description thay SEO trong `pages`); title ghi
bằng HTMLRewriter (có thoát, linkedom thì không). Hero đã sửa thì bỏ script preload ở `<head>` và đánh lại `data-slide`.
Bản render giữ trong isolate theo `updated_at` và ETag nguồn, module nạp lười. Trang dưới `/vi|en/advertising-products/`
(GET, HEAD trả 200 hoặc 304) khi có card đã sửa: chèn đầu `<head>` script gán `window.__TT_ADVERTISING_ARTIFACT__` bằng
mã `patchCatalog` (JSON thoát `<`); trang `p/<id>` của card sửa còn đổi title, description, `og:image`, JSON-LD, khối
tĩnh cho bot. Trang đã áp bỏ ETag, `content-length` của file tĩnh (304 thì lấy lại bản đủ).

```gherkin
Given residential đã lưu h1 mới, sau đó HTML nguồn đổi chữ của h1 đó
When GET /vi/residential/ và GET /api/admin/content/residential
Then trang hiện h1 theo nguồn mới, không áp nhầm; API trả khóa h1 trong stale
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| File | `src/admin/index.html`, `editor.css`, `editor.js`, `dock-tools.js` | shell editor, dock Dockview, panel (R1, R2, R4 đến R8); ghim tab, mép tự ẩn, lịch sử bố cục ([CMS dock](cms-dock.md)) |
| File | `src/admin/cms-core.js` | `TTCms`: `LISTS`, `stamp`, `apply`, `setText`, `mirror`, `patchCatalog`, `readDraft`, `readSaved`; boot bản xem trước (R3, R4, R7, R8); Worker nạp cùng file (R10) |
| File | `src/worker/content.mjs`, `src/db/migrations/0005_page_edits.sql` | kiểm nháp, dấu chỗ gốc, render linkedom, script vá catalog; bảng `page_edits` (R10) |
| File | `src/admin/overlay.js`, `overlay.css` | chọn, sửa tại chỗ trong iframe (R3) |
| File | `src/admin/forms.html`, `admin.js`, `admin.css` | form CRUD cũ ([CMS R8](cms.md#r8-giao-diện-admin)) |
| Script | `scripts/cms/build-admin.mjs` | dựng `.site-output/admin/` (R5, R9) |
| Data | `.site-output/admin/pages.json`, `media-index.json` (`variants`), `preview/<locale>/<page>.html`, `advertising.html` | cây trang (R1), thư viện (R5, R6), bản xem trước (R3, R7) |
| DOM hook | `data-cms-key`, `data-cms-list`, `data-cms-item`, `data-cms-empty`, iframe `data-cms-preview` | khóa placeholder, danh sách, ô trống |
| API trong trang | `window.TTEditor` (`onSelect`, `onInlineInput`, `onPreviewReady`, `onDropMedia`), `window.TTCmsOverlay` (`setText`, `select`, `setMode`), `window.__TT_ADVERTISING_ARTIFACT__` | editor, overlay, runtime catalog gọi nhau cùng origin |
| Storage | `localStorage` `tt-cms-draft:<page>`, `tt-cms-saved:<page>`, `tt-cms-layout`, `tt-cms-page` | nháp, bản đã lưu (R8), bố cục (R1), trang mở lần cuối |
| Thư viện | `dockview` 8.8.0 (`createDockview`, `themeLight`); `linkedom` 0.18.14 (ISC) | dashboard panel (R1); DOM trong Worker (R10) |
| Endpoint | `GET`, `PUT /api/admin/content/<page>` | đọc, lưu nội dung editor; 409 xung đột; 501 khi không có D1 (R8, R10) |

## UI

Admin không thuộc Design System ([CMS UI](cms.md#ui)): nền sáng trung tính, chữ hệ thống, viền chọn một màu nhấn
`#1a5fd0` rõ trên mọi ảnh; placeholder trống viền đỏ đứt kèm chữ nhắc. Preview giữ nguyên UI của trang public.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1, R2, R4 đến R8 | `tests/admin/editor.e2e.mjs` |
| R3, R4, R8, R10 | `tests/admin/cms-core.test.mjs` (khóa, dấu linkedom trùng DOMParser trên bốn trang thật), `content.test.mjs`, `content-api.test.mjs` (API, 409, ETag với D1 giả) |
| R8, R10 | `tests/admin/content-worker.e2e.mjs` khi `pnpm cms:dev` chạy (wrangler, D1 local; không thuộc CI) |
| R9 | `node scripts/cms/build-admin.mjs`; `pnpm qa:worker:security` (GET, PUT content cần admin); output public không có admin vì `prepare:site` xóa `.site-output` |

## Gate còn mở

- Khóa tự sinh theo thứ tự nguồn: sửa HTML nguồn trước một chỗ làm lệch khóa; dấu chỗ gốc bỏ sửa đổi lệch thay vì áp
  nhầm, nhưng nó mất trên web tới khi làm lại. Bền hơn cần `data-cms` cố định ([CMS](cms.md#điều-kiện-mở-cms-phase)).
- Motion trong bản xem trước giữ nguyên (owner 2026-10-31): nháp áp lúc parse, sửa chữ tại chỗ dùng revert/rebuild.
- Hero đã sửa mất preload ảnh đầu (LCP chậm hơn); sinh lại preload cần ảnh mới có đủ biến thể.
- linkedom tốn 6 đến 21 ms mỗi lần render (Node 22, 2026-11-01), Workers Free giới hạn 10 ms CPU: chốt gói, đo CPU Worker
  trước khi mở thật. Card sửa chưa đổi `related`, tag khung hình, đếm chip, sitemap ảnh (sinh lúc build).
- Upload ảnh từ máy (cần đủ biến thể), video, phân quyền, D1 và R2 thật: ngoài phạm vi ([CMS gate](cms.md#gate-còn-mở)).

## Chú thích thuật ngữ

- **Placeholder**: ô nội dung đặt đúng vị trí trên trang thật, nhập vào là thấy ngay.
- **Overlay**: lớp script và CSS chèn vào trang xem trước để chọn và sửa placeholder.
- **Preset cỡ**: cỡ khung xem trước định sẵn theo thiết bị.
- **Bản nháp**: thay đổi chưa lưu, giữ trong trình duyệt.
- **Bản xem trước**: bản sao HTML đã build của trang, có thêm `cms-core.js`, chỉ có trong admin.
- **Slice**: phần việc nhỏ owner mở riêng, có gate duyệt.
- **Bản đã lưu**: nội dung editor trong D1, Worker áp khi phục vụ trang.
- **Khóa lệch**: khóa placeholder trỏ sai chỗ vì HTML nguồn đổi sau lúc lưu.
- **Isolate**: một phiên chạy của Worker giữ bộ nhớ giữa các request.
- **Dock**: vùng chia panel có tab, kéo thả được.
