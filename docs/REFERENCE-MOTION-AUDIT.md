# Audit kiến trúc, layout và motion của web tham khảo

> **SSOT bắt buộc — cập nhật ngày 2026-08-01**
>
> Trước mọi thay đổi về look-and-feel, layout, typography, header, menu,
> transition, hover, reveal, gallery, montage hoặc chuyển động, phải đọc tài
> liệu này và đối chiếu đúng component đang sửa theo quy trình 1:1 ở mục kế
> tiếp. Không được dồn việc so sánh sang cuối đợt QA.
>
> Tài liệu ghi lại hành vi công khai để học nhịp bố cục và motion. Không cấp
> quyền sao chép source, nội dung, media, font, logo hoặc SVG độc quyền của
> web tham khảo.

## 1. Cách dùng tài liệu này

### Quy trình 1:1 cho từng edit

Mỗi lần chỉnh một component, làm đủ theo đúng thứ tự:

1. Xác định route, component và trạng thái tương tác đang sửa trong các ma trận
   bên dưới.
2. Mở source archive tương ứng và trang public nếu còn truy cập được.
3. Chụp reference và Trường Thịnh ở cùng viewport, cùng scroll position, cùng
   locale và cùng trạng thái header/menu.
4. Đo trước khi sửa: bounding box, gutter, breakpoint, font size, line height,
   underline, duration, delay, easing, transform, opacity và trigger.
5. Chỉ sửa component đang xét; không “đồng bộ cảm giác” bằng một override rộng
   áp lên component khác.
6. Ngay sau edit, mở Chrome đặt hai trang cạnh nhau và đối chiếu 1:1. Kiểm tra
   cả direct entry, soft navigation, hover/focus, Back/Forward và reduced
   motion nếu component có liên quan.
7. Ghi bằng chứng mới vào tài liệu hoặc report liên quan trước khi chuyển sang
   component tiếp theo.

Nếu không thể đo live, dùng local archive, ghi rõ “archive-only” và không gọi
kết quả đó là live parity.

### Thứ tự ưu tiên khi dữ liệu xung đột

1. Yêu cầu mới nhất được người dùng duyệt.
2. Bằng chứng runtime mới nhất của Trường Thịnh.
3. Source hiện tại của Trường Thịnh.
4. Số đo reference trong tài liệu này.
5. Nhận định thẩm mỹ chưa đo.

Ngoại lệ đã chốt: hero Trường Thịnh dùng zoom 5 giây với `sine.inOut` và
cross-fade 1,6 giây. Easing vào/ra êm tránh bước vận tốc ở frame bàn giao. Đây
là nhịp được người dùng duyệt, không đổi về autoplay 6 giây/transition 500 ms
của web tham khảo.

### Ký hiệu trạng thái

| Ký hiệu | Ý nghĩa |
| --- | --- |
| A | Đã audit reference từ archive/source |
| I | Có implementation trong source Trường Thịnh hiện tại |
| V | Đã kiểm độc lập trên runtime hiện tại |
| V-old | Có bằng chứng cũ; phải chạy lại sau thay đổi mới |
| G | Gap hoặc parity chưa đạt |
| F | Frozen theo quyết định người dùng; không tự chỉnh |

Không suy diễn “A” thành “I”, hoặc “I” thành “V”.

## 2. Phương pháp, phạm vi và bằng chứng

### Nguồn local

- Crawl đầy đủ:
  <code>reference-audit/web-reference/archive/</code>.
- HTML chọn lọc và bundle dùng để đọc:
  <code>reference-audit/web-reference/source/</code>.
- JS/CSS đã format:
  <code>reference-audit/web-reference/source/main.pretty.js</code> và
  <code>reference-audit/web-reference/source/main.pretty.css</code>.
- HTML gốc minified:
  <code>main.min.js</code>, <code>main.min.css</code>,
  <code>normalize.css</code>.
- Crawler:
  <code>scripts/archive-reference.mjs</code>.
- Fragment người dùng đính kèm về rail dự án:
  <code>C:\Users\halal\.codex\attachments\2e8a6b52-9d2b-457d-88e5-13d1356f0bc8\pasted-text.txt</code>.

### Phạm vi crawl đã kiểm

- 254/254 HTML hợp lệ trong
  <code>reference-audit/web-reference/archive/site/</code>.
- 11 giá trị <code>data-barba-id</code>.
- Tất cả 254 trang dùng
  <code>data-barba-namespace="common"</code>.
- 211 class token duy nhất.
- 62 functional page signature duy nhất. Signature là tập class chức năng
  chuẩn hoá theo từng page, gồm các họ <code>layout-*</code>,
  <code>swiper</code>, video, Masonry, outlet, news, showroom và tree frame.
- 83 nhóm selector transition/animation trong shared CSS.
- 5 keyframe shared CSS.

Các số trên được tái đếm từ local archive ngày 2026-08-01, không lấy từ ước
lượng bằng screenshot.

### Live checks

Live Chrome được dùng để xác nhận:

- Header của web tham khảo giữ cùng DOM node trong soft navigation.
- Transition Home → Interior Design khoảng 1,73 giây: veil tăng opacity trong
  khoảng 0,75 giây, giữ trắng khi đổi container, rồi giảm trong 1 giây.
- Reference không tắt Locomotive, autoplay hoặc phần lớn CSS transition khi
  bật <code>prefers-reduced-motion</code>.
- Source bundle public đang khớp hash với bản local nêu ở mục provenance tại
  thời điểm audit.

Live website có thể thay đổi. Mọi đợt parity mới phải đo lại theo update
protocol ở cuối tài liệu.

### Giới hạn

- Crawl chỉ bao phủ route public EN được discovery tại thời điểm snapshot.
- Số outlet bị tăng bởi các snapshot query <code>index.q-*</code>; tài liệu
  phân biệt list, product detail và bản lặp.
- Audit không tái sử dụng nội dung, hình, SVG path hoặc logo.
- Font Silka xuất hiện trong archive nhưng license không có trong corpus; mặc
  định coi là không được phép tái sử dụng.

## 3. Sự thật kiến trúc reference

### Không có JS motion riêng theo từng page

Web tham khảo không dùng một file motion JS riêng cho từng route
Design hay Projects. Tất cả 254 HTML đều tải cùng:

- <code>/js/main.min.js?v=0.021</code>
- <code>/css/main.min.css?v=0.021</code>
- <code>/css/normalize.css</code>

Chỉ trang Projects list tải thêm:

- <code>/js/vendor/masonry/masonry.pkgd.min.js</code>

Một số trang video tải:

- <code>https://player.vimeo.com/api/player.js?dnt=1</code>

Runtime dùng một Barba view namespace <code>common</code>, sau đó đọc
<code>data-barba-id</code> của container để dispatch initializer. Vì vậy,
“motion riêng của page” thực chất là markup/class/data attribute của page cộng
với một nhánh trong shared runtime.

### Shell và container

Shell public có thứ tự semantic:

1. Full-menu cố định <code>#full-menu-nav</code>.
2. Appointment UI cố định.
3. Header cố định chứa <code>#header-logo</code>,
   <code>#header-menu-items</code>, <code>#header-menu-toggle</code> và
   <code>#header-toggle-svg</code>.
4. Veil <code>#transitionDiv</code>.
5. <code>main#main-wrapper[data-barba="wrapper"][data-scroll-container]</code>.
6. Page container
   <code>#content-wrapper[data-barba="container"][data-barba-namespace="common"]</code>.

Header, full-menu và transition veil nằm ngoài Barba container, do đó không bị
tháo/mount lại khi soft navigation.

Fragment rail dự án đính kèm xác nhận:

- Container ngoài dùng <code>layout-slider-proyectos</code>,
  <code>animate-left</code> và <code>data-scroll</code>.
- Wrapper dùng <code>data-scroll-speed="4"</code>,
  <code>data-scroll-direction="horizontal"</code>; transform matrix do
  Locomotive tạo.
- Mỗi item là link phủ toàn card, image wrapper và caption.
- Đây không phải Swiper; không có control pagination/navigation trong fragment.
- Ảnh dùng lazysizes/srcset. Trường Thịnh chỉ học semantic rail và nhịp ngang,
  không lấy URL, alt, caption hoặc media reference.

### Bootstrap và initializer

| Function/reference line | Vai trò |
| --- | --- |
| <code>initAllLoaded()</code>, JS 16971 | Khởi tạo Locomotive rồi Barba |
| Barba view, JS 16973–17104 | Namespace common, selected menu, page dispatch, route fade |
| <code>initializeScroll()</code>, JS 17107–17406 | Smooth scroll, header, scroll calls, video |
| <code>initOnce()</code>, JS 17408–17594 | Language, header intro, global controls/analytics |
| <code>initCommons(container)</code>, JS 17595–17824 | Text split, Swiper, forms, tone sections, cue |
| <code>initProyectos()</code>, JS 18118–18170 | Project filter + Masonry |
| <code>initOutlet()</code>, JS 18172–18265 | Category/brand filter |
| <code>initNoticias()</code>, JS 18267–18327 | News filter/reveal |
| <code>initProductosEventoSearch()</code>, JS 17975 | Search cho family không có trong crawl |
| <code>initProductosEventoForm()</code>, JS 18000 | Form cho family không có trong crawl |

Dispatch thực tế:

- <code>home</code>, <code>pagina</code> và mặc định: chỉ
  <code>initCommons</code>.
- <code>proyectos-list</code>: thêm <code>initProyectos</code>.
- <code>outlet</code>: thêm <code>initOutlet</code>.
- <code>noticias-list</code>: thêm <code>initNoticias</code>.
- <code>productos-evento</code>: code có nhánh nhưng không có page tương ứng
  trong 254 HTML đã crawl.

## 4. Census page family và component

### Page family theo <code>data-barba-id</code>

| ID | Số HTML | Ý nghĩa |
| --- | ---: | --- |
| home | 1 | Home |
| pagina | 22 | Page nội dung tổng quát: Kitchens, Interior Design, About, Services… |
| proyectos-list | 1 | Projects list |
| proyecto | 115 | Project detail và outlet-product detail dùng chung family |
| outlet | 24 | Outlet list và các snapshot query lặp |
| marca | 52 | Brand detail |
| marcas-list | 5 | Brand list |
| noticia | 26 | News detail |
| noticias-list | 1 | News list |
| showroom | 6 | Showroom detail |
| showrooms-list | 1 | Showroom list |

Trong 115 page <code>proyecto</code>, audit phân loại được 48 project thật;
phần còn lại chủ yếu là outlet-product detail.

### Component census

Số occurrence dưới đây đếm class token trong HTML; “page” là số file chứa ít
nhất một occurrence.

| Component | Occurrence | Page |
| --- | ---: | ---: |
| <code>layout-marquee</code> | 259 | 254 |
| <code>layout-galeria</code> | 144 | 130 |
| <code>layout-slider-proyectos</code> | 49 | 48 |
| <code>layout-hero-banner</code> | 99 | 99 |
| <code>layout-portada</code> | 23 | 23 |
| <code>layout-bloque-compromiso</code> | 1 | 1 |
| <code>layout-masonry</code> | 1 | 1 |
| <code>layout-bloque-facts</code> | 181 | 181 |
| <code>layout-bloque-noticias</code> | 30 | 30 |
| <code>layout-banner-cta</code> | 84 | 38 |
| <code>layout-imagen-unica</code> | 171 | 86 |
| <code>layout-imagen-doble</code> | 75 | 56 |
| <code>layout-parrafo</code> | 547 | 221 |
| <code>layout-titular</code> | 488 | 226 |
| <code>swiper</code> | 237 | 207 |
| <code>video-container</code> | 14 | 14 |
| <code>portada-video-wrapper</code> | 10 | 10 |
| <code>tree-frame</code> | 9 | 1 |
| <code>masonry-item</code> | 45 | 1 |
| <code>outlet-product-item</code> | 1.911 | 94 |
| <code>noticia-item</code> | 26 | 1 |
| <code>showroom-item</code> | 31 | 7 |

