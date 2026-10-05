---
title: Frontend runtime và route guide Trường Thịnh
type: frontend
status: living
updated: 2026-10-03
related_specs:
  - ../specs/detail-pages.md
  - ../specs/site-shell.md
  - ../specs/advertising-products-turnkey-services.md
  - ../specs/advertising-photo-browse.md
  - ../../design-system/content.md
---

# Frontend runtime và route guide

Frontend hiện là static HTML với shared CSS/runtime. Không có importable
`Header`, `Footer` hoặc `Shell` component; các route lặp markup để giữ static
hosting đơn giản, còn behavior dùng chung nằm trong CSS/JS. Contract chi tiết
thuộc [trang chủ](../specs/page-home.md), [ba trang con](../specs/detail-pages.md), [shell spec](../specs/site-shell.md)
và [content/media guide](../../design-system/content.md).

## Route và source

| Route family | Source | Current behavior |
| --- | --- | --- |
| Home | `src/site/index.html` | VI/EN static landing |
| Residential | `src/site/residential/index.html` | Detail page, shared shell |
| Commercial | `src/site/commercial/index.html` | Detail page, generic horizontal gallery |
| Advertising catalog và detail | `src/site/advertising-products/index.html` | Masonry Auto; query `photo` mở ảnh, `tag` lọc related; viewer mở rộng giữ URL |
| Advertising category URL cũ | `scripts/site/prepare-static-assets.mjs` + `catalog.mjs` | Sáu compatibility entry về parent `?category=<slug>`, giữ VI/EN; source template lịch sử được giữ |
| About | `src/site/about/index.html` | About/detail page |

`/{locale}/projects/:slug/` chỉ là CMS contract tương lai. Không coi route này
là current static page hoặc thêm nó vào menu public.

## Ownership runtime

| Source | Sở hữu | Consumer/test chính |
| --- | --- | --- |
| `src/site/style.css` | tokens, typography, header/menu/footer, home và responsive | mọi HTML route; `tests/site/site.e2e.cjs` brand-shell checks |
| `src/site/motion.js` | locale, route veil, header/menu, scroll, home motion và BFCache cleanup | mọi route; browser smoke |
| `src/site/detail.css` | detail layout, media, gallery và CTA styling | child routes; detail/browser checks |
| `src/site/detail.js` | split/reveal, generic gallery, detail carousel và lifecycle orchestration | `window.TruongThinhDetail`; `catalog-runtime.mjs`; advertising detail tests |
| `src/site/advertising-products/catalog.mjs` | category/card/detail data và artifact input | `layout-core.mjs`, generator, focused tests |
| `src/site/advertising-products/photo-tags.mjs` | stable tag registry, mapping và mô tả VI/EN theo photo ID, source hash/provenance | media manifest, validator và artifact |
| `src/site/advertising-products/layout-core.mjs` | pure spacing, breakpoint, validation, geometry và virtual window | `catalog-runtime.mjs`, layout/lifecycle tests |
| `src/site/advertising-products/catalog-runtime.mjs` | masonry/filter, photo/related, history, morph, virtualization, locale và cleanup | `detail.js`, catalog/photo browser tests |
| `src/site/advertising-products/photo-viewer.mjs` | native dialog, motion hero/fit, fit/cover/2×cover, reset/pan, focus trap và cleanup | `catalog-runtime.mjs`, `advertising-photo-view.e2e.mjs` |
| `scripts/site/prepare-static-assets.mjs` | build copy, artifact và sáu compatibility entry | `pnpm prepare:site`, route/static tests |

## Advertising catalog flow

`detail.js` là lifecycle coordinator: khi namespace là
`advertising-products`, nó chờ `ensureAdvertisingDependencies()`, import
`catalog-runtime.mjs` và gọi `mountAdvertisingCatalog(container, { signal })`.
Masonry/filter không thuộc generic `detail.js`.

Runtime API hiện có:

- `compileAdvertisingLayout(options)` nhận viewport, filter, cards,
  `categoryOrder`, `datasetVersion` và optional columns; trả geometry, placement,
  total height và `coordinateHash`.
