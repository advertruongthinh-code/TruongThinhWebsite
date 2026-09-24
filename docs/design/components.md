---
title: Component và reuse reference
type: design
status: living
updated: 2026-09-09
related_docs:
  - index.md
  - patterns.md
  - ../../DESIGN.md
  - ../specs/frontend-route-and-content.md
  - ../specs/advertising-products-turnkey-services.md
---

# Component và reuse reference

Đây là reference cho các entrypoint reuse có thật trong current source. `current`
và `observed` ở đây chỉ implementation được đọc từ source/test; chúng không tự
trở thành accepted design target. Exact token/role thuộc
[`DESIGN.md`](../../DESIGN.md).

## Public shell static markup

Visual target: [Brand lockup](../../DESIGN.md#brand-lockup--nguồn-chuẩn).
Reuse guide này chỉ giữ DOM/source/lifecycle, không định nghĩa lại geometry hoặc màu.


**Status:** current/observed static markup; route semantics đối chiếu frontend spec.

**Source và consumer:** Header, full-menu, CTA và footer được lặp trong năm HTML
entrypoint; visual behavior ở `src/site/style.css`, runtime ở
`src/site/motion.js`. Regression ở `assertBrandShellSourceContracts()` và
`runBrandShellFocusedChecks()` trong [`tests/site/site.e2e.cjs`](../../tests/site/site.e2e.cjs).

**Input/DOM:** `[data-site-header]`, các surface `[data-header-tone]`, `[data-menu-open]`,
`[data-menu-close]`, `#site-menu [data-language-option]`,
`[data-scroll-container]`, `.route-veil`, `.floating-cta`. Header giữ direct
canonical route; locale control thuộc full-menu.

**Output và ví dụ:** cùng class/data hooks, route-local content và shared CSS;
không có `Header`/`Footer`/`Shell` import API.

```html
<header class="site-header" data-site-header>
  <a id="header-logo" class="brand" href="/" aria-label="Trường Thịnh — Trang chủ">TRƯỜNG THỊNH</a>
  <nav id="header-menu-items" class="desktop-nav" aria-label="Điều hướng chính">
    <ul><li><a href="/vi/residential/">Không gian Nhà ở</a></li></ul>
  </nav>
  <button id="header-menu-toggle" class="menu-button" type="button"
    aria-label="Mở menu" aria-expanded="false" aria-controls="site-menu" data-menu-open>
    Mở menu
  </button>
</header>
<a class="floating-cta" href="https://zalo.me/" target="_blank" rel="noreferrer"
  aria-label="Gọi Zalo tư vấn">Gọi Zalo tư vấn</a>
<dialog class="site-menu" id="site-menu" aria-label="Menu Trường Thịnh">
  <div class="menu-inner">
    <div class="menu-head">
      <a class="menu-brand" href="/vi/" aria-label="Trường Thịnh — về trang chủ">Trường Thịnh</a>
      <div class="menu-language" role="group" aria-label="Chọn ngôn ngữ">
        <a href="/vi/" data-language-option="vi" lang="vi">Tiếng Việt</a>
        <a href="/en/" data-language-option="en" lang="en">English</a>
      </div>
      <button class="menu-close" type="button" aria-label="Đóng menu" data-menu-close>Đóng menu</button>
    </div>
    <nav class="menu-nav" aria-label="Menu toàn trang"><a class="menu-group__title" href="/vi/about/">Về chúng tôi</a></nav>
  </div>
</dialog>
<div class="page-shell" data-scroll-container data-barba="container" data-barba-namespace="home">
  <main id="noi-dung">
    <section class="hero detail-hero" data-header-tone="inverse" aria-labelledby="page-title">
      <h1 id="page-title">Tiêu đề route</h1>
    </section>
  </main>
  <footer class="site-footer" id="lien-he" data-header-tone="ink">Liên hệ</footer>
</div>
```

`data-header-tone` thuộc section/figure/footer cần điều khiển tone; source hiện
không đặt attribute này lên `header`.

**Trạng thái:** tone trắng/tối; expanded/collapsed/hidden/route-pinned/focus-within;
menu closed/open/closing; VI/EN; desktop/tablet/mobile; normal/reduced-motion/
motion-fallback; social enabled/disabled placeholder.

**A11y/i18n/responsive:** dialog trả focus, control keyboard/touch, focus visible,
leaf `data-en`, `data-en-aria-label`, không lặp locale control; mobile dùng native
scroll. Reduced motion giữ content visible và bỏ transition không thiết yếu.

**Lifecycle/cleanup:** `motion.js` sở hữu route veil, menu, locale, BFCache và
scroll lifecycle. Khi sửa cleanup, tìm internal `mountPage()`/`unmountPage()`,
Barba hooks và listener `pageshow` trong [motion.js](../../src/site/motion.js).
Đây không phải export cho caller ngoài. Không có mount API độc lập; chỉ thêm
sau architecture decision đã được chấp nhận.

**Customization boundary:** route content và shell tone đã duyệt có thể thay đổi;
class contract, locale ownership, semantics header/menu và cấu trúc footer giữ
chung.

## Advertising layout core

**Status:** current pure runtime API, observed implementation và validation
contract trong source/test. Accepted geometry target phải đến từ spec/decision,
không suy ra từ source.

**Source:** [`layout-core.mjs`](../../src/site/advertising-products/layout-core.mjs);
consumers `catalog-runtime.mjs`, layout/lifecycle tests.

**Input/output API:**

| API | Input | Output |
| --- | --- | --- |
| `advertisingSpacing(width)` | viewport width hữu hạn, dương | `{ outer, interCardGap }` |
| `columnsForWidth(width)` | viewport width hữu hạn, dương | số cột trong giới hạn |
| `validateAdvertisingCards(cards, options)` | cards, `categoryOrder`, cờ rank/non-empty | cards gốc hoặc throw |
| `compileAdvertisingLayout(options)` | `layoutViewportWidth`, `filter`, `cards`, `categoryOrder`, `datasetVersion`, `columns` tuỳ chọn | geometry, placements, total height, `coordinateHash` deterministic |
| `getVirtualWindow(layout, options)` | layout, `scrollTop`, `viewportHeight`, `overscan` | `{ items, totalHeight }` |

Validator reject input không phải array/rỗng khi được yêu cầu, ID sai/trùng,
category không biết, source order trùng, kích thước media/canvas sai,
`span`/fixed `ratio` không hỗ trợ, fit mode sai và rank không liên tục/không
canonical. Core throw khi viewport/columns/filter/virtual-window input sai.

**Ví dụ:** `catalog-runtime.mjs` gọi `compileAdvertisingLayout({
layoutViewportWidth, filter, cards, categoryOrder, datasetVersion })`, rồi gọi
`getVirtualWindow(geometry, { scrollTop, viewportHeight: innerHeight, overscan:
innerHeight })`.

Ví dụ chạy với data canonical hiện có, không tự tạo card hoặc generated artifact:

```powershell
node --input-type=module -e "import { ADVERTISING_CARDS, ADVERTISING_CATEGORIES, compileAdvertisingLayout } from './src/site/advertising-products/catalog.mjs'; import { validateAdvertisingCards } from './src/site/advertising-products/layout-core.mjs'; const categoryOrder=ADVERTISING_CATEGORIES.map(({slug})=>slug); validateAdvertisingCards(ADVERTISING_CARDS,{categoryOrder,requireRanks:true}); const layout=compileAdvertisingLayout({layoutViewportWidth:1280,filter:'all'}); console.log({categories:categoryOrder.length,cards:ADVERTISING_CARDS.length,placements:layout.placements.length,columns:layout.columns,totalPixelHeight:layout.totalPixelHeight,coordinateHash:layout.coordinateHash});"
```

Lệnh này kiểm tra import, validator và wrapper compile bằng data source hiện có;
giá trị `coordinateHash` do runtime tính, không ghi cứng vào guide.

**A11y/responsive:** core không đọc DOM; runtime thêm list semantics,
`aria-posinset`, `aria-setsize`, keyboard frontier recovery và cột responsive.
Reduced motion chỉ ảnh hưởng transition runtime, không đổi geometry deterministic.

**Customization boundary:** caller có thể chọn filter/viewport và columns tuỳ chọn
cho scenario đã kiểm chứng; không bypass validator, đổi placement order hoặc
invent rule geometry riêng route.

## Advertising catalog runtime

**Status:** current static catalog runtime; source/data contract là observed,
không tự nhận accepted chỉ vì có test.

**Source/consumer:** [`catalog-runtime.mjs`](../../src/site/advertising-products/catalog-runtime.mjs)
được `detail.js` import và điều phối; browser focused functions gồm
`runAdvertisingGridFocusedChecks`, `runAdvertisingKeyboardVirtualizationCheck`,
`runAdvertisingMediaFocusedChecks` và `runAdvertisingLocaleLifecycleChecks`.

**Input:** Barba container `[data-barba-namespace="advertising-products"]` tuỳ
chọn và `{ signal }`; `catalog-artifact.mjs` generated; filter
`[data-advertising-filter]`; grid `[data-project-grid]`.

**Output/lifecycle:** `mountAdvertisingCatalog(container?, { signal }?)` là hàm
async và trả `Promise<cleanup function>`. Hàm validate artifact version,
category/card, mount filter/grid/Masonry, lazy media, virtualization và listener.
`unmountAdvertisingCatalog()` gọi cleanup active; browser bridge là
`window.TruongThinhAdvertising = { mount, unmount }`.

**Trạng thái:** filter query all/category; full/virtual window; media
pending/loaded/revealed; dependency ready/failure; VI/EN; direct load,
Barba/history remount, resize, scroll và abort cleanup.

**Errors/fallback:** mount reject khi artifact version, category/card data hoặc
Masonry không hợp lệ. Markup card static/no-script còn đó cho tới khi mount hợp
lệ thay thế. Media replay được arm lại sau khi rời viewport; cleanup idempotent
và xoá observer/listener/timer do runtime sở hữu.

**A11y/i18n/responsive:** filter `aria-current`, card link/alt/caption generated
theo leaf data, list item semantics, DOM bounded và keyboard Tab recovery qua
virtual frontier. Reduced motion reveal media ngay và bỏ Masonry transition.

**Ví dụ:** `detail.js` chờ `ensureAdvertisingDependencies()`, import module rồi
return `mountAdvertisingCatalog(container, { signal: abort.signal })`; caller lưu
Promise nhận được vào `state.catalogReady`.

**Customization boundary:** đổi taxonomy/media qua `catalog.mjs` và
`media-manifest.mjs`; không sửa generated artifact, card list trong runtime HTML
hoặc bypass pure layout core.

## Build-time Advertising detail renderer

**Status:** current internal renderer; không phải component library hoặc runtime API.

**Source:** `renderDetailComposition(category, products)` trong
[`prepare-static-assets.mjs`](../../scripts/site/prepare-static-assets.mjs),
template [`detail-template.html`](../../src/site/advertising-products/detail-template.html),
data `catalog.mjs`.

**Input/output:** category detail layout, source ID, copy category song ngữ và
product list đi vào; composition `<main>` dùng chung và
`/{locale}/advertising-products/{slug}/index.html` generated đi ra. Block hợp lệ
gồm `titular`, `paragraph`, `facts`, `gallery`, `single`, `double`, `columns`,
`banner`; sáu route variant là data/layout, không phải sáu renderer.

**Ví dụ:** generator lặp `ADVERTISING_CATEGORIES`, resolve hero/source ID, render
product rồi thay `{{composition}}` trong template dùng chung.

**Errors/fallback:** thiếu hero hoặc section media không resolve thì throw; layout
kind sai bị catalog validation reject. Không có runtime empty renderer; build phải
fail trước khi output được chấp nhận. Generated `.site-output/` không phải edit
target.

**A11y/i18n:** renderer tạo title/statement/alt/caption song ngữ, semantic
product list, `aria-label`/`data-en-aria-label`, kích thước intrinsic và lazy
media. Reduced motion do detail runtime xử lý sau render.

**Customization boundary:** sửa data/layout schema trong catalog/spec sở hữu;
không thêm template copy riêng route hoặc block HTML/CSS tuỳ ý.

Ví dụ block gallery có thật trong `ADVERTISING_DETAIL_LAYOUTS`, dùng đúng schema
và source ID hiện có:

```js
{
  kind: "gallery",
  sourceIds: [
    "imagegen:2026-09-01:kiosk-posm:06",
    "imagegen:2026-09-01:kiosk-posm:07",
    "imagegen:2026-09-01:kiosk-posm:08",
    "imagegen:2026-09-01:kiosk-posm:09",
    "imagegen:2026-09-01:kiosk-posm:10",
    "imagegen:2026-09-01:kiosk-posm:11",
    "imagegen:2026-09-01:kiosk-posm:12",
    "imagegen:2026-09-01:kiosk-posm:13",
    "imagegen:2026-09-01:kiosk-posm:14",
    "imagegen:2026-09-01:kiosk-posm:15",
    "imagegen:2026-09-01:kiosk-posm:16",
    "imagegen:2026-09-01:kiosk-posm:17",
  ],
}
```

Để thêm hoặc đổi gallery, sửa block tương ứng trong
`src/site/advertising-products/catalog.mjs`, giữ mỗi source ID thuộc đúng slug
và partition pool đúng một lần. Không chép block thành layout thứ hai và không
sửa `.site-output/`. Kiểm tra contract bằng
`node --input-type=module -e "import { ADVERTISING_DETAIL_LAYOUTS } from './src/site/advertising-products/catalog.mjs'; console.log(ADVERTISING_DETAIL_LAYOUTS['kiosk-posm'].sections.find(({kind})=>kind==='gallery'));"`
và test tập trung trong `tests/site/advertising-products-static.test.mjs` hoặc
`tests/site/site.e2e.cjs` theo consumer bị chạm.

## Generic detail gallery

**Status:** current DOM pattern; không có module export độc lập.

**Source/DOM:** `detail.js` mount `[data-gallery]`, `[data-gallery-track]`,
`[data-gallery-prev]`, `[data-gallery-next]`; CSS nằm trong `detail.css`. Consumer
là `window.TruongThinhDetail.mount()`.

**Behavior/ví dụ:**

```html
<section data-gallery>
  <button data-gallery-prev aria-label="Ảnh trước"></button>
  <div data-gallery-track>...</div>
  <button data-gallery-next aria-label="Ảnh sau"></button>
</section>
```

Button gọi scroll `0.82 * track.clientWidth`; pointer drag dùng primary pointer,
native touch scroll vẫn có; scroll-snap và overflow giữ rail dùng được. Image
drag bị tắt.

**States/errors:** idle, dragging, snapped, reduced-motion. Track là bắt buộc:
source hiện dereference track; thiếu track là lỗi contract chứ không phải no-op.
Hai button là tuỳ chọn. Pattern không fetch dependency và không có enhanced
fallback.

**A11y/i18n/cleanup:** button cần accessible name đã bản địa hoá; media trong
figure cần alt VI/EN; reduced motion dùng instant scroll. Mọi listener dùng page
`AbortSignal`; detail unmount abort listener của page.

**Customization boundary:** chỉnh item content/media qua route contract; giữ track
hook, native fallback, control focusable và cleanup.

## Advertising detail carousel

**Status:** dormant; Advertising photo view đã thay entrypoint carousel cũ.
Owner yêu cầu ngày 24/09/2026 giữ source để thiết kế lại carousel cho Residential
và Commercial. Hướng mới có thể khác Espacio; chưa activate hoặc đổi UI trong
release này. Runtime chỉ tải Swiper khi có markup carousel tương ứng.

**Source/DOM:** renderer tạo `[data-advertising-carousel]`,
`[data-advertising-carousel-viewport]`, `[data-advertising-carousel-track]`,
`[data-advertising-carousel-pagination]` và
`data-advertising-carousel-state="native"`. `detail.js` tải Swiper 14.2.0
module Mousewheel/Pagination/A11y qua local vendor path đã pin.

**Output/states:** state đổi native → enhanced sau khi module sẵn sàng;
`autoHeight`, `slidesPerView: auto`, drag cursor, axis-aware wheel, pagination và
watchOverflow. Failure reset/giữ native state. Reduced motion dùng speed `0`;
normal motion dùng transition hiện có trong source.

**A11y/i18n/cleanup:** Swiper A11y được bật; label carousel có attribute VI và EN;
ảnh giữ alt pair và không native image drag. Detail unmount destroy mọi carousel
và abort listener của page.

**Customization boundary:** data chọn block/source list; runtime sở hữu
enhancement và fallback. Không gộp API này với `[data-gallery]` generic hoặc bỏ
qua native state khi vendor module lỗi.

## Media control state — extract 24/09/2026

Nút mở ảnh primary, đóng viewer và các nút điều khiển viewer dùng chung
`--media-control-hover` và `--media-control-active` từ `style.css`.
Giá trị normative thuộc `DESIGN.md`; `detail.css` chỉ consume token.
Giữ nguyên geometry, focus ring, trạng thái disabled và reduced motion.
Không áp lên nút gợi ý có ảnh vì contract overlay của chúng khác.

## Chú thích thuật ngữ

- **Pure core**: hàm chỉ phụ thuộc input, không đọc DOM hoặc global runtime.
- **Promise cleanup**: mount async hoàn tất rồi trả hàm cleanup trong Promise.
- **Progressive enhancement**: native behavior chạy trước, enhancement chỉ thêm khi sẵn sàng.
- **Virtual frontier**: ranh giới item chưa mount nhưng vẫn phải đi qua bằng keyboard.
- **DOM contract**: selector/data attribute và semantics consumer phải cung cấp.
