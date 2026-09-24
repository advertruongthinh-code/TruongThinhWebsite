---
title: Foundations Espacio và các quan sát nền
type: reference-foundations
status: candidate-composite-baseline
snapshot_id: ESPACIO-R1-20260902
snapshot_cutoff: 2026-09-02
---

# Foundations

Các số dưới đây là geometry, breakpoint và typography của Espacio measured
baseline, trừ dòng ghi rõ `Trường Thịnh accepted` hoặc `Trường Thịnh observed`.
Baseline là default reference cho mục tiêu 1:1; historical observation không tự
biến thành accepted TT contract. Ngoại lệ chỉ có hiệu lực khi decision/spec
được owner duyệt.
Mỗi nhóm liên kết tới ID trong [evidence register](evidence.md).

## Viewport và boundary

| Hệ | Viewport/breakpoint | Observation | Status |
| --- | --- | --- | --- |
| Espacio home live | `320x844`, `390x844`, `768x900`, `1024x900`, `1440x900` | Tất cả `overflow:false`; header lần lượt `72.59375`, `72.59375`, `132.78125`, `85.390625`, `102.515625px` | `measured` (`E-NAV-VIEWPORTS`, `E-NAV-BREAKPOINT`) |
| Espacio navbar matrix | `320/390/578`, `750/751/768/960/961/1023`, `1024/1200/1201/1440/1599/1600/1920` | Width bands được probe theo route family; không phải `180x16` Cartesian | `measured`, coverage giới hạn |
| Trường Thịnh local matrix | 5 canonical route × `320x844`, `390x844`, `768x900`, `1024x900`, `1440x900` | 25 DevTools samples, tất cả `overflow:false` | `observed` (`E-LOCAL-OBSERVED`) |
| Espacio stylesheet | `≤1200`, `≤960`, `≤750`, `≤578`, cùng `min-width:960`, `min-width:1600`, aspect `16/9` | CSS có rule rộng hơn navbar; aspect `16/9` không target header/full-menu | `source-derived` |
| Trường Thịnh CSS | `min-width:981`; `max-width:1200,1024,960,980,750,680,578,360`; reduced-motion queries | Ownership của local responsive/layout rule | `observed` từ source; không là Espacio measurement |

Espacio archive có sitemap legacy host `espaciohdg.com`; đây là provenance signal,
không chứng minh mọi URL archive hiện live. Archive capture ngày `2026-08-08`
và live measurement ngày `2026-08-27/30` được giữ tách nhau.

## Header và shell geometry

Số Espacio là live `/en` home; số Trường Thịnh là local `/vi/`. Cột `Δ` chỉ
được ghi khi report đã ghép cùng viewport; không dùng để suy ra defect.

| Viewport | Espacio header | TT header | Espacio toggle / TT | Espacio appointment / TT | Status |
| --- | ---: | ---: | --- | --- | --- |
| `320x844` | `72.59375px` | `75px` | `65x57.59375` / `50x60` | `57x57` / `57x57` | `measured` + `observed` |
| `390x844` | `72.59375px` | `75px` | `65x57.59375` / `50x60` | `57x57` / `57x57` | `measured` + `observed` |
| `768x900` | `132.78125px` | `132.78125px` | `65x107.78125` / `50x60` | `209.203125x47` / `150.125x47` | `measured` + `observed` |
| `1024x900` | `85.390625px` | `92.515625px` | `65x60.390625` / `50x60` | `209.203125x47` / `150.125x47` | `measured` + `observed` |
| `1440x900` | `102.515625px` | `102.515625px` | `65x67.515625` / `65x60` | `209.203125x47` / `150.125x47` | `measured` + `observed` |

Nguồn ghép: [parity inventory](../../archive/reports/research-espacio-parity-inventory.md)
§4.1, `E-NAV-BREAKPOINT`, `E-LOCAL-OBSERVED`. Local fixed header tại mobile
thành `310x75` ở inner width `320` và `380x75` ở inner width `390` vì native
vertical scrollbar chiếm `10px` client width. Đây là observed browser geometry,
ghi nhận trong historical inventory snapshot, không phải current-source rerun;
không phải mismatch đã được duyệt để sửa.

Desktop live `/en` tại `1440x900`: header `1440x102.515625`, nav
`630.3125x60.390625` ở `x=457`, năm gap `35px`, toggle
`65x67.515625`, appointment `209.203125x47`, hero `1440x900`, footer bắt đầu
`y=5259.078125`, cao `489.890625`. Các số này từ
[parity inventory](../../archive/reports/research-espacio-parity-inventory.md) §2,
§4, status `measured`.

Local mobile `/vi/` observed trong historical inventory snapshot: shell `390x75`, fixed header `380x75`, menu
button `50x60`, main `6499.796875`, footer `x=0,y=6563.796875,w=390,
h=896.0625`. Cross-system equivalence chưa measured.

## Width bands và menu layout

| Width | Espacio header top | Espacio collapsed | Nav chính | Full-menu columns |
| --- | ---: | ---: | --- | --- |
| `≤750px` | `72.59375px` | `70.640625px` | Link ẩn, giữ hamburger | 1 tại `≤578px` |
| `751–960px` | `132.78125px` | `128.78125px` | 2 hàng | 2 tại `≤960px` |
| `961–1200px` | `85.390625px` | `81.390625px` | 1 hàng | 3 tại `≤1200px` |
| `>1200px` | `102.515625px` | `81.390625px` | 1 hàng | 4 mặc định |

