---
title: Sản phẩm quảng cáo dùng Pinterest organic masonry và natural ratio
status: superseded
date: 2026-09-01
scope: Advertising product artifact, responsive layout, append and media composition
superseded_by: advertising-organic-masonry-espacio-spacing-media-distribution.md
supersedes:
  - deterministic-advertising-product-single-column-media-fit.md
related_specs:
  - ../specs/advertising-products-turnkey-services.md
---

# Sản phẩm quảng cáo dùng Pinterest organic masonry và natural ratio

## Bối cảnh

Contract hiện tại ép card vào `1:1`, `3:4`, `4:3`, gom batch `12` card để đóng
frontier và seeded-random ba media-fit mode. Kết quả deterministic nhưng tạo dải
ratio có chủ ý, không còn cảm giác organic của Pinterest và buộc batch chờ cân
đáy dù card đều rộng một cột.

## Decision

Giữ artifact build, stable id, bounded virtualization và Masonry/Outlayer
position morph. Thay phần ratio, rank và placement như sau:

- card luôn rộng một cột; chiều cao theo intrinsic media dimensions hoặc
  `presentationCanvas` được data author khai báo;
- `advertising-rank-v3` round-robin category và giữ FIFO source order trong mỗi
  category; không gom batch theo ratio;
- lưới dùng outer margin `20px`, gap `16px`, ideal slot `235px`, minimum hai
  cột và không có maximum column count;
- packer đặt từng card vào cột thấp nhất, tie chọn column index nhỏ nhất; append
  giữ nguyên tọa độ prefix nhưng không cần closed frontier hoặc hàng kín;
- `fitMode` mặc định `null`; chỉ card có `presentationCanvas` mới được lưu một
  mode explicit. Build/runtime không random hoặc seeded-random mode.

Ragged bottom là hợp lệ. “Không lỗ trắng” chỉ cấm khoảng trống nội cột ngoài
gutter/caption rhythm có chủ đích, không yêu cầu mọi đáy cột nằm cùng một đường.

## Alternative đã cân nhắc

| Alternative | Lợi ích | Lý do reject |
| --- | --- | --- |
| Giữ ba ratio và closed frontier | Batch append rất dễ chứng minh | Tạo nhịp card nhân tạo, trái organic masonry đã chốt |
| Giữ seeded-random media fit | Luôn có ba composition | Fit mode không có ý nghĩa khi frame theo natural ratio và làm dữ liệu khó biên tập |
| Repack toàn bộ prefix khi append | Cột cân hơn tại đáy | Người xem mất vị trí theo dõi; card cũ bị dịch chuyển |

## Hệ quả

- Dữ liệu ảnh đa dạng tạo layout phong phú mà không cần frame ratio giả.
- Mọi transport batch size đều append được; batch cuối không có contract riêng.
- Intrinsic dimensions phải có trước render để reserve height và virtualize ổn
  định.
- Resize/filter vẫn có coordinate morph; append chỉ animate media mới và không
  di chuyển prefix.
- Artifact, validator, fixtures và current-hash evidence rank-v3 phải cùng thay
  rank-v2 trước khi scoped implementation được gọi đạt; gate này đã hoàn tất.

## Evidence

- Owner xác nhận intent trong interview ngày `2026-09-01`.
- Pinterest Gestalt công khai cơ chế tính số cột theo ideal column width trong
  [`getColumnCount.ts`](https://github.com/pinterest/gestalt/blob/master/packages/gestalt/src/Masonry/getColumnCount.ts)
  và shortest-column placement trong
  [`fullWidthLayout.ts`](https://github.com/pinterest/gestalt/blob/master/packages/gestalt/src/Masonry/fullWidthLayout.ts).
- Chrome DevTools đo live Pinterest tại `320/390/768/1024/1440/1920px`: cột
  `2/2/3/4/5/8`, outer margin `20px`, gap `16px`, equal fluid column width và
  rendered image giữ source ratio. `235px` là effective slot target suy ra từ
  sáu điểm đo, không phải public Pinterest API.
- Owner accept decision ngày `2026-09-01`; scoped implementation evidence nằm
  tại [verification organic masonry](../archive/reports/verification-advertising-products-organic-masonry-2026-09-01.md).

## Chú thích thuật ngữ

- **Natural ratio**: tỷ lệ lấy từ intrinsic width/height của media.
- **Presentation canvas**: khung tùy chọn do data author khai báo cho composition.
- **Ragged bottom**: các cột kết thúc ở độ cao khác nhau.
- **Immutable prefix**: card đã append không đổi tọa độ khi nối thêm dữ liệu.
