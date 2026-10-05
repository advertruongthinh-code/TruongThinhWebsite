---
title: Hệ thống tài liệu
status: accepted
date: 2026-10-04
scope: documentation
tags: [docs, design-system, notion]
supersedes:
  - https://github.com/advertruongthinh-code/TruongThinhWebsite/blob/f7795ffa3b416af8187738d5f9445b48558fada7/docs/decisions/living-docs-domain-ownership.md
related_specs:
  - ../specs/docs-system.md
related_reports: []
---

# Hệ thống tài liệu

## Context

Docs từng khoảng 23.000 dòng, owner không đọc hết. Spec lệch code, report có ngày,
archive và verification nằm chung với contract hiện hành; thiết kế rải ở nhiều nơi.

## Decision

1. Mỗi phần website một spec sống trong `docs/specs/`, viết từ code đang chạy;
   frontmatter `source:` khai file spec sở hữu. Đổi code thì đổi spec trong cùng
   PR, hoặc ghi `Spec: không đổi - <lý do>` trong mô tả PR.
2. `pnpm qa:docs` là gate: link, budget dòng, ownership `src/site/`, sync code và
   spec, drift giữa CSS và token.
3. `design-system/` là visual truth, publish lên claude.ai sau merge; `DESIGN.md`
   cho Impeccable sinh tự động từ đó.
4. Lịch sử ra khỏi cây thư mục: không giữ verification, archive hay report có
   ngày; Git history giữ bản gốc. Evidence của mỗi thay đổi nằm trong mô tả PR;
   gate NOT PASS còn mở nằm ở mục "Gate còn mở" của spec sở hữu.
5. Notion chỉ giữ backlog card; checklist từng bước nằm trong `tasks/` và xóa khi
   xong ([quản trị Git–Notion](git-notion-governance.md)).
6. Giữ agent-skills (spec, plan, ADR); không dùng spec-kit.

## Alternative đã cân nhắc

| Alternative | Lợi ích | Lý do reject |
| --- | --- | --- |
| Docs theo domain, archive có mapping SHA256 (decision cũ) | Truy nguyên ngay trong cây | Owner không đọc nổi; Git history đã giữ provenance |
| spec-kit | Lệnh và template sẵn | Thêm format thứ hai khi agent-skills đã có spec, plan, ADR |
| Spec theo từng route | Dễ tìm theo URL | Nhân bản contract dùng chung giữa các trang |

## Hệ quả

### Tích cực

- Owner đọc một spec ngắn cho mỗi phần website; CI giữ spec khớp code.
- Agent nạp ít context hơn, không phải lọc claim cũ khỏi report.

### Tiêu cực hoặc cost đã chấp nhận

- Mỗi PR code phải sửa spec hoặc ghi lý do không đổi.
- Evidence cũ chỉ còn trong Git history; link cần đọc lại trỏ permalink commit.

## Evidence

- Spec [docs-system](../specs/docs-system.md), owner duyệt 2026-10-04.
- Plan [đại tu docs](https://github.com/advertruongthinh-code/TruongThinhWebsite/blob/bd06c8de8ff9fd8d48d5eb189d646205896005b0/tasks/docs-overhaul-plan.md), xóa sau checkpoint cuối 2026-10-05.

## Chú thích thuật ngữ

- **Spec sống**: spec mô tả code đang chạy, cập nhật cùng PR đổi code.
- **Gate**: điều kiện phải đạt trước khi merge hoặc nghiệm thu.
- **Permalink**: link GitHub cố định theo commit, không đổi khi file bị xóa sau đó.
- **Provenance**: nguồn gốc có thể truy nguyên.
