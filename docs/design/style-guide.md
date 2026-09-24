---
title: Style guide áp dụng Trường Thịnh
type: design
status: living
updated: 2026-09-09
related_docs:
  - ../../DESIGN.md
  - ../reference/espacio/index.md
  - content.md
  - ../specs/frontend-brand-shell-responsive-runtime.md
---

# Style guide áp dụng Trường Thịnh

Guide này giải thích cách áp dụng hệ thống thị giác trong product, route và
content. Token chính xác, vai trò ngữ nghĩa và primitive component thuộc root
[`DESIGN.md`](../../DESIGN.md); không sao chép giá trị token vào đây.

## Tinh thần thương hiệu

Giọng điệu hiện tại là giàu kinh nghiệm, sáng tạo, đáng tin, trực tiếp và súc
tích (`experienced`, `creative`, `credible`, `direct`, `concise`). Trình bày để
công trình, vật liệu, process và khả năng thi công lên tiếng trước lời quảng
cáo. Nhịp editorial, khoảng trắng và typography dẫn hướng; tránh phong cách
luxury chung chung và lưới bất động sản rập khuôn. Espacio là baseline hình thức
và behavior theo evidence; media, source và nhận diện riêng không sao chép.

`PRODUCT.md` giữ product truth; guide này giữ cách áp dụng logo/hình ảnh;
`DESIGN.md` giữ token và visual role. Khi có
conflict, theo authority map trong [`design index`](index.md).

## Màu và mark

- Dùng surface neutral để material, project và mark là tâm điểm; xanh dương và
  cam là accent/emphasis có chủ đích. Giá trị và tên ngữ nghĩa đọc từ `DESIGN.md`.
- Quy định duy nhất về mark, màu, geometry, chữ và motion:
  [Brand lockup trong DESIGN.md](../../DESIGN.md#brand-lockup--nguồn-chuẩn).
  Đọc cả revision và implementation gap trước khi áp dụng.

## Typography và hierarchy

Typography logo theo [Brand lockup](../../DESIGN.md#brand-lockup--nguồn-chuẩn).
Guide này không giữ bản sao tỷ lệ, kích thước hoặc timing logo.

Favicon là ngoại lệ mark-only duy nhất: dùng
[`favicon-black.svg`](../../src/site/assets/brand/favicon-black.svg) cho light
theme và [`favicon-white.svg`](../../src/site/assets/brand/favicon-white.svg)
cho dark theme. Mỗi HTML public khai báo hai SVG bằng `prefers-color-scheme`;
giữ cùng viewBox/bốn path, chỉ đổi fill đơn sắc. Không dùng favicon rỗng,
data URI hoặc đổi geometry. Không dùng mark độc lập ở vị trí khác nếu chưa có
owner decision. Tone mark/wordmark/nav/hamburger theo shell state trong DESIGN.

Plus Jakarta Sans là font hiện dùng cho public visual contract; role, weight,
size, line-height và tracking chính xác thuộc [DESIGN.md](../../DESIGN.md#typography). Khi
viết page:

- Display/heading dùng để tạo hierarchy và nhịp editorial, không biến mọi label
  thành headline.
- Body ưu tiên câu ngắn, cụ thể, có thông tin vật liệu/process/outcome.
- Label/kicker giữ uppercase khi contract route đã quy định; không tự thêm motto
  hoặc chapter divider vào route ngoại lệ.
- Inline SVG lockup giữ VI/EN copy ở leaf text và không tạo network request mới.

## Layout và image grammar

Áp dụng gutter, section rhythm, breakpoint, content cap và focus ring từ
`DESIGN.md`; không tạo một spacing/radius scale thứ hai trong guide này.
Shell dùng ba track độc lập cho brand, nav và menu control. Route detail giữ
composition theo data/layout hiện có; không tách sáu Advertising route thành sáu
component visual.

Image phải là bằng chứng thật của không gian, vật liệu, tool, craft, bàn tay hoặc
motion blur. Runtime public dùng WebP sRGB, pixel `width`/`height` thật, lazy
loading cho ảnh dưới fold và alt VI/EN. Safe crop, budget, source asset và
upload checklist thuộc [`content.md`](content.md).

## VI/EN, accessibility và motion

- VI là source; EN ở leaf `data-en`, `data-en-alt`, `data-en-aria-label` hoặc
  `data-en-content`. Không đặt translation trên parent có markup con.
- Focus visible, keyboard/touch controls, heading order, landmark và không
  overflow ngang là baseline. Exact selector/state xem source và frontend spec.
- `prefers-reduced-motion` phải fail-open: content vẫn visible, native scroll
  dùng được, transform/autoplay không thiết yếu bị bỏ.
- Choreography TT theo [Motion system](motion.md); measured reference riêng
  tại [Espacio](../reference/espacio/motion.md). Không dùng hai loại thay nhau.

## Do và don't

### Do

- Dẫn người đọc từ image/material tới process và CTA tư vấn.
- Giữ blue/orange ít nhưng có ý nghĩa.
- Áp dụng state logo theo authority được dẫn ở mục Màu và mark.
- Giữ alt/ARIA, VI/EN, focus và reduced-motion cùng lúc với visual change.
- Link token và component role về `DESIGN.md`, source và test consumer.

### Don't

- Không lặp hex, breakpoint, shadow, motion hoặc component token từ `DESIGN.md`.
- Không copy source/media/logo/font/URL nhận diện từ Espacio reference.
- Không invent Zalo, founding year, warranty hoặc claim owner chưa xác nhận.
- Không đưa primitive admin/CMS vào public visual system khi CMS còn dormant.
- Không thêm `data-motion-*`, motto, gallery count hoặc route variant trái content
  guide chỉ để đạt cảm giác nhất thời.

## Chú thích thuật ngữ

- **Semantic role**: ý nghĩa sử dụng của token, như surface, text hoặc accent.
- **Lockup**: cụm mark, wordmark và subtitle đi cùng nhau.
- **Surface**: nền hoặc vùng giao diện nhận token màu/tone.
- **Fail-open**: enhancement lỗi không làm content biến mất.
- **Reference evidence**: bằng chứng định hướng hoặc đo từ site tham chiếu, không phải source TT.
