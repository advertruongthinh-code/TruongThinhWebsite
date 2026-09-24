# Bản đồ motion

> Snapshot đo ngày 2026-07-30 từ bản public
> web tham khảo trong archive local. Đây là đặc tả hành vi và thông số đã đo,
> không phải bản sao bundle của website tham khảo.

## Nguồn nghiên cứu

- HTML và bundle đã lưu:
  `research/reference-site/source/`.
- Bản JS/CSS đã format chỉ để đọc:
  `main.pretty.js`, `main.pretty.css`.
- Bản crawl sitemap phục vụ nghiên cứu:
  `research/reference-site/archive/`.

## Ánh xạ shell

| Web tham khảo | Trường Thịnh | Vai trò |
| --- | --- | --- |
| `#transitionDiv` | `.route-veil` | White route fade |
| `#content-wrapper` | Các con trực tiếp của `[data-scroll-container]` | Scale khi mở menu |
| `#header-logo` | `.brand` | Intro logo/brand |
| `#header-menu-items a` | `.desktop-nav a` | Intro và đổi tone |
| `#header-toggle-svg` | `.menu-button svg` | Intro hamburger |
| `#full-menu-nav` | `#site-menu` | Full-screen menu |
| `#full-menu-bg > div` | `.menu-shutters i` | Bốn cột nền menu |
| `#full-menu-header-logo` | `.menu-brand` | TT mark + wordmark trong menu |
| `#full-menu-idiomas div` | `.menu-language [data-language-option]` | Hai locale control thuộc menu |
| `#full-menu-cita div` | `.menu-appointment` | CTA đặt lịch/Zalo trong menu head |
| `#full-menu-close-svg` | `[data-menu-close]` | Close control |
| `#full-menu-wrapper` | `.menu-nav` | Wrapper nội dung menu |
| `#full-menu-wrapper > div` | `.menu-group` | Nhóm điều hướng cấp một |
| `.full-menu-group div` | `.menu-group__number`, `.menu-group__title` | Số và route cấp cao trong nhóm |

## Chuyển route

### Rời trang

1. Khoá route lặp bằng `routeInFlight`.
2. Dừng smooth scroll, pin persistent header và giữ màu mực trong lúc chờ HTML
   của route kế tiếp.
3. `.route-veil`: `opacity 0 → 1`.
4. `duration: 0.75`, `ease: power4.inOut`.
5. Chờ menu đóng nếu navigation bắt đầu trong full-menu.
6. Đặt `sessionStorage["tt-route"] = "1"` rồi mới đổi URL.

### Vào trang

1. Inline head script phát hiện route nội bộ hoặc history navigation và thêm
   `html.route-enter` trước first paint.
2. Khi Barba có HTML/container kế tiếp, header bắt đầu tween sang tone của hero
   đích trong lúc veil vẫn còn opacity `1`; không chờ ảnh hoặc video hero load.
3. Mỗi lần mark đi vào surface trắng, route veil hoặc destination nền trắng,
   reset bốn path về đen rồi chạy đen → CMYK trong `1s`. Rời surface trắng
   chạy CMYK → trắng cùng contract `1s`; wordmark chỉ đổi tone, không đổi màu.
4. `.route-veil`: `opacity 1 → 0`, `duration: 1`, `ease: power4.inOut`.
5. Xoá `route-enter`, `is-transitioning` và trả header về state scroll thực.

Route nội bộ dùng Barba và route veil. Header vẫn được mount, bỏ trạng thái
`is-hidden` và nằm trên veil trong suốt đoạn chuyển. Mốc đổi tone phụ thuộc lúc
HTML kế tiếp sẵn sàng, còn reveal veil giữ timing cố định; media không kéo dài
thời gian lockup bị đen. Locale switch dùng contract tại chỗ bên dưới, không đi
qua route veil.

Web tham khảo giữ overlay trắng ở opacity `1` nếu fetch chậm. Website Trường Thịnh
cũng giữ nguyên lớp trắng trong khoảng tải document mới.

### Back, Forward và BFCache

- Header, full-menu và CTA chỉ đi tới canonical route; public navigation không
  dùng fragment/hash.
- Direct load và locale switch loại fragment, giữ query và vị trí đọc.
- `history.scrollRestoration = "manual"` chỉ dùng khi desktop smooth scroll.
- `pageshow.persisted` dọn dialog, body state, page scale và veil bị đóng băng
  trong BFCache; nếu trang cũ đang bị veil phủ thì chạy lại enter fade `1s`.
