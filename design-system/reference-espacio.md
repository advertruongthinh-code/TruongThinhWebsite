# Tham chiếu Espacio

Espacio Home Design (`espaciohomedesign.com`) là site tham chiếu owner chọn:
phần lớn layout, nhịp chữ và nhất là motion của Trường Thịnh học từ đây. Đây
là số đo của Espacio, không phải giá trị Trường Thịnh: giá trị đang chạy ở
[README](README.md), [Motion](motion.md) và README từng component. Không copy
source, media, logo, font (Silka), SVG, URL hay copy của Espacio.

Bộ tham chiếu gồm ba file:

- File này: cách đọc, ánh xạ trang, header, chữ, layout, full menu, footer,
  scrollbar, breakpoint, mâu thuẫn và chỗ chưa đo.
- [Hero Espacio](reference-espacio-hero.md): title card từng loại trang, đo ở
  năm width.
- [Motion Espacio](reference-espacio-motion.md): timeline header, route, full
  menu, reveal, hover, scroll.

## Cách đọc số đo

- Đơn vị px và giây nếu không ghi khác. `F/L` là font-size/line-height
  computed; `x, y, w, h` là DOMRect ở `scrollY = 0`, tải nguội.
- Số từ bundle `main.min.js?v=0.021` và `main.min.css?v=0.021` (source) hoặc
  đo trên site live bằng DevTools, Playwright (live, phần lớn ngày 2026-08-01).
