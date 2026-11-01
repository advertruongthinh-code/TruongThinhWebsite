---
title: CMS dock
status: planned
source:
  - src/admin/dock-tools.js
tests:
  - tests/admin/editor.e2e.mjs
notion: none
updated: 2026-11-01
---

# CMS dock

## Mục đích

Owner yêu cầu 2026-11-01 hành vi giống bốn tính năng Dockview Enterprise (auto-hide edge groups, auto edge groups, pinned
tabs, layout history). Không có fork MIT nào có sẵn, gói `dockview-enterprise` là giấy phép thương mại; `dock-tools.js`
tự viết trên API công khai của `dockview` 8.8 (edge group, `collapse`, `moveTo`, `toJSON`/`fromJSON`), không dùng
module enterprise. Dock, panel và bố cục mặc định thuộc [editor R1](cms-editor.md#r1-dashboard-dockview-trên-máy-tính).

## Hành vi

### R1. Ghim tab

Chuột phải tab chọn "Ghim tab" (hoặc Ctrl+Shift+Enter với tab đang mở). Tab ghim đứng đầu nhóm, nút đóng
thành biểu tượng ghim (bấm để bỏ ghim); tab thường kéo lên trước khối ghim bị đẩy về sau. Trạng thái nằm trong
`params.pinned` nên lưu cùng bố cục.

### R2. Kéo panel ra mép

Khi kéo một tab, ba dải mỏng hiện ở mép trái, phải, dưới; thả vào dải thì panel vào nhóm mép thu gọn
(dải tab dọc hoặc ngang). Nhóm mép rỗng thì gỡ hẳn, không chiếm chỗ.

### R3. Mép tự ẩn

Bấm tab ở dải thu gọn thì panel trượt ra đè lên lưới (lưới không đổi kích thước), có thanh tiêu đề, nút
Ghim (mở hẳn nhóm mép) và Đóng; bấm lại tab, bấm ra ngoài hoặc Esc thì ẩn. Nhóm mép đang mở có nút mũi tên "Tự ẩn" thu
lại thành dải. Mở panel từ menu Bảng khi panel nằm trong dải cũng trượt ra. Trạng thái trượt ra không lưu.

### R4. Lịch sử bố cục

Mỗi thay đổi bố cục (thêm, đóng, di chuyển, ghim, thu, mở nhóm mép, kéo đổi cỡ) là một bước, gộp thay
đổi cách nhau dưới 400 ms, tối đa 25 bước; đổi tab hoặc nhóm đang chọn và đổi cỡ cửa sổ không tạo bước. Menu Bảng có
"Hoàn tác bố cục" (Ctrl+Alt+Z), "Làm lại bố cục" (Ctrl+Alt+Y); khác nút Hoàn tác trên thanh trên (hoàn tác nội dung).
"Bố cục mặc định" cũng là một bước nên hoàn tác được.

```gherkin
Given bố cục mặc định
When kéo tab Media ra mép trái, bấm tab Media ở dải, rồi bấm Ghim
Then Media trượt ra mà lưới không đổi, sau Ghim thành nhóm mép mở; Ctrl+Alt+Z hai lần đưa về bố cục mặc định
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| File | `src/admin/dock-tools.js` | `dockOptions()` (tab tự vẽ), `setupDockTools(dock, root)` trả `undo`, `redo`, `reveal`, `headerActions`, `onLayoutChange`, `start` |
| File | `src/admin/editor.css` | dải kéo, panel trượt ra, menu tab, nút Tự ẩn (class `dock-*`) |
| Data | `params.pinned` của panel; `edgeGroups` trong `tt-cms-layout` | tab ghim, nhóm mép lưu cùng bố cục |

## UI

Theo [CMS UI](cms.md#ui) và `editor.css`; tab giữ DOM `dv-default-tab` để theo theme `themeLight`.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1 đến R4 | `tests/admin/editor.e2e.mjs` (ghim, kéo ra mép trái, trượt ra, Esc, Ghim, hoàn tác ba bước) |

## Gate còn mở

- Panel Xem trước đưa vào dải rồi trượt ra thì iframe tải lại (chuyển DOM); chưa chặn vì Xem trước ít khi nằm ở mép.
- Mép trên chưa có dải kéo (thanh trên đã ở đó); chưa có popout window.

## Chú thích thuật ngữ

- **Nhóm mép**: nhóm panel bám mép dock (edge group), thu thành dải tab hoặc mở hẳn.
- **Trượt ra tạm**: panel trong dải thu gọn hiện đè lên lưới tới khi bấm ra ngoài (peek).
- **Ghim tab**: tab giữ đầu nhóm, không đóng nhầm.
