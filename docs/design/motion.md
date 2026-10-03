---
title: Motion design system Trường Thịnh
type: design
status: accepted
updated: 2026-09-30
---

# Motion design system Trường Thịnh

## Advertising: card ảnh thật dùng chung

Grid chính và related detail dùng cùng `createPhotoCard`, media wrapper và
reveal/lazyload. Hover chuột chính xác phóng ảnh1,15 trong0,6giây ease-out,
rời chuột về1; khung giữ nguyên tọa độ/kích thước và clip ảnh bên trong.
Focus bàn phím có zoom cùng outline2px offset4px; reduced motion tắt zoom,
giữ outline. Touch không cần hover để mở ảnh. Toggle gợi ý/skeleton giữ
contract riêng, không áp hover card ảnh vào hai loại control này.

## Advertising: skeleton tiếp nối grid

Theo C1–C2, các frame trang trí giữ nguyên tọa độ packing; surface bên trong
trôi X/Y tối đa3px theo chu kỳ6–8giây lệch phase. Hai mảng gradient xám chuyển
mềm bằng transform/opacity6giây, không đổi layout hoặc chiều cao trang.
Chỉ frame giao viewport và tab visible mới chạy; reduced motion giữ nền tĩnh,
đổi preference trực tiếp có hiệu lực. Observer/listener thuộc mount và được dọn
khi rời route. Skeleton kết thúc ở đáy CTA cộng một gap grid; không kéo thêm
ba hàng ảnh giả xuống cuối trang.

Ở detail, mục Advertising trên navbar không gạch chân khi nghỉ nhưng hover
hoặc keyboard focus dùng lại underline transition0,3giây của navigation chung.

