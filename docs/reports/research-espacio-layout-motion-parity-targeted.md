# Espacio layout và motion parity: affected subset current worktree

> Cập nhật 2026-08-25 01:01 +07:00: Advertising Products hero đã đổi theo
> annotation và bố cục Projects. Source edit mới tiếp tục làm toàn bộ số parity
> bên dưới chỉ là evidence lịch sử; public Codex Site chưa đổi.
>
> Cập nhật 2026-08-25 00:15 +07:00: commercial hero đã đổi theo annotation và
> bố cục Kitchens. Source edit mới tiếp tục làm toàn bộ số parity bên dưới chỉ là
> evidence lịch sử; public Codex Site chưa đổi.
>
> Cập nhật 2026-08-24 23:51 +07:00: thêm fail-safe cho mọi media surface có chữ
> trắng. Media và shade giữ ẩn trên nền `#2b2c2b` cho tới khi media load và decode
> xong. Đây là source edit mới nên toàn bộ số parity bên dưới vẫn chỉ là evidence
> lịch sử; public Codex Site chưa đổi.
>
> Cập nhật 2026-08-24 23:20 +07:00: source residential hero đã đổi sau lần đo
> bên dưới. Các số `192/192`, pass/fail/blocked và hash trong report là bằng
> chứng lịch sử, không còn đại diện current-hash. Phải chạy lại affected subset
> trước khi dùng report làm release gate.

## Evidence Advertising Products hero sau annotation

- Kicker VI là `Sản phẩm quảng cáo`; title hai dòng là `để thương hiệu / luôn
  trong tầm mắt`; EN là `Keep your brand / always in sight`; media và motto cũ
  không tồn tại trong hero.
- Desktop 1569 x 912: reference và local cùng hero cao `862 px`; wrapper local
  `x=284,5`, `y=274,1875`, `w=1000`, `h=336`, sai khác chiều cao so với reference
  `0,015625 px`; scroll cue cách đáy `45 px`; grid bắt đầu tại `y=862` với gutter
  `35 px`.
- Mobile 390 x 844: wrapper local `x=34,5`, `y=315,7890625`, `w=321`,
  `h=184,796875`; filter local `y=663,703125`, `h=37,5`, sai khác `0,03125 px`
  theo trục y so với reference; scroll cue cách đáy `60 px`; grid bắt đầu tại
  `y=794` với gutter `15 px`.
- Playwright focused đạt `12/12`: VI/EN tại 320, 390, 768, 1024 và 1440 px,
  thêm reduced-motion ở 390 px, keyboard focus, filter scroll, console, network
  và horizontal overflow. `qa:static` và `qa:worker:static` pass.
- DevTools xác nhận đúng một `h1`, AX tree có kicker, title, filter button và
  scroll cue; console không có error/warning/issue; 29 request đã quan sát đều
  trả HTTP 200 hoặc 304; ảnh dự án load đủ.
- Computer Use là `not required` vì Playwright và DevTools tái hiện đủ state.
  Impeccable detector đã chạy một lần và trả `[]`, nhưng ở regex degraded do
  thiếu HTML parser nên không được xem là clean bill of health. Graphify bị
  `Access denied` tại lock/log; fallback Serena và targeted search không sửa
  semantic index.

## Evidence commercial hero sau annotation

- Qualifier VI là `SHOP · F&B · SHOWROOM · VĂN PHÒNG`; title chuyển thành hai
  dòng `Thiết kế để bán tốt. / Thi công để vận hành bền.`; EN là
  `Designed to sell. / Built to perform.`; motto riêng đã bỏ.
- Reference Kitchens tại 1569 x 912 dùng content rộng `1000 px`, kicker lệch trái
  `8 px`, dòng đầu bám trái và dòng sau bám phải. Local áp dụng cùng composition;
  mobile chuyển hai dòng và kicker về giữa.
- Playwright focused đạt `12/12`: VI/EN tại 320, 390, 768, 1024 và 1440 px,
  thêm reduced-motion ở 390 px, keyboard focus, console, network và overflow.
- `qa:static` và `qa:worker:static` pass. DevTools desktop 1440 x 900 và mobile
  390 x 844 xác nhận một `h1`, đúng DOM/computed style, không motto, không
  horizontal overflow, console sạch và toàn bộ request đã quan sát trả HTTP 200.
- Computer Use là `not required` vì Playwright và DevTools tái hiện đủ các state
  cần kiểm tra. Impeccable detector trả `[]` nhưng ở regex degraded do thiếu HTML
  parser, nên không được xem là clean bill of health.

## Evidence media-loading fail-safe

- Phạm vi dùng chung gồm home hero, About hero, service portal, gallery có
  caption, detail CTA và legacy closer. Media chỉ nhận class ready sau `load` và
  `decode`; no-JS và runtime fail-open không bị khóa.