- Network Back/Forward được nhận diện sớm trong `<head>` để không lộ content
  trước enter fade.

### Chuyển locale tại chỗ

1. Ghi nhận vị trí scroll và section có diện tích hiển thị lớn nhất trước khi
   page bị scale bởi menu.
2. Chạy hết close motion của full-menu; locale chưa đổi khi dialog còn mở.
3. Đồng bộ current state của Barba rồi dùng `history.replaceState()` để đổi
   `/vi/` và `/en/`, giữ query, bỏ fragment; không fetch, không thay Barba
   container và không thêm history entry.
4. Dịch text, accessible attribute và internal link từ dữ liệu VI/EN đã có trong
   DOM; giữ nguyên font, word spacing và line-height.
5. Khôi phục chính xác scroll rồi chỉ reset/replay motion của section đã ghi.
   Section không có motion target là no-op. Reduced motion giữ final state và
   không tạo entrance motion.

## Header

### Intro

| Target | From | Duration | Start | Ease |
| --- | --- | ---: | ---: | --- |
| `.brand` | `scale: 0` | `1.5s` | `0` | `power4.out` |
| `.desktop-nav a` | `y: -150` | `1.5s` | `.3s` | `power4.out`, stagger `.1` |
| `.menu-button svg` | `scaleX: 0` | `1s` | `1.5s` | `power4.out` |

Header intro chỉ chạy ở document entry ban đầu. Route entry không replay header,
để tạo cảm giác shell được giữ nguyên như Barba trên reference. Route veil ở
dưới header (`999 < 1000`); header được pin và giữ nhìn thấy trong lúc veil che
content đổi route.

### Scroll state

- Collapse sau `100px`.
- Down: ẩn sau khi đi hơn `150px` kể từ điểm đổi hướng.
- Up: hiện sau khi đi ngược hơn `150px`.
- Transition header: `1s cubic-bezier(0,0,.1,.99)`.
- Chuột có `screenY <= 350` ép header hiện.
- Tone wordmark, nav và hamburger đổi đồng bộ trong `.3s expo.out`. Mỗi lần bốn
  path mark đi vào nền trắng, chúng giữ một painted state đen rồi dùng
  `sequence` đen → CMYK với `duration + delay = 1s`; chiều rời nền trắng dùng
  CMYK → trắng cùng tổng `1s`. Contract áp dụng cho direct/F5, route veil,
  sticky và Advertising Products. Whole-lockup scale dùng `.3s expo.out` và
  không được huỷ color tween của cùng element.
- Scroll cue mờ đi sau `200px` trong `1s expo.out`.
- Zalo CTA nằm ngoài màn hình ở phần giữa trang và trở lại ở đầu/cuối trang.

## Full-menu

### Mở

- Scale page: `1 → .9`, `.7s`, `power2.out`, origin `50vw 50vh`.
- Bốn cột nền: `height 0 → 100vh`, `.6s`, `power4.inOut`, stagger `.15`.
- Toàn timeline chạy `timeScale(1.15)`.

| Raw time | Motion |
| ---: | --- |
| `0–1.05` | Bốn cột nền hoàn tất coverage trước khi copy được phép lộ |
| `1.05–1.65` | `.menu-nav`: opacity `0 → 1` |
| `1.10–2.14` | `.menu-group`: `y -140/opacity 0 → 0/1`, `1s`, stagger `.02`, `expo.out` |
| `1.15–1.75` | `.menu-brand`: `y -140`; `.menu-language` và `.menu-appointment`: `y -20`; tất cả opacity `0 → 1`, `.6s`, `expo.out` |
| Từ `1.75` | `.menu-brand` đã hoàn tất entrance; mark bắt đầu từ đen, rồi ba path có đổi màu kết thúc CMYK sau đúng `1s`; path đen giữ nguyên |
| `1.35–2.04` | `.menu-group__number`, `.menu-group__title`: `y -20/opacity 0 → 0/1`, `.6s`, stagger `.03` |
| `1.40–2.00` | Close control: `rotate 90°/opacity 0 → 0°/1`, `.6s` |
| Sau `2.00` | Timeline kết thúc theo item stagger cuối; không giữ artificial tail |

Divider `.menu-head` mở ở delay `.7s`; bốn divider `.menu-group` theo `.9`,
`1.1`, `1.3`, `1.5s`. Backdrop đi tới opacity `.4` trong `.6s`.

