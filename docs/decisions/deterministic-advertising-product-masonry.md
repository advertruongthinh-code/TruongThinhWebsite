---
title: Lưới Sản phẩm quảng cáo dùng manifest deterministic và closed frontier
status: superseded
date: 2026-08-30
scope: Advertising product grid, batching and virtualization
supersedes: []
superseded_by:
  - deterministic-advertising-product-masonry-outlayer.md
related_specs:
  - ../specs/advertising-products-turnkey-services.md
related_reports:
  - ../archive/reports/research-advertising-products-masonry-batching-2026-08-30.md
---

# Lưới Sản phẩm quảng cáo dùng manifest deterministic và closed frontier

## Bối cảnh

Lưới cần hỗ trợ ba ratio, card rộng một hoặc hai cột, filter, lazy loading và
virtualization trên hàng nghìn item. `ratio` và `span` phải giữ nguyên giữa các
lần load; batch mới không được reshuffle card cũ; lưới không được có interior
hole.

CSS Grid `dense`, CSS columns hoặc shortest-column Masonry không đồng thời bảo
đảm hard span, stable order, immutable prefix và zero-hole cho mọi dataset.

## Decision

Dữ liệu lưu `id`, `rank`, `ratio` và `span`. Một layout compiler deterministic
tạo placement manifest cho từng filter và số cột. Compiler chỉ phát visual batch
khi đạt closed frontier; validator từ chối dataset không đạt invariant thay vì
tự sửa `span`, ratio hoặc order.

Runtime chỉ đọc manifest, append card shell theo batch và virtualize DOM theo
viewport plus overscan. Metadata, placement cache và container height không bị
xóa khi card rời DOM.

Số cột dùng công thức target-width kiểu Pinterest Gestalt với target `250px`,
minimum `2`, maximum `4`. Biên ngoài và gutter giữ contract Espacio đã đo.

## Hệ quả

- Tọa độ lặp lại giữa reload và không phụ thuộc thời điểm ảnh tải.
- Batch mới không thay đổi placement của prefix đã commit.
- Dataset authoring có thể bị reject; đây là lỗi dữ liệu, không phải lý do để
  runtime tự đổi card nổi bật.
- Card rời viewport không animate. Virtualization chỉ thay DOM residency, không
  thay layout hoặc card state.
- Không thêm Masonry dependency; implementation dùng Web Platform API và
  JavaScript hiện có.

## Bằng chứng

- Research live/archive/source và phép đo biên nằm trong
  [report Masonry](../archive/reports/research-advertising-products-masonry-batching-2026-08-30.md).
- Owner xác nhận hard `ratio`/`span`, atomic batch, không reshuffle, gap-free và
  không có viewport-exit motion trong discovery ngày `2026-08-30`.

## Follow-up

- Quyết định này được thay thế ngày `2026-08-31` bởi
  [Lưới deterministic dùng Masonry/Outlayer và spacing Espacio](deterministic-advertising-product-masonry-outlayer.md).

## Chú thích thuật ngữ

- **Placement manifest**: danh sách tọa độ và kích thước đã compile trước.
- **Immutable prefix**: nhóm card đã commit không bị đổi vị trí khi thêm batch.
- **Interior hole**: vùng trắng nằm bên trong phạm vi các card, không tính gutter
  có chủ đích hoặc đáy lưới chưa khép kín.
- **Web Platform API**: API có sẵn trong browser như ResizeObserver và
  IntersectionObserver.
