# Runbook kho dữ liệu CMS

Ghi lại cách dựng D1, R2, Access và Worker admin `truong-thinh-admin` của CMS ([cms.md](../specs/cms.md) R1, R2; plan task S4). Mọi lệnh chạy ở gốc repo trên PC của owner, có `CLOUDFLARE_API_TOKEN` và `CLOUDFLARE_ACCOUNT_ID` trong môi trường; không in hai biến đó. File này không ghi email, AUD, id ứng dụng, id chính sách, id tài khoản hay `database_id` (id database chỉ nằm trong `wrangler.toml`).

## Dựng lần đầu (S4)

| Bước | Ai | Việc | Kết quả |
| --- | --- | --- | --- |
| 1 | Agent | Xóa `.wrangler/` trong worktree (trạng thái local cũ còn nhớ `0001` cũ) | 2026-11-23: worktree mới, không có `.wrangler/` |
| 2 | Agent | `pnpm demo:wrangler d1 create truong-thinh-cms --location apac`; ghi `database_id` vào `wrangler.toml` | 2026-11-23: database cùng tên đã có từ 2026-11-01 và rỗng, dùng lại. Token PC cần thêm quyền D1 Edit, Workers R2 Storage Edit, Workers Scripts Edit |
| 3 | Agent | `pnpm demo:wrangler r2 bucket create truong-thinh-media-originals`; `pnpm demo:wrangler r2 bucket create truong-thinh-media-public` | 2026-11-23: owner bật gói R2 (0 USD, trả theo mức dùng vượt miễn phí) trước khi tạo được bucket |
| 4 | Owner | R2, bucket `truong-thinh-media-public`, Settings: bật Public Development URL (`r2.dev`); CORS Policy cho phép `GET` và header `Range` từ `https://truongthinhads.vn`, `https://staging.truongthinhads.vn` và origin Worker admin | 2026-11-23: xong |
| 5 | Owner | R2, Manage API tokens: tạo token "Object Read & Write" chỉ cho bucket public; nhập secret GitHub `R2_PUBLIC_ACCESS_KEY_ID`, `R2_PUBLIC_SECRET_ACCESS_KEY`, `R2_ENDPOINT`. GitHub Settings, Environments: tạo `cloudflare-deploy`, Deployment branches chỉ `main`. Cloudflare, API Tokens: tạo token CI mới với đúng quyền của token deploy đang dùng (gồm Workers AI), không có quyền D1; nhập `CLOUDFLARE_API_TOKEN` (token mới) và `CLOUDFLARE_ACCOUNT_ID` làm secret của environment. Hai secret mức repo cùng tên giữ tới hết bước 9 | 2026-11-23: thay vì token mới, owner Roll token CI "Edit Cloudflare Workers" (đã không có quyền D1) và đặt cùng giá trị cho secret repo và secret environment; bước 9 chỉ còn xóa hai secret mức repo |
| 6 | Agent | `pnpm demo:wrangler d1 migrations apply truong-thinh-cms --remote --config wrangler.toml`; `pnpm cms:seed --out .tmp/cms/seed.sql`; `pnpm demo:wrangler d1 execute truong-thinh-cms --remote --file .tmp/cms/seed.sql --config wrangler.toml` | 2026-11-23: seed ghi 5900 dòng; advertising-card 205, client-logo 12, contact 1, hero-slide 25, home-projects 1, media 553, menu 1, news 8, page-copy 3, project 18 |
| 7 | Agent | `pnpm prepare:site && node scripts/cms/build-admin.mjs && pnpm demo:wrangler deploy --config wrangler.toml` | 2026-11-23: version `077d3c5d`, Cron gắn |
| 8 | Owner | Zero Trust, Access, Applications: ứng dụng "Người dùng" cho hostname `workers.dev` của Worker admin, chính sách Allow một email owner; ứng dụng "Máy" cho hai path `/api/admin/snapshot`, `/api/admin/media-original` với chính sách Service Auth; tạo một service token; trong ứng dụng Access của `staging.truongthinhads.vn` thêm chính sách Service Auth chỉ gồm token đó, giữ nguyên chính sách Allow. Gõ secret Worker bằng `pnpm demo:wrangler secret put <tên> --config wrangler.toml`: `CMS_BOOTSTRAP_OWNER`, `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, `ACCESS_SERVICE_AUD`, `SERVICE_TOKEN_CLIENT_ID`. Nhập secret GitHub `CMS_ACCESS_CLIENT_ID`, `CMS_ACCESS_CLIENT_SECRET`; biến repo `CMS_ADMIN_ORIGIN`, `R2_PUBLIC_BUCKET` = `truong-thinh-media-public` | 2026-11-23: xong; hai secret Worker `SERVICE_TOKEN_CLIENT_ID`, `CMS_BOOTSTRAP_OWNER` owner nhập trên dashboard (Variables and Secrets, loại Secret) |
| 9 | Agent, owner | Kiểm ở mục dưới; merge PR; CI deploy staging và `deploy-admin` xanh; owner xóa hai secret mức repo `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, thu hồi token CI cũ; agent dispatch `ci.yml` trên `main` một lần nữa | |

