---
title: Chẩn đoán preview random grid và browser mobile
type: verification
status: observed-regression
updated: 2026-09-27
related_specs:
  - ../specs/mobile-browser-parity-capability-map.md
  - ../specs/advertising-skeleton-flow.md
  - ../specs/frontend-brand-shell-responsive-runtime.md
---

# Chẩn đoán preview — 27/09/2026

Owner nghiệm thu visual scrollbar bằng “scrollbar ổn”, nhưng báo preview8792
mất hành vi random, skeleton còn chạy lại khi cuộn footer↔grid, và yêu cầu
kiểm landscape/WebKit trong annotation. Interview đã xác nhận intent mới;
runtime chưa sửa trong đợt chẩn đoán này. iPhone thật chưa kiểm.

## Random: preview dùng sai baseline

Checkout scrollbar lấy HEAD `e6cf065161cb19a8b59dd9efa8cda5d4af27fba1`,
không mang implementation random trong candidate recovery66 staged paths.
Contract không bị xóa khỏi primary/recovery. Đây là lỗi chọn baseline preview;
không có evidence scrollbar sửa hoặc hủy thuật toán random.

| Nguồn | Contract/runtime | Kết quả quan sát |
| --- | --- | --- |
| Primary `E:/TruongThinh-Website` | `docs/specs/advertising-organic-random.md` accepted; runtime primary chưa có candidate | Contract vẫn tồn tại; không thay source primary |
| Recovery `.tmp/advertising-random-media`, port8790 | Contract cùng implementation `random-order.mjs`, seed và organic solver | Ba lần tải trực tiếp tạo ba chuỗi9 ID đầu khác nhau |
| Managed `codex/mobile-ui-contract`, port8792 | Chỉ thêm scrollbar trên HEAD; không có random spec/helper/organic solver | Ba lần tải trực tiếp giữ cùng chuỗi9 ID đầu |

Chromium pinned `153.0.8010.12`, route VI Advertising All, viewport1440×900.
Đây là sáu quan sát đọc runtime, không chạy lại recovery QA/P11 hoặc build.
Không dùng ba sample để suy mọi lần F5 bắt buộc khác nhau; contract cho phép
hai seed tình cờ cùng hoán vị.

Raw [baselines.json](../../.tmp/mobile-correction-diagnostic/baselines.json),
SHA-256 `bea2774da194cfff91b91dbd58cecebae1b6427134efd77b8e9e81988b7144ec`.
Catalog8792/source/HEAD normalized cùng SHA
`f464b6e8424f8436f0dc705fda8e95509aa6b805cf0848e777320b55d62784e1`;
catalog8790/source recovery cùng SHA
`df529c73c3d6764a3627d7207dff09cab88388d61a06f0642323b7a19640fd3a`.
Raw còn giữ solver/helper/motion/CSS hash và ID/tọa độ từng lần tải.
Khác line ending giữa checkout được ghi riêng, không gọi khác hash raw là
khác behavior nếu normalized source bằng nhau.

## Skeleton footer↔grid: tái hiện trên Android thật

