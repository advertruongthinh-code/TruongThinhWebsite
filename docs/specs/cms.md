---
title: CMS xuất bản ra trang tĩnh
status: planned
source:
  - src/worker/**
  - src/db/migrations/**
  - src/admin/**
  - scripts/cms/**
  - wrangler.toml
tests:
  - tests/worker/worker-contract.cjs
  - tests/worker/worker-static-contract.cjs
  - tests/worker/advertising-detail-route.test.mjs
notion: https://app.notion.com/p/3e8332849a0e816eb46ece5834b67178
updated: 2026-11-22
---

# CMS xuất bản ra trang tĩnh

## Mục đích

Owner và nhân viên tự đăng, sửa mọi nội dung VI/EN của site (card Advertising, công trình, News, chữ và ảnh trang cố
định) qua trang admin. Khách chỉ nhận file tĩnh; CMS ghi nội dung rồi dựng lại site. Kiến trúc CMS
xuất bản tĩnh owner duyệt 2026-11-15, ADR trên Notion. Spec này là contract của
slice Contract phần nền tảng: ranh giới, quyền, trạng thái, lệnh admin, xuất bản, xem trước; kiểu nội dung, media,
layout, menu, soạn chữ ở [nội dung CMS](cms-content.md). Chưa có code theo spec này; code dormant
hiện có và phần giữ, bỏ nằm ở [Code dormant](#code-dormant-hiện-có). Build và demo thuộc [phát hành tĩnh](static-release.md).
Bản tĩnh chạy trên demo; phát hành chính thức trên `truongthinhads.vn` cần xong phase này (owner 2026-10-18). AI agent của CMS dùng [Stack AI và media](../operations/TOOLING.md#stack-ai-và-media) (owner 2026-10-18).

Quyết định owner trước đây vẫn giữ, chi tiết ở [nội dung CMS](cms-content.md):

- Media gốc (owner 2026-10-03): giữ gốc ở storage private, public chỉ dùng biến thể cùng chuẩn site tĩnh
  ([tải ảnh R1](media-delivery.md#r1-biến-thể-ảnh-nội-dung)); media cần alt ([nội dung CMS R3](cms-content.md#r3-media)).
- SEO media ([media-seo](media-seo.md), owner 2026-10-18): nhân viên chỉ nhập tên, mô tả card và alt VI/EN từng media;
  hệ thống tự sinh trang card, canonical, og:image, JSON-LD, image sitemap và tên file upload theo tên sản phẩm.

## Hành vi

### R1. Ranh giới public và admin

Route trang public (`/`, `/vi/*`, `/en/*`, ảnh, sitemap) là Workers static assets, không chạy Worker, không đọc D1. Worker
public duy nhất là tìm kiếm ở `/api/*` ([tìm kiếm Advertising](advertising-search.md)); nó không đọc D1 của CMS.
Admin là một Worker riêng ở `admin.truongthinhads.vn` (trước khi đổi domain: một hostname `workers.dev` riêng), sau một
ứng dụng Access team `truongthinh` đăng nhập Google. Media public ở `media.truongthinhads.vn` (R2 custom domain). CMS
hỏng, D1 hết hạn mức hay admin tắt thì site vẫn chạy bản dựng cuối.

### R2. Tài khoản và vai trò

Hai vai trò, không có vai trò admin riêng: admin là owner (owner 2026-11-22). Lưu trong D1 (bảng tài khoản theo email, chữ thường). Email owner đầu tiên nằm ở secret
`CMS_BOOTSTRAP_OWNER`, không ghi trong repo; lần chạy đầu tạo tài khoản owner từ secret nếu bảng trống.

| Việc | Owner | Nhân viên |
| --- | --- | --- |
| Tạo, sửa, lưu (lưu là lên web) | Có | Có |
| Upload media, sửa alt, tag | Có | Có |
| Xóa vào thùng rác | Có | Có |
| Khôi phục từ thùng rác | Có | Có |
| Xóa hẳn: dọn thùng rác, hoặc xóa thẳng không qua thùng rác | Có | Không |
| Trang tài khoản: thêm, khóa, đổi vai trò owner hoặc nhân viên | Có | Không |
| Quay site về bản dựng trước | Có | Không |
| Xem nhật ký thao tác | Có | Chỉ thao tác của mình |

Worker cho qua khi JWT Access hợp lệ và email có tài khoản đang mở trong D1; thiếu một trong hai thì 403. Riêng
`GET /api/admin/snapshot` nằm sau chính sách Service Auth riêng: chỉ nhận service token của workflow dựng, chỉ đọc,
không qua bảng tài khoản. Ít nhất một
owner luôn còn mở: lệnh khóa hay hạ vai trò owner cuối cùng trả 409. Danh sách email của chính sách Access phải khớp bảng
tài khoản, vì Access tính seat ở lần đăng nhập đầu và chặn người mới khi hết seat. Trang tài khoản tự thêm, gỡ email
trong chính sách Access qua API Cloudflare (owner 2026-11-15): token chỉ có quyền Access, nằm ở secret, Worker chỉ sửa
đúng chính sách của app admin (id trong secret). Gọi API Access trước, thành công mới ghi D1; API lỗi thì trả 502, không
đổi gì; nhật ký ghi cả hai bước.

```gherkin
Given nhân viên đã đăng nhập
When gọi lệnh thêm tài khoản
Then trả 403, không dòng nào đổi, nhật ký ghi lần bị từ chối
```

### R3. Trạng thái và thùng rác

| Trạng thái | Trên site | Ai đặt |
| --- | --- | --- |
| `draft` | Không | Tạo mới chưa đủ trường bắt buộc |
| `published` | Có, từ lần dựng sau | Lưu khi đủ trường bắt buộc (owner 2026-11-15: lưu là lên web, không bước duyệt) |
| `trashed` | Không | Lệnh xóa của owner hoặc nhân viên; owner chọn xóa thẳng thì bản ghi mất luôn (owner 2026-11-15) |

Lưu nháp tự động chỉ ghi vào bản đang sửa riêng của người soạn, không đổi bản đang lên web và không tạo phiên bản; chỉ
lệnh `save` tạo phiên bản. Thùng rác giữ bản ghi và mọi phiên bản 30 ngày, khôi phục về đúng trạng thái trước khi xóa; quá 30 ngày hoặc owner xóa
hẳn thì mất. Xóa hẳn cần gõ lại tên bản ghi để xác nhận; nhật ký giữ phiên bản cuối 1 năm; bản gốc media
của bản ghi chờ hết 30 ngày orphan (R3 nội dung CMS) rồi mới dọn. URL của bài trong thùng rác rơi về trang 404 tĩnh: chọn vậy để route trang không cần Worker (thay mục 14 ý định
2026-10-12 về 410). Xóa nội dung đang được nội dung khác trỏ tới (menu, `home-projects`, `news-cards`) thì lần dựng
bỏ tham chiếu đó và admin báo chỗ bị ảnh hưởng.

```gherkin
Given nhân viên xóa một công trình đang có trong menu
When lần dựng xong
Then trang công trình không còn, menu không còn mục đó, owner khôi phục được trong 30 ngày
```

### R4. Phiên bản, xung đột và nhật ký

Mỗi lần lưu tạo một phiên bản mới có số `version` tăng dần; lệnh lưu gửi kèm `version` đang sửa. Lệch thì trả 409 kèm
bản đang có, admin cho chọn giữ bản nào, không ghi đè im lặng. Mỗi lệnh ghi (thành công hay bị từ chối) thêm một dòng
nhật ký: email, lệnh, kiểu, id, thời điểm, kết quả; giữ 1 năm.

```gherkin
Given owner và nhân viên cùng mở bài ở version 4
When owner lưu (version 5) rồi nhân viên lưu với version 4
Then nhân viên nhận 409 kèm bản version 5, bài vẫn là bản của owner
```

### R5. Lệnh admin có kiểu

API admin chỉ có các lệnh ghi dưới và các lệnh đọc `list`, `get`, `media-list`, `audit-log`, `build-status`, `snapshot`; mỗi lệnh validate bằng module dùng chung ở
[nội dung CMS R1](cms-content.md#r1-kiểu-nội-dung-và-file-chiếu), kiểm quyền theo R2, ghi nhật ký theo R4.

| Lệnh | Kết quả | Lỗi |
| --- | --- | --- |
| `create` | Bản ghi `draft` | 400 dữ liệu sai, 409 id hoặc slug trùng |
| `save` | Phiên bản mới; đủ trường (kể cả số media tối thiểu) thì `published` và xếp lần dựng, chưa đủ thì giữ `draft` | 400 khi bản ghi đã `published` mà bản lưu chưa đủ, 409 version lệch |
| `trash`, `restore` | Đổi trạng thái R3 | 404, 409 khi slug đã bị bài khác dùng lúc khôi phục |
| `purge` | Xóa hẳn từ thùng rác hoặc thẳng (chỉ owner) | 403, 404 |
| `upload-media`, `update-media` | Bản ghi media theo [nội dung CMS R3](cms-content.md#r3-media) | 400 loại hoặc cỡ sai, 413 quá cỡ |
| `account-add`, `account-update` | Theo R2 (chỉ owner) | 403, 409 owner cuối |
| `rollback` | Quay site về deployment trước (chỉ owner) | 403 |

Request ghi chỉ nhận `application/json` (upload là `multipart/form-data`, 415 nếu khác); mọi request không phải GET
thiếu `Origin` hay `Origin` khác origin admin trả 403; GET không bao giờ đổi dữ liệu. Không dùng CSRF token riêng (suy
luận: Access chặn request không có JWT, `Origin` chặn form từ site khác, kể cả multipart không preflight). Email chỉ lấy
từ JWT đã kiểm chữ ký, `aud`, `iss`, `exp`; không đọc header `Cf-Access-Authenticated-User-Email`. Lỗi D1 hay R2 trả 503 cho admin, không chạm site public.
Rate limit dùng binding `[[ratelimits]]` của Workers như Worker tìm kiếm (`wrangler.static.toml`), quá hạn mức trả 429.

```gherkin
Given admin đã xác thực
When POST lệnh save với Origin của site khác
Then trả 403, không phiên bản nào được tạo
When POST lệnh save đúng Origin nhưng Content-Type text/plain
Then trả 415, không phiên bản nào được tạo
```

### R6. Xuất bản và rollback

Lần lưu `published` gọi thẳng `workflow_dispatch` của `ci.yml` trên `main` (`ci.yml` gọi `Deploy demo`, workflow này chỉ có
`workflow_call`). Không có hàng đợi riêng: nhóm `concurrency` của `Deploy demo` giữ một run đang chạy và một run chờ, run
chờ mới thay run chờ cũ, và mỗi run lấy bản chụp lúc bắt đầu, nên lưu dồn dập gom lại mà không mất lần lưu nào. Token
GitHub fine-grained chỉ quyền Actions trên repo này, nằm ở secret. Workflow lấy bản chụp qua `GET /api/admin/snapshot`
bằng service token, chạy validator dùng chung và bộ kiểm phát hành hiện có, rồi deploy. Mục tiêu: lên site trong 10
phút sau lần lưu cuối (suy luận theo thời gian `Deploy demo` hiện tại, đo ở slice Publishing). Từ khi CMS mở, mọi lần dựng kể cả merge code vào
`main` đều lấy bản chụp mới nhất; file chiếu trong repo chỉ là bản seed và fixture, nên merge code không ghi đè nội dung
CMS; endpoint bản chụp không trả lời thì lần dựng lỗi, không dùng file trong repo. Lỗi bước nào thì không deploy, site giữ bản cũ, admin hiện lý do bằng lời thường và nút "dựng lại"; lần lưu kế tiếp
cũng dựng lại. Admin đọc trạng thái run qua API GitHub bằng cùng token: chờ, đang dựng, đã lên, lỗi.

D1 giữ nội dung thay vì commit file chiếu vào repo vì nhân viên lưu là lên web, không qua Git và PR; bot commit thẳng
`main` sẽ bỏ qua CI review và đụng PR đang sửa cùng file. File chiếu trong repo vẫn là fixture của test; slice Public
projection thêm lệnh kéo bản chụp về repo để fixture không trôi xa nội dung thật.

Owner quay về deployment trước bằng lệnh `rollback` (nút trong admin vì owner không chạy lệnh shell; lệnh
`pnpm demo:wrangler rollback` ở [phát hành tĩnh R11](static-release.md) là đường dự phòng): admin Worker gọi workflow rollback trong GitHub Actions bằng cùng
token, workflow dùng token deploy Cloudflare sẵn có của `Deploy demo`; admin Worker không giữ token deploy. D1 không đổi theo, nên rollback dừng tự đăng tới khi owner bấm
"tiếp tục đăng" (lưu vẫn ghi D1, không dựng). Key biến thể media public không đổi theo nội dung (có hash) và được giữ
khi còn deployment nào trong 10 bản gần nhất trỏ tới (suy luận về số bản Workers giữ, kiểm ở slice Publishing).
Phiên bản R4 dùng cho xung đột và nhật ký; lệnh khôi phục phiên bản cũ và hẹn giờ đăng để sau bản đầu (owner
2026-11-15).

```gherkin
Given lần dựng có một ảnh thiếu biến thể
When bộ kiểm phát hành chạy
Then không deploy, site giữ bản trước, admin báo id media lỗi
```

Sao lưu: D1 Time Travel 7 ngày; export D1 hằng ngày ra R2 private; mỗi tuần chép export và bản gốc media về PC owner rồi NAS.
Khôi phục làm thử một lần trước khi mở CMS cho nhân viên.

### R7. Xem trước gần 1:1 với site

Khung xem trước cập nhật ngay khi người soạn gõ hay đổi media, và giống trang thật (owner 2026-11-15). Không có renderer
thứ hai, theo từng loại trang: trang khối (News, công trình) gọi đúng hàm render mà build dùng (`renderBlocks`,
`renderBlockPage`) trong trình duyệt; trang chuẩn và lưới card dùng HTML đã dựng cộng overlay của
[editor](cms-editor.md), áp cùng hàm điền slot và hàm dựng card mà build gọi (plan tách hai hàm này thành module thuần).
Preview lưới card xếp như PC và tablet (máy tự xếp); lưới đầu dựng sẵn của phone chỉ có ở lần dựng thật. Mọi preview
chạy với cùng CSS, JS, motion và biến thể ảnh của site, trong một `iframe` có khung trang thật. Nháp tự lưu nằm trong `localStorage` như editor R8. Phần render tách khỏi phần đọc file: module render
thuần (không `node:fs`, `node:path`) chạy được cả ở Node lẫn trình duyệt; phần kiểm file ảnh, đọc JSON ở lại adapter
của build. Sửa một khối là sửa một chỗ, build và preview đổi cùng lúc. Chỗ khác duy nhất: media chưa có biến thể dùng
bản tạm trên R2 private qua admin, khung preview ghi "bản xem trước". Giao diện trực quan (owner 2026-11-15): soạn ngay
trên preview, bấm chữ để sửa, bấm khung ảnh để kéo, phóng; layout khóa hiện hình thu nhỏ kèm số ảnh còn thiếu; đổi bề
rộng preview theo sáu mốc 384 tới 1920.

```gherkin
Given người soạn sửa tiêu đề một khối section-title
When gõ xong một ký tự
Then preview hiện HTML bằng đúng hàm renderBlocks mà build dùng, không gọi lần dựng
And test so HTML preview và HTML build của cùng dữ liệu trả kết quả giống nhau
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Data | `src/site/content/*.json` | File chiếu ([nội dung CMS](cms-content.md)); build tĩnh đọc như hiện tại |
| Binding | `DB` (D1, `apac`), `MEDIA_ORIGINALS`, `MEDIA_PUBLIC` (R2) | Chỉ ở admin Worker; khai ở slice Storage |
| Secret | `CMS_BOOTSTRAP_OWNER`, `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, token Access API, id chính sách Access, service token, token GitHub Actions | R2, R6; không ghi trong repo |
| Header | `Cf-Access-Jwt-Assertion`, `Origin` | Đầu vào R2, R5 |
| Endpoint | `/api/admin/<lệnh>` | R5; không có API public |

## UI

Admin là [editor](cms-editor.md), không thuộc Design System, không đưa token admin vào route public
([Design System](../../design-system/README.md#dont)). Trang public giữ UI của spec từng trang.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1 | chưa có; cần: bản dựng không có route Worker public, trang mở được khi admin tắt |
| R2, R5 | `pnpm qa:worker:security` kiểm JWT, Origin hôm nay; cần thêm: ma trận quyền, owner cuối, xóa thẳng chỉ owner |
| R7 | cần: HTML preview bằng HTML build trên fixture mọi khối |
| R3, R4, R6 | chưa có; cần integration lưu, thùng rác, version lệch, dựng lỗi giữ bản cũ |
| R6 sao lưu | diễn tập khôi phục, ghi kết quả trong PR slice Storage |

## Code dormant hiện có

Code trên `main` theo decision cũ (SSR từ D1), chưa chạy trên demo. Slice Storage và Publishing xử lý theo bảng:

| Phần | Vị trí | Xử lý |
| --- | --- | --- |
| Kiểm JWT Access, `Origin`, đăng nhập dev loopback | `requireAdmin`, `verifyAccessJwt` trong `src/worker/index.js` | Giữ; đổi allowlist `ADMIN_EMAILS` sang bảng tài khoản R2 |
| Kiểm upload WebP, SVG an toàn | `isWebp`, `isSafeSvg` | Giữ, mở rộng theo [nội dung CMS R3](cms-content.md#r3-media) |
| Editor Dockview, overlay | `src/admin/` | Giữ; đổi đường lưu sang lệnh R5 ([editor](cms-editor.md)) |
| Render public SSR, `page_edits`, API public, sitemap từ D1, route `/media/*` | `src/worker/index.js`, `content.mjs` | Bỏ (R1) |
| CRUD chung sáu resource, `audit_log` | `src/worker/index.js` | Viết lại theo R4, R5 |
| Migration `0001` tới `0005`, seed 36 product | `src/db/migrations/` | Bỏ; viết `0001` mới theo spec này |
| `wrangler.toml` (`run_worker_first` route public), `scripts/cms/` | gốc repo | Viết lại cho admin Worker |

## Gate còn mở

Không activate Worker, nối Wrangler cho CMS, deploy, tạo hay đọc secret, nối domain khi owner chưa duyệt slice tương ứng. Gate 1 tới 4 đã đóng ngày 2026-11-15; owner mở slice Contract cùng ngày.

Hai gate thêm trước CMS (owner 2026-11-15): làm lại layout trang chuẩn theo Espacio
(xong, PR #978) và motion hero Espacio (xong, PR #966); chi tiết ở [nội dung CMS](cms-content.md#gate-còn-mở).

Mục `[CẦN LÀM RÕ]` còn lại có slice chủ: cỡ upload, thang video ở Storage; khóa slot `page-copy` ở editor.
Plan chi tiết phải có: bảng D1, định dạng bản chụp, redirect 301 khi đổi slug qua `scripts/site/redirects.mjs`, tắt preview URL của hostname
`workers.dev`, chuỗi khối cố định từng dòng layout ([nội dung CMS R5](cms-content.md#r5-layout-khóa-theo-số-media)).

Thứ tự slice, mỗi slice owner duyệt gate: Contract (spec này; gate: owner duyệt spec),
Storage (migration `0001` mới, bucket, export; gate: migration có snapshot, khôi phục thử, đường lùi), Publishing
(lệnh R5, dựng R6; gate: test contract, security, integration), Public projection (file chiếu; gate: bản dựng từ
bản chụp giống bản dựng từ repo, diễn tập rollback). Editor nối API theo [cms-editor](cms-editor.md) sau Publishing.

## Chú thích thuật ngữ

- **Access**: lớp đăng nhập Cloudflare đặt trước admin, cấp JWT (token có chữ ký).
- **File chiếu**: file JSON CMS sinh ra cho build tĩnh đọc.
- **Bản chụp**: bộ file chiếu tại một thời điểm, đầu vào của một lần dựng.
