@AGENTS.md

# Claude Code

Dùng command nội bộ repository; dependency pin nằm trong `tooling-versions.json`. Không tạo
workflow riêng cho Claude khi `AGENTS.md` đã định nghĩa shared contract.

Skill đến từ plugin pin ở user scope ([TOOLING](docs/operations/TOOLING.md#claude-code-skill)). Phiên Linux hoặc cloud (`CLAUDE_CODE_REMOTE=true`) không có PowerShell: thay
`invoke-graphify.ps1` bằng `scripts/tooling/invoke-graphify.sh query "..."`.

## Chú thích thuật ngữ

- **Shared contract**: bộ rule chung được các agent cùng tuân thủ.
- **Pinned dependency**: dependency có version được khóa để workflow tái lập.
- **Vendor**: chép skill upstream vào repo ở commit đã pin.
