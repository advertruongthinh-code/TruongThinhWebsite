# Verification living docs R1

Ngày: 2026-09-09, Asia/Bangkok. Owner đã duyệt
[spec](../specs/living-docs-design-system.md) và plan `tasks/docs-living/plan.md` (local, đã xóa sau khi hoàn tất).
Scope chỉ docs/routing/governance; không sửa UI/backend/runtime, không commit,
deploy, extract hoặc canonical parity rerun. Trạng thái: **hoàn tất trong scope
docs**, với historical gaps và giới hạn runtime được ghi bên dưới.

## Baseline và preservation

Inventory đầu initiative: 132 file docs (120 Markdown, 11 CSV, 1 backup),
được ghi path/byte/SHA256 tại [inventory](../../tasks/plan.md#inventory-living-docs-r1--2026-09-09).
Base Git `a8ba94ec1dadd84990b0b33f7e590f2cf76c71b1` có nhiều dirty/untracked
work trước task; diff HEAD không được coi toàn bộ là thay đổi initiative này.

Execution snapshot ở `.tmp/orchestration/docs-execute-20260909-r1/` giữ
baseline SHA256, original copies và checkpoint. Bản durable của original được
archive cùng [mapping](../archive/mapping.json); source/runtime checks đối
chiếu snapshot thay vì broad reset hoặc stage.

## Kiểm Notion

Fetch ngày 2026-09-09 gồm năm đích cũ và card initiative. “Đọc được” chỉ nói
connector trả page; payload timestamp/last edit không chứng minh live-current.

| Đích | Kết quả | Payload/last edit quan sát | Đối chiếu nội dung |
| --- | --- | --- | --- |
| [Project](https://app.notion.com/p/3b7332849a0e81c6bd2be63fe44e67ac) | Accessible | Payload 2026-08-31; last edit 2026-08-09 | Git/Notion boundary đúng; chưa liệt kê domain docs mới |
| [Docs hub](https://app.notion.com/p/3b7332849a0e81098aeeef782b88657f) | Accessible, stale routing | 2026-08-19 | Vẫn ghi một tầng category/report trực tiếp; Git routing mới ưu tiên |
| [Workspace mapping](https://app.notion.com/p/3b7332849a0e81449deec2780de541f3) | Accessible, historical | 2026-08-09 | Là snapshot discovery, không phải inventory workspace hiện tại |
| [Card dịch Markdown](https://app.notion.com/p/3b7332849a0e81da892bec4641e6ab08) | object_not_found 404 | Không có page payload | Chưa phân biệt thiếu quyền và đã xóa; không xóa link lịch sử |
| [Advertising card](https://app.notion.com/p/3cc332849a0e817f9bcafba5e357c21c) | Accessible, content drift | 2026-08-31 | rank-v2/rapid-filter blocker khác accepted rank-v3/109 media; không tự đóng card |
| [Living docs card](https://app.notion.com/p/3d5332849a0e817aad64f745684c0ca2) | Accessible, Done đã refetch | Last edit 2026-09-08T19:26:47.274Z | Đồng bộ kết quả docs, evidence và việc còn ngoài scope; không thay Git contract |

Tasks schema fetch lại: `Name`, `Status`, `Project`, `Due date`; Status chỉ có
`Not started`, `Up next`, `In progress`, `Done`. Approval/blocker/priority/git
paths nằm trong body. Không thay schema dùng chung. Known link/content drift
được ghi trong [Notion guide](../operations/notion.md), không biến thành dữ kiện
current hoặc tự nghiệm thu công việc website cũ.

## Kiểm sống cùng thay đổi

| Scenario | Tài liệu phải đổi | Điều kiện dừng task |
| --- | --- | --- |
| Đổi carousel input/lifecycle | Component reference, frontend contract và test refs | Example/input/cleanup đúng source mới |
| Đổi API/schema CMS | Backend và CMS spec, decision nếu đổi boundary | Current/dormant/planned rõ, không ghi speculative current |
| Đổi command/tooling | Operations/scripts map và README nếu là entrypoint | Command/consumer được verify |
| Sửa typo test, không đổi behavior/command | Có thể no-impact | Handoff ghi lý do cụ thể, main kiểm |

Gate đã được thêm vào AGENTS, core, knowledge/Notion và evidence/handoff rules.
Không bắt report mới cho mỗi sửa nhỏ; update authority và reference cùng task.

## Verification ledger

| Gate | Trạng thái |
| --- | --- |
| D6 architecture/frontend/backend | Main đọc artifact; 4 file, 17 local links hợp lệ; async mount/current hooks đã sửa |
| D1–D2 baseline reference | 6 file; main và reviewer đối chiếu header/bundle/accounting, route scope và exact unmapped blocker; candidate status đúng authority |
| D4–D5 design/content/reuse | 6 guide; content/media unique facts bảo toàn; Node example và gallery source IDs khớp; shell internal cleanup refs đã bổ sung |
| Impeccable schema và narratives | PASS: PRODUCT marker, 8 DESIGN headings, schema v2, 14 colors, 6 specimens; token refs/narrative đồng bộ; helper list/read 3 surface briefs PASS |
| Archive original/hash và source unchanged | PASS: 31 original, 283 source/test/script/package và 16 machine/raw file giữ SHA256; 132 initial docs có disposition |
| Active links/anchors, docs routing | PASS trong scope: 155 Markdown, 582 references; không có lỗi link mới, giữ 4 source link historical đã biết |
| Fresh agent reuse và independent review | APPROVED: grid, Advertising gallery và shell cleanup tìm đúng source/input/test/caveat; Important findings đã sửa và main đối chiếu |
| Whitespace và disposition | PASS; 132 initial docs có destination; scoped git diff --check không có lỗi |

Các checker tạm nằm trong `.tmp/docs-living/`; không là product tool mới.
Link checker bao phủ Markdown inline/reference link, HTML href và heading
anchor, bỏ fenced code/examples; archived relative links giải qua original path.
Runtime/build không chạy vì source không đổi; đó là boundary có chủ đích,
không được gọi docs PASS là website PASS.

Main đọc manifest skill/reference của các worker/reviewer và kiểm claim bằng
artifact/source, không chỉ nhận lời báo PASS. Checkpoint local giữ
`final-checks.json`, `links-final.json`, `preservation.json`, `changes-final.json`
và `review.md` trong run directory đã nêu. Các file đó là evidence local;
report này giữ kết quả bền vững trong Git, không giả remote commit.
DESIGN và sidecar narrative khớp nội dung sau normalize CRLF/LF; không claim
raw strings có byte giống nhau. Panel render chưa chạy trong task này.

## Known historical link gaps

Preflight có bốn link source đã retire trong motion-audit/parity-inventory:
`src/site/products.js` và `src/site/projects-products/index.html`. Giữ original
bytes, phân loại historical; active guides dùng catalog-runtime/source hiện tại.
Hai stale link trong draft landing spec được sửa khi migration links.
Không che historical gaps bằng cách tạo source giả ở path cũ.

## Findings từ independent review

Reviewer đọc riêng bằng requested `gpt-5.6-sol/high`; synthesis worker dùng
requested `gpt-5.6-luna/max`. Runtime không trả effective route, nên không ghi
requested thành effective. Main đọc artifact và đối chiếu source trước acceptance.

| Finding | Xử lý trong docs |
| --- | --- |
| CMYK bị giới hạn sai thành header | Đối chiếu full-menu brand-color trong style.css/motion.js; đồng bộ PRODUCT/DESIGN/sidecar |
| Filter typography và specimens khác source | Dùng actual anchor/aria-current, line transforms, tile image/caption và carousel DOM/ratio |
| Sidecar ignored làm mất extension khi clone | Bỏ đúng `.impeccable/design.json` khỏi ignore; config local/cache vẫn ignored; chưa stage/commit |
| Backend gộp nhầm HTML/API error status | HTML route 404/503 tách khỏi API valid-slug missing-DB/D1 throw chưa có catch; giữ source gap, không sửa Worker |
| Thiếu route scope và motion-toggle unmapped | Register có scope từng row; giữ candidate/blocker IDs từ canonical coverage CSV |
| Composite bị gọi locked trước exact owner decision | Đổi thành candidate corpus `ESPACIO-R1-20260902`; provenance đã kiểm không thay owner acceptance baseline revision |

Ví dụ reuse đã chạy với source canonical: 6 categories, 109 cards, 109 placements,
5 columns tại width 1280, coordinate hash `9550f5f1`. Gallery block kiosk dùng
source IDs `06–17` khớp `ADVERTISING_DETAIL_LAYOUTS`. Đây là import/data-contract
proof, không phải browser hoặc visual parity proof.

Một compatibility stub tại path navbar report cũ giữ link từ canonical machine
report; mapping ghi `compatibility_stub` và `stub_sha256`. Không hand-edit
machine report hoặc thay hash của original archive. `docs/reports/` còn 7
Markdown: index, template, 4 machine report và 1 stub, thay vì 32 Markdown
trước migration; 12 CSV/backup giữ nguyên.

## Bổ sung R2: gom contract thiết kế theo authority

Owner mở rộng yêu cầu ngày 2026-09-09: rà toàn hệ thống docs cho style guide,
design system và Impeccable; các consumer chỉ ref, không chép lại contract.
Không thay source website trong slice docs này.

| Nội dung đã gom | Nguồn chuẩn sau cập nhật |
| --- | --- |
| Logo target và caption typography | [DESIGN](../../DESIGN.md) |
| Shared choreography, SplitText, catalog/detail motion | [Motion system](../design/motion.md) |
| Grid geometry và carousel visual/interaction | [Patterns](../design/patterns.md) |
| Narrative, i18n, image và menu copy | [Content](../design/content.md) |
| Routing và chống duplicate | [Authority map](../design/index.md#authority-map), [supersession](../design/index.md#supersession) |

Brand/route/Advertising specs giữ integration, data, dependency và QA; mục visual
đã chuyển có link tại chỗ. Giữ các heading motion cũ làm đường dẫn chuyển tiếp.
Frontend template và product-UI rule yêu cầu ref để tránh tái tạo bản sao.
Root PRODUCT/DESIGN và .impeccable giữ đúng path loader. Narrative sidecar là
projection theo schema, không phải authority thứ hai; surface briefs chỉ ref shared contract.

Rà source phát hiện route spec phủ nhận mục con trong khi menu hiện có chúng;
đã sửa routing tới content guide và đối chiếu nhãn với src/site/index.html.
LOGO-R2 là accepted target, chưa triển khai hoặc có runtime PASS. Card
[logo](https://app.notion.com/p/3c9332849a0e812b80b4de7eba20a053) đã cập nhật intent,
scope và link authority; giữ Up next cho implementation.

Verification: link checker toàn hệ thống không phát sinh lỗi mới; bốn missing
source path lịch sử đã biết giữ nguyên. Impeccable kiểm schema/frontmatter,
headings, token references, PRODUCT marker, 14 màu, 6 specimens và narrative PASS.
31 original archive giữ hash. Preservation baseline R1 còn hai delta test của
Advertising đã hoàn tất trước slice này; không phải thay đổi source của docs.
Đã đối chiếu test SHA256 với proof-final của Advertising.

Chi tiết local: .tmp/orchestration/logo-docs-20260909/ giữ changed manifest,
backups, links.json, impeccable.json và preservation.json. Python thiếu PyYAML;
validator dùng dependency tạm trong thư mục này, không đổi global tooling hoặc
project dependency. Không chạy lại browser/build/full parity/semantic extraction.

## Chú thích thuật ngữ

- **Content drift**: nội dung không còn khớp nguồn chuẩn hiện hành.
- **Payload**: dữ liệu connector trả về tại lần fetch.
- **Historical**: đúng trong snapshot cũ, không tự là current truth.
- **No-impact**: không cần đổi docs, có lý do được kiểm.
