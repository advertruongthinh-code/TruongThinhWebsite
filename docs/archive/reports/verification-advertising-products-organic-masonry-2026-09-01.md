---
title: Verification Advertising Products Pinterest organic masonry rank-v3
date: 2026-09-01
status: partial
related_spec: ../specs/advertising-products-turnkey-services.md
related_decision: ../decisions/pinterest-organic-advertising-product-masonry.md
---

# Verification Advertising Products Pinterest organic masonry rank-v3

## Kết luận

Delta organic masonry đạt scoped acceptance trên source, generated artifact và
runner hash hiện tại. Lưới dùng card một cột, natural hoặc explicit canvas ratio,
shortest-column deterministic, outer margin `20px`, gap `16px`, rank-v3,
Masonry position morph và bounded virtualization. Không còn closed frontier,
fixed ratio, seeded-random media fit hoặc fixed-column layout table.

Report giữ status `partial`: focused Advertising green, nhưng full
`pnpm qa:site` vẫn `NOT PASS` và không hoàn tất do các failure/hang ngoài boundary
organic masonry. Đây không phải release, deploy hoặc full-suite green clearance.

## Scoped gate current-hash

| Gate | Kết quả |
| --- | --- |
| Bốn Node suites Advertising | `4/4 PASS` |
| `pnpm prepare:site` | PASS, sinh artifact `advertising-rank-v3` gồm 72 card |
| `pnpm qa:static` | PASS |
| `TT_E2E_ADVERTISING_DEFAULT_ONLY=1` | `28/28 PASS` |
| `TT_E2E_ADVERTISING_GRID_ONLY=1` | `43/43 PASS` |
| `TT_E2E_ADVERTISING_3K_ONLY=1` | `1/1 PASS` |
| `TT_E2E_FRAGMENT_ONLY=1` | `7/8`; internal-link canonical PASS, locale replay baseline FAIL |

Grid matrix gồm `320`, `390`, các breakpoint hiện hành và threshold
`-1/0/+1px` tới `2560px`. Nó xác nhận công thức cột, outer margin, gap, card
width, caption, dấu tiếng Việt, natural/canvas ratio, không overlap/interior
hole, fail-closed artifact rank-v2 và deterministic filter round-trip.

Probe `3.000` card mount đúng vùng `2800–2820`, unmount vùng đầu và giữ DOM
bounded. Default subset xác nhận SSR VI/EN, direct và Barba readiness, dependency
recovery, history remount, filter/reduced/pending-scroll/rapid-filter, no-op
scroll, direct failure, text selection và delayed detail tại mobile/desktop.
Playwright dùng Chrome hệ thống vì Chromium project-local không khả dụng.

## DevTools runtime

Trên artifact đã regenerate tại `http://127.0.0.1:8787/vi/advertising-products/`:

- viewport `1440×900` có grid left/right `20px`, 5 cột, card width
  `267.1875px`, same-column gap `16px`, khoảng 42 card mounted, không overlap
  hoặc horizontal overflow;
- filter `all → kiosk-posm` giữ cohort cũ/mới bounded, dùng transform duration
  `0.4s`, rồi settle còn 12 card và không giữ transform;
- click lại filter `all` đang active giữ nguyên marker document, URL và catalog;
  không reload route hoặc replay hero;
- foreground và blurred backplate cùng nhận ready class, dùng cùng URL và cùng
  one-shot entrance; 31/31 network request trả `200`, console không có warning
  hoặc error;
- keyboard focus trên card dùng outline `2px`, offset `4px`; DevTools xác nhận
  `:focus-visible`, screenshot xác nhận outline hiện ngoài card sau khi bỏ paint
  containment nhưng vẫn giữ layout containment;
- Lighthouse snapshot đạt Accessibility, Best Practices, SEO và Agentic Browsing
  `100`. Một audit detail ngoài delta còn mở: visible label của floating Zalo CTA
  chưa nằm trong accessible name;
- screenshot viewport cuối được capture vào vùng tạm của máy, không commit vì là
  generated browser evidence.

DevTools cũng báo một browser issue về lazy image dimensions trên card kiosk;
DOM inspection xác nhận cả foreground/backplate đều có `width="1536"`,
`height="1024"` và reserved layout box. Vì vậy report giữ issue này như detector
diagnostic, không dùng nó để phủ nhận explicit-dimension contract.

## Review độc lập và fix

Reviewer không còn P0/P1/P2 mở sau các patch:

1. active filter gọi `preventDefault()` trước same-filter no-op;
2. backplate và foreground chia sẻ one-shot media readiness;
3. unchanged scroll frame return trước khi cấp phát position map toàn dataset;
4. hover zoom chỉ chạy với `(hover: hover) and (pointer: fine)`;
5. cleanup idempotent và gỡ listener trên external abort signal;
6. card giữ `contain: layout` nhưng bỏ paint containment để focus outline không
   bị clip; media vẫn tự clip tại media wrapper.

Impeccable detector chạy trực tiếp trên `src/site/detail.css` và trả một
`overused-font` cho Plus Jakarta Sans. Không đổi font trong delta này vì
typography Espacio parity đã được owner chốt; finding được ghi nhận như accepted
design constraint, không phải clean bill of health cho toàn site.

## Hash hiện tại

Base Git là `a8ba94ec1dadd84990b0b33f7e590f2cf76c71b1` với dirty worktree được giữ
nguyên. SHA-256:

| File | SHA-256 |
| --- | --- |
| `src/site/advertising-products/layout-core.mjs` | `260e0e319625fb92d051373048a54b3a599027c7573943e5017cc5dfdf678324` |
| `src/site/advertising-products/catalog.mjs` | `c1898be1e674d720a3e91d77c06c4ca8d3cd933207813bb57abdd0ebf86057ef` |
| `src/site/advertising-products/catalog-runtime.mjs` | `8f802143d95d4f6fcc3a99151246e375d432caae29fdd49e7655fb8a095c124a` |
| `src/site/detail.css` | `72a61d4690c1ccb660ebf878dad64758f7d612c441b4b0f27e1d3a3cdd468210` |
| `tests/site/advertising-products-layout.test.mjs` | `34ae4718611a1ab32cdf3c89efbcb7d2b8c916b2d8b755009cfcefe45dffbb2b` |
| `tests/site/advertising-products-lifecycle.test.mjs` | `aa959d9f335a4c9f05581ff0cf781ef1d0447be912aa2ce050a3d6829979b68f` |
| `tests/site/advertising-products-static.test.mjs` | `7ef0a789078cdb627c9660ffea60b4ff15aae2c857bf6bffcfe560a90b57a17e` |
| `tests/site/advertising-products-detail-routes.test.mjs` | `2151069a686bedf716ce8b23b55e5239481fd1f6e9f6928c958789a0f6cb38e6` |
| `tests/site/site.e2e.cjs` | `3d99f4940798a53388cca4997bf5b4f82bc83095968d89cd1ecba0d71dcd6953` |
| `tests/README.md` | `ae21eadeeaf1a4b5eeeb9cb02b7eb631daa62fd021fe094b40d70feb4c2f148a` |
| generated `catalog-artifact.mjs` | `a2797355f80fbca5cefaa6428f666a4f239b84ac6d2e556c5461741d9b73d4ad` |

## Full-suite boundary

Main agent chạy `pnpm qa:site` không set focused flag một lần. Advertising smoke
ở `320/390/768/1024/1440px`, filter morph, reduced filter và pending scroll đều
PASS. Runner đồng thời ghi failure ở Home portal/process, Barba trace, locale
replay, menu contract, project hero edge, service/about hero motion, SSR About
và physical-wheel About. Sau `post-route-pin fallback` PASS, runner không có
output và Node CPU không đổi hơn 6 phút; main dừng đúng process đã mở.

Trong lần full run đó, internal-link inventory chưa nhận sáu detail route. Test
đã được sửa bằng canonical slug list và focused fragment rerun xác nhận internal
link PASS; fragment còn `7/8` vì locale replay nêu trên. Không sửa các failure
khác trong delta organic masonry.

## Boundary

- Không edit hoặc stage `.site-output`; chỉ regenerate bằng build script.
- Không mở Wrangler, CMS, deploy, publish hoặc update Notion.
- Không sinh ảnh mới và không đổi hero, copy, navigation hoặc service layout.

## Chú thích thuật ngữ

- **Scoped acceptance**: đạt các gate thuộc phạm vi thay đổi, không đồng nghĩa
  toàn bộ repository green.
- **Current-hash**: source, test, runner và artifact khớp hash ghi trong report.
- **Shortest-column**: đặt card mới vào cột có đáy thấp nhất.
- **Bounded virtualization**: chỉ giữ vùng card cần thiết quanh viewport trong DOM.
- **Degraded detector**: detector chạy thiếu parser nên có thể bỏ sót finding.
