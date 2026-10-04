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

`"Plus Jakarta Sans", Arial, sans-serif`, tải từ Google Fonts (400, 500, 600,
700, italic 500) trong `<head>` mỗi trang. Không đổi font.

| Style | Dùng cho | Ghi chú |
| --- | --- | --- |
| `display` | Hero, headline lớn | `clamp(5rem, 9vw, 10rem)`, 600, line-height 0.86 |
| `detail-hero` | Tiêu đề trang detail | `clamp(3.25rem, 8vw, 8.5rem)`, 500, 0.9 |
| `detail-statement` | Statement trong detail | `clamp(2.7rem, 4.2vw, 4rem)`, 600 |
| `menu-title` | Nhóm link trong full menu | 1.8rem, 600, title dài wrap |
| `body` | Đoạn văn, metadata | 16px, 500, 1.4, word-spacing 0.1em |
| `filter` | Filter Advertising | 1rem, 700; mục chọn gạch chân 3px |
| `label` | Caption, nav nhỏ, CTA | 0.8rem, 700, thường uppercase |
| `caption-ad`, `caption-ad-narrow` | Caption card masonry | 12px hoặc 10.5px theo ngưỡng 578/579px |

`tokens.json` ghi mức trần của các size `clamp()` vì định dạng token không
nhận hàm; CSS giữ `clamp()`.

**Quy tắc đọc trước.** Display tạo nhịp, body truyền thông tin, label định vị
control. Không dùng weight hay tracking display cho đoạn đọc dài. Caption
Advertising không clip dấu tiếng Việt (`Á`, `Ả`, `Ắ`), không dùng
`overflow: hidden` để giả chiều cao.

## Layout

- **Gutter:** `gutter` 35px, 25px ở max-width 1200px, 20px ở max-width 680px.
- **Nhịp section:** `section-gap` 90px, 70px ở max-width 1200px, 64px ở
  max-width 680px; `footer-top-gap` 64px, 48px ở max-width 750px.
- **Breakpoint hay dùng:** 1200, 1024, 980/981, 960/961, 750/751, 680, 578/579
  px. Kiểm layout ở 320, 390, 768, 1024, 1440px.
- **Header:** ba track độc lập cho brand, nav và nút menu. Hàng expanded
  `header-row-height`, sticky `header-collapsed-row-height`.
- **Detail:** project grid tối đa 1500px, bốn cột desktop, gap theo gutter.
- **Advertising:** masonry tính bằng `layout-core.mjs`, không dùng CSS grid
  hoặc solver thứ hai.
- **Footer:** chỉ trụ sở, mạng xã hội, bản quyền; hai cột desktop, một cột
  mobile. Lời mời và CTA nằm trước footer.

**Quy tắc lưới tiêu điểm.** Layout mở chỗ cho ảnh, statement và khoảng thở;
không thêm wrapper hay card grid để lấp chỗ trống.

## Elevation & Depth

Phẳng, phân lớp bằng tông: `paper`, `ink`, `line`, `media-loading-surface`.
Không có box-shadow cho container. Bóng duy nhất là `caption-text-shadow`
(text-shadow) cho caption nằm trên ảnh gallery. Focus ring là tín hiệu tương
tác, không phải elevation.

## Shapes

- `radius-square` (0) cho mọi khung, nút, card, media, CTA, filter.
- `radius-round` (50%) chỉ cho nút prev/next gallery 2.7rem và indicator tròn.
- Control viewer Advertising vuông tối thiểu 48px, viền 1px `ink`, hover mở nhãn.
- Focus: `outline: 2px solid` màu `orange`, offset 4px, mọi phần tử
  `:focus-visible`.

**Quy tắc khung.** Khung vuông và đường thẳng giữ cảm giác editorial và xưởng.
Thêm radius cho card, filter hoặc shell là thay đổi design system.

## Motion

Định dạng token không có family motion; mọi timing ở [Motion](motion.md).
Nguyên tắc: motion phục vụ nội dung, reduced motion đi thẳng trạng thái cuối.

## Các section khác

- [Motion](motion.md): shell, menu, text, hover, Advertising.
- [Content và media](content.md): giọng điệu, VI/EN, chuẩn file ảnh.
- [Ảnh Advertising](advertising-images.md): brief và chấm điểm ảnh.
- [Tham chiếu Espacio](reference-espacio.md): số đo site tham chiếu.

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
| Trang | [Hero](components/Hero/README.md), [Project reel](components/ProjectReel/README.md), [Gallery ngang](components/Gallery/README.md) |
| Advertising | [Filter](components/Filter/README.md), [Media card](components/MediaCard/README.md), [Masonry](components/Masonry/README.md), [Skeleton](components/Skeleton/README.md), [Primary](components/Primary/README.md), [Suggestion](components/Suggestion/README.md), [Viewer](components/Viewer/README.md), [Vòng tải](components/LoadRing/README.md) |

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
- **Don't** sao chép source, media, logo, font của site tham chiếu Espacio.
- **Don't** dùng màu `logo-mark-*` cho UI.

## Chú thích thuật ngữ

- **Token**: tên đặt cho một giá trị thiết kế (màu, cỡ chữ, khoảng cách).
- **Gutter**: lề hai bên trang và khoảng giữa cột.
- **Lockup**: cụm mark và chữ của logo đi cùng nhau.
- **FLIP**: kỹ thuật animate đổi cỡ bằng cách đo đầu, cuối rồi nội suy.
- **Masonry**: lưới ảnh xếp so le theo chiều cao ảnh.
- **Reduced motion**: thiết lập hệ điều hành yêu cầu giảm chuyển động.
