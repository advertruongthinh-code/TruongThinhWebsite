# Content và media

Cách viết copy và chọn ảnh cho website. Fact sản phẩm (khách hàng, route,
địa chỉ, dữ kiện chưa xác minh) ở [PRODUCT.md](../PRODUCT.md); hướng ảnh
Advertising ở [Ảnh Advertising](advertising-images.md). Contract kỹ thuật
(node lá VI/EN, motion hook, gallery, file ảnh) ở
[ba trang con](../docs/specs/detail-pages.md#r4-nội-dung-vien-và-hook)
và [chuẩn file ảnh](../docs/specs/media-delivery.md#r5-chuẩn-file-ảnh).

## Giọng điệu

Giàu kinh nghiệm, sáng tạo, đáng tin, trực tiếp, súc tích, đi ra từ
[câu chuyện thương hiệu](brand.md#câu-chuyện-thương-hiệu). Để công trình, vật
liệu, quy trình và khả năng thi công lên tiếng trước lời quảng cáo. Câu ngắn,
cụ thể, có thông tin vật liệu, quy trình hoặc kết quả. Tránh giọng luxury
chung chung và lưới bất động sản rập khuôn.

## Song ngữ VI/EN

- Tiếng Việt là bản gốc; tiếng Anh là bản tương ứng.
- Không công bố dữ kiện owner chưa xác nhận (Zalo, năm thành lập, bảo hành);
  địa chỉ trụ sở giữ nguyên chuỗi ở cả VI và EN. Danh sách ở
  [PRODUCT.md](../PRODUCT.md#operating-context).

## Hero ba route dịch vụ

| Route | Qualifier VI | Title VI | Title EN |
| --- | --- | --- | --- |
| Advertising | `Sản phẩm quảng cáo` | `để thương hiệu / luôn trong tầm mắt` | `Keep your brand / always in sight` |
| Commercial | `SHOP · F&B · SHOWROOM · VĂN PHÒNG` | `Thiết kế để bán tốt. / Thi công để vận hành bền.` | `Designed to sell. / Built to perform.` |
| Residential | `NHÀ PHỐ · CĂN HỘ · HOMESTAY` | `Nơi tái tạo / năng lượng sống` | `A place to / recharge` |

Ba route không có motto riêng và không thêm chapter divider kiểu About.
Advertising theo bố cục Projects: hero nền trắng, qualifier trên, filter dưới,
scroll cue và mép hàng ảnh đầu ở đáy viewport.

## Mạch nội dung theo route

| Route | Mạch | Hướng ảnh |
| --- | --- | --- |
| Trang chủ | Hero, ba portal lĩnh vực, tay nghề, năng lực (vật liệu, xưởng CNC, quy trình), công trình, câu chuyện hơn 20 năm, logo khách hàng, lời mời | Bằng chứng thật: không gian, vật liệu, dụng cụ, tay nghề |
| Residential | Mở full-bleed, lời hứa nhà ở, chuỗi không gian, vật liệu và tay nghề, quy trình, CTA khảo sát | Ánh sáng, luồng đi, lưu trữ, vật liệu, sinh hoạt thật; cân bằng nhà phố, căn hộ, homestay |
| Commercial | Mở theo vận hành; shop, F&B, văn phòng; độ bền vật liệu; công trình chọn lọc; CTA | Luồng khách, quầy, trưng bày, thanh toán, kho; không gian đang hoạt động |
| Advertising | Hero, filter, masonry ảnh sản phẩm, CTA | Sản phẩm làm được: tổng thể, chi tiết cấu tạo và ánh sáng, gia công và lắp đặt |
| About | Hơn 20 năm, xưởng và con người, cách làm, cam kết, CTA | Xưởng, đội ngũ, quy trình |

Thứ tự bảo trì nội dung: Advertising, Commercial, Residential.

## Crop và con người

- Advertising (masonry, primary, viewer ở mức fit) giữ trọn ảnh. Chỉ nền nút
  suggestion được cover crop (`suggestionPosition`).
- Route khác có thể `object-fit: cover`. Giữ chủ thể trong vùng giữa khoảng 60%
  ngang và 70% dọc, không đặt tay, dụng cụ, mép đồ quan trọng sát 10% biên.
  Kiểm crop ở 320, 390, 768, 1024, 1440px trước khi đổi `object-position`.
- Không có khuôn mặt nhận diện được: quay lưng, đi ra xa, đầu khuất sau vật
  hoặc ngoài khung; nhòe chuyển động hay "chỉ thấy tay" không đủ khi tư thế vẫn
  hướng mặt về máy. Kiểm phản chiếu, màn hình, ảnh trên tường. Ngoại lệ duy nhất:
  `assets/content/shared/legacy-team.webp`.
- Không chữ giả, logo giả, watermark, tay hoặc dụng cụ méo. Logo và thông tin
  khách thật chỉ khi đã có quyền công bố; xóa địa chỉ, ảnh gia đình, thông tin
  riêng tư.

## Sức sống và chủ thể

- Ảnh cửa hàng, hội chợ, sự kiện cần sức sống: thêm người theo
  [Crop và con người](#crop-và-con-người), ưu tiên người đi lại nhòe chuyển
  động; người không che chủ thể.
- Cần nhấn chủ thể thì chụp kiểu phơi sáng: chủ thể đứng yên sắc nét, người,
  xe và vật phụ xung quanh nhòe chuyển động.

## Card nhiều media

Ảnh của một [card nhiều media](../docs/specs/media-card.md#r1-dữ-liệu-media-của-card)
giữ nguyên chủ thể (sản phẩm, vật liệu, chữ, màu) và đổi góc chụp, bối cảnh,
tình huống, giờ trong ngày, thời tiết. Ví dụ ấn phẩm in: lúc trên tay người
dùng, lúc đặt yên trên bàn, quầy, kệ. Ảnh đầu tiên đã duyệt làm tham chiếu chủ
thể cho các ảnh sau.

## Chú thích thuật ngữ

- **Safe crop**: crop vẫn giữ chủ thể và thông tin quan trọng.
- **Qualifier**: dòng nhãn nhỏ phía trên tiêu đề hero.
- **Phơi sáng**: chụp tốc độ chậm; vật đứng yên rõ nét, vật chuyển động nhòe.
