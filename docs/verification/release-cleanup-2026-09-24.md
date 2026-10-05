# Checkpoint cleanup và release 24/09/2026

## Trạng thái

Trạng thái cuối (25/09/2026): Sites version 2 đã deploy public, trạng thái
`succeeded`, từ GitHub source `0654dca` và Sites mirror `557da5a`; xem
[release static-only](#release-static-only-25092026). Full-site parity vẫn
`NOT PASS`. Các đoạn dưới giữ trình tự checkpoint lịch sử.

Cleanup, docs mapping, Impeccable extract và catalog154 ảnh đã commit local:
`da2f13a735319723ce7245771e63a37b6ee84711`. Commit
`fdbfcbd77a9aa279d31b9a3351d3741ba0d75e4a` nối lịch sử Sites bằng merge
giữ nguyên cây source, không force-push. Nhánh `codex/project-structure`.

GitHub đã nhận `097be1aa02e2244c0b225b0b8fda6f2ee2273e5d` sau khi pre-push
đạt `Lean already. Ship.`; `git ls-remote` xác nhận đúng SHA. Các lần review
trước bị chặn đã được xử lý theo evidence dưới đây. Checkpoint `494035b` cũng
đã push GitHub. Sites pre-push tiếp tục bị chặn; chưa gọi save/deploy,
version1 vẫn là bản đã phát hành. Không claim full-site PASS.

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

## Review tiếp theo

Commit `5e24a10` qua pre-commit nhưng pre-push phát hiện thêm ba API chỉ có test
caller: `resolveAdvertisingSpan`, `selectSkeletonFlowPreset` và CPU sampler
`sampleSkeletonFlowColor`. Đã đối chiếu toàn repo, gỡ API cùng assertion chỉ
kiểm chính API đó; giữ kernel layout, batch allocator và WebGL renderer thật.
Node layout/skeleton đạt 17/17 sau thay đổi; shader GLSL và preset không đổi.
Build đạt; browser return P7.4 đạt Back/navbar/related tại 1567 và 920 px,
CTA/footer/reload cùng mép skeleton tại 1567 và 390 px sau cleanup này.

Plugin Sites từng thiếu thư mục skill/script lúc chuẩn bị deploy, sau đó đã có
lại. Quy trình chính thức đã mở checkout riêng tại commit `097be1a`; build và
static contract đạt. Checkout dùng dependency hiện có qua junction local,
không đưa unrelated work hoặc backup ảnh vào output.

Lần push Sites từ checkout riêng exit1 tại hook với thông báo
`Ponytail review found removable complexity`. Workflow chỉ trả stderr khi push
lỗi, còn finding chi tiết nằm trên stdout; hook xóa transcript/result tạm ở
finally nên chưa thu được toàn bộ finding cuối. Không suy đoán danh sách cần
xóa từ log tiến trình. Cần khôi phục báo cáo đầy đủ trước sửa tiếp. GitHub
review phạm vi từ `a8ba94e`, Sites từ version1 `85adc08`; hai kết quả không
thay thế nhau. Source Sites chưa cập nhật, không có deployment mới.

## Finding Sites đã khôi phục

Review lại đúng dải `85adc08..097be1a`, giữ stdout tại
`.tmp/sites-review-recovery.txt`, trả tám finding. Đã đối chiếu consumer:
generic/pilot runner cũ trong `run-motion-audit.mjs` không được CLI gọi;
`runCliV2` là entrypoint hiện hành. Hai biến `auditPath`, các helper
`groupSpec`, `replacePhaseBSection`, `streamCsvAtomic`, `stableTargets` không
có caller. Đã gỡ chúng, giữ runner/writer hiện hành và mọi test contract.
Ba option trong `validateAdvertisingCards` đọc trực tiếp, giữ `??` và các
mặc định `[]`, `true`, `false`; không đổi geometry hoặc motion.

Bốn script diagnostic qua self-test trước và sau; Node layout đạt 16/16.
Hai script có unrelated local edits được stage bằng patch riêng từ HEAD,
không đưa các thay đổi đó vào release. Đây không phải chạy lại full parity.

## Backup trước deploy

Sites xác nhận version 1 gắn với commit
`85adc08077b75faf47249eb2a2a68ad9422deb3b`. Đã lưu 54 ảnh (6.512.727 byte) và
archive source riêng tại
[backup version 1](../../source-assets/site-backups/live-v1-20260924/README.md).
Mọi ảnh khớp SHA-256 với source commit; HTTP trực tiếp trả 403 nên không claim
đã đối chiếu byte runtime. Ảnh/archive backup giữ local, manifest và hướng dẫn
được lưu Git; backup không thuộc output deploy.

## Bổ sung trước đợt phát hành tiếp theo

Owner chọn ảnh portal Advertising tông xanh dương từ bộ cuối tạo bằng ChatGPT
web. Bản nguồn và WebP public có SHA, pixel và provenance tại
[ảnh portal](../../source-assets/projects/advertising/portal-20260924/README.md).
Portal giữ 1086 × 1448 px, alt VI/EN, overlay và motion cũ; browser xác nhận
ảnh tải với `naturalWidth=1086` ở 390 và 1440 px. Hai viewport này không
thay thế kiểm tra trực quan của owner.

Regression `advertising-hero-once.e2e.mjs` đạt: route-return VI/EN có word
stagger 0,2 giây; filter và locale trong cùng container không replay. Static
contract và 17 layout/lifecycle test đạt. Full `qa:site` được dừng sau khi
ghi nhận nhiều failure ngoài phạm vi (ảnh catalog tải lỗi từng lần, menu và
hero các route khác); không công bố full-site PASS. Các failure này cần audit
riêng, không dùng kết quả focused để phủ nhận chúng.

Pre-push review Sites trên diff từ version1 chặn thêm hai đoạn diagnostic:
SHA/CSV trùng trong năm script và wrapper gán lại `writeRuntimeReport`. Đã gom
IO thuần vào `scripts/tooling/layout-motion-io.mjs` và đưa guard vào hàm gốc.
Không đổi nguồn trang, CSS, motion runtime hoặc dữ liệu báo cáo. Syntax của sáu
module và self-test của năm script diagnostic đạt; `generate-layout-motion-parity`
đọc hai CSV local trong checkout riêng và đạt 22 kiểm tra.
Lượt review sau gỡ thêm hai `Reflect.get` dùng trên property cố định ở motion
bootstrap và tham số test; static contract được cập nhật để nhận cách đọc mới.
Build/static ở checkout sạch và regression hero route-return VI/EN đạt; không
đổi điều kiện reveal hay assertion.

## Tiếp tục tách website và test

Checkpoint này thay trạng thái release đang mở ở đầu tài liệu; các mục trước
giữ ngày và phạm vi evidence lịch sử.

- `git ls-remote origin refs/heads/codex/project-structure` xác nhận GitHub tại
  `9b50e323ad1c40acbcc3341da8c135e3f18e7e8a`. Source website không đổi trong
  lượt tiếp tục; các edit tooling, test và ảnh nguồn khác giữ ngoài scope commit.
- Cây project đã tách website ở `src/site/`, kiểm thử ở `tests/`, build ở
  `.site-output/`, dữ liệu nguồn ở `source-assets/`; không cần move lại source.
  Contract GitHub/Sites được ghi tại [static release](../specs/static-release.md),
  [architecture](../architecture/index.md) và [ADR](../decisions/sites-artifact-only-release-mirror.md).
- Checkout `.tmp/sites-static-publish-20260924/` vẫn có HEAD version 1
  `85adc08077b75faf47249eb2a2a68ad9422deb3b`. Index mới có 286 file:
  285 file `dist/` và một `.openai/hosting.json` trỏ `dist`.
  So sánh đệ quy từng file với `.tmp/release-publish-20260924/.site-output/`
  đạt bằng nhau từng byte; không có test, docs, tooling, research hoặc CMS.
  `pnpm qa:static` đạt. Không chạy lại full parity cho thay đổi Markdown.
- Sites `get_site` xác nhận audience public, version 1. Chưa có mirror commit,
  archive mới, saved version hoặc deployment thành công; không dùng archive cũ
  trỏ `.site-output/` cho mirror mới trỏ `dist/`.
- Blocker hiện tại: package local
  `C:/Users/halal/.codex/plugins/cache/openai-curated-remote/sites/0.1.71/`
  đã biến mất sau khi đọc skill. Tìm `site-workflow.mjs` trong toàn bộ plugin
  directory không có kết quả. Connector vẫn callable; không suy ra workflow
  local còn đủ. Cần khôi phục plugin, dùng workflow chính thức, chạy Git hooks
  và chỉ ghi deploy xong khi Sites trả `succeeded`.

Graphify structural query đạt, 258 semantic file pending; không chạy semantic
extraction. Serena đã activate đúng project với context Codex. Không cập nhật
Notion card trong lượt này.

## Release static-only 25/09/2026

Source `0654dca286cdc029b1a44eaed0b5c2cc4207007c` đã qua pre-commit và
pre-push, được đẩy lên GitHub nhánh `codex/project-structure`. Build loại 17
file source-only không có consumer trong static runtime, gồm module catalog,
media, manifest, JSON nguồn, SVG brand và WebP không được tham chiếu. Các file
gốc, test, script và docs vẫn thuộc GitHub theo
[contract static release](../specs/static-release.md).

Checkout sạch tại source SHA trên tạo 268 file `.site-output/`; so sánh SHA-256
từng file với mirror `dist/` đạt 268/268. `pnpm qa:static` và hai test static
locale/Advertising đạt. Regression release 7/7 và Chromium local route
Advertising 39 request HTTP 200, không console error, đã đạt trước lần loại ba
module source-only cuối; lần cuối không chạy lại full-site parity.

Mirror `557da5a2582759ace0e17fe46e04d956542b91d0` đã qua pre-commit và
pre-push, được đẩy lên Sites source `main`. Cây Git của mirror chỉ có 268 file
`dist/` và `.openai/hosting.json`, không có test, docs, script, CMS hoặc cache.
Archive `.tmp/sites-static-0654dca-20260925.tar` có 269 file, giải nén và
so sánh byte với mirror đạt 269/269; SHA-256
`BC18BBD3A121F8708DA2F5E448A9C0D887A4AA05498DDF29D3FE1D5E03F5FA91`.
Archive local là generated và không commit GitHub.

Sites lưu version 2
`appgprj_6a8c35ca1cf08191aa996a0e5e997bc6~appgver_7a3ef151a284819189996bd02bf4a402`
từ đúng mirror SHA rồi deploy
`appgdep_6ab5a88ab40c81919050bb65ae9f03b3` với trạng thái `succeeded`.
Audience vẫn `public`. [Live site](https://truong-thinh-noi-that.potato240794.chatgpt.site/vi/)
trả HTTP 200 tại `/vi/`, `/vi/advertising-products/` và `/en/` sau deploy.
Đây là bằng chứng release static và smoke HTTP; không đổi trạng thái full-site
parity `NOT PASS` hoặc thay owner visual acceptance.

## Chú thích thuật ngữ

- **Checkpoint**: trạng thái đã xác minh để tiếp tục, không phải release hoàn tất.
- **Consumer**: code, luồng build hoặc kiểm tra thật sự dùng một artifact.
- **Pre-push**: gate Git chạy trước khi cập nhật remote.
- **Snapshot**: cây source cố định gắn với commit.
- **Mirror**: repository riêng chỉ giữ artifact website và manifest để Sites phát hành.
