# Claude AI handoff — M02b Advertising — 2026-10-03

## Trạng thái dừng

- **PARTIAL / NOT ACCEPTED / PAUSED**. Không gọi M02b GREEN.
- Stop rule đã kích hoạt: Codex 5 giờ used `94%`, remaining `6%`,
  `resetsAt=1791007693`. Không chạy thêm test, QA, build, deploy hoặc chỉnh
  runtime trong phiên này.
- Phạm vi giữ nguyên: `advertising-products` và các route con `?photo=` VI/EN.
  M03–M09, M06/M07, body210 và full-site QA không thuộc phiên tiếp theo nếu
  owner chưa mở lại.

## Candidate phải kiểm trước khi chạy

- Worktree: `C:\Users\halal\.codex\worktrees\mobile-ui-contract\TruongThinh-Website`
- Branch: `codex/mobile-ui-contract`
- HEAD: `e6cf065161cb19a8b59dd9efa8cda5d4af27fba1`
- Preview: `http://127.0.0.1:8792`
- Requested route: `gpt-6.1-sol/xhigh`; effective route: **unknown**.
- Runtime source/build/served: `6D654C01140FF818379B3ACCD2E8F79B463D3ACD35A394D391C76E17BA3315A0`
- CSS source/build/served: `9870768A5AB2F0B379A70F82D93E36CE84314F03C08E989073CF9F0C7245F5A3`
- Transition runner: `390F07B6CDACCAE308ABFD2EA66EEA1C82A2E9B4E98FAAF7243A9261DECD2ED2`
- Owning spec: `4DBA836DB3850D9C8694F0F6DD302FB13538AA560BDC78B69C8C5CA8F0D6F866`

Verify HEAD and all five SHA above, plus HTTP `200`, before any test. If one
differs, create a new freeze and do not reuse the results below.

## Evidence đã có

- Related marker/history simulation: **3/6 PASS**. Portrait VI/EN pass;
  landscape EN pass. Desktop VI activation is blocked by HTML pointer
  interception; desktop EN cannot reach the strict virtual-unmount assertion;
  landscape VI first paint is `Y=3` versus required `Y=0` (`≤1 CSS px`).
  Keep these assertions and raw failures; do not force click or widen tolerance.
- Current frozen regressions: original six **6/6 PASS**; affected eight
  **5/8 PASS**. Remaining failures: related shuffle target timeout, morph-frame
  identity precondition, and scrollbar-resize Back `Y=8050` mismatch.
- Layout units **47 PASS**; `prepare:site` and `qa:static` PASS. M02a is
  **10/11 PASS**; EN grid-video activation remains unclassified.
- Lifecycle lines 50/52 are stale grid-morph lease assertions; baseline
  `889034…` also lacks that removed consumer. Do not edit that file inside this
  packet; prepare a separate one-file correction preserving viewer guards.
- Independent browser QA is **UNVERIFIED / TOOL BLOCKED**. Desktop VI only
  reached logical `Y=900` with native `Y=0`; click, screenshot and snapshot
  evidence were blocked. Five simulated profiles were not run. Samsung A05/A05s
  physical QA is skipped by owner; iPhone is unverified.

Raw and seals:

- Related packet: `.tmp/site-media-card/m02b-related-20261003T035741327Z/`
- Related result SHA: `green-related-v1/cp3-transition-e2e-results.json` →
  `4988F896C5DCBDE0E4A12512BF7FA8341BE2B100C49DA9908E048D91318102B2`
- Incremental ownership manifest:
  `incremental-manifest-final.json` →
  `2C29D7F32C43923E0CA781B1507A3476D53B350BBAB27E77B73AAD14137E874E`
- Independent browser manifest:
  `.tmp/site-media-card/m02b-desktop-oct03-20261003T035709Z/manifest.json` →
  `93AD5407FE02332827FBF0B9E0F76B4212E8E3164224078DB2C1CD8AA233039E`
- Worker checkpoint: `worker-checkpoint.md` →
  `662D623FD98F5C9EFABA1E8C0716FA2ADDB5F5B6B4ADE383AFE4E9E873317830`
- Ownership diffs: `incremental-runtime.diff`, `incremental-runner.diff`,
  `incremental-spec.diff`; each before/after/diff SHA is sealed in the manifest.

## Tiếp tục theo thứ tự

1. Re-read this handoff and [checkpoint 03/10](site-media-card-m02b-checkpoint-2026-10-03.md).
2. Verify HEAD, runtime/CSS/spec/runner SHA and served bytes; make a fresh UTC
   raw directory and preserve the old raw directories.
3. Diagnose the three related failures with an independent activation-Y
   observer. Use a real long catalog or endpoint card for remount; preserve
   `≤1 CSS px`, marker-hidden-DOM cleanup, no clone, no extra history and no
   autoscroll assertions.
4. Run only affected named cases, then independent desktop and phone portrait/
   landscape simulations. Treat browser simulation separately from physical
   Samsung/iPhone evidence.
5. Run source review and main acceptance. Update the owning spec only after
   current candidate is genuinely GREEN; otherwise append a new dated partial
   checkpoint and stop.

Suggested bounded entrypoint after a new freeze:

```powershell
Set-Location 'C:\Users\halal\.codex\worktrees\mobile-ui-contract\TruongThinh-Website'
$env:BASE_URL = 'http://127.0.0.1:8792'
$env:PLAYWRIGHT_BROWSERS_PATH = 'E:/TruongThinh-Website/.tooling/browsers'
$env:SITE_MEDIA_EXPECTED_HEAD = (git rev-parse HEAD)
$env:CASE = 'm02b-related-history-just-viewed-and-scroll'
$env:PHOTO_TRANSITIONS_OUTPUT_DIR = '.tmp/site-media-card/<fresh-utc>'
node tests/site/advertising-photo-transitions.e2e.mjs
```

Do not use `--force`, `--no-verify`, broad body210/full-site runs, or a stale
raw directory. Notion live update is pending because the connector was not
callable; Git documents above are the current handoff source.

## Chú thích thuật ngữ

- **Freeze**: candidate source/build/served bytes khóa bằng SHA-256.
- **Simulation**: browser viewport/touch emulation, không phải thiết bị thật.
- **Latest closed**: card vừa đóng gần nhất dùng cho marker `Vừa xem` / `Just viewed`.
