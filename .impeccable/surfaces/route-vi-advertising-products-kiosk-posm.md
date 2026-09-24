---
version: 1
slug: "route-vi-advertising-products-kiosk-posm"
primary_target: "route:/vi/advertising-products/kiosk-posm"
related_targets: ["route:/en/advertising-products/kiosk-posm", "route:/vi/advertising-products/mobile-retail", "route:/en/advertising-products/mobile-retail", "route:/vi/advertising-products/signage-raised-letters", "route:/en/advertising-products/signage-raised-letters", "route:/vi/advertising-products/office-signs-wayfinding", "route:/en/advertising-products/office-signs-wayfinding", "route:/vi/advertising-products/led-displays-lightboxes", "route:/en/advertising-products/led-displays-lightboxes", "route:/vi/advertising-products/print-decals", "route:/en/advertising-products/print-decals"]
---

# Surface brief: Advertising detail

## Scope

Advertising detail bao phủ sáu detail route locale được generate từ một shared template. Brief neo vào `kiosk-posm` để helper có một primary target cụ thể; related target dùng cùng composition contract với category data, layout key, ordered block, source media ID và VI/EN leaf copy.

## Visitor mode

**Experience**

Khách đang đánh giá một nhóm sản phẩm quảng cáo và cần đủ context thị giác, facts để quyết định có yêu cầu khảo sát hay không. Detail surface cần cho nhóm một composition có chủ đích, giữ gallery dùng được và giữ native path khi enhancement dependency lỗi.

## Audience and job

- Đối tượng: chủ điểm bán hoặc team đang đánh giá một nhóm sản phẩm cụ thể.
- Việc cần làm: hiểu promise của nhóm, xem image sequence và nhận ra bước tư vấn tiếp theo.
- Hành động: đọc intro và facts, đi qua carousel native hoặc enhanced, rồi dùng CTA.
- Bằng chứng: `ADVERTISING_DETAIL_LAYOUTS`, shared detail template, native carousel được generate và các test detail/media hiện có.

## Direction contract

**THESIS:** Để một nhóm vừa đọc như vật thể đã làm vừa như dịch vụ thực tế, với image sequence mang bằng chứng vật liệu.

**OWN-WORLD:** Giữ hệ thống paper, ink và editorial typography của public, đồng thời để thứ tự block theo data tạo nhịp riêng cho nhóm.

**STORY:** Giới thiệu nhóm, nêu facts liên quan, cho xem công trình trong native-first gallery, rồi đưa khách về hành động tư vấn rõ ràng.

**FIRST VIEWPORT:** Xác lập title và opening statement của nhóm trước gallery block đầu tiên; giữ locale, back path và CTA khả dụng.

**FORM:** Giữ shared template, block kind, native carousel markup, progressive Swiper enhancement, cleanup và reduced-motion behavior.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Constraints and states

- Source renderer hỗ trợ `titular`, `paragraph`, `facts`, `gallery`, `single`, `double`, `columns` và `banner`; không tạo block kind khác hoặc component API theo route.
- Native carousel state phải còn trước khi dependency load và sau dependency failure; Swiper là enhancement, không phải path duy nhất.
- Giữ reduced-motion speed `0`, mount/unmount cleanup, VI/EN leaf attribute, gallery keyboard control và xử lý media error.
- Giữ sáu layout key theo data và source media ID; không sao chép source, media hoặc nội dung từ reference bên ngoài. Composition alignment dùng measured baseline và accepted Trường Thịnh delta.
- Espacio/R1 có hướng parity 1:1 đã chấp nhận ở mức strategy; exact revision hoặc cutoff chưa được khóa.
- Evidence full browser, parity, build và server chưa xác minh trong lượt ghi tài liệu này.

## Shared design contract

Logo và shared visual state: [DESIGN.md](../../DESIGN.md#brand-lockup--nguồn-chuẩn).
Surface brief chỉ giữ intent/composition riêng của route; không sao chép contract dùng chung.

## Provenance

- Shared renderer và route generation: `scripts/site/prepare-static-assets.mjs:80-154`.
- Contract layout/data: `src/site/advertising-products/catalog.mjs:174-279`.
- Lifecycle enhancement: `src/site/detail.js:151-213`.
- Tương tác native gallery: `src/site/detail.js:691-759` và `src/site/detail.css:1773-1969`.
- Test: `tests/site/advertising-products-detail-routes.test.mjs`, `advertising-products-media.test.mjs`, `tests/site/site.e2e.cjs:7246-7386`.
- Contract thị giác toàn cục: `DESIGN.md`.

## Chú thích thuật ngữ

- **Native-first**: markup và interaction cơ bản chạy trước dependency nâng cấp.
- **Block kind**: loại block được shared renderer hỗ trợ.
- **Cleanup**: dọn listener, instance và state khi route unmount.
