---
title: Evidence Advertising Products và dịch vụ trọn gói
type: verification
status: historical
updated: 2026-10-03
related_specs:
  - ../specs/advertising-products-turnkey-services.md
---

# Evidence Advertising Products và dịch vụ trọn gói

Work log chuyển nguyên văn từ
[spec Advertising Products](../specs/advertising-products-turnkey-services.md)
ngày 2026-10-03. Mỗi mục là scoped current-hash tại ngày ghi; không là full
parity hoặc release clearance. Contract hiện hành nằm trong spec.

## Kiểm chứng backlog theo contract hiện hành

[Run 2026-09-09](../archive/reports/verification-upnext-advertising-2026-09-09.md) đối chiếu các
thẻ Up next với rank-v3 và 109 media hiện hành. Nó ghi focused runtime evidence,
coverage còn thiếu và review; không thay historical report hoặc full parity verdict.

## Root-grid và detail visibility đã triển khai scoped current-hash

Root grid hiện dùng một `IntersectionObserver` theo catalog lifecycle. Stable
card id chỉ được re-arm khi `intersectionRatio === 0`; lần vào kế tiếp replay
composition fade `0 → 1` trong `0.6s ease-out`, kể cả cached image và virtual
remount. Partial visibility không restart, exit không có motion, reduced motion
hiện tức thì. Observer được unobserve trước remove và disconnect khi cleanup;
keyboard virtual placement đi cùng media lifecycle.

Shared detail template đặt `data-motion-media` trên hero `img`; generator đặt
hook trên mọi body-media `img`, không đặt trên `figure`. Wrapper giữ geometry,
nền `#e9e6df` và opacity `1`; ảnh tải thành công fade một lần, ảnh lỗi giữ
placeholder, reduced motion theo shared fallback hiện có.

Regression mới kiểm tra motion target, opacity toàn bộ ancestor, intermediate
opacity, không replay sau re-entry, media error và mobile overflow. Current-hash
đạt detail static Node `1/1`, `prepare:site`, `qa:static` và focused Advertising
media browser `10/10`. In-app Browser xác nhận wrapper final opacity `1`, ảnh
intermediate rồi final `1`, network media thật và runtime log sạch. Impeccable
detector chạy degraded vì thiếu HTML parser/Puppeteer, chỉ trả warning font đã
được owner chốt. Xem
[verification gallery detail](../archive/reports/verification-advertising-detail-gallery-visibility-2026-09-02.md).

## Carousel ngang trang chi tiết đã triển khai scoped current-hash

Owner duyệt spec/plan ngày `2026-09-02`. Mọi block `gallery` hiện dùng shared
progressive carousel; sáu route giữ đúng `1/3/1/2/1/1` instance và partition
đủ `109` media. Runtime pin `swiper@14.2.0`, chỉ phát core, Mousewheel,
Pagination và A11y; khi dependency bị chặn, cùng markup vẫn dùng được bằng
native horizontal scroll-snap.

Focused static/lifecycle contracts, `prepare:site`, `qa:static`, carousel
browser `8/8` và detail/media `10/10` đều pass. Bảy viewport khóa outer band
`15/25/35px`, gap `10/20px`, max-height `75/50vw`, intrinsic ratio,
next-slide peek, extreme-wide cap và overflow `0`. DevTools route có ba
carousel xác nhận pagination khớp snap points, asset `200` và console sạch;
human path VI đổi slide bằng dot và locale menu chuyển sang EN giữ caption cùng
controls. Xem [verification carousel ngang](../archive/reports/verification-advertising-detail-horizontal-carousel-2026-09-02.md).

## Sáu composition và media completeness đã triển khai scoped current-hash

Owner duyệt spec/plan ngày `2026-09-02`. Catalog hiện có sáu `layoutKey` cùng
exact sequence đã duyệt; build validator fail closed khi thiếu, lặp hoặc
cross-category source. Shared renderer sinh đúng `24/16/22/13/18/16` media,
union `109`, hero/body không lặp và mỗi route giữ đủ `12` product label.

Focused Node đạt `11/11`; related Advertising/Worker Node đạt `15/15`;
`prepare:site`, `qa:static` và Advertising media browser lane đạt `10/10`.
Browser lane bao phủ sáu slug VI/EN ở desktop, đủ sáu slug EN ở mobile,
direct/Barba/history, lazy load, one-shot fade và error placeholder. Mobile
matrix đã bắt và sửa cascade desktop `span 5` làm một media height `0`; rerun
không còn zero-size media hoặc horizontal overflow. Xem
[verification sáu composition](../archive/reports/verification-advertising-detail-compositions-109-media-2026-09-02.md).

