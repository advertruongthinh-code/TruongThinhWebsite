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
  trình Khảo sát, Tư vấn, Sản xuất, Lắp đặt. Giọng điệu theo
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

### Motion

| Motion | Thông số | Khi nào |
| --- | --- | --- |
| Intro | Toàn cụm `scale 0 → 1`, `1.5s power4.out`; hamburger chạy sau `1.5s` | Chỉ lần vào site đầu tiên, không chạy khi chuyển route |
| FLIP scale | Toàn cụm, `300ms expo.out`, neo góc trái trên | Đổi giữa expanded và sticky, cả hai chiều, cả mobile |
| Tone cụm chữ | Đổi đen và trắng `0.3s expo.out`, cùng nav và hamburger | Mỗi lần header đổi tone |
| Màu mark | Chuỗi bốn path, mỗi path kết thúc đúng `1s` | Theo state machine dưới |
| Vào full menu | Cụm `y -140 → 0`, opacity `0 → 1`, `0.6s expo.out` | Mark CMYK ngay frame đầu, không pha đen |

Chuỗi màu mark dùng CSS transition `fill`, đường cong
`cubic-bezier(0.16, 1, 0.3, 1)`; `delay + duration = 1s` ở mọi path nên cả bốn
cùng xong một lúc, path bắt đầu muộn thì đổi nhanh hơn:

| Path | Vào CMYK: delay / duration | Rời CMYK: delay / duration |
| --- | --- | --- |
| 1 đen | `0` / `1s` | `0` / `1s` |
| 2 vàng | `0.07s` / `0.93s` | `0.14s` / `0.86s` |
| 3 magenta | `0.14s` / `0.86s` | `0.07s` / `0.93s` |
| 4 cyan | `0.21s` / `0.79s` | `0.21s` / `0.79s` |

FLIP chạy song song với chuỗi màu và không hủy nó. Giảm chuyển động: không
intro, không FLIP, màu và tone đổi ngay sang trạng thái cuối.

### State machine màu

Header có một trong ba trạng thái màu mark. Header ở tone mực (nền trắng) khi
một trong ba điều kiện đúng: đã cuộn quá `100px` (sticky), section đang dưới
header có `data-header-tone="ink"`, hoặc đang chuyển route mà trang đích chưa
sẵn sàng.

| Trạng thái | Lớp header | Mark |
| --- | --- | --- |
| Trắng | `is-brand-inverse` | Bốn path trắng |
| Đen tạm | `is-brand-color-reset` | Bốn path `#2b2a29`, không transition |
| CMYK | `is-brand-color` | Bốn màu |

| Từ | Sự kiện | Tới | Cách chuyển |
| --- | --- | --- | --- |
| Chưa vẽ | Mở trang (direct, F5) trên nền ảnh | Trắng | Ngay, không transition |
| Chưa vẽ | Mở trang trên nền trắng | Đen tạm, rồi CMYK | Vẽ đen một frame, frame sau chạy chuỗi vào CMYK |
| Trắng | Cuộn thành sticky, vào section nền trắng, bắt đầu chuyển route | CMYK | Chuỗi vào CMYK, đi thẳng từ trắng |
| CMYK | Về đầu trang trên ảnh, vào section nền tối, trang đích có hero ảnh | Trắng | Chuỗi rời CMYK |
| Đang chuyển | Đổi hướng giữa chừng | Trạng thái mới | Đi tiếp từ màu đang hiển thị, không nhảy hay reset |

- Chuyển route: khi bấm link, header ghim lại ở tone mực và mark chuyển sang
  CMYK; khi HTML trang đích sẵn sàng, mark chuyển theo tone của trang đích
  ngay dưới lớp veil, không chờ ảnh hero.
- Full menu đứng ngoài state machine: mark luôn CMYK từ frame đầu, đóng hay
  mở lại menu không có pha đen.

## Nguồn

- Code: `truong-thinh-lockup.svg` và mười bản inline ở năm trang; CSS
  `.brand-lockup`, `.site-header.is-brand-*`, `.menu-brand` trong `style.css`;
  `syncHeaderBrandSurface`, `colorHeader`, `playHeaderLockupScaleMotion` trong
  `motion.js`.
- Tích hợp và test: [shell spec](../docs/specs/site-shell.md#r2-header-tone-thu-gọn-lockup-và-nav-desktop).
- Kiểm chứng tỷ lệ gồm dấu: [LOGO-R3](../docs/verification/brand-lockup-logo-r3-2026-09-10.md).

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
