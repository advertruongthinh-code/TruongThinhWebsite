# M02b Advertising — checkpoint Claude PARTIAL 2026-10-03

- Status: **PARTIAL / NOT ACCEPTED**. Related 4/6 PASS ổn định; phone landscape
  VI/EN còn FAIL. Không gọi M02b GREEN.
- Scope: riêng `advertising-products` và `?photo=` detail con VI/EN. M03–M09
  PAUSED. Chưa commit/push/deploy.
- Nguồn: tiếp tục [checkpoint 03/10](site-media-card-m02b-checkpoint-2026-10-03.md)
  và [Claude handoff](site-media-card-m02b-claude-handoff-2026-10-03.md).

## Candidate

Worktree Claude `.claude/worktrees/nice-kalam-bf7e86`, HEAD `3e0ea0e` (main), restore
patch từ tag `archive/mobile-ui-contract-20261003` bằng `git apply --3way`; chỉ
`docs/STATE.md` conflict, đã giữ snapshot main và thêm một dòng M02b.

Runtime restore `74b987…` (LF) cùng nội dung với `6D654C…` (CRLF) của handoff.
Freeze cuối, source/build/served khớp, preview `http://127.0.0.1:8792`:

| Artifact | SHA-256 |
| --- | --- |
| `catalog-runtime.mjs` source/build/served | `B1B3C8EA05B7A8A8796BBEB915954F8E157F0355457CD62A6E59A05FFF6AEC45` |
| `src/site/detail.css` | `9870768A5AB2F0B379A70F82D93E36CE84314F03C08E989073CF9F0C7245F5A3` |
| `advertising-photo-transitions.e2e.mjs` | `DEA2E8CD75057BCB32CC8FC9EC0370748E91F91ABB1471A55CE46FA7C4ECA077` |

Raw: `.tmp/site-media-card/m02b-claude-freeze-20261003T130743Z/`.

## Ba failure related

1. **Desktop click bị `<html>` chặn — product bug, đã sửa.** `focusVirtualPlacement`
   chạy Masonry instant layout khi entrance transition còn chạy; transform cũ
   cộng lên `top` mới, card vẽ ở gấp đôi offset tối đa `400ms`. Test đo rect tạm
   rồi click vào khoảng trống. Sửa: gọi `cancelMasonryTransitions()` trước
   instant relayout, giống `settleMotion`. Probe: rect ổn định ở 100/1000/4000ms.
2. **Desktop remount timeout — fixture không đạt được.** Overscan một viewport;
   related desktop ngắn nên 7–10/25 card không bao giờ unmount ở cả hai đầu
   scroll, card 06 rơi vào nhóm này 4/6 seed. Sửa runner: `m02bFixture` nhận
   seed tùy chọn qua visit-seed handoff của runtime, case related ghim
   `m02b-i`. Assertion strict giữ nguyên.
3. **Landscape Y=3 — còn mở, chưa rõ nguyên nhân gốc.** `scrollTo(0)` đọc lại
   `0` đồng bộ; trình duyệt đẩy lên `3`–`21px` trước scroll event kế tiếp. Chỉ
   xảy ra với touch tap; mouse click và JS click về `0`. Không do script site,
   scroll anchoring hay focus `photo-view__info`. Chưa nới tolerance.

## Kết quả

- Related seeded: desktop VI/EN, portrait VI/EN PASS 3/3 lần; landscape VI/EN
  FAIL 3/3 tại A-to-B (`Y=3`).
- Full transitions: 19/29 PASS. Fail đã biết từ handoff: landscape×2,
  related shuffle, morph-frame identity, scrollbar-resize Back. Fail có sẵn
  không do fix (chạy lại không fix vẫn FAIL): p13 `installRelatedMediaProbe`
  undefined, grid-cta-skeleton `vi-320`, skeleton-global-boundary-fade.
  Hover timing flake: viewer-control-affordances FAIL 1/2 cả có fix lẫn không fix.
- Units 58/59 (lifecycle:50 stale đã biết); `qa:static` PASS.
- Simulation không thay physical Samsung/iPhone.

## Physical A05s landscape 2026-10-03

Samsung A05s (`SM-A057F`), Chrome 154, landscape `838×331` DPR `2.625`, preview
8792 qua `adb reverse`. Owner tap thật (pointerType `touch`, trusted) từ detail
`signage-raised-letters-06` sang related card: VI → `-04`, EN → `-09`. Cả hai
60/60 frame sau khi URL đổi ở `Y=0` native và logical, final `0`, visual
viewport scale `1`. [Raw](../../.tmp/site-media-card/m02b-claude-freeze-20261003T130743Z/a05s/landscape-results.json).

