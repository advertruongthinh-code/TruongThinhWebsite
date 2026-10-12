---
title: CTA Advertising giữa viewport, cỡ tiêu đề, footer cửa sổ nhỏ và parallax
status: live
source: []
tests:
  - tests/site/advertising-continuation.e2e.mjs
  - tests/site/advertising-skeleton-flow.test.mjs
  - tests/site/footer-consistency.e2e.mjs
  - tests/site/mobile-layout-parity.e2e.mjs
notion: https://app.notion.com/p/3e6332849a0e81508d66ca0b3cfebf18
updated: 2026-10-12
---

# CTA Advertising giữa viewport, cỡ tiêu đề, footer cửa sổ nhỏ và parallax

## Mục đích

Cuối masonry Advertising, khách thấy tiêu đề "Dấu ấn tiếp theo / dành cho thương hiệu của bạn" với chân chữ dòng cuối ở
đúng giữa viewport, nút "Trao đổi ý tưởng" ngay dưới, cụm chữ trôi parallax; ở cửa sổ nhỏ mọi trang dùng footer gọn để
vùng CTA là vùng chính. Markup CTA ở [masonry R1](advertising-masonry.md#r1-trang-và-cấu-trúc); khung skeleton, Flow ở
[skeleton](advertising-skeleton.md); Kính ở [Kính](glass-surface.md); footer thường, icon ở [shell R10](site-shell.md#r10-floating-cta-và-footer).

## Hành vi

### R1. Chân chữ dòng cuối của tiêu đề ở giữa viewport

Tại cuối trang (`scrollY` bằng giới hạn cuộn), chân chữ dòng cuối của tiêu đề CTA nằm trên đường giữa viewport, sai số
`1px`. Đường giữa là giữa cả viewport, không trừ header; viewport là vùng nhìn thấy sau khi thanh địa chỉ điện thoại đứng
yên (`dvh`). Dòng cuối tính sau khi tiêu đề xuống dòng theo bề rộng thật, nên tiêu đề hai hay ba dòng đều neo theo dòng
cuối. Nút nằm dưới dòng cuối nhìn thấy đúng một khoảng giữa. Áp dụng ở mọi chiều rộng từ 320px, dọc và ngang, VI/EN, mọi
filter, vào thẳng trang, route mềm và Back.

CTA xếp cụm chữ ở đáy (`place-items: end center`); CSS cho `.detail-cta__copy` khoảng dưới
`max(50dvh − footer, khoảng giữa + phần dưới chân chữ) − phần dưới chân chữ`, với chiều cao footer và phần dưới chân chữ
do runtime ghi (R2). `measureCtaCopy` đo chân chữ bằng một `span` inline-block cỡ 0 gắn sau lá chữ cuối của tiêu đề, ở
trạng thái dòng đã reveal: bỏ độ lệch reveal hiện tại của `.motion-line`, cộng `0.1em` dòng nghỉ cao hơn sau reveal
([trang con R6](detail-pages.md#r6-reveal-parallax-đổi-ngôn-ngữ-và-vòng-đời)). Tiêu đề đã tách dòng có
`margin-bottom: -0.22em` (mask đệm dưới `0.12em` cộng `0.1em` dòng nghỉ) để nút vẫn cách dòng cuối đúng một khoảng giữa.

```gherkin
Given trang Advertising ở bất kỳ cỡ cửa sổ nào không thuộc R5
When người xem cuộn tới cuối trang
Then chân chữ dòng cuối của tiêu đề nằm trên đường giữa viewport, sai số 1px
And nút "Trao đổi ý tưởng" nằm dưới dòng cuối một khoảng giữa, footer hiện trọn bên dưới
```

### R2. Batch skeleton dưới CTA co giãn

CTA phủ lên batch skeleton, bắt đầu một khoảng giữa dưới đáy masonry thật (`--advertising-cta-top`) và kết thúc ngay trên
footer; đáy CTA là đáy batch ([skeleton R6](advertising-skeleton.md#r6-cta-kính-và-footer-trên-batch)). Mỗi lần dựng,
`renderCtaSkeleton` lấy `vh` là chiều cao layout viewport ([shell R11](site-shell.md#r11-viewport-ổn-định-khi-thanh-địa-chỉ-đổi)),
tính khoảng từ chân chữ dòng cuối tới đáy batch `D = max(vh/2 − footer, khoảng giữa + phần dưới chân chữ)` rồi ghi chiều cao
CTA `--advertising-cta-tail-height` bằng số lớn nhất trong ba số: `0.25` bề rộng card cộng 1px, `vh − khoảng giữa − footer`,
`D + phần trên chân chữ`. Vì vậy vị trí cuối của chân chữ không phụ thuộc số card thật phía trên, nút cách đáy batch ít nhất
một khoảng giữa, và đoạn từ đáy masonry thật tới đáy batch ít nhất bằng viewport trừ footer. Khung cuối mỗi cột kéo tới
đáy batch theo [skeleton R1](advertising-skeleton.md#r1-batch-nối-tiếp-masonry).

Khi duyệt masonry, footer không có khoảng phía trên (`body.is-advertising-browse:not(.is-advertising-photo)` đặt
`--footer-top-gap: 0px`) vì batch đã lấp chỗ đó; detail không có batch và giữ khoảng trên footer của site.

```gherkin
Given masonry kết thúc ở bất kỳ độ cao nào
When runtime dựng batch skeleton cuối
Then đáy CTA trùng đáy batch, ngay trên footer, không có khoảng trên footer
And chân chữ dòng cuối cách đáy batch đúng D
```

### R3. Tiêu đề luôn lớn hơn nút

Tiêu đề không nhỏ hơn `1.3rem` (20.8px), bằng cỡ chữ nút (`0.8rem`) nhân tỉ lệ vàng. Cỡ chữ gốc lấy từ CSS theo
breakpoint; hai quy tắc màn thấp (`max-height: 640px`, rộng tới 750px hoặc từ 751px) có mức tối thiểu `1.3rem`. Tiêu đề
không có transition để runtime đo đúng cỡ mới ngay.

Dưới chân chữ cần chỗ cho phần còn lại của dòng cuối, một khoảng giữa, nút và một khoảng giữa tới đáy batch.
`fitGridCtaHeading` so phần dưới chân chữ ở cỡ CSS với chỗ còn `vh/2 − footer − khoảng giữa`: đủ thì giữ cỡ CSS; thiếu thì
đo lại ở `1.3rem` và nội suy tuyến tính giữa hai cỡ, ghi `font-size` inline vừa đủ chỗ, không dưới `1.3rem` và không quá
cỡ CSS. Phần trên chân chữ không giới hạn cỡ chữ vì CTA cao thêm (R2). Ví dụ với footer thường: 1366×645 còn khoảng
34.6px, 1366×662 giữ cỡ CSS.

```gherkin
Given cửa sổ 1366×645 với footer thường
When người xem cuộn tới cuối trang
Then tiêu đề nhỏ lại vừa đủ để chân chữ dòng cuối nằm trên đường giữa
And tiêu đề không nhỏ hơn 20.8px
```

### R4. Footer ở cửa sổ nhỏ và điện thoại

Footer ở mọi trang VI/EN không cao quá `38.2%` viewport khi rộng tới 750px hoặc cao tới 640px, để vùng CTA chiếm ít nhất
`61.8%`; giữ nội dung và thứ tự của [footer thường](site-shell.md#r10-floating-cta-và-footer): Hotline, Văn phòng, địa chỉ,
mạng xã hội. Footer gọn (`@media (max-width: 750px)` trong `style.css`):

- Dọc (`orientation: portrait`): một cột Hotline, Văn phòng, địa chỉ, icon mạng xã hội nằm ngang; lề phải chừa làn floating
  CTA (`15px + 57px + 16px`). Cao khoảng 191px ở 390×844, 213px khi địa chỉ ba dòng.
- Ngang: cột trái Hotline, Văn phòng, icon; cột phải địa chỉ; cùng làn phải. Cao khoảng 112px (568×320: 34.9%).
- Màn ngang thấp rộng hơn 750px dùng footer thường: một dải 117px, hai cột 124px từ 980px trở xuống (844×390: 31.7%).
- Floating CTA không hiện ở cuối trang (đã có nút Zalo của trang); khi hiện cùng footer (404) nó không đè nội dung.
- Icon thay nhãn chữ; nhãn ẩn bằng mắt cho trình đọc màn hình; footer có viền trên.

Cỡ icon, khoảng cách, chiều cao hàng ở [UI](#ui).

```gherkin
Given điện thoại 390×844 ở bất kỳ trang nào
When người xem cuộn tới footer
Then footer gọn giữ điện thoại, địa chỉ, mạng xã hội trong một cột, cao không quá 38.2% viewport
And floating CTA không hiện, nút Zalo của trang thay nó
```

### R5. Màn quá thấp

Khi tiêu đề `1.3rem` vẫn không đủ chỗ cho R1, tiêu đề giữ `1.3rem` và `D` lấy nhánh `khoảng giữa + phần dưới chân chữ`
(R2): nút cách đáy batch đúng một khoảng giữa, chân chữ dòng cuối nằm cao hơn đường giữa ít nhất có thể. 568×320 còn đủ
chỗ cho R1; 568×280 chân chữ cao hơn đường giữa khoảng 8px.

```gherkin
Given viewport 568×280
When người xem cuộn tới cuối trang
Then footer hiện trọn, nút cách đáy batch một khoảng giữa
And tiêu đề 20.8px không đè header hay footer
```

### R6. Parallax của CTA

Cụm CTA trôi chậm hơn nội dung 10% ở mọi chiều rộng bằng một đường code. `syncCtaParallax` lấy độ lệch dọc bằng (đáy
footer trừ `innerHeight`) nhân `-0.1`, tức phần trang còn dưới viewport nhân `-0.1`, bằng 0 đúng tại cuối trang nên vị trí
cuối của R1 và R5 không đổi. Runtime gọi lại trên `scroll` native, trên `site:scroll` khi Locomotive chạy smooth scroll
([shell R8](site-shell.md#r8-scroll-và-history)), sau mỗi lần dựng batch và khi đổi giảm chuyển động. Lớp trôi là
`.detail-cta__copy` (`translate3d`), tách khỏi line reveal của tiêu đề; chỉ `transform` đổi. Khi detail mở, độ lệch bằng 0.

CTA cắt phần tràn (`overflow: hidden`), nên độ lệch không lớn hơn khoảng trống phía trên cụm (`offsetTop` của cụm). Chỉ
CTA vừa khít cụm chữ chạm giới hạn này, như chữ phóng to ở màn ngang 838×387; khi đó cụm đứng yên. Tiêu đề có đệm trên
`0.15em` để dấu của dòng đầu không bị mép CTA cắt.

```gherkin
Given CTA đang trong viewport, cách cuối trang 200px cuộn
When người xem cuộn thêm 100px
Then cụm CTA đi lên 90px
And tại cuối trang độ lệch parallax bằng 0
```

### R7. Giảm chuyển động

Với `prefers-reduced-motion: reduce`, không có parallax và khoảng dưới cụm chữ không trượt (R8); CTA đứng đúng vị trí cuối
của R1 hoặc R5. Runtime nghe `change` của media query nên đổi cài đặt khi đang mở trang có hiệu lực ngay.

```gherkin
Given CTA đang lệch parallax giữa đoạn cuối trang
When người xem bật giảm chuyển động
Then độ lệch parallax về 0 ngay, CTA ở đúng vị trí cuối
```

### R8. Đổi cỡ và thanh địa chỉ

`resize` của cửa sổ và `visualViewport` gọi `scheduleResize`: bề rộng đổi thì masonry đo lại và dựng lại batch; chỉ chiều
cao layout viewport đổi thì tính lại batch; cùng chiều cao layout thì không tính lại. Đổi filter dựng lại batch. Cỡ tiêu đề
đo lại khi khóa đo (chỗ còn của R3, bề rộng cụm chữ, `lang`) đổi, khi `ResizeObserver` thấy cụm chữ, CTA hoặc footer đổi
cỡ, và khi font tải xong.

Batch và cỡ tiêu đề theo chiều cao layout viewport (`svh` từ 980px trở xuống), nên thanh địa chỉ ẩn, hiện không dựng lại
skeleton. Vị trí chân chữ đặt bằng CSS theo `50dvh`, nên đúng sau khi thanh địa chỉ đứng yên; mọi `resize` vẫn tính
lại parallax R6 theo `innerHeight` mới, nếu không cụm chữ giữ độ lệch cũ (A05s 11/10: cao hơn đường giữa 5.5px). Sau lần đo đầu, runtime gắn
`data-advertising-cta-settled` ở khung hình kế; từ đó khoảng dưới cụm chữ đổi bằng transition `margin-bottom` thay vì nhảy,
trừ khi giảm chuyển động.

```gherkin
Given điện thoại đang ở cuối trang Advertising
When thanh địa chỉ ẩn rồi hiện lại
Then batch không dựng lại, CTA trượt không giật
And khi thanh địa chỉ đứng yên, chân chữ dòng cuối nằm trên đường giữa
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Runtime | `renderCtaSkeleton` (`catalog-runtime.mjs`, nội bộ) | Tính `D`, ghi `--advertising-cta-top`, `--advertising-cta-tail-height`, dựng batch (R2, R5) |
| Runtime | `measureCtaCopy`, `fitGridCtaHeading` | Trả `{ baseline, below }` của cụm chữ; ghi `font-size` inline cho tiêu đề (R1, R3) |
| Runtime | `syncCtaParallax` | Ghi `transform` của `.detail-cta__copy`, không vượt mép trên CTA (R6, R7) |
| Runtime | `scheduleResize`, `refreshFontGeometry`, `ResizeObserver` trên cụm chữ, CTA, footer | Đo lại và dựng lại (R8) |
| CSS var | `--advertising-cta-footer-height`, `--advertising-cta-copy-below` trên CTA | Runtime ghi; CSS đặt chân chữ theo `50dvh` trừ footer (R1) |
| DOM hook | `data-advertising-cta-settled` trên `.detail-cta[data-advertising-grid-cta]` | Bật transition vị trí sau lần đo đầu (R8) |
| CSS | `.detail-cta[data-advertising-grid-cta]`, `.detail-cta__copy`, `h2` (`detail.css`) | Vị trí cụm, cỡ chữ theo breakpoint, đệm, `margin-bottom` âm (R1, R3, R6) |
| CSS | `body.is-advertising-browse:not(.is-advertising-photo)` (`detail.css`) | `--footer-top-gap: 0px` (R2) |
| CSS | `.site-footer` trong `@media (max-width: 750px), (max-height: 640px)` và `(max-width: 750px) and (orientation: portrait)` (`style.css`) | Footer gọn (R4) |

Spec không sở hữu file: code nằm trong `catalog-runtime.mjs` ([masonry](advertising-masonry.md)), `detail.css`
([trang con](detail-pages.md)), `style.css` ([shell](site-shell.md)), dùng `createSkeletonFlowFrameLayout`
([skeleton](advertising-skeleton.md)) và `arcGlassGeometry` ([Kính](glass-surface.md)); sửa hành vi ở đó thì cập nhật cả
spec này.

## UI

[Footer gọn](../../design-system/components/Footer/README.md#footer-gọn),
[Skeleton cuối masonry](../../design-system/components/Skeleton/README.md) (CTA trên batch),
[motion parallax CTA](../../design-system/motion.md#smooth-scroll-và-parallax).

## Kiểm tra

E2E cần `pnpm dev`, `BASE_URL`. `advertising-continuation.e2e.mjs` chạy phần CTA ở 360×800, 1440×900, 1440×400, 390×844,
390×568, VI/EN.

| R | Test hoặc command |
| --- | --- |
| R1 | `advertising-continuation.e2e.mjs` (chân chữ trên đường giữa sai số 1px, nút một khoảng giữa dưới dòng cuối, CTA và footer không bị cắt); 320px, route mềm, Back chưa có ca CTA |
| R2 | `advertising-continuation.e2e.mjs` (`footer-top-gap` 0, đáy batch trùng đáy CTA, chiều cao grid); `node --test tests/site/advertising-skeleton-flow.test.mjs` (đáy khung cuối mỗi cột) |
| R3 | `advertising-continuation.e2e.mjs` (tiêu đề từ 20.8px); ca giảm cỡ 1366×645 chưa có test |
| R4 | `footer-consistency.e2e.mjs` (mười ba cỡ, icon 24px, nhãn ẩn, không logo, không quá 38.2% viewport kể cả 568×320, CTA ẩn ở cuối trang, không đè nội dung footer ở 404) |
| R5 | `advertising-continuation.e2e.mjs` (chấp nhận nhánh nút cách đáy CTA một khoảng giữa); 568×280 chưa có ca riêng |
| R6 | `advertising-continuation.e2e.mjs` (100px cuộn lệch 90px, 0 tại cuối); `mobile-layout-parity.e2e.mjs` (`checkCtaReflow`: chữ phóng to ở 390×844 và 838×387, cụm nằm trong CTA, ba engine) |
| R7 | `advertising-continuation.e2e.mjs` (bật giảm chuyển động giữa trang thì độ lệch về 0) |
| R8 | `advertising-continuation.e2e.mjs` (filter và đổi cỡ dựng lại batch); vị trí chân chữ sau đổi cỡ tại chỗ và thanh địa chỉ chưa có test |

## Gate còn mở

- Owner chưa xem CTA giữa viewport, parallax và footer gọn trên demo. Owner.

## Chú thích thuật ngữ

- **Tiêu đề CTA**: dòng "Dấu ấn tiếp theo / dành cho thương hiệu của bạn".
- **Cụm CTA**: tiêu đề CTA và nút "Trao đổi ý tưởng" ngay dưới nó.
- **Chân chữ**: baseline, đường các chữ đứng lên; đuôi `g`, `y` và dấu nặng nằm dưới.
- **Phần dưới chân chữ**: từ chân chữ dòng cuối tới đáy cụm CTA (phần còn lại của dòng, khoảng giữa, nút); phần trên
  chân chữ là từ đỉnh cụm tới chân chữ.
- **Đường giữa viewport**: đường ngang ở `vh/2`.
- **Batch skeleton**: nhóm khung skeleton nối tiếp masonry ở cuối trang.
- **Khoảng giữa**: khoảng cách giữa hai card trong masonry.
- **Giới hạn cuộn**: `scrollY` lớn nhất, khi đáy trang chạm đáy viewport.
- **Tỉ lệ vàng**: chia `61.8%` và `38.2%`; ở đây vùng CTA và footer.
- **Cửa sổ nhỏ**: cửa sổ rộng tối đa 750px hoặc cao tối đa 640px.
- **Footer thường**: footer nhiều hàng ở cửa sổ không nhỏ.
- **Parallax**: lớp nội dung chạy khác tốc độ cuộn để tạo chiều sâu.
- **Layout viewport**: chiều cao ổn định site dùng để dựng layout, không đổi khi thanh địa chỉ ẩn, hiện.
- **Thanh địa chỉ**: thanh URL của trình duyệt điện thoại, tự ẩn hiện khi cuộn.
- **Mask**: khung cắt quanh mỗi dòng chữ để dòng trượt lên khi reveal.
- **Reveal**: chuyển động hiện dòng chữ khi vào viewport.
