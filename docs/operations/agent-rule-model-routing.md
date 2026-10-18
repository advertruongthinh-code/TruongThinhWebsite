# Model và effort routing rule

Owner duyệt 2026-10-15, chọn lại theo ma trận Artificial Analysis 2026-10-17. Điều phối đặt model và effort cho mọi thread, ghi kèm lý do một dòng trong brief. Model cho phép: `opus`, `sonnet`, `haiku` (5.5); không dùng fable. Subagent do thread gọi theo mặc định của Claude Code; repo không đặt rule riêng.

## Ma trận Intelligence Index và chi phí

Nguồn: [Artificial Analysis](https://artificialanalysis.ai/models), Intelligence Index v4.3.2, Cost per Task (USD) trên bộ Index, lấy 2026-10-17. Pareto là không có mức nào điểm cao hơn mà rẻ hơn.

| Model, effort | Index | USD/task | Pareto |
| --- | --- | --- | --- |
| haiku low | 29 | 0.02 | có |
| haiku medium | 34 | 0.05 | có |
| haiku high | 38 | 0.08 | có |
| haiku xhigh | 41 | 0.12 | có |
| haiku max | 43 | 0.21 | có |
| sonnet low | 36 | 0.35 | không, thua haiku high |
| sonnet medium | 41 | 0.48 | không, thua haiku xhigh |
| opus low | 42 | 0.55 | không, thua haiku max |
| sonnet high | 47 | 0.88 | có |
| opus medium | 51 | 1.34 | có |
| opus high | 54 | 1.82 | có |
| sonnet xhigh | 52 | 2.01 | không, thua opus high |
| opus xhigh | 56 | 3.46 | có |
| sonnet max | 56 | 5.46 | không, thua opus xhigh |
| opus max | 58 | 5.98 | có |

Không dùng mức ngoài Pareto. Giới hạn: Index là điểm tổng quát, không đo vision hay agent code trong repo này. Giá haiku tăng 5 lần khi prompt trên 100k token và AA chưa tính bậc này, nên haiku chỉ rẻ khi context ngắn. Mức hao usage limit được giả định tỷ lệ với chi phí token.

## Đối chiếu LiveBench theo loại job

Nguồn: [LiveBench 2.0](https://livebench.ai/#/) (dữ liệu 2026-09-02, lấy 2026-10-18 từ `table_`, `cost_` CSV của site). Mỗi model chỉ chạy effort max, nên bảng này chọn model theo loại job; effort vẫn theo ma trận Pareto ở trên. Ô ghi điểm / USD mỗi task.

| Suite | opus | sonnet | haiku | Model có lợi |
| --- | --- | --- | --- | --- |
| Coding | 96.3 / 5.03 | 94.7 / 5.19 | 84.5 / 0.19 | opus; sonnet đắt hơn mà điểm thấp hơn |
| Design | 86.9 / 5.75 | 85.0 / 5.89 | 82.2 / 0.18 | haiku cho việc nhỏ, opus khi cần chất lượng |
| Long-Horizon (agentic) | 85.0 / 38.01 | 78.8 / 35.01 | 56.6 / 2.05 | opus; không dùng haiku |
| Browser Use | 80.0 / 14.67 | 84.0 / 7.72 | 88.0 / 0.36 | haiku: điểm cao nhất, rẻ nhất |
| Research | 85.0 / 8.62 | 83.6 / 9.78 | 73.7 / 0.39 | opus; sonnet đắt hơn mà điểm thấp hơn |
| Data Analysis | 80.3 / 0.82 | 59.5 / 0.53 | 51.8 / 0.03 | opus; hai model kia kém xa |
| Reasoning | 92.2 / 0.25 | 91.6 / 0.21 | 84.6 / 0.02 | haiku cho việc ngắn, opus cho việc nặng |

Ở effort max, sonnet thua opus về cả điểm lẫn giá ở Coding, Design, Research (sonnet sinh nhiều token hơn). Suy luận: sonnet chỉ còn lợi ở effort high, nơi AA đo nó rẻ hơn opus medium; nếu sonnet high bị chê thì lên opus thay vì tăng effort sonnet. Bản [v1](https://livebench.ai/v1/) (2026-06-25) cho thấy xhigh không kém max (sonnet 78.2 so với 75.8, haiku 72.9 so với 68.4), nên không dùng max.

## Bảng mặc định

| Việc | Suite gần nhất | Model, effort | Ghi chú |
| --- | --- | --- | --- |
| interview-me, spec, plan | Reasoning, Long-Horizon | opus medium | opus high khi chạm 3+ file nóng (catalog-runtime, motion.js, skeleton-flow, design-system) |
| Motion/UI trong `src/site` | Coding, Design | sonnet high | opus medium khi chạm 3+ file nóng hoặc sau một lần owner chê |
| Perf/fps gate phone Android | Data Analysis, Long-Horizon | opus high | opus xhigh chỉ sau một vòng đo vẫn chưa đạt |
| Sửa e2e có test đỏ rõ | Coding | sonnet high | opus medium nếu sửa xong vẫn đỏ |
| Phân tích số liệu (thống kê ảnh, số đo, log) | Data Analysis | opus medium | sonnet, haiku dưới 60 điểm |
| Research (SEO, đối thủ, tài liệu ngoài) | Research | opus medium | haiku high chỉ để gom link, không tổng hợp |
| QA trình duyệt, đo thiết bị (Playwright, CDP, adb) | Browser Use | haiku xhigh | chẩn đoán số đo thuộc thread perf |
| Docs, STATE, Notion, memory | Reasoning | haiku xhigh | sonnet high khi context dài hoặc owner chê |
| Relay, kiểm tra CI/PR, đổi status card, search chỉ đọc | Reasoning | haiku medium | haiku không sửa code sẽ merge |
| Chạy lại hoặc thêm runner CI | Long-Horizon ngắn | haiku xhigh | lên sonnet high nếu quá vài bước |
| Chấm ảnh | không có | sonnet high | không benchmark nào đo vision; theo gate trong [QA ảnh](agent-rule-ad-images.md#chấm-điểm) |
| Wrap-up deep code-review | Coding | owner đặt | khởi động không kèm tham số |

Haiku chỉ cho việc ngắn; việc nhiều bước nhiều tool dùng sonnet high trở lên. Không đặt override effort cố định cho một thread; chỉ owner đặt lại khi cần. `ponytail-audit` và `ponytail-debt` ngoài wrap-up chạy opus medium, chỉ khi owner gọi.

## Leo bậc

Leo một bậc theo Pareto (haiku medium, haiku xhigh, sonnet high, opus medium, opus high, opus xhigh) khi cùng một check đỏ hai lần liên tiếp sau khi sửa, hoặc owner chê kết quả. Áp dụng cho lần thử lại; task kế tiếp bắt đầu lại từ mặc định. Không leo vì lỗi môi trường (runner offline, cloud-Chromium). Opus max chỉ cho perf hoặc security và cần owner duyệt riêng.

## Chú thích thuật ngữ

- **Effort**: mức suy luận của model (low, medium, high, xhigh, max); cao hơn thì tốt hơn nhưng tốn usage hơn.
- **Intelligence Index**: điểm tổng hợp của Artificial Analysis trên nhiều bộ test.
- **Pareto**: tập lựa chọn không bị lựa chọn khác vừa điểm cao hơn vừa rẻ hơn vượt qua.
- **Suite**: nhóm bài test của LiveBench theo loại job (Coding, Design, Browser Use...).
- **Subagent**: worker do Agent tool tạo trong một thread.
- **File nóng**: file nhiều thread cùng sửa, dễ conflict.
- **Leo bậc**: nâng model hoặc effort cho lần thử lại sau khi lần trước thất bại.
