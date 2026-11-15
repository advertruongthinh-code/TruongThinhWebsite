---
title: Masonry xếp trực tiếp
status: live
source:
  - src/site/masonry/pack.mjs
  - src/site/masonry/replay.mjs
  - src/site/masonry/layout-worker.mjs
  - src/site/masonry/runtime.mjs
tests:
  - tests/site/masonry-pack.test.mjs
  - tests/site/masonry-replay.test.mjs
  - tests/site/masonry-layout-fuzz.test.mjs
  - tests/site/masonry-live-layout.e2e.mjs
  - tests/site/advertising-layout-pending.e2e.mjs
notion: https://app.notion.com/p/419332849a0e814ea474c19b061cbae2
updated: 2026-11-15
---

# Masonry xếp trực tiếp

## Mục đích

Lưới chính trang Quảng cáo và trang Công trình được máy người xem tự xếp khi tải trang: không lỗ giữa lưới, card ngang
rộng hai cột, không có file bố cục tính sẵn lúc build. Spec này sở hữu thuật toán xếp, Worker xếp, đường đặt tọa độ và lượt
chờ. Hình học một cột, ảo hóa, chuyển vị trí ở [masonry Advertising](advertising-masonry.md); related masonry không dùng
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

Dải `2:15` không có card ngang, mỗi ứng viên chỉ tốn cỡ một mili giây, nên xếp trên luồng chính, hai ứng viên một task (mỗi task dưới 50 ms), không tạo
Worker (khởi động Worker và chờ sau các task tải trang trên A04s tốn hơn). Từ 3 cột, mọi dải xếp trong `layout-worker.mjs`: 4 Worker sống suốt trang, mỗi Worker xếp một ứng viên (nhận `{ id, pack, s }`, trả
`{ id, candidate }`), luồng chính giữ ứng viên tốt nhất bằng `bestEntries`, nên ra đúng `packLive` mà lưới đầu chỉ chờ một ứng
viên (A04s 2026-11-15: xếp 4 ứng viên tuần tự trong một Worker chậm hơn main 93 tới 468 ms). Từ 720px, `detail.js` tạo các Worker ngay
khi bắt đầu nạp catalog trang Quảng cáo hoặc mount trang Công trình (`window.__TT_GRID_WORKERS__`, runtime nhận lại), song song với
module runtime. Lượt duyệt mới rút seed ngay khi mount có artifact và gửi lượt xếp đầu
liền đó, rồi trao seed cho browse history; seed khôi phục từ history hoặc trao qua đổi ngôn ngữ thì lượt đó bỏ phí. Worker lỗi (không tạo được, `error`, trả `error`) hoặc lượt đầu quá 1 s chưa trả (`PACK_TIMEOUT_MS`, Worker treo; đã có Worker trả một lượt thì lượt chậm sau đó vẫn được chờ)
thì từ đó xếp trên luồng chính, mỗi ứng viên còn thiếu một task; hai đường ra cùng `entries`, nên hạn chờ chỉ đổi lúc lưới hiện. Sau khi
Worker lỗi, và ở dải `2:15`, chỉ filter được bấm mới xếp, không xếp nền. Kết quả nhớ theo khóa
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

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Hàm public | `packBand`, `LAYOUT_BANDS`, `staggerViolations`, `livePool`, `packCandidate`, `bestEntries`, `packLive`, `LIVE_CANDIDATES` (`pack.mjs`) | Xếp, thuần, không DOM (R2) |
| Hàm public | `replayLayout`, `stackLayout`, `verifyLayout`, `bandKey` (`replay.mjs`) | Runtime và test (R4); không import `pack.mjs` |
| Message | `{ id, pack, s }` → `{ id, candidate }` hoặc `{ id, error }` (`layout-worker.mjs`) | Worker xếp một ứng viên (R3) |
| DOM hook | `aria-busy="true"` trên `[data-masonry-filter]` | Chip chờ xếp (R4) |

## UI

[Masonry](../../design-system/components/Masonry/README.md), [Skeleton](../../design-system/components/Skeleton/README.md).

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1 | `masonry-pack.test.mjs` (bảng dải, biên 1618×1000, không lỗ ở bề rộng dải); `masonry-replay.test.mjs` (`verifyLayout`, `null`, `stackLayout`) |
| R2 | `masonry-pack.test.mjs` (không hạ card ngang trên catalog thật, giữ hạng, so le tốt hơn thứ tự ngẫu nhiên, cùng input cùng kết quả) |
| R3 | `masonry-live-layout.e2e.mjs` (chặn Worker: xếp trên luồng chính, không cảnh báo) |
| R4 | `masonry-live-layout.e2e.mjs` (`verifyLayout` trên hình học DOM 384–1920px, 8 lần tải khác card đầu, Back cùng tọa độ, resize, chip chờ, mở card khi đang xếp); `advertising-layout-pending.e2e.mjs` |
| R5 | `masonry-layout-fuzz.test.mjs` |

## Gate còn mở

- Đo thời điểm card đầu có tọa độ trên A04s ở 1024 và 1440px so với main d33ae601. Thread masonry.

## Chú thích thuật ngữ

- **Dải**: khoảng bề rộng viewport có cùng số cột và khoảng giữa; một lượt xếp dùng cho cả dải.
- **Ứng viên**: một thứ tự gốc của filter được xếp thử; giữ ứng viên tốt nhất trong 4.
- **Hạ card**: card ngang không xếp được hai cột, đặt về một cột.
- **Đuôi**: tối đa 3 card cuối của cột dài hơn, nơi cắt media để khép đáy dưới card hai cột.
