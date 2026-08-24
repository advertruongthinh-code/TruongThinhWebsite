# Hướng dẫn content và media

Guide này là checklist bắt buộc trước khi sửa copy, thêm ảnh hoặc thay số lượng
card/gallery trên các route con. Mục tiêu là để một solo dev hoặc AI agent cập
nhật nội dung nhanh mà không phá VI/EN, motion, crop hay hiệu năng.

Ưu tiên cập nhật thường xuyên hiện tại:

1. `/vi/advertising-products/`
2. `/vi/commercial/`
3. `/vi/residential/`

Đây là thứ tự bảo trì nội dung, không phải thứ tự quan trọng của dịch vụ.

## 1. Contract nội dung

### Leaf text và VI/EN

- Tiếng Việt là nội dung HTML gốc.
- Đặt tiếng Anh trong `data-en` trên **node lá**.
- Không đặt `data-en` lên parent chứa `span`, `em`, icon hoặc motion wrapper:
  `motion.js` thay `textContent` và sẽ xoá markup con.
- Thuộc tính song ngữ dùng `data-en-alt`, `data-en-aria-label` và
  `data-en-content`.
- Giữ đúng một `h1`; không nhảy từ `h2` sang `h4`.
- Không tự công bố URL Zalo, địa chỉ, năm thành lập hay bảo hành chưa được chủ dự
  án xác nhận.

### Hero và thông điệp

Mỗi route dịch vụ phải có kicker hoặc qualifier và title hai dòng. Ba route
dịch vụ chính không dùng motto riêng trong hero:

- kicker hoặc qualifier: một dòng ngắn, chữ hoa;
- title: hai dòng, giữ đúng node lá VI/EN và motion hook hiện có;
- không thêm `.detail-hero-motto` nếu thông điệp đã nằm trong `h1`.

Thông điệp hiện tại:

| Route | Kicker hoặc qualifier VI | Title VI | Title EN | Motto |
| --- | --- | --- | --- | --- |
| `/vi/advertising-products/` | Sản phẩm quảng cáo | để thương hiệu / luôn trong tầm mắt | Keep your brand / always in sight | Không dùng motto riêng |
| `/vi/commercial/` | SHOP · F&B · SHOWROOM · VĂN PHÒNG | Thiết kế để bán tốt. / Thi công để vận hành bền. | Designed to sell. / Built to perform. | Không dùng motto riêng |
| `/vi/residential/` | NHÀ PHỐ · CĂN HỘ · HOMESTAY | Nơi tái tạo / năng lượng sống | A place to / recharge | Không dùng motto riêng |

Advertising Products là ngoại lệ có chủ đích theo bố cục Projects: hero nền
trắng không có media, kicker `Sản phẩm quảng cáo`, title hai dòng
`để thương hiệu / luôn trong tầm mắt`, filter ở phần dưới, scroll cue và mép
hàng dự án đầu tiên xuất hiện ở đáy viewport.

Residential là ngoại lệ có chủ đích: giữ qualifier
`NHÀ PHỐ · CĂN HỘ · HOMESTAY`, đặt thông điệp trong hai dòng `h1`, và không thêm
`.detail-hero-motto`.

Commercial cũng là ngoại lệ có chủ đích: giữ qualifier
`SHOP · F&B · SHOWROOM · VĂN PHÒNG`, đặt thông điệp trong hai dòng `h1`, và không
thêm `.detail-hero-motto`.

Các section sau hero giữ heading theo từng bố cục trang; không thêm chapter
divider kiểu About vào Residential, Commercial hoặc Projects & Products. Copy
heading vẫn giữ cặp VI/EN ở node lá và dùng `data-motion-lines` khi section đã
có motion.

### Motion contract khi đổi chữ

- Giữ các hook `data-motion-lines`, `data-motion-words`,
  `data-motion-line-source`, `data-motion-word-source`, `data-motion-media` và
  mask hiện có.
- Không viết tay `.motion-line` hoặc `.motion-word`; `detail.js` sinh lại chúng
  sau load, resize và `languagechange`.
