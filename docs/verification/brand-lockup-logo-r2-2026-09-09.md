# Kiểm chứng brand lockup LOGO-R2

## Phạm vi và verdict

Ngày 2026-09-09, thực hiện LOGO-R2 trước GRID-R4 theo owner.
Contract duy nhất ở [DESIGN](../../DESIGN.md#brand-lockup--nguồn-chuẩn);
[frontend spec](../specs/frontend-brand-shell-responsive-runtime.md) giữ integration.
Source đã đổi; geometry 21/21, header 10/10, color 11/11 PASS.
Main nghiệm thu kỹ thuật LOGO-R2. GRID-R4 chưa triển khai.

## Thay đổi được kiểm

- Năm HTML route cấp cao, SVG standalone, `style.css`, `motion.js`: cập nhật
  lockup và menu CMYK-first. Giữ mark paths, chiều cao và vị trí navigation.
- `tests/site/site.e2e.cjs`: đo ink/cap theo CSS pixel; kiểm locale, dấu,
  header scale và lifecycle màu. Không coi SVG advance box là ink bounds.
- Main so tám source với backup dirty-worktree trước task; tất cả path `d`
  trong HTML/SVG giữ nguyên. Không có backup riêng test trước task, nên không
  gọi toàn bộ Git HEAD diff của test là diff thuộc task này.

## Evidence

Run local: `.tmp/orchestration/logo-r2-20260909-implementation/`.
Base URL: `http://127.0.0.1:8787`. Chạy từng flag trong process riêng; lưu
`latest.json` thành artifact riêng sau mỗi gate, tránh overwrite evidence.

| Gate | Command hoặc flag | Kết quả |
| --- | --- | --- |
| Build static | `pnpm prepare:site` | PASS |
| Static contract | `pnpm qa:static` | PASS |
| Geometry | `TT_E2E_BRAND_LOCKUP_ONLY=1` | 21/21 PASS |
| Header bbox | `TT_E2E_BRAND_HEADER_BBOX_ONLY=1` | 10/10 PASS |
| Color lifecycle | `TT_E2E_BRAND_COLOR_ONLY=1` | 11/11 PASS |

Các flag chạy bằng `node tests/site/site.e2e.cjs`, với `BASE_URL` như trên.
Geometry bao phủ chín viewport 320–1569px; VI/EN trên năm route tại mobile,
thêm EN desktop. Header kiểm endpoint, intermediate scale, navigation và
reduced motion. Xem `lockup.json`, `header-bbox.json`, `color.json` trong run.

Main mở preview trong app và xem desktop menu/mobile EN bằng browser thực.
Console không có error/warning trong lượt quan sát; stylesheet/font trả 200.
Font hiện lấy từ Google Fonts; không có migration font trong task này.
Ảnh desktop menu: `menu-desktop.png` trong run.

Impeccable detect trả 123 findings trên tám file; đối chiếu dirty baseline
không có finding trùng dòng source mới sửa (`detect-triage.json`). Đây không
phải verdict toàn site sạch lỗi. Font đã được owner giữ; các finding ngoài
delta không được sửa lan sang section khác.

### SHA256 tại nghiệm thu

| Path | SHA256 |
| --- | --- |
| `src/site/about/index.html` | `49accb3f450e6b54bb33e163ae5b0018e5572f131f850323737c2bc7d3a8d6a7` |
| `src/site/advertising-products/index.html` | `4e3938215e23bf35aa8b8a8455f3278991b0b5f0f876f0ccce1fb00441ba0e37` |
| `src/site/assets/brand/truong-thinh-lockup.svg` | `b6c55c290021a06ccf081c5862552de4fa0765559cc4aafb3707a23c22872c76` |
| `src/site/commercial/index.html` | `fddfc351d1383d63d4aa61c3a525eb3c78ce1d87699c2340b7f21adb0a8b5e75` |
| `src/site/index.html` | `d6dd223ff2677a9abb4def5c4756b8b465c645465bf0ee94123fdaced0b8f0ab` |
| `src/site/motion.js` | `9b1cdf25add4059a41d4ffb276fd4963bc49665f287b168a28e5cf64fa1334d2` |
| `src/site/residential/index.html` | `652f2e2f48c64173003789c53cfd8d20008ab25eed93a4118e8a5897dbdeb843` |
| `src/site/style.css` | `15179e90510ef68d05c6f94e3d2b6c0ebfa7212407e6a03c4441db48c3cc3001` |
| `tests/site/site.e2e.cjs` | `98e4eb5f61e2311725efdd362a417118ee5ac5d517ed1bd02948dbad0a1f23a8` |

## Review và giới hạn

Source/test worker requested Terra/high; reviewer độc lập Sol/medium;
effective model không quan sát được. Main giữ diff và nghiệm thu.
Verdict cuối reviewer: spec PASS, quality APPROVED; T1/T2/T3 ADDRESSED.
Notion card logo chuyển Done; GRID-R4 giữ Up next theo thứ tự owner.
Reviewer phát hiện hai lỗi test cũ: chờ class menu đã bỏ/reset đen và ID
section không tồn tại. Đã sửa; oracle interrupt cũng đã sửa và rerun PASS.
Probe độc lập cho thấy 450ms sau lệnh cuộn, scrollY vẫn 126px và header
đúng trạng thái collapsed/CMYK. Oracle mới chờ transition thực bắt đầu.
Không suy thời lượng reverse từ thời gian cuộn hoặc RGB đã làm tròn:
[CSS Transitions](https://drafts.csswg.org/css-transitions/#reversing) rút ngắn
reverse theo tiến độ easing, bắt đầu từ giá trị đang render.
Oracle cuối chờ đủ bốn transitionend, so duration thực với nominal duration
của chiều mới (sequence đổi delay/duration theo chiều), và kiểm start keyframe
liên tục với rendered fill. Không dùng mốc wall-clock 250–800ms của test cũ.
Một số skill/reference của source worker được bổ sung sau edit và đối chiếu
lại source; không tuyên bố toàn bộ đã đọc trước edit.

Full website/Espacio parity vẫn NOT PASS theo [verification index](index.md).
Không commit, push, deploy, mở CMS hoặc Graphify semantic extraction.
Owner spot-check carousel VI/EN vẫn mở, độc lập với card logo.

## Chú thích thuật ngữ

- **Ink bounds**: biên phần glyph thực vẽ, khác ô advance của ký tự.
- **Dirty baseline**: source trước task đã chứa thay đổi chưa commit.
- **Delta**: phần source thay đổi trong task được so với baseline riêng.
- **Effective model**: model runtime quan sát được, khác route yêu cầu.
