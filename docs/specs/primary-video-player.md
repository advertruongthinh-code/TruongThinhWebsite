---
title: Player video primary, khung media ngang và chữ nút gợi ý
status: live
source: []
tests:
  - tests/site/site-media-card-m02a.e2e.mjs
  - tests/site/primary-video-keyframes.test.mjs
  - tests/site/advertising-photo-layout.test.mjs
notion: https://app.notion.com/p/3ef332849a0e81978563c89bcb5d1ffc
updated: 2026-10-25
---

# Player video primary, khung media ngang và chữ nút gợi ý

## Mục đích

PC giữ nguyên bố cục player video primary đang chạy trên demo ([media-card R6](media-card.md#r6-media-trong-primary));
hướng Kính sáng đã bỏ (owner 2026-10-24). Spec này thêm bố cục player riêng cho màn hình cảm ứng, cùng ngôn ngữ thiết kế
với demo nhưng che ít video hơn, cho khung đổi theo tay khi kéo tua, thêm bóng đen cho chữ nút trong "Có thể bạn thích" và
UI player, và cho khung primary trên PC cao theo media ngang. Card trên masonry giữ nguyên. Đoạn player trong
media-card R6 trỏ tới đây; [advertising-detail R2](advertising-detail.md#r2-hình-học-primary) theo R6 ở đây. Bản thiết kế:
[canvas player](https://claude.ai/code/artifact/d1473cc3-4987-43d4-83d0-d9cb7eb12b89) (bản 34, ảnh chụp từ trang thật).

## Hành vi

### R1. Player trên màn hình cảm ứng

Áp dụng khi thiết bị không có hover (`hover: none`): điện thoại và tablet. Mặc định Thread chọn theo cách nhập thay vì
độ rộng, vì cột âm lượng của PC mở bằng hover nên không dùng được trên màn hình cảm ứng ở mọi độ rộng.

- Nút phát/tạm dừng trên thanh bỏ đi. Nút phát `48px` giữa video giữ như demo: trắng, bóng theo R4, chỉ hiện khi dừng;
  chạm vào video thì phát hoặc dừng.
- Giờ, thanh tua, nút tiếng nằm một hàng cao `40px` (nút toàn màn hình bỏ 2026-10-24, R8). Giờ `14px` 700, số đều, tổng thời lượng
  opacity `0.6`. Thanh tua chiếm phần còn lại, cách giờ `12px` và cách nút tiếng `8px`; đường `4px` bo tròn, núm
  `12px` như demo, vùng chạm cao `40px`. Nút tiếng vuông `40px`, icon `18px`.
- Thanh không có dải gradient đáy (R4); lề trái `16px`, phải `4px`, đáy `4px`; ở primary lề phải `60px` để nút
  tiếng không nằm dưới nút mở lớn (R8). Thanh luôn hiện như demo.
- Nút tiếng chỉ bật hoặc tắt tiếng, không có cột âm lượng: máy cảm ứng chỉnh bằng phím cứng (mặc định Thread chọn).
  `hasAudio` false thì ẩn nút tiếng như media-card R6.
- Player trong viewer (R8) dùng cùng bố cục này.

```gherkin
Given điện thoại 390px không hover mở primary video
When video đang phát
Then trên thanh không có nút phát/tạm dừng, giữa video không có biểu tượng phát
And giờ, thanh tua, nút tiếng cùng một hàng cao 40px, không có nút toàn màn hình
And thanh không có dải gradient đáy
And chạm vào video thì video dừng và nút phát 48px hiện giữa video
And chạm nút tiếng chỉ đổi bật/tắt tiếng, không mở cột âm lượng
```

```gherkin
Given desktop 1440px có hover mở primary video
When rê chuột vào video
Then bố cục giống demo: hàng nút trên, thanh tua dưới, cột âm lượng mở khi rê nút tiếng
And thanh không có dải gradient đáy (R4)
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

Video media primary có keyframe tối đa mỗi `0,5s`, để mỗi lệnh tua chỉ giải mã ít frame. Clip tạm trước đây chỉ có một
keyframe đầu clip (đo `ffprobe` kiosk-posm-13-v1: 8,5s, H.264 24fps); `scripts/site/build-placeholder-media.mjs` thêm
`-g 12`. 37 clip tạm tăng từ 14,9MB lên 29,6MB (+98%, PR #434). Clip thật sau này theo chuẩn này ([media-delivery](media-delivery.md)).

```gherkin
Given mọi file MP4 trong src/site/assets
When đọc bảng keyframe của track video
Then khoảng cách giữa hai keyframe liền nhau, và từ keyframe cuối tới cuối clip, không quá 0,5 giây
```

### R4. Bóng đen hai lớp cho nút gợi ý và UI player (ngoại lệ Design System)

Một bóng chung hai lớp, không lệch: vành `0 0 2px` đen `0.5` (như mũi tên trên card masonry) dưới quầng `0 0 12px` đen
`0.4`. Owner chọn phương án D trên canvas bản 33 cho player và cho nút gợi ý (2026-10-24).

- Chữ trắng trên nút trong "Có thể bạn thích": `text-shadow` hai lớp; nút đang chọn (chữ `ink` trên nền giấy) không có bóng.
  Lớp tối của nút (nay đen `0.4` phẳng) đổi theo số đo nút "Ý tưởng bạn có thể thích" của Pinterest (owner 2026-10-24: chữ
  vẫn khó đọc); số đo và giá trị mới điền vào đây khi phiên PC đo xong.
- Player PC và cảm ứng: icon trên thanh, nút phát giữa video (thay `0 0 8px` đen `0.1` của demo), thanh tua dùng
  `drop-shadow` hai lớp; giờ dùng `text-shadow` hai lớp. Bỏ dải gradient đáy, video lộ hết. Đổi lại chữ trắng trên nền
  sáng còn tương phản khoảng `2,8:1` thay vì `3,6:1` khi có dải (đo trên ảnh chụp canvas bản 33); owner đã xem số này.

Design System ghi "không có text-shadow"; đây là ngoại lệ có chủ đích, ghi vào `design-system/` khi owner "ok" trong thread.

```gherkin
Given detail có mục "Có thể bạn thích"
When đọc style chữ của nút chưa chọn và nút đang chọn
Then nút chưa chọn có text-shadow "0 0 2px" đen 0.5 và "0 0 12px" đen 0.4, nút đang chọn không có
And lớp tối ::after của nút chưa chọn vẫn còn
```

```gherkin
Given primary đang phát video trên PC hoặc cảm ứng
When đọc style icon trên thanh, nút phát giữa video, thanh tua và giờ
Then icon, nút phát, thanh tua có drop-shadow "0 0 2px" đen 0.5 rồi "0 0 12px" đen 0.4, giờ có text-shadow cùng hai lớp
And thanh điều khiển không có nền gradient
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

### R7. Nút vuông trắng

Owner 2026-10-24: mũi tên "<", ">" của primary, nút mở lớn và nút trong viewer (đóng, về kích thước ban đầu, phóng to,
thu nhỏ) cùng một kiểu: ô `36px` nền trắng, không viền, góc vuông, icon nét mảnh `16px` nét `2px` như chevron. Nút mở lớn
chỉ còn icon, tên "Xem lớn hơn" / "View larger" qua `aria-label`, không bung chữ khi hover. Nút trên thanh player PC đổi cỡ
cho cân với nút mở lớn: ô `36px`, icon `16px`, đáy hàng nút thẳng hàng đáy nút mở lớn, thanh tua dừng trước nút mở lớn
`8px` (mặc định Thread chọn). Cảm ứng giữ cỡ R1; viewer cảm ứng vẫn ẩn nút theo
[viewer R8](advertising-viewer-touch-zoom.md#r8-màn-cảm-ứng-nút-viewer-ẩn-khỏi-mắt).

```gherkin
Given primary card nhiều media trên desktop, đang ở video
When rê chuột vào khung
Then mũi tên, nút mở lớn có border-radius 0, rộng và cao 36px, nền trắng, không viền
And nút mở lớn không có chữ hiện ra, kể cả khi hover
And mở viewer thì nút đóng, phóng to, thu nhỏ cùng kiểu đó
```

### R8. Mở lớn video trong viewer

Nút mở lớn hiện cả với video và mở video vào viewer như ảnh: nền blur như ảnh, không nền đen; video phát tiếp đúng giây
và đúng trạng thái phát, dừng, tiếng; có thanh player (PC theo R7 và R9, cảm ứng theo R1), mũi tên đổi media của card
(ảnh hoặc video, dải liền như primary), nút và cử chỉ phóng to, thu nhỏ dùng được cho video như ảnh
([viewer R5](advertising-viewer-touch-zoom.md#r5-nút-con-lăn-phím-và-trạng-thái-dùng-chung-một-tỷ-lệ)). Đóng viewer
thì primary đứng ở media vừa xem, video ở đúng giây. Player không còn nút toàn màn hình; Fullscreen API không dùng nữa.

PC: bấm video ở Fit thì phát hoặc dừng; đã phóng to thì kéo video để pan, nút trên thanh vẫn bấm được. Cảm ứng: chạm
video trong viewer phát hoặc dừng như R1, phóng to bằng pinch, đã phóng to thì kéo để pan và chạm trả về Fit; vuốt
đóng không bắt đầu trên video, đóng bằng chạm nền hoặc nút back. Mũi tên viewer ẩn trên cảm ứng như các nút viewer
khác. Thanh tua trong viewer PC chạy tới lề phải `16px` vì không có nút mở lớn.

```gherkin
Given primary đang phát video ở giây 3 trên desktop
When bấm nút mở lớn
Then viewer mở với nền blur, không nền đen, video phát tiếp từ khoảng giây 3, có thanh player
And bấm phóng to thì video phóng to như ảnh; bấm mũi tên sau thì media kế trượt vào
And đóng viewer thì primary đứng ở media đang xem trong viewer
```

### R9. Thanh player ẩn khi đang phát

PC: video đang phát và chuột không ở trên khung thì cả cụm nút player (thanh tua, giờ, nút phát, tiếng) mờ đi, nút mở lớn
vẫn hiện; chuột vào khung, focus bàn phím bên trong hoặc video dừng thì cụm hiện lại. Focus còn lại sau khi bấm chuột vào video,
nút hay thanh tua không giữ cụm hiện (owner 2026-10-25 báo cụm không ẩn). Video dừng thì có nút phát `48px` giữa video
trên PC như cảm ứng (R1); hiện nay PC thiếu nút này là lỗi. Cảm ứng giữ R1 (thanh luôn hiện).

```gherkin
Given primary đang phát video trên desktop
When đưa chuột ra khỏi khung
Then cụm nút player có opacity 0, nút mở lớn vẫn opacity 1
And bấm video cho dừng thì nút phát 48px hiện giữa video
```

### R10. Kéo tua không kéo dải

Cảm ứng, primary và viewer: ngón đặt trên thanh tua hoặc thanh âm lượng chỉ tua hoặc chỉnh tiếng, không bắt đầu kéo dải
media, không đổi media, không chặn click (owner 2026-10-24: kéo núm làm dải cuộn theo).

```gherkin
Given primary card nhiều media đang ở video trên điện thoại
When kéo núm tua ngang 120px
Then video tua theo núm, dải media đứng yên, media không đổi
```

### R11. Tiếng: người xem thắng fade

Trong lúc tiếng fade theo nhịp dải ([media-card R6](media-card.md#r6-media-trong-primary)), người xem kéo thanh âm lượng
hoặc bấm bật, tắt tiếng thì fade dừng ngay, video giữ đúng mức người xem vừa chọn; mức đó thành mức tiếng của card cho các
lần fade sau (owner 2026-10-24).

```gherkin
Given video đích đang to tiếng dần sau khi dải dừng
When kéo thanh âm lượng về 0.3
Then volume giữ 0.3, không tăng tiếp
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| DOM hook | `data-advertising-photo-player\|play-surface\|play\|progress\|volume\|volume-group\|time-current\|time-total` | Giữ hook hiện có (R1, R2, R5); bỏ `fullscreen` (R8) |
| CSS | `@media (hover: none)` trong `detail.css` | Bố cục cảm ứng (R1) |
| CSS token | `--text-shadow-d`, `--text-shadow-reach` trong `:root` | Bóng hai lớp R4; thread bóng chữ hero định nghĩa, ở đây chỉ dùng lại |
| Script | `scripts/site/build-placeholder-media.mjs` | `-g 12` (R3) |
| Hàm | `computeAdvertisingPhotoGeometry` (`layout-core.mjs`) | Vùng ảnh `split` cao `min(W/r, H)` (R6) |

Code nằm trong `catalog-runtime.mjs`, `photo-viewer.mjs`, `detail.css`, `layout-core.mjs`, `index.html` (bỏ nút toàn màn hình, nút mở lớn chỉ icon).

## UI

[Primary](../../design-system/components/Primary/README.md), canvas player ở mục đích. Thêm bố cục cảm ứng và ngoại lệ
bóng chữ vào `design-system/` chỉ khi owner "ok".

## Kiểm tra

Dev: `pnpm dev`; E2E: `BASE_URL=http://localhost:4173 node tests/site/site-media-card-m02a.e2e.mjs`; unit:
`node --test tests/site/*.test.mjs`; docs: `pnpm qa:docs`; UI: `impeccable detect` trên `detail.css`.

| R | Test hoặc command |
| --- | --- |
| R1 | `site-media-card-m02a.e2e.mjs`: context cảm ứng 390px (`isMobile`, `hasTouch`, khớp `hover: none`) đo một hàng 40px, không nền gradient, không nút phát trên thanh, nút giữa chỉ khi dừng, chạm nút tiếng không mở cột âm lượng; desktop giữ ca hiện có |
| R2 | `site-media-card-m02a.e2e.mjs`: giả `video.buffered`, kéo trong đoạn đã tải (frame theo núm, video không phát, không hai lệnh tua chồng nhau, thả tay phát tiếp) và ra ngoài (giữ frame, không tua tới khi thả) |
| R3 | `primary-video-keyframes.test.mjs`: đọc bảng `stss`, `stts` của mọi MP4 trong `src/site/assets`, khoảng cách keyframe (kể cả tới cuối clip) không quá 0,5s |
| R4 | `site-media-card-m02a.e2e.mjs`: text-shadow hai lớp ở nút chưa chọn, không có ở nút đang chọn; bóng hai lớp ở icon, nút phát, thanh tua, giờ của player; thanh không nền gradient |
| R5 | `site-media-card-m02a.e2e.mjs`: đọc rule CSS núm `::-webkit-slider-thumb`, `::-moz-range-thumb` (`getComputedStyle` không đọc được pseudo này), màu đặc alpha 1 |
| R6 | `advertising-photo-layout.test.mjs`: ca ngang, dọc ở 1440×900 và ca catalog theo `min(W/r, H)`; `advertising-photo-view.e2e.mjs` so khung với mô hình độc lập theo R6 |
| R7–R11 | `site-media-card-m02a.e2e.mjs`: cỡ, góc nút; video mở viewer nền blur, giữ giây, phóng to, mũi tên; cụm player ẩn khi rời chuột, nút phát giữa khi dừng; kéo tua cảm ứng không đổi media; chỉnh tiếng trong lúc fade |
| R1 trên máy thật | A04s qua adb theo [Android thật](../operations/android-real-device-debugging.md): bấm được nút, kéo tua bằng tay |

## Gate còn mở

- R3 tăng byte clip gần gấp đôi (số đo ở R3); owner xem. Owner.
- Kiểm R1 trên máy thật chờ lượt phone. Thread.

## Chú thích thuật ngữ

- **BBox video**: khung contain của video trong primary, không tính vùng dư zoom blur.
- **Buffered**: đoạn video trình duyệt đã tải về, tua tới đó hiện frame ngay.
- **Keyframe**: frame giải mã độc lập; tua tới frame khác phải giải mã từ keyframe gần nhất phía trước.
- **Seek coalescing**: gộp lệnh tua, chỉ gửi lệnh mới khi lệnh trước xong (`seeked`).
- **Hover none**: thiết bị không có con trỏ rê được, như điện thoại, tablet; CSS nhận biết bằng `@media (hover: none)`.
- **Ngoại lệ Design System**: chỗ cố ý khác quy tắc chung, có ghi lý do và chỗ áp dụng.
