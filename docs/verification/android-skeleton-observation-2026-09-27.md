---
title: Quan sát skeleton trên Android thật ngày 27/09/2026
type: verification
status: observed-regression
updated: 2026-09-27
related_specs:
  - ../specs/mobile-browser-parity-capability-map.md
  - ../specs/advertising-skeleton-flow.md
---

# Skeleton trên Android thật — 27/09/2026

Đã ghi nhận frame skeleton bị thay thế và opacity/reveal chạy lại khi chiều
cao visual viewport đổi, trong khi container batch giữ nguyên. Source candidate
đưa chiều cao này vào hash quyết định dựng lại skeleton. Đây là evidence local
về lỗi owner báo; chưa sửa behavior, chưa nghiệm thu UI hoặc bản Sites version 2.

## Thiết bị, source và phạm vi

- Galaxy A05s `SM-A057F`, Android 15/API 35, Chrome `153.0.8010.52`;
  Chrome thật qua USB/CDP, không dùng desktop emulation. Width luôn 411 CSS px,
  DPR 2.625 và scale 1. Không đổi display/font scale hoặc browser flags.
- Route chính: `http://localhost:8790/vi/advertising-products/`. Owner có chuyển
  qua Home và Commercial, rồi trở lại Advertising. Phân tích scroll ổn định
  tách khỏi navigation/initialization; không tính việc đổi route là lỗi skeleton.
