# Trường Thịnh browser smoke suite

`site.e2e.cjs` chạy Chromium thật bằng Playwright, không cần test runner riêng. Bộ
test bao phủ 5 route ở 5 viewport, kiểm tra tải ảnh sau khi cuộn từng bước, lỗi
console/network, overflow ngang và các interaction chính. `worker-contract.cjs`
kiểm tra Worker raw SSR 10 locale routes, redirect 308, sitemap/robots và các
reject security của admin/upload.

## Chạy chuẩn

```powershell
$state = Join-Path $env:TEMP "truong-thinh-worker-state"
node node_modules/wrangler/bin/wrangler.js d1 migrations apply truong-thinh-cms --local --persist-to $state
node node_modules/wrangler/bin/wrangler.js dev --local --port 8787 --persist-to $state
```

Trong terminal khác:

```powershell
$env:BASE_URL = "http://127.0.0.1:8787"
node tests/worker/worker-contract.cjs
node tests/site/site.e2e.cjs
```

The static release can run Worker trust-boundary fixtures without D1:

```powershell
node tests/worker/worker-contract.cjs --security-only
```

The default Worker contract also checks seeded CMS catalogs and therefore
belongs to the deferred CMS phase.

Mặc định Worker contract dùng `http://127.0.0.1:8787`. Có thể đổi server:

```bash
BASE_URL=http://127.0.0.1:8080 node tests/site/site.e2e.cjs
```

PowerShell:

```powershell
$env:BASE_URL = "http://127.0.0.1:8080"
node tests/site/site.e2e.cjs
```

## Chạy bằng runtime project-local

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/tooling/run-playwright.ps1 -Suite full
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/tooling/run-playwright.ps1 -Suite smoke
```

Không chạy `npx` với package chưa khóa. Playwright và ba browser engine dùng
đúng version trong `package.json`/lockfile và `.tooling/browsers`. Smoke artifacts
mặc định ghi vào `%TEMP%/truong-thinh-playwright-smoke` để không kích hoạt
Wrangler asset watcher trong lúc test.

## Kết quả

- Báo cáo mới nhất: `tests/site/reports/latest.json`
- Ảnh chụp khi thất bại: `tests/site/reports/failures/`
- Exit code `0` khi toàn bộ check đạt; `1` nếu có bất kỳ failure nào.
