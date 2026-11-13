---
title: Cache bố cục masonry
status: live
source:
  - src/site/masonry/packer.mjs
  - src/site/masonry/replay.mjs
  - scripts/site/layout-cache-preload.mjs
tests:
  - tests/site/masonry-packer.test.mjs
  - tests/site/masonry-replay.test.mjs
  - tests/site/masonry-layout-fuzz.test.mjs
  - tests/site/masonry-layout-cache.e2e.mjs
  - tests/site/layout-cache-memo.test.mjs
  - tests/site/advertising-layout-cache-pending.e2e.mjs
  - tests/site/advertising-layout-cache-preload.e2e.mjs
notion: https://app.notion.com/p/414332849a0e818cbc0ac40c21e192cf
updated: 2026-11-11
---

# Cache bố cục masonry

## Mục đích

Lưới chính trang Quảng cáo và trang Công trình đặt card theo bố cục tính sẵn lúc build: không lỗ giữa lưới, card ngang
rộng hai cột, máy người xem chỉ đặt lại bằng một vòng lặp O(n), không tìm kiếm. Spec này sở hữu thuật toán build, file
cache, đường nạp và contract cho CMS. Hình học một cột, ảo hóa, chuyển vị trí ở [masonry Advertising](advertising-masonry.md);
related masonry không dùng cache. Lý do thiết kế: [decision](../decisions/masonry-layout-cache.md).

## Hành vi

### R1. Luật hình học

