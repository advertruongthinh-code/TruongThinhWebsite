# Lộ trình CMS

## Trạng thái

Hoãn cho tới khi static website live và ổn định. Đây là phase boundary, không
phải implementation request.

## Scaffold hiện có

- `src/worker/index.js`: interface D1/R2/admin và validation đang dormant.
- `src/db/migrations/`: schema draft và seed data.
- `src/admin/`: private administration shell bị loại khỏi public static asset.
- `docs/specs/cms-content-publishing.md`: contract boundary tương lai; provider
  detail cố ý chưa được chọn.

## Điều kiện bắt đầu phase

- Static release đã live và có rollback path đã biết.
- Owner xác nhận editorial role và publishing workflow.
- Giả định về D1/R2 region, retention, backup và cost được revalidate với official
  documentation hiện tại.
- Quyết định về Cloudflare Access và production domain là explicit.

## Kết quả dự kiến

- Draft và publish bilingual structured post, project và product.
- Lưu structured metadata và approved media trong provider system đã chọn;
  D1/R2 vẫn chỉ là candidate cho tới khi constraint hiện tại được verify.
- Giữ public static route hoạt động trong CMS incident.
- Ghi audit event và giới hạn mọi admin write cho authenticated owner.

## Không thuộc mục tiêu

- Page builder đa dụng.
- Multi-tenant permission.
- Thay static source file trước khi CMS chứng minh được độ tin cậy.

## Chú thích thuật ngữ

- **Phase boundary**: ranh giới quyết định khi nào một phase được phép bắt đầu.
- **Scaffold**: khung code chuẩn bị sẵn nhưng chưa phải behavior đang active.
- **Rollback path**: cách quay về release trước khi release mới gặp sự cố.
- **Structured metadata**: metadata có schema và field được định nghĩa rõ.
- **Multi-tenant**: một hệ thống phục vụ nhiều tenant với ranh giới dữ liệu/quyền
  riêng.
