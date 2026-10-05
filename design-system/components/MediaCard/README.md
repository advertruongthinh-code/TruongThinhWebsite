# Media card

Một ô sản phẩm trong masonry Advertising (masonry chính và related). Runtime
`catalog-runtime.mjs` dựng `figure.project-tile.advertising-tile` từ
`media-manifest.mjs`; không viết tay trong HTML.

## Cấu trúc

- Link phủ cả card tới `?category=<slug>&photo=<id>`; ảnh giữ trọn tỷ lệ gốc,
  rộng đúng một cột, không crop, không caption, không tiêu đề (chỉ alt VI/EN).
- Vị trí và kích thước do masonry đặt bằng inline style (`left`, `top`,
  `width`, `height`).
- Ảnh chưa tải sau `150ms` thì khung media mang [skeleton](../Skeleton/README.md)
  cuối masonry, rồi crossfade sang ảnh; ảnh có sẵn fade vào `0.6s ease-out`
  ([Motion](../../motion.md#ảnh-trong-card)).
- Card một ảnh: hover hoặc focus thì ảnh `scale(1.15)` trong `600ms`, khung
  giữ nguyên.
- Card vừa xem có lớp phủ tối và nhãn `Vừa xem` / `Just viewed`.

Metadata ảnh ở [card nhiều media](../../../docs/specs/media-card.md#r1-dữ-liệu-media-của-card).

Ảnh vừa tải hiện dưới [Kính](../Glass/README.md#hiện-và-tan-trên-ảnh-vừa-tải)
phủ đều, rồi kính tan.

## Nhiều media trong card

Card có từ hai media (ảnh hoặc video) thành carousel trong khung một cột.
Contract runtime, history và test ở
[spec media-card](../../../docs/specs/media-card.md).

Catalog hiện chỉ có card một ảnh, nên trang public chưa hiện các trạng thái
dưới đây. Preview chụp runtime thật ở 1440px với dữ liệu giả: một ảnh, ba
item, 11 item đang ở item 7, video cover kèm một ảnh; item thêm lặp lại ảnh
của chính card, video chỉ giữ poster. Project reel trang chủ và gallery
Residential/Commercial (M03 tới M05) đang tạm dừng, chưa có thiết kế ở đây.

### Chỉ báo theo số item

| Số item | Dải dưới canvas | Điều khiển |
| --- | --- | --- |
| 1 | Không có | Không chỉ báo; video vẫn có duration và playback |
| 2 tới 6 | 44px | Một hàng chấm; vùng bấm 20×44px, chấm 6px viền 1px, chấm đang xem tô đặc |
| Từ 7 | 44px | Nút trước, bộ đếm `7/11`, nút sau; nút tối thiểu 44×44px |

- Dải nằm đáy card, rộng bằng card, nền `paper`, chấm và chữ `ink`.
- Bộ đếm `0.8rem`, `tabular-nums`. Mũi tên 8px nét 2px; nút ở hai đầu bị
  disabled, opacity 0.5.
- Chỉ chấm và nút nhận click; chỗ trống của dải mở detail như thân card.

### Video

- **Duration:** góc trên trái canvas, cách 12px; chữ trắng `0.75rem`
  `tabular-nums` trên nền đen alpha 0.7, padding 4px 7px, dạng `m:ss` làm tròn
  lên giây.
- **Playback:** góc trên phải, cách 8px, tối thiểu 44×38px, padding 5px 9px,
  chữ `Phát` / `Tạm dừng` trắng trên nền đen alpha 0.7.
- Video luôn tắt tiếng, hiện poster; chỉ phát khi bấm playback.

### Tương tác

- Chạm hoặc click canvas mở detail ở đúng media đang xem.
- Vuốt ngang từ 40px đổi media, dừng ở hai đầu, không quay vòng; cuộn dọc
  vẫn native.
- Chấm, nút trước và sau chỉ đổi media, không mở detail.
- Đổi media tức thì, không trượt; ảnh tải lần đầu fade `0.6s ease-out`. Card
  carousel không zoom khi hover.

### Focus và nhãn

Chấm, nút bước và playback có outline 2px `ink` offset 2px; link card outline
2px `ink` offset 4px. Thứ tự Tab: link card, playback, chấm hoặc nút bước.

| Phần tử | VI | EN |
| --- | --- | --- |
| Dải | `Media của thẻ` | `Card media` |
| Chấm | `Xem media 2 trên 3` | `Show media 2 of 3` |
| Nút trước, nút sau | `Media trước`, `Media tiếp` | `Previous media`, `Next media` |
| Bộ đếm | `Media 7 trên 11` | `Media 7 of 11` |
| Trạng thái tải (chỉ trình đọc màn hình) | `Đang tải media` | `Loading media` |

### Hình học

- Canvas cao bằng bề rộng card nhân tỷ lệ item cover; mọi item cùng tỷ lệ,
  căn giữa trong canvas.
- Card từ hai item cao bằng canvas cộng 44px; masonry tính sẵn 44px nên đổi
  media không đổi khung card. Card một item giữ hình học card một ảnh.
- Ví dụ ở 1440px (bốn cột, gap 35px): card rộng 316.25px; ảnh 1448×1086 cho
  canvas 237.19px, card 281.19px.

### Chờ tải, Vừa xem, reduced motion

- **Chờ tải:** item chưa sẵn sàng sau `150ms` thì canvas mang
  [skeleton](../Skeleton/README.md) cuối masonry như card một ảnh; không có
  vòng xoay.
- **Vừa xem:** lớp đen alpha 0.72 và nhãn trắng `0.8rem` 700 ở giữa, chỉ phủ
  canvas, không phủ dải.
- **Reduced motion:** skeleton đứng yên; ảnh hiện ngay, không transition,
  không zoom.

## Chú thích thuật ngữ

- **Masonry**: lưới ảnh xếp so le theo chiều cao ảnh.
- **Alt**: mô tả ảnh cho người không nhìn thấy.
- **Canvas**: khung media của card, cao theo tỷ lệ item cover.
- **Dải**: vùng điều khiển 44px dưới canvas, chứa chấm hoặc bộ đếm.
- **Cover**: item được `coverMediaId` chọn làm mặt trước của card.
