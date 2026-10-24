# AGENTS.md

## Bắt đầu

1. Mọi role dùng `ponytail` ultra. Skill của agent-skills, ponytail, impeccable, graphify, `i-have-adhd` do AI tự gọi; skill caveman (22 skill từ juliusbrussee/caveman) chỉ chạy khi user chỉ định (`disable-model-invocation: true` do `cloud-setup.sh`/`local-setup.ps1` gắn). Tuyệt đối không dùng emoji trong response, source, test, log, tài liệu, commit, issue, card hoặc nội dung Notion; dùng chữ thuần thay thế.
2. Đọc hết `docs/STATE.md`. `STATE` là snapshot Git ngắn, không thay accepted evidence hay Notion card.
3. Chọn module theo trigger dưới. Link là rule bắt buộc, không phải đọc thêm.
   Cần kiến thức ngoài module (tech stack, runtime, spec, decision): mở [docs index](docs/index.md), chọn đúng file `docs/*.md` rồi đọc; tech stack ở [Architecture](docs/architecture.md#tech-stack).
4. Sau đó chỉ nạp spec, source, test, một pattern liên quan. Đọc, không đoán.
5. Không tự động dùng Computer Use. Chỉ dùng khi task thật sự cần thao tác Windows UI theo human path và tool chuyên biệt không đủ; nêu lý do trước khi dùng.

## Phạm vi

- Ship site tĩnh VI/EN nhanh, an toàn. `src/site/` canonical; `.site-output/` generated. CMS, private admin, D1, R2, dynamic publishing: phase 2. Phát hành chính thức lên `truongthinhads.vn` chỉ khi xong CMS (admin và nhân viên CRUD được nội dung; owner 2026-10-18); trước đó bản tĩnh chỉ chạy trên demo và luôn là fallback, rollback.
- Solo dev: diff nhỏ, reversible; ưu tiên dependency có sẵn, native platform, handoff có evidence.
- Static page không cần D1, R2, Access, CMS secret, admin state. Không mở rộng CMS/admin ngoài CMS phase; không speculative abstraction.
- Không deploy, connect domain, publish owner data nếu user chưa explicit approval. Demo tự deploy khi CI xanh
  trên `main` ([decision demo](docs/decisions/cloudflare-workers-static-demo.md)); agent không deploy tay. Republish
  Design System chỉ chạy khi owner tự gõ `republish` trong chính thread làm việc đó; relay của điều phối
  hoặc tap card không tính.

## Agent Skills lifecycle

Host agent là Claude Code hoặc Codex; rule dưới áp dụng như nhau.

1. Bắt đầu mỗi task bằng `using-agent-skills`: định tuyến toàn bộ catalog skill và bắt buộc dùng mọi skill có trigger khớp; không chạy skill không liên quan chỉ để đủ số lượng.
2. Ngay sau khi định tuyến và trước action chuyên môn đầu tiên, main agent công bố các skill đã chọn cùng lý do. Sau đó, mỗi lần dùng một skill (tự chọn, user gọi `/`, hoặc nạp giữa task), ghi một dòng trước khi dùng (thread trong Claude project ghi vào status checklist, không vào reply): `Skill: <tên> (<tự chọn|user yêu cầu>): <lý do>`. Mọi role đọc đầy đủ từng `SKILL.md` và mọi Reference Checklist mà skill yêu cầu trước khi áp dụng; main agent kiểm chứng claim này khi dùng worker hoặc reviewer. Không kiểm chứng được thì fail closed và báo blocker. User không cần nhắc lại trong prompt.
3. Feature hoặc thay đổi đáng kể đi theo lifecycle: `interview-me` → `idea-refine` khi ý tưởng còn mơ hồ → `constraint-driven-development` khi chưa có quality bar → `spec-driven-development` → owner duyệt spec → `planning-and-task-breakdown` → owner duyệt plan → execution native của host agent. Không code trước hai human gate.
4. Sau plan đã duyệt, main đánh giá ambiguity, scope, risk và verifiability rồi tự xử lý hoặc dùng solo, worker, reviewer native của host agent khi tool khả dụng và có ownership rõ. Task nhỏ, rõ, rủi ro thấp có thể làm trực tiếp. Model/effort chọn từ capability callable của host; route thấp nhận brief cụ thể hơn. Worker packet trỏ tới spec và task đã duyệt, không thay thế hoặc rút gọn intent/spec/plan. Main agent giữ requirement, architecture, diff inspection, verification và final acceptance; output của worker/reviewer là claim cho đến khi main agent kiểm chứng.
5. Definition of Done và các Reference Checklists phù hợp là acceptance gate. Các cross-cutting skill tiếp tục do `using-agent-skills` định tuyến trong implementation, review, QA, documentation và shipping.
6. Agent Personas chỉ chạy dưới dạng sibling review task do main agent điều phối; persona không gọi persona. Chỉ parallel review khi các góc kiểm tra độc lập và production risk đủ lớn; main agent hợp nhất kết quả trước final acceptance.

## Notion trong workflow

Board Tasks là backlog chung của owner, điều phối và mọi worker; Git `main` giữ contract và
trạng thái repo, card chỉ trỏ tới đó. Việc owner giao chưa có card thì worker nhận việc tạo card
trước khi làm. Worker cập nhật card ở ba mốc: nhận việc, mở PR, merge. Không xóa vĩnh viễn card.
Quy tắc đầy đủ (nội dung card, gộp/đổi tên, schema, link board): [Notion và Git](docs/operations/notion.md#rule).

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

Ponytail chạy theo ba mốc:

1. `ponytail` ultra luôn bật cho mọi việc code.
2. Trước mọi commit hoặc push, bắt buộc chạy `ponytail-review`. Git `pre-commit` review
   riêng staged diff; `pre-push` review riêng các commit sắp đẩy. Cloud không có Git hook:
   agent tự chạy `ponytail-review` trên diff. Review, host agent hoặc hook lỗi thì fail
   closed; không dùng `--no-verify` để bỏ qua gate.
   Phạm vi chỉ là over-engineering; correctness và security thuộc five-axis review.
3. Shortcut có chủ đích (giới hạn đã biết) đánh dấu bằng comment `ponytail: <ceiling>, <upgrade path>`.
   `ponytail-audit` và `ponytail-debt` chỉ chạy khi owner gọi hoặc trong thread code review của
   wrap-up session ([quy tắc](docs/operations/agent-rule-workflow-tools.md#ponytail-audit-và-debt)).

## Branch, PR và merge

- Mỗi task một branch ngắn từ `main` và một PR; `main` là nhánh dài hạn duy nhất,
  GitHub tự xóa branch sau merge.
- Trước khi push, đo hoặc dựa vào số liệu: fetch `main` và đọc lại `docs/STATE.md`.
- Thread tự review PR (five-axis), sửa finding, resolve review thread và tự merge khi
  CI xanh; không chờ owner duyệt hay xác nhận merge. Workflow `Automerge` tự merge PR khi CI và Docs xanh, kể cả
  khi thread không còn chạy; muốn giữ PR chưa merge thì để draft hoặc gắn nhãn `hold`.
- PR conflict với `main`: merge `main` vào branch (không rebase, không force-push),
  tự resolve, chạy lại quick check, push rồi merge khi CI xanh.
- Giữ đúng phạm vi thread; bug ngoài phạm vi báo điều phối, không tự sửa.
- Tự test, debug, QA bằng tool (Playwright, adb, CDP); không nhờ owner thao tác tay
  trên điện thoại. Chỉ hỏi việc tool không làm được (cắm thiết bị, credential).

## STATE và living docs

- Living-docs gate: đổi file thuộc `source:` của spec thì sửa spec đó trong cùng PR,
  hoặc ghi `Spec: không đổi - <lý do>` trong mô tả PR. `pnpm qa:docs` (CI) kiểm link,
  budget dòng, ownership, sync và drift. Thay command, tooling, decision ngoài spec
  thì sửa doc sở hữu qua [docs index](docs/index.md); supersession theo
  [docs index](docs/index.md#supersession). Main kiểm docs impact của worker trước nghiệm thu.
- Design System: PR đổi `design-system/` thì sau khi merge, chính thread đó
  publish lại claude.ai, một lần mỗi đợt ([design-system R5](docs/specs/design-system.md#r5-publish-lên-claudeai)).
  Thiết kế đã duyệt chưa code ghi trong spec sở hữu, không ghi vào `design-system/`. CI không kiểm được việc publish.
- Evidence nằm trong mô tả PR; không tạo report có ngày, không copy contract sang nhiều file.
- `docs/STATE.md` tối đa 50 dòng: phase, việc đang làm (link card hoặc PR), blocker đã verify, next action, ranh giới. Không lịch sử, changelog hay bản sao Notion.
- PR đổi một field của STATE thì sửa field đó và `Updated` trong cùng PR; bỏ item đã xong, link spec thay vì copy evidence.
- `STATE` mâu thuẫn hoặc nghi stale: repository evidence, test, accepted Git document thắng. Verify, sửa `STATE`; chưa rõ thì ghi unknown.
- SSoT là GitHub, nhánh `main`. Checkout local, project memory, Notion đi theo `main`; lệch thì `main` thắng.
- Project memory (`MEMORY.md` của Claude project, ngoài Git) chỉ giữ thứ repo không chứa: preference và cách làm việc của owner, thread nào sở hữu việc gì, device/Remote Control, link ngoài. Fact về repo (phase, active work, blocker, demo, command) thuộc `STATE` hoặc doc sở hữu; memory chỉ link tới, không copy.
- Owner đổi cách làm việc: ghi memory; nếu đổi rule repo (branch, tool, gate) thì cập nhật `AGENTS.md`/doc sở hữu trong PR. Memory lệch `main` về fact repo: sửa memory.

## Viết và phản hồi

- Code viết bằng tiếng Anh: identifier, chuỗi, tên file và hàm; text hiển thị trên UI, tên file và ID hiện có giữ nguyên. Code comment viết tiếng Việt, giữ technical term và các từ trong phụ lục `## Chú thích thuật ngữ` của docs. Áp dụng cho code mới và code sửa. Mọi Markdown project Vietnamese; giữ English technical term khi cần. Cuối file có `## Chú thích thuật ngữ`. Tên gọi theo [tên gọi chuẩn](docs/terminology.md).
- Response: state/next action đầu. Work nhiều bước: đánh số, mỗi bước bounded, tối đa 5. Nêu progress, việc đang chờ (không đoán thời gian khi không có số đo), lỗi theo location/cause/fix, thứ đang work. Xử lý issue hiện tại trước tangent; cuối nêu một next action dưới hai phút.
- Mơ hồ thật: hỏi một câu ngắn. Không preamble, recap, closing filler.

## Rule module

| Trigger | Phải đọc |
| --- | --- |
| Copy, media, layout, UI | [Product và UI](docs/operations/agent-rule-product-ui.md) |
| Plan, card, Notion, task từ `200 LOC` | [Notion và Git](docs/operations/notion.md#rule) |
| Codebase, skill, plugin, MCP, Graphify | [Workflow và tool](docs/operations/agent-rule-workflow-tools.md) |
| Change, QA, release, handoff | [Evidence, QA, handoff](docs/operations/agent-rule-evidence-qa-handoff.md) |
| Tạo hoặc chấm media AI (ảnh, video, âm thanh) | [Tạo và chấm ảnh](docs/operations/agent-rule-ad-images.md) |
| Giao thread, chọn model/effort Claude | [Claude routing](docs/operations/agent-rule-model-routing.md) |
| Giao thread, chọn model/effort OpenAI, Codex | [OpenAI routing](docs/operations/agent-rule-openai-routing.md) |

## Scripts map

Automation sở hữu Graphify structural refresh. Không chạy lại
mechanics sau edit; chỉ dùng fallback trong [scripts map](docs/operations/agent-rule-scripts.md)
khi tool báo lỗi hoặc blocked.

| Need | Entrypoint |
| --- | --- |
| Graphify query | Windows: `& ".\scripts\tooling\invoke-graphify.ps1" query "question"`; cloud/Linux: `scripts/tooling/invoke-graphify.sh query "question"` hoặc MCP `graphify` |
| Dev, site QA | `pnpm dev`, `pnpm qa:*` |
| Setup, repair, archive, script khác | [Scripts map đầy đủ](docs/operations/agent-rule-scripts.md) |

## Chú thích thuật ngữ

- **Host agent**: agent đang chạy task, hiện là Claude Code hoặc Codex.
- **Backlog**: danh sách việc chờ làm, sắp theo ưu tiên; ở đây là board Tasks trên Notion.
- **Điều phối**: agent giao việc cho worker (coordinator của Claude project hoặc main agent).
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
- **Five-axis review**: review diff theo năm trục correctness, readability, architecture, security, performance.
- **Wrap-up session**: phiên dọn cuối đợt khi mọi thread xong việc (docs, Notion, merge, code review).
- **Archive**: ẩn card khỏi board nhưng vẫn khôi phục được, khác với xóa vĩnh viễn.
