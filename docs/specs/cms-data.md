---
title: Dữ liệu và đường xuất bản của CMS
status: planned
source:
  - src/cms/**
  - src/db/migrations/**
  - scripts/cms/**
  - .github/workflows/cms-variants.yml
  - .github/workflows/rollback.yml
tests:
  - tests/cms/projection.test.mjs
  - tests/worker/schema.test.mjs
notion: https://app.notion.com/p/420332849a0e81c9adfcf363d96fcde5
updated: 2026-11-22
---

# Dữ liệu và đường xuất bản của CMS

## Mục đích

Hợp đồng dữ liệu mà plan chi tiết đã chốt cho [CMS](cms.md) và [nội dung CMS](cms-content.md): bảng D1, bản chụp,
redirect khi đổi slug, preview URL, media và biến thể, đường dựng trong CI, bảng lệnh admin. Quyền, trạng thái và
luật nội dung vẫn thuộc hai spec kia. Chưa có code; thứ tự làm ở mục Gate còn mở.

Không thuộc bản đầu (owner 2026-11-22): tính vector lúc lưu, tìm bản ghi `draft`, hỗ trợ nhập bằng AI, khôi phục phiên
bản cũ, hẹn giờ đăng.

## Hành vi

### R1. Bảng D1

Database `truong-thinh-cms` (vùng `apac`, binding `DB`), một migration `src/db/migrations/0001_cms.sql`, mọi bảng
`STRICT`, thời điểm là chuỗi ISO 8601 UTC.

| Bảng | Khóa chính | Cột |
| --- | --- | --- |
| `accounts` | `email` (chữ thường) | `role` (`owner`, `staff`), `status` (`active`, `locked`), `created_at`, `created_by`, `updated_at`, `updated_by` |
| `records` | `type`, `id` | `status` (`draft`, `published`, `trashed`), `prev_status`, `version`, `live_version`, `pending`, `position`, `name`, `slug_vi`, `slug_en`, `data` (JSON), `write_id`, `created_at`, `created_by`, `updated_at`, `updated_by`, `trashed_at` |
| `versions` | `type`, `id`, `version` | `status`, `data`, `saved_at`, `saved_by` |
| `variants` | `key` (32 ký tự hex) | `media_id`, `crop` (`x,y,w,h`), `status` (`pending`, `ready`, `error`), `error` (lý do: `timeout`, `size`), `run_id`, `created_at`, `settled_at` |
| `record_media` | `type`, `id`, `media_id`, `variant_key` | Media và biến thể mà phiên bản mới nhất của bản ghi dùng |
| `slug_history` | `type`, `locale`, `slug` | `id`, `changed_at` |
| `audit_log` | `seq` | `at`, `email`, `command`, `type`, `id`, `result`, `detail` (JSON phiên bản cuối, chỉ lệnh `purge`) |
| `settings` | `key` | `value`; khóa `publish_paused`, `dispatch_error`, `access_drift`, `orphan_cursor`, `cms_live` |

`records.type` là một trong `media`, `news`, `project`, `advertising-card`, `hero-slide`, `client-logo`,
`home-projects`, `menu`, `contact`, `page-copy`; kiểu đơn có đúng một dòng `id = 'main'`, không tạo, không xóa. Phần 1
mở `media`, `news`, `project`, `advertising-card`, `hero-slide`, `home-projects`, `menu`; ba kiểu còn lại mở ở phần 2.
Media là một kiểu bản ghi, cùng trạng thái, phiên bản và thùng rác; media là `published` khi có đủ `altVi`, `altEn`
(tới khi phần 2 mở EN không bắt buộc theo [nội dung CMS R2](cms-content.md)). `data` có đúng hình dạng một phần tử file chiếu. Slug duy nhất theo kiểu trong
các bản ghi chưa vào thùng rác (index duy nhất một phần), nên khôi phục bài trùng slug trả 409. `save` ghi bằng một câu
`UPDATE ... WHERE version = ?`; mọi câu khác của cùng `batch` chỉ chạy khi câu đó đã ghi (so `write_id`).
`live_version` là phiên bản `published` gần nhất có đủ biến thể; `pending` là số biến thể của phiên bản mới nhất chưa
`ready`. `record_media` có một dòng cho mỗi cặp media và biến thể, dù bản ghi dùng cặp đó nhiều lần. File seed chỉ
xóa `records`, `versions`, `record_media`, `slug_history`; nó từ chối chạy khi `settings.cms_live = '1'`, và khi D1 có
bản ghi không do seed tạo trừ khi người chạy ép. Bảng không đặt `CHECK` cho `type`; migration sau `0001` chỉ được thêm
(bảng, cột, index) và PR của nó mở kèm nhãn `hold` tới khi đã áp bằng tay.

```gherkin
Given bài news A đang published với slug_vi "a" và bài B trong thùng rác cũng có slug_vi "a"
When khôi phục bài B
Then lệnh trả 409, bài B vẫn ở thùng rác
```

### R2. Bản chụp

`GET /api/admin/snapshot` trả JSON `{ schema: 1, takenAt, records: { <kiểu>: [data, ...] }, redirects: [...], held: [...] }`.
Mỗi mảng gồm `data` của bản ghi `published`, xếp theo `position` rồi `id`; bản ghi còn `pending` dùng `data` của
`live_version`, chưa có `live_version` thì vào `held`. Kiểu `media` không vào bản chụp. Đang tạm dừng tự đăng thì trả
423. Worker ghép chuỗi, không phân tích từng bản ghi. Phía build, hàm thuần `snapshotToFiles` (`src/cms/projection.mjs`)
đổi bản chụp thành file chiếu, chỉ cho kiểu đang mở; file khác trong thư mục nội dung lấy từ repo:

| Kiểu | File | Cách chiếu |
| --- | --- | --- |
| `news`, `project` | `news.json`, `projects.json` | Mảng nguyên |
| `advertising-card` | `advertising-cards.json` | Mảng nguyên; build đọc file này từ phần 2 |
| `hero-slide` | `hero-slides.json` | Nhóm theo trường `page` |
| `home-projects`, `menu` | `home-projects.json`, `menu.json` | Bản ghi `main`, bỏ id công trình không còn `published`; thiếu bản ghi thì lỗi |
| `redirects` | `redirects.json` | Mảng nguyên (R3) |

`snapshotToFiles` ghép origin của bucket public vào `src` dạng `/v/...`; D1 không lưu origin. `snapshotId` là SHA-256
của bản chụp bỏ `takenAt`.

```gherkin
Given D1 vừa seed từ file chiếu trong repo
When lấy bản chụp, chạy snapshotToFiles rồi dựng site
Then bản dựng giống bản dựng từ repo từng byte, trừ build-info.json
```

### R3. Redirect 301 khi đổi slug

Chỉ `news` và `project` đổi được slug. Khi `save` đổi slug của bản ghi đã từng `published`, Worker ghi slug cũ vào
`slug_history`. Mỗi lần một bản ghi thành `published` (lưu hoặc khôi phục), Worker xóa dòng lịch sử trùng slug hiện tại
của nó: redirect luôn được theo kể cả khi có trang trùng path, nên slug của trang đang sống không được nằm trong lịch
sử. Build: `slugRedirects(redirects, content)` trong `scripts/site/redirects.mjs` sinh một dòng 301 từ mỗi slug cũ tới
slug hiện tại của bài còn trong file chiếu; bài trong thùng rác không có redirect và rơi về 404 tĩnh. `redirectsFile`
dừng build khi quá 1.900 dòng (giới hạn 2.000 redirect tĩnh của Workers static assets); Worker trả 409
`slug-history-full` cho lần đổi slug khi `slug_history` đã có 1.200 dòng.

```gherkin
Given bài news đang published đổi slugVi từ "a" sang "b" rồi sang "c"
When lần dựng xong
Then /vi/news/a/ và /vi/news/b/ trả 301 thẳng tới /vi/news/c/
```

### R4. Preview URL của `workers.dev`

`wrangler.static.toml` và `wrangler.toml` đều ghi `preview_urls = false`. Admin Worker dùng `workers_dev = true` tới khi
đổi domain, sau đó `workers_dev = false` và custom domain `admin.truongthinhads.vn`.

```gherkin
Given một Worker vừa deploy bản mới
When mở URL preview theo version của Worker đó trên workers.dev
Then không trả 200
```

### R5. Media, crop và biến thể

Media có hai nguồn: `repo` (file `.webp` trong `src/site/assets/content/`, trường `path`) và `r2` (bản gốc ở bucket
private, key `originals/<mediaId>/original.<ext>`). Bản gốc giữ nguyên byte, không bao giờ phát ra ngoài; ảnh upload
là JPEG, PNG, WebP, AVIF, tối đa 25 MB (SVG logo ở phần 2). Kích thước media là kích thước sau khi xoay theo EXIF; job
biến thể xoay trước khi cắt. Chỗ đặt media trong nội dung là `{ mediaId, crop: [x, y, w, h] }`; Worker tự ghi `src`,
`width`, `height`, `altVi`, `altEn`, không tin giá trị client gửi. Chỗ đặt có `legacySrc` (chỉ dữ liệu seed, ví dụ file
cắt riêng của card công trình) giữ nguyên `src` và alt cho tới khi người soạn đặt lại crop.

Key biến thể là 32 ký tự hex đầu của SHA-256 trên `<hash bản gốc>|<x,y,w,h>|<số công thức>`. Media `repo` với crop
nguyên khung dùng thẳng `path`; còn lại dùng object `v/<key>/<mediaId>[-<bề rộng>].<webp|avif|jxl>` ở bucket public, cùng
cỡ và chất lượng với [tải ảnh R1](media-delivery.md#r1-biến-thể-ảnh-nội-dung), không có EXIF. `v/<key>/manifest.json` ghi
sau cùng (kích thước, danh sách file, màu, ngưỡng JXL); có manifest nghĩa là biến thể đủ. Workflow `cms-variants.yml`
sinh biến thể; admin Worker có một Cron Trigger mỗi phút (việc hằng ngày chạy theo giờ UTC trong cùng trigger), thấy
manifest thì đặt `ready`, và khi bản ghi `published` hết `pending` thì đặt `live_version` rồi gọi lần dựng. Biến thể `pending` quá 30 phút, hoặc manifest ghi kích thước gốc khác
bản ghi media, thành `error` kèm lý do; lần lưu kế tiếp dùng key đó gọi lại job. Job upload từng biến thể ngay khi
sinh xong, mỗi lần gọi tối đa 8 biến thể.

Video upload là MP4 tối đa 95 MB qua cùng lệnh upload (Cloudflare gói Free từ chối thân request trên 100 MB), kèm
`duration` và `posterId`: một media ảnh cùng tỷ lệ, lệch không quá 1%, không xóa được khi video còn. Video không cắt
nên có đúng một biến thể: job chạy `build-video-ladder.mjs` ([tải video R1](video-delivery.md#r1-thang-chất-lượng-cho-mỗi-video)),
bỏ metadata của bản gốc, ghi `v/<key>/master.m3u8`, `<bậc>.m3u8`, `<bậc>.mp4` rồi `manifest.json`. Mỗi video một lần gọi
job; hạn `pending` của video là 90 phút. Trong phần 1 nội dung chưa trỏ được tới media video.

```gherkin
Given bài published có một media vừa upload, biến thể còn pending
When lần dựng chạy trước khi biến thể đủ
Then bản chụp dùng phiên bản published trước của bài, bài khác vẫn lên bình thường

Given một video MP4 quay dọc 1080 x 1920 vừa upload kèm poster cùng tỷ lệ
When job biến thể chạy xong
Then bucket public có master.m3u8 và các bậc 240, 480, 960 tính theo bề rộng hiển thị 1080
And không file nào còn thẻ vị trí của bản gốc
```

### R6. Đường dựng trong CI

`ci.yml` có input `content`: lần dựng nội dung không chạy bộ test code, dùng nhóm concurrency riêng `ci-content`, mang
tên run `CMS content build`, chỉ deploy lên staging, và dựng trên commit của bản đang chạy trên staging (đọc
`build-info.json` bằng service token vì staging nằm sau Access; commit phải là 40 ký tự hex và nằm trên `main`), không lấy `main` mới nhất. Biến repo
`CMS_SNAPSHOT_URL` có giá trị thì mọi lần dựng staging lấy bản chụp; lấy không được thì lần dựng lỗi. Đích `production` của `Deploy demo` không lấy bản chụp và không ghi dấu cho tới khi phần 2 thêm chức năng "Phát hành" ([CMS R6](cms.md#r6-xuất-bản-và-rollback)). Trước deploy chạy
`pnpm qa:content`, build, `pnpm qa:static`. Bản đang chạy có cùng `commit` và `snapshotId` thì bỏ qua deploy. Sau mỗi
lần deploy staging, job ghi dấu `deploys/<khóa>.json` (version id, commit, `snapshotId`, thời điểm) vào bucket public; admin đọc
10 dấu gần nhất để hiện trạng thái và cho rollback. Workflow rollback hủy lần deploy đang chạy để chạy ngay. Token deploy
của CI nằm trong environment GitHub `cloudflare-deploy` chỉ nhánh `main` dùng được, không có quyền D1; migration áp
bằng tay ở gate. Lần dispatch dựng lỗi thì Cron của admin Worker gọi lại mỗi 5 phút.

```gherkin
Given staging đang chạy commit X và main đã có commit Y chưa deploy xong
When một lần lưu nội dung gọi lần dựng
Then lần dựng đó dùng code của commit X với nội dung mới
```

### R7. Bảng lệnh admin

Đường dẫn `/api/admin/<lệnh>`; lệnh ghi `POST`, lệnh đọc `GET`. Mã lỗi chung theo [CMS R5](cms.md#r5-lệnh-admin-có-kiểu).

| Lệnh | Thân hoặc query | Thành công |
| --- | --- | --- |
| `create` | `{ type, id, data }` | 201, bản ghi `draft` version 1 |
| `save` | `{ type, id, version, data }` | 200 `{ version, status, missing, pending }` |
| `trash`, `restore` | `{ type, id }` | 200; `trash` trả `referencedBy` |
| `purge` | `{ type, id, confirm }` | 200; `confirm` phải bằng tên bản ghi |
| `upload-media` | Thân là byte file; query `slugBase`, `width`, `height`, `altVi`, `altEn` | 201, media và biến thể `pending` |
| `update-media` | `{ id, version, altVi, altEn, tags }` | 200; alt mới ghi vào mọi bản ghi dùng media |
| `account-add`, `account-update` | `{ email, role, status }` | 201, 200 |
| `rollback` | `{ versionId }` (một trong 10 dấu deployment gần nhất) | 202, tự đăng tạm dừng |
| `resume-publish`, `rebuild` | `{}` | 200, 202 |
| `list`, `get`, `media-list`, `account-list`, `audit-log`, `build-status` | query | 200 |
| `media-file` | `?id=` | Byte bản gốc cho người đã đăng nhập, dùng cho xem trước; kèm `nosniff` và CSP `sandbox` |
| `snapshot`, `media-original` | chỉ service token | R2; byte bản gốc kèm `X-Hash` |

`save` phân loại lỗi bằng hai hàm dùng chung của `src/cms/contract.mjs`: `shapeErrors` (sai dạng, trả 400) và
`fullErrors` (thiếu trường bắt buộc: bản ghi giữ `draft`, đã `published` hoặc là kiểu đơn thì 400). Dòng nhật ký của
lệnh thành công nằm trong cùng `batch` với câu ghi dữ liệu; lệnh bị từ chối do `Origin`, `Content-Type`, rate limit,
vai trò hoặc lỗi 4xx cũng có một dòng. `upload-media` có thêm hạn mức 20 lần mỗi 60 giây. Lệnh xóa giữ luật cả bộ:
`home-projects` còn từ 3 công trình, mỗi trang còn ít nhất một slide hero `published`. Khóa tài khoản ghi D1 trước rồi
mới gỡ khỏi chính sách Access.

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Hàm | `shapeErrors`, `fullErrors`, `materialize`, `variantKey`, `snapshotToFiles`, `filesToRecords`, `assignMedia` (`src/cms/`) | Module thuần, Worker, build và editor gọi chung |
| Data | `redirects.json`, `advertising-cards.json` trong thư mục nội dung của bản chụp | File chiếu mới, không commit vào repo |
| Code | `src/cms/layouts.mjs`, `src/cms/legacy-layouts.mjs` | Bảng layout khóa; chuỗi khối đóng băng của trang có trước CMS |
| Biến môi trường | `TT_CONTENT_DIR` | Thư mục nội dung build đọc, mặc định `src/site/content` |
| Biến và secret CI | `CMS_SNAPSHOT_URL`, `CMS_MEDIA_ORIGIN`, `SITE_ORIGIN`, `CMS_ADMIN_ORIGIN`, `R2_PUBLIC_BUCKET`; service token, token R2 chỉ ghi bucket public | R6 |
| File sinh | `build-info.json` ở gốc site | `commit`, `snapshotId`, `snapshotAt` của bản đang chạy |

## UI

Không có UI public. Trang vận hành tạm `/admin/status.html` (trạng thái dựng, lưu thử, dựng lại, rollback, tài khoản)
cho owner tới khi có [editor](cms-editor.md) mới.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1 | chưa có; cần `tests/worker/schema.test.mjs`, `tests/worker/records.test.mjs` |
| R2, R3 | chưa có; cần test khứ hồi `tests/cms/projection.test.mjs`, test redirect trong `tests/site/` |
| R4 | chưa có; cần `tests/tooling/wrangler-config.test.mjs` |
| R5 | chưa có; cần `tests/cms/build-variants.test.mjs`, `tests/worker/variants.test.mjs` |
| R6 | chưa có; cần `tests/tooling/fetch-snapshot.test.mjs` và một lần đo thật trên CI |
| R7 | chưa có; cần `pnpm qa:worker` |

## Gate còn mở

Chưa có code. Phần 1, owner duyệt từng gate: chặng A (chuẩn bị trong repo, không chạm Cloudflare), Storage,
Publishing, Public projection như [CMS](cms.md#gate-còn-mở). Trong cả phần 1 site vẫn dựng từ repo; Public projection
chỉ bật dựng từ bản chụp để so khớp và diễn tập rollback rồi tắt lại. Phần 2 có plan riêng sau khi viết lại
[spec editor](cms-editor.md): build đọc ảnh R2 và card Advertising từ file chiếu, EN không bắt buộc, logo khách hàng,
`contact`, `page-copy`, kiểm tỷ lệ khung crop, editor; task cuối của phần 2 seed lại D1, đặt `cms_live` và bật hẳn.
Video upload có thang chất lượng trên R2 từ phần 1 (owner 2026-11-22); khối và card dùng video đó ở phần 2, cùng ảnh R2.

## Chú thích thuật ngữ

- **Bản chụp**, **file chiếu**, **service token**: như [CMS](cms.md#chú-thích-thuật-ngữ).
- **Chỗ đặt media**: một vị trí trong nội dung dùng một media kèm vùng crop.
- **Biến thể**: các file ảnh đã cắt, đổi cỡ, đổi định dạng sinh từ một bản gốc và một vùng crop.
- **Manifest**: file ghi sau cùng trong thư mục một biến thể; có mặt nghĩa là biến thể đủ.
- **Dấu deployment**: file nhỏ job deploy ghi lại sau mỗi lần đưa site lên.
- **Seed**: dữ liệu ban đầu nạp vào D1 từ file trong repo.
- **Khứ hồi**: đổi dữ liệu sang dạng khác rồi đổi ngược, kết quả phải bằng ban đầu.
- **Cron Trigger**: lịch chạy định kỳ của một Worker.
- **Kiểu đơn**: kiểu nội dung chỉ có một bản ghi `main`.
- **Environment (GitHub)**: nhóm secret mà chỉ job chạy trên nhánh được phép mới đọc được.
