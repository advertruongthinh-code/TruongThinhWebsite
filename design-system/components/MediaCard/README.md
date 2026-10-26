# Media card

Một ô sản phẩm trong masonry Advertising (masonry chính và related). Runtime
`catalog-runtime.mjs` dựng `figure.project-tile.advertising-tile` từ
`media-manifest.mjs`; không viết tay trong HTML.

## Cấu trúc

- Link phủ cả card tới `?category=<slug>&photo=<id>`; ảnh giữ trọn tỷ lệ gốc,
  rộng đúng một cột, không crop, không caption, không tiêu đề (chỉ alt VI/EN).
- Vị trí và kích thước do masonry đặt bằng inline style (`left`, `top`,
  `width`, `height`).
- Vào viewport khi ảnh chưa tải thì khung media mang ngay
  [skeleton](../Skeleton/README.md) cuối masonry, ảnh về thì hiện qua Kính
  `0.6s`; ảnh đã có sẵn hiện ngay, không motion ([Motion](../../motion.md#ảnh-trong-card)).
- Card masonry và related không zoom ảnh khi hover hay focus (owner
  2026-10-18); chuột thật hover phủ lớp đen 30% lên canvas (owner 2026-10-26); focus chỉ có viền.
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
| 1 | Không có | Không chỉ báo; video vẫn có duration |
| 2 tới 5 | 44px | Một hàng chấm 8px trong pill: chấm trắng 40%, chấm đang xem trắng; vùng bấm 20×44px |
| Từ 6 | 44px | Bộ đếm `7/11` trong pill, không nút trong dải; đổi media bằng mũi tên hover hoặc vuốt |

- Dải nằm đáy card, rộng bằng card, nền `paper`.
- Chấm hoặc bộ đếm nằm trong một pill giữa dải, cùng dáng nhãn thời lượng: cao
  24px, bo 8px, nền than `rgba(32, 33, 32, 0.9)` như bộ đếm "2/8" của Pinterest
  (owner 2026-10-26). Bộ đếm chữ trắng `0.75rem` đậm 500 `tabular-nums`.
- Chỉ chấm nhận click; chỗ trống của dải mở detail như thân card.

### Video

- **Duration:** theo card video Pinterest (owner 2026-10-17): góc trên trái
  canvas, cách 8px; viên thuốc bo 8px, padding 4px 6px, nền trắng alpha 0.9,
  chữ `ink` `0.75rem` đậm 500 `tabular-nums`; tổng thời lượng `m:ss` làm tròn
  lên giây, không đếm ngược.
- Không có nút phát hay icon loa. Mỗi lúc một video phát, luôn tắt tiếng:
  cuộn dừng thì tự phát một card trong vùng giữa màn hình; chuột vào card video
  thì phát card đó, rời ra thì dừng. Không hiệu ứng hover riêng.

### Tương tác

- Chạm hoặc click canvas mở detail ở đúng media đang xem.
- Vuốt ngang từ 40px đổi media, dừng ở hai đầu, không quay vòng; cuộn dọc
  vẫn native.
- Chấm, nút trước và sau chỉ đổi media, không mở detail.
- Hover card nhiều media hiện mũi tên `<` `>` như grid Pinterest (đo
  2026-10-18): vùng bấm 32px cao hết canvas ở hai mép, chevron trắng 16px
  không nền, bóng nhẹ; ẩn ở media đầu, cuối; cảm ứng không có mũi tên, đổi
  bằng vuốt. Cùng nút với mũi tên dải media của
  [Primary](../Primary/README.md#thumbnail-media), chỉ khác hình dạng.
- Đổi media tức thì, không trượt; ảnh tải lần đầu fade `0.6s ease-out`.

### Focus và nhãn

Chấm và nút bước có outline 2px `ink` offset 2px; link card outline
2px `ink` offset 4px. Thứ tự Tab: link card, chấm hoặc nút bước.

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
- **Vừa xem:** lớp đen alpha 0.7 và nhãn trắng `0.8rem` 700 ở giữa, chỉ phủ
  canvas, không phủ dải.
- **Reduced motion:** skeleton đứng yên; ảnh hiện ngay, không transition,
  không zoom.

## Chú thích thuật ngữ

- **Masonry**: lưới ảnh xếp so le theo chiều cao ảnh.
- **Alt**: mô tả ảnh cho người không nhìn thấy.
- **Canvas**: khung media của card, cao theo tỷ lệ item cover.
- **Dải**: vùng điều khiển 44px dưới canvas, chứa chấm hoặc bộ đếm.
- **Cover**: item được `coverMediaId` chọn làm mặt trước của card.
