# Điều phối Notion

## Rule

1. Board Tasks trên Notion là backlog; Git `main` giữ spec, evidence (mô tả PR) và thắng khi lệch ([quản trị Git–Notion](../decisions/git-notion-governance.md)).
2. Mọi việc có card trước khi làm. Điều phối tạo card (hoặc chọn card có sẵn) và ghi link trong brief trước khi giao; việc owner giao thẳng trong thread thì thread tự tạo.
3. Thread làm tiếp việc cũ: `search` card cũ và cập nhật, không tạo trùng, không để card đứng yên.
4. Card nhỏ (dưới 50 LOC và một PR): chỉ tên, `Status`, `Evidence` (link PR). Card lớn (từ 50 LOC hoặc nhiều PR): đủ sổ việc bên dưới, task từ 200 LOC ghi estimate.
5. Thread cập nhật ba mốc: nhận việc (`In progress`, `Agent`, `Next action`), mở PR (link PR), merge (`Done` kèm `Evidence`, hoặc ghi việc còn mở).
6. Kẹt chờ owner, thiết bị, PR khác: `Blocked`, `Next action` ghi chờ gì và ai gỡ. `In progress` và `Blocked` luôn có `Agent` và `Next action`.
7. Mọi PR ghi dòng `Card: <link card>` trong mô tả hoặc commit message; `qa-docs` fail khi thiếu ([docs-system R4](../specs/docs-system.md#r4-đổi-code-là-đổi-spec)).
8. Không vào được Notion: ghi `Card: chờ tạo` cùng tên, status, bước kế tiếp trong mô tả PR; gate cho qua, điều phối backfill. Không giả lập update.
9. Mỗi đêm workflow `card-report` liệt kê PR merge trong 24 giờ thiếu link card; điều phối đọc mỗi sáng, sửa card lệch và báo owner một dòng nếu có.
10. Tạo card, đổi status, gộp card trùng, đổi tên không cần hỏi lại; card bị gộp chuyển `Done` với dòng "Đã gộp vào ...", không xóa.
11. Trước mỗi lần ghi: `search`, `fetch` (schema), rồi `create/update`; không đoán database, schema, parent. Card mới gắn `Project` = Truong Thinh Website; không gửi status `Approved`.
12. Card không chép spec, state, evidence hay log; chỉ link.
13. `LOC` là source/test viết tay thêm, sửa, xóa; trừ generated, vendor, lockfile, formatting-only, Markdown.
14. `Thứ tự Up next` là thứ tự owner yêu cầu; rank không chứng minh việc xong hay chưa, đối chiếu spec/evidence trước khi làm card cũ.
15. `object_not_found` không đủ kết luận card đã xóa; timestamp cũ không là verification hiện tại.

## Sổ việc trên card

Chỉ card lớn. Thân card: **Mục tiêu** (một dòng), **Spec/Nguồn** (link Git), **Mức plan** (0, 1, 2);
`## Plan` mỗi bước một ô tick khớp một task con (`Parent item`, cùng `Project`), dòng **Plan đã duyệt:**;
`## Quyết định` quyết định owner kèm ngày; `## Ghi chú` số đo, link phụ. Owner giao thêm thì thêm bước trước khi làm;
dòng chưa tick chỉ bỏ khi owner nói bỏ; trước khi báo xong, mở PR, merge, resolve: fetch card, nêu từng dòng chưa tick.

## Database Tasks

Field: `Name`, `Status` (`Not started`, `Up next`, `In progress`, `Blocked`, `Done`), `Agent`, `Next action`,
`Priority` (`P0`-`P2`), `Evidence` (URL PR hoặc commit), `Project`, `Plan level` (`0`-`2`), `Parent item`,
`Sub-items`, `Due date`, `Thứ tự Up next`. Schema dùng chung chỉ thêm, không xóa hay đổi tên.

- [Project Truong Thinh Website](https://app.notion.com/p/3b7332849a0e81c6bd2be63fe44e67ac)
- [Tasks — By status](https://app.notion.com/p/3b5332849a0e80689b46e724fa43e480?v=3b5332849a0e8011b307000cca66e3c1)
- [Việc chờ owner](https://app.notion.com/p/3e5332849a0e8183b448fea095f9588f)

Connector: Claude Code dùng claude.ai Notion connector; Codex dùng Notion plugin.
