# Điều phối Notion

Notion là mutable planning layer cho phần việc thay đổi thường xuyên. Git là
canonical record cho engineering knowledge, accepted spec, decision, report và
evidence đã được verify.

## Ranh giới Git và Notion

Notion sở hữu:

- Draft và proposal chưa được chấp nhận.
- NOW/Kanban state, priority, status, blocker và next action.
- Discovery note, knowledge note, research synthesis và link tới source.
- Work item, plan và task đang theo dõi.

Git sở hữu:

- Accepted spec, ADR/decision, runbook ổn định và implementation evidence.
- `docs/STATE.md`, `docs/specs/`, `docs/decisions/` và `docs/reports/`.
- `PRODUCT.md` và `DESIGN.md` khi các artifact này đã được xác nhận.

Không giữ accepted engineering knowledge chỉ trong Notion. Notion link tới Git
và giữ trạng thái mutable; không copy accepted document thành bản ghi cạnh
tranh.

## Có nên lưu docs trong Notion

Có, nếu đó là discovery note, draft, research synthesis hoặc hướng dẫn vận hành
đang đổi. Lợi ích là tìm kiếm, liên kết task, cập nhật trạng thái và cộng tác
nhanh. Giới hạn là khó review bằng diff, dễ lệch bản Git, khó kiểm chứng cùng
code và phụ thuộc quyền truy cập hoặc export của workspace.

Vì vậy Notion không thay Git: khi nội dung trở thành accepted spec, decision,
runbook hoặc evidence, Git giữ bản canonical; Notion chỉ giữ status, tóm tắt và
link tới file đó.

## Quy trình work item

1. Tìm work item hiện tại trong NOW/Kanban của Notion.
2. Đọc `docs/STATE.md` và các accepted Git document mà item liên kết.
3. Chọn workflow bằng `using-agent-skills`; chọn thêm Notion skill phù hợp:
   `notion-research-documentation`, `notion-knowledge-capture` hoặc
   `notion-spec-to-implementation`.
4. Implement một thin slice và verify bằng evidence của repository.
5. Cập nhật Git spec, decision hoặc report trước.
6. Cập nhật Notion item với status, evidence, blocker và next action mới.
7. Chỉ đánh dấu Done khi repository evidence đã verify.

## Approved specification

Working proposal có thể là một Notion **Spec** page liên kết với delivery work
item. Khi owner approve, tạo hoặc cập nhật Git document ở descriptive path:

```text
docs/specs/frontend-<descriptive-slug>.md
docs/specs/cms-<descriptive-slug>.md
```

Notion page giữ approval status, priority, owner và link tới Git file. Git spec
có thể giữ frontmatter key `notion:` để link ngược về page. Notion page một mình
không phải implementation contract đã được approve.

`notion-spec-to-implementation` chỉ được dùng khi:

- Notion Spec có status **Approved**.
- Field `Git spec` trỏ tới file canonical đã accepted.
- Plan và task mới liên kết ngược tới cả Notion Spec lẫn Git spec.

## Database và field hiện có

Schema Tasks được fetch lại ngày 2026-09-09: `Name` (title), `Status`,
`Project` (relation), `Due date`, `Thứ tự Up next` (number). Status hợp lệ là `Not started`, `Up next`,
`In progress`, `Done`. Những trường workflow trong bảng bên dưới là nội dung
cần ghi, không phải lời khẳng định database đã có property tương ứng; field
thiếu ghi trong body. Không gửi status `Approved` hoặc `Blocked` vào Tasks.
Phải fetch schema trước mỗi mutation có phụ thuộc schema.

`Thứ tự Up next` lưu thứ tự thực hiện do owner yêu cầu sắp xếp. Board
`By status` sort tăng dần theo field này; grouping vẫn theo `Status`. Chỉ gán
rank cho các card trong scope sắp xếp, không đổi tên, status hoặc ngày tạo để
ép thứ tự. Ghi lý do và dependency trong card. Khi xếp lại, ưu tiên card mới
theo `createdTime` trong những việc đã đủ điều kiện; prerequisite và QA/nghiệm
thu phải đúng trình tự. Rank không chứng minh implementation còn thiếu hay
đã hoàn tất; đối chiếu accepted spec/evidence trước khi thực hiện card cũ.

Workspace hiện có thể dùng các database sau cho project này:

| Database | Dùng cho |
| --- | --- |
| `Projects` | Một project record và các relation tới docs/tasks/meetings |
| `Docs` | Draft, research, decision summary hoặc runbook page mutable có link Git |
| `Tasks` | NOW/Kanban work item, status, project relation và due date |

Các field tối thiểu cho một work item:

