# Decision index

Status lấy từ từng ADR; file cũ vẫn có thể accepted. Không gộp hoặc xóa
accepted decision chỉ vì ngắn. Decision thay thế phải dẫn rõ supersession.
[Living-docs ownership](living-docs-domain-ownership.md) cập nhật tổ chức docs;
[Git–Notion governance](git-notion-governance.md) tiếp tục giữ boundary.

## Decision có hiệu lực

| Ngày | Status | Decision |
| --- | --- | --- |
| 2026-07-30 | accepted | [Xanh/cam là accent](accent-color-roles.md) |
| 2026-07-31 | accepted | [Defense in depth cho admin](admin-defense-in-depth.md) |
| 2026-09-01 | accepted | [Lưới organic Sản phẩm quảng cáo với spacing Espacio và phân bổ media độc lập](advertising-organic-masonry-espacio-spacing-media-distribution.md) |
| 2026-08-09 | accepted | [Caveman ultra và rule module](caveman-ultra-agent-rules.md) |
| 2026-09-01 | accepted | [Codex native với Agent Skills user-global](codex-native-agent-skills-workflow.md) |
| 2026-07-31 | accepted | [Content/media có guide và thứ tự bảo trì rõ](content-media-maintenance.md) |
| 2026-07-31 | accepted | [D1 SSR luôn ưu tiên hơn shell fallback](d1-ssr-static-fallback.md) |
| 2026-07-30 | accepted | [Chính sách editorial image](editorial-image-policy.md) |
| 2026-08-01 | accepted | [Public navigation không dùng fragment](fragment-free-navigation.md) |
| 2026-08-01 | accepted | [Full-menu child và floating CTA theo reference đã đo](full-menu-children-and-cta.md) |
| 2026-08-09 | accepted | [Quản trị Git–Notion](git-notion-governance.md) |
| 2026-07-30 | accepted | [Graphify-first cho kiến trúc](graphify-first-architecture.md) |
| 2026-08-08 | accepted | [Graphify và Serena có ranh giới bổ sung](graphify-serena-boundary.md) |
| 2026-08-27 | accepted | [Graphify watcher cho phép query graph hiện có](graphify-watcher-query-existing-graph.md) |
| 2026-08-08 | accepted | [Graphify dùng wrapper freshness với boundary cố định](graphify-wrapper-freshness.md) |
| 2026-08-26 | accepted | [Địa chỉ trụ sở đã được owner xác nhận](head-office-address-confirmed.md) |
| 2026-08-01 | accepted | [Heritage montage theo nhịp compact của reference](heritage-montage-density.md) |
| 2026-08-01 | accepted | [Home hero dùng cross-fade có drift chồng nhịp](home-hero-crossfade-drift.md) |
| 2026-08-21 | accepted | [Chuyển locale tại chỗ và replay section đang xem](in-place-locale-switch.md) |
| 2026-08-08 | accepted | [Serena language set được suy ra, không sửa tay](inferred-serena-language-set.md) |
| 2026-08-09 | accepted | [Evidence browser QA tương tác](interactive-browser-qa.md) |
| 2026-09-09 | accepted | [Living docs theo domain](living-docs-domain-ownership.md) |
| 2026-07-31 | accepted | [Worker CMS và locale URL là canonical](locale-prefixed-worker-routes.md) |
| 2026-08-01 | accepted | [Full menu sở hữu locale và appointment control](menu-owns-locale-appointment.md) |
| 2026-07-30 | accepted | [Motion nâng trải nghiệm, không giữ content làm con tin](motion-keeps-content-visible.md) |
| 2026-08-09 | accepted | [Dùng Graphify Git hook và watcher native](native-graphify-hooks-and-watcher.md) |
| 2026-08-01 | accepted | [CMS project slot là optional trên static menu baseline](optional-cms-project-slots.md) |
| 2026-07-30 | accepted | [Owner fact không được suy đoán](owner-facts-require-confirmation.md) |
| 2026-07-30 | accepted | [Process là invariant](process-order-invariant.md) |
| 2026-07-31 | accepted | [Reference archive tách khỏi runtime](reference-archive-isolated.md) |
| 2026-07-30 | accepted | [Motion map theo web tham khảo, không nhập bundle production](reference-motion-map.md) |
| 2026-07-31 | accepted | [Text mask phải theo font và layout render thật](render-aware-text-masks.md) |
| 2026-07-30 | accepted | [Root là canonical](root-canonical.md) |
| 2026-07-30 | accepted | [Header route-first, không dùng fragment navigation](route-first-navigation.md) |
| 2026-08-08 | accepted | [Repository boundary theo runtime responsibility](runtime-responsibility-boundaries.md) |
| 2026-08-31 | accepted | [SplitText chỉ áp dụng cho editorial reveal đã khai báo](selective-splittext-editorial-reveals.md) |
| 2026-09-24 | accepted | [Sites chỉ nhận artifact tĩnh, GitHub giữ source và test](sites-artifact-only-release-mirror.md) |
| 2026-08-30 | accepted | [Sáu trang nhóm Sản phẩm quảng cáo dùng một shared detail template](shared-advertising-product-detail-template.md) |
| 2026-08-01 | accepted | [Typography và locale transition giữ shell ổn định](stable-shell-locale-transition.md) |
| 2026-08-08 | accepted | [Live bản tĩnh trước, CMS sau](static-before-cms.md) |
| 2026-07-30 | accepted | [Static architecture dùng chung](static-shared-architecture.md) |
| 2026-07-31 | accepted | [No-LLM không đồng nghĩa docs vắng mặt](structural-document-extraction.md) |
| 2026-08-01 | accepted | [Readability tiếng Việt ưu tiên hơn mật độ reference](vietnamese-readability.md) |
| 2026-07-30 | accepted | [VI source, EN qua data attribute](vietnamese-source-english-leaf-attributes.md) |
| 2026-08-27 | accepted | [Typography nhìn thấy theo cap-height Espacio](visible-typography-espacio-parity.md) |
| 2026-09-01 | accepted | [Khóa Wrangler đến phase CMS](wrangler-deferred-until-cms.md) |

