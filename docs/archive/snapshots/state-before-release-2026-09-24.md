# Trạng thái hiện tại

- Updated: 2026-09-24
- Owner selection24/09 đã tích hợp local:27 ảnh thêm và COCO BREEZE thay
  mobile-retail-05, tổng154 ảnh, dataset2026-09-24.1. Năm ảnh ChatGPT đã
  owner duyệt nằm trong28 lựa chọn cuối. Node34/34, build/static, hash/HTTP28/28
  và full-span VI/EN đạt. COCO/decal còn lỗi chữ nhỏ theo review độc lập;
  không tuyên bố5/5 đạt rubric. [Mapping và evidence](../source-assets/projects/advertising/owner-selection-20260924/README.md).
- `MENU-R1`: owner đã duyệt [spec menu mở](specs/full-menu-reference-parity.md)
  theo Espacio; giữ navbar đóng và nhận diện. Đã đo desktop/tablet/mobile;
  owner đã duyệt plan và CSS menu chung đã sửa. Geometry28, flow10, text200%2,
  static/build và Node7/7 đạt; chưa nghiệm thu thiết bị thật hoặc owner visual.
  [Evidence](verification/menu-reference-parity-2026-09-24.md).
- `AD-SEPT-2026-P7.5`: sửa đo nhầm footer khi chuyển route và giới hạn
  smooth-scroll cũ khi quay về grid. Navbar photo luôn về All: A giữ offset,
  B căn giữa; Back giữ entry. Sáu bộ lọc/reload giữ geometry. Background có
  lingering1200ms sau morph520/400ms; logo collapsed khôi phục49.640625px.
  Slideshow crossfade5s/1.6s đã chạy; thêm12 ảnh cho bốn nhóm thiếu, nguồn
  Audit/Critique12/12 đạt, catalog127 ảnh. Node35/35, return/CTA8 scenario,
  route/footer/filter và suggestion regression đạt. Owner chốt giữ12 ảnh mới
  ngày2026-09-24; thêm163 ảnh cho67 nhóm còn lại ngoài phạm vi đợt này.
  Owner visual, Galaxy A54 thật và full-site
  parity chưa đóng. [Evidence P7.5](verification/advertising-september-p7-5-2026-09-24.md).
- `AD-SEPT-2026-P7.4` sửa ưu tiên đã đạt focused regression: Back/navbar giữ
  grid nguồn và batch skeleton; native restore tức thời; suggestion bỏ nền
  dưới border; blur chạy sau morph; glass cong nhẹ và phủ trắng mép skeleton.
  CTA/footer/reload đã kiểm tại1567 và390, return tại1567 và920. Vạch màu lúc
  kéo scrollbar chưa tái hiện đúng. Nhánh navbar, slideshow, logo và case
  route-entry/footer được P7.5 tiếp tục và supersede.
  [Evidence P7.4](verification/advertising-september-p7-4-2026-09-23.md).
- `AD-SEPT-2026-P7.1/P7.2/P7.3` đã đạt focused technical gate trên local build:
  skeleton tiếp tục organic masonry, chỉ paint overflow qua logical grid; CTA
  và toàn footer nằm trong viewport cuối, Glassmorphism R10 giữ nguyên;
  suggestion ở primary info khi split, ở card đầu related grid khi full-span;
  hero one-shot theo document lifetime và navbar không reveal giả ở đáy.
  Portal/suggestion inactive giữ overlay đen `40%` khi hover; primary full-span
  cao theo ảnh và mô tả tự nhiên, tối đa phần viewport còn lại dưới navbar,
  glass chỉ dư hai bên khi ảnh buộc thu nhỏ. Navbar ẩn cả ba link nếu không đủ
  một hàng; resize full-span → split giữ suggestion dưới mô tả, không chồng.
  P14 browser `33/33`, layout/static Node `31/31`, P7.2/P7.3 ảnh ngang/dọc
  VI/EN, header bottom `12/12`, header one-line, hero, continuation, hover và
  build đều đạt. Owner visual,
  Galaxy A54 thật và P3-T08 còn mở; chưa commit/push/deploy. [P7.1 correction](specs/advertising-september-2026-p7-1-correction.md),
  [P7.2](specs/advertising-september-2026-p7-2-visual-adjustment.md),
  [P7.1/P7.2 evidence](verification/advertising-september-p7-1-p7-2-2026-09-23.md),
  [P7.3 evidence](verification/advertising-september-p7-3-2026-09-23.md).
