# Checkpoint cleanup và release 24/09/2026

## Trạng thái

Cleanup, docs mapping, Impeccable extract và catalog154 ảnh đã commit local:
`da2f13a735319723ce7245771e63a37b6ee84711`. Commit
`fdbfcbd77a9aa279d31b9a3351d3741ba0d75e4a` nối lịch sử Sites bằng merge
giữ nguyên cây source, không force-push. Nhánh `codex/project-structure`.

Pre-commit đạt `Lean already. Ship.`. Hai pre-push review không đạt, cả hai
lệnh push exit1 trước khi truyền source. Chưa gọi save/deploy Sites; version1
vẫn là bản đã phát hành. Các kết quả dưới đây không phải full-site parity PASS.

## Cleanup đã thực hiện

- Gom1.267 file của ba thư mục test lịch sử vào
  `.tmp/legacy-parity-20260924/`, kiểm SHA từng file trước/sau; bỏ thư mục rỗng.
  Giữ ảnh nguồn, evidence và unrelated work.
- Cập nhật cây ownership tại [README](../../README.md), domain index tại
  [docs index](../index.md), rút [STATE](../STATE.md), giữ snapshot cũ cùng
  SHA trong [archive mapping](../archive/mapping.json). Kiểm local file link
  và heading anchor:0 lỗi; raw local evidence không tự đưa vào Git.
- Extract hai token màu media control, giữ giá trị UI. Gỡ helper không dùng,
  gom cleanup morph, bỏ workflow chỉ in thông báo khóa.
- Gỡ editor skeleton tạm khỏi public source/build. Giữ preset hiện hành;
  bản sao editor/test local tại `.tmp/retired-skeleton-devtools-20260924/`.
  LazySizes giữ theo [motion contract](../design/motion.md), không tự thay
  lifecycle tải ảnh ngay trước release.

## Evidence

- `pnpm install --offline --frozen-lockfile`, `pnpm prepare:site`,
  `pnpm qa:static`, `pnpm qa:worker:security` đạt trên bản source tách riêng.
  `pnpm audit --audit-level high`: không có advisory tại lần kiểm này.
- Node media/layout/static/lifecycle/skeleton37/37. Chromium smoke7/7;
  menu28 geometry,10 flow,2 text zoom; full-span VI/EN ngang/dọc/954px đạt.
- `node tests/site/advertising-return-p74.e2e.mjs`: Back/navbar/related return
  tại1567 và920px đạt; CTA/footer/reload tại1567 và390px đạt sau cleanup morph.
  Hero-once đạt delayed adapter,10 filter activations và locale/route return.
- [static-locales.test.mjs](../../tests/site/static-locales.test.mjs) xác minh
  22 HTML build bằng chính locale transform của preview. DevTools trên static
  file server mở COCO, ảnh tải được, không overflow/console error.
  Test này có consumer release thực tế; chưa chấp nhận đề xuất xóa nó.
- Archive `.tmp/release-site-20260924.tar`:285 file,34.624.512 byte,
  SHA256 `c8f2cca321564717e801ad6ca842ef1d25dacb6033875eebaa3ecea121f7da15`.
  Build từ commit `fdbfcbd`, chỉ chứa `.openai/hosting.json` và `.site-output/`.

## Finding pre-push chưa xử lý

GitHub review yêu cầu xóa7 standalone suites vì thiếu runner/docs reference và
cho là trùng coverage; gồm full-span, no-titles, suggestion conditional/info,
header bottom/single-line và static-locales. Cần phân loại theo contract trước
khi xóa: static-locales vừa chứng minh yêu cầu hosting mới, không phải test thừa.
Review còn đề nghị destructure options thay3 `Reflect.get`, bỏ helper `rounded`
lặp và bỏ `settingsHash` đã nằm trong artifact hash.

Sites review yêu cầu gỡ Swiper carousel không còn markup consumer, bỏ đọc/xóa
detail template trong build và bỏ diagnostic trỏ `src/site/products.js` đã xóa.
Các finding này chưa được triển khai; không coi hook rejection là lỗi runtime
đã tái hiện. Script parity có unrelated local edits nên phải tách diff cẩn thận.

Sau các vòng review từ chối, dừng sửa tiếp theo rule project. Giả định không còn
đúng: pre-commit PASS không bảo đảm cùng snapshot qua pre-push; phạm vi review
khác nhau đang đưa ra thêm yêu cầu cleanup. Không bypass hook hoặc xóa regression
chỉ để đạt chuỗi output của gate. Tiếp tục bằng việc đối chiếu từng finding,
giữ behavior/test có consumer, rồi review và push lại.

## Đối chiếu sau owner clarification

- Carousel giữ theo yêu cầu owner cho Residential/Commercial thiết kế lại;
  không activate hoặc áp contract Espacio cũ trong release này. Đã sửa nhãn
  lifecycle tại [components](../design/components.md#advertising-detail-carousel).
- Build không dùng nội dung template để render compatibility routes. Bỏ đọc
  và validation thừa, loại template ngay khi copy output; source template và
  regression compatibility vẫn giữ.
- Diagnostic filter đổi pointer `products.js` đã xóa sang catalog runtime
  hiện hành. Chỉ stage dòng này, giữ các edit parity khác ngoài release.
- Bỏ `settingsHash` trùng dữ liệu trong `artifactDataHash`; cache vẫn bao gồm
  settings. Bỏ helper `rounded` không có caller trong suggestion-layout test.
- Giữ bảy suite bảo vệ contract và thêm `pnpm qa:release-regressions` cùng
  [mapping assertion](../../tests/README.md#gate-regression-trước-release).
  Không đổi các nullish default trong layout validator chỉ để giảm số dòng.

Sau thay đổi: `pnpm prepare:site`, `pnpm qa:static` đạt; Node layout/lifecycle/
compatibility/static locale đạt 19/19; `pnpm qa:release-regressions` đạt 7/7
trên local server 8787. Lần chạy đầu chưa có server trả connection refused;
đã khởi động server rồi chạy lại trọn gate thành công.

## Backup trước deploy

Sites xác nhận version 1 gắn với commit
`85adc08077b75faf47249eb2a2a68ad9422deb3b`. Đã lưu 54 ảnh (6.512.727 byte) và
archive source riêng tại
[backup version 1](../../source-assets/site-backups/live-v1-20260924/README.md).
Mọi ảnh khớp SHA-256 với source commit; HTTP trực tiếp trả 403 nên không claim
đã đối chiếu byte runtime. Ảnh/archive backup giữ local, manifest và hướng dẫn
được lưu Git; backup không thuộc output deploy.

## Chú thích thuật ngữ

- **Checkpoint**: trạng thái đã xác minh để tiếp tục, không phải release hoàn tất.
- **Consumer**: code, luồng build hoặc kiểm tra thật sự dùng một artifact.
- **Pre-push**: gate Git chạy trước khi cập nhật remote.
- **Snapshot**: cây source cố định gắn với commit.
