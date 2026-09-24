# Verification current-hash Advertising Products

## Phạm vi

Evidence này ghi implementation worktree trên Git base
`a8ba94ec1dadd84990b0b33f7e590f2cf76c71b1` ngày `2026-08-31`. Không có
deploy, không thay thế review Sol độc lập và không gọi full Espacio parity pass.

## Hash artifact

| Artifact | SHA-256 |
| --- | --- |
| `src/site/advertising-products/catalog-runtime.mjs` | `57c082031878ef7d561da48e8a7cff593d6e0083b9f0e1c759d8f9f8cd3f7a6c` |
| `src/site/detail.css` | `c13af5cdb70eab07222500fb638aba62e08d7a8910d74e4dd785e9c7de385bdd` |
| `tests/site/site.e2e.cjs` | `06deb170ae58f410355fb65eb81ac8c4a4e52a817ad1e656eb04c69fdb2c20ab` |
| `tests/site/advertising-products-layout.test.mjs` | `4027b683b47ca7d6eb06e0ceace6c815e5c1bb0b96bc13721399e710fe1e322e` |
| `tests/site/advertising-products-lifecycle.test.mjs` | `6a7ae4121fcb65f2b0e5e1d43b8e83add7750a3ea7aa745eff14037e9b585eed` |
| `tests/site/advertising-products-static.test.mjs` | `7edb8e8f1249f39e580852f66962845d0023067e53576541bc44f8238ed9f1ba` |
| `docs/specs/advertising-products-turnkey-services.md` | `52fbfeec956c70fa1a7e8c3ecbb4bf5e9a7164652dddccc11ac92b30fe89b140` |

## Kết quả

- `pnpm prepare:site`: pass; copy source, generate sáu advertising detail page
  và embedded runtime text.
- Node: layout, lifecycle, static và detail-route suites đều pass;
  `node --check` runtime cũng pass.
- `TT_E2E_ADVERTISING_DEFAULT_ONLY=1 BASE_URL=http://127.0.0.1:8787 pnpm qa:site`:
  `6/7`. SSR metadata VI/EN, filter morph, reduced-motion instant,
  scroll-during-morph catch-up và delayed-detail `1440px` pass. Delayed-detail
  `320px` lỗi `Execution context was destroyed, most likely because of a
  navigation`; đây là navigation race ngoài ba finding, không được ghi green.
- `TT_E2E_ADVERTISING_LOCALE_LIFECYCLE_ONLY=1 BASE_URL=http://127.0.0.1:8787 pnpm qa:site`:
  pass `1/1`. VI→EN→VI giữ text editorial/ARIA đúng locale; active line reveal
  resize/font rebuild không duplicate wrapper hoặc final-state overwrite;
  catalog remount dùng label/caption/alt/link locale mới; focus filter không để
  fallback node overlap `(0,0)`.
- `TT_E2E_ADVERTISING_GRID_ONLY=1 BASE_URL=http://127.0.0.1:8787 pnpm qa:site`:
  pass `17/17`, viewport `320`, `390`, `679`, `750`, `751`,
  `829`, `830`, `849`, `850`, `960`, `961`, `1200`, `1201`, `1440`, `1570`,
  `1920`, `2560px`.
- `TT_E2E_ADVERTISING_3K_ONLY=1 BASE_URL=http://127.0.0.1:8787 pnpm qa:site`:
  pass `1/1`. Runtime synthetic `3.000` card tại index `2800` giữ window `28`
  tile; card `tt-0000` không còn DOM, spacer/deep scroll ổn, không overlap hay
  horizontal overflow, filter round-trip và resize vẫn bounded.
- `pnpm qa:static` và `pnpm qa:worker:static`: pass; static route, locale,
  redirect và sitemap contract không regress.
- DevTools tại `1440px`: card `mobile-retail-01` chưa mount trước filter;
  destination mới chạy `33` moving frame từ khoảng `15.9ms` tới `392.4ms`,
  duration `0.4s`, delay `0s`, không reversal hoặc final snap. Sau settle chỉ
  còn đúng category `mobile-retail`.
- DevTools tại `679px`: `innerWidth/clientWidth = 679/669px`, native scrollbar
  `10px`, wrapper/lưới có biên trái-phải `15/15px`, gap `15px`, overflow ngang
  `0`. Native scroll dừng tại local grid offset `3000` trong morph; sau `650ms`
  DOM window có `9` tile, intersect đúng vùng overscan và mọi remount instant.
- DevTools console không có message; `24` network request đều `200/304`.
- Impeccable detector trên `catalog-runtime.mjs` và `detail.css` trả `[]`.
- Bridge locale active của `detail.js` revert SplitText trước translate, chờ font
  và rebuild đúng một lần; `onSplit()` giữ state tween active qua resplit. Hidden
  legacy catalog block và detail fallback filter listener đã gỡ. Search task scope
  trả zero consumer cho `data-project-filter`, `data-project-category` và taxonomy
  `kiosk` cũ.
- Full default `BASE_URL=http://127.0.0.1:8787 pnpm qa:site` trước patch hiện tại
  ghi `96/143` pass với failure ngoài scope. Không được hiểu là full-suite
  green; patch hiện tại chỉ reverify focused branch `6/7` ở trên.
- `git diff --check` trên owned paths: pass, chỉ có warning line-ending từ Git.

## Rủi ro còn lại

- Fresh Sol reviewer attempt `01a057bd-f81a-7fa0-b69e-12a57348aea7` bị ngắt
  fail-closed trước review. Runtime xác nhận đúng role/model/effort
  `sol_advisor_sol_reviewer` / `gpt-5.6-sol` / `high`, nhưng sandbox là
  `danger-full-access` và permission profile là `disabled`, không đạt isolation
  read-only bắt buộc. Vì vậy chưa claim `ship` cho patch hiện tại.
- Không chạy full Espacio parity suite; evidence chỉ bao các contract grid,
  virtualization, position motion và native-scroll catch-up trong scope.
- Delayed-detail `320px` navigation race vẫn mở ngoài phạm vi. Không có full-site
  release clearance, deploy hoặc production publication.

## Chú thích thuật ngữ

- **Current-hash**: Git base và worktree source đã được kiểm tra cùng evidence.
- **Bounded virtualization**: chỉ giữ DOM window quanh viewport và overscan.
- **Native scrollbar**: thanh cuộn chiếm phần ngang ngoài CSS containing block.
