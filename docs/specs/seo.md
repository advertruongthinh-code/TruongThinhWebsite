---
title: SEO cho người, Google và AI
status: planned
source: []
tests: []
notion: https://app.notion.com/p/3f5332849a0e812d88d1d97ea66cb79b
updated: 2026-10-18
---

# SEO cho người, Google và AI

## Mục đích

Khi người ở Nam Bộ tìm trên Google hoặc hỏi AI (ChatGPT, Gemini, Perplexity, Google AI Overview), Trường
Thịnh được gợi ý nhiều nhất và dẫn về site hoặc Zalo OA. Spec đang tạm dừng: owner muốn tối ưu và làm đủ
feature website trước. Requirement dưới là intent owner đã trao đổi qua `interview-me` ngày 2026-10-10,
chưa qua gate duyệt spec; chưa có code nào thuộc spec này.

## Hành vi

### R1. Thông điệp và chữ khóa

Trường Thịnh làm trọn gói thiết kế và thi công cho ba mảng ngang hàng: không gian thương mại, không gian nhà
ở (căn hộ, homestay), sản phẩm quảng cáo (mục advertising-products). Mỗi dịch vụ chính có trang riêng gắn khu
vực, vì người dùng tìm theo thứ cụ thể cộng nơi chốn. Chữ dùng cho từng mảng chốt bằng số liệu Keyword Planner,
không theo phỏng đoán `[CẦN LÀM RÕ: "không gian thương mại" hay "không gian kinh doanh"; chờ số liệu]`.

```gherkin
Given số liệu Keyword Planner cho 50 từ khóa, ngôn ngữ tiếng Việt, vị trí Việt Nam và nhóm tỉnh mục tiêu
When chọn chữ cho title, heading và dữ liệu cấu trúc của một mảng
Then chữ được chọn là cụm có lượt tìm cao hơn trong nhóm của nó
```

### R2. Khu vực mục tiêu

Từ Đà Nẵng trở vào. Trọng tâm Vĩnh Long, Bến Tre và tỉnh giáp ranh Bến Tre, rồi miền Tây và miền Đông. SEO
địa phương (Google Business Profile, địa chỉ, khu vực phục vụ) là trục chính; mỗi địa điểm chỉ một hồ sơ.

```gherkin
Given một trang dịch vụ chính
When Google hoặc AI đọc trang
Then trang nêu rõ khu vực phục vụ và địa chỉ trụ sở theo PRODUCT.md
```

### R3. Người, Googlebot và bot AI

Không chặn bot tìm kiếm và bot AI, nhưng phân loại bot và chống DDoS qua Cloudflare. Phải kiểm tài liệu
chính thức xem gói free có gì và tránh chế độ chặn bot vô tình chặn bot AI `[CẦN LÀM RÕ: cấu hình Cloudflare cụ thể]`.

```gherkin
Given bot AI đã xác minh và bot lạ cùng truy cập site
When lượng request vượt ngưỡng
Then bot đã xác minh vẫn đọc được trang, bot lạ bị giới hạn
```

### R4. Thay site cũ trên truongthinhads.vn

Site mới thay hẳn site cũ (Sapo, sitemap 84 URL) trên cùng domain. Mỗi URL cũ redirect 301 sang URL mới tương
ứng. Chuyển domain là việc owner duyệt riêng lúc phát hành. Ngày đổi DNS: gửi sitemap mới trong Search Console
(cùng domain nên không dùng công cụ Chuyển địa chỉ), kiểm vài URL cũ trả 301; vài tuần sau theo dõi báo cáo lập
chỉ mục và lỗi 404.

```gherkin
Given một URL trong sitemap site cũ
When truy cập sau khi chuyển domain
Then nhận 301 tới trang mới tương ứng
```

### R5. Nền đo

Phase tĩnh chỉ làm nền: xác minh domain với Google Search Console và chỗ đếm lượt bấm Zalo OA. Xác minh bằng bản ghi
TXT ở DNS làm trước phát hành, không đụng site cũ; trước khi đổi DNS, xuất dữ liệu trang và từ khóa của site cũ để
giữ đủ trang đang mang khách về. Bộ đo (dashboard trong site admin) thuộc [CMS](cms.md).

```gherkin
Given site đã chạy trên truongthinhads.vn
When owner mở Google Search Console
Then property đã xác minh và có dữ liệu index
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Data local | `.tmp/seo-keywords/keywords-input.txt` | 50 từ khóa cần tra, trên máy owner |
| Data local | `.tmp/seo-keywords/old-site-urls.txt` | 84 URL site cũ từ sitemap, trên máy owner |

## UI

Chưa có; trang dịch vụ theo khu vực sẽ dùng component trong [Design System](../../design-system/README.md).

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1 đến R5 | chưa có test |

## Gate còn mở

- Owner xác nhận bước thanh toán Google Ads (tài khoản đã qua Expert mode, chưa có chiến dịch; Google tạm
  giữ 200.000 đ để kiểm thẻ), rồi tra 50 từ khóa bằng Keyword Planner.
- Link Zalo OA thật ([PRODUCT](../../PRODUCT.md) đang để link tạm).
- Owner duyệt bản chốt intent, rồi viết spec đầy đủ và plan (hai human gate).
- Ngoài phạm vi: blog hằng tuần, quảng cáo trả tiền, AI agent tự đặt lịch, dashboard đo ở phase tĩnh.

## Chú thích thuật ngữ

- **SEO địa phương**: tối ưu để xuất hiện khi người dùng tìm theo khu vực, gồm Google Business Profile.
- **Redirect 301**: chuyển hướng vĩnh viễn, giữ giá trị index của URL cũ.
- **Keyword Planner**: công cụ Google Ads cho lượt tìm và mức cạnh tranh của từ khóa.
- **Zalo OA**: tài khoản Zalo chính thức của doanh nghiệp.
- **DDoS**: tấn công làm quá tải site bằng lượng request lớn.