- `getVirtualWindow(layout, options)` trả visible `{ items, totalHeight }` theo
  scroll/viewport/overscan và throw khi input invalid.
- `mountAdvertisingCatalog(container?, { signal }?)` là async; validate
  artifact/version, mount filter/masonry, listeners, media observer và
  virtualization, rồi trả `Promise<cleanup function>`.
- `unmountAdvertisingCatalog()` dọn active instance; browser bridge là
  `window.TruongThinhAdvertising`.

Input data đi từ `ADVERTISING_CATEGORIES`, `ADVERTISING_CARDS` và
`ADVERTISING_DETAIL_LAYOUTS` trong `catalog.mjs`. Pure layout không đọc DOM;
runtime đọc artifact generated, category filter, locale và viewport. Keyboard
Tab qua virtual frontier được xử lý trong `catalog-runtime.mjs`; list item giữ
`aria-posinset`/`aria-setsize`.

Photo contract dùng `record.id` làm identity; title và product key
được phép lặp. Mỗi record có `descriptionVi`, `descriptionEn`, `tagIds` và
`media.source`, `media.sha256`, `media.provenance`. `buildAdvertisingArtifact()`
xuất thêm `tagRegistry` với label VI/EN và nhóm tag. Mapping là source authored,
không suy material/technique từ keyword lúc runtime. Validator reject tag lạ,
thiếu mô tả, thiếu source/hash/provenance và photo ID trùng.

Catalog hiện có 154 public record, dataset `2026-09-24.1`; registry có 84 tag
(đọc từ `buildAdvertisingArtifact()`). Mapping ảnh mới giữ gate riêng trong
[image audit](../verification/advertising-images-audit-2026-09-09.md).

Policy hiện hành là `advertising-grid-v13` trong `layout-core.mjs`
(`layoutAlgorithmVersion` của artifact): mọi ảnh rộng một cột, cao intrinsic;
parent, related và build preflight dùng chung solver; artifact có
`settings: {}`, không còn lựa chọn Auto / 1 / 2 cột hay `layoutSpan`. Thuật
toán và acceptance thuộc [GRID-R4](../specs/advertising-grid-span-organic.md)
và [photo browse spec](../specs/advertising-photo-browse.md); không lặp ở đây.

## Advertising photo runtime

Parent route giữ cả masonry và photo region. Runtime dùng `record.id` để dựng
hero, mô tả VI/EN, nhãn và related; query-only navigation không mở route veil.
History merge state Barba và lưu logical scroll/focus theo từng entry. Related
dùng solver chung với reservation theo chiều cao primary đã đo.

Khối primary dọc/vuông chia ảnh và thông tin ở desktop/tablet đủ rộng; ảnh
ngang và mobile xếp ảnh trên thông tin. Adapter đo primary thật trước khi
dành chỗ cho related. Khối suggestion chứa tối đa năm link banner từ authored tags,
ảnh đại diện khớp tag và thứ tự ổn định theo hero ID; chọn tag dùng replaceState
và giữ hero. Chỉ ảnh nền ô nhãn dùng cover crop.

Mode desktop dùng cùng media query `min-width: 961px` với CSS; spacing và bề
rộng khả dụng dùng `documentElement.clientWidth`. Gutter trong detail lấy
cùng số đo với solver để thanh cuộn không làm card vượt container. Adapter
truyền số cột ưu tiên; related adapter giảm cột khi cần. Window resize
đi qua scheduler ngay cả khi ResizeObserver không phát callback. Callback RO
của geometry đã đo được bỏ qua, tránh hủy morph vừa mở.

Nút `Xem lớn hơn` mở native dialog
được chuyển lên `body` để tách khỏi transform của smooth-scroll container.
Viewer dùng API lock/unlock logical scroll của `motion.js`, fit theo tỷ lệ gốc,
zoom qua cover tới hai lần cover, reset ở mức tối đa và pan có giới hạn.
Một WAAPI animation active với generation token tránh callback cũ; mở/đóng
nối rect hero/fit và giữ focus trong các control khả dụng. Escape trong
viewer chỉ đóng viewer; Escape khi đã đóng tiếp tục flow photo history.
Cleanup đóng dialog, khôi phục scroll và trả node về container trước unmount.

