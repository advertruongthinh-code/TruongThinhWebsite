---
title: Tiêu chí ảnh Advertising Products
type: design
status: living
updated: 2026-09-13
---

# Tiêu chí ảnh Advertising Products

## Phạm vi và nguồn

Nguồn chuẩn cho brief tạo ảnh và nghiệm thu ảnh của sáu nhóm Advertising.
Ràng buộc nội dung do owner xác nhận; việc ghi tiêu chí không
đồng nghĩa pool ảnh hiện tại đã được chấm hoặc đạt. Quy định người trong ảnh,
file web, alt và loading kế thừa [content guide](content.md#safe-crop-và-kiểm-tra-con-người).
Không sao chép các quy định đó vào prompt riêng rồi xem bản sao là authority.

Owner yêu cầu ảnh tạo mới dùng **ChatGPT Images 2.5**
([công bố của OpenAI](https://openai.com/index/introducing-chatgpt-images-2-5/)),
qua công cụ tạo ảnh mà host agent hoặc owner có. Ghi model yêu cầu và metadata
thực thi nếu tool cung cấp; thiếu metadata ghi unknown, không suy thành bằng
chứng phiên bản của từng ảnh. Không tự chuyển sang model/API khác. Yêu cầu này
không thay gate Audit/Critique bên dưới.

Đã đọc `C:\Users\halal\Desktop\Products.txt`: file có **năm mục lớn I–V**,
không phải sáu nhóm public. Giữ taxonomy hiện tại trong
[`catalog.mjs`](../../src/site/advertising-products/catalog.mjs): I ánh xạ Bảng hiệu,
II Biển văn phòng, III LED, IV In nhanh, phần POSM của V ánh xạ Kiosk.
Xe bán hàng là nhóm public được owner bổ sung rõ trong yêu cầu, không phải mục
riêng trong file. Dịch vụ thiết kế nhận diện/nội thất ở V không tự trở thành
nhóm Advertising thứ bảy hoặc ảnh chụp dịch vụ vô hình.

## Bối cảnh từ khách hàng thực tế

Đối chiếu ngày 2026-09-09 với
[`client-logos.json`](../../src/site/content/client-logos.json) và nhóm logo đầu
trong [`homepage`](../../src/site/index.html): đủ 12 đơn vị. Nhóm lặp để chạy
loop không tạo thêm khách hàng. Tên `Logo*.svg` dưới đây do owner cung cấp;
cột ID là asset đã chuẩn hóa trong `assets/content/client-logos/<id>.svg`.

Owner xác nhận đây là khách hàng Trường Thịnh, phần lớn ở khu vực Bến Tre và có
những thương hiệu hoạt động toàn quốc. **Quan hệ khách hàng và hạng mục Trường
Thịnh làm là thông tin owner xác nhận**, không phải điều website khách hàng
chứng minh. **Nguồn web** xác minh danh tính/ngành và bối cảnh hoạt động.
**Ứng dụng vào brief** là suy luận thiết kế, không phải hồ sơ thi công.

| Logo owner / ID hiện hành | Đơn vị và nguồn tham khảo | Hạng mục owner đã xác nhận |
| --- | --- | --- |
| `LogoBCJ.svg` / `bcj` | [BCJ – website owner chỉ định](https://tuvanxaydungbentre.com/); tư vấn xây dựng theo định danh owner. Trang trả màn kiểm tra truy cập, chưa xác minh nội dung chi tiết. | Chưa nêu hạng mục cụ thể. |
| `LogoBeinco.svg` / `beinco` | [BEINCO](https://www.beinco.com.vn/gioi-thieu): sản xuất/xuất khẩu thực phẩm, thức uống từ dừa; có nhà máy chế biến. | In nhanh, ấn phẩm & decal; Biển văn phòng & chỉ dẫn; bảng hiệu in bạt khung sắt và pano khung sắt, tại văn phòng chính, văn phòng điều hành khu nhà máy và khu nhà máy. Áp dụng [brief nhà máy](#brief-nhà-máy-theo-phạm-vi-beinco-và-betrimex). Owner bổ sung đây là khách hàng thường làm gian hàng triển lãm; theo [brief triển lãm](#brief-gian-hàng-triển-lãm-theo-ngành-hàng). |
| `LogoBenhVienMinhDuc.svg` / `benh-vien-minh-duc` | [Bệnh viện đa khoa Minh Đức](https://benhvienminhduc.com/about), [các khoa/phòng](https://benhvienminhduc.com/service-details/1). | Bảng trên nóc bệnh viện bằng chữ nhôm đục lỗ gắn LED; bảng vẫy chỉ dẫn xe cứu thương vào khu cấp cứu. |
| `LogoBetrimex.svg` / `betrimex` | [Betrimex – sản xuất](https://www.betrimex.com.vn/vi/page/san-xuat.html): chế biến nước/sữa/nước cốt dừa và cơm dừa, dây chuyền đóng gói. | In nhanh, ấn phẩm & decal; Biển văn phòng & chỉ dẫn; bảng hiệu in bạt khung sắt và pano khung sắt, tại văn phòng chính, văn phòng điều hành khu nhà máy và khu nhà máy. Áp dụng [brief nhà máy](#brief-nhà-máy-theo-phạm-vi-beinco-và-betrimex). Owner bổ sung đây là khách hàng thường làm gian hàng triển lãm; theo [brief triển lãm](#brief-gian-hàng-triển-lãm-theo-ngành-hàng). |
| `LogoBIDV.svg` / `bidv` | [BIDV](https://bidv.com.vn/): ngân hàng, mạng lưới ATM/chi nhánh. | Bảng trên nóc trụ sở Bến Tre bằng chữ nhôm đục lỗ gắn LED; các phòng máy ATM và phòng giao dịch. Chưa có chi tiết phần việc trong từng phòng. |
| `LogoCannesHotel.svg` / `cannes-hotel` | [Cannes Hotel](https://www.canneshotel.vn/vi): khách sạn/nhà hàng; [hội nghị và tiệc](https://www.canneshotel.vn/en/events). | Chưa nêu hạng mục cụ thể. |
| `LogoDuaCuuLong.svg` / `dua-cuu-long` | [Dừa Cửu Long – Siêu Thị Dừa](https://sieuthidua.com/): sản phẩm dừa, thực phẩm, hóa mỹ phẩm và chăm sóc da. | Owner bổ sung ngày 2026-09-10: khách hàng thường làm gian hàng triển lãm; theo [brief triển lãm](#brief-gian-hàng-triển-lãm-theo-ngành-hàng). |
| `LogoHDBank.svg` / `hdbank` | [HDBank](https://hdbank.com.vn/): ngân hàng theo owner; homepage trả lỗi fetch 502. [Tài liệu chính thức](https://cdn.hdbank.com.vn/hdbank-file/investor/editor/SRIFUyc22h9ckFv5jCqY20241223111455/FinalKHUNGTCBV13122024_1734927369856.pdf) xác nhận ngành và mạng lưới; không dùng số liệu lịch sử làm số hiện tại. | Chưa nêu hạng mục cụ thể. |
| `LogoPrudential.svg` / `prudential` | [Prudential Việt Nam](https://www.prudential.com.vn/vi/): bảo hiểm. | Thường cung cấp sản phẩm in ấn, văn phòng phẩm, bảng tên và bảng chỉ dẫn. |
| `LogoTTC.svg` / `ttc-hospitality` | [TTC Palace – Bến Tre](https://ttchospitality.vn/ttc-palace/ttc-palace-ben-tre): trung tâm hội nghị, tiệc cưới. Asset hiện mang nhãn TTC Hospitality; địa điểm owner chỉ định là TTC Palace Bến Tre. | Chưa nêu hạng mục cụ thể; không suy rộng sang toàn hệ thống TTC. |
| `LogoVietcombank.svg` / `vietcombank` | [Vietcombank](https://www.vietcombank.com.vn/): Ngân hàng TMCP Ngoại thương Việt Nam. | Chưa nêu hạng mục cụ thể. |
| `LogoViettinbank.svg` / `vietinbank` | [VietinBank](https://www.vietinbank.vn/): Ngân hàng TMCP Công Thương Việt Nam. Giữ filename owner để đối chiếu; tên chuẩn không có chữ “t” thứ hai. | Chưa nêu hạng mục cụ thể. |

Đã đọc nguồn web của các đơn vị trên, trừ giới hạn nêu tại từng dòng. Homepage
Minh Đức cần JavaScript; giới thiệu/khoa phòng được đọc từ kết quả lập chỉ mục
của chính domain, có thể cũ hơn trang đang chạy. Lỗi fetch không chứng minh
website đã mất. Lượt nghiên cứu này không phải khảo sát trực tiếp hoặc xác minh
hình học kiến trúc của từng địa điểm.

### Áp dụng bối cảnh vào brief và nghiệm thu

Bảng sau là **suy luận ứng dụng** từ ngành và hạng mục đã nêu, được owner yêu
cầu áp dụng vào brief và nghiệm thu. Vị trí cụ thể trong từng ảnh vẫn là lựa
chọn của brief, không phải xác nhận vị trí công trình đã thi công. Chọn bối
cảnh theo công năng sản phẩm, không sao chép nhận diện/kiến trúc khách hàng.

| Họ bối cảnh | Cảnh và vị trí sản phẩm | Nhóm ảnh phù hợp |
| --- | --- | --- |
| Nhà máy thực phẩm/dừa, hóa mỹ phẩm | Phân biệt văn phòng chính, nhà điều hành và khu sản xuất. Biển phòng ở cửa/hành lang, chỉ dẫn tại nút giao lối đi, biển khu vực tại lối vào; ấn phẩm/bao bì theo lô ở bàn kiểm tra hoặc khu đóng gói; bảng hiệu bạt/pano khung sắt ở mặt ngoài công trình, cổng hoặc sân theo brief. Môi trường vệ sinh, vật liệu và trang phục nếu có người phù hợp khu vực. | Biển văn phòng; In nhanh; Bảng hiệu. Với BEINCO/Betrimex, dùng phạm vi đã xác nhận trong brief nhà máy bên dưới. |
| Ngân hàng | Mặt tiền/trên nóc chi nhánh, phòng máy ATM, sảnh/quầy giao dịch; tên quầy/phòng và chỉ dẫn đúng nơi sử dụng. Chủ thể là bảng, chữ, khung/phòng ATM hoặc vật phẩm được brief; không biến thành ảnh máy ATM đơn lẻ. | Bảng hiệu; LED; Biển văn phòng; In nhanh. |
| Bệnh viện | Cảnh toàn chữ nhôm đục lỗ gắn LED trên nóc; cảnh trung bảng vẫy từ hướng xe cứu thương vào cấp cứu; cảnh trung/cận biển khoa/phòng. Chữ chung như “BỆNH VIỆN”, “CẤP CỨU”; mũi tên ăn khớp lối vào trong ảnh. | Bảng hiệu; LED; Biển văn phòng. |
| Văn phòng tư vấn, bảo hiểm | Sảnh tiếp nhận, phòng họp, cửa phòng, bàn làm việc; bảng chức danh, tên phòng, chỉ dẫn và bộ văn phòng phẩm/in ấn. Tỷ lệ vật phẩm phù hợp bàn/cửa. | Biển văn phòng; In nhanh; Bảng hiệu theo brief. |
| Khách sạn, nhà hàng, hội nghị/tiệc | Mặt tiền, lễ tân, hành lang/sảnh hội nghị, số phòng/chỉ dẫn, menu và ấn phẩm sự kiện. POSM đặt tại khu giới thiệu/sự kiện phù hợp; không suy ra mọi sảnh đều là hội chợ. | Biển văn phòng; In nhanh; Bảng hiệu; Kiosk/POSM và LED theo sự kiện. |
| Showroom, hội chợ, F&B | Quầy/kệ giới thiệu thực phẩm, đồ uống, mỹ phẩm; catalogue/bao bì tại điểm giới thiệu. Xe bán hàng giữ bối cảnh F&B đã chốt; không gán thành dự án của 12 khách hàng khi chưa có xác nhận. | Kiosk/POSM; Xe bán hàng; In nhanh. |

Brief chỉ rõ **ngành → khu vực → vị trí lắp/đặt → công năng → góc chụp**;
tiếp theo mới chọn tỷ lệ ảnh phục vụ grid. Bối cảnh phải nhận ra từ không gian
và vị trí sử dụng, không cần logo thật. Giữ quy mô, khí hậu và đặc điểm đô thị
phù hợp Bến Tre/Việt Nam theo brief; không mặc định mọi cảnh là resort, showroom
hạng sang hoặc cao ốc siêu lớn.

Chữ nhôm đục lỗ gắn LED phải phân biệt với chữ Mica sáng âm và màn hình ma trận.
Cảnh toàn cho thấy chữ gắn trên công trình; cảnh chi tiết bổ trợ nếu có phải
thể hiện lỗ/điểm LED, cạnh và kết cấu lắp hợp lý. Góc chụp từng nhóm vẫn theo
bảng bên dưới. Danh sách khách hàng không phải tỷ trọng doanh thu hoặc quota
ảnh; không tự yêu cầu 12 ảnh mang tên 12 công ty. Quy định chữ chung/provenance
bên dưới vẫn áp dụng cho ảnh tạo mới.

### Brief nhà máy theo phạm vi BEINCO và Betrimex

Owner bổ sung ba nhóm sản phẩm và xác nhận cấu tạo:

- **Bảng hiệu bạt:** in nội dung lên bạt rồi căng bạt trên khung sắt.
- **Pano không lưng tôn:** in nội dung lên bạt rồi căng bạt trên khung sắt.
- **Pano có lưng tôn (tole):** khung sắt có tấm tôn làm lưng; bạt được in rồi
  căng lên khung sắt đó. Mặt nội dung vẫn là bạt in, không phải in trực tiếp
  lên tôn hoặc dán decal thay bạt.

Brief phải chọn rõ loại pano có/không lưng tôn theo cấu tạo trên. Ví dụ vị trí
và mẫu vật phẩm bên dưới là ứng dụng cho ảnh minh họa, không phải danh mục
từng công trình của hai khách hàng.

| Nhóm / sản phẩm | Brief bối cảnh và góc chụp | Điểm phải xem khi nghiệm thu |
| --- | --- | --- |
| In nhanh, ấn phẩm & decal | Cảnh cận/trung bộ ấn phẩm văn phòng, phong bì, tờ gấp/catalogue trên bàn nhà điều hành; lô tem nhãn/decal hoặc bao bì trên bàn kiểm tra/khu đóng gói. Thể hiện số lượng lớn có tổ chức; dùng nhãn chung như “THÔNG TIN SẢN PHẨM”, không gắn thương hiệu thật. | Đúng loại vật phẩm in; thấy chất lượng bề mặt, mép cắt/bế, nếp gấp và độ nhất quán của lô. Không nhầm ấn phẩm với sản phẩm thực phẩm; không dán nhãn/decal vào vị trí vô nghĩa chỉ để lấp cảnh. |
| Biển văn phòng & chỉ dẫn | Cảnh trung/cận biển tại cửa/hành lang văn phòng chính, nhà điều hành hoặc lối vào khu sản xuất; bảng chức danh trên bàn hoặc bộ biển chuẩn bị lắp. Ví dụ “PHÒNG HỌP”, “PHÒNG KIỂM ĐỊNH”, “KHU ĐÓNG GÓI”; hướng chỉ dẫn khớp không gian. | Chữ đọc được, đúng dấu; biển đúng tỷ lệ, vị trí và công năng. Thấy vật liệu, cạnh và cách gắn/đặt hợp lý; không bị nền nhà máy lấn át. |
| Bảng hiệu bạt in căng trên khung sắt; pano theo cấu tạo đã chốt bên trên | Cảnh toàn/trung sản phẩm đã lắp ở mặt ngoài công trình, cổng hoặc sân nhà máy. Ví dụ “NHÀ ĐIỀU HÀNH”, “KHU SẢN XUẤT”. Có thể bổ sung cảnh cận mép bạt, liên kết, góc cạnh hoặc mặt sau để thấy cấu tạo; không thay toàn bộ ảnh tổng thể bằng chi tiết. | Mặt bạt in được căng và cố định vào khung sắt hợp lý; hình in, mép, điểm gắn và phối cảnh không méo/vô lý. Pano phải khớp loại có/không lưng tôn trong brief; tôn nằm phía sau bạt. Không tự biến thành mặt tôn in trực tiếp, decal dán tôn, Alu, chữ nổi hoặc màn hình LED. Nếu góc chính diện che lưng, ghi phần chưa quan sát được và dùng góc bổ trợ khi cần nghiệm thu cấu tạo; không đoán có/không lưng chỉ từ mặt trước. |

Bảng hiệu bạt/pano đã thành bộ có khung và lắp đặt thuộc
`signage-raised-letters`; bạt in rời, tem/decal hoặc lô ấn phẩm thuộc
`print-decals`. Chọn theo chủ thể và công năng ảnh; không nhân bản cùng ảnh
sang hai nhóm. Không suy từ hạng mục nhà máy sang việc BEINCO/Betrimex đã đặt
LED hoặc xe bán hàng. Hạng mục gian hàng triển lãm được owner xác nhận riêng
ngày 2026-09-10 theo mục bên dưới; không suy rộng thành mọi loại kiosk/POSM.

Mỗi brief phải chọn một dòng sản phẩm, một khu vực và trạng thái lắp/đặt rõ
ràng, rồi ghi công năng, góc chụp và chi tiết cần thể hiện. Reviewer áp dụng
cột nghiệm thu vào hai mục Audit về đúng nội dung và tính hợp lý gia công;
Critique tiếp tục theo rubric chung. Sai vật liệu chính, sai nơi sử dụng hoặc
không thấy được sản phẩm yêu cầu phải sửa/tạo lại trước khi qua gate điểm.

### Brief gian hàng triển lãm theo ngành hàng

Dữ kiện sản phẩm, bao bì và quan hệ nhà sản xuất/nhãn hiệu theo
[nghiên cứu ba khách hàng](../reference/advertising-client-products.md), truy cập
2026-09-10. Dùng trang chi tiết sản phẩm cho quy cách; danh mục của một cửa
hàng không chứng minh mọi hàng trong đó do cửa hàng sản xuất. Không chuyển
điểm ảnh cũ sang ảnh mới hoặc sang brief khác sau nghiên cứu.

Owner xác nhận: các khách hàng thường làm gian hàng triển lãm
gồm **BEINCO, Betrimex, Dừa Cửu Long** và các công ty mỹ phẩm/làm đẹp, thời
trang, thực phẩm đóng gói/đóng hộp, đặc biệt sản phẩm từ dừa. Đây là thông tin
owner cung cấp; không phải xác nhận từng thiết kế trong ảnh mẫu đã được
Trường Thịnh thi công. Các ảnh gian hàng cần tạo lại theo ngành hàng này.

Bộ ảnh phải có gian hàng **nhỏ và lớn; tiêu chuẩn và ngoại cỡ; thiết kế thông
thường và thiết kế gây ấn tượng**. Đây là các chiều độc lập, không đồng nhất
“nhỏ” với sơ sài hoặc “lớn” với cầu kỳ. Không dùng toàn bộ quầy dùng thử nhỏ
hoặc toàn bộ booth cao cấp để tuyên bố đã đủ gian hàng triển lãm.

Bảng dưới là hướng ứng dụng vào brief, không phải danh mục SKU hay quy mô
công trình thật của từng khách hàng. Số ảnh và kích thước thiết kế cụ thể
được chọn khi lập brief; không suy số đo từ filename hoặc phối cảnh mẫu.

| Ngành hàng | Biến thể gian hàng phù hợp | Sản phẩm và công năng cần nhìn thấy |
| --- | --- | --- |
| Thực phẩm/đồ uống từ dừa, theo domain BEINCO | Gian tiêu chuẩn nhỏ, khung module và vách in; gian góc hoặc gian thiết kế riêng | Tách lon nguyên liệu milk/cream/creamer, chai/lon sữa dừa uống có thạch, nước dừa có ga và hàng B2B như bao cơm dừa sấy. Delta Coco gắn với BEINCO; không gán cho Dừa Cửu Long chỉ vì có bán tại Siêu thị Dừa. Trái dừa trang trí không thay sản phẩm đóng gói. |
| Thực phẩm/đồ uống từ dừa, theo domain Betrimex | Gian lớn mở nhiều phía, kết cấu riêng; quầy dùng thử kết hợp khu trao đổi B2B | Tách nước dừa/đồ uống coconut-milk khỏi milk/cream dùng nấu ăn và Barista dùng pha chế. Carton, chai, lon theo dòng có nguồn. Cocoxim không đại diện tự động cho toàn bộ danh mục OEM/ODM hoặc nguyên liệu công nghiệp. |
| Sản phẩm từ dừa, theo domain Dừa Cửu Long | Gian nhỏ tại hội chợ, gian góc hoặc gian thiết kế riêng | Ưu tiên mặt nạ cellulose trong hộp/túi sachet, chăm sóc tóc/da, xà bông; có thể bổ sung ống hút và giấy gói thực phẩm từ nước dừa. Kênh Siêu thị Dừa bán nhiều nhãn: không biến các thực phẩm bán lại thành sản phẩm tự sản xuất. |
| Mỹ phẩm và làm đẹp | Gian tiêu chuẩn nhỏ; gian thiết kế riêng; gian lớn/ngoại cỡ có điểm nhấn hình khối và ánh sáng | Chai, lọ, tuýp, hộp mỹ phẩm; quầy thử/giới thiệu, kệ sản phẩm, bàn tư vấn nếu phù hợp. Chữ và đồ họa gợi cảm giác chăm sóc, tinh tế; không dùng claim điều trị. |
| Thời trang | Gian nhỏ hoặc lớn, thông thường hoặc thiết kế riêng nổi bật | Trang phục, phụ kiện, giá treo/mannequin và khu tư vấn; tỷ lệ giá treo, lối đi và khoảng nhìn sản phẩm hợp lý. Không biến thành cửa hàng cố định thiếu bối cảnh triển lãm. |
| Thực phẩm đóng gói/đóng hộp | Gian tiêu chuẩn hoặc gian lớn có quầy dùng thử | Nhận ra nhóm thực phẩm qua sản phẩm, bao bì và đồ họa; có mặt trưng bày, quầy và luồng phục vụ. Vật phẩm đủ chi tiết để không thành các khối hộp vô nghĩa. |

Mỗi ảnh tổng thể phải đọc được ranh giới gian, lối tiếp cận và quan hệ giữa
vách, khung, fascia/biển tên, kệ, quầy, bục và chiếu sáng. Thiết kế nổi bật
vẫn cần kết cấu đỡ/treo khả thi, không khối lơ lửng hoặc nhịp vươn vô lý.
Giữ dấu hiệu hội chợ/hội trường và quy mô phù hợp Việt Nam; không mặc định
hội chợ diễn ra tại Bến Tre chỉ vì doanh nghiệp ở Bến Tre. Có thể thêm ảnh
trung/cận để thấy vật liệu và gia công, nhưng không thay mọi ảnh toàn gian.

Các mẫu owner gửi dùng để tham khảo kết cấu, bố cục, quy mô và mức độ sáng
tạo. Không giữ ngành cửa, linh kiện/cơ khí, thức ăn chăn nuôi hoặc pin/ắc quy
trong các mẫu khi brief đang minh họa ngành dừa, thực phẩm, mỹ phẩm, thời trang.
Dùng đồ họa và tên sản phẩm chung, typography/slogan theo mục chữ bên dưới;
không sao chép logo, thương hiệu, watermark hoặc khuôn mặt từ mẫu.

Reviewer kiểm riêng độ đúng ngành hàng, kiểu gian, quy mô, sản phẩm trưng
bày, công năng và kết cấu nhìn thấy. Nhãn chi tiết tách các thuộc tính này;
nhóm public vẫn là `kiosk-posm`. Ảnh quầy dùng thử hiện có không tự chứng minh
đã bao phủ gian tiêu chuẩn, gian ngoại cỡ hoặc mọi ngành nêu trên.

Owner yêu cầu chấm lại rồi tạo/sửa ảnh theo nghiên cứu ngày 2026-09-10.
Reviewer mở từng ảnh liên quan, ghi SHA-256, brief dùng để chấm, hai điểm
Audit/Critique và lỗi quan sát được. Sai doanh nghiệp, công năng sản phẩm,
loại bao bì hoặc thiếu họ sản phẩm chính là lỗi nội dung phải sửa trước gate
điểm. Một ảnh trà trái cây có thể đúng brief F&B nhưng không được tính thành
coverage sản phẩm dừa của ba công ty. Ảnh giữ, ảnh thay và coverage thiếu
phải có quyết định riêng; ảnh mới qua review độc lập rồi main kiểm lại.

## Nội dung và góc chụp theo nhóm

| Nhóm public | Sản phẩm cần bao phủ trong bộ ảnh | Bối cảnh và góc chụp |
| --- | --- | --- |
| Kiosk & POSM (`kiosk-posm`) | Kiosk, gian hàng triển lãm đa quy mô, quầy/kệ trưng bày, tủ/kệ theo yêu cầu; bốn kiểu standee ở mục sản phẩm bổ sung | Cảnh toàn hoặc trung, thấy rõ tổng thể sản phẩm và cấu tạo. Gian hàng theo [brief ngành hàng](#brief-gian-hàng-triển-lãm-theo-ngành-hàng); không để kiến trúc hay người che chủ thể. |
| Xe bán hàng (`mobile-retail`) | Xe/quầy di động phục vụ cà phê, món ăn vặt Việt Nam, kem, trà sữa, trà trái cây | Cảnh toàn hoặc trung thấy toàn bộ xe, bánh xe, mặt quầy và phần che/mái nếu có. Bối cảnh F&B hợp lý; thiết bị, không gian thao tác và kết cấu khả thi. |
| Bảng hiệu & chữ nổi (`signage-raised-letters`) | Mặt dựng Alu, bảng hiệu in bạt khung sắt, pano khung sắt, chữ Inox vàng/xước/bóng, LED sáng chân/âm chữ, Mica/Alu/Formex; bảng vẫy Mica hút nổi tròn/vuông/elip, Inox/Hiflex/LED | Phối hợp cảnh toàn, trung và cận. Mặt tiền, nóc nhà, pano cao và chữ đứng trên bệ thấp trong tiểu cảnh/bồn cây. Cảnh cận phải cho thấy cạnh, mối nối, bề mặt và độ tinh xảo gia công. Bảng hiệu bạt/pano nhà máy theo brief riêng bên trên. |
| Biển văn phòng & chỉ dẫn (`office-signs-wayfinding`) | Biển số nhà/số phòng, gồm kim loại hắt chân; tên đường/khu đô thị; chức danh gỗ–đồng, Mica/Inox; phòng ban, tầng, sơ đồ, cảnh báo/WC | Cảnh trung/cận khi đã lắp hoặc đặt trên bàn. Nhà ở, khách sạn, văn phòng, khu công nghiệp, nhà điều hành, khu sản xuất thực phẩm/mỹ phẩm. Chữ và cấu tạo là chủ thể. |
| LED, màn hình & hộp đèn (`led-displays-lightboxes`) | LED ma trận đơn sắc/ba màu/full color indoor/outdoor; màn hình sự kiện/hội trường/showroom; hộp đèn siêu mỏng, tranh điện nắp hít/bật; hệ chữ lớn gắn các điểm LED lộ | Cảnh toàn/trung. Hệ lớn trên nóc cao ốc, mặt tiền, cao điểm; ma trận hoặc màn hình trên dãy tường thương mại/triển lãm. Thấy quy mô, kết cấu đỡ và quan hệ với công trình; không nhầm chữ gắn LED điểm với màn hình ma trận. |
| In nhanh, ấn phẩm & decal (`print-decals`) | Danh thiếp, tờ rơi/gấp, catalogue, thiệp mời/cưới, chứng nhận, phong bì; menu cứng/da/gỗ/nhựa/cuốn/để bàn/Mica; Hiflex, decal trong/mờ/kính/tường/xe, tem cắt bế, canvas; bao bì giấy, ly giấy/nhựa, hộp | Cảnh cận/trung, thể hiện số lượng lớn bằng chồng, lô hoặc bộ có tổ chức. F&B, showroom, thời trang, mỹ phẩm; bộ ấn phẩm văn phòng/nhà máy cao cấp phù hợp. Độ sắc nét in, mép cắt, nếp gấp và vật liệu phải hợp lý. |

Bao phủ được kiểm tra ở cấp bộ ảnh, không nhồi mọi biến thể vào một ảnh.

Tên canonical của sản phẩm là **chữ nổi Formex** (kết hợp Alu khi ghi “Chữ nổi Alu và Formex”). Các asset ID và đường dẫn cũ chứa `format` giữ nguyên để tương thích; chỉ nhãn hiển thị và metadata hiện tại dùng `Formex`.
Raw prompt/review lịch sử giữ nguyên chính tả lúc chạy để bảo toàn provenance;
không thay “format” của API/định dạng file hoặc “large-format” bằng “Formex”.
Hộp đèn/bảng vẫy có giao thoa: chọn nhóm theo sản phẩm chính và product key
trong catalog; không nhân bản cùng ảnh để tăng số lượng hai nhóm.

### Nhãn chi tiết và coverage theo sản phẩm

Owner xác nhận: sáu nhóm public là tầng gom các nhãn gần nhau,
không phải sáu nhãn duy nhất. Một ảnh được mang nhiều nhãn; phân loại phải đi
tới loại sản phẩm cụ thể. Ví dụ tờ rơi, tờ gấp, catalogue, giấy chứng nhận và
phong bì là các loại riêng, không xem một tên gộp trong catalog là bằng chứng
bộ ảnh đã có đủ từng loại. Tên hiển thị sản phẩm có thể trùng giữa các ảnh;
identity của từng ảnh vẫn phải riêng.

Coverage đối chiếu đồng thời `Products.txt`, các bổ sung owner trong guide
này và sản phẩm nhìn thấy trong ảnh. File nguồn có năm mục La Mã; Xe bán hàng
là nhóm owner bổ sung. Các dịch vụ thiết kế logo, quy chuẩn thương hiệu,
maquette và hoàn thiện nội thất không tự trở thành nhãn của một ảnh vật phẩm
nếu ảnh không chứng minh loại sản phẩm đó.

Mỗi loại sản phẩm cần được đánh dấu đã có ảnh phù hợp, ảnh sai mô tả, thiếu
ảnh hoặc chưa xác minh được bằng hình. Mỗi kết luận gắn asset ID, path/hash
và chi tiết quan sát. Tên file, title, prompt và nhóm đang gán chỉ giúp tìm
ảnh; không thay việc xem ảnh. Không suy hãng vật liệu, kỹ thuật gia công,
tính chống nước, kết cấu bị che hoặc cảnh đang vận hành chỉ từ vẻ ngoài.

Một ảnh có thể chứng minh nhiều sản phẩm trong cùng bộ tự nhiên nếu từng
vật phẩm nhìn rõ. Không nhân mọi tổ hợp vật liệu, màu, vị trí thành ảnh mới;
không dùng một ảnh tổng quan mơ hồ để tuyên bố đã đủ mọi biến thể. Ưu tiên bổ
sung loại sản phẩm còn thiếu hoặc thay ảnh sai chủ thể, sau đó mới thêm góc
chụp và tỷ lệ. Mọi ảnh mới vẫn qua gate độc lập bên dưới.

Đây là yêu cầu nội dung và nghiệm thu ảnh. Schema nhãn, facet, related grid
và view detail đang discovery trong [card revision mới](https://app.notion.com/p/3d6332849a0e8124af03c79f3c2e8406);
không xem phần này là bằng chứng public runtime đã hỗ trợ nhiều nhãn.

### Decal in và bế theo quy trình owner

Owner bổ sung: decal in thường được bế bằng máy cắt decal dạng cuộn như ảnh
tham khảo `C:/Users/halal/Desktop/shopping.webp`, với media rộng khoảng
**600 mm**. Đây là bối cảnh gia công owner yêu cầu cho bộ ảnh Trường Thịnh;
không khẳng định mọi máy hoặc mọi nhà in đều dùng cùng thông số.

Brief ảnh minh họa quy trình cần thấy media đã in nhiều hàng tem/chi tiết,
đường bế theo biên và giấy đế giữ các phần decal; nếu có máy thì đường nạp,
con lăn, carriage và khổ tương đối phải hợp lý. Có thể cho thấy một góc tem
bóc nhẹ để chứng minh đường bế, không biến thành miếng giấy nổi không có gá.
Không dùng ảnh cuộn tem thành phẩm khổ hẹp ở dây chuyền đóng gói để tuyên bố
đã bao phủ quy trình bế media 600 mm này. Không suy model, hãng, khổ cắt hữu
dụng chính xác hay tính năng cảm biến chỉ từ ảnh tham khảo nhỏ.

### Decal kính đã lắp đặt và biển tên đường

Owner bổ sung khi duyệt album: decal kính trong hoặc mờ ở
trạng thái đã thi công xong phải dán phẳng, bám hoàn toàn, mép cắt sạch và
thẳng; không bong/tróc góc, nhăn, bọt khí hoặc vết keo. Không bóc góc film
đã lắp để chứng minh vật liệu. Chi tiết bóc một tem mẫu chỉ được dùng trong
cảnh gia công decal trên giấy đế theo mục trên, không áp dụng cho film dán kính.

Biển tên đường phải đối chiếu mẫu thực tế phù hợp bối cảnh Việt Nam/khu vực
Bến Tre trước khi tạo: tỷ lệ dài/cao mặt biển, tiết diện/hình dáng cột, chân
cột và cách gá lắp. Không dùng một biển chỉ hướng giao thông lớn trên cột
quá nặng rồi gọi là biển tên đường. Ghi nguồn tham khảo; không suy kích thước
milimét hoặc compliance từ ảnh không có thước đo.

Owner phát hiện lỗi có quyền làm mất hiệu lực acceptance trước đó. Giữ điểm
và hash review cũ làm lịch sử, sửa hoặc thay ảnh rồi chấm lại đúng hash mới;
không dùng tổng điểm đạt để bỏ qua lỗi thi công được owner chỉ ra.

## Chữ, bối cảnh và ảnh tham khảo

Ảnh tạo mới dùng tên sản phẩm/chức năng chung phù hợp: “CÀ PHÊ”, “TRÀ TRÁI CÂY”, tên món ăn,
“TRƯỞNG PHÒNG”, “PHÓ PHÒNG”, “THƯ KÝ”, “RECEPTION”, “PHÒNG HỌP”,
“PHÒNG GIÁM ĐỐC”, “PHÒNG KIỂM ĐỊNH”. Không tái tạo tên doanh nghiệp, nhãn hiệu,
logo, địa chỉ, điện thoại hay watermark từ ảnh tham khảo. Không tự thêm danh tính
thật vào danh thiếp; dùng nhãn chức năng chung. Chữ chủ thể phải đúng chính tả,
dấu tiếng Việt và đọc được; không dùng ký tự giả để lấp khoảng trống.

Owner mở rộng: đồ họa quảng bá trên sản phẩm in cần typography
đa dạng và hợp tính cách sản phẩm; có thể thêm slogan/subtitle ngắn, tự viết,
phù hợp khi đủ diện tích. Quy tắc tên chức năng chung ở trên không cấm slogan
đã được owner cho phép; vẫn cấm nhãn hiệu thật, địa chỉ/liên hệ/watermark và
claim chứng nhận, sức khỏe hoặc hiệu năng không có bằng chứng.

Trà trái cây dùng đường nét mềm, nhịp chữ sinh động, màu và hình gợi cảm giác
tươi mát/tropical; trà sữa ưu tiên chữ đầy, tròn mềm, cảm giác đậm và béo; bánh
mì dùng sắc ấm và nét chữ mộc khỏe; kem có thể vui, mềm và mát. Tiêu đề có thể
uốn cong hoặc dùng display/script lettering khi vẫn đọc đúng tiếng Việt.
Phối chữ phụ rõ, có phân cấp, khoảng thở; không dùng cùng một font/style cho
mọi mẫu, cũng không trộn font tùy tiện. Áp dụng cả ảnh hiện có cần sửa và ảnh
tạo mới, không chỉ ghi vào prompt cho các ảnh sau. Typography trong đồ họa sản phẩm in
được đánh giá theo brief riêng; không tự đổi font UI của website.

Slogan là tùy chọn theo công năng: chẳng hạn “BỪNG VỊ NHIỆT ĐỚI” cho trà trái
cây, “ĐẬM VỊ TRÀ, NGẬY VỊ SỮA” cho trà sữa. Biển tên đường, số nhà/số phòng,
biển văn phòng, sơ đồ và chỉ dẫn ưu tiên đọc nhanh, tính nhất quán và đúng
chức năng. Các ảnh cùng bộ cần được critique cạnh nhau về nhịp typography,
không chỉ chấm từng ảnh riêng rồi bỏ qua sự đơn điệu toàn bộ.

### Sản phẩm owner bổ sung khi duyệt album

Standee có bốn biến thể cần nhận diện riêng qua ảnh: khung sắt hộp chân đế
chữ nhật khép kín; standee chữ X với tay căng bốn góc và chân chống; khung ống
bo góc có đế nhựa kiểu đối trọng; khung di động hai chân chữ T. Giữ rõ khung, gá, đường căng
và chân đế; chụp đủ sản phẩm trong bối cảnh kinh doanh/sự kiện thích hợp.
Không suy vật liệu chứa trong đế, khả năng chịu gió hoặc kích thước chính xác
từ ảnh mẫu. Nhãn có thể phân loại sản phẩm, vật liệu, cơ cấu đỡ và bối cảnh
riêng; sáu collection public vẫn là tầng gom nhóm.

Bổ sung biển số nhà và biển số phòng kim loại có đèn hắt chân: mặt kim loại
đọc được, có chiều dày/gá cách tường và ánh sáng hậu tạo quầng rõ; không biến
mặt kim loại thành mặt phát sáng toàn bộ. Ưu tiên cảnh trung/cận sản phẩm đã
lắp ở cổng nhà hoặc hành lang khách sạn, dùng số mẫu, không gán công trình thật.
Hai công năng số nhà và số phòng cần ảnh riêng; ưu tiên sáng ấm, đường sáng
đều và có khoảng hắt hợp lý. Chỉ gán Inox/đồng hoặc loại hoàn thiện cụ thể khi
brief và bằng chứng đủ rõ; “kim loại” là yêu cầu chung owner đã nêu.

Riêng ảnh `factory-pano-frame`: owner yêu cầu thay sang khung treo bạt di động
theo ảnh ống bạc đã đính kèm, giữ bối cảnh nhà máy, bạt xanh và chữ “KHU SẢN XUẤT”.
Đây là thay đổi của ảnh này; định nghĩa pano cố định/bạt/khung sắt/lưng tôn
trong phần taxonomy vẫn giữ phạm vi riêng. File Desktop `images.jpg` đã được
dùng lại cho nhiều ảnh khác nhau; không coi nội dung hiện tại của đường dẫn
đó là cùng một reference qua mọi turn.

Riêng ảnh quy trình decal: máy đặt gần góc tường với khoảng thao tác/nạp media
hợp lý; tiêu đề hiển thị là “Decal in và bế”. Khổ danh nghĩa khoảng 600 mm
vẫn thuộc metadata/brief, không bắt buộc đưa vào tiêu đề sản phẩm.
Nhãn trên media đang bế trong máy phải khác thiết kế và khác loại sản phẩm
với nhãn thành phẩm trên bàn. Camera lấy nét vào sản phẩm trên bàn; hậu cảnh
có độ nét theo khoảng cách chụp tự nhiên. Giữ nội dung và thiết kế mẫu trên
bàn đã được chấp nhận; không tạo bản blur bằng hậu xử lý để thay ảnh gốc.

Riêng ảnh `sign-acrylic-letters`: chân/baseline chữ “CÀ PHÊ”, mặt tường và
khung cửa phải cùng hệ phối cảnh. Chữ có độ nổi thật vẫn phải gá nhất quán
trên mặt tường; không nghiêng riêng cụm chữ để làm nó có vẻ lớn hơn. Reviewer
so các đường cùng phương trên cùng mặt phẳng bằng phối cảnh, không yêu cầu
chúng song song trên ảnh bất kể điểm tụ. Đây là sửa lỗi hình học, không đổi
Mica thành kim loại hoặc đổi nội dung sản phẩm.

### Tham khảo owner gửi cho gian hàng, standee, biển số

Bộ gian hàng owner vừa gửi gồm **bảy ảnh tham khảo**, được liệt kê trong ba
dòng gian hàng của bảng dưới. Đây là số reference đầu vào, không phải yêu cầu
tạo đúng bảy ảnh hoặc bằng chứng đã đủ coverage; số ảnh mới theo brief cần
bao phủ các chiều quy mô, kiểu thiết kế và ngành hàng đã chốt.

Các filename dưới đây trỏ ảnh owner đính kèm; Desktop là vị trí local của
phiên tham khảo. Khi dùng để tạo/chỉnh sửa ảnh, lưu đúng phiên bản tham khảo
và hash trong provenance; nếu file đã bị ghi đè thì đối chiếu lại attachment,
không thay bằng ảnh khác cùng tên.

| Nhóm | File tham khảo | Phần dùng làm reference |
| --- | --- | --- |
| Standee | `standee-in-standee-CF7jyQX0Ot.jpg`; `vn-11134207-7ras8-m0cy6g1e9xfz33.jpg`; một ảnh owner dán trong phiên (không còn file local) | Lần lượt X-banner, đế nhựa đối trọng và hai chân T. Khung sắt hộp đế chữ nhật thuộc attachment `images.jpg` ở message standee, không phải file hiện tại. |
| Biển số kim loại | `z4773438019730_2b234b005e0f8d96f6ee692c4e50b045.jpg`; `z5028831963498_4e21c36ba6b0339ac07025b23360e5ca-300x300.jpg`; `2_1-600x800.jpg` | Hai mẫu đầu gợi cấu tạo kim loại và ánh sáng hắt; mẫu cuối gợi bảng kim loại, số và gá. Không coi mẫu cuối tự chứng minh có LED. |
| Gian tiêu chuẩn và nhỏ | `53-1667011277-mg-5320.jpg`; `images.jpg` ở message gian hàng triển lãm | Khung module, vách/biển tên, quầy/kệ của gian tiêu chuẩn; gian mỹ phẩm nhỏ, thấp với vách hậu và quầy. |
| Gian lớn và thiết kế nổi bật | `sdsa-800x533.jpg`; `TOP-GIAN-HANGTRIEN-LAM-INDEX-2024_bia-800x532.jpg`; `booth gian hàng 6x6-04.jpg` | Quy mô lớn, mở nhiều phía, fascia cao/treo và kết cấu tạo điểm nhấn. Tên file không chứng minh kích thước hoặc tải trọng. |
| Gian mỹ phẩm thiết kế riêng | `gian-hang-trien-lam-my-pham-17.jpg`; `thi-cong-thiet-ke-gian-hang-trien-lam-my-pham-02-1024x700.jpg` | Kệ, quầy, ánh sáng, đường cong/hình khối và nhịp đồ họa; thiết kế mới theo domain khách hàng, không chép thương hiệu mẫu. |

Ảnh khung treo bạt ống bạc cho `factory-pano-frame` thuộc attachment `images.jpg`
ở message thay pano. Phiên `images.jpg` có gian mỹ phẩm không được thay thế
reference khung bạt hoặc reference standee chỉ vì trùng đường dẫn.

Chín ảnh owner cung cấp ngày 2026-09-09 là tham khảo loại sản phẩm/cấu tạo:

| Ảnh | File nguồn trên Desktop | Điều lấy làm tham khảo |
| --- | --- | --- |
| 1–2 | `133-5.jpg`; `monumentsigns03-1-1024x767.jpg` | Chữ nổi đứng trên bệ trong tiểu cảnh. Tạo thiết kế mới tinh tế hơn, có cây cỏ, vật liệu và bố cục riêng; không sao chép nguyên công trình. |
| 3–5 | `chu-noi-mica-led-cty-casa-3.jpg`; `992454_z5338262742294_f0dfb7d35ae89dba9f115c580bdd723e.jpg`; `bang-hieu-quan-ca-phe.jpg` | Bảng hiệu mặt tiền, bảng vẫy đứng và chữ phát sáng. Không lấy thương hiệu, watermark hoặc khuôn mặt. |
| 6 | `hop-den-mica-rose-pole-studio.webp` | Hộp đèn Mica dạng khối: độ dày, cạnh ghép, ánh sáng. |
| 7–9 | `images.jpg`; `08-led-cam-cr-840x630.jpg`; `02 BIDV.jpg` | Cấu tạo chữ khổ lớn gắn LED điểm. Ảnh mới của hệ lớn ưu tiên cảnh lắp đặt theo bảng tiêu chí; ảnh xưởng tham khảo không tự thay yêu cầu cảnh toàn/trung. |

Các file Desktop là nguồn tham khảo local, không phải tài sản public đã được
phép xuất bản. Ảnh AI phải có provenance AI; không mô tả thành công trình thực
tế Trường Thịnh đã thi công. Người trong ảnh tuân thủ đúng content guide kể cả
ảnh phản chiếu và hậu cảnh; không mở ngoại lệ mới.

## Chấm điểm và điều kiện loại

Mỗi ảnh phải đạt **Audit ≥ 8/10 và Critique ≥ 8/10**. Không lấy trung bình hai
điểm để cứu một điểm dưới ngưỡng. Trọng số dưới đây là rubric vận hành đề xuất;
ngưỡng 8 và các ràng buộc nội dung là yêu cầu đã xác nhận của owner.

| Audit kỹ thuật/nội dung | Điểm tối đa |
| --- | --- |
| Đúng nhóm, sản phẩm, bối cảnh và góc chụp yêu cầu | 3 |
| Kết cấu, vật liệu, tỷ lệ và khả năng gia công/lắp đặt hợp lý | 3 |
| Không lỗi hình học, chữ, ánh sáng/phản chiếu hoặc chi tiết AI | 2 |
| Đúng brief tỷ lệ ảnh, pixel thật, metadata và provenance | 2 |

Ở mục Audit đầu tiên, reviewer đối chiếu ngành/khu vực/vị trí/công năng/góc
chụp trong brief với bảng bối cảnh trên. Không chấm đủ điểm chỉ vì không gian
đẹp; sai bối cảnh cốt lõi so với brief phải sửa trước nghiệm thu.

| Critique thị giác | Điểm tối đa |
| --- | --- |
| Bố cục rõ chủ thể ở ảnh lớn và thumbnail; góc nhìn thể hiện sản phẩm | 3 |
| Ánh sáng, vật liệu, độ sắc nét và chất lượng nhiếp ảnh | 3 |
| Phù hợp [style guide](style-guide.md), tinh tế nhưng vẫn trung thực cấu tạo | 2 |
| Bổ sung khác biệt hữu ích cho bộ ảnh: sản phẩm, góc, bối cảnh và tỷ lệ | 2 |

**Loại trực tiếp dù đủ điểm**: mặt nhận diện trái policy; thương hiệu/watermark
bị sao chép; chữ chủ thể sai hoặc vô nghĩa; kết cấu sản phẩm bất khả thi; sai
nhóm; sản phẩm lớn bị cắt mất phần cần thấy; crop/kéo méo để ép ratio; khai sai
provenance; dùng bản crop/export lại như ảnh mới.

Một subagent độc lập với agent tạo ảnh phải mở ảnh để audit và critique, ghi
điểm từng mục, lỗi cụ thể và yêu cầu sửa. Không chấm chỉ từ prompt, tên file hay
báo cáo của generator. Main kiểm chứng evidence và nghiệm thu; không tự nâng
điểm. Ảnh chưa đạt phải sửa/tạo lại rồi chấm lại đúng phiên bản mới.

## Kiểm tra bộ ảnh và liên kết grid

Ảnh đạt riêng lẻ chưa chứng minh grid đạt. Bộ ảnh phải đủ biến thể sản phẩm,
góc chụp và tỷ lệ để thuật toán tạo bố cục organic, không nhịp gạch đều, với
offset và giới hạn cột theo grid hiện hành tại
[patterns](patterns.md#advertising-grid-geometry),
[GRID-R4](../specs/advertising-grid-span-organic.md) và
[Advertising spec](../specs/advertising-products-turnkey-services.md).

Nếu bộ ảnh quá ít hoặc tỷ lệ quá giống nhau, bổ sung/tạo lại ảnh có bố cục gốc
phù hợp, qua hai gate điểm rồi chạy lại kiểm tra toàn grid. Không chữa bằng crop,
kéo méo, bỏ lựa chọn span của admin hoặc thêm khoảng trắng giả. Đa dạng tỷ lệ
không có nghĩa ép mọi ảnh về baseline 3:2 của slot khác.

Mỗi bản nghiệm thu ghi asset ID/path và hash phiên bản, nhóm/product key,
kích thước, ratio, nguồn/provenance, brief, reviewer, version/hash rubric,
hai bảng điểm, lỗi và kết
luận. Bảng kết quả thuộc verification artifact; guide này chỉ giữ tiêu chí,
không ghi điểm khi chưa có bằng chứng xem ảnh.

## Logic sử dụng, vật liệu và kết cấu sản phẩm

Các yêu cầu dưới đây là phản hồi owner cho thư viện ảnh. Ảnh đã có điểm nhưng
bị owner yêu cầu sửa phải mở lại acceptance theo đúng file/hash; không dùng
điểm cũ để giữ nhãn đạt yêu cầu.

| Sản phẩm | Điều kiện hình ảnh cần chứng minh |
| --- | --- |
| Xe trà sữa và quầy pha chế | Mặt thao tác, bảng điều khiển và lối đưa ly của máy dập nắp hướng về phía người pha chế phía sau quầy. Các dụng cụ bố trí theo người sử dụng, không xoay ra khách chỉ để camera thấy mặt trước máy. |
| Chữ nổi Mica | Baseline chữ, fascia và cửa cùng hệ phối cảnh. Nếu góc cũ liên tục làm chữ méo, đổi bố cục hoặc góc chụp; không lặp lại ảnh lỗi chỉ với ánh sáng khác. |
| Biển tên đường | Owner chốt cột cao **3.600 mm**; brief tạo hình tính từ mặt đất đến đỉnh cột. Biển nằm trên đỉnh cột, không có đầu cột nhô lên trên mặt biển. Giữ mặt biển tham chiếu 750 × 400 mm; chụp đủ cột và biển để tỷ lệ tổng thể đọc được. Owner bổ sung ngày 2026-09-13: mặt biển vuông góc với hướng di chuyển của người đi đường, quay về phía người đang đến; cảnh phải thể hiện được hướng đường để kiểm logic. Tạo cảnh mới để phá noise/pattern, không chỉ sửa pixel của bản lỗi. Phân biệt biển tên đường với biển báo chỉ hướng; con số owner chốt là yêu cầu của ảnh, không phải khẳng định quy chuẩn chung. |
| Menu để bàn Mica | Đế Mica đục màu. Bộ ảnh có menu đồ uống và menu bánh, nội dung/typography phù hợp từng loại; không chỉ lặp một menu nước trên nhiều giá. |
| Menu in trực tiếp lên Mica | Trong brief owner, đây là in UV trên Mica đục màu, thường là Mica sữa. Thấy bề dày/cạnh tấm và phần nền đục; không thay bằng tấm trong suốt kẹp giấy. |
| Canvas căng khung | Owner đổi bố cục ảnh `printed-canvas`: đặt tranh dưới đất, dựa trực tiếp vào tường; không dùng giá vẽ hoặc đặt trên bàn. Thấy cạnh đáy chạm sàn, điểm tựa tường và bóng tiếp xúc hợp lý. Giữ thiết kế mặt in, khung gỗ, mép vải và mặt sau. |
| Quầy bán hàng sự kiện từ dừa | Owner trả lại “VỊ DỪA QUÊ” ngày 2026-09-13 vì noise và yêu cầu ảnh mới, tên quầy tiếng Anh “COCONUT GROVE”. Phản hồi R3 cùng ngày: giữ kiểu quầy Vị Dừa Quê cũ (khung sắt, mặt gỗ và kệ trưng bày), đặt trong trung tâm thương mại hoặc siêu thị đang hoạt động; không dùng kiểu quầy xanh/mái mới của R2. Dùng ảnh cũ làm tham khảo cấu tạo, tái tạo cảnh và texture để tránh noise. Phản hồi R4: xóa hai khách xách giỏ và nhân viên bán hàng; giữ quầy, hàng hóa và bối cảnh siêu thị, không có người trong ảnh. Không phục hồi tên/subtitle tiếng Việt cũ. Giữ sản phẩm đồ uống dừa và cấu tạo quầy có thể sử dụng thực tế. Đây là chữ quảng bá minh họa, không xác nhận thương hiệu thật. Màn hình POS và ngăn kéo vẫn hướng về người vận hành. |
| Quầy dùng thử trà trái cây | Owner bổ sung ngày 2026-09-13: đặt trong hội chợ thương mại, trung tâm mua sắm hoặc siêu thị; phải thấy rõ không gian đang hoạt động, không dùng sảnh trống thay bối cảnh. Nếu có người, tuân thủ content guide về quay lưng, che mặt hoặc nhòe chuyển động. |
| Tờ rơi trà trái cây | Owner trả lại bản hiện hành ngày 2026-09-13 vì noise: tạo ảnh khác hoàn toàn về bố cục/thiết kế/bối cảnh để phá pattern; không chỉnh lại pixel nhiễu rồi dùng điểm cũ. Chỉ chấm bản mới theo exact hash. |
| Chữ nhôm đục lỗ gắn LED trên nóc | Ảnh “BỆNH VIỆN” cần LED sáng hơn rõ rệt ở cả ảnh lớn và thumbnail. Giữ từng điểm LED, dấu tiếng Việt, mặt và hông kim loại, khung chịu lực; không biến thành mặt Mica phát sáng liền hoặc tăng bloom làm mất chi tiết. |
| Pano căng khung sắt | Bản mẫu hiện được yêu cầu có viền nhôm hoàn thiện, tham khảo ảnh thi công thực tế. Giữ bối cảnh nhà máy và nội dung KHU SẢN XUẤT khi sửa ảnh cụ thể. |
| Pano khổ lớn | Khung chịu lực hợp lý; viền mặt quảng cáo được ốp hoàn thiện theo ảnh thực tế. Không để hở dây căng/khoen quanh mặt chính như phiên bản owner đã từ chối. |
| Standee đế đối trọng | Đế thấp, tỷ lệ cân đối với khung; vẫn có thể tích và điểm liên kết đủ hợp lý để giữ đứng, không làm đế cao thành bục. |

Coverage sơ đồ bổ sung gồm ba ảnh riêng: khu du lịch, khu công nghiệp và nhà
máy sản xuất. Mỗi sơ đồ có đường đi liên tục, khu chức năng đúng bối cảnh,
chú giải và vị trí “Bạn đang ở đây” hợp lý; khung/đế/gá lắp có thật. Đây là
sơ đồ minh họa, không dùng để khẳng định địa lý, quy hoạch hay an toàn của một
cơ sở có thật. Sơ đồ tầng văn phòng không thay coverage của ba loại này.

### Quy chiếu biển tên đường và pano

Tra cứu ngày 2026-09-10: mục VII của
[Thông tư 36/2006/TT-BVHTT](https://vbpl.vn/bongoaigiao/Pages/vbpq-toanvan.aspx?ItemID=16473)
nêu biển tên đường 75 × 40 cm; cột sắt đường kính tối thiểu 10 cm, đầu cột
cao khoảng 250 cm. Văn bản cho phép biển nhỏ hơn ở đô thị nhỏ với sự thống nhất
trong địa phương. [Quy định Thái Nguyên](https://vbpl.vn/thainguyen/Pages/vbpq-toanvan.aspx?ItemID=75554)
là một nguồn địa phương đối chiếu cùng các mốc này. Đây là quy chiếu tạo hình
ban đầu cho ảnh, không phải xác nhận áp dụng pháp lý cho mọi đường nội bộ
hoặc phép đo kích thước thật từ pixel. Owner sau đó chốt cột **3.600 mm**;
chiều cao này thay mốc 2,5 m trong brief ảnh hiện hành, còn 750 × 400 mm là
tham chiếu mặt biển. Tỷ lệ mặt biển và tổng thể phải thấy được trong ảnh;
không dùng số ghi trong prompt thay bằng chứng hình học hoặc bản đo thi công.

Ảnh pano được đối chiếu với ảnh thi công trên trang
[In An Anh](https://inananh.com/in-pano-co-dong-tuyen-truyen) và
[3H](https://thicongbienquangcao.vn/bien-pano). Nguồn xưởng
[Việt Hưng](https://quangcaoviethung.com/bao-gia-bien-bat-khung-sat-gia-re-thi-cong-tron-goi/)
mô tả bạt căng khung sắt với nẹp nhôm/inox bảo vệ mép; phần này đọc từ bản
lập chỉ mục vì trang trực tiếp có màn kiểm tra truy cập. Không dùng các
claim giá, tuổi thọ hay tải trọng của nhà cung cấp. Ảnh nguồn hỗ trợ dạng
kết cấu; viền nhôm/ốp kín là yêu cầu owner, không suy vật liệu ẩn từ ảnh.
Chi tiết nguồn, ảnh đã xem và giới hạn theo
[research](../../source-assets/projects/advertising/taxonomy-20260910-feedback-signs/research.md)
và review đúng phiên bản tại manifest thư viện.

### Biến thể hộp đèn và số nhà từ nguồn Shopee

Owner bổ sung ba link ngày 2026-09-10. Đã đọc tên và mô tả sản phẩm bằng
browser; các trang có thể chuyển sang yêu cầu đăng nhập khi xem tiếp. Dùng
nguồn để nhận diện loại sản phẩm; không sao chép thương hiệu, số nhà, logo,
watermark hoặc claim quảng cáo. Mỗi loại có một ảnh minh họa riêng.

| Loại ảnh bổ sung | Nguồn và phần đã kiểm | Brief tạo hình |
| --- | --- | --- |
| Hộp đèn kim loại hiệu ứng rỉ sáng viền | [Nguồn thứ nhất](https://shopee.vn/product/1511680810/47752942847): tên/mô tả có hộp đèn kim loại tạo hiệu ứng oxy hóa, LED sáng viền. Chưa xem được ảnh sản phẩm trước màn đăng nhập. | Hộp kim loại có chiều sâu và gá tường, mặt hiệu ứng rỉ vẫn đục, LED viền rõ. Đồ họa cà phê chung, không gán tên xưởng nguồn. |
| Biển số nhà Mica có LED và số nổi | [Nguồn thứ hai](https://shopee.vn/product/454128383/19182398035): mô tả Mica dẫn sáng, mặt đen nhám và số nổi; chưa xác minh ảnh sản phẩm. | Tấm nền đen, lớp Mica dẫn sáng và số Mica sữa nổi, ánh sáng đọc được; ảnh minh họa không chứng minh điện áp hoặc khả năng chịu thời tiết. |
| Biển số nhà kết hợp Mica–Alu có LED | [Nguồn thứ ba](https://shopee.vn/product/1172011449/27371374999): đã đọc mô tả Mica–Alu và xem ảnh chính; chữ số mặt tối nối thanh ngang bên dưới, ánh sáng hắt ấm lên nền. | Số mẫu riêng, mặt tối đục và lớp tán sáng, thanh ngang thấp, gá cách nền và ánh sáng hắt rõ; không sao chép số hoặc nhận diện trong nguồn. |

Các mô tả chất liệu trên là lời mô tả sản phẩm của người bán, không phải kết
quả kiểm định độc lập. Không đưa giá, tuổi thọ, bảo hành, độ bền ngoài trời,
điện áp hoặc nội dung pháp lý trên trang bán hàng vào contract sản phẩm của
website. Ảnh mới là thiết kế minh họa theo công năng, không phải ảnh hàng thật
của ba gian hàng hoặc công trình đã thi công của Trường Thịnh.

## Chú thích thuật ngữ

- **Audit**: kiểm tra độ đúng kỹ thuật và ràng buộc nội dung.
- **Critique**: đánh giá chất lượng thị giác và đóng góp cho bộ ảnh.
- **Provenance**: nguồn gốc và lịch sử tạo/chỉnh sửa tài sản.
- **POSM**: vật phẩm/quầy kệ hỗ trợ trưng bày và bán hàng.
- **Tôn (tole) làm lưng**: tấm phía sau mặt bạt, thuộc cấu tạo pano có lưng tôn.
- **Ratio/span**: tỷ lệ chiều rộng/chiều cao và số cột một khung chiếm.
- **Coverage**: mức bao phủ từng loại sản phẩm bằng ảnh phù hợp đã kiểm chứng.
- **Facet**: một chiều phân loại độc lập, chẳng hạn loại sản phẩm hoặc vật liệu.
- **Bế theo biên**: cắt lớp decal theo đường bao, giữ giấy đế để mang các tem.
