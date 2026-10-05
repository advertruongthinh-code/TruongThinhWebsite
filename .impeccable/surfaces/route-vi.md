---
version: 1
slug: "route-vi"
primary_target: "route:/vi"
related_targets: ["route:/en", "route:/vi/residential", "route:/en/residential", "route:/vi/commercial", "route:/en/commercial", "route:/vi/about", "route:/en/about"]
---

# Surface brief: Public marketing

Home, Residential, Commercial, About ở VI và EN. Advertising có brief riêng.
Token, component và motion dùng chung ở [Design System](../../design-system/README.md);
route và content ở [trang chủ](../../docs/specs/page-home.md) và [ba trang con](../../docs/specs/detail-pages.md).

## Visitor mode

**Persuade.** Khách đang quyết định Trường Thịnh có nhận được một công trình
thực tế từ khảo sát đến sản xuất và lắp đặt hay không.

## Audience and job

- Đối tượng: chủ nhà ở, đơn vị vận hành thương mại, khách đang đánh giá công ty.
- Việc cần làm: hiểu ba năng lực ngang hàng và tin tay nghề phía sau.
- Hành động: chọn locale hoặc route dịch vụ, xem công trình, dùng CTA tư vấn.
- Bằng chứng: ảnh công trình, vật liệu, xưởng, quy trình và địa chỉ đã xác nhận.

## Direction contract

**THESIS:** Để công trình hoàn thiện, vật liệu và xưởng đưa ra lập luận đầu tiên.

**OWN-WORLD:** Editorial tiết chế; paper, ink, khoảng trắng và chữ lớn nhường
chỗ cho ảnh.

**STORY:** Trường Thịnh làm gì, bằng chứng tạo tác, rồi bước tư vấn tiếp theo.

**FIRST VIEWPORT:** Thương hiệu, ba năng lực và một hành động rõ; không che
locale hay điều hướng.

**FORM:** Giữ shell tĩnh, CSS dùng chung, composition editorial theo route và tỷ
lệ ảnh trong source; accent tiết chế.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Constraints

- URL Zalo thật, năm thành lập và warranty chưa xác minh
  ([PRODUCT](../../PRODUCT.md)); không dùng như dữ kiện.
- Không dùng route legacy làm target mới, không dùng khuôn mặt chưa duyệt.

## Chú thích thuật ngữ

- **Surface brief**: chiến lược riêng của một nhóm route cho Impeccable.
- **Shell**: header, menu, footer, CTA dùng chung mọi trang.
