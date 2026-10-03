# Workflow và tool rule

## Skill routing

- Sau `STATE`, bắt đầu `using-agent-skills`; chỉ chọn skill liên quan.
- Rule/context: `context-engineering`. UI: `frontend-ui-engineering`, `impeccable`; browser thật: `browser-testing-with-devtools`.
- Durable decision: `documentation-and-adrs`. Xóa consumed document: `deprecation-and-migration` trước. Notion: skill phù hợp. Trước handoff: `ponytail` bỏ complexity thừa.
- Tooling chuẩn: `docs/operations/TOOLING.md`. Entry point/fallback: [scripts map](agent-rule-scripts.md). `pnpm tooling:bootstrap` chỉ clone hoặc approved repair.

## Codex native execution

- Skill chuyên môn đã chọn sở hữu workflow và gate; `using-agent-skills` định tuyến phase. Main đánh giá ambiguity, scope, risk và verifiability rồi tự làm hoặc chọn collaboration native của Codex khi tool khả dụng và có ownership rõ. Không cài router runtime riêng hoặc model pin chung.
- Chọn cặp model/effort callable theo tổng chi phí đạt acceptance; brief cụ thể hơn khi route thấp. Main giữ requirement, architecture, diff inspection, verification và final acceptance.
- Main agent giữ requirement, architecture, diff inspection, verification và final acceptance. Output của worker/reviewer là claim cho đến khi main agent kiểm chứng.
- Persona chỉ review chuyên biệt, không gọi persona. Chỉ parallel review khi các góc kiểm tra độc lập và production risk đủ lớn; main agent hợp nhất kết quả.
- Chỉ dùng thư mục `skills/` dùng chung với Codex. Không chép slash command, persona bundle hoặc lifecycle hook dành riêng cho Claude vào Codex.

## Automation

- Ownership/fallback: [scripts map](agent-rule-scripts.md). Không chạy lại normal hook, watcher, wrapper, launcher mechanics sau edit.
- Git `pre-commit` và `pre-push` tự chạy `ponytail-review` read-only, fail closed; không dùng `--no-verify`. Đây là repository Git hook, không phải Codex lifecycle hook.
- Impeccable hook active tự chạy detector. Context báo `MANUAL_DETECTOR_REQUIRED` thì chạy một lần sau UI hoàn tất.
- Không thêm/sửa lifecycle hook, helper, Serena config ngoài approved tooling repair.

## Graphify và Serena

- Mọi role dùng boundary:

```powershell
& ".\scripts\tooling\invoke-graphify.ps1" query "specific question"
& ".\scripts\tooling\invoke-graphify.ps1" -SkipAstRefresh query "specific question"
```

- Mặc định không có switch: wrapper tự refresh AST và fail closed nếu refresh lỗi.
- Khi `Graphify: Watch` đang chạy và đã xử lý save gần nhất: đặt
  `-SkipAstRefresh` trước command để query graph hiện có, tránh tranh refresh lock.
  Switch không build graph thiếu, không xác nhận freshness và không cấp quyền chạy
  semantic extraction.
- Khi `graphify-out/graph.json` có: Graphify trước cho code và meaningful non-media content: docs, spec, ADR, config, SQL, HTML, JSON, YAML, PDF, Office. Bỏ image, video, audio, font, generated output, runtime state.
- Sau Graphify dùng Serena cho symbol, reference, diagnostic, refactor; `rg` chỉ bổ sung. Semantic freshness chỉ warning, không chặn structural query.
- Serena, Graphify là user-global MCP bắt buộc. Launcher khởi động mỗi task/session với `--project-from-cwd` và context theo host: Codex `codex`, Claude Code `claude-code` (`mcp.ps1 serena -Context claude-code`); không là Windows daemon thường trực.

## Semantic

- Semantic task, gồm Graphify extraction/content synthesis, dùng cùng đánh giá native Codex theo scope, risk và ownership; không pin Luna/max chung. Chỉ định model/effort khi host cho phép; effective route thiếu evidence là unknown.
- Chỉ build/update Graphify semantic index khi user explicit request. Nếu không: báo file pending; không spawn extraction worker, merge chunk, ghi cache/manifest. Structural refresh do automation xử lý.

## Chú thích thuật ngữ

- **MCP**: protocol kết nối agent với tool/service.
- **Automation**: hook, watcher, wrapper hoặc launcher tự chạy mechanics.
- **Structural AST**: graph cấu trúc source để query quan hệ.
- **Semantic index**: chỉ mục nội dung có ý nghĩa do Graphify trích xuất.
