# Decisions

File này **append-only**. Không xoá hoặc sửa quyết định cũ; khi thay đổi hướng,
thêm quyết định mới ghi rõ quyết định nào bị supersede.

## 2026-07-30

- **DEC-001 — Root là canonical.** Website production được hiểu từ `/` và
  năm route tĩnh `/`, `/nha-o/`, `/kinh-doanh/`, `/quang-cao/`,
  `/gioi-thieu/`. Hệ quả: mọi tài liệu, test và link mới phải dùng route này.

- **DEC-002 — Static shared architecture.** Các route giữ `index.html` riêng
  nhưng tái dùng `style.css`, `motion.js`, `detail.css`, `detail.js`. Lý do:
  hosting đơn giản cho solo developer, không cần bundler/component framework.

- **DEC-003 — VI source, EN qua data attributes.** Copy Việt nằm trong HTML;
  English dùng `data-en`, `data-en-alt`, `data-en-aria-label`,
  `data-en-content`; locale lưu ở `tt-lang`. Hệ quả: `data-en` phải nằm trên
  node lá để không phá markup.

- **DEC-004 — Process là invariant.** Thứ tự luôn là
  **Khảo sát → Tư vấn → Sản xuất → Lắp đặt**. Đây là câu chuyện năng lực và là
  acceptance check, không đổi theo route.

- **DEC-005 — Motion nâng trải nghiệm, không giữ nội dung làm con tin.** Desktop
  có smooth scroll/GSAP; mobile dùng native scroll; reduced motion bỏ animation
  không thiết yếu và luôn giữ nội dung nhìn thấy.

- **DEC-006 — Editorial image policy.** Ảnh ưu tiên không gian, vật liệu, dụng cụ,
  tay nghề và motion blur; không khuôn mặt nhận diện. Ngoại lệ người dùng duyệt:
  `assets/site/expanded/legacy-team.webp`.

- **DEC-007 — Xanh/cam là accent.** Hai màu nhận diện dùng cho nhấn, trạng thái
  và chi tiết; nền chính giữ trung tính để công trình và logo đơn màu nổi bật.

- **DEC-008 — Owner facts không được suy đoán.** URL Zalo, địa chỉ, năm thành lập
  và bảo hành ở trạng thái TODO cho đến khi chủ dự án xác nhận. Hệ quả: không
  phát hành cam kết hoặc dữ kiện giả.

- **DEC-009 — Graphify-first cho kiến trúc.** Khi
  `graphify-out/graph.json` tồn tại, chạy Graphify query qua wrapper project-local
  trước raw search; dùng `rg` chỉ để xác nhận có scope. Code changes cần AST
  fresh; docs/images cần semantic re-extraction khi truy vấn quan hệ ngữ nghĩa.

- **DEC-010 — Motion map theo web tham khảo, không nhập bundle production.** Route
  dùng white fade `.75s/1s`; full-menu dùng bốn background columns, page scale
  `.9`, timeline `1.15×` và reverse `2.25×`; line/media timing theo
  `docs/MOTION-MAP.md`. Bundle public của reference chỉ nằm trong
  `reference-audit/` để nghiên cứu, không được load bởi website production.

- **DEC-011 — Header route-first, không dùng fragment navigation.** Desktop nav
  và full-menu chỉ dẫn tới canonical route. Public anchor không chứa fragment;
  locale switch giữ query/vị trí đọc nhưng loại fragment. BFCache vẫn dọn route
  veil, dialog và page scale trong `pageshow.persisted`.

## 2026-07-31

- **DEC-012 — Graphify code-only là bản đồ mặc định.** Graph production dùng
  AST, tạo bằng `graphify extract . --code-only --out .` và cập nhật bằng
  `graphify update .`. Codex PreToolUse, git post-commit/post-checkout và merge
  driver do Graphify CLI quản lý. Docs/ảnh chỉ vào graph khi chủ dự án chủ động
  chạy full semantic extraction.

- **DEC-013 — Reference archive tách khỏi runtime.** Crawler sitemap tuần tự lưu
  HTML/source/media first-party vào `reference-audit/web-reference/archive/` kèm
  manifest SHA-256 để nghiên cứu và tái lập. Archive bị Graphify bỏ qua, không
  được load vào website production và không thay thế quyền sử dụng nội dung.

- **DEC-014 — No-LLM không đồng nghĩa docs vắng mặt.** Supersede câu cuối của
  DEC-012: code-only extraction tạo nền AST; `graphify update .` có thể giữ
  heading/link Markdown bằng structural extraction. Docs/ảnh vẫn chưa có quan
  hệ semantic/vision nếu không chạy full extraction với backend LLM.

