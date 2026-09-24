# Report công cụ và compatibility

Thư mục này giữ các đường dẫn công cụ đang đọc/ghi. Tài liệu cho người và
agent bắt đầu tại [verification](../verification/index.md) hoặc
[baseline Espacio](../reference/espacio/index.md).

## Machine reports

| File | Vai trò |
| --- | --- |
| [Canonical parity](research-espacio-layout-motion-parity.md) | Verdict fail/blocked/unmapped; hiện NOT PASS |
| [Pilot](research-espacio-layout-motion-parity-pilot.md) | Subset; runner tạo theo suffix |
| [Targeted](research-espacio-layout-motion-parity-targeted.md) | Subset; runner tạo theo suffix |
| [Motion audit](research-espacio-motion-audit.md) | Resource/candidate/runtime ledger |

CSV và backup ở path hiện tại, Git ignore; chúng có consumer thật và không
phải file thừa. Không rename hoặc hand-edit machine report khi gom docs.
Generator ownership ở scripts/tooling: generate-layout-motion-parity,
run-layout-motion-parity, finalize-layout-motion-coverage và motion-audit family.

## Evidence viết tay

[Navbar 2026-08-27](research-espacio-navbar-runtime-2026-08-27.md) chỉ là stub
chuyển tới original archive; giữ vì canonical machine report còn dùng link này.

Report gốc có ngày nằm trong [archive](../archive/index.md), có SHA256 và
mapping. Archive chỉ lưu original; [verification index](../verification/index.md)
xác định claim nào còn được sử dụng, claim nào đã có evidence thay thế.
Report mới đáng giữ đặt theo domain verification/reference; không tạo report
cho mọi sửa nhỏ. [Template](_template.md) giữ compatibility cho workflow cũ.

## Chú thích thuật ngữ

- **Machine report**: output có công cụ sở hữu.
- **Compatibility**: giữ đường dẫn mà consumer còn phụ thuộc.
- **Subset**: tập kiểm tra con, không thay kết luận toàn bộ.
