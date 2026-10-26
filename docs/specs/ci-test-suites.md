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
[capability map](docs-system.md#r2-capability-map-và-spec-sống). PR, merge vào `main` và Deploy demo chỉ chạy bộ `fast`;
đủ mọi bộ chạy song song mỗi đêm trên `main` ([R4](#r4-chạy-song-song-và-độc-lập)). Agent chạy bộ của phần mình sửa ở local
trước khi push ([R6](#r6-chạy-local-cùng-lệnh-với-ci)). Spec này sở hữu cách chọn và chạy bộ; hành vi từng phần vẫn do spec của phần đó giữ.
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
| `media-card` | media-card, glass-surface, video-delivery | card nhiều media (vuốt, chấm, video cover, rect ổn định), Kính dạng cung, video thích ứng mạng |

Danh sách file test từng bộ nằm trong manifest, không chép vào đây. Bộ quá 5 phút trên runner CI thì tách đôi theo
spec; bộ dưới 30 giây gộp vào bộ cùng phần để không tốn thời gian dựng job.

### R3. Chọn bộ theo file PR sửa

`suites.mjs --select` so file đổi với merge base của `main`; `pnpm qa:suite --changed` (R6) dùng kết quả này. Trên CI,
PR và push chỉ dùng nó để biết có code hay không (R4):

1. File chỉ là tài liệu (`docs/**`, `research/**`, `*.md` ở root trừ `AGENTS.md`, `CLAUDE.md`): không bộ nào chạy, kể cả `fast`; Docs workflow kiểm phần này.
2. File khớp `fastOnly` (`AGENTS.md`, `CLAUDE.md`, `design-system/**`, `tests/tooling/**`, code CMS dormant, workflow
   khác CI): chỉ `fast`.
3. File khớp `shared` (`src/site/motion.js`, `src/site/style.css`, `src/site/assets/brand/**`, `package.json`,
   `pnpm-lock.yaml`, `playwright.config.cjs`, `tooling-versions.json`, `scripts/site/**`,
   `scripts/tooling/serve-static-parity.mjs`, `scripts/ci/**`, `tests/ci-suites.json`, `.github/workflows/ci.yml`,
   helper dùng chung trong `tests/site/`): mọi bộ.
4. File khớp đường kích hoạt của một bộ: bộ đó.
5. File code không khớp quy tắc nào (ví dụ file mới trong `src/site/` chưa có spec sở hữu): mọi bộ.

Push vào `main` và `workflow_dispatch` so với commit `main` trước đó: chỉ có tài liệu (mục 1) thì không bộ nào được
chọn, còn lại chọn mọi bộ. PR có code luôn có `fast`.

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

Owner chọn 2026-10-26 ("Chỉ fast"): đủ bộ tốn khoảng 106 phút job và 11 đến 17 phút mỗi lượt mà ít bắt lỗi thật; lỗi
chủ yếu do owner và agent review tìm ra. Vì vậy:

- PR (nháp hay sẵn sàng), push và `workflow_dispatch` không có input: chỉ `fast` khi R3 chọn ít nhất một bộ, không thì
  không bộ nào. Mục tiêu: xong trong khoảng 3 phút.
- `schedule` mỗi đêm lúc 19:00 UTC (02:00 giờ Việt Nam) trên `main`, hoặc `workflow_dispatch` với `full: true`: mọi bộ.

Mỗi bộ được chọn là một job trong matrix, `fail-fast: false`, chạy trên `ubuntu-latest`. Job tự build
`.site-output/`, mở preview ở port trống riêng và đặt `BASE_URL`, nên các bộ không giẫm nhau. Một bộ đỏ
không dừng bộ khác, và tên job là tên bộ để nhìn là biết phần nào hỏng. Job đỏ đính kèm log preview,
`test-results/` và `.tmp/` (report, screenshot của test e2e) của bộ đó.

Push mới lên cùng PR hủy lượt CI đang chạy của PR đó; trên `main` lượt đang chạy không bị hủy để Deploy demo vẫn chạy
khi merge dồn dập (lượt chờ mới nhất thay lượt chờ cũ hơn). Merge queue của GitHub không dùng được: chỉ có ở repo của tổ chức (public, hoặc private gói Enterprise
Cloud).

```gherkin
Given PR sẵn sàng sửa `style.css`
When CI chạy
Then chỉ bộ fast chạy

Given lượt schedule đêm trên main
When CI chạy
Then mọi bộ chạy, kể cả khi đêm đó không có commit mới

Given lượt đêm chạy bộ home và bộ adv-grid
When adv-grid fail
Then home vẫn chạy hết và báo kết quả riêng
And check của PR ghi rõ bộ adv-grid đỏ
```

### R5. Check tổng giữ tên `static-release`

Job `static-release` chạy sau mọi bộ (`if: !cancelled()`), xanh khi mọi bộ được chọn xanh, đỏ khi có bộ đỏ hoặc bị hủy.
Cả lượt CI bị hủy (push mới, PR rời nháp) thì check skipped, không đỏ; Automerge chỉ nhận `success`.
Bộ không được chọn không tính là đỏ. Lượt PR nháp đặt tên check là `static-release-draft`; Automerge vẫn đọc check
`static-release` và không merge PR nháp.

Trên PR và push, `static-release` chính là kết quả `fast`, nên Deploy demo chờ `static-release` tức là chỉ chờ `fast`
(owner chọn 2026-10-26). Lượt đêm không deploy. Lượt đêm đỏ: GitHub đánh dấu workflow đỏ và job summary nêu id bộ, lệnh
đỏ; điều phối xem lượt đêm mỗi sáng và giao thread sở hữu bộ đó sửa. Không thêm kênh báo.

```gherkin
Given PR chỉ đổi tài liệu
When CI xong
Then static-release xanh dù không bộ browser nào chạy
And Automerge merge được khi qa-docs cũng xanh

Given push vào main và bộ fast xanh
Then Deploy demo chạy với commit đó

Given lượt đêm có bộ adv-viewer đỏ
Then workflow đỏ, job summary nêu adv-viewer và Deploy demo không chạy
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
quyết. Không skip, tắt hay quarantine test để lấy xanh. Script cứng cổng `8787` đổi sang đọc `BASE_URL`.

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

### R9. Không tự chạy lại lệnh đỏ

CI không tự chạy lại lệnh hay job đỏ. Owner bỏ quy tắc chạy lại một lần ngày 2026-10-26 vì sau R4 nó chỉ còn tác dụng
cho lượt đêm. Lượt đêm đỏ là đỏ; người xem lượt đêm có thể re-run tay một lần trước khi giao sửa.

### R10. Đo thời gian từng lệnh

Job suite ghi vào job summary bảng bộ, lệnh, số giây, kết quả, và upload artifact `suite-timing-<bộ>` (cả khi xanh,
giữ 14 ngày). Số đo này dùng để xếp hạng test chậm và flaky; không dựng dashboard riêng.

### R11. Timeout

Job suite có `timeout-minutes: 12`; bước cài trình duyệt (`playwright install --with-deps`) có timeout riêng 5 phút và
chạy lại một lần khi quá hạn, vì apt treo ở bước này đã làm một job `media-card` mất 20 phút mà chưa chạy test nào (PR 567, 2026-10-26).

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Data | `tests/ci-suites.json` | Bộ, spec, lệnh test, `shared`, `manual`; agent sửa khi thêm test |
| Script | `scripts/ci/suites.mjs` | `--select`: nhận file đổi hoặc sự kiện CI, in JSON id bộ cho matrix. `<id>`: build, mở preview port trống, chạy lệnh của bộ (ghi thời gian, R10), dọn server; exit khác 0 khi có lệnh đỏ |
| Lệnh | `pnpm qa:suite` | Gọi script trên, dùng chung cho local và CI |
| Check | `static-release` | Check tổng mà Automerge đọc |

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1, R3 | `tests/tooling/ci-suites.test.mjs`: mọi e2e thuộc đúng một bộ, bảng chọn bộ theo file mẫu |
| R10 | Job summary và artifact `suite-timing` của một run CI thật |
| R11 | `timeout-minutes` trong `ci.yml` |
| R4, R5 | Run CI thật trên một PR docs-only, một PR có code (chỉ `fast`), một lượt `workflow_dispatch` với `full: true` |
| R6 | `pnpm qa:suite --changed` cho cùng danh sách bộ với job `select` |
| R7 | Mỗi bộ xanh trên runner CI tại PR đưa nó vào |
| R2 | Thời gian từng job trong log Actions, ghi vào mô tả PR |

## Gate còn mở

- File dùng chung: 25 trong 60 PR gần nhất trên `main` sửa `motion.js` hoặc `style.css` (đếm từ `git log`), nên
  gần một nửa PR code vẫn chạy đủ mọi bộ. Tách hai file này theo phần là việc riêng, không thuộc spec này.
- Bộ browser không còn chặn PR: lỗi chỉ thấy ở lượt đêm, sau khi đã merge và deploy demo. Demo là bản kiểm nhận nên chấp nhận được; trước khi lên production cần xem lại.
- Repo public từ 2026-10-15 nên CI chạy trên runner GitHub-hosted; số job cùng lúc là giới hạn gói Free. Đo 2026-10-26 với 25 job: wall time đủ bộ median 10,8 phút, p90 16,8; khoảng 30% là hàng đợi runner. Lượt đêm chạy một mình nên hàng đợi không ảnh hưởng ai.
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
- **Job summary**: trang tóm tắt của một job GitHub Actions, ghi từ `$GITHUB_STEP_SUMMARY`.
