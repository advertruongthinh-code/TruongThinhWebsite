# Khối trang công trình và News

Nguồn: `scripts/site/blocks.mjs`; CSS `.blk`, `.blk-hero`, `.blk-title`, `.blk-paragraph`, `.blk-image`, `.blk-pair`, `.blk-facts`, `.blk-quote`, `.blk-contact`, `.blk-cta`, `.blk-projects`, `.blk-news-cards`, `.blk-banners`; spec [layout-library R1](../../../docs/specs/layout-library.md#r1-danh-mục-khối), [projects R1, R3](../../../docs/specs/projects.md#r1-dải-công-trình-trên-trang-nhà-ở-và-kinh-doanh), [news R3](../../../docs/specs/news.md#r3-trang-bài).

Bộ khối dựng trang chi tiết công trình, bài News và dải công trình trên trang Nhà ở, Kinh doanh. Mỗi khối là một
`section.blk` cách nhau `section-gap`; dữ liệu khối nằm ở JSON, cùng dữ liệu ra cùng HTML. Preview dựng từ dữ liệu cố
định `scripts/docs/blocks-preview.json` theo thứ tự hero, tiêu đề, đoạn văn, ô thông số, cặp ảnh, ảnh lệch phải, trích
dẫn, liên hệ nhanh, dải công trình, CTA mũi tên, thẻ News liên quan. Gallery dùng khung [Gallery ngang](../Gallery/README.md).

| Khối | Cấu trúc | 1440 | 390 |
| --- | --- | --- | --- |
| Hero (`hero-project`) | Ảnh phủ kín viewport nền tối, tiêu đề hai dòng: dòng 1 nét 600, dòng 2 nét 300 nghiêng; phụ đề nhãn chữ hoa | Tiêu đề 115.2px/0.95; phụ đề 13px 700 | 48px; phụ đề 13px |
| Tiêu đề (`section-title`) | `h2` nét 300 | 64px/1.1 | 36px |
| Đoạn văn (`paragraph`) | Cột chữ ở nửa phải, thụt dòng đầu, dàn chữ theo Espacio | 24px/1.4 500, cột 600px, thụt 100px | 20.8px, cột 360px, thụt 50px |
| Ô thông số (`facts-grid`) | 2 tới 4 ô đánh số: nhãn chữ hoa trên, chữ dưới | 4 cột, gap 43.2px; nhãn 13px 700, chữ 19.44px | 2 cột 168px, gap 24px; chữ 18px |
| Ảnh (`image-single`) | Một ảnh: `wide`, `left-2-3`, `right-2-3`, `left-1-2`, `right-1-2` | `wide` rộng 1370px | Mọi vị trí rộng 360px |
| Cặp ảnh (`image-pair`) | Hai ảnh `equal`, `left-large`, `right-large` | Gap 40px; `left-large` 2:1 | Một cột tràn mép 390px, gap 16px |
| Trích dẫn (`quote`) | `blockquote` cột phải, không thụt dòng, `cite` màu `muted` | Chữ 19.44px/1.55, cột tối đa 576px | 18px |
| Liên hệ nhanh (`contact-quick`) | Tiêu đề nét 300 trái, nút Zalo nền mực phải | Tiêu đề 64px; nút 14px 700, cao 52px | Tiêu đề 36px, nút xuống dưới |
| CTA mũi tên (`cta-arrow`) | Chữ hoa 15px 700 canh giữa, mũi tên 144 × 40px | Rê chuột: mũi tên trượt 0.75rem `0.4s` | Như PC |
| Dải công trình (`project-slider`) | Thẻ dọc so le cao thấp như [Project reel](../ProjectReel/README.md), tên chữ hoa dưới ảnh, track cuộn ngang snap | Thẻ 302.4px, 4 thẻ một màn | Thẻ 296.4px |
| Tin khác (`news-cards`) | Tiêu đề căn giữa, 3 thẻ như dải News trang chủ ([NewsList](../NewsList/README.md)) | Tiêu đề 64px; 3 cột 410px, gap 70px | Tiêu đề 40px; một cột, gap 30px |
| Banner (`banner-links`) | 1 tới 3 ảnh có tiêu đề, bấm sang trang khác | 1, 2 hoặc 3 cột | Một cột |

Khoảng cách giữa khối 90px trên PC, 30px trên phone; lề 35px PC, 15px phone. Hero và đầu bài News nền tối
(`data-header-tone="inverse"`), các khối còn lại nền giấy, header đậm. Ảnh hiện dần khi tải xong
([Motion](../../motion.md#ảnh-trong-card)); thứ tự khối trên phone giống PC.

## Chú thích thuật ngữ

- **Khối**: một section dựng từ một mục dữ liệu JSON, có kiểu (`type`) và schema riêng.
- **Snap**: cuộn ngang dừng đúng mép thẻ.
