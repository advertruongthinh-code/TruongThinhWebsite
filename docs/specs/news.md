---
title: News
status: planned
source:
  - src/site/content/news.json
tests:
  - tests/site/block-pages.test.mjs
  - tests/site/block-pages.e2e.mjs
  - tests/site/static-locales.test.mjs
notion: https://app.notion.com/p/3f7332849a0e8189870ce4b4dfc502bf
updated: 2026-11-08
---

# News

## Mục đích

Mục bài viết tư vấn và bình luận xu hướng về không gian nhà ở, không gian kinh doanh, thiết kế và sản phẩm quảng cáo; là kênh
SEO chính kéo khách từ Google, Cốc Cốc, Bing và trợ lý AI về site và Zalo. Module `news` trong capability map CMS phase 2.
Bố cục theo trang News của Espacio trong [khảo sát](https://claude.ai/artifact/RFPAHbDHRa4tXa7pS1AoEy), chỉnh qua
[layout-library](layout-library.md); soạn qua [CMS editor](cms-editor.md); xuất bản theo [CMS](cms.md).

## Hành vi

### R1. Bốn nhóm

Mỗi bài thuộc đúng một nhóm: Không gian nhà ở, Không gian kinh doanh, Xu hướng thiết kế, Sản phẩm quảng cáo (owner duyệt
2026-10-12). Tên hiển thị và slug nhóm chốt theo số liệu Keyword Planner; tới lúc đó dùng tên tạm trên.

```gherkin
Given một bài chưa chọn nhóm
When bấm Kiểm SEO hoặc xuất bản
Then báo lỗi Chặn "Chưa chọn nhóm News"
```

### R2. Trang danh sách News

Dữ liệu: mỗi bài một mục trong `src/site/content/news.json` (`id`, `group` là một trong `nha-o`, `kinh-doanh`, `xu-huong`,
`quang-cao`, `published` dạng YYYY-MM-DD, slug VI, EN, tên, mô tả, ảnh bìa, chuỗi khối). `scripts/site/block-pages.mjs` dựng bài
và danh sách từ khung trang Giới thiệu, namespace `news`; trang nhóm `/<locale>/news/<group>/` chỉ có khi nhóm có bài. Bản 1
bắt buộc đủ VI và EN; bài một ngôn ngữ (R5) làm khi có CMS. Mục "Tin tức" nằm trong nhóm Về chúng tôi của hamburger menu.

News là kênh bài tư vấn và xu hướng viết để lên Google, người đọc thấy rõ bài trước sau (owner 2026-11-09). Bố cục theo
Espacio `/en/news`: thẻ lớn bài mới nhất dính ở cột trái, cột phải lưới 2x2 rồi các thẻ hàng ngang; phone, tablet một cột.
Mỗi thẻ một ảnh bìa 3:2, nhóm, ngày đăng, tiêu đề; rê chuột thì gạch chân tiêu đề như navbar, không phóng to ảnh. Bài mới nhất
trước, mỗi trang 12 bài, có trang 2, 3… với đường dẫn riêng crawl được. Hàng lọc chỉ có "Tất cả" và các năm có bài
(`/<locale>/news/<năm>/`, `noindex, follow`); trang nhóm giữ đường dẫn, title, mô tả cho SEO nhưng không hiện thành nút lọc,
người đọc vào qua nhãn nhóm ở đầu bài. Slug bài không được là số năm. Bài chỉ có một ngôn ngữ chỉ hiện ở danh sách của ngôn ngữ đó.
Đầu trang danh sách và trang bài (tiêu đề, hàng lọc hoặc nhóm và ngày) là dải tối tràn mép như hero các trang tĩnh, chữ trắng,
header dạng inverse (owner 2026-11-08); trang Công trình (projects R2) dùng chung đầu trang này.

```gherkin
Given có 30 bài tiếng Việt
When mở trang News tiếng Việt
Then thấy 12 bài mới nhất, bài đầu là thẻ lớn, có link tới trang 2 trong HTML
And hàng lọc chỉ có "Tất cả" và các năm, trang năm có noindex
```

### R3. Trang bài

Theo mẫu Bài News của [layout-library R2](layout-library.md): tiêu đề, khối nội dung theo chuỗi người soạn ghép, cuối bài là
khối 3 bài cùng nhóm (`news-cards`) và dòng "Xem tất cả bài viết" (`cta-arrow`), rồi lời mời Zalo hoặc đặt lịch khảo sát.
Bài có ngày đăng và ngày cập nhật hiển thị khớp dữ liệu cấu trúc, tác giả là người duyệt. Dữ liệu cấu trúc `BlogPosting`,
`BreadcrumbList`, `VideoObject` khi có video, theo [SEO](seo.md); ảnh, video trong bài theo [tải ảnh](media-delivery.md).

```gherkin
Given một bài thuộc nhóm Sản phẩm quảng cáo
When mở bài
Then cuối bài có 3 bài khác cùng nhóm, mới nhất trước, và link tới trang News
```

### R4. News trên các trang khác

Trang chủ có khối 3 bài mới nhất như Espacio. Trang Residential, Commercial, Advertising và trang chi tiết công trình gợi ý 2
đến 3 bài liên quan (cùng nhóm, rồi theo tag và điểm embedding nếu có). News chỉ có trong hamburger menu, không trên navbar,
không ở footer (owner duyệt 2026-10-12).

```gherkin
Given owner đăng một bài mới
When lần dựng xong
Then trang chủ hiện bài đó trong khối News và hamburger menu có mục News
```

### R5. Đường dẫn và đổi ngôn ngữ

Đường dẫn dạng `/vi/news/<slug>/` và `/en/news/<slug>/` theo kiểu site hiện tại. Bài hai ngôn ngữ có hreflang hai chiều;
bài một ngôn ngữ không có, và nút đổi ngôn ngữ dẫn về trang News của ngôn ngữ kia. Đổi slug sau khi đăng thì tạo redirect 301
từ slug cũ. `[CẦN LÀM RÕ: chữ "news" trong đường dẫn giữ tiếng Anh cho cả hai ngôn ngữ hay đổi theo từ khóa, chốt cùng
Keyword Planner]`

```gherkin
Given bài đã đăng đổi slug từ "chi-phi-quan-ca-phe" sang "chi-phi-thi-cong-quan-ca-phe"
When mở đường dẫn cũ
Then chuyển 301 sang đường dẫn mới
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Data | bài News: nhóm, slug, ngôn ngữ, khối, SEO, ngày đăng, ngày sửa, tác giả | R1 đến R5 |
| Route | `/<locale>/news/`, `/<locale>/news/page/<n>/`, `/<locale>/news/<nhóm>/`, `/<locale>/news/<slug>/` | R2, R3, R5 |
| Khối | `news-list`, `news-cards`, `cta-arrow` | [layout-library](layout-library.md) |

## UI

Thiết kế danh sách, thẻ bài và trang bài qua Design System và Impeccable, owner duyệt trước khi code.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1 đến R5 | chưa có test; viết khi owner mở slice code |

## Gate còn mở

- Thứ tự (owner 2026-10-26): owner duyệt layout-library, dựng News lên site tĩnh với nội dung trong khối dữ liệu CMS sửa
  được, rồi mới làm CMS; media thiếu tạo bằng ChatGPT qua Codex CLI theo rule tạo ảnh (owner 2026-11-07).
- Code News làm ở một thread riêng, mở sau khi owner duyệt bộ layout, gate chấm ảnh và rule cho AI tạo ảnh (owner 2026-10-12);
  rule tạo, chấm ảnh hiện có ở [agent-rule-ad-images](../operations/agent-rule-ad-images.md), cần mở rộng cho ảnh bài viết.

- Tên và slug nhóm, chữ trong đường dẫn: chờ Keyword Planner.
- Số bài mỗi trang (12) là mặc định của Claude; Espacio để cả 26 bài trên một trang nhưng site mình đăng khoảng 50 bài mỗi tuần.

## Chú thích thuật ngữ

- **Slug**: phần chữ cuối đường dẫn của bài.
- **hreflang**: thẻ báo Google bản ngôn ngữ khác của cùng bài.
- **Redirect 301**: chuyển hẳn đường dẫn cũ sang đường dẫn mới.
- **Crawl được**: bot tìm kiếm đi theo được bằng link có sẵn trong HTML.
