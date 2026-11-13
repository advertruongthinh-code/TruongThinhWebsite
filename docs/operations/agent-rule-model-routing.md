# Model, effort và provider routing

Nguồn rule duy nhất cho chọn model, effort, provider của mọi thread và subagent: [Claude](#claude)
và [OpenAI, Codex](#openai-codex).

## Claude

Owner duyệt 2026-10-15, thêm provider kie.ai 2026-10-19, cập nhật họ model 2026-11-13. Điều phối đặt model, effort và provider cho mọi thread, ghi kèm lý do một dòng trong brief. Luôn ghi effort rõ, không dựa mặc định (mặc định khác nhau giữa Claude Code và API). Subagent dùng mặc định Claude Code, không rule riêng.

| Model | ID | Giá API vào / ra (USD mỗi 1M token) | Vai |
| --- | --- | --- | --- |
| Fable 5.2 | `claude-fable-5-2` | 8 / 40 | Việc mở, nhiều mốc; chỉ theo mục [Fable](#fable) |
| Opus 5.5 | `claude-opus-5-5` | 4 / 20 | Mặc định cho code phức tạp |
| Sonnet 5.5 | `claude-sonnet-5-5` | 2 / 10 | Việc nói được "xong là gì" trong một câu |
| Haiku 5.5 | `claude-haiku-5-5` | 0,10 / 0,50 (prompt trên 100K: 0,50 / 2,50) | Việc lặp nhiều, nhạy chi phí, context ngắn |

Giá theo tài liệu Claude API (2026-11-13).

### Fable

Owner duyệt 2026-11-11. Fable ưu tiên làm plan chi tiết cho worker rẻ hơn implement. Fable chỉ code hoặc code review khi owner cho phép. Effort bắt đầu `high`; `xhigh` chỉ khi đo thấy lợi (AA: high và xhigh cùng điểm).

### Provider và chế độ

Owner chạy song song gói Max (usage limit tuần, đã trả cố định) và [kie.ai](https://kie.ai/pricing) (credit, tiền thật). Ưu tiên tiết kiệm credit kie.ai.

| Chế độ | Khi nào | Provider |
| --- | --- | --- |
| 1. Max còn hạn mức | Mặc định | Max; dòng haiku chạy kie.ai |
| 2. Max hết hạn mức | Owner báo Max chạm limit tuần | kie.ai, theo cột chế độ 2 |

Đổi chế độ bằng tay, không tự động.

### Căn cứ số liệu

Số đo đầy đủ ở [Claude routing benchmarks](../reference/claude-routing-benchmarks.md). Kết luận dùng trong rule:

- Chỉ dùng mức nằm trên Pareto của ma trận AA (điểm cao hơn thì đắt hơn); `sonnet low`, `sonnet medium`, `opus low`, `sonnet xhigh`, `sonnet max` ngoài Pareto.
- Theo Category LiveBench: opus cho Coding, Long Agentic, Research, Data Analysis; haiku cho Browser Use và việc ngắn; sonnet chỉ có lợi ở effort high, sonnet high bị chê thì lên opus thay vì tăng effort sonnet. Không dùng max (xhigh không kém max).
- Giá haiku tăng 5 lần khi prompt trên 100K token: haiku chỉ cho context ngắn.
- AA v5.0.1 (2026-11-13): Fable 5.2 high và xhigh cùng 62 điểm, max 65; Opus 5.5 max 59.

### Bảng mặc định

Chế độ 2 hạ xuống mức Pareto rẻ hơn chỉ khi điểm Category gần nhất giảm không quá 5 điểm; `=` là giữ như chế độ 1.

| Việc | Category gần nhất | Chế độ 1: model, effort, provider | Chế độ 2 (kie) | Ghi chú |
| --- | --- | --- | --- | --- |
| interview-me, spec, plan | Reasoning, Long Agentic | opus medium, Max | = | opus high khi chạm 3+ file nóng (catalog-runtime, motion.js, skeleton-flow, design-system) |
| Motion/UI trong `src/site` | Coding, Design | sonnet high, Max; opus medium khi chạm cùng lúc data, runtime, CSS | = | opus medium khi chạm 3+ file nóng hoặc sau một lần owner chê |
| Design thuần, không code | Design | sonnet high, Max | haiku xhigh | 85.0 so với 82.2 |
| Perf/fps gate phone Android | Data Analysis, Long Agentic | opus high, Max | = | opus xhigh chỉ sau một vòng đo vẫn chưa đạt |
| Sửa e2e có test đỏ rõ | Coding | sonnet high, Max | = | opus medium nếu sửa xong vẫn đỏ |
| Phân tích số liệu (thống kê ảnh, số đo, log) | Data Analysis | opus medium, Max | = | sonnet, haiku dưới 60 điểm |
| Research (SEO, đối thủ, tài liệu ngoài) | Research | opus medium, Max | sonnet high | 85.0 so với 83.6; haiku high chỉ để gom link |
| QA trình duyệt, đo thiết bị (Playwright, CDP, adb) | Browser Use | haiku xhigh, kie | = | chẩn đoán số đo thuộc thread perf |
| Docs, STATE, Notion, memory | Reasoning | haiku xhigh, kie | = | sonnet high (Max) khi context dài hoặc owner chê |
| Relay, kiểm tra CI/PR, đổi status card, search chỉ đọc | Reasoning | haiku medium, kie | = | haiku không sửa code sẽ merge |
| Chạy lại hoặc thêm runner CI | Long Agentic ngắn | haiku xhigh, kie | = | lên sonnet high (Max) nếu quá vài bước |
| Chấm ảnh | không có | sonnet high, Max | = | không benchmark nào đo vision; theo gate trong [QA ảnh](agent-rule-ad-images.md#chấm-điểm) |
| Reviewer task dài | Coding | opus medium, Max | = | opus high: 3+ file nóng |
| Wrap-up deep code-review | Coding | owner đặt, Max | = | khởi động không kèm tham số |

Haiku chỉ cho việc ngắn; việc nhiều bước nhiều tool dùng sonnet high trở lên. Không đặt override effort cố định cho một thread; chỉ owner đặt lại khi cần. `ponytail-audit` và `ponytail-debt` ngoài wrap-up chạy opus medium, chỉ khi owner gọi.

### Leo bậc

Owner duyệt 2026-11-12 theo video và docs Anthropic ([nguồn, case mẫu](../reference/claude-routing-cases.md)). Vai: opus medium mặc định; fable cho việc mở, nhiều mốc (giá 2x opus, cần owner cho); sonnet khi nói được "xong là gì" trong một câu (0.5x); haiku cho việc lặp nhiều, nhạy chi phí. Job lớn: model lớn dẫn, subagent sonnet làm phần rõ phạm vi.

Cùng check đỏ hai lần sau sửa hoặc owner chê: chẩn đoán theo thứ tự, ghi một dòng trong brief.

1. Thiếu context (brief mơ hồ, thiếu skill, tool): sửa context, giữ route.
2. Thiếu công (sót file, không chạy test): tăng effort một bậc, giữ model và prompt cache. Trần sonnet là high, quá thì opus medium; xhigh vẫn thiếu thì sang bước 3.
3. Thiếu hiểu biết (context đủ mà sai tự tin, bug tinh vi, kiến trúc, đề mơ hồ): lên model kế (haiku, sonnet, opus, fable) ở medium.

Ba lần: dừng ([nguyên tắc](../../AGENTS.md#nguyên-tắc-làm-việc)). Opus max chỉ cho perf hoặc security, owner duyệt riêng. Không leo vì lỗi môi trường. Chỉ áp cho lần thử lại; giữ provider của chế độ. Hạ bậc: phần cơ học còn lại giao subagent nhỏ hơn, brief ghi rõ bước và tiêu chí xong.

## OpenAI, Codex

Owner yêu cầu 2026-10-21. Áp dụng cho main và subagent Codex; chỉ cho phép
`gpt-6.1-sol` và `gpt-6-astra`. Claude dùng [mục Claude](#claude).
Đây là rule chọn route theo task; không tự đổi cấu hình user-global hay provider.

### Khảo sát và giới hạn evidence

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
Effort cao hơn không bảo đảm kết quả tốt hơn; chưa đo cost/task trong repo.

Khảo sát [Artificial Analysis và LiveBench](../reference/openai-routing-benchmarks.md)
là căn cứ cho bảng dưới: AA v4.3.2 so Index với cost/task theo effort; LiveBench 2.0
release 20261014 so Category ở max. Pareto theo điểm AA hiển thị: Sol low, medium,
high, xhigh, max và Astra max. Astra low tới xhigh không là mặc định vì Sol có mức
điểm ít nhất bằng mà rẻ hơn trong bảng làm tròn; không coi đó là bằng chứng mọi task.

Capability host mới quyết định route gọi được. Schema collaboration của phiên khảo sát
quảng bá cả hai model với low, medium, high, xhigh, max, ultra; tài liệu model API chỉ
xác nhận low tới max. Project dùng phần giao low tới max, không dùng none, minimal,
ultra hoặc tự ánh xạ ultra sang max. Re-check schema khi bắt đầu phiên mới.

### Bảng mặc định theo việc

Đây là chính sách project suy luận từ hai benchmark; chưa phải benchmark trên repo.
Chọn model theo Category LiveBench, effort theo AA; không suy điểm max sang effort thấp.
Ưu tiên tổng công sức tới kết quả được nghiệm thu, gồm retry và sửa lại.
Nếu một task thuộc nhiều dòng, dùng dòng có rủi ro cao nhất.

| Việc | Model, effort mặc định | Căn cứ và khi nâng |
| --- | --- | --- |
| Relay, CI/PR status, search chỉ đọc, đổi status card | `gpt-6.1-sol`, low | medium khi phải đối chiếu nhiều nguồn |
| Docs, STATE, Notion, memory; QA browser hoặc chạy runner có quy trình rõ | `gpt-6.1-sol`, medium | high khi có conflict evidence hoặc phải chẩn đoán |
| interview-me, spec, plan cho scope nhỏ, rõ | `gpt-6.1-sol`, high | Reasoning gần bằng ở max; xhigh khi có tradeoff khó |
| Motion/UI, design, bug có reproduction, sửa e2e có test đỏ rõ | `gpt-6.1-sol`, high | xhigh khi chẩn đoán qua nhiều file |
| Research, phân tích log và số đo | `gpt-6.1-sol`, high | Research/Data Analysis gần bằng ở max; xhigh khi nguồn mâu thuẫn |
| Perf/fps Android, debug nhiều module, security, migration khó rollback, deep review | `gpt-6.1-sol`, xhigh | max khi còn câu hỏi khó; benchmark chưa đo trực tiếp các job này |
| Long Agentic: nhiều bước phụ thuộc, yêu cầu thay đổi qua nhiều lượt | `gpt-6-astra`, max | LiveBench hơn Sol max 9.4 điểm; giá khoảng 5.92 lần, chỉ dùng khi đúng loại job |
| Chấm ảnh | `gpt-6.1-sol`, high | Chưa có benchmark vision phù hợp; theo [gate ảnh](agent-rule-ad-images.md#chấm-điểm) |

Không có benchmark vision theo effort trong khảo sát này. Chọn model không thay gate
chấm ảnh, five-axis review hay test. Task kế tiếp quay về bảng mặc định.

### Leo bậc và dừng

- Cùng check đỏ hai lần sau sửa, hoặc owner chê: nâng một bậc phù hợp:
  Sol low → medium → high → xhigh → max → Astra max.
  Đây là đường thử trên Pareto AA đã làm tròn, không bảo đảm task sau tốt hơn task trước.
- Astra low/medium/high/xhigh chỉ dùng ngoại lệ khi evidence cùng loại task chứng minh
  tổng công sức tới nghiệm thu tốt hơn route mặc định; ghi lý do và check xác nhận.
- Không nâng vì thiếu credential, runner offline hay lỗi môi trường. Sau ba lần sửa
  thất bại, dừng và nêu giả định còn đáng ngờ theo rule project.
- Chỉ dùng max cho Long Agentic hoặc vấn đề khó còn mở với check cụ thể để xác nhận;
  không đặt max cho mọi task. Nếu route hết hạn mức hoặc không callable, báo blocker;
  không tự chuyển model ngoài allowlist hoặc đổi provider.

### Đặt route và kiểm chứng

Main chọn trực tiếp hay delegation theo [lifecycle](agent-rule-workflow-tools.md#skill-lifecycle).
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

- **Effort**: mức suy luận của model (low, medium, high, xhigh, max); cao hơn thì tốt hơn nhưng tốn usage hơn.
- **Intelligence Index**: điểm tổng hợp của Artificial Analysis trên nhiều bộ test.
- **Pareto**: tập lựa chọn không bị lựa chọn khác vừa điểm cao hơn vừa rẻ hơn vượt qua.
- **Category**: nhóm bài test của LiveBench theo loại job (Coding, Design, Browser Use...).
- **Subagent**: worker do Agent tool tạo trong một thread.
- **File nóng**: file nhiều thread cùng sửa, dễ conflict.
- **Leo bậc**: nâng model hoặc effort cho lần thử lại sau khi lần trước thất bại.
- **Prompt cache**: context đã xử lý được giữ cho lượt sau rẻ, nhanh hơn; đổi model làm mất.
- **Route**: cặp model và effort yêu cầu cho một task.
- **Callable**: host thực sự có công cụ gọi route đó.
- **Requested / effective**: route yêu cầu / route được metadata xác nhận đã chạy.
- **Harness**: bộ tool, prompt và cách kiểm kết quả bao quanh model.
