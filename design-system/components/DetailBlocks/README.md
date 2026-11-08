# Khối trang con

Nguồn: CSS `.detail-lead`, `.detail-heading`, `.detail-duo`, `.detail-intro`; spec [ba trang con R2, R8](../../../docs/specs/detail-pages.md#r2-residential-và-commercial-section-và-nội-dung).

Ba khối dựng nhịp chữ và ảnh trên Residential, Commercial, About. Preview lấy từ Residential theo thứ tự
lead, heading, duo.

| Khối | Cấu trúc | 1440 | 390 |
| --- | --- | --- | --- |
| Lead | Tiêu đề `gallery-title` nét 300 phần cuối nghiêng, đoạn dẫn lệch phải | Tiêu đề 64px; đoạn 19.44px/30.13 rộng 576px | 40px; đoạn 18px |
| Heading | Eyebrow `label` 12.8px 700 chữ hoa, tiêu đề `section-heading` | Tiêu đề 83.52px 600, 1.1 | 52px |
| Duo | Hai ảnh: trái 3/2, phải 4/5 thấp hơn, lệch dọc | Hai cột `667.5px`, gap 35px; ảnh phải `400.5 × 500.6` | Một cột, ảnh phải `210 × 262.5` |

About dùng `detail-intro` thay lead (cùng vai trò). Ảnh hiện dần `0.45s` khi tải xong
([Motion](../../motion.md#ảnh-trong-card)); tiêu đề reveal theo dòng ([Motion](../../motion.md#text)).

## Chú thích thuật ngữ

- **Eyebrow**: dòng nhãn nhỏ phía trên tiêu đề.
- **Lead**: khối mở đầu nội dung sau hero.
