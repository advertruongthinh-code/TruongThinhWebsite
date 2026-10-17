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

## Bảng mặc định

| Việc | Model, effort | Ghi chú |
| --- | --- | --- |
| interview-me, spec, plan | opus medium | opus high khi chạm 3+ file nóng (catalog-runtime, motion.js, skeleton-flow, design-system) |
| Motion/UI trong `src/site` | sonnet high | opus medium khi chạm 3+ file nóng hoặc sau một lần owner chê |
| Perf/fps gate A05s | opus high | opus xhigh chỉ sau một vòng đo vẫn chưa đạt |
| Sửa e2e có test đỏ rõ | sonnet high | opus medium nếu sửa xong vẫn đỏ |
| Docs, STATE, Notion, memory | haiku xhigh | sonnet high khi context dài hoặc owner chê |
| Relay, kiểm tra CI/PR, đổi status card, search chỉ đọc | haiku medium | haiku không sửa code sẽ merge |
| Đo thiết bị bằng script (adb, CDP) | haiku xhigh | chẩn đoán số đo thuộc thread perf |
| Chạy lại hoặc thêm runner CI | haiku xhigh | không đổi |
| Chấm ảnh | sonnet high | Index không đo vision; theo gate trong [QA ảnh](agent-rule-ad-images.md#chấm-điểm) |
| Wrap-up deep code-review | owner đặt | khởi động không kèm tham số |

Không đặt override effort cố định cho một thread; chỉ owner đặt lại khi cần. `ponytail-audit` và `ponytail-debt` ngoài wrap-up chạy opus medium, chỉ khi owner gọi.

## Leo bậc

Leo một bậc theo Pareto (haiku medium, haiku xhigh, sonnet high, opus medium, opus high, opus xhigh) khi cùng một check đỏ hai lần liên tiếp sau khi sửa, hoặc owner chê kết quả. Áp dụng cho lần thử lại; task kế tiếp bắt đầu lại từ mặc định. Không leo vì lỗi môi trường (runner offline, cloud-Chromium). Opus max chỉ cho perf hoặc security và cần owner duyệt riêng.

## Chú thích thuật ngữ

- **Effort**: mức suy luận của model (low, medium, high, xhigh, max); cao hơn thì tốt hơn nhưng tốn usage hơn.
- **Intelligence Index**: điểm tổng hợp của Artificial Analysis trên nhiều bộ test.
- **Pareto**: tập lựa chọn không bị lựa chọn khác vừa điểm cao hơn vừa rẻ hơn vượt qua.
- **Subagent**: worker do Agent tool tạo trong một thread.
- **File nóng**: file nhiều thread cùng sửa, dễ conflict.
- **Leo bậc**: nâng model hoặc effort cho lần thử lại sau khi lần trước thất bại.
