# Đã duyệt, chờ code

Thiết kế owner đã duyệt nhưng website chưa chạy. Kính trên ảnh vừa tải được
duyệt ngày 04/10 trên bản chạy thử
[Kính chờ Trường Thịnh](https://claude.ai/artifact/PNv9Hg2Tpc1b2sLEEjQxZf)
(phiên bản 9). Component và [Motion](motion.md) vẫn mô tả code hiện tại. PR code
chuyển từng mục vào component và Motion, rồi xóa mục khỏi trang này.

## Kính

Ảnh của [card](components/MediaCard/README.md) hay
[primary](components/Primary/README.md) giải mã xong thì
[Kính](components/Glass/README.md) dạng phủ đều hiện, crossfade đang chạy diễn
ra dưới kính, rồi kính tan. Ba bước chồng lên nhau, tổng `1.4s`:

| Bước | Thời điểm | Đường cong |
| --- | --- | --- |
| Kính hiện trên skeleton | 0 đến 0.6s | `cubic-bezier(0, 0, 0.26, 1)` (`--ease`) |
| Skeleton mờ, ảnh hiện (đã code, [Motion](motion.md#ảnh-trong-card)) | 0.3 đến 0.9s | `cubic-bezier(0.65, 0, 0.35, 1)` |
| Kính tan, ảnh rõ nét | 0.6 đến 1.4s | `cubic-bezier(0.86, 0, 0.07, 1)` (`power4.inOut`) |

- Các bậc hiện lần lượt từ nhẹ tới mạnh, tan theo chiều ngược lại, chỉ bằng
  opacity; kính bắt đầu và kết thúc không nhòe, không tint.
- Primary đổi sang ảnh có sẵn: kính phủ ảnh đang xem, cùng đường cong, thời
  gian nhân `3/7`, tổng `0.6s` (kính hiện 0 đến 0.26s, tan 0.26 đến 0.6s).
- Ảnh có sẵn ở card và giảm chuyển động: không kính.

Spec: [Kính dùng chung](../docs/specs/glass-surface.md) R6,
[Skeleton chờ ảnh](../docs/specs/loading-glass-and-page-entry.md) R2, R4.

## Chú thích thuật ngữ

- **Kính**: component glassmorphism dùng chung, làm nhòe và phủ trắng nội dung
  phía sau.
- **Bậc nhòe**: một lớp kính có một bán kính blur cố định.
- **Crossfade**: một lớp mờ đi trong lúc lớp khác hiện lên ở cùng chỗ.
