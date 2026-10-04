---
title: Advertising grid tự nhiên 1–2 cột
type: frontend
status: accepted
updated: 2026-09-10
notion: https://app.notion.com/p/3cd332849a0e817ab32df5dca7c6c9c4
---

# Advertising grid tự nhiên 1–2 cột

**Delta mới đã duyệt:** [AD-BROWSE-R1](advertising-photo-browse.md), owner
duyệt ngày 2026-09-10, thay contract Auto resolve span trước packing và flow
detail theo category bằng view từng ảnh. Plan mới đã duyệt, đang triển khai; đoạn GRID-R4
bên dưới giữ baseline và các yêu cầu không bị delta thay thế. Evidence cũ
không chứng minh behavior mới đã triển khai.

**Interview bổ sung 2026-09-10:** owner chốt ảnh luôn rộng một cột ở cả parent
và related; R1/G1 của AD-BROWSE-R1 thay policy Auto/manual span 1/2 cùng ngoại
lệ bridge span 2. Các gate stagger/anti-brick, intrinsic ratio, gutter và
caption bên dưới giữ nguyên. Owner đã duyệt delta plan AD-BROWSE-R1-P1.1;
source public dùng policy một cột v6, không xóa evidence Auto v5. Owner đồng thời bỏ
lựa chọn Auto / 1 cột / 2 cột và thiết lập threshold Auto ở interface mới;
phần data/CMS dưới đây giữ lịch sử, không dùng để tạo lại các lựa chọn đã bỏ.

## Revision và mục tiêu

