# Kiểm kê tooling global/project và tương thích GPT-6 Astra

- Ngày kiểm tra: `2026-09-08`, múi giờ `Asia/Bangkok`.
- Phạm vi: `E:\TruongThinh-Website`, user-global Codex và Agent Skills của
  `C:\Users\halal`; không kiểm kê toàn bộ ứng dụng Windows hay thay đổi PrintWork.
- Trạng thái: baseline audit đã hoàn tất; owner đã chọn giữ Graphify và cho phép
  cập nhật cần thiết. Kết quả triển khai nằm trong mục cập nhật bên dưới.
- Đây là evidence tooling, không phải website release clearance.
- Phần hoãn major bên dưới là baseline lịch sử. Owner đã yêu cầu và hoàn tất
  [migration pnpm 12/Impeccable 4](verification-pnpm-impeccable-major-2026-09-08.md)
  trong lượt tiếp theo cùng ngày; report đó sở hữu current version và evidence.

## Kết luận về Astra

Global `~/.codex/config.toml` đã dùng `model = "gpt-6-astra"` và
`model_reasoning_effort = "high"`; project `.codex/config.toml` chỉ kế thừa.
`models_cache.json` hiện có cả Astra và Luna; `high` của Astra và `max` của Luna
được liệt kê là hợp lệ. CLI trên PATH trả `codex-cli 0.151.0`.

