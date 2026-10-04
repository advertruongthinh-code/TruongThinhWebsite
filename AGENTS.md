# AGENTS.md

## Bắt đầu

1. Mọi role dùng `ponytail` ultra. Skill của agent-skills, ponytail, impeccable, graphify, `i-have-adhd` do AI tự gọi; skill caveman (22 skill từ juliusbrussee/caveman) chỉ chạy khi user chỉ định (`disable-model-invocation: true` do `cloud-setup.sh`/`local-setup.ps1` gắn). Tuyệt đối không dùng emoji trong response, source, test, log, tài liệu, commit, issue, card hoặc nội dung Notion; dùng chữ thuần thay thế.
2. Đọc hết `docs/STATE.md`. `STATE` là snapshot Git ngắn, không thay accepted evidence hay Notion card.
3. Chọn module theo trigger dưới. Link là rule bắt buộc, không phải đọc thêm.
4. Sau đó chỉ nạp spec, source, test, một pattern liên quan. Đọc, không đoán.
5. Không tự động dùng Computer Use. Chỉ dùng khi task thật sự cần thao tác Windows UI theo human path và tool chuyên biệt không đủ; nêu lý do trước khi dùng.

## Phạm vi

- Ship site tĩnh VI/EN nhanh, an toàn. `src/site/` canonical; `.site-output/` generated. CMS, private admin, D1, R2, dynamic publishing: phase sau; không chặn public release.
- Solo dev: diff nhỏ, reversible; ưu tiên dependency có sẵn, native platform, handoff có evidence.
- Static page không cần D1, R2, Access, CMS secret, admin state. Không mở rộng CMS/admin ngoài CMS phase; không speculative abstraction.
- Không deploy, connect domain, publish owner data nếu user chưa explicit approval.

## Agent Skills lifecycle

Host agent là Claude Code hoặc Codex; rule dưới áp dụng như nhau.

1. Bắt đầu mỗi task bằng `using-agent-skills`: định tuyến toàn bộ catalog skill và bắt buộc dùng mọi skill có trigger khớp; không chạy skill không liên quan chỉ để đủ số lượng.
2. Ngay sau khi định tuyến và trước action chuyên môn đầu tiên, main agent công bố các skill đã chọn cùng lý do. Sau đó, mỗi lần dùng một skill (tự chọn, user gọi `/`, hoặc nạp giữa task), ghi một dòng trong chat trước khi dùng: `Skill: <tên> (<tự chọn|user yêu cầu>): <lý do>`. Mọi role đọc đầy đủ từng `SKILL.md` và mọi Reference Checklist mà skill yêu cầu trước khi áp dụng; main agent kiểm chứng claim này khi dùng worker hoặc reviewer. Không kiểm chứng được thì fail closed và báo blocker. User không cần nhắc lại trong prompt.
3. Feature hoặc thay đổi đáng kể đi theo lifecycle: `interview-me` → `idea-refine` khi ý tưởng còn mơ hồ → `constraint-driven-development` khi chưa có quality bar → `spec-driven-development` → owner duyệt spec → `planning-and-task-breakdown` → owner duyệt plan → execution native của host agent. Không code trước hai human gate.
4. Sau plan đã duyệt, main đánh giá ambiguity, scope, risk và verifiability rồi tự xử lý hoặc dùng solo, worker, reviewer native của host agent khi tool khả dụng và có ownership rõ. Task nhỏ, rõ, rủi ro thấp có thể làm trực tiếp. Model/effort chọn từ capability callable của host; route thấp nhận brief cụ thể hơn. Worker packet trỏ tới spec và task đã duyệt, không thay thế hoặc rút gọn intent/spec/plan. Main agent giữ requirement, architecture, diff inspection, verification và final acceptance; output của worker/reviewer là claim cho đến khi main agent kiểm chứng.
5. Definition of Done và các Reference Checklists phù hợp là acceptance gate. Các cross-cutting skill tiếp tục do `using-agent-skills` định tuyến trong implementation, review, QA, documentation và shipping.
6. Agent Personas chỉ chạy dưới dạng sibling review task do main agent điều phối; persona không gọi persona. Chỉ parallel review khi các góc kiểm tra độc lập và production risk đủ lớn; main agent hợp nhất kết quả trước final acceptance.

## Routing theo path

