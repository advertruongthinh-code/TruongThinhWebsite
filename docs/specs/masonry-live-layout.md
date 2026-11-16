---
title: Masonry xếp trực tiếp
status: live
source:
  - src/site/masonry/pack.mjs
  - src/site/masonry/replay.mjs
  - src/site/masonry/layout-worker.mjs
  - src/site/masonry/runtime.mjs
  - src/site/masonry/host.mjs
tests:
  - tests/site/masonry-pack.test.mjs
  - tests/site/masonry-replay.test.mjs
  - tests/site/masonry-layout-fuzz.test.mjs
  - tests/site/masonry-live-layout.e2e.mjs
  - tests/site/advertising-layout-pending.e2e.mjs
  - tests/site/masonry-hosts.e2e.mjs
notion: https://app.notion.com/p/419332849a0e814ea474c19b061cbae2
updated: 2026-11-16
---

# Masonry xếp trực tiếp

## Mục đích

Lưới chính trang Quảng cáo và trang Công trình được máy người xem tự xếp khi tải trang: không lỗ giữa lưới, card ngang
rộng hai cột; chỉ lưới đầu trên điện thoại (dải `2:15`) có bản xếp sẵn lúc build, nằm trong chính trang. Spec này sở hữu thuật toán xếp, Worker xếp, đường đặt tọa độ và lượt
chờ. Hình học một cột, ảo hóa ở [masonry Advertising](advertising-masonry.md), cách trượt ở R7; related masonry không dùng
packer. Lý do thiết kế: [decision](../decisions/masonry-live-layout.md).

## Hành vi

### R1. Luật hình học

