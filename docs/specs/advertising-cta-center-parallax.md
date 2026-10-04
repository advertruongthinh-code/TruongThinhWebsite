---
title: CTA Advertising giữa viewport, cỡ tiêu đề, footer cửa sổ nhỏ và parallax
status: live
tests:
  - tests/site/advertising-continuation.e2e.mjs
  - tests/site/advertising-skeleton-flow.test.mjs
  - tests/site/footer-consistency.e2e.mjs
notion: none
updated: 2026-10-04
---

# CTA Advertising giữa viewport, cỡ tiêu đề, footer cửa sổ nhỏ và parallax

## Mục đích

Cuối masonry Advertising, chân chữ dòng cuối của tiêu đề "Dấu ấn tiếp theo /
dành cho thương hiệu của bạn" nằm đúng đường giữa viewport, nút "Trao đổi ý
tưởng" ngay dưới, có parallax, ở mọi cỡ cửa sổ. Batch skeleton dưới CTA co giãn
để chân chữ tới đúng giữa; footer gọn ở cửa sổ nhỏ để vùng CTA là vùng chính.
Footer mọi trang có ba icon mạng xã hội. Skeleton và glass thuộc spec skeleton.

## Hành vi

### R1. Chân chữ dòng cuối của tiêu đề ở giữa viewport

Tại cuối trang (`scrollY` bằng giới hạn cuộn), chân chữ dòng cuối của tiêu đề
CTA nằm đúng đường giữa viewport (`vh/2`), sai số `≤1 CSS px`. Chân chữ là
đường các chữ đứng lên; đuôi chữ `g`, `y` và dấu nặng nằm dưới đường này. Dòng
cuối tính sau khi tiêu đề xuống dòng theo bề rộng thật, nên tiêu đề hai hay ba
dòng đều neo theo dòng cuối. Nút "Trao đổi ý tưởng" nằm dưới dòng cuối nhìn
thấy một gap masonry. Đường giữa là giữa cả viewport, không trừ header.
Viewport là vùng nhìn thấy sau khi thanh địa chỉ của điện thoại ổn định. Yêu
cầu giữ ở mọi chiều rộng từ 320px, dọc và ngang, VI/EN, mọi bộ lọc, direct
load, chuyển route và Back.

Runtime đo chân chữ bằng một phần tử inline cỡ 0 gắn cuối chữ cuối cùng, ở
trạng thái dòng đã reveal. Khi tiêu đề tách dòng, mask của mỗi dòng có padding
dưới `0.12em` và dòng nghỉ cao hơn `0.1em` sau reveal (`detail.js`), nên tiêu
đề có `margin-bottom: -0.22em` để nút vẫn cách dòng cuối đúng một gap.

```gherkin
Given trang Advertising ở bất kỳ cỡ cửa sổ nào không thuộc R5
When người xem cuộn tới cuối trang
Then chân chữ dòng cuối của tiêu đề nằm trên đường giữa viewport, sai số 1px
And nút "Trao đổi ý tưởng" nằm dưới tiêu đề một gap
And footer hiện trọn bên dưới
```

### R2. Batch skeleton dưới CTA co giãn

CTA phủ lên batch skeleton cuối masonry. Batch bắt đầu một gap dưới card thật
ở mỗi cột và kết thúc ngay trên footer: ở chế độ duyệt
(`body.is-advertising-browse`) trang bỏ khoảng trên footer
(`--footer-top-gap: 0`) ở mọi cỡ, vì batch đã lấp chỗ đó. Chế độ xem ảnh giữ
khoảng của site. Batch cao ít nhất bằng viewport trừ footer và một gap. Chân
chữ dòng cuối cách đáy batch `D = vh/2 − footer`, nên vị trí cuối không phụ
thuộc số card thật phía trên. Nút cách đáy batch ít nhất một gap.

Card skeleton giữ tỉ lệ ngẫu nhiên theo ratio band, trừ card cuối của mỗi cột:
card này đổi chiều cao để đáy trùng đáy batch. Phần còn lại ngắn hơn `0.25` bề
rộng card thì card trước đó dài thêm, không có card mỏng hơn mức đó.

```gherkin
Given masonry kết thúc ở bất kỳ độ cao nào
When runtime dựng batch skeleton cuối
Then card cuối mỗi cột có đáy trùng đáy batch
And chân chữ dòng cuối cách đáy batch đúng D
```

### R3. Tiêu đề luôn lớn hơn nút

Tiêu đề không bao giờ nhỏ hơn `1.3rem` (20.8px), bằng cỡ chữ nút (`0.8rem`,
12.8px) nhân tỉ lệ vàng `1.618`. Ở cỡ này chữ thường của tiêu đề (11.2px) đã
cao hơn chữ hoa của nút (9.7px), đo bằng font Plus Jakarta Sans của site. Hai
quy tắc CSS màn thấp (`max-height: 640px`) cho tiêu đề tối thiểu `1.3rem`.