## Delta `109` ảnh và spacing Espacio đã triển khai scoped current-hash

Owner duyệt spec, ADR và plan ngày `2026-09-01`. Source hiện build dataset
`2026-09-01.2`, artifact `advertising-rank-v3` gồm đúng `109` card/source độc
lập, phân bổ `24/16/22/13/18/16`, đủ ratio coverage từng nhóm. Geometry dùng
outer `15/25/35px`, gap `15/25/35px`, content cap `1500px`, `2–5` cột và
shortest-column tie-left.

Scoped current-hash đạt Node/media contracts, `qa:static`, grid `44/44`, media
`6/6`, default Advertising `28/28`, keyboard virtualization `1/1`, locale
lifecycle `1/1` và probe `3.000` card `1/1`. DevTools tại `390px` xác nhận biên
`15px`, gap `15px`, hai cột và `26` DOM node; tại `1920px` xác nhận effective
outer `210px`, gap `35px`, năm cột, cap `1500px` và `40` DOM node. Cả hai không
overflow, raw HTML hoặc console warning/error; aria set size là `109`.

Static phase chưa tạo responsive derivative (`srcset/sizes`); DevTools local
ghi LCP `153ms`, CLS `0.00` nhưng Image Delivery ước tính còn `3.1MB` byte có
thể tiết kiệm ở viewport `1920px`. Derivative được hoãn tới CMS phase và phải
review lại trước public release. Xem
[verification `109` media và spacing](../archive/reports/verification-advertising-products-109-media-spacing-2026-09-01.md).

## Baseline Pinterest organic masonry đã triển khai scoped current-hash

Owner từng duyệt baseline ngày `2026-09-01`: natural/canvas ratio, free card height,
single-column shortest-column placement, append không closed frontier, fixed
`20px` outer margin, `16px` gap và không random `fitMode`. Chrome DevTools đo
live Pinterest ở `320/390/768/1024/1440/1920px`; số cột tương ứng
`2/2/3/4/5/8`, card width khớp bảng chuẩn và source/rendered ratio không đổi.

Source hiện build artifact `advertising-rank-v3` 72 card và runtime dùng shared
pure layout core, shortest-column, bounded geometry cache và placement virtual
window. Scoped current-hash đạt Node `4/4`, static PASS, Advertising default
`28/28`, grid `43/43` và probe 3.000 card `1/1`. DevTools xác nhận filter morph
`0.4s`, active-filter no-op, one-shot foreground/backplate entrance, outer/gap
và DOM bounded. Xem
[verification organic masonry](../archive/reports/verification-advertising-products-organic-masonry-2026-09-01.md).
Baseline `72/20/16` này không phải evidence đạt delta `109` đã được duyệt.

Full suite vẫn `NOT PASS` và một lần chạy không hoàn tất sau các failure ngoài
boundary organic; scoped result không phải release hoặc full-suite clearance.
Mọi evidence dưới đây từ `Baseline delta single-column` trở đi là lịch sử trước
organic delta và không mô tả runtime rank-v3 hiện tại.

## Baseline delta single-column ngày 2026-08-31

Source builder hiện tạo rank-v2, artifact layout và fit mode deterministic;
runtime load artifact output, không compile source catalog. Acceptance browser
current-hash vẫn cần chạy lại sau `prepare:site` vì output directory đang lock.
Owner duyệt spec ngày `2026-08-31`, gồm closed frontier tuyệt đối cho mọi
non-terminal batch và terminal batch có `maxBottomDelta` không vượt outer height
của một card `3:4`.
Đo live Espacio ngày `2026-08-31` ghi caption gap `10px`, weight `700`, mobile
`10.5/15.68px` với cap-height `8px`, desktop `12/17.92px` với cap-height
`9px`. Caption dùng gap `10px`, weight `700` và không padding đáy. Đây là
contract source; browser render vẫn là evidence bắt buộc trước acceptance.

Feasibility check lịch sử cho contract rank-v2 dùng ratio units `9/12/16`: full batch
`12` card cùng ratio đóng frontier ở cả `2/3/4` cột, đạt `9/9`. Property probe
deterministic với `30.000` terminal layout tùy ý xác nhận shortest-column luôn
giữ bottom delta không vượt một tallest-card unit. Contract này đã bị organic
rank-v3 supersede; không còn là acceptance của implementation hiện tại.

## Baseline audit trước refinement ngày 2026-08-31

Baseline trước source patch đã ghi các finding sau; phần này là lịch sử chẩn
đoán, không mô tả runtime current-hash sau patch:

