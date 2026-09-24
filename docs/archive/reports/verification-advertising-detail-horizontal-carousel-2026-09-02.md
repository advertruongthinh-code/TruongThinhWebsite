# Verification carousel ngang trang chi tiết Advertising Products

- Ngày kiểm tra: `2026-09-02`
- Git base: `a8ba94ec1dadd84990b0b33f7e590f2cf76c71b1`
- Phạm vi: sáu route con Advertising Products, cả VI và EN
- Kết luận: `SCOPED PASS`; không phải full Espacio parity, release hoặc deploy

## Kết quả

Mọi block `gallery` trong sáu composition hiện dùng một progressive horizontal
carousel. Số instance theo route là `1/3/1/2/1/1`; pool, hero và các block
`single`/`double`/`banner` vẫn partition đúng `109` source.

Runtime pin `swiper@14.2.0` và chỉ phát core, Mousewheel, Pagination cùng A11y.
Config dùng slide có chiều rộng theo intrinsic ratio, dots, drag/touch và wheel
ngang `forceToAxis`; không autoplay, loop hoặc arrow. Cùng markup vẫn là native
horizontal scroll-snap khi module hoặc stylesheet bị chặn. Cách dùng module,
pagination, breakpoints và destroy bám
[Swiper API](https://swiperjs.com/swiper-api); version pin được đối chiếu với
[Swiper v14](https://swiperjs.com/blog/swiper-v14).

Geometry đạt contract:

- outer band `15px` đến `750px`, `25px` từ `751–1200px`, `35px` trên desktop;
- gap `10px` dưới `600px`, `20px` từ `600px`;
- media cao tối đa `75vw` trên mobile, `50vw` trên desktop;
- slide thường có next-slide peek; ảnh siêu rộng cap theo usable width;
- không crop, stretch, backplate, figure stretch hoặc horizontal overflow.

Chrome dùng scrollbar không overlay từng làm `100vw` tạo biên trái/phải lệch.
Runtime hiện đồng bộ `documentElement.clientWidth` vào scoped CSS variable trên
mount và resize; viewport lớn hơn `1570px` breakout theo client width thật. Cách
này giữ biên đối xứng mà không đổi article gutter hoặc scroll contract chung.

## TDD và QA

RED trước source đúng nguyên nhân: static contract thiếu Swiper, lifecycle thiếu
import/mount và browser lane không tìm được carousel. Sau implementation:

| Gate | Kết quả |
| --- | --- |
| `pnpm prepare:site` | PASS |
| Detail route contract | `1/1` PASS |
| Detail lifecycle contract | `1/1` PASS |
| `pnpm qa:static` | PASS |
| `TT_E2E_ADVERTISING_CAROUSEL_ONLY=1` | `8/8` PASS: bảy viewport và dependency-blocked fallback |
| `TT_E2E_ADVERTISING_MEDIA_ONLY=1` | `10/10` PASS: sáu route, VI/EN, direct, Barba và history |
| `pnpm audit --prod` | Không có vulnerability đã biết |
| Scoped `git diff --check` | PASS; chỉ có cảnh báo CRLF lịch sử của file E2E |

Carousel lane đo tại `390x844`, `750x900`, `751x900`, `1200x900`,
`1201x900`, `1440x900` và `1920x1080`. Probe khóa outer band, gap, max-height,
peek, extreme-wide slide, intrinsic ratio, dots bằng snap points, fallback,
overflow và box integrity.

Impeccable detector đã loại warning transition trên property `height`. Warning
còn lại là `overused-font` cho Plus Jakarta Sans; giữ lại vì typography Espacio
là design constraint đã được owner duyệt, không phải finding carousel.

## Three-way runtime evidence

1. Playwright lặp được `8/8` carousel case và `10/10` detail/media lifecycle.
2. DevTools trên `mobile-retail` xác nhận `3` carousel initialized, slide
   `5/4/4`, pagination/snap points `5/5`, `3/3`, `3/3`, outer `25/25px`, gap
   `20px`, overflow `0`; mọi Swiper CSS/JS/module request trả `200`, console
   không có warning/error.
3. Human path trong Chrome trên route VI click dot 3 làm `activeIndex = 2` và
   đổi media nhìn thấy. Chuyển locale bằng menu tới
   `/en/advertising-products/mobile-retail/` giữ title `Mobile retail`, caption
   English và đủ nút `Go to slide` của cả ba carousel.

Human drag được thử nhưng không tạo thay đổi active index trong lần thao tác đó;
không dùng lần thử này làm bằng chứng drag. Contract drag/touch được giữ trong
Swiper config và regression tự động; owner acceptance cuối vẫn cần một spot-check
VI/EN trên local preview.

## Current-hash source và test

| File | SHA-256 |
| --- | --- |
| `package.json` | `b12f65eb3ea1c0c07c063474f668a3518cb55bfa82cefa5e3d5373a9fe7af496` |
| `pnpm-lock.yaml` | `ff367bededbae1ab2d7382a63fe23b3e4fe03c374cbb130740e806b9b02e53ec` |
| `scripts/site/prepare-static-assets.mjs` | `8d834708579c61b4601770f3eb3506f659b8d5d56a3224242766db48b025635a` |
| `src/site/detail.js` | `3bf0d04486312ba2376ce502396b9e4f430b73651127fc388895d04516936e1b` |
| `src/site/detail.css` | `01a28bd9361f836709db205984e09bd2ba6b7a9dd4834a6b369f85f127286eea` |
| `src/site/advertising-products/detail-template.html` | `ebcf029029b5ede75ebf9a1369fae01f1bb45516450774889cbff115e92b89aa` |
| `tests/site/advertising-products-detail-routes.test.mjs` | `7e8de0ad170c2a40b9daddd7e005b1885a929dbf5933c53294f1a9b32b9bac52` |
| `tests/site/advertising-products-lifecycle.test.mjs` | `edb07504c302f2ac593a2daed17a4cee985e277c09dc3c88297b2721a468c18b` |
| `tests/site/site.e2e.cjs` | `e72fb9f54e4487b9cae8faa908f68cbf0c8155d264e2e18d0e7c7218974595a4` |

## Ranh giới còn lại

- Không chạy hoặc tuyên bố full `pnpm qa:site` green; full Espacio parity vẫn
  `NOT PASS` theo report canonical.
- Không update Notion, commit, push, deploy, bật Wrangler hoặc sửa generated
  `.site-output` trực tiếp.
- Không áp dụng carousel cho parent Pinterest grid, Residential hoặc Commercial.

## Chú thích thuật ngữ

- **Progressive enhancement**: tăng cường hành vi khi dependency sẵn sàng nhưng
  giữ giao diện cơ bản dùng được khi dependency lỗi.
- **Native fallback**: horizontal scroll-snap do browser cung cấp, không cần
  Swiper hydrate.
- **Next-slide peek**: phần nhỏ của slide kế tiếp còn nhìn thấy ở cạnh carousel.
- **Current-hash**: evidence khớp đúng bộ hash source và test được ghi trong report.
- **Human path**: chuỗi thao tác UI trực tiếp như người dùng thật.
