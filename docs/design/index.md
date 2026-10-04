---
title: Quyền sở hữu và routing design system
type: design
status: living
updated: 2026-10-03
related_docs:
  - ../../PRODUCT.md
  - ../../DESIGN.md
  - ../../.impeccable/design.json
  - ../specs/living-docs-design-system.md
---

# Quyền sở hữu và routing design system

Thư mục này giúp agent tìm đúng guide trước khi sửa UI, content hoặc motion.
Nó mô tả cách reuse implementation hiện có; không tạo component library mới,
không thay `PRODUCT.md`, không thay root `DESIGN.md` và không biến Espacio
baseline thành production contract.

## Authority map

| Contract | Nguồn chuẩn | Guide liên quan |
| --- | --- | --- |
| Product, user, job, claim, confirmed fact | [`PRODUCT.md`](../../PRODUCT.md) | [`content.md`](../../design-system/content.md) chỉ dẫn copy/media, không thay product truth |
| Visual token, visual role, current accepted system | [`DESIGN.md`](../../DESIGN.md) | [`style-guide.md`](style-guide.md), [`components.md`](components.md) |
| Logo: tỷ lệ, màu, motion và acceptance visual | [Brand lockup](../../DESIGN.md#brand-lockup--nguồn-chuẩn) | Style guide hướng dẫn áp dụng; frontend spec giữ integration/QA, chỉ ref target |
| Impeccable sidecar, motion/breakpoint/specimen | [`.impeccable/design.json`](../../.impeccable/design.json) | `DESIGN.md` là authority prose/token; sidecar giữ extension |
| VI/EN copy, alt/ARIA, media và route content | [`content.md`](../../design-system/content.md) | `content.md` là nguồn chuẩn duy nhất của design guide cho content/media |
| Tiêu chí ảnh sáu nhóm Advertising, Audit/Critique | [`advertising-images.md`](../../design-system/advertising-images.md) | `content.md` giữ policy media/người dùng chung; không lặp rubric trong Impeccable brief |
| Shared/Advertising motion và choreography | [`motion.md`](../../design-system/motion.md) | Logo riêng theo DESIGN; specs chỉ dẫn contract, giữ runtime integration |
| Masonry/carousel visual composition | [`patterns.md`](patterns.md) | Advertising spec giữ data/algorithm/dependency/QA |
| Public route và lifecycle contract | [`frontend-route-and-content.md`](../specs/frontend-route-and-content.md) | [`components.md`](components.md), [`patterns.md`](patterns.md) |
| Current implementation evidence | `src/site/`, `scripts/`, `tests/` | [`components.md`](components.md) |
| Espacio measured reference | [Corpus tổng hợp](../../design-system/reference-espacio.md), candidate revision có provenance | Không tự nâng candidate thành owner-locked target hoặc current runtime proof |
| CMS/admin boundary | [`backend guide`](../backend/index.md) và [`cms-content-publishing.md`](../specs/cms-content-publishing.md) | Không đưa admin primitive vào public visual system |

Root `DESIGN.md`, sidecar và surface briefs là artifact của hệ thống docs dù
nằm ngoài `docs/`. Sidecar được phép quản lý trong Git cùng root record;
không chỉ giữ unique extension trong cache local. Khi source/test chỉ cho
thấy implementation hiện tại, giữ claim ở mức `observed`; chỉ owner hoặc
accepted spec mới nâng claim thành `accepted`.

## Status model

- `accepted`: owner hoặc accepted spec đã chốt; thay đổi cần decision/review phù hợp.
- `current`: đang là implementation source hiện tại; chưa tự động là design target.
- `observed`: đọc được từ source/test/evidence hiện tại, chưa được nâng thành design.
- `planned`: contract tương lai đã có boundary, chưa chạy trong current release.
- `experimental`: thử nghiệm có scope và evidence riêng, không phải default reuse.
- `dormant`: source giữ lại nhưng capability chưa active.
- `deprecated`/`superseded`: giữ lịch sử và link replacement; không dùng cho code mới.

Khi `accepted` khác `observed`, ghi cả hai và thêm gap. Không dùng ngày file,
tên report hoặc độ mới của output để tự suy ra authority.

## Guide routing

| Câu hỏi | Mở file |
| --- | --- |
| Dùng màu, chữ, image grammar, voice thế nào? | [`style-guide.md`](style-guide.md) |
| Copy, VI/EN, alt, media, owner fact nào được dùng? | [`content.md`](../../design-system/content.md) |
| Reuse source/API/DOM/lifecycle nào? | [`components.md`](components.md) |
| Motion, text reveal, media replay và reduced motion? | [`motion.md`](../../design-system/motion.md) |
| Ghép shell, grid, gallery, renderer ra sao? | [`patterns.md`](patterns.md) |
| File nào canonical, status/supersession thế nào? | [Authority map](#authority-map), [Supersession](#supersession) |
| Route/runtime current hay CMS dormant? | [`frontend guide`](../frontend/index.md), [`backend guide`](../backend/index.md) |

## Reuse boundary

Public shell hiện là markup static lặp lại trong HTML, shared CSS và shared
runtime. Advertising catalog là data-driven runtime; detail pages là build-time
renderer dùng một template. Generic detail gallery và Advertising carousel là
hai pattern khác nhau. Không invent `Header`, `Footer`, `Shell`, gallery API hoặc
route component chỉ vì markup có vẻ lặp.

Mỗi reference phải chỉ ra source, input/DOM, output/consumer, error/fallback,
state, accessibility, i18n, reduced motion, cleanup, test và customization
boundary. Extraction/token migration thuộc boundary riêng theo
[`extract` boundary](../specs/living-docs-design-system.md), không phải việc của
guide routing/reuse.

## Living-docs impact gate

| Trigger | Cập nhật cùng task | Bằng chứng tối thiểu |
| --- | --- | --- |
| Token, typography, layout, component state | `DESIGN.md`, sidecar khi cần, `components.md`/`patterns.md` | Source token, state, a11y và test consumer |
| DOM hook, public API, lifecycle | `components.md` và owning frontend spec | Exact symbol/consumer, input/output/error/cleanup |
| Copy, i18n, media, factual claim | `content.md`; `PRODUCT.md` hoặc decision nếu product/owner fact đổi | VI/EN leaf, alt/ARIA, owner fact |
| Backend/CMS/admin status | [`backend guide`](../backend/index.md) và CMS spec | Current/dormant/planned, trust boundary, fallback |
| Command/tooling/ownership | Rule hoặc operations doc sở hữu command | Command tồn tại, scope và rollback |
| Không có impact | Không thêm guide/report | Ghi lý do cụ thể trong handoff |

Không copy status, blocker hoặc Kanban từ Notion vào guide. Git giữ guide,
accepted spec, decision và evidence; Notion giữ planning/status theo
[`docs/STATE.md`](../STATE.md).

## Supersession

Owner review là gate trước khi merge hoặc dùng guide làm target mới. Khi source
đổi mà accepted target chưa đổi, ghi `observed` và gap, không tự sửa design
requirement. Cập nhật `updated` chỉ khi contract thực sự đổi.

Khi accepted decision đổi:

1. Tạo hoặc cập nhật descriptive decision mới.
2. Link decision cũ bằng `supersedes`/`superseded_by`, hoặc xóa file tracked
   cũ khi owner duyệt gộp (Git history giữ provenance).
3. Cập nhật guide sở hữu contract cùng slice.
4. Ghi migration/rollback và evidence; remap mọi link trong cùng slice.

Docs migration snapshot path/status/hash trước mutation, preserve unrelated
work, giữ original report bytes trong archive. Rollback chỉ phục hồi path do
task sở hữu sau khi kiểm concurrent edit.

## Impeccable

Context loader của skill `impeccable` đọc root `PRODUCT.md`, `DESIGN.md` và
brief khớp tại `.impeccable/surfaces/`; không move các artifact đó vào `docs/`.
Sidecar [`design.json`](../../.impeccable/design.json) schema v2 chỉ giữ
extension và specimen, không sao chép token primitive; narrative là projection
từ DESIGN, không sửa độc lập. Sidecar được Git quản lý; config local và runtime
cache vẫn ignored. `init`/`document` chỉ cập nhật trong scope user giao, không
tự thay accepted identity hoặc owner fact. `extract` có thể refactor source nên
cần task và verification riêng.

## Verification

- Kiểm local link/anchor và source path sau mỗi slice.
- Đối chiếu exact symbol/DOM hook/test; không gọi historical report là current PASS.
- Root `DESIGN.md`/sidecar phải được đối chiếu theo schema Impeccable khi visual
  token hoặc role được chấp nhận.
- Guide design không tự mở source migration, browser, build, canonical parity
  hoặc semantic Graphify chỉ vì nội dung đã được cập nhật.

## Chú thích thuật ngữ

- **Authority**: nguồn có quyền quyết định một contract.
- **Observed**: điều đang thấy trong source/evidence, chưa thành design target.
- **Supersession**: decision/guide mới thay thế nhưng vẫn giữ liên kết lịch sử.
- **Customization boundary**: phần consumer được phép thay đổi mà không phá contract.
- **Impact gate**: điều kiện buộc cập nhật đúng tài liệu khi behavior hoặc contract đổi.
- **Sidecar**: phần mở rộng đi cùng DESIGN, không thay token authority.
- **Specimen**: mẫu hiển thị; không tự là module production để import.
