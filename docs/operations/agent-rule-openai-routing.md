# Model và effort OpenAI cho Codex

Owner yêu cầu 2026-10-21. Áp dụng cho main và subagent Codex; chỉ cho phép
`gpt-6.1-sol` và `gpt-6-astra`. Claude dùng [rule riêng](agent-rule-model-routing.md).
Đây là rule chọn route theo task; không tự đổi cấu hình user-global hay provider.

## Khảo sát và giới hạn evidence

Nguồn chính thức, kiểm tra 2026-10-21:
[GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol),
[GPT-6 Astra](https://developers.openai.com/api/docs/models/gpt-6-astra),
[Codex config](https://learn.chatgpt.com/docs/config-file/config-reference).

| Model | Vai trò theo OpenAI | Effort API | USD/1M token input / cached input / output |
| --- | --- | --- | --- |
| `gpt-6.1-sol` | Cân bằng chất lượng và chi phí cho coding, computer use, công việc chuyên môn | low, medium, high, xhigh, max | 2 / 0.10 / 10 |
| `gpt-6-astra` | Việc khó nhất: reasoning, coding, research, computer use, tài liệu | low, medium, high, xhigh, max | 10 / 1 / 50 |

Giá Standard cho prompt không quá 272K input token, chưa cộng tool và phụ phí.
Trên 272K, cả hai tăng 2 lần giá input/cache và 1.5 lần output cho toàn request.
API price không quy đổi thành usage limit của gói Codex hoặc credit provider khác.
Effort cao hơn không bảo đảm kết quả tốt hơn; chưa đo cost/task hay Pareto trong repo.

Capability host mới quyết định route gọi được. Schema collaboration của phiên khảo sát
quảng bá cả hai model với low, medium, high, xhigh, max, ultra; tài liệu model API chỉ
xác nhận low tới max. Project dùng phần giao low tới max, không dùng none, minimal,
ultra hoặc tự ánh xạ ultra sang max. Re-check schema khi bắt đầu phiên mới.

## Bảng mặc định theo việc

Đây là chính sách project, suy luận từ vai trò và giá chính thức; chưa phải benchmark
trên repo. Ưu tiên tổng công sức tới kết quả được nghiệm thu, gồm retry và sửa lại.
Nếu một task thuộc nhiều dòng, dùng dòng có rủi ro cao nhất.

| Việc | Model, effort mặc định | Khi nâng |
| --- | --- | --- |
| Relay, CI/PR status, search chỉ đọc, đổi status card | `gpt-6.1-sol`, low | medium khi phải đối chiếu nhiều nguồn |
| Docs, STATE, Notion, memory; QA browser hoặc chạy runner có quy trình rõ | `gpt-6.1-sol`, medium | high khi có conflict evidence hoặc phải chẩn đoán |
| interview-me, spec, plan cho scope nhỏ, rõ | `gpt-6.1-sol`, high | Astra high khi mơ hồ, nhiều module hoặc tradeoff kiến trúc |
| Motion/UI, design, bug có reproduction, sửa e2e có test đỏ rõ | `gpt-6.1-sol`, high | xhigh khi chẩn đoán qua nhiều file |
| Research, phân tích log và số đo | `gpt-6.1-sol`, high | Astra high khi nguồn mâu thuẫn, nguyên nhân chưa rõ |
| Perf/fps phone Android, debug nhiều module, kiến trúc hoặc plan phức tạp | `gpt-6-astra`, high | xhigh sau một vòng đo chưa giải quyết được nguyên nhân |
| Security, migration khó rollback, wrap-up deep code-review | `gpt-6-astra`, xhigh | max khi có câu hỏi khó cụ thể còn mở sau xhigh |
| Chấm ảnh | `gpt-6.1-sol`, high | Astra high nếu không thống nhất theo [gate ảnh](agent-rule-ad-images.md#chấm-điểm) |

Không có benchmark vision theo effort trong khảo sát này. Chọn model không thay gate
chấm ảnh, five-axis review hay test. Task kế tiếp quay về bảng mặc định.

## Leo bậc và dừng

- Cùng check đỏ hai lần sau sửa, hoặc owner chê: nâng một bậc phù hợp:
  Sol low → medium → high → xhigh → Astra high → xhigh → max.
  Đây là thứ tự thử của project, không phải xếp hạng Pareto đã đo.
- Sol max và Astra low/medium vẫn được phép khi có evidence cùng loại task cho thấy
  tổng chi phí tới nghiệm thu thấp hơn; ghi lý do, không tự nhận rẻ hơn theo tên effort.
- Không nâng vì thiếu credential, runner offline hay lỗi môi trường. Sau ba lần sửa
  thất bại, dừng và nêu giả định còn đáng ngờ theo rule project.
- Chỉ dùng max cho vấn đề khó còn mở với check cụ thể để xác nhận; không đặt max
  mặc định cho mọi task. Nếu route hết hạn mức hoặc không callable, báo blocker;
  không tự chuyển model ngoài allowlist hoặc đổi provider.

## Đặt route và kiểm chứng

Main chọn trực tiếp hay delegation theo [lifecycle](../../AGENTS.md#agent-skills-lifecycle).
Rule này không tự cho phép tạo subagent hoặc chat mới. Brief ghi model, effort, lý do
một dòng; khi host không cho override thì giữ route đang chạy và ghi chênh lệch.

Codex dùng `model` và `model_reasoning_effort` khi surface cấu hình hỗ trợ; Responses
API dùng `reasoning.effort`. Native tool dùng đúng field/schema được quảng bá.
Không gọi tool tạo chat chỉ để đổi route. Rule Markdown không tự đổi main đang chạy.

Ghi trong brief hoặc evidence PR, không tạo log riêng:
`requested: gpt-6.1-sol/high; effective: unknown; lý do: bug có reproduction`.
`effective` chỉ ghi khi metadata runtime xác nhận; schema quảng bá hoặc tool nhận
request chưa chứng minh model/effort thực chạy. Thiếu metadata ghi `unknown`.
Giữ nguyên provider của phiên; API có tool calling dùng Responses theo nguồn model.

Đánh giá lại mặc định khi có cùng task, context, harness và acceptance: so tổng token
input/output/reasoning (nếu có), số retry, thời gian và số lần owner can thiệp.
Không suy quota từ USD/token hoặc khẳng định Astra luôn tốt hơn Sol cho mọi task.

## Chú thích thuật ngữ

- **Route**: cặp model và effort yêu cầu cho một task.
- **Callable**: host thực sự có công cụ gọi route đó.
- **Requested / effective**: route yêu cầu / route được metadata xác nhận đã chạy.
- **Harness**: bộ tool, prompt và cách kiểm kết quả bao quanh model.
- **Pareto**: lựa chọn không bị lựa chọn khác vừa tốt hơn vừa rẻ hơn vượt qua.
