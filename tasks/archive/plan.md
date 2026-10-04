# Lưu trữ plan

Phần plan đã xong hoặc thuộc giai đoạn cũ (Codex, ChatGPT Sites), tách từ [plan đang mở](../plan.md). Chuyển nguyên văn ngày 2026-10-04 để file đang mở ngắn lại; chỉ đổi cấp heading và đường dẫn tương đối cho đúng vị trí mới. Đây là lịch sử, không phải nguồn cho việc mới.

## Kế hoạch browser parity — scrollbar và correction skeleton

T01–T04 bên dưới giữ nguyên phase scrollbar đã duyệt và evidence kỹ thuật.
Owner nghiệm thu visual scrollbar27/09 bằng “scrollbar ổn”. Bổ sung cùng
initiative/map đã duyệt tại [correction baseline và skeleton](../plan.md#correction-baseline-và-skeleton--plan-chờ-duyệt);
chỉ phần bổ sung đang chờ duyệt. Không xóa checklist hoặc đóng gate còn mở.

Owner đã duyệt [delta scrollbar](../../docs/specs/frontend-brand-shell-responsive-runtime.md#scrollbar-parity--2026-09-27)
ngày 27/09/2026: “Duyệt delta scrollbar”. Plan này chỉ triển khai module
`scrollbar-parity` của [map đã duyệt](../../docs/specs/mobile-browser-parity-capability-map.md).
[Checklist thực thi](todo.md) dùng convention `tasks/` trong README; không thay
Notion status. Owner duyệt plan và card ngày27/09: “Duyệt plan và card Notion”.
Phase scrollbar: implementation và focused QA đã đạt; [verification](../../docs/verification/scrollbar-parity-2026-09-27.md)
giữ405 case, Android thật và limitations. T04 đã approve scoped implementation;
execution T01–T04 hoàn tất, owner visual đã đạt; device/reference gate riêng còn mở;
[work item riêng](https://app.notion.com/p/3e8332849a0e812c9695d39f0861010e)
đã tạo và fetch kiểm chứng parent Tasks, Project và status In progress.

### Kết quả và boundary

Desktop dùng scrollbar overlay hiện hữu: hiện khi scroll/hover/drag, ẩn khi
controller settle; shell không đổi width khi bar hiện/ẩn. Mobile, reduced
motion và fail-open giữ native scroll. Không tạo controller, library hoặc
timer auto-hide mới. Geometry/state lấy từ spec accepted, không định nghĩa
lại token trong plan.

T01–T04 không bao gồm skeleton lifecycle và button-content parity.
[Delta skeleton](../../docs/specs/advertising-skeleton-flow.md#correction-mobile-lifecycle--accepted-2026-09-27)
được owner duyệt sau phase này; plan bổ sung phía dưới chưa được duyệt.
[Android recording](../../docs/verification/android-skeleton-observation-2026-09-27.md)
là evidence riêng, không là kết quả QA của implementation scrollbar.
Recovery, QA/release cũ và P11 vẫn paused; không commit/push/deploy từ approval
plan này. Source, ảnh, archive và unrelated changes được giữ nguyên.

### Checkout và source đã đọc

T01–T04 đã thực thi tại managed checkout `codex/mobile-ui-contract`, HEAD
`e6cf065161cb19a8b59dd9efa8cda5d4af27fba1`; không dùng 66 staged paths của
`E:\TruongThinh-Website\.tmp\advertising-random-media` làm base.
Root checkout hiện có unrelated work; không checkout/reset/stage tại đó.

Graphify root đã query trước: AST fresh, 264 semantic files pending; graph chỉ
định hướng relationships. Serena đã activate đúng managed checkout,
context `codex`, LSP ready; source trong checkout này là cơ sở của plan.

| Source/pattern | Phần cần giữ hoặc sửa |
| --- | --- |
| `src/site/style.css:100–125` | Wildcard đang áp native track trắng và width12px; thu hẹp ảnh hưởng ở document, giữ menu/rail contract |
| `src/site/style.css:749–812` | `.menu-nav` có scrollbar/overflow riêng; không dùng document reset để tắt menu scrolling |
| `src/site/motion.js:599–670` | `initSmoothScroll`, destroy/cleanup và native handoff hiện hữu; giữ breakpoint981 và reduced-motion guard |
| `src/site/motion.js:570–596` | Shared logical-scroll lock/unlock; không tạo lock theo route |
| `tests/site/menu-reference-parity.e2e.mjs` | Pattern Playwright standalone, BASE_URL, browser cleanup và capture; reuse cách chạy, không copy test text-zoom vào acceptance scrollbar |

SHA-256 lúc lập plan: `motion.js`
`64fd5ce91ab2c4ba79eef916d315441e03a9736bb8020efca1d0bb31d0c82ff2`,
`style.css`
`3c89cdcd6b5d5f35252340a42d45eeef4d5ea6825c4ef360719d32847082f113`.
HTML đã pin Locomotive 4.1.4; giữ version/vendor. Nếu controller hiện hữu đáp
ứng acceptance, chỉ sửa CSS; sửa runtime ở ownership trên khi failure cho
thấy cần thiết, không refactor controller theo suy đoán.

### Dependency và thứ tự

Thực thi tuần tự: T01 desktop overlay, T02 native/lock/lifecycle, checkpoint A,
T03 browser/Android evidence, T04 review/handoff. Một source owner là main;
một agent Sol/ultra gộp QA/audit/code review, read-only. Không spawn agent
review khác; main kiểm chứng findings và giữ final acceptance.

| Task | Outcome có thể kiểm | Dependency | Scope dự kiến |
| --- | --- | --- | --- |
| T01 | Desktop scrollbar đúng state/geometry, shell giữ bbox | Plan được duyệt; tracking gate phía dưới | CSS/runtime nếu cần, focused test;3 files tối đa |
| T02 | Native/fallback và menu/viewer không bị regression khi resize/return | T01 | Cùng source/test và tests README;4 files tối đa |
| T03 | Browser matrix và Android thật kiểm đúng build/hash | T02 + checkpoint A | Focused test, scoped verification và Android guide;3 files tối đa |
| T04 | Một review hợp nhất; contract và STATE trỏ evidence đúng scope | T03 | Spec, STATE, verification index, DESIGN nếu visual ownership cần cập nhật;4 files tối đa |

[todo.md](todo.md) giữ acceptance/verification chi tiết. Tổng dự kiến
**200–320 LOC source/test viết tay**, không tính Markdown/generated. Đây là
estimate, không hạn mức để bỏ case. Theo [Notion rule](../../docs/operations/notion.md#rule),
cần owner cho phép tạo hoặc link **một work item correction riêng** trước
implementation. Gate đã đạt; search không thấy card trùng, schema Tasks đã
fetch trước write. Không update card recovery paused.

Work item: **“Scrollbar theo Espacio — browser parity”**, status In progress.
Nội dung chỉ giữ module id, link spec accepted/plan/checklist,
estimate, gate owner và next action T01; không copy contract/evidence vào
Notion. Nếu có item correction đúng scope thì link/reuse, không tạo trùng.

### Preview và commands

Preview8790 hiện phục vụ recovery candidate; giữ nguyên process và USB mapping.
Plan đề xuất cổng8792 cho correction. T01 kiểm port còn trống trước khi mở;
nếu bận chọn một port trống và ghi vào evidence, không kill process khác.
Tất cả lệnh dưới chỉ chạy sau gate plan/tracking, trong managed checkout.

```powershell
pnpm prepare:site
node scripts/tooling/serve-static-parity.mjs --port 8792
```

Server là process riêng. Trong test session cùng checkout:

```powershell
$env:BASE_URL = 'http://127.0.0.1:8792'
pnpm qa:static
node tests/site/scrollbar-parity.e2e.mjs
node tests/site/menu-reference-parity.e2e.mjs
pnpm qa:cross-browser
```

Focused test đã tồn tại; actual source/test318 LOC nằm trong estimate. Không chạy
full canonical/recovery QA hoặc Worker gate cho thay đổi shared static shell.
Giữ runner/engine hiện hành; browser thiếu hoặc fail thì ghi exact error,
không bỏ project hoặc đổi assertion để xanh.

Android tiếp tục [Chrome/USB thật](../../docs/operations/android-real-device-debugging.md).
Chỉ thêm `reverse --no-rebind tcp:8792 tcp:8792` sau khi preview/hash đã kiểm,
không remove-all hoặc thay mapping8790. Mở đúng tab
`http://localhost:8792/vi/advertising-products/`; attach đúng target. Ghi served
HTML/CSS/runtime hash, source diff, browser/device version trước capture.

### Matrix và evidence

| Nhóm | Route/state/viewport | Kiểm chứng |
| --- | --- | --- |
| Shell rộng/hẹp | Năm route cấp cao VI/EN;320/390/768/959/980/981/1024/1199/1440/1569px; Advertising category/photo | Bbox/header/main, no overflow, một controller/bar, không reserve custom gutter |
| Desktop tương tác | 1440px; wheel, PageDown/Home/End, hover/leave, drag/release, đầu/cuối trang | Logical scroll, limit/thumb, track state settle; input thật, không inject CSS/class để tạo PASS |
| Lifecycle/lock | 980↔981, route return/locale, menu và Advertising viewer open/close, reduced motion, dependency fail-open | Native handoff, vị trí được giữ, background lock, menu overflow/focus và cleanup |
| Browser | Chromium/Firefox/WebKit theo preset hiện hữu; Chrome/Edge thực khi có installed browser | Báo rõ engine/channel; Chromium không tự là Edge PASS, WebKit không là iPhone thật |
| Android thật | Galaxy A05s Chrome/USB local; cuộn hai chiều, toolbar height change, menu, VI/EN, xoay máy | DOM/CSS, console/network và ảnh; scope scrollbar, không sửa hoặc nghiệm thu skeleton |

Case mỗi state chạy sau font ready; chờ transition/controller bằng predicate,
không chọn timeout reference chưa được đo. So sánh live/crawled reference và
implementation theo [addendum](../../docs/reference/espacio/components.md#bổ-sung-scrollbar--2026-09-27).
Reference drag/release và reduced-motion live còn open: source-derived target
và TT accepted lock/reduced-motion vẫn phải kiểm, không đổi thành reference PASS.

Ảnh Android và timing probe tách riêng do screenshot overhead. Autonomy debug
được owner cho phép; khi owner muốn tự thao tác, recorder chỉ đọc và không
gửi input. iPhone thật chưa có evidence: giữ open, không dùng WebKit/emulation
để đóng gate. Owner visual acceptance và full-site parity là gate riêng.

### Checkpoint và rollback

Checkpoint A sau T01–T02: focused test + static + menu đạt trên đúng build;
diff chỉ thuộc scrollbar, không đổi breakpoint/controller dependency,
skeleton/nút/content. Failure được sửa ở ownership hẹp trước T03.

T04 chỉ đóng scoped technical work khi evidence đủ; missing browser/device
được ghi open, không claim browser parity hoàn chỉnh. Nếu actual LOC/scope
vượt estimate, cập nhật plan/card và ownership trước mở rộng.

Trước visible UI edits, load frontend-ui-engineering và impeccable theo rule;
sau edits chạy impeccable detect cho shared shell. Ghi finding/DEGRADED đúng
scope, không bulk overwrite design artifact hoặc tạo lifecycle hook. Detector
không thay DOM/runtime, browser hoặc owner acceptance.

Rollback đúng hunk source/test của module và khôi phục contract status theo
evidence; không reset checkout có docs/raw capture, không sửa generated build
hoặc checkpoint recovery. Dừng đúng preview/mapping8792 của task khi không
còn cần, giữ8790 và9223 nếu phiên debug khác còn dùng.

## Tinh gọn docs — thực hiện 2026-10-03

Nhập từ `tasks/docs-slim/plan.md` của Codex; đã commit ngày 2026-10-03.

- Ngày: 2026-10-03
- Trạng thái: owner duyệt và đã thực hiện 2026-10-03; chưa commit
- Phạm vi: `docs/`, file Markdown gốc repo, `tests/README.md`, `tasks/`.
  Không đụng `src/`, script, test code.

Nguyên tắc: file tracked xóa vẫn còn trong Git history. File untracked xóa là
mất hẳn, nên tách riêng ở mục 5 và cần owner duyệt từng dòng.

### 1. Sửa sự thật sai (làm trước, không xóa gì)

- `docs/verification/index.md`, `verification/release-cleanup-2026-09-24.md`:
  còn ghi Sites bị chặn, chưa deploy; thực tế v2 đã deploy public.
- `CHANGELOG.md`: mục "Chưa phát hành" chứa thay đổi đã ship trong Sites v2.
- `docs/STATE.md`: `Updated`, HEAD `e6cf065`, quyền GitHub/Sites chỉ cho
  snapshot 24/09, bỏ trạng thái session (Serena active), chuyển evidence
  hero regression sang verification.
- `docs/decisions/index.md`: 5 ADR đã bị supersede nhưng vẫn ghi accepted.
- `interactive-browser-qa` ADR và `tests/README.md`: bắt Computer Use mọi UI
  change, trái AGENTS.md rule 5. Sửa theo AGENTS.md.
- Số catalog cũ 109/127 trong `design/content.md`, `frontend/index.md`,
  `tests/README.md`, ADR masonry: đổi sang 154 hoặc link spec.
- Version cũ: `graphify.md` (0.9.53), `agent-rule-scripts.md` (Impeccable 4.2.2),
  `TOOLING.md` (agent-skills commit, 54 skill).
- `DESIGN.md` brand lockup EN transform không còn trong `src/site`.
- `reports/index.md` ghi file `.bak` có consumer; thực tế không có.

### 2. Gộp và xóa file tracked

| Nhóm | Trước | Sau | Cách làm |
| --- | --- | --- | --- |
| Decisions Graphify/Serena | 10 | 1 | Gộp vào `native-graphify-hooks-and-watcher.md`; xóa ast-default, dirty-fingerprint, single-hook-dispatcher |
| Decisions grid Advertising | 5 | 1 | Giữ `advertising-organic-masonry-...`; xóa 3 deterministic-* và pinterest-organic |
| Decisions agent stack cũ | 4 | 1 | Xóa global-agent-stack, project-scoped-tooling, fallback-before-removing-skills; viết lại `codex-native-agent-skills-workflow` thành ADR trung lập host |
| Decisions static/CMS gate | 3 | 2 | `wrangler-deferred-until-cms` nhận static-before-cms; xóa static-first-release |
| Decisions UI trùng | 7 | 3 | Gộp fragment-free, full-menu-children, render-aware-text-masks vào ADR chủ; xóa root-canonical, stable-shell, portal-typography, layered-browser-qa |
| Specs retired | 2 | 0 | Xóa skeleton-flow-devtools, superpowers-chatgpt-codex-orchestration |
| Specs correction P7.1, P7.2 | 2 | 0 | Đưa chi tiết acceptance vào spec chủ, rồi xóa |
| Specs nhỏ | 5 | 1 | kiosk-fair-publish, media-review-report thành 1 dòng ở capability map; frontend-template, cms-template vào `_template.md`; brand-lockup-typeset-r4 vào DESIGN.md |
| Verification P2 đến P7 | 6 | 1 | Gộp thành 1 ledger theo phase |
| Verification superseded | 3 | 0 | Xóa P7.4, LOGO-R2; upnext chuyển archive |
| Archive mồ côi | 10 | 0 | Xóa 9 file không còn link sống và snapshot STATE cũ; index archive rút còn 1 dòng trỏ `mapping.json` |
| Reports | 2 | 0 | Xóa stub navbar (trỏ link về archive), `_template.md` |
| Operations | 4 | 2 | `agent-rule-core` gộp vào AGENTS.md; `agent-rule-knowledge-notion` gộp vào `notion.md` |
| Design/backend | 3 | 0 | `governance` và `impeccable/index` gộp vào `design/index.md`; `backend/roadmap` vào `backend/index.md` |

Tổng: khoảng 66 file thành 13, tức bớt khoảng 53 file. Mọi link đến file bị
xóa được trỏ lại trong cùng task.

### 3. Rút gọn nội dung (trim, không đổi contract)

- Rule trùng chỉ giữ 1 chủ: ADHD/caveman/ponytail, STATE rule, response style,
  living-docs gate ở AGENTS.md; Graphify ở `graphify.md`; Git/Notion ở
  `notion.md`; route table ở `architecture/index.md`; owner facts ở PRODUCT.md.
- `README.md` 196 xuống khoảng 120 dòng; `TOOLING.md` 186 xuống khoảng 90;
  `tests/README.md` 229 xuống khoảng 100; `notion.md` 165 xuống khoảng 70;
  `agent-rule-workflow-tools.md` 53 xuống khoảng 25.
- `advertising-products-turnkey-services.md`: chuyển 185 dòng work log sang
  verification.
- `design/patterns.md`, `design/motion.md`, `design/advertising-image-quality.md`:
  bỏ narration theo revision, giữ rule hiện hành.

Để sau (đợt riêng, lớn): viết lại `advertising-photo-browse.md` (727 dòng,
chồng R1 đến R15, P6 đến P7.5) thành contract trạng thái hiện tại, sau khi
random grid ship.

### 4. Trung lập host (Codex sang Claude) và rule Notion

- AGENTS.md, rule module, TOOLING, scripts map, graphify.md: bỏ "Codex native",
  `apply_patch`, `$impeccable`, pin `gpt-5.6-luna`, Codex lifecycle hook,
  inventory MCP chỉ của Codex. Ghi chung "host agent" (Claude Code hoặc Codex).
- `notion.md`: dùng Notion connector của host, bỏ `notion-spec-to-implementation`
  và `plugin://notion@openai-curated-remote`.
- `CLAUDE.md`: pinned dependency nằm ở `tooling-versions.json`, không phải README.

### 5. Cần owner duyệt từng dòng (untracked, xóa là mất)

| File | Dung lượng | Đề xuất |
| --- | --- | --- |
| `docs/reports/research-espacio-layout-motion-runtime.csv.pre-static-retry-20260820T212036.bak` | 17.6 MB | Xóa; không script nào đọc, đã có CSV mới hơn |
| 4 CSV pilot/targeted trong `docs/reports/` | 37.5 MB | Xóa; không script nào đọc, chạy lại cần runtime evidence |
| `tasks/superpowers/plan.md`, `todo.md` | nhỏ | Xóa; package đã retired, kết quả ở archive |
| `tasks/docs-living/plan.md` | nhỏ | Xóa; kết quả ở verification living-docs |

### 6. Cần owner quyết

- `tasks/` đang untracked nhưng 7 docs tracked link vào (`tasks/plan.md`,
  `tasks/docs-living/inventory.md`). Đề xuất: commit `tasks/plan.md`,
  `tasks/todo.md`, `tasks/docs-living/inventory.md`, `tasks/advertising-random-media/`
  để link không gãy trên GitHub.

### Kiểm chứng

- Không còn link Markdown nội bộ gãy (script check link trên `docs/`, root `.md`).
- `pnpm qa:static` vẫn pass (docs không ảnh hưởng runtime, chạy để chắc).
- Không commit, không push cho đến khi owner duyệt diff.

## Inventory living docs R1 — 2026-09-09

Nhập từ `tasks/docs-living/inventory.md` của Codex; mapping đã thực hiện.

Trạng thái: mapping đã được owner duyệt và thực hiện ngày 2026-09-09. Snapshot ban đầu gồm 132 file,
120 Markdown và 12 raw/backup. SHA256 đo trước thay đổi; không suy ra accepted
từ tên file hoặc Git tracked. Review nội dung sâu tập trung Espacio/design;
ADR còn lại giữ nguyên, chỉ sửa index khi status đã xác minh.

### Quy tắc bảo toàn

Giữ path các report do generator sở hữu và toàn bộ CSV/backup. Report khác
được archive nguyên byte sau khi synthesis có nguồn và active links đã chuyển.
Accepted ADR/spec giữ path; không tạo bản contract thứ hai trong guide.

### Mapping từng file

| Source ban đầu | Destination sau migration | Action | Status khai báo | SHA256 trước |
| --- | --- | --- | --- | --- |
| `docs/index.md` | `docs/index.md` | Rút gọn/update canonical routing | Không khai báo | `7F26DFC123D6F5E00E32777A41962D09EF601334285E0461D0FFC059343BB63F` |
| `docs/STATE.md` | `docs/STATE.md` | Rút gọn/update canonical routing | Không khai báo | `C5C92149376035BD23D472DBF19282C4B9D13F65B6F824A5E370A9290AA5FC9E` |
| `docs/third-party-notices.md` | `docs/third-party-notices.md` | Giữ; index theo domain | Không khai báo | `A6762E1498FF598DD37D330F327A15CD9A1904798653B1D5BD3888737D204EFC` |
| `docs/decisions/_template.md` | `docs/decisions/_template.md` | Giữ; index theo domain | proposed | `836F424F20BC4301B31FFBFB3560E07C5A39AEEB13CDE108628AAC9421D3E213` |
| `docs/decisions/accent-color-roles.md` | `docs/decisions/accent-color-roles.md` | Giữ; index theo domain | accepted | `4DA5D7DCC79E40FB7062D44BF20012D9DB546AE8A71A127A3955A05EB0E8317A` |
| `docs/decisions/admin-defense-in-depth.md` | `docs/decisions/admin-defense-in-depth.md` | Giữ; index theo domain | accepted | `3A14A106D1EDBD98253CE07E0136737AA7AFD53A7B1A4AB86AD6457CAC3CAED4` |
| `docs/decisions/advertising-organic-masonry-espacio-spacing-media-distribution.md` | `docs/decisions/advertising-organic-masonry-espacio-spacing-media-distribution.md` | Giữ; index theo domain | accepted | `0232617A1E8A44A6BCD2B114224D0E983F718439904352FD02C019354FBAC5AB` |
| `docs/decisions/caveman-ultra-agent-rules.md` | `docs/decisions/caveman-ultra-agent-rules.md` | Giữ; index theo domain | accepted | `1CFF1011FC9F0AF67DA2AE60609D10592F2A0B36E6024F9549BD5000F8A79A9A` |
| `docs/decisions/codex-native-agent-skills-workflow.md` | `docs/decisions/codex-native-agent-skills-workflow.md` | Giữ; index theo domain | accepted | `054C025529DF46D22EADE1C4EF8248D4665E3384518D8207997651DB2F226796` |
| `docs/decisions/content-media-maintenance.md` | `docs/decisions/content-media-maintenance.md` | Giữ; index theo domain | accepted | `CA53D11DA046DD40ABD5024D928A7688FDD69A0F58EB5950C295B096264B9E51` |
| `docs/decisions/d1-ssr-static-fallback.md` | `docs/decisions/d1-ssr-static-fallback.md` | Giữ; index theo domain | accepted | `B28BDC9B0085CD33CEE116FF2F790E7F9974CD41C4CEFAF00CB6E515A78755E0` |
| `docs/decisions/deterministic-advertising-product-masonry-outlayer.md` | `docs/decisions/deterministic-advertising-product-masonry-outlayer.md` | Giữ nguyên ADR; đưa index lịch sử | superseded | `FD148E6C7FB3A3C9C256C8AF684F224C8B29E387FB6BD9376972B823425F6EFE` |
| `docs/decisions/deterministic-advertising-product-masonry.md` | `docs/decisions/deterministic-advertising-product-masonry.md` | Giữ nguyên ADR; đưa index lịch sử | superseded | `AF276DEF8B4A0A8E7C65B35EFB2F421E63BEB34DBB190443A5E973ABD06B43AE` |
| `docs/decisions/deterministic-advertising-product-single-column-media-fit.md` | `docs/decisions/deterministic-advertising-product-single-column-media-fit.md` | Giữ nguyên ADR; đưa index lịch sử | superseded | `C463B826526ABEE0D627C661801B9E043D10BCDA4A1908DDA623CF10EEBB4383` |
| `docs/decisions/dirty-fingerprint-graphify.md` | `docs/decisions/dirty-fingerprint-graphify.md` | Giữ nguyên ADR; đưa index lịch sử | superseded | `C3C62F6667CC847E40656438626DB763DCC661426E78595FAF8FFDC03B634DC0` |
| `docs/decisions/editorial-image-policy.md` | `docs/decisions/editorial-image-policy.md` | Giữ; index theo domain | accepted | `E0D27E10D0C49A78F986FBF4FE8CFCB6AA1FF5637091C65CC4438B79F9D8D05E` |
| `docs/decisions/fallback-before-removing-skills.md` | `docs/decisions/fallback-before-removing-skills.md` | Giữ nguyên ADR; đưa index lịch sử | superseded | `64098D10B904650AC6AC904385161E8F0696A63320ED4F235DA3B00CCD7357E9` |
| `docs/decisions/fragment-free-navigation.md` | `docs/decisions/fragment-free-navigation.md` | Giữ; index theo domain | accepted | `015B05C51AD06AC0DCA9CFECBC8DB0B0064E2F308054C5934C9B4D8FFB4A362F` |
| `docs/decisions/full-menu-children-and-cta.md` | `docs/decisions/full-menu-children-and-cta.md` | Giữ; index theo domain | accepted | `3FBDD9402FD9C7495E90A3BE9BC9E824501EE30ED8815DC5E8FC758EF2EBD44F` |
| `docs/decisions/git-notion-governance.md` | `docs/decisions/git-notion-governance.md` | Giữ; index theo domain | accepted | `2A82E3D0174AE4A4A3E1D133397069061C59FB3064AE2013EBAE8606760467F6` |
| `docs/decisions/global-agent-stack-project-portability.md` | `docs/decisions/global-agent-stack-project-portability.md` | Giữ nguyên ADR; đưa index lịch sử | superseded | `923A797ADAB74508BD1AC8819CBADA1DC8F35438FC82442A74BFBDDBAB101720` |
| `docs/decisions/graphify-ast-default.md` | `docs/decisions/graphify-ast-default.md` | Giữ nguyên ADR; đưa index lịch sử | superseded | `121B2F6F0E623B15134FBA329BF3F0C3F378DBF2896C4C76B57C7846A4BCB851` |
| `docs/decisions/graphify-first-architecture.md` | `docs/decisions/graphify-first-architecture.md` | Giữ; index theo domain | accepted | `70D49D87FAECF3BD17B141A7E233C5753D5118A7201C3F16129D1FA683674918` |
| `docs/decisions/graphify-serena-boundary.md` | `docs/decisions/graphify-serena-boundary.md` | Giữ; index theo domain | accepted | `D24C071D22E010BA86F7D4D7FECE316B81352E6B77805DE0C4FD76217906FE57` |
| `docs/decisions/graphify-watcher-query-existing-graph.md` | `docs/decisions/graphify-watcher-query-existing-graph.md` | Giữ; index theo domain | accepted | `EF7DAD4F15BE597E3F26CA789B28B7526ECB37DA4CB6F75D3BB722D416A49675` |
| `docs/decisions/graphify-wrapper-freshness.md` | `docs/decisions/graphify-wrapper-freshness.md` | Giữ; index theo domain | accepted | `EC82118C61300EDA5ED3E5317FAFDBAEE0A723FE21456B94CD042936FEC2CFCF` |
| `docs/decisions/head-office-address-confirmed.md` | `docs/decisions/head-office-address-confirmed.md` | Giữ; index theo domain | accepted | `02290E6556C6894FA094C89F3C422BB5A6AE6DAB2DD3D555DEA4178184CFF89C` |
| `docs/decisions/heritage-montage-density.md` | `docs/decisions/heritage-montage-density.md` | Giữ; index theo domain | accepted | `9E820F2D73FC0EE1F7BF0623D857379C317508C36FDF0952B5D4626F4656F20C` |
| `docs/decisions/home-hero-crossfade-drift.md` | `docs/decisions/home-hero-crossfade-drift.md` | Giữ; index theo domain | accepted | `E07427FD25EE6BAA6718FC23AE4256DF61D8CDE3AB1C7EB9C4C444B7AD3F7745` |
| `docs/decisions/in-place-locale-switch.md` | `docs/decisions/in-place-locale-switch.md` | Giữ; index theo domain | accepted | `01A0A4D300AC38145AC978A0D059EE56D9454933B8676E8CD632347A0DBED056` |
| `docs/decisions/index.md` | `docs/decisions/index.md` | Giữ; index theo domain | Không khai báo | `68944C4BCEF3C22CB4CFA366EFD356B7A279F0970407F59FC0B874AE651E8BA6` |
| `docs/decisions/inferred-serena-language-set.md` | `docs/decisions/inferred-serena-language-set.md` | Giữ; index theo domain | accepted | `B7089487028A589E45D3DDEAD115A2D3C283DD777B73CC4CAD06ABC5041A0A27` |
| `docs/decisions/interactive-browser-qa.md` | `docs/decisions/interactive-browser-qa.md` | Giữ; index theo domain | accepted | `AFAD1FEA734BCFB3528852D2DB7B5142575A978E81D4E48C1A4C3803148259DF` |
| `docs/decisions/layered-browser-qa.md` | `docs/decisions/layered-browser-qa.md` | Giữ nguyên ADR; đưa index lịch sử | superseded | `BB9DB2DDC230D9078F669C645F3F673A6C66A1CF3D5DF1D963EB19C88D827814` |
| `docs/decisions/locale-prefixed-worker-routes.md` | `docs/decisions/locale-prefixed-worker-routes.md` | Giữ; index theo domain | accepted | `C30A9B2D7AFE9F8C957DF2FED59B425E4F7A878D283B4F573E7633C40B312E28` |
| `docs/decisions/menu-owns-locale-appointment.md` | `docs/decisions/menu-owns-locale-appointment.md` | Giữ; index theo domain | accepted | `9F4E69DE5A4B795D3E20F0A0A6F5624C5D88BBF84DF7A1C2FC8D4CBF9E516C6E` |
| `docs/decisions/motion-keeps-content-visible.md` | `docs/decisions/motion-keeps-content-visible.md` | Giữ; index theo domain | accepted | `A6397C9C807AD464760C7774EB72F109FA9F0593AB608A549746814DE1DDDB03` |
| `docs/decisions/native-graphify-hooks-and-watcher.md` | `docs/decisions/native-graphify-hooks-and-watcher.md` | Giữ; index theo domain | accepted | `B39106E83DBE8FBCE2AB2030A6D61416A8044224FCCB1B851F34C1520E668AA6` |
| `docs/decisions/optional-cms-project-slots.md` | `docs/decisions/optional-cms-project-slots.md` | Giữ; index theo domain | accepted | `1EAA52D1BBF6AFF03F99DC134D5D16571058EE2F2F9B9803B116C7BDBAAB20C7` |
| `docs/decisions/owner-facts-require-confirmation.md` | `docs/decisions/owner-facts-require-confirmation.md` | Giữ; index theo domain | accepted | `36E22E7C8F179684A0FFE01D974D29C0F9E88A0737915EE25ABE2D4F9797B876` |
| `docs/decisions/pinterest-organic-advertising-product-masonry.md` | `docs/decisions/pinterest-organic-advertising-product-masonry.md` | Giữ nguyên ADR; đưa index lịch sử | superseded | `5B162B9EE144650E119180AA03B236466DE0B487CBF9B3A479E7FFB591042149` |
| `docs/decisions/portal-typography-weight-parity.md` | `docs/decisions/portal-typography-weight-parity.md` | Giữ nguyên ADR; đưa index lịch sử | superseded | `F6710C16B6528ED2168B35089732CA635C974808878BC19FAC137060D8331336` |
| `docs/decisions/process-order-invariant.md` | `docs/decisions/process-order-invariant.md` | Giữ; index theo domain | accepted | `DBFF82950CE8C421E34C27497F2E9EC0CD3CB608EE4C4C58A355D9AC794A2AC8` |
| `docs/decisions/project-scoped-tooling.md` | `docs/decisions/project-scoped-tooling.md` | Giữ nguyên ADR; đưa index lịch sử | superseded | `469FAD55629435FBECA7B82875E09764144EC5C172E04D26369F6541AA412B36` |
| `docs/decisions/reference-archive-isolated.md` | `docs/decisions/reference-archive-isolated.md` | Giữ; index theo domain | accepted | `949E3DF70E7D31708EB6DD4A591CED1C238D3569F6D17B3A1C6554968F080D77` |
| `docs/decisions/reference-motion-map.md` | `docs/decisions/reference-motion-map.md` | Giữ; index theo domain | accepted | `70A0E285857F380B9FD15B69088E5D2A2D3CE35739DE50163DD4D7DA1F3D8797` |
| `docs/decisions/render-aware-text-masks.md` | `docs/decisions/render-aware-text-masks.md` | Giữ; index theo domain | accepted | `1D422B3C49F69220C8943D8B2B9F4CD441277BC604B717EA84E836B8820DF286` |
| `docs/decisions/root-canonical.md` | `docs/decisions/root-canonical.md` | Giữ; index theo domain | accepted | `311719E8080B0A936D9015B26B84BEFF23224692496B4EC9114523FE49D7E1E1` |
| `docs/decisions/route-first-navigation.md` | `docs/decisions/route-first-navigation.md` | Giữ; index theo domain | accepted | `7F1D270372E41CF67C8FCB4841D87B5CFA4D1D7E133B2BE4451B5A02DD4799E6` |
| `docs/decisions/runtime-responsibility-boundaries.md` | `docs/decisions/runtime-responsibility-boundaries.md` | Giữ; index theo domain | accepted | `2958328F4975FE8B23C50B28D02DD46E1E89FCB28B8F8A1277D0155C3EDF8E25` |
| `docs/decisions/selective-splittext-editorial-reveals.md` | `docs/decisions/selective-splittext-editorial-reveals.md` | Giữ; index theo domain | accepted | `5FC56CE81DCCFEED6BEBA952172FDA71D9A1A019E48B40017AD74D325F9D933F` |
| `docs/decisions/shared-advertising-product-detail-template.md` | `docs/decisions/shared-advertising-product-detail-template.md` | Giữ; index theo domain | accepted | `670265A114D03D48E2CD31F857619805A0DBDE167612554439477DF0C8AD1D46` |
| `docs/decisions/single-hook-dispatcher.md` | `docs/decisions/single-hook-dispatcher.md` | Giữ nguyên ADR; đưa index lịch sử | superseded | `144BD0FB458FFB69AA8635D6E0064D98B14A79D449493899357C9720CA481CB7` |
| `docs/decisions/stable-shell-locale-transition.md` | `docs/decisions/stable-shell-locale-transition.md` | Giữ; index theo domain | accepted | `809EB68FAB7B3BF6793070B9E97D273F8B308BEDC819B4A4B0F7D7F9F0620F3C` |
| `docs/decisions/static-before-cms.md` | `docs/decisions/static-before-cms.md` | Giữ; index theo domain | accepted | `AD8942B2891A6EF4237C343E807E04819F6725F9052E078AA8602013E590C8A6` |
| `docs/decisions/static-first-release.md` | `docs/decisions/static-first-release.md` | Giữ nguyên ADR; đưa index lịch sử | superseded | `6A744379809C0BFC8B9CE585F1EA22E571BEE41C312F7FD7F02858782D6102FA` |
| `docs/decisions/static-shared-architecture.md` | `docs/decisions/static-shared-architecture.md` | Giữ; index theo domain | accepted | `6B58125FADF9F92015EE3C08B3663260B9A00FBFB3B7176280AE71803DE97174` |
| `docs/decisions/structural-document-extraction.md` | `docs/decisions/structural-document-extraction.md` | Giữ; index theo domain | accepted | `C11C0CFE89BC27D7EC0973D090C368E0F09CE61EDD764BCA7AAE12A32077B697` |
| `docs/decisions/vietnamese-readability.md` | `docs/decisions/vietnamese-readability.md` | Giữ; index theo domain | accepted | `F74D7DE26C7360CD5FC811457F4553DBC1FAEAD3473EAA1E507E33C0FB0F661B` |
| `docs/decisions/vietnamese-source-english-leaf-attributes.md` | `docs/decisions/vietnamese-source-english-leaf-attributes.md` | Giữ; index theo domain | accepted | `A22A0C2E9601851DCF4013AA7DC5D72209FE1FD3CCA249B9D53FAF67C6CBE64E` |
| `docs/decisions/visible-typography-espacio-parity.md` | `docs/decisions/visible-typography-espacio-parity.md` | Giữ; index theo domain | accepted | `E246B01D967D3670549A7444C959BF536524CF5ACA4F808FFEECE923056A8274` |
| `docs/decisions/wrangler-deferred-until-cms.md` | `docs/decisions/wrangler-deferred-until-cms.md` | Giữ; index theo domain | accepted | `38C0392FF0B37B9692277EA05C70BE19A37787CE560517A52C42A1BBBC585511` |
| `docs/engineering/ARCHITECTURE.md` | `docs/archive/guides/ARCHITECTURE.md` | Archive nguyên byte; nguồn hiện hành theo mapping | Không khai báo | `F6913FECF4A255FE3640D82EC2640A8EE040220268B7FDBFE591A13BA31C94E5` |
| `docs/engineering/CMS-ROADMAP.md` | `docs/archive/guides/CMS-ROADMAP.md` | Archive nguyên byte; nguồn hiện hành theo mapping | Không khai báo | `BE801BFA2CDDFB1BD88F5E39C4610D03272D8C191840DDEC5212107CAC4A1D46` |
| `docs/impeccable/brand-guidelines.md` | `docs/archive/guides/brand-guidelines.md` | Archive nguyên byte; nguồn hiện hành theo mapping | living | `BBA9B5250F402669EF3A024797D4A1FDF1DE43E570BFCDB5E3475A85C16F676B` |
| `docs/impeccable/index.md` | `docs/design/index.md` | Đổi routing; giữ stub compatibility nếu cần | Không khai báo | `AB0260FD62034C458A0F8BF29FA4F969798245D52DD1B03612B37D069A116560` |
| `docs/impeccable/motion-map.md` | `docs/archive/guides/motion-map.md` | Archive nguyên byte; nguồn hiện hành theo mapping | Không khai báo | `3889F4F4EEBE9CB60F88722D1E77D56087F838FBF87B72CFA0A4E302DD13FB8A` |
| `docs/operations/agent-rule-core.md` | `docs/operations/agent-rule-core.md` | Giữ; index theo domain | Không khai báo | `13CF4B0C1B71107F29E53287902762C4213AD6FD11D04B0924AC50C2D4042D6C` |
| `docs/operations/agent-rule-evidence-qa-handoff.md` | `docs/operations/agent-rule-evidence-qa-handoff.md` | Giữ; index theo domain | Không khai báo | `ABC1F9B4DC2C31185A661907DA33E830660A866FCC9D6F3533346CFD52F6D584` |
| `docs/operations/agent-rule-knowledge-notion.md` | `docs/operations/agent-rule-knowledge-notion.md` | Giữ; index theo domain | Không khai báo | `C874A90C62AE1BB60A65E87BF61D74581F4C40AAF479088A58136FC940FB2698` |
| `docs/operations/agent-rule-product-ui.md` | `docs/operations/agent-rule-product-ui.md` | Giữ; index theo domain | Không khai báo | `CE2A127173C0A9D8E7C56DA1C48605C381DB6239F672CDC566A1ADDE72564B7D` |
| `docs/operations/agent-rule-scripts.md` | `docs/operations/agent-rule-scripts.md` | Giữ; index theo domain | Không khai báo | `A2C4DFAB36487B0B9894178F276E5245BF7EC8592CEA896B7E9A6A2F60921596` |
| `docs/operations/agent-rule-workflow-tools.md` | `docs/operations/agent-rule-workflow-tools.md` | Giữ; index theo domain | Không khai báo | `68DA05D4F3674E79F5D9DC8E09A209564DDE064FF8105F59D6513B7D4745DFC3` |
| `docs/operations/graphify.md` | `docs/operations/graphify.md` | Giữ; index theo domain | Không khai báo | `71A0405FE664022BEF7482A0409E625B593E8217A7C5B4723F3F50F872A46BC1` |
| `docs/operations/notion.md` | `docs/operations/notion.md` | Giữ; index theo domain | Không khai báo | `45A200B30D4635F013F14058ADA4510194EDFCEFA29730741D32AB0292DF3C17` |
| `docs/operations/superpowers-codex.md` | — | Retired 2026-09-23 per owner; active policy is `docs/operations/agent-rule-workflow-tools.md` | Không khai báo | `87D394796E3995DEFA67AC1441303267BAF0C9F23650A6BE31C2601F81A6574A` |
| `docs/operations/TOOLING.md` | `docs/operations/TOOLING.md` | Giữ; index theo domain | Không khai báo | `2ABEAC427DC9FFAF6A9A186E408C096C7CFFA7A9DAF8BEB91361C6D36360D149` |
| `docs/product/CONTENT-MEDIA-GUIDE.md` | `docs/archive/guides/CONTENT-MEDIA-GUIDE.md` | Archive nguyên byte; nguồn hiện hành theo mapping | Không khai báo | `7997233474B330B9A65DE8A11752E65CDD1BC8F0495671474E1BBB125732E879` |
| `docs/reports/_template.md` | `docs/reports/_template.md` | Cập nhật routing/compatibility | Không khai báo | `23AB121AD0AA5C7470464BEC5844CAE4E88357FE32B99E8B1D1D4685CA69ADD2` |
| `docs/reports/frontend-brand-shell-responsive-runtime-2026-08-26.md` | `docs/archive/reports/frontend-brand-shell-responsive-runtime-2026-08-26.md` | Archive nguyên byte; nguồn hiện hành theo mapping | pass-focused | `8031DF1F01CA95E1C027CCB7EFB04680144BB85D8F83550525BF2CDA9AF0F25C` |
| `docs/reports/index.md` | `docs/reports/index.md` | Cập nhật routing/compatibility | Không khai báo | `30BE5C08229E32944F303E405BE9E8EED6266DDECD2DC6B60D185AD73E59F455` |
| `docs/reports/research-advertising-products-masonry-batching-2026-08-30.md` | `docs/archive/reports/research-advertising-products-masonry-batching-2026-08-30.md` | Archive nguyên byte; nguồn hiện hành theo mapping | Không khai báo | `E25B6A530B655AC1385A2793AA4F2BBD8C04C12CCA2373DC2DD846499B2ACFDA` |
| `docs/reports/research-codex-orchestration-skills-2026-09-08.md` | `docs/archive/reports/research-codex-orchestration-skills-2026-09-08.md` | Archive nguyên byte; nguồn hiện hành theo mapping | Không khai báo | `7D3495B53905FEAD139568DC2B7CAE323DD269ECB88E8B146EE8B489E60D15D7` |
| `docs/reports/research-espacio-layout-motion-coverage-pilot.csv` | `docs/reports/research-espacio-layout-motion-coverage-pilot.csv` | Giữ sink; link từ verification/reference | Không khai báo | `CB96A37EA8317AD21AC9874E26A09284C566B387DB102D55532BE2D383F66897` |
| `docs/reports/research-espacio-layout-motion-coverage-targeted.csv` | `docs/reports/research-espacio-layout-motion-coverage-targeted.csv` | Giữ sink; link từ verification/reference | Không khai báo | `4F05E33ED24159FFD01CAB7A3A53EB777AA20AC1900D1466D32955200C110B01` |
| `docs/reports/research-espacio-layout-motion-coverage.csv` | `docs/reports/research-espacio-layout-motion-coverage.csv` | Giữ sink; link từ verification/reference | Không khai báo | `3FA5FB7B0B8C0DDE0F4DAA0E72502B5A88BB13E1EAE4DB383C950DD70B5A5CD6` |
| `docs/reports/research-espacio-layout-motion-obligations.csv` | `docs/reports/research-espacio-layout-motion-obligations.csv` | Giữ sink; link từ verification/reference | Không khai báo | `8A126F74FE827416000F31293A9ABA1FA4E4FD62A057CD6AC6DD4AA01E6EE1CC` |
| `docs/reports/research-espacio-layout-motion-parity-pilot.md` | `docs/reports/research-espacio-layout-motion-parity-pilot.md` | Giữ sink; link từ verification/reference | Không khai báo | `4CB626CA7B7E60E3975E100D2B71A0C00BE5FD5DE91F12CD0D53A62FB534ED70` |
| `docs/reports/research-espacio-layout-motion-parity-targeted.md` | `docs/reports/research-espacio-layout-motion-parity-targeted.md` | Giữ sink; link từ verification/reference | Không khai báo | `711DC654C26C6F86D3FA9EDB71CCA605EA4A0E4BD47CF2175A7280B2A2E786BC` |
| `docs/reports/research-espacio-layout-motion-parity.md` | `docs/reports/research-espacio-layout-motion-parity.md` | Giữ sink; link từ verification/reference | Không khai báo | `3FC98CA29AA55071CA3B6F81F7CF8165DEB5AA16B58ED67839D95BBA7FE71E62` |
| `docs/reports/research-espacio-layout-motion-runtime-pilot.csv` | `docs/reports/research-espacio-layout-motion-runtime-pilot.csv` | Giữ sink; link từ verification/reference | Không khai báo | `8AE7DE972DEFE1D3DD17499A14258DC2B04CDCD241C0CA792C4907E71AD6A59A` |
| `docs/reports/research-espacio-layout-motion-runtime-targeted.csv` | `docs/reports/research-espacio-layout-motion-runtime-targeted.csv` | Giữ sink; link từ verification/reference | Không khai báo | `5C9C19706BB4559115B5044F71F5C56414B6867CC28CDD5E63660B95EB6319EA` |
| `docs/reports/research-espacio-layout-motion-runtime.csv` | `docs/reports/research-espacio-layout-motion-runtime.csv` | Giữ sink; link từ verification/reference | Không khai báo | `6DC4D640E45BC6DB2D919AA5752B5D19956D857C4E619B229D4A327F42BD8A7A` |
| `docs/reports/research-espacio-layout-motion-runtime.csv.pre-static-retry-20260820T212036.bak` | `docs/reports/research-espacio-layout-motion-runtime.csv.pre-static-retry-20260820T212036.bak` | Giữ sink; link từ verification/reference | Không khai báo | `E4BEACD778C6A5E788A96910747AD5274EF1D7A74787A0C2DE900CB4A6D214D5` |
| `docs/reports/research-espacio-motion-audit.md` | `docs/reports/research-espacio-motion-audit.md` | Giữ sink; link từ verification/reference | Không khai báo | `71BE0C676DAC5B3269228D1EE3399941B92DE724C44D0960C3E49AEFB095276A` |
| `docs/reports/research-espacio-motion-candidate-map.csv` | `docs/reports/research-espacio-motion-candidate-map.csv` | Giữ sink; link từ verification/reference | Không khai báo | `5B4F48E4BE9330FEC6A3696382869D864CB96B1C9426494091D5C11E77E55E68` |
| `docs/reports/research-espacio-motion-candidates.csv` | `docs/reports/research-espacio-motion-candidates.csv` | Giữ sink; link từ verification/reference | Không khai báo | `8C837A8E78F4819B320015068C0D6A0458D7E8172B27A71FEEE00047AE36B8EA` |
| `docs/reports/research-espacio-motion-obligations.csv` | `docs/reports/research-espacio-motion-obligations.csv` | Giữ sink; link từ verification/reference | Không khai báo | `91FDAAC3CA749B086A595376DC7C6A5DED03665D8859B8C9C2939065FB8CA957` |
| `docs/reports/research-espacio-motion-runtime.csv` | `docs/reports/research-espacio-motion-runtime.csv` | Giữ sink; link từ verification/reference | Không khai báo | `9F6AD8F5572D0B76E75958E8CCB12F30CD987836F8B14D67DB0A67674D2BD204` |
| `docs/reports/research-espacio-navbar-runtime-2026-08-27.md` | `docs/archive/reports/research-espacio-navbar-runtime-2026-08-27.md` | Archive nguyên byte; stub tương thích ở path cũ | Không khai báo | `1BE00B48184917024C19A222A5C3E6BA41145931279E179C33C00F5F2623BA3F` |
| `docs/reports/research-espacio-parity-inventory.md` | `docs/archive/reports/research-espacio-parity-inventory.md` | Archive nguyên byte; nguồn hiện hành theo mapping | Không khai báo | `D4A83D69B7091226D898F8D466E9D58AD4D784C737782A8E05A86C65DEE78078` |
| `docs/reports/research-espacio-project-detail-templates-2026-08-30.md` | `docs/archive/reports/research-espacio-project-detail-templates-2026-08-30.md` | Archive nguyên byte; nguồn hiện hành theo mapping | Không khai báo | `D73065925EF4B45CF3AE3B92E5614E69FE609EFA50B1CE3FCEEA12A27FDDC30D` |
| `docs/reports/research-espacio-typography-hero-route-motion-2026-08-27.md` | `docs/archive/reports/research-espacio-typography-hero-route-motion-2026-08-27.md` | Archive nguyên byte; nguồn hiện hành theo mapping | Không khai báo | `56DCAB00E00C97C560F777F3F54145FD473284D4BD2D36453085F28D7A7099BF` |
| `docs/reports/verification-2026-07-31-browser-audit.md` | `docs/archive/reports/verification-2026-07-31-browser-audit.md` | Archive nguyên byte; nguồn hiện hành theo mapping | Không khai báo | `77B44327358ECE352D67609FC253294511DFCA2EEC7CC2BA2E5213345EF2FD06` |
| `docs/reports/verification-2026-08-08-project-baseline.md` | `docs/archive/reports/verification-2026-08-08-project-baseline.md` | Archive nguyên byte; nguồn hiện hành theo mapping | Không khai báo | `AC975CF8656DE547A6F9B6ABBE5B4032C4FC8126329303417EA82041D7F7687F` |
| `docs/reports/verification-2026-08-09-agent-workspace-bootstrap.md` | `docs/archive/reports/verification-2026-08-09-agent-workspace-bootstrap.md` | Archive nguyên byte; nguồn hiện hành theo mapping | Không khai báo | `420EE870B716DDDF2311B39D598432EF48142DBF11CB52BB7B492A44D630DA9E` |
| `docs/reports/verification-2026-08-09-docs-migration.md` | `docs/archive/reports/verification-2026-08-09-docs-migration.md` | Archive nguyên byte; nguồn hiện hành theo mapping | Không khai báo | `70C633C74C147F11FE42AF5897FED4C0F7B7E39293B6554A95758E0116910FA3` |
| `docs/reports/verification-2026-08-25-project-source-cleanup.md` | `docs/archive/reports/verification-2026-08-25-project-source-cleanup.md` | Archive nguyên byte; nguồn hiện hành theo mapping | Không khai báo | `76A4EA4D61002B70A32B7A99DE2C0622C8F0C53994DA6CE56205E094FE7B5295` |
| `docs/reports/verification-advertising-detail-compositions-109-media-2026-09-02.md` | `docs/archive/reports/verification-advertising-detail-compositions-109-media-2026-09-02.md` | Archive nguyên byte; nguồn hiện hành theo mapping | Không khai báo | `876EB2269D215A2F7BA63BB69F34992D9FB312A5EA93CFED1DE0147C5C1B19D9` |
| `docs/reports/verification-advertising-detail-gallery-visibility-2026-09-02.md` | `docs/archive/reports/verification-advertising-detail-gallery-visibility-2026-09-02.md` | Archive nguyên byte; nguồn hiện hành theo mapping | Không khai báo | `784AD4CFCF5E92CFB39208EE137BE93D0FF6E41E7EA301858CAB425B546E50DA` |
| `docs/reports/verification-advertising-detail-horizontal-carousel-2026-09-02.md` | `docs/archive/reports/verification-advertising-detail-horizontal-carousel-2026-09-02.md` | Archive nguyên byte; nguồn hiện hành theo mapping | Không khai báo | `7230A769C42FB011BFA2DBF520EA0F8E06799179C91496B326E1176BEB6066E6` |
| `docs/reports/verification-advertising-hero-text-motion-2026-09-01.md` | `docs/archive/reports/verification-advertising-hero-text-motion-2026-09-01.md` | Archive nguyên byte; nguồn hiện hành theo mapping | Không khai báo | `A9F0F28A105F280FAA53792A98D6280FD5208BA5F7031C21238BCB739D92EBA2` |
| `docs/reports/verification-advertising-products-109-media-spacing-2026-09-01.md` | `docs/archive/reports/verification-advertising-products-109-media-spacing-2026-09-01.md` | Archive nguyên byte; nguồn hiện hành theo mapping | Không khai báo | `47BEB11C9864D6AC1296F519B56C62D130B269431556565FE675B3958838997F` |
| `docs/reports/verification-advertising-products-current-hash-2026-08-31.md` | `docs/archive/reports/verification-advertising-products-current-hash-2026-08-31.md` | Archive nguyên byte; nguồn hiện hành theo mapping | Không khai báo | `73477CAE38D036E8DFF00876DDDBE0D9E72CD1DBEDA8CCFE319CECEE682BBDB9` |
| `docs/reports/verification-advertising-products-media-entrance-2026-09-01.md` | `docs/archive/reports/verification-advertising-products-media-entrance-2026-09-01.md` | Archive nguyên byte; nguồn hiện hành theo mapping | Không khai báo | `CA9C0B2C2703A5C1F67AF555B4FD5E7AA8AE43BA3BBDF938ED373EF7360980FC` |
| `docs/reports/verification-advertising-products-media-reentry-detail-visibility-2026-09-01.md` | `docs/archive/reports/verification-advertising-products-media-reentry-detail-visibility-2026-09-01.md` | Archive nguyên byte; nguồn hiện hành theo mapping | Không khai báo | `B5DA981911EE9E7EE6A828C5D8F94152E27B3F026D12D5BF91E5571782A904F4` |
| `docs/reports/verification-advertising-products-organic-masonry-2026-09-01.md` | `docs/archive/reports/verification-advertising-products-organic-masonry-2026-09-01.md` | Archive nguyên byte; nguồn hiện hành theo mapping | partial | `79331F69B426E3926FD88EADCC784C74FD12A58A14D842C0E2440F0796EE7459` |
| `docs/reports/verification-advertising-products-single-column-2026-08-31.md` | `docs/archive/reports/verification-advertising-products-single-column-2026-08-31.md` | Archive nguyên byte; nguồn hiện hành theo mapping | partial | `8BA4AADF18D17F9CBB70D46673B89E7BC558BBE1B005E5146801F28F60CA2C24` |
| `docs/reports/verification-frontend-brand-lockup-copy-ratio-2026-08-31.md` | `docs/archive/reports/verification-frontend-brand-lockup-copy-ratio-2026-08-31.md` | Archive nguyên byte; nguồn hiện hành theo mapping | Không khai báo | `E9BD319FB95E17ADEEA627FA7ED4C001A56397BB6E05D6D4F334688831F71C04` |
| `docs/reports/verification-pnpm-impeccable-major-2026-09-08.md` | `docs/archive/reports/verification-pnpm-impeccable-major-2026-09-08.md` | Archive nguyên byte; nguồn hiện hành theo mapping | Không khai báo | `0C67AF3DF397C376393436C389C01CBB5F1321FCA01356210CFB8F9196D8511D` |
| `docs/reports/verification-superpowers-codex-2026-09-08.md` | `docs/archive/reports/verification-superpowers-codex-2026-09-08.md` | Archive nguyên byte; nguồn hiện hành theo mapping | Không khai báo | `50EE137EB1C2880E09E2E0E9B3D3FC8FC1146B189ECDA5691B9FC24867709B1B` |
| `docs/reports/verification-tooling-global-project-astra-2026-09-08.md` | `docs/archive/reports/verification-tooling-global-project-astra-2026-09-08.md` | Archive nguyên byte; nguồn hiện hành theo mapping | Không khai báo | `AA0829B2921705CFEF7386FEC12390456F21156E342FA9C4EFE4BFC24AF6BFCB` |
| `docs/specs/_template.md` | `docs/specs/_template.md` | Giữ; index theo domain | draft | `DC6B549222C7D0489D621627B129844D33517FBDFDC49309BEEA8EC07F856A73` |
| `docs/specs/advertising-products-turnkey-services.md` | `docs/specs/advertising-products-turnkey-services.md` | Giữ; index theo domain | accepted | `325CAF2F58812D41E461360A1C9429DDC4D1D0AB12E519EB2648D3B0ACEA574D` |
| `docs/specs/cms-content-publishing.md` | `docs/specs/cms-content-publishing.md` | Giữ; index theo domain | draft | `86C9063C56D34168D6B53A814E87FE6984A6B1FC97F782536FAE7ACFBBC9FEE7` |
| `docs/specs/cms-template.md` | `docs/specs/cms-template.md` | Giữ; index theo domain | draft | `0B8D56033AE98771270EF8545F7703A5F3C157AA3ABD6CFF4192D8D1E60BC8B0` |
| `docs/specs/frontend-brand-shell-responsive-runtime.md` | `docs/specs/frontend-brand-shell-responsive-runtime.md` | Giữ; index theo domain | accepted | `A8569EF2A137D8753748446AFD62392A7930D76978BB74B3F3547B16F75D47DF` |
| `docs/specs/frontend-landing-page-foundation.md` | `docs/specs/frontend-landing-page-foundation.md` | Giữ; index theo domain | draft | `51A87070C93D3D1C3BCEC18CD3CB76EC3639170D1C304BB891ED3D051FE6FD9D` |
| `docs/specs/frontend-route-and-content.md` | `docs/specs/frontend-route-and-content.md` | Giữ; index theo domain | accepted | `377ECE73B568D541169FC32D084BC8CC36AF044F84916B661C40B92341479F71` |
| `docs/specs/frontend-static-release.md` | `docs/specs/frontend-static-release.md` | Giữ; index theo domain | accepted | `1465FB52F32C63198123886D1AD8068F655A4594CCCCAAAE7836A720EAF5BD8C` |
| `docs/specs/frontend-template.md` | `docs/specs/frontend-template.md` | Giữ; index theo domain | draft | `E5C3BE26A39AB5DCC935AF39E3ACC04C6BDF51DFB526C629962AFE3DE569302C` |
| `docs/specs/superpowers-chatgpt-codex-orchestration.md` | `docs/specs/superpowers-chatgpt-codex-orchestration.md` | Giữ làm lịch sử; retired 2026-09-23 | retired | `6462C4187088FFC20DB043E6B94ED42246DDC0582A094B6C46E8A8292300CBD1` |

### Ngoài docs/

PRODUCT.md giữ root và bổ sung schema; DESIGN.md và .impeccable/design.json
chưa tồn tại ở baseline, được tạo theo Impeccable. AGENTS.md/README.md và
rule modules cập nhật links/living-docs gate. tasks/plan.md thuộc Advertising,
không ghi đè. Source/test/script chỉ đọc để kiểm consumer; không đổi runtime.

### Findings nội dung đã đối chiếu

Baseline candidate là bộ tổng hợp archive 2026-08-08, navbar/typography
2026-08-27 và template 2026-08-30 với phần mở rộng đến 2026-09-02.
Không gọi một snapshot đồng thời hoặc đã locked. Giữ provenance từng entry.
`motion-map.md:258` ghi virtual remount không replay, khác STATE/current
Advertising contract; tách TT behavior khỏi Espacio reference khi synthesis.
`research-espacio-project-detail-templates-2026-08-30.md:9` chỉ confirmed
cấu trúc Espacio; các 45/45 block không chứng minh TT parity.
Canonical parity vẫn có unmapped/blocked: không nâng PASS khi gom docs.

Hai stable machine report là layout-motion-parity và motion-audit. Pilot và
 targeted cũng giữ path trong phase này vì runner hỗ trợ suffix; kết luận
không tìm consumer theo exact filename không chứng minh không có generator.
Mọi CSV/backup giữ nguyên. Reviewer inventory được giới hạn scope, không
claim toàn bộ 132 file đã được audit từng dòng.

### Design/code mapping và gap

`catalog-runtime.mjs:67` export async mountAdvertisingCatalog, nên consumer nhận
Promise của cleanup; detail.js điều phối, không sở hữu toàn bộ filter/grid.
`scripts/site/prepare-static-assets.mjs:80` giữ renderDetailComposition nội bộ:
không có component import API công khai. Shell là markup static dùng chung CSS
và runtime; generic gallery khác Advertising progressive Swiper carousel.
Docs mới phải thể hiện các boundary này thay vì invent React/component API.

Brand guide monochrome phải đối chiếu approved CMYK state trong
`frontend-brand-shell-responsive-runtime.md:88-93`. PRODUCT legacy routes và
địa chỉ unknown cần reconcile với accepted route/content spec. Architecture
phải tách static detail hiện tại khỏi future D1 detail. Missing DESIGN/sidecar
là artifact cần viết; missing critique/config không tự là lỗi.

Main đã kiểm exact async mount/export, build-time renderer và CMYK accepted
spec; worker đối chiếu phần API/state/test sâu. Runtime mới chưa được chạy.
Hai worker xác nhận đã đọc đầy đủ skill/ref bắt buộc; requested Sol/high,
effective unknown. Evidence local ở .tmp/docs-living; findings durable ở đây.
### Manifest sau migration

31 original đã archive nguyên byte: 26 report và 5 guide. Một stub navbar giữ
consumer của canonical machine report; 4 machine report và 12 CSV/backup không
đổi path/hash. [Mapping durable](../../docs/archive/mapping.json) ghi original,
replacement và hash stub riêng; [archive index](../../docs/archive/index.md)
giải thích cách đọc link lịch sử và rollback. Không suy ra original trong archive
đã hết hiệu lực; verification index giữ supersession theo claim.

Mọi source trong bảng ban đầu còn tồn tại hoặc có original trong mapping.
File domain/root/Impeccable mới được liệt kê ở
[docs routing](../../docs/index.md); kết quả nghiệm thu tại
[verification](../../docs/verification/living-docs-2026-09-09.md).

## Lịch sử plan Codex trước 2026-09-27

Ledger plan Codex của checkout chính, nhập nguyên văn ngày 2026-10-03 để giữ lịch sử và anchor cũ. Không phải việc đang mở trừ khi mục ghi rõ.

### AD-FINAL-R1-P1 — thiết kế triển khai

Spec [AD-FINAL-R1](../../docs/specs/advertising-final-polish-and-media.md) được
owner duyệt ngày 2026-09-11. Thiết kế dưới đây dẫn tới implementation plan
AD-FINAL-R1-P1 trong [card hợp nhất](https://app.notion.com/p/3d8332849a0e8177ba63d3b965242c90).
Card giữ toàn bộ checklist, dependency, estimate, trạng thái và approval của
plan. Phần này chỉ là index kỹ thuật; các plan phía dưới được giữ để truy
nguyên, không ghi đè intent đã duyệt mới hoặc tự mở lại việc đã hoàn tất.

#### Kiến trúc tái sử dụng

- Giữ pure geometry tại `layout-core.mjs`, compiler/lifecycle tại
  `catalog-runtime.mjs`, catalog và manifest hiện có. N phụ thuộc client width;
    correction D8 đưa gợi ý vào mô tả, bỏ reservation riêng ở cột cuối.
    Correction D10 owner yêu cầu triển khai13/09: primary luôn min(3,N),
    ratio1,8 chỉ chọn hướng ảnh/chữ; giữ240px, fit/peek và nội dung.
    D11 owner chốt primary lấp phần nhìn dưới navbar/gap và luôn chừa50px
    ảnh thật ở đáy; D17 thay năm dòng D12 bằng bốn mục cố định: split2×2
    phủ ngang info, stacked ngang/wrap; chuỗi ảnh chỉ ở mục active.
    D13 owner duyệt ngoại lệ tail riêng N4/span3 và đúng hai ảnh related:
    ưu tiên một ảnh cột4, một ảnh dưới primary; full pool giữ cân đuôi.
    D14 owner duyệt13/09: pool một ảnh ở N4/span3 đặt cột4 y0, miễn peek
    dưới primary; N2/N3 giữ peek50px. Sửa tại related compiler, kiểm
    ngưỡng1004/1005 và toggle VI/EN, giữ identity và chiều cao primary.
    Geometry và suggestion có ownership riêng; build/QA bản kết hợp sau
    khi hai writer đóng checkpoint, tránh output nửa revision.
    D9 ưu tiên so le10% trước fallback căn hàng. Photo-peek tham gia terminal acceptance
    của search với tổng budget 300.000, không thêm solver hoặc giảm N khi lọc.
    Khi ảnh không đủ để cân đáy nếu bắt đầu cạnh primary, compiler có thể
    thử dải ảnh bắt đầu bên dưới primary với chính số cột đó. Đây là lựa chọn
    vị trí dải related để thực hiện D3/D5, không chèn spacer/card giả hoặc nới
    peek; ngoài ngoại lệ D13 vừa chốt, tail giữ nguyên. Các lượt thử và hai
    phase D9 cùng dùng tổng budget300.000.
  - Sparse 0/1 có ngoại lệ đúng spec; dữ liệu đủ giữ intrinsic/tail và ưu tiên D9.
  Khi search-exhausted, dọn kết quả/motion cũ, giữ N và URL/filter hiện tại,
  primary/gợi ý cùng action retry tường minh. Invalid input vẫn lỗi riêng;
  failed-state không dùng để nghiệm thu đầu vào hợp lệ còn chưa bố trí được.
- Lớp loop skeleton tách transform layout/morph, dùng CSS và lifecycle sẵn có.
  Frosted fill chỉ phía sau foreground contain. Logo giữ mark/font/footprint R3;
  đồng bộ SVG chuẩn và inline consumers theo hai batch tuần tự.
- Media khóa inventory/cutoff/use-site và hash trước audit. Mỗi lô 3–5 bản đích,
  reviewer non-Astra độc lập theo owner13/09, kiểm source và public derivative riêng. Giữ public ID
  khi thay cùng sản phẩm; mapping chứa rollback và mọi revision được bảo toàn.

#### Index task và ownership

| Task | Kết quả kỹ thuật | Ownership chính |
| --- | --- | --- |
| T01 | Inventory, cutoff, use-site và mapping | Main, read-only source/media |
| T02 | Fixed N, ratio 1,8, suggestion và terminal photo-peek | Layout core/compiler, Node oracle |
| T03 | Failed-state đúng filter, retry và cleanup | Runtime, Advertising HTML/CSS, browser tests |
| T04 | Đóng filter-interruption-resize và clone/focus kẹt | Runtime motion, transition test |
| T05 | Kính mờ, height tự nhiên, mô tả gọn | Detail CSS/frame, geometry browser test |
| T06 | Copy CTA, bỏ section thừa, giữ trọn dấu hero | Advertising HTML/CSS, scoped site harness |
| T07 | Gradient xám + drift XY và lifecycle | Continuation runtime/CSS/harness |
| T08 | Typeset SVG nguồn chuẩn | Brand SVG, shared CSS, logo harness |
| T09 | Đồng bộ header/menu ở mọi consumer | Năm HTML entrypoint theo hai batch |
| T10 | Audit lại ảnh cũ, chọn candidate | Reviewer non-Astra read-only; main giữ mapping |
| T11 | Sửa/tạo bản không đạt và review lại | Imagegen, source-library theo lô |
| T12 | Tối ưu/import bản đạt, cập nhật consumer | Public asset, manifest/catalog, metadata/tests |
| T13 | QA tích hợp và independent review trên hash cuối | Scoped Node/static/browser/DevTools |
| T14 | Evidence, docs, preview và nghiệm thu đúng scope | Main, Notion và owning Git docs |

Checkpoint A sau T01–T03, B sau T04–T07, C sau T08–T09; D khi toàn bộ
disposition trong cutoff được xử lý qua T10–T12. T13–T14 chỉ nghiệm thu source
cuối. T12 chỉ nhập batch ảnh đạt sau khi cả A/B/C đã đạt. Media audit read-only
có thể song song UI trên hash đã khóa; runtime/CSS/
HTML luôn chỉ một writer. Routing dự kiến và command đầy đủ ở card, capability
được kiểm lại trước dispatch; effective model không quan sát được ghi unknown.

Living-docs áp dụng ngay trong mỗi task/batch: main cập nhật owning contract
và evidence hoặc ghi no-impact kèm lý do trước acceptance. T14 tổng hợp và
kiểm coverage cuối, không dồn mọi cập nhật tài liệu tới T14.

Không thêm dependency, không đổi rubric/brief hoặc navbar, không chạm CMS,
semantic Graphify, memory, commit/push/deploy. Rollback chỉ phần task sở hữu,
giữ dirty worktree và evidence cũ. T04 phải giải quyết failure hiện hữu;
focused PASS không thay owner acceptance hoặc full-site/canonical parity.

#### Chú thích thuật ngữ AD-FINAL-R1-P1

- **Terminal acceptance**: điều kiện chấp nhận một kết quả search hoàn chỉnh.
- **Failed-state**: giao diện cho request lỗi, khác bộ lọc không có dữ liệu.
- **Public derivative**: ảnh đã tối ưu được website sử dụng thực tế.

### GRID-R4 — kế hoạch đề nghị

- Status: owner duyệt spec và plan ngày 2026-09-09; chưa implement R4.
- Revision thực thi gồm bổ sung GRID-R4-B1 đã duyệt tại
  [visual contract](../../docs/design/patterns.md): khoảng trống bridge có giới hạn
  để trộn ảnh một/hai cột. P2 kiểm theo B1, thay gate no-hole tuyệt đối.
- Ưu tiên owner: hoàn tất LOGO-R2 trước khi bắt đầu P0 của GRID-R4.
- Spec: [Advertising grid tự nhiên 1–2 cột](../../docs/specs/advertising-grid-span-organic.md).
- Task/status/checkpoint owner: [card Advertising hiện có](https://app.notion.com/p/3cd332849a0e817ab32df5dca7c6c9c4).
- Thứ tự: P0 → P1 → P2 → P3 → P4 → P5 → P6. Không tạo tracker thứ hai;
  mã task dưới đây là index của checklist trên card. Các plan phía dưới là
  lịch sử R1–R3, không tự trở thành checklist thực thi R4.
- Scope estimate: 600–1.000 LOC source/test, cần hiệu chỉnh sau P0;
  khoảng 240–480 phút agent cho code/QA, chưa gồm vòng tạo ảnh phụ thuộc audit.
  Đây là dự toán, không phải ngân sách/weekly quota đã đo.

#### Phân công và checkpoint R4

| Task | Kết quả và dependency | Ownership dự kiến | Focused verification | Route dự kiến |
| --- | --- | --- | --- | --- |
| P0 | Rà pool hiện có; lập bảng giữ/thay/thêm theo ID, product key, ratio và thiếu hụt bối cảnh. Chưa thay media hoặc tạo cả bộ. | Read-only source/media; report trong `.tmp/orchestration/<run>/` | Metadata đủ 109 baseline; xem ảnh theo nhóm và full resolution; không coi filename/hash là bằng chứng chất lượng | Terra/medium; main kiểm báo cáo |
| P1 | P0 xong: data contract/settings/Auto-1-2; chuyển static attributes lưu một lần, gỡ trường legacy ở producer/validator. | `catalog.mjs`, `media-manifest.mjs`, `media-contract.mjs`, `layout-core.mjs` phần validator, media test | Test boundary T, invalid, override, actual dimensions, version mismatch; không random trong build | Luna/medium, brief field/patch/edge case cụ thể |
| P2 | P1 xong: solver span/stagger deterministic có diagnostics và budget, thử pool hiện có; xuất danh sách thiếu thực tế trước tạo ảnh. | `layout-core.mjs` phần compiler; layout test | Oracle độc lập, no hole/overlap, determinism, symmetric/adversarial fixture, search exhaustion; benchmark 3.000 records | Terra/high; Sol/high nếu có failure evidence cần nâng |
| P3 | P2 xong: render natural image, remove backplate, giữ motion/virtualization/focus theo layout mới. | `catalog-runtime.mjs`, `detail.css`, lifecycle/static tests | Node lifecycle/static; prepare + static gate; browser smoke 390/1440 và mở preview | Terra/medium |
| P4 | P2 chỉ ra thiếu hụt và P3 có preview: tạo/thay ảnh đúng nhóm rồi migrate references. Không mua quota bằng cách tạo lại toàn bộ pool. | Asset batch theo category; `media-manifest.mjs`, `media-contract.mjs`, `catalog.mjs`, media/detail-route tests | Reviewer khác generator mở ảnh chấm theo guide; hash phiên bản; không thiếu/trùng detail source; chạy lại solver với media thật | Image generator qua image tool; Terra/high audit + critique độc lập |
| P5 | P3/P4 xong: regression R4 và runtime proof, sửa đúng finding bằng worker ownership cũ. | `tests/site/site.e2e.cjs`; logs/screenshots trong run; source fix giao về đúng owner | GRID, KEYBOARD, 3K, PROOF; locale/history/rapid/dependency-failure theo impact; current hashes | Terra/medium; reviewer Sol/medium nếu P2/P3 do Terra làm |
| P6 | P5 đạt: cập nhật current design/spec/CMS refs/evidence, main nghiệm thu và để owner xem web. | Main giữ docs, Notion, STATE, final acceptance | Link/schema checks; diff inspection; R4-1…5 có proof; UI owner review không tự đánh dấu | Main; Luna/low chỉ hỗ trợ patch docs cơ học khi brief đã chốt |

P1–P3 là một migration source/artifact/runtime đồng bộ: checkpoint trung gian
chưa release; chỉ build/serve candidate khi version và consumers đều tương
thích. Không để public dev preview tự dùng artifact nửa cũ nửa mới.
Nếu quá năm source/test file trong một task, chia producer/consumer hoặc test
thành lượt tuần tự; không giao hai writer cùng file. Binary media batch không
đồng nghĩa quyền sửa source ngoài packet.

P4 chỉ qua khi reviewer khác generator ghi riêng **Audit ≥8/10 và Critique
≥8/10** theo [rubric chuẩn](../../docs/design/advertising-image-quality.md#chấm-điểm-và-điều-kiện-loại).
Mỗi record có hash phiên bản, điểm từng mục và lỗi; chưa đạt thì sửa/tạo lại và
chấm lại, không lấy trung bình hai điểm hoặc tự nâng điểm bởi main.

Checkpoint sau P2: có lời giải khả thi trên fixture, diagnosis rõ cho pool
thật và runtime-cost benchmark; chưa đạt thì giữ tại P2, không tạo ảnh để che
lỗi solver. Sau P3: natural span chạy được và preview đã mở. Sau mỗi batch P4:
hai điểm ảnh đạt, source IDs hợp lệ, grid tốt lên qua số đo và xem bằng mắt.
Sau P5: review spec và quality độc lập, main kiểm evidence rồi mới P6.

#### Routing tiết kiệm token

User yêu cầu dùng `subagent-driven-development` khi implement, ưu tiên dưới
Astra. Main giữ intent, architecture, scope, Notion, diff và nghiệm thu; được
sửa phần nhỏ trong task đã duyệt. Các task cần context hoặc review riêng dùng
native worker, không tạo task sidebar/CLI/hook để thay worker.

Các route trong bảng là đề nghị, kiểm capability lại tại dispatch. Host hiện
có native Luna/Terra/Sol/Astra và GPT-5.5; Spark chỉ có ở catalog task riêng,
chưa callable qua `spawn_agent` nên không dùng workaround. Truyền cả `model`
và `reasoning_effort`, `fork_turns=none`; ghi requested và effective/unknown.
Concurrency host hiện là 5 nhưng mặc định chỉ một implementer; thêm một
reviewer độc lập khi có artifact, không mở sáu worker theo sáu nhóm ảnh.

Ưu tiên lượt ít, context đúng phần và acceptance rõ: reuse worker cùng
ownership, chỉ gửi delta khi sửa; report tối đa 500 từ cộng path/log/hash.
Luna nhận exact field/symbol, patch intent và command; không giao thiết kế
solver còn mở. Terra xử lý thuật toán/runtime; Sol dùng cho review hoặc vấn đề
Terra chưa giải được có evidence. Chỉ cân nhắc Astra sau khi xác định vấn đề
kiến trúc/ràng buộc còn chưa giải bằng route dưới và main ghi lý do cụ thể;
không mặc định dùng Astra để viết code hoặc chấm tất cả ảnh.

Không có số đo credits/weekly quota riêng cho từng task nên không hứa tỷ lệ
tiết kiệm. So tổng context, retry và review; effort cao không dùng mặc định cho
task cơ học. Sau ba vòng cùng finding không có evidence mới, dừng loop và xem
lại assumption, không hạ quality bar hoặc tiếp tục tạo ảnh vô hạn.

#### Artifact, verification và rollback

Run planning hiện tại: `.tmp/orchestration/grid-r4-20260909-plan/`; khi thực
thi tạo run mới có base revision, owner approval, worker brief, requested/
effective route, ownership và hash. Không dùng STATE làm log worker.
Command chuẩn và acceptance nằm ở spec R4, không chép thành test matrix thứ
hai. Focused E2E chạy một flag mỗi process; chỉ lặp khi source/input đổi hoặc
còn finding. Không chạy canonical Espacio hoặc full-site suite chỉ để đóng R4.

Giữ hero, carousel, logo và phần ngoài Advertising scope; migration media
chỉ cập nhật consumer thực tế bị ảnh hưởng. Giữ backup manifest/source và
evidence cũ; không xóa nguyên folder hoặc reset dirty worktree. Không commit,
push, deploy, bật CMS/Worker/Wrangler hoặc cài dependency trong plan này.

#### Gate duyệt R4

Owner đã duyệt gói gồm spec R4, visual contract và plan này ngày 2026-09-09.
Các lựa chọn cần xem: default T, phép đo stagger/anti-brick, chiến lược search
và phạm vi migration. User đã chốt nội dung ảnh; không mở lại interview các
nhóm/khách hàng/cấu tạo đã xác nhận. Duyệt gói không tự đóng owner spot-check
website cuối hoặc các card logo/SplitText độc lập.

### Kế hoạch lịch sử: lưới organic trước GRID-R4

- Status: baseline rank-v3 và delta spacing Espacio + `109` media đã hoàn tất
  scoped current-hash; full repository suite vẫn `NOT PASS`.
- Owner gate: baseline duyệt ngày `2026-09-01`; delta spec duyệt cùng ngày;
  delta plan được duyệt ngày `2026-09-01`.
- Canonical spec: [Advertising products và dịch vụ trọn gói](../../docs/specs/advertising-products-turnkey-services.md)
- Canonical decision: [Organic masonry, spacing Espacio và phân bổ media độc lập](../../docs/decisions/advertising-organic-masonry-espacio-spacing-media-distribution.md)
- Work item: [Notion card hiện có](https://app.notion.com/p/3cc332849a0e817f9bcafba5e357c21c)
- Estimated new handwritten source/test delta: `300–500 LOC`, cộng `109` asset;
  Markdown, generated output và discarded image variants không tính.

### Baseline rank-v3 đã hoàn tất

Thay baseline rank-v2 bằng rank-v3 organic masonry: card rộng một cột, chiều
cao theo media tự nhiên hoặc canvas được khai báo, outer margin `20px`, gap
`16px`, số cột không có trần, pack vào cột thấp nhất và giữ prefix khi append.
Giữ Masonry/Outlayer position morph, LazySizes, bounded virtualization, focus,
pending scroll, Barba lifecycle và sáu route chi tiết hiện có.

Không sửa `.site-output`, không mở Wrangler, không tạo CMS và không thay hero,
copy, navigation hoặc service pages ngoài regression cần thiết.

### Dependency graph

```text
rank-v3 data và pure layout core
        |
        +--> artifact v3 immutable
        |        |
        |        +--> runtime geometry/cache
        |                  |
        |                  +--> Masonry motion + virtualization
        |                              |
        +------------------------------+--> focused browser QA
                                                   |
                                                   +--> current-hash evidence
```

### Quyết định kiến trúc

1. Tạo một pure layout core dùng chung cho builder và browser runtime. Artifact
   v3 giữ categories, ranked cards, intrinsic dimensions, optional canvas và
   explicit fit mode; bỏ bảng placement precompile cố định theo `[2,3,4]` cột.
   Runtime chỉ đọc data/rank từ artifact, rồi derive và cache geometry bằng cùng
   core. Vì vậy công thức cột không cần hard-code trần `10`, `72` hoặc một trần
   viewport giả.
2. Rank-v3 round-robin sáu category theo canonical order và FIFO nội bộ. Packer
   đọc sequence theo thứ tự, đặt card vào `columnBottom` thấp nhất, tie chọn cột
   trái nhất. Compile prefix và compile full input phải cho cùng tọa độ prefix.
3. Natural card không có frame, crop hoặc backplate. `presentationCanvas` và
   `fitMode` chỉ tồn tại khi data khai báo rõ. Media assignment sản xuất phải
   dùng asset liên quan và intrinsic dimensions chính xác; không hash/random để
   tạo vẻ đa dạng. Dùng các media/canvas explicit hiện có để tạo mix landscape,
   square, portrait và tall. Ràng buộc không sinh ảnh mới chỉ thuộc baseline đã
   hoàn tất; delta được owner duyệt bên dưới thay nó bằng Task 8 tạo `109` source
   độc lập.
4. Masonry/Outlayer `4.2.2` tiếp tục là position-transition owner duy nhất.
   Pure core chỉ cấp canonical coordinates; không thêm FLIP engine thứ hai.

### Task list baseline

Task được theo dõi trong work item Notion nêu trên. Không tạo `tasks/todo.md` và
không tự update card trước khi owner cho phép.

### Task 1: Chuyển data và layout compiler sang rank-v3

**Mô tả:** Viết test RED cho contract organic, sau đó tạo shared pure core và
migrate builder/artifact từ fixed ratio, batch đóng và seeded fit sang data tự
nhiên/canvas, round-robin và shortest-column.

**Acceptance criteria:**

- [x] Rank liên tục `0..n-1`; filter `all` round-robin/FIFO, category filter giữ
  source order; validator từ chối id trùng, dimension/canvas sai, orphan fit mode
  và field `span`.
- [x] Geometry dùng natural/canvas ratio, tie-left shortest-column, arbitrary
  append size, immutable prefix, deterministic coordinate hash; không còn
  closed frontier, filler, ratio sequence hoặc seeded-random fit.
- [x] Công thức cột là `max(2, floor(availableWidth / 235))`; artifact v3 không
  chứa fixed-column layout table và cùng core derive được mọi số cột hợp lệ.

**Verification:**

- [x] `node --check src/site/advertising-products/layout-core.mjs`
- [x] `node --check src/site/advertising-products/catalog.mjs`
- [x] `node --test tests/site/advertising-products-layout.test.mjs`

**Dependencies:** Không.

**Files likely touched:**

- `src/site/advertising-products/layout-core.mjs`
- `src/site/advertising-products/catalog.mjs`
- `tests/site/advertising-products-layout.test.mjs`

**Estimated scope:** Medium, 3 files.

### Task 2: Migrate runtime, DOM media và CSS mà giữ motion/lifecycle

**Mô tả:** Viết lifecycle/static assertions RED, sau đó cho runtime đọc artifact
v3, dùng shared core để cache geometry và virtualize theo placement thay vì
closed batch. Chỉnh CSS/DOM đúng natural hoặc explicit canvas composition.

**Acceptance criteria:**

- [x] Runtime fail closed khi artifact version không phải rank-v3, không compile
  content source, không cap số cột và không phụ thuộc `visibleBatches` rank-v2.
- [x] Outer margin luôn `20px`, horizontal/vertical gap `16px`; natural media
  không crop/backplate, canvas chỉ render composition explicit và foreground duy
  nhất sở hữu alt VI/EN.
- [x] Masonry morph `0.4s`, no stagger, bounded old/new cohort, focus retention,
  one-shot lazy fade, pending-scroll catch-up và reduced motion giữ nguyên.

**Verification:**

- [x] `node --check src/site/advertising-products/catalog-runtime.mjs`
- [x] `node --test tests/site/advertising-products-lifecycle.test.mjs tests/site/advertising-products-static.test.mjs tests/site/advertising-products-detail-routes.test.mjs`
- [x] `pnpm prepare:site && pnpm qa:static`

**Dependencies:** Task 1.

**Files likely touched:**

- `src/site/advertising-products/catalog-runtime.mjs`
- `src/site/advertising-products/layout-core.mjs`
- `src/site/detail.css`
- `tests/site/advertising-products-lifecycle.test.mjs`
- `tests/site/advertising-products-static.test.mjs`

**Estimated scope:** Medium, 5 files.

### Checkpoint 1: Contract và generated boundary

- [x] Bốn Advertising Node suites pass trên source hiện tại.
- [x] `prepare:site` tạo artifact v3; không edit hoặc stage `.site-output`.
- [x] `qa:static` pass; artifact v2/runtime v3 mismatch có test fail-closed.

### Task 3: Chứng minh geometry, virtualization và motion trong browser

**Mô tả:** Cập nhật focused Playwright probes theo organic contract, rồi đo
runtime thật. Dùng Chrome DevTools riêng cho computed geometry, DOM bound,
console, network, screenshot và accessibility evidence.

**Acceptance criteria:**

- [x] Tại `320/390/768/1024/1440/1920px`, số cột là `2/2/3/4/5/8`, outer
  `20px`, gap `16px`, card width sai số tối đa `0.05px`, overflow ngang bằng `0`;
  threshold `-1/0/+1px` cũng theo cùng công thức.
- [x] Fixture landscape, square, portrait, tall và explicit canvas đúng ratio;
  shortest-column không overlap/interior hole; append giữ prefix và ragged
  bottom được chấp nhận.
- [x] Probe `3.000` card mount vùng `2800–2820`, unmount vùng cũ, DOM bounded;
  filter/resize morph, rapid filter, locale/history/direct-Barba/reduced-motion
  sạch và không replay media entrance.

**Verification:**

- [x] `$env:TT_E2E_ADVERTISING_GRID_ONLY='1'; pnpm qa:site`
- [x] `$env:TT_E2E_ADVERTISING_3K_ONLY='1'; pnpm qa:site`
- [x] Chạy các focused gates `RAPID_FILTER`, `LOCALE_LIFECYCLE`, `HISTORY`,
  `SELECTION`, `DEFAULT` và `REDUCED`; sau đó chạy `pnpm qa:site` full một lần.
  Focused Advertising pass; full runner ghi failure ngoài boundary rồi hung và
  được dừng sau hơn 6 phút không có output/CPU progress.

**Dependencies:** Checkpoint 1.

**Files likely touched:**

- `tests/site/site.e2e.cjs`
- `tests/README.md`

**Estimated scope:** Small, 2 files.

### Task 4: Current-hash evidence và live specs

**Mô tả:** Sau khi QA đạt acceptance, ghi report bằng hash hiện tại, cập nhật
living spec và STATE. Baseline rank-v2 chỉ giữ nhãn historical; không dùng làm
bằng chứng organic pass.

**Acceptance criteria:**

- [x] Report ghi command/result, source/test/runner/generated-artifact hash,
  Playwright và DevTools evidence; mọi failure hoặc baseline blocker được nêu rõ.
- [x] Living spec phản ánh implementation/evidence thực tế; `docs/STATE.md` bỏ
  snapshot rank-v2 đã hết hạn và trỏ report mới.
- [x] Notion card chỉ sync status, blocker, next action và link Git sau khi owner
  cho phép; không copy accepted spec/report vào card.
  Task này không update Notion vì owner chưa cấp quyền riêng cho lần sync.

**Verification:**

- [x] Kiểm tra local Markdown links của các file thay đổi.
- [x] Đối chiếu report hash với current worktree và generated artifact cuối.
- [x] Không commit/push trong task; `ponytail-review` vẫn bắt buộc trước lần
  commit/push sau và không dùng `--no-verify`.

**Dependencies:** Task 3.

**Files likely touched:**

- `docs/archive/reports/verification-advertising-products-organic-masonry-2026-09-01.md`
- `docs/reports/index.md`
- `docs/specs/advertising-products-turnkey-services.md`
- `docs/STATE.md`

**Estimated scope:** Medium, 4 files.

### Checkpoint 2: Hoàn tất

- [x] Accepted spec và ADR không mâu thuẫn source/runtime.
- [x] Focused Node/static/browser gates pass current hash.
- [x] Full runner result được báo trung thực; không đổi failure ngoài scope thành
  green và không dùng evidence cũ.
- [x] Main agent inspect diff, reviewer độc lập kiểm tra correctness, motion,
  accessibility, virtualization và scope trước final acceptance.

### Rủi ro baseline

| Rủi ro | Mức | Mitigation |
| --- | --- | --- |
| Artifact v2 và runtime v3 trộn schema | Cao | Version guard fail-closed, regenerate trước browser QA, hash artifact trong report. |
| Precompile hữu hạn trái contract không max cột | Cao | Bỏ fixed-column table; dùng shared pure core và runtime cache từ artifact immutable. |
| Organic grid vẫn đơn điệu vì asset lặp | Trung bình | Gán media/canvas explicit từ asset liên quan, kiểm tra intrinsic dimensions và production mix; không random. |
| Virtualizer giữ giả định closed batch | Cao | Window trực tiếp theo placement; test 3.000 card, focus và rapid pending scroll. |
| Dirty worktree hoặc generated output bị lẫn | Cao | Chỉ sửa exact files, không reset/stage hàng loạt, không edit/commit `.site-output`. |

### Rollback baseline

Revert cùng một atomic set gồm layout core, catalog, runtime, CSS và tests, rồi
chạy lại `pnpm prepare:site`. Không giữ artifact rank-v2 với runtime rank-v3 và
không có database/CMS migration cần rollback.

### Human gate baseline

Owner đã trả lời `duyệt plan` ngày `2026-09-01`; implementation được phép bắt
đầu theo đúng task và boundary trên. Việc duyệt plan không tự động cấp quyền
update Notion; cần yêu cầu riêng nếu muốn sync card.

### Delta spacing Espacio và `109` media

#### Mục tiêu

Khôi phục outer band và inter-card gap Espacio, giữ content tối đa `1500px`,
giới hạn tuyệt đối `5` cột và không đổi shortest-column/motion/virtualization.
Thay catalog `72` card tái dùng media bằng đúng `109` card có source ảnh độc lập,
phân bổ `24/16/22/13/18/16`, đủ ratio coverage trong từng nhóm.

Không đổi hero, nav, template sáu trang con, CMS, Wrangler hoặc deploy. Sáu trang
con được chọn ảnh từ pool `109`; không tạo gallery pool thứ hai. Không update
Notion nếu owner chưa cấp quyền riêng.

#### Dependency graph

```text
geometry contract + CSS
        |
        +--> browser geometry/motion gate

media validator + temporary ledger
        |
        +--> six independent imagegen lanes
                    |
                    +--> production manifest + catalog integration
                                    |
                                    +--> media/runtime QA
                                                    |
                                                    +--> current-hash evidence
```

#### Quyết định triển khai

1. Dùng `layout-core.mjs` làm owner duy nhất của outer/gap band, content width,
   column count và card coordinates. CSS chỉ phản chiếu container tokens; không
   tạo công thức cột thứ hai.
2. Giữ `ADVERTISING_CATEGORIES.products` làm taxonomy `12` sản phẩm mỗi nhóm.
   Tách `109` grid record sang một media manifest để số card không làm thay đổi
   danh sách sản phẩm của sáu trang con.
3. Built-in `imagegen` là công cụ tạo ảnh trực tiếp. Mỗi final asset dùng một
   call riêng; không dùng CLI/API fallback, không dùng crop của cùng source làm
   card thứ hai. Main agent giữ ledger tạm trong `.tmp/`; worker chỉ sở hữu asset
   sub-batch được giao và không sửa shared manifest/code.
4. Không thêm frontend/image dependency. WebP packaging dùng runtime/tooling sẵn
   có; final file phải sRGB, đã loại metadata, đúng intrinsic dimensions và nằm
   trong budget của `CONTENT-MEDIA-GUIDE.md`.

### Task 5: Triển khai geometry Espacio trong pure layout core

**Mô tả:** Viết regression cùng thay đổi source để core và CSS dùng đúng outer,
gap, content cap và giới hạn cột đã duyệt. Giữ shortest-column và position morph.

**Acceptance criteria:**

- [x] Outer band `15/25/35px`, gap band `15/25/35px`, content width tối đa
  `1500px`, column count `min(5, max(2, floor(gridWidth / 235)))`.
- [x] Matrix `320–2560px`, gồm mọi boundary `-1/0/+1px`, khớp spec trong sai số
  `0.05px`; không overflow, overlap hoặc công thức CSS/JS lệch nhau.
- [x] Rank, shortest-column, immutable append prefix, ragged bottom và
  virtualization contract không đổi.

**Verification:**

- [x] `node --test tests/site/advertising-products-layout.test.mjs tests/site/advertising-products-static.test.mjs`
- [x] `pnpm prepare:site`
- [x] `pnpm qa:static`
- [x] Playwright geometry probe chạy toàn bộ viewport matrix trong spec, gồm
  mọi breakpoint và ngưỡng đổi cột tại `-1/0/+1px`; không chỉ kiểm tra bằng
  pure Node.

**Dependencies:** Không.

**Files likely touched:**

- `src/site/advertising-products/layout-core.mjs`
- `src/site/detail.css`
- `tests/site/advertising-products-layout.test.mjs`
- `tests/site/advertising-products-static.test.mjs`

**Estimated scope:** Medium, 4 files, `60–90` phút agent runtime.

### Task 6: Khóa browser geometry và motion regression

**Mô tả:** Đổi focused browser probe sang geometry mới; đo position morph khi
filter/resize làm tọa độ đổi, không thay loại motion đã duyệt.

**Acceptance criteria:**

- [x] Mọi viewport spec có đúng `2–5` cột, outer/effective outer, gap và content
  cap; `1920px` có effective outer `210px`, `2560px` có `530px`.
- [x] Filter/resize animate transform `0.4s`; unchanged coordinate, initial mount
  và remount không animate; append không repack prefix.
- [x] Console/network sạch, keyboard/reduced-motion còn đúng và page không tự
  scroll khi filter.

**Verification:**

- [x] `$env:TT_E2E_ADVERTISING_GRID_ONLY='1'; pnpm qa:site` đo toàn bộ matrix
  `320–2560px`, mọi breakpoint/column boundary tại `-1/0/+1px`.
- [x] Chrome DevTools đo DOM/computed style/network/console tại `390`, `751`,
  `1201`, `1440`, `1920px`.

**Dependencies:** Task 5.

**Files likely touched:**

- `tests/site/site.e2e.cjs`
- `tests/README.md`

**Estimated scope:** Small, 2 files, `45–75` phút agent runtime.

### Checkpoint 3: Geometry

- [x] Task 5–6 pass; generated output chỉ được tạo qua `pnpm prepare:site`.
- [x] Main agent kiểm tra diff; Impeccable layout scan không có finding chưa giải
  thích. Detector degraded không được gọi là clean bill of health.
- [x] Không bắt đầu media integration nếu geometry gate chưa green.

### Task 7: Khóa media validator bằng synthetic fixtures

**Mô tả:** Tạo pure validator độc lập với runtime baseline để chứng minh count,
source identity, product coverage và ratio coverage trước khi tạo `109` asset.

**Acceptance criteria:**

- [x] Validator yêu cầu count `24/16/22/13/18/16`, unique `id/src/sourceId`, đủ
  `12` product key mỗi nhóm và source record theo thứ tự input ổn định. Task 7
  không yêu cầu `rank` vì rank-v3 chỉ được tạo khi tích hợp ở Task 9.
- [x] Mỗi nhóm có portrait `<0.9`, near-square `0.9–1.1`, landscape `>1.1` và
  extreme `<=0.625` hoặc `>=1.6`; ratio lấy từ intrinsic dimensions.
- [x] Negative fixtures bắt duplicate source qua filename/crop khác, thiếu label,
  sai count, sai dimensions và thiếu ratio class.

**Verification:**

- [x] `node --test tests/site/advertising-products-media.test.mjs`
- [x] Baseline Advertising Node suites vẫn pass trước catalog switch.

**Dependencies:** Không; được làm song song Task 5.

**Files likely touched:**

- `src/site/advertising-products/media-contract.mjs`
- `tests/site/advertising-products-media.test.mjs`

**Estimated scope:** Small, 2 files, `45–75` phút agent runtime.

### Task 8: Tạo pool ảnh bằng sáu imagegen lane

**Mô tả:** Main agent tạo ledger `109` slot trong `.tmp/` từ taxonomy accepted,
sau đó giao category-owned sub-batch. Mỗi final asset là một built-in `imagegen`
call và một cảnh độc lập; discarded variant không được dùng lại làm card khác.

| Lane | Số ảnh | Sub-batch tối đa 5 asset |
| --- | ---: | --- |
| `kiosk-posm` | 24 | `4+4+4+4+4+4` |
| `mobile-retail` | 16 | `4+4+4+4` |
| `signage-raised-letters` | 22 | `5+5+4+4+4` |
| `office-signs-wayfinding` | 13 | `5+4+4` |
| `led-displays-lightboxes` | 18 | `5+5+4+4` |
| `print-decals` | 16 | `4+4+4+4` |

**Acceptance criteria cho mỗi sub-batch:**

- [x] Mỗi asset khác source/cảnh/composition; không crop, blur, xoay hoặc reframe
  cùng source để tăng count; filename và `sourceId` deterministic theo ledger.
- [x] Không mặt nhận diện, chữ/logo giả, watermark, reflection riêng tư hoặc lỗi
  tay/dụng cụ; chủ thể và vật liệu đúng nhóm/product key.
- [x] Final WebP sRGB, metadata đã loại, dimensions thật, `90–220KB` mục tiêu;
  ratio theo composition tự nhiên, không lặp cycle. Mỗi nhóm đạt đủ coverage gate.

**Verification cho mỗi sub-batch:**

- [x] Main agent xem từng final asset; contact sheet category nằm trong `.tmp/`,
  không commit.
- [x] Ledger tạm map từng `slot` sang built-in imagegen call/result, generated
  path, final path, `sourceId` và SHA; file SHA khác nhau và không có duplicate
  `sourceId/src`.
- [x] Technical audit dùng bundled workspace image tooling, ghi JSON trong
  `.tmp/`, kiểm tra WebP, sRGB, metadata, dimensions và byte budget; không thêm
  frontend dependency và không dùng checker để chỉnh sửa nội dung ảnh.
- [x] Worker không sửa catalog, test, docs hoặc asset lane khác.

**Dependencies:** Task 7. Sáu lane được chạy song song; sub-batch trong cùng lane
chạy tuần tự để review trước khi mở batch kế.

**Files likely touched:** Tối đa 5 WebP trong một sub-batch, dưới
`src/site/assets/content/projects/advertising/<category>/`.

**Estimated scope:** `26` bounded sub-batch, `6–12` giờ agent runtime tùy số lần
reroll; dừng an toàn sau mọi sub-batch.

### Checkpoint 4: Media pool

- [x] Tổng đúng `109`; category contact sheet đã review.
- [x] Mỗi category đủ product và ratio coverage; không near-duplicate nhìn thấy.
- [x] Không asset nào được nối vào runtime trước khi checkpoint này green.

### Task 9: Tích hợp production manifest và catalog

**Mô tả:** Chuyển ledger đã duyệt thành source manifest; catalog giữ taxonomy
product riêng, build rank-v3 từ `109` grid record và chọn gallery detail từ cùng
pool. Bump dataset version, không đổi artifact architecture.

**Acceptance criteria:**

- [x] Artifact có đúng `109` card, count/uniqueness/coverage pass; mọi media path
  tồn tại và width/height khớp file thật.
- [x] Rank-v3 liên tục `0..108`; filter `all` round-robin/FIFO và từng category
  filter giữ source order deterministic.
- [x] Sáu category vẫn có đúng `12` product label; detail gallery chỉ tham chiếu
  asset cùng category trong pool `109`.
- [x] Runtime không còn fallback cover/gallery reuse; VI/EN caption, alt, route,
  rank-v3 và filter order deterministic.

**Verification:**

- [x] `node --test tests/site/advertising-products-layout.test.mjs tests/site/advertising-products-media.test.mjs tests/site/advertising-products-static.test.mjs`
- [x] `pnpm prepare:site`
- [x] `pnpm qa:static`

**Dependencies:** Checkpoint 4 và Task 5.

**Files likely touched:**

- `src/site/advertising-products/media-manifest.mjs`
- `src/site/advertising-products/catalog.mjs`
- `src/site/advertising-products/media-contract.mjs`
- `tests/site/advertising-products-media.test.mjs`
- `tests/site/advertising-products-static.test.mjs`

**Estimated scope:** Medium, 5 files, `75–120` phút agent runtime.

### Task 10: Chứng minh lazy load, virtualization và detail reuse

**Mô tả:** Thêm focused media gate rồi đo runtime thật với `109` card, sáu filter,
sáu detail route và synthetic `3.000` card.

**Acceptance criteria:**

- [x] Direct/Barba/locale/filter round-trip render đúng `109` card; image request
  chỉ xuất hiện khi card gần viewport; network path đều `200`.
- [x] DOM bounded, focused card không unmount; synthetic window `2800–2820`,
  pendingScroll, append prefix và filter morph vẫn pass.
- [x] Sáu detail route chỉ dùng ảnh trong category pool; actual natural dimensions
  khớp manifest, alt VI/EN và không literal HTML leak.

**Verification:**

- [x] `$env:TT_E2E_ADVERTISING_MEDIA_ONLY='1'; pnpm qa:site`
- [x] `$env:TT_E2E_ADVERTISING_3K_ONLY='1'; pnpm qa:site`
- [x] Chạy focused `GRID`, `DEFAULT`, `LOCALE_LIFECYCLE`, `HISTORY`,
  `RAPID_FILTER`, `REDUCED`; sau đó full `pnpm qa:site` một lần và báo trung thực.
- [x] Chrome DevTools: stepped scroll, DOM count, image requests, console,
  accessibility tree và screenshot `390/1440/1920px`.

**Dependencies:** Task 9 và Task 6.

**Files likely touched:**

- `tests/site/site.e2e.cjs`
- `tests/README.md`

**Estimated scope:** Small, 2 files, `90–150` phút agent runtime.

### Task 11: Current-hash evidence và live docs

**Mô tả:** Ghi evidence sau QA, cập nhật live spec/guide/STATE theo runtime thật;
không rewrite report baseline `72/20/16`.

**Acceptance criteria:**

- [x] Report mới ghi command/result, source/test/artifact hash, media count,
  contact-sheet review, Playwright và DevTools evidence; failure còn lại nêu rõ.
- [x] Spec, content guide và STATE bỏ nhãn target chưa triển khai, trỏ report mới;
  reports index phân biệt baseline với current-hash.
- [x] Main agent inspect diff; code-reviewer, test-engineer và web performance
  review độc lập; `ponytail-review` chạy trước mọi commit/push nếu có.

**Verification:**

- [x] Local Markdown links, glossary, trailing whitespace và no-emoji pass.
- [x] `pnpm qa:static` và focused Advertising gates cuối cùng pass cùng hash.
- [x] Không gọi release/full-suite PASS nếu full runner còn failure ngoài scope.

**Dependencies:** Task 10.

**Files likely touched:**

- `docs/archive/reports/verification-advertising-products-109-media-spacing-2026-09-01.md`
- `docs/reports/index.md`
- `docs/specs/advertising-products-turnkey-services.md`
- `docs/design/content.md`
- `docs/STATE.md`

**Estimated scope:** Medium, 5 files, `60–90` phút agent runtime.

### Checkpoint 5: Delta hoàn tất

- [x] Acceptance của accepted spec đạt đủ; Definition of Done pass.
- [x] Runtime, generated artifact, tests và evidence cùng current hash.
- [x] Không stage/commit/deploy/Notion/Wrangler ngoài quyền đã cấp.

### Rủi ro delta và mitigation

| Rủi ro | Mức | Mitigation |
| --- | --- | --- |
| `109` call vượt quota hoặc nhiều output lỗi | Cao | Sub-batch tối đa 5; review rồi mới mở batch kế; checkpoint có thể resume. |
| Ảnh khác file nhưng cùng cảnh/crop | Cao | Unique `sourceId`, contact sheet category, human review; không dùng filename/hash làm bằng chứng duy nhất. |
| Media manifest làm thay taxonomy detail | Cao | Giữ `products` riêng; manifest chỉ sở hữu grid media và detail gallery selection. |
| Geometry CSS/JS lệch ở boundary | Cao | Một pure core, exact matrix `-1/0/+1px`, DevTools computed measurement. |
| Asset pool làm tăng tải ban đầu | Cao | Bounded DOM, LazySizes, intrinsic reserve; stepped-scroll network gate. |

### Rollback delta

Revert atomic geometry source/test set nếu Task 5–6 fail. Media asset sub-batch
chưa nối runtime có thể bỏ riêng mà không ảnh hưởng baseline. Sau Task 9, rollback
phải revert cùng manifest/catalog/artifact version/tests rồi chạy lại
`pnpm prepare:site`; không giữ runtime và artifact khác schema.

### Human gate delta

Owner đã trả lời `duyệt plan` ngày `2026-09-01`; Task 5–11 và built-in imagegen
được phép chạy trong boundary đã ghi. Quyền này không tự cấp quyền update
Notion, commit, push, deploy hoặc bật Wrangler.

### Delta media fade Espacio khi scrollbar jump

#### Mục tiêu

Thực thi phần [Media entrance và interaction](../../docs/specs/advertising-products-turnkey-services.md#media-entrance-và-interaction)
đã được owner duyệt: trên fresh VI/EN Advertising Products route, ảnh của card
chưa unveil fade `opacity 0 → 1` trong `0.6s ease-out` khi user nhảy scrollbar
tới vùng đó. Ảnh đã load hoặc virtual-remount không replay; card shell, caption,
Masonry position morph, filter và sáu editorial detail route giữ nguyên.

Task list của delta này tiếp tục nằm trong `tasks/plan.md` để không tạo tracker
thứ hai cho plan hiện có. Không cần Notion card vì dự kiến dưới `200 LOC`
source/test viết tay.

#### Dependency graph

```text
Fresh-route browser regression
    |
    +-- root-cause tại media reveal/lazy lifecycle
            |
            +-- minimal shared parent-grid fix
                    |
                    +-- runtime parity + current-hash evidence
```

### Task 12: Khóa regression cho one-shot media entrance — hoàn tất

**Description:** Thêm probe browser xác định đúng bug trước khi sửa: fresh VI/EN
route, nhảy từ vùng card đầu tới card chưa unveil, đo transition ảnh; sau đó cuộn
ra/quay lại để chứng minh không replay. Probe tách opacity ảnh khỏi shell/caption
và có reduced-motion case. Target image được delay `180ms` trong fresh browser
context; probe chờ LazySizes thật và kiểm tra `currentSrc`, `complete`,
`naturalWidth`, không phát event giả.

**Acceptance criteria:**

- [x] Probe được chạy trước mọi source edit. Current source không tạo RED hợp lệ:
      card đích có intermediate image opacity và phát media transition đúng.
- [x] Test chỉ quan sát card chưa unveil trong fresh document; không biến cached
      virtual-remount thành entrance mới.
- [x] Shell/caption luôn `opacity: 1`; reduced motion yêu cầu final state tức thì.

**Verification:**

- [x] Focused Advertising E2E tổng hợp đạt `10/10`: VI/EN normal/reduced,
      Home → Advertising Products, Advertising Products → Home → Advertising
      Products, Back/Forward, desktop/mobile và delayed network; không có
      failure sản phẩm để biện minh source patch.
- [x] `node --check tests/site/site.e2e.cjs`.

**Dependencies:** Spec đã duyệt.

**Files likely touched:**

- `tests/site/site.e2e.cjs`

**Estimated scope:** Small, 1 file, `15–25` phút agent runtime.

**Outcome:** regression guard chỉ chờ event LazySizes thật và asset decode hợp
lệ; không có MutationObserver hoặc synthetic `lazyloaded`. Current runtime vẫn
tạo transition hợp lệ, nên Task 13 không được phép thêm source diff suy đoán.

### Task 13: Shared parent-grid runtime — không cần source delta

**Description:** Chỉ sửa boundary giữa virtual mount, LazySizes `lazyloaded` và
ready class nếu Task 12 có RED đáng tin cậy. Task 12 và human-path runtime đều
green trên current source, vì vậy giữ nguyên `catalog-runtime.mjs` và CSS; không
thêm IntersectionObserver, motion engine hoặc dependency mới.

**Acceptance criteria:**

- [x] Fresh unseen card phát image-only `0.6s ease-out` transition và settle ở
      `opacity: 1`, kể cả scrollbar jump sâu.
- [x] Ảnh đã load/remount không replay; skipped offscreen card không mount chỉ để
      animate; DOM virtualization bound không đổi.
- [x] Position morph `0.4s`, hover, filter, layout và detail galleries không đổi.

**Verification:**

- [x] Focused Task 12 regression tổng hợp pass `10/10`; media VI/EN
      normal/reduced và route lifecycle desktop/mobile/slow-network đều sạch.
- [x] `node --test tests/site/advertising-products-lifecycle.test.mjs tests/site/advertising-products-static.test.mjs` đạt `2/2`.
- [x] `pnpm prepare:site && pnpm qa:static`.

**Dependencies:** Task 12.

**Files likely touched:**

- `src/site/advertising-products/catalog-runtime.mjs`
- `src/site/detail.css` chỉ khi test chứng minh CSS contract sai
- `tests/site/site.e2e.cjs`

**Estimated scope:** Medium, 2–3 files, `25–40` phút agent runtime.

### Checkpoint 6: Behavior và boundary

- [x] Regression guard green; không có RED nên source diff nhỏ nhất là không đổi.
- [x] Không có dependency mới, card-shell entrance, exit motion hoặc replay.
- [x] Main agent inspect test delta; reviewer kiểm tra correctness và virtualization.

### Task 14: Runtime parity, detector và live evidence

**Description:** Đo fresh VI/EN route trong browser, chạy Impeccable detector một
lần sau UI hoàn tất, rồi cập nhật evidence/STATE theo current hash. Scoped pass
không được đổi full Espacio parity `NOT PASS` thành pass.

**Acceptance criteria:**

- [x] Browser bắt được intermediate image opacity trên unseen deep card; reverse
      scroll không replay; reduced motion hiện final state ngay.
- [x] Console/network sạch, DOM bounded, không horizontal overflow hoặc CLS mới.
- [x] Live spec, report và `docs/STATE.md` khớp source/test/runtime current hash.

**Verification:**

- [x] Focused Advertising E2E và Node/static gates pass cùng source hash.
- [x] Chrome DevTools kiểm tra normal scrollbar jump; focused Playwright kiểm tra
      normal và reduced motion.
- [x] Impeccable detector chạy một lần trên target UI hiện hành.

**Dependencies:** Checkpoint 6.

**Files likely touched:**

- `docs/archive/reports/verification-advertising-products-media-entrance-2026-09-01.md`
- `docs/STATE.md`
- `docs/specs/advertising-products-turnkey-services.md` chỉ khi evidence yêu cầu
  chỉnh wording, không đổi intent đã duyệt

**Estimated scope:** Medium, 2–3 files, `20–35` phút agent runtime.

### Human gate media entrance

Owner đã trả lời `duyệt plan` ngày `2026-09-01`; Task 12–14 được phép chạy trong
boundary trên. Approval không cấp quyền update Notion, commit, push, deploy, bật
Wrangler hoặc thay motion/layout ngoài accepted spec.

### Delta media replay và detail visibility

#### Mục tiêu

Thực thi hai capability trong
[live spec Advertising](../../docs/specs/advertising-products-turnkey-services.md#media-entrance-và-interaction):
media card replay fade sau mỗi lần rời hoàn toàn rồi tái vào viewport; ảnh hero
và gallery của sáu route chi tiết luôn đạt final visible state sau load. Delta
này thay riêng clause one-shot của Task 12–14; evidence lịch sử của các task đó
không bị viết lại thành evidence cho behavior mới.

Task list tiếp tục nằm trong `tasks/plan.md`; không tạo `tasks/todo.md` hoặc
tracker thứ hai. Ước tính dưới `200 LOC` source/test viết tay nên không tạo hoặc
update Notion card trong phase plan.

#### Dependency graph

```text
Task 15: regression RED cho hai capability
    |
    +-- Task 16: root-grid media re-entry
    |
    +-- Task 17: detail media visibility
            |
            +-- Checkpoint 7
                    |
                    +-- Task 18: runtime QA, review và live docs
```

#### Quyết định triển khai

- Tái dùng CSS transition `0.6s ease-out`, LazySizes, stable card id và bounded
  virtualization hiện có; không thêm dependency hoặc motion engine.
- Một `IntersectionObserver` thuộc lifecycle của catalog mount sở hữu re-arm;
  cleanup phải disconnect cùng runtime. Không tạo observer riêng cho từng card.
- Xóa module-level `revealedCards` one-shot. Stable state chỉ phân biệt card đang
  visible và card đã rời hoàn toàn; cached image/remount vẫn replay.
- Fix detail ở shared template trên load-capable media node. Không mở rộng
  `detail.js` nếu RED không chứng minh shared runtime cũng sai.
- Không đổi Masonry position morph, geometry, gap, caption, copy, asset, detail
  layout hoặc editorial motion.

### Task 15: Khóa regression RED cho media replay và detail visibility

**Description:** Sửa focused tests trước source edit. Root-grid probe đo lần vào
đầu, hai lần full-exit/re-entry, partial visibility, cached image, virtual
remount và reduced motion. Detail probe duyệt sáu slug VI/EN qua direct load và
Barba/Back/Forward, kiểm tra media load thật lẫn computed visibility.

**Acceptance criteria:**

- [x] Current source tạo RED đúng: root grid chỉ fade một lần vì
      `revealedCards`; detail hero có media loaded nhưng wrapper còn
      `opacity: 0`, còn gallery tiếp tục có assertion visibility riêng.
- [x] Probe dùng `transitionrun/start/end`, IntersectionObserver state,
      `currentSrc`, `complete`, `naturalWidth` và computed opacity; không phát
      event giả hoặc chỉ dựa timeout.
- [x] Shell/caption luôn `opacity: 1`; partial visibility không replay; reduced
      motion không phát transition.

**Verification:**

- [x] `node --check tests/site/site.e2e.cjs`.
- [x] `node --test tests/site/advertising-products-lifecycle.test.mjs tests/site/advertising-products-detail-routes.test.mjs` ghi expected RED trước source fix.
- [x] `$env:TT_E2E_ADVERTISING_MEDIA_ENTRANCE_ONLY='1'; pnpm qa:site` và
      `$env:TT_E2E_ADVERTISING_MEDIA_ONLY='1'; pnpm qa:site` ghi expected RED.

**Dependencies:** Spec đã duyệt.

**Files likely touched:**

- `tests/site/advertising-products-lifecycle.test.mjs`
- `tests/site/advertising-products-detail-routes.test.mjs`
- `tests/site/site.e2e.cjs`

**Estimated scope:** Medium, 3 files, `35–50` phút agent runtime.

### Task 16: Triển khai root-grid media re-entry

**Description:** Thay one-shot set bằng một observer/state lifecycle trong
`catalog-runtime.mjs`. Media chỉ re-arm khi ratio bằng `0`; lần vào tiếp theo
reset rồi replay composition foreground/backplate. Lazy load, cached image và
virtual remount dùng cùng path; reduced motion bỏ observer/replay.

**Acceptance criteria:**

- [x] Lần vào đầu và mọi lần tái vào sau full exit đều fade `0 → 1` trong
      `0.6s ease-out`; cuộn nhỏ khi còn intersect không restart.
- [x] Cached image và virtual remount replay; skipped offscreen card không mount;
      DOM, focus retention và overscan bound không đổi.
- [x] Shell/caption, hover, filter morph `0.4s`, resize và Masonry geometry giữ
      nguyên; cleanup observer idempotent.

**Verification:**

- [x] `node --check src/site/advertising-products/catalog-runtime.mjs`.
- [x] `node --test tests/site/advertising-products-lifecycle.test.mjs tests/site/advertising-products-layout.test.mjs`.
- [x] Focused media-entrance E2E Task 15 chuyển RED thành green ở VI/EN normal,
      reduced, desktop/mobile, cached/remount.

**Dependencies:** Task 15 có RED đúng.

**Files likely touched:**

- `src/site/advertising-products/catalog-runtime.mjs`
- `tests/site/advertising-products-lifecycle.test.mjs` chỉ chỉnh nếu static
  contract cần khớp implementation tối thiểu

**Estimated scope:** Small, 1–2 files, `30–45` phút agent runtime.

### Task 17: Sửa visibility media ở shared detail template

**Description:** Đặt motion readiness hook lên node ảnh có media lifecycle trong
shared Advertising detail template. Giữ `detail.js` và `detail.css` nếu thay đổi
template đủ làm toàn bộ sáu slug VI/EN đạt visible state.

**Acceptance criteria:**

- [x] Sáu slug VI/EN pass direct load, Barba và Back/Forward: hero/gallery có
      `currentSrc`, `complete`, `naturalWidth > 0`, final opacity `1`.
- [x] Không còn route nền trắng do wrapper chờ `load`; hero/gallery vẫn chạy
      editorial motion hiện có.
- [x] Không đổi layout, crop, copy, asset, gallery interaction hoặc shared motion
      behavior của Residential/Commercial/About.

**Verification:**

- [x] `node --test tests/site/advertising-products-detail-routes.test.mjs`.
- [x] `pnpm prepare:site && pnpm qa:static`.
- [x] Focused detail browser probe Task 15 chuyển RED thành green; console/network
      sạch.

**Dependencies:** Task 15 có RED đúng. Độc lập với Task 16 sau RED gate.

**Files likely touched:**

- `src/site/advertising-products/detail-template.html`
- `src/site/detail.js` chỉ khi RED chứng minh template-only không đủ

**Estimated scope:** Small, 1–2 files, `15–25` phút agent runtime.

### Checkpoint 7: Behavior và boundary

- [x] Task 15 RED trước source; Task 16–17 chuyển đúng failure sang green.
- [x] Focused Node/static/browser gates pass; không dependency hoặc CSS mới.
- [x] Main agent inspect diff; không sửa source ngoài file được RED chứng minh.

### Task 18: Runtime QA, review và live docs

**Description:** Chạy focused current-hash matrix, DevTools spot-check và
Impeccable detector sau UI edit. Review correctness/complexity, ghi report mới,
rồi đồng bộ live spec và STATE; không sửa report one-shot lịch sử.

**Acceptance criteria:**

- [x] Root media replay đủ ba entry cycle; partial/reduced cases đúng; DOM bounded,
      CLS/overflow không tăng và filter/resize motion giữ nguyên.
- [x] Detail media hiện ở cả sáu slug VI/EN qua direct/Barba; console/network sạch.
- [x] Report mới, live spec, plan và STATE khớp source/test/runtime current hash;
      full Espacio parity vẫn `NOT PASS` nếu không có evidence đầy đủ.

**Verification:**

- [x] Focused Node suites, `pnpm prepare:site`, `pnpm qa:static` và hai focused
      Advertising E2E commands pass cùng source hash.
- [x] Chrome DevTools spot-check desktop/mobile cho repeated scrollbar/M3 và
      route detail; Impeccable detector chạy trên target UI đã sửa.
- [x] `git diff --check`; no-emoji; local Markdown links; `ponytail-review` trước
      commit nếu sau này owner yêu cầu commit.

**Dependencies:** Checkpoint 7.

**Files likely touched:**

- `docs/archive/reports/verification-advertising-products-media-reentry-detail-visibility-2026-09-01.md`
- `docs/specs/advertising-products-turnkey-services.md`
- `docs/STATE.md`
- `tasks/plan.md`

**Estimated scope:** Medium, 4 Markdown files, `25–40` phút agent runtime.

### Rủi ro và rollback delta replay

- Observer churn có thể phá virtualization: dùng một observer/lifecycle, unobserve
  trước remove và disconnect trong cleanup; probe DOM bound bắt regression.
- Cached image có thể bỏ lỡ `lazyloaded`: dùng readiness thật
  (`complete && naturalWidth > 0`) cùng load event; browser test cover cả hai.
- Detail fix có thể lan sang route khác: ưu tiên sửa shared Advertising template,
  không generalize bridge nếu template-only pass.
- Rollback gồm revert atomic runtime/test delta và template hook; generated
  `.site-output` luôn rebuild, không edit hoặc commit trực tiếp.

### Human gate media replay và detail visibility

Owner đã trả lời `duyệt plan` ngày `2026-09-01`; Task 15–18 được phép chạy.
Approval không cấp quyền update Notion, commit, push, deploy, bật Wrangler hoặc
đổi Masonry/layout/motion ngoài accepted spec.

### Delta gallery visibility trên sáu trang con Advertising Products

#### Mục tiêu và boundary

Sửa lỗi gallery đã tải ảnh nhưng `figure` cha vẫn `opacity: 0`. Phạm vi chỉ gồm
sáu route con Advertising Products, VI/EN. Hero và gallery dùng media lifecycle
theo node ảnh; gallery giữ ratio và placeholder trung tính, fade một lần sau
load, không replay khi tái vào viewport.

Không đổi root Pinterest grid, root-card replay, Home, Residential, Commercial,
copy, asset, crop, gallery geometry, section gap, Wrangler, CMS hoặc dependency.
Ước lượng source/test viết tay `45–90 LOC`, dưới ngưỡng tạo Notion card `200 LOC`.

#### Dependency graph

```text
Task 19: regression RED cho ancestor/error/one-shot
    |
    v
Task 20: sửa shared gallery markup và scoped error state
    |
    v
Checkpoint 8: focused behavior green
    |
    v
Task 21: runtime QA, review, evidence và live docs
```

#### Quyết định triển khai

- `figure.advertising-detail__gallery-item` sở hữu ratio, overflow và nền
  placeholder `#e9e6df`; wrapper không nhận motion opacity.
- `img` sở hữu `data-motion-media`, LazySizes readiness và fade
  `0.6s ease-out`. Ready/error là one-shot; viewport re-entry không replay.
- Generator là owner của shared markup cho cả sáu slug. `detail.js` và
  `detail.css` chỉ nhận scoped error state nếu RED chứng minh markup-only chưa
  đạt placeholder contract; không thêm thư viện hoặc motion engine.
- Generated `.site-output` chỉ rebuild bằng `pnpm prepare:site`, không edit hoặc
  stage trực tiếp.

### Task 19: Khóa regression RED cho gallery ancestor và media error

**Description:** Mở rộng focused static/browser tests trước source edit. Test
phải bắt đúng lỗi hiện tại: ảnh đã load nhưng ancestor còn opacity `0`; đồng thời
khóa one-shot fade, placeholder lỗi và geometry ổn định.

**Acceptance criteria:**

- [x] Current source tạo RED vì gallery đặt `data-motion-media` trên `figure`;
      assertion kiểm tra node ảnh và toàn bộ ancestor, không chỉ opacity `<img>`.
- [x] Probe quan sát opacity trung gian rồi final trong `0.6s ease-out`, sau
      full exit/re-entry không phát transition lần hai trên route chi tiết.
- [x] Request ảnh gallery bị chặn có placeholder trung tính, box không collapse,
      block sau không đổi vị trí và không có unhandled console error.

**Verification:**

- [x] `node --check tests/site/site.e2e.cjs`.
- [x] `node --test tests/site/advertising-products-detail-routes.test.mjs` ghi
      expected RED trước source fix.
- [x] `$env:BASE_URL='http://127.0.0.1:8787';
      $env:TT_E2E_ADVERTISING_MEDIA_ONLY='1'; pnpm qa:site` ghi expected RED.

**Dependencies:** Spec delta đã owner duyệt.

**Files likely touched:**

- `tests/site/advertising-products-detail-routes.test.mjs`
- `tests/site/site.e2e.cjs`

**Estimated scope:** Small, 2 files, `25–40` phút agent runtime.

### Task 20: Sửa shared gallery media lifecycle

**Description:** Chuyển motion target từ gallery wrapper sang chính node ảnh
trong generator chung. Chỉ thêm scoped error state nếu test Task 19 yêu cầu để
placeholder đạt final state rõ ràng.

**Acceptance criteria:**

- [x] Cả sáu slug VI/EN sinh `figure` luôn visible và `img[data-motion-media]`;
      ảnh ready/in-view fade một lần rồi giữ opacity `1`.
- [x] Ảnh load chậm hoặc lỗi giữ nguyên ratio và hiện nền placeholder trung tính;
      reduced motion hiện ảnh/placeholder tức thì.
- [x] Không đổi hero, layout, crop, copy, asset, root grid hoặc motion của route
      ngoài Advertising detail.

**Verification:**

- [x] Task 19 chuyển từ RED sang green.
- [x] `node --test tests/site/advertising-products-detail-routes.test.mjs`.
- [x] `pnpm prepare:site && pnpm qa:static`.

**Dependencies:** Task 19 có RED đúng.

**Files likely touched:**

- `scripts/site/prepare-static-assets.mjs`
- `src/site/detail.js` chỉ nếu cần error state rõ ràng
- `src/site/detail.css` chỉ nếu cần error-state selector

**Estimated scope:** Small, 1–3 files, `20–35` phút agent runtime.

### Checkpoint 8: Behavior và boundary

- [x] RED trước source và green sau đúng cùng failure.
- [x] Sáu slug VI/EN không còn ancestor opacity `0`; error placeholder không
      collapse; direct/Barba/Back-Forward pass.
- [x] Main agent inspect diff; không thay root grid hoặc route ngoài scope.

### Task 21: Runtime QA, review và live evidence

**Description:** Chạy scoped current-hash QA, kiểm tra human path bằng In-app
Browser, đo lặp lại bằng Playwright và đọc DOM/computed/network/console bằng
DevTools. Sau review, cập nhật report mới, live spec, plan và STATE.

**Acceptance criteria:**

- [x] Desktop/mobile, VI/EN, direct/Barba/Back-Forward và network error đạt
      contract; không blank gallery, CLS mới hoặc console/network lỗi ngoài
      fixture cố ý.
- [x] Impeccable detector, correctness review và Ponytail review không còn finding
      scoped chưa xử lý; không gọi full Espacio parity PASS.
- [x] Report mới ghi current hash và giới hạn evidence; spec/plan/STATE khớp
      runtime, report cũ giữ lịch sử.

**Verification:**

- [x] Focused Node suite, `pnpm prepare:site`, `pnpm qa:static` và focused
      Advertising media E2E cùng pass.
- [x] Browser/Playwright/runtime logs kiểm tra một hero và cả hai gallery item trên
      route đại diện, rồi matrix tự động duyệt đủ sáu slug VI/EN.
- [x] `git diff --check`, no-emoji, local Markdown links; không stage, commit,
      push, deploy, update Notion hoặc bật Wrangler.

**Dependencies:** Checkpoint 8.

**Files likely touched:**

- `docs/reports/verification-advertising-detail-gallery-visibility-2026-09-01.md`
- `docs/specs/advertising-products-turnkey-services.md`
- `docs/STATE.md`
- `tasks/plan.md`
- `tasks/todo.md`

**Estimated scope:** Medium, 5 Markdown files, `30–45` phút agent runtime.

### Human gate gallery visibility

Owner đã trả lời `duyệt plan` ngày `2026-09-01`; Task 19–21 hoàn tất scoped
current-hash ngày `2026-09-02`. Approval không cấp quyền update Notion, commit,
push, deploy, bật Wrangler hoặc mở rộng sang root grid và route khác.

### Delta sáu composition và đủ `109` media trên route chi tiết

- Status: spec và plan được owner duyệt ngày `2026-09-02`; Task 22–25 đã hoàn
  tất scoped current-hash cùng ngày.
- Canonical spec: [Ba mảng dịch vụ và Sản phẩm quảng cáo](../../docs/specs/advertising-products-turnkey-services.md#template-chi-tiết-và-media).
- Canonical decision: [Shared detail component family](../../docs/decisions/shared-advertising-product-detail-template.md).
- Estimate handwritten source/test delta: `350–550 LOC`, khoảng `3–4` giờ agent
  runtime gồm scoped QA; không thêm dependency hoặc asset.
- Existing Notion URL nằm trong spec; task này không tự update Notion.

#### Dependency graph

```text
Task 22: RED composition và media partition
    |
Task 23: data config và shared block renderer
    |
Task 24: responsive layout và focused browser regression
    |
Checkpoint 9
    |
Task 25: three-way QA, review và live docs
```

Chuỗi phải chạy tuần tự vì Task 23 định nghĩa markup contract mà CSS và browser
assertion của Task 24 tiêu thụ. Không mở parallel implementation lane trên cùng
generator hoặc test runner.

#### Quyết định triển khai

1. `catalog.mjs` sở hữu sáu config gồm `layoutKey`, `heroSourceId` và ordered
   section `kind/sourceIds`; không tạo data store thứ hai.
2. Build validator fail closed nếu layout trùng, block sequence sai, media thiếu,
   lặp hoặc cross-category. Không dùng random hoặc ratio algorithm để tự chọn
   composition.
3. `prepare-static-assets.mjs` render block từ shared helper; template HTML chỉ
   giữ semantic shell và placeholder slot. Không sao chép sáu template.
4. Giữ media hook trên `img`, hero eager/high-priority, body lazy/async. Max
   `24` media/route nên không thêm virtualization cho trang chi tiết.
5. CSS scope dưới `.advertising-detail`; không đổi parent grid, header/footer,
   typography global, motion engine, CMS, Wrangler hoặc deploy.

### Task 22: Khóa RED cho sáu composition và media partition

**Description:** Mở rộng focused Node contracts trước source change. Test phải
đọc config và generated route để chứng minh sáu sequence khác nhau, toàn bộ
`109` source được dùng đúng một lần và loading/motion attributes đúng vai trò.

**Acceptance criteria:**

- [x] RED vì current catalog chưa có sáu `layoutKey`/sequence và generator chỉ
      render `1` hero cùng `2` gallery image mỗi route.
- [x] Contract yêu cầu count `24/16/22/13/18/16`, hero thuộc partition, union
      `109`, không duplicate/cross-category và đủ `12` product label mỗi nhóm.
- [x] Generated HTML assertion khóa block order, hero high priority, body lazy,
      `img[data-motion-media]`, width/height và VI/EN alt/caption.

**Verification:**

- [x] `node --test tests/site/advertising-products-detail-routes.test.mjs tests/site/advertising-products-media.test.mjs` ghi expected RED.
- [x] Main agent xác nhận failure do capability mới thiếu, không do fixture hoặc
      baseline hỏng.

**Dependencies:** Spec đã duyệt.

**Files likely touched:**

- `tests/site/advertising-products-detail-routes.test.mjs`
- `tests/site/advertising-products-media.test.mjs`

**Estimated scope:** Small, 2 files, `30–45` phút agent runtime.

### Task 23: Triển khai config và shared block renderer

**Description:** Thêm sáu composition config vào catalog hiện có, validator
partition và renderer dùng chung cho hero, titular, paragraph, facts, gallery,
single, double, columns, banner và actions. Dùng chính pool `109` hiện tại.

**Acceptance criteria:**

- [x] Sáu config khớp exact sequence/spec và tham chiếu rõ mọi source trong đúng
      category; build fail closed khi config sai.
- [x] Sáu route VI/EN sinh tổng `109` editorial media, mỗi source đúng một lần;
      hero không lặp trong body và không có gallery pool riêng.
- [x] Current gallery visibility fix còn nguyên: wrapper visible, motion target
      trên ảnh, placeholder giữ geometry; Task 22 chuyển green.

**Verification:**

- [x] `node --test tests/site/advertising-products-detail-routes.test.mjs tests/site/advertising-products-media.test.mjs`.
- [x] `pnpm prepare:site`.
- [x] `pnpm qa:static`.

**Dependencies:** Task 22 có RED đúng.

**Files likely touched:**

- `src/site/advertising-products/catalog.mjs`
- `src/site/advertising-products/detail-template.html`
- `scripts/site/prepare-static-assets.mjs`

**Estimated scope:** Medium, 3 files, `60–90` phút agent runtime.

### Task 24: Hoàn thiện responsive composition và browser regression

**Description:** Thêm scoped style cho block family cùng responsive collapse;
mở rộng focused Advertising media browser lane để đo sáu route ở desktop/mobile,
VI/EN, direct/Barba và lazy-load path.

**Acceptance criteria:**

- [x] Sáu route nhìn khác nhau theo block order đã duyệt; gallery/single/double/
      banner/columns giữ nhịp Espacio nhưng dùng visual language Trường Thịnh.
- [x] Tại `390x844` và `1440x900`: đủ media, không overflow/collapse/ancestor
      opacity, CTA truy cập bằng bàn phím; body image chỉ request khi gần viewport.
- [x] One-shot media fade, reduced motion, error placeholder, VI/EN và route
      transition giữ contract hiện có; parent Pinterest grid không đổi.

**Verification:**

- [x] `BASE_URL=http://127.0.0.1:8787 TT_E2E_ADVERTISING_MEDIA_ONLY=1 pnpm qa:site`.
- [x] Screenshot/DOM/computed/network/console matrix đủ sáu slug tại hai viewport.
- [x] `pnpm qa:static` và focused Node suites tiếp tục pass.

**Dependencies:** Task 23 green.

**Files likely touched:**

- `src/site/detail.css`
- `tests/site/site.e2e.cjs`

**Estimated scope:** Medium, 2 files, `60–90` phút agent runtime.

### Checkpoint 9: Shared family và route boundary

- [x] Task 22 RED trước source, Task 23–24 green sau source.
- [x] Sáu layout key/sequence khác nhau; media partition đúng `109` và DOM không
      chứa ảnh ngoài category trên route chi tiết.
- [x] Main agent inspect toàn bộ diff; không có source delta ngoài five-file
      implementation/test boundary đã duyệt.

### Task 25: Three-way QA, review và live evidence

**Description:** So sánh selected live Espacio, archive và local implementation;
chạy scoped detector/review, ghi current-hash report rồi đồng bộ spec, STATE,
plan và todo. Không gọi full Espacio parity PASS.

**Acceptance criteria:**

- [x] In-app Browser kiểm tra human path; Playwright đo lặp; DevTools đọc DOM,
      computed style, network, console và screenshot cho sáu route VI/EN.
- [x] Impeccable detector, correctness review và Ponytail review không còn finding
      scoped chưa xử lý; mọi limitation được ghi rõ.
- [x] Report current-hash liên kết live reference/archive/local evidence; spec,
      STATE, plan và todo khớp runtime đã quan sát.

**Verification:**

- [x] Focused Node, `pnpm prepare:site`, `pnpm qa:static` và Advertising media
      browser lane cùng pass.
- [x] `git diff --check`, no-emoji và local Markdown links pass.
- [x] Không stage, commit, push, deploy, update Notion hoặc bật Wrangler.

**Dependencies:** Checkpoint 9.

**Files likely touched:**

- `docs/archive/reports/verification-advertising-detail-compositions-109-media-2026-09-02.md`
- `docs/specs/advertising-products-turnkey-services.md`
- `docs/STATE.md`
- `tasks/plan.md`
- `tasks/todo.md`

**Estimated scope:** Medium, 5 Markdown files, `45–60` phút agent runtime.

### Rủi ro và rollback delta sáu composition

| Rủi ro | Mức | Mitigation |
| --- | --- | --- |
| Gallery dài `12–16` ảnh tải quá sớm | Cao | Hero eager; body lazy; network assertion chỉ request media gần viewport |
| Renderer giữ wrapper ở opacity `0` | Cao | Reuse image-owned hook; ancestor-opacity regression trên mọi block kind |
| Config bỏ sót hoặc lặp source | Cao | Fail-closed set equality theo category trước khi render |
| CSS block mới lan sang route khác | Trung bình | Scope `.advertising-detail`; screenshot và selector boundary test |
| Responsive derivative chưa có | Trung bình | Giữ WebP hiện tại; ghi limitation CMS phase, không tạo pipeline ảnh thứ hai |

Rollback gồm revert atomic Task 22–24 source/test delta và build lại static
output. Pool `109`, parent grid, taxonomy và asset không migration nên không cần
data rollback.

### Human gate sáu composition

Owner đã trả lời `duyệt plan` ngày `2026-09-02`; Task 22–25 hoàn tất trong
boundary trên. Approval không cấp quyền update Notion, commit, push, deploy,
bật Wrangler, tạo ảnh mới hoặc sửa root Pinterest grid.

### Delta carousel ngang cho mọi block gallery

- Status: owner duyệt spec/plan ngày `2026-09-02`; Task 26–29 hoàn tất scoped
  current-hash, human acceptance cuối còn mở.
- Canonical spec: [Ba mảng dịch vụ và Sản phẩm quảng cáo](../../docs/specs/advertising-products-turnkey-services.md#template-chi-tiết-và-media).
- Existing work card: URL Notion đã ghi trong frontmatter của live spec; không
  tạo card thứ hai hoặc tự update Notion.
- Boundary: chỉ các block `gallery` trên sáu route con Advertising Products,
  VI/EN. Không đổi parent Pinterest grid, `single`/`double`/`banner`, copy,
  taxonomy, pool `109`, Residential, Commercial, CMS, Wrangler hoặc deploy.
- Estimated source/test delta: `250–400 LOC`, `2.5–3.5` giờ agent runtime.

#### Dependency graph

```text
Task 26: RED contract
    |
    v
Task 27: vendor + progressive markup
    |
    v
Task 28: scoped lifecycle + geometry + browser behavior
    |
    v
Checkpoint 10
    |
    v
Task 29: three-way QA, review và live docs
```

Chuỗi chạy tuần tự vì markup và fallback của Task 27 là contract DOM cho
lifecycle/CSS ở Task 28. Không sửa source trước khi Task 26 RED đúng nguyên nhân.

#### Quyết định triển khai

- Dùng `swiper@14.2.0`, chỉ phát module horizontal core, mousewheel, pagination
  và accessibility; không bundle navigation, autoplay, loop, effect hoặc virtual.
- Renderer dùng một markup progressive duy nhất. Trước khi Swiper hydrate hoặc
  khi asset lỗi, cùng markup là native horizontal scroll-snap; không có renderer
  grid/carousel song song.
- Chiều cao `50vw` desktop và `75vw` mobile là maximum. Slide thường lấy width
  theo intrinsic ratio và có next-slide peek. Slide siêu rộng cap usable width,
  hạ height theo tỷ lệ, không crop/stretch/backplate và không bắt buộc peek.
- Swiper và wrapper auto-height chỉ mount trong `.advertising-detail`; một
  readiness promise dùng cho direct, Barba, Back/Forward và locale swap. Mỗi
  instance destroy idempotent khi unmount.

### Task 26: Khóa regression RED cho carousel, fallback và box integrity

**Description:** Viết static/lifecycle/browser contract bắt lỗi grid stretch
hiện tại và khóa số carousel, geometry, dependency failure cùng route boundary
trước source edit.

**Acceptance criteria:**

- [x] Current source RED vì vẫn render static gallery grid và figure bị stretch
      cao hơn ảnh; test dùng loaded image có `naturalWidth > 0` để phân biệt với
      lỗi tải media.
- [x] Sáu route VI/EN yêu cầu đúng `1/3/1/2/1/1` carousel, mỗi instance ít nhất
      hai slide, union media vẫn đúng `109`, caption/dots đủ và không raw markup.
- [x] Contract khóa outer band `35/25/15px`, gap `20/10px`, max height
      `50vw/75vw`, slide thường peek và slide siêu rộng cap width không peek,
      không crop/stretch/backplate/blank box.
- [x] Asset bị chặn vẫn native scroll-snap dùng được; route ngoài Advertising
      không nhận Swiper markup, asset hoặc lifecycle.

**Verification:**

- [x] `node --test tests/site/advertising-products-detail-routes.test.mjs`
- [x] Focused lifecycle test mới trong
      `tests/site/advertising-products-lifecycle.test.mjs` RED đúng assertion.
- [x] Focused Playwright case trong `tests/site/site.e2e.cjs` RED đúng geometry.

**Dependencies:** Live spec `accepted`, plan owner-approved.

**Files likely touched:**

- `tests/site/advertising-products-detail-routes.test.mjs`
- `tests/site/advertising-products-lifecycle.test.mjs`
- `tests/site/site.e2e.cjs`

**Estimated scope:** Medium, 3 files, `35–50` phút agent runtime.

### Task 27: Pin Swiper và chuyển gallery sang progressive carousel markup

**Description:** Pin đúng dependency, phát browser asset tối thiểu và thay
renderer gallery dùng một semantic DOM vừa hydrate được vừa hoạt động bằng
native horizontal scroll khi dependency chưa sẵn sàng.

**Acceptance criteria:**

- [x] `package.json` và lockfile pin `swiper@14.2.0`; prepare script chỉ copy
      browser CSS/JS cần thiết, không phát module ngoài spec.
- [x] Shared detail template render đúng wrapper/track/slide/pagination và caption
      VI/EN; không còn static gallery-grid renderer cho block `gallery`.
- [x] Markup chưa hydrate vẫn hiện đủ media/caption, scroll-snap ngang, focus
      order đúng và không phụ thuộc JavaScript để có nội dung.
- [x] Pool `109`, sáu sequence, hero, `single`/`double`/`banner` không đổi.

**Verification:**

- [x] Task 26 static contract chuyển green; lifecycle/browser RED đúng nguyên
      nhân trước Task 28 và đã green sau hydration/geometry.
- [x] Lockfile chỉ pin thêm Swiper cho delta này; inspect scoped diff
      xác nhận không nâng package ngoài Swiper.
- [x] `pnpm prepare:site` sinh đủ asset và không gọi Wrangler.

**Dependencies:** Task 26.

**Files likely touched:**

- `package.json`
- `pnpm-lock.yaml`
- `scripts/site/prepare-static-assets.mjs`
- `src/site/advertising-products/detail-template.html`
- `tests/site/advertising-products-detail-routes.test.mjs`

**Estimated scope:** Medium, 5 files, `40–55` phút agent runtime.

### Task 28: Triển khai scoped lifecycle, responsive geometry và interaction

**Description:** Mount/destroy Swiper trên shared Advertising detail lifecycle,
thay CSS grid stretch bằng horizontal track và khóa geometry responsive theo
live Espacio cùng ngoại lệ ảnh siêu rộng đã duyệt.

**Acceptance criteria:**

- [x] Direct load, Barba enter, Back/Forward và locale swap mỗi carousel chỉ có
      một instance; unmount/retry destroy sạch, không nhân script, listener hoặc
      pagination.
- [x] Drag, touch, wheel `forceToAxis`, clickable dots và grab cursor hoạt động;
      không autoplay, loop, arrow hoặc keyboard trap; reduced motion tức thì.
- [x] Outer band, gap, max height, caption và control rail đạt spec tại desktop,
      tablet, mobile; wrapper bám active media height, không gray/white box rỗng.
- [x] Slide thường để lộ item kế; slide `2:1` hoặc rộng hơn khi vượt usable width
      dùng full usable width, giữ intrinsic ratio và không cần peek.
- [x] Residential, Commercial, parent Advertising grid và shared scroll contract
      không đổi.

**Verification:**

- [x] Task 26 lifecycle/browser contract green.
- [x] `pnpm qa:static` và focused Advertising detail E2E green ở `390x844`,
      `750x900`, `751x900`, `1200x900`, `1201x900`, `1440x900`, `1920x1080`.
- [x] Dependency-blocked probe, direct/Barba/history/locale matrix, console,
      network, overflow và layout-shift assertions green.

**Dependencies:** Task 27.

**Files likely touched:**

- `src/site/detail.js`
- `src/site/detail.css`
- `tests/site/advertising-products-lifecycle.test.mjs`
- `tests/site/site.e2e.cjs`

**Estimated scope:** Large, 4 files, `65–90` phút agent runtime.

### Checkpoint 10: Carousel behavior green

- [x] Task 26 RED trước source; Task 27–28 green sau source.
- [x] Sáu route VI/EN có đúng số instance và đủ `109` media; fallback dùng được.
- [x] Main agent inspect toàn bộ diff; không có source delta ngoài boundary đã
      duyệt và không có regression scroll/layout ngoài Advertising detail.

### Task 29: Three-way QA, review và đồng bộ live evidence

**Description:** So sánh live Espacio, archive và local implementation; chạy
Impeccable detector, correctness/Ponytail review và ghi current-hash evidence.
Không gọi full Espacio parity PASS.

**Acceptance criteria:**

- [x] In-app Browser xác nhận human path; Playwright đo lặp; DevTools kiểm tra
      DOM/computed style/network/console cho route có `3` carousel và route có
      ảnh siêu rộng.
- [x] Ảnh loaded không còn figure stretch; dependency-blocked fallback vẫn đủ
      media/caption và không raw markup, blank page hoặc unhandled error.
- [x] Impeccable detector, correctness review và Ponytail review không còn
      finding scoped chưa xử lý; limitation được ghi rõ.
- [x] Report, spec, STATE, plan và todo khớp current hash; không update Notion,
      stage, commit, push, deploy hoặc bật Wrangler.

**Verification:**

- [x] Focused Node suites, `pnpm prepare:site`, `pnpm qa:static` và Advertising
      carousel E2E green.
- [x] `git diff --check`, no-emoji và local Markdown links green.
- [ ] Human spot-check một route VI và một route EN vẫn là acceptance cuối.

**Dependencies:** Checkpoint 10.

**Files likely touched:**

- `docs/archive/reports/verification-advertising-detail-horizontal-carousel-2026-09-02.md`
- `docs/specs/advertising-products-turnkey-services.md`
- `docs/STATE.md`
- `tasks/plan.md`
- `tasks/todo.md`

**Estimated scope:** Medium, 5 Markdown files, `35–50` phút agent runtime.

### Rủi ro và rollback delta carousel

| Rủi ro | Mức | Mitigation |
| --- | --- | --- |
| Wheel ngang cướp scroll dọc | Cao | `forceToAxis`, focused vertical-scroll regression và native fallback |
| Ảnh siêu rộng tạo box rỗng hoặc mất peek | Cao | Max-height thay fixed-height; explicit cap-width case và runtime geometry assertion |
| Barba/history nhân instance | Cao | Một readiness promise, idempotent mount/destroy và listener-count test |
| Vendor asset lỗi làm mất gallery | Cao | Semantic native scroll-snap là baseline; Swiper chỉ progressive enhancement |
| CSS lan sang route dịch vụ | Trung bình | Scope `.advertising-detail`; selector/runtime boundary test |

Rollback gồm revert atomic Task 27–28 source/dependency delta và build lại static
output. Pool `109`, media manifest, composition config và route không migration,
nên không cần data rollback.

### Human gate carousel ngang

Owner duyệt plan ngày `2026-09-02`. Approval không cấp quyền update Notion,
commit, push, deploy hoặc bật Wrangler. Human acceptance cuối vẫn được theo dõi
riêng trong `tasks/todo.md`.

### AD-SEPT-2026-P1 — Kiosk, Flow, morph, logo và media report

**Trạng thái:** Implemented, owner visual gates open. Owner duyệt plan ngày
`2026-09-20`; source và gate kỹ thuật hoàn tất cùng ngày.

**Mục tiêu:** triển khai năm module đã khóa contract theo thứ tự ưu tiên kiosk
hội chợ, skeleton Flow, photo morph, logo R4 rồi báo cáo ảnh. Notion Tasks là
tracker tiến độ; phần này giữ trình tự kỹ thuật, dependency, checkpoint và gate,
không tạo checklist trùng trong `tasks/todo.md`.

#### Chỉ mục card Notion

| Thứ tự | Module | Card | Trạng thái trước execution |
| --- | --- | --- | --- |
| 1 | Kiosk hội chợ | [Advertising: Xuất bản ảnh kiosk trong hội chợ đã qua gate](https://app.notion.com/p/3e0332849a0e8111999ce78454b21ae1) | Up next |
| 2 | Skeleton Flow | [Advertising: Tái tạo skeleton Flow với preset dịu ngẫu nhiên](https://app.notion.com/p/3e0332849a0e811dbac1e7bb09ea28be) | Up next |
| 3 | Photo morph | [Advertising: Sửa photo morph khi cuộn viewport](https://app.notion.com/p/3e0332849a0e8178a964de1dd951db71) | Up next |
| 4 | Logo R4 | [Brand: Typeset lại cụm chữ logo theo 4Y và tỷ lệ 61,8%](https://app.notion.com/p/3e0332849a0e8147a613d929612f5bd3) | Up next |
| 5 | Media report | [Advertising: Lập báo cáo HTML thư viện ảnh 10–20/09/2026](https://app.notion.com/p/3e0332849a0e8175844ce3444a75f975) | Up next |

#### Execution topology

- Track A ưu tiên T01–T03 kiosk và chốt Checkpoint A trước mọi media chưa duyệt.
- Track B chạy T04–T06 skeleton rồi T07–T08 morph tuần tự vì cùng sở hữu
  `catalog-runtime.mjs` và focused Advertising browser suites.
- Track C T09–T10 logo độc lập với Track A/B sau khi baseline tests được khóa.
- Track D T11–T13 report chỉ đọc generated library; được chạy song song nhưng
  không đưa candidate vào `src/site` và không thay owner gate.
- Sau plan approval, `subagent-driven-development` quyết định solo/worker cho
  từng track; main giữ requirement, diff inspection, verification và acceptance.

#### T01: Truy vết exact ảnh kiosk hội chợ đã qua gate

**Mô tả:** lập bảng exact source path, SHA256, record gate, public ID dự kiến,
category và tag cho từng ảnh kiosk hội chợ. Nếu không tìm được exact hash trong
evidence đã duyệt thì dừng ảnh đó, không dùng ảnh gần giống.

**Acceptance:** mỗi candidate có một hàng provenance đầy đủ; không chấm lại ảnh
đã đạt; không mở rộng sang candidate chưa qua owner gate.

**Verification:** đối chiếu `owner-approval*.json`, review report và SHA256; main
spot-check ảnh gốc. **Dependency:** spec kiosk accepted. **Estimate:** 35–60 phút.

**Files:** `source-assets/projects/advertising/**/owner-approval*.json`, report
review tương ứng và một manifest tích hợp mới trong đúng bundle nguồn.

#### T02: RED contract cho kiosk public

**Mô tả:** thêm test thất bại trước source cho exact derivative, catalog, tag,
mô tả VI/EN, parent grid và detail; khẳng định không có title/caption riêng.

**Acceptance:** RED chỉ vì record/assets kiosk chưa tích hợp; các media hiện hữu
không đổi. **Verification:** focused Node contract suite.

**Dependency:** T01. **Files:** `tests/site/advertising-products-media.test.mjs`,
`tests/site/advertising-products-static.test.mjs` và tối đa một fixture/manifest.
**Estimate:** 25–40 phút.

#### T03: Tích hợp kiosk theo lô nhỏ và chốt Checkpoint A

**Mô tả:** chuyển exact source sang derivative WebP bằng pipeline hiện hành;
thêm public media, catalog, tag và mô tả VI/EN. Chia lô tối đa năm ảnh để diff
và rollback độc lập.

**Acceptance:** ảnh hiện ở parent grid và detail VI/EN; taxonomy đúng; không có
title; hash derivative truy ngược exact source; các filter/card hiện hữu giữ
hành vi. **Verification:** GREEN T02, media/static tests, local HTTP hash,
browser desktop/mobile và owner spot-check.

**Dependency:** T02. **Files mỗi lô:** asset public, `catalog.mjs`,
`photo-tags.mjs`, `media-manifest.mjs`, test/manifest liên quan.
**Estimate:** 60–120 phút theo số ảnh.

**Checkpoint A:** exact hash, public route, VI/EN, filter/tag và owner preview
đạt trước khi card kiosk chuyển `Done`.

#### T04: RED renderer và lifecycle skeleton Flow

**Mô tả:** khóa contract preset và vòng đời trước source: `6–8` preset dịu,
random một lần mỗi page load, giữ ổn định trong session, seeded random trong
test, Canvas2D low-resolution, pause offscreen/hidden/reduced motion.

**Acceptance:** test fail trên renderer hiện tại; không dựa vào pixel tuyệt đối
của random production. **Verification:** focused Node/browser tests.

**Dependency:** Checkpoint A có thể chạy song song sau baseline kiosk.
**Files:** `tests/site/advertising-continuation.e2e.mjs`,
`tests/site/advertising-photo-transitions.e2e.mjs`, tối đa một unit test mới.
**Estimate:** 35–55 phút.

#### T05: Tạo Flow renderer và preset dịu

**Mô tả:** viết renderer Canvas2D riêng từ hành vi quan sát, không sao chép
bundle FeralUI; blend màu theo khoảng cách, distortion/swirl theo thời gian,
kết hợp float X/Y nhỏ. Chọn preset từ danh sách lưu sẵn một lần mỗi load.

**Acceptance:** motion thấy rõ hơn CSS hiện tại nhưng không tranh ảnh; không
WebGL, video, worker hoặc dependency mới; grid geometry và CTA không đổi.

**Verification:** GREEN T04, no-leak/remount, reduced motion và hidden-tab tests.
**Dependency:** T04. **Files:** `catalog-runtime.mjs`, `detail.css`, một module
preset/renderer nếu tách giúp test, focused tests. **Estimate:** 90–150 phút.

#### T06: Chốt skeleton bằng browser và performance evidence

**Mô tả:** đo desktop/mobile VI/EN, scroll visibility, đổi tab, reduced motion,
20 remount và CPU/frame budget; owner chọn một trong các preset đã curate.

**Acceptance:** không blank canvas, không leak RAF/observer, không layout shift;
mọi preset đủ dịu và khác biệt có chủ đích.

**Verification:** DevTools performance trace, Playwright focused suite, visual
contact sheet hoặc recording ngắn. **Dependency:** T05. **Files:** evidence
verification hiện hành và spec nếu behavior thực tế buộc làm rõ. **Estimate:**
45–75 phút.

#### T07: RED regression morph khi scroll

**Mô tả:** tái hiện click card ở parent/related rồi cuộn trong `400ms`; kiểm clone
theo target, tối đa một clone, cleanup khi history/remount và reduced motion.

**Acceptance:** case scroll fail với implementation `fixed` hiện tại, các case
không scroll vẫn xanh. **Verification:** focused morph E2E lặp tối thiểu ba lần.

**Dependency:** T06 vì dùng chung runtime/test lane. **Files:**
`tests/site/advertising-photo-transitions.e2e.mjs`. **Estimate:** 30–45 phút.

#### T08: Đổi morph sang document coordinates

**Mô tả:** clone `position:absolute`; đổi source/target rect sang document
coordinates. Scroll thuần không hủy; layout reflow thật kết thúc an toàn và hiện
target; giữ timing/easing/API hiện hành.

**Acceptance:** click rồi scroll không lệch đích, không ảnh ma, không scroll
lock; parent và mọi related grid dùng cùng component/hành vi.

**Verification:** GREEN T07, history/Barba/remount, desktop/mobile, console và
layout-shift checks. **Dependency:** T07. **Files:** `catalog-runtime.mjs`,
focused morph test. **Estimate:** 45–75 phút.

**Checkpoint B:** skeleton và morph cùng xanh trên runtime cuối; main inspect
diff chung của `catalog-runtime.mjs` trước khi hai card đổi trạng thái.

#### T09: RED geometry logo R4

**Mô tả:** thêm metric assertions cho thân subtitle/title `0,618 ± 0,005`, visual
width sai lệch tối đa `0,5px`, block `4Y`, top/bottom `Y`, mark-copy gap `Y` và
full accent bounds không clip.

**Acceptance:** test đo font/SVG thực, fail trên geometry R3; cấm `scaleX` và
`lengthAdjust="spacingAndGlyphs"`. **Verification:** Node/SVG metric test và
browser font-ready probe.

**Dependency:** spec logo accepted; có thể chạy song song Track A/B.
**Files:** `tests/site/site.e2e.cjs` và tối đa một helper metric.
**Estimate:** 40–60 phút.

#### T10: Typeset canonical logo và đồng bộ consumer

**Mô tả:** cân font size, tracking, baseline và gap trên canonical SVG; dùng
pipeline hiện hành để đồng bộ inline consumers, không chỉnh từng route thủ công.
Giữ mark, font family/weight, copy, footprint và motion.

**Acceptance:** GREEN T09; subtitle lớn hơn và gap nhỏ hơn; dấu VI không clip ở
320–2560px, zoom 200%, font blocked/late; header/menu VI/EN cùng geometry.

**Verification:** static/runtime tests, 108+ viewport/font states, owner preview
header và menu. **Dependency:** T09. **Files:**
`src/site/assets/brand/truong-thinh-lockup.svg`, canonical consumer generator
hiện hành, `src/site/style.css`, `DESIGN.md`, focused test/evidence.
**Estimate:** 75–120 phút.

**Checkpoint C:** exact metric report và owner visual approval trước card logo
`Done`; nếu không đạt, rollback exact SVG hash R3.

#### T11: Inventory deterministic ảnh 10–20/09/2026

**Mô tả:** quét mọi PNG/JPEG/WebP trong generated subfolders theo timestamp
`Asia/Bangkok`; SHA256 làm identity, path trùng là secondary location; join chỉ
evidence có exact hash.

**Acceptance:** mỗi exact image trong cửa sổ ngày xuất hiện đúng một record;
không đọc ngoài thư mục generated/source evidence đã khai báo; không ghi
`src/site`. **Verification:** count reconciliation, duplicate/hash fixtures.

**Dependency:** spec report accepted; chạy song song, read-only với generated.
**Files:** script mới dưới `scripts/media/`, unit test, inventory JSON trong
`source-assets/projects/advertising/`. **Estimate:** 60–90 phút.

#### T12: Gom cụm và đề xuất ảnh tốt nhất

**Mô tả:** gom cấp một theo product/scene từ metadata/path, cấp hai bằng
perceptual similarity; xếp hạng bằng logic, thẩm mỹ, artifact chỉ khi có evidence
exact hash; thiếu evidence phải ghi `chưa chấm`.

**Acceptance:** revision cùng sản phẩm vào cùng cụm; sản phẩm khác không bị trộn;
recommendation giải thích được và owner có thể đổi lựa chọn.

**Verification:** fixtures cho near-duplicate/non-duplicate, manual sample ở các
cụm thực vật/noise/revision. **Dependency:** T11. **Files:** clustering module,
test và inventory schema. **Estimate:** 75–120 phút.

#### T13: Render HTML review report và chốt Checkpoint D

**Mô tả:** render HTML local có thumbnail, link file, folder nguồn, metadata,
status, điểm, artifact warning, nhóm gần giống và lựa chọn đề xuất.

**Acceptance:** keyboard/filter/link hoạt động; report mở không cần server ngoài;
không tự duyệt hoặc tự publish candidate; count khớp inventory.

**Verification:** static validation, local browser desktop/mobile, link check,
owner review. **Dependency:** T12. **Files:** renderer/template, HTML/JSON output
trong bundle review, test và evidence index. **Estimate:** 60–100 phút.

**Checkpoint D:** owner duyệt report/lựa chọn riêng; approval report không tự cấp
quyền tích hợp media ngoài exact kiosk đã duyệt.

#### Quality gate chung

1. Mỗi source change đi theo RED, GREEN rồi refactor hẹp; test focused trước,
   rồi `pnpm prepare:site` và `pnpm qa:static` khi module chạm public output.
2. Visible UI chạy Impeccable detector, browser desktop/mobile VI/EN, console,
   network, reduced motion, zoom 200% và keyboard theo spec tương ứng.
3. Main inspect exact diff và docs impact; code review trước merge, Ponytail review
   trước commit/push. Không stage/commit/push/deploy nếu owner chưa yêu cầu.
4. Notion card chỉ chuyển `In progress` khi bắt đầu module, `Done` sau checkpoint
   và evidence; Git spec/plan giữ engineering contract.

#### Rủi ro và rollback

| Rủi ro | Mức | Mitigation và rollback |
| --- | --- | --- |
| Nhầm revision kiosk gần giống | Cao | Exact SHA256 fail-closed; bỏ record đó khỏi lô, không thay bằng ảnh gần giống |
| Flow tốn CPU hoặc random làm test flaky | Cao | Canvas low-res, visible-only, seeded RNG trong test; rollback về CSS skeleton hiện tại |
| Skeleton và morph xung đột runtime | Cao | Chạy tuần tự, Checkpoint B trên diff hợp nhất; revert atomic theo module |
| Logo clip dấu khi font/zoom đổi | Cao | Full ink-bounds matrix; rollback exact SVG R3 |
| Clustering trộn sai sản phẩm | Trung bình | Metadata-first, similarity thứ hai, owner override; report không tự publish |

#### Human gate AD-SEPT-2026-P1

Owner đã duyệt năm spec và plan ngày `2026-09-20`. Execution được phép bắt đầu.
Plan approval không cấp quyền publish media chưa qua owner gate, commit, push
hoặc deploy.

#### Kết quả execution 2026-09-20

- T01–T03: tích hợp sáu exact kiosk hội chợ `kiosk-posm-25`–`30`; hash nguồn,
  provenance, catalog/tag/copy và 19 media/static checks đạt.
- T04–T08: tám preset Flow Canvas2D đạt lifecycle; full P13 morph `5/5`, frame
  đầu và endpoint lệch `0px`, scroll giữa morph không tạo ảnh ma.
- T09–T10: canonical logo đồng bộ mười consumer; VI/EN cùng đạt `0,618`, `4Y/Y`
  và focused runtime `21/21`. Owner visual preview còn mở.
- T11–T13: report có 93 exact image trong 69 cụm, evidence theo exact hash,
  không đề xuất bản rejected; 10 report tests và deterministic SHA256 đạt.
- Checkpoint kỹ thuật A–D và code review độc lập đạt. Checkpoint visual còn mở
  cho preset skeleton, logo VI/EN và lựa chọn trong report; không commit/push/deploy.

### AD-SEPT-2026-P2 — correction Flow, morph, detail và logo

**Trạng thái:** owner duyệt capability map và giao Codex tự thực thi tới kết
quả ngày `2026-09-20`. Notion tiếp tục là task tracker; plan này không tạo
checklist trùng trong `tasks/todo.md`.

#### Kiến trúc và thứ tự

1. Khóa RED riêng cho từng module trên behavior hiện hành.
2. Skeleton, morph, detail và logo có thể chạy song song chỉ khi writer ownership
   không trùng; `catalog-runtime.mjs` và `detail.css` phải có một writer tại một
   thời điểm hoặc các symbol/range được tách rõ.
3. Main hợp nhất, chạy static/build, focused browser VI/EN desktop/mobile,
   Impeccable detect và code review độc lập.
4. Media report không sửa hoặc chọn ảnh trong P2.

#### Task list

| Task | Kết quả | Acceptance | Verify |
| --- | --- | --- | --- |
| P2-T01 | FIELD skeleton chung và float rõ hơn | palette ngẫu nhiên, field parameters giống nhau, reduced-motion/visibility giữ nguyên, không overlap | unit skeleton + continuation browser |
| P2-T02 | Scroll lease cho photo morph | wheel/touch/key không đổi scroll trong morph; release mọi finish/cancel/abort/error | RED/GREEN morph E2E parent/related |
| P2-T03 | Detail một layout span2 | desktop/tablet ảnh trái–mô tả phải; mobile stack; bốn suggestion dưới body, hover dùng shared card interaction, toggle không đổi rect | layout unit + suggestion/card E2E VI/EN |
| P2-T04 | EN logo kế thừa metric VI | VI không đổi; EN title trùng width VI; EN subtitle cùng font-size/gap VI và fit width title | canonical sync + logo geometry/browser |
| P2-T05 | Integration nền | build/static/focused suites đạt trên bốn module ban đầu | prepare, static, scoped E2E |
| P2-T06 | Bỏ dải năng lực Advertising | không còn `section#nang-luc`; footer chung đi ngay sau CTA | static + continuation browser |
| P2-T07 | Morph native Back/Forward | detail↔detail và grid↔detail phát đúng morph `300ms`; scroll lock/release và resize thật đúng | history transition E2E |
| P2-T08 | CTA một viewport | composition vừa vùng dưới header; skeleton 38,2%, mobile thấp tối đa 28%; copy không clip, footer ở flow kế tiếp | continuation matrix VI/EN desktop/mobile/short |
| P2-T09 | Integration/docs/review cuối | build/static/focused suites đạt; docs/Notion/STATE phản ánh evidence hiện hành | prepare, static, scoped E2E, Impeccable, code review |

#### Kết quả 21/09/2026

- [x] P2-T01–T04: từng module đạt focused gate; logo runtime 22/22.
- [x] P2-T05–T06: build/static đạt; dải năng lực Advertising đã bỏ.
- [x] P2-T07: native Back/Forward đủ bốn hướng; endpoint parent/related hover,
  scrollbar lease và resize thật đạt; P13 cuối 10/10.
- [x] P2-T08: CTA đạt ma trận VI/EN 1440×900, 1440×400, 390×844, 390×568.
- [x] P2-T09: evidence Git, STATE, Notion và code review Astra/high đã đồng bộ;
  owner visual gate còn mở nên card giữ `In progress`.

#### Dependency và rollback

P2-T01/T02/T03/T04 độc lập về contract. P2-T05 phụ thuộc cả bốn. P2-T06 mở
đường cho P2-T08; P2-T07 độc lập với CTA nhưng dùng cùng gate transition;
P2-T09 phụ thuộc toàn bộ T01–T08. Rollback theo module: restore FIELD preset
schema; bỏ scroll lease/history handoff; restore primary geometry; restore exact
EN override; restore CTA continuation geometry. Không reset worktree, không sửa
`.site-output`, không commit/push/deploy và không thay media report.

#### Checkpoint

- A: RED repro/contract từng module đã fail đúng lý do.
- B: focused GREEN từng module trên source cuối của module.
- C: build/static và combined browser không có conflict/leak.
- D: docs, Notion và independent code review khớp exact diff; sẵn sàng owner test.

### AD-SEPT-2026-P3 — WebGL Flow và Advertising detail correction

**Trạng thái:** spec và plan được owner duyệt ngày `2026-09-21`; P3-T01–P3-T07
đã hoàn tất technical gate và sẵn sàng owner preview. P3-T08 chờ owner duyệt
JSON cuối rồi mới xóa dev UI trước ship.
Plan này cập nhật cùng capability/card của AD-SEPT, không tạo tracker hoặc stable
ID trùng. Thực thi dùng native Codex worker theo ownership rời nhau; main giữ
intent, diff, integration, verification và acceptance.

#### Kiến trúc và dependency

1. `skeleton-flow` khóa schema/evidence trước shader; `skeleton-flow-devtools`
   chỉ bắt đầu sau parser/validator và renderer GREEN.
2. `photo-detail-layout`, `photo-viewer-controls` và `advertising-page-shell`
   là ba slice độc lập sau khi RED contracts được khóa; writer của
   `catalog-runtime.mjs` và `detail.css` phải chạy tuần tự.
3. Dev UI là công cụ tune local. Sau owner duyệt JSON, removal gate xóa toàn bộ
   editor trước commit/push/deploy; chỉ source config đã export được giữ lại.

#### P3-T01: Khóa provenance và schema Flow

**Kết quả:** measurement artifact ghi bundle URL/hash/date, exact formula và
phân biệt giá trị extracted/candidate. Preset schema gồm `colors[4]`,
`anchors[4]`, `bands[3]`, Field và Finish; parser fail-closed theo range/order.

**Acceptance:** đủ 12 preset; pins/bands chưa đo được ghi candidate; JSON export
được cùng parser chấp nhận; resize giữ preset, reload/filter/detail/history đổi
preset theo contract. **Verify:** focused unit RED/GREEN và schema fixtures.

**Files:** `docs/verification/feral-flow-measurement-2026-09-21.md`,
`src/site/advertising-products/skeleton-flow.mjs`,
`tests/site/advertising-skeleton-flow.test.mjs`. **Dependency:** spec R4.
**Estimate:** M, 45–75 phút.

#### P3-T02: WebGL renderer và lifecycle

**Kết quả:** thay Canvas2D bằng clean-room WebGL low-resolution, bốn anchor,
distortion/swirl/blend/noise/soften; fallback tĩnh khi WebGL/context loss.

**Acceptance:** 12 preset render hữu hạn, không blank; visible-only RAF; hidden,
offscreen và reduced motion đứng yên; unmount không leak. `1569×912` đạt tối
thiểu `30fps` và không long task `>50ms` do renderer trong probe `5s`.

**Verify:** unit shader/config, context-loss/lifecycle browser và performance
probe. **Files:** `skeleton-flow.mjs`, `advertising-skeleton-flow.test.mjs`,
`advertising-continuation.e2e.mjs`. **Dependency:** P3-T01.
**Estimate:** M, 120–180 phút.

#### Checkpoint A — Flow engine

- [x] Provenance và schema đủ; exact/candidate không bị trộn.
- [x] Renderer, fallback, random lifecycle và performance gate GREEN.

#### P3-T03: Dev UI tune tạm thời

**Kết quả:** `?skeleton-dev=1` mở editor accessible cho 12 preset, bốn màu/pin,
ba band, Field/Finish, Save local, Reset và Export JSON; preview dùng skeleton
thật. Không có Import, backend hoặc dependency mới.

**Acceptance:** query public bình thường không mount/listen/write storage; URL
public loại query dev; export qua parser và source-config reload giữ dữ liệu.

**Verify:** unit config, keyboard/pointer, VI/EN desktop/mobile, reload/reset/
export. **Files:** tối đa một module editor mới, `catalog-runtime.mjs`,
`detail.css`, `advertising-skeleton-flow.test.mjs`, một focused E2E mới.
**Dependency:** Checkpoint A.
**Estimate:** M, 90–150 phút.

#### P3-T04: Detail span3, hero và suggestion thống nhất

**Kết quả:** primary span3 với hero2/info1, cột4 giữ grid; CTA vào info; tối đa
bốn suggestion một hàng mỗi mục neo đáy; hero blur/zoom/parallax đồng bộ.

**Acceptance:** N1–N4, VI/EN, long copy, zoom chữ200% và mobile stack đúng;
active suggestion mới có border/nền trắng/text-mask; hover/reveal reuse card,
không đổi rect hoặc nhảy zoom-out; expand inset chênh tối đa `1 CSS px`.

**Verify:** layout unit, photo view/transition E2E, screenshot đầu/giữa/cuối và
reduced motion. **Files:** `layout-core.mjs`, `catalog-runtime.mjs`, `detail.css`,
`advertising-photo-layout.test.mjs`, `advertising-primary-p14.e2e.mjs`,
`advertising-photo-transitions.e2e.mjs`. **Dependency:** P3-T03 writer release.
**Estimate:** M, 90–150 phút.

#### P3-T05: Viewer một zoom state

**Kết quả:** `+`, `−`, Reset, wheel quanh cursor và middle-click Fit cùng dùng
`level/scale/pan`; disabled/status luôn đồng bộ.

**Acceptance:** endpoint button/wheel/middle/keyboard giống nhau; anchor lệch
tối đa `1 CSS px` trước pan limit; dialog khóa page scroll đúng phạm vi; resize
và input nhanh không jump; close trả focus/scroll.

**Verify:** focused viewer E2E desktop/mobile/reduced motion. **Files:**
`photo-viewer.mjs`, `detail.css`, `advertising-photo-view.e2e.mjs`.
**Dependency:** RED viewer contract, độc lập T04 nhưng writer CSS chạy sau T04.
**Estimate:** S, 45–75 phút.

#### P3-T06: CTA boundary và nav reset

**Kết quả:** headline đặt tại ranh skeleton/trắng, link nằm trong trắng; skeleton
không viền và card motion khớp grid. Nav Advertising luôn về locale canonical
không query, filter Tất cả; Back/Forward phục hồi state cũ.

**Acceptance:** CTA một viewport, cap mobile/short giữ `28%`, footer ở flow kế;
VI/EN desktop/mobile không clip/overflow; modified click và href thật đúng.

**Verify:** continuation E2E, static route contract và browser history matrix.
**Files:** `catalog-runtime.mjs`, `detail.css`, `advertising-continuation.e2e.mjs`,
`advertising-products-static.test.mjs`. **Dependency:** T04 writer release.
**Estimate:** M, 60–90 phút.

#### Checkpoint B — Combined UI

- [x] Detail, viewer, CTA/nav và photo morph P13 cùng GREEN.
- [x] Không console/network error, layout shift, overflow hoặc lifecycle leak.

#### P3-T07: Integration, evidence và review

**Kết quả:** build/static, focused suites, browser matrix, Impeccable detect,
performance probe và native independent code review trên exact diff; docs/STATE
và Notion card phản ánh evidence hiện hành.

**Acceptance:** không finding Important mở; không regression kiosk/logo/report;
không chỉnh `.site-output`, commit, push hoặc deploy.

**Verify:** `pnpm prepare:site`, `pnpm qa:static`, focused Node/E2E và exact
artifact hashes. **Dependency:** Checkpoint B.
**Estimate:** M, 60–120 phút.

**Trạng thái 2026-09-21:** hoàn tất technical gate. Evidence tích hợp tại
`docs/verification/advertising-september-p3-2026-09-21.md`; không finding
Important mở. Không commit, push hoặc deploy.

#### P3-T08: Owner tune và removal gate trước ship

**Kết quả:** owner dùng dev UI chọn JSON cuối. Sau approval, đưa JSON vào source
rồi xóa module/import/CSS/query/storage/reset/export dev và static scan chứng
minh không còn chuỗi dev trong source/output.

**Acceptance:** renderer giữ config đã duyệt; public build không còn dev UI;
focused/full static gate vẫn GREEN; Impeccable detect và independent exact-diff
review chạy lại trên diff cuối sau removal, không còn finding Important.
**Dependency:** P3-T07 và owner visual tune.
**Estimate:** S, 45–75 phút sau owner tune.

#### Rủi ro và rollback P3

| Rủi ro | Mức | Mitigation và rollback |
| --- | --- | --- |
| GPU/context khác nhau | Cao | Low-res shader, finite guards, fallback tĩnh; restore renderer P2 theo module |
| Dev UI lọt public build | Cao | Source removal + negative static scan, không chỉ feature flag |
| Runtime shared-file conflict | Cao | Một writer theo thứ tự T03→T04→T06; main inspect từng handoff |
| Motion/detail regression | Cao | Giữ P13/history/viewer baselines và combined matrix trước docs acceptance |

#### Human gate AD-SEPT-2026-P3

Owner duyệt plan ngày `2026-09-21`. Codex thực thi liên tục tới P3-T07 và để
dev UI local cho owner kiểm; P3-T08 chỉ chạy sau khi owner duyệt JSON, trước
ship.

### AD-SEPT-2026-P4 — correction batch Flow, cột 4 và morph backdrop

**Trạng thái:** spec R5/R10/R4 và plan được owner duyệt ngày `2026-09-21`.
P4-T01–P4-T05 đã đạt technical gate; owner visual gate còn mở. Đây là delta của
các card AD-SEPT hiện có, không tạo stable ID hoặc tracker thứ hai. P3-T08 vẫn là
gate riêng trước ship.

#### Kiến trúc và dependency

1. Khóa regression RED cho ba lỗi đã tái hiện trước khi sửa source.
2. Sửa allocator/lifecycle skeleton trước; layout invariant và morph backdrop là
   hai slice độc lập nhưng cùng ghi `catalog-runtime.mjs`, nên thực thi tuần tự.
3. Chạy combined browser gate, cập nhật evidence/STATE và card Notion sau khi
   source cuối đã GREEN. Không chỉnh `.site-output`, commit, push hoặc deploy.

#### P4-T01: Khóa RED batch và viewport-entry skeleton

**Acceptance:** batch 12 có preset, permutation và phase không lặp; direction
chênh tối đa một; resize giữ assignment; lifecycle trigger random lại. Cuộn ra/
vào hai lần chứng minh entry `600ms` cùng opacity/transform/easing với card grid,
WebGL bắt đầu sau entry và reduced motion tĩnh.

**Verify:** mở rộng `advertising-skeleton-flow.test.mjs` và
`advertising-continuation.e2e.mjs`; test phải fail đúng behavior cũ.
**Files:** hai test hiện có. **Dependency:** spec R5. **Estimate:** S, 25–40 phút.

#### P4-T02: Triển khai allocator và shared viewport motion

**Acceptance:** shuffle không hoàn lại 12 preset và 12/24 anchor permutations;
phase riêng, direction gần cân bằng; không đổi Field/Finish source. Skeleton dùng
cùng viewport-entry controller/contract card grid, không đổi rect hoặc lifecycle
pause/offscreen/context-loss hiện hành.

**Verify:** T01 GREEN, lifecycle/remount 20 lần không leak, performance probe giữ
`>=30fps`, không long task renderer `>50ms` trong 5 giây.
**Files:** `skeleton-flow.mjs`, `catalog-runtime.mjs`, `detail.css`, hai test T01.
**Dependency:** P4-T01. **Estimate:** M, 60–100 phút.

#### Checkpoint A — Skeleton

- [x] Unit và browser Flow GREEN trên VI/EN, normal/reduced motion.
- [x] Runtime capture chứng minh frame đầu không cùng preset/anchor/phase/direction.

#### P4-T03: Khóa và sửa invariant N4/span3 cột 4

**Acceptance:** exact `kiosk-posm-30 + use-sampling` giữ ảnh đầu ở cột 4/top 0,
mọi ảnh còn lại đủ một lần dưới primary. Quét mọi hero/tag authored tại N4:
pool khác rỗng luôn lấp cột 4, deterministic và trong budget `300.000`.

**Verify:** RED/GREEN `advertising-one-column.test.mjs`, browser exact URL tại
`1569×912`, resize N3↔N4 và VI/EN. **Files:** `catalog-runtime.mjs`, có thể
`layout-core.mjs`, test layout hiện có. **Dependency:** Checkpoint A writer release.
**Estimate:** M, 45–80 phút.

#### P4-T04: Couple zoom-blur với photo morph

**Acceptance:** backdrop chỉ animate khi morph thật trả thành công; dùng cùng
generation và start/cancel/settle. Direct load, reduced motion, missing source và
cancel/retarget giữ backdrop tĩnh, đúng photo ID và không để animation dư.

**Verify:** RED/GREEN `advertising-photo-transitions.e2e.mjs` cho grid, related,
Back/Forward, direct, reduced và rapid replace. **Files:** `catalog-runtime.mjs`
và focused transition test. **Dependency:** P4-T03 writer release.
**Estimate:** S, 35–60 phút.

#### Checkpoint B — Combined runtime

- [x] `pnpm prepare:site`, focused Node/static và ba browser suite đều GREEN.
- [x] Exact URL cột 4, skeleton re-entry và morph backdrop không console/network error.
- [x] Independent exact-diff review không còn finding Important.

#### P4-T05: Evidence, docs và tracker

**Acceptance:** verification report và `docs/STATE.md` phản ánh source cuối;
Notion card skeleton/morph/detail được cập nhật bằng link Git canonical và trạng
thái thực. Báo cáo cuối trong chat có đúng ba ý: nguyên nhân, cách fix, nguy cơ
tái lập khi số card tăng.

**Verify:** current source/output hash, diff inspection và docs links hợp lệ.
**Files:** `docs/verification/`, `docs/STATE.md`, `docs/verification/index.md`;
Notion chỉ update sau evidence. **Dependency:** Checkpoint B.
**Estimate:** S, 25–45 phút.

P4-T05 hoàn tất ngày `2026-09-21`. Evidence canonical:
`docs/verification/advertising-september-p4-2026-09-21.md`. Card Notion liên
quan giữ `In progress` vì owner visual gate và P3-T08 chưa đóng. Không commit,
push hoặc deploy.

#### Rủi ro và rollback P4

| Rủi ro | Mức | Mitigation và rollback |
| --- | --- | --- |
| Invariant cột 4 làm yếu terminal tail | Cao | Scope detail N4/span3; sweep toàn authored pool; rollback riêng layout policy |
| Random mới làm test flaky | Cao | Injectable/seeded shuffle trong test; assertion theo invariant, không khóa sequence |
| Entry replay chạy RAF offscreen | Trung bình | Tách reveal state khỏi Flow loop; lifecycle/count probe trước acceptance |
| Backdrop lệch cancel/retarget | Cao | Một owner lifecycle cùng active morph; rapid/history regression |

#### Human gate AD-SEPT-2026-P4

Owner duyệt plan trước implementation. Sau approval, Codex thực thi liên tục tới
P4-T05, không mở rộng sang P3-T08 hoặc ship; owner kiểm kết quả cuối.

### AD-SEPT-2026-P5 — continuous masonry, shared hover và motion correction

**Trạng thái:** spec R11/R6/R5 và plan được owner duyệt ngày `2026-09-21`; P5-T01–P5-T07
đã đạt technical gate, còn owner visual gate. Đây là delta tiếp theo của ba card Advertising hiện có. Git giữ
spec và plan canonical; Notion chỉ giữ trạng thái, blocker và next action.

#### Quyết định kiến trúc và dependency

1. Parent và detail dùng cùng pure masonry kernel. Ở detail, primary là một
   reserved brick span `min(3, N)` trong cùng coordinate space; không chạy solver
   related thứ hai và không ép toàn bộ tail xuống dưới primary.
2. Geometry và outer gap phải ổn định trước khi hợp nhất hover hoặc motion để
   browser evidence không trộn lỗi layout với lỗi animation.
3. Shared media-hover là một behavior contract dùng lại cho portal, grid/related
   và suggestion; state riêng của portal và suggestion vẫn do component sở hữu.
4. Skeleton và backdrop là hai slice tuần tự vì cùng chạm
   `catalog-runtime.mjs`. Scroll lock kết thúc cùng foreground morph; linger chỉ
   là motion trang trí.
5. Không chỉnh `.site-output`, media, taxonomy, dev Flow UI, commit, push,
   deploy hoặc ship-removal gate P3-T08 trong P5.

#### Task index và tracker

Task status được giữ trên ba card Notion hiện có: detail/layout, skeleton Flow và
photo morph. Trình tự engineering cùng acceptance canonical nằm trong P5 này;
không tạo card hoặc checklist song song.

#### P5-T01: Khóa RED cho continuous masonry và outer gap

**Acceptance:** parent giữ deterministic shortest-column masonry cho toàn bộ
card; detail N4 đặt primary tại cột 1–3, card related đầu tại cột 4/y0 và card
tiếp theo tiếp tục lấp cột ngắn nhất, kể cả dưới primary. Quét N1–N4, VI/EN,
resize và mọi authored pool chứng minh đủ card đúng một lần, không overlap,
không vượt budget `300.000`. Outer gap trái/phải của detail bằng gap dưới navbar
trong sai số `1 CSS px`. Test phải RED đúng policy P4 cũ trước source edit.

**Verify:** mở rộng `advertising-products-layout.test.mjs`,
`advertising-photo-layout.test.mjs` và `advertising-photo-view.e2e.mjs`.
**Files:** ba test hiện có. **Dependency:** spec R11. **Estimate:** M, 45–75 phút.

#### P5-T02: Triển khai một masonry coordinate space

**Acceptance:** bỏ policy chỉ giữ card đầu ở cột 4 rồi đẩy tail xuống dưới
primary; allocator luôn chọn cavity hợp lệ thấp nhất, giữ input order,
determinism, immutable card identity và operation budget. Parent không đổi số
cột responsive hiện tại. Detail dùng cùng outer-gap token với top gap navbar.

**Verify:** P5-T01 GREEN; oracle geometry, coordinate hash, N3↔N4 resize và exact
route `led-displays-lightboxes-01` tại `1569×912` không console/network error.
**Files:** `layout-core.mjs`, `catalog-runtime.mjs`, `detail.css`.
**Dependency:** P5-T01. **Estimate:** M, 60–100 phút.

#### Checkpoint A — Geometry

- [x] Unit và browser layout GREEN trên parent/detail, VI/EN và N1–N4.
- [x] Capture chứng minh col4 được lấp liên tục và outer gap khớp top gap.

#### P5-T03: Khóa RED cho shared media-hover và audit selector

**Acceptance:** portal homepage, Advertising grid/related và suggestion đều đạt
scale `1.15`, duration `600ms`, easing `ease-out` khi hover/focus phù hợp. Portal
giữ shade/underline; suggestion giữ active mask, text và ARIA. Reduced motion
không giữ transition. Audit liệt kê mọi selector media zoom tương tự và phân loại
reuse hoặc ngoại lệ có lý do. Test phải RED ở portal `1.10` hiện tại.

**Verify:** mở rộng `site.e2e.cjs`, `advertising-card-interactions.e2e.mjs` và
`advertising-suggestion-motion.e2e.mjs`.
**Files:** ba test hiện có. **Dependency:** Checkpoint A. **Estimate:** S, 30–50 phút.

#### P5-T04: Hợp nhất shared media-hover primitive

**Acceptance:** một primitive/class contract sở hữu zoom timing cho ba consumer;
không duplicate scale/duration giữa portal và Advertising. State overlay,
underline, active/deactive và keyboard focus của từng consumer không đổi. Chỉ
những selector audit xác nhận cùng behavior mới được chuyển sang primitive.

**Verify:** P5-T03 GREEN; pointer, keyboard và reduced-motion matrix ở desktop
và mobile emulation.
**Files:** `style.css`, `detail.css`, `index.html`, `catalog-runtime.mjs`.
**Dependency:** P5-T03. **Estimate:** M, 45–75 phút.

#### Checkpoint B — Shared hover

- [x] Ba consumer dùng cùng scale/timing và giữ state riêng.
- [x] Audit không còn selector cùng intent bị bỏ sót hoặc override ngoài ý muốn.

#### P5-T05: Sửa skeleton entry và global boundary fade

**Acceptance:** skeleton vào viewport bằng opacity-only `600ms ease-out`, cùng
contract card thật; không translate, scale hoặc hover. WebGL loop chỉ bắt đầu sau
entry. Fade-to-white là một mask theo global space trên container, chỉ xuất hiện
tại ranh giới batch skeleton và vùng thở trắng; frame riêng không còn mask.
Reduced motion hiện ngay và không chạy loop thừa.

**Verify:** RED/GREEN `advertising-skeleton-flow.test.mjs`,
`advertising-continuation.e2e.mjs` và case skeleton trong
`advertising-photo-transitions.e2e.mjs`; cuộn vào/ra hai lần, resize và filter
không rebuild node không cần thiết.
**Files:** `skeleton-flow.mjs`, `catalog-runtime.mjs`, `detail.css`, ba test tập
trung. **Dependency:** Checkpoint B. **Estimate:** M, 60–95 phút.

#### P5-T06: Sửa backdrop white erase, zoom-blur và linger

**Acceptance:** chỉ morph thật mới chạy backdrop. `0–25%` duration là white
erase; sau đó zoom-blur chạy tới foreground settle. Backdrop linger thêm `200ms`
nhưng scroll lock được release ngay khi foreground settle. History dùng `300ms`,
normal dùng `400ms`; cancel/retarget dọn animation, timer và generation cũ.
Reduced motion, direct load và missing source giữ backdrop tĩnh.

**Verify:** RED/GREEN `advertising-photo-transitions.e2e.mjs` cho grid, related,
Back/Forward, rapid replace, scroll trong linger và reduced motion; không clone,
timer hoặc scroll lock dư.
**Files:** `catalog-runtime.mjs`, `detail.css`, focused transition test.
**Dependency:** P5-T05 writer release. **Estimate:** M, 50–85 phút.

#### Checkpoint C — Combined motion

- [x] Skeleton và backdrop suites GREEN trên runtime cuối.
- [x] Scroll hoạt động trong linger; rapid retarget không để animation dư.

#### P5-T07: Combined QA, review, living docs và tracker

**Acceptance:** `prepare:site`, focused Node/static/browser suites và exact-route
manual capture đều GREEN. Independent diff review không còn finding Important.
Verification report, `docs/STATE.md`, verification index và ba card Notion phản
ánh đúng source cuối; card chỉ Done nếu owner visual gate và P3-T08 cũng đóng.

**Verify:** source/output hash, console/network capture, diff inspection, docs
links và Notion content/status re-fetch. **Files:** `docs/verification/`,
`docs/STATE.md`, `docs/verification/index.md`; không sửa accepted spec ngoài
supersession/status cần thiết. **Dependency:** Checkpoint C. **Estimate:** M,
45–75 phút.

#### Rủi ro và rollback P5

| Rủi ro | Mức | Mitigation và rollback |
| --- | --- | --- |
| Continuous solver làm đổi parent grid ngoài scope | Cao | Golden fixtures parent trước/sau; giữ column count; rollback riêng reservation policy |
| Primary brick gây overlap ở N1–N3 | Cao | Oracle toàn viewport và authored pool; fail closed khi geometry vô hiệu |
| Shared hover làm mất state suggestion/portal | Trung bình | Contract test riêng state; primitive chỉ sở hữu transform/timing |
| Global mask bị local hóa do stacking context | Trung bình | Đo computed mask/rect trên container; bỏ toàn bộ per-frame mask |
| Linger giữ scroll lock hoặc timer cũ | Cao | Tách settle khỏi decoration; rapid/history cleanup assertion |

#### Human gate AD-SEPT-2026-P5

Owner duyệt plan trước mọi source/test edit. Sau approval, Codex dùng
`subagent-driven-development` để chọn solo/native worker theo writer overlap,
thực thi liên tục tới P5-T07 và dừng tại owner visual gate; không ship.

### AD-SEPT-2026-P6 — footer boundary, exact hover, portal type-fit và skeleton CTA field

**Trạng thái:** spec và plan P6 được owner duyệt ngày `2026-09-22`; focused
technical gate P6-T01–P6-T09 đạt, đang chờ owner visual gate.
Task status được giữ trên ba card Notion Advertising hiện có;
không tạo checklist hoặc tracker thứ hai. P3-T08 vẫn là removal gate riêng trước
ship và không thuộc P6.

#### Quyết định kiến trúc và dependency

1. Footer homepage là canonical markup. Source route có thể lặp markup tĩnh,
   nhưng một structural signature và shared CSS contract ngăn route-local fork;
   không thêm runtime component loader.
2. `.media-hover-zoom-trigger`/`.media-hover-zoom` là provider duy nhất cho
   transform ảnh. Suggestion chỉ sở hữu active state, crossfade, ARIA và morph.
3. Portal typography được sửa sau shared hover để sweep không trộn lỗi clip với
   lỗi transform. Cỡ chữ dùng chung theo role trong từng nhóm, không auto-fit
   riêng từng card.
4. Skeleton phụ thuộc footer boundary. Page visibility chỉ pause renderer; entry
   state, preset, anchor permutation, phase và direction của slot được giữ.
5. Không đổi footer copy, portal copy/media, 12 preset Flow, FIELD/FINISH, CTA,
   navbar, inventory ảnh, dev Flow UI, `.site-output`, commit, push hoặc deploy.

#### Task index và tracker

Thứ tự canonical: P6-T01 → T02 → T03 và P6-T04 → T05 có thể chạy theo hai lane
sau khi plan được duyệt; P6-T06 phụ thuộc T05; P6-T07 → T08 phụ thuộc T03; T09
chỉ bắt đầu khi cả hai lane GREEN. Ba card Notion hiện có giữ status, blocker và
next action; task detail và acceptance nằm trong plan này.

#### P6-T01: Khóa RED structural signature của footer

**Description:** thêm contract test so sánh footer canonical trên năm source
route, sáu detail output, VI/EN và kiểm route không có footer fork.

**Acceptance:** test thất bại đúng khi markup/class/copy/semantics footer lệch;
không coi whitespace hoặc generated formatting là khác structure. Test cũng
khóa một footer mỗi route và không chấp nhận CTA nằm trong footer.

**Verification:** RED `footer-consistency.e2e.mjs` trên source hiện tại hoặc
fixture mutation; `pnpm prepare:site` tạo đủ sáu detail output để test đọc.
**Files likely touched:** `tests/site/footer-consistency.e2e.mjs` và fixture/test
helper liên quan. **Dependency:** spec `shared-footer-boundary`. **Estimate:** S,
30–45 phút.

#### P6-T02: Chuẩn hóa footer source theo canonical homepage

**Description:** sửa đúng route source bị lệch để cùng structural signature với
homepage; giữ copy, locale data, social semantics và `data-header-tone`.

**Acceptance:** năm source route và sáu detail output có cùng signature; không
thêm loader, dependency hoặc footer variant. Build generator tiếp tục lấy source
template, không sửa `.site-output` trực tiếp.

**Verification:** P6-T01 GREEN; `pnpm prepare:site`, `pnpm qa:static`; diff chỉ
chứa các hunk footer cần đồng bộ.
**Files likely touched:** tối đa năm route HTML trong `src/site/`; không sửa CSS
ở task này. **Dependency:** P6-T01. **Estimate:** S, 30–50 phút.

#### P6-T03: Áp shared footer gap và route boundary

**Description:** thêm một responsive top-gap contract `64/70/90px`, bỏ khoảng
trắng kép ở section trước và tạo boundary mà Advertising skeleton không vượt.

**Acceptance:** top gap đúng trong `1 CSS px` tại các breakpoint đã duyệt;
footer/divider/hit target nằm ngoài mask, blur, canvas và clipping context. Mọi
route không overflow, clip hoặc overlap section cuối.

**Verification:** `footer-consistency.e2e.mjs` GREEN tại `320`, `390`, `768`,
`1024`, `1440`, `1569`; focused browser kiểm Advertising và ít nhất một route
không Advertising ở VI/EN.
**Files likely touched:** `src/site/style.css`, `src/site/detail.css`, test footer.
**Dependency:** P6-T02. **Estimate:** M, 45–70 phút.

#### P6-T04: Khóa RED exact shared hover và active suggestion

**Description:** đo portal, grid và suggestion tại đầu/giữa/cuối, rapid reverse,
inactive→active, keyboard, touch và reduced motion trước khi sửa provider.

**Acceptance:** test bắt được scale/timing/transform-origin sai, frame jump trên
`0.01`, scale lệch trên `0.005`, outer rect đổi và hover còn chạy khi active.
Active endpoint phải là nền trắng, chữ/viền đen, ảnh ẩn và ARIA đúng.

**Verification:** RED `site.e2e.cjs`, `advertising-card-interactions.e2e.mjs`,
`advertising-suggestion-motion.e2e.mjs` đúng lỗi hiện hành.
**Files likely touched:** ba test hiện có. **Dependency:** spec
`shared-media-hover` và R12. **Estimate:** M, 45–70 phút.

#### P6-T05: Hợp nhất provider hover và transition suggestion

**Description:** dùng cùng DOM hook/CSS declaration của homepage portal cho mọi
consumer; suggestion inactive kế thừa provider, active thu ảnh về `1` và
crossfade trắng trong `250ms ease-out` mà không reset transform.

**Acceptance:** portal, grid và suggestion inactive dùng đúng `1 ↔ 1.15`,
`600ms ease-out`, origin và clip; không còn selector suggestion duplicate
transform/timing. Active bất động khi hover/focus và không relayout/mất morph.

**Verification:** P6-T04 GREEN; capture pointer/keyboard/touch, rapid reverse,
photo morph và Back/Forward ở VI/EN; reduced motion đi thẳng endpoint.
**Files likely touched:** `src/site/style.css`, `src/site/detail.css`,
`src/site/index.html`, `src/site/advertising-products/catalog-runtime.mjs`.
**Dependency:** P6-T04. **Estimate:** M, 60–90 phút.

#### P6-T06: Khóa portal typography không clip hoặc wrap

**Description:** dùng shared responsive sizing cho cả sáu portal trong
`#dich-vu` và `#nang-luc`; chuỗi dài nhất mỗi locale/nhóm quyết định cỡ chung
theo role.

**Acceptance:** kicker/title/subtitle một dòng, bbox cách frame ít nhất `8px`,
không clip, wrap, scaleX hoặc layout shift sau font ready. Peer trong cùng nhóm
có cùng computed font-size; text zoom `200%` được stack/tăng chiều cao nếu cần.

**Verification:** browser sweep sau `document.fonts.ready` tại `320`, `390`,
`430`, `750/751`, `960/961`, `1024`, `1200/1201`, `1329`, `1440`, `1569`,
`1920`, VI/EN, zoom `100%/200%`; keyboard/reduced motion và console sạch.
**Files likely touched:** `src/site/style.css`, `tests/site/site.e2e.cjs` hoặc một
focused portal test. **Dependency:** P6-T05. **Estimate:** M, 60–90 phút.

#### P6-T07: Khóa RED skeleton persistence, geometry và global field

**Description:** thêm regression cho focus/visibility, viewport re-entry, ba
ratio band, global alpha/blur, CTA gap và footer cap trước khi sửa runtime.

**Acceptance:** blur/focus tab không tăng entry counter hoặc đổi batch; cuộn hẳn
ra/vào chạy đúng một entry mới. Test bắt frame lặp band kề nhau, lát mỏng dưới
`0.25 × cardWidth`, mask local-space, CTA alpha ngoài `0.08–0.15` và gap sai.

**Verification:** RED `advertising-skeleton-flow.test.mjs`,
`advertising-continuation.e2e.mjs`, `advertising-photo-transitions.e2e.mjs` trên
2–4 cột, sparse/full, filter, resize, VI/EN và reduced motion.
**Files likely touched:** ba test hiện có. **Dependency:** P6-T03. **Estimate:** M,
60–90 phút.

#### P6-T08: Triển khai persistent entry và skeleton CTA global field

**Description:** tách page visibility khỏi reveal lifecycle; gán deterministic
ratio band cho frame một cột; render một global mask và gradient blur kéo tới
trước footer, giữ skeleton rất mờ sau CTA và rút ngắn CTA gap.

**Acceptance:** visibility pause/resume đúng phase mà không replay/random; resize
giữ slot state. Batch đủ ba band khi có chỗ, không adjacent duplicate hoặc frame
mỏng. Fade band đạt `max(96px, 0.5 × cardWidth)` nhưng không quá `45%`; blur/alpha
cùng global y, CTA rõ, footer sạch và gap `15/25/35px` đúng trong `1px`.

**Verification:** P6-T07 GREEN; loop/unmount dọn observer, RAF, timer và WebGL;
focused browser capture các cột cùng y, focus hai chu kỳ, re-entry, resize,
history remount và reduced motion.
**Files likely touched:** `src/site/advertising-products/skeleton-flow.mjs`,
`src/site/advertising-products/catalog-runtime.mjs`, `src/site/detail.css`.
**Dependency:** P6-T07. **Estimate:** M, 75–110 phút.

#### Checkpoint A — Hai lane GREEN

- [x] Footer signature/gap và skeleton boundary GREEN, không mask footer.
- [x] Shared hover, active suggestion và sáu portal typography GREEN.
- [x] Không đổi copy, media, Flow preset/dev UI hoặc route behavior ngoài spec.

#### P6-T09: Combined QA, detector, review, living docs và tracker

**Description:** build source, chạy focused regression tích hợp, kiểm exact local
routes, chạy Impeccable detector sau UI edit, review diff độc lập và ghi evidence.

**Acceptance:** focused static/unit/browser suites GREEN; không console/network
error mới; independent review không còn finding Important. Verification report,
index, `docs/STATE.md` và ba card Notion phản ánh cùng source/hash/status. Không
gọi focused PASS là full-site hoặc canonical parity PASS.

**Verification:** `pnpm prepare:site`, `pnpm qa:static`, focused Node/browser
suites của T01–T08, exact owner viewports, Impeccable detector, `git diff --check`
và source/output hash. Owner xem preview VI/EN trước khi P6 được chấp nhận.
**Files likely touched:** `docs/verification/`, `docs/verification/index.md`,
`docs/STATE.md`; tracker Notion không thay Git canonical. **Dependency:**
Checkpoint A. **Estimate:** M, 60–90 phút.

**Kết quả 2026-09-22:** P6-T01–P6-T09 hoàn tất ở focused technical gate.
Footer 192/192, portal 28/28, shared hover 2/2, suggestion/skeleton/continuation
và static contract đều GREEN. Independent review đầu nêu bốn finding Important;
đã sửa portal assertion scope, fade cap, ratio band theo cột và direct generated
redirect-shell verification rồi re-review. Evidence:
[`advertising-september-p6-2026-09-22.md`](../../docs/verification/advertising-september-2026-p2-p7.md).
Owner visual gate, P3-T08, commit, push và deploy vẫn mở.

#### Rủi ro và rollback P6

| Rủi ro | Mức | Mitigation và rollback |
| --- | --- | --- |
| Footer normalization làm đổi route copy/semantics | Cao | Structural signature khóa trước; rollback riêng hunk route, giữ shared CSS |
| Suggestion còn jump do lớp incoming reset transform | Cao | Sample computed transform từng frame; incoming kế thừa rendered state; rollback consumer hook |
| Portal no-wrap làm chữ quá nhỏ | Trung bình | Cỡ chung theo nhóm, giữ hierarchy; stack/tăng chiều cao trước khi giảm dưới giới hạn đọc |
| Visibility resume làm random hoặc replay entry | Cao | Tách renderer pause khỏi reveal state; assert counter, seed, phase và direction |
| Global blur/fade tạo seam hoặc che footer | Cao | Một container coordinate space; đo cùng y và cap tại footer boundary |

#### Human gate AD-SEPT-2026-P6

Owner duyệt plan trước mọi source/test edit. Main thực thi theo collaboration
native của Codex và gọi native read-only reviewer khi phù hợp.
P6 dừng tại owner visual gate; không ship, không chạy P3-T08 và không xóa dev
Flow UI trong P6.

#### Chú thích thuật ngữ P6

- **Structural signature**: biểu diễn ổn định của cấu trúc/class/semantics để so
  sánh footer giữa route mà bỏ qua whitespace.
- **Ratio band**: nhóm tỷ lệ ngang, vuông hoặc đứng dùng để đa dạng chiều cao.
- **Entry counter**: số lần motion xuất hiện được kích hoạt khi vào viewport.
- **Rendered transform**: transform thực tế browser đang hiển thị ở frame hiện tại.

### AD-SEPT-2026-P6.1 — photo Back, footer gap và global glass endpoint

#### Scope và approval

Owner xác nhận intent rồi cho phép Codex tự duyệt spec, plan và task ngày
`2026-09-22`. Navbar “Sản phẩm quảng cáo” bị loại khỏi delta theo correction
cuối; behavior hiện hành phải giữ nguyên. Canonical spec:

- [Photo Back](../../docs/specs/advertising-photo-browse.md#delta-p61--nút-quay-lại-trong-primary-photo)
- [Glass blur/fade](../../docs/specs/advertising-skeleton-flow.md#correction-r8-accepted--glass-blur-rộng-và-white-endpoint)
- [Footer gap](../../docs/specs/frontend-brand-shell-responsive-runtime.md#correction-p61--giảm-shared-footer-top-gap)

#### Dependency graph

```text
P6.1-T01 RED contracts
    ├── P6.1-T02 photo Back
    ├── P6.1-T03 shared footer gap
    └── P6.1-T04 glass blur + white endpoint
                    ↓
             P6.1-T05 combined QA/docs/Notion
```

#### P6.1-T01: Khóa regression trước source edit

**Acceptance:** focused tests fail vì Back chưa có, footer còn `90/70/64px`,
glass còn `filter: blur(14px)` và boundary giữ ghost alpha `0.08`.
**Verify:** static contract, footer matrix, continuation browser và focused photo
Back browser. **Files:** focused tests hiện có và một Back E2E nhỏ. **Size:** M.

#### P6.1-T02: Thêm photo Back có direct fallback

**Acceptance:** grid→photo gọi native Back và phục hồi browse state; direct
photo về locale parent không query. Button `48px` ở top-left, VI/EN, keyboard,
focus-visible, không đổi navbar/Escape/morph/viewer. **Files:** Advertising
template, runtime, detail CSS. **Dependency:** T01. **Size:** M.

#### P6.1-T03: Thu gọn shared footer gap

**Acceptance:** `48px` tại `≤750px`, `64px` trên `750px` trên mọi route VI/EN;
không double gap hoặc overlap. **Files:** shared CSS, footer focused test.
**Dependency:** T01. **Size:** S.

#### P6.1-T04: Tạo global glass blur và white endpoint

**Acceptance:** glass nhắm tới `ctaHeadlineTop-cardWidth` và clamp tại đáy grid
ảnh thật; fade nhắm tới `ctaHeadlineTop-0.5×cardWidth`. Nếu hai target bị clamp
trùng nhau, giữ lead dương `1–48px` để glass luôn bắt đầu trước fade. Backdrop
blur `≥24px`; mask đạt alpha `0` đúng boundary và nền sau boundary trắng tuyệt
đối. Không blur CTA/footer, không local-space.
**Files:** skeleton runtime, detail CSS, continuation tests. **Dependency:** T01.
**Size:** M.

#### P6.1-T05: Combined QA, review và living docs

**Acceptance:** focused static/unit/browser và DevTools đạt; chạy Impeccable
detector khi CLI khả dụng, nếu không phải ghi rõ fallback browser evidence;
không console/network error mới. Update verification, STATE, plan và ba Notion
card hiện hữu; không commit/push/deploy, không gọi focused PASS là full-site
PASS. **Dependency:** T02–T04. **Size:** M.

#### Trạng thái thực thi P6.1 — 22/09/2026

- [x] T01: RED xác nhận Back chưa có, footer còn gap cũ và global glass vars
  chưa tồn tại.
- [x] T02: Back `48px` đạt grid-history và direct fallback VI/EN tại
  `390×844` và `1440×900`.
- [x] T03: shared footer gap đạt `192/192` route/locale/viewport checks.
- [x] T04: global backdrop blur `28px`, fade có lead dương và endpoint `#fff`;
  continuation VI/EN bốn viewport đạt.
- [x] T05: focused static/unit/browser đạt; docs và ba Notion card đã đồng bộ.
  Owner visual gate vẫn mở; không commit, push hoặc deploy.

#### Rủi ro và rollback P6.1

- Native Back có thể rời site từ deep link: direct-root guard bắt buộc fallback
  parent không query.
- Backdrop blur có thể tạo stacking/paint seam: pseudo-element không interactive,
  test pixel endpoint và cap đúng skeleton boundary.
- Footer gap có thể bị section margin cộng đôi: đo bbox trên toàn route matrix.
- Rollback theo từng hunk T02/T03/T04; `.site-output` chỉ rebuild.

### AD-SEPT-2026-P6.2 — shared glass photo overflow và control correction

#### Scope và approval

Owner xác nhận intent rồi cho phép Codex tự duyệt spec, plan và task ngày
`2026-09-22`. P6.2 supersede riêng photo Back của P6.1 và chuẩn hóa glass giữa
skeleton boundary với primary photo overflow. Canonical spec:

- [Photo P6.2](../../docs/specs/advertising-photo-browse.md#correction-p62-accepted--shared-glass-control-cân-biên-và-bỏ-back)
- [Skeleton R9](../../docs/specs/advertising-skeleton-flow.md#correction-r9-accepted--shared-glass-surface-với-photo-overflow)

#### Dependency graph

```text
P6.2-T01 RED contracts
    └── P6.2-T02 shared glass + bỏ Back + control/icon
                         ↓
                  P6.2-T03 focused QA/docs
```

#### P6.2-T01: Khóa regression trước source edit

**Acceptance:** static/unit/E2E fail vì Back còn tồn tại, photo source còn sở
hữu blur, glass chưa dùng chung token và expand control chưa cân hai biên.
**Files:** focused static, skeleton và primary photo tests. **Size:** S.

#### P6.2-T02: Chuẩn hóa shared glass và photo controls

**Acceptance:** skeleton/photo dùng cùng `28px/1.08/1.04/0.12`; skeleton giữ
global mask và glass lan tới hai mép viewport mà không đổi grid hoặc tạo
horizontal overflow; photo glass đồng nhất; source image chỉ opacity/transform.
Xóa Back khỏi markup/runtime/CSS. Expand có inset hai đầu lệch tối đa `1px`;
expand/reset dùng cùng icon hai mũi tên chéo ít nét. **Dependency:** T01.
**Size:** M.

#### P6.2-T03: Focused QA và living docs

**Acceptance:** static/unit, primary geometry, viewer controls và browser
computed style đạt; Chromium/Firefox/WebKit không regression. Cập nhật spec,
motion, verification, STATE; không commit/push/deploy và không gọi focused PASS
là full-site PASS. **Dependency:** T02. **Size:** M.

#### Trạng thái thực thi P6.2 — 22/09/2026

- [x] T01: RED bắt đúng Back, blur ownership, token và inset/icon cũ.
- [x] T02: source đã dùng shared glass; skeleton glass full-bleed; Back bị xóa;
  control/icon đúng contract.
- [x] T03: static/unit, primary geometry, three-engine viewer, continuation và
  transition gate đạt; living docs đã đồng bộ. Owner visual gate còn mở.

#### Rủi ro và rollback P6.2

- Pseudo-element glass có thể che control: khóa stacking và `pointer-events:none`.
- Thay icon có thể làm lệch optical inset: đo rect label/icon trong browser.
- Rollback theo hunk shared glass hoặc control; không phục hồi Back P6.1.

### AD-SEPT-2026-P7 — mobile tail, Pinterest primary, hero one-shot và shared header

#### Scope và approval

Owner xác nhận toàn bộ interview ngày `2026-09-22`, cho phép Codex tự duyệt
spec, plan và task; owner kiểm kết quả cuối. Canonical module boundary nằm tại
`docs/specs/advertising-september-2026-capability-map.md`. Dùng native Codex
worker/reviewer; không dùng workflow subagent riêng. Không stage, commit, push,
deploy, cài dependency hoặc chỉnh `.site-output/` trực tiếp.

#### Dependency graph

```text
P7-T01 regression RED
   ├─ P7-T02 hero one-shot
   ├─ P7-T03 skeleton mobile tail + glass
   │       └─ P7-T04 Pinterest primary + pager
   └─ P7-T05 shared header menu
P7-T02..T05 ──> P7-T06 combined QA/review/docs
```

T03 và T04 chạy tuần tự vì cùng sở hữu `catalog-runtime.mjs`/`detail.css`.
T05 chỉ patch shared menu boundary sau khi T04 ổn định. Main agent giữ intent,
architecture, diff inspection và acceptance; worker không được reset worktree.

#### P7-T01: Khóa regression trước source edit

**Acceptance:** test RED đúng bốn capability mới: delayed catalog click gây
hero remount; preset Scale chưa 100/tail mobile còn quá nhiều canvas; primary
mode còn breakpoint và inner scroll; Advertising menu CTA đang bị ẩn/lệch.
Không sửa production source. **Size:** M.

- Unit: preset/anchor P100, tail solver N1/N2, full-span primary và suggestion
  rank 0.
- Browser: delayed import + `End/Home/filter`, A54 `360×800`, pager input/page
  scroll, menu matrix.
- Ghi baseline performance ba lượt `5s`; không gọi emulation là proof thiết bị
  thật nếu chưa chạy trên Galaxy A54.

#### P7-T02: Hero one-shot và pre-adapter filter queue

**Acceptance:** plain filter click trước adapter bị synchronous shell chặn khỏi
Barba/native navigation, giữ latest intent và chuyển đúng một lần khi catalog
ready. Không XHR document query, không đổi hero/container identity, không replay
motion. Modifier click và fallback link còn usable. **Dependency:** T01.
**Size:** M.

#### P7-T03: Scale 100, tail solver và unified Glassmorphism

**Acceptance:** 12 preset giữ Feral Field/Finish trừ Scale 100; anchor P100
frozen; pool random/permutation/direction giữ contract. A54 tạo tối đa hai
canvas, không hạ renderer quality. Skeleton + CTA + shared footer vừa trọn một
viewport. Một full-bleed surface chạy `clear → blur/tint → white`; CTA/footer
clear, endpoint trắng tinh. **Dependency:** T01. **Size:** L.

#### P7-T04: Pinterest primary, pager và suggestion-first

**Acceptance:** Pinterest mode dựa `primarySpan === totalColumns`; group đúng
`100dvh`, ảnh tối thiểu 72%, mô tả tối đa 28%, zoom-glass chỉ khi contain tạo
phần dư. Description không inner scroll, dùng swipe/drag/delta-x/arrows và
indicator; pan-y/wheel dọc luôn cuộn page. Suggestion là cell đầu related grid;
fullscreen viewer giữ zoom/pan. Không thêm Back. **Dependency:** T03.
**Size:** L.

#### P7-T05: Shared header/menu correction

**Acceptance:** năm source route dùng CTA menu `Gọi Zalo tư vấn` / `Talk to us
on Zalo`, cùng link hiện hữu, nằm trước X. Advertising không ẩn CTA menu; CTA/X
căn cùng right gutter. Logo/nav/hamburger/state machine và breakpoint đã duyệt
không đổi quá `1px`. **Dependency:** T01; apply sau T04. **Size:** M.

#### P7-T06: Combined QA, review và living docs

**Acceptance:** focused Node/static/build green; browser matrix VI/EN,
`360×800`, `390×844`, `768×1024`, `1004×900`, `1005×900`, `1440×900`,
`1922×912` green cho filter/history, tail/glass, pager/touch/viewer, menu/footer.
Native code review và Ponytail review không còn finding quan trọng. Cập nhật
spec, STATE, verification và current hashes; performance/device giới hạn được
ghi OPEN nếu chưa có proof. **Dependency:** T02–T05. **Size:** L.

#### Rủi ro và rollback P7

- Filter queue có thể nuốt modifier click: khóa predicate plain-primary và test
  fallback trước khi đổi handler chung.
- Tail budget phụ thuộc footer dynamic: đo DOM, không hardcode 222/330px.
- Pager và vertical scroll tranh pointer: chỉ claim horizontal intent sau
  threshold; giữ `touch-action:pan-y`.
- Suggestion-first supersede cột 4 ảnh thật: test visual/DOM/ARIA order và
  continuity, không giữ hai rule xung đột.
- Rollback theo từng task/hunk; không hoàn nguyên P6.2 hoặc unrelated worktree.

#### Checkpoint triển khai P7 — 2026-09-23

P7-T01–P7-T05 đã triển khai. P7-T06 đạt focused functional gate cho build,
static, hero one-shot, skeleton contract, layout, Pinterest primary VI/EN và
shared header VI/EN; xem
[evidence P7](../../docs/verification/advertising-september-2026-p2-p7.md).
Synthetic A54 profile đạt gate `30fps`; performance trên Galaxy A54 thật vẫn
OPEN. Owner visual gate và P3-T08 còn mở. Không stage, commit, push hoặc deploy.

### AD-SEPT-2026-P7.1 — organic tail và correction P7 regression

#### Scope và approval

Owner xác nhận intent ngày `2026-09-23` và đã giao Codex tự duyệt plan/task,
owner kiểm kết quả cuối. [Spec P7.1](../../docs/specs/advertising-skeleton-flow.md#correction-p71--organic-continuation-và-paint-overflow)
giữ bốn module id cũ. Plan này được duyệt theo ủy quyền đó. Không stage,
commit, push hoặc deploy; giữ P3-T08 trước ship và actual-device gate riêng.
T01–T05 đã qua focused technical gate ngày `2026-09-23`; xem
[evidence P7.1/P7.2](../../docs/verification/advertising-september-p7-1-p7-2-2026-09-23.md).

#### Dependency và ownership

```text
P7.1-T01 shared navbar geometry + bottom intent ─────┐
P7.1-T02 hero document-once regression ───────────────┤
P7.1-T03 organic skeleton + CTA/footer tail ──────────┤
             └─ P7.1-T04 conditional suggestion ──────┤
                          P7.1-T05 integrated QA/docs ┘
```

T01 và T02 độc lập. T03 trước T04 vì cùng `catalog-runtime.mjs` và solver.
Mỗi slice viết regression RED, sửa đúng ownership rồi chạy focused gate.

#### P7.1-T01: Phục hồi shared navbar và sửa bottom clamp

**Acceptance:** bốn width band đúng top/collapsed height trong spec và nav
link giữ `left`/width trong `1px`; chạm đáy/overscroll/content resize không
reveal, chỉ upward intent thật qua threshold mới reveal; logo/CTA/menu state
P7 vẫn dùng được. **Verify:** shared-header browser VI/EN, top/collapse/bottom/
upward, keyboard/touch/Locomotive/native, reduced motion. **Files:**
`src/site/style.css`, `src/site/motion.js`, focused header test. **Size:** M.

#### P7.1-T02: Hero document-once khi filter và remount

**Acceptance:** filter trước/sau adapter, End/Home, history nội bộ và DOM
remount không replay hero trong cùng document; reload/real document navigation
được chạy lại. **Verify:** delayed/ready/fail-open hero browser regression cùng
animation count qua mười filter activation. **Files:** `src/site/detail.js`,
`tests/site/advertising-hero-once.e2e.mjs` và chỉ những assertion legacy
liên quan nếu contract cũ trái P7.1.
**Size:** M.

#### P7.1-T03: Skeleton nối masonry và tail viewport

**Acceptance:** skeleton vào cùng shortest frontier của card thật, số card
adaptive nhỏ nhất, không row seam/overlap; mobile tối đa hai WebGL context.
Visual overflow không đổi document height/hit testing; CTA và toàn footer ở
final viewport, glass R10 full bleed và endpoint trắng. **Verify:** layout
unit, skeleton contract, continuation browser VI/EN desktop/A54, computed
geometry/scrollHeight, performance synthetic. **Files:**
`layout-core.mjs`, `catalog-runtime.mjs`, `skeleton-flow.mjs`, `detail.css`,
focused tests. **Size:** L, chia thành placement và boundary slices.

#### P7.1-T04: Suggestion theo full-span hoặc split

**Acceptance:** split đưa cùng suggestion về primary info; full-span là cell
related đầu. Resize qua boundary chỉ có một DOM/accessibility region, giữ
active state/photo/tag/history; related card ảnh vẫn liên tục. **Verify:**
layout unit và P14 browser tại `719/720/1004/1005/1440px`, VI/EN, resize hai
chiều. **Files:** `catalog-runtime.mjs`, `detail.css`, focused tests. **Size:** M.

#### P7.1-T05: Integrated QA, review và living docs

**Acceptance:** build/static, focused browser matrix và `git diff --check`
đạt; owner specs, STATE, verification phản ánh cùng status. Independent review
không còn Critical/Important. Không gọi focused pass là full-site parity pass.
**Verify:** `pnpm prepare:site`, `pnpm qa:static`, hero, skeleton,
continuation, P14 và header suites; kiểm local DevTools tại `360×800`,
`1005×900`, `1569×912`, VI/EN. **Files:** verification, index, STATE và owner
spec. **Size:** M.

#### Checkpoint

- Sau T01/T02: navbar và hero regression xanh, chưa chạm grid.
- Sau T03: tail viewport và glass xanh trước khi chuyển suggestion.
- Sau T04/T05: combined matrix, review và docs xanh; owner visual gate mở.

#### Rủi ro và rollback

- Logo top/collapsed khác kích thước có thể kéo nav: đo nav links và header
  height ở bốn band, chỉ rollback CSS hunk geometry.
- Browser bottom clamp có thể tạo false upward event: dùng scroll intent thật,
  kiểm End/touch/wheel/resize và rollback riêng controller hunk.
- Skeleton overflow có thể che footer: kiểm stacking/pointer và white endpoint,
  rollback riêng layout/paint hunk, không đổi glass token.
- Suggestion reparent có thể mất listener: dùng một node và giữ state, kiểm
  resize qua boundary hai hướng trước tích hợp.

### AD-SEPT-2026-P7.2 — độ tối portal và primary full-span theo nội dung

Owner xác nhận intent ngày 2026-09-23 và đã giao Codex tự duyệt plan/task;
[spec P7.2](../../docs/specs/advertising-photo-browse.md#correction-p72--primary-full-span-cao-theo-nội-dung)
là contract. Plan được duyệt theo ủy quyền đó. P7.1 CTA clipping được đóng bằng
regression riêng trước P7.2. Không đổi split, skeleton glass hoặc navbar.
T01–T03 đã qua focused technical gate ngày `2026-09-23`; owner visual và
thiết bị thật vẫn mở trong [evidence](../../docs/verification/advertising-september-p7-1-p7-2-2026-09-23.md).

#### P7.2-T01: Một độ tối cho portal và suggestion inactive

**Acceptance:** computed overlay của hai UI bằng nhau ở normal, hover và focus;
active suggestion vẫn trắng/đen; shared media zoom còn mượt. **Verify:** RED
style regression, browser hover/focus VI/EN và screenshot cạnh reference owner.
**Files:** `src/site/style.css`, `src/site/detail.css`, focused tests. **Size:** M.

#### P7.2-T02: Primary full-span cao theo nội dung

**Acceptance:** chiều cao primary bằng ảnh giữ ratio + mô tả tự nhiên + gap khi
dưới `100dvh`; mô tả tối đa `28% viewport`; khi chạm trần chỉ có side overflow
và side zoom-glass. Split giữ geometry cũ, pager/scroll/viewer không regression.
**Verify:** RED unit geometry, browser bbox VI/EN `360×800`, `390×844`,
`756×910`, `768×1024`, `1004×900`, `1005×900`, swipe/vertical pan và
landscape/portrait. **Files:** `layout-core.mjs`, `detail.css`, focused tests;
`catalog-runtime.mjs` chỉ nếu phép đo mô tả sai. **Size:** M.

#### P7.2-T03: Integrated QA, review và living docs

**Acceptance:** build/static/focused browser đạt, không còn lỗi Critical hoặc
Important trong diff, owner specs và STATE không giữ claim `100dvh` cố định.
**Verify:** `pnpm prepare:site`, `pnpm qa:static`, suites geometry, primary,
suggestion, continuation và hover; screenshot mobile/desktop, `git diff --check`.
**Files:** owner specs, STATE, verification/index. **Size:** M.

#### Checkpoint và rollback

- Sau T01: overlay bằng nhau và active state không đổi.
- Sau T02: full-span tự nhiên, split không đổi; ảnh không crop/top-bottom blur.
- Sau T03: scoped technical gate; owner visual gate và actual-device vẫn mở.
- Rollback theo hunk overlay hoặc geometry; giữ P7.1 và mọi unrelated worktree.

### AD-SEPT-2026-P7.3 — viewport thực, nav một hàng và resize suggestion

Owner xác nhận ngày 2026-09-23 và đã ủy quyền Codex tự duyệt task/plan. Scope
chỉ gồm ba correction trên các module đã có; không đổi split geometry, media,
Glassmorphism, logo hay full menu.

1. **Primary full-span:** cap ảnh + mô tả theo phần viewport còn lại dưới
   navbar và gap, giữ chiều cao tự nhiên khi thấp hơn cap. Kiểm ảnh dọc/ngang
   VI/EN tại `756×910` và `954×910`.
2. **Shared navbar:** đo khả năng nằm một hàng từ layout thật; ẩn toàn bộ link
   và bỏ khỏi focus order khi thiếu chỗ, hiện lại khi đủ. Xóa bố cục hai hàng
   `751–960px`; kiểm homepage/detail VI/EN, resize và text lớn.
3. **Suggestion resize:** xóa định vị masonry khi chuyển full-span → split;
   kiểm không đè mô tả, split → full-span, inactive có ảnh không viền đen và
   active giữ viền đen/nền trắng. Build, static và focused browser là gate;
   owner visual, thiết bị thật, full-site parity vẫn mở.

### MENU-R1 — menu mở theo Espacio

Spec owner duyệt ngày 2026-09-24:
[menu parity](../../docs/specs/full-menu-reference-parity.md).
Owner duyệt plan ngày2026-09-24. Đây là phần tiếp tục correction shared menu trong
cùng initiative; giữ nguyên mọi task cũ. Main thực hiện tuần tự vì cùng CSS.
Ước lượng 45–60 phút, khoảng 120–190 dòng source/test; không thêm dependency.
Không tự tạo hoặc đổi card Notion; chỉ mục công việc giữ tại plan này đến
khi có chỉ định tracker của owner.

1. **MENU-T01 — khóa phép đo và regression (10–15 phút).** Xác minh breakpoint
   hai phía, chụp menu desktop/mobile; ghi baseline navbar đóng. Thêm focused
   regression `tests/site/menu-reference-parity.e2e.mjs` cho header/menu group,
   VI/EN, resize, overflow và scroll. Gate: tái hiện lệch hiện tại trước sửa.
2. **MENU-T02 — sửa menu chung (20–25 phút), sau T01.** Sửa selector menu trong
   `src/site/style.css`: track CTA/ngôn ngữ/X, bề ngang, logo menu, dòng mobile,
   typography và khoảng cách nhóm. Chỉ sửa `src/site/motion.js` nếu phép đo
   chứng minh lifecycle menu cần thay để đáp ứng spec. Gate: geometry theo
   spec trong1px, không clip/chồng, navbar đóng giữ baseline. Không đổi SVG,
   nội dung hoặc tạo fork riêng theo route.
3. **MENU-T03 — nghiệm thu focused (15–20 phút), sau T02.** Chạy
   `pnpm prepare:site`, `pnpm qa:static`,
   `node tests/site/menu-reference-parity.e2e.mjs`; kiểm live cùng viewport,
   năm route VI/EN, keyboard/Escape, reduced motion, touch scroll và landscape.
   Chạy Impeccable detect, review diff; cập nhật spec, DESIGN nếu token thay,
   evidence và STATE. Mở preview cho owner. Không suy ra thiết bị thật hoặc
   full-site parity đạt từ emulation.

Checkpoint sau T02: build và focused regression đạt trước round visual.
Kết quả24/09: T01–T03 đạt focused technical gate; geometry28, flow10,
text zoom2, static/build, Node7/7. Owner visual và thiết bị thật còn mở.
Xem [evidence](../../docs/verification/menu-reference-parity-2026-09-24.md).
Rủi ro chính: chữ Việt dài và logo rộng hơn reference; giữ ratio, cho chữ wrap,
không co glyph để ép parity. Scrollbar không được trừ hai lần khỏi menu head.
Rollback chỉ các hunk MENU-R1; không revert worktree chung. Không commit/push/deploy.

## Chú thích thuật ngữ

- **Source owner**: người chịu trách nhiệm sửa source trong task.
- **Tracking gate**: owner cho phép tạo hoặc link work item trước implementation.
- **Fail-open**: native scrolling vẫn dùng được khi smooth dependency không chạy.
- **Predicate**: điều kiện đo được để chờ hoặc kiểm state, thay vì thời gian đoán.
- **Scoped technical work**: phần implementation có scope/evidence rõ; không là release hoặc nghiệm thu mọi thiết bị.
- **Stable metrics**: kích thước layout không đổi theo browser toolbar, khác vùng nhìn thực.
- **Contract probe**: fixture kiểm giao diện metrics và behavior; không thay thao tác native trên điện thoại.
- **Seed**: giá trị chọn thứ tự random, được dùng lại khi phục hồi lượt duyệt.
- **Soft score**: điểm nhịp cao–thấp/so le; có thể nới để giữ hard contract.
- **Cold run**: lượt tải không dùng body ảnh trong cache browser.
- **Candidate**: build đã qua local QA, chờ owner duyệt phát hành/đo Sites.
- **Tracked**: file Git đang quản lý, xóa vẫn khôi phục được từ history.
- **Untracked**: file Git chưa quản lý, xóa là mất.
- **Supersede**: quyết định mới thay quyết định cũ.
- **Ledger**: một file tổng hợp nhiều lần kiểm theo thứ tự.
- **Trim**: cắt phần thừa trong file, giữ contract.
- **Mapping**: đường dẫn trước và sau được đề xuất.
- **Sink**: path script đọc/ghi, cần compatibility.
- **SHA256**: dấu kiểm byte để chứng minh bảo toàn.
- **Synthesis**: tổng hợp facts có nguồn, không thay evidence gốc.
- **Pure layout core**: module thuật toán không đọc DOM, network hoặc trạng thái
- **Artifact**: data build-time được runtime public đọc, không phải source CMS.
- **Shortest-column**: đặt card kế tiếp vào cột có đáy thấp nhất.
- **Immutable prefix**: card đã append giữ nguyên thứ tự và tọa độ khi nối data.
- **Fail-closed**: dừng rõ ràng khi version/schema sai thay vì render nửa đúng.
- **Reserved brick**: vùng primary tham gia cùng coordinate space như một item đã
- **Media lane**: ownership theo một category để các batch ảnh không xung đột.
- **Source ID**: danh tính ảnh gốc; crop/export lại cùng source không thành ảnh mới.
- **Contact sheet**: bảng thumbnail dùng để review uniqueness và composition.
- **Composition config**: dữ liệu xác định block order và media của một route.
- **Media partition**: chia toàn bộ source thành các slot không thiếu và không lặp.
- **RED**: regression test thất bại vì behavior mới chưa được triển khai.
- **Go/no-go**: điểm quyết định có tiếp tục rollout theo số đo hay dừng.
- **Reserved frame**: khung ảnh dành đúng tỷ lệ trước khi tải.
- **Selective transfer**: chỉ chuyển file task đã sở hữu sang worktree mới.
- **Ancestor opacity**: opacity của phần tử cha có thể làm ảnh con vô hình dù ảnh
- **Composition**: thứ tự và tổ hợp block tạo nhịp riêng cho một route.
