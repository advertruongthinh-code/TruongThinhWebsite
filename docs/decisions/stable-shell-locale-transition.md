---
title: Typography và locale transition giữ shell ổn định
status: accepted
date: 2026-08-01
scope: historical project decision
supersedes: []
related_specs: []
related_reports: []
---

# Typography và locale transition giữ shell ổn định

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

Dùng Plus Jakarta Sans từ Google Fonts với Arial fallback; locale switch gọi cùng
`navigateTo()` với internal link. Header luôn hiện trên route veil
`is-hidden` khi fade bắt đầu; chỉ color transition của shell bị tắt trong lúc
fade để tránh repaint chớp giữa hai document. Heritage copy ngắn lại thành
“Kinh nghiệm và sáng tạo là cam kết trong từng sản phẩm”; image cuối dùng một
sản phẩm nội thất có tiền cảnh và hậu cảnh rõ.

## Hệ quả

Decision historical này vẫn là một phần của accepted project context. Nếu
direction tương lai thay đổi nó, tạo descriptive decision record mới và link file
bị supersede.

## Chú thích thuật ngữ

- **Fallback font**: font thay thế khi font chính chưa tải hoặc không có.
- **Route veil**: lớp phủ trong lúc chuyển route.
- **Repaint**: browser vẽ lại pixel của UI.
- **Shell**: khung giao diện dùng chung giữa các route.
