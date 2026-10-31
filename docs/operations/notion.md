# Điều phối Notion

## Rule

- Git `main` sở hữu accepted knowledge: spec, ADR, runbook, `docs/STATE.md`,
  `PRODUCT.md`, `design-system/`; evidence mỗi thay đổi nằm trong mô tả PR.
  Notion chỉ giữ backlog card, link tới Git, không copy accepted document
  ([quản trị Git–Notion](../decisions/git-notion-governance.md)).
- Dùng Notion connector của host agent: Claude Code dùng claude.ai Notion
  connector (đã kết nối); Codex dùng Notion plugin. Connector unavailable:
  không giả lập update, ghi Git trước, báo blocker; dừng nhận việc từ board,
  chỉ làm việc owner giao trực tiếp trong chat tới khi Notion đọc ghi lại được.
- Có NOW/Kanban card: dùng card đó. Chưa có: đọc `docs/STATE.md` và accepted
  Git document liên quan.
- Verify xong: update Git document/evidence trước, rồi card. Chỉ Done khi
  repository evidence verified.
- Board Tasks là backlog của owner, điều phối và mọi worker
  ([AGENTS.md](../../AGENTS.md#notion-trong-workflow)). Việc owner giao chưa có
  card: tạo card trước khi làm; task từ `200 LOC` ghi estimate trong card.
  `LOC` là source/test viết tay thêm, sửa, xóa; trừ generated, vendor,
  lockfile, formatting-only, Markdown.
- Worker cập nhật card ở ba mốc: nhận việc (`In progress`), mở PR (link PR),
  merge (`Done`, hoặc ghi việc còn mở). Card `In progress` hoặc `Blocked` luôn
  có `Agent` (thread hoặc agent đang giữ) và `Next action` (bước kế tiếp cụ
  thể); sửa `Next action` mỗi khi bước đổi. Kẹt chờ owner, thiết bị, PR khác:
  chuyển `Blocked`, `Next action` ghi đang chờ gì và ai gỡ; gỡ xong về
  `In progress`. Card giữ tên, status, thứ tự, mục
  tiêu một dòng, link spec và PR, và sổ việc (dưới); không chép spec, state,
  evidence hay log vào card.
- Tạo card, đổi status, gộp card trùng và đổi tên card không cần hỏi lại; card
  bị gộp thì archive, không xóa vĩnh viễn. Trước mỗi lần ghi: `search`, `fetch`, rồi
  `create/update`; không đoán database, schema, parent.
- Link Notion cần kiểm quyền truy cập lẫn content drift. `object_not_found`
  không đủ kết luận đã xóa; timestamp payload cũ không là current verification.

## Sổ việc trên card

Plan và việc owner giao nằm trong thân card dưới dạng to-do (ô tick), một dòng
một việc, nêu đủ nội dung để làm mà không cần đọc lại chat. Spec vẫn chỉ ở Git.

1. Ghi ngay: owner giao việc, giao thêm giữa chừng, hoặc phỏng vấn chốt quyết
   định thì thêm dòng trước khi làm. Plan đã duyệt chép thành các dòng task.
2. Không làm rơi: tick khi xong; dòng chưa tick chỉ bỏ khi owner nói bỏ (gạch
   dòng, ghi lý do). Checklist tiến độ của thread khi đổi bảng mới phải liệt kê
   mọi dòng chưa tick.
3. Báo khi chuyển việc: trước khi làm việc mới, reply nêu dòng đang dở và thứ
   tự sẽ làm.
4. Đối chiếu trước khi chốt: trước khi báo xong, mở PR, merge, resolve thread,
   fetch card và nêu tên từng dòng chưa tick.

## Quy trình work item

1. Tìm work item trong NOW/Kanban; đọc `STATE.md` và Git document item liên kết.
2. Implement một thin slice, verify bằng repository evidence.
3. Cập nhật Git spec hoặc decision; evidence vào mô tả PR.
4. Cập nhật card: status, việc còn mở, blocker, link spec và PR. Evidence ở
   Git (spec, PR), không chép vào card.

Spec chỉ viết trong Git (`docs/specs/<capability>.md`); frontmatter `notion:`
của spec link tới card.

## Database Tasks

Fetch schema trước mỗi mutation phụ thuộc schema. Schema đã thấy: `Name`
(title), `Status` (`Not started`, `Up next`, `In progress`, `Blocked`, `Done`),
`Agent` (text), `Next action` (text), `Priority` (`P0`, `P1`, `P2`),
`Evidence` (URL PR hoặc commit trên `main`, điền khi `Done`), `Project`
(relation), `Due date`, `Thứ tự Up next` (number). Không gửi status
`Approved`. Card mới luôn gắn `Project` = Truong Thinh Website. Field còn
thiếu (`Git spec`) ghi một dòng trong body; schema dùng chung chỉ thêm, không
xóa hay đổi tên.

`Thứ tự Up next` là thứ tự owner yêu cầu; board `By status` sort tăng dần theo
field này. Chỉ rank card trong scope sắp xếp; không đổi tên, status, ngày tạo
để ép thứ tự. Rank không chứng minh implementation còn thiếu hay đã xong;
đối chiếu accepted spec/evidence trước khi làm card cũ.

## Record project hiện tại

- [Project Truong Thinh Website](https://app.notion.com/p/3b7332849a0e81c6bd2be63fe44e67ac): project record trong database Projects (cùng chỗ với PrintWork); trang có link nguồn chuẩn, quy ước và board Tasks lọc theo project.
- [Truong Thinh — Docs & Notion Hub](https://app.notion.com/p/3b7332849a0e81098aeeef782b88657f): hub vận hành; quy tắc category cũ không ghi đè [docs routing](../index.md).
- [Backlog hiện hành và phát hành snapshot 24/09](https://app.notion.com/p/3e5332849a0e8183b448fea095f9588f): card In progress cho phần việc còn mở.
- [Tasks — By status](https://app.notion.com/p/3b5332849a0e80689b46e724fa43e480?v=3b5332849a0e8011b307000cca66e3c1): board backlog. Card chờ owner hoặc thiết bị để status `Blocked` (thay dòng `Chờ` đầu body trước đây).

Link là mutable reference; page đổi thì verify record mới rồi cập nhật mục
này.

## Chú thích thuật ngữ

- **Accepted knowledge**: tài liệu và evidence Git đã chấp nhận làm cơ sở quyết định.
- **Connector**: tích hợp host agent dùng để đọc/ghi Notion.
- **Work item**: card công việc có status, evidence và next action.
- **Next action**: field ghi bước kế tiếp cụ thể của card đang làm hoặc đang kẹt.
- **Thin slice**: lát cắt nhỏ chạy được và verify được từ đầu đến cuối.
- **Frontmatter**: metadata ở đầu file Markdown.
- **LOC**: số dòng source/test thay đổi để estimate độ lớn task.
