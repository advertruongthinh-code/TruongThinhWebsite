---
name: caveman-stats
description: Báo cáo token usage thật của Codex session khi có record token_count của session hiện tại.
---

Đọc record `token_count` của Codex session hiện tại qua session hoặc log access
read-only có sẵn. Chỉ inspect session hiện tại và field khớp có giới hạn; không
dump toàn bộ log, prompt, credential hoặc secret.

Báo cáo input, output và total count chỉ khi đã quan sát được. `total_token_usage`
là cumulative: lấy snapshot mới nhất của session hiện tại, không cộng các
record cumulative hoặc cộng lại `cached_input_tokens` vào `input_tokens`.
Chỉ báo cáo savings khi baseline và turn count quan sát được hỗ trợ phép tính;
nếu không, ghi `Savings unavailable` và không ước tính. Nếu không đọc được
record `token_count` của session hiện tại, ghi
`Token stats unavailable: current Codex session token_count records are not accessible.`

Skill này không phụ thuộc lifecycle hook, plugin hoặc thay đổi global
configuration. Phải giữ read-only, không bịa usage hoặc savings.

## Chú thích thuật ngữ

- **Cumulative**: giá trị tích lũy qua các snapshot.
- **Snapshot**: record usage tại một thời điểm.
- **Savings**: token tiết kiệm có baseline quan sát được.
