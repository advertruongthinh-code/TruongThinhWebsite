---
title: Cảm giác cuộn chung theo trang chủ
status: planned
source: []
tests: []
notion: https://app.notion.com/p/3f0332849a0e8153bb2edbde0c76b6ed
updated: 2026-10-06
---

# Cảm giác cuộn chung theo trang chủ

## Mục đích

Mọi trang cuộn với cùng cảm giác như trang chủ: cùng smooth scroll, cùng độ mượt, cùng một kiểu parallax và chỉ đặt
parallax ở nơi hợp lý. Trang chủ là chuẩn, không chỉnh. Spec này giữ quy tắc chung; code nằm ở file do
[shell](site-shell.md), [trang chủ](page-home.md), [ba trang con](detail-pages.md) và
[masonry](advertising-masonry.md) sở hữu, nên PR code sửa spec sở hữu file trong cùng PR.

## Hành vi

### R1. Một chuẩn cuộn cho mọi trang

Trang chủ, Residential, Commercial, About, Advertising, Advertising lọc theo nhóm (`?category=<nhóm>`, đích của 6 route
cũ `/advertising-products/<nhóm>/`) và detail ảnh (`?photo=<id>`) dùng đúng một cấu hình cuộn: Locomotive từ 981px, scroll native dưới 981px, khi giảm chuyển
động hoặc khi menu mở ([motion](../../design-system/motion.md#smooth-scroll-và-parallax)). Không trang nào có cấu hình
riêng (`lerp`, `multiplier`, breakpoint). Cùng một lượt lăn chuột cho cùng quãng đường và cùng đường trượt trên mọi trang.

```gherkin
Given cửa sổ PC rộng từ 981px, không giảm chuyển động
When lăn chuột cùng số nấc ở đầu bất kỳ trang nào trong R1
Then quãng đường và thời gian trượt tới khi dừng bằng trang chủ, sai số 1px và 1 frame
```

### R2. Advertising và route con mượt như trang chủ trên PC

Hiện Advertising và route con tính layout gấp 3 đến 4 lần và chạy script gấp khoảng 2 lần trang chủ trong cùng lượt lăn
chuột (đo local, chưa có GPU thật). Sau thay đổi, cuộn bằng chuột từ đầu tới cuối trang trên PC của owner không khựng.
Đo bằng Chrome trace trên PC thật (GPU thật, cửa sổ thật), cùng một script lăn chuột cho trang chủ và từng trang đo.
Nguyên nhân và cách sửa do plan xác định từ trace, không đoán trước.

Trang đo: Advertising (masonry tất cả), Advertising lọc một nhóm, một detail ảnh có related. Trang chủ đo cùng lượt làm mốc.

```gherkin
Given PC của owner, Chrome, cửa sổ tối đa, trang đã tải xong ảnh trong viewport đầu
When script lăn chuột đều từ đầu tới cuối trang Advertising, Advertising lọc nhóm và detail ảnh
Then trong lúc cuộn không có task nào trên 50ms
And tỉ lệ frame rớt không cao hơn trang chủ đo cùng lượt
And owner cuộn thử và xác nhận cảm giác giống trang chủ
```

### R3. Quy tắc parallax

Parallax chỉ đặt ở hero có tiêu đề hoặc chữ lớn nằm trên nền không đơn màu (ảnh hoặc video). Ngoài hero, ngoại lệ
duy nhất là CTA cuối Advertising với parallax riêng ([CTA](advertising-cta-center-parallax.md)). Cơ chế tái dùng y hệt
hero trang chủ: lớp media nền nhận `data-scroll` với `data-scroll-speed="-2"`, trôi chậm hơn cuộn 20%; chữ, lớp tối
(shade) và nút đi theo trang. Không có speed khác, không hiệu ứng mới. Vì dựa vào Locomotive, parallax chỉ chạy ở chế độ
smooth của R1; dưới 981px và khi giảm chuyển động thì không lệch, giống trang chủ.

Lớp media nền phủ kín section suốt lúc section nằm trong viewport: không lộ mép trên hay dưới ở bất kỳ vị trí cuộn nào,
mọi cỡ cửa sổ từ 981px. Phần tử không thỏa quy tắc thì bỏ parallax.

```gherkin
Given hero có chữ lớn trên nền ảnh, cửa sổ từ 981px, không giảm chuyển động
When cuộn từ đầu trang tới lúc hero ra khỏi viewport
Then ảnh nền trôi chậm hơn chữ 20%, chữ đi theo trang
And không lúc nào lộ mép ảnh
```

### R4. Danh sách áp dụng

| Section | Nền | Hiện tại | Sau thay đổi |
| --- | --- | --- | --- |
| Hero trang chủ, Residential, Commercial | Ảnh | `-2` | Giữ, là chuẩn |
| Hero About (`.about-hero__media`) | Ảnh | Không | Thêm `-2` |
| "Giữ nghề. Không ngừng làm mới." trang chủ (`.legacy-closer`) | Ảnh, ngoài hero | Không | Không |
| CTA Residential, Commercial, About (`.detail-cta` có ảnh) | Ảnh, ngoài hero | Không | Không |
| Ba ảnh About (`legacy-hands`, `design-sketch`, `workshop-wide`) | Ảnh ngoài hero, không có chữ đè | `-0.12`, `-0.1`, `-0.12` | Bỏ |
| Hero Advertising (mọi nhóm) | Đơn màu | Không | Không |
| CTA cuối Advertising | Skeleton, Kính | Parallax riêng | Giữ, ngoại lệ owner duyệt |
| CTA footer "Có mặt bằng?" | Đơn màu | Không | Không |
| Rail dự án trang chủ (trượt ngang) | Không phải chữ trên nền | `4` ngang | Giữ, là chuẩn trang chủ |
| Card portal, montage "Kinh nghiệm và sáng tạo" | Ảnh trong card, ngoài hero | Không | Không |

Danh sách lấy từ khảo sát DOM cả 11 trang ở 1440×900: mọi chữ từ 40px và phần tử ảnh, video, canvas hoặc
`background-image` nằm dưới nó. Hero mới sau này theo R3, không cần sửa bảng trừ khi owner chỉnh quy tắc.

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| DOM hook | `[data-scroll]`, `[data-scroll-speed]` | Locomotive đọc; gắn trên lớp media nền theo R3 |
| Cấu hình | `initSmoothScroll` trong `src/site/motion.js` | Cấu hình cuộn duy nhất của R1 |
| Hàm public | `window.TruongThinhMotion` | Khóa, đặt, đọc vị trí cuộn logic; Advertising dùng chung |

## UI

Chuẩn cuộn và quy tắc parallax ghi ở [Motion](../../design-system/motion.md#smooth-scroll-và-parallax). Khi owner duyệt
spec, quy tắc vào [Đã duyệt, chờ code](../../design-system/approved-designs.md); PR code chuyển vào Motion rồi xóa mục.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1 | Chưa có test; plan thêm e2e so đường trượt của 11 trang với trang chủ |
| R2 | Chưa có test; Chrome trace trên PC của owner, script đo do plan thêm |
| R3, R4 | Chưa có test; plan thêm e2e kiểm `data-scroll-speed` từng section và không lộ mép ảnh |

## Gate còn mở

- R2: cần trace trên PC thật của owner (Remote Control); máy cloud không có GPU nên không thay được.

## Chú thích thuật ngữ

- **Smooth scroll**: cuộn có quán tính do Locomotive tính, thay vì nhảy theo từng nấc chuột.
- **Parallax**: lớp nền trôi khác tốc độ với chữ khi cuộn, tạo chiều sâu.
- **Speed `-2`**: độ lệch bằng khoảng cách tâm viewport tới tâm phần tử nhân `0.2`, tức trôi chậm hơn 20%.
- **Frame rớt**: frame trình duyệt không vẽ kịp trong nhịp màn hình, mắt thấy là khựng.
- **Task trên 50ms**: việc chặn luồng chính đủ lâu để cuộn và nhập liệu bị trễ.
- **Route con**: Advertising lọc nhóm `?category=<nhóm>` và detail ảnh `?photo=<id>`.
- **Lộ mép**: khoảng trống hiện ra ở mép section khi lớp ảnh trôi lệch khỏi khung.
