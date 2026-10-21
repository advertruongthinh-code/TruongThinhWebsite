# Benchmark dùng cho OpenAI routing

Snapshot kiểm tra 2026-10-21; chỉ khảo sát `gpt-6.1-sol` và `gpt-6-astra`.
Chính sách áp dụng ở [OpenAI routing](../operations/agent-rule-openai-routing.md).
Đây là số đo của benchmark cùng harness của họ, chưa phải số đo Codex trong repo.

## Artificial Analysis: effort và cost/task

[Intelligence Index v4.3.2](https://artificialanalysis.ai/methodology/intelligence-benchmarking)
gồm 10 evaluation, chủ yếu text tiếng Anh; không dùng Index này để kết luận vision.
USD/task là weighted average cost per Intelligence Index task do AA công bố,
không phải giá token, quota Codex hay chi phí một task website.
Điểm dưới đây là số nguyên hiển thị; Pareto chỉ tính trên số đã làm tròn trong bảng
và hai model được phép, không kết luận khác biệt có ý nghĩa thống kê.

| Model, effort (nguồn từng dòng) | Index | USD/task | Pareto theo bảng |
| --- | --- | --- | --- |
| [Sol low](https://artificialanalysis.ai/models/gpt-6-1-sol-low) | 42 | 0.13 | có |
| [Sol medium](https://artificialanalysis.ai/models/gpt-6-1-sol-medium) | 48 | 0.21 | có |
| [Sol high](https://artificialanalysis.ai/models/gpt-6-1-sol-high) | 50 | 0.32 | có |
| [Sol xhigh](https://artificialanalysis.ai/models/gpt-6-1-sol-xhigh) | 51 | 0.39 | có |
| [Sol max](https://artificialanalysis.ai/models/gpt-6-1-sol) | 52 | 0.72 | có |
| [Astra low](https://artificialanalysis.ai/models/gpt-6-astra-low) | 46 | 0.82 | không, Sol medium |
| [Astra medium](https://artificialanalysis.ai/models/gpt-6-astra-medium) | 50 | 1.54 | không, Sol high |
| [Astra high](https://artificialanalysis.ai/models/gpt-6-astra-high) | 51 | 1.73 | không, Sol xhigh |
| [Astra xhigh](https://artificialanalysis.ai/models/gpt-6-astra-xhigh) | 52 | 2.31 | không, Sol max |
| [Astra max](https://artificialanalysis.ai/models/gpt-6-astra) | 53 | 3.26 | có |

Suy luận routing: thử Sol trước khi trả thêm cho Astra. Không loại Sol max:
nó là một điểm Pareto trong snapshot; Sol xhigh → max thêm 1 điểm, chi phí tăng
khoảng 85%. Astra max hơn Sol max 1 điểm tổng hợp, chi phí khoảng 4.53 lần.
Chênh lệch nhỏ của Index không đủ chọn model cho mọi loại job; đối chiếu Category.

## LiveBench 2.0: chọn theo loại job

Release `20261014`, trang ghi cập nhật 18 October 2026; lấy 2026-10-21 từ
[table.csv](https://livebench.ai/data/20261014/table.csv),
[cost.csv](https://livebench.ai/data/20261014/cost.csv),
[notes.json](https://livebench.ai/data/20261014/notes.json),
[categories.json](https://livebench.ai/data/20261014/categories.json).
[Ứng dụng LiveBench](https://livebench.ai/) khai báo cả hai model effort `max`;
notes nói chạy mức cao nhất trừ khi expanded row ghi ngoại lệ.

Mỗi ô là điểm / USD mỗi task. Tính USD/task bằng `cost[category] / nq_category`,
đúng phép tính frontend; làm tròn 4 chữ số thập phân. Không lấy tổng USD của suite
làm USD/task. Category là một suite ở release này.

| Category | Sol max | Astra max | Đối chiếu |
| --- | --- | --- | --- |
| Coding | 96.0 / 0.4822 | 93.7 / 3.3154 | Sol điểm cao hơn, rẻ hơn |
| Design | 82.1 / 0.3705 | 82.0 / 2.8756 | điểm gần bằng; Sol rẻ hơn |
| Long Agentic | 73.0 / 6.4877 | 82.4 / 38.3789 | Astra hơn 9.4 điểm, giá khoảng 5.92 lần |
| Browser Use | 88.0 / 2.4373 | 84.0 / 5.9097 | Sol điểm cao hơn, rẻ hơn |
| Research | 83.5 / 2.4152 | 85.2 / 17.6599 | Astra hơn 1.7 điểm, giá khoảng 7.31 lần |
| Data Analysis | 82.7 / 0.1454 | 83.0 / 0.6989 | điểm gần bằng; Sol rẻ hơn |
| Reasoning | 92.6 / 0.0803 | 92.7 / 0.3898 | điểm gần bằng; Sol rẻ hơn |

Giới hạn: notes ghi mỗi ô từ một run; ca không đo được sau một rerun tính 0.
Long Agentic có 18 task Sol và 17 task Astra trong cost.csv; không coi đây là
paired trial cùng đủ task hay chứng minh thống kê. Design đo file presentation,
PDF, document, không trực tiếp đo frontend motion; Data Analysis là câu hỏi ngắn,
không trực tiếp đo debug fps Android. Không suy điểm Category max thành điểm ở
low/medium/high/xhigh. Không gộp Index AA và điểm LiveBench thành một thang điểm.

Suy luận routing: Sol cho phần lớn job; Astra max có lý do thử rõ nhất khi task
thực sự dài, nhiều bước phụ thuộc. Đổi model cho security, perf, vision vẫn cần
evidence task cụ thể; benchmark này không chứng minh Astra mặc định tốt hơn.

## Chú thích thuật ngữ

- **Pareto**: không có lựa chọn khác điểm ít nhất bằng và giá thấp hơn, hoặc điểm cao hơn và giá không cao hơn.
- **Harness**: prompt, tool, môi trường và cách chấm bao quanh model.
- **Category / suite**: nhóm bài test theo loại việc.
- **Paired trial**: so hai lựa chọn trên cùng tập task và điều kiện.
