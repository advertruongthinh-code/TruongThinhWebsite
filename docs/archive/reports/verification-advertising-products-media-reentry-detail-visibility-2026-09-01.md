# Verification media re-entry và visibility trang chi tiết Advertising Products

- Thời điểm chốt evidence: `2026-09-01T22:46:39+07:00`.
- Git base: `a8ba94ec1dadd84990b0b33f7e590f2cf76c71b1` với worktree chưa commit.
- Kết luận scoped: `PASS` cho media re-entry ở root grid và visibility ảnh trên
  sáu route chi tiết VI/EN.
- Boundary: kết quả này không đổi canonical Espacio parity `NOT PASS`, không là
  release clearance, deploy hoặc publication.

## Contract đã kiểm chứng

1. Foreground/backplate của card fade `opacity 0 → 1` trong `0.6s ease-out` ở
   lần vào đầu và sau mỗi lần rời hoàn toàn rồi tái vào viewport.
2. Card còn giao viewport một phần không re-arm; card rời viewport không có exit
   motion. Shell và caption giữ opacity `1`.
3. Cached image và virtual remount dùng cùng stable-id lifecycle; reduced motion
   hiện media tức thì. Observer được disconnect trong cleanup.
4. Sáu slug VI/EN có hero/gallery visible sau direct load, Barba và
   Back/Forward; motion hook nằm trên `IMG`, không nằm trên wrapper `FIGURE`.
5. Masonry position morph, geometry, gap, copy, asset và detail layout không đổi.

## RED trước source fix

- Node detail contract fail vì `data-motion-media` nằm trên `figure`; lifecycle
  contract fail vì còn module-level `revealedCards`.
- Focused entrance E2E đạt `8/10`; hai case VI/EN normal fail vì virtual remount
  không replay. Reduced motion và route readiness vẫn pass.
- Focused detail/media E2E fail VI/EN vì motion target là `FIGURE`; ảnh đã load
  nhưng wrapper không nhận `load`, nên có thể giữ opacity `0`.

RED chỉ dùng để chứng minh đúng failure. Sau source fix, test timing được sửa để
đợi đủ `750ms` sau readiness thay vì kết thúc theo thời điểm DOM mount; event
capture cũng được giới hạn đúng stable card id.

## Implementation

- `src/site/advertising-products/catalog-runtime.mjs`: bỏ one-shot set; thêm một
  `IntersectionObserver` theo catalog lifecycle, exact `intersectionRatio === 0`
  re-arm, reset composition không transition rồi replay ở lần vào kế tiếp.
- Cả render-window và keyboard virtual placement đều truyền cùng media callback,
  observe khi tạo và unobserve trước remove; cleanup disconnect observer và hủy
  pending animation frame.
- `src/site/advertising-products/detail-template.html`: chuyển
  `data-motion-media` từ wrapper sang hero `img`. Không sửa `detail.js`,
  `detail.css` hoặc dependency.

## Current-hash verification

| Gate | Kết quả |
| --- | --- |
| `node --test` ba suite Advertising detail/layout/lifecycle | `3/3 PASS` |
| `pnpm prepare:site` | PASS, generate đủ sáu detail page |
| `pnpm qa:static` | PASS |
| `TT_E2E_ADVERTISING_KEYBOARD_ONLY=1` | `1/1 PASS` |
| `TT_E2E_ADVERTISING_MEDIA_ENTRANCE_ONLY=1` | `10/10 PASS` |
| `TT_E2E_ADVERTISING_MEDIA_ONLY=1` | `7/7 PASS` |
| `git diff --check` | PASS; chỉ có warning CRLF/LF từ file ngoài hoặc file đã tồn tại |

Entrance matrix gồm VI/EN normal và reduced motion, hai full-exit/re-entry cycle,
partial visibility, cached/remount, Home round-trip, Back/Forward và
desktop/mobile. Detail matrix duyệt đủ sáu slug VI/EN qua direct, Barba và
Back/Forward; mỗi ảnh có `currentSrc`, `complete`, `naturalWidth > 0` và final
opacity `1`.

## DevTools spot-check

- Root tại viewport thực `1335×912`: `26` card mounted, `13` card visible,
  transition computed `opacity, transform / 0.6s / ease-out`, image/shell/caption
  opacity `1`, overflow `0`, console warning/error rỗng.
- Emulation `390×844`: hai cột, grid left `15px`, `24` card mounted, overflow
  `0`, image/shell/caption opacity `1`, transition `0.6s ease-out`, console sạch.
- Detail `kiosk-posm`: motion target là `IMG`; hero và hai gallery WebP đều trả
  HTTP `200`, sau lazy load có intrinsic width `1672/1448/1774` và opacity `1`;
  console warning/error rỗng.
- CUA scroll cycle xác nhận deep card bị unmount ở đáy và remount khi quay lại.
  Intermediate opacity và transition events được lấy bằng focused Playwright để
  tránh quán tính scroll của UI làm mất frame đo.

## Detector và review

- Impeccable detector chạy trên `src/site/advertising-products`; detector ở chế
  độ degraded vì thiếu HTML parser module và trả một warning `overused-font` cho
  Plus Jakarta Sans trong `index.html`. Font này là typography đã được owner
  chốt; không đổi trong delta.
- Correctness review phát hiện keyboard virtual placement còn gọi callback cũ;
  đã sửa cùng source owner và keyboard regression `1/1` pass sau rebuild.
- Complexity review: không dependency, observer hoặc abstraction theo card;
  implementation dùng một observer và ba bounded set/map theo mounted lifecycle.

## Source identity

| File | SHA-256 |
| --- | --- |
| `catalog-runtime.mjs` | `edc425679e246d50d7fa87752eaa8b6c0fe5489243581379a0378b5c8f017f31` |
| `detail-template.html` | `f45e6fe16bb4e1c62516f733d3e35928323b561ae7f1b6eac71a66522b6a1533` |
| `site.e2e.cjs` | `bf340744fcd7288daaa7e0e2028ab7ead0d40ead64aa46c6f4815a6bac644c5f` |
| `advertising-products-lifecycle.test.mjs` | `c2cda4b594a0a1ddfec3671ab32f7be2216e759446976df67d0f3a18a4db78f6` |
| `advertising-products-detail-routes.test.mjs` | `c2017b33fcc0e7f038021aaf3b5422683cb7bbcce84e65c75c20496657cc9f16` |

## Chú thích thuật ngữ

- **Media re-entry**: media chạy lại entrance sau khi card đã rời hoàn toàn và
  tái vào viewport.
- **Stable card id**: định danh card không đổi qua cache hoặc virtual remount.
- **Current-hash**: source/test được nhận diện bằng hash tại đúng lần verify.
- **Scoped PASS**: pass trong boundary nêu ở report, không suy rộng toàn website.

