# Ảnh Advertising

Brief tạo ảnh và tiêu chí nghiệm thu ảnh cho sáu nhóm Advertising. Quy định
chung về con người, file web, alt, loading ở [Content và media](content.md).
Ghi tiêu chí không có nghĩa pool ảnh hiện tại đã đạt.

## Công cụ và taxonomy

- Ảnh mới tạo bằng **ChatGPT Images 2.5** qua công cụ mà agent hoặc owner có;
  ghi model và metadata nếu tool trả về, thiếu thì ghi unknown. Không tự đổi
  model.
- Danh mục sản phẩm owner có năm mục I–V, ánh xạ vào sáu nhóm public trong
  `catalog.mjs`: I Bảng hiệu, II Biển văn phòng, III LED, IV In nhanh, phần POSM
  của V là Kiosk. Xe bán hàng là nhóm owner bổ sung. Dịch vụ thiết kế ở V
  không thành nhóm thứ bảy.
- Sáu nhóm là tầng gom; một ảnh mang nhiều nhãn chi tiết tới loại sản phẩm cụ
  thể (tờ rơi, tờ gấp, catalogue là các loại riêng).
- Tên canonical: **chữ nổi Formex** (hoặc "Chữ nổi Alu và Formex"). ID và path
  cũ chứa `format` giữ nguyên để tương thích.

## Nội dung và góc chụp theo nhóm

| Nhóm | Sản phẩm cần bao phủ | Bối cảnh và góc chụp |
| --- | --- | --- |
| `kiosk-posm` | Kiosk, gian hàng triển lãm nhiều quy mô, quầy và kệ trưng bày, tủ kệ theo yêu cầu, bốn kiểu standee | Toàn hoặc trung, thấy tổng thể và cấu tạo; không để kiến trúc hay người che chủ thể |
| `mobile-retail` | Xe, quầy di động cà phê, ăn vặt Việt, kem, trà sữa, trà trái cây | Toàn hoặc trung thấy cả xe, bánh, mặt quầy, mái; thiết bị và không gian thao tác khả thi |
| `signage-raised-letters` | Mặt dựng Alu, bảng hiệu bạt khung sắt, pano khung sắt, chữ Inox vàng/xước/bóng, LED hắt chân/âm chữ, Mica/Alu/Formex, bảng vẫy Mica hút nổi, Inox, Hiflex, LED | Toàn, trung và cận: mặt tiền, nóc, pano cao, chữ trên bệ trong tiểu cảnh. Cận thấy cạnh, mối nối, bề mặt |
| `office-signs-wayfinding` | Số nhà, số phòng (có loại kim loại hắt chân), tên đường, chức danh gỗ–đồng, Mica/Inox, phòng ban, tầng, sơ đồ, cảnh báo, WC | Trung hoặc cận khi đã lắp hay đặt trên bàn; chữ và cấu tạo là chủ thể |
| `led-displays-lightboxes` | LED ma trận đơn sắc/ba màu/full color, màn hình sự kiện, hộp đèn siêu mỏng, tranh điện, chữ lớn gắn LED điểm | Toàn hoặc trung; thấy quy mô, kết cấu đỡ; không nhầm chữ gắn LED điểm với màn ma trận |
| `print-decals` | Danh thiếp, tờ rơi, catalogue, thiệp, chứng nhận, phong bì, menu các loại, Hiflex, decal trong/mờ/kính/tường/xe, tem bế, canvas, bao bì, ly, hộp | Cận hoặc trung, số lượng lớn có tổ chức; in sắc, mép cắt, nếp gấp hợp lý |

Coverage kiểm ở cấp bộ ảnh, không nhồi mọi biến thể vào một ảnh. Ảnh giao
thoa hai nhóm chọn theo sản phẩm chính; không nhân bản ảnh sang hai nhóm.

## Bối cảnh từ khách hàng thật

Mười hai khách hàng owner xác nhận (logo ở `src/site/content/client-logos.json`),
phần lớn ở Bến Tre. Quan hệ và hạng mục là thông tin owner; ứng dụng vào brief
là suy luận thiết kế, không phải hồ sơ thi công.

| Họ bối cảnh | Khách hàng | Cảnh và sản phẩm |
| --- | --- | --- |
| Nhà máy dừa, thực phẩm, mỹ phẩm | BEINCO, Betrimex, Dừa Cửu Long | Văn phòng chính, nhà điều hành, khu sản xuất: biển phòng, chỉ dẫn, biển khu vực, ấn phẩm, bảng hiệu bạt và pano khung sắt; gian hàng triển lãm |
| Ngân hàng | BIDV, HDBank, Vietcombank, VietinBank | Chữ nhôm đục lỗ gắn LED trên nóc, phòng ATM, quầy giao dịch; không thành ảnh máy ATM đơn lẻ |
| Bệnh viện | Minh Đức | Chữ nhôm đục lỗ gắn LED trên nóc, bảng vẫy dẫn xe cứu thương, biển khoa phòng |
| Văn phòng, bảo hiểm, tư vấn | Prudential, BCJ | Sảnh, phòng họp, cửa phòng: chức danh, tên phòng, chỉ dẫn, văn phòng phẩm |
| Khách sạn, hội nghị | Cannes Hotel, TTC Palace Bến Tre | Mặt tiền, lễ tân, sảnh hội nghị, số phòng, menu, ấn phẩm sự kiện |

