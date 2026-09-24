# Audit và critique hình ảnh Advertising

Ngày kiểm: 2026-09-09. Reviewer ảnh: native subagent yêu cầu `gpt-5.6-luna/max`, effective model không quan sát được. Main kiểm 115 hash nguồn, tổng điểm và coverage; spot-check độc lập bốn ảnh. Đây là hai bảng điểm của cùng reviewer, không phải hai reviewer độc lập. Kết quả này nghiệm thu assessment; chưa nghiệm thu toàn bộ pool hoặc GRID-R4.

Rubric: [nguồn chuẩn image quality](../design/advertising-image-quality.md). Evidence máy đọc và log mở ảnh: [scores.json](../../.tmp/orchestration/grid-r4-20260909-execution/full-image-audit/a/scores.json), [view evidence](../../.tmp/orchestration/grid-r4-20260909-execution/full-image-audit/a/full-resolution-view-evidence.json). Artifacts `.tmp` là local; bảng 115 dòng bên dưới giữ kết quả bền vững trong docs.

Đã mở ảnh nguồn ở full resolution bằng view_image detail=original cho **115/115 hash khác nhau**: 109 ảnh catalog thuộc sáu nhóm và 6 ảnh parent. Có **225 lượt tham chiếu nguồn đã deduplicate** theo công thức 109 detail + 109 parent-grid + 6 static parent card + 1 CTA. Parent-grid liệt kê VI/EN và filter all + category của ảnh; các context này không nhân source-reference count. Mỗi record trong scores.json có đường dẫn, kích thước, SHA-256, route usages, generated duplicate, view evidence và hai bảng điểm độc lập.

Alt canonical hiện lấy từ media-manifest.mjs:112-140: title + “ảnh minh họa AI” hoặc “AI-generated illustration”. Alt P0 cũ có claim “do Trường Thịnh thực hiện” được giữ dưới p0HistoricalAlt để truy vết, không dùng làm copy chuẩn.

Rubric chuẩn là docs/design/advertising-image-quality.md. Audit chấm 3/3/2/2; Critique chấm 3/3/2/2. Numeric score threshold chỉ yêu cầu hai tổng điểm từ 8 trở lên và không có hard reject. Publish acceptance còn yêu cầu provenance declared và verdict retain.

## Kết quả máy đọc

- Unique source hashes: **115**; catalog **109/109**; parent **6/6**.
- Full-resolution view evidence: **115** record, **115** unique hash.
- Generated duplicate: missing **0**, khác hash **0**.
- Numeric score threshold: **87**; trong đó provenance declared **81**. Đây không phải publish approval.
- Publish acceptance retain: **70**; hard reject **16**; parent scope-checked-unverified **6**.

| Nhóm | Ảnh | Numeric | Numeric + provenance | Publish retain | Rework | Replace | Unverified |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| kiosk-posm | 24 | 17 | 17 | 14 | 9 | 1 | 0 |
| mobile-retail | 16 | 13 | 13 | 12 | 4 | 0 | 0 |
| signage-raised-letters | 22 | 11 | 11 | 9 | 4 | 9 | 0 |
| office-signs-wayfinding | 13 | 7 | 7 | 7 | 1 | 5 | 0 |
| led-displays-lightboxes | 18 | 18 | 18 | 14 | 4 | 0 | 0 |
| print-decals | 16 | 15 | 15 | 14 | 1 | 1 | 0 |
| advertising parent | 6 | 6 | 0 | 0 | 0 | 0 | 6 |

## Delta sau main review

- Snapshot giữ nguyên: scores.pre-review-correction.json. Đã canonicalize alt cho **109** catalog records, thêm parent-grid usage cho **109** records, đổi routeUsageCount **116 → 225**, và rà lại styleGuideTruthfulness cho **39** record replace/rework.
- 16 hard reject giữ nguyên vì claim sai loại. Style truthfulness không còn tự động 2/2 ở record claim sai hoặc thiếu; các score và visible reason đầy đủ nằm trong scores.json.correctionDelta và bảng 115 dòng dưới đây.
- Parent provenance chuyển thành scope-checked-unverified: đã tìm exact path trong docs, research, src/site và scripts; chỉ thấy HTML parent và tên copy legacy, không thấy sourceId/media registry record bổ sung. Đây là giới hạn phạm vi tìm kiếm, không phải kết luận provenance dự án không tồn tại.

## Findings cần xử lý

- Hard reject do claim không khớp ảnh: kiosk-posm-12, signage-raised-letters-02, signage-raised-letters-03, signage-raised-letters-06, signage-raised-letters-07, signage-raised-letters-08, signage-raised-letters-14, signage-raised-letters-18, signage-raised-letters-19, signage-raised-letters-20, office-signs-wayfinding-01, office-signs-wayfinding-02, office-signs-wayfinding-03, office-signs-wayfinding-08, office-signs-wayfinding-13, print-decals-02. Nhóm chính là chữ nổi chỉ có hình học, pano/billboard chỉ là ốp kiến trúc, biển số nhà/tên đường/biển phòng thiếu thông tin tương ứng, kiosk-posm-12 và print-decals-02 sai loại vật phẩm.
- Rework do thiếu customer context hoặc crop: kiosk-posm-06, kiosk-posm-07, kiosk-posm-08, kiosk-posm-11, kiosk-posm-16, kiosk-posm-18, kiosk-posm-19, kiosk-posm-20, kiosk-posm-23, mobile-retail-05, mobile-retail-06, mobile-retail-11, mobile-retail-16, signage-raised-letters-09, signage-raised-letters-13, signage-raised-letters-15, signage-raised-letters-21, office-signs-wayfinding-11, led-displays-lightboxes-08, led-displays-lightboxes-09, led-displays-lightboxes-14, led-displays-lightboxes-18, print-decals-14.
- Không thấy mặt người nhận diện được, logo thương hiệu sao chép hoặc watermark trong các ảnh đã mở. Mặt trống vẫn bị trừ khi caption yêu cầu chữ, số, tên đường, campaign hoặc nội dung khách hàng.
- 109 sourceId imagegen hiện có là source hiện hữu; yêu cầu Image 2.5 chỉ áp dụng ảnh tạo mới, không dùng làm lỗi hồi tố.

## Checklist và bằng chứng quy trình

- Đã đọc toàn bộ AGENTS.md, docs/STATE.md, docs/operations/agent-rule-core.md, agent-rule-product-ui.md, agent-rule-workflow-tools.md, agent-rule-evidence-qa-handoff.md.
- Đã đọc toàn bộ docs/design/advertising-image-quality.md, docs/design/content.md, docs/design/style-guide.md, PRODUCT.md, DESIGN.md, .impeccable/surfaces/route-vi-advertising-products.md và .impeccable/surfaces/route-vi-advertising-products-kiosk-posm.md.
- Đã đọc using-agent-skills, i-have-adhd, caveman, ponytail, impeccable và reference audit.md, critique.md, craft-floor.md. Impeccable detect do main chạy trước; không chạy hook/install lại.
- Graphify đã chạy narrow query qua scripts/tooling/invoke-graphify.ps1 -SkipAstRefresh. Serena đã xác nhận ADVERTISING_MEDIA_MANIFEST, ADVERTISING_DETAIL_LAYOUTS và mountAdvertisingCatalog. Semantic index không refresh.
- src/site và .site-output hash khớp cho 109 catalog và 6 parent. Source mở một lần theo hash; generated duplicate chỉ xác nhận byte-identical.
- View log đầy đủ ở full-resolution-view-evidence.json; mỗi entry ghi sequence, id, absolute source file, source path, SHA-256, tool và detail=original.

## Omitted và unverified

- Header brand SVG/icons bị loại khỏi media audit vì là UI branding.
- /assets/content/projects/home-advertising-products-table.webp chỉ dùng trên homepage, ngoài parent và sáu child route nên không tính vào 115 hash.
- Không có catalog image bị bỏ qua. Parent đủ 6 ảnh nhưng thiếu sourceId; sau narrow provenance search cả 6 giữ trạng thái scope-checked-unverified.

## Bảng đầy đủ 115 ảnh

Path link trong bảng được tính tương đối từ tài liệu đích docs/verification/advertising-images-audit-2026-09-09.md.

