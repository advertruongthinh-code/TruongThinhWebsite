# Motion Espacio

Số đo motion của Espacio. Motion Trường Thịnh đang chạy ở [Motion](motion.md);
phần lớn học theo các số dưới. Cách đọc ở
[Tham chiếu Espacio](reference-espacio.md#cách-đọc-số-đo).

Thư viện trong bundle: GSAP 3.7.1 với SplitText, ScrollTo, DrawSVG, CSSRule;
Barba 2.3.2; Locomotive Scroll 4.1.0; Swiper 7.0.6; Masonry 4.2.2; lazysizes
5.3.0; Vimeo Player 2.30.4.

## Header

| Chuyển động | Espacio |
| --- | --- |
| Intro | Chỉ khi tải trực tiếp: logo `scale 0 → 1` 1.5s `power4.out` tại 0; mục nav `y -150 → 0` 1.5s `power4.out` stagger 0.1 tại 0.3s; hamburger `scaleX 0 → 1` 1s `power4.out` tại 1.5s. Chuyển route mềm giữ header, không chạy lại |
| Collapse | `scrollY > 100`; transform `1s cubic-bezier(0, 0, .1, .99)`; nền `0.3s ease-out`. Logo đổi `170 × 67.5` sang `125 × 49.6` tức thì ở frame đầu, không scale mượt |
| Ẩn/hiện | Vùng giữa trang `0.5 × vh` tới cách đáy `1.25 × vh`, đi quá 150px; `translateY(-100%)`. Ngoài vùng hiện ngay; không đọc chiều cao hero. Ví dụ trang cao 1960px ở `1440×900`: vùng ẩn từ 450 tới 835px |
| Pointer reveal | `mousemove.screenY <= 350` hiện header đang ẩn, không expand. Touch không có: header về khi đi lên quá 150px hoặc ra khỏi vùng giữa |
| Đổi tone | Ba tween cùng lúc, mỗi cái `0.3s expo.out`: fill logo, màu link nav, nét hamburger. Section có class `fn_headerBlanco` gọi `header-blanco` (offset `95%, 5%`): vào thì trắng, ra thì ink. Chuyển route ép `#2f2f2f` |
| Underline nav, filter, menu | Nghỉ `scaleX(0)` origin phải; hover hoặc đang chọn `scaleX(1)` origin trái; `0.3s cubic-bezier(.4, 0, 0, 1)` |
| Hamburger | Hover: dòng trên và dưới `scaleX(.5)`, dòng giữa `scaleX(2)`; nhấn: vùng bấm `scale(.8)`; `0.3s ease-out` |
| Mục đang chọn | Sau mỗi route, bỏ hết `selected` rồi chọn lại theo data attribute của trang mới, cả nav và full menu |

## Route

- Veil `#transitionDiv` phủ toàn màn hình, `z-index: 999` (dưới header 1000),
  không có logo. Body thêm class `--transitioning` trong lúc chuyển.
- Rời trang: đóng menu và nút hẹn, header về ink, hủy smooth scroll; veil
  `opacity 0 → 1` trong `0.75s power4.inOut`.
- Vào trang: khởi tạo lại smooth scroll; veil `1 → 0` trong `1s power4.inOut`.
- Chỉ chờ HTML, không chờ media; fetch chậm thì veil giữ opacity 1. Đo live
  trang chủ sang Interior Design: khoảng 1.73s (lên 0.75s, giữ trắng lúc đổi
  nội dung, xuống 1s).
- Barba timeout 15000ms, không cho chuyển chồng, không prefetch;
  `history.scrollRestoration = "manual"`, Back/Forward trả về vị trí scroll cũ.
  Link neo cuộn với offset -50px.

## Full menu

Lúc mở: trang phía sau `scale 1 → 0.9`, `0.7s power2.out`, origin
`50vw 50vh`; body thêm `menu-open`, smooth scroll dừng. Timeline GSAP chạy
`timeScale 1.15`:

| Thứ tự | Phần | Thông số | Vị trí |
| ---: | --- | --- | --- |
| 1 | Shutter bốn cột | `height 0 → 100vh`, `0.6s power4.inOut`, stagger 0.15 | 0 (phủ xong ở 1.05s) |
| 2 | Logo menu | `y -140`, `opacity 0 → 1`, 0.6s | `-=.6` |
| 3 | Ngôn ngữ | `y -20`, `opacity 0 → 1`, stagger 0.1, 0.6s | `-=.3` |
| 4 | Nút hẹn | `y -20`, `opacity 0 → 1`, stagger 0.1, 0.6s | `-=.6` |
| 5 | Nút đóng | `rotate 90° → 0`, `opacity 0 → 1`, 0.6s | `-=.45` |
| 6 | Khung nội dung | `opacity → 1`, 0.6s | `-=1.45` |
| 7 | Cột nhóm | `y -140`, `opacity 0 → 1`, stagger 0.02, 1s | `-=1.6` |
| 8 | Link trong nhóm | `y -20`, `opacity 0 → 1`, stagger 0.03, 0.6s | `-=1` |

- Phần đầu và nhóm dùng `expo.out`. Vị trí `-=x` là lùi x giây so với điểm
  cuối hiện tại của timeline, nên chữ bắt đầu hiện khi shutter còn đang chạy
  (logo khoảng 0.45s trước khi chia `timeScale`; suy luận từ bảng). Trường
  Thịnh đổi chỗ này: chữ chỉ hiện sau khi shutter phủ xong ở 1.05s, xem
  [Motion](motion.md#full-menu).
- CSS chạy song song từ lúc mở: lớp tối `opacity 0 → 0.4`, `0.6s ease-out`,
  không delay; divider phần đầu mở sau 0.7s; divider nhóm 1 tới 4 delay 0.9,
  1.1, 1.3, 1.5s; nhóm 5 tới 8 delay 1.2, 1.4, 1.6, 1.8s.
- Đóng: timeline reverse `timeScale 2.25`; trang phía sau về `scale 1` sau
  delay 0.85s, `0.7s power2.out`; lớp tối chờ 0.85s rồi mờ trong 0.6s; smooth
  scroll chạy lại.
- Hover: hai nét nút đóng xoay 90°; link nhóm, thương hiệu, ngôn ngữ có
  underline `scaleX 0 → 1` (3px, cách baseline 4px); nút hẹn trong menu không
  đổi khi hover.

## Hero

- Zoom media: wrapper `.slide-animate-super-zoomout.longTransition`,
  `scale 1.2 → 1.005`, `2.5s ease`. Class in-view được thêm ngay sau khi nội
  dung trang mount; thời lượng không phụ thuộc ảnh hay video tải xong. Đo trên
  Kitchens, Interior Design, About ở `390×844`, `768×1024`, `1440×900`.
- Tiêu đề hero dùng word reveal, kicker dùng reveal trượt và mờ chung (bảng
  dưới). Scroll cue ở [Hero Espacio](reference-espacio-hero.md#scroll-cue).

## Reveal khi scroll

| Kiểu | Thông số |
| --- | --- |
| Chung (`.is-inview`) | `opacity 0 → 1`, `0.6s cubic-bezier(0, 0, .26, 1)`; biến thể trái, phải, lên, xuống trượt 60px; zoom từ `scale .9`, `1.1` hoặc `1.2`; delay mặc định 0.3s |
| Class delay | `.delay` 0.3, double 0.6, triple 0.9, quadruple 1.2, quintuple 1.5, sextuple 1.8; `noDelayMobile` bằng 0 trên mobile |
| Line reveal | Tách dòng, mỗi dòng trong khung `overflow: hidden`; `y 2em → -0.1em`, `1.9s power4.out`, stagger 0.1; chỉ chạy một lần |
| Word reveal | `opacity 0 → 1`, `1s expo.out`, stagger 0.2; slide trước reset cùng nhịp |
| Facts | Delay thủ công 0, 0.15, 0.30, 0.45s (tới 0.75s ở trang dài) |
| Phụ đề portal | `opacity 0.3s ease-out`, delay 0.3, 0.6, 0.9s theo cột |
| Nhóm filter Projects | Delay 1.3s, `y 20 → 0`, `opacity 0 → 1`, `1s expo.out`, stagger 0.15; chỉ khi vào trang, không chạy lại khi đổi filter |

Năm điểm gọi theo scroll: đổi tone header, line reveal, word reveal, dừng
autoplay slider, tải video lười.

## Card và filter

- Ảnh card: `opacity 0 → 1`, `0.6s ease-out`, một lần; lazysizes tải trước
  khi ảnh tới viewport.
- Filter: card bị loại `display: none` tức thì; card còn lại Masonry
  `transform 0.4s ease`, delay 0, không stagger; chiều cao grid đổi tức thì,
  transform inline xóa sau khoảng 420ms. "Xem tất cả" dùng cùng nhịp.
- Sau khi bấm filter, trang cuộn về grid với offset -270px desktop, -100px
  mobile.

## Hover

| Phần tử | Espacio |
| --- | --- |
| Card dự án | Ảnh `scale 1 → 1.15` `0.6s ease-out`; caption `opacity 0 → 1`; underline `0.3s cubic-bezier(.4, 0, 0, 1)`; không có tương đương bàn phím |
| Card liên quan | Ảnh `1.15` 0.6s; caption `opacity 0 → 1` `0.3s ease-out` trên desktop, luôn hiện ở `<= 960` |
| Portal, banner CTA | Ảnh `scale 1 → 1.1` `0.6s ease-out`; underline tiêu đề; mũi tên trượt 12.5% |
| Card news | Ảnh `scale 1 → 1.2`; underline tiêu đề; CTA `opacity 0 → 1` |
| Footer | CONTACT có underline; ảnh Instagram `opacity 1 → 0.4`; nút gửi newsletter trượt từ x -15 về 0 |
| Nút hẹn nổi | Fixed cách mép 35px (25 ở `<= 1200`), cao 47, padding 9, viền 2, icon 25 kèm chữ; hover desktop đảo đen sang trắng; X `1s cubic-bezier(.63, 0, .08, 1)`; mobile thành icon lịch 35px; chỉ hiện ở viewport đầu và 1.75 viewport cuối |

## Scroll, carousel, video

- Smooth scroll Locomotive trên desktop (speed, direction, bàn phím bật; lerp
  mặc định); mobile scroll native. Kéo scrollbar thì `user-select: none`, còn
  lại chữ chọn được bình thường.
- Gallery Swiper: speed 500ms, slide rộng tự do, gap 20 (10 trên mobile nhỏ),
  cuộn chuột theo trục, cursor grab, lazy 3 ảnh trước và sau, bullet; không bật
  nút prev/next. Autoplay dừng khi gallery ra khỏi vùng `90%, 33%` viewport.
- Rail liên quan: không dùng Swiper; cuộn ngang native, desktop trôi ngang
  theo scroll (`data-scroll-speed="4"`); cả rail trượt vào từ trái.
- Video Vimeo tạo iframe khi vào viewport; iframe tắt pointer events khi đang
  scroll.
- Marquee: keyframe `aniMarquee`, 40s ở footer, 30s ở marquee logo thương
  hiệu.

## Reduced motion

Source Espacio không tắt smooth scroll, autoplay hay phần lớn transition khi
`prefers-reduced-motion`; chưa kiểm trên site live. Trường Thịnh tự thêm nhánh
này, xem [Motion](motion.md#nguyên-tắc).

## Chú thích thuật ngữ

- **Timeline**: chuỗi tween GSAP chạy theo thời điểm định sẵn.
- **timeScale**: hệ số tốc độ của timeline; lớn hơn 1 là nhanh hơn.
- **Veil**: lớp phủ che trang khi chuyển route.
- **Shutter**: các cột phủ màn hình khi mở full menu.
- **Divider**: đường kẻ ngăn nhóm trong full menu.
- **Reveal**: hiệu ứng hiện phần tử khi vào viewport.
- **Smooth scroll**: scroll được nội suy bằng JavaScript thay vì native.
- **Lazy**: chỉ tải khi sắp cần.
