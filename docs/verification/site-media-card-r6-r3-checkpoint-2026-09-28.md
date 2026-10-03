---
title: Checkpoint R6-R3 dải điều khiển media-card Advertising
type: verification
status: partial
updated: 2026-09-28
---

# R6-R3 — geometry và tương tác scoped PASS

Trên managed worktree `codex/mobile-ui-contract`, HEAD
`e6cf065161cb19a8b59dd9efa8cda5d4af27fba1`, candidate local `8792`,
R6-R3 đã được main nghiệm thu **trong phạm vi Advertising grid/related** sau
independent review `Required 0`. [Spec](../specs/site-media-card-playback.md)
và [plan](../../tasks/plan.md#site-media-card-playback--plan-draft-2026-09-28)
sở hữu contract. Đây là checkpoint kỹ thuật, không nghiệm thu media-card toàn
website hoặc phát hành.

| Bằng chứng | Kết quả |
| --- | --- |
| [Solver raw](../../.tmp/site-media-card/r6-r3-seal-20260928T135917233Z/manifest.json) | `layout-core` dành trước 44px trong tổng chiều cao card có từ hai media, giữ chiều cao canvas theo cover; focused 6/6, affected unit 76/76. Slice này chưa kiểm runtime/CSS/build/served. |
| [UI raw](../../.tmp/site-media-card/r6-r3-ui-final-20260928T141154930Z/summary.json) | R6 browser 29/29, M01b browser 25/25, affected unit 77/77, `qa:static`, `prepare:site`, syntax và diffcheck PASS. `seal.sha256` có 118 mục; kiểm lại SHA từng file đạt 118/118. |
| [RED trước sửa](../../.tmp/site-media-card/r6-r3-ui-red-20260928T140123451Z/) | 24/24 case browser fail vì indicator cũ phủ ảnh, không chiếm dải 44px solver đã dành. Raw lỗi và các lần sửa fixture trung gian giữ riêng, không gắn nhãn product GREEN. |

Final [postflight](../../.tmp/site-media-card/r6-r3-ui-final-20260928T141154930Z/postflight.json)
ghi source, build và HTTP-served cùng SHA-256 cho từng file:

| File | SHA-256 |
| --- | --- |
| `advertising-products/layout-core.mjs` | `B624BE54BCA61CB22FC0572A0BC3B6B7658C6AB803BEFE2AEB8B11290E8CD148` |
| `advertising-products/catalog-runtime.mjs` | `4CC90A491D521FE36A2BA5DB6385AC9760A7A71A58DFCFAC9BFED3CC065F58B9` |
| `detail.css` | `5372EC80E7B85EA59FF157B7F25B0BD4363262CA503898872F131A7ECADB00DB` |

Canvas giữ tỷ lệ cover, tổng card nhiều media có dải điều khiển 44px dưới
canvas ngay từ lần xếp đầu. Ở related VI `320px`, canvas `137.5×77.34375`,
card `137.5×121.34375`, sáu nút chấm mỗi nút `20×44` với dấu nhìn thấy `8×8`.
Ở grid EN `320px` và bảy media, nút trước/sau `44×44` cùng bộ đếm trong dải.
Fixture VI `390px` cho canvas `172.5×97.03125`, card `172.5×141.03125`.
R6 kiểm VI/EN, `320/390px`, grid/related, 5/6/7 media bằng pointer thật:
không còn card kế chặn nút, nhấn control không mở detail, body click vẫn mở
đúng card. Slide, tải chậm hoặc lỗi giữ card/canvas/dải ổn định `≤1 CSS px`;
singleton và 154 card legacy không thêm dải. Seed, thứ tự, số card, no-filler
và hash legacy được giữ theo raw solver/UI.

Giới hạn: video/poster là fixture synthetic, chưa có clip public thật hoặc
chứng minh chất lượng/byte budget trên thiết bị đích. Chưa chạy native Android,
iPhone/Safari, `body210` hay full canonical suite cho packet này. M06c terminal
UI khi mọi asset lỗi vẫn mở. [M02a RED-only preparation](../../.tmp/site-media-card/m02a-red-prep-20260928T133515253Z/manifest.json)
có runner SHA-256 `C335C3EE577833E6B44391F4AF6990DA79F5AF30AEC811265865524931010F3B`,
status **NOT_RUN**; chưa chạy M02a hoặc gói sau. L06 EN landscape viewer/CDN
RED độc lập, không đổi status. Sau checkpoint này tạm dừng, chờ chỉ đạo gói
tiếp theo; không commit, push hay deploy.

## Chú thích thuật ngữ

- **Scoped PASS**: đạt trong đúng route, viewport, fixture và oracle đã chạy.
- **Seal**: danh sách SHA-256 của file raw để kiểm toàn vẹn evidence.
- **Canvas**: vùng media giữ tỷ lệ cover, không gồm dải điều khiển dưới ảnh.
