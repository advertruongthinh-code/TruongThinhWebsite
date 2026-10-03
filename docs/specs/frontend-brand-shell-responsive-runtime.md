---
title: Brand shell và responsive runtime
type: frontend
status: accepted
updated: 2026-09-28
scrollbar_delta_approved: 2026-09-27
viewport_delta_status: accepted
viewport_delta_approved: 2026-09-27
notion: none
related_decisions:
  - ../decisions/head-office-address-confirmed.md
related_reports:
  - ../archive/reports/frontend-brand-shell-responsive-runtime-2026-08-26.md
  - ../archive/reports/verification-frontend-brand-lockup-copy-ratio-2026-08-31.md
  - ../verification/advertising-september-p7-3-2026-09-23.md
---

# Brand shell và responsive runtime

## Kết quả và boundary

- User outcome: logo Trường Thịnh sắc nét, không clip; footer thống nhất; UI không
  hỏng khi đổi trực tiếp kích thước cửa sổ.
- Route/surface: năm public route cấp cao VI/EN, gồm header, full menu, homepage
  legacy closer và footer.
- Trong scope: sửa lifecycle qua breakpoint `981px`, inline SVG lockup, footer
  canonical, địa chỉ owner-confirmed và social placeholder không điều hướng.
- Ngoài scope: favicon, CMS, Wrangler, URL social thật, copy hoặc layout section
  không liên quan và full Espacio parity gate.

## Information architecture và state

- Homepage footer là canonical markup cho năm route; route không được tự tạo
  biến thể footer khác.
- Footer giữ statement và contact, hiển thị địa chỉ đã xác nhận, rồi bốn social
  icon theo thứ tự Facebook, Instagram, TikTok, Pinterest.
- Khi chưa có URL thật, social item vẫn nhìn thấy nhưng không có `href`, có
  `aria-disabled="true"` và không nhận focus như một link giả.
- Nội dung VI là source. Leaf node có bản EN qua `data-en`; địa chỉ chính thức
  giữ nguyên chuỗi tiếng Việt ở cả hai locale.

## Hướng visual

- Surface brief: `none`.
- Visual thesis: giữ bản sắc Trường Thịnh trong shell có nhịp, vị trí và motion
  gần reference Espacio, nhưng không sao chép source hoặc media.
- Impeccable review mode: Experience.

## Component và layout contract

### Correction menu mở — 2026-09-24

Owner đã duyệt [đặc tả menu theo Espacio](full-menu-reference-parity.md).
Đặc tả này thay các giá trị layout menu mở không còn khớp reference;
không thay navbar đóng, nhận diện, nội dung, route hoặc contract khác.
Đã triển khai CSS menu chung; kế hoạch nằm trong `tasks/plan.md`, mục MENU-R1.

### Brand lockup

