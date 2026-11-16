# Masonry Advertising

Nguồn: `src/site/masonry/host.mjs`, `src/site/masonry/layout.mjs`, `src/site/masonry/layout-worker.mjs`, `src/site/masonry/mount-budget.mjs`, `src/site/masonry/pack.mjs`, `src/site/masonry/replay.mjs`; CSS `.masonry-grid`; spec [Masonry](../../../docs/specs/advertising-masonry.md), [Xếp trực tiếp](../../../docs/specs/masonry-live-layout.md).

Lưới ảnh sản phẩm so le trên trang Advertising và Công trình. Lưới chính đặt card
theo bố cục máy người xem tự xếp trong Web Worker (`masonry/pack.mjs`), `masonry/replay.mjs` đặt
tọa độ, một vòng lặp; related masonry ở detail do `masonry/layout.mjs`
tính (thuần, không đọc DOM). Card đổi vị trí hoặc kích thước chạy `--dur-card` `400ms`, card tạm hiện dần `--dur-fade` `450ms` (card tạm là lớp đổi qua 4 màu chủ đạo của media bìa, PC và điện thoại như nhau, [MediaCard](../MediaCard/README.md))
(token motion: [motion.md](../../motion.md#token-motion)). `masonry/runtime.mjs` mount và ảo hóa; card trượt tới tọa độ đã tính bằng Web Animations
(`masonry/host.mjs`, không còn thư viện `masonry-layout`).

## Hình học

- Lề ngoài 15/25/35px (viewport `<= 750`, `<= 1200`, lớn hơn); khoảng giữa
  cột 15/25/35px (`<= 960`, `<= 1200`, lớn hơn). Masonry rộng hết viewport trừ
  lề ngoài, không giới hạn bề rộng tối đa.
- Số cột: `C = min(4, max(2, floor((gridWidth + G) / (220 + G))))`; ảnh rộng
  một cột, cao theo tỷ lệ gốc.
- Card hai cột (owner 2026-11-09, lưới chính trang Quảng cáo và Công trình):
  ảnh bìa ngang `w/h >= 1.618` (tỷ lệ vàng) rộng hai cột cộng một gutter khi
  `C >= 3` (1440px: 667.5px). Điện thoại 2 cột và related masonry: mọi card
  một cột, đúng tỷ lệ gốc, không cắt.
- Không lỗ (owner 2026-11-10): bố cục lưu theo 5 dải bề rộng (số cột x khoảng
  giữa: `2:15`, `3:15`, `3:25`, `4:25`, `4:35`); phần chênh dưới card hai cột
  khép bằng cách cắt tối đa 3 card cuối cột dài hơn, mỗi card không quá 5% media
  (ảnh cover, cắt đều trên dưới), không xếp được thì đổi chỗ vài card gần, rồi
  cắt, rồi riêng card ngang đó về một cột. Chưa xếp xong hoặc xếp lỗi thì cả lưới
  một cột, không lỗ ([xếp trực tiếp R4](../../../docs/specs/masonry-live-layout.md#r4-đặt-tọa-độ-và-lượt-chờ)).

| Viewport | Lề ngoài | Cột | Gutter | Rộng card |
| ---: | ---: | ---: | ---: | ---: |
| 320 | 15 | 2 | 15 | 138 |
| 390 | 15 | 2 | 15 | 173 |
| 768 | 25 | 3 | 15 | 229 |
| 1024 | 25 | 4 | 25 | 225 |
| 1440 | 35 | 4 | 35 | 316 |

Đo trên website ngày 2026-10-04.

- Không spacer, không giãn gutter, không crop để giả so le (chỉ cắt khép mép
  ở trên). Rule stagger và
  chống nhịp gạch của related: [masonry R6](../../../docs/specs/advertising-masonry.md#r6-đặt-card-và-chuyển-vị-trí).
- Chỉ mount card gần viewport; list có `aria-posinset`, `aria-setsize`; Tab
  vẫn đi qua được phần chưa mount.
- Không có JavaScript: sáu card tĩnh trong HTML vẫn hiện.

## Kết quả tìm kiếm

Lưới chính nhận danh sách card theo điểm từ trang tìm kiếm: mọi card một cột, card thứ i vào cột đang thấp nhất, CTA và Flow
vẫn ở cuối ([xếp trực tiếp R6](../../../docs/specs/masonry-live-layout.md#r6-chế-độ-tìm-kiếm)).

- Đang chờ kết quả: lưới cũ mờ còn `opacity: 0.6`, chuyển `--dur-quick` `250ms` (giảm chuyển động: đổi ngay).
- Kết quả gợi ý đến muộn: nút chữ đậm gạch chân "Có thêm kết quả gợi ý" / "More suggested results" giữa trang, ngay trên
  lưới, cao tối thiểu 44px; bấm mới xếp lại.

## Tên card Công trình

Trang Công trình mount cùng masonry, tên card như mọi card masonry: trên trái
trong media, card cao đúng bằng media, khung skeleton không chừa chỗ tên
(owner 2026-11-10, [Media card](../MediaCard/README.md#cấu-trúc)).

Chuyển vị trí ở [Motion](../../motion.md#vị-trí-card-masonry). Preview chụp
viewport 1440px với seed cố định.

## Chú thích thuật ngữ

- **Ảo hóa**: chỉ mount các card gần viewport.
- **Seed**: giá trị khởi tạo để thứ tự ngẫu nhiên lặp lại được.
