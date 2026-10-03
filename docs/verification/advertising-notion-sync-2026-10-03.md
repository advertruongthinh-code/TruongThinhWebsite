---
title: Đồng bộ Notion và kiểm nhất quán Advertising — 2026-10-03
type: verification
status: partial
updated: 2026-10-03
source_notion: https://app.notion.com/p/3b5332849a0e80689b46e724fa43e480?v=3b5332849a0e8011b307000cca66e3c1
related_specs:
  - ../specs/site-media-card-playback.md
  - ../specs/advertising-organic-random.md
  - ../specs/advertising-photo-browse.md
  - ../specs/frontend-brand-shell-responsive-runtime.md
---

# Đồng bộ Notion và kiểm nhất quán Advertising — 2026-10-03

## Phạm vi

Đọc board Tasks của project Trường Thịnh Website từ Notion ở trạng thái hiện
hành ngày 03/10/2026, chỉ lấy work item `Not started` và `In progress` có liên
quan Advertising hoặc contract dùng trực tiếp cho route Advertising. Board ghi
`1 Not started`, `0 Up next`, `8 In progress`, `13 Done`. Chi tiết của 13 item
`Done` không được kéo vào Git; chỉ giữ số lượng để truy nguyên snapshot.

Card đang hoạt động đã đối chiếu:

| Card Notion | Status | Tóm tắt đưa vào Git |
| --- | --- | --- |
| CMS: Giữ contract Advertising grid khi CRUD ảnh, tag và phân loại | Not started | Giữ static contract; CMS adapter, CRUD, invalidation và regression là phase riêng, chưa implement. |
| Trường Thịnh Website — backlog hiện hành và phát hành snapshot 24/09 | In progress | Git pre-push/release, owner visual VI/EN, scrollbar/hero replay, asset review và physical QA còn mở. |
| Card đa media trong grid và vùng primary | In progress | `site-media-card-playback.md` là contract chuẩn; M02a focused, M02b Advertising partial/paused; ngoài Advertising vẫn paused. |
| Implement: Grid Advertising ngẫu nhiên và cải thiện tải ảnh | In progress | Random grid, skeleton và image-progress đã có local evidence; candidate chưa qua Git gate và chưa release. |
| Layout mobile toàn website — browser parity | In progress | Chỉ lấy phần Advertising compatibility route; body/native/full-site gate không mở lại. |
| Mobile viewport ổn định — toàn website | In progress | Giữ contract responsive chung; physical/native và named failures còn mở, không coi là Advertising PASS. |
| Random grid và skeleton mobile — browser parity | In progress | Random/scrollbar/skeleton lifecycle có focused evidence; iPhone/A54 performance/full parity còn mở. |
| Scrollbar theo Espacio — browser parity | In progress | Desktop overlay và mobile native là contract; owner visual/iPhone còn mở. |

Card `Chốt kiến trúc PrintWork` được loại vì không thuộc website. Không đọc hoặc
sao chép nội dung chi tiết của nhóm `Done`.

## Đối chiếu với Git và UI thật

| Kiểm tra | Kết quả | Bằng chứng |
| --- | --- | --- |
| Media-card contract và M02b status | Khớp | [`site-media-card-playback.md`](../specs/site-media-card-playback.md), [`site-media-card-m02b-checkpoint-2026-10-03.md`](site-media-card-m02b-checkpoint-2026-10-03.md), `docs/STATE.md` cùng ghi M02b partial/NOT ACCEPTED. |
| Random grid và virtual window | Khớp | Local runtime `:8792` parent VI/EN có `.advertising-grid`, `aria-setsize=154`, source/test sở hữu solver và lifecycle. |
| Parent grid tại viewport 929×861 | Đạt contract hiện hành | `.advertising-grid` là `repeat(3, minmax(0, 1fr))`; VI render 19 card, EN render 18 card trong DOM window. |
| Related grid tại `?category=print-decals&photo=print-decals-11` | Đạt contract hiện hành | `data-advertising-related-columns="3"`, 10 item visible; các item chiếm một cột trong grid 3 cột. |
| Parent/detail mô phỏng touch 390×844, DPR2 | Đạt geometry cơ bản | Parent dùng 2 cột, grid rộng 360px, không overflow ngang; detail primary rộng 360px, related dùng 2 cột và không overflow ngang. Đây là browser emulation, không thay physical gate. |
| Direct/reload marker | Chưa phát marker | Initial direct page có `markerCount=0`, đúng vì marker chỉ xuất hiện sau close/detail transition; không dùng probe này để gọi M02b GREEN. |
| CMS CRUD | Đúng boundary | Runtime/catalog vẫn static snapshot; chưa có refetch/invalidation hoặc upload UI. |
| Impeccable visual detector | Có 1 cảnh báo cần theo dõi | `src/site/detail.css:2133` có `transition: width`; nó thuộc expand action đã có, nhưng chưa được ghi rõ trong surface brief. 67 advisory typography/color không tự chứng minh lỗi UI. |

## Lệch đã sửa

`.impeccable/surfaces/route-vi-advertising-products.md` từng viết parent/related
“giảm xuống một cột”. Source và test hiện hành dùng số cột responsive, còn mỗi
item chỉ chiếm một cột; surface brief đã được sửa thành câu này để không dẫn
đường implementation sai.

## Giới hạn và bước tiếp theo

- Đây là đồng bộ read-only; không đổi status hoặc nội dung card Notion.
- `impeccable audit` không tồn tại trong CLI đang cài; đã chạy `impeccable context`
  và `impeccable detect --json`, sau đó đối chiếu source/runtime thủ công.
- Graphify AST đã fresh nhưng semantic index còn pending theo policy; không chạy
  semantic extraction vì owner chưa yêu cầu.
- M02b vẫn partial/NOT ACCEPTED. Chỉ tiếp tục QA hoặc sửa source khi owner mở
  đúng checkpoint; không chạy lại body210 trong task đồng bộ docs này.

## Chú thích thuật ngữ

- **Compatibility route**: URL category cũ chuyển về parent nhưng vẫn phải giữ hành vi đã duyệt.
- **Marker**: lớp `Vừa xem`/`Just viewed` của card vừa đóng gần nhất trong runtime tab.
- **Partial**: có evidence một phần nhưng chưa đủ điều kiện nghiệm thu.
