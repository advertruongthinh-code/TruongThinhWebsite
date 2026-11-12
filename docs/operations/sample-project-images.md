# Ảnh công trình mẫu

Rule cho chuỗi ảnh của một không gian (công trình mẫu trên trang Công trình, series
nhà ở, kinh doanh). Bổ sung bước Tạo ảnh của [Tạo và chấm ảnh](agent-rule-ad-images.md#tạo-ảnh);
mâu thuẫn thì file này thắng cho chuỗi ảnh một không gian.

## Bản vẽ trước, ảnh sau

- Mỗi lần gen hoặc gen lại ảnh công trình mẫu, owner duyệt bản vẽ hiện hành trước:
  mặt bằng, góc máy, bảng thống kê món. Bản vẽ cũ sai chuẩn bị gỡ khỏi trang duyệt,
  không để lẫn với bản mới (owner 2026-11-11).
- Mọi họa tiết, chi tiết trang trí (chạm, ghép veneer, tranh gạch, vòm) có bản vẽ
  chi tiết ghi kích thước (mặt đứng hoặc chi tiết); prompt của ảnh có chi tiết đó
  kèm bản vẽ tương ứng (owner 2026-11-11).
- Mặt bằng gửi model chỉ là ảnh PNG mặt bằng có đánh dấu vị trí, hướng và số
  camera; không kèm bảng, chú giải hay khung tên. Mỗi bảng (món, vật liệu, góc máy)
  là một file CSV riêng (owner 2026-11-11, nhắc lại 2026-11-12).
- Mỗi ảnh gen ra ghi rõ camera nào: tên file theo số camera (`cam-04.png`), hồ sơ
  ảnh và chú thích trên trang duyệt ghi "Camera 4"; không in chữ lên ảnh
  (owner 2026-11-12).
- Render 3D clay chỉ là gợi ý lỏng hoặc bỏ hẳn; không dùng làm nền cho model đồ theo,
  vì ảnh đồ theo 3D mất chi tiết và trông không thật (owner 2026-11-11).

## Nhất quán giữa các góc

- Gen lần lượt, ảnh chính trước; ảnh sau kèm ảnh đã gen làm neo, ghi neo là góc
  máy nào trên bản vẽ; prompt nêu ảnh mới thấy gì (trái, giữa, phải) theo mặt bằng
  và bảng thống kê (owner 2026-11-09).
- Món chung (cửa, cửa sổ, đồ nội thất, vật liệu hoàn thiện) giống hệt ở mọi góc của
  cùng một công trình; ảnh lệch món chung là ảnh sai (owner 2026-11-11).

## Thiết kế

- Nội thất và đồ phải nổi bật, có điểm nhấn; thiết kế bình thường bị trả về
  (owner 2026-11-11).
- Hạn chế mây tre và lam gỗ; nếu dùng thì không có lỗi hình AI (owner 2026-11-11).
- Mái ngói thì trong nhà có trần phẳng (la phông); hiên không cần (owner 2026-11-11).

## Chú thích thuật ngữ

- **Công trình mẫu**: công trình dựng bằng ảnh AI để minh họa năng lực trên trang Công trình.
- **Neo**: ảnh đã duyệt gửi kèm prompt để model giữ đúng món chung.
- **Render 3D clay**: ảnh dựng khối trắng từ mô hình 3D, chưa có vật liệu.
- **CSV**: file bảng dạng chữ, mỗi dòng một món.
