# Nguồn và case mẫu cho Claude routing

Snapshot lấy 2026-11-12, owner duyệt cùng ngày. Rule áp dụng ở [Model routing, mục Leo bậc](../operations/agent-rule-model-routing.md#leo-bậc); bảng mặc định ở đó thắng nếu khác.

## Nguồn

- Video Anthropic [Fable 5.2 or Opus? When to use each model in Claude Code](https://www.youtube.com/watch?v=C33hJGt-ySg) (3:28, transcript đọc đủ).
- Bài [Choosing a Claude model and effort level in Claude Code](https://claude.com/blog/claude-model-and-effort-level-in-claude-code) (2026-07-07).
- Tài liệu [Model config](https://code.claude.com/docs/en/model-config): effort mặc định của Opus, Sonnet, Haiku 5.5 là `medium`; `high` cho sửa bug trong codebase có sẵn; `max` có lợi ích giảm dần, dễ nghĩ quá; Fable có thể trừ usage credits thay vì hạn mức gói.

## Bốn vai model

| Model | Vai | Dấu hiệu nhận ra việc | Giá/token so với opus |
| --- | --- | --- | --- |
| `opus` medium | Mặc định cho code và việc trí óc phức tạp | Một tính năng chạm nhiều lớp nhưng mục tiêu rõ | 1x |
| `fable` | Việc tham vọng, mở, chưa ai viết lộ trình | Nhiều mốc, nhiều quyết định chưa ghi, chạm cả codebase; chất lượng quan trọng hơn giá | 2x |
| `sonnet` | Việc phạm vi rõ, cần nhanh, rẻ | Nói được "xong là gì" trong một câu; có reproduction | 0.5x |
| `haiku` | Việc lặp nhiều, nhạy chi phí | Tóm tắt, phân loại, định tuyến, relay | rẻ nhất |

Video: kết quả chưa đạt thì tăng effort trước vì đây là bước nhỏ hơn đổi model và thường giữ prompt cache. Bài viết: tăng effort khi model thiếu công (sót file, không chạy test, không soát lại); đổi model lớn hơn khi việc khó thật, model nhỏ sai một cách tự tin dù context tốt, hoặc đề bài mơ hồ; hạ model khi việc là sửa cơ học hoặc hỏi về code đã có trong context.

## Case mẫu trong repo

Suy luận từ video, map vào bảng mặc định.

| Việc ví dụ | Route bắt đầu | Vì sao |
| --- | --- | --- |
| Khối mới trang chủ chạm data catalog, runtime và CSS | opus medium | Tính năng nhiều lớp (owner chọn 2026-11-12) |
| Chuyển sang CMS, refactor DRY cả repo, đổi kiến trúc masonry | fable lập plan và dẫn; worker sonnet | Việc mở, nhiều mốc; Fable code chỉ khi owner cho |
| Sửa bug có reproduction (e2e đỏ, lệch layout có ảnh) | sonnet high | Xong là gì nói được trong một câu |
| Đổi chữ, token màu, đường dẫn ảnh theo danh sách sẵn | sonnet low | Sửa cơ học, soát từng bước |
| Gom link, phân loại ảnh, đổi status card, relay CI | haiku medium | Lặp nhiều, nhạy chi phí |
| Job lớn có phần cơ học (nâng version từng package, sửa test từng package) | lead opus hoặc fable; subagent sonnet | Lead giữ quyết định, phần rõ phạm vi giao model rẻ |

Ví dụ ghi brief: `route: sonnet high; lý do: bug có reproduction; leo: lần 2 đỏ -> opus medium (trần sonnet là high)`.

## Chú thích thuật ngữ

- **Prompt cache**: context đã xử lý được giữ cho lượt sau rẻ, nhanh hơn; đổi model làm mất.
- **Usage credits**: khoản trả thêm ngoài hạn mức gói.
- **Lead**: phiên chính giữ quyết định và giao việc cho subagent.
