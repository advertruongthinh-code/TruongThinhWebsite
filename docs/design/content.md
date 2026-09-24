---
title: Hướng dẫn content, i18n và media
type: design
status: living
updated: 2026-09-11
related_docs:
  - ../decisions/head-office-address-confirmed.md
  - ../specs/frontend-route-and-content.md
  - ../specs/frontend-brand-shell-responsive-runtime.md
  - ../specs/living-docs-design-system.md
  - ../../PRODUCT.md
---

# Hướng dẫn content, i18n và media

Đây là nguồn chuẩn của thư mục design cho copy, i18n, media và route narrative.
Guide này giữ các fact cần tìm khi thêm hoặc sửa nội dung; fact product vẫn thuộc
[`PRODUCT.md`](../../PRODUCT.md), còn behavior runtime phải đối chiếu source và
frontend spec. Không dùng bản nháp, taxonomy cũ hay DOM generated làm nguồn dữ
liệu.

## Trạng thái và thứ tự bảo trì

Ba route dịch vụ hiện có là `/vi/advertising-products/`, `/vi/commercial/` và
`/vi/residential/`, cùng các route `/en/` tương ứng. Thứ tự dưới đây là thứ tự
bảo trì nội dung đang dùng, không phải xếp hạng quan trọng của dịch vụ:

1. `/vi/advertising-products/`
2. `/vi/commercial/`
3. `/vi/residential/`

Owner-confirmed fact được đánh dấu là `accepted`; route, catalog và số lượng
media đọc từ source/test được đánh dấu là `observed`. Source evidence không tự
nâng một rule thành accepted design target.

## Contract nội dung

### Leaf text và VI/EN

- Tiếng Việt là nội dung HTML gốc.
- Đặt tiếng Anh trên **node lá** qua `data-en`.
- Không đặt `data-en` lên parent chứa `span`, `em`, icon hoặc motion wrapper:
  `motion.js` thay `textContent` và sẽ xoá markup con.
- Attribute song ngữ dùng `data-en-alt`, `data-en-aria-label` và
  `data-en-content` đúng loại dữ liệu.
- Giữ đúng một `h1`; không nhảy từ `h2` sang `h4`.
- Không tự công bố URL hoặc số Zalo, địa chỉ, năm thành lập hay bảo hành chưa
  được owner xác nhận.

### Hero và thông điệp hiện tại

**Delta content accepted, chưa triển khai:**
[AD-FINAL-R1 C3–C5](../specs/advertising-final-polish-and-media.md) khóa copy
CTA hai đoạn VI/EN, bỏ eyebrow, quy trình và footer invitation trên Advertising;
giữ capability marquee và thông tin liên hệ. Hero chỉ sửa cách trình bày dấu,
không đổi thông điệp. Những mô tả section hiện tại bên dưới là trạng thái
source trước delta; không dùng chúng để phục hồi các khối đã được yêu cầu bỏ.

Mỗi route dịch vụ có qualifier hoặc kicker và title hai dòng. Ba route này không
dùng motto riêng trong hero:

| Route | Qualifier VI | Title VI | Title EN | Motto |
| --- | --- | --- | --- | --- |
| `/vi/advertising-products/` | `Sản phẩm quảng cáo` | `để thương hiệu / luôn trong tầm mắt` | `Keep your brand / always in sight` | Không dùng motto riêng |
| `/vi/commercial/` | `SHOP · F&B · SHOWROOM · VĂN PHÒNG` | `Thiết kế để bán tốt. / Thi công để vận hành bền.` | `Designed to sell. / Built to perform.` | Không dùng motto riêng |
| `/vi/residential/` | `NHÀ PHỐ · CĂN HỘ · HOMESTAY` | `Nơi tái tạo / năng lượng sống` | `A place to / recharge` | Không dùng motto riêng |

Advertising Products là ngoại lệ có chủ đích theo bố cục Projects: hero nền
trắng, qualifier ở trên, filter ở phần dưới, scroll cue và mép hàng dự án đầu
tiên xuất hiện ở đáy viewport. Commercial ưu tiên vận hành, quầy, trưng bày,
thanh toán và độ bền. Residential ưu tiên ánh sáng, luồng đi, lưu trữ, vật liệu
và sinh hoạt thật. Không thêm chapter divider kiểu About vào ba route này khi
route spec chưa đổi.

