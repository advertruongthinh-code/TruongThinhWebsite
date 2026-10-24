---
title: Player video primary Kính sáng và chữ nút gợi ý
status: planned
source: []
tests:
  - tests/site/site-media-card-m02a.e2e.mjs
notion: https://app.notion.com/p/3ef332849a0e81978563c89bcb5d1ffc
updated: 2026-10-24
---

# Player video primary Kính sáng và chữ nút gợi ý

## Mục đích

Làm lại player video ở primary của detail Advertising theo Design System: thanh điều khiển là Kính sáng, kéo thanh tua
thì khung video đổi theo tay như After Effects. Kèm bóng chữ cho nút trong "Có thể bạn thích". Card trên masonry giữ
nguyên. Khi spec chuyển `live`, đoạn player trong [media-card R6](media-card.md#r6-media-trong-primary) thay bằng link
tới đây; dải media, tiếng fade, Back, Forward vẫn theo R6. Bản thiết kế đã duyệt tông:
[canvas player](https://claude.ai/code/artifact/d1473cc3-4987-43d4-83d0-d9cb7eb12b89) (bản Kính sáng, owner 2026-10-24).

## Hành vi

### R1. Thanh Kính sáng

Thanh cao `56px` nằm sát đáy BBox video (khung contain, không tính vùng dư zoom blur), rộng hết BBox. Nền là component
Kính, dạng mới "Thanh": một bậc, blur `40px`, saturate và brightness như Kính, tint trắng `0.55` như dạng cung, hạt
nhiễu như Kính. Góc vuông, không viền, không bóng. Video phía sau chỉ còn màu, không nhìn xuyên thấy hình (owner
2026-10-24). Chữ và icon màu `ink`; tổng thời lượng `ink` 0.8, weight 500.

Từ trái qua: nút phát/tạm dừng, thời gian "hiện tại / tổng" (`14px`, 700, số đều), khoảng trống, nút tiếng, nút toàn
màn hình. Nút vuông `48px`, icon `20px`; hover nền `ink` 0.08, nhấn 0.16, focus ring `2px` màu `orange`.

Không có nút phát giữa video, kể cả khi dừng (owner 2026-10-24). Bấm vào video vẫn phát/dừng.

```gherkin
Given primary đang phát video trên desktop 1440px
When trỏ chuột vào video
Then thanh Kính sáng hiện ở đáy BBox video, nền có backdrop-filter của component Kính
And đọc pixel vùng thanh trên video nhiều chi tiết thì không còn cạnh sắc của video
And tạm dừng thì giữa video không có biểu tượng phát nào
```

### R2. Hiện và ẩn thanh

Thanh luôn hiện khi video dừng, khi focus nằm trong player, khi đang kéo tua hoặc cột âm lượng đang mở. Khi phát: rê
chuột trên video thì hiện, chuột đứng yên `2s` hoặc rời khung thì ẩn; lúc thanh ẩn và video phát thì ẩn con trỏ. Hiện:
`200ms` ease-out, trượt lên `24px` và opacity tăng. Ẩn: `280ms` ease-in, ngược lại. Màn hình cảm ứng: thanh luôn hiện
(giữ mặc định đã có ở media-card R6). Giảm chuyển động: hiện và ẩn bằng opacity, không trượt.

```gherkin
Given primary đang phát video, thanh đang hiện
When chuột đứng yên 2 giây trên video
Then thanh trượt xuống 24px và mờ hẳn, con trỏ ẩn
And bấm Tab vào nút phát thì thanh hiện lại và không tự ẩn khi focus còn trong player
```

### R3. Thanh tua ba nấc

Thanh tua là đường `3px` ở mép trên Kính, ba nấc: chưa tải `ink` 0.16, đã tải (`buffered`) `ink` 0.38, đã chạy `ink`.
Rê, focus hoặc kéo thì đường dày `6px` và hiện núm vuông `12px` (nền `ink`, viền trắng `2px`); đang dừng thì núm luôn
hiện. Vùng bấm cao `22px` quanh đường. Rê chuột trên thanh tua hiện nhãn thời gian ở vị trí chuột; kéo thì nhãn theo
núm: nền `ink`, chữ trắng `13px` 700, dạng `m:ss.d`, có chân `1px` x `10px` chỉ xuống thanh, cách mép khung ít nhất
`44px`. Phím mũi tên tua như hiện tại. Giảm chuyển động: đổi độ dày ngay.

```gherkin
Given video 8,5 giây đã tải 40%, đang phát ở 2 giây
When rê chuột tới 75% thanh tua
Then thanh tua dày 6px, nấc đã tải dài 40%, nấc đã chạy theo thời gian phát
And nhãn "0:06.3" hiện phía trên vị trí chuột
```

### R4. Kéo tua: khung đổi theo tay

Kéo trong đoạn đã tải: video tạm dừng, khung hiện đúng frame tại núm mỗi lần núm đổi, mỗi frame tối đa một lệnh tua
(lệnh mới chờ `seeked` của lệnh trước); thả tay thì phát tiếp nếu trước đó đang phát. Kéo qua đoạn chưa tải: núm vẫn
theo tay, khung giữ frame cuối đã hiện, không gửi lệnh tua, nhãn thêm " · Đang tải" / " · Loading". Thả tay ở đoạn chưa
tải thì tua tới đó; nhãn giữ " · Đang tải" tới khi có `seeked`, rồi phát tiếp nếu trước đó đang phát. Đang phát mà hết
đoạn đã tải (`waiting`) thì nhãn hiện ở núm với " · Đang tải".

```gherkin
Given video đã tải hết, đang phát
When kéo núm từ 1 giây tới 6 giây trong 1 giây
Then khung video đổi frame theo núm trong lúc kéo, video không phát
And thả tay thì video phát tiếp từ 6 giây
```

```gherkin
Given video đã tải tới 3,9 giây
When kéo núm tới 5,6 giây rồi giữ
Then khung giữ frame gần 3,9 giây, nhãn "0:05.6 · Đang tải"
And thả tay thì nhãn còn tới khi video tua xong, rồi video phát từ 5,6 giây
```

### R5. Mã hóa video cho tua mượt

Video media primary có keyframe tối đa mỗi `0,5s`, để mỗi lệnh tua chỉ giải mã ít frame. Clip tạm hiện chỉ có một
keyframe đầu clip (đo `ffprobe` kiosk-posm-13-v1: 8,5s, H.264 24fps); `scripts/site/build-placeholder-media.mjs` thêm
`-g 12`. Tăng byte đo trong PR. Clip thật sau này theo chuẩn này ([media-delivery](media-delivery.md)).

```gherkin
Given clip tạm sinh lại bằng build-placeholder-media
When ffprobe liệt kê keyframe
Then khoảng cách giữa hai keyframe liền nhau không quá 0,5 giây
```

### R6. Âm lượng

Cột âm lượng `48px` x `152px` dùng Kính dạng "Thanh", đặt ngay trên nút tiếng: đường dọc `3px`, nấc đầy `ink`, núm như
thanh tua. Mở khi rê hoặc focus cụm tiếng; rời cụm thì đóng sau `160ms` để rê từ nút lên cột không bị tắt giữa đường.
Player hẹp hơn `480px` không có cột, chỉ có nút tiếng: máy nhỏ chỉnh bằng nút cứng (mặc định Thread chọn). Kéo về 0 là
tắt tiếng nhưng giữ mức cũ; `hasAudio` false thì ẩn nút và cột (giữ như media-card R6).

```gherkin
Given primary rộng 680px đang phát video có tiếng
When rê từ nút tiếng lên cột âm lượng và kéo tới 0,6
Then cột không đóng giữa đường, video bật tiếng ở volume 0,6
And player rộng 350px thì rê vào nút tiếng không mở cột
```

### R7. Toàn màn hình

Giữ hành vi media-card R6 (nền đen, không zoom blur, Esc thoát). Thanh và cột âm lượng trong toàn màn hình vẫn là Kính
sáng, cùng quy tắc hiện, ẩn.

```gherkin
Given primary đang phát video
When bấm "Toàn màn hình"
Then khung video phủ màn hình nền đen, thanh Kính sáng ở đáy
And chuột đứng yên 2 giây thì thanh ẩn
```

### R8. Bóng chữ nút gợi ý (ngoại lệ Design System)

Chữ trắng trên nút trong "Có thể bạn thích" thêm bóng mềm để nổi hơn hình (owner); lớp tối của nút giữ nguyên. Nút
đang chọn (chữ `ink` trên nền giấy) không có bóng. Giá trị mặc định: `0 1px 8px` `ink` 0.6, chỉnh khi owner xem. Design
System ghi "không có text-shadow"; đây là ngoại lệ có chủ đích, ghi vào `design-system/` khi owner "ok" trong thread.
Player không dùng text-shadow: chữ nằm trên Kính tint đặc.

```gherkin
Given detail có mục "Có thể bạn thích"
When đọc style chữ của nút chưa chọn và nút đang chọn
Then nút chưa chọn có text-shadow, nút đang chọn không có
And lớp tối ::after của nút chưa chọn vẫn còn
```

### R9. Hiệu năng

Kính "Thanh" là `backdrop-filter` thật trên video đang phát. Đo trên máy thật (A05s) với thanh hiện trên video phát:
đạt gate fps của [glass R7](glass-surface.md#r7-hiệu-năng-và-trình-duyệt) thì giữ; rơi gate thì báo owner trước khi
đổi thiết kế. Bảng dạng của [glass R1](glass-surface.md#r1-một-component-hai-dạng) thêm dạng "Thanh" trong cùng PR.

```gherkin
Given A05s mở primary video, thanh luôn hiện vì là cảm ứng
When video phát 10 giây
Then fps đo đạt gate glass R7
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| DOM hook | `data-advertising-photo-player\|play-surface\|play\|progress\|volume\|volume-group\|fullscreen\|time-current\|time-total` | Giữ hook hiện có (R1–R7) |
| DOM hook | `data-advertising-photo-scrub-label` | Nhãn thời gian trên thanh tua (R3, R4) |
| CSS var | `--buffered` trên thanh tua | Nấc đã tải (R3) |
| Hàm | `createGlassSurface("bar")` (`glass-surface.mjs`) | Kính dạng "Thanh" (R1, R6) |
| Script | `scripts/site/build-placeholder-media.mjs` | `-g 12` (R5) |

Code nằm trong `catalog-runtime.mjs`, `detail.css`, `index.html`, `glass-surface.mjs`; spec sở hữu các file đó không đổi.

## UI

[Glass](../../design-system/components/Glass/README.md), [Primary](../../design-system/components/Primary/README.md),
canvas player ở mục đích. Thêm dạng "Thanh" và ngoại lệ bóng chữ vào `design-system/` chỉ khi owner "ok".

## Kiểm tra

Dev: `pnpm dev`; E2E: `BASE_URL=http://localhost:4173 node tests/site/site-media-card-m02a.e2e.mjs`; unit:
`node --test tests/site/*.test.mjs`; docs: `pnpm qa:docs`; UI: `impeccable detect` trên `detail.css`.

| R | Test hoặc command |
| --- | --- |
| R1, R2, R3, R6, R7 | `site-media-card-m02a.e2e.mjs`: thêm ca Kính thanh, không nút giữa, tự ẩn 2s, con trỏ, ba nấc, nhãn, cột 480px |
| R4 | `site-media-card-m02a.e2e.mjs`: giả lập mạng chậm qua CDP, kéo trong và ngoài đoạn đã tải, đếm lệnh tua mỗi frame |
| R5 | Unit trên clip tạm: `ffprobe` keyframe không quá 0,5s |
| R8 | `site-media-card-m02a.e2e.mjs`: text-shadow nút chưa chọn, không có ở nút đang chọn |
| R9 | Máy thật A05s qua adb, theo [Android thật](../operations/android-real-device-debugging.md) |

## Gate còn mở

- Spec chờ owner duyệt, rồi plan. Owner.
- R5 tăng byte clip; số đo trong PR, owner xem. Owner.
- R9 chưa đo; thread chờ lượt phone. Thread.
- Giá trị bóng chữ R8 là mặc định, owner chỉnh khi xem demo. Owner.

## Chú thích thuật ngữ

- **Kính sáng**: Kính tint trắng, chữ `ink`; khác Kính tối tint `ink`, chữ trắng (đã loại).
- **BBox video**: khung contain của video trong primary, không tính vùng dư zoom blur.
- **Buffered**: đoạn video trình duyệt đã tải về, tua tới đó hiện frame ngay.
- **Keyframe**: frame giải mã độc lập; tua tới frame khác phải giải mã từ keyframe gần nhất phía trước.
- **Seek coalescing**: gộp lệnh tua, chỉ gửi lệnh mới khi lệnh trước xong (`seeked`).
- **Ngoại lệ Design System**: chỗ cố ý khác quy tắc chung, có ghi lý do và chỗ áp dụng.
