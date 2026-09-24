---
title: Advertising AD-SEPT-2026-P6 — footer, hover, portal và skeleton CTA field
type: verification
status: current
updated: 2026-09-22
scope: P6-T01–P6-T09, P6.1-T01–P6.1-T05 và P6.2-T01–P6.2-T03
related_specs:
  - ../specs/frontend-brand-shell-responsive-runtime.md
  - ../specs/frontend-landing-page-foundation.md
  - ../specs/advertising-photo-browse.md
  - ../specs/advertising-skeleton-flow.md
---

# Advertising AD-SEPT-2026-P6 — footer, hover, portal và skeleton CTA field

## Kết luận

P6-T01–P6-T09, P6.1-T01–P6.1-T05 và P6.2-T01–P6.2-T03 đạt focused technical
gate trên local build. Footer dùng một structural signature và top gap
`48/64px`; sáu
compatibility output được
kiểm trực tiếp là redirect shell không giữ footer fork, còn DOM sau redirect
dùng canonical footer của Advertising parent. Portal, grid/related và
suggestion inactive dùng cùng media hover `1 ↔ 1.15`, `600ms ease-out`;
suggestion active nền trắng, chữ/viền đen và không chạy media motion.

Sáu portal homepage giữ text một dòng, cùng cỡ theo role, không vượt frame ở
VI/EN từ `320–1920px` và text zoom `200%`. Skeleton giữ entry state khi tab
ẩn/hiện, replay khi rời hẳn viewport rồi quay lại, hoán vị ratio band theo cột,
dùng một global fade/blur kéo qua CTA và dừng trước footer. Khoảng bbox
headline→link là `15/25/35px`.

Không commit, push, deploy hoặc ship. P3-T08 vẫn mở: dev Flow UI còn dùng local
qua `?skeleton-dev=1`, chờ owner duyệt JSON rồi mới xóa trước ship. Full
`pnpm qa:site` và canonical Espacio parity vẫn `NOT PASS` ngoài scope P6.

## Delta P6.1

- Primary photo có Back `48px` ở góc trên trái. Grid→photo dùng native
  `history.back()` và phục hồi browse state; direct/deep link fallback về
  locale parent không query. Navbar giữ nguyên behavior hiện hành.
- Shared footer gap là `48px` tại `≤750px`, `64px` trên `750px`; toàn bộ
  `192/192` tổ hợp route/locale/viewport đạt, gồm breakpoint `750/751px`.
- Skeleton dùng một global `backdrop-filter: blur(28px) saturate(0.92)` bắt đầu
  trước alpha fade. Fade đạt transparent tại boundary và white wash kết thúc
  đúng `#fff`; không có blur local trên từng card.
- Formula viewport thấp giữ lead dương giữa blur và fade; resize N4→N3→N4 chờ
  geometry settle rồi giữ nguyên Flow assignment của batch ổn định.

Photo Back trong P6.1 là evidence lịch sử và đã bị correction P6.2 supersede.

## Delta P6.2

- Bỏ dedicated Back khỏi markup, runtime và CSS. Browser Back, Escape, navbar,
  history pointer và photo morph giữ contract hiện hành.
- Skeleton boundary và primary photo overflow dùng chung glass token:
  `blur(28px) saturate(1.08) brightness(1.04)` với tint trắng alpha `0.12`.
  Skeleton giữ global mask và glass lan đúng `0 → innerWidth`; grid vẫn giữ
  outer gap và không tạo horizontal overflow. Photo glass phủ đều vùng dư và
  source image có `filter: none`.
- Expand control mở ở `156×48px`. Đo theo nét thật cho thấy text inset trái
  `18px`, path inset phải `17,5px`, chênh `0,5px`, và nhãn không wrap.
  Expand/reset dùng cùng icon hai mũi tên chéo ít nét; cụm reset, `+`, `−` vẫn
  đồng bộ zoom state.

## Sửa sau independent review

Review đầu phát hiện bốn finding Important; cả bốn đã được xử lý trước khi ghi
technical gate:

1. Chuyển assertion portal khỏi P13 navbar về đúng portal gate; bổ sung bbox
   inset `8px`, no-wrap và peer size ở text zoom `200%`.
2. Tính fade cap từ vùng thật giữa frontier cuối và CTA boundary. Tại
   `1440×700`, fade `158.125px`, bằng minimum `0.5 × cardWidth` và dưới
   cap `294.75px`.
3. Xoay deterministic thứ tự landscape/square/portrait theo cột; các frame kề
   cùng depth không còn xuất phát bằng cùng band.
4. Đọc trực tiếp sáu generated compatibility output. Shell chỉ redirect về
   canonical parent, không nhúng một footer thứ hai; browser gate tiếp tục đo
   footer sau redirect.

Follow-up review P6.2 yêu cầu đo cân biên theo nét chữ/path thật và khóa đủ
`blur/saturation/brightness/tint` cho cả skeleton lẫn photo overflow. Hai
finding đã được sửa; focused browser gate so sánh trực tiếp hai consumer.

