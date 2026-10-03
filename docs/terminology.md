# Tên gọi chuẩn

Bảng này là nguồn chuẩn cho tên gọi trong docs, spec, plan và report mới. Viết
mới hoặc sửa tài liệu thì dùng cột "Dùng"; không dùng tên trong cột "Không dùng".
ID, tên file, selector, tên capability và evidence có ngày giữ nguyên để không
gãy link và lịch sử.

| Dùng | Nghĩa | Không dùng |
| --- | --- | --- |
| masonry | Bố cục card Advertising kiểu Pinterest: cột đều, card cao theo tỷ lệ media, xếp so le. Gồm masonry chính của trang Advertising và related masonry dưới detail. | grid, lưới, lưới organic, organic grid, Pinterest grid khi nói về bố cục này |
| grid | Bố cục cột/hàng đều, ví dụ project grid 4/3/2/1, menu group, CSS grid. | masonry cho bố cục cột đều |
| card | Một phần tử trong masonry hoặc grid. | tile, item khi nói về phần tử hiển thị |
| media-card | Card có identity, một hoặc nhiều media và đích detail, theo [spec media-card](specs/site-media-card-playback.md). | card đa media khác tên |
| detail | View một card Advertising qua query `?photo=`, gồm primary và related. | photo view, trang ảnh |
| primary | Vùng media chính và thông tin trong detail. | hero ảnh, ảnh lớn |
| related | Masonry card liên quan dưới primary. | liên quan, lưới liên quan |
| suggestion | Card gợi ý có slideshow crossfade trong masonry. Chữ "Gợi ý" chỉ là copy giao diện. | gợi ý khi nói về thành phần |
| viewer | Lớp phóng to media trong detail, có zoom/pan. | lightbox, enlarged view |
| skeleton | Khung chờ có chuyển động khi masonry tải tiếp. | loading card |

## Ngoại lệ giữ nguyên

- ID và tên file đã dùng trong link: `advertising-grid-span-organic.md`,
  `advertising-random-grid-and-image-loading-capability-map.md`, GRID-R4,
  capability `advertising-grid-geometry`, `advertising-grid-media`.
- Code và selector: `advertising-grid-v13`, `[data-project-grid]`,
  `[data-grid-item]`.
- Report, verification và archive có ngày giữ nguyên chữ gốc.

## Chú thích thuật ngữ

- **Nguồn chuẩn**: tài liệu quyết định nội dung được chấp nhận khi có mâu thuẫn.
- **Selector**: chuỗi CSS hoặc attribute dùng để chọn phần tử trong source.
- **Capability**: module tính năng có tên riêng trong capability map.
