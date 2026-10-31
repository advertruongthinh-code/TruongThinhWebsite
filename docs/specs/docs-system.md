---
title: Hệ thống tài liệu gọn, spec sống theo code
status: live
updated: 2026-10-31
source:
  - scripts/docs/check-docs.mjs
  - .github/pull_request_template.md
  - .github/workflows/docs.yml
tests:
  - scripts/docs/check-docs.mjs
  - tests/tooling/docs-malformed-link.test.mjs
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
AGENTS.md, README.md             rule agent, lối vào
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
```

```gherkin
Given cây tài liệu sau đại tu
When liệt kê file Markdown dưới docs/
Then không còn docs/verification/, docs/archive/, docs/reports/,
  docs/design/, docs/frontend/, docs/backend/
And mọi link Markdown nội bộ trỏ tới file và anchor tồn tại
```

### R2. Capability map và spec sống

Spec sở hữu có `source:` khớp file và tham gia gate sync (R4). Spec con có `source: []`, tả một lát hành vi trong
file của spec sở hữu; spec sở hữu link tới spec con trong bảng R hoặc Mục đích, và code hay test trích dẫn tên spec con.

| ID | Spec sở hữu | Source chính | Spec con |
| --- | --- | --- | --- |
| shell | `site-shell.md` | header, menu, footer, locale, chuyển trang; `style.css`, `motion.js`, `assets/brand/` | `scroll-feel.md`, `phone-header-scroll.md`, `logo-route-crossfade.md`, `first-load-parity.md`, `hero-typography.md` |
| home | `page-home.md` | `src/site/index.html`, logo khách, rail công trình | |
| detail-pages | `detail-pages.md` | residential, commercial, about; `detail.css`, `detail.js` | |
| adv-masonry | `advertising-masonry.md` | `advertising-products/index.html`, catalog, layout, random, media contract | `media-card.md`, `media-seo.md`, `loading-glass-and-page-entry.md` |
| adv-skeleton | `advertising-skeleton.md` | batch skeleton cuối masonry, `skeleton-flow.mjs`, `image-palette.mjs` | `advertising-cta-center-parallax.md` |
| adv-detail | `advertising-detail.md` | `suggestion-slideshow.mjs`; trang card `p/<id>`: primary, related, suggestion | `primary-video-player.md`, `advertising-related-cta-motion.md` (planned, sẽ gộp với `advertising-cta-center-parallax.md`) |
| adv-viewer | `advertising-viewer-touch-zoom.md` | `photo-viewer.mjs` | |
| adv-taxonomy | `advertising-taxonomy.md` | `taxonomy.mjs`: cụm, sản phẩm, tag, trang index | |
| glass | `glass-surface.md` | `glass-surface.mjs` | |
| media | `media-delivery.md` | biến thể ảnh, `responsive-image.mjs`, `head-inline.js`, `build-image-variants.mjs` | |
| progressive | `progressive-loading.md` | `sw.js`, `media-colors.mjs` | |
| video | `video-delivery.md` | `build-video-ladder.mjs`, `video-source.mjs` | |
| release | `static-release.md` | `scripts/site/` (trừ biến thể ảnh), preview, `_headers`, `404.html`, demo Cloudflare | |
| ci-suites | `ci-test-suites.md` | `ci.yml`, `tests/ci-suites.json`, `scripts/ci/` | |
| content-tests | `content-independent-tests.md` | `content-contract.mjs` | |
| design-system | `design-system.md` | `scripts/docs/build-*`, `capture-*`, `stage-*` | |
| docs | `docs-system.md` | `check-docs.mjs`, PR template, `docs.yml` | |
| cms | `cms.md` | `src/worker/`, `src/admin/`, `src/db/migrations/`, `wrangler.toml` (dormant) | |
| seo | `seo.md` | SEO cho người, Google và AI (planned, tạm dừng) | |

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

Không có mục lịch sử, delta, correction hay evidence có ngày; Git log và PR giữ. Cụ thể:

- Spec chỉ tả hành vi hiện tại: không bảng "Hiện tại / Sau", không ngày, không số PR, không log đo; kết quả đo ghi một
  dòng "đạt trên <máy>" trong Kiểm tra.
- Việc chưa làm nằm ở "Gate còn mở" của spec sở hữu, không có file spec riêng cho kế hoạch.
- Một hành vi ghi ở một spec; chỗ khác link, không chép.
- Số đếm nội dung (card, slide, figure) chỉ ghi khi là luật, lấy từ data lúc viết và ghi "tính từ catalog".

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

### R5-R7. Design System, Impeccable và publish

Cấu trúc `design-system/`, preview component, `DESIGN.md` cho Impeccable và bước publish lên claude.ai thuộc
[Design System và Impeccable](design-system.md).

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

Card Notion gồm tên, status, thứ tự ưu tiên, link spec, link PR và sổ việc:
plan và việc owner giao dạng ô tick ([sổ việc](../operations/notion.md#sổ-việc-trên-card),
owner 2026-10-25). Không spec nháp hay evidence trong Notion. Board Tasks là backlog của điều phối và mọi worker; quyền tạo, cập
nhật, xóa card theo [Notion và Git](../operations/notion.md#rule).

## Ranh giới

- Luôn: viết tiếng Việt, giữ English technical term; dùng
  [tên gọi chuẩn](../terminology.md); mỗi bước một PR nhỏ vào `main`.
- Hỏi trước: xóa ADR còn hiệu lực, đổi `PRODUCT.md`, đổi hành vi website để
  khớp spec.
- Không: xóa vĩnh viễn card Notion (gộp thì archive); sửa source website trong
  đợt đại tu docs; chạy semantic Graphify khi chưa được yêu cầu; sửa sổ việc trên card mà thread khác đang giữ.

## Kiểm tra

| R | Cách kiểm |
| --- | --- |
| R1, R8 | `pnpm qa:docs` (links) và liệt kê thư mục |
| R2, R4, R9 | `pnpm qa:docs` (ownership, sync, budget) |
| R3 | Agent đối chiếu từng requirement với source và test khi review PR |
| R5-R7 | Xem [Design System và Impeccable](design-system.md#kiểm-tra) |
| R10 | Owner xem board Notion |
| Gate link | `tests/tooling/docs-malformed-link.test.mjs`: link mã hóa phần trăm hỏng thì gate báo rõ, không crash |

## Chú thích thuật ngữ

- **Spec sống**: spec luôn mô tả code đang chạy, đổi cùng PR với code.
- **Capability**: một phần website có ranh giới rõ, mỗi phần một spec.
- **Gherkin**: mẫu kịch bản Given/When/Then dùng làm tiêu chí kiểm.
- **Design System**: loại artifact claude.ai gồm README, token, component, asset.
- **Design drift**: giá trị trong CSS lệch với token đã ghi.
- **ADR**: bản ghi quyết định kiến trúc.
- **OpenSpec**: chuẩn spec tách spec hiện hành và thay đổi đang đề xuất.
