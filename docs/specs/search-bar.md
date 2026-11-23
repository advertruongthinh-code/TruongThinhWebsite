---
title: Thanh tìm kiếm, một khối ở ba chỗ
status: planned
source: []
tests:
  - tests/site/advertising-search.e2e.mjs
notion: https://app.notion.com/p/420332849a0e81dda7d5ecc5fa185ea2
updated: 2026-11-23
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
Giữa trang: nổi trong lớp cố định ở đáy, ngang giữa. Cuối lưới: khe `[data-search-dock]` dưới tiêu đề CTA. Thanh vào và rời khe dứt khoát theo vị trí cuộn ([R7](#r7-vào-khe-dứt-khoát)); chỉ trang gốc có thanh ([R8](#r8-chỉ-trang-gốc-có-thanh)).

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
rail nhóm, không chip "Tất cả" (như mock): các sản phẩm có ít nhất một kết quả, sản phẩm nhiều card kết quả xếp trước, bằng nhau thì theo thứ tự rail của trang (owner 2026-11-23; hero đang chọn một nhóm thì chỉ sản phẩm của nhóm đó; bấm một chip thì hàng vẫn giữ đủ chip như trước khi bấm, owner 2026-11-23);
bấm chip là lọc trong kết quả, câu tìm giữ nguyên (gọi cùng bộ lọc của lưới như chip ở hero); bấm lại chip đang chọn thì về toàn bộ kết quả. Chip là `button`
có `aria-pressed`, theo thứ tự Tab sau ô chữ và các nút. Số cạnh tên là số kết quả của sản phẩm đó. Chip chữ 13px đậm 600, cách nhau 18px; số kết quả nhỏ 10px đậm 700 màu `muted` cạnh tên; chip đang chọn gạch dưới 2px, cách chữ 5px.
Dài quá thì cuộn ngang trong hàng (vuốt trên màn cảm ứng; chuột thì kéo hàng hoặc lăn bánh xe trên hàng, owner 2026-11-23: lăn tới đầu hoặc cuối hàng thì trả lăn về trang; kéo không tính là bấm chip), mép phải mờ dần (chỉ khi còn chip bị che), và nút icon mũi tên 44px ghim ở cuối hàng (chỉ hiện khi có chip bị cắt, owner 2026-11-23); tên nút cho screen reader và tooltip là "Hiện tất cả (N)" / "Show all (N)" khi bảng đóng (N là số sản phẩm có kết quả), "Thu gọn" / "Show less" khi mở. Bảng đóng thì mũi tên chỉ lên, mở thì quay 180 độ chỉ xuống, cùng nhịp morph (owner 2026-11-23). Bấm nút thì bảng mọc lên từ mép trên thanh, liền với thanh thành một khung (owner 2026-11-23): rộng bằng thanh, viền 1px `ink` hai bên và trên nối tiếp viền thanh, chỗ nối là đường mảnh 1px `ink` 14% thay viền trên của thanh, bóng như thanh nhưng không đổ xuống thanh; chứa mọi chip theo cùng thứ tự, xuống dòng, cao tối đa `min(50vh, 320px)` rồi cuộn dọc, hàng cuối mờ dần khi còn chip bên dưới. Mở và đóng là morph chiều cao từ 0 tới đủ bảng (và ngược lại) 1s `--ease-card`, cùng nhịp với thanh; đóng xong thì bảng ẩn hẳn; giảm chuyển động thì đổi ngay. Nút có `aria-expanded`, bảng đóng thì `inert`. Chọn một chip trong bảng thì lọc như chip ở hàng và bảng đóng; bấm lại nút, bấm ra ngoài thanh hoặc Esc (trong bảng hoặc trên nút) cũng đóng. Chip đang chọn luôn nằm trong phần thấy được của hàng, không bị nút che. Lăn chuột trên thanh nổi mà hàng chip không dùng thì trang cuộn như mọi chỗ khác. Thanh vào khe thì bảng ẩn cùng hàng chip. Chữ phóng 200% thì hàng chip cao theo chữ. Bỏ tìm thì hàng chip đóng. Hàng chip mở và đóng bằng chiều cao 0 tới 44px cùng nhịp đổi bề rộng.

```gherkin
Given trang gốc ở 384px, khách tìm "đèn" ra 19 sản phẩm
Then hàng chip có nút mũi tên "Hiện tất cả (19)" ở cuối; bấm thì bảng mọc lên liền mép trên thanh, hiện đủ 19 chip, chọn "Chữ nổi" thì lưới lọc và bảng thu về thanh
```

### R3. Chữ gợi ý, ảnh và thông báo

**Chữ gợi ý.** Ô trống, không focus, không rê chuột thì chữ mờ (`muted`) đổi mỗi 3 giây; câu cũ trượt lên 60% và mờ đi, câu mới trượt từ dưới lên,
`--dur-fade` `--ease-expo-out`. Focus, rê chuột hoặc đã có chữ thì dừng ở câu đang hiện. Giảm chuyển động: không đổi, chỉ hiện câu đầu. Đang có ảnh mà chưa gõ chữ thì
hiện cố định "Thêm chữ để lọc" / "Add a few words". Owner 2026-11-23: phone chung hàng với nút về đầu trang ([R5](#r5-nút-về-đầu-trang-phone-và-chuyển-động)) nên ô chữ
phone 360px chỉ còn khoảng 157px; mỗi câu (khoảng 20 ký tự) phải vừa nguyên ô đó, không bị cắt "…".
Danh sách (VI / EN): "Tìm hộp đèn, chữ nổi" / "Search lightboxes…"; "Thử: chữ nổi inox" / "Try: steel letters"; "Mẹo: tìm bằng ảnh" /
"Tip: search by photo"; "Gõ không dấu được" / "Typos are fine"; "Thử: kệ mỹ phẩm" / "Try: display shelves". Lớp chữ gợi ý là `aria-hidden`; ô chữ giữ
`placeholder` tĩnh cho trình đọc màn hình.

**Ảnh: một tấm.** Ảnh vào bằng nút ảnh, kéo thả (lớp phủ "Thả ảnh vào đây để tìm") hoặc dán. Thumbnail 30px nằm đúng chỗ nút ảnh, góc trên phải có nút bỏ 14px nền `ink`
chữ trắng (vùng bấm 32px); thanh không cao thêm, không còn khay ảnh. Bấm thumbnail thì mở chọn ảnh để thay. Đưa ảnh mới (một hay nhiều file) thì ảnh đầu thay ảnh
cũ ([Tìm kiếm R8](advertising-search.md#r8-ảnh-khách-đưa-vào)). Bỏ ảnh thì focus về nút ảnh. Phần tìm (1 ảnh gửi API) thuộc thread rà soát tìm kiếm ([Tìm kiếm R8](advertising-search.md#r8-ảnh-khách-đưa-vào)).

**Thông báo.** ("Chưa thấy mẫu nào", thông báo về ảnh của R8, đang chậm, lỗi tìm): không còn khay, nên thông báo là một lớp chữ đè lên ô chữ (chữ khách gõ
tạm trong suốt), trượt vào và ra như chữ gợi ý, chữ `ink` đậm 600 để khác chữ gợi ý; 4 giây rồi chữ khách gõ hiện lại. Khách gõ hoặc bấm vào ô thì thông báo tắt
ngay. Đang chậm và lỗi tìm ([Tìm kiếm R6](advertising-search.md#r6-chờ-dự-phòng-và-lỗi)): thông báo ở lại tới khi khách làm gì đó, cuối ô chữ có nút icon vòng xoay 40px như nút ảnh, nhãn `aria-label`/`title` "Thử lại" / "Try again" (owner 2026-11-23, thay nút chữ). Câu ngắn
như chữ gợi ý: vừa nguyên ô chữ phone 360px (khoảng 157px), câu có nút thử lại vừa phần còn lại (khoảng 107px): "Tìm ảnh chậm" / "Image is slow", "Lỗi tìm kiếm" /
"Search error", "Lỗi tìm ảnh" / "Image error", "Ảnh lỗi, thử JPG" / "Bad image, try JPG", "File chưa hỗ trợ" / "File not supported", "Ảnh cần dưới 25 MB" /
"Image over 25 MB". Mọi thông báo cũng đọc qua vùng `aria-live` ẩn.

### R4. Khe CTA

**Khe CTA.** Thanh không còn nút "Trao đổi ý tưởng". Link "Trao đổi ý tưởng" của CTA luôn hiện, nằm dưới khe, giống trang Công trình (chữ hoa đậm, rê chuột thì
gạch chân 3px chạy ra, `--ease-underline`). Khoảng trống trên và dưới thanh bằng nhau theo nét chữ: chân chữ dòng cuối tiêu đề tới đỉnh thanh bằng đáy thanh tới
đỉnh chữ hoa của link (mock: 48px PC, 23px phone). Khi trang cuộn tới tận cuối, tâm cụm tiêu đề và thanh nằm ở tâm thị giác của vùng nhìn thấy: giữa đáy header và
đỉnh footer, nhích lên 5% chiều cao vùng đó; điện thoại tới cuối trang bằng cuộn xuống nên header đã khuất ([phone-header-scroll R2](phone-header-scroll.md#r2-header-đi-theo-quãng-cuộn)), vùng tính từ mép trên màn hình (thay quy tắc cũ "đường chân chữ dòng cuối ở giữa viewport"). Link không tính vào cụm. Cửa sổ thấp quá thì giữ quy tắc
dự phòng cũ: link cách đáy khối ít nhất `--masonry-gap`.

### R5. Nút về đầu trang, phone và chuyển động

**Nút về đầu trang (thiết bị cảm ứng, theo điều kiện hiện nay `(hover: none) and (pointer: coarse)`).** Nút luôn là ô 50px nền `paper`, viền 1px `ink`, cùng bóng
với thanh ([shell](site-shell.md), owner 2026-11-22). Khi thanh nổi trên máy cỡ tablet: nằm hàng riêng phía trên thanh, cách 10px, sát mép phải màn (owner 2026-11-22). Phone dọc và ngang (như
[phone-header-scroll R6](phone-header-scroll.md), owner 2026-11-23): thanh và nút chung một hàng cách đáy 16px, thẳng mép lưới: thanh từ mép trái lưới tới cách
mép phải lưới 60px, nút 50px nằm cuối hàng cách thanh 10px, đáy nút bằng đáy thanh; có kết quả thì hàng chip mở phía trên thanh, nút đứng yên. Thanh ở khe thì nút ẩn. Nút nằm dưới khối tìm kiếm (z-index), bóng không phủ lên thanh. Detail view ẩn thanh nên nút về góc thường. `--search-bar-offset` = chiều cao khối (gồm hàng
chip) + 12px; Floating CTA và nút về đầu trang không cùng hiện nên không cộng hàng nút.

**Phone, bàn phím mở.** Ô chữ focus trên phone: hàng chip và nút về đầu trang ẩn, chỉ còn hàng chữ trên bàn phím; thanh không đổi chỗ tới khi blur (như nay).

**Chuyển động.** Đổi chỗ giữa nổi và khe theo [R7](#r7-vào-khe-dứt-khoát): morph vào và ra khe CTA, kéo dài ra ở khe đầu trang. Có kết quả và bỏ tìm khi đang nổi: bề rộng 560 và 760px, hàng chip đổi bằng morph
`--search-morph` 1s `--search-ease` (`--ease-card`). Giảm chuyển động: morph đó và cú trượt lên của R7 đổi ngay.

**Giữ nguyên.** Enter tìm, Esc bỏ tìm; đang tìm thì nút xoá chữ cũng bỏ tìm. Đang gõ thì Home, End, PageUp, PageDown, mũi tên, Space chỉ di con trỏ. Không có dòng
trạng thái trên màn hình (owner 2026-11-17). Thanh nổi đẩy Floating CTA lên bằng `--search-bar-offset`. Không có JavaScript thì CTA vẫn có link cũ. Chữ trên thanh,
chữ gợi ý, thông báo có bản EN. Không cuộn ngang ở 384, 768, 1024, 1280, 1440, 1920px.

```gherkin
Given trang /advertising-products/ ở 1440px, khách đã tìm "hộp đèn"
When khách cuộn xuống giữa lưới
Then thanh nổi rộng 760px, có hàng chip các sản phẩm có kết quả, nhiều card trước, bấm "Chữ nổi" thì lưới chỉ còn kết quả Chữ nổi, ô chữ vẫn là "hộp đèn"

Given trang ở 384px, cuộn tới tận cuối
Then khoảng trống trên và dưới thanh lệch nhau không quá 2px, link "Trao đổi ý tưởng" nằm dưới thanh, không có nút "Trao đổi" trong thanh
```

### R6. Audit so với mock

Owner yêu cầu (2026-11-22): xong code phải audit trang thật với mock trước khi đưa owner xem. Script Playwright chụp trang thật ở 1440px và 390px, ba chỗ (khe đầu
trang, nổi, khe CTA) và ba trạng thái (chưa tìm, có kết quả, 1 ảnh), đo các số trong R1 đến R5 (bề rộng, chiều cao hàng, vị trí, viền, cỡ chữ, khoảng trống CTA, tâm
cụm CTA, vị trí nút về đầu trang) và so với số CSS của mock (mock thu nhỏ bằng `transform`, nên không so pixel ảnh), lệch tối đa 2px; màu và bóng so đúng giá trị
CSS. Hai ngoại lệ ở R1 không tính là lệch. Kết quả là một trang so sánh đặt ảnh trang thật cạnh mock cho owner xem.

### R7. Vào khe dứt khoát

Owner sửa 2026-11-23 (thay bản "đi theo ngón tay" 2026-11-22): thanh đổi chỗ dứt khoát theo vị trí cuộn, cả PC lẫn phone: không có dáng
đứng yên nửa nổi nửa ở khe theo ngón tay. Owner 2026-11-23 4:16: đổi chỗ có motion chạy theo thời gian như dưới.

- **Khe đầu trang.** Thanh nằm yên trong khe và cuộn đi cùng trang. Khi cả thanh đã khuất (chui hết dưới header, hoặc lên khỏi mép trên
  màn hình khi header đã ẩn), thanh nổi mới hiện: bay lên từ mép dưới màn hình cùng nhịp nút về đầu trang phone, 1s `--ease-float` (owner 2026-11-23; giảm chuyển động thì hiện ngay).
  Thanh không bao giờ đi ngang qua giữa màn hình. Cuộn lên tới khi khe lộ lại thì thanh về khe.
- **Kéo dài ra ở khe đầu trang.** Mỗi lần thanh vào khe đầu trang (lúc tải trang, sau khi lớp phủ vào trang tan, và khi từ chỗ khác về khe),
  khối kéo dài từ một ô vuông cao bằng hàng nhập (49px) ở giữa ra đủ bề rộng khe, `--search-morph` 1s `--ease-card`; nội dung nằm trong
  viền trong lúc kéo. Không phải morph từ dáng chỗ cũ.
- **Khe CTA.** Thanh nổi tới khi hàng nhập của khe chạm hàng nhập của thanh nổi, rồi vào khe và nằm trong khe trôi theo trang; dáng morph từ
  dáng nổi sang dáng khe (bề rộng, bóng mờ đi, hàng chip gập lại) trong `--search-morph` 1s `--ease-card`, không đổi gắt. Cuộn ngược qua
  điểm đó thì về nổi, morph ngược lại.
- **Tải lại giữa trang:** thanh đứng ngay ở chỗ của vị trí cuộn, không chạy hiệu ứng (trừ kéo dài ra ở khe đầu trang).
- **Giảm chuyển động:** mọi motion trên đổi ngay.
- **Phone đang gõ** (bàn phím mở): thanh đứng yên tới khi thôi gõ. Nút về đầu trang chỉ hiện khi thanh nổi.

```gherkin
Given trang gốc ở 1440px, đầu trang, thanh trong khe đầu trang
When cuộn xuống 60px
Then thanh vẫn trong khe, lên theo trang đúng 60px
When cuộn tiếp tới khi đáy khe vừa chui dưới header
Then thanh nổi trượt lên từ mép dưới; cuộn lên lại đầu trang thì thanh về khe

Given thanh đang nổi giữa lưới ở 390px
When cuộn xuống qua chỗ khe CTA chạm thanh rồi dừng
Then thanh vào khe và bề rộng đi dần từ bề rộng nổi tới bề rộng khe trong khoảng 1 giây, bóng mờ dần
```

### R8. Chỉ trang gốc có thanh

Owner 2026-11-22: thanh tìm kiếm chỉ có ở trang gốc Sản phẩm quảng cáo (`/advertising-products/`, `/en/advertising-products/`). Trang Công trình và mọi trang
con (trang nhóm, trang sản phẩm, trang chi tiết card) không có thanh, không có khe; hero và CTA giữ bố cục như trước khi có thanh (link "Trao đổi ý tưởng" cách
tiêu đề một khoảng lưới). Muốn tìm thì về trang gốc.

- Trên trang gốc, đang không tìm mà bấm một nhóm hoặc chip ở hero (sang trang con), hoặc mở chi tiết một card: thanh đang nổi trượt xuống khỏi màn hình
  (450ms `--ease-card`, giảm chuyển động thì tắt ngay) rồi ẩn; thanh đang ở khe mất cùng khe.
- Đang tìm: bấm chip trong kết quả thì thanh vẫn ở (R2). Bấm một nhóm ở hero là rời tìm (như nay) nên thanh ẩn như trên.
- Về "Tất cả" hoặc đóng card: thanh hiện lại ngay ở chỗ đúng theo R7.

```gherkin
Given trang gốc ở 1440px, chưa tìm
When bấm nhóm "Bảng hiệu"
Then URL sang trang nhóm, không còn thanh và khe; bấm "Tất cả" thì thanh hiện lại trong khe đầu trang
```

Ghi chú kỹ thuật: build gắn `data-search-off` lên container của trang con và trang card; runtime masonry bật, tắt thuộc tính này khi đổi nhóm, mở hoặc đóng card;
`dock.mjs` chọn chỗ mỗi frame cuộn, chỉ đọc vị trí hai khe và đáy header.

### R9. Tìm xong về đầu lưới

Owner 2026-11-23: tìm xong (Enter, kính lúp, thêm ảnh) thì trang trượt tới đầu lưới, ở cả ba chỗ (khe đầu trang, nổi giữa lưới, khe CTA),
PC và phone. Đầu lưới nằm dưới đáy header một khoảng bằng lề trái, phải của lưới so với mép trang (`--masonry-outer`); header ẩn khi cuộn
xuống và hiện khi cuộn lên ([phone-header-scroll R2](phone-header-scroll.md#r2-header-đi-theo-quãng-cuộn)), nên cuộn xuống thì khoảng đó tính
từ mép trên màn hình. Trượt 600ms theo đường `--ease-card`, cùng lúc lưới xếp lại; chạm, lăn chuột hoặc bấm phím thì dừng; giảm chuyển động
thì nhảy ngay. Tìm lại đúng câu cũ (kết quả y hệt) cũng trượt (owner 2026-11-23). Không có kết quả thì đứng yên; trang chỉ trượt khi kết quả về,
không trượt lúc bấm. Ảnh về muộn sau khi khách đã cuộn thì thành nút "Có thêm kết quả gợi ý", bấm mới trượt ([Tìm kiếm R6](advertising-search.md#r6-chờ-dự-phòng-và-lỗi)).
Bấm chip trong kết quả hoặc bỏ tìm (Esc, nút xoá): chỉ trượt khi lưới mới ngắn hơn làm trang lùi về chỗ thấy CTA; còn lại đứng yên.

```gherkin
Given trang gốc ở 384px, cuộn tới tận cuối, thanh ở khe CTA
When tìm "hộp đèn"
Then trang trượt lên, đầu lưới cách đáy header 15px (lề của lưới), thanh nổi
```

## Kiểm tra

| R | Test |
| --- | --- |
| R1 đến R5, R7 đến R9 | `node tests/site/advertising-search.e2e.mjs` (bảng ở [Tìm kiếm](advertising-search.md#kiểm-tra)); R7, R8, R9 có test riêng `search-bar R7`, `search-bar R8`, `search-bar R9` |
| R6 | script audit chạy trên dev server; số và ảnh đính kèm PR |

## Chú thích thuật ngữ

- **Khe (dock)**: chỗ cố định trong trang nơi thanh dừng (đầu trang dưới hero, cuối lưới dưới tiêu đề CTA).
- **Tâm thị giác**: điểm mắt coi là giữa, cao hơn tâm hình học một chút.
