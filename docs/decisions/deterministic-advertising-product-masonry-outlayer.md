---
title: Lưới deterministic dùng Masonry/Outlayer và spacing Espacio
status: superseded
date: 2026-08-31
scope: Advertising product grid, spacing, motion, batching and virtualization
tags:
  - ui
  - motion
  - performance
  - espacio-parity
supersedes:
  - deterministic-advertising-product-masonry.md
superseded_by: deterministic-advertising-product-single-column-media-fit.md
related_specs:
  - ../specs/advertising-products-turnkey-services.md
related_reports:
  - ../archive/reports/research-advertising-products-masonry-batching-2026-08-30.md
  - ../reports/research-espacio-motion-audit.md
---

# Lưới deterministic dùng Masonry/Outlayer và spacing Espacio

## Context

Lưới phải giữ hard `ratio`/`span`, stable order, immutable prefix, closed
frontier, zero interior hole và bounded virtualization. Owner đồng thời yêu cầu
dùng cùng Masonry/Outlayer motion mechanism và spacing đã đo trên Espacio.
Implementation cũ dùng custom WAAPI FLIP và một breakpoint map chung cho outer
margin lẫn card gap, nên sai gap tại viewport `751–960px`.

## Decision

Placement compiler tiếp tục sở hữu `id`, rank/order, ratio, span, filter manifest
và closed-frontier batch. Runtime dùng `masonry-layout@4.2.2`/Outlayer làm một
re-layout và position-transition engine; không giữ custom GSAP hoặc WAAPI FLIP
song song. Mọi coordinate diff của card đã render đi qua cùng `.layout()`
pipeline, bất kể nguồn là filter, resize, đổi số cột hay layout invalidation.

Outer margin và inter-card gap là hai contract độc lập:

- outer margin: `<=750px` là `15px`; `751–1200px` là `25px`; `>1200px` là
  `35px`; content tối đa `1500px`, căn giữa;
- inter-card gap và vertical `margin-bottom`: `<=960px` là `15px`;
  `961–1200px` là `25px`; `>1200px` là `35px`.

Card shell không có viewport entrance/exit. `lazysizes@5.3.2` chỉ fade ảnh một
lần `0.6s ease-out`. Batch append tại closed frontier không di chuyển prefix;
virtualization remount tại cached coordinate không replay motion.

## Alternative đã cân nhắc

| Alternative | Lợi ích | Lý do reject |
| --- | --- | --- |
| Giữ custom WAAPI FLIP | Không thêm dependency | Không dùng đúng mechanism Espacio và tạo hai nguồn transition khi thêm Masonry |
| Để Masonry tự đổi order/span | Ít compiler code hơn | Phá hard data contract, stable order và immutable prefix |
| Dùng một breakpoint map cho margin/gap | Ít biến hơn | Sai live Espacio `10px` tại viewport `751–960px` |

## Hệ quả

### Tích cực

- Motion card dùng đúng Masonry/Outlayer mechanism đã chọn.
- Spacing khớp Espacio mà không đổi contract số cột kiểu Pinterest.
- Layout vẫn deterministic, gap-free và virtualizable.

### Tiêu cực hoặc cost đã chấp nhận

- Thêm hai runtime dependency: Masonry và LazySizes.
- Integration phải chứng minh coordinate/invariant parity; mismatch fail QA.
- Gap breakpoint `960px` độc lập với outer-margin breakpoint `750px`.

## Evidence

- DevTools live ngày `2026-08-31`: Espacio outer/gap lần lượt là `25/15px` tại
  `768px` và `960px`, `25/25px` tại `961–1200px`, `35/35px` từ `1201px`.
- Archive dùng Masonry packaged `v4.2.2`, Outlayer transition `0.4s`, LazySizes
  one-shot opacity fade `0.6s`.
- Owner duyệt scope tại Notion card
  `3cc33284-9a0e-817f-9bca-fba5e357c21c` ngày `2026-08-31`.
- Current-hash focused matrix local ngày `2026-08-31` pass `17/17` tại
  `320–2560px`; contract `751–960px = outer 25px/gap 15px` được đo riêng.
- Browser probe `3.000` card pass tại index `2800`: DOM window `28`, card đầu
  unmount, spacer/deep scroll giữ ổn, không overlap/overflow sau filter và
  resize. Xem report verification current-hash ngày `2026-08-31`.
- `pnpm prepare:site` và bốn Node Advertising suite pass. Focused default
  Advertising subset dùng shared default helper pass `5/5`, gồm SSR VI/EN,
  Mobile retail reflow với transform đang chạy, duration `0.4s`, delay `0s`,
  không stagger, và delayed-detail fail-open tại `320px`/`1440px`.
- Hidden legacy catalog block đã gỡ; search task scope trả zero consumer cho
  selector/taxonomy legacy. Default full `qa:site` trước reviewer-fix là
  `96/143`, còn lỗi ngoài scope; không gọi full-suite green.

## Follow-up

- Implementation chỉ bắt đầu sau khi owner duyệt plan liên kết từ Notion card.
- QA phải đo outer margin và inter-card gap độc lập trước khi gọi parity pass.

## Chú thích thuật ngữ

- **Position-transition engine**: runtime đặt và animate thay đổi tọa độ card.
- **Inter-card gap**: khoảng ngang giữa card và khoảng dọc sau mỗi card.
- **Immutable prefix**: card đã commit không đổi tọa độ khi append batch sau.
- **Cached coordinate**: tọa độ lưu ngoài DOM để remount đúng vị trí.
