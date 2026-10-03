---
title: Ledger Advertising AD-SEPT-2026 P2 đến P7
type: verification
status: current
updated: 2026-10-03
scope: AD-SEPT-2026-P2, P3, P4, P5, P6 (P6.1, P6.2), P7
related_specs:
  - ../specs/advertising-september-2026-capability-map.md
  - ../specs/advertising-skeleton-flow.md
  - ../specs/advertising-photo-browse.md
  - ../specs/advertising-photo-morph-scroll.md
  - ../specs/frontend-brand-shell-responsive-runtime.md
  - ../specs/frontend-landing-page-foundation.md
---

# Ledger Advertising AD-SEPT-2026 P2 đến P7

Gộp sáu report phase ngày 21–23/09/2026. Mỗi mục là focused technical gate
trên local build tại ngày ghi; không là full-site parity, owner visual
acceptance hoặc quyền ship. Bảng hash SHA-256 source/output, đường dẫn artifact
`.tmp/` và bảng gate đầy đủ nằm trong bản gốc tại Git `e6cf065`
(`docs/verification/advertising-september-p{2..7}-*.md`).

Các phase sau: [P7.1/P7.2](advertising-september-p7-1-p7-2-2026-09-23.md),
[P7.3](advertising-september-p7-3-2026-09-23.md),
[P7.5](advertising-september-p7-5-2026-09-24.md).

## Trạng thái mở chung (cập nhật 2026-10-03)

| Item | Trạng thái |
| --- | --- |
| P3-T08 gỡ dev UI `?skeleton-dev=1` | Đóng 24/09: editor gỡ khỏi public source, giữ preset hiện hành; xem [release cleanup](release-cleanup-2026-09-24.md#cleanup-đã-thực-hiện) |
| Owner visual acceptance P2–P7 | Mở |
| Performance trên Galaxy A54 thật | Mở; chỉ có synthetic và emulation |
| Full `pnpm qa:site`, canonical Espacio parity | `NOT PASS` |

## P2 — Flow, detail span 2, morph history, CTA, logo R5 (21/09)

- Skeleton tám palette dịu; `Scale / Distortion / Swirl / Speed` là một FIELD
  chung; Flow chỉ chạy khi visible.
- Detail từ tablet span 2, ảnh trái mô tả phải; bốn gợi ý dưới mô tả.
- Photo morph khóa scroll; native Back/Forward chạy `grid↔detail`,
  `detail↔detail` trong 300 ms; scrollbar đổi `clientWidth` không relayout.
- Bỏ dải năng lực; CTA vừa viewport dưới header, skeleton 38,2%, mobile hoặc
  viewport thấp 28%.
- Logo EN kế thừa metric VI (R5), focused 22/22.
- Gate: `prepare:site` + `qa:static` PASS; Node 58/58 (1.392 authored case);
  P13 transition 10/10; full photo-view 144/146 với hai timeout concurrent-load
  PASS khi chạy riêng; code review PASS.

## P3 — WebGL 12 preset, detail span 3, viewer, history, nav (21/09)

- P3-T01–T07 đạt: `skeleton-flow` 12 preset WebGL có fallback CSS, context
  loss, offscreen, reduced motion; `photo-detail-layout` span 3 (hero 2/info 1);
  `photo-viewer-controls` `+`/`−`/Reset dùng chung zoom state; morph có scroll
  lease cho click/Back/Forward; nav Advertising về canonical, filter Tất cả.
- Gate: Node/static/schema PASS (one-column 13/13); viewer `390×844`,
  `1440×900` PASS; WebGL 9 canvas tại `1569×912` khoảng `84,72fps`, không long
  task; fallback CTA ready khoảng `0,5s`; Impeccable detect không finding.

## P4 — batch Flow, cột 4, morph backdrop (21/09)

- Batch cấp preset không hoàn lại, hoán vị anchor, phase riêng, hướng shuffle
  theo cặp đối nghịch; viewport-entry replay `600ms ease-out`.
- Detail N4/span 3 ghim ảnh related đầu ở cột 4 trước solver; hash geometry
  gồm card ghim.
- Backdrop zoom-blur chỉ chạy trong lifecycle của morph thật.
- Gate: related layout 15/15, sweep R10 trên 429 pool N4 trong budget
  `300.000`; exact URL `kiosk-posm-30 + use-sampling` PASS; Impeccable exit 0.

## P5 — continuous masonry, shared hover, global fade (21–22/09)

- Parent và detail dùng shortest-frontier theo source order; detail N4/span 3
  lấp cột 4 tại `y = 0`; solver fail rõ thay vì bỏ cột 4.
- Media hover chung `1.15`, `600ms ease-out` cho portal, grid/related,
  suggestion. Skeleton entry opacity-only, fade ở ranh global của batch.
- Backdrop xóa về trắng tại 25% foreground, linger `200ms`.
- Gate: layout Node 41/41; photo geometry 3/3 trên 20 nhóm viewport;
  transitions 18/18; virtualization 15/15 (115 ảnh); entrance 10/10.

## P6, P6.1, P6.2 — footer, hover, portal, CTA glass (22/09)

- Footer một structural signature, gap `48px` tại `≤750px`, `64px` trên;
  192/192 route/locale/viewport.
- Portal sáu card một dòng, cùng cỡ theo role, `320–1920px`, text zoom `200%`
  (28/28).
- Suggestion active nền trắng, chữ/viền đen, không media motion.
- Skeleton giữ entry khi tab ẩn/hiện, hoán vị ratio band theo cột, global
  glass dừng trước footer; headline→link `15/25/35px`.
- P6.2 bỏ dedicated photo Back của P6.1; glass chung
  `blur(28px) saturate(1.08) brightness(1.04)`, tint trắng `0.12` cho skeleton
  và photo overflow; expand `156×48px`.
- Gate: photo view 146/146 Chromium/Firefox/WebKit; CTA continuation VI/EN bốn
  viewport PASS. Mobile performance 10 context chỉ `14–15fps`, chuyển sang P7.

## P7 — hero one-shot, mobile tail, Pinterest primary, shared header (23/09)

- Filter chặn ở shell trước khi adapter sẵn sàng, phát lại intent cuối; hero
  không chạy lại.
- Scale khóa `100%`; mobile tối đa hai WebGL canvas; tail chứa skeleton, CTA
  và toàn footer trong một viewport; một surface glass `clear → blur → #fff`.
- Pinterest mode khi `primarySpan === totalColumns`: primary `100dvh`, ảnh
  tối thiểu `72%`, mô tả tối đa `28%` có pager ngang; suggestion là cell đầu
  related grid.
- Năm route dùng shared menu CTA Zalo trước X.
- Gate: layout 16/16; Pinterest P14 33/33; shared header 10/10; continuation
  PASS. Synthetic `360×800` DPR 3 hai canvas median `60,2fps`, không long task;
  desktop SwiftShader bốn canvas `~20fps` chỉ là diagnostic. Re-review
  `0 Critical`, `0 Important`.

## Chú thích thuật ngữ

- **Ledger**: một file tổng hợp nhiều lần kiểm theo thứ tự.
- **Focused technical gate**: kiểm thử kỹ thuật đúng phạm vi, chưa thay owner visual gate.
- **FIELD**: bộ tham số chung điều khiển trường gradient động.
- **Scroll lease**: khóa và phục hồi vị trí cuộn trong lúc morph chạy.
- **Shortest frontier**: vị trí hợp lệ có mép trên nhỏ nhất trong grid.
- **Concurrent-load flake**: timeout chỉ xuất hiện khi nhiều suite chạy đồng thời.
