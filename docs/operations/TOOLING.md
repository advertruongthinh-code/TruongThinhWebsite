# Agent tooling

Repository chứa pin, policy, wrapper, test và watcher của project; không vendor skill.
Runtime agent package nằm ở user scope; Claude Code và Codex dùng chung một stack trong
mọi workspace. Pin canonical: `tooling-versions.json`.

## Ownership

- [Scripts map](agent-rule-scripts.md) là canonical ownership/fallback. Rule chỉ nêu trigger/boundary.
- Hook, watcher, wrapper, launcher tự chạy normal mechanics. Git `pre-commit`/`pre-push` chạy `claude -p /ponytail-review` mức ultra, read-only trên diff code (bỏ qua `*.md`), chặn khi đề xuất cắt hơn 20 dòng hoặc review lỗi. Graphify `post-commit`/`post-checkout` là repository automation, không phải agent lifecycle hook.
- Không có agent lifecycle hook project. Skill đến từ plugin pin ở user scope (cloud: `cloud-setup.sh`, local: `local-setup.ps1`), repo không vendor skill; không persona, MCP definition project-local. Không tạo/sửa hook, helper ngoài approved tooling repair.

## Pin

| Scope | Nội dung đã cài (2026-10-17) |
| --- | --- |
| User global | Serena 2.0.0, Graphify 0.9.92, uv 0.13.1, Chrome DevTools MCP 1.11.0, Impeccable CLI 4.6.0/skill 4.6.0, jq 1.8.2, 56 direct skill và native persona |
| Project | pnpm 12.14.0, Playwright 1.64.1, browser engine, static Node preview, `.serena/project.yml`, `.graphifyignore`, Git hook, watcher và policy |

Năm plugin skill (agent-skills, caveman, ponytail, impeccable, i-have-adhd) cài
từ commit trong `tooling-versions.json`. Ponytail bắt buộc `ultra`; skill caveman
chỉ chạy khi user gọi; `i-have-adhd` tự gọi.

Wrangler không được cài trong static phase; chỉ `pnpm deploy:demo` gọi bản
pin qua `pnpm dlx` theo [decision demo](../decisions/cloudflare-workers-static-demo.md).
`src/worker/` và `wrangler.toml` chỉ là dormant CMS source; việc mở lại cần owner gate.

## Path user-global

```text
~/.claude/skills/<plugin>  năm plugin skill (junction tới ~/.claude/agent-tools/src)
~/.agents/skills/          skill Codex (Codex tự cài khi cần; bootstrap chỉ giữ graphify)
~/.codex/agents/           bốn native persona review (Codex)
~/.codex/tooling/          Python, Node, jq, source, log, wrapper, backups/
~/.codex/config.toml       MCP global Codex và policy tắt hook
~/.codex/AGENTS.md         rule global ADHD, Ponytail ultra, Caveman chỉ khi user gọi
~/.claude/CLAUDE.md        import @~/.codex/AGENTS.md
~/.claude/agents/*.md      bốn persona review, chép từ ~/.codex/agents/*.toml
~/.claude.json             MCP user scope Claude: serena, graphify qua mcp.ps1
```

Bootstrap gọi `local-setup.ps1` cho skill Claude. Persona Claude
là bản chép tay; đổi persona Codex thì chép lại. Serena dùng
`--project-from-cwd` với context của host: cloud `claude-code`
(`cloud-setup.sh`); `global-mcp.ps1` (chép thành `mcp.ps1`) trên PC mặc định `codex`. Chrome DevTools MCP chưa
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

## Claude Code: skill

Một nguồn skill duy nhất: năm plugin pin, cùng quy tắc ở mọi nơi (bỏ hook, caveman
chỉ user gọi, `i-have-adhd` tự gọi). Cloud cài bằng `cloud-setup.sh` (mục dưới),
máy local bằng `pwsh -NoProfile -File scripts/tooling/local-setup.ps1` (một lần mỗi
máy, restart Claude Code; `bootstrap.ps1` cũng gọi script này). Repo không còn
`.claude/skills`; decision: [skill từ plugin pin](../decisions/claude-skills-from-pinned-plugins.md).
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
`bootstrap.ps1`; đổi một bên thì đổi cả hai. CI chạy
`tests/tooling/global-rules-sync.test.mjs`: fail khi hai khối lệch nhau hoặc
pattern trong `doctor.ps1` không còn khớp khối đó. ADHD tự gọi, Ponytail ultra luôn bật,
Caveman chỉ chạy khi user gọi; bật qua rule này như local, không qua hook.

