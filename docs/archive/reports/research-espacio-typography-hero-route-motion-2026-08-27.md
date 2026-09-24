# Đo typography, hero và route motion Espacio ngày 2026-08-27

## Phạm vi và ánh xạ

| Espacio | Trường Thịnh |
| --- | --- |
| `/en` | `/vi/`, `/en/` |
| `/en/kitchens` | `/vi/residential/`, `/en/residential/` |
| `/en/interior-design` | `/vi/commercial/`, `/en/commercial/` |
| `/en/projects` | `/vi/advertising-products/`, `/en/advertising-products/` |
| `/en/about-us` | `/vi/about/`, `/en/about/` |

Đo live bằng Chrome DevTools tại `390x844`, `768x1024` và `1440x900`.
Typography dùng Canvas `H` làm cap-height proxy, nên dấu tiếng Việt không tham
gia chiều cao mục tiêu. Không dùng Computer Use và không dùng Wrangler.

## Kết quả typography reference

| Vai trò | Mobile | Desktop | Ghi chú |
| --- | ---: | ---: | --- |
| Nav | ẩn | `16/22.4`, cap `11px` | `silka-semibold` |
| Scroll cue | `12.8/17.92`, cap `9px` | như mobile | uppercase |
| Home body | `19.2/26.88`, cap `14px` | như mobile | `silka-regular` |
| Home portal/banner title | cap `31–45px` | `64px`, cap `45px` | tùy card |
| Kitchens hero dòng 1/2 | cap `20/28px` | cap `64/78px` | `28/40px` mobile, `92/112px` desktop |
| Interior hero dòng 1/2 | cap `62/45px` | cap `78/78px` | responsive copy fit |
| Projects hero dòng 1/2 | cap `45/37px` | cap `78/78px` | hero không có background media |
| About hero dòng 1/2 | cap `25/23px` | cap `76/73px` | responsive copy fit |

Computed numeric weight của Espacio thay đổi theo named face và breakpoint,
không được copy trực tiếp. Trường Thịnh dùng equivalent local: body `500`,
display `600`, nav/label/caption `700`.

Owner override ngày 2026-08-27 chủ động tách khỏi Home body reference:
`#bang-chung h3` dùng responsive `16px → 20px` và đạt `20px` từ `1024px`;
body dùng `16px` ở mọi breakpoint. Runtime VI/EN tại `320px` và `1569px` có
cap-height tương ứng `12px → 15px` cho heading, `12px` cho body và overflow `0`.

## Hero và scroll cue

- DevTools đo lại live `/en/kitchens`, `/en/interior-design` và `/en/about-us`:
  wrapper `.slide-animate-super-zoomout.longTransition` dùng
  `scale(1.2) → 1.005`, duration cố định `2.5s` và computed easing `ease`.
  Class in-view/active kích hoạt transition sau khi container được mount; thời
  lượng không phụ thuộc tốc độ tải ảnh/video. Local chỉ transition `transform`
  để giữ cùng chuyển động nhưng không transition thừa mọi property.
- Residential, Commercial và About local dùng đúng một ảnh hero, chạy entrance
  một lần ở direct/F5 và soft route entry rồi dừng; không slideshow hoặc reverse.
  Home vẫn giữ carousel đã duyệt.
- Home reference dùng Vimeo; Trường Thịnh giữ carousel đã duyệt với drift
  `1.06 → 1` trong `5s`, cross-fade `1.6s` bắt đầu ở giây `4.2`.
- Scroll cue reference split từng glyph nhưng giữ khoảng trắng thành text node,
  nên whitespace không tham gia stagger. Bundle live và archive có cùng SHA-256
  `91f971d6f6a2f9829660f9422789ed6fb311fa915040820d16dd192ecf6b064c`:
  delay đầu `3s`, vào/ra `.4s`, stagger `.1s`, giữ `3s`, repeat delay `3s`.
  Bundle Espacio ghi `power2.Out/In` trong `stagger.ease`; tên viết hoa không
  được GSAP nhận làm easing nên phân bố thực tế là tuyến tính `100ms/glyph`.
  Local trước đó dùng tên hợp lệ `power2.out/in`, làm các glyph cuối bị dồn khi
  vào và các glyph đầu bị dồn khi ra. Local nay bỏ easing khỏi stagger, giữ
  `each: .1`, whitespace ngoài animated node và dùng word-spacing `0.1em`.
  DevTools source preview ở time-scale `2x` đo khoảng cách vào `46.9–58.3ms`
  và ra `46.9–70.5ms`; computed word-spacing là `1.28px/12.8px = 0.1em`.
  Opacity cue vẫn mờ sau `200px` trong `1s expo.out`.
- Bottom trong hero là `45px` desktop, `30px` tablet, `60px` mobile. Projects
  có hero `100vh - 50px`, nên viewport gap lớn hơn đúng `50px`.
