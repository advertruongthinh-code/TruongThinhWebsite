# Trạng thái hiện tại

- Updated: 2026-10-05
- Phase: website tĩnh VI/EN. Source `src/site/`, build `.site-output/`; CMS, admin, D1, R2 và
  Worker chưa activate ([CMS](specs/cms.md)).
- Demo: Cloudflare Workers static assets ([quyết định](decisions/cloudflare-workers-static-demo.md)),
  deploy gần nhất 2026-10-05 commit `40e5f11` ([cách phát hành](specs/static-release.md#r11-phát-hành-demo-cloudflare)).
  Owner kiểm nhận giao diện trên [demo](https://truong-thinh-demo.truong-thinh-project-tooling.workers.dev/vi/).

## Việc đang làm

- Đại tu docs: [spec](specs/docs-system.md), [plan](../tasks/docs-overhaul-plan.md),
  [card](https://app.notion.com/p/3ef332849a0e81f3ad86f1fd913afab7); T1 tới T20 xong, còn T21 (Notion).
- Sửa code lệch thiết kế (owner chọn 05/10): intro header dưới veil, header cuối trang, menu About,
  hover ảnh trang con, scroll cue, Back/Forward Advertising đã merge (PR #104, #109, #116, #119); còn đo
  A05s và WebKit ([card](https://app.notion.com/p/3f0332849a0e81daa6d4dd730b393d47)).
- Vào thẳng ảnh Advertising: Layout đầu trang bỏ menu đóng và masonry (cloud `~107ms` xuống `~35ms`), A05s chưa đo lại ([gate Kính](specs/glass-surface.md#gate-còn-mở)).
- Advertising (grid ngẫu nhiên, tải ảnh, M02b, skeleton, Kính, CTA) đã lên `main`, owner chưa nghiệm thu
  trên demo ([plan](../tasks/plan.md#advertising-random-grid-và-tải-ảnh--plan-duyệt-2026-10-03)).
- Card nhiều media M03 tới M09 tạm dừng tới khi owner có ảnh và video thật ([spec](specs/media-card.md)).

## Blocker đã verify

- Thiết bị: iPhone chưa kết nối, Galaxy A54 chưa có; A05s là máy thật duy nhất
  ([gate shell](specs/site-shell.md#gate-còn-mở)).
- Phát hành: smoke toàn site còn 53 FAIL có từ trước; parity Espacio chờ owner quyết còn là gate hay
  không; LCP residential mobile hai mode ([gate](specs/static-release.md#gate-còn-mở)).
- Owner fact chưa xác nhận: URL Zalo, năm thành lập, bảo hành ([PRODUCT](../PRODUCT.md)).
- Gate từng phần nằm ở mục "Gate còn mở" của spec sở hữu ([docs index](index.md)).

## Next action

1. Owner kiểm nhận đợt Advertising trên demo.
2. Đo lại task dài khi vào thẳng ảnh trên A05s (máy PC).
3. Đại tu docs T21, rồi owner duyệt checkpoint cuối.

## Ranh giới

- Mỗi lần deploy cần owner đồng ý. Không activate CMS, đổi domain hoặc audience, publish ảnh chưa duyệt.
- Không bypass Git hook; giữ nguồn ảnh, archive và thay đổi không liên quan.
- Cloud first: mỗi task một branch ngắn và PR vào `main`; Remote Control trên PC chỉ khi cần máy thật
  ([TOOLING](operations/TOOLING.md#claude-code-cloud-environment)).
- [Backlog Notion](https://app.notion.com/p/3e5332849a0e8183b448fea095f9588f),
  [cây project](../README.md#cây-thư-mục-và-trạng-thái).

## Chú thích thuật ngữ

- **Dormant**: source có nhưng chưa dùng trong runtime public.
- **Gate**: điều kiện phải đạt trước khi merge hoặc nghiệm thu.