| ID / path | Dimensions | SHA-256 đầy đủ | Audit (3/3/2/2) | Critique (3/3/2/2) | Verdict | Visible finding / repair |
| --- | ---: | --- | ---: | ---: | --- | --- |
| [kiosk-posm-01](../../src/site/assets/content/projects/advertising/kiosk-posm/kiosk-posm-01-exhibition-booths.webp) | 1672x941 | 5764c0227c409b4b58e4b9cbfb75b7132acf70217403aea77d73fad44ea9b5fd | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Toàn cảnh booth triển lãm gỗ và trắng trong đại sảnh; quầy trung tâm, kệ và đèn hắt nhìn đủ toàn bộ kết cấu; không thấy mặt người, logo hay chữ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [kiosk-posm-02](../../src/site/assets/content/projects/advertising/kiosk-posm/kiosk-posm-02-product-display-counters-and-shelving.webp) | 1448x1086 | 96bd66f9bc9e157cdf2ffa096156fbb9891c008f19d58e33aa71735759c2e988 | 10 (3/3/2/2) | 9 (3/3/2/1) | retain | Quầy trước gạch và hệ kệ kính có đèn, đặt trong không gian showroom; toàn bộ quầy và kệ hiện rõ nhưng hàng hóa đều để trống. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [kiosk-posm-03](../../src/site/assets/content/projects/advertising/kiosk-posm/kiosk-posm-03-custom-display-cabinets.webp) | 1774x887 | 28b9e457f495754aa0c8e4e20448851136696a0776fd3ea3114ad6cec4fda828 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Tủ kính dài có đế gỗ phay rãnh và đầu bo cong trong sảnh; thân, mặt kính và chân tủ đều nhìn rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [kiosk-posm-04](../../src/site/assets/content/projects/advertising/kiosk-posm/kiosk-posm-04-custom-display-shelving.webp) | 1536x1024 | c4e79e6e3066c7de2110544ef0ba04a326e65a0c8598785898fa813f219fb709 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Đảo trưng bày độc lập ba phần với đế đá, kệ gỗ và đồ gốm trong mặt bằng bán hàng; góc nhìn cao vẫn cho thấy đủ khối. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [kiosk-posm-05](../../src/site/assets/content/projects/advertising/kiosk-posm/kiosk-posm-05-shopping-centre-retail-kiosks.webp) | 1402x1122 | e8091e894fce96e28c392a8e1582446f944fc81b18d1c1ab8d824ee427b2c1e2 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Kiosk đá sáng hoàn chỉnh dưới thang cuốn trung tâm thương mại; quầy, mái và kệ đều nằm trong khung; không có nhận diện thương hiệu. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [kiosk-posm-06](../../src/site/assets/content/projects/advertising/kiosk-posm/kiosk-posm-06-brand-activation-kiosks.webp) | 1254x1254 | c62eb0730345cfc3f58a005776767355eb671342d69c9cc272232482ecde7f74 | 9 (2/3/2/2) | 7 (3/2/1/1) | rework | Kiosk mở màu tối và vàng ấm với kệ và quầy trong nội thất; hình cho thấy một fixture bán lẻ hoàn chỉnh nhưng không có dấu hiệu activation, chiến dịch hay thương hiệu. Repair: Thêm một ảnh có sản phẩm, POSM rời hoặc nhận diện chiến dịch và góc phục vụ để chứng minh activation. |
| [kiosk-posm-07](../../src/site/assets/content/projects/advertising/kiosk-posm/kiosk-posm-07-sampling-counters.webp) | 1086x1448 | a9a8598b26daf5d1f664fd141b50d05497d6d2b74785fd528c45b7ee90ee10b3 | 9 (2/3/2/2) | 7 (2/3/1/1) | rework | Quầy độc lập có mái, tầng kệ, cốc và hộp trống trong showroom; toàn bộ khối nhìn rõ nhưng chưa thấy hoạt động sampling hay người dùng. Repair: Bổ sung mẫu thử thật trên mặt quầy hoặc cảnh khách nhận mẫu; giữ toàn bộ quầy và header trong khung. |
| [kiosk-posm-08](../../src/site/assets/content/projects/advertising/kiosk-posm/kiosk-posm-08-event-reception-counters.webp) | 1254x1254 | c8c63c5a9a15370eb1be0b8b65b143d822a9a4040e81623bd55151e3328cbf58 | 9 (2/3/2/2) | 7 (2/3/1/1) | rework | Quầy cong phay rãnh nhìn từ trên với hai hộp trống và hoa; kết cấu đủ nhưng bối cảnh sự kiện hoặc tiếp tân không hiện diện. Repair: Chụp ngang tầm mắt trong bối cảnh sảnh sự kiện, có lễ tân hoặc vật dụng vận hành; tránh góc nhìn từ trên. |
| [kiosk-posm-09](../../src/site/assets/content/projects/advertising/kiosk-posm/kiosk-posm-09-product-display-plinths.webp) | 941x1672 | 5b1dcde700c269f781f074bc0e72fd4e4c9438fb6d99b1a6edd1c35c54b36857 | 10 (3/3/2/2) | 9 (2/3/2/2) | retain | Các bục đá có đồ gốm trong phòng cao cấp; hai bục chính rõ, bục thấp góc trái bị cắt nhẹ ở mép ảnh. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [kiosk-posm-10](../../src/site/assets/content/projects/advertising/kiosk-posm/kiosk-posm-10-island-displays.webp) | 1024x1536 | 75e529fe4cb5c84f13e13b496d45ab9396d5a597022529f1c1dc63487ff72e9c | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Đảo cao có đế cong, bàn giữa và kệ trong cửa hàng; nhìn đủ toàn bộ cấu trúc và khoảng phục vụ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [kiosk-posm-11](../../src/site/assets/content/projects/advertising/kiosk-posm/kiosk-posm-11-branded-display-walls.webp) | 1122x1402 | 36e7c30a29addda88a1bd707fad389bb3eda3e6cf833193c66f707d204902270 | 9 (2/3/2/2) | 8 (3/3/1/1) | rework | Vách kệ âm tường đá và gỗ với mỹ phẩm trống trong showroom; kết cấu rõ nhưng không có thành phần nhận diện thương hiệu. Repair: Bổ sung panel nhận diện hoặc hàng hóa có ngữ cảnh để chứng minh branded display wall. |
| [kiosk-posm-12](../../src/site/assets/content/projects/advertising/kiosk-posm/kiosk-posm-12-campaign-posm-sets.webp) | 1196x1315 | 1f7bcee4ee2577ae6e2ad7537e532737e61350287648bec206bc9a2d3a80633c | 7 (1/2/2/2) | 5 (2/2/0/1) | replace | Một cụm kệ và bục đá cố định với tuýp, hộp và đèn rọi; không thấy bộ POSM theo chiến dịch, bộ nhận diện hoặc chuỗi vật phẩm rời. Repair: Thay bằng bộ POSM theo chiến dịch gồm nhiều vật phẩm rời, mặt nhận diện và bố trí tại điểm bán; không dùng một kệ cố định. |
| [kiosk-posm-13](../../src/site/assets/content/projects/advertising/kiosk-posm/kiosk-posm-13-exhibition-booths.webp) | 1536x1024 | 12a7720333d894c728cc6b441cb15854a6997bf9ec774b1e9f9640159b3cda8b | 10 (3/3/2/2) | 9 (3/3/2/1) | retain | Fixture dạng booth có mái cong, rèm và kệ trong sảnh sáng; toàn bộ khung đứng rõ nhưng không có dấu hiệu hội chợ hoặc copy thương hiệu. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [kiosk-posm-14](../../src/site/assets/content/projects/advertising/kiosk-posm/kiosk-posm-14-product-display-counters-and-shelving.webp) | 1402x1122 | 50f6bb2c922f85b9638c95aee4260da8c3a6f6a89a1fd6f6d761eac0d28e7cc3 | 10 (3/3/2/2) | 9 (3/3/2/1) | retain | Vách kệ đá và gỗ cùng quầy giữa, đặt trong showroom; đủ toàn bộ fixture và các mặt kệ trống. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [kiosk-posm-15](../../src/site/assets/content/projects/advertising/kiosk-posm/kiosk-posm-15-custom-display-cabinets.webp) | 1254x1254 | bdf8e5a990e660d3c652bb766c8dafeb6ef1d839550f8da6a270dea2d70a4d63 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Tủ đảo dài có cánh mở, hộc, mặt bàn và vách ngăn; bản lề, cánh mở và toàn khối nhìn hợp lý trong showroom ban ngày. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [kiosk-posm-16](../../src/site/assets/content/projects/advertising/kiosk-posm/kiosk-posm-16-custom-display-shelving.webp) | 1086x1448 | 0878a870ef2052d8d9f4ac8ad7a3000e8e873f6cd476010c0fe50ab2b0986970 | 9 (3/3/2/1) | 8 (2/3/2/1) | rework | Hệ kệ tường với cột gạch cam và đồ gốm trong cửa hàng; phần phải của hệ kệ tiếp tục ra ngoài mép ảnh. Repair: Chụp lại toàn bộ chiều dài hệ kệ, tránh cắt mép phải và thêm ngữ cảnh điểm bán. |
| [kiosk-posm-17](../../src/site/assets/content/projects/advertising/kiosk-posm/kiosk-posm-17-shopping-centre-retail-kiosks.webp) | 1254x1254 | 365137e6e71f776bb7474ddff3b02a9bfcba03e5b6666e843796a04dea5e13cb | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Kiosk đá sáng có mái đèn LED dạng sóng dưới thang cuốn; toàn bộ kiosk và bối cảnh mall rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [kiosk-posm-18](../../src/site/assets/content/projects/advertising/kiosk-posm/kiosk-posm-18-brand-activation-kiosks.webp) | 941x1672 | 2a75eb8a74fb4962a163df23f7505c91d9da65cb056bf05749c571ceddf9772f | 8 (2/3/2/1) | 6 (2/2/1/1) | rework | Khung kiosk cong rỗng với hai kệ và mặt bàn trong showroom; không có hàng hóa, nhận diện, chiến dịch hay ngữ cảnh activation. Repair: Bổ sung hàng hóa, key visual hoặc người dùng tại điểm activation; ảnh hiện tại chỉ chứng minh khung kiosk. |
| [kiosk-posm-19](../../src/site/assets/content/projects/advertising/kiosk-posm/kiosk-posm-19-sampling-counters.webp) | 1024x1536 | 2383dd0f6867eb686a8c8c4950f03350aaf59e9a3a2ef5c96886150a869c3921 | 8 (2/3/2/1) | 6 (2/2/1/1) | rework | Quầy sampling cao có header trống, bục và cây trong bối cảnh ngoài nhà; kết cấu đủ nhưng không có mẫu thử, sản phẩm hay người. Repair: Bổ sung mẫu thử/sản phẩm và một dấu hiệu vận hành ngoài trời; giữ header và caster rõ. |
| [kiosk-posm-20](../../src/site/assets/content/projects/advertising/kiosk-posm/kiosk-posm-20-event-reception-counters.webp) | 1122x1402 | 512ed9cc7f111951a3794c99597e28f1690438fdb22133dba703897a3299846c | 8 (2/3/2/1) | 6 (2/2/1/1) | rework | Quầy cong phay rãnh với kệ tường và đồ trang trí trong showroom; nhìn giống quầy fixture cố định hơn quầy lễ tân sự kiện. Repair: Thay bằng quầy ở sảnh sự kiện có người tiếp tân hoặc dấu hiệu check-in, không chỉ là fixture showroom. |
| [kiosk-posm-21](../../src/site/assets/content/projects/advertising/kiosk-posm/kiosk-posm-21-product-display-plinths.webp) | 1196x1315 | 57057ded04dc62bd922d2c738f9b7b2418be81f0473634d0596e0288101c50dc | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Cụm bục đá nhiều cao độ với đồ gốm, kệ và đèn track trong showroom; toàn bộ cụm trưng bày hiện rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [kiosk-posm-22](../../src/site/assets/content/projects/advertising/kiosk-posm/kiosk-posm-22-island-displays.webp) | 1672x941 | c1d6f026c35d70b19be86c87c19f86bc692a92bc26622993851495ee7beb4155 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Đảo oval lớn có quầy và chai sản phẩm trong showroom; toàn bộ đảo và khoảng đứng nhìn rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [kiosk-posm-23](../../src/site/assets/content/projects/advertising/kiosk-posm/kiosk-posm-23-branded-display-walls.webp) | 1448x1086 | c88b0237d6edf521f27458baa61dd65cb3e583029c1bc9b623b9555fd901a248 | 8 (2/3/2/1) | 8 (3/3/1/1) | rework | Vách kệ âm tường và đảo giữa với sản phẩm trống; fixture đầy đủ nhưng không có nhận diện thương hiệu nhìn thấy. Repair: Bổ sung logo/nhận diện hợp lệ hoặc sản phẩm đang trưng bày để chứng minh branded wall. |
| [kiosk-posm-24](../../src/site/assets/content/projects/advertising/kiosk-posm/kiosk-posm-24-campaign-posm-sets.webp) | 1774x887 | cb6452f8b4936374198ddb2da76b7c1ebae5ae555cc2dec0dcae7c4abe24f072 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Cụm bục nhiều tầng và vật thể sản phẩm trống trong retail; bố cục theo bộ chiến dịch và toàn bộ set nhìn rõ dù không có logo. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [mobile-retail-01](../../src/site/assets/content/projects/advertising/mobile-retail/mobile-retail-01-mobile-retail-carts.webp) | 1672x941 | 6726d21b042a4e3af2d1835fc4bb1a0a6ffa5da07feffc2910f47713d9974c18 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Xe kéo bán hàng xanh đen có bánh, mái cong và mặt inox trong sân có mái che; toàn bộ bánh, mái và khoang thao tác rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [mobile-retail-02](../../src/site/assets/content/projects/advertising/mobile-retail/mobile-retail-02-mobile-coffee-carts.webp) | 1448x1086 | 41d977cab979f52502b9ca3114a86c1ef1717327514d73be9afd73ced39d20c7 | 10 (3/3/2/2) | 9 (3/3/2/1) | retain | Xe cà phê gỗ đen có máy espresso, cối xay, cốc, bánh và mái; bánh lớn cùng caster nhìn thấy, kết cấu giống cart cố định. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [mobile-retail-03](../../src/site/assets/content/projects/advertising/mobile-retail/mobile-retail-03-mobile-food-carts.webp) | 1774x887 | 58ffc8cf5b9d2cfce13466604ddc02dec561754d367a41b684a8c3cc51361baf | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Xe thức ăn đen cam có mái, tủ kính hâm và khoang inox trong mặt tiền có mái; bánh và caster hiện rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [mobile-retail-04](../../src/site/assets/content/projects/advertising/mobile-retail/mobile-retail-04-mobile-sampling-counters.webp) | 1536x1024 | d1278c99ee992ecba38c49d739d4f65e683e7abe5d9d8a2cb1c5ef6e8ff04d69 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Quầy trắng có bánh, mái gập, chậu, tủ và cánh bên trong không gian ngoài trời; góc cao vẫn cho thấy phần cứng. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [mobile-retail-05](../../src/site/assets/content/projects/advertising/mobile-retail/mobile-retail-05-event-retail-counters.webp) | 1402x1122 | 3a32bf79dcfeaa03904887bf226824675454f5f5dfa7f0cc99e6977c4c956b52 | 9 (3/3/2/1) | 8 (3/3/1/1) | rework | Xe khung đen có mái, mặt phục vụ, chậu, kính và bốn caster trong sân cây; không có dấu hiệu sự kiện hoặc món hàng. Repair: Thêm món hàng và dấu hiệu sự kiện hoặc khách hàng; giữ bốn caster và mặt phục vụ. |
| [mobile-retail-06](../../src/site/assets/content/projects/advertising/mobile-retail/mobile-retail-06-mobile-pop-up-counters.webp) | 1254x1254 | 6eb9c4cd8474784c2974d8021111e499f4d15e893bd02bbbf753065045b281dd | 9 (3/3/2/1) | 7 (2/3/1/1) | rework | Quầy gỗ đen có mái gập, kệ bên và caster trong nội thất; kết cấu hợp lý nhưng không có hàng hóa hay ngữ cảnh pop-up. Repair: Bổ sung hàng hóa, signage pop-up và cảnh vận hành; giữ mái gập và caster. |
| [mobile-retail-07](../../src/site/assets/content/projects/advertising/mobile-retail/mobile-retail-07-mobile-product-display-carts.webp) | 1086x1448 | ece9ab60e8acc91931225c565fce0681a793544921ff0c8a67c63228339da0a8 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Xe gỗ đen lớn có mái, kệ, tay đẩy, hai bánh và caster tại lối vào showroom; toàn bộ khối di động rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [mobile-retail-08](../../src/site/assets/content/projects/advertising/mobile-retail/mobile-retail-08-folding-retail-counters.webp) | 1254x1254 | e722151dcb35f6749e439e142f6c56f6e832592216e0324c561a216522ecd786 | 10 (3/3/2/2) | 9 (3/3/2/1) | retain | Quầy gập mở nhìn từ trên với hai cánh, chậu, tủ, bản lề và bánh nhỏ; bằng chứng gập được rõ nhưng góc nhìn làm giảm cảm giác bán hàng. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [mobile-retail-09](../../src/site/assets/content/projects/advertising/mobile-retail/mobile-retail-09-outdoor-retail-counters.webp) | 941x1672 | 55e2692d157d5e32de9680e0249bfbea5cb149e863bee568de9af16821ae349b | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Xe trắng gỗ có tủ kính, mái và bốn caster trên nền lát ngoài trời; toàn bộ xe rõ nhưng không có sản phẩm trưng bày. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [mobile-retail-10](../../src/site/assets/content/projects/advertising/mobile-retail/mobile-retail-10-mobile-beverage-counters.webp) | 1024x1536 | 9678a572f990050e5af2dbeca319d8b10a8f7f00afb7b965021120f4ef5ef6f6 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Xe pha chế gỗ đen có máy, chậu, mặt thao tác, hai cánh mở và bốn caster ở hiên nhà hàng; bối cảnh sử dụng rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [mobile-retail-11](../../src/site/assets/content/projects/advertising/mobile-retail/mobile-retail-11-brand-led-retail-counters.webp) | 1122x1402 | 917eaf92799883dffd37097cdd06bb08b19fc7152e81c2e7e82d39c22a38fc68 | 9 (3/3/2/1) | 7 (2/3/1/1) | rework | Xe lớn phủ bề mặt gạch/đá có mái, quầy, tủ kính và bốn caster; kết cấu hợp lý nhưng không có nhận diện, sản phẩm hay bảng hiệu. Repair: Bổ sung nhận diện và hàng hóa tại điểm bán; không đổi cấu trúc xe. |
| [mobile-retail-12](../../src/site/assets/content/projects/advertising/mobile-retail/mobile-retail-12-custom-mobile-retail-carts.webp) | 1196x1315 | ab3886603cfe162f9aaf3e8f6e811cbb57b763d862102cf24b79ff7bf506818b | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Xe gỗ đen có kệ, hai bàn gập bên, cánh tủ và bốn caster trong hành lang có mái; phần cứng và khoang chứa nhìn rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [mobile-retail-13](../../src/site/assets/content/projects/advertising/mobile-retail/mobile-retail-13-mobile-retail-carts.webp) | 1536x1024 | 80ca2e12a1e8f565bf4817c16cc31616c5a0e28ca3982f28dc432db11f226f5a | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Xe inox/đá có tủ kính, mái bản lề và bốn caster tại khách sạn ngoài trời; toàn bộ xe và mặt thao tác rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [mobile-retail-14](../../src/site/assets/content/projects/advertising/mobile-retail/mobile-retail-14-mobile-coffee-carts.webp) | 1402x1122 | 9494eb8fa9556af11cdcb25fcb3fd5874876a6340a6a7aa546ac5bc4b7d4319f | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Xe cà phê gỗ đen có máy espresso, cối xay, chậu, mái bản lề, kệ bên và bốn caster; cấu hình pha chế nhìn rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [mobile-retail-15](../../src/site/assets/content/projects/advertising/mobile-retail/mobile-retail-15-mobile-food-carts.webp) | 1254x1254 | a6827b9b181c8e0791bfae5ff5124258f4e9250badef684666110ba846527ad2 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Xe thức ăn đen be với kính, cửa phục vụ, bánh lớn và khoang sau trong bối cảnh ngoài trời; toàn bộ xe nhìn rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [mobile-retail-16](../../src/site/assets/content/projects/advertising/mobile-retail/mobile-retail-16-mobile-sampling-counters.webp) | 1086x1448 | 5070f9cb103b53500ec6ec475b7c5be68c8103f19277fe40c728fc11fbcccdb4 | 9 (3/3/2/1) | 7 (2/3/1/1) | rework | Quầy sampling có header trống, mặt cong phay rãnh và bốn caster trước nhà hàng; hình cho thấy quầy nhưng chưa có mẫu, người hay nhận diện. Repair: Bổ sung mẫu thử, hàng hóa hoặc người vận hành để chứng minh sampling. |
| [signage-raised-letters-01](../../src/site/assets/content/projects/advertising/signage-raised-letters/signage-raised-letters-01-aluminium-composite-facades.webp) | 1672x941 | dbcb4181c663e830adb22c0563e27904e7692b8085d4a97cc5a73ba5c0c7e339 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Mặt dựng nhôm tối hoàn chỉnh của tòa nhà với mối nối tấm, góc cong và đèn tuyến tính; không thấy chữ nổi. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [signage-raised-letters-02](../../src/site/assets/content/projects/advertising/signage-raised-letters/signage-raised-letters-02-large-outdoor-advertising-panels.webp) | 1448x1086 | f5a6a24c8190b7d2ae7e7dd4689fc18423f87e4152163c1f43e409aa170021ab | 8 (2/2/2/2) | 5 (2/2/0/1) | replace | Tấm lớn ngoài trời có mặt vân gạch/đá, khung và giàn đỡ; mặt trống không cho thấy bạt in hay nội dung quảng cáo. Repair: Thay bằng pano bạt in trên khung sắt hoặc pano tấm có mặt quảng cáo rõ, kèm mép và chân đỡ. |
| [signage-raised-letters-03](../../src/site/assets/content/projects/advertising/signage-raised-letters/signage-raised-letters-03-large-format-outdoor-signs.webp) | 1774x887 | e8bd252f01b0a90c02cfdf4725b10987e6fa21ebf09d5c4bfb37d5e25be023f5 | 7 (1/2/2/2) | 5 (2/2/0/1) | replace | Mảng tường kiến trúc lớn có gợn sáng và khung; trông như ốp/cladding hơn bảng quảng cáo tấm lớn và không có copy. Repair: Thay bằng bảng quảng cáo tấm lớn có mặt hiển thị, khung và bối cảnh ngoài trời; tránh ảnh ốp kiến trúc trống. |
| [signage-raised-letters-04](../../src/site/assets/content/projects/advertising/signage-raised-letters/signage-raised-letters-04-hiflex-fabric-light-boxes.webp) | 1536x1024 | 981b0dacc837b3c76ea35c1e9103c0cf42dbd10d6a2b232f1e430d152e01cde1 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Hộp đèn cong trong xưởng với mặt bạt trắng, khung đen, chân đỡ và dải mặt nhạt; không có chữ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [signage-raised-letters-05](../../src/site/assets/content/projects/advertising/signage-raised-letters/signage-raised-letters-05-premium-3m-fabric-light-boxes.webp) | 1402x1122 | 7b1a5da2df6d3d4e4fb58e148114eed67a1b9833023ca543be0698f17099d9e7 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Hộp đèn chữ nhật gắn tường nhìn gần; mặt trắng trống, khung đen, bracket và bu-lông đều rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [signage-raised-letters-06](../../src/site/assets/content/projects/advertising/signage-raised-letters/signage-raised-letters-06-halo-lit-stainless-steel-letters.webp) | 1254x1254 | e200c98efea51d61c1b22912abc5f1ce981de63fe646546b60e4653abda12f6a | 7 (1/2/2/2) | 6 (2/3/0/1) | replace | Các hình học inox tròn, vuông, mũi tên và tam giác phát halo trên tường; không có chữ hoặc từ nổi. Repair: Thay bằng chữ Inox thật có ký tự đọc được, cạnh chữ, chân sáng và điểm lắp. |
| [signage-raised-letters-07](../../src/site/assets/content/projects/advertising/signage-raised-letters/signage-raised-letters-07-acrylic-dimensional-letters.webp) | 1086x1448 | 7959f5cb7b5d504cf726b66fff8b7d346d0ce32e1b1757000e604e8111469af6 | 7 (1/2/2/2) | 6 (2/3/0/1) | replace | Các mảng acrylic hình học có mũi tên và chữ nhật phát sáng trên tường; không phải bộ chữ cái nhìn thấy. Repair: Thay bằng bộ chữ Mica thật có ký tự đọc được, cạnh acrylic và chân/halo. |
| [signage-raised-letters-08](../../src/site/assets/content/projects/advertising/signage-raised-letters/signage-raised-letters-08-aluminium-and-foam-dimensional-letters.webp) | 1254x1254 | ba36d1450bcd90afab2a300935077008ee0a007338d13daf90c82e4cf66a604b | 7 (1/2/2/2) | 6 (2/3/0/1) | replace | Các mảng Alu/Format hình học có halo trên tường gạch; mặt và điểm lắp rõ nhưng không có ký tự. Repair: Thay bằng chữ Alu/Format thật có ký tự, độ dày, cạnh cắt và điểm lắp. |
| [signage-raised-letters-09](../../src/site/assets/content/projects/advertising/signage-raised-letters/signage-raised-letters-09-building-logos-and-dimensional-lettering.webp) | 941x1672 | 77e50498a16a8fb986dc96db175e64928fb2fd3c56a20b5dab3300df8f882931 | 10 (3/3/2/2) | 9 (3/3/2/1) | rework | Logo vàng nổi và phần chữ trên mặt dựng tòa nhà nhìn xiên; độ dày, cạnh và halo rõ, phần từ bên phải bị cắt nhẹ. Repair: Chụp lại đủ toàn bộ từ/logo, tránh cắt từ bên phải và giữ góc cho thấy chân chữ. |
| [signage-raised-letters-10](../../src/site/assets/content/projects/advertising/signage-raised-letters/signage-raised-letters-10-vacuum-formed-acrylic-projecting-signs.webp) | 1024x1536 | e4263b4799e93b9aaf3a3c8881ebdfe42eafe14df16edbc080943a0b9fa1d563 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Bảng vẫy dạng hộp vuông bo góc nhô khỏi tường, có bracket và mặt sáng trống; kết cấu lắp đặt rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [signage-raised-letters-11](../../src/site/assets/content/projects/advertising/signage-raised-letters/signage-raised-letters-11-animated-led-projecting-signs.webp) | 1122x1402 | 6489e1dae943682f4a79c5245f9706dde93f0d27c9a962d2a0a0a9fb9a9a7da7 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Hộp vẫy đen với hàng chấm LED thấy rõ ở mặt bên, tay đỡ và mặt trước trống; bằng chứng ma trận điểm tốt. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [signage-raised-letters-12](../../src/site/assets/content/projects/advertising/signage-raised-letters/signage-raised-letters-12-stainless-steel-and-hiflex-projecting-signs.webp) | 1196x1315 | cded8ba0f45e6868b253685eefae1417d63f48417e87603559913d2859cf7f9f | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Bảng vẫy cạnh kim loại bo góc với mặt xuyên sáng, cung hình học và bracket đen có bu-lông; đủ chi tiết lắp. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [signage-raised-letters-13](../../src/site/assets/content/projects/advertising/signage-raised-letters/signage-raised-letters-13-aluminium-composite-facades.webp) | 1536x1024 | 9a270db93c644d69be3cd1cc02786e6fa6bb64cd7e772a2b072f8ea643dc9b05 | 10 (3/3/2/2) | 7 (2/3/1/1) | rework | Cận cảnh tấm mặt dựng nhôm có đường nối và các thanh đen nâu hắt sáng; không thấy chữ, nhưng cấu tạo tấm rõ. Repair: Bổ sung chữ hoặc chi tiết mặt dựng có chức năng signage để ảnh không chỉ là thanh trang trí. |
| [signage-raised-letters-14](../../src/site/assets/content/projects/advertising/signage-raised-letters/signage-raised-letters-14-large-outdoor-advertising-panels.webp) | 1402x1122 | 8606fe0783f659453e3b716db9de106ea9212ed59ba05055f1441aac69eee00c | 7 (1/2/2/2) | 5 (2/2/0/1) | replace | Mảng tấm dạng nan/đá lớn trên khung thép và chân trong xưởng; không thấy bạt in hay mặt quảng cáo. Repair: Thay bằng pano bạt hoặc mặt pano in đúng vật liệu, có nội dung và khung sắt. |
| [signage-raised-letters-15](../../src/site/assets/content/projects/advertising/signage-raised-letters/signage-raised-letters-15-large-format-outdoor-signs.webp) | 1254x1254 | ea0384fb24a3767acb1d73892eeb7e1c51a7c92766122ecd07c132ce0b61e589 | 9 (2/3/2/2) | 7 (2/3/1/1) | rework | Mặt sau billboard với khung, giằng, dây và đèn pha; mặt hiển thị khách hàng không xuất hiện. Repair: Thêm một góc mặt trước có nội dung và một góc tổng thể ngoài trời; ảnh sau lưng chỉ là bằng chứng thi công. |
| [signage-raised-letters-16](../../src/site/assets/content/projects/advertising/signage-raised-letters/signage-raised-letters-16-hiflex-fabric-light-boxes.webp) | 1086x1448 | 0dd6511ed49bc0895b60018a2a9e968ab1cb8ce196954d0cb044593a1cd5489c | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Hàng hộp đèn bạt trong xưởng với mặt hình học trống, khung và bracket; bằng chứng sản xuất/lắp đặt rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [signage-raised-letters-17](../../src/site/assets/content/projects/advertising/signage-raised-letters/signage-raised-letters-17-premium-3m-fabric-light-boxes.webp) | 1254x1254 | dc86598bfb183b51b3bf2066b5c49bf495c31a3474081e1575d20101c10dcbfb | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Cận cảnh hộp đèn mỏng gắn tường với khung xám đen, cạnh, vít và mặt hình học trống. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [signage-raised-letters-18](../../src/site/assets/content/projects/advertising/signage-raised-letters/signage-raised-letters-18-halo-lit-stainless-steel-letters.webp) | 941x1672 | e3de51cc50667b0c112337a1cc2491af2277e3ba4e5b483deaaa294b91971b00 | 7 (1/2/2/2) | 6 (2/3/0/1) | replace | Tấm dọc gồm inox hình mũi tên, vòng, vuông và tam giác phát halo; không có chữ cái. Repair: Thay bằng chữ Inox có ký tự thật, chân sáng và nền công trình. |
| [signage-raised-letters-19](../../src/site/assets/content/projects/advertising/signage-raised-letters/signage-raised-letters-19-acrylic-dimensional-letters.webp) | 1024x1536 | ce1a20961f2232b92501a88187e46d33035a6c7ab89275546591d3ef72c525f3 | 7 (1/2/2/2) | 6 (2/3/0/1) | replace | Các hình acrylic tròn, tam giác và chữ nhật phát sáng trên tường; không có chữ nổi. Repair: Thay bằng chữ Mica có ký tự thật, độ dày và chân/halo. |
| [signage-raised-letters-20](../../src/site/assets/content/projects/advertising/signage-raised-letters/signage-raised-letters-20-aluminium-and-foam-dimensional-letters.webp) | 1122x1402 | f8a32d0fb8db20974f98fdf8206ab967e797a7b4c41d760927fd38232f892995 | 7 (1/2/2/2) | 6 (2/3/0/1) | replace | Cụm hình học tròn, chữ nhật, tam giác và mũi tên hắt sáng trên bê tông; không có ký tự. Repair: Thay bằng chữ Alu/Format có ký tự thật, cạnh và điểm lắp. |
| [signage-raised-letters-21](../../src/site/assets/content/projects/advertising/signage-raised-letters/signage-raised-letters-21-building-logos-and-dimensional-lettering.webp) | 1196x1315 | 9e84fecd2d6ec29394d8625c62bacdca11e50f0a3c6885f7c3ad4ea8454f8790 | 9 (2/3/2/2) | 8 (3/3/1/1) | rework | Logo dạng lá nổi trong hốc đá cẩm thạch có halo; đủ logo nhưng không thấy phần chữ đi kèm. Repair: Bổ sung toàn bộ phần chữ đi cùng logo nếu claim là logo và chữ nổi tòa nhà. |
| [signage-raised-letters-22](../../src/site/assets/content/projects/advertising/signage-raised-letters/signage-raised-letters-22-vacuum-formed-acrylic-projecting-signs.webp) | 1672x941 | 4344e5e5331f0e0e25abefe8e622392eb05d9bbafdd52c5fa484a4c86ac25e3d | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Bảng vẫy bo góc sạch với hình tối ở giữa, cạnh và bracket đen; không có nội dung chữ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [office-signs-wayfinding-01](../../src/site/assets/content/projects/advertising/office-signs-wayfinding/office-signs-wayfinding-01-etched-and-embossed-stainless-steel-house-number.webp) | 1672x941 | 7d7c903fb4064375f654a13c7a6bd522c4789fcd22fb614466a7a2bfdcca35be | 7 (1/2/2/2) | 6 (2/3/0/1) | replace | Tấm inox trống gắn trên tường/cổng ngoài với khắc sóng; không có số nhà. Repair: Thay bằng biển số nhà có số đọc được, giữ inox ăn mòn/dập nổi và mặt lắp. |
| [office-signs-wayfinding-02](../../src/site/assets/content/projects/advertising/office-signs-wayfinding/office-signs-wayfinding-02-acrylic-and-aluminium-house-numbers.webp) | 1448x1086 | bb44a2ee96fc474a7c1bd7ceae63746ca5f73d34290ac907bcbe961e7a18a13b | 9 (2/3/2/2) | 6 (2/3/0/1) | replace | Mũi tên và pictogram WC trên tấm gắn tường; thể hiện wayfinding nhưng không phải biển số nhà. Repair: Thay bằng biển số nhà Mica/Alu có số nhà; ảnh hiện tại là mũi tên và pictogram WC. |
| [office-signs-wayfinding-03](../../src/site/assets/content/projects/advertising/office-signs-wayfinding/office-signs-wayfinding-03-street-name-signs.webp) | 1774x887 | 6c076020ea1777d42334068cf332912ec23e0f379e1d37af9a82e4093f6b5014 | 7 (1/2/2/2) | 6 (2/3/0/1) | replace | Sáu biển mũi tên và pictogram treo trong sảnh; không có tên đường đọc được. Repair: Thay bằng bảng tên đường có tên đọc được, vị trí đường và khung lắp. |
| [office-signs-wayfinding-04](../../src/site/assets/content/projects/advertising/office-signs-wayfinding/office-signs-wayfinding-04-urban-wayfinding-signs.webp) | 1536x1024 | 7aa3fc713336e341f26b463b877079e7c659b0a57ab28e5384e89f8c9fcea28c | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Biển chỉ dẫn đứng cao với mũi tên, thang máy, cầu thang và WC trong sảnh hiện đại; toàn bộ hệ đứng rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [office-signs-wayfinding-05](../../src/site/assets/content/projects/advertising/office-signs-wayfinding/office-signs-wayfinding-05-timber-and-brass-desk-nameplates.webp) | 1402x1122 | b4e8fe2967b46335aa168e9914e2efe82411a62f309a01da9531b1d496252e8e | 10 (3/3/2/2) | 9 (3/3/2/1) | retain | Bảng chức danh để bàn bằng gỗ có viền đồng và biểu tượng người; mặt trống nhưng vật liệu, mép và chân rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [office-signs-wayfinding-06](../../src/site/assets/content/projects/advertising/office-signs-wayfinding/office-signs-wayfinding-06-acrylic-desk-nameplates.webp) | 1254x1254 | 70b71ee724793170e05c200990efd74f5de149beb24d5cbacb4b39c078938eb9 | 10 (3/3/2/2) | 9 (3/3/2/1) | retain | Bảng tên acrylic trong trên quầy lễ tân, phía sau có biểu tượng chỉ dẫn; mặt không có tên nhưng chất liệu và chân đỡ rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [office-signs-wayfinding-07](../../src/site/assets/content/projects/advertising/office-signs-wayfinding/office-signs-wayfinding-07-stainless-steel-desk-nameplates.webp) | 1086x1448 | 8f8cce6afb050bfb62adb2ebea8f9133c9747b55ca4db32cebb4335155977ede | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Bảng inox dạng mái lều để bàn có biểu tượng người và mũi tên; nếp gấp và cạnh kim loại nhìn rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [office-signs-wayfinding-08](../../src/site/assets/content/projects/advertising/office-signs-wayfinding/office-signs-wayfinding-08-office-room-signs.webp) | 1254x1254 | eb550c2f334a60871cbd02c0cc8c894d26a8165da3b740203c99919ec219c606 | 8 (1/3/2/2) | 6 (2/3/0/1) | replace | Cụm biển tường có icon WC, mũi tên, thang máy và màu trừu tượng; không thấy nhãn phòng làm việc. Repair: Thay bằng biển phòng làm việc có tên phòng hoặc chức danh đọc được; giữ ngữ cảnh hành lang. |
| [office-signs-wayfinding-09](../../src/site/assets/content/projects/advertising/office-signs-wayfinding/office-signs-wayfinding-09-meeting-room-signs.webp) | 941x1672 | a8fc705ff5df1e3d8bea2be9bbf9b26bed0cd0156aa6f7a3c83714b44200568a | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Biển treo tường có icon phòng họp và mũi tên phải cạnh phòng kính; ngữ cảnh sử dụng chính xác. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [office-signs-wayfinding-10](../../src/site/assets/content/projects/advertising/office-signs-wayfinding/office-signs-wayfinding-10-floor-wayfinding-signs.webp) | 1024x1536 | bddbb204acca0d3c8cfce2017acb114814bed2e436f63e742fee4ab303403903 | 9 (2/3/2/2) | 9 (3/3/2/1) | retain | Bảng dọc cạnh thang máy với mũi tên, người và icon cầu thang; không có số tầng nhưng hệ chỉ dẫn rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [office-signs-wayfinding-11](../../src/site/assets/content/projects/advertising/office-signs-wayfinding/office-signs-wayfinding-11-building-directories.webp) | 1122x1402 | 841e7d1e2fd936e01484fdbcd9ac83190be222936a0e1e58e4aac9feefa6c9be | 9 (2/3/2/2) | 7 (2/3/1/1) | rework | Tấm tường lớn với hàng icon và các khối sơ đồ trừu tượng; giống hệ sơ đồ nhưng không có nhãn đọc được. Repair: Bổ sung sơ đồ tầng/tòa nhà có nhãn và điểm “Bạn đang ở đây”, giữ panel toàn khung. |
| [office-signs-wayfinding-12](../../src/site/assets/content/projects/advertising/office-signs-wayfinding/office-signs-wayfinding-12-warning-and-washroom-signs.webp) | 1197x1315 | 6ff1888e3654ac331d3fe321327de0ec019d431d5fe051cda77eb6ccf00fa396 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Hai biển cảnh báo và WC có mũi tên trong hành lang văn phòng; toàn bộ biển và vị trí lắp rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [office-signs-wayfinding-13](../../src/site/assets/content/projects/advertising/office-signs-wayfinding/office-signs-wayfinding-13-etched-and-embossed-stainless-steel-house-number.webp) | 1536x1024 | 07c7935ccbbb3b5c8be2efd1b1958386e785d772d46a227b417fcddf0a21bcc8 | 7 (1/2/2/2) | 6 (2/3/0/1) | replace | Biển inox tròn có icon cầu thang/WC trên tường; không có số nhà, dù chất liệu và cách gắn nhìn rõ. Repair: Thay bằng biển số nhà inox có số nhà đọc được thay cho pictogram cầu thang/WC. |
| [led-displays-lightboxes-01](../../src/site/assets/content/projects/advertising/led-displays-lightboxes/led-displays-lightboxes-01-single-colour-matrix-led-signs.webp) | 1672x941 | 65376e400aebd30c10647f6e8a297e6cc4be7415a6c1289aa41bec66c5ea20a7 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Bảng LED ma trận đơn sắc màu hổ phách gắn trong mặt dựng; lưới điểm, khung và quy mô công trình rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [led-displays-lightboxes-02](../../src/site/assets/content/projects/advertising/led-displays-lightboxes/led-displays-lightboxes-02-three-colour-matrix-led-signs.webp) | 1448x1086 | d51de883d5afd051cc97c5445bae8206061ec01a29997cd3d0a082df604f06c3 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Bảng LED ma trận ba màu trong nhà với lưới đỏ, vàng, trắng và khung hoàn chỉnh; không có chữ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [led-displays-lightboxes-03](../../src/site/assets/content/projects/advertising/led-displays-lightboxes/led-displays-lightboxes-03-full-colour-matrix-led-signs.webp) | 1293x646 | 08af5cff745ca7f9440d1e7e8e66a8d89ef629e34fdf946397a39c4a8fef88eb | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Dải LED full color cong trong nội thất; pixel grid và đường cong hiện rõ, bề mặt sạch. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [led-displays-lightboxes-04](../../src/site/assets/content/projects/advertising/led-displays-lightboxes/led-displays-lightboxes-04-indoor-matrix-led-systems.webp) | 1536x1024 | bee15136e3ac6c438a747c41a77ac23072e8d12df6e102c354695c6b014ea5d0 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Tường LED cong trong hội trường/bảo tàng với nội dung xanh cam; toàn bộ màn hình và quan hệ không gian rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [led-displays-lightboxes-05](../../src/site/assets/content/projects/advertising/led-displays-lightboxes/led-displays-lightboxes-05-outdoor-matrix-led-systems.webp) | 1402x1122 | 9b27237451c7c896be240db2d111567a8d0c61940cbfa5c791296fbaeb0bd42f | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Màn hình LED full color ngoài trời lớn trước tòa nhà; pixel, viền, kết cấu và quy mô rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [led-displays-lightboxes-06](../../src/site/assets/content/projects/advertising/led-displays-lightboxes/led-displays-lightboxes-06-event-led-screens.webp) | 1254x1254 | cf9c06647d41b2ec390cdbf5aa244e615033e2ba3361d5c4dd15ddeadb52fad3 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Màn hình LED chữ nhật hoàn chỉnh trên sân khấu sự kiện với nội dung cam đỏ trừu tượng; khung và sân khấu rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [led-displays-lightboxes-07](../../src/site/assets/content/projects/advertising/led-displays-lightboxes/led-displays-lightboxes-07-auditorium-led-screens.webp) | 1086x1448 | 563c2246d5959a3637ce9f898796756339da4285e5aeaf2fec94436409131be8 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Màn hình LED sân khấu hội trường có đèn treo và nội dung màu; toàn bộ bối cảnh khán phòng rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [led-displays-lightboxes-08](../../src/site/assets/content/projects/advertising/led-displays-lightboxes/led-displays-lightboxes-08-showroom-led-screens.webp) | 1254x1254 | 1d124ef1a0d72a57ea0c0207fb31eb1aad952be1ca46d8c16e11b386f6e5deb5 | 10 (3/3/2/2) | 9 (3/3/2/1) | rework | Màn hình LED cong trong showroom nhìn xiên; biên, pixel grid và sàn bán hàng rõ, phần lắp đặt bị crop một phần. Repair: Chụp thêm góc toàn bộ kết cấu và mép panel; giữ góc xiên hiện tại làm chi tiết pixel. |
| [led-displays-lightboxes-09](../../src/site/assets/content/projects/advertising/led-displays-lightboxes/led-displays-lightboxes-09-large-format-led-displays.webp) | 941x1672 | eb2be0a50c2c8b21d1b4aa4025fc2522c0dcbc627e1f06a5f32f8f38f8cb40aa | 10 (3/3/2/2) | 9 (3/3/2/1) | rework | Màn hình LED dọc rất lớn trên mặt tiền văn phòng; toàn bộ panel, tòa nhà và quan hệ kích thước rõ, bầu trời chiếm nhiều diện tích. Repair: Giảm bầu trời, tăng mặt tiền và chân đỡ để chứng minh quy mô lắp đặt. |
| [led-displays-lightboxes-10](../../src/site/assets/content/projects/advertising/led-displays-lightboxes/led-displays-lightboxes-10-slim-led-light-boxes.webp) | 1024x1536 | 98e78ab353400a17fbc518759dfba943ea40a70441236f966de16cec122455f0 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Hộp đèn siêu mỏng dạng đá xuyên sáng âm tường trong nội thất; toàn bộ panel, viền và bề mặt rõ, không phải màn hình pixel. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [led-displays-lightboxes-11](../../src/site/assets/content/projects/advertising/led-displays-lightboxes/led-displays-lightboxes-11-magnetic-front-illuminated-frames.webp) | 1122x1402 | a2b513f9a0b1f1f3cbc11b8d505eb841a52b836067be26bd5f5dd9f7ba441bd9 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Cận cảnh cạnh hộp tranh điện nắp hít khung đen mỏng với mặt vân sáng; mép và cơ chế khung nhìn rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [led-displays-lightboxes-12](../../src/site/assets/content/projects/advertising/led-displays-lightboxes/led-displays-lightboxes-12-snap-frame-illuminated-displays.webp) | 1197x1314 | e1470b0519a1e206a3f48168e37d309525535a4d1bb63960836e5f4e691dcdfe | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Tranh điện nắp bật dạng đá giả sáng trong xưởng; toàn bộ panel và viền mở nhìn rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [led-displays-lightboxes-13](../../src/site/assets/content/projects/advertising/led-displays-lightboxes/led-displays-lightboxes-13-single-colour-matrix-led-signs.webp) | 1536x1024 | f5a148761887a911866b3513fb5a2d1fb757b423071fe3f7e92f34b2be7023e2 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Bảng LED ma trận đơn sắc màu hổ phách trong nhà; điểm ảnh, khung và mặt hiển thị nhìn rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [led-displays-lightboxes-14](../../src/site/assets/content/projects/advertising/led-displays-lightboxes/led-displays-lightboxes-14-three-colour-matrix-led-signs.webp) | 1402x1122 | 2c447ec8c568d572c7f0e044fcc7e37160a3ec924821d250ce72922ed68d4496 | 9 (2/3/2/2) | 8 (3/3/1/1) | rework | Bảng đứng trong xưởng có lưới LED và nhiều màu đỏ, xanh, lục; khung rõ nhưng hình vượt mô tả ba màu. Repair: Sửa caption thành LED nhiều màu thực tế hoặc thay ảnh bảng đúng ba màu; giữ cận lưới điểm. |
| [led-displays-lightboxes-15](../../src/site/assets/content/projects/advertising/led-displays-lightboxes/led-displays-lightboxes-15-full-colour-matrix-led-signs.webp) | 1254x1254 | 14517ace00d3adcc93ff7895a9b7a4adc0da63d65151ac34092cce1486531a4d | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Mặt sau LED full color ngoài trời với module, dây và giằng thép; phần cạnh sáng cho thấy thiết bị thực. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [led-displays-lightboxes-16](../../src/site/assets/content/projects/advertising/led-displays-lightboxes/led-displays-lightboxes-16-indoor-matrix-led-systems.webp) | 977x1303 | a6d429bcf8f79e9956b930a72195538a5ed2a6b54dfb65ab99aa6dec9c981011 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Bảng LED ma trận trong nhà màu hổ phách/trắng với lưới điểm đầy đủ; panel nhìn đủ trong khung dọc. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [led-displays-lightboxes-17](../../src/site/assets/content/projects/advertising/led-displays-lightboxes/led-displays-lightboxes-17-outdoor-matrix-led-systems.webp) | 1254x1254 | 2bba29aed705a641e35618d3f4a38bcf5373d010b65283512272578d1237f8a7 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Màn hình LED ngoài trời hai mặt ở góc tòa nhà; lưới điểm, khung và bối cảnh công trình rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [led-displays-lightboxes-18](../../src/site/assets/content/projects/advertising/led-displays-lightboxes/led-displays-lightboxes-18-event-led-screens.webp) | 941x1672 | dd683cc3f5f01557fc9dbcf3e8430b7c77ba2944f43f6029174869d9fb71db89 | 10 (3/3/2/2) | 9 (3/3/2/1) | rework | Màn hình LED sự kiện nhìn xiên cận với pixel pitch và nội dung xanh cam; cạnh phải kéo ra mép ảnh nhưng panel rõ. Repair: Bổ sung toàn bộ cạnh phải/sàn sân khấu để tránh cảm giác panel bị cắt. |
| [print-decals-01](../../src/site/assets/content/projects/advertising/print-decals/print-decals-01-business-cards.webp) | 1672x941 | b4e54f4eda93f1da9d14bf330a7995a9115309a590155ec73f94ccbf43417338 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Hai danh thiếp trống đặt trên bậc bê tông; mép, độ dày và bề mặt giấy nhìn rõ, không có chữ giả. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [print-decals-02](../../src/site/assets/content/projects/advertising/print-decals/print-decals-02-flyers.webp) | 1448x1086 | 16cd1dff0f4b74e7a771183ddd80c65598593a4b145a4d2c252b094010578aaf | 7 (1/2/2/2) | 5 (2/2/0/1) | replace | Các tấm màu và vật liệu mẫu xếp cùng phiến đá; không thấy tờ rơi hoặc nội dung in dạng flyer. Repair: Thay bằng tờ rơi có dạng tờ in, mép giấy, chồng số lượng và mặt nội dung hợp lệ; không dùng tấm vật liệu mẫu. |
| [print-decals-03](../../src/site/assets/content/projects/advertising/print-decals/print-decals-03-brochures-and-folded-leaflets.webp) | 1774x887 | 040d150431e93963c8689f8084374cd8195cafe13b85e7d5c7e249190d9a3db8 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Brochure hình học được gấp và đặt phẳng; nếp gấp, bìa và xếp chồng nhìn rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [print-decals-04](../../src/site/assets/content/projects/advertising/print-decals/print-decals-04-catalogues.webp) | 1536x1024 | d9b2455c372656d6312a9d8f4831c8f1dfc434946a9f7b9e4a7f65b57fbcad4b | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Các sách catalogue/mẫu xếp chồng, một quyển mở có swatch; mép giấy và bìa rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [print-decals-05](../../src/site/assets/content/projects/advertising/print-decals/print-decals-05-wedding-and-invitation-cards.webp) | 1402x1122 | 86686783e45cad1b46c92f4a2ecf907c5ede8277d8998603368513fe1a51f737 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Thiệp và phong bì trống có dập nổi, sáp niêm phong và dây; vật liệu và bộ set chính xác. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [print-decals-06](../../src/site/assets/content/projects/advertising/print-decals/print-decals-06-certificates-and-envelopes.webp) | 1254x1254 | c736e958781aaef07770a016800e2944b5934d01a43f30c859e57e2f8e2ebdaa | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Giấy chứng nhận và phong bì trống xếp lớp; mép giấy và quy cách bộ stationery rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [print-decals-07](../../src/site/assets/content/projects/advertising/print-decals/print-decals-07-hard-cover-leather-and-timber-menus.webp) | 1086x1448 | 36362f1b41c7365d96462d527d8ea6ab7debdcb99124e06ec6d0065f8edfe74c | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Menu bìa cứng bằng da và gỗ với chỉ may, vít đồng; vật liệu, độ dày và kết cấu rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [print-decals-08](../../src/site/assets/content/projects/advertising/print-decals/print-decals-08-waterproof-plastic-menus.webp) | 1254x1254 | fd0c4b3691fffd0525a779dcf7484371bd6c336fdf9bdab259cca52b6bb879c0 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Các menu nhựa bo góc xếp chồng có giọt nước; vật liệu chống nước và mép tấm thể hiện rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [print-decals-09](../../src/site/assets/content/projects/advertising/print-decals/print-decals-09-booklet-table-and-acrylic-menus.webp) | 941x1672 | 86f03dea79126a129bf285a506afd5e5b36b68bc77af0776b5478eae45c69a87 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Bộ menu da cuốn, menu để bàn và giá mica; toàn bộ bộ vật phẩm và chất liệu nhìn rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [print-decals-10](../../src/site/assets/content/projects/advertising/print-decals/print-decals-10-hiflex-banner-printing.webp) | 1024x1536 | 67d0aa129f3ea172d756c0c9c86dc422222a2c704b13e198d733a7b481666d25 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Bạt Hiflex lớn treo trên khung với lỗ khoen trên/dưới và nếp vải nhẹ; bối cảnh xưởng rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [print-decals-11](../../src/site/assets/content/projects/advertising/print-decals/print-decals-11-window-wall-vehicle-and-die-cut-decals.webp) | 1122x1402 | 13a1164936d5b7d52bbdf653f12ea90812cd3eba1f051f65bfe1796a74227484 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Decal hình học dán trên tường, kính và xe; mép decal và bối cảnh bề mặt nhìn rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [print-decals-12](../../src/site/assets/content/projects/advertising/print-decals/print-decals-12-canvas-and-decorative-wall-prints.webp) | 1196x1315 | 560440a6aa2a4b38657f13c7f3b249e5dbbf7535fb547a713389514cf1dfe163 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Tranh canvas trừu tượng có khung, dựa trong xưởng; mép khung và mặt canvas rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [print-decals-13](../../src/site/assets/content/projects/advertising/print-decals/print-decals-13-business-cards.webp) | 1536x1024 | 277e51c714bad018986bb31a0d5352bdfb3630cb05853d470dd8d655ddfdefce | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Chồng danh thiếp trống trên bậc đá; mép, độ dày và bố cục giấy rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [print-decals-14](../../src/site/assets/content/projects/advertising/print-decals/print-decals-14-flyers.webp) | 1402x1122 | 3abd5400d33b697742f6e98981c7dacc3144497ff486770683e5b5ef74b87e67 | 10 (3/3/2/2) | 8 (3/3/1/1) | rework | Tờ giấy hình học màu xanh đặt trên chồng tờ; mép giấy và mặt in nhìn rõ dù không có nội dung chữ. Repair: Bổ sung chồng số lượng và mặt tờ rơi có nội dung thực tế nhưng không dùng logo sao chép. |
| [print-decals-15](../../src/site/assets/content/projects/advertising/print-decals/print-decals-15-brochures-and-folded-leaflets.webp) | 1254x1254 | 3493d16a3b57eb55efa21344d1f8cc1ce4510357a2daa682fa956df2a8af09a1 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Brochure gấp accordion dựng đứng cùng chồng phẳng; các nếp gấp và panel trống rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [print-decals-16](../../src/site/assets/content/projects/advertising/print-decals/print-decals-16-catalogues.webp) | 1086x1448 | db925694eb85bdfceddb1b5ff492779a0ff10a680af86204011391e730a5fad1 | 10 (3/3/2/2) | 10 (3/3/2/2) | retain | Sách catalogue/mẫu dựng và xếp trong xưởng; bìa, gáy và mép trang nhìn rõ. Repair: Giữ ảnh; khi dùng lại cần bảo toàn crop an toàn và không thêm chữ/logo giả. |
| [advertising-parent-kiosk](../../src/site/assets/content/projects/advertising-kiosk-posm-cover.webp) | 1536x1024 | 1a391da3f726d44793c9177d24bab3afe29523113407f7a417c7895a602bea61 | 9 (3/3/2/1) | 10 (3/3/2/2) | unverified | Ảnh cover cho thấy đảo trưng bày bán lẻ trắng/gỗ hoàn chỉnh trong mall với kệ, quầy và sản phẩm; không thấy mặt người, logo hay chữ. Repair: Gắn sourceId/provenance cho ảnh parent hoặc lưu hồ sơ nguồn trước khi coi là bằng chứng sản xuất; giữ ảnh chỉ ở trạng thái unverified. |
| [advertising-parent-mobile](../../src/site/assets/content/projects/advertising-mobile-retail-cover.webp) | 1536x1024 | 74162b5f975a65b1566de09363c28410c7c91c83e57a03facc568530db135270 | 9 (3/3/2/1) | 10 (3/3/2/2) | unverified | Ảnh cover cho thấy xe gỗ đen có mái, quầy và caster trong sân nhà hàng; toàn bộ xe và bối cảnh dùng rõ. Repair: Gắn sourceId/provenance cho ảnh parent hoặc lưu hồ sơ nguồn trước khi coi là bằng chứng sản xuất; giữ ảnh chỉ ở trạng thái unverified. |
| [advertising-parent-signage](../../src/site/assets/content/projects/signage-dusk.webp) | 1536x1024 | 18a60fc3b906a7daccf64f81570de895af1d2b6ec8da488c4e87cbbd4193efe5 | 9 (3/3/2/1) | 10 (3/3/2/2) | unverified | Ảnh chạng vạng cho thấy mặt tiền/cửa kính với biển hình học và hộp đèn phát sáng; không có chữ đọc được. Repair: Gắn sourceId/provenance cho ảnh parent hoặc lưu hồ sơ nguồn trước khi coi là bằng chứng sản xuất; giữ ảnh chỉ ở trạng thái unverified. |
| [advertising-parent-office](../../src/site/assets/content/projects/advertising-office-wayfinding-cover.webp) | 1536x1024 | 4a84e021cd6d8462fa4abd59b3ad73a478105c2f02bc8ec0bb1b639108179ff5 | 9 (3/3/2/1) | 10 (3/3/2/2) | unverified | Ảnh cover cho thấy hành lang văn phòng với biển chỉ dẫn treo và panel icon; hệ lắp đặt, bối cảnh và quy mô rõ. Repair: Gắn sourceId/provenance cho ảnh parent hoặc lưu hồ sơ nguồn trước khi coi là bằng chứng sản xuất; giữ ảnh chỉ ở trạng thái unverified. |
| [advertising-parent-led](../../src/site/assets/content/projects/advertising-led-lightboxes-cover.webp) | 1536x1024 | c458486989f55470f24f7cdf62bf07420108f36c91b9bbb9e1eac75439e2e7d0 | 9 (3/3/2/1) | 10 (3/3/2/2) | unverified | Ảnh cover cho thấy màn hình LED full color ở giữa và hai hộp đèn trắng trên tường nội thất; toàn bộ cụm lắp đặt rõ. Repair: Gắn sourceId/provenance cho ảnh parent hoặc lưu hồ sơ nguồn trước khi coi là bằng chứng sản xuất; giữ ảnh chỉ ở trạng thái unverified. |
| [advertising-parent-print](../../src/site/assets/content/projects/advertising-print-decals-cover.webp) | 1536x1024 | e192e13dbddd114f65a18454550af082bd35e4bfdfdbd23963195245ccfaeccc | 9 (3/3/2/1) | 10 (3/3/2/2) | unverified | Ảnh cover cho thấy xưởng in với máy, cuộn vật liệu, chồng mẫu và decal; quy trình và vật liệu tại xưởng rõ. Repair: Gắn sourceId/provenance cho ảnh parent hoặc lưu hồ sơ nguồn trước khi coi là bằng chứng sản xuất; giữ ảnh chỉ ở trạng thái unverified. |

