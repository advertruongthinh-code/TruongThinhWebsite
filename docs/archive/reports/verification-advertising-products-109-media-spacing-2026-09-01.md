---
title: Verification lưới Advertising Products với 109 media và spacing Espacio
date: 2026-09-01
category: verification
related_specs:
  - ../specs/advertising-products-turnkey-services.md
related_decisions:
  - ../decisions/advertising-organic-masonry-espacio-spacing-media-distribution.md
---

# Verification lưới Advertising Products với 109 media và spacing Espacio

## Mục đích

Kiểm chứng implementation current-hash của `/vi/advertising-products/` và
`/en/advertising-products/` đạt contract rank-v3: đúng `109` media độc lập,
spacing Espacio, tối đa năm cột, natural-ratio organic masonry, motion Outlayer,
lazy loading, bounded virtualization, keyboard và sáu route chi tiết. Report
không cấp release clearance và không thay report baseline `72/20/16`.

## Phương pháp

Evidence được lấy trên local preview `http://127.0.0.1:8787`, Chrome desktop,
không deploy và không bật Wrangler. Ba lớp kiểm tra được dùng:

1. Pure Node/static contract cho data, rank, geometry, media và generated
   boundary.
2. Playwright với Chrome system cho matrix responsive, lifecycle, motion,
   network, keyboard và synthetic `3.000` card.
3. Chrome DevTools cho computed geometry, DOM/network/console và performance
   trace current-hash ở `390px` và `1920px`.

Media audit dùng bundled Python/Pillow qua
`.tmp/audit-advertising-media.py`; contact sheet sáu nhóm được main agent review
ở `.tmp/contact-sheets/`. `.site-output` chỉ được tạo bằng
`pnpm prepare:site`.

## Kết quả

| Phát hiện | Bằng chứng | Độ tin cậy |
| --- | --- | --- |
| Pool production đúng contract | `109` record; count `24/16/22/13/18/16`; `109` path, source ID và packaged SHA-256 độc nhất; WebP sRGB đã loại metadata; file lớn nhất `219,960 B`; không có audit error | cao |
| Taxonomy và rank ổn định | Sáu nhóm giữ `12` product key; rank liên tục `0..108`; all-filter round-robin/FIFO; category filter giữ source order; dataset `2026-09-01.2` | cao |
| Geometry Espacio đạt | Grid gate `44/44`: outer `15/25/35px`, gap `15/25/35px`, cap `1500px`, `2–5` cột, boundary `-1/0/+1px`, layout-scrollbar `751/1201px`, overflow/overlap bằng `0` | cao |
| Runtime media và detail đạt | Media gate `6/6`: stepped lazy sweep tải đúng `109/109` path với HTTP `200`; sáu detail route chỉ reuse đúng category pool; one-shot entrance không replay | cao |
| Virtualization đạt | Probe `3.000` card `1/1`: vùng `2800–2820` mount, card đầu đã unmount, DOM `<120`, spacer giữ deep scroll, filter/resize không đổi deterministic window | cao |
| Keyboard và artifact boundary đạt | Keyboard `1/1`: Tab/Shift+Tab đi qua virtual frontier; grid có `role=list`, item có `aria-posinset/aria-setsize`; artifact rank-v2 hoặc rank-v3 rỗng fail trước Masonry | cao |
| Lifecycle và motion đạt scoped | Default Advertising `28/28`, locale lifecycle `1/1`; position morph `0.4s`, media fade `0.6s`, natural hover settle `scale(1.15)`, pending-scroll chỉ có một catch-up, reduced motion instant | cao |
| DevTools mobile đạt | `390px`: outer/gap `15/15px`, grid `360px`, hai cột tại `0/187.5`, DOM `26`, total set `109`, caption `10.5/15.68/700`, overflow `0`, raw HTML false, `10/10` image request HTTP `200`, console sạch | cao |
| DevTools wide đạt | `1920px`: effective outer `210px`, gap `35px`, grid cap `1500px`, năm cột tại `0/307/614/921/1228`, DOM `40`, total set `109`, caption `12/17.92/700`, overflow `0`, `20/20` initial image request HTTP `200`, console sạch | cao |
| Performance local đạt scoped, còn optimization | Trace `1920px`, CPU/network không throttle: LCP `153ms`, CLS `0.00`; Image Delivery ước tính còn `3.1MB` byte có thể tiết kiệm | trung bình |
| Full repository suite chưa đạt | `pnpm qa:site` full đã chạy hơn 20 phút, phát nhiều failure toàn-site ngoài boundary rồi stall và được dừng. Targeted retry sau harness fix đạt cả bốn lazy-image smoke case, gồm Advertising `1440px`, rồi fail tại Home header tone ngoài delta | cao |

## Hash evidence

Git base của dirty worktree là
`a8ba94ec1dadd84990b0b33f7e590f2cf76c71b1`. Hash dưới đây định danh exact
source/test/artifact dùng cho focused acceptance; chúng không khẳng định các
unrelated file trong dirty worktree đã được review.

