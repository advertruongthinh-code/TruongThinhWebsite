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
project browser tooling. Caveman `ultra`; ADHD/Ponytail
ultra vẫn active. Chi tiết ownership automation ở
[`docs/operations/TOOLING.md`](docs/operations/TOOLING.md).

Mở `http://127.0.0.1:8787/vi/`. Một bước copy nhỏ có allowlist tạo static output
directory bị Git ignore là `.site-output/`. HTML, CSS, JavaScript và media được
serve bằng static Node server của repository; current local preview không khởi
động Cloudflare Worker.

## Phạm vi hiện tại

- `/vi/` và `/en/`: home.
- `/vi/residential/` và `/en/residential/`: residential interior.
- `/vi/commercial/` và `/en/commercial/`: commercial interior.
- `/vi/advertising-products/` và `/en/advertising-products/`: sản phẩm quảng cáo.
- `/vi/about/` và `/en/about/`: company profile.
- Static page hoạt động không cần D1, R2, Access hoặc CMS secret.
- Dynamic `/projects/:slug/`, admin và publishing workflow thuộc CMS
  phase, không nằm trong release gate đầu tiên.

Public copy vẫn cần owner xác nhận Zalo, founding year và warranty; địa chỉ
trụ sở đã có [decision xác nhận](docs/decisions/head-office-address-confirmed.md).
Không tự invent các giá trị này.

## Command

```powershell
pnpm qa:static
pnpm dev
pnpm qa:cross-browser
```

`prepare:site` tạo public output và HTML VI/EN tại `.site-output`; nó loại tooling,
report, reference archive, CMS admin file và repository metadata.
`qa:static` kiểm tra source contract mà không start server.
Worker static contract được giữ dormant cho CMS phase và không thuộc current
static gate.
UI release còn cần live interaction evidence từ Playwright và Chrome DevTools
MCP. Computer Use chỉ khi human path cần Windows UI mà tool chuyên biệt không đủ.
Xem [`tests/README.md`](tests/README.md) để đọc browser matrix và
evidence contract.

## Deployment

