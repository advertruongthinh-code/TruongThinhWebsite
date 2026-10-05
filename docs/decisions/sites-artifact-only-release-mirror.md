---
title: Sites chỉ nhận artifact tĩnh, GitHub giữ source và test
status: superseded
date: 2026-09-24
scope: static website release
supersedes: []
related_specs:
  - ../specs/static-release.md
related_reports: []
superseded_by: cloudflare-workers-static-demo.md
---

# Sites chỉ nhận artifact tĩnh, GitHub giữ source và test

- Status: Superseded bởi
  [`cloudflare-workers-static-demo.md`](cloudflare-workers-static-demo.md)
  ngày 2026-10-03; owner không còn dùng Sites.

## Bối cảnh

GitHub là nguồn chuẩn của website, test, tooling và tài liệu. Website public
chỉ cần output của `pnpm prepare:site`. Đẩy toàn bộ repository vào source Git
nội bộ của Sites khiến release mang theo file không phục vụ website và lẫn
review Git của source với nội dung thực sự được triển khai.

## Quyết định

1. Push repository đầy đủ lên GitHub với các Git/QA gate hiện hành. `tests/`
   tiếp tục được kiểm chứng và lưu phiên bản, nhưng không thuộc website public.
2. Build `.site-output/` từ exact commit GitHub phát hành. Không edit output
   bằng tay; kiểm tra build và các route trước khi đóng gói.
3. Source Git nội bộ của Sites là mirror artifact nối tiếp `main` Sites hiện có.
   Cây của commit mới chỉ có `dist/`, là bản sao chính xác của `.site-output/`,
   và `.openai/hosting.json` với `static.directory` là `dist`. Manifest trong
   repository GitHub vẫn dùng `.site-output` cho local build.
4. Archive upload chỉ có `dist/` và `.openai/hosting.json`. Ghi commit GitHub,
   commit mirror, checksum archive và Sites version vào evidence release; đối
   chiếu cây mirror với archive trước khi save version.
5. Rollback bằng Sites version đã lưu trước đó. Không force-push hoặc xóa lịch
   sử source Git Sites để tạo release mới.

## Hệ quả

- `tests/`, `scripts/`, `docs/`, source asset và repository metadata không đi
  vào source tree mới nhất hoặc archive của Sites; GitHub vẫn giữ tất cả phần
  cần cho sửa lỗi và tái tạo release.
- Commit mirror khác commit GitHub, nên release evidence phải giữ ánh xạ hai
  commit. Một version Sites chỉ được gọi là deploy xong sau khi Sites xác nhận
  version public, không suy ra từ GitHub push hoặc archive tạo thành công.
- Static release không activate Worker, admin, D1, R2 hay Wrangler.

## Chú thích thuật ngữ

- **Artifact**: output đã tạo từ source, dùng để phát hành.
- **Mirror**: source Git nội bộ Sites chứa output và manifest của một release.
- **Release evidence**: bản ghi SHA, kiểm tra và version để truy nguyên phát hành.
- **Rollback**: chọn lại version Sites đã lưu trước đó.
