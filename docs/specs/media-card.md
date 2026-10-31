---
title: Card nhiều media
status: live
source: []
tests:
  - tests/site/site-media-card-contract.test.mjs
  - tests/site/site-media-card-m01b.e2e.mjs
  - tests/site/site-media-card-r6.e2e.mjs
  - tests/site/site-media-card-m02a.e2e.mjs
  - tests/site/site-media-card-autoplay.e2e.mjs
  - tests/site/site-media-card-playback.e2e.mjs
  - tests/site/strip-swipe-audit.test.mjs
notion: https://app.notion.com/p/3ef332849a0e81978563c89bcb5d1ffc
updated: 2026-10-31
---

# Card nhiều media

## Mục đích

Một card sản phẩm có thể mang nhiều ảnh và video: người xem đổi media ngay trên card, mở detail đúng media đang xem
và đổi tiếp ở primary. Runtime đã có trên masonry và related Advertising, nhưng catalog 285 card (tính từ catalog) hiện chỉ có một ảnh
mỗi card. Các họ card ngoài Advertising đang tạm dừng (Gate còn mở). Code nằm trong
file của [masonry](advertising-masonry.md) và [detail](advertising-detail.md) nên spec này không sở hữu file nào.

## Hành vi

### R1. Dữ liệu media của card

Card có `mediaItems` (thứ tự hiển thị) và `coverMediaId`; thiếu `coverMediaId` thì cover là item đầu.
`validateAdvertisingCardMedia` (`media-contract.mjs`) chạy cho mọi card khi `catalog.mjs` nạp và từ chối card sai: danh
sách rỗng, cover không có trong danh sách, trùng `id`, `kind` khác `image`/`video`, thiếu `src` hoặc `sourceId`, thiếu
`altVi`/`altEn` hoặc `source`, `sha256`, `provenance`. `width`, `height` là số nguyên dương an toàn và mọi item cùng một
tỷ lệ chính xác (so bằng BigInt, không sai số). Video cần thêm `posterSrc`, `posterWidth`/`posterHeight` cùng tỷ lệ,
`durationSeconds` và `hasAudio` boolean; `cardSrc` (tùy chọn) là đường dẫn bản cho card. Ảnh legacy `record.media` được hiện làm cover (cùng `src`) thì cũng phải cùng
tỷ lệ; không hiện thì giữ được tỷ lệ khác. Validator chỉ kiểm metadata, không kiểm byte file; khi chuẩn bị asset, đối
chiếu kích thước thật bằng `ffprobe` (video) và giải mã ảnh (poster). `media-manifest.mjs` hiện cho mỗi card đúng một
item ảnh, `id` bằng id card.

```gherkin
Given card có hai item: ảnh 1536×1024 và video 1920×1080
When catalog.mjs nạp
Then validateAdvertisingCardMedia ném lỗi "ratio must match the card", không crop, không làm tròn
```

### R2. Canvas và dải điều khiển

