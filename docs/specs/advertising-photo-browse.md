# AD-BROWSE-R1: Grid và detail ảnh Advertising

**Delta accepted hiện hành:** [AD-FINAL-R1](advertising-final-polish-and-media.md)
được owner duyệt ngày2026-09-11. D1–D7 thay ngưỡng ratio, số cột related,
placement suggestion, ngoại lệ sparse và nền dư; C1–C5 thay continuation/copy/hero.
Những rule P1.4/v7 bên dưới trái delta này chỉ còn mô tả phiên bản đã triển khai
trước; không phục hồi fallback giảm N. Plan đã được owner duyệt; source/evidence
hiện tại chưa chứng minh toàn bộ AD-FINAL-R1 đạt. Correction D8 bỏ title và chuyển
suggestion vào mô tả; D9 ngày2026-09-13 thay gate so le0,20 bằng ưu tiên so le từ0,10,
cho phép hàng thẳng sau nhánh tìm kiếm ưu tiên. Anti-brick không chặn hàng thẳng
ở nhánh này. D10/D11 ngày13/09 dùng primary min(3,N) cho mọi ratio và luôn
chừa khoảng50CSSpx ảnh thật ở đáy viewport; thay span3/2 và chiều cao tự nhiên
P1.4. D12 dùng5 dòng suggestion cố định, chỉ mục active chạy chuỗi ảnh related;
bật/tắt không đổi vị trí các mục. Các contract ngoài delta giữ nguyên.