| Tool | Cài trên cloud |
| --- | --- |
| agent-skills | Plugin: 25 skill, 9 command, 4 agent, references |
| caveman | Plugin: 22 skill (chỉ user gọi, `disable-model-invocation: true`), 3 agent, `/caveman-init`; CLI 4.0.1, MCP `caveman`, `caveman-browse`, `cavemem` |
| ponytail | Plugin: 6 skill (bản 5 bỏ MCP `ponytail`) |
| impeccable | Plugin: skill, 4 agent; engine 0.1.15 cache, CLI npm 4.6.0 |
| i-have-adhd | Plugin: skill, tự gọi (script bỏ `disable-model-invocation`, giống override repo) |
| graphify | `graphifyy[all]` 0.9.92, skill global, MCP `graphify` |
| serena | `serena-agent` 2.0.0, MCP `--context claude-code --project-from-cwd --agent-interface tools` (giữ bộ tool cũ thay REPL mặc định) |
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
`claude plugin list` liệt kê sáu plugin `@skills-dir`.

## Browser QA trên cloud

Cloud environment cho phép `cdn.playwright.dev`,
`playwright.download.prss.microsoft.com` và `cdn.jsdelivr.net` (owner mở
04/10). Mỗi session mới cài engine vào cache user, không ghi vào repo:

```bash
PLAYWRIGHT_BROWSERS_PATH=$HOME/.cache/ms-playwright pnpm exec playwright install --with-deps firefox webkit chromium
```

Từ khi font và vendor tự host (PR #53), page test chỉ gọi origin local nên cả
Chromium, Firefox và WebKit chạy runner trực tiếp, không cần preload hay quyền
riêng:

```bash
PLAYWRIGHT_BROWSERS_PATH=$HOME/.cache/ms-playwright LAYOUT_ENGINES=firefox node tests/site/mobile-layout-parity.e2e.mjs --scope all
```

## Doctor và update

```powershell
pnpm tooling:doctor
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/tooling/doctor.ps1 -Mcp
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/tooling/check-updates.ps1
```

Doctor chỉ diagnose issue đã report. Update notify-only: review upstream
release, sửa `tooling-versions.json`, chạy bootstrap, commit pin cùng evidence.
Dependabot (`.github/dependabot.yml`) chỉ mở PR cập nhật GitHub Actions hằng tuần; npm giữ pin tay.
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

## MCP

| MCP | Policy | Mục đích |
| --- | --- | --- |
| Serena | required | LSP symbol, reference, diagnostic, refactor |
| Graphify | required | Architecture, relationship, project-content graph |
| Chrome DevTools | optional, approval prompt | DOM, accessibility, console, network, screenshot |

Serena và Graphify là STDIO MCP host launch mỗi session, không là Windows daemon.
Serena bật lại language server Markdown (marksman) theo owner 2026-10-17, thay quyết định tắt
2026-10-14; marksman ăn 1-3 GB RAM mỗi phiên trên PC, RAM căng thì tắt lại qua
`scripts/tooling/serena-language-map.json`.

## API key

Quy ước owner chốt 2026-10-18:

- Repo secret GitHub (Settings, Secrets and variables, Actions) là nơi lưu gốc mọi API key,
  mỗi key một tên viết hoa: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `KIE_API_KEY`,
  `RUNNINGHUB_API_KEY`.
- Repo secret chỉ workflow GitHub Actions đọc được. Máy chạy script ngoài Actions giữ bản sao
  cùng tên: PC là biến môi trường user (owner tự thêm qua "Edit environment variables for your
  account"), cloud là secret của cloud environment. Đổi key thì sửa repo secret trước, rồi bản sao.
- Script đọc key từ biến môi trường cùng tên. Agent không in, ghi log, commit hay chép giá trị
  key, không nhờ owner dán key vào chat; owner tự nhập key ở mọi nơi.

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
- **Repo secret**: biến bí mật lưu trong GitHub repository, chỉ workflow GitHub Actions đọc được.
