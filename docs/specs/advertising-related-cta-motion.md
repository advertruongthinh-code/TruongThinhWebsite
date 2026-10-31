---
title: CTA cuối related và đường chuyển vị trí vòng quanh primary
status: planned
source:
  - src/site/advertising-products/detour-path.mjs
tests:
  - tests/site/advertising-detour-path.test.mjs
  - tests/site/advertising-related-detour.e2e.mjs
notion: https://app.notion.com/p/40a332849a0e81dc8ac7dfe53e35e7fb
updated: 2026-10-31
---

# CTA cuối related và đường chuyển vị trí vòng quanh primary

<!-- Khi code vào main: status live; source thêm src/site/advertising-products/detour-path.mjs; tests thêm
advertising-detour-path.test.mjs, advertising-related-detour.e2e.mjs, advertising-related-cta.e2e.mjs. -->

## Mục đích

Ở detail, sau related khách thấy đúng khối CTA cuối masonry Advertising để liên hệ, như khi duyệt masonry. Khi related
xếp lại, không card nào đi qua cụm primary. Hình học primary, related, history thuộc [detail](advertising-detail.md);
chữ CTA, batch, Kính cung thuộc [CTA giữa viewport](advertising-cta-center-parallax.md), [skeleton](advertising-skeleton.md),
[Kính](glass-surface.md). Spec này sở hữu chỗ đặt CTA trong detail và đường đi của card related.

## Hành vi

### R1. Cùng một CTA, hai host

Ba node CTA là một bộ duy nhất trong trang, không clone: batch `[data-advertising-cta-skeleton]`, cụm
`section.detail-cta[data-advertising-grid-cta]` và Kính cung (`createGlassSurface("arc")`). Khi duyệt masonry chúng ở
host grid như nay (`.project-index`, batch trong `[data-project-grid]`); mở detail (`renderPhoto`, lúc `activePhotoId`
được ghi) runtime dọn batch grid (`clearCtaSkeleton`) rồi chuyển cả ba node sang host detail
`.advertising-photo-view__canvas` (`[data-advertising-photo-canvas]`, sau `.advertising-photo-view__related`); về
masonry (`restoreGridEntry`) dọn batch detail rồi chuyển về host grid, grid dựng lại như nay. Giữ node nên renderer Flow,
band theo slot, cỡ chữ đã đo và Kính không mất; `[data-advertising-cta-skeleton]` mang
`data-advertising-cta-host="grid" | "detail"` cho test.

