# Chuỗi ảnh một không gian

Cho chuỗi ảnh của một không gian (công trình mẫu trang Công trình, series nhà ở, kinh
doanh); mâu thuẫn với [Tạo ảnh](agent-rule-ad-images.md#tạo-ảnh) thì file này thắng.

## Bản vẽ trước, ảnh sau

- Mỗi lần gen hoặc gen lại, owner duyệt bản vẽ hiện hành trước: mặt bằng, góc máy,
  bảng thống kê món. Bản vẽ cũ sai chuẩn gỡ khỏi trang duyệt (owner 2026-11-11).
- Họa tiết, chi tiết trang trí (chạm, ghép veneer, tranh gạch, vòm) có bản vẽ chi tiết
  ghi kích thước; prompt của ảnh có chi tiết đó kèm bản vẽ tương ứng (owner 2026-11-11).
- Mặt bằng gửi model chỉ là PNG có mã F/D/W và vị trí, hướng, số camera; mỗi bảng (món,
  vật liệu, góc máy, đèn, decor tường) là một CSV riêng (owner 2026-11-11, 2026-11-12).
- Ảnh ghi rõ camera: tên file `cam-04.png`, hồ sơ và trang duyệt ghi "Camera 4"; không in
  chữ lên ảnh (owner 2026-11-12). Render 3D clay chỉ là gợi ý lỏng (owner 2026-11-11).
- Đổi thiết kế, bỏ hay dời camera: sửa dữ liệu, CSV, mặt bằng trước, ghi changelog, rồi
  mới gen; số các camera khác giữ nguyên (owner 2026-11-13).

## Ảnh ref và moodboard

1. Brief mỗi công trình (`moodboard/brief.md`): phong cách, bảng màu, vật liệu, đồ chính,
   đèn, decor, lấy từ CSV món và vật liệu.
2. Tìm ảnh ref trên web theo nhóm món (đầu giường, kệ TV, tủ bếp, decor). Lưu ảnh cạnh
   `refs.csv` (file, URL ảnh, trang nguồn, ảnh cho thấy gì, dùng cho món nào). Ref chỉ để
   học kiểu món, không chép màu, thiết kế, không đưa lên site.
3. Moodboard tạo bằng ChatGPT web từ brief kèm ref, đủ chuẩn đưa lên site; lưu
   `moodboard-01.png`, `chat.md`, `record.json`; owner duyệt trước khi gen ảnh camera
   (owner 2026-11-13). Không dùng Pinterest API hay Notion làm moodboard.
4. Gen từng camera kèm moodboard (chỉ để theo màu, vật liệu, decor; không chép bố cục)
   và chỉ những ref hợp góc đó (ví dụ ref cửa sổ bếp cho camera thấy bếp).

## Nhất quán giữa các góc

- Mỗi công trình chọn một camera chuẩn cho từng khu (owner chỉ định, ví dụ camera 1 cho
  bếp ăn); góc khác theo ảnh chuẩn, CSV lệch ảnh chuẩn thì ảnh chuẩn thắng.
- Gen lần lượt, ảnh chuẩn trước; ảnh sau kèm ảnh chuẩn làm neo, ghi neo là camera nào;
  prompt nêu ảnh mới thấy gì (trái, giữa, phải), hướng nhìn theo mặt bằng (owner 2026-11-09).
- Món chung có mô tả chữ và ảnh cắt từ ảnh chuẩn (`mon-chung.json`), chép vào prompt mọi
  góc thấy món đó; mảng tường, khu vực không có mã món cũng có ảnh cắt riêng.
- Góc mới khó đặt: vẽ đỏ lên bản sao ảnh chuẩn vị trí camera mới, mũi tên hướng nhìn,
  hai mép vùng nhìn; gửi kèm mô tả, ảnh chuẩn nguyên bản, mặt bằng; prompt ghi nét đỏ
  chỉ để hướng dẫn, không vẽ ra ảnh (owner 2026-11-13).
- Món chung (cửa, cửa sổ, đồ, vật liệu, đồ trên mặt bếp, mặt bàn) giống hệt mọi góc; ảnh
  lệch là ảnh sai (owner 2026-11-11). Trước khi đưa owner, dựng trang so sánh
  `so-sanh-*.png`: cắt cùng món từ ảnh chuẩn và từng ảnh đặt cạnh nhau; khác bất kỳ chỗ
  nào thì sửa một lượt rồi báo đạt hay không theo từng camera.
- Lệch ít (một món, một mảng tường): sửa trên chính ảnh, giữ khung; lệch nhiều hoặc góc
  thấy phần khó thống nhất: gen mới, hoặc đổi góc cho phần đó ra khỏi khung, hoặc owner
  bỏ camera (owner 2026-11-13).
- Codex chạy từng ảnh một; ảnh cũ đổi tên đuôi `-<vòng>-truoc`, không xóa; mỗi ảnh một
  `record.json`.

## Thiết kế

- Nội thất nổi bật, có điểm nhấn; hạn chế mây tre, lam gỗ (owner 2026-11-11).
- Mái ngói thì trong nhà có trần phẳng; hiên không cần (owner 2026-11-11).
- Có bản vẽ đèn trần, đèn tường, decor tường; tường không trống (owner 2026-11-13).
- Bếp có tủ treo, hút mùi nằm trong tủ; khung tủ thẳng, cánh có thể cong (owner 2026-11-13).

## Chú thích thuật ngữ

- **Camera chuẩn**: ảnh owner chọn làm chuẩn cho một khu; các góc khác phải khớp nó.
- **Neo**: ảnh đã duyệt gửi kèm prompt để model giữ đúng món chung.
- **Moodboard**: tấm ghép ảnh định hướng màu, vật liệu, đồ và decor của một công trình.
- **Ảnh ref**: ảnh tham khảo từ web, chỉ để học kiểu món.
- **Trang so sánh**: ảnh ghép đặt cùng món từ nhiều camera cạnh nhau để kiểm khớp.
- **Render 3D clay**: ảnh dựng khối trắng từ mô hình 3D, chưa có vật liệu.
- **CSV**: file bảng dạng chữ, mỗi dòng một món.
