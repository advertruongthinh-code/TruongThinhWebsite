# Brand guideline

Câu chuyện, giá trị cốt lõi và logo của Trường Thịnh. Câu chuyện do owner viết
ngày 04/10; logo lấy từ code đang chạy
(`src/site/assets/brand/truong-thinh-lockup.svg`, `src/site/style.css`,
`src/site/motion.js`) và các quyết định owner đã chốt từ LOGO-R2 tới R5. Số
SVG, chiều cao theo trạng thái và sai số nghiệm thu ở
[Brand lockup](components/BrandLockup/README.md).

## Câu chuyện thương hiệu

Khách hàng đến với Trường Thịnh nhận được ba cam kết:

| Cam kết | Nghĩa là |
| --- | --- |
| Chất lượng sản phẩm | Tỉ mỉ, chính xác trong thi công |
| Tư vấn | Tận tâm và chuyên sâu trong suốt quá trình tư vấn |
| Hậu mãi | Dịch vụ sau bán hàng đầy đủ |

Ba cam kết đó đã được chứng minh qua hơn 20 năm thương hiệu đứng vững và phát
triển trên thương trường. Đó là giá trị cốt lõi được gìn giữ, truyền lại và
phát huy, cùng sự sáng tạo và tinh thần tiếp thu cái mới, để từng sản phẩm và
dịch vụ đều **chỉn chu, tận tâm, chuyên nghiệp**.

Khi viết copy:

