---
title: Correction P7.1 organic skeleton, conditional suggestion và navbar regression
type: frontend
status: accepted
updated: 2026-09-23
notion: none
related_decisions: []
related_reports:
  - ../verification/advertising-september-p7-2026-09-23.md
  - ../verification/advertising-september-p7-1-p7-2-2026-09-23.md
---

# Correction P7.1 organic skeleton, conditional suggestion và navbar regression

## Trạng thái và module

Owner xác nhận intent ngày `2026-09-23` và đã giao Codex tự duyệt plan/task,
kiểm kết quả cuối. Spec được duyệt theo ủy quyền đó; không mở lại requirement
gate cho các quyết định đã xác nhận.

Correction dùng lại capability map đã duyệt, không tạo module id mới:

| Module id | Delta P7.1 | Phụ thuộc |
| --- | --- | --- |
| `skeleton-cta-field` | Skeleton tiếp tục organic masonry, visual overflow không tăng document height, CTA và footer cùng viewport cuối | `shared-footer-boundary` |
| `photo-detail-layout` | Suggestion đổi vị trí theo full-span hay split layout | `photo-morph-scroll`, `shared-media-hover` |
| `advertising-hero-once` | Hero chỉ chạy một lần trong document lifetime | — |
| `shared-header-shell` | Phục hồi geometry contract và chặn expand giả tại đáy trên toàn site | — |

Thứ tự dependency giữ nguyên: khóa regression trước; sửa hero và shared header
độc lập; sửa skeleton trước photo layout vì cùng chạm grid runtime; cuối cùng
chạy matrix tích hợp.

## Objective

Giữ cảm giác Advertising là một masonry liên tục đến tận CTA, thay hàng
skeleton ngang bằng các card skeleton organic nối trực tiếp card thật. Khi user
cuộn tới cuối, CTA và toàn footer cùng nằm trong một viewport. Đồng thời phục
hồi suggestion theo đúng hai layout, ngăn hero replay khi lọc và đưa shared
navbar về geometry Espacio đã đo trước P7.

Thành công khi user không nhận ra ranh giới hàng giữa card thật và skeleton,
không thấy skeleton đẩy footer, không mất suggestion trong split layout, không
thấy hero replay và không thấy navbar tự mở chỉ vì chạm đáy trang.

## Assumptions đã xác nhận

1. Skeleton dùng cùng coordinate space và placement rule với masonry card thật.
2. Số skeleton là adaptive; mobile vẫn tối đa hai WebGL context sống, không hạ
   renderer quality hoặc motion quality.
3. Skeleton vượt đáy grid chỉ là paint overflow. Overflow không tham gia layout,
   document height hoặc hit testing.
4. Unified Glassmorphism R10 giữ nguyên token, thứ tự clear, blur/tint, white và
   endpoint trắng tuyệt đối.
5. Header dùng contract geometry hiện hành, không thiết kế hoặc đo lại navbar.

## Contract `skeleton-cta-field`

### Organic continuation

- Sau khi card thật được đặt, mỗi skeleton là placement tiếp theo của cùng
  masonry solver. Không tạo batch row, top boundary chung hoặc grid phụ.
- Solver tiếp tục chọn vị trí hợp lệ cao nhất trên frontier hiện có; tie-break
  giữ source order và không làm card thật đang có thay vị trí.
- Card skeleton giữ ratio diversity, preset uniqueness, anchor permutation,
  direction và motion lifecycle đã duyệt. Skeleton không có hover.
- Solver chọn số card nhỏ nhất đủ nối các cột nhìn thấy tới vùng Glassmorphism,
  không để cột kết thúc đột ngột thành một hàng ngang giả. Desktop được tăng số
  card. Mobile được tăng số DOM card nhưng chỉ có tối đa hai WebGL context sống;
  renderer ngoài viewport phải được giải phóng hoặc tái sử dụng theo lifecycle.

### Logical boundary và visual overflow

- Chiều cao layout của grid kết thúc sớm theo budget từ viewport, CTA, shared
  footer và footer gap thật. Tại `scrollY = scrollHeight - innerHeight`, bbox đầy
  đủ của CTA và toàn footer phải nằm trong viewport với sai số `1 CSS px`.
- Skeleton được paint vượt nhẹ qua logical grid bottom để các cột trông organic.
  Painted bottom không được tăng `scrollHeight`, chiếm pointer event hoặc đẩy
  CTA/footer. Không tạo horizontal overflow.
