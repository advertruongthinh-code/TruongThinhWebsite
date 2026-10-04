# Dọn checklist P0–P10 Advertising random grid và tải ảnh, 04/10/2026

Branch `claude/project-thread-wjdaxj` trên `main` `7722b59`, cloud, Chromium
141.0.7390.37 headless, preview `pnpm dev` cổng `8787`. Barba/Locomotive lấy
từ npm cùng version qua Playwright route vì `cdn.jsdelivr.net` bị chặn; SHA-384
của `barba.umd.js` khớp SRI trong HTML. Route tắt HTTP cache của Playwright nên
run này không đo được cache hit (xem P8).

Checklist sở hữu: [todo P0–P11](../../tasks/todo.md#advertising-random-grid-và-tải-ảnh--checklist).

## P1: thứ tự nút All và sáu filter

- `tests/site/advertising-products-static.test.mjs`: thứ tự
  `data-advertising-filter` trong HTML bằng `all` + `ADVERTISING_CATEGORIES`;
  `motion.js`/`detail.js` không chứa `Math.random`, `random-order` hay
  `shuffle`, nên route ngoài Advertising không random (Advertising là route duy
  nhất có `data-project-grid`). RED khi đổi chỗ hai filter trong HTML, GREEN
  sau khi trả lại.
- `tests/site/advertising-random-browse.e2e.mjs`: sau runtime mount, sau mỗi
  lần bấm sáu filter và sau khi về All, thứ tự cùng `offsetLeft/offsetTop` của
  bảy nút không đổi; EN giữ cùng thứ tự. Phần Chromium PASS; script dừng ở bước
  WebKit vì cloud không có WebKit (đã biết, chờ PC).
- `node --test tests/site/*.test.mjs` 120/120, `pnpm qa:static` PASS.

## P3 / Checkpoint A: review solver

Đọc `random-order.mjs`, `solveAdvertisingOrganicPresentationOrder`,
`compileAdvertisingProductLayout` và `compileAdvertisingLayout` trong
`layout-core.mjs`. Report chạy lại được:
`node tests/site/advertising-solver-report.mjs` (5 width
`320/390/768/1440/2560` × 5 seed cho mỗi pool, tổng 350 lượt).

| Pool | Ảnh | Score | Soft target | Organic fallback | Stagger fallback | Ops tối đa |
| --- | --- | --- | --- | --- | --- | --- |
| Đồng dạng vuông 1:1 | 24 | 0 | không áp dụng | `insufficient-ratio-pool` 25/25 | 25/25 | 136 |
| Đồng dạng dọc 3:4 | 24 | -122 | không áp dụng | `insufficient-ratio-pool` 25/25 | 25/25 | 136 |
| Đồng dạng ngang 4:3 | 24 | -122 | không áp dụng | `insufficient-ratio-pool` 25/25 | 25/25 | 136 |
| Khó: 1 ảnh 1:30 | 1 | -1 | không áp dụng | `insufficient-ratio-pool` | 0/25 | 4 |
| Khó: 2–3 ảnh 1:30/30:1 | 2–3 | 99 | không áp dụng | `insufficient-ratio-pool` | 0/25 | 12 |
| Khó: 100 ảnh ratio cực đoan | 100 | 599–678 | đạt 25/25 | không 20, `soft-score-not-improved` 5 | 25/25 | 1600 |
| Catalog All | 154 | 599 | đạt 25/25 | không 25 | 25/25 | 2096 |
| Sáu filter catalog | 18–37 | 599–699 | đạt 150/150 | không 145, `soft-score-not-improved` 5 | 145/150 | 592 |

Kết luận:

- 350/350 layout hard-safe theo oracle, không lượt nào ném
  `search-exhausted`; ops tối đa 2096, dưới budget `300000` khoảng 140 lần.
- Pool đồng dạng không có cặp cao/thấp nên solver giữ thứ tự seed và ghi
  `insufficient-ratio-pool`; đúng thiết kế, không phải lỗi. Score âm chỉ phản
  ánh run dài cùng band.
- Stagger fallback (`geometry-stagger-bridge-or-rhythm`) dùng gần như mọi lượt
  nhiều ảnh: phase preferred cạn cây tìm kiếm sau vài chục bước, không cạn
  budget. Hành vi này đã được khóa ở test R11
  (`advertising-products-layout.test.mjs`).
- Rủi ro còn lại (suy luận, chưa tái hiện): `compileAdvertisingProductLayout`
  không bắt lỗi khi chính layout hard-safe theo thứ tự seed ném
  `search-exhausted` ở cả hai phase. Chưa pool nào trong report hay test chạm
  tới; nếu catalog tương lai chạm, trang sẽ lỗi thay vì trả layout có
  diagnostic. Không sửa trong đợt này vì không có ca tái hiện.
- Suggestion slideshow seed bằng `Math.random()`, không theo seed lượt duyệt,
  nên tập 9 ảnh đổi mỗi lần mount. Khớp spec "sample random", ghi lại để không
  nhầm là lỗi.

## P8–P9: khung chờ và vòng tải

Script: `BASE_URL=http://127.0.0.1:8787 node tests/site/image-loading-frame.e2e.mjs`.
Ảnh `/assets/content/` (trừ logo khách hàng) bị trễ 1,5 s (Advertising 4 s) để
chụp trạng thái đang tải. PASS 23 ca, 4 lượt liên tiếp đều PASS (3 lượt trên bản cuối của script).

| Ca | Phạm vi | Kết quả |
| --- | --- | --- |
| Khung trước request | home, residential, commercial, about × VI/EN × 390/1440 (16 ca) | Mọi ảnh đang hiển thị có box trước khi tải, ảnh chưa tải có vòng; box sau tải lệch ≤1 px; CLS 0–0,0003 |
| Thuộc tính HTML | cùng 16 ca | `alt`, `loading`, `fetchpriority` của ảnh khớp HTML build; ảnh hero dùng `data-src` bỏ qua vì src do script gán |
| Request trùng | cùng 16 ca | 0 URL bị request hai lần trong một lượt tải |
| No-script | 4 route VI, 390 px | Ảnh trong cột hiển thị tải xong, opacity > 0 |
| Barba và Back | home → residential (soft, cùng `timeOrigin`) → Back | Khung giữ box ở cả hai chiều |
| Card Advertising | 390/1440 | Card `lazyloading` hiện vòng `::after` opacity 1 sau 150 ms; ảnh tải xong thì `content: none` |
| Geometry Advertising | 390/1440 | Vị trí card, CTA, footer, filter giống hệt giữa lúc đang tải và sau tải |
| Lazy window | 390/1440 | 11/19 và 12/24 request so với card đã render, catalog 154 |
| Viewer | 390/1440 | Primary chưa tải có `.media-load-ring` và `aria-busy`; đổi sang related trước khi ảnh đầu xong thì sau tải không còn vòng hay `aria-busy` cũ; Back đóng viewer không còn vòng |

Ghi chú khi viết script: card Advertising đổi `top` từ `0` sang vị trí cuối
khoảng 600 ms sau khi trang sẵn sàng, cả khi không trễ ảnh. Đây là entry layout,
không do ảnh tải; script chờ geometry ổn định rồi mới so.

Cache hit không đo được trong run có route. Đo riêng bằng persistent context
không route (Barba lỗi vì CDN, vòng là CSS nên không phụ thuộc): tải lại
residential không có frame nào còn ảnh chưa xong trong viewport; home có ảnh
lazy `home-residential-kitchen` ở mép màn hình chưa xong trong 2 frame
(266–298 ms). Vòng tĩnh không có delay như vòng Advertising, nên có thể lóe
khoảng 2 frame; chưa xác nhận vòng có thật sự hiện ra hay bị intro che. Mục cache
trong P8 vì vậy để mở.

## Mục viết cho ChatGPT Sites

Demo đã chuyển sang Cloudflare Workers
([decision](../decisions/cloudflare-workers-static-demo.md)). Các mục P0, P10,
Checkpoint C và P11 ghi theo Sites được đổi sang `Bỏ` kèm lý do hoặc viết lại
cho Workers trong todo. LCP P5/P11 thuộc thread font và cache; mục owner xem
preview trong P10 giữ mở.

## Chú thích thuật ngữ

- **Hard-safe**: layout qua mọi ràng buộc hình học bắt buộc của oracle.
- **Soft target**: mục tiêu nhịp cao/thấp trong 12 ảnh đầu, không bắt buộc.
- **Stagger fallback**: phase thứ hai của solver cho phép cột thẳng hàng.
- **Lazy window**: tập card được render và tải quanh viewport.
- **CLS**: Cumulative Layout Shift, tổng dịch chuyển layout không do input.
- **Route (Playwright)**: chặn request trong browser test để trễ hoặc thay response.
