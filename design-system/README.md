# Design System Trường Thịnh

Ngôn ngữ thị giác của website public Nội thất - Quảng Cáo Trường Thịnh. Giá trị chính xác nằm trong `tokens.json`;
README này nói khi nào dùng token nào. Ảnh trong preview chỉ để minh họa; logo và màu thương hiệu là chuẩn.

## Overview

**Creative North Star: "Công trình lên tiếng".** Công trình, vật liệu, xưởng và tay nghề đứng trước lời quảng
cáo. Nền giấy trắng, chữ ink gần đen, khoảng trắng rộng và nhịp editorial để ảnh và typography dẫn câu chuyện.

- Giọng điệu: giàu kinh nghiệm, sáng tạo, đáng tin, trực tiếp, súc tích.
- Một font (Plus Jakarta Sans) phân vai display, body, label.
- Khung vuông, mặt phẳng, không đổ bóng container.
- Blue và orange là accent hiếm, có chủ đích.
- Motion phục vụ nội dung; reduced motion luôn có trạng thái cuối đầy đủ.

Section kèm theo: [Motion](motion.md) (mọi timing), [Brand guideline](brand.md) (câu chuyện, logo),
[Content và media](content.md) (giọng văn, VI/EN, file ảnh), [Ảnh Advertising](advertising-images.md).

## Colors

Một theme sáng; website không có dark theme.

- **Surface:** `paper` cho nền trang; `white` cho chữ trên nền tối và nền control viewer. Hai token cùng giá trị
  nhưng khác vai trò.
- **Text:** `ink` cho chữ chính, `muted` cho metadata, label phụ, filter chưa chọn. `line` cho đường phân cách nhẹ.
- **Accent:** `orange` cho focus ring và điểm nhấn hành động; `orange-accent` chỉ cho hover hoặc chữ từ 24px
  (tương phản 3.6:1); `blue` cho nền `::selection` và indicator route.
- **Media:** `media-loading-surface` là nền chờ ảnh; `media-label-overlay` (0.5) phủ ảnh portal; nút gợi ý chưa
  active dùng lớp tối 0.5 riêng; bốn token `media-control-*`, `control-disabled-*` là trạng thái control viewer Advertising.
- **CTA:** `cta-black` chỉ dùng cho floating CTA.
- **Logo:** bốn token `logo-mark-*` chỉ dùng trong mark ([Brand](brand.md)).

**Quy tắc accent hiếm.** Không phủ surface bằng blue hoặc orange; công trình và nền giấy luôn là trọng tâm.

## Typography

`"Plus Jakarta Sans", Arial, sans-serif`: font biến thiên (weight 200 tới 800, có italic), tự host trên website.
Không đổi font.

| Style | Dùng cho | Ghi chú |
| --- | --- | --- |
| `display` | Hero, headline lớn | `clamp(5rem, 9vw, 10rem)`, 600, line-height 0.86 |
| `detail-hero` | Tiêu đề trang detail | `clamp(3.25rem, 8vw, 8.5rem)`, 500, 0.9 |
| `detail-statement` | Statement trong detail | `clamp(2.7rem, 4.2vw, 4rem)`, 600 |
| `gallery-title` | Tiêu đề [Gallery ngang](components/Gallery/README.md) | `clamp(2.5rem, 4.45vw, 4rem)`, 300, 1.1, phần cuối nghiêng |
| `menu-title` | Nhóm link trong full menu | 1.8rem, 600, title dài wrap |
| `body` | Đoạn văn, metadata | 16px, 500, 1.4, word-spacing 0.1em |
| `filter` | Filter Advertising | 1rem, 700; mục chọn gạch chân 3px |
| `label` | Caption, nav nhỏ, CTA, eyebrow | 0.8rem, 700, thường uppercase |

