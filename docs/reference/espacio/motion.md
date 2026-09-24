---
title: Motion reference Espacio và boundary Trường Thịnh
type: reference-motion
status: candidate-composite-baseline
snapshot_id: ESPACIO-R1-20260902
snapshot_cutoff: 2026-09-02
---

# Motion

Motion cần đọc theo lớp: Espacio measured/source-derived, Trường Thịnh
accepted, và Trường Thịnh observed. `docs/reference/espacio/motion.md` là snapshot
historical ngày `2026-07-30` và trộn hai hệ; bảng dưới chỉ dùng entries có
nguồn/lớp rõ. Không có phép live verification mới trong R1.

## Espacio measured/source-derived

| Contract | Value | Route/viewport; method; date | Status |
| --- | --- | --- | --- |
| Header collapse | `scrollY>100` thêm `collapsed`; transition transform `1s cubic-bezier(0,0,.1,.99)`; background `0.3s ease-out` | Live navbar matrix, width bands; Playwright + DevTools, 2026-08-27 | `measured` |
| Header auto-hide | Giữa trang: qua `0.5×viewportHeight`, cách đáy `1.25×viewportHeight`, đi xuống `>150px`; `translateY(-100%)`; reveal up `>150px` | Live navbar, touch/mouse tách; 2026-08-27 | `measured` |
| Pointer reveal | `mousemove.screenY<=350` thêm `forceShow`, chỉ hiện header đang ẩn, không expand top state | Mouse matrix; 2026-08-27 | `measured` |
| Scroll inconclusive | PageDown ở `/en/brands/brand-espacio-home-design`, `1440x900`: collapsed nhưng chưa giữ oculto; ba lần lặp | DevTools PageDown; page `1960px` | `blocked`/`probe-inconclusive` |
| Route cover/reveal | Cover `0.75s power4.inOut`; reveal `1s power4.inOut`; fetch HTML/XHR, không đợi hero media; `colorHeader .3s expo.out` | Live JS/CSS bundle/archive; typography report, 2026-08-27 | `source-derived`; active live transition `not measured` |
| Hero zoom | `.slide-animate-super-zoomout.longTransition`: `scale(1.2)→1.005`, `2.5s`, `ease`; trigger in-view/active sau mount | `/en/kitchens`, `/en/interior-design`, `/en/about-us`; DevTools `390x844/768x1024/1440x900`, 2026-08-27 | `measured` |
| Scroll cue timeline | Delay `3s`; vào/ra `.4s`; stagger `.1s`; giữ `3s`; repeat delay `3s`; bottom `45px` desktop, `30px` tablet, `60px` mobile | Live bundle + DevTools source preview; 2026-08-27 | `measured` + `source-derived` |
| Scroll cue easing detail | Bundle ghi `power2.Out/In` nhưng GSAP không nhận tên hoa; phân bố thực tế linear `100ms/glyph`; whitespace giữ text node; local observed word-spacing `0.1em` | Source preview time-scale `2x`, local `1569x912`; 2026-08-27 | Reference `measured`; TT `observed` |
| Project card lazy/hover | Lazy opacity `0→1`, `.6s ease-out`; hover image `scale 1→1.15`, `.6s`; underline `.3s cubic-bezier(.4,0,0,1)` | `/en/projects`, `1440x900`, DevTools + exact live/archive bundle, 2026-08-30 | `measured` |
| Project filter | `display:none/block` tức thời; không exit fade; Masonry reflow morph `.4s ease`, `0ms`, no stagger; Ivory `top 352.969→0`, cleanup khoảng `420ms` | `/en/projects`, `1440x900`; 2026-08-30 | `measured`; reduced-motion branch không có trong source reference |

Nguồn: [navbar](../../archive/reports/research-espacio-navbar-runtime-2026-08-27.md)
§4–§6, [typography/hero](../../archive/reports/research-espacio-typography-hero-route-motion-2026-08-27.md)
`Hero và scroll cue`/`Route transition và logo`, [motion audit](../../reports/research-espacio-motion-audit.md)
`Bổ sung card dự án`.

## Full-menu source map lịch sử

`motion-map.md` có snapshot archive ngày `2026-07-30`; các mốc sau là
source-derived reference contract, không phải live capture của cutoff 2026-09-02.

