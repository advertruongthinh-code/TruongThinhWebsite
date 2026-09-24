---
title: Living docs, baseline Espacio và design system Trường Thịnh
type: cross-cutting
status: accepted
updated: 2026-09-09
notion: https://app.notion.com/p/3d5332849a0e817aad64f745684c0ca2
related_decisions:
  - ../decisions/git-notion-governance.md
related_reports: []
---

# Living docs, baseline Espacio và design system

Intent R1 đã chốt với owner: docs trước, refactor component/token ở phase riêng.
Owner đã duyệt spec và plan D1–D13 trong session ngày 2026-09-09.
Card Notion giữ planning/status, Git giữ contract và evidence sau acceptance.

## 1. Mục tiêu và scope

Solo developer và AI agent phải tìm được nguồn hiện hành theo công việc,
biết reuse code đã có và biết điều gì còn chưa kiểm chứng. Giảm việc phải
đọc nhiều report để ghép lại current behavior. Không đo thành công bằng số
file ít nhất; không gom thành một tài liệu khổng lồ.

| ID | Outcome | Boundary |
| --- | --- | --- |
| R1 | Docs điều hướng theo architecture, frontend, backend, design, operations | Một nguồn chuẩn cho mỗi contract |
| R2 | Espacio là baseline có snapshot/provenance cố định | Không tự cập nhật theo live website |
| R3 | Design system/style guide đủ để reuse đúng | Gắn code/evidence thật, không tạo component giả |
| R4 | Artifact Impeccable đúng path/schema | Không move root files vào docs |
| R5 | Living docs cập nhật cùng thay đổi liên quan | Không bắt thêm report cho mọi commit nhỏ |
| R6 | Link Git/Notion có trạng thái kiểm chứng | 404 không tự đồng nghĩa đã xóa |
| R7 | Migration bảo toàn evidence và work hiện hữu | Không refactor UI/backend, không mất raw artifact |

Không triển khai component extraction, backend/CMS, redesign, dependency
upgrade, commit, push, deploy, semantic extraction hay canonical parity rerun.
Không ghi lại code hiện tại thành design accepted khi nó còn là defect/gap.

## 2. Baseline và evidence model

Phân biệt ba lớp: Espacio measured baseline; Trường Thịnh accepted design;
Trường Thịnh observed implementation/parity. Không dùng thứ tự file mới nhất
để tự suy ra authority. Owner decision và source evidence phải được đối chiếu.

Mỗi baseline entry ghi measurement ID, source URL/route, source report và
section, snapshot/capture time, viewport/theme/locale, method, value/unit,
status measured/inferred/unverified và supersession khi có. Nhiều đợt capture
khác ngày phải gọi là bộ baseline tổng hợp có provenance, không giả thành
một snapshot đồng thời. Baseline đã khóa chỉ đổi bằng yêu cầu owner riêng.

Không nâng NOT PASS thành PASS bằng cách gom docs. Obligations chưa đo,
runtime-blocked, motion-toggle chưa mapping hoặc conflict vẫn hiện rõ.
Raw artifact và report gốc phải truy nguyên từ measurement index.

## 3. Cấu trúc và ownership đề xuất

```text
PRODUCT.md                         product truth
DESIGN.md                          visual record/token schema Impeccable
.impeccable/design.json            extensions, component specimens
.impeccable/surfaces/<slug>.md      surface-specific strategy khi cần
.impeccable/critique/<helper-name>  review evidence khi thực sự chạy
docs/index.md                      task-to-document routing
docs/STATE.md                      phase, hard boundary, blocker, next action
docs/architecture/                 overview, current runtime, deployment
docs/frontend/                     shell/runtime/routes, feature contracts
docs/backend/                      current/dormant/planned boundaries
docs/design/                       component/pattern/content/governance
docs/reference/espacio/            foundations/components/motion/templates/evidence
docs/verification/                 current evidence index và parity status
docs/decisions/                    durable decisions, descriptive names
docs/operations/                   developer/tooling/agent procedures
docs/specs/                        initiative specifications và templates
docs/archive/reports/              original historical evidence
docs/archive/decisions/            superseded decisions khi đủ mapping
docs/reports/                      compatibility sink cho existing generators
```

