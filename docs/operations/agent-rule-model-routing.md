# Model và effort routing rule

Owner duyệt 2026-10-15 (hạ một bậc so với bảng 2026-10-11 vì mau chạm usage limit). Điều phối đặt model và effort cho mọi thread, subagent, ghi kèm lý do một dòng trong brief. Model cho phép: `opus`, `sonnet`, `haiku` (5.5); không dùng fable.

## Bảng mặc định

| Việc | Model, effort | Ghi chú |
| --- | --- | --- |
| interview-me, spec, plan | opus medium | opus high khi chạm 3+ file nóng (catalog-runtime, motion.js, skeleton-flow, design-system) |
| Motion/UI trong `src/site` | sonnet high | opus high khi chạm 3+ file nóng hoặc sau một lần owner chê |
| Perf/fps gate A05s | opus high | opus xhigh chỉ sau một vòng đo vẫn chưa đạt |
| Sửa e2e có test đỏ rõ | sonnet medium | sonnet high nếu sửa xong vẫn đỏ |
| Docs, STATE, Notion, memory | sonnet medium | không đổi |
| Relay, kiểm tra CI/PR, đổi status card, search chỉ đọc | haiku medium | haiku không sửa code sẽ merge |
| Đo thiết bị bằng script (adb, CDP) | sonnet medium | chẩn đoán số đo thuộc thread perf |
| Chạy lại hoặc thêm runner CI | sonnet medium | không đổi |
| Chấm ảnh | 1 agent, sonnet medium | theo gate trong [QA ảnh](agent-rule-evidence-qa-handoff.md#chấm-ảnh-advertising) |
| Wrap-up deep code-review | owner đặt | khởi động không kèm tham số |

Không dùng sonnet xhigh hoặc max. Không đặt override effort cố định cho một thread; chỉ owner đặt lại khi cần.

## Review và ponytail

- Thread tự review five-axis diff của mình; không tạo reviewer subagent mặc định.
- Reviewer subagent (sonnet high) chỉ khi diff trên 300 dòng hoặc đụng security.
- `ponytail-review` chạy trực tiếp trong thread, không tạo subagent. `ponytail-audit` và `ponytail-debt` ngoài wrap-up chạy opus medium, chỉ khi owner gọi.

## Subagent

- Tối đa 2 subagent chạy cùng lúc; mặc định 0 cho task dưới 200 dòng.
- Không fan-out persona, trừ lúc ship.
- Subagent đọc code, search: haiku medium.

## Leo bậc

Leo một bậc (haiku, sonnet medium, sonnet high, opus medium, opus high, opus xhigh) khi cùng một check đỏ hai lần liên tiếp sau khi sửa, hoặc owner chê kết quả. Áp dụng cho lần thử lại; task kế tiếp bắt đầu lại từ mặc định. Không leo vì lỗi môi trường (runner offline, cloud-Chromium). Opus max chỉ cho perf hoặc security và cần owner duyệt riêng.

## Chú thích thuật ngữ

- **Effort**: mức suy luận của model (low, medium, high, xhigh, max); cao hơn thì tốt hơn nhưng tốn usage hơn.
- **Subagent**: worker do Agent tool tạo trong một thread.
- **File nóng**: file nhiều thread cùng sửa, dễ conflict.
- **Leo bậc**: nâng model hoặc effort cho lần thử lại sau khi lần trước thất bại.
