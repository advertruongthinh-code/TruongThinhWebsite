# Skill, MCP và vận hành tool

Nguồn rule duy nhất về skill, MCP và cách vận hành tool. Cài đặt ở [TOOLING](TOOLING.md); command ở [scripts map](agent-rule-scripts.md).

## Skill lifecycle

Host agent là Claude Code hoặc Codex; rule dưới áp dụng như nhau.

1. Bắt đầu mỗi task bằng `using-agent-skills`: định tuyến toàn bộ catalog skill và bắt buộc dùng mọi skill có trigger khớp; không chạy skill không liên quan chỉ để đủ số lượng.
2. Ngay sau khi định tuyến và trước action chuyên môn đầu tiên, main agent công bố các skill đã chọn cùng lý do. Sau đó, mỗi lần dùng một skill (tự chọn, user gọi `/`, hoặc nạp giữa task), ghi một dòng trước khi dùng (thread trong Claude project ghi vào status checklist, không vào reply): `Skill: <tên> (<tự chọn|user yêu cầu>): <lý do>`. Mọi role đọc đầy đủ từng `SKILL.md` và mọi Reference Checklist mà skill yêu cầu trước khi áp dụng; main agent kiểm chứng claim này khi dùng worker hoặc reviewer. Không kiểm chứng được thì fail closed và báo blocker. User không cần nhắc lại trong prompt.
3. Feature hoặc thay đổi đáng kể đi theo lifecycle: `interview-me` → `idea-refine` khi ý tưởng còn mơ hồ → `constraint-driven-development` khi chưa có quality bar → `spec-driven-development` → owner duyệt spec → `planning-and-task-breakdown` → owner duyệt plan → execution native của host agent. Không code trước hai human gate.
4. Sau plan đã duyệt, main đánh giá ambiguity, scope, risk và verifiability rồi tự xử lý hoặc dùng solo, worker, reviewer native của host agent khi tool khả dụng và có ownership rõ. Task nhỏ, rõ, rủi ro thấp có thể làm trực tiếp. Model/effort chọn từ capability callable của host; route thấp nhận brief cụ thể hơn. Worker packet trỏ tới spec và task đã duyệt, không thay thế hoặc rút gọn intent/spec/plan. Main agent giữ requirement, architecture, diff inspection, verification và final acceptance; output của worker/reviewer là claim cho đến khi main agent kiểm chứng.
5. Definition of Done và các Reference Checklists phù hợp là acceptance gate. Các cross-cutting skill tiếp tục do `using-agent-skills` định tuyến trong implementation, review, QA, documentation và shipping.
6. Agent Personas chỉ chạy dưới dạng sibling review task do main agent điều phối; persona không gọi persona. Chỉ parallel review khi các góc kiểm tra độc lập và production risk đủ lớn; main agent hợp nhất kết quả trước final acceptance.

## Tool

