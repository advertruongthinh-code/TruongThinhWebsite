---
title: CMS trên Cloudflare, xuất bản ra trang tĩnh
status: proposed
date: 2026-11-14
scope: CMS phase
tags: [cms, cloudflare, security]
supersedes: []
related_specs: [../specs/cms.md, ../specs/cms-editor.md, ../specs/static-release.md]
related_reports: []
---

# CMS trên Cloudflare, xuất bản ra trang tĩnh

## Context

Điều kiện (3) và (4) để mở CMS ([cms.md](../specs/cms.md#điều-kiện-mở-cms-phase)): kiểm tài liệu chính thức về provider,
rồi chốt provider, storage, schema và ranh giới bảo mật. Ý định owner: Cloudflare gói free, bảo mật là yêu cầu chính, site
tĩnh luôn là đường lùi, khách không chạm Worker hay database (2026-10-12, giữ ở 2026-10-26); khoảng 50 bài đăng hoặc sửa
mỗi tuần, khoảng 10 tài khoản.

Code dormant trên `main` đi hướng khác: Worker chạy trước mọi trang public, đọc D1 mỗi lượt xem, trả 404 hoặc 503 khi D1
thiếu hay lỗi ([cms.md R3](../specs/cms.md#r3-render-trang-locale-và-nội-dung-d1)), theo decision cũ
[D1 SSR ưu tiên](d1-ssr-static-fallback.md). Hướng đó trái ý định trên và tiêu hạn mức Worker gói free cho mọi lượt xem.

## Decision

Dùng Cloudflare Workers, D1, R2 và Access gói free. Khách chỉ nhận file tĩnh; CMS là một Worker admin riêng sau Access,
lưu nội dung vào D1 và media vào R2, xuất bản bằng một lần dựng site tĩnh từ bản chụp nội dung đã duyệt.

- **Public**: Workers static assets như demo hiện tại ([decision demo](cloudflare-workers-static-demo.md)), không
  `run_worker_first` cho route public, không đọc D1. CMS hỏng thì site vẫn chạy bản dựng gần nhất.
- **Admin**: hostname riêng (`admin.<domain>`), một ứng dụng Access (đăng nhập Google, danh sách email), Worker kiểm lại
  JWT Access, email allowlist, `Origin` cho request ghi ([defense in depth](admin-defense-in-depth.md), giữ code R5 hiện có).
- **Storage**: D1 giữ nội dung có cấu trúc, nháp, lịch sử, nhật ký thao tác, tài khoản và vai trò; vị trí `apac`. R2 bucket
  private giữ bản gốc media; biến thể public sinh khi xuất bản.
- **Media public**: phục vụ từ R2 qua custom domain (`media.<domain>`), không đóng vào static assets, vì giới hạn 20.000 file
  mỗi version (bản dựng hiện có 9.623 file, 8.528 là ảnh).
- **Xuất bản**: admin ghi bản chụp đã duyệt rồi gọi lần dựng trên workflow `Deploy demo` hiện có (GitHub Actions), lấy bản
  chụp qua Access service token; dựng lỗi thì không deploy, site giữ bản cũ; rollback bằng deployment trước của Workers.
- **Schema**: viết lại migration từ đầu (`0001` mới) theo contract slice Contract; năm migration cũ chưa áp lên D1 thật nào,
  không cần giữ.
- **Sao lưu**: D1 Time Travel 7 ngày (gói free) cộng export hằng ngày ra R2 và sao lưu tuần về PC owner.

## Alternative đã cân nhắc

| Alternative | Lợi ích | Lý do reject |
| --- | --- | --- |
| Giữ D1 SSR như code dormant | Có sẵn khoảng 1.500 dòng Worker | Mỗi lượt xem tốn request Worker (100.000/ngày gói free) và CPU 10 ms; D1 lỗi làm trang 503; trái ý định "khách không chạm database" |
| Lưu nội dung thẳng vào Git (CMS commit JSON) | Không cần D1; Git là SSoT sẵn | Cần token ghi repo trong Worker; nháp, lịch sử, phân quyền 10 người phải tự dựng trên commit; ảnh nhị phân làm repo phình |
| Dựng bằng Workers Builds thay GitHub Actions | Không cần GitHub | Thêm một đường build thứ hai; demo đã deploy bằng GitHub Actions, giữ một đường |
| Đóng ảnh vào static assets như hiện tại | Không thêm hostname | Chạm 20.000 file mỗi version khi CMS thêm khoảng 1.200 ảnh (mỗi ảnh khoảng 9 biến thể) |

## Hệ quả

### Tích cực

- Site public không phụ thuộc CMS; CMS lỗi, D1 hết hạn mức hay đang sửa không làm hỏng trang khách xem.
- Chi phí dự kiến 0 USD: request vào static assets miễn phí, admin vài nghìn request mỗi ngày, D1 và R2 nằm xa dưới hạn mức.
- Dùng lại code đã có: kiểm JWT Access, kiểm upload WebP và SVG, nhật ký thao tác, editor Dockview và overlay.

### Tiêu cực hoặc cost đã chấp nhận

- Bài mới lên site sau một lần dựng (vài phút), không tức thì.
- Bỏ đường public SSR trong `src/worker/index.js`, API public, sitemap từ D1, năm migration cũ và seed; viết lại `wrangler.toml`.
- Media chuyển sang R2 custom domain: phải nối domain lên Cloudflare (việc owner) và đổi đường dẫn ảnh trong build.
- Access gói free có hạn mức người dùng; quá thì phải trả theo người.

## Evidence

Kiểm lại trang chính thức ngày 2026-11-14 (ngày cập nhật trang trong ngoặc):

- Workers Free: 100.000 request mỗi ngày, CPU 10 ms mỗi request, 20.000 file static assets mỗi version, 25 MiB mỗi file
  ([limits](https://developers.cloudflare.com/workers/platform/limits/), 2026-11-13).
- D1 Free: 5 triệu dòng đọc, 100.000 dòng ghi mỗi ngày, 500 MB mỗi database, 5 GB mỗi account, 10 database, 50 query mỗi
  invocation ([pricing](https://developers.cloudflare.com/d1/platform/pricing/), [limits](https://developers.cloudflare.com/d1/platform/limits/), 2026-10-30).
  Từ 2026-09-01 vượt hạn mức thì query lỗi tới 00:00 UTC, dữ liệu không mất
  ([changelog](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/)).
- D1 sao lưu: Time Travel 7 ngày trên Free; `wrangler d1 export` chặn request khác khi chạy, không export bảng ảo (FTS5)
  ([limits](https://developers.cloudflare.com/d1/platform/limits/), [D1 docs](https://developers.cloudflare.com/d1/llms-full.txt)).
- D1 vị trí: location hint có `apac`, không bảo đảm; jurisdiction chỉ đặt lúc tạo
  ([data location](https://developers.cloudflare.com/d1/configuration/data-location/), 2026-10-02).
- R2 Free mỗi tháng: 10 GB, 1 triệu thao tác loại A, 10 triệu loại B, egress miễn phí; vượt: 0,015 USD mỗi GB-tháng, 4,50 USD
  mỗi triệu loại A, 0,36 USD mỗi triệu loại B ([pricing](https://developers.cloudflare.com/r2/pricing/), 2026-10-30).
- Access: 50 service token, 50 identity provider, 500 ứng dụng; người dùng chiếm một seat khi đăng nhập lần đầu, hết seat thì
  người mới bị chặn ([account limits](https://developers.cloudflare.com/cloudflare-one/account-limits/), 2026-11-05;
  [seat management](https://developers.cloudflare.com/cloudflare-one/team-and-resources/users/seat-management/), 2026-05-01).
  Số seat gói Zero Trust Free: lần kiểm 2026-10-26 ghi 50; lần này trang giá không đọc được từ cloud (unknown, kiểm lại
  trên dashboard khi tạo Zero Trust).
- Số file bản dựng: `pnpm prepare:site` trên `main` 6a54278, đếm `.site-output` (9.623 file, 935 MB).

## Follow-up

- Owner duyệt decision này (gate 4) và trả lời gate 2: vai trò, review, domain, email admin.
- Slice Contract: viết lại [cms.md](../specs/cms.md) theo decision, đổi status decision [D1 SSR](d1-ssr-static-fallback.md) thành superseded.
- Slice Storage: migration `0001` mới, bucket R2 private, export hằng ngày, đo thời gian một lần dựng.
- Khi owner mở slice đầu (gate 5): pin lại Wrangler theo [khóa Wrangler](wrangler-deferred-until-cms.md).

## Chú thích thuật ngữ

- **Decision**: lựa chọn có hiệu lực sau khi được chấp nhận.
- **SSR**: Worker dựng HTML ở mỗi lượt xem.
- **Static assets**: file dựng sẵn Cloudflare phục vụ thẳng, không chạy code.
- **Bản chụp**: nội dung đã duyệt tại một thời điểm, đầu vào của một lần dựng.
- **Service token**: thẻ máy của Access cho tiến trình không có người đăng nhập.
- **Seat**: một người dùng được tính phí trong Zero Trust.
- **Time Travel**: khôi phục D1 về một phút bất kỳ trong khoảng giữ lại.
- **Location hint**: gợi ý vùng đặt database chính.
- **Custom domain**: tên miền riêng trỏ vào R2 hay Worker.