Cây ownership đầy đủ và nhãn lifecycle/Git nằm trong
[`README.md`](README.md#cây-thư-mục-và-trạng-thái). Không suy ra file
`untracked` là file thừa.

- `src/site/`: LIVE source; edit tại đây, không edit `.site-output/`.
- `src/worker/`: DORMANT đến CMS. `src/admin/`, `src/db/migrations/`: DEV CMS, ngoài static release gate.
- `tests/`, `scripts/`: QA và entrypoint; kiểm tra consumer trước xóa. `docs/`: project knowledge.
- `research/reference-site/`: research evidence, không phải source public.
- `.site-output/`, `.tmp/`, `.tooling/`, `graphify-out/`, `.wrangler/`: generated/cache; không edit, không commit.

Skill chỉ có một nguồn: plugin pin ở user scope ([TOOLING](docs/operations/TOOLING.md#claude-code-skill)); repo không vendor skill.

File/project source `untracked` cần review riêng trước khi stage. Không move,
xóa, stage hoặc commit hàng loạt generated output, research archive, tooling
cache hay untracked worktree.

Trước mọi commit hoặc push, bắt buộc chạy `ponytail-review`. Git `pre-commit`
review riêng staged diff; `pre-push` review riêng các commit sắp đẩy. Review,
host agent hoặc hook lỗi thì fail closed; không dùng `--no-verify` để bỏ qua gate.

## STATE và living docs

- Living-docs gate cho mọi role: thay behavior, interface, schema, design,
  command, ownership, tooling hoặc evidence thì cập nhật tài liệu sở hữu
  contract trong cùng task; không có impact thì ghi lý do cụ thể khi bàn giao.
  Chọn nguồn qua [docs routing](docs/index.md); supersession theo
  [design index](docs/design/index.md#supersession).
- Không tạo report cho mọi sửa nhỏ, không copy contract sang nhiều file. Cập
  nhật nguồn chuẩn, links và trạng thái supersession; main kiểm docs impact của
  worker trước nghiệm thu.
- `docs/STATE.md` là snapshot Git ngắn: phase, active work, hard boundary, canonical link, verified blocker, next repo action. Không là changelog, Kanban, work log, hay bản sao Notion.
- Trước plan/implement: đọc toàn bộ `STATE.md`. Sau khi một field của snapshot đổi vì behavior, verification, blocker, handoff: verify evidence, update field và `Updated` trong cùng task.
- Bỏ item resolved/hết hạn; link spec, decision, report thay vì copy evidence. Không refresh `Updated` nếu facts không đổi.
- `STATE` mâu thuẫn hoặc nghi stale: repository evidence, test, accepted Git document thắng. Verify, sửa `STATE`; chưa rõ thì ghi unknown.
- SSoT là GitHub, nhánh `main`. Checkout local, project memory, Notion đi theo `main`; lệch thì `main` thắng.
- Project memory (`MEMORY.md` của Claude project, ngoài Git) chỉ giữ thứ repo không chứa: preference và cách làm việc của owner, thread nào sở hữu việc gì, device/Remote Control, link ngoài. Fact về repo (phase, active work, blocker, demo, command) thuộc `STATE` hoặc doc sở hữu; memory chỉ link tới, không copy.
- Owner đổi cách làm việc: ghi memory; nếu đổi rule repo (branch, tool, gate) thì cập nhật `AGENTS.md`/doc sở hữu trong PR. Memory lệch `main` về fact repo: sửa memory. Mỗi PR đổi field `STATE` tự cập nhật `STATE` trong cùng PR.

## Viết và phản hồi

- Code comment English. Mọi Markdown project Vietnamese; giữ English technical term khi cần. Cuối file có `## Chú thích thuật ngữ`. Tên gọi theo [tên gọi chuẩn](docs/terminology.md). Vietnamese product copy không là code comment.
- Response: state/next action đầu. Work nhiều bước: đánh số, mỗi bước bounded, tối đa 5. Nêu progress, time estimate cụ thể, lỗi theo location/cause/fix, thứ đang work. Xử lý issue hiện tại trước tangent; cuối nêu một next action dưới hai phút.
- Mơ hồ thật: hỏi một câu ngắn. Không preamble, recap, closing filler.

## Rule module

| Trigger | Phải đọc |
| --- | --- |
| Copy, media, layout, UI | [Product và UI](docs/operations/agent-rule-product-ui.md) |
| Plan, card, Notion, task từ `200 LOC` | [Notion và Git](docs/operations/notion.md#rule) |
| Codebase, skill, plugin, MCP, Graphify, Serena | [Workflow và tool](docs/operations/agent-rule-workflow-tools.md) |
| Change, QA, release, handoff | [Evidence, QA, handoff](docs/operations/agent-rule-evidence-qa-handoff.md) |

## Scripts map

Automation sở hữu Graphify structural refresh và Serena startup sync. Không chạy lại
mechanics sau edit; chỉ dùng fallback trong [scripts map](docs/operations/agent-rule-scripts.md)
khi tool báo lỗi hoặc blocked.

| Need | Entrypoint |
| --- | --- |
| Graphify query | Windows: `& ".\scripts\tooling\invoke-graphify.ps1" query "question"`; cloud/Linux: `scripts/tooling/invoke-graphify.sh query "question"` hoặc MCP `graphify` |
| Dev, site QA | `pnpm dev`, `pnpm qa:*` |
| Setup, repair, archive, script khác | [Scripts map đầy đủ](docs/operations/agent-rule-scripts.md) |

## Chú thích thuật ngữ

- **Host agent**: agent đang chạy task, hiện là Claude Code hoặc Codex.
- **Rule module**: file rule theo chủ đề, đọc khi trigger khớp.
- **Scripts map**: bảng entrypoint script đã verify.
- **Automation**: hook, watcher hoặc launcher tự xử lý mechanics.
- **STATE**: snapshot Git ngắn, nêu context hiện tại để bắt đầu task.
- **SSoT**: single source of truth, nguồn chuẩn duy nhất.
- **Project memory**: bộ nhớ chung của các Claude session trong Claude project, nằm ngoài Git.
- **Canonical**: nguồn chuẩn dùng để quyết định nội dung được chấp nhận.
- **Evidence**: bằng chứng verify được từ repository, test, tool.
- **Stale**: đã cũ, không còn khớp evidence hiện tại.
- **Lifecycle**: trạng thái sử dụng như live, dev, generated, research hoặc cache.
- **Git index**: danh sách path Git đang quản lý; khác với lifecycle của file.
- **Computer Use**: công cụ thao tác Windows UI theo luồng người dùng nhìn thấy.
- **Human path**: chuỗi thao tác UI giống cách người dùng thực hiện trực tiếp.
- **Human gate**: điểm dừng bắt buộc để owner duyệt artifact trước khi sang phase kế tiếp.
- **Sibling review task**: task review ngang hàng do main agent tạo và hợp nhất.
