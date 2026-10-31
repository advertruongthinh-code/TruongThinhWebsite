---
title: Video thích ứng mạng (adaptive bitrate)
status: live
source:
  - scripts/site/build-video-ladder.mjs
  - src/site/advertising-products/video-source.mjs
tests:
  - tests/site/video-ladder.test.mjs
  - tests/site/primary-video-keyframes.test.mjs
  - tests/site/video-delivery.e2e.mjs
  - tests/site/video-delivery-measure.mjs
notion: https://app.notion.com/p/404332849a0e81aa9718f91db2d05e51
updated: 2026-10-31
---

# Video thích ứng mạng (adaptive bitrate)

## Mục đích

Video trên card (masonry, related) và trong detail (primary, viewer) tự chọn bản nhẹ khi mạng chậm, bản nét khi mạng
nhanh, để phone trên 4G yếu bớt video không kịp chạy và bớt đứng hình chờ tải. Khi mạng nhanh lên, phần đã tải ở bậc thấp
được tải lại ở bậc cao và thay vào (owner 2026-10-25), nên phát bằng hls.js; HLS gốc của trình duyệt chỉ là dự phòng.
Spec này sở hữu file video (thang chất lượng, playlist) và cách runtime chọn nguồn; lịch phát, player và handoff giữa card
và detail vẫn thuộc [media-card](media-card.md) và [player primary](primary-video-player.md). Upload video của CMS nằm
ngoài spec này (xem Gate còn mở).

## Hành vi

### R1. Thang chất lượng cho mỗi video

