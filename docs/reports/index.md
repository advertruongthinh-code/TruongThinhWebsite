# Report

Report lưu durable research, verification, security và incident evidence. Viết
report bằng tiếng Việt và có section `## Chú thích thuật ngữ` cho English technical
term. Raw log và machine-generated state vẫn bị ignore trong `.tooling/`.

## Category

| Category | Dùng cho |
| --- | --- |
| `verification` | Test, bootstrap và acceptance evidence |
| `research` | Investigation và comparison có source |
| `security` | Threat review, finding và remediation evidence |
| `incidents` | Timeline, impact, cause và prevention của failure |

Tổ chức report bằng prefix category trong tên file, trực tiếp dưới
`docs/reports/`; không tạo thư mục con. Link spec và decision liên quan bằng
descriptive path; không dùng numeric document code.

## Report canonical hiện tại

- [Audit source và phân loại file toàn project](verification-2026-08-25-project-source-cleanup.md)
  — source cleanup, fresh output và Worker smoke đạt; card `Done`.
- [Project baseline](verification-2026-08-08-project-baseline.md)
- [Browser verification audit](verification-2026-07-31-browser-audit.md)
- [Documentation migration](verification-2026-08-09-docs-migration.md)

## Research

- [Espacio parity inventory](research-espacio-parity-inventory.md)
- [Espacio motion audit](research-espacio-motion-audit.md)
- [Espacio pairwise layout và motion parity](research-espacio-layout-motion-parity.md)
  — `NOT PASS`, full current-hash có 3.668 obligations, 827 fail, 1.914
  runtime-blocked và evidence cập nhật `2026-08-24T08:18:09+07:00`.

## Chú thích thuật ngữ

- **Durable evidence**: bằng chứng giữ lại để truy nguyên lâu dài.
- **Verification**: kiểm tra claim hoặc behavior có đúng không.
- **Research**: tìm hiểu dựa trên source và phương pháp rõ.
- **Remediation**: thay đổi để xử lý finding hoặc risk.
