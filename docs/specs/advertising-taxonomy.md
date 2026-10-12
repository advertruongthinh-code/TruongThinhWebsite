---
title: Phân loại sản phẩm Advertising theo cụm, sản phẩm và tag
status: planned
source: []
tests: []
notion: https://app.notion.com/p/3f6332849a0e8113b8c0dbb53a4770fe
updated: 2026-10-12
---

# Phân loại sản phẩm Advertising theo cụm, sản phẩm và tag

## Mục đích

Trang Advertising lọc theo sáu cụm khái niệm và các sản phẩm cụ thể trong từng cụm, mỗi cụm và sản phẩm có
URL riêng để Google index. Phân loại là dữ liệu sửa được, không hard-code trong code render; phase CMS cho
người hoặc AI sửa. EmbeddingGemma 2 chấm điểm ảnh để gợi ý gắn loại và xếp related. Spec planned: intent
owner đã chốt qua `interview-me` 2026-10-11, chờ owner duyệt; chưa có code nào thuộc spec này. Spec thay
phần nhóm và filter của [masonry R2, R3](advertising-masonry.md#r2-catalog-và-artifact) khi code xong.

## Hành vi

### R1. Ba tầng phân loại

Cụm là tập đóng, hiện trên rail. Sản phẩm thuộc đúng một cụm, lọc được, có trang index. Tag là biến thể, vật
liệu, kiểu dáng (Inox, Mica, đơn sắc, full color...), gắn trên từng media, không lên rail; từ chi tiết trong
tag xuất hiện trong chữ trang sản phẩm và alt. Một media gắn được nhiều sản phẩm (sản phẩm chính đứng đầu) và
nhiều tag. Card thuộc mọi sản phẩm mà media của nó được gắn. 74 sản phẩm cũ (`<slug>-product-NN`) thành tag,
mỗi tag map về một sản phẩm mới.

Cây tạm (nhãn và slug chốt theo R7; số ảnh tính cả R8):

| Cụm (slug hiện tại) | Sản phẩm (số ảnh) |
| --- | --- |
| Kiosk, gian hàng & POSM (`kiosk-posm`) | Gian hàng triển lãm (6); Quầy, kệ, tủ trưng bày (11); Kiosk (6); Quầy sampling & lễ tân sự kiện (4); Vách, standee & bộ POSM (10) |
| Xe & quầy bán hàng lưu động (`mobile-retail`) | Xe bán hàng (10); Quầy di động & pop-up (11) |
| Biển hiệu & chữ nổi 3D (`signage-raised-letters`) | Bảng hiệu ngoại thất & khổ lớn (12); Chữ nổi 3D (10); Bảng vẫy (4) |
| Bảng tên, biển văn phòng & chức danh (`office-signs-wayfinding`) | Biển số nhà & tên đường (8); Bảng chức danh để bàn (3); Biển phòng ban & chỉ dẫn (20); Kỷ niệm chương (8) |
| Bảng LED & công nghệ LED (`led-displays-lightboxes`) | LED ma trận chạy chữ (9); Màn hình LED & hộp đèn siêu mỏng (9) |
| In nhanh & ấn phẩm marketing (`print-decals`) | In nhanh kỹ thuật số (10); Menu (4); In bạt, decal & tranh (6); Bao bì, thẻ & vé (4) |

Ngoài phạm vi: dịch vụ thiết kế logo, nhận diện (dịch vụ, không phải sản phẩm) và thi công showroom (thuộc
trang Commercial), theo owner 2026-10-11.

```gherkin
Given media print-decals-21 gắn sản phẩm "In bạt, decal & tranh" và "Biển phòng ban & chỉ dẫn"
When lọc sản phẩm "Biển phòng ban & chỉ dẫn"
Then card của print-decals-21 có trong kết quả
And lọc cụm print-decals cũng có card đó
```

### R2. Dữ liệu phân loại sửa được

Cụm, sản phẩm và gắn media nằm trong dữ liệu tĩnh của `src/site/advertising-products/`, không trong code
render. Mỗi cụm: `slug`, nhãn, title, meta description, h1, đoạn giới thiệu VI/EN, thứ tự. Mỗi sản phẩm: các
trường như cụm, cộng `cluster`, mô tả dài dùng cho embedding (R6). Mỗi media: danh sách `productIds`, `tagIds`.
Thêm, đổi tên, đổi thứ tự, nâng một tag thành sản phẩm hay chuyển sản phẩm sang cụm khác chỉ sửa dữ liệu; build
sinh lại rail, trang và artifact. Validator từ chối pool khi: sản phẩm trỏ cụm không tồn tại; media trỏ sản
phẩm hay tag không có; trùng slug; thiếu chữ VI/EN. Ràng buộc bốn loại tỷ lệ ảnh giữ ở cấp cụm; ràng buộc "đủ
12 `productKey` mỗi nhóm" của masonry R2 bỏ. Hình dữ liệu này là bảng của CMS sau này (cụm, sản phẩm,
media-sản phẩm, embedding media); schema D1 thuộc [CMS](cms.md).

