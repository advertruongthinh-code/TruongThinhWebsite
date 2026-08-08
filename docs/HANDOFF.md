# Handoff

Checklist này dành cho solo developer hoặc agent tiếp theo. Không coi trạng thái
trí nhớ là bằng chứng; kiểm tra file và report thực tế trước khi sửa.

## Start here

1. Đọc:
   - `README.md`
   - `AGENTS.md`
   - `PRODUCT.md`
   - `docs/MOTION-MAP.md`
   - `docs/CONTENT-MEDIA-GUIDE.md`
   - `docs/memory/CURRENT.md`
   - `docs/memory/DECISIONS.md`
2. Kiểm tra phạm vi file được giao và thay đổi đang có; không hoàn nguyên việc
   của người khác.
3. Nếu `graphify-out/graph.json` tồn tại và câu hỏi liên quan kiến trúc:

   ```powershell
   & ".\.tooling\python\Scripts\graphify.exe" query "câu hỏi cụ thể"
   ```

4. Chỉ dùng `rg` để xác nhận mã có scope sau graph query.

## Run locally

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Mở:

- `http://127.0.0.1:4173/`
- `http://127.0.0.1:4173/nha-o/`
- `http://127.0.0.1:4173/kinh-doanh/`
- `http://127.0.0.1:4173/quang-cao/`
- `http://127.0.0.1:4173/gioi-thieu/`

## Before changing UI

- Giữ root là website canonical.
- Tái dùng `style.css`, `motion.js`, `detail.css`, `detail.js`.
- Không tách một fork CSS/JS riêng nếu chưa có lý do kiến trúc.
- Giữ process:
  **Khảo sát → Tư vấn → Sản xuất → Lắp đặt**.
- Bổ sung VI/EN cùng lúc, gồm title, description, copy, alt và aria.
- Trước khi sửa copy/media, đọc `docs/CONTENT-MEDIA-GUIDE.md`; thứ tự bảo trì
  hiện tại là `/quang-cao/` → `/kinh-doanh/` → `/nha-o/`.
- Không dùng khuôn mặt nhận diện; ngoại lệ duy nhất là
  `assets/site/expanded/legacy-team.webp`.
- Xanh/cam chỉ là accent.

## Verification gate

Theo [tests/README.md](../tests/README.md), sau khi server chạy:

```powershell
node tests/site.e2e.cjs
```

Latest verified source run: `48/48` pass, `0` fail,
`tests/reports/latest.json` generated `2026-07-30T20:17:54.259Z`. Luôn chạy lại
nếu source mới hơn report.

Nếu cần runtime Node được đóng gói:

```powershell
$env:NODE_PATH = "C:\Users\halal\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules"
node tests/site.e2e.cjs
```

Không bàn giao production-ready cho đến khi:

- Năm route trả 200.
- Matrix 320/390/768/1024/1440 không overflow ngang.
- Console/network sạch.
- Ảnh tải sau stepped scroll.
- VI/EN đổi và giữ qua reload.
- Menu focus, filters, gallery và CTA hoạt động.
- Back/Forward/BFCache cleanup và home masks/project hover hoạt động.
- Reduced motion không ẩn nội dung.
- Chrome DevTools desktop/mobile đã kiểm tra visual, a11y tree, console và
  network.

Ghi rõ report path và failure còn lại; không gọi report cũ là kết quả mới.
Runtime inspection gần nhất cho menu `390/1440`, focus return và motto/mask
mobile nằm trong [AUDIT.md](AUDIT.md); không suy rộng kết quả đó thành kết luận
performance/a11y mới.

## Graph maintenance

Sau code change, để hook đánh dấu dirty và coalesce update. Chỉ dùng lệnh này
khi recovery hoặc cần xác minh thủ công:

```powershell
& ".\.tooling\python\Scripts\graphify.exe" update .
```

Graph hiện tại được tạo local, không dùng LLM; code AST là nền và incremental
update có thể giữ heading/link Markdown. Nếu cần quan hệ semantic cho docs/ảnh,
ghi `semantic update required`.

Tích hợp Codex và git hook đã được cài bằng Graphify CLI:

```powershell
& ".\.tooling\python\Scripts\graphify.exe" hook status
.\scripts\graphify-watch.ps1
```

Watcher chạy foreground; dừng bằng `Ctrl+C` và không mở bản thứ hai nếu terminal
hoặc editor khác đã watch repo.

## Reference archive

Source/media public của web tham khảo dùng cho nghiên cứu nằm tại
`reference-audit/web-reference/archive/`, không phải runtime dependency. Cập nhật
archive bằng:

```powershell
node --test reference-audit/web-reference/archive/crawler.test.mjs
node scripts/archive-reference.mjs --origin <url>
```

Kiểm tra `manifest.jsonl` và README trong archive trước khi gọi crawl hoàn tất.

## Owner data still required

Không tự thay placeholder. Cần chủ dự án xác nhận:

- URL/số Zalo production.
- Địa chỉ trụ sở.
- Năm thành lập chính xác.
- Chính sách và thời hạn bảo hành.

## Release checklist

- [ ] Owner facts đã được xác nhận và thay đồng bộ ở mọi route.
- [ ] Không còn `https://zalo.me/` placeholder.
- [ ] Alt/aria/title/description VI/EN đầy đủ.
- [ ] Process order đúng ở mọi route.
- [ ] Ảnh không có logo, text giả, watermark hoặc mặt nhận diện ngoài ngoại lệ.
- [ ] `tests/reports/latest.json` là kết quả của source hiện tại và toàn bộ pass.
- [ ] DevTools console/network/a11y sạch ở desktop và mobile.
- [ ] Graphify đã update hoặc handoff ghi semantic update còn thiếu.
- [ ] Graphify project-local `hook status` xác nhận post-commit/post-checkout và merge driver.
- [ ] `docs/memory/CURRENT.md` phản ánh trạng thái mới.
- [ ] Quyết định mới được append vào `docs/memory/DECISIONS.md`.

## Handoff template

```markdown
### Outcome
- Kết quả người dùng nhìn thấy

### Files
- path — thay đổi

### Verification
- command — pass/fail
- DevTools viewport — quan sát

### Pending
- blocker/TODO — owner

### Graphify
- updated / semantic update required / not applicable
```