Phone tận dụng bề rộng vùng ảnh và safe area; tablet thu lề ngang; desktop giữ
lề cho control. Ma trận viewport thuộc photo browse spec.

## Advertising category URL cũ

Detail trên parent route thay composition theo nhóm.
Generator xuất sáu HTML compatibility nhỏ; canonical tương đối `../`, fallback
link `../?category=<slug>`. JavaScript dùng `location.replace` để giữ locale và
query không định tuyến, bỏ `photo`/`tag`/`category` cũ rồi đặt category của pathname.
Đích luôn cùng origin; không chọn ảnh ngẫu nhiên hoặc thêm một history entry.
Meta refresh nằm trong `noscript`, không tranh navigation với script giữ query.
Khi tắt JavaScript, đích là fallback tĩnh của parent, không phải runtime filter.

Source `detail-template.html`, cấu hình composition, assets lịch sử và generic
carousel vẫn được giữ; sáu output category không còn nhúng gallery/pool cũ.
Compatibility này thuộc static preview; không đổi Worker, sitemap hoặc provider.

## Shared DOM và i18n

Shell hooks dùng chung gồm `[data-site-header]`, `[data-menu-open]`,
`[data-menu-close]`, `#site-menu [data-language-option]`,
`[data-scroll-container]`, `.route-veil` và `.floating-cta`. Detail hooks gồm
`[data-detail-lines]`, `[data-motion-lines]`, `[data-motion-words]`,
`[data-motion-hero-motto]`, `[data-gallery]`, `[data-project-grid]`,
`[data-advertising-filter]` và `[data-advertising-category]`.

VI là source text. EN nằm trên leaf node qua `data-en`, `data-en-alt`,
`data-en-aria-label` hoặc `data-en-content`; không đặt `data-en` lên parent có
markup nếu việc thay `textContent` làm mất child span/em. Worker SSR locale/head
là future boundary; static shell và `motion.js` vẫn giữ counterpart locale.

## State, failure và accessibility

- Catalog state: `all`/category filter, query string, full/virtual window,
  media pending/loaded/revealed, locale, dependency-ready/failure và abort cleanup.
- Detail carousel state: native/enhanced/failure fallback, pointer/touch/wheel,
  pagination, reduced motion, direct/Barba/remount/unmount và media error.
- Reduced motion phải fail-open: content visible, transform/autoplay không thiết yếu
  được bỏ.
- Missing artifact, invalid version, invalid card data hoặc missing Masonry là
  error boundary của catalog; cleanup qua `AbortSignal` phải idempotent.
- Media dùng `width`/`height`, lazy loading theo contract và alt song ngữ; keyboard
  focus không bị mất khi virtual window thay đổi.

Không tuyên bố historical browser report là current runtime PASS nếu source/hash
không được đối chiếu. Current route/test ownership xem tại
`tests/site/site.e2e.cjs`, `tests/site/advertising-products-*.test.mjs` và
`tests/worker/advertising-detail-route.test.mjs`.

## Verification commands

```powershell
pnpm prepare:site
pnpm qa:static
pnpm qa:site
pnpm qa:cross-browser
```

`pnpm dev` phục vụ preview tại `http://127.0.0.1:8787/`. UI release còn cần
browser/DevTools evidence theo [tests README](../../tests/README.md); guide này
không biến static preview thành deploy evidence.

## Chú thích thuật ngữ

- **Coordinator**: runtime điều phối lifecycle của module khác.
- **Renderer**: hàm chuyển data/layout thành HTML output.
- **Virtualization**: chỉ mount vùng item cần thiết quanh viewport.
- **Progressive enhancement**: giữ behavior native trước, thêm capability khi dependency sẵn sàng.
- **Leaf node**: node cuối chứa text hoặc attribute cần dịch.
- **Fail-open**: lỗi motion/enhancement không làm content biến mất.
