# Motion

Chuyển động của website Trường Thịnh, viết theo runtime đang chạy:
`src/site/motion.js` (shell, route, menu, hero), `src/site/detail.js` và
`detail.css` (trang detail), `src/site/advertising-products/` (catalog,
skeleton, viewer). Định dạng token không có family motion, nên mọi timing nằm ở
đây.

Nguồn tham khảo của nhịp motion ghi ở [README](README.md#nguồn-tham-khảo).
Motion owner đã duyệt nhưng chưa có code nằm trong spec sở hữu phần đó.

## Nguyên tắc

- Motion phục vụ nội dung, không giữ nội dung ở trạng thái ẩn.
- `prefers-reduced-motion: reduce` đi thẳng trạng thái cuối: bỏ transform,
  autoplay, entrance; scroll native; zoom/pan người xem chủ động vẫn đổi tức
  thì. Đổi preference khi đang mở trang có hiệu lực ngay.
- Chỉ animate `transform` và `opacity`; không animate width, height hay CSS
  blur mỗi frame.
- Vòng đời (dọn observer, listener, timeline; BFCache) ở [shell](../docs/specs/site-shell.md#r7-veil-khi-tải-trực-tiếp-fallback-và-bfcache)
  và [ba trang con](../docs/specs/detail-pages.md#r6-reveal-parallax-đổi-ngôn-ngữ-và-vòng-đời); thư viện animation ở
  [phát hành tĩnh](../docs/specs/static-release.md#r4-font-và-thư-viện-tự-host).

## Motion theo bề mặt UI

Motion dùng lại ở nhiều bề mặt có tên riêng; bề mặt mới dùng lại đúng rule CSS
hoặc module đang chạy, không viết bản giống. Thông số chi tiết ở các mục dưới.

| Motion | Thông số | Bề mặt UI |
| --- | --- | --- |
| Gạch chân chạy | Cao 3px, cách chữ 4px; `scaleX(0 → 1)` `0.3s cubic-bezier(.4, 0, 0, 1)`, nghỉ neo phải, hover, focus bàn phím hoặc đang chọn neo trái (`style.css`) | [Header](components/Header/README.md) nav, [Footer](components/Footer/README.md) link, [Full menu](components/FullMenu/README.md) (mục, tiêu đề nhóm, ngôn ngữ), phụ đề portal trang chủ, link legacy, nhãn [Suggestion](components/Suggestion/README.md), [Filter](components/Filter/README.md) cụm trên máy có hover (chip dày 2px). Biến thể 2px sát chữ: caption [Project reel](components/ProjectReel/README.md) |
| Zoom ảnh hover | `scale(1 → 1.15)` `600ms ease-out` khi chuột thật hover hoặc focus bàn phím (`media-hover-zoom`) | [Media card](components/MediaCard/README.md) masonry và related, [Project reel](components/ProjectReel/README.md), portal trang chủ, duo About, [Banner CTA](components/BannerCta/README.md) trang con. Biến thể `1.1`: closer legacy |
| Slideshow hero | Thứ tự mọi slide, gồm ảnh đầu, ngẫu nhiên mỗi lần tải; ảnh zoom `scale 1.06 → 1` `6.6s sine.inOut`; mỗi ảnh giữ 5s tính theo thời gian slide thật sự chạy (dừng khi khuất), rồi chuyển mờ `1.6s power2.inOut`, ảnh mới zoom từ frame đầu crossfade | [Hero](components/Hero/README.md) trang chủ, Residential, Commercial (`motion.js`). [Suggestion](components/Suggestion/README.md) dùng nhịp giữ, không zoom, chuyển bằng đẩy ngang (`suggestion-slideshow.mjs`) |
| Zoom vào hero | Lớp ảnh `scale 1.2 → 1.005` `2.5s ease` mỗi lần mount, rồi đứng yên ở `1.005` | [Hero](components/Hero/README.md) About (`data-motion-hero-media`) |
| Vệt sáng chờ ảnh | Dải sáng nghiêng lướt `1.6s` linear tới khi ảnh giải mã | [Vệt sáng](components/LoadSweep/README.md): ảnh nội dung ngoài masonry, [Suggestion](components/Suggestion/README.md) |
| Kính reveal | Năm bậc trong `0.6s`, chỉ opacity | [Media card](components/MediaCard/README.md), [Skeleton](components/Skeleton/README.md), [Primary](components/Primary/README.md) ([Kính](components/Glass/README.md)) |
| Flow | Gradient bốn màu chảy bằng WebGL, 12 preset | [Skeleton](components/Skeleton/README.md) |
| Line reveal, word fade | `1.9s power4.out` theo dòng; `1s expo.out` theo từ | Tiêu đề [Hero](components/Hero/README.md), tiêu đề section và [Banner CTA](components/BannerCta/README.md) (mục Text) |
| Cụm chữ nguyên khối | Cả khối `scale 1.1 → 1` `2.5s cubic-bezier(0, 0, .26, 1)` (`--ease`) từ lúc trang bắt đầu lộ; câu rồi số fade nguyên khối `1s expo.out`, trễ `0.3s` và `0.6s`; không tách từ, không trượt | Trang 404 (mục Text), mẫu 404 của Espacio |
| Parallax | Media trôi chậm hơn cuộn 20%; rail ngang `4`; CTA Advertising 10% | [Hero](components/Hero/README.md), [Project reel](components/ProjectReel/README.md), [Banner CTA](components/BannerCta/README.md) Advertising |
| Chuyển vị trí card | `transform 0.4s ease` qua `masonry-layout` | [Masonry](components/Masonry/README.md), [Filter](components/Filter/README.md) |
| Đổi nền hover | `0.3s ease-out` nền và chữ đảo màu | [Floating CTA](components/FloatingCta/README.md) |

Motion chỉ một bề mặt dùng: header intro, collapse, ẩn hiện ([Header](components/Header/README.md));
shutter ([Full menu](components/FullMenu/README.md)); route veil; [Lockup](components/BrandLockup/README.md);
zoom, pan, vuốt đóng ([Viewer](components/Viewer/README.md)); trượt vào ([Floating CTA](components/FloatingCta/README.md)).

## Shell

| Chuyển động | Thông số |
| --- | --- |
| Header intro | Chỉ khi tải trực tiếp: lockup `scale 0 → 1` `1.5s power4.out`; mục nav `y -150 → 0` `1.5s power4.out`, stagger 0.1, tại 0.3s; hamburger `scaleX 0 → 1` `1s power4.out` tại 1.5s. Vào bằng route mềm thì không chạy lại |
| Header collapse | Khi `scrollY > 100`. Transform `1s cubic-bezier(0, 0, .1, .99)`; padding, nền, viền, màu `0.3s ease-out` |
| Đổi tone header | Chữ nav và nét hamburger đổi màu cùng lúc `0.3s expo.out` theo `data-header-tone` của section dưới header |
| Header ẩn/hiện | Chỉ trong vùng giữa `0.5 × viewportHeight < scrollY < pageHeight - 1.25 × viewportHeight`: đi xuống quá 150px thì ẩn, đi lên quá 150px thì hiện. Ngoài vùng hiện ngay. Điện thoại cảm ứng (cạnh ngắn tối đa 750px): header lệch đúng bằng quãng cuộn, không transition, dừng thì giữ nguyên ([spec](../docs/specs/phone-header-scroll.md)) |
| Pointer reveal | Chuột (hover thật) có `mousemove.screenY <= 350` thì hiện header đang ẩn; touch và pen không giả hover |
| Route veil | Lớp trắng toàn màn hình `z-index 999` (header 1000, trừ lúc vào thẳng trang). Cover `0.75s power4.inOut`, uncover `1s power4.inOut`; header bỏ `is-hidden` khi bắt đầu chuyển route; cụm logo header luôn hiện trên veil, mark tween sang `#2f2f2f` lúc bấm và về màu trang đích lúc veil mở, `0.3s` cùng chữ ([R7](../docs/specs/logo-route-crossfade.md#r7-cụm-logo-luôn-hiện-trên-veil)); body có `is-transitioning` trong lúc chuyển |
| Vào thẳng trang | F5, gõ link, mở link từ ứng dụng khác, Back/Forward không qua bfcache: veil phủ cả trang lẫn header từ khung hình đầu; trang dựng xong thì uncover `1s power4.inOut`, header intro chạy khi veil tan và kết thúc đúng trạng thái theo vị trí cuộn (quá 100px thì thu gọn), entrance của trang chạy tiếp. Mạng chậm giữ veil tới khi trang dựng xong; script motion lỗi thì gỡ veil ngay, không motion. Back từ bfcache và reduced motion không có veil |
| Route từ full menu | Menu reverse và route cover chạy đồng thời; menu đóng khi veil phủ kín và chữ menu đã reverse xong, không chờ shutter (trùng màu veil) và page scale; URL chỉ commit khi cả hai xong |
| Gạch chân nav, footer, menu | [Gạch chân chạy](#motion-theo-bề-mặt-ui); mục Advertising ở trang detail không gạch chân khi nghỉ |
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
| Ảnh hero `.hero-slides`, `.about-hero__media` | Trang chủ, Residential, Commercial, About | `-2` | Trôi chậm hơn cuộn 20% |
| Rail dự án `.project-track` | Trang chủ | `4`, chiều ngang | Trượt ngang 0.4px mỗi px cuộn |

Quy tắc: parallax chỉ ở hero có chữ lớn trên nền ảnh hoặc video, lớp media nền
speed `-2`, chữ đi theo trang, không lộ mép. Ngoài hero chỉ có rail trang chủ và
CTA cuối Advertising (dưới). Mọi trang dùng chung một cấu hình cuộn của trang chủ
([cảm giác cuộn](../docs/specs/scroll-feel.md)). Hero và rail nhận thuộc tính lúc
mount trong `motion.js`.

CTA cuối trang Advertising (`.detail-cta__copy`) có parallax riêng ở mọi chiều
rộng, cả scroll native: độ lệch bằng (giới hạn cuộn trừ `scrollY`) nhân `-0.1`,
tức trôi chậm hơn cuộn 10% và bằng 0 đúng tại cuối trang; độ lệch không vượt
khoảng trống phía trên cụm chữ nên tiêu đề không bị cắt. Giảm chuyển động hoặc
đang xem ảnh thì không lệch. Vị trí cuối của cụm CTA đổi theo thanh địa chỉ thì
trượt `margin-bottom 0.4s ease-out`
([CTA giữa viewport](../docs/specs/advertising-cta-center-parallax.md)).

### Lockup header

Intro, FLIP scale `300ms expo.out` (điện thoại không chạy vì header đầu trang và thu gọn cùng cỡ), tone cụm chữ và bốn dải màu mọc lên của
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
| Cụm 404 | `.not-found__copy` (CSS trong `404.html`) | Cả cụm số `404` và câu, không split: `scale 1.1 → 1` `2.5s` `--ease` từ lúc veil bắt đầu mở; câu rồi số hiện dần `1s expo.out` trễ `0.3s` và `0.6s` (nhịp Espacio, đo frame 2026-10-12). Trước đó đứng ở frame đầu dưới veil. Reduced motion và script lỗi hiện ngay trạng thái cuối |

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

- Hero slideshow zoom `scale 1.06 → 1` trong `6.6s sine.inOut`; tại giây 5 chuyển slide mờ
  `1.6s power2.inOut`, hai ảnh cùng zoom suốt lúc chuyển; dừng khi hero ngoài viewport hoặc tab ẩn.
  Word fade
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
| Portal trang chủ | Ảnh `scale(1 → 1.15)` như card; lớp `media-label-overlay` giữ nguyên độ tối |
| Ảnh duo, CTA trang con | Như card, cùng primitive `media-hover-zoom` |
| Ảnh [Gallery](components/Gallery/README.md) | Không zoom, chỉ con trỏ grab như Espacio |
| Nút Suggestion | [Gạch chân chạy](#motion-theo-bề-mặt-ui) dưới nhãn; ảnh không zoom (slideshow giữ transform); nút đang bật không gạch chân |
| Floating CTA | Nền đen sang trắng, chữ trắng sang `ink`, `0.3s ease-out` |
| Control viewer Advertising | Nền đổi `150ms`; nhãn mở trong `250ms`, không scale glyph, không reflow ảnh |

Focus bàn phím có cùng phản hồi và outline riêng; reduced motion tắt zoom, giữ
outline. Touch không cần hover để mở ảnh.

## Advertising

### Kicker và hàng chip khi đổi filter

Bấm cụm hoặc chip trên [rail](components/Filter/README.md) chạy lại hai entrance có sẵn của Advertising (không thêm
nhịp mới), bằng Web Animations API trong `catalog-runtime.mjs`, chỉ `opacity` và `transform`:

- Kicker (h1, tên cụm hoặc sản phẩm) đổi chữ thì vào lại như entrance tải trang: `opacity 0, x -60px → 0`, `0.6s`
  `--ease`, không delay.
- Hàng chip vừa hiện (từ Tất cả sang cụm, hoặc từ cụm này sang cụm khác) vào như rail lúc tải trang: từng chip
  `opacity 0, y 20px → 0`, `1s expo.out`, stagger `0.15s` (hàng dài thì ép tổng so le tối đa `0.6s`), trễ `0.3s` để kicker đi trước.
- Đổi sản phẩm trong cùng cụm: chỉ kicker chạy lại, hàng chip đứng yên. Về Tất cả: chip ẩn ngay, không motion thoát.
- Bấm liên tiếp: animation đang chạy bị hủy rồi chạy lại từ đầu. Tải trang, Back/Forward, đổi ngôn ngữ và
  mở ảnh không chạy. Reduced motion: vào thẳng trạng thái cuối. Không đổi bố cục nên không có CLS.

### Vị trí card (masonry)

- `masonry-layout` là engine duy nhất cho re-layout và chuyển vị trí; không
  có FLIP tự viết song song.
- Mọi thay đổi tọa độ (filter, resize, đổi số cột) chạy cùng một pipeline:
  card cũ ẩn ngay không fade; card còn lại và card mới đi từ vị trí cũ tới vị
  trí mới bằng `transform 0.4s ease`, không delay, không stagger. Đổi cỡ thì con
  của card co giãn `scale` từ cỡ cũ cùng nhịp, quanh góc trên trái card, nên card
  lớn lên không phủ item kế bên. Khung skeleton của batch là item nối tiếp
  masonry: khung còn giữ trượt và co giãn từ chỗ cũ, khung mới xuất phát ngay dưới
  khung đứng trước trong layout cũ; cụm CTA và Kính cung trượt cùng nhịp bằng
  `translate`, nên cả trang đọc như một masonry (owner 10/10). Đang kéo cạnh cửa
  sổ (relayout bề rộng liên tiếp dưới `250ms`) thì mọi item đặt thẳng vào layout
  mới mỗi frame, không trượt: relayout tốn khoảng `100ms` nên trượt bị khởi động
  lại liên tục và item kẹt giữa hai layout.
- Tải lần đầu: card trong cửa sổ hiển thị đi từ đầu cột tới tọa độ đích
  cùng `400ms`; điểm xuất phát có từ prepaint.
- Tọa độ không đổi thì không có motion. Card gắn lại do ảo hóa tại tọa độ cũ
  hiện ngay, không chạy lại motion.

### Ảnh trong card

Masonry chính và masonry related chỉ có hai kiểu motion cho card: vị trí
(mục trên) và ảnh hiện (mục này).

- Ảnh chưa giải mã khi card vào viewport: khung media mang ngay
  [skeleton](components/Skeleton/README.md) cuối masonry (Flow chạy cả khi
  đang cuộn). Ảnh về thì hiện dưới
  [Kính](components/Glass/README.md#hiện-và-tan-trên-ảnh-vừa-tải) năm bậc nhịp
  `0.6s`, chỉ opacity: kính hiện `0` đến `0.26s`
  `cubic-bezier(0, 0, 0.26, 1)`; skeleton mờ đi, ảnh hiện lên `0.13s` đến
  `0.39s` `cubic-bezier(0.65, 0, 0.35, 1)`; kính tan `0.26s` đến `0.6s`
  `cubic-bezier(0.86, 0, 0.07, 1)`. Khung card, link luôn hiện.
- Ảnh đã có (cache, tải trước, hoặc vào lại sau khi rời hẳn viewport với
  `intersectionRatio = 0`): hiện ngay, không kính, không crossfade.
- Reduced motion: skeleton đứng yên, ảnh thay ngay khi giải mã xong, không kính.
- Batch mới nối vào cột thấp nhất; card cũ không chạy lại motion.
- Ảnh nội dung ngoài masonry và nút suggestion chờ bằng [vệt sáng](components/LoadSweep/README.md): dải sáng
  tâm `16%` mép mờ dần theo cosine, nghiêng 60 độ lướt `1.6s` linear, chỉ `transform`; ảnh hiện sau load và `decode()`, opacity `0.45s`
  `cubic-bezier(0.16, 1, 0.3, 1)`. Reduced motion: sáng tối nhẹ `2s`.

### Skeleton tiếp nối

- Frame rỗng nối từ đáy ảnh thật mỗi cột, cùng gutter, xếp tới đáy batch ngay
  trên footer; CTA nằm trong batch.
- Mặt frame là Flow: gradient bốn màu chảy và xoáy chậm, có noise mịn, vẽ
  bằng WebGL. Mỗi frame (batch và skeleton chờ ảnh) bốc preset trong 12, hoán
  vị anchor, chiều chảy, pha liên tục và tốc độ lệch tối đa 10% lúc vào
  viewport, tránh preset của frame kề; buộc trùng thì pha lệch ít nhất một
  phần tư vòng. Giữ màu tới khi trang ổn định lại (tải, đổi filter, mở đóng
  detail, Back/Forward); cuộn và resize không đổi màu.
  Tên và màu preset ở [skeleton spec](../docs/specs/advertising-skeleton.md#r2-flow-và-12-preset).
- Frame không viền, phủ lớp chéo 135° trắng alpha 0.08 tới đen alpha 0.10.
  Nền dưới canvas là `#a9abad`; không có WebGL thì frame đứng yên.
- Vào viewport: reveal Kính `0.6s` như ảnh card (mục trên; lớp dưới là khung
  trống, lớp hiện lên là Flow); Kính cung đang trong viewport thì frame và card chỉ crossfade, Flow chạy ngay từ đầu
  kể cả khi đang cuộn; mỗi frame tự hiện khi giao vùng nhìn thấy, không stagger;
  chỉ lần đầu vào; rời hẳn viewport rồi vào lại thì hiện ngay. Không hover, không shimmer, không focus.
  Frame chưa có WebGL context hiện một khung hình Flow đứng yên của chính nó.
- Cuối batch là [Kính](components/Glass/README.md) dạng cung, đứng yên: card
  phía trên nét, nhòe tăng dần vào cụm CTA, đáy batch trắng tuyệt đối. CTA và
  footer nằm trên kính.
- Chỉ frame trong viewport và tab đang hiện mới chạy; reduced motion hiện ngay
  và giữ frame tĩnh.

### Suggestion và detail

- Suggestion chưa bật chạy nhịp giữ 5s của [slideshow hero](#motion-theo-bề-mặt-ui), không zoom (owner bỏ 10/10), chuyển ảnh
  bằng đẩy ngang: ảnh mới `translateX(100% → 0)`, ảnh cũ `0 → -35%` và opacity `1 → 0.4`, `0.9s cubic-bezier(0.76, 0, 0.24, 1)`
  (power3.inOut) (`suggestion-slideshow.mjs`). Đồng hồ giữ ảnh chạy ngay khi hiện, nút thứ i trễ `0.4s × i` thành sóng từ trên xuống, cả cụm dừng và chạy chung nên nút dưới mép màn hình điện thoại không lệch sóng; mọi nút đều chạy (bộ một ảnh đẩy sang chính nó). Hover hoặc focus bàn phím: gạch chân chạy dưới nhãn. Nút đang bật và reduced
  motion giữ ảnh tĩnh; dừng khi tab ẩn, cả cụm ngoài viewport hoặc `dialog` mở.
- Mở và đóng detail không có ảnh bay giữa card và primary. Đóng detail đánh
  dấu card vừa xem bằng lớp phủ tối và nhãn `Vừa xem` / `Just viewed`.
- Primary đổi ảnh tại chỗ, cả lần mở đầu từ masonry lẫn khi bấm related. Ảnh
  chưa giải mã xong sau `100ms` thì khung primary mang skeleton như card rồi
  crossfade dưới kính cùng nhịp `0.6s` như card (owner 19/10). Ảnh có sẵn: ảnh đang xem và nền blur
  cũ mờ đi trên ảnh mới, crossfade `0.13s` đến `0.39s` trong nhịp `0.6s`, kính
  hiện `0` đến `0.26s` rồi tan tới `0.6s`; mở lần đầu thì ảnh mới hiện từ khung
  trống cùng nhịp. Reduced motion: không kính.
- Viewer: transform từ khung hero tới fit và ngược lại (màn cảm ứng: fit chạm cạnh màn hình, cả khi xoay ngang); nút, con lăn, chạm đúp
  và bật về sau pinch nội suy `200ms ease-in-out`; pinch và pan theo tay tức
  thì, giới hạn theo ảnh đã phóng; vượt giới hạn khi pinch thì ảnh chỉ đi một
  phần ba so với tay. Màn cảm ứng vuốt dọc ảnh ở fit: ảnh theo tay, nền nhạt
  dần; đủ xa hoặc đủ nhanh thì đóng như trên, chưa tới thì về chỗ `200ms
  ease-in-out`.
- Nền primary là bản sao cover, chỉ animate opacity và transform; nhìn qua
  [Kính](components/Glass/README.md) dạng phủ đều đứng yên.

## Chú thích thuật ngữ

- **FLIP**: đo vị trí đầu và cuối rồi nội suy bằng transform.
- **Route veil**: lớp phủ che trang khi chuyển route.
- **Prepaint**: trạng thái CSS có trước khi JavaScript chạy.
- **Ảo hóa**: chỉ mount các card gần viewport.
- **BFCache**: bộ nhớ trang của trình duyệt cho Back/Forward.
- **Parallax**: lớp nội dung chạy khác tốc độ cuộn để tạo chiều sâu.
