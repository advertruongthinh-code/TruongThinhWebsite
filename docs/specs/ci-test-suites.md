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
updated: 2026-10-13
---

# Bộ test CI chia theo phần website

## Mục đích

CI chia thành nhiều bộ test nhỏ, mỗi bộ ứng với một phần website trong
[capability map](docs-system.md#r2-capability-map-và-spec-sống). PR chỉ chạy bộ của phần nó sửa, các bộ chạy
song song trên runner WSL ở PC owner. Merge có code vào `main` và PR sửa file dùng chung chạy đủ mọi bộ trước khi
demo tự deploy. Spec này sở hữu cách chọn và chạy bộ; hành vi từng phần vẫn do spec của phần đó giữ.
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
| `fast` | static-release, cms | `qa:static`, unit `*.test.mjs`, test `tests/tooling/`, biến thể ảnh, worker security, `qa:client-assets`, preview self-test, smoke Chromium năm route; chạy với mọi PR có code |
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
| `media` | media-delivery, loading-glass-and-page-entry, glass-surface, media-card, page-home, detail-pages | khung ảnh, CLS, skeleton chờ ảnh, Kính reveal |
| `media-card` | media-card, glass-surface | card nhiều media (vuốt, chấm, video cover, rect ổn định), Kính dạng cung |

Danh sách file test từng bộ nằm trong manifest, không chép vào đây. Bộ quá 5 phút trên runner PC thì tách đôi theo
spec; bộ dưới 30 giây gộp vào bộ cùng phần để không tốn thời gian dựng job.

### R3. Chọn bộ theo file PR sửa

Job `select` so file đổi của PR với merge base của `main`:

1. File chỉ là tài liệu (`docs/**`, `research/**`, `*.md` ở root trừ `AGENTS.md`, `CLAUDE.md`): không bộ nào chạy, kể cả `fast`; Docs workflow kiểm phần này.
2. File khớp `fastOnly` (`AGENTS.md`, `CLAUDE.md`, `design-system/**`, `tests/tooling/**`, cấu hình Serena, code CMS dormant, workflow
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
runner rảnh.

Mỗi bộ được chọn là một job trong matrix, `fail-fast: false`, chạy trên `[self-hosted, linux, wsl]`. Job tự build
`.site-output/`, mở preview ở port trống riêng và đặt `BASE_URL`, nên các bộ không giẫm nhau trên cùng PC. Một bộ đỏ
không dừng bộ khác, và tên job là tên bộ để nhìn là biết phần nào hỏng. Job đỏ đính kèm log preview và
`test-results/` của bộ đó.

```gherkin
Given bộ home và bộ adv-grid cùng được chọn
When adv-grid fail
Then home vẫn chạy hết và báo kết quả riêng
And check của PR ghi rõ bộ adv-grid đỏ
```

### R5. Check tổng giữ tên `static-release`

Job `static-release` chạy sau mọi bộ (`if: always()`), xanh khi mọi bộ được chọn xanh, đỏ khi có bộ đỏ hoặc bị hủy.
Bộ không được chọn không tính là đỏ. Workflow `Automerge` và `Deploy demo` giữ nguyên vì vẫn đọc check
`static-release` và kết luận của workflow CI.

```gherkin
Given PR chỉ đổi tài liệu
When CI xong
Then static-release xanh dù không bộ browser nào chạy
And Automerge merge được khi qa-docs cũng xanh
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

Khoảng 30 script e2e đang chạy tay được đưa vào bộ, mỗi lần một bộ. Script phải xanh trên runner PC trước khi vào
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
(`advertising-continuation`), A05s (`mobile-viewport-android-record`), ma trận nhiều engine
(`mobile-layout-parity`, `mobile-viewport-stability`, `scrollbar-parity`), công cụ đo (`image-delivery-measure`,
`scroll-trace`, `related-scroll-device`, `advertising-solver-report`). Mode `site.e2e.cjs` chỉ gọi lại các hàm
mà mode trong bộ đã gọi (`HEADER`, `LOCALE`, `M2`...) cũng nằm ở `manual`, ghi rõ trùng mode nào, để một kiểm tra
không chạy hai lần. Phần độ phủ phụ thuộc
[phân loại Advertising](advertising-taxonomy.md) chưa làm ở đây.

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Data | `tests/ci-suites.json` | Bộ, spec, lệnh test, `shared`, `manual`; agent sửa khi thêm test |
| Script | `scripts/ci/suites.mjs` | `--select`: nhận file đổi hoặc sự kiện CI, in JSON id bộ cho matrix. `<id>`: build, mở preview port trống, chạy lệnh của bộ, dọn server; exit khác 0 khi có lệnh đỏ |
| Lệnh | `pnpm qa:suite` | Gọi script trên, dùng chung cho local và CI |
| Check | `static-release` | Check tổng mà Automerge đọc |

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1, R3 | `tests/tooling/ci-suites.test.mjs`: mọi e2e thuộc đúng một bộ, bảng chọn bộ theo file mẫu |
| R4, R5 | Run CI thật trên một PR docs-only, một PR một phần, một PR đổi `style.css` |
| R6 | `pnpm qa:suite --changed` cho cùng danh sách bộ với job `select` |
| R7 | Mỗi bộ xanh trên runner PC tại PR đưa nó vào |
| R2 | Thời gian từng job trong log Actions, ghi vào mô tả PR |

## Gate còn mở

- File dùng chung: 25 trong 60 PR gần nhất trên `main` sửa `motion.js` hoặc `style.css` (đếm từ `git log`), nên
  gần một nửa PR code vẫn chạy đủ mọi bộ. Tách hai file này theo phần là việc riêng, không thuộc spec này.
- Owner chốt 4 runner trong máy ảo WSL giới hạn 4 GB RAM, 4 luồng (2026-10-14) để CI không chiếm tài nguyên PC; các
  job chia nhau 4 luồng nên chưa biết mục tiêu 12 phút có đạt không. Đổi số runner hoặc trần WSL cần owner đồng ý.
- WebKit desktop là sàn theo [phát hành tĩnh](static-release.md#gate-còn-mở) nhưng CI chưa chạy WebKit; chưa
  thuộc spec này. Runner chỉ cài Chromium nên script nhiều engine chạy Chromium trong CI (`LIFECYCLE_ENGINES`,
  `RANDOM_BROWSE_ENGINES`); Firefox, WebKit chạy tay.

## Chú thích thuật ngữ

- **Bộ test (suite)**: nhóm test bảo vệ một phần website, chạy thành một job CI.
- **Manifest**: file JSON liệt kê bộ và test của từng bộ.
- **Matrix**: một job GitHub Actions nhân thành nhiều job theo danh sách giá trị.
- **Merge base**: commit chung gần nhất giữa nhánh PR và `main`.
- **Check tổng**: job gom kết quả mọi bộ thành một check duy nhất.
- **Runner**: máy chạy job GitHub Actions; ở đây là WSL trên PC owner.
- **Quarantine**: tạm cách ly test đỏ khỏi CI; spec này cấm.
