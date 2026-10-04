# Brand lockup

Logo Trường Thịnh gồm mark tam giác bốn path và hai dòng chữ, dùng trong
header, full menu và footer. Markup là SVG inline `svg.brand-lockup`, không
dùng file ảnh.

## Hình học

- Gọi H là chiều cao mark, Y = H/6: khối chữ cao 4Y, cách mark Y, đệm trên
  dưới Y. Kích thước header: `brand-header-width` × `brand-header-height`.
- Dòng 1 tên thương hiệu, dòng 2 phụ đề `NỘI THẤT · QUẢNG CÁO`; EN là
  `INTERIORS · ADVERTISING` cùng geometry. Font 600, dấu không bị clip.
- Mark đơn sắc theo màu chữ khi expanded; sticky và full menu dùng bốn màu
  `logo-mark-*`. Màu `logo-mark-*` chỉ dùng cho mark, không dùng cho UI.
- Favicon: `src/site/assets/brand/favicon-black.svg` (light) và
  `favicon-white.svg` (dark).

Preview hiện trạng thái expanded đơn sắc trên nền trắng.

## Chú thích thuật ngữ

- **Mark**: phần hình của logo.
- **Lockup**: cụm mark và chữ đi cùng nhau.
