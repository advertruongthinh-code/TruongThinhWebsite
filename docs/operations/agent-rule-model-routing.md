# Model, effort và provider routing

Nguồn rule duy nhất cho chọn model, effort, provider của mọi thread và subagent: [Claude](#claude)
và [OpenAI, Codex](#openai-codex).

## Claude

Owner duyệt 2026-10-15, thêm provider kie.ai 2026-10-19. Điều phối đặt model, effort và provider cho mọi thread, ghi kèm lý do một dòng trong brief. Model cho phép: `opus`, `sonnet`, `haiku` (5.5); `fable` chỉ theo mục [Fable](#fable). Subagent dùng mặc định Claude Code, không rule riêng.

### Fable

Owner duyệt 2026-11-11. Fable ưu tiên làm plan chi tiết cho worker rẻ hơn implement. Fable chỉ code hoặc code review khi owner cho phép.

### Provider và chế độ

Owner chạy song song gói Max (usage limit tuần, đã trả cố định) và [kie.ai](https://kie.ai/pricing) (credit, tiền thật). Ưu tiên tiết kiệm credit kie.ai.

| Chế độ | Khi nào | Provider |
| --- | --- | --- |
| 1. Max còn hạn mức | Mặc định | Max; dòng haiku chạy kie.ai |
| 2. Max hết hạn mức | Owner báo Max chạm limit tuần | kie.ai, theo cột chế độ 2 |

Đổi chế độ bằng tay, không tự động.

### Ma trận Intelligence Index và chi phí

Nguồn: [Artificial Analysis](https://artificialanalysis.ai/models), Intelligence Index v4.3.2, cost per task, lấy 2026-10-19. USD Max là giá niêm yết Anthropic. USD kie = USD Max x hệ số giá kie.ai (lấy 2026-10-19): opus, sonnet 0.4 (giảm 60%), haiku 0.6 (giảm 40%); 1 credit = 0.005 USD. Pareto là không có mức nào điểm cao hơn mà rẻ hơn; theo cả hai cột giá, tập Pareto giống nhau.

| Model, effort | Index | USD/task Max | USD/task kie | Pareto |
| --- | --- | --- | --- | --- |
| haiku low | 29 | 0.02 | 0.012 | có |
| haiku medium | 34 | 0.05 | 0.030 | có |
| haiku high | 38 | 0.08 | 0.048 | có |
| haiku xhigh | 41 | 0.12 | 0.072 | có |
| haiku max | 43 | 0.21 | 0.126 | có |
| sonnet low | 36 | 0.35 | 0.140 | không, thua haiku high |
| sonnet medium | 41 | 0.48 | 0.192 | không, thua haiku xhigh |
| opus low | 42 | 0.55 | 0.220 | không, thua haiku max |
| sonnet high | 47 | 0.88 | 0.352 | có |
| opus medium | 51 | 1.34 | 0.536 | có |
| opus high | 54 | 1.82 | 0.728 | có |
| sonnet xhigh | 52 | 2.01 | 0.804 | không, thua opus high |
| opus xhigh | 56 | 3.46 | 1.384 | có |
| sonnet max | 56 | 5.46 | 2.184 | không, thua opus xhigh |
| opus max | 58 | 5.98 | 2.392 | có |

Không dùng mức ngoài Pareto. Giới hạn: Index là điểm tổng quát, không đo vision hay agent code trong repo này. Giá haiku tăng 5 lần khi prompt trên 100k token và AA chưa tính bậc này, nên haiku chỉ rẻ khi context ngắn. Cột kie không tính cache, context dài (kie.ai không công bố). Mức hao usage limit Max được giả định tỷ lệ với giá niêm yết.

### Đối chiếu LiveBench theo Category

Nguồn: [LiveBench 2.0](https://livebench.ai/#/), release 20261014, lấy 2026-10-19. Mỗi model chỉ chạy effort max, nên bảng này chọn model theo loại job; effort vẫn theo ma trận Pareto ở trên (áp vào từng effort là suy luận). Ô: điểm / USD Max mỗi task.

| Category | opus | sonnet | haiku | Model có lợi |
| --- | --- | --- | --- | --- |
| Coding | 96.3 / 5.03 | 94.7 / 5.19 | 84.5 / 0.19 | opus; sonnet đắt hơn mà điểm thấp hơn |
| Design | 86.9 / 5.75 | 85.0 / 5.89 | 82.2 / 0.18 | haiku cho việc nhỏ, opus khi cần chất lượng |
| Long Agentic | 85.0 / 38.01 | 78.8 / 35.01 | 56.6 / 2.05 | opus; không dùng haiku |
| Browser Use | 80.0 / 14.67 | 84.0 / 7.72 | 88.0 / 0.36 | haiku: điểm cao nhất, rẻ nhất |
| Research | 85.0 / 8.62 | 83.6 / 9.78 | 73.7 / 0.39 | opus; sonnet đủ gần ở chế độ 2 |
| Data Analysis | 80.3 / 0.82 | 59.5 / 0.53 | 51.8 / 0.03 | opus; hai model kia kém xa |
| Reasoning | 92.2 / 0.25 | 91.6 / 0.21 | 84.6 / 0.02 | haiku cho việc ngắn, opus cho việc nặng |

Ở effort max, sonnet thua opus về cả điểm lẫn giá ở Coding, Design, Research (sonnet sinh nhiều token hơn). Suy luận: sonnet chỉ còn lợi ở effort high, nơi AA đo nó rẻ hơn opus medium; nếu sonnet high bị chê thì lên opus thay vì tăng effort sonnet. Bản [v1](https://livebench.ai/v1/) (2026-06-25) cho thấy xhigh không kém max (sonnet 78.2 so với 75.8, haiku 72.9 so với 68.4), nên không dùng max.

### Bảng mặc định

Chế độ 2 hạ xuống mức Pareto rẻ hơn chỉ khi điểm Category gần nhất giảm không quá 5 điểm; `=` là giữ như chế độ 1.

| Việc | Category gần nhất | Chế độ 1: model, effort, provider | Chế độ 2 (kie) | Ghi chú |
| --- | --- | --- | --- | --- |
| interview-me, spec, plan | Reasoning, Long Agentic | opus medium, Max | = | opus high khi chạm 3+ file nóng (catalog-runtime, motion.js, skeleton-flow, design-system) |
| Motion/UI trong `src/site` | Coding, Design | sonnet high, Max | = | opus medium khi chạm 3+ file nóng hoặc sau một lần owner chê |
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

Leo một bậc theo Pareto (haiku medium, haiku xhigh, sonnet high, opus medium, opus high, opus xhigh) khi cùng một check đỏ hai lần liên tiếp sau khi sửa, hoặc owner chê kết quả. Áp dụng cho lần thử lại; task kế tiếp bắt đầu lại từ mặc định. Không leo vì lỗi môi trường (runner offline, cloud-Chromium). Opus max chỉ cho perf hoặc security và cần owner duyệt riêng. Leo bậc giữ provider của chế độ đang chạy.

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
- **Route**: cặp model và effort yêu cầu cho một task.
- **Callable**: host thực sự có công cụ gọi route đó.
- **Requested / effective**: route yêu cầu / route được metadata xác nhận đã chạy.
- **Harness**: bộ tool, prompt và cách kiểm kết quả bao quanh model.
