# Knowledge và Notion rule

## Quyền sở hữu

- Git giữ engineering knowledge, accepted evidence. Notion giữ draft, discovery, NOW, Kanban, priority, status, blocker, next action; link Git, không copy/thay accepted document.
- Có NOW/Kanban card: dùng card đó. Chưa có: đọc `docs/STATE.md` và accepted Git document liên quan.

## Flow

- Khi app `Notion` có, dùng skill/app phù hợp để research, capture, tạo task. Notion Spec approved phải trỏ Git spec canonical trước `notion-spec-to-implementation`.
- Verify xong: update Git document/evidence trước, rồi card. Chỉ Done khi repository evidence verified. Không giữ accepted spec, ADR, report, implementation evidence chỉ ở Notion.
- Mỗi task ghi docs impact và path sở hữu. Cập nhật contract/source link cùng
  behavior; không có impact thì ghi lý do. Main kiểm claim của subagent trước
  nghiệm thu. Tài liệu theo domain ở [docs index](../index.md).
- Link Notion cần kiểm cả quyền truy cập lẫn content drift. `object_not_found`
  không đủ kết luận đã xóa; timestamp payload cũ không là current verification.

## Ngưỡng card

- Task từ `200 LOC`, chưa có card: nêu estimate, đề xuất [`@notion`](plugin://notion@openai-curated-remote) tạo hoặc link work item trước implement.
- `LOC`: source/test viết tay thêm, sửa, xóa; trừ generated, vendor, lockfile, formatting-only, Markdown.
- Không tự tạo/update user card. User đồng ý: `search`, `fetch`, rồi `create/update`; không đoán database, schema, parent. Thiếu app: báo blocker.

## Chú thích thuật ngữ

- **Accepted evidence**: evidence đã được Git chấp nhận làm cơ sở quyết định.
- **Work item**: card công việc trong Notion.
- **LOC**: số dòng source/test thay đổi để estimate độ lớn task.
