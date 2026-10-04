# Tham chiếu Espacio

Website Espacio Home Design (`espaciohomedesign.com`) là reference về nhịp
layout và motion mà owner chọn. Đây là số đo của Espacio, không phải giá trị
Trường Thịnh: giá trị đang chạy ở [README](README.md) và [Motion](motion.md).
Không copy source, media, logo, font (Silka), SVG, URL hay copy của Espacio.

Số đo từ archive crawl và DevTools/Playwright trên site live (bundle JS
`main.min.js?v=0.021`, CSS `main.min.css?v=0.021`). Raw evidence nằm ở
`research/reference-site/` trên máy owner. Site live có thể đã đổi.

## Header và breakpoint

| Width | Header expanded | Header collapsed | Nav chính | Cột full menu |
| --- | ---: | ---: | --- | --- |
| `<= 750px` | `72.59375px` | `70.640625px` | Ẩn, giữ hamburger | 1 ở `<= 578px` |
| `751–960px` | `132.78125px` | `128.78125px` | 2 hàng | 2 |
| `961–1200px` | `85.390625px` | `81.390625px` | 1 hàng | 3 |
| `> 1200px` | `102.515625px` | `81.390625px` | 1 hàng | 4 |

- Desktop `1440×900`: nav `630.3125 × 60.390625`, năm mục, gap 35px; toggle
  `65 × 67.515625`; nút hẹn `209.203125 × 47`. Mobile: CTA tròn `57 × 57`.
- Link nav giữ `left` và width giữa expanded và sticky (delta 0px).
- Nav desktop 16px, line-height 22.4px; underline hover `scaleX 0 → 1`, cao 3px.
- Menu head cao `137.516px` desktop, `109.578px` ở `<= 1200px`, `226.969px` ở
  `<= 578px`; nút hẹn ẩn ở `<= 960px`, hiện full-span trên mobile.

## Typography

| Vai trò | Mobile | Desktop |
| --- | --- | --- |
| Nav | ẩn | 16/22.4px, cap 11px |
| Scroll cue | 12.8/17.92px, cap 9px | như mobile |
| Body trang chủ | 19.2/26.88px, cap 14px | như mobile |
| Tiêu đề portal | cap 31–45px | 64px, cap 45px |
| Hero Kitchens dòng 1/2 | 28/40px | 92/112px |
| Hero Projects dòng 1/2 | cap 45/37px | cap 78/78px |
| Hero About dòng 1/2 | cap 25/23px | cap 76/73px |

Trường Thịnh không dùng Silka: body 500, display 600, nav, label, caption 700
bằng Plus Jakarta Sans. Caption Advertising bù cap-height (10.5px và 12px thay
12.8px của Espacio).

## Trang chủ desktop (`1440×900`)

Hero cao 900px (video Vimeo); các section tiếp theo cao 189, 600, 700, 600,
784, 600, 165px, khoảng cách 90px; footer bắt đầu `y = 5259`, cao khoảng 490px.
Nội dung: editorial và news, portal Kitchens / Interior Design / Materials,
heritage words, Outlet / Showrooms / Services, project reel.

## Motion

| Chuyển động | Espacio |
| --- | --- |
| Header collapse | `scrollY > 100`; transform `1s cubic-bezier(0, 0, .1, .99)`; nền `0.3s ease-out` |
| Header ẩn/hiện | Vùng giữa trang `0.5 × vh` tới cách đáy `1.25 × vh`, đi quá 150px; `translateY(-100%)` |
| Pointer reveal | `mousemove.screenY <= 350` hiện header đang ẩn, không expand |
| Route | Cover `0.75s power4.inOut`, reveal `1s power4.inOut`; chờ HTML, không chờ media; màu header `0.3s expo.out` |
| Hero zoom | `scale(1.2) → 1.005`, `2.5s ease`, khi hero vào viewport |
| Scroll cue | Delay 3s; vào và ra `0.4s`, stagger `0.1s`; giữ 3s; lặp sau 3s; cách đáy 45px desktop, 30px tablet, 60px mobile |
| Card dự án | Ảnh lazy `opacity 0 → 1`, `0.6s ease-out`, không replay khi vào lại; hover `scale(1 → 1.15)` `0.6s`; underline `0.3s cubic-bezier(.4, 0, 0, 1)` |
| Filter dự án | Card loại `display: none` tức thì, không fade; card còn lại Masonry `transform 0.4s ease`, không stagger; không có nhánh reduced motion |
| Portal hover | Ảnh `scale(1 → 1.1)`; tiêu đề underline `scaleX 0 → 1` |
| News card hover | Ảnh `scale(1 → 1.2)`, underline tiêu đề, CTA `opacity 0 → 1` |