Source contract live giữ link trái/cuối và computed typography giữa expanded và
sticky: max delta `left=0px`, width `0px` tại widths `751,960,961,1200,1201,1440`.
Computed custom face là `silka-semibold`, `16px`, weight computed `400`,
line-height `22.4px`, letter-spacing `normal`; weight `400` ở đây là mapping
của named face, không phải đổi font giữa hai state.

## Home section geometry

Espacio desktop `/en` observed section rectangles tại `1440x900`:

| Khu vực | Vị trí và kích thước |
| --- | --- |
| Hero | `y=0`, `h=900px` |
| Section 2 | `y=990`, `h=189px` |
| Section 3 | `y=1269`, `h=600px` |
| Section 4 | `y=1959`, `h=700px` |
| Section 5 | `y=2750`, `h=600px` |
| Section 6 | `y=3440`, `h=784px` |
| Section 7 | `y=4314`, `h=600px` |
| Section 8 | `y=5004`, `h=165px` |
| Footer | `y=5259`, `h≈490px` |

Local `/vi/` mobile observed tại `390x844`: `#top y=0/h=844`, `#bang-chung
y=908/h=952`, `#dich-vu y=1924/h=1260`, `#tay-nghe y=3248/h=342.125`,
`#nang-luc y=3654.125/h=1260`, `#du-an y=4978.125/h=656`. Đây là inventory
geometry, không phải claim content equivalence.

Visible inventory của hai hệ có các vùng tương ứng về loại nội dung nhưng chưa
được gọi tương đương: Espacio có editorial/news, Kitchens/Interior Design/
Materials portals, heritage words, Outlet/Showrooms/Services và project reel;
TT có process 4-card, ba portal, heritage montage, materials/workshop/process,
project reel và capability marquee.

## Typography reference

| Vai trò Espacio | Mobile | Desktop | Method/status |
| --- | ---: | ---: | --- |
| Nav | Ẩn | `16/22.4px`, cap `11px` | Canvas `H`/DevTools, `measured` |
| Scroll cue | `12.8/17.92px`, cap `9px` | Như mobile | `measured` |
| Home body | `19.2/26.88px`, cap `14px` | Như mobile | `measured` |
| Home portal/banner title | cap `31–45px` | `64px`, cap `45px` | `measured`, tùy card |
| Kitchens hero dòng 1/2 | cap `20/28px` (`28/40px` size mobile) | cap `64/78px` (`92/112px` size desktop) | `measured` |
| Interior hero dòng 1/2 | cap `62/45px` | cap `78/78px` | `measured`, responsive copy fit |
| Projects hero dòng 1/2 | cap `45/37px` | cap `78/78px` | `measured`, không background media |
| About hero dòng 1/2 | cap `25/23px` | cap `76/73px` | `measured` |

Source: [typography report](../../archive/reports/research-espacio-typography-hero-route-motion-2026-08-27.md)
`Kết quả typography reference`, viewport live `390x844`, `768x1024`,
`1440x900`. Numeric computed weight của named face không được copy trực tiếp.

Trường Thịnh dùng equivalent local `body 500`, display `600`, nav/label/caption
`700`; đây là approved typography exception, status `accepted` trong report.
Owner override ngày 2026-08-27 cho `#bang-chung h3` là responsive `16→20px`,
body `16px`; local VI/EN tại `320px` và `1569px` có heading cap `12→15px`, body
cap `12px`, overflow `0`. Không dùng font family Espacio làm target.

## Source và ownership liên quan

| Concern | Espacio evidence | TT source/observed owner | Status |
| --- | --- | --- | --- |
| Header/menu/footer markup | Live/archive HTML, menu groups 01–08 | Các route HTML giữ shared shell | `measured` / `observed` |
| Layout/token/type/responsive | Live CSS bundle hash | `src/site/style.css` | `source-derived` / `observed` |
| Detail child layout | `layout-*` archive modules | `src/site/detail.css` và route HTML | `source-derived` / `observed` |
| Motion/veil/locale | Live JS bundle hash | `src/site/motion.js`, inline boot guard | `source-derived` / `accepted`/`observed` |
| Gallery/filter | Live project/card source | Historical snapshot: `detail.js`, `products.js`; current catalog uses `src/site/advertising-products/catalog-runtime.mjs` | `source-derived` / `observed` |

`E-LOCAL-OBSERVED` có thể giúp định vị source nhưng không thay test acceptance.
Reference chỉ cung cấp geometry/behavior đã đo; không copy source, logo, media,
font, SVG hoặc URL Espacio vào production.

## Unknown và giới hạn

- Font parity, semantic footer/content equivalence và cross-system section
  correspondence chưa measured.
- Live route family ngoài `/en`, active internal route transition, route-wide
  focus order và full-menu accessibility chưa đủ evidence trong snapshot này.
- Header local rerun sau lần mẫu `320` gặp server `500` rồi connection refusal;
  đó là environment blocker cho rerun, không phải product failure.
- Espacio live console có một CORB/ORB issue và network `ERR_BLOCKED_BY_ORB`
  trong parity inventory; không gọi live console sạch.

## Chú thích thuật ngữ

- **Geometry**: bounding rectangle, kích thước, vị trí hoặc khoảng cách thực tế.
- **Breakpoint**: ngưỡng width làm đổi layout hoặc state.
- **Named face**: font face được đặt tên cho một weight/style.
- **Cap-height proxy**: glyph `H` dùng để ước lượng thân chữ.
- **Observed**: số đo/behavior thấy trong local, chưa phải contract owner duyệt.
