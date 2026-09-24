# Lưới Sản phẩm quảng cáo: Masonry deterministic, batch và biên Espacio

- Cập nhật: `2026-08-30T20:34:47+07:00`
- Trạng thái: research và intent đã chốt; chưa sửa source website
- Route đích: `/vi/advertising-products/`, `/en/advertising-products/`

## 1. Kết luận

Các yêu cầu sau đã được chốt:

1. Mỗi card lưu `ratio` và `span` trong dữ liệu. `span` chỉ nhận `1` hoặc `2`;
   cả `1:1`, `3:4`, `4:3` đều có thể dùng hai giá trị này.
2. Runtime không tự chọn, nâng hoặc hạ `span`. Cùng dataset, filter, số cột,
   locale và phiên bản layout phải cho cùng tọa độ sau mọi lần reload.
3. “Không load lở một hàng” trong Masonry được định nghĩa bằng **closed
   frontier**: chỉ commit một nhóm card khi toàn bộ vùng phía trên một đường
   ngang đã kín, không card nào cắt qua đường đó và mọi cột kết thúc cùng mốc.
4. Card shell của cả visual batch được commit cùng một frame. Ảnh bên trong vẫn
   lazy-load độc lập nhưng `aspect-ratio` và vùng caption cố định phải giữ sẵn
   kích thước, nên ảnh chậm không làm hàng bị thiếu hoặc layout nhảy.
5. Lưới giữ biên ngoài theo Espacio: `15px`, `25px`, `35px`; phần nội dung có
   max-width `1500px` và luôn căn giữa trên màn hình rộng.

Điểm bắt buộc: hard `span: 2`, nhiều ratio và thứ tự tùy ý không tự bảo đảm
zero-hole. Muốn giữ đồng thời cả ba yêu cầu, dataset phải qua layout compiler và
validator trước publish. Dataset không tìm được closed frontier ở bất kỳ số cột
hoặc filter được hỗ trợ phải bị từ chối; runtime không được âm thầm đổi `span`.

## 2. Phạm vi và phương pháp

Evidence dùng trong lần kiểm tra này:

