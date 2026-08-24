# Decision

Mỗi durable decision có một descriptive file riêng. Spec có thể link tới
decision nhưng không chứa decision log. Giữ history bằng cách tạo decision mới
supersede record cũ.

## Vòng đời status

`proposed` → `accepted` → `superseded` hoặc `deprecated`

## Decision hiện tại

| Scope | Status | Decision |
| --- | --- | --- |
| Release | accepted | [Phát hành static website trước CMS](static-first-release.md) |
| Documentation | accepted | [Quản trị Git–Notion](git-notion-governance.md) |
| Verification | accepted | [Evidence browser QA tương tác](interactive-browser-qa.md) |
| UI | accepted | [Typography portal theo trọng lượng Espacio](portal-typography-weight-parity.md) |
| Tooling | accepted | [Graphify Git hook và watcher native](native-graphify-hooks-and-watcher.md) |
| Tooling | accepted | [Global agent stack với project policy portable](global-agent-stack-project-portability.md) |
| Agent context | accepted | [Caveman ultra và rule module](caveman-ultra-agent-rules.md) |

## Decision lịch sử

| Date | Status | Decision |
| --- | --- | --- |
| 2026-07-30 | accepted | [Root là canonical](root-canonical.md) |
| 2026-07-30 | accepted | [Static architecture dùng chung](static-shared-architecture.md) |
| 2026-07-30 | accepted | [Tiếng Việt source và English leaf attribute](vietnamese-source-english-leaf-attributes.md) |
| 2026-07-30 | accepted | [Thứ tự process là invariant](process-order-invariant.md) |
| 2026-07-30 | accepted | [Motion giữ content visible](motion-keeps-content-visible.md) |
| 2026-07-30 | accepted | [Chính sách editorial image](editorial-image-policy.md) |
| 2026-07-30 | accepted | [Vai trò accent color](accent-color-roles.md) |
| 2026-07-30 | accepted | [Owner fact cần confirmation](owner-facts-require-confirmation.md) |
| 2026-07-30 | accepted | [Graphify trước cho architecture](graphify-first-architecture.md) |
| 2026-07-30 | accepted | [Reference motion map](reference-motion-map.md) |
| 2026-07-30 | accepted | [Navigation ưu tiên route](route-first-navigation.md) |
| 2026-07-31 | superseded | [Graphify AST mặc định](graphify-ast-default.md) |
| 2026-07-31 | accepted | [Reference archive tách biệt](reference-archive-isolated.md) |
| 2026-07-31 | accepted | [Structural document extraction](structural-document-extraction.md) |
| 2026-07-31 | accepted | [Render-aware text mask](render-aware-text-masks.md) |
| 2026-07-31 | accepted | [Bảo trì content và media](content-media-maintenance.md) |
| 2026-07-31 | accepted | [Worker route có locale prefix](locale-prefixed-worker-routes.md) |
| 2026-07-31 | accepted | [Defense in depth cho admin](admin-defense-in-depth.md) |
| 2026-07-31 | accepted | [D1 SSR với static fallback](d1-ssr-static-fallback.md) |
| 2026-08-01 | accepted | [Home hero cross-fade và drift](home-hero-crossfade-drift.md) |
| 2026-08-01 | accepted | [Mật độ heritage montage](heritage-montage-density.md) |
| 2026-08-01 | accepted | [Stable shell và locale transition](stable-shell-locale-transition.md) |
| 2026-08-01 | accepted | [Menu sở hữu locale và appointment](menu-owns-locale-appointment.md) |
| 2026-08-01 | accepted | [CMS project slot optional](optional-cms-project-slots.md) |
| 2026-08-01 | accepted | [Navigation không dùng fragment](fragment-free-navigation.md) |
| 2026-08-01 | accepted | [Readability tiếng Việt](vietnamese-readability.md) |
| 2026-08-01 | accepted | [Full-menu child và CTA](full-menu-children-and-cta.md) |
| 2026-08-08 | accepted | [Ranh giới Graphify và Serena](graphify-serena-boundary.md) |
| 2026-08-08 | superseded | [Tooling project-scoped](project-scoped-tooling.md) |
| 2026-08-08 | accepted | [Serena language set được suy ra](inferred-serena-language-set.md) |
| 2026-08-08 | superseded | [Browser QA phân tầng](layered-browser-qa.md) |
| 2026-08-08 | superseded | [Single hook dispatcher](single-hook-dispatcher.md) |
| 2026-08-08 | superseded | [Graphify update theo dirty fingerprint](dirty-fingerprint-graphify.md) |
| 2026-08-08 | superseded | [Fallback trước khi bỏ skill](fallback-before-removing-skills.md) |
| 2026-08-08 | accepted | [Static trước CMS](static-before-cms.md) |
| 2026-08-08 | accepted | [Graphify wrapper freshness](graphify-wrapper-freshness.md) |
| 2026-08-08 | accepted | [Runtime responsibility boundary](runtime-responsibility-boundaries.md) |

File mới phải dùng descriptive name và frontmatter không có numeric document
code.

## Chú thích thuật ngữ

- **Durable decision**: quyết định cần giữ lâu dài và truy nguyên.
- **Lifecycle**: vòng đời status từ đề xuất đến chấp nhận hoặc thay thế.
- **Supersede**: decision mới thay thế decision cũ.
- **Deprecated**: không còn được dùng nhưng vẫn có thể giữ vì lịch sử.
