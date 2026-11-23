# Điều phối Notion

## Rule

1. Board Tasks trên Notion là backlog; Git `main` giữ spec sống, `PRODUCT.md`, `design-system/` và evidence (mô tả PR), thắng khi lệch. ADR, bản nháp, trạng thái làm việc ([Trạng thái website](https://app.notion.com/p/41f332849a0e81db8b39eeb226e20824)) và nhật ký triển khai nằm trên Notion, không vào repo ([docs-system](../specs/docs-system.md#r1-cấu-trúc-tài-liệu)).
2. Mọi việc có card trước khi làm. Điều phối tạo card (hoặc chọn card có sẵn) và ghi link trong brief trước khi giao; việc owner giao thẳng trong thread thì thread tự tạo.
3. Thread làm tiếp việc cũ: `search` card cũ và cập nhật, không tạo trùng, không để card đứng yên.
4. Cột `Plan level` là [tầng rủi ro](agent-rule-verification-roles.md#tầng-rủi-ro-gọi-vai-nào) 0-3 của việc (owner 2026-11-23: một thang duy nhất). Tầng 0-1: card nhỏ, chỉ tên, `Status`, `Evidence` (link PR). Tầng 2: card có sổ việc bên dưới. Tầng 3: card nằm dưới một card Plan tổng (`Parent item`) có sổ việc; quyết định kiến trúc thêm trang con của [ADR](https://app.notion.com/p/41f332849a0e81dab23fe26245f4551e). Task từ 200 LOC ghi estimate.
5. Thread cập nhật ba mốc: nhận việc (`In progress`, `Agent`, `Next action`), mở PR (link PR), merge (`Done` kèm `Evidence`, hoặc ghi việc còn mở).
6. Kẹt chờ owner, thiết bị, PR khác: `Blocked`, `Next action` ghi chờ gì và ai gỡ. `In progress` và `Blocked` luôn có `Agent` và `Next action`.
7. Mọi PR ghi dòng `Card: <link card>` trong mô tả hoặc commit message; `qa-docs` fail khi thiếu ([docs-system R4](../specs/docs-system.md#r4-đổi-code-là-đổi-spec)).
8. Không vào được Notion: ghi `Card: chờ tạo` cùng tên, status, bước kế tiếp trong mô tả PR; gate cho qua, điều phối backfill. Không giả lập update.
9. Mỗi đêm workflow `card-report` liệt kê PR merge trong 24 giờ thiếu link card, card `In progress` tầng 2-3 chưa có sổ việc (trên card hoặc card cha), card `Done` trong ngày còn bước chưa tick, và PR có dòng `Owner đổi:` (đổi quyết định owner hoặc xóa assert) để điều phối đối chiếu với lời owner; điều phối đọc mỗi sáng, sửa card lệch và báo owner một dòng nếu có.
10. Tạo card, đổi status, gộp card trùng, đổi tên không cần hỏi lại; card bị gộp chuyển `Done` với dòng "Đã gộp vào ...", không xóa.
11. Trước mỗi lần ghi: `search`, `fetch` (schema), rồi `create/update`; không đoán database, schema, parent. Card mới gắn `Project` = Truong Thinh Website; không gửi status `Approved`.
12. Card không chép spec, state, evidence hay log; chỉ link.
13. `LOC` là source/test viết tay thêm, sửa, xóa; trừ generated, vendor, lockfile, formatting-only, Markdown.
14. `Thứ tự Up next` là thứ tự owner yêu cầu; rank không chứng minh việc xong hay chưa, đối chiếu spec/evidence trước khi làm card cũ.
15. `object_not_found` không đủ kết luận card đã xóa; timestamp cũ không là verification hiện tại.
16. Lượt CI đêm đỏ (owner 2026-11-22: đỏ từ 2026-11-14 mà không ai thấy): job `nightly-card` (`scripts/ci/nightly-card.mjs`, secret `NOTION_TOKEN`) tạo card "Nightly CI đỏ" (Up next, P1) hoặc thêm vào card đang mở một dòng ngày, các bộ đỏ, link run; lượt xanh thêm "xanh lại" và chuyển `Done`, `Evidence` là link run. Điều phối giao thread sửa khi thấy card.

## Sổ việc trên card

Card tầng 2 và card Plan tổng của tầng 3. Thân card: **Mục tiêu** (một dòng), **Spec/Nguồn** (link Git);
heading `Plan` rồi mỗi bước một ô tick (tầng 3: mỗi bước khớp một card con có `Parent item` là card này, cùng `Project`), dòng `Plan đã duyệt: <link tin owner>`;
Plan tổng thêm gate owner, thứ tự phụ thuộc và việc owner cần làm ở cuối. Owner duyệt plan thì thread viết plan tạo sổ việc ngay trong lượt đó, không chờ PR; mỗi PR merge thì tick bước của mình. `qa:docs` đọc card và chặn PR thiếu sổ việc ([docs-system R11](../specs/docs-system.md#r11-rule-agentsmd-máy-kiểm-được));
`## Quyết định` quyết định owner kèm ngày; `## Ghi chú` số đo, link phụ. Owner giao thêm thì thêm bước trước khi làm;
dòng chưa tick chỉ bỏ khi owner nói bỏ; trước khi báo xong, mở PR, merge, resolve: fetch card, nêu từng dòng chưa tick.

## Database Tasks

Field: `Name`, `Status` (`Not started`, `Up next`, `In progress`, `Blocked`, `Done`), `Agent`, `Next action`,
`Priority` (`P0`-`P2`), `Evidence` (URL PR hoặc commit), `Project`, `Plan level` (tầng `0`-`3`), `Parent item`,
`Sub-items`, `Due date`, `Thứ tự Up next`. Schema dùng chung chỉ thêm, không xóa hay đổi tên.

- [Project Truong Thinh Website](https://app.notion.com/p/3b7332849a0e81c6bd2be63fe44e67ac)
- [Tasks — By status](https://app.notion.com/p/3b5332849a0e80689b46e724fa43e480?v=3b5332849a0e8011b307000cca66e3c1)
- [Việc chờ owner](https://app.notion.com/p/3e5332849a0e8183b448fea095f9588f)

Connector: Claude Code dùng claude.ai Notion connector; Codex dùng Notion plugin.