`.menu-nav` dùng các track `minmax(min-content, 1fr)` và group stretch để
`::after` của mỗi ô có height bằng grid row và reveal bằng compositor
`scaleY(0 → 1)`, không animate layout height. Pseudo divider ẩn theo cột cuối ở
các breakpoint 4/3/2; toàn bộ divider ẩn ở mobile một cột. Group title dùng Plus
Jakarta Sans medium (500), số dùng `0.8rem`
(12.8/17.92). Locale active dùng underline pseudo 3px offset 4px như reference.
Theo quyết định nội dung 2026-08-02, menu chỉ giữ bốn route cấp cao; nhịp shutter,
group, head và close vẫn giữ contract đã đo.

### Đóng

- Bỏ `menu-open` ngay khi bắt đầu close.
- Reverse timeline ở `timeScale(2.25)`.
- Page scale trở lại `1` sau delay `.85s`, duration `.7s`.
- Backdrop đợi `.85s`, sau đó fade `.6s`.
- Dialog đóng và focus trở về hamburger khi page scale hoàn tất.
- Nếu click route trong menu, route fade và menu reverse chạy đồng thời; chỉ
  commit URL khi cả veil và menu close đã xong.
- Nếu click locale, menu reverse hoàn tất trước; sau đó locale đổi tại chỗ và
  focus không nhảy về đầu document.

Breakpoints của shutters và `.menu-nav` cùng đổi theo reference:

- 4 cột mặc định.
- 3 cột ở `≤1200px`.
- 2 cột ở `≤960px`.
- 1 cột ở `≤578px`.

`.menu-head` đo `137.516px` ở desktop với brand `170×67.516`; từ `≤1200px`
dùng padding `25px`, first track `170px` và brand `150×59.578`, cho head
`109.578px`. CTA `.menu-appointment` ẩn ở `≤960px`; `.menu-nav` khi đó cao
`calc(100vh - 109px)`. Ở `≤578px`, head dùng hai cột đều, ba hàng với language
`37.391px` và appointment `50px`, tổng `226.969px`; appointment hiện lại dạng
full-span và nav cao `calc(100vh - 247px)`. Locale chỉ tồn tại trong
`.menu-language`; header không render control trùng.

## Motion của content

### Hero

- Direct load Home giữ slide và shade ẩn trên nền `#2b2c2b` trong `2.6s` để
  bốn từ của title hoàn tất reveal trước media. Ảnh đầu và shade sau đó fade vào
  trong `1.6s`; intro nằm trong hero timeline nên pause, tab hidden và out-of-view
  cùng dừng nhịp. Route entry, startup đã settled, reduced motion, no-JS và
  fail-open hiện ảnh đầu ngay.
- Media parallax: `data-scroll-speed="-2"` trên desktop.
- Media drift: `scale 1.06 → 1`, `5s`, `sine.inOut`. Ảnh kế tiếp bắt đầu drift
  tại trung điểm của cross-fade; easing vào/ra êm để không tạo bước vận tốc ở
  frame bàn giao.
- Hero title map từ word reveal của reference:
  opacity `0 → 1`, `1s`, stagger `.2`, delay `.9s`, `expo.out`; chạy ở mọi
  breakpoint.
- Hero Residential, Commercial và About dùng đúng một media. Direct/F5 và soft
  route entry đều chạy một lần `scale 1.2 → 1.005`, `2.5s`, `ease`, rồi dừng;
  không slideshow, reverse hoặc continuous zoom. Motion này khớp computed live
  của Kitchens, Interior Design và About Us; duration cố định, không chờ media.
- Hero route con dùng profile text theo reference:
  `words-.9` cho Nhà ở/Giới thiệu, `words-.6` cho Quảng cáo và
  `zoom-.9` cho Kinh doanh.
- Advertising direct/F5 tạo initial state trước first paint: kicker
  `opacity 0`, `x -60px`, delay `.9s`, vào trong `.6s`; filter `opacity 0`,
  `y 20px`, delay `1.3s`, duration `1s`, stagger `.15s`, `expo.out`. Catalog
  localization giữ nguyên filter node đã được tween, chỉ cập nhật text, URL và
  ARIA. Không được thay node giữa entrance; reduced motion hiện final state ngay.
- Motto route con nằm ngay trong hero, dùng line splitter theo kích thước render
  nên có thể đổi copy hoặc ngôn ngữ mà không hard-code số dòng.
- Home hero cross-fade `1.6s`; fade bắt đầu ở giây `4.2`, ảnh kế tiếp bắt đầu
  drift ở trung điểm giây `5.0`.
- Pause control chỉ dừng carousel Home; ba hero single-media không render
  slideshow control.

### Scroll cue