## P4 batch 1 — đã tích hợp ngày 2026-09-09

Ba record được thay bằng WebP mới trong dataset `2026-09-09.2`; giữ nguyên ID,
product key, thứ tự và override span. Bảng audit ban đầu phía trên là lịch sử
theo hash cũ, không phải điểm của file v2.

| Record | Audit / Critique | Dimensions | SHA-256 WebP mới |
| --- | --- | --- | --- |
| office-signs-wayfinding-01 | 10 / 10 | 1672×941 | `8eded9b68b44174dff140e7c9ea51ef228abad36eb2d35d2ac346f7e052658b2` |
| signage-raised-letters-02 | 9 / 10 | 1536×1024 | `1bffad77935ba75ad4bef8e69665aa02312871eba7c785e352ceb17d98552508` |
| signage-raised-letters-06 | 10 / 10 | 1536×1024 | `a151a584746c0db097ba3961f8b60d685cf49725de72e7d11b4e52eb48ac290c` |

Main tạo/sửa ảnh; reviewer Luna/max độc lập mở PNG, WebP cuối và incumbent ở
full resolution, chấm cả Audit và Critique theo rubric canonical. Main xem lại
ba ảnh, kiểm hash sau copy và kiểm data/layout 24/24 PASS. Không có hard reject.
Pano chứng minh bạt in căng trên khung thép và bối cảnh nhà máy; mặt sau khuất,
không dùng ảnh này để xác nhận có hay không tôn lưng. Ảnh mới là minh họa AI,
không là bằng chứng công trình khách hàng.

