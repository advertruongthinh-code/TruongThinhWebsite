---
title: Pattern composition frontend
type: design
status: living
updated: 2026-09-11
related_docs:
  - components.md
  - ../specs/frontend-route-and-content.md
  - ../specs/advertising-products-turnkey-services.md
  - ../specs/living-docs-design-system.md
---

# Pattern composition frontend

Pattern mô tả cách ghép các entrypoint reuse hiện có. Pattern không tạo route
component mới và không thay token trong [`DESIGN.md`](../../DESIGN.md). Mỗi
pattern dưới đây giữ ranh giới source, DOM, runtime và fallback; source/test chỉ
là evidence `observed`, không tự biến thành accepted design target.

## Static shell và route body

**Ghép:** markup header/full-menu/footer lặp trong HTML → shared `style.css` và
`motion.js` → body của route → `detail.css`/`detail.js` khi là child page.

**Dùng khi:** route public static cần cùng locale, menu, CTA, focus, route veil và
footer. **Tránh:** tách shell thành framework component hoặc thêm locale control
ngoài full-menu.

Markup shell thật dùng `<header class="site-header" data-site-header>`, nút
`[data-menu-open]`, `<dialog class="site-menu" id="site-menu">` và
`[data-menu-close]`. `data-header-tone="inverse|ink"` thuộc section/figure/footer
đang điều khiển tone, không đặt tuỳ tiện lên header.

Content source là VI, EN nằm trên leaf attributes, còn `data-motion-*`, landmark
và CTA đi cùng body. Header/menu lifecycle do `motion.js` sở hữu; child lifecycle
do `detail.js` sở hữu. Reduced motion phải hiện body mà không đợi timeline.

## Advertising catalog: data → pure layout → runtime

**Ghép:** `catalog.mjs`/`media-manifest.mjs` → `validateAdvertisingCards` và
`compileAdvertisingProductLayout` trong shared core → `catalog-runtime.mjs` → `[data-project-grid]`.
Filter dùng `[data-advertising-filter]`; tile sinh ra dùng
`[data-advertising-category]`.

**Dùng khi:** catalog cần filter, geometry organic deterministic, bounded
virtualization, lazy media và lifecycle locale/remount. **Tránh:** hard-code card
list trong HTML/runtime, route-specific grid algorithm hoặc bypass validator.

`mountAdvertisingCatalog(container, { signal })` do `detail.js` điều phối và trả
`Promise<cleanup function>`; pure core không biết DOM. State gồm all/category,
full/virtual window, media pending/loaded, dependency ready/failure,
resize/scroll, keyboard frontier và abort cleanup.

## Generic detail gallery

**Ghép:** section `[data-gallery]` + track `[data-gallery-track]` + nút prev/next
tuỳ chọn → native horizontal scroll/scroll-snap → `detail.js` pointer drag →
`AbortSignal` cleanup.

**Dùng khi:** child page cần gallery có controls và native touch. **Tránh:** đưa
Swiper dependency vào gallery generic hoặc dùng pattern này cho Advertising
carousel có pagination/enhancement state.

Track là input bắt buộc vì `detail.js` đọc `track.scrollBy`, `track.clientWidth`
và `track.querySelectorAll`; thiếu track không phải safe no-op. Hai nút điều khiển
có thể vắng mặt. Reduced motion dùng instant scroll.

## Advertising detail carousel

**Ghép:** build renderer tạo native carousel DOM → `detail.js` tải pinned Swiper
modules → enhanced slides/pagination/wheel/a11y → giữ native fallback khi load
fail.

**Dùng khi:** Advertising detail block có nhiều slide và cần progressive
enhancement. **Tránh:** coi Swiper state là source, bỏ native markup hoặc trộn
với `[data-gallery]` generic.

Input là ordered source IDs và bilingual alt/caption; output là native DOM rồi
native/enhanced state. Cleanup huỷ instance và abort listener. Reduced motion đặt
speed bằng không; content vẫn visible khi enhancement lỗi.

## Data-driven detail composition

**Ghép:** `detail-template.html` → category `layoutKey`/ordered blocks →
`renderDetailComposition(category, products)` → sáu generated locale routes.

**Dùng khi:** sáu Advertising detail route dùng chung shell/renderer nhưng khác
layout/data. **Tránh:** copy template sáu lần, HTML/CSS tuỳ ý từ CMS hoặc runtime
empty composition.

Block hợp lệ, source ID resolution, hero requirement, figure song ngữ và product
semantic là build contract hiện tại. Thiếu hero/media hoặc block không hợp lệ phải
làm build fail trước khi generated output được chấp nhận.

