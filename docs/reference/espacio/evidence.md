---
title: Measurement index và provenance Espacio
type: reference-evidence
status: candidate-composite-baseline
snapshot_id: ESPACIO-R1-20260902
snapshot_cutoff: 2026-09-02
---

# Measurement index và provenance

Mỗi dòng dưới là một measurement group. Các phép đo không diễn ra cùng thời
điểm: archive được capture ngày `2026-08-08`, navbar/typography ngày
`2026-08-27`, project card/template ngày `2026-08-30`, và 45 route được kiểm
tra bổ sung ngày `2026-09-02`. `Viewport` ghi kích thước browser; `unit` ghi
đơn vị của value; `status` không đồng nghĩa với acceptance.

## Register

URL/route Espacio bên dưới thuộc host `https://espaciohomedesign.com`; TT là
local implementation. Dòng aggregate ghi nguồn tra exact row; không suy ra
phép đo bao phủ mọi route. Tên artifact ở cột scope được link trong bảng lookup.

| ID | Observation và value | Ngày; viewport | Method | Unit | Source report, section | Status | Source URL/route và giới hạn |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `E-ARCHIVE-ACCOUNT` | `R_total=6100`, `R_success=6054`, `R_failure=46`, `R_unique_url=5855`, duplicate occurrence `245` | 2026-08-08; N/A | Parse `manifest.jsonl`, kiểm status/hash/bytes | row, URL | [motion audit](../../reports/research-espacio-motion-audit.md) §2 | `measured` | Corpus Espacio; URL từng row trong `manifest.jsonl`, không phải một route |
| `E-ARCHIVE-VARIANT` | 5809 successful variants: 264 textual, 5545 binary/static; `0` parse-failure | 2026-08-08; N/A | Variant identity = normalized URL + status + content hash + content type | variant | [motion audit](../../reports/research-espacio-motion-audit.md) §3 | `measured` | Corpus Espacio; URL + hash từng variant trong `manifest.jsonl` |
| `E-ARCHIVE-BLOCKS` | 257 HTML, 2697 embedded style blocks, 256 inline script bodies; TT 5 HTML, 10 inline scripts | 2026-08-08; N/A | Closed-world deterministic scanner | document/block | [motion audit](../../reports/research-espacio-motion-audit.md) §3 | `measured` | Corpus archive Espacio và 5 HTML TT; file từng block theo motion audit §3 |
| `E-BUNDLE-HASH` | JS `345871` bytes, SHA `91f971...b064c`; CSS `88212` bytes, SHA `b3cb9a...1296`; live/archive exact | 2026-08-27/30; N/A | SHA-256 byte comparison | bytes, hash | [navbar](../../archive/reports/research-espacio-navbar-runtime-2026-08-27.md) §2; [templates](../../archive/reports/research-espacio-project-detail-templates-2026-08-30.md) `Đối chiếu code live và archive` | `measured` | Shared first-party JS/CSS của Espacio; asset URL và hash trong navbar §2, không phải đo mọi route |
| `E-NAV-COVERAGE` | 180 sitemap URL; 141 HTTP `200`; 39 HTTP `404`; 14 route families; 556 runtime rows; 555 predicate đạt, 1 inconclusive | 2026-08-27; `390x844` touch, `1440x900` mouse plus breakpoint matrix | Repeated Playwright matrix, DevTools source/geometry, physical keyboard path | URL, row, HTTP status | [navbar](../../archive/reports/research-espacio-navbar-runtime-2026-08-27.md) §1, §3 | `measured`; `555/556` không phải parity pass | Espacio sitemap/14 route families; exact URL theo navbar matrix.json và report §3, không phải Cartesian toàn site |
| `E-NAV-VIEWPORTS` | Phone `320x844`, `390x844`, `578x900`; tablet `750x900`, `751x900`, `768x1024`, `960x900`, `961x900`, `1023x900`; desktop `1024x900`, `1200x900`, `1201x900`, `1440x900`, `1599x900`, `1600x900`, `1920x1080` | 2026-08-27; như listed | Breakpoint-by-family matrix, không phải Cartesian `180x16` | px | [navbar](../../archive/reports/research-espacio-navbar-runtime-2026-08-27.md) §3 | `measured`; coverage giới hạn | Espacio sitemap/14 route families; exact URL theo navbar matrix.json và report §3, không phải Cartesian toàn site |
| `E-NAV-BREAKPOINT` | Header top `72.59375` (≤750), `132.78125` (751–960), `85.390625` (961–1200), `102.515625` (>1200); collapsed lần lượt `70.640625`, `128.78125`, `81.390625`, `81.390625` | 2026-08-27; width bands, height `900` trừ phone | DevTools computed geometry | px | [navbar](../../archive/reports/research-espacio-navbar-runtime-2026-08-27.md) §4 | `measured` | Espacio sitemap/14 route families; exact URL theo navbar matrix.json và report §3, không phải Cartesian toàn site |
| `E-NAV-SCROLL` | Collapse sau `scrollY>100`; hide khi qua `0.5x viewportHeight`, còn cách đáy `1.25x viewportHeight`, đi xuống `>150`; reveal up `>150`; pointer reveal `screenY<=350` | 2026-08-27; height phụ thuộc matrix, mouse/touch tách riêng | Physical PageDown/wheel direction probe và source contract | px, viewport multiplier, duration | [navbar](../../archive/reports/research-espacio-navbar-runtime-2026-08-27.md) §5–§6 | `measured` + `source-derived` | Espacio sitemap/14 route families; exact URL theo navbar matrix.json và report §3, không phải Cartesian toàn site |
| `E-NAV-INCONCLUSIVE` | `/en/brands/brand-espacio-home-design` tại `1440x900`: PageDown làm collapsed nhưng chưa giữ oculto; page cao `1960`, vùng hide hợp lệ `450` đến `<835` | 2026-08-27; `1440x900` | Ba lần DevTools PageDown | px, probe | [navbar](../../archive/reports/research-espacio-navbar-runtime-2026-08-27.md) §1 | `blocked`/`probe-inconclusive` | Espacio `/en/brands/brand-espacio-home-design` |
| `E-NAV-LINK-STICKY` | Sáu cạnh breakpoint giữ `left` và width link giữa expanded/sticky; max delta `0px` | 2026-08-27; widths `751,960,961,1200,1201,1440` x height `900` | DevTools computed link geometry | px | [navbar](../../archive/reports/research-espacio-navbar-runtime-2026-08-27.md) §4.1 | `measured` | Espacio sitemap/14 route families; exact URL theo navbar matrix.json và report §3, không phải Cartesian toàn site |
| `E-TYPO-REFERENCE` | Nav desktop `16/22.4`, cap `11`; cue `12.8/17.92`, cap `9`; body `19.2/26.88`, cap `14`; hero roles cap `20–78` tùy route/breakpoint | 2026-08-27; `390x844`, `768x1024`, `1440x900` | Chrome DevTools + Canvas `H` cap-height proxy | px, line-height | [typography](../../archive/reports/research-espacio-typography-hero-route-motion-2026-08-27.md) `Kết quả typography reference` | `measured`; font family không phải target | Espacio `/en`, `/en/kitchens`, `/en/interior-design`, `/en/projects`, `/en/about-us`; role theo bảng typography |
| `E-TYPO-OVERRIDE` | TT owner override: `#bang-chung h3` `16→20px`, body `16px`; local VI/EN cap `12→15px` heading, body cap `12px`, overflow `0` | 2026-08-27; TT `320px`, `1024px`, `1569px` | Local runtime/DevTools | px, boolean | [typography](../../archive/reports/research-espacio-typography-hero-route-motion-2026-08-27.md) `Kết quả typography reference`, `Evidence local current source` | `accepted` + `observed` | TT `/vi/`, `/en/`, section `#bang-chung` |
| `E-HERO-ZOOM` | Live `.slide-animate-super-zoomout.longTransition`: `scale(1.2)→1.005`, `2.5s`, `ease`; kích hoạt khi container in-view/active | 2026-08-27; `390x844`, `768x1024`, `1440x900` | Chrome DevTools computed transition | scale, s, easing | [typography](../../archive/reports/research-espacio-typography-hero-route-motion-2026-08-27.md) `Hero và scroll cue` | `measured` | Route có selector hero tương ứng trong typography report; không suy ra mọi route dùng zoom |
| `E-CUE` | Delay đầu `3s`; vào/ra `.4s`; stagger `.1s`; giữ `3s`; repeat delay `3s`; word-spacing `0.1em`; mờ sau `200px` trong `1s expo.out` | 2026-08-27; live `390x844`, `1440x900`; local DevTools `1569x912` | Bundle hash/source preview, DevTools timeline và computed style | s, ms, px, em | [typography](../../archive/reports/research-espacio-typography-hero-route-motion-2026-08-27.md) `Hero và scroll cue`; [motion map gốc](../../archive/guides/motion-map.md) `Motion của content` | `measured` + `source-derived`; cue live target row còn blocked | Espacio scroll cue và TT local; target/route theo typography §Hero và scroll cue; live pair còn blocked |
| `E-ROUTE-VEIL` | Cover `0.75s power4.inOut`; reveal `1s power4.inOut`; chờ HTML/XHR, không chờ media; colorHeader `.3s expo.out` | 2026-08-27; N/A cho source, live active transition chưa đo | Đọc live bundle/archive; local contract | s, easing | [typography](../../archive/reports/research-espacio-typography-hero-route-motion-2026-08-27.md) `Route transition và logo`; [parity inventory](../../archive/reports/research-espacio-parity-inventory.md) §6 | `source-derived`; active live `not measured` | Shared Espacio bundle; chưa đo active route pair live |
| `E-MOTION-STATIC` | `A=28215`, `A_M=13232`, `A_I=14962`, `A_X=21`, `A_F=0`, `P=13232`, `U=0` | 2026-08-08 corpus; N/A | Deterministic scanner, closed-world first-party boundary | candidate ID | [motion audit](../../reports/research-espacio-motion-audit.md) §4–§5 | `measured`; static signal không chứng minh effect | Closed-world first-party archive + TT source; source URL/path theo candidate ledger |
| `E-MOTION-OBLIGATION` | `616` local runtime, `34` local static, `80` live snapshot, `1400` archive binding; tổng `2130` | V2 report; N/A/row-specific | Generator map bind target/action/timing/scenario/route/template/locale/viewport/preference/lifecycle/source | obligation row | [motion audit](../../reports/research-espacio-motion-audit.md) `Phase B applicability` | `measured`; machine-owned | Row-specific: route/template/locale trong `research-espacio-motion-obligations.csv` |
| `E-MOTION-V2` | TT runtime `429 confirmed/187 blocked`; tổng `429 confirmed/1701 blocked`; live Espacio `0 motion-confirmed/80 blocked` | V2; row-specific | Runtime runner, artifact parse, fresh review | row | [motion audit](../../reports/research-espacio-motion-audit.md) `Phase C-E runtime` | `measured`; acceptance chưa đạt | Row-specific: exact local/live route trong obligations và runtime CSV; không là mọi URL live |
| `E-CARD-MOTION` | Lazy image opacity `0→1`, `.6s ease-out`; hover image `scale(1→1.15)`, `.6s`; underline `.3s`; filter hide/show display ngay; Masonry morph `.4s ease`, no stagger; no reduced-motion branch in reference | 2026-08-30; `/en/projects`, `1440x900` | DevTools + source/archive exact hash | opacity, scale, s, ms | [motion audit](../../reports/research-espacio-motion-audit.md) `Bổ sung card dự án` | `measured`; reference behavior | Espacio `/en/projects` |
| `E-PAIRWISE-CANON` | 3284 comparison contracts; 5 route pairs; 5 canonical viewport; 2 preferences; 864 scoped candidates; mỗi candidate chưa map là blocker | Report snapshot trước cutoff; viewport/preference theo contract | Pairwise runtime comparator, pixel/DOM fingerprints | contract, candidate | [layout-motion parity](../../reports/research-espacio-layout-motion-parity.md) `Layout parity`, `Motion parity`, `Missing coverage` | `measured`; canonical `NOT PASS` | 5 route pairs; exact mapping trong canonical report §Layout parity và pair artifacts |
| `E-PAIRWISE-PILOT` | 9 obligations; 7 measured/pass; 0 fail/blocked; 2 excluded-with-reason; coverage `23440` blocked | Report snapshot; `1440x900`, `390x844`, `no-preference/reduce` theo row | Pairwise runtime; exclusions owner-approved | row, coverage | [pilot](../../reports/research-espacio-layout-motion-parity-pilot.md) `Runtime summary`, `Owner-approved exclusions` | `measured`; subset không là PASS | Row-specific local/live pairs trong pilot §Runtime summary; chỉ 9 obligations |
| `E-PAIRWISE-TARGETED` | 8 measured; 3 pass, 4 fail, 1 blocked; `hero-layout` pass; `menu-open-brand` geometry delta `0.015625`; `header-scroll`, `route-transition`, `portal-hover`, `project-hover` fail; `nav-hover` blocked | Report snapshot; `1440x900`, no-preference | Pairwise runtime comparator | px, ms, row | [targeted](../../reports/research-espacio-layout-motion-parity-targeted.md) `Motion parity`, `Hover/focus parity`, `Runtime summary`, `Fail detail` | `measured`; historical subset | Row-specific local/live pairs trong targeted §Runtime summary/Fail detail; chỉ 8 rows |
| `E-TEMPLATE-FAMILY` | 45/45 route cùng `data-barba-namespace="common"`, `data-barba-id="proyecto"`; 38 block sequence khác nhau; kiểm live đủ 45 ngày 2026-09-02 | 2026-08-30/09-02; sáu route đại diện `1440x900` và `390x844`, closure 45 route | Archive HTML parse, Playwright 12 lượt, DevTools | route, block sequence | [templates](../../archive/reports/research-espacio-project-detail-templates-2026-08-30.md) `Kết luận`, `Phương pháp`, `Kiểm chứng live` | `measured`; structure only | 45 project-detail URL Espacio; exact allowlist/6 route đại diện trong template report §Phương pháp |
| `E-TEMPLATE-GEOMETRY` | Espalmador desktop hero `1440x900`; heading `1000x156.8`, `112/156.8`; intro/gallery padding `35px`, margin-bottom `90px`; facts 4×`360px`; duo 2×`702.5px`, gap `35px`; mobile gallery `75vw`, facts 1 cột | 2026-08-30; `1440x900` và `390x844` | DevTools computed geometry + Playwright responsive check | px, vw, columns | [templates](../../archive/reports/research-espacio-project-detail-templates-2026-08-30.md) `Kiểm chứng live` | `measured` | Espacio project Espalmador; exact URL trong template report §Kiểm chứng live |
| `E-LOCAL-OBSERVED` | TT local matrix 25 samples, all `overflow:false`; local mobile shell `390x75`, fixed header `380x75` do scrollbar `10px`, menu `50x60`; local `/vi/` main `6499.796875`, footer `390x896.0625` | Inventory snapshot; `320x844`, `390x844`, `768x900`, `1024x900`, `1440x900` | Chrome DevTools, local preview, source/test cross-check | px, boolean | [parity inventory](../../archive/reports/research-espacio-parity-inventory.md) §2, §4, §4.1, §5 | `observed`; không phải parity target | 5 route TT × 5 viewport; exact route table trong parity inventory §2/§4; số main/footer thuộc `/vi/` |