```gherkin
Given dữ liệu chuyển tag "Kỷ niệm chương pha lê" thành sản phẩm riêng trong cụm office-signs-wayfinding
When chạy pnpm prepare:site
Then rail, trang /vi/advertising-products/office-signs-wayfinding/<slug mới>/ và artifact có sản phẩm đó
And không file code render nào đổi
```

### R3. Rail cụm và sản phẩm

Rail giữ kiểu hiện tại (chữ hoa, gạch chân mục đang chọn). Hàng một: "Tất cả" rồi sáu cụm. Mỗi cụm có danh sách
sản phẩm kèm số ảnh, dựng sẵn trong HTML tĩnh, ẩn bằng CSS, hiện khi hover hoặc focus vào cụm. Bấm cụm lọc cả cụm
và hiện hàng chip sản phẩm của cụm bên dưới; bấm chip hoặc mục trong danh sách lọc riêng sản phẩm đó, chip đang
chọn có `aria-current="true"`. Điện thoại: chạm cụm lọc cụm và hiện hàng chip cuộn ngang; không có danh sách
hover. Mọi cụm và sản phẩm là `<a href>` tới URL R4. Click chính đổi filter như masonry R3 hiện tại (không tải
document, `replaceState`, card chuyển vị trí); đổi luôn `document.title`, h1 và đoạn giới thiệu theo trang
đích. Sản phẩm dưới ngưỡng R5 không lên rail. Hình ảnh rail theo thiết kế Impeccable owner duyệt (Gate còn mở).

```gherkin
Given /vi/advertising-products/ ở 1440px, runtime sẵn sàng
When hover cụm "Bảng LED & công nghệ LED" rồi bấm "LED ma trận chạy chữ" trong danh sách
Then URL thành /vi/advertising-products/led-displays-lightboxes/<slug sản phẩm>/ bằng replaceState
And chỉ card thuộc sản phẩm đó còn trong masonry, không có request document
And HTML tĩnh của trang gốc đã chứa link tới mọi cụm và sản phẩm đủ ngưỡng
```

### R4. URL và trang index

Build sinh trang tĩnh cho mỗi locale:

- `/{locale}/advertising-products/<cụm>/`
- `/{locale}/advertising-products/<cụm>/<sản phẩm>/`

