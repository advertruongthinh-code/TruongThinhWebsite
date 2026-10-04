---
title: CTA Advertising giữa viewport và parallax
status: planned
tests: []
notion: none
updated: 2026-10-04
---

# CTA Advertising giữa viewport và parallax

## Mục đích

Owner đổi contract CTA cuối masonry Advertising ngày 2026-10-04: cuộn tới cuối
trang thì cụm chữ CTA ("Dấu ấn tiếp theo / dành cho thương hiệu của bạn" và link
"Trao đổi ý tưởng") nằm giữa viewport, có parallax, ở mọi cỡ cửa sổ và thiết bị.

Contract hiện tại giữ khoảng cách cố định từ chữ CTA tới footer theo viewport và
đặt điểm nhìn cao hơn tâm hình học ([organic random](advertising-organic-random.md),
[P7.4](advertising-photo-browse.md#correction-p74--owner-xác-nhận-ngày-2026-09-23),
[P7.1](advertising-skeleton-flow.md#correction-p71--organic-continuation-và-paint-overflow)).
Khi owner duyệt spec này, ba điểm đó được thay bằng R1–R3 dưới đây; phần còn
lại của các spec cũ (skeleton, glass, footer trọn trong viewport) giữ nguyên.
Bản chạy thử ở mục "CTA cuối trang" của
[Kính chờ Trường Thịnh](https://claude.ai/artifact/PNv9Hg2Tpc1b2sLEEjQxZf)
(phiên bản 5), dựng theo số đo dưới đây.

Số đo hiện tại tại cuối trang (`/vi/advertising-products/`, Chromium, 04/10):

| Viewport | Footer cao | Tâm cụm chữ CTA | Tâm viewport |
| --- | --- | --- | --- |
| 320×568 | 351px | 110px | 284px |
| 360×800 | 351px | 200px | 400px |
| 390×844 | 330px | 218px | 422px |
| 844×390 | 222px | 80px | 195px |
| 768×1024 | 222px | 334px | 512px |
| 1440×900 | 222px | 325px | 450px |
| 1920×1080 | 222px | 402px | 540px |

## Hành vi

### R1. CTA giữa viewport ở cuối trang

Tại cuối trang (`scrollY` bằng giới hạn cuộn), tâm dọc của cụm chữ CTA trùng
tâm viewport người xem đang thấy, sai số `≤1 CSS px`. Viewport là vùng nhìn thấy
sau khi thanh địa chỉ của trình duyệt điện thoại ổn định. Toàn bộ footer vẫn nằm
trong viewport, bên dưới CTA. Yêu cầu giữ ở mọi chiều rộng từ 320px, dọc và
ngang, VI/EN, mọi bộ lọc, direct load, chuyển route và Back.

Khoảng từ chữ CTA tới footer không còn cố định: nó là phần còn lại sau khi đặt
CTA ở giữa. Skeleton vẫn nối từ đáy card thật và kết thúc dưới glass như cũ.

```gherkin
Given trang Advertising ở bất kỳ cỡ cửa sổ nào đủ chỗ cho CTA và footer
When người xem cuộn tới cuối trang
Then tâm cụm chữ CTA trùng tâm viewport, sai số 1px
And toàn bộ footer nằm trong viewport bên dưới CTA
```

### R2. Màn thấp

Màn thấp là khi chiều cao footer cộng nửa cụm chữ CTA cộng một gap masonry lớn
hơn nửa viewport. Theo số đo trên, gồm 320×568, 360×800 và điện thoại xoay ngang
844×390; A05s có thanh địa chỉ có thể thuộc nhóm này (suy luận, chưa đo).
[CẦN LÀM RÕ: owner chọn trên thẻ quyết định ngày 04/10. Mặc định đề xuất: CTA
lên sát giữa nhất có thể, footer vẫn hiện trọn, chữ CTA cách footer đúng một gap
masonry.]

```gherkin
Given viewport 320×568
When người xem cuộn tới cuối trang
Then footer hiện trọn, CTA cách footer đúng một gap masonry
And CTA không đè header hay footer
```

### R3. Parallax của CTA

Cụm chữ CTA trôi chậm hơn nội dung 10% khi cuộn trong đoạn cuối trang. Độ lệch
dọc bằng (giới hạn cuộn trừ `scrollY`) nhân `-0.1`, tức cùng công thức
`data-scroll-position="bottom"`, `data-scroll-speed="-1"` của Locomotive. Độ
lệch bằng 0 đúng tại cuối trang, nên vị trí cuối của R1 và R2 không đổi.

Parallax chạy ở mọi chiều rộng. Từ 981px, Locomotive đang chạy smooth scroll
nên dùng thuộc tính của nó. Dưới 981px trang dùng scroll native, nên PR code tự
áp cùng công thức mà không cần Locomotive. Lớp parallax là phần tử bọc cụm chữ,
tách khỏi line reveal của tiêu đề. Chỉ animate `transform`.

```gherkin
Given CTA vừa vào viewport từ dưới lên
When người xem cuộn thêm 100px
Then cụm chữ CTA đi lên 90px
And tại cuối trang độ lệch parallax bằng 0
```

### R4. Giảm chuyển động

Với `prefers-reduced-motion: reduce`, không có parallax; CTA đứng đúng vị trí
cuối của R1 hoặc R2.

```gherkin
Given người xem bật giảm chuyển động
When người xem cuộn tới cuối trang
Then CTA không có độ lệch parallax nào và nằm đúng vị trí cuối
```

### R5. Đổi cỡ và thanh địa chỉ

Đổi cỡ cửa sổ, xoay máy, đổi ngôn ngữ hay bộ lọc thì vị trí cuối được tính lại
theo viewport mới. Thanh địa chỉ điện thoại hiện hoặc ẩn khi cuộn không được làm
CTA giật hay dựng lại skeleton; vị trí cuối đúng sau khi thanh địa chỉ ổn định.

```gherkin
Given điện thoại đang ở cuối trang
When thanh địa chỉ ẩn rồi hiện lại
Then CTA không giật, và khi thanh địa chỉ đứng yên tâm CTA trùng tâm viewport
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Runtime | `renderCtaSkeleton` (`catalog-runtime.mjs`) | Tính `--advertising-cta-tail-height` để R1 hoặc R2 đúng |
| CSS | `.detail-cta[data-advertising-grid-cta]` (`detail.css`) | Bỏ hàng lưới 38.2% và 28% đang đặt điểm nhìn |
| Motion | Phần tử bọc `.detail-cta__copy` | Mang độ lệch parallax R3 |

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1–R2 | chưa có test; đo ở 320×568, 360×800, 390×844, 844×390, 768×1024, 1024×768, 1280×720, 1440×900, 1920×1080 |
| R3–R4 | chưa có test |
| R5 | chưa có test; A05s thật |

## Gate còn mở

- Owner chọn cách xử lý màn thấp (R2) và duyệt spec này.
- PR code làm R1–R5 kèm test, cập nhật ba spec cũ ở mục Mục đích và
  [Motion](../../design-system/motion.md) mục parallax cùng lúc.

## Chú thích thuật ngữ

- **Cụm chữ CTA**: tiêu đề CTA và link liên hệ ngay dưới nó.
- **Giới hạn cuộn**: `scrollY` lớn nhất, khi đáy trang chạm đáy viewport.
- **Parallax**: lớp nội dung chạy khác tốc độ cuộn để tạo chiều sâu.
- **Gap masonry**: khoảng cách giữa hai card trong lưới Advertising.
- **Thanh địa chỉ**: thanh URL của trình duyệt điện thoại, tự ẩn hiện khi cuộn.