File mới dùng tên `<record-id>-v2.webp` trong category tương ứng tại
`src/site/assets/content/projects/advertising/`; file cũ còn nguyên nhưng manifest
không tham chiếu. PNG gốc, exact prompts và export manifest giữ ở
`source-assets/projects/advertising/grid-r4-20260909/`.
Requested model: ChatGPT Images 2.5; effective model: unknown vì image tool không
trả trường xác nhận. Không suy ra model thực tế từ prompt.

Raw review: `.tmp/orchestration/grid-r4-20260909-execution/p4/office-01-v2-audit.json`
và `signage-02-06-v2-audit.json`. Main acceptance chỉ cho ba file có hash trên;
pool còn 23 ảnh cần sửa, 13 cần thay và 6 parent image chưa xác minh nguồn.
Chưa tuyên bố toàn bộ ảnh đạt chuẩn.

## Bổ sung thư viện ảnh theo sản phẩm — 2026-09-10

Vòng đầu đã nghiệm thu **23 ảnh nguồn mới hoặc đã sửa**, Audit và Critique đều
từ **9/10 đến 10/10**. **Kết quả này là lịch sử trước feedback owner**: ba phiên
bản sau đó bị owner từ chối; các sửa đổi nội dung và sản phẩm bổ sung bên dưới
còn mở. Không tuyên bố toàn batch hiện tại đã đạt chỉ từ điểm vòng đầu.
Thư viện ảnh chưa tích hợp vào catalog hoặc route public. 109 media và sáu
parent image vẫn là pool cũ; các số sửa/thay/chưa
xác minh của pool cũ. Không trừ backlog ảnh cũ trước khi tích hợp và kiểm lại.

