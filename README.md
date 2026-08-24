# Website Trường Thịnh

Website tĩnh VI/EN theo hướng static-first cho Trường Thịnh Interior và
Advertising. Root của repository là site canonical. Mục tiêu trước mắt là một
public website đáng tin cậy; CMS, private admin, D1 và R2 để ở phase sau.

GitHub repository: [advertruongthinh-code/TruongThinhWebsite](https://github.com/advertruongthinh-code/TruongThinhWebsite)

## Khởi động nhanh

Yêu cầu: Node.js 22+ và Corepack.

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Với Codex Desktop trên machine mới, cài hoặc repair pinned user-global agent
stack và project-local browser tooling bằng một command:

```powershell
pnpm tooling:bootstrap
```

Chỉ dùng khi machine mới hoặc repair. Nó tái tạo pinned user-global stack và
project browser tooling. Repository override Caveman `ultra`; ADHD/Ponytail
ultra vẫn active. Chi tiết ownership automation ở
[`docs/operations/TOOLING.md`](docs/operations/TOOLING.md).

Mở `http://127.0.0.1:8787/vi/`. Một bước copy nhỏ có allowlist tạo deployment
directory bị Git ignore là `.site-output/`. HTML, CSS, JavaScript và media được
serve như Cloudflare static asset; Worker thêm canonical locale route, redirect,
localized metadata, `robots.txt` và sitemap.

## Phạm vi hiện tại

- `/vi/` và `/en/`: home.
- `/vi/residential/` và `/en/residential/`: residential interior.
- `/vi/commercial/` và `/en/commercial/`: commercial interior.
- `/vi/advertising-products/` và `/en/advertising-products/`: sản phẩm quảng cáo.
- `/vi/about/` và `/en/about/`: company profile.
- Static page hoạt động không cần D1, R2, Access hoặc CMS secret.
- Dynamic `/projects/:slug/`, admin và publishing workflow thuộc CMS
  phase, không nằm trong release gate đầu tiên.

Public copy vẫn cần owner xác nhận Zalo, address, founding year và warranty.
Không tự invent các giá trị này.

## Command

```powershell
pnpm qa:static
pnpm dev
pnpm qa:worker:static
pnpm qa:cross-browser
pnpm deploy
```

`prepare:site` chỉ copy public file vào `.site-output`; nó loại tooling,
report, reference archive, CMS admin file và repository metadata.
`qa:static` kiểm tra source contract mà không start server.
`qa:worker:static` cần Wrangler ở `http://127.0.0.1:8787` và kiểm tra cả hai
locale, redirect, canonical URL, sitemap và CMS-disabled fallback.
UI release còn cần live interaction evidence từ Playwright, Computer Use và
Chrome DevTools MCP. Xem [`tests/README.md`](tests/README.md) để đọc browser matrix và
evidence contract.

## Deployment

GitHub là source of truth. Pull request chạy static và browser smoke gate.
Production deployment là thủ công qua GitHub Actions cho tới stable release đầu
tiên:

1. Cấu hình repository secret `CLOUDFLARE_API_TOKEN` và
   `CLOUDFLARE_ACCOUNT_ID`.
2. Chạy workflow `Deploy` từ GitHub Actions.
3. Verify URL `workers.dev` được generate trước khi connect production
   domain.

Agent stack là user-global; Playwright, Wrangler và browser engine vẫn
project-local và được pin. Clone vẫn portable vì `pnpm tooling:bootstrap`
reconstruct cả hai scope từ tracked pin và script.

## Cây thư mục và trạng thái

Nhãn lifecycle và nhãn Git là hai việc khác nhau. `[UNTRACKED]` chỉ nói path
chưa nằm trong Git index ở snapshot hiện tại; không có nghĩa path đó dư hoặc
được phép xóa.

```text
.
├─ src/                                      # source sản phẩm
│  ├─ site/                                  # [LIVE, TRACKED/UNTRACKED MIX] source public canonical
│  │  ├─ index.html                          # [LIVE] home VI/EN
│  │  ├─ residential/index.html              # [LIVE] không gian nhà ở
│  │  ├─ commercial/index.html               # [LIVE] không gian kinh doanh
│  │  ├─ advertising-products/index.html     # [LIVE, UNTRACKED] sản phẩm quảng cáo
│  │  ├─ about/index.html                    # [LIVE] giới thiệu
│  │  ├─ assets/                             # [LIVE, UNTRACKED] brand, client logo, media public
│  │  ├─ content/client-logos.json           # [LIVE, UNTRACKED] manifest logo khách hàng
│  │  ├─ style.css, detail.css               # [LIVE] layout và visual contract
│  │  └─ motion.js, detail.js                # [LIVE] locale, navigation, motion, gallery, filter
│  ├─ worker/index.js                        # [LIVE] route/SEO; CMS compatibility vẫn dormant
│  ├─ admin/                                 # [DEV] CMS shell, không được copy vào public output
│  └─ db/migrations/                         # [DEV, TRACKED/UNTRACKED MIX] draft schema CMS
├─ tests/                                    # [PROJECT, TRACKED/UNTRACKED MIX] static/browser/Worker/tooling QA
├─ scripts/                                  # [PROJECT, TRACKED/UNTRACKED MIX] build, QA, research, tooling entrypoint
├─ docs/                                     # [PROJECT, TRACKED/UNTRACKED MIX] spec, decision, rule, report đã chấp nhận
│  └─ reports/*.csv, *.bak                   # [GENERATED] raw parity ledger local, Git ignore
├─ research/reference-site/
│  ├─ README.md                              # [PROJECT] boundary và cách dùng research
│  ├─ archive/                               # [RESEARCH ARCHIVE] crawl local, Git ignore
│  └─ runtime-evidence/                      # [GENERATED] screenshot/JSON raw, Git ignore
├─ source-assets/                            # [DEV, UNTRACKED] source media biên tập, không deploy
├─ .openai/hosting.json                      # [LIVE CONFIG, UNTRACKED] Codex Sites project id
├─ .github/                                  # [PROJECT] CI và deploy workflow
├─ .codex/, .serena/                         # [PROJECT] agent/Serena config; cache và log bị ignore
├─ .vscode/                                  # [DEV, UNTRACKED] task chạy watcher/doctor
├─ .site-output/                             # [GENERATED] build deploy từ src/site, không edit
├─ .tmp/, tmp-layout-motion-*/               # [GENERATED] retry/probe local, Git ignore
├─ .tooling/, graphify-out/, .wrangler/      # [CACHE] runtime/tool state, Git ignore
├─ node_modules/                             # [CACHE] dependency install, Git ignore
└─ package.json, pnpm-lock.yaml, wrangler.toml
                                               # [PROJECT] command, pin và Worker config
```

Quy tắc ownership:

1. Chỉ edit public source tại `src/site/`; `.site-output/` luôn được tạo lại.
2. Source, config, test và Markdown đã chấp nhận là project file cần Git quản
   lý; raw evidence, build output, archive và cache phải nằm ngoài Git index.
3. File untracked phải được review theo path trước khi stage; không xóa hoặc
   commit hàng loạt chỉ vì trạng thái `??`.
4. Trước khi edit copy hoặc media, đọc
   [`docs/product/CONTENT-MEDIA-GUIDE.md`](docs/product/CONTENT-MEDIA-GUIDE.md).

Inventory và deletion ledger có ngày nằm tại
[`docs/reports/verification-2026-08-25-project-source-cleanup.md`](docs/reports/verification-2026-08-25-project-source-cleanup.md).

## Reference research

Crawler là generic có chủ đích và cần origin explicit:

```powershell
node scripts/reference/archive-reference.mjs --origin <url>
```

Source và media được generate ở `research/reference-site/archive/`, bị Git ignore
và không được production website load. Không commit proprietary source, media,
logo hoặc identifying reference-site URL.

## CMS phase

CMS tương lai có thể activate Worker dormant, selected structured-data storage,
selected media object storage và Access-protected admin shell. Nó không được
block hoặc destabilize static release. Xem
[`docs/specs/cms-content-publishing.md`](docs/specs/cms-content-publishing.md) và
[`docs/engineering/CMS-ROADMAP.md`](docs/engineering/CMS-ROADMAP.md).

## Agent instruction

- Shared rule: [`AGENTS.md`](AGENTS.md).
- Claude Code import cùng rule qua [`CLAUDE.md`](CLAUDE.md).
- Setup, MCP inventory, watcher, terminal command và recovery được ghi trong
  [`docs/operations/TOOLING.md`](docs/operations/TOOLING.md).
- Brief setup project mới có thể tái sử dụng và lesson nằm trong
  [`docs/reports/verification-2026-08-09-agent-workspace-bootstrap.md`](docs/reports/verification-2026-08-09-agent-workspace-bootstrap.md).

## Chú thích thuật ngữ

- **Static-first**: ưu tiên website tĩnh trước phần dynamic.
- **Canonical**: bản được xem là nguồn chuẩn.
- **Portable**: có thể tái lập trên machine khác từ pin và script của repository.
- **Deployment**: quá trình đưa output lên môi trường phục vụ.
- **Fallback**: nhánh xử lý thay thế khi capability chính chưa có hoặc bị tắt.
- **Automation**: hook, watcher, wrapper hoặc launcher tự xử lý mechanics.
- **Dormant**: đã có trong source nhưng hiện chưa được activate.