Tài liệu chính thức xác nhận Astra hỗ trợ function calling, structured outputs,
Skills, MCP và tool search. Suy luận từ tài liệu cộng với runtime hiện tại:
không cần viết lại skill/MCP/script chỉ vì đổi sang Astra. Script shell chạy bởi
host; phần cần kiểm tra theo model là model ID, reasoning effort và contract của
tool. Nguồn: [GPT-6 Astra](https://developers.openai.com/api/docs/models/gpt-6-astra).

Giữ pin `gpt-5.6-luna/max` cho semantic worker và Ponytail Git review theo policy
đã có. Pin này không chặn Astra ở main task. `ultra` của Caveman/Ponytail là chế
độ skill, khác với reasoning effort của model. API docs và model catalog Codex có
thể hiển thị các mức effort khác nhau; không suy ra lỗi từ tên giống nhau.

OpenAI khuyến nghị audit instruction trong skills/`AGENTS.md` vì Astra nhạy hơn
với hướng dẫn mâu thuẫn. Vì vậy ưu tiên chỉnh portability và rule conflict,
không đổi hàng loạt model pin. Nguồn:
[Hướng dẫn Astra, Instruction following](https://developers.openai.com/api/docs/guides/latest-model#instruction-following).

## Inventory và bằng chứng runtime

| Scope | Hiện trạng xác nhận | Bằng chứng và giới hạn |
| --- | --- | --- |
| Global skills | 54 thư mục có `SKILL.md`; receipt cũng ghi 54 | Nguồn managed ở `~/.codex/tooling/sources`; năm checkout source đều sạch, đúng pin |
| Global personas | `code-reviewer`, `security-auditor`, `test-engineer`, `web-performance-auditor` | Bốn file tại `~/.codex/agents`; không còn Sol adapter |
| Project integration | Không có payload skill/persona/MCP riêng; có wrapper, pin, policy, Git hook, watcher, Serena config và browser QA | Doctor kiểm tra inheritance; Codex lifecycle hooks tắt |
| Project scripts | 22 file `.ps1`: 18 production/helper script và 4 fixture; không có `.bat`/`.cmd` trong project source được quét | PowerShell Parser không báo lỗi; không chạy bootstrap, sanitizer hoặc mọi mutation script chỉ để thử |
| Global scripts | 22 file `.ps1`/`.bat`/`.cmd` trong các thư mục active đã chọn | Gồm `mcp.ps1`, hai shim Node/pnpm, ba activation script Python và 16 script vendor PowerShell LSP; mọi `.ps1` parse được |

Global script scan giới hạn ở `~/.agents`, `~/.codex/bin`, `~/.codex/agents`,
`~/.codex/skills` và `~/.codex/tooling`; loại backup, source checkout, cache,
staging, Python library và `node_modules`. Payload plugin và package vendor được
kiểm kê bằng manifest/version; không đánh đồng hàng nghìn script vendor với
entrypoint do project bảo trì. Không có tuyên bố đã chạy mọi tool/plugin.

| Runtime/MCP | Kết quả |
| --- | --- |
| Serena `1.7.0` | Handshake + 23 tool; `get_current_config` trả LSP `ready`, context `codex`, đúng project |
| Graphify `0.9.53` | Handshake + 10 tool; truy vấn CLI wrapper và MCP thành công |
| Chrome DevTools MCP `1.8.0` | Handshake + 29 tool; `list_pages` trả trang `about:blank` |
| Node / pnpm / Python tooling | Node `24.19.0`, pnpm `11.24.0`; Node shim chạy được; `pip check` PASS |
| Các integration còn lại | `node_repl`, Open Design và plugin tools có trong registry phiên; chưa chạy đầy đủ workflow riêng của từng integration |

`doctor.ps1 -Mcp` exit `0`. Các cảnh báo còn lại: Serena chưa hỗ trợ `.sql`
trong language map hiện tại, `.png` được báo unknown; Graphify supplemental content
cần restoration và có `133` file non-code pending tại baseline trước edit tài
liệu. AST vẫn fresh. Không chạy semantic extraction, không ghi semantic manifest
hoặc cache để làm mất cảnh báo.

Bốn fixture đều PASS: `global-stack-update-fixtures.ps1`,
`ponytail-git-hooks-fixtures.ps1`, `graphify-workflow-fixtures.ps1`,
`graphify-freshness-fixtures.ps1`. Fixture Ponytail kiểm tra source/config/hook
status; không phải một lần review model end-to-end trên commit mới.

### Plugin và tool discovery

`codex plugin list --json` trả 13 plugin local enabled:

| Nhóm | Plugin/version |
| --- | --- |
| Bundled browser | browser, chrome, computer-use `26.901.51231` |
| Bundled khác | sites `0.1.57`, visualize `1.0.29`, codex-app-tools `0.1.3` |
| Primary runtime | documents, pdf, spreadsheets, presentations, template-creator `26.905.11957` |
| Local curated | google-calendar, slack `82fd64bc` |
| Remote bổ sung thấy trong cache/catalog phiên | codex-security `0.1.23`, deep-research-work `0.1.14`, github `0.1.12-5f7cd798dc99`, notion `0.1.8`, openai-templates `0.1.1`, plugin-management `0.1.0` |

CLI local list và catalog phiên không cùng phạm vi. Số plugin trong cache không
chứng minh trạng thái OAuth hay health của mỗi connector. Không sửa cache plugin
bundled bằng tay hoặc cài lại plugin chỉ vì CLI không liệt kê remote package.

### Skill có giới hạn portability

| Finding đã kiểm tra source | Ảnh hưởng | Đề xuất |
| --- | --- | --- |
| `~/.agents/skills/cavecrew/SKILL.md` gọi ba preset `cavecrew-*`, nhưng global chỉ có bốn persona review khác | Không thể giả định tên preset đó callable trong Codex | Map trách nhiệm sang native worker/reviewer khi cần; không cài Claude persona bundle |
| `caveman-explore/SKILL.md:4-5` có `tools: Read, Glob, Grep`, `model: haiku` | Hướng dẫn dành cho host khác; không phải yêu cầu đổi Astra thành Haiku | Cần adapter bằng native tool/role, hoặc không chọn skill này cho Codex |
| `caveman-stats/SKILL.md:8` giao toàn bộ việc cho lifecycle hook | Hook Codex đang tắt; skill hiện tại không có đường chạy stats đúng contract | Chưa coi skill này operational; không tự bật hook để khắc phục |
| Một số Caveman README trỏ `../../README.md` hoặc `../../agents/*` ngoài payload đã copy | Link đóng gói hỏng; không đồng nghĩa mọi core skill hỏng | Sửa qua nguồn/pipeline quản lý để không mất khi bootstrap lại |
| `i-have-adhd` đặt `disable-model-invocation: true` | Catalog implicit không hiển thị, nhưng file tồn tại và AGENTS yêu cầu load trực tiếp | Đây là metadata chủ động, không phải lỗi thiếu cài đặt |

Ví dụ emoji trong output contract của một số skill upstream mâu thuẫn no-emoji
policy của project; policy project thắng. Graphify có hướng dẫn Gemini/Agent/Task
chung cho nhiều host; semantic lane của project vẫn là Luna/max theo yêu cầu
explicit. Không coi thiếu `graphify`/`uv` trên PATH mặc định là lỗi runtime khi
global launcher và project wrapper đã chạy thành công.

Đã loại một false positive từ kiểm tra link tự động: `references/redlining.md`
và `references/ooxml.md` trong system `skill-creator/SKILL.md` nằm trong code block
minh họa, không phải dependency bắt buộc bị thiếu.

## Version mới và mức cần thiết

`check-updates.ps1` đã chạy notify-only, ghi timestamp/result vào
`.tooling/state/update-check.json`. Bản kiểm tra này so với pin, không tự so sánh
mọi package thực cài; runtime chủ chốt đã được kiểm tra riêng ở trên.

| Thành phần | Đang pin | Bản registry mới | Đánh giá |
| --- | --- | --- | --- |
| Codex CLI | `0.151.0` thực cài | `0.153.4` | Cập nhật qua kênh quản lý Codex hiện tại; không chép đè binary do Desktop quản lý |
| Graphify | `0.9.53` | `0.9.56` | Có sửa lỗi JS/TS import, caller traversal MCP, Windows path; ứng viên nâng bảo trì nếu tiếp tục dùng |
| uv | `0.12.7` | `0.12.10` | Patch; không phải yêu cầu Astra |
| Chrome DevTools MCP | `1.8.0` | `1.9.0` | Minor; cần handshake và browser smoke sau nâng |
| Playwright | `1.62.1` | `1.63.0` | Kèm browser engines và lockfile; cần focused cross-browser QA |
| Impeccable CLI | `3.6.0` | `4.0.4` | Major; review đồng bộ CLI/skill và giữ policy không Codex lifecycle hook |
| pnpm | `11.24.0` | `12.3.4` | Major; giữ hiện tại trong đợt Astra audit, kiểm tra lockfile/CI trước migration riêng |

Serena stable vẫn `1.7.0`; jq vẫn `1.8.2`. Repository HEAD mới không tự động có
nghĩa stable package mới. Nguồn version: [PyPI Graphify](https://pypi.org/pypi/graphifyy/json),
[PyPI uv](https://pypi.org/pypi/uv/json),
[npm Chrome DevTools MCP](https://registry.npmjs.org/chrome-devtools-mcp/latest),
[npm Playwright](https://registry.npmjs.org/playwright/latest),
[npm Impeccable](https://registry.npmjs.org/impeccable/latest),
[npm pnpm](https://registry.npmjs.org/pnpm/latest),
[npm Codex CLI](https://registry.npmjs.org/@openai/codex/latest).
Chi tiết sửa lỗi: [Graphify v0.9.56](https://github.com/Graphify-Labs/graphify/releases/tag/v0.9.56).

So sánh source skill với GitHub HEAD ngày kiểm tra:

| Nguồn | Delta | Hành động đề xuất |
| --- | --- | --- |
| `addyosmani/agent-skills` | 37 commit; có thay description, context budget, bảo vệ plan và checklist | Ưu tiên review pin `6ca0cd7db39b41b1c37e26d335c507ee92382c6d`; cập nhật skill và references cùng nhau |
| `juliusbrussee/caveman` | 106 commit; có thay skill và compress script | Review payload cần dùng; giữ mode ultra, không tự thêm gateway/plugin/hook |
| `ayghri/i-have-adhd` | 23 commit; diff không thay payload skill | Chưa cần nâng chỉ vì HEAD thay đổi |
| `dietrichgebert/ponytail` | 12 commit; chỉ README/assets | Chưa cần nâng payload skill |
| `pbakaus/impeccable` | 113 commit; diff lớn, GitHub compare trả giới hạn 300 file | Chưa gọi là review đầy đủ; nâng riêng sau kiểm tra CLI/skill cùng bộ |

## Skill tự tìm skill

`using-agent-skills` đã cài: chọn workflow phù hợp trong catalog đang có. Codex
cũng hỗ trợ implicit invocation qua `description`; không cần thêm router để dùng
skill đã cài. Nguồn: [Build skills](https://learn.chatgpt.com/docs/build-skills).

Nếu mục tiêu là tìm skill mới trên hệ sinh thái, ứng viên đúng chức năng là
[`find-skills` của Vercel](https://github.com/vercel-labs/skills/blob/main/skills/find-skills/SKILL.md).
Skill hướng dẫn tìm bằng `npx skills find <query>`. Chưa cài skill/CLI này.
`skill-installer` có sẵn để liệt kê curated skills hoặc cài từ GitHub; nó không
phải bộ tự xếp hạng workflow cho mọi task. Không dùng bulk `skills update` lên
stack đã pin bởi bootstrap.

## Graphify khi frontend và backend tăng

Đếm source text được `rg --files` nhìn thấy, dùng `Measure-Object -Line` cho số
dòng không rỗng; đây không phải số LOC executable hay toàn bộ dung lượng repo:

| Vùng | File text | Dòng không rỗng |
| --- | --- | --- |
| `src/site` | 16 | 12.033 |
| `src/worker` | 1 | 1.167 |
| `src/admin` | 3 | 437 |
| `src/db` | 4 | 184 |
| `scripts` / `tests` / `docs` | 36 / 21 / 114 | 6.744 / 14.146 / 8.413 |

Backend Worker/D1/R2 hiện dormant theo accepted project state; audit vẫn tính
source này để chuẩn bị CMS. Không bật Wrangler hoặc CMS runtime trong audit.

Graph hiện `2.336` node, khoảng `2,5 MiB`. Chưa có bằng chứng graph quá lớn.
Một query wrapper khi AST đã fresh mất `16,7 giây` wall time; đây là một mẫu,
không phải median hoặc kết luận nguyên nhân. Một query MCP rộng yêu cầu budget
`1.800` nhưng server tự báo output khoảng `4.279` token do giữ toàn bộ edge.
Query hẹp với `depth=1`, `context_filter=["call"]` trả kết quả gọn hơn.

Đối chiếu cùng query `doctor.ps1`, BFS depth `2`, budget `500`: direct MCP mất
`16 ms` đo quanh tool call, trả cùng 21 node và hiển thị 12 node như wrapper.
Đây vẫn là một cặp mẫu; direct MCP đọc graph đã có và không thay freshness gate
của wrapper. Suy luận cần điều tra trước: chi phí wrapper/kiểm tra freshness có
thể lớn hơn traversal. Chưa đủ căn cứ kết luận phải thay Graphify engine.

Suy luận: cần so sánh độ đúng của quan hệ, độ tươi và chi phí context trước khi
thay engine chỉ vì repo tăng. AST call graph không tự chứng minh quan hệ
HTML selector/CSS, generated route, HTTP endpoint và SQL string; đó phải là
test thực tế trên project.

## Ứng viên thay Graphify

Đây là đánh giá source/documentation upstream ngày `2026-09-08`, chưa phải
benchmark trên project. Không dùng số token tiết kiệm hoặc độ chính xác do tác
giả tự công bố làm kết quả đã xác nhận tại đây.

| Ưu tiên | Ứng viên | Lý do phù hợp | Điều kiện và giới hạn |
| --- | --- | --- | --- |
| 1 | [codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp) | MIT; native Windows; SQLite graph, Tree-sitter kết hợp LSP, watcher/incremental; có call chain và quan hệ service. Tác giả có ma trận kiểm tra HTML/CSS/SCSS và JS/TS/SQL | Cần chứng minh PowerShell, Markdown và quan hệ xuyên HTTP/SQL trên source thật. Installer mặc định sửa agent config, skill/instruction và lifecycle hook; chỉ thử bằng `--skip-config`/manual setup trong phạm vi cô lập, giữ hooks policy hiện tại |
| 2 | [CodeGraphContext](https://github.com/CodeGraphContext/CodeGraphContext) | MIT; Tree-sitter/SCIP, 25 MCP tool; JS/TS, Python, HTML/CSS; watcher và embedded graph database; có hướng dẫn Windows | Phải xác nhận backend Kuzu/Ladybug và binary tương ứng trên máy này. Chưa có bằng chứng đủ cho SQL, PowerShell hoặc semantic documentation |
| Có điều kiện | [GitNexus](https://github.com/abhigyanpatwari/GitNexus) | Có `route_map`, `api_impact`, `shape_check`; phù hợp bài toán frontend gọi backend, tích hợp Codex | [LICENSE](https://github.com/abhigyanpatwari/GitNexus/blob/main/LICENSE) là PolyForm Noncommercial 1.0.0; không mặc định chọn cho công việc kinh doanh khi chưa làm rõ license. README mô tả `analyze --watch` incremental nhưng roadmap vẫn để incremental chưa hoàn tất; cần kiểm chứng đúng version và dependency native Windows |
| Chưa ưu tiên | [code-graph-rag](https://github.com/vitali87/code-graph-rag) | MIT; nhiều project, cập nhật incremental, graph query và MCP | Memgraph/Docker tăng phần vận hành đối với solo dev; chỉ đáng thử nếu cần graph service dùng chung |
| Phương án bổ trợ | [Repomix MCP](https://repomix.com/guide/mcp-server) + Serena | Đóng gói source/docs có filter, đọc/tìm nội dung; Serena giữ symbol/reference. Ít thay đổi workflow hơn đổi cả graph stack | MCP còn experimental theo tài liệu; không thay thế quan hệ graph hoặc semantic index của Graphify |

Riêng `codebase-memory-mcp`: MCP có daemon điều phối theo tài khoản; CLI không
có cùng cơ chế daemon/watch. Vì vậy không coi chạy CLI thử là đủ chứng minh
behavior MCP, hoặc coi installer mặc định là một thao tác chỉ chép binary.
Nguồn: README và hướng dẫn installation trong repository của ứng viên.

Giữ Serena trong mọi phương án thử. Chưa có ứng viên nào ở trên được xác nhận
thay đầy đủ phần non-code semantic của Graphify, đặc biệt tài liệu Markdown,
PDF/Office. Không xóa graph/cache cũ để thử công cụ mới.

### Phép thử quyết định thay hay giữ

Chạy cùng một bộ câu hỏi và cùng snapshot source; ghi rõ kết quả đúng, thiếu,
false positive, thời gian và kích thước output. Tách cold index, warm query,
freshness check và incremental update để tránh so sánh khác loại thao tác.

1. Từ frontend JS/MJS đi tới Worker endpoint và SQL table: đối chiếu từng cạnh
   với source, không suy ra call chain chỉ từ tên giống nhau.
2. Từ HTML/CSS selector và asset tới module dùng chúng: kiểm tra quan hệ thực
   tế, kể cả trường hợp graph không biểu diễn được.
3. Từ Python/PowerShell entrypoint tới caller và config: kiểm tra script tooling
   Windows đang được project bảo trì.
4. Từ một quyết định trong Markdown tới rule/config/source liên quan: kiểm tra
   phần kiến thức mà AST riêng không bao phủ.
5. Sửa một file, đổi tên và xóa file trong fixture cô lập: kiểm tra thời gian
   cập nhật, cạnh stale và khả năng rollback; không sửa source đang làm dở.

Chọn ứng viên khi nó giữ được các quan hệ cần dùng, báo rõ phần không hỗ trợ,
và giảm chi phí đo được mà không thêm global hook hoặc service ngoài chủ ý.
Nếu lợi ích chưa rõ, giữ Graphify và điều tra wrapper trước. `0.9.56` là lựa
chọn bảo trì có liên quan trực tiếp JS/TS/Windows nếu tiếp tục dùng Graphify.

## Thay đổi đã thực hiện và giới hạn

Phần baseline và shortlist ở trên ghi lại thời điểm đánh giá trước khi owner
duyệt triển khai. Quyết định hiện tại là **giữ Graphify**, không cài công cụ
thay thế và không thực hiện pilot.

### Cập nhật được owner cho phép trong cùng session

| Scope | Thành phần | Trước | Sau |
| --- | --- | --- | --- |
| Global | Graphify | `0.9.53` | `0.9.56` |
| Global | uv | `0.12.7` | `0.12.10` |
| Global | Chrome DevTools MCP | `1.8.0` | `1.9.0` |
| Project | Playwright | `1.62.1` | `1.63.0` |
| Global | Agent Skills source | `d2c37ef6` | `6ca0cd7d` |

Agent Skills vẫn có 25 upstream skill, tổng managed vẫn 54. Đã đọc diff
skill/reference trước cài: cải thiện trigger description, quản lý context,
security và observability checklist. Các pin Caveman, ADHD, Ponytail và
Impeccable source giữ nguyên. Graphify skill được cài lại theo package mới.

Ba payload `cavecrew`, `caveman-explore`, `caveman-stats` được thay bằng bản
tương thích Codex có nguồn tại `scripts/tooling/skill-overrides/`. Hai skill
đầu dùng native role/tool và Graphify/Serena; stats đọc record `token_count`
read-only, lấy snapshot cumulative mới nhất, không cộng trùng hoặc bịa savings.
Đã thử đọc đúng các field usage của session hiện tại, không xuất nội dung log.
SHA-256 của ba payload đã cài khớp source; validator skill PASS với `python -X utf8`.
UTF-8 flag cần cho tài liệu tiếng Việt trên Windows, không sửa system skill.

Bootstrap có `-Components`, nhận `Python`, `Node` hoặc `Skills`, để chạy installer cần thiết mà
không chạm config/persona/Git hook/project browser/retirement. Fixture thực thi
nhánh dispatch bằng installer stub đã xác nhận: không truyền Components vẫn
đi vào full bootstrap, chọn Skills chỉ chạy một lần, Node không cài pnpm shim.
Overlay staging có kiểm tra đường dẫn, thay thế idempotent và giữ skill khác.
Lỗi null-array trong bản nháp selector đã được phát hiện và sửa trước khi chạy
installer global. Không thực thi toàn bộ bootstrap để kiểm tra nhánh mặc định.

Đã kiểm tra resolver Python trước cài: chỉ hai distribution Graphify và uv đổi,
không nâng dependency ngoài phạm vi. `pip check` PASS. Bản vá query stamp
Windows vẫn áp dụng được trên Graphify mới và Python compile PASS.
Playwright manifest/pin/lockfile khớp; frozen install PASS. Package mới bỏ
optional dependency `fsevents`, nên lockfile bỏ đúng nhánh đó; dependency
website khác giữ nguyên. Không để lại ngoại lệ release-age do pnpm tự tạo
trong global Node directory.

`doctor.ps1 -Mcp` PASS với Serena 23 tool, Graphify 10 tool và DevTools 29 tool.
MCP process mới đã chạy `query_graph` và `list_pages` thành công. `prepare:site`
và `qa:static` PASS. Browser smoke **21/21 PASS trong 27,8 giây** trên Chromium
`153.0.8010.12`, Firefox `155.0`, WebKit `26.6`; đã kiểm tra route VI, chuyển EN,
reload và reduced motion. Giữ browser payload cũ để rollback.

Năm fixture PASS: `global-stack-update`, `skill-compatibility`,
`graphify-workflow`, `graphify-freshness`, `ponytail-git-hooks`. Cả 24 script
PowerShell project parse PASS. Doctor cuối sau cài skill PASS; hash global
Codex config/AGENTS và project Codex/Serena config không đổi.

Evidence local: `.tooling/logs/tooling-update-doctor.log`,
`tooling-update-doctor-final.log`, `tooling-update-browser.log`,
`tooling-update-skills.log` trong cùng thư mục log. Các entrypoint chính đã chạy:

```powershell
pwsh -NoProfile -File scripts/tooling/bootstrap.ps1 -Components Skills
pwsh -NoProfile -File scripts/tooling/doctor.ps1 -Mcp
pnpm install --frozen-lockfile --no-optional --ignore-scripts
pnpm prepare:site
pnpm qa:static
# BASE_URL=http://127.0.0.1:4173; start the static preview separately.
pwsh -NoProfile -File scripts/tooling/run-playwright.ps1 -Suite smoke
```

Đã dừng đúng preview process do task này tạo. Browser smoke là scoped tooling
verification, không thay full-site/parity acceptance. Cảnh báo còn lại ở lần
doctor cuối: Serena `.sql` unsupported, `.png` unknown; Graphify supplemental
cần restoration và **137 file non-code pending**. Không chạy semantic extraction.

Giữ Astra/high, Serena `1.7.0`, jq `1.8.2`, pnpm `11.24.0` và Impeccable
CLI/skill hiện tại. Major update pnpm/Impeccable cần migration riêng; không phải
điều kiện tương thích Astra. Codex CLI và plugin bundled tiếp tục do kênh
Desktop/plugin quản lý; không chép đè binary hoặc cache đang chạy.

Backup trước cập nhật:

- Project: `.tooling/backups/tooling-update-20260908/` gồm file pin, lockfile,
  script, tài liệu và danh sách Python distribution trước cập nhật.
- Global: `C:\Users\halal\.codex\tooling\backups\tooling-update-20260908/`
  gồm payload Graphify/uv cũ, launcher và Node manifest/lockfile.
- Bản vá Graphify có backup riêng tại
  `C:\Users\halal\.codex\tooling\backups\graphify-query-stamp-20260908T140124Z/`.
- Skill/source/reference trước cài ở
  `C:\Users\halal\.codex\tooling\backups\bootstrap-20260908T142041Z/`.

Global runtime được project khác kế thừa khi tạo process mới. Không sửa source,
pin hoặc policy riêng của PrintWork trong task này. MCP process đang mở có thể
vẫn dùng module cũ đã nạp; các probe ở trên tạo process mới để xác minh bản mới.

### Sửa tài liệu trong baseline audit

Đã sửa hai link `scripts.md` không tồn tại thành `agent-rule-scripts.md` trong
workflow rule; sửa mô tả Sol adapter thành bốn native persona trong runbook.
Backup trước edit nằm ở `.tooling/backups/tooling-audit-20260908/`.
Giữ nguyên unrelated worktree và các báo cáo lịch sử.

Trong baseline audit chưa thay runtime. Đợt triển khai tiếp theo cập nhật pin và
runtime như bảng trên; giữ global config, model policy, MCP registration,
plugin permission, Git hook và Graphify semantic index policy. Chưa
commit, push, deploy hay ghi Notion. `STATE.md` giữ nguyên vì phase/behavior và
release blocker không đổi. Bản đánh giá này không ghi đè plan Advertising đang
còn human acceptance trong `tasks/`.

## Chú thích thuật ngữ

- **MCP**: giao thức để host agent gọi tool bên ngoài.
- **Payload**: nội dung skill/package thực được cài, khác với README và lịch sử source.
- **Pin**: version hoặc commit cụ thể dùng để tái lập môi trường.
- **AST/LSP**: cây cú pháp và giao thức language server hỗ trợ phân tích source.
- **Semantic pending**: nội dung non-code chưa có extraction phù hợp source hiện tại.