| Phase | Contract |
| --- | --- |
| Open page | Page scale `1→.9`, `.7s`, `power2.out`, origin `50vw 50vh`; shutter 4 cột `height 0→100vh`, `.6s`, `power4.inOut`, stagger `.15`; timeline `timeScale(1.15)` |
| Open timeline | Shutter `0–1.05`; menu nav opacity `1.05–1.65`; groups `1.10–2.14`, `y -140/opacity 0→0/1`, `1s`, stagger `.02`, `expo.out`; head `1.15–1.75`, `y -20`, `.6s`; title/number `1.35–2.04`, `.6s`, stagger `.03`; close `1.40–2.00`, rotate `90°→0°`, `.6s` |
| Open head | Divider delay `.7s`; group dividers `.9/1.1/1.3/1.5s`; backdrop opacity `.4` trong `.6s`; menu brand mark bắt đầu đen, path đổi màu kết thúc sau `1s` |
| Close page | Bỏ `menu-open` ngay đầu; reverse `timeScale(2.25)`; scale về `1` sau delay `.85s`, duration `.7s`; backdrop đợi `.85s` rồi fade `.6s`; dialog close/focus return sau scale |
| Route/locale from menu | Route fade và menu reverse chạy đồng thời, URL commit sau cả hai; locale chờ menu reverse, rồi đổi in-place; không nhảy focus đầu document |
| Responsive shutters | 4 cột mặc định, 3 `≤1200`, 2 `≤960`, 1 `≤578`; menu head `137.516px` desktop, `109.578px` `≤1200`, mobile `226.969px` `≤578`; appointment ẩn `≤960`, hiện full-span mobile |

Source: [motion map gốc](../../archive/guides/motion-map.md) `Full-menu`; local selector
mapping ở `Ánh xạ shell`. Live navbar report cũng xác nhận column contract,
nhưng không đo full-menu timeline đầy đủ trong matrix `555/556`.

## Espacio parity evidence và verdict

| Lane | Result | Ý nghĩa |
| --- | --- | --- |
| Canonical layout/motion | `3284` contracts, 5 route pairs, 5 viewport, 2 preference; `864` scoped candidate chưa map | Mỗi candidate chưa map vẫn blocker; overall `NOT PASS` |
| Pilot | 9 obligations; 7 measured/pass; 2 excluded-with-reason; coverage `23440` blocked | Exclusion owner-approved không phải pass; không closure |
| Targeted | 8 measured; 3 pass, 4 fail, 1 blocked; `hero-layout` pass; `menu-open-brand` geometry `0.015625`; `nav-hover` blocked | Historical subset, không thay canonical |
| Targeted fail states | `header-scroll`, `route-transition`, `portal-hover`, `project-hover` | Giữ fail detail và artifact link trong machine report |
| Hover/focus | Live/local rows có before/hover computed; hero cue thiếu target UID | Hero cue `blocked`/ambiguous; focus order route-wide `not measured` |

`excluded-with-reason` của pilot gồm brand logo content khác nhưng overlay
geometry/timing/event/easing/cleanup khớp, và locale/content/typography khác
do local VI so với live Spanish. Chúng không được đổi thành pass.

## Motion audit ledger và coverage

### Phase A: static accounting

Archive capture `2026-08-08T18:41:03.966Z–20:01:00.091Z`, fixed captured corpus.
Scanner đọc HTML/CSS/JS/XML/plain text, loại binary/font/image sau integrity
check, và giữ vendor là `A_X` với reason. Candidate equations:

| Value | Nghĩa |
| ---: | --- |
| `A=28215` | Unique stable candidate IDs |
| `A_M=13232` | Visible motion candidates |
| `A_I=14962` | Non-visible interaction candidates |
| `A_X=21` | Explicit exclusions |
| `A_F=0` | Parse-failure sentinel |
| `P=13232`, `U=0` | Static classified motion-capable; unresolved static candidate bằng 0 |

`P` không chứng minh visible runtime effect; Phase B/C mới xác nhận effect.
Resource rows, content variants, scanner boundaries và TT source hashes nằm ở
[motion audit](../../reports/research-espacio-motion-audit.md) §2–§5; đó là
machine evidence, không hand-edit trong living docs.

### Phase B–E: runtime obligations

| Lane/scenario | Confirmed | Blocked | Total/limit |
| --- | ---: | ---: | --- |
| TT runtime | `429` | `187` | `616` |
| TT static binding | `0` | `34` | `34`; 34 row đại diện `315` candidate |
| Espacio live snapshot, allowlist 8 URL | `0` | `80` | Không có live motion-confirmed row |
| Espacio archive static binding | `0` | `1400` | Archive binding, không runtime effect |
| **Tổng** | **429** | **1701** | **2130** |

Scenario blocker: `gallery-touch=20`, `header-collapse=4`, `header-hide=20`,
`header-show=20`, `header-tone=4`, `media=20`, `projects-filter=20`,
`route-bfcache=20`, `route-fail-open=20`, `route-history=20`,
`toggle-hover=19`. Blocked không đồng nghĩa product defect.

Reviewed sub-runs: nav hover `8/8`, nav focus `8/8`, gallery cancel `20/20`,
toggle focus `20/20`, press `20/20`; toggle hover `1/20`. Preference local:
no-preference `211 confirmed/97 blocked`; reduce `218/90`.

