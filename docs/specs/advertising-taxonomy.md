---
title: Phân loại sản phẩm Advertising theo cụm, sản phẩm và tag
status: planned
source:
  - src/site/advertising-products/taxonomy.mjs
tests:
  - tests/site/advertising-products-media.test.mjs
  - tests/site/advertising-random-browse.e2e.mjs
notion: https://app.notion.com/p/3f6332849a0e8113b8c0dbb53a4770fe
updated: 2026-10-14
---

# Phân loại sản phẩm Advertising theo cụm, sản phẩm và tag

## Mục đích

Trang Advertising lọc theo sáu cụm khái niệm và các sản phẩm cụ thể trong từng cụm, mỗi cụm và sản phẩm có
URL riêng để Google index. Phân loại là dữ liệu sửa được, không hard-code trong code render; phase CMS cho
người hoặc AI sửa. EmbeddingGemma 2 chấm điểm ảnh để gợi ý gắn loại và xếp related. Spec planned: intent
owner đã chốt qua `interview-me` 2026-10-11, cây R1 chọn theo nghiên cứu SEO 2026-10-12, owner duyệt spec 2026-10-12; đã có dữ liệu
và validator R2; rail một tầng sáu cụm và filter cụm, sản phẩm đã chạy ([masonry R2, R3](advertising-masonry.md#r3-filter)),
chưa có trang R4, rail hai tầng, related R7.

## Hành vi

### R1. Ba tầng phân loại

Cụm là tập đóng, hiện trên rail, thứ tự theo bảng dưới. Sản phẩm thuộc đúng một cụm, lọc được, có trang index. Tag là biến thể, vật
liệu, kiểu dáng (Inox, Mica, đơn sắc, full color...), gắn trên từng media, không lên rail; từ chi tiết trong
tag xuất hiện trong chữ trang sản phẩm và alt. Một media gắn được nhiều sản phẩm (sản phẩm chính đứng đầu) và
nhiều tag. Card thuộc mọi sản phẩm mà media của nó được gắn; lọc cụm lấy card có sản phẩm chính thuộc cụm. 74 sản phẩm cũ (`<slug>-product-NN`) thành tag,
mỗi tag map về một sản phẩm mới.

Cây chọn theo nghiên cứu SEO 2026-10-12 (Keyword Planner miền Tây và cả nước, SERP, gợi ý Google/Bing, 12 đối
thủ; báo cáo ở `advertising-taxonomy/seo/` trong Library project). Số ảnh tính cả R8; sản phẩm tách mới đếm lại
trong plan, dưới ngưỡng R5 thì gộp về sản phẩm cũ.

| Cụm, nhãn rail và h1 (slug VI / EN) | Sản phẩm (số ảnh) |
| --- | --- |
| Bảng hiệu, chữ nổi & hộp đèn (`bang-hieu-quang-cao` / `signage`) | Bảng hiệu alu & mặt dựng (12); Chữ nổi (10); Hộp đèn (tách từ cụm LED và bảng hiệu); Bảng vẫy (4) |
| Standee, kệ trưng bày & gian hàng (`standee-ke-trung-bay` / `displays-booths`) | Standee, backdrop & POSM (10); Kệ, tủ trưng bày (11); Gian hàng triển lãm (6); Kiosk bán hàng (6); Booth sampling & quầy lễ tân (4) |
| In ấn, decal & menu (`in-an-decal` / `printing-decals`) | Decal, in bạt & tranh canvas (6); In ấn văn phòng (10); Menu (4); Bao bì, thẻ & vé (4) |
| LED decor, màn hình & bảng LED (`man-hinh-bang-led` / `led-displays`) | LED decor (chưa có ảnh); Màn hình LED (9, trừ ảnh hộp đèn); Bảng LED chạy chữ (9) |
| Biển văn phòng, bảng tên & kỷ niệm chương (`bien-van-phong` / `office-signs`) | Biển số nhà & bảng tên công ty (8); Biển chỉ dẫn & sơ đồ tòa nhà, Biển phòng ban (tách từ 20 ảnh "Biển phòng ban & chỉ dẫn"); Bảng chức danh để bàn (3); Kỷ niệm chương (8) |
| Xe & quầy bán hàng lưu động (`xe-ban-hang-luu-dong` / `mobile-retail`) | Xe bán hàng lưu động (10); Quầy bán hàng di động (11) |

Tên cụm liệt kê vài sản phẩm chính để khách đọc là biết cụm có gì (owner 2026-10-12), mở đầu bằng cụm từ có lượt tìm
cao hơn (số liệu trong mô tả PR #312 và báo cáo Library); title có thể khác tên cụm. Quy tắc kèm theo:

- Vật liệu và cấu tạo (inox, mica, alu, hiflex, siêu mỏng, nắp hít) lặp ở nhiều sản phẩm nên là tag, không thành tầng.
- Biển chỉ dẫn gắn tag nơi dùng (khu công nghiệp, nhà máy, văn phòng, tòa nhà) và loại (thoát hiểm, WC; không làm biển
  PCCC theo owner 2026-10-12); chữ của tag vào đoạn giới thiệu và alt. Tag đủ ngưỡng R5 và có lượt tìm thì nâng thành sản phẩm (R2).
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
phẩm cũ có nhóm `variant` và `productId`; `productIds` của media suy từ `productKey` cũ qua tag đó, trừ ảnh sửa nhãn R8. Mỗi cụm: slug VI (không dấu) và slug EN, nhãn đầy đủ (h1), nhãn ngắn `railLabel` (rail, dòng nhóm ở detail), title, meta description, h1, đoạn giới thiệu VI/EN, thứ tự. Mỗi sản phẩm: các
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

Rail giữ kiểu hiện tại (chữ hoa, gạch chân mục đang chọn). Hàng một: "Tất cả" rồi sáu cụm theo nhãn R1. Mỗi cụm có danh sách
sản phẩm kèm số ảnh, dựng sẵn trong HTML tĩnh, ẩn bằng CSS, hiện khi hover hoặc focus vào cụm. Bấm cụm lọc cả cụm
và hiện hàng chip sản phẩm của cụm bên dưới; bấm chip hoặc mục trong danh sách lọc riêng sản phẩm đó, chip đang
chọn có `aria-current="true"`. Điện thoại: chạm cụm lọc cụm và hiện hàng chip cuộn ngang; không có danh sách
hover. Mọi cụm và sản phẩm là `<a href>` tới URL R4. Click chính đổi filter như masonry R3 hiện tại (không tải
document, `replaceState`, card chuyển vị trí); đổi luôn `document.title`, h1 và đoạn giới thiệu theo trang
đích. Sản phẩm dưới ngưỡng R5 không lên rail. Hình ảnh rail theo thiết kế Impeccable owner duyệt (Gate còn mở).

```gherkin
Given /vi/advertising-products/ ở 1440px, runtime sẵn sàng
When hover cụm "LED decor, màn hình & bảng LED" rồi bấm "Bảng LED chạy chữ" trong danh sách
Then URL thành /vi/advertising-products/man-hinh-bang-led/bang-led-chay-chu/ bằng replaceState
And chỉ card thuộc sản phẩm đó còn trong masonry, không có request document
And HTML tĩnh của trang gốc đã chứa link tới mọi cụm và sản phẩm đủ ngưỡng
```

### R4. URL và trang index

Build sinh trang tĩnh cho mỗi locale:

- `/{locale}/advertising-products/<cụm>/`
- `/{locale}/advertising-products/<cụm>/<sản phẩm>/`

Trang `/vi/` dùng slug VI không dấu, trang `/en/` dùng slug EN (R1); đoạn path `advertising-products` giữ nguyên
cho cả hai locale. Mỗi trang là trang masonry Advertising với filter đặt sẵn, có title, meta description, h1, đoạn giới thiệu riêng
trong HTML tĩnh, canonical trỏ chính nó, hreflang VI/EN. Sáu URL tương thích `/advertising-products/<slug cũ>/`
([phát hành tĩnh R7](static-release.md#r7-sáu-trang-tương-thích-advertising)) chuyển hướng tới trang cụm mới tương
ứng. `?category=<slug cũ hoặc mới>` trên URL gốc: runtime thay URL bằng path cụm mới (`replaceState`), giữ `photo`, `tag` và query
khác. Site tĩnh không trả được 301 theo query; 301 phía server làm khi có Worker CMS (Gate còn mở). Slug đổi về sau
thì slug cũ chuyển về slug mới theo cùng cách R7 phát hành tĩnh. `?photo=` và `?tag=` dùng được trên mọi trang
cụm và sản phẩm như trên trang gốc.

```gherkin
Given build xong
When tải thẳng /en/advertising-products/printing-decals/menus/ không JavaScript
Then HTML có h1, đoạn giới thiệu, canonical chính nó và link tới mọi cụm, sản phẩm
And tải /vi/advertising-products/?category=print-decals thì URL thành /vi/advertising-products/in-an-decal/
```

[CẦN LÀM RÕ: trang không JavaScript hiện chỉ có link, chưa render card tĩnh; giữ như masonry R10 hay render tĩnh
một phần card cho Google? Mặc định: giữ như R10, chữ và link trong HTML là đủ cho index (suy luận).]

### R5. Trang mỏng

Sản phẩm có từ 3 ảnh đã gắn và duyệt mới lên rail và có trang. Dưới ngưỡng: không lên rail, không sinh trang,
ảnh vẫn hiện trong cụm. Cụm luôn có trang. Ngưỡng là một hằng số trong dữ liệu (R2). Cây tạm R1 có mọi sản phẩm
từ 3 ảnh.

```gherkin
Given sản phẩm X chỉ có 2 ảnh
When build
Then không có trang của X, rail không có X, hai ảnh vẫn trong trang cụm của X
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
với ảnh đang xem, rồi card cùng cụm; có tag thì mọi card mang tag như hiện tại. Trong pool, card xếp theo điểm giảm dần
rồi đưa vào solver. Điểm cộng ba phần giống ứng viên của CMS (spec `cms-cards` R4 phase 2): độ giống vector, số tag
chung, cùng sản phẩm hoặc cụm; card không có vector chỉ có hai phần sau. Phase tĩnh tự lấy theo điểm; phase CMS người
duyệt ứng viên và chọn top 4 xuất bản, điểm này là thứ tự gợi ý ban đầu.
Danh sách láng giềng tính lúc build, ghi vào artifact; trình duyệt không tải vector. Suggestion
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
| Data | `taxonomy.mjs` | cụm, sản phẩm, slug, chữ VI/EN, ngưỡng R5; người hoặc CMS sửa |
| Data | `photo-tags.mjs` | tag `variant` mang `productId`; `productIds` mỗi media, sửa nhãn R8 |
| Data | file vector media (R6) | sinh trên PC, build đọc; không vào bundle trình duyệt |
| Route | `/{locale}/advertising-products/<cụm>/[<sản phẩm>/]` | trang tĩnh R4 |
| DOM hook | `[data-advertising-filter]` | giữ cho cụm; thêm hook cho sản phẩm và danh sách hover, tên chốt trong plan |
| Artifact | `catalog-artifact.mjs` | `clusters`, `products`; card có `productIds`, `category` là cụm của sản phẩm chính; láng giềng related chưa có |

## UI

Rail theo component filter trong [Design System](../../design-system/README.md); hàng chip và danh sách hover là thiết
kế mới, qua Impeccable cho PC và điện thoại, owner duyệt, ghi ở `design-system/approved-designs.md` trước khi code.
Không đổi typography hay layout ngoài rail.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1, R2 | `advertising-products-media.test.mjs` (validator, map sản phẩm cũ, ngưỡng R5, lọc cụm theo sản phẩm chính và lọc sản phẩm) |
| R5 | chưa có test (rail và trang theo ngưỡng) |
| R3 | `advertising-random-browse.e2e.mjs` (rail sáu cụm, lọc cụm); chưa có test rail hai tầng, chip sản phẩm |
| R4 | `advertising-products-media.test.mjs`, `advertising-random-browse.e2e.mjs` (`?category=` slug cũ, slug cụm); chưa có test trang tĩnh, canonical, hreflang, path |
| R6 | chưa có test (đọc file vector, cảnh báo sha256 lệch) |
| R7 | chưa có test (thứ tự related theo điểm) |
| R8 | `advertising-products-media.test.mjs` (sửa nhãn); chưa có test cho ảnh bổ sung, provenance |

## Gate còn mở

- Số Keyword Planner cả nước đủ 92 từ khóa chưa có (mới có 20 dòng), cần thì owner tải thêm một lần để soát lại
  title, meta description trong `taxonomy.mjs`.
- Thiết kế rail hai tầng (PC, điện thoại): Impeccable, owner duyệt trước code.
- 301 phía server cho `?category=` và slug cũ: làm khi có Worker CMS.
- Cách tính vector lúc upload ở phase CMS (trình duyệt hay PC): chốt ở phase CMS.
- Map 84 URL site cũ sang trang mới: thuộc [SEO](seo.md); danh sách 84 URL đã thu lại ngày 2026-10-12 (Library
  `advertising-taxonomy/seo/goi-y-tim-kiem-va-site-cu.md`).
- Sửa theo spec này khi code: [detail R5, R7](advertising-detail.md#r5-suggestion), [phát hành tĩnh R2, R7](static-release.md#r7-sáu-trang-tương-thích-advertising),
  [Ảnh Advertising](../../design-system/advertising-images.md); menu năm trang còn `?category=<slug cũ>` tới khi có path R4.

## Chú thích thuật ngữ

- **Cụm**: nhóm khái niệm đóng trên rail, ví dụ "LED decor, màn hình & bảng LED".
- **Sản phẩm**: mục cụ thể trong cụm, lọc được, có trang riêng.
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