- Ảnh annotation người dùng cung cấp, đối chiếu với
  [Espacio Projects live](https://espaciohomedesign.com/en/projects).
- Chrome DevTools profile cô lập: đọc computed geometry tại `320`, `390`,
  `499`, `500`, `639`, `640`, `749`, `750`, `751`, `767`, `768`, `960`, `961`,
  `979`, `980`, `981`, `1024`, `1199`, `1200`, `1201`, `1440`, `1569`, `1570`,
  `1920` và `2560px`.
- Playwright `1.62.1` chạy lại 12 viewport bằng Chrome hệ thống, mỗi viewport
  mở page mới và đọc `getBoundingClientRect()` cùng computed style.
- HTML/CSS/JS live được tải trực tiếp, hash và so với archive local. Ba resource
  `/en/projects`, `/css/main.min.css?v=0.021`, `/js/main.min.js?v=0.021` vẫn
  khớp archive byte-for-byte.
- Source Trường Thịnh hiện tại và report Espacio trước đó.

Computer Use không được dùng: task này cần computed geometry và source có thể
đo chính xác bằng DevTools/Playwright; không có human-only interaction. Kết quả
này là research hẹp, không nâng report parity tổng thành PASS.

## 3. Biên và lưới Espacio live

### 3.1 Runtime measurement

| Viewport | Biên trái/phải | Grid width | Số cột Espacio | Gutter card | Overflow ngang |
| ---: | ---: | ---: | ---: | ---: | ---: |
| `320px` | `15px` | `290px` | 2 | `15px` | `0px` |
| `390px` | `15px` | `360px` | 2 | `15px` | `0px` |
| `750px` | `15px` | `720px` | 2 | `15px` | `0px` |
| `751px` | `25px` | `701px` | 2 | `15px` | `0px` |
| `960px` | `25px` | `910px` | 2 | `15px` | `0px` |
| `961px` | `25px` | `911px` | 3 | `25px` | `0px` |
| `1200px` | `25px` | `1150px` | 3 | `25px` | `0px` |
| `1201px` | `35px` | `1131px` | 4 | `35px` | `0px` |
| `1440px` | `35px` | `1370px` | 4 | `35px` | `0px` |
| `1570px` | `35px` | `1500px` | 4 | `35px` | `0px` |
| `1920px` | `210px` | `1500px` | 4 | `35px` | `0px` |
| `2560px` | `530px` | `1500px` | 4 | `35px` | `0px` |

DevTools và Playwright trả cùng số liệu. Ở viewport lớn hơn `1570px`, biên nhìn
thấy được tính bằng `(viewport - 1500px) / 2`; ví dụ `1920px` cho `210px`, đúng
vùng người dùng đánh dấu trong ảnh.

### 3.2 Code live

[CSS live](https://espaciohomedesign.com/css/main.min.css?v=0.021) khai báo:

- `.max-width { max-width: 1500px; margin: 0 auto }`;
- padding ngoài `35px`, xuống `25px` tại `max-width: 1200px`, xuống `15px` tại
  `max-width: 750px`;
- card 4 cột mặc định, 3 cột tại `max-width: 1200px`, 2 cột tại
  `max-width: 960px`;
- gutter và margin-bottom lần lượt `35px`, `25px`, `15px` ở các band tương ứng.

[HTML live](https://espaciohomedesign.com/en/projects) dùng:

```html
<div id="layoutMasonry"
  class="layout-masonry container padding-margins add-margin-bottom max-width">
  <div class="grid"
    data-masonry='{ "columnWidth": ".grid-sizer",
      "itemSelector": ".masonry-item",
      "gutter": ".gutter-sizer",
      "percentPosition": true }'>
```

Archive tái lập nằm tại
[`en/projects/index.html`](../../research/reference-site/archive/site/en/projects/index.html)
và
[`main.min.q-2ffef9c93cd8.css`](../../research/reference-site/archive/site/css/main.min.q-2ffef9c93cd8.css).

## 4. So với Trường Thịnh hiện tại

Source hiện tại vẫn là CSS Grid, chưa có Masonry, infinite loading hoặc
virtualization:

- [`detail.css`](../../src/site/detail.css#L705-L745) dùng 4 cột, `dense`, card
  feature span 2 và các media ratio cố định.
- [`detail.css`](../../src/site/detail.css#L786-L822) đổi gap tại `1200px`, đổi
  thành 3 cột tại `980px`.
- [`detail.css`](../../src/site/detail.css#L1094-L1106) đổi thành 2 cột, gap
  `15px`, biên `15px` tại `680px`.
- [`detail.js`](../../src/site/detail.js#L481-L499) chỉ ẩn/hiện card khi filter,
  sau đó phát `site:layout`.

Max-width `1500px` đã khớp Espacio. Biên hiện tại khớp ở `≤680px`,
`751–1200px` và `>1200px`, nhưng sai band `681–750px`: Trường Thịnh đang dùng
`25px`, Espacio dùng `15px`.

Số cột không được đổi sang breakpoint Espacio chỉ vì report này. Intent trước
đó yêu cầu số cột kiểu Pinterest dựa trên target column width; biên Espacio và
số cột Pinterest là hai contract độc lập.

## 5. Data contract deterministic

Card authoring data tối thiểu:

```json
{
  "id": "stable-product-id",
  "category": "signage",
  "rank": 1042,
  "ratio": "3:4",
  "span": 2,
  "media": {
    "src": "/assets/products/example.webp",
    "width": 1200,
    "height": 1600,
    "altVi": "Mô tả tiếng Việt",
    "altEn": "English description"
  }
}
```

Invariant:

- `id`, `rank`, `ratio`, `span`, category và intrinsic media dimensions là dữ
  liệu canonical; không suy ra lại từ DOM hoặc kích thước ảnh tải về.
- Sort dùng `rank`, sau đó `id` làm tie-breaker; không dùng random, thời gian tải
  ảnh hoặc thứ tự request.
- `span` là hard constraint. Packer chỉ tìm `columnStart` và `top`; không được
  đổi `span` để cứu layout.
- Card shell phải có chiều cao deterministic. Media dùng ba ratio đã chốt; vùng
  caption dùng chiều cao cố định hoặc một giá trị đã lưu, không để text wrap
  bất định làm đổi layout.
- Dataset và layout manifest mang `datasetVersion` cùng `layoutAlgorithmVersion`
  để cache và coordinate hash không trộn phiên bản.

Layout compiler tạo manifest theo từng `columnCount` và filter. Manifest lưu
placement, visual batch boundary và total height; runtime không chạy heuristic
khác sau mỗi lần reload.

## 6. Chia batch không lở frontier

Không dùng một số card cố định cho visual batch. Ba lớp có trách nhiệm khác nhau:

1. **Transport page**: tải một block metadata, ví dụ 60 item. Đây chỉ là I/O,
   chưa render.
2. **Staging buffer**: layout compiler/manifest lấy đủ item để kết thúc ở closed
   frontier. Một visual batch có thể dùng một phần hoặc nhiều transport page.
3. **Atomic visual commit**: tạo toàn bộ card shell trong `DocumentFragment`,
   append bằng một DOM commit trong cùng `requestAnimationFrame`.
4. **Media fill**: ảnh visible dùng eager; ảnh ngoài viewport dùng lazy-load và
   `decoding="async"`. Placeholder đã chiếm đúng kích thước nên ảnh có thể hiện
   riêng lẻ mà không tạo lỗ hoặc layout shift.
5. **Virtual window**: sau commit, chỉ card trong viewport cộng overscan còn ở
   DOM. Việc unmount không đổi manifest, batch boundary hoặc scrollbar height.

Batch N+1 luôn bắt đầu dưới frontier cuối của batch N. Vì mọi cột cùng kết thúc
tại frontier, batch mới không di chuyển card cũ. Khi filter đổi, dùng manifest
riêng của filter; khi quay lại, khôi phục manifest, scroll anchor và coordinate
cache tương ứng.

## 7. Học Pinterest: phần dùng và phần không được suy diễn

[Pinterest Gestalt Masonry](https://github.com/pinterest/gestalt/blob/master/packages/gestalt/src/Masonry.tsx)
công khai grid deterministic, `loadItems({ from: items.length })`, measurement
cache, position cache, infinite loading và virtualization. README mô tả quá
trình fetch, measure, layout, paint khi cuộn và chỉ render item trong virtual
bounds khi bật virtualization:
[How Masonry works](https://github.com/pinterest/gestalt/blob/master/packages/gestalt/src/Masonry/README.md#how-masonry-works).

Gestalt không công khai contract “một hàng phải load trọn”. Masonry cũng không
có row đều như CSS Grid. Multi-column support tính `additionalWhitespace`, có
hook `_logTwoColWhitespace` và được đánh dấu experimental:
[multiColumnLayout.ts](https://github.com/pinterest/gestalt/blob/master/packages/gestalt/src/Masonry/multiColumnLayout.ts).

Vì vậy:

- học Pinterest ở stable item identity, append-only item list, cached position,
  scroll-triggered fetch và viewport virtualization;
- closed-frontier batch, hard-span validation và publish rejection là contract
  riêng của Trường Thịnh để đáp ứng yêu cầu zero-hole;
- không gọi đây là bản sao private production implementation của pinterest.com.

## 8. Acceptance bắt buộc trước khi implement xong

1. Reload 10 lần với cùng dataset, filter, locale và viewport band: coordinate
   hash của toàn bộ card phải giống nhau.
2. Validator chạy cho mọi filter và mọi số cột được hỗ trợ: không interior hole,
   không overlap, không card vượt container; mọi visual batch có closed frontier.
3. Mutation probe xác nhận mỗi visual batch chỉ có một atomic card-shell commit;
   card batch trước không đổi tọa độ khi append batch mới.
4. Runtime biên đạt bảng tại mục 3, gồm `750/751`, `960/961`, `1200/1201`,
   `1570/1920/2560px`; overflow ngang bằng `0`.
5. Dataset không pack được phải fail trước publish với ID/batch/filter/columnCount
   cụ thể; không đổi span, không bỏ card, không chấp nhận khoảng trắng âm thầm.

## 9. Giới hạn hiện tại

- Chưa sửa source hoặc tạo layout engine.
- Chưa chốt target column width, min/max column count của Pinterest-style
  responsive grid.
- Chưa có dataset 3000 ảnh thật để đo DOM, memory và thời gian pack.
- “Atomic row” trong report này nghĩa là card shell/geometry xuất hiện trọn;
  không đợi toàn bộ ảnh trong batch tải xong mới reveal, vì cách đó phá lazy-load.
- Graphify structural graph fresh; semantic index còn 109 file docs/media pending.
  Không update semantic index vì người dùng chưa yêu cầu.

## Chú thích thuật ngữ

- **Masonry**: layout nhiều cột, card xếp theo không gian dọc còn trống.
- **Deterministic**: cùng input và phiên bản thuật toán luôn cho cùng output.
- **Span**: số cột một card chiếm.
- **Closed frontier**: đường ngang kết thúc một visual batch kín và cân bằng.
- **Transport page**: block dữ liệu tải qua network, chưa phải block render.
- **Visual batch**: nhóm card shell được commit cùng lúc.
- **Layout compiler**: bước tạo và kiểm tra placement manifest trước runtime.
- **Virtualization**: chỉ giữ DOM gần viewport, vẫn giữ data và layout cache.
- **Overscan**: vùng render thêm bên ngoài viewport để cuộn không bị trễ.
- **Coordinate hash**: hash từ tọa độ card để kiểm tra layout có ổn định.
