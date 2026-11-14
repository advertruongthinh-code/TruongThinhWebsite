---
title: News
status: planned
source:
  - src/site/content/news.json
tests:
  - tests/site/blocks.test.mjs
  - tests/site/block-pages.test.mjs
  - tests/site/block-pages.e2e.mjs
  - tests/site/news-head-motion.e2e.mjs
  - tests/site/static-locales.test.mjs
notion: https://app.notion.com/p/3f7332849a0e8189870ce4b4dfc502bf
updated: 2026-11-14
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
Espacio `/en/news`: thẻ lớn bài mới nhất dính ở cột trái cách header 40px, cả khi cuộn mượt (sticky của Locomotive) lẫn cuộn
native (CSS sticky), nhả ra ở đáy lưới; ảnh thẻ lớn co chiều cao (cắt cover) để thẻ vừa màn hình laptop thấp; cột phải lưới 2x2
rồi các thẻ hàng ngang; phone, tablet một cột; phone mọi thẻ sau thẻ lớn là hàng ngang (ảnh 1/3, cao theo chữ, cách chữ 35px), các thẻ cách nhau 15px. Mỗi thẻ chỉ một ảnh bìa 3:2 và tiêu đề, không nhóm, không ngày (owner 2026-11-11: chỉ tiêu đề, không kicker);
ảnh thẻ lớn tải ngay (LCP), thẻ khác lazy. Rê chuột hoặc focus bàn phím thì gạch chân chạy theo bề rộng chữ tiêu đề, kể cả nhiều
dòng, như navbar; ảnh phóng 1.1 trong 0.3s (audit Espacio 2026-11-11). Bài mới nhất trước, mỗi trang 12 bài, có trang 2, 3… với đường dẫn riêng crawl được.
Hàng lọc chỉ có "Tất cả" và các năm có bài (`/<locale>/news/<năm>/`, `noindex, follow`); trang nhóm giữ đường dẫn, title, mô
tả cho SEO nhưng không hiện thành nút lọc, người đọc vào qua nhãn nhóm ở đầu bài. Id và slug bài không được là `page`, slug
nhóm hay số năm. Bài chỉ có một ngôn ngữ chỉ hiện ở danh sách của ngôn ngữ đó.
Đầu trang danh sách theo Espacio `/en/news` (owner 2026-11-11, đo lại 2026-11-14): nền trắng, dòng nhỏ "Tư vấn và xu hướng"
(EN "Advice and trends", owner 2026-11-14) 16px chữ hoa đậm ngay trên `h1`, `h1` chữ hoa căn giữa lấp đầy cột (tối đa 900px,
112px), hàng lọc cách chân `h1` 119px (phone 39px), chữ đậm mờ 30%, mục đang chọn và mục rê chuột đậm đủ, gạch chân 3px; phone
hàng lọc một dòng canh trái, vuốt ngang; header dạng ink. Lúc mở trang, khối dòng nhỏ và `h1` thu từ 1.1 về 1 trong 2.5s, hai dòng
hiện dần từng từ sau 0.6s. Đầu trang bài theo bài Espacio (owner 2026-11-11 "các trang con của news cũng phải giống"): nền
trắng, dòng "Tin tức / nhóm" căn giữa chữ hoa đậm, tiêu đề 64px (40px phone) nét thường canh trái, chữ cách mép trang 70px (phone
30px), ngày căn giữa bên dưới. Lúc mở bài, dòng nhóm trồi lên ngay, tiêu đề trồi lên từng dòng sau 0.3s, ngày hiện dần từng từ
sau 0.9s. Espacio có nút "Scroll Down" trong HTML hai trang này nhưng ẩn (`display: none`, đo 2026-11-14), nên trang mình không
thêm. Giảm chuyển động thì hiện ngay trạng thái cuối.

```gherkin
Given có 30 bài tiếng Việt
When mở trang News tiếng Việt
Then thấy 12 bài mới nhất, bài đầu là thẻ lớn, có link tới trang 2 trong HTML
And hàng lọc chỉ có "Tất cả" và các năm, trang năm có noindex
```