- Playwright chặn từng request media và đạt `7/7`, gồm reduced-motion: trước load
  surface là `rgb(43, 44, 43)`, media opacity `0`, shade ẩn và chữ trắng hiện;
  sau khi giải phóng request, media decode xong, opacity `1` và shade hiện lại.
- Regression liên quan vẫn pass: hero intro `2/2`, hero continuity `4/4`,
  residential hero `12/12`; `qa:static` và `qa:worker:static` pass.
- DevTools mobile 390 x 844 với Slow 3G xác nhận cùng hai trạng thái, không có
  horizontal overflow, console không có error/warning/issue, toàn bộ 36 request
  document/style/script/image/font trả HTTP 200 và runtime healthy.
- Serena không báo diagnostic trong hàm watcher và regression mới. Impeccable
  detector scope `layout` trả `[]`. Computer Use là `not required` vì Playwright
  và DevTools tái hiện đầy đủ mà không cần thao tác người dùng thật.

## Evidence residential hero sau annotation

- Source local dùng qualifier `NHÀ PHỐ · CĂN HỘ · HOMESTAY`, title hai dòng
  `Nơi tái tạo / năng lượng sống`; EN là `A place to / recharge`; motto cũ đã bỏ.
- Playwright focused đạt `12/12`: VI/EN tại 320, 390, 768, 1024 và 1440 px,
  thêm reduced-motion ở 390 px, keyboard focus, console và network diagnostics.
- `qa:static` và `qa:worker:static` pass; local Wrangler trả HTTP 200 tại
  `/vi/residential/`.
- DevTools xác nhận DOM, computed style, AX tree, console, network và screenshot
  desktop/mobile. Computer Use vẫn `not required` vì không còn state nào cần thao
  tác người dùng thật để tái hiện.
- Impeccable detector không báo finding nhưng chạy ở chế độ regex degraded do
  thiếu parser module; kết quả này không được xem là clean bill of health.

## Kết luận

- Parity gate: **NOT PASS**.
- Lệnh affected subset đã đo đủ `192/192` obligation trên `/en/`, cổng local
  `8791`, `workers=1`, không dùng `--resume`.
- Runtime: `28 pass`, `106 fail`, `58 blocked`, `0 excluded-with-reason`.
- Coverage targeted: `160.802` mapping; `56 pass`, `193 fail`, `160.553
  blocked`. Trong số blocked có `160.517` visible layout box chưa có pair
  binding.
- Runtime evidence dùng runner SHA-256
  `b2a7c271ee33363eee6dbaa92f44d8d0373fdd44e57e528f417be449d37596a1`
  và schema SHA-256
  `6290302cc33703e473b7cd0295825a0c5fbddac568a71a911763d743154d12c1`.
- Sau khi đủ 192 row, inline report cũ đọc ledger coverage `481.204.214 byte`
  vào RAM và Node dừng vì heap 4 GB. Runtime CSV và coverage CSV đã ghi xong.
  Regression mới defer inline report khi ledger lớn hơn 32 MiB; runner self-test
  hiện `48/48` pass. Vì thay đổi finalization này làm runner hash đổi, kết quả đo
  trên chưa được gọi là current-hash PASS.
- Không chạy full canonical, release QA hoặc publish vì affected subset chưa đạt
  gate. Public Codex Site không bị thay đổi.

## Lệnh đã chạy

```powershell
node scripts/tooling/run-layout-motion-parity.mjs --route /en/ --scenario "top-header,nav-top,menu-open-brand,menu-open-close,menu-open-shutter-1,menu-open-shutter-2,menu-open-shutter-3,menu-open-shutter-4,responsive-transition,hero-layout,main-sections,full-page-layout" --workers 1 --base-url http://127.0.0.1:8791
```

- Khoảng đo: `2026-08-24T14:35:54.076Z` đến
  `2026-08-24T15:34:45.071Z`.
- Không có integrity error hoặc `ERR_CONNECTION_REFUSED` trong runtime CSV.
- Có hai timeout khi mở live Espacio: một `ERR_TIMED_OUT` và một
  `ERR_CONNECTION_TIMED_OUT`.

## Kết quả theo scenario

