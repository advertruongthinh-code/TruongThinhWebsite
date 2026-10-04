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

Machine mới hoặc repair agent stack (Claude Code hoặc Codex): xem
[`docs/operations/TOOLING.md`](docs/operations/TOOLING.md).

Mở `http://127.0.0.1:8787/vi/`. Một bước copy nhỏ có allowlist tạo static output
directory bị Git ignore là `.site-output/`. HTML, CSS, JavaScript và media được
serve bằng static Node server của repository; current local preview không khởi
động Cloudflare Worker.

## Phạm vi hiện tại

Năm route VI/EN tĩnh (home, residential, commercial, advertising-products,
about); route table ở [architecture](docs/architecture/index.md). Static page
không cần D1, R2, Access hoặc CMS secret. Dynamic route, admin và publishing
thuộc CMS phase.

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
Worker contract dormant đến CMS phase. Browser matrix và evidence contract ở
[`tests/README.md`](tests/README.md).

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

## Cây thư mục và trạng thái

Tài liệu theo công việc: [architecture](docs/architecture/index.md),
[frontend](docs/frontend/index.md), [backend](docs/backend/index.md),
[design system](docs/design/index.md), [baseline Espacio](design-system/reference-espacio.md).
[Docs index](docs/index.md) dẫn tới nguồn chuẩn và evidence.

Cây dưới mô tả ownership và lifecycle thực tế. Trạng thái Git thay đổi theo
commit; kiểm bằng `git status --short`, không gắn nhãn tracked vào bản đồ lâu dài.

```text
.
├─ src/site/                        # LIVE: HTML/CSS/JS, media public, catalog
├─ src/worker/                      # DORMANT: route/SEO/API/CMS
├─ src/admin/, src/db/migrations/   # DEV: CMS shell và schema
├─ scripts/                         # site build, media, reference crawler, tooling
├─ tests/                           # QA trong GitHub; tests/reports/ GENERATED
├─ docs/                            # STATE, index, architecture, frontend, backend,
│                                   # design, specs, decisions, operations,
│                                   # reference, verification, reports, archive
├─ source-assets/                   # nguồn ảnh/provenance, backup live; không deploy
├─ research/reference-site/         # RESEARCH: crawl và runtime evidence local
├─ tasks/                           # plan/checklist đang mở, archive/ giữ phần đã xong; không thay Notion status
├─ design-system/                   # Design System: tokens.json, README; publish lên claude.ai
├─ PRODUCT.md, DESIGN.md, CHANGELOG.md, .impeccable/
├─ .openai/hosting.json             # LEGACY: project Sites cũ, không còn dùng
├─ .github/, .vscode/               # CI/workflow và dev tasks
├─ .agents/, .claude/, .codex/, .serena/ # agent config; cache giữ local
├─ .site-output/, .tmp/, _temp/, test-results/ # GENERATED, không edit/commit
├─ .tooling/, graphify-out/, .wrangler/, node_modules/ # CACHE
└─ package.json, pnpm-lock.yaml, playwright.config.cjs, tooling-versions.json,
   wrangler.toml (CMS dormant), wrangler.static.toml (demo)
```

Source, config, test và Markdown đã chấp nhận cần Git quản lý; raw evidence,
build output, research archive và cache nằm ngoài Git index. Rule edit,
untracked và commit ở [`AGENTS.md`](AGENTS.md#routing-theo-path).

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
[`docs/backend/index.md`](docs/backend/index.md).

## Agent instruction

- Shared rule: [`AGENTS.md`](AGENTS.md).
- Claude Code import cùng rule qua [`CLAUDE.md`](CLAUDE.md).
- Setup, MCP, watcher và recovery: [`docs/operations/TOOLING.md`](docs/operations/TOOLING.md).

## Chú thích thuật ngữ

- **Static-first**: ưu tiên website tĩnh trước phần dynamic.
- **Canonical**: bản được xem là nguồn chuẩn.
- **Deployment**: quá trình đưa output lên môi trường phục vụ.
- **Workers static assets**: Cloudflare phục vụ file tĩnh từ Worker, không cần code.
- **Dormant**: đã có trong source nhưng hiện chưa được activate.
