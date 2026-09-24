# Xác minh sáu composition và `109` media trang con Advertising

- Thời điểm: `2026-09-02T01:42:54+07:00`.
- Phạm vi: sáu slug Advertising Products, VI/EN; desktop `1440x900`, mobile
  `390x844`, direct load, Barba và Back/Forward.
- Trạng thái: scoped current-hash `PASS`; full Espacio parity vẫn `NOT PASS`.

## Kết quả

Sáu route dùng một shared component family nhưng sáu composition khác nhau:

| Slug | Layout key | Media |
| --- | --- | ---: |
| `kiosk-posm` | `pollenca-long-form` | `24` |
| `mobile-retail` | `ponent-gallery-rhythm` | `16` |
| `signage-raised-letters` | `can-molteni-banner` | `22` |
| `office-signs-wayfinding` | `lonja-columns` | `13` |
| `led-displays-lightboxes` | `espalmador-balanced` | `18` |
| `print-decals` | `pantry-compact` | `16` |

Config fail closed khi thiếu, lặp hoặc cross-category source. Union hero/body
bằng đúng `109` `sourceId`; mỗi route giữ đủ `12` product label. Hero eager với
`fetchpriority="high"`; body WebP dùng lazy loading, async decode, intrinsic
dimensions và motion target trên `IMG`.

## TDD và runtime

RED trước source: hai focused suite fail vì `catalog.mjs` chưa export
`ADVERTISING_DETAIL_LAYOUTS`. Sau implementation:

```text
Focused Node composition/media                                  PASS 11/11
Advertising + Worker related Node                              PASS 15/15
pnpm prepare:site                                               PASS
pnpm qa:static                                                  PASS
TT_E2E_ADVERTISING_MEDIA_ONLY=1 pnpm qa:site                    PASS 10/10
```

Mobile matrix ban đầu tìm thấy lỗi thật tại `signage-raised-letters`: rule
desktop `span 5` thắng mobile reset trên lưới hai cột, làm media thứ `11/21` có
height `0`. Selector mobile được nâng cùng specificity; rerun cả lane đạt
`10/10`, không horizontal overflow và mọi media box có kích thước dương.

## Evidence ba lớp

- Live reference: audit `45/45` route Espacio ngày `2026-09-02` xác nhận một
  template family với `38` block sequence; sáu route tham chiếu đã ghi trong
  [research report](research-espacio-project-detail-templates-2026-08-30.md).
- In-app Browser sau hard reload route `mobile-retail`: layout
  `ponent-gallery-rhythm`, đúng `11` block, `16` ảnh, `15` body media và
  horizontal overflow `0`.
- DevTools cùng route: hero WebP trả HTTP `200`; DOM có `16` ảnh, first media
  display `block`, opacity `1`, console warning/error rỗng. Chỉ hero request ở
  initial viewport, phù hợp body lazy loading.

## Review và detector

- Correctness/architecture/security/performance: không còn finding scoped;
  output đều escape HTML, không thêm dependency, runtime listener hoặc CMS path.
- Ponytail review: shared renderer và một config map là mức tối thiểu để giữ sáu
  composition; không có abstraction hoặc dependency nên cắt.
- Impeccable detector chạy degraded do thiếu `htmlparser2`, `css-select`,
  `css-tree`, `domutils`. Finding duy nhất là Plus Jakarta Sans tại phần CSS có
  trước delta và ngoài scope typography đã duyệt; không phải clean bill of
  health.
- Audit scoped: Accessibility `4/4`, Performance `4/4`, Responsive `4/4`,
  Theming `3/4`, Implementation Integrity `4/4`; tổng `19/20`. Điểm theming giữ
  `#e9e6df` theo placeholder đã duyệt thay vì mở rộng token ngoài task.

## Hash current

| File | SHA-256 |
| --- | --- |
| `src/site/advertising-products/catalog.mjs` | `ab863bdad6ce389d55cfbbcd8aaaaa6d7e63bfa0e50e14f797757d879b859b61` |
| `src/site/advertising-products/detail-template.html` | `ebcf029029b5ede75ebf9a1369fae01f1bb45516450774889cbff115e92b89aa` |
| `scripts/site/prepare-static-assets.mjs` | `a6b04327e26b826c186bfaff8bef138ee0a9b8146b96154ba4289507d02d1974` |
| `src/site/detail.css` | `6b26128f2826f6da03252736cedd00843b02752770e769bdf0dac392697a5e29` |
| `tests/site/advertising-products-detail-routes.test.mjs` | `9ba7b8b3609893a79690a42d7b92c1cad88b4f648d257e86dc341e440e346815` |
| `tests/site/advertising-products-media.test.mjs` | `cd29e12927cf6bde11bf5aa9d4dc34dd303cf973d377435255a7b5ecd70f7586` |
| `tests/site/site.e2e.cjs` | `e344fcce16dab92b86e363c0f454bfad4fb21280fde98e1ac8e708f42b4d3fbb` |
| `tests/site/reports/latest.json` | `1e0ef0a5c4055add60c6a5bd241082993a2a68679d75c463cba7a00c426c33bc` |

## Giới hạn

Không claim full Espacio 1:1 parity, release clearance hoặc production deploy.
Không update Notion, commit, push, bật Wrangler hoặc thay parent Pinterest grid.

## Chú thích thuật ngữ

- **Composition**: thứ tự và tổ hợp block tạo nhịp riêng cho một route.
- **Specificity**: độ ưu tiên selector CSS khi nhiều rule cùng áp dụng.
- **Current-hash**: kết luận gắn với đúng bộ hash source/test đã ghi.