- `AD-SEPT-2026-P7` đã đạt focused functional gate trên local build: hero
  one-shot giữ identity qua delayed adapter/filter; 12 preset dùng Scale 100 và
  mobile tối đa hai canvas; tail cuối chứa CTA cùng toàn footer trong một
  viewport; unified Glassmorphism full bleed kết thúc trắng; Pinterest primary
  dùng full-span/`100dvh` cố định/pager đa input và suggestion-first (chiều cao
  cố định đã được P7.2 thay bằng trần `100dvh`); shared header/menu
  cân CTA Zalo, X, logo và hamburger trên năm route. Node/static/build đạt;
  browser đạt P14 unfiltered `33/33`, header `10/10`, hero
  delayed/ready/fail-open/fallback và Chrome DevTools Galaxy A54 emulation
  `360×800`. Synthetic mobile performance đạt: headless median paint
  `60,046fps`, DevTools `79,816fps`, không long task; giữ gate `30fps` và tối
  đa hai context. Proof Galaxy A54 thật vẫn mở. Owner visual gate và P3-T08 còn
  mở; full-site parity vẫn NOT PASS; chưa commit, push hoặc deploy. Evidence:
  [P7 verification](verification/advertising-september-p7-2026-09-23.md).
- Capability map, `AD-SEPT-2026-P6`, P6.1 và correction P6.2 đã được owner duyệt
  ngày `2026-09-22`. Focused technical gate P6-T01–P6-T09, P6.1-T01–T05 và
  P6.2-T01–T03 đã đạt focused functional gate: dedicated photo Back bị loại bỏ; skeleton boundary và
  primary photo overflow dùng shared glass `28px/1.08/1.04/0.12`; skeleton
  glass lan tới hai mép viewport mà grid không đổi; photo source không giữ CSS
  blur; expand mở `156×48px` với text/path inset `18/17,5px`; icon
  expand/reset cùng ngôn ngữ. Footer gap `48/64px`, exact shared media-hover,
  portal type-fit VI/EN và skeleton global fade kết thúc trắng tuyệt đối giữ
  nguyên. Rủi ro P6 về 10 WebGL context đã được P7 giới hạn tối đa hai context
  trên mobile và đạt focused synthetic performance; Galaxy A54 thật vẫn cần
  đo. Owner visual gate và P3-T08 vẫn mở;
  chưa commit, push hoặc deploy. Evidence:
  [P6 verification](verification/advertising-september-p6-2026-09-22.md).
  Canonical: [capability map](specs/advertising-september-2026-capability-map.md),
  [footer shell](specs/frontend-brand-shell-responsive-runtime.md#correction-p61--giảm-shared-footer-top-gap),
  [portal](specs/frontend-landing-page-foundation.md#shared-media-hover--accepted-p6),
  [skeleton](specs/advertising-skeleton-flow.md#correction-r9-accepted--shared-glass-surface-với-photo-overflow),
  [photo P6.2](specs/advertising-photo-browse.md#correction-p62-accepted--shared-glass-control-cân-biên-và-bỏ-back)
  và [suggestion](specs/advertising-photo-browse.md#r12-accepted--suggestion-active-state-và-exact-shared-hover).
- Correction [AD-SEPT-2026-P5](verification/advertising-september-p5-2026-09-21.md)
  đã đạt technical gate: parent/detail dùng source-order shortest frontier,
  N4/span3 lấp liên tục cột 4, outer gap khớp top gap; portal/grid/suggestion
  dùng chung hover `1.15`/`600ms ease-out`; skeleton opacity-only với global
  boundary fade; backdrop xóa trắng đúng 25% foreground duration và linger
  `200ms` không giữ scroll. Layout 41/41 với 1.392 authored case, photo geometry
  3/3 trên 20 nhóm viewport, transitions 18/18, media virtualization 15/15 và
  media entrance/Barba/history remount 10/10. Static, exact browser, hash
  source/output và independent review đều đạt; không còn finding
  Critical/Important. WebGL context được giải phóng khi frame skeleton bị hủy.
  Owner visual gate và P3-T08 vẫn mở; chưa commit, push hoặc deploy.
- Correction Advertising mới đã hoàn tất P3-T01–P3-T07 ở local build: WebGL
  Flow đủ 12 preset, dev UI tạm thời qua `?skeleton-dev=1`, detail span3,
  viewer dùng chung zoom state, photo morph Back/Forward và CTA/nav reset.
  Focused technical gates, performance probe và independent review được ghi tại
  [evidence P3](verification/advertising-september-p3-2026-09-21.md). P3-T08
  vẫn mở để owner tune/duyệt JSON rồi xóa vật lý toàn bộ dev UI trước ship;
  chưa commit, push hoặc deploy.
- Owner đã duyệt [capability map Advertising tháng 09/2026](specs/advertising-september-2026-capability-map.md)
  và plan [AD-SEPT-2026-P2](../tasks/plan.md#ad-sept-2026-p2--correction-flow-morph-detail-và-logo).
  P2 hiện hợp nhất FIELD skeleton dùng chung, detail span2 một layout, gợi ý
  dưới mô tả, logo EN kế thừa metric VI, scroll lease cho photo morph, native
  Back/Forward, bỏ dải năng lực và CTA một viewport với skeleton `38,2%`, hoặc
  tối đa `28%` trên mobile/viewport thấp. Focused technical gates đạt; P13 photo
  transition cuối 10/10 và code review Astra/high không còn finding Important.
  Owner visual gate còn mở cho skeleton, logo VI/EN, CTA/detail và report ảnh;
  chưa commit, push hoặc deploy. Xem [evidence P2](verification/advertising-september-p2-2026-09-21.md).
- D17: bốn gợi ý phủ ngang info; split2×2, stacked ngang/wrap. VI/EN
  desktop/mobile và toggle giữ slot đạt; thay số lượng/bố cục D12/D16.
  Logo đã cân ink title2,25Y/subtitle0,95Y/gap0,8Y theo owner giao quyền
  cân size; khối4Y và khoảng tới mark/biên trên/dướiY giữ nguyên.
  Runtime21/21 và108 trạng thái font/viewport đạt, CODE review đạt;
  xem [evidence logo](verification/brand-lockup-logo-r3-2026-09-10.md#delta-logo-gọn-d17--2026-09-13).
- D15 đồng bộ card ảnh parent/detail qua factory và style dùng chung:
  hover/focus/reveal/lazyload, reduced motion không zoom; không đổi packing.
  Static, interaction VI/EN, toggle D14 và review CODE đạt.
- D14 đã sửa card duy nhất bị ép xuống dưới: N4/span3 đặt cột4 cùng hàng,
  miễn peek50px riêng trường hợp này; N2/N3 giữ peek. Unit và toggle VI/EN
  ba chu kỳ/locale, resize820px, native1569×912 và CODE review đạt; v13
  source/output khớp. Xem [D14](specs/advertising-final-polish-and-media.md#d14--correction-owner-một-ảnh-ưu-tiên-cột-4--2026-09-13).
- Footer toàn site đã đồng bộ theo owner chốt13/09: trụ sở/social/bản quyền,
  CTA riêng nằm ngoài footer. Bỏ chiều cao dư; static và28 trường hợp browser
  VI/EN/desktop/mobile/detail đạt. Native đo footer222/330px, bản quyền72px;
  xem [contract footer](specs/frontend-brand-shell-responsive-runtime.md#footer).
- Spec hợp nhất hiện hành: owner đã duyệt toàn bộ
  [AD-FINAL-R1](specs/advertising-final-polish-and-media.md) ngày 2026-09-11,
  gồm mốc cột 720/1005, ngưỡng ảnh gốc 1,8:1, ngoại lệ sparse, vị trí gợi ý,
  kính mờ, typography, motion và nhịp cuối CTA. Git sở hữu contract; plan và
  trạng thái T01–T14 ở [card hợp nhất](https://app.notion.com/p/3d8332849a0e8177ba63d3b965242c90),
  [index triển khai](../tasks/plan.md#ad-final-r1-p1--thiết-kế-triển-khai).
  Plan AD-FINAL-R1-P1 đã qua review độc lập ngày 2026-09-13,
  owner đã duyệt plan ngày 2026-09-13; T01 inventory/phân loại đã kiểm xong,
  Owner bổ sung13/09: bỏ reset “Xem lại các ảnh liên quan”, chuyển gợi ý vào
  phần mô tả và cần trạng thái toggle rõ; đã chốt một filter, bấm lại tắt
  và giữ ảnh detail. Nút gợi ý giữ ảnh nền, làm gọn và tự xuống hàng.
  Owner chốt bỏ title ở grid/detail; giữ mô tả và tag, không có tên riêng
  trong mô hình ảnh CMS tương lai; áp mọi dạng grid Advertising VI/EN.
  Bổ sung đã đồng bộ vào spec D8; source đang áp phần bỏ title/caption,
  focused browser VI/EN đạt, consumer kiểm thử đã sửa và review code đạt.
  P1.4 run mới20/29 còn oracle span cũ/settle/text200%; chưa nghiệm thu full UI.
  Gate M5: agent review đạt rồi
  owner duyệt đúng bản ảnh trước mọi tích hợp public mới/thay thế.
  D8-B đã chuyển gợi ý vào mô tả, native toggle bật/chuyển/tắt giữ photo,
  bỏ reset riêng; static, focused browser và review code R7 đạt.
  Owner đã giải quyết xung đột T02: D9 ưu tiên so le tối thiểu10%, không bắt
  buộc so le; được hàng thẳng khi cần. Solver v10 đã qua5 kiểm thử D9 và review
  code độc lập; giữ N/intrinsic và budget tổng300.000. R7 đã sửa lỗi mount
  EN mobile04/use-sampling bằng thử dải ảnh dưới primary sau khi xếp cạnh
  không đạt; giữ N, tail/peek và budget. One-column11/11 (1.320cases),
  layout14/14, native VI/EN và review code đạt; không là full T02/card PASS.
  Owner yêu cầu triển khai D10: mọi primary span min(3,N), thay span2
  đứng/vuông. D11 owner chốt luôn lộ khoảng50px ảnh thật ở đáy như trang
  parent, thay chiều cao tự nhiên; R8 geometry và Chromium16/16 gồm chữ200% đạt.
  D12 owner yêu cầu5 mục/5 dòng, giữ vị trí khi cùng photo, active chạy chuỗi
  ảnh related như hero homepage; off/hover khác active. R9 focused browser và
  review code đạt sau sửa active ngoài top5 và reduced-motion thay đổi trực tiếp.
  Owner ưu tiên T06/T07: CTA/skeleton/nhịp cuối đã triển khai; main chạy
  Chromium VI/EN desktop/mobile, hai chu kỳ và20mount đạt; CODE review đạt.
  D13 owner cho phép lệch đáy riêng pool2 để ưu tiên một ảnh cột4 và một ảnh
  nhô50px dưới primary; v12 đã qua unit/review/native counterexample, full
  pool giữ cân đuôi. Xem [checkpoint kết hợp](verification/advertising-grid-r4-2026-09-09.md#d10d13-cta-và-ba-ảnh-đã-duyệt--2026-09-13).
  Xem [evidence D9](verification/advertising-grid-r4-2026-09-09.md#d9--ưu-tiên-so-le10-2026-09-13).
  T08/T09 đã qua Checkpoint C kỹ thuật: logo10 consumer, runtime21/21,
  stress108+88states và native scroll/re-click4/4; owner preview còn mở.
  T10 đã chấm mới115public và50source theo rubric hiện hành; source có41
  đề xuất giữ/4sửa/5thay, còn mapping và nghiệm thu lô.
  Live EN115/115 hash đã chấm, không còn ảnh public chưa chấm.
  T11 biểnđườngV7 và samplingV2 chưa đạt; LEDV2 đã qua review chất lượng nguồn.
  Owner chỉ rõ11 file có noise/đốm/pattern lặp, gồm samplingV3 từng đạt;
  readiness samplingV3 bị thay bằng yêu cầu sửa, giữ review lịch sử.
  Bảng7 ảnh đã được owner phản hồi: trả lại samplingV6, quầy dừaR6 và flyer
  hiện hành; bốn bản còn lại vẫn pending. R2 tạo lại3 ảnh: sampling trong
  siêu thị đang hoạt động và flyer mới đã qua review độc lập. Quầy COCONUT
  GROVE R2 bị owner trả lại kiểu dáng: R3 giữ kiểu quầy Vị Dừa Quê cũ, đặt
  trong siêu thị đang hoạt động; review độc lập đạt9,75/9,5, main đã kiểm PNG.
  Owner tiếp tục yêu cầu xóa hai khách và nhân viên: R4 đã xóa cả ba,
  giữ quầy/siêu thị, review độc lập đạt10/9,5; main kiểm PNG/hash.
  Bản R4 thay ảnh3 trong bảng duyệt. Owner đã duyệt cả ba ảnh R4 packet
  ngày13/09: sampling-supermarket-v1, flyer mới và Coconut Grove không người.
  Exact hash/approval đã ghi owner-approval.json; ba WebP1536×1024 cũng
  qua preservation review độc lập và main kiểm hình/hash. Bundle giữ ở
  source-assets/projects/advertising/owner-correction-r2-20260913/webp-approved-r5/;
  Owner yêu cầu nhập các ảnh đã duyệt ngày13/09: ba WebP đã thay đúng public
  ID/URL, mô tả VI/EN và tag; sampling chuyển landscape theo1536×1024.
  Media17/17, geometry10/10, one-column11/11, static và HTTP exact hash3/3 đạt.
  Bảng duyệt: source-assets/projects/advertising/owner-correction-r2-20260913/owner-review.md.
  Biển đường R2 đã đổi hướng/cảnh nhưng3 lượt vẫn chưa đạt tỷ lệ/texture;
  dừng phương pháp tạo hiện tại, giữ 750×400mm và cột3.600mm.
  Chưa nhập public; bốn ảnh không bị sửa trong bảng cũ vẫn chờ owner duyệt.
  Cutoff 2026-09-12T20:27:38.613Z giữ95 file generated từ09/09;
  63 hash khớp hai acceptance manifest, quy về50 ID nguồn hiện hành;
  32 ảnh còn lại đã phân loại bằng ảnh và lịch sử revision.
  Ba candidate đã khôi phục exact generation/output hash từ session3/3;
  Terra/high review mới: tem nhãn đề xuất giữ, flyer và quầy sampling cần sửa
  theo brief gốc. Mapping/public derivative còn mở; không tự nhập theo điểm.
  Spec/plan review không phải bằng chứng UI PASS.
  Hàng tag detail đã bỏ theo owner, giữ tag URL/gợi ý/reset; xem
  [checkpoint](verification/advertising-grid-r4-2026-09-09.md#bỏ-tag-row-detail--2026-09-11).
- Phase: public website static-first trước CMS; source `src/site/`, output
  `.site-output/`. Worker/admin/D1/R2 dormant hoặc dev; Wrangler khóa đến CMS.
- Active work: [card Advertising](https://app.notion.com/p/3d6332849a0e8124af03c79f3c2e8406)
  giữ In progress. Owner đã duyệt spec và plan P1.3; T1–T9 đã triển khai,
  [nghiệm thu kỹ thuật scoped](verification/advertising-grid-r4-2026-09-09.md#p13-checkpoint-c-và-nghiệm-thu-kỹ-thuật-2026-09-11)
  đạt: Node47/47, geometry/chữ200%16/16, transition9/9, one-column6/6,
  scrollbar6/6, sweep76 cửa sổ và header19/19 thường +19/19 scrollbar.
  Viewer ba engine giữ run đầu141/146 cùng các retest đã PASS; không đổi
  report cũ thành một lượt146/146. Không dùng scoped PASS thay full-site gate.
  [Photo browse](specs/advertising-photo-browse.md) giữ109 ảnh, grid một cột,
  policy v7 so le0,20/cân đáy/budget300.000. Geometry P1.3 span1–4 đã được
  delta P1.4 thay theo card mới bên dưới. Gợi ý16/24px, banner103px; CTA grid nằm trong
  skeleton, motion400ms và morph giữ identity. Photo bỏ Back, navbar dùng
  shared behavior; parent re-click về top giữ bộ lọc. Source/output đã đối chiếu.
  Preview VI/EN đã gửi vào Codex, tool trả queued; owner spot-check còn mở.
  [Correction owner](verification/advertising-grid-r4-2026-09-09.md#correction-shuffle-và-trạng-thái-viewer--2026-09-11)
  đã sửa retention card focus gây shuffle chồng hero và tăng phân biệt trạng
  thái viewer. Native-click regression4/4, control PASS, viewer quick2/2;
  transitions cuối10/11 với CTA retest1/1, không gọi một run11/11.
  Owner yêu cầu tách đợt interview mới sang
  [card detail 3/2 cột](https://app.notion.com/p/3d7332849a0e81dcaf93ee8955892b26).
  Intent card mới đã được owner chốt: span3 ngang/span2 dọc và vuông,
  nền ảnh blur, tỷ lệ ngang61,8/38,2 và đứng50/50 linh hoạt. Chữ giữ một luồng,
  dàn gọn và chỉ được giảm riêng cỡ title. CTA sẽ chuyển vào góc dưới trái ảnh,
  tương tác như expand ở góc dưới phải; owner đã chốt vị trí này.
  Owner đã yêu cầu bắt đầu triển khai delta P1.4 ngày2026-09-11; main và
  worker đã hoàn tất geometry, UI/CTA và browser regression theo
  [scope P1.4](specs/advertising-photo-browse.md#delta-p14--scope-owner-yêu-cầu-triển-khai-ngày-2026-09-11).
  Owner giữ navbar hiện hành; primary cao tự nhiên,
  vừa viewport ở top và lộ ảnh thật bên dưới. Khoảng navbar và dải ảnh lộ
  được đề xuất theo [khảo sát](verification/advertising-grid-r4-2026-09-09.md#khảo-sát-khoảng-navbar-và-chiều-cao-tự-nhiên--2026-09-11);
  [evidence P1.4](verification/advertising-grid-r4-2026-09-09.md#p14--detail32-mô-tả-và-cta-trong-ảnh--2026-09-11)
  ghi Node30/30, browser normal29/29, sweep76 viewport và viewer quick3/3.
  Review độc lập đóng3/3 findings. Transition giữ10/11 và CTA retest1/1;
  không gọi một run11/11. Preview VI/EN queued, chờ owner spot-check.
  [LOGO-R3](../DESIGN.md#brand-lockup--nguồn-chuẩn) giữ footprint/SVG và
  [evidence riêng](verification/brand-lockup-logo-r3-2026-09-10.md); correction
  clearance navbar P1.3 không tự đóng owner check logo.
  [Thư viện ảnh](verification/advertising-images-audit-2026-09-09.md) có50 record,
  49 đạt gate; biển đường V6 theo brief cột3.600mm còn finding tỷ lệ mặt biển.
  Mapping ảnh mới và CTA toàn site chưa nghiệm thu, không tự đóng card.
  [Reference Pinterest](reference/pinterest-photo-view.md) và
  [nghiên cứu khách hàng](reference/advertising-client-products.md) giữ nguồn đo;
  không gọi emulation hoặc quy tắc golden đã duyệt là Pinterest1:1 mọi thiết bị.
- Website accepted scope: Advertising có 109 media theo 24/16/22/13/18/16,
  photo view, related/tags và compatibility cho sáu slug cũ theo
  [photo browse](specs/advertising-photo-browse.md). Baseline đã kiểm dùng
  shared policy v7; source candidate hiện là v10 với metric caption-v2 sau D8-A/D9,
  chưa đạt toàn bộ T02. Owner spot-check vẫn mở.
  [Verification index](verification/index.md) dẫn scoped evidence, không là
  fresh runtime run của docs task.
- Hard boundary: sáu thẻ được owner yêu cầu thực hiện và phần grid/media owner
  bổ sung trong cùng session; không redesign ngoài
  accepted scope, không chạy lại canonical parity hoặc Graphify semantic extraction,
  không commit/push/deploy. Sửa website phải mở local preview cho owner.
  CMS/provider/publication cần scope và owner approval riêng.
  Sau phần việc hiện đã được duyệt, trước mỗi card Notion còn tồn phải nêu
  tên/phạm vi/kết quả rồi dừng chờ owner duyệt riêng từng card.
- Verified website blocker: full `pnpm qa:site` và canonical Espacio parity
  vẫn `NOT PASS`. [Machine parity](reports/research-espacio-layout-motion-parity.md)
  giữ fail/blocked/unmapped; Commercial reduced-motion gap ngoài Advertising.
  Không dùng subset PASS thay verdict toàn site.
- Human acceptance còn mở: spec/plan P1.3 đã duyệt và technical gate đã đạt;
  owner kiểm preview VI/EN. Logo R3 và phạm vi ảnh/CTA còn lại thuộc card cũ,
  nên card cũ chưa Done. Card mới đang thực thi theo yêu cầu owner;
  focused technical P1.4 đã đạt, preview chờ owner nghiệm thu.
- Tooling snapshot: pnpm 12.4.2, Impeccable CLI 4.1.0/skill 4.3.1/engine 0.1.4,
  54 managed global skills; custom orchestration skill retired 2026-09-23;
  [major migration evidence](archive/reports/verification-pnpm-impeccable-major-2026-09-08.md).
  [evidence cài đặt lịch sử](archive/reports/verification-superpowers-codex-2026-09-08.md)
  được giữ để truy nguyên; routing hiện hành dùng native Codex và effective route
  chỉ ghi khi runtime quan sát được.
  Graphify semantic pending tại preflight docs; không extraction.
- Canonical knowledge: [docs routing](index.md), [architecture](architecture/index.md),
  [frontend](frontend/index.md), [backend](backend/index.md), [design](design/index.md),
  [baseline Espacio](reference/espacio/index.md), [decisions](decisions/index.md).
  PRODUCT/DESIGN giữ root; Impeccable extensions giữ `.impeccable/`.
  Espacio corpus `ESPACIO-R1-20260902` là candidate revision có provenance;
  chưa có owner decision riêng khóa exact ID/cutoff thành baseline revision.
- Notion boundary: status/planning ở Notion; accepted contract/evidence ở Git.
  Một link lịch sử trả 404 chưa rõ permission/deletion; hub/card Advertising có
  content drift đã ghi trong [Notion guide](operations/notion.md).
- Next repo action: owner mở Advertising local với `?skeleton-dev=1`, tune hoặc
  chọn một trong 12 preset rồi Export JSON. Sau khi owner duyệt JSON, chạy
  P3-T08 để đưa config vào source và xóa dev UI; không tự mở canonical parity,
  CMS, commit, push, deploy hoặc publish ảnh chưa duyệt.

## Chú thích thuật ngữ

- **Static-first**: phát hành website tĩnh trước phần dynamic.
- **Dormant**: source có nhưng capability chưa activate.
- **Canonical**: nguồn chuẩn cho contract hoặc evidence.
- **Parity**: mức khớp reference trong scope đo.
- **Preservation**: giữ original và khả năng truy nguyên.