| Path | SHA-256 |
| --- | --- |
| `src/site/advertising-products/layout-core.mjs` | `2ec3af798bb86c54c45da3f47caafd223f54a5b92a2c47b033bb5b33d93340e0` |
| `src/site/advertising-products/catalog-runtime.mjs` | `9aacc466b56fddc072b75bb4e64f0d279e4cc32e11c76627c567469ea531025c` |
| `src/site/advertising-products/catalog.mjs` | `443c174a3eb589f7e53017031e3f7c2516534984f7ff87dc09218b6d059ce04f` |
| `src/site/advertising-products/media-manifest.mjs` | `5630b30caa7c5bc1cca9388fe80bebfb4f59c2aa4aebf032e23828d5f538d418` |
| `src/site/advertising-products/media-contract.mjs` | `eada442bfa8d7a110acc1a08b7a831cd7de36b94f5e0b64c546cfd172aa93469` |
| `src/site/detail.css` | `670c9a83a5cf81f5fd7dc4e9151395167a2f539972e70dd58376682f444c1722` |
| `tests/site/site.e2e.cjs` | `d1e1c5eeeabc72bde4f9157c689d1f505a8894e65ef0af9f26892fce1c2479a6` |
| `.site-output/advertising-products/catalog-artifact.mjs` | `d02ddb3a195ea29a45045a018ddb080bca928d759749acd6c5678d7b12b3e65e` |

## Review và residual risk

Independent code, test và performance review đã phát hiện rồi sửa ba lỗi trong
scope: breakpoint phải dùng layout viewport `clientWidth`, keyboard không được
mắc tại virtual frontier, và artifact rank-v3 rỗng phải fail trước Masonry.
Regression hover tự nhiên và generic lazy-image smoke helper cũng được sửa để
không giữ live locator qua node virtualization.

Responsive derivative chưa tồn tại: static phase hiện phát một WebP/card, không
có `srcset`, `sizes` hoặc variant nhỏ hơn. Việc này được hoãn tới CMS phase để
không tạo pipeline media song song; trước public release phải xử lý finding
Image Delivery và chạy lại performance evidence.

Probe `3.000` card chứng minh DOM/layout bounded nhưng inject/import toàn bộ
metadata artifact trước khi render; nó không mô phỏng pagination metadata qua
network. `getVirtualWindow` hiện scan placement theo `O(n)`. Hai điểm này không
block pool static `109`, nhưng phải benchmark bằng artifact/network thật nếu CMS
tăng catalog lên hàng nghìn record.

Runtime fail-closed với algorithm sai, category/card schema sai và artifact rỗng,
nhưng không khóa dataset version hoặc count đúng `109` vì số card tương lai được
phép thay đổi. Build/media contract bảo vệ pool static hiện tại; trước deploy cần
cache-busting hoặc schema-version contract để artifact rank-v3 stale nhưng vẫn
hợp lệ về hình dạng không được dùng nhầm.

Các module core/test mới vẫn là file untracked trong dirty worktree. Không dùng
`git diff` mặc định như bằng chứng đủ và không `git add -A`; khi owner cho phép
commit phải stage exact allowlist rồi review staged diff.

## Kết luận

Delta Advertising Products `109` media + spacing Espacio đạt scoped acceptance
current-hash. Runtime giữ ba thuộc tính đã chốt: card luôn một cột với chiều cao
theo ảnh, shortest-column không closed frontier và vị trí deterministic qua
reload/filter/resize. Lazy loading, bounded virtualization và accessibility
không bị hạ để đạt visual result.

Kết quả không phải full-suite, production hoặc deploy clearance. Full website
vẫn `NOT PASS`; responsive derivative là việc phải làm trong CMS/public-release
phase.

## Việc tiếp theo

- Tạo CMS media derivative contract (`srcset/sizes`) rồi benchmark lại Image
  Delivery trước public release.
- Mở task riêng cho các failure full-suite ngoài boundary Advertising; không
  sửa lẫn vào delta đã accepted.
- Khi owner cấp quyền commit, stage exact source/test/docs/media allowlist và
  chạy `ponytail-review` trên staged diff.

## Chú thích thuật ngữ

- **Current-hash**: evidence gắn với hash cụ thể của source, test và artifact.
- **Media pool**: tập ảnh production được catalog sử dụng.
- **Source ID**: định danh ảnh gốc; crop hoặc export lại không tạo source mới.
- **Intrinsic ratio**: tỷ lệ width/height thật trong file ảnh.
- **Outer band**: khoảng tối thiểu từ viewport đến content trước content cap.
- **Effective outer**: khoảng thật sau khi content cap được căn giữa.
- **Inter-card gap**: khoảng giữa hai card theo chiều ngang hoặc dọc.
- **Shortest-column**: đặt card mới vào cột có đáy thấp nhất.
- **Bounded virtualization**: chỉ giữ một vùng card hữu hạn quanh viewport trong
  DOM.
- **Overscan**: vùng render thêm ngoài viewport để cuộn không thấy card bật trễ.
- **Lazy loading**: trì hoãn tải ảnh đến khi card gần viewport.
- **Reduced motion**: chế độ giảm hoặc tắt animation theo preference hệ thống.
- **Responsive derivative**: biến thể ảnh nhỏ hơn cho từng viewport.
- **CMS deferral**: việc đã biết nhưng được chuyển có chủ đích sang CMS phase.
