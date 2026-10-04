# AD-FINAL-R1: Hoàn thiện Advertising, logo và thư viện ảnh

**Trạng thái:** owner đã duyệt toàn spec bằng “duyệt” ngày 2026-09-11, sau khi review AD-FINAL-R1 trong [card hợp nhất](https://app.notion.com/p/3d8332849a0e8177ba63d3b965242c90). Owner duyệt implementation plan AD-FINAL-R1-P1 ngày 2026-09-13; thực thi từ T01 inventory/mapping, chưa nghiệm thu delta mới.

**Provenance:** snapshot đã duyệt ở `.tmp/orchestration/advertising-consolidated-spec-20260911/spec-draft.md`, SHA256 `9D3AD0BD6BC5A9FE02AEA44DB512561FD429CC937B01A463DB0641D1A14F3A16`. File này chuyển nội dung đã duyệt sang Git, đổi cách trình bày và trạng thái, không đổi acceptance. Chưa commit/push; link GitHub không đại diện delta local.

**Thứ tự ưu tiên:** bản này sở hữu delta D/C/B/M/Q. Trong phạm vi được nêu, thay các rule cũ về ngưỡng ảnh, giảm N, vị trí suggestion và nội dung cuối Advertising của [photo browse](advertising-photo-browse.md). Ngoài delta, giữ [DESIGN](../../DESIGN.md), [hình học masonry](advertising-grid-span-organic.md#hình-học-masonry-grid-r4-visual), [content](../../design-system/content.md), [motion](../../design-system/motion.md) và [brief/rubric ảnh](../../design-system/advertising-images.md). Evidence P1.3/P1.4 không tự nghiệm thu delta mới.

## Mục tiêu và phạm vi

Khách xem Sản phẩm quảng cáo thấy bố cục nhất quán khi đổi ảnh/bộ lọc/cửa sổ; đọc đủ nội dung và dấu tiếng Việt; ảnh chính rõ, nền dư dịu; thư viện ảnh đầy đủ, đúng loại và đạt tiêu chí chất lượng. Giữ phong cách Trường Thịnh.

Phạm vi: parent Advertising, detail dùng query photo/category/tag, sáu URL tương thích và VI/EN; logo là component dùng chung nên kiểm mọi nơi sử dụng. Không mở rộng thay CTA/nội dung các trang Home, Residential, Commercial; không redesign navbar, logo mark hoặc hệ font. CMS, migration database, full canonical Espacio, commit/push/deploy nằm ngoài lượt này.

Bản đồ phạm vi giữ trong cùng card, không tạo thêm hệ thống hoặc card con:
| Module | Kết quả | Phụ thuộc |
| --- | --- | --- |
| advertising-detail | Số cột, ngưỡng ratio, vị trí suggestion, kính mờ; giữ transition và control | Contract P1.4 và dữ liệu intrinsic hiện có |
| advertising-continuation | Skeleton chuyển động, CTA gọn, bỏ section dư và sửa dấu hero | Masonry/layout và motion lifecycle hiện có |
| brand-typesetting | Cụm chữ logo đọc trọn ở mọi consumer/state được kiểm | LOGO-R3 và font/locale hiện có |
| advertising-media | Inventory, chấm lại, tạo/sửa, phân loại và tích hợp ảnh đạt | Brief/quality gate hiện hành; UI ổn định trước QA tích hợp cuối |

Thứ tự phạm vi đã duyệt: khóa mapping đầu vào; hoàn thiện UI/detail và typography; chấm/sửa/tích hợp ảnh theo lô; QA trên thư viện cuối. Thứ tự này chưa thay implementation plan phải lập và duyệt sau spec.

## D — Khối ảnh, mô tả và grid

**D1 — Số cột chỉ theo không gian ngang.** Owner chốt tối đa 4 cột. Đã duyệt dùng chung cho parent và related: lấy document.documentElement.clientWidth theo CSS px; contentWidth = min(1500, clientWidth - 2 × outer), giữ outer/gap trong DESIGN. N = clamp(2, 4, floor((contentWidth + gap) / (220 + gap))). Mốc đã duyệt: dưới 720 px dùng 2 cột; 720–1004 px dùng 3; từ 1005 px dùng 4. 220 px là mục tiêu thiết kế đã duyệt, không phải breakpoint lấy từ mã Pinterest; mobile 2 cột được nhỏ hơn mức này. Filter, số lượng ảnh và ratio không tự đổi N; resize rộng hơn không được làm giảm N.

D1 thay rõ hai nhánh giảm cột hiện hữu trong related: missing-photo-peek và search-exhausted; không chỉ sửa công thức columnsForWidth. Span detail vẫn là quyết định riêng. Với cùng clientWidth, đổi bộ lọc hoặc thay thư viện phải giữ độ rộng cột và N.

**D2 — Hướng theo ảnh gốc; span theo D10.** Mọi ratio dùng span min(3,N). Ratio rộng/cao từ 1,8 trở lên: ảnh trên/chữ dưới; dưới 1,8: ảnh trái/chữ phải, gồm ảnh vuông/gần vuông. Không tính lớp blur vào ratio; không làm tròn ratio trước so ngưỡng; không phụ thuộc tên thiết bị hoặc xoay hướng cửa sổ. Nếu mỗi nửa trong layout cạnh nhau nhỏ hơn 240 px sau gap thì chuyển xếp dọc, giữ span.

**D3 — Chiều cao tự nhiên, vừa phần nhìn ở top.** Giữ navbar và hành vi hiện tại. Canvas/masonry cách đáy navbar ở đầu trang một gutter hiện hành 15/25/35 px theo cỡ cửa sổ; tính safe area một lần. Primary có chiều cao tự nhiên và trần P1.4: phần nhìn còn lại trừ gutter dưới và dải ảnh thật lộ clamp(48 px, 8vh, 96 px). Ở top/reload, primary nằm trọn và thấy ít nhất một phần ảnh liên quan thật phía dưới khi có ảnh phù hợp. Banner suggestion/skeleton/caption không được tính thay ảnh thật.

Vùng ảnh ngang ưu tiên 61,8% và chữ 38,2% chiều cao; ảnh cạnh nhau chia 50/50 chiều rộng sau gap. Đây là tỷ lệ ưu tiên: đo chữ ở bề rộng thực rồi phân bổ trong trần, không kéo khối cao cứng để tạo dead space. Giữ category/title/body một luồng; chỉ title được giảm theo cấp chữ đã chốt P1.4, không thu body hoặc cắt nội dung để giấu scrollbar. Nội dung thực sự dài hoặc chữ phóng 200% vẫn cuộn riêng được bằng wheel/touch/keyboard; không trap focus. Tính lại sau font load, đổi locale, resize hoặc cỡ chữ.

**D4 — Suggestion ở bên phải.** “Có thể bạn thích” / “You might like” giữ rộng một cột, title 16/24 px, banner cao 103 px và khoảng cách 8 px theo contract hiện có. Đặt ở cột ngoài cùng bên phải, xa primary nhất: N4/span2 là cột 4; N4/span3 cũng cột 4. Khi span bằng N, đặt suggestion ở cột cuối ngay dải đầu dưới detail. Không thu span chỉ để ép suggestion cùng hàng. Cửa sổ hẹp/chữ lớn được wrap, không clip chữ để giữ một dòng.

**D5 — Ít ảnh và giới hạn search.** Giữ mỗi ảnh masonry một cột, đúng intrinsic ratio, không mất/trùng/crop/stretch; không dùng spacer, skeleton hoặc sửa kích thước ảnh để giả đạt organic. Tổng budget 300.000 và gate cân đuôi tiếp tục áp dụng trên các ảnh/cặp thật có thể đánh giá. Rule so le0,20 cũ được correction D9 bên dưới thay thế.

Ngoại lệ dữ liệu đã được duyệt cùng spec: bộ lọc còn 1 ảnh thì đặt ảnh thật đó trong dải dưới primary, suggestion vẫn ở cột ngoài cùng bên phải, chấp nhận các slot khác trống. Bộ lọc không còn ảnh liên quan thì không dựng ảnh giả; giữ detail/suggestion và thao tác bỏ lọc, điều kiện ảnh thật lộ dưới là không áp dụng vì không có dữ liệu. Với nhóm ít ảnh, không đánh giá cân đuôi/so le đối với cột không có ảnh thật. Không tạo thêm ảnh hoặc lặp ảnh chỉ để lấp cột.

Trường hợp search hết budget vẫn giữ N, không thay đổi bộ lọc/URL hoặc hiển thị dữ liệu của bộ lọc trước như kết quả mới. Không hạ quality gate để gọi PASS. Plan phải có phương án xử lý trạng thái chưa bố trí được trong cùng N và regression cho các bộ dữ liệu được hỗ trợ; lỗi search ở đầu vào hợp lệ còn chưa xử lý chặn nghiệm thu. Không tuyên bố tìm kiếm hữu hạn chứng minh bất khả thi toán học.

**D6 — Kính mờ chỉ ở nền dư.** Dùng màu từ chính ảnh tạo nền cover, tán mịn và lớp sáng mỏng như kính mờ nhẹ. Foreground contain, sắc nét và đủ cả ảnh; không viền trắng/đen đặc ở phần dư. Nền bị clip trong frame, chỉ trang trí, không focus/pointer/alt hoặc tham gia morph. Không méo thấu kính, không viền khúc xạ, không hiệu ứng bám chuột. Blur không phủ chữ/icon/control. Ảnh masonry và fullscreen viewer không đổi fit mode vì delta này.

**D7 — Giữ tương tác đã duyệt.** Hàng tag dưới mô tả đã gỡ; vẫn giữ taxonomy, tag URL, suggestion/reset/history và compatibility. CTA ở góc dưới trái ảnh, expand dưới phải; giữ action/href, trạng thái hover/focus/active/disabled và accessibility hiện có. Không nhân đôi CTA hoặc cho click CTA mở viewer. Giữ shuffle khi đổi vị trí/số card, gồm lần tải trang; chuyển từ vị trí đang thấy, ngắt/resume được, không clone/focus card kẹt đè hero. Bổ sung skeleton loop không được chiếm transform điều phối layout.

### D8 — Correction owner: suggestion thuộc mô tả, ảnh không có tên — 2026-09-13

Correction này thay D4 và phần D3/D5/D7 liên quan title, suggestion/reset; các
điều kiện intrinsic, số cột, tỷ lệ vùng và khả năng đọc còn lại giữ nguyên.
Owner đã chốt trong interview và yêu cầu tiếp tục triển khai card:

- Bỏ caption/title ảnh ở mọi dạng masonry Advertising và bỏ tiêu đề lớn trong
  detail, cả VI/EN và route tương thích. Giữ mô tả, phân loại bằng tag và
  mô tả thay thế cho accessibility; ảnh không có tên riêng trong mô hình CMS
  tương lai. Không mở triển khai CMS/database trong task này.
- Chuyển toàn bộ “Có thể bạn thích” / “You might like” vào vùng mô tả của
  primary. Suggestion không còn chiếm một cột trong related masonry; vị trí N−1 cũ
  và kích thước banner103px không còn là constraint của cụm mới.
- Giữ nền ảnh cho từng nút suggestion, dàn gọn và tự xuống hàng theo bề rộng.
  Bố cục phù hợp ảnh trên/chữ dưới và ảnh trái/chữ phải; giữ chữ đọc được,
  hạn chế scrollbar bằng sắp xếp nội dung, không cắt mất nội dung hoặc thu body.
- Một filter được bật tại một thời điểm; bấm lại mục đang bật để tắt,
  giữ nguyên ảnh detail. Phân biệt rõ off/on, hover/focus và có trạng thái
  ngữ nghĩa tương ứng cho công nghệ hỗ trợ. URL/history/locale giữ filter đúng.
- Bỏ nút “Xem lại các ảnh liên quan”. Khi không có ảnh related, người dùng
  bỏ filter bằng chính nút toggle đang bật trong phần mô tả.

Điều kiện nghiệm thu thêm: không còn caption/title ảnh trong mọi masonry;
suggestion nằm trong primary info ở cả hai layout; bật/chuyển/tắt filter bằng
mouse và keyboard giữ photo ID, Back/Forward khôi phục đúng trạng thái;
normal-copy fit và chữ200% vẫn truy cập hết nội dung. Evidence geometry cũ
đo suggestion riêng không được dùng để nghiệm thu correction này.

### D9 — Correction owner: ưu tiên so le từ 10% — 2026-09-13

Owner xác nhận: “masonry không nhất thiết phải so le nhưng cách xếp so le phải
ưu tiên hàng đầu. So le tối thiểu 10%”. Correction này thay yêu cầu bắt buộc
so le0,20 ở D5 và các contract masonry Advertising cũ; không chỉ giới hạn ngoại
lệ cho nhóm cùng tỷ lệ.

- Ưu tiên tìm bố cục so le với độ lệch tối thiểu0,10 thay0,20. Giữ cách đo
  hiện hành theo chiều cao ảnh lớn hơn trong cặp thật được so sánh.
- So le là ưu tiên cao nhất trong các lựa chọn bố cục hợp lệ, không còn là
  điều kiện bắt buộc khiến một bộ ảnh hợp lệ không thể hiển thị. Nếu không
  tìm được phương án đạt ngưỡng trong phần ngân sách tìm kiếm dành cho ưu
  tiên, được dùng bố cục có hàng thẳng; vẫn ưu tiên các cặp đạt10% khi có thể.
- Quy tắc chống nhịp gạch cũ không được chặn hàng thẳng trong nhánh fallback;
  đây là ngoại lệ thẩm mỹ của D9, không nới điều kiện chống chồng lấn hay
  hình học vật lý của card.
- Không chọn hàng thẳng ngay chỉ vì dễ tìm hơn; cần evidence nhánh ưu tiên
  được thử trước và fixture hỗn hợp thật vẫn đạt so le. Kết quả fallback phải
  ghi rõ lý do tìm kiếm, không gọi là chứng minh bất khả thi toán học.
- Giữ số cột chỉ theo viewport, tối đa4; intrinsic ratio, không mất/trùng ảnh,
  không crop/stretch/spacer, trần budget tổng300.000 và các điều kiện fit,
  peek, cân đuôi còn lại. Không tăng budget bằng chạy lại trọn budget cho
  mỗi nhánh. Không thay dữ liệu/URL để làm layout hợp lệ.

Nghiệm thu: parent và related dùng cùng ưu tiên10%; mixed pool có phương án
so le phải chọn được nhánh ưu tiên trên fixture kiểm; nhóm cùng tỷ lệ và hai
fixture format-square/use-sampling trước đây bị chặn phải hiển thị với N giữ
nguyên. Kiểm determinism, các mốc cột và hình học thực trên browser. D8 về
suggestion/toggle vẫn là phần được duyệt độc lập, không bị correction này thay.

### D10 — Correction owner: mọi layout dùng span3 — 2026-09-13

Owner yêu cầu cập nhật docs, các card liên quan và triển khai: “cụm ảnh +
mô tả ở mọi layout phải có col span = 3”. Yêu cầu này thay riêng nhánh
span2 cho ảnh đứng/vuông của D2; không cần phân loại ảnh để chọn span.

- Primary luôn span min(3,N): N4 dùng3 cột, N3 dùng cả3; khi cửa sổ chỉ có
  N1/N2, clamp vào số cột hiện có theo ngoại lệ cửa sổ hẹp đã chốt.
- Ratio gốc1,8 chỉ quyết định ảnh trên/chữ dưới hoặc ảnh trái/chữ phải.
  Giữ chuyển xếp dọc khi mỗi nửa nhỏ hơn240px, không thay threshold.
- Giữ D3 về chiều cao tự nhiên/trần viewport, khoảng navbar, real-photo-peek;
  D8 về mô tả/suggestion/toggle; D9 về ưu tiên so le10%, fixed N và budget tổng.
  Không đổi media, taxonomy, navbar, CTA hoặc mở CMS trong correction này.

Nghiệm thu: ngang/đứng/vuông cùng viewport có cùng span min(3,N); VI/EN
direct/reload/resize và đổi ảnh/tag giữ quy tắc; không overlap/tràn ngang,
primary vừa viewport và ảnh thật phía dưới còn lộ khi có dữ liệu. Chữ200%
vẫn truy cập đủ. Evidence span3/2 trước D10 chỉ là lịch sử.

### D11 — Correction owner: dải ảnh lộ50px — 2026-09-13

Owner chọn “Luôn lộ khoảng50px như mẫu”, thay mức tối thiểu clamp48–96px
và chiều cao tự nhiên có thể lộ nhiều ảnh hơn của D3. Main đo parent VI ở
viewport1908×920: grid top870, cả bốn card đầu lộ50CSSpx; source parent
dùng `height: calc(100svh - 50px)`. Đây là mốc từ trang Trường Thịnh.

- Primary dùng phần chiều cao còn lại dưới navbar và gap, trừ gap dưới,
  safe-bottom và50CSSpx. Cùng viewport không co primary theo lượng chữ/ratio
  làm lộ nhiều hơn; vẫn contain ảnh, giữ50/50 hoặc golden ưu tiên bên trong.
- Ở top/direct/reload/resize, hàng ảnh thật bắt đầu dưới primary nhô khoảng
  50CSSpx từ đáy viewport, dung sai1px; không dùng skeleton/suggestion thay ảnh.
  Card ở cột cạnh primary không tính là hàng ảnh dưới trong phép đo này.
- Giữ ngoại lệ không có ảnh thật: không dựng ảnh giả. Nội dung dài/chữ200%
  cuộn riêng, luôn truy cập đủ. Với viewport không đủ chỗ vật lý, ghi đúng
  giới hạn và giữ nội dung truy cập được, không crop/thu chữ để giả PASS.

Nghiệm thu cùng D10 trên VI/EN, các ngưỡng cột, ảnh ngang/đứng/vuông, sparse
và resize; không thay navbar hoặc chiều cao hero parent vì chỉ dùng làm mẫu.

### D13 — Correction owner: ưu tiên cột 4 khi còn hai ảnh — 2026-09-13

Ngoại lệ một ảnh được D14 bên dưới thay thế; D13 tiếp tục áp dụng pool hai ảnh.

Owner chọn ưu tiên cột4 và cho phép lệch đáy khi bộ lọc chỉ còn hai ảnh thấp.
Ở N4/primary span3, ưu tiên một ảnh thật bên phải primary và một ảnh thật
ở dải dưới để lộ50px. Miễn giới hạn cân đuôi cho đúng bố cục bất đối xứng
hai ảnh này; không đổi intrinsic ratio, số cột, URL/filter, budget300.000,
chống overlap hoặc ngoại lệ chỉ còn một ảnh. Pool đầy đủ giữ gate cân đuôi.
Đây là quyết định mới sau chứng minh gate cũ loại mọi candidate mixed
trong case kiosk-posm-01/product-kiosk-posm-product-02, không phải lỗi thiếu ảnh.

### D17 — Bốn mục suggestion phủ ngang mô tả — 2026-09-13

Owner duyệt bốn mục: split dùng2×2 phủ hết chiều ngang info; stacked dùng
bốn mục cùng hàng khi đủ chỗ, tự wrap ở cửa sổ hẹp. D17 thay số lượng và
hình học năm mục của D12/D16. Giữ đại diện, IDs/thứ tự/vị trí trong cùng
hero khi toggle; tag active từ URL phải có trong bốn mục. Giữ một active,
bấm lại tắt, motion/hover/reduced motion và span/peek đã duyệt.

Delta logo cùng lượt: owner xác nhận khối chữ4Y, cách biên trên/dưới markY
và cách ngang markY, đo cả dấu; cho phép cân cỡ hai dòng và gap. Authority
là [Brand lockup](../../design-system/components/BrandLockup/README.md).

Focused verification: build/static, suggestion layout và motion E2E đạt.
Main chạy lại VI/EN desktop/mobile và toggle giữ slot; CODE review đạt.
Source/output runtime SHA256 `7C27FAA15A0C63EDE4DC1F2B422A546821D3FDBE5BCD89B1AE814D8500A4130B`,
detail.css `440EC20C41E2F38CED02BC8F0D3C5EEBD9BFBFB68FD9EA6E338115768FFC36E7`.
Static oracle sparse một ảnh đã đồng bộ D14: cột4 cùng hàng; không đổi
compiler. Các gate D13 hai ảnh và geometry hiện hành tiếp tục sở hữu packing.

### D16 — Suggestion theo hướng layout primary — 2026-09-13

Số lượng/bố cục được D17 thay thế; evidence dưới đây giữ lịch sử.

Owner yêu cầu primary ảnh trên/mô tả dưới dùng suggestion ngang. Vùng suggestion
lấy đủ chiều rộng info; năm mục cùng hàng khi đủ chỗ, tự xuống hàng theo
bề rộng (mục tối thiểu180px hoặc toàn chiều rộng khi nhỏ hơn).
Primary ảnh trái/mô tả phải giữ năm mục dọc. D16 thay quy tắc năm dòng
ở mọi layout của D12, giữ nguyên thứ tự, active/off/hover và chuỗi ảnh.
Áp mode trước khi đo mô tả để chiều cao ảnh không dùng số đo của layout cũ.

Kiểm chứng: static và photo geometry10/10 đạt; browser VI/EN kiểm stacked
và split1569×912, bật/tắt không đổi rect năm mục, mô tả không cuộn;
mobile390×844 đủ năm mục, không overflow ngang. Native brochure03:
năm card cùng y676,9375, rộng khoảng216,7px, info clientHeight=scrollHeight257px.
Test: `tests/site/advertising-suggestion-layout.e2e.mjs`.

### D15 — Card ảnh dùng chung — 2026-09-13

Owner yêu cầu đồng bộ card ảnh thật giữa masonry chính và masonry related detail,
reuse component thay vì dựng markup/hành vi riêng. Cả hai dùng cùng factory,
khung media clip, intrinsic dimensions, link/alt VI/EN, lazyload và reveal.
Giữ hover ảnh scale1,15 trong0,6giây ease-out của masonry chính; rời chuột trả
scale1. Focus bàn phím dùng cùng zoom và outline rõ; reduced motion bỏ zoom
và giữ outline, touch mở ảnh bằng một chạm không phụ thuộc hover.
Không đổi tọa độ/kích thước card, D14, URL/ID, filter hoặc motion riêng của
nút suggestion và skeleton. Giữ wrapper dữ liệu masonry/related cho routing hiện có.

Kiểm chứng: test mới `advertising-card-interactions.e2e.mjs` đỏ trước sửa
ở detail hover; sau sửa parent/detail VI/EN đạt hover/rời/focus/reduced/Enter.
Mobile parent/detail một chạm mở ảnh đúng, không overflow hoặc lệ thuộc hover.
Toggle regression D14 VI/EN vẫn đạt; static và CODE review độc lập đạt.
Runtime E78FB01C…/CSS0D6ED13E…; native1569×912 xác nhận hover scale1,15,
clip trong khung và không đổi rect. Không là full-site acceptance.

### D14 — Correction owner: một ảnh ưu tiên cột 4 — 2026-09-13

Owner đã chốt: khi bộ lọc chỉ còn một ảnh thật và N4/primary span3, đặt ảnh
ở cột4 cùng hàng với primary; miễn yêu cầu ảnh thật nhô50px phía dưới
vì không có ảnh thứ hai. Không đổi chiều cao primary khi bật/tắt filter.
Khi chỉ đủ hai hoặc ba cột, giữ ảnh dưới primary và peek50px.
Giữ nguyên intrinsic ratio, ID, URL/filter, thứ tự suggestion và motion chuyển
vị trí400ms; không nhân bản ảnh. Pool từ hai ảnh trở lên giữ D11/D13.

Kiểm chứng13/09: regression D14 thất bại trước sửa tại1005px (cột0 thay vì3),
sau sửa đạt sáu widths390/820/1004/1005/1569/1922. One-column13/13 gồm1320
case, photo-layout10/10; products-layout14/14 đạt sau cập nhật pin v13.
`tests/site/advertising-single-related.e2e.mjs` kiểm ba chu kỳ bật/tắt mỗi
locale VI/EN, thứ tự/vị trí suggestion và primary không đổi, không nhảy lần hai
sau motion; resize820px giữ peek50px. Native1569×912: primary(35,137,516),
card(1185,5,137,516), cột4 cùng đỉnh. Static và review CODE độc lập đạt.
Core v13 hash8442F40B…; runtime D70FEE75…; source/output đã đối chiếu.
Không thay verdict full-site/card.

### D12 — Correction owner: năm dòng suggestion và motion trạng thái — 2026-09-13

Owner yêu cầu năm mục thành năm dòng; hover khác active/deactive; mục
active chạy chuỗi ảnh sản phẩm liên quan như hero homepage. Khi ảnh và mô
tả không đổi, bật/tắt filter không được đổi vị trí các mục.

- Giữ năm vị trí một cột trong info ở cả hai layout; nhãn đủ chữ, không
  cắt hoặc tự chia thành nhiều cột. Giữ thứ tự/tag của bộ suggestion trong suốt
  cùng ảnh detail, kể cả bật/chuyển/tắt lọc; active không được đưa lên đầu.
- Chỉ mục active chạy chuỗi ảnh cùng bộ lọc related; ít hơn hai ảnh thì
  giữ ảnh tĩnh. Off giữ ảnh đại diện tĩnh. Chữ/viền trạng thái đứng yên,
  không đổi vị trí nút hoặc kích thước cụm vì chuyển ảnh.
- Tái dùng nhịp homepage đã kiểm trong motion.js: ảnh zoom nhẹ1,06→1
  trong5giây, chuyển mờ1,6giây; điều chỉnh ở lớp ảnh nền nút, không animate
  masonry/primary theo nhịp này. Hover phản hồi viền/sáng nhẹ riêng, không
  giả trạng thái chọn; keyboard có focus rõ, `aria-pressed` giữ chính xác.
- Pause khi offscreen/tabẩn; hủy khi deactive/đổi ảnh/unmount. Reduced
  motion giữ ảnh tĩnh và trạng thái rõ. Không thay media hoặc motion homepage.

Nghiệm thu: năm hàng ổn định, IDs/order/rect không đổi vì toggle; một active,
chuỗi chỉ dùng ảnh related đúng tag, hover/active/focus khác nhau; không
animation/observer/callback tồn dư sau đổi ảnh/tag/route, D10/D11 vẫn đạt.

## C — Skeleton, CTA cuối grid và hero

**C1 — Hai chuyển động kết hợp.** Skeleton là khung trang trí tiếp nối grid, không phải ảnh thật đang tải vô hạn. Nền xám đậm hơn hiện tại, có gradient chuyển mềm bên trong theo cảm giác Flow/Feral; toàn khung lơ lửng nhẹ theo cả X và Y. Không đợi hover mới chạy. Thông số khởi điểm đã duyệt cho prototype: biên độ không quá 4 CSS px mỗi trục, chu kỳ 6–8 giây, lệch phase giữa các khung; vòng gradient khoảng 4–8 giây. Không giật tại điểm lặp, không đổi layout/scroll height và không chạm/che CTA. Thông số được tinh chỉnh trong phạm vi nhẹ đã chốt.

**C2 — Lifecycle và giảm chuyển động.** Chỉ loop khi vùng skeleton đang nhìn thấy và tab đang visible; rời route hoặc remount phải dọn animation/observer. Reduced motion tắt cả drift và gradient loop, vẫn giữ mức xám rõ. Không tăng số node/animation tồn dư sau chuỗi mở ảnh, Back, đổi locale hoặc resize. Ưu tiên CSS và stack motion sẵn có; không thêm dependency, video hay renderer riêng cho mỗi thẻ. Export HTML Feral chưa lấy được artifact, không coi export code là đã xác minh.

**C3 — Nội dung CTA.** Bỏ eyebrow “DẤU ẤN TIẾP THEO”. Headline VI đúng hai đoạn chủ đích: “Dấu ấn tiếp theo” / “dành cho thương hiệu của bạn”, không dấu phẩy/chấm. EN giữ nghĩa hiện có và cùng cấu trúc: “The next mark” / “for your brand”, không dấu chấm. Cửa sổ hẹp được wrap trong mỗi đoạn; không giảm chữ đến khó đọc chỉ để ép đúng hai dòng vật lý. Giữ CTA “Trao đổi ý tưởng” / nhãn EN hiện có và đích liên hệ đã duyệt.

**C4 — Kết thúc gọn, superseded bởi D19.** Bỏ cả wrapper và chiều cao của quy trình Khảo sát/Tư vấn/Sản xuất/Lắp đặt và footer invitation “Có mặt bằng? Mời chúng tôi đến xem.” trên Advertising. Phần giữ capability marquee trong bản cũ không còn áp dụng; D19 sở hữu nhịp CTA/footer hiện hành. Không thay packing ảnh thật.

**C5 — Dấu tiếng Việt.** Hero “ĐỂ THƯƠNG HIỆU / LUÔN TRONG TẦM MẮT” và headline CTA phải hiện trọn ink có dấu, trước/trong/sau reveal, font fallback/font thật, resize, VI/EN và zoom. Giữ copy/weight/phong cách hiện có; chỉnh line-box, khoảng an toàn của reveal và cách wrap ở lớp gây clip.

## B — Typeset logo dùng chung

**B1.** Giữ nguyên logo mark, chữ thương hiệu VI/EN, Plus Jakarta Sans weight 600, footprint và motion LOGO-R3. Chỉnh typesetting cụm chữ bên trong để hai dòng có nhịp và căn chỉnh nhất quán; không kéo méo glyph, đổi font hoặc “sửa” bằng cắt dấu.

**B2.** Kiểm SVG nguồn chuẩn và mọi inline consumer trong header mở/gọn, menu, VI/EN, routes Home/Residential/Commercial/Advertising và các route dùng lockup. Đo ink thực có dấu, không dùng advance box SVG làm bằng chứng duy nhất. Font tải chậm/fallback, tải xong, zoom và transition đều không clip, chồng dòng hoặc tràn khỏi hit area.

**B3.** Kết quả phải có ảnh trước/sau cùng viewport và số đo phù hợp; kiểm 320–2560 px, riêng 1569×912, 1922×912 và hai phía breakpoint header. Không nhân bản bộ token logo mới. Những điều chỉnh khác ngoài cụm chữ không thuộc phạm vi này.

## M — Thư viện ảnh và phần việc cũ chưa xong

**M1 — Kiểm kê có cutoff.** Đầu implementation kiểm lại đường dẫn thực tế, timestamp và hash. Snapshot discovery tại thư mục C:\Users\halal\.codex\generated_images có 95 file từ 09/09/2026, 50 khớp source-library, 45 chưa phân loại. Đây là số tại checkpoint, không phải 95 ảnh mới được duyệt. Không tự xem tên file hoặc ngày tạo là bằng chứng ảnh thuộc Advertising. Khóa cutoff của đợt import và ghi riêng file đến sau cutoff.

**M2 — Mapping trước import.** Mỗi candidate có đường dẫn/hash/dimensions, nhóm sản phẩm, brief, trạng thái thêm mới/thay thế/không dùng, bản được chọn và public ID đích. Đối chiếu cả nội dung lẫn hash để không đưa nhiều revision của một ý tưởng lên như sản phẩm khác. Giữ originals/revisions, provenance và mapping rollback. Không xóa ảnh hoặc URL cũ chưa kiểm consumer.

**M3 — Chấm lại đúng ảnh đang dùng.** Lập danh sách use-site cho toàn Advertising parent/photo/related và sáu route tương thích. Snapshot cũ có 115 hash gồm 109 catalog và 6 parent; kiểm lại theo source hiện hành, gộp hash trùng để chấm một lần nhưng giữ đủ nơi dùng. Audit/Critique mới phải gắn hash và bằng chứng xem ảnh; không đổi ngày điểm cũ thành điểm mới.

Backlog 23 sửa, 13 thay và 6 parent chưa xác minh nguồn là số dư lịch sử sau batch đầu. Source-library có 50 record, 49 đạt nhưng chưa tích hợp; không trừ 50 khỏi 36 khi chưa map bản thay/bản thêm. V6 biển đường còn sai tỷ lệ brief 750×400 mm/cột 3600 mm; không nhập chỉ vì điểm cao.

**M4 — Gate giữ nguyên.** Audit từ 8 và Critique từ 8, không hard reject, đúng brief, provenance được khai rõ và verdict cho phép giữ. Owner sửa routing ngày13/09/2026: review/re-review ảnh dùng native non-Astra độc lập generator; không áp hồi tố để phủ nhận evidence lịch sử. Reviewer code được dùng Astra; bất kỳ agent dùng Astra ưu tiên high, cấm medium/low, trên high chỉ khi thật sự cần và ghi lý do. Reviewer mở đúng ảnh/hash ở đủ độ phân giải; không chấm từ filename, contact sheet đơn thuần hoặc lời tác giả. Kiểm cả PNG source và bản public sau tối ưu, không dùng điểm source thay bằng chứng public. Dùng đầy đủ rubric, brief và owner correction trong design-system/advertising-images.md và acceptance manifests hiện hành; không tạo rubric rút gọn cạnh tranh trong spec. Kiểm coverage và tính đa dạng cấp bộ, typography của các ảnh đặt cạnh nhau; điểm từng ảnh không thay gate toàn bộ thư viện.

Ảnh không đạt phải sửa/tạo lại theo từng lô nhỏ rồi review lại. Yêu cầu công cụ imagegen tích hợp, requested ChatGPT Images 2.5; effective model chỉ ghi khi tool công bố, còn lại unknown. Không dùng model/API thay thế ngầm. Không tự hồi sinh revision đã bị loại. Các correction về biển đường, canvas dưới sàn, quầy VỊ DỪA QUÊ, LED BỆNH VIỆN, pano, standee, menu Mica, sáu concept triển lãm và vật liệu Formex tiếp tục là ràng buộc. Giữ đủ ba sơ đồ du lịch/khu công nghiệp/nhà máy, bốn kiểu standee và số nhà/số phòng theo authority. Ba sản phẩm bổ sung là một hộp đèn kim loại hiệu ứng rỉ và hai biển số nhà Mica/Mica-Alu; không gọi chung thành ba biển số nhà. Đây là chỉ dẫn truy vết, không phải danh sách thay thế brief đầy đủ.

**M5 — Tích hợp và kiểm cuối.** Chỉ bản đạt mới đi vào public catalog: asset tối ưu, intrinsic dimensions thật, taxonomy/tags, tên/mô tả/alt VI/EN và mapping route chính xác. Giữ public identity khi thay đúng sản phẩm; thêm ID ổn định cho sản phẩm mới. Update manifest, counts, preflight, fixtures và các consumer dựa mapping được kiểm, không sửa assert chỉ để test xanh. Không để ảnh lỗi, link hỏng, crop/stretch hoặc skeleton tải kẹt. Sau thay số lượng phải kiểm masonry/shuffle/filter/related ở VI/EN, gồm ảnh mới và ảnh thay.

### M5 — Owner duyệt ảnh trước tích hợp (bổ sung 2026-09-13)

Owner yêu cầu giữ kết quả chấm còn hợp lệ theo đúng hash; không chấm lặp ảnh
không đổi chỉ vì chạy lô mới. Review phải bao gồm logic, aesthetic và critique
theo rubric M4. Ảnh có finding mới từ owner về noise hoặc đốm AI cần xác định
đúng revision, sửa/tạo lại và review bản mới; điểm cũ không phủ nhận finding mới.

Sau agent review đạt, trình owner đúng bản ảnh để duyệt trước khi đưa lên
website, gồm cả ảnh mới và ảnh thay. Ghi quyết định theo file/hash của bản
được trình. Owner duyệt plan hoặc main nghiệm thu chất lượng nguồn không
thay thế gate này. Có thể chuẩn bị derivative ngoài public để kiểm chất lượng;
chưa owner duyệt thì không cập nhật asset/manifest đang được website phục vụ.
Giữ ảnh khác nội dung dù chung tag; không tự coi chung nhóm là trùng ảnh.

## Q — Điều kiện nghiệm thu

| Nhóm | Bằng chứng bắt buộc |
| --- | --- |
| Q1 Geometry | Unit oracle độc lập + DOM/screenshot: ratio 1,799/1,800/1,801; mỗi phía ngưỡng 240 px và cột 719/720/721, 1004/1005/1006; quanh outer/gap 750/751, 960/961, 1200/1201; chiều rộng tăng không giảm N; sparse 0/1/3, full pool và mọi nhóm. Cùng viewport đổi filter không đổi N. Có fixture ép search-exhausted/hết budget để chứng minh vẫn giữ N, không hiển thị dữ liệu filter cũ và trả state đúng phương án được duyệt trong plan. Đo primary fit/top gap/real-photo-peek, foreground ratio sai số tối đa 0,1%, không overlap/overflow với dung sai layout 1 CSS px. |
| Q2 Typography và viewport | VI/EN tại 320×568, 390×844, 568×320, 820×1180, 1024×768, 1329×912, 1569×912, 1922×912, 2560×1440; thêm resize sweep và scrollbar. Chữ 200%, browser zoom, fallback/font load chậm, long-copy; normal-copy không cuộn thừa. Cửa sổ dưới vùng nhìn vật lý tối thiểu giữ nội dung truy cập được và ghi rõ giới hạn, không giả PASS. Emulation không được gọi là đã thử mọi thiết bị vật lý. |
| Q3 Motion và controls | Native click liên tiếp, resize giữa shuffle/morph, reload, Back/Forward, locale, keyboard/touch; không clone kẹt hoặc focus giữ card đè ảnh chính. Skeleton có loop nội bộ và XY, pause offscreen/hidden/reduced, không leak khi remount. CTA/viewer giữ hit target, disabled/hover/focus và action. Dùng timeline/screenshot lúc chuyển động và sau ổn định, không chỉ kiểm source có keyframes. |
| Q4 Media | Mọi hash/use-site trong cutoff có disposition; toàn ảnh cuối được dùng đạt cả hai điểm và brief, không unresolved hard reject. Mapping source-public/VI-EN/intrinsic được kiểm; không asset lỗi, duplicate revision ngoài ý muốn hoặc mất ảnh. V6 và các ảnh thiếu nguồn phải được xử lý, sửa/thay và nghiệm thu bản cuối, hoặc có owner explicit loại khỏi scope. Chỉ ghi nhãn cần sửa/thay không đủ đóng công việc. |
| Q5 Handoff | Build/static, focused Playwright và Chrome DevTools theo phạm vi đổi; không lỗi console/network mới. Cập nhật owning docs/evidence theo source hash cuối, mở preview VI/EN cho owner. Done chỉ khi các requirement và owner acceptance cần thiết hoàn tất; không dùng subset PASS thay full-site/canonical parity. |

Case regression bắt buộc: URL office-signs-wayfinding-03 với tag product-office-signs-wayfinding-product-08 ở 1922×912 phải giữ N4, span3, suggestion cột4 và một ảnh thật lộ bên dưới. Case filter-interruption-resize đang FAIL ở checkpoint trước phải được chẩn đoán và giải quyết; không ghi là flaky hoặc làm yếu assertion khi chưa có bằng chứng.

## Nguồn, ownership và lệnh kiểm

Stack hiện có: HTML/CSS, ES modules, GSAP 3.15.0, Playwright 1.63.0, Node built-in test, pnpm 12.3.4. Không cần thêm dependency để viết spec hoặc sửa giao diện này.

Source live: src/site/advertising-products/{layout-core.mjs,catalog-runtime.mjs,catalog.mjs,media-manifest.mjs,photo-tags.mjs,index.html}, src/site/detail.css, src/site/motion.js và các consumer logo đã kiểm. Tests: tests/site/advertising-*.test.mjs, advertising-primary-p14.e2e.mjs, advertising-photo-transitions.e2e.mjs, advertising-photo-view.e2e.mjs, site.e2e.cjs. .site-output chỉ do build tạo.

Reuse code style hiện hành: ES module, double quotes, 2-space indent, hàm geometry thuần và validation rõ. Ví dụ source đang có trong layout-core.mjs:
```javascript
export function advertisingSpacing(layoutViewportWidth) {
  if (!Number.isFinite(layoutViewportWidth) || layoutViewportWidth <= 0) throw new Error("Invalid advertising viewport width");
  const outer = layoutViewportWidth <= 750 ? 15 : layoutViewportWidth <= 1200 ? 25 : 35;
  const interCardGap = layoutViewportWidth <= 960 ? 15 : layoutViewportWidth <= 1200 ? 25 : 35;
  return { outer, interCardGap };
}
```
Comment code bằng English; tài liệu/card Vietnamese, không emoji.

Lệnh đã đối chiếu entrypoint hiện tại; plan phải cập nhật oracle/assertion theo delta được duyệt trước khi chạy. Dùng output directory mới cho mỗi run để giữ evidence cũ. Đây là checklist dự kiến, chưa có run QA mới trong lượt soạn spec:
```powershell
# Build/static và pure geometry/data contract.
pnpm prepare:site
pnpm qa:static
node --test tests/site/advertising-photo-layout.test.mjs tests/site/advertising-one-column.test.mjs tests/site/advertising-products-media.test.mjs tests/site/advertising-products-static.test.mjs tests/site/advertising-products-detail-routes.test.mjs

# Dev ở terminal riêng; giữ server sẵn có nếu đúng source/output.
pnpm dev

# Browser focused, terminal mới.
$env:BASE_URL = "http://127.0.0.1:8787"
$env:AD_P14_OUTPUT_DIR = ".tmp/orchestration/advertising-final-r1/primary"
node tests/site/advertising-primary-p14.e2e.mjs
$env:PHOTO_TRANSITIONS_OUTPUT_DIR = ".tmp/orchestration/advertising-final-r1/transitions"
node tests/site/advertising-photo-transitions.e2e.mjs
$env:PHOTO_VIEW_OUTPUT_DIR = ".tmp/orchestration/advertising-final-r1/viewer"
node tests/site/advertising-photo-view.e2e.mjs

# Logo, terminal mới không kế thừa flag ONLY khác.
$env:BASE_URL = "http://127.0.0.1:8787"
$env:TT_E2E_BRAND_LOCKUP_ONLY = "1"
node tests/site/site.e2e.cjs
```
Plan bổ sung scoped cases cho skeleton/CTA/hero/masonry/header vào harness sẵn có; không dùng pnpm qa:site trần để mở full canonical đã ngoài scope. Browser controls/contrast/performance phải đo đúng state; không suy từ build.

Khi triển khai: cập nhật nguồn Git sở hữu contract — docs/specs/advertising-photo-browse.md, DESIGN.md, docs/specs/advertising-grid-span-organic.md (hình học masonry), design-system/content.md nếu copy/use-site đổi, design-system/advertising-images.md nếu có correction mới, acceptance manifests và verification tương ứng. Notion tiếp tục giữ status/plan và link Git; không thay evidence observed của phiên bản trước thành proof của delta này.

## Ranh giới và duyệt

Luôn giữ scope, source-originals, URL/metadata đúng, test có assertion thật, accessibility và evidence theo hash; read/review trước mỗi lô ảnh. Không sửa .site-output trực tiếp hoặc ghi đè work của người khác.

Cần scope mới nếu muốn đổi mark/font/navbar, rubric/brief đã duyệt, dependency, CMS, dữ liệu ngoài Advertising hoặc deploy. Không xóa failing test, hạ gate, thay ảnh chưa đạt hoặc đóng toàn card cũ vì một phần mới xong.

Owner đã duyệt ngưỡng 1,8, vị trí suggestion, kính mờ, mốc cột 720/1005, ngoại lệ sparse D5, thông số motion khởi điểm và nhịp cuối CTA. Không còn câu hỏi spec mở. Implementation plan AD-FINAL-R1-P1 đã được duyệt ngày 2026-09-13; không mở lại các lựa chọn hoặc gate đã duyệt trong scope này.

### D18 — Correction owner: detail span2, một layout — 2026-09-20

D18 thay D2, D10, D16 và phần layout của D17. Từ tablet trở lên primary luôn
span `min(2,N)`, ảnh trái và mô tả phải; mobile xếp dọc. “Có thể bạn thích”
giữ bốn mục dưới body trong cột mô tả, phủ hết bề ngang và dùng cùng card hover
component với masonry. Toggle active/deactive không đổi geometry hoặc thứ tự.

Morph correction cùng lượt khóa scroll trong toàn bộ animation và phải release
trong mọi đường finish/cancel/abort/error. Skeleton correction dùng một FIELD
Scale/Distortion/Swirl/Speed chung cho mọi frame, palette ngẫu nhiên theo frame
và float X/Y rõ hơn. Logo VI giữ nguyên; EN kế thừa metric VI, title cùng width
VI và subtitle được nén tracking để cùng width title.

Các correction này được owner duyệt qua capability map ngày `2026-09-20`; report
ảnh giữ sau cùng và không bị UI correction tự chọn/publish ảnh.

### D19 — Correction owner: bỏ dải năng lực, CTA một viewport — 2026-09-21

D19 thay C4 về phần kết thúc trang Advertising. Bỏ toàn bộ dải “Năng lực công
trình quảng cáo”, gồm wrapper và chiều cao. CTA chiếm đúng vùng viewport còn lại
dưới header gọn; skeleton dùng `38,2%` phần trên, text và khoảng trắng dùng
`61,8%` phần dưới. Ở mobile hoặc viewport thấp, skeleton giảm còn tối đa `28%`,
không giảm cỡ chữ hoặc hit area chỉ để ép bố cục.

Footer chung gồm trụ sở, mạng xã hội và bản quyền bắt đầu ngay sau CTA trong
document flow; footer không bắt buộc xuất hiện trong cùng viewport. Skeleton
không được chiếm toàn viewport, không gây overflow hoặc đổi packing ảnh thật.

Photo morph native Back/Forward phải chạy đủ bốn hướng `grid↔detail` và
`detail↔detail`, khóa scroll `300ms`, giữ endpoint ổn định khi con trỏ còn hover
card và khi scroll lease làm thay đổi `clientWidth`. Resize thật vẫn hủy sạch và
mọi finish/cancel/abort phải nhả lock.

**Supersession M02b — 2026-09-30:** [Spec media-card đã duyệt](site-media-card-playback.md)
thay morph card masonry/related↔primary ở D19, gồm click, Back/Forward và
chuyển giữa hai detail: không tạo clone giữa card và primary; giữ media
active, scroll từng history entry và dấu card vừa xem. Chỉ morph
primary↔viewer được giữ. Đoạn D19 phía trên là yêu cầu lịch sử,
không là oracle mới cho các đường card↔primary này.

### D20 — Accepted CTA giao skeleton/khoảng trắng và nav reset — 2026-09-21

Owner duyệt D20 ngày `2026-09-21`. D20 thay phần đặt copy của D19; giữ CTA một
viewport, footer ở document flow kế tiếp và responsive cap `28%`.

- Skeleton không có viền và không phủ toàn viewport. Card skeleton dùng cùng
  reveal/hover component với card masonry; gradient nội bộ theo R4 của
  `advertising-skeleton-flow.md`.
- Tâm quang học headline nằm trên đường biên dưới của cụm skeleton: phần trên
  chạm/đè nhẹ lên dải card, phần dưới đi vào khoảng trắng. Link “Trao đổi ý
  tưởng” nằm hoàn toàn trong khoảng trắng. Copy vẫn đọc được khi skeleton đổi
  preset và không dùng panel màu đặc lớn che composition.
- Toàn CTA vừa phần viewport dưới collapsed header tại viewport chuẩn; màn hình
  thấp cho phép giảm lớp/số skeleton trước khi giảm hit target hoặc clip chữ.
- Nhấn nav “Sản phẩm quảng cáo” ở mọi Advertising child/query state luôn đi tới
  canonical locale route không query và filter `Tất cả`. Navigation tạo history
  entry bình thường; Browser Back khôi phục state trước đó theo photo browse
  contract. Modified click và href thật vẫn hoạt động.

Acceptance D20: screenshot VI/EN tại desktop/mobile cho thấy headline giao đúng
biên, link nằm trong trắng, CTA không overflow và footer bắt đầu sau section;
viewport-entry/hover skeleton khớp card masonry. Click nav từ category/photo/tag và
ngay tại parent đưa URL về `/vi/advertising-products/` hoặc locale tương ứng,
active filter là Tất cả; Back/Forward không sai state.

## D21 — correction P7 hero one-shot

**Module id:** `advertising-hero-once`. **Plan:** `AD-SEPT-2026-P7`.
**Status:** accepted; owner xác nhận ngày `2026-09-22`.

- Owner chốt lại ngày2026-09-24: mỗi lần vào qua navbar/đổi route thật phải
  reveal từng word, giữ stagger0,2s và nhịp hiện hành; không chỉ fade cả khối.
  Cờ one-shot thuộc container của lần mở trang, không thuộc toàn phiên duyệt.
- Hero Advertising chạy đúng một lần cho mỗi document load hoặc route enter
  thật. Scroll, `End`, `Home`, resize, focus/visibility và thay filter trong
  cùng document không được reset SplitText, class in-view hoặc chạy lại hero.
- `catalog-runtime.mjs` được import bất đồng bộ, nên shared synchronous shell
  phải chặn plain-primary click trên `[data-advertising-filter]` trước Barba khi
  adapter chưa sẵn sàng. Shell lưu intent filter mới nhất, không fetch HTML,
  không unmount container và không thêm history entry tạm.
- Khi adapter mount thành công, chuyển đúng một activation cho catalog handler;
  catalog sở hữu URL/query, `aria-current`, geometry và masonry motion như hiện tại.
  Nếu mount fail, giữ fallback link usable thay vì khóa filter vĩnh viễn.
- Modifier click, middle click, target/download và route ngoài Advertising không
  bị chặn. Khi adapter đã sẵn sàng, đường xử lý hiện tại giữ nguyên.
- Regression delay import catalog, thực hiện `End → Home → click filter` trước
  adapter rồi assert: container/hero identity giữ nguyên, không document/XHR
  route query, hero không có animation mới; sau ready, query/masonry cập nhật một
  lần. Lặp mười vòng sau ready và kiểm cùng invariant.

## Chú thích thuật ngữ

- **Client width**: bề rộng vùng nội dung browser bằng CSS px, không gồm thanh cuộn dọc.
- **Span**: số cột masonry mà khối detail chiếm.
- **Intrinsic ratio**: tỷ lệ rộng/cao thật của ảnh.
- **Disposition**: kết luận giữ, sửa, thay, thêm hoặc không dùng cho từng candidate ảnh.
- **Gate**: điều kiện phải đạt trước khi tích hợp hoặc nghiệm thu.
- **Optical center**: tâm cân bằng thị giác của cụm chữ, không chỉ tâm hình học.
