---
title: Kính chờ ảnh và màn trắng khi vào trang
status: planned
tests: []
notion: none
updated: 2026-10-04
---

# Kính chờ ảnh và màn trắng khi vào trang

## Mục đích

Owner thử M02b trên điện thoại ngày 2026-10-04 và thấy hai vấn đề. Vuốt nhanh
thì masonry Advertising chỉ có vùng trắng, không báo đang tải. Mở ảnh và F5 thì
không có motion. Spec này định nghĩa ba motion owner đã chốt: kính chờ ảnh, mở
ảnh tại chỗ, màn trắng khi vào thẳng trang. Thread M02b làm code theo spec.
Lỗi Back history, dòng HTML thô sau F5 và motion phóng to của viewer nằm ngoài
spec này. Bản chạy thử: [Kính chờ Trường Thịnh](https://claude.ai/artifact/PNv9Hg2Tpc1b2sLEEjQxZf).

## Hành vi

### R1. Kính chờ trên card masonry

Mọi card đang mount của masonry chính và related mà ảnh chưa sẵn sàng đều có
một lớp kính phủ kín khung card. Kính dùng ngôn ngữ của skeleton cuối masonry:
trường màu lấy từ 12 preset Flow (`SKELETON_FLOW_PRESETS`, vẽ bằng
`staticBackground`), một lớp phủ trắng mờ và viền sáng mảnh, góc vuông. Preset
chọn ổn định theo media id, nên card remount giữ màu cũ. Trường màu trôi chậm
như skeleton; chỉ card giao viewport và tab đang hiện mới chuyển động.

Kính chỉ phủ card đã mount (viewport cộng một màn hình mỗi phía,
`catalog-runtime.mjs`), không ép mount toàn catalog. Khung card giữ đúng kích
thước cuối trong lúc tải. Motion card vào viewport (đi vào vị trí, fade khi vào
lại) giữ như card thường; kính thuộc khung card nên đi cùng card.

```gherkin
Given owner vuốt nhanh masonry Advertising trên điện thoại
When các card mới mount mà ảnh chưa tải xong
Then mỗi card hiện kính màu skeleton đúng kích thước cuối, không còn vùng trắng
And chỉ kính của card trong viewport chuyển động
And cùng một card luôn mang cùng một màu kính
```

### R2. Hiện ảnh trên card

Ảnh giải mã xong (`img.decode()`) thì kính mờ dần để lộ ảnh tại chỗ, đồng thời
ảnh thu nhẹ về kích thước thật. Kính được gỡ khỏi DOM sau khi mờ hết. Hiệu ứng
thu dùng thuộc tính `scale`, không đè `transform` của hover zoom.

```gherkin
Given một card đang hiện kính
When ảnh của card giải mã xong
Then kính mờ dần trong 600ms và ảnh thu từ 1.04 về 1
And sau đó card không còn node kính và hover zoom chạy như cũ
```

### R3. Ảnh có sẵn

Ảnh đã `complete` lúc card mount (cache, hoặc tải xong trước khi mount) thì
không hiện kính; ảnh dùng fade card hiện có. Không có khung hình nào lóe kính.

```gherkin
Given ảnh của card đã có trong cache trình duyệt
When card mount
Then không có kính và ảnh hiện bằng fade 0.6s như card thường
```

### R4. Mở ảnh tại chỗ

Bấm một card ở masonry chính hoặc ở related đều mở detail cùng một cách: ảnh
primary hiện tại chính khung của nó, không có ảnh bay từ card, không clone.
Đây là motion chủ đạo của trang: kính màu tan, để lộ ảnh qua một lớp sương
blur, rồi sương tan dần như hơi nước trên kính, ảnh thu nhẹ về kích thước thật.
Ảnh đã sẵn sàng thì bỏ bước chờ, chạy ngay phần sương tan.

Morph primary sang viewer phóng to (`photo-viewer.mjs`, đo từ ảnh primary)
giữ nguyên.

```gherkin
Given trang Advertising đang mở masonry chính hoặc related
When người xem bấm một card
Then khung primary hiện kính nếu ảnh chưa tải, hoặc sương blur nếu ảnh đã sẵn
And khi ảnh sẵn sàng, sương tan và ảnh thu từ 1.04 về 1 tại chỗ
And không có ảnh bay hay clone giữa card và primary
```

### R5. Kính thay vòng xoay trên primary và card nhiều media

Ảnh primary đang tải dùng cùng kính của R1, thay `span.media-load-ring`. Card
nhiều media dùng kính cho media đang hiện, thay `.advertising-card-media__loading`
và vòng `::after` khi ảnh có `.lazyloading`. `aria-busy` giữ trên khung đang tải.

```gherkin
Given primary đổi sang một ảnh chưa tải
When ảnh đang tải
Then khung primary hiện kính, không có vòng xoay, khung có aria-busy
```

### R6. Màn trắng khi vào thẳng trang

Mọi lần vào thẳng một trang, trên mọi route public, mở bằng route veil hiện có:
F5, gõ link, mở link từ Zalo hay Google (navigation type `navigate`, `reload`,
`back_forward` không từ bfcache). Veil trắng phủ trang từ khung hình đầu, header
nằm trên veil nên intro header chạy cùng lúc. Khi trang mount xong, veil kéo mở
như chuyển trang (`playRouteEnter`), rồi entrance đang có của trang chạy tiếp
(kicker, word fade tiêu đề, filter). Scroll cue và mọi phần chưa dựng nằm dưới
veil.

Không có veil khi trình duyệt khôi phục trang từ bfcache (`pageshow` có
`persisted`) và khi giảm chuyển động.

```gherkin
Given người xem ở trang Advertising
When người xem nhấn F5
Then trang trắng từ khung hình đầu, chỉ header hiện
And khi trang dựng xong, veil mờ đi trong 1s như chuyển trang
And tiêu đề, kicker, filter vào theo nhịp đang có
And không có chữ HTML thô hay scroll cue nào lộ ra trước khi veil mở
```

### R7. Mạng chậm và lỗi script

Mạng chậm không được làm mất motion. Veil giữ tới khi script dựng trang chạy
xong rồi mới kéo mở. Bỏ motion (fallback) chỉ khi script motion lỗi, hoặc khi
`DOMContentLoaded` đã qua mà motion vẫn chưa nhận trang. Không dùng mốc thời gian
cố định tính từ `<head>` (hiện là 2.5s) làm điều kiện bỏ motion. Fallback gỡ veil
ngay để nội dung hiện đầy đủ.
[CẦN LÀM RÕ: thời gian chờ tối đa sau `DOMContentLoaded` trước khi fallback,
thread M02b đề xuất theo số đo trên A05s.]

```gherkin
Given mạng chậm, script tải xong sau 4s
When người xem mở trang Advertising
Then veil giữ trắng tới khi script chạy xong rồi mới kéo mở, entrance vẫn chạy
```

```gherkin
Given motion.js lỗi khi tải
When trang dựng xong HTML
Then veil gỡ ngay, nội dung hiện đầy đủ, không có motion
```

### R8. Giảm chuyển động

Với `prefers-reduced-motion: reduce`, kính đứng yên (không trôi), ảnh hiện
ngay khi giải mã xong (không mờ dần, không thu), không có sương tan, không có
veil khi vào thẳng trang.

```gherkin
Given người xem bật giảm chuyển động
When card và primary tải ảnh và người xem nhấn F5
Then kính không trôi, ảnh hiện ngay, trang hiện ngay không có veil
```

### R9. Ngân sách hiệu năng

Kính trên card chỉ animate `transform` và `opacity` của một lớp màu dựng sẵn;
không dùng `backdrop-filter` trên card trong lúc chờ. Blur thật chỉ có ở lớp
sương của primary (một phần tử, chỉ trong lúc mở ảnh). Card ngoài viewport và
tab ẩn thì dừng trôi. Kính gỡ khỏi DOM sau khi ảnh hiện.

```gherkin
Given Galaxy A05s, masonry đầy card đang chờ ảnh
When owner vuốt nhanh từ đầu masonry tới footer
Then trace không có frame rơi do kính
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Data | `SKELETON_FLOW_PRESETS`, `staticBackground` (`skeleton-flow.mjs`) | Màu kính, dùng chung với skeleton |
| DOM | Phần tử kính `aria-hidden` trong khung media | Runtime thêm khi ảnh chưa `complete`, gỡ sau khi mờ hết |
| DOM | Lớp sương trong khung primary | Chỉ tồn tại trong lúc mở ảnh |
| Root class | `route-enter` trên `<html>` | Prepaint thêm cho mọi lần vào thẳng trang (R6) |
| Boot | `window.__ttMotionBoot` | Đổi điều kiện fallback theo R7 |

Tên class cụ thể do thread M02b đặt khi làm code, theo vai trò ở trên.

## UI

Giá trị dưới đây là bản owner xem trong bản chạy thử. Khi code xong, chúng
chuyển vào [Motion](../../design-system/motion.md) và component mới của Design
System, rồi bảng này được thay bằng link.

| Phần | Giá trị |
| --- | --- |
| Lớp màu kính | Preset Flow, phủ rộng hơn khung 30% mỗi phía |
| Trôi | `translate ±5% / ±4%`, `rotate ±7deg`, `scale 1 → 1.1`; 6, 7 hoặc 8s `ease-in-out`, lặp đảo chiều, lệch pha theo thứ tự card |
| Lớp phủ kính | Trắng alpha 0.16, viền trong 1px trắng alpha 0.40, góc vuông |
| Card hiện ảnh | Kính `opacity 1 → 0` 600ms `--ease`; ảnh `scale 1.04 → 1` 900ms `cubic-bezier(0.23, 1, 0.32, 1)` (power4.out) |
| Primary hiện ảnh | Kính màu tan 300ms `--ease`; sương `blur(28px) saturate(1.08) brightness(1.04)` tint trắng 0.12, `opacity 1 → 0` 900ms `cubic-bezier(0.45, 0, 0.2, 1)` trễ 120ms; ảnh `scale 1.04 → 1` 1.2s power4.out |
| Veil | Route veil trắng hiện có; giữ tới khi mount, mở 1s power4.inOut |

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1–R3 | chưa có test |
| R4–R5 | chưa có test |
| R6–R7 | chưa có test |
| R8 | chưa có test |
| R9 | chưa có test; trace Chrome trên A05s qua CDP |

## Gate còn mở

- Owner duyệt bản chạy thử và spec này.
- Thread M02b làm code R1–R9 và viết test; kiểm Chromium, WebKit trên cloud và
  A05s thật.
- R9 trên A05s: nếu card vẫn mượt với `backdrop-filter` thật trong lúc chờ
  (owner muốn kính blur), PR code được dùng blur thật cho card; không mượt thì
  giữ lớp màu dựng sẵn.
- PR code cập nhật Design System cùng lúc: component kính chờ (preview sinh từ
  CSS website), [Motion](../../design-system/motion.md) mục ảnh trong card,
  detail và route veil, [Media card](../../design-system/components/MediaCard/README.md),
  [Vòng tải](../../design-system/components/LoadRing/README.md) (bỏ phần
  Advertising); cập nhật phần Advertising của
  [khung chờ và vòng tải](image-loading-progress.md).
- R7: thời gian chờ tối đa trước fallback (mục `CẦN LÀM RÕ`).

## Chú thích thuật ngữ

- **Kính chờ**: lớp màu trôi chậm phủ khung ảnh trong lúc ảnh tải.
- **Preset Flow**: bộ bốn màu và điểm neo dùng cho skeleton cuối masonry.
- **Route veil**: lớp trắng toàn màn hình che trang khi chuyển route.
- **bfcache**: bộ nhớ trình duyệt giữ nguyên trang để Back hiện tức thì.
- **Fallback**: trạng thái bỏ motion để nội dung vẫn hiện khi script lỗi.
- **Prepaint**: script trong `<head>` đặt trạng thái đầu trước khi trang vẽ.
- **Trace**: bản ghi hiệu năng từng frame của trình duyệt.
