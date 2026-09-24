# Điểm chuyển tiếp context Impeccable

Bộ tài liệu hiện hành nằm tại [design index](../design/index.md).
Thư mục này giữ đường vào tương thích; không có bản sao token hoặc policy.

| Nhu cầu | Nguồn chuẩn |
| --- | --- |
| Product, audience, job, owner facts | [PRODUCT.md](../../PRODUCT.md) |
| Visual tokens và role | [DESIGN.md](../../DESIGN.md) |
| Extensions và component specimens | [design.json](../../.impeccable/design.json) |
| Motion system | [Motion](../design/motion.md) |
| Áp dụng thương hiệu | [Style guide](../design/style-guide.md) |
| Content, VI/EN và media | [Content guide](../design/content.md) |
| Reuse source và lifecycle | [Components](../design/components.md), [patterns](../design/patterns.md) |
| Baseline đo từ Espacio | [Reference Espacio](../reference/espacio/index.md) |
| Quyền sở hữu và bảo trì | [Governance](../design/governance.md) |

Context loader giữ root `PRODUCT.md`, `DESIGN.md` và brief khớp tại
`.impeccable/surfaces/`. Không move các artifact đó vào `docs/`.
Sidecar schema v2 chỉ giữ phần mở rộng, không sao chép token primitives.
Project cho phép Git quản lý sidecar để không mất specimen/provenance khi clone;
config local và runtime cache vẫn ignored. Khi cập nhật `DESIGN.md`, đồng bộ
sidecar theo installed document contract.

`init`/`document` cập nhật product/design trong scope user đã giao; không tự
thay accepted identity hoặc owner fact. `extract` có thể refactor source, nên
cần task và verification tương ứng; nó không thay toàn bộ design documentation.
Chỉ tạo critique/config/ignore artifact khi workflow thực sự có dữ liệu cần giữ.

## Chú thích thuật ngữ

- **Context loader**: thành phần đọc đúng artifact theo contract của skill.
- **Sidecar**: phần mở rộng đi cùng DESIGN, không thay token authority.
- **Specimen**: mẫu hiển thị; không tự là module production để import.
