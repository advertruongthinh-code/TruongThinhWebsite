# Agent tooling

Repository chứa pin, policy, wrapper, test và watcher riêng của project. Reusable
agent package nằm ở user scope để Codex Desktop dùng cùng một stack trong mọi
workspace.

## Ownership

- [Scripts map](agent-rule-scripts.md) là canonical ownership/fallback. Rule chỉ nêu trigger/boundary.
- Hook, watcher, wrapper, launcher tự chạy normal mechanics. Impeccable context báo `MANUAL_DETECTOR_REQUIRED` mới chạy detector một lần sau UI xong.
- Không có Codex lifecycle hook project. Không tạo/sửa hook, helper ngoài approved tooling repair.

## Scope

| Scope | Nội dung đã cài |
| --- | --- |
| User global | Serena 1.7.0, Graphify 0.9.46, Chrome DevTools MCP 1.7.0, Impeccable CLI 3.6.0, Sol Advisor 0.6.0, jq 1.8.2, 53 direct skill và native persona |
| Project | Playwright 1.62.1, Wrangler 4.124.0, browser engine, `.serena/project.yml`, `.graphifyignore`, Git hook, watcher và policy |

Path ở user-global:

```text
~/.agents/skills/          payload Agent Skills trực tiếp
~/.agents/references/      reference Agent Skills dùng chung
~/.codex/agents/           native persona và Sol adapter tái sử dụng
~/.codex/tooling/          Python, Node, jq, source, log và wrapper đã pin
~/.codex/config.toml       MCP global và policy tắt hook
~/.codex/AGENTS.md         rule ADHD, Caveman ultra và Ponytail ultra luôn active
```

Caveman và Ponytail đều bắt buộc `ultra` ở global và project rule. Không có
skill, persona, MCP definition hoặc lifecycle hook project-local.

## Machine mới hoặc repair

Từ repository root:

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm tooling:bootstrap
```

Bootstrap backup managed global và project configuration, verify repository commit
và package version, install global stack, install project browser dependency,
install official Git hook của Graphify, infer Serena language và chạy doctor.
Chỉ dùng `-SkipBrowsers` khi browser engine project hiện có đã được verify:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/tooling/bootstrap.ps1 -SkipBrowsers
```

Backup có thể recover ở `~/.codex/tooling/backups/`. Receipt được generate ở
`.tooling/state/` và không làm clone dirty.

## Command và fallback

```powershell
# Chỉ diagnose setup/MCP issue đã được report.
pnpm tooling:doctor
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/tooling/doctor.ps1 -Mcp

# Notify-only package and repository-head checks.
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/tooling/check-updates.ps1

# Graphify query boundary.
& ".\scripts\tooling\invoke-graphify.ps1" query "specific question"

# Serena repair fallback; launcher/watcher normally tự sync.
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/tooling/sync-serena-languages.ps1 -Check
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/tooling/sync-serena-languages.ps1 -Apply
```

Update chỉ notify-only. Review upstream release, update
`tooling-versions.json`, chạy bootstrap và commit pin cùng evidence; không auto-update
machine đang làm việc.

## VS Code watcher

Đây là monitoring tùy chọn, không là bước mỗi agent task. **Tasks: Run Task** →
**Tooling: Watch** start song song:

- `Graphify: Watch`: official `graphify watch` qua repository wrapper.
- `Serena: Sync Languages (Watch)`: add/remove Serena language server sau
  event create, delete hoặc move file extension.

Command terminal tương đương:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/tooling/watch-graphify.ps1
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/tooling/sync-serena-languages.ps1 -Watch
```

Serena không phải Windows daemon thường trực. Codex launch required STDIO MCP
cho từng task/session với `--context codex --project-from-cwd`; launcher sync
language trước startup. Graphify cũng là required user-global STDIO MCP.
Mọi semantic task, gồm Graphify semantic extraction và content synthesis, chạy
bằng `gpt-5.6-luna` với reasoning effort `max`; semantic worker phải pin cả hai
giá trị.

Fact và decision phải được check bằng local evidence và primary official source.
Đánh dấu inference, re-check unstable information và xem upstream repository đúng
pin trước khi workaround error.

## Routing

`AGENTS.md` và rule module quyết định routing. Graphify trước cho architecture,
relationship, cross-document context, blast radius; Serena theo sau cho exact
symbol, reference, diagnostic, refactor. Corpus Graphify gồm meaningful
non-media content; `.graphifyignore`/`.gitignore` loại media, generated, runtime,
vendor.

Nếu Impeccable context báo `MANUAL_DETECTOR_REQUIRED`, UI task hoàn tất mới chạy:

```powershell
& "$env:USERPROFILE\.codex\tooling\node\node_modules\.bin\impeccable.cmd" detect <path-or-url>
```

Provider hook active thì không chạy lại command này. Graphify
`post-commit`/`post-checkout` là repository automation, không phải Codex lifecycle hook.

## MCP inventory

| MCP | Policy | Mục đích |
| --- | --- | --- |
| Serena | enabled, required | LSP symbol, reference, diagnostic, refactor |
| Graphify | enabled, required | Architecture, relationship, project-content graph |
| Chrome DevTools | enabled, optional, approval prompt | DOM, accessibility, console, network, screenshot |
| Sol Advisor | không còn MCP ở 0.6.0 | Plugin skill và ba native selective-routing role |
| node_repl | unchanged | Codex runtime integration |
| open-design | unchanged | Open Design integration |

Sau khi đổi global Codex configuration hoặc native agent, reload Codex hoặc start
task mới. Doctor pass trước reload verify file và direct MCP launch; task mới
verify Codex discovery.

## Chú thích thuật ngữ

- **User-global**: cài một lần ở user scope để dùng cho nhiều repository.
- **Project-local**: chỉ thuộc repository hiện tại.
- **STDIO MCP**: MCP server giao tiếp qua standard input/output.
- **Pin**: version hoặc commit bị khóa để workflow tái lập.
- **Doctor**: lệnh health check của tooling.
- **Routing contract**: rule quyết định agent/tool nào xử lý phần việc nào.
- **Automation**: hook, watcher, wrapper hoặc launcher tự chạy mechanics.