Footer marquee tạo 254 occurrence; năm brand page có thêm brand marquee.

## 5. Dependency, version, license và mức sử dụng

Version được xác định từ banner/source map, global export và hash match với
package/CDN tương ứng.

| Dependency | Version reference | License | Global | Dùng runtime | Quyết định cho TT |
| --- | ---: | --- | --- | --- | --- |
| Modernizr custom | 3.11.2 | MIT | <code>Modernizr</code> | Chạy feature-class side effect; không thấy app/CSS consumer | Không thêm |
| Barba Core | 2.3.2 | MIT | <code>barba</code> | Tất cả page | Giữ Barba 2.10.3 hiện tại |
| GSAP | 3.7.1 | GreenSock, không phải MIT | <code>gsap</code> | Tất cả motion JS | Giữ GSAP 3.13.0 hiện tại |
| SplitText | 3.0.2 | GreenSock plugin | <code>SplitText</code> | Line/word/char split | Không cần; TT có splitter + TextMetrics |
| DrawSVGPlugin | 3.0.2 | GreenSock plugin | <code>DrawSVGPlugin</code> | Bundle nhưng app không gọi | Không thêm |
| ScrollToPlugin | 3.7.1 | GreenSock plugin | <code>ScrollToPlugin</code> | Bundle nhưng app dùng Locomotive <code>scrollTo</code> | Không thêm |
| CSSRulePlugin | 3.7.1 | GreenSock plugin | <code>CSSRulePlugin</code> | Bundle nhưng app không gọi | Không thêm |
| Locomotive Scroll | 4.1.0 | MIT | <code>LocomotiveScroll</code> | Desktop smooth scroll/parallax | Giữ 4.1.4 hiện tại |
| lazysizes | 5.3.0 | MIT | <code>lazySizes</code> | Lazy image/srcset | Không thêm; dùng native loading |
| Swiper | 7.0.6 | MIT | <code>Swiper</code> | Banner/gallery | Cấm dùng version này |
| Masonry packaged | 4.2.2 | MIT | <code>Masonry</code> | Chỉ Projects list | Chỉ thêm nếu CSS grid không đủ |
| Vimeo Player | hiện trả 2.30.4 | MIT | <code>Vimeo.Player</code> | Static/lazy video | Chỉ tải conditionally khi có video |
| normalize.css | 8.0.1 | MIT | — | Tất cả page | Không cần thêm |
| imagesLoaded | — | — | Không có | Không load, không dùng | Không thêm |
| Silka | Không xác định | Không có license trong archive | CSS font-family | Typography reference | Không sao chép |

Swiper full bundle chứa Virtual, Keyboard, Mousewheel, Navigation, Pagination,
Scrollbar, Parallax, Zoom, Lazy, Controller, A11y, History, HashNavigation,
Autoplay, Thumbs, FreeMode, Grid, Manipulation và toàn bộ effect modules.
Application chỉ cấu hình Mousewheel, Pagination, Lazy và Autoplay. Navigation
markup có trong HTML nhưng config không bật Navigation.

### Security policy

- Swiper 7.0.6 nằm trong dải ảnh hưởng của
  [GHSA-hmx5-qpq5-p643](https://github.com/nolimits4web/swiper/security/advisories/GHSA-hmx5-qpq5-p643):
  <code>>=6.5.1, <12.1.2</code>.
- Không copy bundle reference, không pin Swiper 7, không coi archive là vendor
  source an toàn.
- Nếu native scroll hiện tại không đủ và feature thực sự cần Swiper, dùng bản
  hiện hành đã audit; tại ngày tài liệu này là 14.0.7. Tối thiểu an toàn theo
  advisory là 12.1.2.
- Nếu dùng CDN, pin exact version, thêm SRI và
  <code>crossorigin="anonymous"</code>.

SRI đã tính cho Swiper 14.0.7:

| Asset | SRI |
| --- | --- |
| JS | <code>sha384-kHWvh6zWFwbm/ld2WlIlTnUiI28TQ4LLnOQqS2L+CaRr4y3AAfMqASByB2yrNY+g</code> |
| CSS | <code>sha384-qbiQGW8TLynT6rJgBowWSoRzyfSpiJaHZWLttiv+Ux2XlhlwU25/FGLq7yVBoeos</code> |

### Code reference tuyệt đối không được copy

- Barba <code>afterEnter</code> quét script trong container, tạo lại external
  script và gọi <code>eval(item.innerHTML)</code>.
- <code>debug: true</code> trong production.
- Malformed selected-menu selector thiếu dấu <code>]</code> trong
  <code>main.pretty.js:16988–17017</code>.
- YouTube lazy branch gọi <code>player.play()</code> nhưng không khởi tạo
  player/API.
- Video attributes nhận cả chuỗi <code>"true"</code>, trong khi code chỉ coi
  <code>"1"</code> là true.
- CSS selector
  <code>.slide-animate-super-zoomout .slide-animate-zoomin</code> thiếu dấu
  phẩy trong nhóm transition.
- Không có reduced-motion policy đủ dùng.

## 6. Contract header cố định của reference

### Markup semantic

Không copy SVG path. Chỉ giữ ý nghĩa cấu trúc:

- <code>header</code> là shell cố định.
- <code>#header-logo</code> chứa home link phủ và logo SVG.
- <code>#header-menu-items > ul > li > a</code> là desktop navigation.
- <code>#header-menu-toggle</code> là hit target.
- <code>#header-toggle-svg</code> là SVG ba line: top toàn chiều rộng, middle
  từ 25% đến 75%, bottom toàn chiều rộng.
- Active item dùng class <code>selected</code> ở <code>li</code>.

### Intro

| Target | From | Duration | Start | Ease |
| --- | --- | ---: | ---: | --- |
| <code>#header-logo</code> | <code>scale: 0</code> | 1,5 s | 0 | <code>power4.out</code> |
| nav <code>li</code> | <code>y: -150</code> | 1,5 s | 0,3 s | <code>power4.out</code>, stagger 0,1 |
| <code>#header-toggle-svg</code> | <code>scaleX: 0</code> | 1 s | 1,5 s | <code>power4.out</code> |

GSAP source dùng relative positions <code>-=1.2</code> và <code>-=.7</code>;
bảng trên là start time quy đổi từ timeline.

### Tone, collapse và hide/show

- <code>colorHeader(color)</code> tween trực tiếp:
  - SVG path <code>fill</code>: 0,3 s, <code>expo.out</code>.
  - nav link <code>color</code>: 0,3 s, <code>expo.out</code>.
  - hamburger line <code>stroke</code>: 0,3 s, <code>expo.out</code>.
- Collapse khi scroll Y lớn hơn 100 px.
- Scroll cue fade khi Y lớn hơn 200 px: 1 s, <code>expo.out</code>.
- Khi đổi hướng, ghi điểm bắt đầu mới. Hide khi đi xuống quá 150 px; show khi
  đi lên quá 150 px.
- Chỉ hide trong vùng giữa:
  <code>Y > 0.5 × viewportHeight</code> và
  <code>Y < documentHeight - 1.25 × viewportHeight</code>.
- Mouse <code>screenY <= 350</code> thêm <code>forceShow</code>.
- Header transform: 1 s,
  <code>cubic-bezier(0, 0, 0.1, 0.99)</code>.

### Geometry

| Viewport | Header grid | Width/padding | Nav |
| --- | --- | --- | --- |
| >1200 | <code>170px 1fr 65px</code> | width <code>calc(100% - 70px)</code>; padding <code>35px 35px 0</code>; gap 70px | một hàng |
| <=1200 | <code>145px 1fr 65px</code> | width <code>calc(100% - 50px)</code>; padding 25px; gap 25px | gap 37,5px |
| <=960 | giữ grid header | nav chia hai row, gap 25px | hai hàng |
| <=750 | grid shell giữ; nav ẩn | width <code>calc(100% - 30px)</code>; padding 15px; gap 15px | ẩn |

Collapsed padding: <code>10px 35px</code>, <code>10px 25px</code>,
<code>10px 15px</code> theo breakpoint. Collapsed logo width 125 px.

Hamburger:

- 35 × 19 px.
- Stroke 3 px.
- Hover: top/bottom <code>scaleX(.5)</code>, middle
  <code>scaleX(2)</code>.
- Active hover: hit target <code>scale(.8)</code>.
- Transform transition 0,3 s ease-out.

Underline nav/filter:

- Cao 3 px, <code>bottom: -4px</code>.
- Mặc định <code>scaleX(0)</code>, origin phải.
- Hover/selected <code>scaleX(1)</code>, origin trái.
- 0,3 s, <code>cubic-bezier(.4, 0, 0, 1)</code>.

### Persistence và selected state

- Header nằm ngoài <code>data-barba="container"</code>; soft navigation không
  tạo header mới.
- <code>beforeEnter</code> xoá mọi class <code>selected</code>, rồi đọc
  <code>data-menu-selected</code> và <code>data-menu-destacado</code> trên next
  container để chọn cả desktop/full-menu link có cùng
  <code>data-menu-section</code>.
- Route transition ép tone về <code>#2f2f2f</code>.
- Direct navigation là document load mới nên header intro chạy lại; persistence
  chỉ áp dụng cho Barba soft navigation.

Trường Thịnh đã có shell ngoài container. Main site header vẫn là adaptation vì
brand TT và locale khác reference; full-menu shell đã được đo và browser-verify
riêng tại mục 17.2.1. Không gọi **main header** “giống 1:1” nếu chưa đo lại
toàn bộ geometry/tone/timeline của shell đó.

## 7. Barba, full-menu và Locomotive

### Route transition reference

| Phase | Motion |
| --- | --- |
| leave | Đóng menu/appointment, body thêm transitioning, header về ink, destroy Locomotive; veil opacity 0→1 trong 0,75 s, <code>power4.inOut</code> |
| after | Update Locomotive; veil opacity 1→0 trong 1 s, <code>power4.inOut</code> |
| timeout | 15.000 ms |
| settings | <code>preventRunning: true</code>, <code>prefetchIgnore: true</code>, <code>debug: true</code> |
| history | <code>scrollRestoration = "manual"</code>; popstate phục hồi smooth/native Y |

Veil trắng không có page-specific motion JS. Persistent header nằm trên/ngoài
container; reference không replace shell.

### Full-menu timeline reference

Open:

- Page container scale 1→0,9; 0,7 s; <code>power2.out</code>;
  origin <code>50vw 50vh</code>.
- Body thêm menu-open, Locomotive stop.
- Timeline chạy <code>timeScale(1.15)</code>.

| Target | Motion | Duration | Position |
| --- | --- | ---: | --- |
| 4 background columns | height 0→100vh, stagger 0,15 | 0,6 s | 0 |
| menu logo | y -140, opacity 0→0/1 | 0,6 s | <code>-=.6</code> |
| language options | y -20, opacity 0→1, stagger 0,1 | 0,6 s | <code>-=.3</code> |
| appointment items | y -20, opacity 0→1, stagger 0,1 | 0,6 s | <code>-=.6</code> |
| close icon | rotate 90°→0°, opacity 0→1 | 0,6 s | <code>-=.45</code> |
| wrapper | opacity →1 | 0,6 s | <code>-=1.45</code> |
| wrapper columns | y -140, opacity 0→1, stagger 0,02 | 1 s | <code>-=1.6</code> |
| group children | y -20, opacity 0→1, stagger 0,03 | 0,6 s | <code>-=1</code> |

CSS divider/darkener chạy song song:

- Header divider mở sau 0,7 s.
- Divider group 1→4 có delay 0,9/1,1/1,3/1,5 s.
- Divider group 5→8 có delay 1,2/1,4/1,6/1,8 s.
- Darkener opacity 0→0,4 trong 0,6 s ease-out, không delay khi mở.
- Khi class menu-open bị bỏ, darkener dùng close delay 0,85 s rồi fade 0,6 s.

Close:

- Page scale về 1 sau delay 0,85 s; duration 0,7 s;
  <code>power2.out</code>.
- Menu timeline reverse tại <code>timeScale(2.25)</code>.
- Body bỏ menu-open; Locomotive start.

