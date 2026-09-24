# Audit runtime navbar Espacio ngày 2026-08-27

- Trạng thái: `REFERENCE CONFIRMED`; chưa phải kết luận parity với Trường Thịnh.
- Phạm vi: navbar dùng chung trên toàn bộ URL tiếng Anh có trong sitemap live,
  các breakpoint ảnh hưởng header/full menu và hai nhóm input touch/mouse.
- Không dùng Computer Use hoặc Wrangler. Playwright chạy matrix lặp lại;
  Chrome DevTools xác minh source, geometry và physical keyboard path.

## 1. Kết quả chính

| Chỉ số | Kết quả |
| --- | ---: |
| URL tiếng Anh lấy từ sitemap live | 180 |
| URL trả HTTP 200 | 141 |
| URL trả HTTP 404 | 39 |
| Route family | 14 |
| Runtime row | 556 |
| Behavioral probe đạt | 555 |
| Behavioral probe cần diễn giải | 1 |

`555/556` chỉ là kết quả năm predicate class-state của navbar. Nó không phải
HTTP pass, accessibility pass, full-menu pass hoặc parity pass. Runner giữ
`status` độc lập; báo cáo này loại 106 row sinh từ 39 URL HTTP 404 khỏi tập
subpage live hợp lệ.

Row còn lại là `/en/brands/brand-espacio-home-design` tại `1440x900`: một
`PageDown` làm header `collapsed` nhưng chưa giữ `oculto`. Ba lần DevTools lặp
lại cho cùng kết quả. Trang chỉ cao `1960px`, nên vùng auto-hide hợp lệ chỉ từ
`450px` đến dưới `835px`; một phím PageDown có thể nhảy qua phần lớn vùng này.
Đây là `probe-inconclusive` của input thô, không được ghi là product defect hoặc
behavior pass.

## 2. Freshness và provenance

| Resource live | HTTP | Bytes | SHA-256 | Last-Modified |
| --- | ---: | ---: | --- | --- |
| `/sitemap.xml` | 200 | 74.393 | `1cc81e742feff73e324770d6f12fa5c8d888a3258c79733ddd3411968c7b0d66` | `2024-07-10 14:12:50 GMT` |
| `/js/main.min.js?v=0.021` | 200 | 345.871 | `91f971d6f6a2f9829660f9422789ed6fb311fa915040820d16dd192ecf6b064c` | `2026-07-10 11:37:46 GMT` |
| `/css/main.min.css?v=0.021` | 200 | 88.212 | `b3cb9abf01889550121da4ebd11513ec4d7cc746f4a2672ba3d76871451c1296` | `2026-07-10 11:37:39 GMT` |

Hai hash bundle live khớp byte-for-byte với archive local
`research/reference-site/archive/site/js/main.min.q-2ffef9c93cd8.js` và
`research/reference-site/archive/site/css/main.min.q-2ffef9c93cd8.css`.
Vì vậy source contract trích từ archive vẫn current tại thời điểm đo. Sitemap
cũ hơn bundle hai năm và chứa 39 URL stale trả 404.

Raw matrix:
`research/reference-site/runtime-evidence/espacio-navbar-2026-08-27/matrix.json`.
Artifact có timestamp `2026-08-27T01:58:41+07:00`, runner SHA-256
`a787b03111a057cc2bd398fc4a0bca396756cfa64827ee46ba3c7de9b97764e0`.
Thư mục raw evidence bị ignore theo lifecycle của repo.

## 3. Coverage route và breakpoint

Matrix gồm 360 row toàn route: mỗi URL chạy `390x844 touch` và
`1440x900 mouse`. Mười bốn route family đại diện chạy thêm 196 row tại 14 mode
không trùng, tạo tổng 556 row.

Đây là thiết kế tách hai trục: mọi URL được probe ở cả touch/mouse, còn mọi
breakpoint được probe trên từng route family. Bundle JS/CSS live và header shell
giống nhau trên toàn response đã đo. Matrix không phải tích Descartes
`180 URL × 16 mode = 2.880 row`; vì vậy không dùng báo cáo này để tuyên bố mọi
cặp URL/viewport riêng lẻ đã chạy runtime.

