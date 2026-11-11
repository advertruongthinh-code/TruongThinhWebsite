---
title: Masonry xếp card bằng bố cục tính sẵn
status: accepted
date: 2026-11-10
scope: lưới chính trang Quảng cáo và trang Công trình
tags: [masonry, performance, cms]
supersedes: []
related_specs:
  - ../specs/masonry-layout-cache.md
  - ../specs/advertising-masonry.md
  - ../specs/advertising-skeleton.md
  - ../specs/static-release.md
related_reports: []
---

# Masonry xếp card bằng bố cục tính sẵn

## Context

Masonry #779 (không lỗ, card ngang hai cột, cắt mép) tìm vị trí card ngay trên máy người xem bằng một bộ tìm kiếm có ngân
sách 300.000 phép thử. Bộ tìm kiếm tốn CPU trên phone, không chắc kết quả giữa các lần chạy khi pool đổi, và khó kiểm: lỗi
chỉ lộ ở bề rộng và thứ tự cụ thể. Owner phỏng vấn ngày 2026-11-10 (17:05 tới 18:08) và chốt O1 tới O11 dưới đây.

## Decision

Server tính trước các bố cục hợp lệ (cache bố cục masonry); máy người xem chỉ đặt lại card theo bố cục đã lưu, một vòng O(n),
không tìm kiếm. Bố cục sai không bao giờ được ghi ra vì build tự kiểm; thiếu hoặc lệch cache thì cả lưới về một cột, không lỗ.
Chi tiết hành vi ở [spec](../specs/masonry-layout-cache.md).

Owner chốt (O):

- O1: giữa các card không có lỗ ở mọi bề rộng; đây là yêu cầu cứng duy nhất về hình học. O4: bỏ yêu cầu đáy masonry đều.
- O2, O3: card ngang (tỷ lệ từ 1.618) rộng hai cột từ lưới 3 cột; không xếp được thì đổi chỗ vài card gần, rồi cắt mép tối đa 5%, rồi riêng card đó về một cột.
- O5, O8: card ngang và khung chờ ngang chỉ ở hai lưới chính; related và điện thoại mọi card một cột.
- O6, O7, O10: server tính trước, mỗi filter 8 tới 32 thứ tự xáo sẵn, card CMS đổi chỉ lên trang sau khi cache tính xong.
- O9: so le mép dưới là ưu tiên mềm, thử nhiều phương án; không hạ card ngang vì so le.
- O11: dải Flow nằm dưới CTA theo trục Z, nối từ card thật cuối tới đáy CTA, có khung ngang hai cột.

Chủ plan đề xuất, owner duyệt cùng plan (P):

- P1: tính cache lúc build trên GitHub Actions; khi có CMS thì trong trình duyệt người sửa lúc bấm lưu.
- P2: card một cột không vượt hạng `filterRank`; card ngang được lệch qua ranh giới hạng khi cần.
- P3: dải Flow cuối lưới vẫn dựng trên máy người xem (chiều cao phụ thuộc đáy CTA).
- P4: cắt chỉ làm card thấp đi, không bao giờ cao lên.
- P5: UI card nằm trong ảnh nên chiều cao card bằng chiều cao media; PR giao diện card đi trước PR nối cache.

Kiểm hai đầu dải là đủ: đáy mỗi cột là hàm bậc nhất của bề rộng card trong một dải (cột, khoảng giữa) nên điều kiện hợp lệ
(phần chênh không âm và không quá sức chứa của đuôi cắt) cũng bậc nhất, đúng ở hai đầu thì đúng cả đoạn. Điều kiện chênh
không âm ở cả hai đầu (P4) giữ cột chuẩn cố định trong dải, nên lập luận lặp lại cho mọi card hai cột sau.

## Alternative đã cân nhắc

