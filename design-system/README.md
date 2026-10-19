# Design System Trường Thịnh

Ngôn ngữ thị giác của website public Nội thất - Quảng Cáo Trường Thịnh, viết
từ CSS và runtime đang chạy (`src/site/style.css`, `src/site/detail.css`).
Giá trị chính xác nằm trong `tokens.json`; README này nói khi nào dùng token
nào. Sửa CSS `:root` mà không sửa token thì `pnpm qa:docs` fail.

## Overview

**Creative North Star: "Công trình lên tiếng".** Công trình, vật liệu, xưởng
và tay nghề đứng trước lời quảng cáo. Nền giấy trắng, chữ ink gần đen, khoảng
trắng rộng và nhịp editorial để ảnh và typography dẫn câu chuyện.

- Giọng điệu: giàu kinh nghiệm, sáng tạo, đáng tin, trực tiếp, súc tích.
- Một font (Plus Jakarta Sans) phân vai display, body, label.
- Khung vuông, mặt phẳng, không đổ bóng container.
- Blue và orange là accent hiếm, có chủ đích.
- Motion phục vụ nội dung; reduced motion luôn có trạng thái cuối đầy đủ.
- Layout, nhịp chữ và motion có [nguồn tham khảo](#nguồn-tham-khảo) bên
  ngoài; màu, font, logo, nội dung, ảnh là của Trường Thịnh. Mọi số đo trong
  Design System là của website Trường Thịnh.

Tài liệu kèm theo:

- [Motion](motion.md): timing shell, menu, text, hover, Advertising; định dạng
  token không có family motion nên mọi timing nằm ở đây.
- [Brand guideline](brand.md): câu chuyện thương hiệu, giá trị cốt lõi và logo
  (hình dựng tỷ lệ, dạng màu, motion, state machine màu của mark).
- [Content và media](content.md): giọng điệu, VI/EN, chuẩn file ảnh.
- [Ảnh Advertising](advertising-images.md): hướng ảnh sáu nhóm Advertising.
- [Đã duyệt, chờ code](approved-designs.md): thiết kế owner đã duyệt nhưng
  website chưa chạy.

`DESIGN.md` ở gốc repo được sinh từ README này và `tokens.json` cho
Impeccable; sửa ở đây rồi chạy `node scripts/docs/build-design-md.mjs`.

Bản xem trên claude.ai: [Trường Thịnh's website](https://claude.ai/artifact/HJ1a9QvMREYAFACZzQBQ88).
Git là nguồn chuẩn; không sửa trên trang. Sau mỗi PR đổi `design-system/` đã
merge, agent chạy `node scripts/docs/stage-design-system.mjs` rồi publish thư
mục `.tmp/design-system-publish` bằng công cụ Artifact (`root` là thư mục đó,
`file_path` là `project/design-system.json`, `files` theo danh sách script in
ra). Ảnh mới hoặc đã đổi phải upload trước và ghi id vào `design-system.json`.

## Colors

Một theme sáng; website không có dark theme.

- **Surface:** `paper` cho nền trang; `white` cho chữ trên nền tối và nền
  control viewer. Hai token cùng giá trị nhưng khác vai trò, giữ cả hai.
- **Text:** `ink` cho chữ chính, `muted` cho metadata, label phụ, filter chưa
  chọn. `line` cho đường phân cách nhẹ.
- **Accent:** `orange` cho focus ring và điểm nhấn hành động; `orange-accent`
  chỉ cho hover hoặc chữ từ 24px (tương phản 3.6:1); `blue` cho nền
  `::selection` và indicator route.
- **Media:** `media-loading-surface` là nền chờ ảnh; `media-label-overlay` phủ
  ảnh portal và suggestion chưa active; `media-control-hover`,
  `media-control-active`, `control-disabled-surface`, `control-disabled-icon`
  là bốn trạng thái control viewer Advertising.
- **CTA:** `cta-black` chỉ dùng cho floating CTA.
- **Logo:** bốn token `logo-mark-*` chỉ dùng trong mark, không dùng làm màu UI.

**Quy tắc accent hiếm.** Không phủ surface bằng blue hoặc orange; công trình và
nền giấy luôn là trọng tâm.

## Typography

`"Plus Jakarta Sans", Arial, sans-serif`: font biến thiên (OFL, weight 200
tới 800, có italic) tự host ở `/assets/vendor/`, preload bản latin và
vietnamese trong `<head>`. Preview trên claude.ai nạp cùng font từ Google
Fonts. Không đổi font.

| Style | Dùng cho | Ghi chú |
| --- | --- | --- |
| `display` | Hero, headline lớn | `clamp(5rem, 9vw, 10rem)`, 600, line-height 0.86 |
| `detail-hero` | Tiêu đề trang detail | `clamp(3.25rem, 8vw, 8.5rem)`, 500, 0.9 |
| `detail-statement` | Statement trong detail | `clamp(2.7rem, 4.2vw, 4rem)`, 600 |
| `gallery-title` | Tiêu đề [Gallery ngang](components/Gallery/README.md) | `clamp(2.5rem, 4.45vw, 4rem)`, 300, 1.1, phần cuối nghiêng |
| `menu-title` | Nhóm link trong full menu | 1.8rem, 600, title dài wrap |
| `body` | Đoạn văn, metadata | 16px, 500, 1.4, word-spacing 0.1em |
| `filter` | Filter Advertising | 1rem, 700; mục chọn gạch chân 3px |
| `label` | Caption, nav nhỏ, CTA | 0.8rem, 700, thường uppercase |

`tokens.json` ghi mức trần của các size `clamp()` vì định dạng token không
nhận hàm; CSS giữ `clamp()`.

Đo trên website ngày 2026-10-04 (font-size/line-height px). Tiêu đề hero từng
trang ở [Hero](components/Hero/README.md#theo-width).

| Vai trò | 320 | 390 | 768 | 1024 | 1440 | Weight |
| --- | --- | --- | --- | --- | --- | --- |
| Kicker hero | ẩn | ẩn | 16/22.4 | 16/22.4 | 16/22.4 | 700 hoa; About không có |
| Eyebrow section | 12.8/17.92 | 12.8/17.92 | 12.8/17.92 | 12.8/17.92 | 12.8/17.92 | 700 hoa |
| Đoạn mở đầu detail | 23.2/32.48 | 23.2/32.48 | 24.8/34.72 | 24.8/34.72 | 31.68/44.35 | 500 |
| Tiêu đề editorial About | 52/52 | 52/52 | 48/48 | 59.39/59.39 | 83.52/83.52 | 600 |
| Tiêu đề CTA Advertising | 28.16/33.79 | 32/38.4 | 40/48 | 46.08/55.3 | 64.8/77.76 | 600 |
| Nav header | ẩn | ẩn | 16/22.4 | 16/22.4 | 16/22.4 | 700 hoa |
| Caption, scroll cue | 12.8/17.92 | 12.8/17.92 | 12.8/17.92 | 12.8/17.92 | 12.8/17.92 | 700 hoa |
| Số nhóm full menu | 12.8/17.92 | 12.8/17.92 | 12.8/17.92 | 12.8/17.92 | 12.8/17.92 | 500 |
| Tiêu đề nhóm full menu | 28.8/40.32 | 28.8/40.32 | 28.8/40.32 | 28.8/40.32 | 28.8/40.32 | 600 hoa |
| Mục full menu | 13.6/22.4 | 13.6/22.4 | 13.6/22.4 | 13.6/22.4 | 13.6/22.4 | 700 hoa |

Kicker hero ẩn từ 750px trở xuống (owner 2026-10-18).

**Quy tắc đọc trước.** Display tạo nhịp, body truyền thông tin, label định vị
control. Không dùng weight hay tracking display cho đoạn đọc dài. Chữ không
được clip dấu tiếng Việt (`Á`, `Ả`, `Ắ`); không dùng `overflow: hidden` để giả
chiều cao dòng. Chữ display nhiều dòng giữ line-height đủ để dấu dòng dưới
không chạm chữ dòng trên (đo ở 360 và 390px, tiếng Việt).

## Layout

- **Gutter:** `gutter` 35px, 25px ở max-width 1200px, 20px ở max-width 680px.
- **Nhịp section:** `section-gap` 90px, 70px ở max-width 1200px, 64px ở
  max-width 680px; `footer-top-gap` 64px, 48px ở max-width 750px, 0 ở
  Advertising lúc duyệt.
- **Breakpoint hay dùng:** 1200, 1024, 980/981, 960/961, 750/751, 680, 578/579
  px. Kiểm layout ở 320, 390, 768, 1024, 1440px.
- **Header:** ba track độc lập cho brand, nav và nút menu. Hàng expanded
  `header-row-height`, sticky `header-collapsed-row-height`; số đo từng
  breakpoint ở [Header](components/Header/README.md#hình-học).
- **Detail:** project grid tối đa 1500px, bốn cột desktop, gap theo gutter.
- **Advertising:** masonry tính bằng `layout-core.mjs`, không dùng CSS grid
  hoặc solver thứ hai; cột và gutter theo width ở
  [Masonry](components/Masonry/README.md#hình-học).
- **Footer:** Hotline trên số Văn phòng, trụ sở, mạng xã hội; icon thay nhãn
  chữ, không logo; desktop một dải cao bằng làn floating CTA, footer gọn ở cửa
  sổ rộng `≤750px`. Lời mời và CTA nằm trước footer.
- **Scrollbar:** desktop dùng track overlay 11px bên phải (Locomotive), không
  chiếm chỗ: thumb 7px, margin 2px, đen opacity 0.5; idle opacity 0, hiện khi
  cuộn, hover hoặc kéo; hover track `scaleX 1.45`; transition 0.3s; thumb
  cursor `grab`, khi kéo `grabbing`. Mobile và reduced motion dùng scrollbar
  native. Thumb giữ bo 10px mặc định của thư viện scroll; không áp bo đó cho
  UI ([shell spec](../docs/specs/site-shell.md#r9-scrollbar)).
- **Mobile:** tới 980px hero Home, About theo luồng chữ tự nhiên, Advertising
  tới 1024px; chữ tăng 200% vẫn không đè header, title dài xuống dòng
  ([shell spec](../docs/specs/site-shell.md#r12-layout-mobile-toàn-site)).

**Quy tắc lưới tiêu điểm.** Layout mở chỗ cho ảnh, statement và khoảng thở;
không thêm wrapper hay card grid để lấp chỗ trống.

## Elevation & Depth

Phẳng, phân lớp bằng tông: `paper`, `ink`, `line`, `media-loading-surface`.
Không có box-shadow cho container, không có text-shadow. Focus ring là tín
hiệu tương tác, không phải elevation.

## Shapes

Ngôn ngữ vuông vức: mọi khung, nút, card, media, CTA, filter, control đều góc
vuông. Token radius duy nhất là `square` bằng `0`. Trang claude.ai luôn có mục
Corner radius vì đó là khung cố định của loại artifact, nên mục này chỉ ghi
token đó.

- Hình tròn chỉ xuất hiện ở chi tiết vốn là chấm hoặc vòng, không phải góc bo
  của khung: chấm marquee, chấm timeline About, chấm chỉ báo media card, vòng
  tải ảnh, nút bật tắt motion.
- Control viewer Advertising vuông tối thiểu 48px, viền 1px `ink`, hover mở nhãn.
- Focus: `outline: 2px solid` màu `orange`, offset 4px, mọi phần tử
  `:focus-visible`; card Advertising và control trên card dùng `ink`
  ([Media card](components/MediaCard/README.md#focus-và-nhãn)).

**Quy tắc khung.** Khung vuông và đường thẳng giữ cảm giác editorial và xưởng.
Thêm radius cho card, filter hoặc shell là thay đổi design system.

## Components

Website là HTML tĩnh với CSS và runtime dùng chung, không có component API như
`Header` hay `Footer`. Mỗi mẫu có README và `preview.html` trong `components/`,
không sửa tay preview:

- `node scripts/docs/build-design-system.mjs` sinh preview, `bundle.css` và ảnh
  từ HTML, CSS website và bản chụp trong `scripts/docs/captures/`.
- `node scripts/docs/capture-design-system.mjs` (cần `pnpm dev`) chụp lại phần
  Advertising do JavaScript dựng lúc chạy.

| Nhóm | Component |
| --- | --- |
| Shell | [Header](components/Header/README.md), [Brand lockup](components/BrandLockup/README.md), [Full menu](components/FullMenu/README.md), [Footer](components/Footer/README.md), [Floating CTA](components/FloatingCta/README.md) |
| Trang | [Hero](components/Hero/README.md), [Project reel](components/ProjectReel/README.md), [Gallery ngang](components/Gallery/README.md), [Banner CTA](components/BannerCta/README.md) |
| Advertising | [Filter](components/Filter/README.md), [Media card](components/MediaCard/README.md), [Masonry](components/Masonry/README.md), [Skeleton](components/Skeleton/README.md), [Kính](components/Glass/README.md), [Primary](components/Primary/README.md), [Suggestion](components/Suggestion/README.md), [Viewer](components/Viewer/README.md), [Vệt sáng](components/LoadSweep/README.md) |

Mẫu chưa có preview riêng:

- **Project tile:** media tỷ lệ 3/4, feature 3/2, landscape 4/3; caption
  `label`; ảnh zoom khi hover; không shadow, không radius.

## Do's and Don'ts

### Do:

- **Do** lấy giá trị từ `tokens.json`, không chép hex vào chỗ khác.
- **Do** để ảnh công trình, vật liệu, xưởng dẫn hierarchy.
- **Do** giữ focus, VI/EN, alt và ARIA, reduced motion trong mọi thay đổi.
- **Do** viết copy và chọn ảnh theo [Content và media](content.md).

### Don't:

- **Don't** thêm token, radius, shadow hoặc breakpoint không có trong CSS.
- **Don't** tạo component API hay wrapper không có trong source.
- **Don't** sao chép source, media, logo, font của site tham khảo.
- **Don't** dùng màu `logo-mark-*` cho UI.
- **Don't** đưa token hay primitive của admin (`src/admin/`, CMS chưa mở) vào
  route public.

## Nguồn tham khảo

Design System chỉ mô tả Trường Thịnh. Nhịp layout, chữ và phần lớn motion
tham khảo từ [Espacio Home Design](https://espaciohomedesign.com/). Espacio chỉ
là tham khảo: giá trị đã dùng được rút vào Design System và spec, không so khớp
1:1, không là gate phát hành (owner, 2026-10-06). Các báo cáo khảo sát cũ và
script đo parity nằm trong lịch sử Git, đọc bằng `git show <commit>:<path>`:

- `3afef50:docs/reports/REFERENCE-MOTION-AUDIT.md`: audit source và đo live
  2026-08-01, chi tiết nhất.
- `fae6529:docs/archive/reports/research-espacio-parity-inventory.md`,
  `research-espacio-navbar-runtime-2026-08-27.md`,
  `research-espacio-typography-hero-route-motion-2026-08-27.md`,
  `research-espacio-project-detail-templates-2026-08-30.md`,
  `research-advertising-products-masonry-batching-2026-08-30.md` (cùng thư mục).
- `fae6529:docs/archive/guides/motion-map.md`,
  `f76c14f:docs/reference/espacio/components.md`,
  `116367c:docs/specs/full-menu-reference-parity.md`.
- `14170bb:scripts/tooling/run-layout-motion-parity.mjs` và các script
  `*motion*` cùng thư mục, `14170bb:scripts/reference/archive-reference.mjs`.

Hero dựng như title card theo cảm hứng owner chọn: chữ lớn mở cảnh của
[Resident Evil Requiem](https://www.jank.cool/resident-evil-requiems-big-text-splashes-explained/)
và màn vào level, chapter mới của game Control Resonant.

## Chú thích thuật ngữ

- **Token**: tên đặt cho một giá trị thiết kế (màu, cỡ chữ, khoảng cách).
- **Gutter**: lề hai bên trang và khoảng giữa cột.
- **Lockup**: cụm mark và chữ của logo đi cùng nhau.
- **FLIP**: kỹ thuật animate đổi cỡ bằng cách đo đầu, cuối rồi nội suy.
- **Masonry**: lưới ảnh xếp so le theo chiều cao ảnh.
- **Reduced motion**: thiết lập hệ điều hành yêu cầu giảm chuyển động.
- **Nguồn tham khảo**: site bên ngoài dùng để học nhịp thiết kế, không phải giá trị của Design System.