**Trạng thái:** Spec gốc, plan AD-BROWSE-R1-P1 và delta AD-BROWSE-R1-P1.1 đã được owner duyệt ngày 2026-09-10. Policy một cột cho cả hai masonry và bỏ lựa chọn Auto/1/2 đã triển khai, qua focused integration G1; [evidence v6](../verification/advertising-grid-r4-2026-09-09.md#ad-browse-r1-p11--policy-một-cột-2026-09-10) giữ số đo và hash. Các correction viewer/detail và ngoại lệ crop ô nhãn R6 giữ theo yêu cầu trực tiếp. Owner spot-check VI/EN và các phần còn lại của card không tự đóng.

**Phạm vi:** public Advertising VI/EN: masonry, mở một ảnh, related masonry, history, motion, nhãn chi tiết và một CTA trong flow; P1.3 thêm shared navbar re-click về top trên ba trang danh sách.
**Ngoài slice ưu tiên:** logo/global CTA toàn website, CMS, deployment, redesign route ngoài Advertising và các card Barba không cần cho flow này.

Nguồn approval: owner gửi “duyệt” kèm [card Advertising](https://app.notion.com/p/3d6332849a0e8124af03c79f3c2e8406) ngày 2026-09-10. Snapshot trước approval ở `.tmp/orchestration/advertising-feedback-20260910-floor-name-led/approved-notion-snapshot.md`, section `Spec đề nghị AD-BROWSE-R1`, vẫn giữ wording draft để truy nguyên. Bản này chuyển quyết định đã duyệt từ Notion sang Git canonical theo governance.

**Bổ sung sau preview v6 ngày 2026-09-10:** owner xác nhận ngưỡng so le
`0.20 × chiều cao vùng ảnh lớn nhất liền kề`, không tính caption; cân đáy cột
và skeleton rỗng nối tiếp trong masonry rồi fade trước chữ CTA có motion. Owner
yêu cầu nút Advertising vuông, hover có motion, đổi icon reset và làm rõ
đường về danh sách từ detail; nút chỉ hiện icon, hover mới mở chữ theo lựa
chọn owner. Owner đã duyệt P1.2; source v7 qua focused technical gate, owner
spot-check còn mở. Owner tiếp tục duyệt related tự giảm số cột khi
cần. Source v7 thử từ số cột responsive xuống một cột trong cùng budget
300.000; không hạ ngưỡng 0,20. PASS P1.1 không bao phủ delta này.

**Delta P1.3:** owner duyệt spec ngày 2026-09-11 bằng “duyệt” sau khi review
bản `Delta spec AD-BROWSE-R1-P1.3` trong cùng card. Các contract P1.3 tại
R2/R3/R4/R6 và G7 là target accepted; plan P1.3 đã được owner duyệt.
T1–T2 và [checkpoint A](../verification/advertising-grid-r4-2026-09-09.md#p13-checkpoint-a--geometry-và-gợi-ý-2026-09-11)
đạt focused gate; T3–T4 và [checkpoint B](../verification/advertising-grid-r4-2026-09-09.md#p13-checkpoint-b--chuyển-vị-trí-và-mở-ảnh-2026-09-11)
đã đạt motion/click gate. T5–T9 đã hoàn tất theo
[checkpoint C và nghiệm thu kỹ thuật](../verification/advertising-grid-r4-2026-09-09.md#p13-checkpoint-c-và-nghiệm-thu-kỹ-thuật-2026-09-11);
owner spot-check VI/EN còn mở. Evidence gồm các lượt kiểm lại theo phạm vi
ảnh hưởng, không là một lần chạy full-site mới.
Các gate v7/P1.2 giữ baseline, không chứng minh delta mới đã đạt. Quyết định
bỏ Back của P1.3 thay phần control Back trong feedback v6/P1.2 ở trên.

## Mục tiêu

### Delta P1.4 — scope owner yêu cầu triển khai ngày 2026-09-11

Owner chốt intent tại [card detail3/2](https://app.notion.com/p/3d7332849a0e81dcaf93ee8955892b26)
và yêu cầu trực tiếp “ok bắt tay vào làm”. P1.4 thay geometry P1.3, vị trí CTA
và ngoại lệ nền blur; các phần còn lại giữ contract hiện hữu. Thông số thực
thi do main cụ thể hóa từ intent. Implementation và focused verification
theo [evidence P1.4](../verification/advertising-grid-r4-2026-09-09.md#p14--detail32-mô-tả-và-cta-trong-ảnh--2026-09-11);
owner preview còn mở, không suy focused PASS thành full-site PASS.

- Ratio ngang>1,10: span min(3,N), ảnh trên và chữ dưới; đứng/vuông/gần vuông:
  span min(2,N), ảnh trái và chữ phải50/50. Nửa chữ dưới240px thì stack, giữ
  span. Không đổi band theo window ratio.
- Navbar giữ nguyên. Top canvas cách đáy navbar expanded một gutter15/25/35px.
  Primary cao tự nhiên, cap ở Vh−top−gutter−clamp(48px,8vh,96px)−safeBottom,
  xử lý safe area một lần. Related còn ảnh thì phải có phần ảnh thật bên dưới
  primary lọt vào viewport; chỉ có ảnh bên cạnh hoặc banner không đủ.
  Candidate thiếu dải ảnh thật thử N thấp hơn trong cùng budget300.000.
  Khi chỉ còn một cột, suggestion đặt ngay sau ảnh đầu tiên; các ảnh sau giữ gutter
  quanh reservation này. Suggestion không trở thành media giả trong solver.
- Chia vùng ưu tiên: ngang61,8/38,2 chiều cao, đứng50/50 chiều rộng sau gap16px.
  Đo chiều cao chữ tại chiều rộng thật rồi phân bổ linh hoạt; chỉ scroll khi
  nội dung thực sự vượt vùng khả dụng. Giữ một luồng category/title/body;
  owner bỏ hàng nhãn dưới mô tả ngày 2026-09-11 vì trùng với “Có thể bạn thích”.
  Metadata/tag URL và bộ lọc suggestion vẫn hoạt động; nút reset chỉ hiện khi đang lọc.
  title dùng cấp2rem/weight600, không giảm body/tag hoặc font theo overflow.
  Tính lại khi font load, resize hoặc cỡ chữ đổi ngay tại cùng viewport.
- Foreground contain trọn ảnh, đúng ratio. Nền trùng ảnh cover blur lấp vùng
  còn dư, chỉ trang trí, bị clip trong vùng ảnh, không focus/pointer/alt hoặc
  tham gia morph. Không đổi ảnh masonry hoặc fullscreen viewer.
- CTA hiện hữu chuyển vào vùng ảnh dưới trái, expand dưới phải; chung nút
  vuông48px/glyph22, icon thường và label mở khi hover/focus. Giữ nhãn VI/EN,
  href/target/rel/action CTA, không nhân đôi hoặc để click CTA mở viewer.
  Touch/keyboard kích hoạt trực tiếp, nhãn mở không che control bên kia.

Nghiệm thu P1.4 dùng geometry/DOM/ảnh chụp: fit/topgap/actual-photo-peek,
foreground ratio, normal-copy không cuộn thừa, long-copy và text200% truy cập
đầy đủ, native click/keyboard/hover CTA, related/photo/history/viewer regressions.
Giữ G1/v7 organic0,20/cân đuôi/budget300.000, suggestion, navbar và motion.
Những công thức P1.3 bên dưới giữ để truy nguyên; nếu mâu thuẫn, P1.4 thắng
trong phạm vi geometry/ảnh/chữ/CTA nêu trên. Focused PASS không là full-site PASS.

Khách tìm mẫu sản phẩm trong sáu nhóm, mở một ảnh để xem rõ, xem ảnh related và quay lại đúng ảnh cùng vị trí. Masonry, detail, related và phục hồi history dùng chung photo identity và state.

Giữ nền trắng, Plus Jakarta Sans, khung ảnh vuông góc, caption và khoảng cách theo design system. Pinterest chỉ là reference cho bố cục/hành vi. Không thêm pin, bình luận, tài khoản, bảng lưu, giá hoặc thông số chưa có dữ liệu.

Không tạo trang nội dung category mới. Detail là view của parent Advertising. Catalog public hiện có 109 media; thư viện nguồn được quản lý riêng tại [manifest ảnh](../../source-assets/projects/advertising/taxonomy-20260910-review/acceptance.json). Implementation không hard-code số lượng hoặc tự thay toàn bộ pool public bằng thư viện nguồn.

## Contract hành vi

### R1 — Ảnh rộng một cột, xếp organic

Owner bổ sung ngày 2026-09-10 sau khi có detail/viewer: ảnh thumbnail không
cần rộng hai cột. Qua interview, owner xác nhận áp dụng cho **cả masonry parent
và related masonry**. Quyết định này thay phần chọn span 1/2 của Auto ở
AD-BROWSE-R1 và Task 2.1 cũ; không hủy evidence của phiên bản Auto v5 trước đó.
Source dùng policy một cột v7; trạng thái nghiệm thu ở [verification](../verification/advertising-grid-r4-2026-09-09.md).

- Mọi ảnh sản phẩm chiếm đúng một cột ở mọi viewport; chiều cao tính từ tỷ lệ intrinsic, không đặt chiều cao đồng loạt. `imageWidth = W`, `imageHeight = W * intrinsicHeight / intrinsicWidth`. Public flow không để Auto hoặc literal span 2 làm ảnh rộng hơn một cột.
- Owner xác nhận bỏ cả ba lựa chọn Auto / 1 cột / 2 cột khi chuyển sang policy này. Không giữ dropdown, nút hoặc trường chỉnh span chỉ còn một lựa chọn. Nội dung ảnh mới không phải gán `layoutSpan`; bỏ thiết lập/ngưỡng Auto chỉ dùng để chọn độ rộng. Contract CMS tương lai cũng không cung cấp lựa chọn này; không triển khai CMS trong slice hiện tại.
- Giữ outer band, gutter, content cap và caption theo DESIGN. Parent giữ số cột responsive 2–4. Related thử số cột responsive trước, chỉ giảm sau khi search có giới hạn không tìm được layout đạt gate; tối thiểu một cột, theo approval owner ngày 2026-09-10. Đo lại khối nhãn và vùng primary khi chiều rộng cột đổi. Không overlap, crop, kéo méo, mất/trùng ảnh hoặc horizontal overflow.
- Owner sửa gate stagger cho cả parent/related: mép dưới khung ảnh gần nhất ở hai cột kề lệch ít nhất `0.20 * max(imageHeightA, imageHeightB)`, gồm terminal frontier. `imageHeight` là chiều cao vùng ảnh đang hiển thị, không gồm caption. Ví dụ ảnh cao 400/600 CSS px cần lệch tối thiểu 120 CSS px. Quy tắc này thay `0.25 * W` và đề xuất tạm `0.25 * imageHeight`; giữ anti-brick và tie-break theo [patterns](../design/patterns.md#advertising-masonry-geometry). Không thêm spacer/filler, giãn gutter hoặc sửa tỷ lệ để giả so le.
- Thuật toán được chọn lại thứ tự và vị trí để đạt organic, đồng thời ưu tiên lấp đầy các cột tới đoạn cuối trong các candidate đã đạt gate. Không để một cột kết thúc quá sớm tạo vùng trống dài như preview EN v6; không ép các đáy bằng nhau trái gate so le. Đo phần thiếu ở đáy trên ảnh sản phẩm thật, trước phần skeleton CTA. Kết quả deterministic theo cùng dữ liệu/viewport/settings. Không gọi search hữu hạn là tối ưu toàn cục.
- Cân đáy trên cùng hệ tọa độ: chênh lệch đáy card ảnh thật cuối mỗi cột không vượt chiều cao card cuối lớn nhất cộng gutter. Không trừ seed riêng từng cột; loại khối nhãn và cột chỉ dành cho primary khỏi tập ảnh thật. Khi đủ ảnh thì mọi cột phải có ảnh thật. Related có thể giảm cột để đạt điều kiện này.
- Tái dùng `layout-core.mjs`, oracle độc lập và tổng operation budget 300.000 cho mọi lượt thử số cột; không tạo solver thứ hai. Search hữu hạn thất bại không chứng minh số cột đó bất khả thi về toán học hoặc số cột trả về là lớn nhất khả thi. Ngoại lệ bridge span 2 của GRID-R4-B1 không còn áp dụng cho các ảnh một cột.
- Runtime parent/related và preflight build phải áp cùng policy một cột; không để build chỉ kiểm Auto v5 trong khi public render policy khác. Các record/span lịch sử vẫn giữ provenance; policy hiển thị không sửa file ảnh hoặc intrinsic metadata.

Dữ liệu Auto/1/2 cũ chỉ phục vụ truy nguyên hoặc đầu vào tương thích; không còn
là tùy chọn được chỉnh và không ảnh hưởng geometry mới. Một giá trị span 1 nội
bộ mà solver cần là chi tiết tính toán, không phải trường người dùng phải chọn.

### R2 — Detail và responsive layout

Click ảnh mở detail cùng parent Advertising, không qua transition toàn trang
Barba. Primary dùng span1–4 và luôn vừa vùng nhìn dưới navbar expanded tại
đầu trang. Related lấp vùng trống bên cạnh và tiếp tục bên dưới; full-span
được đưa related xuống dưới. Các thông số P1.3 sau thay primary cố định2/3cột,
split50/50 và cách để mô tả dài làm toàn khối cao thêm.

#### Hình học P1.3

Các thông số và quy tắc dưới đây thuộc delta spec P1.3 đã được owner duyệt ngày 2026-09-11; approval chưa phải evidence đã triển khai.

1. Tính theo CSS viewport thực: Vw là documentElement.clientWidth, Vh là phần nhìn dọc thực của cửa sổ. Đo navbar ở trạng thái mở đầy đủ tại đầu trang, gọi Hnav; không lấy chiều cao navbar đã collapse để nới primary. Breakpoint CSS của header dùng window width gồm thanh cuộn; không dùng Vw của grid để suy ra padding header. Dải kiểm320–2560px gồm scrollbar, cửa sổ ngang/dọc và các ngưỡng shell. Không dùng tên thiết bị/UA để chọn layout.
2. Giữ nguyên hàm spacing, số cột và cap1500px của lưới TT. Với outer O, gutter G và N cột: Wgrid=min(Vw−2O,1500); C=(Wgrid−(N−1)G)/N. Mỗi ảnh sản phẩm vẫn rộng C. Primary thử S từ1 đến min(N,4), W(S)=SC+(S−1)G. S=N hợp lệ, related bắt đầu bên dưới.
3. Đặt primary tại Y=Hnav+16+safeTop chưa được shell tính. Trần Hcap=Vh−Y−16−safeBottom chưa được shell tính; không trừ safe area hai lần. Lấy kích thước final của navbar expanded, không đo một frame giữa animation. Khi chỉ cuộn làm navbar collapse/hide, không nới/co primary theo từng frame. Khi đổi chiều cửa sổ, resize thật hoặc browser zoom thay CSS viewport, tính lại từ expanded shell tương ứng.
4. Đặt a=(sqrt(5)−1)/2≈0,618034 và b=1−a. r=media.width/media.height. r<0,90 ưu tiên trái–phải; r>1,10 ưu tiên trên–dưới. Trong band đóng[0,90;1,10], T=clamp(Vw/Vh,0,90,1,10): r<T chọn trái–phải, còn lại trên–dưới. So sánh bằng giá trị thật, không làm tròn ratio. Nếu không span nào cho phần mô tả trái–phải rộng ít nhất240px thì toàn lượt chọn chuyển sang trên–dưới.
5. Trái–phải: trừ gap16 trước khi chia. Vùng ảnh rộng a(W−16), vùng mô tả rộng b(W−16); H=min(Hcap,a(W−16)/r). Loại span có mô tả dưới240px. Cả hai vùng cao H; mô tả dài cuộn riêng.
6. Trên–dưới: H=min(Hcap,W/(r·a)+16). Vùng ảnh cao a(H−16), vùng mô tả cao b(H−16), cùng rộng W. Loại span có W<min(240,Wgrid). Không ép chiều cao ảnh gốc theo khung; tính ảnh contain trong vùng ảnh.
7. Ảnh thật nằm giữa vùng ảnh: Iw=min(vùngẢnhW,r·vùngẢnhH), Ih=Iw/r. Frame ôm đúng Iw×Ih, loading surface chỉ trong frame, phần dư ngoài frame cùng nền trang; không crop, kéo méo hoặc tạo dải nền tối. Nút expand neo góc dưới phải của frame ảnh thật.
8. Trong các span hợp lệ, chọn diện tích ảnh thật Iw·Ih lớn nhất; nếu chênh không quá1 CSS px² thì chọn span nhỏ hơn để dành thêm chỗ cho related. Không ưu tiên số chữ để đổi span, không random theo photo ID và không đổi layout liên tiếp sau khi đã chọn. Quy tắc này có thể chọn span4 khá thường với ảnh đứng trên desktop; đây là hệ quả của quy tắc ưu tiên ảnh lớn đã chốt.
9. Related thử N responsive hiện hành trước. Nếu bộ ảnh không đạt gate organic/cân đáy trong budget v7, giảm N rồi tính lại C/span/primary/suggestion từ đầu; tối đa các giá trị N hiện hữu xuống1, không tăng trở lại trong cùng lượt. Tổng công việc vẫn bounded theo budget đã khóa; không dùng fallback để giảm số cột parent. Khi S=N, reserve cả bề rộng tới H+G rồi mới xếp related.
10. Mô tả dùng overflow-y:auto và min-height:0 trong vùng được chia. Giữ nguyên cỡ chữ/CTA/tag hiện hữu, không thu toàn bộ UI để giả vừa màn hình. Nội dung cuối và CTA phải chạm tới bằng wheel/touch/keyboard; không scroll trap, có accessible region và focus thấy được. Hình học vừa viewport không đồng nghĩa toàn bộ mô tả phải hiện đồng thời. Khi cửa sổ cực thấp không còn diện tích hữu dụng bên dưới navbar, ưu tiên nội dung truy cập được; ghi trường hợp không thể đạt vật lý, không tự báo PASS. Acceptance chuẩn có chiều cao từ320px và kiểm resize/zoom riêng.

#### Viewer và điều hướng

- Nút `Xem lớn hơn` / `View larger` nằm trong góc dưới phải khung ảnh: trạng thái thường gọn chỉ hiện icon, hover mở rộng nút để lộ nhãn bằng motion và thu lại khi rời chuột. Nút vẫn dùng được bằng touch/keyboard, có accessible name khi nhãn ẩn; không cần hover hoặc tap lần đầu để kích hoạt chức năng.

- Nút mở dialog phủ toàn cửa sổ trên nền tối. Ảnh ban đầu fit vùng nhìn, giữ toàn bộ ảnh. Ba nấc zoom: fit → cover viewport → 2 × cover; tăng/giảm có giới hạn, không dùng một trần phần trăm cố định cho mọi ratio. Khi tới mức tối đa, hiện reset về fit và tâm ảnh. Control 48 CSS px: đóng trên trái, reset/+/− xếp dọc dưới phải, khoảng cách 8 px và inset 16 px cộng safe area cần thiết. Các nút trong Advertising dùng góc vuông, thay ngoại lệ nút tròn của viewer v6. Đóng, zoom và reset có phản hồi hover bằng motion; icon reset phải cùng nét và ngôn ngữ hình học với cụm nút. Hiệu ứng và icon giữ baseline vuông đã kiểm cùng timing R4; khi verify phải đối chiếu reference, không tự đổi ngôn ngữ thiết kế. Dialog không thêm business CTA.

- Dialog giữ URL/history/tag/category, khóa cuộn nền và cô lập focus. Đóng bằng nút, Escape hoặc chạm/click nền ngoài ảnh trả về đúng nút mở và vị trí cuộn; cử chỉ vuốt hoặc kéo bắt đầu trên nền không đóng dialog (L06, 04/10). Escape trong dialog chỉ đóng dialog; không đồng thời lùi detail. Khi đổi route/photo hoặc unmount phải dọn dialog/scroll lock/listener.

Navbar detail dùng nguyên shared collapse/hide/reveal; không ép luôn hiện.
Không có nút Back riêng. Mục Advertising không active underline khi đang xem
photo; click về parent theo R3. Browser Back/Forward và Escape giữ history;
đóng viewer chỉ trở về detail. Hành vi shared navbar gồm re-click về top do
[brand shell](frontend-brand-shell-responsive-runtime.md#navbar-p13) sở hữu.

#### CTA trong continuation

CTA parent nằm trong vùng skeleton, sau đáy ảnh thật cuối cùng cùng gutter;
không tách chữ sau một khoảng trống dài hoặc đè ảnh thật. Giữ ba frame rỗng
mỗi cột nối từ đáy thực, cùng chiều rộng/gutter. Nền frame dùng alpha0,28 và
border0,40 của màu neutral TT hiện hữu, giữ opacity0,42→0,16→0,04 cùng mask
fade dọc. Toàn bộ rect chữ CTA phải nằm trong vùng continuation; nếu chữ/gap
không vừa, kéo dài continuation, không giảm chữ hoặc đẩy chữ ra ngoài vùng.

Giữ copy `Dấu ấn tiếp theo, dành cho thương hiệu bạn.` / `Trao đổi ý tưởng`
và đúng một business CTA mỗi view. Chữ dùng masked line1,9s power4.out,
stagger0,1s khi in-view. Skeleton aria-hidden, không focus/shimmer/catalog
item; không được dùng để che hụt cột ảnh thật. Khối quy trình nằm sau CTA.
CTA detail ở trong vùng mô tả và phải cuộn tới được. Rà CTA toàn website
vẫn là phạm vi độc lập.

### R3 — URL, history và locale

- Tại parent Advertising không có photo, bấm lại mục navbar cuộn logical scroll về0 và giữ nguyên category/tag/query/bộ lọc; không thêm history entry hoặc tải lại route. Dùng cùng handler về top của logo homepage. Quy tắc này không chặn nhánh detail→parent bên dưới; modified click/target/download giữ native behavior.

- Photo URL dùng parent route với query `photo=<record.id>`; `record.id` là stable photo identity. `title`, `productKey` và `media.sourceId` không làm khóa URL.
- Tag dùng `tag=<stable-tag.id>`. URL direct, reload, mở tab mới và Forward dựng đúng photo, tag, locale và related state.
- Chuỗi chuẩn: masonry mở A, A mở B, Back về A, Back tiếp về đúng masonry gốc với category, logical scroll và focus card A được phục hồi.
- Navbar về danh mục đưa ảnh đang xem vào viewport grid, không tạo grid-detail morph. Đây là thao tác đi thẳng về grid; Browser Back vẫn phục hồi chuỗi A/B và vị trí grid gốc. Phải kiểm riêng trường hợp ảnh B đang xem ở xa ảnh A mở đầu.
- Trước masonry → A, lưu category, logical scroll và `focusId=A` bằng `replaceState`, sau đó `pushState` A. Trước A → B, lưu detail state A rồi `pushState` B.
- Chọn hoặc reset tag giữ hero, cập nhật related bằng `replaceState`, không tạo thêm một bước Back.
- Escape lùi một detail entry; direct link lùi về masonry chứa ảnh đó.
- Query `photo` lạ fail-open về masonry dùng được và URL sạch. `tag` lạ bỏ filter nhưng giữ photo hợp lệ.
- Locale switch VI/EN giữ nguyên photo ID, tag ID, history identity và layout state.

### R4 — Motion và phục hồi

#### Position motion P1.3

Giữ toàn bộ gate v7: một cột mỗi ảnh; intrinsic height; lệch đáy ảnh liền kề tối thiểu0,20×chiều cao ảnh lớn hơn; cân đuôi ảnh thật; không spacer/crop/mất ảnh để đạt gate. Skeleton/suggestion không được tính là ảnh thật để che hụt cột.
Position motion dùng pipeline Masonry/Outlayer hiện hữu,400ms ease, delay0, không stagger. Mọi thay đổi tọa độ của card đang hiện, gồm filter/photo/tag/resize/đổi số cột và dữ liệu, phải animate từ trạng thái đang thấy đến vị trí mới. Chỉ một engine sở hữu transform vị trí; không thêm GSAP/WAAPI FLIP cho cùng card.
Initial load cũng có stuffing: khởi tạo card của visible window tại đầu cột đích (sau vùng primary reservation nếu có), rồi đưa tới tọa độ organic bằng cùng400ms. Origin dựng trước paint, không hiện final rồi giật về đầu. Card có tọa độ không đổi không cần chạy translate giả. Chỉ initial/view-entry cần khởi tạo origin; remount do scroll virtualization ở cached coordinate vẫn instant, không kéo ảnh từ đầu trang khi khách chỉ cuộn.
Giữ media fade0,6s ease-out riêng trên img, hover theo shared contract. Tái layout chỉ khi hình học đổi; không render lại toàn dataset khi scroll. Cohort giữ oldWindow∪newWindow∪focused khi position motion đang chạy; sau settle trả normal bound.
Correction owner 2026-09-11: focused/anchor chỉ giữ card còn thuộc related layout hiện tại. Khi card đang focus trở thành ảnh detail hoặc bị filter loại, chuyển focus sang vùng mô tả với preventScroll; card cũ ẩn ngay trong cohort và bị loại sau settle. Không giữ card thiếu placement ở tọa độ mặc định. Card hợp lệ đang focus vẫn được giữ khi virtualization thay window.
Click parent→photo, related→photo và photo→parent đổi view tức thì, không tạo clone, backdrop morph hoặc lease khóa cuộn. Ảnh primary chọn media đang active trên card; Browser Back/Forward khôi phục media và logical scroll riêng từng entry. Viewer primary↔dialog tiếp tục có morph riêng. Route veil không được gán vào query photo.
Ngân sách kiểm đã chốt: Chrome không throttle, ảnh/font cache,20 lượt mỗi luồng ở1329×912; p95 click→frame phản hồi đầu≤100ms và không task đồng bộ do handler/layout mới vượt50ms. Ghi trace/baseline/candidate cùng máy và viewport; cold image kiểm fail-open riêng, không trộn network chậm vào số đo solver. Đây là mục tiêu phải chứng minh sau triển khai, không phải số đo đã đạt.

#### Photo morph, viewer và phục hồi

- Masonry/related card và ảnh primary đổi view không morph; không tạo clone ảnh bay giữa hai vùng.
- Related masonry tái dùng nhịp vị trí 400 ms và reveal media hiện tại của Advertising; các card còn lại không chuyển cùng ảnh hero.
- Click nhanh, Back đang mở, resize, ảnh tải chậm và lỗi dependency phải giữ state mới nhất; không để target ẩn, input khóa hoặc rơi vào view cũ.
- Virtual window giữ card đang focus theo stable ID, không theo title/index; marker chỉ có trên card detail vừa đóng gần nhất và không kéo viewport tới card đó.
- Back B → A phục hồi hero A, media active, thông tin A, tag A và slot B trong related. Back A → masonry phục hồi A đúng card, media active và vị trí.
- Nếu viewport không đổi, sai số scroll của từng entry sau Back/Forward tối đa 1 CSS px, không có frame tại Y của entry khác. Nếu viewport đổi, phục hồi cùng anchor và offset tương đối.
- Với `prefers-reduced-motion: reduce`, grid-detail vẫn đổi view tức thì, giữ đúng photo, media, history, scroll, focus và related state.
- Trong viewer, reduced motion bỏ animation; thao tác zoom/pan do người xem chủ động vẫn hoạt động tức thì để đọc chi tiết ảnh.
- Expand mở nhãn khi hover/focus-visible, thu lại khi rời tương tác. Reference đo được width 250 ms ease-in và opacity nhãn 250 ms với easing khác nhau cho vào/ra; áp cùng nhịp, giữ icon ở cạnh neo của nút và không làm grid/hero dịch chuyển. Zoom/đóng/reset phản hồi sắc nền khi hover; không suy CSS transform 85 ms thành hiệu ứng phóng to khi chưa quan sát. Trên touch, một lần tap thực hiện chức năng; accessible name luôn tồn tại. Reduced motion bỏ chuyển động mở/thu nhưng giữ nhãn, trạng thái và focus dùng được.
- Viewer mở từ rect ảnh detail tới rect fit, đóng về đúng ảnh detail; chỉ animate transform của ảnh. Zoom/reset dùng 200 ms `ease-in-out` theo style đã đo trực tiếp. Mở/đóng chọn 300/250 ms và easing `cubic-bezier(0.55, 0, 0, 1)`; easing có evidence Pinterest, duration mở/đóng là lựa chọn Trường Thịnh vì reference chưa đo được duration. Pan theo con trỏ tức thì; giới hạn dựa trên ảnh sau zoom và viewport. Resize hoặc thao tác liên tiếp phải hủy/tiếp quản motion, không kẹt dialog/focus/scroll.
- Correction trạng thái nút owner chọn ngày 2026-09-11: close/zoom/reset giữ vuông48px, nền trắng đặc; hover chuyển #ddd, active #c6c6c6 trong150ms ease-out. Focus bàn phím có viền2px, offset3px cùng lớp trắng ngăn nền ảnh. Zoom disabled dùng native disabled, icon #91918c, nền #f3f3f1 và viền #c5c5bf; không đổi khi hover/active, không transition. Hover chỉ áp dụng thiết bị có hover; reduced motion giữ màu trạng thái nhưng không transition. Không thay số mức zoom hoặc cách hiện reset.

### R5 — Nhãn và dữ liệu ảnh

Canonical photo record gồm stable ID, source/hash/provenance, intrinsic dimensions, tên VI/EN, mô tả VI/EN và tag IDs. Mỗi photo ID duy nhất; title được phép trùng.

Registry tag gồm stable tag ID, label VI/EN và quan hệ nhóm. Một photo có nhiều tag; tag mapping được author có kiểm soát, đối chiếu Products.txt, image-quality contract, research khách hàng và ảnh đã đạt Audit/Critique. Không suy tag vật liệu/kỹ thuật ẩn từ title hoặc bề ngoài.

Không đưa ảnh AI thành claim công trình thật hoặc bao bì chính thức của khách hàng. Chỉ file đạt Audit/Critique theo đúng hash mới đủ điều kiện public sau mapping. Batch 39 và các reject cũ không tự thay catalog 109 hoặc tự đóng backlog.

### R6 — Related và suggestion

Heading thống nhất “Có thể bạn thích” / “You might like”; một dòng,16px/24px,700, căn giữa. Banner rộng trọn một cột C, cao103px, góc vuông; gap heading–banner và giữa banner8px. Nhãn16px/24px,700, căn giữa, padding12px; cho xuống dòng nhãn dài để không mất nội dung. Giữ Plus Jakarta Sans, tối đa5 authored tag, màu/lớp tối bảo đảm chữ đọc được. Chỉ nền banner được cover; ảnh sản phẩm không nhận ngoại lệ này.
Cụm phải nằm gần primary. Slot xác định: nếu còn ít nhất2 cột bên cạnh, cụm ở cột trống gần primary nhất, còn cột khác dành ảnh thật; nếu chỉ còn1 cột bên cạnh, giữ cột đó cho ảnh thật và đặt cụm ngay dải đầu dưới primary; nếu full-span, đặt cụm vào dải đầu dưới primary. Không đẩy cụm sâu xuống masonry theo hash ngẫu nhiên. Với cùng photo/filter/viewport, reload/Back cho cùng slot; thứ tự tag vẫn theo registry. Điều kiện gần khối ảnh/mô tả thay vị trí tùy ý trước đây, không bắt buộc bên trái.

Mỗi detail có đúng một khối suggestion. Ngoại lệ cover chỉ áp dụng nền banner,
không áp dụng parent/related/hero hoặc trạng thái fit của viewer, không sửa
file gốc/intrinsic metadata.

- Không chọn tag: related cùng category, loại hero, sort ổn định theo `sourceOrder` rồi `id`.
- Có tag: hero vẫn giữ; related lấy photo ở mọi category có tag, loại hero, sort theo thứ tự category chuẩn, `sourceOrder`, `id`.
- Thứ tự suggestion cố định theo photo ID, không random, không phụ thuộc locale.
- Click tag giữ hero và lọc related cross-group. Reset tag trở về cùng nhóm. Tag không có kết quả hiển thị empty state rõ, không giả kết quả.

## Compatibility và Barba

Giữ sáu pathname category cũ làm compatibility entry. Mỗi entry chuyển về parent với `?category=<slug>`, giữ locale, không chọn ngẫu nhiên một ảnh. Giữ fallback link và source/asset lịch sử.

Canonical của entry là parent không query. Script dùng `location.replace`, giữ
query không định tuyến và bỏ `photo`/`tag`/`category` cũ trước khi đặt category
đúng pathname. Meta refresh chỉ nằm trong `noscript`; khi JavaScript tắt, link
và refresh tới fallback tĩnh của parent. Không đổi Worker/provider trong slice này.

Photo/card/related anchor vẫn có href thật cho deep link, kèm cơ chế ngăn Barba ở query-only flow. Handler catalog `preventDefault` rồi cập nhật state. `popstate` được đăng ký trước `barba.init`; chỉ chặn chuyển đổi query-only khi URL cũ và mới cùng Advertising root. Pathname khác tiếp tục Barba như hiện tại.

Khi `replaceState`, merge state Barba hiện có; không tự thay `history.state.index`. Photo runtime mount/unmount trong lifecycle Advertising hiện hữu, không tạo history owner thứ hai.

## R7 — Correction owner: một layout span 2 — 2026-09-20

R7 thay mọi rule chọn hướng theo ratio và span 3 của detail. Owner duyệt
capability map cùng quyền tự thực thi tới kết quả ngày `2026-09-20`.

- Từ tablet trở lên, primary luôn span `min(2,N)` và dùng một bố cục: ảnh bên
  trái, vùng mô tả bên phải. Intrinsic ratio chỉ điều khiển `contain` trong
  hero frame, không đổi hướng layout hoặc span.
- Ở viewport điện thoại hẹp, cùng component chuyển responsive thành ảnh trên,
  mô tả dưới. Đây là fallback của một component, không khôi phục hai mode theo
  ratio.
- “Có thể bạn thích” luôn nằm dưới body trong cột mô tả. Hiển thị tối đa bốn
  mục, phủ hết bề ngang cột và wrap khi không đủ chỗ.
- Suggestion và card masonry dùng chung media-card interaction: cùng clip, ảnh
  zoom, timing/easing, focus-visible và reduced-motion. Toggle vẫn chỉ một active;
  bấm lại active để tắt. Active/deactive có surface/outline/pressed semantics
  riêng nhưng không dịch chuyển vị trí hoặc kích thước bốn mục.
- Bỏ mọi selector/runtime branch `stacked`/`split` dựa trên ratio sau khi
  consumer và test đã chuyển; không để nhánh chết giữ geometry cũ.

Acceptance R7: desktop/tablet VI/EN có primary span 2 và ảnh trái/mô tả phải;
mobile không overflow và xếp dọc; bốn suggestion nằm dưới mô tả; hover/focus
đồng bộ masonry; toggle không đổi rect; URL/history/photo ID và masonry packing giữ
nguyên.

## R8 — Accepted detail span 3 và suggestion một dòng — 2026-09-21

Owner duyệt R8 ngày `2026-09-21`. R8 thay R7 và D18 về geometry detail, thứ tự
info và trạng thái suggestion.

- Từ tablet trở lên, primary span `min(3,N)`. Trong block N3, hero chiếm hai
  cột và info chiếm một cột; khi masonry N4, cột 4 tiếp tục dành cho ảnh thật.
  Mobile dùng cùng component theo thứ tự hero, info, CTA, suggestion.
- Info theo thứ tự eyebrow/title, mô tả, “Trao đổi ý tưởng”, khoảng thở co giãn,
  “Có thể bạn thích” neo đáy. CTA không còn phủ trên hero.
- Suggestion tối đa bốn mục, mỗi mục đúng một dòng riêng và phủ hết bề ngang info.
  Inactive/hover không viền; active mới có viền, nền trắng và ảnh của mục chỉ
  hiện trong nét chữ bằng mask. Fallback thiếu text-mask dùng chữ màu ink đủ
  tương phản. `aria-pressed` và focus-visible không phụ thuộc hiệu ứng mask.
- Hover/reveal suggestion reuse đúng media-card interaction của masonry. Media zoom và
  crossfade không đổi rect, không flash hoặc nhảy zoom-out khi ảnh mới decode.
- Phần thừa quanh ảnh dùng cùng source làm nền blur. Nền zoom chậm hơn ảnh trước,
  parallax ngược nhẹ và crossfade đồng bộ khi đổi photo; reduced motion giữ tĩnh.
- Nút mở dialog giữ collapse/expand theo hover hiện hành nhưng icon và text có
  optical inset bằng nhau ở cả hai state, không đổi hit target.

Acceptance R8: VI/EN tại N1–N4, long-copy và text zoom `200%`; N4 có block span3
và ảnh thật cột4; mobile không overflow; CTA/suggestion đúng thứ tự; bốn button một
dòng mỗi mục; active không đổi geometry; background/foreground capture đầu,
giữa, cuối đồng bộ và reduced motion không animate. Nút expand/collapse được đo
ở hover, focus và touch cho VI/EN: optical inset icon/text hai mép chênh tối đa
`1 CSS px`, hit target và điểm neo không đổi giữa hai state.

## R9 — Accepted viewer wheel/middle zoom — 2026-09-21

Owner duyệt R9 ngày `2026-09-21`. Giữ ba mức hiện hành Fit, Cover và `2× Cover`;
thêm input scheme mới nhưng không tạo zoom state thứ hai.

- Cụm góc dưới phải giữ `+`, `−` và Reset. Mọi control luôn đọc/cập nhật cùng
  `level`, `scale`, `panX`, `panY` và status live. Disabled/focus/label phản ánh
  state ảnh sau mọi input.
- Wheel lên tăng một mức, wheel xuống giảm một mức và giữ điểm dưới con trỏ làm
  anchor trong giới hạn pan. Chặn page scroll chỉ khi dialog đang mở và pointer
  nằm trên viewport ảnh.
- Middle-click trên viewport reset về Fit, ngăn browser autoscroll và không đóng
  dialog. Click trái/drag pan, phím mũi tên, Escape và focus trap giữ contract cũ.
- Resize, click nhanh hoặc đổi input giữa motion phải cancel/retarget từ computed
  transform hiện tại; không tạo jump hoặc lệch state nút. Reduced motion đổi mức
  tức thì nhưng vẫn đồng bộ control/status.

Acceptance R9: cùng chuỗi thao tác bằng button, wheel, middle-click, keyboard và
resize cho cùng endpoint/disabled state; zoom anchor sai số tối đa `1 CSS px`
khi chưa chạm pan limit; scroll page không đổi trong dialog; close trả focus và
logical scroll đúng.

## Nguồn và ranh giới tái dùng

- `src/site/advertising-products/layout-core.mjs`: `compileAdvertisingProductLayout` áp policy một cột chung cho parent/related và build preflight, tái dùng geometry, deterministic packing và operation budget. Generic kernel và fixture Auto v5 giữ tương thích/lịch sử; không quyết định độ rộng ảnh public. Không sửa intrinsic metadata.
- `src/site/advertising-products/catalog.mjs`, `media-manifest.mjs`, `media-contract.mjs`: giữ artifact, identity, media contract; bổ sung tag/mô tả ở lớp data có validate.
- `src/site/advertising-products/catalog-runtime.mjs`: tái dùng virtual window, logical scroll, focus và lifecycle; `createPhotoCard()` dùng photo href và đánh dấu card listing hoặc related theo consumer.
- `src/site/motion.js`, `src/site/detail.js`: cung cấp API scroll hẹp, popstate dispatcher và mount/unmount trong lifecycle hiện có.
- `scripts/site/prepare-static-assets.mjs`, `detail-template.html`, `src/site/advertising-products/index.html`, `detail.css`: xuất detail region và compatibility fallback; bỏ action category cũ khỏi flow detail.

Giữ vanilla JavaScript ESM và dependency hiện có. Không thêm framework, masonry solver, animation library hoặc native View Transition dependency để đạt contract R1–R6.

## Nghiệm thu

### G1 — Grid một cột

G1 của revision một cột thay proof Auto chọn hai span: mọi placement ảnh parent
và related có span 1, kể cả record lịch sử từng Auto/span 2. Full pool, sáu
filter, 2–4 cột deterministic; không mất/trùng ảnh, overlap hoặc crop. Oracle
stagger/anti-brick/terminal và operation budget ≤300.000 vẫn pass. Delta sau
preview phải kiểm lại bằng ngưỡng 0,20 theo chiều cao vùng ảnh ở R1 và đo
terminal của từng cột trước skeleton, gồm regression EN cột thứ hai. Đo masonry
height/coordinates theo phiên bản mới; evidence Auto v5 và PASS một cột v6
với ngưỡng cũ giữ làm lịch sử, không chứng minh delta mới đạt gate.

Không có control Auto / 1 cột / 2 cột hoặc threshold Auto trong flow mới.
Producer/validator chấp nhận ảnh không khai báo lựa chọn độ rộng; các giá trị
legacy không đổi geometry/order/hash của policy một cột. Số cột responsive của
parent vẫn 2–4, related được giảm theo R1; không bỏ responsive cùng lựa chọn span của từng ảnh.

Feasibility trước implementation trên pool hiện hữu: fixture trong memory
ép span 1 đạt 21/21 cell All/sáu nhóm × 2/3/4 cột; nhiều nhất 3.662 operations.
Proxy có seeded bottoms cũng 21/21. Chưa thay cho matrix related với hero,
suggestion, tag và reserved area thật, cũng chưa là browser acceptance.

### G2 — Detail/history

Desktop/mobile VI/EN: mở A, chọn tag, mở B; Back phục hồi hero A, media active, tag A và related slot B; Back tiếp về grid gốc với media, scroll lệch ≤1 CSS px và focus A. Forward, navbar, Escape, reload, URL direct, sáu URL cũ, đổi locale đều đúng entry. P1.3 không có nút Quay lại riêng; Escape/Browser Back giữ nguyên nhánh history. Navbar vẫn đưa thẳng về grid chứa ảnh hiện tại; kiểm riêng trường hợp B cách xa A. Assertion không có UI Back áp dụng lại cho P1.3; evidence nút Back v7 giữ lịch sử.

### G3 — Motion

Capture frame trên click, Back/Forward chứng minh đúng photo/media ID và Y từng entry, không clone, lease khóa cuộn hoặc frame nhảy Y. Kiểm click nhanh, resize, ảnh tải chậm, dependency lỗi và reduced motion. Morph viewer có gate riêng.

### G4 — Tags/CTA

Multi-tag, cross-group, reset, empty state; thứ tự suggestion giữ ổn định khi reload/Back. Chọn/reset tag không tạo history entry. Photo ID lạ về masonry dùng được và URL sạch; tag lạ bỏ filter giữ photo. Mỗi Advertising view có một CTA đúng vị trí; không nhân CTA trong menu/nút nổi/footer của flow. Kiểm đoạn nối masonry → skeleton rỗng cùng cột → fade → chữ CTA, sau filter/resize và ở viewport hẹp. Reduced motion giữ chữ đọc được, bỏ chuyển động; skeleton không xuất hiện trong focus order hoặc danh sách sản phẩm cho assistive technology.

### G5 — Integration

Static gate, focused regression, console/network không thêm lỗi, keyboard/touch, không overflow ở 320/390/768/1024/1440 và viewport owner, DOM bounded sau transition. Owner mở preview VI/EN. Focused PASS không nâng thành full-site/parity PASS.

### G6 — Khung ảnh và nhiều kích thước cửa sổ

Correction `UI-FRAME-R3`, owner yêu cầu trực tiếp ngày 2026-09-10 sau khi thấy ảnh detail quá nhỏ; không mở lại approval của plan. Kiểm ảnh ngang/dọc ở điện thoại 320–430 px, điện thoại ngang, tablet 768/820/1024 px, desktop 1280/1440/1920/2560 px; thêm hai phía các breakpoint 750/960 và đổi kích thước khi dialog đang mở. Không gọi viewport giả lập là kiểm trên thiết bị vật lý.

Mỗi nhóm kích thước kiểm hero đủ lớn, tỷ lệ đúng, related không đè khối chính, một CTA, không tràn ngang. Dialog fit/cover/2×cover, giới hạn/reset, pan/close, frame motion, Tab/Shift+Tab/Escape, return focus/scroll, touch, reduced motion, direct/reload và VI/EN phải có evidence runtime. Kiểm sweep viewport liên tục bổ sung các mẫu đại diện; không tuyên bố đã thử mọi thiết bị hiện hữu.

Correction tiếp theo `UI-FRAME-R4`: owner cho phép tương tác trình duyệt Codex
đã đăng nhập, đọc live DOM/CSS và yêu cầu sát reference nhưng giữ các khóa
frontend. [Pinterest photo view](../reference/pinterest-photo-view.md) giữ số
đo năm pin, các nấc zoom, control, hai biến thể mô tả và giới hạn suy luận.
Nguồn mới thay giả định R3 rằng mọi detail chỉ có thông tin dưới ảnh.

Reference quan sát trực tiếp trong Brave: [Pinterest pin](https://www.pinterest.com/pin/855965472944617021/). Desktop 1920 px có primary riêng, nút xem lớn ở đáy phải; dialog nền tối/blur, ảnh fit giữa màn hình, đóng trái trên và zoom phải dưới. Đã thao tác mở, zoom và Escape. Sau reload ở responsive 400 px, Pinterest đưa ảnh lên đầu, related xuống dưới; snapshot này không có nút expand giống desktop. Việc giữ nút xem lớn trên mọi viewport là cách áp dụng cho Trường Thịnh theo yêu cầu owner, không phải claim Pinterest mobile có cùng control. Không sao chép media hoặc các tính năng tài khoản/lưu/chia sẻ của Pinterest.

Quan sát bổ sung trong Brave ngày 2026-09-10: preset iPad Air 820×1180 sau
reload có nút mở rộng trong ảnh và đưa related xuống dưới. Cửa sổ desktop hẹp
960 px cũng chuyển related xuống dưới; ở 1920 px related nằm bên phải và bên
dưới primary. Đây là kích thước giả lập/cửa sổ, không là thiết bị vật lý.

### G7 — Acceptance P1.3

- Geometry: toàn109 media với VI/EN và viewport representative320,390,430,750/751,820,960/961,1024,1200/1201,1329,1569,1920,2560; có cửa sổ ngang320px cao, tall/short, scrollbar và resize liên tục. Thêm r0,899/0,900/1,000/1,100/1,101; hai phía ngưỡng mô tả240px. Primary nằm dưới navbar và bottom≤visibleBottom−inset với dung sai1 CSS px; chia vùng đúng a/b sau trừ gap; sai số intrinsic ratio≤0,1%; không crop/dải tối/overlap.
- Related/suggestion: ảnh thật một cột, solver/tail/organic v7 giữ nguyên; sparse tag0/1/3 ảnh, full-span, fallback giảm cột; cụm suggestion gần primary và đúng103/16/24/8/12px, title đủ một dòng tại320px thường. Mô tả dài và text zoom200% phải truy cập hết bằng touch/keyboard; không cắt chữ để giữ một dòng trong chế độ accessibility.
- Motion/navigation: capture frame đầu/giữa/cuối initial stuffing, filter, tag và related layout; masonry/related↔detail, rapid click, Back/Forward và resize không tạo clone hoặc flash sai media. Navbar parent reclick giữ filter/history; detail→parent đúng ảnh, direct/reload/đổi VI/EN/menu/modified click; so sánh auto-collapse/hide/reveal với shared Residential tại cùng viewport.
- Viewer/CTA: chạy focused suite viewer trên Chromium/Firefox/WebKit, normal/reduced motion, phone landscape và dialog resize; kiểm control/focus/scroll/ratio. Chụp cuối parent masonry chứng minh chữ trong vùng skeleton sậm hơn và một CTA, gồm sau filter/resize. Không phát sinh console/network error do delta.
- Owner xem local preview của build đã kiểm; evidence ghi source/output hash, công cụ/viewport/giới hạn. Math preflight hoặc focused PASS không là mọi thiết bị vật lý, full-site hoặc canonical Espacio PASS.

Kiểm tra tính toán763 tổ hợp chỉ là preflight draft, không thay các gate
trên; input/giới hạn tại [evidence](../verification/advertising-grid-r4-2026-09-09.md#tính-thử-geometry-cho-draft-p13--2026-09-11).

## Lệnh kiểm dự kiến

```powershell
pnpm prepare:site
pnpm qa:static
node --test tests/site/advertising-products-layout.test.mjs tests/site/advertising-products-media.test.mjs tests/site/advertising-products-lifecycle.test.mjs tests/site/advertising-products-static.test.mjs tests/site/advertising-products-detail-routes.test.mjs
pnpm qa:site
```

Browser checks mới nằm trong suite hiện có sau khi DOM/API chốt. Không chạy full canonical để duyệt draft, không activate Worker/CMS.

## Supersession và docs impact

P1.3 thay geometry cố định2/3cột và50/50, navbar photo luôn hiện, nút Back
riêng, heading suggestion cũ/ratio banner2,2, initial layout instant và chữ CTA
ngoài continuation. Browser history, viewer và v7 organic/tail budget giữ
nguyên. Shared navbar re-click thuộc correction ngoài Advertising đã được
owner chốt, không mở redesign các trang khác.


Interview một cột thay policy span 1/2 của R1 và Task 2.1 plan gốc, giữ gate
organic đã chốt. UI-FRAME-R4 thay giả định metadata luôn dưới ảnh và trần zoom
300% của R3. R6 cho crop riêng banner nhãn theo xác nhận owner; không làm yếu
quy tắc hiển thị trọn ảnh sản phẩm. Delta plan một cột phải có phạm vi và phép
kiểm riêng, không dùng approval plan Auto cũ làm evidence đã triển khai.

Các đoạn discovery/proposal và hai câu hỏi async trong snapshot Notion được supersede bởi decisions ở R2/R3: desktop/mobile đã chốt; navbar về grid là thao tác trực tiếp đưa ảnh hiện tại vào viewport, còn Browser Back giữ chuỗi A/B và grid gốc. Grid-detail morph cũ tiếp tục bị [M02b](site-media-card-playback.md) supersede. Các spec cũ `docs/specs/advertising-grid-span-organic.md` và `docs/specs/advertising-products-turnkey-services.md` chỉ còn là nguồn tham chiếu cho phần không bị AD-BROWSE-R1 thay thế; plan phải chỉ rõ delta trước implementation.

Khi implementation thay runtime, main cập nhật guide sở hữu route, motion, data và trạng thái kiểm chứng trong cùng task. `STATE` giữ snapshot; Notion giữ plan/status. Phần source UI chưa triển khai không được mô tả như behavior hiện hành.

## R10 — Accepted N4/span3 luôn lấp cột 4 — 2026-09-21

Owner duyệt R10 ngày `2026-09-21`. Khi detail dùng N4/span3 và còn ít nhất một
ảnh related thật, ảnh related đầu tiên bắt buộc nằm ở cột 4, cùng top với primary.
Các ảnh còn lại tiếp tục xếp dưới primary. Quy tắc lấp cột 4 có ưu tiên cao hơn
fallback cân đuôi; không được chuyển toàn bộ pool xuống dưới chỉ vì nhánh solver
alongside không đạt terminal gate.

Acceptance R10: exact case `kiosk-posm-30 + use-sampling` có bốn ảnh related,
ảnh đầu ở `left = 3`, `y = 0`, không mất/trùng ảnh; cùng input vẫn deterministic.
Test quét mọi hero/tag authored tại N4 phải chứng minh mọi pool khác rỗng đều có
ảnh thật ở cột 4. Khi số lượng card tăng, invariant này vẫn giữ và operation
budget không vượt `300.000`; card dư chỉ ảnh hưởng phần xếp dưới primary.

## R11 accepted — Pinterest-style continuous masonry và shared media hover

R11 supersede câu “các ảnh còn lại tiếp tục xếp dưới primary” của R10. R10 vẫn
giữ invariant card thật đầu tiên ở cột 4 khi `N4/span3`, nhưng mọi card sau đó
được giải trong cùng một masonry liên tục thay vì một phase riêng dưới primary.

### Một packing model cho parent và detail

- State không có `photo` dùng behavior của Pinterest Home: card giữ tỷ lệ tự
  nhiên, mỗi card vào vị trí hợp lệ có mép trên cao nhất; continuity và lấp
  khoảng trống ưu tiên hơn stagger trang trí, cân đuôi hoặc anti-brick.
- State có `photo` dùng behavior của Pinterest Pin: cụm ảnh + mô tả là brick đầu
  tiên rộng `min(3,N)` trong cùng coordinate space với card thật. Khi `N4`, card
  đầu tiên bắt buộc ở cột 4, `y = 0`; card tiếp theo được phép nằm ngay dưới card
  đó trước khi primary kết thúc. Khi các cột khác mở ra, solver tiếp tục chọn vị
  trí hợp lệ có mép trên cao nhất trên toàn masonry.
- Giữ số cột responsive hiện hành của Trường Thịnh. Reference Pinterest quan sát
  tại `1920px` có 7 cột, detail chiếm 3 cột và gap `16px`; các số đó là evidence
  của packing model, không tự thay max-column hoặc token Trường Thịnh.
- Solver vẫn deterministic với cùng input, không overlap, không mất/trùng card
  và không vượt operation budget `300.000`. Tie-break giữ source order.
- Ở state có `photo`, outer gap trái và phải bằng gap dọc giữa đáy navbar đã thu
  gọn và mép trên masonry, dùng cùng một responsive token. Sai số computed tối đa
  `1 CSS px`; không giữ wrapper `max-width` tạo biên ngang lớn riêng.

### Shared media-hover primitive

- Advertising parent card, related card, button “Có thể bạn thích” và portal
  homepage dùng cùng media-hover primitive: ảnh scale từ `1` tới `1.15` trong
  `600ms ease-out`, container clip ảnh và geometry ngoài không đổi.
- Portal giữ overlay tối và underline riêng. Suggestion giữ label, mask active,
  `aria-pressed` và focus state riêng. Primitive chỉ sở hữu media transform và
  lifecycle hover/focus; không gộp toàn bộ component hoặc semantics.
- Audit các selector zoom-media còn lại, gồm detail gallery, detail duo và CTA.
  Chỉ surface có cùng vai trò interactive media card mới migrate vào primitive;
  surface khác được ghi rõ lý do giữ riêng, không đổi ngầm trong cùng task.
- Touch không giả hover. Keyboard focus dùng cùng media endpoint; reduced motion
  hiện endpoint không transition. Active suggestion không bị hover ghi đè.

Acceptance R11: matrix parent/detail VI/EN tại N1–N4 chứng minh continuity,
không có lỗ solver tạo ra trong vị trí hợp lệ, `N4/span3` lấp liên tục cột 4 và
card chảy dưới primary trong cùng layout. Resize/filter/tag/Back/Forward giữ
identity và deterministic result. Browser measurement chứng minh ba outer gap
bằng nhau trong `1 CSS px`. Capture hover/focus đầu, giữa, cuối chứng minh portal,
masonry và suggestion cùng scale/timing, không jump, đổi rect hoặc phá active state;
audit selector có danh sách kết quả và owner tương ứng.

## R12 accepted — suggestion active state và exact shared hover

R12 là consumer contract của module
[`shared-media-hover`](frontend-landing-page-foundation.md#shared-media-hover--accepted-p6).
Owner duyệt R12 ngày `2026-09-22`; implementation chờ duyệt plan
`AD-SEPT-2026-P6`.

- Suggestion inactive phải dùng chính DOM hook và CSS declaration của homepage
  portal cho image scale `1 ↔ 1.15`, `600ms ease-out`, transform origin và clip.
  Không sao chép giá trị sang selector suggestion hoặc giữ transition riêng.
- Hover-in, hover-out, focus-in và focus-out không được jump ở frame đầu, rapid
  reverse hoặc khi lớp ảnh suggestion vừa đổi. Lớp incoming bắt đầu từ rendered
  transform hiện tại của lớp outgoing, không reset scale trước crossfade.
- Khi user kích hoạt suggestion, media thu mượt về scale `1` và crossfade sang
  nền trắng trong `250ms ease-out`. Endpoint active chỉ có nền trắng, chữ đen,
  viền đen; không hiện ảnh, overlay hoặc hover/focus media motion.
- `aria-pressed`, keyboard activation, focus-visible, photo identity,
  button label VI/EN và một nút mỗi dòng giữ nguyên. Active state không thay
  outer rect, không làm solver relayout và không chặn browser Back/Forward.

Acceptance R12: capture portal và suggestion tại `t=0`, midpoint, endpoint và
rapid reverse có scale sai khác không quá `0.005`; không frame jump lớn hơn
`0.01`. Active computed style đạt nền/chữ/viền contract, hover giữ pixel và
transform bất biến; reduced motion đổi endpoint tức thì. Chạy VI/EN,
pointer/keyboard/touch, direct/history và owner route đã annotate.

## Delta P6.1 — nút quay lại trong primary photo

**Status:** accepted; owner xác nhận intent và cho phép Codex tự duyệt spec,
plan, task ngày `2026-09-22`.

- Photo state có một button `Quay lại`/`Back` nằm đè ở góc trên trái của
  `.advertising-photo-view__hero-frame`, cuộn cùng primary image và chỉ hiện khi
  có `photo=`. Button là ô trắng vuông `48px`, icon mũi tên đen, có accessible
  name theo locale và focus-visible rõ.
- Photo được mở từ masonry trong cùng browse session: button gọi native
  `history.back()` để phục hồi category, tag, focus và scroll đã lưu.
- Direct/deep-link photo không có masonry entry nội bộ: button fallback bằng
  navigation tới `/{locale}/advertising-products/`, không query, fragment hoặc
  scroll restoration.
- Escape và navbar giữ behavior hiện hành. M02b supersede riêng photo
  card↔detail morph trong controller; viewer zoom, suggestion và related masonry giữ contract.
- Browser acceptance phủ VI/EN, masonry→photo→Back, direct photo fallback,
  keyboard/focus, reduced motion và viewport `390/1440`; không có console error.

## Correction P6.2 accepted — shared glass, control cân biên và bỏ Back

**Status:** accepted; owner xác nhận intent và cho phép Codex tự duyệt spec,
plan, task ngày `2026-09-22`. Correction này supersede riêng Delta P6.1; history,
navbar, viewer zoom và suggestion giữ contract hiện hành. M02b supersede
riêng morph giữa mọi masonry/related card và primary detail.

- Bỏ hoàn toàn nút Back riêng trong primary photo. Điều hướng quay lại tiếp tục
  dùng Browser Back, Escape và navbar theo R3/R4; không thêm fallback control mới.
- Vùng dư quanh ảnh chính dùng cùng glass surface với global skeleton boundary:
  blur `28px`, saturation `1.08`, brightness `1.04` và tint trắng alpha `0.12`.
  Glass phủ đều vùng dư, không tăng blur theo khoảng cách từ mép ảnh và không
  blur trực tiếp source image. Source background tiếp tục sở hữu opacity/zoom;
  chuyển động nhìn qua glass tạo phần zoom-blur tương ứng.
- Nút `Xem lớn hơn`/`View larger` khi mở nhãn phải có khoảng cách vật lý hai đầu
  bằng nhau, tolerance `1px`, không wrap. Trạng thái đóng vẫn là control icon
  vuông hiện hành và không làm ảnh reflow.
- Icon mở ảnh và reset viewer dùng cùng ngôn ngữ hai mũi tên chéo, nét ít, stroke
  `1.5px`; reset, `+` và `−` vẫn dùng chung zoom state với wheel/middle control.
- Acceptance đọc computed style của shared glass, xác nhận source image có
  `filter: none`, Back không còn trong DOM/runtime/CSS, kiểm inset nhãn/icon và
  chạy viewer trên Chromium, Firefox, WebKit. Focused PASS không thay
  owner visual gate hoặc full-site gate.

## R15 — correction P7 Pinterest primary và description pager

**Module id:** `photo-detail-layout`. **Plan:** `AD-SEPT-2026-P7`.
**Status:** accepted; owner xác nhận ngày `2026-09-22`. R15 supersede trigger
`≤750px`, inner description scroll và rule ảnh thật đầu tiên chiếm cột 4 của
R10/R11 khi có suggestion card. Quy tắc chiều cao `100dvh` cố định và chia vùng
`72/28` dưới đây là lịch sử; [P7.2](#correction-p72--primary-full-span-cao-theo-nội-dung)
thay riêng phần hình học đó.

### Trigger và hình học primary

- Dùng Pinterest mode khi `primarySpan === totalColumns`, bất kể viewport rộng
  bao nhiêu. Không tạo breakpoint CSS thứ hai cho cùng quyết định solver.
- Cụm primary ảnh + mô tả có block-size đúng `100dvh`. Ảnh chiếm tối thiểu
  `72%`, mô tả tối đa `28%`; tổng hai vùng và gap bằng đúng chiều cao cụm.
- Ảnh rộng `100%`, giữ intrinsic ratio và `object-fit:contain`; bản thân ảnh không
  cao hơn viewport. Nếu contain tạo phần dư, bật shared zoom-glass background;
  nếu ảnh lấp vùng thì tắt background và glass để không thêm blur giả.
- Nút expand giữ hit target `48px`, icon hiện hành và nằm sát mép ảnh hơn token
  desktop. Không thêm lại nút Back.

### Description pager không giữ scroll

- Mô tả không có `overflow:auto`, scrollbar hoặc `overscroll-behavior:contain`.
  Khi copy vượt allocation, chỉ body description chia trang; category và CTA
  vẫn cố định, có indicator trang rõ và accessible name.
- Mobile: quẹt ngang đổi trang; `touch-action:pan-y` giữ quẹt dọc cho document.
  Chỉ capture pointer sau khi xác nhận intent ngang.
- Desktop: drag ngang bằng mouse/trackpad và `ArrowLeft`/`ArrowRight`; delta-x
  trackpad được phép đổi trang, còn wheel/delta-y luôn cuộn document và không bị
  `preventDefault` hoặc `stopPropagation`.
- Font ready, locale swap và resize tính lại page boundaries nhưng không làm
  đổi trang đang đọc nếu page index còn hợp lệ; reduced motion đổi trang tức thì.

### Suggestion là card đầu của related grid

- Toàn bộ mục “Có thể bạn thích” là một synthetic card có một cell bình thường,
  `rank/sourceOrder = 0`, cùng coordinate space, virtualization, reveal và
  shared hover với related image cards.
- Suggestion luôn là item đầu về DOM, visual order và ARIA. Tại N4/span3 nó dùng
  vị trí ưu tiên cột 4; ảnh thật đầu tiên trở thành placement kế tiếp. Các card
  sau tiếp tục lấp cavity liên tục, không overlap hoặc tạo cột rỗng.
- Active suggestion giữ nền trắng, chữ/viền đen và bất động theo contract P6;
  suggestion inactive dùng shared portal hover `1:1`.

### Input boundary và verification

- Inline primary không capture pinch, wheel hoặc pan dọc; user có thể bắt đầu
  cuộn trang từ ảnh, mô tả hoặc suggestion. Chỉ fullscreen viewer giữ
  `touch-action:none`, wheel zoom và pointer pan hiện hành.
- Unit matrix `719/720/1004/1005px` khóa trigger theo span, `100dvh`, `72/28`,
  contain overflow flag và deterministic suggestion placement.
- Browser tại VI/EN, `360×800`, `390×844`, `768×1024`, `1004×900`, `1005×900`
  kiểm swipe/drag/keys/indicator, page scroll từ mọi vùng, zoom-glass có điều
  kiện, fullscreen controls, no overflow và history/filter không regression.

## Correction P7.1 — suggestion phụ thuộc primary span

**Module id:** `photo-detail-layout`. **Plan:** `AD-SEPT-2026-P7.1`.
**Status:** accepted; thay riêng quy tắc suggestion luôn là card related đầu ở R15.

- Khi `primarySpan < totalColumns`, cùng suggestion UI nằm trong primary info;
  related masonry bắt đầu bằng ảnh thật và tiếp tục lấp cavity cạnh primary.
- Khi `primarySpan === totalColumns`, giữ Pinterest mode R15: suggestion là
  synthetic card đầu related masonry. Resize qua hai mode chỉ chuyển parent của
  cùng một node, giữ tag đang chọn, focus, copy, hover và history.
- Pager, zoom-glass có điều kiện và input cuộn trang của R15 không đổi; quy tắc
  primary `100dvh`/`72/28` tiếp tục là lịch sử và được P7.2 thay thế.
- Mỗi state có đúng một suggestion region trong DOM và accessibility tree;
  resize không clone, không đổi tag/photo đang chọn, không tạo history entry.
- Regression VI/EN tại `360×800`, `390×844`, `768×1024`, `1004×900`,
  `1005×900`, `1440×900`, `1569×912`, `1922×912`. Spec P7.1 gốc đã xóa, xem
  Git `da2f13a`.

## Correction P7.2 — primary full-span cao theo nội dung

**Module id:** `photo-detail-layout`. **Plan:** `AD-SEPT-2026-P7.2`.
**Status:** accepted; owner xác nhận ngày `2026-09-23`.
P7.2 supersede hình học `100dvh` cố định và tỷ lệ `72/28` của R15/P7.1;
split layout, pager và vị trí suggestion theo P7.1 giữ nguyên.

- Khi `primarySpan === totalColumns`, trần chiều cao là phần viewport còn lại
  sau navbar expanded, top gap và safe bottom; không kéo giãn cụm. Toàn bộ
  ảnh, mô tả và CTA phải hiện trọn. Mô tả cao vừa nội dung đo thực tế, nhưng mô tả cộng gap không
  vượt `28%` chiều cao viewport; nội dung dài tiếp tục phân trang.
- Image zone rộng hết primary. Ảnh giữ intrinsic ratio và lấp chiều ngang khi
  chiều cao cho phép. Khi ảnh rộng hết zone làm cụm vượt trần, thu ảnh và căn
  giữa; phần dư zoom-glass chỉ xuất hiện trái/phải. Image zone luôn cao bằng
  ảnh, không tạo phần dư glass ở trên/dưới.
- Độ cao cụm bằng image zone + gap + mô tả, tối đa phần viewport còn lại. Shared glass chỉ
  bật khi có phần dư ngang thật. Kiểm browser VI/EN trên ảnh ngang và dọc,
  gồm `756×910`; kiểm cùng ratio và không có horizontal overflow.
- Hình học: `W` bề rộng image zone, `r` tỷ lệ ảnh, `D` chiều cao mô tả đã
  giới hạn, `G` gap, `V` chiều cao viewport, `T` mép trên primary:
  `H = min(W/r + D + G, V - T - safeBottom)`; image zone cao `H - D - G`, ảnh
  `contain` trong zone, sai số browser tối đa `1 CSS px`. Unit khóa portrait,
  landscape, mô tả ngắn/dài, span boundary và ratio. Spec P7.2 gốc đã xóa,
  xem Git `da2f13a`.
- Resize từ full-span sang split phải xóa `position` và tọa độ masonry inline
  của suggestion trước khi đưa node vào info; các nút có ảnh nền ở trạng thái
  inactive không có viền đen, active vẫn trắng/chữ và viền đen.

## Correction P7.4 — owner xác nhận ngày 2026-09-23

Nhánh navbar trong correction này được thay bởi P7.5 bên dưới; giữ lại để đối chiếu lịch sử.

- Từ photo trở về bằng navbar: khôi phục category, anchor và scroll của masonry
  xuất phát, kể cả sau khi xem ảnh related. Direct photo không có masonry nguồn
  vẫn fallback về All. Quy tắc này thay hành vi navbar luôn về All/căn giữa ảnh.
- Mở photo và quay lại trong cùng catalog mount không random lại batch skeleton.
  Random preset không được thay geometry hay vị trí CTA so với footer.
- Nút suggestion có ảnh: border trong suốt và nền không vẽ dưới border; active giữ
  border đen/nền trắng. Keyboard focus vẫn có chỉ báo riêng.
- Nền blur quanh primary giữ tĩnh trong grid-detail click/Back/Forward;
  chỉ đổi media source khi primary đổi. M02b supersede các nhịp foreground/backdrop morph cũ.
- Glass cuối skeleton kết thúc bằng trắng đặc, phủ chồng mép clip ít nhất2px;
  biên chuyển cong nhẹ, tâm ellipse phía footer, full bleed như contract cũ.
- CTA và toàn footer cùng hiện ở cuối trang; vị trí CTA ổn định khi reload cùng
  viewport. Giữ điểm thị giác cao hơn tâm hình học, không hard-code một khoảng
  cách desktop cho mọi màn hình.

## Correction P7.5 — history, lingering và slideshow

Owner xác nhận trong phiên 2026-09-23–24; tiếp tục scope đã duyệt.

- Navbar từ photo **luôn về All**, xóa category/tag/photo khỏi URL. Nếu vẫn ở
  ảnh A đã mở từ parent, giữ A ở đúng offset cũ trong viewport. Nếu đã duyệt
  sang ảnh B, căn giữa B trong phần nhìn và đánh dấu card B vừa xem. Browser
  Back giữ chuỗi history, bộ lọc và scroll của entry tương ứng.
- Cùng dữ liệu, viewport và bộ lọc phải cho cùng tọa độ mọi card, kể cả khi
  reload. Random bộ ảnh suggestion hoặc preset màu skeleton không thay geometry.
  Restore phải cập nhật giới hạn smooth-scroll từ masonry mới trước khi đặt scroll.
- Khi hai container cùng tồn tại trong chuyển route, CTA đo footer thuộc
  chính container mới. Không lấy footer đầu tiên toàn document. Giữ bố cục
  quang học và gap hiện hành; cả copy CTA và toàn footer cùng hiện tại End.
- M02b supersede morph 520/400ms và backdrop 1200ms của grid-detail ở đoạn
  P7.5 cũ. Nền primary giữ tĩnh trên click, history, direct load và reduced
  motion; viewer primary↔dialog vẫn giữ motion đã duyệt.
- Mỗi nhóm suggestion lấy ngẫu nhiên một tập tối đa9 ảnh liên quan trong document
  hiện tại, tối thiểu4 để autoplay; mỗi5s crossfade1.6s, không tự zoom. Zoom
  chỉ theo hover chung. Active trắng/chữ đen; inactive không đổi độ tối khi
  hover, border không lộ nền đen. Hidden/offscreen/pause/reduced ngừng chuyển.
- Bổ sung12 ảnh nguyên gốc cho bốn product tag văn phòng/chỉ dẫn, mỗi nhóm
  đạt4 ảnh. Nguồn/prompt và review ở
  [album](../../source-assets/projects/advertising/suggestion-slides-20260923/review.md).
  Catalog lên127 ảnh, dataset `2026-09-23.1`; ảnh mới giữ sourceOrder riêng.
  `media.suggestionPosition` chỉ chọn vùng cover của nút suggestion; không crop
  hoặc biến dạng ảnh trong masonry, primary hay viewer. Ngày2026-09-24, owner
  chốt giữ12 ảnh mới và kết thúc đợt bổ sung này, catalog giữ127 ảnh.
  Thêm163 ảnh cho67 nhóm còn lại nằm ngoài phạm vi đợt này; nhóm chưa đủ4
  ảnh tiếp tục hiển thị tĩnh theo contract slideshow.

Evidence hiện tại: [P7.5](../verification/advertising-september-p7-5-2026-09-24.md).

## Supersession random accepted

[Organic random](advertising-organic-random.md) thay yêu cầu thứ tự/tọa độ tuyệt
đối qua direct/F5 ở P7.4/P7.5, sort related R6, slideshow5s thành3s và nhịp
frame batch. Same-seed/filter/history/locale giữ context; ratio, frontier,
khoảng CTA–footer giữ giá trị hiện hành với sai lệch đo≤1 CSS px, final viewport,
glass, Flow và fade1600ms giữ nguyên. Shared footer top gap vẫn48/64px theo
P6.1;≤1px không là gap tuyệt đối hoặc khoảng từ chữ CTA tới footer.
[Delta lifecycle27/09](advertising-skeleton-flow.md#correction-mobile-lifecycle--accepted-2026-09-27)
giữ common slot khi toolbar/resize/scroll, không thay yêu cầu full-exit replay.

## Amendment layout mobile L04R — accepted 28/09/2026

Owner duyệt [delta L04R](frontend-brand-shell-responsive-runtime.md#l04r--chiều-cao-tối-thiểu-cho-chữcontrol-advertising--accepted)
và plan cùng ngày. P7.2 cap giữ ở nơi chữ/control đã fit; nếu không đủ một dòng
mô tả đầy đủ và category/CTA/indicator cần thiết, info/primary tăng tối thiểu.
Indicator chỉ chiếm chỗ khi cần nhiều page. Measurement dùng full description
source, không dùng một page đang hiện để quyết định geometry sau resize/re-entry.
Image zone giữ contain ratio, đủ expand control/label/focus và edge spacing;
related masonry tiếp tục sau primary. User cuộn để tiếp cận khi minimum vượt viewport.
Không giảm font, bỏ chữ, đổi random/history/suggestion span hoặc motion/glass.
Target hiện tại Chrome/A05s và Safari/iPhone; local8792, chưa deploy.

## Delta owner media — 24/09/2026

Owner đã duyệt và yêu cầu tích hợp28 phiên bản cuối, gồm5 ảnh tạo lại qua
ChatGPT. Catalog154 ảnh, dataset2026-09-24.1, thêm27 và thay mobile-retail-05
bằng COCO BREEZE; giữ ID cũ và sourceOrder hiện hữu. Hai product mới:
Standee và khung quảng cáo (Kiosk/POSM), Bao bì và ly in F&B (Print/Decals).
Product key mỗi category là duy nhất, tối thiểu12; hai category này có13.
[Mapping, provenance, giới hạn review và kiểm chứng](../../source-assets/projects/advertising/owner-selection-20260924/README.md).
Số lượng154 supersede127 ở checkpoint trước; không đổi layout/motion contract.

## Chú thích thuật ngữ

- **Stable photo ID**: `record.id` duy nhất của ảnh, dùng cho card, URL, history và focus.
- **Deep link**: URL mở trực tiếp đúng ảnh/view và state.
- **Logical scroll**: vị trí cuộn do smooth-scroll quản lý, có thể khác `window.scrollY`.
- **Morph**: chuyển hình học từ ảnh card sang ảnh hero bằng lớp ảnh chuyển tiếp.
- **Fail-open**: query lỗi vẫn trả giao diện dùng được và URL hợp lệ.
- **Compatibility entry**: URL cũ được giữ để chuyển sang URL mới.
- **Zoom anchor**: điểm ảnh dưới con trỏ được giữ tại cùng vị trí khi đổi scale.
- **Continuous masonry**: mọi brick dùng cùng coordinate space và luôn lấp vị
  trí hợp lệ cao nhất trước khi tạo hàng mới.