- Copy dài hơn có thể đổi số dòng và thời điểm reveal. Luôn kiểm tra cả VI/EN ở
  mobile lẫn desktop.
- Clone trọn một item hiện có; đừng chỉ copy ảnh hoặc caption rồi bỏ motion hook.

### Số lượng card và gallery

- `.detail-gallery__track` và `[data-project-grid]` đọc item hiện có từ DOM; có
  thể thêm hoặc bớt số lượng tuỳ nội dung, không cần sửa JavaScript.
- Clone/xoá trọn một `figure`, gồm ảnh, caption, alt song ngữ và metadata.
- Cập nhật `aria-label` nếu nó đang ghi số lượng cụ thể. Ưu tiên label trung tính
  như “Bộ sưu tập không gian kinh doanh” để giảm bảo trì.
- Với gallery chỉ còn một item, bỏ controls hoặc kiểm tra rõ controls không gây
  hiểu nhầm.
- `.service-portals` là pattern ba mục riêng. Không đổi khỏi ba portal nếu chưa
  có thay đổi CSS/motion và test responsive tương ứng.

## 2. Câu chuyện và hướng ảnh theo route

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

Không tạo thư mục con theo từng dự án hoặc bài Tin tức. Filename và manifest sẽ
là khóa ổn định để CMS/R2 thay ownership sau này. Brand mark, icon, font và
system asset vẫn do Git/source sở hữu.

Tên file: chữ thường, ASCII, kebab-case, mô tả dự án và góc chụp; ví dụ
`kiosk-trung-tam-thuong-mai-front.webp`. Không dùng `final-final`, ngày tải lên
hoặc tên mặc định từ máy ảnh.

### `/vi/advertising-products/` — bằng chứng công trình

- Ưu tiên công trình đã làm: kiosk, xe/rạp bán hàng, bảng hiệu, hộp đèn.
- Kể đủ nhịp: tổng thể hoàn thiện → chi tiết kết cấu/ánh sáng → gia công/lắp đặt.
- Ảnh bảng hiệu nên cho thấy tỷ lệ, vật liệu và ánh sáng; crop/blur tên khách
  hàng nếu chưa có quyền công bố.
- Ảnh kiosk/POSM và mobile retail phải cho thấy cấu tạo phối hợp vật liệu như
  alu/nhôm, sắt, gỗ, inox và acrylic; ưu tiên một chủ thể rõ với tiền cảnh và
  hậu cảnh để vẫn đọc được ở thumbnail.
- Tránh mockup, chữ AI giả và hình “concept” không thể thi công.

Bộ ảnh phối hợp vật liệu hiện dùng: `advertising/kiosk-posm-materials.webp` và
`advertising/mobile-retail-materials.webp`. Đây là placeholder ảnh thật để chủ
dự án thay sau vòng duyệt; không dùng logo hoặc chữ giả.

### `/vi/commercial/` — vận hành trước trang trí

- Cho thấy luồng khách, quầy phục vụ, trưng bày, thanh toán, kho/hậu cần và độ
  bền bề mặt.
- Ưu tiên không gian đang hoạt động; người phải quay lưng, ở xa hoặc nhoè chuyển
  động.
- Mỗi gallery nên cân bằng shop/showroom, F&B/cafe, văn phòng và chi tiết hoàn
  thiện.

### `/vi/residential/` — đời sống và độ bền

- Cho thấy ánh sáng, luồng đi, lưu trữ, cảm giác vật liệu và cách đồ nội thất
  phục vụ sinh hoạt thật.
- Cân bằng nhà phố, căn hộ và homestay; tránh ảnh “luxury” chung chung không có
  câu chuyện công năng.
- Loại bỏ địa chỉ, ảnh gia đình, khuôn mặt hoặc thông tin riêng tư trong gương,
  màn hình và bề mặt phản chiếu.

## 3. Metadata riêng cho `/vi/advertising-products/`

Filter dùng phép so sánh chính xác. Mỗi tile chỉ nhận **một** category chính:

| `data-project-category` | Nhãn VI | Nhãn EN |
| --- | --- | --- |
| `kiosk` | Kiosk | Kiosks |
| `mobile` | Xe bán hàng | Mobile retail |
| `signage` | Bảng hiệu | Signage |
| `lightbox` | Hộp đèn | Light boxes |

