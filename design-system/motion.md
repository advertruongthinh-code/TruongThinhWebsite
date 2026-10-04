# Motion

Chuyển động của website Trường Thịnh, viết theo runtime đang chạy:
`src/site/motion.js` (shell, route, menu, hero), `src/site/detail.js` và
`detail.css` (trang detail), `src/site/advertising-products/` (catalog,
skeleton, viewer). Định dạng token không có family motion, nên mọi timing nằm ở
đây.

Nguồn tham khảo của nhịp motion ghi ở [README](README.md#nguồn-tham-khảo).
Motion owner đã duyệt nhưng chưa có code nằm ở
[Đã duyệt, chờ code](approved-designs.md).

## Nguyên tắc

- Motion phục vụ nội dung, không giữ nội dung ở trạng thái ẩn.
- `prefers-reduced-motion: reduce` đi thẳng trạng thái cuối: bỏ transform,
  autoplay, entrance; scroll native; zoom/pan người xem chủ động vẫn đổi tức
  thì. Đổi preference khi đang mở trang có hiệu lực ngay.
- Chỉ animate `transform` và `opacity`; không animate width, height hay CSS
  blur mỗi frame.
- Observer, listener, timeline thuộc lần mount và được dọn khi rời route.
  `pageshow.persisted` (Back/Forward từ BFCache) dọn dialog, page scale và
  route veil.
- Không thêm thư viện animation. Đang dùng: GSAP và SplitText (shell, text),
  Barba (chuyển route mềm),
  `masonry-layout` (vị trí card Advertising), Swiper (carousel detail),
  Locomotive Scroll (smooth scroll desktop), LazySizes (ảnh).

## Shell

| Chuyển động | Thông số |
| --- | --- |
| Header intro | Chỉ khi tải trực tiếp: lockup `scale 0 → 1` `1.5s power4.out`; mục nav `y -150 → 0` `1.5s power4.out`, stagger 0.1, tại 0.3s; hamburger `scaleX 0 → 1` `1s power4.out` tại 1.5s. Vào bằng route mềm thì không chạy lại |
| Header collapse | Khi `scrollY > 100`. Transform `1s cubic-bezier(0, 0, .1, .99)`; padding, nền, viền, màu `0.3s ease-out` |
| Đổi tone header | Chữ nav và nét hamburger đổi màu cùng lúc `0.3s expo.out` theo `data-header-tone` của section dưới header |
| Header ẩn/hiện | Chỉ trong vùng giữa `0.5 × viewportHeight < scrollY < pageHeight - 1.25 × viewportHeight`: đi xuống quá 150px thì ẩn, đi lên quá 150px thì hiện. Ngoài vùng hiện ngay |
| Pointer reveal | Chuột (hover thật) có `mousemove.screenY <= 350` thì hiện header đang ẩn; touch và pen không giả hover |
| Route veil | Lớp trắng toàn màn hình `z-index 999` (header 1000). Cover `0.75s power4.inOut`, uncover `1s power4.inOut`; header bỏ `is-hidden` khi bắt đầu chuyển route; body có `is-transitioning` trong lúc chuyển |
| Route từ full menu | Menu reverse và route cover chạy đồng thời; URL chỉ commit khi cả hai xong |
| Underline nav, footer, menu | Cao 3px, cách chữ 4px; `scaleX(0 → 1)` `0.3s cubic-bezier(.4, 0, 0, 1)`, nghỉ neo phải, hover hoặc đang chọn neo trái; mục Advertising ở trang detail không gạch chân khi nghỉ |
| Hamburger, nút đóng menu | Hover `0.3s ease-out`: hamburger dòng trên, dưới `scaleX(.5)`, dòng giữa `scaleX(2)`; nút đóng xoay hai nét 90°; nhấn `scale(.8)` |
| Floating CTA | Hiện trong viewport đầu và 1.75 viewport cuối trang; trượt `translateX(130%) → 0` trong `1s cubic-bezier(.63, 0, .08, 1)` |
| Smooth scroll | Locomotive trên desktop; mobile dùng scroll native |

### Smooth scroll và parallax

Locomotive Scroll 4.1.4 chỉ bật khi cửa sổ rộng từ 981px và không giảm chuyển
động (`lerp 0.085`, `multiplier 0.9`, `motion.js`). Dưới 981px, khi giảm chuyển
động hoặc khi menu mở, trang dùng scroll native và không có parallax Locomotive.

Phần tử có `data-scroll` và `data-scroll-speed` lệch theo công thức của
Locomotive: độ lệch bằng (tâm viewport trừ tâm phần tử) nhân `-speed / 10`, nên
bằng 0 khi phần tử nằm giữa viewport. Speed âm làm phần tử trôi chậm hơn nội
dung, speed dương làm nó chạy nhanh hơn.

| Phần tử | Trang | Speed | Cảm nhận |
| --- | --- | --- | --- |
| Ảnh hero `.hero-slides` | Trang chủ | `-2` | Trôi chậm hơn cuộn 20% |
| Rail dự án `.project-track` | Trang chủ | `4`, chiều ngang | Trượt ngang 0.4px mỗi px cuộn |
| Ảnh `legacy-hands`, `design-sketch`, `workshop-wide` | About | `-0.12`, `-0.1`, `-0.12` | Trôi chậm hơn 1.2%, 1%, 1.2% |

Hero và rail nhận thuộc tính lúc mount trong `motion.js`; ảnh About khai báo
trong HTML.

CTA cuối trang Advertising (`.detail-cta__copy`) có parallax riêng ở mọi chiều
rộng, cả scroll native: độ lệch bằng (giới hạn cuộn trừ `scrollY`) nhân `-0.1`,
tức trôi chậm hơn cuộn 10% và bằng 0 đúng tại cuối trang. Giảm chuyển động hoặc
đang xem ảnh thì không lệch. Vị trí cuối của cụm CTA đổi theo thanh địa chỉ thì
trượt `margin-bottom 0.4s ease-out`
([CTA giữa viewport](../docs/specs/advertising-cta-center-parallax.md)).

### Lockup header

Intro, FLIP scale `300ms expo.out`, tone cụm chữ và chuỗi màu bốn path của
mark ở [Brand guideline](brand.md#motion).

### Full menu

Timeline GSAP mở trong `motion.js`. Cột thời điểm là vị trí trong timeline;
timeline chạy `timeScale 1.15` nên giây thật bằng vị trí chia 1.15 (shutter
phủ xong khoảng 0.91s). Chữ chỉ hiện sau khi shutter phủ xong.

| Phần | Thông số |
| --- | --- |
| Shutter | `height 0 → 100vh`, `0.6s power4.inOut`, stagger `0.15`; 4/3/2/1 cột ở mặc định, 1200, 960, 578px |
| Nav menu | opacity `0 → 1`, `0.6s`, tại `1.05s` |
| Nhóm link | `y -140 → 0`, opacity `0 → 1`, `1s expo.out`, stagger `0.02`, tại `1.1s` |
| Brand, locale, CTA hẹn | `y -140` (brand) hoặc `-20`, `0.6s expo.out`, tại `1.15s`; mark có màu CMYK ngay từ frame đầu |
| Mục con | `y -20 → 0`, `0.6s expo.out`, stagger `0.03`, tại `1.35s` |
| Nút đóng | opacity `0 → 1`, rotate `90° → 0`, `0.6s expo.out`, tại `1.4s` |
| Page scale | trang phía sau `scale 1 → 0.9`, `0.7s power2.out`, origin `50vw 50vh`, ngoài timeline; khi đóng, timeline reverse `timeScale 2.25`, scale về 1 sau delay `0.85s` |
| Đường kẻ | CSS, ngoài timeline: dưới hàng đầu `scaleX 0 → 1` `0.7s cubic-bezier(.56, 0, .38, 1)` sau 0.7s; giữa các cột `scaleY 0 → 1` `0.3s linear`, delay 0.9, 1.1, 1.3, 1.5s |

## Text

Chỉ target khai báo bằng data attribute mới được split; không split body,
navigation, filter, card title, portal title hoặc `.sr-only`.

| Kiểu | Hook | Timing |
| --- | --- | --- |
| Line reveal | `data-motion-lines` | `1.9s power4.out`, stagger `0.1s`, khi vào viewport |
| Word fade | `data-motion-words` | `1s expo.out`, stagger `0.2s` |
| Scroll cue | `[data-scroll-cue-label]` | Character split; sau 3s từng ký tự vào từ `top -20px` (0.4s, stagger 0.1s), giữ 3s, ra tới `top 20px` cùng nhịp, lặp sau 3s. Cuộn quá 200px thì mờ đi `1s` và rời thứ tự Tab |
| Media reveal | `data-motion-media` | `0.6s cubic-bezier(0, 0, .26, 1)` (`--ease`) |

Route và target:

| Route | Word | Line | Character |
| --- | --- | --- | --- |
| Advertising | `#page-title` | `#cta-title` | `[data-scroll-cue-label]` |
| Residential | `#page-title` | `#intro-title`, `#gallery-title`, `#process-title`, `#cta-title` | `[data-scroll-cue-label]` |
| Commercial | `#page-title`, `#process-title` | `#intro-title`, `#gallery-title`, `#cta-title` | `[data-scroll-cue-label]` |

Entrance Advertising khi tải trực tiếp: kicker `opacity 0, x -60px`, delay
`0.9s`, vào `0.6s` (trạng thái đầu có từ prepaint, không flash); hero word fade
delay `0.6s`; filter `opacity 0, y 20px`, delay `1.3s`, `1s expo.out`, stagger
`0.15s`. Đổi ngôn ngữ chỉ cập nhật text, URL, ARIA trên node filter hiện có.

Trang chủ:

- Hero slideshow zoom `scale 1.06 → 1` trong `5s sine.inOut`, chuyển slide mờ
  `1.6s power2.inOut`; dừng khi hero ngoài viewport hoặc tab ẩn. Word fade
  tiêu đề bắt đầu tại 0.9s.
- Dòng heritage `y 2em → -0.1em`, `1.9s power4.out`; dòng `--delay` trễ 0.3s.
  Ảnh xen chữ `scale 0.9 → 1` và `opacity 0 → 1`, `0.6s` `--ease`, delay 0.6s.
- Portal: dòng tiêu đề `y → -0.1em` `1.9s power4.out`, delay 0, 0.3, 0.6s
  theo cột; phụ đề `opacity 0.3s ease-out`, delay 0.3, 0.6, 0.9s.
- Rail dự án trượt `translate 60px → 0`, `0.6s` `--ease`. Đoạn văn legacy
  `opacity 0.6s ease-out`, delay 0.3s.
- Marquee chạy vòng `25s linear`.

## Hover

| Phần tử | Hiệu ứng |
| --- | --- |
| Ảnh card, project tile | `scale(1 → 1.15)`, `600ms ease-out` (`--media-hover-*`); khung giữ nguyên, ảnh bị clip |
| Portal trang chủ | Ảnh `scale(1 → 1.1)`; lớp `media-label-overlay` giữ nguyên độ tối |
| Floating CTA | Nền đen sang trắng, chữ trắng sang `ink`, `0.3s ease-out` |
| Control viewer Advertising | Nền đổi `150ms`; nhãn mở trong `250ms`, không scale glyph, không reflow ảnh |

Focus bàn phím có cùng phản hồi và outline riêng; reduced motion tắt zoom, giữ
outline. Touch không cần hover để mở ảnh.

## Advertising

### Vị trí card (masonry)

- `masonry-layout` là engine duy nhất cho re-layout và chuyển vị trí; không
  có FLIP tự viết song song.
- Mọi thay đổi tọa độ (filter, resize, đổi số cột) chạy cùng một pipeline:
  card cũ ẩn ngay không fade; card còn lại và card mới đi từ vị trí cũ tới vị
  trí mới bằng `transform 0.4s ease`, không delay, không stagger.
- Tải lần đầu: card trong cửa sổ hiển thị đi từ đầu cột tới tọa độ đích
  cùng `400ms`; điểm xuất phát có từ prepaint.
- Trong `400ms`, DOM chỉ giữ cửa sổ cũ, cửa sổ mới, card đang focus và ảnh
  đang morph. Scroll trong lúc đó được giữ lại và render một lần sau khi xong,
  không replay.
- Tọa độ không đổi thì không có motion. Remount do ảo hóa tại tọa độ cũ là tức
  thì.

### Ảnh trong card

- Chỉ ảnh foreground fade `opacity 0 → 1`, `0.6s ease-out`; khung card, link,
  caption luôn hiện.
- Ảnh chưa tải xong thì chờ LazySizes rồi mới fade. Card rời viewport hoàn
  toàn (`intersectionRatio = 0`) thì lần vào sau fade lại, kể cả ảnh đã cache;
  card còn giao một phần thì không restart.
- Batch mới nối vào cột thấp nhất; card cũ không chạy lại motion.

### Skeleton tiếp nối

- Ba frame rỗng mỗi cột nối từ đáy ảnh thật, cùng gutter, chứa CTA; kết thúc ở
  đáy CTA cộng một gap masonry.
- Frame giữ tọa độ; mặt trong trôi X/Y tối đa 3px, chu kỳ 6 đến 8s lệch pha;
  gradient xám chuyển bằng transform và opacity trong 6s. Chỉ frame trong
  viewport và tab đang hiện mới chạy.
- Nền frame alpha 0.28, viền 0.40; opacity `0.42 → 0.16 → 0.04` và mask mờ
  dọc. Không shimmer, không focus.

### Suggestion và detail

- Suggestion chưa bật chạy chuỗi ảnh: mỗi 3s chuyển mờ `1.6s
  cubic-bezier(0.65, 0, 0.35, 1)` (`suggestion-slideshow.mjs`); zoom chỉ khi
  hover. Nút đang bật và reduced motion giữ ảnh tĩnh; dừng khi tab ẩn.
- Mở và đóng detail không có ảnh bay giữa card và primary. Đóng detail đánh
  dấu card vừa xem bằng lớp phủ tối và nhãn `Vừa xem` / `Just viewed`.
- Viewer: transform từ khung hero tới fit và ngược lại; zoom nội suy giữa fit,
  cover và hai lần cover; pan theo con trỏ tức thì, giới hạn theo ảnh đã phóng.
  Escape đóng viewer trước khi history nhận phím.
- Nền primary là bản sao cover + blur, chỉ animate opacity và transform; lớp
  kính `blur(28px) saturate(1.08) brightness(1.04)`, tint trắng alpha 0.12.

### Ảnh trên sáu trang detail

Khung ảnh giữ kích thước và luôn hiện; chỉ node `img` fade `0 → 1` trong
`0.6s ease-out` một lần khi đã tải (`complete` và `naturalWidth > 0`, hoặc sự
kiện `load`) và vào viewport. Lỗi tải thì giữ nền placeholder ở trạng thái
cuối. Carousel native chạy trước, Swiper là nâng cấp; reduced motion đặt speed
0.

## Chú thích thuật ngữ

- **FLIP**: đo vị trí đầu và cuối rồi nội suy bằng transform.
- **Route veil**: lớp phủ che trang khi chuyển route.
- **Prepaint**: trạng thái CSS có trước khi JavaScript chạy.
- **Ảo hóa**: chỉ mount các card gần viewport.
- **BFCache**: bộ nhớ trang của trình duyệt cho Back/Forward.
- **Parallax**: lớp nội dung chạy khác tốc độ cuộn để tạo chiều sâu.
