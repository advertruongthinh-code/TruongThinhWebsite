# Agent tooling

Repository chứa pin, policy, wrapper, test, watcher và skill vendor của project.
Runtime agent package nằm ở user scope; Claude Code và Codex dùng chung một stack trong
mọi workspace. Pin canonical: `tooling-versions.json`.

## Ownership

- [Scripts map](agent-rule-scripts.md) là canonical ownership/fallback. Rule chỉ nêu trigger/boundary.
- Hook, watcher, wrapper, launcher tự chạy normal mechanics. Git `pre-commit`/`pre-push` chạy `claude -p /ponytail-review` mức ultra, read-only trên diff code (bỏ qua `*.md`), chặn khi đề xuất cắt hơn 20 dòng hoặc review lỗi. Graphify `post-commit`/`post-checkout` là repository automation, không phải agent lifecycle hook.
- Không có agent lifecycle hook project. Skill vendor tại `.claude/skills` từ pin; không persona, MCP definition project-local. Không tạo/sửa hook, helper ngoài approved tooling repair.

## Pin

| Scope | Nội dung đã cài (2026-10-03) |
| --- | --- |
| User global | Serena 1.7.0, Graphify 0.9.74, uv 0.12.22, Chrome DevTools MCP 1.10.1, Impeccable CLI 4.1.0/skill 4.5.0, jq 1.8.2, 56 direct skill và native persona |
| Project | pnpm 12.8.1, Playwright 1.63.0, browser engine, static Node preview, `.serena/project.yml`, `.graphifyignore`, Git hook, watcher và policy |

Agent Skills gồm 25 upstream skill (commit trong `tooling-versions.json`).
`pnpm tooling:skills` áp dụng override từ `scripts/tooling/skill-overrides/` khi
sinh `.claude/skills`; không sửa trực tiếp payload global vì lần cài sau sẽ ghi đè. Caveman và
Ponytail bắt buộc `ultra` ở global và project rule.

Wrangler không được cài trong static phase; chỉ `pnpm deploy:demo` gọi bản
pin qua `pnpm dlx` theo [decision demo](../decisions/cloudflare-workers-static-demo.md).
`src/worker/` và `wrangler.toml` chỉ là dormant CMS source; việc mở lại cần owner gate.

## Path user-global

```text
~/.agents/skills/          payload Agent Skills trực tiếp
~/.agents/references/      reference Agent Skills dùng chung
~/.codex/agents/           bốn native persona review (Codex)
~/.codex/tooling/          Python, Node, jq, source, log, wrapper, backups/
~/.codex/config.toml       MCP global Codex và policy tắt hook
~/.codex/AGENTS.md         rule global ADHD, Caveman ultra, Ponytail ultra
~/.claude/CLAUDE.md        import @~/.codex/AGENTS.md
~/.claude/agents/*.md      bốn persona review, chép từ ~/.codex/agents/*.toml
~/.claude.json             MCP user scope Claude: serena, graphify qua mcp.ps1
```

Bootstrap copy `.claude/skills` sang `~/.agents/skills` cho Codex. Persona Claude
là bản chép tay; đổi persona Codex thì chép lại. Serena launcher hiện dùng
`--context codex --project-from-cwd` cho cả hai host. Chrome DevTools MCP chưa
đăng ký cho Claude Code vì app có browser riêng.

