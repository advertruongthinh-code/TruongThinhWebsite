---
title: Thanh tìm kiếm, một khối ở ba chỗ
status: planned
source: []
tests:
  - tests/site/advertising-search.e2e.mjs
notion: https://app.notion.com/p/420332849a0e81dda7d5ecc5fa185ea2
updated: 2026-11-22
---

# Thanh tìm kiếm, một khối ở ba chỗ

## Mục đích

Spec con của [Tìm kiếm R7](advertising-search.md#r7-thanh-tìm-kiếm): giao diện, chỗ đứng, chuyển động của thanh tìm kiếm trang Sản phẩm quảng cáo và cách audit
với mock. Tìm, xếp hạng, API (kể cả 1 ảnh) thuộc spec sở hữu. Theo bản thiết kế lại owner duyệt 2026-11-22 ([mock v8](https://claude.ai/artifact/8D3Be52xYXqdiwhakvjaoE), thay bản thử "Đường kẻ" cũ). Số đo dưới đây lấy từ mock; khi code xong phải
audit trang thật với mock (R6).

## Hành vi

### R1. Một khối ở ba chỗ

**Một khối ở ba chỗ.** Thanh là một khối liền: nền `paper`, viền 1px `ink`, góc vuông. Ba chỗ dùng cùng khối đó; đổi chỗ chỉ đổi vị trí, bề rộng và bóng,
không đổi dáng (bỏ đường kẻ ở khe CTA). Ngoại lệ có chủ ý so với mock: chữ ô 16px (mock 15px) và morph 1s (mock 0,6s, quyết định owner 2026-11-18). Đầu trang: khe `[data-search-dock-top]` như nay (thế chỗ hàng nhóm dưới tiêu đề hero; trang có lưới masonry bỏ "Cuộn xuống").
Giữa trang: nổi trong lớp cố định ở đáy, ngang giữa. Cuối lưới: khe `[data-search-dock]` dưới tiêu đề CTA. Thanh vào và rời khe theo quãng cuộn ([R7](#r7-vào-khe-theo-quãng-cuộn)); chỉ trang gốc có thanh ([R8](#r8-chỉ-trang-gốc-có-thanh)).

| | PC và tablet (từ 751px) | Phone (dưới 751px) |
| --- | --- | --- |
| Nổi, chưa có kết quả | rộng `min(560px, 100% - 32px)`, cách đáy 35px, bóng `0 12px 32px rgb(0 0 0 / 18%)` | rộng 100% trừ 16px mỗi bên, cách đáy 16px cộng `safe-area-inset-bottom`, cùng bóng |
| Nổi, có kết quả | rộng `min(760px, 100% - 32px)`, thêm hàng chip phía trên | như trên, thêm hàng chip |
| Khe đầu trang, khe CTA | rộng bằng khe, tối đa 1000px; không bóng, không hàng chip | rộng bằng khe; không bóng, không hàng chip |

**Hàng chữ.** cao 48px ở mọi chỗ: ô chữ 16px (16px để iOS không phóng to khi gõ), đệm trái 18px; bên phải: nút xoá chữ (chỉ hiện khi đã gõ), vạch 1px cao 22px
(màu `ink` 14%, cách hai bên 4px), nút ảnh, nút kính lúp, mỗi nút ô 40px, icon 20px nét 1.8, đệm phải 4px. Nút xoá chữ đứng trước vạch. Ô chữ đang focus: viền khối
dày thêm 1px vào trong (bóng `inset 0 0 0 1px ink`), không outline; nút, chip, link và nút về đầu trang focus bằng bàn phím: outline 2px `ink` cách 2px. Bỏ đường kẻ
3px `.search-bar__rule`, nút `.search-bar__talk`, chữ `placeholderDocked` và quy tắc ẩn `legacy-link`.

### R2. Hàng chip khi nổi

**Hàng chip.** (chỉ khi nổi và đang có kết quả): cao 44px, nằm trên hàng chữ trong cùng khối, ngăn bằng đường mảnh 1px `ink` 14%; đệm ngang 14px. Một hàng, không
rail nhóm, không chip "Tất cả" (như mock): các sản phẩm có ít nhất một kết quả, theo thứ tự rail của trang (hero đang chọn một nhóm thì chỉ sản phẩm của nhóm đó);
bấm chip là lọc trong kết quả, câu tìm giữ nguyên (gọi cùng bộ lọc của lưới như chip ở hero); bấm lại chip đang chọn thì về toàn bộ kết quả. Chip là `button`
có `aria-pressed`, theo thứ tự Tab sau ô chữ và các nút. Số cạnh tên là số kết quả của sản phẩm đó. Chip chữ 13px đậm 600, cách nhau 18px; số kết quả nhỏ 10px đậm 700 màu `muted` cạnh tên; chip đang chọn gạch dưới 2px, cách chữ 5px.
Dài quá thì cuộn ngang trong hàng, mép phải mờ dần (chỉ khi còn chip bị che). Chữ phóng 200% thì hàng chip cao theo chữ. Bỏ tìm thì hàng chip đóng. Hàng chip mở và đóng bằng chiều cao 0 tới 44px cùng nhịp đổi bề rộng.

### R3. Chữ gợi ý, ảnh và thông báo

**Chữ gợi ý.** Ô trống, không focus, không rê chuột thì chữ mờ (`muted`) đổi mỗi 3 giây; câu cũ trượt lên 60% và mờ đi, câu mới trượt từ dưới lên,
`--dur-fade` `--ease-expo-out`. Focus, rê chuột hoặc đã có chữ thì dừng ở câu đang hiện. Giảm chuyển động: không đổi, chỉ hiện câu đầu. Đang có ảnh mà chưa gõ chữ thì
hiện cố định "Thêm chữ để tìm sát hơn" / "Add words to narrow it down". Mỗi câu tối đa 28 ký tự để vừa ô chữ phone 390px (khoảng 215px); dài hơn thì cắt bằng "…".
Danh sách (VI / EN): "Tìm hộp đèn, chữ nổi, kệ…" / "Search lightboxes, letters…"; "Thử: chữ nổi inox" / "Try: steel letters"; "Mẹo: tìm bằng một ảnh mẫu" /
"Tip: search with a photo"; "Gõ không dấu cũng được" / "Typos are fine"; "Thử: kệ trưng bày mỹ phẩm" / "Try: cosmetics display". Lớp chữ gợi ý là `aria-hidden`; ô chữ giữ
`placeholder` tĩnh cho trình đọc màn hình.

**Ảnh: một tấm.** Ảnh vào bằng nút ảnh, kéo thả (lớp phủ "Thả ảnh vào đây để tìm") hoặc dán. Thumbnail 30px nằm đúng chỗ nút ảnh, góc trên phải có nút bỏ 14px nền `ink`
chữ trắng (vùng bấm 32px); thanh không cao thêm, không còn khay ảnh. Bấm thumbnail thì mở chọn ảnh để thay. Đưa ảnh mới (một hay nhiều file) thì ảnh đầu thay ảnh
cũ ([Tìm kiếm R8](advertising-search.md#r8-ảnh-khách-đưa-vào)). Bỏ ảnh thì focus về nút ảnh. Phần tìm (1 ảnh gửi API) thuộc thread rà soát tìm kiếm ([Tìm kiếm R8](advertising-search.md#r8-ảnh-khách-đưa-vào)).

**Thông báo.** ("Chưa thấy mẫu phù hợp", thông báo về ảnh của R8, đang chậm, tạm nghỉ): không còn khay, nên thông báo là một lớp chữ đè lên ô chữ (chữ khách gõ
tạm trong suốt), trượt vào và ra như chữ gợi ý, chữ `ink` đậm 600 để khác chữ gợi ý; 4 giây rồi chữ khách gõ hiện lại. Khách gõ hoặc bấm vào ô thì thông báo tắt
ngay. Đang chậm và tạm nghỉ ([Tìm kiếm R6](advertising-search.md#r6-chờ-dự-phòng-và-lỗi)): thông báo ở lại tới khi khách làm gì đó, cuối thông báo có nút chữ "Thử lại" / "Retry". Phone: dùng câu ngắn ("Ảnh chưa đọc
được, thử JPG" ...), tối đa 28 ký tự. Mọi thông báo cũng đọc qua vùng `aria-live` ẩn.

### R4. Khe CTA

**Khe CTA.** Thanh không còn nút "Trao đổi ý tưởng". Link "Trao đổi ý tưởng" của CTA luôn hiện, nằm dưới khe, giống trang Công trình (chữ hoa đậm, rê chuột thì
gạch chân 3px chạy ra, `--ease-underline`). Khoảng trống trên và dưới thanh bằng nhau theo nét chữ: chân chữ dòng cuối tiêu đề tới đỉnh thanh bằng đáy thanh tới
đỉnh chữ hoa của link (mock: 48px PC, 23px phone). Khi trang cuộn tới tận cuối, tâm cụm tiêu đề và thanh nằm ở tâm thị giác của vùng nhìn thấy: giữa đáy header và
đỉnh footer, nhích lên 5% chiều cao vùng đó; điện thoại tới cuối trang bằng cuộn xuống nên header đã khuất ([phone-header-scroll R2](phone-header-scroll.md#r2-header-đi-theo-quãng-cuộn)), vùng tính từ mép trên màn hình (thay quy tắc cũ "đường chân chữ dòng cuối ở giữa viewport"). Link không tính vào cụm. Cửa sổ thấp quá thì giữ quy tắc
dự phòng cũ: link cách đáy khối ít nhất `--masonry-gap`.

### R5. Nút về đầu trang, phone và chuyển động

**Nút về đầu trang (thiết bị cảm ứng, theo điều kiện hiện nay `(hover: none) and (pointer: coarse)`).** Khi thanh nổi: ô 50px nền `paper`, viền 1px `ink`, cùng bóng
với thanh, nằm hàng riêng phía trên thanh, sát mép phải của thanh, cách 10px. Thanh ở khe thì nút ẩn (như mock). `--search-bar-offset` = chiều cao khối (gồm hàng
chip) + 12px; Floating CTA và nút về đầu trang không cùng hiện nên không cộng hàng nút.

**Phone, bàn phím mở.** Ô chữ focus trên phone: hàng chip và nút về đầu trang ẩn, chỉ còn hàng chữ trên bàn phím; thanh không đổi chỗ tới khi blur (như nay).

**Chuyển động.** Đổi chỗ giữa nổi và khe theo [R7](#r7-vào-khe-theo-quãng-cuộn), không có morph chạy theo thời gian. Có kết quả và bỏ tìm khi đang nổi: bề rộng 560 và 760px, hàng chip đổi bằng morph
`--search-morph` 1s `--search-ease` (`--ease-card`). Giảm chuyển động: morph đó đổi ngay; R7 vẫn đi theo cuộn vì chỉ chạy khi khách cuộn.

**Giữ nguyên.** Enter tìm, Esc bỏ tìm; đang tìm thì nút xoá chữ cũng bỏ tìm. Đang gõ thì Home, End, PageUp, PageDown, mũi tên, Space chỉ di con trỏ. Không có dòng
trạng thái trên màn hình (owner 2026-11-17). Thanh nổi đẩy Floating CTA lên bằng `--search-bar-offset`. Không có JavaScript thì CTA vẫn có link cũ. Chữ trên thanh,
chữ gợi ý, thông báo có bản EN. Không cuộn ngang ở 384, 768, 1024, 1280, 1440, 1920px.

```gherkin
Given trang /vi/advertising-products/ ở 1440px, khách đã tìm "hộp đèn"
When khách cuộn xuống giữa lưới
Then thanh nổi rộng 760px, có hàng chip "Tất cả" và các sản phẩm có kết quả, bấm "Chữ nổi" thì lưới chỉ còn kết quả Chữ nổi, ô chữ vẫn là "hộp đèn"

Given trang ở 384px, cuộn tới tận cuối
Then khoảng trống trên và dưới thanh lệch nhau không quá 2px, link "Trao đổi ý tưởng" nằm dưới thanh, không có nút "Trao đổi" trong thanh
```

### R6. Audit so với mock

Owner yêu cầu (2026-11-22): xong code phải audit trang thật với mock trước khi đưa owner xem. Script Playwright chụp trang thật ở 1440px và 390px, ba chỗ (khe đầu
trang, nổi, khe CTA) và ba trạng thái (chưa tìm, có kết quả, 1 ảnh), đo các số trong R1 đến R5 (bề rộng, chiều cao hàng, vị trí, viền, cỡ chữ, khoảng trống CTA, tâm
cụm CTA, vị trí nút về đầu trang) và so với số CSS của mock (mock thu nhỏ bằng `transform`, nên không so pixel ảnh), lệch tối đa 2px; màu và bóng so đúng giá trị
CSS. Hai ngoại lệ ở R1 không tính là lệch. Kết quả là một trang so sánh đặt ảnh trang thật cạnh mock cho owner xem.

### R7. Vào khe theo quãng cuộn

Owner chọn 2026-11-22 (thay cú bay 1 giây): thanh vào và rời khe theo đúng quãng cuộn, cả PC lẫn phone. Không có animation tự chạy: cuộn dừng là thanh đứng yên
giữa đường, cuộn ngược là thanh đi ngược lại. Gọi `p` là độ "đã vào khe", 0 là dáng nổi, 1 là dáng ở khe; bề rộng đi từ bề rộng nổi (560 hoặc 760px) tới bề rộng
khe, bóng mờ dần theo `1 - p`, hàng chip (nếu có kết quả) gập lại theo `p`.

- **Khe đầu trang.** Ở đầu trang (cuộn 0) thanh nằm trong khe. Cuộn xuống quãng `H = min(50% chiều cao màn hình, vị trí khe lúc đầu trang - chiều cao header)`
  thì `p` đi từ 1 về 0 và thanh trượt từ khe xuống chỗ nổi: vị trí là điểm giữa khe (đang trôi lên theo trang) và chỗ nổi, theo tỷ lệ `p`. Hết `H` thì thanh nổi.
  `H` chọn để thanh về tới khe trước khi khe chui dưới header.
- **Khe CTA.** Thanh nổi tới khi hàng chữ của khe chạm hàng chữ của thanh nổi, rồi nằm trong khe và trôi theo trang như `sticky`; trong khe, `p` đi từ 0 tới 1
  trong một phần tư chiều cao màn hình cuộn tiếp (ngắn hơn nếu trang hết sớm hơn), nên tới giới hạn cuộn thanh luôn ở dáng khe đủ. Lúc còn hàng chip, hàng chip
  nhô lên trên khe, khe không đổi cao.
- Phone đang gõ (bàn phím mở): thanh đứng yên tới khi blur. Nút về đầu trang chỉ hiện khi thanh nổi hẳn (`p = 0`).

```gherkin
Given trang gốc ở 1440px, cuộn 0, thanh trong khe đầu trang
When cuộn xuống 100px rồi dừng
Then thanh đứng yên giữa khe và chỗ nổi, rộng giữa 1000 và 560px; cuộn lên lại 0 thì thanh về khe
```

### R8. Chỉ trang gốc có thanh

Owner 2026-11-22: thanh tìm kiếm chỉ có ở trang gốc Sản phẩm quảng cáo (`/vi/advertising-products/`, `/en/advertising-products/`); trang Công trình và mọi trang
con (trang nhóm, trang sản phẩm, trang chi tiết card) không có. Build gắn `data-search-off` lên container của trang con; khe đầu trang và khe CTA ẩn, hero và CTA
giữ bố cục không có thanh (link "Trao đổi ý tưởng" cách tiêu đề `--masonry-gap`). Trên trang gốc, khi không đang tìm mà bấm nhóm hoặc chip (URL sang trang con),
hoặc mở chi tiết một card, runtime gắn `data-search-off`: thanh đang nổi trượt xuống khỏi màn hình (450ms `--ease-card`) rồi ẩn, thanh đang ở khe mất cùng khe. Về
"Tất cả" hoặc đóng card thì thanh hiện lại theo R7. Đang tìm mà bấm chip trong kết quả thì thanh vẫn ở (như R2).

## Kiểm tra

| R | Test |
| --- | --- |
| R1 đến R5, R7, R8 | `node tests/site/advertising-search.e2e.mjs` (bảng ở [Tìm kiếm](advertising-search.md#kiểm-tra)); R7 và R8 có test riêng `search-bar R7`, `search-bar R8` |
| R6 | script audit chạy trên dev server; số và ảnh đính kèm PR |

## Chú thích thuật ngữ

- **Khe (dock)**: chỗ cố định trong trang nơi thanh dừng (đầu trang dưới hero, cuối lưới dưới tiêu đề CTA).
- **Tâm thị giác**: điểm mắt coi là giữa, cao hơn tâm hình học một chút.
