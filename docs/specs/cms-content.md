---
title: Nội dung CMS
status: planned
source:
  - src/site/content/**
tests:
  - tests/site/blocks.test.mjs
notion: https://app.notion.com/p/419332849a0e816388dbd2395acd97d4
updated: 2026-11-15
---

# Nội dung CMS

## Mục đích

Contract của những gì người soạn thêm, sửa, xóa trong CMS: kiểu nội dung và file chiếu, hai ngôn ngữ, media, card
masonry, layout khóa theo số media, trang chuẩn, menu và CTA, soạn chữ, tìm kiếm ngữ nghĩa. Nền tảng (quyền, trạng thái, lệnh admin, xuất
bản, xem trước) ở [CMS](cms.md). Chưa có code theo spec này.

## Hành vi

### R1. Kiểu nội dung và file chiếu

Mỗi kiểu nội dung chiếu ra đúng một file JSON mà build tĩnh đang đọc; build không biết CMS tồn tại. Bản chụp xuất bản
là bộ file này, qua cùng validator với build (một module dùng chung, không viết lại luật trong Worker).

| Kiểu | File chiếu | Validator dùng chung |
| --- | --- | --- |
| `news` | `content/news.json` | `validateBlockPage`, `kindFieldErrors` (`scripts/site/blocks.mjs`, `block-pages.mjs`) |
| `project` | `content/projects.json` | như `news`, thêm card theo R4 |
| `hero-slide` | `content/hero-slides.json` | `validateHeroSlides` (`scripts/ci/content-contract.mjs`) |
| `project-reel` | `content/project-reel.json` | `validateProjectReel` |
| `menu` | `content/menu.json` (mở rộng theo R7) | `menuErrors` |
| `client-logo` | `content/client-logos.json` | chưa có; thêm ở slice Storage |
| `advertising-card` | `content/advertising-cards.json` (mới) | luật card hiện ở `catalog.mjs` và `media-contract.mjs`, tách ra file dữ liệu |
| `page-copy` | `content/page-copy.json` (mới) | chữ và media theo slot của trang chuẩn (R6) |
| `contact` | `content/contact.json` (mới) | cách liên hệ và nút CTA (R7) |

Định danh: `id` khớp `^[a-z0-9][a-z0-9-]{0,79}$`, không đổi sau khi tạo. `slugVi`, `slugEn` kebab-case theo
[SEO media](media-seo.md); đổi slug sau khi đăng thì bản dựng thêm redirect 301 từ slug cũ. [CẦN LÀM RÕ: khóa slot của `page-copy` lấy từ `data-cms` hiện có hay đặt lại; chốt ở slice editor.]

```gherkin
Given bản chụp có một bài news thiếu cover.width
When chạy validator trước lần dựng
Then lần dựng không chạy, admin báo đúng id bài và trường thiếu
```

### R2. Hai ngôn ngữ

Mọi trường chữ có cặp VI và EN (`title.vi`, `title.en` hoặc `altVi`, `altEn` như file chiếu hiện tại). VI bắt buộc để
lưu. Thiếu EN ở một trường bắt buộc thì bài vẫn lên bản VI; bản EN không sinh, không có `hreflang` en, link đổi ngôn ngữ
của bài đó trỏ trang danh sách EN ([layout-library R4](layout-library.md#r4-dữ-liệu-và-render-tĩnh)). Admin hiện bài thiếu
EN trong một danh sách riêng. Định dạng chữ theo R8; không nhận HTML, CSS hay script thô.

```gherkin
Given bài news có đủ VI, thiếu description.en
When lưu bài
Then /vi/news/<slugVi>/ lên ở lần dựng sau, /en/news/<slugEn>/ không sinh và sitemap không có URL EN của bài
```

### R3. Media

Media là một bản ghi riêng, nội dung tham chiếu theo `mediaId`; một media dùng được ở nhiều nơi. Mọi chỗ đặt ảnh trên
trang công trình và News nhận cả ảnh lẫn video, nên gọi chung là chỗ media (owner 2026-11-15; tên khối ở R5).

- `kind`: `image` hoặc `video`. Ảnh có `width`, `height` thật. Video có `posterId` trỏ một ảnh, cùng tỷ lệ với video.
- Alt: `altVi` bắt buộc, `altEn` theo R2; tả đúng thứ trong media, không trùng alt cùng ngôn ngữ trong một card
  ([media-seo R3](media-seo.md#r3-alt-và-tên-file-của-từng-media)); CMS điền sẵn gợi ý được, người soạn duyệt.
- Khung: mỗi chỗ media có khung tỷ lệ khóa theo [layout-library R7](layout-library.md#r7-khung-ảnh-cố-định-từng-khối); người
  soạn kéo, phóng ảnh đều trong khung, CMS lưu vùng crop cùng bản gốc, lần dựng cắt biến thể theo vùng đó.
- Upload: bỏ EXIF và GPS; tên file theo slug nội dung cộng số thứ tự. Đầu vào nhận JPEG, PNG, WebP, AVIF cho ảnh, MP4
  cho video; SVG chỉ cho `client-logo` qua `isSafeSvg` hiện có.
- Bản public: biến thể sinh ở lần dựng theo chuẩn site ([tải ảnh R1](media-delivery.md#r1-biến-thể-ảnh-nội-dung),
  [tải video](video-delivery.md)), đặt ở bucket public sau `media.truongthinhads.vn`; không bao giờ phát bản gốc.
- Xóa media đang được nội dung dùng trả 409 kèm danh sách chỗ dùng. Object không còn bản ghi nào trỏ tới (orphan) được
  dọn sau 30 ngày.
- Bản gốc ở bucket R2 private để lần dựng không cần PC bật; sao lưu tuần chép bản gốc về NAS (owner 2026-11-15, thay
  quyết định bản gốc trên NAS ngày 2026-10-12).

[CẦN LÀM RÕ: giới hạn cỡ file upload; thang video sinh ở lần dựng hay trên PC lúc upload.]

```gherkin
Given một card có hai ảnh cùng altVi
When lưu card
Then trả 400, nêu id hai media trùng alt, không bản ghi nào đổi
```

### R4. Card masonry

Card Advertising và card công trình dùng chung một contract [card nhiều media](media-card.md#r1-dữ-liệu-media-của-card):
người soạn chọn khung card trước trong 8 tỷ lệ của [layout-library R7](layout-library.md#r7-khung-ảnh-cố-định-từng-khối),
rồi đặt từng media vào khung bằng cách kéo, phóng; CMS chỉ lưu card, không tính gì lúc lưu: PC và tablet tự xếp lưới;
phone nhận lưới đầu dựng sẵn trong chính trang lưới (`script[data-phone-packs]` của `phonePacks()`, owner 2026-11-16,
masonry-live-layout R3), nên mỗi lần dựng hay preview phải dựng lại mọi trang lưới cùng artifact card trong một lần
dựng; lệch lần dựng thì phone tự xếp. Không có trường span.

| Trường | Card Advertising | Card công trình |
| --- | --- | --- |
| Tên VI/EN, mô tả | Có (tên ngách theo [taxonomy](advertising-taxonomy.md)) | Tên công trình, lấy từ trang |
| Phân loại | Sản phẩm, tag | Mảng Nhà ở hay Kinh doanh, loại công trình |
| Số media | 1 trở lên | 2 trở lên, luôn là card nhiều media (owner 2026-11-15) |
| Nguồn media | Upload vào card | Chỉ chọn trong media đã có trên trang chi tiết của công trình đó |
| Media bìa | `coverMediaId` | `coverMediaId` |
| Alt | Riêng từng media, không trùng trong card | Dùng alt của media trên trang |

Card công trình lưu tham chiếu tới media của trang cộng vùng crop theo khung card, không chép file. Gỡ một media khỏi
trang khi card đang dùng nó trả 409; card còn dưới 2 media thì trang không lưu được. Dữ liệu hiện tại (`card.media` là
file cắt riêng như `can-ho-hero-card-wide.webp`) đổi sang tham chiếu ở slice Public projection.

```gherkin
Given trang công trình có 6 media
When người soạn tạo card và chọn 1 media
Then trả 400 "card công trình cần ít nhất 2 media"
And danh sách chọn chỉ có 6 media của trang đó
```

### R5. Layout khóa theo số media

Khối trang công trình và News sẽ gọi chung theo media (owner 2026-11-15): `image-single` thành `media-single` (gộp
`video-single`), `image-pair` thành `media-pair`, `image-text` thành `media-text`, `gallery-carousel` thành
`media-carousel`; mỗi chỗ nhận ảnh hoặc video, khung theo [layout-library R7](layout-library.md#r7-khung-ảnh-cố-định-từng-khối)
(video cần poster cùng khung). Tới PR đổi tên, tên contract vẫn là `image-*` như layout-library và News; dữ liệu cũ đổi
theo trong cùng PR đó. `media-single` giữ bốn tỷ lệ của `image-single` cho ảnh, video chỉ nhận 16:9.

`layoutKey` của một khối là một id trong danh mục [layout-library R1](layout-library.md#r1-danh-mục-khối); id ngoài danh
mục bị từ chối ở R1. Khối chưa có renderer (`statement`, `location-list`, băng logo, banner CTA) hiện khóa tới khi PR
thêm renderer. Layout Bài News và Chi tiết công trình khóa cứng theo số media, theo bảng [News R3](news.md#r3-trang-bài)
và [công trình R4](projects.md#r4-ảnh-và-video-công-trình): mỗi dòng là một layout, mở khi bài có số media lớn hơn hoặc
bằng mức thấp nhất của dòng; dòng cao hơn khóa và admin ghi cần thêm mấy media. Mỗi dòng là một chuỗi khối cố định, mỗi
khối có số media tối thiểu, tối đa; chỗ hai bảng còn ghi "hoặc", "tùy chọn", "hai tới bốn" được plan chốt thành một
chuỗi, owner duyệt cùng plan. Sức chứa của dòng phải đủ mức cao nhất của dòng; dòng cuối (News 17+, công trình 13+) dồn
media dư vào `media-carousel` cuối. Dưới mức thấp nhất (News dưới 2, công trình dưới 4 media) bài lưu thành `draft`;
bài đã `published` mà lưu xuống dưới mức thì trả 400 ([CMS R5](cms.md#r5-lệnh-admin-có-kiểu)). Người soạn chọn layout đã mở rồi điền chữ và media; không thêm, bớt hay đổi thứ tự khối. Thêm layout hay khối mới là việc code qua PR. Field `template` cũ bỏ. Motion cố định theo layout và khối, CMS không có trường chỉnh
motion (owner 2026-11-15).

```gherkin
Given bài News có 5 media
When mở chọn layout
Then layout "2-5" mở, layout "6-11" khóa và ghi "thêm 1 media để mở"
And lệnh save với layout "6-11" trả 400
```

### R6. Trang chuẩn

Trang chủ, Nhà ở, Kinh doanh, About là layout chuẩn (owner 2026-11-15): người soạn chỉ sửa nội dung trong các slot có
sẵn (`page-copy`), không thêm khối mới. Xóa nội dung một slot thì slot hiện placeholder: chữ mẫu lorem ipsum và media
`placeholder-ngang` hoặc `placeholder-doc` theo khung, tới khi điền lại. Layout đã làm lại theo Espacio (PR #978,
2026-11-22): slot lấy theo section và hook của [trang chủ](page-home.md) và [trang chi tiết](detail-pages.md); số portal,
số mục quy trình là layout, không sửa được qua CMS. Advertising
giữ layout hiện tại, sửa nội dung qua card (R4).

```gherkin
Given người soạn xóa đoạn giới thiệu trên trang Nhà ở
When lưu
Then trang Nhà ở hiện đoạn lorem ipsum đúng khung đó, layout không đổi
```

### R7. Menu, liên hệ và CTA

Menu luôn có đúng 6 mục lớn (owner 2026-11-15). Mỗi mục lớn sửa được tiêu đề VI/EN, thứ tự và link; không thêm, không
xóa mục lớn. Mục con trong từng mục lớn thêm, xóa, sửa tiêu đề, link và thứ tự tự do. Navbar PC đọc cùng dữ liệu
([site shell R4](site-shell.md#r4-full-menu)). Cách liên hệ (Zalo, hotline, văn phòng, mạng xã hội) và mọi nút CTA
(floating CTA, nút Zalo cuối trang, nút trong menu, `contact-quick`) sửa được link và chữ hiển thị ở một chỗ
(`contact.json`); mọi nơi đọc từ đó, không ghi cứng link trong HTML. Link nội bộ chọn theo id trang, không gõ URL.

```gherkin
Given menu có 6 mục lớn
When người soạn xóa mục lớn thứ 3
Then trả 400; xóa một mục con của nó thì lưu được và menu, navbar đổi ở lần dựng sau
```

### R8. Soạn chữ

Người soạn có công cụ trình bày chữ như phần mềm dàn trang (owner 2026-11-15), theo đúng thang chữ Espacio đang chạy
(owner 2026-11-22, `detail.css` "Espacio type scale", [trang chi tiết](detail-pages.md#ui)); lưu thành dữ liệu có cấu
trúc, không lưu HTML thô. Danh sách theo đúng site hiện tại:

| Nhóm | Tùy chọn |
| --- | --- |
| Kiểu đoạn | Tiêu đề mục (400; 64, 56, 48, 40px theo 1200, 960, 750), Đoạn (400; 24, 20.8px), Nhãn (600, dòng nhỏ trên tiêu đề), Thẻ tên (500), Tiêu đề CTA (500; 64, 48px), Trích dẫn (cỡ Đoạn), Chữ nhỏ (16px, chú thích, metadata) |
| Trong dòng | đậm, nghiêng, chỉ số trên (m²), link, xuống dòng chủ ý, giữ cụm từ không tách dòng |
| Khối | danh sách gạch đầu dòng, danh sách số |

Slot quyết định kiểu đoạn nào được dùng, canh lề và màu chữ (ink trên giấy, trắng có bóng D trên ảnh); người soạn
không chọn cỡ chữ, khoảng chữ, khoảng dòng, màu hay font tự do. Hero giữ kiểu `hero-line` theo
[chữ hero](hero-typography.md). Mô tả card Advertising (`descriptionVi`, `descriptionEn`) là chữ thuần nhiều dòng (owner
2026-11-22): đoạn mở 1 tới 3 câu, các dòng bắt đầu bằng "• " là danh sách, một dòng kết; không HTML, markdown, tiêu đề
hay emoji; thụt lề do CSS, không lưu tab. Bộ kiểm chữ chạy khi lưu: không chữ mồ côi, dòng ngắt chủ ý không kết thúc bằng ",",
"." hay ";".

```gherkin
Given slot đoạn mở trang Nhà ở chỉ nhận kiểu Đoạn
When gửi một khối kiểu Tiêu đề CTA vào slot đó
Then trả 400, dữ liệu chữ không đổi
```

### R9. Tìm kiếm ngữ nghĩa và hỗ trợ nhập

Phần này không thuộc gate Contract: thread tìm kiếm chốt model và cách tính vector trong spec tìm kiếm; dưới đây là
hướng owner duyệt 2026-11-15 ([hướng tìm kiếm](https://claude.ai/artifact/6zTDE4jQfcjrbP3tax9kXx), mục "Khi CMS thêm, sửa, xóa
media"; thread tìm kiếm sở hữu phần tìm). Lúc lưu, CMS gọi Worker Cloudflare tính vector bằng Workers AI
`@cf/google/embeddinggemma-2`, không chạy trên máy người soạn: mỗi media một vector (ảnh cộng alt; video lấy frame 1 giây
một frame cộng poster), mỗi card một vector chữ (tên, mô tả, sản phẩm, cụm, tag). Nháp chỉ người dùng CMS tìm được. Đổi
model thì tính lại toàn bộ một lần. Site không lưu nhật ký tìm kiếm.

| Thao tác | Vector và lớp từ khóa |
| --- | --- |
| Thêm card hoặc media | Tạo vector, cập nhật từ khóa |
| Sửa tên, mô tả | Tính lại vector chữ của card |
| Sửa alt hoặc thay media | Tính lại vector của media đó |
| Xóa | Gỡ vector và từ khóa |

Worker lỗi thì card vẫn lưu, vẫn tìm được theo từ khóa; vector tính lại sau. Không có trường từ khóa riêng: lớp từ khóa
tự dựng từ tên, mô tả, alt (bỏ dấu) cộng bảng từ đồng nghĩa chung lấy từ dữ liệu Keyword Planner. Keyword Planner không
chạy lại khi CRUD, chỉ chạy lại 6 tháng một lần hoặc khi thêm nhóm sản phẩm; sau này bảng đồng nghĩa sửa được trong cài
đặt CMS.

Hỗ trợ nhập lúc upload (phase sau): Gemma 4 trên Workers AI đọc ảnh, soạn nháp tên, mô tả, alt VI/EN theo luật chữ của
owner; 5 ảnh giống nhất gợi ý sản phẩm, nhóm, tag; gợi ý Keyword Planner hiện khi gõ; kiểm trước khi lưu (alt không
trùng trong card, độ dài, chữ mồ côi). Không lưu gì tới khi người soạn bấm.

```gherkin
Given Worker tính vector đang lỗi
When người soạn lưu một card mới
Then card lưu và tìm được theo từ khóa, vector được tính lại khi Worker chạy lại
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Data | `src/site/content/*.json` | File chiếu R1 |
| Hàm | validator dùng chung (`blocks.mjs`, `block-pages.mjs`, `content-contract.mjs`, `media-contract.mjs`) | R1 tới R5; Worker và build gọi cùng module |

## UI

Admin theo [editor](cms-editor.md); trang public giữ UI của spec từng trang.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1, R2, R5 | validator dùng chung trên fixture và bản chụp ([test không phụ thuộc nội dung](content-independent-tests.md)); cần thêm: layout khóa theo số media |
| R3 | `pnpm qa:worker:security` (WebP, SVG an toàn); cần thêm: loại, cỡ, poster, alt trùng, orphan, crop |
| R4 | `media-contract.mjs` hôm nay; cần thêm: card công trình từ 2 media, media thuộc trang |
| R6, R7, R8 | chưa có; cần: placeholder slot, 6 mục menu, CTA đọc một nguồn, bộ kiểm chữ |
| R9 | chưa có; cần: CRUD cập nhật vector, Worker lỗi vẫn lưu và thử lại |

## Gate còn mở

Gate trước CMS (owner 2026-11-15, mỗi gate phỏng vấn owner trước): làm lại layout trang chuẩn theo Espacio (R6) xong
ở PR #978. Motion chuyển trang giữa hero ảnh và hero trắng đã xong ở PR #966 ([logo route](logo-route-crossfade.md)); trang
chỉ gắn đúng layout, không có tham số motion.

## Chú thích thuật ngữ

- **File chiếu**: file JSON CMS sinh ra cho build tĩnh đọc.
- **Slot**: chỗ đặt nội dung cố định trong một trang chuẩn.
- **Placeholder**: nội dung tạm hiện khi slot trống.
- **Layout khóa**: chuỗi khối cố định, chỉ mở khi bài đủ số media.
- **Token**: giá trị thiết kế đặt tên sẵn (cỡ chữ, màu, khoảng cách) trong Design System.
