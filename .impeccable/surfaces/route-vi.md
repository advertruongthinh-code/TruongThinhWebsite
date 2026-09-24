---
version: 1
slug: "route-vi"
primary_target: "route:/vi"
related_targets: ["route:/en", "route:/vi/residential", "route:/en/residential", "route:/vi/commercial", "route:/en/commercial", "route:/vi/about", "route:/en/about"]
---

# Surface brief: Public marketing

## Scope

Public marketing bao phủ route home, residential, commercial và about theo locale. Surface dùng public shell, section editorial, bằng chứng công trình, quy trình và CTA liên hệ hiện có. Advertising browsing và detail có brief riêng vì filter, grid và carousel của chúng có state khác.

## Visitor mode

**Persuade**

Khách đang quyết định Trường Thịnh có thể nhận một công trình thực tế từ khảo sát đến sản xuất và lắp đặt hay không. Trang cần làm rõ năng lực sớm, sau đó cho khách chọn nhu cầu, xem bằng chứng và yêu cầu tư vấn.

## Audience and job

- Đối tượng: chủ nhà ở, đơn vị vận hành thương mại và khách đang đánh giá công ty.
- Việc cần làm: hiểu ba năng lực ngang hàng và tin vào tay nghề phía sau chúng.
- Hành động: chọn locale hoặc route dịch vụ, xem công trình, rồi dùng CTA tư vấn.
- Bằng chứng: ảnh công trình local, evidence vật liệu và xưởng, copy quy trình đã chấp nhận và địa chỉ đã xác nhận.

## Direction contract

**THESIS:** Để công trình hoàn thiện, vật liệu và bằng chứng xưởng đưa ra lập luận đầu tiên.

**OWN-WORLD:** Một hệ thống editorial public tiết chế, nơi paper, ink, khoảng trắng và chữ lớn nhường chỗ cho ảnh lên tiếng.

**STORY:** Đi từ việc Trường Thịnh làm gì, đến bằng chứng tạo tác, rồi đến bước tư vấn thực tế tiếp theo.

**FIRST VIEWPORT:** Xác lập thương hiệu, ba năng lực và một hành động tiếp theo rõ ràng mà không che locale hoặc đường dẫn điều hướng.

**FORM:** Giữ static shell hiện hành, CSS dùng chung, composition editorial theo route và tỷ lệ ảnh trong source; dùng accent tiết chế.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Constraints and states

- Giữ contract header, menu, footer, locale switch và CTA dùng chung; không tạo API `Header`, `Footer` hoặc `Shell`.
- Giữ cặp VI source copy và EN leaf copy; giữ keyboard focus, đường touch và final state của reduced motion.
- Xem chuỗi địa chỉ trụ sở là đã xác nhận; xem URL Zalo thật, năm thành lập và warranty là chưa xác minh.
- Không dùng route legacy làm target public mới, không sao chép source/media reference và không dùng khuôn mặt nhận diện chưa được duyệt.
- Khi đối chiếu Espacio/R1, dùng measured baseline và accepted Trường Thịnh delta; exact revision hoặc cutoff chưa được khóa.
- Evidence browser/parity động của brief này chưa xác minh trong lượt ghi tài liệu R1.

## Shared design contract

Logo và shared visual state: [DESIGN.md](../../DESIGN.md#brand-lockup--nguồn-chuẩn).
Surface brief chỉ giữ intent/composition riêng của route; không sao chép contract dùng chung.

## Provenance

- Contract route/content: `docs/specs/frontend-route-and-content.md`.
- Public shell và token: `src/site/style.css`, `src/site/motion.js`, HTML route locale.
- Product truth và unknown: `PRODUCT.md`.
- Hệ thống thị giác: `DESIGN.md`.

## Chú thích thuật ngữ

- **Leaf copy**: text hoặc thuộc tính song ngữ ở node cuối.
- **Proof**: bằng chứng công trình, vật liệu, xưởng hoặc quy trình đã có source.
- **Unverified**: chưa có evidence runtime đủ để kết luận.
