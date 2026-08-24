---
title: Text mask phải theo font và layout render thật
status: accepted
date: 2026-07-31
scope: historical project decision
supersedes: []
related_specs: []
related_reports: []
---

# Text mask phải theo font và layout render thật

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

Text mask phải theo font và layout render thật. Canvas `TextMetrics` dùng để đặt
`--mask-ink-overflow` và chỉ mở clip phía trên; `detail.js` rebuild line/word sau
khi font sẵn sàng, resize hoặc đổi VI/EN. Hero motto dùng cùng contract. Lý do là
giữ reveal mask mà không cắt dấu tiếng Việt hoặc dùng một padding cố định sai giữa
các font/viewport.

## Hệ quả

Decision historical này vẫn là một phần của accepted project context. Nếu
direction tương lai thay đổi nó, tạo descriptive decision record mới và link file
bị supersede.

## Chú thích thuật ngữ

- **Text mask**: lớp clip giới hạn vùng hiển thị của text.
- **TextMetrics**: API đo kích thước ink của text theo font đã render.
- **Reveal**: hiệu ứng đưa text vào vùng nhìn thấy.
- **Viewport**: vùng browser đang hiển thị.
