# Dòng thời gian About

Nguồn: CSS `.about-journey`; motion `detail.js` (`mountAboutJourney`); spec [ba trang con R9](../../../docs/specs/detail-pages.md#r9-about-dòng-thời-gian-tám-bản-vẽ).

Tám mốc của Trường Thịnh (Những năm 2000 tới Hôm nay), mỗi mốc một bản vẽ nét. Preview là các bản vẽ đã vẽ xong.

## Bản vẽ

- Nét isometric hoặc chiếu xiên, một độ dày nét, màu theo bảng `--art-line`, `--art-face`, `--art-side`, `--art-accent` của từng
  bản vẽ; khối nổi có nét gấp ở mọi góc sắc, không bo góc chỗ cần nét gấp.
- Mỗi mốc vẽ máy hoặc sản phẩm, không cả hai; không biểu tượng tôn giáo. Mốc 2020 là tấm ván 1220 × 2440 nesting phôi tủ (bản vẽ kỹ
  thuật, không vân gỗ).
- Sinh bằng `draw4.py` (Library `thiet-ke-trang-gioi-thieu/v2/`; tấm ván: `nesting/build_svg.py`), không sửa tay.

## Bố cục

- Từ 981px: cột trái khung bản vẽ sticky và thanh tiến độ tám nút; cột phải tám `article` mốc, mốc đang đọc đậm, mốc khác `ink` 20%.
- Tới 980px: một cột, mỗi mốc có bản vẽ đủ của nó ở trên chữ, không thanh tiến độ.

## Chuyển động

- Cuộn điều khiển `--p` của từng bản vẽ, hai chiều. Khung đầu trắng tinh; nét viền chạy theo đường; màu quét lên bằng nét cọ cắt
  theo hình, vật trước che dần vật sau. Chữ nổi 2012 nổi lên khỏi nền; con dấu 2006 hạ xuống rồi nhấc lên.
- Reduced motion: bản vẽ đủ, chỉ đổi bản vẽ theo mốc. Không JavaScript và dưới 981px: bản vẽ đủ, đứng yên.

## Chú thích thuật ngữ

- **Nesting**: xếp phôi trên tấm ván để cắt CNC tốn ít ván nhất.
- **Nét gấp**: đường nối góc mặt trước với góc mặt sau, cho thấy khối nổi.
