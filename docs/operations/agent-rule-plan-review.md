# Spec, plan cho implementer và thread reviewer

Owner yêu cầu 2026-10-31. Lifecycle và human gate ở [Skill lifecycle](agent-rule-workflow-tools.md#skill-lifecycle); model, effort ở [Claude routing](agent-rule-model-routing.md#bảng-mặc-định). File này chỉ thêm hai rule: độ chi tiết của spec, plan và khi nào cần thread reviewer riêng.

## Spec và plan viết cho implementer yếu hơn

Thread implementer thường chạy model rẻ hơn với effort không cao (sonnet high, haiku xhigh), còn spec và plan do opus viết. Implementer không được phải tự ra quyết định thiết kế; mọi quyết định nằm sẵn trong spec, plan. Mỗi task trong plan ghi:

1. Mục tiêu một câu và requirement spec liên quan (link `R` số).
2. File và symbol cụ thể phải sửa (path đầy đủ, tên hàm, selector CSS), kèm hành vi hiện tại và hành vi muốn có.
3. Thứ tự bước; logic không hiển nhiên ghi pseudocode hoặc đoạn code mẫu, nêu lý do chọn cách đó.
4. Edge case và cách xử lý từng case (rỗng, lỗi tải, viewport phone 384px, VI/EN, reduced motion khi liên quan).
5. Ngoài phạm vi: file, hành vi không được đụng; file nóng phải giữ nguyên.
6. Kiểm: command chính xác (`pnpm qa:*`, test cụ thể) và kết quả mong đợi; acceptance criteria đo được, không viết "chạy đúng" hay "đẹp".
7. Bẫy đã biết: gotcha của module, PR hoặc issue cũ liên quan.

Implementer gặp chỗ plan không trả lời được thì dừng và hỏi điều phối, không đoán. Câu trả lời ghi lại vào plan (card) để thread sau không hỏi lại. Plan thiếu một trong bảy mục trên thì chưa đủ để trình owner duyệt.

## Thread reviewer riêng cho task dài

### Ngưỡng task dài

Task là dài khi estimate trong plan, hoặc diff thực tế trước merge, khớp ít nhất một điều kiện:

| Điều kiện | Ngưỡng |
| --- | --- |
| `LOC` (định nghĩa ở [Notion](notion.md#rule)) | từ 400 |
| File source/test bị sửa, thêm, xóa | từ 8 |
| File nóng ([routing](agent-rule-model-routing.md#bảng-mặc-định)) | từ 2 |
| Vùng bị chạm: `src/site/`, CMS (`src/worker/`, `src/admin/`, `src/db/`), `scripts/` và `.github/workflows/`, `design-system/` | từ 2 vùng |

Lý do (suy luận): task từ `200 LOC` đã phải ghi estimate trên card; 400 là gấp đôi, cũng là mức một lần review còn đọc kỹ được. Task dưới ngưỡng giữ self-review five-axis và `ponytail-review` như cũ ([AGENTS.md](../../AGENTS.md#branch-pr-và-merge)).

### Quy trình

1. Plan ghi trước task có dài không theo bảng trên. Diff vượt ngưỡng giữa chừng thì implementer báo điều phối ngay.
2. Implementer mở PR dạng draft hoặc gắn nhãn `hold` để `Automerge` không merge trước khi review xong; tự review và chạy `ponytail-review` như thường.
3. Điều phối mở thread reviewer (model theo [routing](agent-rule-model-routing.md#bảng-mặc-định); chạm CMS thì opus high), brief gồm link PR, spec, plan (card) và ngưỡng nào bị chạm. Reviewer không phải thread implementer.
4. Reviewer chỉ đọc, không push code. Đi đủ các bước:
   - `using-agent-skills` định tuyến, ghi dòng `Skill:` cho từng skill.
   - `code-review-and-quality` (five-axis) trên toàn diff, đọc cả code liên quan, không chỉ dòng đổi; `ponytail-review` target link PR.
   - Đối chiếu từng task trong plan và từng `R` trong spec: thiếu, sai, thừa phạm vi.
   - Persona `code-reviewer` luôn chạy; thêm `security-auditor` khi chạm CMS, input người dùng, secret; `test-engineer` khi thêm hoặc đổi test; `web-performance-auditor` khi chạm motion, ảnh, tải trang. Persona chạy dạng sibling review theo [Skill lifecycle](agent-rule-workflow-tools.md#skill-lifecycle) mục 6; reviewer hợp nhất kết quả.
   - UI đổi: `impeccable` `audit` trên URL của `pnpm dev`.
   - Kiểm lại claim bằng tool (chạy test, Graphify blast radius); finding chưa tái hiện được ghi là nghi vấn.
5. Kết quả là review trên PR: mỗi finding có mức (chặn merge, nên sửa, nhỏ), `file:dòng`, nguyên nhân, cách sửa; cuối ghi kết luận đạt hoặc cần sửa.
6. Implementer sửa finding chặn merge và nên sửa, reviewer kiểm lại đúng các finding đó. Sau hai vòng vẫn còn finding chặn merge thì reviewer báo điều phối, không mở vòng ba.
7. Reviewer kết luận đạt thì implementer bỏ draft hoặc nhãn `hold`; `Automerge` merge khi CI xanh.

## Chú thích thuật ngữ

- **Implementer**: thread viết code theo plan đã duyệt.
- **Reviewer**: thread riêng chỉ review PR của implementer, không sửa code.
- **Persona**: agent review chuyên biệt của bộ agent-skills (code-reviewer, security-auditor, test-engineer, web-performance-auditor).
- **Finding**: một lỗi hoặc điểm cần sửa do review tìm ra.
- **File nóng**: file nhiều thread cùng sửa, dễ conflict.
- **Blast radius**: phạm vi code bị ảnh hưởng khi đổi một chỗ.