| Nhóm tham chiếu | Số ảnh mới | Sản phẩm/bối cảnh nhìn thấy |
| --- | --- | --- |
| Kiosk & POSM | 2 | Booth dùng thử sản phẩm; quầy đăng ký sự kiện. |
| Xe bán hàng | 3 | Xe kem, xe trà sữa, xe bánh mì, đủ khối sản phẩm trong bối cảnh F&B. |
| Bảng hiệu & chữ nổi | 4 | Chữ Mica, Alu, Formex; pano bạt căng trên khung sắt có tôn lưng nhìn thấy một phần ở phiên bản vòng đầu. |
| Biển văn phòng & chỉ dẫn | 4 | Biển số nhà, tên đường, biển phòng kiểm định, bảng chỉ dẫn tầng. |
| LED, màn hình & hộp đèn | 2 | Chữ kim loại đục lỗ gắn LED trên nóc; màn hình LED showroom. |
| In nhanh, ấn phẩm & decal | 8 | Tờ rơi, decal in/bế, giấy tiêu đề và kẹp file/phong bì, bao bì F&B, thiệp mời, menu trong giá Mica, decal kính trong/mờ, tranh in treo tường. |

Danh sách ID, PNG, kích thước nguyên bản, SHA-256, exact generation/edit prompt,
review đúng phiên bản và giới hạn claim nằm tại
[acceptance manifest](../../source-assets/projects/advertising/taxonomy-20260909/acceptance.json).
Ba bộ generation record giữ ở thư mục
[nguồn chính](../../source-assets/projects/advertising/taxonomy-20260909/generation-records.json),
[bảng hiệu](../../source-assets/projects/advertising/taxonomy-20260909-signs/generation-records.json)
và [quầy/ấn phẩm](../../source-assets/projects/advertising/taxonomy-20260909-products/generation-records.json).
Raw review được giữ cùng nguồn ảnh, không chỉ trong `.tmp`.