| Alternative | Lợi ích | Lý do reject |
| --- | --- | --- |
| Giữ bộ tìm kiếm trên máy người xem | Không cần cache, tự theo catalog | CPU phone, kết quả khó kiểm, ngân sách phép thử có thể cạn |
| Tính bố cục trong Worker Cloudflare | Luôn khớp catalog mới nhất | Gói miễn phí chỉ có 10 ms CPU mỗi request; gói trả phí 5 USD/tháng |
| Một bố cục cho mọi bề rộng | File nhỏ nhất | Cột và khoảng giữa đổi theo viewport, bố cục sai giữa các dải |
| Lưu bố cục theo từng pixel | Đúng tuyệt đối | Bùng nổ số file; kiểm hai đầu dải đã đủ |
| Hạng cứng tuyệt đối khi xếp | Giữ trọn thứ tự theo sản phẩm chính | Filter "LED" không xếp được 1 trong 2 card ngang (đo 0 trên 100 thứ tự) |

## Hệ quả

### Tích cực

- Máy người xem không tìm kiếm: card đầu có tọa độ sớm hơn (1461 ms xuống 997 ms trên A04s), 8 card đầu có ảnh 1992 ms xuống 1612 ms.
- Build kiểm mọi biến thể; test ngẫu nhiên 216 bộ card (1 tới 600 card) và 296 nghìn lần replay không lỗi nào.
- Thiếu hoặc lệch cache chỉ làm lưới một cột, không bao giờ để lỗ.

### Tiêu cực hoặc cost đã chấp nhận

- `pnpm prepare:site` tăng từ khoảng 10 s lên 25 s tới 28 s; local nhớ kết quả trên đĩa, CI build lại.
- 165 file cache (5 file cả dải khoảng 142 KB thô và 160 file một filter) sinh mỗi build; tải trước card đầu chỉ một file một filter.
- Card ngang vẫn có thể bị hạ về một cột ở pool rất nhỏ; build chỉ in cảnh báo.
- CMS phải tính lại cache khi lưu card ([contract](../specs/masonry-layout-cache.md#r6-contract-cho-cms-chưa-làm)).

## Evidence

- Catalog thật (285 card, 32 filter, 128 ứng viên mỗi filter): 0 card ngang bị hạ trong biến thể giữ lại, cắt tối đa 4,989%, 10980 lần replay không `null`, mép thẳng hàng giảm từ 0,19 xuống 0,09 mỗi card.
- Checkpoint B trên A04s (trung vị 3 lần, demo ở `main` 7b6071cf): rAF vuốt nhanh 37,3 (gốc 32,2), RAM đỉnh 256 MB (gốc 280), file cả dải compile 2,4 tới 5,1 ms không thuộc long task nào, 0 `layout cache miss`; owner duyệt 2026-11-11.
- Pool nhỏ (1920 pool ngẫu nhiên, 4% tới 50% card ngang): 3 tới 8 card thì 8,5% pool có card bị hạ, 10 tới 14 card thì 0,5%; không pool nào có lỗ hay build `throw`.
- Ngưỡng một chip luôn có tối thiểu 10 card (owner 2026-11-11, [taxonomy R5](../specs/advertising-taxonomy.md#r5-ngưỡng-10-card)).

## Follow-up

- CMS nối luồng lưu, tính lại cache theo filter có pool đổi (cả batch một lần), chạy trong Web Worker và cảnh báo khi card ngang bị hạ.
- Gộp `.project-tile` và `.project-index` vào `.masonry-card` (tên DOM trang Công trình còn riêng): việc sau, ngoài plan.
- Phép đo chuẩn (rAF, RAM, long task) đo lại trên A04s khi catalog đổi đáng kể.

## Chú thích thuật ngữ

- **Cache bố cục**: tập bố cục card tính trước lúc build cho mỗi filter và mỗi dải bề rộng.
- **Dải**: khoảng bề rộng viewport có cùng số cột và khoảng giữa.
- **Hạ card**: card ngang không xếp được hai cột nên đặt về một cột.
- **Checkpoint B**: mốc đo trên phone thật trước khi owner duyệt đưa cache vào `main`.
