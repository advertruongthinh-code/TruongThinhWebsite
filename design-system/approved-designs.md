# Đã duyệt, chờ code

Thiết kế owner đã duyệt nhưng website chưa chạy. Card đang tải, Mở ảnh tại
chỗ và Vào thẳng trang được duyệt ngày 04/10 trên bản chạy thử
[Kính chờ Trường Thịnh](https://claude.ai/artifact/PNv9Hg2Tpc1b2sLEEjQxZf)
(phiên bản 9); số của Kính chốt cùng ngày trên
[Kính Trường Thịnh](https://claude.ai/artifact/3cmMiPqYxMMq9LAWCHwujH)
(phiên bản 3). Component và [Motion](motion.md) vẫn mô tả code hiện tại. PR code
chuyển từng mục vào component và Motion, rồi xóa mục khỏi trang này.

## Kính

Một component cho mọi bề mặt glass, thay hai lớp kính đang chạy. Mọi bề mặt
dùng chung markup `.glass-surface`, cùng custom property `--glass-*`; không bề
mặt nào tự viết `backdrop-filter`.

| Dạng | Bề mặt |
| --- | --- |
| Cung (`data-glass-shape="arc"`) | Kính cuối masonry, nền cho cụm CTA trên batch [skeleton](components/Skeleton/README.md) |
| Phủ đều (`data-glass-shape="even"`) | Vùng dư quanh [primary](components/Primary/README.md), [Card đang tải](#card-đang-tải), [Mở ảnh tại chỗ](#mở-ảnh-tại-chỗ) |

- **Nhòe tăng dần thật:** năm bậc `2`, `4.5`, `9`, `16`, `28px`, mỗi bậc chồng
  mép lên bậc kế nên không thấy bậc hay bóng ma hai lớp.
- **Dạng cung:** chỉ làm nền cho cụm CTA (tiêu đề và nút); card skeleton phía
  trên vẫn nét và thấy chuyển động. Biên là cung tròn, tâm giữa màn hình và dưới
  batch; trong cung nhòe tối đa, ra ngoài nhòe giảm dần về 0. Đỉnh cung ở
  `70%` cụm CTA tính từ mép trên tiêu đề, bán kính `2.7` × bề rộng màn, dải giảm
  nhòe `1.40` × chiều cao cụm. Dải không lên quá ảnh thật.
- **Trắng theo cùng cung:** ngoài dải không có trắng, tới cung đạt tint, vào
  trong tăng tới trắng tuyệt đối ở đáy batch.
- **Hạt nhiễu:** đơn sắc, tĩnh, đậm `4%`, che sọc màu ở dải trắng; không có ở
  vùng trắng tuyệt đối.
- **Màu sau kính:** độ bão hòa `1.7` (hiện `1.08`), độ sáng `1.04`, tint trắng
  alpha `0.12`.
- **Hiện và tan:** các bậc hiện lần lượt từ nhẹ tới mạnh, tan theo chiều ngược
  lại, chỉ bằng opacity; không animate bán kính blur.
- Không phải Kính: nền tối của [viewer](components/Viewer/README.md) phóng to
  giữ là lớp làm tối. Không có khúc xạ, viền sáng hay đổ bóng.

Spec: [Kính dùng chung](../docs/specs/glass-surface.md).

## Card đang tải

Card masonry và related có ảnh chưa tải hiện đúng
[skeleton cuối masonry](components/Skeleton/README.md): cùng khung, mặt Flow,
12 preset, fade vào `600ms`; không có component mới. Ảnh giải mã xong thì ba
bước chồng lên nhau, tổng `1.4s`:

| Bước | Thời điểm | Đường cong |
| --- | --- | --- |
| Kính hiện trên skeleton | 0 đến 0.6s | `cubic-bezier(0, 0, 0.26, 1)` (`--ease`) |
| Skeleton mờ, ảnh hiện dưới kính | 0.3 đến 0.9s | `cubic-bezier(0.65, 0, 0.35, 1)` |
| Kính tan, ảnh rõ nét | 0.6 đến 1.4s | `cubic-bezier(0.86, 0, 0.07, 1)` (`power4.inOut`) |

- Kính là [Kính](#kính) dạng phủ đều, cùng kính vùng dư của primary; bắt đầu
  và kết thúc không nhòe, không tint.
- Ảnh có sẵn trong cache: không skeleton, không kính, fade `0.6s` như card
  thường.
- Giảm chuyển động: skeleton đứng yên, ảnh thay ngay, không kính.

Spec: [Skeleton chờ ảnh](../docs/specs/loading-glass-and-page-entry.md) R1–R3,
R5, R8, R9.

## Mở ảnh tại chỗ

Bấm card ở masonry hoặc related thì ảnh [primary](components/Primary/README.md)
hiện tại chính khung của nó: không ảnh bay từ card, không clone.

- Ảnh chưa tải: skeleton card thay ảnh cũ ngay khi bấm (thay
  [vòng tải](components/LoadRing/README.md)), rồi ba bước kính như card.
- Ảnh có sẵn: kính phủ ảnh đang xem, crossfade sang ảnh mới, kính tan. Cùng
  đường cong, thời gian nhân `3/7`, tổng `0.6s`: kính hiện 0 đến 0.26s,
  crossfade 0.13 đến 0.39s, kính tan 0.26 đến 0.6s.
- Nền blur vùng dư đi cùng ảnh, dưới [Kính](#kính) dạng phủ đều; morph sang
  viewer phóng to giữ nguyên.

Spec: [Skeleton chờ ảnh](../docs/specs/loading-glass-and-page-entry.md) R4, R5.

## Vào thẳng trang

F5, gõ link hay mở link từ Zalo, Google: [route veil](motion.md#shell) trắng
hiện có phủ trang từ khung hình đầu. Header nằm trên veil nên intro header chạy
cùng lúc. Trang dựng xong thì veil mở `1s power4.inOut` như chuyển route, rồi
entrance của trang chạy tiếp.

- Không có veil khi Back từ bfcache hay khi giảm chuyển động.
- Mạng chậm: veil giữ tới khi script dựng trang xong. Script lỗi: gỡ veil ngay.

Spec: [Skeleton chờ ảnh](../docs/specs/loading-glass-and-page-entry.md) R6, R7.

## Chú thích thuật ngữ

- **Kính**: component glassmorphism dùng chung, làm nhòe và phủ trắng nội dung
  phía sau.
- **Bậc nhòe**: một lớp kính có một bán kính blur cố định.
- **Cụm CTA**: tiêu đề "Dấu ấn tiếp theo" và nút "Trao đổi ý tưởng" cuối masonry.
- **Crossfade**: một lớp mờ đi trong lúc lớp khác hiện lên ở cùng chỗ.
- **Route veil**: lớp trắng toàn màn hình che trang khi chuyển route.
- **bfcache**: bộ nhớ trình duyệt giữ nguyên trang để Back hiện tức thì.