## Decision đã được thay thế

| Ngày | Status | Decision |
| --- | --- | --- |
| 2026-08-31 | superseded | [Lưới deterministic dùng Masonry/Outlayer và spacing Espacio](deterministic-advertising-product-masonry-outlayer.md) |
| 2026-08-30 | superseded | [Lưới Sản phẩm quảng cáo dùng manifest deterministic và closed frontier](deterministic-advertising-product-masonry.md) |
| 2026-08-31 | superseded | [Sản phẩm quảng cáo single-column với rank-v2 và media-fit deterministic](deterministic-advertising-product-single-column-media-fit.md) |
| 2026-08-08 | superseded | [Graphify update theo dirty fingerprint và được coalesce](dirty-fingerprint-graphify.md) |
| 2026-08-08 | superseded | [Chỉ bỏ skill global/project khi còn fallback rõ ràng](fallback-before-removing-skills.md) |
| 2026-08-09 | superseded | [Global agent stack với project policy portable](global-agent-stack-project-portability.md) |
| 2026-07-31 | superseded | [Graphify code-only là graph mặc định](graphify-ast-default.md) |
| 2026-08-08 | superseded | [Browser QA phân tầng](layered-browser-qa.md) |
| 2026-09-01 | superseded | [Sản phẩm quảng cáo dùng Pinterest organic masonry và natural ratio](pinterest-organic-advertising-product-masonry.md) |
| 2026-08-24 | superseded | [Typography portal theo trọng lượng Espacio](portal-typography-weight-parity.md) |
| 2026-08-08 | superseded | [Tooling chỉ ở project scope và update là notify-only](project-scoped-tooling.md) |
| 2026-08-08 | superseded | [Hook có một dispatcher cho mỗi event](single-hook-dispatcher.md) |
| 2026-08-08 | superseded | [Phát hành static website trước CMS](static-first-release.md) |

## Chú thích thuật ngữ

- **ADR**: bản ghi quyết định kiến trúc hoặc chính sách bền vững.
- **Accepted**: decision được chấp nhận trong scope đã ghi.
- **Superseded**: có decision thay thế; giữ lịch sử để truy nguyên.
