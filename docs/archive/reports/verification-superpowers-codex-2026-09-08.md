# Nghiệm thu Superpowers cho ChatGPT và Codex

Ngày triển khai: 2026-09-08; kiểm tra cài global hoàn tất ngày 2026-09-09,
múi giờ Asia/Bangkok. Owner đã duyệt [spec](../specs/superpowers-chatgpt-codex-orchestration.md)
và [plan](../../tasks/superpowers/plan.md).

## Kết quả cài đặt

Đã cài bản tùy chỉnh `subagent-driven-development` vào
`C:/Users/halal/.agents/skills/`. Managed skills tăng từ 54 lên 55.
`using-agent-skills` và `cavecrew` dẫn tới hợp đồng điều phối chung.
Main giữ trao đổi yêu cầu và nghiệm thu, được làm task nhỏ; model/effort worker
chọn theo capability, rủi ro và khả năng kiểm chứng. Brief cụ thể hơn khi
worker dùng model/effort thấp.

Nguồn là [obra/superpowers](https://github.com/obra/superpowers/tree/b36e0829c6d0140e93cfef2ca599b1b07d4a7797),
pin `b36e0829c6d0140e93cfef2ca599b1b07d4a7797`. Chỉ cài một skill đã tùy chỉnh;
UPSTREAM.md ghi attribution và phần thay đổi. LICENSE giữ nguyên raw Git blob,
SHA256 `a37e0e9697144819e1d965176ac4ae5bc3fa02d11e7812036bbcadf6dafe2400`.

## Phạm vi thay đổi

- Payload canonical: `scripts/tooling/skill-overrides/subagent-driven-development/`
  gồm SKILL.md, LICENSE, UPSTREAM.md và năm reference; overlay discovery tại
  `using-agent-skills/SKILL.md`, `cavecrew/SKILL.md`.
- Entrypoint: `scripts/tooling/bootstrap.ps1`, `scripts/tooling/doctor.ps1`,
  `tooling-versions.json`; ba fixture trong `tests/tooling/`.
- Policy: project AGENTS.md, `docs/operations/agent-rule-workflow-tools.md`,
  note superseded trong ADR native Agent Skills và đúng block global stack
  tại `C:/Users/halal/.codex/AGENTS.md`.
- Hướng dẫn: [superpowers-codex.md](../operations/superpowers-codex.md), spec,
  plan, todo và STATE được đồng bộ trạng thái nghiệm thu.

Không đổi main model, concurrency, config.toml, persona hay thêm lifecycle hook.
Giữ Graphify, Serena, pnpm 12.3.4 và Impeccable đã nâng major trước đó.

## Verification thực tế

Các lệnh sau exit 0 trên current implementation:

```powershell
pwsh -NoProfile -File tests/tooling/global-stack-update-fixtures.ps1
pwsh -NoProfile -File tests/tooling/skill-compatibility-fixtures.ps1
pwsh -NoProfile -File tests/tooling/orchestration-fixtures.ps1
pwsh -NoProfile -File scripts/tooling/bootstrap.ps1 -Components Skills
pwsh -NoProfile -File scripts/tooling/doctor.ps1 -Mcp
```

PowerShell parser PASS. Skill quick_validate PASS cho ba overlay routing với
global Python và `-X utf8`; cần UTF-8 để đọc Vietnamese trên Windows.
Fixture kiểm payload/reference closure và chạy actual Install-GlobalSkills
với source giả trong thư mục tạm; chỉ stub source lookup và Graphify process
boundary. Bao phủ install hai lần, collision khi receipt thiếu/rỗng, lỗi
Graphify sau khi move và phục hồi đúng hash skills/references/receipt,
preflight thiếu reference/executable, cache bẩn/sai origin và pin không tồn tại.

Review độc lập đã tìm ba gap về ownership, preflight/rollback và source cache;
đã sửa, reviewer nghiệm thu lại: không còn Critical/Important finding.
Source clone/check pin trong staging trước swap; swap lỗi phục hồi cache cũ.
Nếu source mới đã verify nhưng bước stage skill sau đó lỗi, source cache mới
có thể được giữ cùng backup cũ; runtime skill chưa bị thay ở bước này.

Trước install, đối chiếu lại cả 163 file baseline: không drift.
Sau install, 147 file staged khớp hash đích. Trong 163 file cũ, đúng bốn file
đổi: cavecrew/SKILL.md, using-agent-skills/SKILL.md, global AGENTS.md và
managed-skills.json; 159 file còn lại giữ nguyên. Skill mới có tám file.
Hash config.toml giữ nguyên:
`164C501F5275099EB1147CE92CD932F06745FCF215A84C923093DF36E0C281D0`.

Doctor PASS, MCP Serena 23 tools, Graphify 10 tools, Chrome DevTools 29 tools.
Warning còn: Serena unsupported `.sql`, unknown `.png`, Graphify supplemental
cần restore và 151 non-code file cần semantic update; AST vẫn valid.
Không chạy semantic extraction hoặc viết semantic cache. Đây không phải
claim semantic index đã fresh.

Evidence local tại `.tmp/orchestration/superpowers-20260908/`: ba fixture log,
install.log, doctor-mcp.log, global-before.json, staging-hashes.json và
global-after-verification.json. Đây là artifact local, không thay report Git.

## Native smoke và acceptance

Evaluator native `orchestration_smoke` được yêu cầu Sol/high, fork none,
read-only. Đã xác nhận đọc đầy đủ skill, năm reference, DoD và rule áp dụng.
Evaluator tự dùng tool kiểm hai hash và receipt 55; main đối chiếu khớp:

- SKILL.md: `4064245C9C0507B2DA4406871D0CCBD5D709B32D2CA303B532511CA50952ABB3`.
- routing.md: `99CBBBFCB2B060CCA9D0A2BB93B14FA625C8E87C9C5B23F644F8C427E480D984`.

Main kiểm các quyết định trả về với spec/reference và nghiệm thu scoped:

| AC | Evidence và kết quả |
| --- | --- |
| AC1 | Case F giữ requirement/revision, constraint, decision, unknown và local-read authorization; lời ChatGPT thiếu evidence là UNVERIFIED. PASS scenario. |
| AC2 | Case A chọn solo cho label rõ/cục bộ, không coi một dòng auth là low-risk. PASS scenario. |
| AC3 | Case B cân nhắc Spark/medium trong catalog native giả lập; loại Spark chỉ có ở create_thread, không tạo task ẩn. PASS scenario; chưa chạy Spark thật. |
| AC4 | Case C từ chối fork all kèm override, resolve role pin trước dispatch; effective unknown. Lượt smoke thật gửi Sol/high và fork none. PASS scoped. |
| AC5 | Case B yêu cầu file/symbol, pattern, before/after, edge case, command/output cho route thấp. PASS scenario, không phải benchmark worker thấp. |
| AC6 | Case D dừng ba lần sửa thiếu evidence mới, xét tổng công sức; money/credits unknown. PASS scenario. |
| AC7 | Case E chỉ cập nhật worker A bị feedback, giữ evidence B độc lập. PASS scenario. |
| AC8 | Case E tuần tự/gộp ownership khi chung file; checkpoint không giao lại task accepted. PASS scenario. |
| AC9 | Case F không nhận worker PASS thiếu artifact/check; case D có breaker và escalation. PASS scenario. |
| AC10 | Actual install, baseline/hash proof, fixture rollback, independent review và MCP doctor ở trên. PASS runtime trong scope đã nêu. |

Evaluator cũng thực hiện Graphify query exit 0 và Serena context codex/LSP ready.
Lần query sau khi thêm report ghi 152 semantic file pending, tăng từ snapshot
doctor 151; không extraction. Các case A–F là đánh giá quyết định bằng skill
đã cài, không phải thực thi production của mọi nhánh điều phối.

## Backup và giới hạn

Backup thực tế:
`C:/Users/halal/.codex/tooling/backups/bootstrap-20260908T170422Z`.
Thư mục giữ skills cũ, shared references, receipt và user policy.
Rollback: dừng writer, đối chiếu baseline và thay đổi mới; move từng payload
đã thay vào nơi giữ riêng, restore từng target từ backup, gỡ skill mới khỏi
active scope bằng move, restore receipt và chỉ block policy đã thay.
Kiểm hash theo global-before.json và chạy doctor. Không chạy full bootstrap
để rollback, không ghi đè thay đổi phát sinh sau backup.

Catalog task đang mở chưa chứng minh tự refresh discovery; task mới có thể
nạp catalog mới, task hiện tại áp dụng bằng absolute path. Skill là workflow,
không mở thêm model mà native tool chưa hỗ trợ. Spark có trong catalog tạo
task riêng nhưng không callable qua native collaboration của lượt này.
Không dùng create_thread để lách giới hạn.

Theo [tài liệu subagents chính thức](https://learn.chatgpt.com/docs/agent-configuration/subagents),
inheritance và custom role có thể ảnh hưởng route. Runtime schema cụ thể vẫn
quyết định field/cặp được gọi. Requested route không chứng minh effective
backend; không có telemetry thì ghi unknown. Không có benchmark chi phí hoặc
bằng chứng mọi model/effort đã được chạy. Không chạy website suite vì delta
chỉ thuộc tooling/workflow. Không commit, push, deploy hoặc ghi Notion/memory.

## Chú thích thuật ngữ

- **Payload**: tập file skill thực sự được cài.
- **Receipt**: danh sách skill thuộc quyền quản lý của bootstrap.
- **Native smoke**: subagent thật đọc và áp dụng hợp đồng trong scope nhỏ.
- **AC**: điều kiện nghiệm thu đã duyệt trong spec.
- **Effective**: route thực thi có evidence runtime, khác route yêu cầu.
