# M02b Advertising — checkpoint PARTIAL 2026-10-03

- Status: **PAUSED / NOT ACCEPTED**; main đã kích hoạt quota STOP ngày 03/10.
  M02b chưa hoàn tất, không có M02b GREEN. Chỉ checkpoint/handoff wrap-up được mở.
- Scope: riêng `advertising-products` và `?photo=` detail con VI/EN.
  M06/M07 chưa mở; M03–M05 và full-site M08–M09 PAUSED. Không commit/push/deploy
  hoặc resume recovery/P11.
- Owner đã xác nhận marker latest closed chung main/related, scroll riêng
  từng history entry ở mọi grid `≤1 CSS px`, không extra entry/autoscroll;
  hidden DOM cleanup và tối đa một marker trên grid đang nhìn thấy.
- Main kiểm quota chung `300` phút: used `94%`, remaining `6%`,
  `resetsAt=1791007693`; dưới ngưỡng `10%`. Production/QA/automation đã dừng.
  [Claude AI handoff riêng](site-media-card-m02b-claude-handoff-2026-10-03.md)
  được tạo sau exact5 checkpoint packet này. Physical Samsung A05/A05s skipped/unverified theo
  owner; iPhone và owner visual vẫn mở. Simulation không thay evidence thiết bị.

## Environment và candidate

Worktree: `C:\Users\halal\.codex\worktrees\mobile-ui-contract\TruongThinh-Website`.
HEAD: `e6cf065161cb19a8b59dd9efa8cda5d4af27fba1`; preview local
`http://127.0.0.1:8792`. Requested route `gpt-6.1-sol/xhigh`; effective unknown.

[Freeze marker](../../.tmp/site-media-card/m02b-related-20261003T035741327Z/freeze-marker.json)
ghi UTC `2026-10-03T04:10:12.9759567Z`, build exit `0`. Main đã kiểm tám
hash source/output/served-freeze và ba hash/byte của tracking v2 khớp.

| Artifact | SHA-256 |
| --- | --- |
| Runtime source/output/served freeze | `6D654C01140FF818379B3ACCD2E8F79B463D3ACD35A394D391C76E17BA3315A0` |
| `src/site/detail.css`, output/served freeze | `9870768A5AB2F0B379A70F82D93E36CE84314F03C08E989073CF9F0C7245F5A3` |
| `tests/site/advertising-photo-transitions.e2e.mjs` | `390F07B6CDACCAE308ABFD2EA66EEA1C82A2E9B4E98FAAF7243A9261DECD2ED2` |
| `docs/specs/site-media-card-playback.md` | `4DBA836DB3850D9C8694F0F6DD302FB13538AA560BDC78B69C8C5CA8F0D6F866` |

Đây là candidate đang QA, chưa được main nghiệm thu. Khi runner/source đổi,
khóa freeze mới trước khi gọi kết quả hiện tại; không chuyển PASS qua hash khác.

## Evidence hiện tại và failure còn mở

[Related v1 raw](../../.tmp/site-media-card/m02b-related-20261003T035741327Z/green-related-v1/cp3-transition-e2e-results.json)
SHA-256 `4988F896C5DCBDE0E4A12512BF7FA8341BE2B100C49DA9908E048D91318102B2`
ghi named `m02b-related-history-just-viewed-and-scroll`: **3/6 PASS** trên
runtime `6D654C…`. Tên thư mục `green-related-v1` không là verdict GREEN.

| Simulated viewport/locale | Kết quả | Failure hoặc giới hạn |
| --- | --- | --- |
| Desktop `1440×900` VI | FAIL | `locator.click` timeout tại activation; HTML intercepts pointer events |
| Desktop `1440×900` EN | FAIL | `page.waitForFunction` timeout tại related virtualization/remount |
| Điện thoại dọc `390×844` VI và EN | PASS 2/2 | Chỉ chứng minh case đã chạy trên simulation |
| Điện thoại ngang `844×390` VI | FAIL | First paint `Y=3` so với expected `0`; sai số vượt `≤1 CSS px` |
| Điện thoại ngang `844×390` EN | PASS | Chỉ chứng minh case đã chạy trên simulation |

Ba failure trên chưa được đóng hoặc phân loại đủ để hạ oracle. Giữ raw và
strict assertion; không dùng force click, nới tolerance hoặc bỏ case để ép PASS.
Sáu named cũ tại [raw trước extension](../../.tmp/site-media-card/m02b-six-final-20260930T083739504Z/)
đã PASS trên runtime `889034…`; không chứng minh original six hay affected QA
trên candidate `6D654C…`. Timeout B cũ đã được [clean probe](../../.tmp/site-media-card/m02b-marker-diagnosis-20260930T080232930Z/probe-wheel-clean-v2.json)
xác nhận là fixture native scroll/Locomotive. Runner sửa reachability dùng
public logical scroll API; trusted wheel thuộc probe chẩn đoán.