[Report skeleton](android-skeleton-observation-2026-09-27.md#bổ-sung-preview8792--footergrid)
giữ capture mới: Galaxy A05s Android15/Chrome153, portrait411px, native touch,
131 samples và9 ảnh. Cùng batch đi qua14 thế hệ frame, có6 cặp sample thấy
slot vẫn giao viewport nhưng opacity1→0 và identity bị thay. Card thường
trong vùng quan sát giữ outer node; không suy đây là full media lifecycle PASS.

Source đưa visual viewport height vào tail/signature rồi hủy renderer và
`replaceChildren` cả batch khi signature đổi. ResizeObserver của CTA/footer
còn invalidation hash, giải thích hợp lý remount sau khi height đã settle;
chưa có callstack để quy mọi lần dựng lại cho một caller cụ thể.
Capture có10 Image requests/10 HTTP200, không console/HTTP error. Canvas
skeleton không có request ảnh riêng; lỗi nhìn như “load lại” là remount/reveal,
không kết luận HTTP reload skeleton. Behavior hiện vẫn lỗi.

## Landscape: lỗi layout sau khi animation đã settle

Fresh Chromium `153.0.8010.12` với Android UA/mobile/touch/DPR2.625 emulation,
VI/EN ×838×331/387 ×scrollY0/69:8 samples. Fonts loaded, motion-ready,
wrapper scale1/animation rỗng và bbox ổn định qua250ms. Không override DOM/CSS.
Tại scrollY0, title/filter giao nhau99,61–129,77px, title/header51,31–79,31px.
Ảnh [EN331](../../.tmp/mobile-correction-diagnostic/landscape/en-331-top.png)
và [EN387](../../.tmp/mobile-correction-diagnostic/landscape/en-387-top.png)
xác nhận chữ/filter/brand header đè nhau; không chỉ là header che nội dung
khi người dùng đã cuộn.

`src/site/detail.css:601/613/630/675` đặt hero `100svh - 50px`, wrapper
min-height21rem, title theo width và filter absolute/wrap/bottom15vh.
Width838 bỏ qua mobile breakpoint680: hero281/337px nhưng wrapper336px
và filter nhiều dòng157px. Đây là cơ chế CSS phù hợp evidence viewport thấp.
Chưa có paired landscape baseline để quy lỗi cho thay đổi scrollbar.

Raw [observations.json](../../.tmp/mobile-correction-diagnostic/landscape/observations.json),
SHA-256 `63ef36bafcb8d59dab3a32e49ca6936440ae3879a5679cc8356f7579624f4179`.
Main đã kiểm raw, source và screenshot của một agent QA/audit/code review
duy nhất, requested `gpt-6-sol`/`ultra`, effective unknown.
Emulation củng cố capture landscape Android thật trước đó trong
[report scrollbar](scrollbar-parity-2026-09-27.md); không thay physical recheck
sau fix hoặc nghiệm thu iPhone.

## WebKit: context pressure và cleanup là hai lỗi riêng

[Comparison đã lưu](../../.tmp/scrollbar-parity/review/final-boundary-comparison.json)
trên WebKit26.6:3 baseline +3 current, mỗi run6 lỗi “too many active WebGL
contexts” và6 lỗi loseContext khi context đã mất. Baseline chỉ thay HTTP body
motion/CSS bằng HEAD; catalog/renderer hiện hành giữ nguyên. Đây là lỗi
skeleton có trước scrollbar trong phép so này; smoke20/21 vẫn FAIL.
SHA comparison `255f4e317014a4bd549448574f8ae48a8895ae67fa2cec82c6a638c5fb37cb80`.

Catalog1538 cấp renderer cho mọi frame khi width>750; budget renderer tại1333
chỉ áp dụng width≤750. `stop()` chỉ dừng RAF, không nhả context. Rebuild cả
batch có thể tạo pressure khi teardown/context loss chưa hoàn tất; chưa có
ledger để xác định generation hoặc số context sống gây vượt giới hạn.
`skeleton-flow.mjs:574` gọi loseContext không kiểm `isContextLost()`.
Guard cleanup riêng không giải quyết allocation pressure. Không đề xuất
giảm preset/DOM coverage, đổi effect hoặc miễn console error để đạt gate.

## Handoff và giới hạn

Source, generated output, dependencies và device settings không đổi. Recorder
đã exit; không commit/push/deploy. Primary HEAD/status và recovery66 staged,
0 unstaged/untracked giữ nguyên; pause patch SHA
`f4f78b5997d1a7045553a032fa6a27a6da4930fe0a8b3d3aadc6b808796169c5`.
Raw nằm trong ignored `.tmp`, không tự có trên clone/Git/Sites. Đây là
chẩn đoán, chưa sửa bốn behavior và không là performance/full-site PASS.

Docs-only handoff gồm delta draft: `git diff --check` đạt; checker kiểm16 Markdown files,
284 local links/anchors,0 lỗi mới và8 target generated thiếu từ baseline.
Main recompute source/hash/raw; một agent gộp QA/audit/code review đã đối
chiếu packet, không có Required finding. Không build hoặc chạy full QA vì
production source không đổi; các quan sát browser phía trên là diagnostic.

Owner đã duyệt [map bổ sung](../specs/mobile-browser-parity-capability-map.md#feedback-preview--intent-và-map-bổ-sung-đã-duyệt)
bằng “Duyệt map bổ sung”, sau đó duyệt
[delta skeleton lifecycle](../specs/advertising-skeleton-flow.md#correction-mobile-lifecycle--accepted-2026-09-27)
bằng “Duyệt delta skeleton”. Next gate là [plan correction](../../tasks/plan.md#correction-baseline-và-skeleton--plan-chờ-duyệt)
và tracking card trước code; landscape có module riêng. Intent giữ random+scrollbar, correction
skeleton và landscape đã xác nhận; recovery release/P11 tiếp tục paused.
Button-content parity vẫn thuộc map cũ, chưa sửa trong đợt này.

Bổ sung spec/plan gate cùng ngày: skeleton delta ghi accepted, alias anchor draft
được giữ cho link cũ. Plan C00–C07 và checklist mở rộng cùng initiative scrollbar,
không thay T01–T04 hoặc plan recovery. Frozen random spec recovery có6 dòng native
Back fallback clarification mà primary còn thiếu; carry source/provenance được
giới hạn trong plan, chưa thực hiện. Diff-check đạt,16 Markdown/298 local links
không lỗi mới;8 generated target thiếu từ baseline vẫn giữ. Sáu runtime/CSS hash,
primary HEAD/status và recovery66/0/0 cùng patch/manifest hash không đổi.
Chưa build hoặc chạy runtime QA như evidence fix từ approval spec này.

## Chú thích thuật ngữ

- **Baseline**: snapshot nguồn dùng để tạo và so preview.
- **Generation**: tập identity frame quan sát tại một mẫu; không là số call chính xác.
- **Pressure**: số tài nguyên sống gây browser phải thu hồi context.
- **Emulation**: mô phỏng viewport/input/UA; không thay thiết bị thật.
