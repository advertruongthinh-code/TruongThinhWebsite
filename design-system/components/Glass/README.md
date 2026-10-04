# Kính

Một component cho mọi bề mặt glass của trang Advertising. Runtime
`glass-surface.mjs` dựng `div.glass-surface` gồm năm lớp bậc nhòe, một lớp
tint trắng và một lớp hạt nhiễu; style ở mục Kính của `src/site/detail.css`.
Không bề mặt nào khác tự viết `backdrop-filter`.

| Dạng | Bề mặt |
| --- | --- |
| Cung (`data-glass-shape="arc"`) | Kính cuối masonry, nền cho cụm CTA trên batch [skeleton](../Skeleton/README.md) |
| Phủ đều (`data-glass-shape="even"`) | Vùng dư quanh ảnh [primary](../Primary/README.md) khi ảnh contain còn chỗ trống |

## Hành vi

- **Nhòe tăng dần thật:** năm bậc `2`, `4.5`, `9`, `16`, `28px`; blur xếp chồng
  cộng dồn nên mỗi lớp chỉ thêm phần tăng `2`, `4.03`, `7.79`, `13.23`,
  `22.98px`. Mỗi bậc chồng mép lên bậc kế, không thấy bậc hay bóng ma hai lớp.
  Dạng phủ đều đứng yên dùng một bậc đủ `28px`, nhìn như năm bậc chồng mà nhẹ hơn.
- **Dạng cung:** chỉ làm nền cho cụm CTA (tiêu đề và nút); card skeleton phía
  trên vẫn nét và thấy chuyển động. Biên là cung tròn, tâm giữa màn hình và dưới
  batch; trong cung nhòe tối đa, ra ngoài nhòe giảm dần về 0. Đỉnh cung ở `50%`
  cụm CTA tính từ mép trên tiêu đề, bán kính `4.0` × bề rộng màn, dải giảm nhòe
  `1.20` × chiều cao cụm. Dải không lên quá ảnh thật; bán kính tăng nếu cần để
  hai góc đáy batch trắng tuyệt đối.
- **Trắng theo cùng cung:** ngoài dải không có trắng, tới cung đạt tint, vào
  trong tăng tới trắng tuyệt đối ở vòng qua hai góc đáy batch.
- **Hạt nhiễu:** đơn sắc, tĩnh, đậm `4%` trên tông giữa, hòa trộn `overlay`, một
  hạt một pixel thiết bị; ở dạng cung, hạt mờ dần tới vòng trắng tuyệt đối nên
  vùng đó giữ trắng.
- **Màu sau kính:** độ bão hòa `1.7`, độ sáng `1.04` (mỗi bậc căn bậc năm),
  tint trắng alpha `0.12`.
- Kính đứng yên, giữ nguyên khi giảm chuyển động. Không có khúc xạ, viền sáng
  hay đổ bóng. Nền tối của [viewer](../Viewer/README.md) phóng to là lớp làm
  tối, không phải Kính.

Preview dựng tay một khung ảnh có kính phủ đều ở nửa phải; class và style vẫn
của website. Hạt nhiễu sinh lúc chạy nên preview không có.

Đã duyệt, chờ code: kính hiện và tan trên ảnh card và primary vừa tải
([Kính](../../approved-designs.md#kính)).

Spec: [Kính dùng chung](../../../docs/specs/glass-surface.md).

## Chú thích thuật ngữ

- **Kính**: lớp glassmorphism làm nhòe và phủ trắng nội dung phía sau.
- **Bậc nhòe**: một lớp kính có một bán kính blur cố định.
- **Cụm CTA**: tiêu đề "Dấu ấn tiếp theo" và nút "Trao đổi ý tưởng" cuối masonry.
- **Tint**: lớp màu trắng bán trong suốt trên kính.
- **Overlay**: chế độ hòa trộn giữ nguyên trắng và đen tuyệt đối.
