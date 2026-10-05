# Plan đại tu hệ thống tài liệu

Spec: [docs-system](../docs/specs/docs-system.md) (owner duyệt 2026-10-04).
File này đứng riêng vì `tasks/plan.md` và `tasks/todo.md` đang do thread khác
giữ; khi thread đó xong, gộp vào `tasks/plan.md` hoặc xóa khi plan hoàn tất.

## Nguyên tắc thực hiện

- Mỗi task một PR nhỏ vào `main`, branch ngắn, CI xanh trước khi merge.
- Không đổi hành vi website. Ngoại lệ duy nhất: sửa path tài liệu trong code
  comment (ví dụ `catalog-runtime.mjs` dòng 669, 2472).
- Spec mới viết từ source và test; spec cũ chỉ để tìm intent đã duyệt. Khác biệt
  giữa intent và code ghi vào "Gate còn mở", hỏi owner.
- PR nào thay spec cũ thì xóa luôn spec cũ và verification nó hấp thụ, sửa link
  trong cùng PR.
- `pnpm qa:docs` bật dần: check nào bật thì từ đó không được tắt.

## Phase 1: Nền tảng

- [x] T1. Template spec mới và `pnpm qa:docs` bản đầu
  - Làm: viết lại `docs/specs/_template.md` theo R2; thêm
    `scripts/docs/check-docs.mjs` với check links và budget (budget chỉ áp
    cho spec có `status: live|planned|dormant`); thêm script vào
    `package.json` và `ci.yml`.
  - Nhận: `pnpm qa:docs` chạy xanh trên `main` hiện tại; cố tình làm gãy một
    link thì fail và nêu file, dòng.
  - Files: `_template.md`, `check-docs.mjs`, `package.json`, `ci.yml`. Cỡ M.
- [x] T2. Check ownership, sync và PR template
  - Làm: thêm check ownership (chế độ báo cáo, chưa fail) và sync (fail);
    thêm `.github/pull_request_template.md` có mục "Spec".
  - Nhận: PR thử đổi file thuộc `source` của `docs-system.md` mà không đổi
    spec thì CI fail; thêm dòng `Spec: không đổi - ...` thì xanh.
  - Phụ thuộc: T1. Files: `check-docs.mjs`, `ci.yml`, PR template. Cỡ S.

Checkpoint 1: CI xanh; owner thử đọc template mới.

## Phase 2: Design System

- [x] T3. Token và README Design System
  - Làm: tạo `design-system/` với `design-system.json`, `tokens.json` (màu,
    chữ, spacing, radius lấy từ `:root` của `style.css` và literal trong
    `detail.css`), `README.md` theo heading Impeccable, rút từ `DESIGN.md`
    và `docs/design/style-guide.md`. Thêm check design-drift vào `qa:docs`.
  - Nhận: mọi custom property màu và spacing trong `:root` có token; drift
    check fail khi thêm một biến CSS chưa có token.
  - Phụ thuộc: T1. Cỡ M.
- [x] T4. Section motion, content, tham chiếu Espacio
  - Làm: `design-system/motion.md`, `content.md`, `reference-espacio.md` gộp
    từ `docs/design/motion.md`, `content.md`, `advertising-image-quality.md`
    và `docs/reference/espacio/`; mô tả theo code đang chạy (`motion.js`,
    runtime Advertising). Xóa các file nguồn đã gộp.
  - Nhận: không còn `docs/reference/espacio/`; mỗi section dưới 300 dòng;
    links xanh.
  - Phụ thuộc: T3. Cỡ M.
- [x] T5. Component shell
  - Làm: `components/bundle.css` sinh từ CSS website; README và preview cho
    header, menu, footer, brand lockup, CTA, hero, project grid card,
    carousel ngang.
  - Nhận: mỗi preview render đúng như route demo khi mở cạnh nhau (chụp
    Playwright cùng viewport).
  - Phụ thuộc: T3. Cỡ M.
- [x] T6. Component media và Advertising
  - Làm: README và preview cho media-card, masonry, skeleton, vòng tải,
    primary, suggestion, viewer, filter. Xóa `docs/design/` còn lại.
  - Nhận: như T5; không còn `docs/design/`.
  - Phụ thuộc: T5. Cỡ M.
- [x] T7. DESIGN.md sinh tự động cho Impeccable
  - Làm: `scripts/docs/build-design-md.mjs` sinh `DESIGN.md` từ
    `tokens.json` và `README.md`; chế độ `--check` trong `qa:docs`; chạy
    `impeccable doctor` để rút `.impeccable/design.json` về phần bắt buộc;
    rút surface brief về chiến lược riêng route.
  - Nhận: `impeccable context` đọc được, không `CONTEXT_STALE`; sửa
    `DESIGN.md` bằng tay thì `qa:docs` fail.
  - Phụ thuộc: T6. Cỡ M.
- [x] T8. Publish lên claude.ai
  - Làm: tạo artifact Design System từ `design-system/`; ghi URL vào
    `design-system/README.md`.
  - Nhận: đọc lại artifact thấy đủ token, component, section.
  - Phụ thuộc: T7 đã merge. Cỡ S.

Checkpoint 2: owner mở Design System trên claude.ai, so với demo; duyệt.

## Phase 3: Spec sống theo capability

Mỗi task: viết spec mới từ code, xóa spec và verification cũ được hấp thụ.

- [x] T9. `static-release.md` (pilot) thay `frontend-static-release.md`.
  Checkpoint: owner đọc pilot, xác nhận dễ đọc; chỉnh template nếu cần.