- hard-load Home rồi đi bằng Barba tới Advertising Products tái hiện ở
  `1440×900` và `390×844`: `window.Masonry` là `undefined`, grid chỉ còn
  `<noscript>`, không có `.advertising-tile` và raw `<figure ...>` hiện thành
  chữ. Hard-load Advertising Products trước rồi quay Home và trở lại thì chạy
  đúng vì vendor globals còn sống; đây là nguyên nhân của tính không ổn định;
- source owner đã xác định: Barba chỉ sync document state, body script của route
  đích không execute; catalog dynamic import chạy nhưng silent-return khi thiếu
  Masonry trước khi `grid.replaceChildren()`;
- direct Advertising Products đang gọi render/Masonry layout và phát
  `site:layout` trên các scroll frame dù virtual membership không đổi. Số đếm
  phụ thuộc thời lượng probe, nhưng Home cùng engine ghi `0`; source xác nhận chưa
  có no-op fast path;
- filter từ một category về `all` có thể thay toàn bộ mounted cohort; incoming
  card được đặt ngay tại target, nên không có transform nhìn thấy dù test cũ tìm
  được một shared-card morph ở trường hợp khác;
- text role public hiện vẫn là `user-select: auto`; ngoại lệ hiện tại chỉ là
  scroll-drag từ Locomotive, image và decorative number. Phần selection đã gần
  đạt contract, nhưng chưa có regression test.

Evidence focused bên dưới là lịch sử của implementation trước refinement,
không được dùng để kết luận delta single-column hoặc source patch cuối đã pass.

Current worktree dựa trên Git `a8ba94ec1dadd84990b0b33f7e590f2cf76c71b1`
và chỉ được dùng làm evidence cho các contract đo dưới đây, không là claim full
Espacio parity. Ngày `2026-08-31`, focused browser matrix tại local preview
`127.0.0.1:8787` đạt `17/17`: `320`, `390`, `679`, `750`, `751`, `829`,
`830`, `849`, `850`, `960`, `961`, `1200`, `1201`, `1440`, `1570`, `1920`,
`2560px`. Matrix đo outer/max-width, horizontal gap token, overflow và prefix
deterministic sau filter round-trip.

Probe browser cùng runtime với `3.000` card synthetic đạt `1/1` tại vùng index
`2800`: chỉ `28` card ở virtual window, `tt-0000` đã unmount, spacer giữ deep
scroll, không overlap/overflow; filter round-trip và resize giữ window bounded.
Node layout/lifecycle/static/detail-route suites đều pass; `pnpm prepare:site`
pass. Focused default Advertising subset dùng chung helper với default gate đạt
`6/7`: SSR VI/EN, filter position morph, reduced-motion instant, native-scroll
catch-up và delayed-detail `1440px` pass; delayed-detail `320px` còn navigation
race `Execution context was destroyed` ngoài phạm vi ba finding này.
Lifecycle locale/SplitText/focus đạt `1/1`: VI→EN→VI giữ editorial text/ARIA,
resize/font rebuild không nhân wrapper, catalog remount dùng locale mới và filter
đổi focus an toàn không để card rơi tại `(0,0)`. Probe click trực tiếp language
menu, không `goto`; line reveal đang chạy không snap khi resize/font. Hidden legacy
catalog block và detail fallback filter listener đã gỡ; không còn consumer
selector/taxonomy legacy trong Advertising source/test/runtime.

DevTools current runtime xác nhận target filter chưa mount trước khi lọc, sau đó
morph `33` frame từ khoảng `15.9ms` tới `392.4ms`, duration `0.4s`, delay `0s`,
không đảo chiều hoặc snap. Tại `679px`, native scrollbar `10px` cho
`innerWidth/clientWidth = 679/669px`, lưới và wrapper đều có biên `15/15px`, gap
`15px`, overflow ngang `0`. Console sạch; `24` request đều `200/304`.

Default `pnpm qa:site` trước reviewer-fix ghi `96/143`; còn failure ngoài scope.
Không suy ra full-suite green từ focused subset `6/7`. Impeccable detector chạy
trên runtime và CSS trả `[]`; không có detector finding trong hai target này.

## Chú thích thuật ngữ

- **Scoped current-hash**: kiểm thử đúng phạm vi trên source hash tại thời điểm ghi.
- **Virtual window**: tập card đang mount quanh viewport, phần còn lại unmount.
- **Closed frontier**: đáy các cột bằng nhau sau mỗi batch.
- **Responsive derivative**: biến thể ảnh nhỏ hơn để browser chọn theo viewport.
