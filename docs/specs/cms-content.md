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
rồi đặt từng media vào khung bằng cách kéo, phóng; CMS chỉ lưu card, không tính cache bố cục: máy người xem tự xếp
lưới (owner 2026-11-15 bỏ cache dựng sẵn), không có trường span.

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

Khối trang công trình và News gọi chung theo media (owner 2026-11-15): `image-single` thành `media-single` (gộp
`video-single`), `image-pair` thành `media-pair`, `image-text` thành `media-text`, `gallery-carousel` thành
`media-carousel`; mỗi chỗ nhận ảnh hoặc video, khung theo [layout-library R7](layout-library.md#r7-khung-ảnh-cố-định-từng-khối)
(video cần poster cùng khung). Đổi tên là việc code của plan, dữ liệu cũ đổi theo trong cùng PR.

`layoutKey` của một khối là một id trong danh mục [layout-library R1](layout-library.md#r1-danh-mục-khối); id ngoài danh
mục bị từ chối ở R1. Khối chưa có renderer (`statement`, `location-list`, băng logo, banner CTA) hiện khóa tới khi PR
thêm renderer. Layout Bài News và Chi tiết công trình khóa cứng theo số media, theo bảng [News R3](news.md#r3-trang-bài)
và [công trình R4](projects.md#r4-ảnh-và-video-công-trình): mỗi dòng là một layout, mở khi bài có số media lớn hơn hoặc
bằng mức thấp nhất của dòng; dòng cao hơn khóa và admin ghi cần thêm mấy media. Người soạn chọn layout đã mở rồi điền chữ
và media; không thêm, bớt hay đổi thứ tự khối. Media vượt sức chứa khối đơn dồn vào `media-carousel` trong giới hạn của
dòng. Thêm layout hay khối mới là việc code qua PR. Field `template` cũ bỏ. Motion cố định theo layout và khối, CMS không có trường chỉnh
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
`placeholder-ngang` hoặc `placeholder-doc` theo khung, tới khi điền lại. Layout các trang này đang làm lại theo Espacio
ở gate riêng (trang chủ, `/en/interior-design`, `/en/kitchens`, `/en/about-us`); slot chốt theo layout mới. Advertising
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

Người soạn có công cụ trình bày chữ chuyên sâu như phần mềm dàn trang (owner 2026-11-15); mọi tùy chọn đi qua token của
[Design System](../../design-system/README.md), lưu thành dữ liệu có cấu trúc, không lưu HTML thô. Bộ kiểm chữ chạy khi
lưu: không chữ mồ côi, dòng ngắt chủ ý không kết thúc bằng "," hay ".".
[CẦN LÀM RÕ: owner duyệt danh sách tùy chọn. Agent đề xuất: kiểu đoạn (tiêu đề cấp 1 tới 3, dòng nhỏ trên tiêu đề, đoạn
mở, đoạn thường, trích dẫn, chú thích); đậm, nghiêng, gạch chân; chỉ số trên (m²); link; danh sách; canh trái, giữa,
phải; xuống dòng chủ ý và giữ cụm từ không tách dòng; bậc cỡ chữ, khoảng chữ, khoảng dòng theo token; màu trong bảng màu
Design System; chữ cái lớn đầu đoạn.]

```gherkin
Given người soạn chọn màu chữ ngoài bảng màu Design System
When lưu
Then trả 400, dữ liệu chữ không đổi
```

### R9. Tìm kiếm ngữ nghĩa và hỗ trợ nhập

Owner duyệt 2026-11-15 (thread tìm kiếm ngữ nghĩa). Lúc lưu, CMS gọi Worker Cloudflare tính vector, không chạy trên máy
người soạn; mỗi media một vector, video lấy tới khoảng 10 giây hoặc từng đoạn 15 giây với clip dài.

| Thao tác | Vector và lớp từ khóa |
| --- | --- |
| Thêm card hoặc media | Tạo vector, cập nhật từ khóa |
| Sửa tên, mô tả, alt | Tính lại vector chữ |
| Thay media | Tính lại vector của media đó |
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

Gate trước CMS (owner 2026-11-15, mỗi gate phỏng vấn owner trước): làm lại layout trang chuẩn theo Espacio (R6) còn
mở. Motion chuyển trang giữa hero ảnh và hero trắng đã xong ở PR #966 ([logo route](logo-route-crossfade.md)); trang
chỉ gắn đúng layout, không có tham số motion.

## Chú thích thuật ngữ

- **File chiếu**: file JSON CMS sinh ra cho build tĩnh đọc.
- **Slot**: chỗ đặt nội dung cố định trong một trang chuẩn.
- **Placeholder**: nội dung tạm hiện khi slot trống.
- **Layout khóa**: chuỗi khối cố định, chỉ mở khi bài đủ số media.
- **Token**: giá trị thiết kế đặt tên sẵn (cỡ chữ, màu, khoảng cách) trong Design System.
