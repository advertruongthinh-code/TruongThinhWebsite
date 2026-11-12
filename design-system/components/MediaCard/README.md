# Media card

Nguồn: `src/site/advertising-products/media-manifest.mjs`, `src/site/media-lib/colors.mjs`, `src/site/media-lib/video-source.mjs`; CSS `.masonry-card`, `.masonry-card__title`; spec [Card nhiều media](../../../docs/specs/media-card.md).

Một ô sản phẩm trong masonry Advertising (masonry chính và related). Runtime
`masonry/runtime.mjs` dựng `figure.masonry-card` từ
`media-manifest.mjs`; không viết tay trong HTML.

## Cấu trúc

- Link phủ cả card tới `?category=<slug>&photo=<id>`; ảnh giữ trọn tỷ lệ gốc,
  rộng một cột (ảnh bìa từ tỷ lệ vàng rộng hai cột ở lưới từ 3 cột,
  [Masonry](../Masonry/README.md#hình-học)), không crop (trừ cắt khép mép tối đa 5%
  dưới card hai cột, ảnh và video cover), không caption chiếm chỗ;
  alt VI/EN là tên card.
- Mọi card masonry (chính, bộ lọc, related, Công trình) có
  `figcaption.masonry-card__title` (`aria-hidden`, tên VI/EN theo ngôn ngữ,
  link lấy tên qua `aria-labelledby`; id related có tiền tố
  `advertising-related-title-`) nằm trên trái trong canvas như tên board của pin
  Pinterest: chữ trắng `1rem` 700, dòng 24px, cách mép trên 24px, cách mép trái
  và phải 28px, chữ hoa có bóng D, một dòng rồi dấu ba chấm
  (owner 2026-11-10). Mọi UI của card nằm trong media nên card cao đúng bằng media.
- Vị trí và kích thước do masonry đặt bằng inline style (`left`, `top`,
  `width`, `height`).
- PC: vào viewport khi ảnh chưa tải xong thì khung media tô màu chủ đạo của ảnh, ảnh ẩn dưới khung
  [Skeleton](../Skeleton/README.md) Flow trong 4 màu của chính ảnh (`.card-media > .masonry-grid__cta-frame`, không nhận tap; card mang
  `data-masonry-media-loading`), vẽ trên một canvas chung của lưới. Tải và giải mã xong thì lộ ảnh `0.6s` bằng Kính như primary, tối đa 4 card
  cùng lúc, còn lại crossfade (owner 2026-11-12, đo PC ở DRY 3b.1). Ảnh đã tải phủ đúng khung (`height: 100%`); khung có vòng trong `1px` màu giấy dưới media nên hụt subpixel không lộ màu chủ đạo. Ảnh đã có sẵn hiện ngay, không motion
  ([Motion](../../motion.md#ảnh-trong-card)).
- Điện thoại (cảm ứng hoặc viewport từ 750px trở xuống) không Flow, không Kính: card chờ ảnh mang `data-media-wait="colors"`, một lớp phẳng đổi qua 4 màu
  chủ đạo của ảnh (mỗi màu `2s`, `ease-in-out`, lặp `8s`; lớp trên đổi opacity, lớp dưới đổi màu từng bước lúc bị phủ; token màu `--wait-1..4`), ảnh ẩn tới khi tải và giải mã xong rồi hiện `0.45s`
  `cubic-bezier(0.16, 1, 0.3, 1)` trên lớp màu; xong lớp màu bị gỡ (`detail.css`, `[data-media-wait="colors"]`). Chưa đo trên A04s.
- Card masonry không zoom ảnh khi hover hay focus (owner 2026-10-18). Dưới tên
  là lớp tối học nguyên Pinterest (`media-shade-card`: 48px trên phẳng
  `rgba(17, 17, 17, 0.4)`, rồi nhạt tuyến tính về 0 ở đáy card). Chuột thật: tên
  và lớp tối chỉ hiện khi hover, cùng lúc, không motion. Cảm ứng: ảnh sạch, không
  tên, không lớp tối (owner 2026-11-10). Focus chỉ có viền.
- Card vừa xem có lớp phủ tối và nhãn `Vừa xem` / `Just viewed` (chữ có bóng D, lớp đen chờ media sẵn sàng).

Metadata ảnh ở [card nhiều media](../../../docs/specs/media-card.md#r1-dữ-liệu-media-của-card).

Bản đầu đặt Kính ba bậc thường trực trên ảnh đang chờ; kéo thanh cuộn nhanh khi mạng
chậm còn 14 đến 15 FPS trên PC, 8,6 đến 10,6 FPS trên A04s, nên owner chọn blur (2026-10-31). Từ 2026-11-12 PC chờ bằng Flow
và chỉ chạy Kính lúc lộ: đo PC owner 83,7 FPS kéo thanh cuộn, bằng blur 83,3 (DRY 3b.1,
[tải theo nấc R9](../../../docs/specs/progressive-loading.md#r9-card-chờ-ảnh-bằng-flow-hoặc-lớp-màu)).

## Nhiều media trong card

Card có từ hai media (ảnh hoặc video) thành carousel trong khung của card (một
cột, hoặc hai cột khi cover từ tỷ lệ vàng).
Contract runtime, history và test ở
[spec media-card](../../../docs/specs/media-card.md).

Catalog hiện chỉ có card một ảnh, nên trang public chưa hiện các trạng thái
dưới đây. Preview chụp runtime thật ở 1440px với dữ liệu giả: một ảnh, ba
item, 11 item đang ở item 7, video cover kèm một ảnh; item thêm lặp lại ảnh
của chính card, video chỉ giữ poster. Project reel trang chủ và gallery
Residential/Commercial (M03 tới M05) đang tạm dừng, chưa có thiết kế ở đây.

### Chỉ báo theo số item

| Số item | Hàng pill trong canvas | Điều khiển |
| --- | --- | --- |
| 1 | Không | Không chỉ báo |
| 2 tới 5 | 40px | Một hàng chấm 8px trong pill: chấm trắng 40%, chấm đang xem trắng; vùng bấm 16×40px |
| Từ 6 | Pill cộng 12px | Bộ đếm `7/11` trong pill, không nút trong hàng; đổi media bằng mũi tên hover hoặc vuốt |

- Hàng pill nằm sát đáy, trong canvas, không nền; pill cách đáy card 12px như hàng nút dưới của pin Pinterest (owner 2026-11-10):
  chấm hoặc bộ đếm ở giữa. Card không có nhãn thời lượng video.
- Chấm hoặc bộ đếm nằm trong một pill học Pinterest (owner 2026-11-10): nền
  than `rgba(51, 51, 51, 0.8)`, bo 12px. Pill chấm gọn cao 16px, chấm 8px cách
  nhau 16px. Pill bộ đếm padding 4px 8px, chữ trắng `0.75rem` thường,
  line-height 1.6, số thường (số 1 dạng
  `tabular-nums` của Plus Jakarta Sans có chân, owner 2026-11-10 thấy lạ).
- Chỉ chấm nhận click; chỗ trống của hàng mở detail như thân card.

### Video

- Không có nút phát, icon loa hay nhãn thời lượng (owner 2026-11-10). Mỗi lúc một video phát, luôn tắt tiếng:
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
- Đổi media là dải liền trượt ngang 0.9s (`PUSH_TIMING`); bấm tiếp khi dải
  đang trượt thì dải chạy tiếp từ vị trí đang hiện, không nhảy về đích cũ
  (`retargetStrip` trong `masonry/strip.mjs`, [spec R3](../../../docs/specs/media-card.md#r3-đổi-media-trên-card));
  reduced motion đổi tức thì. Ảnh tải lần đầu hết blur, scale về 1 và opacity lên 1 trong `0.6s` `cubic-bezier(0.65, 0, 0.35, 1)` (`CARD_REVEAL_MS`).

### Focus và nhãn

Chấm và nút bước có outline 2px `ink` offset 2px; link card outline
2px `ink` offset 4px. Thứ tự Tab: link card, chấm hoặc nút bước.

| Phần tử | VI | EN |
| --- | --- | --- |
| Hàng pill | `Media của thẻ` | `Card media` |
| Chấm | `Xem media 2 trên 3` | `Show media 2 of 3` |
| Nút trước, nút sau | `Media trước`, `Media tiếp` | `Previous media`, `Next media` |
| Bộ đếm | `Media 7 trên 11` | `Media 7 of 11` |
| Trạng thái tải (chỉ trình đọc màn hình) | `Đang tải media` | `Loading media` |

### Hình học

- Canvas cao bằng bề rộng card nhân tỷ lệ item cover; mọi item cùng tỷ lệ,
  căn giữa trong canvas.
- Card cao đúng bằng canvas, kể cả card nhiều item; đổi media không đổi khung card.
- Ví dụ ở 1440px (bốn cột, gap 35px): card rộng 316.25px; ảnh 1448×1086 cho
  canvas và card 237.19px.

### Chờ tải, Vừa xem, reduced motion

- **Card tạm:** vuốt rất nhanh thì card chưa dựng kịp là khối màu chủ đạo đúng chỗ và cỡ card, thở cùng pha các card tạm khác (điện thoại: lớp màu 4 màu của ảnh bìa, cùng pha với card chờ, không thở), không link, `aria-hidden`; lên card thật thì ảnh hiện dần `0.45s`, hoặc card tạm tan `0.45s` trên khung Flow nếu ảnh chưa xong ([Motion](../../motion.md#ảnh-trong-card)).
- **Chờ tải:** mũi tên và icon play thumbnail dùng bóng D hai lớp. Item chưa sẵn sàng sau `150ms` thì canvas mang
  [skeleton](../Skeleton/README.md) cuối masonry như card một ảnh; không có
  vòng xoay.
- **Vừa xem:** lớp đen alpha 0.7 và nhãn trắng `0.8rem` 700 ở giữa có bóng D, chỉ phủ
  cả canvas, kể cả hàng pill. Lớp đen chỉ hiện khi media của card đã sẵn sàng (cùng nhịp `0.6s` của lộ ảnh); card còn chờ ảnh thì chỉ có chữ.
- **Reduced motion:** skeleton đứng yên, card tạm không thở, lớp màu của điện thoại đứng yên ở màu 1; ảnh hiện ngay, không transition,
  không zoom.

## Chú thích thuật ngữ

- **Masonry**: lưới ảnh xếp so le theo chiều cao ảnh.
- **Alt**: mô tả ảnh cho người không nhìn thấy.
- **Canvas**: khung media của card, cao theo tỷ lệ item cover.
- **Hàng pill**: hàng 40px sát đáy trong canvas, chứa chấm hoặc bộ đếm.
- **Cover**: item được `coverMediaId` chọn làm mặt trước của card.
- **Subpixel**: phần lẻ dưới một pixel thiết bị của tọa độ hoặc kích thước.
