# Đã duyệt, chờ code

Thiết kế owner đã duyệt nhưng website chưa chạy. Component và
[Motion](motion.md) mô tả code hiện tại. PR code chuyển từng mục vào component
và Motion, rồi xóa mục khỏi trang này.

## Kính cung: số mới

Owner chốt ngày 05/10 trên bản thử
[Kính Trường Thịnh](https://claude.ai/artifact/3cmMiPqYxMMq9LAWCHwujH). Chỉ đổi
kính dạng cung cuối masonry ([Kính](components/Glass/README.md)); kính phủ đều
ở card và primary giữ số hiện tại. Spec: [Kính](../docs/specs/glass-surface.md).

| Thông số | Hiện tại | Mới |
| --- | --- | --- |
| Tâm cung, tính từ mép trên tiêu đề | `50%` cụm CTA | `45%` cụm CTA |
| Tint ở cung | `0.12` | `0.35` |
| Độ bão hòa sau kính | `1.7` | `1.55` |
| Độ sáng sau kính | `1.04` | `1.05` |

- Tint `0.35` thay cả hai mốc của dải trắng: tới cung đạt `0.35`, vào trong vẫn
  tăng tới trắng tuyệt đối ở vòng qua hai góc đáy batch, ra mép dải về `0`.
- Bão hòa và độ sáng chia đều cho lõi và ba bậc như hiện nay (mỗi bậc căn bậc
  ba).
- Giữ nguyên: bán kính `4.0` × bề rộng màn, dải giảm nhòe `1.20` × chiều cao
  cụm, vùng trắng tuyệt đối `0.25` × bề rộng card, lõi `28px`, ba bậc `4.5`,
  `12`, `28px`, vùng chuyển lõi `48px`, hạt nhiễu `4%`.

## Chú thích thuật ngữ

- **Component**: khối giao diện dùng lại được, có README riêng trong Design
  System.
- **Motion**: chuyển động của giao diện, ghi ở `motion.md`.
- **Tint**: lớp trắng bán trong suốt trên kính.
- **Cụm CTA**: tiêu đề "Dấu ấn tiếp theo" và nút "Trao đổi ý tưởng" cuối masonry.
