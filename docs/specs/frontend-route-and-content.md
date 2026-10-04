---
title: Contract route và content
type: frontend
status: accepted
updated: 2026-09-28
notion: none
related_decisions:
  - ../decisions/head-office-address-confirmed.md
related_reports: []
---

# Đặc tả route Trường Thịnh

## Scope

- Root repository `/` là canonical.
- Public route chuẩn: `/vi/`, `/vi/residential/`, `/vi/commercial/`,
  `/vi/advertising-products/`, `/vi/about/`; `/en/` có hierarchy tương đương.
  Sáu slug Advertising `/{locale}/advertising-products/{slug}/` là compatibility
  entrypoint, chuyển sang parent với `?category={slug}` theo
  [AD-BROWSE-R1](advertising-photo-browse.md). Photo detail dùng query `photo`,
  optional `tag`, trên parent canonical.
  `/{locale}/projects/:slug/` là contract CMS tương lai, chưa thuộc static runtime.
- Mọi route dùng cùng header, full menu, footer, VI/EN switch, Zalo CTA và motion
  system.
- Cấu trúc và nhãn full menu theo [content guide](../../design-system/content.md#gallery-và-card);
  route và query phải giữ canonical locale, không dùng fragment navigation.
- Dùng copy riêng của Trường Thịnh và image local/generated. Reference chỉ cung
  cấp nhịp layout, storytelling và motion; không copy source hoặc media.
- Mọi thay đổi copy/media phải theo
  [`CONTENT-MEDIA-GUIDE.md`](../../design-system/content.md).

## Contract dùng chung

| File | Trách nhiệm |
| --- | --- |
| `style.css` | Token, typography, header/menu/footer, home section, responsive |
| `motion.js` | VI/EN, route veil, header state, smooth scroll, hero, menu |
| `detail.css` | Layout cho child/detail page |
| `detail.js` | Detail reveal, horizontal gallery, điều phối catalog lifecycle |
| `advertising-products/catalog-runtime.mjs` | Grid/filter, virtualization và media replay |

Child page load `../style.css`, `../detail.css`, `../motion.js` và
`../detail.js`. Runtime này chờ dependency rồi mount catalog; grid/filter thuộc
`catalog-runtime.mjs`, không thuộc generic gallery. Không nhân bản shared logic
vào từng route. Reuse contract ở [component reference](../design/components.md).

Sáu category detail composition cũ đã được
[AD-BROWSE-R1](advertising-photo-browse.md) supersede bằng photo browse tại
parent route. [Decision shared template](../decisions/shared-advertising-product-detail-template.md)
giữ provenance lịch sử, không là sáu template đang chạy. Không copy reference
source hoặc media.

## Edit content và media

[Content & media guide](../../design-system/content.md) là canonical
contract cho:

- leaf VI/EN, heading, hero motto và motion hook;
- số lượng card/gallery có thể thay đổi mà không hard-code JavaScript;
- story và image directory riêng cho `/vi/advertising-products/`,
  `/vi/commercial/`, `/vi/residential/`;
- WebP/sRGB, pixel thật, alt song ngữ, loading, safe crop và budget;
- advertising filter metadata và upload/QA checklist.
- cấu trúc/copy full menu theo mục nguồn chuẩn trong content guide.

Gallery/project collection có thể thêm hoặc bớt item bằng cách clone trọn
`figure`. Cụm `.service-portals` vẫn là pattern ba mục; đổi số portal là
thay đổi layout/motion và phải được giao riêng.

## Narrative theo route

[Route narrative](../../design-system/content.md#mạch-nội-dung-theo-route) giữ story/copy;
surface briefs tại `.impeccable/surfaces/` giữ mode và intent của từng surface.

## Contract quy trình

[Product process](../../PRODUCT.md) và [content guide](../../design-system/content.md)
sở hữu thứ tự/copy quy trình; không định nghĩa lại ở route spec.

## Advertising products routes

- Parent canonical là `/{locale}/advertising-products/`; sáu compatibility slug dùng
  `/{locale}/advertising-products/{slug}/` với `kiosk-posm`, `mobile-retail`,
  `signage-raised-letters`, `office-signs-wayfinding`,
  `led-displays-lightboxes`, `print-decals`.
- Generator `scripts/site/prepare-static-assets.mjs` tạo HTML compatibility với
  canonical parent và `location.replace` sang category. Test phải chờ URL đích;
  không gọi12 slug VI/EN là12 canonical detail template độc lập.

## Contract i18n

- Copy/attribute song ngữ theo [Leaf text và VI/EN](../../design-system/content.md#song-ngữ-vien).
- `<title>` dùng `data-en`; script trong `<head>` đặt `lang` sớm để giảm flash.
- Worker SSR locale/head trước response; `motion.js` điều hướng counterpart
  locale, giữ query/vị trí đọc và loại fragment. `localStorage` chỉ fallback
  ngoài canonical Worker.
- Copy nhìn thấy, label, title, alt, description và aria đều phải có cặp VI/EN
  nếu nội dung khác nhau.

## Contract motion

[Motion design system](../../design-system/motion.md#shell) sở hữu timing/state.
Runtime integration và test phải ref contract đó; không định nghĩa timeline thứ hai.

## Định hướng image

[Content/media guide](../../design-system/content.md#chuẩn-file-ảnh) sở hữu image policy;
[style guide](../design/style-guide.md) chỉ dẫn cách áp dụng palette/image grammar.

## Owner fact và content placeholder

[Owner facts](../../design-system/content.md#song-ngữ-vien) dẫn
product/decision canonical. Route không tự tạo bản sao fact hoặc placeholder policy.

## Acceptance

- Typography portal/hero theo [design system](../../DESIGN.md#typography).
- Heritage inline image còn khoảng thở dọc ở mọi breakpoint.
- Menu, filter, gallery, route link, Zalo CTA và back-to-top dùng được bằng bàn
  phím/touch.
- Không horizontal overflow tại 320, 390, 768, 1024 và 1440 px.
- Console và network sạch; landmark, heading hierarchy và focus hợp lệ.
- VI/EN đổi và giữ qua reload.
- Playwright check nằm trong `tests/site/`; report ở `tests/site/reports/`.
- Visual/a11y/console/network được inspect bằng Chrome DevTools trước release.

## Chú thích thuật ngữ

- **i18n**: internationalization, cấu trúc để hỗ trợ nhiều locale.
- **SSR**: render nội dung ở server/Worker trước khi browser nhận response.
- **BFCache**: browser back-forward cache dùng để khôi phục document nhanh.
- **Leaf node**: node cuối chứa text hoặc attribute song ngữ.
- **Breakpoint**: ngưỡng viewport làm layout chuyển state.
- **Canonical route**: URL chuẩn được dùng làm đích public và SEO.