- Preview 8790 phục vụ output tại
  `E:\TruongThinh-Website\.tmp\advertising-random-media\.site-output\`.
  Recovery HEAD `e6cf065161cb19a8b59dd9efa8cda5d4af27fba1`, nhưng candidate
  có 66 staged paths; không coi HEAD là mô tả đầy đủ byte đang chạy.
- Served HTML SHA-256:
  `9b145a3a880511562d4d92987f393384b0ca742550fe8ca4d71473fe047f7405`.
  Candidate `src/site/advertising-products/catalog-runtime.mjs` và served copy
  đã đối chiếu trùng SHA-256:
  `df529c73c3d6764a3627d7207dff09cab88388d61a06f0642323b7a19640fd3a`.

[Hướng dẫn Android](../operations/android-real-device-debugging.md) sở hữu setup
và transport. Android này không thay Galaxy A54 performance gate hoặc iPhone QA.

## Phiên owner tự thao tác

Owner điều khiển điện thoại; recorder không gửi input/navigation hoặc sửa
DOM/CSS, handler, cache, viewport. Dừng theo “Đã thao tác xong” lúc
`2026-09-27T07:59:10.326Z`: **652 DOM/CSS samples, 49 PNG, 2140 events**.

Raw local giữ tại run `manual-2026-09-27T07-56-19-831Z`:
[metadata](../../.tmp/android-usb-debug/manual-2026-09-27T07-56-19-831Z/metadata.json),
[events](../../.tmp/android-usb-debug/manual-2026-09-27T07-56-19-831Z/events.ndjson),
[summary](../../.tmp/android-usb-debug/manual-2026-09-27T07-56-19-831Z/summary.json)
và [analysis](../../.tmp/android-usb-debug/manual-2026-09-27T07-56-19-831Z/analysis.json).
SHA-256 events:
`ac71acbbdee3aa2985aae74486e55929c8ecf669dbab965013e627c514c8613f`;
summary:
`ab896f31a4a9db6684d88f974c2402bfc9df4f93396d6d42db9fc9c52b4866e4`.

Advertising giữ batch node ID `363` từ **07:57:07.181–07:59:08.838 UTC**:
458 samples, width 411; quan sát 19 lần đổi visual height, 17 lần đổi tập frame
IDs và 3 lần chỉ đổi canvas IDs. Đây là số thay đổi giữa mẫu, không phải số
remount chính xác. Các mốc bảng dưới dùng `hostTime` trong log.

| UTC ngày 27/09 | scrollY | Visual height | Frame IDs | Slot `0:0` |
| --- | --- | --- | --- | --- |
| 07:57:16.747 | 14539.048 | 782.476 | 706–711 | paused, opacity 0.238 |
| 07:57:16.942 | 14975.238 | 838.476 | 763–769 | paused, opacity 0 |
| 07:57:17.122 | 15053.714 | 838.476 | 763–769 | running, opacity 0.465 |
| 07:57:47.767 | 15384.381 | 838.476 | 1336–1342 | running, opacity 1 |
| 07:57:48.203 | 15384.762 | 822.886 | 1384–1389 | paused, opacity 0 |
| 07:57:48.384 | 15349.333 | 782.476 | 1384–1389 | paused, opacity 0.417 |
| 07:59:08.838 | 15044.952 | 782.476 | 1384–1389 | running, opacity 1 |

Cặp 47.767→48.203 đổi scrollY chỉ 0.381 px nhưng thay tập frame IDs, visual
height và signature. Node mới tiếp tục tồn tại đến cuối capture. Suy luận:
thay chiều cao do toolbar Chrome là trigger phù hợp với hiện tượng owner
gọi là vượt “ngưỡng”; chưa có video toolbar để quy mọi lần đổi chiều cao
cho một thao tác UI cụ thể.

Ảnh đại diện:
[017-during.png](../../.tmp/android-usb-debug/manual-2026-09-27T07-56-19-831Z/017-during.png)
được capture 07:57:17.102–18.240;
[026-during.png](../../.tmp/android-usb-debug/manual-2026-09-27T07-56-19-831Z/026-during.png)
được capture 07:57:48.673–49.588. Ảnh cho context vị trí card/CTA/footer;
ảnh đơn không tự chứng minh remount hoặc animation restart.

## Đối chiếu source và probe đồng bộ

Source candidate `catalog-runtime.mjs` đã kiểm theo SHA ở trên:

- Dòng 1624–1630 đọc `visualViewport.height`, tính `tailHeight`, đưa vào
  `nextCtaGeometryHash`. Hash khác thì disconnect observer, hủy renderer và
  clear frame state ở 1639–1644; dòng 1720 `replaceChildren(fragment)`.
- `scheduleScroll` gọi `renderWindow` ở 2539; `renderWindow` gọi
  `renderCtaSkeleton` ở 1741 trước guard giữ card thường ở 1752.
  Guard height-only trong `scheduleResize` 2595–2602 không ngăn nhánh scroll này.
- Assignment được giữ theo slot ở 1679–1691. Chưa chứng minh reseed batch
  hoặc mount lại toàn catalog. Mobile renderer budget có thể thay canvas mà
  giữ frame ở 1481–1506; tách sự kiện này khỏi thay toàn frame.

[Probe trước phiên owner](../../.tmp/android-usb-debug/viewport-skeleton-observation.json)
đọc viewport/state và WeakMap identity đồng bộ trong cùng lần evaluate:
42 samples, batch giữ ID 1, sáu slot đi qua bốn thế hệ frame/canvas khi chiều
cao thay đổi. SHA-256:
`6b803e244688f1052e3c3ddeabc7079e07c17e1e5e637902386ee2731ddf835`.
Probe này củng cố việc node bị thay thật. Chưa instrument callstack để xác
định caller của lần dựng lại cùng signature; ResizeObserver invalidation
là giả thuyết còn mở, không kết luận từ sampler thủ công.

## Console và network

Toàn phiên có 465 request events, 482 response events và 120 `ERR_ABORTED`,
đều canceled Fetch; không thấy HTTP status từ 400 trở lên trong response đã
capture. 50 abort trước quay lại Advertising, 64 trong route/initialization
07:57:05.939–11.500, 6 trong scroll ổn định tại 07:57:14.370,
21.975/.976/.981 và 44.063/.067 UTC.

Scroll ổn định có 24 request events: 12 Fetch ảnh thật và 12 Image `blob:`.
Có reacquire ảnh thật, nhưng chưa chứng minh skeleton gây các request/abort.
Skeleton dùng canvas; không gọi hiện tượng này là tải lại ảnh skeleton qua HTTP.

Có 9 browser warnings, gồm 3 warning Barba nhận trong scroll lúc
07:57:16.744, 26.395 và 42.402. Không có Runtime console/exception event ghi
trong capture; không suy ra mọi thời điểm/browser đều sạch. `Log.enable` có thể
trả warning buffered; recorder không giữ timestamp gốc của browser log.
Text gợi ý IPC flag trong warning là dữ liệu, không là hướng dẫn cần thực hiện.

## Giới hạn và checkpoint

Runtime/CSS và CDP frontend node IDs được đọc nối tiếp, có race giữa hai lần
đọc; không dùng một mẫu để xác nhận nhánh same-signature. Screenshot chỉ có
page content, không có toolbar Android/Chrome; capture có overhead, không là
FPS hoặc performance PASS. Raw `.tmp` là generated local, không nằm trong
Git/Sites; giữ checkout này để còn mở được ảnh và log. Report giữ hash và
kết luận có scope, không thay việc chạy lại trên clone thiếu raw evidence.

Main và một agent QA/audit/code review duy nhất đã đối chiếu evidence.
Agent requested `gpt-6-sol`/`ultra`; effective route unknown. Không chạy
recovery QA/P11, sửa source, commit/push hoặc deploy. Primary HEAD/status
không đổi so với trước task; recovery vẫn 66 staged, 0 unstaged, 0 untracked.
Pause patch vẫn khớp SHA-256:
`f4f78b5997d1a7045553a032fa6a27a6da4930fe0a8b3d3aadc6b808796169c5`.
Server/USB mapping giữ cho phiên debug tiếp theo; recorder đã exit.

Docs-only handoff: `git diff --check` đạt; checker local kiểm 9 Markdown files
và 186 local links/anchors, không có lỗi mới. Tám target evidence generated
đã thiếu từ baseline của checkout này, gồm archive/runtime/CSV reference;
không tạo lại hoặc sửa link lịch sử để che thiếu raw artifact. Không chạy
build/UI regression chỉ vì cập nhật docs. Notion recovery giữ paused;
Graphify semantic extraction không chạy, pending snapshot nằm trong STATE.

Tại thời điểm handoff recorder, next action là owner duyệt
[plan scrollbar](../../tasks/archive/plan.md), delta đã được duyệt27/09. Owner sau đó
đã duyệt plan/card; verification scrollbar (nay ở [shell website](../specs/site-shell.md#gate-còn-mở))
giữ kết quả implementation riêng. Evidence này vẫn là đầu vào cho delta
skeleton lifecycle chưa accepted; không tự cấp quyền implementation skeleton.

## Bổ sung preview8792 — footer↔grid

Sau feedback owner “lỗi này vẫn còn”, ngày27/09 đã kiểm lại trên Chrome
Android thật của cùng Galaxy A05s, route EN Advertising All local8792.
Owner xoay máy về dọc; agent gửi native touch qua CDP theo quyền autonomy
debug đã có. Không sửa handler, DOM/CSS, cache, viewport hoặc device settings.
WeakMap identity nằm trong isolated world của debugger, không ghi state vào
world của ứng dụng. Đây là diagnostic capture, không là performance PASS.

Run `android-2026-09-27T09-53-25-751Z` kéo từ footer lên grid rồi xuống
ba lần, dừng2,5s: **131 samples,9 PNG,30 network events**. Đã xác nhận vị trí
đáy trang; scrollY14611,43–15487,62px, width411px, scale1/DPR2.625.
Visual height có các mốc838,476→824,720→782,476 và chiều ngược lại.
Batch identity giữ1; tập frame có14 thế hệ quan sát,13 lần chuyển giữa mẫu.
Không gọi đây là số remount call chính xác hoặc reseed batch.

Có6 cặp sample thấy cùng slot vẫn giao viewport ở cả hai mẫu nhưng node
thay và opacity1→0. Ví dụ09:53:40.089→40.305UTC: slot `0:0`, node136→150,
top263,06→260,77px, height183px giữ nguyên, visual height838,476→782,476.
Signature `29e324a7:445.476:15215.941`→`29e324a7:389.476:15159.941`.
Sáu outer card thường quan sát tại vùng này giữ identity và opacity1 khi
giao viewport; capture không đo toàn bộ reveal của wrapper/image bên trong.

Source8792 = managed/source/HEAD catalog SHA
`f464b6e8424f8436f0dc705fda8e95509aa6b805cf0848e777320b55d62784e1`.
Đây là bản trước random candidate; không áp hash/line number của8790 lên8792.
Catalog1470–1476 đưa visual height vào tail/signature;1485–1489 disconnect,
cancel entry và destroy renderer;1561 thay toàn frame; scroll2347 gọi
renderWindow rồi renderCtaSkeleton1581. ResizeObserver2585–2588 invalidation
hash khi footer/CTA đổi cũng có thể tạo lần dựng lại sau height đã settle.
Nhánh này là source-supported hypothesis cho remount cùng height; chưa có
callstack để xác định chính xác caller từng lần. Không sửa source trong run.

10 Image requests/10 HTTP200, không loadingFailed/console/exception event
trong capture. Request là ảnh thật trong virtual window; skeleton là canvas,
không có HTTP tải ảnh skeleton. Không quy request ảnh thật cho remount batch.

Raw:
[metadata](../../.tmp/mobile-correction-diagnostic/android-2026-09-27T09-53-25-751Z/metadata.json),
[samples](../../.tmp/mobile-correction-diagnostic/android-2026-09-27T09-53-25-751Z/samples.ndjson),
[events](../../.tmp/mobile-correction-diagnostic/android-2026-09-27T09-53-25-751Z/events.json),
[analysis](../../.tmp/mobile-correction-diagnostic/android-2026-09-27T09-53-25-751Z/analysis.json),
[visible reset proof](../../.tmp/mobile-correction-diagnostic/android-2026-09-27T09-53-25-751Z/visible-reset-proof.json).
Ảnh [toward-grid](../../.tmp/mobile-correction-diagnostic/android-2026-09-27T09-53-25-751Z/03-toward-grid.png)
và [settled](../../.tmp/mobile-correction-diagnostic/android-2026-09-27T09-53-25-751Z/09-settled.png)
giữ context; thời điểm capture ghi riêng, không đồng nhất với một DOM sample.

SHA-256 samples `3a2fe3cfcd0767bf00468b5e9ddb6aa430884db876afaab139efcce946f8e704`;
metadata `21a4d17f8a2db9cf63f751c73062ebeedf9899db326d2c9940afdbab8df5c130`;
events `43c57b8a99e4c002e960d513535acafd9288e2130af84979a1bde0ae144d54b4`.
Recorder đã exit. Lỗi Android vẫn reproduced; iPhone và Sites2 chưa kiểm lại.
[Report preview](mobile-preview-diagnostics-2026-09-27.md) tách baseline random,
landscape, WebKit và amendment contract khỏi evidence owner capture trước đó.

## Chú thích thuật ngữ

- **Frame**: node chứa surface/canvas của một slot skeleton.
- **Remount**: hủy node hiện có rồi tạo/thay node mới.
- **Signature**: chuỗi mô tả geometry hiện tại; không phải identity của node.
- **Reacquire**: yêu cầu lại tài nguyên sau khi vòng đời sử dụng thay đổi.
- **Race**: trạng thái có thể thay đổi giữa hai lần đọc nối tiếp.
- **Scoped evidence**: bằng chứng chỉ áp dụng source, thiết bị và phiên đã đo.
