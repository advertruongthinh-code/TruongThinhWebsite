---
title: Verification baseline project
date: 2026-08-08
category: verification
related_specs: []
related_decisions: []
---

# Trạng thái hiện tại

> Snapshot: 2026-08-08. Đây là trạng thái kiểm chứng tại thời điểm ghi, không
> thay thế việc đọc file/report hiện tại.

## Tooling và tài liệu 2026-08-08

- Sol Advisor `0.5.0` đã được tải vào snapshot project theo commit/checksum pin,
  đã qua Windows MCP smoke test, direct `save_preferences` và doctor xác nhận
  plugin Codex đang enabled. Patch Windows bỏ qua lời gọi Bun `fsync` gây
  `EPERM`, vẫn giữ atomic rename. Máy này dùng chung plugin source đã có của
  PrintWork vì Codex chỉ cho một marketplace `sol-advisor`; không đổi source
  của PrintWork. Project vẫn giữ snapshot riêng để máy mới có thể cài lại độc lập.
- Chưa có adapter `sol-advisor-*.toml` nào được sinh. Cần restart Codex, rồi chạy
  `$sol-advisor:setup`, chọn project scope, kiểm tra preview và tự xác nhận exact
  token. Đây là ranh giới bắt buộc của upstream.
- Đã thêm quy ước Git–Notion: Notion giữ work item/draft/priorities/blocker;
  spec được duyệt dùng prefix `frontend-` hoặc `cms-` trực tiếp dưới
  `docs/specs/`, được link
  hai chiều với Notion. Connector Notion không có tool callable trong session
  này nên không có update Notion nào được giả lập.
- `AGENTS.md` đã tách ownership cho `PRODUCT.md` (`impeccable init`) và
  `DESIGN.md` (`impeccable document`). Chưa chạy hai lệnh đó, nên không ghi đè
  product/design context hiện có.
- Doctor quick pass. Cảnh báo còn lại: Serena không hỗ trợ `.sql`, mapping `.patch`
  chưa biết, và Graphify semantic update pending cho 42 docs/media file; AST
  freshness độc lập với semantic pass.

## Cấu trúc repository ngày 2026-08-08

- Nhánh local `codex/project-structure`; chưa push lên GitHub.
- Source production đã tách vào `src/site`, `src/worker`, `src/admin` và
  `src/db/migrations`; public URL và layout `.site-output` không đổi.
- Test đã tách theo `tests/site`, `tests/worker`, `tests/tooling`; utility nằm
  trong `scripts/site` và `scripts/reference`; agent tooling giữ nguyên
  `scripts/tooling` để không làm mất trust của hook.
- Tài liệu đã phân loại vào `docs/product`, `docs/engineering`,
  `docs/operations`, `docs/decisions`, `docs/reports`.
- Kho nghiên cứu nằm tại `research/reference-site`; full manifest trước/sau move
  giống nhau: 1.955 file, 463.434.696 byte. Archive vẫn ignored và không lọt
  vào `.site-output`.
- Static contract, Worker security fixtures, Worker static runtime và
  cross-browser smoke 21/21 trên Chromium, Firefox, WebKit đã pass. Suite CMS
  đầy đủ vẫn cần D1 seed/binding và không phải release gate của phase tĩnh.
- Serena không đổi language set; `.sql` vẫn được báo unsupported. MCP doctor
  pass cả Serena, Graphify và Chrome DevTools. Graphify AST fresh; semantic pass
  còn pending cho 31 file docs/media.

## Product canonical

- Public canonical là `/vi/` và `/en/`; root/source/legacy paths redirect 308
  về `/vi/` counterpart.
- Shared runtime/presentation:
  `src/site/style.css`, `src/site/motion.js`, `src/site/detail.css`,
  `src/site/detail.js`.
- Route contract: `/vi/`/`/en/`, `residential`, `commercial`,
  `projects-products`, `about`, và `/projects/:slug/` theo locale.
- Quy trình cố định:
  **Khảo sát → Tư vấn → Sản xuất → Lắp đặt**.
- VI là source text; EN dùng `data-en` và các thuộc tính `data-en-*`.
- Header/full-menu dùng direct service routes; public navigation không còn
  fragment. Route veil và BFCache cleanup giữ Back/Forward không mắc ở
  dialog/page scale.
- Hero của ba route dịch vụ có motto. `detail.js` chia lại line/word sau khi font
  sẵn sàng, resize hoặc đổi VI/EN; `motion.js` đo ink bằng Canvas TextMetrics để
  cấp phần tràn mask phía trên theo font thực tế.
