# Ảnh gốc của media site tĩnh — kiểm kê 2026-10-03

- Phạm vi: mọi ảnh dưới `src/site/assets/content/` tại `main` `70513b9`.
- Cách kiểm: quét PC owner (source-assets, archive, thư mục Codex
  `C:\Users\halal\.codex\generated_images`, profile người dùng), so khớp theo
  tên, kích thước pixel và hash xám 16×16. Manifest đầy đủ ở PC owner:
  `E:\TruongThinh-Website\.tmp\media-originals-manifest.json` (ngoài Git).
- Kết quả: Advertising 154/154 có PNG gốc (117 ở thư mục Codex, phần còn lại ở
  `source-assets/projects/advertising`). Ảnh khác: 29/65 có PNG gốc (gồm hai
  `process-*-survey-v2.png` vốn đã là gốc). 36 ảnh không còn gốc, chỉ còn bản
  WebP giống hệt từng byte trong `source-assets/site-backups/live-v1-20260924`.

## 36 ảnh không còn gốc

Tất cả là WebP, mặc định `1536×1024` nếu không ghi khác.

`projects/` (17): `advertising-fnb-mobile-cart-v2` (1086×1448), `commercial-active`,
`commercial-space`, `completed-detail`, `fabrication-hands`, `hero-kiosk`,
`home-commercial-fnb` (1086×1448), `home-residential-kitchen` (1086×1448),
`kiosk-active`, `kiosk-posm-materials`, `mobile-retail-materials`, `mobile-retail`,
`residential-detail`, `residential-space`, `signage-detail`, `signage-dusk`, `storefront`.

`shared/` (19): `advertising`, `business`, `cnc-operator-b`, `cnc`,
`consultation-materials` (1024×1536), `consultation`, `design-sketch`,
`edge-banding`, `home`, `installation`, `legacy-hands`, `legacy-team`,
`materials`, `montage-cnc-tablet`, `montage-commitment-option-3-knot`,
`montage-residential-product-detail`, `survey-laser-level` (1024×1536),
`survey-modern`, `workshop-wide`.

Sáu ảnh trong danh sách không có tham chiếu nào trong `src/site`:
`advertising-fnb-mobile-cart-v2`, `mobile-retail-materials`, `shared/advertising`,
`shared/business`, `edge-banding`, `survey-laser-level`. Ngoài ra có 13 file có
gốc nhưng cũng không được tham chiếu: sáu bản `.jpg` cover/process, hai PNG
`process-*-survey-v2.png`, bốn WebP Advertising cũ (`mobile-retail-05`,
`office-signs-wayfinding-01`, `signage-raised-letters-02`, `-06`) và
`home-advertising-products-table`.
Cả 19 file đều có tên trong `nonPublicSourceAssets` của
`scripts/site/prepare-static-assets.mjs`: được giữ chủ đích làm source, không
phát hành, nên không phải media chết và không convert.

## Xử lý khi convert

Theo quyết định owner trong [plan](../../tasks/plan.md#advertising-random-grid-và-tải-ảnh--plan-chờ-duyệt-2026-09-25):
36 ảnh này giữ WebP hiện tại làm cỡ lớn nhất, chỉ sinh cỡ nhỏ hơn từ WebP.
CMS sau này giữ file gốc khi upload, xem [CMS spec](../specs/cms-content-publishing.md).

## Chú thích thuật ngữ

- **Ảnh gốc**: file xuất đầu tiên từ công cụ tạo ảnh, chưa nén lossy.
- **Biến thể**: bản sinh từ ảnh gốc theo định dạng và cỡ chuẩn.
