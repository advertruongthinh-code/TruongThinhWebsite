---
title: CMS editor
status: planned
source:
  - src/admin/**
  - scripts/cms/**
tests:
  - tests/admin/slug.test.mjs
  - tests/admin/theme.test.mjs
  - tests/admin/editor.e2e.mjs
  - tests/tooling/admin-output.test.mjs
notion: https://app.notion.com/p/420332849a0e81ffb9e4e85372f1a0f7
updated: 2026-11-28
---

# CMS editor

## Mục đích

Giao diện `/admin/` để owner và nhân viên tạo, sửa, xóa mọi nội dung của site ngay trên bản xem trước của trang thật, rồi lưu bằng lệnh của [CMS R5](cms.md#r5-lệnh-admin-có-kiểu). Spec này sở hữu khung làm việc, danh sách nội dung, xem trước, soạn bài và trang, nháp và lưu. Media, upload và khung crop ở [editor media](cms-editor-media.md); trạng thái dựng, phát hành, thùng rác, nhật ký, tài khoản ở [editor vận hành](cms-editor-ops.md); dock ở [dock](cms-dock.md). Editor chỉ gọi lệnh trong [dữ liệu CMS R7](cms-data.md#r7-bảng-lệnh-admin) và chạy hoàn toàn bằng code cố định, không gọi AI ([CMS](cms.md#bối-cảnh-và-phương-án)).

Ý định owner (2026-10-31): nhân viên dùng nhiều nhất, chỉ trên máy tính. Thêm về sau: giao diện phải trực quan, sửa ngay trên bản xem trước, bấm chữ để sửa, bấm khung ảnh để kéo và phóng (owner 2026-11-15); lưu là lên staging ngay, thấy ổn thì bấm "Phát hành" để lên site chính (owner 2026-11-22).

Trạng thái (2026-11-28, E12): khung R1 và panel Nội dung R2 chạy trên dữ liệu thật (`whoami`, `list`, `get`, `create`, `reorder`). Panel Xem trước, Thuộc tính, Media, Nháp đã có chỗ trong bố cục mặc định nhưng còn trống tới E13 tới E16; editor cũ theo contract `t<n>` đã gỡ (giữ `dock-tools.js`, `overlay.js` cho E13). Trong panel Nội dung, nhóm Trang chuẩn hiện bốn bản ghi `page-copy`; slide hero, dự án trang chủ và logo của trang mở qua trang đó ở E17.

Trang tạm (2026-11-23, owner cần CRUD trước editor E12): `/admin/records.html` liệt kê bản ghi theo kiểu và trạng thái, sửa `data` dạng JSON rồi gọi `save`, `create`, `trash`, `restore`, `purge`, xem `audit-log`; `/admin/status.html` là trang vận hành của plan P1 (in `build-status`, nút "Lưu thử" đo CPU). Hai trang không dùng Design System, bị editor E12 tới E19 thay.

## Hành vi

### R1. Khung làm việc

`/admin/` là một trang tiếng Việt, `noindex`, chỉ bố cục từ 1024px (hẹp hơn hiện "Mở CMS trên máy tính, cửa sổ rộng từ 1024px."). Thân trang là một dock của [Dockview](https://dockview.dev) (`dockview` 8.8.0, theme `themeLight` hoặc `themeDark` theo [R10](#r10-giao-diện-sáng-tối-hoặc-theo-hệ-thống); owner chọn 2026-10-31): mỗi vùng là một panel có tab, kéo thả, tách nhóm, đóng và mở lại từ menu "Bảng"; ghim tab, mép tự ẩn, lịch sử bố cục theo [dock](cms-dock.md).

| Panel | Nội dung | Ai thấy |
| --- | --- | --- |
| Nội dung | Danh sách bản ghi theo nhóm (R2) | Mọi người |
| Xem trước | Trang đang sửa (R3) | Mọi người |
| Thuộc tính | Trường của bản ghi hoặc chỗ đang chọn (R4 tới R7) | Mọi người |
| Media | Thư viện ([editor media R1](cms-editor-media.md#r1-thư-viện-media)) | Mọi người |
| Nháp | Thay đổi chưa lưu trên máy này (R8) | Mọi người |
| Trạng thái, Thùng rác, Nhật ký | [Editor vận hành](cms-editor-ops.md) | Mọi người |
| Tài khoản | [Editor vận hành R6](cms-editor-ops.md#r6-tài-khoản) | Chỉ owner |

Panel Media là trang quản lý media (owner 2026-10-31): chi tiết ở [editor media](cms-editor-media.md). Bố cục mặc định: Nội dung trái 280px, Xem trước giữa, Thuộc tính phải 380px; Media và Nháp là tab cùng nhóm Thuộc tính; bốn panel vận hành đóng, mở từ menu "Bảng". Bố cục lưu trong `localStorage` `tt-cms-layout` như hiện tại. Thanh trên, từ trái sang: tên bản ghi đang mở và nhãn trạng thái của nó (R8), nút Hoàn tác, nút Lưu, menu Bảng, rồi dải trạng thái dựng và nút "Phát hành" ([editor vận hành R1, R2](cms-editor-ops.md#r1-trạng-thái-staging-và-site-chính)). Mở lại editor thì mở bản ghi dùng lần cuối (`tt-cms-open`), lần đầu là Trang chủ. Mở editor gọi `get` cho bản ghi đó và `list` cho nhóm đang mở; lệnh trả 403 thì trang hiện "Tài khoản của bạn chưa được mở trong CMS." và không hiện panel nào. Nút "Xuất JSON" của bản cũ bỏ. Admin dùng `editor.css` riêng, không dùng token Design System ([CMS UI](cms.md#ui)).

```gherkin
Given nhân viên mở /admin/ trên cửa sổ 1440px lần đầu
When trang tải xong
Then dock có Nội dung, Xem trước, Thuộc tính theo bố cục mặc định, Xem trước tải Trang chủ
And menu Bảng không có mục Tài khoản
```

### R2. Panel Nội dung

Panel xếp bản ghi theo nhóm; mỗi nhóm đọc bằng lệnh `list` của kiểu đó, tải thêm khi cuộn tới cuối.

| Nhóm | Kiểu | Tạo mới | Xếp thứ tự |
| --- | --- | --- | --- |
| Trang chuẩn: Trang chủ, Nhà ở, Kinh doanh, Giới thiệu | `page-copy` (bốn bản ghi cố định), kèm `hero-slide`, `home-projects`, `client-logo` của trang đó (R6, R7) | Không | Không |
| Công trình | `project` | Có | Kéo thả |
| News | `news` | Có | Theo ngày đăng, mới trước |
| Card Advertising, theo cụm rồi sản phẩm | `advertising-card` | Có | Kéo thả trong một sản phẩm |
| Menu và liên hệ | `menu`, `contact` | Không | Không |

Mỗi dòng ghi tên, người và giờ sửa cuối, và các nhãn: "Nháp" (`draft`), "Đang xử lý media" (`pending > 0`), "Lỗi media" (có biến thể `error`), "Thiếu EN" ([nội dung CMS R2](cms-content.md#r2-hai-ngôn-ngữ)), "Chưa lưu" (có nháp trên máy này). Ô tìm lọc theo tên, bỏ dấu; bộ lọc: Tất cả, Nháp, Thiếu EN, Có lỗi. Bấm một dòng mở bản ghi đó ở Xem trước và Thuộc tính. Menu chuột phải của dòng: "Mở trên staging", "Đưa vào thùng rác" ([editor vận hành R4](cms-editor-ops.md#r4-thùng-rác)).

Tạo mới mở một hộp thoại: tên tiếng Việt (bắt buộc) và các trường phân loại bắt buộc của kiểu (News: nhóm; công trình: mảng và loại; card: sản phẩm chính). `id` và slug VI tự sinh từ tên (chữ thường, bỏ dấu, nối bằng gạch ngang), sửa được trong hộp thoại; `id` không đổi sau khi tạo. Bấm "Tạo" gọi `create`, mở bản ghi mới ở trạng thái Nháp; 409 thì hộp thoại ghi "Tên định danh này đã có, đổi tên khác." và giữ nguyên dữ liệu đã gõ.

Kéo thả đổi thứ tự gọi lệnh `reorder` với toàn bộ danh sách id theo thứ tự mới; 409 (danh sách đã đổi ở máy khác) thì tải lại nhóm và báo "Danh sách vừa đổi, xếp lại giúp."

```gherkin
Given nhóm News có một bài thiếu description.en
When chọn bộ lọc "Thiếu EN"
Then chỉ bài đó hiện, kèm nhãn "Thiếu EN"
When bấm Tạo, gõ tên "Chọn màu gỗ cho phòng ngủ", chọn nhóm rồi bấm Tạo
Then bài mới có id "chon-mau-go-cho-phong-ngu", nhãn "Nháp" và mở ở Xem trước
```

### R3. Xem trước

Khung xem trước là một `iframe` cùng origin, chạy cùng CSS, JS và motion của site ([CMS R7](cms.md#r7-xem-trước-gần-11-với-site)). Ba nguồn, không có renderer thứ hai:

| Trang | Nguồn HTML |
| --- | --- |
| Bài News, chi tiết công trình | Module thuần `renderBlockPage` mà build dùng, chạy trong trình duyệt trên dữ liệu đang sửa |
| Trang chuẩn | HTML đã dựng của trang, cộng hàm `fillSlots` mà build dùng (R6) |
| Lưới và trang card Advertising | Bản xem trước `advertising.html` với catalog vá từ dữ liệu card đang sửa, như bản hiện có |

Thanh cỡ có đúng sáu mốc 384, 768, 1024, 1280, 1440, 1920 (owner 2026-11-15); ô bề rộng tự do và các preset cũ bỏ. Khung lớn hơn panel thì thu nhỏ bằng `transform: scale`, ghi cỡ và phần trăm. Đổi mốc tải lại iframe (runtime của site chỉ dựng đúng lúc tải trang) rồi cuộn lại chỗ đang chọn. Sửa chữ cập nhật tại chỗ; đổi media, crop, layout hay thứ tự thì dựng lại HTML trong iframe sau 250 ms kể từ thay đổi cuối. Nút "Tiếng Việt"/"English" đổi ngôn ngữ xem trước; bản ghi chưa đủ EN thì nút English mờ kèm "Bài chưa có bản tiếng Anh". "Chế độ sửa"/"Chế độ xem" bật tắt overlay; chế độ xem tương tác như khách, link rời trang bị chặn kèm thông báo. "Mở trên staging" mở URL của trang trên staging trong tab mới, mờ khi bản ghi chưa `published`.

Media chưa có biến thể hiện bằng bản gốc qua lệnh `media-file`, với vùng crop áp bằng CSS, và góc khung ghi "bản xem trước". Lưới card trong preview xếp như PC và tablet ở mọi mốc; thứ tự dựng sẵn của điện thoại chỉ có ở lần dựng thật.

```gherkin
Given đang sửa một bài News ở mốc 1440
When chọn mốc 384
Then iframe rộng 384px và tải lại, chữ vừa sửa chưa lưu vẫn còn, khối đang chọn được cuộn vào giữa
And HTML của preview bằng HTML build sinh ra từ cùng dữ liệu
```

### R4. Soạn bài News và công trình

Panel Thuộc tính của một bài có bốn tab, làm từ trái sang phải; bài công trình có thêm tab Card ([editor media R7](cms-editor-media.md#r7-card-công-trình)).

| Tab | Trường |
| --- | --- |
| Thông tin | Tên VI, EN; mô tả VI, EN; tiêu đề SEO (công trình); slug VI, EN; phân loại; ngày đăng (News); ảnh bìa, chọn trong media của bài |
| Media của bài | Danh sách media có thứ tự: thêm từ thư viện hoặc upload, kéo thả đổi thứ tự, gỡ; đầu tab ghi tổng số |
| Layout | Hình thu nhỏ của từng layout thuộc kiểu ([News R3](news.md#r3-trang-bài), [công trình R4](projects.md#r4-ảnh-và-video-công-trình)) |
| Còn thiếu | Danh sách trường bắt buộc chưa đủ |

Tab Layout: layout có mức media thấp nhất không vượt số media của bài thì mở; layout cao hơn mờ và ghi "thêm n media để mở"; layout có mức cao nhất nhỏ hơn số media ghi "bớt n media hoặc chọn layout lớn hơn". Trang `legacy` hiện một ô "Bố cục riêng (trang có trước CMS)", không chọn được cho bài khác. Chọn layout thì editor chia media vào khối bằng `assignMedia` theo thứ tự trong tab Media của bài và dựng lại preview. Người soạn không thêm, bớt hay đổi thứ tự khối; khối `quote` có một công tắc "Có trích dẫn" trong Thuộc tính của nó.

Trên preview: bấm một chữ để sửa tại chỗ (R5); bấm một khung media để mở khung crop ([editor media R4](cms-editor-media.md#r4-khung-crop)); kéo một media từ tab Media của bài thả vào một khung để đổi media của khung đó (hai media đổi chỗ cho nhau trong danh sách). Khối `facts-grid` sửa từng ô nhãn và giá trị tại chỗ.

Tab Còn thiếu chạy `shapeErrors` và `fullErrors` của `src/cms/contract.mjs` ngay trong trình duyệt sau mỗi thay đổi; mỗi dòng ghi lỗi bằng tiếng Việt và bấm vào thì chọn đúng chỗ trên preview hoặc đúng trường. Đổi slug của bài đã `published` hiện ghi chú "Link cũ sẽ tự chuyển sang link mới."

```gherkin
Given bài News có 5 media, đang ở layout "2 tới 5 ảnh"
When mở tab Layout
Then layout "6 tới 11 ảnh" mờ và ghi "thêm 1 media để mở"
When thêm 1 media rồi chọn layout "6 tới 11 ảnh"
Then preview dựng lại với chuỗi khối của layout đó, media đặt theo thứ tự trong tab Media của bài
```

### R5. Soạn chữ

Bấm một chữ trên preview thì chữ đó thành ô sửa tại chỗ (`contentEditable="plaintext-only"`); Enter kết thúc ở chữ một dòng, Esc luôn kết thúc; dán chỉ nhận chữ thuần. Ô Thuộc tính hiện cùng chữ đó ở hai ô VI và EN. Khi có vùng chữ được bôi, một thanh nhỏ nổi lên với đúng các nút chỗ đó cho phép ([nội dung CMS R8](cms-content.md#r8-soạn-chữ)):

| Nút | Dữ liệu lưu | Hiện trên site |
| --- | --- | --- |
| Đậm | `**chữ**` | `<strong>` |
| Nghiêng | `*chữ*` (dấu sẵn có của dòng hero) | `<em>` |
| Chỉ số trên | `^2^` | `<sup>` |
| Link | `[chữ](page:<id trang>)` hoặc `[chữ](https://…)` | `<a>`; link nội bộ chọn trang trong danh sách, không gõ URL |
| Xuống dòng chủ ý | ký tự xuống dòng trong đoạn | `<br>` |
| Không tách dòng | dấu cách không ngắt (U+00A0) giữa các từ | giữ cụm trên một dòng |
| Danh sách | dòng bắt đầu bằng "• " hoặc "1. " | `<ul>`, `<ol>` (chỉ khối `paragraph` và slot cho phép) |

Dữ liệu là chuỗi thuần kèm các dấu trên; một hàm thuần `inlineMarks` dùng chung cho build, preview và validator đổi dấu thành thẻ và thoát mọi ký tự HTML khác, nên không HTML, CSS hay script thô nào tới được trang. Đoạn mới trong khối `paragraph` là một dòng trống như dữ liệu hiện có. Mỗi chỗ có đúng một kiểu đoạn do khối hoặc slot quyết định; người soạn không chọn cỡ, màu, font. Dấu `\` đứng trước `*`, `^`, `[`, `\` biến ký tự đó thành chữ thường; dấu không lồng nhau; dấu mở thiếu dấu đóng trên cùng dòng là lỗi. VI và EN của một chỗ phải có cùng dãy dấu và ngắt dòng, vì site ghép từng đoạn VI với đoạn EN tương ứng. Bộ kiểm chữ (chữ mồ côi, dòng ngắt chủ ý kết thúc bằng dấu câu) chạy khi rời ô và hiện gạch chân vàng kèm lý do; `save` vẫn từ chối theo validator.

| Kiểu chỗ chữ | Dấu nhận |
| --- | --- |
| `title`: tiêu đề mục trong khối, slot tiêu đề | Nghiêng, xuống dòng, không tách dòng |
| `body`: khối `paragraph`, slot thân bài | Đậm, nghiêng, chỉ số trên, link, xuống dòng, không tách dòng, danh sách |
| `quote` | Đậm, nghiêng, xuống dòng, không tách dòng |
| `small`: ô `facts-grid`, chú thích, slot nhãn, link, chữ ngắn | Chỉ số trên, không tách dòng |
| `plain`: tiêu đề, mô tả, tiêu đề SEO của bài News và công trình; alt, slug, tên | Không dấu nào |

```gherkin
Given đang sửa một khối paragraph của bài News
When bôi "25 m2", sửa thành "25 m" rồi gõ 2 và bấm Chỉ số trên
Then dữ liệu lưu "25 m^2^", preview hiện m² bằng thẻ sup
When dán một đoạn có thẻ <b> từ trang web khác
Then chỉ chữ thuần được dán, không thẻ nào vào dữ liệu
```

### R6. Trang chuẩn

Trang chủ, Nhà ở, Kinh doanh, Giới thiệu sửa theo slot ([nội dung CMS R6](cms-content.md#r6-trang-chuẩn)). Mỗi chỗ sửa được trong `<main>` của bốn trang mang thuộc tính `data-slot="<id>"` viết sẵn trong HTML nguồn; `id` có dạng `<section>.<tên>` (ví dụ `hero.title-1`, `intro.body`, `process.step-3.image`), duy nhất trong trang và không đổi khi HTML quanh nó đổi. Khóa `t<n>`, `i<n>` theo thứ tự nguồn của bản cũ và hook `data-cms` bỏ. Kiểu `page-copy` có đúng bốn bản ghi cố định `home`, `residential`, `commercial`, `about`, mỗi bản ghi là `{ slots: { <id>: { vi, en } } }` cho chữ và `{ slots: { <id>: { mediaId, crop } } }` cho media; slot không có trong bản ghi thì trang giữ nội dung viết sẵn trong HTML. Hàm thuần `fillSlots(html, record, locale)` dùng chung cho build và preview điền slot. Một slot chữ là một phần tử khối (tiêu đề, đoạn, chú thích, mục danh sách, nút đứng riêng): phần nghiêng trong tiêu đề là dấu của cùng slot, không phải slot riêng; khối có chữ con gắn chuyển động riêng thì mỗi chữ con là một slot `small`. Tên theo thẻ: `h1` tới `h6` là `title`, đoạn là `body`, còn lại `label`, `caption`, `link`, `text`. Khóa gán một lần bằng `scripts/cms/assign-slots.mjs` rồi sống trong HTML, đóng băng bằng `tests/site/fixtures/slots.json`: PR thêm hay đổi chỗ sửa được trên bốn trang tự đặt `data-slot` và sửa fixture trong cùng PR (`assign-slots.mjs --check` báo khi lệch).

Overlay vẽ viền khi rê chuột lên một slot, viền đậm khi chọn; chữ sửa theo R5, media theo khung crop. Xóa hết chữ của một slot thì slot hiện chữ mẫu, xóa media thì hiện `placeholder-ngang` hoặc `placeholder-doc` theo khung; lưu được, site hiện đúng chữ mẫu đó, và editor ghi ở đầu Thuộc tính "n chỗ đang hiện chữ mẫu trên site" kèm link tới từng slot. Số mục của một cụm (portal, bước quy trình, mốc thời gian, cam kết, ảnh gallery) là layout: bản đầu không thêm, không bớt. Header, menu, footer, floating CTA nằm ngoài `<main>` nên không chọn được trên preview; chúng sửa ở R7.

```gherkin
Given đang sửa trang Nhà ở
When xóa hết chữ của slot intro.body rồi bấm Lưu
Then lưu được, Thuộc tính ghi "1 chỗ đang hiện chữ mẫu trên site", lần dựng sau slot đó hiện chữ mẫu đúng khung
When gõ lại chữ rồi Lưu
Then lần dựng sau trang Nhà ở hiện chữ mới ở đúng slot, phần còn lại của trang không đổi
```

### R7. Menu, liên hệ và danh sách của trang

Các phần không nằm trong `<main>` hoặc là danh sách dữ liệu sửa bằng biểu mẫu trong panel Thuộc tính; preview dựng lại sau mỗi thay đổi.

| Mục | Sửa được | Luật |
| --- | --- | --- |
| Menu | Tiêu đề VI/EN, link, thứ tự của 6 mục lớn; mục con thêm, xóa, sửa, kéo thả | Luôn đủ 6 mục lớn; link nội bộ chọn trang ([nội dung CMS R7](cms-content.md#r7-menu-liên-hệ-và-cta)) |
| Liên hệ | Zalo, hotline, văn phòng, mạng xã hội; chữ và link của từng nút CTA | Một nguồn `contact`, mọi nút trên site đọc từ đó |
| Ảnh hero của Trang chủ, Nhà ở, Kinh doanh | Thêm từ thư viện, gỡ, điểm giữ, alt | Mỗi trang còn ít nhất một ảnh; thứ tự do site xáo nên không xếp |
| Dải công trình trang chủ | Chọn công trình `published`, kéo thả thứ tự | Từ 3 công trình |
| Logo khách hàng | Thêm (file SVG), tên, gỡ, kéo thả thứ tự | SVG qua kiểm an toàn ([editor media R2](cms-editor-media.md#r2-upload-ảnh)) |

```gherkin
Given menu có 6 mục lớn
When mở biểu mẫu Menu
Then mục lớn không có nút xóa; mục con có nút xóa và kéo thả được
When gỡ ảnh hero cuối cùng của trang Kinh doanh
Then lệnh trả 409, biểu mẫu ghi "Trang phải còn ít nhất một ảnh hero"
```

### R8. Nháp, lưu và xung đột

Mọi thay đổi ghi ngay vào nháp trên máy `localStorage` `tt-cms-draft:<kiểu>:<id>`: `{ baseVersion, data }`, với `baseVersion` là `version` của bản đã tải. Nháp không gửi lên server; đổi máy hay xóa dữ liệu trình duyệt thì mất phần chưa lưu ([CMS R7](cms.md#r7-xem-trước-gần-11-với-site)). Nhãn trên thanh trên: "Nháp" hoặc "Đã đăng" theo bản ghi, thêm "Chưa lưu · n thay đổi" khi có nháp. Hoàn tác theo từng thao tác, gõ liên tục một ô gộp một mốc. Panel Nháp liệt kê mọi bản ghi có nháp trên máy, mỗi dòng có "Mở" và "Bỏ nháp".

Bấm Lưu gọi `save` với `baseVersion`. Editor chỉ gửi `mediaId` và `crop` cho chỗ đặt media.

| Trả về | Editor làm |
| --- | --- |
| 200, `published`, `pending` bằng 0 | Bỏ nháp; ghi "Đã lưu. Đang đưa lên staging." |
| 200, `published`, `pending` lớn hơn 0 | Bỏ nháp; ghi "Đã lưu. Đang xử lý n media, xong sẽ tự lên staging." |
| 200, `draft` | Bỏ nháp; ghi "Đã lưu nháp. Còn thiếu n mục." và mở tab Còn thiếu |
| 400 | Giữ nháp; đánh dấu từng trường lỗi theo danh sách trả về |
| 409 version | Hộp thoại ghi người và giờ lưu bản kia, hai nút: "Lấy bản mới" (bỏ nháp, tải bản kia) và "Giữ bản của tôi" (lưu lại trên `version` mới) |
| 409 slug | Giữ nháp; ô slug ghi "Link này đã có bài khác dùng." |
| 403 | Giữ nháp; ghi "Tài khoản không có quyền này." |
| 429, 503, mất mạng | Giữ nháp; ghi "Chưa lưu được, nháp vẫn ở máy này. Thử lại sau." |

Mở một bản ghi có nháp mà `baseVersion` nhỏ hơn `version` hiện tại thì hộp thoại 409 hiện ngay, trước khi sửa tiếp. Rời trang khi còn nháp không hỏi lại, vì nháp vẫn ở máy.

```gherkin
Given owner và nhân viên cùng mở một bài ở version 4
When owner lưu, rồi nhân viên bấm Lưu
Then nhân viên thấy hộp thoại ghi tên owner và giờ lưu, nháp của nhân viên chưa mất
When nhân viên chọn "Giữ bản của tôi"
Then bài lên version 6 với nội dung của nhân viên, nhật ký có đủ hai lần lưu
```

### R9. Dựng admin, chạy local và CI

`scripts/cms/build-admin.mjs` ghi thư mục `.admin-output/` cho Worker admin (`wrangler.toml` `[assets]`): bản chép đủ `.site-output` trừ `sw.js` (để preview tải CSS, JS, ảnh của site ở đúng URL gốc), cộng `admin/` gồm file của `src/admin/`, Dockview (`admin/vendor/dockview/`), các module thuần dùng chung dưới `admin/lib/` giữ đường dẫn tương đối (danh sách tính bằng cách đi theo `import` tĩnh từ `src/cms/*.mjs` và các module dựng trang; gặp import không tương đối thì build dừng), trang vỏ rỗng `admin/preview.html` cho iframe và `admin/repo-files.json` (file nội dung có trong repo). Route public không đổi và không có file admin. `pnpm cms:dev` dựng site, dựng admin rồi chạy Worker admin local với D1 local đã seed, mở `http://127.0.0.1:8788/admin/`. Bộ `fast` chạy test đơn vị của các module thuần và e2e của editor trên Worker local.

```gherkin
Given pnpm cms:dev đang chạy
When GET /admin/ và một file module trong /admin/
Then 200; GET / của site public không chứa file nào của admin
```

### R10. Giao diện sáng, tối hoặc theo hệ thống

Chỉ đổi giao diện của admin, không đổi site public và không đổi trang trong khung Xem trước (preview giữ UI public). Thanh trên có thêm một nút pill ở mép phải, ba nút chỉ có icon, không có chữ: mặt trời (sáng), mặt trăng (tối), màn hình (theo hệ thống). Mỗi nút có `aria-label` và `title` tiếng Việt ("Giao diện sáng", "Giao diện tối", "Theo hệ thống"), nút đang chọn có `aria-pressed="true"`. Lựa chọn lưu trong `localStorage` `tt-cms-theme` (`light`, `dark`, `system`); giá trị khác hoặc không đọc được thì là `system`, lần đầu cũng là `system`. `system` theo `prefers-color-scheme` và đổi ngay khi hệ điều hành đổi. Thuộc tính `data-theme` trên `<html>` giữ lựa chọn và được đặt trước khi vẽ để trang tối không nháy sáng; màu của admin là token `light-dark()` trong `editor.css`, dock đổi giữa `themeLight` và `themeDark` của Dockview. Chữ và nhãn trạng thái ở cả hai giao diện đạt tương phản 4.5:1.

```gherkin
Given hệ điều hành đang ở chế độ tối và nhân viên chưa chọn giao diện
When mở /admin/
Then nút "Theo hệ thống" đang chọn, admin tối, dock theo themeDark
When nhân viên bấm "Giao diện sáng" rồi tải lại trang
Then admin vẫn sáng, nút "Giao diện sáng" đang chọn
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| File | `src/admin/index.html`, `editor.js`, `editor.css`, `theme.mjs`, `dock-tools.js`, `overlay.js`, `overlay.css` | Khung, panel, overlay (R1 tới R8), giao diện sáng tối (R10) |
| Hàm | `renderBlockPage`, `fillSlots`, `inlineMarks`, `assignMedia`, `shapeErrors`, `fullErrors` | Module thuần dùng chung với build và Worker (R3 tới R6) |
| DOM hook | `data-slot` trên bốn trang chuẩn; iframe `data-cms-preview` | Khóa slot (R6); khung preview |
| Lệnh | `list`, `get`, `create`, `save`, `reorder`, `media-file` | [Dữ liệu CMS R7](cms-data.md#r7-bảng-lệnh-admin) |
| Storage | `localStorage` `tt-cms-draft:<kiểu>:<id>`, `tt-cms-layout`, `tt-cms-open`, `tt-cms-theme` | Nháp (R8), bố cục, bản ghi mở lần cuối (R1), giao diện (R10) |
| Thư viện | `dockview` 8.8.0 | Dock (R1) |

## UI

Admin không thuộc Design System ([CMS UI](cms.md#ui)): nền sáng hoặc tối trung tính theo [R10](#r10-giao-diện-sáng-tối-hoặc-theo-hệ-thống), chữ hệ thống, một màu nhấn (`#1a5fd0` ở nền sáng) cho viền chọn và nút chính; chỗ còn thiếu viền đỏ đứt kèm chữ nhắc; nhãn trạng thái là chữ, không chỉ là màu. Mọi nút có nhãn chữ tiếng Việt, trừ nút giao diện của R10 chỉ có icon kèm `aria-label`. Preview giữ nguyên UI của trang public.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R8 | cần: e2e lưu, xung đột 409 trên Worker local |
| R3 | cần: HTML preview bằng HTML build trên fixture mọi khối, bốn trang chuẩn và card |
| R4 | cần: e2e khóa layout theo số media; đơn vị `assignMedia` đã có ở phần 1 |
| R5 | cần: đơn vị `inlineMarks` (từng dấu, thoát HTML, dán chữ thuần) |
| R6, R7 | cần: đơn vị `fillSlots`; test mọi `data-slot` duy nhất trong trang; e2e luật 6 mục menu và ảnh hero cuối |
| R1, R2 | `tests/admin/editor.e2e.mjs` (Worker local, D1 seed): bố cục mặc định, menu Bảng theo vai, lọc Thiếu EN, tìm bỏ dấu, tạo bài và 409, kéo thả rồi tải lại, menu chuột phải, 403, phiên hết hạn, cửa sổ 900px; `tests/admin/slug.test.mjs` |
| R10 | `tests/admin/theme.test.mjs` (chọn, lưu, theo hệ thống, lưu trữ lỗi); `tests/admin/editor.e2e.mjs` (nhãn nút, màu và dock đổi, giữ sau tải lại) |
| R9 | `tests/tooling/admin-output.test.mjs` (output public không có admin; `admin/lib` chỉ có module thuần; không `sw.js`) |

## Gate còn mở

- Phần 2 của plan CMS viết lại code theo spec này. CMS mở cho người dùng một lần khi mọi nhóm nội dung đã xong, không mở từng đợt (owner 2026-11-22).
- Số mục của các cụm trên trang chuẩn (ảnh gallery, mốc thời gian, cam kết) cố định ở bản đầu; thêm, bớt mục cần đổi `page-copy` thành danh sách và là việc sau bản đầu.
- Motion trong bản xem trước giữ nguyên (owner 2026-10-31): preview chạy cùng JS và motion của site; sửa chữ tại chỗ gộp dòng đã tách rồi tách lại.
- Editor trên điện thoại: ngoài phạm vi.

## Chú thích thuật ngữ

- **Slot**: chỗ đặt nội dung cố định trong một trang chuẩn, có khóa `data-slot`.
- **Overlay**: lớp script và CSS chèn vào trang xem trước để chọn và sửa.
- **Nháp trên máy**: thay đổi chưa lưu, chỉ nằm trong trình duyệt. Khác bản ghi `draft` là bản đã lưu nhưng chưa đủ trường.
- **Dấu chữ**: ký hiệu trong chuỗi thuần (`**`, `*`, `^`, `[]()`) mà site đổi thành thẻ trình bày.
- **Dock**: vùng chia panel có tab, kéo thả được.
- **Staging**: bản thử `staging.truongthinhads.vn`, nơi mọi lần lưu hiện ra trước khi phát hành.
- **Module thuần**: code không đọc file hay mạng, chạy được ở Node, Worker và trình duyệt.
- **Mốc**: một bề rộng xem trước định sẵn.
