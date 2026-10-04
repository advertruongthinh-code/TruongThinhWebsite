---
title: Skeleton chờ ảnh và màn trắng khi vào trang
status: planned
tests: []
notion: none
updated: 2026-10-04
---

# Skeleton chờ ảnh và màn trắng khi vào trang

## Mục đích

Owner thử M02b trên điện thoại ngày 2026-10-04 và thấy hai vấn đề. Vuốt nhanh
thì masonry Advertising chỉ có vùng trắng, không báo đang tải. Mở ảnh và F5 thì
không có motion. Spec này định nghĩa ba motion owner đã chốt: skeleton chờ ảnh
rồi hiện ảnh qua kính blur, mở ảnh tại chỗ, màn trắng khi vào thẳng trang.
Thread M02b làm code theo spec. Lỗi Back history, dòng HTML thô sau F5 và motion
phóng to của viewer nằm ngoài spec này. Bản chạy thử:
[Kính chờ Trường Thịnh](https://claude.ai/artifact/PNv9Hg2Tpc1b2sLEEjQxZf)
(phiên bản 9).

## Hành vi

### R1. Skeleton card trên card đang tải

Mọi card đang mount của masonry chính và related mà ảnh chưa sẵn sàng đều hiện
đúng skeleton card cuối masonry ([Skeleton Flow](advertising-skeleton-flow.md)),
không dựng component mới: cùng khung, mặt và canvas Flow
(`.advertising-grid__cta-frame`, `__cta-surface`, `__cta-flow`), cùng renderer
`createSkeletonFlowRenderer`, 12 preset và fade vào `600ms`. Khung skeleton phủ
kín khung media; card giữ đúng kích thước cuối. Preset chọn ổn định theo media
id, nên card remount giữ màu cũ.

WebGL dùng chung lease pool với skeleton cuối masonry (`catalog-runtime.mjs`).
Chỉ skeleton giao viewport và tab đang hiện mới chạy. Điện thoại giữ tối đa 2
context sống; skeleton không có context hiện frame tĩnh của chính component
(`staticBackground`). Desktop cũng cần mức trần, vì một màn masonry đang tải có
thể có hơn chục khung; bản chạy thử dùng 8. Skeleton rời viewport thì trả
context và giữ phase để quay lại không giật.

Skeleton chỉ phủ card đã mount (viewport cộng một màn hình mỗi phía), không ép
mount toàn catalog. Motion card vào viewport giữ như card thường; skeleton thuộc
khung media nên đi cùng card.

```gherkin
Given owner vuốt nhanh masonry Advertising trên điện thoại
When các card mới mount mà ảnh chưa tải xong
Then mỗi card hiện skeleton card đúng kích thước cuối, không còn vùng trắng
And tối đa 2 skeleton chạy WebGL, skeleton khác hiện frame tĩnh của component
And cùng một card luôn mang cùng một preset
```

### R2. Hiện ảnh qua kính

Ảnh giải mã xong (`img.decode()`) thì chạy ba bước nối nhau:

1. Lớp kính blur hiện dần trên skeleton đang chạy.
2. Dưới kính, skeleton mờ đi và ảnh hiện lên (crossfade).
3. Kính tan dần để lộ ảnh rõ nét.

Kính dùng token glass chung của skeleton và primary (R10 của
[Skeleton Flow](advertising-skeleton-flow.md)), tăng từ không blur, không tint.
Kính là lớp duy nhất sở hữu `backdrop-filter` và chỉ tồn tại trong ba bước.
Xong bước 3, runtime gỡ kính và skeleton khỏi DOM và trả context WebGL về pool.
Ảnh không đổi `transform`, nên hover zoom chạy như cũ.

```gherkin
Given một card đang hiện skeleton
When ảnh của card giải mã xong
Then kính blur hiện dần trên skeleton
And dưới kính, skeleton và ảnh crossfade
And kính tan dần, ảnh rõ nét
And sau đó card không còn node skeleton hay kính, context WebGL đã được trả
```

### R3. Ảnh có sẵn

Ảnh đã `complete` lúc card mount (cache, hoặc tải xong trước khi mount) thì
không hiện skeleton và không chạy kính; ảnh dùng fade card hiện có.

```gherkin
Given ảnh của card đã có trong cache trình duyệt
When card mount
Then không có skeleton hay kính và ảnh hiện bằng fade 0.6s như card thường
```

### R4. Mở ảnh tại chỗ

Bấm một card ở masonry chính hoặc ở related đều mở detail cùng một cách: ảnh
primary hiện tại chính khung của nó, không có ảnh bay từ card, không clone.

- Ảnh chưa tải: skeleton card thay ảnh primary cũ ngay khi bấm, giữ tới khi ảnh
  giải mã xong, rồi chạy ba bước của R2.
- Ảnh đã có (owner chốt 2026-10-04): không có skeleton; kính phủ lên ảnh primary
  đang xem (khung trống nếu mở lần đầu), crossfade sang ảnh mới, rồi kính tan.
  Ba bước giữ đường cong và độ chồng của R2 nhưng gọn trong `0.6s`, bằng lúc
  skeleton card hiện ra khi ảnh chưa tải (opacity `600ms ease-out`). Xem bảng UI.

Nền blur vùng dư của primary (`data-advertising-photo-glass`) đi cùng ảnh trong
crossfade. Morph primary sang
viewer phóng to (`photo-viewer.mjs`, đo từ ảnh primary) giữ nguyên.

```gherkin
Given trang Advertising đang mở masonry chính hoặc related
When người xem bấm một card mà ảnh chưa tải
Then khung primary hiện skeleton card ngay, không có ảnh bay hay clone
And khi ảnh giải mã xong, primary chạy đúng ba bước kính như card
```

```gherkin
Given người xem đang xem một ảnh ở primary
When người xem bấm một ảnh liên quan đã có trong cache
Then kính phủ lên ảnh cũ, ảnh cũ crossfade sang ảnh mới dưới kính, rồi kính tan
And cả ba bước xong trong 0.6s, bằng lúc skeleton card hiện ra
```

### R5. Skeleton thay vòng xoay

Ảnh primary đang tải dùng skeleton card của R1, thay `span.media-load-ring`.
Card nhiều media dùng skeleton cho media đang hiện, thay
`.advertising-card-media__loading` và vòng `::after` khi ảnh có `.lazyloading`.
`aria-busy` giữ trên khung đang tải.

```gherkin
Given primary đổi sang một ảnh chưa tải
When ảnh đang tải
Then khung primary hiện skeleton card, không có vòng xoay, khung có aria-busy
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

Với `prefers-reduced-motion: reduce`, skeleton đứng yên (frame tĩnh), ảnh thay
skeleton ngay khi giải mã xong, không có kính, không có veil khi vào thẳng trang.

```gherkin
Given người xem bật giảm chuyển động
When card và primary tải ảnh và người xem nhấn F5
Then skeleton không chuyển động, ảnh hiện ngay, không có kính, trang hiện ngay không có veil
```

### R9. Ngân sách hiệu năng

Masonry đang tải phải đạt cùng gate điện thoại của skeleton
([Skeleton Flow](advertising-skeleton-flow.md), R10): median tối thiểu `30fps`,
không long task trên `50ms`, tối đa hai WebGL context đang chạy. Gate đo khi
vuốt nhanh có nhiều card cùng chạy ba bước kính. Không hạ resolution, frame rate
hay chất lượng preset để đạt gate. Nếu kính làm rơi gate, PR code báo owner kèm
số đo trước khi đổi cách làm.

```gherkin
Given Galaxy A05s, masonry đầy card đang chờ ảnh
When owner vuốt nhanh từ đầu masonry tới footer
Then trace đạt median 30fps, không long task trên 50ms, tối đa 2 context WebGL
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Code | `createSkeletonFlowRenderer`, `SKELETON_FLOW_PRESETS`, `staticBackground` (`skeleton-flow.mjs`) | Skeleton card dùng lại nguyên |
| Runtime | Lease pool `skeletonNativeContexts`, `mountSkeletonRenderer`, `releaseSkeletonRenderer` (`catalog-runtime.mjs`) | Dùng chung cho skeleton cuối masonry và card đang tải |
| DOM | `.advertising-grid__cta-frame` trong khung media | Thêm khi ảnh chưa `complete`, gỡ sau ba bước |
| DOM | Lớp kính `aria-hidden` trong khung media hoặc primary | Chỉ tồn tại trong ba bước |
| Root class | `route-enter` trên `<html>` | Prepaint thêm cho mọi lần vào thẳng trang (R6) |
| Boot | `window.__ttMotionBoot` | Đổi điều kiện fallback theo R7 |

Tên class của lớp kính do thread M02b đặt khi làm code, theo vai trò ở trên.

## UI

Giá trị owner duyệt trong bản chạy thử nằm ở Design System, mục
[Đã duyệt, chờ code](../../design-system/approved-designs.md): Card đang tải,
Mở ảnh tại chỗ, Vào thẳng trang.

Owner chốt tổng `1.4s` và ba bước chồng lên nhau (2026-10-04): crossfade bắt
đầu khi kính chưa hiện xong, kính bắt đầu tan khi crossfade chưa xong. Nhịp còn
lại suy ra từ số đo Espacio đã có trong [Motion](../../design-system/motion.md),
không phải số đo mới:

- Ba bước bắt đầu ở `0`, `0.3s`, `0.6s`, theo delay mặc định `0.3s` của reveal
  Espacio.
- Kính hiện và crossfade dài `0.6s`, bằng thời lượng hiện ảnh đã đo (LazySizes
  `0.6s ease-out`, media reveal `0.6s --ease`). Crossfade dùng đường cong
  in-out mà site đang dùng cho suggestion, để hai lớp đổi chỗ không bị lõm sáng.
- Kính tan dùng đường cong mở route veil `power4.inOut`: mọi nội dung lộ ra
  từ dưới một lớp phủ đều mở cùng một cách; rút từ `1s` còn `0.8s` để tổng
  đúng `1.4s`.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1–R3 | chưa có test |
| R4–R5 | chưa có test |
| R6–R7 | chưa có test |
| R8 | chưa có test |
| R9 | chưa có test; trace Chrome trên A05s qua CDP |

## Gate còn mở

- Thread M02b làm code R1–R9 và viết test; kiểm Chromium, WebKit trên cloud và
  A05s thật.
- R1: mức trần context WebGL trên desktop, chốt theo số đo.
- R9 trên A05s, gồm nhiều kính chạy cùng lúc khi vuốt nhanh.
- PR code cập nhật Design System cùng lúc: [Skeleton](../../design-system/components/Skeleton/README.md)
  (thêm vai trò chờ ảnh), [Motion](../../design-system/motion.md) mục ảnh trong
  card, detail và route veil, [Media card](../../design-system/components/MediaCard/README.md),
  [Vòng tải](../../design-system/components/LoadRing/README.md) (bỏ phần
  Advertising), xóa ba mục tương ứng trong
  [Đã duyệt, chờ code](../../design-system/approved-designs.md); cập nhật phần
  Advertising của [khung chờ và vòng tải](image-loading-progress.md).
- R7: thời gian chờ tối đa trước fallback (mục `CẦN LÀM RÕ`).

## Chú thích thuật ngữ

- **Skeleton card**: khung giữ chỗ có trường màu Flow chuyển động, đang dùng ở
  cuối masonry Advertising.
- **Kính**: lớp blur glassmorphism chỉ xuất hiện khi ảnh thay skeleton.
- **Crossfade**: một lớp mờ đi trong lúc lớp khác hiện lên ở cùng chỗ.
- **Lease pool**: nhóm context WebGL dùng chung, cho mượn và trả theo khung.
- **Preset Flow**: bộ bốn màu và điểm neo dùng cho skeleton.
- **Route veil**: lớp trắng toàn màn hình che trang khi chuyển route.
- **bfcache**: bộ nhớ trình duyệt giữ nguyên trang để Back hiện tức thì.
- **Fallback**: trạng thái bỏ motion để nội dung vẫn hiện khi script lỗi.
- **Prepaint**: script trong `<head>` đặt trạng thái đầu trước khi trang vẽ.
- **Trace**: bản ghi hiệu năng từng frame của trình duyệt.
