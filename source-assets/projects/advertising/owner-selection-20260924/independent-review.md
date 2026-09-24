# Review độc lập năm ảnh owner chọn

Ngày kiểm: 2026-09-24. Reviewer: Codex subagent `selection_media_review`, độc lập với tác vụ tạo ảnh. Đã mở trực tiếp cả năm PNG bằng `view_image`, chế độ `original`; không chấm từ prompt hoặc contact sheet. SHA256 tính lại từ bytes khớp `generated.json` cả năm file.

Rubric: `docs/design/advertising-image-quality.md`, SHA256 `6502ff674ced83e9378e4b4974697727ef549c3d927a6aa44be46fa3d8967600`, mục Chấm điểm và điều kiện loại; đối chiếu thêm `docs/design/content.md` và `docs/design/style-guide.md`. Brief đọc từ `chatgpt-conversations.json`. Nguồn: ảnh minh họa AI qua ChatGPT web UI; model tạo ảnh thực tế unknown. Owner đã duyệt exact năm SHA ngày 24/09; approval này không bị report sửa hoặc thu hồi.

## Điểm và kết luận

Audit lần lượt: đúng brief /3, cấu tạo /3, lỗi hình học-chữ-ánh sáng /2, tỷ lệ-pixel-provenance /2. Critique lần lượt: bố cục /3, chất lượng ảnh /3, style /2, đóng góp biến thể /2. Điểm nguồn không chứng minh WebP, public metadata hoặc grid đã đạt.

| File | Nhóm sản phẩm | Pixel; ratio | Audit từng mục; tổng | Critique từng mục; tổng | Kết luận độc lập |
| --- | --- | --- | --- | --- | --- |
| `coco-breeze-v1.png` | mobile-retail; quầy trưng bày nước dừa hộp | 1448×1086; 4:3 | 2,4 + 2,7 + 0,5 + 2 = **7,6** | 2,5 + 2,6 + 1,8 + 1,7 = **8,6** | Chưa đạt Audit; chữ trên một số hộp sai. |
| `decal-workshop-v1.png` | print-decals; decal in và bế | 1448×1086; 4:3 | 2,6 + 2,5 + 0,7 + 2 = **7,8** | 2,6 + 2,7 + 1,8 + 1,8 = **8,9** | Chưa đạt Audit; microtext tem cam thành nét chữ giả. |
| `luma-studio-v1.png` | signage-raised-letters; chữ Formex | 1448×1086; 4:3 | 2,9 + 2,7 + 1,8 + 2 = **9,4** | 2,7 + 2,8 + 1,9 + 1,7 = **9,1** | Đạt review nguồn. |
| `standee-t-feet-v3.png` | kiosk-posm; standee hai chân T | 1086×1448; 3:4 | 2,8 + 2,7 + 1,8 + 2 = **9,3** | 2,9 + 2,8 + 1,8 + 1,9 = **9,4** | Đạt chất lượng ảnh; giới hạn diễn giải khuôn mặt nêu bên dưới. |
| `outdoor-cart-rear-storage-v2.png` | mobile-retail; quầy di động nhìn từ sau | 1448×1086; 4:3 | 2,9 + 2,7 + 1,8 + 2 = **9,4** | 2,8 + 2,7 + 1,8 + 1,9 = **9,2** | Đạt review nguồn. |

## Evidence theo phiên bản

### Quầy COCO BREEZE

SHA256: `c9cafc6aae2e4de29c028f770996b7846c4c75cbae205fc530f64fd5480384b4`.

Đúng hộp giấy, khung đen, mặt gỗ, kệ, cửa hàng tiện lợi và màn hình POS quay về người vận hành. Chữ lớn COCO BREEZE / COCONUT WATER rõ. Trên cụm hộp mặt quầy, hộp ngoài bên phải hiện “OCO” thay “COCO”; các dòng rất nhỏ trên nhiều hộp biến dạng. Đây là lỗi nhãn sản phẩm, không thể lấy chữ lớn đúng để khẳng định toàn ảnh đúng brief “không chữ ngẫu nhiên”. Bánh gần camera sát mép dưới và bị cắt một phần; quầy vẫn đọc được cấu tạo nhưng không hoàn toàn đáp ứng “thấy trọn quầy và bánh xe”. Hàng hóa có độ lặp đều mang dấu hiệu ảnh tổng hợp.

Yêu cầu để đạt rubric không ngoại lệ: sửa đúng chữ trên các hộp và giữ đủ bánh ở biên ảnh, rồi chấm SHA mới. Task hiện tại cấm tự tạo lại; report chỉ ghi finding. Không dùng điểm owner approval thay điểm Audit.

