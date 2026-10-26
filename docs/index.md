# Tài liệu Trường Thịnh

Bắt đầu bằng [STATE](STATE.md), rồi chọn nguồn theo việc cần làm. Git `main` giữ kiến thức
đã chấp nhận; [Notion](operations/notion.md) chỉ giữ backlog card. Evidence của mỗi thay đổi
nằm trong mô tả PR; report cũ đọc bằng `git log -- <path>` và `git show <commit>:<path>`.

## Tìm theo công việc

| Công việc | Nguồn bắt đầu |
| --- | --- |
| Mục tiêu và phase | [Goal](goal.md): static (đang ở), CMS (chưa mở) |
| Tech stack, runtime, ownership, deploy | [Architecture](architecture.md#tech-stack), [phát hành tĩnh](specs/static-release.md) |
| Sửa một phần website | [Capability map](specs/docs-system.md#r2-capability-map-và-spec-sống): mỗi phần một spec sống |
| Shell và các trang | [Shell](specs/site-shell.md), [trang chủ](specs/page-home.md), [Residential, Commercial, About](specs/detail-pages.md), [cảm giác cuộn](specs/scroll-feel.md), [header đi theo ngón tay trên điện thoại](specs/phone-header-scroll.md), [logo đổi màu khi chuyển trang](specs/logo-route-crossfade.md), [reveal hero và LCP](specs/hero-motion-reveal.md) (planned), [mở trực tiếp giống chuyển trang](specs/first-load-parity.md) (planned), [chữ hero và khoảng cách dòng](specs/hero-typography.md) (planned) |
| Advertising | [Masonry](specs/advertising-masonry.md), [skeleton](specs/advertising-skeleton.md), [detail](specs/advertising-detail.md), [viewer zoom](specs/advertising-viewer-touch-zoom.md), [CTA cuối trang](specs/advertising-cta-center-parallax.md), [phân loại](specs/advertising-taxonomy.md) (planned) |
| Ảnh, media, Kính | [Tải ảnh](specs/media-delivery.md), [ảnh thích ứng mạng](specs/image-adaptive-delivery.md), [card nhiều media](specs/media-card.md), [SEO media](specs/media-seo.md), [skeleton chờ ảnh](specs/loading-glass-and-page-entry.md), [Kính](specs/glass-surface.md), [player video primary](specs/primary-video-player.md), [video thích ứng mạng](specs/video-delivery.md) |
| SEO, Google, bot AI | [SEO](specs/seo.md), planned, tạm dừng tới khi đủ feature website |
| Worker, admin, D1 | [CMS](specs/cms.md), dormant tới khi owner mở CMS phase |
| Thiết kế và reuse UI | [Design System](../design-system/README.md), [spec Design System và Impeccable](specs/design-system.md), [authority map](#authority-map) |
| Reference hành vi | [Nguồn tham khảo](../design-system/README.md#nguồn-tham-khảo), [Pinterest photo view](reference/pinterest-photo-view.md); không tự thành target |
| Brief ảnh khách hàng | [Hồ sơ 12 đối tác](reference/advertising-partners.md), [sản phẩm BEINCO, Betrimex, Dừa Cửu Long](reference/advertising-client-products.md), [tham khảo thị trường 13 họ sản phẩm](reference/advertising-market-references.md) (mỗi họ một file, chỉ nạp họ cần) |
| Gate NOT PASS còn mở | Mục "Gate còn mở" của spec sở hữu |
| Quyết định | [Decisions](decisions/index.md) |
| Tool, agent, test | [AGENTS](../AGENTS.md), [TOOLING](operations/TOOLING.md), [tests](../tests/README.md), [bộ test CI](specs/ci-test-suites.md), [test không phụ thuộc nội dung](specs/content-independent-tests.md) (planned), [Android thật](operations/android-real-device-debugging.md) |
| Tên gọi | [Tên gọi chuẩn](terminology.md) |
| Giấy phép bên thứ ba | [Thông báo](third-party-notices.md) |
| Nguồn ảnh, provenance | Máy owner, ngoài Git (`source-assets/` bị ignore) |

## Authority map

| Contract | Nguồn chuẩn |
| --- | --- |
| Product, user, claim, owner fact, khách hàng, danh mục | [PRODUCT.md](../PRODUCT.md) |
| Token, visual role, component, motion | [Design System](../design-system/README.md), [Motion](../design-system/motion.md); [DESIGN.md](../DESIGN.md) sinh từ đó, không sửa tay |
| Câu chuyện thương hiệu, logo: tỷ lệ, màu, motion, state | [Brand guideline](../design-system/brand.md) |
| Giọng văn, copy hero, mạch route, crop ảnh | [Content và media](../design-system/content.md) |
| Node lá VI/EN, motion hook, file ảnh, loading, alt | [Ba trang con](specs/detail-pages.md#r4-nội-dung-vien-và-hook), [chuẩn file ảnh](specs/media-delivery.md#r5-chuẩn-file-ảnh) |
| Hướng ảnh sáu nhóm Advertising | [Ảnh Advertising](../design-system/advertising-images.md) |
| Chấm ảnh Audit/Critique | [QA ảnh Advertising](operations/agent-rule-ad-images.md#chấm-điểm) |
| Route, lifecycle, reuse contract | [Shell](specs/site-shell.md), [ba trang con](specs/detail-pages.md#r6-reveal-parallax-đổi-ngôn-ngữ-và-vòng-đời) |
| Masonry, catalog, renderer Advertising | [Masonry](specs/advertising-masonry.md), [skeleton](specs/advertising-skeleton.md) |
| Implementation đang chạy | `src/site/`, `scripts/`, `tests/` |

Source chỉ cho thấy implementation hiện tại; owner hoặc spec đã duyệt mới nâng nó thành
target. Spec chỉ link contract ngoài phần của mình, không giữ bản sao thông số.

## Supersession

Decision đã duyệt đổi: tạo hoặc sửa decision mới, ghi permalink bản cũ vào `supersedes` rồi
xóa file cũ (owner duyệt), cập nhật tài liệu sở hữu contract và mọi link trong cùng PR.
Source đổi mà target đã duyệt chưa đổi: ghi phần lệch vào "Gate còn mở", không tự sửa
yêu cầu thiết kế.

## Duy trì

Gate docs ở [AGENTS.md](../AGENTS.md#state-và-living-docs) và `pnpm qa:docs`. Docs tổ chức
theo phần website, không tạo folder theo ngày hoặc task. Link tới `.tmp/`, `research/` và
`source-assets/` là evidence local trên máy owner, không nằm trong gói website; thiếu raw
artifact thì dùng kết luận trong spec và PR, không tự tạo lại.

## Chú thích thuật ngữ

- **Contract**: yêu cầu hoặc giao diện có hiệu lực.
- **Authority**: nguồn chuẩn khi có nhiều bản ghi.
- **Supersession**: decision mới thay decision cũ.
- **Provenance**: nguồn gốc có thể truy nguyên.