`renderCtaSkeleton` nhận hình học từ host: host grid là `geometry` của masonry; host detail là `relatedLayout.layout`
(`columns`, `cardWidth`, `interCardGap`, `columnBottoms`, `totalPixelHeight`, `coordinateHash`). `columnBottoms` của
related đã tính cột primary chiếm (`initialColumnBottoms` bằng chiều cao primary), nên cột dưới primary không có card
thì khung batch đầu nằm một khoảng giữa dưới primary; cột không có gì (cột 4 khi related rỗng ở `split`) thì khung bắt
đầu từ đầu cột cạnh primary theo [skeleton R1](advertising-skeleton.md#r1-batch-nối-tiếp-masonry). Mọi số đo khác giữ
nguyên công thức của [CTA R1-R5](advertising-cta-center-parallax.md): `--advertising-cta-top` bằng đáy cao nhất của
các cột cộng một khoảng giữa, `--advertising-cta-tail-height` như R2, chân chữ dòng cuối trên đường giữa viewport tại
cuối trang, Kính cung theo `arcGlassGeometry`. Biến ghi lên host (`--advertising-cta-top` lên canvas). Chiều cao: batch
`style.height` bằng đáy CTA; canvas `--advertising-photo-canvas-height` bằng đáy CTA (trước đây bằng chiều cao related);
related grid giữ `--advertising-photo-related-height` bằng chiều cao related để cửa sổ ảo không đổi. Footer ở detail
cũng bỏ khoảng phía trên (`body.is-advertising-browse .site-footer { --footer-top-gap: 0 }`, bỏ điều kiện
`:not(.is-advertising-photo)`), `.advertising-photo-view` bỏ đệm dưới `7rem`, bỏ rule ẩn
`body.is-advertising-photo .detail-cta[data-advertising-grid-cta]`. Parallax [CTA R6](advertising-cta-center-parallax.md#r6-parallax-của-cta)
chạy cả ở detail (bỏ nhánh `activePhotoId` cho độ lệch 0). CTA trong info primary vẫn giữ. Related rỗng: `placements`
rỗng, CTA nằm một khoảng giữa dưới primary. Áp dụng `split` và `pinterest`, mọi chiều rộng từ 320px, VI/EN, mọi tag,
vào thẳng, route mềm, Back và Forward; đổi ngôn ngữ đo lại cỡ chữ như nay (khóa đo có `lang`).

Nhịp task khi mở detail giữ năm task của [detail R7](advertising-detail.md#r7-related): CTA dựng trong `layoutRelated` ngay
sau khi có `relatedLayout` ở pha `related` (solver đầy đủ) và các lượt xếp lại sau; không dựng ở pha `primary` (chưa có
related) và `warm` (layout thử 12 card). Resize trong detail (`scheduleResize` nhánh `activePhotoId`) dựng lại qua
`layoutRelated`; chỉ đổi chiều cao viewport cũng dựng lại vì đuôi CTA theo viewport.

```gherkin
Given detail ở 1569x912 có related, cuộn tới cuối trang
Then chân chữ dòng cuối của tiêu đề CTA nằm trên đường giữa viewport, sai số 1px
And batch Flow nối tiếp các cột related, đáy batch là đáy CTA, ngay trên footer, không khoảng trên footer
And [data-advertising-cta-skeleton] có data-advertising-cta-host="detail", info primary vẫn có nút của nó

Given detail của ảnh không có related
When pha related xong
Then --advertising-cta-top bằng chiều cao primary cộng một khoảng giữa

Given đang ở detail, bấm Back về masonry
Then data-advertising-cta-host="grid", chiều cao [data-project-grid] bằng đáy CTA như masonry R11
```

### R2. CTA trượt cùng related khi xếp lại

Đổi tag, resize, mở ảnh khác trong trang làm related xếp lại có chuyển động (có `origins`), `layoutRelated` gọi
`renderCtaSkeleton({ slide: true })` trước `renderRelatedWindow`: đọc rect đang thấy của khung batch, cụm CTA, Kính rồi
mới ghi layout mới, trượt `0.4s ease` bằng `translate` như masonry ([masonry R6](advertising-masonry.md#r6-đặt-card-và-chuyển-vị-trí)),
khung batch co giãn từ cỡ cũ, cụm CTA và Kính chỉ trượt thẳng. Khung batch đi theo R3. Giảm chuyển động: đặt thẳng.

```gherkin
Given detail 1569x912, related có card ở cột 4
When bật tag ở suggestion
Then khung batch, cụm CTA, Kính cung trượt từ chỗ cũ tới chỗ mới trong 0.4s, không nhảy
```

### R3. Không card nào đi qua primary

Tọa độ là tọa độ related grid (cùng gốc với canvas). Vùng cấm là hộp primary `P = [0, pw] × [0, ph]` với `pw`, `ph` là
`relatedLayout.primary.width`, `.height`. Hộp rộng `w` cao `h` đặt góc trên trái tại `p` đè lên `P` khi và chỉ khi
`p` nằm trong `Z = (−w, pw) × (−h, ph)` (khoảng mở, chạm mép không tính). Chuyển thẳng từ `A` tới `B` cắt primary khi
đoạn `AB` cắt `Z` (kiểm bằng slab test). Solver không bao giờ đặt card đè primary nên `A`, `B` ngoài `Z`: mỗi điểm hoặc
"bên cạnh" (`x ≥ pw`) hoặc "phía dưới" (`y ≥ ph`). Hai điểm cùng bên cạnh hoặc cùng phía dưới thì đoạn thẳng không cắt
`Z`; chỉ một bên cạnh, một phía dưới mới có thể cắt. Khi cắt, card đi hai đoạn qua góc
`C = (x của điểm bên cạnh, y của điểm phía dưới)`: `C.x ≥ pw` và `C.y ≥ ph` nên đoạn `AC` và `CB` (mỗi đoạn thẳng đứng
hoặc nằm ngang) không cắt `Z`. Góc vuông, không bo (owner 2026-10-31). Cỡ hộp lấy số lớn hơn giữa cỡ cũ và cỡ mới của
card. Tổng thời gian `0.4s ease` như card khác, tốc độ đều dọc đường: keyframe góc tại offset `|AC| / (|AC| + |CB|)`,
easing đặt ở mức animation. Không cắt thì trượt thẳng như nay. Resize làm primary lớn lên đè chỗ cũ của card (điểm đầu nằm trong `Z`) thì
card xuất phát ngay dưới primary mới (`y = ph +` khoảng giữa, giữ `x`) rồi mới tính đường như trên.

Áp dụng cho mọi card related, card suggestion khi nằm trong related và khung batch (R2); cụm CTA và Kính cung rộng cả
lưới, luôn dưới mọi thứ nên trượt thẳng. Card mới vào cửa sổ ảo không có `origins` vẫn xuất phát từ đầu cột
(`columnHead`) như nay, đường thẳng đứng không cắt. `pinterest`: primary chiếm hết cột nên mọi card phía dưới, không
có đường vòng. Giảm chuyển động: đặt thẳng, không animation.

Cơ chế: `renderRelatedWindow` tính đường cho từng card có `origins`; card cần vòng được Masonry đặt tức thì tại `B`
(`isLayoutInstant`, ghi `left`, `top` bằng đích) rồi chạy Web Animations trên thuộc tính `translate` (như `slideFrom`,
tách khỏi `transform` Masonry giữ): keyframe `[A−B, C−B (offset góc), 0 0]`, `duration: 400`, `easing: "ease"`. Card
khác giữ transition `transform` của Masonry. `cancelRelatedMotion` hủy cả animation `translate` này; `relatedVisualCoordinates`
đọc `getBoundingClientRect` (có `translate`) nên ngắt giữa chừng thì lượt sau xuất phát từ chỗ đang thấy. Hàm tính
đường là hàm thuần `planDetourPath({ from, to, size, zone })` trong `detour-path.mjs`, trả `null` (đi thẳng) hoặc
`{ corner, cornerOffset }`; `slideFrom` dùng cùng hàm cho khung batch (giữ `scale` co giãn, thêm keyframe góc).

```gherkin
Given detail 1569x912 layout split, card X ở cột 4 cạnh primary
When bật tag ở suggestion làm X chuyển xuống dưới primary
Then ở mọi frame trong 0.4s, hộp của X không giao hộp primary (đo rect mỗi requestAnimationFrame)
And X tới đúng tọa độ placement khi chuyển vị trí kết thúc, tổng thời gian không quá 0.45s

Given detail 1569x912, resize về 820x912 (pinterest)
Then không card related hay khung batch nào giao hộp primary ở bất kỳ frame nào
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| DOM hook | `[data-advertising-cta-skeleton][data-advertising-cta-host]` | Batch; host hiện tại `grid` hoặc `detail` (runtime ghi, test đọc) |
| DOM hook | `[data-advertising-grid-cta]`, Kính cung | Cụm CTA và Kính chuyển host cùng batch |
| DOM hook | `[data-advertising-photo-canvas]` | Host detail: nhận ba node, `--advertising-cta-top`, `--advertising-photo-canvas-height` bằng đáy CTA |
| CSS | `--footer-top-gap: 0` cho `body.is-advertising-browse .site-footer` | Batch lấp chỗ trên footer ở cả hai chế độ |
| Runtime | `renderCtaSkeleton(host)`, `clearCtaSkeleton()` | Dựng, dọn batch theo host |
| Runtime | `renderRelatedWindow`, `slideFrom` | Đường đi card related, khung batch |
| Module | `detour-path.mjs` `planDetourPath({ from, to, size, zone })` | Hàm thuần: `null` hoặc `{ corner, cornerOffset }` |

## Kiểm tra

| Requirement | Bằng chứng |
| --- | --- |
| R3 hàm thuần | `advertising-detour-path.test.mjs`: fixture cố định; thẳng khi cùng bên cạnh hoặc cùng phía dưới; góc đúng công thức; offset theo độ dài; bất biến: mọi điểm trên hai đoạn ngoài `Z` |
| R3 e2e | `advertising-related-detour.e2e.mjs`: 1569x912 bật tag và resize 820, lấy mẫu rect mỗi frame, giao với primary bằng 0; phone 384x854 (chromium emulate) cùng kiểm |
| R1, R2 e2e | `advertising-related-cta.e2e.mjs`: host detail, chân chữ giữa viewport sai số 1px tại cuối trang, đáy batch trên footer, nút info còn, related rỗng (chọn hero từ catalog lúc chạy; không có thì ghi log và bỏ ca), Back về grid dựng lại; bật tag thì CTA trượt |
| Phone | A04s: pha `related` cộng CTA vẫn dưới gate 50ms ([detail gate](advertising-detail.md#gate-còn-mở)); quá thì tách CTA sang task sau mount related |

## Gate còn mở

- Owner duyệt spec và plan ([card](https://app.notion.com/p/40a332849a0e81dc8ac7dfe53e35e7fb)).

## Chú thích thuật ngữ

- **Primary**: khối ảnh đang xem cùng info ở đầu detail.
- **Related**: masonry các ảnh liên quan dưới và cạnh primary.
- **Host**: phần tử chứa ba node CTA; grid khi duyệt, canvas detail khi mở ảnh.
- **Batch**: các khung skeleton Flow nối tiếp masonry phía dưới, nền của CTA.
- **Vùng cấm**: hộp primary mở rộng theo cỡ card, nơi góc card không được đi vào.
- **Slab test**: kiểm đoạn thẳng cắt hộp chữ nhật bằng khoảng tham số trên từng trục.
- **Khoảng giữa**: gap giữa hai card masonry.
