---
title: Masonry Sản phẩm quảng cáo với spacing Espacio và phân bổ media độc lập
status: accepted
date: 2026-09-01
scope: Advertising product grid geometry and media distribution
supersedes: []
related_specs:
  - ../specs/advertising-masonry.md
  - ../specs/advertising-detail.md
related_reports:
  - ../archive/reports/verification-advertising-products-109-media-spacing-2026-09-01.md
  - ../archive/reports/verification-advertising-products-organic-masonry-2026-09-01.md
  - ../reports/research-espacio-motion-audit.md
---

# Masonry Sản phẩm quảng cáo với spacing Espacio và phân bổ media độc lập

## Bối cảnh

Baseline trước decision đã có single-column natural/canvas ratio,
shortest-column, immutable append prefix, bounded virtualization và position
morph, nhưng dùng outer `20px`, gap `16px`, không có content cap và chỉ có `72`
card. Implementation hiện tại đã thay baseline đó bằng geometry và pool media
được quyết định dưới đây; evidence nằm trong report current-hash liên quan.

Catalog hiện hành do [advertising-masonry](../specs/advertising-masonry.md)
sở hữu (`154` ảnh, dataset `2026-09-24.1`). Số `109` và phân bổ theo nhóm dưới
đây là checkpoint ngày `2026-09-01`; geometry và packing contract vẫn hiệu lực.

## Decision

Giữ packing organic hiện tại: card rộng một cột, chiều cao theo natural ratio
hoặc canvas explicit, scheduler rank-v3, shortest-column với tie chọn cột trái,
append không repack prefix, không closed frontier và không filler.

Geometry dùng hai band độc lập:

- outer band: `15px` tới `750px`, `25px` từ `751–1200px`, `35px` trên `1200px`;
- inter-card gap: `15px` tới `960px`, `25px` từ `961–1200px`, `35px` trên
  `1200px`;
- content căn giữa và không rộng quá `1500px`;
- số cột dùng ideal slot `235px`, tối thiểu `2`, tối đa tuyệt đối `5`.

Catalog có đúng `109` card với source ảnh gốc độc lập. Phân bổ theo canonical
category order là `24 / 16 / 22 / 13 / 18 / 16`. Crop, blur, xoay, reframe hoặc
export lại cùng source không được tính thành ảnh khác. Mỗi nhóm có portrait,
near-square, landscape và ít nhất một extreme wide/tall theo intrinsic ratio.

Hai capability triển khai độc lập theo thứ tự: `advertising-grid-geometry` trước,
`advertising-grid-media` sau. Sáu trang con chỉ được chọn lại từ pool `109`, không
tạo gallery asset riêng trong decision này.

## Alternative đã cân nhắc

| Alternative | Lợi ích | Lý do không chọn |
| --- | --- | --- |
| Giữ outer `20px`, gap `16px`, cột không giới hạn | Không đổi runtime geometry | Trái spacing Espacio đã đo và làm masonry quá dày trên viewport rộng |
| Giữ `72` card và crop lại | Ít asset hơn | Không đáp ứng ảnh độc lập; cùng source crop khác vẫn là duplicate |
| Quay lại ba ratio cố định và closed frontier | Dễ cân đáy | Trái natural-ratio organic masonry đã chốt |
| Tạo thêm gallery riêng cho sáu trang con | Nhiều media hơn | Mở rộng scope và tăng chi phí asset không cần thiết |

## Hệ quả

- Resize quanh band hoặc ngưỡng cột có thể đổi geometry; Masonry position morph
  tiếp tục xử lý mọi coordinate change.
- Viewport rộng hơn `1570px` có effective outer lớn hơn `35px` vì content cap,
  nhưng masonry vẫn căn giữa và giữ card width ổn định.
- Catalog cần schema `media.sourceId`, validator count/uniqueness/ratio coverage
  và một contact-sheet review để bắt near-duplicate.
- Tạo và duyệt đủ media là phần tốn công chính; implementation không được giảm
  số lượng bằng crop hoặc fallback reuse.
- Runtime static hiện phát một WebP cho mỗi card. Responsive derivative và
  authoring `srcset/sizes` được hoãn đến CMS phase; đây là optimization tiếp
  theo, không thay đổi source identity hoặc layout contract đã chấp nhận.

## Acceptance

- Đúng `109` card và count `24/16/22/13/18/16`; unique `id`, `media.src` và
  `media.sourceId`; đủ `12` product label hiện có trong mỗi nhóm.
- Mỗi nhóm có ratio `<0.9`, `0.9–1.1`, `>1.1` và ít nhất một ratio `<=0.625`
  hoặc `>=1.6`, đo từ intrinsic width/height.
- Browser matrix chứng minh outer/gap band, content cap `1500px`, `2–5` cột,
  equal column width, không overflow, overlap hoặc interior hole.
- Determinism, shortest-column, immutable append prefix, bounded virtualization,
  lazy loading, filter/resize position morph và accessibility hiện có vẫn pass.
- Contact sheet theo nhóm được con người review; ảnh WebP sRGB, metadata đã loại,
  kích thước thật, alt VI/EN và không có mặt nhận diện, chữ/logo giả, watermark
  hoặc reflection riêng tư.

## Ranh giới

Không đổi hero, nav, template sáu trang con, CMS, Wrangler, deploy hoặc asset của
Espacio/Pinterest. Report baseline cũ được giữ nguyên với nhãn historical;
current-hash dùng report `109` media riêng.

## Lịch sử

- 2026-08-30: manifest deterministic, ba ratio, closed frontier, tối đa 4 cột.
- 2026-08-31: Masonry/Outlayer làm position morph; outer và gap tách band; sau đó single-column rank-v2.
- 2026-09-01: Pinterest organic natural ratio rank-v3; rồi decision này thêm spacing Espacio, cap `1500px`, tối đa 5 cột.
- 2026-10-03 gộp và xóa `deterministic-advertising-product-masonry`, `-outlayer`, `-single-column-media-fit`, `pinterest-organic-advertising-product-masonry`; bản gốc còn trong Git history.

## Chú thích thuật ngữ

- **Outer band**: khoảng tối thiểu theo breakpoint trước khi áp content cap.
- **Effective outer**: khoảng thật từ viewport tới masonry sau khi căn giữa.
- **Intrinsic ratio**: `width / height` thật của media source.
- **Source ID**: định danh ảnh gốc dùng để phát hiện reuse qua crop hoặc export.
- **Interior hole**: khoảng trống trong một cột ngoài gutter/caption có chủ đích.
- **Immutable append prefix**: card đã append giữ nguyên tọa độ khi nối card mới.
- **Responsive derivative**: biến thể cùng ảnh ở kích thước nhỏ hơn để browser
  chọn theo viewport mà không tải dư pixel.
