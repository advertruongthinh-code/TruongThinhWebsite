# Verification audit

> Snapshot: 2026-07-31. Chỉ ghi kết quả có report/measurement; không suy từ ảnh
> chụp.

## Automated interaction suite

Command:

```powershell
node tests/site.e2e.cjs
```

Report: `tests/reports/latest.json`

| Field | Result |
| --- | --- |
| Generated | `2026-07-30T20:17:54.259Z` |
| Base URL | `http://127.0.0.1:4173` |
| Checks | `48` |
| Passed | `48` |
| Failed | `0` |
| Duration | `213102ms` |

Full Playwright suite: **48/48 pass** tại report ngày 2026-07-30.

Coverage:

- 5 routes × 320, 390, 768, 1024 và 1440px.
- Console, request failures, required images, white `theme-color` và horizontal
  overflow.
- Direct header/full-menu routes, route transition, Back/Forward và BFCache
  cleanup.
- VI/EN persistence; title, alt, aria trên cả năm route.
- Menu open/close/route click/focus return tại 390 và 1440px.
- Process order, portal alignment, advertising filter, commercial gallery.
- Home text masks và project hover giữ copy nhìn thấy.
- `prefers-reduced-motion`.

## Chrome DevTools

### Interaction và text mask

Các check dưới đây là runtime inspection có mục tiêu, không thay thế audit
performance hoặc accessibility đầy đủ.

Home desktop `1440×900`:

- Ở mẫu sớm `250ms`: `coverageComplete=false`, `copyVisible=false`,
  `focusInside=true`; đây là trạng thái shutters chưa chạy xong.
- Khi timeline ổn định: shutters, nút đóng và focus trong menu đều đạt `true`.
  Đóng menu trả focus về nút hamburger đã mở nó.
- Console không có warning/error/issue; `23/23` request trả `200`.

Mobile `390×844`:

- `/quang-cao/`: motto nằm trong hero, không overflow ngang và được chia động
  thành một dòng render; `--mask-ink-overflow: 3px`,
  `clip-path: inset(-3px 0 0)` và Vietnamese font check đạt `true`.
- `/nha-o/` và `/kinh-doanh/`: motto nằm trong hero, không overflow ngang.
- Navigation-preservation run có `58/58` request trả `200` hoặc `304`; console
  không có warning/error/issue.

### Desktop performance trace

- URL: `/`
- Viewport: `1440×900`
- Throttling: none
- LCP: `206ms`
- TTFB: `3ms`
- LCP render delay: `204ms`
- CLS: `0.00`

### Lighthouse quality

- Accessibility: `100`
- Best Practices: `100`
- SEO: `100`
- Agentic Browsing: `100`
- Audits: `52 passed / 0 failed`

Mobile và desktop đều đạt cùng kết quả. URL kiểm tra:
`http://127.0.0.1:4173/`.

Sau bản sửa contrast/filter và BFCache, audit mobile riêng
`http://127.0.0.1:4173/quang-cao/` cũng đạt `100/100/100/100`,
`51 passed / 0 failed`; console không có error/warning/issue và toàn bộ `24`
request trả thành công.

### Lighthouse Performance

Lighthouse `13.4.1`; mobile mô phỏng `412×823`, CPU `4×`, RTT `150ms`,
`1638.4Kbps`. Ba run cold/current-source:

| UTC | Score | FCP | LCP | TBT | CLS | Speed Index |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `2026-07-30T17:34:02.492Z` | 87 | 1816.3ms | 3904.1ms | 66.0ms | 0.0010 | 1816.3ms |
| `2026-07-30T17:34:53.565Z` | 86 | 1815.3ms | 3928.0ms | 81.5ms | 0.0009 | 1966.4ms |
| `2026-07-30T17:35:23.924Z` | 87 | 1811.6ms | 3885.5ms | 47.5ms | 0.0009 | 1811.6ms |
| **Median** | **87** | **1815.3ms** | **3904.1ms** | **66.0ms** | **0.0009** | **1816.3ms** |

Desktop mô phỏng `1350×940`, CPU `1×`, RTT `40ms`, `10240Kbps`: score `98`,
FCP `563.6ms`, LCP `1017.8ms`, TBT `0ms`, CLS `0.0048`, Speed Index
`787.1ms`.

Mobile LCP là text `Làm chắc.`, không phải request ảnh. Font normal Latin và
Latin-ext đã tải xong trước observed LCP, nên chưa thêm preload thiếu bằng
chứng. Cơ hội lớn nhất Lighthouse đo được là tách/inline critical CSS
(`~850ms` LCP ước tính); chỉ làm sau một A/B audit vì hiện `style.css` là shared
contract cố ý đơn giản.

## Graph and automation checks

Commands:

```powershell
& ".\.tooling\python\Scripts\graphify.exe" extract . --code-only --out .
& ".\.tooling\python\Scripts\graphify.exe" cluster-only . --no-label
& ".\.tooling\python\Scripts\graphify.exe" diagnose multigraph --graph graphify-out/graph.json
& ".\.tooling\python\Scripts\graphify.exe" god-nodes --top 10 --graph graphify-out/graph.json
& ".\.tooling\python\Scripts\graphify.exe" benchmark graphify-out/graph.json
& ".\.tooling\python\Scripts\graphify.exe" hook status
.\scripts\graphify-watch.ps1
```

Results:

- Graph: `239` nodes, `394` edges, `16` communities.
- Diagnostic: zero missing/dangling endpoints, self-loops, exact duplicates và
  endpoint-collapse groups.
- Benchmark: `7.5×` fewer tokens/query trên corpus hiện tại.
- Hooks: post-commit installed; post-checkout installed; merge driver
  registered.
- Watcher start/stop smoke pass; không còn process watcher sau `Ctrl+C`.
- Code-only baseline cảnh báo `.codex/hooks.json` không sinh node; incremental
  update giữ thêm cấu trúc Markdown mà không gọi LLM.

## Open verification

- Owner-supplied URL Zalo, địa chỉ, năm thành lập và bảo hành vẫn là blocker nội
  dung, không phải test failure.
