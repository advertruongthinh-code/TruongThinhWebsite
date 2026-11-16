---
title: Masonry xếp trực tiếp trên máy người xem
status: accepted
date: 2026-11-16
scope: lưới chính trang Quảng cáo và trang Công trình
tags: [masonry, performance, cms]
supersedes:
  - https://github.com/advertruongthinh-code/TruongThinhWebsite/blob/d33ae6018fe4bcb79423341bb1728f044222a6a8/docs/decisions/masonry-layout-cache.md
related_specs:
  - ../specs/masonry-live-layout.md
  - ../specs/advertising-masonry.md
  - ../specs/static-release.md
related_reports: []
---

# Masonry xếp trực tiếp trên máy người xem

## Context

Từ 2026-11-10 lưới chính đặt card theo cache bố cục tính lúc build (bản cũ ở `supersedes`): 165 file cache, build lâu thêm
15 s, và CMS phải tính lại cache mỗi lần lưu card. Tìm kiếm sắp có (kết quả là danh sách card bất kỳ theo điểm) không thể có
bố cục tính sẵn. Packer `packBand` xếp 203 card một dải trong 0,15 tới 8 ms trung vị trên cloud, nên máy người xem tự xếp được
nếu chạy ngoài luồng chính. Owner trả lời plan ngày 2026-11-15 (Q0 tới Q10) và duyệt plan.

## Decision

Bỏ cache build (Q0). Máy người xem xếp mỗi filter một lần mỗi dải bề rộng trong một Web Worker, rồi đặt tọa độ bằng
`replayLayout` ở bề rộng thật. Luật hình học giữ nguyên O1 tới O5, O9 của bản cũ: không lỗ, card ngang hai cột từ 3 cột, đổi
chỗ rồi cắt tối đa 5% rồi hạ về một cột, so le là ưu tiên mềm. Chi tiết hành vi ở [spec](../specs/masonry-live-layout.md).

- Số thứ tự thử cố định `LIVE_CANDIDATES = 4` (plan C2), không theo ngân sách thời gian, để máy chậm và nhanh ra cùng lưới, Back
  về đúng lưới cũ.
- Tìm 3 card lấp chỉ ở lần thử đầu của card ngang, chặn đuôi thời gian xếp.
- Từ 3 cột, 4 ứng viên xếp song song trên 4 Worker; Worker lỗi hoặc treo quá 1 giây (plan) thì xếp trên luồng chính, mỗi ứng
  viên một task.
- Dải điện thoại `2:15` (không có card ngang) xếp trên luồng chính, không tạo Worker. Lưới đầu của điện thoại dùng bản xếp
  sẵn lúc build: mỗi trang lưới mang 2:15 của filter của nó cho 8 seed cố định (`phonePacks`), lượt duyệt mới trên điện thoại
  rút một trong 8 seed đó. Owner chọn 2026-11-16 (cmsg_01B68yUiC1bJVJ45iU8uGEKMN7ZJBcuz4VAykE9Wk3q6dq): "opt b chỉ dùng trên
  phone"; máy tính và tablet vẫn xếp trực tiếp, chấp nhận chậm hơn main như số đo dưới.
- CMS chỉ lưu card; contract R6 cũ (CMS tính cache khi lưu) bỏ. Bản xếp sẵn cho điện thoại sinh khi build trang (cùng lúc
  với artifact), nên CMS đăng bài phải build lại trang như hiện nay; trang và artifact lệch build thì điện thoại xếp trực tiếp.

## Alternative đã cân nhắc

