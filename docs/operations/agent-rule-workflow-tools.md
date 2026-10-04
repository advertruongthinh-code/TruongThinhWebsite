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
- Không thêm/sửa lifecycle hook, helper, Serena config ngoài approved tooling repair.

## Graphify và Serena

- Graphify trước cho code và meaningful non-media content qua wrapper; chi tiết `-SkipAstRefresh`, corpus, semantic ở [graphify](graphify.md).
- Sau Graphify dùng Serena cho symbol, reference, diagnostic, refactor; `rg` chỉ bổ sung.
- Serena, Graphify là user-global MCP bắt buộc; launcher khởi động mỗi session với `--project-from-cwd` và context host (`claude-code` cho Claude Code, `codex` cho Codex), không là Windows daemon. Cloud: MCP qua plugin `cloud-stack` ([TOOLING](TOOLING.md#claude-code-cloud-environment)).
- Chỉ build/update Graphify semantic index khi user explicit request; không thì báo file pending.

## Chú thích thuật ngữ

- **MCP**: protocol kết nối agent với tool/service.
- **Automation**: hook, watcher, wrapper hoặc launcher tự chạy mechanics.
- **Semantic index**: chỉ mục nội dung có ý nghĩa do Graphify trích xuất.
