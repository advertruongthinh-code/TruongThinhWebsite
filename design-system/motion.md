# Motion

Chuyển động của website Trường Thịnh, viết theo runtime đang chạy:
`src/site/motion.js` (shell, route, menu, hero), `src/site/detail.js` và
`detail.css` (trang detail), `src/site/masonry/` (runtime, viewer, slideshow gợi ý, kính, skeleton,
host), `src/site/advertising-products/` (catalog, dữ liệu media). Định dạng token không có family motion, nên mọi timing nằm ở
đây.

Nguồn tham khảo của nhịp motion ghi ở [README](README.md#nguồn-tham-khảo).
Motion owner đã duyệt nhưng chưa có code nằm trong spec sở hữu phần đó.

## Nguyên tắc

- Motion phục vụ nội dung, không giữ nội dung ở trạng thái ẩn.
- `prefers-reduced-motion: reduce` đi thẳng trạng thái cuối: bỏ transform,
  autoplay, entrance; scroll native; zoom/pan người xem chủ động vẫn đổi tức
  thì. Đổi preference khi đang mở trang: hero, logo chạy, masonry dừng hoặc chạy lại ngay; menu, veil chuyển
  trang, header theo lần tải trang kế ([shell R13](../docs/specs/site-shell.md#r13-reduced-motion)). Query duy nhất là
  `window.TruongThinhEnv.reducedMotion` do `head-inline.js` gán; module masonry đọc qua `env` của `masonry/host.mjs`.
- Ưu tiên `transform` và `opacity`. Ngoại lệ đang chạy, mỗi cái ghi ở mục riêng: `background-size`
  gạch chân news, `margin-bottom` cụm CTA Advertising, `height` shutter menu, màu và nền khi hover,
  `visibility` pop âm lượng video, `filter` blur ảnh card đang tải, biến CSS `--header-surface-shift`
  (GSAP, dịch `::before` của header).
- Vòng đời (dọn observer, listener, timeline; BFCache) ở [shell](../docs/specs/site-shell.md#r7-veil-khi-tải-trực-tiếp-fallback-và-bfcache)
  và [ba trang con](../docs/specs/detail-pages.md#r6-reveal-parallax-đổi-ngôn-ngữ-và-vòng-đời); thư viện animation ở
  [phát hành tĩnh](../docs/specs/static-release.md#r4-font-và-thư-viện-tự-host).

## Token motion

Thời lượng và đường cong lặp lại khai một lần ở `:root` của `style.css`; `style.css` và `detail.css` đọc bằng
`var(...)`, không gõ lại literal. Từ khóa `ease-out`, `ease`, `ease-in-out`, `linear` giữ nguyên, không có token.

| Token | Giá trị | Dùng cho |
| --- | --- | --- |
| `--ease` | `cubic-bezier(0, 0, 0.26, 1)` | Hero kicker, media reveal, zoom hero, rail dự án, mũi tên CTA, 404, pha vào của Kính khi card hiện ảnh |
| `--ease-underline` | `cubic-bezier(0.4, 0, 0, 1)` | Gạch chân chạy (nav, menu, filter, chip, link, nhãn suggestion, news) |
| `--ease-expo-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Ảnh decode xong hiện `media-fade-in`, scroll cue, card tạm hiện dần, chip filter vào |
| `--ease-card` | `cubic-bezier(0.65, 0, 0.35, 1)` | Ảnh card, ảnh primary hiện lần đầu (crossfade từ skeleton, blur tan) và nền badge "vừa xem" trên card |
| `--ease-viewer` | `cubic-bezier(0.55, 0, 0, 1)` | Backdrop viewer mở, đóng; ảnh viewer bay ra, về |
| `--dur-fast` | `150ms` | Hover control video, thanh mô tả |
| `--dur-quick` | `250ms` | Hover nút suggestion, CTA detail, viewer đóng |
| `--dur-base` | `300ms` | Hover nền và chữ, gạch chân chạy, viewer mở, skeleton Flow hiện |
| `--dur-card` | `400ms` | Trượt `margin-bottom`, mũi tên CTA, card đổi vị trí hoặc kích thước trên masonry |
| `--dur-fade` | `450ms` | `media-fade-in`, card tạm hiện dần |
| `--dur-hover` | `600ms` | Zoom ảnh hover, reveal, nền badge, card hiện ảnh (`--media-hover-duration` trỏ về đây) |

Script masonry không gõ lại các giá trị trên: `src/site/masonry/motion-tokens.mjs` export `EASE` và `DUR` với đúng
chuỗi của token, và `tests/site/motion-tokens.test.mjs` so từng giá trị với `:root`. Riêng đường cong đẩy ngang
`cubic-bezier(0.76, 0, 0.24, 1)` của suggestion và dải media (`EASE.push`) không có token CSS.

Giá trị chỉ dùng một lần giữ literal tại chỗ (100ms, 700ms, 1s, 1.6s vệt sáng, 2s thở, 2.5s, 25s, delay) cùng các
đường cong riêng của header, floating CTA, menu và `.story-link`. Chế độ giảm chuyển động kẹp `0.01ms` ở `style.css`,
không dùng token. Trang 404 và CSS admin không thuộc phạm vi.

## Motion theo bề mặt UI

Motion dùng lại ở nhiều bề mặt có tên riêng; bề mặt mới dùng lại đúng rule CSS
hoặc module đang chạy, không viết bản giống. Thông số chi tiết ở các mục dưới.

| Motion | Thông số | Bề mặt UI |
| --- | --- | --- |
| Gạch chân chạy | Cao 3px, cách chữ 4px; `scaleX(0 → 1)` `0.3s cubic-bezier(.4, 0, 0, 1)`, nghỉ neo phải, hover, focus bàn phím hoặc đang chọn neo trái (`style.css`) | [Header](components/Header/README.md) nav, [Footer](components/Footer/README.md) link, [Full menu](components/FullMenu/README.md) (mục, tiêu đề nhóm, ngôn ngữ), phụ đề portal trang chủ, link legacy, nhãn [Suggestion](components/Suggestion/README.md), [Filter](components/Filter/README.md) cụm trên máy có hover (chip dày 2px), neo trái theo chữ. Biến thể 2px sát chữ: caption [Project reel](components/ProjectReel/README.md) |
| Zoom ảnh hover | `scale(1 → 1.15)` `600ms ease-out` khi chuột thật hover hoặc focus bàn phím (`media-hover-zoom`) | Portal trang chủ, duo About, [Banner CTA](components/BannerCta/README.md) trang con. Biến thể `1.1`: closer legacy. [Project reel](components/ProjectReel/README.md) tự viết riêng, không qua primitive và không có focus |
| Slideshow hero | Thứ tự mọi slide, gồm ảnh đầu, ngẫu nhiên mỗi lần tải; ảnh zoom `scale 1.06 → 1` `6.6s sine.inOut` (điện thoại: `1.1 → 1`, hoặc lia thẳng trái, phải, lên, xuống `8%` chiều cao khung cùng nhịp, theo `data-hero-move`); mỗi ảnh giữ 5s tính theo thời gian slide thật sự chạy (dừng khi khuất), rồi chuyển mờ `1.6s power2.inOut`, ảnh mới zoom từ frame đầu crossfade | [Hero](components/Hero/README.md) trang chủ, Residential, Commercial (`motion.js`). [Suggestion](components/Suggestion/README.md) dùng nhịp giữ, không zoom, chuyển bằng đẩy ngang (`masonry/suggestion-slideshow.mjs`) |
| Zoom vào hero | Lớp ảnh `scale 1.2 → 1.005` `2.5s ease` mỗi lần mount, rồi đứng yên ở `1.005` | [Hero](components/Hero/README.md) About, trang công trình (`data-motion-hero-media`) |
| Zoom khối chữ hero | Khối chữ `scale 1.2 → 1` `2.5s var(--ease)` (`data-motion-hero-wrapper-zoom`); mức đầu và vị trí là tham số `--hero-zoom-from`, `--hero-zoom-place` | [Hero](components/Hero/README.md) Advertising (1.2, căn giữa tuyệt đối); [News list](components/NewsList/README.md) dòng nhỏ và tiêu đề (1.1, trong luồng) |
| Vệt sáng chờ ảnh | Dải sáng nghiêng lướt `1.6s` linear tới khi ảnh giải mã | [Vệt sáng](components/LoadSweep/README.md): ảnh nội dung ngoài masonry, [Suggestion](components/Suggestion/README.md) |
| Kính mờ lộ ảnh | Flow hóa kính mờ của chính ảnh rồi tan ra ảnh nét trong `0.6s`, vẽ trên canvas Flow | PC: [Media card](components/MediaCard/README.md), [Primary](components/Primary/README.md) ([Skeleton](components/Skeleton/README.md)) |
| Flow | Gradient bốn màu chảy bằng WebGL, 12 preset | [Skeleton](components/Skeleton/README.md) |
| Line reveal, word fade | `1.9s power4.out` theo dòng; `1s expo.out` theo từ | Tiêu đề [Hero](components/Hero/README.md), tiêu đề section và [Banner CTA](components/BannerCta/README.md) (mục Text) |
| Cụm chữ nguyên khối | Cả khối `scale 1.1 → 1` `2.5s cubic-bezier(0, 0, .26, 1)` (`--ease`) từ lúc trang bắt đầu lộ; câu rồi số fade nguyên khối `1s expo.out`, trễ `0.3s` và `0.6s`; không tách từ, không trượt | Trang 404 (mục Text), mẫu 404 của Espacio |
| Parallax | Media trôi chậm hơn cuộn 20%; rail ngang `4`; CTA Advertising 10% | [Hero](components/Hero/README.md), [Project reel](components/ProjectReel/README.md), dải công trình Residential, Commercial, trang công trình ([Blocks](components/Blocks/README.md)), [Banner CTA](components/BannerCta/README.md) Advertising |
| Nhô lên, trượt vào | `data-motion-up`: `y 60px → 0` và mờ sang rõ `0.6s` `--ease`, trễ theo `data-motion-delay`; `data-motion-left`: `x 60px → 0` không mờ, cùng nhịp; khi vào viewport | Ô thông số trang công trình (trễ 0, 0.15, 0.3, 0.45s), dải công trình (Residential, Commercial, trang công trình), khối chi tiết Residential, Commercial |
| Chuyển vị trí card | `transform 0.4s ease` qua `masonry-layout` | [Masonry](components/Masonry/README.md), [Filter](components/Filter/README.md) |
| Đổi nền hover | `0.3s ease-out` nền và chữ đảo màu | [Floating CTA](components/FloatingCta/README.md) |

Motion chỉ một bề mặt dùng: header intro, collapse, ẩn hiện ([Header](components/Header/README.md));
shutter ([Full menu](components/FullMenu/README.md)); route veil; [Lockup](components/BrandLockup/README.md);
zoom, pan, vuốt đóng ([Viewer](components/Viewer/README.md)); trượt vào ([Floating CTA](components/FloatingCta/README.md)).

### Chuyển động đang chạy, chưa có ở trên

| Phần tử | Thông số |
| --- | --- |
| `.floating-cta` mục thứ ba | `var(--dur-hover) cubic-bezier(0.42, 0, 0.07, 0.99)`, mọi thuộc tính còn lại (không khai tên) |
| `.story-link svg` | `var(--dur-base) cubic-bezier(0.4, 0, 0.2, 1)` |
| `.motion-toggle` | nền và transform `var(--dur-quick) ease` |
| `.detail-dialog__thumbs` | opacity và translate `var(--dur-base) ease` |
| `.video-player__bar` | opacity `200ms ease-out` |
| `.video-player__volume-pop` | opacity `var(--dur-fast) ease-out`, visibility `var(--dur-fast)` |
| `.detail-view__description-bar` | opacity `var(--dur-fast) ease-out` |
| `.detail-view__media-step` | opacity `100ms ease-out` |
| `.card-media__just-viewed` | opacity theo `--media-hover-duration` và `--media-hover-easing`; nền `var(--dur-hover) var(--ease-card)` |
| `.detail-view__cta svg` | transform `var(--dur-quick) ease-out` |
| Nút cue cuộn tới phần kế | `scrollTo` của Locomotive `900ms`, `0` khi giảm chuyển động |

## Shell

| Chuyển động | Thông số |
| --- | --- |
| Header intro | Chỉ khi tải trực tiếp: lockup `scale 0 → 1` `1.5s power4.out`; mục nav `y -150 → 0` `1.5s power4.out`, stagger 0.1, tại 0.3s; hamburger `scaleX 0 → 1` `1s power4.out` tại 1.5s. Vào bằng route mềm thì không chạy lại |
| Header collapse | Khi `scrollY > 100`. Một nhịp ([Brand Motion](brand.md#motion)): lockup FLIP scale, nav và icon menu trượt bằng `translateY`, nền co bằng `translateY` của `::before`, cùng `0.3s expo.out` (`cubic-bezier(.16, 1, .3, 1)`); thu gọn: nền trắng, viền và chữ đậm hiện ngay lúc bắt đầu, không fade, nền bắt đầu ở cao cũ rồi co cùng logo, mark lật `0.68s` cùng lúc; mở ra: mark lật ngay, nền trắng, viền và chữ đậm giữ, nền giãn cùng logo, hết `0.3s` mới đổi ngay sang nền trong, chữ trắng (owner 2026-11-09); cỡ lớn nhất của nền là lúc logo lớn nhất cách đều cạnh trên và cạnh dưới nền. Padding đổi ngay (không transition layout). Transform ẩn/hiện `1s cubic-bezier(0, 0, .1, .99)` |
| Đổi tone header | Chữ logo, nav và nét hamburger đổi màu ngay, không motion, cùng frame nền header đổi, theo `data-header-tone` của section dưới header ([Brand Motion](brand.md#motion), owner 2026-11-09); chuyển trang cũng đổi ngay: sang đậm lúc veil phủ kín, sang tone trang đích lúc veil bắt đầu mở ([logo đổi màu](../docs/specs/logo-route-crossfade.md)) |
| Header ẩn/hiện | Chỉ trong vùng giữa `0.5 × viewportHeight < scrollY < pageHeight - 1.25 × viewportHeight`: đi xuống quá 150px thì ẩn, đi lên quá 150px thì hiện. Ngoài vùng hiện ngay. Điện thoại cảm ứng (cạnh ngắn tối đa 750px): header lệch đúng bằng quãng cuộn, không transition, dừng thì giữ nguyên ([spec](../docs/specs/phone-header-scroll.md)) |
| Pointer reveal | Chuột (hover thật) có `mousemove.screenY <= 350` thì hiện header đang ẩn; touch và pen không giả hover |
| Route veil | Lớp trắng toàn màn hình `z-index 999` (header 1000, trừ lúc vào thẳng trang). Cover `0.75s power4.inOut`, giữ phủ kín ít nhất `0.7s` (owner 2026-11-13, kể cả trang có trong cache), uncover `1s power4.inOut`; lúc bấm header hiện ngay (bỏ `is-hidden`, không transition) và ghim lại, chữ và mark giữ màu; trang đích mount dưới veil, header về trạng thái theo vị trí cuộn của trang đích (thường là mở ra) bằng FLIP `0.3s expo.out` như khi cuộn, chạy trên veil; cụm logo header luôn hiện trên veil; veil phủ kín thì chữ đổi ngay sang đậm, mark lật sang CMYK; veil bắt đầu mở thì chữ đổi ngay, mark lật sang màu trang đích ([R7](../docs/specs/logo-route-crossfade.md#r7-cụm-logo-luôn-hiện-trên-veil)); body có `is-transitioning` trong lúc chuyển |
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
| Ảnh hero `.hero-slides`, `.hero-photo` | Trang chủ, Residential, Commercial, About | `-2` | Trôi chậm hơn cuộn 20% |
| Rail dự án `.project-track`, dải `.blk-projects__track` | Trang chủ; Residential, Commercial, trang công trình | `4`, chiều ngang | Trượt ngang 0.4px mỗi px cuộn |

Quy tắc: parallax chỉ ở hero có chữ lớn trên nền ảnh hoặc video, lớp media nền
speed `-2`, chữ đi theo trang, không lộ mép. Ngoài hero chỉ có rail trang chủ, dải công trình và
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

Intro, FLIP scale `300ms expo.out` (điện thoại không chạy vì header đầu trang và thu gọn cùng cỡ), tone cụm chữ và bốn dải màu lật của
mark ở [Brand guideline](brand.md#motion).

### Full menu

Timeline GSAP mở trong `motion.js`, dựng một lần rồi chạy lại mỗi lần mở. Cột thời điểm là vị trí trong timeline;
timeline chạy `timeScale 1.15` nên giây thật bằng vị trí chia 1.15 (shutter
phủ xong khoảng 0.91s). Chữ chỉ hiện sau khi shutter phủ xong.

| Phần | Thông số |
| --- | --- |
| Shutter | `height 0 → 100vh`, `0.6s power4.inOut`, stagger `0.15`; 3/2/1 cột ở mặc định, 960, 578px |
| Nav menu | opacity `0 → 1`, `0.6s`, tại `1.05s` |
| Nhóm link | `y -140 → 0`, opacity `0 → 1`, `1s expo.out`, stagger `0.02`, tại `1.1s` |
| Brand, locale, CTA hẹn | `y -140` (brand) hoặc `-20`, `0.6s expo.out`, tại `1.15s`; mark có màu CMYK ngay từ frame đầu |
| Mục con | `y -20 → 0`, `0.6s expo.out`, stagger `0.03`, tại `1.35s` |
| Nút đóng | opacity `0 → 1`, rotate `90° → 0`, `0.6s expo.out`, tại `1.4s` |
| Page scale | trang phía sau `scale 1 → 0.9`, `0.7s power2.out`, origin là giữa màn hình (đo theo vị trí từng child lúc mở, kể cả khi đã cuộn sâu), ngoài timeline; khi đóng, timeline reverse `timeScale 2.25`, scale về 1 sau delay `0.85s` |
| Đường kẻ | CSS, ngoài timeline: dưới hàng đầu `scaleX 0 → 1` `0.7s cubic-bezier(.56, 0, .38, 1)` sau 0.7s; giữa các cột `scaleY 0 → 1` `0.3s linear`, delay 0.9, 1.1, 1.3s theo cột |

## Text

Chỉ target khai báo bằng data attribute mới được split; không split body,
navigation, filter, card title, portal title hoặc `.sr-only`.

| Kiểu | Hook | Timing |
| --- | --- | --- |
| Line reveal | `data-motion-lines` | `1.9s power4.out`, stagger `0.1s`, khi vào viewport |
| Word fade | `data-motion-words` | `1s expo.out`, stagger `0.2s` |
| Scroll cue | `[data-scroll-cue-label]` | Character split; sau 3s từng ký tự vào từ `top -20px` (0.4s, stagger 0.1s), giữ 3s, ra tới `top 20px` cùng nhịp, lặp sau 3s. Cuộn quá 200px thì mờ đi `1s` `--ease-expo-out` và rời thứ tự Tab |
| Media reveal | `data-motion-media` | `0.6s ease-out`: dòng `transition-timing-function` trong `detail.css` đè `--ease`; khi vào viewport và cha có `.is-media-settled` (tải và `decode()` xong, hoặc lỗi) |
| Cụm 404 | `.not-found__copy` (CSS trong `404.html`) | Cả cụm số `404` và câu, không split: `scale 1.1 → 1` `2.5s` `--ease` từ lúc veil bắt đầu mở; câu rồi số hiện dần `1s expo.out` trễ `0.3s` và `0.6s` (nhịp Espacio, đo frame 2026-10-12). Trước đó đứng ở frame đầu dưới veil. Reduced motion và script lỗi hiện ngay trạng thái cuối |

Line reveal và word fade có một nguồn timing: `revealLines` và `revealWords` trong `window.TruongThinhMotion`
(`motion.js`), `detail.js` gọi lại `revealWords`; "vào viewport thì chạy một lần" là `onceInView`. Nơi gọi chỉ
truyền delay, stagger hoặc trạng thái đầu riêng của mình. Ngoại lệ còn viết tay: word fade của hero trang chủ (nằm
trong timeline intro) và line reveal của `detail.js` (phải chạy cả khi `motion.js` không tải được).

Route và target:

| Route | Word | Line | Character |
| --- | --- | --- | --- |
| Advertising | `#page-title` | `#cta-title` | `[data-scroll-cue-label]` |
| Residential | `#page-title` | `#intro-title`, `#gallery-title`, `#process-title`, `#cta-title` | `[data-scroll-cue-label]` |
| Commercial | `#page-title`, `#process-title` | `#intro-title`, `#gallery-title`, `#cta-title` | `[data-scroll-cue-label]` |
| Trang công trình | `#page-title`, tiêu đề dải "Công trình khác" | tiêu đề mục `section-title` | `[data-scroll-cue-label]` |

Entrance Advertising khi tải trực tiếp: kicker `opacity 0, x -60px`, delay
`0.9s`, vào `0.6s` (trạng thái đầu có từ prepaint, không flash); hero word fade
delay `0.6s`; filter `opacity 0, y 20px`, delay `1.3s`, `1s expo.out`, stagger
`0.15s`. Đổi ngôn ngữ chỉ cập nhật text, URL, ARIA trên node filter hiện có.

Entrance trang công trình (như Espacio `/en/projects/<slug>`): ảnh `.hero-photo` `scale 1.2 → 1.005` `2.5s`, tiêu đề
word fade, tên công trình (`data-motion-hero-kicker`) trượt từ `x -60px` lúc `1.2s`, nút `.hero-cta`
(`data-motion-hero-fade`) hiện dần lúc `1.8s`; cả hai ẩn từ khung đầu (prepaint), reduced motion hiện ngay.

Trang chủ:

- Hero slideshow zoom `scale 1.06 → 1` trong `6.6s sine.inOut` (điện thoại `1.1 → 1` hoặc lia thẳng `8%` chiều cao khung); tại giây 5 chuyển slide mờ
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
| Ảnh card, project tile | `scale(1 → 1.15)`, `600ms ease-out`: ảnh card qua `--media-hover-*`; project tile viết riêng trong `style.css`, hover không gate `(hover: hover)`; khung giữ nguyên, ảnh bị clip |
| Portal trang chủ | Ảnh `scale(1 → 1.15)` như card; lớp `media-label-overlay` giữ nguyên độ tối |
| Ảnh duo, CTA trang con | Như card, cùng primitive `media-hover-zoom` |
| Ảnh [Gallery](components/Gallery/README.md) | Không zoom, chỉ con trỏ grab như Espacio |
| Card masonry (chính, related, Công trình) | Không zoom; chuột thật: lớp tối `media-shade-card` và tên card hiện cùng lúc, không motion; cảm ứng: không tên, không lớp tối ([Media card](components/MediaCard/README.md)) |
| Nút Suggestion | Lớp tối `0.5` chỉ hiện khi ảnh nền giải mã xong, hover không đổi; [gạch chân chạy](#motion-theo-bề-mặt-ui) dưới nhãn; ảnh không zoom (slideshow giữ transform); nút đang bật không có lớp tối, không gạch chân |
| Floating CTA | Nền đen sang trắng, chữ trắng sang `ink`, `0.3s ease-out` |
| Control viewer Advertising | Nền đổi `150ms`; nhãn mở trong `250ms`, không scale glyph, không reflow ảnh |

Focus bàn phím có cùng phản hồi và outline riêng; reduced motion tắt zoom, giữ
outline. Touch không cần hover để mở ảnh.

## Advertising

### Kicker và hàng chip khi đổi filter

Đổi cụm hoặc sản phẩm trên [rail](components/Filter/README.md) chạy lại entrance có sẵn của hàng chip (không thêm
nhịp mới), bằng Web Animations API trong `masonry/runtime.mjs`, chỉ `opacity` và `transform`:

- Kicker (h1, tên cụm hoặc sản phẩm) đứng yên khi lọc, giữ chữ của trang đã tải (owner 2026-11-08); không chạy entrance.
- Hàng chip vừa hiện (từ Tất cả sang cụm, hoặc từ cụm này sang cụm khác) vào như rail lúc tải trang: từng chip
  `opacity 0, y 20px → 0`, `1s expo.out`, stagger `0.15s` (hàng dài thì ép tổng so le tối đa `0.6s`), trễ `0.3s`.
- Đổi sản phẩm trong cùng cụm: hàng chip đứng yên, không motion nào. Về Tất cả: chip ẩn ngay, không motion thoát.
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
- Ở detail, card related, suggestion và khung batch không bao giờ trượt qua sau
  ảnh primary: đường thẳng cắt primary thì card đi hai đoạn qua một góc vuông,
  tổng vẫn `0.4s ease`; cụm CTA và Kính cung trượt thẳng
  ([spec R10](../docs/specs/advertising-cta-center-parallax.md#r10-card-related-không-đi-qua-primary)).

### Ảnh trong card

Masonry chính và masonry related chỉ có hai kiểu motion cho card: vị trí
(mục trên) và ảnh hiện (mục này).

- PC, ảnh chưa tải xong khi card vào viewport: khung media tô màu chủ đạo, ảnh ẩn dưới khung [Skeleton](components/Skeleton/README.md)
  Flow trong 4 màu của chính ảnh (khung hiện `0.6s`, ngay lập tức nếu đang cuộn), vẽ trên một canvas chung của lưới. Tải và `decode()` xong thì
  lộ ảnh như primary trong `0.6s` (owner 2026-11-12, kiểu 10 "Kính mờ rẻ"): ảnh hiện ngay dưới khung, canvas vẽ Flow hóa kính mờ của chính ảnh
  (`0s` tới `0.27s`, `smoothstep`: bản ảnh 20px phóng bậc ba B-spline, màn trắng `14%`, sạn mịn `4.5%`), rồi kính mờ tan ra ảnh nét (`0.27s` tới `0.6s`, `smoothstep`), rồi gỡ khung.
  Không Kính, không blur filter. Không làm được bản ảnh 20px hoặc canvas chưa sẵn thì crossfade (`0.13s` tới `0.39s`, `cubic-bezier(0.65, 0, 0.35, 1)`).
  Canvas của lưới card vẽ trên cả card (mỗi card là một stacking context vì `contain: layout`, nền `.card-media` đục nên canvas không thể nằm dưới): lúc chờ và lúc lộ, pill chỉ số và nhãn vừa xem nằm dưới Flow.
  Khung card, link luôn hiện.
- Điện thoại (`skeletonPhone`): thay khung Flow bằng lớp màu phẳng (`[data-media-wait="colors"]`, `detail.css`): đổi qua 4 màu chủ đạo của ảnh, mỗi màu `2s`
  `ease-in-out`, chu kỳ `8s` (lớp trên đổi opacity, lớp dưới đổi màu từng bước lúc bị phủ), dùng chung pha `--wait-phase` giữa card tạm, card và primary; ảnh ẩn tới khi tải và giải mã xong rồi
  hiện `opacity 0 → 1` trong `0.45s` `cubic-bezier(0.16, 1, 0.3, 1)` (`--dur-fade`, `--ease-expo-out`) trên lớp màu, xong gỡ lớp màu. Reduced motion: lớp màu đứng yên ở màu 1, ảnh hiện thẳng.
- Ảnh đã có (cache, tải trước, hoặc vào lại sau khi rời hẳn viewport với
  `intersectionRatio = 0`): hiện ngay, không kính, không crossfade.
- Vuốt rất nhanh: card chưa dựng kịp trong ngân sách frame có card tạm đúng chỗ và cỡ card, nền màu chủ đạo, thở
  (`media-breathe`, opacity `1 → 0.45 → 1`, `2s`) cùng pha. Card tạm lên card thật thì ảnh có sẵn hiện dần từ màu chủ đạo, opacity `0 → 1` trong `0.45s`
  `cubic-bezier(0.16, 1, 0.3, 1)` (cùng nhịp ảnh nội dung ngoài masonry), chỉ opacity; ảnh chưa xong thì card nhận khung Flow (điện thoại: lớp màu)
  và card tạm gỡ ở frame sau, vì card thật đã phủ kín nó. Reduced motion: card tạm không thở, ảnh hiện thẳng.
- Reduced motion: khung Flow đứng yên ở ảnh tĩnh của preset, tải xong thì ảnh hiện ngay, không Kính.
- Batch mới nối vào cột thấp nhất; card cũ không chạy lại motion.
- Ảnh nội dung ngoài masonry và nút suggestion chờ bằng [vệt sáng](components/LoadSweep/README.md): dải sáng
  tâm `20%` mép mờ dần theo cosine, nghiêng 60 độ lướt `1.6s` linear, chỉ `transform`; ảnh hiện sau load và `decode()`, opacity `0.45s`
  `cubic-bezier(0.16, 1, 0.3, 1)`. Reduced motion: sáng tối nhẹ (`10%`) `2s`.

### Skeleton tiếp nối

- Frame rỗng nối từ đáy ảnh thật mỗi cột, cùng gutter, xếp tới đáy batch ngay
  trên footer; CTA nằm trong batch.
- Ở detail, batch, cụm CTA và Kính cung chuyển xuống cuối related: batch nối
  tiếp các cột related, related rỗng thì nằm dưới primary
  ([spec R9](../docs/specs/advertising-cta-center-parallax.md#r9-cta-cuối-related-ở-detail)).
- Mặt frame là Flow: gradient bốn màu chảy và xoáy chậm, có noise mịn, vẽ
  bằng WebGL. Mỗi frame (batch và skeleton chờ ảnh) bốc preset trong 12, hoán
  vị anchor, chiều chảy, pha liên tục và tốc độ lệch tối đa 10% lúc vào
  viewport, tránh preset của frame kề; buộc trùng thì pha lệch ít nhất một
  phần tư vòng. Giữ màu tới khi trang ổn định lại (tải, đổi filter, mở đóng
  detail, Back/Forward); cuộn và resize không đổi màu.
  Tên và màu preset ở [skeleton spec](../docs/specs/advertising-skeleton.md#r2-flow-và-12-preset).
- Frame không viền, phủ lớp chéo 135° trắng alpha 0.08 tới đen alpha 0.10.
  Nền dưới canvas là `#a9abad`; không có WebGL thì frame đứng yên.
- Vào viewport: frame mờ dần opacity `0 → 1` `0.6s` `ease-out`, không Kính (owner 2026-11-12); Flow chạy ngay từ đầu
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
  (power3.inOut) (`masonry/suggestion-slideshow.mjs`). Đồng hồ giữ ảnh chạy ngay khi hiện, nút thứ i trễ `0.4s × i` thành sóng từ trên xuống, cả cụm dừng và chạy chung nên nút dưới mép màn hình điện thoại không lệch sóng; mọi nút đều chạy (bộ một ảnh đẩy sang chính nó). Lớp tối `0.5` chỉ hiện khi ảnh nền giải mã xong; hover hoặc focus bàn phím chỉ chạy gạch chân dưới nhãn. Nút đang bật và reduced
  motion giữ ảnh tĩnh; dừng khi tab ẩn, cả cụm ngoài viewport hoặc `dialog` mở.
- Mở và đóng detail không có ảnh bay giữa card và primary. Đóng detail đánh
  dấu card vừa xem bằng lớp phủ tối (chỉ hiện khi media sẵn sàng) và nhãn `Vừa xem` / `Just viewed` có bóng D.
- Primary đổi ảnh tại chỗ, cả lần mở đầu từ masonry lẫn khi bấm related. Ảnh
  đang tải thì khung primary mang skeleton như card; giải mã xong thì lộ qua kính mờ như ảnh card (mục
  [Ảnh trong card](#ảnh-trong-card), `0.6s`, owner 2026-11-12): kính mờ đặt đúng chỗ ảnh nằm, vùng dư phủ như nền mờ.
  Ảnh có sẵn chỉ làm skeleton đứng ngắn hơn; khung chưa kịp hiện thì crossfade `0.13s` đến `0.39s`. Reduced motion: ảnh hiện thẳng.
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
