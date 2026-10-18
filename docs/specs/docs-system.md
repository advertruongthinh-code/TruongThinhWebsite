---
title: Hệ thống tài liệu gọn, spec sống theo code
status: accepted
updated: 2026-10-18
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
tasks/plan.md, tasks/todo.md      thay đổi đang làm, tạo khi cần, xóa khi xong
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
| adv-masonry | `advertising-masonry.md` | `advertising-products/index.html`, catalog, layout, random |
| adv-skeleton | `advertising-skeleton.md` | batch skeleton cuối masonry, `skeleton-flow.mjs` |
| adv-detail | `advertising-detail.md` | trang card `p/<id>`: primary, related, suggestion, viewer |
| adv-taxonomy | `advertising-taxonomy.md` | cụm, sản phẩm, tag, trang index, embedding ảnh (planned) |
| media | `media-delivery.md` | biến thể ảnh, `responsive-image.mjs`, vệt sáng chờ ảnh, đo tốc độ |
| media-card | `media-card.md` | card nhiều media (code trong file Advertising) |
| release | `static-release.md` | `scripts/site/` (trừ biến thể ảnh), preview, demo Cloudflare |
| cms | `cms.md` | `src/worker/`, `src/admin/`, `src/db/migrations/`, `wrangler.toml` (dormant) |
| seo | `seo.md` | SEO cho người, Google và AI (planned, tạm dừng) |
| ci-suites | `ci-test-suites.md` | bộ test CI theo phần website, chọn bộ theo file PR sửa (planned) |

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
| ownership | File Git quản lý trong `src/site/` (trừ ảnh, video, font, icon) không thuộc `source` của spec nào; lỗi nêu từng file |
| sync | PR đổi file thuộc `source` của spec mà không đổi spec đó, và mô tả PR không có dòng `Spec: không đổi - <lý do>` |
| budget | Spec quá 300 dòng, `STATE.md` quá 50 dòng, `index.md` quá 80 dòng; file agent nạp theo trigger quá ngân sách byte (R9) |
| links | Link Markdown nội bộ hoặc anchor gãy |

```gherkin
Given PR sửa src/site/advertising-products/layout-core.mjs
And không sửa docs/specs/advertising-masonry.md
And mô tả PR không có dòng "Spec: không đổi - ..."
When CI chạy pnpm qa:docs
Then check sync fail và nêu tên spec cần cập nhật
```

