# Verification one-shot media entrance của Advertising Products

- Thời điểm: `2026-09-01T19:47:07+07:00`
- Base Git: `a8ba94ec1dadd84990b0b33f7e590f2cf76c71b1`
- Trạng thái: scoped acceptance đạt; full Espacio parity vẫn `NOT PASS`.
- Phạm vi: grid gốc `/vi/advertising-products/` và
  `/en/advertising-products/`; sáu route chi tiết giữ editorial gallery.

## Contract đã verify

Live Espacio Projects dùng LazySizes để fade riêng ảnh `opacity 0 → 1` trong
`.6s ease-out`; card shell và caption không tham gia entrance. Trường Thịnh giữ
đúng contract đó, không replay khi virtual remount, không có exit motion và
`prefers-reduced-motion` hiện final state tức thì. Canonical intent nằm trong
[live spec Advertising](../specs/advertising-products-turnkey-services.md#media-entrance-và-interaction).

## Regression và gate

Focused gate mới `TT_E2E_ADVERTISING_MEDIA_ENTRANCE_ONLY=1` kiểm tra fresh VI/EN,
deep scrollbar jump tới card chưa unveil, intermediate opacity, property/timing,
shell/caption, remount và reduced motion. Probe delay target image `180ms` trong
fresh browser context, chỉ chờ LazySizes thật rồi bắt buộc `currentSrc`,
`complete` và `naturalWidth > 0`; không dispatch event giả. Cùng lane tổng hợp
Home → Advertising Products, Advertising Products → Home → Advertising
Products, Back/Forward, desktop/mobile và slow vendor network. Current source
đạt toàn bộ nên không có RED hợp lệ và không được sửa UI source suy đoán.

| Gate | Kết quả |
| --- | --- |
| `node --check tests/site/site.e2e.cjs` | PASS |
| focused media entrance + route lifecycle matrix | `10/10 PASS` |
| lifecycle + static Node Advertising | `2/2 PASS` |
| `pnpm prepare:site` | PASS |
| `pnpm qa:static` | PASS |
| bounded reviewer re-review | PASS, không có finding actionable |

## Browser runtime

- In-app browser `907px`: sau deep wheel, card mới đi từ opacity `0` tại
  `scrollY 2231` tới `0.246–0.538` tại `scrollY 4872`, rồi settle `1`;
  shell/caption giữ `1`.
- In-app browser desktop `1440px`: card mới đi từ opacity `0` tại
  `scrollY 2732` tới `0.033–0.358` tại `scrollY 4806`, sau đó settle gần `1`;
  DOM virtual window giữ bounded.
- Chrome DevTools `900×861`: unseen deep cards phát đủ `transitionrun`,
  `transitionstart`, `transitionend` cho property `opacity`; `elapsedTime` ở end
  bằng `0.6`. DOM tại vùng đích là `21` card, horizontal overflow bằng `0`.
- DevTools network có `56/56` request trả `200`; console error/warn/issue sạch.
- Focused Playwright xác nhận reverse scroll/remount không replay và reduced
  motion hiện final state tức thì.

## Impeccable và boundary

Detector chạy một lần trên `catalog-runtime.mjs` và `detail.css`; finding duy
nhất là `overused-font` tại Plus Jakarta Sans. Font này thuộc typography Espacio
parity đã được owner chốt, nên giữ nguyên trong delta motion. Không cài dependency,
không đổi Masonry position morph, filter, hover, layout, ảnh, copy, Notion,
Wrangler, deploy hoặc publication.

## Current hash

| File | SHA-256 |
| --- | --- |
| `src/site/advertising-products/catalog-runtime.mjs` | `9aacc466b56fddc072b75bb4e64f0d279e4cc32e11c76627c567469ea531025c` |
| `src/site/detail.css` | `670c9a83a5cf81f5fd7dc4e9151395167a2f539972e70dd58376682f444c1722` |
| `tests/site/site.e2e.cjs` | `6808500e124b2abf71dc894884045c2ed5cca4e15fec803afff3cb5d1ef64343` |
| `docs/specs/advertising-products-turnkey-services.md` | `81c67a33e6a354e75671764f35415d50f3f23387ced2aedfc5453b55e869bf38` |

## Chú thích thuật ngữ

- **One-shot**: motion chỉ chạy lần đầu media được unveil/load.
- **Deep scrollbar jump**: chuyển trực tiếp từ đầu grid tới vùng card xa chưa
  nằm trong virtual window.
- **Virtual remount**: tạo lại DOM node của card đã từng load sau khi quay lại
  vùng đó.
- **Scoped acceptance**: đạt gate trong phạm vi này, không đồng nghĩa full suite
  hoặc toàn bộ Espacio parity đã pass.
