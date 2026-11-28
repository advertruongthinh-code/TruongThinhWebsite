---
title: CMS dock
status: planned
source:
  - src/admin/dock-tools.js
tests:
  - tests/admin/editor.e2e.mjs
notion: https://app.notion.com/p/426332849a0e81b7ae1efd14b5b9b18f
updated: 2026-11-28
---

# CMS dock

## Mục đích

Owner yêu cầu 2026-11-01 hành vi giống bốn tính năng Dockview Enterprise (auto-hide edge groups, auto edge groups, pinned
tabs, layout history). Không có fork MIT nào có sẵn, gói `dockview-enterprise` là giấy phép thương mại; `dock-tools.js`
tự viết trên API công khai của `dockview` 8.8 (edge group, `collapse`, `moveTo`, `toJSON`/`fromJSON`), không dùng
module enterprise. Dock, panel và bố cục mặc định thuộc [editor R1](cms-editor.md#r1-khung-làm-việc).

Owner 2026-11-28 (phỏng vấn, card trong frontmatter): CMS theo triết lý của một IDE, học VS Code, cả giao diện và cách
vận hành. Vùng giữa là workspace chứa trang đang sửa như tab code trong IDE; mọi panel khác nằm ở các nhóm mép như
sidebar và panel dưới của VS Code. Không thêm phím tắt cho mép (owner 2026-11-28).

## Hành vi

### R1. Ghim tab

Chuột phải tab chọn "Ghim tab" (hoặc Ctrl+Shift+Enter với tab đang mở). Tab ghim đứng đầu nhóm, nút đóng
thành biểu tượng ghim (bấm để bỏ ghim); tab thường kéo lên trước khối ghim bị đẩy về sau. Trạng thái nằm trong
`params.pinned` nên lưu cùng bố cục. Chỉ tab trong workspace ghim được; tab ở nhóm mép không có ghim.

### R2. Workspace và nhóm mép

Dock có đúng hai loại vùng (owner 2026-11-28):

| Vùng | Chứa | Chia, kéo |
| --- | --- | --- |
| Workspace (một vùng duy nhất ở giữa) | Tab xem trước bản ghi ([R5](#r5-tab-bản-ghi-trong-workspace)) và tab Tài khoản | Chia thành nhiều nhóm con như Dockview: kéo tab ra cạnh một nhóm, hoặc chuột phải tab chọn "Chia phải", "Chia dưới" |
| Nhóm mép trái, phải, dưới | Mọi panel còn lại: Nội dung, Media, Thuộc tính, Nháp, Còn thiếu, Trạng thái, Nhật ký, Thùng rác | Không chia trong mép: mỗi mép là một dãy tab, mỗi lúc hiện một panel. Kéo tab để đổi thứ tự trong mép hoặc chuyển sang mép khác |

- Panel của nhóm mép không thả được vào workspace; tab của workspace không thả được vào nhóm mép. Khi kéo, chỉ những chỗ thả hợp lệ sáng lên.
- Tab ở mép trái, phải chỉ có icon (rê chuột hiện tên trong `title`, có `aria-label`); tab ở mép dưới là chữ. Kéo một panel từ mép bên xuống mép dưới thì tab đổi sang chữ và ngược lại.
- Nhóm mép rỗng không chiếm chỗ; dải icon trái luôn còn vì có nút Tài khoản ([editor R1](cms-editor.md#r1-khung-làm-việc)).
- Nhóm con của workspace tối thiểu 320px rộng, 200px cao; kéo đường chia không cho nhỏ hơn. Đóng tab cuối của một nhóm con thì nhóm đó gộp vào nhóm bên cạnh.

```gherkin
Given bố cục mặc định ở cửa sổ 1440px
When kéo tab Media từ mép trái thả vào giữa workspace
Then không có chỗ thả nào sáng trong workspace và Media về lại mép trái
When kéo tab Media xuống mép dưới
Then Media thành tab chữ "Media" ở mép dưới, mép trái còn tab icon Nội dung
```

### R3. Mở, thu và đổi cỡ nhóm mép

Bấm một tab ở dải mép thì panel mở ra và đẩy workspace hẹp lại, như sidebar của VS Code; bấm lại tab đang mở thì
nhóm thu về dải. Kiểu trượt đè lên lưới và nút "Tự ẩn" của bản trước bỏ (owner 2026-11-28 chọn đẩy). Mở panel từ menu
Bảng cũng mở nhóm mép chứa nó.

| Ngưỡng | Giá trị |
| --- | --- |
| Mép trái, phải kéo hẹp dưới ngưỡng thì tự thu về dải | 170px |
| Mép dưới kéo thấp dưới ngưỡng thì tự thu về dải | 120px |
| Mở lại nhóm đã tự thu | Về cỡ trước lần kéo hẹp |
| Cửa sổ hẹp hơn mốc này thì mép trái, phải mở đầu ở dạng thu (lần đầu và Bố cục mặc định) | 1024px |
| Mở một mép mà nhóm con hẹp nhất của workspace sẽ dưới 320px | Mép bên kia tự thu |

Trên màn hình cảm ứng (tablet), kéo tab bằng cách giữ lâu rồi kéo, để vuốt cuộn không bị hiểu nhầm thành kéo.

```gherkin
Given bố cục mặc định ở cửa sổ 1440px, mép trái đang mở 280px
When kéo đường chia của mép trái còn 150px
Then mép trái thu về dải icon, workspace rộng ra
When bấm icon Nội dung
Then mép trái mở lại 280px và workspace hẹp lại, không panel nào đè lên workspace
Given cửa sổ 768px lần đầu
When trang tải xong
Then mép trái và mép phải chỉ là dải icon, workspace chiếm phần còn lại
When mở mép trái rồi mở mép phải
Then mép trái tự thu vì workspace sẽ dưới 320px
```

### R4. Lịch sử bố cục

Mỗi thay đổi bố cục (thêm, đóng, di chuyển, ghim, chia, thu, mở nhóm mép, kéo đổi cỡ) là một bước, gộp thay
đổi cách nhau dưới 400 ms, tối đa 25 bước; đổi tab hoặc nhóm đang chọn và đổi cỡ cửa sổ không tạo bước. Menu Bảng có
"Hoàn tác bố cục" (Ctrl+Alt+Z), "Làm lại bố cục" (Ctrl+Alt+Y); khác nút Hoàn tác trên thanh trên (hoàn tác nội dung).
"Bố cục mặc định" cũng là một bước nên hoàn tác được.

```gherkin
Given bố cục mặc định
When kéo tab Media sang mép phải rồi chia workspace thành hai nhóm
Then Ctrl+Alt+Z hai lần đưa về bố cục mặc định
```

### R5. Tab bản ghi trong workspace

Mỗi tab xem trước là một bản ghi; tên tab là tên bản ghi (owner 2026-11-28, như tab file của VS Code).

- Bấm một lần một dòng ở panel Nội dung mở bản ghi ở tab tạm, tên nghiêng; bấm bản ghi khác thì tab tạm đổi sang bản ghi đó, không thêm tab. Bấm đúp dòng, bấm đúp tab tạm hoặc bắt đầu sửa thì tab tạm thành tab giữ (tên thẳng). Mỗi nhóm con có tối đa một tab tạm.
- Mở bản ghi đã có tab thì chọn tab đó, không mở tab thứ hai. Muốn xem cùng bản ghi ở hai nhóm thì chia tab ("Chia phải", "Chia dưới" hoặc kéo ra cạnh); khi đó mỗi nhóm có mốc cỡ, ngôn ngữ và zoom riêng ([R6](#r6-toolbar-trong-panel-xem-trước)), cùng một nháp: sửa ở nhóm này thì nhóm kia cập nhật ngay.
- Panel Thuộc tính, Nháp, Còn thiếu và thanh đáy theo tab đang chọn của nhóm đang chọn.
- Tab có thay đổi chưa lưu hiện chấm tròn thay dấu đóng (rê chuột lên chấm thì thành dấu đóng). Nút Lưu và Hoàn tác trên thanh trên tác động bản ghi của tab đang chọn; không có "Lưu tất cả" vì mỗi lần lưu là lên staging.
- Đóng tab chưa lưu không hỏi: nháp vẫn ở máy ([editor R8](cms-editor.md#r8-nháp-lưu-và-xung-đột)), mở lại bản ghi là thấy.
- Tab Tài khoản (chỉ owner) mở từ nút Tài khoản và là tab giữ của workspace như tab bản ghi.
- Danh sách tab, cách chia, tab đang chọn và mốc cỡ, ngôn ngữ, zoom của từng nhóm lưu cùng bố cục trong `tt-cms-layout`; mở lại CMS thì về đúng như cũ. Tab của bản ghi đã bị xóa hẳn hoặc tài khoản không còn quyền thì không mở lại.

```gherkin
Given workspace có tab giữ "Trang chủ"
When bấm một lần bài News A rồi bấm một lần bài News B ở panel Nội dung
Then workspace có hai tab: "Trang chủ" và tab tạm nghiêng "B"
When gõ một chữ vào bài B
Then tab "B" thành tab giữ có chấm chưa lưu
When chuột phải tab "B" chọn "Chia phải", đặt nhóm phải ở 384 và English
Then hai nhóm cùng hiện bài B, nhóm trái 1440 tiếng Việt; sửa chữ ở nhóm trái thì nhóm phải cập nhật
When đóng tab "B" ở cả hai nhóm rồi tải lại trang
Then panel Nháp còn bài B; workspace còn đúng một nhóm với tab "Trang chủ"
```

### R6. Toolbar trong panel xem trước

Điều khiển của panel xem trước nằm trên một toolbar hoạt động như một nhóm mép bên trong panel (owner 2026-11-28):
đậu được bốn mép của panel (trên, dưới, trái, phải; mặc định trên), kéo để đổi mép, có nút thu thành dải mỏng và bấm
lại để mở. Ở mép trái, phải nút chỉ có icon (rê chuột hiện tên); ở mép trên, dưới nút có icon kèm chữ. Mép đậu và
trạng thái thu dùng chung cho mọi tab xem trước, lưu cùng bố cục.

| Cụm | Nút |
| --- | --- |
| Cố định | Mốc cỡ (384, 768, 1024, 1280, 1440, 1920), Tiếng Việt/English, Chế độ sửa/Chế độ xem, zoom, Mở trên staging ([editor R3](cms-editor.md#r3-xem-trước)) |
| Ngữ cảnh: đang sửa chữ | Nút định dạng chỗ đó cho phép ([editor R5](cms-editor.md#r5-soạn-chữ)) |
| Ngữ cảnh: đang chọn khung ảnh hay video | Crop, Đổi media, Gỡ khỏi khung |
| Ngữ cảnh: đang chọn khối trích dẫn | Công tắc "Có trích dẫn" |
| Ngữ cảnh: không chọn gì | Trống |

Zoom riêng từng nhóm, không zoom cả CMS: nút giảm, ô phần trăm, nút tăng, nút "Vừa khung"; Ctrl cộng lăn chuột trên
khung cũng zoom. Bước 25, 50, 75, 100, 125, 150, 200%. Mặc định và "Vừa khung" là cỡ vừa bề rộng panel (không quá
100%), như thu nhỏ tự động hiện nay; zoom lớn hơn khung thì khung cuộn ngang, dọc. Đổi mốc cỡ thì zoom về "Vừa khung".

```gherkin
Given đang xem bài News ở mốc 1440 trong nhóm rộng 900px
When bấm nút tăng zoom tới 100%
Then khung rộng 1440px, panel cuộn ngang được, ô ghi 100%
When bấm "Vừa khung"
Then ô ghi phần trăm vừa bề rộng nhóm và hết cuộn ngang
When kéo toolbar sang mép trái của panel
Then nút chỉ còn icon, mọi tab xem trước khác cũng có toolbar ở mép trái
When bôi một chữ trong khối paragraph
Then cụm ngữ cảnh hiện nút Đậm, Nghiêng, Chỉ số trên, Link, Xuống dòng, Không tách dòng, Danh sách và không có thanh nổi cạnh chữ
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| File | `src/admin/dock-tools.js` | `dockOptions()` (tab tự vẽ), `setupDockTools(dock, root)` trả `undo`, `redo`, `reveal`, `headerActions`, `onLayoutChange`, `start`; luật chỗ thả workspace và mép, ngưỡng thu (R2, R3) |
| File | `src/admin/editor.css` | dải mép, tab icon và chữ, chấm chưa lưu, toolbar của panel xem trước (class `dock-*`) |
| Data | `params.pinned`, `params.transient` của panel; `edgeGroups`, mốc cỡ, ngôn ngữ, zoom từng nhóm, mép và trạng thái thu của toolbar trong `tt-cms-layout` | Lưu cùng bố cục (R1, R5, R6) |

## UI

Theo [CMS UI](cms.md#ui) và `editor.css`; tab giữ DOM `dv-default-tab` để theo theme `themeLight` hoặc `themeDark` ([editor R10](cms-editor.md#r10-giao-diện-sáng-tối-hoặc-theo-hệ-thống)). Icon của tab mép là SVG nội tuyến một màu theo `currentColor`.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1, R4 | `tests/admin/editor.e2e.mjs` (ghim, hoàn tác bố cục) |
| R2, R3 | `tests/admin/editor.e2e.mjs` (chặn thả giữa workspace và mép, tab icon và chữ theo mép, bấm mở và thu, tự thu dưới 170px, cửa sổ 768px, bố cục cũ về mặc định); giữ lâu để kéo trên cảm ứng là hành vi sẵn của Dockview (chờ 250 ms) |
| R5 | cần: e2e tab tạm, tab giữ, chấm chưa lưu, chia cùng bản ghi và đồng bộ, khôi phục sau tải lại |
| R6 | cần: e2e zoom và Vừa khung, toolbar đổi mép, cụm ngữ cảnh theo chỗ chọn |

## Gate còn mở

- Mép trên chưa có dải (thanh trên đã ở đó); chưa có popout window.
- Icon riêng của từng panel (task I1) chờ owner duyệt trong ảnh 1440px.

## Chú thích thuật ngữ

- **Workspace**: vùng giữa chứa các tab trang đang sửa, chia được thành nhóm con.
- **Nhóm mép**: nhóm panel bám mép trái, phải hoặc dưới (edge group), thu thành dải tab hoặc mở hẳn.
- **Tab tạm**: tab mở bằng một lần bấm, tên nghiêng, bị thay khi mở bản ghi khác (preview tab của VS Code).
- **Ghim tab**: tab giữ đầu nhóm, không đóng nhầm.
- **Toolbar ngữ cảnh**: cụm nút đổi theo chỗ người soạn đang chọn hoặc sửa.
