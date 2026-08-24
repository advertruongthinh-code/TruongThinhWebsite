# Tài liệu

Git là nguồn chuẩn cho spec, decision, operating rule và evidence bền vững đã
được chấp nhận. Bắt đầu với `STATE.md`, sau đó mở Git document mà Notion work
item hiện tại liên kết.

## Ranh giới quyền sở hữu

Notion là mutable planning layer cho discovery note, draft, priority, NOW/Kanban
state, blocker, status và next action. Work item trong Notion link tới Git; nó
không copy hoặc thay thế accepted document.

## Cấu trúc

| Path | Mục đích |
| --- | --- |
| `STATE.md` | Trạng thái nhỏ để phục hồi ở session kế tiếp |
| `specs/` | Contract frontend đang sống và ranh giới CMS tương lai |
| `impeccable/` | Quyền sở hữu Impeccable, brand guidance và motion reference |
| `product/` | Product và content/media contract không phải visual-system truth |
| `engineering/` | Architecture và phase boundary |
| `decisions/` | Một descriptive decision record cho mỗi lựa chọn bền vững |
| `reports/` | Research, verification, security và incident evidence bền vững |
| `operations/` | Hướng dẫn ổn định cho developer, Notion, tooling và agent rule |

Mọi tài liệu nằm trực tiếp trong một category: `docs/<category>/<file>.md`.
Không tạo thêm thư mục con; dùng prefix ngắn như `frontend-`, `cms-`,
`verification-` hoặc `agent-rule-` để phân loại trong category.

`PRODUCT.md` ở root là product truth; `DESIGN.md` ở root là visual-system truth
do Impeccable sở hữu. Hai file này không thay thế living spec hoặc decision
record.

## Vòng lặp làm việc

Mỗi lần chỉ dùng một work item nhỏ:

```text
Notion work item -> Git spec -> approved visual brief/review -> thin slice
-> verification -> accepted decision/evidence -> next work item
```

Đây là iterative loop, không phải waterfall phase gate. Không tạo CMS
implementation document cho tới khi thực sự bắt đầu CMS slice.

## Chú thích thuật ngữ

- **Source of truth**: nguồn được ưu tiên khi các bản ghi khác nhau.
- **Mutable**: có thể thay đổi theo trạng thái công việc.
- **Living spec**: spec được cập nhật cùng tiến độ, không phải bản kế hoạch đóng.
- **Waterfall**: quy trình chia phase cố định, chỉ chuyển tiếp sau khi phase trước
  kết thúc.
