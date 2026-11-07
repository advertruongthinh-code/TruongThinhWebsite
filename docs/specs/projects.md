---
title: Công trình nhà ở và kinh doanh
status: planned
source:
  - scripts/site/block-pages.mjs
  - src/site/content/projects.json
tests:
  - tests/site/static-locales.test.mjs
  - tests/site/blocks.test.mjs
notion: https://app.notion.com/p/3f7332849a0e8189870ce4b4dfc502bf
updated: 2026-11-07
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
ảnh mở trang chi tiết (R3). Dòng mũi tên dẫn tới trang toàn bộ công trình đã lọc khi trang đó có (R2); trước đó ẩn.
Nội dung nằm sẵn trong khối dữ liệu CMS sửa được ([layout-library](layout-library.md)); media thiếu tạo bằng ChatGPT qua Codex CLI (owner 2026-11-07)
theo [Tạo ảnh](../operations/agent-rule-ad-images.md#tạo-ảnh) (owner 2026-10-26).

```gherkin
Given owner đánh dấu 5 công trình nhà ở là tiêu biểu
When lần dựng xong
Then cuối trang Nhà ở hiện đúng 5 công trình đó trong dải, bấm một ảnh mở trang chi tiết công trình đó
```

### R2. Trang toàn bộ công trình (sau đợt nước rút)

Dạng masonry như trang Advertising (owner 2026-10-12), hero tiêu đề hai dòng như `/en/projects`. Bộ lọc: Nhà ở, Kinh doanh và
loại con (căn hộ, nhà phố, homestay; shop, F&B, showroom, văn phòng), lọc nhiều điều kiện như admin. Thẻ có ảnh đại diện (cover) theo
tỷ lệ cover theo [card nhiều media R1](media-card.md#r1-dữ-liệu-media-của-card), tên công trình, loại, địa điểm.
Bấm thẻ mở trang chi tiết (R3), không mở viewer ảnh như Advertising. Mỗi bộ lọc có đường dẫn riêng crawl được.

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
Mỗi công trình là một mục trong `src/site/content/projects.json` (`id`, `sector`, `slugVi`, `slugEn`, tên, mô tả, ảnh bìa,
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
| R1 đến R5 | chưa có test; viết khi owner mở slice code |

## Gate còn mở

- Đợt nước rút tới CMS (owner 2026-11-07): R1, R3, R4, R5; trang toàn bộ công trình (R2) làm sau.
- Nghiên cứu SEO và từ khóa cho công trình, loại công trình, slug làm trước khi code, như trang sản phẩm quảng cáo (owner 2026-10-12).
- Masonry công trình dùng chung hình học với [masonry Advertising](advertising-masonry.md) hay bản riêng; quyết khi viết plan.
- Danh sách loại con và slug chốt theo Keyword Planner.

## Chú thích thuật ngữ

- **Công trình tiêu biểu**: công trình owner chọn hiện trên trang mảng.
- **Masonry**: lưới thẻ so le theo chiều cao ảnh.
- **Ô thông số**: khối đánh số ghi thông tin chính của công trình.