Trong lúc làm bước 5 tới hết bước 9 không chạy `release.yml`.

Environment `cloudflare-deploy` chỉ giữ được token deploy khi hai secret mức repo cùng tên đã xóa ở bước 9; trước đó workflow của nhánh nào cũng đọc được bản mức repo. `CMS_ACCESS_CLIENT_ID`, `CMS_ACCESS_CLIENT_SECRET` đang ở mức repo (người đẩy được nhánh trong repo đọc được); P5 chuyển hai secret này vào environment chỉ nhánh `main` khi workflow dựng nội dung dùng chúng.

## Kiểm

| Kiểm | Kết quả |
| --- | --- |
| `curl -sI -A tt-cms-ci <admin>/api/admin/build-status` không JWT trả 302 hoặc 403 | 302 về trang đăng nhập Access |
| Owner đăng nhập rồi mở URL đó thấy `{"paused":false}` | |
| `pnpm demo:wrangler d1 execute truong-thinh-cms --remote --command "SELECT role, status FROM accounts" --config wrangler.toml` in một dòng `owner`, `active` | |
| Service token gọi `build-status` (path người) trả 403 | 403 (bước cuối của `cms-check.yml`) |
| `cms-check.yml` chạy trên nhánh PR: mọi lần gọi `200` | Bản chụp nguyên khối: 30/30 `200`, 1,26 MB. Bản chia trang (version `a52db0af`): 48/48 `200` |
| Dashboard Worker, Invocation Statuses không có "Exceeded CPU Time Limits"; CPU lớn nhất của `/api/admin/snapshot` trong Workers Logs dưới 8 ms | Bản nguyên khối: trung bình 17 ms, lớn nhất 38 ms, không đạt; owner chọn chia nhỏ (Q12 cách 1). Bản chia trang: lớn nhất 6 ms (trang `advertising-card` 1), mục lục 5 ms, trung bình 2,2 ms; không có "Exceeded CPU Time Limits": đạt |
| URL preview theo version của Worker admin không trả 200 | |
| Sau merge: `curl -sI https://staging.truongthinhads.vn/vi/` trả 302; `curl -sI https://truongthinhads.vn/vi/` trả 200 | Trước merge: 302 và 200 |

Số seat Access đang dùng: 1 (owner), 2026-11-23 (`cms.md` R2).

## Đường lùi

Gỡ Worker admin: `pnpm demo:wrangler delete --config wrangler.toml`, bỏ job `deploy-admin` khỏi `ci.yml`. Xóa D1 và hai bucket trên dashboard khi không cần dữ liệu. Tắt hai ứng dụng Access và chính sách Service Auth của staging. Site thật và staging không đọc D1 hay R2 ở chặng S nên không đổi.

Không bật được Access trên `workers.dev`: dừng, chạy lệnh gỡ Worker ở trên và báo owner; phương án thay là nối `admin.truongthinhads.vn` (owner duyệt riêng).

`deploy-admin` lỗi quyền vì token không có quyền D1: không thêm quyền đoán; báo owner dòng lỗi. Hai phương án: thêm quyền D1 Read cho token của environment, hoặc trả secret về mức repo.

## Sao lưu và khôi phục (S5)

Ba lớp, từ gần tới xa ([cms.md](../specs/cms.md) R6):

| Lớp | Chạy | Giữ | Nơi |
| --- | --- | --- | --- |
| D1 Time Travel | Cloudflare tự làm | 7 ngày (D1 Free) | Trong D1 |
| Export hằng ngày | Cron Worker admin lúc 18:00 UTC (01:00 giờ Việt Nam), `src/worker/backup.mjs`; lỗi hoặc lỡ thì phút 33 mỗi giờ chạy lại tới khi có file của ngày UTC đó | 30 ngày (dọn lúc 18:05 UTC) | Bucket private `truong-thinh-media-originals`, key `backups/d1/<YYYY-MM-DD>.sql` |
| Bản sao tuần | Task Scheduler trên PC owner, `scripts/cms/backup-pull.ps1` (chép thêm, không xóa file đã có) | Theo ổ PC và NAS | `E:\TruongThinhBackup\cms\originals`, rồi `<NAS>\cms-originals` |

