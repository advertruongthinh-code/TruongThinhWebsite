---
title: Governance design system và living docs
type: design
status: living
updated: 2026-09-09
related_docs:
  - index.md
  - ../specs/living-docs-design-system.md
  - ../operations/agent-rule-knowledge-notion.md
  - ../operations/agent-rule-evidence-qa-handoff.md
  - ../impeccable/index.md
---

# Governance design system và living docs

Governance giữ cho token, product fact, content, implementation và evidence có
một authority rõ. Guide này là operating contract cho docs design; nó không thay
AGENTS hoặc rule operations.

## Source of truth

Quyền sở hữu từng loại nội dung nằm duy nhất tại
[Authority map](index.md#authority-map); không duy trì bảng authority thứ hai.
Mọi tài liệu nhắc contract ở domain khác dùng link tới mục nguồn chuẩn, không
copy tỷ lệ, token, state hoặc acceptance. Report/ADR lịch sử giữ nguyên evidence
và ngày đo; không coi đó là target hiện hành.

Sidecar Impeccable chỉ giữ extension và dữ liệu panel cần theo schema. Narrative
mà schema yêu cầu là projection đồng bộ từ DESIGN, không được sửa độc lập;
không tạo thêm bản prose contract trong surface brief hoặc docs/impeccable.

## Version và status

Mỗi guide cập nhật `updated` khi nội dung contract thực sự đổi. Không refresh
ngày cho formatting-only hoặc status không đổi. Status phải nói rõ
`accepted`, `current`, `observed`, `planned`, `experimental`, `dormant` hoặc
`deprecated/superseded`.

Khi accepted decision đổi:

1. Tạo hoặc cập nhật descriptive decision mới.
2. Link decision cũ bằng `supersedes`/`superseded_by` và giữ file cũ.
3. Cập nhật guide sở hữu contract cùng slice.
4. Ghi migration/rollback và evidence; không xoá provenance.

## Ownership và approval

- `PRODUCT.md`: product truth; không tự sửa owner facts.
- `DESIGN.md`/sidecar: owner-approved visual-system update.
- `docs/design/*.md`: routing, application, reuse, composition và governance.
- `docs/design/content.md`: content/media canonical cho design guides.
- Frontend/backend specs: public/runtime/CMS contract.
- Source/test: implementation evidence; observed source không tự thành accepted design.

Owner review bắt buộc trước merge/deploy cho accepted target, token change,
public API/DOM change hoặc visual direction. Việc ghi guide không tự mở
extraction, refactor, browser audit hay deploy gate.

## Docs impact gate

| Scenario | Docs action |
| --- | --- |
| Frontend token/typography/layout/component state đổi | Cập nhật `DESIGN.md`/sidecar và guide component/pattern; link source/test |
| Public DOM/API/lifecycle đổi | Cập nhật owning frontend spec + `components.md`; ghi consumer/error/cleanup |
| Content/i18n/media rule đổi | Cập nhật `content.md`; verify owner fact và product/decision authority nếu liên quan |
| Backend/CMS/admin status/allowlist đổi | Cập nhật backend guide/CMS spec/decision; giữ current/dormant/planned split |
| Tool/command/QA ownership đổi | Cập nhật operations rule và handoff; không chép vào design guide |
| No impact | Ghi lý do ngắn trong task/report; không tạo Markdown giả |

Impact gate áp dụng ngay cả khi code change nhỏ. Nếu một source change chạm
nhiều domain, update từng authority trong cùng task trước acceptance.

## Evidence và verification

Mọi claim implementation cần exact source symbol, DOM hook, test consumer hoặc
command tồn tại. Historical report phải ghi ngày/hash và không được gọi current
PASS nếu source đã drift. Link checker phải tách local path/anchor với external
URL; anchor thiếu là lỗi docs.

Verification bounded cho thay đổi docs:

- local links/anchors trong sáu guide;
- source/test/API names khớp current worktree;
- không duplicate token value từ `DESIGN.md`;
- changed path chỉ thuộc ownership đã duyệt;
- semantic Graphify, browser/build và runtime parity giữ deferred.

## Migration và rollback

Docs migration phải snapshot path/status/hash trước mutation, preserve unrelated
work, giữ original report bytes và cập nhật link cùng slice. Rollback chỉ phục
hồi path do task sở hữu sau khi kiểm concurrent edit. Khi archive hoặc supersede
guide, phải giữ provenance và remap mọi link trong cùng slice.

## Chú thích thuật ngữ

- **Canonical**: nguồn chuẩn để quyết định contract.
- **Owner approval**: xác nhận của owner trước khi nâng target thành accepted.
- **Superseded**: nguồn cũ được thay thế nhưng vẫn phải giữ provenance.
- **No impact**: task không làm đổi contract/document authority; cần nêu lý do.
- **Handoff**: bàn giao changed path, evidence, blocker và owner TODO.