Full-menu columns:

- 4 mặc định.
- 3 tại <=1200.
- 2 tại <=960.
- 1 tại <=578.

### Locomotive reference

Khởi tạo:

- <code>smooth: true</code>
- <code>getSpeed: true</code>
- <code>getDirection: true</code>
- <code>useKeyboard: true</code>
- Không đặt lerp riêng; dùng default của 4.1.0.

Các giá trị quan trọng:

- Hero media: <code>data-scroll-speed="-2"</code>.
- Related-project rail: <code>data-scroll-speed="4"</code> và
  <code>data-scroll-direction="horizontal"</code>.
- Anchor <code>.scrollTo</code>: offset -50 px.
- Swiper autoplay pause/resume: viewport offset <code>90%, 33%</code>.
- Header-tone section: offset <code>95%, 5%</code>.

### Tất cả <code>data-scroll-call</code>

| Call | Nguồn | Hành vi |
| --- | --- | --- |
| <code>header-blanco</code> | Runtime thêm vào <code>.fn_headerBlanco</code> | Enter white, exit ink |
| <code>trigger-animate-lines</code> | Runtime thêm | Reveal một lần rồi xoá call |
| <code>trigger-animate-words</code> | Runtime thêm | Reveal một lần rồi xoá call |
| <code>sliderPause</code> | Runtime thêm cho autoplay Swiper | Enter start, exit stop |
| <code>carga-video</code> | 14 markup tĩnh | Lazy Vimeo/YouTube |

Không có scroll-call thứ sáu trong 254 HTML/shared runtime đã audit.

## 8. Component motion map

### Hero/portada/banner

- <code>layout-portada</code> là Swiper banner full viewport.
- <code>layout-hero-banner</code> chứa copy, CTA và media.
- Banner config: speed 500 ms, autoplay delay 6.000 ms, horizontal,
  grab cursor, mousewheel force-to-axis, lazy prev/next và bullet pagination.
- Hero media dùng parallax speed -2.
- Active slide chạy word/line reveal; previous slide reset.
- Scroll cue chỉ hiện lại sau transition end.
- Không sao chép selector super-zoom bị lỗi dấu phẩy.

### Lines, words và scroll cue

- Line source được SplitText chia, mỗi line bọc bằng
  <code>.line-wrapper</code>.
- Masked line: Y 2em→-0,1em; 1,9 s; <code>power4.out</code>;
  stagger 0,1.
- Word: opacity 0→1; 1 s; stagger 0,2; <code>expo.out</code>.
- Scroll cue:
  - delay đầu 3 s;
  - char vào từ top -20, opacity 0; 0,4 s; stagger 0,1;
  - giữ 3 s;
  - char ra top 20, opacity 0; 0,4 s; stagger 0,1;
  - repeat delay 3 s.

Trường Thịnh phải giữ Canvas TextMetrics và dynamic re-split cho dấu tiếng
Việt; không đổi sang hard-coded mask theo Silka.

### Gallery Swiper

- Speed 500 ms.
- <code>slidesPerView: auto</code>.
- Gap 20 px; mobile nhỏ 10 px.
- Mousewheel force-to-axis, grab cursor, edge swipe, watch overflow.
- Lazy prev/next amount 3.
- Pagination bullet; dynamic bullets trong cấu hình mobile.

TT hiện có native horizontal scroll/pointer drag. Giữ native trừ khi QA chứng
minh thiếu autoplay/touch lifecycle mà Swiper giải quyết tốt hơn.

### Related-project rail

- Không phải Swiper.
- Container reveal <code>animate-left</code>.
- Wrapper native horizontal content + Locomotive speed 4.
- Card reference: 300 × 420 px; <=1200 là 300 × 400 px.
- Card chẵn thêm margin-top 180 px; <=1200 là 120 px.
- Hover media/caption dùng CSS.

### Projects Masonry và filter

- 45 <code>masonry-item</code>.
- Filter group reveal: delay 1,3 s, Y 20→0, opacity 0→1, duration 1 s,
  stagger 0,15, <code>expo.out</code>.
- Click filter đổi selected, đổi <code>display</code>, gọi
  <code>msnry.layout()</code> và cập nhật Locomotive.
- Scroll về grid: desktop offset -270 px; mobile -100 px.
- Grid 4 cột; <=1200 là 3; <=960 là 2. Featured chiếm 2 cột tương ứng.
- Gutter/margin: 35/25/15 px theo breakpoint 1200/960.

Masonry không phải yêu cầu bắt buộc cho TT. CSS grid hiện tại là lựa chọn
ponytail tốt hơn nếu bố cục không cần pack chiều cao bất quy tắc.

### Unique/double image, paragraph, title, facts

- <code>layout-imagen-unica</code> và
  <code>layout-imagen-doble</code> dùng generic
  <code>animate-opacity/up/left/right/zoom*</code>.
- Generic transition: 0,6 s,
  <code>cubic-bezier(0, 0, .26, 1)</code>; delay mặc định 0,3 s.
- Fact items dùng stagger thủ công 0/0,15/0,30/0,45 s và có page dài hơn tới
  0,75 s.
- Paragraph/title không có initializer riêng; class/data-scroll quyết định
  reveal.

### Video/Vimeo

- 10 page có static <code>portada-video-wrapper</code> và Vimeo player script.
- 14 page có <code>video-container</code> + call
  <code>carga-video</code>.
- Lazy handler tạo iframe/player khi vào viewport rồi xoá call.
- Trong 14 lazy video của crawl, source đều là Vimeo; nhánh YouTube không được
  chứng minh hoạt động.
- Khi scroll, iframe bị tắt pointer events để tránh giành wheel.

TT chỉ thêm video khi CMS/content thực sự có video. Không tải player toàn site.

### Lazy loading

- Reference dùng lazysizes class <code>lazyload</code>,
  <code>lazyautosizes</code>, <code>lazyloaded</code>, data-srcset và opacity
  transition.
- TT giữ native <code>loading="lazy"</code>, explicit dimensions và stepped
  scroll verification; không cần thêm lazysizes.

### Hover/focus/drag inventory

Các interaction family đã audit:

- Header underline; selected underline.
- Hamburger line reshape và active scale.
- Full-menu link underline/disabled/selected.
- Appointment close/bubble.
- Banner CTA cover and arrow.
- News image zoom.
- Related-project image/caption.
- Masonry item underline.
- Brand/logo opacity.
- Footer social opacity.
- Checkbox click/keyboard.
- Input/select hover/focus.
- Cookie buttons.
- Swiper/Locomotive internal drag.

Reference tập trung hover; TT phải bổ sung <code>:focus-visible</code>, touch
target và ARIA tương đương.

### Shared CSS motion census

Năm keyframe:

- <code>swiper-preloader-spin</code>
- <code>animation-blink</code>
- <code>rotation</code>
- <code>videoLoading</code>
- <code>aniMarquee</code>

Inline motion đáng chú ý:

- 254 footer marquee tại 40 s.
- 5 brand marquee tại 30 s.
- 94 outlet image hover transition.
- 7 showroom image transition.
- 5 brand-logo transition.
- Một số contact/news transition riêng.

## 9. Ma trận route/reference family

| Reference | ID | Initializer | Component/motion chính | Mapping TT |
| --- | --- | --- | --- | --- |
| Home | home | Commons | 1 banner hero, news, 7 banner CTA, montage, 5-project rail, static Vimeo | <code>/vi/</code>, <code>/en/</code> |
| Interior Design | pagina | Commons | banner + gallery, 6 banner CTA, paragraph, 5-project rail | Residential |
| Kitchens | pagina | Commons | banner + gallery, 4 banner CTA, 3 showroom card, 5-project rail | Commercial |
| Projects list | proyectos-list | Commons + Proyectos | full-screen editorial hero, category filters, 45 Masonry card | Projects & products index |
| Project detail | proyecto | Commons | hero, gallery/facts/images/paragraph, related-project rail; 5/48 project thật không dùng Swiper | Localized project detail |
| About/Services và pagina khác | pagina | Commons | banner/gallery/facts/CTA; About có 9-frame tree và lazy video | About và section dùng chung |
| Brand list/detail | marcas-list / marca | Commons | grouped list hoặc gallery/facts; 5 page có extra marquee | Không có route trực tiếp |
| News list/detail | noticias-list / noticia | Commons + Noticias cho list | 26 filtered item; detail dùng gallery/images/video | Không có route trực tiếp |
| Showroom list/detail | showrooms-list / showroom | Commons | banner/gallery, 6 showroom card; detail có facts/news | Không có route trực tiếp |
| Outlet list/product | outlet / proyecto | Commons + Outlet cho list | filter/select, 71 product list tại snapshot; detail tái dùng proyecto | Product records trong Projects & products |

Không clone toàn bộ family không có trong scope TT. Chỉ tái dùng nguyên lý đã
đo cho component tương ứng.

## 10. Ma trận numeric parity

| Hành vi | Reference | Trigger | Breakpoint | Quyết định TT |
| --- | --- | --- | --- | --- |
| Route leave | 0,75 s, <code>power4.inOut</code> | Barba leave | mọi | Match |
| Route enter | 1 s, <code>power4.inOut</code> | Barba after | mọi | Match |
| Header logo intro | scale 0, 1,5 s, <code>power4.out</code> | initial document | mọi | Match timing; geometry chưa parity |
| Header nav intro | Y -150, 1,5 s, stagger 0,1, start 0,3 | initial document | desktop | Match timing |
| Header toggle intro | scaleX 0, 1 s, start 1,5 | initial document | mọi | Match timing |
| Header hide/show | 150 px direction delta | scroll middle | mọi | Match logic |
| Header collapse | 100 px | scroll | mọi | Match threshold |
| Header transform | 1 s cubic | class change | mọi | Match |
| Header tone | 0,3 s <code>expo.out</code> | tone section/route | mọi | Match target time |
| Underline | 3 px, bottom -4, 0,3 s cubic | hover/selected | mọi | Match visual contract |
| Menu page scale | 0,7 s, <code>power2.out</code> | open/close | mọi | Match intention; verify runtime |
| Menu shutters | 0,6 s, stagger 0,15, <code>power4.inOut</code> | open | 4/3/2/1 columns | Match family |
| Line reveal | 1,9 s, stagger 0,1, <code>power4.out</code> | scroll call | mọi | Match; preserve Vietnamese ink mask |
| Word reveal | 1 s, stagger 0,2, <code>expo.out</code> | hero/scroll | mọi | Match |
| Generic reveal | 0,6 s cubic | in-view | mọi | Match selectively |
| Gallery | 500 ms | interaction | gap 20/10 | Native TT; do not force Swiper |
| Filter intro | delay 1,3; 1 s; stagger 0,15 | projects enter | mọi | Optional; do not animate tiles on filter |
| Related rail | speed 4 horizontal | scroll | card 300×420/400 | Match rhythm, not media |
| Reference hero | autoplay 6 s; slide 500 ms | viewport/autoplay | mọi | Không áp vào TT |
| TT hero F | zoom 5 s `sine.inOut`; cross-fade 1,6 s; fade start 4,2; next zoom start 5,0 | approved carousel | mọi | **Authoritative, frozen** |

## 11. Mapping và trạng thái Trường Thịnh ngày 2026-08-01

Đây là source inspection tại thời điểm viết; cột V chỉ được nâng sau một browser
run mới.

