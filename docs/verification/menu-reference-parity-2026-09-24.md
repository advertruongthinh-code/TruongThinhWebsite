# Kiểm chứng MENU-R1 — 2026-09-24

## Thay đổi

- Chỉ sửa layout menu mở trong `src/site/style.css`; không sửa runtime,
  SVG hoặc HTML, nội dung, navbar đóng. Build đồng bộ10 inline consumer
  bằng pipeline hiện hữu.
- Head dùng100vw, track logo170px để định vị các vùng như reference;
  logo giữ chiều rộng theo ratio riêng. Ngôn ngữ dùng chiều rộng nội dung,
  CTA căn giữa track, X dịch phải10px. Lề35/25px, logo67,515625/59,578125px.
- Mobile≤578: logo/X hàng1, ngôn ngữ hàng2, CTA có chữ hàng3.
  Nhóm title1,8rem, link line22,4px, gap15px và khoảng cuối15px.
  Menu scroll area lấp phần còn lại, không dùng chiều cao trừ số cố định.
- Cập nhật ba assertion static cũ về track và width để theo contract mới;
  giữ các assertion khác. Test mới kiểm geometry thực thay vì chỉ regex.

## Evidence

1. RED: `node tests/site/menu-reference-parity.e2e.mjs` thất bại tại
   vi/320, menu head337,625px thay vì320px trước sửa.
2. GREEN: cùng lệnh đạt28 geometry case VI/EN ở14 width320–1920px,
   10 flow trên5 route VI/EN (focus trong dialog, synthetic touch scroll,
   nền không cuộn, landscape844×390, Escape), hai case text zoom200%.
   Test reduced motion dùng cho geometry; normal motion dùng cho10 flow.
   JSON đo: `.tmp/menu-r1/geometry.json`.
3. `pnpm prepare:site`, `pnpm qa:static`,
   `node --test tests/site/shared-header-menu-p7.test.mjs` đạt; Node7/7.
4. Browser Codex: đã xem desktop1567×910 và mobile390×844; console error
   không có khi kiểm. Đã reset viewport override và mở menu preview cuối.
5. Impeccable detect toàn `style.css`:20 cảnh báo/advisory
   (font hiện hữu1, màu3, type ramp16). Không sửa palette hoặc font ngoài
   scope; menu-title đã thêm vào DESIGN và sidecar. Không gọi detector sạch.

## Giới hạn

- Giữ Plus Jakarta Sans, logo và copy Trường Thịnh: text width và xuống dòng
  không thể đồng nhất pixel với Silka/nội dung Espacio. Anchor vùng tương ứng,
  chiều cao logo/head và breakpoint được đối chiếu; không ép biến dạng chữ.
- Touch được mô phỏng Chromium, chưa kiểm trên Samsung hoặc iPhone thật.
  Owner visual acceptance và full-site parity vẫn mở.
- Không commit, push, deploy hoặc cập nhật card Notion. Worktree có nhiều
  thay đổi trước task; không dùng toàn bộ git diff như diff riêng MENU-R1.
- Graphify structural query đã chạy;246 semantic file pending được báo lúc
  khảo sát, không chạy semantic extraction.

## Chú thích thuật ngữ

- **RED/GREEN**: test tái hiện lỗi trước sửa và đạt sau sửa.
- **Anchor**: cạnh hoặc tâm vùng dùng để căn phần tử.
- **Synthetic touch**: thao tác chạm mô phỏng, không phải thiết bị thật.