Các section sau hero giữ heading theo bố cục hiện tại. Copy heading vẫn giữ cặp
VI/EN ở node lá và dùng `data-motion-lines` khi section đã có motion.

### Motion hook khi đổi chữ

- Giữ các hook `data-motion-lines`, `data-motion-words`,
  `data-motion-line-source`, `data-motion-word-source` và `data-motion-media`
  đã có trong markup.
- Không viết tay `.motion-line` hoặc `.motion-word`; `detail.js` sinh lại sau
  load, resize và `languagechange`.
- Copy dài hơn có thể đổi số dòng và thời điểm reveal. Kiểm tra cả VI và EN ở
  mobile lẫn desktop.
- Clone trọn một item hiện có; không chỉ chép ảnh hoặc caption rồi bỏ motion
  hook.

### Số lượng card và gallery

- `.detail-gallery__track` đọc item hiện có từ DOM; track là bắt buộc khi dùng
  `[data-gallery]`. Nút prev/next có thể vắng mặt.
- Riêng `[data-project-grid]` của Advertising Products được dựng từ catalog và
  media manifest; thêm hoặc bớt card ở data source, không sửa danh sách card
  generated trong HTML.
- Clone hoặc xoá trọn một `figure`, gồm ảnh, caption, alt song ngữ và metadata.
- Cập nhật `aria-label` nếu label ghi số lượng cụ thể; ưu tiên label trung tính
  để giảm bảo trì.
- Với gallery chỉ còn một item, bỏ controls hoặc kiểm tra controls không gây
  hiểu nhầm.
- `.service-portals` là pattern ba mục riêng. Không đổi khỏi ba portal nếu chưa
  có thay đổi CSS, motion và test responsive tương ứng.

## Narrative theo route

- `/vi/` và `/en/`: hero ba lĩnh vực, editorial process, ba portal, câu chuyện hơn 20 năm,
  năng lực vật liệu/xưởng/thi công, công trình và CTA.
- `/vi/residential/` và `/en/residential/`: full-bleed opening, lời hứa nhà ở, chuỗi không gian/dự án,
  vật liệu và tay nghề, quy trình, CTA khảo sát.
- `/vi/commercial/` và `/en/commercial/`: opening theo vận hành, shop/showroom, F&B/cafe, văn phòng,
  durability/material story, selected build, CTA khảo sát.