| Scenario | Total | Pass | Fail | Blocked | Geometry lớn nhất | Timing lớn nhất |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `full-page-layout` | 16 | 0 | 16 | 0 | 2.338 px | 0 frame |
| `hero-layout` | 16 | 0 | 16 | 0 | 5.728 px | 0 frame |
| `main-sections` | 16 | 0 | 0 | 16 | - | - |
| `menu-open-brand` | 16 | 0 | 16 | 0 | 140 px | 51 frame |
| `menu-open-close` | 16 | 6 | 10 | 0 | 27,16 px | 50,96 frame |
| `menu-open-shutter-1` | 16 | 4 | 12 | 0 | 900 px | 50,96 frame |
| `menu-open-shutter-2` | 16 | 5 | 7 | 4 | 900 px | 50,96 frame |
| `menu-open-shutter-3` | 16 | 3 | 4 | 9 | 1.266 px | 50,95 frame |
| `menu-open-shutter-4` | 16 | 2 | 1 | 13 | 1.899 px | 50,96 frame |
| `nav-top` | 16 | 4 | 12 | 0 | 63,62 px | 0 frame |
| `responsive-transition` | 16 | 0 | 0 | 16 | - | - |
| `top-header` | 16 | 4 | 12 | 0 | 0 px | 0 frame |

## Phân loại gap

1. **Invalid binding:** 16 `hero-layout` đang so local `#top` với toàn bộ live
   `main#main-wrapper`; delta vì vậy lên tới 5.728 px, không phải lỗi CSS hero.
2. **Binding chưa có:** 16 `main-sections` báo
   `runtime-selector-pair-item-binding-required`; 16
   `responsive-transition` báo
   `runtime-template-correspondence-or-safe-action-not-yet-bound`.
3. **Coverage chưa khép kín:** 160.517 visible layout box bị phân loại
   `unmapped-local-visible-layout-box` hoặc `unmapped-live-visible-layout-box`.
   Sửa nhóm này bắt buộc đổi binding hoặc coverage contract, đang bị kế hoạch
   khóa không cho đổi.
4. **Mismatch thuộc vùng đã khóa:** `full-page-layout`, brand, navbar và header
   phản ánh content, logo Trường Thịnh, typography hoặc layout đã duyệt. Motion
   `reduce` của local rút animation gần về 0 trong khi Espacio vẫn chạy khoảng
   51 frame. Không sửa vì kế hoạch khóa content, font, typography và yêu cầu giữ
   reduced-motion.
5. **Live variance và blocker:** 24 shutter row thiếu target pixel clip trong
   viewport; hai row bị timeout từ live Espacio. Đây không phải source mismatch
   local có thể sửa an toàn.

## Hero intro trực tiếp từ Espacio

- DevTools reset 1: Vimeo không gắn `data-ready=true`, nên media giữ opacity
  `0` dù chờ lâu.
- DevTools reset 2: `data-ready=true` tại `724 ms`; fade hoàn tất khoảng
  `1.034 ms`.
- DevTools reset 3: `data-ready=true` tại `919 ms`; fade hoàn tất khoảng
  `1.204 ms`.
- Live CSS chỉ định fade `0,3 s` sau khi Vimeo sẵn sàng; thời gian nền đen phụ
  thuộc network/media readiness. Hai reset hợp lệ lệch `195 ms`, khoảng 12
  frame, nên không có hằng số live ổn định để thay `1,3 s` và đồng thời đạt
  tolerance `<=1 frame`.
- Local vẫn giữ `introOffset = 1.3` theo thay đổi đã duyệt; không có source hero
  edit trong run này.

## Gate và hành động bị dừng

- Subset không ổn định ở trạng thái PASS qua hai clean reset; clean reset thứ hai
  chưa chạy vì reset thứ nhất đã có blocker không thể giải quyết trong scope.
- Full canonical `--full --resume` không chạy vì gate subset đã fail.
- `qa:static` pass. `qa:worker:static` lần đầu nhận 404 vì cổng `8787` đang là
  static preview; rerun với Wrangler đúng runbook đã pass. Release Playwright,
  release DevTools và production smoke chưa chạy vì chưa có release candidate
  đạt parity.
- Computer Use: `not required`; Playwright và DevTools đã tái hiện, đo và kết
  luận các gap mà không cần thao tác phụ thuộc đường đi người dùng thật. Không
  điều khiển máy người dùng.
- Notion card vẫn `In progress`; connector từ chối payload sync evidence vì cần
  owner phê duyệt rõ đích và nội dung ghi ra hệ thống ngoài. Không retry vòng qua
  chặn này.
- Codex Sites: không save version và không deploy. URL public hiện tại giữ nguyên.

## Evidence

- Runtime: `docs/reports/research-espacio-layout-motion-runtime-targeted.csv`.
- Coverage: `docs/reports/research-espacio-layout-motion-coverage-targeted.csv`.
- Pairwise artifacts:
  `research/reference-site/runtime-evidence/layout-motion-parity/`.
- Runner: `scripts/tooling/run-layout-motion-parity.mjs`.

## Quyết định cần owner

- Muốn tiếp tục tới PASS, cần cho phép sửa exact binding và coverage contract cho
  `hero-layout`, `main-sections`, `responsive-transition` và visible layout box.
- Không khuyến nghị chạy full 24-30 giờ hoặc publish trước khi quyền sửa này được
  xác nhận.

## Snapshot report cũ

