# Project tooling

Toàn bộ runtime, package, skill, persona và MCP của dự án nằm trong repository;
không có bước nào yêu cầu sửa cấu hình Codex/Git/user scope. Phiên bản và nguồn
được khóa tại `tooling-versions.json`, Node dependencies tại `pnpm-lock.yaml`.

## Lệnh vận hành

```powershell
# Backup rồi cài đè project tooling; chỉ dùng package đã pin.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/tooling/bootstrap.ps1

# Kiểm tra nhanh hoặc kiểm tra cả ba MCP.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/tooling/doctor.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/tooling/doctor.ps1 -Mcp

# Chỉ báo update, không tự cài.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/tooling/check-updates.ps1

# Graphify lifecycle.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/tooling/set-graphify-profile.ps1 -Profile boundary
& ".\.tooling\python\Scripts\graphify.exe" hook status

# Serena lifecycle.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/tooling/sync-serena-languages.ps1 -Check
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/tooling/sync-serena-languages.ps1 -Apply
```

`boundary` là profile mặc định; `strict` từ chối Graphify query khi semantic
marker còn tồn tại; `watch` thêm watcher debounce cho thay đổi từ editor ngoài.
`PostToolUse` tính fingerprint rẻ và chỉ tạo `.tooling/state/graphify/dirty.json`
khi corpus thực sự đổi; thao tác Bash chỉ đọc không chạy Serena sync hoặc
Graphify update. Trước Graphify query và tại `Stop`, dispatcher recheck sau khi
lấy lock để nhiều hook đồng thời chỉ chạy một `graphify update`. Fingerprint
được ghi sau update thành công; thay đổi trong lúc update giữ graph ở trạng thái
dirty cho lượt sau. Lệnh update chỉ cập nhật AST/structural data local, không gọi
LLM. File `graphify-out/needs_update` biểu thị docs/media còn cần semantic pass.

Graphify executable không được thêm vào global `PATH`; luôn gọi project-local
`& ".\.tooling\python\Scripts\graphify.exe" ...` để clone trên máy khác dùng đúng
phiên bản đã pin.

## Serena language lifecycle

Script quét file không bị ignore, loại runtime/cache/assets/report/backup, dùng
schema thật của Serena đang cài và giữ nguyên mọi key YAML khác. Tập hiện tại:
`typescript`, `html`, `scss`, `powershell`, `markdown`, `json`, `toml`, `yaml`,
`python`; `.sql` được báo unsupported, không ánh xạ giả.

Khi tập extension đổi, script backup `project.yml`, cập nhật YAML bằng parser,
chạy health-check và tạo marker restart. Chỉ gỡ marker sau khi một Serena MCP
mới đã activate project và `get_current_config` xác nhận context hiện hành.

## Skills, personas và hooks

- 24 Addy Osmani skills cùng shared references, Impeccable, Graphify và
  sáu Ponytail skills `4.9.0` ở `.agents/skills`. Ponytail được pin tại commit
  `2ed6c52c9d7e5e56942508591085fd45dea277d3` và được bootstrap lại từ repo,
  nên clone mới không phụ thuộc skill global.
- Project không đăng ký Ponytail MCP hoặc lifecycle hook thứ hai. `AGENTS.md`
  chứa guard tối giản; user/global plugin, nếu có, sở hữu mode và ba hook
  upstream. Cách tách này tránh inject trùng nhưng vẫn giữ skill dùng được khi
  clone sang máy chưa cài plugin global.
- Bốn persona read-only ở `.codex/agents`.
- `.codex/hooks.json` có đúng một dispatcher cho mỗi event. Dispatcher quản lý
  quick doctor, update notification, Serena sync, Graphify
  freshness, Impeccable detector, watcher PID, lock và Stop loop guard.
- ADHD always-on dùng contract ngắn trong `AGENTS.md`; project không vendoring
  hoặc SessionStart-inject bản skill đầy đủ để tránh trùng với skill global.
- Git `post-commit`/`post-checkout` là managed block của Graphify CLI; không sửa
  tay. Log project hook ở `.tooling/logs/hooks.log`.

## Browser QA

Playwright Chromium/Firefox/WebKit nằm ở `.tooling/browsers`; chạy qua
`scripts/tooling/run-playwright.ps1`. Chromium chạy full matrix hiện có;
Firefox/WebKit chạy smoke về navigation, locale, console/network, overflow và
reduced motion. Smoke artifacts mặc định nằm trong `%TEMP%` vì Wrangler asset
watcher sẽ reload liên tục nếu trace được ghi dưới asset root. Chrome DevTools
MCP dùng `--isolated`, tắt usage statistics và
CrUX, đồng thời redact network headers. Phiên bản khóa hiện không cung cấp flag
chính thức để tắt update notification, nên không dùng flag tự chế.

DevTools/Computer Use phù hợp điều tra DOM, a11y tree, network và interaction;
chúng không thay thế regression test. Native GUI cần logs và automation của
framework tương ứng; Playwright chỉ phù hợp web/webview có interface hỗ trợ.

## Backup và phục hồi

Backup trước cài đặt nằm dưới `.tooling/backups`; mỗi backup có
`checksums.json`. Backup gốc của lần này là
`pre-install-20260808-001` (158 file; manifest SHA-256
`741f318f0b8b88a8ada173dce7b34979df44259665b97917173a1a4c962504b9`).
Graph cũ có vendored skill được giữ tại
`graphify-out-before-clean-rebuild-20260808-0128`. Chỉ phục hồi sau khi so checksum
và xác minh đích nằm trong workspace.
