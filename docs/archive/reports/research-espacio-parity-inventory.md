# Inventory parity Espacio và Trường Thịnh

## 1. Mục tiêu và phạm vi

Đây là inventory slice đầu tiên để lập baseline đo lường giữa website live
Espacio Home Design và implementation hiện tại của Trường Thịnh. Báo cáo ghi
nhận route, template, component nhìn thấy, geometry, responsive viewport,
breakpoint, interaction state, evidence source và ownership hiện tại.

Báo cáo không phải verdict parity, không khẳng định 1:1 parity, không đề xuất
patch CSS/HTML/JS và không đưa nội dung hoặc media Espacio vào production. Mọi
nhận định được gắn một trong bốn nhãn: `confirmed`, `inferred`, `not measured`,
`blocked`.

Typography exception đã được giữ nguyên: không copy font family của Espacio;
tiếng Việt giữ line/word spacing đã được duyệt; tiếng Anh theo geometry quan sát
được, ngoại trừ font family.

## 2. Phương pháp và evidence register

### Phương pháp

1. Query Graphify trước, chỉ đọc. AST hiện fresh; semantic extraction còn 86
   file pending và không được update.
2. Activate Serena với context `codex` để xác nhận path, symbol, reference và
   ownership từ source/test.
3. Đọc archive tại `research/reference-site/archive/`, manifest và sitemap mà
   không sửa archive.
4. Dùng Chrome DevTools cho runtime geometry, console, network và state; dùng
   in-app Browser và Computer Use cho bounded menu path open/close.
5. Dùng Impeccable context loader và detector trên local source; detector chỉ
   phân tích, không sửa UI.

### Evidence register

| ID | Evidence và nguồn chính | Trạng thái |
| --- | --- | --- |
| E-TT-SRC | [frontend route/content spec](../specs/frontend-route-and-content.md), [worker route dispatcher](../../src/worker/index.js), các file `src/site/` | `confirmed` |
| E-TT-TEST | [site E2E contract](../../tests/site/site.e2e.cjs), [cross-browser smoke](../../tests/site/cross-browser.smoke.spec.cjs), [static contract](../../tests/site/site-static-contract.cjs) | `confirmed` |
| E-TT-MOTION | [motion map](../impeccable/motion-map.md), [route-first decision](../decisions/route-first-navigation.md), [motion visibility decision](../decisions/motion-keeps-content-visible.md), [menu ownership decision](../decisions/menu-owns-locale-appointment.md) | `confirmed` |
| E-ARCHIVE | [archive manifest](../../research/reference-site/archive/manifest.jsonl), [archived English home](../../research/reference-site/archive/site/en/index.html), [archive sitemap](../../research/reference-site/archive/meta/sitemap.xml) | `confirmed` cho snapshot archive; `not measured` cho current live route family |
| E-ESPACIO-D | Chrome DevTools đo live `/en` tại `1440x900`: header `1440x102.515625`, nav `630.3125x60.390625`, năm gap nav `35px`, toggle `65x67.515625`, appointment `209.203125x47`, hero `1440x900`, footer `y=5259.078125,h=489.890625` | `confirmed`; không phải target parity |
| E-ESPACIO-M | Chrome DevTools đo live `/en` tại `320x844`, `390x844`, `768x900`, `1024x900`, `1440x900`; tất cả `overflow:false` | `confirmed` cho home family |
| E-ESPACIO-IAB | In-app Browser mở cùng live URL; menu open/close bằng Playwright locator | `confirmed` |
| E-TT-LOCAL | Chrome DevTools mở `http://127.0.0.1:8787/`; `/` redirect tới `/vi/`; viewport `390x844`. Root recheck độc lập tái hiện viewport shell `390x75`, fixed header rect `380x75` vì scrollbar dọc native chiếm `10px` client width, menu button `50x60`, main `6499.796875`, footer `390x896.0625`, cùng section geometry đã ghi; menu open có `bodyClass=menu-open`, `menuOpen=true`, opacity `1`, close trả body class rỗng và `menuOpen=false` | `confirmed` |
| E-HEADER-RECHECK | Header-only runtime recheck: local fixed header rect `310x75` tại inner width `320` và `380x75` tại inner width `390`; native vertical scrollbar chiếm `10px` client width. Live header rect giữ full `320x72.59375` và `390x72.59375`. Run pass `320`, sau đó local server có response `500` rồi dừng; các lần sau là connection refusal của môi trường | `confirmed` cho số đo; rerun `blocked` môi trường, không phải product failure |
| E-MATRIX | Local DevTools đo năm route canonical tại năm viewport canonical: 25 samples; tất cả `overflow:false`. Live DevTools đo `/en` tại năm viewport canonical; tất cả `overflow:false` | `confirmed`; live chỉ home family |
| E-HOVER | `rg` quét toàn bộ selector `:hover`/`:focus-visible` và mouse/pointer handler trong first-party surface; 21 group sau dedup: 19 hover family được đo physical, 1 scrollbar-only, 1 focus-only (`.editorial-strip`/`.project-track`). Source có custom handlers; static candidate ledger ghi chúng, còn effect runtime phải đo theo candidate | `confirmed` với limitation từng family ở mục 6 |
| E-GRAPHIFY | Wrapper query chạy dưới escalation; AST fresh; semantic pending 86 file, không update | `confirmed`/recovered |
| E-SERENA | `activate_project("E:\\TruongThinh-Website")`; context `codex`; language server `ready` | `confirmed` |
| E-IMPECCABLE | Context loader báo `MANUAL_DETECTOR_REQUIRED`; detector chạy một lần trên `src/site`, degraded sang regex fallback vì thiếu `htmlparser2`, `css-select`, `css-tree`, `domutils`; có bảy warning: sáu `overused-font`, một `layout-transition` | `confirmed` nhưng undercount mechanical |
| E-CUA | Computer Use chọn đúng cửa sổ Chrome tại `https://espaciohomedesign.com/en`; mở full menu hiển thị đủ nhóm 01–08, sau đó click group `full-menu-close` và xác nhận bằng screenshot rằng trang đã trở về hero. Lỗi approval/URL ở lần chạy trước không tái diễn trong rerun | `confirmed`/recovered |

