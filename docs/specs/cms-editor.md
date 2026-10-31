---
title: CMS editor placeholder
status: planned
source:
  - src/admin/**
  - scripts/cms/**
tests:
  - tests/admin/editor-overlay.test.mjs
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

## Hành vi

### R1. Dashboard Dockview trên máy tính

`/admin/` là một trang tiếng Việt, `noindex`, chỉ bố cục từ 1024px (hẹp hơn hiện thông báo "Mở trên máy tính"). Thân
trang là một dock `createDockview()` của [Dockview](https://dockview.dev) (`dockview` 8.8.0, MIT, bản JavaScript không
framework, theme `themeLight`; owner chọn 2026-10-31): mỗi vùng là một panel có tab, kéo thả, tách nhóm, thả nổi
(`floating`), đóng và mở lại từ menu "Bảng". Panel mặc định: Trang (cây trang), Xem trước, Thuộc tính (placeholder đang
chọn), Media (R6), Nháp (danh sách thay đổi chưa lưu, hoàn tác). Bố cục mặc định: Trang trái, Xem trước giữa, Thuộc
tính phải, Media và Nháp là tab dưới Thuộc tính. Bố cục lưu bằng `api.toJSON()` vào `localStorage` `tt-cms-layout` sau
mỗi `onDidLayoutChange`, mở lại bằng `fromJSON()`; nút "Bố cục mặc định" đặt lại. Thanh trên có tên trang, trạng thái
"Đã lưu" hoặc "Chưa lưu", nút Lưu, Hoàn tác, Xuất JSON. Cây trang liệt kê mọi route hiện có từ `ROUTES` của build:
Trang chủ, Nhà ở, Kinh doanh, Giới thiệu, Sản phẩm Quảng cáo (gồm 6 trang cụm, 25 trang sản phẩm, 285 trang card có ô
tìm theo tên hoặc id), 404. Admin dùng `admin.css` riêng và CSS của Dockview, không dùng token Design System và không
chèn gì vào route public ([CMS UI](cms.md#ui)).

```gherkin
Given mở /admin/ trên cửa sổ 1440px lần đầu
When chưa chọn gì
Then dock có 5 panel theo bố cục mặc định, Xem trước đang tải /vi/, Thuộc tính ghi "Chọn một chỗ trên trang để sửa"
And kéo tab Media sang trái rồi tải lại trang thì Media vẫn ở bên trái
```

### R2. Xem trước theo cỡ cửa sổ và thiết bị

Khung xem trước là `iframe` cùng origin, tải đúng route của trang đang chọn. Thanh cỡ có preset Máy tính 1440, Laptop
1280, Tablet 768, Điện thoại 390, A04s 384 (máy đo chuẩn của repo) và ô nhập cỡ tự do 320 đến 2560; đổi cỡ chỉ đổi
`width` của iframe, không tải lại trang, nội dung đang sửa giữ nguyên. Nút VI/EN tải route locale tương ứng và giữ
placeholder đang chọn. Nút "Mở tab mới" mở route thật không overlay.

```gherkin
Given đang sửa Nhà ở ở cỡ 1440
When chọn preset A04s 384
Then iframe rộng 384px, chữ đang sửa vẫn là chữ mới chưa lưu, chữ hero xuống dòng như trên phone thật
```

### R3. Overlay nhận diện placeholder

Sau khi iframe tải, editor chèn `overlay.js` và `overlay.css` vào document của iframe (cùng origin). Overlay nhận diện
ba loại placeholder theo bảng dưới và vẽ viền khi rê chuột, viền đậm khi chọn; nhấn chọn, nhấn đúp vào chữ để sửa tại
chỗ. Khóa placeholder là `data-cms` nếu có ([CMS R3](cms.md#r3-render-trang-locale-và-nội-dung-d1)), không có thì
sinh `<id section gần nhất>/<tag>:<thứ tự trong section>` và gắn lại vào `data-cms-key` để bảng thuộc tính và bản nháp
dùng chung.

| Loại | Nhận diện | Sửa được |
| --- | --- | --- |
| Chữ | phần tử lá có `data-en` ([node lá VI/EN](detail-pages.md#r4-nội-dung-vien-và-hook)); `title`, `meta[name=description]` | VI (text), EN (`data-en`), không nhận HTML |
| Ảnh | `img` (kể cả trong `picture`, `data-src` lazy) | file từ thư viện (R5), alt VI, alt EN; giữ `width`, `height` |
| Danh sách | container trong bảng danh sách của trang (R4) | thêm, xóa, kéo sắp lại item; item mới clone item cuối với chữ và ảnh trống |

Overlay không sửa phần tử của shell (header, menu, footer, floating CTA): các vùng này mờ đi và không chọn được, vì
shell dùng chung mọi trang và có spec riêng.

```gherkin
Given iframe đã tải /vi/about/ và overlay đã chèn
When rê chuột lên h1 rồi nhấn
Then h1 có viền chọn, bảng thuộc tính hiện hai ô VI "Vững nghề. Vững niềm tin." và EN từ data-en
And rê lên logo header thì không có viền và không chọn được
```

### R4. Danh sách ảnh của từng trang

Bảng danh sách nằm trong `src/admin/page-schema.mjs`, một dòng một container; overlay chỉ cho thêm, xóa, sắp lại ở các
container này.

| Trang | Container | Item | Nguồn |
| --- | --- | --- | --- |
| Trang chủ | `.hero-slides` | `figure.hero-slide` | HTML |
| Trang chủ | `.project-track` | card rail | `src/site/content/project-reel.json` |
| Trang chủ | `.capability-marquee--clients` | logo | `src/site/content/client-logos.json` |
| Nhà ở, Kinh doanh | `.hero-slides` | `figure.hero-slide` | HTML |
| Nhà ở, Kinh doanh | `.detail-gallery__slides` | `figure.detail-gallery__item` | HTML |
| Nhà ở, Kinh doanh, Giới thiệu | `.detail-duo` | `img` | HTML (cố định hai ảnh, chỉ đổi ảnh) |
| Giới thiệu | `.about-timeline` | `article.about-timeline__item` | HTML |
| Giới thiệu | `.about-commitments` | item cam kết | HTML |
| Sản phẩm Quảng cáo | masonry, primary detail | card, `mediaItems` | catalog (R7) |

Cụm portal ba mục và năm bước quy trình là layout cố định: sửa chữ, ảnh, không thêm xóa
([ba trang con R4](detail-pages.md#r4-nội-dung-vien-và-hook)).

```gherkin
Given đang sửa Nhà ở, chọn gallery #cong-trinh
When bấm "Thêm ảnh" rồi chọn một ảnh trong thư viện
Then gallery có thêm một figure cuối với ảnh đã chọn, caption trống được viền đỏ nhắc nhập VI và EN
And kéo figure mới lên đầu thì thứ tự trong bản nháp đổi theo
```

### R5. Thư viện media

`scripts/cms/build-admin.mjs` quét `.site-output/assets/content/**`, bỏ biến thể cỡ (`-240`, `-480`, `-960`, `-1600`)
và định dạng phụ (`.jxl`, `.avif`), ghi `.site-output/admin/media-index.json`: path, width, height, nhóm theo thư mục,
alt VI/EN khi tìm được trong catalog Advertising hoặc `project-reel.json`. Bảng thuộc tính của ảnh mở thư viện dạng
lưới có ô tìm theo tên file và lọc theo thư mục; chọn ảnh là đổi `src` (và `data-src`, `srcset` nếu có) ngay trên
preview. Tải ảnh từ máy chưa có: thư viện chỉ gồm media thật đang dùng trên demo (owner 2026-10-31).

```gherkin
Given media-index.json đã sinh
When mở thư viện và gõ "cnc"
Then chỉ hiện ảnh có "cnc" trong tên file, mỗi ảnh ghi cỡ và thư mục
```

### R6. Panel Media: quản lý toàn bộ media

Panel Media là trang quản lý media (owner 2026-10-31): lưới mọi media trong `media-index.json`, ô tìm theo tên file và
alt, lọc theo thư mục và theo trạng thái "đang dùng" hay "chưa dùng". Chọn một media hiện: ảnh lớn, cỡ gốc, danh sách
cỡ biến thể có sẵn, alt VI/EN sửa được (ghi vào bản nháp của mọi trang đang dùng media đó), nơi dùng (trang, section,
card) dạng link mở đúng trang và chọn đúng placeholder trong Xem trước. Kéo một media từ panel Media thả vào placeholder
ảnh hoặc danh sách trong Xem trước là đổi hoặc thêm ảnh (R3, R4). Tải lên, xóa file, đổi tên: chưa có, hiện nút mờ kèm
"Chờ slice lưu trữ" ([CMS gate](cms.md#gate-còn-mở)).

```gherkin
Given panel Media mở, lọc "chưa dùng"
When chọn một ảnh rồi kéo thả vào gallery #cong-trinh trong Xem trước
Then gallery có thêm figure với ảnh đó, lọc "chưa dùng" không còn ảnh đó, nơi dùng ghi "Nhà ở · gallery"
```

### R7. Card Sản phẩm Quảng cáo

Trang masonry và trang card `p/<id>` tải có JavaScript (runtime dựng card). Overlay hook card đã render theo id
card và cho sửa: tên VI/EN, mô tả VI/EN, cụm và sản phẩm (chọn trong taxonomy), `mediaItems` (thêm từ thư viện, xóa,
kéo sắp lại, chọn cover), alt VI/EN từng media. Sửa đổi phản chiếu lên masonry bằng cách gọi lại layout của runtime với
catalog đã vá; filter, related, skeleton giữ contract ([masonry](advertising-masonry.md),
[card nhiều media](media-card.md#r1-dữ-liệu-media-của-card)). [CẦN LÀM RÕ: runtime masonry chưa có API vá catalog lúc
chạy; slice 2 chọn cách tải lại iframe với artifact vá, hoặc thêm hook trong `catalog-runtime.mjs`.]

```gherkin
Given đang sửa card signage-raised-letters-01 trên masonry
When xóa media cover và chọn media còn lại làm cover
Then card trên preview đổi ảnh, bản nháp ghi mediaItems mới, cover mới
```

### R8. Bản nháp, lưu và xuất

Mọi sửa đổi ghi vào bản nháp một trang: `{ page, updatedAt, fields: { key: { vi, en } }, images: { key: { src, altVi,
altEn } }, lists: { key: [item] } }`, lưu `localStorage` `tt-cms-draft:<page>` sau mỗi thao tác; mở lại trang thì nháp
được áp lại lên preview và thanh trên ghi "Chưa lưu". Lưu gửi `PUT /api/admin/content/<page>` với bản nháp; chưa có
D1 thì Worker trả 501 và editor giữ nháp, hiện "Chưa nối lưu trữ, nháp vẫn ở máy này". Xuất JSON tải file nháp. Hoàn
tác theo từng thao tác trong phiên. Không có bước duyệt: lưu thành công là nội dung lên web (owner 2026-10-31).

```gherkin
Given đã sửa h1 Trang chủ nhưng chưa lưu
When tải lại /admin/
Then preview Trang chủ vẫn hiện h1 mới, thanh trên ghi "Chưa lưu"; bấm Lưu khi chưa có D1 thấy thông báo 501
```

### R9. Chạy local và CI

`pnpm cms:dev` ([CMS R1](cms.md#r1-cấu-hình-worker-dormant)) chạy `build-admin.mjs` sau khi chép `src/admin/` và Dockview, nên
`/admin/` và `media-index.json` có trên `http://127.0.0.1:8788/admin/`. `pnpm dev` không chép admin: route public
không đổi. Test unit `tests/admin/editor-overlay.test.mjs` (jsdom không có: dùng Playwright `page.setContent`) kiểm
nhận diện placeholder, khóa, bản nháp; `tests/admin/editor.e2e.mjs` mở editor trên server local, sửa chữ, đổi cỡ, thêm
ảnh gallery.

```gherkin
Given pnpm cms:dev đang chạy
When GET /admin/ và /admin/media-index.json
Then 200; GET /vi/ không có overlay.js
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| File | `src/admin/index.html`, `admin.css`, `editor.js` | shell editor, dock Dockview (R1, R2, R8) |
| File | `src/admin/overlay.js`, `overlay.css` | chèn vào iframe, nhận diện và sửa placeholder (R3, R4, R7) |
| Data | `src/admin/page-schema.mjs` | cây trang từ `ROUTES`, bảng danh sách R4, vùng shell loại trừ |
| Data | `.site-output/admin/media-index.json` | thư viện và panel Media, sinh bởi `scripts/cms/build-admin.mjs` (R5, R6) |
| DOM hook | `data-cms`, `data-cms-key` | khóa placeholder; `data-cms` là khóa chuẩn cho Worker render |
| Storage | `localStorage` `tt-cms-draft:<page>`, `tt-cms-layout` | bản nháp (R8), bố cục dock (R1) |
| Thư viện | `dockview` 8.8.0 (`createDockview`, `themeLight`) | dashboard panel kéo thả (R1); chép vào `.site-output/admin/vendor/` khi chạy local |
| Endpoint | `PUT /api/admin/content/<page>` | lưu bản nháp; 501 khi chưa có D1 (R8) |
| Hằng | `VIEWPORT_PRESETS` trong `editor.js` | 1440, 1280, 768, 390, 384 (R2) |

## UI

Admin không thuộc Design System ([CMS UI](cms.md#ui)): nền sáng trung tính, chữ hệ thống, viền chọn một màu nhấn rõ
trên mọi ảnh; placeholder trống viền đỏ kèm chữ nhắc. Preview giữ nguyên UI của trang public.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1, R2, R8 | `tests/admin/editor.e2e.mjs` (chưa có) |
| R3, R4 | `tests/admin/editor-overlay.test.mjs` (chưa có) |
| R5 | `node scripts/cms/build-admin.mjs` rồi đọc `media-index.json` (chưa có test) |
| R6, R7 | chưa có test; slice 2 |
| R9 | `pnpm qa:worker:security`; `pnpm qa:static` xác nhận output public không có admin |

## Gate còn mở

- Owner duyệt spec và plan trước code (gate lifecycle). Plan ở card Notion.
- Khóa placeholder sinh tự động chỉ dùng cho bản nháp; lên production cần `data-cms` trong HTML tĩnh (slice Contract
  của [CMS](cms.md#điều-kiện-mở-cms-phase)), agent đề xuất bước sinh `data-cms` tự động trong `prepare:site`.
- Trang tải không JavaScript cho 4 trang HTML ([không JavaScript](detail-pages.md#r11-reduced-motion-fallback-không-javascript)):
  overlay tắt motion để chữ không bị tách `.motion-line`; cách tắt (chặn script hay cờ `?cms=1`) chốt ở slice 1.
- Upload ảnh từ máy, biến thể ảnh, video, lưu D1, phân quyền: ngoài phạm vi, theo [CMS gate](cms.md#gate-còn-mở).

## Chú thích thuật ngữ

- **Placeholder**: ô nội dung đặt đúng vị trí trên trang thật, nhập vào là thấy ngay.
- **Overlay**: lớp script và CSS chèn vào trang xem trước để chọn và sửa placeholder.
- **Preset cỡ**: cỡ khung xem trước định sẵn theo thiết bị.
- **Bản nháp**: thay đổi chưa lưu, giữ trong trình duyệt.
- **Slice**: phần việc nhỏ owner mở riêng, có gate duyệt.