- Timing/easing đã ánh xạ và ghi tại `docs/impeccable/motion-map.md`.
- Home hero dùng bốn ảnh Nhà ở, Kinh doanh, Kiosk & POSM, Xe bán hàng; mỗi ảnh
  drift `1.06 → 1` trong `5s` với `sine.inOut`, cross-fade `1.6s` bắt đầu ở
  giây `4.2`, ảnh kế tiếp drift từ trung điểm giây `5.0`; easing vào/ra êm
  tránh giật vận tốc tại handoff; không còn kicker hoặc `hero-index`.
- Sửa copy/media phải đọc `docs/product/CONTENT-MEDIA-GUIDE.md`; thứ tự bảo trì hiện tại:
  `/projects-products/` → `/commercial/` → `/residential/`.

## Trạng thái full-menu 2026-08-01

- The persistent header has no language control. Locale switching is owned by
  the two `[data-language-option]` links inside `#site-menu`; tests open the
  dialog before exercising them, preserve query/scroll state, and clear fragments.
- The menu head contains the TT SVG wordmark, language controls, the existing
  survey/Zalo appointment, and an icon-only close control. The body uses four
  existing content groups with a visible square scrollbar and 4/3/2/1 columns
  at default/1200/960/578 breakpoints.
- GSAP selectors now target `.menu-brand`, `.menu-language`,
  `.menu-appointment`, `.menu-nav`, and `.menu-group` without changing the
  archived-reference timing contract. Group rows now stretch to the menu-nav
  track so animated right dividers reach the row bottom; mobile hides them.
- Per the 2026-08-02 content decision, the full menu now contains only four
  top-level routes. All child items, social placeholders, section hashes, CMS
  menu slots and their client-side hydration were removed. Database metadata is
  retained for compatibility but no longer affects the menu. Node syntax checks pass. `TT_E2E_MENU_ONLY=1` is green at
  5/5 checks; the live Chrome run measured 1440×900 menu head/nav at
  `137.516/741px` with four `360px` columns and 390×844 at `226.969/597px`
  with one column. No console errors, page errors, request failures, or HTTP
  errors were observed. `tests/worker/worker-contract.cjs` also passes against the
  fresh migration-backed Worker/D1 state.
- Public navigation is now fragment-free across all 10 VI/EN routes. Browser
  verification found `0` fragment anchors, `0` horizontal overflow and no
  console/network errors; direct legacy fragments are removed while query and
  locale reading position remain intact. The focused Playwright gate passes
  `8/8`.
- Home process strip dùng bốn composition số lớn/ảnh/copy thay cho card đều.
  Ảnh chiếm trọn chiều cao và khoảng 47–53% chiều rộng thẻ. Số 1–4 là SVG
  outline OpenType `tnum` PJS semibold, nằm nền ở cột copy và canh phải-trên.
  Root SVG ngang cấp ảnh và dùng tight viewBox theo ink bounds; nét mỗi số ôm
  sát và cao đúng bằng ảnh. Owner chấp nhận scale `1/4` lớn hơn `2/3` khoảng 1,6%
  theo ink box. Copy canh top. Mobile xếp dọc, không cuộn
  ngang. Nội dung nói thẳng việc khảo sát, chốt vật liệu/mức chi, kiểm chi tiết
  tại xưởng và lắp/căn/dọn khi bàn giao.
- Ba Home service portal dùng slogan đã duyệt, không lặp service title; subtitle
  khớp baseline web tham khảo `16/22.4px`, reveal `0.3s` delay `0.3/0.6/0.9s` và
  underline hover/focus 3px. Ảnh portal mới là
  `residential-restorative.webp`, `commercial-operational-flow.webp` và
  `kiosk-product-display.webp`; đã loại chữ/logo giả và không có mặt nhận diện.
- The same migration now makes `project_categories.kind` explicit, seeds six
  project categories at positions 101–106, and maps legacy project rows away
  from product categories. Public project/product APIs filter by kind; admin
  exposes separate category resources with wrong-kind validation and `409` on
  referenced deletes.
- The public project menu feed now whitelists valid `menu_group` values and
  emits only `slug`, `menu_group`, `menu_order`, and complete VI/EN `name` data;
  malformed or locale-incomplete records remain on the static menu fallback.
- The final `graphify update .` completed without topology changes. Known
  warnings remain: `hooks.json`/`cf.json` produce zero graph nodes, and three
  SQL files are skipped because `tree_sitter_sql` is not installed.