Brief đi theo thứ tự **ngành, khu vực, vị trí lắp, công năng, góc chụp**, rồi
mới chọn tỷ lệ. Bối cảnh nhận ra qua không gian, không cần logo thật. Quy mô,
khí hậu, đô thị hợp Bến Tre và Việt Nam; không mặc định resort hay cao ốc. Danh
sách khách không phải quota ảnh.

### Nhà máy (BEINCO, Betrimex)

- **Bảng hiệu bạt** và **pano không lưng tôn**: in bạt rồi căng trên khung sắt.
- **Pano có lưng tôn**: khung sắt có tấm tôn phía sau; mặt nội dung vẫn là bạt
  in, không in trực tiếp lên tôn hay dán decal.
- Pano lớn: viền mặt quảng cáo ốp nhôm hoàn thiện, không hở dây căng và khoen.
- Bạt và pano đã lắp thuộc `signage-raised-letters`; bạt rời, tem, ấn phẩm
  thuộc `print-decals`.
- Ví dụ chữ: "NHÀ ĐIỀU HÀNH", "KHU SẢN XUẤT", "PHÒNG KIỂM ĐỊNH", "KHU ĐÓNG GÓI".

### Gian hàng triển lãm

Khách làm gian hàng: BEINCO, Betrimex, Dừa Cửu Long và các công ty mỹ phẩm,
thời trang, thực phẩm đóng gói, đặc biệt sản phẩm dừa. Bộ ảnh cần đủ ba chiều
độc lập: **nhỏ và lớn, tiêu chuẩn và ngoại cỡ, thông thường và gây ấn tượng**.

| Ngành | Sản phẩm phải thấy |
| --- | --- |
| Dừa theo BEINCO | Milk/cream/creamer, sữa dừa có thạch, nước dừa có ga, hàng B2B như cơm dừa sấy; Delta Coco thuộc BEINCO |
| Dừa theo Betrimex | Nước dừa, coconut-milk uống, milk/cream nấu ăn, Barista pha chế; carton, chai, lon |
| Dừa Cửu Long | Mặt nạ cellulose, chăm sóc tóc và da, xà bông, ống hút và giấy gói từ nước dừa |
| Mỹ phẩm | Chai, lọ, tuýp, hộp, quầy thử, kệ, bàn tư vấn; không claim điều trị |
| Thời trang | Trang phục, phụ kiện, giá treo, mannequin, khu tư vấn |
| Thực phẩm đóng gói | Bao bì đủ chi tiết, mặt trưng bày, quầy dùng thử |

Ảnh toàn gian đọc được ranh giới gian, lối vào, quan hệ vách, khung, fascia,
kệ, quầy, bục, đèn; kết cấu treo đỡ khả thi; dấu hiệu hội chợ và quy mô Việt
Nam. Trái dừa trang trí không thay sản phẩm đóng gói.

## Chữ trong ảnh

- Dùng tên chức năng chung: "CÀ PHÊ", "TRÀ TRÁI CÂY", "TRƯỞNG PHÒNG",
  "RECEPTION", "PHÒNG HỌP", "PHÒNG GIÁM ĐỐC". Không tái tạo thương hiệu, logo,
  địa chỉ, điện thoại, watermark; danh thiếp không có danh tính thật.
- Chữ đúng chính tả và dấu tiếng Việt, đọc được; không ký tự giả.
- Đồ họa quảng bá trên sản phẩm in dùng typography đa dạng hợp tính cách: trà
  trái cây nét mềm, tươi; trà sữa chữ đầy, tròn; bánh mì sắc ấm, mộc; kem vui,
  mát. Slogan ngắn tùy chọn ("BỪNG VỊ NHIỆT ĐỚI", "ĐẬM VỊ TRÀ, NGẬY VỊ SỮA").
  Không claim chứng nhận, sức khỏe, hiệu năng.
- Biển tên đường, số nhà, biển văn phòng, sơ đồ ưu tiên đọc nhanh và nhất quán.
- Typography trong ảnh không đổi font UI của website.

## Logic sản phẩm owner yêu cầu

