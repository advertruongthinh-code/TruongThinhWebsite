# Vận hành Graphify

Graphify 0.9.53 ở user scope. Đây là runbook setup/repair, không phải checklist
mỗi task. Normal task chỉ query wrapper; Git hook, watcher và wrapper sở hữu
structural freshness. Codex lifecycle hook bị disabled.

## Normal task

```powershell
& ".\scripts\tooling\invoke-graphify.ps1" query "specific architecture question"
& ".\scripts\tooling\invoke-graphify.ps1" path "source" "target"
& ".\scripts\tooling\invoke-graphify.ps1" explain "node"
```

Wrapper block query khi structural refresh fail, report semantic lag riêng. Dùng
Serena sau Graphify cho exact symbol, reference, diagnostic, refactor.

Khi **Graphify: Watch** đang chạy và đã xử lý save gần nhất, query graph hiện có
mà không tranh refresh lock:

```powershell
& ".\scripts\tooling\invoke-graphify.ps1" -SkipAstRefresh query "specific architecture question"
```

`-SkipAstRefresh` chỉ bỏ bước structural refresh của wrapper. Graph phải tồn tại;
semantic warning và command Graphify vẫn chạy. Không dùng switch khi chưa có
watcher hoặc chưa chắc save gần nhất đã được watcher xử lý.

## Setup hoặc repair

Chỉ clone, approved repair hoặc đổi pinned version:

```powershell
pnpm tooling:bootstrap
```

Inspect/repair official repository hook:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/tooling/graphify-git-hooks.ps1 -Action install
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/tooling/graphify-git-hooks.ps1 -Action status
```

Status kỳ vọng có `post-commit: installed`, `post-checkout: installed` và
`merge driver: registered`. Graphify quản lý các file này; không edit thủ công
`.git/hooks/post-commit` hoặc `.git/hooks/post-checkout`. Chỉ remove các hook được
quản lý bằng:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/tooling/graphify-git-hooks.ps1 -Action uninstall
```

## Theo dõi edit đang hoạt động

Monitoring tùy chọn: trong VS Code chạy **Tasks: Run Task** → **Graphify: Watch**,
hoặc dùng wrapper từ terminal:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/tooling/watch-graphify.ps1
```

Giữ task terminal mở và nhấn `Ctrl+C` để dừng. Watcher và Git hook build lại
structural AST graph cho code change mà không cần LLM.

Agent không dừng watcher để query. Sau khi watcher xử lý save, agent dùng
`-SkipAstRefresh` theo mục Normal task.

## Corpus project content

`.graphifyignore` gồm meaningful non-media project content như source, Markdown,
spec, ADR, configuration, SQL, HTML, JSON, YAML, PDF và Office document. Nó loại
image, video, audio, font, generated output, runtime state, vendor tree và raw
reference archive.

Upstream watcher và Git hook của Graphify cố ý ignore semantic document change.
Khi `graphify-out/needs_update` tồn tại hoặc wrapper báo semantic file pending,
hãy report chúng. Chỉ chạy incremental semantic pipeline của skill `graphify` sau
khi user explicit request semantic build/update. Không tự động spawn semantic
worker, merge chunk hoặc ghi semantic cache/manifest state. `graphify update .`
thường chỉ update code.

Graphify 0.9.53 detect ba project JSON file như code nhưng không emit AST node
cho chúng. `scripts/tooling/graphify-supplemental-files.txt` là minimal allowlist đã
verify. Shared query boundary restore semantic cache fresh của chúng sau
upstream update. Cache stale chỉ tạo semantic warning; AST query vẫn chạy và
không ghi cache/manifest. Chờ user authorize semantic extraction. Không mở rộng allowlist nếu chưa
reproduce được zero-AST case.

## Khắc phục sự cố

- Thiếu executable global: chạy `pnpm tooling:bootstrap`.
- Hook status không đầy đủ: chạy lại `-Action install`; wrapper scope
  safe-directory override của Git vào Graphify process.
- Watcher idle: save supported code file và inspect dedicated terminal; filesystem
  event có debounce.
- Query đụng refresh lock khi watcher active: đợi watcher xử lý save, rồi gọi
  wrapper với `-SkipAstRefresh` trước command.
- Document pending: report chúng; chờ user explicit request trước khi chạy
  Graphify semantic pipeline.
- Supplemental restore bị block: report ba path trong
  `scripts/tooling/graphify-supplemental-files.txt`; chỉ refresh semantic sau
  user approval, rồi chạy lại wrapper.
- Git-hook log: `%USERPROFILE%\.cache\graphify-rebuild.log`.

Nếu command vẫn fail, kiểm tra pinned upstream Graphify README và release tương
ứng trước khi thêm workaround:
<https://github.com/Graphify-Labs/graphify/tree/33362d969292b57eda82f3fbd9eb5f3f5bc9bbc2>.

## Chú thích thuật ngữ

- **Structural AST**: graph cấu trúc source để truy vấn quan hệ mà chưa cần LLM.
- **Semantic pipeline**: pipeline trích xuất ý nghĩa từ tài liệu.
- **Allowlist**: danh sách path được phép xử lý.
- **Fail closed**: gặp điều kiện không an toàn thì dừng thay vì tự đoán.
- **Watcher**: tiến trình theo dõi thay đổi file và trigger refresh.
- **Repair**: khắc phục tool đã lỗi, không phải bước thường nhật.
