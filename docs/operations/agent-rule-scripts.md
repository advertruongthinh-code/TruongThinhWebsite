# Scripts map

Path đều relative repository root. Dùng entrypoint này; helper/private launcher ở cuối không gọi trực tiếp nếu không tool-maintenance task được user approve.

## Ownership

- Rule chọn trigger/boundary/fallback; entrypoint, hook, watcher, launcher chạy mechanics.
- Graphify hook/watcher và wrapper tự refresh structural AST. Normal task chỉ query wrapper.
- Serena launcher/watcher tự sync language. `-Apply` chỉ repair sau lỗi được report.
- Impeccable provider hook active tự chạy detector; context báo `MANUAL_DETECTOR_REQUIRED` thì UI task chạy detector một lần sau khi xong.

## Site và QA

| Need | Entrypoint | Boundary |
| --- | --- | --- |
| Copy static source | `pnpm prepare:site` | Generate `.site-output/`; không edit output. |
| Local web | `pnpm dev` | Không deploy. |
| Static contract | `pnpm qa:static`, `pnpm qa:worker:static` | QA/release evidence. |
| Browser suite | `pnpm qa:site`, `pnpm qa:cross-browser` | Live server cần sẵn. |
| Direct Playwright | `pwsh -File scripts/tooling/run-playwright.ps1 -Suite <full|smoke>` | Chỉ khi cần runner wrapper. |

## Tooling

| Need | Entrypoint | Boundary |
| --- | --- | --- |
| Clone, approved repair | `pnpm tooling:bootstrap` | Mutate pinned user-global stack/project browser. |
| Health | `pnpm tooling:doctor`, `pnpm tooling:doctor -- -Mcp` | Diagnose reported setup/MCP issue. |
| Update report | `pwsh -File scripts/tooling/check-updates.ps1 [-IfDue]` | Notify-only; không install. |
| Graphify query | `& ".\scripts\tooling\invoke-graphify.ps1" query|path|explain ...` | Mandatory graph boundary. |
| Graph hook | `pwsh -File scripts/tooling/graphify-git-hooks.ps1 -Action status` | Diagnose/approved repair; hook tự refresh khi active. |
| Graph watcher | `pwsh -File scripts/tooling/watch-graphify.ps1` | Opt-in monitoring, không là bước mỗi task. |
| Serena language | `pwsh -File scripts/tooling/sync-serena-languages.ps1 -Check|-Apply|-Watch` | Launcher/watcher sở hữu normal sync; repair fallback, không edit config tay. |
| Sol Advisor repair | `pwsh -File scripts/tooling/install-sol-advisor.ps1` | Chỉ approved repair; thay global tooling. |

## Reference research

| Need | Entrypoint | Boundary |
| --- | --- | --- |
| Archive first-party reference | `node scripts/reference/archive-reference.mjs --origin <url>` | User-authorized research. Có `--archive-dir`, `--delay-ms`, caps, sitemap/legacy origin. |

## Managed/helper

- MCP launcher: `global-mcp.ps1`, `start-serena-mcp.ps1`, `start-graphify-mcp.ps1`, `start-chrome-devtools-mcp.ps1`. Codex launch MCP mỗi session; không chạy như Windows daemon.
- Internal: `common.ps1`, `graphify-freshness.ps1`, `graphify-semantic-status.py`, `graphify_supplemental.py`, `serena_sync.py`, `mcp_probe.py`, `write-install-manifest.ps1`, patch/test fixture. Chỉ tool-maintenance task được user approve mới gọi.

## Chú thích thuật ngữ

- **Entrypoint**: command/script agent được phép gọi trực tiếp.
- **Helper**: script phục vụ entrypoint khác, không là public command.
- **Automation**: hook, watcher, wrapper hoặc launcher tự chạy mechanics.
- **Notify-only**: chỉ báo thông tin, không tự cài update.
