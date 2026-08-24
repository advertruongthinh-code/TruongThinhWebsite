# Workflow và tool rule

## Skill routing

- Sau `STATE`, bắt đầu `using-agent-skills`; chỉ chọn skill liên quan.
- Rule/context: `context-engineering`. UI: `frontend-ui-engineering`, `impeccable`; browser thật: `browser-testing-with-devtools`.
- Durable decision: `documentation-and-adrs`. Xóa consumed document: `deprecation-and-migration` trước. Notion: skill phù hợp. Trước handoff: `ponytail` bỏ complexity thừa.
- Tooling chuẩn: `docs/operations/TOOLING.md`. Entry point/fallback: [scripts map](scripts.md). `pnpm tooling:bootstrap` chỉ clone hoặc approved repair.

## Automation

- Ownership/fallback: [scripts map](scripts.md). Không chạy lại normal hook, watcher, wrapper, launcher mechanics sau edit.
- Impeccable hook active tự chạy detector. Context báo `MANUAL_DETECTOR_REQUIRED` thì chạy một lần sau UI hoàn tất.
- Không thêm/sửa lifecycle hook, helper, Serena config ngoài approved tooling repair.

## Graphify và Serena

- Mọi role dùng boundary:

```powershell
& ".\scripts\tooling\invoke-graphify.ps1" query "specific question"
```

- Khi `graphify-out/graph.json` có: Graphify trước cho code và meaningful non-media content: docs, spec, ADR, config, SQL, HTML, JSON, YAML, PDF, Office. Bỏ image, video, audio, font, generated output, runtime state.
- Sau Graphify dùng Serena cho symbol, reference, diagnostic, refactor; `rg` chỉ bổ sung. Semantic freshness chỉ warning, không chặn structural query.
- Serena, Graphify là user-global MCP bắt buộc. Launcher khởi động mỗi task/session với `--context codex --project-from-cwd`; không là Windows daemon thường trực.

## Semantic

- Semantic task, gồm Graphify extraction/content synthesis: `gpt-5.6-luna`, reasoning `max`. Main/worker pin rõ model, effort.
- Chỉ build/update Graphify semantic index khi user explicit request. Nếu không: báo file pending; không spawn extraction worker, merge chunk, ghi cache/manifest. Structural refresh do automation xử lý.

## Chú thích thuật ngữ

- **MCP**: protocol kết nối agent với tool/service.
- **Automation**: hook, watcher, wrapper hoặc launcher tự chạy mechanics.
- **Structural AST**: graph cấu trúc source để query quan hệ.
- **Semantic index**: chỉ mục nội dung có ý nghĩa do Graphify trích xuất.