## Content/media composition

**Ghép:** route narrative + image role đã duyệt + VI leaf + EN leaf/alt/ARIA +
motion hook + metadata loading. **Dùng khi:** thêm hoặc sửa card, gallery hoặc
hero. **Tránh:** clone chỉ ảnh, dịch trên parent, claim giả, chép source media
hoặc media thiếu kích thước.

`content.md` là nguồn chuẩn cho ratio, budget, crop và QA. Product fact vẫn về
`PRODUCT.md`; owner fact vẫn về decision tương ứng.

## Advertising grid geometry

**Contract hiện hành:**
[AD-FINAL-R1 D1–D5, D8–D9](../specs/advertising-final-polish-and-media.md) sở hữu
rule số cột theo clientWidth, không giảm theo dữ liệu và ngưỡng ảnh.
D8 chuyển gợi ý vào phần mô tả, thay vị trí cột ngoài cùng trước đó.
Các đoạn fallback giảm N giữ để truy nguyên implementation cũ, bị delta
thay trong đúng phạm vi đó. Trạng thái nghiệm thu nằm trong evidence theo revision.
Các gate intrinsic còn lại tiếp tục áp dụng với ngoại lệ sparse đã duyệt.
Correction D9 ngày2026-09-13 trong cùng spec thay gate so le0,20 bằng ưu tiên
so le từ0,10 theo chiều cao ảnh lớn hơn trong cặp. Sau khi thử nhánh ưu tiên,
được dùng hàng thẳng; anti-brick không chặn hàng thẳng ở nhánh fallback.
Giữ N theo viewport và tổng budget300.000. Các số đo0,20 bên dưới là lịch sử.

