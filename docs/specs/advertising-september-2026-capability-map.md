---
title: Capability map Advertising tháng 09/2026
type: cross-cutting
status: accepted
updated: 2026-09-22
notion: https://app.notion.com/p/3d8332849a0e8177ba63d3b965242c90
related_decisions: []
related_reports:
  - ../verification/advertising-september-p3-2026-09-21.md
  - ../verification/advertising-september-p7-2026-09-23.md
---

# Capability map Advertising tháng 09/2026

Owner duyệt module boundary và thứ tự ưu tiên ngày `2026-09-20`. Map này là
index của năm spec độc lập; không tự thay thế human gate của từng spec hoặc plan.

| Module id | Trách nhiệm | Phụ thuộc | Card Notion |
| --- | --- | --- | --- |
| `kiosk-fair-publish` | Xuất bản exact ảnh kiosk trong hội chợ đã qua gate, bổ sung tag/label và mô tả VI/EN | — | [Card](https://app.notion.com/p/3e0332849a0e8111999ce78454b21ae1) |
| `skeleton-flow` | Renderer WebGL tái tạo Flow từ công thức đã đo, đủ 12 preset và lifecycle tiết kiệm tài nguyên | — | [Card](https://app.notion.com/p/3e0332849a0e811dbac1e7bb09ea28be) |
| `skeleton-flow-devtools` | Editor tune tạm thời; đã gỡ khỏi public source ngày24/09 trước ship | `skeleton-flow` | [Card skeleton](https://app.notion.com/p/3e0332849a0e811dbac1e7bb09ea28be) |
| `photo-morph-scroll` | Giữ photo morph đúng khi user cuộn viewport | — | [Card](https://app.notion.com/p/3e0332849a0e8178a964de1dd951db71) |
| `brand-lockup-typeset` | Typeset lại title/subtitle theo khối `4Y` và tỷ lệ thân chữ `61,8%` | — | [Card](https://app.notion.com/p/3e0332849a0e8147a613d929612f5bd3) |
| `photo-detail-layout` | Detail span 3: ảnh 2 cột, mô tả 1 cột; CTA, gợi ý và nền blur dùng composition thống nhất | `photo-morph-scroll` | [Card hợp nhất](https://app.notion.com/p/3d8332849a0e8177ba63d3b965242c90) |
| `photo-viewer-controls` | Wheel/middle zoom và cụm `+`/`−`/Reset dùng chung một zoom state | `photo-detail-layout` | [Card hợp nhất](https://app.notion.com/p/3d8332849a0e8177ba63d3b965242c90) |
| `advertising-page-shell` | CTA giao skeleton–khoảng trắng và nav Advertising luôn về filter Tất cả | `skeleton-flow` | [Card hợp nhất](https://app.notion.com/p/3d8332849a0e8177ba63d3b965242c90) |
| `media-review-report` | Báo cáo HTML ảnh tạo từ `10/09/2026` đến `20/09/2026`, clustering và đề xuất ảnh | — | [Card](https://app.notion.com/p/3e0332849a0e8175844ce3444a75f975) |

Owner duyệt correction ngày `2026-09-20`: bốn module
`brand-lockup-typeset`, `skeleton-flow`, `photo-morph-scroll` và
`photo-detail-layout` được thực thi trước, có thể song song khi ownership file
không trùng; `media-review-report` giữ sau cùng. `kiosk-fair-publish` đã hoàn tất
và không bị correction này mở lại.

Owner duyệt correction ngày `2026-09-21`: bỏ dải năng lực Advertising; CTA là
một composition vừa vùng viewport dưới header với tỷ lệ skeleton/text là
`38,2/61,8`, mobile hoặc viewport thấp dùng skeleton tối đa `28%`. Footer chung
bắt đầu ở flow kế tiếp. `photo-morph-scroll` mở rộng cho native Back/Forward đủ
bốn hướng và phải giữ geometry ổn định khi scroll lock đổi scrollbar hoặc con
trỏ còn hover card.

Owner duyệt correction ngày `2026-09-21`: giữ các module id cũ
`skeleton-flow` và `photo-detail-layout`; thêm ba module id
`skeleton-flow-devtools`, `photo-viewer-controls` và `advertising-page-shell`.
Build order là `skeleton-flow` trước `skeleton-flow-devtools`; ba module UI còn
lại có thể triển khai độc lập sau khi spec và plan mới qua human gate.

P3-T01–P3-T07 đã đạt technical gate trên local build ngày `2026-09-21`; xem
[evidence P3](../verification/advertising-september-p3-2026-09-21.md). P3-T08
đã gỡ editor khỏi source public ngày24/09 theo yêu cầu phát hành; giữ nguyên
preset hiện hành, không nhận draft local. [Removal](advertising-skeleton-flow-devtools.md)
không đổi kết luận owner visual của evidence P3.

Owner duyệt capability map correction `AD-SEPT-2026-P6` ngày `2026-09-22`:

| Module id | Trách nhiệm | Phụ thuộc | Card Notion |
| --- | --- | --- | --- |
| `shared-footer-boundary` | Footer dùng chung toàn site, khoảng thở responsive và mốc dừng skeleton | — | Spec P6 đã duyệt |
| `shared-media-hover` | Một primitive motion ảnh `1:1` cho homepage portal, Advertising grid/related và suggestion; active suggestion bất động | — | Spec P6 đã duyệt |
| `portal-type-fit` | Kicker, title và subtitle portal dùng cùng cỡ theo từng role, không clip hoặc xuống dòng trong VI/EN | `shared-media-hover` | Spec P6 đã duyệt |
| `skeleton-cta-field` | Giữ entry qua page visibility, đa dạng tỷ lệ card, global blur/fade, CTA spacing và dừng trước footer | `shared-footer-boundary` | [Card skeleton](https://app.notion.com/p/3e0332849a0e811dbac1e7bb09ea28be) |

Build order P6: `shared-footer-boundary` và `shared-media-hover` trước;
`portal-type-fit` và `skeleton-cta-field` sau; cuối cùng chạy regression tích
hợp toàn site. Map và bốn module spec đã được owner duyệt ngày `2026-09-22`;
implementation chờ owner duyệt plan `AD-SEPT-2026-P6`.

Owner duyệt capability map correction `AD-SEPT-2026-P7` ngày `2026-09-22` và
cho phép Codex tự duyệt spec, plan, task; owner kiểm kết quả cuối:

| Module id | Trách nhiệm | Phụ thuộc | Nguồn chuẩn |
| --- | --- | --- | --- |
| `advertising-hero-once` | Hero Advertising chỉ chạy một lần trong mỗi document load; filter chỉ cập nhật grid | — | `advertising-final-polish-and-media.md` |
| `skeleton-cta-field` | Preset Feral với Scale 100, solver mobile 1–2 canvas, tail một viewport và một surface glass `clear → blur → white` | `shared-footer-boundary` | `advertising-skeleton-flow.md` |
| `photo-detail-layout` | Pinterest mode khi primary chiếm toàn bộ span, primary `100dvh`, description pager và suggestion là card đầu related grid | `photo-morph-scroll`, `shared-media-hover` | `advertising-photo-browse.md` |
| `shared-header-shell` | Giữ navbar geometry đã duyệt; phục hồi CTA Zalo trong menu và cân CTA/X trên cùng shared shell | — | `frontend-brand-shell-responsive-runtime.md` |

Build order P7: khóa regression rồi sửa `advertising-hero-once`; tiếp theo
`skeleton-cta-field` và `photo-detail-layout` theo thứ tự vì cùng sở hữu
`catalog-runtime.mjs`/`detail.css`; `shared-header-shell` chỉ patch boundary menu
và chạy sau cùng. Cuối cùng chạy matrix tích hợp VI/EN, desktop/mobile,
history/filter, touch, menu và footer. Không cài dependency, không đổi route,
không stage, commit, push hoặc deploy.

## Spec module

- [kiosk-fair-publish](advertising-kiosk-fair-publish.md)
- [skeleton-flow](advertising-skeleton-flow.md)
- [skeleton-flow-devtools](advertising-skeleton-flow-devtools.md)
- [photo-morph-scroll](advertising-photo-morph-scroll.md)
- [brand-lockup-typeset](brand-lockup-typeset-r4.md)
- [photo-detail-layout](advertising-photo-browse.md#r8--accepted-detail-span-3-và-gợi-ý-một-dòng--2026-09-21)
- [photo-viewer-controls](advertising-photo-browse.md#r9--accepted-viewer-wheelmiddle-zoom--2026-09-21)
- [advertising-page-shell](advertising-final-polish-and-media.md#d20--accepted-cta-giao-skeletonkhoảng-trắng-và-nav-reset--2026-09-21)
- [media-review-report](advertising-media-review-report.md)
- [shared-footer-boundary](frontend-brand-shell-responsive-runtime.md#shared-footer-boundary--accepted-p6)
- [shared-media-hover](frontend-landing-page-foundation.md#shared-media-hover--accepted-p6)
- [portal-type-fit](frontend-landing-page-foundation.md#portal-type-fit--accepted-p6)
- [skeleton-cta-field](advertising-skeleton-flow.md#correction-r10-accepted--mobile-tail-scale-100-và-unified-glass)
- [advertising-hero-once](advertising-final-polish-and-media.md#d21--correction-p7-hero-one-shot)
- [photo-detail-layout P7](advertising-photo-browse.md#r15--correction-p7-pinterest-primary-và-description-pager)
- [shared-header-shell](frontend-brand-shell-responsive-runtime.md#shared-header-shell--correction-p7)

## Chú thích thuật ngữ

- **Capability map**: bản đồ module, dependency và build order đã được owner duyệt.
- **Module id**: khóa ổn định để nối spec, plan, task và evidence.
- **Human gate**: điểm dừng để owner duyệt artifact trước phase kế tiếp.
