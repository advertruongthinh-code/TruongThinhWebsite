---
title: Hướng dẫn áp dụng thương hiệu
status: living
updated: 2026-08-24
---

# Hướng dẫn áp dụng thương hiệu

File này mô tả cách áp dụng brand xoay quanh canonical product và visual-system
record. Nó không duplicate token từ `DESIGN.md` hoặc product claim từ
`PRODUCT.md`.

## Giọng điệu

- Experienced, creative, credible, direct và concise.
- Nối kinh nghiệm craft lâu năm với năng lực design và production hiện đại.
- Ưu tiên ngôn ngữ cụ thể về vật liệu, process và outcome thay cho generic luxury
  copy.

## Áp dụng hình ảnh

- Brand mark Trường Thịnh đã duyệt dùng SVG bốn path trực tiếp với
  `viewBox="0 0 286.2 247.85"`. Header và full-menu phải dùng cùng geometry;
  không đưa lại mark tam giác `100×90` dùng `clipPath` cũ. Contract canonical ở
  `tests/site/site.e2e.cjs`.
- Mọi dạng logo phải có đủ mark, `TRƯỜNG THỊNH` và subtext
  `NỘI THẤT · QUẢNG CÁO`. Mark, copy và font size trong full-menu phải bằng
  trạng thái hero ở cùng breakpoint; trạng thái header collapsed được phép nhỏ
  hơn theo motion đã duyệt.
- Navbar desktop và tablet giữ brand, navigation và hamburger trong ba grid
  track độc lập. Từ 1200 px trở xuống, brand track là `220 px`; từ 960 px trở
  xuống, nav hai hàng dùng column gap `0`; từ 750 px trở xuống, nav ẩn và
  brand track co giãn. Clearance nhìn thấy giữa brand-nav và nav-hamburger không
  dưới `24 px`.
- Dùng blue và orange làm accent, state và chi tiết emphasis nhỏ.
- Giữ primary surface neutral để material, project và monochrome mark là tâm
  điểm thị giác.
- Ưu tiên editorial image về không gian, vật liệu, tool, craft, bàn tay hoặc
  motion blur. Không dùng recognizable face nếu chưa có exception được ghi trong
  `PRODUCT.md`.
- Không dùng fake-luxury black-and-gold, generic real-estate grid, reference media
  bị copy, watermark hoặc text giả trong image.

## Bảo vệ nội dung

- Tiếng Việt là source language; English đi kèm ở leaf/content attribute level.
- Mọi content image cần Vietnamese alt text và English `data-en-alt`.
- Không bao giờ invent Zalo URL, address, founding year hoặc warranty policy.
- Đọc `../product/CONTENT-MEDIA-GUIDE.md` trước khi đổi copy hoặc media.

## Thứ tự authority

1. Product truth do owner xác nhận trong `PRODUCT.md`.
2. Visual rule đã verify trong `DESIGN.md`.
3. Brief route-specific trong `.impeccable/surfaces/<slug>.md`.
4. Frontend spec và implementation evidence.

Khi hai source không thống nhất, source ở cấp cao hơn được ưu tiên và decision
được ghi lại trước khi tiếp tục implement.

## Chú thích thuật ngữ

- **Brand**: hệ thống nhận diện và cách thương hiệu xuất hiện.
- **Token**: giá trị thiết kế dùng chung như màu, khoảng cách hoặc typography.
- **Leaf node**: node cuối chứa text/attribute cần dịch.
- **Authority**: thứ tự ưu tiên khi nhiều nguồn cùng quy định một vấn đề.
- **Watermark**: dấu nhận diện chèn lên image hoặc media.