Quy tắc:

- `data-project-filter` của button phải trùng tuyệt đối với
  `data-project-category` của tile.
- `all` là giá trị dành riêng cho nút “Tất cả”.
- Nếu một category không còn tile, bỏ button filter đó.
- Category mới dùng lowercase ASCII/kebab-case; thêm button VI/EN và ít nhất một
  tile trong cùng thay đổi.
- `project-tile--feature` và `project-tile--landscape` chỉ điều khiển nhịp/crop,
  không phải category.

```html
<figure
  class="project-tile project-tile--landscape"
  data-project-category="signage"
>
  <div class="project-tile__media">
    <img
      src="/assets/content/projects/kiosk-trung-tam-thuong-mai-front.webp"
      width="1536"
      height="1024"
      loading="lazy"
      decoding="async"
      data-motion-media
      alt="Mô tả cụ thể bằng tiếng Việt"
      data-en-alt="Specific description in English"
    />
  </div>
  <figcaption data-en="English caption">Caption tiếng Việt</figcaption>
</figure>
```

### Full menu

Menu toàn trang chứa bốn route cấp cao: Nhà ở, Kinh doanh, Công trình & sản
phẩm và Về chúng tôi. Mỗi nhóm có danh sách mục con VI/EN dẫn tới URL canonical
kèm query taxonomy; không dùng section hash, project CMS hoặc social placeholder.

Taxonomy D1 tách rõ `project_categories.kind=project` và `kind=product`: sáu
nhóm công trình seed ở vị trí 101–106 (`residential`, `commercial`,
`kiosk-posm-project`, `mobile-retail`, `signage-project`, `light-boxes`), còn sáu
nhóm sản phẩm giữ vị trí 1–6. Admin dùng resource riêng cho từng kind; project
không thể gán nhóm sản phẩm, product không thể gán nhóm công trình, và category
đang được tham chiếu không thể xoá.

## 4. Chuẩn file ảnh

### Format, màu và kích thước

- Runtime dùng WebP trong không gian màu **sRGB**; chuyển ảnh CMYK/Display-P3 về
  sRGB trước khi export.
- Giữ file nguồn cần tái biên tập trong `source-assets/projects/`; production
  HTML chỉ trỏ tới WebP trong `assets/content/`.
- Xoá EXIF/GPS khỏi ảnh giao cho web.
- `width` và `height` trong HTML phải bằng kích thước pixel **thật** của file,
  không phải kích thước CSS.

Baseline hiện tương thích với layout là 3:2, `1536 × 1024`. Nếu dùng file
`1920 × 1280`, phải đổi attributes tương ứng.

| Slot | Kích thước nguồn hợp lý | Target WebP | Cần xem lại khi |
| --- | --- | --- | --- |
| Hero/full-bleed/CTA | `1536×1024`; có thể `1920×1280` | 180–300 KB | > 350 KB |
| Gallery/project/card | `1536×1024` | 90–220 KB | > 275 KB |
| Ảnh nhỏ thật sự, render ≤384 px | `768×512` | 40–100 KB | > 130 KB |

Đây là ngân sách review, không phải lý do làm ảnh bệt hoặc mất chi tiết vật
liệu. 24 asset route hiện tại nằm khoảng 63–263 KB; giữ cùng cấp chất lượng.

### Loading

- Ảnh hero đầu: dùng `src`, `fetchpriority="high"`; không `loading="lazy"`.
- Hero slide sau: giữ pattern `data-src` hiện có để `motion.js` hydrate.
- Mọi ảnh dưới fold: `loading="lazy"` và `decoding="async"`.
- Ảnh trang trí trong container `aria-hidden="true"` dùng `alt=""`.
- Mọi ảnh có nội dung phải có `alt` VI và `data-en-alt` EN; mô tả điều ảnh cho
  người không nhìn thấy, không nhồi từ khoá.

### Safe crop và kiểm tra con người

- CSS dùng `object-fit: cover` và có thể crop ảnh thành 3:4, 4:3, 3:2 hoặc hero
  toàn màn hình.
