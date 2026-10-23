# Plan: Design System gọn, preview đúng demo, hover filter như nav

Spec: [design-system.md](../docs/specs/design-system.md), [advertising-taxonomy R3](../docs/specs/advertising-taxonomy.md#r3-rail-cụm-và-sản-phẩm).
Card: [Notion](https://app.notion.com/p/402332849a0e810a8466d402f82313c3). Một PR code, mỗi task một commit.

## Quyết định

- Chặn điều hướng bằng script boot (`click` capture, `preventDefault` trên `a[href]`), không xóa `href`: CSS
  `a[href]` và hover vẫn đúng.
- Gallery và Kính chuyển sang bản chụp (`capture-design-system.mjs`), như card Advertising: dải chấm và kính do
  runtime dựng.
- Hạt kính: một PNG nhiễu xám nhỏ sinh bằng `sharp` (đã là devDependency) vào `preview-media/`, gán vào
  `--glass-grain` lúc build. Không chạy `glass-surface.mjs` trong preview.
- Hover filter chỉ CSS: `::after` scaleX như `.desktop-nav a`, trong `@media (hover: hover)`; reduced motion bỏ
  transition.

## Task

1. **Hover filter như nav** (S). `src/site/detail.css`: `.project-filter`, `.rail-chip` dùng `::after` 3px và 2px,
   0.3s `cubic-bezier(0.4, 0, 0, 1)`; mục `aria-current` giữ gạch chân. Thêm assert vào
   `tests/site/advertising-rail-two-tier.e2e.mjs` (hover đổi `transform` của `::after`). Cập nhật
   `design-system/components/Filter/README.md`, `motion.md`; build lại `bundle.css`.
   Kiểm: test e2e đó, `pnpm qa:docs`, Playwright desktop hover thấy gạch chân chạy.
2. **Preview không điều hướng** (S). `scripts/docs/build-design-system.mjs`: hai loại boot script thêm chặn
   click link. Kiểm: render local từng card, bấm mọi link, URL frame không đổi; tìm ra và sửa card nền tối trống.
3. **Gallery từ bản chụp** (S). `capture-design-system.mjs` thêm Gallery (`/vi/residential/`,
   `.detail-gallery`); build đổi Gallery sang capture. Kiểm: render 1440 so với trang thật, có dải chấm.
4. **Kính giống trang chi tiết** (M). Capture `.advertising-photo-view__hero-frame` từ route ảnh; build sinh PNG
   hạt và gán `--glass-grain`. Kiểm: render 1440 so với ảnh chụp trang chi tiết.

Checkpoint A: `node scripts/docs/build-design-system.mjs --check`, `pnpm qa:docs`, ảnh render local 19 card.

5. **Bỏ trang chờ code** (S). Xóa `design-system/approved-designs.md`; sửa `AGENTS.md`, `design-system/README.md`,
   `motion.md`, `advertising-taxonomy.md` (giữ 300 dòng). Kiểm: `pnpm qa:docs` (link).
6. **README gọn** (M). Bỏ quy trình, lệnh, bảng số đo (đã có ở README component), viết gọn từng mục; tối đa 150
   dòng; dọn đoạn trùng với `brand.md`, `motion.md`, `content.md`. Kiểm: `wc -l`, `pnpm qa:docs`.
7. **DESIGN.md trỏ về Design System** (M). `build-design-md.mjs`: tám mục, mỗi mục đoạn đầu cộng link; sidecar
   thêm `motion`, `breakpoints`. Kiểm: `--check`, `impeccable context`, `impeccable doctor`.

Checkpoint B: ponytail-review, five-axis review, PR, CI xanh, merge.

8. **Republish** khi owner gõ `republish` (gộp đợt với card Hero slideshow nếu đã merge), gỡ file thừa, ghi
   `lastChange`, đóng Gate trong spec, card Done.

## Rủi ro

| Rủi ro | Xử lý |
| --- | --- |
| `::after` của filter đụng style mobile hoặc tầng chip đang có | Chỉ trong `@media (hover: hover)`; chạy `mobile-layout-parity` |
| Hạt PNG khác hạt runtime | Chỉ cần nhìn tương đương (spec R3.9); owner kiểm trên claude.ai |
| Thread Hero slideshow đổi `design-system/` cùng lúc | Merge `main` trước mỗi push; republish một đợt |
| Bản chụp Gallery lệch seed hoặc ảnh | Ảnh chỉ minh họa (R3.7); bố cục mới cần khớp |

## Chú thích thuật ngữ

- **Checkpoint**: điểm dừng kiểm toàn bộ trước khi sang nhóm task kế.
- **Bản chụp (capture)**: markup trang thật lưu lại cho preview.