- [x] T10. `site-shell.md` thay `frontend-brand-shell-responsive-runtime.md`,
  `full-menu-reference-parity.md`, `mobile-browser-parity-capability-map.md`
  và verification menu, scrollbar, mobile. Capability map còn phần Advertising
  (skeleton, viewer, history), hấp thụ ở T13, T14.
- [x] T11. `page-home.md` thay phần home của `frontend-route-and-content.md`
  và `frontend-landing-page-foundation.md`.
- [x] T12. `detail-pages.md` cho residential, commercial, about; xóa
  `frontend-route-and-content.md`.
- [x] T13. `advertising-masonry.md` thay grid, random, skeleton, turnkey,
  kiosk, final-polish, media-review và hai capability map Advertising.
  Tách `advertising-skeleton.md` để mỗi spec dưới 300 dòng. Hai capability
  map còn vì STATE và T14, T15 trỏ tới; xóa ở T14, T15.
- [x] T14. `advertising-detail.md` thay `advertising-photo-browse.md`,
  `advertising-photo-morph-scroll.md` và verification history, detail. Xóa luôn
  capability map browser parity và map tháng 09; map random-grid còn cho T15.
- [x] T15. `media-delivery.md` thay `static-image-delivery.md`,
  `image-loading-progress.md`, `site-media-card-playback.md`. Tách `media-card.md`
  để mỗi spec dưới 300 dòng; xóa map random-grid.
- [x] T16. `cms.md` thay `cms-content-publishing.md` và
  `docs/backend/index.md`; bật check ownership ở chế độ fail.
- [x] T16b. Chuyển `loading-glass-and-page-entry.md` và
  `advertising-cta-center-parallax.md` sang format mới tại chỗ (`source: []`,
  vì code thuộc spec khác); ý veil vào thẳng trang chuyển về shell R7. Xóa
  `living-docs-design-system.md` (superseded bởi `docs-system.md`).

Nhận chung mỗi task: spec dưới 300 dòng; mọi R có scenario và dòng trong bảng
Kiểm tra; `qa:docs` xanh; owner đọc được không cần mở spec cũ.

Checkpoint 3: không còn spec format cũ; ownership fail khi có file
`src/site/` chưa có chủ.

## Phase 4: Dọn và rule

- [x] T17. Xóa `docs/verification/`, `docs/archive/`, `docs/reports/`,
  `docs/frontend/`; `docs/architecture/index.md` thành `docs/architecture.md`;
  chuyển output của tooling layout-motion parity sang `.tmp/`; sửa path trong
  code comment. Gate còn mở chuyển vào static-release, advertising-detail,
  site-shell; evidence còn cần đọc trỏ permalink commit `a3428aa`.
- [x] T18. ADR: xóa ADR superseded; thêm ADR "Hệ thống tài liệu" thay
  `living-docs-domain-ownership.md`; cập nhật `git-notion-governance.md`. Xóa 7
  ADR (owner duyệt 4 ADR đã bị spec thay), sửa câu lỗi thời ở 12 ADR; hero giữ
  `2.6s` hay `1s` chuyển vào gate trang chủ.
- [x] T19. `STATE.md` dưới 50 dòng, `index.md` dưới 80 dòng; cập nhật
  `AGENTS.md`, `docs/operations/agent-rule-*.md`, `README.md` (cây thư mục),
  `tests/README.md`; bật budget cho mọi file. Kèm sửa câu Caveman trong TOOLING
  và câu ignore trong graphify.
- [x] T20. Xóa `tasks/archive/` (thread "Rút gọn plan và todo" đã xong); link trong
  `tasks/plan.md`, `tasks/todo.md` trỏ permalink. Plan này xóa khi owner duyệt
  checkpoint cuối, không gộp vào `tasks/plan.md` (checklist xóa khi xong theo
  [ADR hệ thống tài liệu](../docs/decisions/documentation-system.md)).
- [ ] T21. Notion: rút body card về link spec và PR; hỏi owner trước mỗi đợt
  sửa.

Checkpoint cuối: tổng Markdown đang hiệu lực đo bằng `wc -l` giảm mạnh so với
khoảng 23.000 dòng; `qa:docs` xanh với mọi check bật; owner xác nhận đọc được.

## Rủi ro

| Rủi ro | Mức | Giảm thiểu |
| --- | --- | --- |
| Viết spec từ code bỏ sót intent owner đã duyệt | Cao | Đối chiếu spec cũ trước khi xóa; khác biệt vào "Gate còn mở" |
| Thread khác đang sửa spec cũ trong lúc đại tu | Trung bình | Mỗi PR fetch `main` trước; capability nào đang có thread làm thì đợi |
| Preview Design System lệch site thật | Trung bình | `bundle.css` sinh từ CSS website, so ảnh chụp Playwright |
| Impeccable không đọc được `DESIGN.md` sinh ra | Thấp | Giữ đúng format frontmatter hiện tại; kiểm bằng `impeccable context` |
| Graphify index cũ sau khi xóa nhiều file | Thấp | Structural refresh tự chạy; semantic chỉ khi owner yêu cầu |

## Chú thích thuật ngữ

- **Checkpoint**: điểm dừng để kiểm và owner xem trước khi sang phase sau.
- **Pilot**: spec đầu tiên làm thử để chỉnh template.
- **Drift check**: check phát hiện CSS lệch token.
- **Ownership**: mỗi file source thuộc ít nhất một spec.