| Alternative | Lợi ích | Lý do reject |
| --- | --- | --- |
| Giữ cache build | Máy người xem không xếp | Không dùng được cho kết quả tìm kiếm; CMS phải tính cache khi lưu; 165 file mỗi build |
| Một thứ tự mỗi filter (N = 1) | Rẻ nhất | Khoảng 1 trong 5 thứ tự lệch nhịp organic, có thứ tự hạ card ngang; so le trung vị 36 so với 33 của cache |
| Số thứ tự theo ngân sách thời gian | Máy mạnh thử nhiều hơn | Máy chậm ra lưới khác, Back không về đúng lưới |
| Xếp sẵn lúc build cho mọi bề rộng | Ngang main ở mọi bề rộng | Quay lại file bố cục lớn mỗi build; owner chỉ chọn cho điện thoại |
| 2 ứng viên thay vì 4 | Nhanh khoảng gấp đôi | Đổi quyết định C2, lưới kém so le hơn |
| 2 Worker thay vì 4 | Ít khởi động Worker | A04s không nhanh hơn (1440: 1129 so với 1124 ms) |

## Hệ quả

### Tích cực

- Build không còn bước cache; không còn file `layout-cache/` và script preload trong head.
- Cùng packer dùng được cho tìm kiếm (PR sau) và CMS không phải tính gì khi lưu.
- 4 ứng viên đưa so le về mức cache cũ (trung vị 33) và không hạ card ngang nào trên catalog thật.

### Tiêu cực hoặc cost đã chấp nhận

- Từ 3 cột, card đầu có tọa độ phụ thuộc thời gian khởi động Worker và xếp: A04s chậm hơn main 96 ms ở 1024px và 218 ms ở
  1440px (owner chấp nhận khi chọn chỉ xếp sẵn cho điện thoại).
- Mỗi trang lưới nặng thêm khoảng 2,8 KB brotli (trang Quảng cáo gốc) cho bản xếp sẵn điện thoại; điện thoại chỉ có 8 cách xếp
  lưới đầu mỗi filter.
- Mỗi dải xếp riêng nên đổi dải có thể ra thứ tự card khác (cache cũ dùng cùng biến thể cho mọi dải).
- Card đầu chỉ kịp như cache cũ khi Worker khởi động sớm (từ `detail.js`) và lượt xếp đầu gửi ngay khi có seed; thiếu hai
  bước này thì chậm hơn main 100 tới 240 ms trên cloud giảm tốc CPU 6 lần.

## Evidence

- Cloud, catalog thật, 4500 lượt xếp dải `4:35`: chặn tìm 3 card ở lần thử đầu đưa lượt lâu nhất từ 441 xuống khoảng 102 ms,
  số lần hạ card ngang tăng từ 17 lên 32 trên 4500 lượt, bị bộ chọn 4 ứng viên lọc hết.
- Trace cloud giảm tốc CPU 6 lần, 1440px, từ mount tới card đầu có tọa độ: Quảng cáo 297 tới 319 ms, main 302 tới 309 ms;
  Worker trả lượt đầu 16 ms sau khi mount cần (xếp 4 thứ tự mất 75 tới 100 ms, chạy song song với mount).
- A04s cùng phiên, main d33ae601 so với nhánh (card đầu có tọa độ, trung vị 5 lần), 2026-11-15: một Worker xếp 4 ứng viên
  tuần tự chậm hơn 93 tới 468 ms; 4 Worker song song và tìm kiếm rẻ hơn (kết quả y hệt) còn 124 tới 157 ms; dải 2:15 trên luồng
  chính còn 68 ms ở 384px, 96 ms ở 1024px, 218 ms ở 1440px. Số đo bản xếp sẵn điện thoại ghi ở PR.

## Follow-up

- PR 2 tới PR 5 của plan masonry dựng trực tiếp (chế độ tìm kiếm, trượt FLIP, ảo hóa tự chỉnh, tác vụ dài lúc tải).
- Thread CMS cập nhật spec của mình: bỏ bước tính cache khi lưu.

## Chú thích thuật ngữ

- **Dải**: khoảng bề rộng viewport có cùng số cột và khoảng giữa.
- **Ứng viên**: một thứ tự gốc được xếp thử; giữ cái tốt nhất trong 4.
- **Hạ card**: card ngang không xếp được hai cột nên đặt về một cột.
