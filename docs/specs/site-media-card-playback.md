---
title: Media card đa nội dung trên toàn website
type: spec
status: accepted
updated: 2026-10-03
approved: 2026-09-28
related_docs:
  - advertising-photo-browse.md
  - advertising-photo-morph-scroll.md
  - mobile-browser-parity-capability-map.md
  - site-shell.md
  - ../../design-system/content.md
  - ../../design-system/motion.md
---

# Media card đa nội dung trên toàn website — accepted 2026-09-28

**Module:** `site-media-card-playback`. Owner duyệt spec ngày 28/09/2026 bằng “duyệt”.
[Card discovery](https://app.notion.com/p/3e9332849a0e814995c2fbb2e5393803) giữ nguồn phỏng vấn;
contract Git ở đây sở hữu hướng đã duyệt. Các mục ghi **Đề xuất** là lựa chọn
trong bản được duyệt, nhưng thông số ghi chờ prototype/trace và edge case ở cuối
vẫn phải chứng minh/chốt trước slice tương ứng. Owner đã duyệt plan M00–M09
ngày 28/09/2026; M00a chỉ ghi baseline RED/PASS, chưa sửa product source. Runtime
M02a đã có implementation và evidence focused trên Advertising. M02b đang kiểm
marker/history trong packet Advertising và child route; chưa nghiệm thu toàn bộ
module. L06 landscape và tab gốc `8790` không là bằng chứng tính năng này đạt.

## Đồng bộ planning từ Notion — 2026-10-03

Board nguồn là [Tasks — By status](https://app.notion.com/p/3b5332849a0e80689b46e724fa43e480?v=3b5332849a0e8011b307000cca66e3c1), đọc ở trạng thái hiện hành ngày 03/10/2026. Board có `1 Not started`, `0 Up next`, `8 In progress` và `13 Done`; theo yêu cầu owner, phần `Done` chỉ được ghi nhận bằng số lượng, không chép chi tiết.

Các work item đang hoạt động liên quan Advertising được tóm tắt như sau:

- **CMS: giữ contract Advertising masonry khi CRUD ảnh, tag và phân loại** — `Not started`. CMS/upload UI, adapter snapshot, invalidation và CRUD regression vẫn ngoài phạm vi source static hiện tại; contract media/masonry trong spec này phải được giữ khi lập phase CMS riêng.
- **Trường Thịnh Website — backlog hiện hành và phát hành snapshot 24/09** — `In progress`. Release còn bị Git pre-push gate chặn; owner visual VI/EN, scrollbar/hero replay, chất lượng asset và physical QA vẫn là gate mở.
- **Card đa media trong masonry và vùng primary** — `In progress`. Git spec này là nguồn chuẩn; M02a đã có evidence focused, M02b Advertising đang ở checkpoint partial/paused, còn M03–M05 và QA/closure toàn website vẫn paused. Phạm vi thực thi hiện tại chỉ là Advertising và route con.
- **Implement: Masonry Advertising ngẫu nhiên và cải thiện tải ảnh** — `In progress`. Random masonry, skeleton và image-progress đã có source/evidence local; candidate chưa qua Git gate và chưa commit/push/deploy.
- **Layout mobile**, **Mobile viewport**, **Random masonry và skeleton mobile**, **Scrollbar theo Espacio** — `In progress`. Đây là các card cross-cutting; chỉ phần ảnh hưởng Advertising/compatibility route được đối chiếu ở report, không mở lại implementation ngoài boundary hiện tại.

Notion tiếp tục sở hữu status, blocker và next action; Git spec này sở hữu contract đã duyệt và evidence. Khi hai lớp khác nhau, phải cập nhật Git trước rồi mới ghi lại card Notion.

## Mục tiêu, phạm vi và quyền sở hữu

Một card đại diện một sản phẩm/công trình có thể chứa nhiều ảnh và video; người xem chuyển media ngay trên
card, mở detail tại đúng media đang xem, rồi xem/thao tác cùng media ở vùng primary. Áp dụng VI/EN cho **mọi
họ media-card trên website**, không mặc định triển khai Advertising trước. Không biến CSS `display:grid`
phi-media thành player. Bảng sau là inventory để owner xác nhận ranh giới, không tự loại gallery vì tên
class khác `grid`:

| Họ hiện có | Source và layout hiện tại | Đề xuất trong phạm vi |
| --- | --- | --- |
| Advertising parent và related | [`index.html`](../../src/site/advertising-products/index.html) `[data-project-grid]`, `[data-advertising-photo-related-grid]`; [`layout-core.mjs`](../../src/site/advertising-products/layout-core.mjs) là solver riêng | Card sản phẩm và related; suggestion/tag không phải sản phẩm |
| Home project reel | [`index.html`](../../src/site/index.html) `.project-track > .project-card`; desktop masonry, mobile rail | Card công trình, giữ rail/scroll-snap hiện có |
| Residential/Commercial gallery | [`residential/index.html`](../../src/site/residential/index.html), [`commercial/index.html`](../../src/site/commercial/index.html) `.detail-gallery__item`; rail scroll-snap | Mỗi item ảnh/công trình có thể là media-card; không thay gallery controls |
| Portal, process, cặp ảnh | `.service-portal`, `.editorial-item`, `.detail-duo figure` trên Home/Residential/Commercial/About | **Đề xuất** chỉ card có identity sản phẩm/công trình và đích detail; không ép một ảnh minh họa quy trình thành sản phẩm |
| Nhóm phi-card | About `.about-timeline`, `.about-commitments` là chữ; Home client-logo marquee và heritage montage là logo/ảnh xen chữ | **Đề xuất** giữ nguyên, vì không có card sản phẩm/công trình hay primary tương ứng; owner xác nhận ranh giới này |

Các họ dùng CSS/interaction khác nhau; chỉ Advertising gọi solver hiện hành. Dùng chung quy tắc media,
visibility, playback và trạng thái; không bắt các họ khác dùng thuật toán xếp Advertising. Sáu URL category
Advertising VI/EN là compatibility redirect về parent, không phải sáu gallery độc lập. Source public ở
`src/site/`; `.site-output/` chỉ là build. Copy VI gốc ngoài nhãn mới giữ nguyên; EN dùng câu tự nhiên,
alt/ARIA ở node lá theo [content guide](../../design-system/content.md).

## Media, card và detail

- Mỗi card có identity ổn định và danh sách media có thứ tự, tối thiểu một item. Ảnh và video cùng tham gia
  carousel; vuốt trên card chỉ đổi media, không mở detail. Chạm/click phần thân card mở detail. Primary khởi
  đầu ở **đúng media active** trên card; đổi media ở primary đồng bộ thumbnail đang chọn cạnh mô tả.
  Thumbnail có viền chọn, video có biểu tượng phát; số thumbnail không bị khóa theo ảnh tham chiếu. Card ít
  item dùng dấu chấm nhỏ; nhiều item dùng `hiện tại/tổng số` như `7/11`. Owner
  duyệt ngày 28/09: 1 item không chỉ báo, không có dải điều khiển; 2–6 item
  dành **một hàng chấm** trong dải điều khiển cao `44 CSS px` **bên dưới canvas
  media**, không phủ lên ảnh. Chấm nhìn thấy đường kính khoảng `8 CSS px`, mỗi
  nút có vùng bấm `20×44 CSS px`, có tên truy cập VI/EN, nhận focus/bàn phím;
  sáu nút rộng `120 CSS px`, vừa khung card hiện tại hẹp nhất `137.5 CSS px`.
  Từ 7 item, dải này dùng bộ đếm số hiện tại/tổng số và nút media trước/sau;
  hai nút có vùng kích hoạt tối thiểu `44×44 CSS px`, tên truy cập VI/EN,
  nhận focus/bàn phím và thông báo vị trí hiện tại cho screen reader. Nút trước vô hiệu ở item đầu,
  nút sau vô hiệu ở item cuối. Nút chỉ đổi media, không mở detail. Quy tắc
  `20×44` cho chấm là **điều chỉnh của website**, thay cách overlay và chỉ ép
  chấm một hàng trong khung ảnh cũ của R6; không gán hit box này cho Pinterest.
  Với đúng một item do tác giả chọn, item đó có thể là video hoặc ảnh khác
  ảnh legacy: card phải hiển thị đúng item và giữ đúng `id` media active của
  nó, không thay bằng `record.media` chỉ vì danh sách có một phần tử. Khi media
  lỗi, dùng fallback hợp lệ mà không báo sai ID. 154 card ảnh legacy cùng
  `src`/một item tiếp tục đi đường tương thích hiện có.
- **Khởi tạo detail và history:** URL giữ identity card bằng `?photo=cardId`,
  không thêm tham số media. M02a: mở detail trực tiếp bằng URL này hoặc reload
  URL đó thì primary bắt đầu ở item `coverMediaId`; mở từ card trong masonry thì
  bắt đầu ở media active của card như trên. M02b: Back/Forward trong cùng tab
  khôi phục media active **và** vị trí cuộn `Y` riêng của từng history entry;
  thao tác này không áp dụng quy tắc khởi tạo cover của direct/reload. Không
  phát sinh history entry mới chỉ để lưu media active.
- **Cùng tỷ lệ trong một card:** mọi item ảnh/video của `mediaItems[]`, kể cả
  item cover, có `width` và `height` là số nguyên dương an toàn và cùng tỷ lệ
  hữu tỷ sau khi rút gọn bằng ước chung lớn nhất. Video còn bắt buộc có
  `posterWidth`/`posterHeight` là số nguyên dương an toàn, cùng tỷ lệ với item
  video/card. Kích thước nội tại của file video và poster thực tế phải khớp
  metadata đã khai báo khi chuẩn bị asset/fixture; validator metadata một mình
  không chứng minh byte file. Dữ liệu tác giả và fixture test phải hợp lệ; từ
  chối item thiếu kích thước hoặc khác tỷ lệ, không tự crop và không dùng ngưỡng
  sai số. Mọi ảnh fallback hoặc poster thực sự hiển thị trên card cũng phải cùng tỷ lệ đã
  khai báo. Legacy `record.media` có thể giữ tỷ lệ khác và không bị viết lại
  **chỉ khi** nó là metadata tương thích, không hiện lên card ngoài danh sách;
  nếu được render làm fallback thì phải cùng tỷ lệ. 154 card một ảnh giữ data
  hiện hành. CMS tương lai chịu trách nhiệm kiểm/chuyển đổi trước khi lưu,
  ngoài phạm vi feature này.
- **Canvas media ban đầu của card Advertising ở masonry và related** lấy tỷ lệ từ
  `width`/`height` của item mà `coverMediaId` trỏ tới, kể cả cover video khác tỷ
  lệ ảnh legacy `record.media` chỉ dùng làm metadata, không render fallback.
  Nếu record cũ chưa có danh sách media thì dùng kích thước `record.media` như
  trước; giữ `record.media` là ảnh tương thích, không sửa giả kích thước của nó.
  Card có từ hai media phải tính **tổng chiều cao canvas + dải `44 CSS px`** ngay
  trong lần xếp solver đầu tiên ở masonry/related; tỷ lệ cover chỉ áp cho canvas,
  không áp cho cả card gồm dải. Video duration ở góc trên trái canvas và
  playback control ở góc trên phải canvas, không lấn dải dưới. Đổi item đang
  xem, tải chậm hoặc lỗi media không thay rect card đã xếp trong cùng viewport
  (`≤1 CSS px`), dải không giao ảnh/card kế; không
  đổi seed, thứ tự hay thêm filler chỉ để đạt điều này. 154 card một ảnh giữ
  hình học và hash layout hiện hành, không thêm dải. Primary khi mở ở media active thuộc M02a
  và có hình học riêng, không lấy rect masonry làm contract primary.
  Cơ sở tham chiếu: trong **một phiên Pinterest được quan sát** ở viewport
  `320×700`, masonry hai cột/card khoảng `100 CSS px`, 5/6 media đặt một hàng chấm
  nhìn thấy khoảng `8 CSS px` trong dải riêng khoảng `40 CSS px` dưới ảnh;
  card 17 media dùng số trên ảnh, không quan sát thấy nút play cố định. Đây là
  quan sát theo phiên/phiên bản, không là quy luật chung của Pinterest; dải
  `44 CSS px` và hit box nêu trên là quyết định điều chỉnh cho website.
  Nếu một họ card tương lai hẹp hơn dải cần thiết, M03–M05 kiểm riêng trước
  khi chọn fallback; không áp dụng fallback mới ở Advertising hiện tại.
- Video có nhãn thời lượng góc trên trái. Masonry luôn mute; detail ban đầu cũng mute, có điều khiển bật/tắt
  tiếng bằng thao tác chủ động. Giữ track audio gốc; quay lại masonry luôn mute. Nút play/pause riêng trên
  mobile điều khiển video, chạm thân card vẫn mở detail. **Đề xuất phân xử trên mobile:** play thủ công
  nắm player duy nhất và pause player khác; pause thủ công không bị lịch vùng trọng tâm bật lại ngay. Chỉ
  play tường minh hoặc lần cuộn tiếp theo mới cho lịch xét phát lại; trên desktop, hover mới cũng là
  tương tác phát lại theo contract hover.
  Video pause giữ frame và thời điểm khi card còn trong viewport; có thể bỏ thời điểm khi ra ngoài. Khi
  media lỗi, giữ poster/ảnh hợp lệ và điều khiển còn dùng được, không đổi sai media ID.
- Chỉ bỏ morph **masonry ↔ detail**, kể cả click, Back và Forward; không tạo clone bay giữa hai vùng. Khi đóng
  detail, đúng card vừa xem gần nhất có lớp phủ tối và nhãn `Vừa xem` / `Just viewed`; card khác không có.
  Dấu chỉ xuất hiện sau khi đóng detail: trong runtime của tab có đúng một card
  vừa đóng được đánh dấu trên masonry đang active: main Advertising hoặc related
  trong query photo detail. Không giữ marker trùng trong main masonry đang ẩn.
  A→B đánh dấu A ở related của B; Back về A đánh dấu B ở related của A; Forward
  về B đánh dấu A ở related của B. Dấu dùng identity vừa đóng mới nhất của runtime,
  không phục hồi dấu cũ từ snapshot history. Đóng card khác thì chuyển dấu sang card đó. Điều hướng
  trong cùng tab giữ dấu khi runtime chưa reload; full reload xóa dấu. Chỉ giữ
  trong bộ nhớ runtime, không ghi `sessionStorage`, `localStorage` hay kho lưu trữ
  khác; card unmount không bị tạo lại chỉ để hiện dấu, remount hợp lệ đọc identity
  mới nhất. Không cuộn để tìm card. Giữ scroll riêng của main và related từng
  history entry `T0/Y0`, `T1/Y1`, restore
  không có frame nhảy sang Y của entry kia và không thêm entry. Giữ seed/filter/category/tag và photo
  identity đã chốt; direct/reload không có card nguồn vẫn chọn `coverMediaId`
  theo contract khởi tạo M02a ở trên.
  Owner chọn học Pinterest cho thời hạn dấu: trong **một phiên đăng nhập được
  quan sát** ngày 28/09/2026 tại
  [search](https://www.pinterest.com/search/my_pins/?q=interior%20design&rs=filter)
  và [pin](https://www.pinterest.com/pin/42854633949214150/), sau đóng detail
  có một dấu, pin kế thay dấu cũ, điều hướng cùng tab giữ dấu, còn reload đúng
  trang search thì `markerCount=0` dù pin còn hiện. Đây là bằng chứng giới hạn
  theo phiên/phiên bản quan sát, không là quy luật chung của Pinterest.
- **Giữ** morph ảnh primary ↔ viewer khi mở/đóng, zoom fit → cover → 2 × cover, pan giới hạn,
  focus/scroll lock và reduced-motion policy hiện có. Bổ sung yêu cầu pinch **hai ngón trên chính ảnh trong
  viewer** để zoom ảnh nội bộ và pan khi phóng lớn, không đánh đồng với native page zoom. Pinch và double-tap
  nay theo [spec zoom hai ngón](advertising-viewer-touch-zoom.md) owner yêu cầu 05/10. L06 portrait page pinch không chứng minh viewer pinch; L06 landscape hai EN viewer tự đóng sau
  touch và lỗi CDN vẫn là RED độc lập phải phân loại. Modal viewer và menu giữ top-layer/exclusivity đã
  accepted; header, route veil, CTA và local layer theo
  [shell spec](site-shell.md), không còn lớp grid-detail morph trong tính năng
  này.

## Lịch phát, vùng trọng tâm và tải trước

- Vùng trọng tâm **vô hình**, rộng toàn viewport và cao bằng 40% phần viewport nhìn thấy **bên dưới mép dưới navbar thực**; đặt dải này ở chính giữa phần nhìn thấy đó. Mép navbar thay đổi khi thu gọn/cuộn/resize thì tính lại vùng trên desktop/mobile. Tâm
  card quyết định card thuộc vùng. Khi không có tâm card có cover video đủ điều kiện trong vùng, lịch vùng trọng tâm **không autoplay**; hover card đủ điều kiện ở nơi khác trong viewport vẫn theo quy tắc hover dưới đây. Solver **ưu tiên** phân tán
  card đủ điều kiện để tối đa một card ở vùng, nhưng nhiều card là fallback hợp lệ; giữ ordering, geometry,
  no-filler và session stability đã accepted, không đổi seed để ép bố cục. Với nhiều ứng viên, chỉ **một**
  media cover phát tại một thời điểm; kết thúc lượt thì chọn ngẫu nhiên card chưa chạy trong chu kỳ, không
  lặp trước khi mỗi card đã chạy một lần. Chu kỳ sau xáo mới; không cấm lặp qua ranh giới hai chu kỳ.
- Hover card khác ở bất kỳ đâu trong viewport pause card đang phát và phát media cover của card hover;
  hover card đang phát thì tiếp tục tại timestamp hiện tại. Mouseleave từ card hover đang phát pause **tất
  cả**; lịch vùng trọng tâm chỉ tiếp tục sau hover hoặc scroll kế. Pause giữ frame video. Trên touch, nút
  play/pause là thao tác rõ ràng, không suy hover từ tap. **Đề xuất phân xử:** hover một card có cover video
  đủ điều kiện nắm player duy nhất tới khi mouseleave; khi override hover còn hiệu lực, scroll settle không
  giành player cho vùng trọng tâm. Mouseleave pause tất cả tới hover hoặc cuộn mới. Ảnh cover tĩnh hiển thị
  bình thường, không khởi động player hay chiếm lượt; chỉ card có cover video (kể cả GIF đã chuyển thành
  video) vào tập autoplay. Khi scroll settle, bỏ card không còn trong vùng khỏi lượt chọn, thêm card mới
  vào nhóm chưa phát, giữ dấu đã phát của card còn ở vùng. Khi mọi ứng viên hiện tại đã phát, mở chu kỳ
  mới. Với video loop, một lượt
  kết thúc sau một vòng nội dung, không chờ loop vô hạn.
- Vùng tải trước rộng hơn viewport nhìn thấy: chuẩn bị metadata/card và poster/ảnh cover trước các slide
  sau; chỉ yêu cầu đủ dữ liệu ban đầu để video có thể bắt đầu, không cố tải cả file. Trình duyệt có thể tải
  khác hint `preload`, nên xác nhận bằng network trace, không cam kết byte cố định. Card chỉ hiển thị
  media/motion khi vào viewport; nếu media cần hiển thị chưa sẵn sàng, vòng tròn loading nằm trong đúng
  frame, không đổi card geometry. Không hiển thị phần trăm khi không có byte-progress đáng tin. **Đề xuất:**
  preload metadata cho video kế tiếp trong vùng đệm theo viewport, các slide còn lại theo nhu cầu; giới hạn
  buffer và lỗi sẽ khóa ở plan/evidence, không xóa card ngoài viewport chỉ vì offscreen.
- Không lưu file media dạng GIF. **Đề xuất delivery:** video MP4/H.264 với audio AAC khi file gốc có tiếng,
  poster WebP; chuyển animation GIF đầu vào thành video, không giữ bản GIF trong kho public. Đây là baseline
  tương thích, không phải cam kết dung lượng nhỏ nhất cho mọi clip. Codec phụ AV1/WebM chỉ thêm nếu đo trên
  thiết bị mục tiêu chứng minh lợi ích mà vẫn có fallback MP4. Apple khuyên
  [H.264 MP4 cho file video](https://developer.apple.com/documentation/webkit/delivering-video-content-for-safari);
  [hướng dẫn preload](https://web.dev/learn/performance/video-performance) lưu ý metadata/poster không bảo
  đảm lượng tải cố định. Không tự đổi policy asset trong [content guide](../../design-system/content.md) trước khi
  proposal được duyệt.

## Nghiệm thu và gate

| Nhóm focused | Evidence cần có sau implementation |
| --- | --- |
| Mỗi họ media-card VI/EN; desktop/mobile | Card active, swipe không mở detail, body mở đúng media, thumbnail đồng bộ; Advertising 2–6 chấm một hàng trong dải 44px dưới canvas, từ 7 bộ đếm/nút prev-next trong dải, singleton không dải; duration/playback nằm trên canvas; pointer thật ở masonry/related, alt/ARIA, masonry/rail/portal không tràn hoặc đổi hình học ngoài contract |
| Autoplay và hover/touch | Vùng dưới header, center membership, soft solver fallback; một player, random không lặp trong chu kỳ, hover override/resume/pause, mobile play/pause, mute masonry/detail và unmute chủ động |
| Loading/lifecycle | Poster/metadata trước, video không chủ ý tải toàn bộ, loading vòng đúng frame, pause giữ frame; slow/error/offscreen/re-entry/route/BFCache cleanup, không player/timer thừa |
| History/marker/viewer | Direct/reload `?photo=cardId` mở `coverMediaId`; Back/Forward cùng tab khôi phục media active và `Y0 ≠ Y1` của đúng entry; chỉ một marker của card vừa đóng, card đóng kế thay marker, điều hướng cùng runtime giữ và full reload xóa dấu, không cuộn tới marker hay thêm media URL param; grid-detail không morph, viewer vẫn morph; pinch hai ngón zoom ảnh nội bộ và pan, backdrop touch không đóng sai, focus/scroll lock/reduced motion |
| Quality gate | RED focused trước sửa, GREEN cùng source/build/served hash; browser desktop, Android thật dọc/ngang và iPhone physical khi có thiết bị. Kiểm console/network, ảnh/video lỗi, VI/EN, keyboard và fallback. L06 landscape EN touch-close/CDN còn RED riêng, không được gọi PASS nhờ case khác |

Giữ chuẩn evidence và quality bar hiện hành; không giảm oracle `≤1 CSS px` cho geometry/scroll có thể so
cùng viewport. Dùng `pnpm qa:static` và focused test/browser commands theo plan được duyệt; `pnpm qa:site`
là suite rộng, không tự chạy lại body210 khi source/runner không đổi. Mọi thay đổi visible copy/media sau
này phải cập nhật đúng [content guide](../../design-system/content.md), motion và owning spec; không sửa CMS/Worker,
reference asset, recovery `8790`, vendor hoặc deploy trong module này.

## Hướng đã duyệt và gate số đo còn mở

1. Ranh giới media-card theo bảng đã duyệt; inventory thực tế phải chứng minh
   portal/process/duo nào có identity và detail, còn logo/montage/phi-media giữ
   nguyên. Không bỏ một họ gallery vì không dùng Advertising solver.
2. Owner duyệt phương án A ngày 28/09/2026: dải giữa 40% phần viewport dưới navbar thực, rộng toàn viewport, tâm card quyết định thuộc vùng; khi không có ứng viên trong vùng thì không autoplay. [Prototype trực quan](../../.tmp/site-media-card/m00b-20260928T093653721Z/M00b-review.md) là evidence local, không là bằng chứng scheduler đã chạy. Vẫn phải đo soft fallback solver giữ geometry/order/no-filler trên viewport thực trước khi sửa layout.
3. Dùng ngưỡng đã duyệt 1 item không chỉ báo, 2–6 chấm, từ 7 hiện số;
   ảnh tĩnh không vào chu kỳ, video loop một
   vòng là một lượt và quy tắc tập ứng viên đổi khi scroll như bản duyệt. Phải
   chứng minh bằng focused interaction, không suy từ CSS hiện hành.
4. Thử MP4/H.264 + WebP poster làm baseline; AV1 chỉ khi số đo có lợi.
   [Mẫu synthetic và trace Chromium](../../.tmp/site-media-card/m00b-media-20260928T094733503Z/M00b-media-review.md)
   có [đính chính số byte](../../.tmp/site-media-card/m00b-media-amend-20260928T095524377Z/M00b-media-amend.md):
   byte browser thực nhận chưa biết. Byte budget, lề preload và giới hạn tài
   nguyên **chưa khóa**, cần clip thật và trace trên thiết bị mục tiêu.
5. Dấu `Vừa xem` theo runtime trong tab và xóa khi full reload đã được owner
   chốt từ quan sát Pinterest giới hạn nêu trên. M02a kiểm direct/reload
   khởi tạo cover; M02b kiểm Back/Forward trong tab phục hồi media active và
   scroll theo entry, không thêm tham số media vào URL. Thời điểm phát video qua
   Back/Forward/locale và chuyển masonry→detail chưa chốt; không tự phát lại âm
   thanh hoặc hứa chuyển timestamp khi chưa có bằng chứng.

Khi thực thi theo plan được duyệt, ghi supersession có chọn lọc ở
[photo morph](advertising-photo-morph-scroll.md#delta-browser-history-và-vị-trí-cuộn-còn-hiệu-lực) và các đoạn
grid-detail morph của [photo browse](advertising-photo-browse.md); **không** xóa contract viewer open/close
morph, scroll theo entry hoặc R9 wheel zoom. Plan riêng đã được owner duyệt;
M02b còn chờ GREEN cùng hash và nghiệm thu độc lập. Theo yêu cầu owner ngày
03/10/2026, packet này kiểm trình duyệt desktop và điện thoại mô phỏng dọc/ngang;
bỏ qua Samsung physical, thiết bị thật chưa được xác minh. Các module ngoài
Advertising tiếp tục tạm dừng.

## Chú thích thuật ngữ

- **Media-card**: card sản phẩm/công trình có identity, nhiều media và đích detail.
- **Cover media**: item được `coverMediaId` chọn làm mặt trước và tỷ lệ khung
  ban đầu của card; chỉ video đủ điều kiện mới vào lượt autoplay.
- **Số nguyên an toàn**: số nguyên dương biểu diễn chính xác trong JavaScript
  (`Number.isSafeInteger`), dùng cho kích thước pixel khai báo.
- **Vùng trọng tâm**: vùng vô hình dùng chọn ứng viên autoplay, không phải viewport tải trước.
- **Viewer pinch**: cử chỉ hai ngón đổi tỷ lệ ảnh bên trong viewer, khác native page zoom.
