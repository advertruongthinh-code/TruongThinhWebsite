---
title: Tùy chỉnh Superpowers cho ChatGPT và Codex
type: tooling
status: retired
updated: 2026-09-23
notion: none
related_reports:
  - ../archive/reports/research-codex-orchestration-skills-2026-09-08.md
---

# Tùy chỉnh Superpowers cho ChatGPT và Codex

> Spec này ghi lại gói cài đặt lịch sử. Owner đã yêu cầu retire skill và gỡ nó
> khỏi repo, bootstrap và user-global catalog ngày 2026-09-23. Giữ spec/evidence
> cũ để truy nguyên; policy hiện hành nằm trong
> [rule workflow và tool](../operations/agent-rule-workflow-tools.md).

Intent, spec và implementation plan đã được owner duyệt trong session ngày
2026-09-08. Đã cài và nghiệm thu scoped ngày 2026-09-09; xem
[evidence và giới hạn](../archive/reports/verification-superpowers-codex-2026-09-08.md).

## Mục tiêu và intent đã xác nhận

Lấy Superpowers làm upstream cho workflow từ trao đổi yêu cầu đến nghiệm thu.
ChatGPT web/app phục vụ trao đổi, làm rõ yêu cầu và lập kế hoạch. Codex Desktop
tiếp nhận context, kiểm tra repository và điều phối thực thi trên Windows.
Người dùng là solo developer; main agent là đầu mối giao tiếp trực tiếp với owner.

| ID | Yêu cầu đã xác nhận |
| --- | --- |
| R1 | Main lấy ý kiến, feedback và user requirement specification; đánh giá độ mơ hồ, phạm vi, rủi ro và khả năng kiểm chứng trước khi chọn cách thực hiện. |
| R2 | Main được implement task nhỏ; task cần delegation được giao cho subagent theo phạm vi rõ. Main giữ quyết định và nghiệm thu. |
| R3 | Routing xem xét mọi model/effort thực sự khả dụng cho subagent, kể cả Codex Spark; không giới hạn vào một danh sách model cố định. |
| R4 | Model/effort thấp nhận chỉ dẫn cụ thể hơn. Chỉ dẫn phải đủ để thực hiện và kiểm chứng mà không phải tự thiết kế phần chưa chốt. |
| R5 | Tối ưu tổng chi phí để đạt nghiệm thu, gồm retry và review; tính thời gian chờ và feedback sửa sai, không mặc định chọn model có đơn giá thấp nhất. |

Giữ requirement và quality bar trong mọi lần chia việc, đổi model hoặc sửa lỗi.
Không tự đổi model main, cài thêm framework hay sửa cấu hình ngoài scope được duyệt.

## Phạm vi của một workflow

Workflow gồm intake, handoff, quyết định solo/delegate, routing, giao việc,
review và nghiệm thu. Đây là các bước của cùng hợp đồng điều phối, không phải
các sản phẩm hoặc dịch vụ độc lập.

Global skill cung cấp workflow tái sử dụng. Policy project giữ ownership,
Graphify/Serena, evidence, Git và quy tắc sản phẩm. ChatGPT nhận bản hướng dẫn
và handoff tự chứa; không giả định nó truy cập được filesystem hoặc tool của Codex.

Ngoài scope: thay Graphify; build semantic index tự động; sửa UI/backend website;
cài agent runtime/framework khác; mua API/credits; benchmark trả phí không giới hạn;
đồng bộ tài khoản tự động; thêm Codex lifecycle hook; tự chuyển model main;
chỉnh model catalog để làm xuất hiện model không callable.

## Nền tảng và nguồn chuẩn

