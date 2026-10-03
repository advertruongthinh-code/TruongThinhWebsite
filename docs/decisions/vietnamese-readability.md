---
title: Readability tiếng Việt ưu tiên hơn mật độ reference
status: accepted
date: 2026-08-01
scope: historical project decision
supersedes: []
related_specs: []
related_reports: []
---

# Readability tiếng Việt ưu tiên hơn mật độ reference

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

Readability tiếng Việt ưu tiên hơn reference density. Reference text đo word gap
thực tế gần `.272em` dù CSS spacing bằng zero. Public text dùng Plus Jakarta Sans,
neutral display tracking và shared word spacing `.10em` để bù space glyph
native hẹp hơn. Heritage giữ line height `1.08` và cap height được approve là
75px.

Text mask theo font và layout render thật: Canvas `TextMetrics` đo top/bottom
ink độc lập, đặt `--mask-ink-overflow` và mở cả hai clip edge (thay behavior cũ
chỉ mở phía trên). `detail.js` rebuild line/word sau khi font sẵn sàng, resize
hoặc đổi VI/EN; hero motto dùng cùng contract. Mục tiêu: reveal mask không cắt
dấu tiếng Việt và không dùng padding cố định sai giữa font/viewport.

## Hệ quả

Decision historical này vẫn là một phần của accepted project context. Nếu
direction tương lai thay đổi nó, tạo descriptive decision record mới và link file
bị supersede.

## Lịch sử

2026-10-03 gộp và xóa `render-aware-text-masks`; bản gốc còn trong Git history.

## Chú thích thuật ngữ

- **Readability**: mức dễ đọc của text.
- **Density**: mật độ nội dung/element trong một vùng.
- **Tracking**: khoảng cách giữa các ký tự.
- **Cap height**: chiều cao chữ hoa.
- **TextMetrics**: API đo kích thước ink của text theo font đã render.
- **Clip edge**: cạnh giới hạn vùng hiển thị.
