---
title: Hệ thống tài liệu gọn, spec sống theo code
status: accepted
updated: 2026-10-04
source:
  - scripts/docs/**
  - .github/pull_request_template.md
  - .github/workflows/docs.yml
tests:
  - scripts/docs/check-docs.mjs
notion: none
---

# Hệ thống tài liệu gọn, spec sống theo code

## Mục đích

Owner đọc được toàn bộ tài liệu đang có hiệu lực; agent mới đọc một spec là
implement đúng, không phải lần qua lịch sử. Mỗi phần website có đúng một spec
mô tả code đang chạy; code đổi thì spec đổi trong cùng PR. Ngôn ngữ thiết kế
nằm trong một Design System dùng chung cho website, Impeccable và claude.ai.

## Chuẩn áp dụng

Giữ agent-skills (đã cài, lifecycle trong `AGENTS.md`); không cài spec-kit.

| Tiêu chí | agent-skills | spec-kit |
| --- | --- | --- |
| Đã có trong stack | Có, plugin pin | Không, cần CLI Python `specify` |
| Định dạng spec | Không ép, cho phép giữ format project | `specs/NNN-feature/` theo từng feature |
| Spec hiện hành theo phần website | Tự tổ chức được | Không có sẵn; spec tích theo feature |
| Command | `/spec`, `/plan`, `/build` | `/speckit-*` trùng vai trò |

Mượn từ spec-kit: marker `[CẦN LÀM RÕ: câu hỏi]` thay cho đoán. Mượn cách tách
của OpenSpec: spec mô tả sự thật hiện tại; thay đổi đang làm là diff của PR.

## Yêu cầu

### R1. Cấu trúc tài liệu

Cây đích (mọi path khác dưới `docs/` bị xóa hoặc gộp):

```text
AGENTS.md, CLAUDE.md, README.md   rule agent, lối vào
PRODUCT.md                        product truth (Impeccable đọc)
DESIGN.md                         GENERATED từ design-system/ (Impeccable đọc)
design-system/                    nguồn chuẩn visual, publish lên claude.ai
.impeccable/surfaces/             brief theo route, chỉ link design-system
docs/STATE.md                     snapshot ngắn
docs/index.md                     bản đồ tài liệu
docs/goal.md, docs/terminology.md
docs/architecture.md              runtime, build, ranh giới CMS
docs/specs/<capability>.md        spec sống, một file một capability
docs/decisions/<slug>.md          ADR còn hiệu lực
docs/operations/*.md              runbook: tooling, release, thiết bị, Notion
tasks/plan.md, tasks/todo.md      thay đổi đang làm, xóa phần đã xong
```

```gherkin
Given cây tài liệu sau đại tu
When liệt kê file Markdown dưới docs/
Then không còn docs/verification/, docs/archive/, docs/reports/,
  docs/design/, docs/frontend/, docs/backend/
And mọi link Markdown nội bộ trỏ tới file và anchor tồn tại
```

### R2. Capability map và spec sống

| ID | Spec | Source chính |
| --- | --- | --- |
| shell | `site-shell.md` | header, menu, footer, locale, chuyển trang, scrollbar; `style.css`, `motion.js` |
| home | `page-home.md` | `src/site/index.html` |
| detail-pages | `detail-pages.md` | residential, commercial, about; `detail.css`, `detail.js` |
| adv-masonry | `advertising-masonry.md` | `advertising-products/index.html`, catalog, layout, random, skeleton |
| adv-detail | `advertising-detail.md` | `?photo=`: primary, related, suggestion, viewer |
| media | `media-delivery.md` | biến thể ảnh, vòng tải, media-card |
| release | `static-release.md` | `scripts/site/`, preview, demo Cloudflare |
| cms | `cms.md` | `src/worker/`, `src/admin/`, `src/db/` (dormant, planned) |

Mỗi spec theo `docs/specs/_template.md` mới:

1. Frontmatter: `title`, `status` (`live`, `planned`, `dormant`),
   `source` (glob file spec sở hữu), `tests` (file test), `notion` (link card
   hoặc `none`), `updated`.
2. `## Mục đích`: tối đa 5 dòng.
3. `## Hành vi`: requirement đánh số `R1..Rn`, mỗi requirement có ít nhất một
   scenario Gherkin; câu không chắc ghi `[CẦN LÀM RÕ: ...]`.
4. `## Giao diện và dữ liệu`: bảng DOM hook, attribute, data file, hàm public.
5. `## UI`: link tới component trong `design-system/`; không chép token.
6. `## Kiểm tra`: bảng `R` -> test hoặc command; requirement chưa có test ghi
   "chưa có test".
7. `## Gate còn mở`: chỉ việc NOT PASS chưa đóng; xóa dòng khi đóng.
8. `## Chú thích thuật ngữ`.

Không có mục lịch sử, delta, correction hay evidence có ngày; Git log và PR giữ.

```gherkin
Given một spec trong docs/specs/
When owner đọc file
Then file dài tối đa 300 dòng
And mọi câu mô tả hành vi khớp source hiện tại hoặc nằm trong "Gate còn mở"
```

### R3. Spec được viết lại từ code

Spec mới viết từ source và test hiện tại, không chép từ spec cũ. Spec cũ chỉ
dùng để tìm intent owner đã duyệt. Khi intent đã duyệt khác code, ghi khác biệt
vào "Gate còn mở" và hỏi owner; không tự sửa code hoặc spec cho khớp.

### R4. Đổi code là đổi spec

`pnpm qa:docs` (thêm vào CI) chạy bốn check:

| Check | Fail khi |
| --- | --- |
| ownership | File trong `src/site/` (trừ media) không thuộc `source` của spec nào |
| sync | PR đổi file thuộc `source` của spec mà không đổi spec đó, và mô tả PR không có dòng `Spec: không đổi - <lý do>` |
| budget | Spec quá 300 dòng, `STATE.md` quá 50 dòng, `index.md` quá 80 dòng |
| links | Link Markdown nội bộ hoặc anchor gãy |

```gherkin
Given PR sửa src/site/advertising-products/layout-core.mjs
And không sửa docs/specs/advertising-masonry.md
And mô tả PR không có dòng "Spec: không đổi - ..."
When CI chạy pnpm qa:docs
Then check sync fail và nêu tên spec cần cập nhật
```

Spec tham gia ownership và sync qua danh sách glob `source:` trong frontmatter;
`_template.md` không tham gia. Sync chạy trong workflow `docs.yml` trên mọi PR,
kể cả khi chỉ sửa mô tả PR. PR template có mục "Spec" để agent ghi spec đã cập
nhật hoặc lý do không đổi.

### R5. Design System là nguồn chuẩn visual

1. `design-system/` có đúng cấu trúc thư mục `project/` của loại artifact
   Design System trên claude.ai: `README.md`, `tokens.json`,
   `components/<Tên>/README.md` và `preview.html`, `assets/`, các section
   `*.md` khác (ví dụ `motion.md`, `content.md`), `design-system.json`.
2. Giá trị token lấy đúng từ CSS đang chạy (`:root` trong `src/site/style.css`
   và các literal màu trong `detail.css`); không chế giá trị.
3. Component bao phủ mọi pattern UI đang có: header, menu, footer, brand
   lockup, CTA, hero, project grid card, media-card, masonry, skeleton, vòng
   tải, primary, suggestion, viewer, carousel ngang, filter. Preview dùng chính
   CSS website (`components/bundle.css` sinh từ `style.css`, `detail.css`).
4. Motion là section `motion.md` (format không có nhóm token motion).
5. `README.md` dùng đúng các heading Impeccable đọc (Overview, Colors,
   Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts).

```gherkin
Given một màu hoặc spacing mới trong :root của style.css
When CI chạy pnpm qa:docs
Then check design-drift fail cho tới khi tokens.json có token đó
```

### R6. Impeccable tham chiếu Design System

1. `DESIGN.md` được sinh bởi script từ `design-system/tokens.json` (frontmatter)
   và `design-system/README.md` (nội dung); dòng đầu ghi "GENERATED, sửa
   design-system/". Script có chế độ `--check` chạy trong `qa:docs`.
2. `.impeccable/design.json` chỉ giữ phần Impeccable bắt buộc mà
   `design-system/` không biểu diễn được; xác định bằng `impeccable doctor`.
3. Surface brief trong `.impeccable/surfaces/` chỉ giữ chiến lược riêng route,
   link component thay vì chép mô tả.
4. Impeccable vẫn là công cụ critique, audit, polish, `impeccable detect`.

```gherkin
Given owner sửa token trong design-system/tokens.json
When chạy script sinh DESIGN.md
Then frontmatter DESIGN.md đổi theo
And impeccable context đọc được DESIGN.md mới không báo CONTEXT_STALE
```

### R7. Publish Design System lên claude.ai

Sau khi PR đổi `design-system/` merge vào `main`, agent publish thư mục đó lên
một artifact Design System duy nhất; URL ghi trong `design-system/README.md`.
Không sửa trực tiếp trên trang claude.ai; nếu có sửa, đưa ngược vào Git qua PR.
CI không publish được (cần công cụ Artifact của Claude), nên đây là bước của
agent trong cùng thread với PR.

### R8. Lịch sử ra khỏi cây thư mục

Xóa `docs/verification/`, `docs/archive/`, `docs/reports/`, `tasks/archive/`,
ADR đã superseded và spec cũ đã được thay. Git history giữ bản gốc. Gate
NOT PASS còn mở chuyển vào mục "Gate còn mở" của spec sở hữu. Evidence của mỗi
thay đổi mới nằm trong mô tả PR.

### R9. STATE, index và rule agent

- `docs/STATE.md` tối đa 50 dòng: phase, việc đang làm (link card hoặc PR),
  blocker đã verify, next action. Không lịch sử.
- `docs/index.md` tối đa 80 dòng: bảng "việc cần làm" -> file.
- `AGENTS.md` và `docs/operations/agent-rule-*.md` cập nhật path mới; living-docs
  gate trỏ tới `pnpm qa:docs` thay vì checklist chữ.

### R10. Notion chỉ giữ backlog

Card Notion gồm tên, status, thứ tự ưu tiên, link spec và link PR. Không spec
nháp, evidence hay checklist trong Notion. Checklist từng bước nằm trong
`tasks/`. Sửa card cũ chỉ làm khi owner đồng ý theo `docs/operations/notion.md`.

## Ranh giới

- Luôn: viết tiếng Việt, giữ English technical term; dùng
  [tên gọi chuẩn](../terminology.md); mỗi bước một PR nhỏ vào `main`.
- Hỏi trước: xóa ADR còn hiệu lực, đổi `PRODUCT.md`, sửa card Notion, đổi
  hành vi website để khớp spec.
- Không: sửa source website trong đợt đại tu docs; chạy semantic Graphify khi
  chưa được yêu cầu; sửa `tasks/plan.md`, `tasks/todo.md` khi thread khác đang
  giữ.

## Kiểm tra

| R | Cách kiểm |
| --- | --- |
| R1, R8 | `pnpm qa:docs` (links) và liệt kê thư mục |
| R2, R4, R9 | `pnpm qa:docs` (ownership, sync, budget) |
| R3 | Agent đối chiếu từng requirement với source và test khi review PR |
| R5, R6 | `pnpm qa:docs` (design-drift, DESIGN.md `--check`); `impeccable context`, `impeccable doctor` |
| R7 | Đọc lại artifact bằng công cụ Artifact sau publish |
| R10 | Owner xem board Notion |

## Quyết định owner khi duyệt

Owner duyệt spec ngày 2026-10-04 với ba mặc định:

- Corpus `docs/reference/espacio/`: phần còn dùng gộp vào `design-system/`
  thành section tham chiếu; phần còn lại xóa.
- Mỗi spec tối đa 300 dòng; dài hơn thì tách capability.
- ADR đã superseded bị xóa khỏi cây thư mục; Git history giữ.

## Chú thích thuật ngữ

- **Spec sống**: spec luôn mô tả code đang chạy, đổi cùng PR với code.
- **Capability**: một phần website có ranh giới rõ, mỗi phần một spec.
- **Gherkin**: mẫu kịch bản Given/When/Then dùng làm tiêu chí kiểm.
- **Design System**: loại artifact claude.ai gồm README, token, component, asset.
- **Design drift**: giá trị trong CSS lệch với token đã ghi.
- **ADR**: bản ghi quyết định kiến trúc.
- **OpenSpec**: chuẩn spec tách spec hiện hành và thay đổi đang đề xuất.
