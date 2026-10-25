---
title: Video thích ứng mạng (adaptive bitrate)
status: planned
source: []
tests: []
notion: https://app.notion.com/p/404332849a0e81aa9718f91db2d05e51
updated: 2026-10-25
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
lưu thêm bản riêng.

hls.js bản `1.7.3` (Apache-2.0), dùng bản light (bỏ phụ đề, track tiếng riêng, DRM, quảng cáo chèn): 119 KB gzip,
386 KB chưa nén (đo từ gói npm). Ghim đúng version trong `package.json` như các vendor khác, `prepare-static-assets.mjs`
chép `dist/hls.light.min.js` sang `assets/vendor/`; chỉ trang có item video nạp, không chặn render. Không dùng tag
`latest` hay canary: gói từng có hai bản canary 1.7.0 chứa mã độc
([OSV MAL-2026-3019](https://osv.dev/vulnerability/MAL-2026-3019)), bản 1.7.3 phát hành 2026-09-11. Giây video truyền
giữa card và detail như media-card R4, R6; poster, lỗi video và lịch phát không đổi.

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

Áp dụng khi video phát bằng hls.js (R3). Khi bậc hls.js tự chọn cho segment kế cao hơn bậc của phần đã tải phía trước
vị trí phát:

- Phía trước: runtime gọi `hls.nextLevel = -1` (vẫn để hls.js tự chọn bậc). hls.js xóa phần phía trước kể từ điểm mà
  segment bậc cao kịp tải về trước khi phát tới, rồi tải lại phần đó ở bậc cao
  ([hls.js API](https://github.com/video-dev/hls.js/blob/v1.7.3/docs/API.md#hlsnextlevel)); segment đang phát giữ
  nguyên nên không đứng hình. Segment 2 s nên bậc cao hiện sau khoảng một segment cộng thời gian tải.
- Phía sau: video lặp (`loop`) nên khi bắt đầu phát segment bậc cao đầu tiên, hls.js tự xóa phần bậc thấp từ giây 0 tới
  trước segment đó ([`loopBackBufferFlush`](https://github.com/video-dev/hls.js/blob/v1.7.3/docs/API.md#loopbackbufferflush),
  mặc định bật); vòng sau tải và phát bậc cao từ giây 0.
- Tua (owner chọn 2026-10-25): tua về đoạn bậc thấp còn trong buffer thì phát ngay bằng phần có sẵn, rồi luật phía trước
  ở trên thay phần sau nó nên nét lên sau khoảng một segment; tua về đoạn đã bị xóa thì hls.js tải ở bậc hiện tại như mọi
  lần tua tới đoạn chưa tải.
- Xuống bậc không xóa gì: phần bậc cao đã tải phát hết rồi mới tới bậc thấp.

Việc thay phải liền mạch (owner 2026-10-25): người xem chỉ thấy hình nét lên, không nhận ra có tải lại.

- Không đứng hình: không sự kiện `waiting`, `currentTime` chỉ tăng (trừ lúc lặp về 0), runtime không tự tua.
- Không lóe: không frame đen, không hiện lại poster, skeleton hay `.is-media-error`; Kính và nền blur vẽ liền.
- Khung đứng yên: mọi bậc cùng tỷ lệ, khung giữ `object-fit` như hiện tại nên layout không dịch khi `videoWidth` đổi.
- Tiếng liền ở detail: luồng AAC mã hóa một lần rồi chép nguyên vào mọi bậc, nên điểm nối không có khoảng lặng hay tiếng
  click.
- Hình chỉ đổi ở keyframe đầu segment; frame rơi quanh điểm đổi không nhiều hơn lúc phát không đổi bậc.

Đổi lại tốn mạng cho phần tải lại, tối đa bằng phần đã tải phía trước (clip 6 tới 15 s có thể đã tải hết). Chỉ xảy ra
khi mạng vừa nhanh lên nên chấp nhận.

```gherkin
Given card đang phát bậc 240 của clip 10 s, đã tải tới giây 6, đang xem giây 4
When mạng nhanh lên và hls.js chọn bậc 480 cho segment kế
Then phần sau điểm đổi bị xóa và tải lại ở bậc 480, video không có sự kiện waiting
And vòng lặp sau phát bậc 480 từ giây 0

Given mạng đã nhanh, primary đã tải lại phía trước ở bậc 960 nhưng chưa phát tới segment bậc 960 đầu tiên
When người xem tua về giây 2 còn bậc 480 trong buffer
Then video phát ngay từ giây 2 ở bậc 480, không waiting
And trong khoảng một segment sau đó video lên bậc 960

Given primary đang phát bậc 960 đã tải phía trước
When mạng chậm đi và hls.js chọn bậc 480
Then phần bậc 960 đã tải không bị xóa và phát hết trước khi tới bậc 480
```

### R5. Dữ liệu và script

Item video thêm trường tùy chọn `hlsSrc` (đường dẫn `master.m3u8`). `src` trỏ file bậc 960 (hoặc bậc lớn nhất khi bản
gốc nhỏ hơn 960), `cardSrc` trỏ file bậc 480; `source`, `sha256` là file `src`. Thiếu `hlsSrc` thì runtime phát `src`,
`cardSrc` như hiện tại. Mỗi video có một thư mục `<id>/` chứa `master.m3u8`, `<bậc>.m3u8`, `<bậc>.mp4`.

`scripts/site/build-video-ladder.mjs <video gốc> <thư mục ra>` sinh thư mục trên từ một video gốc và không sửa dữ liệu
card; dữ liệu card sửa tay. Video tạm sinh từ file 960 hiện có, không chạy `build-placeholder-media.mjs`.

```gherkin
Given item video không có hlsSrc
When trình duyệt có Media Source
Then card vẫn phát cardSrc, primary vẫn phát src như hiện tại và trang không nạp hls.js
```

### R6. Nghiệm thu bằng số đo

Kịch bản: viewport A04s (384x724, DPR 1,875), cuộn masonry 16 nấc 400 px, mỗi nấc chờ 1,5 s; mạng 4G chậm 1,6 Mbps, RTT
150 ms (mức Lighthouse dùng cho mobile), tắt cache; mỗi bản 9 lượt xen kẽ. So với bản 480 cố định (98f3963; đo cloud
bằng bản AV1 cùng tỷ lệ dung lượng: 1/46 video không kịp chạy, 1,15 lần đứng hình mỗi video), bản HLS phải có số lần
đứng hình mỗi video không quá 0,6 và số video không kịp chạy không nhiều hơn. Mạng nhanh và PC không kém đi: video chạy
trong 50 ms sau khi hiện quá 1/2; frame trên 33 ms và main thread bận trên PC không tăng so với 98f3963 (gồm cả việc của
hls.js). Thay phần bậc thấp (R4): mạng đổi từ 4G chậm sang không giới hạn giữa lượt, video đang hiện lên bậc cao trong 4 s
(`videoWidth` đổi), không có `waiting`, `currentTime` liên tục, `droppedVideoFrames` không tăng hơn lượt không đổi bậc;
quay màn hình từng frame quanh điểm đổi không có frame đen, poster hay skeleton; ở detail có tiếng, tiếng thu từ
`captureStream()` không có khoảng lặng ở điểm đổi. Số nghiệm thu đo trên Chrome thật (PC, A04s); Chromium cloud không
có H.264 nên đo bằng thang AV1 cùng tỷ lệ dung lượng.

```gherkin
Given bản HLS và bản 480 cố định trên cùng máy, cùng kịch bản 4G chậm
When đo 9 lượt mỗi bản
Then bản HLS đứng hình trung bình không quá 0,6 lần mỗi video
And số video không kịp chạy của bản HLS không nhiều hơn bản 480

Given card đang phát bậc 240 trên 4G chậm
When mạng đổi sang không giới hạn
Then trong 4 s video đang hiện có videoWidth của bậc 480 và không có sự kiện waiting
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
| R1, R2 | chưa có test: unit đọc thư mục mẫu, kiểm bậc, keyframe, thứ tự bậc, `BANDWIDTH` |
| R1 | `tests/site/primary-video-keyframes.test.mjs` phải đọc được fMP4 (keyframe nằm trong `moof`, không trong `moov`) |
| R3 | chưa có test: e2e cả hai nhánh trên Chromium cloud bằng thang AV1 |
| R4 | chưa có test: e2e giả lập mạng chậm rồi nhanh, kiểm `videoWidth` đổi, không `waiting`, vòng lặp sau ở bậc cao |
| R5 | chưa có test: e2e item thiếu `hlsSrc` phát `cardSrc`, `src`, không nạp hls.js |
| R6 | chưa có test: đưa script đo mạng vào `tests/site/` |

## Gate còn mở

- 6 tới 14 card cùng phát là 6 tới 14 instance hls.js, mỗi instance tự đo mạng và có worker riêng. Chưa đo bộ nhớ, main
  thread và cách các instance tranh băng thông trên PC, A04s; R6 đo. Quá tải thì cân nhắc tắt worker (fMP4 không cần
  chuyển mã) hoặc dùng chung số đo băng thông.
- Thời điểm gọi `hls.nextLevel = -1` (R4) và hành vi thật của `nextLevelSwitch` với segment 2 s chưa đo; bước thử đầu
  của plan đo trên PC, A04s với mạng giả lập lúc chậm lúc nhanh.
- Sau khi hls.js xóa phần bậc thấp phía sau, vòng lặp kế phải tải lại giây 0; chưa đo có khựng ở chỗ nối vòng không. Khựng
  thì tắt `loopBackBufferFlush` để giữ phần thấp và cho luật phía trước thay dần từ giây 0.
- iPhone từ iOS 17.1 chạy hls.js qua Managed Media Source, chưa kiểm.
- [CẦN LÀM RÕ: owner có iPhone để đo Safari không.]
- CMS phase 2: upload video phải sinh cùng thang chất lượng. Chọn [Cloudflare Stream](https://developers.cloudflare.com/stream/pricing)
  (mã hóa miễn phí, 5 USD mỗi 1.000 phút lưu mỗi tháng, 1 USD mỗi 1.000 phút phát) hay chạy script trên máy owner; ghi
  vào [CMS](cms.md) khi CMS mở lại.
- Giới hạn [Cloudflare static assets](https://developers.cloudflare.com/workers/platform/limits): 25 MiB mỗi file,
  20.000 file (Free). Thang 240, 480, 960 thêm 5 file mỗi video (42 video tạm thêm 210 file; site hiện khoảng 4.000
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
