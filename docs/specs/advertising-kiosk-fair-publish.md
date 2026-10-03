---
title: Xuất bản ảnh kiosk trong hội chợ đã qua gate
type: frontend
status: accepted
updated: 2026-09-20
notion: https://app.notion.com/p/3e0332849a0e8111999ce78454b21ae1
related_decisions: []
related_reports:
  - ../verification/advertising-images-audit-2026-09-09.md
---

# Xuất bản ảnh kiosk trong hội chợ đã qua gate

## 1. Vấn đề và kết quả

### Vấn đề

Ảnh kiosk đặt trong hội chợ đã qua quality gate nhưng chưa được truy vết đến
exact bản public, chưa đủ tag/label và mô tả để xuất hiện trên website.

### User và context

Owner cần ưu tiên các ảnh này để danh mục `Kiosk & POSM` phản ánh đúng bối cảnh
hội chợ đang hoạt động mà không mở lại vòng chấm ảnh đã đạt.

### Kết quả mong muốn

Exact ảnh đã duyệt xuất hiện trong parent masonry và photo detail VI/EN, có taxonomy
và mô tả đúng, không có title/caption riêng.

| Trong scope | Ngoài scope |
| --- | --- |
| Truy vết exact hash, derivative WebP, tag/label, mô tả VI/EN, catalog và focused QA | Tạo ảnh mới, chấm lại ảnh không đổi, thay taxonomy toàn bộ catalog |

## 2. Constraint và câu hỏi mở

- Chỉ tích hợp file có evidence gate khớp exact hash.
- Không đưa bản superseded, rejected hoặc revision gần giống thay thế bản duyệt.
- Giữ contract ảnh không có tên riêng; alt, mô tả và ARIA vẫn đầy đủ.
- Chưa rõ số lượng exact ảnh kiosk hội chợ; inventory phải giải quyết trước edit public.

## 3. User workflow và acceptance

```gherkin
Given ảnh kiosk hội chợ có exact gate hợp lệ
When user mở danh mục Kiosk & POSM hoặc photo detail bằng VI/EN
Then ảnh xuất hiện đúng taxonomy và mô tả
And grid/detail không render title hoặc caption riêng cho ảnh
```

## 4. System và implementation boundary

Nguồn candidate nằm trong `source-assets/projects/advertising/` và thư viện
generation; public derivative thuộc `src/site/assets/content/advertising/`.
Catalog, tag và copy dùng module hiện hành dưới `src/site/advertising-products/`;
không tạo schema hoặc component mới.

## 5. Hướng dẫn implementation

```text
Build: pnpm prepare:site
Test: node --test tests/site/advertising-products-media.test.mjs tests/site/advertising-products-static.test.mjs
Verify: pnpm qa:static và browser VI/EN parent/detail
```

Implementation nhỏ nhất: lập manifest exact source → tạo derivative theo pipeline
hiện hành → thêm record/tag/copy → chạy focused checks. ID và URL phải ổn định,
không dùng filename generation làm product copy.

## 6. Thuộc tính chất lượng

| Attribute | Requirement | Evidence |
| --- | --- | --- |
| Accessibility | Alt/ARIA VI/EN mô tả nội dung, không phụ thuộc title ẩn | DOM/a11y tree |
| Performance | Derivative theo kích thước và định dạng catalog hiện hành | media contract |
| Security | Không có input/runtime mới | static audit |
| Maintainability | Record dùng taxonomy hiện hành và lưu exact provenance | manifest/hash |

## 7. Kế hoạch verification

| Level | Scenario | Method | Evidence kỳ vọng |
| --- | --- | --- | --- |
| Source | Candidate khớp bản đã duyệt | SHA256 + gate record | exact match |
| Contract | Media/catalog/tag/copy | Node tests | pass |
| Browser | Parent/detail VI/EN | DevTools/Playwright | đúng ảnh, không title, không lỗi |
| Human | Owner spot-check | local preview | đúng bối cảnh và phân loại |

## 8. Delivery, migration và rollback

Thin slice là một ảnh kiosk hội chợ đi hết source → public → parent/detail. Rollback
bằng cách phục hồi record/asset cũ theo exact diff; không xóa source candidate.

## 9. Reference và history

| Date | Change | Reason |
| --- | --- | --- |
| 2026-09-20 | Initial draft | Capability map được owner duyệt |
| 2026-09-20 | Owner accepted | Owner duyệt toàn bộ năm module spec |
| 2026-09-20 | Implemented | Tích hợp exact source kiosk-posm-25–30, provenance và 19 media/static checks đạt |

## Chú thích thuật ngữ

- **Exact hash**: SHA256 của đúng file đã được gate.
- **Derivative**: file public được chuyển đổi từ nguồn đã duyệt.
- **Provenance**: chuỗi truy nguyên từ generation tới asset public.