Phần dưới là report targeted cũ trước run hiện tại; chỉ giữ để truy nguyên và
không được dùng làm kết luận current worktree.

# Pairwise layout và motion parity

## Layout parity

| Local route | Viewport | Preference | State | Status | Geometry delta | Timing delta | Artifacts |
| --- | --- | --- | --- | --- | --- | --- | --- |
| - | - | - | - | blocked | - | - | - |

## Motion parity

| Local route | Viewport | Preference | State | Status | Geometry delta | Timing delta | Artifacts |
| --- | --- | --- | --- | --- | --- | --- | --- |
| http://127.0.0.1:8787/en/ | 1440x900 | no-preference | menu-open-close | pass | 0.3211700582885742 | - | research/reference-site/runtime-evidence/layout-motion-parity/lmp-57f41e66d7b12c5908ffb2f0/run1-local-before.png|research/reference-site/runtime-evidence/layout-motion-parity/lmp-57f41e66d7b12c5908ffb2f0/run1-live-before.png|research/reference-site/runtime-evidence/layout-motion-parity/lmp-57f41e66d7b12c5908ffb2f0/run1-local-start.png|research/reference-site/runtime-evidence/layout-motion-parity/lmp-57f41e66d7b12c5908ffb2f0/run1-live-start.png|research/reference-site/runtime-evidence/layout-motion-parity/lmp-57f41e66d7b12c5908ffb2f0/run1-local-mid.png|research/reference-site/runtime-evidence/layout-motion-parity/lmp-57f41e66d7b12c5908ffb2f0/run1-live-mid.png|research/reference-site/runtime-evidence/layout-motion-parity/lmp-57f41e66d7b12c5908ffb2f0/run1-local-end.png|research/reference-site/runtime-evidence/layout-motion-parity/lmp-57f41e66d7b12c5908ffb2f0/run1-live-end.png|research/reference-site/runtime-evidence/layout-motion-parity/lmp-57f41e66d7b12c5908ffb2f0/run1-local-cleanup.png|research/reference-site/runtime-evidence/layout-motion-parity/lmp-57f41e66d7b12c5908ffb2f0/run1-live-cleanup.png|research/reference-site/runtime-evidence/layout-motion-parity/lmp-57f41e66d7b12c5908ffb2f0/run2-local-before.png|research/reference-site/runtime-evidence/layout-motion-parity/lmp-57f41e66d7b12c5908ffb2f0/run2-live-before.png|research/reference-site/runtime-evidence/layout-motion-parity/lmp-57f41e66d7b12c5908ffb2f0/run2-local-start.png|research/reference-site/runtime-evidence/layout-motion-parity/lmp-57f41e66d7b12c5908ffb2f0/run2-live-start.png|research/reference-site/runtime-evidence/layout-motion-parity/lmp-57f41e66d7b12c5908ffb2f0/run2-local-mid.png|research/reference-site/runtime-evidence/layout-motion-parity/lmp-57f41e66d7b12c5908ffb2f0/run2-live-mid.png|research/reference-site/runtime-evidence/layout-motion-parity/lmp-57f41e66d7b12c5908ffb2f0/run2-local-end.png|research/reference-site/runtime-evidence/layout-motion-parity/lmp-57f41e66d7b12c5908ffb2f0/run2-live-end.png|research/reference-site/runtime-evidence/layout-motion-parity/lmp-57f41e66d7b12c5908ffb2f0/run2-local-cleanup.png|research/reference-site/runtime-evidence/layout-motion-parity/lmp-57f41e66d7b12c5908ffb2f0/run2-live-cleanup.png|research/reference-site/runtime-evidence/layout-motion-parity/lmp-57f41e66d7b12c5908ffb2f0/pixel-diff.json|research/reference-site/runtime-evidence/layout-motion-parity/lmp-57f41e66d7b12c5908ffb2f0/runtime-mapping.json|research/reference-site/runtime-evidence/layout-motion-parity/lmp-57f41e66d7b12c5908ffb2f0/pairwise.json |

## Navbar parity

| Local route | Viewport | Preference | State | Status | Geometry delta | Timing delta | Artifacts |
| --- | --- | --- | --- | --- | --- | --- | --- |
| - | - | - | - | blocked | - | - | - |

## Hover/focus parity

| Local route | Viewport | Preference | State | Status | Geometry delta | Timing delta | Artifacts |
| --- | --- | --- | --- | --- | --- | --- | --- |
| - | - | - | - | blocked | - | - | - |

## Missing coverage

- Coverage rows: 1; coverage gate: blocked.
- 1:1 chưa đạt vì còn fail, blocked hoặc coverage chưa khép kín.

### Fail detail

- Không có fail runtime.

## Chú thích thuật ngữ

- **Pairwise**: so sánh local và live cùng state.
- **Blocked**: thiếu evidence bắt buộc.
