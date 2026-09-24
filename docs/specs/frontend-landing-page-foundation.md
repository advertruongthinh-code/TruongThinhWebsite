---
title: Nền tảng landing page
type: frontend
status: draft
updated: 2026-09-22
notion: none
related_decisions:
  - ../decisions/wrangler-deferred-until-cms.md
  - ../decisions/git-notion-governance.md
related_reports: []
---

# Nền tảng landing page

## 1. Vấn đề và kết quả

Public landing page phải truyền tải craft, năng lực production và consultation
path của Trường Thịnh bằng editorial storytelling dẫn dắt bởi image. Page phải
hữu ích khi chạy static nhưng vẫn để lại boundary có cấu trúc cho post do CMS
render trong tương lai.

### Thước đo thành công

- Visitor hiểu service scope, process và next action mà không cần CMS data hoặc
  animation state bị ẩn.
- VI/EN content, media alternative, route link, focus behavior và reduced motion
  vẫn hợp lệ ở viewport được hỗ trợ.
- Visual direction nhất quán với Impeccable system đã approve và surface brief
  liên kết, nếu có.

## 2. Constraint và boundary

### Luôn làm

- Giữ static rendering độc lập với D1, R2, Access và CMS secret.
- Dùng media local/đã approve, bilingual leaf content, một `h1` và process
  order cố định: Khảo sát, Tư vấn, Sản xuất, Lắp đặt.
- Giữ blue và orange làm accent, đồng thời giữ media alt requirement.

### Hỏi trước

- Visual world mới, media source mới, public claim mới, đổi route hoặc đổi shared
  component contract.
- Thêm arbitrary CMS block hoặc đổi contract `layoutKey` tương lai.

### Không bao giờ

- Copy source, media, logo, font, SVG hoặc identifying URL từ reference.
- Giấu content bắt buộc sau motion hoặc tự invent owner fact.

## 3. User workflow và acceptance

1. Visitor vào canonical locale route.
2. Viewport đầu xác lập visual thesis, service context và CTA dễ đọc.
3. Scroll reveal process, bằng chứng material/craft, project hoặc product story và
   consultation path.
4. Visitor chuyển VI/EN, điều hướng shared route, dùng keyboard/touch và thấy
   toàn bộ content khi reduced motion.

## 4. System và implementation boundary

- Source: `src/site/` với shared static shell và route-local content.
- Future public CMS projection: structured post data render qua preset trong
  allowlist; không đổi static release boundary.
- Visual input: `PRODUCT.md`, `DESIGN.md` khi có, surface brief khớp trong
  `.impeccable/surfaces/<slug>.md` và `docs/design/content.md`.

## 5. Hướng dẫn implementation

- Reuse shared shell, route, localization, media và motion contract hiện có trước
  khi thêm abstraction khác.
- Giữ content đủ structured để map vào post/layout preset tương lai nhưng không
  làm static release phụ thuộc CMS code.
- Xem image và video là typed media có rule alt text, safe crop, loading và poster;
  không embed arbitrary markup.

## 6. Thuộc tính chất lượng

| Attribute | Requirement |
| --- | --- |
| Accessibility | Dùng được bằng keyboard/touch, landmark hợp lệ, focus rõ, reduced-motion fail-open |
| Responsive | Không horizontal overflow tại 320, 390, 768, 1024 và 1440px |
| Localization | VI source cùng EN leaf text/attribute tương ứng |
| Performance | Dùng asset budget hiện có và tránh runtime work không cần thiết |
| Visual consistency | Cùng token, image grammar, spacing và motion grammar đã approve |

## 7. Kế hoạch verification

- Static: `pnpm qa:static`.
- Static runtime: `pnpm dev`; Worker verification được defer đến CMS phase.
- Browser: chạy Playwright, Computer Use và Chrome DevTools trên live route cho
  locale, focus, reduced-motion, console, network, DOM, accessibility và
  overflow khi có UI change.
- Visual: so sánh cùng viewport và state, kèm Impeccable critique evidence.

## 8. Delivery, migration và rollback

Deliver theo route/component slice nhỏ. Giữ static source và allowlist trước đó
làm rollback path. CMS integration là slice sau và không được trộn vào
landing-page release.

## 9. Reference và history

- [`frontend-route-and-content.md`](frontend-route-and-content.md)
- [`frontend-static-release.md`](frontend-static-release.md)
- [`../impeccable/index.md`](../impeccable/index.md)

## Shared media hover — accepted P6