### Lệnh và tool đã dùng

- Graphify: `& ".\scripts\tooling\invoke-graphify.ps1" query "Espacio parity inventory: first-party sources, route specs, motion map, tests, worker, report links and outstanding evidence gaps"`. Permission/lock failure ban đầu đã được recovery dưới escalation; AST fresh, semantic pending 86 và không update.
- Serena: `mcp__serena__initial_instructions`, `mcp__serena__get_current_config`; project `TruongThinh-Website`, context `codex`, language server `ready`.
- Live DevTools: `emulate`, `navigate_page`, `take_snapshot`, `hover`, `evaluate_script`, `list_console_messages`, `list_network_requests` tại `320x844`, `390x844`, `768x900`, `1024x900`, `1440x900`.
- Local DevTools: cùng command set với server `127.0.0.1:8787`, năm route và năm viewport canonical; menu open/close, focus-visible và 19 hover family.
- Header-only latest rerun: mẫu `320` pass và ghi rect local `310x75`; pre-existing local server sau đó trả `500` rồi dừng, các lần tiếp theo là connection refusal. Đây là environment blocker cho rerun, không phải product failure claim.
- In-app Browser: `iabTab.goto("https://espaciohomedesign.com/")`; click `#header-menu-toggle`, click `#full-menu-close`, rồi đọc DOM state.
- Computer Use: chọn chính xác cửa sổ Chrome theo title/URL; click accessibility target `header-menu-toggle`, quan sát full menu 01–08, click group `full-menu-close`, rồi chụp lại trạng thái hero.
- Impeccable: `node 'C:\Users\halal\.agents\skills\impeccable\scripts\context.mjs' --target 'src/site/index.html'` cho audit surface; context report dùng target inventory. `node 'C:\Users\halal\.agents\skills\impeccable\scripts\detect.mjs' --json src/site` degraded sang regex fallback và trả bảy warning. Đây không phải detector pass; typography exception vẫn không được coi là parity failure tự động.

## 3. Route và template inventory

### 3.1. Route contract hiện tại của Trường Thịnh

