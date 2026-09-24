# Lựa chọn ảnh ngày 24/09/2026

Owner chọn 28 dHash trong media review ngày20/09. Mapping exact SHA256 và
brief sửa nằm trong `selection.json`; xem `report.html` để đối chiếu phiên bản.

- 22 lựa chọn không yêu cầu tạo lại, định danh rõ: chưa quan sát thấy gần trùng
  1:1 với 127 ảnh catalog hiện tại sau đối chiếu thị giác toàn bộ contact sheet.
- Owner đã chốt hai phiên bản: `0fc7b5c7cec6c8f0` dùng SHA
  `fcff2bf7b424`; `96b0585c4cccd0f8` dùng SHA `3da7f69a1725`.
  Full SHA và path nguồn nằm trong selection.json; đã kiểm bytes đúng SHA.
- Ảnh quầy dừa đã chọn cần đổi tên trên ảnh sang tiếng Anh; đề xuất
  `GÓC DỪA` thành `COCO BREEZE`. Chưa tạo bản sửa, chưa đổi public.
  Owner cho phép dùng bản này thay sản phẩm tương tự mobile-retail-05.
- Bốn ảnh tạo lại: `6d4d4c3c3f5bca0a`, `4666627d51570d03`,
  `5e5fa796968616b3`, `c5520e8e0a04d0e4`. Giữ nguồn; chưa tạo lại vì
  cần phân biệt yêu cầu giao diện ChatGPT với tool tích hợp trong Codex.
- Chưa đổi catalog/public. Không dùng kết quả kiểm tra gần trùng thay cho
  Audit/Critique hoặc nghiệm thu ảnh mới.

## Phương pháp và giới hạn

Đọc manifest127 ảnh đang dùng; tính dHash bằng cùng browser canvas với
inventory cũ, xếp3 ứng viên gần nhất mỗi lựa chọn, rồi xem toàn bộ ảnh website
và lựa chọn qua contact sheet. Khoảng cách hash không đủ kết luận trùng hoặc
không trùng. Có xem thêm file public cũ không còn trong manifest; chúng không
được tính là ảnh đang dùng. SHA nguồn31/31 được kiểm lại từ bytes.

## Chú thích thuật ngữ

- **dHash**: dấu vân tay thị giác, có thể trùng giữa nhiều file.
- **SHA256**: định danh nội dung file dùng để khóa chính xác phiên bản.
- **HOLD**: tạm giữ chưa tích hợp, cần owner chọn exact phiên bản.

## Bổ sung brief quầy dừa

Owner xác định sản phẩm là nước dừa hộp giấy, tương tự sữa hộp. Tạo mới
trong cửa hàng tiện lợi khác; giữ kiểu quầy. Tên minh họa đề xuất COCO BREEZE.
Thực hiện trên giao diện ChatGPT; hiện chưa đăng nhập, chưa tạo ảnh.
Prompt: `coco-breeze-chatgpt-prompt.txt`. Tổng cộng5 ảnh cần tạo lại.

## Kết quả tạo ảnh qua ChatGPT

Đã tạo đủ5 ảnh qua ChatGPT web UI, lưu trong thư mục này. Không dùng CLI/API
hoặc imagegen Codex. `generated.json` giữ SHA, kích thước và chat URL;
`chatgpt-conversations.json` giữ prompt và phản hồi UI. Quầy hội chợ v2 thay
bản v1 trong review; giữ cả hai để truy nguyên. Xem `generated-review.html`.
Main đã xem5 ảnh; chữ nhỏ trên hộp và tem còn cần review. Chưa chấm độc lập,
chưa owner duyệt, chưa đổi ảnh website. Các ghi chú chờ đăng nhập phía trên
là checkpoint cũ, được kết quả này supersede.

## Owner duyệt 5 ảnh

Ngày 24/09/2026 owner xác nhận “duyệt 5 ảnh này” trên generated-review.html.
Đã kiểm SHA256 của đủ5 file rồi ghi owner-approved trong generated.json và
selection.json. Quầy hội chợ dùng outdoor-cart-rear-storage-v2.png, không phải
bản v1. Approval này thay trạng thái chờ owner ở checkpoint trước; không
tự suy ra đã chấm độc lập hoặc đã tích hợp public.

## Tích hợp owner selection — 24/09/2026

Owner yêu cầu tích hợp các ảnh đã duyệt và5 ảnh mới. Tổng28 phiên bản cuối:
27 ảnh thêm, COCO BREEZE thay mobile-retail-05; năm ảnh ChatGPT thay các
lựa chọn nguồn tương ứng, không cộng thêm lần nữa. Catalog154, dataset2026-09-24.1.
Mapping exact ID, source/public SHA256, kích thước và productKey: exports.json.
Giữ toàn bộ nguồn và public cũ; WebP mới dùng suffix owner-20260924.
Thêm taxonomy Standee và khung quảng cáo, Bao bì và ly in F&B để không gán sai nhóm.

Kiểm chứng: Node media/layout34/34, prepare:site, qa:static đạt;
28/28 nguồn/public SHA256 và HTTP200 đạt. Full-span VI/EN ảnh ngang/dọc
và954px đạt. Browser xác nhận COCO1448×1086 tải đúng, không overflow ngang.

Review độc lập: independent-review.md. LUMA, standee, quầy ngoài trời đạt;
COCO và decal còn lỗi chữ nhỏ, Audit7.6/7.8 dưới8. Giữ exact phiên bản owner
đã duyệt và yêu cầu tích hợp; không gọi toàn bộ5 ảnh đạt quality rubric.
Chưa deploy, commit/push hoặc xác nhận full-site parity. Phần này supersede
các checkpoint chưa tích hợp phía trên.
