---
title: Motion map theo web tham khảo, không nhập bundle production
status: accepted
date: 2026-07-30
scope: historical project decision
supersedes: []
related_specs: []
related_reports: []
---

# Motion map theo web tham khảo, không nhập bundle production

> Đã migrate từ decision history trước ADR vào 2026-08-09. Descriptive filename
> hiện là stable reference.

## Decision

Motion map theo web tham khảo, không nhập bundle production. Thông số motion
(white fade, full-menu, line, media) chỉ nằm ở [Motion](../../design-system/motion.md).
HTML, bundle và media của web tham khảo chỉ dùng để research, nằm ngoài Git
(`research/reference-site/`), không được load bởi production website, Graphify bỏ qua và không
thay thế quyền sử dụng content.

## Hệ quả

Decision historical này vẫn là một phần của accepted project context. Nếu
direction tương lai thay đổi nó, tạo descriptive decision record mới và link file
bị supersede.

## Lịch sử

2026-10-10 gộp và xóa `reference-archive-isolated` (crawler archive đã gỡ ở PR #148); bỏ bản sao
thông số menu đã có trong Motion. Bản gốc còn trong Git history.

## Chú thích thuật ngữ

- **Bundle**: file package đã gom của JavaScript/CSS/media.
- **White fade**: lớp trắng fade khi chuyển route hoặc menu.
- **Production**: môi trường website đang phục vụ thật.
- **Research**: tài liệu nghiên cứu, không phải dependency production.
