# Truong Thinh Route Specification

## Scope

- The repository root `/` is canonical.
- Route public chuẩn: `/vi/`, `/vi/residential/`, `/vi/commercial/`,
  `/vi/projects-products/`, `/vi/about/`; `/en/` có hierarchy tương đương.
  Detail dùng `/vi/projects/:slug/` và `/en/projects/:slug/`.
- Mọi route dùng cùng header, full menu, footer, VI/EN switch, Zalo CTA và motion
  system.
- Header/full menu chỉ dùng bốn canonical route cấp cao theo locale; không có
  mục con hoặc fragment điều hướng.
- Dùng copy riêng của Trường Thịnh và ảnh local/generated. Reference chỉ cung
  cấp nhịp bố cục, câu chuyện và motion; không sao chép source hoặc media.
- Mọi thay đổi copy/media phải theo
  [CONTENT-MEDIA-GUIDE.md](CONTENT-MEDIA-GUIDE.md).

## Shared contract

| File | Trách nhiệm |
| --- | --- |
| `style.css` | Token, typography, header/menu/footer, home sections, responsive |
| `motion.js` | VI/EN, route veil, header state, smooth scroll, hero, menu |
| `detail.css` | Layout cho các child/detail pages |
| `detail.js` | Detail reveal, horizontal gallery, project filters |
| `products.js` | Product directory dialog, public CMS product data |

Child pages load `../style.css`, `../detail.css`, `../motion.js` và
`../detail.js`; `projects-products` thêm `../products.js`. Không nhân bản logic
shared vào từng route.

## Content and media editing

[Content & media guide](CONTENT-MEDIA-GUIDE.md) là contract canonical cho:

- leaf VI/EN, heading, motto hero và motion hooks;
- số lượng card/gallery có thể thay đổi mà không hard-code JavaScript;
- câu chuyện và thư mục ảnh riêng cho `/vi/projects-products/`,
  `/vi/commercial/`, `/vi/residential/`;
- WebP/sRGB, pixel thật, alt song ngữ, loading, safe crop và budget;
- metadata filter quảng cáo và checklist upload/QA.
- full menu chỉ giữ bốn route cấp cao, không có mục con hoặc section hash.

Gallery/project collection có thể thêm hoặc bớt item bằng cách clone trọn
`figure`. Cụm `.service-portals` vẫn là pattern ba mục; đổi số portal là thay đổi
layout/motion và phải được giao riêng.

## Narrative by route

- `/vi/` và `/en/`: hero ba lĩnh vực, editorial process, ba portal, câu chuyện hơn 20 năm,
  năng lực vật liệu/xưởng/thi công, công trình và CTA.
- `/vi/residential/` và `/en/residential/`: full-bleed opening, lời hứa nhà ở, chuỗi không gian/dự án, vật liệu
  và tay nghề, quy trình, CTA khảo sát.
- `/vi/commercial/` và `/en/commercial/`: opening theo vận hành, shop/showroom, F&B/cafe, văn phòng,
  durability/material story, selected builds, CTA khảo sát.
- `/vi/projects-products/` và `/en/projects-products/`: identity hero
  **Công trình & sản phẩm** / **Projects & products**, rồi đến công trình,
  statement,
  filterable kiosk/mobile retail/signage grid, product directory, chuỗi gia
  công, bằng chứng xưởng và CTA khảo sát.
- `/vi/about/` và `/en/about/`: kinh nghiệm hơn 20 năm, xưởng và con người, cách làm, cam kết
  và CTA khảo sát.

## Process contract

Thứ tự duy nhất trên mọi route:

1. Khảo sát
2. Tư vấn
3. Sản xuất
4. Lắp đặt

Tiếng Anh tương ứng:
**Survey → Consultation → Production → Installation**.

Không đảo thứ tự hoặc đổi “Tư vấn” thành một bước diễn ra trước “Khảo sát”.

## i18n contract

- Tiếng Việt là source text; tiếng Anh đặt tại node lá `data-en`.
- Thuộc tính dùng `data-en-alt`, `data-en-aria-label`, `data-en-content`.
- `<title>` dùng `data-en`; script trong `<head>` đặt `lang` sớm để giảm flash.
- Worker SSR locale/head trước response; `motion.js` điều hướng counterpart
  locale, giữ query/vị trí đọc và loại fragment. `localStorage` chỉ fallback
  ngoài canonical Worker.
- Copy nhìn thấy, label, title, alt, description và aria đều phải có cặp VI/EN
  nếu nội dung khác nhau.

## Motion contract

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
- Masked display lines: 1.9s `power4.out`, stagger 0.1s.
- Hover media: scale 1.1–1.15 trong 0.6s.
- Desktop dùng Locomotive smoothing; mobile dùng native scroll.
- `prefers-reduced-motion` bỏ transform/autoplay không thiết yếu và không được
  để nội dung ở trạng thái ẩn.

## Image direction

- Architectural editorial photography, vật liệu thật, bối cảnh Việt Nam.
- Không khuôn mặt nhận diện; ưu tiên không gian, dụng cụ, bàn tay hoặc người nhoè
  chuyển động.
- Ngoại lệ đã được duyệt: `assets/site/expanded/legacy-team.webp`.
- Không logo, chữ giả, watermark hoặc media sao chép từ reference.
- Xanh và cam là điểm nhấn, không phải nền toàn trang.
- Ảnh nội dung phải có `alt` VI và `data-en-alt` EN.

## Content placeholders

Không tự suy đoán hoặc công bố:

- URL/số Zalo.
- Địa chỉ trụ sở.
- Năm thành lập chính xác.
- Chính sách/thời hạn bảo hành.

Trong khi chờ dữ kiện, dùng CTA trung tính và “Thông tin đang cập nhật”.

## Acceptance

- Portal/hero title: qualifier regular, service name semibold.
- Heritage inline images còn khoảng thở dọc ở mọi breakpoint.
- Menu, filters, gallery, route links, Zalo CTA và back-to-top dùng được bằng bàn
  phím/touch.
- Không overflow ngang tại 320, 390, 768, 1024 và 1440 px.
- Console và network sạch; landmarks, heading hierarchy và focus hợp lệ.
- VI/EN đổi và giữ qua reload.
- Playwright checks nằm trong `tests/`; báo cáo ở `tests/reports/`.
- Visual/a11y/console/network được kiểm tra bằng Chrome DevTools trước release.