Tiêu đề dùng cỡ chữ CSS. Dưới chân chữ cần chỗ cho phần còn lại của dòng cuối,
một gap, nút và một gap tới đáy batch. Khi chỗ đó không đủ trong `D`, runtime
giảm cỡ chữ vừa đủ, không dưới `1.3rem` và không tăng quá cỡ CSS: phần dưới
chân chữ tăng tuyến tính theo cỡ chữ, nên runtime đo ở cỡ CSS và ở `1.3rem` rồi
nội suy. Phần trên chân chữ không giới hạn cỡ chữ. Với footer thường, tiêu đề
chỉ nhỏ lại ở cửa sổ cao từ 641px tới khoảng 662px; 1366×645 còn khoảng 34.6px.

```gherkin
Given cửa sổ 1366×645 với footer thường
When người xem cuộn tới cuối trang
Then tiêu đề nhỏ lại vừa đủ để chân chữ dòng cuối nằm trên đường giữa
And tiêu đề không nhỏ hơn 20.8px
```

### R4. Footer ở cửa sổ nhỏ và điện thoại

Footer thường giữ nguyên, trừ cửa sổ nhỏ: rộng `≤750px` hoặc cao `≤640px`, đúng
mốc màn nhỏ site đang dùng. Ở cửa sổ nhỏ, mọi trang dùng footer gọn, giữ nội
dung và thứ tự (địa chỉ, mạng xã hội, bản quyền):

- Rộng `≤750px` và dọc: hai hàng. Hàng đầu nhãn "Trụ sở" và địa chỉ `1rem`;
  hàng hai ba icon mạng xã hội `24px` cách nhau `8px` bên trái, dòng bản quyền
  bên phải, hàng cao `44px`. Footer cao khoảng 130px.
- Các cửa sổ nhỏ còn lại: một hàng, địa chỉ, icon, bản quyền. Cao 67–90px.
- Nhãn "Mạng xã hội" ẩn bằng mắt, nhóm vẫn giữ `aria-label`. Viền trên một
  đường `line`.

Footer gọn không quá `38.2%` viewport (tỉ lệ vàng), để vùng CTA chiếm ít nhất
`61.8%`.

Mọi footer, thường và gọn, ở mọi trang VI/EN có đúng ba icon mạng xã hội theo
thứ tự Facebook, TikTok, YouTube. Icon YouTube là `youtube-fill` của Remix Icon
4.6.0, cùng bộ với icon Facebook và TikTok, inline SVG một màu. Ba icon là
placeholder chưa điều hướng (`aria-disabled`).

```gherkin
Given điện thoại 390×844 ở bất kỳ trang nào
When người xem cuộn tới footer
Then footer có hai hàng và cao không quá 38.2% viewport
```

```gherkin
Given cửa sổ desktop 1440×900
When người xem cuộn tới footer
Then footer là footer thường với ba icon
```

```gherkin
Given bất kỳ trang nào, VI hoặc EN, ở bất kỳ cỡ cửa sổ nào
When người xem nhìn footer
Then footer có đúng ba icon theo thứ tự Facebook, TikTok, YouTube
```

### R5. Màn quá thấp

Khi tiêu đề `1.3rem` vẫn không đủ chỗ cho R1, tiêu đề giữ `1.3rem` và chân chữ
dòng cuối lên sát đường giữa nhất có thể: `D` tăng tới mức nút cách đáy batch
đúng một gap. 568×320 còn đủ chỗ cho R1; nhóm này bắt đầu từ cửa sổ ngang thấp
hơn, như 568×280 (chân chữ cao hơn đường giữa khoảng 7px).

```gherkin
Given viewport 568×280
When người xem cuộn tới cuối trang
Then footer hiện trọn, nút cách đáy batch một gap
And tiêu đề không đè header hay footer
```

### R6. Parallax của CTA

Cụm CTA trôi chậm hơn nội dung 10% khi cuộn trong đoạn cuối trang. Độ lệch dọc
bằng (giới hạn cuộn trừ `scrollY`) nhân `-0.1`, bằng 0 đúng tại cuối trang, nên
vị trí cuối của R1 và R5 không đổi.

Parallax chạy ở mọi chiều rộng bằng một đường code: runtime lấy đáy footer trừ
chiều cao viewport, tức phần trang còn lại dưới viewport, trên scroll native và
trên `site:scroll` khi Locomotive chạy smooth scroll từ 981px. Lớp parallax là
`.detail-cta__copy`, tách khỏi line reveal của tiêu đề. Chỉ animate `transform`.
Khi đang xem ảnh, độ lệch bằng 0.

```gherkin
Given CTA vừa vào viewport từ dưới lên
When người xem cuộn thêm 100px
Then cụm CTA đi lên 90px
And tại cuối trang độ lệch parallax bằng 0
```

### R7. Giảm chuyển động

Với `prefers-reduced-motion: reduce`, không có parallax; CTA đứng đúng vị trí
cuối của R1 hoặc R5. Đổi preference khi đang mở trang có hiệu lực ngay.

```gherkin
Given người xem bật giảm chuyển động
When người xem cuộn tới cuối trang
Then CTA không có độ lệch parallax nào và nằm đúng vị trí cuối
```

### R8. Đổi cỡ và thanh địa chỉ

