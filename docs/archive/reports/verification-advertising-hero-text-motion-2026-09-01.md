# Verification motion chữ hero Advertising Products

## Phạm vi

Evidence này chỉ xác nhận regression motion chữ lúc direct/F5 trên
`/vi/advertising-products/` tại worktree dựa trên Git
`a8ba94ec1dadd84990b0b33f7e590f2cf76c71b1`. Không phải full Espacio parity,
release clearance, deploy hoặc production publication.

## Nguyên nhân và sửa lỗi

- Catalog localization từng replace toàn bộ filter markup sau khi `detail.js`
  đã tạo GSAP tween. Tween tiếp tục giữ node cũ đã rời DOM, còn node mới hiện
  thẳng ở final state.
- Kicker chưa có initial state trước khi `motion-enabled` được thêm, nên first
  paint có thể hiện final state rồi bỏ qua entrance.
- Runtime nay cập nhật filter theo stable key trên node hiện hữu. CSS prepaint
  riêng profile `words-06` giữ kicker ở `opacity: 0`, `x: -60px` cho tới khi
  `is-motion-inview` được thêm. Word fade và wrapper zoom đã duyệt không đổi.

## Artifact

| Artifact | SHA-256 |
| --- | --- |
| `src/site/advertising-products/catalog-runtime.mjs` | `d94534b9bc2eeccd87b4f03d10755fa713a629145e9187c3e497e48b4181d2bf` |
| `src/site/detail.css` | `9e9a9b5941ecc5c912d943d05dab96b2e57c00c20ab35c47240e18fdcaa4cf7c` |
| `tests/site/site.e2e.cjs` | `5519a13a762a5c2ab20d679c71ab447e7bc14ab5d0ee2506e48777cbb91407f2` |

## Kết quả

- `pnpm prepare:site`: pass; preview source/output đã đồng bộ.
- Focused browser
  `TT_E2E_ADVERTISING_HERO_MOTION_ONLY=1 BASE_URL=http://127.0.0.1:8787 pnpm qa:site`:
  pass `1/1`. Trace khóa hidden, intermediate và final state của 7 hero word,
  kicker, filter stagger và wrapper `scale 1.2 -> 1`.
- `pnpm qa:static`, `pnpm qa:worker:static`: pass.
- Node layout, lifecycle và static Advertising: pass `3/3`.
- Reduced-motion matrix: Advertising Products `390x844` pass. Tổng matrix
  `5/6`; Commercial `390x844` còn failure gallery sweep ngoài phạm vi patch,
  nên không ghi full reduced-motion suite green.
- DevTools direct reload tại `1440px`: kicker bắt đầu `opacity 0/x -60`, filter
  bắt đầu `opacity 0/y 20`, SplitText tạo 7 word, các state trung gian quan sát
  được và mọi target kết thúc ở final state. Console sạch; network chỉ có
  response `200/304`; accessibility tree giữ một hero `h1` và đủ filter link.
- Impeccable detect không có finding do patch này tạo ra. Detector vẫn báo hai
  warning ngoài scope: font Plus Jakarta Sans đã duyệt trong card caption và
  `transition: height` nằm trong test fixture, không phải live hero runtime.
- Graphify structural AST fresh; còn `119` semantic file pending và không rebuild
  theo policy. Serena trên đúng các dòng patch không có error hoặc warning; full
  catalog JavaScript vẫn có type inference diagnostic cũ ngoài phạm vi.

## Ranh giới

Focused Advertising hero motion đã green. Full Advertising hero layout vẫn có
assertion attachment `50px` ngoài regression này; canonical Espacio parity và
full-site suite vẫn `NOT PASS`. Không commit hoặc deploy trong task này.

## Chú thích thuật ngữ

- **Prepaint**: style được áp dụng trước frame đầu tiên người dùng nhìn thấy.
- **Stable key**: định danh dùng để tái sử dụng đúng DOM node qua lần cập nhật.
- **Entrance tween**: animation đưa phần tử từ initial state tới final state.
- **Focused gate**: kiểm thử chỉ bao đúng contract của thay đổi đang xác minh.
