---
title: Audit source và phân loại file toàn project
date: 2026-08-25
category: verification
related_specs:
  - ../specs/frontend-route-and-content.md
related_decisions:
  - ../decisions/git-notion-governance.md
---

# Audit source và phân loại file toàn project

## Phạm vi

Audit toàn repository theo hai trục độc lập:

1. Lifecycle: `live`, `dev`, `generated`, `research` hoặc `cache`.
2. Git: tracked, tracked-deleted, modified hoặc untracked.

Chỉ source/project file Git quản lý mới được xét xóa. Generated output,
research archive, tooling cache và toàn bộ untracked worktree chỉ được phân loại;
không file nào trong các nhóm này bị xóa, stage hoặc commit. Public site và UI
behavior không nằm trong phạm vi thay đổi.

## Snapshot Git

Snapshot sau thay đổi audit:

| Trạng thái | Số path | Xử lý |
| --- | ---: | --- |
| Tracked trong Git index | 498 | Nguồn tập ứng viên ban đầu |
| Tracked còn hiện diện | 65 | 47 path có local modification cần bảo toàn |
| Tracked-deleted trong worktree | 433 | 432 path đã bị xóa trước audit; audit chỉ thêm một deletion |
| Untracked còn hiện qua Git | 164 | Review theo path; không suy ra là file thừa |

Các raw artifact mới được ignore đúng ownership, làm danh sách untracked hiện
qua Git giảm từ 99.483 xuống 164 path. Đây là thay đổi phân loại, không phải xóa
dữ liệu trên disk.

### Untracked còn hiện qua Git

| Nhóm | Số path | Phân loại |
| --- | ---: | --- |
| `.openai/hosting.json`, `.vscode/tasks.json` | 2 | Live config và dev config |
| `docs/` | 79 | Project knowledge đang phát triển |
| `scripts/` | 17 | Project tooling đang phát triển |
| `source-assets/projects/` | 4 | Dev source media, không deploy |
| `src/db/` | 1 | Dev CMS migration |
| `src/site/` | 56 | Live public source và asset |
| `tests/` | 5 | Project QA |

## Inventory ngoài Git index

Các số dưới đây là snapshot read-only trên disk. Chúng không phải deletion
candidate của lượt này.

| Path | Lifecycle | File | Byte | Quy tắc |
| --- | --- | ---: | ---: | --- |
| `.site-output/` | Generated output | 65 | 6.887.834 | Tạo lại từ `src/site/`, không edit/commit |
| `.tmp/` | Generated local | 280 | 206.266.064 | Probe/retry local, Git ignore |
| `tmp-layout-motion-*` | Generated local | 1.267 | 991.610.733 | Parity artifact, Git ignore |
| `.tooling/` | Tooling cache/state | 20.926 | 2.865.915.483 | Tool sở hữu, Git ignore |
| `graphify-out/` | Tooling generated | 303 | 15.847.571 | Structural output, Git ignore |
| `.wrangler/` | Tooling cache | 21 | 22.633.826 | Wrangler state, Git ignore |
| `node_modules/` | Dependency cache | 1.857 | 315.658.250 | Package manager sở hữu |
| `research/reference-site/archive/` | Research archive | 5.810 | 1.061.619.122 | Chỉ đối chiếu, không deploy |
| `research/reference-site/runtime-evidence/` | Generated evidence | 97.770 | 53.728.512.393 | Raw runtime evidence, Git ignore |
| `docs/reports/*.csv`, `*.bak` | Generated evidence | 12 | 3.433.633.345 | Raw ledger/backup, Markdown summary mới là project file |

