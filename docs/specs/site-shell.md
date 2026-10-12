---
title: Shell website
status: live
source:
  - src/site/motion.js
  - src/site/style.css
  - src/site/assets/brand/**
tests:
  - tests/site/site.e2e.cjs
  - tests/site/site-static-contract.cjs
  - tests/site/shared-header-*.mjs
  - tests/site/menu-reference-parity.e2e.mjs
  - tests/site/scrollbar-parity.e2e.mjs
  - tests/site/footer-consistency.e2e.mjs
  - tests/site/mobile-*.mjs
  - tests/site/cross-browser.smoke.spec.cjs
  - tests/site/logo-route-crossfade.e2e.mjs
notion: https://app.notion.com/p/3ef332849a0e8100bbd1e62ad5229067
updated: 2026-10-12
---

# Shell website

## Mục đích

Shell là phần chung của năm trang VI/EN: header, brand lockup, full menu, footer, floating CTA, đổi
ngôn ngữ, route veil, smooth scroll, scrollbar, layout mobile toàn site (`src/site/motion.js`,
`src/site/style.css`). Markup shell lặp trong năm HTML trang; file HTML, motion nội dung trang và
Advertising thuộc spec trang; build, vendor thuộc [phát hành tĩnh](static-release.md).

## Hành vi

### R1. Markup chung và thứ tự lớp

Mỗi trang có `header.site-header[data-site-header]` (link `#header-logo.brand` chứa
`svg.brand-lockup` inline, `nav#header-menu-items` ba link, nút `[data-menu-open]`), `.route-veil`,
`a.floating-cta`, `dialog#site-menu` có nút `[data-menu-close]`, và footer trong container Barba.
Thiếu header, veil, menu hoặc hai nút thì `motion.js` dừng trước khi claim nên trang vào fallback
(R7). Lớp từ trên xuống: menu (top layer), thumb `.c-scrollbar`, header, route veil, floating CTA,
nội dung. Header, floating CTA và menu tồn tại qua route mềm (R6).

```gherkin
Given trang 1440px đã cuộn, header và floating CTA đang hiện
When mở full menu rồi đóng
Then lúc mở menu phủ header, scrollbar và CTA; sau khi đóng thumb scrollbar nằm trên header
```

### R2. Header: tone, thu gọn, lockup và nav desktop

Cuộn quá 100px thì header `is-collapsed` (nền trắng, viền). Header ink khi thu gọn, khi đang
chuyển route, hoặc khi section dưới điểm dò `scrollY + min(80px, 12% chiều cao cửa sổ)` có
`data-header-tone="ink"`; còn lại trắng. Màu chữ, hamburger tween ngắn, đổi ngay ở lần vẽ đầu và
khi reduced motion. Đổi trạng thái thu gọn thì lockup chạy FLIP scale; màu mark theo
[state machine](../../design-system/brand.md#state-machine-màu) (class `is-brand-*`). Nav desktop
ẩn (`is-space-hidden`, `inert`, `aria-hidden`) khi breakpoint ẩn danh sách (≤750px), khi xuống
dòng, bị cắt hoặc chạm logo, nút menu; đo lại khi resize, đổi ngôn ngữ, font tải xong.

```gherkin
Given /en/residential/ ở 920px, ba link nav không vừa một dòng
When trang đo layout
Then nav có inert và aria-hidden, header một hàng, logo và nút menu vẫn hiện
```

### R3. Header ẩn khi cuộn xuống, hiện khi cuộn lên

Header chỉ ẩn trong vùng `0.5 × viewport < scrollY < pageHeight - 1.25 × viewport`
([motion](../../design-system/motion.md#shell)): trong vùng, cuộn xuống quá 150px tính từ chỗ đổi
chiều thì header `is-hidden`, cuộn lên quá 150px thì hiện; ngoài vùng (đầu và cuối trang) hiện
ngay. Đang chuyển route, menu mở hoặc `pageshow` thì header hiện. Chuột thật (`any-hover: hover`
và `any-pointer: fine`) lên vùng 350px trên cùng màn hình thì header hiện; focus trong header cũng
giữ hiện. Điện thoại cảm ứng chạy [header đi theo ngón tay](phone-header-scroll.md) thay cho R3.

```gherkin
Given trang dài đã cuộn quá nửa cửa sổ và header đang ẩn
When cuộn tới cách cuối trang chưa tới 1,25 lần chiều cao cửa sổ
Then header hiện; cuộn ngược về giữa trang rồi xuống quá 150px thì header ẩn lại
```

### R4. Full menu

`[data-menu-open]` gọi `showModal`, thêm `body.menu-open` (khóa cuộn nền), `aria-expanded`, dừng
smooth scroll, chạy timeline mở, thu nhỏ trang phía sau rồi focus nút đóng. Escape hoặc
`[data-menu-close]` chạy ngược timeline, đóng dialog, chạy lại smooth scroll, giữ vị trí cuộn, focus
về nút mở (trừ khi đang chuyển route), phát `site:menu-closed`; tween treo thì đóng sau 1,75s. Không
mở khi route đang chạy; reduced motion hoặc thiếu GSAP: trạng thái cuối ngay. Menu có brand, ngôn
ngữ (R5), CTA Zalo `.menu-appointment` (cùng href floating CTA, trước nút đóng), bốn nhóm link, cột
4/3/2/1 theo breakpoint, vùng link cuộn riêng. Click link thường đóng menu, đi route. Dialog
đóng dùng `display: none` mặc định của `dialog` để Layout đầu trang bỏ qua menu (`content-visibility: hidden`
làm Chromium crash khi đóng menu lúc `motion.js` lỗi).

```gherkin
Given trang 390px đã cuộn tới giữa
When mở menu, vuốt trong vùng link, rồi nhấn Escape
Then nền không cuộn theo, Tab chỉ đi trong menu; đóng xong vị trí cuộn giữ, focus về nút mở
```

### R5. Đổi ngôn ngữ và ghi nhớ

Click thường vào `[data-language-option]`: đóng menu, veil phủ và mở như R6, không tải lại;
`history.replaceState` sang `/<locale>/...` (không thêm entry), đặt `lang`, `data-route-locale`, đổi chữ
`data-en`/`data-vi` và `aria-label`, `alt`, `content`, dựng lại SplitText, đổi link nội bộ, canonical,
alternate, `og:locale`, `og:url`, giữ vị trí cuộn, lưu `localStorage['tt-lang']`, phát `languagechange`.
Khi tải, locale theo `data-route-locale`, thiếu thì theo `tt-lang`. Fallback (R7) đổi ngôn ngữ bằng
`location.assign`, lưu vị trí cuộn vào `sessionStorage`, khôi phục khi tải.

```gherkin
Given /vi/residential/ đã cuộn 1200px
When mở menu và chọn EN
Then URL thành /en/residential/, history không thêm entry, vị trí cuộn giữ, reload vẫn là EN
```

### R6. Route mềm và click trong shell

Barba (transition `persistent-shell`, timeout 15s) xử lý link nội bộ. Điều hướng native khi: chọn ngôn
ngữ, khác origin, path `/admin`, `/api`, `/assets`, `/media`, `/downloads`, có `target`, `download`,
phím modifier. Mọi route trong site, cả About, giữ header, không chạy intro. Luồng: pin header (ink,
mark crossfade sang CMYK theo [logo crossfade](logo-route-crossfade.md), hiện); menu đóng đồng thời veil phủ; `syncDocumentState` đồng bộ title, meta, canonical,
alternate, JSON-LD, `lang`, locale, class body, cây phần tử header (trừ underlay, lớp fade và class `is-brand-*` của mark), CTA, menu;
lệch số con hoặc request lỗi thì `location.assign`; response 404 là trang 404 của site vẫn đi route mềm (Back về 404). Vào trang: mount, đặt vị trí cuộn (R8), gỡ veil.
Link đúng URL hiện tại, link `aria-disabled` bị chặn; `.brand` cùng document cuộn về đầu; click lại
navbar hoặc tiêu đề menu của Residential, Commercial, Advertising (không `photo`) cuộn về 0, không thêm
history ([detail R10](advertising-detail.md#r10-navbar-và-escape-trên-detail)).

```gherkin
Given /vi/ ở 1440px
When click Residential trên navbar
Then veil phủ rồi gỡ, URL thành /vi/residential/ không tải lại document, header vẫn là phần tử cũ
```

### R7. Veil khi tải trực tiếp, fallback và bfcache

Head script thêm `html.route-enter` khi không reduced motion: veil trắng phủ từ khung đầu ở mọi lần
tải trực tiếp (link, reload, Back/Forward không qua bfcache). `motion.js` mount trang rồi gỡ veil;
mount không xong thì gỡ ngay; mount lỗi thì trang khác Advertising tải lại, Advertising báo lỗi riêng.
`window.__ttMotionBoot`: `motion.js` gọi `claim()`, `release()` sau hai khung; script lỗi hoặc chưa
claim tại `DOMContentLoaded` thì `fail()`: thêm `motion-fallback`, bỏ `route-enter`, mount nội dung
settled, nối menu mở, đóng, Escape tối thiểu; CSS fallback ẩn veil, hiện header, nội dung, reveal.
Veil che cả header từ khung đầu; mount xong veil mờ như chuyển trang (`playRouteEnter`), rồi intro header chạy một lần,
kết thúc đúng trạng thái theo vị trí cuộn (quá 100px là `is-collapsed`, R2), cùng entrance. Route mềm giữ header trên veil.
Mạng chậm giữ veil tới khi mount xong, không mốc thời gian từ `<head>`. Trang từ bfcache: đóng menu, gỡ veil.

```gherkin
Given motion.js không tải được
When mở /vi/about/ trực tiếp
Then tại DOMContentLoaded có motion-fallback, không còn route-enter, nội dung hiện, menu dùng được
```

### R8. Scroll và history

`history.scrollRestoration = "manual"`. Locomotive smooth chỉ chạy khi cửa sổ từ 981px, không
reduced motion, menu đóng, có thư viện; còn lại scroll native. Mọi trang dùng chung cấu hình này, parallax chỉ ở hero
([cảm giác cuộn](scroll-feel.md)). Qua 981px hai chiều thì hủy, dựng lại, giữ logical scroll tức thì (không theo
`scroll-behavior: smooth`), nên kéo cửa sổ nhanh qua lại mốc này không về đầu trang. Route mềm: Back/Forward khôi phục
vị trí đã nhớ theo index history; điều hướng mới về 0. Tải trực tiếp: URL bỏ hash, giữ vị trí trình duyệt hoặc vị trí lưu khi đổi ngôn
ngữ. `scroll-padding-top` của `html` bằng hàng header cộng gutter để focus, anchor không bị che.

```gherkin
Given /vi/ cuộn 1500px rồi sang /vi/residential/ bằng route mềm
When nhấn Back
Then trang chủ hiện lại ở 1500px; đi link mới thì trang đích bắt đầu ở 0
```

### R9. Scrollbar

Khi Locomotive chạy: một scrollbar overlay `.c-scrollbar`, document không có gutter; thumb ẩn lúc
nghỉ, hiện khi hover sát mép phải hoặc khi cuộn. Kéo thumb tới mép dưới chạm đúng giới hạn cuộn,
lên mép trên về 0; menu mở giữa lúc kéo thì dừng kéo, giữ vị trí; cuộn bị khóa thì thumb không nhận
kéo. Mỗi route, ngôn ngữ, Back chỉ có một `.c-scrollbar`. Dưới 981px, reduced motion, fallback:
scrollbar native mặc định, app không style scrollbar document. Rail ngang (`.editorial-strip`,
`.project-track`, `.detail-gallery__track`, `.project-filters`) ẩn thanh ngang, vẫn kéo, vuốt được.

```gherkin
Given /vi/about/ ở 1440×900
When kéo thumb xuống mép dưới cửa sổ
Then logical scroll bằng giới hạn cuộn (sai số 1px); ở 390px không có .c-scrollbar
```

### R10. Floating CTA và footer

Floating CTA (Zalo, href `https://zalo.me/0949131050`) có `.show` khi `scrollY` tới một chiều cao cửa sổ
hoặc trong 1,75 chiều cao cửa sổ cuối trang, trượt vào từ phải; từ 750px trở xuống là nút vuông chỉ
icon; Advertising browse ẩn nó. Footer `#lien-he` (`data-header-tone="ink"`) giống hệt ở năm trang:
địa chỉ, Hotline và Văn phòng dạng `+84` link `tel:` ([PRODUCT](../../PRODUCT.md)), ba icon Facebook, TikTok, YouTube
chưa có URL nên `role="link"`, `aria-disabled="true"`, `tabindex="-1"`, không `href`; dòng bản quyền. Khoảng trên footer là `--footer-top-gap`; footer gọn
khi rộng tới 750px hoặc cao tới 640px ([CTA giữa viewport](advertising-cta-center-parallax.md)).

```gherkin
Given trang chủ 1440px dài nhiều màn hình
When cuộn từ đầu tới giữa rồi tới cuối trang
Then floating CTA hiện ở màn đầu, ẩn ở giữa, hiện lại gần cuối; Tab bỏ qua icon footer
```

### R11. Viewport ổn định khi thanh địa chỉ đổi

`--site-layout-viewport-height` là `100vh`, từ 980px trở xuống `100svh`. Probe
`.site-viewport-metrics` (fixed, inert) đo token; `getViewportMetrics()` trả cỡ layout ổn định và
vùng nhìn thấy từ `visualViewport` (cỡ, offset, scale). Layout dùng chiều cao ổn định nên thanh địa
chỉ thu, mở không reflow; resize thật vẫn reflow. Runtime Advertising đọc số đo này cho primary và
viewer; CTA cuối Advertising cố ý dùng `dvh`.

```gherkin
Given detail Advertising trên 390×844
When chỉ chiều cao vùng nhìn thấy đổi 844 → 650px như khi thanh địa chỉ hiện
Then chiều cao primary không đổi; cửa sổ thật đổi chiều cao thì layout tính lại
```

### R12. Layout mobile toàn site

22 entrypoint (10 route chuẩn VI/EN, 12 trang tương thích) ở 320×568, 390×844, 838×331, 838×387,
844×390, cỡ chữ gốc 16px và 32px: document không tràn ngang quá 1px; chữ không bị cắt, ẩn hoặc ra
ngoài document; header, tiêu đề, filter không chồng nhau lúc đầu; mọi control trong rail filter tới
được; focus không bị header che. Gutter, hàng header đổi theo breakpoint ở `:root` của `style.css`.

```gherkin
Given bất kỳ entrypoint nào trong 22 ở 320×568, cỡ chữ gốc 32px
When trang dựng xong trên Chromium, Firefox hoặc WebKit
Then không có tràn ngang, chữ bị cắt hay header chồng tiêu đề
```

### R13. Reduced motion

`prefers-reduced-motion: reduce`: không veil, không smooth scroll, không FLIP lockup, màu header
đổi ngay, menu không timeline, CSS rút animation và transition về 0,01ms, `scroll-behavior: auto`.
Menu, route, đổi ngôn ngữ, scroll và history vẫn chạy đủ. Đổi preference khi trang mở: `motion-paused` theo ngay.

```gherkin
Given trình duyệt bật reduced motion
When tải /vi/, mở menu, chọn Residential
Then không có veil hay timeline menu, scroll native, trang Residential hiện đầy đủ
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| DOM hook | `[data-site-header]`, `.route-veil`, `#site-menu`, `[data-menu-open]`, `[data-menu-close]` | Bắt buộc để `motion.js` chạy |
| DOM hook | `[data-header-tone="ink"]`, `[data-language-option]`, `data-en`, `data-vi`, `data-route-locale` | Trang khai báo tone (R2), đổi ngôn ngữ (R5) |
| Class | `route-enter`, `motion-fallback`, `motion-enabled`, `motion-ready`, `menu-open`, `is-transitioning` | Trạng thái shell trên `html`, `body` |
| Hàm public | `window.TruongThinhMotion` (`getLogicalScroll`, `setLogicalScroll`, `lockLogicalScroll`, `unlockLogicalScroll`, `getViewportMetrics`); `window.__ttMotionBoot` (`claim`, `release`, `fail`, `fallback`) | Advertising runtime, test; head script (R7) |
| Event, storage | Phát `site:scroll`, `site:menu-closed`, `languagechange`, nghe `site:layout`; `localStorage['tt-lang']`, `sessionStorage['tt-locale-scroll:<path><search>']` | Module trang đồng bộ shell; ngôn ngữ, cuộn fallback |
| Token | `--site-layout-viewport-height`, `--header-row-height`, `--gutter`, `--footer-top-gap` | Layout shell |
| Phụ thuộc | `window.TruongThinhDetail`, `window.TruongThinhAdvertising` | Mount trang, adapter Advertising (spec trang) |

## UI

Component [Header](../../design-system/components/Header/README.md), [FullMenu](../../design-system/components/FullMenu/README.md),
[Footer](../../design-system/components/Footer/README.md), [FloatingCta](../../design-system/components/FloatingCta/README.md),
[BrandLockup](../../design-system/components/BrandLockup/README.md). Motion [shell](../../design-system/motion.md#shell),
[smooth scroll](../../design-system/motion.md#smooth-scroll-và-parallax), [full menu](../../design-system/motion.md#full-menu),
[logo](../../design-system/brand.md#motion). Layout, scrollbar, mobile: [Design System](../../design-system/README.md#layout).

## Kiểm tra

E2E cần preview và `BASE_URL`. `TT_E2E_*_ONLY=1` chạy một phần của `pnpm qa:site`.

| R | Test hoặc command |
| --- | --- |
| R1 | `pnpm qa:static`, `TT_E2E_BRAND_SHELL_ONLY`; thứ tự lớp chưa có test paint, hit-test |
| R2 | `TT_E2E_HEADER_ONLY`, `TT_E2E_HEADER_GEOMETRY_ONLY`, `TT_E2E_BRAND_COLOR_ONLY`, `TT_E2E_BRAND_LOCKUP_ONLY`, `TT_E2E_BRAND_HEADER_BBOX_ONLY`, `shared-header-single-line.e2e.mjs` |
| R3 | `shared-header-bottom-p7-1.e2e.mjs`, `TT_E2E_HEADER_ONLY` |
| R4 | `menu-reference-parity.e2e.mjs`, `shared-header-menu-p7.test.mjs`, `shared-header-menu-p7.e2e.mjs`, `TT_E2E_MENU_ONLY`; `cross-browser.smoke.spec.cjs` (mở, đóng menu khi `motion.js` lỗi) |
| R5 | `TT_E2E_LOCALE_ONLY`, `TT_E2E_LOCALE_SCROLL_ONLY`, `TT_E2E_LOCALE_MODES_ONLY`, `cross-browser.smoke.spec.cjs` |
| R6 | `logo-route-crossfade.e2e.mjs`, `not-found-routes.e2e.mjs`, `TT_E2E_HISTORY_ONLY`, `TT_E2E_P13_NAVBAR_ONLY`, `mobile-layout-parity.e2e.mjs --scope about-history` |
| R7 | `route-veil-header.e2e.mjs` (header dưới veil, intro kết thúc đúng trạng thái thu gọn), `TT_E2E_FAILOPEN_ONLY`, `TT_E2E_BOOT_RACE_ONLY`, `TT_E2E_FAILOPEN_BFCACHE_ONLY`, `TT_E2E_REAL_BFCACHE_ONLY`, `cross-browser.smoke.spec.cjs` |
| R8 | `TT_E2E_HISTORY_ONLY`, `TT_E2E_WHEEL_ONLY`, `scrollbar-parity.e2e.mjs`, `cross-browser.smoke.spec.cjs` (qua lại 981px giữ vị trí) |
| R9 | `scrollbar-parity.e2e.mjs` (`SCROLLBAR_ENGINES` chọn engine) |
| R10 | `footer-consistency.e2e.mjs`, `TT_E2E_FOOTER_ONLY`, `shared-header-menu-p7.test.mjs` |
| R11 | `mobile-viewport-stability.e2e.mjs`; Android thật: `mobile-viewport-android-record.mjs` |
| R12 | `mobile-layout-parity.e2e.mjs --scope matrix` (22 × 5 × 2 cỡ chữ × 3 engine = 660 ca) |
| R13 | `TT_E2E_REDUCED_ONLY`, `cross-browser.smoke.spec.cjs` |

## Gate còn mở

- `TT_E2E_HEADER_ONLY` trên Chromium cloud 05/10: 21/43 FAIL. Lifecycle Barba, focus navbar sau route
  mềm, locale replay, menu đã xanh trong `site.e2e.cjs` toàn site. Còn đỏ: geometry 320–1440px
  ("controls overlap", collapsed geometry), scroll direction (hover timeout); chưa rõ test cũ hay lỗi
  code (suy luận). Main.
- Scrollbar: owner đã nghiệm thu visual desktop; thiếu iPhone thật, Firefox headful, kéo, thả,
  visual landscape chồng lớp. Owner và máy PC.
- Menu thiếu touch thật Samsung, iPhone và owner visual; navbar P1.3 chờ owner spot-check; logo R5
  ([Brand](../../design-system/brand.md#logo)) chờ owner nghiệm thu visual.
- V01 AC2, V03 AC2: A05s đạt bàn phím phần cứng 05/10 (control viewer, menu, toolbar mở và thu,
  dọc và ngang); không có ô nhập nên bàn phím ảo không áp dụng. Còn iPhone, safe area. V04
  AC2 đạt trên A05s; V-A owner chấp nhận sai lệch snapshot (2026-10-06).
- Layout L00–L07 xong 05/10 trên `6c2e321`: 660 ca và mọi scope ba engine cùng commit, A05s dọc
  và ngang, 0 lỗi; manifest ở PR của L07. Main sau đó có thêm #96–#108, chưa chạy lại toàn bộ.
  Còn iPhone, owner visual.
- Main: chưa kiểm trình duyệt không hỗ trợ `svh`, iPhone Safari thật cho toàn shell, test paint và
  hit-test thứ tự lớp R1.
- button-content-parity: chữ, icon trong nút lệch giữa iPhone và Android (owner, 27/09); chưa có
  spec, plan. Owner.

## Chú thích thuật ngữ

- **Shell**: giao diện và runtime dùng chung mọi trang.
- **Route mềm**: đổi trang bằng Barba, giữ document và phần tử shell.
- **Logical scroll**: vị trí cuộn nội dung, kể cả khi Locomotive dịch bằng transform.
- **Fallback**: chế độ không motion khi `motion.js` không chạy được.
- **bfcache**: trình duyệt giữ nguyên trang khi Back/Forward.
- **FLIP**: đo trước, sau rồi animate transform giữa hai trạng thái.
