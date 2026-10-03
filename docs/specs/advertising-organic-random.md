---
title: Đặc tả đảo vị trí organic cho Advertising
type: frontend
status: accepted
updated: 2026-09-25
module_id: advertising-organic-random
capability_map: mobile-browser-parity-capability-map.md
related_docs:
  - advertising-photo-browse.md
  - advertising-skeleton-flow.md
  - advertising-september-2026-p7-1-correction.md
---

# Đặc tả đảo vị trí organic cho Advertising

## Provenance của carry C00

Contract accepted được mang nguyên requirement từ frozen recovery27/09:
E:/TruongThinh-Website/.tmp/advertising-random-media/docs/specs/advertising-organic-random.md,
SHA-256 aaec23c431f5f33bef8372f815a960e862db287b66ce4650278297c30eea3c0a.
Chỉ đổi link capability map/provenance; giữ clarification6 dòng native history
fallback vốn có trong spec recovery. Không carry media/loading module hoặc
resume recovery/P11. [Plan correction](../../tasks/plan.md#correction-baseline-và-skeleton--accepted-2026-09-27)
đã được owner duyệt; lifecycle bổ sung theo [delta accepted](advertising-skeleton-flow.md#correction-mobile-lifecycle--accepted-2026-09-27).

## Mục tiêu và phạm vi

Khách xem `/{locale}/advertising-products/` (`locale=vi|en`) và photo detail thấy thứ tự card
Advertising mới mỗi khi mở URL trực tiếp hoặc F5. Grid vẫn giống một dòng
masonry tự nhiên: ảnh cao và thấp xen nhau, không mất bằng chứng công trình,
không phá luồng xem ảnh, CTA hoặc footer. Trong phase tĩnh, thêm ảnh là cập nhật
catalog/media rồi build và xuất bản lại; solver phải thích ứng, chưa có CMS UI.

Module này sở hữu parent All, sáu filter, related grid trong photo detail, batch
skeleton card trước CTA và slideshow trong nút gợi ý. Thứ tự/vị trí của **nút
filter**, tag và khối gợi ý giữ nguyên. Các grid/gallery của route khác không
random; việc tải ảnh toàn site ngoài scope correction và thuộc recovery paused.
Scope correction được giữ trong
[capability map](mobile-browser-parity-capability-map.md).

## Delta so với contract đã duyệt

| Nguồn hiện hành | Delta đề xuất | Giữ nguyên |
| --- | --- | --- |
| [P7.5](advertising-photo-browse.md#correction-p75--history-lingering-và-slideshow) giữ card cùng tọa độ qua reload | Mỗi direct load/F5 lấy thứ tự trình bày mới; ảnh A có thể đổi ô | Filter/Back/locale trong cùng lượt duyệt giữ thứ tự đã lấy; ID, focus, scroll và history không đổi |
| [P7.4](advertising-photo-browse.md#correction-p74--owner-xác-nhận-ngày-2026-09-23) giữ tọa độ CTA khi reload cùng viewport | Tọa độ tuyệt đối của CTA có thể dịch theo chiều cao grid random | Khoảng cách chữ CTA–footer, final viewport và visual treatment giữ nguyên |
| [R6](advertising-photo-browse.md#r6--related-và-gợi-ý) sort related theo `sourceOrder/id` | Related dùng thứ tự random của pool đang chọn | Tập ảnh theo group/tag và vị trí khối gợi ý, thứ tự tag vẫn như cũ |
| [P7.5](advertising-photo-browse.md#correction-p75--history-lingering-và-slideshow) đổi ảnh gợi ý mỗi 5 giây | Đổi mỗi 3 giây | Tập ảnh gợi ý random tối đa 9 ảnh/tag trong document, crossfade 1,6 giây, không tự zoom, pause và reduced motion |
| [Skeleton R5/R7](advertising-skeleton-flow.md#13-correction-r5-accepted--batch-đa-dạng-và-viewport-replay--2026-09-21) giữ phân bố khung theo chu kỳ | Thứ tự khung thấp/vuông/cao thay đổi theo lần tải và pool card thật | 12 preset không lặp trong batch, frontier liên tục, global glass và ranh giới CTA/footer |

Các delta chỉ có hiệu lực sau khi owner duyệt spec và implementation qua QA;
evidence lịch sử và những điều kiện không liệt kê ở trên vẫn giữ nguyên.

## Contract thứ tự và dữ liệu

1. Mỗi lượt mở URL trực tiếp hoặc F5 tạo một nguồn random cho **thứ tự trình
   bày**. All, từng filter và từng pool related có kết quả ổn định theo nguồn
   đó suốt lượt duyệt; quay lại cùng ngữ cảnh không bốc lại. Hai lần tải có thể
   tình cờ cùng hoán vị; test phải chứng minh nhiều seed tạo nhiều hoán vị,
   không hứa mọi cặp F5 khác.
2. Parent All chứa đúng một card cho mỗi ảnh public; filter chứa đúng mỗi ảnh
   thuộc nhóm đó. Related loại hero, gồm toàn bộ ảnh cùng nhóm, hoặc toàn bộ ảnh
   khớp tag từ nhiều nhóm khi tag đang chọn. Không chọn ngẫu nhiên một phần.
3. `id`, category, tag, intrinsic width/height, `sourceOrder` và rank canonical
   vẫn thuộc catalog. Random không ghi ngược vào manifest hoặc phá validator,
   URL, `aria-posinset`/`aria-setsize`, caption/alt VI/EN, keyboard hay
   virtualization. DOM reading order khớp thứ tự visual trong layout hiện hành.
4. Resize, đổi filter, mở ảnh, tag, locale, Back/Forward, remount/virtual window
   hoặc route transition dùng lại thứ tự tương ứng của lượt duyệt; chỉ geometry
   có thể đổi theo viewport và primary reservation. History traversal phải
   phục hồi thứ tự của entry trước kể cả khi browser dựng lại document thay vì
   dùng bfcache. Direct load và F5 lấy seed mới. No-script fallback vẫn dùng được.
5. Seed được gắn vào `history.state` của từng entry; khi chuyển locale bằng
   control của site qua full navigation, một handoff một lần theo đúng URL đích
   được giữ trong `sessionStorage` cùng tab. `back_forward` đọc seed từ entry;
   `reload` bỏ seed cũ và thay seed mới; `navigate` chỉ nhận handoff hợp lệ,
   còn mở URL trực tiếp tạo seed mới. Handoff có hạn ngắn, bị tiêu thụ/xóa ngay
   ở đích và không đổi URL hay giữ thứ tự qua tab/phiên mới. Test phân biệt
   hard reload, Back dựng lại document và locale full navigation.
   Nếu Barba phải fallback sang native navigation trong Back/Forward,
   `location.assign` có thể làm browser báo `navigate`. Chỉ history trigger
   tới đúng Advertising URL hiện tại được ghi marker một lần trong history
   state; startup kiểm đúng URL, giữ snapshot entry và xóa marker ngay.
   Snapshot này được phép phục hồi seed/ngữ cảnh; marker không cho phép
   tái dùng seed khi F5, mở URL thường hoặc khi URL không khớp.
   Khi Back tới Advertising trong transition đang chạy, bridge dùng cùng
   fallback marker; `pagehide` không ghi đè destination entry từ index cũ
   của Barba. Regression giữ seed và tiêu thụ marker trên Chromium/WebKit.

## Contract solver và ảnh mới

- Giữ policy một cột mỗi ảnh, pixel ratio thật, caption và gutter responsive,
  parent 2–4 cột, related theo số cột/detail hiện hành. Không crop, kéo méo,
  filler, overlap, overflow ngang, card thiếu hoặc trùng để tạo nhịp đẹp.
- Solver thử nhịp so le và cân đáy theo [photo/grid hiện hành](advertising-photo-browse.md).
  Ưu tiên D9 từ `0,10 ×` chiều cao ảnh lớn liền kề; hàng thẳng là fallback đã
  được cho phép. Khi pool mới không đạt nhịp mong muốn, chỉ mức so le và nhịp
  xen cao–thấp được nới thêm; mọi ràng buộc hình học, tập ảnh và CTA/footer là
  hard gate. Diagnostic cho biết filter/pool, viewport và nhánh fallback.
- Nhịp nhìn là **soft score** có thể đo, không thay hard gate: phân lớp card
  theo `height/width` thật (`≥1,15` là cao; `≤0,9` là thấp; còn lại là trung
  gian). Với pool có ít nhất hai ảnh cao và hai ảnh thấp, trong 12 placement
  đầu (hoặc toàn pool nếu ngắn hơn), mục tiêu là có cả hai lớp và không quá
  bốn card cùng lớp liền nhau. Khi so các layout đều đạt hard gate, ưu tiên
  nhiều chuyển tiếp cao↔thấp hơn, rồi hiệu đáy cột cao nhất–thấp nhất nhỏ hơn;
  lớp trung gian ngắt chuỗi đồng dạng. Seed điều khiển tập phương án để các lần
  tải có thể khác nhau. Test 20 seed cố định trên pool hiện hành có ít nhất ba
  card và nhiều hơn một layout hard-safe phải thấy ít nhất hai hoán vị; ghi
  score và so với thứ tự canonical trên cùng pool/viewport. Nếu pool hoặc hình
  học không đạt mục tiêu, ghi rõ score,
  nguyên nhân/fallback và vẫn phát hành layout hard-safe như owner đã chọn.
- Pool đồng dạng, cực cao/ngang, rất ít ảnh và catalog tăng không được làm
  solver treo hoặc throw `search-exhausted` chỉ vì nhịp nhìn. Input media sai
  schema vẫn bị validator từ chối với ID và nguyên nhân; không xuất bản dữ liệu
  sai. Search không vượt ngân sách hiện hành `300.000` thao tác cho một layout;
  fallback hard-safe là lượt đặt hữu hạn theo số card, có diagnostic và thời
  gian được đo trước khi chọn thuật toán.
- Batch skeleton lấy frontier sau card thật của chính layout đang hiển thị,
  phân bố frame cao/vuông/thấp có random. Khi đủ cả ba loại frame, mục tiêu
  trong 12 frame đầu là có ít nhất hai loại ở bốn frame đầu và không quá ba
  frame cùng loại liền nhau; nếu geometry buộc nới nhịp, ghi soft score rồi
  chọn layout hard-safe. Batch không tạo dải đồng dạng dài,
  khung mỏng, hàng giả, overlap hoặc khoảng trống đột ngột. Quay lại cùng
  filter/detail trong document dùng lại hình học batch; khi pool thật đổi thì
  tính frontier mới. Preset/motion Flow, giới hạn WebGL, fade/blur trắng và
  reduced motion giữ contract hiện hành. Paint overflow của batch không tăng
  `scrollHeight`, không nhận pointer event và không che CTA/footer.
- Khoảng cách từ chữ CTA đến footer giữ nguyên như website hiện tại ở cùng
  viewport (sai số đo `≤1 CSS px`). Batch nối với đáy card thật theo gutter,
  top của skeleton đầu mỗi cột cách frontier card thật tối đa một inter-card
  gap (sai số `≤1 CSS px`), không thêm khoảng trắng độc lập; tại cuối trang vẫn
  thấy trọn CTA và footer trong một viewport như
  [P7.1](advertising-september-2026-p7-1-correction.md).

## Giao diện module và nơi đặt code

`src/site/advertising-products/layout-core.mjs` sở hữu placement;
`catalog-runtime.mjs` sở hữu state và cache theo document/pool;
`skeleton-flow.mjs` sở hữu batch frame;
`suggestion-slideshow.mjs` sở hữu nhịp slideshow. Dùng một input trình bày
thuần dữ liệu cho solver, chẳng hạn:

```js
compileAdvertisingProductLayout({
  cards: catalogCards,
  presentationOrderIds,
  viewportWidth,
  filter,
});
```

Đây là ví dụ contract, chưa khóa signature. `presentationOrderIds` không thay
`sourceOrder` canonical. Test thuộc `tests/site/`; không sửa `.site-output/`.

## Lệnh và kiểm thử

| Mục đích | Lệnh |
| --- | --- |
| Build tĩnh | `pnpm prepare:site` |
| Unit layout, skeleton, media, lifecycle | `node --test tests/site/advertising-products-layout.test.mjs tests/site/advertising-skeleton-flow.test.mjs tests/site/advertising-products-media.test.mjs tests/site/advertising-products-lifecycle.test.mjs` |
| Static contract | `pnpm qa:static` |
| Preview | `pnpm dev` |

Unit dùng seed cố định để tái tạo lỗi; oracle độc lập kiểm ID đúng một lần, ratio,
biên card, khoảng cách và hard gate. Chạy All/sáu filter và related 0/1/2/3/nhiều
ảnh trên width `320/390/768/1024/1440/1920/2560`; thêm `1/10/100` record
hợp lệ, gồm pool toàn ảnh đứng/ngang/vuông và tỷ lệ cực đoan. Browser kiểm nhiều
seed, reload, filter round-trip, tag, VI/EN, Back/Forward, resize, keyboard,
scroll/focus, no-script, reduced motion, footer cuối trang và slideshow 3 giây
với fade 1,6 giây. Đo ngân sách solver cùng dataset tăng; không suy pass toàn
site từ focused test. Owner spot-check parent/detail VI và EN ở desktop/mobile
trước merge/deploy vì hình học và nhịp ảnh là visual contract.

## Ranh giới

- **Luôn làm:** giữ dữ liệu catalog canonical, cập nhật owning spec/design
  guide/test và ghi evidence cho cả fallback nhịp nhìn.
- **Cần owner duyệt riêng:** đổi taxonomy, chọn/bỏ ảnh, token CTA/footer,
  visual direction hoặc ngân sách search làm chậm trang.
- **Không làm:** CMS/upload UI, đổi grid route khác, sửa generated output,
  dùng skeleton CTA để che lỗi ảnh thật hoặc bỏ qua Git/QA gate.

## Chú thích thuật ngữ

- **Pool**: tập ảnh hợp lệ cho All, một filter hoặc related đang chọn.
- **Presentation order**: thứ tự card chỉ dùng khi trình bày, tách khỏi dữ liệu
  catalog canonical.
- **Hard gate**: điều kiện bắt buộc ngay cả khi nhịp nhìn phải nới.
- **Frontier**: đường đáy các cột card thật nơi skeleton bắt đầu tiếp nối.