- Advertising: hero/copy hiện hành theo [Hero và thông điệp](#hero-và-thông-điệp-hiện-tại); narrative và media theo mục Advertising của guide này.
- `/vi/about/` và `/en/about/`: kinh nghiệm hơn 20 năm, xưởng và con người, cách làm, cam kết
  và CTA khảo sát.

## Câu chuyện và hướng ảnh theo route

Public tree chỉ chứa file web-ready. Cấu trúc phẳng theo content type là contract
tĩnh cho CMS tương lai:

```text
assets/content/
├─ client-logos/             # SVG web-ready đã làm sạch
├─ projects/                 # WebP dự án và gallery
├─ news/                     # media bài Tin tức khi có nội dung
└─ shared/                   # WebP dùng chung cho process, about và portal

source-assets/
└─ projects/                 # file nguồn cần tái biên tập, không đi vào build
```

Không tạo thư mục con theo từng dự án hoặc bài Tin tức. Filename và manifest là
khóa ổn định để CMS/R2 thay ownership sau này. Brand mark, icon, font và system
asset vẫn do Git/source sở hữu.

Tên file dùng chữ thường, ASCII, kebab-case, mô tả dự án và góc chụp; ví dụ
`kiosk-trung-tam-thuong-mai-front.webp`. Không dùng `final-final`, ngày tải lên
hoặc tên mặc định từ máy ảnh.

### `/vi/advertising-products/` — bằng chứng công trình

- Ưu tiên công trình đã làm: kiosk, xe/rạp bán hàng, bảng hiệu, hộp đèn.
- Kể đủ nhịp: tổng thể hoàn thiện → chi tiết kết cấu/ánh sáng → gia công/lắp
  đặt.
- Ảnh bảng hiệu nên cho thấy tỷ lệ, vật liệu và ánh sáng; crop hoặc blur tên
  khách hàng nếu chưa có quyền công bố.
- Ảnh kiosk/POSM và mobile retail nên cho thấy cấu tạo phối hợp alu/nhôm, sắt,
  gỗ, inox và acrylic; ưu tiên một chủ thể rõ với tiền cảnh và hậu cảnh để vẫn
  đọc được ở thumbnail.
- Tránh mockup, chữ AI giả và hình concept không thể thi công.

Bộ ảnh phối hợp vật liệu hiện dùng là
`/assets/content/projects/kiosk-posm-materials.webp` và
`/assets/content/projects/mobile-retail-materials.webp`. Đây là placeholder ảnh
thật để owner thay sau vòng duyệt; không dùng logo hoặc chữ giả.

### `/vi/commercial/` — vận hành trước trang trí

Cho thấy luồng khách, quầy phục vụ, trưng bày, thanh toán, kho/hậu cần và độ bền
bề mặt. Ưu tiên không gian đang hoạt động; người nên quay lưng, ở xa hoặc nhoè
chuyển động. Mỗi gallery nên cân bằng shop/showroom, F&B/cafe, văn phòng và chi
tiết hoàn thiện.

### `/vi/residential/` — đời sống và độ bền

Cho thấy ánh sáng, luồng đi, lưu trữ, cảm giác vật liệu và cách đồ nội thất phục
vụ sinh hoạt thật. Cân bằng nhà phố, căn hộ và homestay; tránh ảnh luxury chung
chung không có câu chuyện công năng. Loại bỏ địa chỉ, ảnh gia đình, khuôn mặt
hoặc thông tin riêng tư trong gương, màn hình và bề mặt phản chiếu.

## Metadata Advertising Products

**Correction owner ngày2026-09-13:** ảnh Advertising không có tên/title riêng;
mọi grid và detail bỏ tiêu đề ảnh, giữ mô tả và tag phân loại. Alt VI/EN vẫn
mô tả nội dung ảnh cho accessibility, không dùng alt như title hiển thị.
“Có thể bạn thích” chuyển vào mô tả, giữ nền ảnh dạng nút gọn và toggle một
filter; bấm lại để tắt, giữ photo ID. Xem
[AD-FINAL-R1 D8](../specs/advertising-final-polish-and-media.md#d8--correction-owner-gợi-ý-thuộc-mô-tả-ảnh-không-có-tên--2026-09-13).
Đây là target đã duyệt; các mô tả caption/schema bên dưới là baseline source
trước khi delta được kiểm chứng. CMS/database vẫn ngoài phạm vi implementation.

Index dùng anchor filter với `data-advertising-filter`. `all` chỉ dành cho anchor
“Tất cả”; sáu giá trị còn lại là các slug canonical:

`kiosk-posm`, `mobile-retail`, `signage-raised-letters`,
`office-signs-wayfinding`, `led-displays-lightboxes`, `print-decals`.

Anchor dẫn tới route `/vi/advertising-products/` hoặc query
`?category=<slug>` theo contract hiện tại. `src/site/advertising-products/catalog.mjs`
là nguồn taxonomy sáu nhóm, 12 product label mỗi nhóm và detail layout;
`media-manifest.mjs` sở hữu media card. DOM không phải data source.

### Tiêu chí tạo và nghiệm thu ảnh Advertising

Đợt P7.5 ngày2026-09-23–24 thêm12 ảnh cho bốn nhóm gợi ý văn phòng/chỉ dẫn;
catalog hiện127 ảnh, không thay media cũ. Nguồn và prompt, review độc lập,
WebP/hash được liên kết tại [evidence P7.5](../verification/advertising-september-p7-5-2026-09-24.md).
Mọi ảnh mới là minh họa AI, không nhận là công trình thực đã thi công.
`suggestionPosition` chỉ điều chỉnh crop nền nút; grid/primary vẫn giữ trọn ảnh.

[Tiêu chí ảnh Advertising Products](advertising-image-quality.md) sở hữu brief
sáu nhóm, cách dùng ảnh tham khảo, giới hạn chữ và gate Audit/Critique ≥ 8/10
do subagent độc lập kiểm tra. Áp dụng cho ảnh mới/thay thế; không suy ra pool
hiện tại đã đạt điểm. Quy định con người và chuẩn file chung vẫn ở guide này.

Các bổ sung owner ngày 2026-09-10 nằm trong cùng nguồn chuẩn: [gian hàng theo
ngành hàng](advertising-image-quality.md#brief-gian-hàng-triển-lãm-theo-ngành-hàng),
[typography/slogan trên sản phẩm](advertising-image-quality.md#chữ-bối-cảnh-và-ảnh-tham-khảo)
và [standee, biển số hắt chân, sửa ảnh cụ thể](advertising-image-quality.md#sản-phẩm-owner-bổ-sung-khi-duyệt-album).
Đây là contract nội dung ảnh, không đổi typography UI hoặc tự đóng gate tích
hợp public. Thuật ngữ sản phẩm hiện tại là **Formex**; raw history và ID cũ
giữ theo quy tắc tương thích của image quality.

### Pool 109 card hiện tại

[GRID-R4](../specs/advertising-grid-span-organic.md) là delta đã duyệt, đang kiểm chứng tích hợp,
cho phép thêm/thay media và bỏ fit/canvas. Số liệu và fit policy bên dưới là
baseline hiện tại, không phải acceptance của revision mới.

Pool static hiện có 109 record theo thứ tự sáu slug:
`24 / 16 / 22 / 13 / 18 / 16`. Mỗi record giữ `id`, `category`, `sourceOrder`,
product key và `media.sourceId`, source path, kích thước pixel thật, alt VI/EN.
Mỗi card có media riêng; ảnh cùng source nhưng crop, blur, xoay, reframe hoặc
export lại không được tính là ảnh mới.

Mỗi nhóm phải có đủ ratio portrait `< 0.9`, near-square `0.9–1.1`, landscape
`> 1.1` và ít nhất một extreme `<= 0.625` hoặc `>= 1.6`, tính từ
`intrinsic width / height`. `presentationCanvas` không tạo ratio source mới.
Build tạo `rank-v3`; runtime dùng pure core để derive geometry theo cột ngắn
nhất. Không random hoặc seeded-random `fitMode`.

### Full menu và boundary CMS

Full menu hiện có bốn route cấp cao: Không gian Nhà ở, Không gian Kinh doanh,
Sản phẩm Quảng cáo và Về chúng tôi. Nhãn và cấu trúc đối chiếu `src/site/index.html`
ngày 2026-09-09. Menu có 17 mục con VI/EN dẫn tới URL canonical kèm query taxonomy;
không dùng section hash, project CMS hoặc social placeholder.

Dữ liệu public hiện là static-first: sáu nhóm public và card Advertising được
quản lý trong `catalog.mjs`/`media-manifest.mjs`. `src/site/` là current public
source; `src/worker/` giữ route/SEO contract nhưng dormant cho tới khi CMS được
bật. `src/admin/` và `src/db/migrations/` là dev CMS, còn publishing/storage CMS
là planned capability theo backend guide. Không lấy metadata Worker, dev admin
hoặc CMS làm nguồn cho index public trước khi capability đó được bật.

## Chuẩn file ảnh

### Format, màu và kích thước

- Runtime dùng WebP trong không gian màu **sRGB**; chuyển ảnh CMYK hoặc
  Display-P3 về sRGB trước khi export.
- Giữ file nguồn cần tái biên tập trong `source-assets/projects/`; production
  HTML chỉ trỏ tới WebP trong `assets/content/`.
- Xoá metadata nhúng, gồm EXIF/GPS, khỏi ảnh giao cho web.
- `width` và `height` trong HTML phải bằng kích thước pixel **thật** của file,
  không phải kích thước CSS.

Baseline tương thích layout là `3:2`, `1536 × 1024`. Nếu dùng file
`1920 × 1280`, đổi attribute tương ứng.

| Slot | Kích thước nguồn hợp lý | Target WebP | Cần xem lại khi |
| --- | --- | --- | --- |
| Hero/full-bleed/CTA | `1536×1024`; có thể `1920×1280` | 180–300 KB | `> 350 KB` |
| Gallery/project/card | `1536×1024` | 90–220 KB | `> 275 KB` |
| Ảnh nhỏ thật sự, render `≤384 px` | `768×512` | 40–100 KB | `> 130 KB` |

Đây là ngân sách review, không phải hard gate làm ảnh bệt hoặc mất chi tiết vật
liệu. Pool Advertising hiện có 109 WebP, khoảng 34–220 KB/file, tổng 14.22 MiB;
90–220 KB là budget review, không phải ngưỡng tối thiểu.

### Loading và alt

- Hero đầu dùng `src` + `fetchpriority="high"`; không dùng `loading="lazy"`.
- Hero slide sau giữ pattern `data-src` để `motion.js` hydrate.
- Ảnh dưới fold dùng `loading="lazy"` và `decoding="async"`.
- Ảnh trang trí trong container `aria-hidden="true"` dùng `alt=""`.
- Advertising primary P1.4 có bản sao ảnh nền cover+blur với `alt=""` và
  `aria-hidden="true"`, không nhận pointer/focus. Foreground riêng giữ
  contain và alt VI/EN; nền không tham gia morph hoặc fullscreen viewer.
- Ảnh có nội dung phải có alt VI và `data-en-alt` EN; mô tả điều ảnh cho người
  không nhìn thấy, không nhồi từ khoá.
- Static phase hiện phát một WebP/card và chưa có `srcset`, `sizes` hoặc
  derivative nhỏ hơn. Lazy loading và bounded virtualization giới hạn request;
  responsive derivative được hoãn tới CMS phase để không tạo hai pipeline media.

### Safe crop và kiểm tra con người

- Riêng Advertising photo browse, ảnh sản phẩm parent/related/hero và viewer
  ở mức fit giữ trọn ảnh theo [AD-BROWSE-R1](../specs/advertising-photo-browse.md).
  Owner xác nhận ngày 2026-09-10: chỉ thumbnail nền của ô nhãn điều hướng
  `Ý tưởng bạn có thể thích` được cover crop thành banner; không sửa source,
  intrinsic dimensions hoặc dùng bản crop như ảnh sản phẩm mới.
- Hero, gallery và route khác có thể dùng `object-fit: cover` để crop theo slot.
  Card Advertising tuân thủ [GRID-R4](../specs/advertising-grid-span-organic.md)
  và [visual contract](patterns.md#advertising-grid-geometry); không áp dụng
  cơ chế fit/canvas cũ. Thông số tỷ lệ, span và gap chỉ định nghĩa tại nguồn đó.
- Giữ chủ thể quan trọng trong vùng giữa khoảng 60% chiều ngang và 70% chiều
  dọc; không đặt bàn tay, dụng cụ hoặc mép đồ quan trọng sát 10% biên ảnh.
- Test crop ở 320, 390, 768, 1024 và 1440 px trước khi đổi `object-position`.
- Không dùng khuôn mặt nhận diện. Chụp quay lưng, chỉ bàn tay/bộ phận cơ thể
  hoặc phơi sáng dài để người chuyển động nhoè.
- Kiểm tra phản chiếu, ảnh trên tường, màn hình và hậu cảnh.
- Ngoại lệ duy nhất đã duyệt là `assets/content/shared/legacy-team.webp`; không
  tự mở rộng ngoại lệ.
- Không dùng chữ giả, logo giả, watermark, chi tiết cơ thể/dụng cụ méo. Logo và
  thông tin khách hàng thật chỉ xuất hiện khi đã có quyền công bố.

## Fact owner và dữ kiện chưa biết

Địa chỉ public đã được owner xác nhận trong
[decision](../decisions/head-office-address-confirmed.md):

`E16 Khu đô thị Hưng Phú, Phường Phú Tân, tỉnh Vĩnh Long`

Giữ nguyên chuỗi này ở cả VI và EN; không dịch tên riêng hành chính khi chưa có
direction mới. Các dữ kiện sau vẫn `unknown`, không tự công bố:

- URL hoặc số Zalo thật.
- Năm thành lập chính xác.
- Chính sách và thời hạn bảo hành.

CTA có thể là gọi Zalo hoặc đặt lịch khảo sát, nhưng URL/số thật chỉ thêm sau
owner confirmation.

## Workflow cập nhật tinh gọn

### Khi sửa catalog hoặc media

1. Xác định route, section và vai trò câu chuyện của item.
2. Chọn ảnh; kiểm tra full resolution ở 100% trước khi resize.
3. Export WebP sRGB vào content type đúng; giữ nguồn trong
   `source-assets/projects/` nếu cần.
4. Ghi pixel thật và dung lượng; tối ưu lại nếu vượt ngưỡng review.
5. Clone trọn item gần nhất trong cùng section.
6. Thay `src`, `width`, `height`, caption và alt VI/EN. Với Advertising
   Products, cập nhật record trong `media-manifest.mjs`; chỉ sửa `catalog.mjs`
   khi taxonomy, cover hoặc gallery selection thay đổi.
7. Sửa copy theo leaf/i18n contract; giữ thông điệp và motion hook áp dụng.
8. Chạy kiểm tra website, VI/EN, crop, lazy loading, gallery/filter và
   responsive theo phạm vi thay đổi.
9. Chỉ xoá asset cũ sau khi xác nhận không còn route nào tham chiếu.

### Checklist upload và QA

- [ ] Ảnh đúng câu chuyện route và không trùng ý với ảnh liền kề.
- [ ] Đã xem full resolution: không mặt nhận diện, lỗi tay/dụng cụ, chữ/logo
      giả, watermark, dữ liệu riêng tư hoặc reflection nhạy cảm.
- [ ] WebP sRGB; tên kebab-case; EXIF/GPS đã xoá.
- [ ] `width`/`height` bằng pixel thật; dung lượng trong budget review.
- [ ] Ảnh nội dung có alt VI + `data-en-alt`; ảnh trang trí có `alt=""`.
- [ ] Hero đầu high priority; ảnh dưới fold lazy + async decode.
- [ ] Copy VI/EN ở node lá; motion hook còn nguyên.
- [ ] Gallery/card count và `aria-label` còn đúng.
- [ ] Advertising: filter và slug trong `catalog.mjs` khớp; không anchor rỗng.
- [ ] Pool 109: count `24/16/22/13/18/16`; unique id/src/sourceId; đủ product
      label; ratio coverage và extreme của từng nhóm; contact sheet không có
      crop/near-duplicate.
- [ ] Full menu đúng bốn route cấp cao, 17 mục con VI/EN và không section hash.
- [ ] Crop ổn ở 320/390/768/1024/1440; không overflow ngang.
- [ ] Gallery arrows, drag/touch, filter, CTA và VI/EN hoạt động.
- [ ] Console/network sạch; lazy image tải sau stepped scroll.

Lệnh kiểm tra đã được repository map xác nhận:

```powershell
pnpm dev
pnpm qa:static
pnpm qa:site
```

`pnpm dev` dùng static parity server của project; `qa:static` là gate tĩnh và
`qa:site` là browser suite cần server đang chạy. Guide docs chỉ trỏ tới lệnh
thật, không ghi kết quả chưa chạy.

## Chú thích thuật ngữ

- **Leaf node**: node cuối chứa text hoặc attribute cần dịch.
- **Motion hook**: attribute/class để JavaScript tìm và điều khiển animation.
- **Metadata**: dữ liệu mô tả content như category, alt, kích thước và trạng thái.
- **Safe crop**: crop vẫn giữ chủ thể và thông tin quan trọng nhìn thấy được.
- **Lazy loading**: chỉ tải asset khi cần, thường khi gần viewport.
- **Placeholder**: asset tạm chờ thay bằng nội dung đã được owner duyệt.
- **Responsive derivative**: biến thể ảnh nhỏ hơn để browser chọn theo viewport
  qua `srcset` và `sizes`.
- **Observed**: fact đọc từ source/test, chưa tự trở thành accepted target.
