---
title: Bộ test CI chia theo phần website
status: live
source:
  - .github/workflows/ci.yml
  - tests/ci-suites.json
  - scripts/ci/**
tests:
  - tests/tooling/ci-suites.test.mjs
notion: https://app.notion.com/p/3f8332849a0e81198d94caa0b8a03699
updated: 2026-10-26
---

# Bộ test CI chia theo phần website

## Mục đích

CI chia thành nhiều bộ test nhỏ, mỗi bộ ứng với một phần website trong
[capability map](docs-system.md#r2-capability-map-và-spec-sống). PR chỉ chạy bộ của phần nó sửa, các bộ chạy
song song trên runner `ubuntu-latest` của GitHub. Merge có code vào `main` và PR sửa file dùng chung chạy đủ mọi bộ; demo tự
deploy khi bộ `fast` xanh, không chờ các bộ còn lại ([R5](#r5-check-tổng-giữ-tên-static-release)). Spec này sở hữu cách chọn và chạy bộ; hành vi từng phần vẫn do spec của phần đó giữ.
Runner, Automerge và Deploy demo nằm ở [phát hành tĩnh R10](static-release.md#r10-gate-ci).

## Hành vi

### R1. Manifest bộ test

`tests/ci-suites.json` là nguồn duy nhất liệt kê bộ test. Mỗi bộ có `id`, `specs` (tên file spec trong `docs/specs/`
mà bộ bảo vệ) và `tests` (lệnh chạy, mỗi lệnh một file test hoặc một mode của `site.e2e.cjs`). Đường kích hoạt của bộ là
hợp các glob `source:` trong frontmatter của các spec đó cộng chính các file test của bộ, nên spec đổi `source:` thì
bộ tự theo. Hai bộ được cùng bảo vệ một spec (ví dụ `media` kiểm khung ảnh của trang chủ). Mục `ignore` là tài liệu,
`fastOnly` là file chỉ cần `fast`, `shared` là file dùng chung cả website, `manual` là test không vào CI kèm lý do,
`pending` là script chưa chuyển vào bộ (rỗng khi xong việc). Mỗi file `tests/site/*.e2e.*` nằm ở đúng một chỗ trong
bộ, `manual` hoặc `pending`; riêng `site.e2e.cjs` chia theo mode: mỗi mode `TT_E2E_*_ONLY` trong source nằm đúng một
lần ở lệnh của bộ, `manual` hoặc `pending` (mục pending dạng `tests/site/site.e2e.cjs TT_E2E_X_ONLY`).

```gherkin
Given một file test e2e mới trong tests/site/
When chạy node --test tests/tooling/ci-suites.test.mjs
Then test fail nếu file chưa thuộc bộ nào và không nằm trong manual
And test fail nếu một file thuộc hai bộ, trừ các shard `*_SHARD=k/n` của cùng một file
And test fail nếu một mode mới của site.e2e.cjs chưa nằm ở đâu
```

### R2. Bộ dự kiến

| Bộ | Spec | Nội dung chính |
| --- | --- | --- |
| `fast` | static-release, cms | `qa:static`, unit `*.test.mjs`, test `tests/tooling/`, biến thể ảnh, kiểm nội dung (`qa:content`, [test không phụ thuộc nội dung](content-independent-tests.md#r2-bộ-kiểm-nội-dung)), worker security, `qa:client-assets`, preview self-test, smoke Chromium năm route; chạy với mọi PR có code |
| `shell` | site-shell, phone-header-scroll | header, menu, đổi ngôn ngữ, header điện thoại |
| `route` | site-shell, logo-route-crossfade, static-release | chuyển trang: veil, logo đổi màu, mark mọc màu, 404, reduced motion |
| `header` | site-shell, phone-header-scroll | hình học header ở các cỡ màn hình, navbar, history, chế độ ngôn ngữ |
| `brand` | site-shell, logo-route-crossfade | logo: màu, bbox, co giãn khi đổi cỡ màn hình |
| `shell-motion` | site-shell, logo-route-crossfade | menu, reduced motion, bfcache, nhịp chữ và logo kiểu Espacio, link nội bộ |
| `scroll` | scroll-feel | cảm giác cuộn, cuộn bằng nút giữa chuột |
| `footer` | site-shell, page-home, detail-pages, advertising-cta-center-parallax | footer chung mọi trang ở mười ba cỡ màn hình, footer khi chạy |
| `home` | page-home | hero, portal, marquee logo khách, scroll cue, wheel, media hover |
| `detail-pages` | detail-pages | Residential, Commercial, About: hero, carousel, detail chậm, boot chậm, ảnh lỗi tải lại |
| `entry` | detail-pages, site-shell | chuyển trang Barba, hero detail, gallery, noscript, motion hỏng vẫn mở trang |
| `adv-grid` | advertising-masonry | hình học lưới, ảo hóa 3.000 card, bàn phím, lọc, card, không tiêu đề |
| `adv-browse` | advertising-masonry | lượt duyệt ngẫu nhiên, hero một lần, history, đổi ngôn ngữ, URL cũ, preload route, footer route |
| `adv-load` | advertising-masonry, advertising-skeleton, advertising-cta-center-parallax | SSR, skeleton cuối lưới, mạng chậm, reveal ngoài màn hình, card vào lại |
| `adv-detail` | advertising-detail, advertising-viewer-touch-zoom | `?photo=`: tiêu đề, related, gợi ý, slideshow, quay lại masonry, viewer cảm ứng |
| `adv-viewer` | advertising-detail, advertising-viewer-touch-zoom | chuyển ảnh: morph, history Back/Forward, khóa cuộn, đổi ngôn ngữ khi đang mở ảnh |
| `adv-primary` | advertising-detail | ảnh primary: span, CTA, chữ vừa khung, reduced motion |
| `adv-view-1` tới `adv-view-6` | advertising-detail, advertising-viewer-touch-zoom | hình học detail và viewer ở 20 cỡ màn hình, hai ngôn ngữ, ba dạng ảnh; mỗi bộ một shard Chromium |
| `media` | media-delivery, loading-glass-and-page-entry, glass-surface, media-card, page-home, detail-pages, image-adaptive-delivery | khung ảnh, CLS, skeleton chờ ảnh, Kính reveal, ảnh thích ứng mạng |
| `media-card` | media-card, glass-surface | card nhiều media (vuốt, chấm, video cover, rect ổn định), Kính dạng cung |

Danh sách file test từng bộ nằm trong manifest, không chép vào đây. Bộ quá 5 phút trên runner CI thì tách đôi theo
spec; bộ ngắn gộp chung job với bộ khác theo [R11](#r11-đóng-gói-job-và-timeout), không gộp bộ.

### R3. Chọn bộ theo file PR sửa

Job `select` so file đổi của PR với merge base của `main`:

1. File chỉ là tài liệu (`docs/**`, `research/**`, `*.md` ở root trừ `AGENTS.md`, `CLAUDE.md`): không bộ nào chạy, kể cả `fast`; Docs workflow kiểm phần này.
2. File khớp `fastOnly` (`AGENTS.md`, `CLAUDE.md`, `design-system/**`, `tests/tooling/**`, code CMS dormant, workflow
   khác CI): chỉ `fast`.
3. File khớp `shared` (`src/site/motion.js`, `src/site/style.css`, `src/site/assets/brand/**`, `package.json`,
   `pnpm-lock.yaml`, `playwright.config.cjs`, `tooling-versions.json`, `scripts/site/**`,
   `scripts/tooling/serve-static-parity.mjs`, `scripts/ci/**`, `tests/ci-suites.json`, `.github/workflows/ci.yml`,
   helper dùng chung trong `tests/site/`): mọi bộ.
4. File khớp đường kích hoạt của một bộ: bộ đó.
5. File code không khớp quy tắc nào (ví dụ file mới trong `src/site/` chưa có spec sở hữu): mọi bộ.

Push vào `main` và `workflow_dispatch` so với commit `main` trước đó: chỉ có tài liệu (mục 1) thì không bộ nào chạy,
còn lại chạy mọi bộ. PR có code luôn chạy `fast`.

```gherkin
Given PR chỉ đổi src/site/residential/index.html
When job select chạy
Then chỉ fast, detail-pages, footer và media được chọn

Given PR đổi src/site/style.css
When job select chạy
Then mọi bộ được chọn

Given CI chạy do push vào main và merge có file code
Then mọi bộ được chọn

Given CI chạy do push vào main và merge chỉ đổi docs/STATE.md
Then không bộ nào được chọn
```

### R4. Chạy song song và độc lập

Mục tiêu (owner duyệt 2026-10-13): PR sửa một phần xong dưới 5 phút; chạy đủ mọi bộ xong dưới 12 phút khi đủ
runner rảnh (GitHub cấp tới khoảng 20 job cùng lúc cho gói Free).

Mỗi job trong matrix (một bộ, hoặc vài bộ ngắn gộp theo [R11](#r11-đóng-gói-job-và-timeout)), `fail-fast: false`, chạy trên `ubuntu-latest`. Job tự build
`.site-output/`, mở preview ở port trống riêng và đặt `BASE_URL`, nên các bộ không giẫm nhau. Một bộ đỏ
không dừng bộ khác, và tên job là tên bộ để nhìn là biết phần nào hỏng. Job đỏ đính kèm log preview,
`test-results/` và `.tmp/` (report, screenshot của test e2e) của bộ đó.

Push mới lên cùng PR hủy lượt CI đang chạy của PR đó; trên `main` lượt đang chạy không bị hủy để Deploy demo vẫn chạy khi merge dồn dập (lượt chờ mới nhất thay lượt chờ cũ hơn). PR nháp chỉ chạy bộ `fast` (khi R3 chọn ít nhất
một bộ); đủ bộ chạy khi PR chuyển sang sẵn sàng (`ready_for_review`), để PR đang làm dở không chiếm runner (owner chọn
2026-10-15). Merge queue của GitHub không dùng được: chỉ có ở repo của tổ chức (public, hoặc private gói Enterprise
Cloud).

```gherkin
Given PR nháp sửa `style.css`
When CI chạy
Then chỉ bộ fast chạy và check tên `static-release-draft`
And khi PR chuyển sang sẵn sàng thì chạy đủ mọi bộ

Given bộ home và bộ adv-grid cùng được chọn
When adv-grid fail
Then home vẫn chạy hết và báo kết quả riêng
And check của PR ghi rõ bộ adv-grid đỏ
```

### R5. Check tổng giữ tên `static-release`

Job `static-release` chạy sau mọi bộ (`if: !cancelled()`), xanh khi mọi bộ được chọn xanh, đỏ khi có bộ đỏ hoặc bị hủy.
Cả lượt CI bị hủy (push mới, PR rời nháp) thì check skipped, không đỏ; Automerge chỉ nhận `success`.
Bộ không được chọn không tính là đỏ. Lượt PR nháp đặt tên check là `static-release-draft` để Automerge không
merge bằng kết quả chỉ có bộ `fast`. Workflow `Automerge` giữ nguyên vì vẫn đọc check `static-release`.

Deploy demo trên `main` chỉ chờ bộ `fast` xanh (hoặc R3 không chọn bộ nào), không chờ `static-release` (owner chọn
2026-10-26: một bộ browser chập chờn sau merge không được chặn demo; PR đã chạy đủ bộ trước khi merge). Các bộ còn
lại trên `main` vẫn chạy đủ; bộ đỏ làm `static-release` của commit đó đỏ và hiện trong job summary (id bộ, lệnh đỏ),
không thêm kênh báo. Thread sở hữu bộ đó sửa; lượt đỏ này không chặn deploy các commit sau.

```gherkin
Given PR chỉ đổi tài liệu
When CI xong
Then static-release xanh dù không bộ browser nào chạy
And Automerge merge được khi qa-docs cũng xanh

Given push vào main, bộ fast xanh, bộ adv-viewer đỏ
When CI chạy
Then Deploy demo vẫn chạy với commit đó
And static-release của commit đó đỏ và job summary nêu adv-viewer

Given push vào main và bộ fast đỏ
Then Deploy demo không chạy
```

### R6. Chạy local cùng lệnh với CI

`pnpm qa:suite <id>` chạy một bộ, `pnpm qa:suite --changed` chạy các bộ mà R3 chọn cho thay đổi hiện tại so với
`origin/main`. CI gọi đúng lệnh này nên agent và runner chạy cùng một thứ. Lệnh tự build, tự mở preview và tự dọn.

```gherkin
Given agent vừa sửa src/site/about/index.html
When chạy pnpm qa:suite --changed
Then chạy fast, detail-pages, footer và media giống CI
```

### R7. Đưa test chạy tay vào bộ

Khoảng 30 script e2e đang chạy tay được đưa vào bộ, mỗi lần một bộ. Script phải xanh trên runner CI trước khi vào
manifest. Script nát được sửa theo demo hiện tại: demo là chuẩn vì owner đã kiểm nhận trên đó; test và spec sở hữu
sửa theo demo trong cùng PR. Chỗ demo trông như lỗi (vỡ layout, lỗi console) thì gom lại hỏi owner một lần, không tự
quyết. Không skip, tắt hay quarantine test để lấy xanh (chạy lại có kiểm soát theo [R9](#r9-chạy-lại-lệnh-đỏ-một-lần) không phải skip). Script cứng cổng `8787` đổi sang đọc `BASE_URL`.

```gherkin
Given script shared-header-single-line đỏ vì test đòi hành vi demo đã đổi
When đưa vào bộ shell
Then test sửa theo hành vi trên demo và spec site-shell sửa cùng PR
```

### R8. Test ngoài CI

`manual` giữ test cần phần cứng thật hoặc ma trận quá lớn, chạy tay trên PC: đo FPS và WebGL
(`advertising-continuation`), phone Android (`mobile-viewport-android-record`), ma trận nhiều engine
(`mobile-layout-parity`, `mobile-viewport-stability`, `scrollbar-parity`), công cụ đo (`image-delivery-measure`,
`scroll-trace`, `related-scroll-device`, `advertising-solver-report`). Mode `site.e2e.cjs` chỉ gọi lại các hàm
mà mode trong bộ đã gọi (`HEADER`, `LOCALE`, `M2`...) cũng nằm ở `manual`, ghi rõ trùng mode nào, để một kiểm tra
không chạy hai lần. Phần độ phủ phụ thuộc
[phân loại Advertising](advertising-taxonomy.md) chưa làm ở đây.

### R9. Chạy lại lệnh đỏ một lần

Owner chọn 2026-10-26. `suites.mjs` chạy lại đúng lệnh đó một lần (cùng preview server, cùng `BASE_URL`) khi một lệnh của
bộ khác `fast` thoát khác 0. Xanh lần hai: lệnh tính xanh, in `::warning::flaky <bộ>: <lệnh>` và ghi vào danh sách flaky
của job summary. Đỏ lần hai: đỏ, giữ log cả hai lần. Không chạy lại ở cấp job hay bộ. `fast` không chạy lại vì xác định
(deterministic): đỏ là đỏ. Danh sách flaky là sổ đếm, không phải skip hay quarantine: lỗi thật đỏ cả hai lần; lỗi chập chờn của
sản phẩm cũng xanh lần hai nên dấu vết chỉ nằm ở sổ, vì vậy thread sở hữu bộ dùng sổ để sửa gốc (ngoài PR hạ tầng).

```gherkin
Given lệnh e2e của bộ adv-viewer đỏ lần đầu do timing
When suites.mjs chạy lại đúng lệnh đó và lần hai xanh
Then bộ adv-viewer xanh, job summary ghi lệnh đó là flaky

Given lệnh đỏ cả hai lần
Then bộ đỏ và log giữ cả hai lần
```

### R10. Đo thời gian từng lệnh

Job suite ghi vào job summary bảng lệnh, số giây, số lần chạy, cờ flaky, và upload `suite-timing-<job>.json` (cả khi
xanh, giữ 14 ngày). Số đo này là đầu vào để đóng gói job (R11) và xếp hạng test flaky; không dựng dashboard riêng.

### R11. Đóng gói job và timeout

Manifest có mục `jobs`: mỗi job liệt kê id các bộ chạy nối tiếp trong một runner. R3 vẫn chọn theo bộ; job chạy khi có
bộ trong nó được chọn và chỉ chạy các bộ được chọn. Một bộ đỏ không dừng bộ khác trong job. Tên job là các id bộ. Lượt đủ
bộ dùng không quá 18 job (dưới giới hạn khoảng 20 của gói Free) và mỗi job dự kiến xong trong 6 phút; cách chia chốt theo số
đo R10. Job suite có `timeout-minutes: 12`.

```gherkin
Given manifest có mục jobs
When chạy node --test tests/tooling/ci-suites.test.mjs
Then test fail nếu một bộ không nằm trong đúng một job
And test fail nếu số job của lượt đủ bộ quá 18
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Data | `tests/ci-suites.json` | Bộ, spec, lệnh test, `jobs`, `shared`, `manual`; agent sửa khi thêm test |
| Script | `scripts/ci/suites.mjs` | `--select`: nhận file đổi hoặc sự kiện CI, in JSON id bộ cho matrix. `<id>`: build, mở preview port trống, chạy lệnh của bộ (lệnh đỏ chạy lại một lần, R9; ghi thời gian, R10), dọn server; exit khác 0 khi có lệnh đỏ |
| Lệnh | `pnpm qa:suite` | Gọi script trên, dùng chung cho local và CI |
| Check | `static-release` | Check tổng mà Automerge đọc |

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1, R3 | `tests/tooling/ci-suites.test.mjs`: mọi e2e thuộc đúng một bộ, bảng chọn bộ theo file mẫu |
| R9 | `tests/tooling/ci-suites.test.mjs`: lệnh giả đỏ một lần rồi xanh cho cờ flaky, đỏ hai lần cho bộ đỏ, `fast` không chạy lại |
| R10 | Job summary và artifact `suite-timing` của một run CI thật |
| R11 | `tests/tooling/ci-suites.test.mjs` (mỗi bộ đúng một job, tối đa 18 job); wall time đủ bộ ghi vào mô tả PR |
| R4, R5 | Run CI thật trên một PR docs-only, một PR một phần, một PR đổi `style.css`, một PR nháp rồi chuyển sẵn sàng |
| R6 | `pnpm qa:suite --changed` cho cùng danh sách bộ với job `select` |
| R7 | Mỗi bộ xanh trên runner CI tại PR đưa nó vào |
| R2 | Thời gian từng job trong log Actions, ghi vào mô tả PR |

## Gate còn mở

- File dùng chung: 25 trong 60 PR gần nhất trên `main` sửa `motion.js` hoặc `style.css` (đếm từ `git log`), nên
  gần một nửa PR code vẫn chạy đủ mọi bộ. Tách hai file này theo phần là việc riêng, không thuộc spec này.
- Repo public từ 2026-10-15 nên CI chạy trên runner GitHub-hosted; số job cùng lúc là giới hạn gói Free. Đo 2026-10-26 với 25 job: wall time đủ bộ median 10,8 phút, p90 16,8; khoảng 30% là hàng đợi runner. R11 nhắm xóa hàng đợi này; đo lại sau khi đóng gói.
- WebKit desktop là sàn theo [phát hành tĩnh](static-release.md#gate-còn-mở). CI chỉ chạy WebKit ở bộ `adv-browse`
  (`advertising-random-browse.e2e.mjs`, job đó cài thêm WebKit); các bộ khác chạy Chromium (`LIFECYCLE_ENGINES`);
  Firefox và phần WebKit còn lại chạy tay.

## Chú thích thuật ngữ

- **Bộ test (suite)**: nhóm test bảo vệ một phần website, chạy thành một job CI.
- **Manifest**: file JSON liệt kê bộ và test của từng bộ.
- **Matrix**: một job GitHub Actions nhân thành nhiều job theo danh sách giá trị.
- **Merge base**: commit chung gần nhất giữa nhánh PR và `main`.
- **Check tổng**: job gom kết quả mọi bộ thành một check duy nhất.
- **Runner**: máy chạy job GitHub Actions; ở đây là `ubuntu-latest` do GitHub cấp.
- **Quarantine**: tạm cách ly test đỏ khỏi CI; spec này cấm.
- **Flaky**: test lúc xanh lúc đỏ dù code không đổi.
- **Deterministic**: cùng đầu vào luôn cho cùng kết quả.
- **Job summary**: trang tóm tắt của một job GitHub Actions, ghi từ `$GITHUB_STEP_SUMMARY`.