## Đo lại parity full-menu 2026-08-02

- Chrome measurement at 320/390/768/1024/1440 confirms header and menu viewport
  geometry matches the reference contract. Menu brand box is 170px desktop and
  150px at <=1200; the TT mark is 60px/48px so the local wordmark fills that
  box without copying reference assets.
- `.menu-group__title` now spans its content column, preventing Vietnamese
  wrapping and underline drift. No motion.js timing was changed.
- Full-menu controls now use full language names (`Tiếng Việt`/`English`,
  localized to `Vietnamese`/`English` on EN), not `VI`/`EN`. Appointment uses
  the reference calendar geometry at 35px with 4px stroke; controls measure
  13.6/19.04 semibold. Menu titles and options share the reference 3px/-4px
  pseudo underline for hover and selected states. Runtime checks at
  1440/1093/1024/768/390/320 found title→option 30px, option rhythm 34.04px,
  no overflow, and no motion.js timing changes.
- Language controls now use the same reference-style opacity and underline
  hover motion. Horizontal page overflow remains clipped at the root, while
  intentional touch/drag rails keep their scroll behavior with horizontal
  scrollbar chrome removed.

## Section divider correction 2026-08-02

- Removed the added chapter-divider pattern from public detail and projects
  pages. All public sections now use their existing compact heading layouts.

## Route file đã quan sát

| Route | File | State at snapshot |
| --- | --- | --- |
| `/vi/`, `/en/` | `index.html` | Worker SSR |
| `/vi/residential/`, `/en/residential/` | `residential/index.html` | Worker SSR |
| `/vi/commercial/`, `/en/commercial/` | `commercial/index.html` | Worker SSR |
| `/vi/projects-products/`, `/en/projects-products/` | `projects-products/index.html` | Worker SSR |
| `/vi/about/`, `/en/about/` | `about/index.html` | Worker SSR |

## Assets

- Media canonical nằm trong `assets/site/`.
- `assets/site/process/survey-modern.webp` giữ nguyên 1536×1024 và được cập nhật
  để điểm phát laser nằm ở cửa sổ phía trên thiết bị; asset vẫn dùng cho Home
  process card và Residential survey gallery.
- Bộ thương mại nằm trong `assets/site/commercial/`; PNG nguồn ở
  `assets/site/commercial/originals/`.
- Bộ quảng cáo nằm trong `assets/site/advertising/`.
- Ngoại lệ no-face đã được duyệt:
  `assets/site/expanded/legacy-team.webp`.
- Heritage montage hiện map theo thứ tự kinh nghiệm → sáng tạo → cam kết → sản
  phẩm bằng `legacy-hands-384.webp`, `montage-cnc-tablet.webp`,
  `craft-384.webp` và `montage-residential-product.webp`; rail desktop `1300px`,
  frame `13vw × 10vw`, chặn ở `200×150px`. Ảnh sản phẩm có chủ thể rõ cùng
  tiền cảnh và hậu cảnh.
- Public typography dùng Plus Jakarta Sans từ Google Fonts với Arial fallback;
  đổi locale dùng route veil chung, header luôn hiện phía trên veil và chỉ tắt
  transition màu trong lúc navigation; bắt đầu fade sẽ xoá `is-hidden` để header
  luôn hiện. Kiosk/POSM và mobile
  retail có thêm ảnh phối hợp alu, nhôm, sắt, gỗ, inox và acrylic.
- Public readability contract dùng neutral tracking và `.10em` word spacing
  để space glyph PJS đạt tỷ lệ gần `.27em` đã đo trên reference. Mask đo/mở
  riêng top và bottom nên không cắt dấu Việt; heritage desktop vẫn giữ
  cap-height 75 px.
- Typography Chrome gate: 50/50 locale-route/viewport case không overflow,
  console/network sạch và mask đủ ink; 10/10 Projects hero geometry case pass.
  Full suite pass 82/94 trước khi sửa numeric-zero/test portal; delayed-motion
  boot-claim race vẫn tái hiện độc lập và nằm ngoài slice typography này.

## Browser run lịch sử

`tests/site/reports/latest.json` được tạo lúc `2026-07-30T20:17:54.259Z`:

- 48 checks.
- 48 passed.
- 0 failed.
- Thời gian: 213.102 giây.

Suite đã kiểm tra đủ năm route ở 320, 390, 768, 1024 và 1440 px; thêm quy trình,
căn giữa portal, direct header/menu routes, Back/Forward/BFCache, internal links,
VI/EN, menu/focus ở 390/1440, filter, gallery, masks/hover, reduced motion,
console, network, ảnh và overflow ngang.

