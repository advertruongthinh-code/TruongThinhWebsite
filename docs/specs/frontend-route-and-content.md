---
title: Contract route và content
type: frontend
status: accepted
updated: 2026-09-28
notion: none
related_decisions:
  - ../decisions/head-office-address-confirmed.md
related_reports: []
---

# Đặc tả route Trường Thịnh

## Scope

- Root repository `/` là canonical.
- Public route chuẩn: `/vi/`, `/vi/residential/`, `/vi/commercial/`,
  `/vi/advertising-products/`, `/vi/about/`; `/en/` có hierarchy tương đương.
  Sáu slug Advertising `/{locale}/advertising-products/{slug}/` là compatibility
  entrypoint, chuyển sang parent với `?category={slug}` theo
  [AD-BROWSE-R1](advertising-photo-browse.md). Photo detail dùng query `photo`,
  optional `tag`, trên parent canonical.
  `/{locale}/projects/:slug/` là contract CMS tương lai, chưa thuộc static runtime.
- Mọi route dùng cùng header, full menu, footer, VI/EN switch, Zalo CTA và motion
  system.
- Cấu trúc và nhãn full menu theo [content guide](../../design-system/content.md#gallery-và-card);
  route và query phải giữ canonical locale, không dùng fragment navigation.
- Dùng copy riêng của Trường Thịnh và image local/generated. Reference chỉ cung
  cấp nhịp layout, storytelling và motion; không copy source hoặc media.
- Mọi thay đổi copy/media phải theo
  [`CONTENT-MEDIA-GUIDE.md`](../../design-system/content.md).

## Contract dùng chung

| File | Trách nhiệm |
| --- | --- |
| `style.css` | Token, typography, header/menu/footer, home section, responsive |
| `motion.js` | VI/EN, route veil, header state, smooth scroll, hero, menu |
| `detail.css` | Layout cho child/detail page |
| `detail.js` | Detail reveal, horizontal gallery, điều phối catalog lifecycle |
| `advertising-products/catalog-runtime.mjs` | Grid/filter, virtualization và media replay |

Child page load `../style.css`, `../detail.css`, `../motion.js` và
`../detail.js`. Runtime này chờ dependency rồi mount catalog; grid/filter thuộc
`catalog-runtime.mjs`, không thuộc generic gallery. Không nhân bản shared logic
vào từng route. Reuse contract ở [mục dưới](#reuse-contract).

Sáu category detail composition cũ đã được
[AD-BROWSE-R1](advertising-photo-browse.md) supersede bằng photo browse tại
parent route. [Decision shared template](../decisions/shared-advertising-product-detail-template.md)
giữ provenance lịch sử, không là sáu template đang chạy. Không copy reference
source hoặc media.

## Edit content và media

[Content & media guide](../../design-system/content.md) là canonical
contract cho:

- leaf VI/EN, heading, hero motto và motion hook;
- số lượng card/gallery có thể thay đổi mà không hard-code JavaScript;
- story và image directory riêng cho `/vi/advertising-products/`,
  `/vi/commercial/`, `/vi/residential/`;
- WebP/sRGB, pixel thật, alt song ngữ, loading, safe crop và budget;
- advertising filter metadata và upload/QA checklist.
- cấu trúc/copy full menu theo mục nguồn chuẩn trong content guide.

Gallery/project collection có thể thêm hoặc bớt item bằng cách clone trọn
`figure`. Cụm `.service-portals` vẫn là pattern ba mục; đổi số portal là
thay đổi layout/motion và phải được giao riêng.

## Narrative theo route

[Route narrative](../../design-system/content.md#mạch-nội-dung-theo-route) giữ story/copy;
surface briefs tại `.impeccable/surfaces/` giữ mode và intent của từng surface.

## Contract quy trình

[Product process](../../PRODUCT.md) và [content guide](../../design-system/content.md)
sở hữu thứ tự/copy quy trình; không định nghĩa lại ở route spec.

## Advertising products routes

- Parent canonical là `/{locale}/advertising-products/`; sáu compatibility slug dùng
  `/{locale}/advertising-products/{slug}/` với `kiosk-posm`, `mobile-retail`,
  `signage-raised-letters`, `office-signs-wayfinding`,
  `led-displays-lightboxes`, `print-decals`.
- Generator `scripts/site/prepare-static-assets.mjs` tạo HTML compatibility với
  canonical parent và `location.replace` sang category. Test phải chờ URL đích;
  không gọi12 slug VI/EN là12 canonical detail template độc lập.

## Contract i18n

- Copy/attribute song ngữ theo [Leaf text và VI/EN](../../design-system/content.md#song-ngữ-vien).
- `<title>` dùng `data-en`; script trong `<head>` đặt `lang` sớm để giảm flash.
- Worker SSR locale/head trước response; `motion.js` điều hướng counterpart
  locale, giữ query/vị trí đọc và loại fragment. `localStorage` chỉ fallback
  ngoài canonical Worker.
- Copy nhìn thấy, label, title, alt, description và aria đều phải có cặp VI/EN
  nếu nội dung khác nhau.

## Contract motion

[Motion design system](../../design-system/motion.md#shell) sở hữu timing/state.
Runtime integration và test phải ref contract đó; không định nghĩa timeline thứ hai.

## Định hướng image

[Content/media guide](../../design-system/content.md#chuẩn-file-ảnh) sở hữu image policy;
[Design System](../../design-system/README.md) giữ palette và image grammar.

## Owner fact và content placeholder

[Owner facts](../../design-system/content.md#song-ngữ-vien) dẫn
product/decision canonical. Route không tự tạo bản sao fact hoặc placeholder policy.

## Acceptance

- Typography portal/hero theo [design system](../../design-system/README.md#typography).
- Heritage inline image còn khoảng thở dọc ở mọi breakpoint.
- Menu, filter, gallery, route link, Zalo CTA và back-to-top dùng được bằng bàn
  phím/touch.
- Không horizontal overflow tại 320, 390, 768, 1024 và 1440 px.
- Console và network sạch; landmark, heading hierarchy và focus hợp lệ.
- VI/EN đổi và giữ qua reload.
- Playwright check nằm trong `tests/site/`; report ở `tests/site/reports/`.
- Visual/a11y/console/network được inspect bằng Chrome DevTools trước release.

## Reuse contract

DOM hook, lifecycle và ranh giới tùy biến của phần dùng chung; visual ở
[Design System](../../design-system/README.md).

### Shell tĩnh

Visual target: [Brand lockup](../../design-system/components/BrandLockup/README.md).
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

### Gallery ngang detail

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

## Chú thích thuật ngữ

- **i18n**: internationalization, cấu trúc để hỗ trợ nhiều locale.
- **SSR**: render nội dung ở server/Worker trước khi browser nhận response.
- **BFCache**: browser back-forward cache dùng để khôi phục document nhanh.
- **Leaf node**: node cuối chứa text hoặc attribute song ngữ.
- **Breakpoint**: ngưỡng viewport làm layout chuyển state.
- **Canonical route**: URL chuẩn được dùng làm đích public và SEO.
- **DOM contract**: selector/data attribute và semantics consumer phải cung cấp.
