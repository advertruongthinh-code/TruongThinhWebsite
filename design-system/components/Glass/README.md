# Kính

Một component cho mọi bề mặt glass của trang Advertising. Runtime
`glass-surface.mjs` dựng `div.glass-surface` gồm các lớp bậc nhòe, một lớp
tint trắng và một lớp hạt nhiễu; style ở mục Kính của `src/site/detail.css`.
Không bề mặt nào khác tự viết `backdrop-filter`.

| Dạng | Bề mặt |
| --- | --- |
| Cung (`data-glass-shape="arc"`) | Kính cuối masonry, nền cho cụm CTA trên batch [skeleton](../Skeleton/README.md) |
| Phủ đều (`data-glass-shape="even"`) | Vùng dư quanh ảnh [primary](../Primary/README.md) khi ảnh contain còn chỗ trống |
| Phủ đều, năm bậc (`data-glass-reveal`) | Ảnh [card](../MediaCard/README.md) và [primary](../Primary/README.md) vừa tải, chỉ trong lúc ảnh hiện |

## Hành vi

- **Nhòe tăng dần thật:** kính hiện và tan có năm bậc `2`, `4.5`, `9`, `16`,
  `28px`; blur xếp chồng cộng dồn nên mỗi lớp chỉ thêm phần tăng `2`, `4.03`,
  `7.79`, `13.23`, `22.98px`. Dạng cung có ba bậc `4.5`, `12`, `28px` (phần tăng
  `4.5`, `11.12`, `25.3px`) để vuốt trên điện thoại tầm trung đủ mượt. Mỗi bậc
  chồng mép lên bậc kế, không thấy bậc hay bóng ma hai lớp.
  Dạng phủ đều đứng yên dùng một bậc đủ `28px`, nhìn như năm bậc chồng mà nhẹ hơn.
  Dạng cung cũng dùng một bậc đủ làm lõi bên trong cung, ba bậc chỉ phủ dải;
  lõi chuyển sang ba bậc qua `48px` bên trong cung nên không thấy đường nối:
  lõi hiện đủ ở nửa ngoài trước khi các bậc tắt ở nửa trong, nên trang nét không lọt qua.
- **Dạng cung:** chỉ làm nền cho cụm CTA (tiêu đề và nút); card skeleton phía
  trên vẫn nét và thấy chuyển động. Biên là cung tròn, tâm giữa màn hình và dưới
  batch; trong cung nhòe tối đa, ra ngoài nhòe giảm dần về 0. Đỉnh cung ở `45%`
  cụm CTA tính từ mép trên tiêu đề, bán kính `4.0` × bề rộng màn, dải giảm nhòe
  `1.20` × chiều cao cụm. Dải không lên quá ảnh thật; bán kính tăng nếu cần để
  hai góc đáy batch trắng tuyệt đối.
- **Trắng theo cùng cung:** ngoài dải không có trắng, tới cung đạt tint, vào
  trong tăng tới trắng tuyệt đối ở vòng qua hai góc đáy batch.
- **Hạt nhiễu:** đơn sắc, tĩnh, đậm `4%` trên tông giữa, hòa trộn `overlay`, một
  hạt một pixel thiết bị; ở dạng cung, hạt mờ dần tới vòng trắng tuyệt đối nên
  vùng đó giữ trắng. Dạng cung dùng hạt trắng hòa trộn thường opacity `0.16`
  (nhìn như overlay trên kính sáng, tint bớt `0.08`), vì lớp hòa trộn làm
  Chromium bỏ nhòe khi trang cuộn bằng chuyển động.
- **Màu sau kính:** độ bão hòa `1.7`, độ sáng `1.04` (mỗi bậc căn bậc năm),
  tint trắng alpha `0.12`. Dạng cung: bão hòa `1.55`, độ sáng `1.05` (mỗi bậc căn
  bậc ba), tint `0.35` ở cung (owner, 05/10).
- Kính cung và kính nền primary đứng yên, giữ nguyên khi giảm chuyển động. Không có khúc xạ, viền sáng
  hay đổ bóng. Nền tối của [viewer](../Viewer/README.md) phóng to là lớp làm
  tối, không phải Kính.

Preview dựng tay một khung ảnh có kính phủ đều ở nửa phải; class và style vẫn
của website. Hạt nhiễu sinh lúc chạy nên preview không có.

## Hiện và tan trên ảnh vừa tải

Ảnh của card hay primary giải mã xong thì kính phủ đều năm bậc hiện trên
[skeleton](../Skeleton/README.md), crossfade skeleton sang ảnh diễn ra dưới
kính, rồi kính tan. Ba bước chồng lên nhau, tổng `1.4s`:

| Bước | Thời điểm | Đường cong |
| --- | --- | --- |
| Kính hiện trên skeleton | 0 đến 0.6s | `cubic-bezier(0, 0, 0.26, 1)` (`--ease`) |
| Skeleton mờ, ảnh hiện | 0.3 đến 0.9s | `cubic-bezier(0.65, 0, 0.35, 1)` |
| Kính tan, ảnh rõ nét | 0.6 đến 1.4s | `cubic-bezier(0.86, 0, 0.07, 1)` (`power4.inOut`) |

- Các bậc hiện lần lượt từ nhẹ tới mạnh, tan theo chiều ngược lại, chỉ bằng
  opacity; tint và hạt nhiễu theo cùng mức, nên kính bắt đầu và kết thúc không
  nhòe, không tint. Kính là lớp cuối của khung media, dưới các nút ảnh.
- Primary đổi sang ảnh có sẵn: kính phủ ảnh đang xem, cùng đường cong, thời
  gian nhân `3/7`, tổng `0.6s` (kính hiện 0 đến 0.26s, tan 0.26 đến 0.6s).
- Ảnh có sẵn ở card và giảm chuyển động: không kính.
- Hiện xong thì gỡ kính khỏi DOM; card hay primary rời đi giữa chừng cũng gỡ.

Thời gian ở [Motion](../../motion.md#ảnh-trong-card).

Spec: [Kính dùng chung](../../../docs/specs/glass-surface.md).

## Chú thích thuật ngữ

- **Kính**: lớp glassmorphism làm nhòe và phủ trắng nội dung phía sau.
- **Bậc nhòe**: một lớp kính có một bán kính blur cố định.
- **Cụm CTA**: tiêu đề "Dấu ấn tiếp theo" và nút "Trao đổi ý tưởng" cuối masonry.
- **Tint**: lớp màu trắng bán trong suốt trên kính.
- **Overlay**: chế độ hòa trộn giữ nguyên trắng và đen tuyệt đối.
