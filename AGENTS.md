# AGENTS.md

## Bắt đầu

1. Mọi role dùng `i-have-adhd`, `caveman` ultra, `ponytail` ultra. Caveman nén prose, không nén nghĩa; safety/clarity override. Tuyệt đối không dùng emoji trong response, source, test, log, tài liệu, commit, issue, card hoặc nội dung Notion; dùng chữ thuần thay thế.
2. Đọc hết `docs/STATE.md`, rồi [core rule](docs/operations/agent-rule-core.md). `STATE` là snapshot Git ngắn, không thay accepted evidence hay Notion card.
3. Chọn module theo trigger dưới. Link là rule bắt buộc, không phải đọc thêm.
4. Sau đó chỉ nạp spec, source, test, một pattern liên quan. Đọc, không đoán.

## Routing theo path

Cây ownership đầy đủ và nhãn lifecycle/Git nằm trong
[`README.md`](README.md#cây-thư-mục-và-trạng-thái). Agent dùng routing ngắn này;
không suy ra file `untracked` là file thừa.

```text
.
├─ src/site/                         # LIVE source; edit tại đây, không edit .site-output
├─ src/worker/                       # LIVE route/SEO; CMS branch dormant nhưng có contract test
├─ src/admin/, src/db/migrations/    # DEV CMS; ngoài static release gate
├─ tests/, scripts/                  # PROJECT QA và entrypoint; kiểm tra consumer trước xóa
├─ docs/                             # PROJECT knowledge; raw CSV/bak là generated local
├─ research/reference-site/          # RESEARCH; archive/runtime evidence không phải source public
└─ .site-output/, .tmp/, .tooling/,
   graphify-out/, .wrangler/         # GENERATED/CACHE; không edit, không commit
```

File/project source `untracked` cần review riêng trước khi stage. Không move,
xóa, stage hoặc commit hàng loạt generated output, research archive, tooling
cache hay untracked worktree.

## STATE không stale

- `docs/STATE.md` là snapshot Git ngắn: phase, active work, hard boundary, canonical link, verified blocker, next repo action. Không là changelog, Kanban, work log, hay bản sao Notion.
- Trước plan/implement: đọc toàn bộ `STATE.md`. Sau khi một field của snapshot đổi vì behavior, verification, blocker, handoff: verify evidence, update field và `Updated` trong cùng task.
- Bỏ item resolved/hết hạn; link spec, decision, report thay vì copy evidence. Không refresh `Updated` nếu facts không đổi.
- `STATE` mâu thuẫn hoặc nghi stale: repository evidence, test, accepted Git document thắng. Verify, sửa `STATE`; chưa rõ thì ghi unknown.

## Viết và phản hồi

- Code comment English. Mọi Markdown project Vietnamese; giữ English technical term khi cần. Cuối file có `## Chú thích thuật ngữ`. Vietnamese product copy không là code comment.
- Mỗi role load `i-have-adhd`, `caveman` ultra, `ponytail` ultra. Đọc đủ `SKILL.md` của skill đã chọn trước action. Caveman nén prose, không nén nghĩa; safety/clarity override.
- Response: state/next action đầu. Work nhiều bước: đánh số, mỗi bước bounded, tối đa 5. Nêu progress, time estimate cụ thể, lỗi theo location/cause/fix, thứ đang work. Xử lý issue hiện tại trước tangent; cuối nêu một next action dưới hai phút.
- Mơ hồ thật: hỏi một câu ngắn. Không preamble, recap, closing filler.

## Rule module

| Trigger | Phải đọc |
| --- | --- |
| Copy, media, layout, UI | [Product và UI](docs/operations/agent-rule-product-ui.md) |
| Plan, card, Notion, task từ `200 LOC` | [Knowledge và Notion](docs/operations/agent-rule-knowledge-notion.md) |
| Codebase, Codex, skill, plugin, MCP, Graphify, Serena, Sol Advisor | [Workflow và tool](docs/operations/agent-rule-workflow-tools.md); [Sol Advisor](docs/operations/sol-advisor.md) |
| Change, QA, release, handoff | [Evidence, QA, handoff](docs/operations/agent-rule-evidence-qa-handoff.md) |

## Scripts map

Automation sở hữu Graphify structural refresh và Serena startup sync. Không chạy lại
mechanics sau edit; chỉ dùng fallback trong [scripts map](docs/operations/agent-rule-scripts.md)
khi tool báo lỗi hoặc blocked.

| Need | Entrypoint |
| --- | --- |
| Graphify query | `& ".\scripts\tooling\invoke-graphify.ps1" query "question"` |
| Dev, site QA | `pnpm dev`, `pnpm qa:*` |
| Setup, repair, archive, script khác | [Scripts map đầy đủ](docs/operations/agent-rule-scripts.md) |

## Chú thích thuật ngữ

- **Rule module**: file rule theo chủ đề, đọc khi trigger khớp.
- **Scripts map**: bảng entrypoint script đã verify.
- **Automation**: hook, watcher hoặc launcher tự xử lý mechanics.
- **STATE**: snapshot Git ngắn, nêu context hiện tại để bắt đầu task.
- **Canonical**: nguồn chuẩn dùng để quyết định nội dung được chấp nhận.
- **Evidence**: bằng chứng verify được từ repository, test, tool.
- **Stale**: đã cũ, không còn khớp evidence hiện tại.
- **Lifecycle**: trạng thái sử dụng như live, dev, generated, research hoặc cache.
- **Git index**: danh sách path Git đang quản lý; khác với lifecycle của file.