## Artifact và report lookup

| Artifact | Vai trò và trạng thái |
| --- | --- |
| [`research/reference-site/archive/manifest.jsonl`](../../../research/reference-site/archive/manifest.jsonl) | Raw archive manifest; read-only provenance, không sửa trong docs slice |
| [`research/reference-site/runtime-evidence/`](../../../research/reference-site/runtime-evidence/) | Screenshot/JSON/CSV raw evidence; ignored/local lifecycle |
| [`research-espacio-motion-candidates.csv`](../../reports/research-espacio-motion-candidates.csv) | Phase A candidate ledger authoritative |
| [`research-espacio-motion-candidate-map.csv`](../../reports/research-espacio-motion-candidate-map.csv) | Candidate-to-obligation map; generator-owned |
| [`research-espacio-motion-obligations.csv`](../../reports/research-espacio-motion-obligations.csv) | Obligation matrix; runner-owned |
| [`research-espacio-motion-runtime.csv`](../../reports/research-espacio-motion-runtime.csv) | Runtime output; machine sink |
| [`matrix.json`](../../../research/reference-site/runtime-evidence/espacio-navbar-2026-08-27/matrix.json) | 2026-08-27 navbar raw matrix; ignored artifact |

`docs/reports/research-espacio-layout-motion-parity-pilot.md` và
`-targeted.md` chứa artifact path dài và fail JSON lịch sử. Living docs chỉ giữ
measurement summary và link source; không sao chép payload vào đây.

