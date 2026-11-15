---
title: Masonry xếp trực tiếp trên máy người xem
status: accepted
date: 2026-11-15
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
- Mọi dải xếp trong Worker, kể cả dải điện thoại; Worker lỗi thì xếp trên luồng chính, mỗi ứng viên một task, không có ngưỡng
  chờ 1 giây như plan ghi (máy chậm chỉ làm việc hai lần).
- CMS chỉ lưu card; contract R6 cũ (CMS tính cache khi lưu) bỏ.

## Alternative đã cân nhắc

| Alternative | Lợi ích | Lý do reject |
| --- | --- | --- |
| Giữ cache build | Máy người xem không xếp | Không dùng được cho kết quả tìm kiếm; CMS phải tính cache khi lưu; 165 file mỗi build |
| Một thứ tự mỗi filter (N = 1) | Rẻ nhất | Khoảng 1 trong 5 thứ tự lệch nhịp organic, có thứ tự hạ card ngang; so le trung vị 36 so với 33 của cache |
| Số thứ tự theo ngân sách thời gian | Máy mạnh thử nhiều hơn | Máy chậm ra lưới khác, Back không về đúng lưới |
| Dải điện thoại xếp trên luồng chính | Không cần Worker ở 2 cột | Hai đường code cho một việc; Worker đã khởi động sớm |
| Ngưỡng chờ Worker 1 giây rồi xếp trên luồng chính | Chặn Worker treo | Máy chậm vừa đợi vừa xếp lại, gấp đôi việc |

## Hệ quả

### Tích cực

- Build không còn bước cache; không còn file `layout-cache/` và script preload trong head.
- Cùng packer dùng được cho tìm kiếm (PR sau) và CMS không phải tính gì khi lưu.
- 4 ứng viên đưa so le về mức cache cũ (trung vị 33) và không hạ card ngang nào trên catalog thật.

### Tiêu cực hoặc cost đã chấp nhận

- Card đầu có tọa độ phụ thuộc thời gian khởi động Worker và xếp; đo trên A04s là gate của PR.
- Mỗi dải xếp riêng nên đổi dải có thể ra thứ tự card khác (cache cũ dùng cùng biến thể cho mọi dải).
- Chromium giảm tốc CPU không làm chậm Worker, nên số đo cloud không đại diện chi phí Worker; chỉ số A04s có giá trị.

## Evidence

- Cloud, catalog thật, 4500 lượt xếp dải `4:35`: chặn tìm 3 card ở lần thử đầu đưa lượt lâu nhất từ 441 xuống khoảng 102 ms,
  số lần hạ card ngang tăng từ 17 lên 32 trên 4500 lượt, bị bộ chọn 4 ứng viên lọc hết.
- Nền A04s trên main d33ae601 (card đầu có tọa độ, trung vị 5 lần): Quảng cáo 1191 ms ở 1024px, 1156 ms ở 1440px; Công
  trình 1136 ms và 1116 ms. Số sau khi đổi ghi ở PR.

## Follow-up

- PR 2 tới PR 5 của plan masonry dựng trực tiếp (chế độ tìm kiếm, trượt FLIP, ảo hóa tự chỉnh, tác vụ dài lúc tải).
- Thread CMS cập nhật spec của mình: bỏ bước tính cache khi lưu.

## Chú thích thuật ngữ

- **Dải**: khoảng bề rộng viewport có cùng số cột và khoảng giữa.
- **Ứng viên**: một thứ tự gốc được xếp thử; giữ cái tốt nhất trong 4.
- **Hạ card**: card ngang không xếp được hai cột nên đặt về một cột.