Cỡ chữ theo từng độ rộng màn hình ở README component (ví dụ [Hero](components/Hero/README.md#theo-width)).

**Quy tắc đọc trước.** Display tạo nhịp, body truyền thông tin, label định vị control. Không dùng weight hay
tracking display cho đoạn đọc dài. Chữ không được clip dấu tiếng Việt (`Á`, `Ả`, `Ắ`); không dùng
`overflow: hidden` để giả chiều cao dòng. Chữ display nhiều dòng giữ line-height đủ để dấu dòng dưới không chạm
chữ dòng trên.

## Layout

- **Gutter:** `gutter` 35px, 25px ở max-width 1200px, 20px ở max-width 680px.
- **Nhịp section:** `section-gap` 90px, 70px ở max-width 1200px, 64px ở max-width 680px; `footer-top-gap` 64px,
  48px ở max-width 750px.
- **Breakpoint hay dùng:** 1200, 1024, 980/981, 960/961, 750/751, 680, 578/579 px. Kiểm layout ở 320, 390, 768,
  1024, 1440px.
- **Header:** ba track độc lập cho brand, nav và nút menu
  ([Header](components/Header/README.md#hình-học)).
- **Detail:** project grid tối đa 1500px, bốn cột desktop, gap theo gutter.
- **Advertising:** masonry tính bằng `layout-core.mjs`, không dùng CSS grid
  ([Masonry](components/Masonry/README.md#hình-học)).
- **Footer:** Hotline trên số Văn phòng, trụ sở, mạng xã hội; icon thay nhãn chữ, không logo. Lời mời và CTA nằm
  trước footer ([Footer](components/Footer/README.md)).
- **Scrollbar:** desktop dùng track overlay mảnh, không chiếm chỗ; mobile và reduced motion dùng scrollbar native
  ([shell spec](../docs/specs/site-shell.md#r9-scrollbar)).
- **Mobile:** chữ tăng 200% vẫn không đè header, title dài xuống dòng
  ([shell spec](../docs/specs/site-shell.md#r12-layout-mobile-toàn-site)).

**Quy tắc lưới tiêu điểm.** Layout mở chỗ cho ảnh, statement và khoảng thở; không thêm wrapper hay card grid để
lấp chỗ trống.

## Elevation & Depth

Phẳng, phân lớp bằng tông: `paper`, `ink`, `line`, `media-loading-surface`. Không có box-shadow cho container.
Text-shadow chỉ có một ngoại lệ: chữ trắng trên ảnh ngoài hero (portal, "Giữ nghề", CTA) dùng `text-shadow-d` (hai lớp, vành `0 0 2px` đen `0.5` dưới
quầng `0 0 12px` đen `0.4`) cạnh lớp tối sẵn có; chữ `ink` trên giấy không có bóng. Kính ([Glass](components/Glass/README.md)) là lớp mờ trên ảnh, không phải bóng. Focus ring
là tín hiệu tương tác, không phải elevation.

## Shapes

Mọi khung, nút, card, media, CTA, filter, control đều góc vuông. Token radius duy nhất là `square` bằng `0`.

- Hình tròn chỉ ở chi tiết vốn là chấm hoặc vòng: chấm marquee, chấm timeline About, chấm chỉ báo media card và
  gallery, vòng tải ảnh, nút bật tắt motion.
- Control viewer Advertising vuông tối thiểu 48px, viền 1px `ink`, hover mở nhãn.
- Focus: `outline: 2px solid` màu `orange`, offset 4px; card Advertising và control trên card dùng `ink`
  ([Media card](components/MediaCard/README.md#focus-và-nhãn)).

**Quy tắc khung.** Khung vuông và đường thẳng giữ cảm giác editorial và xưởng. Thêm radius cho card, filter hoặc
shell là thay đổi design system.

## Components

Website là HTML tĩnh với CSS và runtime dùng chung, không có component API. Mỗi mẫu có README (quy tắc, số đo)
và preview dựng từ chính CSS website.

| Nhóm | Component |
| --- | --- |
| Shell | [Header](components/Header/README.md), [Brand lockup](components/BrandLockup/README.md), [Full menu](components/FullMenu/README.md), [Footer](components/Footer/README.md), [Floating CTA](components/FloatingCta/README.md) |
| Trang | [Hero](components/Hero/README.md), [Project reel](components/ProjectReel/README.md), [Gallery ngang](components/Gallery/README.md), [Banner CTA](components/BannerCta/README.md), [Vệt sáng](components/LoadSweep/README.md) |
| Advertising | [Filter](components/Filter/README.md), [Media card](components/MediaCard/README.md), [Masonry](components/Masonry/README.md), [Skeleton](components/Skeleton/README.md), [Kính](components/Glass/README.md), [Primary](components/Primary/README.md), [Suggestion](components/Suggestion/README.md), [Viewer](components/Viewer/README.md) |

Project tile chưa có preview riêng: media tỷ lệ 3/4, feature 3/2, landscape 4/3; caption `label`; ảnh zoom khi
hover; không shadow, không radius.

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
- **Don't** đưa token hay primitive của admin (`src/admin/`, CMS chưa mở) vào route public.

## Nguồn tham khảo

Design System chỉ mô tả Trường Thịnh; mọi số đo là của website Trường Thịnh. Nhịp layout, chữ và phần lớn motion
tham khảo [Espacio Home Design](https://espaciohomedesign.com/): giá trị đã dùng được rút vào Design System và
spec, không so khớp 1:1, không là gate phát hành (owner, 2026-10-06). Khảo sát cũ nằm trong lịch sử Git.

Hero dựng như title card theo cảm hứng owner chọn: chữ lớn mở cảnh của
[Resident Evil Requiem](https://www.jank.cool/resident-evil-requiems-big-text-splashes-explained/) và màn vào
level, chapter mới của game Control Resonant.

## Chú thích thuật ngữ

- **Token**: tên đặt cho một giá trị thiết kế (màu, cỡ chữ, khoảng cách).
- **Gutter**: lề hai bên trang và khoảng giữa cột.
- **Masonry**: lưới ảnh xếp so le theo chiều cao ảnh.
- **Reduced motion**: thiết lập hệ điều hành yêu cầu giảm chuyển động.
- **Nguồn tham khảo**: site bên ngoài dùng để học nhịp thiết kế, không phải giá trị của Design System.
