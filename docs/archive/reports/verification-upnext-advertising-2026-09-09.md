# Kiểm chứng các thẻ Advertising Up next

Ngày: 2026-09-09. Scope: UP1–UP5-R1 theo sáu thẻ Notion được owner yêu cầu
cập nhật và thực hiện. [Spec hiện hành](../specs/advertising-products-turnkey-services.md)
giữ rank-v3, shortest-column, 109 media; không áp lại closed-frontier/rank-v2.
Task logo UP6 có ambiguity riêng về reset menu; không thuộc verdict Advertising.

## Kết quả hiện tại

Implementation và regression matrix đã có trước run này. Không sửa source website;
chỉ bổ sung assertions vào `tests/site/site.e2e.cjs` sau khi review phát hiện gap.
Build bằng `pnpm dev`, static server `http://127.0.0.1:8787`; source ở `src/site/`,
output `.site-output/`. `pnpm qa:static` exit 0. Playwright 1.63.0 dùng fallback
Chrome tại `C:/Program Files/Google/Chrome/Application/chrome.exe` vì bundled
Chromium chưa có. Đây là scoped verification, không phải full website PASS.

| Gate | Kết quả | Artifact local |
| --- | --- | --- |
| Advertising default | 28/28, exit 0 | `.tmp/orchestration/upnext-20260909-r1/default/latest.json` |
| Grid spacing và caption | 44/44, exit 0 | `.tmp/orchestration/upnext-20260909-r1/grid/latest.json` |
| Keyboard qua virtual frontier | 1/1, exit 0 | `.tmp/orchestration/upnext-20260909-r1/keyboard/latest.json` |
| Virtual window 3.000 card | 1/1, exit 0 | `.tmp/orchestration/upnext-20260909-r1/3k/latest.json` |
| Proof no-op/cohort sau review | 5/5, exit 0 | `.tmp/orchestration/upnext-20260909-r1/proof-final/latest.json` |

Mỗi gate chạy `node tests/site/site.e2e.cjs` với `BASE_URL` ở trên,
`TT_E2E_REPORT_DIR` trỏ thư mục riêng và đúng một flag tương ứng:
`TT_E2E_ADVERTISING_DEFAULT_ONLY`, `TT_E2E_ADVERTISING_GRID_ONLY`,
`TT_E2E_ADVERTISING_KEYBOARD_ONLY`, `TT_E2E_ADVERTISING_3K_ONLY`,
`TT_E2E_ADVERTISING_PROOF_ONLY`, giá trị `1`.
Không chạy lại gate đã pass khi source/input không đổi.

Default bao gồm readiness trực tiếp/Barba VI/EN desktop/mobile, vendor failure
và recovery, history remount, filter morph, rapid interrupt, reduced motion,
pending scroll, same-frontier no-op và selection. Selection gồm Home,
Residential, Commercial, Advertising parent/detail ở cả VI và EN: heading,
body, nav, menu, button và caption/filter khi có; `auto`, dragging `none`,
restore `auto`. Không cần thêm blanket CSS.

Proof bổ sung đếm `layout()` và `reloadItems()` trên Masonry instance thật,
restore method trong `finally`, cùng đếm `site:layout`: đều bằng 0 khi desktop
1440px/native 390px nhận repeated same-frontier event. MutationObserver ghi
membership trong filter transition; mọi ID phải thuộc old/new window union.
New window lấy độc lập từ artifact và shared layout core, không suy ra từ DOM
sau settle; DOM sau settle phải bằng chính xác expected window. Reviewer đã
phát hiện oracle cũ dùng actual DOM có thể bỏ lọt card dư; bản final sửa gap đó.
Các case filter hiện hữu tiếp tục kiểm transform 0.4s, no shared-ID reverse,
reduced motion và đúng một pending-scroll catch-up. Test-only patch 75 dòng
thêm, 28 dòng bỏ, gồm chỉnh indentation; không thay runtime để làm test pass.

Grid kiểm responsive từ 320 tới 2560 px cùng các biên cột/gutter, filter
round-trip, scrollbar layout viewport và rejected artifact sai version/rỗng.
Caption weight 700, image gap 10px, line-height/cap-height, Vietnamese ink safety;
không overlap, interior hole hoặc horizontal overflow trong scope assertions.

## DevTools và reference

Đã mở local Advertising và `https://espaciohomedesign.com/en/projects`, đọc
computed style và Canvas glyph H tại viewport 1920 và 390 px, DPR 1.

| Viewport | Trường Thịnh | Espacio live | Chung |
| --- | --- | --- | --- |
| 1920 | Plus Jakarta Sans 700, 12px | Silka semibold 700, 12.8px | cap-height 9px; line-height 17.92px; caption gap 10px |
| 390 | Plus Jakarta Sans 700, 10.5px | Silka semibold 700, 11.2px | cap-height 8px; line-height 15.68px; user-select auto |

