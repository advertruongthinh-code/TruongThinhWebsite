---
title: Phân loại sản phẩm Advertising theo cụm, sản phẩm và tag
status: live
source:
  - src/site/advertising-products/taxonomy.mjs
tests:
  - tests/site/advertising-products-media.test.mjs
  - tests/site/advertising-random-browse.e2e.mjs
  - tests/site/advertising-pages.test.mjs
  - tests/site/advertising-rail-two-tier.e2e.mjs
notion: https://app.notion.com/p/3f6332849a0e8113b8c0dbb53a4770fe
updated: 2026-10-31
---

# Phân loại sản phẩm Advertising theo cụm, sản phẩm và tag

## Mục đích

Trang Advertising lọc theo sáu cụm khái niệm và các sản phẩm cụ thể trong từng cụm, mỗi cụm và sản phẩm có
URL riêng để Google index. Phân loại là dữ liệu sửa được, không hard-code trong code render; phase CMS cho
người hoặc AI sửa. EmbeddingGemma 2 chấm điểm ảnh để gợi ý gắn loại và xếp related. Dữ liệu và validator R2, filter cụm và sản phẩm
([masonry R2, R3](advertising-masonry.md#r3-filter)), rail hai tầng R3, trang R4, ngưỡng chip R5 và related R7 theo tag
đã chạy; vector R6 chưa có (Gate còn mở).

## Hành vi

### R1. Ba tầng phân loại

Cụm là tập đóng, hiện trên rail, thứ tự theo bảng dưới. Sản phẩm thuộc đúng một cụm, lọc được, có chip và trang index theo ngưỡng R5. Tag là biến thể, vật
liệu, kiểu dáng (Inox, Mica, đơn sắc, full color...), gắn trên từng media, không lên rail; từ chi tiết trong
tag xuất hiện trong chữ trang sản phẩm và alt. Một media gắn được nhiều sản phẩm và nhiều tag. Thứ tự sản phẩm là
thứ hạng: hạng 1 là sản phẩm chính, quyết định `category`, alt và related; các hạng sau xếp theo độ nổi bật trong
ảnh (owner chốt 2026-10-17). Card thuộc mọi sản phẩm và mọi cụm có sản phẩm gắn trên media; trong một filter, card
xếp theo hạng của sản phẩm đầu tiên khớp filter, cùng hạng thì ngẫu nhiên. Điểm R6 chỉ gợi ý thứ hạng. 79 sản phẩm cũ (`<slug>-product-NN`) thành tag,
mỗi tag map về một sản phẩm mới.

Cây chọn theo nghiên cứu SEO 2026-10-12 (Keyword Planner miền Tây và cả nước, SERP, gợi ý Google/Bing, 12 đối
thủ; báo cáo ở `advertising-taxonomy/seo/` trong Library project). Số ảnh đếm ngày 2026-10-18, gồm cả ảnh gắn sản phẩm phụ và R8; sản phẩm tách mới đếm lại
trong plan, dưới ngưỡng R5 thì gộp về sản phẩm cũ.

| Cụm, nhãn rail và h1 (slug VI / EN) | Sản phẩm (số ảnh) |
| --- | --- |
| Bảng hiệu, chữ nổi & hộp đèn (`bang-hieu-quang-cao` / `signage`) | Bảng hiệu alu & mặt dựng (14); Chữ nổi (31); Hộp đèn (28); Bảng vẫy (20) |
| Standee, backdrop, kệ trưng bày & gian hàng (`standee-ke-trung-bay` / `displays-booths`) | Standee, backdrop & POSM (17); Backdrop (9, tách 2026-10-18); Kệ, tủ trưng bày (33); Gian hàng triển lãm (10); Kiosk bán hàng (9); Booth sampling & quầy lễ tân (15) |
| In ấn, decal & menu (`in-an-decal` / `printing-decals`) | Decal, in bạt & tranh canvas (13); In ấn văn phòng (11); Menu (10); Bao bì, thẻ & vé (9) |
| LED decor, màn hình & bảng LED (`man-hinh-bang-led` / `led-displays`) | LED decor (29); Màn hình LED (13); Bảng LED chạy chữ (9); Bảng hiệu LED (32) |
| Biển văn phòng, bảng tên & kỷ niệm chương (`bien-van-phong` / `office-signs`) | Biển số nhà & bảng tên công ty (9); Biển chỉ dẫn & sơ đồ tòa nhà (24); Biển phòng ban (10); Bảng chức danh để bàn (10); Kỷ niệm chương (9) |
| Xe & quầy bán hàng lưu động (`xe-ban-hang-luu-dong` / `mobile-retail`) | Xe bán hàng lưu động (16); Quầy bán hàng di động (14) |

Tên cụm liệt kê vài sản phẩm chính để khách đọc là biết cụm có gì, mở đầu bằng cụm từ có lượt tìm
cao hơn (số liệu trong mô tả PR #312 và báo cáo Library); title có thể khác tên cụm. Quy tắc kèm theo:

- Vật liệu và cấu tạo (inox, mica, alu, hiflex, siêu mỏng, nắp hít) lặp ở nhiều sản phẩm nên là tag, không thành tầng.
- Biển chỉ dẫn gắn tag nơi dùng (khu công nghiệp, nhà máy, văn phòng, tòa nhà) và loại (thoát hiểm, WC; không làm biển
  PCCC theo owner 2026-10-12); chữ của tag vào đoạn giới thiệu và alt. Tag đủ ngưỡng R5 và có lượt tìm thì nâng thành sản phẩm (R2).
- Bảng hiệu LED là biển viền LED dot hoặc LED dây, chữ LED ruồi, LED neon (neon flex) hoặc mặt in: bảng vẫy LED, bảng đứng, bảng treo cửa hàng nhỏ, biển neon làm bảng hiệu (tag `variant-led-neon`).
  Thuộc cụm LED vì nhãn cụm đã có "bảng LED" và ảnh hiện có đa số trong cụm đó; ảnh bảng vẫy LED gắn cả Bảng vẫy và Bảng hiệu LED. Bảng LED ma trận không viền LED chỉ gắn Bảng LED chạy chữ.
  Biển neon nay làm bằng LED neon, không còn neon ống thủy tinh, nên có sản phẩm chính Bảng hiệu LED (vd `signage-raised-letters-33`); tag `variant-led-neon` đủ ngưỡng R5 thì nâng thành sản phẩm LED neon.
- Không làm trang theo tỉnh trong spec này: "bảng hiệu bến tre" 10-100, "quảng cáo bến tre", "in ấn bến tre" 50,
  "bảng hiệu vĩnh long" không có dữ liệu. Đoạn giới thiệu nêu khu vực phục vụ; trang địa phương thuộc [SEO](seo.md).

Ngoài phạm vi: dịch vụ thiết kế logo, nhận diện (dịch vụ, không phải sản phẩm) và thi công showroom (thuộc
trang Commercial), theo owner 2026-10-11.

```gherkin
Given media print-decals-21 gắn sản phẩm "Decal, in bạt & tranh canvas" và "Biển phòng ban"
When lọc sản phẩm "Biển phòng ban"
Then card của print-decals-21 có trong kết quả
And lọc cụm "In ấn, decal & menu" cũng có card đó
```

### R2. Dữ liệu phân loại sửa được

Cụm, sản phẩm và ngưỡng R5 nằm trong `taxonomy.mjs`, gắn media trong `photo-tags.mjs`, không trong code render.
Id cụm, sản phẩm là slug EN lúc tạo (`printing-decals/menus`), giữ nguyên khi slug đổi; thứ tự mảng là thứ tự rail. Tag sản
phẩm cũ có nhóm `variant` và `productId`; `productIds` của media suy từ `productKey` cũ qua tag đó, trừ ảnh sửa nhãn R8. Mỗi cụm: slug VI (không dấu) và slug EN, nhãn (h1, rail, dòng nhóm ở detail), title, meta description, h1, đoạn giới thiệu VI/EN, thứ tự. Mỗi sản phẩm: các
trường như cụm, cộng `cluster`, mô tả dài dùng cho embedding (R6). Mỗi media: danh sách `productIds`, `tagIds`.
Thêm, đổi tên, đổi thứ tự, nâng một tag thành sản phẩm hay chuyển sản phẩm sang cụm khác chỉ sửa dữ liệu; build
sinh lại rail, trang và artifact. Validator từ chối pool khi: sản phẩm trỏ cụm không tồn tại; media trỏ sản
phẩm hay tag không có; trùng slug trong cùng locale; slug VI có dấu; thiếu chữ VI/EN. Ràng buộc bốn loại tỷ lệ ảnh giữ ở cấp cụm; ràng buộc "đủ
12 `productKey` mỗi nhóm" của masonry R2 bỏ. Hình dữ liệu này là bảng của CMS sau này (cụm, sản phẩm,
media-sản phẩm, embedding media); schema D1 thuộc [CMS](cms.md).

```gherkin
Given dữ liệu chuyển tag "Kỷ niệm chương pha lê" thành sản phẩm riêng trong cụm "Biển văn phòng, bảng tên & kỷ niệm chương"
When chạy pnpm prepare:site
Then rail, trang /vi/advertising-products/bien-van-phong/<slug mới>/ và artifact có sản phẩm đó
And không file code render nào đổi
```

### R3. Rail cụm và sản phẩm

Rail giữ kiểu hiện tại (chữ hoa, gạch chân mục đang chọn); hover desktop: gạch chân chạy vào từ trái như nav header
([Filter](../../design-system/components/Filter/README.md)). Hàng một: "Tất cả" rồi sáu cụm, mỗi cụm ghi tên ngắn `railVi`/`railEn` (owner chọn 2026-10-17, ví dụ "Biển văn phòng"); h1, kicker và title giữ nhãn đầy đủ R1. Hover cụm
không mở danh sách sản phẩm (owner bỏ 2026-10-17). Bấm cụm lọc cả cụm và hiện hàng chip sản phẩm kèm số ảnh của cụm
bên dưới, dựng sẵn trong HTML tĩnh; bấm chip lọc riêng sản phẩm đó, chip đang chọn có `aria-current="true"`. Điện
thoại: hàng chip cuộn ngang. Mọi cụm và sản phẩm là `<a href>` tới URL R4. Click chính đổi filter như masonry R3 hiện tại (không tải
document, `replaceState`, card chuyển vị trí); URL thành path trang đích, đổi luôn `document.title` và kicker (h1 của trang tĩnh) theo trang
đích; đổi ngôn ngữ giữ đúng slug của locale; link menu mọi trang trỏ thẳng trang cụm. Chip chỉ có cho sản phẩm đủ
ngưỡng chip R5; chip của sản phẩm chưa có trang trỏ trang cụm kèm `?category=` (R5).
Link sản phẩm mang `data-advertising-product` (không phải `data-advertising-filter`), nên bấm trước khi runtime sẵn
sàng thì trình duyệt mở trang sản phẩm. Hình ảnh rail theo thiết kế owner duyệt 2026-10-15
([Filter](../../design-system/components/Filter/README.md)): từ 1025px rail một hàng nâng lên một bậc, hàng chip nằm
chỗ rail cũ và chữ "Cuộn xuống" vẫn hiện bên dưới; hẹp hơn thì chip nằm ngay dưới rail; trang
tĩnh cụm, sản phẩm hiện sẵn hàng chip. Đang lọc trên masonry mà bấm "Sản phẩm
quảng cáo" trên navbar hoặc menu thì về "Tất cả" ở đầu trang; từ photo thì vẫn về chỗ cũ trên masonry nguồn.

```gherkin
Given /vi/advertising-products/ ở 1440px, runtime sẵn sàng
When bấm cụm "Bảng hiệu, chữ nổi & hộp đèn" rồi bấm chip "Chữ nổi"
Then URL thành /vi/advertising-products/bang-hieu-quang-cao/chu-noi/ bằng replaceState
And chỉ card thuộc sản phẩm đó còn trong masonry, không có request document
And HTML tĩnh của trang gốc đã chứa link tới mọi cụm và sản phẩm đủ ngưỡng
```

### R4. URL và trang index

Build sinh trang tĩnh cho mỗi locale:

- `/{locale}/advertising-products/<cụm>/`
- `/{locale}/advertising-products/<cụm>/<sản phẩm>/`

Trang chỉ sinh cho cụm và sản phẩm đủ ngưỡng trang R5. Trang `/vi/` dùng slug VI không dấu, trang `/en/` dùng slug EN (R1); đoạn path `advertising-products` giữ nguyên
cho cả hai locale. Mỗi trang là trang masonry Advertising với filter đặt sẵn, có title, meta description, h1, đoạn giới thiệu riêng
trong HTML tĩnh (h1 là dòng kicker mang tên cụm, sản phẩm; khẩu hiệu giữ hình nhưng là `p.hero-title`, owner 2026-10-15), canonical trỏ chính nó, hreflang VI/EN. Sáu URL tương thích `/advertising-products/<slug cũ>/`
([phát hành tĩnh R7](static-release.md#r7-sáu-trang-tương-thích-advertising)) chuyển hướng tới trang cụm mới tương
ứng. `?category=<slug cũ hoặc mới>` trên URL gốc: runtime thay URL bằng path cụm mới (`replaceState`), giữ `photo`, `tag` và query
khác. Site tĩnh không trả được 301 theo query; 301 phía server làm khi có Worker CMS (Gate còn mở). Slug đổi về sau
thì slug cũ chuyển về slug mới theo cùng cách R7 phát hành tĩnh. `?photo=` và `?tag=` dùng được trên mọi trang
cụm và sản phẩm như trên trang gốc.

```gherkin
Given build xong
When tải thẳng /en/advertising-products/printing-decals/office-printing/ không JavaScript
Then HTML có h1, đoạn giới thiệu, canonical chính nó và link tới mọi cụm, sản phẩm
And tải /vi/advertising-products/?category=print-decals thì URL thành /vi/advertising-products/in-an-decal/
```

[CẦN LÀM RÕ: trang không JavaScript hiện chỉ có link, chưa render card tĩnh; giữ như masonry R10 hay render tĩnh
một phần card cho Google? Mặc định: giữ như R10, chữ và link trong HTML là đủ cho index (suy luận).]

### R5. Ngưỡng chip và trang mỏng

Hai ngưỡng là hằng số trong `taxonomy.mjs` (R2), đếm số media có `productIds` chứa sản phẩm:

- Từ 3 ảnh (`ADVERTISING_CHIP_PRODUCT_THRESHOLD`): sản phẩm có chip trong hàng chip của cụm (R3), lọc tại chỗ.
- Từ 9 ảnh (`ADVERTISING_THIN_PRODUCT_THRESHOLD`): sản phẩm có thêm trang riêng R4, chip trỏ trang đó.

Sản phẩm có chip mà chưa có trang không tạo URL index mới: chip trỏ trang cụm kèm `?category=<id sản phẩm>`, click
chính ghi URL đó bằng `replaceState`; title, kicker, canonical giữ của trang cụm; không vào danh sách link noscript,
không vào sitemap. Dưới 3 ảnh: không chip, không trang, ảnh vẫn hiện trong cụm. Cụm luôn có trang. Chip và trang
tính lúc build từ số ảnh, không có danh sách sản phẩm viết tay; thêm ảnh hoặc sản phẩm thì chip, trang tự hiện.

Sản phẩm tụt dưới 9 thì build không sinh trang nữa. URL cũ dưới trang cụm rơi vào `404.html` của thư mục cụm
(cơ chế `not_found_handling = "404-page"` lấy 404 gần nhất, như `/en/404.html`): trang đó trả 404, canonical trang
cụm và chuyển tới trang cụm theo cách trang tương thích ([phát hành tĩnh R7](static-release.md#r7-sáu-trang-tương-thích-advertising)).
Google bỏ URL đã mất, người dùng về trang cụm. Phase CMS thay bằng 301 phía Worker (Gate còn mở).

Ràng buộc cho phase CMS (người dùng tự upload ảnh, gắn hoặc tạo tag):

- Sản phẩm có chip cần: `id`, `cluster` trỏ cụm có thật, `labelVi`, `labelEn`, và đủ 3 media đã duyệt gắn `productIds`.
- Sản phẩm có trang cần thêm: `slugVi` (không dấu), `slugEn` không trùng trong cụm, `titleVi`/`titleEn`, `introVi`/`introEn`
  (dùng làm meta description và đoạn giới thiệu), và đủ 9 media đã duyệt. Thiếu chữ thì validator R2 từ chối như hiện nay.
- Đếm theo media đã duyệt, đổi số ảnh thì sinh lại rail, trang, artifact; sitemap chỉ lấy trang R4 (`ADVERTISING_PAGES`).

```gherkin
Given sản phẩm "Menu" có 4 ảnh và sản phẩm "In ấn văn phòng" có 11 ảnh
When build
Then hàng chip cụm "In ấn, decal & menu" có chip "Menu" trỏ /vi/advertising-products/in-an-decal/?category=printing-decals%2Fmenus
And không có trang /vi/advertising-products/in-an-decal/menu/, noscript không link tới nó
And chip "In ấn văn phòng" trỏ /vi/advertising-products/in-an-decal/in-an-van-phong/

Given /vi/advertising-products/in-an-decal/, runtime sẵn sàng
When bấm chip "Menu"
Then URL thành /vi/advertising-products/in-an-decal/?category=printing-decals%2Fmenus bằng replaceState, chỉ card Menu còn
And canonical vẫn là /vi/advertising-products/in-an-decal/

Given sản phẩm X chỉ có 2 ảnh
When build
Then không có chip, không có trang của X, hai ảnh vẫn trong trang cụm của X
```

### R6. Embedding ảnh bằng EmbeddingGemma 2

Model `google/embeddinggemma-2` (Apache 2.0) chạy offline trên PC, không chạy trong CI, không dùng dịch vụ trả
phí. Mỗi media một vector, lưu 256 chiều float16 kèm `model`, `revision`, `dim`, `sha256` của ảnh, trong một file
dữ liệu tĩnh của repo (khoảng 79 KB cho 154 ảnh theo chạy thử 2026-10-12). Vector card là trung bình vector các
media của card, chuẩn hóa độ dài 1. Mỗi sản phẩm và cụm có vector từ mô tả dài (R2) và tâm các ảnh đã duyệt.
Chỉ dùng một model; đổi model hoặc revision thì tính lại toàn bộ. Media thiếu vector hoặc `sha256` lệch ảnh thì
build cảnh báo, related xếp theo R7 không có điểm.

Dùng điểm vào:

1. Gợi ý sản phẩm và tag cho ảnh mới: script in danh sách đề xuất; người hoặc AI duyệt rồi mới ghi dữ liệu R2.
   Điểm không tự gắn sản phẩm (chạy thử: đúng cụm 90%, đúng sản phẩm 62%).
2. Báo ảnh nghi gắn nhầm: script liệt kê ảnh mà điểm không chọn sản phẩm đang gắn, để người xem.
3. Xếp related (R7).

Phong cách một lô ảnh kéo vector gần bằng chính sản phẩm (chạy thử: lô 28 ảnh cùng phong cách), nên điểm chỉ là
gợi ý. Phase CMS: upload media phải kèm vector cùng model; tính trên trình duyệt admin (WebGPU, bản q4) hay trên PC
chốt ở phase CMS (Gate còn mở).

```gherkin
Given ảnh mới chưa có productIds
When chạy script gợi ý trên PC
Then script in ba sản phẩm điểm cao nhất kèm điểm, không sửa file dữ liệu
```

### R7. Related "Có thể bạn thích"

Thay [detail R7](advertising-detail.md#r7-related) phần chọn pool: không tag thì pool là card cùng sản phẩm chính
với ảnh đang xem, rồi card cùng cụm; có tag thì card mang tag trong pool đó trước, rồi mọi card mang tag còn lại. Trong
pool, card xếp theo điểm giảm dần rồi đưa vào solver; seed của lượt duyệt chỉ xáo các card cùng điểm. Điểm cộng ba phần giống ứng viên của CMS (spec `cms-cards` R4 phase 2): độ giống vector, số tag
chung, cùng sản phẩm hoặc cụm; card không có vector chỉ có hai phần sau. Phase tĩnh tự lấy theo điểm; phase CMS người
duyệt ứng viên và chọn top 4 xuất bản, điểm này là thứ tự gợi ý ban đầu.
Danh sách láng giềng có điểm tính lúc build, ghi vào artifact; card cùng cụm điểm 0 không ghi (artifact không phình
theo bình phương số card), runtime nối chúng thành tầng cuối. Trình duyệt không tải vector. Suggestion
([detail R5](advertising-detail.md#r5-suggestion)) lấy nút từ sản phẩm và tag của ảnh, cơ chế bật tắt giữ nguyên.

```gherkin
Given detail của một ảnh Kỷ niệm chương có vector
When related xếp xong
Then các card Kỷ niệm chương đứng trước card khác cùng cụm, theo điểm giảm dần
And không có request tải file vector
```

### R8. Sửa nhãn và ảnh bổ sung

Cùng đợt code:

1. Sửa ba ảnh gắn nhầm do chạy thử phát hiện (owner xác nhận qua báo cáo): `office-signs-wayfinding-02` và `-13`
   sang "Biển phòng ban" hoặc "Biển chỉ dẫn & sơ đồ tòa nhà"; `led-displays-lightboxes-04` sang "Hộp đèn" hoặc "Màn hình LED" theo nội dung ảnh.
2. Gắn thêm sản phẩm cho năm ảnh mơ hồ: `led-displays-lightboxes-09`, `-15`, `mobile-retail-05`,
   `print-decals-21`, `signage-raised-letters-14` (sản phẩm cụ thể chốt trong plan).
3. Thêm 11 ảnh owner duyệt 2026-10-12: tám ảnh Kỷ niệm chương, ba ảnh Bao bì, thẻ & vé. Bản gốc, SHA-256, prompt
   ở `source-assets/advertising-anh-bo-sung-20261012/` trên PC; provenance `imagegen:<ngày>:<loại>:<số>`, model
   ghi `unknown` vì Codex CLI không báo tên model. Ảnh qua chuẩn file của [tải ảnh R5](media-delivery.md#r5-chuẩn-file-ảnh).

```gherkin
Given pool sau đợt code
When lọc sản phẩm "Kỷ niệm chương"
Then masonry có đúng tám card, mỗi card có provenance imagegen và sha256 khớp bản gốc
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Data | `taxonomy.mjs` | cụm, sản phẩm, slug, chữ VI/EN, ngưỡng chip và trang R5; người hoặc CMS sửa |
| Data | `photo-tags.mjs` | tag `variant` mang `productId`; `productIds` mỗi media, sửa nhãn R8 |
| Data | file vector media (R6) | sinh trên PC, build đọc; không vào bundle trình duyệt |
| Route | `/{locale}/advertising-products/<cụm>/[<sản phẩm>/]` | trang tĩnh R4; `<cụm>/?category=<id>` cho sản phẩm chỉ có chip; `<cụm>/404.html` chuyển về trang cụm (R5) |
| DOM hook | `[data-advertising-filter]` | giữ cho cụm; `[data-advertising-product]` cho chip sản phẩm |
| Artifact | `catalog-artifact.mjs` | `clusters`, `products`, tag nhóm `product` sinh từ `products`; card có `productIds` (cũng nằm trong `tagIds`), `clusterIds` (cụm của từng sản phẩm, cùng thứ tự), `category` là cụm của sản phẩm chính, `related` là id láng giềng có điểm theo tầng giảm dần, không gồm tầng điểm 0 (R7); `pages` có thêm mục `query: true` cho sản phẩm chưa có trang, path và chữ của trang cụm (R5) |

## UI

Rail theo component filter trong [Design System](../../design-system/README.md); hàng chip là thiết
kế mới, qua Impeccable cho PC và điện thoại, owner duyệt, ghi trong spec này trước khi code.
Không đổi typography hay layout ngoài rail.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1, R2 | `advertising-products-media.test.mjs` (validator, map sản phẩm cũ, ngưỡng R5, lọc cụm theo mọi sản phẩm, hạng trong filter và lọc sản phẩm) |
| R3 | `advertising-random-browse.e2e.mjs` (rail sáu cụm, lọc cụm); `advertising-pages.test.mjs` (filter ghi path, link sản phẩm tĩnh); `advertising-rail-two-tier.e2e.mjs` (gherkin ở 1440px, chip trên điện thoại) |
| R4 | `advertising-pages.test.mjs` (trang tĩnh, canonical, hreflang, noscript, filter theo path), `advertising-products-detail-routes.test.mjs` (URL cũ tới trang cụm), `advertising-random-browse.e2e.mjs` (`?category=` slug cũ, slug cụm) |
| R5 | `advertising-pages.test.mjs` (chip từ 3 ảnh, trang từ 9 ảnh, chip không trang trỏ `?category=` trên trang cụm, 404 cụm); `advertising-rail-two-tier.e2e.mjs` (bấm chip không trang) |
| R6 | chưa có test (đọc file vector, cảnh báo sha256 lệch) |
| R7 | `advertising-pages.test.mjs` (Kỷ niệm chương đứng trước, nút gợi ý theo sản phẩm), `advertising-products-static.test.mjs` (thứ tự theo tầng); chưa có test điểm vector (T8) |
| R8 | `advertising-products-media.test.mjs` (sửa nhãn); chưa có test cho ảnh bổ sung, provenance |

## Gate còn mở

- Số Keyword Planner cả nước đủ 92 từ khóa chưa có (mới có 20 dòng), cần thì owner tải thêm một lần để soát lại
  title, meta description trong `taxonomy.mjs`.
- 301 phía server cho `?category=`, slug cũ và trang sản phẩm tụt ngưỡng R5: làm khi có Worker CMS.
- Cách tính vector lúc upload ở phase CMS (trình duyệt hay PC): chốt ở phase CMS.
- Map 84 URL site cũ sang trang mới: thuộc [SEO](seo.md); danh sách 84 URL đã thu lại ngày 2026-10-12 (Library
  `advertising-taxonomy/seo/goi-y-tim-kiem-va-site-cu.md`).
- R6 embedding EmbeddingGemma 2 chưa làm: chưa có vector, related và gợi ý loại vẫn theo tag.

## Chú thích thuật ngữ

- **Cụm**: nhóm khái niệm đóng trên rail, ví dụ "LED decor, màn hình & bảng LED".
- **Sản phẩm**: mục cụ thể trong cụm, lọc được; đủ ngưỡng R5 thì có chip, trang riêng.
- **Chip**: link lọc một sản phẩm trong hàng dưới rail cụm.
- **Tag**: nhãn biến thể hoặc vật liệu gắn trên media, không lên rail.
- **Rail**: dải link lọc phía trên masonry (`.project-filters`).
- **Embedding, vector**: dãy số đại diện nội dung ảnh hoặc chữ; hai thứ giống nhau thì vector gần nhau.
- **Láng giềng**: card có vector gần nhất với một ảnh.
- **Trang mỏng**: trang ít nội dung riêng, Google ít đánh giá cao.
- **Canonical, hreflang**: thẻ báo Google URL chuẩn và bản ngôn ngữ khác của trang.
- **Keyword Planner**: công cụ Google Ads cho lượt tìm của từ khóa.
- **SERP**: trang kết quả tìm kiếm của Google.
- **POSM**: vật phẩm quảng cáo tại điểm bán (standee, wobbler, kệ nhỏ).
- **Provenance**: nguồn gốc ảnh (model, ngày, mã nguồn).
