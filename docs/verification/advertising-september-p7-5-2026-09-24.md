# Advertising P7.5 — history, CTA, motion và ảnh gợi ý

Phiên 2026-09-23–24; local port8787. Chưa commit/push/deploy. Contract:
[photo browse P7.5](../specs/advertising-detail.md#r6-slideshow-suggestion).

## Lỗi đã tái hiện và sửa

1. CTA lấy `document.querySelector(footer)` trong khi Barba giữ cả container
   cũ và mới. Footer cũ rời DOM làm height/gap về0; tại1567×910, tail sai811
   hoặc875px thay vì589px. Dùng footer trong chính container: direct và route
   entry đều589px, footer222px. Tại End, copy và footer cùng nằm trọn màn hình.
2. Khi quay từ detail ngắn về grid dài, smooth-scroll dùng limit cũ và clamp
   vị trí trả về. Probe A cần top232,48px nhưng thực tế3451,84px. Update limit
   trước scrollTo sửa lỗi. Navbar All/A-offset/B-center và Back entry được
   kiểm ở1567 và920px; skeleton giữ preset khi quay về cùng mount.
3. Background nay bắt đầu sau morph finish và kéo dài1200ms; opacity lên
   trong420ms, transform tiếp tục780ms. Focused lifecycle kiểm Back/Forward,
   retarget nhanh, scroll trong linger và cleanup. Không thay filter/glass token.
4. Logo collapsed trước bị clamp thành60,39px. Khôi phục49,640625px và căn
   giữa: reference [Espacio Projects](https://espaciohomedesign.com/en/projects)
   tại1567×910 đo x35/y15,375/height49,640625/header81,390625px; local cùng
   số đo. Expanded reference height67,515625px/x35/y35 giữ nguyên.

## Slideshow và media

- Tập ảnh random một lần mỗi tag/document, tối đa9; nhóm đủ4 mới autoplay.
  Chuyển ảnh5s, crossfade1,6s trên ảnh cũ opaque; không có pha tối giữa hai ảnh.
  Không autozoom; active/reduced/hidden/offscreen/pause được giữ.
- Tạo12 ảnh mới bằng image_gen tích hợp, không dùng API fallback. Requested
  model ChatGPT Images2.5, effective unknown do tool không trả metadata model.
  [Prompt/provenance](../../source-assets/projects/advertising/suggestion-slides-20260923/manifest.json),
  [review độc lập](../../source-assets/projects/advertising/suggestion-slides-20260923/review.md),
  [WebP hashes/kích thước](../../source-assets/projects/advertising/suggestion-slides-20260923/exports.json).
- Nguồn12/12 đạt Audit≥9,5/Critique≥8,75. WebP giữ ratio/pixel gốc, bỏ EXIF,
  khoảng60–307KB; riêng urban-residential cao hơn budget275KB vì chi tiết cây
  và bối cảnh, đã xem bản xuất. Không crop source để tăng số lượng.
- Gắn office-signs-wayfinding14–25 đúng bốn product tag04/08/09/12; mỗi nhóm
  có4 ảnh. Catalog127 ảnh/dataset2026-09-23.1. Crop có focal position riêng
  cho banner; primary/grid vẫn hiển thị trọn ảnh. Main xem desktop/mobile và
  ảnh xuất; không dùng PNG source PASS để tự coi mọi crop đã đạt.

## Verification

- `pnpm prepare:site`, `pnpm qa:static`: PASS.
- Media/layout/lifecycle Node:35/35 PASS, gồm uniqueness, pixel thật,
  taxonomy, sourceOrder và ma trận layout All/sáu filter.
- `advertising-return-p74.e2e.mjs`:8 scenario PASS (Back/navbar/B tại1567 và920;
  CTA/footer/reload/white-edge tại1567 và390, height910).
- `advertising-route-footer-p75.e2e.mjs`: direct/route CTA cùng589px; hash
  geometry sau media mới `2dbdda21:589.000:12406.440`; sáu filter lặp và reload
  giữ tọa độ/tail.
- `advertising-photo-transitions.e2e.mjs`, CASE=morph-backdrop-lifecycle:
  PASS contract tuần tự và linger; không gọi toàn suite transitions là PASS.
- `advertising-slideshow-p75.e2e.mjs`: PASS crossfade/no-autozoom/active,
  bốn nhóm mới đều đổi ảnh, bật reduced giữa fade dừng và không tái chạy.
- `advertising-suggestion-motion.e2e.mjs`: PASS hover, active, fixed slot,
  reduced motion và direct URL. Impeccable detect targeted: exit0.
- `advertising-hero-once.e2e.mjs`: PASS delayed adapter, mười lần filter,
  route entry/return VI/EN, locale giữa intro và fallback; filter không re-arm
  hero trong các probe. Lỗi owner nói không nhất quán nên vẫn giữ owner check.
- Detector trên toàn thư mục Advertising vẫn nêu13 heuristic về font,
  marquee, leading/padding và màu trắng tĩnh; không dùng exit0 như bằng chứng
  mọi heuristic đã sạch. Font/marquee thuộc thiết kế đã chốt; lượt này không
  tự redesign theo gợi ý detector. Screenshot runtime dùng để kiểm scope sửa.
- Screenshot local trong `.tmp/p75-suggestion-desktop.png` và
  `.tmp/p75-suggestion-mobile.png`; runtime in-app browser đã xem tại1567×910.

## Giới hạn và việc còn mở

- Chưa tái hiện chính xác vạch màu trong frame kéo scrollbar owner báo;
  white-edge tĩnh đạt không chứng minh mọi compositing frame đều đạt.
- Ngày2026-09-24, owner xác nhận giữ12 ảnh mới đã tích hợp và kết thúc đợt
  bổ sung này. Thêm163 ảnh cho67 nhóm còn lại nằm ngoài phạm vi đã chọn;
  không còn là câu hỏi scope chờ owner.
- Owner visual, Galaxy A54 thật, P3-T08 và full-site parity tiếp tục mở;
  các focused checks trên không đổi kết luận toàn site thành PASS.

## Chú thích thuật ngữ

- **Offset**: vị trí card tương đối trong viewport.
- **Lingering**: phần chuyển động nền tiếp diễn sau morph chính.
- **Focal position**: vùng trọng tâm khi cover ảnh làm nền nút; không sửa source.
