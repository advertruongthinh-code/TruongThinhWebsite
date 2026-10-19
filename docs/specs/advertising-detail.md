---
title: Detail Advertising
status: live
source:
  - src/site/advertising-products/suggestion-slideshow.mjs
tests:
  - tests/site/advertising-photo-layout.test.mjs
  - tests/site/advertising-full-span-p72.e2e.mjs
  - tests/site/advertising-primary-p14.e2e.mjs
  - tests/site/advertising-single-related.e2e.mjs
  - tests/site/advertising-suggestion-conditional.e2e.mjs
  - tests/site/advertising-suggestion-info.e2e.mjs
  - tests/site/advertising-suggestion-wave.e2e.mjs
  - tests/site/advertising-suggestion-layout.e2e.mjs
  - tests/site/advertising-suggestion-motion.e2e.mjs
  - tests/site/advertising-slideshow-p75.e2e.mjs
  - tests/site/advertising-return-p74.e2e.mjs
  - tests/site/related-scroll-device.mjs
notion: https://app.notion.com/p/3e6332849a0e81508d66ca0b3cfebf18
updated: 2026-10-19
---

# Detail Advertising

## Mục đích

Trang card `/<locale>/advertising-products/p/<id>/` ([SEO media R1](media-seo.md)) mở detail tại chỗ: primary (ảnh, nhóm,
mô tả, CTA), suggestion, related và viewer phóng to. Spec này sở hữu detail và history giữa masonry với detail. Masonry,
card, seed ở [masonry](advertising-masonry.md); skeleton chờ ảnh ở [loading glass](loading-glass-and-page-entry.md); Kính ở
[Kính](glass-surface.md); zoom chạm ở [viewer chạm](advertising-viewer-touch-zoom.md); header, menu, veil ở [shell](site-shell.md).

## Hành vi

### R1. URL và vào detail