| Field | Mục đích |
| --- | --- |
| `Name` | Outcome ngắn gọn |
| `Type` | `Discovery`, `Spec`, `Delivery`, `Bug`, `Research`, `Decision` hoặc `Draft` |
| `Status` | `Inbox`, `Discovery`, `Draft`, `Needs approval`, `Approved`, `In progress`, `Blocked` hoặc `Done` |
| `Priority` | Thứ tự xử lý hiện tại của solo developer |
| `Git spec` | Relative path tới spec canonical hoặc `none` |
| `Decisions` | Link tới descriptive decision đã accepted |
| `Evidence` | Link tới report hoặc verification result trong Git |
| `Blocker` | Dependency bên ngoài hiện tại hoặc `none` |
| `Next action` | Một action cụ thể cho thin slice kế tiếp |

Nếu database dùng chung chưa có field `Priority`, `Blocker` hoặc `Next action`, ghi
chúng trong page content theo đúng tên field; không tự ý phá schema dùng chung.
Khi cần schema riêng cho project, tạo database project-scoped và ghi schema,
owner, status lifecycle trong một Notion documentation page trước khi dùng.

## Skill hand-off

1. `using-agent-skills` chọn engineering workflow và evidence bắt buộc.
2. `notion-research-documentation` search/fetch/cite research hiện có trong
   Notion, sau đó tạo summary có references khi cần.
3. `notion-knowledge-capture` ghi decision, how-to hoặc knowledge summary sau
   khi Git artifact/evidence tương ứng đã tồn tại.
4. `notion-spec-to-implementation` chỉ tạo plan/task từ Notion Spec đã
   **Approved** và có `Git spec` canonical.
5. `notion-meeting-intelligence` chỉ dùng cho meeting, survey, agenda hoặc
   follow-up thật.

Khi Notion connector unavailable, không giả lập update. Ghi accepted work vào
Git trước và thêm Notion link khi connector hoạt động lại.

## Record project hiện tại

Các record mutable đang dùng cho project này:

- [Project Truong Thinh Website](https://app.notion.com/p/3b7332849a0e81c6bd2be63fe44e67ac): project record và relation tới Docs/Tasks.
- [Truong Thinh — Docs & Notion Hub](https://app.notion.com/p/3b7332849a0e81098aeeef782b88657f): hub vận hành và boundary Git–Notion.
- [Notion workspace mapping — Truong Thinh](https://app.notion.com/p/3b7332849a0e81449deec2780de541f3): research note về database/schema hiện có và seed page bị loại.
- [NOW Task: Dịch Markdown và thiết lập Notion docs hub](https://app.notion.com/p/3b7332849a0e81da892bec4641e6ab08): owner đã review và xác nhận Done ngày 2026-08-09.
- [Backlog hiện hành và phát hành snapshot 24/09](https://app.notion.com/p/3e5332849a0e8183b448fea095f9588f): một card In progress cho năm phần việc còn mở, liên kết tới Git evidence và các card nguồn.

Các link trên là mutable workspace reference. Nếu page được archive hoặc thay
đổi, cập nhật lại mục này sau khi verify record mới.

Kiểm link ngày 2026-09-09: project, hub và workspace mapping đọc được; card
dịch Markdown trả `object_not_found` 404 (chưa phân biệt thiếu quyền/đã xóa).
Hub vẫn ghi quy tắc một tầng category cũ; mapping là snapshot lịch sử ngày
2026-08-09. Không dùng các claim đó để ghi đè [docs routing](../index.md).
Card Advertising trả rank-v2/rapid-filter blocker cũ, trong khi accepted Git
spec/evidence đã có rank-v3/109 media. Không tự đóng card hoặc gọi runtime
PASS từ việc URL còn truy cập được. [Evidence audit](../verification/living-docs-2026-09-09.md)
giữ kết quả cùng timestamp payload; [card living docs](https://app.notion.com/p/3d5332849a0e817aad64f745684c0ca2)
theo dõi migration hiện tại.

Ngày 2026-09-24, đã đối chiếu 25 Tasks của project với Git hiện hành. Mười hai
card chưa Done có trạng thái hoặc nội dung cũ được chuyển vào Notion Trash sau
khi gom phần việc còn mở vào backlog mới; 13 card Done giữ làm lịch sử. Relation
Tasks của Project đã kiểm lại: 14 card đang hoạt động, gồm một In progress và
13 Done. Trash có thể khôi phục; không xóa vĩnh viễn.

## Chú thích thuật ngữ

- **Mutable planning layer**: lớp kế hoạch có thể thay đổi thường xuyên.
- **Canonical record**: bản ghi chuẩn, là nơi quyết định nội dung accepted.
- **Work item**: đơn vị công việc có status, priority, evidence và next action.
- **Thin slice**: lát cắt nhỏ chạy được và verify được từ đầu đến cuối.
- **Frontmatter**: metadata ở đầu file Markdown, thường dùng cho link hoặc trạng
  thái có cấu trúc.
- **Relation**: liên kết giữa các page hoặc database record trong Notion.