Full menu: page `scale 1 → 0.9` `0.7s power2.out`; shutter bốn cột `height 0 →
100vh` `0.6s power4.inOut` stagger `0.15`; timeline `timeScale 1.15`; đóng
reverse `timeScale 2.25`. Trường Thịnh dùng cùng nhịp này.

### Scrollbar desktop

Track overlay 11px bên phải, không chiếm width; thumb 7px, margin 2px, radius
10px, đen opacity 0.5. Idle opacity 0; khi scroll hoặc hover opacity 1; hover
track `scaleX 1.45`; transition 0.3s. Mobile dùng scrollbar native.

## Template trang dự án

45 trang dự án dùng chung một template (`data-barba-id="proyecto"`), khác nhau
ở data và block tùy chọn (38 tổ hợp).

| Block | Tần suất | Vai trò |
| --- | ---: | --- |
| `layout-hero-banner` | 45/45 | Hero toàn viewport (39 ảnh, 6 video) |
| `layout-titular` | 45/45 | Heading editorial, heading CTA |
| `layout-parrafo` | 45/45 | Đoạn kể chuyện |
| `layout-bloque-facts` | 45/45 | Facts 4 cột desktop, 1 cột mobile |
| `layout-slider-proyectos` | 45/45 | Rail dự án liên quan |
| `layout-ctas` | 45/45 | CTA cuối |
| `layout-marquee` | 45/45 | Marquee trước footer |
| `layout-imagen-unica` | 42/45 | Ảnh đơn |
| `layout-galeria` | 40/45 | Gallery ngang |
| `layout-imagen-doble` | 27/45 | Cặp ảnh |
| `layout-bloque-banners` | 1/45 | Banner CTA |
| `layout-parrafo-columnas` | 1/45 | Đoạn chia cột |

Mẫu `espalmador-project` ở `1440×900`: heading hero 112/156.8px; intro và
gallery padding ngang 35px, margin dưới 90px; gallery `50vw`, `75vw` ở
`<= 750px`; facts 4 × 360px; cặp ảnh 2 × 702.5px, gap 35px.

### Ánh xạ sáu trang Advertising

Sáu trang detail Advertising dùng một template chung, chọn tổ hợp block theo
mẫu Espacio:

| Nhóm | Mẫu Espacio | Lý do |
| --- | --- | --- |
| Kiosk & POSM | `pollenca-project` | Dài, đủ nhịp cho nhiều ảnh |
| Xe bán hàng | `ponent` | Ba gallery |
| Bảng hiệu & chữ nổi | `can-molteni` | Banner full-width |
| Biển văn phòng & chỉ dẫn | `lonja-de-mar-project` | Đoạn chia cột |
| LED & hộp đèn | `espalmador-project` | Gallery, ảnh đơn, ảnh đôi cân bằng |
| In nhanh & decal | `pantry-project` | Ngắn, gallery tập trung |

Mạch: hero (tên nhóm, ảnh, CTA), giới thiệu và gallery, facts (vật liệu, kỹ
thuật, môi trường, hoàn thiện), đoạn xen ảnh, CTA và nhóm liên quan.

## Chú thích thuật ngữ

- **Reference**: nguồn để đối chiếu, không tự là giá trị Trường Thịnh.
- **Cap**: chiều cao chữ `H`, dùng so cỡ chữ giữa hai font.
- **Shutter**: các cột phủ màn hình khi mở full menu.
- **Template**: khung trang dùng chung, khác nhau ở data và block.
