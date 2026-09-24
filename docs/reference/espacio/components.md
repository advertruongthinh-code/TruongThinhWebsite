---
title: Component và block reference Espacio
type: reference-components
status: candidate-composite-baseline
snapshot_id: ESPACIO-R1-20260902
snapshot_cutoff: 2026-09-02
---

# Components và blocks

Trang này ghi component/block nhìn thấy và contract quan sát được trong
Espacio. Phần `Trường Thịnh` chỉ là source/observed mapping hoặc accepted
decision đã ghi rõ; không suy ra component extraction mới. Geometry local là
historical evidence trong report, không phải current rerun.

## Header và navigation shell

| Component | Espacio measured | Trường Thịnh mapping/status |
| --- | --- | --- |
| Desktop header | `/en` `1440x900`: `1440x102.515625px`; nav `x=457.34375,y≈39,w=630.3125,h=60.390625`, năm item, gap `35px`; appointment `209.203125x47` | `.site-header`, shared HTML và `src/site/style.css`; local `1440x900` historical header `102.515625px`, nav `x=441.671875,w=661.640625`, ba item; `observed`, không claim equivalence |
| Mobile header | Live `/en` `390x844`: `h=72.59375px`; CTA bubble `57x57`; desktop nav ẩn | Historical local `/vi/` shell `390x75`, fixed header `380x75`, menu button `50x60`; scrollbar native giải thích width; `observed` |
| Menu shell | Live menu groups `01–08`, `50` visible links; open body `--menuOpen`, opacity `1`; close body class rỗng, opacity `0` | `<dialog id="site-menu">`, bốn `menu-group`, locale links, appointment CTA, `[data-menu-close]`; local open/close historical DevTools `bodyClass=menu-open`, `menuOpen` true/false; `observed` |
| Desktop nav sticky | Năm live links giữ `left` và width giữa expanded/collapsed; max delta `0px` tại sáu cạnh breakpoint | Local shell có collapse/hide state trong `motion.js`; threshold và lifecycle xem [motion](motion.md); không copy item count Espacio |
| Menu CTA | Live appointment geometry `209.203125x47` ở desktop; mobile bubble `57x57` | Local appointment width `150.125px` ở historical `768/1024/1440`; CTA product contract dùng Zalo/booking placeholder theo accepted content rule, không invent URL |

