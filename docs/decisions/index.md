# Decision index

Status lấy từ frontmatter từng ADR. Decision trùng chủ đề được gộp vào ADR chủ,
ghi file gốc ở mục `Lịch sử`; bản gốc còn trong Git history.
[Living-docs ownership](living-docs-domain-ownership.md) cập nhật tổ chức docs;
[Git–Notion governance](git-notion-governance.md) tiếp tục giữ boundary.

## Decision có hiệu lực

| Ngày | Status | Decision |
| --- | --- | --- |
| 2026-07-30 | accepted | [Xanh/cam là accent](accent-color-roles.md) |
| 2026-07-31 | accepted | [Defense in depth cho admin](admin-defense-in-depth.md) |
| 2026-09-01 | accepted | [Lưới organic Sản phẩm quảng cáo với spacing Espacio và phân bổ media độc lập](advertising-organic-masonry-espacio-spacing-media-distribution.md) |
| 2026-09-01 | accepted | [Agent Skills dùng chung cho mọi host agent](agent-skills-workflow.md) |
| 2026-08-09 | accepted | [Caveman ultra và rule module](caveman-ultra-agent-rules.md) |
| 2026-10-03 | accepted | [Skill vendor vào .claude từ pin](claude-skills-vendored-from-pins.md) |
| 2026-10-03 | accepted | [Demo tĩnh chạy trên Cloudflare Workers static assets](cloudflare-workers-static-demo.md) |
| 2026-07-31 | accepted | [Content/media có guide và thứ tự bảo trì rõ](content-media-maintenance.md) |
| 2026-07-31 | accepted | [D1 SSR luôn ưu tiên hơn shell fallback](d1-ssr-static-fallback.md) |
| 2026-07-30 | accepted | [Chính sách editorial image](editorial-image-policy.md) |
| 2026-08-09 | accepted | [Quản trị Git–Notion](git-notion-governance.md) |
| 2026-08-26 | accepted | [Địa chỉ trụ sở đã được owner xác nhận](head-office-address-confirmed.md) |
| 2026-08-01 | accepted | [Heritage montage theo nhịp compact của reference](heritage-montage-density.md) |
| 2026-08-01 | accepted | [Home hero dùng cross-fade có drift chồng nhịp](home-hero-crossfade-drift.md) |
| 2026-08-21 | accepted | [Chuyển locale tại chỗ và replay section đang xem](in-place-locale-switch.md) |
| 2026-08-09 | accepted | [Evidence browser QA tương tác](interactive-browser-qa.md) |
| 2026-09-09 | accepted | [Living docs theo domain và baseline Espacio có provenance](living-docs-domain-ownership.md) |
| 2026-07-31 | accepted | [Worker CMS và locale URL là canonical](locale-prefixed-worker-routes.md) |
| 2026-08-01 | accepted | [Full menu sở hữu locale và appointment control](menu-owns-locale-appointment.md) |
| 2026-07-30 | accepted | [Motion nâng trải nghiệm, không giữ content làm con tin](motion-keeps-content-visible.md) |
| 2026-08-09 | accepted | [Graphify và Serena dùng hook, watcher native và wrapper freshness](native-graphify-hooks-and-watcher.md) |
| 2026-08-01 | accepted | [CMS project slot là optional trên static menu baseline](optional-cms-project-slots.md) |
| 2026-07-30 | accepted | [Owner fact không được suy đoán](owner-facts-require-confirmation.md) |
| 2026-07-30 | accepted | [Process là invariant](process-order-invariant.md) |
| 2026-07-31 | accepted | [Reference archive tách khỏi runtime](reference-archive-isolated.md) |
| 2026-07-30 | accepted | [Motion map theo web tham khảo, không nhập bundle production](reference-motion-map.md) |
| 2026-07-30 | accepted | [Header route-first, không dùng fragment navigation](route-first-navigation.md) |
| 2026-08-08 | accepted | [Repository boundary theo runtime responsibility](runtime-responsibility-boundaries.md) |
| 2026-08-31 | accepted | [SplitText chỉ áp dụng cho editorial reveal đã khai báo](selective-splittext-editorial-reveals.md) |
| 2026-08-30 | accepted | [Sáu trang nhóm Sản phẩm quảng cáo dùng một shared detail template](shared-advertising-product-detail-template.md) |
| 2026-07-30 | accepted | [Static architecture dùng chung](static-shared-architecture.md) |
| 2026-08-01 | accepted | [Readability tiếng Việt ưu tiên hơn mật độ reference](vietnamese-readability.md) |
| 2026-07-30 | accepted | [VI source, EN qua data attribute](vietnamese-source-english-leaf-attributes.md) |
| 2026-08-27 | accepted | [Typography nhìn thấy theo cap-height Espacio](visible-typography-espacio-parity.md) |
| 2026-09-01 | accepted | [Khóa Wrangler đến phase CMS](wrangler-deferred-until-cms.md) |

Decision đã supersede được gộp vào ADR chủ ngày 2026-10-03 (mục Lịch sử); bản gốc còn trong Git history.
Ngoại lệ còn giữ file vì decision mới dẫn trực tiếp:

| Ngày | Status | Decision |
| --- | --- | --- |
| 2026-09-24 | superseded | [Sites chỉ nhận artifact tĩnh, GitHub giữ source và test](sites-artifact-only-release-mirror.md) |

## Chú thích thuật ngữ

- **ADR**: bản ghi quyết định kiến trúc hoặc chính sách bền vững.
- **Accepted**: decision được chấp nhận trong scope đã ghi.
- **Superseded**: có decision thay thế; giữ lịch sử để truy nguyên.