Spec tham gia ownership và sync qua danh sách glob `source:` trong frontmatter;
`_template.md` không tham gia. Ownership chỉ quét `src/site/`; source ngoài đó
(như `src/worker/` của `cms.md`) khai `source:` để sync áp dụng. Sync chạy trong workflow `docs.yml` trên mọi PR,
kể cả khi chỉ sửa mô tả PR; script đọc mô tả PR qua API lúc chạy, nên re-run một lần đỏ cũ sau khi sửa mô tả cũng
đọc bản mới. PR của Dependabot (chỉ nâng version action) bỏ qua sync. PR template có mục "Spec" để agent ghi spec đã cập
nhật hoặc lý do không đổi. `docs.yml` chạy trên `ubuntu-latest` như CI ([R10 static-release](static-release.md#r10-gate-ci)).

### R5. Design System là nguồn chuẩn visual

1. `design-system/` có đúng cấu trúc thư mục `project/` của loại artifact
   Design System trên claude.ai: `README.md`, `tokens.json`,
   `components/<Tên>/README.md` và `preview.html`, `assets/`, các section
   `*.md` khác (ví dụ `motion.md`, `content.md`), `design-system.json`.
2. Giá trị token lấy đúng từ CSS đang chạy (`src/site/style.css`,
   `detail.css`); không chế giá trị. Check design-drift so khối `:root` đầu
   `style.css` với token cùng tên: thiếu token hoặc khác giá trị thì fail.
   Biến motion không có family token, khai trong `tokens.json`
   `meta.cssOnly` kèm lý do. Literal rải trong selector không thuộc check.
3. Component bao phủ mọi pattern UI đang có: header, menu, footer, brand
   lockup, CTA, hero, project grid card, media-card, masonry, skeleton, vòng
   tải, thanh tải, primary, suggestion, viewer, carousel ngang, filter. Preview dùng chính
   CSS website (`components/bundle.css` sinh từ `style.css`, `detail.css`,
   bỏ `@font-face` tự host vì preview trên claude.ai nạp font từ Google).
   `scripts/docs/build-design-system.mjs` sinh preview từ HTML website (card rail công trình chèn từ dữ liệu như build), bundle
   và ảnh `assets/Photos/`; `qa:docs` chạy chế độ `--check`, file sinh lệch
   source thì fail. Phần Advertising do JavaScript dựng được
   `scripts/docs/capture-design-system.mjs` chụp từ trang chạy thật vào
   `scripts/docs/captures/`; `qa:docs` fail khi preview dùng class không còn
   trong `src/site/` hay generator `scripts/site/`. Catalog public chưa có card nhiều media nên capture
   MediaCard thay catalog bằng dữ liệu giả qua `window.__TT_ADVERTISING_ARTIFACT__`
   như test e2e; video chỉ giữ poster.
4. Motion là section `motion.md` (format không có nhóm token motion).
5. `README.md` dùng đúng các heading Impeccable đọc (Overview, Colors,
   Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts).
6. Design System chỉ mô tả Trường Thịnh: số đo là của website Trường Thịnh,
   không có file hay bảng số đo của site tham khảo. Site tham khảo và các báo
   cáo khảo sát cũ chỉ ghi ở section `Nguồn tham khảo` của `README.md` (owner
   2026-10-04).
7. Thiết kế owner đã duyệt nhưng website chưa chạy nằm ở section
   `approved-designs.md` (Đã duyệt, chờ code): giá trị owner duyệt, link spec
   planned và bản chạy thử (owner 2026-10-04). Component và `motion.md` chỉ
   mô tả code đang chạy, có thêm một dòng trỏ tới mục chờ code. PR code chuyển
   giá trị vào component và `motion.md` rồi xóa mục.

```gherkin
Given một biến mới hoặc giá trị đổi trong :root của style.css
When CI chạy pnpm qa:docs
Then check design-drift fail cho tới khi tokens.json có token cùng tên và giá trị
```

### R6. Impeccable tham chiếu Design System

1. `scripts/docs/build-design-md.mjs` sinh `DESIGN.md` từ
   `design-system/tokens.json` (frontmatter) và `design-system/README.md` (nội
   dung, link đổi về gốc repo). Frontmatter phải đứng đầu file nên dòng ghi
   GENERATED là comment YAML ngay sau `---`. Chế độ `--check` chạy trong
   `qa:docs`.
2. Cùng script sinh `.impeccable/design.json` (schemaVersion 2) chỉ với phần
   frontmatter không chứa được: shadow. Specimen component và narrative bỏ vì
   preview và README của `design-system/` đã giữ; `impeccable doctor` không báo
   thiếu.
3. Surface brief trong `.impeccable/surfaces/` chỉ giữ chiến lược riêng route,
   link component thay vì chép mô tả. Brief của route không còn render (sáu URL
   detail Advertising nay chỉ chuyển hướng) bị xóa.
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
agent trong cùng thread với PR. `scripts/docs/stage-design-system.mjs` dựng bảng
file `project/` (ảnh preview trỏ upload `/_blob/<id>` ghi trong
`design-system.json`, link ra ngoài `design-system/` trỏ GitHub); cover nằm ở
`components/Cover/preview.html`.

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
- Ngân sách context: một task nạp `STATE` + `AGENTS.md` + một rule module + một spec,
  không nạp cả thư mục. Rule module chia theo trigger, nội dung chỉ một loại task
  (ví dụ rule ảnh AI tách khỏi rule QA chung). File `docs/reference/` chia theo họ
  sản phẩm để brief chỉ nạp họ cần. Ngân sách byte trong `check-docs.mjs`:
  `AGENTS.md` 15000, `agent-rule-ad-images.md` 16000, module `agent-rule-*` khác 8000,
  mỗi file `docs/reference/` 24000; vượt thì tách, không nới số.

### R10. Notion chỉ giữ backlog

Card Notion gồm tên, status, thứ tự ưu tiên, link spec và link PR. Không spec
nháp, evidence hay checklist trong Notion. Checklist từng bước nằm trong
`tasks/`. Board Tasks là backlog của điều phối và mọi worker; quyền tạo, cập
nhật, xóa card theo [Notion và Git](../operations/notion.md#rule).

## Ranh giới

- Luôn: viết tiếng Việt, giữ English technical term; dùng
  [tên gọi chuẩn](../terminology.md); mỗi bước một PR nhỏ vào `main`.
- Hỏi trước: xóa ADR còn hiệu lực, đổi `PRODUCT.md`, đổi hành vi website để
  khớp spec.
- Không: xóa vĩnh viễn card Notion (gộp thì archive); sửa source website trong
  đợt đại tu docs; chạy semantic Graphify khi chưa được yêu cầu; sửa `tasks/plan.md`, `tasks/todo.md` khi thread khác đang
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
  thành quy tắc của Trường Thịnh, nguồn chỉ ghi ở `Nguồn tham khảo` (owner
  chỉnh 2026-10-04); phần còn lại xóa.
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