| Route family | Template/source ownership | Template và nội dung quan sát/contract | Trạng thái | Exact source anchor |
| --- | --- | --- | --- | --- |
| `/vi/`, `/en/` | Home shell trong [`src/site/index.html`](../../src/site/index.html) | Home: hero ba lĩnh vực, editorial process, ba portal, câu chuyện hơn 20 năm, năng lực vật liệu/xưởng/thi công, project reel và CTA | `confirmed` source/test và local `/vi/` tại đủ năm viewport | [route spec L16-L19, L61-L62](../specs/frontend-route-and-content.md) |
| `/vi/residential/`, `/en/residential/` | [`src/site/residential/index.html`](../../src/site/residential/index.html) | Detail service template: full-bleed hero, motto, typologies, gallery/media, materials, process và CTA khảo sát | `confirmed` source/test và local `/vi/residential/` tại đủ năm viewport; gallery/duo/CTA hover đã đo desktop | [route spec L63-L64](../specs/frontend-route-and-content.md), [E2E ROUTES L13-L15](../../tests/site/site.e2e.cjs) |
| `/vi/commercial/`, `/en/commercial/` | [`src/site/commercial/index.html`](../../src/site/commercial/index.html) | Detail service template theo vận hành: shop/showroom, F&B/cafe, office, durability/material story và CTA | `confirmed` source/test và local `/vi/commercial/` tại đủ năm viewport | [route spec L65-L66](../specs/frontend-route-and-content.md), [E2E ROUTES L13-L15](../../tests/site/site.e2e.cjs) |
| `/vi/projects-products/`, `/en/projects-products/` | [`src/site/projects-products/index.html`](../../src/site/projects-products/index.html) và `products.js` | Editorial identity hero, project/product grid, filter, product directory, process và CTA | `confirmed` source/test và local `/vi/projects-products/` tại đủ năm viewport; filter/tile hover đã đo desktop | [route spec L67-L70](../specs/frontend-route-and-content.md), [E2E expected case L31-L45](../../tests/site/site.e2e.cjs) |
| `/vi/about/`, `/en/about/` | [`src/site/about/index.html`](../../src/site/about/index.html) | About template: hơn 20 năm, xưởng/con người, cách làm, cam kết và CTA | `confirmed` source/test và local `/vi/about/` tại đủ năm viewport | [route spec L71-L72](../specs/frontend-route-and-content.md), [E2E ROUTES L13-L15](../../tests/site/site.e2e.cjs) |
| `/vi/projects/:slug/`, `/en/projects/:slug/` | Worker content route và shared detail ownership | Detail project route được contract ghi nhận; slug cases và visual states chưa thu trong slice này | `confirmed` route contract; `not measured` runtime, next sample là một known slug mỗi locale tại `390x844` và `1440x900` | [route spec L16-L18](../specs/frontend-route-and-content.md), [worker dispatch](../../src/worker/index.js) |
| `/nha-o`, `/kinh-doanh`, `/quang-cao`, `/gioi-thieu` và aliases tiếng Anh | `LEGACY_ROUTES` trong [`src/worker/index.js`](../../src/worker/index.js) | Redirect về canonical `/vi/.../`; đây là compatibility route, không phải template riêng | `confirmed` source; `not measured` redirect runtime, next sample là `GET`/navigation mỗi alias và assert canonical URL | [worker L24-L49](../../src/worker/index.js) |

Shared ownership được contract hóa: `style.css` giữ token, typography,
header/menu/footer, home và responsive; `motion.js` giữ locale, route veil,
header, smooth scroll, hero và menu; `detail.css`/`detail.js` giữ child/detail;
`products.js` giữ product directory. Nguồn: [route spec L30-L40](../specs/frontend-route-and-content.md).

### 3.2. Route families và template evidence của Espacio

