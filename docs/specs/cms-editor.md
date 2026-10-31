---
title: CMS editor placeholder
status: planned
source:
  - src/admin/**
  - scripts/cms/**
tests:
  - tests/admin/cms-core.test.mjs
  - tests/admin/editor.e2e.mjs
notion: https://app.notion.com/p/40a332849a0e81308d7aed22eac0a4f7
updated: 2026-10-31
---

# CMS editor placeholder

## Mục đích

Giao diện `/admin/` để nhân viên và owner sửa nội dung ngay trên bản xem trước của trang thật: mỗi chữ, ảnh, danh
sách ảnh là một placeholder đặt đúng vị trí trên trang; xem trước theo cỡ cửa sổ và thiết bị trước khi lưu. Spec sở
hữu giao diện admin, overlay biên tập và script dựng admin; Worker, API, D1, R2 ở [CMS](cms.md); nội dung và layout
từng trang thuộc spec trang đó. Ý định owner (2026-10-31): nhân viên dùng nhiều nhất, chỉ trên máy tính, lưu là lên
web, không có bước duyệt; mọi trang hiện có; News ngoài phạm vi vì site chưa có.

Trạng thái (2026-10-31): slice 1 chạy local qua `pnpm cms:dev` gồm R1 đến R5, R8, R9 và phần lưới của R6; slice 2 là
phần còn lại của R6 và R7; slice 3 là lưu D1. CMS vẫn dormant: không deploy, không có trên demo.

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
(R3); trang khác tải route thật, chỉ xem. Thanh cỡ có preset Máy tính 1440, Laptop 1280, Tablet 768, Điện thoại 390,
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
| Sản phẩm Quảng cáo | masonry, primary detail | card, `mediaItems` | slice 2 (R7) |

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
alt, lọc theo thư mục (slice 1). Slice 2: lọc "đang dùng" hay "chưa dùng"; chọn một media hiện ảnh lớn, cỡ gốc, biến
thể có sẵn, alt VI/EN sửa được (ghi vào nháp của mọi trang dùng media đó), nơi dùng (trang, section, card) dạng link mở
đúng trang và chọn đúng placeholder; kéo media thả vào placeholder ảnh hoặc danh sách trong Xem trước là đổi hoặc thêm
ảnh. Tải lên, xóa file, đổi tên: chưa có, hiện nút mờ kèm "Chờ slice lưu trữ" ([CMS gate](cms.md#gate-còn-mở)).

```gherkin
Given panel Media mở, lọc "chưa dùng"
When chọn một ảnh rồi kéo thả vào gallery #cong-trinh trong Xem trước
Then gallery có thêm figure với ảnh đó, lọc "chưa dùng" không còn ảnh đó, nơi dùng ghi "Nhà ở · gallery"
```

### R7. Card Sản phẩm Quảng cáo

Slice 2. Trang masonry và trang card `p/<id>` tải có JavaScript (runtime dựng card). Overlay hook card đã render theo
id card và cho sửa: tên VI/EN, mô tả VI/EN, cụm và sản phẩm (chọn trong taxonomy), `mediaItems` (thêm từ thư viện,
xóa, kéo sắp lại, chọn cover), alt VI/EN từng media. Sửa đổi phản chiếu lên masonry bằng cách gọi lại layout của
runtime với catalog đã vá; filter, related, skeleton giữ contract ([masonry](advertising-masonry.md),
[card nhiều media](media-card.md#r1-dữ-liệu-media-của-card)). Slice 1 các trang này chỉ xem. [CẦN LÀM RÕ: runtime
masonry chưa có API vá catalog lúc chạy; slice 2 chọn tải lại iframe với artifact vá, hoặc hook trong
`catalog-runtime.mjs`.]

```gherkin
Given đang sửa card signage-raised-letters-01 trên masonry
When xóa media cover và chọn media còn lại làm cover
Then card trên preview đổi ảnh, bản nháp ghi mediaItems mới, cover mới
```

### R8. Bản nháp, lưu và xuất

Mọi sửa đổi ghi vào nháp một trang `{ page, updatedAt, text: { key: { vi, en } }, image: { key: { src, width, height,
altVi, altEn } }, list: { listKey: [id] }, clone: { idMới: idGốc } }`, lưu `localStorage` `tt-cms-draft:<page>` sau
mỗi thao tác; nháp rỗng thì xóa khóa. Bản xem trước áp nháp lúc parse, trước runtime site, nên motion giữ nguyên. Thanh
trên ghi "Không có thay đổi" hoặc "Chưa lưu · n thay đổi". Panel Nháp liệt kê từng thay đổi (Bỏ từng mục, bỏ toàn bộ
nháp trang) và trang khác đang có nháp. Hoàn tác theo từng thao tác trong phiên, gõ liên tục cùng một ô gộp một mốc.
Lưu gửi `PUT /api/admin/content/<page>` với nháp; chưa nối lưu trữ thì Worker trả 501 (preview tĩnh trả 404) và editor
giữ nháp, hiện "Chưa nối lưu trữ, nháp vẫn ở máy này."; lỗi khác hiện "Lưu chưa được (mã n)" hoặc "(mất kết nối)". Xuất JSON tải `tt-cms-<page>.json`. Không có bước duyệt: lưu
thành công là nội dung lên web (owner 2026-10-31).

```gherkin
Given đã sửa h1 Nhà ở nhưng chưa lưu
When tải lại /admin/
Then preview Nhà ở vẫn hiện h1 mới, thanh trên ghi "Chưa lưu"; bấm Lưu khi chưa có D1 thấy "Chưa nối lưu trữ"
```

### R9. Chạy local và CI

`pnpm cms:dev` ([CMS R1](cms.md#r1-cấu-hình-worker-dormant)) chạy `prepare:site` rồi `node scripts/cms/build-admin.mjs`:
chép `src/admin/` và Dockview (`vendor/`), ghi 8 bản xem trước, `pages.json`, `media-index.json` vào
`.site-output/admin/`, rồi Worker local mở `http://127.0.0.1:8788/admin/`. `pnpm dev` và demo không dựng admin vì
`prepare:site` xóa output: route public không đổi. Bộ `fast` chạy `tests/admin/cms-core.test.mjs` (Playwright
`page.setContent`: khóa giống nhau giữa DOM thật và `DOMParser`, áp chữ, ảnh, danh sách, bản sao marquee) và
`build-admin.mjs` rồi `tests/admin/editor.e2e.mjs` trên preview tĩnh (mở `/admin/index.html` vì static server không có
index thư mục): mở Nhà ở, chọn h1, sửa VI, đổi A04s, thêm mục gallery từ Media, tải lại, Lưu.

```gherkin
Given pnpm cms:dev đang chạy
When GET /admin/, /admin/media-index.json, /admin/preview/vi/home/
Then 200; GET /vi/ không có cms-core.js
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| File | `src/admin/index.html`, `editor.css`, `editor.js` | shell editor, dock Dockview, panel (R1, R2, R4 đến R8) |
| File | `src/admin/cms-core.js` | `window.TTCms`: `LISTS`, `stamp`, `apply`, `setText`, `mirror`, `readDraft`; boot trong bản xem trước (R3, R4, R8) |
| File | `src/admin/overlay.js`, `overlay.css` | chọn, sửa tại chỗ trong iframe (R3) |
| File | `src/admin/forms.html`, `admin.js`, `admin.css` | form CRUD cũ ([CMS R8](cms.md#r8-giao-diện-admin)) |
| Script | `scripts/cms/build-admin.mjs` | dựng `.site-output/admin/` (R5, R9) |
| Data | `.site-output/admin/pages.json`, `media-index.json`, `preview/<locale>/<page>.html` | cây trang (R1), thư viện (R5), bản xem trước (R3) |
| DOM hook | `data-cms-key`, `data-cms-list`, `data-cms-item`, `data-cms-empty`, iframe `data-cms-preview` | khóa placeholder, danh sách, ô trống |
| API trong trang | `window.TTEditor` (`onSelect`, `onInlineInput`, `onPreviewReady`), `window.TTCmsOverlay` (`setText`, `select`, `setMode`) | editor và overlay gọi nhau cùng origin |
| Storage | `localStorage` `tt-cms-draft:<page>`, `tt-cms-layout`, `tt-cms-page` | nháp (R8), bố cục (R1), trang mở lần cuối |
| Thư viện | `dockview` 8.8.0 (`createDockview`, `themeLight`) | dashboard panel kéo thả (R1) |
| Endpoint | `PUT /api/admin/content/<page>` | lưu nháp; 501 tới slice 3 (R8) |

## UI

Admin không thuộc Design System ([CMS UI](cms.md#ui)): nền sáng trung tính, chữ hệ thống, viền chọn một màu nhấn
`#1a5fd0` rõ trên mọi ảnh; placeholder trống viền đỏ đứt kèm chữ nhắc. Preview giữ nguyên UI của trang public.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1, R2, R4, R5, R8 | `tests/admin/editor.e2e.mjs` |
| R3, R4, R8 | `tests/admin/cms-core.test.mjs` |
| R6, R7 | chưa có test; slice 2 |
| R9 | `node scripts/cms/build-admin.mjs`; `pnpm qa:worker:security`; output public không có admin vì `prepare:site` xóa `.site-output` |

## Gate còn mở

- Khóa tự sinh theo thứ tự nguồn: sửa HTML nguồn (thêm, bớt chữ hoặc ảnh trước một chỗ) làm lệch khóa của nháp cũ.
  Slice 3 cần `data-cms` trong HTML tĩnh hoặc kiểm khóa khi lưu ([CMS](cms.md#điều-kiện-mở-cms-phase)).
- Motion trong bản xem trước: giữ nguyên (owner duyệt plan 2026-10-31), nháp áp lúc parse; sửa chữ tại chỗ dùng
  revert/rebuild tách dòng của site.
- Hero Trang chủ, Nhà ở, Kinh doanh có danh sách slide viết sẵn trong script `<head>` để preload ảnh đầu: slice 3 lưu
  thêm hoặc xóa slide phải sinh lại danh sách đó, không thì preload ảnh đã xóa và slide mới không bao giờ đứng đầu.
- Upload ảnh từ máy, biến thể ảnh, video, lưu D1, phân quyền: ngoài phạm vi, theo [CMS gate](cms.md#gate-còn-mở).

## Chú thích thuật ngữ

- **Placeholder**: ô nội dung đặt đúng vị trí trên trang thật, nhập vào là thấy ngay.
- **Overlay**: lớp script và CSS chèn vào trang xem trước để chọn và sửa placeholder.
- **Preset cỡ**: cỡ khung xem trước định sẵn theo thiết bị.
- **Bản nháp**: thay đổi chưa lưu, giữ trong trình duyệt.
- **Bản xem trước**: bản sao HTML đã build của trang, có thêm `cms-core.js`, chỉ có trong admin.
- **Slice**: phần việc nhỏ owner mở riêng, có gate duyệt.
- **Dock**: vùng chia panel có tab, kéo thả được.