- Trường Thịnh chủ động dùng button để click/tap xuống section kế tiếp theo
  quyết định owner; reference dùng `pointer-events:none`.

## Route transition và logo

Source live Espacio cho thấy Barba cover veil `0.75s power4.inOut` và reveal
`1s power4.inOut`. Transition chờ response HTML/XHR của route kế tiếp, không
chờ ảnh hoặc video hero. `colorHeader` dùng `.3s expo.out`; reference không có
logo nằm trong transition overlay.

Lỗi local là `updateHeader()` từng giữ tone mực suốt `body.is-transitioning`, nên
lockup đen cho đến hết reveal `1s`. Mốc destination-ready nay nằm ở
`beforeEnter`: tone đích bắt đầu dưới veil opacity `1`. Whole-lockup scale dùng
`overwrite:"auto"` để không huỷ color tween trên cùng anchor.

Contract owner mới áp dụng theo surface, không theo tên route: mỗi lần mark đi
vào nền trắng, kể cả direct/F5, route veil, sticky và Advertising Products,
mark có một painted state đen rồi chuyển đen → CMYK với tổng `1s`. Khi rời nền
trắng, mark chuyển CMYK → trắng cùng contract `1s`. Wordmark không tham gia
sequence màu. Hamburger vẫn đợi cụm logo hoàn tất entrance rồi mới chạy sequence.

Toàn bộ title và subtitle của brand lockup trong header/menu, 5 template và
VI/EN dùng `font-weight: 700`. Weight mới làm outline title rộng hơn baseline,
nên title dùng scale-X `0.994485` từ cạnh trái để giữ nguyên font-size, tracking,
`textLength`, chiều cao và width contract đã duyệt. Mark và motion không đổi.

## Evidence local current source

| Gate | Kết quả |
| --- | ---: |
| Route logo + scroll cue + typography VI/EN | `29/29` |
| Scroll cue uniform enter/exit, whitespace/gap, 5 route VI/EN + soft/history | `13/13` |
| Brand lockup weight `700`, bbox/header/menu, 5 route VI/EN | `25/25` |
| Logo surface direct VI/EN + sticky + hamburger | `4/4` |
| Portal hierarchy + editorial typography VI/EN, 4 viewport | `8/8` |
| Home hero copy + line gap VI/EN, `320/768/1569px`, cùng motion intro | `8/8` |
| Footer statement line gap, 5 route tại `390/1440px` | `10/10` |
| Hero direct/soft + single-media contract | `11/11` |
| Residential hero VI/EN + reduced motion | `12/12` |
| Commercial hero VI/EN + reduced motion | `12/12` |
| Brand header bbox/scale responsive | `10/10` |
| Reduced motion | `6/6` |
| Static site contract | PASS |
| Client logo asset contract | PASS |

Focused Home hero chạy bằng:

```powershell
$env:BASE_URL='http://127.0.0.1:8787'; $env:TT_E2E_REPORT_DIR='E:\TruongThinh-Website\.tmp\home-hero-typeset-green'; $env:TT_E2E_HERO_INTRO_ONLY='1'; node tests/site/site.e2e.cjs
```

Artifact truy nguyên là `.tmp/home-hero-typeset-green/latest.json`. Chrome
DevTools trên local `/vi/` tại `1569x912` xác nhận copy `Làm chắc` / `Làm khác`,
computed `margin-top: 7.0605px`, box gap `7.046875px`, ratio `0.0499`, horizontal
overflow `0`, console không có message và 40 request quan sát được đều HTTP 200.

Focused footer chạy bằng:

```powershell
$env:BASE_URL='http://127.0.0.1:8787'; $env:TT_E2E_REPORT_DIR='E:\TruongThinh-Website\.tmp\footer-line-gap-green'; $env:TT_E2E_FOOTER_ONLY='1'; node tests/site/site.e2e.cjs
```

Artifact truy nguyên là `.tmp/footer-line-gap-green/latest.json`. Chrome DevTools
trên local `/vi/` tại `1569x912` xác nhận `font-size: 70.605px`, computed
`line-height: 83.1929px`, extra line-height đúng `14px`, horizontal overflow `0`,
console sạch và 50 request quan sát được đều HTTP 200.

`qa:worker:static` không chạy được vì port Worker `8787` hiện không mở
(`ECONNREFUSED`); không khởi động Wrangler để đổi runtime owner.
Focused evidence này không nâng canonical Espacio parity khỏi `NOT PASS`.

## Chú thích thuật ngữ

- **Cap-height proxy**: glyph chuẩn dùng để ước lượng chiều cao thân chữ.
- **Named face**: file font riêng ánh xạ một kiểu/weight cụ thể.
- **Route veil**: lớp trắng che content khi chuyển route.
- **Destination-ready**: thời điểm HTML/container route kế tiếp đã sẵn sàng.
- **Current source**: source đang được test, không dùng snapshot cũ.