| Espacio route/source family | Visible/template evidence | Mapping để đo tiếp với Trường Thịnh | Trạng thái | Exact anchor |
| --- | --- | --- | --- | --- |
| `/` → `/en` | Live root redirect tới English home; home có full menu, Vimeo hero, editorial/news, portal blocks, heritage montage, project reel và footer | So với `/vi/` hoặc `/en/` home shell; chỉ là scope comparison, không kết luận parity | `confirmed` live | [Espacio live root](https://espaciohomedesign.com/) |
| `/en/about-us`, `/en/clients`, `/en/contact`, `/en/services`, `/en/showrooms`, `/en/team`, `/en/news`, `/en/brands` | Archive manifest có HTML local cho các family corporate/service/content này | So với `/vi/about/` và shared shell; route equivalence chưa chứng minh | `confirmed` archive; `not measured` current route | [archive manifest](../../research/reference-site/archive/manifest.jsonl) |
| `/en/kitchens`, `/en/interior-design`, `/en/furniture`, `/en/outdoor`, `/en/bathrooms`, `/en/lighting`, `/en/wardrobes`, `/en/doors`, `/en/kitchen-appliances` | Archive snapshot có các family product/service và nested brand/category pages | So với home portals và service detail của Trường Thịnh; taxonomy khác cần measurement riêng | `confirmed` archive; `not measured` current route | [archive English home](../../research/reference-site/archive/site/en/index.html) |
| `/en/projects/*`, `/en/outlet/*`, `/en/news/*`, `/en/brands/*`, `/en/showrooms/*` | Manifest parse: 256 local HTML pages; groups gồm projects 46, outlet 96, news 27, brands 53, showrooms 7 trong English local snapshot | So với `/vi/projects-products/` và query/filter states; project detail có report template riêng, các family còn lại chưa đo live | `confirmed` archive; sáu project detail đại diện đã đo live ngày 2026-08-30 | [project detail template report](research-espacio-project-detail-templates-2026-08-30.md), [archive manifest](../../research/reference-site/archive/manifest.jsonl) |
| Sitemap host | Archived sitemap có 500 URLs và dùng legacy host `espaciohdg.com`; đây là provenance caveat | Không được dùng làm chứng cứ rằng mọi legacy URL hiện live | `confirmed` archive fact; `inferred` current-site relationship | [archive sitemap](../../research/reference-site/archive/meta/sitemap.xml) |

## 4. Visible component và geometry inventory

Các số dưới đây là observed bounding rectangles, không phải acceptance target.

| Component/geometry | Espacio observed evidence | Trường Thịnh source/local evidence | Trạng thái |
| --- | --- | --- | --- |
| Header desktop | Live `/en`, viewport `1440x900`: header `x=0,y=0,w=1440,h=103`; desktop nav `x=457,y=39,w=630,h=60`; floating appointment CTA hiện diện | Shared header `.site-header`; source [`style.css`](../../src/site/style.css), header tests kiểm tra 1440/1200/960/750 geometry | `confirmed` cho cả observed/source |
| Header mobile | Live `/en`, viewport `390x844`: header khoảng `h=73`; fixed header rect `390x72.59375`; CTA bubble `57x57`; desktop nav không hiện | Local `/vi/`, viewport `390x844`: viewport shell `390x75`, fixed header rect `380x75` vì scrollbar dọc native chiếm `10px` client width; menu button `50x60`; [local snapshot/runtime](http://127.0.0.1:8787/vi/) | `confirmed`; số đo không được coi là parity claim |
| Menu shell | Live menu snapshot có groups 01–08; in-app Browser open: `bodyClass="--menuOpen"`, opacity `1`, `50` visible links; close: body class rỗng, opacity `0` | Trường Thịnh dùng `<dialog id="site-menu">`, bốn `menu-group`, locale links, appointment CTA và `[data-menu-close]` | `confirmed` | [Espacio live](https://espaciohomedesign.com/en), [`src/site/index.html`](../../src/site/index.html), [motion map L25-L30](../impeccable/motion-map.md) |
| Hero | Espacio desktop first viewport `900px`, hero h1 observed at x≈220 with two title lines; Vimeo iframe observed; mobile hero h=`844` | Local `/vi/` first section `#top.hero` h=`844`; source home hero and [motion map L156-L170](../impeccable/motion-map.md) | `confirmed` observed/source; copy/layout equivalence `not measured` |
| Home sections | Espacio desktop section rectangles: y0/h900; y990/h189; y1269/h600; y1959/h700; y2750/h600; y3440/h784; y4314/h600; y5004/h165; footer starts y5259 | Local mobile sections: `#top` y0/h844; `#bang-chung` y908/h952; `#dich-vu` y1924/h1260; `#tay-nghe` y3248/h342.125; `#nang-luc` y3654.125/h1260; `#du-an` y4978.125/h656 | `confirmed` geometry observations |
| Local main/footer | Not measured on Espacio as DOM selector equivalent; live desktop footer `y=5259,h=490` | Local mobile main `h=6499.796875`; footer `x=0,y=6563.796875,w=390,h=896.0625` | `confirmed` per system; cross-system comparison `not measured` |
| Editorial/news and portal grids | Espacio snapshot shows editorial cards, Kitchens/Interior Design/Materials portals, heritage words, Outlet/Showrooms/Services blocks and project reel | Local snapshot shows process 4-card region, three portal links, heritage montage, materials/workshop/process cards, horizontal project reel and capability marquee | `confirmed` visible inventory; equivalence `not measured` |
| Media | Espacio live requests include Vimeo player/video, API images, fonts and favicon; no asset copied | Local uses project-owned WebP assets such as `assets/site/process/*`, `expanded/*`, `generated/*`; source contract forbids copying reference media | `confirmed` |
| Typography | Espacio console logged slow-network fallback for Silka regular/medium/semibold/mediumitalic; live nav measured `16px`, line-height `22.4px` | Trường Thịnh typography is owned by local CSS and approved exception: preserve Vietnamese spacing; English geometry except family | `confirmed` observed/approved exception; font parity `not measured` |
| Footer | Espacio footer contains Contact, Privacy, Cookies, Legal, social and newsletter; desktop rectangle above | Local footer has CTA/Zalo, contact placeholders, fields and copyright; source footer in home/detail templates | `confirmed` visible/source; semantic equivalence `not measured` |

### 4.1. Paired navbar/header measurement

Mỗi hàng ghép live `/en` home với local `/vi/` home cùng viewport.
Số Espacio là observation, không phải acceptance target. `Δ` là local trừ live;
`n/a` nghĩa desktop nav ẩn, không phải zero-width parity.

| Viewport | Header live / local / Δ h | Toggle live / local | Appointment live / local | Nav live / local | Kết quả nhìn thấy |
| --- | --- | --- | --- | --- | --- |
| `320x844` | `72.59375 / 75 / +2.40625px`; live rect `320x72.59375`, local fixed rect `310x75` | `x247.5,65x57.59375 / x262.5,50x60` | `57x57 / 57x57` | `n/a / n/a` | Cả hai mobile; local rect hẹp hơn `10px` vì scrollbar dọc native; local toggle hẹp hơn `15px`, appointment cùng box. |
| `390x844` | `72.59375 / 75 / +2.40625px`; live rect `390x72.59375`, local fixed rect `380x75` | `x317.5,65x57.59375 / x332.5,50x60` | `57x57 / 57x57` | `n/a / n/a` | Cùng mode mobile; local rect hẹp hơn `10px` vì scrollbar dọc native; local toggle hẹp hơn `15px`. |
| `768x900` | `132.78125 / 132.78125 / 0px` | `x690.5,65x107.78125 / x695.5,50x60` | `x533.796875,209.203125x47 / x582.875,150.125x47` | live 5 item, 2 cột; local 3 item, 2 hàng, gap `25px` | Taxonomy/nav count khác; live CTA rộng hơn `59.078125px`, local bắt đầu bên phải hơn `49.078125px`. |
| `1024x900` | `85.390625 / 92.515625 / +7.125px` | `x946.5,65x60.390625 / x961.5,50x60` | `x789.796875,209.203125x47 / x848.875,150.125x47` | live 5 item, 1 hàng; local 3 item, 1 hàng, gap `37.5px` | Local header cao hơn; toggle hẹp hơn `15px`; CTA live rộng hơn `59.078125px`, local bắt đầu bên phải hơn `59.078125px`. |
| `1440x900` | `102.515625 / 102.515625 / 0px` | `x1357.5,65x67.515625 / x1357.5,65x60` | `x1195.796875,209.203125x47 / x1254.875,150.125x47` | `x457.34375,630.3125x60.390625`, 5 item, gap `35px` / `x441.671875,661.640625x60.390625`, 3 item, gap `35px` | Header padding hai site `35px`; toggle cùng x nhưng local thấp hơn `7.515625px`; live CTA rộng hơn `59.078125px`; local CTA bắt đầu bên phải hơn `59.078125px`. |

Mismatch xác nhận là số item/taxonomy nav, width/height toggle ở mọi breakpoint,
và width/x appointment ở desktop. Không có kết luận rằng các mismatch là defect
hoặc cần copy Espacio.

Fresh mobile rect recheck xác nhận local fixed header mất `10px` chiều rộng do
scrollbar dọc native chiếm client width; live header full viewport width. Source/test
motion anchors đã dùng trong runtime audit: custom document `pointermove` tại
[`motion.js:1314-1317`](../../src/site/motion.js), gallery pointer drag tại
[`detail.js:402-432`](../../src/site/detail.js), hover underline và hamburger
transform trong [`style.css:307-369`](../../src/site/style.css), collapse sau
`100px` và directed hide/show sau `150px` tại [`motion.js:242-288`](../../src/site/motion.js),
và `forceShow` khi `screenY <= 350` tại [`motion.js:1314-1317`](../../src/site/motion.js).

## 5. Responsive viewport và breakpoint inventory

| System | Viewports/breakpoints found | Measurement meaning | Trạng thái | Exact anchor |
| --- | --- | --- | --- | --- |
| Espacio live | DevTools emulation `/en` tại `320x844`, `390x844`, `768x900`, `1024x900`, `1440x900`; stylesheet conditions include `max-width:1200`, `960`, `750`, `578`, `min-width:960`, `min-width:1600`, aspect `16/9` | Header lần lượt `72.59375`, `72.59375`, `132.78125`, `85.390625`, `102.515625`; tất cả `overflow:false` | `confirmed` home matrix; route family khác `not measured` | [Espacio live](https://espaciohomedesign.com/en) |
| Trường Thịnh runtime matrix | Năm canonical route tại `320x844`, `390x844`, `768x900`, `1024x900`, `1440x900` | 25 samples DevTools; tất cả `overflow:false`. Header shared lần lượt `75`, `75`, `132.78125`, `92.515625`, `102.515625` | `confirmed` runtime |
| Trường Thịnh CSS | `min-width:981`; `max-width:1200`, `1024`, `960`, `980`, `750`, `680`, `578`, `360`; reduced-motion media queries | Ownership of responsive/layout rules; runtime matrix xác nhận geometry shell, không thay test execution | `confirmed` source/runtime |

## 6. Interaction state inventory

| State | Espacio evidence | Trường Thịnh evidence/ownership | Trạng thái |
| --- | --- | --- | --- |
| Hover | DevTools `1440x900` có before/hover computed deltas cho nav, appointment link, news, portal, CTA, project, footer link/social và newsletter submit; existing session evidence cũng ghi được các target navbar live nêu ở mục 6.1 | 21 dedup group được đối soát: 19 là hover family đã đo physical (nav underline; menu button; floating CTA; motion toggle; portal; story; project card; legacy closer; gallery controls/item; duo; detail CTA; project filter/tile; locale; close; group title; option; menu appointment); scrollbar-only là group thứ 20 và `.editorial-strip`/`.project-track:focus-visible` là group focus-only thứ 21, nên không phải hover family bị thiếu | `confirmed` cho 19 local family và các live target/family có before/hover computed evidence ở mục 6.1, gồm locale, full-menu group/brand, toggle và close; hero cue vẫn `blocked`/ambiguous; open/close state của toggle/close được xác nhận riêng bằng E-CUA và In-app Browser; scrollbar-only `not measured` vì DevTools không target scrollbar; focus-only đã ghi ở hàng Focus |
| Focus/keyboard | DevTools keyboard focus dừng sau 8 Tab vì full-menu link ẩn đứng trước header toggle; snapshot còn ghi `Espacio kitchens` focus-visible. Không suy diễn route-wide order | Local active CTA có `:focus-visible`: outline `rgb(163,65,25) solid 2px`, offset `4px`, rect `163.3125x47`; menu open đặt focus vào close control | `confirmed` local samples; live route-wide order `not measured` |
| Scroll header | Live mobile PageDown observed header transform hiding around `scrollY=738`, then Home restored header at `scrollY=0`; CTA remained shown | Computer Use local desktop xác nhận scroll xuống đổi tone/collapse, scroll sâu ẩn header, scroll ngược hiện lại và về top khôi phục overlay; `motion.js` owns state | `confirmed` representative sample/source; route-wide scroll vẫn theo atomic row, xem [motion audit](research-espacio-motion-audit.md) |
| Menu open/close | In-app Browser: open `bodyClass="--menuOpen"`, opacity `1`, 50 links; close body class empty, opacity `0` | Local DevTools: open `bodyClass="menu-open"`, menu opacity `1`; after close transition `menuOpen:false`; dialog and handlers in source | `confirmed` |
| Navigation | Live root navigation/redirect `/` → `/en` confirmed; internal live navigation không chạy để tránh thay state trong reference | Source owns Barba/route veil and counterpart locale navigation; E2E includes history/navigation checks | `confirmed` root/source; live internal transition `not measured` |
| Transition/route veil | Idle live state had transition veil opacity `0`; active route transition không được đo | Contract: route veil cover `0.75s`, uncover `1s`, header stays above veil | `confirmed` idle/source; active live `not measured` |
| Animation | Live DevTools found `#marquee-1.logo-list` animation `aniMarquee`, playState `running`; no active transition veil | `motion.js` and tests own hero lifecycle, marquee, cross-fade and cleanup; reduced-motion rules are explicit | `confirmed` live/source |
| Reduced motion | 80 live snapshot row của V2 matrix đều fail closed; không có live motion-confirmed row | Subset local `reduce` có `218 confirmed / 90 blocked`; toàn local matrix là `429 / 187`; browser QA độc lập pass thêm 5/5 canonical route tại `390x844` | local rows giữ trạng thái theo evidence; live reduced motion `blocked`, xem [motion audit](research-espacio-motion-audit.md) |
| Console/network | Current live `/en` console có 43 messages: log/info và một `issue` CORB; network có `GET https://api.espaciohomedesign.com/ [net::ERR_BLOCKED_BY_ORB]`, không được gọi là clean | Local `/vi/projects-products/`: zero console messages, 28 requests; document/CDN/font đều `200`, local cached assets `304` | `confirmed`; live clean-console claim bị phủ định |

### 6.1. Hover outcome register

Các result dưới chỉ dùng `confirmed` khi đã có `before`/hover computed state.
Một target đã hover physical nhưng không còn mẫu computed trước/sau được ghi là
`blocked`, không suy ra animation từ selector hay source contract.

| System/family | Outcome trước → hover đã quan sát |
| --- | --- |
| Local home nav link | `::after` scaleX `0 → 1`, width `163.516px`; underline trắng cao `3px` theo computed CSS. |
| Local menu button | Conflict còn mở: earlier DevTools aggregate target sample saw no computed-style delta, nhưng không resolve individual SVG lines. Source và E2E contract yêu cầu top/bottom `scaleX(0.5)` và middle `scaleX(2)` sau `0.3s`. Computer Use xác nhận menu open/close, không thay cho computed hover proof. |
| Local floating CTA | background `rgb(0,0,0) → rgb(255,255,255)`; text `rgb(255,255,255) → rgb(32,33,32)`. |
| Local motion toggle | background alpha `.42 → .72`; transform `none → scale(1.06)`. |
| Local service portal | `confirmed`: child image transform `none → matrix(1.1,0,0,1.1,0,0)`; `.portal-shade` background `rgba(0,0,0,.32) → rgba(0,0,0,.4)`. |
| Local story link | Child SVG `translateX(0) → translateX(12px)`. |
| Local project card / legacy closer | Image scale `1 → 1.15` / `1 → 1.035`. |
| Local gallery controls / item | `confirmed`: control background transparent `→ rgb(32,33,32)`, text `rgb(32,33,32) → rgb(255,255,255)`; gallery image scale `1 → 1.1`. |
| Local detail duo / detail CTA | Image scale `1 → 1.08` / `1 → 1.1`; CTA `::after` hover width `1370px`. |
| Local project filter / tile | `confirmed`: filter has no computed-style delta in inspected target/children/pseudos; tile image scale `1 → 1.15`, caption opacity giữ `1`. |
| Local menu locale / close | Locale `::after` hover width `72.5938px`, scaleX `1`; close SVG `none → matrix(0,1,-1,0,0,0)`. |
| Local menu group title / option / appointment | `confirmed`: group-title `span::before` width `286.25px`, scaleX `1`; option `::before` scaleX `0 → 1`, width `64.1406px`, height `3px`; appointment has no computed-style delta in inspected target/children/pseudos. |
| Live home nav Kitchens | `::before` scaleX `0 → 1`, width `79.0781px`, height `3px`, white. |
| Live locale | `::before` scaleX `0 → 1`. |
| Live full-menu group `/en/kitchens` | `::before` scaleX `0 → 1`. |
| Live brand `/en/cocinart` | `::before` scaleX `0 → 1`. |
| Live full-menu close | Two SVG lines `none → matrix(0,1,-1,0,0,0)`. This is hover evidence; open/close state is separately confirmed below. |
| Live header toggle | Top/bottom SVG lines `none → matrix(0.5,0,0,1,0,0)`; middle line `none → matrix(2,0,0,1,0,0)`. This is hover evidence; open/close state is separately confirmed below. |
| Live appointment | `confirmed`: full-menu “Make an appointment” `::before` giữ scaleX `0`, width `161.719px`, height `3px` before/hover; no computed-style delta in inspected target/children/pseudos. Đây không thay cho floating appointment bubble không có UID. |
| Live news `/en/news/80-anniversary` | `confirmed`: `.img-content` transform `none → matrix(1.2,0,0,1.2,0,0)`; `H3.coolLink::before` scaleX `0 → 1`; `.noticia-cta` opacity `0 → 1`. |
| Live portal `/en/kitchens` | `confirmed`: `H3.coolLink::before` scaleX `0 → 1`; `.img-content.dark` transform `none → matrix(1.1,0,0,1.1,0,0)`. |
| Live CTA `/en/projects` | `confirmed`: `H3.coolLink::before` scaleX `0 → 1`; `.img-content.dark` transform `none → matrix(1.1,0,0,1.1,0,0)`. |
| Live first project Costitx | `confirmed`: `.img-content` transform `none → matrix(1.15,0,0,1.15,0,0)`; `.imagen-caption` opacity `0 → 1`. Image lazy-load opacity `0 → 1` quan sát đồng thời bị loại, không tính là hover evidence. |
| Live footer CONTACT / Instagram | `confirmed`: CONTACT `.coolLink::before` scaleX `0 → 1`; Instagram footer `img` opacity `1 → .4`. |
| Live newsletter submit | `confirmed`: SVG transform `matrix(1,0,0,1,-14.9883,0) → matrix(1,0,0,1,0,0)`. |
| Live hero cue | `blocked`/ambiguous: không có target accessibility UID trong attempt hiện có. Live locale, full-menu group/brand, toggle và close có direct hover rows bên trên; toggle/close open-close state là evidence path riêng. |
| Local scrollbar-only / focus-only group | Scrollbar `not measured`: DevTools không target scrollbar. `.editorial-strip`/`.project-track:focus-visible` là focus-only, không thuộc hover count. |

## 7. Ownership và source location

| Ownership area | Current owner | Evidence |
| --- | --- | --- |
| Route dispatch, locale and legacy aliases | `src/worker/index.js` | [`SOURCE_ROUTES`/`LEGACY_ROUTES`](../../src/worker/index.js), [route spec](../specs/frontend-route-and-content.md) |
| Home shell, shared header/menu/footer markup | Each HTML entry keeps the shared contract; representative [`src/site/index.html`](../../src/site/index.html) | [Serena symbols overview], [static contract](../../tests/site/site-static-contract.cjs) |
| Shared layout, tokens, type, responsive and state classes | `src/site/style.css` | [`style.css`](../../src/site/style.css), [E2E CSS assertions](../../tests/site/site.e2e.cjs) |
| Detail layout and project/about variants | `src/site/detail.css`, route HTML files | [`detail.css`](../../src/site/detail.css), [`residential/index.html`](../../src/site/residential/index.html), [`about/index.html`](../../src/site/about/index.html) |
| Motion, menu, header, route veil and locale navigation | `src/site/motion.js` plus inline boot guard in route HTML | [`motion.js`](../../src/site/motion.js), [motion map](../impeccable/motion-map.md) |
| Gallery/filter/product interactions | `detail.js` and `products.js` | [`detail.js`](../../src/site/detail.js), [`products.js`](../../src/site/products.js) |
| Browser behavior contract | `tests/site/site.e2e.cjs`, `cross-browser.smoke.spec.cjs`, `site-static-contract.cjs` | [site tests](../../tests/site/site.e2e.cjs) |
| Espacio reference evidence | ignored local archive plus authorized live URL | [manifest](../../research/reference-site/archive/manifest.jsonl), [live URL](https://espaciohomedesign.com/) |

Serena confirmed project activation, `codex` context and ready language servers
for TypeScript, HTML, SCSS, PowerShell, Markdown, JSON, TOML, YAML and Python.
Graphify key source nodes/anchors used by this inventory are [route spec L11](../specs/frontend-route-and-content.md), [motion map Header L74](../impeccable/motion-map.md), [motion map menu L119-L135](../impeccable/motion-map.md), [motion map Hero L156](../impeccable/motion-map.md), [E2E pageUrl L92](../../tests/site/site.e2e.cjs), [header checks L1181](../../tests/site/site.e2e.cjs), [route decision L11](../decisions/route-first-navigation.md), [motion decision L11](../decisions/motion-keeps-content-visible.md) và [menu decision](../decisions/menu-owns-locale-appointment.md).

## 8. Coverage, blockers và giới hạn diễn giải

- `confirmed`: live Espacio root redirect and `/en` five-viewport matrix; local
  Trường Thịnh five-route, five-viewport matrix; all measured samples report no
  horizontal overflow. Header, menu, appointment, hero/footer geometry, local
  menu dialog, focus-visible, console/network and the listed hover samples have
  direct runtime evidence.
- `inferred`: archive sitemap host `espaciohdg.com` is a legacy/provenance
  signal; it is not proof that every archived URL is current live behavior.
- `not measured`: live route families ngoài `/en`; live internal-route and
  active-veil transitions; live route-wide focus order; live scrollbar hover;
  exact semantic equivalence của content/footer/typography. Các mục này không
  thể suy ra từ home measurement hoặc source contract.
- `blocked`: hero scroll cue remains ambiguous because the existing DevTools
  accessibility snapshot had no target UID; the measured live navbar hover rows
  for locale, full-menu group/brand, toggle and close are confirmed separately
  above. Toggle/close open/close state is confirmed separately by E-CUA and
  In-app Browser. DevTools không expose reduced-motion override; repaired runner
  dùng system Chrome. V2 bind contract vào target/protocol và 0 local runtime row
  thiếu DOM fingerprint; 80 live snapshot row giữ `blocked`, không dùng làm
  motion claim.
- Impeccable context báo `MANUAL_DETECTOR_REQUIRED`; detector `src/site` đã chạy
  lại ngày `2026-08-27`. Finding `layout-transition` được xử lý bằng cách đổi
  divider full menu từ `height` sang `transform: scaleY()`. Detector còn một
  warning font đã chấp nhận và bảy `broken-image` false positive: các hero image
  dùng `data-src`, được `hydrateDeferredHeroImages()` gán `src` và có browser
  regression bảo vệ. Đây không phải clean pass toàn UI hoặc bằng chứng parity.
- Initial Graphify/local runtime permission issues were recovered by root. Report
  ghi hai lane `confirmed`/recovered, không phải `blocked`; semantic pending còn
  86 files và không update.

## 9. Next measurement action

### Bổ sung live navbar ngày 2026-08-27

Gap “live route family ngoài `/en` chưa đo” đã được đóng riêng cho shared
navbar scroll shell: 180 URL sitemap, 14 route family, 16 viewport/input mode và
556 runtime row. Có 141 URL HTTP 200, 39 URL sitemap stale trả 404 và một
PageDown probe inconclusive trên trang ngắn; không có claim parity mới. Exact
threshold, geometry từng width band, source hash và limitation nằm trong
[audit navbar runtime](research-espacio-navbar-runtime-2026-08-27.md).

1. Resolve 315 candidate đang nằm trong 34 local static-binding row bằng target
   selector và state protocol cụ thể.
2. Bật context `hasTouch` rồi chạy lại 20 `gallery-touch` row; tạo visible media
   fixture trước khi chạy lại 20 `media` row.
3. Điều tra 20 project-filter row không đổi `aria-pressed`, rồi đo lại bằng hai
   reset độc lập.
4. Tạo isolated history/BFCache/fail-open fixtures cho 60 route row; giữ blocker
   cho tới khi quan sát được outcome trực tiếp.
5. Đo lại 48 header-state và 19 toggle-hover blocker, rồi tạo target-specific live
   motion matrix; Computer Use representative proof không thay các row này.

## 10. Chú thích thuật ngữ

- **Inventory**: bảng kê có source anchor và trạng thái đo, chưa phải kết luận.
- **Confirmed**: có evidence trực tiếp từ runtime, source, test hoặc archive.
- **Inferred**: suy luận có giới hạn từ evidence; không được trình bày như fact.
- **Not measured**: scope đã xác định nhưng chưa có observation tương ứng.
- **Blocked**: lane bắt buộc đã thử và dừng vì lỗi cụ thể, không dùng để suy ra
  behavior.
- **Template**: cấu trúc page và ownership dùng để render một route family.
- **Geometry**: bounding rectangle, kích thước, vị trí, spacing hoặc breakpoint
  được đo tại một viewport cụ thể.
- **Route veil**: lớp chuyển tiếp che phủ khi đổi route.
- **BFCache**: browser back-forward cache dùng để khôi phục document.
- **CORB/ORB**: browser chặn response cross-origin trước khi page đọc được nó.
