---
title: Chữ hero kiểu espacio, xuống dòng chốt và khoảng cách dòng đều
status: live
source: []
tests:
  - tests/site/hero-typography.e2e.mjs
  - tests/site/hero-text-shadow.e2e.mjs
  - tests/site/text-mask-hidden.e2e.mjs
notion: https://app.notion.com/p/3fd332849a0e81bfac09f20245186976
updated: 2026-10-31
---

# Chữ hero kiểu espacio, xuống dòng chốt và khoảng cách dòng đều

## Mục đích

Chữ trong hero phải đọc rõ, nằm giữa vùng hero và có nhịp dòng gần giống nhau giữa các trang. Không dấu tiếng Việt
nào bị cắt hay đè lên dòng khác, từ 320px tới màn hình PC lớn. Cách bày chữ học từ hero của espaciohomedesign.com.
Các đoạn văn cùng loại có khoảng cách dòng bằng nhau. Spec không đổi motion
([first-load-parity](first-load-parity.md)), font và màu.

## Hành vi

### R1. Xuống dòng theo chốt của owner (2026-10-18)

Mỗi title dưới đây nằm đúng hai dòng ở mọi bề rộng. Subtitle nhỏ của portal trang chủ (cùng nội dung, một dòng)
giữ bố cục riêng.

| Chỗ | VI dòng 1 | VI dòng 2 |
| --- | --- | --- |
| Hero trang chủ | Làm chắc | Làm khác |
| CTA "Giữ nghề" trang chủ | Giữ nghề | Không ngừng làm mới |
| Hero Residential | Nơi tái tạo | năng lượng sống |
| Hero Commercial | Thiết kế tối ưu | Vận hành bền bỉ |
| Hero Advertising | Để thương hiệu | luôn trong tầm mắt |

Bản EN tách hai dòng ở cùng vị trí ý nghĩa. Câu Commercial mới thay "Thiết kế để bán tốt. Thi công để vận hành bền."
Bản EN là "Designed to perform / Built to last" (owner duyệt 2026-10-18).
Commercial nhấn "tối ưu", "bền bỉ" (EN "perform", "last") bằng `em` đậm 700 nghiêng; chữ còn lại nhẹ 500 như phần nhẹ title hero các trang khác. Residential dòng 2 "năng lượng sống" đậm 700 nghiêng. Trang chủ hai dòng đậm 700, dòng 2 "Làm khác" nghiêng (owner 2026-10-24).

### R2. Bày chữ hero kiểu espacio

Áp cho title chính của mọi hero: Trang chủ, Residential, Commercial, About, Advertising, trang cụm và trang sản
phẩm Advertising (`.hero > .hero-content > h1` hoặc `p.hero-title`, trừ kicker).

- Khung chữ rộng `min(80%, 62.5rem)`, từ 750px trở xuống `calc(100% - 64px)` (lề 32px mỗi bên để title không sát viền) (owner audit
  2026-10-18). Title nằm giữa hero theo hai chiều.
- Mỗi dòng là một khối. Trên 750px dòng 1 canh trái, dòng 2 canh phải; từ 750px trở xuống hai dòng canh giữa.
  Dòng 2 kéo lên `0,2em`, line-height 1,4, chữ in hoa.
- Trên 750px hai dòng lồng nhau một phần như trang chủ EN: cặp dòng rộng bằng tổng hai dòng trừ 30% dòng ngắn; khung
  rộng hơn cặp thì hai dòng dồn đều vào giữa, kicker theo mép trái dòng 1 (lệch vào 0,5rem).
- Từ 750px trở xuống chỉ title nằm ở tâm hero theo chiều dọc (lệch tối đa 3px), dù có hay không có hàng chip.
  Phone không hiện kicker (ẩn kiểu `.sr-only`, h1 vẫn còn cho trình đọc màn hình). Mỗi title co vừa khung theo dòng
  dài nhất của nó (`100cqi / --hero-line-em`, tối đa 7rem), nên cỡ khác nhau giữa các trang: 384px từ 26px
  (Commercial EN) tới 60px (trang chủ VI). Hero dạng grid (Trang chủ, About, Advertising) dùng hàng trên và hàng
  dưới cùng `1fr`; thiếu chỗ thì hàng giãn, không đè. Hero About không có kicker ở mọi bề rộng (owner audit
  2026-10-18).
- Rail và chip Advertising trên phone neo như PC: khối `.hero-browse` neo theo đáy hero, chừa sẵn một hàng chip, nên
  rail đứng một chỗ dù trang có hàng chip hay không; hàng chip thêm tràn xuống dưới. Từ 751px khối này là
  `display: contents`, bố cục cũ giữ nguyên.