Hai worker tạo ảnh yêu cầu Terra/medium; reviewer độc lập yêu cầu Luna/high và
Luna/max. Main gọi Sol/high kiểm lại ba nghi ngờ về vật liệu/cấu tạo. Effective
model/effort của agent không quan sát được nên ghi unknown. Công cụ tạo ảnh là
built-in image_gen; requested image model là ChatGPT Images 2.5, effective image
model unknown vì công cụ không trả selector hoặc xác nhận model thực tế.

Main không dùng điểm ban đầu để bỏ qua finding. Chữ Mica v1 trông như kim loại,
chữ Formex v1 có dấu lơ lửng, pano v1 đặt tôn bên hông; ba bản bị loại và thay
bằng v2 đã mở/chấm lại. Xe bánh mì v1 có ký tự thừa trong nền, được sửa riêng
và nghiệm thu v2. Giữ nguyên ảnh cũ cùng lịch sử điểm/nhận xét; điểm đạt chỉ áp
dụng cho các hash đang liệt kê trong acceptance manifest.

Trong vòng đầu, main đã kiểm 23/23 PNG, hash và dimensions với generation record/review; đã xem
các bản sửa và các ảnh có nghi ngờ chính. Reviewer mở ảnh full resolution trước
khi chấm. Preview dùng WebP giữ nguyên kích thước và tỷ lệ, không crop/padding;
PNG gốc được giữ nguyên. Đây là ảnh minh họa AI, không phải bằng chứng công trình
thực tế của khách hàng.

### Feedback owner và trạng thái sau vòng đầu

Brief và điều kiện nghiệm thu hiện hành thuộc
[image quality](../design/advertising-image-quality.md), cập nhật ngày 2026-09-10.
Bảng này ghi trạng thái công việc/evidence; không sao chép rubric hoặc tự
tính điểm mới. Thuật ngữ “Format” trong bảng audit cũ/raw prompt được giữ làm
lịch sử; nhãn sản phẩm hiện hành là **Formex**.

| Phạm vi | Evidence hiện hành ngày 2026-09-10 |
| --- | --- |
| `window-film-finishes` | V2 phẳng, không thấy bong/tróc trong phần ảnh quan sát; Audit/Critique 9/9, main đã mở và nghiệm thu. |
| `street-wayfinding` | V2 mặt biển ngang dài, cột tròn mảnh; đối chiếu hai nguồn ảnh Việt Nam, Audit/Critique 9/9. Không suy kích thước thật, quy chuẩn hoặc móng bị che. |
| `sign-acrylic-letters` | V3 sửa phối cảnh chân chữ và khung cửa; Audit/Critique 9/9, main nghiệm thu. Material grade vẫn không xác nhận từ ảnh. |
| Pano và máy cắt decal | Pano V3 khung bạt ống bạc di động; cutter V2 gần góc tường. Cả hai 9/9; title “Decal in và bế”, media khoảng 600 mm là brief danh nghĩa. |
| Typography, subtitle và slogan | Tám bản sửa đã được reviewer mở cả original và edit, main kiểm: Audit 9/10; Critique 8–9/10. Phần cứng/bối cảnh giữ; font, artwork và slogan theo ngành. |
| Standee và biển số | Bốn standee cùng hai biển số kim loại hắt chân đã nghiệm thu; Audit/Critique từ 8/10. Standee chân T dùng V2; điểm V1 bị loại không áp dụng. |
| Gian hàng triển lãm | Sáu cảnh theo research đã nghiệm thu; Audit/Critique 8–9/10. Cảnh tiêu chuẩn dùng V2 sửa bao bì trống. Ảnh là concept ngành hàng, không chứng minh dự án hoặc bao bì thương hiệu thật. |
| Bốn ảnh coverage bổ sung | Bảng ngoài trời, sơ đồ mặt bằng, canvas được main mở và nghiệm thu 10/10; menu in trực tiếp dùng bản typography mới 9/9. |

Nguồn bốn ảnh mới và metadata tại
[generation records coverage](../../source-assets/projects/advertising/taxonomy-20260910-coverage/generation-records.json).
Review bổ sung được giữ tại
[coverage completion](../../source-assets/projects/advertising/taxonomy-20260909/review-evidence/coverage-completion-review.json)
và [owner corrections](../../source-assets/projects/advertising/taxonomy-20260909/review-evidence/owner-corrections-review.json).
Chỉ ghi kết quả review độc lập ở trên sau khi đối chiếu hash và dimensions;
main đã bổ sung kiểm trực quan cho phiên bản hiện hành tại manifest mới bên dưới. Bản ghi
nghiệm thu vòng đầu giữ hash rubric lúc chạy, không thay bằng hash guide mới
để làm như đã chấm theo toàn bộ feedback mới.