### Decal trong xưởng

SHA256: `ae0e791a292804e6c91dc994ed1d96fff625cd1c98587d2928a8a762f282fda6`.

Tem chữ nhật cam trên máy và tem tròn trà xanh trên bàn khác rõ nội dung/hình dáng; giấy đế liên tục, có đầu cắt, thanh dẫn và giỏ hứng. Chữ chính FRESH ORANGE và GREEN TEA đọc được. Dòng nhỏ dưới FRESH ORANGE trên nhiều nhãn có nét giả, không đọc thành nội dung nhất quán. Đường bế theo biên ở tem trên máy không đủ rõ để chứng minh thao tác bế đang thực sự diễn ra; không suy máy này có khả năng in chỉ từ ảnh. Mép bàn che phần chân máy, một số tem tiền cảnh ra khỏi khung; sản phẩm chính vẫn rõ.

Yêu cầu để đạt rubric không ngoại lệ: loại/sửa microtext lỗi ở nhãn cam, bảo toàn hai bộ artwork và giấy đế, chấm SHA mới. Không tự thực hiện trong task này. Khổ danh nghĩa 600 mm là brief, không phải phép đo từ ảnh.

### Chữ LUMA STUDIO

SHA256: `24eebcd0e08ebda1bc21edd314c01a9258ec78a7fc9daec5357f9eb8c44f689e`.

Tên đúng; mặt trắng đục không phát sáng, cạnh dày và bóng tiếp xúc đọc được. Baseline và phối cảnh nhất quán đủ cho minh họa. Logo hình học và chữ không bị cắt. Nền sáng chiếm nhiều diện tích nhưng chữ vẫn là chủ thể rõ. Không có lỗi vật thể chảy hoặc chữ méo nổi bật. Vật liệu chính xác là Formex theo brief; ảnh không chứng minh thành phần vật liệu hay cơ cấu cố định ẩn.

### Standee chân T

SHA256: `431e6ed5867f77f41647a2aed6da62b164d1f851d5428c103532dcef5bfaa517`.

Hai trụ và hai chân T nhìn được, đầu chân tiếp sàn, khoen/gá nối tấm hiện rõ; chữ SẮC MỚI và tagline đọc đúng. Không thấy người thật trong cửa hàng hoặc phản chiếu. Poster có chân dung nữ vẽ minh họa với khuôn mặt rõ. Nhận định của reviewer: đây là artwork hư cấu theo brief poster thời trang, không phải khuôn mặt người thật nhận diện được. Tuy nhiên `content.md` cấm khuôn mặt nhận diện và yêu cầu kiểm cả ảnh trong ảnh; report không chứng minh danh tính hay tự mở ngoại lệ policy. Main phải giữ rõ phân biệt này khi nghiệm thu, không ghi “không có khuôn mặt”. Bạt hơi cong ở mép dưới; chưa đến mức kết cấu bất khả thi.

### Quầy ngoài trời v2

SHA256: `aaa5b58ce7c4d1d257b557250ec61c26d326047914010feda5c304185c09c6bf`.

Mặt dài sau có hai cánh và khóa; mặt ngắn bên phải kín trắng, không cửa/khóa/poster. Đúng correction v2, không lấy v1 thay thế. Mặt gỗ, chai dừa, hội chợ ngoài trời, chân bánh và bóng tiếp xúc hợp lý. Mặt quảng cáo phía đối diện không thấy đúng brief correction. Không chứng minh mặt hông khuất cũng kín hoặc kích thước thật 1,2×0,6 m; bản lề ẩn không quan sát được. Không thấy lỗi nghiêm trọng cần sửa trong vùng sản phẩm.

## Giới hạn nghiệm thu

Hai nguồn COCO BREEZE và decal chưa đạt Audit độc lập dù owner đã duyệt exact file. Không tự tái tạo hoặc đổi file để né quyết định owner. Main cần trình bày trung thực sự khác nhau giữa owner selection và rubric, không ghi 5/5 Audit/Critique đạt. Review này chưa xem bản WebP xuất sau, chưa kiểm metadata/alt/public mapping hoặc thumbnail runtime. Đóng góp biến thể được đánh giá trong năm ảnh này, không phải chứng nhận toàn catalog không gần trùng.

## Chú thích thuật ngữ

- **Audit**: điểm đúng nội dung và kỹ thuật của ảnh.
- **Critique**: điểm chất lượng thị giác.
- **SHA256**: định danh bytes của đúng phiên bản đã xem.
- **Microtext**: chữ rất nhỏ trên bao bì hoặc tem.
- **Provenance**: thông tin nguồn gốc tạo ảnh.
