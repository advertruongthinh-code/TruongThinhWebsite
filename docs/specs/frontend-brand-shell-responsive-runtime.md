---
title: Brand shell và responsive runtime
type: frontend
status: accepted
updated: 2026-09-23
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
  phục hồi card đang xem để reverse morph theo AD-BROWSE-R1. Bấm mục khác
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
- Contract chi tiết và matrix nằm trong
  [P7.1 correction](advertising-september-2026-p7-1-correction.md).

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

## Chú thích thuật ngữ

- **Brand shell**: header, full menu và footer dùng chung giữa các route.
- **True bounding box**: hình chữ nhật nhỏ nhất bao trọn pixel hoặc geometry thật.
- **Scroll coordinate system**: hệ tọa độ dùng để xác định vị trí cuộn.
- **Focused test**: test chỉ chạy contract đang thay đổi.
- **Social placeholder**: icon đã hiển thị nhưng chưa điều hướng khi URL chưa có.
- **Tracking**: khoảng cách áp dụng đều giữa các ký tự trong một dòng chữ.
- **Cap-height**: chiều cao glyph chữ hoa cơ sở, không tính dấu tiếng Việt.
- **Subpixel**: phần kích thước nhỏ hơn một CSS pixel do trình duyệt nội suy.
