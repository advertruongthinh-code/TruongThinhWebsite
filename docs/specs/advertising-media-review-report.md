---
title: Báo cáo HTML thư viện ảnh Advertising 10–20/09/2026
type: cross-cutting
status: accepted
updated: 2026-09-20
notion: https://app.notion.com/p/3e0332849a0e8175844ce3444a75f975
related_decisions: []
related_reports: []
---

# Báo cáo HTML thư viện ảnh Advertising 10–20/09/2026

## 1. Vấn đề và kết quả

### Vấn đề

Thư viện generation chứa revision, ảnh gần giống, bản superseded và candidate
chưa public. Danh sách đường dẫn không đủ để owner so sánh trực quan.

### Kết quả mong muốn

Một báo cáo HTML local liệt kê đúng một lần mọi ảnh tạo từ đầu `10/09/2026` đến
hết `20/09/2026`, gom ảnh gần giống thành cụm và đề xuất bản tốt nhất.

| Trong scope | Ngoài scope |
| --- | --- |
| Inventory, metadata, thumbnail/link, clustering, merge evidence điểm và đề xuất | Tự duyệt ảnh, tự tích hợp candidate chưa qua owner gate, thay file nguồn |

## 2. Constraint và câu hỏi mở

- Khoảng ngày dùng timestamp file ở timezone local `Asia/Bangkok`.
- Mỗi exact hash chỉ xuất hiện một record chính; duplicate path được liệt kê phụ.
- Cụm cấp một theo sản phẩm/bối cảnh, cấp hai theo perceptual similarity.
- Điểm chỉ được hiển thị khi có evidence gắn exact hash; không suy điểm cho ảnh khác.
- Report chạy local, link ảnh không phụ thuộc server ngoài.

## 3. User workflow và acceptance

```gherkin
Given owner mở báo cáo HTML local
When xem một cụm ảnh gần giống
Then mọi revision có thumbnail và link ảnh gốc cạnh nhau
And một ảnh được đề xuất với lý do logic, aesthetic và artifact ngắn gọn
```

## 4. System và implementation boundary

Scanner đọc `C:\Users\halal\.codex\generated_images` trong khoảng ngày, đối chiếu
`source-assets/projects/advertising/`, manifest review và catalog public. Artifact
HTML cùng JSON inventory đặt dưới một thư mục review mới trong
`source-assets/projects/advertising/`; không đặt vào `src/site/`.

## 5. Hướng dẫn implementation

```text
Build: N/A
Test: chạy scanner hai lần và so exact count/hash/order
Verify: mở HTML local, kiểm thumbnail/link/filter/cụm và spot-check hash
```

Clustering ưu tiên metadata/lịch sử revision, sau đó perceptual hash hoặc embedding
local để gợi ý; threshold phải lưu trong report. Recommendation dùng evidence đã
có, không gọi điểm cũ của revision khác là điểm exact.

## 6. Thuộc tính chất lượng

| Attribute | Requirement | Evidence |
| --- | --- | --- |
| Accessibility | HTML semantic, keyboard, alt và contrast đọc được | browser audit |
| Performance | Thumbnail lazy-load; không nhúng full PNG base64 | network/local profile |
| Security | Escape path/copy; report không thực thi nội dung ảnh | source review |
| Maintainability | JSON inventory là nguồn cho HTML, output deterministic | repeat run diff |

## 7. Kế hoạch verification

| Level | Scenario | Method | Evidence kỳ vọng |
| --- | --- | --- | --- |
| Inventory | Cutoff và exact hash | filesystem scan | count đối chiếu được |
| Clustering | Revision gần giống | visual spot-check | cùng cụm, không trộn sản phẩm |
| Evidence | Status/điểm theo hash | manifest join | không gán nhầm revision |
| Browser | Link, ảnh, filter, keyboard | local browser | hoạt động không lỗi |

## 8. Delivery, migration và rollback

Thin slice tạo JSON inventory và một cụm HTML mẫu trước khi render toàn bộ. Report
là additive review artifact; rollback bằng xóa đúng thư mục output mới sau khi
verify không có consumer.

## 9. Reference và history

- [Image quality rubric](../design/advertising-image-quality.md)
- [Image audit](../verification/advertising-images-audit-2026-09-09.md)

| Date | Change | Reason |
| --- | --- | --- |
| 2026-09-20 | Initial draft | Owner yêu cầu HTML có ảnh, link, clustering và đề xuất |
| 2026-09-20 | Owner accepted | Owner duyệt toàn bộ năm module spec |
| 2026-09-20 | Implemented, owner review open | 93 exact image, 69 cụm; evidence theo hash, loại rejected và output deterministic đạt |

## Chú thích thuật ngữ

- **Perceptual similarity**: độ giống thị giác, không chỉ giống byte/hash.
- **Superseded**: bản cũ đã được revision mới thay thế.
- **Review artifact**: tài liệu phục vụ duyệt, không phải asset public.
