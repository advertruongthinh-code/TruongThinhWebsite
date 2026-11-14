# Trang danh sách News

Nguồn: `scripts/site/block-pages.mjs`; CSS `.blk-article-head`, `.blk-news-filter`, `.blk-news-list`, `.blk-news-card`, `.blk-news-pager`, `.home-news`, `.blk-news-cards`; spec [news R2, R3](../../../docs/specs/news.md#r2-trang-danh-sách-news), [R4](../../../docs/specs/news.md#r4-news-trên-các-trang-khác).

Trang `/vi/news/` theo bố cục Espacio: đầu trang nền trắng có dòng nhỏ, `h1` lớn căn giữa và hàng lọc nhóm bài, rồi lưới bài. Bài mới nhất là thẻ
lớn cột trái, bốn bài kế là lưới 2 × 2 cột phải, các bài còn lại là thẻ hàng ngang dưới lưới đó; 12 bài mỗi trang,
thanh số trang ở cuối. Trang bài dùng `blk-article-head--post` nền trắng: dòng "Tin tức / nhóm" căn giữa, tiêu đề canh trái, ngày căn giữa; thẻ chỉ có ảnh và tiêu đề (owner 2026-11-11); thân bài là
[khối](../Blocks/README.md). Preview dựng từ dữ liệu cố định `scripts/docs/blocks-preview.json`.

| Phần | Cấu trúc | 1440 | 390 |
| --- | --- | --- | --- |
| Đầu trang | Nền trắng, dòng nhỏ `.blk-article-head__kicker` 16px 600 chữ hoa ngay trên `h1`, `h1` chữ hoa lấp đầy cột (90%, tối đa 900px) nét 500, chip lọc đậm mờ 30%, mục chọn đậm đủ gạch chân 3px | Dòng nhỏ cách trang 241px; `h1` tối đa 112px/1.4; chip cách chân `h1` 119px, 16px | Dòng nhỏ 220px; chip cách `h1` 39px, 15.36px một dòng vuốt ngang |
| Đầu trang bài | "Tin tức / nhóm" 16px 600 chữ hoa căn giữa, tiêu đề nét 500 canh trái thụt 1 gutter, ngày 16px chữ hoa căn giữa | Dòng nhóm cách trang 235px; tiêu đề 64px/1.4, chữ cách mép 70px | 215px; tiêu đề 40px, cách mép 30px |
| Thẻ lớn | Ảnh bìa, tiêu đề lớn | Cột 667.5px; tiêu đề 48px/1.3, cách 0.83em | Một cột 360px; tiêu đề 32px |
| Lưới 2 × 2 | Ảnh, tiêu đề | Hai cột 316.25px, gap 35px; tiêu đề 20.8px/1.4 nét 500 | Thành thẻ hàng ngang, gap 15px |
| Thẻ hàng ngang | Ảnh trái (tối thiểu 3:2, cao theo chữ), tiêu đề phải cách đỉnh ảnh 17px | Cột 210.8px + 421.7px, gap 35px | Ảnh 1/3, gap 35px |

Motion lúc mở trang (hook chung của [motion](../../motion.md)): `.blk-article-head__titles` mang `data-motion-hero-wrapper-zoom`
với `--hero-zoom-from: 1.1` và `--hero-zoom-place: translate(0, 0)` nên thu từ 1.1 về 1 trong `2.5s`; dòng nhỏ và `h1` là
`data-motion-words` trễ `0.6s`. Đầu trang bài: dòng nhóm `data-motion-lines`, tiêu đề `data-motion-lines` trễ `0.3s`, ngày
`data-motion-words` trễ `0.9s`. Không có nút Cuộn xuống (Espacio ẩn nút này ở hai trang News).

Rê chuột hoặc focus thẻ: gạch chân 3px chạy theo bề rộng chữ tiêu đề, mọc từ trái `0.3s`, như navbar
([Header](../Header/README.md)); ảnh phóng 1.1 trong `0.3s`. Lăn wheel trên PC thì thẻ lớn dính lại tới khi lưới bên phải cuộn hết
([news R2](../../../docs/specs/news.md#r2-trang-danh-sách-news)). Ảnh thẻ lớn tải ngay, thẻ còn lại lazy.

## Dải News trang chủ và "Tin khác"

Khối News duy nhất ngoài trang News, ngay dưới hero trang chủ, theo trang chủ Espacio (đo lại 2026-11-11, lề và số cột đo 384 tới 1920 ngày 2026-11-14): 3 bài mới nhất, mỗi
bài ảnh bìa trái (tối thiểu 5:6, cao theo chữ khi chữ dài hơn), phải là nhóm chữ hoa, tiêu đề, "Đọc tiếp". Cuối trang bài,
khối "Tin khác" dùng đúng thẻ này dưới tiêu đề căn giữa 64px (40px phone). Rê chuột hoặc focus: ảnh phóng 1.2 trong `0.6s ease-out`,
nhóm có gạch chân 3px mọc từ trái, "Đọc tiếp" hiện dần (`0.6s` vào, `0.3s` ra).

| Phần | 1440 | 390 |
| --- | --- | --- |
| Lưới | Khung tối đa 1500px canh giữa (1920: lề 210px); 3 cột 410px, gap 70px; từ 1200px gap 50px, từ 960px 2 cột, từ 750px lề 15px gap 30px, từ 578px 1 cột | Một cột, gap 30px, lề 15px |
| Bài | Ảnh 1fr (156px) + chữ 1.5fr, gap 20px | Ảnh 1/3 (113px) + chữ |
| Nhóm | 16px 700 chữ hoa, cách trên 15px | như PC |
| Tiêu đề | 19.2px/1.4 nét 500, cách trên dưới 19.2px | như PC |
| Đọc tiếp | 12.8px 600 chữ hoa, cách dưới 15px, ẩn tới khi hover | không hiện trên cảm ứng |

## Chú thích thuật ngữ

- **Chip lọc**: link dạng nhãn chọn nhóm bài (Tất cả, Nhà ở, Kinh doanh, Quảng cáo, Xu hướng).
- **Lazy**: ảnh chỉ tải khi gần vào viewport.