Đổi quy định cũ một tầng category sang cấu trúc theo responsibility có độ sâu
hữu hạn. Không tạo thư mục con theo từng task hoặc từng ngày trong active docs.
Giữ docs/specs cho initiative contracts, không nhân bản spec thành frontend guide:
mỗi section có một nguồn; guide dẫn tới section chưa được chuyển ownership.

Ngoại lệ compatibility: parity generators đang đọc/ghi ba report và CSV tại
docs/reports. Giữ các sink này tại path cũ trong phase docs; index mới dẫn tới
chúng với nhãn machine-owned. Di chuyển sink cần task tooling migration riêng,
không sửa tên file rồi để script tái tạo report cạnh tranh.

Từng source file được quyết định trong inventory; không tạo tất cả tên gợi ý
nếu chưa có nội dung độc lập. Không xóa ADR accepted chỉ vì ngắn hoặc cũ.

## 4. Design system và Impeccable

PRODUCT.md ghi users, purpose, positioning, operating context, capabilities,
constraints, brand commitments, evidence và accessibility đã xác nhận.
Giữ facts đã chốt; đánh dấu unknown, sửa stale routing theo source đã kiểm.
Thêm product schema marker theo installed init reference khi cập nhật.

DESIGN.md giữ heading chuẩn Overview, Colors, Typography, Layout,
Elevation & Depth, Shapes, Components, Do's and Don'ts; prose tiếng Việt.
Frontmatter dùng colors/typography/rounded/spacing/components theo schema.
Motion, breakpoint, shadow và component HTML/CSS specimens thuộc design.json.
Không tạo token cho mọi literal hoặc nhân bản giá trị giữa nhiều authority.
Generated ramp/specimen, nếu tool contract cần, phải tách khỏi normative
production token; không tuyên bố đã được dùng trong site nếu chưa có source.

Surface brief chứa visitor mode, job, scope, direction, constraints và unknown,
không copy product hoặc global tokens. Brief chỉ cần cho surface có chiến
lược riêng. Critique snapshots/ignore/config/live chỉ tạo khi workflow áp dụng;
không chạy extra command hoặc tạo file rỗng để đạt số lượng artifact.

Component reference cần source/symbol/import hoặc DOM contract; parameters,
data schema, return/errors khi có; variants/states; before/after usage example;
use/avoid; composition; i18n/responsive; keyboard/focus/screen reader;
loading/error/empty/reduced-motion; lifecycle cleanup; consumer/test links;
customization boundary và accepted/experimental/deprecated status.

Pattern guide mô tả cách phối hợp shell, gallery, grid/filter, detail renderer;
không tự biến mỗi route thành component mới. Content guide cover brand voice,
CTA, VI/EN, terminology, alt/aria, factual claims và media. Governance cover
ownership/approval, version/supersession, migration, checks và preservation.
Style guide riêng chỉ giữ ví dụ áp dụng/do-don't không trùng DESIGN.md.

Workflow: reuse installed init/document contracts; audit/critique chỉ scoped
evidence cần thiết. extract có source migration, bị defer. Missing DESIGN.md
không cho phép thay incumbent visual identity hoặc mở lại aesthetic workshop.
Qualitative description dựa intent đã chốt; chỉ hỏi gap material thật sự.

## 5. Living-docs gate

Mỗi task ghi docs impact với affected domain/path. Nếu thay behavior, interface,
schema, design, command, ownership, deployment hoặc acceptance evidence,
update nguồn tương ứng trong cùng task trước nghiệm thu. Nếu không có impact,
ghi lý do cụ thể; không viết thêm Markdown chỉ để chứng minh đã sửa code.

Main và worker đều áp dụng gate; main kiểm claim. Cập nhật references và
supersession; verification report chỉ cần khi có evidence mới đáng giữ.
STATE tối đa khoảng 60 dòng nội dung hữu ích, link thay copy test history;
không hạ/mất blocker và owner acceptance đang mở khi rút gọn.
Không áp policy project này thành thay đổi global ngoài scope.

Notion giữ status, blocker, next action và link tới Git canonical. Không copy
lại toàn spec thành contract cạnh tranh. Card hiện tại được update theo
evidence; card khác chỉ sửa phần mapping/status thực sự được verify và
authorized, không bulk-close task lịch sử.

## 6. Acceptance và verification