Mỗi trang là trang masonry Advertising với filter đặt sẵn, có title, meta description, h1, đoạn giới thiệu riêng
trong HTML tĩnh, canonical trỏ chính nó, hreflang VI/EN. Sáu URL tương thích `/advertising-products/<slug>/` hiện
chỉ chuyển hướng ([phát hành tĩnh R7](static-release.md#r7-sáu-trang-tương-thích-advertising)) trở thành trang cụm
thật. `?category=<slug>` trên URL gốc: runtime thay URL bằng path cụm (`replaceState`), giữ `photo`, `tag` và query
khác. Site tĩnh không trả được 301 theo query; 301 phía server làm khi có Worker CMS (Gate còn mở). Slug đổi theo R7
thì slug cũ chuyển về slug mới theo cùng cách R7 phát hành tĩnh. `?photo=` và `?tag=` dùng được trên mọi trang
cụm và sản phẩm như trên trang gốc.

```gherkin
Given build xong
When tải thẳng /en/advertising-products/print-decals/<slug Menu>/ không JavaScript
Then HTML có h1, đoạn giới thiệu, canonical chính nó và link tới mọi cụm, sản phẩm
And tải /vi/advertising-products/?category=print-decals thì URL thành /vi/advertising-products/print-decals/
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
với ảnh đang xem, rồi card cùng cụm; có tag thì mọi card mang tag như hiện tại. Trong pool, card xếp theo độ giống
vector card với ảnh đang xem, giảm dần, rồi đưa vào solver; card không có vector đứng sau, theo thứ tự xáo hiện tại.
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
   sang "Biển phòng ban & chỉ dẫn"; `led-displays-lightboxes-04` sang "Màn hình LED & hộp đèn siêu mỏng".
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
| Data | dữ liệu cụm, sản phẩm (file trong `advertising-products/`, tên chốt trong plan) | R2, người hoặc CMS sửa |
| Data | `photo-tags.mjs` | thêm `productIds` mỗi media; tag sản phẩm cũ thành tag chi tiết |
| Data | file vector media (R6) | sinh trên PC, build đọc; không vào bundle trình duyệt |
| Route | `/{locale}/advertising-products/<cụm>/[<sản phẩm>/]` | trang tĩnh R4 |
| DOM hook | `[data-advertising-filter]` | giữ cho cụm; thêm hook cho sản phẩm và danh sách hover, tên chốt trong plan |
| Artifact | `catalog-artifact.mjs` | thêm cụm, sản phẩm, láng giềng related |

## UI

Rail theo component filter trong [Design System](../../design-system/README.md); hàng chip và danh sách hover là thiết
kế mới, qua Impeccable cho PC và điện thoại, owner duyệt, ghi ở `design-system/approved-designs.md` trước khi code.
Không đổi typography hay layout ngoài rail.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1, R2, R5 | chưa có test (validator dữ liệu, test node) |
| R3 | chưa có test (e2e rail, không request document) |
| R4 | chưa có test (build sinh trang, canonical, hreflang, thay `?category=`) |
| R6 | chưa có test (đọc file vector, cảnh báo sha256 lệch) |
| R7 | chưa có test (thứ tự related theo điểm) |
| R8 | chưa có test (đếm card theo sản phẩm, provenance) |

## Gate còn mở

- Nhãn rail, title, h1 và slug cụm, sản phẩm: chốt theo số Keyword Planner; owner cần bật thanh toán Google Ads
  một lần. Danh sách từ khóa ứng viên đã có trong Library project (`advertising-taxonomy/tu-khoa-ung-vien.md`).
- Thiết kế rail hai tầng (PC, điện thoại): Impeccable, owner duyệt trước code.
- 301 phía server cho `?category=` và slug cũ: làm khi có Worker CMS.
- Cách tính vector lúc upload ở phase CMS (trình duyệt hay PC): chốt ở phase CMS.
- Map 84 URL site cũ sang trang mới: thuộc [SEO](seo.md), đang tạm dừng; danh sách URL chưa tìm lại được.
- Sửa theo spec này khi code: [masonry R2, R3](advertising-masonry.md#r2-catalog-và-artifact),
  [detail R5, R7](advertising-detail.md#r5-suggestion), [phát hành tĩnh R2, R7](static-release.md#r7-sáu-trang-tương-thích-advertising),
  `PRODUCT.md` (danh mục), [Ảnh Advertising](../../design-system/advertising-images.md) và dòng "đúng nhóm, sản phẩm" của
  [chấm ảnh](../operations/agent-rule-evidence-qa-handoff.md#chấm-ảnh-advertising) thành "đúng cụm, sản phẩm, tag".

## Chú thích thuật ngữ

- **Cụm**: nhóm khái niệm đóng trên rail, ví dụ "Bảng LED & công nghệ LED".
- **Sản phẩm**: mục cụ thể trong cụm, lọc được, có trang riêng.
- **Tag**: nhãn biến thể hoặc vật liệu gắn trên media, không lên rail.
- **Rail**: dải link lọc phía trên masonry (`.project-filters`).
- **Embedding, vector**: dãy số đại diện nội dung ảnh hoặc chữ; hai thứ giống nhau thì vector gần nhau.
- **Láng giềng**: card có vector gần nhất với một ảnh.
- **Trang mỏng**: trang ít nội dung riêng, Google ít đánh giá cao.
- **Canonical, hreflang**: thẻ báo Google URL chuẩn và bản ngôn ngữ khác của trang.
- **Keyword Planner**: công cụ Google Ads cho lượt tìm của từ khóa.
- **Provenance**: nguồn gốc ảnh (model, ngày, mã nguồn).
