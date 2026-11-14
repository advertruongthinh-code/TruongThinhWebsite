---
title: Thư viện layout trang và khối
status: planned
source:
  - scripts/site/blocks.mjs
tests:
  - tests/site/blocks.test.mjs
notion: https://app.notion.com/p/3f7332849a0e8189870ce4b4dfc502bf
updated: 2026-11-14
---

# Thư viện layout trang và khối

## Mục đích

Một bộ mẫu trang và khối nội dung đã duyệt, dùng chung cho site tĩnh và CMS: mỗi trang là một chuỗi khối, mỗi khối là
dữ liệu VI/EN có kiểu cố định, render ra HTML tĩnh. Điểm xuất phát là [khảo sát bố cục Espacio](https://claude.ai/artifact/RFPAHbDHRa4tXa7pS1AoEy)
(292 trang, 39 khối, 2026-10-12); từng mẫu được chỉnh cho hợp Trường Thịnh, không chép 1:1. Module `layout-library`
trong capability map CMS phase 2. Soạn bài thuộc `cms-editor`, media thuộc `cms-media`, xuất bản thuộc `cms-publish`.
Phạm vi bản đầu (owner 2026-10-26): mẫu Espacio chỉ dùng cho News và hai trang công trình nhà ở, kinh doanh. Trang đang có
(trang chủ, Nhà ở, Kinh doanh, Giới thiệu, Sản phẩm quảng cáo) giữ layout hiện tại; CMS chỉ sửa chữ và ảnh trong các khối
của chúng ([CMS editor](cms-editor.md)).

## Hành vi

### R1. Danh mục khối

Đợt nước rút tới CMS (owner 2026-11-07): mẫu Chi tiết công trình lấy theo 47 trang con `/en/projects/` của Espacio, mẫu
Bài News theo 26 trang con `/en/news/` (owner duyệt 17:43). Số trang dùng mỗi khối, từ khảo sát 2026-10-12:

| Khối | Chi tiết công trình (47) | Bài News (26) |
| --- | --- | --- |
| `hero-project` | 47 | |
| `section-title` | 47 | 26 |
| `paragraph` | 47 | 24 |
| `facts-grid` | 47 | |
| `project-slider` | 47 | |
| `cta-arrow` | 47 | 26 |
| `image-single` | 43 | 25 |
| `gallery-carousel` | 42 | 19 |
| `contact-quick` (form đặt lịch và nút chat, đổi sang Zalo) | 32 | |
| `image-pair` | 29 | 19 |
| `video-single` | 8 | 2 |
| `news-cards` | | 26 |
| `banner-links` | 1 | 13 |
| `quote` | | 4 |
| `paragraph-columns` | 1 | 4 |

Cộng `news-list` cho trang danh sách News. Các khối còn lại (`hero-fullscreen`, `statement`, `project-masonry`,
`location-list`) để sau. Chỉ các khối trong bảng được dùng. Tên khối là id cố định; "Espacio" là khối gốc trong khảo sát. Đề xuất giữ hay bỏ là
của Claude, owner duyệt từng dòng `[CẦN LÀM RÕ: owner đánh dấu giữ, bỏ, sửa]`.

| Id khối | Espacio | Dữ liệu chính | Dùng khi | Đề xuất |
| --- | --- | --- | --- | --- |
| `hero-fullscreen` | `layout-portada` | 1 đến 3 slide ảnh hoặc video, tiêu đề hai dòng | Mở trang mảng dịch vụ, trang chủ | Giữ |
| `hero-project` | `layout-hero-banner` | Ảnh nền, tên công trình (dòng nhỏ chữ hoa), `tagline` 1 đến 3 dòng có một `*chữ nghiêng*`, nút tới khối Zalo khi trang có `contact-quick` | Mở trang công trình | Giữ |
| `section-title` | `layout-titular` (thêm biến thể nửa trang) | Tiêu đề | Mở một ý mới | Giữ |
| `paragraph` | `layout-parrafo` | Đoạn văn | Mọi trang | Giữ |
| `paragraph-columns` | `layout-parrafo-columnas` | Đoạn văn hai cột | Bài dài | Giữ |
| `image-single` | `layout-imagen-unica` và 6 biến thể | 1 ảnh; vị trí rộng, 2/3 trái hoặc phải, 1/2 trái hoặc phải | Nhịp ảnh trong bài | Giữ |
| `image-text` | `layout-parrafo -layout-right` | 1 ảnh dọc cột trái 1/3, đoạn văn cột phải 2/3 cách 35px; phone ảnh trên chữ dưới | Ảnh cạnh đoạn văn trang công trình | Giữ |
| `image-pair` | `layout-imagen-doble` 3 biến thể | 2 ảnh; bằng nhau, trái lớn, phải lớn | So sánh, chi tiết | Giữ |
| `video-single` | `layout-imagen-unica -video` | 1 video có poster | Video thi công | Giữ |
| `gallery-carousel` | `layout-galeria` | Tới 12 ảnh hoặc video, chú thích | Bộ ảnh công trình | Giữ |
| `facts-grid` | `layout-bloque-facts` 2, 3, 4 cột | Ô đánh số: nhãn, mô tả | Thông tin công trình, quy trình 6 bước | Giữ |
| `banner-links` | `layout-bloque-banners` 1, 2, 3 cột | Ảnh, tiêu đề, link | Dẫn sang ba mảng dịch vụ | Giữ |
| `news-cards` | `layout-bloque-noticias` | 3 bài News tự lấy theo nhóm khi không ghi `newsIds` (`autoNewsIds`) | Cuối bài News; trang chủ dùng dải News riêng theo Espacio ([news R4](news.md#r4-news-trên-các-trang-khác)) | Giữ |
| `project-slider` | `layout-slider-proyectos` | Tất cả công trình cùng mảng, tự lấy khi không ghi `projectIds` (`autoProjectIds`) | Residential, Commercial, cuối trang công trình | Giữ |
| `cta-arrow` | `layout-ctas` | Một dòng chữ, link, mũi tên | Xem toàn bộ công trình, xem tất cả News | Giữ |
| `quote` | `layout-quote` | Trích dẫn, người nói | Bài News | Giữ |
| `statement` | `layout-bloque-compromiso` | Câu tuyên bố chữ lớn, ảnh | Trang chủ, About | Giữ |
| `project-masonry` | `layout-masonry` | Toàn bộ công trình, bộ lọc nhóm | Trang toàn bộ công trình, dạng masonry Advertising | Giữ |
| `news-list` | lưới News | Toàn bộ bài, bộ lọc 4 nhóm | Trang News | Giữ |
| `contact-quick` | viên WhatsApp, form đặt lịch | Nút Zalo, đặt lịch khảo sát | Cuối trang công trình, liên hệ | Giữ, đổi sang Zalo |
| `location-list` | danh sách showroom | Địa chỉ, giờ, bản đồ | Xưởng, văn phòng | Giữ |
| (bỏ) | Outlet, Vitra, lưới sản phẩm bán, thanh lọc Outlet, khối thương hiệu | | Trường Thịnh không bán lẻ | Bỏ |

```gherkin
Given dữ liệu một trang có khối id không nằm trong danh mục
When build hoặc xuất bản
Then báo lỗi tên khối và không sinh trang đó
```

### R2. Mẫu trang

Mỗi mẫu là chuỗi khối mặc định cùng danh sách khối được thêm. Admin thêm, bớt, đổi thứ tự khối trong danh sách cho phép
của mẫu; khối bắt buộc không bỏ được.

| Mẫu | Theo Espacio | Bắt buộc | Chuỗi mặc định (rút gọn) |
| --- | --- | --- | --- |
| Trang chủ | `/en` | `hero-fullscreen`, `news-cards` | hero, news-cards, banner-links, statement, cta-arrow, project-slider |
| Công trình nhà ở | `/en/interior-design` | `hero-fullscreen`, `project-slider`, `cta-arrow` | hero, section-title, paragraph, image-single, gallery-carousel, banner-links, project-slider, cta-arrow (hình 1 owner) |
| Công trình kinh doanh | `/en/kitchens` | như Công trình nhà ở | như Công trình nhà ở, thêm location-list (cta-arrow theo hình 2 owner) |
| Toàn bộ công trình | `/en/projects` | `hero-project`, `project-masonry` | hero-project, project-masonry |
| Chi tiết công trình | `/en/projects/<slug>` (47 trang, 11 đến 27 khối) | `hero-project`, `facts-grid`, `project-slider` | hero-project, section-title, paragraph, gallery-carousel, facts-grid, image-single, paragraph, contact-quick, project-slider, cta-arrow |
| News | `/en/news` | `news-list` | section-title, news-list |
| Bài News | `/en/news/<slug>` (26 trang, 7 đến 19 khối) | `section-title`, `news-cards` | section-title, paragraph, image-single, gallery-carousel, image-pair, quote, news-cards, cta-arrow |
| About, Liên hệ | `/en/about-us`, `/en/contact` | `hero-fullscreen` hoặc `section-title` | theo khảo sát |

Trang chủ, About và Advertising giữ layout hiện tại trong bản đầu (owner 2026-10-26); dòng mẫu của chúng ở bảng trên chỉ để tham khảo sau.

Dàn chữ trang công trình và News theo số đo Espacio (owner 2026-11-08, 75 trang): đoạn văn 24px trên PC, 20,8px trên phone, giãn
dòng 1,4, cột rộng tối đa 600px ở nửa phải, thụt dòng đầu 100px trên PC, 50px trên phone; phone khối cách nhau 30px, lề 15px.

```gherkin
Given bài News đang soạn
When admin xóa khối news-cards
Then giao diện không cho xóa và nêu khối này bắt buộc
```

### R3. Chỉnh cho hợp Trường Thịnh

Mỗi khối được thiết kế lại theo Design System (màu, chữ, khoảng cách, Kính, motion của Trường Thịnh) qua Impeccable cho PC
và phone; owner duyệt thiết kế trước khi code. Không dùng logo, chữ, ảnh hay mã nguồn của Espacio.

```gherkin
Given một khối chưa có thiết kế được owner duyệt
When agent chuẩn bị code khối đó
Then dừng lại và gửi owner bản thiết kế
```

### R4. Dữ liệu và render tĩnh

Bộ dựng là `scripts/site/blocks.mjs` (`validateBlockPage`, `renderBlocks`, version 1); `content-contract` kiểm
`src/site/content/projects.json` và `news.json`. Bản 1: chữ là đoạn thường tách bằng dòng trống, chưa có đậm, nghiêng, link
trong đoạn (riêng `tagline` của `hero-project` có tối đa một cụm `*nghiêng*` mỗi dòng); ảnh tham chiếu bằng đường dẫn `/assets/content/*.webp` kèm kích thước thật (kiểm bằng `validateImage` của `scripts/site/lib.mjs`, [phát hành tĩnh R1](static-release.md#r1-build-site-output-từ-srcsite)), chưa theo id thư viện media. Mỗi khối có schema dữ liệu có version: trường chữ VI/EN, media tham chiếu theo id, link nội bộ theo id trang. Chữ chỉ có
đoạn, đậm, nghiêng, link; không nhận HTML, CSS hay script. Cùng dữ liệu luôn ra cùng HTML. Thiếu bản EN thì không xuất bản
được bản EN, không đoán.

```gherkin
Given trường chữ chứa "<script>"
When render khối
Then trang hiện đúng chuỗi ký tự đó như chữ thường, không chạy script
```

### R5. Phone, motion và media

Thứ tự khối trên phone giống PC (đúng như Espacio trên mọi trang khảo sát); mỗi khối định nghĩa bố cục phone riêng.
Motion dùng hook có sẵn trong [Motion](../../design-system/motion.md) (chữ hiện theo dòng hoặc từ, ảnh zoom khi cuộn
tới, carousel), tôn trọng giảm chuyển động. Mọi ảnh và video tuân luật không vùng đen của `cms-media`.

```gherkin
Given viewport 390px
When mở một trang công trình
Then các khối hiện cùng thứ tự với PC và không khối nào tràn ngang
```

### R6. Ghi chú cho người và AI

Mỗi khối và mẫu có ghi chú "dùng khi nào, không dùng khi nào", số chữ gợi ý và cỡ ảnh tối thiểu. Trang soạn bài và cầu
nối AI agent đọc cùng ghi chú này để gợi ý chuỗi khối.

```gherkin
Given AI agent soạn một bài News
When hỏi danh mục khối
Then nhận đúng các khối được phép cho mẫu Bài News kèm ghi chú
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Data | danh mục khối có version | id, schema, ghi chú (R1, R4, R6) |
| Data | danh mục mẫu trang | khối mặc định, bắt buộc, được thêm (R2) |
| Hàm | render khối | dữ liệu khối sang HTML tĩnh, xác định (R4) |

## UI

Khối đang chạy trên site mô tả ở [Khối công trình và News](../../design-system/components/Blocks/README.md) và
[Danh sách News](../../design-system/components/NewsList/README.md); thiết kế khối owner đã duyệt nhưng chưa code ghi trong
spec này ([Design System R1](design-system.md#r1-cấu-trúc-và-token)). Spec này chỉ link token, không chép.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1, R4 | `node --test tests/site/blocks.test.mjs` (đủ mọi kiểu khối, cùng dữ liệu ra cùng HTML, escape chữ, báo đủ lỗi schema, cỡ ảnh khớp file) |
| R2, R3, R5, R6 | chưa có test |

## Gate còn mở

- Owner đánh dấu giữ, bỏ, sửa từng khối ở R1 và trả lời câu ở R2.
- Ảnh menu hamburger Espacio khi mở chưa chụp được; khảo sát motion chi tiết dùng lại audit cũ trong Git
  (`3afef50:docs/reports/REFERENCE-MOTION-AUDIT.md`) khi thiết kế.
- Masonry công trình dùng chung hình học với [masonry Advertising](advertising-masonry.md) hay bản riêng: quyết khi viết spec `projects`.

## Chú thích thuật ngữ

- **Khối**: một section của trang (hero, đoạn văn, ảnh đôi...), có kiểu dữ liệu cố định.
- **Mẫu trang**: chuỗi khối mặc định cho một loại trang.
- **Schema**: mô tả các trường dữ liệu một khối nhận.
- **Render tĩnh**: sinh sẵn HTML từ dữ liệu, khách xem không cần database.
- **Impeccable**: quy trình thiết kế giao diện dùng trong project.
