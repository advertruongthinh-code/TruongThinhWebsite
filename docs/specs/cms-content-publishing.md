---
title: Ranh giới publish content CMS
type: cms
status: draft
updated: 2026-08-09
notion: none
related_decisions:
  - ../decisions/wrangler-deferred-until-cms.md
related_reports: []
---

# Ranh giới publish content CMS

Đây là contract của phase tương lai. Nó định nghĩa invariant trước khi chọn
provider hoặc database; không cấp quyền implement CMS trong static release.

## 1. Vấn đề và kết quả

Owner cần upload post bilingual gồm text, image và video, sau đó publish qua một
tập presentation layout đã được approve. Public rendering phải deterministic,
accessible và safe khi editorial data hoặc media chưa đầy đủ.

## 2. Constraint và câu hỏi mở

### Constraint

- Static public route vẫn là fallback và rollback path.
- Content có cấu trúc; raw HTML, arbitrary CSS và arbitrary component code bị
  reject.
- `layoutKey` là allowlist do frontend contract sở hữu.
- Image/video media cần type validation, alt text và poster handling khi áp dụng.
- Chuẩn hóa media khi upload (owner, 2026-10-03): giữ nguyên file gốc ở vùng
  storage private, rồi sinh biến thể public từ file gốc theo cùng chuẩn với
  site tĩnh: ảnh AVIF kèm WebP dự phòng ở các cỡ chuẩn, video AV1/WebM kèm MP4
  H.264 và poster. Public chỉ dùng biến thể, không dùng file gốc. Lý do: 36 ảnh
  của bản tĩnh đã mất file gốc, chỉ còn WebP nén
  ([danh sách](../verification/media-originals-2026-10-03.md)).
- Provider, database, object storage, retention, backup và cost vẫn mở cho tới
  khi CMS phase bắt đầu và official documentation được revalidate.

### Câu hỏi mở

| Câu hỏi | Owner | Cách giải quyết |
| --- | --- | --- |
| Editorial role và review requirement là gì? | Owner | CMS discovery slice |
| Provider và storage model chính xác? | Owner | Provider decision record |
| Giới hạn size/type và danh sách cỡ biến thể của media? | Owner | Upload verification report |
| Layout preset nào launch trước? | Owner | Frontend/CMS contract review |

## 3. User workflow và acceptance

1. Authenticated owner tạo hoặc edit draft.
2. System validate localized content, media reference và `layoutKey`.
3. Owner submit hoặc publish theo lifecycle đã approve.
4. Public route chỉ đọc published content hợp lệ và render preset trong allowlist.
5. Data invalid, missing, unpublished hoặc unavailable phải fallback an toàn,
   không lộ admin state và không phá public page.

## 4. System và implementation boundary

### Content có cấu trúc

Contract phải định nghĩa localized text, post identity, publication state,
ordered media, media kind (image hoặc video), alt text, poster và
`layoutKey`. Tên field và limit cụ thể được quyết định trong implementation
slice, sau đó ghi vào provider decision record.

### Interface

Advertising theo [AD-BROWSE-R1, policy một cột](advertising-photo-browse.md#r1--ảnh-rộng-một-cột-xếp-organic).
Owner đã bỏ lựa chọn Auto / 1 cột / 2 cột và threshold Auto chỉ dùng để chọn
độ rộng ảnh. Form đăng/chỉnh ảnh không có trường chọn span, kể cả trường chỉ
còn giá trị 1 cột. Nội dung mới không phải khai báo lựa chọn này; metadata cũ
chỉ giữ cho truy nguyên/tương thích theo contract. Quyết định này thay interface
GRID-R4 trước đó, không cấp quyền implement admin hoặc publication trong static phase.

CMS implementation phải document typed admin command cho create, update, submit,
publish, unpublish và media upload, cùng public read contract cho published
post. Mọi interface phải định nghĩa behavior của validation, authentication,
authorization, conflict, rate-limit và storage failure.

### Rendering

```text
structured post -> validated media -> allowlisted layoutKey
-> deterministic public renderer -> safe static fallback
```

## 5. Hướng dẫn implementation

- Định nghĩa public render contract trước admin editor.
- Ưu tiên preset registry nhỏ thay vì page builder đa dụng.
- Tách media object khỏi structured metadata.
- Thêm cleanup và audit behavior cùng lúc với upload/publish behavior.

## 6. Thuộc tính chất lượng

- Security: authenticated write, CSRF protection, least privilege, audit trail
  và validation ở mọi trust boundary.
- Accessibility: alt/poster requirement, heading dễ đoán, editor và public layout
  dùng được bằng keyboard.
- Reliability: publish idempotent, fallback an toàn, orphan cleanup, failure
  observable và rollback.
- Maintainability: provider-specific code nằm sau boundary nhỏ nhất cần thiết;
  không speculative multi-tenant hoặc page-builder abstraction.

## 7. Kế hoạch verification

- Contract test cho structured content và `layoutKey` allowlist.
- Upload test cho invalid type, size, media kind, poster, alt và orphan case.
- Integration test cho draft/review/publish/unpublish và public fallback.
- Security test cho authentication, CSRF, authorization, rate limiting và audit
  event.
- Browser test cho editor state và từng public layout preset.

## 8. Delivery, migration và rollback

Bắt đầu với một post type, một media flow và tập preset hữu ích nhỏ nhất. Không
remove static content cho tới khi CMS output đã publish vượt parity và rollback
check. Provider selection và schema migration cần accepted decision riêng trước
khi implement.

## 9. Reference và history

- [`../backend/index.md`](../backend/index.md#điều-kiện-mở-cms-phase)
- [`page-home.md`](page-home.md)

## Chú thích thuật ngữ

- **Deterministic**: cùng input cho ra behavior có thể dự đoán và tái lập.
- **Editorial**: workflow soạn, review và publish content.
- **Trust boundary**: ranh giới nơi dữ liệu phải được validate và authorize.
- **Parity**: mức tương đương cần đạt giữa output mới và static output hiện tại.
- **Idempotent**: chạy lại cùng thao tác không tạo side effect trùng ngoài ý muốn.
