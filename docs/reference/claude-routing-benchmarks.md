# Claude routing benchmarks

Số đo làm căn cứ cho [Model routing, Claude](../operations/agent-rule-model-routing.md#căn-cứ-số-liệu); rule ở đó thắng nếu khác.

Giới hạn: hai bảng dưới lấy 2026-10-19, không ghi đo trên bản model nào. Lấy lại 2026-11-13: AA đã lên Intelligence Index v5.0.1
nhưng chỉ công bố điểm Fable 5.2 (max 65, xhigh 62, high 62) và Opus 5.5 max (59); chưa có cost per task, chưa có Sonnet 5.5 và Haiku 5.5.
Khi AA có đủ số cho họ 5.5 thì thay bảng ma trận.

## Ma trận Intelligence Index và chi phí

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

## Đối chiếu LiveBench theo Category

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

## Chú thích thuật ngữ

- **Pareto**: không có mức nào điểm cao hơn mà rẻ hơn.
- **Category**: nhóm bài test của LiveBench theo loại job.
