# Đã duyệt, chờ code

Thiết kế owner đã duyệt nhưng website chưa chạy. Kính trên ảnh đang tải được
duyệt ngày 04/10 trên bản chạy thử
[Kính chờ Trường Thịnh](https://claude.ai/artifact/PNv9Hg2Tpc1b2sLEEjQxZf)
(phiên bản 9); số của Kính chốt cùng ngày trên
[Kính Trường Thịnh](https://claude.ai/artifact/3cmMiPqYxMMq9LAWCHwujH)
(phiên bản 4). Component và [Motion](motion.md) vẫn mô tả code hiện tại. PR code
chuyển từng mục vào component và Motion, rồi xóa mục khỏi trang này.

## Kính

Một component cho mọi bề mặt glass, thay hai lớp kính đang chạy. Mọi bề mặt
dùng chung markup `.glass-surface`, cùng custom property `--glass-*`; không bề
mặt nào tự viết `backdrop-filter`.

| Dạng | Bề mặt |
| --- | --- |
| Cung (`data-glass-shape="arc"`) | Kính cuối masonry, nền cho cụm CTA trên batch [skeleton](components/Skeleton/README.md) |
| Phủ đều (`data-glass-shape="even"`) | Vùng dư quanh [primary](components/Primary/README.md); ảnh card và primary vừa tải xong (bảng dưới) |

- **Nhòe tăng dần thật:** năm bậc `2`, `4.5`, `9`, `16`, `28px`, mỗi bậc chồng
  mép lên bậc kế nên không thấy bậc hay bóng ma hai lớp.
- **Dạng cung:** chỉ làm nền cho cụm CTA (tiêu đề và nút); card skeleton phía
  trên vẫn nét và thấy chuyển động. Biên là cung tròn, tâm giữa màn hình và dưới
  batch; trong cung nhòe tối đa, ra ngoài nhòe giảm dần về 0. Đỉnh cung ở
  `50%` cụm CTA tính từ mép trên tiêu đề, bán kính `4.0` × bề rộng màn, dải giảm
  nhòe `1.20` × chiều cao cụm. Dải không lên quá ảnh thật.
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

Kính trên ảnh vừa tải: ảnh của [card](components/MediaCard/README.md) hay
[primary](components/Primary/README.md) giải mã xong thì kính phủ đều hiện,
crossfade đang chạy diễn ra dưới kính, rồi kính tan. Ba bước chồng lên nhau,
tổng `1.4s`; kính bắt đầu và kết thúc không nhòe, không tint:

| Bước | Thời điểm | Đường cong |
| --- | --- | --- |
| Kính hiện trên skeleton | 0 đến 0.6s | `cubic-bezier(0, 0, 0.26, 1)` (`--ease`) |
| Skeleton mờ, ảnh hiện (đã code, [Motion](motion.md#ảnh-trong-card)) | 0.3 đến 0.9s | `cubic-bezier(0.65, 0, 0.35, 1)` |
| Kính tan, ảnh rõ nét | 0.6 đến 1.4s | `cubic-bezier(0.86, 0, 0.07, 1)` (`power4.inOut`) |

Primary đổi sang ảnh có sẵn: kính phủ ảnh đang xem, cùng đường cong, thời gian
nhân `3/7`, tổng `0.6s` (kính hiện 0 đến 0.26s, tan 0.26 đến 0.6s). Ảnh có sẵn
ở card và giảm chuyển động: không kính.

Spec: [Kính dùng chung](../docs/specs/glass-surface.md),
[Skeleton chờ ảnh](../docs/specs/loading-glass-and-page-entry.md) R2, R4.

## Chú thích thuật ngữ

- **Kính**: component glassmorphism dùng chung, làm nhòe và phủ trắng nội dung
  phía sau.
- **Bậc nhòe**: một lớp kính có một bán kính blur cố định.
- **Cụm CTA**: tiêu đề "Dấu ấn tiếp theo" và nút "Trao đổi ý tưởng" cuối masonry.
- **Crossfade**: một lớp mờ đi trong lúc lớp khác hiện lên ở cùng chỗ.
