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
  - tests/site/advertising-suggestion-layout.e2e.mjs
  - tests/site/advertising-suggestion-motion.e2e.mjs
  - tests/site/advertising-slideshow-p75.e2e.mjs
  - tests/site/advertising-return-p74.e2e.mjs
  - tests/site/related-scroll-device.mjs
notion: https://app.notion.com/p/3e6332849a0e81508d66ca0b3cfebf18
updated: 2026-10-05
---

# Detail Advertising

## Mục đích

Query `?photo=<id>` trên `/vi/advertising-products/` và `/en/advertising-products/` mở detail tại chỗ: primary (ảnh, nhóm,
mô tả, CTA), suggestion, related và viewer phóng to. Spec này sở hữu detail và history giữa masonry với detail. Masonry,
card, seed ở [masonry](advertising-masonry.md); skeleton chờ ảnh ở [loading glass](loading-glass-and-page-entry.md); Kính ở
[Kính](glass-surface.md); zoom chạm ở [viewer chạm](advertising-viewer-touch-zoom.md); header, menu, veil ở [shell](site-shell.md).

## Hành vi

### R1. URL và vào detail

URL detail là route Advertising với `photo=<id>` (id ổn định của card), tùy chọn `tag=<tag-id>`; `category` luôn là nhóm
của ảnh (`parseAdvertisingBrowseLocation`). `photo` lạ thì về masonry; `tag` không có trong registry thì bỏ, giữ photo;
khi mount, runtime ghi URL chuẩn bằng `replaceState`. Bấm card masonry ([masonry R8](advertising-masonry.md#r8-card-và-ảnh-trong-card))
hoặc card related gọi `openPhoto`: lưu entry hiện tại (masonry: nhóm, card, scroll) rồi push entry detail mới ở Y=0;
primary mở media đang active trên card. Bấm lại ảnh đang xem không làm gì. Tải thẳng hoặc F5 URL detail mở media cover.
Body có `is-advertising-photo`: masonry, hero, project index, CTA masonry, quy trình ẩn; gạch chân mục Advertising trên
navbar ẩn trừ khi hover, focus. Không clone ảnh, veil hay khóa cuộn ([loading glass R4](loading-glass-and-page-entry.md#r4-mở-ảnh-tại-chỗ)).

```gherkin
Given masonry /vi/advertising-products/ đang ở Y0
When bấm card kiosk-posm-07
Then URL là ?category=kiosk-posm&photo=kiosk-posm-07, history thêm đúng một entry, detail ở Y=0
And không có clone ảnh giữa card và primary
```

### R2. Hình học primary

`computeAdvertisingPhotoGeometry` (`layout-core.mjs`): primary rộng `min(3, N)` cột với `N` cột masonry (2 đến 4). `N = 4`
là `split`: vùng ảnh hai cột, info một cột, cao bằng phần viewport dưới header trừ gap, `50px` và safe area, nên hàng related
dưới lộ 50px. `N <= 3` là `pinterest`: ảnh trên, info dưới; info cao theo chữ, tối đa `28%` viewport trừ gap; vùng ảnh rộng
hết primary, cao `min(W/r, phần còn lại)`; cả khối vừa phần viewport dưới header, không chừa 50px. Ảnh `contain` trong vùng;
dư quá `0.5px` thì `data-advertising-photo-glass="true"`, nền là bản sao cover của ảnh dưới Kính. Không đủ một dòng mô tả
cùng nhóm, CTA, indicator thì primary cao thêm tối thiểu (`measureInfo`); người xem cuộn để đọc. Hình học không dựng được
thì ném `RangeError`. Chiều cao viewport lấy từ [shell R11](site-shell.md#r11-viewport-ổn-định-khi-thanh-địa-chỉ-đổi).

```gherkin
Given viewport 1569×912 (4 cột) và viewport 820×912 (3 cột)
When mở cùng một ảnh ngang
Then 1569px: layout split, primary span 3, ảnh hai cột, primary chừa 50px ở đáy viewport
And 820px: layout pinterest, primary span 3, ảnh và info vừa phần dưới header, info không quá 28% viewport
```

### R3. Info: nhóm, mô tả, CTA

Info (`role="region"`, `tabindex=0`) có nhãn nhóm VI/EN, mô tả và CTA; không có tiêu đề ảnh. Mô tả không có thanh cuộn
riêng: `paginateDescription` chia theo từ cho vừa pager; indicator `n / N` (aria-label "Trang mô tả n trên N" /
"Description page n of N") chỉ hiện khi nhiều trang. Lật trang bằng `ArrowLeft`/`ArrowRight`, wheel ngang (`|dx| > |dy|`,
`|dx| >= 18`) hoặc kéo ngang: quá 8px theo chiều ngang thì giữ pointer, thả khi lệch từ 36px. Input dọc luôn cuộn trang.
Resize, font tải xong tính lại trang và giữ trang đang đọc nếu còn. CTA `Trao đổi ý tưởng` / `Discuss an idea` mở Zalo tab
mới, nằm trong flow và cuộn theo trang; là CTA kinh doanh duy nhất của detail. Detail không có batch skeleton cuối và giữ
khoảng trên footer của site ([CTA giữa viewport R2](advertising-cta-center-parallax.md#r2-batch-skeleton-dưới-cta-co-giãn)).

```gherkin
Given detail có mô tả dài hơn pager
When nhấn ArrowRight trong pager rồi wheel dọc trên mô tả
Then indicator thành "2 / N"; wheel dọc cuộn trang, không đổi trang mô tả
```

### R4. Media primary và nền

`renderPrimaryMedia` đổi ảnh tại chính khung primary: chưa giải mã sau 100ms thì mang skeleton rồi hiện qua Kính trong
`1.4s`; ảnh có sẵn crossfade trong `0.6s` ([loading glass R4](loading-glass-and-page-entry.md#r4-mở-ảnh-tại-chỗ)). Nền vùng dư
là bản sao cover (video dùng poster), phóng `1.12`, ẩn khi không có vùng dư; Kính phủ đều đặt sau nền. Video tự phát, tắt
tiếng, có nút `Bật tiếng` / `Unmute`; nút `Xem lớn hơn` ẩn với video. Card nhiều media có hàng thumbnail
([media-card](site-media-card-playback.md)).

```gherkin
Given primary đang hiện ảnh A, ảnh B đã có trong cache
When bấm card related B
Then ảnh A crossfade sang B tại khung primary trong 0.6s, không skeleton
```

### R5. Suggestion

`selectAdvertisingSuggestions` chọn tối đa bốn tag nhóm `product` hoặc `use` có ảnh: tag gắn trên ảnh trước, sau đó tag có
ảnh cùng nhóm theo thứ tự băm `fnv1a32("<photo>:<tag>")`; tag đang chọn luôn có chỗ. Thứ tự cố định theo photo, không theo
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
(`suggestionDeck`); ảnh đầu của nút là ảnh đầu bộ. Mỗi `3s`, nút chưa bật đang trong viewport giải mã ảnh kế rồi crossfade
`1.6s` (`mountSuggestionSlides`), không zoom; zoom chỉ khi hover. Bỏ lượt khi nút đang bật, tab ẩn, khối ẩn, nút ngoài
viewport, body `motion-paused`, reduced motion hoặc lượt trước chưa xong; ra viewport hay ẩn tab thì crossfade đang chạy
dừng. Bộ dưới 4 ảnh đứng yên. Ảnh nền chưa xong thì nút hiện thanh tải. Đổi ảnh primary thì dọn slideshow cũ.

```gherkin
Given suggestion có nút chưa bật với bộ từ 4 ảnh và một nút đang bật
When chờ 3s
Then nút chưa bật crossfade sang ảnh khác, transform ảnh vẫn none
And nút đang bật giữ nguyên ảnh
```

### R7. Related

`selectAdvertisingRelated`: không tag thì mọi ảnh cùng nhóm trừ ảnh đang xem; có tag thì mọi ảnh mang tag ở mọi nhóm, trừ
ảnh đang xem. `compileAdvertisingRelatedLayout` xáo pool theo seed của lượt duyệt và khóa `related:<photo>:<tag|all>`, xếp bằng
solver của [masonry](advertising-masonry.md#r6-đặt-card-và-chuyển-vị-trí) với các cột của primary đã chiếm sẵn: `split` thử đặt
card cạnh primary ở cột 4, hết nửa ngân sách thì xếp dưới primary. Card mount theo cửa sổ ảo (thêm một chiều cao viewport mỗi
phía), giữ card neo và card đang focus; Tab mount card kế. Lần xếp đầu, card đi từ đầu cột tới chỗ; đổi tag, resize chạy
chuyển vị trí `0.4s`. Card related của ảnh vừa rời mang "Vừa xem" / "Just viewed". Bấm card related lưu neo rồi mở detail
mới (R1, R8). Vào thẳng detail: primary dựng với related rỗng, solver related chạy ở task sau để không task nào quá `50ms` trên A05s; có `detail.scrollY` cần khôi phục thì một lượt như cũ.

```gherkin
Given detail ở 1569×912 có ít nhất một ảnh related
When related xếp xong
Then ảnh related đầu nằm ở cột 4, cùng top với primary, không chồng hay mất ảnh
```

### R8. Back, Forward và vị trí cuộn

Mỗi entry giữ state `advertisingBrowse`: nhóm, photo, tag, seed, `grid` và `detail` (`scrollY`, card neo, độ lệch neo, media,
bề rộng viewport). Masonry → A → B là ba entry; tag và nhóm dùng `replaceState`. Scroll ghi vào history tối đa mỗi `300ms`
(Chrome bỏ quá 200 lần ghi trong 10s) và khi `pagehide`. Back, Forward chỉ đổi query thì `motion.js` giao cho
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

Nút `Xem lớn hơn` (vuông 48px, nhãn mở khi hover) mở `dialog#advertising-photo-dialog` bằng `showModal` sau khi khóa cuộn
logic (`createAdvertisingPhotoViewer`). Ảnh morph bằng transform từ khung primary tới vừa khung `300ms`, đóng ngược `250ms`,
`cubic-bezier(0.55, 0, 0, 1)`; nền viewer tối `blur(4px)` hiện, tắt bằng opacity cùng nhịp; focus vào nút đóng. Nút đóng góc
trên trái; reset, `+`, `−` góc dưới phải, status phần trăm; nút tới giới hạn thì disabled. Wheel bước nấc zoom quanh con trỏ,
chặn cuộn trang; chuột giữa về vừa khung; Tab xoay vòng nút đang hiện; kéo, phím mũi tên (40px) pan, kẹp theo ảnh đã phóng. Đóng bằng nút, Escape (chỉ
đóng viewer, không rời detail), chạm hoặc click nền (vuốt bắt đầu từ nền không đóng) hoặc lỗi ảnh (tức thì); đóng thì mở khóa
cuộn, focus về nút mở (resize lúc mở đẩy nút khỏi màn hình thì cuộn tức thì cho nút về giữa). Đổi ảnh primary hay về
masonry thì đóng viewer. Pinch, chạm đúp, nấc zoom liên tục: [viewer chạm](advertising-viewer-touch-zoom.md).

```gherkin
Given detail đã cuộn tới Y1
When bấm "Xem lớn hơn", wheel lên một nấc, nhấn Escape
Then viewer mở bằng morph, zoom quanh con trỏ, trang không cuộn
And Escape đóng viewer về khung primary, URL vẫn là detail, scroll là Y1, focus ở nút mở
```

### R10. Navbar và Escape trên detail

Click chính vào mục Advertising trên navbar hoặc tiêu đề menu khi đang ở detail gọi `navigateQuery(href, {reason: "navbar"})`
(`motion.js`) → `returnToGrid`: push entry masonry nhóm khách chọn trên rail trước khi mở ảnh (`grid.category`), xóa photo,
tag; ảnh vào thẳng về All (owner 2026-10-05). Còn ở A mở từ masonry thì A về độ lệch cũ; sang B cùng nhóm hoặc vào thẳng
thì B ở giữa viewport, mang "Vừa xem"; B khác nhóm thì về A. Back vẫn về detail. Click có phím bổ trợ đi theo trình duyệt.
Escape khi không viewer, menu: ảnh vào thẳng (`directPhotoRootId`) thì `escapeDirectPhoto` thay entry bằng masonry nhóm của
ảnh, focus card đó; còn lại `history.back()`. All không photo: bấm lại navbar cuộn về 0 ([masonry R3](advertising-masonry.md#r3-filter)).

```gherkin
Given masonry nhóm Kiosk & POSM mở A, A mở related B cùng nhóm
When bấm Advertising trên navbar
Then URL là ?category=kiosk-posm, rail sáng nhóm đó, history thêm một entry, card B ở giữa viewport mang "Vừa xem"
```

### R11. VI/EN

Đổi ngôn ngữ trên detail đi tại chỗ ([shell R5](site-shell.md#r5-đổi-ngôn-ngữ-và-ghi-nhớ)): sự kiện `languagechange` dựng lại
detail cùng photo, tag, entry, media đang xem; đổi nhãn nhóm, mô tả (về trang 1), nhãn suggestion, aria, alt viewer. Link
ngôn ngữ luôn mang `photo` và `tag` hiện tại (`syncLocaleLinks`); seed theo [masonry R4](advertising-masonry.md#r4-thứ-tự-ngẫu-nhiên-theo-lượt-duyệt).

```gherkin
Given detail VI kiosk-posm-07 với tag use-sampling
When chuyển sang EN
Then URL là /en/advertising-products/?category=kiosk-posm&photo=kiosk-posm-07&tag=use-sampling
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
[Viewer](../../design-system/components/Viewer/README.md), [Thanh tải](../../design-system/components/LoadBar/README.md),
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
| R6 | `advertising-slideshow-p75.e2e.mjs`; `advertising-suggestion-motion.e2e.mjs`; `advertising-products-random-order.test.mjs` (`mountSuggestionSlides`) |
| R7 | `advertising-products-random-order.test.mjs`, `advertising-products-static.test.mjs` (pool, seed); `advertising-one-column.test.mjs`; `advertising-single-related.e2e.mjs`; `CASE=related-selected-card-shuffle-cleanup`, `p13-position-stuffing-and-remount`; `pnpm qa:related-scroll` (giả lập và Android qua adb) |
| R8 | `advertising-products-lifecycle.test.mjs` (history controller); `CASE=m02b-entry-media-and-scroll-back-forward`, `m02b-related-history-just-viewed-and-scroll`, `history-entry-scroll-offscreen-morph`, `history-grid-scrollbar-resize`, `rapid-related-and-back-mid-morph` |
| R9 | `PHOTO_VIEW_CONTROLS_ONLY=1 node tests/site/advertising-photo-view.e2e.mjs` (gồm `viewer:resize-focus`); `CASE=viewer-control-affordances`, `viewer-backdrop-swipe-stays-open`, `viewer-morph-lock-handoff`, `morph-backdrop-lifecycle` |
| R10 | `advertising-products-lifecycle.test.mjs` (`returnToGrid`, `escapeDirectPhoto`); `CASE=navbar-keeps-picked-group node tests/site/advertising-photo-transitions.e2e.mjs`; `advertising-return-p74.e2e.mjs`; `TT_E2E_P13_NAVBAR_ONLY=1 node tests/site/site.e2e.cjs` |
| R11 | `CASE=active-photo-locale-switch` |
| R12 | `advertising-primary-p14.e2e.mjs` (reduced motion); `advertising-slideshow-p75.e2e.mjs`; `advertising-suggestion-motion.e2e.mjs` |

## Gate còn mở

Gate thiết bị theo card [kiểm thiết bị](https://app.notion.com/p/3ef332849a0e8100bbd1e62ad5229067).

- R8 FAIL (Chromium cloud 05/10, chạy riêng): `m02b-related-history-just-viewed-and-scroll` về detail ở Y=0 thay vì Y đã lưu
  (2051 đến 2498); `history-entry-scroll-offscreen-morph` vẽ masonry ở Y=2316 thay vì 0; `m02b-entry-media-and-scroll-back-forward`
  không dựng được hai Y khác nhau; `history-grid-scrollbar-resize` PASS. Chưa rõ lỗi runtime hay test. Main chẩn đoán
  rồi sửa runtime hoặc test.
- Landscape VI `Y=2` trên emulator FAIL; A05s thật `Y=0`, owner giữ FAIL kèm ghi chú. Replay H01–H02 trên A05s chưa chạy;
  L06 (viewer không đóng khi vuốt từ nền) chưa replay A05s ngang, cùng [shell](site-shell.md#gate-còn-mở). Máy PC.
- Safari iPhone thật chưa kiểm detail, history, viewer (control trong safe area), slideshow; WebKit desktop không thay. Owner, máy PC.
- Owner chưa xem detail VI và EN trên máy mình: primary ở 920→1165px và ảnh dọc 954×910, suggestion, slideshow, related,
  Back, navbar. Owner.
- Hiệu năng: p95 click tới frame đầu `<= 100ms`, không task đồng bộ quá 50ms (Chrome 1329×912, 20 lượt mỗi luồng) chưa đo
  trên runtime hiện tại; chưa có trace detail trên Galaxy A54 hay A05s. Main và máy PC.
- Test cũ FAIL (Chromium cloud 05/10): `advertising-single-related.e2e.mjs` đòi lộ 50px ở 820px (pinterest, R2 không chừa);
  `advertising-return-p74.e2e.mjs` đòi sự kiện morph card sang primary đã bỏ. Main sửa test.
- `advertising-primary-p14.e2e.mjs` 32/37: nhãn `Xem lớn hơn` không mở khi hover (320×568, 1440×900 EN), nút bị che ở ngang
  838×331, 844×390, Tab không tới nút ở 390×844. Chưa rõ test cũ hay lỗi. Main.
- `split` hết nửa ngân sách thì xếp mọi related dưới primary, cột 4 trống; intent owner 21/09 đòi cột 4 luôn có ảnh khi còn
  related. Chưa pool nào tái hiện (suy luận). Main kiểm.
- [CẦN LÀM RÕ: intent 27/09 đòi mô tả căn đều hai bên; `detail.css` để căn trái. Sửa CSS hay bỏ intent?] Owner.
- [CẦN LÀM RÕ: intent 27/09 đòi nền viewer chuyển rõ sang nhòe cùng morph; code giữ `blur(4px)`, chỉ đổi opacity,
  [Kính R1](glass-surface.md#r1-một-component-hai-dạng) giữ nguyên nền viewer. Coi là đạt?] Owner.
- [CẦN LÀM RÕ: intent cũ giữ trang mô tả đang đọc khi đổi ngôn ngữ; code về trang 1. Giữ code?] Owner.
- [CẦN LÀM RÕ: URL gõ tay có tag hợp lệ nhưng không còn ảnh khác thì related trống, không thông báo; intent cũ đòi empty
  state (suy luận từ code). Thêm thông báo?] Owner.

## Chú thích thuật ngữ

- **Split, pinterest**: hai layout primary; split chia ảnh và info theo cột, pinterest xếp info dưới ảnh.
- **Info**: cột hoặc dải chữ của primary gồm nhóm, mô tả, CTA, có thể có suggestion.
- **Pager**: vùng mô tả chia trang thay cho thanh cuộn riêng.
- **Entry**: một mục trong history của trình duyệt, giữ state và vị trí cuộn riêng.
- **Neo**: card dùng để đặt lại vị trí cuộn khi bề rộng viewport đổi.
- **Cửa sổ ảo**: chỉ mount card related gần vùng nhìn thấy.
