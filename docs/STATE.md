# Trạng thái hiện tại

- Updated: 2026-11-11
- Phase: website tĩnh VI/EN. Source `src/site/`, build `.site-output/`; CMS, admin, D1, R2 và
  Worker chưa activate ([CMS](specs/cms.md)). Phát hành chính thức trên `truongthinhads.vn` chờ xong CMS.
- Demo: Cloudflare Workers static assets ([quyết định](decisions/cloudflare-workers-static-demo.md)),
  workflow `Deploy demo` tự deploy [demo](https://truong-thinh-demo.truong-thinh-project-tooling.workers.dev/vi/) khi CI xanh
  trên `main` ([cách phát hành](specs/static-release.md#r11-phát-hành-demo-cloudflare)); owner kiểm nhận giao diện trên đó.

## Việc đang làm
- PR mở: [GitHub](https://github.com/advertruongthinh-code/TruongThinhWebsite/pulls); đã merge tự lên demo, chờ owner kiểm nhận ([card](https://app.notion.com/p/3e5332849a0e8183b448fea095f9588f)).
- Nước rút tới CMS: trang Công trình, dải công trình và News dựng từ khối ([spec #691](https://github.com/advertruongthinh-code/TruongThinhWebsite/pull/691), #694, #701, sáu trang lọc theo loại #703); hero, kicker trang Công trình đang chỉnh. CMS editor, quyền, publish do thread CMS sở hữu ([CMS](specs/cms.md)).
- Menu sáu nhóm có Công trình (#704, #705), navbar có Công trình (#708); lỗi chữ menu chồng trang ở lần mở đầu sau khi chuyển trang sửa ở #713.
- Ảnh: phone chỉ WebP tới 960, PC JXL (WebP dự phòng) tới 4K ([progressive-loading](specs/progressive-loading.md), #690); vuốt nhanh masonry #687, #692. Còn gate R8 trong spec.
- [Audit ảnh toàn site](https://app.notion.com/p/400332849a0e8130b294c355522bbed4): owner duyệt từng đợt. SEO từ khóa: bản đồ từ khóa cho trang Công trình và Advertising chờ owner duyệt ([card](https://app.notion.com/p/3f5332849a0e812d88d1d97ea66cb79b)).
- Card nhiều media: runtime, player, viewer đã vào `main` (#434), mỗi card vẫn một ảnh; gộp ảnh làm đợt khác ([card](https://app.notion.com/p/3ef332849a0e81978563c89bcb5d1ffc), [spec](specs/media-card.md)).
- [Bug audit](https://app.notion.com/p/400332849a0e81aca29bdcc5057afb72): nhánh `ap7oez` còn trên remote, trạng thái fix skeleton, swipe: unknown.

## Blocker đã verify

- Owner fact chưa xác nhận: năm thành lập, bảo hành ([PRODUCT](../PRODUCT.md)).
- Phát hành: LCP residential mobile hai mode ([gate](specs/static-release.md#gate-còn-mở)); các câu
  `[CẦN LÀM RÕ]` nằm ở mục "Gate còn mở" của spec sở hữu ([docs index](index.md)).
- Chờ owner quyết: gộp nhãn trùng giữa
  `photo-tags.mjs` và `catalog.mjs`; bỏ trường không dùng khỏi `catalog-artifact.mjs` (sinh từ `prepare-static-assets.mjs`).
- Máy đo chuẩn: Galaxy A04s SM-A047F qua adb ([Android thật](operations/android-real-device-debugging.md)); A05s là máy cũ.
  Nợ phone và GPU ([card](https://app.notion.com/p/3ef332849a0e8100bbd1e62ad5229067)), số đo cũ 2026-10-18, chưa đo lại:
  - Owner báo 18/10 trên phone: motion không mượt (nhất là logo); gradient đứng yên khi vuốt nhanh masonry; A04s
    (viewport 384px) chữ nhảy dòng, A05s cũ (411px) ổn. Điều phối đã giao thread sửa.
  - Thread sở hữu: long task khi mở detail trên phone (gate 50ms, [số đo](specs/advertising-detail.md#gate-còn-mở)); ca Chromium flaky `m02b-grid-detail-no-clone-no-jump` của `advertising-photo-transitions` (P13 sửa ở PR #511);
    fault thật còn lại của `mobile-layout-parity` ở trang chủ (chữ 200%, `motion.js` vắng: khối closer "Giữ nghề" rộng hơn `line-mask` 1,3px).
- Repo public (2026-10-15); CI, Docs, Deploy demo chạy trên `ubuntu-latest`; PR tự merge khi CI và Docs xanh (workflow `Automerge`, [R10](specs/static-release.md#r10-gate-ci)), giữ lại bằng draft hoặc nhãn `hold`.

## Next action

1. Owner kiểm nhận [demo](https://truong-thinh-demo.truong-thinh-project-tooling.workers.dev/vi/) bản `main` mới nhất, gửi hai fact còn thiếu.

## Ranh giới

- Agent không deploy tay. Không activate CMS, đổi domain hoặc audience, publish ảnh chưa duyệt.
- Không bypass Git hook; giữ nguồn ảnh, archive và thay đổi không liên quan.
- Cloud first: mỗi task một branch ngắn và PR vào `main`; Remote Control trên PC chỉ khi cần máy thật
  ([TOOLING](operations/TOOLING.md#claude-code-cloud-environment)).
- [Backlog Notion](https://app.notion.com/p/3b5332849a0e80689b46e724fa43e480),
  [cây project](../README.md#cây-thư-mục-và-trạng-thái).

## Chú thích thuật ngữ

- **Dormant**: source có nhưng chưa dùng trong runtime public.
- **Gate**: điều kiện phải đạt trước khi merge hoặc nghiệm thu.
