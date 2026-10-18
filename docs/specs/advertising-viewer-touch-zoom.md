---
title: Viewer Advertising theo cử chỉ tay
status: live
source:
  - src/site/advertising-products/photo-viewer.mjs
tests:
  - tests/site/advertising-viewer-touch.e2e.mjs
  - tests/site/advertising-photo-view.e2e.mjs
  - tests/site/advertising-photo-transitions.e2e.mjs
notion: https://app.notion.com/p/3f0332849a0e8178be65cd68d4de4b43
updated: 2026-10-10
---

# Viewer Advertising theo cử chỉ tay

## Mục đích

Khách xem ảnh công trình trên điện thoại hoặc máy tính bảng dùng viewer bằng
tay, như app Thư viện, không cần nút: chạm ảnh primary để mở, chụm hai
ngón, vặn hai ngón để xoay, kéo một ngón, chạm một lần hoặc chạm đúp để zoom, vuốt dọc hoặc
back để đóng. Spec này sở hữu thao tác chạm, zoom liên tục có nấc, xoay, cách ẩn
nút trên màn cảm ứng và back.
Morph, nút trên desktop, con lăn, phím và khóa cuộn giữ theo
[detail](advertising-detail.md#r9-viewer) và R9 ở đó.

## Hành vi

Ký hiệu: `s` là tỷ lệ ảnh so với mức vừa khung ở góc xoay hiện tại (R11). Ba nấc: Fit `s = 1`, Cover
`s = c` (ảnh phủ kín vùng nhìn, như hiện nay), Max `s = 2c`. Hai giá trị cách
nhau dưới 1% coi là bằng nhau. Mọi thao tác chạm chỉ áp dụng khi dialog đang
mở và không đang đóng.

### R1. Chụm hai ngón zoom liền mạch theo tay

Ngón thứ hai chạm xuống trong vùng ảnh của viewer (ảnh hoặc nền quanh ảnh) thì
bắt đầu pinch. Trong khi pinch, `s = s0 × d / d0` với `d` là khoảng cách hai
ngón, `s0`, `d0` lấy lúc bắt đầu. Điểm ảnh nằm dưới trung điểm hai ngón lúc bắt
đầu luôn nằm dưới trung điểm hiện tại, nên di hai ngón cũng kéo ảnh. Ảnh đổi
ngay theo tay, không animation. Pan vẫn kẹp trong giới hạn của tỷ lệ hiện tại
như R9; khi chưa chạm giới hạn pan, sai số anchor tối đa `1 CSS px`. Ngón thứ ba
trở đi bị bỏ qua.

```gherkin
Given viewer mở ở Fit trên điện thoại dọc
When hai ngón đặt cách nhau 100px rồi mở ra 200px
Then ảnh ở s = 2
And điểm ảnh dưới trung điểm hai ngón vẫn nằm dưới trung điểm, sai số ≤ 1 CSS px khi chưa chạm giới hạn pan
And trang nền không cuộn, visualViewport.scale vẫn là 1
```

### R2. Vượt giới hạn co giãn nhẹ, buông tay bật về

Khi `s` tính theo tay ra ngoài khoảng `[1, 2c]`, phần vượt chỉ còn một phần ba
và không quá 15% giới hạn (thấp nhất `0.85`, cao nhất `2c × 1.15`). Buông tay
(ngón cuối nhấc lên hoặc `pointercancel`) khi đang vượt thì ảnh về giới hạn gần
nhất trong `200ms ease-in-out`, cùng nhịp zoom của nút. Về Max thì giữ anchor
tại trung điểm lúc buông; về Fit thì pan về tâm. Buông trong khoảng thì ảnh
đứng yên tại chỗ.

```gherkin
Given viewer đang ở Max
When chụm mở thêm rồi buông
Then trong lúc giữ, s không vượt 2c × 1.15
And sau khi buông, s = 2c và trạng thái nút khớp Max
```

### R3. Kéo một ngón và chuyển giữa một, hai ngón

Một ngón kéo trên ảnh pan ảnh khi `s > 1`, như kéo chuột hiện nay; ngón di quá `10 CSS px`
(vùng chết) mới pan, rồi ảnh theo đúng độ dời từ chỗ chạm. Ở Fit, một
ngón vuốt dọc trên ảnh đóng viewer (R9); vuốt bắt đầu trên nền không đóng viewer (giữ L06). Đang kéo
một ngón mà ngón thứ hai chạm xuống thì chuyển sang pinch từ đúng transform
đang hiện, không nhảy. Đang pinch mà nhấc một ngón: nếu `s` trong khoảng thì
ngón còn lại kéo tiếp từ vị trí hiện tại, không nhảy; nếu đang vượt thì áp
dụng R2 và ngón còn lại bị bỏ qua tới khi nhấc.

```gherkin
Given viewer ở s = 1.5 và một ngón đang kéo ảnh
When ngón thứ hai chạm xuống rồi nhấc lên
Then transform ảnh không nhảy ở cả hai lần chuyển
```

### R4. Chạm một lần lên ảnh để zoom

Một lần chạm bằng touch lên ảnh, di không quá `10 CSS px` và không thuộc pinch
hay vuốt, đổi zoom ngay khi nhấc tay, không chờ lần chạm thứ hai. Chạm đúp
cũng chỉ đổi zoom một lần: lần chạm xuống trong `300ms` và `40 CSS px` từ lần
chạm trước bị nuốt, không pan, không vuốt, không đóng viewer kể cả khi rơi
vào nền. Ở Fit, ảnh
phóng tới Cover, anchor là điểm chạm. Ở mọi `s > 1`, ảnh về Fit và pan về tâm.
Chuyển động `200ms ease-in-out`. Chạm một lần lên nền vẫn đóng viewer. Chạm
không gây zoom trang của trình duyệt. Chuột trên desktop không đổi hành vi
hiện tại: click ảnh không làm gì, double-click không zoom.

```gherkin
Given viewer ở Fit trên điện thoại
When chạm một lần lên một góc ảnh
Then ảnh tới Cover, điểm ảnh dưới chỗ chạm giữ nguyên vị trí khi chưa chạm giới hạn pan
When chạm một lần nữa lên ảnh
Then ảnh về Fit, pan về tâm, viewer vẫn mở
When chạm đúp lên ảnh, lần hai lệch vài px
Then ảnh tới Cover một lần, không pan
When chạm một lần lên nền
Then viewer đóng
```

### R5. Nút, con lăn, phím và trạng thái dùng chung một tỷ lệ

Thay ba mức cố định bằng `s` liên tục; ba nấc chỉ còn là điểm dừng cho nút và
con lăn. `+` (và con lăn lên) tới nấc nhỏ nhất lớn hơn `s`; `−` (và con lăn
xuống) tới nấc lớn nhất nhỏ hơn `s`; Reset và middle-click về Fit. `+` disabled
khi `s` bằng Max; `−` và Reset disabled khi `s` bằng Fit. Phím mũi tên pan khi
`s > 1`. Reset còn đưa góc xoay về `0°` (R11). Trạng thái `zoomStatus` (`sr-only`, `aria-live`) ghi `round(s × 100)%`
khi thao tác kết thúc, không cập nhật từng frame lúc pinch. Anchor của con lăn
và chuyển động `200ms ease-in-out` giữ như R9.

```gherkin
Given pinch dừng ở s nằm giữa Fit và Cover
When bấm +
Then ảnh tới Cover
When bấm −
Then ảnh về Fit, − và Reset disabled
```

### R6. Resize, motion đang chạy và reduced motion

- Resize hoặc xoay máy: đang ở một nấc thì giữ nấc đó theo hình học mới; nằm
  giữa hai nấc thì giữ `s` và kẹp vào khoảng mới; pan kẹp lại. Góc xoay ảnh
  (R11) giữ nguyên.
- Đóng sau resize: nút mở bị đẩy khỏi màn hình thì trang cuộn tức thì cho nút
  về giữa ([detail R9](advertising-detail.md#r9-viewer)).
- Bắt đầu chạm hoặc kéo khi đang zoom bằng animation: lấy transform đang hiện
  làm điểm bắt đầu, không nhảy. Khi đang mở, ảnh tới ngay mức Fit rồi nhận thao
  tác. Đang đóng thì bỏ qua thao tác chạm.
- Reduced motion: pinch, xoay và kéo vẫn theo tay; bật về (R2), chạm (R4) và
  hít góc (R11) đổi tức thì, không animation.

```gherkin
Given prefers-reduced-motion: reduce và viewer ở Fit
When chạm một lần lên ảnh
Then ảnh tới Cover ngay trong frame kế tiếp, nút và trạng thái khớp Cover
```

### R7. Màn cảm ứng: chạm ảnh primary để mở

Màn cảm ứng là media query `(hover: none) and (pointer: coarse)`. Trên màn
này nút `Xem lớn hơn` ẩn khỏi mắt. Một lần chạm bằng touch lên khung ảnh
primary (di không quá `10 CSS px`) mở viewer bằng morph như
[detail R9](advertising-detail.md#r9-viewer). Chạm đúp cũng mở: lần chạm thứ hai
rơi vào viewer và bị nuốt như R4, ảnh giữ Fit. Primary đang là video thì chạm
không mở viewer. Khung
primary mang `touch-action: manipulation` để trình duyệt không zoom trang khi
chạm đúp. Desktop giữ nút, double-click chuột lên primary không mở viewer.

```gherkin
Given detail của một ảnh trên điện thoại dọc
When chạm một lần lên ảnh primary
Then viewer mở bằng morph, nút "Xem lớn hơn" không hiện, trang không zoom
When đóng rồi chạm đúp lên ảnh primary
Then viewer mở ở Fit, không zoom
```

### R8. Màn cảm ứng: nút viewer ẩn khỏi mắt

Trên màn cảm ứng nút đóng, reset, `+`, `−` của viewer ẩn khỏi mắt (kiểu
`sr-only`) nhưng vẫn trong cây trợ năng, nên TalkBack và VoiceOver vẫn mở,
zoom, đóng được; focus bàn phím (`:focus-visible`) thì nút hiện lại. Zoom chỉ còn bằng pinch (R1) và chạm (R4); về Fit bằng
chạm. Desktop giữ nguyên nút. Vì không còn nút hiện trên ảnh, Fit trên màn cảm ứng không chừa lề: ảnh chạm cạnh
màn hình theo chiều giới hạn, cả dọc lẫn ngang (owner 2026-10-10); desktop giữ lề `80px` trên dưới và `16px`/`64px` hai bên.

```gherkin
Given điện thoại ngang 915×412 cảm ứng
When chạm ảnh primary ngang 3:2 để mở viewer
Then ảnh ở Fit cao 412px, chạm mép trên và dưới
```

### R9. Vuốt dọc ảnh để đóng

Ở Fit, một ngón kéo trên ảnh, di quá `10 CSS px` theo phương dọc nhiều hơn
ngang, thì ảnh dịch dọc theo tay (`dy`) và nền viewer mờ dần: opacity
`1 − min(1, |dy| / (0.5 × chiều cao viewport))`. Buông tay khi `|dy|` từ `15%`
chiều cao viewport hoặc tốc độ cuối từ `0.5 px/ms` thì viewer đóng: ảnh morph
từ vị trí đang hiện về khung primary `250ms`, nền mờ tiếp từ opacity đang có.
Ảnh đang xoay (R11) thì morph đóng đưa góc về `0°` cùng lúc. Chưa đủ thì ảnh
và nền về chỗ `200ms ease-in-out`. Ngón thứ hai chạm xuống thì
bỏ vuốt, ảnh về chỗ ngay và bắt đầu pinch. Chỉ áp cho touch; kéo chuột ở Fit
vẫn không làm gì. Reduced motion: ảnh vẫn theo tay, đóng và về chỗ tức thì.

```gherkin
Given viewer mở ở Fit trên điện thoại
When vuốt ảnh xuống 30% chiều cao viewport rồi buông
Then viewer đóng, ảnh về khung primary, URL vẫn là detail
When mở lại và vuốt xuống 5% rồi buông chậm
Then ảnh về giữa, nền rõ lại, viewer vẫn mở
```

### R10. Back đóng viewer

Mở viewer thêm một entry lịch sử cùng URL (`history.pushState`). Router của
site (`motion.js`) hỏi viewer trước khi xử lý `popstate`. Back khi viewer mở (nút hoặc cử chỉ back Android, vuốt
mép trái hay nút back của Safari iOS, nút back trình duyệt desktop) chỉ đóng
viewer bằng morph, ở lại detail, không chạy chuyển trang. Đóng bằng cách khác
thì runtime gỡ entry đó bằng `history.back()` và nuốt `popstate` của nó, nên
back kế tiếp vẫn rời detail như cũ. Áp cho mọi thiết bị.

```gherkin
Given viewer mở trên detail
When bấm back
Then viewer đóng, URL vẫn là detail, scroll giữ nguyên
When bấm back lần nữa
Then rời detail về masonry như hiện nay
```

### R11. Vặn hai ngón để xoay ảnh

Trong pinch (R1), góc ảnh đổi theo góc đường nối hai ngón: `θ = θ0 + (α − α0)`,
`α` là góc đường nối, `θ0`, `α0` lấy lúc bắt đầu. Xoay chỉ bắt đầu khi
`|α − α0|` đạt `20°` trước khi `d / d0` ra ngoài `[1/1.2, 1.2]`; zoom đổi quá 20%
trước thì cả pinch đó chỉ zoom, không xoay. Khi đã xoay, góc tính từ ngưỡng:
`θ = θ0 + (α − α0) ∓ 20°`, nên ảnh không giật. Xoay cùng lúc với zoom,
quanh trung điểm hai ngón; điểm ảnh dưới trung điểm vẫn nằm
dưới trung điểm như R1. Buông tay (ngón cuối nhấc lên, `pointercancel`, hoặc
nhấc một ngón khi pinch kết thúc) thì góc hít về bội `90°` gần nhất (`0°`,
`90°`, `180°`, `270°`) trong `200ms ease-in-out`, cùng lúc với bật về R2. Ở
`90°` và `270°` Fit, Cover, Max và giới hạn pan tính theo ảnh đã đổi chiều rộng
và cao; `s` tính lại theo khung mới rồi áp R2 và kẹp pan. Góc giữ khi kéo một
ngón, chạm (R4) và resize; mỗi lần mở viewer bắt đầu ở `0°`. Chỉ áp cho touch.

```gherkin
Given viewer mở ở Fit trên điện thoại dọc với ảnh ngang
When hai ngón vặn 15° trong lúc chụm
Then ảnh không xoay
When hai ngón vặn 70° rồi buông
Then lúc giữ ảnh ở 50°, buông thì hít về 90° trong 200ms
And ảnh xoay vừa khung theo chiều mới, không cắt mép, viewer vẫn mở
When hai ngón vặn thêm 30° rồi buông
Then ảnh về lại 90°
When vuốt dọc ảnh để đóng
Then morph đóng đưa ảnh về khung primary ở 0°
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| DOM hook | `[data-advertising-photo-viewport]` | Nhận pointer cho pinch, xoay, kéo, chạm; giữ `touch-action: none` (`detail.css`) để trình duyệt không cuộn hay zoom trang trong viewer |
| DOM hook | `[data-advertising-photo-expanded-image]` | Ảnh đổi `transform: translate3d(panX, panY, 0) rotate(θ) scale(s)` |
| DOM hook | `[data-advertising-photo-zoom-in]`, `-zoom-out`, `-zoom-reset` | Nút theo nấc R5, disabled theo `s`; ẩn khỏi mắt trên màn cảm ứng (R8) |
| DOM hook | `[data-advertising-photo-expand]`, `[data-advertising-photo-close]` | Ẩn khỏi mắt trên màn cảm ứng (R7, R8) |
| DOM hook | `.advertising-photo-view__hero-frame` | Nhận chạm mở viewer (R7), `touch-action: manipulation` |
| CSS | `--advertising-viewer-backdrop-opacity` trên dialog | Opacity nền khi vuốt đóng (R9) |
| Hàm public | `TruongThinhAdvertising.handleViewerPopState()` | `motion.js` gọi đầu tiên khi `popstate`; `true` thì viewer đã xử lý Back (R10) |
| DOM hook | `[data-advertising-photo-zoom-status]` | `round(s × 100)%` khi thao tác kết thúc |
| Hàm public | `createAdvertisingPhotoViewer` | Giữ option; trả thêm `popState` (R10); chạm nghe trên khung của `heroImage` (R7) |

Pointer Events thuần, không thêm thư viện gesture. Page pinch ngoài viewer giữ
nguyên vì meta viewport không đổi. Xoay chỉ đổi `transform` của ảnh, không đổi
layout hay filter, để giữ [gate fps phone Android](../decisions/phone-frame-budget.md).

## UI

Không có giá trị hình ảnh mới: hít góc dùng lại nhịp zoom `200ms ease-in-out`, morph
đóng `250ms` và nút của [Viewer](../../design-system/components/Viewer/README.md).
Trên màn cảm ứng không còn nút hiện trên viewer và primary.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1–R11 | `node tests/site/advertising-viewer-touch.e2e.mjs`: Chromium `isMobile`, `hasTouch`, touch qua CDP `Input.dispatchTouchEvent`, dọc VI và ngang EN, reduced motion, chạm một lần, vặn xoay và hít góc, ngưỡng xoay 20°, vùng chết pan 10px, chạm đúp, double-click desktop, vuốt đóng, back |
| R5, R6 | `PHOTO_VIEW_CONTROLS_ONLY=1 node tests/site/advertising-photo-view.e2e.mjs`: nút, con lăn, middle-click, phím, resize trên Chromium, Firefox, WebKit |
| R3 (nền) | `CASE=viewer-backdrop-swipe-stays-open node tests/site/advertising-photo-transitions.e2e.mjs` |
| R1–R6 | phone Android thật: `DEVICE_CDP=http://127.0.0.1:9222 node tests/site/advertising-viewer-touch.e2e.mjs` sau `adb forward tcp:9222 localabstract:chrome_devtools_remote` và `adb reverse tcp:8787 tcp:8787`; mỗi lượt một tab mới, theo hướng máy đang cầm. Đạt 05/10/2026 trên SM-A057F, Chrome 154, dọc (2/2 lượt); R7 đến R10 đạt 06/10/2026, Chrome 154, dọc (2/2 lượt), kèm nút back phần cứng `adb shell input keyevent KEYCODE_BACK` (2/2) và vuốt `adb shell input swipe` 30% chiều cao; ngang trên máy thật chỉ khi đặt máy ngang (chưa chạy) |

## Gate còn mở


- Pinch và xoay hai ngón R11 chưa kiểm bằng tay thật trên phone Android (adb chỉ có một ngón; e2e phủ qua CDP touch);
  ngưỡng có thể chỉnh theo cảm nhận của owner trên demo. Owner.
- iPhone Safari chưa kiểm vì chưa kết nối thiết bị; WebKit desktop không thay
  bằng chứng iPhone.

## Chú thích thuật ngữ

- **Pinch**: chụm hoặc mở hai ngón để đổi tỷ lệ ảnh trong viewer, khác zoom trang của trình duyệt.
- **Hít góc**: khi buông tay, góc xoay tự trượt về bội 90° gần nhất.
- **Anchor**: điểm ảnh được giữ đứng yên trên màn hình khi đổi tỷ lệ.
- **Pan**: kéo dịch ảnh khi đang phóng to.
- **Nấc**: điểm dừng Fit, Cover, Max mà nút và con lăn nhảy tới.
- **Pointer Events**: API trình duyệt gộp chuột, bút, chạm thành một loại sự kiện.
- **CDP**: Chrome DevTools Protocol, điều khiển Chrome từ script để test.
- **Màn cảm ứng**: thiết bị không có hover và con trỏ thô, tức điện thoại, máy tính bảng.
- **Entry lịch sử**: một bước trong lịch sử trình duyệt mà nút back lùi qua.
- **CloseWatcher**: cơ chế Chrome cho nút back Android đóng `dialog` đang mở trước khi lùi trang.