| Nhóm width/input | Viewport đã đo |
| --- | --- |
| Phone touch | `320x844`, `390x844`, `578x900` |
| Tablet touch | `750x900`, `751x900`, `768x1024`, `960x900`, `961x900`, `1023x900` |
| Laptop/desktop mouse | `1024x900`, `1200x900`, `1201x900`, `1440x900`, `1599x900`, `1600x900`, `1920x1080` |

| Route family | URL | HTTP 200 | HTTP 404 |
| --- | ---: | ---: | ---: |
| `brands-detail` | 53 | 44 | 9 |
| `brands-index` | 1 | 1 | 0 |
| `contact` | 1 | 1 | 0 |
| `home` | 1 | 1 | 0 |
| `legal` | 3 | 3 | 0 |
| `news-detail` | 17 | 12 | 5 |
| `news-index` | 1 | 1 | 0 |
| `outlet-detail` | 41 | 18 | 23 |
| `outlet-index` | 5 | 5 | 0 |
| `page` | 19 | 18 | 1 |
| `projects-detail` | 30 | 29 | 1 |
| `projects-index` | 1 | 1 | 0 |
| `showrooms-detail` | 6 | 6 | 0 |
| `showrooms-index` | 1 | 1 | 0 |

CSS live còn có media query aspect ratio `16/9`, nhưng rule này không target
header hoặc full menu. Rule navbar phụ thuộc width; logic scroll phụ thuộc
viewport height. Vì vậy coverage được tổ chức theo breakpoint, height và input
capability thay vì theo tên model thiết bị.

## 4. Geometry header theo width

| Width | Header top | Header collapsed | Bố trí nav chính |
| --- | ---: | ---: | --- |
| `<=750px` | `72.59375px` | `70.640625px` | Link chính ẩn; hamburger giữ lại |
| `751–960px` | `132.78125px` | `128.78125px` | Link chính chia hai hàng |
| `961–1200px` | `85.390625px` | `81.390625px` | Link chính một hàng |
| `>1200px` | `102.515625px` | `81.390625px` | Link chính một hàng |

Full menu dùng bốn cột trên `1200px`, ba cột tại hoặc dưới `1200px`, hai cột
tại hoặc dưới `960px` và một cột tại hoặc dưới `578px`. Đây là source contract
chung; matrix xác nhận mọi response đều có cùng bundle JS/CSS và cùng header
shell.

### 4.1. Desktop nav link giữa expanded và sticky

Chrome DevTools đo lại live homepage sau fresh reload tại sáu cạnh breakpoint.
Mỗi width lấy state đầu trang và state `collapsed oculto` sau physical
`PageDown`. Năm link giữ nguyên cạnh trái, width và computed typography; delta
lớn nhất của `left` và width đều `0px`.

| Width | `left` link đầu | `left` link cuối | Max delta `left` | Max delta width |
| ---: | ---: | ---: | ---: | ---: |
| `751px` | `200.5625px` | `520.0625px` | `0px` | `0px` |
| `960px` | `305.0625px` | `624.5625px` | `0px` | `0px` |
| `961px` | `203.34375px` | `727.28125px` | `0px` | `0px` |
| `1200px` | `322.84375px` | `846.78125px` | `0px` | `0px` |
| `1201px` | `277.8125px` | `791.75px` | `0px` | `0px` |
| `1440px` | `397.3125px` | `911.25px` | `0px` | `0px` |

Computed style của mọi sample giữ `font-family: silka-semibold`,
`font-size: 16px`, `font-weight: 400`, `letter-spacing: normal` và
`line-height: 22.4px`. `font-weight: 400` là giá trị computed của custom face
`silka-semibold`, không phải thay đổi weight giữa hai state. Báo cáo matrix cũ
đúng về width band và state class nhưng chưa đo atomic link geometry; mục này
bổ sung phần evidence còn thiếu.

## 5. Contract scroll và reveal chính xác

| State | Điều kiện live | Kết quả |
| --- | --- | --- |
| Expanded | `scrollY <= 100` | Bỏ `collapsed` |
| Collapsed | `scrollY > 100` | Thêm `collapsed` |
| Auto-hide down | `scrollY > 0.5 × viewportHeight`, còn cách đáy hơn `1.25 × viewportHeight`, và đi xuống hơn `150px` từ lúc đổi direction | Thêm `oculto` |
| Auto-reveal up | Cùng vùng giữa trang và đi lên hơn `150px`; ngoài vùng giữa thì reveal ngay | Bỏ `oculto` |
| Pointer reveal | `mousemove.screenY <= 350` | Thêm `forceShow`; không bỏ `collapsed` |

