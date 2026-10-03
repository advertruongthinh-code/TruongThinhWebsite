# Pinterest: khung ảnh, mô tả và viewer

Đo trong browser đã đăng nhập ngày 2026-09-10 (desktop 1569 × 912 CSS px,
DPR 1) và 2026-09-11 (responsive, desktop và mobile emulation). Đây là
reference hành vi và hình học cho
[Advertising photo browse](../specs/advertising-photo-browse.md), không thay
[DESIGN](../../DESIGN.md) hoặc khóa frontend của Trường Thịnh. Section
responsive phân biệt số đo ổn định, công thức suy ra và giới hạn.

## Khung ảnh và phần mô tả

Đã mở năm pin trong cùng phiên, đọc DOM, inline style và computed style.
Các kích thước bên dưới là số đo ở viewport trên; không suy thành breakpoint
áp dụng cho mọi thiết bị.

| Pin | Intrinsic của ảnh chính | Ảnh hiển thị | Khối chính | Mô tả |
| --- | --- | --- | --- | --- |
| [Jewelry showroom](https://www.pinterest.com/pin/376683956346027604/) | 1569 × 2091 | 471,52 × 628,47 | 961,33 × 630,53 | Bên phải, khoảng 487,80 px rộng |
| [Candy wall](https://www.pinterest.com/pin/415949715605611575/) | 1569 × 2787 | 416,91 × 740,66 | 961,33 × 742,80 | Bên phải; ảnh căn giữa phần media rộng 471,53 px |
| [Pin ảnh ngang](https://www.pinterest.com/pin/621215342329320862/) | 1569 × 886 | 554,98 × 313,56 | 717 × 483,95 | Bên dưới ảnh |
| [Pin reference ban đầu](https://www.pinterest.com/pin/855965472944617021/) | 1569 × 2072 | 439,67 × 580,77 | 717 × 719,83 | Bên dưới ảnh |
| [Stockmann](https://www.pinterest.com/pin/322570392081230793/) | 1569 × 1569 | 471,53 × 471,53 | 961,33 × 583,59 | Bên phải; ảnh vuông căn giữa theo chiều dọc |

Ở biến thể hai phần, `closeup-body-style` dùng flex theo hàng. Phần media
và thông tin có bề rộng gần bằng nhau. Media dùng aspect ratio intrinsic;
wrapper trong dùng masonry và căn giữa. Ảnh chính có vị trí absolute trong
wrapper giữ tỷ lệ bằng padding-bottom. Đây là cách dành chỗ trước khi ảnh tải,
không phải crop ảnh thành một tỷ lệ chung.

Chiều cao phần media và thông tin có trần `calc(90vh - 80px)`, bằng 740,8 px
ở phiên đo. Phần thông tin có min-height `calc(80px + 55vh)`, bằng 581,6 px.
Vì vậy ảnh rất dọc hẹp hơn phần media; ảnh vuông được căn giữa trong phần
media cao hơn chính ảnh. Không dùng chiều cao card để kết luận ảnh bị kéo dãn.

Ở pin Candy wall, mô tả mở đầu khoảng ba dòng. Đã nhấn `Xem thêm`: nội dung
mở rộng ngay trong phần thông tin; không tạo dialog hoặc điều hướng sang trang
khác. Container mô tả tăng chiều cao từ khoảng 142,39 lên 334,39 px trong
khung chính đang giữ chiều cao theo viewport.

**Giới hạn suy luận:** đã quan sát hai biến thể layout, nhưng chưa xác định
điều kiện chọn biến thể trong mã ứng dụng Pinterest. Pin dọc có cả mô tả bên
cạnh lẫn bên dưới, nên không được khẳng định Pinterest chỉ dựa vào aspect ratio.
Có thể liên quan cấu trúc nội dung hoặc thử nghiệm giao diện; đây là suy luận,
không là fact đã xác minh.

## Viewer toàn cửa sổ và các mức zoom

Đã thao tác mở, tăng hai nấc tới giới hạn, reset, giảm từng nấc và đóng trên
pin dọc Jewelry showroom và pin ngang. Dialog là lớp fixed phủ `100vw × 100vh`;
không quan sát việc chuyển sang chế độ fullscreen của trình duyệt/hệ điều hành.

| Trạng thái | Hành vi đã đo |
| --- | --- |
| Mở viewer | Ảnh giữ tỷ lệ và fit giữa màn hình. Pin dọc: 564 × 752 tại (502,5; 80). Pin ngang: 1200 × 678 tại (184,5; 117). |
| Tăng lần một | Ảnh phủ viewport theo tỷ lệ: ảnh dọc rộng 1569, cao 2091,28; ảnh ngang cao 912, rộng 1614,16. Phần vượt viewport được xem bằng pan. |
| Tăng lần hai | `scale(2)` trên mức phủ; `Zoom in` disabled, xuất hiện `Zoom out fully`. |
| Giảm một nấc | Trở về mức phủ, nút reset ẩn; giảm tiếp trở về fit và `Zoom out` disabled. |
| Reset tại giới hạn | Trở về fit và tâm ảnh, nút reset ẩn. Không tạo history entry. |

Zoom có ba trạng thái fit → cover → 2 × cover, không phải các bước phần trăm
cố định dựa trên fit. Suy ra công thức tương đương cho implementation riêng:
`coverScale = max(viewportWidth / fitWidth, viewportHeight / fitHeight)`.
Phải tính lại khi viewport đổi; không hard-code mức tối đa là 300% của fit.

Style trực tiếp khi zoom ghi transition 200 ms, easing `ease-in-out`, cho
transform, width và height. Wrapper pan dùng translate riêng, `transition: none`,
transform-origin ở tâm; ảnh chuyển từ cursor default sang grab khi phóng.
Không sao chép cách animate width/height vào Trường Thịnh nếu có thể giữ cùng
kết quả bằng transform, theo motion contract và yêu cầu hiệu năng hiện có.

DOM đặt `view-transition-name: image` ở cả vị trí ảnh detail lẫn ảnh trong
viewer; style của `::view-transition-group(image)` dùng
`cubic-bezier(0.55, 0, 0, 1)`. Đây là evidence về cơ chế liên tục giữa hai rect.
API đọc DOM của công cụ không hỗ trợ `document.getAnimations()`; thời lượng
chính xác của view transition mở/đóng chưa được xác minh. Không suy duration
mở/đóng từ duration 200 ms của zoom.

## Khối nhãn gợi ý trong grid

Ở pin Jewelry showroom, đã đọc khối `Ý tưởng bạn có thể thích` khi cuộn
xuống masonry: một masonry item tại khoảng (88; 1118), rộng 228,33 px, cao 583 px.
Khối có heading cao 24 px và năm anchor banner xếp dọc, mỗi banner khoảng
228,33 × 103 px, cách nhau 8 px. Ảnh nền dùng cover, nhãn trắng đặt giữa.
Pinterest dùng góc bo 16 px và liên kết sang tìm kiếm theo chủ đề.

Owner yêu cầu đưa kiểu UI này vào related masonry. Trường Thịnh dùng authored
tag registry và ảnh đại diện trong catalog, giữ hero khi lọc, không sao chép
nhãn hoặc đường dẫn Pinterest. Owner đã xác nhận chỉ ảnh nền ô nhãn được crop;
ảnh sản phẩm vẫn giữ toàn bộ nội dung. Contract triển khai thuộc R6 của spec.

### Đo thành phần gợi ý — 2026-09-11

Đo lại live pin Jewelry showroom trong Chrome đăng nhập, desktop viewport
1569 × 912 CSS px, DPR 1. Khối gợi ý rộng 228,33 px, cao 583 px; gồm năm
banner. Bảng dùng computed style và rect ổn định ở viewport này, không suy
thành quy tắc cho mọi viewport hoặc mọi biến thể Pinterest.

| Thành phần | Số đo Pinterest | Trường Thịnh trước correction cùng viewport |
| --- | --- | --- |
| Tiêu đề | 16 px, weight 700, line-height 24 px; căn giữa | Khoảng 47,07 px, line-height 46,13 px; chiếm hai dòng |
| Banner | 228,33 × 103 px | 348,5 × 158,41 px do aspect-ratio 2,2:1 |
| Chữ nhãn | 16 px, weight 700, line-height 24 px; căn giữa | 14 px, line-height 17,5 px |
| Khoảng cách | Tiêu đề tới banner đầu 8 px; giữa banner 8 px | Tiêu đề tới banner đầu 12 px; giữa banner 8 px |
| Đệm chữ banner | 12 px | 8 px ở hai cạnh ngang của vùng chữ |

Owner chọn giữ bề rộng trọn một cột Trường Thịnh, chỉnh thành phần bên
trong theo số đo trên: banner cao 103 px, chữ 16/24 px, khoảng cách 8 px.
Giữ Plus Jakarta Sans và góc vuông, không thu toàn bộ khối về 228 px hoặc
đổi số cột/gutter để mô phỏng bề rộng cột Pinterest.

Giới hạn cửa sổ hẹp cần xử lý trong delta spec: local viewport 320 × 740
cho khối gợi ý rộng 132,5 px. Canvas measureText với font đang tải, weight
700 và cỡ 16 px cho tiêu đề đầy đủ rộng khoảng 186,85 px; không thể vừa
giữ trọn chữ một dòng, cỡ chữ 16 px và khung một cột ở trường hợp này.
Đây là phép đo text, không phải screenshot proof cho copy responsive mới.
Owner đã chọn thống nhất tiêu đề **“Có thể bạn thích”** ở mọi state và mọi
chiều rộng; bản EN tương ứng **“You might like”**. Cùng phép đo font700/16px
cho bề rộng lần lượt125,57px và106,97px, vừa cột132,5px; không cần đổi nhãn
theo breakpoint hoặc hạ font ở mẫu này. Đây là target P1.3, chưa triển khai.
Các mẫu thu ngay sau resize Pinterest có thể còn transform hoặc chưa
mount khối gợi ý; không dùng mẫu chuyển tiếp làm số đo kích thước cuối.

## Control và giới hạn tái dùng

Nút đóng ở (16; 16). Zoom xếp dọc dưới phải: `+` trên `−`, cách nhau 8 px,
cách hai mép màn hình 16 px; mỗi nút 48 × 48 px. Tại giới hạn, reset xuất hiện
phía trên `+`, cùng cột. Background viewer rgba(0, 0, 0, 0.85) và blur 4 px.
Pinterest dùng radius 16 px cho control, 24 px cho ảnh viewer và 16 px cho card.

Trường Thịnh giữ nền trang sáng, Plus Jakarta Sans, media/card góc vuông,
caption, outer band/gutter/content cap, header/logo, VI/EN, stable photo ID,
history, một CTA và reduced motion đã chốt. Owner correction sau preview v6
yêu cầu control Advertising vuông, thay ngoại lệ tròn từng áp dụng cho viewer;
gallery khác giữ phạm vi riêng. Không nhập radius scale của Pinterest.
Không thêm lưu/chia sẻ/tài khoản/bình luận/lens, không sao chép font, SVG,
media hoặc nội dung sản phẩm Pinterest vào catalog.

Reference desktop không thay runtime proof responsive. Mỗi implementation
cần kiểm phone/tablet/desktop, đổi kích thước, touch, bàn phím, giới hạn pan,
reset, focus/scroll restoration và interruption. Đây không là claim kiểm trên
thiết bị vật lý hoặc pixel parity toàn Pinterest.

## Hover control tại 1329 × 912

Thao tác trực tiếp trên
[Arched Wall And Stairs](https://www.pinterest.com/pin/664069907599383230/):
đưa chuột ra/vào nút, mở viewer, tăng hai nấc,
hover reset, reset về fit, hover đóng rồi đóng về detail. Đọc DOM/CSS gắn với
các control nhìn thấy; không suy state từ ảnh chụp tĩnh.

- **Xem lớn hơn:** phần tử có `role=button`, không phải thẻ `button`.
  Khi gọn, khung 48 × 48 tại x=502,27; khi hover rộng 148,28 px tại x=401,98.
  Mép phải giữ x=550,27, chiều cao 48 px. Transition width 250 ms `ease-in`;
  nhãn từ opacity 0 tới 1 trong 250 ms `cubic-bezier(1,0,1,0)`, ra dùng
  `cubic-bezier(0,1,0,1)`. Text wrapper overflow hidden. Đây là mở khung và
  hiện chữ, không phải kéo dãn glyph hoặc phóng icon.
- **Zoom/reset:** 48 × 48; `+` tại (1265;792), `−` tại (1265;848), reset tại
  (1265;736) khi đạt max. Nền thường rgb(229,229,224), hover rgb(218,218,211).
  Không quan sát mở nhãn hoặc scale trong trạng thái hover đã lấy mẫu.
- **Đóng:** 48 × 48 tại (16;16); nền rgba(251,251,249,0.5) đổi thành
  rgba(246,246,243,0.5) khi hover. **Quay lại detail pin:** control 48 × 48
  tại (96;88), nền hover rgb(246,246,243).
- Wrapper control khai báo `transform 85 ms ease-out`, nhưng các mẫu hover
  đọc được `transform: none`; chưa có phép đo press/active. Không dùng khai
  báo này để khẳng định Pinterest scale nút khi hover. Không đo được duration
  đổi nền, nên duration bổ sung ở Trường Thịnh phải ghi là lựa chọn thiết kế.

Trường Thịnh tái dùng hành vi mở nhãn và phản hồi nền, giữ góc vuông cùng icon
tự thiết kế theo nét hiện hành. Nút về danh sách mở nhãn khi hover là lựa chọn
owner, không phải claim nút Quay lại của Pinterest cũng mở nhãn. Các mẫu này
chưa là chứng minh pixel parity, touch behavior hoặc implementation mới.

## Back và hai kiểu trình bày

Tại 1329 × 912: hai pin [khung vòm thứ nhất](https://www.pinterest.com/pin/732468326941307039/)
và [thứ hai](https://www.pinterest.com/pin/963277807823575570/) dùng kiểu ảnh
căn giữa, thông tin bên dưới (khối 719,59 × 751,86 px; ảnh 736 × 1308 hiển thị
326,78 × 580,73 px tại (284,39;145)). Candy wall và Jewelry showroom dùng khối
rộng 964,80 px, mô tả bên phải (ảnh 416,91 × 740,66 và 473,25 × 630,78 px).
Có bằng chứng cho hai kiểu; chưa xác minh tổng số template hoặc quy tắc chọn.
Hai ảnh dọc cùng tỷ lệ vẫn có thể thuộc hai kiểu; aspect ratio không phải
thuật toán chọn template.

Back 48 × 48 px tại (96;88), `position: fixed`, không đổi vị trí khi cuộn,
không có trong masonry; từ related pin quay lại pin trước, từ điểm vào về masonry.
Contract Back/navbar riêng của Trường Thịnh thuộc photo browse spec.

## Responsive: quan hệ khối detail, ảnh, mô tả và grid — 2026-09-11

Owner xác nhận Chrome đã đăng nhập. Đo trực tiếp Jewelry showroom trên
dải cửa sổ 320–2560px, gồm các mẫu 749/750/751 và 959/960/961px của
Trường Thịnh; bổ sung chiều cao 600/912/1200px tại cùng width1569.
Đổi kích thước rồi đọc DOM/computed style; các số đo chính dưới đây dùng
lượt chờ 1.400ms và kiểm hình native, không lấy vị trí card giữa animation.
Đối chiếu thêm Candy wall, Stockmann, pin khung vòm 732468326941307039 và
pin ngang 621215342329320862 tại 1569×912 và 2560×1440.

### Khối tổng là reservation trong cùng masonry grid

`closeup-body-style` nằm trong một `[data-grid-item]` position absolute.
Các card xung quanh dùng chung parent relative và translateX/translateY;
không phải một sidebar ảnh độc lập cao bằng detail. Masonry chừa toàn bộ vùng
khối chính, lấp cột bên phải từ cùng top, rồi tiếp ảnh dưới vùng đã chừa.
Số đo Jewelry tại 1569×912: khối y80, cao630,53; bốn card dưới bắt đầu
y727, tương ứng reservation làm tròn631px cộng gap16px.

Gọi C là bề rộng card một cột và S là số cột khối detail chiếm. Trong các
mẫu desktop đã đo, gap16px và `detailWidth = S*C + (S-1)*16`.

| Cửa sổ CSS px | Số cột toàn grid | Cột của detail Jewelry | Khối detail W×H | Card một cột rộng |
| --- | --- | --- | --- | --- |
| 1024×768 | 3 | 3 | 905×592,98 | 291 |
| 1280×720 | 4 | 4 | 1161×570 | 278,25 |
| 1329×912 | 5 | 4 | 964,80×632,84 | 229,20 |
| 1440×900 | 5 | 4 | 1053,59×692,03 | 251,40 |
| 1569×912 | 6 | 4 | 961,33×630,53 | 228,33 |
| 1920×1080 | 7 | 4 | 1022,28×676 | 243,57 |
| 2000×900 | 8 | 4 | 932,50×611,31 | 221,13 |
| 2400×900 | 9 | 5 | 1260,11×732 | 239,22 |
| 2560×1440 | 10 | 5 | 1212,50×874 | 229,70 |

Vì đổi số cột, cửa sổ rộng hơn có thể làm khối detail hẹp lại: 1440→1569px
làm 5→6 cột và detail1053,59→961,33px. Không phải một phần trăm viewport
cố định. Trong phiên desktop này masonry width là viewport trừ phần nav,
scrollbar và padding; không chuyển hằng số trừ103px sang Trường Thịnh.

**Suy luận từ mẫu, chưa trích được logic chọn span:** số cột gần khớp
`floor(gridWidth/236)`; Jewelry split khớp
`S = min(N, max(4, ceil(N/2)))` trong N3–10 đã đo. Hai pin stacked chỉ
chiếm ba cột ở cả N6 và N10. Đây chưa là thuật toán công bố của Pinterest;
không áp một công thức span cho mọi template hoặc content module.

### Ảnh và mô tả trong kiểu split

Ở 1569×912, annotation1 là khối961,33×630,53; annotation2 là ảnh
471,52×628,47; annotation3 là vùng mô tả487,80×628,53px. Hai phần chia
gần một nửa chiều rộng, không phải đúng50/50; mô tả có padding16px hai bên.
DOM xác nhận flex theo hàng, media width100%, thông tin width100% và
flex1 1 auto; flex shrinking cùng padding quyết định bề rộng cuối.

Inline style đã xác minh: `max-height: calc(90vh - 80px)` cho media và
thông tin; thông tin có `min-height: calc(55vh + 80px)`. Media giữ tỷ lệ
ảnh và căn giữa khi không lấp được phần không gian tương ứng.

| Cùng width1569, đổi chiều cao | Trần media/thông tin | Sàn thông tin | Khối tổng cao | Ảnh hiển thị |
| --- | --- | --- | --- | --- |
| H600 | 460 | 410 | 462 | 345,08×459,94 |
| H912 | 740,8 | 581,6 | 630,53 | 471,52×628,47 |
| H1200 | 1000 | 740 | 742 | 471,52×628,47, căn giữa dọc |

Vì thế khung có thể cao hơn ảnh khi mô tả đạt min-height, dù nội dung ít.
Ảnh vuông Stockmann tại1569×912 là471,53×471,53 trong khối cao583,59px;
ảnh rất dọc Candy wall là416,91×740,66 trong vùng media rộng471,53px.
Không kéo ảnh vuông thành chữ nhật hoặc crop ảnh dọc để lấp khung.

### Kiểu stacked và mobile không dùng cùng quy tắc chiều cao

Hai pin stacked ở desktop1569×912 cùng khối rộng717px, tức ba cột.
Pin khung vòm có media326,80×580,86, mô tả cùng rộng326,80 và nằm dưới;
pin ngang có media555×312,95, mô tả cùng rộng555. Toolbar ở trên. Ở2560px,
khối vẫn ba cột, rộng721,09px; không đổi thành span5 như Jewelry split.
Chiều cao phụ thuộc ảnh, toolbar và phần thông tin đang thực sự hiện.
Số đo có thể đổi khi module bình luận tải thêm, không coi chiều cao lần đầu
là một constant. Cùng ảnh dọc có cả split và stacked: ratio chưa chứng minh
được điều kiện chọn template gốc.

Trong desktop UA, Jewelry chuyển sang xếp dọc ở mẫu860/879/881px, trở lại
split ở900px. Chưa xác minh exact breakpoint; số đo sát nhau khi resize có
debounce, không suy881px là ngưỡng CSS. Desktop UA thu xuống320–430px còn
tràn ngang và giữ sidebar desktop, nên không dùng mẫu đó thay mobile web.

Đã đổi sang Android Chrome mobile UA/touch và reload, không tái dùng kết
quả signed-out. Mobile có DOM `closeup-body-portrait`, ảnh trên, thông tin
dưới, related bắt đầu sau cả khối. Inline `max-width:600px` đã đọc được:

| Cửa sổ mobile CSS px | Khối chính W | Ảnh W | Cách trình bày |
| --- | --- | --- | --- |
| 320×568 | 304 | 296 | Xếp dọc |
| 390×844 | 374 | 366 | Xếp dọc, related hai cột bên dưới |
| 820×1180 | 600 | 592 | Khối căn giữa, related bên dưới rộng hơn khối |

**Suy luận tương đương của mẫu mobile portrait:**
`bodyWidth = min(viewportWidth - 16, 600)`, imageWidth là bodyWidth trừ8px.
Không sao chép outer padding này vào Trường Thịnh khi token gutter đã khóa.
Mobile landscape/width1024 trong phiên emulation chuyển sang DOM
`closeup-body-landscape` nhưng hero có rect0×0, screenshot không hiện ảnh;
ghi là mẫu bất thường, không dùng làm chuẩn. Khi chỉ resize mobile320 từ
layout rộng, từng có innerWidth378; reload lại xác minh clientWidth,
visualViewport và innerWidth cùng320. Không dùng mẫu transient đó để suy
viewport formula. Metadata ratio của wrapper mobile còn lệch khoảng0,17%
so với ảnh tải được; Trường Thịnh vẫn phải dùng intrinsic ratio chính xác.

Raw observation giữ tại
`.tmp/orchestration/advertising-p13-discovery-20260910/pinterest-responsive-20260911.json`.
File chứa cả lượt sweep ban đầu và mẫu bất thường có ghi giới hạn; không
coi mọi row là PASS. Đây là desktop/mobile browser emulation, không phải
test mọi thiết bị vật lý, Safari native hoặc toàn bộ template Pinterest.

Kết quả này bổ sung reference, chưa thay contract layout Trường Thịnh.
Khi áp dụng phải giữ font, góc vuông, outer band/gutter/content cap, ảnh
intrinsic không crop, organic stagger, CTA và Espacio motion đã khóa. Chưa có
quyết định dùng device-UA branching hoặc cách chọn split/stacked mới.

### Trạng thái nút viewer

Pin 376683956346027604 (2026-09-11): ở fit, Zoom out `aria-disabled=true`,
SVG fill rgb(145,145,140); ở max, Zoom in cùng màu và disabled, xuất hiện
Zoom out fully; icon dùng được màu đen. Màu nền/hover/active của TT là lựa
chọn thiết kế, không phải số đo Pinterest 1:1.

## Chú thích thuật ngữ

- **Intrinsic**: tỷ lệ/kích thước của nội dung ảnh, trước khi trình bày trong layout.
- **Fit**: hiển thị trọn ảnh trong vùng nhìn ban đầu.
- **Cover**: giữ tỷ lệ và phóng đủ phủ cả chiều ngang lẫn chiều dọc viewport.
- **Pan**: dịch ảnh đã phóng để xem vùng nằm ngoài viewport.
- **View transition**: chuyển liên tục giữa hai trạng thái hiển thị của cùng ảnh.
- **Reservation**: vùng masonry dành cho khối lớn; card khác xếp ngoài vùng này.
- **UA**: chuỗi nhận diện trình duyệt, có thể làm website trả giao diện khác.
- **Transient**: trạng thái giữa chuyển động hoặc trước khi bố cục ổn định.
