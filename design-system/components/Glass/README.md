# Kính

Một component cho mọi bề mặt glass của trang Advertising. Runtime
`glass-surface.mjs` dựng `div.glass-surface` gồm các lớp bậc nhòe, một lớp
tint trắng và một lớp hạt nhiễu; style ở mục Kính của `src/site/detail.css`.
Không bề mặt nào khác tự viết `backdrop-filter`.

| Dạng | Bề mặt |
| --- | --- |
| Cung (`data-glass-shape="arc"`) | Kính cuối masonry, nền cho cụm CTA trên batch [skeleton](../Skeleton/README.md) |
| Phủ đều (`data-glass-shape="even"`) | Vùng dư quanh ảnh [primary](../Primary/README.md) khi ảnh contain còn chỗ trống |
| Phủ đều, ba bậc (`data-glass-reveal`) | Ảnh [primary](../Primary/README.md) vừa tải, chỉ trong lúc ảnh hiện |

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
  `1.75` × chiều cao cụm, vùng trắng tuyệt đối `0.35` × bề rộng card. Dải không
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

Ảnh hiện thì kính phủ đều ba bậc hiện trên lớp dưới
([skeleton](../Skeleton/README.md) hoặc khung trống), crossfade lớp dưới sang
ảnh diễn ra dưới kính, rồi kính tan. Ba bước chồng lên nhau. Nhịp gốc `1.4s`:

| Bước | Thời điểm | Đường cong |
| --- | --- | --- |
| Kính hiện trên skeleton | 0 đến 0.6s | `cubic-bezier(0, 0, 0.26, 1)` (`--ease`) |
| Skeleton mờ, ảnh hiện | 0.3 đến 0.9s | `cubic-bezier(0.65, 0, 0.35, 1)` |
| Kính tan, ảnh rõ nét | 0.6 đến 1.4s | `cubic-bezier(0.86, 0, 0.07, 1)` (`power4.inOut`) |

- Primary detail chạy đúng reveal của card tải chậm (cùng `0.6s`): kính ba bậc hiện trên skeleton, dưới kính skeleton mờ đi còn ảnh và nền vùng dư hiện lên, rồi kính tan. Điện thoại chạy đúng như PC (owner 11/10).
- Các bậc hiện lần lượt từ nhẹ tới mạnh, tan theo chiều ngược lại, chỉ bằng
  opacity; tint và hạt nhiễu theo cùng mức, nên kính bắt đầu và kết thúc không
  nhòe, không tint. Kính là lớp cuối của khung media, dưới các nút ảnh.
- Nhịp `0.6s`: cùng đường cong, thời gian nhân `3/7` (kính hiện 0 đến 0.26s,
  ảnh hiện 0.13 đến 0.39s, kính tan 0.26 đến 0.6s). Primary hiện từ skeleton
  hay đổi sang ảnh có sẵn đều dùng nhịp này (owner 19/10).
- Card masonry không còn Kính: ảnh card chờ tải tự mờ trên màu chủ đạo rồi blur
  tan ([Media card](../MediaCard/README.md), owner 2026-10-31).
- Giảm chuyển động: không kính.
- Hiện xong thì gỡ kính khỏi DOM; primary rời đi giữa chừng cũng gỡ.

Thời gian ở [Motion](../../motion.md#ảnh-trong-card).

Spec: [Kính dùng chung](../../../docs/specs/glass-surface.md).

## Chú thích thuật ngữ

- **Kính**: lớp glassmorphism làm nhòe và phủ trắng nội dung phía sau.
- **Bậc nhòe**: một lớp kính có một bán kính blur cố định.
- **Cụm CTA**: tiêu đề "Dấu ấn tiếp theo" và nút "Trao đổi ý tưởng" cuối masonry.
- **Tint**: lớp màu trắng bán trong suốt trên kính.
- **Overlay**: chế độ hòa trộn giữ nguyên trắng và đen tuyệt đối.
