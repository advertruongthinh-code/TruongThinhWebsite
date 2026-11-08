---
title: Công trình nhà ở và kinh doanh
status: planned
source:
  - scripts/site/block-pages.mjs
  - scripts/site/project-list.mjs
  - src/site/projects-grid.mjs
  - src/site/content/projects.json
  - src/site/content/menu.json
tests:
  - tests/site/static-locales.test.mjs
  - tests/site/blocks.test.mjs
  - tests/site/block-pages.test.mjs
  - tests/site/block-pages.e2e.mjs
notion: https://app.notion.com/p/3f7332849a0e8189870ce4b4dfc502bf
updated: 2026-11-08
---

# Công trình nhà ở và kinh doanh

## Mục đích

Bằng chứng công trình thật cho hai mảng thiết kế thi công không gian nhà ở và không gian kinh doanh: trang mảng (Residential,
Commercial) có công trình tiêu biểu, trang toàn bộ công trình dạng masonry, và trang chi tiết từng công trình. Module
`projects` trong capability map CMS phase 2. Bố cục theo Espacio (`/en/interior-design`, `/en/kitchens`, `/en/projects`, 47
trang chi tiết trong [khảo sát](https://claude.ai/artifact/RFPAHbDHRa4tXa7pS1AoEy)), chỉnh qua [layout-library](layout-library.md).

## Hành vi

### R1. Dải công trình trên trang Nhà ở và Kinh doanh

Trang Nhà ở và Kinh doanh đang có thêm cuối trang một dải công trình tiêu biểu (`project-slider`) và một dòng chữ có mũi tên
(`cta-arrow`) như Espacio `/en/interior-design` và `/en/kitchens` (owner chọn 2026-11-07, xem ảnh chụp trong thread): PC là
hàng ảnh dọc so le cao thấp, tên công trình dưới ảnh; phone là dải trượt ngang. Nhà ở theo hình 1 (chữ đậm), Kinh doanh
theo hình 2 (chữ mảnh). Phần còn lại của hai trang giữ layout hiện tại. Owner chọn công trình tiêu biểu và thứ tự; bấm
ảnh mở trang chi tiết (R3). Dòng mũi tên "Xem các công trình nhà ở" (hoặc kinh doanh) dẫn tới trang lọc cùng mảng (R2).
Nội dung nằm sẵn trong khối dữ liệu CMS sửa được ([layout-library](layout-library.md)); media thiếu tạo bằng ChatGPT qua Codex CLI (owner 2026-11-07)
theo [Tạo ảnh](../operations/agent-rule-ad-images.md#tạo-ảnh) (owner 2026-10-26).

```gherkin
Given owner đánh dấu 5 công trình nhà ở là tiêu biểu
When lần dựng xong
Then cuối trang Nhà ở hiện đúng 5 công trình đó trong dải, bấm một ảnh mở trang chi tiết công trình đó
```

### R2. Trang toàn bộ công trình

Dạng masonry như trang Advertising (owner 2026-10-12), hero tiêu đề hai dòng như `/en/projects`. Bộ lọc: Nhà ở, Kinh doanh và
loại con (căn hộ, nhà phố, homestay; shop, F&B, showroom, văn phòng), lọc nhiều điều kiện như admin. Thẻ có ảnh đại diện (cover) theo
tỷ lệ cover theo [card nhiều media R1](media-card.md#r1-dữ-liệu-media-của-card), tên công trình, loại, địa điểm.
Bấm thẻ mở trang chi tiết (R3), không mở viewer ảnh như Advertising. Mỗi bộ lọc có đường dẫn riêng crawl được.
Bản đầu (owner 2026-11-08): `/<locale>/projects/` và trang lọc `/<locale>/projects/nha-o/`, `/kinh-doanh/`. Trang giống trang
Sản phẩm quảng cáo (owner 2026-11-08): dựng trên khung trang đó (`scripts/site/project-list.mjs`): hero nền trắng, kicker "Công trình tiêu biểu" (EN "Our featured projects") và
khẩu hiệu hai dòng "Những công trình / truyền cảm hứng" (EN "Projects / that inspire"), chỉ chữ nhấn "cảm hứng" ("inspire") đậm nghiêng (owner 2026-11-08), hàng lọc canh giữa, dòng "Cuộn xuống", masonry tràn bề ngang cùng lề, gutter, số cột với
[masonry Advertising](advertising-masonry.md) (`src/site/projects-grid.mjs` dùng `layout-core.mjs`), đổi lọc tại chỗ bằng
`masonry-layout` 0.4s và đổi URL sang trang lọc. Trang lọc: tên bộ lọc là h1, khẩu hiệu là p như trang cụm quảng cáo.
Thẻ chỉ có ảnh; tên và loại hiện khi rê chuột, trên phone luôn hiện ở chân ảnh. Đuôi lưới như trang quảng cáo: các cột nối tiếp bằng khối màu chủ đạo của ảnh
bìa (build tính bằng sharp), mờ và tan ra trắng sau CTA "Không gian tiếp theo dành cho bạn"; cuộn tới cuối thì chữ CTA ở giữa màn hình. Không JavaScript thì CSS columns xếp so le. Dòng mũi tên dưới dải R1 dẫn tới trang lọc cùng mảng; slug công trình không được
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
```

### R3. Trang chi tiết công trình

Theo mẫu Chi tiết công trình của [layout-library R2](layout-library.md): hero hai dòng có ảnh hoặc video, đoạn giới thiệu,
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
| Data | công trình: mảng, loại, địa điểm, diện tích, năm, hạng mục, tiêu biểu, thứ tự, đồng ý nêu tên, khối, SEO | R1 đến R5 |
| Route | `/<locale>/projects/`, bộ lọc, `/<locale>/projects/<slug>/` | R2, R3, R5 |
| Khối | `hero-project`, `project-slider`, `project-masonry`, `facts-grid`, `contact-quick`, `cta-arrow` | [layout-library](layout-library.md) |

## UI

Thiết kế trang toàn bộ công trình, thẻ và trang chi tiết qua Design System và Impeccable, owner duyệt trước khi code.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1, R2, R3 | `tests/site/block-pages.test.mjs`, `tests/site/blocks.test.mjs`, `tests/site/block-pages.e2e.mjs` (suite `block-pages`) |
| R4, R5 | chưa có test |

## Gate còn mở

- Nghiên cứu SEO và từ khóa cho công trình, loại công trình, slug làm trước khi code, như trang sản phẩm quảng cáo (owner 2026-10-12).
- Masonry công trình dùng chung hình học với [masonry Advertising](advertising-masonry.md) hay bản riêng; quyết khi viết plan.
- Slug loại con chốt theo Keyword Planner; đổi slug thì thêm redirect.

## Chú thích thuật ngữ

- **Công trình tiêu biểu**: công trình owner chọn hiện trên trang mảng.
- **Masonry**: lưới thẻ so le theo chiều cao ảnh.
- **Ô thông số**: khối đánh số ghi thông tin chính của công trình.
