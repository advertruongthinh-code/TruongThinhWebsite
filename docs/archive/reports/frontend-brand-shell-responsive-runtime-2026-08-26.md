---
title: Xác minh brand shell và responsive runtime
status: pass-focused
updated: 2026-08-27
related_specs:
  - ../specs/frontend-brand-shell-responsive-runtime.md
related_decisions:
  - ../decisions/head-office-address-confirmed.md
---

# Xác minh brand shell và responsive runtime

## Kết quả

Focused slice PASS cho cập nhật brand lockup. Kết quả này không đổi trạng thái
full Espacio parity: report canonical vẫn `NOT PASS`.

## Behavior đã xác minh

1. Mười inline lockup dùng bốn path mark đã sanitize, hai live `<text>` và không
   có external reference. Title là `52px`; subtitle giảm đúng 10% từ `31.5px`
   còn `28.35px`, vẫn cùng `font-weight: 600`. CSS bù tracking VI `3.423px`, EN
   `1.778px`; `textLength="396.3" lengthAdjust="spacing"` chốt subpixel bằng
   khoảng cách chữ, không kéo giãn glyph. Locale EN dịch thành
   `INTERIORS · ADVERTISING`.
2. CSS outer bbox header là `67.515625px` trên `1200px`, `57.59375px` tại
   `768–1200px`, `49.640625px` tại `≤767px` và sticky mọi viewport. Full menu
   là `67.515625px` trên `1200px`, `59.578125px` tại hoặc dưới `1200px`.
   Browser gate xác nhận `0 ≤ titleWidth - subtitleWidth ≤ 0.2 CSS px`; DevTools
   desktop đo chênh `0.1753px`. Header và menu không clip geometry.
3. Toàn lockup scale mượt `300ms`, `expo.out` ở cả expanded → sticky và sticky
   → expanded, song song với chuyển màu mark. Mobile có hai state cùng size,
   full menu và reduced motion không chạy spatial scale. Chỉ mark chạy motion
   monochrome/CMYK; wordmark đổi màu tức thời. Chỉ còn `sequence`; mọi path kết
   thúc đúng `1s`, query motion cũ không override. Mỗi lần mở full menu, mark
   reset về đen; cụm logo hoàn tất entrance `y -140 → 0`, opacity `0 → 1`, rồi
   mark mới chuyển sang CMYK trong `1s`. Đóng menu reset lại màu đen. Reduced
   motion đến thẳng state màu cuối. Espacio live cho endpoint
   `170×67.515625px` và `125×49.640625px` nhưng đổi size ngay frame đầu; scale
   mượt là phần owner yêu cầu giữ từ Trường Thịnh cũ.
4. Tổng height navbar local khớp bốn width band Espacio: top/collapsed lần lượt
   `72.59375/70.640625px` tại `≤750px`, `132.78125/128.78125px` tại
   `751–960px`, `85.390625/81.390625px` tại `961–1200px`, và
   `102.515625/81.390625px` trên `1200px`. Collapse `100px`, middle region,
   direction travel `150px` và mouse-only force-reveal khớp source reference.
   Desktop nav dùng track width expanded độc lập với lockup đang co lại. Tại
   `751`, `768`, `960`, `1024`, `1200`, `1201`, `1440px`, từng link giữ
   `left`/width trong `1px` và toàn bộ computed typography trùng giữa expanded
   và sticky. Live Espacio đo lại tại sáu cạnh breakpoint cho max delta `0px`.
5. Footer năm route có đúng địa chỉ xác nhận, Facebook, Instagram, TikTok và
   Pinterest. Social chưa có URL nên không có `href`, không focus và có
   `aria-disabled="true"`. Divider ngang rộng đúng viewport.
6. Resize `1199px → 959px` khi đang cuộn và resize qua `981px` khi menu mở không
   restart smooth scroll, không để transform kép hoặc page trắng. Chữ
   `SÁNG TẠO` không còn clip tại `959`, `1199`, `1440px`.

## Evidence