| Việc | Tool |
| --- | --- |
| Kiến trúc, quan hệ, blast radius | Graphify trước |
| Declaration, reference, diagnostics | Serena; literal dùng `rg` |
| QA trình duyệt và evidence | Playwright, CDP script |
| Debug runtime trình duyệt | Chrome DevTools MCP, chỉ chạy không cửa sổ; không thay QA gate |
| UI Windows | Computer Use, theo [AGENTS.md](../../AGENTS.md#bắt-đầu) |

## Skill routing

- Skill chỉ có một nguồn: plugin pin ở user scope ([TOOLING](TOOLING.md#claude-code-skill)); repo không vendor skill.
- Rule/context: `context-engineering`. UI: `frontend-ui-engineering`, `impeccable`; browser thật: `browser-testing-with-devtools`.
- Durable decision: `documentation-and-adrs`. Xóa consumed document: `deprecation-and-migration` trước. Trước handoff: `ponytail` bỏ complexity thừa.
- Không cài router runtime riêng hoặc model pin chung; effective model/effort thiếu evidence ghi unknown.

## Automation

- Tooling chuẩn: [TOOLING](TOOLING.md). Entrypoint/fallback: [scripts map](agent-rule-scripts.md). Không chạy lại hook, watcher, wrapper, launcher mechanics sau edit.
- Git `pre-commit`/`pre-push` tự chạy `ponytail-review` read-only, fail closed; đây là repository Git hook, không phải agent lifecycle hook. Cloud không có PowerShell nên không có Git hook: agent tự chạy `ponytail-review` trên diff trước mỗi commit/push.
- `ponytail-review` chỉ xét over-engineering; correctness và security thuộc five-axis review.
- Không có lifecycle hook Impeccable: sau UI change chạy `impeccable detect` một lần.
- Không thêm/sửa lifecycle hook, helper ngoài approved tooling repair.
- App desktop của owner chạy qua provider KIE.ai và đặt `ANTHROPIC_BASE_URL`, `CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST` cho shell con; CLI trong hook kế thừa nên báo "Not logged in". Chạy `git commit`/`git push` với `env -u` các biến đó để hook dùng phiên claude.ai của CLI.

## Ponytail

- Ponytail ultra luôn bật khi code. Trước mọi commit hoặc push chạy `ponytail-review`, lỗi thì fail closed, không dùng `--no-verify`. Shortcut có chủ đích ghi comment `ponytail: <ceiling>, <upgrade path>`.
- `ponytail-audit` ultra quét cả repo, chỉ báo cáo, không tự sửa. Chạy trong thread code review của wrap-up session hoặc khi owner gọi; không chạy tự động.
- `ponytail-debt` gom comment `ponytail: <ceiling>, <upgrade path>`, chạy cùng audit; nợ cần xử lý ghi vào card Notion, không tạo file ledger.

## Graphify

- Mọi truy vấn về code, tài liệu, quan hệ, blast radius dùng Graphify trước. Chỉ đi thẳng `rg` hoặc đọc file khi tìm literal, hoặc đã biết đúng file.
- Đường mặc định là wrapper trong [scripts map](agent-rule-scripts.md): wrapper tự refresh AST và fail closed khi refresh lỗi. Chi tiết `-SkipAstRefresh`, corpus, semantic ở [graphify](graphify.md).
- Chống stale với MCP `graphify`: gọi `graph_stats` trước. Chỉ tin khi báo `matches HEAD` và working tree sạch; còn lại query qua wrapper. Cloud clone mới chưa có `graph.json`, query đầu tiên phải qua wrapper.
- Chống stale với `graphify-cloud`: so `graph_stats.freshness.commit` với `git rev-parse HEAD`; lệch hoặc có sửa chưa commit thì dùng local.
- Graph chỉ định hướng. Kết luận về code hiện tại phải kiểm lại trên working tree bằng Serena hoặc đọc file.
- Graphify là user-global MCP bắt buộc; launcher khởi động mỗi session không là Windows daemon. Cloud: MCP qua plugin `cloud-stack` ([TOOLING](TOOLING.md#claude-code-cloud-environment)).
- Chỉ build/update Graphify semantic index khi user explicit request; không thì báo file pending.

## Serena

- Mỗi repo có cấu hình riêng ở `.serena/project.yml`. Website bật TypeScript (gồm `.js`, `.mjs`, `.cjs`) và Bash.
- Dùng sau Graphify. Đọc code: `get_symbols_overview`, rồi `find_symbol` với `include_body`; không đọc cả file để khám phá.
- Quan hệ: `find_declaration`, `find_implementations`, `find_referencing_symbols`. Lỗi: `get_diagnostics_for_file`.
- Sửa cả symbol: `replace_symbol_body`, `insert_after_symbol`, `insert_before_symbol`. Đổi tên, xóa: `rename_symbol`, `safe_delete_symbol`. Sửa vài dòng: `replace_content`. Cùng một sửa ở nhiều file: `replace_in_files`, chạy `dry_run` trước.
- Markdown, HTML, CSS, PowerShell và path trong `ignored_paths` dùng tool thường. Literal dùng `rg`.
- Số dòng Serena trả về tính từ 0. Các lệnh độc lập gọi song song trong một lượt.
- Serena lỗi: chuyển `rg` và đọc file, ghi rõ fallback trong handoff.

## Chú thích thuật ngữ

- **Sibling review task**: task review ngang hàng do main agent tạo và hợp nhất.
- **Human gate**: điểm dừng bắt buộc để owner duyệt artifact trước khi sang phase kế tiếp.
- **Host agent**: agent đang chạy task, hiện là Claude Code hoặc Codex.
- **MCP**: protocol kết nối agent với tool/service.
- **Automation**: hook, watcher, wrapper hoặc launcher tự chạy mechanics.
- **Semantic index**: chỉ mục nội dung có ý nghĩa do Graphify trích xuất.
