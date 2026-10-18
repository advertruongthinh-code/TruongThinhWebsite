---
title: Chữ hero kiểu espacio, xuống dòng chốt và khoảng cách dòng đều
status: live
source: []
tests:
  - tests/site/hero-typography.e2e.mjs
notion: https://app.notion.com/p/3fd332849a0e81bfac09f20245186976
updated: 2026-10-18
---

# Chữ hero kiểu espacio, xuống dòng chốt và khoảng cách dòng đều

## Mục đích

Chữ trong hero phải đọc rõ, nằm giữa vùng hero và có nhịp dòng gần giống nhau giữa các trang. Không dấu tiếng Việt
nào bị cắt hay đè lên dòng khác, từ 320px tới màn hình PC lớn. Cách bày chữ học từ hero của espaciohomedesign.com.
Các đoạn văn cùng loại có khoảng cách dòng bằng nhau. Spec không đổi motion
([first-load-parity](first-load-parity.md)), font và màu.

## Hiện trạng

- Trước khi sửa (Chromium cloud, `main` 393ace7): hero trang chủ "Làm chắc / Làm khác" vỡ 4 dòng ở 364 đến 387px vì
  mức sàn `clamp(4.6rem, 19vw, 6.5rem)`; bản EN 4 dòng trên phone. CTA "Giữ nghề" 3 dòng trên phone. Mask
  `clip-path` cắt nét chữ ngang ở CTA.
- Đã làm (PR chữ hero): mọi title ở R1 đúng hai dòng, không cắt nét, không đè dòng, không cuộn ngang ở 12 bề rộng
  của R3, VI và EN, phone giả lập touch và PC. Cách làm ở R2.
- Trong một đoạn văn, các dòng cách đều (lệch tối đa 1px do làm tròn) ở 390 và 1440. Giữa các loại đoạn văn có ba
  mức line-height: 1,4 (phần lớn), 1,45 (timeline About), 1,5 (đoạn chữ nhỏ không class).
  `[CẦN LÀM RÕ: owner thấy lệch ở đoạn nào, trên PC hay phone]`.
- Cloud không vào được espacio. Số đo dùng là số cũ trong repo: title hero 2 dòng, 112px, line-height 1,4. Đo lại
  qua phiên PC là gate còn mở.

## Hành vi

### R1. Xuống dòng theo chốt của owner (2026-10-18)

Mỗi title dưới đây nằm đúng hai dòng ở mọi bề rộng. Subtitle nhỏ của portal trang chủ (cùng nội dung, một dòng)
giữ bố cục riêng.

| Chỗ | VI dòng 1 | VI dòng 2 |
| --- | --- | --- |
| Hero trang chủ | Làm chắc | Làm khác |
| CTA "Giữ nghề" trang chủ | Giữ nghề, | Không ngừng làm mới |
| Hero Residential | Nơi tái tạo | năng lượng sống |
| Hero Commercial | Thiết kế tối ưu | Vận hành bền bỉ |
| Hero Advertising | Để thương hiệu | luôn trong tầm mắt |

Bản EN tách hai dòng ở cùng vị trí ý nghĩa. Câu Commercial mới thay "Thiết kế để bán tốt. Thi công để vận hành bền."
Bản EN là "Designed to perform / Built to last" (owner duyệt 2026-10-18).

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
- Trên 750px mọi hero chung một cỡ: `min(7rem, bề rộng khung / 12,5)`. Câu dài nhất hiện có ("Designed to perform") khoảng
  12 em, nên mọi hero cùng cỡ và khoảng cách hai dòng như nhau ở cùng bề rộng.
- Có JS: `motion.js` (`fitHeroLines`) đo dòng dài nhất theo em (cộng 1% cho hinting) vào `--hero-line-em` và gắn
  `data-hero-fit`, cùng `--hero-pair-em` cho title hai dòng, ghi lên `hero-content`. Dòng không xuống dòng và chỉ
  co thêm khi câu dài hơn 12,5 em. Chạy trước SplitText và trước khi motion đọc vị trí.
- Không JS hoặc `motion-fallback`: cùng cỡ chung nên câu hiện có vẫn hai dòng; hai dòng nằm sát hai mép khung vì
  không có số đo cặp dòng.
- CTA "Giữ nghề" giữ cỡ CTA chung; cùng cơ chế đo, mỗi dòng chỉ co khi không vừa khung.
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

Không đổi font, màu, motion, ảnh hero, hay câu nào ngoài 5 câu ở R1. Ngoại lệ: dấu câu EN theo VI (owner 2026-10-18, [rule](../operations/agent-rule-product-ui.md)); hero trang chủ EN không dấu chấm, hero About EN là "Proven craft. / Earned trust.".

## UI

Token chữ hero và portal trong [Design System](../../design-system/). Chỉ đổi `design-system/` sau khi owner tự audit
kết quả trên PC và phone và duyệt (owner, 2026-10-18); sau đó republish theo
[docs-system R7](docs-system.md#r7-publish-design-system-lên-claudeai).

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1, R3 | `tests/site/hero-typography.e2e.mjs`: số dòng từ Range rects, nét bị cắt (ảnh có và không clip), hai dòng chồng pixel, cuộn ngang; 12 bề rộng, VI và EN |
| R2 | Cùng test (cỡ và vị trí qua số dòng, tràn); bảng số đo espacio qua phiên PC còn mở |
| R4 | Cùng test: baseline mọi đoạn văn ở 390 và 1440 |

## Gate còn mở

- Owner audit trên PC và phone trước khi cập nhật Design System.
- Đo lại espacio (R2) qua phiên PC, so với cỡ chung 12,5 em.
- R4 chờ owner chỉ đoạn văn thấy lệch.

## Chú thích thuật ngữ

- **Hero**: khối mở đầu trang, gồm ảnh hoặc nền lớn và title chính.
- **Kicker**: dòng chữ nhỏ phía trên title.
- **Mask**: khung `overflow: hidden` bọc một dòng chữ để chữ trượt vào khi có motion.
- **Glyph**: hình vẽ của một ký tự, kể cả dấu.
- **Baseline**: đường chân của chữ trong một dòng.
- **Token**: giá trị thiết kế dùng chung, đặt tên trong Design System.
