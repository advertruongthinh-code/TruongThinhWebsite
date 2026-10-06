# Trạng thái hiện tại

- Updated: 2026-10-06
- Phase: website tĩnh VI/EN. Source `src/site/`, build `.site-output/`; CMS, admin, D1, R2 và
  Worker chưa activate ([CMS](specs/cms.md)).
- Demo: Cloudflare Workers static assets ([quyết định](decisions/cloudflare-workers-static-demo.md)),
  deploy gần nhất 2026-10-06 commit `29322d8` ([cách phát hành](specs/static-release.md#r11-phát-hành-demo-cloudflare)).
  Owner kiểm nhận giao diện trên [demo](https://truong-thinh-demo.truong-thinh-project-tooling.workers.dev/vi/).

## Việc đang làm

- Vào thẳng ảnh Advertising gần đạt gate long task trên A05s 05/10: 14/15 lần không task trên `50ms`, một lần `67ms` ở bước related; bấm card related đạt sau PR #135 (0/3 lần không trace có task trên `50ms`) ([gate Kính](specs/glass-surface.md#gate-còn-mở)).
- Advertising (grid ngẫu nhiên, tải ảnh, M02b, skeleton, Kính, CTA) đã lên `main`, owner chưa nghiệm thu
  trên demo ([plan](../tasks/plan.md#advertising-random-grid-và-tải-ảnh--plan-duyệt-2026-10-03)).
- Card nhiều media M03 tới M09 tạm dừng tới khi owner có ảnh và video thật ([spec](specs/media-card.md)).

## Blocker đã verify

- Thiết bị: iPhone chưa kết nối, Galaxy A54 chưa có; A05s là máy thật duy nhất
  ([gate shell](specs/site-shell.md#gate-còn-mở)).
- Phát hành: parity Espacio chờ owner quyết còn là gate hay không; LCP residential mobile hai mode
  ([gate](specs/static-release.md#gate-còn-mở)).
- Owner fact chưa xác nhận: URL Zalo, năm thành lập, bảo hành ([PRODUCT](../PRODUCT.md)).
- Gate từng phần nằm ở mục "Gate còn mở" của spec sở hữu ([docs index](index.md)).

## Next action

1. Owner kiểm nhận đợt Advertising trên demo.

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