## Machine mới hoặc repair

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm tooling:bootstrap
```

Bootstrap backup managed config, verify repository commit và package version,
install global stack, project browser dependency, Graphify Git hook, Ponytail
review gate, infer Serena language rồi chạy doctor. `-SkipBrowsers` chỉ khi
browser engine đã verify. Backup ở `~/.codex/tooling/backups/`; receipt ở
`.tooling/state/`.

## Claude Code: skill trong repo

`.claude/skills/` và `.claude/references/` sinh từ `tooling-versions.json` bằng
`pnpm tooling:skills`; override trong `scripts/tooling/skill-overrides/` thay cả
thư mục skill upstream cùng tên. Hash nằm trong `.claude/skills.lock.json`.
Claude local, Remote Control và thread cloud cùng đọc bản này. Không sửa tay;
đổi pin hoặc override rồi chạy lại script, commit, sau đó bootstrap để Codex nhận
cùng bản. CI chạy `pnpm tooling:skills:check`.

Skill cá nhân thắng skill của repo khi trùng tên, nên `~/.claude/skills` không được
chứa các skill này. Một lần trên máy Windows, sau khi branch có `.claude/skills`:

```powershell
$p = Join-Path $env:USERPROFILE ".claude\skills"
$item = Get-Item -LiteralPath $p -Force -ErrorAction SilentlyContinue
if ($item.LinkType) { cmd /c rmdir "$p" }   # chỉ gỡ link; ~/.agents/skills giữ nguyên
elseif ($item) { Move-Item -LiteralPath $p -Destination "$p.bak-20261003" }
pnpm tooling:bootstrap
pnpm tooling:doctor
```

Doctor báo lỗi nếu `~/.agents/skills` lệch lock hoặc `~/.claude/skills` che bản repo.
Trên Linux/cloud không có PowerShell: Graphify chạy qua
`scripts/tooling/invoke-graphify.sh`, tự cài Graphify pin lần đầu.

## Claude Code: cloud environment

Cloud session không đọc máy local, nên global stack cài qua setup script của
environment `Default` tại claude.ai/code. Nguồn chuẩn là
`scripts/tooling/cloud-setup.sh`; owner dán toàn bộ file vào ô **Setup script**.
Script chạy bằng root trước khi Claude Code khởi động; kết quả được cache
khoảng 7 ngày, nên áp dụng cho mọi cloud session, mọi repo.

Cơ chế, theo rule global "never install agent lifecycle hooks": cloud chỉ có
skill, command, agent, MCP. Mỗi plugin là skills-directory plugin
`~/.claude/skills/<tên>`, symlink tới checkout pin trong `/opt/agent-tools/src`;
script xóa `hooks/hooks.json` và khóa `hooks` của manifest ngay trong checkout
(thư mục bọc bằng symlink từng phần bị Claude Code từ chối: "Path escapes plugin
directory"). Claude Code nạp
plugin dạng này mọi session, không cần `settings.json` (docs cloud ghi user
settings "not read"). Plugin local `cloud-stack` chỉ giữ MCP. Rule global ghi
vào `~/.claude/CLAUDE.md` của VM, chép nguyên khối `codex:global-stack` trong
`bootstrap.ps1`; đổi một bên thì đổi cả hai. ADHD, Caveman ultra, Ponytail ultra
bật qua rule này như local, không qua hook.

| Tool | Cài trên cloud |
| --- | --- |
| agent-skills | Plugin: 25 skill, 9 command, 4 agent, references |
| caveman | Plugin: 22 skill (chỉ user gọi, `disable-model-invocation: true`), 3 agent, `/caveman-init`; CLI 2.0.1, MCP `caveman`, `caveman-browse`, `cavemem` |
| ponytail | Plugin: 6 skill; MCP `ponytail` |
| impeccable | Plugin: skill, 4 agent; engine 0.1.11 cache, CLI npm 4.1.0 |
| i-have-adhd | Plugin: skill, tự gọi (script bỏ `disable-model-invocation`, giống override repo) |
| graphify | `graphifyy[all]` 0.9.74, skill global, MCP `graphify` |
| serena | `serena-agent` 1.7.0, MCP `--context claude-code --project-from-cwd` |
| Chrome DevTools | MCP headless, Chromium `/usr/local/bin/chromium` (`--no-sandbox` cho root) |

Pin trong script khớp `tooling-versions.json`; đổi pin thì sửa cả hai rồi dán
lại script, cache tự build lại.

Không cài, có lý do:

- Mọi lifecycle hook upstream (mode của caveman, ponytail, i-have-adhd; hook
  Impeccable; `serena-hooks`; graphify `hook-guard`; agent-skills `sdd-cache`,
  `simplify-ignore`, `session-start`): rule global cấm.
- `caveman enable`/`caveman claude`: đổi `ANTHROPIC_BASE_URL` sang proxy
  local, làm hỏng session cloud.
- Statusline caveman/ponytail: app cloud không hiển thị status line terminal.
- `caveman-shrink` cần upstream MCP cụ thể. `caveman-cloud` cần login, đang
  đóng beta. `caveman-delegate` opt-in.
- Bước per-repo (`graphify claude install`, `graphify hook install`, build graph,
  `caveman-init`): ghi file vào repo, chạy khi repo cần.
- Git hook `ponytail-git-hooks.ps1`, `graphify-git-hooks.ps1`: cần PowerShell,
  không có trên cloud. Agent cloud chạy `ponytail-review` thủ công trước commit.

Kiểm tra trong session mới: `/opt/agent-tools/setup.log` có dòng `OK`/`FAIL`;
`claude plugin list` liệt kê sáu plugin `@skills-dir`. Repo này tắt năm plugin
skill trùng qua `.claude/settings.json` (`enabledPlugins: false`), chỉ dùng bản vendor.

## Doctor và update

```powershell
pnpm tooling:doctor
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/tooling/doctor.ps1 -Mcp
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/tooling/check-updates.ps1
```

Doctor chỉ diagnose issue đã report. Update notify-only: review upstream
release, sửa `tooling-versions.json`, chạy bootstrap, commit pin cùng evidence.
Sau khi đổi global config hoặc persona, start session mới để host nhận MCP.

Watcher (Graphify, Serena language) là monitoring tùy chọn; xem
[graphify](graphify.md) và [scripts map](agent-rule-scripts.md).

## Impeccable

Impeccable 4 dùng engine binary; global Node bootstrap phải cài optional
dependency theo platform, không dùng `--no-optional`. Windows gọi
`%USERPROFILE%\.agents\skills\impeccable\scripts\impeccable.cmd` với verb
`context`, `doctor`, `detect`. Provider hook active thì không chạy lại detect;
context báo `MANUAL_DETECTOR_REQUIRED` thì chạy một lần sau UI xong. pnpm 12
dùng `--no-frozen-lockfile` khi cập nhật dependency; project/CI vẫn frozen.
Compatibility: [migration pnpm/Impeccable](../archive/reports/verification-pnpm-impeccable-major-2026-09-08.md).

## MCP

| MCP | Policy | Mục đích |
| --- | --- | --- |
| Serena | required | LSP symbol, reference, diagnostic, refactor |
| Graphify | required | Architecture, relationship, project-content graph |
| Chrome DevTools | optional, approval prompt | DOM, accessibility, console, network, screenshot |

Serena và Graphify là STDIO MCP host launch mỗi session, không là Windows daemon.

## Chú thích thuật ngữ

- **User-global**: cài một lần ở user scope để dùng cho nhiều repository.
- **Project-local**: chỉ thuộc repository hiện tại.
- **STDIO MCP**: MCP server giao tiếp qua standard input/output.
- **Pin**: version hoặc commit bị khóa để workflow tái lập.
- **Doctor**: lệnh health check của tooling.
- **Automation**: hook, watcher, wrapper hoặc launcher tự chạy mechanics.
- **Junction**: liên kết thư mục Windows, hai path cùng trỏ một nội dung.
- **Host agent**: Claude Code hoặc Codex.
- **Setup script**: Bash script của cloud environment, chạy trước khi Claude Code khởi động.
- **Skills-directory plugin**: thư mục plugin trong `~/.claude/skills/`, tự nạp mọi session.
- **Always-on**: mode tự bật đầu session qua hook, không cần gõ lệnh.
