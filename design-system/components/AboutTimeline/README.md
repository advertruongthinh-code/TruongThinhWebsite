# Dòng thời gian About

Nguồn: CSS `.about-journey`; motion `detail.js` (`mountAboutJourney`); spec [ba trang con R9](../../../docs/specs/detail-pages.md#r9-about-dòng-thời-gian-chín-bản-vẽ).

Chín mốc của Trường Thịnh (Những năm 2000 tới Hôm nay, có 2021 máy dán cạnh), mỗi mốc một bản vẽ nét. Preview là các bản vẽ đã vẽ xong.

## Bản vẽ

- Nét isometric hoặc chiếu xiên, một độ dày nét, màu theo bảng `--art-line`, `--art-face`, `--art-side`, `--art-accent` của từng
  bản vẽ; khối nổi có nét gấp ở mọi góc sắc, không bo góc chỗ cần nét gấp.
- Mặt cong có màu (khối trụ, góc bo, nắp máy in, đũa) tô chuyển sáng tối kiểu falloff, không kẻ nét chỗ cong. Không nét nào lố
  khỏi vùng của nó (rãnh cánh tủ Hôm nay chạm biên tủ theo đường bo, không lố ra ngoài); vật trước che vật sau đúng thứ tự. Máy in, CNC, máy dán cạnh có chi tiết như ảnh mẫu
  của owner nhưng giữ nét và bảng màu này: máy in không nút, không màn hình, dây mực giấu dưới nắp che; đầu CNC là khối hộp, khối trụ và một nét đậm. Không
  ghi mã máy hay khổ ván lên hình.
- Mỗi mốc vẽ máy hoặc sản phẩm, không cả hai; không biểu tượng tôn giáo. Mốc 2020 là tấm ván nesting phôi tủ (bản vẽ kỹ thuật, không
  vân gỗ, không ghi khổ ván).
- Sinh bằng `draw5.py` (Library `thiet-ke-trang-gioi-thieu/v2/`; tấm ván: `nesting/build_svg.py`), không sửa tay.

## Bố cục

- Từ 981px: cột trái khung bản vẽ sticky; cột phải chín `article` mốc, mốc đang đọc đậm, mốc khác `ink` 20%. Thanh tiến độ nằm
  ở khe giữa hai cột, chạy từ nút đầu qua Hôm nay rồi mờ dần (tương lai); mỗi nút ngang tâm năm của mốc mình và trôi cùng chữ; phần cam chạy tới nút mốc hiện tại.
- Tới 980px: một cột, mỗi mốc có bản vẽ đủ của nó ở trên chữ, không thanh tiến độ. Sân khấu vẫn render trong ô 1px trong suốt
  (không `display: none`), vì ảnh nhỏ dùng lại bản vẽ của nó.

## Chuyển động

- Mỗi mốc là một chặng: năm qua vạch thì bản vẽ tự chạy hết (1,5 giây), không dừng giữa chừng; cuộn ngược thì tua về trắng
  (0,8 giây) rồi bản vẽ mốc trước hiện đủ. Khung đầu trắng tinh; nét viền chạy theo đường; màu quét lên bằng nét cọ cắt theo
  hình, vật trước che dần vật sau. Chữ nổi 2012 nổi lên khỏi nền; con dấu 2006 hạ xuống rồi nhấc lên.
- Reduced motion: bản vẽ đủ, chỉ đổi bản vẽ theo mốc. Không JavaScript và dưới 981px: bản vẽ đủ, đứng yên.

## Chú thích thuật ngữ

- **Nesting**: xếp phôi trên tấm ván để cắt CNC tốn ít ván nhất.
- **Nét gấp**: đường nối góc mặt trước với góc mặt sau, cho thấy khối nổi.
