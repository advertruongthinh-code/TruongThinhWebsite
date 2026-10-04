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
| Image variants | `node scripts/site/build-image-variants.mjs [--originals map.json] [--force] [--check]` | Ghi AVIF full + AVIF/WebP 480/960 cạnh WebP public trong `src/site/assets/content`; bỏ qua file đã có. `--originals` map đường dẫn WebP sang PNG gốc trên PC (chỉ dùng khi cùng tỉ lệ). Bỏ qua danh sách `scripts/site/non-public-source-assets.mjs`. |
| Local web | `pnpm dev` | Static Node server; không Worker, không deploy. |
| Deploy demo | `pnpm deploy:demo` | Workers static assets; owner chạy, agent chỉ `--dry-run`. [Decision](../decisions/cloudflare-workers-static-demo.md). |
| Static contract | `pnpm qa:static` | Current static QA evidence. |
| Related scroll emulator + Android | `pnpm qa:related-scroll [-- --skip-emulator|--skip-device|--cards 16,first|--rotate]` | Preview8792 tự bật nếu tắt; tap thật qua `adb shell input tap` sau một tap calibration. `--rotate` khóa landscape thật qua `settings put system user_rotation 1` rồi trả giá trị cũ khi thoát; owner tự chạy lệnh này vì agent PC không đổi system setting. Raw ở `.tmp/site-media-card/related-scroll-*`. |
| Dormant Worker contract | `pnpm qa:worker:static`, `pnpm qa:worker` | Chỉ sau owner gate mở CMS và có Worker runtime. |
| Browser suite | `pnpm qa:site`, `pnpm qa:cross-browser` | Live server cần sẵn. |
| Direct Playwright | `pwsh -File scripts/tooling/run-playwright.ps1 -Suite <full|smoke>` | Chỉ khi cần runner wrapper. |

## Tooling

| Need | Entrypoint | Boundary |
| --- | --- | --- |
| Clone, approved repair | `pnpm tooling:bootstrap` | Mutate pinned user-global stack/project browser. |
| Approved repair từng phần | `pwsh -NoProfile -File scripts/tooling/bootstrap.ps1 -Components Skills` | Chọn `Python`, `Node` hoặc `Skills`; không chạy full bootstrap, đổi host agent config hay cài Git hook. |
| Skill vendor | `pnpm tooling:skills`, `pnpm tooling:skills:check` | Sinh `.claude/skills` từ `tooling-versions.json`; không sửa tay `.claude/skills`. |
| Graphify Linux/cloud | `scripts/tooling/invoke-graphify.sh query|path|explain ...` | Tự cài Graphify pin, refresh AST khi tree đổi. |
| Health | `pnpm tooling:doctor`, `pnpm tooling:doctor -- -Mcp` | Diagnose reported setup/MCP issue. |
| Update report | `pwsh -File scripts/tooling/check-updates.ps1 [-IfDue]` | Notify-only; không install. |
| Impeccable Windows | `& "$env:USERPROFILE\.agents\skills\impeccable\scripts\impeccable.cmd" context|doctor|detect` | Skill 4.5.0; `context` một lần mỗi session, `doctor` cho maintenance; không cài agent lifecycle hook. |
| Graphify query | `& ".\scripts\tooling\invoke-graphify.ps1" query|path|explain ...`; khi watcher active: thêm `-SkipAstRefresh` trước command | Mặc định refresh fail closed; switch chỉ dùng graph hiện có sau save đã được watcher xử lý. |
| Graph hook | `pwsh -File scripts/tooling/graphify-git-hooks.ps1 -Action status` | Diagnose/approved repair; hook tự refresh khi active. |
| Ponytail Git gate | `pwsh -File scripts/tooling/ponytail-git-hooks.ps1 -Action install` | `pre-commit`/`pre-push` gọi `claude -p /ponytail-review` mức ultra, chặn khi net cắt > 20 dòng hoặc lỗi; install chỉ approved repair, gỡ bằng xóa `.git/hooks/pre-*`. |
| Graph watcher | `pwsh -File scripts/tooling/watch-graphify.ps1` | Opt-in monitoring, không là bước mỗi task. |
| Serena language | `pwsh -File scripts/tooling/sync-serena-languages.ps1 -Check|-Apply|-Watch` | Launcher/watcher sở hữu normal sync; repair fallback, không edit config tay. |

## Reference research

| Need | Entrypoint | Boundary |
| --- | --- | --- |
| Archive first-party reference | `node scripts/reference/archive-reference.mjs --origin <url>` | User-authorized research. Có `--archive-dir`, `--delay-ms`, caps, sitemap/legacy origin. |

## Managed/helper

- MCP launcher: `global-mcp.ps1`, `start-serena-mcp.ps1`, `start-graphify-mcp.ps1`, `start-chrome-devtools-mcp.ps1`. Host agent launch MCP mỗi session; không chạy như Windows daemon.
- Internal: `common.ps1`, `graphify-freshness.ps1`, `graphify-semantic-status.py`, `graphify_supplemental.py`, `serena_sync.py`, `mcp_probe.py`, `write-install-manifest.ps1`, patch/test fixture. Chỉ tool-maintenance task được user approve mới gọi.
- `skill-overrides/`: override cả thư mục skill upstream cùng tên; `pnpm tooling:skills` áp dụng khi sinh `.claude/skills`.

## Chú thích thuật ngữ

- **Entrypoint**: command/script agent được phép gọi trực tiếp.
- **Helper**: script phục vụ entrypoint khác, không là public command.
- **Automation**: hook, watcher, wrapper hoặc launcher tự chạy mechanics.
- **Notify-only**: chỉ báo thông tin, không tự cài update.