- **DEC-015 — Text mask phải theo font và layout render thật.** `motion.js` dùng
  Canvas TextMetrics để đặt `--mask-ink-overflow` và chỉ mở clip phía trên;
  `detail.js` rebuild line/word sau khi font sẵn sàng, resize hoặc đổi VI/EN.
  Hero motto dùng cùng contract. Lý do: giữ reveal mask mà không cắt dấu tiếng
  Việt hoặc dùng một padding cố định sai giữa các font/viewport.

- **DEC-016 — Content/media có guide và thứ tự bảo trì rõ.** Trước khi sửa
  copy, motto, card/gallery hoặc asset phải đọc
  `docs/CONTENT-MEDIA-GUIDE.md`. Thứ tự bảo trì hiện tại là
  `/quang-cao/` → `/kinh-doanh/` → `/nha-o/`; đây không phải xếp hạng tầm quan
  trọng của dịch vụ.

- **DEC-017 — Worker CMS và locale URL là canonical.** Supersede DEC-001/003
  ở phần route/i18n: public chỉ dùng `/vi/…` và `/en/…`; Worker SSR locale/head
  từ D1, còn HTML shell giữ leaf `data-en` cho structure/motion. Root, source
  shell và Vietnamese legacy paths one-hop 308 sang `/vi/…`.

- **DEC-018 — Admin defense in depth.** Cloudflare Access là platform gate,
  nhưng Worker cũng verify RS256 JWT/JWKS, issuer, audience, expiry, email allow
  list và same-origin writes. D1 content có schema cố định; R2 private chỉ phát
  media đã publish/approve.

- **DEC-019 — D1 SSR luôn ưu tiên hơn shell fallback.** `data-en*` giữ leaf
  fallback cho cấu trúc static, nhưng Worker decode entity và áp D1 CMS/SEO sau
  cùng; `motion.js` không ghi đè canonical SSR. Identity của
  `projects-products` là **Công trình & sản phẩm** / **Projects & products**;
  migration forward-only `0002` đưa cả state mới và state đã có `0001` về cùng
  dữ liệu.

## 2026-08-01

- **DEC-020 — Home hero dùng cross-fade có drift chồng nhịp.** Ảnh drift
  `scale 1.06 → 1` trong `5s` với `sine.inOut`; cross-fade dài `1.6s` bắt đầu ở
  giây `4.2`; ảnh kế tiếp bắt đầu drift đúng trung điểm giây `5.0`. Easing
  vào/ra êm loại bước vận tốc tại frame bàn giao. Home hero không có kicker
  hoặc slide index.

- **DEC-021 — Heritage montage theo nhịp compact của reference.** Rail chữ có
  `max-width: 1300px`; ảnh `13vw × 10vw`, chặn ở `200×150px`. Bốn frame đi theo
  copy ngắn: `legacy-hands-384.webp`, `montage-cnc-tablet.webp`,
  `craft-384.webp`, và sản phẩm nội thất có tiền/hậu cảnh. Không thêm label lên
  ảnh.

- **DEC-022 — Typography và locale transition giữ shell ổn định.** Public shell
  dùng Plus Jakarta Sans từ Google Fonts với Arial fallback; locale switch gọi
  cùng `navigateTo()` với link nội bộ. Header luôn hiện trên route veil (xoá
  `is-hidden` khi bắt đầu fade); chỉ transition màu của shell bị tắt trong lúc
  fade để tránh repaint chớp giữa hai document. Heritage copy ngắn lại thành
  “Kinh nghiệm và sáng tạo là cam kết
  trong từng sản phẩm”; ảnh cuối dùng một sản phẩm nội thất có tiền cảnh và hậu
  cảnh rõ.

- **DEC-023 — The full menu owns locale and appointment controls.** The
  persistent header no longer renders a duplicate locale toggle. Every shell
  exposes exactly two `[data-language-option]` links inside `#site-menu`, plus
  the existing survey/Zalo CTA in `.menu-appointment`. The menu keeps the four
  existing Trường Thịnh groups in a reference-shaped 4/3/2/1 grid and preserves
  the measured GSAP open/close timings. The appointment is hidden at tablet
  widths (`≤960px`) and restored as a full-width mobile row (`≤578px`).

- **DEC-024 — CMS project slots are optional over a static menu baseline.** The
  four menu groups preserve readable Trường Thịnh copy in every shell. Groups
  01–03 expose `data-menu-projects` slots; D1 `menu_group` and optional
  `menu_order` metadata can replace only a group that has valid published
  records. `motion.js` sorts by order then slug and emits canonical
  `/{locale}/projects/{slug}/` links; API errors, missing metadata, or missing
  localized names leave static slots untouched. Group 04 keeps social URLs
  inert until owner facts are supplied.

- **DEC-025 — Public navigation is fragment-free.** All skip links, scroll cues,
  section CTAs, footer chapter links, fragment scroll/focus runtime and hash
  persistence tests were removed. SVG `url(#...)` clip-path references remain
  because they are local graphic resources, not navigation.

