# Đã duyệt, chờ code

Thiết kế owner đã duyệt nhưng website chưa chạy. Card đang tải, Mở ảnh tại
chỗ và Vào thẳng trang được duyệt ngày 04/10 trên bản chạy thử
[Kính chờ Trường Thịnh](https://claude.ai/artifact/PNv9Hg2Tpc1b2sLEEjQxZf)
(phiên bản 9). Component và [Motion](motion.md) vẫn mô tả code hiện tại. PR code
chuyển từng mục vào component và Motion, rồi xóa mục khỏi trang này.

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

- Kính là [Kính](components/Glass/README.md) dạng phủ đều, cùng kính vùng dư
  của primary; các bậc hiện lần lượt từ nhẹ tới mạnh, tan theo chiều ngược lại,
  chỉ bằng opacity; bắt đầu và kết thúc không nhòe, không tint.
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
- Nền blur vùng dư đi cùng ảnh, dưới [Kính](components/Glass/README.md) dạng
  phủ đều; morph sang viewer phóng to giữ nguyên.

Spec: [Skeleton chờ ảnh](../docs/specs/loading-glass-and-page-entry.md) R4, R5.

## Vào thẳng trang

Veil khi tải trực tiếp đã chạy, xem [route veil](motion.md#shell). Còn chờ
code: mạng chậm thì veil giữ tới khi script dựng trang xong. Hiện script chưa
nhận trang sau 2.5s thì veil gỡ và trang hiện ở trạng thái cuối; script lỗi
thì gỡ veil ngay (đã chạy).

Spec: [Skeleton chờ ảnh](../docs/specs/loading-glass-and-page-entry.md) R6, R7.

## Chú thích thuật ngữ

- **Kính**: component glassmorphism dùng chung, làm nhòe và phủ trắng nội dung
  phía sau.
- **Bậc nhòe**: một lớp kính có một bán kính blur cố định.
- **Crossfade**: một lớp mờ đi trong lúc lớp khác hiện lên ở cùng chỗ.
- **Route veil**: lớp trắng toàn màn hình che trang khi chuyển route.
- **bfcache**: bộ nhớ trình duyệt giữ nguyên trang để Back hiện tức thì.
