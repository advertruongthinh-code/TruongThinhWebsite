# Kính

Nguồn: `src/site/masonry/glass-surface.mjs`; CSS `.glass-surface`; spec [Kính](../../../docs/specs/glass-surface.md).

Một component cho mọi bề mặt glass của trang Advertising. Runtime
`masonry/glass-surface.mjs` dựng `div.glass-surface` gồm các lớp bậc nhòe, một lớp
tint trắng và một lớp hạt nhiễu; style ở mục Kính của `src/site/detail.css`.
Không bề mặt nào khác tự viết `backdrop-filter`.

| Dạng | Bề mặt |
| --- | --- |
| Cung (`data-glass-shape="arc"`) | Kính cuối masonry, nền cho cụm CTA trên batch [skeleton](../Skeleton/README.md) |
| Phủ đều (`data-glass-shape="even"`) | Vùng dư quanh ảnh [primary](../Primary/README.md) khi ảnh contain còn chỗ trống |

## Hành vi

- **Nhòe tăng dần thật:** trần nhòe `100px` cho mọi bề mặt (owner, 06/10). Kính
  hiện và tan có ba bậc `16.07`, `57.14`, `100px` (owner chọn 24/10, thay năm bậc); blur xếp chồng
  cộng dồn nên mỗi lớp chỉ thêm phần tăng `16.07`, `54.84`, `82.07px`. Dạng cung trên điện thoại có hai lớp: lõi `28px` và một bậc dải `25.3px` (phần tăng) để vuốt trên điện thoại
  tầm trung đủ mượt. Trên PC có 9 bậc dải tăng cấp số nhân `4.5`, `6.6`, `9.8`, `14.4`, `21.2`, `31.3`, `46.1`, `67.9`, `100px`
  (mỗi bậc chỉ thêm phần tăng căn bậc hai của hiệu bình phương hai mức kề). Mỗi bậc
  chồng mép lên bậc kế, không thấy bậc hay bóng ma hai lớp.
  Kính nền primary (phủ đều, đứng yên) không có bậc nhòe, chỉ tint và hạt
  nhiễu; ảnh nền phía dưới tự nhòe bằng `filter: blur(100px) saturate(1.7)
  brightness(1.04)`, vì `backdrop-filter` trên ảnh tĩnh để lại đường nối ô
  raster khi Chrome vẽ lại (rê chuột lên tab).
  Dạng cung cũng dùng một lớp làm lõi bên trong cung (PC `100px`, điện thoại `28px`), các bậc chỉ phủ dải;
  lõi chuyển sang các bậc qua `48px` bên trong cung nên không thấy đường nối:
  lõi hiện đủ ở nửa ngoài trước khi các bậc tắt ở nửa trong, nên trang nét không lọt qua.
- **Dạng cung:** chỉ làm nền cho cụm CTA (tiêu đề và nút); card skeleton phía
  trên vẫn nét và thấy chuyển động. Biên là cung tròn, tâm giữa màn hình và dưới
  batch. Nhòe tăng liên tục từ 0 ở mép dải qua 9 bậc (PC), đạt trần `100px` sau khi lấn vào trong cung
  một đoạn bằng `1/3` bề rộng dải (owner 2026-11-01), từ đó vào trong đều `100px`. Số lớp cố định theo máy, không đo fps: PC lõi
  và 9 bậc dải; điện thoại 2 lớp (lõi `28px` và bậc dải trong cùng). Đỉnh cung cao hơn mép trên tiêu đề
  `15%` chiều cao cụm CTA (chữ nằm trong lõi; điện thoại giữ `35%` dưới mép tiêu đề), bán kính `3.5` × bề rộng màn, dải giảm nhòe
  PC `2.5`, điện thoại `1.75` × chiều cao cụm (owner 2026-11-07 làm dịu; bậc dải điện thoại trải hết dải, mép mask mỗi bậc
  theo smoothstep), vùng trắng tuyệt đối `0.35` × bề rộng card. Dải không
  lên quá ảnh thật; bán kính tăng nếu cần để hai góc đáy batch trắng tuyệt đối.
- **Trắng theo cùng cung:** trắng về 0 ở `0.85` bề rộng dải (thu hẹp, owner 2026-11-01; hạt nhiễu thu theo), tới cung đạt tint, vào
  trong tăng tới trắng tuyệt đối ở vòng qua hai góc đáy batch.
- **Hạt nhiễu:** đơn sắc, tĩnh, đậm `3%` trên tông giữa, hòa trộn `overlay`, một
  hạt một pixel thiết bị; ở dạng cung, hạt mờ dần tới vòng trắng tuyệt đối nên
  vùng đó giữ trắng. Dạng cung dùng hạt trắng hòa trộn thường opacity `0.12`
  (nhìn như overlay trên kính sáng, tint bớt `0.06`), vì lớp hòa trộn làm
  Chromium bỏ nhòe khi trang cuộn bằng chuyển động.
- **Màu sau kính:** độ bão hòa `1.7`, độ sáng `1.04` (mỗi bậc căn bậc năm),
  tint trắng alpha `0.12`. Dạng cung chỉ blur (bão hòa, độ sáng `1`, để không lộ
  gờ màu tại cung), tint `0.55` ở cung (owner 10/10).
- Kính cung và kính nền primary đứng yên, giữ nguyên khi giảm chuyển động. Không có khúc xạ, viền sáng
  hay đổ bóng. Nền tối của [viewer](../Viewer/README.md) phóng to là lớp làm
  tối, không phải component Kính.

Preview chụp khung ảnh chính trang chi tiết Advertising từ trang chạy thật. Hạt
nhiễu sinh lúc chạy nên preview dùng hạt SVG tương đương.

## Hiện và tan trên ảnh vừa tải

Bỏ (owner 2026-11-12): không bề mặt nào hiện rồi tan Kính. Lần đầu dùng, Skia biên dịch shader của kính mất 40 đến 106ms giữa
lượt lộ hàng loạt trên PC owner. Ảnh card và primary lộ qua kính mờ vẽ trên canvas Flow, khung batch chỉ mờ dần
([Skeleton](../Skeleton/README.md)). Kính đặt thường trực trên 15 đến 18 card làm kéo thanh cuộn tụt còn 14 FPS (2026-10-31), nên card không có Kính.

Thời gian ở [Motion](../../motion.md#ảnh-trong-card).

Spec: [Kính dùng chung](../../../docs/specs/glass-surface.md).

## Chú thích thuật ngữ

- **Kính**: lớp glassmorphism làm nhòe và phủ trắng nội dung phía sau.
- **Bậc nhòe**: một lớp kính có một bán kính blur cố định.
- **Cụm CTA**: tiêu đề "Dấu ấn tiếp theo" và nút "Trao đổi ý tưởng" cuối masonry.
- **Tint**: lớp màu trắng bán trong suốt trên kính.
- **Overlay**: chế độ hòa trộn giữ nguyên trắng và đen tuyệt đối.