`GET /api/admin/build-status` trả `backupAt` (giờ upload của file export mới nhất, hoặc `null`). Quá 2 ngày là export đang hỏng: xem Workers Logs của `truong-thinh-admin`, dòng `exportDatabase`.

### Secret của export

Owner nhập một lần; agent không đọc giá trị. `D1_DATABASE_ID` là biến thường trong `wrangler.toml` (test giữ nó bằng `database_id`).

1. Trên PC: `pnpm token:roll d1-export` (mục [Token tự động](#token-tự-động)) tạo `tt-d1-export` (D1 Write, 1 năm) và đặt secret Worker `D1_EXPORT_TOKEN`.
2. Workers & Pages, `truong-thinh-admin`, Settings, Variables and Secrets, Add: `Secret`, tên `CF_ACCOUNT_ID`, giá trị là Account ID (cột phải trang Workers & Pages). Bấm Deploy.

### Khôi phục

- Lỗi trong 7 ngày gần: `pnpm demo:wrangler d1 time-travel info truong-thinh-cms --config wrangler.toml` xem bookmark hiện tại; `pnpm demo:wrangler d1 time-travel restore truong-thinh-cms --timestamp=<ISO> --config wrangler.toml` đưa database về thời điểm đó (lệnh in bookmark cũ để quay lại nếu chọn sai).
- Cũ hơn 7 ngày, hoặc database mất: lấy file export rồi nạp vào database mới theo đúng các bước diễn tập dưới (bước a tới c), đổi `database_id` trong `wrangler.toml` sang database mới, merge để `deploy-admin` deploy lại.
- File export chứa bảng `accounts` (email): không in, không đính vào PR hay chat; xóa `.tmp/cms/restore.sql` khi xong.

### Diễn tập khôi phục

Chạy trên PC sau lần export thật đầu tiên:

| Bước | Lệnh | Thời gian | Kết quả |
| --- | --- | --- | --- |
| a | `pnpm demo:wrangler r2 object get truong-thinh-media-originals/backups/d1/<ngày>.sql --file .tmp/cms/restore.sql --remote`; kiểm cỡ file bằng `stat`, không in nội dung | | |
| b | `pnpm demo:wrangler d1 create truong-thinh-cms-restore --location apac` | | |
| c | `pnpm demo:wrangler d1 execute truong-thinh-cms-restore --remote --file .tmp/cms/restore.sql` | | |
| d | Trên cả hai database: `SELECT COUNT(*)` từng bảng của `0001_cms.sql` và `SELECT SUM(LENGTH(data)) FROM records`, so từng số | | |
| e | `pnpm demo:wrangler d1 delete truong-thinh-cms-restore`; xóa `.tmp/cms/restore.sql` | | |
| f | `pnpm demo:wrangler d1 time-travel info truong-thinh-cms --config wrangler.toml` in được bookmark | | |

### Bản sao tuần về PC

Owner làm một lần trên PC (agent không đăng ký thay):

1. R2, Manage API tokens: tạo token "Object Read only" chỉ cho bucket `truong-thinh-media-originals`.
2. `rclone config`: remote tên `r2cms`, kiểu S3, provider Cloudflare, dán Access Key ID, Secret Access Key và endpoint của token đó; đặt mật khẩu cho file cấu hình (mục `s` của `rclone config`). Thư mục sao lưu trên PC và NAS chứa email tài khoản: không chia sẻ.
3. `schtasks /create /tn "TruongThinh CMS backup" /sc weekly /d SUN /st 02:00 /tr "pwsh -NoProfile -File E:\TruongThinh-Website\scripts\cms\backup-pull.ps1 -NasPath <đường dẫn NAS>"`

## Token dispatch GitHub (P4)

Owner nhập một lần; agent không đọc giá trị. Admin Worker dùng token này để gọi `ci.yml` (lần dựng nội dung) và `cms-variants.yml`.

1. GitHub, Settings, Developer settings, Personal access tokens, Fine-grained tokens, Generate new token: tên `tt-cms-dispatch`; Expiration 1 năm; Repository access: Only select repositories, chọn repo `TruongThinhWebsite`; Permissions, Repository permissions: Actions, Read and write. Generate, chép token.
2. Cloudflare, Workers & Pages, `truong-thinh-admin`, Settings, Variables and Secrets, Add: Type `Secret`, tên `GITHUB_ACTIONS_TOKEN`, dán token, Deploy.
3. Cách khác trên PC: `pnpm token:roll cms-dispatch`, dán token và ngày hết hạn khi được hỏi; lệnh đặt secret Worker và ghi hạn vào sổ.
4. Kiểm: mở `status.html`, `tokenExpiresAt` có ngày hết hạn và `runs` không phải `null`. Ghi ngày hết hạn vào bảng dưới; đổi token trước hạn bằng cùng các bước.
5. Lúc tạm dừng xuất bản, các lần lưu không gọi dựng và Cron không gọi lại. Bỏ tạm dừng xong, bấm "Dựng lại" trên `status.html` để staging nhận nội dung đã lưu.

## Tài khoản và Access (P7)

Panel "Tài khoản" của editor (menu Bảng, chỉ owner) thêm người, đổi vai trò, khóa và mở lại; Worker tự sửa danh sách email trong chính sách Access của app admin. Owner nhập một secret một lần; agent không đọc giá trị.

1. Cloudflare, My Profile, API Tokens, Create Token, Custom token: tên `tt-cms-access`; Permissions: Account, Access: Apps and Policies, Edit; Account Resources: tài khoản của site; TTL 1 năm. Chép token.
2. Zero Trust, Access controls, Policies, Reusable policies, policy "CMS admin owner" (gắn vào app `admin.truongthinhads.vn`): id policy nằm trong URL trang sửa policy, ghi ở `ACCESS_POLICY_ID` trong `[vars]` của `wrangler.toml` (không bí mật). Worker sửa policy này qua API reusable policy, nên mọi app gắn policy này đều đổi theo.
3. Cloudflare, Workers & Pages, `truong-thinh-admin`, Settings, Variables and Secrets: secret `ACCESS_API_TOKEN`: trên PC owner gõ `pnpm token:roll cms-access` (tạo token và đặt secret, không ai dán tay).
4. Kiểm: thêm một email thử ở panel Tài khoản, thấy email đó trong policy; khóa nó, email biến khỏi policy. Ghi ngày hết hạn token vào bảng dưới.
5. Thiếu secret hoặc API lỗi: thêm và mở lại báo "Chưa đổi được quyền đăng nhập", không đổi gì; khóa vẫn chặn ngay trong CMS, dòng đó có "Thử lại". Cron 18:05 UTC so policy với bảng tài khoản và ghi lệch vào `access_drift` (panel báo số email lệch), không tự sửa.

## Quay staging về bản cũ (P6)

1. `status.html`, mục "Quay về bản cũ": mười lần deploy gần nhất (thời điểm, commit, bản chụp hoặc "từ repo"); bấm "Quay về bản này" ở dòng cần về, xác nhận trong hộp thoại. Chỉ owner; staff nhận "Chỉ owner".
2. Worker đặt `publish_paused = '1'` rồi gọi `rollback.yml` (`wrangler rollback`, token Cloudflare chỉ nằm trong secret GitHub). Gọi GitHub lỗi thì trang báo 502, vẫn tạm dừng: bấm lại.
3. Trong lúc tạm dừng, lưu không gọi dựng và `snapshot` trả 423. Xong việc, bấm "Tiếp tục đăng": bỏ tạm dừng và gọi một lần dựng nội dung.
4. Giới hạn phần 1: rollback chỉ đổi staging, site thật không đổi. Khi `CMS_SNAPSHOT_URL` rỗng, lần merge code kế tiếp vẫn deploy từ repo và đè bản đã quay về. Sau rollback, `build-info.json` của staging là của bản cũ, nên lần dựng nội dung kế tiếp dùng commit cũ đó tới khi có một lần merge code.
5. Run rollback hiện "bị hủy" (một deploy hay rollback khác chen vào): bấm lại.
6. Run rollback đỏ ở bước `grep`: bản chọn đã ra khỏi 10 deployment gần nhất của Wrangler (mỗi lần rollback hay deploy không có dấu cũng chiếm một chỗ). Tự đăng vẫn tạm dừng; chọn một bản mới hơn rồi bấm lại.

## Migration D1

- Migration sau `0001` chỉ thêm (bảng, cột, index), không xóa, không đổi tên, không đổi kiểu, để Worker bản cũ vẫn chạy trên lược đồ mới.
- PR có file mới trong `src/db/migrations/` mở kèm nhãn `hold` (Automerge không tự merge). Thread áp migration bằng tay ở gate của chặng (`pnpm demo:wrangler d1 migrations apply truong-thinh-cms --remote --config wrangler.toml`) trước khi merge code cần lược đồ mới, rồi gỡ nhãn.
- CI không áp migration: token CI không có quyền D1.

## Token tự động

Script `scripts/tooling/tokens.mjs` chạy trên PC, không dùng AI. Giá trị token chỉ đi qua bộ nhớ và stdin của `wrangler`, `gh`; không in, không ghi file trừ token gốc.

1. Owner tạo một lần token gốc: Cloudflare, My Profile, API Tokens, Create Token, template "Create additional tokens", Use template; tên `tt-token-admin`; TTL 1 năm; Continue, Create, Copy. Không thêm quyền khác.
2. Owner chạy `pnpm token:setup`, dán token (ẩn). Script kiểm token rồi lưu ở `%USERPROFILE%\.truongthinh\cf-token-admin`; secret guard chặn agent đọc file này.
3. `pnpm token:roll <tên>`: tạo token mới đúng quyền, hạn 1 năm, đặt vào đích, xóa token cũ cùng tên. Đặt đích lỗi thì xóa token mới, giữ token cũ. Cần `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` (cho `wrangler`) và `gh auth login` trên PC.
4. `pnpm token:list`: mọi token Cloudflare của owner kèm hạn, cộng sổ `%USERPROFILE%\.truongthinh\token-registry.json` (token nhập tay), xếp theo hạn.

| Tên | Token | Đích |
| --- | --- | --- |
| `d1-export` | `tt-d1-export`, D1 Write | Secret Worker `D1_EXPORT_TOKEN` |
| `cms-access` | `tt-cms-access`, Access: Apps and Policies Write | Secret Worker `ACCESS_API_TOKEN` |
| `ci-deploy` | `tt-ci-deploy`, chép quyền của "Edit Cloudflare Workers" | Secret `CLOUDFLARE_API_TOKEN` của environment `cloudflare-deploy`; xóa biến cùng tên trong environment đó. Token "Edit Cloudflare Workers" cũ không tự xóa: owner thu hồi sau khi kiểm token PC không dùng nó |
| `cms-dispatch` | GitHub fine-grained `tt-cms-dispatch` (GitHub không có API tạo token này) | Owner tạo theo mục trên, dán vào lệnh; secret Worker `GITHUB_ACTIONS_TOKEN` |

Không tự động: service token Access, token R2 (S3), token gốc. Thêm token mới: thêm một dòng vào `TOKENS` trong script.

## Hạn dùng credential

Không ghi giá trị. Hạn thật của token Cloudflare và token nhập tay: `pnpm token:list`. Thread tạo credential điền dòng của nó; card Notion nhắc gia hạn 30 ngày trước hạn sớm nhất. Service token hết hạn thì mọi lần dựng từ bản chụp dừng.

| Credential | Tạo ở | Hết hạn | Gia hạn ở |
| --- | --- | --- | --- |
| Service token Access CMS (`tt-cms-ci`) | S4 bước 8 | 2027-11-23 | Zero Trust, Access, Service Auth |
| Token R2 bucket public (`tt-r2-public-write`) | S4 bước 5 | Không hết hạn | R2, Manage API tokens |
| Token CI Cloudflare "Edit Cloudflare Workers" (environment `cloudflare-deploy`) | S4 bước 5 | Không hết hạn | Cloudflare, API Tokens |
| Token export D1 (`tt-d1-export`, secret Worker `D1_EXPORT_TOKEN`) | S5 | 1 năm sau ngày tạo (ghi ngày khi tạo) | `pnpm token:roll d1-export` |
| Token gốc (`tt-token-admin`, file trên PC) | Token tự động | 1 năm sau ngày tạo | Cloudflare, API Tokens, rồi `pnpm token:setup` |
| Token R2 chỉ đọc bucket private (rclone `r2cms` trên PC) | S5 | | R2, Manage API tokens |
| Token GitHub fine-grained (`tt-cms-dispatch`, secret Worker `GITHUB_ACTIONS_TOKEN`) | P4 | 1 năm sau ngày tạo (ghi ngày khi tạo) | GitHub, Developer settings, Fine-grained tokens |
| Token Access API (`tt-cms-access`, secret Worker `ACCESS_API_TOKEN`) | P7 | 1 năm sau ngày tạo (ghi ngày khi tạo) | Cloudflare, API Tokens |