GitHub là source of truth. Pull request chạy static và browser smoke gate.
Demo tĩnh chạy trên Cloudflare Workers static assets: owner chạy
`pnpm deploy:demo` trên máy local theo
[quyết định demo](docs/decisions/cloudflare-workers-static-demo.md) và
[các bước phát hành](docs/specs/frontend-static-release.md#phát-hành-demo-cloudflare--owner-đồng-ý-03102026).
Không có CI deploy; CMS chưa activate.
Trạng thái phát hành thực tế xem [STATE](docs/STATE.md), thay đổi xem
[CHANGELOG](CHANGELOG.md).
Wrangler cho CMS Worker chỉ được cài và activate
khi owner mở CMS phase theo
[`Khóa Wrangler đến phase CMS`](docs/decisions/wrangler-deferred-until-cms.md).

Agent stack là user-global; Playwright và browser engine vẫn project-local và
được pin. Clone vẫn portable vì `pnpm tooling:bootstrap` reconstruct cả hai
scope từ tracked pin và script.

## Cây thư mục và trạng thái

Tài liệu theo công việc: [architecture](docs/architecture/index.md),
[frontend](docs/frontend/index.md), [backend](docs/backend/index.md),
[design system](docs/design/index.md), [baseline Espacio](docs/reference/espacio/index.md).
[Docs index](docs/index.md) dẫn tới nguồn chuẩn và evidence; mọi thay đổi liên
quan phải cập nhật docs trong cùng task hoặc ghi lý do không có docs impact.

Cây dưới mô tả ownership và lifecycle thực tế. Trạng thái Git thay đổi theo
commit; kiểm bằng `git status --short`, không gắn nhãn tracked vào bản đồ lâu dài.

```text
.
├─ src/
│  ├─ site/                         # LIVE: HTML/CSS/JS và media public
│  │  ├─ index.html                 # home VI/EN
│  │  ├─ residential/, commercial/, about/
│  │  ├─ advertising-products/      # catalog, metadata, layout, viewer, skeleton
│  │  ├─ assets/                    # brand, fonts, vendor, media web-ready
│  │  └─ content/                   # manifest logo khách hàng
│  ├─ worker/                       # DORMANT: route/SEO/API/CMS
│  ├─ admin/                        # DEV: CMS shell
│  └─ db/migrations/                # DEV: schema CMS
├─ scripts/
│  ├─ site/                         # build, brand sync, media preparation
│  ├─ media/                        # inventory/review ảnh
│  ├─ reference/                    # crawler research
│  └─ tooling/                      # local server, QA, Graphify, Git hooks
├─ tests/
│  ├─ site/, media/, worker/, tooling/ # QA trong GitHub; không deploy
│  └─ reports/                      # GENERATED: kết quả local
├─ docs/
│  ├─ STATE.md, index.md             # snapshot hiện tại và routing
│  ├─ architecture/, frontend/, backend/
│  ├─ design/, impeccable/          # authority/reuse; Impeccable compatibility
│  ├─ specs/, decisions/            # contract và quyết định
│  ├─ operations/                   # rule, tooling và recovery
│  ├─ reference/                    # measured research, không phải source public
│  ├─ verification/                 # evidence có ngày và scope
│  ├─ reports/                      # machine reports; CSV/bak bị ignore
│  └─ archive/                      # bản gốc lịch sử và mapping
├─ source-assets/
│  ├─ projects/                     # nguồn ảnh/review/provenance, không deploy
│  └─ site-backups/                 # backup bản live; ảnh/archive local, manifest lưu Git
├─ research/reference-site/         # RESEARCH: crawl và runtime evidence local
├─ tasks/                           # plan/checklist; không thay Notion status
├─ PRODUCT.md, DESIGN.md, CHANGELOG.md
├─ .impeccable/                     # design extensions và surface briefs
├─ .openai/hosting.json             # LEGACY: project Sites cũ, không còn dùng
├─ .github/, .vscode/               # CI/workflow và dev tasks
├─ .agents/, .claude/, .codex/, .serena/ # agent config; cache giữ local
├─ .site-output/                    # GENERATED: public build, không edit/commit
├─ .tmp/, _temp/, test-results/     # GENERATED: probe, staging, evidence local
├─ .tooling/, graphify-out/, .wrangler/, node_modules/ # CACHE
└─ package.json, pnpm-lock.yaml, pnpm-workspace.yaml,
   playwright.config.cjs, tooling-versions.json,
   wrangler.toml (CMS dormant), wrangler.static.toml (demo)
```

Quy tắc ownership:

1. Chỉ edit public source tại `src/site/`; `.site-output/` luôn được tạo lại.
2. Source, config, test và Markdown đã chấp nhận là project file cần Git quản
   lý; raw evidence, build output, research archive và cache nằm ngoài Git index.
   Archive Markdown của docs giữ trong Git để bảo toàn decision/evidence.
3. File untracked phải được review theo path trước khi stage; không xóa hoặc
   commit hàng loạt chỉ vì trạng thái `??`.
4. Trước khi edit copy hoặc media, đọc
   [`docs/design/content.md`](docs/design/content.md).

Inventory và deletion ledger có ngày nằm tại
[`docs/archive/reports/verification-2026-08-25-project-source-cleanup.md`](docs/archive/reports/verification-2026-08-25-project-source-cleanup.md).

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
[`docs/backend/roadmap.md`](docs/backend/roadmap.md).

## Agent instruction

- Shared rule: [`AGENTS.md`](AGENTS.md).
- Claude Code import cùng rule qua [`CLAUDE.md`](CLAUDE.md).
- Setup, MCP inventory, watcher, terminal command và recovery được ghi trong
  [`docs/operations/TOOLING.md`](docs/operations/TOOLING.md).
- Brief setup project mới có thể tái sử dụng và lesson nằm trong
  [`docs/archive/reports/verification-2026-08-09-agent-workspace-bootstrap.md`](docs/archive/reports/verification-2026-08-09-agent-workspace-bootstrap.md).

## Chú thích thuật ngữ

- **Static-first**: ưu tiên website tĩnh trước phần dynamic.
- **Canonical**: bản được xem là nguồn chuẩn.
- **Portable**: có thể tái lập trên machine khác từ pin và script của repository.
- **Deployment**: quá trình đưa output lên môi trường phục vụ.
- **Workers static assets**: Cloudflare phục vụ file tĩnh từ Worker, không cần code.
- **Fallback**: nhánh xử lý thay thế khi capability chính chưa có hoặc bị tắt.
- **Automation**: hook, watcher, wrapper hoặc launcher tự xử lý mechanics.
- **Dormant**: đã có trong source nhưng hiện chưa được activate.
