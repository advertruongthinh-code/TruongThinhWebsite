---
title: Chữ hero kiểu espacio, xuống dòng chốt và khoảng cách dòng đều
status: planned
source: []
tests: []
notion: none
updated: 2026-10-18
---

# Chữ hero kiểu espacio, xuống dòng chốt và khoảng cách dòng đều

## Mục đích

Chữ trong hero phải đọc rõ, nằm giữa vùng hero và có nhịp dòng gần giống nhau giữa các trang. Không dấu tiếng Việt
nào bị cắt hay đè lên dòng khác, từ 320px tới màn hình PC lớn. Cách bày chữ học từ hero của espaciohomedesign.com.
Các đoạn văn cùng loại có khoảng cách dòng bằng nhau. Spec không đổi motion
([first-load-parity](first-load-parity.md)), font và màu.

## Hiện trạng đã đo (Chromium cloud, localhost, bản `main` 393ace7)

- Trong một đoạn `p`, các dòng cách đều nhau, chỉ lệch 1px do làm tròn. Đo ở Residential, Commercial, About và
  footer, bề rộng 1440 và 390.
- Lệch thật ở khối chữ lớn có mask của motion. Ví dụ `.heritage-row` ở trang chủ ("Giữ nghề, ...") có các khoảng
  1, 26 và 8 px giữa các dòng ở 1440. Suy luận (chưa xác minh): lệch này do `.line-mask` có padding chừa dấu,
  cộng với transform `-0.1em` của motion.
- Thread sửa test báo lỗi ở hero trang chủ: câu "Làm chắc / Làm khác" vỡ thành 4 dòng ở bề rộng 364 đến 387px
  (A04s rộng 384px). Nguyên nhân: mức sàn của `clamp(4.6rem, 19vw, 6.5rem)` (`style.css`, khoảng dòng 2789) lớn hơn
  bề rộng còn chỗ; rule cho bề rộng từ 360px trở xuống không phủ dải này. Bản EN của hero này luôn 4 dòng trên phone.
- Cloud không vào được espacio. Repo chỉ còn số đo cũ: title hero 2 dòng, mỗi dòng có cỡ chữ riêng theo bề rộng màn
  hình; project hero 112px/1,4; breakpoint 1200, 960, 750, 578. Số liệu CSS còn thiếu phải đo lại qua phiên PC
  (R2).

## Hành vi

### R1. Xuống dòng theo chốt của owner (2026-10-18)

Mỗi câu dưới đây nằm đúng hai dòng ở mọi bề rộng, ở mọi chỗ câu đó xuất hiện: hero, portal trang chủ, About.

| Chỗ | VI dòng 1 | VI dòng 2 |
| --- | --- | --- |
| Hero trang chủ | Làm chắc | Làm khác |
| Trang chủ, khối nghề | Giữ nghề, | Không ngừng làm mới |
| Residential, portal Nhà ở | Nơi tái tạo | năng lượng sống |
| Commercial, portal Kinh doanh | Thiết kế tối ưu | Vận hành bền bỉ |
| Advertising, portal Quảng cáo | Để thương hiệu | luôn trong tầm mắt |

Bản EN tách hai dòng ở cùng vị trí ý nghĩa. Câu Commercial mới thay "Thiết kế để bán tốt. Thi công để vận hành bền."
Bản EN là "Designed to perform / Built to last" (owner duyệt 2026-10-18).

### R2. Bày chữ hero kiểu espacio

Trước khi code, đo lại hero của mọi trang espacio có hero qua phiên PC: cỡ chữ theo bề rộng, line-height,
letter-spacing, canh ngang, canh dọc, vị trí kicker và dòng phụ. Đo ở 390, 768, 1440 và 1920, rồi ghi bảng số vào
mô tả PR. Sau đó áp vào mọi hero của site: Trang chủ, Residential, Commercial, About, Advertising, và trang cụm cùng
trang sản phẩm Advertising.

- Title chính nằm giữa vùng hero theo cả chiều ngang và chiều dọc. Trên phone được canh trái nhưng vẫn ở giữa theo
  chiều dọc.
- Mỗi dòng của title là một khối riêng. Cỡ chữ co theo bề rộng để mỗi dòng không tự gãy thêm.
- Khoảng cách giữa hai dòng title, so giữa các hero cùng bề rộng, lệch nhau không quá 15%.
- Kicker và dòng phụ cách title theo cùng một tỷ lệ ở mọi hero. Token `portal-kicker`, `portal-title`,
  `portal-tagline` của [Design System](../../design-system/) chỉ sửa sau khi owner duyệt (mục UI).

### R3. Không cắt dấu, không đè dòng

Ở mọi bề rộng từ 320 tới 2560px, khung glyph thật của mọi ký tự (kể cả Ể, Ệ, Ấ, Ỗ, Ự) nằm trong mask của dòng
đó. Glyph của hai dòng kề nhau không chồng lên nhau. Trang không cuộn ngang.

```gherkin
Given mọi trang có hero, VI và EN
When render ở 320, 360, 375, 384, 390, 411, 768, 1024, 1280, 1440, 1920 và 2560 px
Then mỗi câu ở R1 đúng hai dòng
And khung glyph của mọi ký tự nằm trong mask dòng của nó, cả lúc motion bắt đầu và lúc motion xong
And khung glyph của hai dòng kề nhau không giao nhau
And document không rộng hơn viewport
```

### R4. Đoạn văn cùng loại có khoảng cách dòng bằng nhau

Đoạn văn cùng loại có cùng line-height ở mọi trang. Cùng loại nghĩa là cùng class, hoặc cùng vai trò như
intro, note, timeline, khối chữ lớn có mask. Trong một khối, khoảng cách các baseline liên tiếp lệch không quá 1px.
Khối có `.line-mask` hay `.heritage-line` phải đạt điều này ở trạng thái cuối của motion.

```gherkin
Given mọi trang, ở 390 và 1440
When đo baseline từng dòng của mọi đoạn văn và khối chữ có mask, sau khi motion xong
Then trong cùng khối, các khoảng baseline lệch nhau không quá 1 px
And các khối cùng loại có cùng line-height tính theo cỡ chữ
```

### R5. Ngoài phạm vi

Không đổi font, màu, motion, ảnh hero, hay câu nào ngoài 5 câu ở R1.

## UI

Token chữ hero và portal trong [Design System](../../design-system/). Chỉ đổi `design-system/` sau khi owner tự audit
kết quả trên PC và phone và duyệt (owner, 2026-10-18); sau đó republish theo
[docs-system R7](docs-system.md#r7-publish-design-system-lên-claudeai).

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1, R3 | E2E mới: đo số dòng và khung glyph bằng Range rects ở các bề rộng của R3 |
| R2 | Bảng số đo espacio qua phiên PC, ghi trong mô tả PR |
| R4 | E2E mới: đo baseline của mọi đoạn văn ở 390 và 1440 |

## Gate còn mở

- Plan cần owner duyệt trước khi code.
- Owner audit trên PC và phone trước khi cập nhật Design System.
- Đo espacio (R2) cần phiên PC.

## Chú thích thuật ngữ

- **Hero**: khối mở đầu trang, gồm ảnh hoặc nền lớn và title chính.
- **Kicker**: dòng chữ nhỏ phía trên title.
- **Mask**: khung `overflow: hidden` bọc một dòng chữ để chữ trượt vào khi có motion.
- **Glyph**: hình vẽ của một ký tự, kể cả dấu.
- **Baseline**: đường chân của chữ trong một dòng.
- **Token**: giá trị thiết kế dùng chung, đặt tên trong Design System.