- Overflow nằm dưới unified Glassmorphism, CTA và footer. Trước vùng chữ/link
  tương tác đầu tiên của footer, glass phải đạt white endpoint; không còn ghost,
  fallout hoặc pixel skeleton đọc được.
- CTA/footer giữ source order và component hiện hành. Không absolute-position
  CTA/footer để giả lập acceptance.

### Glassmorphism bất biến

- Giữ full-bleed surface, shared token `28px/1.08/1.04/0.12`, blur/tint xuất
  hiện trước lớp trắng và endpoint `#fff` của R10.
- Không đổi gradient curve, backdrop ownership, stacking, pointer behavior hoặc
  reduced-motion behavior ngoài phần boundary cần để theo logical grid bottom.
- Glassmorphism không trở lại local-space theo từng card hoặc từng cột.

## Contract `photo-detail-layout`

- Nếu `primarySpan < totalColumns`, suggestion nằm trong cụm ảnh + mô tả như
  trước P7. Related masonry bắt đầu bằng card ảnh thật.
- Nếu `primarySpan === totalColumns`, Pinterest mode giữ suggestion thành
  synthetic card đầu related grid như R15.
- Resize qua boundary chỉ reparent một suggestion UI; không clone, duplicate,
  mất active state, đổi selected tag/photo hoặc tạo history entry.
- Split và full-span dùng chung data, copy, active/inactive behavior, shared
  hover và keyboard semantics. Mỗi state chỉ có đúng một suggestion region trong
  DOM và accessibility tree.
- Các contract `100dvh`, tỷ lệ ảnh/mô tả `72/28`, pager và zoom-glass có điều
  kiện của R15 giữ nguyên tại thời điểm P7.1; chiều cao cố định và tỷ lệ vùng
  này đã được [P7.2](advertising-september-2026-p7-2-visual-adjustment.md)
  thay thế sau đó.

## Contract `advertising-hero-once`

- Hero Advertising chạy tối đa một lần trong lifetime của document. Full
  document navigation/reload tạo document mới và được phép chạy lại.
- Filter, `End`, `Home`, resize, focus/visibility, content-height mutation,
  catalog import/mount, history nội bộ và Barba route return trong cùng document
  không được tạo hero animation mới.
- Khi hero DOM được tạo lại trong document đã chạy, runtime áp thẳng completed
  visual state; không replay SplitText, opacity hoặc translate để che remount.
- Pre-adapter filter queue, latest-intent và fail-open document navigation của
  D21/P7 giữ nguyên. Correction không đổi URL, filter semantics hoặc card motion.

## Contract `shared-header-shell`

### Geometry phải phục hồi

- P7.1 loại bỏ assertion sai rằng logo transparent/top và logo white/collapsed
  phải có cùng bbox. Logo giữ đúng SVG ratio; từng state dùng geometry đã đo.
- Tổng chiều cao header bắt buộc:
  - `≤750px`: top `72.59375px`, collapsed `70.640625px`;
  - `751–960px`: top `132.78125px`, collapsed `128.78125px`;
  - `961–1200px`: top `85.390625px`, collapsed `81.390625px`;
  - `>1200px`: top `102.515625px`, collapsed `81.390625px`.
- Restore collapsed padding/row/logo geometry tại shared CSS ownership. Không
  thêm route override. Nav link `left`, width và computed typography giữa top và
  collapsed vẫn sai khác tối đa `1px` theo contract cũ.
- Logo, nav và hamburger giữ state color/inverse, breakpoint, SVG, copy và
  transition đã duyệt. CTA Zalo/menu order, focus, Escape và resize-open từ P7
  giữ nguyên.

### Không expand giả tại đáy

- Áp cho mọi public route VI/EN. Chạm đáy khi đang cuộn xuống phải giữ header ở
  collapsed/hidden state hiện hành.
- Overscroll, scrollbar clamp, footer/skeleton đổi chiều cao, visual viewport
  resize và rounding của smooth-scroll không được tính là upward intent.
- Header chỉ reveal/expand compact sau upward scroll thật vượt threshold hiện
  hành. Header chỉ trở về expanded top state khi logical scroll thực bằng `0`.
- Keyboard, wheel, touch, trackpad, native scroll và Locomotive phải cho cùng
  state outcome. Focus-within/menu-open behavior accessibility giữ nguyên.

## Tech stack và project structure

- HTML/CSS/JavaScript hiện hành; không thêm dependency.
- `src/site/advertising-products/layout-core.mjs`: quyết định pure layout và
  masonry placement.
- `src/site/advertising-products/catalog-runtime.mjs`: mount/reparent,
  measurement và lifecycle.
