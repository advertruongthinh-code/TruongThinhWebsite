# Sol Advisor

Sol Advisor 0.6.0 là optional user-global plugin dùng Codex-native selective
routing. Bản này không có MCP, saved preference, setup interview hoặc Bun runtime.

## Scope và path

| Location | Ownership |
| --- | --- |
| `~/.codex/tooling/vendor/sol-advisor/` | Pinned global plugin source |
| `~/.codex/tooling/bin/jq.exe` | Pinned `jq` cho upstream verifier |
| `~/.codex/tooling/state/sol-advisor.json` | Global install receipt |
| `~/.codex/agents/sol-advisor-*.toml` | Ba user-global native role |
| `tooling-versions.json` | Portable project pin và upstream URL |

## Cài hoặc repair plugin

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/tooling/install-sol-advisor.ps1
```

Installer verify pinned commit và manifest 0.6.0, chạy upstream `verify.sh`, cài
ba native role bằng `install-agents.sh --check`, rồi register global plugin.
Verifier Windows cần Git Bash, `jq`, `python3`, `shasum` compatibility và quyền
tạo native symlink. Nếu policy chặn riêng symlink test, không gọi full PASS; chỉ
dùng `-SkipTests` sau khi ghi exact blocker và chạy agent exact-check riêng.

## Selective routing upstream

Primary task phải là `gpt-5.6-sol` với reasoning `high`. Trước task tool đầu
tiên, skill phát `SELECTIVE ROUTE` có mode và risk cụ thể:

| Mode | Execution |
| --- | --- |
| `solo` | Mặc định; root plan, implement, test, self-review |
| `delegate` | Một Luna/max cho bounded work hoặc Terra/high cho high-risk work |
| `audit` | Root implement; một fresh Sol/high reviewer read-only |
| `full` | Một implementer rồi fresh Sol review; chỉ broad/high-risk exception |

Không fallback hoặc substitute model/role khi metadata thiếu, conflict hoặc
không quan sát được. Reviewer chỉ được gọi enforced read-only khi runtime
evidence xác nhận sandbox tương ứng.

## Cách dùng và giới hạn

Sau khi đổi plugin cache hoặc native role, đóng task đang giữ Sol Advisor cũ và
start task mới. Source/vendor đúng version chưa chứng minh cache đã reload;
`codex plugin list --json` phải báo 0.6.0 và agent type mới phải xuất hiện.

## Chú thích thuật ngữ

- **Selective routing**: chọn một đường thực thi theo risk trước task tool.
- **Pinned**: version hoặc commit được khóa để tái lập.
- **Fail-closed**: không đủ điều kiện thì dừng, không dùng fallback.
- **Read-only isolation**: môi trường advisor chỉ được đọc theo yêu cầu đã đặt.
