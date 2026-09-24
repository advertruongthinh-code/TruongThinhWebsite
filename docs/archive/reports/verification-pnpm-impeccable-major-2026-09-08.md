# Migration major pnpm và Impeccable

Ngày kiểm chứng: 2026-09-08. Scope: tooling project và user-global được owner yêu
cầu nâng major; giữ Graphify và các quyết định giao diện. Không commit, push,
deploy hoặc cài skill điều phối mới.

## Kết quả

| Thành phần | Trước | Sau |
| --- | --- | --- |
| pnpm project và global tooling | 11.24.0 | 12.3.4 |
| Impeccable npm CLI | 3.6.0 | 4.0.4 |
| Impeccable skill | 4.1.2 | 4.2.2 |
| Impeccable engine | JavaScript detector | Binary 0.1.3 |

CLI và skill cùng release commit
`f64da20b07271b760e4e3133eef3b87942860f11`, tương ứng tag `cli-v4.0.4` và
`skill-v4.2.2`. Nguồn: [pnpm 12](https://github.com/pnpm/pnpm/releases/tag/v12.0.0),
[Impeccable CLI 4](https://github.com/pbakaus/impeccable/releases/tag/cli-v4.0.0),
[CLI 4.0.4](https://github.com/pbakaus/impeccable/releases/tag/cli-v4.0.4),
[skill 4.2.2](https://github.com/pbakaus/impeccable/releases/tag/skill-v4.2.2).

## Compatibility đã xử lý

1. `package.json` và `tooling-versions.json` pin pnpm 12.3.4. Global Node package
   cũng nhận `packageManager` từ cùng pin trong bootstrap. Corepack default đã
   provision bản mới; project khác có pin riêng vẫn dùng bản của project đó.
2. Bootstrap đổi `--frozen-lockfile=false` thành `--no-frozen-lockfile` vì CLI mới
   từ chối cú pháp cũ. Global Node không còn dùng `--no-optional`: engine của
   Impeccable nằm trong optional package theo platform. Project giữ frozen install.
3. Install đầu gặp `ERR_PNPM_PACKAGE_MANAGER_REMOVE_MODULES_DIR` trên layout
   `node_modules` cũ. Đã kiểm exact path, chuyển folder cũ vào backup cùng ổ đĩa
   rồi cài lại; không sửa ACL hoặc dừng process của task khác.
4. Lockfile thêm YAML document cho binary package-manager pnpm; phần lockfile
   application phía sau giữ nguyên. Không nâng GSAP, Swiper, Masonry hoặc LazySizes.
   CI dùng `pnpm/action-setup@v4` lấy pin từ package.json, Node 22 và frozen install;
   không cần hardcode version thứ hai trong workflow. Hosted CI chưa chạy.
5. pnpm mới kiểm release-age cả lockfile global. Pin Chrome DevTools MCP 1.9.0
   đã được review/cài ở đợt trước nhưng phát hành `2026-09-08T09:50:47Z`, chưa đủ
   một ngày. Global `node/pnpm-workspace.yaml` có ngoại lệ chính xác
   `chrome-devtools-mcp@1.9.0`; các package khác giữ kiểm tra mặc định. Ngoại lệ
   này có thể bỏ sau khi bản đó đủ tuổi; không thêm ngoại lệ vào project.

Skill mới thay script Node bằng `scripts/impeccable.cmd` trên Windows. Launcher
đã tải engine được kiểm SHA-256 vào `C:\Users\halal\.impeccable\bin\0.1.3`.
Binary đó và binary từ npm optional package có cùng SHA-256:
`50846da00b48f7df5a82adc6c1ef1c82da0a890ac95e65cdd5da12aab2de6c1d`.
Không cài Codex lifecycle hook. Bootstrap Skills giữ 54 managed skill và ba
compatibility overlay đã chấp nhận trước đó.

## Evidence

| Check | Kết quả |
| --- | --- |
| `pnpm --version` | 12.3.4 |
| Project `pnpm install --frozen-lockfile` | PASS |
| Global Node frozen install | PASS với ngoại lệ exact pin nêu trên |
| `pnpm prepare:site`, `pnpm qa:static` | PASS |
| `pnpm qa:cross-browser` | 21/21, Chromium/Firefox/WebKit, 30.2 giây |
| Global stack và skill compatibility fixtures | PASS; PowerShell parse PASS |
| `bootstrap.ps1 -Components Node`, `-Components Skills` | PASS; Node chạy lại không đổi dependency |
| `doctor.ps1 -Mcp` | PASS; Serena 23, Graphify 10, Chrome DevTools 29 tool |
| CLI `--version`, hai launcher `engine-probe` | 4.0.4; engine 0.1.3 |
| Skill launcher `context --target src/site/detail.css` | PASS, đọc PRODUCT và trả resolved context |
| `detect src/site/detail.css --json` | Một `overused-font` ở dòng 1588; giữ Plus Jakarta Sans theo accepted parity |
| pnpm 11 rollback probe ở folder riêng | Frozen install 11 package PASS; Playwright 1.63.0 resolve được |
| Protected configuration SHA-256 | Global config/AGENTS, project Codex/Serena giữ nguyên |

Browser suite dùng local static server cổng 4189; không phải production. Hosted
Linux CI và full Espacio parity không được xác nhận bởi các check này.

Doctor Impeccable trả `product-schema-legacy` cho PRODUCT.md, severity `route`.
[Doctor reference của bản đã pin](https://github.com/pbakaus/impeccable/blob/f64da20b07271b760e4e3133eef3b87942860f11/.agents/skills/impeccable/reference/doctor.md)
quy định `init` thu thập dữ kiện còn thiếu; không viết lại từ suy luận. Chưa chạy
interview/init hoặc thay nội dung sản phẩm. Đây là giới hạn migration context,
không phải lỗi launcher/detector.

Graphify còn 137 non-code file chờ semantic; không chạy extraction. Doctor cũng
báo supplemental cần restoration, `.sql` unsupported và `.png` unknown trong
Serena. Structural query và MCP vẫn chạy; không coi semantic index là fresh.

## Backup và rollback

Global backup: `C:\Users\halal\.codex\tooling\backups\major-update-20260908`.
Nơi này giữ snapshot project trước major, global package/lockfile, protected
hashes và `global-node_modules`. Skill/source/reference trước update ở
`C:\Users\halal\.codex\tooling\backups\bootstrap-20260908T154238Z`.
Project module cũ ở `.tmp/tooling-major-20260908/node_modules-before-pnpm12`.

Khi cần rollback, kiểm diff phát sinh sau migration trước; chỉ phục hồi các file
tooling của snapshot tương ứng. Provision lại `pnpm@11.24.0`, phục hồi global
package/lockfile cũ rồi cài dependency; phục hồi skill/source/reference từ backup
đúng bản. Không chép toàn bộ snapshot project lên những thay đổi mới của owner.
Đường pnpm 11 đã thử bằng frozen install riêng; chưa rollback toàn global stack
vì runtime mới đã pass. Các backup node_modules chứa junction nên ưu tiên cài lại
từ manifest/lockfile thay vì chạy trực tiếp trong folder backup đã đổi vị trí.

## Chú thích thuật ngữ

- **Major**: phiên bản có thể yêu cầu thay đổi consumer.
- **Engine**: binary thực thi các lệnh của Impeccable.
- **Frozen install**: cài theo dependency đã khóa, không tự giải version ứng dụng mới.
- **Release-age**: chính sách giới hạn package vừa phát hành.
- **Rollback probe**: kiểm đường quay lại trong folder riêng, không hạ runtime đang dùng.
