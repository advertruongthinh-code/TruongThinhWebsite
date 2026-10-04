---
title: CTA Advertising giữa viewport, footer gọn và parallax
status: planned
tests: []
notion: none
updated: 2026-10-04
---

# CTA Advertising giữa viewport, footer gọn và parallax

## Mục đích

Owner đổi contract CTA cuối masonry Advertising ngày 2026-10-04: cuộn tới cuối
trang thì tiêu đề CTA "Dấu ấn tiếp theo / dành cho thương hiệu của bạn" nằm giữa
viewport, có parallax, ở mọi cỡ cửa sổ và thiết bị. CTA nằm trên batch skeleton
cuối masonry; chiều cao card trong batch đổi để tiêu đề tới đúng giữa. Footer
trên điện thoại thấp lại để vùng CTA là vùng chính, theo tỉ lệ vàng.

Contract hiện tại giữ khoảng cách cố định từ chữ CTA tới footer theo viewport và
đặt điểm nhìn cao hơn tâm hình học ([organic random](advertising-organic-random.md),
[P7.4](advertising-photo-browse.md#correction-p74--owner-xác-nhận-ngày-2026-09-23),
[P7.1](advertising-skeleton-flow.md#correction-p71--organic-continuation-và-paint-overflow)).
Khi owner duyệt spec này, ba điểm đó được thay bằng R1–R4 dưới đây; phần còn
lại của các spec cũ (skeleton, glass) giữ nguyên. Bản chạy thử ở mục "CTA cuối
trang" của [Kính chờ Trường Thịnh](https://claude.ai/artifact/PNv9Hg2Tpc1b2sLEEjQxZf)
(phiên bản 6), dựng theo số đo dưới đây.

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

Với footer hiện tại, tiêu đề không thể nằm giữa ở 320×568, 360×800, 844×390 và
mọi laptop cao dưới khoảng 900px: phần dưới tâm không đủ chỗ cho nửa tiêu đề,
link và footer. Footer gọn ở R3 giải quyết việc này.

## Hành vi

### R1. Tiêu đề CTA giữa viewport ở cuối trang

Tại cuối trang (`scrollY` bằng giới hạn cuộn), tâm dọc của tiêu đề CTA trùng
tâm viewport, sai số `≤1 CSS px`. Chỉ tính tiêu đề; link "Trao đổi ý tưởng" nằm
dưới tiêu đề một gap masonry và không tính vào tâm. Tâm là tâm cả viewport,
không trừ header. Viewport là vùng nhìn thấy sau khi thanh địa chỉ của điện
thoại ổn định. Yêu cầu giữ ở mọi chiều rộng từ 320px, dọc và ngang, VI/EN, mọi
bộ lọc, direct load, chuyển route và Back.

```gherkin
Given trang Advertising ở bất kỳ cỡ cửa sổ nào không thuộc R4
When người xem cuộn tới cuối trang
Then tâm tiêu đề CTA trùng tâm viewport, sai số 1px
And link nằm dưới tiêu đề một gap masonry, footer hiện trọn bên dưới
```

### R2. Batch skeleton dưới CTA co giãn

CTA phủ lên batch skeleton cuối masonry. Batch bắt đầu một gap dưới card thật
ở mỗi cột và kết thúc ngay trên khoảng trên footer. Batch cao ít nhất bằng
viewport trừ footer, khoảng trên footer và một gap, như hiện tại. Tâm tiêu đề
cách đáy batch `D = vh/2 − footer − khoảng trên footer`, nên vị trí cuối không
phụ thuộc số card thật phía trên. Link cách đáy batch ít nhất một gap.

Card skeleton giữ tỉ lệ ngẫu nhiên theo ratio band, trừ card cuối của mỗi cột:
card này đổi chiều cao để đáy trùng đáy batch. Phần còn lại ngắn hơn `0.25` bề
rộng card thì card trước đó dài thêm, không có card mỏng hơn mức đó. Skeleton
vẫn tan dưới glass như cũ.

```gherkin
Given masonry kết thúc ở bất kỳ độ cao nào
When runtime dựng batch skeleton cuối
Then card cuối mỗi cột có đáy trùng đáy batch
And tâm tiêu đề cách đáy batch đúng D
```

### R3. Footer gọn theo tỉ lệ vàng

Ở cuối trang, footer cộng khoảng trên footer không quá `38.2%` viewport, để vùng
CTA chiếm ít nhất `61.8%`. Footer giữ nội dung và thứ tự (địa chỉ, mạng xã hội,
bản quyền), đổi bố cục:

- Điện thoại dọc (`≤750px`), mọi trang: hai hàng. Hàng đầu nhãn "Trụ sở" và
  địa chỉ `1rem`; hàng hai bốn icon mạng xã hội `24px` cách nhau `8px` bên trái,
  dòng bản quyền bên phải, hàng cao `44px`. Footer cao khoảng 130px, thay
  330–351px.
- Màn ngang thấp (cao `≤640px`) mọi trang, và trang Advertising từ `751px`:
  một hàng, địa chỉ, icon, bản quyền. Cao 67–90px, thay 222px.
- Nhãn "Mạng xã hội" ẩn bằng mắt, nhóm vẫn giữ `aria-label`. Viền trên một
  đường `line` thay ba đường.
- Khoảng trên footer giữ `48px` trên điện thoại dọc và `64px` trên desktop. Màn
  ngang thấp ở Advertising bỏ khoảng này: batch chạm footer, link vẫn cách đáy
  batch một gap.
- Màn ngang thấp dùng chung cỡ tiêu đề `clamp(1.125rem, 4.5svh, 2.5rem)` ở mọi
  chiều rộng, thay quy tắc chỉ từ `751px`.

Footer đầy đủ hai cột trên desktop giữ nguyên ở các trang khác.

```gherkin
Given điện thoại 390×844 ở bất kỳ trang nào
When người xem cuộn tới footer
Then footer có hai hàng và cao không quá 38.2% viewport
```

### R4. Màn quá thấp

Khi viewport quá thấp để R1 đúng, tiêu đề lên sát tâm nhất có thể: `D` tăng tới
mức link cách đáy batch đúng một gap, tiêu đề cách link một gap. Theo số đo dưới, chỉ xảy ra
khi điện thoại ngang thấp hơn 360px, như 568×320, hoặc cửa sổ desktop thấp hơn
khoảng 365px (1280×360 thiếu 1px).

```gherkin
Given viewport 568×320
When người xem cuộn tới cuối trang
Then footer hiện trọn, link cách đáy batch một gap
And tiêu đề không đè header hay footer
```

### R5. Parallax của CTA

Tiêu đề và link trôi chậm hơn nội dung 10% khi cuộn trong đoạn cuối trang. Độ
lệch dọc bằng (giới hạn cuộn trừ `scrollY`) nhân `-0.1`, tức cùng công thức
`data-scroll-position="bottom"`, `data-scroll-speed="-1"` của Locomotive. Độ
lệch bằng 0 đúng tại cuối trang, nên vị trí cuối của R1 và R4 không đổi.

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

### R6. Giảm chuyển động

Với `prefers-reduced-motion: reduce`, không có parallax; CTA đứng đúng vị trí
cuối của R1 hoặc R4.

```gherkin
Given người xem bật giảm chuyển động
When người xem cuộn tới cuối trang
Then CTA không có độ lệch parallax nào và nằm đúng vị trí cuối
```

### R7. Đổi cỡ và thanh địa chỉ

Đổi cỡ cửa sổ, xoay máy, đổi ngôn ngữ hay bộ lọc thì batch và vị trí cuối được
tính lại theo viewport mới. Thanh địa chỉ điện thoại hiện hoặc ẩn khi cuộn không
được làm CTA giật hay dựng lại skeleton; vị trí cuối đúng sau khi thanh địa chỉ
ổn định.

```gherkin
Given điện thoại đang ở cuối trang
When thanh địa chỉ ẩn rồi hiện lại
Then CTA không giật, và khi thanh địa chỉ đứng yên tâm tiêu đề trùng tâm viewport
```

## Số đo footer gọn

Đo ngày 04/10 bằng cách chèn CSS footer gọn vào trang hiện tại (Chromium,
VI). Chỗ dư là khoảng còn lại dưới link khi tiêu đề ở tâm, tính từ kích thước
đo được; số âm là R4. EN cho cùng kết quả hoặc dư hơn ở các cỡ đã đo.

| Viewport | Footer gọn | Footer và khoảng trên / viewport | Chỗ dư |
| --- | --- | --- | --- |
| 320×568 | 130px | 31.3% | 21px |
| 360×800 | 130px | 22.3% | 112px |
| 390×844 | 130px | 21.1% | 134px |
| 640×360 | 90px | 25.0% | 16px |
| 844×390 | 67px | 17.2% | 54px |
| 768×1024 | 90px | 15.0% | 257px |
| 1280×720 | 67px | 18.2% | 67px |
| 1366×657 | 67px | 19.9% | 31px |
| 1440×900 | 67px | 14.6% | 148px |
| 1920×1080 | 67px | 12.1% | 220px |
| 568×320 | 112px | 35.0% | -26px |

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Runtime | `renderCtaSkeleton` (`catalog-runtime.mjs`) | Tính chiều cao batch và `D` theo R1, R2, R4 |
| Code | `createSkeletonFlowFrameLayout` (`skeleton-flow.mjs`) | Card cuối mỗi cột có đáy trùng đáy batch |
| CSS | `.detail-cta[data-advertising-grid-cta]` (`detail.css`) | Bỏ hàng lưới 38.2% và 28%; đặt tâm tiêu đề theo `D` ở mọi chiều rộng |
| CSS | `.site-footer` (`style.css`) | Footer gọn R3 |
| Motion | Phần tử bọc `.detail-cta__copy` | Mang độ lệch parallax R5 |

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1–R4 | chưa có test; đo ở mọi cỡ trong bảng số đo, VI và EN |
| R5–R6 | chưa có test |
| R7 | chưa có test; A05s thật |

## Gate còn mở

- Owner duyệt spec này và bản chạy thử phiên bản 6.
- PR code làm R1–R7 kèm test, cập nhật cùng lúc ba spec cũ ở mục Mục đích,
  [Footer](../../design-system/components/Footer/README.md) và
  [Motion](../../design-system/motion.md) mục parallax.

## Chú thích thuật ngữ

- **Tiêu đề CTA**: dòng "Dấu ấn tiếp theo / dành cho thương hiệu của bạn".
- **Cụm chữ CTA**: tiêu đề CTA và link liên hệ ngay dưới nó.
- **Batch skeleton**: nhóm card skeleton nối tiếp masonry ở cuối trang.
- **Ratio band**: nhóm tỉ lệ cao trên rộng dùng để chọn chiều cao card skeleton.
- **Giới hạn cuộn**: `scrollY` lớn nhất, khi đáy trang chạm đáy viewport.
- **Tỉ lệ vàng**: chia `61.8%` và `38.2%`; ở đây vùng CTA và footer.
- **Parallax**: lớp nội dung chạy khác tốc độ cuộn để tạo chiều sâu.
- **Gap masonry**: khoảng cách giữa hai card trong lưới Advertising.
- **Thanh địa chỉ**: thanh URL của trình duyệt điện thoại, tự ẩn hiện khi cuộn.