V3 cần tách `header-collapse`, mobile `route-soft`, `focus-order` và
`pointer-threshold`, vì fresh review thấy setup và measured action còn gộp.
Semantic closure chưa acceptance-ready.

## Trường Thịnh accepted và observed

Các dòng này là contract của local, không phải Espacio measurement:

| Area | Accepted/observed contract | Provenance/status |
| --- | --- | --- |
| Route veil | Cover/reveal `.75s/1s`; header trên veil; destination-ready ở `beforeEnter`; không chờ hero media | Owner decision/spec và typography report; `accepted` |
| Logo surface | Khi vào nền trắng, mark painted black rồi đen→CMYK tổng `1s`; rời nền trắng CMYK→trắng; wordmark không tham gia sequence | Owner contract 2026-08-27; `accepted` |
| Header intro | `.brand scale 0→1`, `1.5s`, `power4.out`; desktop nav `y -150`, `1.5s`, delay `.3`, stagger `.1`; hamburger `scaleX 0`, `1s`, delay `1.5` | Historical motion map; `accepted/source-derived` |
| Home hero | Reference Vimeo; TT giữ carousel đã duyệt: drift `1.06→1` trong `5s`, cross-fade `1.6s` bắt đầu `4.2s`; next drift midpoint `5.0s` | Typography report + accepted local decision; `accepted`, không phải live Espacio measurement |
| Single-media hero | Residential/Commercial/About chạy một lần direct/F5 + soft route, `scale 1.2→1.005`, `2.5s`, `ease`, không slideshow/reverse | Local accepted/source current contract; `accepted` |
| Content reveals | Masked line `y 2em→-.1em`, `1.9s`, `power4.out`, stagger `.1`; generic up `y60→0`, opacity `0→1`, `.6s`; generic media opacity `.6s ease-out`; montage `scale .9→1`, `.6s`, delay `.6` | Historical motion map, local source; `accepted/observed` theo surface |
| Portal/project/detail | Portal title `1.9s`, delay `0/.3/.6`; subtitle `.3s ease-out`, delay `.3/.6/.9`; project image hover `1→1.15`, `.6s`; detail hooks `data-motion-lines/words/fade/up/media`; plain copy static | Motion map local profile; `accepted`/`observed` |
| Advertising filter | Controls `y20`, opacity `0`, delay `1.3`, duration `1s`, stagger `.15`, `expo.out`; filter reflow, no invented tile fade; reduced motion final state | Motion map/local spec; `accepted` |
| Reduced motion | Không khởi tạo Locomotive/GSAP presentation; route/menu đổi ngay; content visible/native scroll; hero first only | Motion map local contract; `accepted` |
| Human path | Local `/vi/`: menu click/Escape, scroll đổi tone/collapse/hide/show, toggle label pause/resume; focus return sau Escape không claim vì focus ở address bar | Computer Use evidence, `observed` historical |

Local DevTools representative motion observation tại `1440x900`: nav underline
`scaleX 0→1` trong `.3s cubic-bezier(.4,0,0,1)`, hai marquee `running`, console
`0` error/warning/issue, network `28/28`; performance trace ghi LCP `1414ms`,
TTFB `18ms`, render delay `1396ms`, CLS `0.00`, nhưng trace raw không được ghi
vào MCP workspace. Đây là local observation, không Espacio parity proof.

## Giới hạn phải giữ

- Không có live motion-confirmed row cho Espacio trong V2; archive source và
  measured subset không đóng runtime coverage.
- `U=0` chỉ là static accounting. Không biến thành `100% motion verified`.
- `blocked`/`not measured` giữ nguyên khi thiếu target, protocol, reduced-motion
  override, full route history/BFCache hoặc môi trường.
- Source motion map có câu virtual remount không replay; current TT accepted
  Advertising đã replay, nên không gán câu đó cho Espacio hoặc current source.
- Local `pnpm qa:site` historical `81/94`, với motion failures về about hero/
  parallax jump, delayed-detail filter, locale fail-open timeout và home mask/
  project-hover portal subtitle; không đổi thành canonical Espacio verdict.

## Chú thích thuật ngữ

- **Motion contract**: target, trigger, trạng thái đầu/cuối, timing và cleanup.
- **Reduced motion**: preference giảm chuyển động của hệ điều hành/browser.
- **Static candidate**: tín hiệu source có thể liên quan motion, chưa là effect.
- **Obligation**: row runtime phải được đo với target/protocol cụ thể.
- **Fail-open**: trạng thái content vẫn usable khi enhancement/transition lỗi.
- **TimeScale**: hệ số tốc độ áp cho timeline animation.
