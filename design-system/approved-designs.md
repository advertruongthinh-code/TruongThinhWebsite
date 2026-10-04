# Đã duyệt, chờ code

Bốn thiết kế owner duyệt ngày 04/10 trên bản chạy thử
[Kính chờ Trường Thịnh](https://claude.ai/artifact/PNv9Hg2Tpc1b2sLEEjQxZf)
(phiên bản 9). Website chưa chạy các thiết kế này, nên component và
[Motion](motion.md) vẫn mô tả code hiện tại. PR code chuyển từng mục vào
component và Motion, rồi xóa mục khỏi trang này.

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

- Kính: `blur(28px) saturate(1.08) brightness(1.04)`, tint trắng alpha 0.12,
  cùng kính nền primary; bắt đầu và kết thúc ở `blur(0)`, tint 0.
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
- Nền blur vùng dư đi cùng ảnh; morph sang viewer phóng to giữ nguyên.

Spec: [Skeleton chờ ảnh](../docs/specs/loading-glass-and-page-entry.md) R4, R5.

## CTA cuối trang

Cuối trang Advertising, cụm CTA neo theo đường giữa viewport.

- Chân chữ dòng cuối của tiêu đề nằm đúng `vh/2`, sai số 1px, ở mọi cỡ từ
  320px, VI/EN. Nút "Trao đổi ý tưởng" nằm dưới một gap masonry.
- Batch skeleton dưới CTA co giãn: card cuối mỗi cột kéo tới đáy batch, không
  mỏng hơn `0.25` bề rộng card. Trang Advertising bỏ `footer-top-gap`.
- Tiêu đề tối thiểu `1.3rem` (cỡ nút `0.8rem` nhân 1.618); thiếu chỗ thì nhỏ
  lại vừa đủ, không dưới mức này.
- Parallax: cụm CTA trôi chậm hơn cuộn 10%, lệch 0 đúng tại cuối trang, ở mọi
  chiều rộng; giảm chuyển động thì không có.
- [Footer](components/Footer/README.md) gọn ở cửa sổ nhỏ (rộng `≤750px` hoặc
  cao `≤640px`), không quá 38.2% viewport. Điện thoại dọc: hai hàng, khoảng
  130px; hàng đầu địa chỉ `1rem`, hàng hai icon 24px cách 8px bên trái, bản
  quyền bên phải, cao 44px. Cửa sổ nhỏ khác: một hàng, 67 đến 90px. Nhãn "Mạng
  xã hội" ẩn bằng mắt; viền trên một đường `line`.
- Mọi footer còn ba icon theo thứ tự Facebook, TikTok, YouTube (Remix Icon
  4.6.0 `youtube-fill`).

Spec: [CTA giữa viewport](../docs/specs/advertising-cta-center-parallax.md).

## Vào thẳng trang

F5, gõ link hay mở link từ Zalo, Google: [route veil](motion.md#shell) trắng
hiện có phủ trang từ khung hình đầu. Header nằm trên veil nên intro header chạy
cùng lúc. Trang dựng xong thì veil mở `1s power4.inOut` như chuyển route, rồi
entrance của trang chạy tiếp.

- Không có veil khi Back từ bfcache hay khi giảm chuyển động.
- Mạng chậm: veil giữ tới khi script dựng trang xong. Script lỗi: gỡ veil ngay.

Spec: [Skeleton chờ ảnh](../docs/specs/loading-glass-and-page-entry.md) R6, R7.

## Chú thích thuật ngữ

- **Kính**: lớp blur chỉ xuất hiện khi ảnh thay skeleton.
- **Crossfade**: một lớp mờ đi trong lúc lớp khác hiện lên ở cùng chỗ.
- **Chân chữ**: baseline, đường các chữ đứng lên.
- **Route veil**: lớp trắng toàn màn hình che trang khi chuyển route.
- **bfcache**: bộ nhớ trình duyệt giữ nguyên trang để Back hiện tức thì.
- **Parallax**: lớp nội dung chạy khác tốc độ cuộn để tạo chiều sâu.