Canvas card lấy tỷ lệ của item cover (`layoutMedia`, `layout-core.mjs`), kể cả khi cover là video. Card từ hai item có
thêm dải điều khiển cao 44px dưới canvas (`mediaControlStripHeight`), tính ngay trong lần xếp đầu ở masonry và related;
dải không phủ ảnh. Card một item không có dải, không chỉ báo; item đó là video hoặc ảnh khác `record.media` thì card hiện
đúng item đó. Nhãn thời lượng video ở góc trên trái canvas. Đổi media, tải chậm hay lỗi không
đổi khung card, canvas hay dải (lệch tối đa 1px). Card một ảnh hiện tại giữ hình học và thứ tự của
[masonry R5](advertising-masonry.md#r5-hình-học-masonry).

```gherkin
Given card nhiều media, cover 16:9, cột rộng 172.5px ở viewport 390px
When masonry xếp lần đầu
Then canvas 172.5×97.03px, card cao thêm 44px cho dải chấm dưới canvas
And chuyển sang video chậm tải thì khung card, canvas, dải lệch tối đa 1px
```

### R3. Đổi media trên card

2–5 item: một hàng chấm trong dải (UI chấm của [Gallery](../../design-system/components/Gallery/README.md)), mỗi chấm là nút 20×44px tên "Xem media i trên N" / "Show media i of N", chấm đang
xem có `aria-current="true"`; nhóm có nhãn "Media của thẻ" / "Card media". Từ 6 item: dải chỉ có bộ đếm `i/N`
giữa dải, đúng chỗ hàng chấm (`role="status"`, `aria-live="polite"`), không nút trong dải. Chấm hoặc bộ đếm nằm trong một pill
giữa dải cùng dáng nhãn thời lượng (cao 24px, bo 8px), màu than `rgba(32,33,32,0.9)` như bộ đếm "2/8" của Pinterest; chấm
đảo màu (thường trắng 40%, đang xem trắng), bộ đếm chữ trắng 12px 500. Đổi media bằng mũi tên hover hoặc vuốt. Vuốt ngang trên card (`|dx|` từ 40px và lớn hơn `|dy|`, pointer event, `touch-action:
pan-y`) đổi một item, dừng ở hai đầu, rồi chặn click chuột, chạm trong 400ms để không mở detail; click bàn phím không
bị chặn. Vuốt kéo dải theo ngón tay: hướng chốt khi ngón đi quá 10px (ngang nếu `|dx| > |dy|`),
dải dịch đúng `dx`; nhấc tay khi đã kéo quá nửa canvas hoặc vận tốc từ 0.5px/ms thì trượt nốt sang item kế, còn lại bật
về; ở hai đầu dải chỉ đi 1/3 quãng ngón tay rồi bật về. Mọi lần kéo ngang đều chặn click như trên. Chuột thật hover card thì hiện mũi tên "Media trước" / "Media tiếp" như grid Pinterest: vùng bấm 32px cao hết canvas
ở hai mép, chevron trắng nét mảnh cao gần hết ô 16px không nền, ẩn ở hai đầu; cảm ứng không có mũi tên
ở bất kỳ đâu, chỉ vuốt. Card không zoom media khi hover. Hover theo Pinterest, chỉ
chuột thật, mọi card masonry và related kể cả card một media: lớp đen 30% phủ canvas hiện dần, rời chuột thì mờ dần, nhịp
hover của site; card đang mang "Vừa xem" thì nhãn đó mờ dần đi cùng nhịp lúc hover và hiện lại khi rời chuột. Video
vẫn chạy dưới lớp tối; mũi tên, chấm, nhãn thời lượng nằm trên lớp tối. Đổi media bằng mũi tên, chấm hoặc vuốt là dải
liền trượt ngang: media mới vào từ mép canvas phía đi tới, media cũ ra hết mép bên kia, hai media dính
nhau, không fade, không lùi, cắt gọn ở BBox canvas; thời lượng, easing như nút "Có thể bạn thích"
([motion Suggestion](../../design-system/motion.md#suggestion-và-detail), 0.9s power3.inOut); không frame nào lộ nền
giữa hai media hay chớp. Bấm "<" thì ngược chiều; chấm, bộ đếm đổi ngay lúc bắt đầu trượt; reduced motion đổi ngay. Nút và vuốt chỉ đổi media; bấm thân card mở detail ở media đang xem
([detail R1](advertising-detail.md#r1-url-và-vào-detail)). Card rời cửa sổ ảo hóa rồi quay lại vẫn ở media đã chọn.

Không có pointermove: dịch ngang từ 10px vẫn đổi media; tap và cuộn dọc không đổi.

```gherkin
Given card 11 media ở /en/advertising-products/, viewport 1440px
When bấm "Next media" hai lần
Then bộ đếm là "3/11", URL không đổi, detail không mở
And vuốt trái trên ảnh đổi sang 4/11, click ngay sau vuốt không mở detail
```

```gherkin
Given card 3 media đang ở item 1, chuột thật
When hover card rồi bấm "Media tiếp"
Then lớp tối 30% hiện dần, item 2 vào từ mép phải canvas, item 1 ra hết mép trái, opacity cả hai luôn là 1
And ở mọi frame hai media phủ kín canvas, không lộ nền
And rời chuột thì lớp tối mờ dần; card mang "Vừa xem" thì nhãn mờ đi khi hover, hiện lại khi rời chuột

Given card 3 media trên cảm ứng
When kéo ngang 30% canvas rồi nhấc tay chậm
Then dải theo ngón tay rồi bật về item cũ; kéo quá nửa canvas thì trượt nốt sang item kế
```

### R4. Video trên card

Layer video tạo khi item thành active: `muted`, `playsInline`, `preload="auto"`, có `poster`, nhãn bằng alt của item. Item có
`hlsSrc` thì layer phát thang chất lượng bằng hls.js, chặn ở bậc 480 vì card hiện tối đa khoảng 440px CSS
([video-delivery R3](video-delivery.md#r3-runtime-chọn-nguồn)); không có Media Source hoặc thiếu `hlsSrc` thì dùng
`cardSrc` khi có: file bậc 480 của thang ([video-delivery R1](video-delivery.md#r1-thang-chất-lượng-cho-mỗi-video)),
H.264 4:2:0, layer luôn tắt tiếng; detail và viewer dùng `hlsSrc` từ bậc đầu hoặc `src`. Card vào DOM
khi còn cách màn hình một viewport (ảo hóa), nên video tải và giải mã sẵn trước khi tới lượt phát (đo PC: video
khởi động giữa lúc cuộn làm một Commit 82ms). Lướt quá 3000px/s (kéo thanh cuộn, chuột giữa) thì card video chỉ có poster, gắn nguồn khi cuộn chậm lại, mỗi frame một card.
Card video theo Pinterest: không nút phát, không icon loa; nhãn tổng thời lượng `m:ss` làm tròn lên,
không đếm ngược. Luôn tắt tiếng. Masonry: mọi card có item video đang active và hiện quá 1/2 chiều cao trong phần nhìn thấy dưới navbar đều phát cùng lúc; tính lại mỗi frame khi đang cuộn, không chờ cuộn dừng; mỗi frame khởi động tối đa một video, video chờ lượt khởi động ở frame sau; còn từ 1/2 trở xuống thì dừng, quay lại thì phát tiếp từ chỗ dừng. Chuột vào card không làm card phát. Mỗi card chạy playlist video của nó
theo thứ tự `mediaItems` (thứ tự do CMS định): hết video thì đẩy sang video kế như R3, chấm hoặc bộ đếm theo, hết vòng về
video đầu; ảnh không vào playlist; card một video lặp chính nó. Card đang đứng ở ảnh không tự phát, không tự trượt. Related trong detail tự phát như masonry, chuột vào hay rời card không đổi lịch phát. Touch tự phát như desktop ở masonry và related; chạm card mở detail như ảnh. Reduced motion không tự phát; chuột vào card thì phát (mặc định Thread giữ để người dùng reduced motion vẫn xem được). Đổi item hoặc
card rời cửa sổ ảo hóa thì video tạm dừng.

```gherkin
Given ba card video cùng hiện quá 1/2 chiều cao trên masonry
When cuộn tới khi một card chỉ còn hiện 40% chiều cao
Then hai card kia vẫn phát tắt tiếng, card còn 40% dừng, không card nào có nút phát
And rê chuột vào card đang đứng ở ảnh không làm card phát; trong detail, card related video hiện quá 1/2 cũng tự phát, rời chuột không dừng
And card có video 1, ảnh, video 2 phát xong video 1 thì đẩy sang video 2, xong video 2 thì về video 1
```

### R5. Chờ tải và lỗi media

Item active chưa sẵn sàng thì card có status ẩn "Đang tải media" / "Loading media" và skeleton trong khung
([loading glass R5](loading-glass-and-page-entry.md#r5-skeleton-thay-vòng-xoay)). Ảnh phụ tải lazy theo biến thể
([tải ảnh R3](media-delivery.md#r3-runtime-advertising-chọn-biến-thể)). Ảnh lỗi: card về ảnh vừa sẵn sàng gần nhất, rồi
ảnh cover, rồi ảnh đầu chưa lỗi. Video lỗi: thử poster; poster tải được thì hiện poster, lịch phát bỏ qua card đó, dải vẫn dùng được;
poster cũng lỗi thì về ảnh như trên. Lỗi cũ không đè lựa chọn mới hơn, không gọi lại vô hạn.

Không còn media nào hiện được (mọi ảnh lỗi; card chỉ có video mà video và poster cùng lỗi): skeleton gỡ, hiện dấu báo
lỗi dùng chung cho mọi media trên site: khung giữ đúng tỷ lệ, nền xám nhạt tĩnh, không gradient;
giữa khung icon ảnh hỏng nét mảnh 24px màu xám và dòng chữ nhỏ "Không tải được" / "Couldn't load"; không nút thử lại
(tải lại trang là thử lại). Card ẩn mũi tên, chấm, bộ đếm, vẫn bấm vào detail, lịch phát bỏ qua; status ẩn đọc
"Không tải được media" / "Couldn't load media". Primary detail: media đang chọn không hiện được (ảnh lỗi, video và
poster cùng lỗi) thì khung hiện cùng dấu đó, nền blur tắt; thumbnail và mũi tên vẫn đổi được sang media khác.

```gherkin
Given card ba media, item 2 là ảnh trả 404
When chọn item 2
Then card về item 1 đã tải, chấm 1 có aria-current, không vòng lặp tải lại

Given card chỉ có một video, video và poster đều trả 404
When card vào màn hình
Then skeleton gỡ, khung hiện icon ảnh hỏng và chữ "Không tải được", không còn gradient chạy
```

### R6. Media trong primary

Mở từ card (masonry hoặc related), primary bắt đầu ở media đang xem của card, video phát tiếp từ đúng giây card đang
phát; vào thẳng hoặc reload trang card `p/<id>` bắt đầu ở cover; Back, Forward khôi phục media của entry, Back về masonry
từ detail của chính card đó thì card đứng ở media vừa xem trong detail, video ở đúng giây; đổi ngôn ngữ giữ media và
giây đang xem. URL không có tham số media. Card có hơn một item,
hoặc item khác ảnh legacy, có nhóm thumbnail "Media sản phẩm" / "Product media" cạnh mô tả: mỗi nút tên "Xem ảnh|video
i trên N: <alt>", thumbnail 60px góc vuông, đang xem `aria-current` có viền đôi, video có biểu tượng phát; dãy một dòng chỉ hiện thumbnail nguyên, thừa thì cuộn ngang, thumbnail cuối trong khung mờ về trắng (đã cuộn thì thumbnail đầu cũng mờ), đổi media thì dãy tự cuộn đưa thumbnail đang xem ra giữa. Khung media
theo dải trượt của pin Pinterest nhiều media: khung giữ tỷ lệ cover nên đổi media không đổi kích thước
primary và related đứng yên; mỗi media vừa khung (contain), vùng dư là nền zoom blur, kể cả video. Bấm thumbnail, mũi
tên vuông trắng 36px góc vuông, chevron nét mảnh 16px, cách mép 16px hiện khi trỏ vào khung (ẩn ở đầu, cuối), vuốt ngang trên cảm ứng hoặc phím trái, phải khi focus trong
khung đổi media: dải liền như card (R3), cắt ở BBox media (khung contain chung của mọi item, không tính vùng dư); vuốt kéo
dải theo ngón tay như R3. Nền zoom blur phản ánh realtime vùng media: dải trượt thì nền vẽ lại mỗi frame màn hình, video
phát thì mỗi frame video (`requestVideoFrameCallback`), từ chính những gì đang trong BBox; viewer mở thì nền đứng yên dưới backdrop; không crossfade (reduced motion đổi ngay). Nền không vignette:
mép khung đặc như giữa, không lộ nền xám. Khung media không có hàng chấm; bấm
thumbnail thì trượt thẳng tới media đó, chiều theo vị trí thumbnail, không đi qua media ở giữa.
Video không phát trong lúc dải chạy: trên dải là hình đứng của video. Tiếng chỉ fade khi video chuyển phát và dừng,
cùng thời lượng và easing của nhịp dải: video đang phát thì tiếng nhỏ dần về 0 rồi dừng khi dải bắt đầu, video đích phát
từ đầu khi dải dừng và tiếng to dần tới mức người xem; vuốt bỏ dở thì video phát lại và tiếng to dần; người xem chỉnh tiếng trong lúc fade thì người xem thắng ([player R11](primary-video-player.md#r11-tiếng-người-xem-thắng-fade)).
Giữ lựa chọn tiếng của card. Đổi media ghi vào entry hiện tại, không thêm entry.
Video primary tự phát tắt tiếng, lặp riêng nó (không chạy playlist như card), `playsinline`, không `controls` gốc: bấm video
phát/dừng. Thanh player (một hàng, giờ, thanh tua, nút tiếng, lúc hiện và ẩn, bố cục cảm ứng, kéo tua, bóng, núm) theo
[player video primary](primary-video-player.md). Thanh âm lượng đứng dọc 104px phía trên
nút tiếng để không nhầm với thanh tua, mở khi trỏ chuột hoặc focus bàn phím vào cụm tiếng, kéo chuột xong rời đi thì
thu lại; kéo về 0 là tắt tiếng nhưng giữ mức cũ. Không có nút toàn màn hình: nút mở lớn mở cả video vào
viewer nền blur ([player R8](primary-video-player.md#r8-mở-lớn-video-trong-viewer)). Nút "Bật tiếng" / "Unmute" và
"Tắt tiếng" / "Mute" cùng thanh âm lượng ẩn khi `hasAudio` false, bật tiếng mà volume 0 thì đặt 1. Nút mở lớn hiện
cả với video. Đóng detail tạm dừng video; rời route thì dừng và gỡ nguồn. Hình học và đổi ảnh primary theo
[detail R4](advertising-detail.md#r4-media-primary-và-nền); Back, Forward theo
[detail R8](advertising-detail.md#r8-back-forward-và-vị-trí-cuộn).

```gherkin
Given card grid EN đang ở item video có tiếng
When bấm thân card
Then primary phát video đó tắt tiếng, thumbnail video có aria-current, nút "Unmute" hiện
And tải lại URL thì primary bắt đầu ở cover
```

```gherkin
Given primary đang phát video có tiếng trên desktop
When trỏ vào nút tiếng rồi kéo thanh âm lượng dọc tới 0.4
Then video bật tiếng ở volume 0.4
And kéo về 0 thì tắt tiếng, bấm nút tiếng thì về lại 0.4
```

```gherkin
Given primary card nhiều media đang ở video cuối dải
When bấm mũi tên trước
Then ảnh trượt vào khung cũ, thumbnail đầu có aria-current, related không đổi vị trí
And phím phải đưa video về khung và phát lại
And bấm thumbnail thứ ba khi đang ở media đầu thì media 3 trượt vào từ phải, media 2 không xuất hiện
And trong lúc trượt nền blur vẽ lại theo dải từng frame, không có lớp nền nào đổi opacity
```

```gherkin
Given primary đang phát video có tiếng ở volume 1, media kế là ảnh
When bấm mũi tên sau
Then video đứng hình trên dải, tiếng giảm dần về 0 theo nhịp dải rồi video dừng
And bấm mũi tên trước thì video đích đứng yên trong lúc dải chạy, phát từ đầu khi dải dừng, tiếng tăng dần tới 1
And trong lúc video phát, nền blur đổi theo frame video
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Data | `mediaItems[]`: `id`, `kind`, `src`, `sourceId`, `width`, `height`, `altVi`, `altEn`, `source`, `sha256`, `provenance`; video thêm `posterSrc`, `posterWidth`, `posterHeight`, `durationSeconds`, `hasAudio`, tùy chọn `cardSrc`, `hlsSrc` | R1, R4 |
| Data | `coverMediaId` | Cover và tỷ lệ canvas (R1, R2) |
| Hàm | `validateAdvertisingCardMedia`, `validateAdvertisingMediaPool` (`media-contract.mjs`) | Chặn dữ liệu sai khi catalog nạp |
| Hàm | `mediaControlStripHeight`, `layoutMedia` (`layout-core.mjs`) | Dải 44px, tỷ lệ cover |
| Hàm | `createPhotoCard`, `renderPrimaryMedia`, `renderPrimaryThumbs` (`catalog-runtime.mjs`) | R3–R6 |
| Attribute | `data-advertising-active-media-id` trên card và `[data-advertising-photo-view]` | Media đang xem; click card đọc để mở detail |
| Attribute | `data-advertising-media-select`, `-prev`, `-next`, `-count`, `-duration`, `-loading`, `-item` | Hook test và control card |
| Attribute | `data-advertising-photo-media-select`, `data-advertising-photo-audio-toggle`, `data-advertising-photo-video`, `data-advertising-photo-player\|play-surface\|play\|progress\|volume\|volume-group\|time-current\|time-total`, `data-advertising-photo-media-step` | Thumbnail, nút tiếng, video primary, player, mũi tên |
| History | `grid.mediaId`, `detail.mediaId` trong state history | Khôi phục media theo entry (R6) |

## UI

[MediaCard](../../design-system/components/MediaCard/README.md) (dải, chấm, bộ đếm, nhãn thời lượng),
[ảnh trong card](../../design-system/motion.md#ảnh-trong-card), [ảnh Advertising](../../design-system/advertising-images.md).

## Kiểm tra

Unit `node --test <file>`; E2E cần `pnpm dev`, `BASE_URL`. Fixture card nhiều media là synthetic, chèn trong test.

| R | Test hoặc command |
| --- | --- |
| R1 | `site-media-card-contract.test.mjs` (11 ca); `advertising-products-layout.test.mjs` |
| R2 | `advertising-products-layout.test.mjs` (dải 44px); `site-media-card-r6.e2e.mjs` (rect ổn định, singleton không dải) |
| R3 | `strip-swipe-audit.test.mjs` (vuốt ngắn không `pointermove` đổi đúng một item); `site-media-card-m01b.e2e.mjs` (vuốt theo ngón tay, bật về, chặn click, chấm, bộ đếm, mũi tên hover, lớp tối, "Vừa xem" khi hover, dải liền không fade không lộ nền); `site-media-card-r6.e2e.mjs` (pointer thật ở mép nút) |
| R4 | `site-media-card-m01b.e2e.mjs` (cover video tắt tiếng có poster, không nút phát); `site-media-card-autoplay.e2e.mjs` (mọi card hiện quá 1/2 phát, tính lại khi cuộn, khởi động lần lượt nên chờ đủ video, playlist lặp, related tự phát như masonry, reduced motion) |
| R5 | `site-media-card-m01b.e2e.mjs` (chuỗi fallback, lỗi cũ, mọi asset lỗi) |
| R6 | `site-media-card-autoplay.e2e.mjs` (media và giây video qua card, detail, Back, đổi ngôn ngữ); `site-media-card-m02a.e2e.mjs` (cover khi vào thẳng, media active, thumbnail, tiếng, player: phát/dừng, dải hiện khi hover hoặc dừng, tua, thời gian, âm lượng dọc, cảm ứng, unmount, dải media giữ khung và related, mũi tên, phím, thumbnail trượt thẳng, không chấm, nền blur realtime theo dải và video (mỗi frame video một lượt vẽ, đứng yên dưới viewer), nền không vignette, video đứng yên trong dải và tiếng fade lúc phát, dừng, người xem thắng fade, mở lớn video trong viewer) |
| Họ card | `site-media-card-playback.e2e.mjs`: baseline theo họ card (cần `SITE_MEDIA_OUTPUT_DIR`, `SITE_MEDIA_EXPECTED_HEAD`) |

## Gate còn mở

Gate thiết bị theo card [kiểm thiết bị](https://app.notion.com/p/3ef332849a0e8100bbd1e62ad5229067).

- Không chặn phát hành. Gộp ảnh thành card nhiều media làm đợt khác, khi toàn bộ media đã chuẩn: AI đề xuất nhóm, owner audit tay từng nhóm, không luật gộp tự động. Chưa có
  clip thật, chất lượng hay ngân sách byte. Owner.
- Phạm vi là mọi họ media-card VI/EN: Home project reel (rail mobile), item gallery Residential,
  Commercial, và portal, process, duo nào có identity sản phẩm hoặc công trình và đích detail. Đề xuất giữ nguyên About
  timeline, commitments, logo marquee, heritage montage. Họ hẹp hơn dải 44px thì kiểm riêng trước khi chọn fallback.
  Chưa có code ngoài Advertising. Owner xác nhận ranh giới; Thread code khi mở lại.
- Lịch phát (R4): giải mã nhiều video một lúc có thể làm giật khi cuộn trên A04s, đo lại trên máy thật.
- Player primary (R6) trên cảm ứng: dải nút luôn hiện, thanh âm lượng chỉ mở khi focus cụm tiếng là mặc định Thread chọn,
  chưa đo Pinterest mobile. Owner.
- Tiếng fade lúc phát, dừng (R6) dùng `volume`; theo tài liệu Safari của Apple, iOS không cho JavaScript đổi `volume`, nên trên
  iPhone tiếng có thể bật, tắt ngay. Chưa kiểm thiết bị iOS. Owner.
- Phân loại: tag nằm trên card ([taxonomy R1](advertising-taxonomy.md#r1-ba-tầng-phân-loại)), media chỉ có `kind`; chưa có
  tag hay vai trò (góc chụp, chi tiết) theo từng media. Owner quyết khi có ảnh nhiều góc thật.
- Vùng tải trước đã duyệt: rộng hơn viewport, chuẩn bị poster và metadata trước, không cố tải cả file. Code chỉ tạo video
  khi item thành active với `preload="auto"` (R4). Ngân sách byte, lề preload, buffer chưa khóa, cần clip thật và trace
  thiết bị.
- Không lưu GIF public; định dạng và thang chất lượng theo [video-delivery R1](video-delivery.md#r1-thang-chất-lượng-cho-mỗi-video). Chưa có clip thật.
- Giây video chỉ chuyển trong phiên (card sang detail, Back về masonry, đổi ngôn ngữ), không ghi vào history state:
  Forward về detail và reload bắt đầu lại từ đầu video. Không tự bật lại âm thanh.
- Ngưỡng vuốt (10px chốt hướng,
  nửa canvas, 0.5px/ms, 1/3 ở hai đầu) là mặc định Thread chọn. Owner.
- Chấm 8px theo UI chấm Gallery, test `site-media-card-r6.e2e.mjs:211` đo 8px; khe nhìn thấy 12px thay vì 8px
  của Gallery để giữ vùng bấm 20×44px.
- Dấu báo lỗi (R5) mới áp cho card và primary Advertising; media khác trên site (ảnh trong trang, hero, CTA, portal)
  dùng lại đúng dấu này ở thread riêng.
- Clip fixture của `m01b`, `m02a`, `r6` là AV1 + Opus trong MP4 vì Chromium của Playwright (CI, cloud) không giải mã
  H.264/AAC; WebKit chỉ phát AV1 trên phần cứng mới nên chạy tay WebKit có thể đỏ ca video. Nhánh H.264 của video
  thật chưa có test trên trình duyệt có H.264; `site-media-card-playback.e2e.mjs` chưa có kết quả trong tree. Máy PC.
- Android thật, iPhone Safari, owner xem trên demo, full suite chưa chạy cho card nhiều media. Owner, máy PC.

## Chú thích thuật ngữ

- **Media-card**: card có identity, một hoặc nhiều media và đích detail.
- **Cover**: item `coverMediaId` chọn làm mặt trước và tỷ lệ canvas của card.
- **Canvas**: vùng media giữ tỷ lệ cover, không gồm dải điều khiển.
- **Dải điều khiển**: hàng 44px dưới canvas chứa chấm hoặc bộ đếm.
- **Fixture synthetic**: dữ liệu và file giả chèn trong test, không phải media thật.
- **Số nguyên an toàn**: số nguyên JavaScript biểu diễn chính xác (`Number.isSafeInteger`).
- **Scroll settle**: lúc cuộn đã dừng đủ lâu để tính lại ứng viên.
