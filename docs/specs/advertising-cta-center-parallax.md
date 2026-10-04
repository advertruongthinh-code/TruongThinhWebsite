---
title: CTA Advertising giữa viewport, cỡ tiêu đề, footer cửa sổ nhỏ và parallax
status: planned
tests: []
notion: none
updated: 2026-10-04
---

# CTA Advertising giữa viewport, cỡ tiêu đề, footer cửa sổ nhỏ và parallax

## Mục đích

Owner đổi contract CTA cuối masonry Advertising ngày 2026-10-04: cuộn tới cuối
trang thì tiêu đề CTA "Dấu ấn tiếp theo / dành cho thương hiệu của bạn" nằm giữa
viewport, có parallax, ở mọi cỡ cửa sổ và thiết bị. CTA nằm trên batch skeleton
cuối masonry; chiều cao card trong batch đổi để tiêu đề tới đúng giữa. Tiêu đề
luôn lớn hơn hoặc bằng nút "Trao đổi ý tưởng". Footer chỉ đổi thiết kế ở cửa sổ
nhỏ và điện thoại, để vùng CTA là vùng chính; các trường hợp khác giữ footer
hiện tại.

Contract hiện tại giữ khoảng cách cố định từ chữ CTA tới footer theo viewport và
đặt điểm nhìn cao hơn tâm hình học ([organic random](advertising-organic-random.md),
[P7.4](advertising-photo-browse.md#correction-p74--owner-xác-nhận-ngày-2026-09-23),
[P7.1](advertising-skeleton-flow.md#correction-p71--organic-continuation-và-paint-overflow)).
Khi owner duyệt spec này, ba điểm đó được thay bằng R1–R5 dưới đây; phần còn
lại của các spec cũ (skeleton, glass) giữ nguyên. Bản chạy thử ở mục "CTA cuối
trang" của [Kính chờ Trường Thịnh](https://claude.ai/artifact/PNv9Hg2Tpc1b2sLEEjQxZf)
(phiên bản 7), dựng theo số đo dưới đây.

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

Với footer và cỡ tiêu đề hiện tại, tiêu đề không thể nằm giữa ở 320×568,
360×800, 844×390 và mọi laptop cao dưới khoảng 900px: phần dưới tâm không đủ chỗ
cho nửa tiêu đề, link và footer. R2–R4 giải quyết việc này.

## Hành vi

### R1. Tiêu đề CTA giữa viewport ở cuối trang

Tại cuối trang (`scrollY` bằng giới hạn cuộn), tâm dọc của tiêu đề CTA trùng
tâm viewport, sai số `≤1 CSS px`. Chỉ tính tiêu đề; link "Trao đổi ý tưởng" nằm
dưới tiêu đề một gap masonry và không tính vào tâm. Tâm là tâm cả viewport,
không trừ header. Viewport là vùng nhìn thấy sau khi thanh địa chỉ của điện
thoại ổn định. Yêu cầu giữ ở mọi chiều rộng từ 320px, dọc và ngang, VI/EN, mọi
bộ lọc, direct load, chuyển route và Back.

```gherkin
Given trang Advertising ở bất kỳ cỡ cửa sổ nào không thuộc R5
When người xem cuộn tới cuối trang
Then tâm tiêu đề CTA trùng tâm viewport, sai số 1px
And link nằm dưới tiêu đề một gap masonry, footer hiện trọn bên dưới
```

### R2. Batch skeleton dưới CTA co giãn

CTA phủ lên batch skeleton cuối masonry. Batch bắt đầu một gap dưới card thật
ở mỗi cột và kết thúc ngay trên footer: trang Advertising bỏ khoảng trên footer
(`--footer-top-gap: 0`) ở mọi cỡ, vì batch đã lấp chỗ đó. Batch cao ít nhất bằng
viewport trừ footer và một gap, như hiện tại. Tâm tiêu đề cách đáy batch
`D = vh/2 − footer`, nên vị trí cuối không phụ thuộc số card thật phía trên.
Link cách đáy batch ít nhất một gap.

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

### R3. Cỡ tiêu đề không nhỏ hơn nút

Tiêu đề dùng cỡ chữ hiện tại của CSS. Khi cỡ đó không đủ chỗ cho R1, runtime
giảm cỡ chữ vừa đủ để tâm tiêu đề tới tâm viewport, nhưng không dưới `18px`
(`1.125rem`). Ở `18px`, chữ thường của tiêu đề cao 10px, bằng chữ hoa 9.7px của
nút "Trao đổi ý tưởng" (`0.8rem`, 700, chữ hoa), và dòng dài nhất rộng 257px so
với nút 170px; đo bằng font Plus Jakarta Sans của site. Cỡ chữ không tăng quá
cỡ CSS hiện tại.

```gherkin
Given cửa sổ 1280×720 với footer hiện tại
When người xem cuộn tới cuối trang
Then tiêu đề nhỏ lại vừa đủ để nằm giữa viewport
And tiêu đề không nhỏ hơn 18px
```

### R4. Footer ở cửa sổ nhỏ và điện thoại

Footer hiện tại giữ nguyên, trừ cửa sổ nhỏ: rộng `≤750px` hoặc cao `≤680px`. Mốc
`680px` là cửa sổ thấp nhất mà footer hiện tại (222px) còn chừa đủ chỗ cho tiêu
đề `18px` nằm giữa (673px ở gap 35px, làm tròn lên). Ở cửa sổ nhỏ, mọi trang dùng
footer gọn, giữ nội dung và thứ tự (địa chỉ, mạng xã hội, bản quyền):

- Rộng `≤750px` và dọc: hai hàng. Hàng đầu nhãn "Trụ sở" và địa chỉ `1rem`;
  hàng hai bốn icon mạng xã hội `24px` cách nhau `8px` bên trái, dòng bản quyền
  bên phải, hàng cao `44px`. Footer cao khoảng 130px, thay 330–351px.
- Các cửa sổ nhỏ còn lại: một hàng, địa chỉ, icon, bản quyền. Cao 67–112px.
- Nhãn "Mạng xã hội" ẩn bằng mắt, nhóm vẫn giữ `aria-label`. Viền trên một
  đường `line` thay ba đường.

Footer gọn không quá `38.2%` viewport (tỉ lệ vàng), để vùng CTA chiếm ít nhất
`61.8%`.

```gherkin
Given điện thoại 390×844 ở bất kỳ trang nào
When người xem cuộn tới footer
Then footer có hai hàng và cao không quá 38.2% viewport
```

```gherkin
Given cửa sổ desktop 1440×900
When người xem cuộn tới footer
Then footer giống footer hiện tại
```

### R5. Màn quá thấp

Khi tiêu đề `18px` vẫn không đủ chỗ cho R1, tiêu đề giữ `18px` và lên sát tâm
nhất có thể: `D` tăng tới mức link cách đáy batch đúng một gap, tiêu đề cách
link một gap. Theo số đo dưới, chỉ 568×320 thuộc nhóm này.

```gherkin
Given viewport 568×320
When người xem cuộn tới cuối trang
Then footer hiện trọn, link cách đáy batch một gap
And tiêu đề không đè header hay footer
```

### R6. Parallax của CTA

Tiêu đề và link trôi chậm hơn nội dung 10% khi cuộn trong đoạn cuối trang. Độ
lệch dọc bằng (giới hạn cuộn trừ `scrollY`) nhân `-0.1`, tức cùng công thức
`data-scroll-position="bottom"`, `data-scroll-speed="-1"` của Locomotive. Độ
lệch bằng 0 đúng tại cuối trang, nên vị trí cuối của R1 và R5 không đổi.

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

### R7. Giảm chuyển động

Với `prefers-reduced-motion: reduce`, không có parallax; CTA đứng đúng vị trí
cuối của R1 hoặc R5.

```gherkin
Given người xem bật giảm chuyển động
When người xem cuộn tới cuối trang
Then CTA không có độ lệch parallax nào và nằm đúng vị trí cuối
```

### R8. Đổi cỡ và thanh địa chỉ

Đổi cỡ cửa sổ, xoay máy, đổi ngôn ngữ hay bộ lọc thì batch, cỡ tiêu đề và vị trí
cuối được tính lại theo viewport mới. Thanh địa chỉ điện thoại hiện hoặc ẩn khi cuộn không
được làm CTA giật hay dựng lại skeleton; vị trí cuối đúng sau khi thanh địa chỉ
ổn định.

```gherkin
Given điện thoại đang ở cuối trang
When thanh địa chỉ ẩn rồi hiện lại
Then CTA không giật, và khi thanh địa chỉ đứng yên tâm tiêu đề trùng tâm viewport
```

## Số đo

Đo ngày 04/10 bằng cách chèn CSS của R2 và R4 vào trang hiện tại (Chromium, VI),
rồi tính cỡ tiêu đề theo R3 từ kích thước đo được. EN cho cùng kết quả ở các cỡ
đã đo.

| Viewport | Footer | Footer / viewport | Tiêu đề | Kết quả |
| --- | --- | --- | --- | --- |
| 320×568 | gọn 130px | 22.9% | 18px | giữa |
| 390×844 | gọn 130px | 15.4% | 32px | giữa |
| 640×360 | gọn 90px | 25.0% | 32 xuống 30.8px | giữa |
| 844×390 | gọn 67px | 17.2% | 18px | giữa |
| 768×1024 | hiện tại 222px | 21.7% | 40px | giữa |
| 1024×768 | hiện tại 222px | 28.9% | 46px | giữa |
| 1366×657 | gọn 67px | 10.2% | 61.5px | giữa |
| 1280×720 | hiện tại 222px | 30.8% | 57.6 xuống 37.6px | giữa |
| 1536×730 | hiện tại 222px | 30.4% | 69.1 xuống 41.6px | giữa |
| 1920×700 | hiện tại 222px | 31.7% | 80 xuống 29.2px | giữa |
| 1440×789 | hiện tại 222px | 28.1% | 64.8px | giữa |
| 1440×900 | hiện tại 222px | 24.7% | 64.8px | giữa |
| 1920×1080 | hiện tại 222px | 20.6% | 80px | giữa |
| 568×320 | gọn 112px | 35.0% | 18px | R5 |

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Runtime | `renderCtaSkeleton` (`catalog-runtime.mjs`) | Tính chiều cao batch, `D` và cỡ tiêu đề theo R1, R2, R3, R5 |
| Code | `createSkeletonFlowFrameLayout` (`skeleton-flow.mjs`) | Card cuối mỗi cột có đáy trùng đáy batch |
| CSS | `.detail-cta[data-advertising-grid-cta]` (`detail.css`) | Bỏ hàng lưới 38.2% và 28%; đặt tâm tiêu đề theo `D` ở mọi chiều rộng |
| CSS | `.site-footer` (`style.css`) | Footer gọn R4 ở `(max-width: 750px), (max-height: 680px)` |
| CSS | `body.is-advertising-browse` (`detail.css`) | `--footer-top-gap: 0` ở mọi cỡ, thay 64px, 48px và 28px |
| Motion | Phần tử bọc `.detail-cta__copy` | Mang độ lệch parallax R6 |

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1–R5 | chưa có test; đo ở mọi cỡ trong bảng số đo, VI và EN |
| R6–R7 | chưa có test |
| R8 | chưa có test; A05s thật |

## Gate còn mở

- Owner duyệt spec này và bản chạy thử phiên bản 7.
- PR code làm R1–R8 kèm test, cập nhật cùng lúc ba spec cũ ở mục Mục đích,
  [Footer](../../design-system/components/Footer/README.md) và
  [Motion](../../design-system/motion.md) mục parallax.

## Chú thích thuật ngữ

- **Tiêu đề CTA**: dòng "Dấu ấn tiếp theo / dành cho thương hiệu của bạn".
- **Cụm chữ CTA**: tiêu đề CTA và link liên hệ ngay dưới nó.
- **Batch skeleton**: nhóm card skeleton nối tiếp masonry ở cuối trang.
- **Ratio band**: nhóm tỉ lệ cao trên rộng dùng để chọn chiều cao card skeleton.
- **Giới hạn cuộn**: `scrollY` lớn nhất, khi đáy trang chạm đáy viewport.
- **Tỉ lệ vàng**: chia `61.8%` và `38.2%`; ở đây vùng CTA và footer.
- **Cửa sổ nhỏ**: cửa sổ rộng tối đa 750px hoặc cao tối đa 680px.
- **Chữ thường cao, chữ hoa cao**: chiều cao chữ `x` và chữ `T` của font.
- **Parallax**: lớp nội dung chạy khác tốc độ cuộn để tạo chiều sâu.
- **Gap masonry**: khoảng cách giữa hai card trong lưới Advertising.
- **Thanh địa chỉ**: thanh URL của trình duyệt điện thoại, tự ẩn hiện khi cuộn.