Chỉ hai lưới chính (O5) và chỉ từ 3 cột: card có ảnh bìa từ tỷ lệ vàng (`isWideMedia`, `w × 1000 >= h × 1618`) rộng hai cột
kề; điện thoại (2 cột), related, card gợi ý và khung ghim luôn một cột. Hình học là yêu cầu cứng duy nhất: giữa lưới không có
khoảng trống ngoài khoảng giữa, ở mọi bề rộng. Không xếp được thì leo thang theo thứ tự: (1) đổi chỗ vài card gần đó, (2) cắt
media của các card cuối cột dài hơn, mỗi card không quá `CROP_CAP = 5%` chiều cao media, chỉ thấp đi, cắt đều trên dưới
(`mediaBleed`), (3) riêng card ngang đó về một cột (`demoted`, build in cảnh báo, không đỏ). Card một cột không vượt hạng
`filterRank`; card ngang được lệch qua ranh giới hạng. Chiều cao card bằng chiều cao media ([media-card R2](media-card.md#r2-canvas-và-hàng-pill-trong-media)),
nên bố cục chỉ phụ thuộc bề rộng card và khoảng giữa.

Bố cục lưu theo 5 dải `LAYOUT_BANDS` (số cột và khoảng giữa; `bandKey(viewport)`): `2:15` (280–719), `3:15` (720–960), `3:25`
(961–1004), `4:25` (1005–1200), `4:35` (từ 1201). Đáy mỗi cột là hàm bậc nhất của bề rộng card, nên một bố cục đúng ở hai đầu dải
là đúng cả dải (dải `4:35` kiểm tới 4000px). Test khóa bảng dải với `columnsForWidth` và `masonrySpacing`: đổi một trong hai mà
quên `LAYOUT_BANDS` thì đỏ.

```gherkin
Given viewport 1440px, filter All, catalog thật
When replay mọi biến thể giữ lại
Then không card nào bị cắt quá 5%, không card ngang nào bị hạ về một cột, không lỗ
And ở 390px mọi card rộng một cột
```

### R2. Packer (build)

`buildLayoutCache({ cards, filters, datasetVersion, rankOf, matches })` (`packer.mjs`, thuần, không đọc DOM; trang public không
tải file này). Mỗi filter: `LAYOUT_CACHE_CANDIDATES = 128` thứ tự gốc (`shuffleWithSeed` với seed `layout:<datasetVersion>`, xếp
ổn định theo hạng), mỗi thứ tự xếp trên cả 5 dải bằng `packBand` (hàng đợi tuần tự; card ngang chờ tối đa `MAX_DEFER = 20` card
để có cặp cột chênh đáy trong ngưỡng cắt, được lấp bằng tối đa `MAX_PARTNERS = 3` card một cột trong `PARTNER_WINDOW = 12` card kế tiếp;
card ngang nằm trong `TAIL_GUARD = 12` vị trí cuối bị dời lên trước, vì cuối hàng đợi không còn card để khép đáy). Điểm một ứng viên, nhỏ hơn là tốt hơn: số card ngang bị hạ trên 5 dải,
nhịp organic của 12 card đầu ([masonry R4](advertising-masonry.md#r4-thứ-tự-ngẫu-nhiên-theo-lượt-duyệt)), số mép dưới thẳng hàng
tại bề rộng chuẩn (`staggerViolations`, ưu tiên mềm O9), tỷ lệ cắt lớn nhất. Giữ `LAYOUT_CACHE_MIN_VARIANTS = 8` ứng viên đầu; từ
thứ 9 tới `LAYOUT_CACHE_MAX_VARIANTS = 32` chỉ giữ ứng viên khác biệt, không hạ card ngang và không quá `STAGGER_SLACK = 1.25 ×`
số mép thẳng hàng của ứng viên thứ 8, nên số biến thể khác nhau theo filter. Mỗi bố cục mã hóa thành mảng số nguyên
`cardIndex × 8 + code` (`code` 0–3 là cột của card một cột, 4–6 là `4 +` cột trái của card hai cột). Tự kiểm: mọi biến thể giữ lại
phải `replayLayout` được và qua `verifyLayout` ở bề rộng nhỏ nhất, chuẩn, lớn nhất của dải; sai thì build `throw`
(`layout-cache: self-check failed <filter> <dải> <bề rộng>px`). Kết quả của một catalog được nhớ trên đĩa khi chạy local
(`scripts/site/layout-cache-memo.mjs`, khóa theo card, filter, `packer.mjs`, `replay.mjs`, `layout.mjs`, `random-order.mjs`); CI luôn build lại.

```gherkin
Given một filter có biến thể để lỗ hoặc thiếu card ở một đầu dải
When chạy pnpm prepare:site
Then build dừng, bố cục sai không bao giờ được ghi ra
```

### R3. File cache

Trang Quảng cáo: build ghi `advertising-products/layout-cache/` hai loại file `export default { version, band, filters: { <filter>:
{ sig, variants } } }`: `<dải>.mjs` (mọi filter của dải, tải sau card đầu) và `<dải>/<filter>.mjs` (một filter, tải trước card
đầu); `<dải>` đổi `:` thành `-`, id filter chỉ gồm chữ thường, số, `-` và `/` (ngoài đó build `throw`). 165 file (5 + 160). Artifact mang
`layoutCacheFilterUrl` và `layoutCacheBandUrl` ([masonry Advertising](advertising-masonry.md#giao-diện-và-dữ-liệu)); `version`
bằng `masonry-grid-v17`, sai thì coi như lỗi. Trang Công trình ít card nên nhúng thẳng `layouts` (mọi filter, 5 dải) vào artifact.
`sig` là `poolSignature` (mã hóa id và kích thước media của pool theo thứ tự `artifact.cards`): card đổi thì chữ ký lệch.
Đường `/advertising-products/*` là route Worker-first: file cache đi cùng đường với `catalog-artifact.mjs`, `tests/worker/worker-contract.cjs` kiểm `layout-cache/4-35/all.mjs` trả 200.

### R4. Đặt lại và nạp ở runtime

`mountMasonry` chọn biến thể `variantIndex(seed, số biến thể của filter)` (cùng seed và filter cho cùng biến thể ở mọi dải) rồi
`replayLayout` (một vòng O(n), trả cùng hình dạng layout với `compileMasonryLayout`, `diagnostics.source = "cache"`). Chữ ký
lệch, cache lỗi, quá 4s, hoặc `replayLayout` trả `null`: cả lưới một cột theo thứ tự seed, vào cột thấp nhất
(`stackLayout`, không lỗ), `console.warn("[masonry] layout cache miss")` một lần mỗi filter và dải. Artifact không khai báo cache
thì dùng `stackLayout` im lặng; cache đang tải chỉ `console.debug`. Nạp hai bước: script inline trong `<head>` mỗi trang lưới
(`layout-cache-preload.mjs`, ngưỡng dải lấy từ `LAYOUT_BANDS`, không có ở trang card `/p/` và trang Công trình) chèn `modulepreload`
file một filter ngay khi trình duyệt đọc head, `preloadMasonry` dùng chung lượt import; file cả dải tải khi runtime tải
`catalog-detail.mjs` (ảnh 8 card đầu xong, tối đa 6s). Bấm filter hoặc kéo sang dải khác khi cache chưa về: giữ bố cục
cũ, chip vừa bấm mang `aria-busy="true"`, rồi đặt card đúng một lần; bấm lại filter đang chọn, Back/Forward hoặc mở card huỷ
lượt chờ. Cache về lúc đang mở card thì lưới ẩn chưa đo, đo khi đóng card. Trong cùng dải, đổi bề rộng chỉ replay lại.

```gherkin
Given trang /vi/advertising-products/ tải trực tiếp trên điện thoại 384px
When card đầu có tọa độ
Then request file một filter đã bắt đầu trước khi detail.js tải xong, đúng một request, console không có layout cache miss
```

### R5. Cỡ pool và ngưỡng chip

Một chip luôn có tối thiểu 5 card và trang riêng ([taxonomy R5](advertising-taxonomy.md#r5-ngưỡng-5-card)), nên pool nhỏ nhất
của cụm và sản phẩm là 5 card; filter loại công trình ở trang Công trình có thể chỉ 3 card và vẫn không lỗ ở mọi cỡ từ 1 card.
Pool nhỏ có thể hạ card ngang về một cột (đo trên pool ngẫu nhiên có card ngang: 3 tới 8 card thì 8,5% pool có card bị hạ, 10 tới 14 card thì 0,5%), không bao giờ có lỗ. Số
filter cache bằng `all` + 6 cụm + sản phẩm từ 5 card, nên số file ở R3 đổi theo ngưỡng. Test ngẫu nhiên (`masonry-layout-fuzz.test.mjs`:
81 bộ có seed, 1 tới 80 card, 9 kiểu tỷ lệ) kiểm build không `throw`, replay không lỗ trên 5 dải, mỗi card một lần, cắt không quá 5%, `stackLayout`
không lỗ; `LAYOUT_FUZZ_COUNTS=150,285,600` chạy bản dài bằng tay (216 bộ, 296 nghìn replay, 0 lỗi).

### R6. Contract cho CMS (chưa làm)

Trang public không bao giờ gọi `packer.mjs`; CMS phase thêm đường tính cache, ngoài phạm vi spec này cho tới khi owner mở slice.
(1) Sửa card (thêm, đổi ảnh, đổi tỷ lệ, xóa) chỉ lên trang sau khi cache tính xong (O10): admin gọi `buildLayoutCache` (import `/masonry/packer.mjs`)
trên catalog đã vá và lưu card cùng cache trong một lần lưu; server lưu rồi phát. (2) Artifact do CMS vá mà không kèm cache mới thì filter có pool đổi lệch
chữ ký và tự rơi về `stackLayout` (một cột, không lỗ), không cần sửa `patchCatalog`. (3) Tính lại từng phần: chỉ filter có card bị sửa (All, cụm, sản phẩm
của card); đăng theo batch thì tính lại đúng một lần sau khi cả batch xong. (4) Thời gian tính tăng theo số card và tỷ lệ card ngang (600 card, 2 filter: 2 tới 23s), nên chạy
trong Web Worker và không chặn nút lưu. (5) Cảnh báo người soạn khi một card ngang bị hạ về một cột. (6) Upload media cho card có bleeding indicator: mức cắt tối đa
`min(0.25 × khoảng giữa, 5%)` chiều cao media ở từng bề rộng. (7) Luồng lưu, tính, phát hành cần test riêng khi xây; test hash và golden chạy trên fixture, không trên nội dung thật ([content-independent-tests](content-independent-tests.md)).

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Hàm public | `buildLayoutCache`, `packBand`, `LAYOUT_BANDS`, `staggerViolations` (`packer.mjs`) | Build và trang admin CMS sau này (R2, R6) |
| Hàm public | `replayLayout`, `stackLayout`, `verifyLayout`, `variantIndex`, `bandKey`, `poolSignature` (`replay.mjs`) | Runtime, build tự kiểm, test (R3, R4); không import `packer.mjs` |
| Data | `.site-output/advertising-products/layout-cache/*` | Build sinh, runtime `import()` (R3) |
| Data | `artifact.layouts`, `layoutCacheFilterUrl`, `layoutCacheBandUrl` | Cache nhúng ở trang Công trình; URL ở trang Quảng cáo (R3) |
| DOM hook | `aria-busy="true"` trên `[data-masonry-filter]` | Chip chờ cache (R4) |

## UI

[Masonry](../../design-system/components/Masonry/README.md), [Skeleton](../../design-system/components/Skeleton/README.md).

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1 | `masonry-packer.test.mjs` (bảng dải, biên 1618×1000, trần cắt 5%); `masonry-replay.test.mjs` (`verifyLayout`, `null`, `stackLayout`) |
| R2 | `masonry-packer.test.mjs` (so le, biến thể 8–32, tự kiểm); `layout-cache-memo.test.mjs` |
| R3 | `pnpm prepare:site` (165 file); `tests/worker/worker-contract.cjs` (`layout-cache/4-35/all.mjs` trả 200) |
| R4 | `masonry-layout-cache.e2e.mjs` (`verifyLayout` trên hình học DOM 384–1920px, chặn cache, resize, chip chờ); `advertising-layout-cache-pending.e2e.mjs`; `advertising-layout-cache-preload.e2e.mjs` |
| R5 | `masonry-layout-fuzz.test.mjs` |
| R6 | chưa có test (CMS chưa xây) |

## Gate còn mở

- Contract R6 chưa có code; thread CMS nối khi xây luồng lưu. Thread CMS.
- Owner xem card ngang hai cột, điện thoại một cột, khung chờ ngang cuối lưới trên demo. Owner.

## Chú thích thuật ngữ

- **Dải**: khoảng bề rộng viewport có cùng số cột và khoảng giữa; một bố cục lưu dùng cho cả dải.
- **Biến thể**: một bố cục đã tính sẵn của một filter; seed chọn biến thể.
- **Chữ ký (`sig`)**: mã băm id và kích thước media của pool; lệch thì cache không dùng.
- **Hạ card**: card ngang không xếp được hai cột, đặt về một cột.
- **Đuôi**: tối đa 3 card cuối của cột dài hơn, nơi cắt media để khép đáy dưới card hai cột.