- Gom từ các báo cáo khảo sát cũ do ChatGPT và Codex viết, nay đã rời tree;
  Git còn giữ, xem [Nguồn](#nguồn). Raw evidence ở `research/reference-site/`
  trên máy owner. Site live có thể đã đổi.

## Ánh xạ trang

| Trang Trường Thịnh | Trang Espacio |
| --- | --- |
| Trang chủ | `/en` |
| Advertising | `/en/projects` |
| Residential | `/en/interior-design` |
| Commercial | `/en/kitchens` |
| About | `/en/about-us` |

Ánh xạ Advertising, Residential, Commercial theo
[quyết định SplitText](../docs/decisions/selective-splittext-editorial-reveals.md).

## Header

| Width | Cột grid | Rộng | Padding | Gap | Nav |
| --- | --- | --- | --- | ---: | --- |
| `> 1200px` | `170px 1fr 65px` | `calc(100% - 70px)` | `35px 35px 0` | 70 | 1 hàng, 5 mục cách 35px |
| `<= 1200px` | `145px 1fr 65px` | `calc(100% - 50px)` | `25px` | 25 | 1 hàng, cách 37.5px |
| `<= 960px` | như trên | như trên | như trên | 25 | 2 hàng, cách 25px |
| `<= 750px` | như trên | `calc(100% - 30px)` | `15px` | 15 | Ẩn, giữ hamburger |

| Width | Header expanded | Header collapsed | Cột full menu |
| --- | ---: | ---: | --- |
| `<= 750px` | `72.59375px` | `70.640625px` | 1 ở `<= 578px` |
| `751–960px` | `132.78125px` | `128.78125px` | 2 |
| `961–1200px` | `85.390625px` | `81.390625px` | 3 |
| `> 1200px` | `102.515625px` | `81.390625px` | 4 |

- Collapsed: padding `10px 35px`, `10px 25px`, `10px 15px` theo ba mốc trên.
- Logo: expanded `170 × 67.515625` ở `> 1200px`, `145 × 57.59375` ở
  `<= 1200px`; sticky `125 × 49.640625` mọi width.
- Computed ở `1440×900`: grid `170px 995px 65px`, hàng `67.5156px`,
  `position: fixed`, `z-index: 1000`; rect `0, 0, 1440, 103`; nav
  `457.34375, 39, 630.3125, 60.390625`. Mobile header rộng đủ viewport
  (`320` và `390 × 72.59375`).
- Nav: `silka-semibold` 16/22.4, chữ hoa, tracking normal; link đầu
  `79.1 × 19`. Link giữ `left` và width giữa expanded và sticky.
- `left` link đầu / link thứ năm: 751 `200.56 / 520.06`; 960
  `305.06 / 624.56`; 961 `203.34 / 727.28`; 1200 `322.84 / 846.78`; 1201
  `277.81 / 791.75`; 1440 `397.31 / 911.25`.
- Underline nav và filter: cao 3px, `bottom: -4px`.
- Hamburger `35 × 19`, nét 3px, ba dòng (giữa chạy từ 25% tới 75%). Hộp toggle
  rộng 65: x `247.5` (320), `317.5` (390), `690.5` (768), `946.5` (1024),
  `1357.5` (1440); cao `57.59375`, `107.78125` ở 768, `60.390625` ở 1024,
  `67.515625` ở 1440.
- Nút hẹn `209.203125 × 47`, x `533.8` (768), `789.8` (1024), `1195.8`
  (1440); ẩn ở `<= 960px`. Mobile: CTA tròn `57 × 57`.
- Class trạng thái: `collapsed`, `oculto` (`translateY(-100%)`), `forceShow`.
- Thứ tự shell: full menu, nút hẹn, header, veil route, rồi
  `main[data-scroll-container]` và container Barba; header, menu, veil nằm
  ngoài container nên không bị thay khi đổi route.

## Typography

Espacio dùng năm face Silka, mỗi face khai báo weight `normal` (nét nghiêng vẽ
sẵn trong glyph). Weight số computed (100, 400) không phản ánh độ đậm thật, nên
so theo face. Mọi chữ `antialiased`; `html` 16px, line-height 1.4.

| Face | Vai trò |
| --- | --- |
| regular | Body, đoạn văn, h2, caption |
| regular italic | `i` |
| medium | h1, tiêu đề fact, display |
| medium italic | `h1 i` |
| semibold | Nav, h3, filter, chữ đậm, nút, menu |

| Vai trò | Face | Desktop | Nhỏ hơn |
| --- | --- | --- | --- |
| Tiêu đề hero | medium | Tối đa 112/156.8, chữ hoa | Xem [Hero Espacio](reference-espacio-hero.md) |
| h2 editorial | regular | 64/89.6, chữ thường | 56 (`<= 1200`), 48 (`<= 960`), 40 (`<= 750`) |
| Đoạn editorial | regular | 24/33.6, max-width 600, căn phải, thụt đầu dòng 100 | 20.8/29.12 (`<= 960`), thụt 50 mobile |
| Kicker, eyebrow, h3 | semibold | 16/22.4 hoa, căn trái | như desktop |
| Nav | semibold | 16/22.4 hoa, cap 11px | ẩn `<= 750` |
| Body trang chủ | regular | 19.2/26.88, cap 14px | như desktop |
| Caption gallery, rail, card | regular | 12.8/17.92 hoa, cách ảnh 10 | 11.2/15.68 ở Projects `<= 578` |
| Scroll cue | không ghi | 12.8/17.92 hoa, cap 9px | như desktop |
| Fact | tiêu đề medium | Số 12.8/17.92; tiêu đề 28.8/40.32 hoa; body 16/22.4 | Tiêu đề 20.8/29.12 (`<= 960`) |
| Tiêu đề banner CTA | medium | Cỡ h2, hoa, căn giữa trên ảnh | như h2 |
| Nhãn CTA, nút | semibold | 16/22.4 hoa, phần phụ `.8em`, gạch chân và mũi tên | như desktop |
| Tiêu đề portal | medium | 64, cap 45px; phụ đề semibold 16/22.4 hoa | cap 31–45px |
| Filter dự án | semibold | 16/22.4 hoa; inactive opacity 0.3 | 15.36/21.504 khi viewport cao `<= 845` |
| Mục full menu | semibold | 13.6/19.04 (`.85em`) hoa; disabled opacity 0.3 | như desktop |
| Montage trang chủ | medium | `6.5vw` (93.6/131.04 ở 1440), cap `6.5em` từ 1600 | 20.8/29.12 ở 320 |

- Khoảng trắng giữa từ: tracking và word-spacing bằng 0, nhưng glyph space của
  Silka rộng khoảng `.272em` ở chữ lớn, `.264em` ở nhãn 16px.
- Tiêu đề lớn dùng thuật toán `fillText`: bắt đầu ở cỡ khai báo, giảm từng
  bước `0.25em` tới khi không tràn khung.

Trường Thịnh không dùng Silka: Plus Jakarta Sans với body 500, display 600,
label 700, xem [Typography](README.md#typography).

## Layout

### Grid card dự án

Container `max-width: 1500px`, căn giữa. Masonry `percentPosition`, card nổi
bật chiếm hai cột.

| Viewport | Lề | Rộng grid | Cột | Gutter |
| ---: | ---: | ---: | ---: | ---: |
| 320 | 15 | 290 | 2 | 15 |
| 390 | 15 | 360 | 2 | 15 |
| 750 | 15 | 720 | 2 | 15 |
| 751 | 25 | 701 | 2 | 15 |
| 960 | 25 | 910 | 2 | 15 |
| 961 | 25 | 911 | 3 | 25 |
| 1200 | 25 | 1150 | 3 | 25 |
| 1201 | 35 | 1131 | 4 | 35 |
| 1440 | 35 | 1370 | 4 | 35 |
| 1570 | 35 | 1500 | 4 | 35 |
| 1920 | 210 | 1500 | 4 | 35 |
| 2560 | 530 | 1500 | 4 | 35 |

Trên 1570px lề bằng `(viewport - 1500) / 2`; không tràn ngang ở mọi width.

### Trang chủ (`1440×900`)

| y | Cao | Section đã xác định |
| ---: | ---: | --- |
| 0 | 900 | Hero slideshow toàn viewport |
| 990 | 189 | |
| 1269 | 600 | Portal ba cột, ảnh `410 × 600` ở x 35 |
| 1959 | 700 | |
| 2750 | 600 | |
| 3440 | 784 | Rail dự án, ảnh `300 × 420` |
| 4314 | 600 | |
| 5004 | 165 | |
| 5259 | 490 | Footer |

Khoảng cách section 90px. Nội dung theo thứ tự: editorial và news, portal
Kitchens / Interior Design / Materials, montage heritage, Outlet / Showrooms /
Services, rail năm dự án, video Vimeo; báo cáo không ghép từng nội dung với
từng y. Montage có bốn hàng flex căn giữa, đầu, cuối, giữa; ảnh xen chữ
`13vw × 10vw`, tối đa `200 × 150`, margin 15 (10 ở `<= 960`).

### Template trang dự án

45 trang dự án dùng chung một template (`data-barba-id="proyecto"`), khác nhau
ở data và block tùy chọn (38 tổ hợp).

| Block | Tần suất | Vai trò |
| --- | ---: | --- |
| `layout-hero-banner` | 45/45 | Hero toàn viewport (39 ảnh, 6 video) |
| `layout-titular` | 45/45 | Heading editorial, heading CTA |
| `layout-parrafo` | 45/45 | Đoạn kể chuyện |
| `layout-bloque-facts` | 45/45 | Facts |
| `layout-slider-proyectos` | 45/45 | Rail dự án liên quan |
| `layout-ctas` | 45/45 | CTA cuối |
| `layout-marquee` | 45/45 | Marquee trước footer |
| `layout-imagen-unica` | 42/45 | Ảnh đơn |
| `layout-galeria` | 40/45 | Gallery ngang |
| `layout-imagen-doble` | 27/45 | Cặp ảnh |
| `layout-bloque-banners` | 1/45 | Banner CTA |
| `layout-parrafo-columnas` | 1/45 | Đoạn chia cột |

- Mẫu `espalmador-project` ở `1440×900`: hero bằng viewport, heading
  `1000 × 156.8` (112/156.8); intro và gallery padding ngang 35px, margin dưới
  90px; gallery cao 755, slide `50vw` (`75vw` ở `<= 750px`); cặp ảnh
  `2 × 702.5`, gap 35px.
- Facts: 4 cột desktop (`4 × 360` ở 1440), 2 ở `<= 960`, 1 ở `<= 750`; căn
  giữa tới 960, căn trái từ 1024.
- Gallery: Swiper, slide rộng tự do, gap 20 (10 trên mobile nhỏ).
- Rail liên quan: cuộn ngang native, card `300 × 420` (`300 × 400` ở
  `<= 1200`, `200 × 300` ở `<= 960`); card chẵn lệch xuống 180px (120 ở
  `<= 1200`). Caption ẩn trên desktop tới khi hover, luôn hiện ở `<= 960`.

## Full menu

| Viewport | Cao phần đầu | Logo | Cột | Ghi chú |
| --- | ---: | --- | ---: | --- |
| 1440, 1567 | 137.516 | `170 × 67.515625` ở 35, 35 | 4 | |
| 1024, 1200 | 109.578 | `150 × 59.578125` ở 25, 25 | 3 | |
| 768 | 109.578 | `150 × 59.578125` | 2 | Ẩn nút hẹn |
| 390 | 226.969 | `150 × 59.578125` ở 25, 25 | 1 | Nút hẹn một hàng riêng, có chữ |

- Vùng link cao 741 (1440, 1024), 791 (768), 653 (390, 320). Ở `<= 578` phần
  đầu chia hai cột ba hàng: hàng ngôn ngữ `37.391px`, hàng nút hẹn 50px.
- Ở 1567: ngôn ngữ x `590.297`, nút hẹn x `1057.141`, nút đóng x `1492`; nút
  hẹn đứng ngay trước nút đóng trên cùng một hàng.
- Nhóm 01 tới 08: số 12.8/17.92, tiêu đề 28.8/40.32, link con 13.6/19.04 trong
  hàng 22.4. Số tới tiêu đề 15px, tiêu đề tới danh sách 30px, link cách link
  15px (bước `34.04px`).
- Ngôn ngữ ghi đủ tên (`Español`, `English`, `Deutsch`); nút hẹn có icon lịch
  `35 × 35`, nét 4px, rộng khoảng 210.

## Footer

- Ở `1440×900`: y `5259.08`, cao `489.89`. Grid 3 cột, 1 cột ở `<= 960`.
- Nội dung: liên hệ, privacy, cookies, legal, mạng xã hội, newsletter; chữ
  about `.9em`, logo tối đa 150px.
- Marquee trước footer trên mọi trang chạy 40s; trang thương hiệu thêm marquee
  logo 30s.

### Scrollbar desktop

Track overlay 11px bên phải, không chiếm width; thumb 7px, margin 2px, radius
10px, đen opacity 0.5. Idle opacity 0; khi scroll hoặc hover opacity 1; hover
track `scaleX 1.45`; transition 0.3s. Mobile dùng scrollbar native.

- Ở `1440×900`: một track `.c-scrollbar` ở `right: 0, top: 0`, cao 900, nền
  trong suốt; nội dung vẫn rộng 1440.
- Khi hover, width computed: track `15.95px`, thumb `10.15px`.
- Thumb có cursor `grab`, khi kéo `grabbing`. Class `has-scroll-scrolling` và
  `has-scroll-dragging` đưa track về opacity 1.
- Idle opacity 0 là trạng thái (không scroll, hover, kéo), không phải hẹn giờ;
  class bị gỡ khi scroll dừng.
- Mobile `390×844`: không có `.c-scrollbar`, scroll native.
- CSS live `v0.038` (2026-09-27) giữ nguyên các rule này.

## Breakpoint

- Media query: `max-width` 1200, 960, 750, 578; `min-width` 960, 1600;
  `aspect-ratio 16/9` (không chạm header, full menu).
- Rule theo chiều cao: filter dự án nhỏ lại khi viewport cao `<= 845`.
- Navbar chỉ phụ thuộc width; logic scroll của header phụ thuộc chiều cao
  viewport.

## Mâu thuẫn giữa các báo cáo

| Chủ đề | Báo cáo A | Báo cáo B | Dùng |
| --- | --- | --- | --- |
| Weight caption card | Source: regular 400 | Live 2026-09-09: Silka semibold (computed 700) 12.8px, 11.2px ở 390 | Live, vì đo trực tiếp và mới hơn (suy luận) |
| Cỡ caption card | 11.2/15.68 mobile, 12.8/17.92 desktop | Ghi chú 2026-08-31: 10.5 và 12px | 11.2 và 12.8; 10.5 và 12 khớp số bù cap-height cũ của Trường Thịnh nên có lẽ bị trộn (suy luận) |
| Gap grid ở 751–960px | Live: 15px (hai báo cáo) | Bảng phương án của một decision: 10px | 15px |
| Đổi tone header | Source: ba tween cùng chạy `0.3s expo.out` | Motion map cũ: logo và hamburger đổi sau 0.5s | Source |
| Số trang dự án | 48 dự án thật trong 115 trang `proyecto` | 45 (archive, masonry) và 46 (manifest tiếng Anh) | 45 cho template ở trên |
| Số link full menu | 50 link hiện khi mở | 52 mục | Chưa rõ |
| Ánh xạ Residential, Commercial | Interior Design và Kitchens theo thứ tự | Báo cáo 2026-08-27: đảo ngược | Theo decision, xem [Ánh xạ trang](#ánh-xạ-trang) |
| Trigger hero zoom | "Khi hero vào viewport" | Class in-view thêm sau khi container mount, không chờ media | Bản sau, chi tiết hơn |

## Chưa đo

- Màu chữ hero trên nền sáng và nền tối.
- Reduced motion trên site live (source cho thấy Espacio không có nhánh này).
- Kéo và thả scrollbar trên site live.
- Chuyển route từng frame.
- F/L và rect hero About theo width (chỉ có cap).

## Nguồn

Đọc bằng `git show <commit>:<path>`.

| Commit | Path | Nội dung chính |
| --- | --- | --- |
| `3afef50` | `docs/reports/REFERENCE-MOTION-AUDIT.md` | Audit source bundle và đo live 2026-08-01 ở năm width; nguồn chi tiết nhất |
| `3afef50` | `docs/product/MOTION-MAP.md` | Motion map cũ |
| `fae6529` | `docs/archive/reports/research-espacio-parity-inventory.md` | Inventory DOM, rect, hover live |
| `fae6529` | `docs/archive/reports/research-espacio-navbar-runtime-2026-08-27.md` | Navbar theo 16 viewport |
| `fae6529` | `docs/archive/reports/research-espacio-typography-hero-route-motion-2026-08-27.md` | Chữ hero, zoom, scroll cue, route |
| `fae6529` | `docs/archive/reports/research-espacio-project-detail-templates-2026-08-30.md` | Template trang dự án |
| `fae6529` | `docs/archive/reports/research-advertising-products-masonry-batching-2026-08-30.md` | Grid card theo viewport |
| `fae6529` | `docs/reports/research-espacio-layout-motion-parity-targeted.md` | Header computed, veil route |
| `fae6529` | `docs/archive/guides/motion-map.md` | Timeline full menu theo giây |
| `83df591` | `docs/archive/reports/verification-upnext-advertising-2026-09-09.md` | Caption card live |
| `f76c14f` | `docs/reference/espacio/components.md` | Scrollbar, filter live |
| `116367c` | `docs/specs/full-menu-reference-parity.md` | Phần đầu full menu live 2026-09-24 |
| `321bbec` | `docs/verification/brand-lockup-logo-r3-2026-09-10.md` | Hộp logo header và menu |

## Chú thích thuật ngữ

- **Reference**: nguồn để đối chiếu, không tự là giá trị Trường Thịnh.
- **Cap**: chiều cao chữ `H`, dùng so cỡ chữ giữa hai font.
- **Face**: một file font cụ thể (regular, medium, semibold) trong cùng họ.
- **Computed**: giá trị trình duyệt tính ra sau khi áp CSS.
- **DOMRect**: vị trí và kích thước một phần tử trên màn hình.
- **Shutter**: các cột phủ màn hình khi mở full menu.
- **Template**: khung trang dùng chung, khác nhau ở data và block.
- **Montage**: section chữ lớn xen ảnh nhỏ trên trang chủ.