Nguồn: [parity inventory](../../archive/reports/research-espacio-parity-inventory.md)
§4, §4.1, §6; [navbar runtime](../../archive/reports/research-espacio-navbar-runtime-2026-08-27.md)
§4–§5; [evidence IDs](evidence.md#register) `E-NAV-BREAKPOINT`,
`E-NAV-LINK-STICKY`, `E-LOCAL-OBSERVED`.

## Hero, portal và editorial blocks

| Block | Espacio measured/observed | TT mapping/status |
| --- | --- | --- |
| Home hero | Full first viewport `1440x900`; live Vimeo iframe; desktop title observed khoảng `x≈220` với hai dòng; mobile hero height `844px` | TT home `#top.hero`; local historical `390x844` h=`844`; copy/layout equivalence `not measured` |
| Service/product hero | Archive/live families `/en/kitchens`, `/en/interior-design`, `/en/projects`, `/en/about-us`; hero copy size theo route trong [foundations](foundations.md) | TT residential/commercial/about/advertising route HTML; shared detail ownership; source contract, không claim parity |
| Editorial/news | Live home có editorial cards/news, portal Kitchens/Interior Design/Materials, heritage words, Outlet/Showrooms/Services, project reel | TT historical snapshot có process 4-card, ba portal, heritage montage, materials/workshop/process cards, project reel, capability marquee; `observed` |
| Portal hover | Live `/en/kitchens`: image `scale(1→1.1)`, title underline `scaleX(0→1)`; local portal image `scale(1→1.1)`, shade `.32→.4` | `measured` live/local hover samples; portal target behavior không phải global token |
| Footer | Live footer Contact, Privacy, Cookies, Legal, social, newsletter; desktop bắt đầu `y=5259`, h≈`490px` | TT footer CTA/Zalo/contact placeholder/fields/copyright; semantic equivalence `not measured` |

`E-TYPO-REFERENCE` ghi typography role; hero zoom/entrance và portal timing
thuộc [motion](motion.md). Local content/media tuân
[CONTENT-MEDIA-GUIDE](../../design/content.md); không dùng asset,
logo, font hoặc copy Espacio.

## Project card và grid

| Concern | Espacio card evidence | Interpretation/status |
| --- | --- | --- |
| Grid layout | Archive HTML dùng Masonry `itemSelector: .masonry-item`, `columnWidth: .grid-sizer`, `gutter: .gutter-sizer`, `percentPosition:true` | Source/archive exact ngày 2026-08-30; không tự là TT implementation contract |
| Lazy media | Image không có motion vào/rời viewport; LazySizes `opacity:0→1`, `transition: opacity .6s ease-out`; rời rồi quay lại không replay trong reference | `measured`; TT accepted Advertising hiện có replay chủ động là mở rộng, không gọi 1:1 reference |
| Hover | `.img-content scale(1→1.15)`, `.6s ease-out`; card underline `scaleX(0→1)`, `.3s cubic-bezier(.4,0,0,1)`; caption opacity `0→1` | `measured`, `/en/projects`, `1440x900`, 2026-08-30 |
| Filter | Card không khớp `display:none`, card khớp `display:block`, gọi `msnry.layout()`; card loại biến mất ngay, không exit fade | `measured`; behavior reference |
| Position morph | Card còn lại morph bằng `transform .4s ease`, delay `0ms`, no stagger; container đổi height ngay; Ivory `top 352.969px→0px`, cleanup khoảng `420ms` | `measured`; unit `px/ms` |
| Reduced motion | Source Espacio không có nhánh `prefers-reduced-motion` cho card contract | `measured`; TT vẫn phải giữ reduced-motion fallback theo accepted product contract |

TT historical ownership từ parity inventory: `style.css` giữ token/type/shared
layout; `detail.js` và product directory cũ giữ gallery/filter; current
Advertising catalog dùng `src/site/advertising-products/catalog-runtime.mjs`.
Không dùng bảng này để xác nhận current code đã giống reference.

## Detail blocks và media modules

45 Espacio project detail route dùng cùng module family. Block frequency đầy đủ
ở [templates](templates.md), gồm:

| Block | Tần suất archive | Vai trò |
| --- | ---: | --- |
| `layout-hero-banner` | `45/45` | Hero toàn viewport |
| `layout-titular` | `45/45` | Heading editorial/CTA |
| `layout-parrafo` | `45/45` | Story copy |
| `layout-bloque-facts` | `45/45` | Metadata/facts |
| `layout-slider-proyectos` | `45/45` | Related projects |
| `layout-ctas` | `45/45` | CTA cuối trang |
| `layout-marquee` | `45/45` | Brand marquee trước footer |
| `layout-imagen-unica` | `42/45` | Ảnh đơn tùy chọn |
| `layout-galeria` | `40/45` | Gallery ngang tùy chọn |
| `layout-imagen-doble` | `27/45` | Cặp ảnh bất đối xứng |
| `layout-bloque-banners` | `1/45` | Banner CTA, Can Molteni |
| `layout-parrafo-columnas` | `1/45` | Paragraph chia cột, Lonja de Mar |

`layout-bloque-banners` và `layout-parrafo-columnas` là optional rare blocks,
không nên nâng thành universal component requirement. Hero video trong sáu
route (`cfs-project`, `cps-project`, `csi-project`, `lonja-townhouse-project`,
`parallel-project`, `vanity-project`) là media variant bên trong cùng family,
không phải template thiếu hero.

## Hover/focus outcome register

Các outcome sau là measured khi report có before/hover state. `blocked` giữ
nguyên nếu chỉ có selector/source hoặc thiếu target computed evidence.

| Family | Outcome quan sát | System/status |
| --- | --- | --- |
| Nav link | `::after`/`::before` `scaleX 0→1`, underline `3px`; local width mẫu `163.516px`, live Kitchens `79.0781px` | TT observed / Espacio measured |
| Menu button/toggle | Live top/bottom `scaleX .5`, middle `scaleX 2`; local aggregate computed delta còn conflict | Live `measured`; local `blocked` individual SVG proof |
| Floating CTA | Local background black→white, text white→dark | TT `measured` historical |
| Motion toggle | Alpha `.42→.72`, scale `1→1.06` | TT `measured` historical |
| Service portal | Image `scale 1→1.1`, shade `.32→.4` | TT `measured` historical |
| Story link | Child SVG `translateX 0→12px` | TT `measured` historical |
| Project card/legacy closer | Image `scale 1→1.15` / `1→1.035` | TT `measured` historical |
| Gallery control/item | Control transparent→dark, text dark→white; image `scale 1→1.1` | TT `measured` historical |
| Detail duo/CTA | Image `scale 1→1.08` / `1→1.1`; CTA pseudo width `1370px` | TT `measured` historical |
| Project filter/tile | Filter target không đổi computed style; tile image `scale 1→1.15`, caption giữ opacity `1` | TT `measured` historical |
| Menu locale/close | Locale underline width `72.5938px`; close SVG rotation matrix | TT `measured` historical |
| Menu group title/option | Title pseudo width `286.25px`; option underline width `64.1406px`, h `3px` | TT `measured` historical |
| Live news card | Image `scale 1→1.2`, heading underline, CTA opacity `0→1` | Espacio `measured` |
| Live footer | Contact underline; Instagram image opacity `1→.4`; newsletter SVG translate to `0` | Espacio `measured` |
| Live hero cue | Không có accessibility target UID trong attempt | Espacio `blocked`/ambiguous |
| Scrollbar/focus-only | Scrollbar không target được; `.editorial-strip`/`.project-track` là focus-only | `not measured` hover; không đếm như hover family |

Nguồn: [parity inventory](../../archive/reports/research-espacio-parity-inventory.md)
§6.1 và [targeted parity](../../reports/research-espacio-layout-motion-parity-targeted.md)
`Hover/focus parity`. Không tự suy ra keyboard order hoặc accessibility pass từ
hover rows.

## Ownership và reuse boundary

| Area | Current TT source/consumer | Baseline use |
| --- | --- | --- |
| Route/legacy alias | `src/worker/index.js`, route spec | Chỉ để hiểu mapping; Worker dormant |
| Shared shell | Route HTML, `src/site/style.css`, static contract | Chỉ observed source anchor |
| Motion/header/menu/veil | `src/site/motion.js`, inline boot guard | Chi tiết accepted/observed ở [motion](motion.md) |
| Detail/gallery | `src/site/detail.css`, `detail.js`, current advertising catalog | Không refactor trong R1 |
| Browser contract | `tests/site/site.e2e.cjs`, cross-browser smoke, static contract | Evidence consumer, không phải Espacio measured |

No source/UI/test changes belong in D1/D2. Component extraction/token work is
separate phase as stated in [living docs spec](../../specs/living-docs-design-system.md).

## Chú thích thuật ngữ

- **Component family**: khung behavior/layout dùng lại cho nhiều data/composition.
- **Block**: module nội dung có thể bật/tắt hoặc sắp xếp.
- **Masonry**: xếp card theo cột và khoảng trống chiều cao.
- **Position morph**: chuyển vị trí liên tục khi layout reflow.
- **Rare block**: block optional có tần suất thấp, không phải phần bắt buộc mọi route.
- **Historical snapshot**: observation từ run cũ, không phải current rerun.