Owner chốt revision một cột ngày 2026-09-10 cho cả parent và related tại
[AD-BROWSE-R1, R1/G1](../specs/advertising-photo-browse.md#r1--ảnh-rộng-một-cột-xếp-organic).
Chỉ policy span 1/2 và ngoại lệ bridge B1 bên dưới bị thay thế; giữ số cột,
gutter, caption, stagger tối thiểu và anti-brick đã định lượng. Runtime một
cột v7 đã có focused evidence trong AD-BROWSE-R1; P1.3 có geometry/motion
riêng cần nghiệm thu. Evidence Auto cũ không chứng minh revision mới.

### Target GRID-R4 đã duyệt, đang kiểm chứng tích hợp

Owner đã duyệt intent và phần định lượng bên dưới cho
[GRID-R4](../specs/advertising-grid-span-organic.md); source và preview đã tích hợp,
chưa là runtime PASS. Trạng thái kiểm chứng ở
[GRID-R4 verification](../verification/advertising-grid-r4-2026-09-09.md).
Mục này thay contract geometry rank-v3 bên dưới trong phạm vi
parent grid; số liệu rank-v3 giữ làm baseline lịch sử. Delta
[AD-BROWSE-R1/G1](../specs/advertising-photo-browse.md) và plan P1.1 được owner
duyệt ngày 2026-09-10: ảnh parent/related luôn rộng một cột; bỏ mọi lựa chọn
Auto/1/2 ở contract authoring. Source public v7 dùng cùng policy với preflight.
Owner bổ sung sau preview v6: stagger đổi sang 0,20 chiều cao vùng ảnh
lớn nhất liền kề và ưu tiên cân đáy cột theo
[R1](../specs/advertising-photo-browse.md#r1--ảnh-rộng-một-cột-xếp-organic).
P1.2 đã được duyệt; v7 triển khai gate mới. Evidence v6 giữ ngưỡng cũ.

- Giữ outer band, gutter, content cap `1500px`, min `2` và các ngưỡng cột hiện
  có cho parent; trần `4`. Related được giảm xuống một cột nếu search hữu hạn
  không tìm được layout đạt gate, theo R1; tổng budget mọi lượt thử không quá
  300.000. Mỗi ảnh luôn rộng một cột ở mọi viewport.
- Gọi `C` là số cột, `W` là chiều rộng một cột, `G` là gutter ngang hiện hành:
  `C = min(4, max(2, floor(gridWidth / 235px)))`,
  `W = (gridWidth - (C - 1) * G) / C`,
  `imageWidth = W`,
  `imageHeight = imageWidth * intrinsicHeight / intrinsicWidth`.
- Không crop, kéo méo, canvas riêng hoặc backplate; mép ảnh trùng mép khung
  ảnh, chiều cao tự do. Caption theo [DESIGN](../../DESIGN.md#advertising-caption).
- Candidate đo stagger: với hai cột kề, mép dưới ảnh của hai item khác nhau
  gần nhau nhất phải lệch ít nhất `0.20 * max(imageHeightA, imageHeightB)`;
  chiều cao chuẩn chỉ là vùng ảnh hiển thị, không gồm caption. Terminal
  frontier cũng áp dụng. Mỗi ảnh chỉ chiếm một cột, không có ngoại lệ bridge span 2.
  Mép trên hàng đầu không chịu gate mép dưới này; cột trống không giả làm item.
- Candidate chống nhịp gạch: lượng tử hóa offset có dấu giữa hai cột theo
  `0.125 * W`; không lặp hai mức A/B thành `ABABAB` qua sáu sự kiện mép dưới
  liên tiếp của cùng cặp cột khác item, hoặc cùng một mức ba lần liên tiếp.
  Chỉ đổi bên cao/thấp nhưng mức lệch đa dạng không tự bị coi là nhịp gạch.
  Screenshot vẫn cần nghiệm thu bằng mắt; qua chỉ số không tự chứng minh đẹp.

  Để oracle và solver đo cùng một nhịp: xét riêng mép ảnh và mép card của từng
  cặp cột kề. Ghép mỗi mép với mép gần nhất ở cột đối diện thuộc item khác;
  hòa khoảng cách thì ưu tiên y nhỏ hơn, rồi stable ID. Loại cặp item trùng,
  lấy offset `leftY - rightY`; sort sự kiện theo `max(leftY, rightY)`, rồi
  cặp stable ID đã sort. Mức lượng tử là `Math.round(offset / (0.125 * W))`.
  Áp gate ba mức giống nhau hoặc ABABAB trên chuỗi này, riêng mỗi loại mép.
- Không spacer/filler, giãn gutter hoặc đổi kích thước ảnh để giả stagger.
  Skeleton rỗng ở cuối parent là phần nối tiếp CTA được owner yêu cầu riêng
  tại R2, không phải filler giữa ảnh và không tính vào proof cân đáy ảnh thật.
  Ngoại lệ GRID-R4-B1 cho bridge span 2 chỉ còn thuộc baseline lịch sử;
  không áp dụng cho ảnh một cột của AD-BROWSE-R1/G1.

Phép đo hole candidate: chiếu bounds đầy đủ của card (ảnh + caption) lên từng
cột nó chiếm, sort theo top. Với hai card liên tiếp trong một cột:
`excessGap = max(0, next.top - previous.bottom - G)` phải `<= 0.05px` với
next span 1. Với next span 2, top phải bằng `max(bottomLeft, bottomRight) + G`;
excessGap ở cột thấp được phép `<= 0.5 * W + 0.05px`, cột cao vẫn `<= 0.05px`.
Không nâng thêm top để tạo spacer. Card đầu ở cột có dữ liệu phải bắt đầu tại
`top = 0 ± 0.05px`; không bắc span từ một cột đã có dữ liệu sang cột còn trống.
Phần sau card cuối là terminal frontier, không là interior hole.
Oracle độc lập dùng bounds, không dùng cờ solver tự trả. Fixture có bridge
trong/vượt giới hạn, bridge cùng đáy và terminal ragged. B1 thay no-hole tuyệt
đối đã khiến span 2 chỉ có thể nằm đầu mỗi cặp cột; các gate stagger giữ nguyên.

### Baseline rank-v3 lịch sử

Accepted visual contract chuyển từ Advertising spec; [data/placement algorithm](../specs/advertising-products-turnkey-services.md#layout-append-và-virtualization) vẫn do spec sở hữu.

Lưới dùng Pinterest organic masonry: cột rộng bằng nhau, card luôn rộng một cột
và chiều cao tự do theo media/canvas. Geometry kết hợp packing Pinterest với
outer band, gap và content cap đã đo từ Espacio:

```text
outerBand = 15px when layoutViewportWidth <= 750px
outerBand = 25px when 751px <= layoutViewportWidth <= 1200px
outerBand = 35px when layoutViewportWidth > 1200px

interCardGap = 15px when layoutViewportWidth <= 960px
interCardGap = 25px when 961px <= layoutViewportWidth <= 1200px
interCardGap = 35px when layoutViewportWidth > 1200px

gridWidth = min(layoutViewportWidth - (2 * outerBand), 1500px)
effectiveOuter = (layoutViewportWidth - gridWidth) / 2
columns = min(5, max(2, floor(gridWidth / 235px)))
cardWidth = (gridWidth - interCardGap * (columns - 1)) / columns
```

`layoutViewportWidth` dùng `documentElement.clientWidth`; native scrollbar không
được tính vào lưới. Content căn giữa; khi viewport rộng hơn `1570px`, grid giữ
`1500px`, vì vậy `effectiveOuter` lớn hơn outer band là đúng. Công thức phải tái
hiện các điểm chuẩn DPR `1` sau với sai số geometry tối đa `0.05px`:

| Viewport | Grid width | Effective outer | Gap | Cột | Card width |
| ---: | ---: | ---: | ---: | ---: | ---: |
| `320px` | `290px` | `15px` | `15px` | 2 | `137.5px` |
| `390px` | `360px` | `15px` | `15px` | 2 | `172.5px` |
| `750px` | `720px` | `15px` | `15px` | 3 | `230px` |
| `751px` | `701px` | `25px` | `15px` | 2 | `343px` |
| `768px` | `718px` | `25px` | `15px` | 3 | `229.333px` |
| `960px` | `910px` | `25px` | `15px` | 3 | `293.333px` |
| `961px` | `911px` | `25px` | `25px` | 3 | `287px` |
| `1024px` | `974px` | `25px` | `25px` | 4 | `224.75px` |
| `1200px` | `1150px` | `25px` | `25px` | 4 | `268.75px` |
| `1201px` | `1131px` | `35px` | `35px` | 4 | `256.5px` |
| `1440px` | `1370px` | `35px` | `35px` | 5 | `246px` |
| `1570px` | `1500px` | `35px` | `35px` | 5 | `272px` |
| `1920px` | `1500px` | `210px` | `35px` | 5 | `272px` |
| `2560px` | `1500px` | `530px` | `35px` | 5 | `272px` |

Caption: [DESIGN.md](../../DESIGN.md#advertising-caption).

## Advertising photo view

Contract hiện hành nằm tại [AD-FINAL-R1](../specs/advertising-final-polish-and-media.md),
thay các điểm tương ứng của [AD-BROWSE-R1, delta P1.4](../specs/advertising-photo-browse.md).
Mọi primary dùng span3 theo correction D10, clamp theo số cột hiện có.
Ratio≥1,80 xếp ảnh trên/chữ dưới ưu tiên61,8/38,2;
đứng/vuông xếp ảnh trái/chữ phải50/50. Clamp span theo số cột,
stack khi nửa chữ dưới240px. D11 dùng chiều cao còn lại dưới navbar/gap,
trừ gap dưới và50CSSpx ảnh thật nhô ở đáy viewport; không co khối theo lượng chữ.
Khoảng navbar
bằng gutter15/25/35px; navbar giữ shared behavior. Bỏ title detail và caption
mọi grid Advertising theo D8; giữ mô tả, category và alt. Một luồng chữ dùng
hết chiều rộng, chỉ scroll khi thực sự thiếu chỗ.
“Có thể bạn thích” nằm trong phần mô tả: D12 dùng5 nút có ảnh nền thành5
dòng, nhãn đủ chữ; cùng photo không đổi thứ tự vì bật/tắt. Chỉ một tag bật;
bấm lại tắt và giữ ảnh detail. Trạng thái bật
dùng `aria-pressed`, phân biệt với hover/focus. Bỏ reset riêng.
Related dùng cùng solver bounded, giữ N theo viewport và một cột mỗi ảnh.
Ưu tiên xếp cạnh primary; nếu không tìm được bố cục hợp lệ và còn cột cạnh
primary, có thể thử dải ảnh dưới primary trong cùng budget300.000. Giữ
intrinsic/tail/peek; không chèn spacer hoặc card giả để cân cột.
Nền banner nhãn và nền trang trí hero được cover crop;
foreground sản phẩm/hero/fit giữ intrinsic. Nền hero trùng ảnh cover+blur,
không nhận pointer/focus/accessibility hoặc tham gia morph.

Nút `Xem lớn hơn` mở viewer toàn cửa sổ, ba mức zoom và reset tại giới hạn.
Control vuông48px, nét1,5px; expand neo phải, CTA hiện hữu neo trái trong
vùng ảnh. Cả hai icon-only, hover/focus mở nhãn250ms vào trong ảnh, không
chồng hit target; reduced motion bỏ transition. CTA giữ native link VI/EN,
touch/keyboard kích hoạt ngay và không mở viewer; không lặp dưới mô tả.
P1.3 bỏ Back riêng, giữ Browser Back/Escape và navbar về parent. Header photo
dùng shared behavior; bấm lại mục hiện tại tại parent về top và giữ bộ lọc.
[Live reference](../reference/pinterest-photo-view.md) phân biệt số đo Pinterest
với contract riêng của TT. Trạng thái implementation theo [STATE](../STATE.md),
không suy target accepted là runtime đã đạt. Gallery ngoài Advertising giữ phạm vi riêng.
Không copy media, logo hoặc chức năng tài khoản Pinterest. Nghiệm thu runtime
theo report đúng revision, không kế thừa PASS từ carousel cũ.

### Cuối grid Advertising

CTA gồm hai đoạn “Dấu ấn tiếp theo” / “dành cho thương hiệu của bạn”;
EN “The next mark” / “for your brand”, không eyebrow hoặc dấu chấm/phẩy.
Giữ Plus Jakarta Sans600, line-height1,2; chữ responsive2,5–5rem và khung tối
đa78rem. Cửa sổ hẹp cho phép mỗi đoạn xuống dòng. Bỏ section quy trình và
footer invitation riêng trên Advertising; giữ capability marquee/địa chỉ/mạng xã hội.
Sau CTA chỉ1–2gutter, bao gồm phần kết thúc skeleton, không để wrapper cao thừa.

D14: pool một ảnh ở N4/span3 đặt ảnh tại cột4 cùng đỉnh primary, miễn
peek50px phía dưới. N2/N3 giữ card dưới primary và peek; không nhân bản ảnh.
D13: pool hai ảnh ở N4/span3 ưu tiên một ảnh cột4, một ảnh dưới primary;
cho phép lệch đáy ở đúng trường hợp này. Pool đầy đủ vẫn giữ gate cân đuôi.

## Advertising carousel visual

Accepted visual/interaction contract; [dependency và renderer](../specs/advertising-products-turnkey-services.md#template-chi-tiết-và-media) vẫn do spec sở hữu.

Đây là contract carousel lịch sử; photo view mới ở trên supersede entrypoint
Advertising khi compatibility đã được triển khai. Generic gallery ngoài
Advertising giữ behavior riêng.

Mọi block `gallery` dùng cùng carousel ngang, không giữ grid media cũ hoặc tạo
hai renderer song song. Contract trình bày:

- carousel breakout khỏi content cap `1500px` nhưng giữ outer band theo Espacio:
  `35px` trên desktop, `25px` từ `751–1200px`, `15px` đến `750px`;
- media viewport có chiều cao tối đa `50vw` trên desktop và `75vw` đến `750px`;
  chiều rộng từng slide lấy từ intrinsic ratio của ảnh, không kéo giãn, crop
  hoặc thêm backplate;
- slide thường giữ chiều cao tối đa và phải để lộ slide kế tiếp khi chưa ở item
  cuối. Nếu intrinsic ratio làm slide rộng hơn usable carousel width, slide đó
  được cap bằng toàn bộ usable width, giảm chiều cao theo đúng tỷ lệ tự nhiên và
  không bắt buộc để lộ slide kế; wrapper cùng control rail bám chiều cao media
  thực tế để không tạo box rỗng;
- slide gap `20px` từ `600px`, `10px` dưới `600px`;
- caption VI/EN nằm dưới từng ảnh, không overlay, không clip dấu và chỉ ẩn khi
  record không có caption; dots đặt thành một control rail riêng bên dưới;
- slide và thay đổi chiều cao wrapper chuyển trong `500ms`; hỗ trợ drag, touch,
  wheel ngang với
  `forceToAxis`, clickable dots và grab cursor; không autoplay, loop, arrow hoặc
  keyboard trap;
- reduced motion đưa slide cùng chiều cao wrapper tới vị trí mới tức thì; không
  thêm entrance hoặc exit motion cho wrapper carousel;
- trước khi Swiper sẵn sàng hoặc khi dependency lỗi, markup vẫn là native
  horizontal scroll có scroll snap, đủ caption và truy cập được mọi media.

## Checklist review pattern

- Source/API/DOM hook thật đã được link chưa?
- Input/output/error/fallback và cleanup đã rõ chưa?
- VI/EN, keyboard/focus, reduced motion và responsive state đã nêu chưa?
- Pattern có thêm abstraction hoặc token duplicate không?
- Current/accepted/planned/observed có bị trộn không?

## Chú thích thuật ngữ

- **Composition**: cách ghép nhiều entrypoint thành một route behavior.
- **Native baseline**: behavior browser dùng được trước enhancement.
- **Data-driven**: variant được chọn bằng data/schema thay vì template copy.
- **Bounded virtualization**: giữ DOM trong giới hạn theo vùng viewport.
- **Fallback**: nhánh giữ content khi enhancement hoặc data capability lỗi.