- Mỗi cam kết đi kèm bằng chứng thật: ảnh công trình, xưởng, vật liệu, quy
  trình Khảo sát, Tư vấn, Sản xuất, Lắp đặt, Hậu mãi. Giọng điệu theo
  [Content và media](content.md#giọng-điệu).
- Dùng "hơn 20 năm"; không suy ra năm thành lập.
- Hậu mãi là cam kết chung; không ghi thời hạn hay điều khoản bảo hành khi
  owner chưa xác nhận (`PRODUCT.md`).

## Logo

### Cấu tạo

- **Mark:** tam giác dựng từ bốn dải chéo song song, SVG bốn path,
  `viewBox 0 0 286.2 247.85`. Từ trái sang phải: cyan (dải dài nhất, chạm
  đỉnh), magenta, vàng, đen (tam giác nhỏ ở góc phải dưới).
- **Cụm chữ:** hai dòng Plus Jakarta Sans 600, chữ hoa.
  - Tiêu đề: `TRƯỜNG THỊNH` (giữ nguyên ở cả VI và EN).
  - Phụ đề: `NỘI THẤT · QUẢNG CÁO`; EN là `INTERIORS · ADVERTISING`.
- Mark luôn đứng trái, cụm chữ đứng phải. Không tách mark dùng riêng, trừ
  favicon.

### Hình dựng tỷ lệ

Đơn vị dựng là chiều cao mark: gọi H là chiều cao mark, Y = H/6.

```text
┌────────────┐   ┌───────────────────────────┐
│            │   │ đệm trên Y                │
│            │   ├───────────────────────────┤
│  mark      │ Y │ TRƯỜNG THỊNH              │
│  cao H     │   │ NỘI THẤT · QUẢNG CÁO      │  khối chữ 4Y
│  = 6Y      │   ├───────────────────────────┤
│            │   │ đệm dưới Y                │
└────────────┘   └───────────────────────────┘
```

| Quy tắc | Giá trị |
| --- | --- |
| Khoảng ngang từ cạnh phải mark tới mép trái cụm chữ | `Y` |
| Đệm từ đỉnh mark tới đỉnh khối chữ | `Y` |
| Chiều cao khối chữ (tiêu đề, khe, phụ đề) | `4Y` |
| Đệm từ đáy khối chữ tới đáy mark | `Y` |
| Thân chữ phụ đề / thân chữ tiêu đề | `0.618` (tỷ lệ vàng) |
| Chiều ngang hai dòng | Bằng nhau, lệch tối đa `0.5px` |

**Chiều cao khối chữ tính từ đâu.** Từ đỉnh mực cao nhất của dòng tiêu đề tới
đáy mực thấp nhất của dòng phụ đề, đo trên mực thật của nguyên dòng (ink
bounds) và tính đủ mọi dấu tiếng Việt: dấu thanh, mũ, móc phía trên và dấu nặng
phía dưới. Không đo theo font-size hay hộp chữ của SVG. Dấu phải hiện trọn,
không bị cắt, không chồng dòng (owner chốt 13/09).

**Thân chữ** là chiều cao chữ hoa không tính dấu. Tỷ lệ `0.618` so thân chữ
hai dòng (owner chốt R4, 20/09); khối `4Y` vẫn tính cả dấu. Ghi chú cũ
`X = 2Y` chỉ là đơn vị phụ, không có nghĩa khối chữ cao `2Y`.

Đo lại trên SVG đang chạy (Chromium, font thật, 04/10):

| Phần | Theo Y |
| --- | --- |
| Đệm trên / đệm dưới / khoảng mark–chữ | `1.00` / `1.00` / `1.00` |
| Tiêu đề, gồm dấu (thân chữ `1.40`) | `2.25` |
| Khe giữa hai dòng, mực tới mực | `0.32` |
| Phụ đề, gồm dấu (thân chữ `0.86`) | `1.43` |
| Tổng khối chữ | `4.00` |

- Hai dòng cân chiều ngang chỉ bằng tracking (`textLength`, `lengthAdjust
  ="spacing"`); không kéo giãn hay bóp glyph, không scale ngang.
- EN dùng đúng hình dựng VI (correction R5): tiêu đề trùng VI; phụ đề EN cùng
  cỡ và khe với VI, chỉ nén tracking để bằng chiều ngang tiêu đề.

### Dạng màu

| Dạng | Mark | Cụm chữ | Dùng ở |
| --- | --- | --- | --- |
| Bốn màu CMYK | Bốn màu dưới | `#2f2f2f` ở header, `ink` ở menu | Header trên nền trắng hoặc sticky; full menu |
| Đơn màu trắng | `#fff` | `#fff` | Header trên ảnh hero hoặc nền tối |
| Đơn màu đen | `#2b2a29` | `#2f2f2f` | Trạng thái tạm một frame trước CMYK (xem dưới) |
| Favicon | `#000000` hoặc `#ffffff` | Không có chữ | OS sáng dùng bản đen, OS tối dùng bản trắng |

| Path | Màu | Token | Hex |
| --- | --- | --- | --- |
| 1, tam giác nhỏ góc phải dưới | Đen | `logo-mark-black` | `#2b2a29` |
| 2 | Vàng | `logo-mark-yellow` | `#ffed00` |
| 3 | Magenta | `logo-mark-magenta` | `#e5097f` |
| 4, dải trái chạm đỉnh | Cyan | `logo-mark-cyan` | `#00a0e3` |

- Bốn màu CMYK chỉ dùng cho mark, không dùng làm màu UI.
- Cụm chữ không bao giờ có màu CMYK; chỉ đổi tone đen hoặc trắng.
- Không thêm gradient, bóng, viền hay hiệu ứng vào mark.
- Favicon là ngoại lệ mark-only duy nhất: hai file `favicon-black.svg`,
  `favicon-white.svg` cùng `viewBox`, bốn path, chỉ khác màu đơn sắc.

### Mark cỡ nhỏ

Lockup ở header và full menu hiện mark dưới `100px` (PC `67.52`, thu gọn `49.64`,
điện thoại `57.59`, menu `59.58`). Ở cỡ này `motion.js` dựng lại bốn path theo lưới
device pixel mỗi khi lockup đổi cỡ và sau route mềm (owner duyệt 10/10):

- Đáy tam giác rơi đúng pixel gần nhất (dịch tối đa nửa device pixel), không còn
  hàng pixel mờ dưới đáy.
- Khe giữa các dải và chu kỳ dải là số nguyên device pixel, khe tối thiểu `2`,
  nên ba khe dày bằng nhau.
- Giữ chiều cao, chiều ngang mark và hình dựng `Y`; màu, thứ tự dải không đổi.
- Lockup ở chỗ khác, favicon và bản in dùng mark gốc.

### Motion

| Motion | Thông số | Khi nào |
| --- | --- | --- |
| Intro | Toàn cụm `scale 0 → 1`, `1.5s power4.out`; hamburger chạy sau `1.5s` | Chỉ lần vào site đầu tiên, không chạy khi chuyển route |
| FLIP scale | Toàn cụm, `300ms expo.out`, neo góc trái trên | Đổi giữa expanded và sticky, cả hai chiều, cả mobile |
| Tone cụm chữ | Đổi đen và trắng ngay, không motion, cùng nav và hamburger; khi thu gọn thì đổi ngay lúc bắt đầu nhịp cùng nền, khi mở ra thì đổi ở `0.3s` cùng nền | Mỗi lần header đổi tone |
| Nhịp header | FLIP scale, navbar và nền chạy chung `0.3s expo.out`. Thu gọn: nền trắng, viền và chữ đậm hiện ngay lúc bắt đầu, không fade; nền bắt đầu ở cao cũ rồi co cùng logo và navbar; mark lật sang CMYK cùng lúc, xong ở `0.68s`. Mở ra: mark lật sang trắng ngay lúc bắt đầu; nền trắng, viền và chữ đậm giữ, nền bắt đầu ở cao cũ rồi giãn cùng logo và navbar, hết `0.3s` mới đổi ngay sang nền trong, chữ trắng, không fade (owner 2026-11-09) | Mỗi lần mark đổi màu khi cuộn; chuyển trang lật không chờ nhịp |
| Màu mark | Bốn dải lật quanh trục riêng, mặt tối dần khi nghiêng, sang CMYK cyan trước, về trắng đen trước, chạy `0.68s`, bắt đầu ngay (thu gọn, mở ra, veil phủ kín, veil bắt đầu mở) hoặc từ `0.1s` (đổi tone theo section) | Theo state machine dưới |
| Màu mark khi chuyển trang | Lúc bấm giữ nguyên. Veil phủ kín: chữ đổi ngay sang `#2f2f2f`, mark đang trắng lật sang CMYK ngay lúc đó (đang CMYK thì giữ). Veil bắt đầu mở: chữ đổi ngay sang tone trang đích, mark lật sang màu trang đích. Chữ không có motion (owner 2026-11-09) | Route mềm; đổi ngôn ngữ chỉ có pha phủ rồi tải lại trang ([spec](../docs/specs/logo-route-crossfade.md)) |
| Cụm logo khi chuyển trang | Cả cụm luôn hiện (opacity `1`) trên veil, theo Espacio | Route mềm và đổi ngôn ngữ ([R7](../docs/specs/logo-route-crossfade.md#r7-cụm-logo-luôn-hiện-trên-veil)) |
| Vào full menu | Cụm `y -140 → 0`, opacity `0 → 1`, `0.6s expo.out` | Mark CMYK ngay frame đầu, không pha đen |

Mỗi lần mark đổi màu, từng dải lật như tấm biển xoay: mặt màu cũ quay đi, mặt màu
mới quay tới. Trục lật của mỗi dải là đường song song cạnh trái tam giác, đi qua
trung điểm đoạn cạnh phải của dải (cũng là đường giữa dải, qua trung điểm chân
dải); dải đen là tam giác nên trục qua trung điểm cạnh phải của nó. Mỗi dải có
phối cảnh riêng đặt trên trục (`perspective` gấp 6 lần bề rộng mark) nên dải lật
tại chỗ. Lượt lật là một đoạn motion: sang CMYK (hay sang màu khác trắng) chạy
tới, cyan trước, từ trái sang phải; về trắng chạy lùi đúng đoạn đó, đen trước,
từ phải sang trái, các dải quay chiều ngược lại (owner 2026-11-09). Bảng dưới là
chiều tới; chiều lùi đọc từ cuối bảng lên, tính từ mốc `0.68s`.

| Dải | Mặt cũ quay đi (`0` tới `90°`) | Mặt mới quay tới (`-90°` tới `0`) |
| --- | --- | --- |
| 4 cyan | `0` / `0.22s` | `0.22s` / `0.22s` |
| 3 magenta | `0.08s` / `0.22s` | `0.3s` / `0.22s` |
| 2 vàng | `0.16s` / `0.22s` | `0.38s` / `0.22s` |
| 1 đen | `0.24s` / `0.22s` | `0.46s` / `0.22s` |

Mặt cũ quay đi với `cubic-bezier(0.5, 0, 0.75, 0)`, mặt mới quay tới với đường
cong đối xứng `cubic-bezier(0.25, 1, 0.5, 1)`, nên chạy lùi trông y như chạy tới,
không khựng đầu lượt. Mọi mặt cùng kết thúc ở mốc `0.68s` (`endDelay`), nên chạy
lùi từ cuối giữ đúng lệch `0.08s` giữa các dải. Lớp lật là `.brand-lockup__mark-flip` trong
`#header-logo`: mỗi dải một lớp HTML, mỗi mặt một lớp GPU riêng, chỉ animate
`transform` và `opacity` nên chạy trên compositor; cuộn làm bận main thread
không làm mark giật (đo A04s 2026-11-07: kiểu mọc `clip-path` cũ còn khoảng 20
frame/giây và đứng hình khi main thread bận). Trong lúc lật, path inline của mark
ẩn; lật xong gỡ lớp lật, mark inline hiện lại với màu cuối.

Mỗi mặt có thêm một lớp bóng đen cùng hình dải, opacity `0` tới `0.5` khi mặt cũ
quay ra cạnh và `0.5` về `0` khi mặt mới quay tới, cùng delay, thời lượng và
easing với mặt đó (owner 2026-11-09). Dải mảnh xoay quanh trục dọc dải nên nếu
không có bóng, mắt chỉ thấy dải hẹp lại rồi nở ra, bốn dải lệch nhau trông như
một vệt quét; bóng cho thấy mặt đang nghiêng. Trên nền trắng, mặt trắng nghiêng
hiện thành xám thoáng qua.

Khi thu gọn, nền trắng, viền và chữ đậm hiện ngay lúc logo và navbar bắt đầu
chạy, không fade; nền bắt đầu ở cao cũ rồi co cùng logo và navbar trong `0.3s`
(owner 2026-11-09). Khi mở ra (kéo lên), nền trắng, viền và chữ đậm giữ, nền
bắt đầu ở cao cũ rồi giãn cùng logo và navbar, hết `0.3s` mới đổi một lần sang
nền trong, chữ trắng, không fade (owner 2026-11-09). Nền và chữ đổi cùng một
frame nên chữ luôn đọc được: chữ đen chỉ hiện trên nền trắng, chữ trắng chỉ hiện
trên ảnh. Cả hai chiều mark lật ngay lúc bắt đầu nhịp, không pha xám (pha xám
khiến mark đổi màu hai lần). Đổi tone theo section (không thu gọn, nền không
đổi) mark lật từ `0.1s`, cùng nhịp stagger nav lúc intro.

Đổi hướng trong nhịp 1 (lớp lật chưa dựng) về đúng màu lúc vào nhịp: mark giữ
nguyên, không lật. Đổi hướng lúc đang lật: tua ngược ngay từ chỗ đang dừng, như
tua băng, cùng lớp lật, không chờ nhịp header (owner 2026-11-09). Vì chiều về
trắng là chiều tới chạy lùi nên tua kiểu nào thứ tự dải cũng đúng chiều. Màu đích
sang màu thứ ba (không phải hai đầu của lượt): lượt đang chạy lật cho xong, rồi
hết lượt chờ của lần đổi thì lật tiếp từ màu vừa tới.

```gherkin
Given trang chủ ở đầu trang, mark trắng trên hero, trên điện thoại hoặc PC
When cuộn thành sticky rồi cuộn về đầu trang
Then mỗi dải lật quanh trục riêng qua trung điểm chân dải, song song cạnh trái
And khi thu gọn, nền, viền và chữ đổi ngay lúc bắt đầu, nền co cùng logo trong 0.3s
And khi mở ra, nền trắng và chữ đậm giữ, nền giãn cùng logo, hết 0.3s mới đổi sang nền trong, chữ trắng
And cả hai chiều mark bắt đầu lật ngay, không pha xám
And sang CMYK cyan lật trước, đen sau cùng, mọi mặt CMYK hiện ở 0.7s tính từ lúc lật
And về trắng đen lật trước, cyan sau cùng
And đổi hướng lúc đang lật thì tua ngược từ chỗ đang dừng
And lớp lật chỉ animate transform và opacity
```

FLIP chạy trong nhịp 1, xong về mắt trước khi mark lật. Giảm chuyển động: không
intro, không FLIP, màu và tone đổi ngay sang trạng thái cuối.

### State machine màu

Header có một trong hai trạng thái màu mark. Header ở tone mực (nền trắng) khi
một trong ba điều kiện đúng: đã cuộn quá `100px` (sticky), section đang dưới
header có `data-header-tone="ink"`, hoặc veil chuyển route đang phủ kín (vào
thẳng trang: tới khi trang đích sẵn sàng).

| Trạng thái | Lớp header | Mark |
| --- | --- | --- |
| Trắng | `is-brand-inverse` | Bốn path trắng |
| CMYK | `is-brand-color` | Bốn màu |

| Từ | Sự kiện | Tới | Cách chuyển |
| --- | --- | --- | --- |
| Chưa vẽ | Mở trang (direct, F5) trên nền ảnh | Trắng | Ngay, không transition |
| Chưa vẽ | Mở trang trên nền trắng | CMYK | Lật từ đen `#2b2a29` sang CMYK |
| Trắng | Cuộn thành sticky, vào section nền trắng | CMYK | Sticky: lật ngay cùng lúc nền trắng hiện; section: giữ trắng, từ `0.1s` lật sang CMYK |
| CMYK | Về đầu trang trên ảnh, vào section nền tối | Trắng | Về đầu trang: lật ngay lúc header bắt đầu mở ra, nền tắt ở `0.3s`; section: giữ CMYK, từ `0.1s` lật sang trắng; đen trước |
| Trắng | Veil chuyển route phủ kín | CMYK | Lật ngay, không chờ nhịp; chữ đổi ngay sang đậm |
| CMYK | Veil bắt đầu mở, trang đích hero ảnh | Trắng | Lật ngay, đen trước; chữ đổi ngay sang trắng |
| Đang lật | Đổi hướng giữa chừng | Trạng thái mới | Tua ngược từ chỗ đang dừng |

- Chuyển route: lúc bấm link header ghim lại, chữ và mark giữ màu đang có.
  Veil phủ kín thì chữ đổi ngay sang đậm và mark lật sang CMYK (đang CMYK thì
  giữ); logo luôn hiện trên veil, HTML trang đích mount dưới veil không làm vẽ
  lại mark. Veil bắt đầu mở thì chữ đổi ngay sang tone trang đích và mark lật
  theo. Bấm link lúc mark đang lật dở thì lượt lật chạy tiếp (owner 2026-11-09).
- Full menu đứng ngoài state machine: mark luôn CMYK từ frame đầu, đóng hay
  mở lại menu không có pha đen.

## Nguồn

- Code: `truong-thinh-lockup.svg` và mười bản inline ở năm trang; CSS
  `.brand-lockup`, `.site-header.is-brand-*`, `.menu-brand` trong `style.css`;
  `syncHeaderBrandSurface`, `paintHeaderMark`, `snapBrandMark`, `colorHeader`, `playHeaderLockupScaleMotion` trong
  `motion.js`.
- Tích hợp và test: [shell spec](../docs/specs/site-shell.md#r2-header-tone-thu-gọn-lockup-và-nav-desktop).

## Chú thích thuật ngữ

- **Giá trị cốt lõi**: điều thương hiệu giữ không đổi qua mọi sản phẩm, dịch vụ.
- **Hậu mãi**: dịch vụ sau bán hàng như bảo trì, sửa chữa, hỗ trợ.
- **Mark**: phần hình tam giác của logo.
- **Cụm chữ**: hai dòng tiêu đề và phụ đề đứng cạnh mark.
- **Lockup**: mark và cụm chữ đi cùng nhau.
- **Hình dựng**: lưới tỷ lệ quy định kích thước và khoảng cách các phần.
- **Ink bounds**: khung bao phần mực thật của chữ, gồm dấu.
- **Thân chữ**: chiều cao chữ hoa không tính dấu.
- **Tracking**: khoảng cách đều giữa các ký tự.
- **FLIP**: đo vị trí đầu, cuối rồi nội suy bằng transform.
- **State machine**: tập trạng thái và các sự kiện chuyển giữa chúng.
- **Veil**: lớp trắng che trang khi chuyển route.
- **Sticky**: header thu gọn khi đã cuộn.
