# Điều phối Notion

## Rule

- Git sở hữu accepted knowledge: spec, ADR/decision, runbook ổn định, report,
  implementation evidence, `docs/STATE.md`, `PRODUCT.md`, `DESIGN.md`. Notion
  sở hữu planning/status: draft, discovery, NOW/Kanban, priority, status,
  blocker, next action. Notion link tới Git, không copy accepted document.
- Dùng Notion connector của host agent: Claude Code dùng claude.ai Notion
  connector (đã kết nối); Codex dùng Notion plugin. Connector unavailable:
  không giả lập update, ghi Git trước, báo blocker.
- Có NOW/Kanban card: dùng card đó. Chưa có: đọc `docs/STATE.md` và accepted
  Git document liên quan.
- Verify xong: update Git document/evidence trước, rồi card. Chỉ Done khi
  repository evidence verified.
- Task từ `200 LOC`, chưa có card: nêu estimate, đề xuất tạo hoặc link work
  item trước implement. `LOC` là source/test viết tay thêm, sửa, xóa; trừ
  generated, vendor, lockfile, formatting-only, Markdown.
- Không tự tạo/update card khi user chưa đồng ý. User đồng ý: `search`,
  `fetch`, rồi `create/update`; không đoán database, schema, parent.
- Link Notion cần kiểm quyền truy cập lẫn content drift. `object_not_found`
  không đủ kết luận đã xóa; timestamp payload cũ không là current verification.

## Quy trình work item

1. Tìm work item trong NOW/Kanban; đọc `STATE.md` và Git document item liên kết.
2. Implement một thin slice, verify bằng repository evidence.
3. Cập nhật Git spec, decision hoặc report.
4. Cập nhật card: status, evidence, blocker, next action.

Notion **Spec** page chỉ là proposal. Khi owner approve, Git spec canonical ở
`docs/specs/<descriptive-slug>.md` mới là implementation contract; Git spec có
thể giữ frontmatter `notion:` link ngược về page.

## Database Tasks

Fetch schema trước mỗi mutation phụ thuộc schema. Schema đã thấy: `Name`
(title), `Status` (`Not started`, `Up next`, `In progress`, `Done`), `Project`
(relation), `Due date`, `Thứ tự Up next` (number). Không gửi status `Approved`
hoặc `Blocked`. Field workflow còn thiếu (`Git spec`, `Evidence`, `Blocker`,
`Next action`, `Priority`) ghi trong body; không tự phá schema dùng chung.

`Thứ tự Up next` là thứ tự owner yêu cầu; board `By status` sort tăng dần theo
field này. Chỉ rank card trong scope sắp xếp; không đổi tên, status, ngày tạo
để ép thứ tự. Rank không chứng minh implementation còn thiếu hay đã xong;
đối chiếu accepted spec/evidence trước khi làm card cũ.

## Record project hiện tại

- [Project Truong Thinh Website](https://app.notion.com/p/3b7332849a0e81c6bd2be63fe44e67ac): project record, relation Docs/Tasks.
- [Truong Thinh — Docs & Notion Hub](https://app.notion.com/p/3b7332849a0e81098aeeef782b88657f): hub vận hành; quy tắc category cũ không ghi đè [docs routing](../index.md).
- [Backlog hiện hành và phát hành snapshot 24/09](https://app.notion.com/p/3e5332849a0e8183b448fea095f9588f): card In progress cho phần việc còn mở.
- [Tasks — By status](https://app.notion.com/p/3b5332849a0e80689b46e724fa43e480?v=3b5332849a0e8011b307000cca66e3c1): board được đọc lại ngày 2026-10-03 để đồng bộ phần Advertising; snapshot ghi `1 Not started`, `0 Up next`, `8 In progress`, `13 Done`. Chi tiết nhóm Done không được chép; xem [report đồng bộ Advertising](../verification/advertising-notion-sync-2026-10-03.md).

Link là mutable reference; page đổi thì verify record mới rồi cập nhật mục
này. Audit link cũ: [living docs 2026-09-09](../verification/living-docs-2026-09-09.md).

## Chú thích thuật ngữ

- **Accepted knowledge**: tài liệu và evidence Git đã chấp nhận làm cơ sở quyết định.
- **Connector**: tích hợp host agent dùng để đọc/ghi Notion.
- **Work item**: card công việc có status, evidence và next action.
- **Thin slice**: lát cắt nhỏ chạy được và verify được từ đầu đến cuối.
- **Frontmatter**: metadata ở đầu file Markdown.
- **LOC**: số dòng source/test thay đổi để estimate độ lớn task.
