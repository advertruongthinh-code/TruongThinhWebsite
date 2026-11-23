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
  - tests/worker/auth.test.mjs
  - tests/worker/snapshot.test.mjs
  - tests/worker/bundle.test.mjs
notion: https://app.notion.com/p/3e8332849a0e816eb46ece5834b67178
updated: 2026-11-22
---

# CMS xuất bản ra trang tĩnh

## Mục đích

Owner và nhân viên tự đăng, sửa mọi nội dung VI/EN của site (card Advertising, công trình, News, chữ và ảnh trang
chuẩn) qua trang admin; khách chỉ nhận file tĩnh, CMS ghi nội dung rồi dựng lại site. Spec này là phần nền tảng: ranh
giới, quyền, trạng thái, lệnh admin, xuất bản, xem trước; kiểu nội dung, media, layout, menu, soạn chữ ở
[nội dung CMS](cms-content.md). Chưa có code mới; code cũ tái dùng được ở [Code dormant](#code-dormant-hiện-có).

## Bối cảnh và phương án

Bản tĩnh chạy trên demo; phát hành chính thức trên `truongthinhads.vn` cần xong phase này (owner 2026-10-18). CMS chạy hoàn toàn bằng code cố định: không lệnh admin, Cron hay workflow nào của CMS gọi AI hay AI agent, cùng dữ liệu vào thì cùng kết quả (owner 2026-11-22, thay câu "AI agent của CMS" ngày 2026-10-18). Chỗ duy nhất trên đường dựng có gọi model là `pnpm search:index` tính vector tìm kiếm ([nội dung CMS R9](cms-content.md#r9-tìm-kiếm-ngữ-nghĩa)); lỗi ở đó không chặn deploy.
Kiến trúc xuất bản tĩnh owner duyệt 2026-11-15 ([ADR trên Notion](https://app.notion.com/p/3e8332849a0e816eb46ece5834b67178)).
Quyết định owner trước đây vẫn giữ:

- Media gốc (owner 2026-10-03): giữ gốc ở storage private, public chỉ dùng biến thể cùng chuẩn site tĩnh
  ([tải ảnh R1](media-delivery.md#r1-biến-thể-ảnh-nội-dung)); media cần alt ([nội dung CMS R3](cms-content.md#r3-media)).
- SEO media ([media-seo](media-seo.md), owner 2026-10-18): nhân viên chỉ nhập tên, mô tả card và alt VI/EN từng media;
  hệ thống tự sinh trang card, canonical, og:image, JSON-LD, image sitemap và tên file upload theo tên sản phẩm.

| Chọn | Thay cho | Lý do |
| --- | --- | --- |
| Dựng tĩnh từ bản chụp | SSR từ D1 (code dormant) | CMS hỏng thì site vẫn chạy; route trang không cần Worker |
| D1 giữ nội dung | Commit file chiếu vào repo | Lưu là lên web, không qua Git và PR; bot commit thẳng `main` bỏ qua CI review, đụng PR đang sửa cùng file |
| GitHub Actions dựng, sinh biến thể | Cloudflare Queues, Workflows, Images | Build và bộ kiểm phát hành đã chạy ở Actions; sharp không chạy trong Worker |
| Access đăng nhập Google | Tự làm đăng nhập | Không giữ mật khẩu; Access chặn trước Worker |
| 404 tĩnh cho bài trong thùng rác | 410 (quyết định cũ) | Route trang không cần Worker |

Ngoài phạm vi bản đầu: khôi phục phiên bản cũ, hẹn giờ đăng (owner 2026-11-15), tìm kiếm bản ghi `draft` trong CMS, hỗ trợ nhập bằng AI, sửa bảng đồng nghĩa
trong CMS, page builder đa dụng. Rủi ro chính và chỗ xử lý: GitHub hay token hỏng (R6), Access lệch D1 (R2), mất nội
dung (R3, sao lưu R6), bản chụp lỗi chặn deploy (R6), test CI không liên quan
chậm hay chập chờn làm chậm lần lưu (R6).

## Hành vi

### R1. Ranh giới public và admin

Route trang public (trang tiếng Việt ở gốc `/`, `/en/*`, ảnh, sitemap; `/vi/*` cũ trả 301) là Workers static assets, không chạy Worker, không đọc D1. Worker
public duy nhất là tìm kiếm ở `/api/*` ([tìm kiếm Advertising](advertising-search.md)); nó không đọc D1 của CMS.
Admin là một Worker riêng ở `admin.truongthinhads.vn`, sau một
ứng dụng Access team `truongthinh` đăng nhập Google. Media public ở `media.truongthinhads.vn` (R2 custom domain). CMS
hỏng, D1 hết hạn mức hay admin tắt thì site vẫn chạy bản dựng cuối.

```gherkin
Given admin Worker đang tắt
When khách mở / và một trang công trình
Then trang trả 200 từ static assets, không request nào tới D1
```

### R2. Tài khoản và vai trò

Hai vai trò, không có vai trò admin riêng: admin là owner (owner 2026-11-22). Lưu trong D1 (bảng tài khoản theo email, chữ thường). Email owner đầu tiên nằm ở secret
`CMS_BOOTSTRAP_OWNER`, không ghi trong repo; lần chạy đầu tạo tài khoản owner từ secret nếu bảng trống; email này được thêm vào chính sách Access một lần lúc dựng
admin ở slice Storage.

| Việc | Owner | Nhân viên |
| --- | --- | --- |
| Tạo, sửa, lưu (lưu là lên web) | Có | Có |
| Upload media, sửa alt, tag | Có | Có |
| Xóa vào thùng rác | Có | Có |
| Khôi phục từ thùng rác | Có | Có |
| Xóa hẳn: dọn thùng rác, hoặc xóa thẳng không qua thùng rác | Có | Không |
| Trang tài khoản: thêm, khóa, đổi vai trò owner hoặc nhân viên | Có | Không |
| Phát hành bản staging lên site chính (owner 2026-11-22) | Có | Có |
| Quay staging hoặc site chính về bản trước | Có | Không |
| Xem nhật ký thao tác | Có | Chỉ thao tác của mình |

Worker cho qua khi JWT Access hợp lệ và email có tài khoản đang mở trong D1; thiếu một trong hai thì 403. Riêng
`GET /api/admin/snapshot` và `GET /api/admin/media-original` nằm sau chính sách Service Auth riêng: chỉ nhận service
token của workflow, chỉ đọc, không qua bảng tài khoản. Ít nhất một
owner luôn còn mở: lệnh khóa hay hạ vai trò owner cuối cùng trả 409. Danh sách email của chính sách Access phải khớp bảng
tài khoản, vì Access tính seat ở lần đăng nhập đầu và chặn người mới khi hết seat (suy luận theo tài liệu Access, kiểm
ở slice Storage). Trang tài khoản tự thêm, gỡ email
trong chính sách Access qua API Cloudflare (owner 2026-11-15): token chỉ có quyền Access, nằm ở secret, Worker chỉ sửa
đúng chính sách của app admin (id trong secret). Thêm hoặc mở lại: gọi API Access trước, thành công mới ghi D1; API lỗi
thì trả 502, không đổi gì. Khóa: ghi D1 trước để Worker từ chối ngay, rồi gỡ khỏi Access; API lỗi thì báo lệch. Nhật ký ghi cả lần lỗi. Cron Trigger hằng ngày của admin Worker so chính sách Access với bảng
tài khoản, lệch thì admin báo owner, không tự sửa.

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

Chỉ lệnh `save` tạo phiên bản; nháp tự lưu theo R7. Thùng rác giữ bản ghi và mọi phiên bản 30 ngày, khôi phục về đúng trạng thái trước khi xóa; quá 30 ngày hoặc owner xóa
hẳn thì mất. Xóa hẳn cần gõ lại tên bản ghi để xác nhận; nhật ký giữ phiên bản cuối 1 năm; bản gốc media
của bản ghi chờ hết 30 ngày orphan ([nội dung CMS R3](cms-content.md#r3-media)) rồi mới dọn. URL của bài trong thùng rác rơi về trang 404 tĩnh: xem bảng phương án. Cron Trigger
hằng ngày của admin Worker dọn thùng rác quá 30 ngày, orphan, nhật ký quá 1 năm và chạy export D1 (R6). Xóa nội dung đang được nội dung khác trỏ tới (menu, `home-projects`) thì lần dựng
bỏ tham chiếu đó và admin báo chỗ bị ảnh hưởng.

```gherkin
Given nhân viên xóa một công trình đang có trong menu
When lần dựng xong
Then trang công trình không còn, menu không còn mục đó, owner hoặc nhân viên khôi phục được trong 30 ngày
```

### R4. Phiên bản, xung đột và nhật ký

Mỗi lần lưu tạo một phiên bản mới có số `version` tăng dần; lệnh lưu gửi kèm `version` đang sửa và
ghi bằng một câu `UPDATE` có điều kiện `version`. Lệch thì trả 409 kèm
bản đang có, admin cho chọn giữ bản nào, không ghi đè im lặng. Mỗi lệnh ghi (thành công hay bị từ chối) thêm một dòng
nhật ký: email, lệnh, kiểu, id, thời điểm, kết quả; giữ 1 năm. Dòng nhật ký của `purge` giữ thêm JSON phiên bản cuối để
đối chiếu, CMS không khôi phục từ đó.

Kiểu danh sách (`news`, `project`, `advertising-card`, `hero-slide`, `client-logo`, media) đi đủ vòng R3. Kiểu đơn (`menu`,
`contact`, `page-copy`, `home-projects`) chỉ có `get`, `save`: luôn `published`, không `create`, thùng rác hay `draft`.
Trường bắt buộc của mỗi kiểu là trường validator ở [nội dung CMS R1](cms-content.md#r1-kiểu-nội-dung-và-file-chiếu) đánh dấu bắt buộc (VI, cover, alt VI, số media tối
thiểu). `save` trả 400 khi dữ liệu sai dạng (kiểu, id, `layoutKey`, layout đang khóa, tỷ lệ khung); thiếu trường bắt buộc thì bản ghi giữ
`draft`, riêng bản ghi đã `published` thì trả 400.

```gherkin
Given owner và nhân viên cùng mở bài ở version 4
When owner lưu (version 5) rồi nhân viên lưu với version 4
Then nhân viên nhận 409 kèm bản version 5, bài vẫn là bản của owner
```

### R5. Lệnh admin có kiểu

API admin chỉ có các lệnh ghi dưới và các lệnh đọc `list`, `get`, `media-list`, `media-file`, `account-list`, `audit-log`, `build-status`, `snapshot`, `media-original` (thân, query, mã trả về ở [dữ liệu CMS R7](cms-data.md#r7-bảng-lệnh-admin)); mỗi lệnh validate bằng module dùng chung ở
[nội dung CMS R1](cms-content.md#r1-kiểu-nội-dung-và-file-chiếu), kiểm quyền theo R2, ghi nhật ký theo R4.

| Lệnh | Kết quả | Lỗi |
| --- | --- | --- |
| `create` | Bản ghi `draft` | 400 dữ liệu sai, 409 id hoặc slug trùng |
| `save` | Phiên bản mới; đủ trường (kể cả số media tối thiểu) thì `published` và xếp lần dựng, chưa đủ thì giữ `draft` | 400 khi bản ghi đã `published` mà bản lưu chưa đủ, 409 version lệch |
| `trash`, `restore` | Đổi trạng thái R3, áp cho cả bản ghi media | 404, 409 khi slug đã bị bài khác dùng lúc khôi phục |
| `purge` | Xóa hẳn từ thùng rác hoặc thẳng (chỉ owner) | 403, 404 |
| `upload-media`, `update-media` | Bản ghi media theo [nội dung CMS R3](cms-content.md#r3-media) | 400 loại hoặc cỡ sai, 413 quá cỡ |
| `account-add`, `account-update` | Theo R2 (chỉ owner) | 403, 409 owner cuối |
| `rollback`, `resume-publish` | Quay site về deployment trước; mở lại tự đăng (chỉ owner) | 403 |
| `rebuild` | Dựng lại từ bản chụp hiện tại sau lần dựng lỗi | 409 khi đang tạm dừng tự đăng |
| `release` | Đưa đúng bản staging đang chạy lên site chính ([editor vận hành R2](cms-editor-ops.md#r2-phát-hành-lên-site-chính)) | 409 khi staging chưa cập nhật xong, đã đổi, hoặc đang tạm dừng |
| `reorder`, `retry-variant` | Xếp lại thứ tự bản ghi của một kiểu; gọi lại job biến thể lỗi | 409 danh sách đã đổi; 404 |

Request ghi chỉ nhận `application/json` (upload gửi byte file làm thân, `Content-Type` là loại của file, 415 nếu khác); mọi request không phải GET
thiếu `Origin` hay `Origin` khác origin admin trả 403; GET không bao giờ đổi dữ liệu. Không dùng CSRF token riêng (suy
luận: Access chặn request không có JWT, `Origin` chặn form từ site khác, thân upload không phải kiểu form nên luôn preflight). Email chỉ lấy
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

Lần lưu `published` gọi `workflow_dispatch` của `ci.yml` trên `main` (`ci.yml` gọi `Deploy demo`, workflow này chỉ có
`workflow_call`); gọi lỗi thì admin Worker thử lại 3 lần rồi gọi lại mỗi 5 phút, trong lúc đó admin hiện "site chậm hơn lần lưu cuối" (so thời điểm deploy cuối với lần lưu cuối) kèm nút
"dựng lại". Không
có hàng đợi riêng: nhóm `concurrency` của `ci.yml` và `Deploy demo` giữ một run chạy và một run chờ, run chờ mới thay run
chờ cũ, và job deploy lấy bản chụp lúc bắt đầu, nên lưu dồn dập được gom (hành vi dự kiến, kiểm ở slice Publishing).
Lần dựng nội dung dựng trên commit đang chạy trên site ([dữ liệu CMS R6](cms-data.md#r6-đường-dựng-trong-ci)).
Token GitHub fine-grained chỉ quyền Actions trên repo này, nằm ở secret; admin cảnh báo owner 14 ngày trước khi token hết
hạn. Job deploy lấy bản chụp qua `GET /api/admin/snapshot` bằng service token, chạy validator dùng chung và bộ kiểm phát
hành hiện có, rồi deploy. Hiện tại `Deploy demo` chỉ đưa lên bản thử staging; site thật chỉ cập nhật qua `Release site` khi owner nói
"ok phát hành" (owner 2026-11-22, [phát hành tĩnh](static-release.md)); lần lưu CMS vì vậy lên staging ngay, staging là bản thử cho mọi thao tác thêm, sửa, xóa trên CMS; người dùng thấy ổn thì dùng chức năng "Phát hành" trong CMS để đưa đúng bản staging đang hiện lên site thật, chạy bằng code cố định như mọi lệnh khác của CMS (owner 2026-11-22; phần 2 làm nút này, tới đó site thật dựng từ repo), theo hợp đồng ở [editor vận hành R2](cms-editor-ops.md#r2-phát-hành-lên-site-chính). CMS chỉ có một bộ dữ liệu, staging không có D1 hay R2 riêng. Mục tiêu: lên staging trong 10 phút sau lần lưu cuối, cộng thời
gian job biến thể nếu có media mới (suy luận theo thời gian `Deploy demo` hiện tại, đo ở slice Publishing).

Từ khi CMS mở, mọi lần dựng kể cả merge code vào `main` đều lấy bản chụp mới nhất; file chiếu trong repo là seed và
fixture (slice Public projection thêm lệnh kéo bản chụp về repo), nên merge code không ghi đè nội dung CMS. Endpoint bản
chụp không trả lời thì lần dựng lỗi, không dùng file trong repo. Lỗi bước nào thì không deploy, site giữ bản cũ, admin hiện
lý do và nút "dựng lại"; lần lưu kế tiếp cũng dựng lại. Admin đọc trạng thái run qua API GitHub bằng cùng token: chờ,
đang dựng, đã lên, lỗi.

Owner quay staging về deployment trước bằng lệnh `rollback` (phần 1 chỉ staging, site thật theo phần 2; nút trong admin vì owner không chạy lệnh shell; lệnh
`pnpm demo:wrangler rollback` ở [phát hành tĩnh](static-release.md) là đường dự phòng): admin Worker gọi workflow rollback
mới (plan viết), workflow chỉ nhận id một trong 10 deployment gần nhất và dùng token deploy Cloudflare sẵn có của `Deploy
demo`; admin Worker không giữ token deploy. D1 không đổi theo, nên rollback đặt cờ tạm dừng trong D1; trong lúc dừng,
`snapshot` trả 423 nên mọi lần dựng, kể cả merge code, dừng ở bước lấy bản chụp. Owner sửa hoặc đưa bản ghi lỗi vào
thùng rác rồi bấm "tiếp tục đăng"; bản sửa code khẩn cũng chờ tới lúc đó. Bản đầu không dọn biến thể public tự động: biến thể chỉ bị xóa khi
`purge` bản gốc của nó, nên deployment cũ vẫn có đủ ảnh khi rollback, trừ media đã `purge`.

```gherkin
Given một biến thể đã mất khỏi bucket public
When bộ kiểm phát hành chạy
Then không deploy, site giữ bản trước, admin báo id media lỗi
```

Sao lưu: D1 Time Travel 7 ngày (suy luận, kiểm ở slice Storage); Cron Trigger hằng ngày export D1 ra R2 private qua REST
API D1 (token D1 trong secret; suy luận, kiểm ở slice Storage); mỗi tuần một tác vụ hẹn giờ trên PC owner chép export và
bản gốc media về PC rồi NAS (plan viết, không báo về admin). Admin xem tuổi file export mới nhất trong R2, quá 2 ngày thì
cảnh báo owner. Khôi phục làm thử một lần trước khi mở CMS cho nhân viên.

### R7. Xem trước gần 1:1 với site

Khung xem trước cập nhật trong lúc người soạn gõ hay đổi media và giống trang thật (owner 2026-11-15), trừ hai chỗ: media
chưa có biến thể dùng bản tạm trên R2 private qua admin, khung ghi "bản xem trước"; lưới card xếp như PC và tablet, lưới
đầu dựng sẵn của phone chỉ có ở lần dựng thật. Không có renderer thứ hai: trang khối (News, công trình) gọi đúng hàm
render mà build dùng (`renderBlocks`, `renderBlockPage`) trong trình duyệt; trang chuẩn và lưới card dùng HTML đã dựng
cộng overlay của [editor](cms-editor.md), áp cùng hàm điền slot và hàm dựng card mà build gọi (hàm điền slot là
việc mới: trang chuẩn hiện là HTML tĩnh có `data-cms`, `page-copy.json` chưa có). Plan tách các hàm này
thành module thuần (không `node:fs`, `node:path`) chạy được ở Node lẫn trình duyệt; phần kiểm file ảnh, đọc JSON ở lại
adapter của build. Preview chạy với cùng CSS, JS, motion của site trong một `iframe` có khung trang thật.

Nháp tự lưu chỉ nằm trong `localStorage` như editor R8, không gửi lên server; đổi máy hay xóa dữ liệu trình duyệt thì mất
phần chưa lưu (giới hạn chấp nhận). "Nháp" ở nơi khác là bản ghi `draft`. Cách soạn (owner 2026-11-15): sửa ngay trên
preview, bấm chữ để sửa, bấm khung ảnh để kéo, phóng; layout khóa hiện hình thu nhỏ kèm số ảnh còn thiếu; đổi bề rộng
preview theo sáu mốc 384, 768, 1024, 1280, 1440, 1920.

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
| Binding | `DB` (D1, `apac`), `MEDIA_ORIGINALS`, `MEDIA_PUBLIC` (Cloudflare R2), `ADMIN_WRITE_LIMIT` (`[[ratelimits]]`) | Chỉ ở admin Worker; khai và chốt hạn mức ở slice Storage |
| Secret | `CMS_BOOTSTRAP_OWNER`, `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, token Access API, id chính sách Access, service token, token GitHub Actions, token D1 export; ở CI: token R2 chỉ ghi bucket public | R2, R6; không ghi trong repo |
| Header | `Cf-Access-Jwt-Assertion`, `Origin` | Đầu vào R2, R5 |
| Endpoint | `/api/admin/<lệnh>`; sau service token: `GET /api/admin/snapshot`, `GET /api/admin/media-original` | R5, R6; không có API public của CMS |
| Workflow | `ci.yml` (dispatch dựng), workflow biến thể, workflow rollback (mới) | R6, [nội dung CMS R3](cms-content.md#r3-media) |

## UI

Admin là [editor](cms-editor.md), không thuộc Design System, không đưa token admin vào route public
([Design System](../../design-system/README.md#dont)). Trang public giữ UI của spec từng trang.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1 | chưa có; cần: route trang không chạy Worker, trang mở được khi admin tắt |
| R2, R5 | `pnpm qa:worker:security` kiểm JWT, service token, bootstrap owner, Origin, Content-Type, vai trò; cần thêm: ma trận quyền, owner cuối, xóa thẳng chỉ owner |
| R3, R4, R6 | chưa có; cần integration lưu, thùng rác, version lệch, dựng lỗi giữ bản cũ, rollback chặn dựng |
| R6 sao lưu | chưa có; cần diễn tập khôi phục, ghi kết quả trong PR slice Storage |
| R7 | chưa có; cần HTML preview bằng HTML build trên fixture mọi khối, slot trang chuẩn và card |

## Code dormant hiện có

Code trên `main` theo decision cũ (SSR từ D1), chưa chạy trên demo. Slice Storage và Publishing xử lý theo bảng:

| Phần | Vị trí | Xử lý |
| --- | --- | --- |
| Kiểm JWT Access, `Origin`, đăng nhập dev loopback (chỉ khi chạy local trên `localhost`, bản deploy không bật) | `requireActor`, `verifyAccessJwt` trong `src/worker/auth.mjs` | Đã thay (S2): bảng `accounts` thay allowlist `ADMIN_EMAILS` |
| Kiểm upload WebP, SVG an toàn | `isWebp`, `isSafeSvg` (đã xóa cùng `index.js` cũ ở S2) | Viết lại: kiểm byte đầu ở P2, SVG ở phần 2, theo [nội dung CMS R3](cms-content.md#r3-media) |
| Editor Dockview, overlay | `src/admin/` | Giữ; đổi đường lưu sang lệnh R5 ([editor](cms-editor.md)) |
| Render public SSR, `page_edits`, API public, sitemap từ D1, route `/media/*` | `src/worker/index.js`, `content.mjs` cũ | Đã thay (S2): Worker chỉ còn API admin |
| CRUD chung sáu resource, `audit_log` | `src/worker/index.js` cũ | Đã thay (S2): khung nhật ký `src/worker/router.mjs`; lệnh nội dung ở P1 |
| Migration `0001` tới `0005`, seed 36 product | `src/db/migrations/` | Đã thay bằng `0001_cms.sql` ([dữ liệu CMS R1](cms-data.md)) |
| `wrangler.toml` (`run_worker_first` route public), `scripts/cms/` | gốc repo | Đã thay (S2): admin Worker `truong-thinh-admin`, `run_worker_first = ["/api/*"]` |

## Gate còn mở

Không activate Worker, nối Wrangler cho CMS, deploy, tạo hay đọc secret, nối domain khi owner chưa duyệt slice tương ứng.

Khóa slot `page-copy` đã chốt ở [editor R6](cms-editor.md#r6-trang-chuẩn). Video upload: [dữ liệu CMS R5](cms-data.md#r5-media-crop-và-biến-thể).
Plan chi tiết đã chốt bảng D1, bản chụp, redirect 301 khi đổi slug, preview URL, đường dựng và bảng lệnh ở
[dữ liệu CMS](cms-data.md); chuỗi khối cố định ở [News R3](news.md#r3-trang-bài), [công trình R4](projects.md#r4-ảnh-và-video-công-trình).

Thứ tự slice, mỗi slice owner duyệt gate: Contract (spec này; gate: owner duyệt spec),
Storage (migration `0001` mới, bucket, export; gate: migration có snapshot, khôi phục thử, đường lùi), Publishing
(lệnh R5, dựng R6; gate: test contract, security, integration), Public projection (file chiếu; gate: bản dựng từ
bản chụp giống bản dựng từ repo, diễn tập rollback). Editor nối API theo [cms-editor](cms-editor.md) sau Publishing.
Storage, Publishing, Public projection là phần 1: site vẫn dựng từ repo. Phần 2 (editor, build đọc ảnh R2) kết thúc bằng task bật hẳn dựng từ bản chụp.

## Chú thích thuật ngữ

- **Access**: lớp đăng nhập Cloudflare đặt trước admin, cấp JWT (token có chữ ký).
- **File chiếu**: file JSON CMS sinh ra cho build tĩnh đọc.
- **Bản chụp**: bộ file chiếu tại một thời điểm, đầu vào của một lần dựng.
- **Service token**: cặp id, secret Access cấp cho máy (workflow dựng), không gắn email.
- **(owner ngày)**: owner quyết định điều đó vào ngày ghi.
- **Slice**: một chặng làm CMS có gate owner duyệt (mục Gate còn mở).
- **Espacio**: site espaciohomedesign.com, mẫu owner chọn cho layout, chữ và motion.
- **D1**, **Cloudflare R2**, **Worker**: database SQL, kho object và code chạy trên Cloudflare. "R2" đứng một mình là yêu cầu R2.
- **Orphan**: object không còn bản ghi nào trỏ tới. **Dormant**: code có trên `main` nhưng chưa chạy.