- Năm template đều render đúng một button localized: `CUỘN XUỐNG` hoặc
  `SCROLL DOWN`; click/tap cuộn tới section kế tiếp và không đổi route.
- Mỗi ký tự chạy timeline Espacio: delay đầu `3s`, vào từ `top:-20`, opacity
  `0`, duration `.4s`, stagger `.1`; giữ `3s`; ra tới `top:20`, opacity `0`,
  duration `.4s`; lặp lại sau `3s`.
- Cue fullscreen cách đáy viewport `45px` desktop, `30px` tablet và `60px`
  mobile. Advertising hero cao `100svh - 50px`, nên khoảng cách tới đáy
  viewport tương ứng là `95px` desktop và `110px` mobile.
- Cue dừng khi document hidden, hero out-of-view, motion toggle pause hoặc
  `prefers-reduced-motion: reduce`; đổi locale sẽ split lại ký tự.

### Line và reveal

- Masked line: `y 2em → -.1em`, `1.9s`, `power4.out`, stagger `.1`.
- Delay tiers: `.3s` mỗi cấp.
- Wrapper line giữ cạnh reveal phía dưới kín như reference. Phía trên được mở
  theo `Canvas TextMetrics` của font đang render để không cắt dấu tiếng Việt;
  phép đo chạy lại sau font load và đổi VI/EN.
- Generic up reveal: `y 60 → 0`, opacity `0 → 1`, `.6s`,
  `cubic-bezier(0,0,.26,1)`.
- Generic media: chỉ opacity `0 → 1`, `.6s ease-out`.
- Montage image: scale `.9 → 1`, opacity `0 → 1`, `.6s`, delay `.6s`.
- Portal title quan sát chính bounding box của title, không quan sát cả card.
  Toàn bộ block title đi cùng lúc trong `1.9s`; ba cột delay `0/.3/.6s`.
- Portal subtitle có observer riêng trên chính subtitle; opacity `.3s
  ease-out`, delay `0.3/.6/.9s`.
- Editorial/process strip trên Home là nội dung tĩnh, không có entrance motion.
- Wide closer: hai dòng title đi cùng lúc; CTA có trigger riêng và fade `.3s
  ease-out`, delay `.3s`.
- Hover image portal: scale `1 → 1.1`, `.6s`.
- Hover project image: scale `1 → 1.15`, `.6s`; media wrapper `overflow:hidden`
  giữ ảnh không phủ caption.
- Project rail vào từ `x 60 → 0` trong `.6s` ở desktop và mobile. Desktop thêm
  `data-scroll-speed="4"` theo horizontal direction; mobile không parallax.
- Detail pages dùng các contract tách biệt:
  `data-motion-lines`, `data-motion-words`, `data-motion-fade`,
  `data-motion-up`, `data-motion-media`; plain copy không gắn entrance motion.
- Fact/process card dùng delay `0/.15/.30/.45s`; shell và caption của project
  tile Quảng cáo đứng tĩnh. Chỉ media chạy one-shot opacity `0 → 1` trong
  `.6s ease-out` sau LazySizes unveil/load; virtual remount không replay.

### Filter quảng cáo

- Filter controls vào từ `y 20`, opacity `0`, delay `1.3s`, duration `1s`,
  stagger `.15`, `expo.out`.
- Filtering đổi `display/hidden` ngay rồi reflow; không thêm tile fade không có
  trong reference.
- Lưới catalog dùng opacity media một lần `0 → 1` trong `.6s ease-out` khi ảnh
  sẵn sàng; filter chỉ morph vị trí `.4s ease`, không stagger và không chạy
  motion khi card rời viewport. Reduced motion đổi state ngay.

## Reduced motion

`prefers-reduced-motion: reduce`:

- Không khởi tạo Locomotive Scroll hoặc GSAP presentation timelines.
- Route/menu state đổi ngay, không để overlay giữ content.
- Chỉ hero đầu hiển thị.
- Mọi content/reveal vẫn nhìn thấy và dùng native scroll.

## Chú thích thuật ngữ

- **Motion map**: bảng ghi behavior, timing và mapping của chuyển động giao diện.
- **Route transition**: hiệu ứng chuyển giữa hai URL/route.
- **Reveal**: hiệu ứng làm nội dung xuất hiện.
- **Overlay/veil**: lớp phủ dùng để che hoặc chuyển trạng thái route/menu.
- **Stagger**: độ trễ tuần tự giữa các phần tử cùng nhóm.
- **Reduced motion**: chế độ giảm chuyển động theo preference của người dùng.