- Giữ chủ thể quan trọng trong vùng giữa khoảng 60% chiều ngang và 70% chiều
  dọc; không đặt bàn tay, dụng cụ hoặc mép đồ quan trọng sát 10% biên ảnh.
- Test crop ở 320, 390, 768, 1024 và 1440 px trước khi đổi `object-position`.
- Không dùng khuôn mặt nhận diện. Chụp quay lưng, chỉ bàn tay/bộ phận cơ thể hoặc
  phơi sáng dài để người chuyển động nhoè.
- Kiểm tra cả phản chiếu, ảnh trên tường, màn hình và hậu cảnh.
- Ngoại lệ duy nhất đã duyệt là `assets/content/shared/legacy-team.webp`; không tự
  mở rộng ngoại lệ.
- Không chữ giả, logo giả, watermark, chi tiết cơ thể/dụng cụ méo. Logo/thông
  tin khách hàng thật chỉ xuất hiện khi đã có quyền công bố.

## 5. Workflow cập nhật tinh gọn

1. Chọn route, section và vai trò câu chuyện của item.
2. Chọn ảnh; kiểm tra full resolution ở 100% trước khi resize.
3. Export WebP sRGB vào content type đúng; giữ nguồn trong
   `source-assets/projects/` nếu cần.
4. Ghi lại pixel thật và dung lượng; tối ưu lại nếu vượt ngưỡng review.
5. Clone trọn item gần nhất trong cùng section.
6. Thay `src`, `width`, `height`, caption, alt VI/EN và metadata category.
7. Sửa copy theo leaf/i18n contract; giữ thông điệp và các motion hook áp dụng.
8. Chạy website, VI/EN, crop, lazy loading, gallery/filter và responsive.
9. Chỉ xoá asset cũ khi đã xác nhận không còn route nào tham chiếu.

## 6. Upload/QA checklist

- [ ] Ảnh đúng câu chuyện của route và không trùng ý với ảnh liền kề.
- [ ] Đã xem ảnh full resolution: không mặt nhận diện, lỗi tay/dụng cụ, chữ/logo
      giả, watermark, dữ liệu riêng tư hoặc reflection nhạy cảm.
- [ ] WebP sRGB; tên kebab-case; EXIF/GPS đã xoá.
- [ ] `width`/`height` bằng pixel thật; dung lượng trong budget.
- [ ] Ảnh nội dung có `alt` VI + `data-en-alt`; ảnh trang trí có `alt=""`.
- [ ] Hero đầu high priority; ảnh dưới fold lazy + async decode.
- [ ] Copy VI/EN nằm ở node lá; thông điệp và các motion hook áp dụng còn nguyên.
- [ ] Gallery/card count và `aria-label` còn đúng.
- [ ] `/vi/advertising-products/`: filter/category khớp, không button rỗng.
- [ ] Full menu: đúng bốn route cấp cao, 15 mục con VI/EN và không section hash.
- [ ] Crop ổn ở 320/390/768/1024/1440, không overflow ngang.
- [ ] Gallery arrows, drag/touch, filter, CTA và VI/EN hoạt động.
- [ ] Console/network sạch; lazy image tải sau stepped scroll.

Lệnh kiểm tra đầy đủ:

```powershell
python -m http.server 4173 --bind 127.0.0.1
node tests/site/site.e2e.cjs
```

Xem thêm [route spec](../specs/frontend-route-and-content.md), [test guide](../../tests/README.md) và
[quy tắc agent](../../AGENTS.md).

## Chú thích thuật ngữ

- **Leaf node**: node cuối chứa text hoặc attribute cần dịch.
- **Motion hook**: attribute/class để JavaScript tìm và điều khiển animation.
- **Metadata**: dữ liệu mô tả content như category, alt, kích thước và trạng thái.
- **Safe crop**: crop vẫn giữ chủ thể và thông tin quan trọng nhìn thấy được.
- **Lazy loading**: chỉ tải asset khi cần, thường khi gần viewport.
- **Placeholder**: asset tạm chờ thay bằng nội dung đã được owner duyệt.