Quy định decal khổ danh nghĩa khoảng 600 mm thuộc
[image quality](../design/advertising-image-quality.md#decal-in-và-bế-theo-quy-trình-owner);
không đo khổ máy từ pixel. Giới hạn được giữ khi gán nhãn: menu đang thấy là giấy
in trong giá Mica, chưa chứng minh in trực tiếp lên Mica; bảng chỉ dẫn tầng chưa
chứng minh sơ đồ mặt bằng; tranh in chưa chứng minh canvas; kết cấu hoặc vật liệu
bị che không tự trở thành claim. Bốn ảnh coverage mới được chấm riêng, không
làm những ảnh cũ này tự có thêm claim. 94 nhãn đang là inventory đề xuất trong discovery,
không phải schema CMS đã duyệt hay bằng chứng mọi biến thể đều có ảnh.


## Nghiên cứu khách hàng và thư viện hiện hành — 2026-09-10

[Nghiên cứu sản phẩm](../reference/advertising-client-products.md) đã được ba
researcher Terra/medium thực hiện, Sol/medium kiểm nguồn độc lập và main đối
chiếu các claim cốt lõi. Effective routes unknown. Nguồn chính thức phân biệt
BEINCO/Delta Coco, Betrimex/Cocoxim/OEM và sản phẩm Dừa Cửu Long tự sản xuất với
hàng bán lại. Exact pack chỉ dựa vào leaflet không mở lại được đã bỏ khỏi brief.

Chấm lại **55 ảnh liên quan**: 52 ảnh inventory Kiosk/POSM, Xe bán hàng, ấn phẩm
và ba candidate mới; kết quả **34 keep, 20 recreate, 1 gap**. Đây là vòng đánh
giá research-fit; không thay kết quả audit toàn bộ 115 ảnh hoặc tính số thiếu
bằng phép cộng hai vòng. Nhiều fixture vẫn dùng được cho cấu tạo nhưng không
chứng minh sản phẩm dừa, skincare, thời trang hoặc campaign. Danh sách đầy đủ,
điểm, ảnh đã mở, hash và lý do ở [research image review](../../source-assets/projects/advertising/taxonomy-20260910-review/evidence/research-image-review.json).

**Checkpoint trước vòng feedback tiếp theo: 39 ảnh được nghiệm thu trong thư viện nguồn**. Main mở 28 file
hiện hành trong đợt sửa/bổ sung; 11 hash không đổi giữ nghiệm thu trước.
Tám bản typography thay cùng stable ID, không tính thêm tám sản phẩm. Giữ
PNG nguyên bản, prompt, lịch sử bản bị loại, dimensions và SHA-256; WebP preview
chỉ chuyển định dạng, không crop/resize. [Manifest hiện hành](../../source-assets/projects/advertising/taxonomy-20260910-review/acceptance.json)
là nguồn điểm theo phiên bản; [manifest vòng đầu](../../source-assets/projects/advertising/taxonomy-20260909/acceptance.json)
giữ lịch sử và không được dùng để nghiệm thu bản mới.

| Cảnh triển lãm bổ sung | Audit / Critique | Phạm vi nhìn thấy |
| --- | --- | --- |
| Tiêu chuẩn thực phẩm dừa, V2 | 9 / 9 | Lon nấu ăn, chai sữa dừa và lon có ga có nhãn generic riêng. |
| Đảo lớn sản phẩm dừa | 9 / 9 | Khu đồ uống, quầy pha cà phê và khu nấu ăn tách công năng. |
| Mặt nạ và sản phẩm từ dừa | 9 / 8 | Hộp/túi mặt nạ, mẫu mặt nạ, skincare, soap và khu vật liệu; không suy thành phần ẩn. |
| Mỹ phẩm quy mô lớn | 9 / 9 | Quầy thử, trưng bày và tư vấn, thiết kế khác cảnh tiêu chuẩn. |
| Thời trang | 9 / 9 | Giá treo, mannequin và khu trao đổi trong gian triển lãm. |
| Nguyên liệu dừa B2B | 8 / 8 | Mẫu fine/flakes, bao bulk và thùng; không suy grade, dầu bên trong hoặc hãng. |

Ảnh cây dừa hoặc trà trái cây không tự được tính là đúng sản phẩm của ba công
ty. Bao bì mới là thiết kế minh họa theo family/function đã nghiên cứu, không
chép pack/claim sức khỏe/chứng nhận chưa kiểm. Cảnh tiêu chuẩn V1 bị yêu cầu sửa
vì lon/chai trống; V2 đã được Sol mở/chấm lại và main nghiệm thu. Mỗi score
Audit/Critique là hai rubric của reviewer độc lập với người tạo ảnh, không
phải tuyên bố hai reviewer cho mọi ảnh.

Source và exact prompt mới: [standee/biển số](../../source-assets/projects/advertising/taxonomy-20260910-standees-numbers/generation-records.json),
[gian hàng](../../source-assets/projects/advertising/taxonomy-20260910-exhibitions/generation-records.json),
[typography](../../source-assets/projects/advertising/taxonomy-20260910-typography/generation-records.json).
Requested image model ChatGPT Images 2.5; built-in image_gen không xác nhận
model hiệu lực. Gate 8/10 không xóa các caveat ghi trong từng review.

Kiểm chứng: 39/39 PNG signature/hash/dimensions khớp generation record và review;
39 stable ID duy nhất; browser DOM có 39 card và caption/điểm đúng phiên bản.
Formex nhất quán trong catalog, media manifest, seed migration và docs;
focused Node tests 24/24, `pnpm prepare:site` exit 0. Main Serena MCP xác nhận
exact source labels; worker gọi sai entrypoint `pnpm serena` đã được ghi rõ
trong [Formex evidence](../../source-assets/projects/advertising/taxonomy-20260910-review/evidence/formex-verification.md).

Thư viện này **chưa tích hợp public**. Pool 109 media + sáu parent vẫn giữ;
không trừ 20 recreate/1 gap hoặc backlog 23 sửa/13 thay/6 chưa xác minh trước
mapping, tích hợp và kiểm lại. Detail/tag/Auto/CTA vẫn discovery, không được
coi ảnh đạt là owner duyệt kiến trúc. Trước card Notion tiếp theo phải nêu
phạm vi và dừng chờ owner duyệt từng card.

## Feedback vận hành, vật liệu và biển trên đỉnh cột — 2026-09-10

Checkpoint lịch sử này thay trạng thái thư viện 39 ảnh ở phần trên; đã được
vòng feedback tiếp theo bên dưới supersede. Tại checkpoint có
**47 stable ID: 46 ảnh đạt gate, một ảnh biển tên đường còn chờ sửa tỷ lệ**.
Đợt này kiểm 17 phiên bản mới: tám thay thế đạt, tám sản phẩm bổ sung đạt và
một biển tên đường chưa đạt. Cutter V3 đã đạt riêng trước đó. Main mở các
ảnh native, đối chiếu review độc lập và kiểm 47/47 hash/kích thước; không lấy
điểm cũ để bỏ qua feedback owner.

| Feedback / sản phẩm | Kết quả hiện hành |
| --- | --- |
| Decal in và bế | V3 9/9; nhãn cà phê trong máy khác nhãn sữa dừa trên bàn; nét ưu tiên mặt bàn. |
| Xe trà sữa | V4 10/10; máy dập nắp và vòi bình ủ hướng về người pha chế. Giữ artwork và chữ đã duyệt. |
| Chữ nổi Mica | V4 10/9; góc gần chính diện, chân chữ và cửa cùng phối cảnh. Giữ caveat phân biệt vật liệu qua ánh sáng vàng. |
| Menu để bàn và menu UV | Đế menu V3 đục màu, có nước/bánh; tấm menu UV là Mica sữa đặc. Hai ảnh 10/10. Bản đế trong bị loại, giữ lịch sử. |
| Canvas và standee đế nước | Canvas có giá đỡ/điểm tựa 10/10; standee đế thấp 9/9. Không suy lượng nước bên trong từ ảnh ngoài. |
| Pano nhà máy và pano khổ lớn | Khung sắt căng bạt với viền nhôm 8,3/8,4; pano lớn ốp kín viền 8,6/8,6. Không khẳng định lưng tôn, liên kết ẩn hoặc tải gió từ góc ảnh. |
| Ba sơ đồ | Khu du lịch, khu công nghiệp và nhà máy là ba ảnh riêng, mỗi ảnh 10/10. Có đường đi, chú giải, vị trí hiện tại và gá/đế; không đại diện địa điểm thật. |
| Năm công năng còn thiếu | Quầy dùng thử lưu động, quầy bán hàng sự kiện, kiosk trải nghiệm, bộ POSM mỹ phẩm và quầy pop-up gấp gọn đã có ảnh riêng; Audit 10, Critique 9–10. Ngăn kéo tiền của quầy retail đã xoay về người bán. |
| Biển tên đường | V5 đạt yêu cầu mới: biển nằm trên đỉnh cột, không có đầu cột nhô lên. Audit 7,8 / Critique 8,3: mặt biển nhìn khoảng 2,06:1, chưa đạt mốc 75:40. Giữ trạng thái cần sửa. |

Ba lượt chỉnh tỷ lệ biển đường V3/V4/V5 chưa đạt. Dừng generation theo rule
ba lần sửa thất bại; giả định chưa được chứng minh là công cụ edit sẽ giữ
được tỷ lệ raster chính xác chỉ từ prompt số đo. Không hạ ngưỡng hoặc gọi ảnh
V5 là đạt chuẩn. Nguồn quy chiếu và giới hạn ở
[image quality](../design/advertising-image-quality.md#quy-chiếu-biển-tên-đường-và-pano).

[Manifest hiện hành](../../source-assets/projects/advertising/taxonomy-20260910-review/acceptance.json)
giữ PNG, prompt đầy đủ, hash, lịch sử ảnh trước, review evidence và hai tổng
điểm cho từng stable ID. Report gốc được giữ dưới thư mục `evidence` cùng
manifest: `cutter-review`, `menus-stands-independent-review`,
`wayfinding-posm-independent-review`, `mobile-activation-repaired-review`,
`signs-independent-review` và `street-top-mounted-review`. Các review bị
thay thế vẫn được giữ. Rubric được chụp theo hash trước khi bổ sung nguồn;
điều kiện biển trên đỉnh cột ghi riêng trong review V5.

Đã kiểm [browser DOM và screenshot](../../source-assets/projects/advertising/taxonomy-20260910-review/evidence/feedback-browser-verification-20260910.md):
47 figure/ID duy nhất, 46 caption đạt và đúng một caption chờ sửa; QA metadata
độc lập kiểm 17/17 prompt/output và 11 input hash. Preview
`http://127.0.0.1:8788/gallery.html` hiển thị phiên bản mới, đủ tên sản
phẩm; V5 có nhãn còn chờ sửa, không hiện điểm cũ như ảnh đạt. WebP chỉ đổi
định dạng ở kích thước native; không crop/resize. Requested image model là
ChatGPT Images 2.5, effective unknown; tất cả là minh họa AI.

Không sửa source UI trong đợt feedback này, nên không chạy lại test logic
grid/static để làm bằng chứng ảnh. Catalog public vẫn 109 media; chưa tích
hợp 47 ảnh nguồn, chưa trừ backlog public. Draft AD-BROWSE-R1 trong card
Advertising đã qua review và sửa ba finding; spec/plan mới vẫn chờ owner duyệt.
Không mở card Notion khác.

## Tranh dưới sàn, tên quầy, LED và ba biến thể biển sáng — 2026-09-10

Thư viện hiện hành có **50 stable ID: 49 ảnh đạt gate, biển đường V6 còn cần
sửa tỷ lệ**. Main đã mở các PNG mới, kiểm review độc lập và đối chiếu lại
50/50 hash/kích thước. Bảy output trong vòng này gồm ba bản thay thế đạt,
ba sản phẩm mới đạt và một bản biển đường chưa đạt spec.

| Ảnh / feedback | Phiên bản và kết quả |
| --- | --- |
| Tranh canvas | V3: cả mặt tranh và mặt sau khung đặt dưới sàn, dựa tường; giữ artwork lá và màu đất. Audit/Critique 10/10. |
| Quầy bán hàng sự kiện | V3: đổi GÓC DỪA thành VỊ DỪA QUÊ, giữ subtitle “Chọn vị ngon mang về” và POS hướng người bán. 10/10. |
| Chữ LED trên nóc | V2: BỆNH VIỆN sáng hơn, vẫn phân biệt điểm LED và mặt chữ, giữ tòa nhà/bối cảnh. 10/10. |
| Hộp đèn kim loại hiệu ứng rỉ sáng viền | Ảnh mới, nội dung CÀ PHÊ / Rang mộc mỗi ngày; thấy hông hộp, gá và ánh sáng viền. 10/10. |
| Biển số nhà Mica LED | Ảnh mới, số 128 sáng trên tấm nền đen; số nổi, cạnh tán sáng và vị trí gắn trên trụ cổng. 10/10. |
| Biển số nhà Mica–Alu | Ảnh mới, số 246 mặt tối, hắt sáng phía sau và thanh ngang dưới. 10/10. |
| Biển tên đường | V6 dựng mới gần chính diện, toàn cột theo brief owner 3.600 mm, biển đặt trên đỉnh. Audit/Critique 9/9 nhưng spec FAIL: outer plate khoảng 2,00:1, rộng hơn target 1,875:1 khoảng 6–7%; vẫn cần sửa. |

Ba bản sửa có [prompt và metadata](../../source-assets/projects/advertising/taxonomy-20260910-floor-name-led/generation-records.json)
và [review độc lập](../../source-assets/projects/advertising/taxonomy-20260910-floor-name-led/independent-review.json).
Ba sản phẩm mới có [generation records](../../source-assets/projects/advertising/taxonomy-20260910-lightbox-variants/generation-records.json);
biển V6 có [record riêng](../../source-assets/projects/advertising/taxonomy-20260910-street-3600/generation-record.json).
[Review bốn ảnh mới](../../source-assets/projects/advertising/taxonomy-20260910-review/evidence/new-variants-independent-review.json)
giữ rubric, hash, điểm từng tiêu chí và finding tỷ lệ. Reviewer Sol/medium
độc lập với người tạo; main đã đối chiếu. Effective model unknown.

Nguồn Shopee được phân biệt theo mức đã xem: hai link đầu đọc được tên/mô tả
trước màn đăng nhập, chưa xem ảnh gốc; link thứ ba đã xem mô tả và ảnh. Ba
output là minh họa mới theo loại sản phẩm, không phải bản sao đã xác minh
từng chi tiết từ cả ba ảnh nguồn. Không dùng lời quảng cáo làm claim điện áp,
tuổi thọ, chống nước hoặc vật liệu bị che. Link nguồn và brief ở
[image quality](../design/advertising-image-quality.md#biến-thể-hộp-đèn-và-số-nhà-từ-nguồn-shopee).

Owner cập nhật chiều cao cột 3.600 mm sau lần dừng V3/V4/V5. V6 dùng cảnh mới
toàn cột, không edit lại bitmap cũ. Tỷ lệ mặt biển vẫn chưa đạt nên chưa tạo
thêm hoặc hạ gate. Số đo 3.600 mm và 750 × 400 mm là brief thiết kế, không
phải kích thước thật đo được từ ảnh hay kết luận pháp lý.

Preview đã rebuild 50 card, dùng WebP cùng kích thước native, không crop/resize.
Browser DOM có 50 ID duy nhất, 49 caption đạt và đúng một caption cần sửa;
ba ảnh mới tải đúng kích thước, không overflow ở viewport kiểm. Kiểm source,
metadata, rubric và preview được lưu tại
[evidence vòng mới](../../source-assets/projects/advertising/taxonomy-20260910-review/evidence/floor-name-led-browser-verification.md).
Catalog public vẫn 109 media; media mới chưa được mapping/tích hợp vào public.
Không chạy lại test UI để chứng minh một thay đổi ảnh/docs.

Owner đã duyệt [AD-BROWSE-R1](../specs/advertising-photo-browse.md); đây là
accepted spec grid/detail. Owner tiếp tục duyệt plan ngày 2026-09-10; triển khai
UI bắt đầu sau checkpoint media này và giữ evidence riêng.
Wording discovery/spec draft ở các checkpoint trước là lịch sử; không mở
lại các quyết định đã duyệt hoặc tự bắt đầu card backlog khác.

## Inventory AD-FINAL-R1 — 2026-09-13

Owner duyệt plan AD-FINAL-R1-P1. T01 khóa cutoff
`2026-09-12T20:27:38.613Z` trong thư mục thực
`C:/Users/halal/.codex/generated_images`:95 file từ09/09,95/95 hash
khớp snapshot trước, không có file sau cutoff trong lần kiểm.
Không dùng tên file/ngày tạo làm bằng chứng chất lượng hoặc sản phẩm mới.

Đối chiếu hai acceptance manifest cho73 record occurrence,63 hash generated
khớp, quy về50 ID nguồn hiện hành. Trong23 ID xuất hiện ở cả hai manifest,
10 giữ hash và13 đã đổi bản. Target hiện hành có49 accepted-in-source-library
và1 owner-revision-requested là biển đường; trạng thái này không thay review
chất lượng mới và chưa cho phép import public.

Reviewer Astra đã mở32 ảnh không khớp acceptance:3 bản nguồn đang public,
19 revision đã thay,7 revision bị loại lịch sử và3 candidate chưa khóa lineage
(tem cuộn SỮA DỪA, tờ rơi TRÀ TRÁI CÂY, quầy sampling MÁT LÀNH TỪ DỪA).
Ba candidate được giữ nguyên, chặn nhập cho đến khi mapping/provenance và
quality gate đạt; không tự tính là ba sản phẩm mới. Không có điểm Audit hoặc
Critique mới trong T01.

Main kiểm lại95 SHA thực và32 record đã xem bằng
`node .tmp/orchestration/advertising-final-r1-exec-20260913/t01/scripts/merge-mapping.mjs`:
exit0. Source integrity73/73 khớp hash/dimensions. Public inventory vẫn109
catalog và6 parent,115 path/115 hash riêng; không có mismatch intrinsic/hash.
Sáu route compatibility redirect, không chứa ảnh inline mới.

Artifact local tại `.tmp/orchestration/advertising-final-r1-exec-20260913/t01/`:
`inventory.json`, `mapping.json`, `use-sites.json`, `visual-a.json`,
`visual-b.json`, `lineage-extra.json`; mỗi kết luận truy được exactpath/hash.
T10 đang chấm public theo lô độc lập. Không sửa điểm/ngày verdict cũ ở các
checkpoint trên và chưa nghiệm thu thư viện cuối.

## Chấm mới AD-FINAL-R1 — 2026-09-13

T10 đã mở và chấm lại115 ảnh public theo12 lô, gồm109 catalog và6 ảnh parent.
Reviewer đề xuất16 giữ,52 sửa,23 thay và24 cần làm rõ provenance. Đây là
finding mới, không phải115 ảnh PASS hoặc lệnh nhập. Main kiểm115 hash thực,
đủ4 mục Audit và4 mục Critique, tổng điểm và rubric hiện hành bằng
`t10/aggregate.cjs`: exit0. Các trường hợp ảnh không đúng loại, không thấy
sản phẩm được caption mô tả hoặc thiếu nguồn vẫn giữ finding dù nhìn đẹp.

Đối chiếu source HTML làm rõ6 ảnh parent nằm trong `noscript`, không phải6
card mới trong grid JavaScript. Cover nhóm in còn được dùng để khởi tạo
ảnh detail ẩn và viewer đóng. `t10/use-sites-delta.json` bổ sung nơi sử dụng,
không sửa packet đã khóa. Copy lịch sử “Công trình đã hoàn thiện” và alt
tương ứng cần đối chiếu provenance trước tích hợp; không suy nguồn AI hoặc
công trình thực chỉ từ hình thức ảnh.

Kiểm lại live EN sau yêu cầu owner:115/115 hash đang phục vụ có review,
không có ảnh chưa chấm. `t10/live-en-coverage.mjs`: exit0; kiểm parent,
6 route compatibility,115 asset HTTP và4 module media/runtime khớp source.
Hero, nền blur, viewer, related và gợi ý dùng chung manifest109 ảnh; không
đếm lại mỗi lần xuất hiện. Đây là coverage chất lượng ảnh, không thay QA
bố cục của từng URL/query. Evidence: `t10/live-en-coverage.json`.

50 ảnh nguồn hiện hành cũng được chấm mới theo5 lô:41 đề xuất giữ,4 sửa,
5 thay. `t10/source-aggregate.cjs` kiểm50 PNG/hash/dimensions, rubric,
4+4 tiêu chí và generation linkage: exit0. Rubric dùng cho cả hai nhóm là
`a99ee857bbac27ecd628028af0bfbe961cc8654372010bf4a2078add968d0179`.
Điểm lịch sử không bị ghi đè; việc chấm mới không tự phủ nhận review trước
do tên model hoặc metadata cũ khác hiện tại. Reviewer requested Astra,
effective model không được runtime công bố.

9 source cần xử lý: biển đường; sampling activation; LED showroom;
gian tiêu chuẩn; gian cellulose; gian thời trang; gian nguyên liệu;
gian làm đẹp; quầy mobile sampling. Finding tập trung vào tỷ lệ mặt biển,
crop mất bộ phận chính và dáng người hậu cảnh trái brief không người.
Owner đổi routing trong lượt13/09: reviewer ngoài code không dùng Astra;
Astra nếu dùng thì ưu tiên high, cấm medium/low, trên high cần lý do cụ thể.
Evidence đã hoàn thành trước thay đổi giữ nguyên lịch sử. Hai review ảnh
đang mở chuyển sang reviewer Sol/high, effective unknown.

41 bản đề xuất giữ còn phải qua mapping, kiểm bản tối ưu và nghiệm thu lô;
không thay acceptance manifest hoặc public catalog ở checkpoint này.

T11 biển đường V7 đã được tạo bằng imagegen rồi review độc lập. Hash
`23ec3c5c44a825fe1d9a10f546a3a370ccf29b01e99c8f615cc184982a517475`;
Audit8,5/Critique9 nhưng tỷ lệ mặt biển khoảng2,02, chưa đạt1,875 theo brief.
V7 không được nghiệm thu hoặc nhập. Số đo từ vùng màu trên ảnh là ước lượng
pixel, không xác nhận kích thước vật lý. Original V6/V7 được giữ nguyên.
Sampling activation V2 còn dáng người nên giữ verdict sửa. Bản V3 đã được
Sol/high review9/9; LED showroom V2 được10/10, đủ màn hình và gá trong khung.
Main đã xem hai original, đọc reasoning/uncertainty và kiểm native/source/hash,
4+4 tiêu chí; nghiệm thu chất lượng PNG nguồn, chưa nghiệm thu public derivative.
Record và review canonical ở
`source-assets/projects/advertising/final-r1-20260913-sampling/` và
`source-assets/projects/advertising/final-r1-20260913-led/`.
Sampling V3 giữ nội dung/chữ nhưng không pixel-identical: reviewer đo14,57%
pixel ngoài patch lệch kênh trên10; không dùng claim bảo toàn từng pixel.

Ba candidate chưa rõ lineage đã khôi phục exact invocation/completion từ hai
session tương ứng: decode output trong RAM cho SHA khớp3/3 original.
Review mới Terra/high theo prompt đã khôi phục: tem nhãn10/10 đề xuất giữ;
flyer8,5/9,5 cần sửa chữ thừa; mobile sampling8/9,5 cần bỏ người trái brief.
Nguồn đã rõ không tự mở quyền import hoặc tính cả ba là sản phẩm mới.
Chi tiết: `t10/unmapped-lineage-recovery.json` và
`t10/recovered-three-terra-review.json` trong run bên dưới.

Artifact chi tiết tại
`.tmp/orchestration/advertising-final-r1-exec-20260913/`: `t10/aggregate.json`,
`t10/source-aggregate.json`, các `batch-*.json`, `source-batch-*.json` và
`t11/street-v7-review.json`. Ba candidate phục hồi lineage vẫn tách riêng,
không cộng vào50 source hoặc tự tính là ba sản phẩm mới.

## Owner trả lại artifact và lô ảnh chờ duyệt — 2026-09-13

Owner chỉ rõ11 file có noise, đốm và pattern lặp, nhất là thực vật; quy về8
nhóm sản phẩm, gồm nhiều revision của sampling, biển đường và xe trà sữa.
Sampling V3 từng đạt9/9 nay bị trả lại theo finding mới; kết quả lịch sử giữ
nguyên nhưng không còn đủ readiness. Không chấm lại toàn bộ ảnh không đổi.

Sáu bản sửa mới đã qua reviewer độc lập Terra/high, effective unknown;
main mở đúng PNG, kiểm reasoning, đủ4+4 điểm, hash native/source và review:

| Bản sửa | Audit | Critique |
| --- | ---: | ---: |
| Sampling V6 | 10 | 9 |
| Chữ kim loại sáng chân V2 | 10 | 9 |
| Canvas R4 | 10 | 9,5 |
| Xe trà sữa R5 | 10 | 9 |
| Pano khu sản xuất V7 | 10 | 9 |
| Quầy Vị Dừa Quê R6 | 10 | 9 |

Tờ rơi hiện hành hash `4faa9fa24e42c8724a1f40070ec59a1151d500b1910e5e5094a98e6877641119`
khác file lịch sử owner đánh dấu; đã sửa typography trước đó. Giữ điểm9,5/9,5
T10 source-batch01, không tạo/chấm lại. Worker và main đã đối chiếu bản hiện
hành theo finding artifact. Bảy ảnh này chỉ đủ điều kiện trình owner.

Biển đường V8–V10 vẫn không đồng thời đạt tỷ lệ mặt biển/tổng thể và bề mặt
không có pattern giả. Dừng cách sửa hiện tại sau ba lần thử; giả định sửa
geometry bằng imagegen vẫn giữ nguyên chất lượng texture không được chứng
minh. Không hạ gate hoặc đưa ảnh này vào lô duyệt.

Hồ sơ canonical tại
`source-assets/projects/advertising/final-r1-artifact-repair-20260913/`:
`owner-artifact-findings.json`, `independent-review.json`, `final-followups.json`,
`owner-approval.json` và `owner-review.md`; generation records giữ exact prompt,
input, output và hash từng revision. Dùng imagegen tích hợp, requested Images2.5,
effective unknown; giữ original, không hậu xử lý pixel hoặc ghi đè ảnh cũ.

Gate M5 của spec áp dụng: reviewer đạt rồi owner duyệt đúng file/hash trước
tích hợp. Owner approval của cả7 ảnh còn pending; chưa sửa public asset/manifest,
chưa review bản WebP hoặc QA tích hợp. Không coi lô này là toàn card Done.

## Owner correction R2 sau bảng bảy ảnh — 2026-09-13

Owner trả lại samplingV6 vì thiếu bối cảnh đang hoạt động, tờ rơi hiện hành
và quầy Vị Dừa QuêR6 vì vẫn có noise. Giữ điểm lịch sử, đổi ba trạng thái
thành changes-requested. Bốn bản không được nhắc đến vẫn pending, không suy
thành đã duyệt. Owner yêu cầu đổi tên quầy dừa sang tiếng Anh và biển đường
vuông góc với hướng người đi tới; giữ mặt750×400mm, cột3.600mm.

Ba ảnh mới đủ gate nguồn sau review độc lập Terra/high và main xem PNG gốc:

| Candidate | Audit | Critique | Thay đổi |
| --- | ---: | ---: | --- |
| sampling-supermarket-v1 | 10 | 9,5 | Siêu thị đang hoạt động; người quay lưng/không nhận diện, đủ quầy và lối đi |
| print-flyers-fnb-owner-r2-v3 | 10 | 9,5 | Bố cục, đồ họa và cách chụp studio mới hoàn toàn |
| coconut-grove-event-cart-r2 | 9,75 | 9 | Tạo mới, tên COCONUT GROVE, ít bao bì và nền trơn; bánh thứ tư bị che nên không xác nhận cấu tạo ẩn |

Biển đườngR2 v1 sai mặt biển/cột nhô, v2 sinh texture mặt đường, v3 đổi sang
cảnh đường ướt nhưng reviewer vẫn loại: Audit6,5/Critique7; mặt khoảng214×105px
(2,04 so với1,875), tỷ lệ mặt/cụm khoảng1:11 thay vì1:9, đường có stipple noise.
Đây là quan sát tỷ lệ ảnh, không phải đo kích thước thật. Dừng sau ba lượt;
giả định prompt kích thước đủ kiểm soát hình học và bề mặt không được chứng minh.
Không nhập bản này hoặc nới brief để đạt điểm.

Nguồn và bảng duyệt tại
`source-assets/projects/advertising/owner-correction-r2-20260913/`:
`owner-review.md`, `owner-approval.json`, `independent-review.json`;
`main/`, `coconut/`, `flyer/` giữ native copy và generation records.
Worker tạo ảnh Sol/high, reviewer Terra/high; effective routes unknown.
Main kiểm file/hash/kích thước thật, đủ4+4 điểm và từng ảnh; ba owner approval
còn pending. Không thay public asset/manifest, chưa có WebP hoặc QA tích hợp.
Graphify structural fresh,227 semantic files pending; không semantic extraction.

## Coconut Grove R3: kiểu quầy cũ trong siêu thị — 2026-09-13

Owner trả lại kiểu quầy xanh R2, yêu cầu giữ dạng quầy Vị Dừa Quê cũ và
đặt trong trung tâm thương mại/siêu thị. Bản mới dùng R6 làm reference cấu
tạo: mặt gỗ sáng, khung sắt đen, kệ hai bên và bánh xe; giữ tên COCONUT GROVE.
Bối cảnh siêu thị có nhân viên và khách mua sắm, không dùng lại texture cũ.

`coconut/coconut-grove-supermarket-r3-v1.png` có SHA256
`144c76991c3900a69110591019d6c84009357b83a593451653295773eeb66a9a`,
1536×1024. Worker Sol/high tạo một lượt; reviewer độc lập Terra/high đạt
Audit9,75/Critique9,5, không hard reject; effective routes unknown.
Main đã xem PNG gốc và kiểm hash native/source, đủ4+4 tiêu chí.
Không xác nhận bánh thứ tư hoặc cấu tạo ngăn tiền bị che trong ảnh.

Hồ sơ cùng thư mục owner-correction-r2: `coconut/generation-r3.json`,
`coconut-r3-review.json`, `owner-approval.json` và `owner-review.md`.
Bản R3 thay ảnh3 trong bảng duyệt; review hợp lệ của ảnh1–2 giữ nguyên.
R2 quầy xanh là lịch sử changes-requested. Cả ba ảnh vẫn chờ owner duyệt
đúng file/hash; không nhập public. Biển đường vẫn chưa đạt, không tạo thêm.

## Coconut Grove R4: bỏ người — 2026-09-13

Owner yêu cầu xóa hai khách xách giỏ và nhân viên bán hàng. Imagegen tích hợp
chỉnh trực tiếp R3, giữ quầy và siêu thị; absence of people là yêu cầu mới.
`coconut/coconut-grove-supermarket-r4-no-people.png`, 1536×1024, SHA256
`0a596ba19c80f0231b75b40fcd2b2f90d4469a1bc99d71639f98435932c4914d`.
Review độc lập Terra/high đạt Audit10/Critique9,5, không hard reject;
main kiểm ảnh, đủ4+4 tiêu chí và hash native/source trùng nhau.
Không thấy bóng người sót hoặc vết xóa; giữ cấu tạo quầy, chữ và POS.
`coconut/generation-r4.json` giữ prompt/input/output; `coconut-r4-review.json`
giữ điểm theo bản mới. Bảng duyệt thay ảnh3 bằng R4; R3 giữ lịch sử
changes-requested. Owner approval vẫn pending, không nhập public.

## Chú thích thuật ngữ

- **Audit**: kiểm tra đúng sản phẩm, bối cảnh, thi công, integrity và provenance.
- **Critique**: đánh giá chất lượng nhìn, bố cục, ánh sáng, truthfulness và độ đa dạng của bộ ảnh.
- **Numeric score threshold**: hai tổng điểm độc lập từ 8 trở lên và không có hard reject; không đồng nghĩa được publish.
- **Publish acceptance**: numeric threshold đạt, provenance declared và verdict retain.
- **Hard reject**: lỗi trực tiếp làm ảnh không được PASS, như sai loại, sai claim chữ/nội dung, cấu trúc bất khả thi, crop mất sản phẩm lớn hoặc provenance giả.
- **sourceId**: mã nguồn ảnh trong manifest/detail HTML; parent thiếu trường này và đã scope-check trong các thư mục nêu trên.
- **Route usage**: source reference trên route; VI/EN, filter contexts và generated duplicate được liệt kê để truy vết, nhưng routeUsageCount chỉ đếm source reference dedup theo công thức đã ghi.
- **retain / rework / replace / unverified**: giữ; sửa brief/chụp lại; thay ảnh; hoặc chưa đủ provenance để nghiệm thu.