## CMS verification 2026-07-31

- Local D1 mới đã apply `0001_cms.sql` + `0002_projects_products_identity.sql`;
  local state đã có `0001` cũng apply riêng `0002` thành công. Cả hai trả
  **Công trình & sản phẩm** / **Projects & products** cho H1 và SEO title.
- `tests/worker/worker-contract.cjs` pass với JWT forged/expired/issuer/audience/email,
  padded/non-canonical Base64URL re-signed, WebP VP8X rỗng và một WebP thật.
- Targeted Playwright pass tại `390×900` và `1440×900`: D1 SSR giữ title/meta/
  hero/motto sau hydration và header/full menu không render literal `&amp;`.
  Kiểm tra deep-hash cũ đã bị xoá theo quy tắc public navigation không dùng
  fragment.
- Full browser suite trên state D1 đã có `0002` pass **53/53** trong `240.868s`:
  năm route tại 320/390/768/1024/1440, lazy image sau stepped scroll, SSR
  locale, menu/focus, filter/gallery, reduced motion, console/network và
  overflow đều xanh.

## Browser evidence

- Full-menu slice 2026-08-03: icon lịch đã sửa đúng native viewBox
  `58.09×57.82`; title `28.8/40.32`, option `13.6/19.04`, title→option 30 px,
  option step 34.04 px; 15 child route không có hash, không overflow tại
  1569×912. Bốn ảnh quy trình đều cao đúng 208 px. Floating CTA cao 47 px,
  dùng icon lịch 25 px và transition X đúng source web tham khảo.

- Home desktop `1440×900`: ở `250ms`, menu còn
  `coverageComplete=false`, `copyVisible=false`, `focusInside=true`; khi ổn định,
  shutters/nút đóng/focus đều đúng và đóng menu trả focus về opener. Console
  không warning/error/issue; `23/23` request trả `200`.
- Mobile `390×844`: motto `/quang-cao/` nằm trong hero, không overflow, được chia
  động thành một dòng; `--mask-ink-overflow: 3px`,
  `clip-path: inset(-3px 0 0)` và Vietnamese font check đạt `true`. Motto
  `/nha-o/`, `/kinh-doanh/` cũng nằm trong hero và không overflow.
- Navigation-preservation run mobile: `58/58` request trả `200/304`, không có
  console warning/error/issue.
- Chrome DevTools Performance, `/` desktop 1440×900, unthrottled:
  LCP `206ms`, TTFB `3ms`, render delay `204ms`, CLS `0.00`.
- Lighthouse quality mobile/desktop: Accessibility `100`, Best Practices `100`,
  SEO `100`, Agentic Browsing `100`; `52/52` audits pass.
- Route `/quang-cao/` mobile sau contrast/filter fix:
  `100/100/100/100`, `51/51` audits pass, console sạch, `24/24` request thành
  công.
- Lighthouse Performance mobile 3-run median: score `87`, FCP `1815.3ms`,
  LCP `3904.1ms`, TBT `66.0ms`, CLS `0.0009`, Speed Index `1816.3ms`.
- Lighthouse Performance desktop: score `98`, FCP `563.6ms`, LCP `1017.8ms`,
  TBT `0ms`, CLS `0.0048`, Speed Index `787.1ms`.

## Home media and montage — 2026-08-02

- Portal Quảng cáo dùng ảnh xe bán hàng lưu động F&B đã duyệt:
  `portal-options-round-2/advertising-fnb-mobile-cart-v2.webp`.
- Ảnh “cam kết” trong heritage montage dùng ẩn dụ nút dây chịu lực:
  `generated/montage-commitment-option-3-knot.webp`.
- Mask text đã tính thêm endpoint reveal `y:-.1em`; dấu Việt không còn bị cắt
  mà không đổi line-height. Hàng 2/3 lệch trái/phải 15 px ở desktop, tạo khoảng
  hở 12.375 px giữa hai frame tại 1303×912.

## Graphify

- Graphify `0.9.36`; Codex PreToolUse, git post-commit/post-checkout và merge
  driver đã cài.
- Local/no-LLM graph sau boundary refresh: `692` nodes, `1.177` edges; code AST
  là nền và incremental update giữ thêm cấu trúc docs.
- Multigraph diagnostic: `0` missing/dangling/self-loop/duplicate/collapsed
  edges.