URL detail là path `p/<id>` (id ổn định của card), tùy chọn `?tag=<tag-id>`; nhóm luôn là nhóm của ảnh
(`parseAdvertisingBrowseLocation`). `?photo=<id>` cũ vẫn mở và đổi sang path; id lạ thì về masonry; `tag` lạ thì bỏ;
khi mount, runtime ghi URL chuẩn bằng `replaceState`. Bấm card masonry ([masonry R8](advertising-masonry.md#r8-card-và-ảnh-trong-card))
hoặc card related gọi `openPhoto`: lưu entry hiện tại (masonry: nhóm, card, scroll) rồi push entry detail mới ở Y=0;
primary mở media đang active trên card. Bấm lại ảnh đang xem không làm gì. Tải thẳng hoặc F5 URL detail mở media cover.
Body có `is-advertising-photo`: masonry, hero, project index, CTA masonry, quy trình ẩn; gạch chân mục Advertising trên
navbar ẩn trừ khi hover, focus. Không clone ảnh, veil hay khóa cuộn ([loading glass R4](loading-glass-and-page-entry.md#r4-mở-ảnh-tại-chỗ)).

```gherkin
Given masonry /vi/advertising-products/ đang ở Y0
When bấm card kiosk-posm-07
Then URL là /vi/advertising-products/p/kiosk-posm-07/, history thêm đúng một entry, detail ở Y=0
And không có clone ảnh giữa card và primary
```

### R2. Hình học primary

`computeAdvertisingPhotoGeometry` (`layout-core.mjs`): primary rộng `min(3, N)` cột với `N` cột masonry (2 đến 4); số cột
không đổi theo chiều xoay. `split` khi `N = 4` hoặc viewport ngang (rộng hơn cao): vùng ảnh `span - 1` cột, info một cột,
cao bằng phần viewport dưới header thu gọn (R10) trừ gap và safe area; primary chưa chiếm hết cột thì trừ thêm `50px` để hàng related dưới
lộ 50px, chiếm hết cột (điện thoại ngang) thì related xếp dưới, không chừa 50px. `N <= 3` và viewport dọc là `pinterest`: ảnh trên, info dưới; info cao theo chữ, tối đa `28%` viewport trừ gap; vùng ảnh rộng
hết primary, cao `min(W/r, phần còn lại)`; cả khối vừa phần viewport dưới header, không chừa 50px. Ảnh `contain` trong vùng;
dư quá `0.5px` thì `data-advertising-photo-glass="true"`, nền là bản sao cover của ảnh dưới Kính. Không đủ một dòng mô tả
cùng nhóm, CTA, indicator thì primary cao thêm tối thiểu (`measureInfo`); người xem cuộn để đọc. Hình học không dựng được
thì ném `RangeError`. Chiều cao viewport lấy từ [shell R11](site-shell.md#r11-viewport-ổn-định-khi-thanh-địa-chỉ-đổi).

```gherkin
Given viewport 1569×912 (4 cột), 820×912 (3 cột) và 891×360 (3 cột, điện thoại ngang)
When mở cùng một ảnh ngang
Then 1569px: layout split, primary span 3, ảnh hai cột, primary chừa 50px ở đáy viewport
And 820px: layout pinterest, primary span 3, ảnh và info vừa phần dưới header, info không quá 28% viewport
And 891px: layout split, primary span 3, ảnh hai cột, info một cột cao bằng vùng ảnh, related xếp dưới primary
```

### R3. Info: nhóm, mô tả, CTA

Info (`role="region"`, `tabindex=0`) có nhãn nhóm VI/EN, mô tả căn trái và CTA; không có tiêu đề ảnh. Mô tả không có thanh cuộn
riêng: `paginateDescription` chia theo từ cho vừa pager, mỗi trang trọn dòng; indicator (aria-label "Trang mô tả n trên N" /
"Description page n of N") chỉ hiện khi nhiều trang. Từ 2 đến 5 trang, indicator là hàng chấm: mỗi trang một nút 24px chứa
chấm tròn 8px viền `ink`, trang đang xem tô `ink` và `aria-current="true"`; bấm chấm nhảy tới trang đó. Từ 6 trang, indicator
là chữ `n / N`. Lật trang bằng `ArrowLeft`/`ArrowRight`, wheel ngang (`|dx| > |dy|`,
`|dx| >= 18`) hoặc kéo ngang: quá 8px theo chiều ngang thì giữ pointer, thả khi lệch từ 36px. Input dọc luôn cuộn trang.
Resize, font tải xong tính lại trang và giữ trang đang đọc nếu còn. CTA `Trao đổi ý tưởng` / `Discuss an idea` mở Zalo tab
mới, nằm trong flow và cuộn theo trang; là CTA kinh doanh duy nhất của detail. Detail không có batch skeleton cuối và giữ
khoảng trên footer của site ([CTA giữa viewport R2](advertising-cta-center-parallax.md#r2-batch-skeleton-dưới-cta-co-giãn)).

```gherkin
Given detail có mô tả dài hơn pager, từ 2 đến 5 trang
When nhấn ArrowRight trong pager rồi wheel dọc trên mô tả
Then chấm thứ hai có aria-current="true"; wheel dọc cuộn trang, không đổi trang mô tả
And bấm chấm cuối hiện trang cuối
```

### R4. Media primary và nền

`renderPrimaryMedia` đổi ảnh tại chính khung primary: chưa giải mã sau 100ms thì mang skeleton rồi hiện qua Kính trong
`0.6s` như card; ảnh có sẵn cũng crossfade trong `0.6s` ([loading glass R4](loading-glass-and-page-entry.md#r4-mở-ảnh-tại-chỗ)). Nền vùng dư
là bản sao cover (video dùng poster), phóng `1.12`, ẩn khi không có vùng dư; Kính phủ đều đặt sau nền. Video tự phát, tắt
tiếng, có nút `Bật tiếng` / `Unmute`; nút `Xem lớn hơn` ẩn với video. Card nhiều media có hàng thumbnail
([media-card](media-card.md#r6-media-trong-primary)).

```gherkin
Given primary đang hiện ảnh A, ảnh B đã có trong cache
When bấm card related B
Then ảnh A crossfade sang B tại khung primary trong 0.6s, không skeleton
```

### R5. Suggestion

`selectAdvertisingSuggestions` chọn tối đa bốn tag nhóm `product`, `variant` hoặc `use` có ảnh, mỗi nhãn một nút: tag gắn
trên ảnh trước (sản phẩm đứng đầu), sau đó tag có ảnh cùng nhóm theo thứ tự băm `fnv1a32("<photo>:<tag>")`; tag đang chọn luôn có chỗ. Thứ tự cố định theo photo, không theo
locale; bật, tắt tag không đổi vị trí nút. Mỗi nút một dòng, nhãn VI/EN, `aria-pressed`; nút đang bật nền trắng, chữ và viền
đen, không ảnh. Bấm nút bật tag (bấm lại thì tắt) bằng `replaceTag`: `replaceState`, không thêm entry, giữ ảnh primary, đổi
related; focus về nút. Không có tag nào thì ẩn khối. Ở `split` khối nằm cuối info; ở `pinterest` là card đầu related
(`rank 0`, cùng solver). Resize qua hai layout chỉ chuyển cùng node, giữ focus và tag.

```gherkin
Given detail kiosk-posm-07 ở 1440×900 với bốn nút suggestion
When bấm nút "Trưng bày dùng thử" rồi resize xuống 820px
Then URL thêm tag=use-sampling bằng replaceState, history.length không đổi, nút có aria-pressed="true"
And sau resize khối suggestion là card đầu related, vẫn đúng một khối và nút vẫn bật
```

### R6. Slideshow suggestion

`suggestion-slideshow.mjs`: mỗi tag có một bộ tối đa 9 ảnh mang tag, xáo ngẫu nhiên một lần mỗi document
(`suggestionDeck`); ảnh đầu của nút là ảnh đầu bộ. Nhịp theo hero: mỗi ảnh giữ `5s` theo đồng hồ của nút (animation không keyframe; cả cụm khuất khỏi viewport thì mọi đồng hồ cùng dừng, nút lẻ khuất không dừng riêng để nút dưới màn hình điện thoại không lệch sóng), rồi nút chưa bật giải mã ảnh kế rồi đẩy ngang `0.9s` power3.inOut (ảnh mới trượt vào từ phải, ảnh cũ lùi `-35%` và tối về opacity `0.4`; owner chọn 10/10), ảnh không zoom (owner bỏ 10/10)
(`mountSuggestionSlides`); đồng hồ đầu chạy ngay khi mount, nút thứ i trễ `0.4s × i` nên cả cụm chuyển thành sóng; đồng hồ mới trừ phần trễ của poll `200ms` và decode nên sóng không trôi qua các vòng. Hover chuột hoặc focus bàn phím: nhãn chạy gạch chân dùng chung
rule với phụ đề portal (`style.css`), ảnh không zoom; nút đang bật không gạch chân. Bỏ lượt khi nút đang bật, tab ẩn, khối ẩn, cả cụm ngoài
viewport, body `motion-paused`, `dialog` đang mở (viewer, menu; giữ blur nền viewer tĩnh), reduced motion hoặc lượt trước
chưa xong; cụm ra viewport, ẩn tab hay mở `dialog` thì cú đẩy và zoom đang chạy dừng. Mọi bộ đều chạy; bộ một ảnh đẩy sang chính nó để vòng zoom lặp lại. Ảnh nền chưa giải mã xong thì nút chưa bật có vệt sáng của
[tải ảnh R6](media-delivery.md#r6-vệt-sáng-chờ-ảnh-tĩnh) phủ cả nút, nhãn vẫn đọc được. Đổi ảnh primary thì dọn slideshow cũ.

```gherkin
Given suggestion có nút chưa bật với bộ từ 2 ảnh và một nút đang bật
When chờ 5s
Then nút chưa bật đẩy ngang sang ảnh khác, nút dưới trễ 0.4s kể cả nút dưới mép màn hình điện thoại, ảnh không zoom
And hover nút chưa bật thì nhãn gạch chân, ảnh không zoom 1.15
And nút đang bật giữ nguyên ảnh
```

### R7. Related

`selectAdvertisingRelated`: không tag thì pool và thứ tự theo tầng điểm của [taxonomy R7](advertising-taxonomy.md#r7-related-có-thể-bạn-thích); có tag thì
card mang tag trong các tầng đó trước, rồi card mang tag còn lại theo thứ tự nhóm; pool rỗng thì related trống, không thông báo.
`compileAdvertisingRelatedLayout` xáo trong từng tầng theo seed của lượt duyệt và khóa `related:<photo>:<tag|all>:<tầng>`, xếp bằng
solver của [masonry](advertising-masonry.md#r6-đặt-card-và-chuyển-vị-trí) với các cột của primary đã chiếm sẵn: `split` thử đặt
card cạnh primary ở cột 4, hết nửa ngân sách thì xếp dưới primary. Card mount theo cửa sổ ảo (thêm một chiều cao viewport mỗi
phía), giữ card neo và card đang focus; Tab mount card kế. Lần xếp đầu, card đi từ đầu cột tới chỗ; đổi tag, resize chạy
chuyển vị trí `0.4s`. Card related của ảnh vừa rời mang "Vừa xem" / "Just viewed". Bấm card related lưu neo rồi mở detail
mới (R1, R8). Vào thẳng detail: script đầu `<body>` thêm `body.is-advertising-photo` khi URL là trang card hoặc có `?photo=`, nên Layout đầu trang bỏ qua hero và masonry; id không có trong catalog thì runtime bỏ class trước khi đo masonry. Sau đó chia sáu task để không task nào quá `50ms` trên A05s cũ: style chế độ ảnh cùng suggestion, primary với related rỗng, solver chạy thử trên vài card cho code nóng, phân trang mô tả, solver related đầy đủ, gắn card related có chuyển động; suggestion nằm trong related chỉ hiện khi solver đặt chỗ. Mở ảnh khác trong trang (bấm card grid hoặc related) đi cùng năm task sau, task đầu chỉ dựng primary (`showPhoto`). Bấm card grid: task của cú bấm chỉ ghi history, primary dựng ở task kế rồi hiện ở task sau nữa. Bấm card related: task của cú bấm chỉ lưu neo và chuyển focus khỏi related, entry history mới cùng primary ở task kế. Có `detail.scrollY` hoặc neo cần khôi phục thì primary và related một lượt như cũ.

```gherkin
Given detail ở 1569×912 có ít nhất một ảnh related
When related xếp xong
Then ảnh related đầu nằm ở cột 4, cùng top với primary, không chồng hay mất ảnh
```

### R8. Back, Forward và vị trí cuộn

Mỗi entry giữ state `advertisingBrowse`: nhóm, photo, tag, seed, `grid` và `detail` (`scrollY`, card neo, độ lệch neo, media,
bề rộng viewport). Masonry → A → B là ba entry; tag và nhóm dùng `replaceState`. Scroll ghi vào history tối đa mỗi `300ms`
(Chrome bỏ quá 200 lần ghi trong 10s) và khi `pagehide`; Y cuộn cuối của mỗi entry còn giữ trong bộ nhớ trang nên
Back, Forward ngay sau khi cuộn vẫn về đúng Y dù lượt ghi `300ms` chưa chạy. Back, Forward chỉ đổi query thì `motion.js` giao cho
`handlePopState`, đổi view tại chỗ không veil. Về detail: đặt lại media và `detail.scrollY`; bề rộng viewport đổi thì đặt theo
card related neo. Về masonry: đóng viewer, đánh dấu card vừa xem, khôi phục nhóm, media và `grid.scrollY` (bề rộng đổi thì theo
card neo), focus link card không cuộn. Không clone, không khóa cuộn, không thêm entry hay tham số media vào URL.

```gherkin
Given masonry ở Y0, mở A rồi cuộn detail tới Y1 khác Y0, mở B
When Back, Back, Forward
Then lần lượt về A ở Y1 với media cũ, về masonry ở Y0 lệch tối đa 1 CSS px với focus card A, rồi lại A ở Y1
And không frame nào vẽ ở Y của entry khác
```

### R9. Viewer

Nút `Xem lớn hơn` (vuông 48px, nhãn mở khi hover; màn cảm ứng thay bằng chạm ảnh, [viewer chạm R7](advertising-viewer-touch-zoom.md#r7-màn-cảm-ứng-chạm-ảnh-primary-để-mở)) mở `dialog#advertising-photo-dialog` bằng `showModal` sau khi khóa cuộn
logic (`createAdvertisingPhotoViewer`). Ảnh morph bằng transform từ khung primary tới vừa khung `300ms`, đóng ngược `250ms`,
`cubic-bezier(0.55, 0, 0, 1)`; nền viewer máy có chuột (`hover: hover`, `pointer: fine`) là lớp tối `0.85` cộng blur [Kính](glass-surface.md) `blur(50px) saturate(1.7) brightness(1.04)`;
điện thoại không blur ([gate phone Android](../decisions/phone-frame-budget.md)), lớp tối `0.9`, màu `rgba(32, 33, 32)` (owner 2026-10-10), hiện, tắt bằng opacity cùng nhịp; focus vào nút đóng. Nút đóng góc
trên trái; reset, `+`, `−` góc dưới phải, status phần trăm; nút tới giới hạn thì disabled. Wheel bước nấc zoom quanh con trỏ,
chặn cuộn trang; chuột giữa về vừa khung; Tab xoay vòng nút đang hiện; kéo, phím mũi tên (40px) pan, kẹp theo ảnh đã phóng. Đóng bằng nút, Escape (chỉ
đóng viewer, không rời detail), chạm hoặc click nền (vuốt bắt đầu từ nền không đóng), vuốt dọc ảnh ở fit trên màn cảm ứng, Back hoặc lỗi ảnh (tức thì); đóng thì mở khóa
cuộn, focus về nút mở (resize lúc mở đẩy nút khỏi màn hình thì cuộn tức thì cho nút về giữa). Đổi ảnh primary hay về
masonry thì đóng viewer. Pinch, xoay, chạm, nấc zoom liên tục: [viewer chạm](advertising-viewer-touch-zoom.md).

```gherkin
Given detail đã cuộn tới Y1
When bấm "Xem lớn hơn", wheel lên một nấc, nhấn Escape
Then viewer mở bằng morph, zoom quanh con trỏ, trang không cuộn
And Escape đóng viewer về khung primary, URL vẫn là detail, scroll là Y1, focus ở nút mở
```

### R10. Navbar và Escape trên detail

Click chính vào mục Advertising trên navbar hoặc tiêu đề menu khi đang ở detail gọi `navigateQuery(href, {reason: "navbar"})` (`motion.js`) → `returnToGrid`: push entry masonry nhóm khách chọn trên rail trước khi mở ảnh (`grid.category`), xóa photo, tag; ảnh vào thẳng về All (owner 2026-10-05). Còn ở A mở từ masonry thì A về độ lệch cũ; sang B cùng nhóm hoặc vào thẳng thì B ở giữa viewport, mang "Vừa xem"; B khác nhóm thì về A. Back vẫn về detail. Click có phím bổ trợ đi theo trình duyệt. Escape khi không viewer, menu: ảnh vào thẳng (`directPhotoRootId`) thì `escapeDirectPhoto` thay entry bằng masonry nhóm của ảnh, focus card đó; còn lại `history.back()`. All không photo: bấm lại navbar cuộn về 0 ([masonry R3](advertising-masonry.md#r3-filter)).
Detail không có hero nên header luôn ở dạng thu gọn của [shell R2](site-shell.md#r2-header-tone-thu-gọn-lockup-và-nav-desktop) (`is-collapsed`, nền trắng, viền) ở mọi `scrollY`; trước đây đầu detail dùng dạng trong suốt cao 103px ở 1440px, 73px ở 390px, thu gọn cao 81px và 71px (đo 2026-10-10). Mở detail từ masonry thì lockup FLIP như khi cuộn; đóng về masonry thì header theo `scrollY` của masonry. Ẩn, hiện theo chiều cuộn ([shell R3](site-shell.md#r3-header-ẩn-khi-cuộn-xuống-hiện-khi-cuộn-lên)) giữ nguyên; R2 tính phần dưới header theo cao dạng thu gọn.

```gherkin
Given masonry nhóm Kiosk & POSM mở A, A mở related B cùng nhóm
When bấm Advertising trên navbar
Then URL là ?category=kiosk-posm, rail sáng nhóm đó, history thêm một entry, card B ở giữa viewport mang "Vừa xem"

Given /vi/advertising-products/p/kiosk-posm-07/ vào thẳng ở 390×844, scrollY 0
When cuộn xuống 400px rồi cuộn ngược về 0, sau đó đóng detail về masonry ở scrollY 0
Then header luôn is-collapsed, nền trắng, cao 71px khi ở detail; về masonry thì bỏ is-collapsed
```

### R11. VI/EN

Đổi ngôn ngữ trên detail đi tại chỗ ([shell R5](site-shell.md#r5-đổi-ngôn-ngữ-và-ghi-nhớ)): sự kiện `languagechange` dựng lại
detail cùng photo, tag, entry, media đang xem; đổi nhãn nhóm, mô tả (về trang 1), nhãn suggestion, aria, alt viewer. Link
ngôn ngữ luôn trỏ trang card và `tag` hiện tại (`syncLocaleLinks`); seed theo [masonry R4](advertising-masonry.md#r4-thứ-tự-ngẫu-nhiên-theo-lượt-duyệt).

```gherkin
Given detail VI kiosk-posm-07 với tag use-sampling
When chuyển sang EN
Then URL là /en/advertising-products/p/kiosk-posm-07/?tag=use-sampling
And cùng ảnh primary và nút đang bật, chữ tiếng Anh, history.length không đổi
```

### R12. Reduced motion

`prefers-reduced-motion: reduce`: đổi ảnh primary tức thì, không Kính; related đổi vị trí tức thì; slideshow đứng yên, thanh
tải tĩnh; viewer mở, đóng, zoom tức thì nhưng nút, wheel, phím, pan vẫn dùng được. URL, history, scroll, focus như R1–R11.

```gherkin
Given trình duyệt bật reduced motion
When mở detail, bấm suggestion, mở rồi đóng viewer
Then không animation nào chạy; state, URL, scroll và focus giống khi có motion
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| DOM hook | `[data-advertising-photo-view]` với `data-advertising-photo-id`, `-photo-layout` (`split`/`pinterest`), `data-advertising-primary-span`, `-photo-glass`; body `is-advertising-photo`, `data-advertising-photo-active` | Runtime ghi (R1, R2); CSS, test đọc |
| DOM hook | `[data-advertising-photo-primary\|image\|video\|background\|audio-toggle\|expand\|info\|category\|description-pager\|description\|description-indicator\|cta]` | Markup `index.html`, runtime điền (R2–R4) |
| DOM hook | `[data-advertising-photo-suggestion]`, `[data-advertising-suggestion-tag]` (`aria-pressed`), `[data-advertising-suggestion-image-layer]`; `[data-advertising-photo-related-grid]`, `[data-advertising-related-card]` | Suggestion, slideshow, related (R5–R7) |
| DOM hook | `dialog#advertising-photo-dialog`, `data-advertising-viewer-state` (`opening`/`closing`) | Viewer (R9) |
| CSS var | `--advertising-photo-top`, `-primary-width\|height`, `-image-width\|height`, `-image-zone-width\|height`, `-description-width\|height`, `-internal-gap` | `layoutRelated` ghi, `detail.css` đọc (R2) |
| URL | `?category=&photo=&tag=` (`serializeAdvertisingBrowseLocation`) | URL chuẩn (R1) |
| Storage | history state `advertisingBrowse`: `category`, `photo`, `tag`, `seed`, `directPhotoRootId`, `grid`, `detail` | Theo entry (R8, R10) |
| Hàm public | `parseAdvertisingBrowseLocation`, `selectAdvertisingSuggestions`, `selectAdvertisingRelated`, `compileAdvertisingRelatedLayout`, `createAdvertisingBrowseHistoryController` (`catalog-runtime.mjs`); `computeAdvertisingPhotoGeometry` (`layout-core.mjs`) | Thuần, test unit gọi (R1, R2, R5, R7, R8) |
| Hàm public | `suggestionDeck(key, cards)`, `mountSuggestionSlides(root, {cards, createImage, isReduced, signal})` → cleanup | Slideshow (R6) |
| Hàm public | `createAdvertisingPhotoViewer` (`photo-viewer.mjs`): `close`, `setRecord`, `cleanup` | Viewer (R9) |
| Hàm public | `window.TruongThinhAdvertising.navigatePhoto`, `navigateQuery(href, {reason})`, `handlePopState`, `captureDetail`, `replaceTag` | `motion.js` gọi (R8, R10) |
| Event | `site:layout` (phát sau khi dựng detail), `languagechange`, `site:scroll` | Shell, R11, R6 |

Code detail nằm trong file của spec khác: `catalog-runtime.mjs`, `layout-core.mjs` ([masonry](advertising-masonry.md)), `photo-viewer.mjs`
([viewer chạm](advertising-viewer-touch-zoom.md)), `detail.css` ([trang con](detail-pages.md)), `motion.js` ([shell](site-shell.md)); sửa hành vi
detail ở đó thì cập nhật cả spec này.

## UI

[Primary](../../design-system/components/Primary/README.md), [Suggestion](../../design-system/components/Suggestion/README.md),
[Viewer](../../design-system/components/Viewer/README.md), [Vệt sáng](../../design-system/components/LoadSweep/README.md),
[Kính](../../design-system/components/Glass/README.md), [motion detail](../../design-system/motion.md#suggestion-và-detail).

## Kiểm tra

Unit `node --test <file>`; E2E cần `pnpm dev`, `BASE_URL`. `CASE=<tên>` chạy một ca của `advertising-photo-transitions.e2e.mjs`
(do [viewer chạm](advertising-viewer-touch-zoom.md) giữ).

| R | Test hoặc command |
| --- | --- |
| R1 | `advertising-products-lifecycle.test.mjs` (parse, URL chuẩn); `CASE=m02b-grid-detail-no-clone-no-jump`, `m02b-direct-reload-cover` |
| R2 | `advertising-photo-layout.test.mjs` (span, split, 28%, cao thêm); `advertising-full-span-p72.e2e.mjs`; `advertising-primary-p14.e2e.mjs`; `PHOTO_VIEW_P13_GEOMETRY_ONLY=1 node tests/site/advertising-photo-view.e2e.mjs` |
| R3 | `advertising-suggestion-info.e2e.mjs` (pager khi chữ 200%); `advertising-primary-p14.e2e.mjs` (CTA, chữ vừa) |
| R4 | `CASE=delayed-image-resize-latest-wins`; test của [loading glass](loading-glass-and-page-entry.md#kiểm-tra) |
| R5 | `advertising-suggestion-layout.e2e.mjs` (bốn chỗ); `advertising-suggestion-conditional.e2e.mjs` (split, pinterest, resize); `advertising-suggestion-info.e2e.mjs`; `CASE=related-suggestions-replace-state` |
| R6 | `advertising-slideshow-p75.e2e.mjs`; `advertising-suggestion-motion.e2e.mjs`; `advertising-suggestion-wave.e2e.mjs` (412×780, nút dưới mép màn hình); `advertising-products-random-order.test.mjs` (`mountSuggestionSlides`) |
| R7 | `advertising-products-random-order.test.mjs`, `advertising-products-static.test.mjs` (pool, seed); `advertising-one-column.test.mjs`; `advertising-single-related.e2e.mjs`; `CASE=related-selected-card-shuffle-cleanup`, `p13-position-stuffing-and-remount`, `related-tap-defers-related`; `pnpm qa:related-scroll` (giả lập và Android qua adb) |
| R8 | `advertising-products-lifecycle.test.mjs` (history controller); `CASE=m02b-entry-media-and-scroll-back-forward`, `m02b-related-history-just-viewed-and-scroll`, `history-entry-scroll-offscreen-morph`, `history-grid-scrollbar-resize`, `rapid-related-and-back-mid-morph` |
| R9 | `PHOTO_VIEW_CONTROLS_ONLY=1 node tests/site/advertising-photo-view.e2e.mjs` (gồm `viewer:resize-focus`); `CASE=viewer-control-affordances`, `viewer-backdrop-swipe-stays-open`, `viewer-morph-lock-handoff`, `morph-backdrop-lifecycle` |
| R10 | `advertising-products-lifecycle.test.mjs` (`returnToGrid`, `escapeDirectPhoto`); `CASE=navbar-keeps-picked-group node tests/site/advertising-photo-transitions.e2e.mjs`; `advertising-return-p74.e2e.mjs`; `advertising-photo-header.e2e.mjs` (header thu gọn, 390px và 1440px); `TT_E2E_P13_NAVBAR_ONLY=1 node tests/site/site.e2e.cjs` |
| R11 | `CASE=active-photo-locale-switch` |
| R12 | `advertising-primary-p14.e2e.mjs` (reduced motion); `advertising-slideshow-p75.e2e.mjs`; `advertising-suggestion-motion.e2e.mjs` |

## Gate còn mở

Gate thiết bị theo card [kiểm thiết bị](https://app.notion.com/p/3ef332849a0e8100bbd1e62ad5229067).

- Landscape VI `Y=2` trên emulator FAIL; phone Android thật `Y=0`, owner giữ FAIL kèm ghi chú. Replay 18/10 trên SM-A047F: L06 ngang 2/2 PASS, ca mobile
  PASS hết; 17 ca ép viewport desktop 1010 đến 1569px lên phone FAIL (chưa kết luận, cần đối chiếu Chromium PC), cùng [shell](site-shell.md#gate-còn-mở). Máy PC.
- Safari iPhone thật chưa kiểm detail, history, viewer (control trong safe area), slideshow; WebKit desktop không thay. Owner, máy PC.
- Owner chưa xem detail VI và EN trên máy mình: primary ở 920→1165px và ảnh dọc 954×910, suggestion, slideshow, related,
  Back, navbar. Owner.
- Hiệu năng (p95 `<= 100ms`, không task quá 50ms), SM-A047F 18/10, 2 vòng x 20 lượt chạm qua CDP (click Playwright làm GC rơi vào
  task mở): grid tới detail phản hồi đầu p95 `36` đến `44ms`, hiện p95 `104` đến `141ms`; related p95 `80` đến `95ms`; long task mọi
  lượt FAIL (dài nhất `161ms`, style và Layout đầu của detail). Vào lại detail 0 long task; slideshow kiosk-posm-16 60 đến 62,5fps. Desktop Chrome 1329×912 chưa đo. Main và máy PC.
- `advertising-photo-transitions.e2e.mjs` 19/10 trên PC (`PHOTO_TRANSITIONS_ENGINE=webkit`): WebKit 31/32, L06 cần CDP chỉ Chromium.
  Chromium 30/32: `m02b-grid-detail-no-clone-no-jump`, `p13-position-stuffing-and-remount` flaky (chạy riêng PASS). Main xử lý.
- `advertising-photo-view.e2e.mjs` chạy đủ Chromium trong CI (sáu bộ `adv-view-*`, 122 ca xanh trên cloud 2026-10-14);
  Firefox 12/12 và WebKit 12/12 PASS trên PC 18/10 (bộ mặc định 390×844 và 1440×900).

## Chú thích thuật ngữ

- **Split, pinterest**: hai layout primary; split chia ảnh và info theo cột, pinterest xếp info dưới ảnh.
- **Info**: cột hoặc dải chữ của primary gồm nhóm, mô tả, CTA, có thể có suggestion.
- **Pager**: vùng mô tả chia trang thay cho thanh cuộn riêng.
- **Entry**: một mục trong history của trình duyệt, giữ state và vị trí cuộn riêng.
- **Neo**: card dùng để đặt lại vị trí cuộn khi bề rộng viewport đổi.
- **Cửa sổ ảo**: chỉ mount card related gần vùng nhìn thấy.
