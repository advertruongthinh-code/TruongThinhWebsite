---
title: Verification Advertising Products single-column rank-v2
date: 2026-08-31
status: partial
related_spec: ../specs/advertising-products-turnkey-services.md
related_decision: ../decisions/deterministic-advertising-product-single-column-media-fit.md
---

# Verification Advertising Products single-column rank-v2

## Evidence đạt

`node --test tests/site/advertising-products-layout.test.mjs
tests/site/advertising-products-lifecycle.test.mjs
tests/site/advertising-products-static.test.mjs` đạt `3/3 PASS`.

RED được ghi trước implementation: import test yêu cầu
`ADVERTISING_LAYOUT_ALGORITHM_VERSION` và fail vì export chưa tồn tại. GREEN xác
nhận FNV vector, rank-v2 deterministic, layout artifact cho 7 filter x 3 cột,
single-column placement, batch frontier, media-fit, artifact-only runtime và
bounded synthetic window 3.000 item.

## Build và current-hash

Sau khi root dừng đúng local preview lock, `pnpm prepare:site` chạy hai lần và
artifact SHA-256 không đổi:
`6E0CB5A75B39B99A330CD65A8766B93C1CF20B3BD21F0F65BE8C790649F4BE75`.
`pnpm qa:static` và `pnpm qa:worker:static` PASS. Root đã capture current-hash
scoped E2E: grid `17/17 PASS`, 3.000-card artifact window `1/1 PASS` và locale
lifecycle `1/1 PASS`. Node Advertising suites đạt `4/4 PASS`.

Grid settle trả DOM về canonical artifact order sau morph; probe 3.000 dùng
placement artifact cùng pixel geometry media, caption gap, line box và vertical
gap. Locale assertion đọc foreground semantic image và chỉ đánh giá tile visible
trong outgoing cohort.

## Rapid-filter `pendingScroll`

RED trước bản vá tái hiện target `(0,0)` nhưng visual transform còn
`(-69.153px,0)` với `duration 0.4s`. Nguyên nhân là `settleMotion()` return sớm
tại nhánh `pendingScroll` trong khi Outlayer item vẫn giữ transform transition.
`disableTransition()` chỉ dừng transition; nó không commit `item.position` sang
native `left/top`.

Runtime hiện gọi `layoutPosition()` ngay sau khi disarm và xóa transform, rồi
`settleMotion()` prune cohort trước khi xử lý `pendingScroll`. Nhánh scroll chỉ
gọi `renderWindow()`; nó không reload hoặc instant-layout nếu membership và
geometry cùng frontier không đổi. Regression test chủ động phát `site:scroll`
giữa hai filter trên artifact 600 card, chặn riêng `transform transitionend` của
card incoming để không dựa vào cleanup tự nhiên, cuộn qua frontier làm virtual
membership đổi nhưng vẫn giữ một card vùng giao, rồi yêu cầu card đó settled
không còn inline transform và visual/native coordinate khớp nhau. Sau khi mở
chặn, test phát synthetic `transitionend` và yêu cầu counter của Outlayer item
cũ vẫn bằng `0`, chứng minh listener cũ đã được tháo trước `reloadItems()`.

Current-source rapid gate đạt `10/10` process độc lập. Hash runtime source và
generated output cùng là
`3659801756A2679C37F3CB83CEA49549EB7901048569ED457AA05CF169E943F4`.
DevTools sau chuyển sang `mobile-retail` xác nhận 12 card visible,
`transform: none`, visual delta tối đa `0.016px`, không horizontal overflow,
console không có message và mọi request là `200/304`.

## Boundary chưa đạt

Focused default Advertising đạt `26/28`; trajectory và rapid-filter đều pass.
Hai case delayed-detail vẫn fail do fixture navigation đã có trước và ngoài
phạm vi `pendingScroll`. Vì vậy default và full-suite vẫn `NOT PASS`; report
không đưa ra release, deploy hoặc full-suite green claim.

## Chú thích thuật ngữ

- **RED**: test fail có chủ đích trước production implementation.
- **GREEN**: test pass sau implementation.
- **Current-hash**: source, output artifact và kết quả test cùng một trạng thái.
