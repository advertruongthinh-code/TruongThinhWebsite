# Bộ browser smoke của Trường Thịnh

`site.e2e.cjs` chạy Chromium thật bằng Playwright, không cần test runner riêng. Bộ test
bao phủ 5 route ở 5 viewport, kiểm tra tải image sau khi cuộn từng bước, lỗi
console/network, horizontal overflow và interaction chính. `worker-contract.cjs` kiểm
tra Worker raw SSR 10 locale route, redirect 308, sitemap/robots và security
reject của admin/upload.

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

Static release có thể chạy Worker trust-boundary fixture mà không cần D1:

```powershell
node tests/worker/worker-contract.cjs --security-only
```

Worker contract mặc định cũng kiểm tra CMS catalog đã seed, vì vậy nó thuộc CMS
phase được defer.

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
đúng version trong `package.json`/lockfile và `.tooling/browsers`. Smoke artifact
mặc định ghi vào `%TEMP%/truong-thinh-playwright-smoke` để không kích hoạt
Wrangler asset watcher trong lúc test.

## Kết quả

- Report mới nhất: `tests/site/reports/latest.json`
- Ảnh chụp khi fail: `tests/site/reports/failures/`
- Exit code `0` khi toàn bộ check đạt; `1` nếu có bất kỳ failure nào.

## Release evidence

Playwright chỉ là regression layer có thể lặp lại. Mọi UI change và website
release còn cần một live interaction pass bằng Computer Use và inspection cùng
route bằng Chrome DevTools MCP. Ghi route, viewport, visible result,
console/network finding, accessibility tree result và screenshot evidence trong
dated verification report. Nếu một trong bốn nhóm evidence bắt buộc không chạy
được, release bị block thay vì đánh dấu pass.

## Chú thích thuật ngữ

- **Smoke suite**: nhóm test nhanh cho đường đi và behavior chính.
- **Trust boundary fixture**: fixture kiểm tra ranh giới input/quyền.
- **Seeded catalog**: dữ liệu catalog được nạp trước cho test.
- **Regression layer**: lớp test lặp lại để phát hiện thay đổi làm hỏng behavior.
- **Viewport**: vùng browser đang hiển thị.
