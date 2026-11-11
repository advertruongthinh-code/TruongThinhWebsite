---
title: Công trình nhà ở và kinh doanh
status: planned
source:
  - scripts/site/block-pages.mjs
  - scripts/site/project-list.mjs
  - src/site/content/projects.json
  - src/site/content/menu.json
tests:
  - tests/site/static-locales.test.mjs
  - tests/site/blocks.test.mjs
  - tests/site/block-pages.test.mjs
  - tests/site/block-pages.e2e.mjs
notion: https://app.notion.com/p/3f7332849a0e8189870ce4b4dfc502bf
updated: 2026-11-11
---

# Công trình nhà ở và kinh doanh

## Mục đích

Bằng chứng công trình thật cho hai mảng thiết kế thi công không gian nhà ở và không gian kinh doanh: trang mảng (Residential,
Commercial) có dải công trình cùng mảng, trang toàn bộ công trình dạng masonry, và trang chi tiết từng công trình. Module
`projects` trong capability map CMS phase 2. Bố cục theo Espacio (`/en/interior-design`, `/en/kitchens`, `/en/projects`, 47
trang chi tiết trong [khảo sát](https://claude.ai/artifact/RFPAHbDHRa4tXa7pS1AoEy)), chỉnh qua [layout-library](layout-library.md).

## Hành vi

### R1. Dải công trình trên trang Nhà ở và Kinh doanh

Trang Nhà ở và Kinh doanh đang có thêm cuối trang một dải công trình (`project-slider`) và một dòng chữ có mũi tên
(`cta-arrow`) như Espacio `/en/interior-design` và `/en/kitchens` (owner chọn 2026-11-07, xem ảnh chụp trong thread): PC là
hàng ảnh dọc so le cao thấp, tên công trình dưới ảnh; phone là dải trượt ngang. Nhà ở theo hình 1 (chữ đậm), Kinh doanh
theo hình 2 (chữ mảnh). Phần còn lại của hai trang giữ layout hiện tại. Dải tự lấy tất cả công trình cùng mảng, theo thứ tự
trong dữ liệu (owner 2026-11-08); bấm ảnh mở trang chi tiết (R3). Dòng mũi tên "Xem các công trình nhà ở" (hoặc kinh doanh) dẫn tới trang lọc cùng mảng (R2).
Nội dung nằm sẵn trong khối dữ liệu CMS sửa được ([layout-library](layout-library.md)); media thiếu tạo bằng ChatGPT qua Codex CLI (owner 2026-11-07)
theo [Tạo ảnh](../operations/agent-rule-ad-images.md#tạo-ảnh) (owner 2026-10-26).

```gherkin
Given dữ liệu có 5 công trình mảng nhà ở
When lần dựng xong
Then cuối trang Nhà ở hiện đủ 5 công trình đó trong dải, bấm một ảnh mở trang chi tiết công trình đó
```

### R2. Trang toàn bộ công trình

Dạng masonry như trang Advertising (owner 2026-10-12), hero tiêu đề hai dòng như `/en/projects`. Bộ lọc: Nhà ở, Kinh doanh và
loại con (căn hộ, nhà phố, homestay; shop, F&B, showroom, văn phòng), lọc nhiều điều kiện như admin. Thẻ là [card nhiều media](media-card.md#r1-dữ-liệu-media-của-card)
(owner 2026-11-09): người soạn đặt khung thẻ (`card.width`, `card.height`) rồi chọn ảnh cho thẻ (`card.media`, theo
thứ tự chọn); mọi ảnh khít đúng tỷ lệ khung, không vùng dư (`kindFieldErrors` chặn); không chọn thì thẻ chỉ có ảnh bìa. CMS theo đúng flow này.
Bấm thẻ mở trang chi tiết (R3), không mở viewer ảnh như Advertising. Mỗi bộ lọc có đường dẫn riêng crawl được.
Bản đầu (owner 2026-11-08): `/<locale>/projects/` và trang lọc `/<locale>/projects/nha-o/`, `/kinh-doanh/`. Trang giống trang
Sản phẩm quảng cáo (owner 2026-11-08): dựng trên khung trang đó (`scripts/site/project-list.mjs`; phần lưới, batch skeleton, CTA đuôi lấy nguyên từ HTML trang quảng cáo, chỉ đổi nhãn, thẻ tĩnh, chữ CTA, nên một contract DOM masonry cho hai trang): hero nền trắng, kicker "Công trình tiêu biểu" (EN "Our featured projects") và
khẩu hiệu hai dòng "Những công trình / truyền cảm hứng" (EN "Projects / that inspire"), chỉ chữ nhấn "cảm hứng" ("inspire") đậm nghiêng (owner 2026-11-08), hàng lọc canh giữa, dòng "Cuộn xuống", masonry giống 1:1 trang quảng cáo
(owner 2026-11-08): chạy chính runtime [masonry Advertising](advertising-masonry.md) (`masonry/runtime.mjs`) với artifact công trình
nhúng trong trang (`buildProjectArtifact`), nên lưới, batch skeleton, kính cung và CTA đuôi, motion thẻ, cuộn, lọc, tải ảnh, ảo hóa
giống hệt; mảng là category, loại là cụm (`clusterIds`), thẻ xếp ngẫu nhiên mỗi lần vào. Khác trang quảng cáo: không detail view,
related, gợi ý, chip sản phẩm (`viewer: false`), trang không nhúng khung detail ẩn; bấm thẻ đi thẳng tới trang chi tiết công trình. Kicker và khẩu hiệu giữ nguyên ở mọi bộ lọc (owner 2026-11-08); khẩu hiệu là h1, bộ lọc chỉ khác title,
mô tả và URL. Thẻ có ảnh bìa ngang từ tỷ lệ vàng (`w/h >= 1.618`) trải hai cột ở lưới từ 3 cột như [masonry R5](advertising-masonry.md#r5-hình-học-masonry) (owner 2026-11-09). Bố cục lấy từ cache tính lúc build, nhúng trong artifact (`layouts`, mọi bộ lọc trên 5 dải bề rộng, [cache bố cục R3](masonry-layout-cache.md#r3-file-cache)); không có file cache riêng.
Thẻ có tên công trình (`titleVi`/`titleEn`, đổi theo ngôn ngữ) nằm trên trái trong media như mọi card masonry (owner
2026-11-10, thay tên dưới media của 2026-11-09): chuột thật hiện tên và lớp tối Pinterest khi hover, cảm ứng không hiện
tên; thẻ cao đúng bằng media, batch skeleton không chừa chỗ tên ([media-card R2](media-card.md#r2-canvas-và-hàng-pill-trong-media),
[R3](media-card.md#r3-đổi-media-trên-card)). Thẻ không zoom. Link thẻ lấy tên từ tên hiển thị qua
`aria-labelledby` (tên hiển thị `aria-hidden` để không đọc lặp). Màu chờ ảnh là màu chủ đạo ảnh bìa (build tính bằng sharp). CTA đuôi
"Không gian tiếp theo dành cho bạn". Không JavaScript thì thẻ tĩnh trong noscript. Dòng mũi tên dưới dải R1 dẫn tới trang lọc cùng mảng; slug công trình không được
trùng slug lọc. Loại con (owner 2026-11-08, cho menu site): `nha-pho`, `can-ho`, `homestay-hotel` thuộc Nhà ở;
`showroom-cua-hang`, `cafe-nha-hang`, `van-phong` thuộc Kinh doanh; mỗi loại một trang lọc `/<locale>/projects/<loại>/`
luôn có để link menu không 404, loại chưa có công trình hiện "đang cập nhật" và `noindex`. Hàng lọc chỉ hiện bộ lọc có công
trình, cộng bộ lọc của trang đang xem. Mảng, loại, nhãn lấy từ `PROJECT_TYPES` của `scripts/site/block-pages.mjs`.
Công trình tiêu biểu trên menu site đọc `src/site/content/menu.json` (`featuredProjects`, thứ tự hiển thị; CMS sửa được);
cùng file giữ `featuredProductGroups` cho nhóm sản phẩm quảng cáo tiêu biểu, rỗng thì lấy nhóm nhiều thẻ nhất (`menuFeatured`).
`scripts/ci/content-contract.mjs` báo id không tồn tại hoặc lặp.

```gherkin
Given có 40 công trình, 25 nhà ở
When chọn lọc Nhà ở rồi bấm một thẻ
Then còn 25 thẻ và trang chi tiết công trình đó mở ra

Given /en/projects/ trên điện thoại 390px
When lưới dựng xong
Then thẻ cao đúng bằng media, tên tiếng Anh không hiện trên cảm ứng nhưng là tên link của thẻ
```

### R3. Trang chi tiết công trình

Theo mẫu Chi tiết công trình của [layout-library R2](layout-library.md): hero hai dòng có ảnh hoặc video, nền tối
và lớp phủ .hero-shade như hero các trang tĩnh (owner 2026-11-08), đoạn giới thiệu,
carousel, ô thông số (`facts-grid`: loại công trình, địa điểm, diện tích, năm hoàn thành, hạng mục Trường Thịnh làm), các khối
ảnh và chữ do người soạn ghép, khối liên hệ Zalo và đặt lịch khảo sát, dải công trình khác và dòng xem toàn bộ. Tên chủ nhà
hay doanh nghiệp chỉ hiện khi owner xác nhận khách đồng ý. Dữ liệu cấu trúc `Article` và `BreadcrumbList`.
Mỗi công trình là một mục trong `src/site/content/projects.json` (`id`, `sector`, `type`, `slugVi`, `slugEn`, tên, mô tả, ảnh bìa,
chuỗi khối); `scripts/site/block-pages.mjs` dựng trang từ khung trang Nhà ở (header, menu, footer), namespace `project`,
route `/vi/projects/<slugVi>/` và `/en/projects/<slugEn>/` cùng một file nguồn. Công trình mẫu chỉ ghi loại, phong cách,
hạng mục, không ghi tên khách, địa chỉ, năm, diện tích bịa (owner 2026-11-07); thay bằng công trình thật trước khi lên domain.

```gherkin
Given công trình chưa có xác nhận khách đồng ý nêu tên
When xuất bản
Then trang chỉ ghi loại công trình và khu vực, không có tên khách
```

### R4. Ảnh và video công trình

Ảnh, video theo [card nhiều media](media-card.md) và [tải ảnh](media-delivery.md). Không bắt buộc ảnh chụp thô: ảnh công trình có thể chụp thực tế rồi nhờ AI
hiệu chỉnh, hoặc do AI tạo; mọi ảnh qua gate chấm ảnh và người duyệt (owner 2026-10-12). Nguồn ảnh ghi một trong ba: chụp,
chụp và AI hiệu chỉnh, AI tạo; dấu nguồn chỉ hiện trong admin. Thẻ và trang công trình có nhiều media theo
[card nhiều media](media-card.md) (mọi media cùng tỷ lệ cover, alt VI/EN riêng, không trùng) và SEO như
[SEO media](media-seo.md): HTML đọc được khi không chạy JavaScript, JSON-LD, ảnh vào image sitemap.

Số ảnh và bố cục (owner 2026-11-08): bảng dưới là cơ sở để tạo ảnh và chọn layout cho trang công trình, sau này CMS
dùng để gợi ý layout theo số ảnh. Rút từ 47 trang con `/en/projects/` của Espacio (số ảnh ít nhất 4, trung vị 9). Ảnh đầu
luôn là hero ngang 3:2; mỗi khối ảnh đứng sau một đoạn văn, không hai khối ảnh liền nhau; mọi chuỗi kết thúc bằng
`contact-quick`, `cta-arrow`. Công trình mẫu dùng 6 ảnh; hai nhà phố Indochine,
Japandi dùng 12 ảnh, nhiều cận đồ gỗ tấm (owner 2026-11-09). Ảnh chưa duyệt dùng ảnh giữ chỗ `placeholder-ngang`,
`placeholder-doc` (owner 2026-11-09: dựng trang trước, thay ảnh khi owner Lấy).

| Số ảnh | Chuỗi khối ([layout-library](layout-library.md)) |
| --- | --- |
| 4-5 | `hero-project`, `section-title`, `paragraph`, `facts-grid`, `image-single`, `paragraph`, `image-single`, `paragraph`, `image-pair` |
| 6-7 | `hero-project`, `section-title`, `paragraph`, `gallery-carousel` (3), `facts-grid`, `paragraph`, `image-single`, `paragraph`, `image-single` |
| 8-9 | như 6-7, `gallery-carousel` 5 ảnh, thêm `paragraph`, `image-pair` |
| 10-12 | như 8-9, thêm `paragraph`, `image-single` |
| 13+ | `gallery-carousel` (5), `facts-grid`, hai cặp `paragraph`, `image-pair`, `gallery-carousel` thứ hai (3-4), `paragraph`, `image-single` |

```gherkin
Given bản nháp công trình mới có ảnh AI tạo chưa qua gate
When owner bấm xuất bản
Then bị chặn và thấy ảnh nào còn thiếu điểm chấm
```

### R5. Liên kết qua lại

Mỗi công trình gợi ý 2 đến 3 bài News liên quan ([news R4](news.md)); bài News nhắc tới công trình thì link tới trang công
trình. Đường dẫn `/vi/projects/<slug>/`, `/en/projects/<slug>/`; đổi slug sau khi đăng có redirect 301.

```gherkin
Given bài News nhóm Không gian kinh doanh nói về thiết kế quán cà phê
When mở trang một công trình quán cà phê
Then thấy bài đó trong phần bài liên quan
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Data | công trình: mảng, loại, địa điểm, diện tích, năm, hạng mục, thứ tự, đồng ý nêu tên, khối, SEO | R1 đến R5 |
| Route | `/<locale>/projects/`, bộ lọc, `/<locale>/projects/<slug>/` | R2, R3, R5 |
| Khối | `hero-project`, `project-slider`, `project-masonry`, `facts-grid`, `contact-quick`, `cta-arrow` | [layout-library](layout-library.md) |

## UI

Trang toàn bộ công trình dùng [Masonry](../../design-system/components/Masonry/README.md) và [MediaCard](../../design-system/components/MediaCard/README.md); trang chi tiết và dải công trình dùng [Khối công trình và News](../../design-system/components/Blocks/README.md). Thiết kế mới qua Design System và Impeccable, owner duyệt trước khi code.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1, R2, R3 | `tests/site/block-pages.test.mjs`, `tests/site/blocks.test.mjs`, `tests/site/block-pages.e2e.mjs` (suite `block-pages`; R2: tên thẻ trong media là tên link, chuột thật hover hiện tên và lớp tối Pinterest, cảm ứng không hiện, thẻ cao bằng media, skeleton không chừa chỗ tên, không zoom) |
| R4, R5 | chưa có test |

## Gate còn mở

- Nghiên cứu SEO và từ khóa cho công trình, loại công trình, slug làm trước khi code, như trang sản phẩm quảng cáo (owner 2026-10-12).
- Slug loại con chốt theo Keyword Planner; đổi slug thì thêm redirect.

## Chú thích thuật ngữ

- **Masonry**: lưới thẻ so le theo chiều cao ảnh.
- **Ô thông số**: khối đánh số ghi thông tin chính của công trình.
