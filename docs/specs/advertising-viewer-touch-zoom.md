---
title: Viewer Advertising zoom hai ngón, chạm đúp và cử chỉ
status: live
source:
  - src/site/advertising-products/photo-viewer.mjs
tests:
  - tests/site/advertising-viewer-touch.e2e.mjs
  - tests/site/advertising-photo-view.e2e.mjs
  - tests/site/advertising-photo-transitions.e2e.mjs
notion: https://app.notion.com/p/3f0332849a0e8178be65cd68d4de4b43
updated: 2026-10-06
---

# Viewer Advertising zoom hai ngón và chạm đúp

## Mục đích

Khách xem ảnh công trình trên điện thoại hoặc máy tính bảng zoom vào chi tiết
trong viewer bằng tay, như app Thư viện: chụm hai ngón, kéo một ngón, chạm đúp.
Spec này sở hữu thao tác chạm, zoom liên tục có nấc và việc màn cảm ứng
dùng cử chỉ thay cho nút.
Mở, đóng, morph, nút, con lăn, phím và khóa cuộn giữ theo
[detail](advertising-detail.md#r9-viewer) và R9 ở đó.

## Hành vi

Ký hiệu: `s` là tỷ lệ ảnh so với mức vừa khung. Ba nấc: Fit `s = 1`, Cover
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

Một ngón kéo trên ảnh pan ảnh khi `s > 1`, như kéo chuột hiện nay. Ở Fit, một
ngón kéo xuống đóng viewer (R7); kéo theo chiều khác không làm gì, vuốt bắt đầu
trên nền khi đang zoom không đóng viewer (giữ L06). Đang kéo
một ngón mà ngón thứ hai chạm xuống thì chuyển sang pinch từ đúng transform
đang hiện, không nhảy. Đang pinch mà nhấc một ngón: nếu `s` trong khoảng thì
ngón còn lại kéo tiếp từ vị trí hiện tại, không nhảy; nếu đang vượt thì áp
dụng R2 và ngón còn lại bị bỏ qua tới khi nhấc.

```gherkin
Given viewer ở s = 1.5 và một ngón đang kéo ảnh
When ngón thứ hai chạm xuống rồi nhấc lên
Then transform ảnh không nhảy ở cả hai lần chuyển
```

### R4. Chạm đúp

Hai lần chạm bằng touch trên ảnh, cách nhau tối đa `300ms` và `24 CSS px`, mỗi
lần di không quá `10 CSS px` và không thuộc pinch, là chạm đúp. Ở Fit, ảnh
phóng tới Cover, anchor là điểm chạm lần hai. Ở mọi `s > 1`, ảnh về Fit và pan
về tâm. Chuyển động `200ms ease-in-out`. Chạm một lần lên ảnh vẫn không làm
gì, chạm một lần lên nền vẫn đóng viewer. Chạm đúp không gây zoom trang của
trình duyệt. Double-click chuột trên desktop không đổi hành vi hiện tại.

```gherkin
Given viewer ở Fit
When chạm đúp lên một góc ảnh
Then ảnh tới Cover, điểm ảnh dưới chỗ chạm giữ nguyên vị trí khi chưa chạm giới hạn pan
When chạm đúp lần nữa
Then ảnh về Fit, pan về tâm, viewer vẫn mở
```

### R5. Nút, con lăn, phím và trạng thái dùng chung một tỷ lệ

Thay ba mức cố định bằng `s` liên tục; ba nấc chỉ còn là điểm dừng cho nút và
con lăn. `+` (và con lăn lên) tới nấc nhỏ nhất lớn hơn `s`; `−` (và con lăn
xuống) tới nấc lớn nhất nhỏ hơn `s`; Reset và middle-click về Fit. `+` disabled
khi `s` bằng Max; `−` và Reset disabled khi `s` bằng Fit. Phím mũi tên pan khi
`s > 1`. Trạng thái `zoomStatus` (`sr-only`, `aria-live`) ghi `round(s × 100)%`
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
  giữa hai nấc thì giữ `s` và kẹp vào khoảng mới; pan kẹp lại.
- Đóng sau resize: nút mở bị đẩy khỏi màn hình thì trang cuộn tức thì cho nút
  về giữa ([detail R9](advertising-detail.md#r9-viewer)).
- Bắt đầu chạm hoặc kéo khi đang zoom bằng animation: lấy transform đang hiện
  làm điểm bắt đầu, không nhảy. Khi đang mở, ảnh tới ngay mức Fit rồi nhận thao
  tác. Đang đóng thì bỏ qua thao tác chạm.
- Reduced motion: pinch và kéo vẫn theo tay; bật về (R2) và chạm đúp (R4) đổi
  tức thì, không animation.

```gherkin
Given prefers-reduced-motion: reduce và viewer ở Fit
When chạm đúp lên ảnh
Then ảnh tới Cover ngay trong frame kế tiếp, nút và trạng thái khớp Cover
```

### R7. Màn cảm ứng dùng cử chỉ thay cho nút

Màn cảm ứng là `(hover: none) and (pointer: coarse)`. Ở đó nút `Xem lớn hơn`,
nút đóng, `+`, `−`, reset chỉ còn cho trình đọc màn hình (ẩn khỏi màn, vẫn
trong cây truy cập và vẫn bấm được); chuột và bàn phím giữ nguyên như R5.

- Chạm đúp lên ảnh primary (cùng ngưỡng `300ms`, `24 CSS px` của R4) mở viewer
  như bấm `Xem lớn hơn`. Video không mở viewer.
- Ở Fit, một ngón kéo xuống (vượt `10px` và dọc nhiều hơn ngang) thì ảnh đi
  theo tay theo chiều dọc, nền mờ dần theo quãng kéo. Buông khi đã kéo quá
  `100px` hoặc vuốt nhanh hơn `0.5px/ms` thì đóng như R9 của detail (morph về
  khung primary `250ms`); buông sớm hơn thì ảnh về Fit `200ms ease-in-out`.
  Ngón thứ hai chạm xuống thì bỏ kéo, chuyển sang pinch.
- Chạm một lần lên nền vẫn đóng viewer.

```gherkin
Given điện thoại dọc ở detail
When chạm đúp lên ảnh primary
Then viewer mở, không thấy nút nào trên màn
When kéo ảnh xuống 60px rồi giữ và buông
Then ảnh đi theo tay rồi về Fit, viewer vẫn mở
When kéo ảnh xuống 220px rồi buông
Then viewer đóng
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| DOM hook | `[data-advertising-photo-viewport]` | Nhận pointer cho pinch, kéo, chạm đúp; giữ `touch-action: none` (`detail.css`) để trình duyệt không cuộn hay zoom trang trong viewer |
| DOM hook | `[data-advertising-photo-expanded-image]` | Ảnh đổi `transform: translate3d(panX, panY, 0) scale(s)` |
| DOM hook | `[data-advertising-photo-zoom-in]`, `-zoom-out`, `-zoom-reset` | Nút theo nấc R5, disabled theo `s` |
| DOM hook | `[data-advertising-photo-zoom-status]` | `round(s × 100)%` khi thao tác kết thúc |
| Hàm public | `createAdvertisingPhotoViewer` | Giữ chữ ký hiện tại; không thêm option |

Pointer Events thuần, không thêm thư viện gesture. Page pinch ngoài viewer giữ
nguyên vì meta viewport không đổi.

## UI

Không có giá trị hình ảnh mới: dùng lại nhịp zoom `200ms ease-in-out` và nút
của [Viewer](../../design-system/components/Viewer/README.md). PR code sửa câu
"ba mức zoom" trong component đó và dòng Viewer của
[Motion](../../design-system/motion.md) cho khớp, rồi publish lại Design System.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1–R7 | `node tests/site/advertising-viewer-touch.e2e.mjs`: Chromium `isMobile`, `hasTouch`, touch qua CDP `Input.dispatchTouchEvent`, dọc VI và ngang EN, reduced motion, double-click desktop, chạm đúp primary và kéo xuống đóng |
| R5, R6 | `PHOTO_VIEW_CONTROLS_ONLY=1 node tests/site/advertising-photo-view.e2e.mjs`: nút, con lăn, middle-click, phím, resize trên Chromium, Firefox, WebKit |
| R3 (nền) | `CASE=viewer-backdrop-swipe-stays-open node tests/site/advertising-photo-transitions.e2e.mjs` |
| R1–R6 | A05s thật: `DEVICE_CDP=http://127.0.0.1:9222 node tests/site/advertising-viewer-touch.e2e.mjs` sau `adb forward tcp:9222 localabstract:chrome_devtools_remote` và `adb reverse tcp:8787 tcp:8787`; mỗi lượt một tab mới, theo hướng máy đang cầm. Đạt 05/10/2026 trên SM-A057F, Chrome 154, dọc (2/2 lượt); ngang trên máy thật chỉ khi đặt máy ngang (chưa chạy) |

## Gate còn mở

- A05s thật đặt ngang chưa chạy; ngang hiện chỉ kiểm bằng giả lập trên cloud.
- iPhone Safari chưa kiểm vì chưa kết nối thiết bị; WebKit desktop không thay
  bằng chứng iPhone.

## Chú thích thuật ngữ

- **Pinch**: chụm hoặc mở hai ngón để đổi tỷ lệ ảnh trong viewer, khác zoom trang của trình duyệt.
- **Anchor**: điểm ảnh được giữ đứng yên trên màn hình khi đổi tỷ lệ.
- **Pan**: kéo dịch ảnh khi đang phóng to.
- **Nấc**: điểm dừng Fit, Cover, Max mà nút và con lăn nhảy tới.
- **Pointer Events**: API trình duyệt gộp chuột, bút, chạm thành một loại sự kiện.
- **CDP**: Chrome DevTools Protocol, điều khiển Chrome từ script để test.
