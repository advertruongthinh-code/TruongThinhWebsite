# Trường Thịnh — Product

## Product statement

Website thương hiệu và tạo lead cho **Nội thất, Quảng Cáo Trường Thịnh** — đơn vị
đi từ khảo sát, tư vấn và thiết kế đến sản xuất, lắp đặt hoàn thiện. Trải nghiệm
phải tạo đủ tin tưởng để khách gọi Zalo tư vấn hoặc đặt lịch khảo sát.

The repository root is the canonical website.

## Audiences

- Chủ nhà phố, căn hộ và homestay/Airbnb cần nội thất bền, đúng công năng.
- Chủ shop, showroom, quán ăn, cafe và văn phòng cần không gian vừa nhận diện
  thương hiệu vừa vận hành tốt.
- Chủ điểm bán cần kiosk, xe/rạp bán hàng, bảng hiệu, hộp đèn hoặc sản phẩm phục
  vụ quảng cáo.

Không có nhóm khách hàng ưu tiên; ba mảng được trình bày như ba năng lực ngang
hàng.

## Jobs to be done

1. Hiểu nhanh Trường Thịnh làm gì và có thể thi công thực tế.
2. Nhìn thấy kinh nghiệm hơn 20 năm qua công trình, xưởng, vật liệu và tay nghề.
3. Chọn đúng route cho nhu cầu.
4. Chuyển sang VI/EN mà không mất ngữ cảnh.
5. Gọi Zalo hoặc đặt lịch khảo sát với ít ma sát.

## Service architecture

| Route | Nội dung chính |
| --- | --- |
| `/` | Câu chuyện thương hiệu, ba lĩnh vực, bằng chứng tay nghề |
| `/nha-o/` | Nhà phố, căn hộ, homestay |
| `/kinh-doanh/` | Shop/showroom, F&B/cafe, văn phòng |
| `/quang-cao/` | Kiosk, xe/rạp bán hàng, bảng hiệu, hộp đèn |
| `/gioi-thieu/` | Kinh nghiệm, xưởng, đội ngũ và cam kết |

Quy trình ở mọi điểm chạm phải giữ nguyên:
**Khảo sát → Tư vấn → Sản xuất → Lắp đặt**.

## Brand

- Tên hiển thị: **TRƯỜNG THỊNH — NỘI THẤT · QUẢNG CÁO**.
- Tính cách: kinh nghiệm, sáng tạo, uy tín.
- Giọng điệu: chắc chắn, trực diện, tiết chế, giàu cảm giác nghề nghiệp.
- Màu xanh biển và cam là điểm nhấn; nền ưu tiên giấy sáng, vật liệu và hình ảnh.
- Logo tạm: tam giác đơn màu chia xéo thành bốn phần.

Tuyên bố “hơn 20 năm” được phép dùng. Năm thành lập chính xác vẫn là dữ kiện chờ
chủ dự án xác nhận.

## Experience principles

- Cho công trình lên tiếng trước lời quảng cáo.
- Gắn sáng tạo với khả năng sản xuất và thi công thực tế.
- Dùng nhịp editorial, khoảng trắng và typography kiến trúc thay cho card grid
  đại trà.
- Dùng motion để kể quá trình hình thành không gian, không phô diễn vô cớ.
- Chuyển động phải có trạng thái `prefers-reduced-motion`.
- Mọi route đều có CTA Zalo rõ nhưng không che nội dung.
- Reference chỉ định hướng bố cục, câu chuyện và motion; không sao chép source,
  media hoặc nội dung.

## Content rules

- Nội dung mặc định là tiếng Việt; mọi copy nhìn thấy, title, description, alt và
  aria có bản tiếng Anh.
- Chữ ít, ý rõ; ưu tiên động từ và bằng chứng.
- Không tự công bố số liệu chưa có nguồn.
- Không dùng khuôn mặt nhận diện trong ảnh, ngoại trừ
  `assets/site/expanded/legacy-team.webp` đã được người dùng duyệt.

## Conversion

CTA chính:

- Gọi Zalo tư vấn.
- Đặt lịch khảo sát.

Các dữ kiện phải được chủ dự án cung cấp trước production:

- URL hoặc số Zalo thật.
- Địa chỉ trụ sở.
- Năm thành lập chính xác.
- Chính sách và thời hạn bảo hành.

## Quality bar

- Responsive tại 320, 390, 768, 1024 và 1440 px.
- WCAG 2.1 AA cho nội dung và controls chính.
- Không overflow ngang, console error hoặc network failure.
- VI/EN giữ qua reload.
- Menu, gallery, filters, route links, CTA và back-to-top hoạt động bằng bàn phím
  lẫn touch.
- Hình ảnh tải đúng sau scroll; motion không ẩn nội dung khi reduced motion.
