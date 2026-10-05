---
title: Living docs theo domain và baseline Espacio có provenance
status: accepted
date: 2026-09-09
scope: documentation
supersedes: []
related_specs:
  - ../specs/docs-system.md
related_reports:
  - https://github.com/advertruongthinh-code/TruongThinhWebsite/blob/a3428aaff2cf1ff2f8f5a4f6804404e23ccd349b/docs/verification/living-docs-2026-09-09.md
---

# Living docs theo domain

## Context

Report reference, lịch sử và evidence hiện hành nằm chung; architecture trộn
static runtime và future CMS. PRODUCT thiếu schema mới, DESIGN/sidecar chưa
có, brand/motion có claim đã bị supersede. Owner duyệt spec/plan R1 ngày 2026-09-09.

## Decision

Tổ chức docs theo architecture, frontend, backend, design, reference Espacio,
verification, operations, specs và decisions. Baseline tổng hợp cố định có
provenance; không tự theo live site. Tách measured Espacio, accepted TT và
observed implementation; giữ unknown/NOT PASS.

Corpus `ESPACIO-R1-20260902` hiện là candidate revision đã tổng hợp evidence.
Decision về tổ chức docs không tự khóa exact ID/cutoff thay owner.

Root PRODUCT/DESIGN và .impeccable giữ path/schema tool. Design docs giải thích
reuse code thật; không refactor source trong phase docs. Mỗi task cập nhật
tài liệu bị tác động cùng thay đổi hoặc ghi lý do no-impact; mọi role áp dụng.

Original report giữ trong docs/archive với mapping SHA256; archive không tự
hủy authority trong scope gốc. docs/reports giữ machine sinks/raw compatibility.
ADR accepted giữ path/history. Thay quy tắc một tầng category bằng routing
domain có độ sâu hữu hạn. Boundary [Git–Notion](git-notion-governance.md)
vẫn có hiệu lực; decision này cập nhật tổ chức path, không đổi ownership.

## Alternative và hệ quả

Một file lớn làm khó chọn context; docs theo từng URL nhân bản shared contract;
xóa report mất provenance; move toàn bộ reports phá generator. Chấp nhận giữ
archive và mapping để vừa đọc gọn vừa truy nguyên được. Link/schema/hash,
exact API/source và fresh-agent reuse là gate. Không nâng parity thành PASS.

## Chú thích thuật ngữ

- **Domain**: phạm vi trách nhiệm tài liệu.
- **Provenance**: nguồn gốc có thể truy nguyên.
- **Machine sink**: đường dẫn công cụ đọc hoặc ghi.
- **No-impact**: không ảnh hưởng contract tài liệu, có lý do cụ thể.
