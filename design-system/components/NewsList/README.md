# Trang danh sách News

Nguồn: `scripts/site/block-pages.mjs`; CSS `.blk-article-head`, `.blk-news-filter`, `.blk-news-list`, `.blk-news-card`, `.blk-news-pager`, `.home-news`; spec [news R2, R3](../../../docs/specs/news.md#r2-trang-danh-sách-news), [R4](../../../docs/specs/news.md#r4-news-trên-các-trang-khác).

Trang `/vi/news/` theo bố cục Espacio: đầu trang nền trắng có `h1` lớn căn giữa và hàng lọc năm, không kicker, rồi lưới bài. Bài mới nhất là thẻ
lớn cột trái, bốn bài kế là lưới 2 × 2 cột phải, các bài còn lại là thẻ hàng ngang dưới lưới đó; 12 bài mỗi trang,
thanh số trang ở cuối. Trang bài dùng `blk-article-head` nền tối với dòng nhóm và ngày thay hàng lọc; thẻ chỉ có ảnh và tiêu đề (owner 2026-11-11); thân bài là
[khối](../Blocks/README.md). Preview dựng từ dữ liệu cố định `scripts/docs/blocks-preview.json`.

| Phần | Cấu trúc | 1440 | 390 |
| --- | --- | --- | --- |
| Đầu trang | Nền trắng, `h1` chữ hoa căn giữa nét 500, chip lọc xám căn giữa, mục chọn gạch chân 2px | `h1` 112px/1.4; chip 16px | `h1` 54.6px (14vw) |
| Thẻ lớn | Ảnh bìa, tiêu đề lớn | Cột 667.5px; tiêu đề 47.95px/1.3 | Một cột 360px; tiêu đề 32px |
| Lưới 2 × 2 | Ảnh, tiêu đề | Hai cột 316.25px, gap 35px; tiêu đề 20.8px | Một cột |
| Thẻ hàng ngang | Ảnh trái, tiêu đề phải cách đỉnh ảnh 17px | Cột 210.8px + 421.7px, gap 35px | Ảnh 30%, gap 35px |

Rê chuột hoặc focus thẻ: gạch chân 3px chạy theo bề rộng chữ tiêu đề, mọc từ trái `0.3s`, như navbar
([Header](../Header/README.md)). Lăn wheel trên PC thì thẻ lớn dính lại tới khi lưới bên phải cuộn hết
([news R2](../../../docs/specs/news.md#r2-trang-danh-sách-news)). Ảnh thẻ lớn tải ngay, thẻ còn lại lazy.

## Dải News trang chủ

Khối News duy nhất ngoài trang News, ngay dưới hero trang chủ, theo trang chủ Espacio (đo 2026-11-11): 3 bài mới nhất, mỗi
bài ảnh bìa trái (tối thiểu 5:6, cao theo chữ khi chữ dài hơn), phải là tiêu đề, "Đọc tiếp" (không nhóm). Rê chuột hoặc focus: "Đọc
tiếp" hiện dần `0.3s ease-out`, ảnh không phóng to.

| Phần | 1440 | 390 |
| --- | --- | --- |
| Lưới | 3 cột 410px, gap 70px | Một cột, gap 30px |
| Bài | Ảnh 38% (156px) + chữ, gap 20px | Ảnh 31.5% + chữ |
| Tiêu đề | 19.2px/1.4, cách trên dưới 19.2px | như PC |
| Đọc tiếp | 12.8px 700 chữ hoa, ẩn tới khi hover | không hiện trên cảm ứng |

## Chú thích thuật ngữ

- **Chip lọc**: link dạng nhãn chọn năm đăng bài.
- **Lazy**: ảnh chỉ tải khi gần vào viewport.
