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

## Migration D1

- Migration sau `0001` chỉ thêm (bảng, cột, index), không xóa, không đổi tên, không đổi kiểu, để Worker bản cũ vẫn chạy trên lược đồ mới.
- PR có file mới trong `src/db/migrations/` mở kèm nhãn `hold` (Automerge không tự merge). Thread áp migration bằng tay ở gate của chặng (`pnpm demo:wrangler d1 migrations apply truong-thinh-cms --remote --config wrangler.toml`) trước khi merge code cần lược đồ mới, rồi gỡ nhãn.
- CI không áp migration: token CI không có quyền D1.

## Hạn dùng credential

Không ghi giá trị. Thread tạo credential điền dòng của nó; card Notion nhắc gia hạn 30 ngày trước hạn sớm nhất. Service token hết hạn thì mọi lần dựng từ bản chụp dừng.

| Credential | Tạo ở | Hết hạn | Gia hạn ở |
| --- | --- | --- | --- |
| Service token Access CMS (`tt-cms-ci`) | S4 bước 8 | 2027-11-23 | Zero Trust, Access, Service Auth |
| Token R2 bucket public (`tt-r2-public-write`) | S4 bước 5 | Không hết hạn | R2, Manage API tokens |
| Token CI Cloudflare "Edit Cloudflare Workers" (environment `cloudflare-deploy`) | S4 bước 5 | Không hết hạn | Cloudflare, API Tokens |
