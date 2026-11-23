---
title: CMS editor, vận hành và phát hành
status: planned
source:
  - src/admin/ops/**
  - .github/workflows/release.yml
tests:
  - tests/admin/cms-core.test.mjs
  - tests/admin/accounts.e2e.mjs
notion: https://app.notion.com/p/420332849a0e81ffb9e4e85372f1a0f7
updated: 2026-11-22
---

# CMS editor: vận hành và phát hành

## Mục đích

Phần vận hành của [editor](cms-editor.md): xem nội dung đã lên staging chưa, phát hành lên site chính, quay về bản
trước, thùng rác, nhật ký, tài khoản và cảnh báo cho owner. Quyền, trạng thái và lệnh thuộc [CMS R2 tới R6](cms.md);
đường dựng thuộc [dữ liệu CMS R6](cms-data.md#r6-đường-dựng-trong-ci). Spec này định giao diện, thứ tự gọi lệnh và
hợp đồng của chức năng "Phát hành". Mọi thao tác ở đây là lệnh chạy bằng code cố định; không bước nào cần agent hay
AI ([CMS](cms.md#bối-cảnh-và-phương-án)). Đã có code: panel Tài khoản (R6, `src/admin/ops/accounts.js`, mở từ menu Bảng thành tab cạnh Xem trước). Trang tạm `/admin/status.html` của phần 1 bị thay bằng các
panel này.

## Hành vi

### R1. Trạng thái staging và site chính

Thanh trên của editor luôn có một dải hai dòng ngắn, bấm vào thì mở panel Trạng thái:

| Dòng | Giá trị | Nguồn (`build-status`) |
| --- | --- | --- |
| Staging | "Đã lên lúc <giờ>", "Đang dựng", "Đang chờ", "Lỗi: <lý do>", "Tạm dừng" | Run dựng gần nhất, dấu deployment mới nhất, `paused` |
| Site chính | "Bản phát hành lúc <giờ>", thêm "· staging có thay đổi chưa phát hành" khi hai bên khác nhau | Dấu phát hành mới nhất so với dấu deployment mới nhất của staging |

Staging "chậm hơn lần lưu cuối" (lần lưu `published` cuối mới hơn bản chụp của deployment đang chạy, quá 10 phút) thì
dòng Staging ghi thêm điều đó. Panel Trạng thái hiện đủ: 5 run dựng gần nhất kèm link sang GitHub, lý do lỗi của lần
dựng hỏng (id bản ghi và trường lỗi khi validator chặn), nút "Dựng lại" (lệnh `rebuild`), danh sách bản ghi đang bị giữ
lại vì media chưa xong (`held`), link "Mở staging". Editor hỏi lại `build-status` mỗi 15 giây khi tab đang mở và
staging đang chờ hoặc đang dựng, mỗi 60 giây khi không; tab ẩn thì không hỏi.

```gherkin
Given nhân viên vừa lưu một bài News
When lần dựng nội dung đang chạy
Then dải trạng thái ghi "Staging: Đang dựng"
When lần dựng xong
Then dải ghi "Staging: Đã lên lúc <giờ>" và "Site chính: … · staging có thay đổi chưa phát hành", không cần tải lại trang
```

### R2. Phát hành lên site chính

Lưu là lên staging ngay; người dùng xem staging thấy ổn thì bấm "Phát hành" để đưa đúng bản staging đang hiện lên site
chính (owner 2026-11-22). Owner và nhân viên đều bấm được (owner 2026-11-22). Nút nằm trên thanh trên và trong panel
Trạng thái, sáng khi đủ cả bốn điều kiện, không thì mờ kèm lý do:

| Điều kiện | Lý do ghi khi mờ |
| --- | --- |
| Staging đã lên bản mới nhất: không run dựng nào đang chờ, đang chạy, và không có lần lưu `published` nào mới hơn bản chụp đang chạy | "Chờ staging cập nhật xong" |
| Run dựng gần nhất không lỗi | "Lần dựng gần nhất bị lỗi" |
| Tự đăng không tạm dừng | "Đang tạm dừng sau khi quay về bản trước" |
| Staging khác bản phát hành hiện tại | "Site chính đã là bản này" |

Bấm nút mở hộp thoại xác nhận: giờ của bản staging, link "Mở staging", và danh sách thay đổi kể từ lần phát hành
trước (các lệnh ghi thành công trong nhật ký sau thời điểm bản chụp của bản phát hành trước: tên bản ghi, lệnh,
người, giờ; gộp theo bản ghi; quá 50 bản ghi thì ghi tổng số). Bấm "Phát hành lên site chính" gọi lệnh `release` với
`commit` và `snapshotId` mà hộp thoại đang hiện.

Hợp đồng của `release`, để cùng đầu vào luôn cho cùng kết quả:

1. Worker so `commit`, `snapshotId` nhận được với dấu deployment mới nhất của staging; khác thì 409 `staging-changed`,
   không gọi gì. Còn run dựng đang chờ hoặc tự đăng đang tạm dừng thì 409 `staging-behind`, `paused`.
2. Khớp thì Worker ghi nhật ký và gọi `workflow_dispatch` của `release.yml` với hai input đó; trả 202.
3. `release.yml` checkout đúng `commit`, lấy bản chụp, tính `snapshotId`. Khác input (có người vừa lưu) thì dừng trước
   khi build, site chính giữ bản cũ, run ghi `snapshot changed`. Bằng thì chạy đúng các bước kiểm và build của staging
   rồi deploy đích `production`, và ghi dấu phát hành `releases/<khóa>.json` cùng dạng dấu deployment.
4. Hai lần `release` với cùng `commit` và `snapshotId` cho cùng một site; lần thứ hai bị chặn ở điều kiện thứ tư,
   Worker cũng trả 409 `already-released`.
5. Phát hành dựng lại từ cùng `commit` và `snapshotId`, không chép bản dựng của staging: trang HTML giống staging,
   riêng chỉ mục tìm kiếm có thể khác vì được dựng lại.

Trước khi CMS bật hẳn, staging còn dựng từ repo nên nút mờ kèm "CMS chưa bật" và `release` trả 409 `cms-not-live`.

Sau khi bấm, hộp thoại đổi thành tiến độ: "Đang phát hành" rồi "Đã lên site chính lúc <giờ>" kèm link mở site, hoặc
"Phát hành lỗi: <lý do>" kèm "Thử lại". Lý do `snapshot changed` ghi là "Nội dung vừa có thay đổi mới. Chờ staging cập
nhật rồi phát hành lại." Từ khi CMS bật hẳn, mọi lần phát hành, kể cả phát hành code mới, đi qua lệnh này; `release.yml`
không còn chạy không kèm input.

```gherkin
Given staging đã lên bản có bài News mới, site chính còn bản cũ
When nhân viên bấm Phát hành rồi xác nhận
Then nhật ký ghi lệnh release kèm email nhân viên, site chính có bài News mới, dải trạng thái ghi giờ phát hành mới
Given hộp thoại xác nhận đang mở, một người khác vừa lưu một bài
When bấm "Phát hành lên site chính"
Then lệnh trả 409 hoặc run dừng với "snapshot changed"; site chính không đổi; hộp thoại ghi chờ staging cập nhật
```

### R3. Quay về bản trước

Chỉ owner. Panel Trạng thái có hai danh sách, mỗi danh sách 10 bản gần nhất (giờ, 7 ký tự đầu của commit, 8 ký tự
đầu của `snapshotId`):

| Danh sách | Nút | Kết quả |
| --- | --- | --- |
| Staging | "Quay staging về bản này" | Lệnh `rollback` đích `staging`; tự đăng tạm dừng tới khi bấm "Tiếp tục đăng" ([CMS R6](cms.md#r6-xuất-bản-và-rollback)) |
| Site chính | "Quay site chính về bản này" | Lệnh `rollback` đích `production`; không tạm dừng gì, vì site chính chỉ đổi khi có người bấm Phát hành |

Mỗi nút mở hộp thoại xác nhận (`<dialog>`, không dùng `confirm()`) ghi rõ bản sẽ quay về và điều xảy ra sau đó. Sau khi
quay site chính về bản trước, dòng Site chính ghi "Đã quay về bản lúc <giờ>" và nút Phát hành sáng lại vì staging khác
site chính. Nhân viên thấy hai danh sách nhưng không có nút. Mọi lần deploy site chính đều ghi dấu phát hành, kể cả
lần dựng từ repo trước khi CMS bật, nên lần phát hành đầu từ CMS vẫn có bản để quay về.

```gherkin
Given owner quay site chính về bản phát hành trước
When run rollback xong
Then site chính chạy bản trước, staging không đổi, tự đăng lên staging không tạm dừng
```

### R4. Thùng rác

"Đưa vào thùng rác" (panel Nội dung, chi tiết media) gọi `trash`. Trước khi gọi, hộp thoại ghi tên bản ghi và, nếu là
bản ghi đang `published`, câu "Trang này sẽ biến mất khỏi staging ở lần dựng sau, và khỏi site chính ở lần phát hành
sau." Kết quả có `referencedBy` thì editor liệt kê chỗ bị ảnh hưởng (menu, dải công trình trang chủ). Các mã 409
(`in-use`, `home-projects-min`, `last-slide`) hiện bằng một câu tiếng Việt nêu việc phải làm trước.

Panel Thùng rác liệt kê bản ghi `trashed` theo kiểu: tên, người xóa, ngày xóa, số ngày còn lại trong 30 ngày. "Khôi
phục" gọi `restore`, bản ghi về trạng thái trước khi xóa; 409 slug thì ghi "Link của bài này đã có bài khác dùng, đổi
link bài kia trước." Owner có thêm "Xóa hẳn": hộp thoại bắt gõ lại đúng tên bản ghi rồi mới gọi `purge`. Nhân viên
không thấy nút đó.

```gherkin
Given nhân viên đưa một công trình đang có trong menu vào thùng rác
When lệnh trash xong
Then editor ghi "Công trình này đang có trong: Menu" và panel Thùng rác có nó với "còn 30 ngày"
When owner bấm Xóa hẳn và gõ sai tên
Then nút xác nhận vẫn mờ, không lệnh nào được gọi
```

### R5. Nhật ký

Panel Nhật ký đọc `audit-log`, mới nhất trước, tải thêm khi cuộn: giờ, người, lệnh bằng tiếng Việt ("Lưu", "Tạo",
"Đưa vào thùng rác", "Phát hành", "Quay về bản trước"…), tên bản ghi (bấm để mở), kết quả. Dòng bị từ chối tô nhạt
kèm lý do. Owner thấy mọi người và có bộ lọc theo người, theo lệnh; nhân viên chỉ thấy dòng của mình.

```gherkin
Given nhân viên mở panel Nhật ký
When danh sách tải xong
Then mọi dòng mang email của nhân viên đó, không có bộ lọc theo người
```

### R6. Tài khoản

Chỉ owner mở được panel Tài khoản (đọc `account-list`): email, vai trò, trạng thái, lần sửa cuối. "Thêm tài khoản" nhận
email Google và vai trò rồi gọi `account-add`; mỗi dòng có "Đổi vai trò" và "Khóa" hoặc "Mở lại" (`account-update`).
502 (API Access lỗi) thì ghi "Chưa đổi được quyền đăng nhập, thử lại sau", danh sách không đổi. `accessSynced: false`
sau khi khóa thì dòng đó ghi "Đã khóa trong CMS, chưa gỡ được khỏi đăng nhập" kèm "Thử lại". 409 owner cuối thì ghi
"Phải còn ít nhất một owner đang mở." Panel không hiện và không lưu email ở đâu ngoài bảng này.

```gherkin
Given chỉ còn một owner đang mở
When owner đó bấm Khóa trên dòng của mình
Then lệnh trả 409, panel ghi "Phải còn ít nhất một owner đang mở", không dòng nào đổi
```

### R7. Cảnh báo vận hành

Owner thấy một dải cảnh báo dưới thanh trên khi `build-status` báo một trong các việc sau; mỗi dòng nêu việc cần làm
và tự mất khi hết nguyên nhân. Nhân viên chỉ thấy dòng đầu.

| Nguyên nhân | Chữ hiện |
| --- | --- |
| Lần dựng gần nhất lỗi | "Lần đưa lên staging gần nhất bị lỗi. Xem lý do." (mở panel Trạng thái) |
| `dispatchError` có giá trị | "CMS chưa gọi được lần dựng, đang tự thử lại mỗi 5 phút." |
| `cronStale` (Cron không chạy quá 5 phút, [CMS R6](cms.md#r6-xuất-bản-và-rollback)) | "Cron của CMS không chạy từ <giờ>: lần lưu tự gọi dựng thay Cron. Kiểm tra Triggers của Worker." |
| Token GitHub còn dưới 14 ngày | "Token GitHub hết hạn ngày <ngày>. Tạo token mới và nhập lại secret." |
| File export D1 mới nhất quá 2 ngày | "Bản sao lưu gần nhất đã <n> ngày. Kiểm tra sao lưu." |
| `accessDrift` không rỗng | "Danh sách đăng nhập lệch với bảng tài khoản: <n> email." (mở panel Tài khoản) |

```gherkin
Given file export D1 mới nhất đã 3 ngày
When owner mở editor
Then dải cảnh báo có dòng sao lưu ghi "3 ngày"; nhân viên mở editor thì không thấy dòng đó
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| File | `src/admin/ops/` (Trạng thái, Thùng rác, Nhật ký, Tài khoản) | R1 tới R7 |
| Lệnh | `build-status`, `rebuild`, `release`, `rollback`, `resume-publish`, `trash`, `restore`, `purge`, `audit-log`, `account-list`, `account-add`, `account-update` | [Dữ liệu CMS R7](cms-data.md#r7-bảng-lệnh-admin) |
| Workflow | `release.yml` với input `commit`, `snapshot_id`; `rollback.yml` với input `target` | R2, R3 |
| Data | Dấu phát hành `releases/<khóa>.json` trong bucket public | R1 tới R3 |

## UI

Theo [editor](cms-editor.md#ui). Nút "Phát hành" là nút chính duy nhất trên thanh trên; nút quay về bản trước và "Xóa
hẳn" mang màu cảnh báo và luôn qua hộp thoại xác nhận có chữ mô tả hậu quả.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1, R7 | cần: e2e dải trạng thái đổi theo `build-status` giả; cảnh báo theo vai trò |
| R2 | cần: đơn vị lệnh `release` (khớp dấu, 409 từng lý do, nhật ký); test workflow dừng khi `snapshotId` khác; một lần phát hành thật ở task bật hẳn |
| R3 | cần: đơn vị `rollback` hai đích; diễn tập rollback site chính ở task bật hẳn |
| R6 | `node tests/admin/accounts.e2e.mjs` (sau `build-admin`, lệnh giả trong trang): thêm, 502, khóa qua hộp thoại, `accessSynced: false` và Thử lại, owner cuối 409, mở lại, không email trong `localStorage`, nhân viên không thấy panel |
| R4, R5 | cần: e2e thùng rác (khôi phục, xóa hẳn gõ tên), nhật ký theo vai trò |

## Gate còn mở

- Phát hành và rollback site chính chạm Cloudflare: task của phần 2 chạy sau gate owner duyệt như mọi task deploy.
- Tới khi CMS bật hẳn, site chính vẫn phát hành bằng "ok phát hành" theo [phát hành tĩnh](static-release.md).

## Chú thích thuật ngữ

- **Staging**: bản thử `staging.truongthinhads.vn`; mọi lần lưu hiện ra ở đây trước.
- **Site chính**: `truongthinhads.vn`, chỉ đổi khi có người bấm Phát hành.
- **Dấu deployment**, **dấu phát hành**: file nhỏ ghi lại một lần đưa lên staging hoặc site chính (bản code, bản chụp, giờ).
- **Bản chụp**: bộ nội dung `published` tại một thời điểm, đầu vào của một lần dựng.
- **Tự đăng**: việc mỗi lần lưu tự gọi lần dựng lên staging.
- **Run**: một lần chạy workflow trên GitHub Actions.