## Limits, conflicts và unknown

`motion-toggle` có behavior local nhưng counterpart Espacio và pair mapping
canonical vẫn **unmapped**. Evidence hover local hoặc tổng blocker `toggle-hover`
không thay mapping này. Giữ **NOT PASS** cho đến khi có target/protocol được
đối chiếu; không tự sáng tác counterpart. Xem
[machine parity](../../reports/research-espacio-layout-motion-parity.md) và
[accepted docs spec](../../specs/living-docs-design-system.md).
Coverage CSV giữ candidate `cand-5096a40b7d6bd0cf09f28447`, blocker
`blocker-660d50b38f0b1c9dce873ffd`, lý do `missing exact pair contract` trong
[canonical coverage](../../reports/research-espacio-layout-motion-coverage.csv).

- `555/556` navbar là predicate class-state; `39` sitemap URL `404` bị loại
  khỏi tập live subpage hợp lệ. Full Cartesian `180x16` chưa chạy.
- Template `45/45` chỉ xác nhận family/sequence. Nó không chứng minh TT parity,
  content equivalence hoặc asset ownership.
- Motion V2 có `1.701` blocker trên `2.130`; `blocked` không tự là product
  defect. V3 cần tách `header-collapse`, `route-soft`, `focus-order` và
  `pointer-threshold` protocol.