| AC | Điều kiện | Cách chứng minh |
| --- | --- | --- |
| AC1 | Mọi file baseline có disposition/mapping, không mất dữ liệu | Inventory path, byte/hash và before/after manifest |
| AC2 | Một nguồn chuẩn, current/history tách rõ | Review index, source-of-truth map, supersession |
| AC3 | Baseline Espacio có provenance và unknown | Sample foundations/component/motion/template tới report và artifact |
| AC4 | Không sửa UI/backend/runtime/lockfile | Đối chiếu baseline SHA256 và scoped diff |
| AC5 | DESIGN/product/sidecar theo installed schema | Impeccable read-only validation; source và rendered evidence phù hợp |
| AC6 | Reuse đủ dữ liệu thực tế | Fresh agent tìm gallery renderer/input/test, grid contract và shell lifecycle |
| AC7 | Docs impact gate rõ cho mọi role/domain | Scenario frontend, backend, tooling và no-impact task |
| AC8 | Local links/anchors và code refs hợp lệ | Scoped link checker; manual exact symbol/consumer proof |
| AC9 | Notion link có result và content drift | Fetch đích liên quan, record accessible/404/unknown, reconcile với Git |
| AC10 | Rollback và generator compatibility | Hash originals; existing sink paths giữ nguyên; không chạy canonical để test docs |

Không gọi scenario PASS là production runtime PASS. Existing browser evidence
có ngày/hash phải ghi rõ là historical khi source không còn khớp. Nếu cần
render để document token thì chạy scoped local browser sampling, không polish
UI hay mở full-site parity suite. Design doc có gap chưa verify phải ghi gap.

Commands đã có:

```powershell
git -c safe.directory=E:/TruongThinh-Website diff --check
pwsh -NoProfile -File scripts/tooling/doctor.ps1 -Mcp
```

Doctor chỉ cần nếu routing/tooling behavior bị ảnh hưởng. Link/schema checker
cụ thể chốt trong plan sau inventory; không tuyên bố command chưa tồn tại.

## 7. Migration và rollback

Trước mutation: snapshot hash/status, exact source/destination, link/consumer
map; giữ untracked work. Viết phần tổng hợp và verify trước khi archive bản
gốc. Mọi move trong workspace và kiểm collision; không broad reset/delete.
Các original report cần preservation được giữ nguyên byte trong archive,
link lịch sử trong archived report được giải theo old-root mapping thay vì
sửa mất nguyên bản. Active docs trỏ đích mới. Raw artifact giữ tại sink đã
verify; không stage/cache/generated bừa.

Rollback chỉ đổi lại path/file do task sở hữu dựa manifest và backup; không
ghi đè thay đổi đồng thời. Sửa links/routing phải cùng slice với move. Chưa
chốt snapshot Espacio cụ thể không được ghi baseline đã locked.

## 8. Tình trạng và bước kế tiếp

Inventory initial: 132 file docs, gồm 120 Markdown và 12 CSV/backup.
Hai native worker đã trả inventory Espacio provenance và design/code mapping.
Main đã đối chiếu raw sink/suffix, motion replay drift và source reuse entrypoint.
Inventory không phải audit từng dòng toàn bộ docs; requested Sol/high,
effective unknown. Mapping đầy đủ ở [inventory](../../tasks/docs-living/inventory.md),
thứ tự thực thi ở [plan](../../tasks/docs-living/plan.md).

Owner đã duyệt spec, plan và mapping trong session ngày 2026-09-09.
Kết quả thực thi và các giới hạn được ghi tại
[verification living docs](../verification/living-docs-2026-09-09.md).
Corpus `ESPACIO-R1-20260902` là candidate baseline có provenance; approval của
migration không tự là quyết định khóa exact baseline revision đó. Refactor
chỉ là backlog phase sau, không thuộc acceptance docs.

## Chú thích thuật ngữ

- **Living docs**: tài liệu được duy trì cùng thay đổi hệ thống.
- **Authority**: nguồn chuẩn cho một loại quyết định hoặc contract.
- **Provenance**: nguồn gốc, thời điểm và phương pháp tạo evidence.
- **Sink**: path script hiện đang đọc/ghi output.
- **Disposition**: quyết định giữ, gộp, chuyển hoặc archive một file.
- **Normative**: giá trị có hiệu lực làm contract, khác mẫu minh họa.