Main đã kiểm layout **47 PASS**, `qa:static` và build PASS. M02a focused **10/11 PASS**,
EN grid-video activation FAIL chưa phân loại; claim lỗi harness chưa được
nhận thành kết luận. [Current regressions raw](../../.tmp/site-media-card/m02b-related-20261003T035741327Z/regressions/)
đã được main đối chiếu provenance runtime `6D654C…`: **original six 6/6 PASS**;
**affected eight 5/8 PASS**, ba FAIL là `related-selected-card-shuffle-cleanup`
(native scrollIntoView timeout), `morph-frame-identity` (scrolled detail
precondition), `history-grid-scrollbar-resize` (Back Y `8050` khác expected).
Giữ các failure chưa phân loại, không gọi tất cả là harness defect.
Lifecycle **50/52**: hai assertion cũ về grid-morph lease tại dòng 50/52 được
independent review xác nhận stale; baseline `889034…` cũng FAIL. File lifecycle
ngoài source packet ba file; chưa sửa, future correction tách packet một file.
`impeccable-detect.log` rỗng `0` byte: worker exit `0` không chứng minh finding
report; detector evidence **OPEN / UNVERIFIED**, không rerun sau quota STOP.
Independent MCP browser matrix **UNVERIFIED / TOOL BLOCKED**: trusted PageDown
ở main VI ghi logicalY `900`, nativeY `0`; click trước vị trí ổn định timeout.
Screenshot/snapshot tool pending rồi bị terminate; main dừng browser retry
sau ba tool issues. Chưa navigation; không có other-profile/related/history/
viewer PASS. Đây là thiếu evidence tool layer, không phân loại product RED.
Independent source review và main acceptance vẫn mở.
[Native QA manifest](../../.tmp/site-media-card/m02b-desktop-oct03-20261003T035709Z/manifest.json)
SHA-256 `93AD5407FE02332827FBF0B9E0F76B4212E8E3164224078DB2C1CD8AA233039E`
đã được main đối chiếu hash; copy claim `14/14` chưa nhận thành matrix PASS.
Năm profile khác NOT RUN; native six-profile matrix vẫn OPEN.

[Worker final manifest](../../.tmp/site-media-card/m02b-related-20261003T035741327Z/incremental-manifest-final.json)
SHA-256 `2C29D7F32C43923E0CA781B1507A3476D53B350BBAB27E77B73AAD14137E874E`
và [worker checkpoint](../../.tmp/site-media-card/m02b-related-20261003T035741327Z/worker-checkpoint.md)
SHA-256 `662D623FD98F5C9EFABA1E8C0716FA2ADDB5F5B6B4ADE383AFE4E9E873317830`
đã được main kiểm; incremental ba before/after/diff SHA đều khớp. Main kiểm
live HTTP runtime `6D654C…`, status `200` trước quota stop.

## Gate và bước tiếp theo

1. Phân loại ba failure related v1 trên exact frozen candidate; giữ RED raw.
2. Chạy original six, named related và affected regressions sau correction;
   đối chiếu source/build/served/runner hash trước/sau, static và unit raw.
3. Hoàn tất independent browser/source review và main verification; simulation
   VI/EN desktop/dọc/ngang không tự đóng physical hoặc owner gate.
4. Cập nhật owning spec status sau nghiệm thu bằng packet riêng của owner spec;
   checkpoint/status không triển khai M09 hay mở M06/M07.
5. Hiện STOP theo quota. Mở Claude handoff để tiếp tục phiên sau; verify SHA
   trước tests, không hỏi lại gate spec/plan M02b đã được owner duyệt.

Commands kế thừa [plan đã duyệt](../../tasks/plan.md#site-media-card-playback--plan-draft-2026-09-28):

```powershell
Set-Location 'C:\Users\halal\.codex\worktrees\mobile-ui-contract\TruongThinh-Website'
$env:BASE_URL = 'http://127.0.0.1:8792'
$env:PLAYWRIGHT_BROWSERS_PATH = 'E:/TruongThinh-Website/.tooling/browsers'
$env:SITE_MEDIA_EXPECTED_HEAD = (git rev-parse HEAD)
$env:CASE = 'm02b-related-history-just-viewed-and-scroll'
node tests/site/advertising-photo-transitions.e2e.mjs
git diff --check
```

Trước runner, verify frozen SHA rồi tạo raw UTC mới, đặt
`PHOTO_TRANSITIONS_OUTPUT_DIR` và lưu preflight exact candidate; không ghi đè
raw cũ. Đây là command entrypoint, chưa tự cho phép rerun full suite hoặc
body210; chọn bounded cases theo failure và freeze.

## Tracking, preservation và docs impact

[Tracking v2](../../.tmp/site-media-card/m02b-tracking-oct03-resumed-20261003T040229924Z/after-manifest-v2.json)
SHA-256 `418297E1052E91FBA84A7A2E1567BD1F2A22D4E40E216E42A232BA4E92A41FB4`
đã được main kiểm. [Checkpoint PAUSED 30/09](site-media-card-m02b-checkpoint-2026-09-30.md)
và RED baseline giữ immutable; report mới không retag kết quả cũ.
Exact5 docs packet sở hữu report này, verification index, STATE, plan và todo;
beforebytes/seal nằm trong `.tmp/site-media-card/m02b-checkpoint-oct03-partial-20261003T041602570Z/`.

Notion card [media-card](https://app.notion.com/p/3e9332849a0e814995c2fbb2e5393803)
live update pending vì connector không callable. Xác minh card ngày 30/09
không là current verification. Graphify AST đã fresh trong phiên này, semantic
pending 222 files ở query trước; không build/update semantic index.

## Chú thích thuật ngữ

- **PARTIAL / NOT ACCEPTED**: evidence chưa đủ để main nghiệm thu gói M02b.
- **Freeze**: khóa candidate và hash dùng đối chiếu kết quả QA.
- **Simulation**: browser giả lập viewport/đặc tính điện thoại; không là thiết bị thật.
- **Latest closed**: card vừa đóng gần nhất được dùng làm marker chung.
- **Immutable**: giữ nguyên bytes của raw và report lịch sử.