Upstream: [obra/superpowers](https://github.com/obra/superpowers), đặc biệt
[subagent-driven-development](https://github.com/obra/superpowers/blob/main/skills/subagent-driven-development/SKILL.md)
và [writing-plans](https://github.com/obra/superpowers/blob/main/skills/writing-plans/SKILL.md).
Khi implementation phải resolve một commit cụ thể và kiểm diff trước khi pin.
Nhánh main trong link này phục vụ discovery, không phải installation pin.

Giữ workflow planning, worker context riêng và review của upstream. Phần tùy
chỉnh bổ sung host capability, model/effort routing, quyền main làm task nhỏ và
project compatibility. Không giả định upstream đã đáp ứng các bổ sung này.

Tool schema và chỉ dẫn host đang chạy quyết định thao tác được phép. Skill
không thể tự cấp tool, model, quyền spawn hoặc quyền ghi ngoài authorization.
Model xuất hiện ở composer hay create-thread catalog chưa chứng minh nó callable
qua native subagent tool.

## Hành vi coordinator

Main giữ cuộc trao đổi với owner, intent, specification và acceptance criteria.
Worker không tự thay yêu cầu hoặc hỏi owner qua kênh ngoài. Câu hỏi và phát hiện
vượt phạm vi quay về main; main giải quyết từ evidence hoặc hỏi owner khi cần.

Đề xuất điều kiện task nhỏ để main implement trực tiếp: yêu cầu rõ, một thay đổi
cục bộ, ít phụ thuộc, rủi ro thấp, không đòi quyết định kiến trúc và có check tập
trung chứng minh kết quả. Số file/LOC chỉ là tín hiệu; một dòng liên quan quyền
truy cập, dữ liệu hoặc concurrency không tự trở thành task nhỏ.

Main ghi một lý do ngắn cho solo hoặc delegation. Không tạo subagent chỉ để
đủ quy trình. Với task đã giao, main có thể sửa gap nhỏ đáp ứng cùng điều kiện
trên sau khi bảo đảm worker không còn ghi vào phạm vi đó; thay đổi này phải
được đưa vào evidence và review tương ứng.

Feedback mới của owner được main phân loại thành clarification, correction hoặc
scope change. Dừng/điều chỉnh worker bị tác động; giữ nguyên phần độc lập. Mọi
worker nhận phiên bản yêu cầu mới trước khi tiếp tục phần phụ thuộc. Không coi
feedback là việc mới làm mất mục tiêu trước đó.

## Handoff ChatGPT và Codex

Handoff là Markdown người dùng có thể copy hoặc đính kèm. Nó chứa intent đã
chốt, requirement có ID, quyết định và lý do, constraint, acceptance criteria,
nguồn evidence, câu hỏi chưa giải quyết và mức authorization đã có.

Không chép toàn bộ lịch sử hội thoại nếu không cần. Không cắt constraint để
giảm context. Plan từ ChatGPT chưa được kiểm source phải ghi rõ giả định và
điểm cần Codex verify; Codex đối chiếu repository trước khi triển khai.

Host không có subagent tool vẫn được làm intake/spec/handoff, nhưng không được
claim đã chạy worker. Không tự tạo task user-visible hoặc gọi CLI ngoài để lách
giới hạn native subagent. Đổi cơ chế thực thi phải có authorization phù hợp và
nêu rõ khác biệt về context, quyền, chi phí và khả năng quan sát.

## Routing model và effort

Trước dispatch, main xác định lựa chọn từ tool schema/capability của host hiện
tại, gồm effort hợp lệ cho từng model. Không probe bằng cách spawn toàn catalog;
không đổi tên model dựa trên suy đoán. Tôn trọng model/effort owner chỉ định.

Mọi model trong catalog callable đều là ứng viên, không bắt buộc sử dụng hết.
Spark được xem xét khi callable qua cơ chế subagent đang dùng. Nếu chỉ có trong
catalog tạo task riêng, phải ghi rõ giới hạn và chọn phương án callable phù hợp;
không âm thầm mở task mới để gọi Spark.

Main chọn route dựa trên độ mơ hồ, phạm vi, mức phán đoán cần thiết, rủi ro,
khả năng kiểm chứng, độ lớn context và bằng chứng từ các task tương đương.
Không coi effort là một thang hỗ trợ giống nhau trên mọi model; chỉ dùng cặp hợp lệ.

Mỗi dispatch chỉ định model và effort khi host hỗ trợ và cho phép. Với schema
Codex hiện tại, override model/effort dùng `fork_turns="none"` và brief tự chứa;
không kết hợp override với full-history inheritance. Nếu custom role có pin
ghi đè, main phải giải quyết theo capability thực tế trước dispatch.

Ghi model/effort được yêu cầu và giá trị quan sát được nếu runtime cung cấp.
Không có dữ liệu effective thì ghi unknown, không khẳng định request chính là
model thực chạy. Availability error khiến main cập nhật khả năng đã biết rồi
chọn lại; không retry mù cùng route hoặc làm yếu tiêu chí nghiệm thu.

## Brief tương ứng với năng lực worker

Mọi brief có requirement ID, source/spec liên quan, ownership, dependency,
constraint, acceptance và định dạng báo cáo. Đường dẫn phải dùng được trong
workspace của worker; spec dài có thể dẫn exact section nhưng không chỉ gửi
một bản tóm tắt làm mất yêu cầu.

| Mức độ tự phán đoán dự kiến | Độ cụ thể bắt buộc |
| --- | --- |
| Thấp, task cơ học | Exact file/symbol, before/after hoặc patch intent, thứ tự sửa, pattern đã verify, edge case, lệnh và kết quả kỳ vọng. Không để quyết định thiết kế còn mở. |
| Trung bình, implementation có giới hạn | Hợp đồng hành vi, module boundary, API, invariant, pattern, test và điểm cần báo main. Cho phép tự chọn chi tiết cục bộ. |
| Cao, phân tích hoặc quyết định khó | Intent đầy đủ, evidence, phương án/tradeoff cần đánh giá và quyền quyết định. Không mặc định prompt ngắn hơn hoặc bỏ constraint. |

Giảm model/effort cần kiểm brief có đủ cụ thể hơn ở phần worker sẽ phải suy
luận hay không. Nếu viết brief gần bằng tự làm, main cân nhắc solo cho task nhỏ
hoặc model mạnh hơn; không viết lời giải dài chỉ để ép model rẻ. Không giao task
còn mơ hồ cho model thấp bằng cách tăng số câu chung chung.

Ví dụ packet về cấu trúc, không phải command để chạy:

```yaml
requirements: [R-example]
ownership: [absolute/path/to/owned-file]
change: "Apply the verified local pattern at the named symbol."
constraints: ["Preserve public behavior outside this requirement."]
verification: ["Run the exact focused check supplied by the coordinator."]
return: [status, changed_files, evidence, unresolved_questions]
```

## Đồng thời, checkpoint và nghiệm thu

Chỉ parallel khi các phần có thể chạy độc lập; không có hai writer trên cùng
file hoặc shared schema/config. Worker được thông báo có người khác cùng làm,
không revert thay đổi của họ. Main quản lý dependency và giới hạn concurrency
theo runtime; không hardcode số worker từ session cũ.

Mặc định main điều phối một tầng worker. Manager trung gian chỉ dùng khi có
package độc lập đủ lớn, tiết kiệm context/điều phối rõ và runtime cho phép;
main vẫn chịu final acceptance. Worker không tự fan-out vô hạn.

Checkpoint ghi requirement version, task ID, ownership, route đã chọn, trạng
thái, kết quả được chấp nhận và evidence path. Sau compaction chỉ resume phần
chưa hoàn thành; verify evidence trước khi tái sử dụng. Không dùng docs/STATE.md
làm log từng worker, không viết vào Codex memory ngoài authorization.

Worker report là claim. Main kiểm artifact/diff và tính liên quan của test.
Thay đổi đáng kể có review độc lập phù hợp rủi ro; task nhỏ không bị ép thêm
nhiều reviewer. Tái chạy test khi code/evidence đổi hoặc có nghi vấn cụ thể,
không chạy lại toàn suite chỉ vì đổi phase.

Thiếu context thì bổ sung; task quá lớn thì chia lại; thiếu năng lực thì nâng
route. Ba lần sửa cùng vấn đề không tạo evidence mới phải dừng vòng đó, nêu
giả định đáng ngờ và đưa về main/owner phù hợp. Không hạ acceptance để đóng task.

## Chi phí và hiệu quả

So sánh tổng công sức để đạt acceptance: coordinator chuẩn bị brief, worker,
review, retry, thời gian chờ và correction từ owner. Chỉ tính tiền/credits khi
host cung cấp dữ liệu tương ứng; quota phần trăm không phải chi phí riêng task.
Không có dữ liệu thì ghi unknown và dùng latency, lượt gọi, retry, pass rate làm
chỉ báo; không tuyên bố phần trăm tiết kiệm hoặc route tối ưu đã được chứng minh.

Chính sách routing ban đầu là heuristic. Chỉ hiệu chỉnh từ các task tương đương
với cùng quality bar. Không chủ động chạy benchmark dài hoặc trả phí ngoài scope
verification đã duyệt. Tăng model được chấp nhận nếu tổng chi phí kỳ vọng thấp hơn.

## Tích hợp và layout dự kiến

Source tùy chỉnh phải review được trong Git, tách khỏi vendor/cache global.
Giữ pin upstream, license/attribution và một tập diff/overlay tối thiểu; update
upstream không được ghi đè âm thầm phần tùy chỉnh. Cơ chế cụ thể thuộc plan.

| Scope | Trách nhiệm |
| --- | --- |
| `docs/specs/`, `docs/reports/` | Spec và evidence được duyệt |
| `scripts/tooling/`, `tests/tooling/` | Tái sử dụng bootstrap/fixture hiện có khi phù hợp; không tạo runner riêng mặc định |
| User-global skills/policy | Workflow dùng lại giữa project, chỉ thay các phần được duyệt |
| Project AGENTS/rule module | Graphify trước, Serena theo sau, no-emoji, tiếng Việt, Git/human gate |
| ChatGPT handoff | Markdown tự chứa, không yêu cầu filesystem hoặc plugin Codex |

Khi triển khai phải xử lý xung đột rule semantic Luna/max với routing linh hoạt;
giữ điều kiện explicit request cho Graphify semantic extraction. Không duy trì
hai lifecycle router đồng thời. Skill không liên quan vẫn giữ nguyên, không đổi
policy của project khác thông qua chỉnh project-local ngoài scope.

## Commands và verification

Các command hiện có dùng được để kiểm baseline tooling tại repository:

```powershell
pwsh -NoProfile -File tests/tooling/global-stack-update-fixtures.ps1
pwsh -NoProfile -File tests/tooling/skill-compatibility-fixtures.ps1
pwsh -NoProfile -File scripts/tooling/doctor.ps1 -Mcp
```

Chỉ dùng MCP doctor khi đã triển khai phần ảnh hưởng startup/config; spec này
không yêu cầu chạy runtime check hoặc spawn worker. Command cho fixture mới phải
được xác định trong plan và tồn tại khi implementation được nghiệm thu.

Markdown project dùng tiếng Việt, thuật ngữ chính xác và không emoji; comment
code English. Tái sử dụng PowerShell/Node và test pattern hiện có. Không cài
test framework mới cho routing policy bằng văn bản.

## Acceptance scenarios

| ID | Kịch bản và điều kiện PASS |
| --- | --- |
| AC1 / R1 | Handoff ChatGPT có requirement, constraint, quyết định, unknown và authorization. Codex phân biệt source fact với giả định chưa verify. |
| AC2 / R2 | Task rõ, nhỏ, rủi ro thấp có thể solo; thay đổi một dòng nhưng rủi ro cao không bị phân loại nhỏ chỉ theo LOC. Main giải thích lựa chọn. |
| AC3 / R3 | Catalog fixture có Spark thì Spark được xem xét; thiếu Spark thì báo giới hạn. Không sinh model/effort không hợp lệ hoặc dùng create-thread thay native spawn ngầm. |
| AC4 / R3 | Dispatch lưu requested route, xử lý role pin và fork constraints; effective route không có evidence phải unknown. |
| AC5 / R4 | Brief cho worker thấp có file/symbol, pattern, before/after, edge case và check cụ thể; requirement không mất khi rút context. |
| AC6 / R5 | Case model rẻ nhưng retry nhiều được đánh giá theo tổng chi phí; thiếu tiền/credits không tạo số tiết kiệm giả. |
| AC7 / R1–R4 | Owner sửa requirement giữa lúc chạy: worker liên quan nhận revision mới; phần độc lập và evidence đã hợp lệ được giữ. |
| AC8 / R2–R5 | Overlapping writers không được dispatch song song; checkpoint ngăn giao lại task đã nghiệm thu sau compaction. |
| AC9 / R2–R5 | Worker báo PASS nhưng không có artifact/test phù hợp thì main không nghiệm thu; lỗi lặp lại được phân loại và escalation có giới hạn. |
| AC10 / R1–R5 | Install/update tùy chỉnh giữ policy không liên quan, có backup/rollback và không thêm hook; Graphify/Serena vẫn hoạt động. |

Fixtures kiểm contract có thể kiểm máy; review scenario kiểm instruction và
quyết định. Một smoke task nhỏ sau install phải quan sát được dispatch và evidence
thực. Fixture pass không chứng minh mọi model/effort đã được thử hoặc tối ưu chi phí.

## Boundary và trạng thái duyệt

Luôn giữ user intent, authorization, acceptance và evidence; main công bố scope
thay đổi. Spec approval cho phép soạn plan; implementation cần plan được duyệt
theo rule project. Quyền đã cấp không bị hỏi lại cho từng bước trong scope.

Hỏi owner khi thiếu quyết định thật sự cần thiết hoặc có hành động destructive,
external side effect chưa được phép. Không biến mọi lựa chọn kỹ thuật thành gate.
Không tự commit, push, deploy, tạo Notion card hoặc cài plugin trong phase spec.

Chưa quyết định ở phase này: tập file upstream tối thiểu, overlay hay fork,
đường dẫn handoff/checkpoint cụ thể và fixture mới. Đây là chi tiết plan sau khi
owner duyệt hành vi, không phải quyền để tự triển khai khi spec chưa được duyệt.

## Chú thích thuật ngữ

- **Upstream**: repository Superpowers gốc làm nguồn cập nhật.
- **Coordinator**: main agent giữ giao tiếp, phân công và nghiệm thu.
- **Callable**: tool thực thi của host gọi được, không chỉ hiện tên trong catalog.
- **Brief**: gói yêu cầu và evidence cung cấp cho worker.
- **Acceptance**: điều kiện nghiệm thu không được tự hạ trong quá trình thực hiện.
- **Overlay**: phần tùy chỉnh được áp dụng có kiểm soát lên source đã pin.
- **Heuristic**: nguyên tắc lựa chọn ban đầu, chưa phải kết quả tối ưu đã đo được.
