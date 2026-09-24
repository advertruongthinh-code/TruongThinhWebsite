---
title: Correction P7.2 độ tối portal và primary full-span theo nội dung
type: frontend
status: accepted
updated: 2026-09-23
notion: none
related_decisions: []
related_reports:
  - ../verification/advertising-september-p7-1-p7-2-2026-09-23.md
  - ../verification/advertising-september-p7-3-2026-09-23.md
---

# Correction P7.2 độ tối portal và primary full-span theo nội dung

## Objective và quyền duyệt

Owner xác nhận toàn bộ intent ngày 2026-09-23; ủy quyền Codex tự duyệt plan/task
và sẽ kiểm kết quả cuối. Hai module đã có trong capability map tháng 09/2026:
`shared-media-hover` và `photo-detail-layout`. P7.2 thay riêng độ tối overlay
và hình học primary full-span của R15/P7.1; không mở rộng split layout.

## Contract `shared-media-hover`

- Portal homepage và suggestion inactive dùng cùng một token phủ tối
  `rgba(0, 0, 0, 0.4)`. Giá trị computed style được đo trực tiếp ở trạng thái
  không hover của nút “Điêu khắc” trong mục “Ý tưởng bạn có thể thích” tại
  Pinterest pin do owner mở trong Codex Browser ngày 2026-09-23.
- Hover, focus và mouse-out giữ **cùng độ tối**. Shared image zoom `1.15`/`600ms
  ease-out` vẫn chạy, không jump hoặc đổi rect. Active suggestion tiếp tục nền
  trắng, chữ/viền đen, không có ảnh hoặc hover motion.
- Không đổi portal copy, underline, media hoặc ảnh sản phẩm.

## Contract `photo-detail-layout`

- Khi `primarySpan === totalColumns`, cụm ảnh + mô tả cao theo nội dung. Trần
  thực tế là phần viewport **còn lại dưới navbar expanded và top gap**, trừ
  safe bottom; `100dvh` không phải chiều cao cấp riêng cho cụm. Toàn bộ ảnh,
  mô tả và CTA phải hiện trọn lúc mở ảnh. Layout split giữ nguyên.
- Mô tả cao vừa nội dung đo thực tế, nhưng không quá `28% viewport`. Khi nội
  dung dài hơn allocation, pager hiện hành chia trang; không tạo inner scrollbar.
  Category/CTA và thao tác swipe/drag/keys giữ như R15.
- Ảnh giữ intrinsic ratio. Nếu ảnh rộng bằng image zone mà chiều cao ảnh cộng
  mô tả/gap không chạm trần, vùng ảnh cao đúng bằng ảnh: không có phần dư
  zoom–blur ở trên hoặc dưới và không ép cụm cao 100dvh.
- Nếu ảnh rộng bằng image zone làm cụm vượt phần viewport còn lại, thu ảnh theo trần chiều
  cao, căn giữa theo ngang. Phần dư zoom–blur chỉ ở trái/phải; ảnh vẫn hiển thị
  trọn chiều ngang nội tại, không crop hoặc bóp tỷ lệ.
- Shared zoom-glass chỉ bật khi thực sự có phần dư; viewer, morph, related grid,
  suggestion position, history và scroll input giữ contract hiện hành. Khi
  full-span, suggestion là card đầu related grid. Khi split, nó nằm sau mô tả
  và CTA trong primary info; resize qua hai mode phải xóa định vị grid cũ để
  không chồng lên nội dung.
- Nút suggestion có ảnh nền ở trạng thái inactive không có viền đen, kể cả
  khi hover; active giữ nền trắng, chữ và viền đen.

## Hình học và kiểm chứng

Với `W` là bề rộng image zone, `r` là tỷ lệ ảnh, `D` là chiều cao mô tả đã
giới hạn, `G` là gap, `V` là chiều cao viewport và `T` là mép trên primary:
`H = min(W/r + D + G, V - T - safeBottom)`; image zone cao
`H - D - G`. Ảnh `contain` trong zone đó. Bề rộng ảnh bằng `W` khi chưa
chạm trần, nhỏ hơn `W` khi trần buộc thu ảnh. Sai số đo browser tối đa 1 CSS px.

- Unit test khóa portrait, landscape, mô tả ngắn/dài, span boundary và ratio.
- Browser VI/EN trên mobile, tablet full-span và desktop split: đo bbox, computed
  overlay normal/hover/focus, pager, zoom-glass và khả năng cuộn trang từ ảnh.
- `pnpm prepare:site`, `pnpm qa:static`, focused browser suites và diff review.
  Owner visual gate, Galaxy A54 thật và P3-T08 vẫn mở; không commit/push/deploy.

## Source và giới hạn

- Source: `src/site/style.css`, `src/site/detail.css`,
  `src/site/advertising-products/layout-core.mjs`; runtime đo mô tả tại
  `catalog-runtime.mjs` sở hữu chuyển suggestion giữa grid và info khi resize.
- Test ở `tests/site/`; `.site-output/` chỉ sinh bằng `pnpm prepare:site`.
- Không thêm dependency, không đổi media/copy, không sửa thuật toán masonry hoặc
  gradient Glassmorphism skeleton.

## Chú thích thuật ngữ

- **Full-span**: primary chiếm toàn bộ số cột hiện có.
- **Image zone**: vùng dành cho ảnh chính trong cụm primary.
- **Contain**: hiển thị trọn ảnh, giữ tỷ lệ, không crop.
