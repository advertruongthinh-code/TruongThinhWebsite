---
title: Advertising AD-SEPT-2026-P3 — technical gate
type: verification
status: current
updated: 2026-09-21
scope: P3-T01–P3-T07
related_specs:
  - ../specs/advertising-september-2026-capability-map.md
  - ../specs/advertising-skeleton-flow.md
  - ../specs/advertising-skeleton-flow-devtools.md
  - ../specs/advertising-photo-browse.md
---

# Advertising AD-SEPT-2026-P3 — technical gate

## Kết luận

P3-T01–P3-T07 đạt technical gate trên local build và sẵn sàng owner preview.
P3-T08 chưa chạy: dev UI vẫn chỉ mount khi URL có `?skeleton-dev=1` để owner
tune và Export JSON. Sau khi owner duyệt JSON, phải đưa config vào source và
xóa vật lý module/import/CSS/query/storage dev trước ship.

Không commit, push hoặc deploy. Full `pnpm qa:site` và canonical Espacio parity
vẫn `NOT PASS`; report này chỉ chứng minh phạm vi P3.

## Behavior đã kiểm

1. `skeleton-flow`: 12 preset với bốn màu, bốn anchor, ba band, Field và
   Finish; WebGL low-resolution, fallback CSS tĩnh, context loss, offscreen,
   hidden tab và reduced motion. Mỗi frame random độc lập; resize giữ preset,
   reload/filter/detail/history chọn lại.
2. `photo-detail-layout`: desktop span3 theo hero2/info1, cột4 tiếp tục grid;
   CTA trong info, bốn suggestion một mục mỗi dòng ở đáy. Active dùng nền
   trắng, ring không đổi geometry và image-mask có fallback chữ ink.
3. `photo-viewer-controls`: `+`, `−`, Reset luôn hiện; wheel zoom quanh cursor
   và middle-click Fit dùng chung level/scale/pan, disabled/status đồng bộ.
4. `photo-morph-scroll` và `advertising-page-shell`: click, Back và Forward đều
   chạy morph có scroll lease; nav Advertising về locale canonical không query,
   filter Tất cả; CTA đặt headline tại ranh skeleton/trắng.
5. `skeleton-flow-devtools`: query-only, 12 preset, color/pin/band/Field/Finish,
   Save local, Reset và Export JSON; không Import. Giá trị hiển thị cạnh control
   cập nhật ngay sau input đã qua validator.

## Source và test chính

Source P3:

- `src/site/advertising-products/layout-core.mjs`
- `src/site/advertising-products/index.html`
- `src/site/advertising-products/catalog-runtime.mjs`
- `src/site/advertising-products/photo-viewer.mjs`
- `src/site/advertising-products/skeleton-flow.mjs`
- `src/site/advertising-products/skeleton-flow-devtools.mjs`
- `src/site/detail.css`
- `src/site/motion.js`

Focused test được cập nhật tại các suite `advertising-products-static`,
`advertising-products-lifecycle`, `advertising-one-column`,
`advertising-photo-layout`, `advertising-photo-view`,
`advertising-primary-p14`, `advertising-photo-transitions`,
`advertising-suggestion-layout`, `advertising-suggestion-motion`,
`advertising-continuation`, `advertising-skeleton-flow` và
`advertising-skeleton-flow-devtools`.

## Evidence

| Gate | Kết quả |
| --- | --- |
| `pnpm prepare:site` | PASS; copy source, sinh 6 detail page, embed copy VI/EN |
| `pnpm qa:static` | PASS |
| Node/static/schema | PASS; devtools 5/5, skeleton WebGL/fallback PASS, layout 10/10, one-column 13/13 với 1.392 authored cases |
| Suggestion | Layout và motion E2E PASS sau active white/mask/fallback correction |
| Viewer | Chromium mobile `390×844` và desktop `1440×900` PASS; Reset luôn hiện, wheel/middle/button dùng chung state |
| History/morph/nav | Full continuation VI/EN PASS; chọn ảnh, Back/Forward và canonical reset đạt |
| Photo transition | Các case history pointer, rapid related/back, suggestion replace, CTA skeleton và square controls PASS |
| WebGL performance | 9 canvas tại `1569×912`, khoảng `84,72fps` trong 5 giây, không long task `>50ms`, WebGL error `0` |
| No-WebGL fallback | Bỏ CPU raster 992ms; CSS fallback có 9 frame và CTA ready khoảng `0,50–0,54s` |
| Impeccable detect | PASS, không finding |
| Independent code review | Không finding Important hoặc Minor mở sau correction |

Source và `.site-output` đã đối chiếu SHA-256 cho các module runtime chính sau
`prepare:site`; không chỉnh `.site-output` trực tiếp.

## Human gate còn mở

Owner kiểm ba URL local: parent bình thường, một detail có tag active và parent
có `?skeleton-dev=1`. Owner Export JSON cuối; P3-T08 nhận JSON đó, xóa dev UI và
chạy lại static, focused browser, Impeccable detect cùng independent exact-diff
review. Chỉ sau gate này mới có thể xem xét ship.

## Chú thích thuật ngữ

- **Technical gate**: kiểm thử kỹ thuật trong phạm vi, chưa thay owner visual gate.
- **Fallback**: cách hiển thị tĩnh khi WebGL không dùng được.
- **Scroll lease**: khóa và phục hồi vị trí cuộn trong thời gian morph chạy.
- **Exact diff**: tập thay đổi cuối được reviewer đọc đúng theo file hiện hành.