| Sản phẩm | Ảnh phải cho thấy |
| --- | --- |
| Standee | Bốn kiểu riêng: khung sắt hộp đế chữ nhật; chữ X tay căng bốn góc; khung ống bo góc đế nhựa đối trọng (đế thấp, cân đối); khung hai chân chữ T |
| Số nhà, số phòng kim loại hắt chân | Mặt kim loại đọc được, có độ dày, gá cách tường, quầng sáng hậu; không cả mặt phát sáng. Số nhà và số phòng là hai ảnh riêng |
| Số nhà Mica có LED | Nền tối đục, lớp Mica dẫn sáng, số nổi; hoặc Mica–Alu có thanh ngang thấp và ánh sáng hắt |
| Hộp đèn kim loại rỉ sáng viền | Hộp có chiều sâu, gá tường, mặt hiệu ứng rỉ đục, LED viền rõ |
| Decal in và bế | Media khoảng 600mm in nhiều hàng tem, đường bế theo biên, giấy đế; máy cắt cuộn đặt hợp lý; tem trên máy khác tem thành phẩm trên bàn |
| Decal kính đã lắp | Phẳng, bám kín, mép sạch; không bong góc, nhăn, bọt khí |
| Biển tên đường | Cột cao 3.600mm, biển 750 × 400mm trên đỉnh cột không có đầu cột nhô; mặt biển vuông góc hướng đi tới; thấy hướng đường. Khác biển chỉ hướng giao thông |
| Chữ nổi Mica | Baseline chữ, fascia, cửa cùng hệ phối cảnh; góc lỗi thì đổi bố cục |
| Chữ nhôm đục lỗ gắn LED | Từng điểm LED sáng rõ ở ảnh lớn và thumbnail, thấy mặt, hông kim loại, khung chịu lực; không thành mặt Mica phát sáng |
| Xe trà sữa, quầy pha chế | Mặt thao tác máy dập nắp hướng về người pha chế; POS và ngăn kéo hướng người vận hành |
| Menu để bàn Mica | Đế Mica đục màu; có menu đồ uống và menu bánh riêng |
| Menu in UV trên Mica | Mica sữa đục, thấy độ dày cạnh; không phải tấm trong kẹp giấy |
| Canvas căng khung | Đặt dưới sàn dựa tường, thấy cạnh đáy chạm sàn và bóng tiếp xúc |
| Quầy dừa sự kiện "COCONUT GROVE" | Khung sắt, mặt gỗ, kệ; trong siêu thị hoặc trung tâm thương mại đang hoạt động; không người |
| Quầy dùng thử trà trái cây | Trong hội chợ, trung tâm mua sắm hoặc siêu thị đang hoạt động |
| Sơ đồ | Ba ảnh riêng: khu du lịch, khu công nghiệp, nhà máy; đường liên tục, chú giải, "Bạn đang ở đây" |

Mô tả vật liệu từ trang bán hàng chỉ dùng nhận diện loại sản phẩm; không đưa
giá, tuổi thọ, điện áp, bảo hành vào nội dung website.

## Chấm điểm

Mỗi ảnh đạt **Audit ≥ 8/10 và Critique ≥ 8/10**; không lấy trung bình.

| Audit | Điểm |
| --- | --- |
| Đúng nhóm, sản phẩm, bối cảnh, góc chụp theo brief | 3 |
| Kết cấu, vật liệu, tỷ lệ, khả năng gia công và lắp đặt | 3 |
| Không lỗi hình học, chữ, ánh sáng, phản chiếu, chi tiết AI | 2 |
| Đúng tỷ lệ ảnh, pixel thật, metadata, provenance | 2 |

| Critique | Điểm |
| --- | --- |
| Bố cục rõ chủ thể ở ảnh lớn và thumbnail | 3 |
| Ánh sáng, vật liệu, độ sắc nét | 3 |
| Hợp ngôn ngữ thị giác (README), tinh tế nhưng trung thực cấu tạo | 2 |
| Bổ sung khác biệt hữu ích cho bộ ảnh | 2 |

**Loại thẳng dù đủ điểm**: mặt nhận diện được; thương hiệu hoặc watermark sao
chép; chữ chủ thể sai; kết cấu bất khả thi; sai nhóm; sản phẩm lớn bị cắt;
crop hoặc kéo méo để ép tỷ lệ; khai sai provenance; bản crop hoặc export lại
coi như ảnh mới.

Một subagent độc lập với agent tạo ảnh mở ảnh để chấm, ghi điểm từng mục và
lỗi. Main kiểm lại, không tự nâng điểm. Ảnh sửa thì chấm lại đúng SHA-256 mới.
Owner phát hiện lỗi thì acceptance cũ mất hiệu lực.

## Bộ ảnh và masonry

Ảnh đạt riêng lẻ chưa chứng minh masonry đạt. Bộ ảnh cần đủ biến thể sản phẩm,
góc chụp, tỷ lệ để bố cục organic (xem tỷ lệ tối thiểu ở
[Content và media](content.md#metadata-ảnh-advertising)). Thiếu thì tạo ảnh mới
có bố cục gốc phù hợp, không crop, kéo méo hay thêm khoảng trắng giả.

## Chú thích thuật ngữ

- **Audit**: kiểm độ đúng kỹ thuật và nội dung.
- **Critique**: đánh giá chất lượng thị giác và đóng góp cho bộ ảnh.
- **POSM**: vật phẩm, quầy kệ hỗ trợ trưng bày và bán hàng.
- **Pano lưng tôn**: pano có tấm tôn phía sau mặt bạt.
- **Coverage**: mức bao phủ từng loại sản phẩm bằng ảnh phù hợp.
- **Bế theo biên**: cắt decal theo đường bao, giữ giấy đế.
