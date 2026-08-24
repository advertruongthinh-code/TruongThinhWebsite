---
title: Contract route và content
type: frontend
status: accepted
updated: 2026-08-09
notion: none
related_decisions: []
related_reports: []
---

# Đặc tả route Trường Thịnh

## Scope

- Root repository `/` là canonical.
- Public route chuẩn: `/vi/`, `/vi/residential/`, `/vi/commercial/`,
  `/vi/advertising-products/`, `/vi/about/`; `/en/` có hierarchy tương đương.
  Detail dùng `/vi/projects/:slug/` và `/en/projects/:slug/`.
- Mọi route dùng cùng header, full menu, footer, VI/EN switch, Zalo CTA và motion
  system.
- Header/full menu chỉ dùng bốn canonical route cấp cao theo locale; không có
  mục con hoặc fragment navigation.
- Dùng copy riêng của Trường Thịnh và image local/generated. Reference chỉ cung
  cấp nhịp layout, storytelling và motion; không copy source hoặc media.
- Mọi thay đổi copy/media phải theo
  [`CONTENT-MEDIA-GUIDE.md`](../product/CONTENT-MEDIA-GUIDE.md).

## Contract dùng chung

| File | Trách nhiệm |
| --- | --- |
| `style.css` | Token, typography, header/menu/footer, home section, responsive |
| `motion.js` | VI/EN, route veil, header state, smooth scroll, hero, menu |
| `detail.css` | Layout cho child/detail page |
| `detail.js` | Detail reveal, horizontal gallery, project filter |

Child page load `../style.css`, `../detail.css`, `../motion.js` và
`../detail.js`. Filter của `advertising-products` cũng do `detail.js` sở hữu;
product directory runtime cũ đã retire. Không nhân bản shared logic vào từng
route.

## Edit content và media

[Content & media guide](../product/CONTENT-MEDIA-GUIDE.md) là canonical
contract cho:

- leaf VI/EN, heading, hero motto và motion hook;
- số lượng card/gallery có thể thay đổi mà không hard-code JavaScript;
- story và image directory riêng cho `/vi/advertising-products/`,
  `/vi/commercial/`, `/vi/residential/`;
- WebP/sRGB, pixel thật, alt song ngữ, loading, safe crop và budget;
- advertising filter metadata và upload/QA checklist.
- full menu chỉ giữ bốn route cấp cao, không có mục con hoặc section hash.

Gallery/project collection có thể thêm hoặc bớt item bằng cách clone trọn
`figure`. Cụm `.service-portals` vẫn là pattern ba mục; đổi số portal là
thay đổi layout/motion và phải được giao riêng.

## Narrative theo route

- `/vi/` và `/en/`: hero ba lĩnh vực, editorial process, ba portal, câu chuyện hơn 20 năm,
  năng lực vật liệu/xưởng/thi công, công trình và CTA.
- `/vi/residential/` và `/en/residential/`: full-bleed opening, lời hứa nhà ở, chuỗi không gian/dự án,
  vật liệu và tay nghề, quy trình, CTA khảo sát.
- `/vi/commercial/` và `/en/commercial/`: opening theo vận hành, shop/showroom, F&B/cafe, văn phòng,
  durability/material story, selected build, CTA khảo sát.
- `/vi/advertising-products/` và `/en/advertising-products/`: identity hero
  **Sản phẩm Quảng cáo** / **Advertising products**, rồi đến công trình,
  statement, filterable kiosk/mobile retail/signage grid, chuỗi gia công, bằng
  chứng xưởng và CTA khảo sát.
- `/vi/about/` và `/en/about/`: kinh nghiệm hơn 20 năm, xưởng và con người, cách làm, cam kết
  và CTA khảo sát.

## Contract quy trình

Thứ tự duy nhất trên mọi route:

1. Khảo sát
2. Tư vấn
3. Sản xuất
4. Lắp đặt

Tiếng Anh tương ứng:
**Survey → Consultation → Production → Installation**.

Không đảo thứ tự hoặc đổi “Tư vấn” thành một bước diễn ra trước “Khảo sát”.

## Contract i18n

- Tiếng Việt là source text; tiếng Anh đặt tại leaf node `data-en`.
- Thuộc tính dùng `data-en-alt`, `data-en-aria-label`,
  `data-en-content`.
- `<title>` dùng `data-en`; script trong `<head>` đặt `lang` sớm để giảm flash.
- Worker SSR locale/head trước response; `motion.js` điều hướng counterpart
  locale, giữ query/vị trí đọc và loại fragment. `localStorage` chỉ fallback
  ngoài canonical Worker.
- Copy nhìn thấy, label, title, alt, description và aria đều phải có cặp VI/EN
  nếu nội dung khác nhau.

## Contract motion

- Route veil: cover 0.75s, uncover 1s, `power4.inOut`; veil nằm dưới header,
  header xoá `is-hidden` khi bắt đầu chuyển route.
- Nếu route đổi từ full menu, menu reverse và route cover chạy đồng thời; URL
  chỉ commit sau khi cả hai hoàn tất.
- `pageshow.persisted` phải dọn dialog, page scale và route veil để Back/Forward
  từ BFCache không giữ state cũ.
- Header: collapse sau 100px; hide/show sau 150px di chuyển có hướng; force-show
  trong 350px đầu; transition 1s `cubic-bezier(0,0,.1,.99)`. Khi route đổi,
  `is-hidden` được xoá và header giữ nguyên trên veil.
- Generic media reveal: 0.6s `cubic-bezier(0,0,.26,1)`.
- Masked display line: 1.9s `power4.out`, stagger 0.1s.
- Hover media: scale 1.1–1.15 trong 0.6s.
- Desktop dùng Locomotive smoothing; mobile dùng native scroll.
- `prefers-reduced-motion` bỏ transform/autoplay không thiết yếu và không được
  để content ở trạng thái ẩn.

## Định hướng image

- Architectural editorial photography, vật liệu thật, bối cảnh Việt Nam.
- Không recognizable face; ưu tiên không gian, tool, bàn tay hoặc người bị motion
  blur.
- Exception đã approve: `assets/content/shared/legacy-team.webp`.
- Không logo, text giả, watermark hoặc media copy từ reference.
- Xanh và cam là accent, không phải nền toàn trang.
- Content image phải có alt VI và `data-en-alt` EN.

## Content placeholder

Không tự suy đoán hoặc công bố:

- URL/số Zalo.
- Địa chỉ trụ sở.
- Năm thành lập chính xác.
- Chính sách/thời hạn bảo hành.

Trong khi chờ dữ kiện, dùng CTA trung tính và “Thông tin đang cập nhật”.

## Acceptance

- Portal/hero title: qualifier regular, service name semibold.
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
