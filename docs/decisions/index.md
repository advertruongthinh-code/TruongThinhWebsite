# Decision index

Status lấy từ frontmatter từng ADR. Decision trùng chủ đề được gộp vào ADR chủ,
ghi file gốc ở mục `Lịch sử`. ADR bị thay thì xóa khỏi cây; ADR mới ghi
permalink bản cũ ở `supersedes`, Git history giữ bản gốc
([hệ thống tài liệu](documentation-system.md)).

## Decision có hiệu lực

| Ngày | Status | Decision |
| --- | --- | --- |
| 2026-10-10 | accepted | [Trên 60fps trên phone Android](phone-frame-budget.md) |
| 2026-07-30 | accepted | [Xanh/cam là accent](accent-color-roles.md) |
| 2026-07-31 | accepted | [Defense in depth cho admin](admin-defense-in-depth.md) |
| 2026-09-01 | accepted | [Agent Skills dùng chung cho mọi host agent](agent-skills-workflow.md) |
| 2026-10-04 | accepted | [Skill Claude chỉ đến từ plugin pin ở user scope](claude-skills-from-pinned-plugins.md) |
| 2026-10-03 | accepted | [Demo tĩnh chạy trên Cloudflare Workers static assets](cloudflare-workers-static-demo.md) |
| 2026-07-31 | accepted | [D1 SSR luôn ưu tiên hơn shell fallback](d1-ssr-static-fallback.md) |
| 2026-10-04 | accepted | [Hệ thống tài liệu](documentation-system.md) |
| 2026-07-30 | accepted | [Chính sách editorial image](editorial-image-policy.md) |
| 2026-08-09 | accepted | [Quản trị Git–Notion](git-notion-governance.md) |
| 2026-08-26 | accepted | [Địa chỉ trụ sở đã được owner xác nhận](head-office-address-confirmed.md) |
| 2026-08-01 | accepted | [Heritage montage theo nhịp compact của reference](heritage-montage-density.md) |
| 2026-08-01 | accepted | [Home hero dùng cross-fade có drift chồng nhịp](home-hero-crossfade-drift.md) |
| 2026-08-21 | accepted | [Chuyển locale tại chỗ và replay section đang xem](in-place-locale-switch.md) |
| 2026-08-09 | accepted | [Evidence browser QA tương tác](interactive-browser-qa.md) |
| 2026-07-31 | accepted | [Worker CMS và locale URL là canonical](locale-prefixed-worker-routes.md) |
| 2026-08-01 | accepted | [Full menu sở hữu locale và appointment control](menu-owns-locale-appointment.md) |
| 2026-07-30 | accepted | [Motion nâng trải nghiệm, không giữ content làm con tin](motion-keeps-content-visible.md) |
| 2026-08-09 | accepted | [Graphify dùng hook, watcher native và wrapper freshness](native-graphify-hooks-and-watcher.md) |
| 2026-08-01 | accepted | [CMS project slot là optional trên static menu baseline](optional-cms-project-slots.md) |
| 2026-07-30 | accepted | [Owner fact không được suy đoán](owner-facts-require-confirmation.md) |
| 2026-07-30 | accepted | [Process là invariant](process-order-invariant.md) |
| 2026-07-30 | accepted | [Motion map theo web tham khảo, không nhập bundle production](reference-motion-map.md) |
| 2026-07-30 | accepted | [Header route-first, không dùng fragment navigation](route-first-navigation.md) |
| 2026-08-08 | accepted | [Repository boundary theo runtime responsibility](runtime-responsibility-boundaries.md) |
| 2026-08-31 | accepted | [SplitText chỉ áp dụng cho editorial reveal đã khai báo](selective-splittext-editorial-reveals.md) |
| 2026-07-30 | accepted | [Static architecture dùng chung](static-shared-architecture.md) |
| 2026-08-01 | accepted | [Readability tiếng Việt ưu tiên hơn mật độ reference](vietnamese-readability.md) |
| 2026-07-30 | accepted | [VI source, EN qua data attribute](vietnamese-source-english-leaf-attributes.md) |
| 2026-08-27 | accepted | [Typography nhìn thấy theo cap-height](visible-typography-cap-height.md) |
| 2026-09-01 | accepted | [Khóa Wrangler đến phase CMS](wrangler-deferred-until-cms.md) |

## Chú thích thuật ngữ

- **ADR**: bản ghi quyết định kiến trúc hoặc chính sách bền vững.
- **Accepted**: decision được chấp nhận trong scope đã ghi.
- **Superseded**: có decision thay thế; file bị xóa, Git history giữ bản gốc.