`oculto` dùng `translateY(-100%)`; `forceShow` dùng `translateY(0) !important`.
Header transition là `transform 1s cubic-bezier(0, 0, 0.1, 0.99)` và
`backgroundColor 0.3s ease-out`.

Không có điều kiện “một phần ba chiều cao hero tính từ dưới lên” trong source.
Mốc vùng giữa là một nửa viewport và không đọc hero height. Cảm giác mốc thay
đổi giữa các trang đến từ direction anchor, hành trình `150px`, page height và
độ lớn từng scroll event.

## 6. Khác biệt theo input và chiều dài trang

- Mouse có thêm pointer reveal ở vùng `screenY <= 350`; hành động này chỉ hiện
  navbar đang ẩn, không expand logo/header về trạng thái top.
- Touch không có hover/pointer reveal; navbar hiện lại sau hành trình scroll-up
  hơn `150px` hoặc khi ra khỏi vùng giữa trang.
- Trang quá ngắn không có khoảng giữa thỏa cả hai biên thì auto-hide là `N/A`,
  không phải pass hoặc fail.
- PageDown là probe thô và có thể nhảy qua vùng hợp lệ; wheel/touch scroll nhỏ
  phản ánh direction contract ổn định hơn.

## 7. URL 404 trong sitemap live

| Route family | URL HTTP 404 |
| --- | ---: |
| Brand detail | 9 |
| News detail | 5 |
| Outlet detail | 23 |
| Page top-level | 1 |
| Project detail | 1 |

Các URL này vẫn render error shell có header, nên class predicate có thể đạt.
Chúng không được dùng để tuyên bố coverage subpage live. Danh sách URL đầy đủ
nằm trong raw matrix theo `status=404`.

## 8. Local soft-navigation regression

Local Trường Thịnh dùng persistent header qua Barba. Trước bản vá, link vừa
được click vẫn giữ focus sau khi container trang đã đổi. Selector
`.site-header:focus-within` vì vậy tiếp tục ép `transform: translateY(0)` dù
logic scroll đã thêm cả `is-collapsed` và `is-hidden`. Đây là lý do navbar sai
sau soft navigation nhưng đúng lại sau F5.

Lifecycle chung nay release focus nằm trong header và xóa `forceShow` ở
`beforeLeave` cùng `pageshow`; state collapse/hide sau đó vẫn do scroll contract
quyết định. Focused Playwright trên source preview kiểm tra VI/EN cho cả
navigation vào Commercial và quay về Home: `4/4 PASS`. DevTools tại
`1440×900` xác nhận sau physical `PageDown`, logical scroll `900px`, header có
`is-collapsed is-hidden`, top bằng `-81.390625px`, height `81.390625px`, active
element không còn nằm trong header. Bản vá không đổi threshold, geometry,
typography hoặc timing của reference contract.

## 9. Giới hạn và cách dùng kết quả

- Báo cáo này đặc tả live reference navbar; chưa so local Trường Thịnh.
- Không nâng `555/556` thành `PASS`: một row còn inconclusive và 39 route stale.
- Full Cartesian `180 × 16` chưa chạy; coverage hiện tách all-route và
  breakpoint-by-family như mục 3, có source-hash chung để khóa behavior contract.
- Full-menu focus/Escape, reduced motion, route transition và frame timing vẫn
  dùng evidence lane riêng; không suy ra từ matrix class-state này.
- Khi triển khai local, phải giữ ba phần độc lập: collapse `100px`, middle-region
  hide/reveal theo direction `150px`, và pointer reveal chỉ trên mouse.

## Chú thích thuật ngữ

- **Behavioral probe**: thao tác hẹp để kiểm tra một số state cụ thể, không phải
  acceptance test toàn component.
- **Direction anchor**: vị trí scroll ghi lại khi hướng cuộn đổi.
- **Input capability**: khả năng touch, mouse hoặc keyboard của môi trường đo.
- **Probe-inconclusive**: phép đo chưa đủ để kết luận pass hoặc defect.
- **Stale URL**: URL còn trong sitemap nhưng current server không còn trả page
  hợp lệ.
