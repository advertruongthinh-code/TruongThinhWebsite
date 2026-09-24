---
title: Dev UI tạm thời cho Skeleton Flow
type: frontend
status: retired
updated: 2026-09-24
notion: https://app.notion.com/p/3e0332849a0e811dbac1e7bb09ea28be
related_decisions: []
related_reports: []
---

# Dev UI tạm thời cho Skeleton Flow

## Hiện trạng sau yêu cầu phát hành 24/09/2026

Đã gỡ editor, import, CSS, storage/export và test editor khỏi source public.
Giữ nguyên preset hiện hành trong `skeleton-flow.mjs`, không lấy draft local
thay cấu hình đã kiểm tra. Bản sao editor/test được giữ local tại
`.tmp/retired-skeleton-devtools-20260924/`; không đưa vào archive Sites.
Static regression kiểm source không còn hook editor. Phần dưới là contract
lịch sử của giai đoạn tune; removal đã thực hiện, không mở lại owner visual
của các đợt trước và không ghi rằng owner đã duyệt một JSON mới.

## Mục tiêu

Tạo editor nội bộ trên Advertising Products để owner chỉnh trực tiếp cấu hình
12 preset WebGL, xem kết quả trên skeleton thật và xuất JSON đã chốt. Editor là
công cụ tạm thời của giai đoạn tune; public build cuối không được chứa editor.

## Contract

- Editor chỉ mount khi URL có `?skeleton-dev=1`; route bình thường không có
  panel, event listener hoặc storage write của editor.
- Mỗi preset cố định đúng bốn màu. Editor cho sửa mã màu, kéo bốn color pin,
  chỉnh ba balance band, `Scale`, `Distortion`, `Swirl`, `Speed`, `Soften` và
  `Noise`. Không thêm, xóa hoặc reorder màu.
- Thay đổi áp dụng live lên mọi skeleton đang dùng preset được chọn. Motion
  reveal/hover của card không thuộc editor.
- Draft lưu trong một local-storage key có version và có Reset về source.
  Export tạo một JSON đầy đủ, deterministic, không upload hoặc fetch ngoài.
- JSON export phải qua cùng parser/validator của renderer rồi được nạp lại như
  source config trong test; editor không có nút hoặc luồng Import.
- Query editor không thay navigation contract của `category`, `photo`, `tag`;
  serializer phải bỏ `skeleton-dev` khỏi link public được copy hoặc điều hướng.

## Removal gate trước ship

Sau khi owner duyệt JSON, implementation phải đưa cấu hình vào source rồi xóa:

1. Module, DOM, CSS và import của editor.
2. Query hook `skeleton-dev` và local-storage key.
3. Code Reset/export dành riêng cho editor.
4. Bất kỳ asset hoặc dependency chỉ phục vụ editor.

Giữ một static regression chứng minh public source/output không còn chuỗi query,
storage key hoặc selector editor. Không chỉ ẩn panel bằng CSS hoặc production
flag. Editor không được deploy.

## Nghiệm thu

- Query bật editor và preview live đủ 12 preset tại VI/EN, desktop/mobile.
- Keyboard có thể chọn preset và chỉnh slider; ring kéo bằng pointer; nhãn/value
  có accessible name. Reduced motion vẫn cho tune frame tĩnh.
- Reload khôi phục draft; Reset và export hoạt động; parser/validator chấp nhận
  JSON export và source-config reload giữ nguyên giá trị ngoài sai số số thực
  đã định trong plan.
- Sau removal gate, `pnpm prepare:site`, `pnpm qa:static` và static scan xác nhận
  public build không còn dev UI; cấu hình export vẫn chạy trong renderer.

## Ranh giới

Không thêm dependency, backend, tài khoản, upload, share link hoặc editor chung
cho toàn design system. Không sửa `.site-output/` trực tiếp. Source tạm thời vẫn
phải tuân thủ accessibility và cleanup lifecycle vì owner dùng ngay trên local.

## Lệnh dự kiến

```powershell
pnpm prepare:site
pnpm qa:static
node --test tests/site/advertising-skeleton-flow.test.mjs
node tests/site/advertising-continuation.e2e.mjs
```

## Chú thích thuật ngữ

- **Removal gate**: điều kiện bắt buộc xóa toàn bộ editor trước public build.
- **Round-trip**: JSON export được cùng parser nạp lại như source config mà
  không đổi dữ liệu có nghĩa; editor không có luồng Import.
- **Color pin**: điểm neo màu có thể kéo trong trường gradient.
