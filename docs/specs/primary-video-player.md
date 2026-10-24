---
title: Player video primary, khung media ngang và chữ nút gợi ý
status: planned
source: []
tests:
  - tests/site/site-media-card-m02a.e2e.mjs
notion: https://app.notion.com/p/3ef332849a0e81978563c89bcb5d1ffc
updated: 2026-10-24
---

# Player video primary, khung media ngang và chữ nút gợi ý

## Mục đích

PC giữ nguyên bố cục player video primary đang chạy trên demo ([media-card R6](media-card.md#r6-media-trong-primary));
hướng Kính sáng đã bỏ (owner 2026-10-24). Spec này thêm bố cục player riêng cho màn hình cảm ứng, cùng ngôn ngữ thiết kế
với demo nhưng che ít video hơn, cho khung đổi theo tay khi kéo tua, thêm bóng đen cho chữ nút trong "Có thể bạn thích" và
UI player, và cho khung primary trên PC cao theo media ngang. Card trên masonry giữ nguyên. Khi spec chuyển `live`, đoạn player trong
media-card R6 trỏ tới đây và [advertising-detail R2](advertising-detail.md#r2-hình-học-primary) sửa theo R6 ở đây. Bản thiết kế:
[canvas player](https://claude.ai/code/artifact/d1473cc3-4987-43d4-83d0-d9cb7eb12b89) (bản 33, ảnh chụp từ trang thật).

## Hành vi

### R1. Player trên màn hình cảm ứng

Áp dụng khi thiết bị không có hover (`hover: none`): điện thoại và tablet. Mặc định Thread chọn theo cách nhập thay vì
độ rộng, vì cột âm lượng của PC mở bằng hover nên không dùng được trên màn hình cảm ứng ở mọi độ rộng.

- Nút phát/tạm dừng trên thanh bỏ đi. Nút phát `48px` giữa video giữ như demo: trắng, bóng theo R4, chỉ hiện khi dừng;
  chạm vào video thì phát hoặc dừng.
- Giờ, thanh tua, nút tiếng, nút toàn màn hình nằm một hàng cao `40px`. Giờ `14px` 700, số đều, tổng thời lượng
  opacity `0.6`. Thanh tua chiếm phần còn lại, cách giờ `12px` và cách nút tiếng `8px`; đường `4px` bo tròn, núm
  `12px` như demo, vùng chạm cao `40px`. Hai nút vuông `40px`, icon `18px`.
- Dải gradient đáy thấp từ `128px` xuống `72px` (đen `0.4` lên trong suốt), lề trái `16px`, phải `4px`, đáy `4px`.
  Thanh luôn hiện như demo.
- Nút tiếng chỉ bật hoặc tắt tiếng, không có cột âm lượng: máy cảm ứng chỉnh bằng phím cứng (mặc định Thread chọn).
  `hasAudio` false thì ẩn nút tiếng như media-card R6.
- Toàn màn hình dùng cùng bố cục này.

```gherkin
Given điện thoại 390px không hover mở primary video
When video đang phát
Then trên thanh không có nút phát/tạm dừng, giữa video không có biểu tượng phát
And giờ, thanh tua, nút tiếng, nút toàn màn hình cùng một hàng cao 40px
And dải gradient đáy cao 72px
And chạm vào video thì video dừng và nút phát 48px hiện giữa video
And chạm nút tiếng chỉ đổi bật/tắt tiếng, không mở cột âm lượng
```

```gherkin
Given desktop 1440px có hover mở primary video
When rê chuột vào video
Then player giống demo: hàng nút trên, thanh tua dưới, dải gradient 128px, cột âm lượng mở khi rê nút tiếng
```

### R2. Kéo tua: khung đổi theo tay

Áp dụng cho PC và cảm ứng. Kéo trong đoạn đã tải (`buffered`): video tạm dừng, khung hiện đúng frame tại núm mỗi lần
núm đổi, mỗi frame tối đa một lệnh tua (lệnh mới chờ `seeked` của lệnh trước); thả tay thì phát tiếp nếu trước đó đang
phát. Kéo qua đoạn chưa tải: núm vẫn theo tay, khung giữ frame cuối đã hiện, không gửi lệnh tua; thả tay thì tua tới
đó, có `seeked` rồi phát tiếp nếu trước đó đang phát. Giao diện thanh tua giữ như demo, không thêm nhãn.

```gherkin
Given video đã tải hết, đang phát
When kéo núm từ 1 giây tới 6 giây trong 1 giây
Then khung video đổi frame theo núm trong lúc kéo, video không phát
And thả tay thì video phát tiếp từ 6 giây
```

```gherkin
Given video đã tải tới 3,9 giây
When kéo núm tới 5,6 giây rồi giữ
Then khung giữ frame gần 3,9 giây, không có lệnh tua mới
And thả tay thì video tua tới 5,6 giây rồi phát tiếp
```

### R3. Mã hóa video cho tua mượt

Video media primary có keyframe tối đa mỗi `0,5s`, để mỗi lệnh tua chỉ giải mã ít frame. Clip tạm hiện chỉ có một
keyframe đầu clip (đo `ffprobe` kiosk-posm-13-v1: 8,5s, H.264 24fps); `scripts/site/build-placeholder-media.mjs` thêm
`-g 12`. Tăng byte đo trong PR. Clip thật sau này theo chuẩn này ([media-delivery](media-delivery.md)).

```gherkin
Given clip tạm sinh lại bằng build-placeholder-media
When ffprobe liệt kê keyframe
Then khoảng cách giữa hai keyframe liền nhau không quá 0,5 giây
```

### R4. Bóng đen cho chữ nút gợi ý và UI player (ngoại lệ Design System)

Một bóng chung `0 0 12px` đen `0.4`, không lệch. Owner chọn đen `0.4` và nhòe rộng hơn `8px` (2026-10-24); `12px` là
mặc định Thread chọn, vì nhòe rộng hơn thì bóng nhạt dần sát chữ.

- Chữ trắng trên nút trong "Có thể bạn thích": `text-shadow`. Lớp tối của nút giữ nguyên; nút đang chọn (chữ `ink`
  trên nền giấy) không có bóng.
- Player PC và cảm ứng: icon trên thanh, nút phát giữa video (thay `0 0 8px` đen `0.1` của demo), thanh tua dùng
  `drop-shadow`; giờ dùng `text-shadow`. Dải gradient đáy giữ nguyên: bóng này trên icon và chữ mảnh chỉ đậm thêm khoảng
  `16/255`, còn bỏ dải thì chữ trắng trên nền sáng tụt từ khoảng `3,6:1` xuống `2,8:1` (đo trên ảnh chụp canvas bản 33).
  Mặc định Thread chọn "giữ dải, thêm bóng" (phương án B trên canvas) trong lúc chờ owner chọn.

Design System ghi "không có text-shadow"; đây là ngoại lệ có chủ đích, ghi vào `design-system/` khi owner "ok" trong thread.

```gherkin
Given detail có mục "Có thể bạn thích"
When đọc style chữ của nút chưa chọn và nút đang chọn
Then nút chưa chọn có text-shadow "0 0 12px" đen 0.4, nút đang chọn không có
And lớp tối ::after của nút chưa chọn vẫn còn
```

```gherkin
Given primary đang phát video trên PC hoặc cảm ứng
When đọc style icon trên thanh, nút phát giữa video, thanh tua và giờ
Then icon, nút phát, thanh tua có drop-shadow "0 0 12px" đen 0.4, giờ có text-shadow cùng giá trị
And dải gradient đáy vẫn còn
```

### R5. Núm đặc

Núm thanh tua và núm thanh âm lượng đổi từ trắng `0.5` sang trắng `#fbfbf9` đặc, cho PC và cảm ứng: núm trong suốt
để lộ đường tua chạy xuyên qua, nhìn như UI chồng lớp (owner 2026-10-24). Đường tua giữ như demo.

```gherkin
Given primary đang phát video, thanh điều khiển đang hiện
When đọc màu núm thanh tua và núm thanh âm lượng
Then cả hai là màu đặc, alpha 1
```

### R6. Khung primary cao theo media ngang

Layout `split` (PC, màn hình ngang) đổi chiều cao vùng ảnh từ cố định bằng phần viewport `H` (advertising-detail R2) sang
`min(W/r, H)`, với `W` là bề rộng vùng ảnh và `r` tỷ lệ cover (mọi media trong card cùng tỷ lệ). Media ngang vì thế không
có vùng dư trên, dưới, không có zoom blur ở đó (owner 2026-10-24); media dọc vẫn cao `H`, vùng dư hai bên là zoom blur như cũ.
Primary thấp lại và hàng related dồn lên ngay dưới, như pin Pinterest. Info cao bằng vùng ảnh; info cần cao hơn (đủ một dòng
mô tả, CTA, indicator như R2) thì primary cao theo info, khung ảnh nằm trên cùng cột ảnh, phần dưới để nền trang. Layout
`pinterest` giữ nguyên (đã cao theo ảnh).

```gherkin
Given viewport 1440×900 (4 cột, split) và card có cover video 960×640
When mở detail card đó
Then khung media rộng 668px, cao 445px, không có zoom blur trên và dưới video
And hàng related bắt đầu ngay dưới primary
And card có cover dọc thì khung vẫn cao hết phần viewport, zoom blur hai bên
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| DOM hook | `data-advertising-photo-player\|play-surface\|play\|progress\|volume\|volume-group\|fullscreen\|time-current\|time-total` | Giữ hook hiện có (R1, R2, R5) |
| CSS | `@media (hover: none)` trong `detail.css` | Bố cục cảm ứng (R1) |
| Script | `scripts/site/build-placeholder-media.mjs` | `-g 12` (R3) |
| Hàm | `computeAdvertisingPhotoGeometry` (`layout-core.mjs`) | Vùng ảnh `split` cao `min(W/r, H)` (R6) |

Code nằm trong `catalog-runtime.mjs`, `detail.css`, `layout-core.mjs`; markup `index.html` giữ nguyên. Spec sở hữu các file đó không đổi.

## UI

[Primary](../../design-system/components/Primary/README.md), canvas player ở mục đích. Thêm bố cục cảm ứng và ngoại lệ
bóng chữ vào `design-system/` chỉ khi owner "ok".

## Kiểm tra

Dev: `pnpm dev`; E2E: `BASE_URL=http://localhost:4173 node tests/site/site-media-card-m02a.e2e.mjs`; unit:
`node --test tests/site/*.test.mjs`; docs: `pnpm qa:docs`; UI: `impeccable detect` trên `detail.css`.

| R | Test hoặc command |
| --- | --- |
| R1 | `site-media-card-m02a.e2e.mjs`: context cảm ứng 390px (không hover) đo một hàng, gradient 72px, không nút phát trên thanh, nút giữa chỉ khi dừng, không mở cột âm lượng; desktop giữ ca hiện có |
| R2 | `site-media-card-m02a.e2e.mjs`: giả lập mạng chậm qua CDP, kéo trong và ngoài đoạn đã tải, đếm lệnh tua mỗi frame |
| R3 | Unit trên clip tạm: `ffprobe` keyframe không quá 0,5s |
| R4 | `site-media-card-m02a.e2e.mjs`: text-shadow nút chưa chọn, không có ở nút đang chọn; bóng icon, nút phát, thanh tua, giờ của player, dải gradient còn |
| R5 | `site-media-card-m02a.e2e.mjs`: màu `::-webkit-slider-thumb` của thanh tua và thanh âm lượng có alpha 1 |
| R6 | `advertising-photo-layout.test.mjs`: đổi hai ca "split cao bằng cap" sang `min(W/r, H)`, thêm ca ngang và dọc; `advertising-primary-p14.e2e.mjs` đo khung 1440×900 |
| R1 trên máy thật | A05s qua adb theo [Android thật](../operations/android-real-device-debugging.md): bấm được nút, kéo tua bằng tay |

## Gate còn mở

- Spec chờ owner duyệt, rồi plan. Owner (R6 đã chọn hướng "cao theo media" 2026-10-24).
- R4: độ nhòe mặc định `12px` và phương án bóng player (mặc định B), owner chọn trên canvas. Owner.
- R3 tăng byte clip; số đo trong PR, owner xem. Owner.
- Kiểm R1 trên máy thật chờ lượt phone. Thread.

## Chú thích thuật ngữ

- **BBox video**: khung contain của video trong primary, không tính vùng dư zoom blur.
- **Buffered**: đoạn video trình duyệt đã tải về, tua tới đó hiện frame ngay.
- **Keyframe**: frame giải mã độc lập; tua tới frame khác phải giải mã từ keyframe gần nhất phía trước.
- **Seek coalescing**: gộp lệnh tua, chỉ gửi lệnh mới khi lệnh trước xong (`seeked`).
- **Hover none**: thiết bị không có con trỏ rê được, như điện thoại, tablet; CSS nhận biết bằng `@media (hover: none)`.
- **Ngoại lệ Design System**: chỗ cố ý khác quy tắc chung, có ghi lý do và chỗ áp dụng.
