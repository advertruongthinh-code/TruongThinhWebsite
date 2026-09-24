# Skill điều phối subagent trên GitHub

Ngày tra cứu: 2026-09-08. Yêu cầu: main đánh giá task, chia nhỏ, chọn model và
effort, điều phối và nghiệm thu; subagent thực hiện. Đây là review source skill,
không phải benchmark hoặc xác nhận chạy thành công trong host này. Chưa cài ứng viên.

## Kết luận

`efficient-codex-orchestrator` gần nhất về chọn model/effort theo loại việc.
`orchestrate` của danielrahman sát nhất về main không implement. `superpowers`
có quy trình giao việc và review rộng hơn nhưng phần skill đã đọc chưa định
nghĩa effort routing cụ thể cho Codex. Chưa thấy ứng viên nào trong shortlist
đáp ứng toàn bộ yêu cầu và policy hiện tại mà không cần điều chỉnh.

## Shortlist đã đọc

| Skill/source | Khớp yêu cầu | Khoảng cách cần xử lý |
| --- | --- | --- |
| [efficient-codex-orchestrator](https://github.com/EmergentKnowledgeGroup/Codex_audit/blob/aea200ccc3cd15e970a8e3e1b0e0217c2b2da0b4/skills/efficient-codex-orchestrator/SKILL.md) | Main giữ intent/acceptance; chọn topology; phân Sol/Terra/Luna và effort; giao ownership, evidence, giới hạn rework | Bảng pin theo model cũ, chưa có Astra; cho phép root-only và main viết spec/docs; hierarchy có thể thêm overhead |
| [subagent-driven-development](https://github.com/obra/superpowers/blob/b36e0829c6d0140e93cfef2ca599b1b07d4a7797/skills/subagent-driven-development/SKILL.md) | Worker context riêng; model tier theo complexity; review spec/quality từng task và toàn branch; escalation | Bắt đầu từ implementation plan, cần skill planning đi kèm; chưa có effort routing riêng; phụ thuộc các skill/template khác; workflow commit/worktree cần khớp project |
| [orchestrate, Codex leader](https://github.com/danielrahman/claude-orchestrate-skill/blob/ea2545841375a92b0a28d784be9f036e7fd253f1/.codex/skills/orchestrate/SKILL.md) | Main chỉ research/plan/dispatch/review/integrate; native spawn đúng schema; verifier độc lập và leader audit; effort theo role | Mọi worker bị pin Sol; UI có nhiều pass/prototype mặc định; cần sửa model routing và giữ owner gate thiết kế |
| [subagent-orchestration](https://github.com/Anygent/codex-subagent-orchestration-skill/blob/4458a9fa0cc550d809f9674b472c6a8c17170d4c/.codex/subagent-orchestration/SKILL.md) | Discovery, staged plan, file ownership, delegation, QA; mapping tier rõ | Tool `multi_agent_v1`, `fork_context` và model map đã cũ; mọi tier đều medium; cho main sửa trực tiếp gap nhỏ; không đáp ứng routing effort linh hoạt |

Đánh giá trên là suy luận từ instruction trong từng SKILL.md, không phải bảo
đảm instruction sẽ được agent tuân thủ. Skill là policy bằng văn bản; kết quả
dispatch vẫn phải kiểm tool arguments và evidence.

## Mức độ cộng đồng và version evidence

Snapshot GitHub API, dùng để thấy độ trưởng thành tương đối, không suy ra chất lượng:

| Repository | Stars / forks | Commit đã đối chiếu | License |
| --- | --- | --- | --- |
| EmergentKnowledgeGroup/Codex_audit | 3 / 0 | aea200ccc3cd15e970a8e3e1b0e0217c2b2da0b4 | MIT |
| obra/superpowers | 283177 / 25377 | b36e0829c6d0140e93cfef2ca599b1b07d4a7797 | MIT |
| danielrahman/claude-orchestrate-skill | 0 / 0 | ea2545841375a92b0a28d784be9f036e7fd253f1 | MIT |
| Anygent/codex-subagent-orchestration-skill | 1 / 0 | 4458a9fa0cc550d809f9674b472c6a8c17170d4c | MIT |

Source metadata: GitHub repository/commit API của các repository liên kết trên.
Stars và nhánh main có thể thay đổi; các permalink giữ snapshot để review lại.

## Ứng viên không ưu tiên

[2manslkh/codex-orchestrator](https://github.com/2manslkh/codex-orchestrator/blob/main/skills/codex-sol-terra-luna-orchestrator/SKILL.md)
có bảng route model/effort, escalation và verifier; nhưng skill đã đọc đặt
Hermes làm coordinator, dùng Codex CLI subprocess và runner chỉ hỗ trợ macOS/Linux.
Không phù hợp cài nguyên trạng vào Codex Desktop Windows/native subagent.

`codex-app-loop-crew` và `codex-agent-orchestration-skill` xuất hiện trong kết quả
tìm kiếm nhưng nhấn mạnh task/thread bền vững, lane và automation. Chưa review
đủ để khuyến nghị; không đánh đồng task user-visible với native subagent.

## Khuyến nghị cho project này

Ưu tiên thử một bản pin của `efficient-codex-orchestrator` nếu mục tiêu chính là
main tự chọn model/effort. Trước khi áp dụng cần mapping theo model thực sự callable
của host, giữ Astra ở main, giới hạn tầng delegation và ghi rõ main không viết
implementation. Không dùng bất kỳ hướng dẫn chỉnh model catalog để tạo availability.

Nếu ưu tiên quy trình triển khai/review có hệ sinh thái lớn, chọn `superpowers`
nhưng chỉ đưa vào bộ skill và template cần thiết; tránh chồng hai lifecycle router.
Chỉ dùng `orchestrate` của danielrahman khi chấp nhận điều chỉnh pin Sol và các UI
pass cố định. Anygent cần nhiều sửa compatibility hơn nên xếp sau.

Rule global/project hiện pin semantic task Luna/max, do đó xung đột với effort
routing tự do của các ứng viên. Đợt tìm kiếm này chưa sửa rule đó, chưa cài plugin,
chưa thay `cavecrew`, chưa thêm lifecycle hook và chưa chạy benchmark routing.

## Chú thích thuật ngữ

- **Coordinator**: agent giữ yêu cầu, phân công và nghiệm thu.
- **Topology**: cách tổ chức main, manager và worker.
- **Effort routing**: chọn reasoning effort theo task.
- **Ownership**: phạm vi file/module một worker được phép sửa.
- **Escalation**: chuyển việc lên model hoặc cấp quyết định phù hợp hơn.