## Evidence

| Gate | Kết quả |
| --- | --- |
| `pnpm prepare:site` | PASS; copy source, sinh 6 compatibility output và embed copy VI/EN |
| `pnpm qa:static` | PASS |
| Photo Back removal | PASS; không còn markup, runtime handler hoặc CSS selector dedicated Back |
| Photo view cross-browser | PASS `146/146` trên Chromium, Firefox và WebKit |
| Photo transitions | PASS ba case P6.2: morph backdrop, square controls và skeleton global boundary |
| Footer consistency | 192/192 route/locale/viewport checks; breakpoint `750/751px` được khóa |
| Portal typography | 28/28 VI/EN; `320–1920px`, no-wrap, inset `8px`, peer size và text zoom `200%` |
| Shared hover | 2/2 VI/EN; portal provider chung; suggestion motion E2E PASS |
| Skeleton unit/browser | PASS; ratio permutation, sliver guard, focus hai chu kỳ, viewport replay, resize/remount, WebGL cleanup |
| CTA continuation | PASS VI/EN `1440×900`, `1440×400`, `390×844`, `390×568`; gap bbox và global field đúng |
| Manual Chrome DevTools P6.2 | PASS tại `1246×912`: skeleton glass `left=0`, `right=1246`, `scrollWidth=1246`, grid outer `35px`; expand `156×48px`, text/path inset `18/17,5px`, source filter `none`, shared glass `28px/1.08/1.04/0.12`; không console warn/error |
| P6.1 skeleton pixel proof | PASS tại `1440×900`; 28 mẫu RGB trong dải `y=600–669` trước footer đều `255,255,255` |
| Impeccable detector | CLI không khả dụng trong PATH; browser matrix, computed style và screenshot inspection là fallback |
| P13 navbar diagnostic | Biến ngoài scope đã sửa; focused run đạt 14/15, còn timeout `Advertising parent preserves filters...` ngoài delta P6 và không được dùng làm PASS |
| Continuation performance | OPEN theo yêu cầu mobile mới: review độc lập tái lập `14,28–15,29fps` với 10 WebGL context đồng thời; probe sau đó xác định số context/compositing là chi phí chính. Không hạ ngưỡng và không giữ thử nghiệm giảm độ phân giải canvas; chờ spec giảm card/tái phân bổ chiều cao được owner duyệt |
| Source/output SHA-256 | Bốn source P6/P6.2 khớp byte với static output sau `prepare:site` |
| Independent review | P6.2 visual/functional PASS; performance mobile còn OPEN và đã chuyển vào correction kế tiếp |
| P6.2 main scoped review | PASS static, exact shared glass, full-bleed, control geometry, viewer cross-browser và photo transition; không tuyên bố performance PASS |

Ma trận legacy `advertising-primary-p14.e2e.mjs` không là gate P6/P6.2 và còn
`14/29` fixture drift đã biết ở ratio làm tròn, gutter/header, sparse-tag và
text-zoom oracle. Delta này không sửa các contract P1.4 đó; hai entrypoint
focused desktop/mobile cho control và glass đều PASS `1/1`.

Source và `.site-output` khớp SHA-256:

| Path | SHA-256 |
| --- | --- |
| `src/site/style.css` | `068DA3FCC316564DD6F07D9BBF38565490AB3DCC3E84C56DDE285FCD7FB72611` |
| `src/site/detail.css` | `3327D255AF7CCF7ED5F7B5B62C34A1FC729EE793C88D3FD5DD3DB180EE6A4A94` |
| `src/site/advertising-products/catalog-runtime.mjs` | `03141260AE97AF6AB524CD7699D75DDC80C9CD96F2A3304F8A378DF49366904E` |
| `src/site/advertising-products/skeleton-flow.mjs` | `5E43DFAE696D835CC9F68A17747CA6ED0FCDD4DB821BA3BB15E5A27BFADD3FCC` |

`src/site/advertising-products/index.html` khác generated output có chủ đích vì
`prepare:site` embed copy VI/EN; runtime, CSS và Flow source/output khớp byte.

## Human gate còn mở

Owner reload local preview và kiểm năm điểm: portal VI/EN, suggestion
inactive/active, CTA skeleton glass/fade tới nền trắng, photo overflow glass và
expand/reset control, footer gap. Ba card Notion giữ trạng thái
`In progress — chờ owner visual gate`. Technical gate P6 không tự cấp quyền
ship hoặc xóa dev Flow UI.

## Chú thích thuật ngữ

- **Redirect shell**: HTML tương thích chỉ chuyển route cũ về parent canonical.
- **Ratio band**: nhóm tỷ lệ ngang, vuông hoặc đứng của skeleton card.
- **Global field**: mask và blur dùng một hệ tọa độ chung cho toàn batch.
- **Technical gate**: kiểm thử kỹ thuật trong phạm vi, chưa thay owner visual gate.
