# Workflow và tool rule

Lifecycle và execution native của host agent nằm ở [AGENTS.md](../../AGENTS.md#agent-skills-lifecycle).
File này chỉ giữ routing tool.

## Skill routing

- Rule/context: `context-engineering`. UI: `frontend-ui-engineering`, `impeccable`; browser thật: `browser-testing-with-devtools`.
- Durable decision: `documentation-and-adrs`. Xóa consumed document: `deprecation-and-migration` trước. Trước handoff: `ponytail` bỏ complexity thừa.
- Không cài router runtime riêng hoặc model pin chung; effective model/effort thiếu evidence ghi unknown.

## Automation

- Tooling chuẩn: [TOOLING](TOOLING.md). Entrypoint/fallback: [scripts map](agent-rule-scripts.md). Không chạy lại hook, watcher, wrapper, launcher mechanics sau edit.
- Git `pre-commit`/`pre-push` tự chạy `ponytail-review` read-only, fail closed; đây là repository Git hook, không phải agent lifecycle hook. Cloud không có PowerShell nên không có Git hook: agent tự chạy `ponytail-review` trên diff trước mỗi commit/push.
- Không có lifecycle hook Impeccable: sau UI change chạy `impeccable detect` một lần.
- Không thêm/sửa lifecycle hook, helper ngoài approved tooling repair.
- App desktop của owner chạy qua provider KIE.ai và đặt `ANTHROPIC_BASE_URL`, `CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST` cho shell con; CLI trong hook kế thừa nên báo "Not logged in". Chạy `git commit`/`git push` với `env -u` các biến đó để hook dùng phiên claude.ai của CLI.

## Ponytail audit và debt

- `ponytail-audit` ultra quét cả repo, chỉ báo cáo, không tự sửa. Chạy trong thread code review của wrap-up session hoặc khi owner gọi; không chạy tự động.
- `ponytail-debt` gom comment `ponytail: <ceiling>, <upgrade path>`, chạy cùng audit; nợ cần xử lý ghi vào card Notion, không tạo file ledger.

## Graphify

- Graphify trước cho code và meaningful non-media content qua wrapper; chi tiết `-SkipAstRefresh`, corpus, semantic ở [graphify](graphify.md).
- Sau Graphify dùng Serena hoặc `rg` cho symbol, reference; Serena chốt declaration và reference trên working tree.
- Graphify là user-global MCP bắt buộc; launcher khởi động mỗi session không là Windows daemon. Cloud: MCP qua plugin `cloud-stack` ([TOOLING](TOOLING.md#claude-code-cloud-environment)).
- Chỉ build/update Graphify semantic index khi user explicit request; không thì báo file pending.

## Chú thích thuật ngữ

- **MCP**: protocol kết nối agent với tool/service.
- **Automation**: hook, watcher, wrapper hoặc launcher tự chạy mechanics.
- **Semantic index**: chỉ mục nội dung có ý nghĩa do Graphify trích xuất.
