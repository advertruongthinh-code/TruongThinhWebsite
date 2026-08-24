---
title: Nền tảng landing page
type: frontend
status: draft
updated: 2026-08-09
notion: none
related_decisions:
  - ../decisions/static-first-release.md
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
  `.impeccable/surfaces/<slug>.md` và `docs/product/CONTENT-MEDIA-GUIDE.md`.

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
- Worker: `pnpm qa:worker:static`.
- Browser: chạy Playwright, Computer Use và Chrome DevTools trên live route cho
  locale, focus, reduced-motion, console, network, DOM, accessibility và
  overflow khi có UI change.
- Visual: so sánh cùng viewport và state, kèm Impeccable critique evidence.

## 8. Delivery, migration và rollback

Deliver theo route/component slice nhỏ. Giữ static source và allowlist trước đó
làm rollback path. CMS integration là slice sau và không được trộn vào
landing-page release.

## 9. Reference và history

- [`route-and-content.md`](route-and-content.md)
- [`static-release.md`](static-release.md)
- [`../impeccable/index.md`](../impeccable/index.md)

## Chú thích thuật ngữ

- **Landing page**: trang đích tập trung vào một mục tiêu chuyển đổi.
- **Editorial storytelling**: kể chuyện bằng nhịp nội dung, hình ảnh và bằng
  chứng thay vì chỉ liệt kê tính năng.
- **Fail-open**: reduced motion không làm nội dung biến mất; behavior an toàn vẫn
  hiển thị.
- **Typed media**: media đi kèm kind/metadata được kiểm tra.
- **Projection**: lớp chuyển dữ liệu structured thành output public.
