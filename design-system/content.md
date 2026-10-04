# Content và media

Cách viết copy, song ngữ VI/EN, chọn ảnh và chuẩn file ảnh cho website. Fact
sản phẩm (khách hàng, route, dữ kiện chưa xác minh) thuộc `PRODUCT.md`. Brief
và nghiệm thu ảnh Advertising ở [Ảnh Advertising](advertising-images.md).

## Giọng điệu

Giàu kinh nghiệm, sáng tạo, đáng tin, trực tiếp, súc tích, đi ra từ
[câu chuyện thương hiệu](brand.md#câu-chuyện-thương-hiệu). Để công trình, vật
liệu, quy trình và khả năng thi công lên tiếng trước lời quảng cáo. Câu ngắn,
cụ thể, có thông tin vật liệu, quy trình hoặc kết quả. Tránh giọng luxury
chung chung và lưới bất động sản rập khuôn.

## Song ngữ VI/EN

- Tiếng Việt là HTML gốc; tiếng Anh đặt trên **node lá** qua `data-en`.
- Không đặt `data-en` lên phần tử chứa `span`, `em`, icon hoặc motion wrapper:
  `motion.js` thay `textContent` và xóa markup con.
- Attribute song ngữ: `data-en-alt`, `data-en-aria-label`, `data-en-content`.
- Mỗi trang đúng một `h1`; không nhảy cấp heading.
- Không công bố URL hoặc số Zalo, năm thành lập, bảo hành khi owner chưa xác
  nhận. Href Zalo hiện là placeholder `https://zalo.me/`.
- Địa chỉ trụ sở giữ nguyên chuỗi ở cả VI và EN:
  `E16 Khu đô thị Hưng Phú, Phường Phú Tân, tỉnh Vĩnh Long`.

## Hero ba route dịch vụ

| Route | Qualifier VI | Title VI | Title EN |
| --- | --- | --- | --- |
| Advertising | `Sản phẩm quảng cáo` | `để thương hiệu / luôn trong tầm mắt` | `Keep your brand / always in sight` |
| Commercial | `SHOP · F&B · SHOWROOM · VĂN PHÒNG` | `Thiết kế để bán tốt. / Thi công để vận hành bền.` | `Designed to sell. / Built to perform.` |
| Residential | `NHÀ PHỐ · CĂN HỘ · HOMESTAY` | `Nơi tái tạo / năng lượng sống` | `A place to / recharge` |

Ba route không có motto riêng và không thêm chapter divider kiểu About.
Advertising theo bố cục Projects: hero nền trắng, qualifier trên, filter dưới,
scroll cue và mép hàng ảnh đầu ở đáy viewport.

## Mạch nội dung theo route

| Route | Mạch | Hướng ảnh |
| --- | --- | --- |
| Trang chủ | Hero ba lĩnh vực, quy trình, ba portal, câu chuyện hơn 20 năm, vật liệu, xưởng, thi công, công trình, CTA | Bằng chứng thật: không gian, vật liệu, dụng cụ, tay nghề |
| Residential | Mở full-bleed, lời hứa nhà ở, chuỗi không gian, vật liệu và tay nghề, quy trình, CTA khảo sát | Ánh sáng, luồng đi, lưu trữ, vật liệu, sinh hoạt thật; cân bằng nhà phố, căn hộ, homestay |
| Commercial | Mở theo vận hành; shop, F&B, văn phòng; độ bền vật liệu; công trình chọn lọc; CTA | Luồng khách, quầy, trưng bày, thanh toán, kho; không gian đang hoạt động |
| Advertising | Hero, filter, masonry ảnh sản phẩm, CTA | Sản phẩm làm được: tổng thể, chi tiết cấu tạo và ánh sáng, gia công và lắp đặt |
| About | Hơn 20 năm, xưởng và con người, cách làm, cam kết, CTA | Xưởng, đội ngũ, quy trình |

Thứ tự bảo trì nội dung: Advertising, Commercial, Residential.

## Motion hook khi sửa chữ

- Giữ `data-motion-lines`, `data-motion-words`, `data-motion-line-source`,
  `data-motion-word-source`, `data-motion-media`.
- Không viết tay `.motion-line` hay `.motion-word`; `detail.js` sinh lại sau
  load, resize, `languagechange`.
- Copy dài hơn đổi số dòng và nhịp reveal: kiểm VI và EN ở mobile và desktop.

## Gallery và card

- `.detail-gallery__track` đọc item từ DOM; bắt buộc khi có `[data-gallery]`.
  Nút prev/next có thể vắng; gallery một item thì bỏ control.
- Clone hoặc xóa trọn một `figure`: ảnh, caption, alt VI/EN, metadata.
- `aria-label` ưu tiên trung tính, không ghi số lượng.
- `.service-portals` luôn ba mục.
- Advertising: `[data-project-grid]` dựng từ `catalog.mjs` (taxonomy sáu nhóm,
  slug, layout detail) và `media-manifest.mjs` (media card). Sửa data source,
  không sửa HTML sinh ra.
- Full menu: bốn route cấp cao, 17 mục con VI/EN dẫn tới URL canonical kèm
  query; không dùng section hash.

Sáu slug Advertising: `kiosk-posm`, `mobile-retail`, `signage-raised-letters`,
`office-signs-wayfinding`, `led-displays-lightboxes`, `print-decals`. Filter
`all` chỉ cho mục "Tất cả".

## Metadata ảnh Advertising

- Ảnh không có tiêu đề hiển thị; giữ mô tả và tag. Alt VI/EN mô tả nội dung
  cho người không nhìn thấy, không dùng làm tiêu đề.
- Mỗi card có `mediaItems[]` theo thứ tự tác giả và `coverMediaId` trỏ tới một
  `id` trong đó. Item có `kind` (`image` hoặc `video`), `src`, `sourceId`,
  `width`/`height` là pixel thật (số nguyên dương an toàn), `altVi`/`altEn`,
  `source`, SHA-256, `provenance`.
- Mọi item trong một card cùng tỷ lệ `width:height` chính xác; không làm tròn,
  không tự crop để ép tỷ lệ.
- Video thêm `posterSrc`, `posterWidth`/`posterHeight`, `durationSeconds`,
  `hasAudio`. Đối chiếu kích thước thật bằng `ffprobe` (video) và giải mã ảnh
  (poster); không lưu GIF. Masonry luôn tắt tiếng; detail có nút tiếng.
- Mỗi nhóm cần đủ tỷ lệ: portrait `< 0.9`, gần vuông `0.9–1.1`, landscape
  `> 1.1`, và ít nhất một ảnh cực `<= 0.625` hoặc `>= 1.6`.
- Ảnh cùng nguồn nhưng crop, blur, xoay hay export lại không tính là ảnh mới.
- Ảnh tạo mới là minh họa AI, không nhận là công trình đã thi công.

## Chuẩn file ảnh

```text
src/site/assets/content/
├─ client-logos/   SVG đã làm sạch
├─ projects/       WebP dự án và gallery
├─ news/           media Tin tức
└─ shared/         WebP dùng chung (process, about, portal)
source-assets/projects/   file nguồn để biên tập lại, không vào build
```

- Thư mục phẳng theo loại; không tạo thư mục con theo dự án. Tên file chữ
  thường, ASCII, kebab-case, mô tả dự án và góc chụp
  (`kiosk-trung-tam-thuong-mai-front.webp`).
- WebP sRGB (chuyển từ CMYK hoặc Display-P3 trước khi export); xóa EXIF và GPS.
- `width`/`height` trong HTML bằng pixel thật của file.
- Thêm hoặc thay ảnh thì chạy `node scripts/site/build-image-variants.mjs` để
  tạo AVIF full size và bản 480/960px (AVIF và WebP); build bọc `<img>` WebP
  thành `<picture>` dùng các biến thể đó.

| Slot | Kích thước nguồn | WebP mục tiêu | Xem lại khi |
| --- | --- | --- | --- |
| Hero, full-bleed, CTA | `1536×1024` hoặc `1920×1280` | 180–300 KB | `> 350 KB` |
| Gallery, project, card | `1536×1024` | 90–220 KB | `> 275 KB` |
| Ảnh nhỏ, render `<= 384px` | `768×512` | 40–100 KB | `> 130 KB` |

Ngân sách là mức review, không phải hard gate làm ảnh bệt.

### Loading và alt

- Hero đầu: `src` và `fetchpriority="high"`, không lazy. Slide sau dùng
  `data-src` cho `motion.js` hydrate.
- Ảnh dưới fold: `loading="lazy"`, `decoding="async"`.
- Ảnh trang trí trong vùng `aria-hidden="true"`: `alt=""`. Nền blur của
  primary Advertising cũng `alt=""`, `aria-hidden`, không nhận pointer.
- Ảnh nội dung có alt VI và `data-en-alt`; không nhồi từ khóa.

### Crop và con người

- Advertising (masonry, primary, viewer ở mức fit) giữ trọn ảnh. Chỉ nền nút
  suggestion được cover crop (`suggestionPosition`).
- Route khác có thể `object-fit: cover`. Giữ chủ thể trong vùng giữa khoảng 60%
  ngang và 70% dọc, không đặt tay, dụng cụ, mép đồ quan trọng sát 10% biên.
  Kiểm crop ở 320, 390, 768, 1024, 1440px trước khi đổi `object-position`.
- Không có khuôn mặt nhận diện được: quay lưng, chỉ bàn tay, hoặc nhòe chuyển
  động. Kiểm phản chiếu, màn hình, ảnh trên tường. Ngoại lệ duy nhất:
  `assets/content/shared/legacy-team.webp`.
- Không chữ giả, logo giả, watermark, tay hoặc dụng cụ méo. Logo và thông tin
  khách thật chỉ khi đã có quyền công bố; xóa địa chỉ, ảnh gia đình, thông tin
  riêng tư.

## Checklist khi thêm hoặc thay ảnh

1. Ảnh đúng câu chuyện route, không trùng ý ảnh liền kề; đã xem full
   resolution: không mặt, chữ hoặc logo giả, dữ liệu riêng tư.
2. WebP sRGB, kebab-case, đã xóa EXIF; `width`/`height` đúng pixel; dung lượng
   trong ngân sách; đã chạy `build-image-variants.mjs`.
3. Alt VI và `data-en-alt`; ảnh trang trí `alt=""`; hero high priority, ảnh dưới
   fold lazy.
4. Copy ở node lá, motion hook còn; số item và `aria-label` đúng.
5. Advertising: record trong `media-manifest.mjs`, slug khớp `catalog.mjs`,
   id/src/sourceId không trùng, đủ tỷ lệ mỗi nhóm.
6. Crop ổn ở năm viewport, không tràn ngang; chạy `pnpm qa:static` và
   `pnpm qa:site`. Chỉ xóa asset cũ khi không còn route nào dùng.

## Chú thích thuật ngữ

- **Node lá**: phần tử cuối chứa text hoặc attribute cần dịch.
- **Motion hook**: attribute để JavaScript tìm phần tử cần animate.
- **Provenance**: hồ sơ nguồn gốc và các bước tạo asset.
- **Safe crop**: crop vẫn giữ chủ thể và thông tin quan trọng.
- **Cover media**: item được `coverMediaId` chọn làm đại diện card.
