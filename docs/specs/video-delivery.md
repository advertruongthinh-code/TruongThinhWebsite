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
nhanh, để phone trên 4G yếu bớt video không kịp chạy và bớt đứng hình chờ tải. Dùng HLS mà trình duyệt phát sẵn, không
thêm thư viện player. Spec này sở hữu file video (thang chất lượng, playlist) và cách runtime chọn nguồn; lịch phát,
player và handoff giữa card và detail vẫn thuộc [media-card](media-card.md) và [player primary](primary-video-player.md).
Upload video của CMS nằm ngoài spec này (xem Gate còn mở).

## Hành vi

### R1. Thang chất lượng cho mỗi video

Mỗi video có các bậc rộng 240, 480, 960 và 1920 px; chỉ giữ bậc không rộng hơn bản gốc, chiều cao theo tỷ lệ gốc (làm
tròn về số chẵn). Mọi bậc là H.264 High 4:2:0 để GPU giải mã được ([media-card R4](media-card.md#r4-video-trên-card)),
cùng số khung hình mỗi giây với bản gốc, keyframe tối đa mỗi 0,5 s
([player R3](primary-video-player.md#r3-mã-hóa-video-cho-tua-mượt)). Segment dài 2 s và bắt đầu bằng keyframe: clip chỉ
dài 6 tới 15 s, segment 6 s như Apple khuyên thì trình duyệt không kịp đổi bậc trong một clip.

Mỗi bậc là một file fMP4 `<bậc>.mp4`; playlist của bậc trỏ từng segment bằng `EXT-X-BYTERANGE`, nên mỗi bậc chỉ có hai
file. Bậc bằng chiều rộng bản gốc copy luồng hình (không mã hóa lại) khi bản gốc đã đúng chuẩn trên. Video có tiếng thì
mọi bậc mang cùng một luồng AAC 48 kbps; video không tiếng thì không có luồng tiếng.

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

### R2. Hai playlist tổng: card và detail

`card.m3u8` chỉ liệt kê bậc tới 480 vì card hiện rộng tối đa khoảng 440 px CSS; `master.m3u8` liệt kê mọi bậc cho
primary và viewer. Bậc đứng đầu là bậc phát đầu tiên (Apple 1.32): card bắt đầu ở 480, detail ở 960, giống bản cố định
hiện tại khi mạng nhanh; mạng chậm thì trình duyệt tự xuống bậc thấp hơn. Các bậc còn lại xếp theo bitrate tăng dần.

Mỗi dòng `EXT-X-STREAM-INF` có `BANDWIDTH` (bitrate segment lớn nhất), `AVERAGE-BANDWIDTH` (trung bình cả bậc),
`CODECS`, `RESOLUTION`, `FRAME-RATE` theo
[chuẩn HLS của Apple](https://developer.apple.com/library/tvos/documentation/General/Reference/HLSAuthoringSpec/index.html)
9.1, 9.2, 9.13 tới 9.15. Script tính hai số bitrate từ byte thật của segment, vì ffmpeg chỉ ghi bitrate tiếng khi mã hóa
theo CRF (đo thử: `BANDWIDTH=52800` cho cả ba bậc).

```gherkin
Given video có bậc 240, 480, 960
When đọc card.m3u8 và master.m3u8
Then card.m3u8 có 480 rồi 240; master.m3u8 có 960 rồi 240, 480
And BANDWIDTH của mỗi bậc bằng bitrate segment lớn nhất tính từ byte range của playlist bậc đó
```

### R3. Runtime chọn nguồn

Trang kiểm một lần `video.canPlayType("application/vnd.apple.mpegurl")`. Khác rỗng (Safari, Chrome Android, Chrome và
Edge PC từ bản 142 [CẦN LÀM RÕ: kiểm trên PC và A04s]) thì layer video của card dùng `cardHlsSrc`, primary và viewer dùng
`hlsSrc`; trình duyệt tự đo mạng và đổi bậc. Rỗng (Firefox, Chrome cũ) thì phát file bậc cố định: card dùng `cardSrc`
(file bậc 480), primary và viewer dùng `src` (file bậc 960). File fMP4 của bậc phát thẳng được như mp4 thường nên không
lưu thêm bản riêng.

Không thêm hls.js. Firefox không có thích ứng mạng, đổi lại trang không thêm khoảng 150 KB JS gzip
([depscope](https://depscope.dev/pkg/npm/hls.js), bản 1.6.16) và không phụ thuộc gói npm từng có bản phát hành chứa mã
độc ([OSV MAL-2026-3019](https://osv.dev/vulnerability/MAL-2026-3019): hai bản canary 1.7.0). Giây video truyền giữa card
và detail như media-card R4, R6; poster, lỗi video và lịch phát không đổi.

```gherkin
Given Chrome PC phát được HLS
When card video hiện quá 1/2 dưới navbar
Then layer video của card nạp card.m3u8 và phát tắt tiếng như media-card R4
And mở detail thì primary nạp master.m3u8 và phát tiếp từ giây của card

Given trình duyệt không phát được HLS
When mở masonry rồi mở detail của card video
Then card phát file 480.mp4, primary phát file 960.mp4 và không có request .m3u8
```

### R4. Dữ liệu và script

Item video thêm hai trường tùy chọn: `hlsSrc` (đường dẫn `master.m3u8`) và `cardHlsSrc` (`card.m3u8`). `src` trỏ file
bậc 960 (hoặc bậc lớn nhất khi bản gốc nhỏ hơn 960), `cardSrc` trỏ file bậc 480; `source`, `sha256` là file `src`. Thiếu
`hlsSrc` thì runtime phát `src`, `cardSrc` như hiện tại. Mỗi video có một thư mục `<id>/` chứa `master.m3u8`,
`card.m3u8`, `<bậc>.m3u8`, `<bậc>.mp4`.

`scripts/site/build-video-ladder.mjs <video gốc> <thư mục ra>` sinh thư mục trên từ một video gốc và không sửa dữ liệu
card; dữ liệu card sửa tay. Video tạm sinh từ file 960 hiện có, không chạy `build-placeholder-media.mjs`. Server local và
demo trả `.m3u8` với mime `application/vnd.apple.mpegurl`.

```gherkin
Given item video không có hlsSrc và cardHlsSrc
When trình duyệt phát được HLS
Then card vẫn phát cardSrc, primary vẫn phát src như hiện tại
```

### R5. Nghiệm thu bằng số đo

Kịch bản: viewport A04s (384x724, DPR 1,875), cuộn masonry 16 nấc 400 px, mỗi nấc chờ 1,5 s; mạng 4G chậm 1,6 Mbps, RTT
150 ms (mức Lighthouse dùng cho mobile), tắt cache; mỗi bản 9 lượt xen kẽ. So với bản 480 cố định (98f3963; đo cloud
bằng bản AV1 cùng tỷ lệ dung lượng: 1/46 video không kịp chạy, 1,15 lần đứng hình mỗi video), bản HLS phải có số lần
đứng hình mỗi video không quá 0,6 và số video không kịp chạy không nhiều hơn. Mạng nhanh và PC không kém đi: video chạy
trong 50 ms sau khi hiện quá 1/2; frame trên 33 ms và main thread bận trên PC không tăng so với 98f3963. Số nghiệm thu đo
trên Chrome thật (PC, A04s); Chromium cloud không có H.264 và HLS nên chỉ đo được nhánh không HLS.

```gherkin
Given bản HLS và bản 480 cố định trên cùng máy, cùng kịch bản 4G chậm
When đo 9 lượt mỗi bản
Then bản HLS đứng hình trung bình không quá 0,6 lần mỗi video
And số video không kịp chạy của bản HLS không nhiều hơn bản 480
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Data | `hlsSrc`, `cardHlsSrc` trong `mediaItems[]` video | Playlist tổng của detail và card (R3, R4) |
| Data | `src`, `cardSrc` | File bậc 960 và 480, nguồn khi không phát được HLS |
| File | `<id>/master.m3u8`, `card.m3u8`, `<bậc>.m3u8`, `<bậc>.mp4` | Thang chất lượng (R1, R2) |
| Script | `scripts/site/build-video-ladder.mjs` | Sinh thư mục thang chất lượng từ một video gốc |
| Mime | `.m3u8` -> `application/vnd.apple.mpegurl` | `serve-static-parity.mjs`, demo Cloudflare |

## UI

Không đổi giao diện; card video và player giữ component hiện có
([MediaCard](../../design-system/components/MediaCard/README.md), [Primary](../../design-system/components/Primary/README.md)).

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1, R2 | chưa có test: unit đọc thư mục mẫu, kiểm bậc, keyframe, thứ tự bậc, `BANDWIDTH` |
| R1 | `tests/site/primary-video-keyframes.test.mjs` phải đọc được fMP4 (keyframe nằm trong `moof`, không trong `moov`) |
| R3 | chưa có test: e2e nhánh không HLS trên Chromium cloud; nhánh HLS đo tay trên PC, A04s |
| R4 | chưa có test: e2e item thiếu `hlsSrc` phát `cardSrc`, `src` |
| R5 | chưa có test: đưa script đo mạng vào `tests/site/` |

## Gate còn mở

- Chrome PC phát HLS gốc từ bản 142 theo [tech-ish](https://tech-ish.com/2025/12/08/google-chrome-microsoft-edge-chromium-native-hls-playback-desktop/)
  (tin công nghệ, chưa có nguồn chính thức của Chrome). Chưa kiểm `canPlayType`, fMP4 byte range và đổi bậc trên PC,
  A04s. Không đạt thì đổi segment sang file riêng hoặc MPEG-TS; vẫn không đạt mới tính hls.js, owner quyết.
- Chưa biết trình duyệt đổi bậc thế nào khi 6 tới 14 card cùng tải; R5 đo.
- Mime `.m3u8` trên demo Cloudflare chưa kiểm; sai thì thêm luật vào `src/site/_headers`.
- [CẦN LÀM RÕ: owner có iPhone để đo Safari không.]
- CMS phase 2: upload video phải sinh cùng thang chất lượng. Chọn [Cloudflare Stream](https://developers.cloudflare.com/stream/pricing)
  (mã hóa miễn phí, 5 USD mỗi 1.000 phút lưu mỗi tháng, 1 USD mỗi 1.000 phút phát) hay chạy script trên máy owner; ghi
  vào [CMS](cms.md) khi CMS mở lại.
- Giới hạn [Cloudflare static assets](https://developers.cloudflare.com/workers/platform/limits): 25 MiB mỗi file,
  20.000 file (Free). Thang mới thêm 6 file mỗi video (42 video tạm thêm khoảng 250 file; site hiện khoảng 4.000 file).

## Chú thích thuật ngữ

- **Adaptive bitrate**: video có nhiều bản chất lượng, trình duyệt tự chọn bản theo tốc độ mạng lúc phát.
- **HLS**: chuẩn phát video theo đoạn nhỏ của Apple, dùng playlist `.m3u8`.
- **Bậc**: một bản chất lượng của video (rendition), ở đây gọi theo chiều rộng.
- **Playlist tổng**: playlist liệt kê các bậc (multivariant playlist); playlist bậc liệt kê segment.
- **Segment**: một đoạn video vài giây, đơn vị trình duyệt tải và đổi bậc.
- **fMP4**: MP4 chia mảnh, mỗi segment là một cặp `moof` và `mdat`.
- **Byte range**: tải một khoảng byte của file thay vì cả file.
- **CRF**: mức nén theo chất lượng của H.264; số càng lớn file càng nhẹ.
- **Keyframe**: frame giải mã độc lập; tua và đổi bậc bắt đầu từ đây.
- **4:2:0**: cách lấy mẫu màu chuẩn của video web, GPU giải mã được.
- **RTT**: thời gian một vòng gửi và nhận trên mạng.