- Pairwise canonical có `864` scoped candidate; mỗi candidate chưa map vẫn là
  blocker. Pilot/targeted là subset, không thay machine report. Hai exclusion
  pilot là owner-approved, không phải pass.
- Live reduced-motion của Espacio chưa có motion-confirmed row; local reduced
  rows là evidence TT, không được gộp vào Espacio measured.
- Report parity inventory từng ghi semantic pending `86`; wrapper hiện báo
  freshness khác. Đây là tool-history, không phải product measurement.
- Active live internal route transition, route-wide focus order, live cue target,
  full accessibility/menu protocol và nhiều target-specific protocol chưa đo.

## Chú thích thuật ngữ

- **Measurement group**: nhóm observation cùng source/protocol, có ID để dẫn chéo.
- **Viewport**: kích thước vùng trình duyệt dùng khi đo.
- **Unit**: đơn vị của số đo, như px, ms, s, vw hoặc row.
- **Probe-inconclusive**: phép probe chưa đủ để kết luận pass hay defect.
- **Obligation**: một điều kiện runtime phải được runner đo riêng.
- **Candidate**: tín hiệu tĩnh có thể liên quan motion/interaction, chưa phải effect.
- **Machine-owned**: nội dung được generator/runner sở hữu, không hand-edit.