Canonical tree và chú thích ownership nằm ở
[`README.md`](../../README.md#cây-thư-mục-và-trạng-thái). Routing ngắn cho agent
nằm ở [`AGENTS.md`](../../AGENTS.md#routing-theo-path).

## Deletion ledger

| Path | Evidence consumer/runtime | Thay đổi | Khôi phục |
| --- | --- | --- | --- |
| `src/site/products.js` | Không HTML hiện tại load file; markup product-directory đã retire; filter hiện do `detail.js` sở hữu; static contract xác nhận runtime cũ không còn | Xóa 78 dòng, 3.573 byte; tăng regression để cấm file hoặc script tag quay lại | `git show HEAD:src/site/products.js` hoặc Git history |

Đây là deletion duy nhất của audit. Không có tracked asset nào được xóa thêm.
Trong 54 asset hiện tại dưới `src/site/assets/`, cả 54 có consumer trong source,
script hoặc test; không có nhóm trùng SHA-256. 45 asset path tracked cũ đã ở trạng
thái deleted trước audit và không bị thay đổi trong lượt này.

## Candidate được bảo toàn hoặc defer

| Candidate | Quyết định | Evidence |
| --- | --- | --- |
| `src/admin/`, `src/db/migrations/` | Bảo toàn | CMS dev source có dependency schema, contract test và local work đang phát triển |
| Tracked tooling script | Bảo toàn | Mỗi script có consumer từ package command, docs, test hoặc helper khác |
| `.serena/memories/memory_maintenance.md` | Bảo toàn | Serena tự discover memory này trong project |
| Parity mapping còn trỏ `src/site/products.js` | Defer | `generate-motion-obligations.mjs` và `run-layout-motion-parity.mjs` còn binding lịch sử; sửa binding/coverage contract chưa được owner cho phép |
| Report lịch sử nhắc `products.js` | Bảo toàn | Là evidence của snapshot cũ, không rewrite lịch sử |

## Thay đổi project file

- `.gitignore`: ignore raw parity/runtime evidence, `.tmp`, CSV và backup report.
- `README.md`: thêm canonical annotated tree và ownership theo lifecycle/Git.
- `AGENTS.md`: thêm routing tree ngắn, link về README và boundary không bulk
  delete/stage/commit.
- `docs/engineering/ARCHITECTURE.md` và route spec: bỏ runtime product-directory
  đã retire; filter tiếp tục do `detail.js` sở hữu.
- `tests/site/site.e2e.cjs`: cấm `products.js`, script tag và trigger cũ quay lại.

## Verification

| Gate | Kết quả | Evidence |
| --- | --- | --- |
| Graphify structural query | Blocked | `Access denied` khi ghi `.tooling/logs/graphify-fallback-*.log` và `.tooling/state/graphify/graphify.lock`; không semantic update |
| Serena/source search | Pass | Project active, LSP ready; exact reference/consumer search dùng làm fallback |
| Baseline `pnpm qa:static` | Pass | Static source contract pass trước deletion |
| Baseline `pnpm qa:client-assets` | Pass | Client asset contract pass trước deletion |
| Baseline `pnpm qa:worker:static` | Pass | Worker route/static contract pass trước deletion trên local preview |
| Post-change `pnpm qa:static` | Pass | Regression mới xác nhận runtime product-directory đã retire |
| Post-change `pnpm qa:client-assets` | Pass | 54 asset hiện tại giữ nguyên contract |
| `node --check` | Pass | Build script và site E2E parse hợp lệ |
| `git diff --check` | Pass | Không có whitespace error; chỉ có cảnh báo CRLF có sẵn |
| Modified Markdown local links | Pass | Không target local nào bị thiếu |
| Live HTML reference audit | Pass | Không còn `products.js` hoặc `data-product-directory` trong HTML public |
| Post-change `pnpm prepare:site` | Pass | Chạy ngoài sandbox; output mới có 64 file bằng source và không còn `products.js` |
| Post-change `pnpm qa:worker:static` | Pass | Static route, locale, redirect và sitemap pass trên fresh output |
| VI/EN HTTP smoke | Pass | `/vi/` và `/en/` đều trả HTTP `200` |
| Playwright, DevTools, Computer Use | Not required | Không đổi visible UI/behavior; source, build và Worker contract là proof set đủ cho cleanup |

Các lần build trong sandbox trả `EPERM` tại `rmdir .site-output`. Cùng command
chạy ngoài sandbox đã pass, chứng minh nguyên nhân là sandbox chặn recursive
delete, không phải external directory handle. Local Wrangler server chỉ phục vụ
smoke test, sau đó đã dừng đúng session.

## Kết luận

Inventory, ownership docs, ignore boundary, source deletion, fresh build và
Worker smoke đã hoàn tất. Notion card đủ điều kiện chuyển `Done`. Public Codex
Site không thay đổi.

## Việc tiếp theo

Không còn action trong scope audit. Parity 1:1 và Sites publish là work item
riêng, tiếp tục theo `docs/STATE.md`.

## Chú thích thuật ngữ

- **Lifecycle**: trạng thái sử dụng của path, độc lập với trạng thái Git.
- **Deletion ledger**: bảng nêu file xóa, bằng chứng và cách khôi phục.
- **Generated output**: file tạo từ source bằng build, không edit trực tiếp.
- **Sandbox**: môi trường giới hạn quyền filesystem/process của command.
- **Static contract**: kiểm tra tự động trên source mà không cần browser runtime.
- **Consumer**: code, test, command hoặc tài liệu đang dùng một file/interface.
- **Defer**: chủ động để lại vì ngoài quyền hoặc phạm vi hiện tại.
