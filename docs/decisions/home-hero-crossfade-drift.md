---
title: Home hero dùng cross-fade có drift chồng nhịp
status: accepted
date: 2026-08-01
amended: 2026-08-24
scope: historical project decision
supersedes: []
related_specs: []
related_reports: []
---

# Home hero dùng cross-fade có drift chồng nhịp

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

Home hero dùng cross-fade có drift chồng nhịp: `scale 1.06 → 1` trong `5s` với
`sine.inOut`; cross-fade dài `1.6s` bắt đầu ở giây `4.2`; image kế tiếp
bắt đầu drift đúng trung điểm giây `5.0`. Easing vào/ra êm loại bước vận tốc ở
frame bàn giao. Home hero không có kicker hoặc slide index.

Direct load giữ slide và shade ẩn trên nền đơn `#2b2c2b` trong `2.6s` để title
reveal xong trước khi media xuất hiện. Ảnh đầu và shade fade vào trong `1.6s`,
sau đó mới dùng đúng nhịp drift/cross-fade trên. Intro thuộc hero timeline nên
pause, tab hidden và out-of-view cùng dừng. Route entry, startup đã settled,
reduced motion, no-JS và fail-open bỏ hold, hiện ảnh đầu ngay.

## Hệ quả

Decision historical này vẫn là một phần của accepted project context. Nếu
direction tương lai thay đổi nó, tạo descriptive decision record mới và link file
bị supersede.

## Chú thích thuật ngữ

- **Cross-fade**: hai image chuyển chồng bằng opacity.
- **Drift**: chuyển động chậm của image trong lúc hiển thị.
- **Easing**: hàm điều khiển nhịp tăng/giảm tốc.
- **Kicker**: dòng nhãn ngắn trước title chính.
- **Hold**: khoảng giữ nguyên một state trước chuyển động tiếp theo.
- **Direct load**: mở document trực tiếp, không đi từ route nội bộ đang giữ shell.