- Benchmark: `7.5×` fewer tokens/query trên corpus hiện tại.
- Wrapper project-local và MCP dùng chung boundary freshness gate; không còn
  Graphify watcher/profile tùy biến.
- Docs/ảnh chưa có semantic LLM/vision extraction; chỉ cần full extraction khi
  chủ dự án muốn truy vấn quan hệ ngữ nghĩa của hai nhóm này.

## Reference archive

- Full English crawl đã hoàn tất: `301` URL được duyệt, `254` page lưu,
  `47` route trả `404`, `5.532/5.532` asset first-party được lưu.
- Manifest có `5.836` record; kiểm tra `5.789` file cho `0` thiếu, `0` sai
  size/hash và `0` collision.
- Crawler pass `node --check` và `10/10` unit tests. Payload khoảng `1,05GB`
  được ignore, không phải runtime dependency.

## Engineering còn pending

1. Cấu hình production D1 database ID, private R2, `PUBLIC_ORIGIN`,
   `ADMIN_EMAILS`, `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` và Access application
   `/admin/*` + `/api/admin/*` trước deploy.
2. Critical CSS là cơ hội performance đã đo (`~850ms` LCP ước tính), nhưng chỉ
   tách sau A/B audit; không preload font theo suy đoán.

## Handoff cho session kế tiếp — 2026-08-03

1. Kiểm duyệt nội dung và câu chuyện thương hiệu.
2. Refine visual trang home từ sau `heritage-montage`; phần trước đó hiện đã ổn.
   Sau khi chốt home mới tiếp tục các trang con.
3. Motion và animation choreography vẫn còn nợ: chưa đồng nhất 1:1 với
   web tham khảo. Tiếp tục đo source/reference và kiểm tra trực tiếp bằng
   Chrome cho từng component ngay sau khi sửa.
4. Tổ chức lại thư mục, codebase và asset để chuẩn bị đưa dự án lên GitHub.
5. CMS là kế hoạch tương lai xa; chưa xây ngay nhưng cấu trúc nội dung, route và
   asset phải giữ đường nâng cấp hợp lý cho CMS.

## Pending owner facts

- URL hoặc số Zalo production.
- Địa chỉ trụ sở.
- Năm thành lập chính xác.
- Chính sách và thời hạn bảo hành.

Cho đến khi có xác nhận, giữ CTA/địa chỉ ở trạng thái placeholder và chỉ dùng
tuyên bố “hơn 20 năm”.

## Automation kỳ vọng

- `scripts/tooling/invoke-graphify.ps1` là interface canonical cho
  `query`/`path`/`explain`; wrapper tự làm fresh AST trước khi query.
- `graphify hook status`: post-commit installed, post-checkout installed, merge
  driver registered.

## Project tooling — 2026-08-08

- Project-local install đã thay bản cũ: Serena `1.6.1`, Graphify `0.9.36`,
  Playwright `1.62.1`, Chrome DevTools MCP `1.6.0`, Impeccable CLI `3.5.0`, 32
  project skills và 4 read-only personas. Không sửa global config.
- Serena health-check và MCP re-activation pass cho 9 backend: TypeScript, HTML,
  SCSS, PowerShell, Markdown, JSON, TOML, YAML, Python. SQL vẫn được báo
  unsupported; không còn restart marker.
- Graphify AST/structural sạch có `664` nodes, `1.145` edges, `74` communities. Graph cũ
  lẫn vendored skill đã backup; post-commit/post-checkout ghim đúng Python venv
  project. Docs/media vẫn là `semantic update required` nếu chưa chạy semantic
  pass.
- Graphify hooks dùng dirty fingerprint: `PostToolUse` không còn update phòng
  xa; read-only Bash bị bỏ qua; Pre-query/`Stop` coalesce thành một update sau
  lock. Log dùng append stream chia sẻ để tránh tranh chấp giữa dispatcher.
- Benchmark sau fix: read-only `PostToolUse` trung bình `449,6 ms`, fresh
  Graphify `PreToolUse` `431,3 ms`, CLI query `401,6 ms`; năm lần read-only và
  năm lần fresh pre-query tạo `0` update, không để lại dirty marker. Fixture
  concurrent query xác nhận đúng một update.
- Shell, `pwsh` trong `PATH` và runtime project đều là PowerShell `7.6.4`.
  Dispatcher/fixture dùng runtime project-local. Bốn Serena watcher trùng từ
  phiên cũ đã dừng; SessionStart tạo lại đúng một watcher có PID record.