| Hạng mục | Trạng thái | Bằng chứng hiện tại | Gap / slice sở hữu |
| --- | --- | --- | --- |
| Shared stack | A/I | GSAP 3.13.0, Locomotive 4.1.4, Barba 2.10.3 có SRI trên 5 source route | QA dependency/console |
| Persistent shell soft nav | A/I/V-old | Header/menu/CTA nằm ngoài container; <code>motion.js</code> sync shell/head | Slice Shell chạy lại identity test |
| Header intro timing | A/I/V-old | <code>motion.js:650–672</code> | Slice Header verify direct vs soft |
| Header exact geometry | A/G | TT dùng grid 190px + language control, logo 60/48px, breakpoint 980 | Slice Header đo 1:1; không blanket override |
| Header tone đồng thời resize | I/V-old | Shared color tween + collapsed class | Slice Header kiểm video 60 fps |
| Direct entry | I/V-old | Inline boot script trên từng route + <code>route-enter</code> | Slice Shell kiểm cold load/reload/history |
| Soft entry | I/V-old | Barba persistent-shell, veil 0,75/1 s | Slice Shell kiểm không replace header |
| Locale giữ scroll | I/V-old | Session key + pending locale route | Slice Shell kiểm VI↔EN ở nhiều Y |
| User-approved hero | I/F/V-old | <code>motion.js:729–749</code> | Frozen; regression test bắt timing |
| Reduced motion | I/V-old | Không init Locomotive/timeline; CSS fail-open | Slice QA |
| Vietnamese masks | I/V-old | Canvas TextMetrics + resplit | Slice Typography kiểm 320–1440 |
| Residential/commercial hero | A/I/V-old | Motto + detail motion hooks | Slice Service pages đo lại geometry |
| Native gallery | I/V-old | <code>detail.js</code> native scroll/pointer drag | Slice Gallery, không thêm lib trước khi đo |
| Related rail | A/I/V-old | Native horizontal track + desktop parallax | Slice Rails so 1:1 |
| Projects-products hero | A/I/V-old | Full-screen editorial hero/filter | Slice Projects đo vertical balance |
| Projects grid categories | A/G | Source tĩnh chỉ có all/kiosk/mobile/signage/lightbox; chưa phản ánh đủ CMS/category plan | Slice Projects data/render/filter |
| Product records trong grid | G | Public products API tồn tại nhưng source grid chưa SSR toàn bộ record | Slice Worker + Projects |
| Project detail route | G | Worker nhận <code>/projects/:slug/</code> nhưng dùng source projects-products | Slice Project-detail SSR |
| Ba project preset | G | Validate/store được <code>compact-gallery</code>, <code>editorial-case</code>, <code>process-film</code>; chưa render preset riêng | Slice Project-detail SSR |
| Vimeo/video | A/G | Chưa có nhu cầu runtime đã chốt | Slice Media chỉ khi content yêu cầu |

“V-old” gồm các browser/test report trước thay đổi gần đây. Không dùng
<code>docs/memory/CURRENT.md</code> như bằng chứng pass hiện tại nếu code đã đổi.

Exact CDN/SRI đang có trong source TT:

| Dependency | Version | SRI |
| --- | ---: | --- |
| GSAP | 3.13.0 | <code>sha384-HOvlOYPIs/zjoIkWUGXkVmXsjr8GuZLV+Q+rcPwmJOVZVpvTSXQChiN4t9Euv9Vc</code> |
| Locomotive JS | 4.1.4 | <code>sha384-OCi7pis5Dzyb6liFSmJPTTJCogFKCIyxEx0jyPpmpqv3GyDGCIG3AiXjev/vqpGF</code> |
| Locomotive CSS | 4.1.4 | <code>sha384-8DE/Lk4d6Oc/WO04f3lv9vQCSrM28sDYyEmrs9hx4+b+oOrgm4txW7cOxPWlTHEd</code> |
| Barba Core | 2.10.3 | <code>sha384-T3/AkZI+fU7l5Ip18n7KLEi8r0LPLwiyIp0+anP6LuGlXmAwDS6l6YhmhJjiki/x</code> |

### Gap project-detail bắt buộc xử lý

<code>worker/index.js:156–175</code> parse route project detail nhưng chọn
<code>SOURCE_ROUTES["projects-products"]</code>. Record project chỉ được áp vào
leaf <code>data-cms</code> của source index; không có renderer khác nhau cho ba
preset. Kết quả route detail có nguy cơ trả cùng hero/grid/filter của index.

Acceptance cho slice:

1. Renderer riêng theo preset.
2. Namespace riêng cho project detail.
3. Canonical/hreflang/title/description đúng locale.
4. Chỉ project published xuất public/sitemap.
5. Ảnh, facts, gallery/process/film field đúng preset.
6. Direct, soft, Back/Forward và reduced motion đều test.

## 12. Những cải tiến TT phải giữ hơn reference

### Accessibility

- <code>prefers-reduced-motion</code> fail-open: nội dung luôn nhìn thấy.
- Không init smooth-scroll hoặc presentation timeline khi reduce.
- Keyboard/focus-visible cho menu, filters, gallery và CTA.
- Dialog trả focus về opener, dọn state trên BFCache/pageshow.
- Touch target đủ lớn; không phụ thuộc hover.
- Dynamic VI/EN giữ markup và ARIA.
- Canvas TextMetrics bảo vệ dấu tiếng Việt khỏi mask clipping.

### Performance

- Native lazy image + width/height; không thêm lazysizes.
- Native horizontal gallery/rail trước khi thêm Swiper.
- CSS grid trước khi thêm Masonry.
- Conditional Vimeo; không tải player toàn site.
- Không dùng full Swiper bundle chỉ cho vài module.
- Giữ persistent header để tránh repaint/flicker.
- Kill timeline/listener cũ khi Barba unmount.

### Security

- Exact dependency pins + SRI + crossorigin.
- Không <code>eval</code>, không reinject arbitrary inline script.
- Không copy bundle vulnerable/outdated.
- CMS media validation giữ ở server boundary.
- Không đưa analytics/GTM/owner facts khi chưa có ID/dữ liệu thật.

## 13. Provenance

### Local source quan trọng

| Evidence | Path / line |
| --- | --- |
| Crawl method/result | <code>reference-audit/web-reference/archive/README.md</code> |
| Public shell markup | <code>reference-audit/web-reference/source/home.html:85–370</code> |
| Common Barba + unsafe script reinjection | <code>main.pretty.js:16971–17104</code> |
| Locomotive/header/scroll-call | <code>main.pretty.js:17107–17406</code> |
| Header intro | <code>main.pretty.js:17408–17449</code> |
| Commons/SplitText/Swiper/cue | <code>main.pretty.js:17595–17824</code> |
| Projects/Masonry filters | <code>main.pretty.js:18118–18170</code> |
| Outlet/news filters | <code>main.pretty.js:18172–18327</code> |
| Header color/history/menu | <code>main.pretty.js:18348–18529</code> |
| Generic motion CSS | <code>main.pretty.css:1327–1656</code> |
| Link/underline CSS | <code>main.pretty.css:1721–1781</code> |
| Full-menu CSS | <code>main.pretty.css:1895–2264</code> |
| Header CSS | <code>main.pretty.css:2437–2589</code> |
| Hero CSS | <code>main.pretty.css:2606–2879</code> |
| Related rail CSS | <code>main.pretty.css:3152–3248</code> |
| Video CSS | <code>main.pretty.css:3442–3552</code> |
| Gallery CSS | <code>main.pretty.css:3704–3760</code> |
| Masonry CSS | <code>main.pretty.css:3764–3849</code> |
| Footer marquee | <code>main.pretty.css:3925–4054</code> |
| Home component source | <code>source/home.html:370–840</code> |
| Kitchens source | <code>source/kitchens.html:370–880</code> |
| Projects source | <code>source/projects.html:370–520</code> |
| About source | <code>source/about-us.html:370–980</code> |
| Representative project detail | <code>archive/site/en/projects/can-molteni/index.html:370–850</code> |
| Attached rail semantics | Attachment <code>pasted-text.txt:1–76</code> |
| TT shell/motion | <code>motion.js:180–340</code>, <code>630–770</code>, <code>1060–1205</code>, <code>1430–1565</code> |
| TT header CSS | <code>style.css:161–365</code>, <code>1570–1660</code> |
| TT project-detail routing gap | <code>worker/index.js:156–186</code> |

Bundle identity:

| File | Byte | SHA-256 |
| --- | ---: | --- |
| <code>source/main.min.js</code> | 345.871 | <code>91f971d6f6a2f9829660f9422789ed6fb311fa915040820d16dd192ecf6b064c</code> |
| <code>source/main.min.css</code> | 88.212 | <code>b3cb9abf01889550121da4ebd11513ec4d7cc746f4a2672ba3d76871451c1296</code> |
| <code>source/normalize.css</code> | 6.138 | <code>580818700724d42d7fcc4979b0197971fca1c6d2e0286769237a0ac897df5512</code> |

### Official references

