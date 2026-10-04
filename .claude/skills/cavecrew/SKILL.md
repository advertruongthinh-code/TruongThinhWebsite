---
disable-model-invocation: true
name: cavecrew
description: Dùng mẫu ủy quyền gọn, có giới hạn khi giúp tiết kiệm context; ánh xạ sang role native của Codex hoặc xử lý inline.
---

Cavecrew là mẫu ủy quyền gọn. Skill này không cung cấp preset Codex có thể gọi,
plugin, lifecycle hook hoặc model setting.

Khi thực thi plan đã duyệt, main đánh giá scope, risk và ownership rồi chọn xử
lý inline hoặc dùng collaboration native của Codex khi tool và quyền cho phép.
Không duy trì bảng routing riêng ở Cavecrew. Main giữ yêu cầu, kiểm diff,
verification và nghiệm thu cuối cùng.

Dùng ánh xạ sau:

- Investigator: xử lý inline bằng Graphify trước, sau đó Serena và tìm kiếm
  read-only có giới hạn. Trả về path và line evidence chính xác.
- Builder: xử lý inline hoặc dùng native worker sau khi đã định vị. Giới hạn
  edit ở một hoặc hai file khi scope là surgical.
- Reviewer: dùng role native read-only phù hợp: `code-reviewer`,
  `security-auditor`, `test-engineer` hoặc `web-performance-auditor`.

Giữ contract gọn: investigator trả location có evidence, builder trả location
đã đổi kèm verification, reviewer trả finding theo thứ tự với severity,
evidence và fix cụ thể. Chỉ chain locate, fix rồi verify khi từng bước cần
thiết. Không giả định preset name không tồn tại.

## Chú thích thuật ngữ

- **Native role**: role review hoặc worker có sẵn trong Codex.
- **Inline**: agent hiện tại tự xử lý trong task đang chạy.
- **Evidence**: bằng chứng truy nguyên được từ source hoặc test.
