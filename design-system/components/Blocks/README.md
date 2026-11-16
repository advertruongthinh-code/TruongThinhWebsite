# Khối trang công trình và News

Nguồn: `scripts/site/blocks.mjs`; CSS `.blk`, `.project-hero` (dùng chung `.hero` trong `detail.css`), `.blk-title`, `.blk-paragraph`, `.blk-image`, `.blk-image-text`, `.blk-pair`, `.blk-facts`, `.blk-quote`, `.blk-contact`, `.blk-cta`, `.blk-projects`, `.blk-news-cards`, `.blk-banners`; spec [layout-library R1](../../../docs/specs/layout-library.md#r1-danh-mục-khối), [projects R1, R3](../../../docs/specs/projects.md#r1-dải-công-trình-trên-trang-nhà-ở-và-kinh-doanh), [news R3](../../../docs/specs/news.md#r3-trang-bài).

Bộ khối dựng trang chi tiết công trình, bài News và dải công trình trên trang Nhà ở, Kinh doanh. Mỗi khối là một
`section.blk` cách nhau `section-gap`; dữ liệu khối nằm ở JSON, cùng dữ liệu ra cùng HTML. Preview dựng từ dữ liệu cố
định `scripts/docs/blocks-preview.json` theo thứ tự hero, tiêu đề, đoạn văn, ô thông số, ảnh cạnh chữ, cặp ảnh, ảnh lệch phải, trích
dẫn, liên hệ nhanh, dải công trình, CTA mũi tên, thẻ News liên quan. Gallery dùng khung [Gallery ngang](../Gallery/README.md).

| Khối | Cấu trúc | 1440 | 390 |
| --- | --- | --- | --- |
| Hero (`hero-project`) | Hero chung của trang tĩnh ([Hero](../Hero/README.md)): ảnh phủ kín nền tối, tên công trình chữ hoa trên tiêu đề, `tagline` 1 đến 3 dòng có một chữ nghiêng 700, nút "Thiết kế không gian của bạn" tới khối Zalo, "Cuộn xuống" | Cỡ tiêu đề chung các hero; tên 16px 600; nút 16px 700 cách tiêu đề 32px, gạch chân 3px khi rê chuột | Tên vẫn hiện, canh giữa; nút luôn gạch chân |
| Tiêu đề (`section-title`) | `h2` nét 300 | 64px/1.1; trang công trình 64px/1.4 như Espacio | 36px; trang công trình 40px/1.4 |
| Đoạn văn (`paragraph`) | Cột chữ ở nửa phải, thụt dòng đầu, dàn chữ theo Espacio | 24px/1.4 500, cột 600px, thụt 100px | 20.8px, cột 360px, thụt 50px |
| Ô thông số (`facts-grid`) | 2 tới 4 ô (trang công trình: Khu vực, Diện tích, Hạng mục, Vật liệu chính), mỗi ô nhô lên lần lượt khi vào viewport: nhãn chữ hoa trên, chữ dưới. Trang công trình như Espacio: tràn mép, ô ngăn bằng vạch dọc #d3d3d3, số 12.8px, nhãn thành tiêu đề lớn, chữ cỡ thân bài | 4 cột, gap 43.2px; nhãn 13px 700, chữ 19.44px. Trang công trình: 4 cột 360px, ô đệm 0 35px 90px, nhãn 28.8px 500, chữ 16px 500, cách nhau 15px | 2 cột 168px, gap 24px; chữ 18px. Trang công trình: một cột canh giữa, vạch ngang giữa các ô, ô đệm 45px 15px, nhãn 20.8px |
| Ảnh cạnh chữ (`image-text`) | Ảnh dọc cột trái, đoạn văn cột phải, như Espacio `-layout-parrafo -layout-right` | Lưới 1fr 2fr (445px, 890px), cách 35px, đoạn văn cách đỉnh 1em | Một cột: ảnh trên, chữ dưới |
| Ảnh (`image-single`) | Một ảnh: `wide`, `left-2-3`, `right-2-3`, `left-1-2`, `right-1-2` | `wide` rộng 1370px | Mọi vị trí rộng 360px |
| Cặp ảnh (`image-pair`) | Hai ảnh `equal`, `left-large`, `right-large` | Gap 40px; `left-large` 2:1. Trang công trình như Espacio: tràn mép, hai nửa bằng nhau gap 35px, ảnh nhỏ của `left-large`/`right-large` rộng 60% canh giữa | Một cột tràn mép 390px, gap 16px |
| Trích dẫn (`quote`) | `blockquote` cột phải, không thụt dòng, `cite` màu `muted` | Chữ 19.44px/1.55, cột tối đa 576px | 18px |
| Liên hệ nhanh (`contact-quick`) | Tiêu đề nét 300 trái, nút Zalo nền mực phải | Tiêu đề 64px; nút 14px 700, cao 52px | Tiêu đề 36px, nút xuống dưới |
| CTA mũi tên (`cta-arrow`) | Chữ hoa 15px 700 canh giữa, mũi tên 144 × 40px; trang News và công trình 16px 600, mũi tên 200 × 44px | Rê chuột: mũi tên trượt 0.75rem `0.4s` | Như PC; mũi tên trang News và công trình 150 × 33px |
| Dải công trình (`project-slider`) | Thẻ dọc so le cao thấp như [Project reel](../ProjectReel/README.md), tên chữ hoa dưới ảnh, track cuộn ngang snap. Trên trang công trình có tiêu đề nghiêng canh giữa "Công trình khác" như Espacio "Other projects" | Thẻ 302.4px, 4 thẻ một màn; tiêu đề 64px nét 300 nghiêng | Thẻ 296.4px; trang công trình thẻ 200 × 300px, gap 15px, thẻ chẵn thấp 120px, tiêu đề 40px |
| Tin khác (`news-cards`) | Tiêu đề căn giữa, 3 thẻ như dải News trang chủ ([NewsList](../NewsList/README.md)) | Tiêu đề 64px; 3 cột 410px, gap 70px | Tiêu đề 40px; một cột, gap 30px |
| Banner (`banner-links`) | 1 tới 3 ảnh có tiêu đề, bấm sang trang khác | 1, 2 hoặc 3 cột | Một cột |

Khoảng cách giữa khối 90px trên PC, 30px trên phone; lề 35px PC, 15px phone. Hero và đầu bài News nền tối
(`data-header-tone="inverse"`), các khối còn lại nền giấy, header đậm. Ảnh hiện dần khi tải xong
([Motion](../../motion.md#ảnh-trong-card)); thứ tự khối trên phone giống PC.

## Chú thích thuật ngữ

- **Khối**: một section dựng từ một mục dữ liệu JSON, có kiểu (`type`) và schema riêng.
- **Snap**: cuộn ngang dừng đúng mép thẻ.
