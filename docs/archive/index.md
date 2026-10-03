# Archive tài liệu và evidence

Archive giữ bản gốc nguyên byte của report thủ công và guide cũ. Trạng thái
trong bản gốc là trạng thái tại thời điểm viết, không tự là verdict hiện tại.
Evidence có hiệu lực: [verification](../verification/index.md). Guide hiện
hành: [docs index](../index.md).

[mapping.json](mapping.json) là nguồn duy nhất cho source cũ, destination,
replacement hiện hành, SHA256 và các file đã xóa (`removed`, khôi phục từ Git).
Link relative bên trong bản gốc tính theo thư mục source cũ; tra mapping để tới
vị trí mới. Không sửa bản gốc để che provenance.

## Guide còn giữ

| Bản gốc | Đọc hiện hành |
| --- | --- |
| [CONTENT-MEDIA-GUIDE.md](guides/CONTENT-MEDIA-GUIDE.md) | [docs/design/content.md](../design/content.md) |
| [motion-map.md](guides/motion-map.md) | [docs/reference/espacio/motion.md](../reference/espacio/motion.md) |

## Chú thích thuật ngữ

- **Bản gốc**: file được bảo toàn nguyên byte.
- **Replacement**: nguồn nên đọc cho contract hiện hành; không thay hash bản gốc.
- **SHA256**: dấu kiểm nội dung để chứng minh preservation.
