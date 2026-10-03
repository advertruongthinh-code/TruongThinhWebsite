---
title: <tiêu đề slice>
type: frontend | cms | cross-cutting
status: draft
updated: YYYY-MM-DD
notion: <URL page/card Notion đã approve hoặc none>
related_decisions: []
related_reports: []
---

# <Tiêu đề slice>

## 1. Vấn đề và kết quả

### Vấn đề

<Điều gì đang thiếu hoặc đang fail hôm nay?>

### User và context

<Ai gặp vấn đề, trong tình huống nào và vì sao?>

### Kết quả mong muốn

<Kết quả quan sát được, không phải implementation task.>

### Goal và non-goal

| Trong scope | Ngoài scope |
| --- | --- |
| <goal> | <non-goal rõ ràng> |

## 2. Constraint và câu hỏi mở

### Constraint

- <Invariant bắt buộc hoặc product boundary.>

### Câu hỏi mở

| Câu hỏi | Owner | Evidence giải quyết |
| --- | --- | --- |
| <câu hỏi> | <owner> | <evidence> |

## 3. User workflow và acceptance

```gherkin
Given <context>
When <action>
Then <observable result>
And <important invariant>
```

## 4. System và implementation boundary

### Context và data flow

<Chỉ mô tả component, contract, data và migration impact cần cho slice này.>

### Interface và type

<Interface public hoặc internal cần cho slice. Không invent provider-specific
detail trước khi provider được chọn.>

### Cấu trúc project

<Path source, test và document liên quan.>

## 5. Hướng dẫn implementation

### Command

```text
Build: <command hoặc N/A>
Test: <command hoặc N/A>
Verify: <command hoặc N/A>
```

### Implementation path

<Implementation path nhỏ nhất, invariant và example.>

### Code và contract style

<Naming, validation, interface shape và một example đại diện.>

## 6. Thuộc tính chất lượng

| Attribute | Requirement | Evidence |
| --- | --- | --- |
| Accessibility | <requirement> | <check> |
| Performance | <requirement> | <check> |
| Security | <requirement hoặc N/A> | <check> |
| Maintainability | <requirement> | <check> |

## 7. Kế hoạch verification

| Level | Scenario | Command hoặc method | Evidence kỳ vọng |
| --- | --- | --- | --- |
| <level> | <scenario> | `<command>` | <result> |

## 8. Delivery, migration và rollback

### Thin vertical slice

<Hành vi end-to-end nhỏ nhất chứng minh được kết quả.>

### Known limitation

1. <Điều cố ý defer.>

### Migration và rollback

<Các bước additive, compatibility, rollback trigger và recovery path. Dùng N/A
nếu slice chỉ thay đổi tài liệu.>

## 9. Reference và history

### Decision liên quan

- `../decisions/<descriptive-slug>.md`

### Report liên quan

- `../reports/<category>-<slug>.md`

| Date | Change | Reason |
| --- | --- | --- |
| YYYY-MM-DD | Initial draft | <reason> |

## Phụ lục A (tùy chọn) — mục thêm cho frontend slice

Thêm khi `type: frontend`; link giá trị visual về nguồn chuẩn theo
`docs/design/index.md`, không lặp token, ratio, timing hoặc copy.

- Route/surface, trong và ngoài scope; route hierarchy, empty/loading/error,
  cặp VI/EN.
- Surface brief `.impeccable/surfaces/<slug>.md` hoặc none; visual thesis và
  design authority bằng link.
- DOM/component responsibility; responsive, motion, accessibility target cùng
  runtime consumer.
- Metadata, alt/ARIA, loading strategy, budget ảnh/video.
- Verification: route/content (static check), visual và responsive (viewport
  matrix, Playwright, Chrome DevTools), accessibility tree, performance.

## Phụ lục B (tùy chọn) — mục thêm cho CMS slice

Thêm khi `type: cms`.

- Editorial outcome và public outcome; actor, auth boundary, lifecycle
  draft/review/publish/unpublish.
- Content có cấu trúc: field, localized text, media, alt, poster, `layoutKey`
  allowlist; reject raw HTML, arbitrary CSS và component code.
- Interface: admin command, public read contract, validation/authorization
  error, idempotency, compatibility.
- Media pipeline: validation, size/type limit, naming, variant, orphan
  cleanup, retention, recovery.
- Security và operations: session, CSRF, rate limit, audit event, logging,
  alerting. Rendering: `structured post -> validated media -> allowlisted
  layoutKey -> deterministic renderer -> static-safe fallback`.

## Chú thích thuật ngữ

- **Slice**: phần thay đổi nhỏ có boundary rõ.
- **Invariant**: điều kiện phải luôn được giữ.
- **Acceptance**: điều kiện để chấp nhận kết quả.
- **Migration**: chuyển schema, dữ liệu hoặc behavior từ trạng thái cũ.
- **Rollback**: quay lại trạng thái an toàn trước thay đổi.
- **Allowlist**: danh sách giá trị được phép.
- **Idempotency**: chạy lại cùng request không tạo kết quả trùng ngoài ý muốn.
- **Viewport matrix**: tập kích thước màn hình dùng để kiểm tra.
