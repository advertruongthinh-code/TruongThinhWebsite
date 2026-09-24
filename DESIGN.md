---
name: "Trường Thịnh public visual system"
description: "Hệ thống thị giác hiện hành của website public tĩnh Trường Thịnh."
colors:
  paper: "#fff"
  white: "#fff"
  ink: "#202120"
  muted: "#6c6c68"
  line: "rgba(32, 33, 32, 0.18)"
  blue: "#174f9b"
  orange: "#a34119"
  orange-accent: "#d85d2b"
  media-loading-surface: "#2b2c2b"
  media-label-overlay: "rgba(0, 0, 0, 0.4)"
  media-control-hover: "#ddd"
  media-control-active: "#c6c6c6"
  cta-black: "#000"
  mark-black: "#2b2a29"
  mark-yellow: "#ffed00"
  mark-magenta: "#e5097f"
  mark-cyan: "#00a0e3"
typography:
  body:
    fontFamily: "Plus Jakarta Sans, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  display:
    fontFamily: "Plus Jakarta Sans, Arial, sans-serif"
    fontSize: "clamp(5rem, 9vw, 10rem)"
    fontWeight: 600
    lineHeight: 0.86
    letterSpacing: "0.001px"
  label:
    fontFamily: "Plus Jakarta Sans, Arial, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "normal"
  filter:
    fontFamily: "Plus Jakarta Sans, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "normal"
  menu-title:
    fontFamily: "Plus Jakarta Sans, Arial, sans-serif"
    fontSize: "1.8rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
  detail-hero:
    fontFamily: "Plus Jakarta Sans, Arial, sans-serif"
    fontSize: "clamp(3.25rem, 8vw, 8.5rem)"
    fontWeight: 500
    lineHeight: 0.9
    letterSpacing: "0.001px"
  detail-statement:
    fontFamily: "Plus Jakarta Sans, Arial, sans-serif"
    fontSize: "clamp(2.7rem, 4.2vw, 4rem)"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  square: "0"
  circle: "50%"
spacing:
  gutter-wide: "35px"
  gutter-medium: "25px"
  gutter-narrow: "20px"
  section-gap-wide: "90px"
  section-gap-medium: "70px"
  section-gap-tight: "64px"
  gallery-gap: "20px"
components:
  menu-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "0"
    size: "65px"
    height: "100%"
  floating-cta:
    backgroundColor: "{colors.cta-black}"
    textColor: "{colors.white}"
    rounded: "{rounded.square}"
    padding: "9px"
    height: "25px"
    typography: "{typography.label}"
  gallery-control:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.circle}"
    padding: "0"
    size: "2.7rem"
  project-tile:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "0"
    width: "100%"
    typography: "{typography.label}"
  project-filter:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.square}"
    padding: "0"
    typography: "{typography.filter}"
  advertising-carousel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "0"
    width: "100%"
    height: "50vw"
---

# Design System: Trường Thịnh

**Contract hiện hành:** owner đã duyệt
[AD-FINAL-R1](docs/specs/advertising-final-polish-and-media.md) ngày2026-09-11:
delta về Advertising detail/continuation và typesetting cụm chữ logo. Bản đó
giữ nội dung và acceptance cùng các correction tiếp theo. Trạng thái triển khai
và giới hạn kiểm chứng xem [STATE](docs/STATE.md), evidence có ngày xem
[verification index](docs/verification/index.md). Không áp delta Advertising
lên các route khác hoặc dùng token như bằng chứng runtime PASS.

## Overview

**Creative North Star: "Công trình lên tiếng"**

Đây là bản ghi hệ thống thị giác public hiện hành, được tổng hợp từ source CSS, HTML, runtime và các contract đã chấp nhận. Hệ thống đặt công trình, vật liệu và tay nghề trước lời quảng cáo; nền giấy, khoảng trắng và nhịp editorial tạo chỗ cho hình ảnh và typography dẫn câu chuyện.