Focused artifacts dưới đây được tạo lại từ cùng current source/test:
`style.css` SHA-256
`43c2b3b2e6831975b4ed8360f1ee8652102deee9f66fe7c6bff8bb7150feaeed`,
`motion.js`
`258070d12805084d656b23429a95c1f4b423a4ccc29a9cd37ffb70b26cc23852`,
`site.e2e.cjs`
`42dfd6b01cf6169325de68337a40dcbb8c1f7c2cb47ade1c6c00ce3875695eb1`.

| Gate | Kết quả |
| --- | --- |
| `node --check src/site/motion.js` | PASS |
| `node --check tests/site/site.e2e.cjs` | PASS |
| `pnpm qa:static` với `TT_E2E_REPORT_DIR` tạm | PASS |
| Header/navbar focused | PASS `14/14`: geometry `320–1440px`, từng desktop link giữ `left`/width trong `1px` và computed typography bất biến, intro, tone, collapse/hide/reveal, real mouse force-reveal, touch-only exclusion và scroll interaction |
| Hamburger mark color | PASS `1/1`: mỗi lần mở bắt đầu đen; color class chỉ bật khi brand đạt `y=0`, opacity `1`; bốn path đến CMYK và ba path đổi màu kết thúc `1s` |
| Full-menu motion | PASS `4/4` tại `390`, `768`, `1024`, `1440px`: shutter phủ trước copy, brand/nav đạt endpoint, route click, close/focus/cleanup đúng; divider dùng compositor `scaleY`; `tests/site/reports/navbar-menu-final/latest.json` |
| Reduced motion | PASS `6/6`: năm route tại `390px` và homepage `1024px`; content không ẩn, menu đóng trả shutter/icon về canonical state; `tests/site/reports/navbar-reduced-final/latest.json` |
| Lockup runtime gate | PASS current-hash `21/21`: 5 route, VI/EN, header/menu, viewport `320`, `390`, `768`, `959`, `981`, `1024`, `1199`, `1440`, `1569px`, English subtitle và hamburger color |
| Chrome DevTools | Local `1440x900`: ba nav link giữ nguyên `left` `428.609375/631.578125/884.578125px`, width và computed typography giữa expanded/sticky; bốn path header có `duration + delay = 1s`. Physical hamburger click ghi color start tại brand opacity `1`, translateY `0`; ba `transitionend` đều `1000ms`; console sạch. Live Espacio tại `751`, `960`, `961`, `1200`, `1201`, `1440px` có max delta link `left`/width `0px`; evidence bổ sung trong report navbar reference |
| Worker static gate | BLOCKED ngoài focused slice: `pnpm qa:worker:static` cần Worker harness, nhưng preview static `/` trả `404` thay vì `308`; không khởi động Wrangler theo boundary owner |
| Impeccable detector | Current changed targets còn đúng một warning `overused-font` cho Plus Jakarta Sans đã thuộc incumbent identity; không có finding layout/motion mới |

Không dùng Computer Use hoặc Wrangler. Worker static gate đã được gọi để lấy
evidence nhưng không thể PASS khi thiếu Worker harness; slice không đổi Worker.

## File ownership

- Runtime resize: `src/site/motion.js`.
- Brand/footer/responsive: `src/site/style.css` và năm public HTML.
- Canonical lockup: `src/site/assets/brand/truong-thinh-lockup.svg`.
- Regression: `tests/site/site.e2e.cjs`.

## Chú thích thuật ngữ

- **Focused slice**: phạm vi behavior hẹp đang được thay đổi và xác minh.
- **True bbox**: bounding box nhỏ nhất bao trọn geometry thật đã render.
- **External reference**: SVG geometry được nạp qua `use`, `image` hoặc URL ngoài.
- **Worker harness**: runtime dùng để kiểm tra route và redirect của Worker.
- **Spatial scale**: phép đổi kích thước bằng transform mà không đổi layout cuối.
- **FLIP**: kỹ thuật đo trước/sau rồi nội suy transform giữa hai layout state.
- **Tracking**: khoảng cách áp dụng đều giữa các ký tự trong một dòng chữ.
- **Subpixel**: phần kích thước nhỏ hơn một CSS pixel do trình duyệt nội suy.