Suy luận, chưa chứng minh: drift `3px` có thể chỉ có trong Chromium emulation.
Giới hạn: một tap mỗi locale, load trực tiếp detail A (không qua grid), card B
khác `-16` đã tái hiện drift trên emulator; iPhone chưa kiểm.

## Tự động hóa emulator + A05s

`pnpm qa:related-scroll` chạy case related trên emulator rồi tap thật trên
A05s bằng `adb shell input tap` (pointerType `touch`, trusted), card `16` và
card related đầu, VI/EN, theo hướng máy đang cầm. [Raw lần chạy](../../.tmp/site-media-card/related-scroll-20261003T141555687Z/summary.json):

| Target | Profile | VI | EN |
| --- | --- | --- | --- |
| Emulator | 1440×900, 390×844 | PASS | PASS |
| Emulator | 844×390 | FAIL `Y=3` | FAIL `Y=3` |
| A05s thật | landscape, card 16 | PASS `Y=0` | PASS `Y=0` |
| A05s thật | landscape, card đầu | PASS `Y=0` (`-24`) | PASS `Y=0` (`-03`) |

Card `16` và `24` drift trên emulator nhưng `Y=0` trên A05s thật. Suy luận:
drift landscape là artifact của Chromium emulation; iPhone vẫn chưa kiểm.

## Chạy lại trên cloud 03/10/2026

Branch `claude/m02b-leftovers-tkh3xr` trên `main` `f3f75a7`, Chromium 141
headless, preview `8792`. Barba/Locomotive lấy từ npm cùng version vì
`cdn.jsdelivr.net` bị chặn; font Google lấy qua proxy.

- Transitions đầy đủ trước sửa: 20/29 PASS. FAIL: landscape VI/EN `Y=2`
  (related A-to-B), viewer-control-affordances (hover), p13, morph-frame-identity,
  history-grid-scrollbar-resize, rapid-related-and-back-mid-morph,
  grid-cta-skeleton-flow `vi-320`, skeleton-global-boundary-fade.
  Related shuffle PASS trên cloud.
- Unit `node --test tests/site/*.test.mjs`: 116/120 trước, 120/120 sau. Bốn
  test lệch hành vi đã duyệt: hai assertion về grid-detail morph lease và
  backdrop morph đã bị M02b bỏ ([spec](../specs/advertising-photo-browse.md)),
  history state thiếu `mediaId`, R11 dùng tag nay có hai ảnh và đổi geometry ở
  `media` thay vì cover `mediaItems`.
- p13: khôi phục `installRelatedMediaProbe`/`assertMediaFade` bị rơi khi restore;
  thay `ensurePhoto(card cuối catalog)` bằng cuộn cuối trang vì thứ tự đã random;
  chọn card remount từ cửa sổ hiện tại vì tag deep link reload trang; chờ fade
  xong thay vì 700ms. Stage remount PASS 2/3; stage `filter-interruption-resize`
  nay mới chạy tới và FAIL (mọi card cùng `left 0` khi đổi filter), chưa phân loại.
- Ponytail ultra trên phần code restore `f76c14f`: 88 dòng có thể cắt; đã cắt
  nhóm rủi ro thấp (class `--dense` không có CSS, `clear()` thừa, key diagnostic
  không ai đọc, selector `[hidden]` trùng UA). Nhóm cấu trúc lại và gỡ touch
  listener chờ owner.