- [Swiper security advisory](https://github.com/nolimits4web/swiper/security/advisories/GHSA-hmx5-qpq5-p643)
- [Swiper documentation](https://swiperjs.com/get-started)
- [GSAP installation](https://gsap.com/docs/v3/Installation/)
- [GSAP standard license](https://gsap.com/community/standard-license/)
- [Barba basic transition](https://barba.js.org/docs/getstarted/basic-transition/)
- [Locomotive Scroll repository](https://github.com/locomotivemtl/locomotive-scroll)
- [lazysizes repository](https://github.com/aFarkas/lazysizes)
- [Vimeo Player repository](https://github.com/vimeo/player.js)

## 14. Update protocol

### Khi reference thay đổi hoặc audit quá hạn

1. Re-crawl vào archive trống hoặc chạy crawler theo hướng dẫn:

   ~~~powershell
   node scripts/archive-reference.mjs --origin &lt;url&gt;
   ~~~

2. Xác minh robots, timestamp, URL/page/asset count, manifest hash.
3. Tái đếm namespace, <code>data-barba-id</code>, class token, functional
   signature và component census.
4. Hash bundle; xác định lại dependency/version/license/advisory.
5. Mở Chrome đo route transition, header identity, menu, hero, filters, hover,
   reduced motion và breakpoints.
6. Cập nhật “ngày audit”, provenance và các matrix. Không ghi đè số cũ mà
   không nêu nguyên nhân chênh lệch.
7. Chạy side-by-side Trường Thịnh ngay sau mỗi visual edit.

### Bằng chứng tối thiểu sau mỗi component edit

- Route + locale + viewport.
- Reference screenshot và TT screenshot.
- Bounding box/timing computed hoặc performance trace.
- Console/network/overflow.
- Keyboard/focus nếu interactive.
- Reduced-motion nếu animated.
- Trạng thái direct entry và soft navigation nếu shell/header.
- Lệnh test và kết quả; nếu chưa chạy, ghi “not verified”.

### Graphify

Sau khi sửa code/doc, hook sẽ đánh dấu dirty và coalesce update. Lệnh recovery
thủ công là:

~~~powershell
& ".\.tooling\python\Scripts\graphify.exe" update .
~~~

Graphify lấy AST/heading/link; semantic quan hệ ảnh và nhận định visual vẫn cần
người cập nhật. Nếu chỉ chạy incremental local, handoff phải ghi
<code>semantic update required</code> khi cần full semantic graph.

## 15. Hệ chữ reference và mapping sang Plus Jakarta Sans

### 15.1 Font-face thật trong archive

Source reference khai báo năm family độc lập, mỗi family có WOFF2 và WOFF.
Không family nào khai báo numeric weight khác `normal`; độ đậm nằm trong file
glyph. Hai file có tên `italic` cũng khai báo `font-style: normal`, nghĩa là
nghiêng được vẽ sẵn trong font chứ không đến từ CSS `font-style: italic`.

| Family reference | File glyph | CSS weight/style | Vai trò đã thấy | Mapping TT được phép |
| --- | --- | --- | --- | --- |
| `silka-regular` | `silka-regular-webfont` | normal / normal | body, paragraph, h2, caption | Plus Jakarta Sans 400 normal |
| `silka-regular-italic` | `silka-regularitalic-webfont` | normal / normal | `i`, italic thường | Plus Jakarta Sans 400 italic nếu tải thật; source TT hiện chưa tải face này |
| `silka-medium` | `silka-medium-webfont` | normal / normal | h1, fact title, display medium | Plus Jakarta Sans 500 normal |
| `silka-medium-italic` | `silka-mediumitalic-webfont` | normal / normal | `h1 i`, bold italic | Plus Jakarta Sans 500 italic |
| `silka-semibold` | `silka-semibold-webfont` | normal / normal | nav, h3, filter, bold/button/menu | Plus Jakarta Sans 600 normal |

Reference áp `-webkit-font-smoothing: antialiased` và
`-moz-osx-font-smoothing: grayscale` cho mọi phần tử; `html` là 16 px,
line-height 1.4. TT đang dùng Plus Jakarta Sans 16/1.4, antialias và
`text-rendering: optimizeLegibility` trong `style.css:27–37`.

**Giới hạn bắt buộc:** bảng trên là mapping vai trò, không phải khẳng định hai
font có cap-height, x-height, advance width, kerning, ascent hoặc descent tương
đương. Không dùng số font-size của Silka như token pixel cố định cho Plus
Jakarta Sans mà bỏ bước đo DOMRect. Silka không được đưa vào production vì
archive không chứa bằng chứng license.

HTML TT hiện tải Plus Jakarta Sans 400/500/600/700 normal và 500 italic qua
Google Fonts (`index.html:7–12` và các route tương ứng). Vì vậy vai trò
`silka-regular-italic` là **BLOCKED BY FONT METRICS** cho tới khi tải 400 italic
hoặc chủ động quyết định dùng 500 italic. Không để browser synthetic-italic mà
không ghi nhận.

### 15.2 Semantic role map

| Semantic role | Reference family | TT role | Quy tắc |
| --- | --- | --- | --- |
| Body/copy | regular | PJS 400 | 16/1.4 nền; paragraph 24 desktop, 20.8 <=960 ở reference |
| Display h1 | medium | PJS 500 | uppercase; desktop `font-weight:100` không làm file Silka mảnh hơn; mobile 400 và tracking -0.03em |
| Editorial h2 | regular | PJS 400 | 64/56/48/40 theo 1200/960/750; weight 100 chỉ là CSS request trên face regular |
| Kicker/h3/nav/filter | semibold | PJS 600 | uppercase, compact, underline 3 px/-4 px khi active |
| Emphasis italic | regular-italic | PJS 400 italic | dùng trong body/h2; phải tải face thật nếu dùng |
| Display italic | medium-italic | PJS 500 italic | dùng trong h1; `font-style` computed của reference vẫn là normal |
| Facts/rail/card captions | regular hoặc medium | PJS 400/500 | caption 12.8; fact title 28.8 desktop, 20.8 <=960 |

## 16. Typography token và composition theo component

Các giá trị dưới đây là contract của reference, không phải blanket override.
`fillText` khởi đầu từ `data-fontSize`, sau đó giảm từng 0.25em đến khi không
overflow parent. Vì vậy hero là một thuật toán fit-to-box, không phải một
font-size duy nhất. Bảng này là **[S] source-extracted**. Trong phần mở rộng
này, **[L]** nghĩa là live Chrome measured và **[I]** là nhận định/inference;
không được trộn ba mức bằng chứng.

| Component reference | Family / weight / style | Size / line / tracking | Case, decoration, width, alignment | Mask và responsive |
| --- | --- | --- | --- | --- |
| Header nav | semibold / glyph-normal | 16/22.4, normal spacing | uppercase; gap 35; selected pseudo 3 px, bottom -4 | desktop grid; 2 row <=960; hidden <=750 |
| Hero kicker | semibold / glyph-normal | 16/22.4 | uppercase; order trước title; left desktop, center <=750 | generic opacity/right reveal; không cắt dấu |
| Hero title/motto | medium + medium-italic | start 112/156.8; adaptive `fillText`; mobile -0.03em | uppercase; wrapper 80%, max 1000; line 1 left, line 2 right và kéo lên; mobile center | word opacity reveal; title không dùng line mask |
| Projects hero | medium + medium-italic | adaptive từ 112; mobile 40–64 theo line/content | two-line asymmetric; hero cao `calc(100vh - 50px)` | wrapper super-zoomout; word reveal; filter ở đáy |
| Project filters/tabs | semibold | 16/22.4; 15.36/21.504 ở viewport cao <=845 | uppercase; active opacity 1 + underline 3/-4; inactive opacity .3 | wrap desktop; horizontal scroll mobile; margins 15x25 hoặc 8x25 |
| Editorial eyebrow | semibold | 16/22.4 | uppercase; tựa h3, left | generic reveal; no hard crop |
| Editorial h2 | regular / requested 100 | 64/89.6; 56 <=1200; 48 <=960; 40 <=750 | natural case; full width hoặc `80vh` half layout | SplitText line wrapper khi `.animate-lines` |
| Editorial paragraph | regular 400 | 24/33.6; 20.8/29.12 <=960 | max 600; align block về phải; indent 100, mobile 50 | line wrapping theo font thật; không `noWrap` |
| Line reveal text | inherited | inherited | source split thành visual lines | wrapper overflow hidden; child Y 2em→-0.1em |
| Word reveal text | inherited | inherited | split theo word; không đổi text metrics | word opacity 0→1; không cần overflow mask |
| Caption/gallery | regular 400 | 12.8/17.92; Projects <=578 là 11.2/15.68 | uppercase; margin-top 10 | rail opacity 0 desktop, 1 <=960; gallery caption có thể rỗng |
| Related project card | caption regular | 12.8/17.92 | uppercase; card 300x420, 300x400 <=1200, 200x300 <=960 | card chẵn offset 180/120; hover image 1.15 và caption 1 |
| Facts/process analogue | regular number/body; medium title | number 12.8/17.92; title 28.8/40.32 desktop, 20.8/29.12 <=960; body 16/22.4 | number/title uppercase; desktop left, <=960 centered | item stagger 0/.15/.30/.45; borders chuyển 4→2→1 cột |
| CTA banner title | medium | h2 responsive 64/56/48/40 | uppercase; image-backed overlay; center | line reveal; image hover scale 1.1 |
| CTA/button label | semibold | h3 16/22.4; nested secondary .8em | uppercase; underline/arrow | arrow moves 12.5%; active/focus phải được TT bổ sung |
| Full-menu option | semibold | base 13.6/19.04 (`.85em`) | uppercase; disabled opacity .3; underline 3/-4 | groups/grid reflow 1200/960/578; timeline owns reveal |
| Footer links/body | inherited regular/semibold | about .9em; newsletter h3 1em mobile | sparse link grid; footer logo max 150 | grid 3 columns→1 at 960; TT bỏ footer-brand là ngoại lệ đã duyệt |
| Project-detail title | medium + medium-italic | adaptive from 112; mobile measured 68–100 per line | uppercase; line 1 left, line 2 right; center <=750 | word reveal; hero media parallax -2 |
| Project-detail facts | regular/medium | như facts ở trên | 4-column desktop; 2 <=960; 1 <=750 | generic up+opacity, manual delay |
| Project-detail gallery/related caption | regular | 12.8/17.92 | uppercase | related caption hidden desktop until hover, visible <=960 |

### Montage Home

Reference dùng bốn hàng flex độc lập: center → start → end → center. H1 là
6.5vw, capped 6.5em từ 1600 px; mỗi ảnh 13vw×10vw, capped 200×150, margin 15
(10 <=960), top -0.7vw. Đây là bố cục editorial đan chữ/ảnh, không phải một
paragraph căn giữa. TT giữ cấu trúc này nhưng dùng `min(9.506vw, 6.25rem)` để
thân chữ hoa Plus Jakarta Sans đạt đúng 75 px tại viewport 1052 px theo duyệt;
dấu tiếng Việt được chứa bằng mask ink overflow hiện có.

## 17. Live computed style và DOMRect baseline

### 17.1 Phương pháp đo

- Ngày đo: **2026-08-01**.
- Engine: Google Chrome stable cài local, điều khiển bằng Playwright/CDP.
- Mỗi viewport là một cold page riêng; chờ `document.fonts.ready`, rồi 3.5 s
  để initializer, SplitText và `fillText` hoàn tất.
- Viewport: 320×844, 390×844, 768×900, 1024×900, 1440×900.
- Ký hiệu `F/L | x,y,w,h`: computed font-size/line-height và DOMRect theo CSS
  pixel, `scrollY=0`. Tất cả bảng trong mục này là **[L] live measured**.
- Chrome DevTools MCP không được dùng trong lượt đo này vì profile chung đang
  bị một process khác giữ lock; không đóng process dùng chung. Đây vẫn là
  Chrome thật, không phải suy luận từ screenshot.

`fillText` có thể cho kết quả khác nếu liên tục resize cùng một document vì
runtime chạy lại fit loop. Baseline dưới đây dùng cold load từng viewport để
loại cumulative state. QA responsive vẫn phải kiểm cả cold load và resize.

### 17.2 Home — hero, montage, header/rail

[Archive index](../reference-audit/web-reference/README.md)

| Width | Hero line 1 `F/L + rect` | Hero line 2 `F/L + rect` | Montage row 1 `F/L + rect` | Montage row 4 `F/L + rect` |
| ---: | --- | --- | --- | --- |
| 320 | 24/33.6 \| 31.3,399.6,263.5,33.6 | 24/33.6 \| 31.3,424.8,263.5,33.6 | 20.8/29.12 \| 79.5,2825.5,160.9,32 | 20.8/29.12 \| 27.5,2921.5,264.9,32 |
| 390 | 20/28 \| 34.5,399.6,321,28 | 28/39.2 \| 34.5,417.8,321,39.2 | 25.35/35.49 \| 99.1,2803.1,191.8,39 | 25.35/35.49 \| 35.8,2920.1,318.5,39 |
| 768 | 40/56 \| 76.8,399.6,614.4,56 | 48/67.2 \| 76.8,438.8,614.4,67.2 | 49.92/69.888 \| 198.2,2416,371.7,76.8 | 49.92/69.888 \| 67.4,2646.4,633.3,76.8 |
| 1024 | 56/78.4 \| 102.4,374.4,819.2,78.4 | 68/95.2 \| 102.4,429,819.2,95.2 | 66.56/93.184 \| 262.5,1921.2,498.9,102.4 | 66.56/93.184 \| 88.2,2228.3,847.7,102.4 |
| 1440 | 68/95.2 \| 220,357.6,1000,95.2 | 80/112 \| 220,424.8,1000,112 | 93.6/131.04 \| 375.3,1994.3,689.4,144 | 93.6/131.04 \| 130.1,2426.3,1179.8,144 |

Header nav là 16/22.4, semibold, uppercase; bị ẩn ở 320/390. Rect của link
đầu ở 768 là 209.1,45,79.1,19; 1024 là 234.8,45,79.1,19; 1440 là
397.3,58.6,79.1,19. Rail caption là 12.8/17.92; opacity 1 tới 960 và 0 ở
1024/1440 trước hover.

### 17.2.1 Full menu — parity re-measurement

- Ngày đo lại: **2026-08-02**. Chrome cold page, `document.fonts.ready`, mở
  menu bằng pointer thật và chờ 2,2 s để timeline hoàn tất.
- Reference dùng `#full-menu-header`/`#full-menu-wrapper`; TT dùng
  `.menu-head`/`.menu-nav`. Các số dưới là CSS pixel, theo thứ tự
  `header height / menu viewport height`.

| Viewport | Reference contract | TT live | TT brand box | TT mark box |
| ---: | --- | --- | --- | --- |
| 1440×900 | 137.5 / 741 | 137.5 / 741 | 170×67.5 | 60×60 |
| 1024×900 | 109.6 / 741 | 109.6 / 741 | 150×59.6 | 48×48 |
| 768×900 | 109.6 / 791 | 109.6 / 791 | 150×59.6 | 48×48 |
| 390×900 | 227 / 653 | 227 / 653 | 150×59.6 | 48×48 |
| 320×900 | 227 / 653 | 227 / 653 | 150×59.6 | 48×48 |

Typography parity (sau khi giữ Plus Jakarta Sans là font production của TT):
title `28.8/40.32`, weight 500; option `13.6/19.04`, weight 600; title dùng
toàn bộ cột nội dung thay vì `fit-content` để line-wrap và underline không lệch
khi copy VI dài hơn reference. Reference có ba ngôn ngữ và appointment rộng
210 px; TT có hai ngôn ngữ (VI/EN) và copy appointment tiếng Việt, nên độ rộng
nội dung là **locale adaptation**, không phải sai lệch grid.

Brand audit: reference logo container là 170 px (150 px tại <=1200); TT outer
box đã khớp. Mark TT được tăng từ 42 px lên 60 px desktop và 48 px tại
<=1200 để lấp đúng footprint của box mà vẫn giữ wordmark Trường Thịnh; không
copy SVG/path của web tham khảo.

### 17.2.2 Full menu — language, appointment and link states

- Reference source đã được đối chiếu trực tiếp trong `home.html` và
  `main.pretty.css`: language dùng tên đầy đủ `Español`, `English`, `Deutsch`;
  CTA dùng icon lịch 35×35 với symbol viewBox `58.09×57.82`, stroke `4px`;
  link underline dùng pseudo-element cao `3px`, cách baseline `4px`,
  transform `scaleX(0 → 1)` trong `0.3s cubic-bezier(0.4,0,0,1)`.
- TT trước sửa dùng `VI`/`EN` và vì `.menu-head` đặt `font-size: .8rem`, hai
  control kế thừa `.85em = 10.88px/15.232px`; icon vẫn là path 24×24 với
  stroke `1.5px`. Đây là sai lệch trực tiếp, không phải locale adaptation.
- TT hiện dùng tên đầy đủ `Tiếng Việt`/`English` (EN runtime hiển thị
  `Vietnamese`/`English`), giữ `data-language-option` và route persistence;
  control là `13.6px/19.04px`, semibold, uppercase bằng CSS. Appointment giữ
  copy theo route (`Đặt lịch khảo sát`, `Đặt lịch khảo sát nhà`) và dùng đúng
  hình học lịch reference ở kích thước hiển thị `35×35px`, stroke `4px`.
- Title và option của menu dùng cùng underline system: `3px`, `bottom:-4px`,
  origin phải → trái khi hover, và giữ `scaleX(1)` khi `aria-current="page"`;
  title giữ line-wrap tiếng Việt bằng span nội tuyến có max-width cột.
- Chrome runtime sau sửa tại `1440/1093/1024/768/390/320`: header vẫn
  `137.52px` desktop và `109.58px` từ <=1200; title→option gap `30px`,
  option→option gap `34.04px` (`19.04 + 15`), không overflow ngang. Hover
  title/option và selected title đều trả transform `matrix(1,0,0,1,0,0)` sau
  `0.3s`; không đổi timeline mở/đóng menu hay motion chuyển trang.
- Quyết định nội dung ngày 2026-08-02: Trường Thịnh chỉ giữ bốn route cấp cao và
  bỏ toàn bộ option/subitem trong menu. Đây là ngoại lệ nội dung có chủ đích so
  với reference; geometry head/nav, divider, underline title và GSAP timing vẫn
  áp dụng theo các số đo trên. Runtime không còn fetch project để hydrate menu.

### 17.3 Interior Design — service hero và editorial copy

[Archive index](../reference-audit/web-reference/README.md)

| Width | Hero line 1 `F/L + rect` | Hero line 2 `F/L + rect` | First h2 `F/L + rect` |
| ---: | --- | --- | --- |
| 320 | 72/100.8 \| 31,386.3,258,100.8 | 52/72.8 \| 31,468.9,258,72.8 | 40/56 \| 15,874,290,280 |
| 390 | 88/123.2 \| 34.5,366.7,321,123.2 | 64/89.6 \| 34.5,467.5,321,89.6 | 40/56 \| 15,874,360,224 |
| 768 | 112/156.8 \| 76.8,333.1,614.4,156.8 | 112/156.8 \| 76.8,450.7,614.4,156.8 | 48/67.2 \| 25,960,718,134.4 |
| 1024 | 112/156.8 \| 102.4,333.1,819.2,156.8 | 112/156.8 \| 102.4,450.7,819.2,156.8 | 56/78.4 \| 25,990,974,156.8 |
| 1440 | 112/156.8 \| 220,333.1,1000,156.8 | 112/156.8 \| 220,450.7,1000,156.8 | 64/89.6 \| 35,990,1370,89.6 |

Kicker là 16/22.4 semibold uppercase. Rect: 39,340.1,258,44.8 ở 320;
42.5,286.9,321,44.8 ở 390; 84.8,275.7,614.4,22.4 ở 768;
110.4,275.7,819.2,22.4 ở 1024; 228,275.7,1000,22.4 ở 1440. Paragraph
là 20.8/29.12 tới 768 và 24/33.6 từ 1024; max-width 600, align phải ở
desktop, text-indent 100/50 theo breakpoint.

### 17.4 Kitchens — service hero và editorial copy

[Archive index](../reference-audit/web-reference/README.md)

| Width | Hero line 1 `F/L + rect` | Hero line 2 `F/L + rect` | First h2 `F/L + rect` |
| ---: | --- | --- | --- |
| 320 | 24/33.6 \| 31,433.9,258,33.6 | 32/44.8 \| 31,456.3,258,44.8 | 40/56 \| 15,874,290,168 |
| 390 | 28/39.2 \| 34.5,414.3,321,39.2 | 40/56 \| 34.5,439.5,321,56 | 40/56 \| 15,874,360,168 |
| 768 | 56/78.4 \| 76.8,397.5,614.4,78.4 | 76/106.4 \| 76.8,449.3,614.4,106.4 | 48/67.2 \| 25,960,718,134.4 |
| 1024 | 76/106.4 \| 102.4,363.9,819.2,106.4 | 104/145.6 \| 102.4,433.9,819.2,145.6 | 56/78.4 \| 25,990,974,78.4 |
| 1440 | 92/128.8 \| 220,347.1,1000,128.8 | 112/156.8 \| 220,436.7,1000,156.8 | 64/89.6 \| 35,990,1370,89.6 |

Kicker là 16/22.4 semibold uppercase. Paragraph và caption dùng cùng token
Interior; CTA title đo 40/56 tại 320, 48/67.2 tại 390, 64/89.6 từ 768;
CTA label là 16/22.4 semibold uppercase.

### 17.5 Projects — full-screen title và filter

[Archive index](../reference-audit/web-reference/README.md)

| Width | Hero line 1 `F/L + rect` | Hero line 2 `F/L + rect` | Active filter `F/L + rect` |
| ---: | --- | --- | --- |
| 320 | 52/72.8 \| 31,355,258,72.8 | 40/56 \| 31,413.8,258,56 | 15.36/21.504 \| 25,671.7,69.8,21.5 |
| 390 | 64/89.6 \| 34.5,338.2,321,89.6 | 52/72.8 \| 34.5,409.6,321,72.8 | 15.36/21.504 \| 25,671.7,69.8,21.5 |
| 768 | 112/156.8 \| 76.8,304.6,614.4,156.8 | 92/128.8 \| 76.8,429.2,614.4,128.8 | 16/22.4 \| 159.3,468,72.8,22.4 |
| 1024 | 112/156.8 \| 101.8,290.4,820.4,157 | 112/156.8 \| 101.8,408.1,820.4,157 | 16/22.4 \| 188.6,573.1,72.8,22.4 |
| 1440 | 112/156.8 \| 220,290.6,1000,156.8 | 112/156.8 \| 220,408.2,1000,156.8 | 16/22.4 \| 396.6,572.8,72.8,22.4 |

Active filter pseudo-element đo đúng 3 px, bottom -4 px, transition 0.3 s
`cubic-bezier(.4,0,0,1)`. Inactive filter opacity .3. Masonry caption là
11.2/15.68 ở 320/390 và 12.8/17.92 từ 768.

### 17.6 Project detail — Can Molteni

[Archive index](../reference-audit/web-reference/README.md)

| Width | Title line 1 `F/L + rect` | Title line 2 `F/L + rect` | First h2 `F/L + rect` |
| ---: | --- | --- | --- |
| 320 | 80/112 \| 31,329.6,258,112 | 68/95.2 \| 31,417.8,258,95.2 | 40/56 \| 15,874,290,280 |
| 390 | 100/140 \| 34.5,301.6,321,140 | 88/123.2 \| 34.5,410.8,321,123.2 | 40/56 \| 15,874,360,280 |
| 768 | 112/156.8 \| 76.8,304.4,614.4,156.8 | 112/156.8 \| 76.8,422,614.4,156.8 | 48/67.2 \| 25,960,718,335.9 |
| 1024 | 112/156.8 \| 102.4,304.4,819.2,156.8 | 112/156.8 \| 102.4,422,819.2,156.8 | 56/78.4 \| 25,990,974,392 |
| 1440 | 112/156.8 \| 220,304.4,1000,156.8 | 112/156.8 \| 220,422,1000,156.8 | 64/89.6 \| 35,990,1370,448 |

Detail paragraph là 20.8/29.12 tới 768 và 24/33.6 từ 1024, max 600.
Fact number là 12.8/17.92; fact title 20.8/29.12 tới 768 và 28.8/40.32
từ 1024; fact body 16/22.4. Facts centered tới 960, left từ 1024. Gallery
và related caption là 12.8/17.92; related opacity 1 tới 960 và 0 desktop.

## 18. Exact text-motion map

Toàn bộ giá trị trong bảng là **[S] source-extracted** từ shared bundle; các
timing đã quan sát live ở mục trước chỉ dùng để kiểm chéo, không thay thế source.

| Target / lifecycle | Start | End | Time / stagger / ease | Trigger, replay và reset |
| --- | --- | --- | --- |
| Header logo intro | scale 0 | scale 1 | 1.5 s, `power4.out` | direct document init; không replay theo Barba container |
| Header nav intro | Y -150 | Y 0 | 1.5 s, .1 each, `power4.out`; start 0.3 s | direct init; shell persistent |
| Header toggle intro | scaleX 0 | 1 | 1 s, `power4.out`; start khoảng 1.5 s | direct init |
| Header tone | current fill/color/stroke | target tone | .3 s, `expo.out`; three tweens overlap | `header-blanco` enter/exit và route state; không replace header |
| Generic opacity | opacity 0 | 1 | .6 s cubic `(0,0,.26,1)` | `.is-inview`; CSS class state |
| Generic left/right/up/down | translate 60 px theo trục + opacity | 0 + opacity 1 | .6 s cubic; default delay .3 | `data-scroll` in-view; repeat phụ thuộc markup |
| Generic zoom | scale .9/1.1/1.2 + opacity 0 | scale 1 + opacity 1 | .6 s cubic; delay classes .3→1.8 | in-view class; no per-frame JS |
| Scroll line | child Y 2em | Y -0.1em | 1.9 s, .1 each, `power4.out` | SplitText lines; wrapper overflow hidden; scroll call bị xoá sau lần đầu |
| Line reset | current | Y 2em | 1.9 s, .1 each, `power4.out` | previous hero slide; có replay ở slide sau |
| Scroll word | opacity 0 | 1 | 1 s, .2 each, `expo.out` | SplitText words; scroll call bị xoá sau lần đầu |
| Word reset | current | opacity 0 | 1 s, .2 each, `expo.out` | previous slide; replay khi active lại |
| Delay classes | — | — | `.delay` .3; double .6; triple .9; quadruple 1.2; quintuple 1.5; sextuple 1.8 | `noDelayMobile` ép 0 trên mobile |
| Hero scroll cue container | opacity current/0 | 1 | .6 s, delay 0 init hoặc 1 s after transition, typo source `expot.Out` | slide lifecycle; previous cue bị set 0 |
| Hero scroll cue chars | top -20, opacity 0 | visible; rồi top 20, opacity 0 | in .4/.1 each `power2.Out`; giữ 3 s; out .4/.1 `power2.In`; initial/repeat delay 3 s | repeat vô hạn; không có reduced-motion trong reference |
| Projects filter group | group opacity current; item Y20/opacity0 | opacity1, Y0 | delay 1.3; 1 s; .15 each; `expo.out` | `initProyectos` trên page enter; không replay khi chỉ đổi filter |
| Full-menu content scale | scale1 | .9 | .7 s `power2.out` | open; close delay .85 rồi .7 s về 1; menu timeline reverse 2.25x |
| Full-menu shutters | height 0 | 100vh | .6 s, .15 each, `power4.inOut` | menu timeline play 1.15x / reverse |
| Full-menu header parts | Y -140 hoặc -20, opacity0; close rotate90 | neutral/opacity1 | .6 s, .1 where applicable, `expo.out` | overlapped offsets trong timeline |
| Full-menu main groups | Y -140/-20, opacity0 | neutral/1 | 1 s .02; subgroup .6 s .03, `expo.out` | play/reverse; nav overlay persistent |
| Related caption | opacity0 desktop | 1 | CSS .3 s ease-out | hover; <=960 forced 1; image scales 1.15 in .6 s |
| Masonry caption/item line | underline scaleX0 | 1 | .3 s cubic `.4,0,0,1` | hover; reference thiếu keyboard equivalent |
| CTA media/arrow | image scale1; arrow neutral | 1.1; arrow X12.5% | image .6 s ease-out; arrow CSS transition | hover; TT phải thêm focus/touch state |

Line/word initializer nằm trong container mới, còn header intro và full-menu
listeners nằm ngoài vòng đời container. Trong soft navigation, Barba leave
0.75 s và enter 1 s `power4.inOut`; container mới được split/init sau swap,
nhưng header node không bị tháo. Direct entry chạy header intro; soft entry
không được chạy lại intro như một header mới.

## 19. Look-and-feel composition survey

Các quy luật dưới đây là **[S]+[I]**: source/DOM structure là bằng chứng, còn
nhận định hierarchy và nhịp thị giác là diễn giải có chủ đích.

### 19.1 Quy luật thị giác reference

- Nền gần như trắng/charcoal; màu đến chủ yếu từ ảnh. Không có gradient trang,
  card bo tròn hoặc shadow “template”.
- Khoảng trắng là cấu trúc: gutter 35/25/15, max content 1500, hero copy 80%
  max 1000. Khoảng trống lớn tách chương, không phải lỗi thiếu nội dung.
- Display type rất lớn nhưng không luôn center: two-line hero dùng trái/phải,
  montage dùng center/start/end, paragraph dồn phải, rail so le dọc.
- Nhãn thao tác nhỏ, semibold, uppercase; underline dày 3 px nằm sát chữ
  (-4 px), nhất quán giữa nav/filter/link.
- Ảnh có crop kiến trúc rõ, viền vuông, ít chrome. Motion ưu tiên transform và
  opacity; không animate layout bằng width/height ngoại trừ menu shutters.
- Nhịp kể chuyện: hero tuyên bố → title/paragraph có khoảng thở → gallery hoặc
  ảnh đơn → facts/process → CTA → related rail. Không dồn mọi thứ thành card
  grid đồng đều.

### 19.2 Điều TT phải học và điều phải giữ khác

TT học hierarchy, asymmetry, whitespace, compact labels, rail so le và motion
mask; không học logo/media/copy/Silka. TT giữ Plus Jakarta Sans, xanh biển/cam
làm accent, CTA Zalo/khảo sát, Vietnamese-first, focus-visible, reduced motion,
native gallery và persistent site-header. Footer không có `footer-brand` theo
yêu cầu đã duyệt; đây là intentional exception, không phải gap parity.

## 20. Mapping 1:1 sang selector Trường Thịnh

Chỉ bốn status được phép trong bảng này. `MATCHED` chỉ dùng sau computed-style,
DOMRect, overlay và motion-frame verification trên runtime hiện tại. Source
inspection đơn thuần không đủ; do đó lượt audit này chưa cấp `MATCHED` cho
component TT nào.

Mapping này là **[S] source inspection của TT + [L] reference baseline**. Riêng
full-menu đã được triển khai và kiểm lại geometry trực tiếp ở desktop/tablet
trong slice 2026-08-01; các component còn lại vẫn theo bằng chứng typography
audit trước đó.

| TT selector / area | Reference role | Status | Bằng chứng và hành động |
| --- | --- | --- | --- |
| `.brand`, `.brand-mark`, `.brand-copy` | `#header-logo` | INTENTIONAL EXCEPTION | TT dùng mark 60×60 + wordmark; reference logo width 170/145, collapsed 125. Giữ brand TT; chỉ match nhịp/tone đồng thời. |
| `.desktop-nav` | `#header-menu-items` | AUDITED NOT IMPLEMENTED | TT 13.6 px và hide <=980; reference 16 px và hide <=750. Đo lại trước khi quyết định breakpoint. |
| `.desktop-nav a[aria-current]` | selected `.coolLink:before` | AUDITED NOT IMPLEMENTED | TT active dùng text-decoration, hover dùng pseudo; reference cả active/hover cùng pseudo 3 px/-4 px. Hợp nhất implementation rồi browser verify. |
| `.menu-button` + SVG lines | `#header-menu-toggle` | AUDITED NOT IMPLEMENTED | Geometry gần 65×60/35×19 nhưng TT stroke 2, reference 3; motion hover .3 giống family, chưa overlay. |
| `.detail-page .detail-hero` | `.layout-hero-banner` | AUDITED NOT IMPLEMENTED | TT min 44rem; reference full viewport/window-sized. Service route cần đo riêng. |
| `.detail-hero .hero-content` | `.layout-hero-banner-wrapper` | AUDITED NOT IMPLEMENTED | TT max 82rem; reference width 80%, max 1000 và line alignment bất đối xứng. |
| `.detail-hero h1` | `.hero-banner-title h1.fillText` | BLOCKED BY FONT METRICS | PJS clamp 4.8rem–9.4rem, line .9; reference adaptive Silka 7em/1.4. Match silhouette bằng rect, không copy px. |
| `.detail-title__quiet`, `.detail-title__strong` | medium title + italic emphasis | INTENTIONAL EXCEPTION | TT dùng 400/600 contrast thay italic proprietary. Giữ nếu content hierarchy được duyệt. |
| `.detail-hero-motto` | reference hero kicker/h3 | AUDITED NOT IMPLEMENTED | TT motto đặt dưới title; reference kicker đặt trên title. Service brief yêu cầu kicker nhỏ trên, slogan lớn dưới; markup/runtime phải kiểm theo brief mới nhất. |
| `.detail-hero-line-mask`, `.motion-line-mask` | `.line-wrapper` / word title | BLOCKED BY FONT METRICS | TT mở overflow + negative clip để bảo vệ dấu; reference wrapper hidden theo Silka. Không thu mask cho tới Canvas proof. |
| `.detail-hero .hero-index` | auxiliary hero index | INTENTIONAL EXCEPTION | Kicker Trường Thịnh đã được user yêu cầu bỏ ở Home; từng route chỉ giữ nếu content contract yêu cầu. |
| `.detail-index-hero` | Projects editorial hero | AUDITED NOT IMPLEMENTED | TT 100svh; reference `calc(100vh - 50px)`. Vertical balance/title/filter chưa có fresh TT overlay. |
| `.detail-index-hero .hero-content` | Projects wrapper | AUDITED NOT IMPLEMENTED | TT width 80% max 62.5rem đúng source intent; padding/margins vẫn cần DOMRect parity. |
| `.detail-index-hero h1` | Projects two-line fillText | BLOCKED BY FONT METRICS | TT PJS clamp/line .92; reference measured table §17.5. So silhouette, không ép 112 px. |
| `.detail-index-hero .project-filters`, `.project-filter` | `#categorias-proyectos`, `.categoria-filter` | AUDITED NOT IMPLEMENTED | Active hiện text-decoration; cần pseudo 3/-4, opacity hierarchy, mobile horizontal behavior và category đầy đủ. |
| `.portal-copy`, `.portal-title__quiet`, `.portal-title__strong` | reference CTA/portal hierarchy | INTENTIONAL EXCEPTION | TT giữ qualifier + service name riêng theo taxonomy đã duyệt, 400/600 và mask-safe. Không ép main title thành một dòng như web tham khảo. |
| `#dich-vu .portal-subtitle` | `.layout-banner-cta-text h3.coolLink` | MATCHED | Fresh desktop source/live baseline: `16px`, line-height `22.4px`, uppercase; opacity `0.3s ease-out` với delay `0.3/0.6/0.9s`; underline hover/focus cao `3px`, bottom `-4px`, `scaleX` `0.3s cubic-bezier(.4,0,0,1)`. TT dùng PJS semibold thay Silka và copy VI/EN riêng. |
| `.heritage-montage`, `.heritage-row*` | `.layout-bloque-compromiso` | OWNER-SPECIFIED METRIC | Cấu trúc 4 row đã map; PJS `100px` tại viewport 1052 tạo cap ink đúng `75px` không tính dấu, tracking `-0.055em`, line-height `1.08`. |
| `.heritage-image` | montage inline image | MATCHED ADAPTATION | Frame 13vw×10vw, cap 200×150 và reveal scale giữ theo family reference; ảnh “cam kết” dùng nút dây chịu lực làm ẩn dụ. Hai hàng giữa lệch ra ngoài 15 px ở desktop để các frame không chạm nhau. |
| `.project-reel`, `.project-track` | `.layout-slider-proyectos` | AUDITED NOT IMPLEMENTED | TT là 5-column grid trong viewport; reference là horizontal flex/overflow + Locomotive speed4. Nhịp nhìn chưa 1:1. |
| `.project-card`, `.project-card__media` | `.layout-slider-proyecto-item` | AUDITED NOT IMPLEMENTED | TT media 420 và offset 180 gần desktop reference; width phụ thuộc grid, breakpoint/caption differ. Cần rect 320–1440. |
| `.project-card figcaption` | `.imagen-caption` | INTENTIONAL EXCEPTION | TT 11.2 semibold + color square; reference 12.8 regular không marker. Giữ marker nếu brand được duyệt, nhưng verify hover/focus. |
| `.editorial-strip`, `.editorial-item`, `.editorial-number` | `.layout-bloque-facts` rhythm | MATCHED ADAPTATION | Home giữ bốn bước nhưng bỏ card đều: cả bốn ảnh được khóa vào đúng chiều cao thẻ 208 px desktop, dùng `object-fit: cover` và bỏ intrinsic minimum của ảnh dọc để frame 1/2 không tràn hơn frame 3/4. Số 1–4 dùng đúng outline OpenType `tnum` của PJS semibold như text cũ, xám 9%; mỗi root SVG nằm ngang cấp ảnh và dùng tight viewBox theo ink bounds nên nét ôm sát, cao đúng bằng ảnh và canh phải-trên. Copy nằm trên số và canh top; mobile xếp dọc, không horizontal scroll. |
| `.detail-process`, `.process-step` | `.layout-bloque-facts` rhythm | INTENTIONAL EXCEPTION | TT quy trình 4 bước có semantic khác facts reference; giữ thứ tự Khảo sát→Tư vấn→Sản xuất→Lắp đặt. Học border/stagger, không đổi copy. |
| `.process-step > span/h3/p` | fact number/title/body | BLOCKED BY FONT METRICS | TT PJS 11.2/variable heading/body; reference facts §17.6. Cần type/rect QA, không blanket size. |
| `.menu-brand`, `.menu-language`, `.menu-appointment`, `.menu-nav`, `.menu-group` | `#full-menu-header`, `#full-menu-wrapper`, `.full-menu-group` | MATCHED ADAPTATION | Fresh Chrome parity tại `1440/1024/768/390/320`: head/nav `137.5/741`, `109.6/741`, `109.6/791`, `227/653`, `227/653`; brand `170×67.5` desktop và `150×59.6` <=1200; mark `60/48`. Calendar dùng đúng viewBox `58.09×57.82`, 35×35 và stroke 4. Bốn group có 15 mục con, type `13.6/19.04` semibold, title→option 30 px, option step 34.04 px và underline 3 px/-4 px; tất cả dùng URL query, không fragment. GSAP đưa cả option vào stagger `.6/.03`; shutters, page scale và reverse giữ đúng nhịp reference. |
| `.floating-cta` | `#pideCitaBubble` | MATCHED ADAPTATION | Fixed `35px` desktop (`25px` <=1200), content-box cao 47 px, padding 9, border 2, grid icon 25 + copy, transition X `1s cubic-bezier(.63,0,.08,1)`. Hover desktop đảo đen→trắng; mobile thành icon lịch 35 px. `.show` chỉ xuất hiện trong viewport đầu hoặc 1.75 viewport cuối như source reference; link Zalo là adaptation chức năng. |
| `.site-footer`, `.footer-intro`, `.footer-contact`, `.footer-bottom` | reference footer grids | INTENTIONAL EXCEPTION | TT conversion-focused contact; không `footer-brand`. Giữ square dividers và compact labels; không clone logo/newsletter. Footer statement dùng `line-height: calc(.98em + 10px)` trên toàn bộ route để hai dòng VI/EN không sít nhau. |
| `.detail-gallery__item figcaption` | `.imagen-caption` | AUDITED NOT IMPLEMENTED | TT 11.52 semibold overlay white/shadow; reference 12.8 regular ngoài media. Đây là functional adaptation, cần readability QA. |
| Future project-detail facts | `.layout-bloque-facts*` | AUDITED NOT IMPLEMENTED | Worker chưa render preset detail thật; typography/facts chỉ được match sau renderer và published record. |

## 21. Vietnamese typography và mask safety

Plus Jakarta Sans có glyph Vietnamese nhưng dấu trên/dưới làm ink box vượt xa
cap-height Latin. Các quy tắc sau ưu tiên hơn parity Silka:

1. Chờ `document.fonts.ready` trước split/measure; chạy lại sau VI↔EN, font
   load, breakpoint đổi, resize kết thúc và BFCache `pageshow`.
2. Canvas probe phải dùng đúng computed family, size, weight, style và text
   thật. Đọc `actualBoundingBoxAscent/Descent`; fallback
   `fontBoundingBoxAscent/Descent`, rồi mới dùng safety em.
3. Tính riêng overflow top/bottom và đưa vào
   `--mask-ink-overflow-top/bottom`. Không dùng một số Silka cố định cho mọi
   weight hoặc mọi locale.
4. Display line-height có thể thấp tới .9 để tạo silhouette, nhưng wrapper
   phải `overflow:visible` + negative clip inset đủ ink và cả endpoint reveal
   `y:-.1em`. Label/kicker/filter nên giữ line-height tối thiểu 1.3; body tối
   thiểu 1.35.
5. Sau locale switch, phục hồi source text trước khi split lại; không split
   trên các span của lần trước. So số node/word và accessible text.
6. Đo các chuỗi stress: `KHÔNG GIAN NHÀ Ở`, `CÔNG TRÌNH & SẢN PHẨM`,
   `KINH NGHIỆM VÀ SÁNG TẠO`, `TỪNG SẢN PHẨM`, chữ có `Ắ/Ằ/Ễ/Ộ/Ự`.
7. Không dùng `overflow:hidden` trực tiếp trên text PJS chỉ để giống
   `.line-wrapper` Silka. Mask phải cắt motion transform nhưng không cắt ink.
8. Google Fonts source hiện thiếu PJS 400 italic. Nếu body italic cần đúng
   vai trò, tải face 400 italic hoặc ghi explicit 500 italic exception.

Acceptance: không mất dấu tại 320/390/768/1024/1440, cả trước/sau font load,
VI↔EN, resize và reduced motion; `getBoundingClientRect()` của glyph probe phải
nằm trong visible clip region với safety tối thiểu 2 CSS px.

### Owner readability override — 2026-08-02

Parity về mật độ chữ không được làm word gap của Plus Jakarta Sans gần bằng
letter gap hoặc làm dấu Việt chạm mask. Shared public tokens hiện là:

- body: `word-spacing: .10em`;
- display: effectively zero tracking (`.001px` for numeric CSSOM),
  `word-spacing: .10em`;
- heritage montage: effectively zero tracking, `word-spacing: .10em`; giữ
  geometry `line-height: 1.08` đã duyệt;
- prose không dùng negative tracking; body giữ `line-height >= 1.35`;
- Canvas đo riêng overflow trên/dưới và clip-path mở cả hai cạnh.

Live reference tại 1161×912: Silka 108 px và 64 px dùng tracking/word-spacing
CSS bằng 0 nhưng space glyph thực đều khoảng `.272em`; label 16 px khoảng
`.264em`. PJS tracking 0 có space glyph khoảng `.17em`, nên `.10em` bổ sung đưa
occupied word gap về cùng tỷ lệ. Chrome 2026-08-02: 50 tổ hợp 10 locale route ×
5 viewport không overflow, không console/network error và không thiếu biên ink;
heritage 100 px đo `.27297em`, cap-height vẫn 75 px. Hero Projects VI/EN pass
10/10 geometry case ở cùng năm viewport.

## 22. Recipe kiểm 1:1 ngay sau mỗi visual edit

1. Chọn cùng **content role** (hero line 1 với hero line 1, filter active với
   filter active), không chọn chỉ vì literal text dài bằng nhau.
2. Mở reference và TT cùng viewport, cold load, chờ font; ghi URL, locale,
   timestamp, DPR, viewport và reduced-motion.
3. Export computed style: family, size, line-height, weight, style, tracking,
   transform, opacity, text-transform, decoration/pseudo và max-width.
4. Export DOMRect cho wrapper, từng line, text ink probe, ảnh và control.
5. Chụp hai ảnh cùng crop; tạo overlay 50% và pixel diff. Font khác thì so
   silhouette, baseline, alignment và occupied area; không đòi glyph pixel
   identity.
6. Motion capture tối thiểu ở t=0, .15, .3, .6, .9, 1.3, 1.9 s; route veil
   thêm .75 và 1.75 s; hero TT thêm cross-fade 1.6 s và zoom tới 5 s.
7. Kiểm direct entry, soft navigation, Back/Forward, locale switch, resize,
   hover, focus, touch và reduced motion. Header DOM identity phải giữ qua soft
   navigation.
8. Chạy console/network/overflow/a11y; kiểm `document.activeElement` sau menu,
   dialog và BFCache.
9. Chỉ ghi `MATCHED` khi computed style/rect/overlay/motion frames đều có bằng
   chứng hiện tại. Nếu font làm silhouette khác, dùng `BLOCKED BY FONT METRICS`.
10. Ghi kết quả ngay sau component edit; không chờ cuối sprint.

## 23. Gap backlog theo route/component

### Header

- **P0:** thống nhất active nav với hover bằng pseudo underline 3 px/-4 px;
  loại text-decoration trùng.
- **P0:** Chrome frame-test persistent node/tone/brand resize qua soft route và
  VI↔EN; không hide/show/recreate site-header.
- **P1:** quyết định có giữ TT nav 13.6/hide 980 hay tiến gần reference
  16/hide 750; đây là UX breakpoint decision, không blind parity.
- **P1:** đo SVG mark 60×60, hamburger 35×19 và stroke sau DPR rasterization.

### Residential

- **P0:** đo hero kicker/slogan, two-line asymmetry, mask dấu và image parallax
  với Interior table §17.3 ở cả năm viewport.
- **P1:** so first h2/paragraph 64→40 và max 600/indent; chỉnh theo PJS rect.
- **P1:** related rail/card/caption runtime; gallery keyboard/touch.

### Commercial

- **P0:** đo hero theo Kitchens §17.4; không tái dùng center geometry của
  Residential nếu copy length khác.
- **P1:** kiểm CTA title/label, material paragraph, gallery crop và process.
- **P1:** giữ service balance với Residential; không biến route thành landing
  page kiosk-only.

### Projects / Products

- **P0:** so full viewport title/filter bằng §17.5; bỏ active text-decoration
  trùng, giữ 3 px/-4 px pseudo.
- **P0:** hoàn thiện category/data contract và đưa product records vào grid;
  project nhà ở/kinh doanh phải xuất hiện trước nhóm product theo brief mới.
- **P1:** quyết định CSS grid TT hay Masonry dựa trên content height; không thêm
  library nếu grid đạt composition.
- **P1:** đo card caption/hover/focus, mobile filter overflow và scroll target.

### Project detail

- **P0:** renderer thật cho `compact-gallery`, `editorial-case`,
  `process-film`; index source không được giả làm detail.
- **P0:** canonical/hreflang/published-only và project facts/gallery caption.
- **P1:** so title/editorial/facts/related rail với Can Molteni §17.6 bằng nội
  dung TT, không copy copy/media reference.

### About

- **P1:** audit route About với reference About riêng trước mọi edit; không
  mặc định Home montage là About layout.
- **P1:** nếu tái dùng heritage composition, giữ câu chuyện kinh nghiệm/sáng
  tạo/cam kết TT, PJS mask-safe và ảnh không khuôn mặt nhận diện.
- **P2:** facts/team/history chỉ xuất khi owner cung cấp dữ liệu; không tự điền
  năm thành lập, địa chỉ hoặc bảo hành.

## 24. Typography/motion provenance addendum

| Bằng chứng | Line/source |
| --- | --- |
| Font faces + smoothing | `main.pretty.css:609–657` |
| Body, semantic family, italic, underline | `main.pretty.css:1661–1781` |
| h1/h2/h3 scale | `main.pretty.css:1816–1852` |
| Header geometry/nav/toggle/facts | `main.pretty.css:2437–2605` |
| Hero wrapper/type alignment | `main.pretty.css:2637–2853` |
| CTA/rail/editorial/caption | `main.pretty.css:3034–3330` |
| Facts/gallery/Masonry | `main.pretty.css:3554–3849` |
| Footer | `main.pretty.css:3933–4054` |
| fillText visibility/noWrap | `main.pretty.css:4263–4270` |
| Header intro | `main.pretty.js:17434–17449` |
| SplitText setup | `main.pretty.js:17609–17643` |
| Hero/scroll cue lifecycle | `main.pretty.js:17695–17819` |
| Projects filter intro | `main.pretty.js:18118–18132` |
| Header tone/menu/fillText | `main.pretty.js:18348–18529` |
| Delay + line/word play/reset | `main.pretty.js:18552–18629` |
| Home montage markup/style | `archive/site/en/index.html:540–625` |
| Interior hero/editorial | `archive/site/en/interior-design/index.html:378–465` |
| Kitchens hero/editorial | `archive/site/en/kitchens/index.html:378–465` |
| Projects hero/filter | `archive/site/en/projects/index.html:370–457` |
| Can Molteni detail/facts/rail | `archive/site/en/projects/can-molteni/index.html:373–825` |
| TT global/header/montage/rail/footer | `style.css:27–37`, `161–392`, `1025–1366`, `1484–1571` |
| TT detail hero/type/gallery/process/projects | `detail.css:5–120`, `205–407`, `505–659` |

## Changelog audit

- **2026-08-01:** Tạo SSOT từ crawl 254 page, source bundle, live checks,
  dependency/security audit, header/menu/motion measurements và mapping TT.
- **2026-08-01:** Bổ sung hệ font/typography, cold-load Chrome measurements ở
  năm viewport cho năm page family, exact text-motion map, look-and-feel survey,
  selector mapping bốn trạng thái, Vietnamese mask contract và route backlog.
- **2026-08-02:** Owner yêu cầu public navigation không dùng fragment. Trường
  Thịnh đã loại skip links, scroll cues, section/footer hash links và runtime
  scroll/focus-by-hash. Đây là sai khác nội dung có chủ đích với reference; SVG
  `url(#...)` clip paths không thuộc navigation và vẫn được giữ.
- **2026-08-02:** Home process strip đổi sang composition số lớn nằm sau ảnh;
  copy VI/EN được viết lại theo giọng người làm nghề. Đã đo overlap, copy gap,
  fit và overflow tại 320/390/768/1024/1440.
- **2026-08-02:** Bốn số process chuyển từ glyph text sang một SVG sprite nội
  tuyến. Path giữ đúng PJS semibold, dùng chung baseline/descender và một hệ số
  scale; SVG viewport cao bằng ảnh, canh góc phải-trên.
