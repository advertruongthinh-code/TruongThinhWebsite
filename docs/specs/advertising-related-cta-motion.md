---
title: CTA cuối related và đường chuyển vị trí vòng quanh primary
status: planned
source: []
tests: []
notion: none
updated: 2026-10-31
---

# CTA cuối related và đường chuyển vị trí vòng quanh primary

## Mục đích

Ở detail, sau related khách thấy đúng khối CTA cuối masonry Advertising để liên hệ, như khi duyệt masonry. Khi related
xếp lại, không card nào đi qua cụm primary. Hình học primary, related, history thuộc [detail](advertising-detail.md);
CTA, batch, Kính cung thuộc [CTA giữa viewport](advertising-cta-center-parallax.md), [skeleton](advertising-skeleton.md),
[Kính](glass-surface.md). Spec này chỉ thêm chỗ đặt CTA trong detail và đường đi của card related.

## Hành vi

### R1. Cùng một CTA cuối related

Detail có khối CTA cuối masonry ở cuối related: dùng lại đúng component (markup, CSS, `renderCtaSkeleton`, batch skeleton
Flow, Kính cung, cỡ tiêu đề, chân chữ dòng cuối giữa viewport, parallax, footer gọn ở cửa sổ nhỏ), không làm bản giống.
Mọi quy tắc của [CTA R1-R5](advertising-cta-center-parallax.md) và [skeleton R1, R6](advertising-skeleton.md#r6-cta-kính-và-footer-trên-batch)
áp dụng với "đáy masonry thật" là đáy related thật: CTA bắt đầu một khoảng giữa dưới card related thấp nhất, batch nối tiếp
các cột related. Cột primary đang chiếm thì batch bắt đầu dưới primary. CTA trong info primary vẫn giữ (owner 2026-10-31).
Related rỗng thì CTA hiện ngay dưới primary, cách một khoảng giữa. Áp dụng `split` và `pinterest`, mọi chiều rộng từ 320px,
VI/EN, mọi tag, vào thẳng, route mềm, Back và Forward. Ở detail footer cũng bỏ khoảng phía trên như khi duyệt masonry.

```gherkin
Given detail ở 1569x912 có related
When cuộn tới cuối trang
Then chân chữ dòng cuối của tiêu đề CTA nằm trên đường giữa viewport, sai số 1px
And batch Flow nối tiếp các cột related, kết thúc ngay trên footer, đáy batch trắng
And info primary vẫn có CTA của nó

Given detail của ảnh không có related
When related xếp xong
Then CTA nằm dưới primary một khoảng giữa
```

### R2. CTA đi cùng related khi xếp lại

Đổi tag, resize hay mở ảnh khác trong trang làm related xếp lại thì khung batch, cụm CTA và Kính cung trượt từ vị trí cũ
cùng nhịp `0.4s` với card related, như CTA của masonry khi đổi nhóm.

### R3. Card related không đi qua primary

Vùng cấm là hình chữ nhật của cụm primary (ảnh, info, nền primary) trong related grid. Mỗi lần related chuyển vị trí
(lần xếp đầu, đổi tag, resize, mở ảnh khác), mọi card related và card suggestion
không giao vùng cấm ở bất kỳ frame nào. Card có hộp quét theo đường thẳng từ chỗ cũ tới chỗ mới giao vùng cấm thì đi đường gấp
khúc qua một điểm góc nằm ngoài vùng cấm: `(x cũ, y mới)` hoặc `(x mới, y cũ)`, chọn điểm làm cả hai đoạn không giao vùng
cấm; không điểm nào thỏa thì đi qua đáy primary (`y` bằng đáy primary cộng một khoảng giữa). Card không cắt vùng cấm vẫn
trượt thẳng như cũ. Đường vòng chạy cùng tổng thời gian `0.4s` với card khác,
gấp góc vuông ở điểm góc (owner 2026-10-31). `prefers-reduced-motion` thì đặt thẳng như cũ.

```gherkin
Given detail ở 1569x912, layout split, có card related ở cột 4 cạnh primary
When bật tag ở suggestion làm card ở cột 4 chuyển xuống dưới primary
Then ở mọi frame trong 0.4s, hộp của card không giao hình chữ nhật primary
And card tới đúng chỗ mới khi chuyển vị trí kết thúc
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| DOM hook | `[data-advertising-photo-related-grid]` | Related grid; CTA và batch đặt sau card related thấp nhất |
| DOM hook | `[data-advertising-grid-cta]`, `[data-advertising-cta-skeleton]` | CTA và batch dùng chung giữa masonry và detail |
| Runtime | `renderRelatedWindow`, `renderCtaSkeleton` | Chuyển vị trí card related; dựng CTA và batch |

## Kiểm chứng

| Requirement | Bằng chứng |
| --- | --- |
| R1, R2 | e2e mới: chân chữ giữa viewport ở detail, batch trên footer, related rỗng; chạy trên fixture |
| R3 | e2e mới: lấy mẫu mỗi frame lúc related xếp lại ở PC 1569x912 và phone 384px, giao với primary bằng 0 |

## Gate còn mở

- Owner duyệt spec.

## Chú thích thuật ngữ

- **Primary**: khối ảnh đang xem cùng info ở đầu detail.
- **Related**: masonry các ảnh liên quan dưới và cạnh primary.
- **Batch**: các khung skeleton Flow nối tiếp masonry phía dưới CTA.
- **Vùng cấm**: hình chữ nhật primary mà card related không được đi qua khi chuyển vị trí.
- **Khoảng giữa**: gap giữa hai card masonry.