- Kicker cách nét chữ title như nhau ở mọi hero: `margin-bottom: clamp(1.5rem, 3.8vh, 2.2rem)` trừ `--hero-ink-drop`
  (khoảng trống trên nét hoa của dòng 1 so với "Ể", đo bằng canvas), nên title không dấu không bị cách xa hơn.
- Trên 750px trang chủ có khung chữ rộng hơn, `min(90%, 75rem)`, nên title lớn hơn các trang khác một bậc (x1,2): 96px ở
  1440px, 55px ở 768px (owner 2026-10-24). Phone giữ khung chung.
- Trên 750px mọi hero chung một cỡ: `min(7rem, bề rộng khung / 12,5)`. Câu dài nhất hiện có ("Designed to perform") khoảng
  12 em, nên mọi hero cùng cỡ và khoảng cách hai dòng như nhau ở cùng bề rộng.
- Có JS: `motion.js` (`fitHeroLines`) đo dòng dài nhất theo em (cộng 1% cho hinting) vào `--hero-line-em` và gắn
  `data-hero-fit`, cùng `--hero-pair-em` cho title hai dòng, ghi lên `hero-content`. Dòng không xuống dòng và chỉ
  co thêm khi câu dài hơn 12,5 em. Chạy trước SplitText và trước khi motion đọc vị trí; đo lại khi đổi ngôn ngữ
  hoặc font tải xong, không đo lại ở mỗi lần layout (đo ép style cả trang).
- Không JS hoặc `motion-fallback`: cùng cỡ chung nên câu hiện có vẫn hai dòng; hai dòng nằm sát hai mép khung vì
  không có số đo cặp dòng.
- Hero có `overflow-anchor: none`: chữ đổi cỡ sau khi mount nên node trong hero không được làm scroll anchor; nếu không,
  Back về trang đã cuộn lệch 23px trên WebKit (2026-10-19).
- CTA "Giữ nghề" giữ cỡ CTA chung; cùng cơ chế đo, mỗi dòng chỉ co khi không vừa khung.
  Không JS: cỡ chữ tối đa `100cqi / 5` để từ dài nhất vừa khung khi chữ phóng to 200%; dòng được xuống hàng.
- Token `portal-kicker`, `portal-title`, `portal-tagline` của [Design System](../../design-system/) chỉ sửa sau khi
  owner duyệt (mục UI).

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

Không đổi font, màu, motion, ảnh hero, hay câu nào ngoài 5 câu ở R1 (bóng chữ ở R6 không tính là đổi màu). Ngoại lệ: dấu câu EN theo VI (owner 2026-10-18, [rule](../operations/agent-rule-product-ui.md)); hero trang chủ EN không dấu chấm, hero About EN là "Proven craft. / Earned trust.".

### R6. Bóng chữ hai lớp trên ảnh (ngoại lệ Design System)

Giữ lớp tối hiện có (`.hero-shade`, `.portal-shade`, `.detail-cta::after`: portal và CTA `0.5`, mọi hero ảnh phủ đều
`0.2`, độ tối tổng mép trên `0.7` nhạt dần, mịn tới đúng `0.2` trong 36% chiều cao hero, mép dưới `0.5`, không có lớp
mép trái), thêm `text-shadow` hai lớp, cùng bóng với player và nút "Có thể bạn thích" của
[primary-video-player R4](primary-video-player.md):
`0 0 2px` đen `0.5` dưới `0 0 12px` đen `0.4`. Một biến CSS `--text-shadow-d` trong `:root` giữ giá trị, `--text-shadow-reach`
(12px) là bán kính quầng ngoài.

- Áp cho chữ trắng trên ảnh: `.portal-copy` (kicker, title, tagline), `.legacy-copy` ("Giữ nghề") và `.detail-cta` có ảnh.
- Không áp: chữ mọi hero, CTA lưới của trang Sản phẩm quảng cáo (chữ `ink` trên giấy),
  header khi tông `ink`.
- Mask chữ (`.hero-line-mask`, `.line-mask`, `.portal-title-mask`, `.detail-line`, `.motion-line-mask`) nới `clip-path`
  thêm `--text-shadow-reach` mỗi cạnh để quầng không bị cắt.
- Vì mask nới thêm 12px, dòng chưa reveal tụt xuống `maskHiddenY` (motion.js): tối thiểu 2em, và không thấp hơn
  đáy mask cộng `0.6em + 8px + --text-shadow-reach`. Chỉ tụt 2em thì chữ nhỏ (kicker portal, kicker hero trang con)
  lộ đỉnh chữ và dấu qua vùng nới trước khi motion chạy. Chữ lớn vẫn tụt 2em, nên motion không đổi.