**Module id:** `shared-media-hover`. **Status:** accepted; owner duyệt spec ngày
`2026-09-22`. P6 đạt focused technical gate; P7.2 chỉnh độ tối overlay.

Toàn bộ sáu homepage portal trong hai nhóm `#dich-vu` và `#nang-luc` là provider
của motion ảnh dùng chung. Một primitive duy nhất sở hữu media transform cho
homepage portal, Advertising parent/related card và nút suggestion inactive:

- Hover-in và hover-out chuyển scale ảnh `1 ↔ 1.15` trong `600ms ease-out`;
  cùng transform origin, clipping và compositing. Consumer không được thêm
  transition, scale khởi đầu hoặc selector override làm ảnh jump.
- Pointer, keyboard focus và reduced motion giữ semantics hiện hành. Touch không
  giả hover; reduced motion đi thẳng endpoint không transition.
- Suggestion inactive dùng đúng primitive trên. Khi được chọn, ảnh thu mượt về
  scale `1` đồng thời crossfade sang nền trắng trong `250ms ease-out`; state
  active có nền trắng, chữ đen, viền đen và không phản ứng hover.
- Primitive chỉ sở hữu image transform/transition. Overlay, label, underline,
  `aria-pressed`, link/button semantics và photo morph vẫn thuộc consumer.

Acceptance: capture `t=0`, midpoint và endpoint của portal, grid và suggestion
phải có scale sai khác không quá `0.005`, cùng duration/easing và không đổi
outer rect. Rapid hover-in/out và inactive→active không có frame nhảy scale,
flash nền hoặc animation còn chạy trên active state.

Correction P7.2 ngày `2026-09-23`: overlay của homepage portal và suggestion
inactive dùng cùng token `rgba(0, 0, 0, 0.4)` đo trực tiếp ở nút Pinterest
“Điêu khắc” lúc không hover. Normal, hover và focus giữ cùng độ tối; chỉ ảnh
tiếp tục zoom theo shared primitive. Active suggestion vẫn nền trắng, chữ/viền
đen, không có motion. Xem [P7.2](advertising-september-2026-p7-2-visual-adjustment.md).

## Portal type fit — accepted P6

**Module id:** `portal-type-fit`. **Phụ thuộc:** `shared-media-hover`.
**Status:** accepted ngày `2026-09-22`; implementation chờ duyệt plan
`AD-SEPT-2026-P6`.

- Mọi homepage portal trong `#dich-vu` và `#nang-luc` đều thuộc sweep. Trong mỗi
  nhóm, các portal ngang hàng dùng cùng font-size theo từng role
  kicker/title/subtitle ở cùng viewport. Chuỗi dài nhất của locale hiện hành
  trong nhóm quyết định cỡ chung; không auto-fit riêng từng portal. Hai nhóm
  được giữ hierarchy khác nhau nếu source hiện hành đã phân vai khác nhau.
- Kicker, title và subtitle luôn một dòng, đủ true glyph bounds và không clip ở
  VI/EN. Giữ Plus Jakarta Sans, weight, hierarchy, copy và khoảng căn hiện hành;
  không dùng scaleX, glyph compression hoặc `textLength` để ép vừa.
- Ưu tiên CSS responsive/container sizing và padding shared. Nếu text zoom làm
  ba cột không khả thi, layout được stack hoặc tăng card height theo breakpoint;
  không cho wrap hoặc cắt chữ.
- Đo sau `document.fonts.ready` tại viewport `320`, `390`, `430`, `750/751`,
  `960/961`, `1024`, `1200/1201`, `1329`, `1440`, `1569`, `1920`, cùng VI/EN,
  text zoom `100%` và `200%`. Mọi bbox phải nằm trong media frame với inset tối
  thiểu `8px`, không overflow ngang hoặc layout shift sau font ready.

Verification dùng focused browser sweep, screenshot owner viewport, keyboard,
reduced motion, console/network và Impeccable detector sau khi UI hoàn tất.
Không đổi portal copy, media, route hoặc visual world.

## Chú thích thuật ngữ

- **Landing page**: trang đích tập trung vào một mục tiêu chuyển đổi.
- **Editorial storytelling**: kể chuyện bằng nhịp nội dung, hình ảnh và bằng
  chứng thay vì chỉ liệt kê tính năng.
- **Fail-open**: reduced motion không làm nội dung biến mất; behavior an toàn vẫn
  hiển thị.
- **Typed media**: media đi kèm kind/metadata được kiểm tra.
- **Projection**: lớp chuyển dữ liệu structured thành output public.
