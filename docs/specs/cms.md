---
title: CMS xuất bản ra trang tĩnh
status: planned
source:
  - src/worker/**
  - src/db/migrations/**
  - wrangler.toml
tests:
  - tests/worker/worker-contract.cjs
  - tests/worker/worker-static-contract.cjs
  - tests/worker/advertising-detail-route.test.mjs
notion: https://app.notion.com/p/3e8332849a0e816eb46ece5834b67178
updated: 2026-11-15
---

# CMS xuất bản ra trang tĩnh

## Mục đích

Owner và nhân viên tự đăng, sửa mọi nội dung VI/EN của site (card Advertising, công trình, News, chữ và ảnh trang cố
định) qua trang admin. Khách chỉ nhận file tĩnh; CMS ghi nội dung rồi dựng lại site. Kiến trúc theo
[CMS xuất bản tĩnh](../decisions/cms-cloudflare-static-publish.md) (owner duyệt 2026-11-15). Spec này là contract của
slice Contract: kiểu nội dung, media, trạng thái, quyền, lệnh admin, bộ khối. Chưa có code theo spec này; code dormant
hiện có và phần giữ, bỏ nằm ở [Code dormant](#code-dormant-hiện-có). Build và demo thuộc [phát hành tĩnh](static-release.md).

## Hành vi

### R1. Ranh giới public và admin

Route public (`/`, `/vi/*`, `/en/*`, ảnh, sitemap) là Workers static assets, không `run_worker_first`, không đọc D1.
Admin là một Worker riêng ở `admin.truongthinhads.vn` (trước khi đổi domain: một hostname `workers.dev` riêng), sau một
ứng dụng Access team `truongthinh` đăng nhập Google. Media public ở `media.truongthinhads.vn` (R2 custom domain). CMS
hỏng, D1 hết hạn mức hay admin tắt thì site vẫn chạy bản dựng cuối.

```gherkin
Given admin Worker bị tắt và D1 trả lỗi
When khách mở /vi/news/<slug>/
Then trang trả 200 từ bản dựng cuối, không request nào tới admin hay D1
```

### R2. Tài khoản và vai trò

Hai vai trò, lưu trong D1 (bảng tài khoản theo email, chữ thường). Email owner đầu tiên nằm ở secret
`CMS_BOOTSTRAP_OWNER`, không ghi trong repo; lần chạy đầu tạo tài khoản owner từ secret nếu bảng trống.

| Việc | Owner | Nhân viên |
| --- | --- | --- |
| Tạo, sửa, lưu (lưu là lên web) | Có | Có |
| Upload media, sửa alt, tag | Có | Có |
| Xóa vào thùng rác, khôi phục từ thùng rác | Có | Có |
| Xóa hẳn khỏi thùng rác | Có | Không |
| Trang tài khoản: thêm, khóa, đổi vai trò owner hoặc nhân viên | Có | Không |
| Quay site về bản dựng trước | Có | Không |
| Xem nhật ký thao tác | Có | Chỉ thao tác của mình |

Worker cho qua khi JWT Access hợp lệ và email có tài khoản đang mở trong D1; thiếu một trong hai thì 403. Ít nhất một
owner luôn còn mở: lệnh khóa hay hạ vai trò owner cuối cùng trả 409. Danh sách email của chính sách Access phải khớp bảng
tài khoản, vì Access tính seat ở lần đăng nhập đầu và chặn người mới khi hết seat.
[CẦN LÀM RÕ: trang tài khoản tự sửa chính sách Access qua API Cloudflare (token chỉ quyền Access, nằm ở secret) hay owner
thêm email trên dashboard? Agent đề xuất tự sửa qua API, kiểm ở slice Storage.]

```gherkin
Given nhân viên đã đăng nhập
When gọi lệnh thêm tài khoản
Then trả 403, không dòng nào đổi, nhật ký ghi lần bị từ chối
```

### R3. Kiểu nội dung và file chiếu

Mỗi kiểu nội dung chiếu ra đúng một file JSON mà build tĩnh đang đọc; build không biết CMS tồn tại. Bản chụp xuất bản
là bộ file này, qua cùng validator với build (một module dùng chung, không viết lại luật trong Worker).

| Kiểu | File chiếu | Validator dùng chung |
| --- | --- | --- |
| `news` | `content/news.json` | `validateBlockPage`, `kindFieldErrors` (`scripts/site/blocks.mjs`, `block-pages.mjs`) |
| `project` | `content/projects.json` | như `news`, thêm khung card và media card |
| `hero-slide` | `content/hero-slides.json` | `validateHeroSlides` (`scripts/ci/content-contract.mjs`) |
| `project-reel` | `content/project-reel.json` | `validateProjectReel` |
| `menu` | `content/menu.json` | `menuErrors` |
| `client-logo` | `content/client-logos.json` | chưa có; thêm ở slice Storage |
| `advertising-card` | `content/advertising-cards.json` (mới) | luật card hiện ở `catalog.mjs` và `media-contract.mjs`, tách ra file dữ liệu |
| `page-copy` | `content/page-copy.json` (mới) | chữ và ảnh theo slot của năm trang cố định; layout không đổi |

Định danh: `id` khớp `^[a-z0-9][a-z0-9-]{0,79}$`, không đổi sau khi tạo. `slugVi`, `slugEn` kebab-case theo
[SEO media](media-seo.md); đổi slug sau khi đăng thì bản dựng thêm redirect 301 từ slug cũ. Card Advertising giữ luật
masonry: lưu card kèm cache bố cục ([masonry R6](masonry-layout-cache.md#r6-contract-cho-cms-chưa-làm)), không có trường span.
[CẦN LÀM RÕ: khóa slot của `page-copy` lấy từ `data-cms` hiện có hay đặt lại; chốt ở slice editor.]

```gherkin
Given bản chụp có một bài news thiếu cover.width
When chạy validator trước lần dựng
Then lần dựng không chạy, admin báo đúng id bài và trường thiếu
```

### R4. Hai ngôn ngữ

Mọi trường chữ có cặp VI và EN (`title.vi`, `title.en` hoặc `altVi`, `altEn` như file chiếu hiện tại). VI bắt buộc để
lưu. Thiếu EN ở một trường bắt buộc thì bài vẫn lên bản VI; bản EN không sinh, không có `hreflang` en, link đổi ngôn ngữ
của bài đó trỏ trang danh sách EN ([layout-library R4](layout-library.md#r4-dữ-liệu-và-render-tĩnh)). Admin hiện bài thiếu
EN trong một danh sách riêng. Chữ chỉ có đoạn, đậm, nghiêng, link theo khối; không nhận HTML, CSS hay script.

```gherkin
Given bài news có đủ VI, thiếu description.en
When lưu bài
Then /vi/news/<slugVi>/ lên ở lần dựng sau, /en/news/<slugEn>/ không sinh và sitemap không có URL EN của bài
```

### R5. Media

Media là một bản ghi riêng, nội dung tham chiếu theo `mediaId`; một media dùng được ở nhiều nơi.

- `kind`: `image` hoặc `video`. Ảnh có `width`, `height` thật. Video có `posterId` trỏ một ảnh, cùng tỷ lệ với video.
- Alt: `altVi` bắt buộc, `altEn` theo R4; tả đúng thứ trong media, không trùng alt cùng ngôn ngữ trong một card
  ([media-seo R3](media-seo.md#r3-alt-và-tên-file-của-từng-media)); CMS điền sẵn gợi ý được, người soạn duyệt.
- Upload: bỏ EXIF và GPS; tên file theo slug nội dung cộng số thứ tự. Đầu vào nhận JPEG, PNG, WebP, AVIF cho ảnh, MP4
  cho video; SVG chỉ cho `client-logo` qua `isSafeSvg` hiện có.
- Bản public: biến thể sinh ở lần dựng theo chuẩn site ([tải ảnh R1](media-delivery.md#r1-biến-thể-ảnh-nội-dung),
  [tải video](video-delivery.md)), đặt ở bucket public sau `media.truongthinhads.vn`; không bao giờ phát bản gốc.
- Xóa media đang được nội dung dùng trả 409 kèm danh sách chỗ dùng. Object không còn bản ghi nào trỏ tới (orphan) được
  dọn sau 30 ngày.

[CẦN LÀM RÕ: bản gốc ở R2 private (decision) hay NAS (owner 2026-10-12)? Agent đề xuất R2 private để lần dựng trên GitHub
Actions không cần PC, sao lưu tuần chép bản gốc về NAS.]
[CẦN LÀM RÕ: giới hạn cỡ file upload; thang video sinh ở lần dựng hay trên PC lúc upload.]

```gherkin
Given một card có hai ảnh cùng altVi
When lưu card
Then trả 400, nêu id hai media trùng alt, không bản ghi nào đổi
```

### R6. Trạng thái và thùng rác

| Trạng thái | Trên site | Ai đặt |
| --- | --- | --- |
| `draft` | Không | Tạo mới chưa đủ trường bắt buộc; lưu nháp tự động |
| `published` | Có, từ lần dựng sau | Lưu khi đủ trường bắt buộc (owner 2026-11-15: lưu là lên web, không bước duyệt) |
| `trashed` | Không | Lệnh xóa của owner hoặc nhân viên |

Thùng rác giữ bản ghi và mọi phiên bản 30 ngày, khôi phục về đúng trạng thái trước khi xóa; quá 30 ngày hoặc owner xóa
hẳn thì mất. URL của bài trong thùng rác rơi về trang 404 tĩnh: public không có Worker nên không trả 410 (suy luận, thay
mục 14 ý định 2026-10-12). Xóa nội dung đang được nội dung khác trỏ tới (menu, `project-reel`, `news-cards`) thì lần dựng
bỏ tham chiếu đó và admin báo chỗ bị ảnh hưởng.

```gherkin
Given nhân viên xóa một công trình đang có trong menu
When lần dựng xong
Then trang công trình không còn, menu không còn mục đó, owner khôi phục được trong 30 ngày
```

### R7. Phiên bản, xung đột và nhật ký

Mỗi lần lưu tạo một phiên bản mới có số `version` tăng dần; lệnh lưu gửi kèm `version` đang sửa. Lệch thì trả 409 kèm
bản đang có, admin cho chọn giữ bản nào, không ghi đè im lặng. Mỗi lệnh ghi (thành công hay bị từ chối) thêm một dòng
nhật ký: email, lệnh, kiểu, id, thời điểm, kết quả; giữ 1 năm.

```gherkin
Given owner và nhân viên cùng mở bài ở version 4
When owner lưu (version 5) rồi nhân viên lưu với version 4
Then nhân viên nhận 409 kèm bản version 5, bài vẫn là bản của owner
```

### R8. Lệnh admin có kiểu

API admin chỉ có các lệnh dưới; mỗi lệnh validate bằng module dùng chung ở R3, kiểm quyền theo R2, ghi nhật ký theo R7.

| Lệnh | Kết quả | Lỗi |
| --- | --- | --- |
| `create` | Bản ghi `draft` | 400 dữ liệu sai, 409 id hoặc slug trùng |
| `save` | Phiên bản mới; đủ trường thì `published` và xếp lần dựng | 400, 409 version lệch |
| `trash`, `restore` | Đổi trạng thái R6 | 404, 409 khi slug đã bị bài khác dùng lúc khôi phục |
| `purge` | Xóa hẳn (chỉ owner) | 403, 404 |
| `upload-media`, `update-media` | Bản ghi media theo R5 | 400 loại hoặc cỡ sai, 413 quá cỡ |
| `account-add`, `account-update` | Theo R2 (chỉ owner) | 403, 409 owner cuối |
| `rollback` | Quay site về deployment trước (chỉ owner) | 403 |

Request ghi chỉ nhận `application/json` (upload là `multipart/form-data`) và `Origin` bằng origin admin; không dùng
CSRF token riêng (suy luận: Access chặn request không có JWT, `Origin` chặn form từ site khác; kiểm cookie Access ở slice
Storage). Lỗi D1 hay R2 trả 503 cho admin, không chạm site public.
[CẦN LÀM RÕ: rate limit bằng luật Cloudflare hay đếm trong Worker; agent kiểm hạn mức gói free ở slice Storage.]

```gherkin
Given admin đã xác thực
When POST lệnh save với Content-Type text/plain hoặc Origin của site khác
Then trả 403 hoặc 415, không phiên bản nào được tạo
```

### R9. Bộ khối và preset

`layoutKey` của một khối là một kiểu trong `BLOCK_TYPES` (`scripts/site/blocks.mjs`, schema version 1); kiểu khác bị từ
chối ở R3. Bản đầu có đúng hai preset, lấy từ khối mà 8 bài News và 18 công trình đang dùng
([layout-library R2](layout-library.md)):

| Preset | Kiểu nội dung | Khối bắt buộc | Khối thêm được |
| --- | --- | --- | --- |
| Bài News | `news` | `news-cards` | `paragraph`, `image-single`, `image-pair`, `gallery-carousel`, `quote`, `contact-quick`, `cta-arrow` |
| Chi tiết công trình | `project` | `hero-project`, `facts-grid`, `project-slider` | `section-title`, `paragraph`, `image-single`, `image-text`, `image-pair`, `gallery-carousel`, `contact-quick`, `cta-arrow` |

Năm trang cố định (trang chủ, Nhà ở, Kinh doanh, About, Advertising) giữ layout hiện tại; CMS chỉ sửa chữ và media theo
slot (`page-copy`). Thêm preset hay khối mới là việc code, qua PR, không làm từ admin. Field `template` cũ
(`compact-gallery`, `editorial-case`, `process-film`) bỏ.

```gherkin
Given bài News đang soạn
When gửi một khối có layoutKey "project-slider"
Then trả 400 "khối không thuộc preset Bài News"
```

### R10. Xuất bản và rollback

Lần lưu `published` xếp một lần dựng; các lần lưu trong 2 phút gom thành một. Lần dựng chạy workflow `Deploy demo`
(GitHub Actions), lấy bản chụp từ admin bằng service token Access, chạy validator R3 và bộ kiểm phát hành hiện có, rồi
deploy. Lỗi bước nào thì không deploy, site giữ bản cũ, admin hiện lý do bằng lời thường. Admin hiện trạng thái: chờ, đang
dựng, đã lên, lỗi. Owner quay về deployment trước bằng lệnh `rollback`; nội dung trong D1 không đổi theo.
[CẦN LÀM RÕ: hẹn giờ đăng có trong bản đầu không (ý định 2026-10-12 mục 17)? Agent đề xuất để sau bản đầu.]

```gherkin
Given lần dựng có một ảnh thiếu biến thể
When bộ kiểm phát hành chạy
Then không deploy, site giữ bản trước, admin báo id media lỗi
```

### R11. Sao lưu

D1 Time Travel 7 ngày cho lỗi thường. Mỗi ngày export D1 ra R2 private; mỗi tuần chép export và bản gốc media về PC owner
(rồi NAS). Khôi phục làm thử một lần trước khi mở CMS cho nhân viên.

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Data | `src/site/content/*.json` | File chiếu R3; build tĩnh đọc như hiện tại |
| Binding | `DB` (D1, `apac`), `MEDIA_ORIGINALS`, `MEDIA_PUBLIC` (R2) | Chỉ ở admin Worker; khai ở slice Storage |
| Secret | `CMS_BOOTSTRAP_OWNER`, `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, service token | R2, R10; không ghi trong repo |
| Header | `Cf-Access-Jwt-Assertion`, `Cf-Access-Authenticated-User-Email`, `Origin` | Đầu vào R2, R8 |
| Endpoint | `/api/admin/<lệnh>` | R8; không có API public |
| Hằng | `BLOCK_TYPES`, `KINDS` | R9; contract frontend sở hữu |

## UI

Admin là [editor](cms-editor.md), không thuộc Design System, không đưa token admin vào route public
([Design System](../../design-system/README.md#dont)). Trang public giữ UI của spec từng trang.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1 | chưa có; cần: bản dựng không có route Worker public, trang mở được khi admin tắt |
| R2, R8 | `pnpm qa:worker:security` kiểm JWT, Origin hôm nay; cần thêm: ma trận quyền, owner cuối |
| R3, R4, R9 | validator dùng chung chạy trên fixture và bản chụp ([test không phụ thuộc nội dung](content-independent-tests.md)) |
| R5 | `pnpm qa:worker:security` (WebP, SVG an toàn); cần thêm: loại, cỡ, poster, alt trùng, orphan |
| R6, R7, R10 | chưa có; cần integration lưu, thùng rác, version lệch, dựng lỗi giữ bản cũ |
| R11 | diễn tập khôi phục, ghi kết quả trong PR slice Storage |

## Code dormant hiện có

Code trên `main` theo decision cũ (SSR từ D1), chưa chạy trên demo. Slice Storage và Publishing xử lý theo bảng:

| Phần | Vị trí | Xử lý |
| --- | --- | --- |
| Kiểm JWT Access, `Origin`, đăng nhập dev loopback | `requireAdmin`, `verifyAccessJwt` trong `src/worker/index.js` | Giữ; đổi allowlist `ADMIN_EMAILS` sang bảng tài khoản R2 |
| Kiểm upload WebP, SVG an toàn | `isWebp`, `isSafeSvg` | Giữ, mở rộng theo R5 |
| Editor Dockview, overlay | `src/admin/` | Giữ; đổi đường lưu sang lệnh R8 ([editor](cms-editor.md)) |
| Render public SSR, `page_edits`, API public, sitemap từ D1, route `/media/*` | `src/worker/index.js`, `content.mjs` | Bỏ (R1) |
| CRUD chung sáu resource, `audit_log` | `src/worker/index.js` | Viết lại theo R7, R8 |
| Migration `0001` tới `0005`, seed 36 product | `src/db/migrations/` | Bỏ; viết `0001` mới theo spec này |
| `wrangler.toml` (`run_worker_first` route public), `scripts/cms/` | gốc repo | Viết lại cho admin Worker |

Chạy local hiện tại: `pnpm cms:dev` dựng site, admin, D1 và R2 giả lập, `wrangler dev` cổng 8788
([editor R9](cms-editor.md#r9-chạy-local-và-ci)); không deploy.

## Gate còn mở

Không activate Worker, nối Wrangler cho CMS, deploy, tạo hay đọc secret, nối domain khi owner chưa duyệt slice tương ứng
([khóa Wrangler](../decisions/wrangler-deferred-until-cms.md)). Gate 1 tới 4 đã đóng ngày 2026-11-15
([decision](../decisions/cms-cloudflare-static-publish.md)); owner mở slice Contract cùng ngày.

Thứ tự slice, mỗi slice owner duyệt gate: Contract (spec này; gate: owner duyệt spec và các mục `[CẦN LÀM RÕ]`),
Storage (migration `0001` mới, bucket, export; gate: migration có snapshot, khôi phục thử, đường lùi), Publishing
(lệnh R8, dựng R10; gate: test contract, security, integration), Public projection (file chiếu R3; gate: bản dựng từ
bản chụp giống bản dựng từ repo, diễn tập rollback). Editor nối API theo [cms-editor](cms-editor.md) sau Publishing.

## Chú thích thuật ngữ

- **Worker**: code Cloudflare chạy ở biên; ở đây chỉ phục vụ admin.
- **D1, R2**: database SQL và kho file của Cloudflare.
- **Access**: lớp đăng nhập Cloudflare đặt trước admin, cấp JWT (token có chữ ký).
- **File chiếu**: file JSON CMS sinh ra cho build tĩnh đọc.
- **Bản chụp**: bộ file chiếu tại một thời điểm, đầu vào của một lần dựng.
- **Preset**: mẫu trang có sẵn bộ khối bắt buộc.
- **Orphan**: object media không còn bản ghi nào dùng.
- **Seat**: một người dùng được tính trong Zero Trust.
- **Slice**: phần việc nhỏ owner mở riêng, có gate duyệt.
