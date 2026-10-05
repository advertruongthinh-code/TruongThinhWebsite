---
title: Checkpoint M02a media-card Advertising
type: verification
status: partial
updated: 2026-09-30
---

# M02a — engineering scoped GREEN, gate release còn mở

Trên managed worktree `codex/mobile-ui-contract`, HEAD
`e6cf065161cb19a8b59dd9efa8cda5d4af27fba1`, candidate local `:8792`,
M02a đã đạt checkpoint kỹ thuật cho primary/thumbnail/audio và direct detail
Advertising VI/EN. [Spec](../specs/site-media-card-playback.md) và
[plan](../../tasks/plan.md#site-media-card-playback--plan-draft-2026-09-28)
vẫn sở hữu contract. Owner ngày 30/09 tạm dừng việc trên Home, Residential,
Commercial, About; M03–M05 và QA/closure toàn website M08–M09 giữ PAUSED.
Checkpoint này không nghiệm thu feature toàn site, visual của owner hoặc release.

## Source và evidence đã khóa

[Manifest M02a](../../.tmp/site-media-card/m02a-green-20260930T041517593Z/manifest.json)
có SHA-256
`3229669A40585B4681A024A74202AFA7EFF560A1D3D83512CE73FBD6A20FB233`.
[`SHA256SUMS.txt`](../../.tmp/site-media-card/m02a-green-20260930T041517593Z/SHA256SUMS.txt)
có SHA-256
`0684A76F981C710C1125683E4751C2CE8F2063927D9A6E5EF75BE09D21BDA28C`;
đã đối chiếu 204/204 file, không có mismatch. Năm file viết tay của candidate
vẫn khớp SHA trong manifest tại lần kiểm 30/09:

| File | SHA-256 |
| --- | --- |
| `src/site/advertising-products/index.html` | `FA9E08AA040A97DC401DCD23FAB51E05F0062A20CD3C746ECA8A7D34BBD3DF1C` |
| `src/site/advertising-products/catalog-runtime.mjs` | `6AD17D935CB610AE04C070848B6DF2EAD41FF3105E0DF449F7EA6811816D2EFE` |
| `src/site/detail.css` | `FE269105FFE2EB5389C688E11E45B1751F329A923C3E7830A9ABFA5553CFA657` |
| `tests/site/site-media-card-m02a.e2e.mjs` | `56F52C0F0FDE5FA1BA3FCC0A9C2873F00F19436BF5D1EA2B4E68675A08550059` |
| `docs/design/content.md` | `91E0DDEC6574AFEBD0F1E183EB4A45D84017A0CACD5C9BB0BD8D39A08463BCF2` |

Runtime/CSS khớp source, build và HTTP-served; HTML VI/EN build khớp
HTTP-served. Manifest ghi focused `11/11`, viewer controls `12/12`, photo-layout
`15/15`, static/build và keyboard probe đạt. Reviewer độc lập ghi `Required 0`
cho runtime SHA trên. Các kiểm chứng này dùng media synthetic, chưa có clip
public thật.

## Affected pointer và thiết bị thật

Manifest M02a ban đầu còn `acceptance: HOLD` vì R6/M01b RED. [Pointer harness
sau đó](../../.tmp/site-media-card/m02a-pointer-oracles-20260930T045056627Z/manifest.json)
(SHA-256 `49E1ED1695F5BB0EAA9A0A0920F61ED3FF54F3F1792419C2427DACC24082D4D5`)
giữ cùng runtime/CSS/HTML SHA, sửa oracle test và kiểm lại: 29 case R6 cùng
1 case numeric EN đạt `30/30`; case numeric VI đạt `1/1` trong ba lần lặp.
Reviewer ghi `Required 0`. Vì source không đổi giữa RED và GREEN, suy luận
RED pointer thuộc oracle cuộn/chọn điểm hit cũ trong bộ kiểm này; tương tác
pointer sau cuộn ngẫu nhiên chưa có proof riêng. Không sửa ngược manifest ban
đầu hoặc gọi mọi pointer path PASS.

| Thiết bị và raw | Kết quả | Giới hạn |
| --- | --- | --- |
| [Galaxy A05s portrait](../../.tmp/site-media-card/m02a-native-audio-20260930T044956540Z/manifest.json) | Android 15/Chrome 153, `6/6` case primary, audio, `hasAudio:false`, route cleanup đạt; runtime/CSS/build/served khớp SHA trên | Volume thay đổi qua media element; chưa kéo native volume UI, media synthetic |
| [Galaxy A05s landscape ban đầu](../../.tmp/site-media-card/m02a-native-landscape-r1-20260930T045638746Z/manifest.json) | `8 PASS/1 RED` tại `838×331`: primary bottom `383.39`, visual bottom `331.43`, vượt `51.96 CSS px`; không có overflow ngang | RED thuộc oracle buộc toàn primary fit trong viewport; giữ raw. Một case viewer một con trỏ đạt, không đóng L06 EN landscape touch-close |

L04R đã duyệt (`40e5f11:docs/specs/frontend-brand-shell-responsive-runtime.md`) cho phép
primary cao hơn vùng nhìn khi minimum ảnh, control và info không thể fit; user
cuộn để tiếp cận CTA và related. [Follow-up A05s VI/EN
landscape](../../.tmp/site-media-card/l04r-native-scroll-seal-20260930T051644461Z/manifest.json)
(SHA-256 `BA1F06F9B3A5FCB56610DD1072476B291FF63DB573400CF63668721D09C844BB`)
quan sát `4/4` flow tiếp cận và `2/2` related, không có lỗi. Info có
`scrollHeight = clientHeight = 178px`; CTA nhận pointer thật sau khi cuộn tới
`scrollY = 193.52`, related VI/EN nhận pointer thật sau khi cuộn. Không thấy
clipping, overlap, overflow ngang hoặc runtime error trong các flow này;
runtime/CSS source, build, served vẫn khớp SHA candidate trên. Đối chiếu
contract và raw cho thấy strict viewport-fit oracle của run ban đầu xung đột
L04R; không có bằng chứng product cần CSS fix từ kết quả vượt `51.96px` riêng lẻ.

## Gate còn mở và hành động tiếp

[P14 final](../../.tmp/site-media-card/m02a-green-20260930T041517593Z/final-p14.log)
`31/33`: hai low-height RED tại `1024×420` và `844×390` tái hiện giống exact
pre-M02a baseline; raw RED giữ nguyên. [P14-L04R correction](../../.tmp/site-media-card/p14-l04r-20260930T053256510Z/manifest.json)
(manifest SHA-256 `072924B21A0BF76260ABC84F22BC5308DDF005F124738EC2D4B72772EC1CABED`)
dùng runner SHA-256 `58080EC55919DCAEAF7DA949D8D1E3A5DC033A3B0EB39D6AA2821AF8C1B6772A`:
focused P14 `37/37` đạt, reviewer độc lập `Required 0` theo handoff.
Ba case không fit dùng cuộn bánh xe thật, pointer thật vào expand/CTA/related
và pager trang cuối giữ hậu tố canonical. Khi floor đo được fit, oracle vẫn
giữ strict bottom/cap; geometry tương đối và chiều cao trang ổn định `≤1px`.
Đã đối chiếu SHA source/build tại chỗ cho runtime, layout-core, CSS và HTML
VI/EN; served parity là attestation trong manifest, không fetch HTTP lại ở
lần ghi report này. P14 focused không đóng toàn bộ L04R: wheel chỉ đo ở điểm
giữa, pager chỉ đo trang cuối, multi-engine/Android/660 matrix giữ gate riêng.
D18 `146/146` FAIL do oracle cũ theo manifest, chưa có suite PASS mới;
full suite/body210 chưa chạy. Owner visual, clip public thật, iPhone/Safari
và L06 touch-close vẫn mở.

Tiếp theo: M02b theo dependency sau checkpoint M02a và P14-L04R focused;
giữ source freeze, kiểm RED→GREEN và affected scope M02b. M06/M07 chỉ làm lát
Advertising khi dependency tương ứng đạt. Không đổi status M03–M05/M08–M09,
không commit, push hoặc deploy từ checkpoint này.
Manifest pointer ghi Graphify AST fresh và semantic index còn 219 file
docs/media chờ cập nhật tại thời điểm chạy; task này không build semantic index.

## Chú thích thuật ngữ

- **Scoped engineering GREEN**: checkpoint kỹ thuật đạt trong bộ case và SHA đã nêu; không là nghiệm thu toàn feature.
- **Affected pointer**: case tương tác bị ảnh hưởng bởi thay đổi M02a và oracle test.
- **Oracle**: phép kiểm trong test dùng để xác định đúng/sai.
- **Source freeze**: giữ nguyên byte source trong lúc đối chiếu evidence.
