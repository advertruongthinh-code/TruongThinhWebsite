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
trang thì chân chữ dòng cuối của tiêu đề "Dấu ấn tiếp theo / dành cho thương hiệu
của bạn" nằm đúng đường giữa viewport, nút "Trao đổi ý tưởng" ngay dưới, có
parallax, ở mọi cỡ cửa sổ và thiết bị. CTA nằm trên batch skeleton cuối masonry;
chiều cao card trong batch đổi để chân chữ tới đúng giữa. Tiêu đề luôn lớn hơn
nút. Footer chỉ đổi thiết kế ở cửa sổ nhỏ và điện thoại, để vùng CTA là vùng
chính; các trường hợp khác giữ footer hiện tại. Footer mọi trang còn ba icon mạng
xã hội: Facebook, TikTok, YouTube.

Contract hiện tại giữ khoảng cách cố định từ chữ CTA tới footer theo viewport và
đặt điểm nhìn cao hơn tâm hình học ([organic random](advertising-organic-random.md),
[P7.4](advertising-photo-browse.md#correction-p74--owner-xác-nhận-ngày-2026-09-23),
[P7.1](advertising-skeleton-flow.md#correction-p71--organic-continuation-và-paint-overflow)).
Khi owner duyệt spec này, ba điểm đó được thay bằng R1–R5 dưới đây; phần còn
lại của các spec cũ (skeleton, glass) giữ nguyên. Bản chạy thử ở mục "CTA cuối
trang" của [Kính chờ Trường Thịnh](https://claude.ai/artifact/PNv9Hg2Tpc1b2sLEEjQxZf)
(phiên bản 9), dựng theo số đo dưới đây.

Số đo hiện tại tại cuối trang (`/vi/advertising-products/`, Chromium, 04/10):

| Viewport | Footer cao | Chân chữ dòng cuối | Đường giữa viewport |
| --- | --- | --- | --- |
| 320×568 | 351px | 119px | 284px |
| 360×800 | 351px | 231px | 400px |
| 390×844 | 330px | 250px | 422px |
| 844×390 | 222px | 68px | 195px |
| 768×1024 | 222px | 331px | 512px |
| 1440×900 | 222px | 321px | 450px |
| 1920×1080 | 222px | 405px | 540px |

Với footer và khoảng trên footer hiện tại, chân chữ không thể tới giữa ở
320×568, 360×800, 844×390 và laptop cao dưới khoảng 790px (tính từ số đo): dưới
đường giữa không đủ chỗ cho phần còn lại của dòng cuối, nút và footer. R2–R4
giải quyết việc này.

## Hành vi

### R1. Chân chữ dòng cuối của tiêu đề ở giữa viewport

Tại cuối trang (`scrollY` bằng giới hạn cuộn), chân chữ dòng cuối của tiêu đề
CTA nằm đúng đường giữa viewport (`vh/2`), sai số `≤1 CSS px`. Chân chữ là
đường các chữ đứng lên; đuôi chữ `g`, `y` và dấu nặng nằm dưới đường này. Dòng
cuối tính sau khi tiêu đề xuống dòng theo bề rộng thật, nên tiêu đề hai hay ba
dòng đều neo theo dòng cuối. Nút "Trao đổi ý tưởng" nằm dưới tiêu đề một gap
masonry. Đường giữa là giữa cả viewport, không trừ header. Viewport là vùng nhìn
thấy sau khi thanh địa chỉ của điện thoại ổn định. Yêu cầu giữ ở mọi chiều rộng
từ 320px, dọc và ngang, VI/EN, mọi bộ lọc, direct load, chuyển route và Back.

```gherkin
Given trang Advertising ở bất kỳ cỡ cửa sổ nào không thuộc R5
When người xem cuộn tới cuối trang
Then chân chữ dòng cuối của tiêu đề nằm trên đường giữa viewport, sai số 1px
And nút "Trao đổi ý tưởng" nằm dưới tiêu đề một gap
And footer hiện trọn bên dưới
```

### R2. Batch skeleton dưới CTA co giãn

CTA phủ lên batch skeleton cuối masonry. Batch bắt đầu một gap dưới card thật
ở mỗi cột và kết thúc ngay trên footer: trang Advertising bỏ khoảng trên footer
(`--footer-top-gap: 0`) ở mọi cỡ, vì batch đã lấp chỗ đó. Batch cao ít nhất bằng
viewport trừ footer và một gap, như hiện tại. Chân chữ dòng cuối cách đáy batch
`D = vh/2 − footer`, nên vị trí cuối không phụ thuộc số card thật phía trên.
Nút cách đáy batch ít nhất một gap.

Card skeleton giữ tỉ lệ ngẫu nhiên theo ratio band, trừ card cuối của mỗi cột:
card này đổi chiều cao để đáy trùng đáy batch. Phần còn lại ngắn hơn `0.25` bề
rộng card thì card trước đó dài thêm, không có card mỏng hơn mức đó. Skeleton
vẫn tan dưới glass như cũ.

```gherkin
Given masonry kết thúc ở bất kỳ độ cao nào
When runtime dựng batch skeleton cuối
Then card cuối mỗi cột có đáy trùng đáy batch
And chân chữ dòng cuối cách đáy batch đúng D
```

### R3. Tiêu đề luôn lớn hơn nút

Tiêu đề không bao giờ nhỏ hơn `1.3rem` (20.8px), bằng cỡ chữ nút (`0.8rem`,
12.8px) nhân tỉ lệ vàng `1.618`. Ở cỡ này chữ hoa của tiêu đề cao gấp 1.6 lần chữ
hoa của nút, và chữ thường của tiêu đề (11.2px) đã cao hơn chữ hoa của nút
(9.7px); đo bằng font Plus Jakarta Sans của site. Hai quy tắc CSS màn thấp đang
cho tiêu đề tối thiểu `1.125rem` (18px) đổi mức tối thiểu sang `1.3rem`.

Tiêu đề dùng cỡ chữ CSS. Dưới chân chữ cần chỗ cho phần còn lại của dòng cuối
(`0.197` lần cỡ chữ với line-height 1.2), một gap, nút và một gap tới đáy batch.
Khi chỗ đó không đủ trong `D`, runtime giảm cỡ chữ vừa đủ, không dưới `1.3rem` và
không tăng quá cỡ CSS. Phần trên chân chữ không giới hạn cỡ chữ: đỉnh tiêu đề
luôn dưới header ở mọi cỡ đã đo. Theo số đo, tiêu đề chỉ nhỏ lại ở cửa sổ cao
từ 641px tới khoảng 662px với footer hiện tại; tiêu đề CSS càng lớn, mốc trên
càng cao.

```gherkin
Given cửa sổ 1366×645 với footer hiện tại
When người xem cuộn tới cuối trang
Then tiêu đề nhỏ lại vừa đủ để chân chữ dòng cuối nằm trên đường giữa
And tiêu đề không nhỏ hơn 20.8px
```

### R4. Footer ở cửa sổ nhỏ và điện thoại

Footer hiện tại giữ nguyên, trừ cửa sổ nhỏ: rộng `≤750px` hoặc cao `≤640px`, đúng
mốc màn nhỏ site đang dùng. Footer hiện tại (222px) còn chừa đủ chỗ cho R1 với
tiêu đề `1.3rem` ở mọi cửa sổ cao từ 639px (gap 35px), nên mốc 640px đủ. Ở cửa
sổ nhỏ, mọi trang dùng footer gọn, giữ nội dung và thứ tự (địa chỉ, mạng xã hội,
bản quyền):

- Rộng `≤750px` và dọc: hai hàng. Hàng đầu nhãn "Trụ sở" và địa chỉ `1rem`;
  hàng hai ba icon mạng xã hội `24px` cách nhau `8px` bên trái, dòng bản quyền
  bên phải, hàng cao `44px`. Footer cao khoảng 130px, thay 330–351px.
- Các cửa sổ nhỏ còn lại: một hàng, địa chỉ, icon, bản quyền. Cao 67–90px.
- Nhãn "Mạng xã hội" ẩn bằng mắt, nhóm vẫn giữ `aria-label`. Viền trên một
  đường `line` thay ba đường.

Footer gọn không quá `38.2%` viewport (tỉ lệ vàng), để vùng CTA chiếm ít nhất
`61.8%`.

Mọi footer, hiện tại và gọn, ở mọi trang VI/EN có đúng ba icon mạng xã hội theo
thứ tự Facebook, TikTok, YouTube (owner 04/10), thay bốn icon Facebook,
Instagram, TikTok, Pinterest. Icon YouTube là `youtube-fill` của Remix Icon
4.6.0, cùng bộ với icon Facebook và TikTok đang dùng, inline SVG một màu. Ba icon
vẫn là placeholder chưa điều hướng như hiện tại.

```gherkin
Given điện thoại 390×844 ở bất kỳ trang nào
When người xem cuộn tới footer
Then footer có hai hàng và cao không quá 38.2% viewport
```

```gherkin
Given cửa sổ desktop 1440×900
When người xem cuộn tới footer
Then footer giống footer hiện tại, trừ hàng icon
```

```gherkin
Given bất kỳ trang nào, VI hoặc EN, ở bất kỳ cỡ cửa sổ nào
When người xem nhìn footer
Then footer có đúng ba icon theo thứ tự Facebook, TikTok, YouTube
```

### R5. Màn quá thấp

Khi tiêu đề `1.3rem` vẫn không đủ chỗ cho R1, tiêu đề giữ `1.3rem` và chân chữ
dòng cuối lên sát đường giữa nhất có thể: `D` tăng tới mức nút cách đáy batch
đúng một gap. Với ba icon, không cỡ thường gặp nào trong bảng số đo thuộc nhóm
này (568×320 còn dư 11px); nhóm này bắt đầu từ cửa sổ ngang thấp hơn, như
568×280.

```gherkin
Given viewport 568×280
When người xem cuộn tới cuối trang
Then footer hiện trọn, nút cách đáy batch một gap
And tiêu đề không đè header hay footer
```

### R6. Parallax của CTA

Cụm CTA trôi chậm hơn nội dung 10% khi cuộn trong đoạn cuối trang. Độ
lệch dọc bằng (giới hạn cuộn trừ `scrollY`) nhân `-0.1`, tức cùng công thức
`data-scroll-position="bottom"`, `data-scroll-speed="-1"` của Locomotive. Độ
lệch bằng 0 đúng tại cuối trang, nên vị trí cuối của R1 và R5 không đổi.

Parallax chạy ở mọi chiều rộng. Từ 981px, Locomotive đang chạy smooth scroll
nên dùng thuộc tính của nó. Dưới 981px trang dùng scroll native, nên PR code tự
áp cùng công thức mà không cần Locomotive. Lớp parallax là phần tử bọc cụm CTA,
tách khỏi line reveal của tiêu đề. Chỉ animate `transform`.

```gherkin
Given CTA vừa vào viewport từ dưới lên
When người xem cuộn thêm 100px
Then cụm CTA đi lên 90px
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
Then CTA không giật, và khi thanh địa chỉ đứng yên chân chữ dòng cuối nằm trên đường giữa
```

## Số đo

Đo ngày 04/10 bằng cách chèn CSS của R2 và R4, với ba icon, vào trang hiện tại
(Chromium, VI), rồi tính cỡ tiêu đề theo R3 từ kích thước đo được; dòng cuối
dài thêm `0.197` cỡ chữ dưới chân chữ. Cột "Dư" là khoảng nút còn cách đáy
batch ngoài một gap bắt buộc. EN cho cùng kết quả ở các cỡ đã đo.

| Viewport | Footer | Footer / viewport | Tiêu đề | Dư | Kết quả |
| --- | --- | --- | --- | --- | --- |
| 320×568 | gọn 130px | 22.9% | 20.8px | 97px | giữa |
| 390×844 | gọn 130px | 15.4% | 32px | 233px | giữa |
| 568×320 | gọn 90px | 28.1% | 29.1px | 11px | giữa |
| 640×360 | gọn 90px | 25.0% | 32px | 31px | giữa |
| 844×390 | gọn 67px | 17.2% | 20.8px | 71px | giữa |
| 768×1024 | hiện tại 222px | 21.7% | 40px | 229px | giữa |
| 1024×768 | hiện tại 222px | 28.9% | 46.1px | 80px | giữa |
| 1280×632 | gọn 67px | 10.6% | 28.4px | 150px | giữa |
| 1280×720 | hiện tại 222px | 30.8% | 57.6px | 34px | giữa |
| 1366×657 | hiện tại 222px | 33.8% | 61.5px | 1px | giữa |
| 1366×645 | hiện tại 222px | 34.4% | 61.5 xuống 38.1px | 0px | giữa |
| 1536×730 | hiện tại 222px | 30.4% | 69.1px | 36px | giữa |
| 1920×681 | hiện tại 222px | 32.6% | 80px | 10px | giữa |
| 1440×900 | hiện tại 222px | 24.7% | 64.8px | 122px | giữa |
| 1920×1080 | hiện tại 222px | 20.6% | 80px | 209px | giữa |
| 568×280 | gọn 90px | 32.1% | 20.8px | thiếu 7px | R5 |

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Runtime | `renderCtaSkeleton` (`catalog-runtime.mjs`) | Đo chân chữ dòng cuối; tính chiều cao batch, `D` và cỡ tiêu đề theo R1, R2, R3, R5 |
| Code | `createSkeletonFlowFrameLayout` (`skeleton-flow.mjs`) | Card cuối mỗi cột có đáy trùng đáy batch |
| CSS | `.detail-cta[data-advertising-grid-cta]` (`detail.css`) | Bỏ hàng lưới 38.2% và 28%; đặt chân chữ dòng cuối theo `D` ở mọi chiều rộng; tiêu đề màn thấp tối thiểu `1.3rem` |
| CSS | `.site-footer` (`style.css`) | Footer gọn R4 ở `(max-width: 750px), (max-height: 640px)` |
| HTML | `.footer-social` trong `src/site/*/index.html` | Ba icon Facebook, TikTok, YouTube (R4), năm trang VI/EN |
| CSS | `body.is-advertising-browse` (`detail.css`) | `--footer-top-gap: 0` ở mọi cỡ, thay 64px, 48px và 28px |
| Motion | Phần tử bọc `.detail-cta__copy` | Mang độ lệch parallax R6 |

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1–R5 | chưa có test; đo ở mọi cỡ trong bảng số đo, VI và EN |
| R4 icon | `tests/site/footer-consistency.e2e.mjs` sửa sang ba icon và footer gọn |
| R6–R7 | chưa có test |
| R8 | chưa có test; A05s thật |

## Gate còn mở

- Owner duyệt spec này và bản chạy thử phiên bản 9.
- PR code làm R1–R8 kèm test, cập nhật cùng lúc ba spec cũ ở mục Mục đích,
  dòng bốn icon của [brand shell](frontend-brand-shell-responsive-runtime.md),
  `tests/site/footer-consistency.e2e.mjs` (ba icon, footer gọn, Advertising
  không có khoảng trên footer), [Footer](../../design-system/components/Footer/README.md)
  và [Motion](../../design-system/motion.md) mục parallax.

## Chú thích thuật ngữ

- **Tiêu đề CTA**: dòng "Dấu ấn tiếp theo / dành cho thương hiệu của bạn".
- **Cụm CTA**: tiêu đề CTA và nút "Trao đổi ý tưởng" ngay dưới nó.
- **Chân chữ**: baseline, đường các chữ đứng lên; đuôi `g`, `y` và dấu nặng nằm dưới.
- **Đường giữa viewport**: đường ngang ở `vh/2`; đường đứt cam trong bản chạy thử.
- **Batch skeleton**: nhóm card skeleton nối tiếp masonry ở cuối trang.
- **Ratio band**: nhóm tỉ lệ cao trên rộng dùng để chọn chiều cao card skeleton.
- **Giới hạn cuộn**: `scrollY` lớn nhất, khi đáy trang chạm đáy viewport.
- **Tỉ lệ vàng**: chia `61.8%` và `38.2%`; ở đây vùng CTA và footer.
- **Cửa sổ nhỏ**: cửa sổ rộng tối đa 750px hoặc cao tối đa 640px.
- **Chữ thường cao, chữ hoa cao**: chiều cao chữ `x` và chữ `T` của font.
- **Parallax**: lớp nội dung chạy khác tốc độ cuộn để tạo chiều sâu.
- **Gap masonry**: khoảng cách giữa hai card trong lưới Advertising.
- **Thanh địa chỉ**: thanh URL của trình duyệt điện thoại, tự ẩn hiện khi cuộn.