Typography Plus Jakarta Sans giữ một giọng nói thống nhất nhưng phân vai rõ cho display, body, label và detail hero. Mark đơn sắc là trạng thái nhận diện chuẩn; blue và orange là accent có chủ đích. Quy định màu và motion logo xem [Brand lockup](#brand-lockup--nguồn-chuẩn); implementation và focused verification được ghi tại đó. Espacio/R1 là candidate-composite-baseline có evidence cho nhịp và storytelling; hướng parity 1:1 được chấp nhận, còn exact revision hoặc cutoff chưa được khóa trong bản ghi này.

Các giá trị trong frontmatter là token normative. Mục nào ghi **accepted** là contract hoặc quyết định đã có; **observed** là hành vi đọc được từ source; **unverified** là khoảng trống cần audit runtime. Bản ghi này không tạo component API mới và không biến surface brief thành rule toàn hệ thống.

**Key Characteristics:**

- Công trình, vật liệu và tay nghề đứng trước lời quảng cáo.
- Nền giấy và khoảng trắng tạo nhịp editorial cho ảnh và typography.
- Typography Plus Jakarta Sans phân biệt display, body và label.
- Nhận diện theo [Brand lockup](#brand-lockup--nguồn-chuẩn); blue/orange là accent.
- Motion có reduced-motion final state và không sở hữu nội dung.

Nguồn chính: `src/site/style.css:1-14`, `src/site/style.css:83-84`, `docs/specs/frontend-route-and-content.md`, `docs/design/style-guide.md`. Dynamic visual audit chưa chạy trong task này; canonical parity hiện vẫn **NOT PASS** vì các row `fail`, `blocked` và `unmapped` còn tồn tại, không được suy ra PASS từ việc thiếu run.

## Colors

Palette là nền giấy sáng, chữ ink gần đen, muted text và line trong suốt; blue và orange xuất hiện như accent nhỏ cho route, focus, action và state. `media-loading-surface` là trạng thái chờ media, còn `cta-black` chỉ giữ tương phản của CTA nổi.

### Primary

- **Blue** (`{colors.blue}`): accent cho route, một số indicator và focus phụ của motion toggle.
- **Orange** (`{colors.orange}`): focus-visible, accent hành động và điểm nhấn tương tác.
- **Orange accent** (`{colors.orange-accent}`): hover hoặc transition cần màu cam sáng hơn.

### Neutral

- **Paper** (`{colors.paper}`) và **White** (`{colors.white}`): surface sáng; hai token cùng giá trị vì source giữ cả hai tên.
- **Ink** (`{colors.ink}`): chữ, icon và nền tối của các vùng cần tương phản.
- **Muted** (`{colors.muted}`): metadata, label phụ và trạng thái chưa chọn.
- **Line** (`{colors.line}`): đường phân cách nhẹ; không dùng để tạo card grid dày.
- **Media loading surface** (`{colors.media-loading-surface}`): placeholder media trước khi ảnh sẵn sàng.
- **Media label overlay** (`{colors.media-label-overlay}`): lớp đen 40% trên portal homepage và suggestion inactive; giữ nguyên độ tối khi hover/focus, chỉ ảnh zoom.
- **CTA black** (`{colors.cta-black}`): nền CTA nổi; không phải token nền toàn trang.

### Brand mark

Màu, geometry và motion logo có một authority tại [Brand lockup](#brand-lockup--nguồn-chuẩn). Palette ở frontmatter giữ giá trị token; không lặp state contract ở phần Colors.

**The Accent Rarity Rule.** Blue và orange phải giữ vai trò accent để công trình và nền giấy còn là trọng tâm; không phủ toàn bộ surface bằng accent.

## Typography

Plus Jakarta Sans, với Arial sans-serif làm fallback, là font stack quan sát được ở body và brand lockup. Body dùng cỡ nền 16px, weight 500 và line-height 1.4; word-spacing body và display giữ theo source CSS. Display hero dùng weight 600, line-height 0.86 và tracking display 0.001px. Detail hero dùng weight 500 và line-height 0.9 để tiêu đề lớn không cạnh tranh với ảnh; detail statement dùng weight 600 và line-height 1.4.

- **Body:** đọc nội dung, metadata và đoạn văn; giữ sentence case, không ép toàn bộ copy thành uppercase.
- **Display:** hero và headline lớn; dùng clamp theo token để typography co theo viewport.
- **Label:** caption và navigation nhỏ; source dùng weight 700 và cỡ 0.8rem, thường uppercase.
- **Filter:** filter Advertising dùng weight 700, cỡ 1rem và line-height 1.4; trạng thái chọn dùng underline 3px.
- **Detail hero:** tiêu đề nhóm hoặc trang detail; giữ nhịp rộng và line-height chặt của source.
- **Detail statement:** statement lớn trong detail; dành đủ khoảng thở để câu chuyện không thành label.

**The Reading-First Rule.** Display tạo nhịp, body truyền thông tin, label định vị control; không dùng weight hoặc tracking display cho đoạn đọc dài.

Nguồn: `src/site/style.css:15-80`, `src/site/style.css:1018-1040`, `src/site/detail.css` các selector hero/statement; font brand inline tại `src/site/advertising-products/index.html`.

### Advertising caption

Caption card giữ `"Plus Jakarta Sans", Arial, sans-serif`, không dùng font Silka
của reference. Các metric khác khớp computed/rendered behavior của Espacio
Projects:

- khoảng từ đáy ảnh tới line box caption là `10px`;
- caption uppercase, `font-weight: 700`, không có padding đáy;
- tới viewport `578px`, Trường Thịnh dùng `font-size: 10.5px`, line-height
  `15.68px`; target visual cap-height của glyph `H` là `8px` ở DPR `1`;
- từ viewport `579px`, Trường Thịnh dùng `font-size: 12px`, line-height
  `17.92px`; target visual cap-height là `9px` ở DPR `1`. Hai font-size này bù
  cap metric khác Silka; không copy `12.8px` của font reference;
- dấu tiếng Việt như `Á`, `Ả`, `Ắ` không bị clip; caption không dùng
  `overflow: hidden` để đạt chiều cao giả. Ink bounds phải nằm trong line box
  với tối thiểu `1px` khoảng an toàn phía trên và dưới ở DPR `1`;
- sau line box caption, khoảng tới media card tiếp theo là đúng vertical gap
  theo responsive `interCardGap`. Horizontal gap, vertical Masonry gutter và
  caption rhythm phải được đo riêng, không suy ra từ line-height.

## Layout

Menu mở theo MENU-R1 (24/09/2026): head full viewport; logo cao67,515625px
trên1200px và59,578125px bên dưới, lề35/25px. Nhóm chuyển4/3/2/1 cột ở
1200/960/578px. Mobile CTA giữ icon và chữ ở hàng thứ ba; tablet579–960px
ẩn CTA như reference. Title1,8rem, dòng link22,4px, gap15px; font và nội dung
Trường Thịnh giữ nguyên nên title dài được wrap. Navbar đóng không đổi.
Contract: [menu parity](docs/specs/full-menu-reference-parity.md).

Public shell dùng markup lặp lại giữa route và shared CSS/runtime; source không có `Header`, `Footer` hoặc `Shell` component API để tài liệu hóa. Header, full menu, footer, VI/EN switch và CTA giữ cùng contract; route-specific content nằm trong template tương ứng.

Footer chung toàn site chỉ chứa trụ sở, mạng xã hội và bản quyền theo owner
chốt13/09/2026. CTA/lời mời riêng nằm trước footer. Footer dùng hai cột thông
tin trên desktop, một cột trên mobile; hàng bản quyền min-height72px, căn
giữa dọc, không padding cuối hoặc min-height toàn khung tạo khoảng trắng dư.
Native đã đo222px desktop và330px mobile với nội dung/cỡ chữ mặc định.

Gutter mặc định là `35px`, giảm còn `25px` ở max-width `1200px` và `20px` ở max-width `680px`. Section gap mặc định là `90px`, có state `70px` ở max-width `1200px` và `64px` ở max-width `680px`, với một số section có override theo source. Header/nav chuyển state ở `960px`, `750px`, `680px` và `578px`; layout acceptance vẫn phải kiểm tra 320, 390, 768, 1024 và 1440px.

Detail project grid giữ max-width `1500px`, bốn cột desktop và gap theo gutter. Detail intro/content giữ max-width khoảng `1370px`; gallery dùng outer gutter và track gap của source. Advertising browse dùng `compileAdvertisingProductLayout`, `advertisingSpacing`, `columnsForWidth` và `getVirtualWindow`; policy public một cột gọi kernel `compileAdvertisingLayout` hiện có, không tạo solver thứ hai. Catalog runtime gắn vào `[data-project-grid]` và `[data-advertising-filter]`.

**The Focal Grid Rule.** Layout mở chỗ cho ảnh, statement và khoảng thở; không thêm wrapper hoặc card grid chỉ để lấp khoảng trống. Mọi composition mới phải giữ route contract và source data.

Nguồn: `src/site/style.css:1-14,1153-1177`, `src/site/detail.css` grid/gallery rules, `src/site/advertising-products/layout-core.mjs:99-167`, `src/site/advertising-products/catalog-runtime.mjs:67-71`.

## Elevation & Depth

Hệ thống hiện hành thiên về flat/tonal layering: paper, ink, line và loading surface tạo phân lớp; không có vocabulary box-shadow chung cho card. Bóng duy nhất được ghi nhận là text-shadow của caption gallery và không được nâng thành token container. Focus ring là tín hiệu tương tác, không phải elevation. Dynamic shadow behavior ngoài các source refs dưới đây là **unverified**.

### Shadow Vocabulary

- **Gallery caption:** `text-shadow: 0 1px 8px rgba(0,0,0,0.55)` để chữ đọc được trên ảnh; observed tại `src/site/detail.css:439-440`.
- **General containers:** không thêm box-shadow mặc định; dùng surface, line và khoảng cách.

**The Flat Surface Rule.** Dùng tonal surface và khoảng thở để phân lớp; chỉ thêm shadow khi source component có bằng chứng cụ thể.

## Shapes

Form language mặc định là góc vuông (`0`); không có radius scale tổng quát. Nút điều khiển gallery là ngoại lệ hình tròn (`50%`) với kích thước observed `2.7rem`. Media dùng clipping để giữ tỷ lệ và hover scale; clipping không đồng nghĩa với bo góc. Focus-visible là outline orange 2px, offset 4px, phải còn rõ trên nền sáng và ảnh.

Owner correction ngày 2026-09-10: nút trong Advertising photo view/viewer phải
dùng góc vuông theo ngôn ngữ chung, có hover motion; ngoại lệ gallery tròn
không còn là target cho flow này. [AD-BROWSE-R1/R2](docs/specs/advertising-photo-browse.md#r2--detail-và-responsive-layout)
giữ contract expand gọn/mở nhãn và icon reset; P1.3 bỏ Back riêng. Control
vuông48px, nét1,5px, hover/focus mở nhãn250ms và đổi nền150ms. Correction
viewer dùng trắng `#fff`, hover `#ddd`, pressed `#c6c6c6`; disabled nền
`#f3f3f1`, icon `#91918c`, không hover motion. P1.4 đưa CTA vào dưới trái
vùng ảnh, expand ở dưới phải; cùng trạng thái control và nhãn mở vào trong.
Đây là trạng thái riêng của Advertising, không mở palette mới cho nội dung
hoặc suy rộng thành thay gallery khác.

P1.4 cho phép riêng nền hero duplicate cover+blur, bị clip trong vùng ảnh;
foreground luôn contain trọn tỷ lệ. Title detail giảm về2rem/600, một luồng
chữ cách12px và giữ cỡ body. Owner bỏ hàng nhãn dưới mô tả, dùng cụm gợi ý
để lọc ảnh. Geometry ngang3 cột/đứng-vuông2 cột,
cap viewport và dải ảnh dưới theo [contract P1.4](docs/specs/advertising-photo-browse.md).

Menu button và CTA không dùng pill treatment. Việc thêm radius cho card, filter hoặc shell là thay đổi design system và cần evidence riêng.

**The Frame Rule.** Khung vuông và đường thẳng giữ cảm giác editorial/xưởng; hình tròn chỉ dành cho control gallery cần nhận biết nhanh.

## Components

Shared choreography: [Motion design system](docs/design/motion.md). Component
geometry: [Patterns](docs/design/patterns.md). Runtime/API: [Components guide](docs/design/components.md).

Các component dưới đây là pattern đã quan sát hoặc contract đã chấp nhận. Public source là static markup + shared CSS/runtime; tên mô tả không phải API mới.

### Public shell, brand và menu

#### Brand lockup — nguồn chuẩn

**Revision:** LOGO-R4, owner duyệt delta logo ngày 2026-09-20. **Design status:** accepted.
**Implementation status:** đã triển khai và qua gate kỹ thuật ngày 2026-09-20;
owner preview VI/EN còn mở. Evidence LOGO-R3 chỉ là lịch sử.

**Mục đích:** cụm nhận diện Trường Thịnh cân đối theo hình dựng tỷ lệ owner cung
cấp; menu giữ nhịp Espacio với màu logo sẵn sàng khi xuất hiện. Không đổi hình
bốn path của mark, nội dung chữ hoặc các section ngoài logo.

**Hình học và chữ:**

- Gọi H là chiều cao mark ở từng state hiện có; giữ H, đặt Y = H/6 và X = 2Y.
  Khoảng ngang từ cạnh phải hình mark đến cạnh trái phần chữ hiển thị bằng Y.
- Khối chữ hai dòng cao 4Y, bao gồm khoảng giữa dòng; căn giữa dọc để khoảng
  trên và dưới so với mark đều Y. Đo ink bounds của nguyên dòng, gồm mọi dấu
  thanh và dấu cấu tạo chữ Việt. Dấu phải hiển thị trọn, không chồng dòng.
- Owner chốt lại ngày2026-09-13: khối chữ cao4Y, padding trên/dưới và
  khoảng ngang tới mark đềuY; cho phép cân cỡ title, subtitle và khoảng dòng.
  Mọi bounding box chữ phải tính cả dấu. Lời nhắc X=2Y trước đó không có
  nghĩa cả khối chữ cao2Y; câu trả lời sau cùng xác nhận khối4Y.
- Cân quang học R4: tỷ lệ thân chữ không tính dấu subtitle/title bằng
  `0,618±0,005`; full ink bounds theo từng locale vẫn cao `4Y`. Hai dòng cân mép
  trong tolerance `0,5 CSS px`, khoảng dòng gọn và không kéo giãn glyph.
  Footprint, font600, mark và motion giữ nguyên.
- Canonical VI dùng title `46.68365`, subtitle `28.85050`, baseline subtitle
  `147.19920`. EN typeset riêng bằng CSS: title `58.10527px` tại
  `translate(0.00002px, 11.60012px)` và subtitle `35.90906px` tại
  `translate(-1.3218px, 5.74706px)`. Hai locale cùng đạt thân chữ `0,618`,
  khối ink `4Y`, padding trên/dưới `Y`, gap ngang `Y` và khoảng dòng gọn.
  Tracking dùng `textLength` với `lengthAdjust="spacing"`; không dùng
  `spacingAndGlyphs` hoặc scale ngang.
- Giữ font Plus Jakarta Sans, weight 600 và copy title/subtitle hiện có;
  EN là INTERIORS · ADVERTISING. Chọn font-size theo ink height sau font ready,
  điều chỉnh vị trí và tracking theo locale để cân rộng; không kéo giãn glyph bằng
  spacingAndGlyphs hoặc scale ngang. Dấu không được clip khỏi SVG.

Font delivery hiện hành dùng Google Fonts trong HTML public; LOGO-R3 giữ
pipeline này. Từ “local” trong bản ghi trước không khớp source/runtime đã kiểm
ngày 2026-09-09; không có migration font trong thay đổi logo.

**Height matrix theo reference được đo lại:**

- CSS outer bounding box của lockup header khớp height Espacio: expanded
  `67.515625px` trên `1200px`, `57.59375px` tại `≤1200px`, sticky
  `49.640625px` ở mọi viewport. Full menu
  là `67.515625px` trên `1200px`, `59.578125px` tại hoặc dưới `1200px`.
  Chiều ngang vẫn theo aspect ratio Trường Thịnh, không sao chép Espacio.

**Motion:**

- Toàn cụm header chạy FLIP scale `300ms`, `expo.out` khi chuyển đúng hai state
  expanded/sticky có bbox khác nhau. Thu nhỏ và phóng lớn đều phải có frame
  trung gian, kết thúc đúng endpoint và chạy song song với motion màu của mark.
  Mobile cũng có hai state khác size và chạy cùng FLIP. Full menu và reduced
  motion không chạy spatial scale. Espacio live cung cấp endpoint nhưng đổi size ngay frame đầu;
  nội suy mượt là behavior Trường Thịnh đã được owner xác nhận, dùng nhịp `300ms`
  từ code cũ và timing header/color của reference.
- Chỉ mark đổi màu khi header chuyển expanded/sticky: monochrome theo tone khi
  expanded và CMYK khi sticky. Wordmark đổi màu tức thời. Chỉ giữ phương án
  `sequence`; query `logo-motion` cũ không được đổi behavior. Mọi path có
  `duration + delay = 1s`, còn FLIP scale toàn lockup giữ `300ms`.
- Menu: mark có sẵn màu CMYK từ frame đầu logo nhìn thấy. Bỏ pha đen sang
  CMYK khi mở menu; không flash đen trong quá trình đóng hoặc mở lại. Giữ
  entrance vị trí y -140 → 0 và opacity 0 → 1 cùng các motion menu còn lại.
- Header và cross-route: chuyển màu hai chiều từ rendered state hiện tại khi
  bị interrupt; không nhảy/reset màu nhìn thấy, không giữ state cũ sau cleanup.
  Ngoại lệ menu dùng contract màu riêng ở trên, không ép cùng state khởi đầu.
- Reduced motion đi thẳng final state; không phụ thuộc animation để hiện logo.

**Nghiệm thu:** đo sau document.fonts.ready bằng SVG/Canvas và computed style;
kiểm ink height, hai mép chữ, khối chữ/khe/padding, toàn bộ dấu và height matrix.
Focused test phải bao phủ VI/EN, desktop/mobile, header/menu, mở-đóng-mở,
interrupt, direct load, soft navigation, Back/Forward và reduced motion.
Sai số khóa trước implementation: ink-height ratio ±0.005; gap, padding và
hai mép ink ±0.5 CSS px sau font ready; outer height ±0.05 CSS px ở endpoint.
Đo nguyên dòng bằng Canvas TextMetrics ở font-size 1000 rồi scale về kích
thước render, kết hợp SVG CTM để tính cả dịch chuyển locale; giảm sai số hinting
và kiểm ink không chồng dấu. Sai số
không cho phép đổi font, bóp glyph hoặc cắt dấu. Mở local preview cho owner
xem khi source website thay đổi.

**Integration và evidence:** DOM/lifecycle/QA thuộc
[brand shell spec](docs/specs/frontend-brand-shell-responsive-runtime.md);
reuse entrypoint thuộc [component guide](docs/design/components.md#public-shell-static-markup).
Không dùng report cũ làm PASS cho LOGO-R3.

### Editorial project tile

- **Status:** observed.
- **Visual contract:** media ưu tiên tỷ lệ `3/4`, feature `3/2`, landscape `4/3`; caption label weight 700 và media hover scale trong khoảng source. Tile không thêm shadow hoặc radius.
- **Source:** `src/site/style.css` project tile selectors và route galleries.
- **Verification:** asset/static checks có trong source; full visual crop audit là **unverified**.

### Advertising browse grid và filter

- **Status:** accepted contract; dynamic visual state observed from runtime source.
- **Visual contract:** filter `all` và sáu nhóm; grid desktop/tablet/mobile; no-script fallback vẫn có card; virtual window chỉ mount phần cần thiết. List item giữ `aria-posinset` và `aria-setsize`.
- **Runtime contract:** `compileAdvertisingLayout(options)`, `getVirtualWindow(layout, options)`, `mountAdvertisingCatalog(container, {signal})` và `unmountAdvertisingCatalog()` là API source hiện có; không tạo wrapper khác.
- **States:** filter/query, full/virtual window, media pending/loaded/revealed, dependency ready/failure/retry, VI/EN, direct/Barba/history/remount, abort/cleanup và reduced motion.
- **Source/tests:** `src/site/advertising-products/layout-core.mjs:29-167`, `src/site/advertising-products/catalog-runtime.mjs:67-71,617-621`, `tests/site/advertising-products-layout.test.mjs`, `advertising-products-lifecycle.test.mjs`, `advertising-products-media.test.mjs`, `advertising-products-static.test.mjs`, browser checks trong `tests/site/site.e2e.cjs:4811-5671`.

### Generic horizontal gallery

- **Status:** observed/accepted interaction contract.
- **Visual contract:** track có scroll snap, gap `20px`, controls tròn, prev/next có label/aria; media không bị ẩn khi reduced motion.
- **Runtime contract:** selectors `[data-gallery]`, `[data-gallery-track]`, `[data-gallery-prev]`, `[data-gallery-next]`; lifecycle tại `window.TruongThinhDetail.mount()`.
- **Source/tests:** `src/site/detail.js:691-759`, `src/site/detail.css:346-440`, `tests/site/site.e2e.cjs:8063-8120`. Dynamic parity với reference là **unverified**.

### Advertising detail composition và carousel

- **Status:** accepted data/template contract; dynamic dependency behavior observed.
- **Visual contract:** sáu detail route dùng shared template; layout thay bằng data `category`, `layoutKey` và ordered block list. Block kinds hiện có `titular`, `paragraph`, `facts`, `gallery`, `single`, `double`, `columns`, `banner`.
- **Runtime contract:** native carousel được render trước với `data-advertising-carousel-state="native"`; Swiper là progressive enhancement, failure giữ native, reduced motion đặt speed 0 và destroy dọn lifecycle.
- **Source/tests:** `scripts/site/prepare-static-assets.mjs:80-154`, `src/site/detail.js:151-213`, `src/site/detail.css:1773-1969`, `tests/site/advertising-products-detail-routes.test.mjs`, `advertising-products-media.test.mjs`, browser checks `tests/site/site.e2e.cjs:7246-7386`.

### Floating CTA

- **Status:** observed public pattern; destination remains partially unverified.
- **Visual contract:** CTA nổi dùng nền đen, chữ trắng, góc vuông, đặt ở góc phải dưới; hover đảo nền/chữ theo source. Không che nội dung và không giả định href Zalo thật.
- **Source:** `src/site/style.css` floating CTA selectors; placeholder href và owner unknown được ghi trong `PRODUCT.md`.
- **Verification:** layout/static presence có source evidence; Zalo conversion path thật là **unverified**.

### Admin primitives

- **Status:** dormant/dev; excluded from public visual system.
- **Visual contract:** admin có button/field/record/resource tabs riêng và trust boundary riêng. Chỉ dùng khi làm CMS/dev; không copy token hoặc primitive admin vào public route.
- **Source:** `src/admin/admin.css`, `src/admin/admin.js`, `src/worker/index.js`.
- **Verification:** không thuộc public release gate; runtime state là **unverified** và không được trình bày như public evidence.

## Do's and Don'ts

### Do:

- **Do** giữ frontmatter làm nguồn normative cho token; sidecar chỉ thêm metadata, motion, breakpoint, shadow, specimen và provenance.
- **Do** áp dụng [Brand lockup](#brand-lockup--nguồn-chuẩn), kiểm design target và implementation gap trước khi sửa logo.
- **Do** để công trình, vật liệu, xưởng và tay nghề dẫn hierarchy; dùng blue/orange làm accent có chủ đích.
- **Do** giữ keyboard focus, VI/EN leaf copy, alt/aria và reduced-motion final state trong mọi surface.
- **Do** tái sử dụng contract thật của catalog/detail runtime và ghi rõ accepted, observed, dormant hoặc unverified.

### Don't:

- **Don't** tạo component API Header, Footer, Shell hoặc catalog wrapper không có trong source.
- **Don't** thêm token, ramp production, shadow, radius hoặc breakpoint không có provenance.
- **Don't** dùng route legacy, URL Zalo placeholder, năm thành lập hoặc warranty như dữ kiện đã xác nhận.
- **Don't** sao chép source, media hoặc nội dung từ reference; composition alignment dùng measured baseline và accepted Trường Thịnh delta.
- **Don't** trình bày admin dormant, semantic index đang stale hoặc dynamic audit chưa chạy như bằng chứng parity.

## Chú thích thuật ngữ

- **Normative token**: token trong frontmatter được dùng làm nguồn giá trị chuẩn.
- **Sidecar**: `.impeccable/design.json`, phần mở rộng chứa metadata không thuộc token primitive.
- **Surface**: bề mặt hoặc route có strategy riêng trong `.impeccable/surfaces/`.
- **Observed**: hành vi hoặc giá trị đọc được từ source hiện tại.
- **Accepted**: contract hoặc decision đã được owner/spec chấp nhận.
- **Unverified**: chưa có evidence runtime đủ để kết luận.
- **Progressive enhancement**: native behavior chạy trước, dependency nâng cấp khi sẵn sàng.
