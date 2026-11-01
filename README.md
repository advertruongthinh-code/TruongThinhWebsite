# Website Trường Thịnh

Website tĩnh VI/EN theo hướng static-first cho Trường Thịnh Interior và
Advertising. Root của repository là site canonical. Mục tiêu trước mắt là bản tĩnh
đáng tin cậy trên demo; phát hành chính thức trên `truongthinhads.vn` chờ xong CMS,
private admin, D1 và R2 (phase 2).

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
about); route table ở [architecture](docs/architecture.md). Static page
không cần D1, R2, Access hoặc CMS secret. Dynamic route, admin và publishing
thuộc CMS phase. Phát hành chính thức chỉ khi xong CMS, tức admin và nhân viên CRUD được nội dung
(owner 2026-10-18); bản tĩnh luôn là fallback và rollback.

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
Demo tĩnh chạy trên Cloudflare Workers static assets: workflow `Deploy demo`
tự chạy `pnpm deploy:demo` khi CI xanh trên `main` theo
[quyết định demo](docs/decisions/cloudflare-workers-static-demo.md) và
[các bước phát hành](docs/specs/static-release.md#r11-phát-hành-demo-cloudflare).
CMS chưa activate. Trạng thái phát hành thực tế xem [STATE](docs/STATE.md); lịch sử thay đổi
đọc trong PR và `git log`.
Wrangler cho CMS Worker chỉ được cài và activate
khi owner mở CMS phase theo
[`Khóa Wrangler đến phase CMS`](docs/decisions/wrangler-deferred-until-cms.md).

## Cây thư mục và trạng thái

Tài liệu theo công việc: [architecture](docs/architecture.md),
[spec từng phần](docs/specs/docs-system.md#r2-capability-map-và-spec-sống), [CMS](docs/specs/cms.md),
[Design System](design-system/README.md) (kèm [nguồn tham khảo](design-system/README.md#nguồn-tham-khảo)).
[Docs index](docs/index.md) dẫn tới nguồn chuẩn theo việc cần làm.

Cây dưới mô tả ownership và lifecycle thực tế. Trạng thái Git thay đổi theo
commit; kiểm bằng `git status --short`, không gắn nhãn tracked vào bản đồ lâu dài.

```text
.
├─ src/site/                        # LIVE: HTML/CSS/JS, media public, catalog
├─ src/worker/                      # DORMANT: route/SEO/API/CMS
├─ src/admin/, src/db/migrations/   # DEV: CMS shell và schema
├─ scripts/                         # site build, media, tooling
├─ tests/                           # QA trong GitHub; tests/reports/ GENERATED
├─ docs/                            # STATE, index, goal, architecture.md, terminology,
│                                   # specs, decisions, operations, reference
├─ source-assets/                   # LOCAL: nguồn ảnh/provenance, backup live, ngoài Git
├─ research/reference-site/         # RESEARCH: archive cũ local, ngoài Git
├─ tasks/                           # plan/checklist đang làm (tạo khi cần), xóa khi xong
├─ design-system/                   # Design System: tokens.json, README; publish lên claude.ai
├─ PRODUCT.md, DESIGN.md, .impeccable/ # DESIGN.md, design.json GENERATED từ design-system/
├─ .github/, .vscode/               # CI/workflow và dev tasks
├─ .claude/                        # agent config; cache giữ local
├─ .site-output/, .tmp/, _temp/, test-results/ # GENERATED, không edit/commit
├─ .tooling/, graphify-out/, .wrangler/, node_modules/ # CACHE
└─ package.json, pnpm-lock.yaml, playwright.config.cjs, tooling-versions.json,
   wrangler.toml (CMS dormant), wrangler.static.toml (demo)
```

Source, config, test và Markdown đã chấp nhận cần Git quản lý; raw evidence,
build output, research archive và cache nằm ngoài Git index. Rule edit,
untracked và commit ở [`AGENTS.md`](AGENTS.md#routing-theo-path).

## CMS phase

CMS tương lai có thể activate Worker dormant, selected structured-data storage,
selected media object storage và Access-protected admin shell. Nó không được
block hoặc destabilize static release. Xem
[`docs/specs/cms.md`](docs/specs/cms.md).

### Chạy CMS local

CMS chưa bật trên web; chạy thử trên máy, không cần tài khoản Cloudflare, không tạo tài nguyên thật.

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm cms:dev
```

1. `pnpm cms:dev` build site, dựng admin, tạo D1 local trong `.wrangler/` (áp migration 0001 đến 0005), rồi chạy
   Worker local. Lần đầu mất vài phút.
2. Chờ dòng `Ready on http://127.0.0.1:8788`, mở `http://127.0.0.1:8788/admin/` bằng trình duyệt máy tính (cửa sổ rộng
   từ 1024px). Không có màn đăng nhập: bản local tự vào bằng `admin@localhost`, chỉ trên `127.0.0.1`.
3. Chọn trang ở cây bên trái, bấm vào chữ hoặc ảnh trên bản xem trước để sửa, bấm Lưu. Mở
   `http://127.0.0.1:8788/vi/` (hoặc trang vừa sửa) để thấy nội dung đã lưu.
4. Dừng bằng `Ctrl+C`. Nội dung đã lưu còn trong `.wrangler/` cho lần chạy sau; xóa thư mục đó là về bản gốc.

Đổi cổng: `$env:CMS_PORT=8790; pnpm cms:dev` (PowerShell). Chỉ dựng D1 local, không chạy server:
`node scripts/cms/dev-local.mjs --setup-only`. Cách dùng editor: [`docs/specs/cms-editor.md`](docs/specs/cms-editor.md);
các bước bật trên Cloudflare thật làm sau.

## Agent instruction

- Rule chung cho Claude Code và Codex: [`AGENTS.md`](AGENTS.md). Repo không có `CLAUDE.md`; Claude Code từ v2.1.277 tự đọc `AGENTS.md`.
- Setup, MCP, watcher và recovery: [`docs/operations/TOOLING.md`](docs/operations/TOOLING.md).

## Chú thích thuật ngữ

- **Static-first**: ưu tiên website tĩnh trước phần dynamic.
- **Canonical**: bản được xem là nguồn chuẩn.
- **Deployment**: quá trình đưa output lên môi trường phục vụ.
- **Workers static assets**: Cloudflare phục vụ file tĩnh từ Worker, không cần code.
- **Dormant**: đã có trong source nhưng hiện chưa được activate.
- **D1 local**: bản giả lập cơ sở dữ liệu Cloudflare D1 trên máy, lưu trong `.wrangler/`.
- **Worker local**: Worker chạy trên máy bằng `wrangler dev`, giống Worker trên Cloudflare.
