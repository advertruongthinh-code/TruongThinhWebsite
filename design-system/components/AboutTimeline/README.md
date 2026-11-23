# Dòng thời gian About

Nguồn: CSS `.about-journey`; motion `detail.js` (`mountAboutJourney`); spec [ba trang con R9](../../../docs/specs/detail-pages.md#r9-about-dòng-thời-gian-tấm-ván-nesting).

Sáu mốc của Trường Thịnh (2006 tới Hôm nay) kể cạnh một tấm ván 1220 × 2440 đang được cắt CNC. Preview là tấm ván tĩnh đã cắt xong.

## Tấm ván

- Bản vẽ kỹ thuật, không vân gỗ, không nhãn: nền `paper`, phôi nền `#f3f3f1` viền `ink` 3.6 đơn vị (mm), lỗ xuyên và ván thừa
  gạch chéo 45° `ink` 35%, rãnh soi nét liền 2, hèm kính mặt sau nét đứt `16 9`, lỗ khoan tròn có dấu tâm.
- Phôi thật của bộ tủ: hông tủ khoan hệ 32, cánh khung hèm kính có phôi bo góc lồng trong lỗ, cánh tủ bếp hèm kính, cặp đợt góc
  và cặp đợt mép sóng lồng khít (pairwise), cặp chân cong, mặt hộc có rãnh tay nắm. Mũi 6 mm, khe và lề 10 mm, tận dụng 90%.
- Kích thước 1220 và 2440 nét `muted`; dòng meta trên tấm ván chữ hoa 12.8px 600.
- Hình sinh bằng `build_svg.py` (Library `thiet-ke-trang-gioi-thieu/nesting/`), không sửa tay.

## Bố cục

- Từ 981px: cột trái tấm ván sticky cao bằng màn hình, thanh tiến độ 2px `line` có phần đã qua `orange-accent` và sáu nút
  vuông 12px; cột phải sáu `article` mốc, năm 500 `clamp(3rem, 6.4vw, 5.75rem)` không xuống dòng, đoạn 18 tới 22px, câu mở 600.
- Tới 980px: một cột, tấm ván xếp ngang vẽ đủ nằm trên danh sách, không thanh tiến độ.

## Chuyển động

- Có motion từ 981px: năm mốc chạm 55% màn hình thì nhóm phôi của mốc đó chạy đường dao `orange-accent` 1.4s rồi đổi từ nét
  đứt nhạt sang phôi đậm (một chiều); mốc đang đọc đậm, mốc khác `ink` 20%.
- Không JavaScript, reduced motion, dưới 981px: tấm ván vẽ đủ, mọi mốc đậm.

## Chú thích thuật ngữ

- **Nesting**: xếp phôi trên tấm ván để cắt CNC tốn ít ván nhất.
- **Pairwise**: hai phôi dùng chung một đường cắt cong, lồng khít vào nhau.
- **Hèm kính**: rãnh mặt sau quanh lỗ cánh để gắn kính.