Chỉ hai lưới chính (O5) và chỉ từ 3 cột: card có ảnh bìa từ tỷ lệ vàng (`isWideMedia`, `w × 1000 >= h × 1618`) rộng hai cột
kề; điện thoại (2 cột), related, card gợi ý và khung ghim luôn một cột. Hình học là yêu cầu cứng duy nhất: giữa lưới không có
khoảng trống ngoài khoảng giữa, ở mọi bề rộng. Không xếp được thì leo thang theo thứ tự: (1) đổi chỗ vài card gần đó, (2) cắt
media của các card cuối cột dài hơn, mỗi card không quá `CROP_CAP = 5%` chiều cao media, chỉ thấp đi, cắt đều trên dưới
(`mediaBleed`), (3) riêng card ngang đó về một cột (`demoted`). Card một cột không vượt hạng `filterRank`; card ngang được lệch
qua ranh giới hạng. Chiều cao card bằng chiều cao media ([media-card R2](media-card.md#r2-canvas-và-hàng-pill-trong-media)),
nên bố cục chỉ phụ thuộc bề rộng card và khoảng giữa.

Xếp theo 5 dải `LAYOUT_BANDS` (số cột và khoảng giữa; `bandKey(viewport)`): `2:15` (280–719), `3:15` (720–960), `3:25`
(961–1004), `4:25` (1005–1200), `4:35` (từ 1201). Đáy mỗi cột là hàm bậc nhất của bề rộng card, nên một bố cục đúng ở hai đầu dải
là đúng cả dải: mỗi filter chỉ xếp một lần mỗi dải, đổi bề rộng trong dải chỉ đặt lại tọa độ. Test khóa bảng dải với
`columnsForWidth` và `masonrySpacing`: đổi một trong hai mà quên `LAYOUT_BANDS` thì đỏ.

```gherkin
Given viewport 1440px, filter All, catalog thật
When lưới xếp xong
Then không card nào bị cắt quá 5%, không lỗ
And ở 390px mọi card rộng một cột
```

### R2. Packer

`packBand(cards, band, { rankOf })` (`pack.mjs`, thuần, không DOM): hàng đợi tuần tự; card ngang chờ tối đa `MAX_DEFER = 20`
card để có cặp cột chênh đáy trong ngưỡng cắt, được lấp bằng tối đa `MAX_PARTNERS = 3` card một cột trong `PARTNER_WINDOW = 12`
card kế tiếp. Tìm 3 card lấp chỉ chạy ở lần thử đầu của mỗi card ngang (lặp lại ở mọi lần hoãn làm vài thứ tự tốn 450 tới 630 ms
trên dải `4:35`, cloud); card ngang nằm trong `TAIL_GUARD = 12` vị trí cuối bị dời lên trước.

`packLive({ pool, band, seed, filter })` xếp `LIVE_CANDIDATES = 4` thứ tự gốc (`shuffleWithSeed(pool, seed, "grid:<filter>:<s>")`,
`s` từ 0 tới 3, xếp ổn định theo hạng) và giữ ứng viên tốt nhất theo thứ tự ưu tiên: ít card ngang bị hạ, đạt nhịp organic của 12
card đầu ([masonry R4](advertising-masonry.md#r4-thứ-tự-ngẫu-nhiên-theo-lượt-duyệt)), ít mép dưới thẳng hàng tại bề rộng chuẩn
của dải (`staggerViolations`, ưu tiên mềm O9), ít cắt, rồi `s` nhỏ. Số ứng viên là hằng số, không phải ngân sách thời gian:
máy chậm và máy nhanh ra cùng một lưới, Back về đúng lưới cũ. Kết quả là mảng `entries` số nguyên `cardIndex × 8 + code`
(`code` 0–3 là cột của card một cột, 4–6 là `4 +` cột trái của card hai cột). `pool` chỉ gồm `{ i, id, media, rank }`, đủ nhỏ để
gửi sang Worker.

```gherkin
Given cùng seed, filter và dải
When xếp trong Worker và xếp trên luồng chính
Then hai mảng entries giống nhau
```

### R3. Worker và luồng chính

Dải `2:15` không có card ngang nên xếp trên luồng chính, mỗi ứng viên một task, không tạo Worker. Lưới đầu của điện thoại
không xếp: mỗi trang lưới (Quảng cáo gốc, cụm, sản phẩm; mọi trang Công trình) mang `<script type="application/json"
data-phone-packs>` gồm `entries` dải 2:15 của filter của trang cho 8 seed cố định `PHONE_SEEDS` (`phonePacks`, sinh lúc build từ
đúng mảng card runtime dùng). Lượt duyệt mới trên điện thoại rút ngẫu nhiên một trong 8 seed đó; seed khôi phục từ history nằm
trong 8 seed cũng dùng bản xếp sẵn. `stamp` (`phonePacksStamp`: phiên bản packer, id và kích thước media mọi card) không khớp
card đang chạy thì bỏ bản xếp sẵn và xếp trực tiếp, không cảnh báo. Owner chọn 2026-11-16. Từ 3 cột, mọi dải xếp trong `layout-worker.mjs`: 4 Worker sống suốt trang, mỗi Worker xếp một ứng viên (nhận `{ id, pack, s }`, trả
`{ id, candidate }`), luồng chính giữ ứng viên tốt nhất bằng `bestEntries`, nên ra đúng `packLive` mà lưới đầu chỉ chờ một ứng
viên (A04s 2026-11-15: xếp 4 ứng viên tuần tự trong một Worker chậm hơn main 93 tới 468 ms). Từ 720px, `detail.js` tạo các Worker ngay
khi bắt đầu nạp catalog trang Quảng cáo hoặc mount trang Công trình (`window.__TT_GRID_WORKERS__`, runtime nhận lại), song song với
module runtime. Lượt duyệt mới rút seed ngay khi mount có artifact và gửi lượt xếp đầu
liền đó, rồi trao seed cho browse history; seed khôi phục từ history hoặc trao qua đổi ngôn ngữ thì lượt đó bỏ phí. Worker lỗi (không tạo được, `error`, trả `error`) hoặc lượt đầu quá 1 s chưa trả (`PACK_TIMEOUT_MS`, Worker treo; đã có Worker trả một lượt thì lượt chậm sau đó vẫn được chờ)
thì từ đó xếp trên luồng chính, mỗi ứng viên còn thiếu một task; hai đường ra cùng `entries`, nên hạn chờ chỉ đổi lúc lưới hiện. Sau khi
Worker lỗi, các dải từ 3 cột chỉ xếp filter được bấm, không xếp nền. Dải `2:15` không dùng Worker; nó xếp nền mỗi ứng viên một
task lúc trang rảnh, chậm nhất sau 250 ms (`requestIdleCallback` có hạn), nên lần bấm chip đầu thường thấy bản xếp sẵn; trang bận
(vuốt ngay sau khi tải) thì một ứng viên vẫn có thể chạy như task thường. Kết quả nhớ theo khóa
`<filter>|<dải>|<seed>` trong lượt mount. Filter đang xem xếp trước; khi 8 ảnh đầu tải xong (tối đa 6 s) mọi chip của dải
hiện tại được xếp nền lần lượt từng chip (bấm chip chưa xếp chỉ chờ sau tối đa một lượt), sang dải mới hoặc Back về seed
khác thì xếp nền lại, nên bấm chip thường thấy lưới ngay như cache cũ.

### R4. Đặt tọa độ và lượt chờ

`replayLayout` đổi `entries` thành tọa độ ở bề rộng thật (một vòng O(n), cùng hình dạng layout với `compileMasonryLayout`,
`diagnostics.source = "pack"`). Lần dựng đầu chờ lượt xếp của filter đang xem rồi đặt card một lần. Phải dựng khi lượt xếp
chưa xong (Back/Forward sang seed khác, đổi dải lúc đang mở card) thì cả lưới một cột theo thứ tự seed vào cột thấp nhất
(`stackLayout`, không lỗ), rồi đặt lại một lần khi xếp xong. `replayLayout` trả `null` thì `stackLayout` và
`console.warn("[masonry] live layout failed")` một lần mỗi khóa. Bấm filter hoặc kéo sang dải khác khi chưa xếp xong: giữ bố cục cũ, chip vừa bấm
mang `aria-busy="true"`, rồi đặt card đúng một lần; bấm lại filter đang chọn, Back/Forward hoặc mở card huỷ lượt chờ. Xếp xong
lúc đang mở card thì lưới ẩn chưa đo, đo khi đóng card. Mỗi dải xếp riêng nên đổi dải có thể ra thứ tự card khác; quay lại dải
cũ trong cùng lượt duyệt ra đúng lưới cũ.

```gherkin
Given trang /vi/advertising-products/ ở 1440px, Worker xếp chậm
When người xem bấm chip Biển hiệu
Then lưới cũ giữ nguyên, chip mang aria-busy="true", khi Worker trả card đặt một lần và aria-busy mất
```

### R5. Cỡ pool

Một chip luôn có tối thiểu 5 card và trang riêng ([taxonomy R5](advertising-taxonomy.md#r5-ngưỡng-5-card)); filter loại công
trình ở trang Công trình có thể chỉ 3 card và vẫn không lỗ ở mọi cỡ từ 1 card. Pool nhỏ có thể hạ card ngang về một cột,
không bao giờ có lỗ. Test ngẫu nhiên (`masonry-layout-fuzz.test.mjs`: bộ có seed, 1 tới 80 card, 9 kiểu tỷ lệ, 2 seed lượt duyệt)
kiểm `packLive` không `throw`, replay không lỗ trên 5 dải ở bề rộng nhỏ nhất, chuẩn và lớn nhất, mỗi card một lần, cắt không quá
5%, `stackLayout` không lỗ; `LAYOUT_FUZZ_COUNTS=150,285,600` chạy bản dài bằng tay.

### R6. Chế độ tìm kiếm

Trang tìm kiếm đưa danh sách id card xếp theo điểm; lưới chính bỏ pool của filter và đặt đúng danh sách đó: mọi card một cột,
card thứ i vào cột đang thấp nhất (`stackLayout`, source `search`), không đổi chỗ, không cắt, không Worker, không xếp sẵn; CTA và
khung Flow vẫn ở cuối lưới (plan Q2, Q3, Q6, owner 2026-11-15 19:30). Id lạ và id lặp bị bỏ, lượt gọi mới nhất thắng, đổi dải
chỉ đặt lại tọa độ. Thứ tự media trong card không đổi; lưới không nhận `mediaId` (thread tìm kiếm chốt 2026-11-16).

- `setPending(true)`: lưới cũ mờ còn 0,6 (`data-masonry-pending`) trong lúc chờ; `setResults` hoặc `clearResults` bỏ mờ.
  Giảm chuyển động thì đổi ngay, không mờ dần.
- `offerResults(ids)`: hiện nút "Có thêm kết quả gợi ý" / "More suggested results" ngay trên lưới; bấm mới đặt `ids`.
- Gọi `setResults` trước khi lưới dựng xong: lượt mới nhất được giữ và áp ngay lần dựng đầu, không có lưới duyệt chớp qua.
- Rời tìm kiếm: `clearResults`, bấm chip (kể cả chip đang chọn) hoặc Back sang filter khác đưa lưới về filter đó và phát
  sự kiện `masonry:search-left` trên `window`, để trang tìm kiếm xóa ô tìm.
- Kết quả không lưu trong history: sau F5, đổi ngôn ngữ hoặc Back tải lại hẳn trang, lưới về chế độ duyệt; trang tìm kiếm gọi lại
  `setResults` nếu vẫn còn truy vấn.

```gherkin
Given lưới Quảng cáo đang duyệt ở 1440px
When trang tìm kiếm gọi setResults với 15 id, có id lạ và id lặp
Then lưới chỉ còn 15 card, mỗi card một cột theo đúng thứ tự, CTA ở cuối; bấm chip Tất cả thì về lưới duyệt và phát masonry:search-left
```

### R7. Trượt tới tọa độ đã tính

Tọa độ đã có trước khi card trượt (R4, R6), nên trang không còn thư viện Masonry 4.2.2: lượt chuyển của lưới chính và related
(`layoutMotion` trong `host.mjs`) ghi ngay `left`, `top` đích cho mọi card rồi mới cho card trượt từ chỗ cũ về đích bằng Web
Animations trên `transform` (FLIP, id `masonry-slide`), `DUR.card` 0,4 giây, `ease`, mọi card cùng lúc, không đọc layout từng
card. Card ẩn đặt thẳng. Lượt đầu, card mới trượt từ đỉnh cột; từ lượt sau, card mới giao vùng nhìn thấy dựng ngay tại đích, không bay
ngang qua card đang trượt: media chưa có thì lớp chờ hiện đủ ngay (4 màu trên điện thoại, kính mờ trên PC) rồi media hiện dần như
mọi card; media đã có trong hàng tải cũng hiện dần trên màu nền của card như card thay khung tạm (`GHOST_FADE_MS`), khung card không mờ ([ngoại lệ của loading glass R3](loading-glass-and-page-entry.md#r3-ảnh-có-sẵn)). Slide và morph kích thước được giữ trong một Set của host, nên hủy và tính thời gian còn lại không quét `getAnimations()` giữa các lần ghi `left`, `top`. Bấm chip khi card còn đang trượt: card trượt tiếp từ chỗ đang thấy (tọa độ nhìn
thấy được lấy trước khi đổi), không nhảy về đích cũ. Hủy lượt (mở card, cuộn tới card bằng bàn phím) đưa card về đích ngay.
Đổi bộ card chia thành task ngắn để không task nào quá 50 ms trên A04s. Bấm chip chỉ nhận lượt bấm; card dựng ở task kế (hoặc
khi bản xếp về, R4; bấm chip khác trước đó thì lượt trước bị bỏ); `setResults`, `clearResults` dựng ngay trong task gọi. Task dựng
tạo card mới giao vùng nhìn thấy (card mới còn lại là card tạm 4 màu tại đích, thành card thật đúng chỗ đó theo ngân sách frame sau cú trượt, không trượt; [advertising-masonry R7](advertising-masonry.md#r7-ảo-hóa-và-bàn-phím)) và ghi điểm xuất phát (dùng lại bề rộng đo lần trước; còn đúng một lần đọc layout sau khi ghi DOM: vị trí lưới cho cửa
sổ ảo); task kế dựng cụm CTA và skeleton; khung kế tiếp cho card trượt (chờ tối đa hai khung nếu task CTA chưa chạy). Card lệch đích
dưới nửa pixel không trượt. Hiệu ứng hàng chip và cuộn chip trên điện thoại chạy ở khung sau.
Nhịp, cụm CTA, Kính và khung skeleton trượt cùng: [motion](../../design-system/motion.md#vị-trí-card-masonry).

```gherkin
Given lưới Quảng cáo đang duyệt ở 1440px
When bấm chip Biển hiệu rồi bấm Tất cả và Biển hiệu liền nhau trong lúc card còn trượt
Then mỗi khung hình card chỉ tiến về đích, không lùi, không nhảy; trang không tải masonry-4.2.2.min.js
```

```gherkin
Given lưới Quảng cáo đang ở chip Biển hiệu, bề rộng 384px và 1440px
When bấm chip Tất cả
Then mỗi card mới vào bộ đứng ngay tại đích, không trượt, lớp chờ hiện đủ; card có ở cả hai bộ trượt từ chỗ đang thấy
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Hàm public | `packBand`, `LAYOUT_BANDS`, `staggerViolations`, `livePool`, `packCandidate`, `bestEntries`, `packLive`, `LIVE_CANDIDATES` (`pack.mjs`) | Xếp, thuần, không DOM (R2) |
| Hàm public | `PHONE_SEEDS`, `phonePacks`, `phonePacksStamp` (`pack.mjs`); `phonePacksScript` (`scripts/site/lib.mjs`) | Lưới đầu xếp sẵn của điện thoại (R3) |
| DOM hook | `script[data-phone-packs]` `{ stamp, filter, seeds, entries }` | Bản xếp sẵn 2:15 của trang (R3) |
| Hàm public | `replayLayout`, `stackLayout`, `verifyLayout`, `bandKey` (`replay.mjs`) | Runtime và test (R4); không import `pack.mjs` |
| Message | `{ id, pack, s }` → `{ id, candidate }` hoặc `{ id, error }` (`layout-worker.mjs`) | Worker xếp một ứng viên (R3) |
| DOM hook | `aria-busy="true"` trên `[data-masonry-filter]` | Chip chờ xếp (R4) |
| Hàm public | `window.TruongThinhMasonry.setResults(ids)`, `setPending(bool)`, `clearResults()`, `offerResults(ids)` (cũng có trên `getAdapter()`) | Chế độ tìm kiếm (R6) |
| Sự kiện | `masonry:search-left` trên `window` | Lưới rời tìm kiếm (R6) |
| DOM hook | `data-masonry-pending` trên lưới; `button[data-masonry-offer]` | Chờ kết quả, kết quả gợi ý đến muộn (R6) |
| Hàm public | `layoutMotion(instant)`, `cancelTransitions()`, `track(animation)`, `remainingMotion()`, `items()` trên host; `SLIDE_ID`, `SIZE_ID` (`host.mjs`) | Trượt card (R7) |

## UI

[Masonry](../../design-system/components/Masonry/README.md), [Skeleton](../../design-system/components/Skeleton/README.md).

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1 | `masonry-pack.test.mjs` (bảng dải, biên 1618×1000, không lỗ ở bề rộng dải); `masonry-replay.test.mjs` (`verifyLayout`, `null`, `stackLayout`) |
| R2 | `masonry-pack.test.mjs` (không hạ card ngang trên catalog thật, giữ hạng, so le tốt hơn thứ tự ngẫu nhiên, cùng input cùng kết quả) |
| R3 | `masonry-live-layout.e2e.mjs` (chặn Worker: xếp trên luồng chính, không cảnh báo; 384px không tạo grid Worker; lưới đầu điện thoại dùng seed xếp sẵn, Back cùng tọa độ, stamp lệch thì xếp trực tiếp; 384px bấm chip chưa xem không chờ xếp nhờ xếp nền lúc rảnh); `advertising-products-static.test.mjs` (mọi trang có bản xếp sẵn mang stamp đúng card runtime dùng); `masonry-pack.test.mjs` (`phonePacks` bằng `packLive` cho 8 seed) |
| R4 | `masonry-live-layout.e2e.mjs` (`verifyLayout` trên hình học DOM 384–1920px, 8 lần tải khác card đầu, Back cùng tọa độ, resize, chip chờ, mở card khi đang xếp); `advertising-layout-pending.e2e.mjs` |
| R5 | `masonry-layout-fuzz.test.mjs` |
| R6 | `masonry-live-layout.e2e.mjs` mục 7 (đúng `stackLayout` ở 1440, 768, 384px; id lạ, id lặp; gọi liên tiếp; 0 kết quả; nút gợi ý; chip và `clearResults` rời tìm kiếm; gọi trước khi dựng) |
| R7 | `masonry-live-layout.e2e.mjs` mục 8 (quỹ đạo từng khung: không lùi, không nhảy, kể cả bấm chip lần hai lúc đang trượt và hai lần đổi thứ tự kết quả tìm kiếm cách 40 ms; card mới dựng tại đích, lớp chờ hiện ngay, ở 1440 và 384px; hai lần bấm chip trong một task: chỉ lượt sau dựng; bấm chip chưa ghé ở 384px: task dựng chỉ tạo card giao vùng nhìn thấy, card mới còn lại là card tạm tại đích rồi thành card thật cùng chỗ, không trượt, không cần cuộn, trong 1 s sau cú trượt); `masonry-hosts.e2e.mjs`; `advertising-products-lifecycle.test.mjs` (không `window.Masonry`, `DUR.card`, `ease`); `site.e2e.cjs` (không cuộn nào tạo lượt trượt, artifact hỏng dừng trước khi đặt card) |

## Gate còn mở

- Đo A04s ở 384px với bản xếp sẵn so với main d33ae601 (reviewer mục 3). Thread masonry.
- Trace A04s R7: bấm chip, `setResults`, `clearResults` không task nào trên 50 ms, trừ task dựng CTA (PR 5) và `settleMotion` (PR 4b) (reviewer PR 2, PR 3). Thread masonry.

## Chú thích thuật ngữ

- **Dải**: khoảng bề rộng viewport có cùng số cột và khoảng giữa; một lượt xếp dùng cho cả dải.
- **Ứng viên**: một thứ tự gốc của filter được xếp thử; giữ ứng viên tốt nhất trong 4.
- **Hạ card**: card ngang không xếp được hai cột, đặt về một cột.
- **Đuôi**: tối đa 3 card cuối của cột dài hơn, nơi cắt media để khép đáy dưới card hai cột.
