---
title: Readability tiếng Việt ưu tiên hơn mật độ reference
status: accepted
date: 2026-08-01
scope: historical project decision
supersedes:
  - render-aware-text-masks.md
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
75px. Canvas TextMetrics đo top/bottom ink độc lập và mở cả hai clip edge. Decision
này supersede behavior clip chỉ mở phía trên trước đây.

## Hệ quả

Decision historical này vẫn là một phần của accepted project context. Nếu
direction tương lai thay đổi nó, tạo descriptive decision record mới và link file
bị supersede.

## Chú thích thuật ngữ

- **Readability**: mức dễ đọc của text.
- **Density**: mật độ nội dung/element trong một vùng.
- **Tracking**: khoảng cách giữa các ký tự.
- **Cap height**: chiều cao chữ hoa.
- **Clip edge**: cạnh giới hạn vùng hiển thị.
