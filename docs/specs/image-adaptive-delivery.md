---
title: Ảnh thích ứng mạng
status: live
source:
  - src/site/image-tier.js
tests:
  - tests/site/image-adaptive.e2e.mjs
  - tests/site/image-adaptive-measure.mjs
notion: https://app.notion.com/p/404332849a0e818586ade1e1d8532ce9
updated: 2026-10-25
---

# Ảnh thích ứng mạng

## Mục đích

Ảnh nội dung chọn file nhẹ khi mạng chậm, và khi mạng nhanh lại thì ảnh đã tải ở bậc nhẹ được thay bằng bản nét, liền
mạch với người xem (owner 2026-10-25). Spec này thêm một lớp lên [tải ảnh](media-delivery.md): bậc ảnh, ước lượng mạng,
nâng bậc. Biến thể, `srcset`, vệt sáng và dấu báo lỗi vẫn thuộc media-delivery; video thích ứng là spec riêng
(`video-delivery.md`, nhánh của thread masonry). Mạng nhanh hoặc chưa đo được thì tải như hiện tại, chỉ thêm cỡ 240 cho khung đủ nhỏ.

## Hành vi

### R1. Bậc thường, bậc nhẹ và biến thể 240

`build-image-variants.mjs` sinh thêm `<tên>-240.avif`, `<tên>-240.webp` cùng chất lượng các cỡ khác
([media-delivery R1](media-delivery.md#r1-biến-thể-ảnh-nội-dung)); build và runtime thêm `240w` vào `srcset`. Đo 40 ảnh
`projects/` ngẫu nhiên: AVIF 240 trung bình 4,8 KB, AVIF 480 là 15,1 KB.

- Bậc thường: nhu cầu pixel là bề rộng hiển thị sau crop nhân DPR, như media-delivery R2, R3.
- Bậc nhẹ: nhu cầu pixel bằng một nửa bậc thường, tối đa cỡ 960 (ảnh cover lớn như slide hero, portal, CTA không rơi về
  bản gốc; owner chốt 2026-10-25); trình duyệt vẫn chọn file nhỏ nhất đủ nhu cầu đó. Card masonry trên
  A04s (khoảng 190 px CSS, DPR 1,875) từ 480 xuống 240; primary trên phone từ 960 xuống 480.
- Ảnh đã ở cỡ nhỏ nhất thì hai bậc như nhau. Bậc thường chọn file 240 khi file đó đã đủ nhu cầu pixel (khung nhỏ ở DPR 1),
  nên không mờ hơn hiện tại.

```gherkin
Given src/site/assets/content/shared/a.webp rộng 1536px, chưa có biến thể 240
When chạy node scripts/site/build-image-variants.mjs
Then cạnh a.webp có thêm a-240.avif, a-240.webp
And chạy lại với --check thì exit 0
```

### R2. Ước lượng tốc độ mạng

Script đầu `<head>` (cùng script vệt sáng, [media-delivery R6](media-delivery.md#r6-vệt-sáng-chờ-ảnh-tĩnh)) giữ một trạng
thái mạng `normal` hoặc `slow`, sống qua chuyển trang Barba và lưu `sessionStorage` cho lần tải trang kế.

- Nguồn chung mọi trình duyệt: `PerformanceObserver` loại `resource` (`buffered: true`) trên ảnh dưới
  `/assets/content/`. Bỏ entry `transferSize` bằng 0 (từ cache). Tốc độ là tổng byte chia hợp các khoảng
  `responseStart` tới `responseEnd` của tối đa 4 entry xong trong 3 s gần nhất (mạng vừa đổi thì số đo theo mạng mới), vì nhiều ảnh tải song song trên HTTP/2 nên chia riêng từng
  file sẽ ra tốc độ thấp hơn thật (suy luận, kiểm ở R5). `transferSize` có từ Safari 16.4, Firefox 45, Chrome 54
  ([caniuse](https://caniuse.com/mdn-api_performanceresourcetiming_transfersize)).
- Gợi ý thêm trên Chromium: `navigator.connection.downlink` lúc chưa có số đo nào (dưới 2 Mbps thì `slow`); sự kiện
  `change` báo chậm hẳn thì sang `slow`, báo nhanh lên thì nâng thử một ảnh để đo lại (R4).
  Safari, Firefox không có API này ([caniuse](https://caniuse.com/mdn-api_networkinformation_downlink),
  [MDN](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation)), nên chỉ dùng nguồn chung.
- Chưa có số đo: `normal`, tức như hiện tại. Sang `slow` khi tốc độ dưới 2 Mbps; về `normal` khi từ 4 Mbps hai lần đo
  liền nhau. Hai ngưỡng khác nhau để không đổi qua lại liên tục; số cụ thể là đề xuất, chốt bằng số đo R5.
- Bật Save-Data (`navigator.connection.saveData`): luôn `slow`, không nâng bậc, vì người dùng đã chọn tiết kiệm dữ liệu.

```gherkin
Given trình duyệt không có navigator.connection, cache trống, mạng 1,6 Mbps
When trang Advertising tải 4 ảnh card đầu
Then trạng thái mạng là slow và lưu vào sessionStorage

Given trạng thái slow
When hai lần đo liền nhau đạt từ 4 Mbps
Then trạng thái về normal
```

### R3. Chọn bậc lúc bắt đầu tải

Bậc áp lúc ảnh chưa gửi request: trạng thái `slow` thì dùng bậc nhẹ, `normal` thì bậc thường. Ảnh đã gửi request không
đổi bậc giữa chừng (tránh hủy request rồi tải lại).

| Nơi | Cách áp bậc nhẹ |
| --- | --- |
| Ảnh lazy và slide hero hoãn (`sizes` ghi từ `<head>`) | ghi `sizes` bằng nửa giá trị bậc thường |
| Ảnh đã có `sizes` px nhưng chưa gửi request lúc mới sang `slow` | `image-tier.js` chia đôi `sizes` (hoặc `data-sizes`) |
| Card masonry, related (LazySizes `data-sizes`) | nửa bề rộng card từ solver |
| Nút suggestion eager | nửa bề rộng nút |
| Nút suggestion, item card nhiều media, thumbnail primary (`auto, Nvw`) | bỏ `auto`, dùng nửa giá trị vw; khi nâng đo bề rộng thật |
| Ảnh primary (không `srcset`) | file `-960`, hoặc `-480` khi bản gốc không quá 960; nền blur vùng dư giữ file nhẹ |

Không áp: ảnh đầu hero (preload trước khi có số đo, [media-delivery R4](media-delivery.md#r4-thứ-tự-ưu-tiên-tải)),
logo khách (SVG), viewer (người xem đã chọn xem lớn, luôn bản gốc). Ảnh tải ở bậc nhẹ mang `data-image-tier="low"`.

```gherkin
Given trạng thái slow, viewport 384x724 DPR 1,875
When mở /vi/advertising-products/ và card đầu vào cửa sổ ảo hóa
Then card tải file -240, mang data-image-tier="low"
And mở detail thì primary tải file -960 hoặc -480 thay cho bản gốc

Given trạng thái normal
When mở cùng trang
Then request ảnh giống main, trừ ảnh mà file 240 đã đủ nhu cầu pixel, không ảnh nào mang data-image-tier
```

### R4. Nâng bậc liền mạch khi mạng nhanh lại

Khi trạng thái về `normal`, ảnh `data-image-tier="low"` được nâng lên bậc thường: ảnh trong viewport trước, rồi ảnh trong
một viewport quanh đó; ảnh xa hơn nâng khi tới gần viewport (`IntersectionObserver`). Tối đa 2 ảnh nâng cùng lúc, độ ưu
tiên `low`, nhường ảnh mới đang chờ tải.

Mỗi lần nâng: tải file bậc thường bằng một `Image` tách rời DOM, chờ `decode()`, rồi mới ghi `sizes` (hoặc `src` với
primary) lên ảnh đang hiện. File đã có trong cache và đã giải mã, nên ảnh đổi ngay trong một frame. Theo chuẩn HTML,
request mới nằm ở "pending request" và ảnh cũ vẫn hiện tới khi request mới xong
([HTML images](https://html.spec.whatwg.org/multipage/images.html)). Xong thì gỡ `data-image-tier`.

Việc thay phải liền mạch (owner 2026-10-25): người xem chỉ thấy ảnh nét lên.

- Không lóe: không hiện lại vệt sáng, skeleton, nền `media-loading-surface` hay `.is-media-settled` bị gỡ; không frame
  trống giữa ảnh cũ và ảnh mới.
- Khung đứng yên: cùng ảnh, cùng tỷ lệ, khung đã giữ `width`, `height`, nên CLS không tăng.
- Không request trùng: file bậc thường chỉ tải một lần (lần tải tách rời); ảnh đang hiện dùng lại bản cache.
- Tải tách rời lỗi: giữ ảnh bậc nhẹ, không gắn `.is-media-error`, thử lại tối đa một lần ở lần trạng thái về `normal`
  kế tiếp.
- Không hạ bậc: mạng chậm đi không thay ảnh đã tải ở bậc thường; chỉ ảnh tải sau đó dùng bậc nhẹ.

Ở `slow`, trang đứng yên thì không có ảnh mới để đo. Sau 3 s không có lần đo mới, runtime nâng thử một ảnh trong hoặc
sát viewport; lần tải đó vừa là việc nâng thật, vừa là một lần đo cho R2. Lần đo nhanh đầu tiên kéo theo ngay một lần
nâng thử nữa để có lần đo thứ hai.

```gherkin
Given trạng thái slow, masonry đã hiện 8 card ở file -240
When mạng đổi sang không giới hạn
Then trong 4 s các card đang hiện chuyển sang file -480, không còn data-image-tier
And không frame nào quanh lúc đổi có vệt sáng, skeleton hay khung trống
And không URL nào bị request hai lần, CLS không tăng

Given trạng thái normal, card đang hiện file -480
When mạng chậm đi và trạng thái sang slow
Then card vẫn giữ file -480, card mới vào cửa sổ ảo hóa tải file -240

Given lần tải tách rời của một card bị lỗi
When trạng thái vẫn normal
Then card giữ file -240, khung không có is-media-error
```

### R5. Nghiệm thu bằng số đo

Kịch bản giống video thích ứng: viewport A04s (384x724, DPR 1,875), cuộn masonry 16 nấc 400 px, mỗi nấc chờ 1,5 s; mạng
1,6 Mbps, RTT 150 ms, tắt cache; thêm gallery `/vi/residential/`. Mỗi bản 9 lượt xen kẽ, so với `main`.

- Mạng chậm: byte ảnh giảm ít nhất 40%; median thời điểm 8 card đầu sẵn sàng nhanh hơn ít nhất 25%. Ngưỡng thời gian
  chưa đạt (có nén brotli: -15% tới -18%, phần lớn thời gian là tải font, CSS, JS; server local không nén cho số
  lệch); owner chốt 2026-10-25 tách sang việc riêng về JS, không chặn spec này.
- Mạng nhanh (không giới hạn) và PC: danh sách request ảnh giống `main` (trừ ảnh file 240 đã đủ nét); main thread bận không tăng ngoài nhiễu.
- Đổi mạng giữa lượt (chậm sang không giới hạn): đạt các ý của R4, quay màn hình từng frame quanh điểm đổi.
- Đường Safari, Firefox: chạy lại kịch bản trên Chromium sau khi xóa `navigator.connection` bằng init script; số đo phải
  tự sang `slow` và tự về `normal` chỉ bằng Resource Timing.

```gherkin
Given bản thích ứng và main trên cùng máy, cùng kịch bản mạng chậm
When đo 9 lượt mỗi bản
Then byte ảnh của bản thích ứng ít hơn ít nhất 40%
And median 8 card đầu sẵn sàng nhanh hơn ít nhất 25% (việc riêng về JS, xem trên)

Given mạng không giới hạn
When đo cùng kịch bản
Then danh sách URL ảnh của bản thích ứng giống main, trừ ảnh mà file 240 đã đủ nhu cầu pixel
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| File | `<tên>-240.avif`, `<tên>-240.webp` | Biến thể cho bậc nhẹ (R1) |
| Attribute | `data-image-tier="low"` trên `<img>` | Ảnh đang ở bậc nhẹ, chờ nâng (R3, R4) |
| Storage | `sessionStorage` khóa `tt-network-tier` | Trạng thái mạng cho lần tải trang kế (R2) |

## UI

Không đổi giao diện; khung chờ và dấu lỗi giữ [Vệt sáng](../../design-system/components/LoadSweep/README.md) và
[media-delivery R8](media-delivery.md#r8-dấu-báo-lỗi-tải-media).

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1 | `build-image-variants.mjs --check` (CI) đếm cả cỡ 240 |
| R2, R3, R4 | `image-adaptive.e2e.mjs` (Residential có và không `navigator.connection`, masonry, primary, mạng nhanh) |
| R5 | `image-adaptive-measure.mjs --base <main> --candidate <nhánh>`, chạy tay |

## Gate còn mở

- Safari iPhone thật chưa đo; Playwright cloud chỉ có Chromium. Owner, máy PC.
- Ngưỡng 2 và 4 Mbps, cửa sổ 4 entry trong 3 s, nâng thử sau 3 s là đề xuất; chốt sau số đo R5.

## Chú thích thuật ngữ

- **Bậc**: mức chất lượng ảnh chọn theo mạng; bậc thường như hiện tại, bậc nhẹ cần nửa số pixel.
- **Resource Timing**: API trình duyệt ghi thời gian và byte của từng file đã tải.
- **Save-Data**: tùy chọn tiết kiệm dữ liệu của người dùng, trình duyệt báo cho trang.
- **Hysteresis**: dùng hai ngưỡng khác nhau để trạng thái không đổi qua lại liên tục.
- **DPR**: số pixel thật trên một pixel CSS của màn hình.