- `src/site/advertising-products/skeleton-flow.mjs`: renderer assignment và
  WebGL context budget.
- `src/site/motion.js`, `src/site/style.css`: hero token cùng shared navbar
  controller/geometry.
- Focused regression nằm trong `tests/site/`; output chỉ sinh qua
  `pnpm prepare:site`, không edit `.site-output/` trực tiếp.

## Code style

Quyết định layout phải là pure function nhỏ, nhận geometry đã đo và trả state;
DOM adapter chỉ áp kết quả:

```js
export function getSuggestionPlacement({ primarySpan, totalColumns }) {
  return primarySpan === totalColumns ? "related-grid" : "primary-info";
}
```

Không tạo component, state store hoặc solver thứ hai cho correction này. Reuse
factory, masonry solver, glass surface và shared header controller hiện có.

## Commands và testing strategy

```text
Build: pnpm prepare:site
Static: pnpm qa:static
Unit layout: node tests/site/advertising-products-layout.test.mjs
Skeleton: node tests/site/advertising-skeleton-flow.test.mjs
Hero: node tests/site/advertising-hero-once.e2e.mjs
Integrated tail: node tests/site/advertising-continuation.e2e.mjs
Primary: node tests/site/advertising-primary-p14.e2e.mjs
Header: node tests/site/shared-header-menu-p7.e2e.mjs
```

Regression phải bao phủ VI/EN và tối thiểu `360×800`, `390×844`, `768×1024`,
`1004×900`, `1005×900`, `1440×900`, `1569×912`, `1922×912`:

1. Organic frontier: không row boundary, overlap, duplicate hoặc horizontal
   overflow; mỗi skeleton placement nối trực tiếp frontier card thật.
2. Tail: final viewport chứa toàn CTA/footer; visual overflow không tăng
   `scrollHeight`; white endpoint không ghost.
3. Suggestion: split/full-span/resize có đúng một region và giữ state.
4. Hero: filter trước/sau adapter, End/Home, history và remount không replay.
5. Header: bốn height band chính xác, nav link invariant, bottom clamp không
   reveal; upward intent và top state vẫn hoạt động.

Browser verification phải chạy sau font ready, ở reduced motion và normal
motion, kiểm console/network sạch. Synthetic A54 không thay proof thiết bị thật.

## Boundaries

### Always

- Viết regression fail đúng contract trước source edit.
- Reuse module id, solver, UI factory, Glassmorphism và shared header hiện có.
- Cập nhật owner spec, STATE và verification trong cùng implementation task.

### Ask first

- Đổi breakpoint, header height, footer height/content hoặc glass token.
- Hạ renderer quality, tăng mobile WebGL context trên hai hoặc đổi preset.
- Thay URL/history/filter semantics hay CTA/menu copy.

### Never

- Tạo hàng skeleton riêng, local card fade/blur hoặc absolute CTA/footer để đạt
  screenshot.
- Thêm route-specific navbar CSS/controller.
- Gọi emulation là proof Galaxy A54 thật hoặc focused PASS là full-site PASS.
- Stage, commit, push, deploy hoặc xóa `skeleton-dev` trong correction này.

## Success criteria

1. Owner xác nhận visual skeleton giống phần tiếp tục tự nhiên của masonry card.
2. CTA và toàn footer cùng hiện ở final viewport trên matrix; skeleton có thể
   paint qua grid boundary nhưng không đổi document height hay tương tác.
3. Suggestion ở đúng owner container theo span, không duplicate qua resize.
4. Hero animation count không tăng sau mọi tương tác trong cùng document.
5. Navbar toàn site khớp bốn geometry band và không tự expand tại đáy.
6. Focused build/static/unit/browser đạt; independent review không còn finding
   Critical hoặc Important. Owner visual gate và actual-device gate vẫn riêng.

## Open questions

Không còn câu hỏi requirement. Plan `AD-SEPT-2026-P7.1` nằm trong
`tasks/plan.md`.

## Chú thích thuật ngữ

- **Frontier**: tập đáy hiện tại của các cột masonry dùng để đặt card tiếp theo.
- **Logical boundary**: đáy tham gia layout và document height.
- **Paint overflow**: pixel được vẽ ngoài logical boundary nhưng không chiếm
  layout hoặc hit testing.
- **Document lifetime**: thời gian tồn tại của một HTML document, kết thúc khi
  full navigation hoặc reload tạo document mới.
- **Bottom clamp**: thay đổi scroll coordinate do chạm đáy hoặc chiều cao nội
  dung đổi, không phải ý định cuộn lên của user.
