---
version: 1
slug: "route-vi-advertising-products"
primary_target: "route:/vi/advertising-products"
related_targets: ["route:/en/advertising-products"]
---

# Surface brief: Advertising browsing

## Scope

Correction hiện hành: [AD-FINAL-R1 D8–D17/C1–C5](../../docs/specs/advertising-final-polish-and-media.md)
bỏ title ảnh, chuyển gợi ý vào mô tả và ưu tiên so le từ10% chiều cao ảnh lớn
hơn trong cặp. Hàng thẳng được phép sau nhánh tìm kiếm ưu tiên, giữ N theo
viewport. Detail luôn min(3,N), chiều cao chừa50CSSpx ảnh thật ở đáy; gợi ý
Bốn mục cố định: stacked xếp ngang/wrap, split2×2 phủ ngang info theo D17;
chỉ mục active chạy chuỗi ảnh theo motion hero homepage.
D14 đặt card duy nhất ở cột4 cùng hàng khi N4/span3; miễn peek dưới primary.
N2/N3 giữ ảnh dưới và peek50px.
D13 ưu tiên cột4 khi chỉ còn hai ảnh: một ảnh bên phải, một ảnh lộ50px
dưới primary; cho lệch đáy đúng trường hợp này. Skeleton xám chuyển mềm và
lơ lửng X/Y, kết thúc cùng CTA và nhịp1–2gutter. CTA hai đoạn không eyebrow;
không còn quy trình/footer invitation riêng, vẫn giữ marquee/contact.
Mô tả v7/0,20 bên dưới chỉ là baseline lịch sử trong phạm vi bị thay.

Advertising browsing bao phủ catalogue parent ở VI và EN: identity hero, bằng chứng công trình, sáu filter nhóm, project grid responsive và đường dẫn vào từng detail. Grid và filter là strategy riêng với public marketing vì khách đang duyệt và so sánh.

## Visitor mode

**Experience**

Khách đang tìm loại sản phẩm quảng cáo gần với nhu cầu điểm bán thực tế. Surface cần làm cả sáu nhóm dễ tìm, giữ no-script fallback, reveal media khi media sẵn sàng và làm rõ detail route tiếp theo.

## Audience and job

- Đối tượng: chủ điểm bán và team đang so sánh kiosk, retail, signage, wayfinding, LED/lightbox hoặc sản phẩm in.
- Việc cần làm: quét catalogue, lọc một nhóm và xem bằng chứng công trình đáng tin.
- Hành động: chọn `all` hoặc một nhóm, scroll grid, rồi mở detail route hoặc CTA tư vấn.
- Bằng chứng: `ADVERTISING_CARDS`, category order, source media manifest và các test layout/lifecycle/media/static hiện có.

## Direction contract

**THESIS:** Làm sáu nhóm sản xuất dễ quét mà không biến công trình thành catalogue card đại trà.

**OWN-WORLD:** Vẫn là thế giới editorial paper-and-ink, với filter rail có nhịp và grid media-first giữ bằng chứng xưởng ở trung tâm.

**STORY:** Nêu năng lực quảng cáo, cho khách thu hẹp phạm vi, rồi chuyển nhóm đã chọn vào composition detail của nhóm đó.

**FIRST VIEWPORT:** Hiển thị identity của nhóm, filter state và bằng chứng công trình hợp lệ đầu tiên cùng locale và route path rõ.

**FORM:** Dùng policy một cột `compileAdvertisingProductLayout` trên kernel `compileAdvertisingLayout`, cùng `getVirtualWindow`, filter hooks, list semantics và native fallback; không sao chép layout system thứ hai.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Constraints and states

- Contract source là `compileAdvertisingProductLayout(options)`, `getVirtualWindow(layout, options)`, `mountAdvertisingCatalog(container, {signal})` và `unmountAdvertisingCatalog()`; policy public dùng kernel chung.
- Giữ all/six filters, query state, full/virtual window, media pending/loaded/revealed, dependency failure/retry, VI/EN, direct/Barba/history/remount và abort/cleanup states.
- Giữ `role=listitem`, `aria-posinset`, `aria-setsize` và sáu fallback card không cần script.
- Ảnh parent/related luôn rộng một cột theo [AD-BROWSE-R1](../../docs/specs/advertising-photo-browse.md). Source v7 giữ parent 2–4 cột; related được giảm xuống một cột sau search có giới hạn không đạt gate. Đã triển khai so le 0,20 chiều cao ảnh, cân đáy ảnh thật, skeleton CTA nối grid và control vuông. Back chỉ hiện detail, lùi entry như Pinterest; navbar vẫn về danh mục hiện tại. Nghiệm thu theo evidence P1.2, không dùng PASS v6 thay thế.
- Không thêm production token hoặc card style mới; dùng `DESIGN.md` làm visual authority toàn cục.
- Alignment với Espacio/R1 dùng measured baseline và accepted Trường Thịnh delta; exact revision hoặc cutoff chưa được khóa.

## Shared design contract

Logo và shared visual state: [DESIGN.md](../../DESIGN.md#brand-lockup--nguồn-chuẩn).
Surface brief chỉ giữ intent/composition riêng của route; không sao chép contract dùng chung.

## Provenance

- Layout catalogue: `src/site/advertising-products/layout-core.mjs:29-167`.
- Lifecycle catalogue: `src/site/advertising-products/catalog-runtime.mjs:67-71,617-621`.
- Route tĩnh: `src/site/advertising-products/index.html`.
- Test: `tests/site/advertising-products-layout.test.mjs`, `advertising-products-lifecycle.test.mjs`, `advertising-products-media.test.mjs`, `advertising-products-static.test.mjs`.
- Contract thị giác toàn cục: `DESIGN.md`.

## Chú thích thuật ngữ

- **No-script fallback**: source cards vẫn hiển thị khi JavaScript chưa chạy.
- **Virtual window**: tập item đang mount theo viewport và overscan.
- **Category order**: thứ tự nhóm được source catalog xác định.