Desktop TT outer/gap token 35px; content cap 1500px làm effective outer lớn
hơn token ở viewport rộng. Không đồng nhất outer token với lề thực tế sau cap.
Quan sát trực tiếp qua DevTools tool trong cuộc trao đổi: console local không có
error/warn; 15 document/CSS/script request đã đọc đều
HTTP 200. Accessibility snapshot có main, heading, nav/filter và link detail.
Screenshot mobile đã quan sát; preview local đã mở cho owner.
DevTools không cho ghi artifact trực tiếp vào workspace này; kết quả JSON
được trả inline rồi lưu bằng filesystem tool vào checkpoint.

## Hash source tại run

Hash test bên dưới là snapshot chạy 74 gate đầu. Sau patch assertions,
`tests/site/site.e2e.cjs` có SHA256
`490472457cb619dd98cd693f87d50ca2003631c5dbf12bfd84d51d8255c812ff`;
5/5 proof gate chạy trên hash mới. Các function ngoài proof không đổi, source
website không đổi; không gán lại timestamp/hash mới cho 74 gate ban đầu.
Lượt `proof/latest.json` đầu đạt 5/5 nhưng oracle cohort chưa đủ độc lập;
`proof-final/latest.json` thay claim cohort đó sau review. Không bỏ artifact cũ.

| Path | SHA256 |
| --- | --- |
| `src/site/advertising-products/catalog-runtime.mjs` | `edc425679e246d50d7fa87752eaa8b6c0fe5489243581379a0378b5c8f017f31` |
| `src/site/advertising-products/catalog.mjs` | `ab863bdad6ce389d55cfbbcd8aaaaa6d7e63bfa0e50e14f797757d879b859b61` |
| `src/site/advertising-products/layout-core.mjs` | `2ec3af798bb86c54c45da3f47caafd223f54a5b92a2c47b033bb5b33d93340e0` |
| `src/site/detail.css` | `01a28bd9361f836709db205984e09bd2ba6b7a9dd4834a6b369f85f127286eea` |
| `src/site/style.css` | `41390a72f29621fbd67abcd0919f1d040c174775b6dff315edb68b5d05d75277` |
| `src/site/motion.js` | `27ca368de9425502a92f6b22f2a159d7cd1d05d9c41577847dcc7f05ec9b1560` |
| `tests/site/site.e2e.cjs` | `e72fb9f54e4487b9cae8faa908f68cbf0c8155d264e2e18d0e7c7218974595a4` |

## Acceptance và giới hạn

Main đã nghiệm thu UP1–UP5 theo source, focused runtime và native read-only
review. UP1 có fast path trước allocation/layout, counters desktop/native bằng 0,
pending-scroll catch-up một lần và keyboard frontier pass. UP2 có shared Masonry
pipeline, cohort union và settle bound chính xác, reverse/resize/reduced-motion
và 3.000 card pass. Geometry invalidation hiện hành đi qua ResizeObserver;
không tạo thêm event/API invalidation không có trong accepted implementation.
UP3 selection và UP4 spacing đã có runtime proof; UP5 đồng bộ living docs,
thay Sol Advisor bằng main/native review, giữ historical evidence nguyên trạng.

Reviewer `catalog_audit` requested Luna/max, effective unknown; finding oracle
cohort được trả ADDRESSED sau fix. Main kiểm proof-final 5/5, syntax và diff
whitespace. Worker `catalog_proof` requested Luna/high đã bị dừng trước edit để
giới hạn overhead; main thực hiện patch test nhỏ. Không có dữ liệu credits đủ
để tính phần trăm tiết kiệm quota. SHA256 proof-final JSON:
`47c83e9b3d0fed7af0ac425280c370033b0cf08ac90d0a810bfa712bc03bef3c`.

Docs impact: report này, verification index, live spec evidence link, STATE và
tests/README.md cho focused command. Không đổi token, component hay behavior
production nên DESIGN.md và Impeccable sidecar không cần thay đổi hoặc detector.
Full website/Espacio parity vẫn NOT PASS; không chạy canonical parity,
Graphify semantic extraction, CMS, commit, push hoặc deploy. Graphify báo 180
semantic file pending tại preflight; Serena đúng project/context codex, LSP ready.
Owner spot-check carousel VI/EN vẫn mở, độc lập với các thẻ này.

## Chú thích thuật ngữ

- Scoped verification: kết luận giới hạn trong behavior và inputs đã kiểm.
- Current hash: SHA256 của source/test tương ứng với bằng chứng trong run.
- Virtual frontier: biên tập card đang mount; khác closed-frontier packing đã bỏ.
