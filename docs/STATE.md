# Trạng thái hiện tại

- Updated: 2026-10-21
- Phase: website tĩnh VI/EN. Source `src/site/`, build `.site-output/`; CMS, admin, D1, R2 và
  Worker chưa activate ([CMS](specs/cms.md)). Phát hành chính thức trên `truongthinhads.vn` chờ xong CMS.
- Demo: Cloudflare Workers static assets ([quyết định](decisions/cloudflare-workers-static-demo.md)),
  workflow `Deploy demo` tự deploy [demo](https://truong-thinh-demo.truong-thinh-project-tooling.workers.dev/vi/) khi CI xanh
  trên `main` ([cách phát hành](specs/static-release.md#r11-phát-hành-demo-cloudflare)); owner kiểm nhận giao diện trên đó.

## Việc đang làm
- [Kiểm chứng bug audit](https://app.notion.com/p/400332849a0e81aca29bdcc5057afb72): test hồi quy và PR; tail-packing chưa xác nhận.

- PR đang mở xem [GitHub](https://github.com/advertruongthinh-code/TruongThinhWebsite/pulls). Thay đổi đã merge tự lên demo,
  chờ owner kiểm nhận ([card việc chờ owner](https://app.notion.com/p/3e5332849a0e8183b448fea095f9588f)).
- Card nhiều media M03 tới M09 tạm dừng tới khi owner có ảnh và video thật ([spec](specs/media-card.md)).
- Từ khóa SEO tạm dừng tới khi site đủ feature ([card](https://app.notion.com/p/3f5332849a0e812d88d1d97ea66cb79b)).

## Blocker đã verify

- Owner fact chưa xác nhận: năm thành lập, bảo hành ([PRODUCT](../PRODUCT.md)).
- Phát hành: LCP residential mobile hai mode ([gate](specs/static-release.md#gate-còn-mở)); các câu
  `[CẦN LÀM RÕ]` nằm ở mục "Gate còn mở" của spec sở hữu ([docs index](index.md)).
- Chờ owner quyết: giữ hay xóa `scripts/site/sanitize-client-logos.ps1`; gộp nhãn trùng giữa
  `photo-tags.mjs` và `catalog.mjs`; bỏ trường không dùng khỏi `catalog-artifact.mjs` (sinh từ `prepare-static-assets.mjs`).
- Nợ phone và GPU: đã đo bù 2026-10-18 trên Galaxy A04s SM-A047F (máy đo chuẩn, nối adb debug,
  [card](https://app.notion.com/p/3ef332849a0e8100bbd1e62ad5229067)). Còn lại:
  - Owner báo 18/10 trên phone: motion không mượt (nhất là logo); gradient đứng yên khi vuốt nhanh masonry; A04s
    (viewport 384px) chữ nhảy dòng, A05s cũ (411px) ổn. Điều phối đã giao thread sửa.
  - Thread sở hữu: long task khi mở detail trên phone (gate 50ms, [số đo](specs/advertising-detail.md#gate-còn-mở)); 2 ca Chromium flaky của `advertising-photo-transitions`;
    fault thật còn lại của `mobile-layout-parity` ở trang chủ (chữ 200%, `motion.js` vắng: khối closer "Giữ nghề" rộng hơn `line-mask` 1,3px).
- Repo public (2026-10-15); CI, Docs, Deploy demo chạy trên `ubuntu-latest` ([R10](specs/static-release.md#r10-gate-ci)).
- PR tự merge khi CI và Docs xanh (workflow `Automerge`, [R10](specs/static-release.md#r10-gate-ci)); giữ PR lại bằng draft hoặc nhãn `hold`.

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