Mỗi video có các bậc rộng 240, 480, 960 và 1920 px; chỉ giữ bậc không rộng hơn bản gốc, chiều cao theo tỷ lệ gốc (làm
tròn về số chẵn). Mọi bậc là H.264 High 4:2:0 để GPU giải mã được ([media-card R4](media-card.md#r4-video-trên-card)),
cùng số khung hình mỗi giây với bản gốc, keyframe tối đa mỗi 0,5 s
([player R3](primary-video-player.md#r3-mã-hóa-video-cho-tua-mượt)). Segment dài 2 s và bắt đầu bằng keyframe: clip chỉ
dài 6 tới 15 s, segment 6 s như Apple khuyên thì trình duyệt không kịp đổi bậc trong một clip.

Mỗi bậc là một file fMP4 `<bậc>.mp4`; playlist của bậc trỏ từng segment bằng `EXT-X-BYTERANGE`, nên mỗi bậc chỉ có hai
file. Bậc bằng chiều rộng bản gốc copy luồng hình (không mã hóa lại) khi bản gốc đã đúng chuẩn trên. Video có tiếng thì
mọi bậc mang cùng một luồng AAC 48 kbps (mã hóa một lần, chép vào từng bậc); video không tiếng thì không có luồng tiếng.

| Bậc | Dùng cho | Nén |
| --- | --- | --- |
| 240 | card và detail khi mạng rất chậm | CRF 30 |
| 480 | card (bậc đầu), detail khi mạng chậm | CRF 28 |
| 960 | detail (bậc đầu) | CRF 30 hoặc copy bản gốc |
| 1920 | detail trên màn hình lớn, chỉ khi bản gốc đủ rộng | CRF 28 |

```gherkin
Given video gốc 960x640 có tiếng
When script sinh thang chất lượng
Then thư mục của video có 240.mp4, 480.mp4, 960.mp4 và playlist của từng bậc, không có bậc 1920
And mỗi bậc là H.264 High 4:2:0, keyframe tối đa mỗi 0,5 s, segment 2 s, mang cùng một luồng AAC 48 kbps
```

### R2. Một playlist tổng cho card và detail

`master.m3u8` liệt kê mọi bậc, bậc 960 (hoặc bậc lớn nhất khi bản gốc nhỏ hơn) đứng đầu vì hls.js nạp bậc đầu playlist
trước (Apple 1.32), các bậc còn lại theo bitrate tăng dần. Card hiện rộng tối đa khoảng 440 px CSS nên layer card đặt
`hls.autoLevelCapping` và `hls.startLevel` ở bậc 480: card bắt đầu ở 480, detail ở 960, giống bản cố định hiện tại khi
mạng nhanh; mạng chậm thì hls.js tự xuống bậc thấp hơn.

Mỗi dòng `EXT-X-STREAM-INF` có `BANDWIDTH` (bitrate segment lớn nhất), `AVERAGE-BANDWIDTH` (trung bình cả bậc),
`CODECS`, `RESOLUTION`, `FRAME-RATE` theo
[chuẩn HLS của Apple](https://developer.apple.com/library/tvos/documentation/General/Reference/HLSAuthoringSpec/index.html)
9.1, 9.2, 9.13 tới 9.15. Script tính hai số bitrate từ byte thật của segment, vì ffmpeg chỉ ghi bitrate tiếng khi mã hóa
theo CRF (đo thử: `BANDWIDTH=52800` cho cả ba bậc).

```gherkin
Given video có bậc 240, 480, 960
When đọc master.m3u8
Then thứ tự bậc là 960, 240, 480
And BANDWIDTH của mỗi bậc bằng bitrate segment lớn nhất tính từ byte range của playlist bậc đó
```

### R3. Runtime chọn nguồn

`Hls.isSupported()` đúng (có Media Source: Chrome, Edge, Firefox PC và Android, Safari Mac, iPhone từ iOS 17.1 qua
Managed Media Source) thì mỗi `<video>` có một instance hls.js nạp `hlsSrc` (layer card chặn bậc như R2); hủy instance
khi video đổi nguồn hoặc rời DOM. Còn lại (iPhone cũ hơn, trình duyệt cũ) phát file bậc cố định: card dùng `cardSrc`
(file bậc 480), primary và viewer dùng `src` (file bậc 960). File fMP4 của bậc phát thẳng được như mp4 thường nên không
lưu thêm bản riêng. hls.js lỗi không phục hồi được thì video về file bậc cố định đó, đang phát thì phát tiếp.

Card đang dừng (chưa vào màn hoặc đã cuộn qua) tải xong một segment thì runtime dừng tải và giữ phần đã có; card phát
thì tải tiếp từ vị trí phát. Ở 4G chậm card ngoài màn tải hết clip giành băng thông nên segment đầu của card vừa hiện
mất 3,8 s (đo cloud 2026-10-25). Primary và viewer không áp luật này.

hls.js bản `1.7.3` (Apache-2.0), dùng bản light (bỏ phụ đề, track tiếng riêng, DRM, quảng cáo chèn): 119 KB gzip, 386 KB
chưa nén (đo từ gói npm). Ghim đúng version trong `package.json` như các vendor khác, `prepare-static-assets.mjs` chép
`dist/hls.light.min.js` sang `assets/vendor/`; runtime catalog nạp khi artifact có `hlsSrc`, không chặn render: đợi tới
card video đầu thì ở 4G chậm card đầu đã hiện mà thư viện chưa về (đo cloud qua HTTP/2 2026-10-25, 26: tải khi cần 2/64
video không kịp chạy, tải sớm 2/127, tải sớm cùng luật card đang dừng 0/127). Không có Media Source thì không tải. Không
dùng tag `latest` hay canary: gói từng có hai bản canary 1.7.0 chứa mã độc ([OSV
MAL-2026-3019](https://osv.dev/vulnerability/MAL-2026-3019)), bản 1.7.3 phát hành 2026-09-11. Giây video truyền giữa
card và detail như media-card R4, R6; poster, lỗi video và lịch phát không đổi.

```gherkin
Given trình duyệt có Media Source
When card video hiện quá 1/2 dưới navbar
Then hls.js của layer card nạp master.m3u8, bắt đầu và chặn ở bậc 480, video phát tắt tiếng như media-card R4
And mở detail thì primary nạp master.m3u8 từ bậc 960 và phát tiếp từ giây của card

Given trình duyệt không có Media Source
When mở masonry rồi mở detail của card video
Then card phát file 480.mp4, primary phát file 960.mp4 và không có request .m3u8
```

### R4. Mạng nhanh lên thì thay phần bậc thấp đã tải

Áp dụng khi video phát bằng hls.js (R3). Owner chọn cách thay phía trước (2026-10-25) sau khi đo trên cloud: clip ngắn
tải hết sau khoảng 5 s rồi hls.js ngừng tải nên tự nó không thấy mạng nhanh lên, còn `hls.nextLevel = -1` xóa luôn giây
0 tới 1 phía sau nên vòng lặp kế khựng 373 rồi 783 ms ở 1,5 Mbps (số đo trong mô tả PR #434).

- Số đo chung: mỗi lần một video tải xong segment, số đo băng thông của nó (`hls.bandwidthEstimate`) gán cho mọi video
  khác đang có số đo thấp hơn, rồi runtime chạy luật phía trước cho mọi video.
- Phía trước: video đang phát có phần đã tải ở bậc thấp hơn bậc hls.js tự chọn theo số đo (`hls.nextAutoLevel`, card vẫn
  chặn ở 480) thì runtime xóa phần đó kể từ keyframe (mỗi 0,5 s, R1) đầu tiên mà bậc mới kịp tải về trước khi phát tới:
  vị trí phát cộng 0,5 s cộng 1,5 lần thời gian tải ước tính, băng thông chia đều cho các video cùng thay. Xóa bằng sự
  kiện `BUFFER_FLUSHING` của hls.js, rồi hls.js tự tải lại phần đó ở bậc mới; phần đang phát trước keyframe đó giữ nguyên
  nên không đứng hình. Video đang dừng không thay.
- Tải hết clip thì runtime dừng tải (`hls.stopLoad()`) để hls.js không chạy vòng lặp 100 ms cho video đã đủ dữ liệu;
  luật phía trước xóa xong (`BUFFER_FLUSHED`) thì bật lại (`hls.startLoad`). Sự kiện `playing` chỉ bật lại card do luật
  card đang dừng (R3) dừng: bật thêm lúc luật phía trước chờ xóa thì hls.js tải trùng và video khựng (e2e R4 đỏ 3/3).
- Vòng lặp và tua: tắt [`loopBackBufferFlush`](https://github.com/video-dev/hls.js/blob/v1.7.3/docs/API.md#loopbackbufferflush);
  mỗi lần video tua, kể cả lặp về giây 0, runtime chạy lại luật phía trước. Tua về đoạn bậc thấp còn trong buffer thì
  phát ngay bằng phần có sẵn rồi phần từ keyframe kịp tải nét lên (owner chọn 2026-10-25); lặp về 0 thì phần đầu clip
  nét từ vòng sau.
- Xuống bậc không xóa gì: phần bậc cao đã tải phát hết rồi mới tới bậc thấp.

Việc thay phải liền mạch (owner 2026-10-25): người xem chỉ thấy hình nét lên, không nhận ra có tải lại.

- Không đứng hình: không sự kiện `waiting` dài hơn 10 ms (hls.js bắn `waiting` 4 tới 9 ms mỗi lần lặp về 0, kể cả khi
  không đổi bậc), `currentTime` chỉ tăng (trừ lúc lặp về 0), runtime không tự tua.
- Không lóe: không frame đen, không hiện lại poster, skeleton hay `.is-media-error`; Kính và nền blur vẽ liền.
- Khung đứng yên: mọi bậc cùng tỷ lệ, khung giữ `object-fit` như hiện tại nên layout không dịch khi `videoWidth` đổi.
- Tiếng liền ở detail: luồng AAC mã hóa một lần rồi chép nguyên vào mọi bậc, nên điểm nối không có khoảng lặng hay tiếng
  click.
- Hình chỉ đổi ở keyframe; frame rơi quanh điểm đổi không nhiều hơn lúc phát không đổi bậc.

Đổi lại tốn mạng cho phần tải lại, tối đa bằng phần đã tải phía trước (clip 6 tới 15 s có thể đã tải hết). Chỉ xảy ra
khi mạng vừa nhanh lên nên chấp nhận.

```gherkin
Given card đang phát bậc 240 của clip 10 s đã tải hết, đang xem giây 4
When mạng nhanh lên và một video khác trên trang tải xong segment
Then phần bậc 240 từ keyframe kịp tải bị xóa và tải lại ở bậc 480, video không có waiting dài hơn 10 ms
And từ vòng lặp sau phần đầu clip cũng ở bậc 480

Given mạng đã nhanh, primary đã thay phần phía trước ở bậc 960
When người xem tua về giây 2 còn bậc 480 trong buffer
Then video phát ngay từ giây 2 ở bậc 480, không waiting
And phần từ keyframe kịp tải lên bậc 960, không waiting

Given primary đang phát bậc 960 đã tải phía trước
When mạng chậm đi và hls.js chọn bậc 480
Then phần bậc 960 đã tải không bị xóa và phát hết trước khi tới bậc 480
```

### R5. Dữ liệu và script

Item video thêm trường tùy chọn `hlsSrc` (đường dẫn `master.m3u8`). `src` trỏ file bậc 960 (hoặc bậc lớn nhất khi bản
gốc nhỏ hơn 960), `cardSrc` trỏ file bậc 480; `source`, `sha256` là file `src`. Thiếu `hlsSrc` thì runtime phát `src`,
`cardSrc` như hiện tại. Mỗi video có một thư mục `<id>/` chứa `master.m3u8`, `<bậc>.m3u8`, `<bậc>.mp4`.

`scripts/site/build-video-ladder.mjs <video gốc> <thư mục ra>` sinh thư mục trên từ một video gốc và không sửa dữ liệu
card; dữ liệu card sửa tay. `main` chưa có video thật ([media-card](media-card.md#gate-còn-mở)); video tạm chỉ dùng duyệt trên PR #434.

```gherkin
Given item video không có hlsSrc
When trình duyệt có Media Source
Then card vẫn phát cardSrc, primary vẫn phát src như hiện tại và trang không nạp playlist
```

### R6. Nghiệm thu bằng số đo

Kịch bản: viewport A04s (384x724, DPR 1,875), cuộn masonry 16 nấc 400 px, mỗi nấc chờ 1,5 s; mạng 4G chậm 1,6 Mbps, RTT
150 ms (mức Lighthouse dùng cho mobile), tắt cache; mỗi bản 9 lượt xen kẽ; server local đặt sau proxy HTTP/2 nén brotli
như Cloudflare (server tĩnh local HTTP/1.1 không nén làm card đầu hiện sau 11,6 s thay vì 2,8 s). So với bản 480 cố định
(98f3963; đo cloud 2026-10-25, 26 bằng bản AV1 cùng tỷ lệ dung lượng: 0 video không kịp chạy, 0,54 tới 1,2 lần đứng hình
mỗi video tùy đợt), bản HLS phải có số lần đứng hình mỗi video không quá 0,6 và số video không kịp chạy không nhiều hơn.
Mạng nhanh và PC không kém đi: video chạy trong 50 ms sau khi hiện quá 1/2; frame trên 33 ms và main thread bận trên PC
không tăng so với 98f3963 (gồm cả việc của hls.js). Thay phần bậc thấp (R4): mạng 300 kbps (bậc 480 nhẹ nhất 277 kbps
nên card ở bậc 240) tới khi một card ở nửa dưới màn hình phát bậc 240, rồi bỏ giới hạn và cuộn để card khác tải segment;
video đó lên bậc cao trong 4 s (`videoWidth` đổi), không có `waiting` dài hơn 10 ms, `currentTime` liên tục,
`droppedVideoFrames` không tăng hơn lượt không đổi bậc; quay màn hình từng frame quanh điểm đổi không có frame đen,
poster hay skeleton; ở detail có tiếng, tiếng thu từ `captureStream()` không có khoảng lặng ở điểm đổi. Số nghiệm thu đo
trên Chrome thật (PC, A04s); Chromium cloud không có H.264 nên đo bằng thang AV1 cùng tỷ lệ dung lượng.

```gherkin
Given bản HLS và bản 480 cố định trên cùng máy, cùng kịch bản 4G chậm
When đo 9 lượt mỗi bản
Then bản HLS đứng hình trung bình không quá 0,6 lần mỗi video
And số video không kịp chạy của bản HLS không nhiều hơn bản 480

Given card đang phát bậc 240 ở 300 kbps
When mạng đổi sang không giới hạn và một video khác tải xong segment
Then trong 4 s video đang hiện có videoWidth của bậc 480 và không có sự kiện waiting dài hơn 10 ms
And không frame nào quanh điểm đổi là frame đen, poster hay skeleton
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Data | `hlsSrc` trong `mediaItems[]` video | Playlist tổng cho card và detail (R2, R3, R5) |
| Data | `src`, `cardSrc` | File bậc 960 và 480, nguồn khi không có Media Source (R3) |
| Vendor | `hls.js` `1.7.3`, `assets/vendor/hls.light-1.7.3.min.js` | Player, thay phần bậc thấp (R3, R4) |
| File | `<id>/master.m3u8`, `<bậc>.m3u8`, `<bậc>.mp4` | Thang chất lượng (R1, R2) |
| Script | `scripts/site/build-video-ladder.mjs` | Sinh thư mục thang chất lượng từ một video gốc |

## UI

Không đổi giao diện; card video và player giữ component hiện có
([MediaCard](../../design-system/components/MediaCard/README.md), [Primary](../../design-system/components/Primary/README.md)).

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1, R2 | `tests/site/video-ladder.test.mjs`: thứ tự bậc, segment 2 s, byte range khớp file, `BANDWIDTH` từ byte thật; thang trong assets là H.264, thang fixture AV1 luôn được đọc |
| R1 | `tests/site/primary-video-keyframes.test.mjs` đọc cả fMP4 (keyframe nằm trong `moof`, không trong `moov`) |
| R3 | `tests/site/video-delivery.e2e.mjs` (thang AV1 trong `tests/site/fixtures/video-ladder`): card bậc 480, detail bậc đầu tiếp đúng giây, viewer giữ nguồn; không có Media Source thì phát `cardSrc`; không có `hlsSrc` hoặc Media Source thì không tải hls.js |
| R4 | `tests/site/video-delivery.e2e.mjs`: server giới hạn 60 kbps rồi bỏ giới hạn, một video khác tải segment; frame sau giây 2 lên 480 trong 4 s, frame cách nhau dưới 250 ms, `waiting` dưới 100 ms (cloud đo 2 tới 6 ms; ngưỡng 10 ms đo ở R6). Tắt luật thay thì ca này đỏ |
| R5 | `tests/site/video-delivery.e2e.mjs`: item thiếu `hlsSrc` phát `cardSrc`, không nạp playlist; không có Media Source thì không nạp hls.js |
| R6 | `tests/site/video-delivery-measure.mjs --base <98f3963> --candidate <nhánh> --h2`, chạy tay: 4G chậm 9 lượt mỗi bản (đứng hình, video không kịp chạy), mạng nhanh (thời gian chạy), lượt đổi bậc (lên bậc, `waiting`, frame tối, `droppedVideoFrames`); A04s thêm `DEVICE_CDP`. Main thread PC: `pnpm qa:scroll-trace`; A04s cuộn masonry (2026-10-26, 3 lượt mỗi bản, trace CDP): hls.js bận hơn khoảng 2 điểm so với chặn hls.js, 81,8 so với 71,6 fps, 24 so với 49 frame quá 33 ms. Tiếng ở detail kiểm tay |

## Gate còn mở

- iPhone từ iOS 17.1 chạy hls.js qua Managed Media Source, chưa kiểm; owner chưa có iPhone (2026-10-25). Cũng chưa kiểm
  Safari phát thẳng file fMP4 của bậc (nhánh không Media Source); Chromium đã đọc đúng thời lượng và tua được.
- CMS phase 2: upload video phải sinh cùng thang chất lượng. Chọn [Cloudflare Stream](https://developers.cloudflare.com/stream/pricing)
  (mã hóa miễn phí, 5 USD mỗi 1.000 phút lưu mỗi tháng, 1 USD mỗi 1.000 phút phát) hay chạy script trên máy owner; ghi
  vào [CMS](cms.md) khi CMS mở lại.
- Giới hạn [Cloudflare static assets](https://developers.cloudflare.com/workers/platform/limits): 25 MiB mỗi file,
  20.000 file (Free). Thang 240, 480, 960 thêm 5 file mỗi video (site hiện khoảng 5.200
  file).

## Chú thích thuật ngữ

- **Adaptive bitrate**: video có nhiều bản chất lượng, trình duyệt tự chọn bản theo tốc độ mạng lúc phát.
- **HLS**: chuẩn phát video theo đoạn nhỏ của Apple, dùng playlist `.m3u8`.
- **hls.js**: thư viện JS phát HLS bằng Media Source, tự chọn bậc và quản lý phần đã tải.
- **Media Source**: API cho JS tự nạp từng đoạn video vào `<video>` (MSE); Managed Media Source là bản cho iPhone.
- **Buffer**: phần video đã tải sẵn quanh vị trí đang phát.
- **Bậc**: một bản chất lượng của video (rendition), ở đây gọi theo chiều rộng.
- **Playlist tổng**: playlist liệt kê các bậc (multivariant playlist); playlist bậc liệt kê segment.
- **Segment**: một đoạn video vài giây, đơn vị trình duyệt tải và đổi bậc.
- **fMP4**: MP4 chia mảnh, mỗi segment là một cặp `moof` và `mdat`.
- **Byte range**: tải một khoảng byte của file thay vì cả file.
- **CRF**: mức nén theo chất lượng của H.264; số càng lớn file càng nhẹ.
- **Keyframe**: frame giải mã độc lập; tua và đổi bậc bắt đầu từ đây.
- **4:2:0**: cách lấy mẫu màu chuẩn của video web, GPU giải mã được.
- **RTT**: thời gian một vòng gửi và nhận trên mạng.
