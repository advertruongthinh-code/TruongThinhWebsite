# Khối trang con

Nguồn: CSS `.detail-lead`, `.detail-heading`; spec [ba trang con R2, R8](../../../docs/specs/detail-pages.md#r2-residential-và-commercial-section-và-nội-dung).

Hai khối dựng nhịp chữ trên Residential, Commercial, About. Preview lấy từ Residential theo thứ tự lead, heading.

| Khối | Cấu trúc | 1440 | 390 |
| --- | --- | --- | --- |
| Lead | Tiêu đề `gallery-title` nét 400 phần cuối nghiêng, đoạn dẫn lệch phải | Tiêu đề 64px; đoạn 19.44px/30.13 rộng 576px | 40px; đoạn 18px |
| Heading | Eyebrow `label` 12.8px 700 chữ hoa, tiêu đề `section-heading` | Tiêu đề 83.52px 600, 1.1 | 52px |

Ảnh hiện dần `0.45s` khi tải xong
([Motion](../../motion.md#ảnh-trong-card)); tiêu đề reveal theo dòng ([Motion](../../motion.md#text)).

## Chú thích thuật ngữ

- **Eyebrow**: dòng nhãn nhỏ phía trên tiêu đề.
- **Lead**: khối mở đầu nội dung sau hero.
