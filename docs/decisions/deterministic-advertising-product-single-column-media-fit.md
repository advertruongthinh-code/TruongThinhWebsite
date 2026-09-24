---
title: Sản phẩm quảng cáo single-column với rank-v2 và media-fit deterministic
status: superseded
date: 2026-08-31
scope: Advertising product artifact, layout, media composition and runtime
supersedes:
  - deterministic-advertising-product-masonry-outlayer.md
superseded_by:
  - pinterest-organic-advertising-product-masonry.md
related_specs:
  - ../specs/advertising-products-turnkey-services.md
---

# Sản phẩm quảng cáo single-column với rank-v2 và media-fit deterministic

## Decision

`catalog.mjs` giữ dữ liệu category/media canonical và build artifact thuần.
`prepare:site` tạo duy nhất artifact output tại
`.site-output/advertising-products/catalog-artifact.mjs`. Runtime chỉ load artifact
một lần, chọn filter/cột đã compile và scale placement cache; không đọc source
catalog hoặc tự compile rank/layout.

Mọi card rộng một cột. Scheduler `advertising-rank-v2` dùng batch đủ 12 card
cùng ratio để đóng frontier cho 2, 3 và 4 cột; terminal batch xếp shortest-column
với tie stable. Frame ratio giữ mapping taxonomy đã duyệt. Build chọn `fitMode`
bằng FNV-1a UTF-8 có seed và runtime dựng foreground plus backplate blur cùng URL.

Masonry/Outlayer tiếp tục sở hữu coordinate-diff motion `0.4s ease`; virtual
window và focused-card retention giữ nguyên public lifecycle Barba.

## Consequences

Artifact là contract testable và deterministic, nhưng chỉ có sau `prepare:site`.
Source không chứa generated artifact; lock output directory là blocker build,
không được sửa output trực tiếp.

## Follow-up

Decision này bị thay thế ngày `2026-09-01` bởi
[Pinterest organic masonry và natural ratio](pinterest-organic-advertising-product-masonry.md).

## Chú thích thuật ngữ

- **Artifact**: module generated chỉ thuộc output static.
- **Foreground**: ảnh có alt mang nội dung.
- **Backplate**: ảnh trang trí blur nằm sau foreground.
- **Terminal batch**: nhóm card còn lại sau các batch đủ 12.