### R3. Trang bài

Theo mẫu Bài News của [layout-library R2](layout-library.md): tiêu đề, khối nội dung theo chuỗi người soạn ghép, cuối bài là
khối "Tin khác" (`news-cards`, tiêu đề căn giữa rồi 3 bài dạng dải trang chủ R4, build tự lấy khi khối không ghi `newsIds`: bài cùng nhóm trước, mới nhất trước, không lấy chính bài đó; nhóm chưa đủ thì lấy bài mới nhất nhóm khác cho đủ 3) và dòng "Xem tất cả bài viết" (`cta-arrow`), rồi lời mời Zalo hoặc đặt lịch khảo sát.
Bài có ngày đăng và ngày cập nhật hiển thị khớp dữ liệu cấu trúc, tác giả là người duyệt. Dữ liệu cấu trúc `BlogPosting`,
`BreadcrumbList`, `VideoObject` khi có video, theo [SEO](seo.md); ảnh, video trong bài theo [tải ảnh](media-delivery.md).
Ảnh bài là ảnh riêng của bài đó, không dùng lại ảnh trang khác hay bài khác ([bộ kiểm nội dung](content-independent-tests.md#r2-bộ-kiểm-nội-dung) mục 7); mỗi ảnh là một cảnh riêng minh họa đúng đoạn văn cạnh nó, không cần cùng một không gian (owner 2026-11-13). Mẫu ảnh mỗi bài: ảnh rộng đầu bài (cũng là bìa 3:2), cặp ảnh dọc 2:3, ảnh dọc 2:3 lệch phải.

```gherkin
Given một bài thuộc nhóm Sản phẩm quảng cáo
When mở bài
Then cuối bài có 3 bài khác cùng nhóm, mới nhất trước, và link tới trang News
```

### R4. News trên các trang khác

Khối News chỉ có ở trang chủ (owner 2026-11-11), theo trang chủ espaciohomedesign.com/en: ngay dưới hero, 3 bài mới nhất
thành 3 cột (phone một cột), mỗi bài ảnh bìa nhỏ bên trái, bên phải là nhóm chữ hoa (gạch chân khi rê chuột), tiêu đề và chữ "Đọc tiếp" chỉ hiện khi rê
chuột hoặc focus, ảnh phóng 1.2 trong 0.6s; nhóm chữ hoa nét 700, ảnh bìa cao ít nhất 2/3 bề rộng và kéo cao theo khối chữ, phone cách hero
và khối dưới 30px như Espacio (đo lại 2026-11-14); cả bài là một link (`newsTeaser` trong `scripts/site/blocks.mjs`, `renderHomeNews` trong `scripts/site/block-pages.mjs`, chỗ đặt `<!-- home-news -->` trong
`src/site/index.html`). Trang Nhà ở, Kinh doanh, Advertising và trang chi tiết công trình không có khối News. Cuối bài News vẫn
có khối 3 bài (R3). News chỉ có trong hamburger menu, không trên navbar, không ở footer (owner duyệt 2026-10-12).

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
| Route | `/<locale>/news/`, `/<locale>/news/page/<n>/`, `/<locale>/news/<năm>/`, `/<locale>/news/<năm>/page/<n>/`, `/<locale>/news/<nhóm>/`, `/<locale>/news/<nhóm>/page/<n>/`, `/<locale>/news/<slug>/` | R2, R3, R5 |
| Khối | `news-list`, `news-cards`, `cta-arrow` | [layout-library](layout-library.md) |

## UI

Danh sách và thẻ bài: [Danh sách News](../../design-system/components/NewsList/README.md); thân bài: [Khối công trình và News](../../design-system/components/Blocks/README.md). Thiết kế mới qua Design System và Impeccable, owner duyệt trước khi code.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R2, R3 | `node --test tests/site/block-pages.test.mjs tests/site/blocks.test.mjs` (R3: tự lấy 3 bài); `node scripts/ci/suites.mjs block-pages` (thẻ lớn dính khi lăn wheel) |
| R1, R4, R5 | chưa có test; viết khi owner mở slice code |

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