- `i-have-adhd` global đã cài và giống bản project sau khi chuẩn hoá line ending;
  bản vendored cùng full SessionStart injection đã gỡ, còn `AGENTS.md` giữ
  contract always-on. Ponytail global chưa cài nên sáu skill Ponytail project
  vẫn được giữ nguyên để clone trên máy khác dùng được.
- Playwright là regression gate; Chrome DevTools/Computer Use chỉ bổ sung điều
  tra. Mọi Lighthouse/CWV/a11y/performance claim mới phải có runtime evidence.
- Update policy là notify-only sau bootstrap. Backup bắt buộc và checksum được
  giữ dưới `.tooling/backups` vì repo chưa có commit rollback.
- Fresh overwrite bootstrap `-SkipBrowsers` pass trong `54,9s`; doctor MCP pass
  Serena `23`, Graphify `10`, Chrome DevTools `29` tools. Serena unit test `2/2`
  và hook fixtures (ADHD/guard/loop/lock/boundary wrapper) pass.
- Worker contract pass; cross-browser smoke Chromium/Firefox/WebKit `21/21`
  pass. Full Chromium suite hiện `87/94`: 25/25 route×viewport smoke pass, còn 7
  website-contract failures (5 header-route about query variants, 1 hidden
  locale click, 1 portal subtitle). Không sửa ngoài tooling scope.

## Static-first release — 2026-08-08

- Mục tiêu hiện tại là đưa website tĩnh VI/EN lên mạng sớm nhất; CMS, admin,
  D1, R2 và project publishing được dời sang phase sau.
- `wrangler.toml` không còn binding D1/R2 bắt buộc. Worker dùng source HTML khi
  không có DB, vẫn sinh canonical route, locale SSR, `robots.txt` và sitemap;
  project detail động trả 404.
- Asset canonical đã chuyển từ nhãn phiên bản sang `assets/site/`. Redirect
  concept cũ đã xóa. Tên và URL nhận diện web tham khảo không còn trong code,
  docs canonical hoặc test; archive local bị Git ignore.
- Đã thêm spec release tĩnh, CMS roadmap, ADR, CI pull request và workflow deploy
  production thủ công. CI chỉ cài dependency theo lockfile, chạy source contract,
  Worker contract và Chromium smoke.
- Runtime tĩnh đã được tách vào `.site-output/` bằng allowlist để Wrangler không
  watch state/tooling hoặc upload file nội bộ. Worker static contract pass; 7/7
  Chromium smoke pass trên runtime này, gồm năm route, reduced motion và locale
  persistence.
- Owner còn phải cung cấp Cloudflare secrets và xác nhận Zalo/domain trước khi
  deploy production. GitHub connector xác nhận repo private
  `advertruongthinh-code/TruongThinhWebsite` đang rỗng, default branch `main` và
  tài khoản có quyền admin/push. Local đã cấu hình `origin` và nhánh `main`,
  nhưng GitHub CLI chưa đăng nhập nên chưa tạo commit, push hoặc chạy workflow.
- 53 media WebP không được production tham chiếu, ba ảnh legacy, font local
  không dùng, report/cache/staging và Graphify skill trùng đã chuyển vào
  `.tooling/quarantine/pre-github-purify-20260808/`. Đây là quarantine có thể
  phục hồi vì repo chưa có commit; không được đưa lên GitHub.
- Crawler generic đã resume từ manifest tạm và tiếp tục tải archive local; dữ
  liệu này bị Git ignore nên không chặn commit/deploy. Một request timeout giờ
  được ghi vào manifest rồi bỏ qua thay vì làm hỏng cả crawl.
- Graphify đã chuyển sang wrapper freshness với boundary cố định. PostToolUse
  chỉ đánh dấu dirty khi fingerprint đổi; CLI wrapper, MCP PreToolUse và Stop
  dùng chung lock/coalescing. Semantic pending được suy ra từ
  `detect_incremental(kind="semantic")` và manifest chính thức; không còn
  marker `needs_update`, custom strict/watch profile hoặc Graphify watcher.

## Chú thích thuật ngữ

- **Baseline**: trạng thái chuẩn dùng làm mốc so sánh.
- **Parity**: mức tương đương giữa hai output hoặc hai trạng thái.
- **Quarantine**: khu vực cô lập để giữ file có thể phục hồi nhưng không đưa vào
  release.
- **Pending**: việc hoặc evidence chưa hoàn tất.
- **Persist**: giữ state qua reload hoặc session khác.