- **DEC-026 — Vietnamese readability overrides reference density.** Live
  Reference text measures an actual word gap near `.272em` despite CSS spacing
  being zero. Plus Jakarta Sans public text therefore uses neutral display
  tracking and `.10em` shared word spacing to compensate for its narrower
  native space glyph. Heritage keeps `1.08` line height and the approved 75 px
  cap height. Canvas TextMetrics measures top and bottom ink independently and
  opens both clip edges. This supersedes DEC-015's top-only clip behavior.

- **DEC-027 — Full-menu children and floating CTA follow the measured reference.**
  Four menu groups expose 15 bilingual child routes using taxonomy query strings,
  never fragments. Child type, spacing, underline and stagger match the reference
  measured menu contract. Calendar SVG uses its native `58.09×57.82` viewBox.
  The shared floating Zalo CTA adopts the reference appointment bubble geometry,
  hover inversion and scroll-window choreography while retaining the owner URL
  placeholder and Trường Thịnh copy.

## 2026-08-08

- **DEC-028 — Graphify và Serena có ranh giới bổ sung.** Graphify đi trước cho
  architecture/dependency/blast radius; Serena theo sau cho symbol/reference và
  refactor. Code graph phải fresh trước query; Serena symbolic work phải dừng
  khi language set đổi mà MCP chưa re-activate.

- **DEC-029 — Tooling chỉ ở project scope và update là notify-only.** Python ở
  `.tooling/python`, portable runtimes ở `.tooling/runtimes`, Node packages có
  lockfile, skills ở `.agents/skills`, personas ở `.codex/agents`. Bootstrap đầu
  pin stable; các lần sau không tự nâng cấp.

- **DEC-030 — Serena language set được suy ra, không sửa tay.** Extension scan
  dùng mapping đã kiểm tra với enum/schema của Serena, giữ key YAML khác, thêm
  hoặc bỏ backend khi file đầu/cuối của loại đó xuất hiện. Health-check và MCP
  re-activation là gate bắt buộc; loại không rõ/unsupported chỉ được báo.

- **DEC-031 — Browser QA phân tầng.** Playwright là regression gate có thể lặp
  lại trên Chromium/Firefox/WebKit. Chrome DevTools và Computer Use là lớp điều
  tra bổ sung, dùng profile cô lập; native GUI cần logs và framework automation
  riêng. Screenshot hoặc nhận định tĩnh không được báo thành metric/test pass.

- **DEC-032 — Hook có một dispatcher cho mỗi event.** Session lifecycle quản lý
  quick doctor, ADHD injection, update notification, Graphify/Serena freshness,
  Impeccable, watcher cleanup. Hook dùng debounce/lock/loop guard, log lỗi và
  không được tạo false-positive QA/freshness.

- **DEC-033 — Graphify update theo dirty fingerprint và được coalesce.**
  `PostToolUse` không update graph; nó chỉ so fingerprint corpus và đánh dấu
  dirty khi file thực sự đổi. Pre-query và `Stop` recheck freshness cả trước lẫn
  sau khi lấy lock, nên các dispatcher đồng thời dùng chung một update. Bash chỉ
  đọc không chạy Serena sync/Graphify update. Graphify luôn được gọi qua
  executable project-local, không phụ thuộc global `PATH`. Quyết định này
  supersede phần “update sau mỗi code change” trong DEC-009/DEC-012 nhưng giữ
  nguyên yêu cầu graph phải fresh trước query.

- **DEC-034 — Chỉ bỏ skill global/project khi vẫn còn fallback rõ ràng.** Bản
  `i-have-adhd` đầy đủ đã có ở user scope nên project không vendoring hoặc inject
  lại tại SessionStart; contract ngắn trong `AGENTS.md` vẫn always-on. Ponytail
  global chưa có, vì vậy sáu skill Ponytail tiếp tục nằm trong project để clone
  trên máy khác không mất chức năng.

- **DEC-035 — Live bản tĩnh trước, CMS sau.** Năm page type VI/EN phải hoạt
  động không cần D1, R2, Access hoặc CMS secret. GitHub là source of truth;
  pull request chạy contract và Chromium smoke; deploy production ban đầu là
  workflow thủ công. Static files là fallback/rollback. CMS chỉ được kích hoạt
  sau khi bản tĩnh live ổn định và owner duyệt workflow xuất bản.

- **DEC-036 — Graphify dùng wrapper freshness với boundary cố định.**
  `scripts/tooling/invoke-graphify.ps1` là interface canonical cho
  `query`/`path`/`explain`; CLI wrapper và MCP hook dùng chung dirty fingerprint,
  lock và coalesced AST update. AST update thất bại thì query bị dừng. Trạng
  thái semantic docs/media được suy ra bằng API incremental và manifest chính
  thức của Graphify, chỉ cảnh báo và không tự gọi LLM/API. Custom strict/watch
  profile, watcher và marker semantic đã bị loại vì trùng chức năng và dễ stale.
