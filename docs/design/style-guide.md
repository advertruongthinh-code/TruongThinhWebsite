---
title: Style guide áp dụng Trường Thịnh
type: design
status: living
updated: 2026-10-03
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

Conflict: theo [authority map](index.md#authority-map).

## Màu và mark

- Dùng surface neutral để material, project và mark là tâm điểm; xanh dương và
  cam là accent/emphasis có chủ đích. Giá trị và tên ngữ nghĩa đọc từ `DESIGN.md`.
- Quy định duy nhất về mark, màu, geometry, chữ và motion:
  [Brand lockup trong DESIGN.md](../../DESIGN.md#brand-lockup--nguồn-chuẩn);
  guide này không giữ bản sao tỷ lệ, kích thước hoặc timing logo.

## Typography và hierarchy

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
motion blur. Chuẩn file, safe crop, budget, alt và checklist thuộc
[`content.md`](content.md).

## VI/EN, accessibility và motion

- VI/EN leaf-node rule thuộc [`content.md`](content.md).
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
- Giữ alt/ARIA, VI/EN, focus và reduced-motion cùng lúc với visual change.

### Don't

- Không lặp hex, breakpoint, shadow, motion hoặc component token từ `DESIGN.md`.
- Không copy source/media/logo/font/URL nhận diện từ Espacio reference.
- Không invent owner fact chưa xác nhận trong `PRODUCT.md`.
- Không đưa primitive admin/CMS vào public visual system khi CMS còn dormant.
- Không thêm `data-motion-*`, motto, gallery count hoặc route variant trái content
  guide chỉ để đạt cảm giác nhất thời.

## Chú thích thuật ngữ

- **Semantic role**: ý nghĩa sử dụng của token, như surface, text hoặc accent.
- **Lockup**: cụm mark, wordmark và subtitle đi cùng nhau.
- **Surface**: nền hoặc vùng giao diện nhận token màu/tone.
- **Fail-open**: enhancement lỗi không làm content biến mất.
- **Reference evidence**: bằng chứng định hướng hoặc đo từ site tham chiếu, không phải source TT.