- Phân loại FAIL còn lại (`main` `b72c9cf`). Đều là lỗi test, không phải lỗi
  sản phẩm; mỗi ca PASS ít nhất 2 lượt liên tiếp sau sửa:
  - p13 `filter-interruption-resize`: đọc vị trí trước/sau click ở hai task
    khác nhau nên đo cả smooth scroll đang chạy. Sửa: đọc, click, đọc lại
    trong một task.
  - morph-frame-identity, rapid-related-and-back-mid-morph: Locomotive 4.1.4
    nhận một notch cho mỗi wheel event, nhân `mouseMultiplier` theo OS
    (Windows 108 px, Linux 43 px), nên một wheel không đủ `100px` trên Linux.
    Sửa: ba notch. Thêm: thứ tự related ngẫu nhiên có thể đặt B ngay đầu nên
    detail chưa cuộn; test cuộn một nửa khoảng tới B trước click.
  - history-grid-scrollbar-resize: đọc `gridY` trước khi click tự cuộn card
    vào view. Sửa: `scrollIntoViewIfNeeded` rồi chờ scroll đứng yên mới đọc.
  - viewer-control-affordances: transition `150ms` chưa xong sau `180ms` khi
    runner nặng. Sửa: chờ `getAnimations()` xong rồi mới đọc màu.
  - skeleton-global-boundary-fade và grid-cta-skeleton-flow: test còn
    đòi mask trên container skeleton (R6/R8) và tối đa 3 frame mỗi cột (R11).
    [R10 và P7.1](../specs/advertising-skeleton.md#r1-batch-nối-tiếp-masonry)
    đã thay bằng một glass surface toàn cục và số frame theo ranh giới glass.
    Test nay kiểm glass `::before` có `linear-gradient` và `backdrop-filter`.
  - grid-cta-skeleton-flow `vi-320`: test đo hộp frame chưa cắt (vượt `54px`),
    nhưng container skeleton có `overflow: hidden` và cao tới đáy grid cộng một
    gap, nên phần vẽ ra chỉ vượt `15px`. Test nay đo theo cạnh cắt đó.
  - related-selected-card-shuffle-cleanup: related ngẫu nhiên và virtualized,
    card đích có lúc chưa mount; `scrollIntoView` native không đẩy được smooth
    scroll. Sửa: cuộn logical tới khi card mount rồi đưa card vào view.
- Toàn bộ transitions sau sửa: 25/29, rồi chạy lại từng ca hỏng. Còn mở:
  landscape VI/EN `Y=2` (giới hạn emulator, owner quyết định giữ FAIL kèm ghi
  chú, kiểm lại trên A05s); grid-cta-skeleton-flow `vi-320` một lần vẽ vượt
  `18px` (hơn gap `3px`), lượt chạy lại PASS, chưa rõ nguyên nhân. Ngày
  2026-10-04 trên main `565fed4` chạy lại 5 lần đều PASS, không tái hiện;
  đóng, mở lại nếu gặp lại.

## A05s landscape trên main 2026-10-04

Kiểm lại sau thay đổi ảnh (main `5b17cf0`), tự động, không đổi setting Android.
Chrome thật trên A05s qua CDP: `Emulation.setDeviceMetricsOverride` `915×412`,
mobile, `landscapePrimary` 90 độ, cộng touch emulation; tap bằng
`Input.dispatchTouchEvent` (trusted touch). Related-history, 60 frame:

| Locale | Card 16 | Card đầu |
| --- | --- | --- |
| VI | PASS `maxY=0` | PASS `maxY=0` (`01`) |
| EN | PASS `maxY=0` | PASS `maxY=0` (`04`) |

Giới hạn: viewport override, không xoay vật lý; render, scroll, history là hành
vi thật của Chrome trên máy. Kết luận giữ nguyên: `Y=2`/`Y=3` chỉ có trên
emulator. Ca emulator vẫn FAIL kèm ghi chú theo quyết định owner.

Xoay vật lý cùng ngày: auto-rotate bật, máy đặt nằm ngang, tap thật bằng
`adb shell input tap` (`pnpm qa:related-scroll -- --skip-emulator`), không
override viewport. PASS 4/4, `maxY=0`, 60 frame, `touch=true`: VI card `16` và
`07`, EN card `16` và `10`. Raw trong worktree PC:
`.tmp/site-media-card/related-scroll-20261004T063545608Z`.

## Firefox và WebKit trên PC 2026-10-04

Main `f3c9d9a`, preview local, chạy bản tạm của suite với Playwright Firefox và
WebKit (VI/EN trong từng suite):

| Suite | Firefox | WebKit |
| --- | --- | --- |
| Advertising transitions | 26 PASS, 3 FAIL | 26 PASS, 3 FAIL |
| `site-media-card-m02a` | 11/11 PASS | 9 PASS, 2 FAIL |

- Firefox: 3 FAIL đều do runtime diagnostics bắt console `downloadable font:
  download failed ... status=2152398850` (NS_BINDING_ABORTED, Google Fonts bị
  hủy khi điều hướng), không phải assertion hành vi. Test nay bỏ qua đúng thông
  báo này.
- WebKit transitions: 3 FAIL đã biết, có từ `f16d052`.
- WebKit m02a: 2 FAIL ở video (mở primary video, unmount video), nghi Playwright
  WebKit trên Windows không phát MP4/H.264; chưa xác nhận. Ca ảnh, AVIF đều PASS.

## Chú thích thuật ngữ

- **Overscan**: vùng render thêm ngoài viewport trước khi unmount card.
- **Seed**: chuỗi quyết định thứ tự shuffle của grid và related.
- **Entrance transition**: animation Masonry khi card vào vị trí.
- **Flake**: test lúc PASS lúc FAIL trên cùng source.
- **DPR**: tỉ lệ pixel thiết bị trên CSS pixel.
- **CDP**: Chrome DevTools Protocol, điều khiển Chrome từ xa.