**GRID-R4 — owner duyệt spec và plan ngày 2026-09-09.** Thực hiện sau LOGO-R2
theo thứ tự owner yêu cầu. **Bổ sung GRID-R4-B1 đã duyệt:** cho phép cavity tại
bridge span 2 theo visual authority; các vị trí khác giữ gutter.
Chưa sửa runtime masonry hoặc tạo ảnh cho revision này.
Đây là delta của
[Advertising spec](advertising-products-turnkey-services.md), không phải
taxonomy hoặc component system mới. [Plan](../../tasks/archive/plan.md#grid-r4--kế-hoạch-đề-nghị)
giữ thứ tự thực hiện; Notion giữ checklist/status.

Khách xem parent `/vi/advertising-products/` và `/en/advertising-products/`
thấy ảnh nguyên tỷ lệ, kích thước khung dễ hiểu và masonry so le organic ổn định
qua reload. Sáu filter dùng cùng thuật toán. Đặc tả này không mở CMS UI;
nó chuẩn bị data contract để CMS sau này quản lý.

## Nguồn chuẩn và phạm vi thay thế

| Hợp đồng | Nguồn duy nhất |
| --- | --- |
| Cột, kích thước ảnh, stagger, nhịp gạch và khoảng trắng | [GRID-R4 visual](../design/patterns.md#advertising-masonry-geometry) |
| Caption và token | [DESIGN](../../DESIGN.md#advertising-caption) |
| Motion, media entrance, reduced motion | [Motion guide](../design/motion.md#advertising-motion) |
| Sáu nhóm ảnh, khách hàng, cấu tạo, brief, người/chữ/provenance và điểm | [Image quality](../design/advertising-image-quality.md) và các ref trong đó |
| Data, algorithm, cache, migration và kiểm thử R4 | File này |

R4 thay max-5/single-column, canvas/fitMode/backplate, round-robin/FIFO ép thứ
tự, shortest-column đơn thuần và miễn gate đáy của rank-v3. Không khôi phục
scheduler rank-v2 chỉ vì owner dùng từ “closed frontier”: ở R4 đó là đường bao
mép dưới cần so le. Giữ taxonomy sáu nhóm, gutter/caption, route, navigation,
Masonry/Outlayer motion, lazy loading, virtualization và lifecycle.

Pool `109` và count `24/16/22/13/18/16` là baseline, không là trần mới.
R4 cho thêm/thay ảnh theo audit; không giảm coverage 12 product label mỗi nhóm.
Sáu detail route giữ composition family; khi asset đổi, cập nhật reference và
partition hero/body để mỗi source của nhóm xuất hiện đúng một lần. Giữ thứ tự
detail đã duyệt ngoài slot thêm/thay cần thiết; không áp layout span parent vào
carousel/detail. Cover dùng ở homepage/hero chỉ đổi khi audit chỉ ra đúng asset
cần thay, có impact review riêng trong cùng scope media.

## Data và boundary CMS

Giữ `id`, `category`, `productKey`, `sourceOrder`, caption/alt VI/EN, source ID,
path và intrinsic pixel thật. Candidate API mới, chưa có trong source:

```js
const advertisingSettings = { landscapeThreshold: 1.25 };
const cardLayout = { layoutSpan: "auto" }; // "auto", 1 or 2
```

- `X` là width, `Y` là height, gốc dưới trái, +X sang phải, +Y lên theo hình
  owner. Dùng `r = X / Y` từ pixel thật; CSS dùng y đi xuống chỉ là biểu diễn
  tọa độ render, không đảo ratio hoặc tên ngang/đứng.
- `layoutSpan = 1|2` thắng Auto. Với Auto: `r > T` dùng 2, `r <= T` dùng 1.
  Near-square gồm `1/T <= r <= T`; portrait `r < 1/T`; landscape `r > T`.
  Các nhãn này phục vụ Auto; coverage ratio cũ không phải threshold setting.
- Default đã duyệt `T = 1.25`; bắt buộc finite và `T > 1`.
  Input sai bị reject với field lỗi, không âm thầm clamp; trường bị thiếu trong
  migration lấy default và ghi vào artifact. Equality tại T thuộc span 1.
- Static phase dùng một bước chuẩn bị dữ liệu để gán Auto/1/2 ngẫu nhiên một
  lần, rồi lưu **literal theo stable ID trong manifest có version/hash**.
  Random chỉ thuộc bước chuẩn bị này; build/runtime chỉ đọc literal và không
  gọi lại bước gán. Rebuild/reload không gán lại span. Không dùng thời gian
  hoặc network để quyết định span/order. Không làm giả width/height hoặc
  resize méo ảnh để tạo ratio. Chỉ generator tạo ảnh mới có bố cục/tỷ lệ khác.
- Global threshold áp toàn catalog; `layoutSpan` thuộc item ảnh trong masonry.
  CMS sau này có Settings global và lựa chọn Auto/1 cột/2 cột khi đăng ảnh.
  Draft preview/publish phải validate cùng contract, không lưu arbitrary CSS.
  Schema/provider/admin và publishing thực tế vẫn thuộc CMS phase.

## Thuật toán và tính lặp lại

Giữ một pure core cho build và runtime. Candidate revision artifact/algorithm
`advertising-grid-v4`; không phát artifact mới với version v3. Chọn media theo
source đã audit, bỏ việc chọn candidate để khớp canvas. Core nhận đầy đủ pool
của filter, settings, viewport usable width và version; output gồm ordered ID,
span, coordinates, image/card bounds, total height, hash và diagnostics.

Ưu tiên kiểm feasibility sớm bằng search có giới hạn: thử một cửa sổ candidate
card và các vị trí cột liên tiếp hợp lệ; lookahead/backtrack hữu hạn khi chạm
bridge hoặc tail. Loại overlap, overflow, cavity vượt B1 hoặc vi phạm span/natural ratio
trước; đánh giá stagger/nhịp theo visual contract, rồi độ gọn của masonry. Tie cố
định theo sourceOrder, stable ID, vị trí cột. Search budget/window là hằng số
có version, được chọn bằng focused benchmark, không worker tự thêm dependency.

Cho phép đổi thứ tự cả All và category để đạt organic. Với cùng tập dữ liệu,
settings, filter, usable viewport và version, phải cho cùng geometry/order/hash
qua build, reload, filter round-trip và locale có cùng caption metrics. Hash/
cache key bao gồm mọi input ảnh hưởng geometry, kể cả span, threshold, pixel
dimensions và caption metrics version; không chỉ đếm cột.

Compile toàn bộ filter trước, cache kết quả và virtualize một cửa sổ placements.
Append ở runtime là mount thêm từ cùng kết quả đã compile, không gọi solver với
prefix ngắn rồi repack phần đang nhìn. Thay dataset/settings tạo revision mới,
được recompile; không giữ guarantee cũ “compile riêng prefix bằng prefix của
full pool” vốn mâu thuẫn với lookahead. DOM/keyboard theo thứ tự đọc visual
`y`, `x`, stable ID; giữ focus bằng ID qua filter/resize, ARIA position/setsize
khớp tập hiện hành. Masonry chỉ dùng coordinates của core để transition.

### Dữ liệu chưa đủ hoặc search chưa tìm được kết quả

Không cam kết solver hữu hạn giải được mọi tỷ lệ và lựa chọn span tùy ý.
Phân biệt `invalid-input`, `proven-infeasible` (có chứng minh) và
`search-exhausted` (chưa tìm được trong budget). Không gọi mọi search thất bại
là bất khả thi. Diagnostic chỉ rõ filter/viewport/ID, vi phạm và phần còn thiếu.

Với pool public trong scope: audit nguyên nhân, thêm/tạo lại đúng ảnh/tỷ lệ còn
thiếu, reviewer độc lập chấm theo image guide, chạy lại solver và visual QA.
Không sửa lựa chọn span của admin, crop, kéo méo, chèn filler, giãn gutter hoặc
giảm stagger để lấy PASS. Nếu hết search budget vì thuật toán, sửa thuật toán
trước khi tốn quota tạo ảnh không cần thiết. Input lỗi hoặc pool public chưa
đạt chặn build/publish R4; giữ last verified release, không thay bằng masonry lỗi.
CMS tương lai báo lỗi preview cho admin, không tự sửa media thật.

## Gỡ fitMode và migration

Xóa field/code/DOM/CSS/fixture chỉ phục vụ Advertising canvas/fit/backplate:
`fitMode`, `presentationCanvas`, `auto-cover`, `fit-x-blur`, `fit-y-blur` và
alias nếu có consumer. Không xóa global `object-fit: cover` của hero/gallery
khác. Chuyển test cũ sang assertion về hành vi mới; không xóa regression ngoài
phần đã supersede. Docs current cập nhật cùng code, historical evidence chỉ
thêm ref/status. Giữ source/backup cũ; chỉ xóa asset không còn consumer sau
kiểm tra toàn route. Rollback dùng source delta và manifest phiên bản trước,
build lại; không broad reset worktree đang có nhiều thay đổi.

## Acceptance và kiểm thử

| ID | Điều kiện | Bằng chứng |
| --- | --- | --- |
| R4-1 | Auto/1/2 và T đúng, pixel thật, không fit/canvas/backplate | Unit T−epsilon/T/T+epsilon, invalid/missing, override portrait-2 và landscape-1; rendered image bounds |
| R4-2 | Visual contract đạt 2/3/4 cột, natural ratio, stagger và anti-brick | Oracle hình học độc lập với solver, toàn All + sáu filter; screenshot; không lấy output core làm expected duy nhất |
| R4-3 | Reload/order/hash ổn định; mount prefix từ full layout giữ tọa độ; không overlap/cavity vượt B1 | Hai lần build, reload, filter round-trip, resize boundary; adversarial ratios/spans; phân biệt lỗi và search exhaustion |
| R4-4 | Virtualization/focus/motion/readiness không regress | 3.000 card, vị trí 2800–2820, bounded DOM/cohort, keyboard, rapid filter, no-op scroll, history, VI/EN, reduced motion và dependency failure |
| R4-5 | Bộ ảnh đúng sáu nhóm/coverage, từng ảnh đạt riêng Audit ≥8/10 và Critique ≥8/10 theo nguồn rubric; detail references hợp lệ | Reviewer khác generator, asset hash + hai bảng điểm từng ảnh dùng, lỗi/sửa/chấm lại nếu chưa đạt; contact sheets, partition hero/body và visual masonry sau khi thay media |

Empty filter phải hiện trạng thái rỗng đúng; fixture 1 item chỉ kiểm cấu trúc và
diagnostic cần thêm ảnh, không dùng nó miễn gate bộ public. Kiểm widths đang có
trong Advertising spec và boundary −1/0/+1; bắt buộc 320/390/768/1024/1440/
1920/2560. Sai số geometry theo baseline visual; threshold T đổi phải invalid
cache. Hai span cùng ảnh được miễn so sánh nội bộ, không miễn với ảnh khác ở
cột bên cạnh. Không coi lệnh test pass là owner đã thích bố cục.

Commands hiện có, chạy tuần tự và chỉ gate liên quan sau mỗi slice:

```powershell
node --test tests/site/advertising-products-layout.test.mjs tests/site/advertising-products-media.test.mjs
node --test tests/site/advertising-products-lifecycle.test.mjs tests/site/advertising-products-static.test.mjs tests/site/advertising-products-detail-routes.test.mjs
pnpm prepare:site
pnpm qa:static
pnpm dev
# Trong terminal khác, chỉ đặt một flag cho mỗi lượt focused E2E.
$env:TT_E2E_ADVERTISING_GRID_ONLY = '1'
pnpm qa:site
Remove-Item Env:TT_E2E_ADVERTISING_GRID_ONLY
```

Các flag hiện có cần dùng theo impact: `KEYBOARD_ONLY`, `3K_ONLY`, `PROOF_ONLY`,
`LOCALE_LIFECYCLE_ONLY`, `RAPID_FILTER_ONLY`, `HISTORY_ONLY`, `DIRECT_FAILURE_ONLY`
đều có prefix `TT_E2E_ADVERTISING_`. Không chạy full canonical Espacio hoặc full
site lặp để thay focused evidence. Main mở local browser khi website đổi, ghi
current-hash proof vào `docs/verification/` rồi cập nhật Notion.

## Ownership và ranh giới

Source: `src/site/advertising-products/{layout-core,catalog,media-contract,
media-manifest,catalog-runtime}.mjs`, `src/site/detail.css`, builder tại
`scripts/site/prepare-static-assets.mjs`; test `tests/site/`. Reuse pure function
`compileAdvertisingLayout(options = {})` và named exports; code comment English,
Markdown/copy Vietnamese. Không viết vào `.site-output/`.

Luôn giữ stable IDs, audit provenance, focused regression và living docs.
Không cài dependency, đổi CMS/provider, commit/push/deploy hoặc chỉnh logo trong
R4. Logo có thẻ độc lập. Spec/plan và bổ sung B1 đã được owner duyệt trước code;
model/effort thực thi theo plan và capability lúc dispatch.

## Chú thích thuật ngữ

- **Span**: số cột liên tiếp một ảnh chiếm, gồm gutter ở giữa nếu có.
- **Frontier**: đường bao đáy cột; không phải một batch/hàng phải đóng phẳng.
- **Oracle độc lập**: kiểm bằng bounds/công thức/fixture riêng, tránh tự xác nhận solver.
- **Search-exhausted**: hết budget tìm kiếm, chưa chứng minh dữ liệu vô nghiệm.
- **Partition**: chia source vào hero/body không thiếu hoặc trùng.