- Lúc dòng đang ẩn hoặc đang trồi lên, dòng không có bóng và mép dưới mask không nới vùng bóng (class
  `is-text-masked` đặt `text-shadow: none`, `--mask-shadow-bottom: 0px`); chữ chỉ hiện từ đáy mực của chính nó.
  Tween reveal xong mới gỡ class: mask mở 12px dưới, bóng hiện dần 0.6s (bóng chỉ fade sau khi
  motion xong). Nới cả lúc trồi thì chữ nhỏ hiện lơ lửng nửa trên dưới chỗ đứng.
- Design System ghi "không có text-shadow"; đây là ngoại lệ có chủ đích. Ghi vào `design-system/` chỉ khi owner "ok" trong
  thread làm việc này (gate Design System).

```gherkin
Given trang chủ, Nhà ở, Kinh doanh, Về chúng tôi ở 1440
When đọc text-shadow của chữ portal, "Giữ nghề" và CTA có ảnh
Then là "0 0 2px" đen 0.5 và "0 0 12px" đen 0.4
And clip-path của mask dòng nới ra ngoài hộp ít nhất 12px mỗi cạnh
```

```gherkin
Given Trang chủ, Nhà ở, Kinh doanh, Về chúng tôi, Sản phẩm quảng cáo ở 1440 và 390, VI và EN, chưa cuộn
When đo đỉnh hộp chữ của mọi dòng đang tụt dưới mask so với mép clip-path
Then đỉnh chữ nằm dưới mép clip-path, không dòng nào lộ ra trước khi reveal
And mép dưới mask của dòng đang ẩn không nới vùng bóng
When cuộn hết trang và các tween reveal chạy xong
Then không mask nào còn cắt vùng bóng dưới
```

```gherkin
Given trang chủ, Nhà ở, Kinh doanh, Về chúng tôi, Sản phẩm quảng cáo
When đọc text-shadow của title hero, và title CTA lưới trang Sản phẩm quảng cáo
Then đều là none
```

## UI

Token chữ hero và portal trong [Design System](../../design-system/). Chỉ đổi `design-system/` sau khi owner tự audit
kết quả trên PC và phone và duyệt; sau đó republish theo
[design-system R5](design-system.md#r5-publish-lên-claudeai).

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1, R3 | `tests/site/hero-typography.e2e.mjs`: số dòng từ Range rects, nét bị cắt (ảnh có và không clip), hai dòng chồng pixel, cuộn ngang; 12 bề rộng, VI và EN; thêm ảnh có và không clip-path của chữ nối heritage ([page-home R7](page-home.md#r7-heritage-montage)) |
| R2 | Cùng test (cỡ và vị trí qua số dòng, tràn); bảng số đo espacio qua phiên PC còn mở |
| R4 | Cùng test: baseline mọi đoạn văn ở 390 và 1440 |
| R6 | `tests/site/hero-text-shadow.e2e.mjs`: text-shadow hai lớp ở portal, "Giữ nghề", CTA có ảnh; none ở mọi hero và CTA lưới Sản phẩm quảng cáo; clip-path mask nới 12px; ảnh trước/sau trên PC và phone trong mô tả PR |
| R6 (dòng ẩn) | `tests/site/text-mask-hidden.e2e.mjs`: mọi dòng chưa reveal nằm dưới mép clip-path, mép dưới không nới lúc ẩn, reveal xong mở lại; 5 trang, 1440 và 390, VI và EN |

## Gate còn mở

- Owner audit trên PC và phone trước khi cập nhật Design System.
- Đo lại espacio (R2) qua phiên PC, so với cỡ chung 12,5 em.
- R4 chờ owner chỉ đoạn văn thấy lệch (ba mức line-height đang có: 1,4 phần lớn, 1,45 timeline About, 1,5 đoạn chữ
  nhỏ không class). [CẦN LÀM RÕ: owner thấy lệch ở đoạn nào, trên PC hay phone]

## Chú thích thuật ngữ

- **Hero**: khối mở đầu trang, gồm ảnh hoặc nền lớn và title chính.
- **Kicker**: dòng chữ nhỏ phía trên title.
- **Mask**: khung `overflow: hidden` bọc một dòng chữ để chữ trượt vào khi có motion.
- **Glyph**: hình vẽ của một ký tự, kể cả dấu.
- **Baseline**: đường chân của chữ trong một dòng.
- **Token**: giá trị thiết kế dùng chung, đặt tên trong Design System.