Visual contract duy nhất: [Brand lockup trong DESIGN.md](../../DESIGN.md#brand-lockup--nguồn-chuẩn).
LOGO-R3 cập nhật phép đo ink gồm dấu; [focused verification](../verification/brand-lockup-logo-r3-2026-09-10.md)
giữ proof geometry, header và color lifecycle theo revision hiện hành. LOGO-R2
là evidence lịch sử. Không suy ra full-site PASS.

- Mỗi header/menu reuse inline `<svg class="brand-lockup">`; mark giữ SVG path
  đã sanitize, title/subtitle là `<text>` và EN dùng leaf `data-en`; CSS locale
  đặt font-size và dịch chuyển subtitle, giữ nguyên hình glyph.
- DOM hook, font loading, locale switch và cleanup do shared shell runtime sở hữu.
- Đọc target trước khi thay source/test; không dùng thông số từ report cũ làm
  acceptance mới. Nội dung/geometry/màu không được định nghĩa lại tại spec này.

### Footer

- Owner chốt ngày13/09/2026: footer chung mọi trang VI/EN chỉ gồm trụ sở,
  mạng xã hội và bản quyền; cùng markup và nhịp responsive. Lời mời/CTA
  riêng nằm trước footer, không tính vào chiều cao footer. Advertising giữ
  CTA trong grid/ảnh, không khôi phục lời mời đã bỏ.
- Bỏ min-height497px và padding-bottom90px của khung; hàng bản quyền
  min-height72px, căn giữa theo chiều dọc, không có đệm cuối dư. Hai cột
  trụ sở/social chuyển một cột trên mobile; chiều cao được tăng nếu nội dung
  hoặc cỡ chữ cần thêm chỗ, không cắt nội dung để ép số đo.
- Divider ngang full viewport; nội dung giữ cùng site gutter. Divider dọc bám
  đúng grid nội dung.
- Địa chỉ chính xác:
  `E16 Khu đô thị Hưng Phú, Phường Phú Tân, tỉnh Vĩnh Long`.
- Social icon là inline SVG monochrome, có accessible name và không dùng external
  icon dependency.

Kiểm chứng13/09/2026: `pnpm prepare:site`, `pnpm qa:static` và
`node tests/site/footer-consistency.e2e.mjs` đạt;28 tổ hợp route/locale/viewport
ở390/1569px, gồm parent/detail và legacy Advertising. Năm template có footer
markup giống nhau. Native Chrome xác nhận222px desktop/330px mobile,
bản quyền72px và không đệm thừa dưới đáy; đã xem ảnh desktop Advertising
và mobile Home. Impeccable layout detect không có finding trong scope quét.
Không gọi đây là full-site acceptance.

### Navbar P1.3

Owner duyệt delta spec P1.3 ngày2026-09-11 trong
[card Advertising](https://app.notion.com/p/3d6332849a0e8124af03c79f3c2e8406).
Đã triển khai và kiểm theo
[nghiệm thu kỹ thuật P1.3](../verification/advertising-grid-r4-2026-09-09.md#p13-checkpoint-c-và-nghiệm-thu-kỹ-thuật-2026-09-11).
Owner spot-check còn mở; source và gate P1.2 không tự được dùng làm proof.

- Khi đang ở danh sách Residential/Commercial/Advertising, bấm lại mục navbar
  tương ứng đưa logical scroll về0 bằng cùng đường xử lý logo homepage.
  Không tải lại route hoặc thêm history entry; Advertising không có photo
  giữ nguyên category/tag/query và bộ lọc.
- Tại photo hoặc trang dự án con, mục navbar cha vẫn về danh sách; Advertising
  phục hồi card đang xem theo AD-BROWSE-R1, không chạy card-detail morph. Bấm mục khác
  giữ navigation hiện hữu. Parent có active underline, photo detail không
  gạch chân mục Advertising; không có Back riêng trong photo UI.
- Plain click/tap và keyboard dùng được; Ctrl/Meta/Shift/middle-click,
  target/download không bị chặn. Full menu đóng theo shared flow, không để
  overlay khóa trang. Logo homepage và visual navbar giữ nguyên.
- Photo header dùng đủ collapse/hide/reveal chung, không có CSS/controller
  riêng ép luôn hiện. Tại top expanded, giữa trang cuộn lên reveal compact,
  về top mới expanded. Geometry photo dùng Hnav expanded làm trần; cuộn
  collapse/expand không kích hoạt primary resize mỗi frame.
- So sánh logo homepage live trước khi đổi handler: hiện setPageScroll dùng
  duration0 và disableLerp:true, kèm phản ứng header. Không tự thay thành
  tween cuộn900ms. VI/EN, touch/keyboard/reduced motion, history/locale giữ
  contract shared.

## Responsive, motion và accessibility

- Viewport matrix bắt buộc: `320`, `390`, `768`, `959`, `981`, `1024`, `1199`,
  `1440`, `1569` px.
- Tổng chiều cao header phải độc lập với true bbox của lockup và khớp reference:
  `72.59375/70.640625px` top/collapsed tại `≤750px`,
  `132.78125/128.78125px` tại `751–960px` (lịch sử, đã supersede bên dưới),
  `85.390625/81.390625px` tại `961–1200px`, và
  `102.515625/81.390625px` trên `1200px`.
- Correction P1.3: track brand chuyển ở750px cùng ngưỡng desktop nav;
  dải961–1200 dùng middle track thực và hai spacer co giãn tối đa44,4609375px
  theo nội dung VI/EN. Không tính khoảng trống bằng100vw khi có scrollbar.
  Menu glyph tại≤750 dịch2,5px trong button hiện hữu để giữ clearance24px
  ở320/client310; không đổi SVG, footprint logo, button hay chiều cao shell.
- Tại cùng viewport trên `750px`, từng desktop nav link giữ nguyên cạnh trái X,
  bounding-box width và computed typography giữa expanded và sticky. Sai số
  `left`/width tối đa `1px`; `font-family`, `font-size`, `font-weight`,
  `letter-spacing` và `line-height` phải trùng tuyệt đối.
- Header collapse/hide/reveal theo [Shared motion](../design/motion.md#shared-motion).
- Chuyển qua `981px` phải giữ đúng một scroll coordinate system: desktop dùng
  Locomotive, mobile dùng native scroll; không còn transform kép hoặc viewport
  trắng.
- Khi menu mở, resize không được khởi động smooth scroll hoặc cho background
  page di chuyển. Đóng menu khôi phục scroll đúng vị trí và state.
- Typography montage không để true glyph bounding box vượt viewport ở mọi
  breakpoint; giữ composition đã duyệt của legacy closer.
- Menu giữ dialog, focus, keyboard và reduced-motion contract hiện có.

## Localization, SEO và performance

- Không đổi route, metadata, favicon hoặc Worker behavior.
- Không thêm package, font request, remote SVG hay CMS binding.
- Text trong SVG reuse font Plus Jakarta Sans được HTML nạp sẵn từ Google
  Fonts; không thêm font request hoặc thay pipeline font trong slice này.

## Verification và evidence

| Scenario | Method | Evidence kỳ vọng |
| --- | --- | --- |
| Static contract | `pnpm qa:static` | Năm route cùng lockup/footer contract |
| Resize runtime | Playwright tại static preview | Không transform kép, blank viewport hoặc background scroll |
| Logo geometry | Playwright DOM/SVG bbox + Canvas TextMetrics sau font ready | [Contract và nghiệm thu logo](../../DESIGN.md#brand-lockup--nguồn-chuẩn) |
| Logo scale và màu | Playwright rAF/computed style/transition event | [Motion và state logo](../../DESIGN.md#brand-lockup--nguồn-chuẩn) |
| Navbar responsive | Playwright tại bốn width band | Đúng tổng height, collapse/hide/reveal, mouse-only force-reveal; từng link giữ `left`/width trong `1px` và computed typography bất biến |
| Navbar P1.3 | Focused parent/detail/history và Chrome DevTools | Re-click về top giữ query/filter/history; detail về parent; header cùng collapse/hide/reveal với Residential, không UI Back |
| Responsive | Playwright viewport matrix | Không overflow hoặc glyph clipping |
| Runtime/a11y | Chrome DevTools | Console/network sạch, social và dialog semantics đúng |

`qa:worker:static` chỉ chạy tại Worker release gate có Worker harness. Slice này
không đổi Worker và không khởi động Wrangler.

Report liên quan ngày 2026-08-26 là evidence của baseline cũ `52/28.35`, không
phải bằng chứng PASS cho contract tỷ lệ mới. Chỉ cập nhật kết luận verification
sau khi có focused runtime evidence và report dated mới.

Report ngày 2026-08-31 là evidence lịch sử, không chứng minh LOGO-R3; implementation được đo khi đó là `52/17.16`:
focused logo runtime `20/20 PASS`, static và Worker static đều PASS, DevTools
đo VI/EN trong tolerance; Impeccable vẫn `DEGRADED`, không phải detector pass sạch.

Computer Use không tự động chạy. Chỉ dùng nếu Playwright và Chrome DevTools
không đủ kết luận một behavior cần thao tác người dùng.

## Thin slice và rollback

1. Thêm regression test RED cho resize lifecycle và glyph clipping.
2. Sửa `motion.js` và CSS tại ownership hẹp nhất, rồi chạy focused test.
3. Thay lockup và footer trên năm route, rồi chạy static/focused test.
4. Chạy viewport matrix, Chrome DevTools và fresh read-only review.

Rollback theo từng slice bằng cách hoàn nguyên đúng hunk trong `motion.js`,
`style.css`, năm file HTML và test liên quan; không chạm generated output.

## Shared footer boundary — accepted P6

**Module id:** `shared-footer-boundary`. **Status:** accepted; owner duyệt spec
ngày `2026-09-22`. Implementation chờ duyệt plan `AD-SEPT-2026-P6`.

### Objective và contract

- Footer homepage là markup canonical cho mọi route public VI/EN, gồm route
  parent, Advertising photo state và sáu detail page generated. Các route giữ
  cùng structure, class, nội dung địa chỉ, social và copyright; không tạo biến
  thể footer hoặc component runtime thứ hai.
- Khoảng thở phía trên footer dùng một shared responsive contract: `64px` tại
  `≤750px`, `70px` tại `751–1200px` và `90px` trên `1200px`. Khoảng này chỉ
  xuất hiện một lần; section trước không cộng thêm padding/margin trùng.
- CTA hoặc skeleton của route trước footer phải kết thúc trước boundary này.
  Footer, divider và hit target social không được nằm trong mask, blur, canvas,
  clipping context hoặc stacking context của route content.
- Static architecture hiện hành vẫn dùng shared markup lặp trong source
  template. Không thêm framework/component loader chỉ để đạt reuse; build và
  test kiểm một structural signature thay vì chấp nhận route-local fork.

### Acceptance và verification

- `footer-consistency.e2e.mjs` quét năm source route, sáu detail output, VI/EN và
  viewport `320`, `390`, `768`, `1024`, `1440`, `1569`; footer signature chỉ có
  một bản và top gap khớp token trong `1 CSS px`.
- Không overflow ngang, clip text, divider lệch, khoảng trắng kép hoặc content
  bị mask. Advertising chứng minh skeleton dừng trước boundary; các route khác
  chứng minh section cuối và footer không overlap.
- Chạy `pnpm prepare:site`, `pnpm qa:static`,
  `node tests/site/footer-consistency.e2e.mjs` và focused browser matrix. Không
  dùng focused PASS để gọi full-site hoặc canonical parity PASS.

### Boundaries

- Luôn giữ footer copy, địa chỉ, social semantics, VI/EN và `data-header-tone`.
- Hỏi trước khi đổi content footer, URL social/Zalo hoặc cấu trúc shell.
- Không thêm dependency, route mới, CMS binding hoặc sửa `.site-output/` trực tiếp.

## Correction P6.1 — giảm shared footer top gap

**Status:** accepted; owner xác nhận intent và cho phép Codex tự duyệt spec,
plan, task ngày `2026-09-22`. Correction này thay responsive gap `64/70/90px`
của Shared footer boundary P6.

- `--footer-top-gap` là `48px` tại `≤750px` và `64px` trên `750px` cho toàn bộ
  route public VI/EN. Không còn band riêng `751–1200px`.
- Footer markup, content, height, divider và social semantics giữ nguyên. Section
  trước footer không cộng margin/padding thứ hai.
- `footer-consistency.e2e.mjs` kiểm đúng hai band tại toàn bộ route/locale và
  boundary skeleton vẫn kết thúc trước gap.

## Shared header shell — correction P7

**Module id:** `shared-header-shell`. **Plan:** `AD-SEPT-2026-P7`.
**Status:** accepted; owner xác nhận ngày `2026-09-22`.

- Giữ nguyên geometry, breakpoint, chiều cao, logo SVG, nav link và hamburger đã
  duyệt. Transparent hero, white/scrolled, detail ink và menu-open dùng cùng
  shell/state machine; chỉ background và tone chữ thay đổi như hiện tại.
- Full menu reuse `.menu-appointment` đang có, cùng link Zalo của website, nhưng
  copy chuẩn là `Gọi Zalo tư vấn` / `Talk to us on Zalo`. CTA đứng ngay trước
  close X trong DOM và cùng top rail như reference Espacio.
- Advertising browse/photo không được ẩn `.menu-appointment`; chỉ floating CTA
  ngoài menu giữ rule riêng. Không thêm CTA hoặc component header thứ hai.
- CTA căn về phải; close X bám cùng right gutter với hamburger/header shell,
  không dùng offset cục bộ làm lệch vị trí. Logo và hamburger bbox giữa bốn
  state sai khác tối đa `1px` tại cùng viewport.
- Giữ visibility contract đã duyệt của menu CTA: desktop và `≤578px` hiện,
  `579–960px` ẩn; close X luôn hiện, focusable và không overlap CTA/language.
- Static test khóa cùng markup/copy/link/DOM order trên năm source route.
  Browser matrix `390/768/1024/1440/1922px`, VI/EN và bốn header state kiểm
  bbox, focus order, Escape, resize khi menu mở, reduced motion và no overflow.

## Correction P7.1 — phục hồi geometry và chặn bottom-clamp reveal

**Module id:** `shared-header-shell`. **Plan:** `AD-SEPT-2026-P7.1`.
**Status:** accepted; thay assertion P7 rằng logo top/white/collapsed luôn cùng bbox.

- Shared navbar từng giữ bốn height band Espacio đã đo: `≤750px` top/collapsed
  `72.59375/70.640625px`; `751–960px` `132.78125/128.78125px`;
  `961–1200px` `85.390625/81.390625px`; `>1200px`
  `102.515625/81.390625px`. Dải `751–960px` được correction bên dưới thay
  bằng header một hàng. Logo giữ tỷ lệ SVG theo state và nav link
  không đổi X/width/typography quá `1px` giữa top và collapsed.
- Chạm đáy, overscroll hoặc layout height clamp không được tính là upward
  intent. Header chỉ hiện lại khi cuộn lên thật vượt threshold hiện hành; ở
  logical scroll `0` giữ expanded top state. Áp dụng mọi route VI/EN và cả
  native scroll lẫn Locomotive. CTA/menu/accessibility P7 giữ nguyên.
- Restore geometry tại shared CSS ownership, không route override. Overscroll,
  scrollbar clamp, footer/skeleton đổi chiều cao, visual viewport resize và
  rounding smooth-scroll không là upward intent; keyboard, wheel, touch,
  trackpad cho cùng state. Spec P7.1 gốc đã xóa, xem Git `da2f13a`.

## Correction 2026-09-23 — desktop nav luôn một hàng

**Module id:** `shared-header-shell`. **Status:** accepted; owner xác nhận
ẩn cả ba mục khi không còn đủ chỗ thực tế, kể cả sau zoom/resize.

- Tại `751–960px`, bố cục nav hai hàng và chiều cao header
  `132.78125/128.78125px` ở contract P7.1 là lịch sử. Header dùng một hàng
  `85.390625/81.390625px` như dải `961–1200px`; logo, hamburger, màu và
  vị trí menu giữ cùng shared UI.
- Đo layout chữ thực tế sau font load, đổi locale, resize và thay đổi kích
  thước nội dung. Khi link sẽ xuống hàng, bị cắt hoặc đè lên logo/hamburger,
  ẩn toàn bộ desktop nav và đưa link khỏi keyboard order. Logo và menu vẫn
  hiện; khi đủ chỗ, nav và keyboard order trở lại. Không lấy một breakpoint
  cố định thay cho phép đo này.
- UI menu đầy đủ vẫn có các đường dẫn trên mọi viewport. Browser regression
  kiểm VI/EN, homepage/photo, resize qua hai chiều và cỡ chữ lớn.

<a id="scrollbar-parity--draft-2026-09-27"></a>

## Scrollbar parity — 2026-09-27

**Module id:** `scrollbar-parity`. **Status:** accepted; owner xác nhận
“Duyệt delta scrollbar” ngày 27/09/2026. [Capability map](mobile-browser-parity-capability-map.md)
đã được duyệt cùng ngày. [Plan](../../tasks/plan.md) và card riêng đã được owner
duyệt27/09: “Duyệt plan và card Notion”. Các section accepted phía trên giữ hiệu lực.

### Objective và phạm vi

Người dùng public VI/EN nhìn thấy shell/glassmorphism liền mạch, không bị một
track trắng thường trực chia cạnh phải. Scrollbar desktop theo Espacio; geometry
shell không đổi khi scrollbar hiện/ẩn. Mobile giữ native scroll theo reference.
Áp dụng shared shell, Advertising browse/photo và các public route hiện hữu.
Skeleton lifecycle và chữ/icon trong nút là module riêng, chưa đổi trong delta.

Boundary đã duyệt: giữ scroll-mode breakpoint981px và fallback hiện hành;
parity là behavior/layout của website. Hình indicator native do
OS/browser quyết định, không ép iPhone/Android dùng thumb desktop11px.

### State và visual contract

Oracle geometry/style là [bổ sung Espacio27/09](../reference/espacio/components.md#bổ-sung-scrollbar--2026-09-27),
có hash archive/live và raw state. Các giá trị10px TT native lịch sử trong
foundations không phải target.

| Mode/state | Outcome bắt buộc |
| --- | --- |
| Desktop smooth idle | Một vertical overlay; track/parent opacity0 khi không scroll/hover/drag; background track transparent. Không reserve gutter hoặc thêm scrollbar thứ hai |
| Desktop scrolling | Track opacity1 trong active scroll; thumb phản ánh logical scroll và đúng limit. Wheel/keyboard/drag cùng hệ tọa độ; không chọn timer tùy ý thay state controller |
| Desktop hover/drag | Hover track scaleX1.45, origin right; thumb cursor grab/grabbing và track visible khi kéo. Drag di chuyển document đúng chiều, clamp ở đầu/cuối; release trở về state scroll/idle hợp lệ |
| Desktop geometry | Track11px, thumb7px/margin2px/radius10px/black opacity0.5; opacity/transform transition300ms. Chiều cao thumb theo viewport/content, không hard-code140.89px từ sample Home |
| Native/mobile | Giữ native touch/momentum; không tạo desktop custom track, transform-scroll hoặc vùng kéo phủ cạnh phải. Indicator native theo browser/OS; không áp global white-track12px làm cắt shell |
| Native fallback/reduced motion | Giữ scrolling và keyboard khi smooth bị tắt/không sẵn sàng; không force smooth để lấy scrollbar. Classic native indicator theo browser/OS được phép; shell dùng cùng client width và không thêm app-owned white gutter. Reduced motion không thêm tween300ms |
| Menu/viewer lock | Scrollbar document không nhận drag khi background đã lock. Menu overflow bên trong vẫn dùng được. Đóng overlay khôi phục vị trí, đúng một controller và không jump/shift shell |

Ở desktop overlay, `innerWidth - documentElement.clientWidth` bằng0 trong
state có khả năng render custom bar. Header/main cùng client width; tại cùng
viewport và state khác chỉ visibility scrollbar, bbox shell/nav thay tối đa
1 CSS px. Không dùng padding-right/margin âm/100vw compensation để che lệch.
Header/CTA/grid không bị track hoặc thumb mở rộng phủ hit target.

Browser matrix giữ Chrome/Edge, Firefox và Safari/WebKit trong gate hiện hữu.
Không suy thumbnail/pixel indicator native giữa các OS phải giống nhau; layout,
scroll, focus và nội dung phải đúng contract. WebKit emulation không là iPhone
physical PASS. Physical Android Chrome/USB đã verify phương pháp kết nối.

### Ownership, commands và style

Source chung tại `src/site/style.css` và `src/site/motion.js`; reuse scroll
controller, logical-scroll bridge và lock hiện hữu. Không tạo controller theo
route, thêm library, sao chép bundle Espacio hoặc sửa vendor/generated output.
Source example hiện hành phải tiếp tục giữ keyboard focus visible:

```css
:focus-visible {
  outline: 2px solid var(--orange);
  outline-offset: 4px;
}
```

Giữ style/naming hiện hữu; comment code English, docs Vietnamese. Thay root
scrollbar styles phải tách document khỏi menu overflow và các horizontal rail
đã accepted; không blanket-disable mọi scrollbar/focus/overflow trong `*`.

Commands sau spec/plan được duyệt, trong đúng implementation checkout:

```powershell
pnpm prepare:site
pnpm qa:static
$env:BASE_URL = 'http://127.0.0.1:8792'
node tests/site/scrollbar-parity.e2e.mjs
pnpm qa:cross-browser
```

`scrollbar-parity.e2e.mjs` đã được tạo trong implementation; kết quả theo
evidence của đúng source hash. Port8792 là preview correction theo plan, giữ8790 cho
recovery paused. Preview phải phục vụ đúng candidate đã build, không khởi động
server khác rồi gọi đó là source đã kiểm. Cross-browser gate giữ preset hiện
hữu; chưa chạy hoặc browser thiếu thì ghi open, không đổi assertion để pass.

### Acceptance và giới hạn evidence

- Focused browser test kiểm idle→scroll→settle, hover→leave, drag→release,
  Home/End/PageDown, đầu/cuối trang, no-overflow và đúng một scrollbar. Đo
  computed geometry sau transition; không inject class/CSS để tạo state PASS.
- Route/locale: năm top-level VI/EN; Advertising browse/photo/category, menu
  open/close và route return. Resize qua980/981px hai chiều, document ngắn/dài,
  reduced motion và fallback đều giữ logical scroll/controller lifecycle.
- Geometry matrix reuse320/390/768/959/981/1024/1199/1440/1569px; critical
  hover/drag desktop1440px, native touch trên Android thật. Kiểm menu overflow,
  focus, toolbar height change và orientation mà không override device scale.
- Android chạy local trước theo [hướng dẫn](../operations/android-real-device-debugging.md),
  gắn browser/device/source version. Sau phát hành mới debug Sites theo owner.
  Chụp ảnh có timestamp; timing probe tách screenshot overhead. iPhone/Safari
  chưa có physical evidence thì giữ open.
- Reference drag/release, menu/viewer và reduced-motion scrollbar chưa được
  đo live. Drag target hiện source-derived; lock/reduced-motion là TT accepted
  requirement. Kiểm các state này trong focused implementation gate; không gọi
  reference FULL PASS. Keyboard-only reference probe không chứng minh timeout
  auto-hide; TT phải settle đúng, không giữ bar thường trực vì stale class.

Always: preserve accepted shell/content, đủ pointer/keyboard/touch, focused
regression và docs/evidence đúng source. Ask first: đổi breakpoint/controller,
native-mode target, dependency hoặc các module khác. Never: bypass review,
reset skeleton để sửa scrollbar, sửa archive/vendor/output, commit secrets hoặc
resume recovery/P11/deploy từ approval của delta này.

### Human gate và rollback boundary

Owner đã duyệt delta `scrollbar-parity` và [plan riêng](../../tasks/plan.md)
ngày27/09. QA/audit/code review tương tự gom trong một agent Sol effort
ultra theo owner; main giữ verification/acceptance. Rollback chỉ đúng source/test
hunk của module; không thay checkpoint recovery66 staged paths. Approval này
không thay permission của source commit/push/deploy hoặc nghiệm thu toàn site.

### Integration scrollbar —27/09/2026

`style.css` gỡ document scrollbar wildcard; menu giữ style/hover riêng và rail
giữ horizontal suppression. Locomotive cung cấp geometry/transition đã accepted;
track dùng z-index1001 để thumb không bị lớp glass header che ở đầu trang.
`motion.js` đồng bộ tablet breakpoint981 với shell, giữ smartphone/tablet smoothfalse.
Integration tại `initSmoothScroll` bổ sung timestamp thiếu cho keyboard, chặn
wheel callback/drag RAF khi stop, freeze coordinate và dọn listener/RAF khi destroy.
Drag clamp tại pixel CSS cuối có thể chạm để tới document limit; mapping bên
trong track giữ công thức hiện hữu. Không suy đây là live reference drag PASS.
Không thêm controller, idle timer hoặc sửa vendor. Adapter phụ thuộc API instance
của version pinned4.1.4; đổi dependency phải chạy lại focused lifecycle/lock gate.

[Verification scrollbar](../verification/scrollbar-parity-2026-09-27.md) giữ
source hash, engine/channel, Android thật và những phần chưa xác minh. Browser
headless có thể ẩn native indicator; so với unstyled control cùng runtime để
kiểm không có author override, không gọi đó là physical appearance PASS.

<a id="mobile-viewport-stability--draft-2026-09-27"></a>

## Mobile viewport stability — accepted 2026-09-27

Module `mobile-viewport-stability` thuộc
[map toàn website đã duyệt](mobile-browser-parity-capability-map.md#feedback-viewer-và-mobile-toàn-website--map-chờ-duyệt).
Owner xác nhận giữ card/bố cục ổn định khi toolbar hiện/ẩn, Safari/iPhone và
Chrome/A54, trên22 route VI/EN dọc/ngang. Owner duyệt bằng
“Duyệt delta viewport”; plan V00–V05 và card riêng đã duyệt bằng
“Duyệt plan và card viewport (đề xuất)”. Implementation/proof theo
[plan viewport](../../tasks/plan.md#mobile-viewport-stability--plan-chờ-duyệt).
Giả định: website public web hiện hữu; browser/version thực dùng phải được ghi
trong evidence; không coi WebKit desktop là Safari/iPhone physical.

### Outcome và phần giữ nguyên

Toolbar của browser vẫn hoạt động native. Khi chỉ thanh địa chỉ/tab bar thu
gọn hoặc mở rộng, vùng nhìn có thể thay đổi nhưng geometry website không
co giãn theo: hero/card/ảnh/mô tả/related grid và CTA tail giữ kích thước,
tọa độ document. Xoay máy, thay kích thước layout viewport thật, đổi chiều
rộng hoặc typography vẫn reflow đúng và giữ context người xem.

Scope gồm Home, Residential, Commercial, Advertising, About và sáu detail slug
VI/EN theo [route contract](frontend-route-and-content.md), shared header/menu/footer,
Advertising filter/photo/tag và viewer. Module sửa cơ chế viewport; việc sửa
bbox landscape/title/filter thuộc `site-mobile-layout-parity` kế tiếp.
Pinch custom, viewer morph/blur, history timing, glass zone và justified thuộc
các module sau; delta này chỉ chuẩn bị geometry ổn định cho chúng.

Giữ random seed/order/history, media source/ratio, scrollbar, native touch,
common skeleton slot/node/deck/preset/reveal, phone context budget≤2 và Flow
presets. Không dùng frozen viewport để ngừng visibility/offscreen cleanup.
Khoảng cách CTA–footer giữ giá trị hiện hành tại cùng viewport, sai lệch đo≤1
CSS px; không có seam glass và CTA/footer endpoint hiện hữu vẫn là gate.
Shared token `--footer-top-gap` vẫn48/64px theo P6.1. Dung sai≤1px không là
gap tuyệt đối; không đồng nhất khoảng chữ CTA với khoảng section–footer.
R10 final viewport dùng chiều cao layout ổn định, không tái packing theo toolbar.

### Hai loại kích thước và ownership

Phân biệt tại provider trong shared shell; consumer không tự lấy chiều cao
toolbar rồi đưa vào persistent layout key. Đây contract semantics, chưa ép
tạo public API, package, controller hoặc một module runtime mới.

| Dữ liệu | Ý nghĩa và consumer |
| --- | --- |
| Layout width/height | Kích thước CSS dùng để layout; mobile height dựa trên small viewport ổn định, cùng nghĩa với `svh`. CSS và JS phải dùng cùng cơ sở sau resolve sang CSS px. Desktop vẫn theo chiều cao cửa sổ thật |
| Visible rect/scale | `visualViewport` hoặc native fallback hiện tại; dùng cho phần đang nhìn thấy, visibility/virtualization, scroll bounds, safe controls và native zoom. Không dùng để re-pack card hoặc đo lại ảnh theo toolbar |
| Layout invalidation | Layout width/height ổn định thực đổi, orientation đổi, font/text metrics đổi hoặc nội dung đã được contract cho phép đổi. Khi đó được reflow; không đồng nhất mọi `resize` với invalidation |

Ưu tiên CSS native stable viewport units và reuse shared scroll/lifecycle.
JS cần height phải dùng giá trị đã resolve thực, không `parseFloat("100svh")`
hay lấy `visualViewport.height` làm stable height. Nếu thiếu API/units, fallback
phải hữu hạn, không polling hoặc lấy minimum rồi làm height trôi qua mỗi swipe;
ghi browser/version và kiểm behavior riêng trước khi gọi PASS.

[CSS Values4](https://www.w3.org/TR/css-values-4/#viewport-relative-lengths)
định nghĩa small/large/dynamic viewport; [Chrome team](https://web.dev/blog/viewport-units/)
phân biệt stable units với `dvh` đổi theo toolbar. [WebKit Safari15.4](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/)
giữ provenance platform support, không thay kết quả trên iPhone/version thực.

### State và oracle

| Trigger | Behavior bắt buộc |
| --- | --- |
| Toolbar height/offset đổi; layout metrics, font và width giữ nguyên | Không đổi geometry key, card dimensions/document placement, description pagination hoặc fitted image scale/pan; không cancel/replay morph chỉ vì toolbar. Visibility/native scroll bounds vẫn cập nhật |
| Rotate hoặc layout viewport thật đổi, kể cả desktop chỉ đổi height | Resolve layout metrics mới; reflow theo contract hiện hữu, giữ photo/filter/tag/seed/deck context, focus và logical anchor. Không giữ height portrait cho landscape |
| Font loaded, text zoom200% hoặc content change hợp lệ | Đo typography/reflow cần thiết; không clip để ép geometry cũ. Text và controls vẫn tiếp cận được |
| Native page pinch/keyboard | Page zoom không bị khóa; keyboard/focus có thể scroll vào vùng nhìn. Không dùng zoom/keyboard visible height để thu nhỏ toàn website. Custom image pinch thuộc delta viewer sau |
| Route/locale/history, menu/viewer open-close, BFCache/hidden | Đúng một owner/listener/controller; cleanup theo lifecycle. Không carry snapshot sai orientation, đổi history entry hoặc scroll lock state; visible rect vẫn phản ánh state thực |

Sau fonts/media/reveal đã settle, với cùng layout metrics/content/state, so
before/after toolbar bằng bbox CSS document coordinates: width/height/top/left
của subject trong scope lệch tối đa1 CSS px. Dùng native `scrollY` cho native
mode và bridge logical scroll cho transform mode; không cộng nhầm hai hệ.
Loại riêng scroll/sticky/header hide-show hợp lệ và native zoom paint; phải
ghi chúng trong sample, không blanket-ignore mọi bbox khác nhau.

Website không tự gọi scroll-to-top/restore/center để đáp lại toolbar height-only.
Scroll do user, focus hoặc browser clamp tại document boundary được ghi riêng;
không chống native clamp bằng script làm nhảy ngược. DOM/content height và
placement phải ổn định dù `maxScroll` thật thay đổi.

Trong viewer, geometry ảnh dùng stable layout basis; overlay nền có thể phủ
vùng nhìn thực và controls phải nằm trong visible rect/safe area, không bị
toolbar/keyboard che. Không đóng viewer, reset zoom hoặc đổi photo do toolbar.
Không blanket bỏ mọi resize event để đạt oracle.

### Source, style và giới hạn sửa

Shared source: `src/site/style.css`, `motion.js`, `detail.css`, `detail.js` khi
caller thật cần; Advertising geometry/resize tại `catalog-runtime.mjs`, fit ảnh
tại `photo-viewer.mjs`, pure geometry trong `layout-core.mjs`. Tests ở
`tests/site/`; build `.site-output/` generated, không edit tay.

Pattern hiện hữu vẫn được reuse, ví dụ resize coalesce và abort cleanup:

```js
window.addEventListener("resize", scheduleResize, {
  passive: true,
  signal: controller.signal,
});
```

Không đổi syntax/style toàn file, không copy provider vào từng route và không
thêm dependency. Code comment English; Markdown Vietnamese, glossary cuối file.
Always: đọc consumer, đo đúng coordinate space, preserve contracts, docs/evidence
cùng source. Ask first: đổi native scroll mode, breakpoint/design, dependency hoặc
boundary module. Never: force-hide browser toolbar, disable page zoom, reset random/
skeleton, sửa vendor/archive, overwrite checkpoint, resume recovery/P11 hoặc deploy.

### Verification và commands sau approval

Plan cần baseline fail-before/pass-after tại đúng layer, không viết test chỉ
mirror helper. Test matrix cover22 routes VI/EN dọc/ngang, Advertising category/
photo/tag và menu/viewer. Headless/emulated resize kiểm geometry/lifecycle;
không thay toolbar animation, notch/safe area hoặc gesture trên thiết bị thật.

1. Contract-level probe dùng captured layout/visible metrics để chứng minh
   visible height-only không làm thay geometry. Chrome/Firefox/WebKit kiểm
   resize layout thật, width/breakpoint transitions, orientation và lifecycle.
   `setViewportSize` không mô phỏng toolbar native: resize height-only thật
   vẫn phải reflow. Đo bbox/keys/IDs/scroll; console/page/network/HTTP errors
   giữ nguyên gate. Direct/reload với toolbar mở/thu gọn kiểm trên thiết bị thật.
2. Android Chrome thật: native swipes ít nhất3 chu kỳ mỗi chiều trên trang dài,
   detail/viewer và các shared shell/template; DOM/CSS + events + timestamped
   screenshots. Ghi đúng device/model/OS/Chrome/source/version, không đổi A05s
   thành A54. A54 owner acceptance cũ không thay evidence của candidate mới.
3. iPhone Safari thật: cùng scenario dọc/ngang, toolbar/safe area và controls;
   chưa có thiết bị/evidence thì gate physical **open**, không PASS từ emulation.
4. Text zoom200%, native pinch, keyboard/focus, reduced motion, fallback,
   route/locale/Back/Forward và cleanup. Giữ skeleton/random/scrollbar regressions
   đã accepted; không tự resume full continuation failure cũ để gọi delta này PASS.

Commands hiện hữu, chạy trong đúng managed checkout theo plan đã duyệt:

```powershell
pnpm prepare:site
pnpm qa:static
$env:BASE_URL = 'http://127.0.0.1:8792'
node --test tests/site/advertising-photo-layout.test.mjs tests/site/advertising-products-layout.test.mjs tests/site/advertising-products-lifecycle.test.mjs tests/site/advertising-skeleton-flow.test.mjs
node tests/site/advertising-skeleton-lifecycle.e2e.mjs
node tests/site/scrollbar-parity.e2e.mjs
pnpm qa:cross-browser
```

Focused viewport fixture/physical recorder và command chính xác được chốt
trong plan đã duyệt. [Evidence viewport](../verification/mobile-viewport-stability-2026-09-27.md)
giữ named RED/GREEN, final source/served hashes và physical gates. QA/audit/code
review dùng một agent Sol/ultra; main giữ diff inspection/verification/acceptance.
Timing/performance probes tách screenshot overhead, không hạ thresholds cũ.

### Approval, supersession và rollback

Owner duyệt intent, map và delta viewport ngày27/09/2026;
**implementation plan đã duyệt** bằng “Duyệt plan và card viewport (đề xuất)”.
Plan cụ thể: [V00–V05](../../tasks/plan.md#mobile-viewport-stability--plan-chờ-duyệt),
checklist tại [tasks/todo.md](../../tasks/todo.md#mobile-viewport-stability--v00v05).
V01 triển khai shared token `--site-layout-viewport-height`: `100svh`, fallback
`100vh`, desktop981px trở lên dùng `100vh`. `TruongThinhMotion.getViewportMetrics()`
bổ sung optional read-only getter: `layoutWidth`, `layoutHeight` resolved CSS px,
`visible:{width,height,left,top,scale}`. Một inert probe trong document resolve
native units; không timer/cache theo route và không thay logical scroll methods.
Delta này chỉ supersede việc dùng dynamic visible height để làm persistent
geometry khi toolbar đổi. Không supersede landscape design, motion timing,
glass gradient, random, full-exit replay, presets hoặc scrollbar.

Sau implementation, report phải ghi source/build/served hash, route coverage,
device/browser/version, sample/oracle, failure và gate chưa kiểm. Rollback chỉ
owned viewport source/test hunks; giữ accepted random/scrollbar/skeleton và
immutable C06U checkpoint. Spec approval không cho commit/push/deploy.

### Integration viewport —27/09/2026

Provider reuse một inert `.site-viewport-metrics` document, resolve shared CSS
token100svh trên mobile và100vh ở desktop981px. `TruongThinhMotion` bổ sung
optional `getViewportMetrics()`; không đổi get/set/lock/unlock logical scroll.
Catalog bảo đảm probe khi shell không boot; shared provider adopt cùng node
nếu chạy muộn. Không cache toolbar size hoặc nhân probe theo route.

Packing/key, morph snapshot và CTA tail dùng stable basis; virtual windows và
skeleton eligibility dùng current visible rect/offset. IntersectionObserver
chỉ trigger reconciliation; không coi layout root của observer là vùng nhìn
native pinch. Reuse RAF và AbortController hiện hữu, không event bus mới.
Viewer dùng stable stage, chỉ refit khi geometry key thực đổi; visible edges
cập nhật controls mà không cancel opening/closing hoặc reset zoom/pan.

[Report viewport](../verification/mobile-viewport-stability-2026-09-27.md) giữ
candidate/hash/commands, named failures và gate physical/owner/MCP; không thay
accepted scrollbar/random/skeleton hoặc mở module layout/motion/glass kế tiếp.

<a id="site-mobile-layout-parity--draft-2026-09-28"></a>

## Site mobile layout parity — accepted 2026-09-28

Module kế tiếp trong [map đã duyệt](mobile-browser-parity-capability-map.md#feedback-viewer-và-mobile-toàn-website--map-chờ-duyệt):
owner yêu cầu sửa iPhone/A54 và landscape overlap trên toàn website VI/EN.
Intent/map đã duyệt; owner duyệt delta ngày28/09/2026 bằng
“Duyệt delta layout (đề xuất)”. Alias anchor draft được giữ cho các link cũ.
Owner duyệt plan/tracking cùng ngày bằng “Duyệt plan và card layout (đề xuất)”; chỉ
implementation L00–L07 local8792 được mở, không commit/push/deploy/recovery resume.
Dependency là stable layout/visible metrics V00–V05; các physical gates còn mở
được kế thừa, không gọi emulation là nghiệm thu thiết bị thật.

### Outcome và state

22 entrypoint gồm10 canonical shared route và12 compatibility category slug;
kiểm canonical destination, Advertising All/6 category/photo/tag/related,
menu open/closed và viewer controls. Portrait/landscape phải đọc được toàn bộ
copy và thao tác control bằng touch/keyboard, không chồng header/title/filter,
không mất chữ hoặc overflow document ngang. Grid/filter/ảnh vẫn giữ context
khi xoay máy hoặc browser toolbar đổi, theo viewport contract phía trên.

Ở scroll đầu trang sau fonts/media/reveal settle, header/navbar không che
title, filter hoặc primary content; title và filter không giao bbox. Chiếm
chỗ đúng chiều cao nội dung và typography thay vì ép vào viewport thấp làm
các block đè nhau. Khi user đã scroll, sticky header che phần đã đi qua là
state hợp lệ, phải ghi scroll/sample để không nhầm với initial overlap.

Text size200% vẫn đọc được copy VI/EN, controls/focus tiếp cận được và document
không tràn ngang. Horizontal scrolling chỉ dùng tại component đã accepted,
như menu hoặc gallery; không biến whole document thành horizontal scroller.
Không ẩn/cắt chữ, tắt page zoom, đổi product copy hoặc hạ text-size oracle
để hết failure. Safe area/native keyboard/toolbar không che controls.

### Bảo toàn và boundary

Giữ brand lockup, copy/media và accepted desktop composition; chỉ sửa
responsive geometry/type-fit nơi measured evidence yêu cầu. Không mở redesign
header/footer hoặc đổi default typography toàn site. Giữ semantic order,
accessible names, focus/keyboard/native touch và full menu contract.
Advertising giữ target columns/spacing, ratio/frontier, random seed/history,
common skeleton assignment/reveal/context≤2, scrollbar, gap CTA–footer và
shared top-gap48/64px. Không sửa presets, opaque-white glass transition,
blur zone, viewer pinch/morph hoặc Back/Forward timing trong module này.

Source ownership dự kiến shared `style.css`, `detail.css`, runtime geometry
consumer và page HTML thật khi evidence chỉ ra cần; reuse token và intrinsic
layout hiện hữu. Không thêm runtime layer/dependency hoặc nhân CSS theo22 URL.
Actual files, tasks/estimate/rollback tại
[plan layout L00–L07](../../tasks/plan.md#site-mobile-layout-parity--plan-chờ-duyệt),
[card riêng](https://app.notion.com/p/3e8332849a0e81f18301f28c1091a9c3) đã tạo/fetch
verified sau owner approval; checklist giữ gate physical/owner riêng.

### Baseline, oracle và evidence

[Landscape diagnostic](../verification/mobile-preview-diagnostics-2026-09-27.md#landscape-lỗi-layout-sau-khi-animation-đã-settle)
đã đo title/filter giao99.61–129.77px, title/header51.31–79.31px tại
838×331/387, VI/EN, scrollY0; wrapper min-height336px vượt hero281/337px.
[Viewport report](../verification/mobile-viewport-stability-2026-09-27.md)
giữ9 named failures: text-size200% ở390px trên EN Residential/Commercial/About,
overflow2–140px tùy engine. Đây baseline cần chẩn đoán đúng source, không
giả định mọi route có cùng lỗi hoặc sửa width-only cho mọi case.

Oracle sau settle: document overflow≤1 CSS px; initial block bbox không giao
nhau ngoài layering đã accepted; không che chữ/controls qua paint/mask/clip.
Đo document coordinates đúng native/logical mode, actual fonts/layout/visible
metrics, sample trước/sau xoay và toolbar. Native browser zoom paint không
là thay đổi persistent geometry; responsive reflow thật vẫn được phép.

Matrix gồm Chromium/Firefox/WebKit, VI/EN, portrait320×568/390×844 và
landscape838×331/387,844×390; breakpoint680/750/980/981 và actual device sizes.
Kiểm native/reduced/fail-open, direct/reload/locale/Back/Forward,200% text size,
menu/keyboard focus, default và expanded photo state. Giữ console/page/network
assertions, timestamp PNG và source/build/served provenance. Baseline RED phải
do overlap/overflow thật, không fixture import/timeout; final đủ entry/state,
không dừng matrix sau route failure đầu hoặc bỏ engine để đạt verdict.

Chrome/A54 và Safari/iPhone thật kiểm dọc/ngang, toolbar, safe area và zoom;
A05s đang cắm chỉ là evidence bổ sung. Thiếu hardware giữ physical gate open,
không tự gọi toàn website PASS. Owner visual acceptance và MCP UI layer giữ
riêng. Local8792, recovery/P11 paused; spec approval không cho commit/push/deploy.

### L01 implementation — 2026-09-28

Trong band≤980px, Advertising hero dùng intrinsic grid rows content/filter/cue,
min-height theo stable layout token; header inset dùng header row token và
padding shell. Nội dung dài có thể tăng chiều cao hero, thay fixed viewport
và absolute filter. Giữ wrapper zoom bằng scale, bỏ translate centering chỉ
ở wrapper đã chuyển vào flow; fallback dùng cùng flow. Hai title line vẫn giữ
font/weight/alignment mặc định, cho wrap khi cần; motion-word giới hạn width
container. Rail≤680px vẫn cuộn ngang, từng filter tối đa rail trừ hai margins,
wrap chữ khi tăng200%. Không thay random/grid,viewport bridge,motion timing,
glass hoặc footer. [L00/verification](../verification/mobile-layout-parity-2026-09-28.md)
giữ baseline RED48/60 trên3engines với oracle glyph/paint đã sửa. L01 amended
`final-2026-09-27T18-10-39-381Z` đạt60/60, hai đầu source/served khớp. Wrapper
base/no-JS/fallback scale1; scale1.2 chỉ khi scripting enabled/no-preference.
Rail remeasure từng nút sau scroll, kiểm toàn ancestor clip. Đây scoped proof,
chưa là whole-site/device acceptance.

### L02 implementation — 2026-09-28

Residential/Commercial≤980px bỏ nowrap trên title source nhưng giữ cỡ chữ,
weight và alignment. Motion-word giữ animation; long word tối đa width của
container, override inline nowrap do SplitText bằng rule scoped để200% chữ
vẫn wrap. Shared detail heading/process/CTA dùng overflow-wrap khi một từ
vượt khung. `.tmp/mobile-layout-parity/overflow-ports.json` phân biệt hero
nowrap và heading ngoài hero gây document overflow; không dùng overflow-hidden
trên document hoặc ép font xuống. Editorial paragraph thực dùng selector
`.detail-process-editorial .editorial-item p`; không dùng `.process-step p` cũ.
L02 `final-2026-09-27T18-09-36-212Z` đạt120/120, source/served freeze khớp,
document overflow≤1px. Gate body paint/shared portals/state và all-route giữ
riêng cho L03/L04 theo plan.

### L03/L04 implementation — 2026-09-28

Home/About≤980px đặt hero content/cue/toggle trong intrinsic rows với header
inset, cho hero tăng chiều cao khi chữ cần. About top:auto override đúng
specificity của rule cũ; title/heritage/timeline long word wrap, timeline track
minmax(0,1fr). Hero/detail mask giữ measured ink allowance nhưng tối thiểu0.28em
khi tăng chữ. Legacy closer Home và detail service portal dùng intrinsic height;
min-height legacy400px toàn band≤980 giữ baseline, portal giữ34rem hoặc400px
theo band. Không đổi font, copy, media hoặc animation timing.
Generated motion-line-mask≤980px override SplitText inline overflow:hidden
bằng overflow:visible!important; chính clip-path giữ reveal và ink allowance,
không bỏ mask hoặc animation để hết glyph clipping.

Body normal proof phát hiện About thiếu SplitText tại direct entry làm toàn
fade/up/media/kicker ẩn. HTML reuse deferred local GSAP3.15→SplitText3.15 như
Residential/Commercial trước detail.js/motion.js; không thêm thư viện mới,
không mở About text splitting vì splitRoute vẫn loại About. Không blanket
override reveal bằng CSS. [Evidence](../verification/mobile-layout-parity-2026-09-28.md#l03l04--homeabout-và-body-paint)
giữ hero scoped120/120 trước body amendment và state/body verification đang mở.
Home→About vẫn có baseline hard navigation khi menu DOM child count khác;
dependency pair sửa direct/native entry, không biến nhánh này thành soft entry.

L03H bổ sung: mọi Home-origin route chuyển mềm tới Residential/Commercial phải
mount hero reveal với đủ local GSAP3.15 và SplitText3.15 như direct route;
không để kicker/copy opacity0 sau transition settle. Home entrypoint nạp cặp
deferred local này theo cùng thứ tự trước Locomotive/Barba/detail.js. Đây là
dependency preservation cho behavior đã duyệt, không đổi timing/motion design,
hard/soft navigation semantics hoặc reveal của route khác. Kiểm trực tiếp và
Back/Forward ở VI/EN trên Chromium/Firefox/WebKit; static guard bắt đúng thứ
tự dependency. Historical body/history proof trước L03H không đại diện current
Home asset hash. [Named RED](../verification/mobile-layout-parity-2026-09-28.md)
ghi rõ Firefox Home→Residential thiếu SplitText sau4 giây, DOMContentLoaded đã
phát và kicker không có mutation; nguyên nhân không phải thiếu ready event.

L04 breakpoint proof tại981×390 và982×390 còn header/title/filter overlap.
Advertising intrinsic rows được mở đến1024px, giữ geometry độc lập toolbar
height; scope wrap của Residential/Commercial vẫn≤980px. Breakpoint suite và
state subset phải kiểm lại exact candidate, không suy scoped hero proof thành
full layout acceptance. Label expand collapsed và indicator một trang có
accepted hidden state riêng; keyboard expanded label và icon/control vẫn phải
được kiểm paint/hit/focus đầy đủ.

Photo document Escape phải nhường modal menu đang mở; native cancel tiếp tục
đóng menu và trả focus opener. Photo/category/tag/seed/query/history entry giữ
nguyên trong Escape đóng menu hoặc viewer. Khi không có modal, Escape giữ
behavior photo→grid/history hiện hành. Preservation amendment L04 chỉ thêm
guard vào handler đã có; không thêm controller hoặc sửa motion timing.

<a id="l04h-about-route-history--draft-2026-09-28"></a>

### L04H — history qua About khi shell không tương thích — accepted

**Module:** `site-mobile-layout-parity`. **Status:** owner duyệt delta ngày
28/09/2026 bằng “Duyệt delta L04H”. Anchor draft giữ cho link cũ; plan
implementation là gate kế tiếp, runtime chưa đổi theo delta tại lúc duyệt.

L04 WebKit history trên current L03H candidate ghi About→Residential đã tới
đích rồi tự tải lại cùng URL sau transition; sau đó Back/Forward có lần kết
thúc sai trang. `persistent-shell-map.json` đo VI/EN trên5 canonical route:
Home, Residential, Commercial và Advertising có cùng cấu trúc persistent;
About khác đúng một nhánh `#site-menu`, 4 children so với6. So About với bốn
route kia đều mismatch hai chiều; các cặp còn lại match. `syncElementTree`
hiện trả false sau khi Barba đã push URL rồi `hardNavigate` tải lại, khiến
history có thể chứa entry thừa. [Raw và timeline](../verification/mobile-layout-parity-2026-09-28.md)
giữ riêng; không quy đây là lỗi fixture.

Đề xuất: link nội bộ VI/EN đi qua biên About↔Home/Residential/Commercial/
Advertising dùng native browser navigation ngay tại click, trước khi Barba
thêm history entry. Mỗi click tạo đúng một đích trong history; Back trở về
trang xuất phát, Forward trở lại đích, không tự nạp lại cùng URL sau một
soft transition thất bại. Nội dung, locale/query hợp lệ, scroll/focus, menu,
script readiness và controls của mỗi trang vẫn dùng contract hiện hành.
Các cặp có shell tương thích tiếp tục Barba/motion như trước; không đổi
`hardNavigate` global, viewer photo/tag popstate, motion timing hay thiết kế.

Verification: record VI/EN × bốn cặp About hai chiều × Chromium/Firefox/WebKit
tại mobile portrait/landscape đại diện, direct click→Back→Forward, final URL,
namespace, document identity/history entry và lỗi console/network. Giữ matrix
660/current body và random/skeleton/scrollbar/viewport regressions; actual
A05s sau L-B, Safari/iPhone vẫn thiếu thiết bị thật. Nếu phát hiện programmatic
`barba.go` hoặc popstate của entry cũ đi qua mismatch, giữ failure riêng và
soạn delta tiếp theo trước khi mở rộng handler. Đây là boundary mới cần owner
duyệt trước khi sửa `src/site/motion.js` ngoài ownership plan L04.

<a id="l04r-readable-content-floor--draft-2026-09-28"></a>

### L04R — chiều cao tối thiểu cho chữ/control Advertising — accepted

**Module:** `site-mobile-layout-parity`. **Status:** owner duyệt delta và plan
ngày28/09 bằng “duyệt, và máy điện thoại là A05s.”; runtime geometry chưa sửa
tại thời điểm approval. Alias draft giữ cho links cũ. Không mở viewer gesture/history/glass.

Named RED tại `diagnostic-2026-09-27T19-25-05-591Z`, Chromium390×844/200%:
CTA tail còn74px nhưng heading cao375.23px; copy/link bị cắt. Photo pager còn
32.06px nhưng một dòng cao44.80px/glyph40px; ngay một từ cũng bị cắt. Đây
constraint runtime, không chỉ CSS wrap. Expanded label có CSS correction riêng.

Đề xuất ưu tiên full copy/control khi geometric cap không đủ: giữ typography,
gap/footer padding và geometry mặc định nơi đang fit. CTA tail lấy max giữa
height hiện hành và minimum đo từ heading/link/gaps trong rows hiện hành;
footer vẫn cách CTA bằng shared gap đã accepted, không chồng hoặc che CTA.
Không bắt CTA+footer nằm trong một viewport khi text/control floor không thể fit.

Photo info phải chứa category, CTA, indicator cần thiết, gaps và ít nhất một
dòng mô tả đầy đủ. Pager vẫn chia nội dung, ArrowLeft/Right đi đủ pages, không
ẩn/cắt chữ hoặc font shrink. Khi floor này vượt cap28%/trần viewport của P7.2,
chỉ nới chiều cao tối thiểu cần thiết; primary tiếp tục contain ảnh, related
grid bắt đầu sau primary và user cuộn bình thường. Không đổi intrinsic ratio,
default columns/spacing/random/history hoặc vị trí suggestion theo span.
Image zone không được co xuống mức làm expand control/focus label bị che;
minimum phải gồm control paint/hit area và edge spacing thực. Khi tổng minimum
ảnh/control/info vượt vùng nhìn, primary tăng chiều cao và user cuộn để tiếp
cận; không tạo image zone1px để giữ một trần không thể đáp ứng.
P7.2 cap giữ nguyên khi floor fit; exception này chỉ thay tình huống không đủ
chỗ cho một dòng/control. Không hardcode root32px hoặc detect model/browser.

Metrics dùng stable layout basis và actual typography, không visible toolbar
height. Toolbar hiện/ẩn vẫn giữ geometry≤1px; true width/orientation/text-size
change được reflow. Common skeleton/deck/reveal/context≤2 không reset do scroll.
Pure layout API giữ default behavior cho consumer không truyền minimum mới;
không thêm dependency/renderer/controller.

Acceptance: named CTA/pager RED→GREEN100/200% VI/EN dọc/ngang3engines; đủ mọi
description page bằng keyboard và có indicator khi nhiều page. Final660 matrix,
menu/viewer/photo Escape/query/focus, random/footer/lifecycle/scrollbar/viewport
regressions và Android USB vẫn bắt buộc. iPhone/reference/MCP/owner giữ gate
riêng. Build `pnpm prepare:site`; unit entrypoints photo/products layout, runner
`node tests/site/mobile-layout-parity.e2e.mjs --phase final --scope advertising-states`;
plan/ownership chi tiết tại L04R trong `tasks/plan.md`.

Owner đính chính Android là A05s ngày28/09; target của initiative viewport/layout
hiện tại là Chrome/A05s và Safari/iPhone. Các đoạn ghi A54 trước đây là nhãn
cũ, không yêu cầu thêm A54 physical để nghiệm thu module hiện tại. USB model
SM-A057F giữ đúng identity; historical release FPS gate A54 là work riêng,
không dùng correction này để retag bằng chứng hoặc đóng gate đó.

<a id="site-overlay-layer-order--draft-2026-09-28"></a>

## Thứ tự lớp UI toàn website — accepted 2026-09-28

**Module:** `shared-shell-layer-order`. **Status:** owner duyệt delta ngày
2026-09-28. M02b supersede riêng các yêu cầu lớp clone card↔detail bên dưới;
chỉ morph primary↔viewer còn hoạt động. Menu/viewer vẫn trên navbar; mở modal
mới đóng modal cũ và bàn giao focus/scroll lock. Các mức còn lại đã được duyệt
cho public route VI/EN; viewer chỉ có ở Advertising.

| Mức từ trên xuống | Contract đã duyệt |
| --- | --- |
| Modal | Full menu hoặc viewer trong native top layer; controls trên backdrop. Tối đa một modal active; focus ở modal, Escape xử lý trước photo/history. |
| Shell | Custom desktop scrollbar trên header, nhưng không nhận drag khi modal khóa nền. Navbar giữ thứ tự trên nội dung; mobile giữ native indicator. |
| Chuyển trang | Route veil active dưới header, trên CTA/content; idle không chặn paint hoặc hit target. Menu đóng theo route flow hiện hành. |
| Nội dung nổi | Floating CTA dưới veil/header, trên content; không chặn pointer/focus hoặc entry scroll. |
| Nội dung trang | Hero shade, glass, primary/action, skeleton, card/copy giữ thứ tự cục bộ; không nâng thành overlay global. |

Khảo sát local8792 tám route VI/EN ngày 28/09 từng ghi nhận lớp clone
card↔detail cùng parent `body` với header/veil/CTA. Đây là evidence lịch sử,
không còn là assertion runtime sau M02b; không thay nền header hoặc mask content.
Viewer native top layer tiếp tục có thứ tự modal riêng. Raw survey:
`.tmp/z-order-survey-20260928T061400035Z/runtime.json`.

| Acceptance tập trung | Bằng chứng cần có |
| --- | --- |
| VI/EN desktop smooth/mobile native; grid/related↔photo Back/Forward, header transparent/collapsed và resize | Không có clone card↔detail hoặc lớp phủ sót; content/control không bị mask, focus và entry scroll giữ nguyên. |
| Route transition active/idle và CTA | Frame paint/hit-test: `header > veil > CTA > content` khi active; idle veil không chặn pointer/focus hoặc gây nền trắng. |
| Menu↔viewer, Escape/đóng | Tối đa một modal active/backdrop; handoff đóng modal cũ không trả focus trung gian ra nền, focus trực tiếp modal mới và giữ scroll lock liên tục. Khi modal mới đóng, dùng `preventScroll` trả focus về opener mới nếu còn connected/visible/enabled; nếu không về menu toggle shared header, rồi header logo khi cần. Giữ entry scroll, không có frame nền tự cuộn. |

Giữ [motion](../design/motion.md), [menu](full-menu-reference-parity.md),
[viewer/morph](advertising-photo-browse.md) và regression geometry/history.
Không đổi layout, màu, chữ, glass, media, zoom hay timing. L06 viewer EN
touch-close/CDN vẫn RED độc lập. Owner phải duyệt plan trước sửa
source/test.

## Chú thích thuật ngữ

- **Brand shell**: header, full menu và footer dùng chung giữa các route.
- **True bounding box**: hình chữ nhật nhỏ nhất bao trọn pixel hoặc geometry thật.
- **Scroll coordinate system**: hệ tọa độ dùng để xác định vị trí cuộn.
- **Focused test**: test chỉ chạy contract đang thay đổi.
- **Social placeholder**: icon đã hiển thị nhưng chưa điều hướng khi URL chưa có.
- **Tracking**: khoảng cách áp dụng đều giữa các ký tự trong một dòng chữ.
- **Cap-height**: chiều cao glyph chữ hoa cơ sở, không tính dấu tiếng Việt.
- **Subpixel**: phần kích thước nhỏ hơn một CSS pixel do trình duyệt nội suy.
- **Overlay scrollbar**: thanh cuộn phủ lên viewport, không lấy width của layout.
- **Gutter**: phần width được chừa cho scrollbar hoặc khoảng đệm layout.
- **Small viewport**: vùng layout khi các browser toolbar động đang mở rộng;
  kích thước giữ ổn định khi toolbar tự thu gọn do scroll.
- **Visible rect**: phần trang thực đang nhìn thấy, có thể đổi bởi toolbar,
  native zoom hoặc keyboard mà không đồng nghĩa layout phải re-pack.
- **Modal top layer**: lớp native của trình duyệt cho dialog mở bằng `showModal()`.
- **Footprint navbar**: vùng hình học thực mà navbar chiếm trong viewport ở frame hiện tại.
