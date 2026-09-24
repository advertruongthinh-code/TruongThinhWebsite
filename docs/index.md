# Tài liệu Trường Thịnh

Bắt đầu bằng [STATE](STATE.md), sau đó chọn nguồn theo việc cần làm.
Git giữ accepted engineering knowledge; [Notion](operations/notion.md) giữ
planning/status. Không cần đọc toàn bộ reports để tìm contract hiện hành.

## Tìm theo công việc

| Công việc | Nguồn bắt đầu | Nội dung |
| --- | --- | --- |
| Hiểu hệ thống/deploy | [Architecture](architecture/index.md) | Runtime static, source ownership, ranh giới CMS |
| Sửa frontend | [Frontend](frontend/index.md) | Route, shell, gallery/grid/detail và test |
| Sửa backend/admin/data | [Backend](backend/index.md) | Dormant/dev/planned, API/data/trust boundary |
| Thiết kế và reuse UI | [Design system](design/index.md) | Style guide, component/pattern/content/governance |
| Đối chiếu Espacio | [Baseline reference](reference/espacio/index.md) | Foundations/components/motion/templates có provenance |
| Brief ảnh theo sản phẩm khách hàng | [BEINCO, Betrimex, Dừa Cửu Long](reference/advertising-client-products.md) | Sản phẩm, bao bì, nguồn xác minh và giới hạn áp dụng vào ảnh |
| Kiểm acceptance | [Verification](verification/index.md) | Current evidence, supersession và parity NOT PASS |
| Dùng tool/agent | [Operations](operations/TOOLING.md), [core rule](operations/agent-rule-core.md) | Command, workflow, scope và recovery |
| Hiểu quyết định | [Decisions](decisions/index.md) | Accepted/superseded; không suy status từ tuổi file |
| Truy nguyên report cũ | [Archive](archive/index.md) | Original bytes, mapping và giới hạn lịch sử |

## Nguồn chuẩn và artifact của Impeccable

[PRODUCT.md](../PRODUCT.md) sở hữu product truth; [DESIGN.md](../DESIGN.md)
sở hữu visual primitives/roles, [.impeccable/design.json](../.impeccable/design.json)
giữ extensions theo schema. Surface briefs nằm ở `.impeccable/surfaces/` khi có
strategy riêng. `docs/design/` nối artifact với source/API/test để reuse;
không nhân bản token hoặc coi HTML specimen là production component.

## Contract hiện hành

- [Photo/grid Advertising](specs/advertising-photo-browse.md): layout, history,
  primary, gợi ý và catalog154 ảnh. [Capability map](specs/advertising-september-2026-capability-map.md)
  dẫn các correction; không áp checkpoint cũ thay delta mới.
- [Menu mở](specs/full-menu-reference-parity.md), [brand shell](specs/frontend-brand-shell-responsive-runtime.md)
  và [DESIGN](../DESIGN.md): shell và visual authority.
- [Static release](specs/frontend-static-release.md): build/hosting;
  [changelog](../CHANGELOG.md) ghi thay đổi phát hành.
- [STATE](STATE.md) giữ active work, blocker và next action;
  [verification index](verification/index.md) giữ evidence có ngày/scope.
- [Cây project](../README.md#cây-thư-mục-và-trạng-thái) là bản đồ ownership.
  Không lặp bản đồ thứ hai hoặc dùng nhãn Git cũ để quyết định xóa file.

## Quy tắc duy trì

Mọi thay đổi behavior/interface/data/design/tooling/operations cập nhật tài liệu
sở hữu trong cùng task. Không có impact thì ghi lý do cụ thể khi handoff.
Main kiểm phần này của mọi subagent; xem [governance](design/governance.md).
Chỉ tạo report mới khi có evidence bền vững cần giữ, không cho mỗi sửa nhỏ.

Active docs tổ chức theo domain; độ sâu bổ sung dùng cho `reference/espacio`
và archive, không tạo folder theo từng ngày/task. Root Impeccable artifacts giữ
nguyên path tool đọc. `docs/reports/` là compatibility cho machine report/CSV;
không là nơi mặc định ghi tài liệu hướng dẫn mới. Original archive không sửa
để làm đẹp; [mapping](archive/mapping.json) giải path trước/sau.

Các link tới `.tmp/`, `research/reference-site/`, CSV generated và ảnh nguồn
trong `source-assets/` là evidence local, không nằm trong gói website. Một số
artifact nguồn không commit; bản clone dùng kết luận có scope trong verification,
không coi thiếu raw artifact là evidence đã kiểm lại hoặc tự tạo lại chúng.

## Chọn context thiết kế

Bắt đầu từ [design authority map](design/index.md#authority-map). Style guide,
visual system, motion, content, reuse và surface briefs có owner riêng; spec và
operations chỉ link contract ngoài domain, không giữ bản sao thông số.

## Chú thích thuật ngữ

- **Contract**: yêu cầu hoặc giao diện có hiệu lực.
- **Authority**: nguồn chuẩn khi có nhiều bản ghi.
- **Living docs**: tài liệu được cập nhật cùng hệ thống.
- **Provenance**: nguồn gốc và phương pháp tạo evidence.
