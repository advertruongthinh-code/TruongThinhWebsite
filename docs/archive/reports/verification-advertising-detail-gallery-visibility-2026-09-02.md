# Xác minh gallery sáu trang con Advertising Products

- Thời điểm: `2026-09-02T00:07:34+07:00`.
- Phạm vi: sáu slug Advertising Products, VI/EN; không gồm root Pinterest grid,
  Home, Residential hoặc Commercial.
- Trạng thái: scoped current-hash `PASS`; full Espacio parity vẫn `NOT PASS`.

## Lỗi và sửa chữa

Generator cũ đặt `data-motion-media` trên `figure`. Ảnh con tải thành công nhưng
wrapper không có media `load` lifecycle, nên thiếu `is-motion-ready` và bị giữ ở
`opacity: 0`.

Sửa chữa chỉ chuyển attribute sang chính `img`. Wrapper tiếp tục sở hữu ratio,
overflow và nền trung tính `#e9e6df`; `detail.js`, `detail.css`, asset, copy và
layout không đổi. Shared IntersectionObserver hiện có unobserve sau lần đầu nên
detail gallery fade một lần, không replay khi tái vào viewport.

## TDD và verification

Trước source edit:

- Node detail route `0/1`: RED đúng tại gallery wrapper motion hook.
- Focused browser `5/9`: bốn failure đúng tại ancestor opacity, one-shot fade và
  placeholder khi request ảnh bị chặn.

Sau source edit:

```text
node --test tests/site/advertising-products-detail-routes.test.mjs  PASS 1/1
pnpm prepare:site                                                  PASS
pnpm qa:static                                                     PASS
BASE_URL=http://127.0.0.1:8787 TT_E2E_ADVERTISING_MEDIA_ONLY=1
pnpm qa:site                                                       PASS 10/10
```

Browser matrix bao phủ:

- sáu slug, VI/EN, direct load, Barba và Back/Forward;
- opacity của ảnh và mọi ancestor, đúng hai gallery motion target trên `IMG`;
- opacity trung gian rồi final trong `0.6s ease-out`, full exit/re-entry không
  phát transition lần hai;
- request gallery bị chặn vẫn giữ box, nền trung tính và thứ tự section;
- route EN `390x844` không horizontal overflow và cả hai gallery item visible.

## Runtime spot-check

In-app Browser tại `1280x720`, route `mobile-retail`:

- hai wrapper có opacity `1`, nền `rgb(233, 230, 223)`;
- hai ảnh có `currentSrc`, `complete = true`, `naturalWidth` lần lượt `1448` và
  `1774`;
- trong transition ghi được opacity `0.969462`; sau `800ms` cả hai đạt `1`;
- motion target của cả hai là `IMG`; runtime log trả danh sách rỗng.

## Hash current

| File | SHA-256 |
| --- | --- |
| `scripts/site/prepare-static-assets.mjs` | `f0d96fef3ca48cdab20ecd503e95ec0c87ad404e987e8a6c78d769e0aede7ee7` |
| `tests/site/advertising-products-detail-routes.test.mjs` | `bdfe3f4c783f77d6332541a05c96dee92dccc9c03be9d22a27bae66c7f3c045c` |
| `tests/site/site.e2e.cjs` | `3a23dc717d26e9cb2e7ec252f914aed573575e2f318c3627e3e76721f9bfed30` |
| `src/site/detail.js` | `3ab77f5597c42104522900b356abdfde12c7abe4c5650dc36ad1b47f073d51b1` |
| `src/site/detail.css` | `670c9a83a5cf81f5fd7dc4e9151395167a2f539972e70dd58376682f444c1722` |
| Generated `mobile-retail/index.html` | `08b1e79b03afee65ba8051d80a4654835e910c9783a083fbcb89769b88f627a8` |

## Review và giới hạn

- Correctness: RED/GREEN chứng minh đúng root cause; error và mobile có test.
- Architecture: generator tiếp tục là owner shared markup; không thêm branch vào
  motion bridge hoặc CSS riêng.
- Security/performance: không thêm input, dependency, listener hoặc request.
- Ponytail review: source diff là một thay thế attribute; không có abstraction
  hoặc dòng production nào nên cắt thêm.
- Impeccable URL detector không chạy được vì workspace thiếu Puppeteer. Static
  fallback chạy degraded do thiếu HTML parser và chỉ trả hai warning
  `overused-font` cho Plus Jakarta Sans đã được owner chấp nhận. Đây không phải
  clean bill of health.
- Không dùng Computer Use vì In-app Browser, focused Playwright và runtime logs
  đã bao phủ scoped human path, phép đo lặp lại và diagnostics. Không có claim
  full parity, release clearance hoặc deploy.

## Chú thích thuật ngữ

- **Ancestor opacity**: opacity của phần tử cha làm toàn bộ ảnh con vô hình.
- **One-shot**: motion chỉ chạy một lần trong media lifecycle.
- **Placeholder**: nền giữ chỗ khi ảnh chưa tải hoặc tải lỗi.
- **Scoped current-hash**: kết luận chỉ áp dụng cho phạm vi và bộ hash đã ghi.
