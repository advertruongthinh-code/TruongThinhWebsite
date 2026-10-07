# Trạng thái hiện tại

- Updated: 2026-10-07
- Phase: website tĩnh VI/EN. Source `src/site/`, build `.site-output/`; CMS, admin, D1, R2 và
  Worker chưa activate ([CMS](specs/cms.md)).
- Demo: Cloudflare Workers static assets ([quyết định](decisions/cloudflare-workers-static-demo.md)),
  workflow `Deploy demo` tự deploy [demo](https://truong-thinh-demo.truong-thinh-project-tooling.workers.dev/vi/) khi CI xanh
  trên `main` ([cách phát hành](specs/static-release.md#r11-phát-hành-demo-cloudflare)); owner kiểm nhận giao diện trên đó.

## Việc đang làm

- Không thread code nào đang mở. Mọi thay đổi tới `4a8102b` (Advertising, Kính, viewer cử chỉ tay, ảnh kẹt ẩn
  trong masonry) đã lên demo, chờ owner kiểm nhận ([card việc chờ owner](https://app.notion.com/p/3e5332849a0e8183b448fea095f9588f)).
- Card nhiều media M03 tới M09 tạm dừng tới khi owner có ảnh và video thật ([spec](specs/media-card.md)).

## Blocker đã verify

- Owner fact chưa xác nhận: URL Zalo, năm thành lập, bảo hành ([PRODUCT](../PRODUCT.md)).
- Phát hành: LCP residential mobile hai mode ([gate](specs/static-release.md#gate-còn-mở)); các câu
  `[CẦN LÀM RÕ]` nằm ở mục "Gate còn mở" của spec sở hữu ([docs index](index.md)).
- Chờ owner quyết: giữ hay xóa `scripts/site/sanitize-client-logos.ps1`; gộp nhãn trùng giữa
  `photo-tags.mjs` và `catalog.mjs`; bỏ trường không dùng khỏi `catalog-artifact.mjs`.
- Thiết bị: A05s là máy thật đo chuẩn; iPhone Safari theo dõi sau phát hành, không chặn
  ([phát hành tĩnh](specs/static-release.md#gate-còn-mở)).
- Nợ cần phiên PC và A05s cho phiên sau ([card](https://app.notion.com/p/3ef332849a0e8100bbd1e62ad5229067)):
  - A05s: nút Back phần cứng đóng viewer, fps mở và đóng viewer nền blur `50px`
    ([detail](specs/advertising-detail.md#gate-còn-mở)), viewer xoay ngang
    ([viewer chạm](specs/advertising-viewer-touch-zoom.md#gate-còn-mở)), skeleton sau Kính `0.6s`.
  - `mobile-layout-parity`, `scrollbar-parity`, `site-media-card-playback`, `advertising-photo-transitions`,
    `advertising-primary-p14`: chạy ở phiên PC.
  - FPS skeleton (`advertising-continuation` R4), Firefox WebGL (`skeleton-lifecycle`, `mobile-viewport-stability`): cần GPU thật.

## Next action

1. Owner thêm secret `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` cho `Deploy demo`, kiểm nhận demo `4a8102b`, gửi ba fact còn thiếu.

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