Đổi cỡ cửa sổ, xoay máy, đổi ngôn ngữ hay bộ lọc thì batch, cỡ tiêu đề và vị trí
cuối được tính lại theo viewport mới. Batch và cỡ tiêu đề theo layout viewport
của site (`svh` ở `≤980px`), nên thanh địa chỉ hiện hoặc ẩn không dựng lại
skeleton. Vị trí chân chữ đặt bằng CSS theo `50dvh`, nên đúng sau khi thanh địa
chỉ ổn định; sau lần đặt đầu, đổi vị trí trượt `0.4s ease-out` thay vì nhảy,
trừ khi giảm chuyển động.

```gherkin
Given điện thoại đang ở cuối trang
When thanh địa chỉ ẩn rồi hiện lại
Then CTA không giật, và khi thanh địa chỉ đứng yên chân chữ dòng cuối nằm trên đường giữa
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Runtime | `renderCtaSkeleton` (`catalog-runtime.mjs`) | Tính chiều cao batch theo `D`, R2 và R5; ghi `--advertising-cta-top` |
| Runtime | `measureCtaCopy`, `fitGridCtaHeading` (`catalog-runtime.mjs`) | Đo chân chữ dòng cuối và phần dưới nó; giảm cỡ tiêu đề theo R3 |
| Runtime | `syncCtaParallax` (`catalog-runtime.mjs`) | Ghi `transform` parallax R6 lên `.detail-cta__copy` |
| Code | `createSkeletonFlowFrameLayout` (`skeleton-flow.mjs`) | Card cuối mỗi cột có đáy trùng đáy batch |
| CSS var | `--advertising-cta-footer-height`, `--advertising-cta-copy-below` | Runtime ghi; CSS đặt chân chữ theo `50dvh` trừ footer |
| DOM hook | `data-advertising-cta-settled` | Bật trượt `0.4s` sau lần đặt đầu (R8) |
| CSS | `.detail-cta[data-advertising-grid-cta]` (`detail.css`) | Vị trí cụm CTA, tiêu đề màn thấp tối thiểu `1.3rem` |
| CSS | `body.is-advertising-browse` (`detail.css`) | `--footer-top-gap: 0` |
| CSS | `.site-footer` (`style.css`) | Footer gọn R4 ở `(max-width: 750px), (max-height: 640px)` |
| HTML | `.footer-social` trong `src/site/*/index.html` | Ba icon Facebook, TikTok, YouTube |

## UI

[Footer](../../design-system/components/Footer/README.md),
[Skeleton cuối masonry](../../design-system/components/Skeleton/README.md),
[Motion](../../design-system/motion.md#smooth-scroll-và-parallax).

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1, R3, R5, R6 | `tests/site/advertising-continuation.e2e.mjs`: chân chữ, gap tới nút, cỡ tối thiểu, 100px cuộn lệch 90px; năm cỡ, VI/EN |
| R2 | `tests/site/advertising-skeleton-flow.test.mjs` (đáy card cuối mỗi cột); continuation (`footer-top-gap` 0, đáy batch trùng đáy CTA) |
| R4 | `tests/site/footer-consistency.e2e.mjs`: ba icon, cỡ icon, footer gọn, tỉ lệ 38.2%, mười cỡ |
| R7 | continuation: bật giảm chuyển động giữa trang thì độ lệch về 0 |
| R8 | continuation: bộ lọc và đổi cỡ; thanh địa chỉ chưa có test |

## Gate còn mở

- R8 thanh địa chỉ chưa chạy trên Galaxy A05s thật; thread code tự chạy khi PC
  Remote Control và điện thoại sẵn sàng.

## Chú thích thuật ngữ

- **Tiêu đề CTA**: dòng "Dấu ấn tiếp theo / dành cho thương hiệu của bạn".
- **Cụm CTA**: tiêu đề CTA và nút "Trao đổi ý tưởng" ngay dưới nó.
- **Chân chữ**: baseline, đường các chữ đứng lên; đuôi `g`, `y` và dấu nặng nằm dưới.
- **Đường giữa viewport**: đường ngang ở `vh/2`.
- **Batch skeleton**: nhóm card skeleton nối tiếp masonry ở cuối trang.
- **Ratio band**: nhóm tỉ lệ cao trên rộng dùng để chọn chiều cao card skeleton.
- **Giới hạn cuộn**: `scrollY` lớn nhất, khi đáy trang chạm đáy viewport.
- **Tỉ lệ vàng**: chia `61.8%` và `38.2%`; ở đây vùng CTA và footer.
- **Cửa sổ nhỏ**: cửa sổ rộng tối đa 750px hoặc cao tối đa 640px.
- **Footer thường**: footer nhiều hàng ở cửa sổ không nhỏ.
- **Parallax**: lớp nội dung chạy khác tốc độ cuộn để tạo chiều sâu.
- **Gap masonry**: khoảng cách giữa hai card trong lưới Advertising.
- **Thanh địa chỉ**: thanh URL của trình duyệt điện thoại, tự ẩn hiện khi cuộn.
- **Mask**: khung cắt quanh mỗi dòng chữ để dòng trượt lên khi reveal.
- **Reveal**: chuyển động hiện dòng chữ khi vào viewport.
