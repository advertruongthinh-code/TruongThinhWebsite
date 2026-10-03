---
title: Checkpoint M02b Advertising dở dang
type: verification
status: paused
updated: 2026-09-30
---

# M02b Advertising — PAUSED khi QA chưa hoàn tất

Owner yêu cầu dừng thực thi và lưu state ngày 30/09. Đây là checkpoint **dở
dang**, không phải M02b GREEN hay feature/full-site PASS. Scope đang giữ chỉ
gồm `advertising-products` và route con; M06/M07 chưa mở. M03–M05 và M08–M09
toàn website tiếp tục PAUSED. [Spec](../specs/site-media-card-playback.md),
[plan](../../tasks/plan.md#site-media-card-playback--plan-draft-2026-09-28)
và [RED baseline trước source patch](site-media-card-m02b-red-pause-2026-09-30.md)
giữ riêng trạng thái, không hồi tố kết quả.

Managed worktree `C:\Users\halal\.codex\worktrees\mobile-ui-contract\TruongThinh-Website`,
branch `codex/mobile-ui-contract`, HEAD
`e6cf065161cb19a8b59dd9efa8cda5d4af27fba1`. Source candidate và docs
dirty được giữ nguyên; không rollback/reset, stage, commit, push hoặc deploy.
Preview `http://127.0.0.1:8792` giữ cho owner; không còn process Node khớp
runner tại checkpoint.

## Bằng chứng đã khóa

[Pause manifest](../../.tmp/site-media-card/m02b-paused-20260930T073041335Z/manifest.json)
SHA-256 `81D92067724050D20B35B1A95226E37711F61012BDCC2B37726AA46E8BEE8120`
khóa snapshot/diff năm source/spec, build, bytes HTTP-served và partial raw.
Main đã đối chiếu `20/20` hash được liệt kê và `5/5` bản snapshot đúng byte.
[Partial raw](../../.tmp/site-media-card/m02b-green-20260930T072442730Z/)
chỉ là kết quả đang dở dang; tên thư mục không cấp status GREEN.

| Mục | SHA-256 / trạng thái tại lúc dừng |
| --- | --- |
| `catalog-runtime.mjs` source/build/served | `889034B97C2D673EC0385A369050361572FED511E165797D610102E60EBC5B5E` |
| `detail.css` source/build/served | `9870768A5AB2F0B379A70F82D93E36CE84314F03C08E989073CF9F0C7245F5A3` |
| Runner `advertising-photo-transitions.e2e.mjs` | `126235861405A1036A8C16C92886DD1FB7F94E4656B1C40DB2B91B8B386F74EA`, không đổi từ RED baseline |
| `advertising-photo-browse.md` | `1A2652296FC116426E99C8B23DF08618E00FA15609B83230478F9518C309BE82` |
| `advertising-photo-morph-scroll.md` | `D6494FC9E461E4530211E7D6384B2EE3C87A788792147538B043BD804579D17E` |
| `frontend-brand-shell-responsive-runtime.md` | `EADAEB57743710B52FCC9567F857F128503156206314733E571FDCFE620AFE12` |

Source worker báo `pnpm prepare:site` và `node --check` đạt; pause manifest
khóa bytes build/served, không khóa riêng build log. Docs closure gồm bốn file
`motion.md`, `advertising-final-polish-and-media.md`, capability map và
`content.md`; [v3 patch và after-manifest](../../.tmp/site-media-card/m02b-docs-closure-20260930T070358590Z/)
đã được review docs `7/7` tại snapshot v3 trước gói status PAUSED này. Đó là
kiểm docs, **không** là source review hay runtime nghiệm thu.

## QA đã chạy và còn thiếu

| Named case / gate | Kết quả có chứng cứ |
| --- | --- |
| `m02b-grid-detail-no-clone-no-jump` | PASS VI/EN: click, Back, Forward đều `cloneAdds=0`, `lockCalls=0`; six directions có `35–39` frame. Đây là **một** named case trên candidate hiện tại. |
| `m02b-one-just-viewed-marker-per-tab` | FAIL ở bước click card B `vi-close-B`: locator nằm ngoài viewport, timeout `30000ms` **trước** assertion marker B. Assertion marker A trước đó đạt; nguyên nhân product hay fixture chưa phân loại. Không gọi marker GREEN. |
| Bốn named case còn lại | Chưa chạy; không biết kết quả. |
| Affected regressions, independent source review, native QA và Impeccable detector | Chưa chạy. Không chuyển direct/reload/viewer control PASS của source M02a trong RED baseline sang SHA hiện tại. |

Case đầu có [raw JSON](../../.tmp/site-media-card/m02b-green-20260930T072442730Z/m02b-grid-detail-no-clone-no-jump/cp3-transition-e2e-results.json);
case marker có [raw JSON](../../.tmp/site-media-card/m02b-green-20260930T072442730Z/m02b-one-just-viewed-marker-per-tab/cp3-transition-e2e-results.json)
và ảnh failure trong cùng thư mục. Session marker exit `1`; không có complete
six-case GREEN. RED baseline bốn product RED, hai control PASS thuộc source
trước patch và được giữ bất biến.

Supersession M02b 30/09 trong docs chỉ giữ morph primary↔enlarged viewer và
scroll/media từng history entry; clone card grid/related↔primary, kể cả
related A→detail B, không còn là contract. H00 vẫn là evidence lịch sử;
H01/H02 oracle card-morph `400ms` cần rescope khi owner mở lại, chưa thực thi
hoặc được đánh dấu hoàn tất. Status “chưa triển khai” ở
`docs/specs/site-media-card-playback.md` cần gói status riêng sau evidence
M02b GREEN/review; checkpoint này không sửa spec đó.

Graphify query cuối trước source patch ghi AST structural fresh và 221 semantic
file pending; không có yêu cầu xây semantic index nên không extraction. Sau
patch không query lại freshness vì owner đã yêu cầu PAUSED.

## Khi owner yêu cầu tiếp tục

1. Đối chiếu lại HEAD, dirty paths, source/build/served/runner và partial raw
   SHA với manifest trên; giữ raw RED và partial hiện tại bất biến.
2. Phân loại click timeout card B là lỗi product hay fixture bằng evidence mới.
   Sau đó hoàn tất các named case còn thiếu, affected regressions, source
   review và native QA đúng scope trước khi quyết định M02b có đạt hay không.

Owner visual, clip public thật, Safari/iPhone, L04R rộng hơn và full-site
vẫn là gate riêng. Không tự chạy tiếp khi đang PAUSED.

## Chú thích thuật ngữ

- **Candidate**: source đã sửa nhưng chưa đủ evidence để nghiệm thu.
- **Named case**: một case có tên trong focused runner; PASS một case không thay cả suite.
- **Served bytes**: nội dung preview HTTP đã đối chiếu hash với source/build.
- **PAUSED**: dừng thực thi cho đến khi owner chỉ đạo tiếp tục.