Nguồn chuẩn cho choreography, trigger, state và reduced motion dùng chung.
Nội dung được chuyển từ accepted route/Advertising spec ngày 2026-09-09, không
thay behavior. Dependency version, API và test execution vẫn thuộc owning spec.
Logo có authority riêng tại [DESIGN.md](../../DESIGN.md#brand-lockup--nguồn-chuẩn).
Espacio chỉ là [measured reference](../reference/espacio/motion.md), không phải
implementation hoặc target tự động. Historical PASS không chứng minh current runtime. Delta P1.3 dưới đây đã được
owner duyệt spec và plan ngày 2026-09-11; motion T3–T4 đạt
[checkpoint B](../verification/advertising-grid-r4-2026-09-09.md#p13-checkpoint-b--chuyển-vị-trí-và-mở-ảnh-2026-09-11).
CTA/navbar và kiểm tích hợp P1.3 đã đạt
[checkpoint C](../verification/advertising-grid-r4-2026-09-09.md#p13-checkpoint-c-và-nghiệm-thu-kỹ-thuật-2026-09-11).
Owner spot-check còn mở; các phép đo scoped không thay verdict toàn website.

## Advertising: chuỗi ảnh của gợi ý active

[D12](../specs/advertising-final-polish-and-media.md) được owner yêu cầu13/09:
chỉ nút gợi ý active chuyển chuỗi ảnh related với nhịp hero homepage, zoom
nhẹ1,06→1 trong5giây và chuyển mờ1,6giây. D17 xếp bốn mục ngang/wrap
ở stacked và2×2 phủ ngang info ở split. Nhãn, thứ tự và hình học bốn mục
đứng yên; hover/focus phản hồi riêng, off giữ ảnh đại diện tĩnh. Pause khi
offscreen/tabẩn, hủy khi tắt/đổi ảnh/unmount; reduced motion dùng ảnh tĩnh.
Không thay motion homepage; nghiệm thu runtime theo evidence đúng revision.

## Shared motion

- Route veil: cover 0.75s, uncover 1s, `power4.inOut`; veil nằm dưới header,
  header xoá `is-hidden` khi bắt đầu chuyển route.
- Nếu route đổi từ full menu, menu reverse và route cover chạy đồng thời; URL
  chỉ commit sau khi cả hai hoàn tất.
- `pageshow.persisted` phải dọn dialog, page scale và route veil để Back/Forward
  từ BFCache không giữ state cũ.
- Header: collapse sau `100px`. Hide/show sau `150px` di chuyển có hướng chỉ
  trong middle region `0.5 × viewportHeight < scrollY < pageHeight - 1.25 ×
  viewportHeight`; ngoài vùng này reveal ngay. Chỉ `mousemove.screenY ≤350`
  được force-show; touch/pen không giả hover. Transition `1s`
  `cubic-bezier(0,0,.1,.99)`. Khi route đổi, `is-hidden` được xoá và header giữ
  nguyên trên veil.
- Generic media reveal: 0.6s `cubic-bezier(0,0,.26,1)`.
- Masked display line: 1.9s `power4.out`, stagger 0.1s.
- Hover media: scale 1.1–1.15 trong 0.6s.
- Desktop dùng Locomotive smoothing; mobile dùng native scroll.
- `prefers-reduced-motion` bỏ transform/autoplay không thiết yếu và không được
  để content ở trạng thái ẩn.

## Advertising photo browse

Photo browse Advertising là query-only view. Theo
[spec media-card](../specs/site-media-card-playback.md), supersession M02b
ngày 2026-09-30 bỏ morph card grid/related↔primary của AD-BROWSE-R1/P7.5.
Click, Back, Forward và chuyển giữa hai detail không tạo clone ảnh bay.
Đóng detail đánh dấu đúng một card vừa xem bằng lớp phủ tối và nhãn
`Vừa xem` / `Just viewed`; full reload xóa dấu.
History vẫn giữ media active và scroll riêng từng entry. Chỉ morph
primary↔enlarged viewer được giữ. Viewer UI-FRAME-R4 giữ nguyên URL và cuộn nền;
Escape chỉ đóng viewer trước khi photo history nhận phím. Reduced motion bỏ
animation của viewer; zoom/pan chủ động của người xem vẫn đổi tức thì.
Acceptance của flow này phải có evidence riêng, không dùng report route veil
hoặc carousel cũ.

Viewer dùng transform từ rect hero tới fit và ngược lại; zoom/reset nội suy
giữa fit, cover viewport và hai lần cover. Timing/easing và cách hủy khi
resize, đổi ảnh hoặc unmount do R4 của spec sở hữu. Pan theo con trỏ tức thì,
giới hạn theo kích thước ảnh đã phóng. Không đưa grid vào viewer morph và không
animate layout width/height
mỗi frame. Position motion của từng card do Masonry sở hữu; không thêm animation library.

P1.3: control Advertising vuông48px, icon nét1,5px. Expand neo phải; hover/
focus mở nhãn trong250ms, không scale glyph hoặc reflow ảnh. Hover đổi nền
150ms; reduced motion đưa duration về0. Bỏ Back riêng; navbar photo dùng
nguyên shared collapse/hide/reveal, không pin transform. Navbar từ detail
về grid của ảnh hiện tại; tại chính parent bấm lại mục đó về logical top và
giữ bộ lọc. Ba trang danh sách dùng cùng nhánh logo homepage, theo
[brand shell](../specs/frontend-brand-shell-responsive-runtime.md#navbar-p13).
Không tự thêm tween cuộn khác: logo hiện dùng setPageScroll tức thì cùng
phản ứng shell.

Correction owner 2026-09-11: viewer control có nền trắng đặc, hover #ddd,
active #c6c6c6; disabled dùng icon #91918c và không transition. Focus bàn phím
có viền riêng, không dùng hover thay focus. Thông số đầy đủ ở R4 photo browse.
Related giữ focus/anchor chỉ với card còn placement; khi mở ảnh đó thành
detail, chuyển focus sang mô tả và giải phóng card cũ sau cohort. Không đổi
duration400ms hoặc geometry để che lỗi card bị giữ ngoài layout.

Correction P6.2: source background của primary photo chỉ animate opacity và
transform; không animate CSS blur. Một shared glass surface phủ đều vùng dư với
`blur(28px) saturate(1.08) brightness(1.04)` và tint trắng alpha `0.12`.
Skeleton boundary tái dùng cùng surface, giữ global gradient mask riêng và lan
ngang tới hai mép viewport mà không đổi geometry grid; photo overflow không
tăng blur theo khoảng cách từ mép ảnh. Nút mở ảnh cân hai đầu trong tolerance
`1px`; icon mở/reset dùng cùng nét hai mũi tên chéo. Nút Back riêng của P6.1 bị
loại bỏ.

Skeleton CTA có ba frame rỗng/cột nối từ đáy geometry ảnh thật, cùng gutter.
P1.3 đặt toàn bộ rect chữ CTA trong continuation, sau max(bottom ảnh thật)
cùng gutter; kéo dài continuation nếu chữ/gap chưa vừa. Alpha nền frame0,28,
border0,40 bằng màu neutral hiện hữu; opacity0,42→0,16→0,04 và mask fade dọc.
Không focus/shimmer/catalog item; không dùng skeleton che hụt đuôi ảnh thật.
Chỉ dựng lại khi geometry đổi; scroll không thay node. Chữ giữ line reveal
1,9s power4.out, stagger0,1s, trigger khi in-view; reduced motion hiện ngay.

## SplitText editorial

Mapping tham chiếu được chốt theo vai trò trang, không phải sao chép source:

- Advertising Products tham chiếu Espacio `/en/projects`;
- Residential tham chiếu Espacio `/en/interior-design`;
- Commercial tham chiếu Espacio `/en/kitchens`.

Chỉ target khai báo bằng data attribute mới dùng SplitText; không tự split mọi
heading. Hero `h1` dùng word split, editorial `h2` nhìn thấy dùng line split và
scroll cue dùng character split. Không split body copy, navigation, filter,
card title, portal title hoặc nội dung `.sr-only`.

Motion type và timing giữ contract đã duyệt: line reveal `1.9s power4.out` với
stagger `0.1s`; word fade `1s expo.out` với stagger `0.2s`; scroll cue giữ loop
hiện hành. SplitText chỉ thay cơ chế chia text và lifecycle, không đổi kiểu
motion này.

Direct/F5 của Advertising Products phải giữ nguyên sequence text đã duyệt:
kicker bắt đầu ở `opacity: 0`, `x: -60px`, delay `0.9s`, rồi vào trong `0.6s`;
hero word fade dùng profile delay `0.6s`; filter bắt đầu ở `opacity: 0`,
`y: 20px`, delay `1.3s`, duration `1s`, stagger `0.15s`, `expo.out`. Initial
state của kicker phải có từ prepaint, trước khi runtime thêm `motion-enabled`,
để không flash final state. Catalog localization chỉ cập nhật text, URL và ARIA
trên filter node hiện hữu; không được replace node mà `detail.js` đã chọn cho
entrance tween. Reduced motion bỏ toàn bộ entrance và hiện final state ngay.

| Route | Word split | Line split | Character split |
| --- | --- | --- | --- |
| Advertising Products | `#page-title` | `#cta-title` | `[data-scroll-cue-label]` |
| Residential | `#page-title` | `#intro-title`, `#gallery-title`, `#process-title`, `#cta-title` | `[data-scroll-cue-label]` |
| Commercial | `#page-title`, `#process-title` | `#intro-title`, `#gallery-title`, `#cta-title` | `[data-scroll-cue-label]` |

Sáu trang con Advertising Products không tự nhận SplitText chỉ vì dùng chung
taxonomy. Target chỉ được thêm khi shared detail template có vai trò editorial
tương ứng và được ghi rõ trong data/template contract.

## Advertising motion

**Target accepted, chưa triển khai:**
[AD-FINAL-R1 C1–C2 và D7](../specs/advertising-final-polish-and-media.md) bổ sung
loop gradient xám và chuyển động XY nhẹ cho skeleton, pause theo visibility
và reduced motion. Chuyển động trang trí không chiếm transform của shuffle;
giữ nguyên contract interruption/cleanup của các ảnh thật. Evidence cũ không
nghiệm thu loop mới.

### Position morph

- `masonry-layout@4.2.2` và Outlayer là runtime re-layout/position-transition
  engine duy nhất; không giữ custom GSAP FLIP hoặc WAAPI FLIP song song.
- Trigger là coordinate diff của card đã render, không phải danh sách event cố
  định. Filter, resize, đổi số cột và mọi layout invalidation dùng cùng một
  Masonry instance và `.layout()` pipeline.
- P1.3: initial load/view-entry khởi tạo card visible window tại đầu cột
  đích, sau primary reservation nếu có, rồi dùng cùng position motion400ms
  tới organic coordinate. Origin có từ prepaint, không flash final rồi lùi
  lại. Scroll virtualization remount tại cached coordinate vẫn instant.
  Khi filter đổi, runtime giữ một motion cohort tạm thời gồm union
  của virtual window trước và sau, cộng card đang focus. Outgoing card bị ẩn ngay,
  không exit fade; survivor và incoming card được Masonry re-layout từ visual
  state trước tới tọa độ đích bằng transform `0.4s ease`, delay `0ms`, không
  stagger. Incoming card không được mount thẳng tại tọa độ đích nếu việc đó làm
  toàn bộ filter transition không còn transform.
- Motion cohort phải deterministic và bounded: trong `400ms`, DOM không vượt
  `oldWindow ∪ newWindow ∪ focused ∪ ảnh đang morph`; sau settle trở về normal virtual-window
  bound. Không giữ toàn bộ dataset trong DOM để mô phỏng Espacio.
- Coordinate không đổi không tạo motion. Mọi coordinate diff do filter, resize,
  đổi số cột hoặc layout invalidation hợp lệ đều đi qua cùng position-morph
  pipeline; không giới hạn trigger bằng danh sách event riêng.
- Scroll event đến trong position morph được giữ pending, không làm gián đoạn
  transform. Sau cửa sổ `400ms`, runtime chạy đúng một virtual-window render tại
  scroll position mới nhất; catch-up đó bounded và instant, không replay motion.
- Artifact vẫn sở hữu rank/order, intrinsic dimensions, optional
  `presentationCanvas`, optional `fitMode` và placement cache. Width card luôn
  là một cột; Masonry không tự đổi dữ liệu; coordinate/invariant mismatch phải
  fail QA.

### Media entrance và interaction

- Card shell không có viewport entrance. Chỉ composition ảnh foreground và
  backplate nếu có fade opacity `0 → 1` trong `0.6s ease-out`; card shell,
  anchor và caption giữ `opacity: 1`, không tham gia entrance.
- Lần đầu card vào viewport, nếu ảnh chưa sẵn sàng thì media giữ opacity `0` tới
  khi LazySizes unveil/load xong rồi mới fade. Nếu ảnh đã sẵn sàng từ cache hoặc
  load xong khi còn ngoài viewport, lần vào viewport kế tiếp vẫn phải fade.
- Media được re-arm chỉ sau khi card rời viewport hoàn toàn
  (`intersectionRatio = 0`). Lần tái vào sau đó phải replay cùng fade, kể cả khi
  ảnh đã cache hoặc card vừa được virtualization remount tại cached coordinate.
- Card còn giao viewport một phần không được re-arm; cuộn nhỏ lên/xuống trong
  trạng thái này không được restart transition. Card rời viewport không có exit
  motion; việc rời chỉ arm cho lần vào kế tiếp.
- State replay phải theo stable card id và trạng thái viewport hiện tại, không
  dùng module-level `revealed` set để cấm replay vĩnh viễn. Virtualization chỉ
  mount bounded overscan; card ngoài virtual window không được mount chỉ để tạo
  entrance.
- Hover desktop giữ zoom ảnh `scale(1 → 1.15)` trong `0.6s ease-out`; underline
  chạy `0.3s cubic-bezier(0.4, 0, 0, 1)`.
- Batch mới append atomic rồi nối từng card vào cột thấp nhất từ cached column
  bottoms. Prefix không đổi tọa độ nên không chạy lại motion; chỉ media mới được
  fade khi vào viewport. Cân đáy ảnh thật tuân R1 v7 của AD-BROWSE-R1;
  không ép các cột bằng nhau hoặc dùng skeleton che lỗi cân đáy.
- `prefers-reduced-motion` giữ cùng layout result nhưng position và media hiện
  tức thì, không setup hoặc replay media transition; filter không chờ animation.
- Scope position/media của P1.3 gồm parent và related của query photo tại
  `/vi/advertising-products/` và `/en/advertising-products/`. Sáu slug cũ giữ
  compatibility theo AD-BROWSE-R1; không tự mở redesign gallery ngoài flow.

### Visibility media trên sáu route chi tiết

- Hero và gallery của cả sáu slug, ở cả VI/EN, phải hiện ảnh sau khi media load
  trong direct load, Barba navigation và Back/Forward. Không route nào được còn
  nền trắng chỉ vì motion wrapper giữ `opacity: 0`.
- Theo behavior đã đo trên các trang con Espacio, wrapper phải reserve geometry
  và luôn ở final visible state; chỉ chính node `img` là motion/load target.
  Gallery không được đặt `data-motion-media` hoặc opacity gate trên `figure`.
- Ảnh dùng LazySizes và responsive source hiện có để bắt đầu tải trước khi chạm
  viewport. Nền placeholder trung tính phải hiện trong box đã reserve ratio từ
  lúc chưa tải; load chậm hoặc lỗi không được tạo vùng trắng hòa vào page.
- Motion readiness phải theo load target thật. Với ảnh, ready khi `complete` và
  `naturalWidth > 0`, hoặc khi chính node ảnh phát `load`; không được chờ `load`
  trên wrapper không có media lifecycle.
- Khi ready và in-view, ảnh fade `opacity 0 → 1` một lần trong `0.6s ease-out`,
  tương ứng class lifecycle `lazyload/lazyloading → lazyloaded` đã đo trên
  Espacio. Không replay khi ảnh rời rồi tái vào viewport; replay chỉ thuộc card
  ở catalog grid trang cha.
- Khi node ảnh phát `error`, wrapper giữ đúng geometry và chuyển sang placeholder
  trung tính ở final state; không chờ motion readiness vô hạn. Reduced motion
  bỏ transition và hiện ảnh hoặc placeholder ngay.
- Fix không đổi template layout, crop, copy, asset, gallery interaction hoặc
  position của block trên route chi tiết.

## Source và verification

- [P7.5](../specs/advertising-photo-browse.md#correction-p75--history-lingering-và-slideshow)
  ghi timing morph vào520ms/history400ms và background lingering1200ms trước
  khi [spec media-card](../specs/site-media-card-playback.md) thay morph card
  grid/related↔primary, gồm chuyển giữa hai detail; suggestion
  crossfade1.6s mỗi3s theo [supersession random](../specs/advertising-organic-random.md), zoom chỉ khi hover. Đây là delta TT được owner yêu cầu,
  không phải số đo Espacio. Reduced motion và pause tiếp tục là điều kiện chung.
- Shared shell: `src/site/motion.js`, `src/site/style.css`.
- Detail: `src/site/detail.js`, `src/site/detail.css`.
- Catalog: `src/site/advertising-products/catalog-runtime.mjs`.
- [Route integration](../specs/frontend-route-and-content.md#contract-motion),
  [Advertising QA](../specs/advertising-products-turnkey-services.md#kiểm-thử).

## Chú thích thuật ngữ

- **Choreography**: thứ tự và phối hợp các chuyển động.
- **Rendered state**: trạng thái browser đang hiển thị tại thời điểm interrupt.
- **Cohort**: tập card tạm giữ để hoàn tất chuyển vị trí.
